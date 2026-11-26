// Chão do mundo (heightfield = relief.H), cores por zona pintadas numa textura do tamanho da maquete, raio-x da cidade,
// faces de corte do bloco (frente com os rasgos das três redes + cavidades, laterais, fundo) e furos pedidos por outros
// módulos (shared.terrainHoles).
import * as L from '../../../lib.js';
import { soilKit } from './soil.js';
import * as R from './relief.js';
import { FACE_HOLES } from '../cidade/faceholes.js';
const { THREE, clamp01, lerp, sstep } = L;

const C = (h) => new THREE.Color(h);
const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
const n2 = (x, z) => 0.5 * Math.sin(x * 1.7 + z * 0.9) + 0.5 * Math.sin(x * 0.63 - z * 1.31 + 1.7);
const n3 = (x, z) => 0.5 * Math.sin(x * 0.21 + z * 0.17 + 1.1) + 0.3 * Math.sin(x * 0.53 - z * 0.37) + 0.2 * Math.sin(x * 1.3 + z * 1.1 + 2);

/** grade com passos variáveis: base + refinos [a,b,passo] + linhas exatas */
function axis(a, b, step, fine, exact) {
  const set = new Set();
  for (let v = a; v <= b + 1e-6; v += step) set.add(+v.toFixed(3));
  for (const [f0, f1, s] of fine) for (let v = f0; v <= f1 + 1e-6; v += s) if (v >= a && v <= b) set.add(+v.toFixed(3));
  for (const v of exact) if (v >= a && v <= b) set.add(+v.toFixed(3));
  return [...set].sort((p, q) => p - q);
}

