// RELEVO do módulo terreno (puro: só depende de layout.js, roda também no node para conferir cotas).
// H(x,z) = Lo.G(x,z) em todo lugar onde outros módulos apoiam estruturas. Desvios LOCAIS (só em território do terreno):
//   1. morros laterais (|x| > 44, z < −98): o degrau vertical de 14 m que Lo.G tem em z = −98 vira uma rampa suave
//      (z −106 … −94);
//   2. vale do RIO DE ENTRADA (serra, canto esquerdo-fundo) com cascatas, e do RIO DE SAÍDA (à direita da barragem);
//   3. a BARRAGEM de terra (aterro: crista, talude de montante com enrocamento, talude de jusante gramado) faz parte
//      do relevo; o VERTEDOURO é uma faixa escavada atravessando o aterro (as peças de concreto são malhas à parte).
import * as Lo from '../layout.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

/* ---------- rios: linhas de centro (x,z) com nível da água ao longo do comprimento ---------- */
function polyline(pts) {
  const P = pts.map((p) => ({ x: p[0], z: p[1] })); let s = 0; P[0].s = 0;
  for (let i = 1; i < P.length; i++) { s += Math.hypot(P[i].x - P[i - 1].x, P[i].z - P[i - 1].z); P[i].s = s; }
  return { P, len: s };
}
/** amostra densa (para busca de distância e para a fita d'água) */
function dense(pl, step = 0.5) {
  const out = [];
  for (let i = 0; i < pl.P.length - 1; i++) {
    const a = pl.P[i], b = pl.P[i + 1], n = Math.max(1, Math.ceil((b.s - a.s) / step));
    for (let j = 0; j < n; j++) { const k = j / n; out.push({ x: lerp(a.x, b.x, k), z: lerp(a.z, b.z, k), s: lerp(a.s, b.s, k) }); }
  }
  const e = pl.P[pl.P.length - 1]; out.push({ x: e.x, z: e.z, s: e.s });
  // suaviza o traçado (Chaikin leve por média móvel), mantendo as pontas
  for (let it = 0; it < 6; it++) for (let i = 1; i < out.length - 1; i++) { out[i].x = (out[i - 1].x + 2 * out[i].x + out[i + 1].x) / 4; out[i].z = (out[i - 1].z + 2 * out[i].z + out[i + 1].z) / 4; }
  return out;
}
/** nearest(x,z) → { d, s } distância à linha e coordenada ao longo */
function nearestFn(D) {
  return (x, z) => {
    let best = 1e18, bi = 0;
    for (let i = 0; i < D.length; i += 4) { const dx = D[i].x - x, dz = D[i].z - z, q = dx * dx + dz * dz; if (q < best) { best = q; bi = i; } }
    const i0 = Math.max(0, bi - 4), i1 = Math.min(D.length - 1, bi + 4);
    best = 1e18;
    for (let i = i0; i < i1; i++) {
      const a = D[i], b = D[i + 1], ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1e-9;
      const k = clamp01(((x - a.x) * ex + (z - a.z) * ez) / L2), px = a.x + ex * k, pz = a.z + ez * k, q = (x - px) ** 2 + (z - pz) ** 2;
      if (q < best) { best = q; bi = a.s + (b.s - a.s) * k; }
    }
    return { d: Math.sqrt(best), s: bi };
  };
}

// RIO DE ENTRADA: começa fora do bloco (atrás da face de trás), passa pelos pontos do layout e entra na represa.
export const RIN = (() => {
  const pts = [[-60.4, -176], [-59.2, -171], ...Lo.RIVER_IN.pts, [-37.5, -146], [-33.5, -141]];
  const pl = polyline(pts), D = dense(pl), sFace = (() => { for (const q of D) if (q.z >= Lo.Z0) return q.s; return 0; })();
  // nível da água: poços e cascatas (degraus de rocha) descendo da serra; termina no nível da represa
  const K = [[0, 27.5], [sFace + 2.5, 27.0], [sFace + 3.6, 22.6], [sFace + 8.5, 22.2], [sFace + 9.6, 17.4], [sFace + 15.2, 16.9],
    [sFace + 16.4, 12.0], [sFace + 21.5, 11.5], [sFace + 22.7, 7.4], [sFace + 27.5, 4.4], [sFace + 31.5, Lo.LAKE.level + 0.02], [1e3, Lo.LAKE.level]];
  const wl = (s) => { for (let i = 0; i < K.length - 1; i++) if (s <= K[i + 1][0]) { const k = (s - K[i][0]) / (K[i + 1][0] - K[i][0]); const steep = (K[i][1] - K[i + 1][1]) / (K[i + 1][0] - K[i][0]) > 1; return lerp(K[i][1], K[i + 1][1], steep ? ss(0, 1, k) : k); } return Lo.LAKE.level; };
  const falls = K.slice(0, -1).map((k, i) => ({ s0: k[0], s1: K[i + 1][0], drop: k[1] - K[i + 1][1] })).filter((f) => f.drop / (f.s1 - f.s0) > 1);
  return { pl, D, near: nearestFn(D), wl, hw: 2.4, depth: 0.55, sFace, falls, len: pl.len };
})();
// RIO DE SAÍDA: do fim da bacia de dissipação do vertedouro até atravessar a face direita do bloco (x = X1).
export const SPILL = (() => {
  const z = Lo.DAM.spillZ, hw = Lo.DAM.spillW / 2, wall = 0.4;
  return { z, hw, wall, x0: 27.0, sill0: 32.6, sill1: 35.6, chute1: 41.2, basin1: 46.4, end: 47.2, apron: 1.0, sill: 3.0, basinY: -1.5, endSill: -0.55, steps: 6 };
})();
export const ROUT = (() => {
  const pts = [[SPILL.basin1 - 0.6, Lo.DAM.spillZ], [48.6, -121.6], [51.0, -117.8], [55.4, -111.6], [62.0, -104.6], [67, -100]];
  const pl = polyline(pts), D = dense(pl);
  return { pl, D, near: nearestFn(D), wl: () => Lo.RIVER_OUT.level, level: Lo.RIVER_OUT.level, bed: Lo.RIVER_OUT.bed, hw: 2.6, depth: Lo.RIVER_OUT.level - Lo.RIVER_OUT.bed, len: pl.len };
})();

/* ---------- barragem (aterro) ---------- */
export const DAMG = { c0: Lo.DAM.x - Lo.DAM.width / 2, c1: Lo.DAM.x + Lo.DAM.width / 2, up: 2.2, down: 2.0, crest: Lo.DAM.crest, z0: Lo.DAM.z0, z1: Lo.DAM.z1, endSlope: 2.0 };
/** altura do aterro em (x,z) (−∞ fora); a crista tem abaulamento de 6 cm para drenar */
export function damY(x, z) {
  const D = DAMG;
  if (x < D.c0 - 24 || x > D.c1 + 12 || z < D.z0 - 6 || z > D.z1 + 6) return -1e9;
  let y = x < D.c0 ? D.crest - (D.c0 - x) / D.up : x > D.c1 ? D.crest - (x - D.c1) / D.down : D.crest + 0.06 * (1 - ((x - Lo.DAM.x) / (Lo.DAM.width / 2)) ** 2);
  if (z > D.z1) y = Math.min(y, D.crest - (z - D.z1) * D.endSlope / 2); // ombreira da frente: o aterro desce até a margem
  return y;
}
export const inSpillBand = (z, m = 0) => Math.abs(z - SPILL.z) < SPILL.hw + SPILL.wall + m;
/** fundo de concreto do vertedouro (canal de aproximação, soleira, escada, bacia, soleira terminal) */
export function spillFloor(x) {
  const S = SPILL;
  if (x < S.sill0) return S.apron;
  if (x < S.sill0 + 0.6) return lerp(S.apron, S.sill, ss(S.sill0, S.sill0 + 0.6, x));
  if (x < S.sill1) return S.sill;
  if (x < S.chute1) { const n = S.steps, k = (x - S.sill1) / (S.chute1 - S.sill1), i = Math.min(n - 1, Math.floor(k * n)); return S.sill - (S.sill - S.basinY) * (i + 1) / n; }
  if (x < S.basin1) return S.basinY;
  if (x < S.end) return S.endSill;
  return Lo.RIVER_OUT.bed;
}

/* ---------- relevo ---------- */
const sideHillsL = (x, z) => (z < -98 ? 14 * ss(44, 62, Math.abs(x)) : 0);
const sideHillsS = (x, z) => 14 * ss(44, 62, Math.abs(x)) * ss(-94, -106, z);
const nz = (x, z) => 0.5 * Math.sin(x * 0.37 + z * 0.23) + 0.3 * Math.sin(x * 0.91 - z * 0.71 + 1.3) + 0.2 * Math.sin(x * 2.1 + z * 1.7 + 0.4);

/** canal escavado de um rio: altura máxima permitida em (x,z) (∞ longe) */
function channel(R, x, z, bankK) {
  const { d, s } = R.near(x, z);
  if (d > 40) return 1e9;
  const w = R.wl(s), bed = w - R.depth, hw = R.hw * (1 + 0.12 * Math.sin(s * 0.7));
  if (d < hw) return bed + (w + 0.12 - bed) * (d / hw) ** 2;
  const k = typeof bankK === 'function' ? bankK(s) : bankK;
  return w + 0.12 + (d - hw) * k * (1 + 0.18 * nz(x * 1.3, z * 1.3));
}
const rinBank = (s) => lerp(1.9, 0.75, clamp01((s - RIN.sFace) / 30));
/** relevo natural + intervenções do terreno (sem a barragem) */
export function Hnat(x, z) {
  let y = Lo.G(x, z) - sideHillsL(x, z) + sideHillsS(x, z);
  if (x < -18 && z < -136) y = Math.min(y, channel(RIN, x, z, rinBank));
  if (x > 38 && z < -96) y = Math.min(y, channel(ROUT, x, z, (s) => lerp(0.75, 1.15, clamp01(s / 12))));
  return y;
}
/** ALTURA DO CHÃO desenhada pelo terreno (exportada como shared.groundY) */
export function H(x, z) {
  let y = Hnat(x, z);
  if (inSpillBand(z, -1e-6) && x > SPILL.x0 && x < SPILL.end + 0.5) return Math.min(y, spillFloor(x) - 0.08);
  const dy = damY(x, z);
  if (dy > y) y = dy;
  return y;
}
/** ¿o ponto (x,z) é território livre do terreno (sem estruturas de outros módulos)? usado pela vegetação */
export const ZONES = {
  captacao: { x0: -5, x1: 15, z0: -108, z1: -86 },
  patio: { x0: -6, x1: 16, z0: -92, z1: -88 },
  wallGap: [2.0, 26.0],           // vão no muro de arrimo por onde a adutora de água bruta sobe o talude
  wallX: [-46, 46]
};
export { clamp01, ss, lerp, nz };