export function buildGround(ctx) {
  const { Lo, scene, shared } = ctx;
  const { X0, X1, Z0, ZF, YB } = Lo;
  const grp = new THREE.Group(); grp.name = 'terreno.ground'; scene.add(grp);
  const H = R.H;
  shared.groundY = H;
  shared.terrainHoles = shared.terrainHoles || [];

  /* ---------- grade ---------- */
  const sp = R.SPILL;
  const xs = axis(X0, X1, 1, [[30, 50, 0.5]], [R.DAMG.c0, R.DAMG.c1, sp.sill0, sp.sill1, sp.chute1, sp.basin1, sp.end]);
  // z: 1 m; 0,5 m na beira da represa e no talude; 2 m na cidade (plana, y = 0)
  const zs = axis(Z0, -6, 1, [[-101, -97, 0.5], [-89, -80, 0.5]], [sp.z - sp.hw, sp.z + sp.hw, sp.z - sp.hw - sp.wall, sp.z + sp.hw + sp.wall, ...axis(-6, ZF, 2, [], [])]).concat(axis(-4, ZF, 2, [], [])).filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const nx = xs.length, nz = zs.length, NV = nx * nz;
  const pos = new Float32Array(NV * 3), uv = new Float32Array(NV * 2);
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = iz * nx + ix, x = xs[ix], z = zs[iz];
    pos[i * 3] = x; pos[i * 3 + 1] = H(x, z); pos[i * 3 + 2] = z;
    uv[i * 2] = (x - X0) / (X1 - X0); uv[i * 2 + 1] = (z - Z0) / (ZF - Z0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  const isCity = (x, z) => z > -6 || (z > -31 && x > 18.5 && x < 29.5);
  const holed = (x, z) => shared.terrainHoles.some((h) => (h.r ? Math.hypot(x - h.cx, z - h.cz) < h.r : inRect(h, x, z)));
  let idxNat = [], idxCity = [];
  function buildIndex() {
    idxNat = []; idxCity = [];
    for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
      const xc = (xs[ix] + xs[ix + 1]) / 2, zc = (zs[iz] + zs[iz + 1]) / 2;
      if (shared.terrainHoles.length && holed(xc, zc)) continue;
      const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1;
      // diagonal que segue o relevo (menor diferença de altura)
      const tri = Math.abs(pos[a * 3 + 1] - pos[e * 3 + 1]) < Math.abs(pos[b * 3 + 1] - pos[d * 3 + 1]) ? [a, d, e, a, e, b] : [a, d, b, b, d, e];
      (isCity(xc, zc) ? idxCity : idxNat).push(...tri);
    }
  }
  buildIndex();
  const geoN = geo, geoC = new THREE.BufferGeometry();
  geoC.setAttribute('position', geo.attributes.position); geoC.setAttribute('uv', geo.attributes.uv);
  geoN.setIndex([...idxNat, ...idxCity]); geoN.computeVertexNormals(); geoC.setAttribute('normal', geoN.attributes.normal);
  geoN.setIndex(idxNat); geoC.setIndex(idxCity);

  /* ---------- campos auxiliares (0,5 m) para pintar a textura ---------- */
  const FS = 0.5, FX = Math.round((X1 - X0) / FS) + 1, FZ = Math.round((ZF - Z0) / FS) + 1;
  const fH = new Float32Array(FX * FZ), fIn = new Float32Array(FX * FZ), fOut = new Float32Array(FX * FZ), fInS = new Float32Array(FX * FZ);
  for (let j = 0; j < FZ; j++) for (let i = 0; i < FX; i++) {
    const x = X0 + i * FS, z = Z0 + j * FS, k = j * FX + i;
    fH[k] = H(x, z);
    if (x < -18 && z < -134) { const q = R.RIN.near(x, z); fIn[k] = q.d; fInS[k] = q.s; } else { fIn[k] = 99; fInS[k] = 0; }
    fOut[k] = x > 36 && z < -94 ? R.ROUT.near(x, z).d : 99;
  }
  const samp = (f, x, z) => {
    const u = clamp01((x - X0) / (X1 - X0)) * (FX - 1), v = clamp01((z - Z0) / (ZF - Z0)) * (FZ - 1), i = Math.min(FX - 2, Math.floor(u)), j = Math.min(FZ - 2, Math.floor(v)), a = u - i, b = v - j;
    const k = j * FX + i; return (f[k] * (1 - a) + f[k + 1] * a) * (1 - b) + (f[k + FX] * (1 - a) + f[k + FX + 1] * a) * b;
  };
  shared.terrainField = { H: (x, z) => samp(fH, x, z) };

  /* ---------- textura de cor da maquete inteira ---------- */
  const PPM = 8, CW = Math.round((X1 - X0) * PPM), CH = Math.round((ZF - Z0) * PPM);
  const cv = document.createElement('canvas'); cv.width = CW; cv.height = CH;
  const g2 = cv.getContext('2d'), img = g2.createImageData(CW, CH), px = img.data;
  const E = Lo.ETA, lake = Lo.LAKE.level;
  const col = {
    grassA: C('#4c9636'), grassB: C('#336f28'), meadow: C('#7aa53e'), dry: C('#8f8c48'), forest: C('#264a1f'), litter: C('#4a3a26'),
    rock: C('#5f5c57'), rock2: C('#77736b'), sandW: C('#7d6e4e'), sand: C('#ab9868'), mud: C('#4d4533'), deep: C('#3b3b2e'),
    pebble: C('#757062'), concrete: C('#b4b2ab'), concrete2: C('#a19f98'), gravel: C('#949086'), gravel2: C('#7a766d'), asphalt: C('#3c3f44'),
    lawn: C('#4f9b38'), lawn2: C('#43892f'), earth: C('#76603f'), riprap: C('#77746e'), crest: C('#958f82'), bank: C('#5a5242')
  };
  const c = new THREE.Color(), c2 = new THREE.Color();
  const etaRects = [
    { x0: E.arrival.x0, x1: E.arrival.x1, z0: E.arrival.z0, z1: E.arrival.z1 }, { x0: E.parshall.x0, x1: E.parshall.x1, z0: E.parshall.z - 1.6, z1: E.parshall.z + 1.6 },
    E.floc, E.dec, E.filters, E.contact, E.lift, E.chem, E.lab
  ];
  const etaCircles = [{ x: E.sludgeTank.x, z: E.sludgeTank.z, r: E.sludgeTank.r }, { x: E.reservoir.x, z: E.reservoir.z, r: E.reservoir.r }];
  const etaGravel = (x, z, m) => etaRects.some((r) => inRect(r, x, z, m)) || etaCircles.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + m);
  const road = { x0: 20.5, x1: 27.5, z0: -45.5, z1: -30 }, park = { x0: 27.5, x1: 44, z0: -35, z1: -30.5 };
  const yardRow = { x0: -30, x1: 44, z0: -67.6, z1: -58.4 };
  const lotsAll = [Lo.LOTS.hero, Lo.LOTS.school, Lo.LOTS.hospital, ...Lo.LOTS.houses.map((h) => ({ x0: h.x0, x1: h.x1, z0: 9, z1: 21.5 }))];
  function paint(x, z, out) {
    const h = samp(fH, x, z), m = n2(x * 0.9 + 5, z * 0.8), mm = n2(x * 3.1, z * 2.7), big = n3(x * 0.6, z * 0.6);
    const hx = samp(fH, x + 0.5, z) - samp(fH, x - 0.5, z), hz = samp(fH, x, z + 0.5) - samp(fH, x, z - 0.5), slope = Math.hypot(hx, hz);
    // base natural (campo)
    out.copy(col.grassA).lerp(col.grassB, clamp01(0.45 + 0.45 * m + 0.15 * mm)).lerp(col.meadow, clamp01(0.25 + 0.35 * big) * 0.6);
    // serra e morros: chão de mata (folhiço), rocha nas encostas íngremes
    const wild = Math.max(sstep(-136, -146, z), z < -96 ? sstep(42, 50, Math.abs(x)) * sstep(-92, -100, z) : 0);
    if (wild > 0) { c2.copy(col.forest).lerp(col.litter, clamp01(0.3 + 0.4 * mm)); out.lerp(c2, wild * clamp01(0.55 + 0.5 * big)); }
    const rk = sstep(0.95, 1.5, slope) * (1 - sstep(-6, -2, z) * 0) * (h > lake + 0.3 ? 1 : 0.4);
    if (rk > 0) { c2.copy(col.rock).lerp(col.rock2, clamp01(0.5 + 0.5 * mm)); out.lerp(c2, rk * 0.9); }
    // represa: leito (areia na beira, lodo no fundo) e faixa molhada
    if (z < -96 && x < 36) {
      if (h < lake) { c2.copy(col.sand).lerp(col.sandW, sstep(lake - 0.2, lake - 1.4, h)).lerp(col.mud, sstep(lake - 1.5, lake - 4.5, h)).lerp(col.deep, sstep(-1, -3.8, h)); out.copy(c2); }
      else out.lerp(col.sandW, (1 - sstep(lake, lake + 0.45, h)) * 0.85);
      out.lerp(col.sand, (1 - sstep(lake + 0.2, lake + 0.9, h)) * sstep(lake - 0.2, lake + 0.1, h) * 0.5);
    }
    // rios: cascalho no leito, pedras nas margens
    const dI = samp(fIn, x, z), dO = samp(fOut, x, z);
    const rb = Math.max(1 - sstep(R.RIN.hw * 0.7, R.RIN.hw + 1.2, dI), 1 - sstep(R.ROUT.hw * 0.7, R.ROUT.hw + 1.4, dO));
    if (rb > 0) { c2.copy(col.pebble).lerp(col.bank, clamp01(0.5 + 0.5 * mm)); out.lerp(c2, rb); }
    // barragem: enrocamento (montante), crista (estrada de serviço), talude de jusante gramado e aparado
    const dy = R.damY(x, z), nat = R.Hnat(x, z);
    if (dy > nat + 0.02 && !R.inSpillBand(z, 0.2)) {
      if (x < R.DAMG.c0 - 0.15) { c2.copy(col.riprap).lerp(col.rock, clamp01(0.5 + 0.6 * mm)); out.copy(c2); }
      else if (x <= R.DAMG.c1 + 0.15) out.copy(col.crest).multiplyScalar(0.95 + 0.05 * mm);
      else { out.copy(col.lawn).lerp(col.lawn2, (Math.floor(z / 2.5) & 1) ? 0.6 : 0.1).lerp(col.meadow, 0.2 + 0.1 * m); }
    }
    // margem da frente, pátio da captação e talude
    if (inRect(R.ZONES.patio, x, z)) out.copy(col.concrete).lerp(col.concrete2, clamp01(0.5 + 0.5 * mm) * 0.5);
    else if (inRect({ x0: -2, x1: 10, z0: -100, z1: -92 }, x, z)) out.copy(col.gravel).lerp(col.gravel2, clamp01(0.5 + 0.5 * mm));
    else if (z > -99.5 && z < -88 && Math.abs(x) < 44) out.lerp(col.meadow, 0.25 + 0.15 * m);
    // platô da ETA: gramado aparado (faixas), brita em volta das unidades, pátio entre fileiras, estrada e estacionamento
    if (z > -81.2 && z < -30.5) {
      out.copy(col.lawn).lerp(col.lawn2, (Math.floor((x + 200) / 3) & 1) ? 0.55 : 0.05).lerp(col.grassB, clamp01(0.1 + 0.2 * mm));
      if (etaGravel(x, z, 2.2) || inRect(yardRow, x, z)) out.copy(col.gravel).lerp(col.gravel2, clamp01(0.5 + 0.6 * mm));
      if (inRect(yardRow, x, z, -0.6) && !etaGravel(x, z, 0.3)) out.copy(col.concrete).lerp(col.concrete2, ((Math.floor(x / 2) + Math.floor(z / 2)) & 1) ? 0.35 : 0.0);
      if (inRect(road, x, z) || inRect(park, x, z)) out.copy(col.asphalt).multiplyScalar(0.93 + 0.1 * mm);
    }
    // encosta: gramado com manchas
    if (z >= -30.5 && z < -6) out.copy(col.lawn).lerp(col.grassB, clamp01(0.35 + 0.4 * m)).lerp(col.meadow, clamp01(0.2 + 0.3 * big) * 0.5);
    // cidade: quintais gramados nos lotes, terra batida/grama no resto (ruas e calçadas são do módulo cidade)
    if (z >= -6) {
      if (lotsAll.some((r) => inRect(r, x, z))) out.copy(col.lawn).lerp(col.lawn2, clamp01(0.5 + 0.5 * m));
      else out.copy(col.earth).lerp(col.grassA, clamp01(0.45 + 0.35 * m)).lerp(col.dry, 0.15);
    }
    return out;
  }
  for (let j = 0; j < CH; j++) {
    const z = ZF - (j + 0.5) / PPM;          // linha 0 do canvas = frente (v = 1 com flipY)
    for (let i = 0; i < CW; i++) {
      const x = X0 + (i + 0.5) / PPM;
      paint(x, z, c);
      const o = (j * CW + i) * 4; px[o] = c.r * 255; px[o + 1] = c.g * 255; px[o + 2] = c.b * 255; px[o + 3] = 255;
    }
  }
  // as cores calculadas estão em espaço linear do three: converter para sRGB no canvas
  for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) { const v = px[i + k] / 255; px[i + k] = 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055); }
  g2.putImageData(img, 0, 0);
  const PX = (x) => (x - X0) * PPM, PZ = (z) => (ZF - z) * PPM;
  const rd = L.rng(707);
  // juntas do pátio da captação e do pátio entre fileiras (placas de concreto)
  g2.strokeStyle = 'rgba(70,68,62,.55)'; g2.lineWidth = 1.2;
  const joints = (r, s) => { for (let x = r.x0; x <= r.x1 + 1e-6; x += s) { g2.beginPath(); g2.moveTo(PX(x), PZ(r.z0)); g2.lineTo(PX(x), PZ(r.z1)); g2.stroke(); } for (let z = r.z0; z <= r.z1 + 1e-6; z += s) { g2.beginPath(); g2.moveTo(PX(r.x0), PZ(z)); g2.lineTo(PX(r.x1), PZ(z)); g2.stroke(); } };
  joints(R.ZONES.patio, 2);
  // enrocamento: blocos de pedra no talude de montante
  for (let i = 0; i < 9000; i++) {
    const z = lerp(R.DAMG.z0, R.DAMG.z1 + 3, rd()), x = lerp(R.DAMG.c0 - 16, R.DAMG.c0 - 0.2, Math.sqrt(rd()));
    if (R.inSpillBand(z, 0.3) || R.damY(x, z) <= R.Hnat(x, z) + 0.05 || R.damY(x, z) < lake - 1.6) continue;
    const v = 95 + rd() * 90, r = (0.18 + rd() * 0.3) * PPM;
    g2.fillStyle = `rgba(20,18,15,.45)`; g2.beginPath(); g2.ellipse(PX(x) + 1, PZ(z) + 1, r, r * 0.75, rd() * 3, 0, L.TAU); g2.fill();
    g2.fillStyle = `rgb(${v | 0},${(v * 0.97) | 0},${(v * 0.92) | 0})`; g2.beginPath(); g2.ellipse(PX(x), PZ(z), r, r * 0.75, rd() * 3, 0, L.TAU); g2.fill();
  }
  // seixos nos leitos dos rios e na beira da represa
  for (let i = 0; i < 26000; i++) {
    const x = lerp(X0, X1, rd()), z = lerp(Z0, -94, rd()), h = samp(fH, x, z), dI = samp(fIn, x, z), dO = samp(fOut, x, z);
    const onBank = dI < R.RIN.hw + 1.5 || dO < R.ROUT.hw + 1.5 || (x < 30 && Math.abs(h - lake) < 0.5 && z < -96);
    if (!onBank) continue;
    const v = 90 + rd() * 100, r = (0.05 + rd() * 0.16) * PPM;
    g2.fillStyle = `rgba(${v | 0},${(v * 0.95) | 0},${(v * 0.86) | 0},.85)`; g2.beginPath(); g2.ellipse(PX(x), PZ(z), r, r * 0.7, rd() * 3, 0, L.TAU); g2.fill();
  }
  // brita: pontinhos
  for (let i = 0; i < 60000; i++) {
    const x = lerp(-40, 46, rd()), z = lerp(-82, -30, rd());
    if (!(etaGravel(x, z, 2.2) || inRect(yardRow, x, z)) || (inRect(yardRow, x, z, -0.6) && !etaGravel(x, z, 0.3))) continue;
    const v = 120 + rd() * 110; g2.fillStyle = `rgba(${v | 0},${(v * 0.97) | 0},${(v * 0.92) | 0},.8)`; g2.fillRect(PX(x), PZ(z), 1.2, 1.2);
  }
  // meio-fio das bordas de concreto/asfalto e faixa da estrada
  g2.strokeStyle = 'rgba(220,218,210,.9)'; g2.lineWidth = 2.2;
  [road, park].forEach((r) => g2.strokeRect(PX(r.x0), PZ(r.z1), (r.x1 - r.x0) * PPM, (r.z1 - r.z0) * PPM));
  g2.setLineDash([12, 12]); g2.strokeStyle = 'rgba(245,210,80,.85)'; g2.lineWidth = 1.6; g2.beginPath(); g2.moveTo(PX(24), PZ(road.z1)); g2.lineTo(PX(24), PZ(road.z0 + 3)); g2.stroke(); g2.setLineDash([]);
  for (let x = park.x0 + 2.5; x < park.x1 - 1; x += 2.6) { g2.strokeStyle = 'rgba(235,235,230,.8)'; g2.lineWidth = 1.4; g2.beginPath(); g2.moveTo(PX(x), PZ(park.z1)); g2.lineTo(PX(x), PZ(park.z1 - 2.4)); g2.stroke(); }
  // estrada da crista da barragem: duas trilhas de rodas
  g2.strokeStyle = 'rgba(120,112,98,.6)'; g2.lineWidth = 3;
  [Lo.DAM.x - 0.8, Lo.DAM.x + 0.8].forEach((x) => { g2.beginPath(); g2.moveTo(PX(x), PZ(R.DAMG.z0 + 4)); g2.lineTo(PX(x), PZ(R.DAMG.z1)); g2.stroke(); });

  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
  // detalhe de alta frequência (capim/grãos) em coordenadas do mundo
  const det = (() => {
    const N = 1024, cvd = document.createElement('canvas'); cvd.width = cvd.height = N; const g = cvd.getContext('2d'), r = L.rng(91);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 1600; i++) { const v = 96 + r() * 64, rr = 20 + r() * 60, x = r() * N, y = r() * N; g.fillStyle = `rgba(${v},${v},${v},.16)`; for (const dx of [0, -N, N]) for (const dy of [0, -N, N]) { g.beginPath(); g.ellipse(x + dx, y + dy, rr, rr * 0.7, r() * 3, 0, L.TAU); g.fill(); } }
    for (let i = 0; i < 26000; i++) { const lt = r() < 0.55, x = r() * N, y = r() * N, a = r() * L.TAU, l = 3 + r() * 9; g.strokeStyle = lt ? `rgba(230,230,230,${0.12 + r() * 0.25})` : `rgba(15,15,15,${0.12 + r() * 0.25})`; g.lineWidth = 0.8 + r() * 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
    const t = new THREE.CanvasTexture(cvd); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; return t;
  })();
  const GU = { tGDet: { value: det } };
  const mkMat = (key) => {
    const m = L.mat(0xffffff, { map: tex, roughness: 0.95 });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, GU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vGWP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvGWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tGDet; varying vec3 vGWP;')
        .replace('#include <map_fragment>', '#include <map_fragment>\n{ float gd = texture2D(tGDet, vGWP.xz / 2.2).r * 0.6 + texture2D(tGDet, vGWP.xz / 9.0 + 0.37).r * 0.4; diffuseColor.rgb *= 0.72 + 0.56 * gd; }');
    };
    m.customProgramCacheKey = () => 'ep3-ground-' + key;
    return m;
  };
  const gmat = (ctx.q.get('mods') || '').includes('tflat') ? L.mat('#5fb244', { roughness: 0.95 }) : mkMat('n'), cmat = mkMat('c');
  const ground = L.mesh(geoN, gmat, 0, 0, 0, { cast: false }); ground.receiveShadow = true; ground.renderOrder = 2; grp.add(ground);
  const cityGround = L.mesh(geoC, cmat, 0, 0, 0, { cast: false }); cityGround.receiveShadow = true; cityGround.renderOrder = 2; grp.add(cityGround);

  /* ---------- mapa de altura para o solo em corte ---------- */
  const hHalf = new Uint16Array(fH.length), toHalf = THREE.DataUtils.toHalfFloat;
  for (let i = 0; i < fH.length; i++) hHalf[i] = toHalf(fH[i]);
  const hTex = new THREE.DataTexture(hHalf, FX, FZ, THREE.RedFormat, THREE.HalfFloatType);
  hTex.magFilter = hTex.minFilter = THREE.LinearFilter; hTex.needsUpdate = true;
  const kit = soilKit(hTex, { X0, X1, Z0, Z1: ZF, nx: FX, nz: FZ });
  const soilMat = kit.material(); shared.soilMat = soilMat; shared.soilKit = kit;

  /* ---------- faces de corte do bloco ---------- */
  function strip(cols, nrm) { // cols: [[x, yTop, yBot, z], ...]
    const g = new THREE.BufferGeometry(), p = [], n = [], idx = [];
    cols.forEach(([x, yt, yb, z]) => { p.push(x, yt, z, x, yb, z); n.push(...nrm, ...nrm); });
    for (let i = 0; i < cols.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); g.setIndex(idx);
    return g;
  }
  const faces = new THREE.Group(); grp.add(faces);
  const cavMat = kit.material({ tint: 0.62 });
  const addFace = (g, mt = soilMat) => { const m = L.mesh(g, mt, 0, 0, 0, { cast: false }); m.receiveShadow = true; m.renderOrder = 2; faces.add(m); return m; };
  addFace(strip(xs.map((x) => [x, H(x, Z0), YB, Z0]), [0, 0, -1]));
  addFace(strip(zs.map((z) => [X0, H(X0, z), YB, z]), [-1, 0, 0]));
  addFace(strip(zs.map((z) => [X1, H(X1, z), YB, z]), [1, 0, 0]));
  const bottom = L.mesh(new THREE.PlaneGeometry(X1 - X0, ZF - Z0), L.mat('#2a2019', { roughness: 1, side: THREE.DoubleSide }), (X0 + X1) / 2, YB, (Z0 + ZF) / 2, { cast: false }); bottom.rotation.x = Math.PI / 2; faces.add(bottom);
  // frente (z = ZF): corte do solo da cidade com os rasgos das três redes da Rua da Casa (eixos em z = ZF)
  const NET = Lo.NET, SX = [Lo.STREETS.casa.x0, Lo.STREETS.casa.x1];
  const slots = [
    { id: 'water', y0: NET.water.y - NET.water.r - 0.05, y1: NET.water.y + NET.water.r + 0.05, r: NET.water.r + 0.05, cy: NET.water.y, round: true },
    { id: 'sewer', y0: NET.sewer.y - NET.sewer.r - 0.05, y1: NET.sewer.y + NET.sewer.r + 0.05, r: NET.sewer.r + 0.05, cy: NET.sewer.y, round: true },
    { id: 'drain', y0: NET.drain.y - NET.drain.h / 2 - 0.06, y1: NET.drain.y + NET.drain.h / 2 + 0.06, d: NET.drain.w / 2 + 0.06, cy: NET.drain.y, round: false }
  ];
  shared.faceSlots = slots.map((s) => ({ id: s.id, x0: SX[0], x1: SX[1], y0: s.y0, y1: s.y1, z: ZF }));
  {
    const topY = (x) => H(x, ZF);
    const outline = []; xs.forEach((x) => outline.push(new THREE.Vector2(x, topY(x))));
    const shp = new THREE.Shape([new THREE.Vector2(X0, YB), new THREE.Vector2(X1, YB), ...outline.reverse()]);
    slots.forEach((s) => {
      const p = new THREE.Path();
      // furos extras da cidade (câmaras dos poços de visita) que encostam neste rasgo: unidos num só contorno
      const ext = FACE_HOLES.map((h) => ({ x0: Math.min(...h.map((q) => q[0])), x1: Math.max(...h.map((q) => q[0])), y0: Math.min(...h.map((q) => q[1])), y1: Math.max(...h.map((q) => q[1])) }))
        .filter((b) => b.y0 <= s.y1 && b.y1 >= s.y0).sort((a, b) => a.x0 - b.x0);
      const bot = [[SX[0], s.y0]], topP = [[SX[0], s.y1]];
      ext.forEach((b) => { bot.push([b.x0, s.y0], [b.x0, Math.min(s.y0, b.y0)], [b.x1, Math.min(s.y0, b.y0)], [b.x1, s.y0]); topP.push([b.x0, s.y1], [b.x0, Math.max(s.y1, b.y1)], [b.x1, Math.max(s.y1, b.y1)], [b.x1, s.y1]); });
      bot.push([SX[1], s.y0]); topP.push([SX[1], s.y1]);
      [...bot, ...topP.reverse()].forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath();
      s.ext = ext;
      shp.holes.push(p);
    });
    const fg = new THREE.ShapeGeometry(shp, 4); fg.translate(0, 0, ZF);
    addFace(fg);
    // cavidades atrás dos rasgos (solo escavado em volta das redes), com tampas nas pontas
    slots.forEach((s) => {
      if (s.round) {
        const cg = new THREE.CylinderGeometry(s.r, s.r, SX[1] - SX[0], 20, 1, true, Math.PI / 2, Math.PI); // meia casca atrás da face (z < ZF)
        cg.rotateZ(Math.PI / 2); cg.translate((SX[0] + SX[1]) / 2, s.cy, ZF); addFace(cg, cavMat);
        [SX[0], SX[1]].forEach((x) => { const cap = new THREE.CircleGeometry(s.r, 20, Math.PI / 2, Math.PI); cap.rotateY(-Math.PI / 2); cap.translate(x, s.cy, ZF); addFace(cap, cavMat); });
      } else {
        const w = SX[1] - SX[0], cx = (SX[0] + SX[1]) / 2;
        const back = new THREE.PlaneGeometry(w, s.y1 - s.y0); back.translate(cx, (s.y0 + s.y1) / 2, ZF - s.d); addFace(back, cavMat);
        const top = new THREE.PlaneGeometry(w, s.d); top.rotateX(Math.PI / 2); top.translate(cx, s.y1, ZF - s.d / 2); addFace(top, cavMat);
        const bot = new THREE.PlaneGeometry(w, s.d); bot.rotateX(-Math.PI / 2); bot.translate(cx, s.y0, ZF - s.d / 2); addFace(bot, cavMat);
        [SX[0], SX[1]].forEach((x) => { const e = new THREE.PlaneGeometry(s.d, s.y1 - s.y0); e.rotateY(Math.PI / 2); e.translate(x, (s.y0 + s.y1) / 2, ZF - s.d / 2); addFace(e, cavMat); });
      }
    });
  }

  // cavidades atrás das câmaras dos poços de visita (a cidade desenha a câmara; o solo escavado fica atrás)
  slots.forEach((s) => (s.ext || []).forEach((b) => {
    const d = 1.0, cx = (b.x0 + b.x1) / 2, w = b.x1 - b.x0, y0 = Math.min(b.y0, s.y0), y1 = Math.max(b.y1, s.y1), hh = y1 - y0, cy = (y0 + y1) / 2;
    const bk = new THREE.PlaneGeometry(w, hh); bk.translate(cx, cy, ZF - d); addFace(bk, cavMat);
    const tp = new THREE.PlaneGeometry(w, d); tp.rotateX(Math.PI / 2); tp.translate(cx, y1, ZF - d / 2); addFace(tp, cavMat);
    const bt = new THREE.PlaneGeometry(w, d); bt.rotateX(-Math.PI / 2); bt.translate(cx, y0, ZF - d / 2); addFace(bt, cavMat);
    [b.x0, b.x1].forEach((x) => { const e = new THREE.PlaneGeometry(d, hh); e.rotateY(Math.PI / 2); e.translate(x, cy, ZF - d / 2); addFace(e, cavMat); });
  }));

  /* ---------- atualização (raio-x e furos pedidos por outros módulos) ---------- */
  let holesN = 0;
  function update(t, S) {
    if (shared.terrainHoles.length !== holesN) { holesN = shared.terrainHoles.length; buildIndex(); geoN.setIndex(idxNat); geoC.setIndex(idxCity); }
    const xr = S.xray, tr = xr > 0.01;
    if (cmat.transparent !== tr) { cmat.transparent = tr; cmat.needsUpdate = true; }
    cmat.opacity = 1 - 0.75 * xr; cmat.depthWrite = xr < 0.01;
  }
  return { update, grp, ground, cityGround, xs, zs, nx, nz, pos, samp, fH, fIn, fOut, fInS, kit, soilMat };
}
