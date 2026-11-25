// PISCINÃO (reservatório de contenção) — bacia aberta de concreto no lugar da praça do ponto baixo.
// Dono de tudo dentro do retângulo Lo.PLAZA (o terreno deixa um buraco ali) + valas/tubos de ligação até a galeria.
// Obra a partir de S.build.reservoir (b 0..1):
//   0–0,35 escavação (cava por camadas, escavadeira, basculantes)  ·  0,35–0,65 estrutura (laje, paredes com formas,
//   escada, casa de bombas, escada marinheiro, régua)  ·  0,65–0,85 ligações (valas, tubo de entrada + bica em degraus,
//   bomba, válvulas, recalque)  ·  0,85–1 acabamento (reaterro, remendo, passeio, gramado, guarda-corpo, placa).
// Funcionamento: S.weir (cascata entrando), S.res (nível 0..1 da profundidade), S.pump (bomba devolvendo à galeria).
import { makeKit } from './reservoir/kit.js';
import { makeMachines } from './reservoir/machines.js';
import { makePump } from './reservoir/pump.js';
import { makePit } from './reservoir/pit.js';
import * as THREE_ from 'three';
const SURF_EARTH = new THREE_.Color('#7d5c3f');
import { makeTrench } from './reservoir/trench.js';

export function create(ctx) {
  const { L, THREE, scene, Lo, shared } = ctx, PAL = L.PAL, PI = Math.PI;
  const K = makeKit(L), { M, MAT, V } = K, MC = makeMachines(L, K), PU = makePump(L, K);
  const root = L.group(scene);
  const P = Lo.PLAZA, WT = Lo.RESERVOIR.wall, FLOOR = Lo.RESERVOIR.floor, YE = FLOOR - 0.3, DP = 4.6;
  const IN = { x0: -6.0, x1: 4.0, z0: 2.5, z1: 10.6 }, OUT = { x0: IN.x0 - WT, x1: IN.x1 + WT, z0: IN.z0 - WT, z1: IN.z1 + WT };
  const TW = { x0: 2.2, x1: IN.x1, z0: IN.z0, z1: 4.3, t: 0.25 }, SUMPF = -3.3, ROOF = 5.3; // casa de bombas no canto (Lo.RES_PUMP)
  const G = (x, z) => Lo.G(x, z);
  const ss = L.sstep, pr = (k, a, b) => L.clamp01((k - a) / (b - a)), io = L.ease.io, clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const walkY = (x, z) => G(x, z) + ((z > Lo.STREET_A.walkBack[0] && z < Lo.STREET_A.walkBack[1]) || (z > Lo.STREET_A.walkFront[0]) || (z > Lo.STREET_B.walkFront[0] && z < Lo.STREET_B.walkFront[1]) ? Lo.STREET_A.curbH : 0);
  const xrayMats = [];
  // chão provisório só para testar este módulo isolado (?mods=reservoir): asfalto, calçadas e gramado com o buraco da praça
  if (ctx.q.get('mods') === 'reservoir') {
    const pos = [], col = [], c = new THREE.Color(), st = 0.5;
    const colAt = (x, z) => c.set((z > 14.5 && z < 23.5) || (z > -9 && z < -1) || (x > -14.5 && x < -9.5) ? '#3a4049' : (z > 12.5 && z < 14.5) || z > 23.5 || (z > -1 && z < 1) || (z < -9 && z > -11) ? '#d9d3c7' : '#7fb85a');
    for (let x = -18; x < 16; x += st) for (let z = -12; z < 26; z += st) {
      const cx = x + st / 2, cz = z + st / 2; if (cx > P.x0 && cx < P.x1 && cz > P.z0 && cz < P.z1) continue;
      const q = [[x, z], [x + st, z], [x + st, z + st], [x, z + st]].map(([a, b]) => [a, Lo.G(a, b) + ((b > 12.5 && b < 14.5) || b > 23.5 || (b > -1 && b < 1) ? 0.15 : 0), b]);
      [q[0], q[2], q[1], q[0], q[3], q[2]].forEach((v) => { pos.push(...v); colAt(cx, cz); col.push(c.r, c.g, c.b); });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
    const dbg = L.mesh(g, L.mat(0xffffff, { vertexColors: true, roughness: 0.9 })); dbg.castShadow = false; scene.add(dbg);
  }

  /* ======================= CAVA (bloco de solo + escavação) ======================= */
  const pit = makePit(L, K, Lo, { OUT, yE: YE, zB: 4.3, SU: { x0: TW.x0 - TW.t - 0.2, x1: OUT.x1, z0: OUT.z0, z1: TW.z1 + TW.t + 0.2 }, ySump: SUMPF - 0.3 });
  root.add(pit.group); xrayMats.push(...pit.mats);
  const mound = L.lathe([[0.001, 1.3], [0.6, 1.15], [1.4, 0.7], [2.1, 0.15], [2.3, 0]], M('#7a5638', { roughness: 1, flatShading: true }), 14); // monte de terra na calçada
  mound.position.set(-9.0, 0, 0.2); mound.scale.set(1, 1, 0.8); root.add(mound);

  /* ======================= ESTRUTURA ======================= */
  const S0 = new THREE.Group(); root.add(S0);
  // laje de fundo (com o poço da bomba), concretada em faixas de −x para +x
  const slabShape = new THREE.Shape([[OUT.x0, -OUT.z0], [OUT.x1, -OUT.z0], [OUT.x1, -OUT.z1], [OUT.x0, -OUT.z1]].map((p) => new THREE.Vector2(p[0], p[1])));
  slabShape.holes.push(new THREE.Path([[TW.x0, -TW.z0], [TW.x0, -TW.z1], [TW.x1, -TW.z1], [TW.x1, -TW.z0]].map((p) => new THREE.Vector2(p[0], p[1]))));
  const slabGeo = new THREE.ExtrudeGeometry(slabShape, { depth: 0.3, bevelEnabled: false }); slabGeo.rotateX(-PI / 2);
  const slabClip = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  const slabM = L.mat('#c4c8cb', { roughness: 0.88, clippingPlanes: [slabClip], side: THREE.DoubleSide });
  const slab = L.mesh(slabGeo, slabM, 0, YE, 0); S0.add(slab);
  const rebar = new THREE.Group(); S0.add(rebar); // malha de aço antes da concretagem
  { const rm = M('#6d4a35', { roughness: 0.6, metalness: 0.4 }); for (let x = OUT.x0 + 0.3; x < OUT.x1; x += 0.6) rebar.add(L.box(0.035, 0.035, OUT.z1 - OUT.z0 - 0.3, rm, x, YE + 0.18, (OUT.z0 + OUT.z1) / 2, { cast: false })); for (let z = OUT.z0 + 0.3; z < OUT.z1; z += 0.6) rebar.add(L.box(OUT.x1 - OUT.x0 - 0.3, 0.035, 0.035, rm, (OUT.x0 + OUT.x1) / 2, YE + 0.2, z, { cast: false })); }
  // paredes (topo acompanha o chão), sobem com formas e escoras
  const wallM = MAT.conc;
  const topRel = (x, z) => G(x, z) + 0.03 - YE;
  const walls = [
    { a: [OUT.x0, OUT.z0], b: [OUT.x1, OUT.z0], side: 1, inn: [0, 1] },   // fundo
    { a: [OUT.x0, OUT.z1], b: [OUT.x1, OUT.z1], side: -1, inn: [0, -1] }, // frente (recebe o tubo de entrada)
    { a: [OUT.x0, IN.z0], b: [OUT.x0, IN.z1], side: -1, inn: [1, 0] },    // esquerda
    { a: [OUT.x1, IN.z0], b: [OUT.x1, IN.z1], side: 1, inn: [-1, 0] }     // direita
  ].map((w, i) => {
    const g = new THREE.Group(); g.position.y = YE; S0.add(g);
    const m = new THREE.Mesh(K.wallGeo(w.a, w.b, WT, w.side, 0, topRel, 24), wallM); m.castShadow = m.receiveShadow = true; g.add(m);
    // juntas de concretagem na face interna
    const len = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]), ix = w.a[0] + w.inn[0] * WT, iz = w.a[1] + w.inn[1] * WT, ux = (w.b[0] - w.a[0]) / len, uz = (w.b[1] - w.a[1]) / len;
    for (let s = 2.5; s < len - 0.5; s += 2.5) { const x = ix + ux * s + w.inn[0] * 0.006, z = iz + uz * s + w.inn[1] * 0.006, h = topRel(x, z) - 0.06; g.add(L.box(Math.abs(uz) > 0.5 ? 0.01 : 0.035, h, Math.abs(uz) > 0.5 ? 0.035 : 0.01, MAT.concDark, x, h / 2, z, { cast: false })); }
    // forma (compensado + travessas) e escoras inclinadas apoiadas na laje
    const f = new THREE.Group(); f.position.y = YE; S0.add(f);
    const H = Math.max(topRel(w.a[0], w.a[1]), topRel(w.b[0], w.b[1])) + 0.25, cx = (w.a[0] + w.b[0]) / 2 + w.inn[0] * (WT + 0.03), cz = (w.a[1] + w.b[1]) / 2 + w.inn[1] * (WT + 0.03);
    const along = Math.abs(ux) > 0.5;
    f.add(L.box(along ? len : 0.05, H, along ? 0.05 : len, MAT.form, cx, H / 2, cz));
    for (let s = 0.3; s < len; s += 0.6) f.add(L.box(along ? 0.07 : 0.09, H, along ? 0.09 : 0.07, MAT.formDark, w.a[0] + ux * s + w.inn[0] * (WT + 0.1), H / 2, w.a[1] + uz * s + w.inn[1] * (WT + 0.1)));
    [0.25, 0.55, 0.85].forEach((k) => f.add(L.box(along ? len : 0.08, 0.08, along ? 0.08 : len, MAT.steel, cx + w.inn[0] * 0.13, H * k, cz + w.inn[1] * 0.13)));
    for (let s = 0.8; s < len - 0.4; s += 1.8) { const bx = w.a[0] + ux * s + w.inn[0] * (WT + 0.12), bz = w.a[1] + uz * s + w.inn[1] * (WT + 0.12); f.add(K.rod([bx, H * 0.68, bz], [bx + w.inn[0] * 2.1, 0.32, bz + w.inn[1] * 2.1], 0.035, MAT.galv, 6), L.box(0.3, 0.05, 0.3, MAT.galv, bx + w.inn[0] * 2.1, 0.32, bz + w.inn[1] * 2.1)); }
    return { g, f, i };
  });
  // escada de concreto junto à parede esquerda (desce do canto do fundo até o piso), com corrimão
  const stTop = G(IN.x0 + 0.5, IN.z0) + 0.02, stZ0 = IN.z0 + 0.05, stZ1 = 9.5, NST = 24, stW = 1.1;
  const stairProf = [[stZ0, stTop]];
  for (let k = 0; k < NST; k++) { const z = L.lerp(stZ0, stZ1, (k + 1) / NST), y0 = L.lerp(stTop, FLOOR, k / NST), y1 = L.lerp(stTop, FLOOR, (k + 1) / NST); stairProf.push([z, y1 + (y0 - y1)], [z, y1]); }
  stairProf.push([stZ1 + 0.3, FLOOR - 0.05], [stZ1 + 0.3, FLOOR - 0.3], [stZ0 + 0.6, stTop - 0.8], [stZ0, stTop - 0.8]);
  const stairClip = new THREE.Plane(new THREE.Vector3(0, 0, 1), -20);
  const stairM = L.mat('#cfd2d4', { roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: [stairClip] });
  const stairGeo = new THREE.ExtrudeGeometry(new THREE.Shape(stairProf.map((p) => new THREE.Vector2(p[0], p[1]))), { depth: stW, bevelEnabled: false }); stairGeo.rotateY(-PI / 2);
  const stair = L.mesh(stairGeo, stairM, IN.x0 + stW, 0, 0); S0.add(stair);
  const handrail = new THREE.Group(); S0.add(handrail);
  { const xr = IN.x0 + stW - 0.06, ny = (z) => L.lerp(stTop, FLOOR, (z - stZ0) / (stZ1 - stZ0)) + 0.02; for (let z = stZ0 + 0.35; z < stZ1; z += 1.3) handrail.add(L.cyl(0.03, 0.03, 1.0, MAT.rail, xr, ny(z) + 0.5, z, 8)); handrail.add(K.rod([xr, ny(stZ0 + 0.35) + 1.0, stZ0 + 0.35], [xr, ny(stZ1 - 0.2) + 1.0, stZ1 - 0.2], 0.035, MAT.rail, 8), K.rod([xr, ny(stZ0 + 0.35) + 0.55, stZ0 + 0.35], [xr, ny(stZ1 - 0.2) + 0.55, stZ1 - 0.2], 0.025, MAT.rail, 8)); }
  // escada marinheiro com gaiola na parede do fundo
  const ladder = new THREE.Group(); S0.add(ladder);
  { const lx = -3.1, lz = IN.z0 + 0.16, ytop = G(lx, OUT.z0) + 1.0; [-0.22, 0.22].forEach((dx) => ladder.add(L.cyl(0.03, 0.03, ytop - FLOOR, MAT.galv, lx + dx, (ytop + FLOOR) / 2, lz, 8))); for (let y = FLOOR + 0.3; y < ytop - 0.6; y += 0.3) ladder.add(L.cyl(0.018, 0.018, 0.44, MAT.galv, lx, y, lz, 6).rotateZ(PI / 2)); for (let y = FLOOR + 2.4; y < ytop - 0.2; y += 0.7) ladder.add(L.mesh(new THREE.TorusGeometry(0.36, 0.018, 5, 20, PI), MAT.galv, lx, y, lz + 0.02).rotateX(PI / 2)); ladder.position.y = 0; }
  // régua de nível pintada na parede do fundo (marcas 1 m … 4 m a partir do piso)
  const RX = 1.15, RW = 1.3;
  const rulerTex = K.canvasTex(256, 820, (g, w, h) => {
    const py = (m) => h - (m / DP) * h; g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, w, h);
    for (let c = 0; c < 46; c++) { const m = c * 0.1, y = py(m); const big = c % 10 === 0, mid = c % 5 === 0; g.fillStyle = big ? '#c4241a' : '#1c2228'; g.fillRect(big ? 0 : mid ? 0 : 0, y - (big ? 5 : 2), big ? w : mid ? w * 0.42 : w * 0.24, big ? 10 : mid ? 5 : 3); }
    g.fillStyle = '#c4241a'; g.font = 'bold 74px Inter, Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let m = 1; m <= 4; m++) g.fillText(m + ' m', w - 10, py(m) - 42);
    g.strokeStyle = '#1c2228'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
  const rulerM = L.mat(0xffffff, { map: rulerTex, roughness: 0.7, transparent: true });
  const ruler = L.mesh(new THREE.PlaneGeometry(RW, DP), rulerM, RX, FLOOR + DP / 2, IN.z0 + 0.012, { cast: false });
  ruler.geometry.translate(0, 0, 0); S0.add(ruler);
  const levelMark = new THREE.Group(); root.add(levelMark); // marcador amarelo no nível da água
  { const mm = L.flat(PAL.accent, { transparent: true, toneMapped: false }); const tri = new THREE.Shape(); tri.moveTo(0.55, 0); tri.lineTo(0, 0.32); tri.lineTo(0, -0.32); tri.closePath(); const t1 = new THREE.Mesh(new THREE.ShapeGeometry(tri), mm); t1.position.set(RX - RW / 2 - 0.62, 0.0, 0); levelMark.add(t1); const bar = new THREE.Mesh(new THREE.PlaneGeometry(RW + 0.14, 0.1), mm); bar.position.set(RX, 0, 0); levelMark.add(bar); levelMark.position.z = IN.z0 + 0.03; levelMark.traverse((o) => { o.renderOrder = 28; }); }

  /* ---- casa de bombas (canto Lo.RES_PUMP): poço, paredes em corte, telhado, painel, talha ---- */
  const tower = new THREE.Group(); S0.add(tower);
  const towerG = new THREE.Group(); tower.add(towerG);
  { const c = MAT.concNew, cut = MAT.cut, rim = G(TW.x1, TW.z0);
    const b = (x0, x1, y0, y1, z0, z1, m = c) => towerG.add(L.box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    b(TW.x0, TW.x1, SUMPF - 0.3, SUMPF, TW.z0, TW.z1);                                // fundo do poço
    b(TW.x0 - TW.t, TW.x0, SUMPF - 0.3, FLOOR, TW.z0, TW.z1 + TW.t);                  // parede esquerda: base
    b(TW.x0 - TW.t, TW.x0, FLOOR + 0.75, ROOF, TW.z0, TW.z1 + TW.t);                  // … acima da tomada d'água
    b(TW.x0 - TW.t, TW.x1, SUMPF - 0.3, FLOOR + 0.02, TW.z1, TW.z1 + TW.t);           // frente: mureta do poço
    b(TW.x0 - TW.t, TW.x1 + WT, 4.55, ROOF, TW.z1, TW.z1 + TW.t);                     // frente: verga
    b(TW.x0 - TW.t + 0.002, TW.x0 - 0.002, FLOOR + 0.02, 4.55, TW.z1 + TW.t - 0.02, TW.z1 + TW.t + 0.004, cut); // faces de corte
    b(TW.x0, TW.x1 + WT, rim - 0.1, ROOF, OUT.z0, TW.z0);                              // paredes acima da borda
    b(TW.x1, TW.x1 + WT, G(OUT.x1, TW.z1) - 0.1, ROOF, TW.z0, TW.z1 + TW.t);
    b(TW.x0 - 0.45, TW.x1 + WT + 0.25, ROOF, ROOF + 0.22, OUT.z0 - 0.25, TW.z1 + TW.t + 0.3, MAT.concDark); // laje de cobertura
    b(TW.x1 + WT, TW.x1 + WT + 0.04, rim + 0.05, rim + 2.15, 2.9, 3.9, M('#3c6e8f', { roughness: 0.5 })); // porta (no passeio)
    for (let z = TW.z0 + 0.12; z < TW.z1; z += 0.16) towerG.add(L.cyl(0.022, 0.022, 0.75, MAT.galv, TW.x0 - TW.t / 2, FLOOR + 0.38, z, 6)); // grade da tomada
    // painel elétrico e talha
    towerG.add(L.rbox(0.7, 1.1, 0.26, 0.03, M('#b9c2c9', { roughness: 0.4, metalness: 0.3 }), 2.6, 3.95, TW.z0 + 0.14), L.box(0.02, 0.9, 0.01, MAT.dark, 2.6, 3.95, TW.z0 + 0.275));
    [[2.42, 4.3, PAL.good], [2.54, 4.3, PAL.warn]].forEach(([x, y, cc]) => towerG.add(L.sph(0.035, L.glow(cc, 1.6), x, y, TW.z0 + 0.28)));
    towerG.add(L.box(0.16, 0.22, TW.z1 - TW.z0 + 0.3, MAT.iron, 3.4, ROOF - 0.12, (TW.z0 + TW.z1) / 2)); }
  shared.reservoir = { pump: { x: 3.4, z: 3.65 }, inletAt: [Lo.RES_INLET.x, 1.17, 24.6], pumpOutAt: [Lo.RES_PUMP.toX, 0.07, 24.6] };

  /* ======================= LIGAÇÕES ======================= */
  const L1 = new THREE.Group(); root.add(L1);
  // bomba submersível no poço + recalque com válvula de retenção e registro, correndo pela parede direita
  const PX = 3.4, PZ = 3.65, PS = 0.85, RZ = IN.z0 + 0.27, YH = 2.25;
  const pumpObj = K.bake(PU.pump()); pumpObj.scale.setScalar(PS); L1.add(pumpObj);
  const chain = L.cyl(1, 1, 1, MAT.dark, 0, 0, 0, 6); chain.scale.x = chain.scale.z = 0.025; L1.add(chain);
  const blue = MAT.blue, rp = Lo.RES_PUMP.r;
  const piping = new THREE.Group(); L1.add(piping);
  { const fy = SUMPF + 0.44 * PS;
    piping.add(L.tube([[PX, fy, PZ - 0.9 * PS], [PX, fy, RZ + 0.08], [PX, fy + 0.12, RZ], [PX, fy + 0.4, RZ]], rp, blue, 16, 12));
    piping.add(K.rod([PX, fy + 0.4, RZ], [PX, 1.18, RZ], rp, blue, 14));
    const cv = PU.checkValve(rp, blue); cv.rotation.x = -PI / 2; cv.position.set(PX, 1.55, RZ); piping.add(cv);
    piping.add(K.rod([PX, 1.92, RZ], [PX, YH - 0.3, RZ], rp, blue, 14));
    const el = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI / 2; el.push([PX, YH - 0.3 + Math.sin(a) * 0.3, RZ + 0.3 - Math.cos(a) * 0.3]); } piping.add(L.tube(el, rp, blue, 12, 12));
    piping.add(K.rod([PX, YH, RZ + 0.3], [PX, YH, OUT.z1 + 0.02], rp, blue, 14));
    const gv = PU.gateValve(rp, blue); gv.position.set(PX, YH, 3.8); piping.add(gv);
    [-2.2, -0.2, 1.7].forEach((y) => K.flange(piping, PX, y, RZ, rp, 'y', blue));
    for (let z = 5.0; z < IN.z1; z += 1.5) { piping.add(L.box(IN.x1 - PX + 0.05, 0.06, 0.12, MAT.galv, (PX + IN.x1) / 2, YH - rp - 0.03, z), L.box(0.06, 0.35, 0.12, MAT.galv, IN.x1 - 0.03, YH - rp - 0.15, z)); K.flange(piping, PX, YH, z + 0.75, rp, 'z', blue); }
    [-2.6, -1.0, 0.6].forEach((y) => piping.add(L.box(0.5, 0.05, 0.18, MAT.galv, PX + 0.25, y, IN.z0 + 0.09))); }
  // entrada: o tubo atravessa a parede da frente e despeja num canal elevado sobre pilares; na ponta, a bica lança
  // a água sobre uma bacia de dissipação com dentes (assim a cascata fica à vista da câmera, por cima da parede)
  const IX = Lo.RES_INLET.x;
  // ligação com a galeria (drenagem exporta shared.gallery): abertura RETANGULAR do vertedor (1,2 m × de 0,6·h a h)
  // → galeria de ligação retangular (aduelas de concreto) com o mesmo vão, até a bica dentro do piscinão
  const GW = shared.gallery, GZ0 = 24.6; // GZ0 = face de trás da galeria AMPLIADA; o "toco" até a pequena é dinâmico
  const BOX = { w: 1.2, bedIn: 0.55, bedG: GW ? Math.min(GW.invert(IX) + Lo.RES_INLET.weir * Lo.GALLERY.small.h, 0.85) - 0.02 : 0.7, h: 1.0, t: 0.2 };
  const CH = { x0: IX - 0.6, x1: IX + 0.6, z0: 6.9, z1: IN.z1 - 0.3, yA: 0.55, yB: 0.45, h: 0.62, t: 0.15 };
  const chBed = (z) => L.lerp(CH.yB, CH.yA, (z - CH.z0) / (CH.z1 - CH.z0));
  const chute = new THREE.Group(); L1.add(chute);
  { const c = MAT.concNew, len = CH.z1 - CH.z0, tilt = -Math.atan((CH.yA - CH.yB) / len), zm = (CH.z0 + CH.z1) / 2, ym = (CH.yA + CH.yB) / 2;
    const piece = (w, h, x, yc) => { const m = L.box(w, h, len + 0.02, c, x, ym + yc, zm); m.rotation.x = tilt; chute.add(m); };
    piece(CH.x1 - CH.x0 + 2 * CH.t, 0.22, IX, -0.11);                                   // fundo do canal
    [CH.x0 - CH.t / 2, CH.x1 + CH.t / 2].forEach((x) => piece(CH.t, CH.h + 0.22, x, (CH.h - 0.22) / 2)); // paredes
    [[CH.x0 - 0.4, CH.x0], [CH.x1, CH.x1 + 0.4]].forEach(([a, b]) => chute.add(L.box(b - a, 1.65, 0.3, c, (a + b) / 2, BOX.bedIn + 0.6, IN.z1 - 0.15))); // cabeceira (moldura da boca)
    chute.add(L.box(CH.x1 - CH.x0 + 0.8, 0.28, 0.3, c, IX, BOX.bedIn + BOX.h + 0.14, IN.z1 - 0.15));
    chute.add(L.box(CH.x1 - CH.x0 + 0.3, 0.08, 0.2, c, IX, CH.yB - 0.06, CH.z0 - 0.06)); // lábio da bica
    [9.4, 7.5].forEach((z) => { const yb = chBed(z) - 0.22; chute.add(L.box(1.5, yb - FLOOR, 0.36, c, IX, (yb + FLOOR) / 2, z)); }); // pilares
    chute.add(L.box(2.8, 0.14, 3.0, c, IX, FLOOR + 0.07, 5.75));                       // bacia de dissipação
    for (let i = 0; i < 4; i++) chute.add(L.box(0.32, 0.38, 0.32, c, IX - 0.96 + i * 0.64, FLOOR + 0.33, 4.85));       // dentes
    chute.add(L.box(2.8, 0.26, 0.2, c, IX, FLOOR + 0.27, 4.35));                       // soleira final
  }
  // valas e tubos enterrados
  const inTr = makeTrench(L, K, { path: [[IX, OUT.z1], [IX, GZ0]], y0: BOX.bedIn + BOX.h / 2, y1: BOX.bedG + BOX.h / 2, r: BOX.h / 2 + BOX.t, wb: BOX.w + 2 * BOX.t + 0.4, slopeDeg: 58, ground: walkY, seed: 3 });
  const recTr = makeTrench(L, K, { path: [[PX, OUT.z1], [PX, 12.2], [4.4, 13.4], [5.7, 14.1], [Lo.RES_PUMP.toX, 14.9], [Lo.RES_PUMP.toX, 24.6]], y0: YH, y1: GW ? GW.invert(Lo.RES_PUMP.toX) + 0.55 : 0.07, r: rp, wb: 0.9, slopeDeg: 52, ground: walkY, seed: 7 });
  root.add(inTr.group, recTr.group);
  const pipeCurve = (tr) => { const c = []; const n = Math.ceil(tr.len / 0.5); for (let i = 0; i <= n; i++) { const p = tr.at((i / n) * tr.len); c.push([p.x, tr.yc((i / n) * tr.len), p.z]); } return L.curve(c, false, 0.3); };
  const inCurve = pipeCurve(inTr), recCurve = pipeCurve(recTr);
  const buriedM = (c) => { const m = L.mat(c, { roughness: c === '#3f77b0' ? 0.4 : 0.85 }); return m; };
  const recPipe = L.tube(recCurve, rp, buriedM('#3f77b0'), 90, 12);
  [recPipe].forEach((m) => { m.renderOrder = 6; m.receiveShadow = false; m.castShadow = false; L1.add(m); });
  // aduelas da galeria de ligação (seção vazada), assentadas uma a uma
  const boxShape = new THREE.Shape([[-BOX.w / 2 - BOX.t, -BOX.t], [BOX.w / 2 + BOX.t, -BOX.t], [BOX.w / 2 + BOX.t, BOX.h + BOX.t], [-BOX.w / 2 - BOX.t, BOX.h + BOX.t]].map((q) => new THREE.Vector2(q[0], q[1])));
  boxShape.holes.push(new THREE.Path([[-BOX.w / 2, 0], [-BOX.w / 2, BOX.h], [BOX.w / 2, BOX.h], [BOX.w / 2, 0]].map((q) => new THREE.Vector2(q[0], q[1]))));
  const NSEG = 9, segLen = (GZ0 - OUT.z1) / NSEG, segGeo = new THREE.ExtrudeGeometry(boxShape, { depth: segLen - 0.04, bevelEnabled: false });
  const boxM = L.mat('#b4b9bd', { roughness: 0.88, side: THREE.DoubleSide }), bedAt = (z) => L.lerp(BOX.bedIn, BOX.bedG, (z - OUT.z1) / (GZ0 - OUT.z1));
  const segs = []; for (let i = 0; i < NSEG; i++) { const z0 = OUT.z1 + i * segLen + 0.02, m = L.mesh(segGeo, boxM, IX, bedAt(z0), z0); m.rotation.x = -Math.atan((BOX.bedG - BOX.bedIn) / (GZ0 - OUT.z1)); m.renderOrder = 6; m.receiveShadow = false; m.castShadow = false; L1.add(m); segs.push(m); }
  const boxStub = L.mesh(segGeo, boxM, IX, BOX.bedG, GZ0); boxStub.renderOrder = 6; boxStub.receiveShadow = false; L1.add(boxStub); // até a galeria pequena (antes da ampliação)
  const recStub = L.cyl(1, 1, 1, buriedM('#3f77b0'), 0, 0, 0, 14); recStub.renderOrder = 6; recStub.receiveShadow = false; L1.add(recStub);

  /* ======================= ACABAMENTO ======================= */
  const F0 = new THREE.Group(); root.add(F0);
  const paveM = L.mat('#d3ccbd', { roughness: 0.9 }), grassM = L.mat('#5fae42', { roughness: 0.95 }); xrayMats.push(paveM, grassM);
  const strip = (pts, w, m) => { const s = new THREE.Mesh(K.ribbon(pts, w, (x, z) => G(x, z), 0.012), m); s.receiveShadow = true; F0.add(s); return s; };
  const mg = 0.6, walk = [
    strip([[OUT.x0 - 0.0, (P.z0 + OUT.z0) / 2], [OUT.x1 + mg, (P.z0 + OUT.z0) / 2]].map(([x, z], i) => [i ? P.x1 : P.x0, z]), OUT.z0 - P.z0, paveM),
    strip([[(OUT.x1 + P.x1) / 2, OUT.z0], [(OUT.x1 + P.x1) / 2, P.z1]], P.x1 - OUT.x1, paveM)
  ];
  const grass = strip([[(P.x0 + OUT.x0) / 2, OUT.z0], [(P.x0 + OUT.x0) / 2, P.z1]], OUT.x0 - P.x0, grassM);
  // tufos de grama no talude esquerdo
  const tufts = L.scatter(new THREE.ConeGeometry(0.05, 0.16, 4), M('#4e9a36', { roughness: 0.95 }), 160, (i, r, d) => { const x = L.lerp(P.x0 + 0.04, OUT.x0 - 0.04, r()), z = L.lerp(OUT.z0, P.z1, r()); d.position.set(x, G(x, z) + 0.07, z); d.rotation.set((r() - 0.5) * 0.4, 0, (r() - 0.5) * 0.4); d.scale.setScalar(0.7 + r() * 0.8); }, 21);
  F0.add(tufts);
  // guarda-corpo amarelo sobre as paredes (vão no topo da escada)
  const rails = [];
  const railLine = (a, b, skip) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.25)), pts = []; for (let i = 0; i <= n; i++) { const x = L.lerp(a[0], b[0], i / n), z = L.lerp(a[1], b[1], i / n); if (!skip || !skip(x, z)) pts.push([x, z]); else pts.push(null); } rails.push(pts); };
  const midW = WT / 2, gap = (x, z) => x < IN.x0 + 1.3 && z < IN.z0 + 0.6;
  railLine([OUT.x0 + midW, OUT.z0 + midW], [TW.x0 - 0.3, OUT.z0 + midW], gap);
  railLine([OUT.x0 + midW, IN.z0 + 0.6], [OUT.x0 + midW, OUT.z1 - midW]);
  railLine([OUT.x0 + midW, OUT.z1 - midW], [OUT.x1 - midW, OUT.z1 - midW]);
  railLine([OUT.x1 - midW, TW.z1 + 0.6], [OUT.x1 - midW, OUT.z1 - midW]);
  const posts = [], bars = [];
  rails.forEach((pts) => pts.forEach((p, i) => { if (!p) return; posts.push(p); const q = pts[i + 1]; if (q) bars.push([p, q]); }));
  const postIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), MAT.rail, posts.length), barIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 8), MAT.rail, bars.length * 2);
  [postIM, barIM].forEach((m) => { m.castShadow = true; m.frustumCulled = false; F0.add(m); });
  // placa
  const signTex = K.canvasTex(1024, 300, (g, w, h) => { g.fillStyle = '#1f6f4a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f4f5f2'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28); g.fillStyle = '#f4f5f2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'bold 84px Inter, Arial, sans-serif'; g.fillText('RESERVATÓRIO', w / 2, 100); g.fillText('DE CONTENÇÃO', w / 2, 200); });
  const sign = new THREE.Group(); F0.add(sign);
  { const sx = -4.6, sz = (P.z0 + OUT.z0) / 2, gy = G(sx, sz); sign.position.set(sx, gy, sz); [-1.35, 1.35].forEach((x) => sign.add(L.cyl(0.05, 0.05, 2.5, MAT.galv, x, 1.25, 0, 8))); sign.add(L.box(3.0, 0.9, 0.06, M('#174f36'), 0, 2.0, -0.02)); const face = L.mesh(new THREE.PlaneGeometry(2.96, 0.86), L.mat(0xffffff, { map: signTex, roughness: 0.5 }), 0, 2.0, 0.015, { cast: false }); sign.add(face); }

  /* ======================= MÁQUINAS DA OBRA ======================= */
  const exc = MC.excavator(); root.add(exc.root); L.shadows(exc.root);
  const trucks = [MC.dumpTruck(), MC.dumpTruck({ cab: K.G('#f4f5f2', { roughness: 0.3 }), body: K.G('#e8a23a', { roughness: 0.4 }) })];
  trucks.forEach((tk) => { L.shadows(tk.root); root.add(tk.root); });
  const dirtFall = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#7a5638', { roughness: 1, flatShading: true }), 28); dirtFall.frustumCulled = false; root.add(dirtFall);

  /* ======================= ÁGUA ======================= */
  const W0 = new THREE.Group(); root.add(W0);
  const waterM = L.water('#6f9fb8', 0.8, { side: THREE.DoubleSide });
  const pool = L.mesh(new THREE.PlaneGeometry(IN.x1 - IN.x0, IN.z1 - IN.z0), waterM, (IN.x0 + IN.x1) / 2, 0, (IN.z0 + IN.z1) / 2, { cast: false }); pool.rotation.x = -PI / 2; pool.renderOrder = 12; W0.add(pool);
  const well = L.mesh(new THREE.PlaneGeometry(TW.x1 - TW.x0, TW.z1 - TW.z0), waterM, (TW.x0 + TW.x1) / 2, 0, (TW.z0 + TW.z1) / 2, { cast: false }); well.rotation.x = -PI / 2; well.renderOrder = 12; W0.add(well);
  // cascata: água no canal + véu d'água (lâmina grossa em parábola) da bica até a bacia de dissipação
  const chWater = L.mesh(new THREE.PlaneGeometry(CH.x1 - CH.x0 - 0.02, CH.z1 - CH.z0 + 0.3), L.water('#8dbad0', 0.88, { emissive: '#132a35' }), IX, (CH.yA + CH.yB) / 2 + 0.36, (CH.z0 + CH.z1) / 2 + 0.15, { cast: false });
  chWater.rotation.x = -PI / 2 - Math.atan((CH.yA - CH.yB) / (CH.z1 - CH.z0)); chWater.renderOrder = 13;
  const PAD = FLOOR + 0.14, nap = (vz, y0, n = 14) => { const out = [], T = Math.sqrt((y0 - PAD) / 4.9); for (let i = 0; i <= n; i++) { const tt = (i / n) * T; out.push([CH.z0 - 0.08 - vz * tt, y0 - 4.9 * tt * tt]); } return out; };
  const outer = nap(1.9, CH.yB + 0.4), inner = nap(1.3, CH.yB + 0.01);
  const sheetGeo = new THREE.ExtrudeGeometry(new THREE.Shape([...outer, ...inner.reverse()].map((p) => new THREE.Vector2(p[0], p[1]))), { depth: CH.x1 - CH.x0 - 0.04, bevelEnabled: false, curveSegments: 4 });
  sheetGeo.rotateY(-PI / 2);
  { const pa = sheetGeo.attributes.position, dep = CH.x1 - CH.x0 - 0.04, y0 = CH.yB + 0.4; for (let i = 0; i < pa.count; i++) { const f = L.clamp01((y0 - pa.getY(i)) / (y0 - PAD)); pa.setX(i, -dep / 2 + (pa.getX(i) + dep / 2) * (1 + 0.55 * f)); } sheetGeo.computeVertexNormals(); }
  const cascM = L.water('#e4f2f7', 0.93, { side: THREE.DoubleSide, emissive: '#43636f' });
  const sheet = L.mesh(sheetGeo, cascM, CH.x1 - 0.02, 0, 0, { cast: false }); sheet.renderOrder = 13; W0.add(sheet, chWater);
  inner.reverse();
  const HIT = { x: IX, z: (outer[outer.length - 1][0] + inner[inner.length - 1][0]) / 2 };
  const padWater = L.mesh(new THREE.CircleGeometry(1.5, 32), L.water('#8dbad0', 0.85), IX, PAD + 0.012, HIT.z - 0.3, { cast: false }); padWater.rotation.x = -PI / 2; padWater.scale.set(0.95, 1.25, 1); padWater.renderOrder = 13; W0.add(padWater);
  const foamPath = L.curve([[IX, CH.yA + 0.42, CH.z1], [IX, (CH.yA + CH.yB) / 2 + 0.41, (CH.z0 + CH.z1) / 2], ...outer.map(([z, y]) => [IX, y + 0.02, z + 0.03])], false, 0.3);
  const foamGeo = new THREE.SphereGeometry(1, 7, 5); foamGeo.scale(1.3, 0.5, 1);
  const foam = new L.Flow(foamPath, { n: 260, size: 0.045, geo: foamGeo, sizeVar: 0.6, jitter: [0.55, 0.05, 0.06], colors: ['#ffffff', '#e8f4fa', '#cfe6f1'], seed: 12, material: L.mat('#ffffff', { roughness: 0.4, emissive: '#5a7480', transparent: true, opacity: 0.95 }) });
  foam.mesh.renderOrder = 14; W0.add(foam.mesh);
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), L.mat('#ffffff', { roughness: 0.3, emissive: '#6b8794', transparent: true, opacity: 0.9 }), 90); spray.frustumCulled = false; spray.renderOrder = 14; W0.add(spray);
  const sprayP = []; { const r = L.rng(44); for (let i = 0; i < 90; i++) sprayP.push({ ph: r(), a: r() * L.TAU, v: 0.6 + r() * 1.9, up: 0.8 + r() * 2.6, s: r() }); }
  const ringM = L.mat('#ffffff', { transparent: true, opacity: 0.5, depthWrite: false, roughness: 0.4 });
  const boilTex = K.canvasTex(256, 256, (g, w, h) => { const r = L.rng(5); g.clearRect(0, 0, w, h); for (let i = 0; i < 420; i++) { const a = r() * L.TAU, d = Math.pow(r(), 0.7) * w * 0.46, x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d, s = 3 + r() * 13 * (1 - d / w); g.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.6})`; g.beginPath(); g.arc(x, y, s, 0, L.TAU); g.fill(); } });
  const boil = L.mesh(new THREE.PlaneGeometry(2.6, 2.6), L.mat('#ffffff', { map: boilTex, transparent: true, depthWrite: false, roughness: 0.5, emissive: '#6d8792', emissiveMap: boilTex }), 0, 0, 0, { cast: false }); boil.rotation.x = -PI / 2; boil.renderOrder = 15; W0.add(boil);
  const rings = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), ringM.clone()); m.rotation.x = -PI / 2; m.renderOrder = 15; W0.add(m); return m; });
  // folhas boiando
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, -0.14); leafShape.quadraticCurveTo(0.09, 0, 0, 0.14); leafShape.quadraticCurveTo(-0.09, 0, 0, -0.14);
  const leafGeo = new THREE.ShapeGeometry(leafShape, 4); leafGeo.rotateX(-PI / 2);
  const NLF = 46, leaves = new THREE.InstancedMesh(leafGeo, L.mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), NLF); leaves.frustumCulled = false; W0.add(leaves);
  const leafP = []; { const r = L.rng(8), cols = ['#6f9a2e', '#8bb03a', '#c49a2c', '#9a6a2a', '#4f7d2a']; for (let i = 0; i < NLF; i++) { leafP.push({ x: L.lerp(IN.x0 + 0.5, IN.x1 - 0.5, r()), z: L.lerp(IN.z0 + 0.5, IN.z1 - 0.6, r()), ph: r() * 6, s: 0.9 + r() * 1.4, rot: r() * 6 }); leaves.setColorAt(i, new THREE.Color(cols[i % cols.length])); } }
  // redemoinho na sucção (tomada d'água da casa de bombas) quando a bomba liga
  const SWX = TW.x0 - 0.75, SWZ = (TW.z0 + TW.z1) / 2;
  const swirl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), L.mat('#ffffff', { roughness: 0.4, emissive: '#55707c', transparent: true, opacity: 0.9 }), 56); swirl.frustumCulled = false; swirl.renderOrder = 14; W0.add(swirl);
  const dimple = L.mesh(new THREE.ConeGeometry(0.55, 0.5, 24, 1, true), L.water('#4f87a3', 0.9, { side: THREE.DoubleSide }), SWX, 0, SWZ, { cast: false }); dimple.rotation.x = PI; dimple.renderOrder = 13; W0.add(dimple);
  // fluxo dentro dos tubos (aparece no raio-x) e setas
  const inFlow = new L.Flow(L.curve([[IX, BOX.bedG + 0.2, GZ0 + 0.3], [IX, BOX.bedIn + 0.2, IN.z1]]), { n: 46, size: 0.09, jitter: [0.45, 0.12, 0.2], color: '#5f9fc4', seed: 5 }); L1.add(inFlow.mesh);
  const recIn = [[PX, SUMPF + 0.6, RZ + 0.02], [PX, YH - 0.3, RZ + 0.02], [PX, YH, RZ + 0.35], [PX, YH, OUT.z1]].map(L.v3);
  const recAll = L.curve([...recIn.map((v) => [v.x, v.y, v.z]), ...recCurve.points.slice(1).map((v) => [v.x, v.y, v.z])], false, 0.2);
  const recFlow = new L.Flow(recAll, { n: 70, size: 0.07, jitter: [0.08, 0.08, 0.08], color: '#5f9fc4', seed: 6 }); L1.add(recFlow.mesh);
  const overPath = (tr, dy) => { const c = []; const n = Math.ceil(tr.len / 0.6); for (let i = 0; i <= n; i++) { const s = (i / n) * tr.len, p = tr.at(s); c.push([p.x, walkY(p.x, p.z) + dy, p.z]); } return c; };
  const chIn = new L.Chevrons(L.curve(overPath(inTr, 0.45).reverse()), { n: 7, size: 0.62, normal: [0, 1, 0], color: PAL.good });
  const chRec = new L.Chevrons(L.curve(overPath(recTr, 0.35)), { n: 11, size: 0.3, normal: [0, 1, 0], color: PAL.good });
  const chRise = new L.Chevrons(new THREE.LineCurve3(V(PX, SUMPF + 0.9, RZ + 0.36), V(PX, YH - 0.35, RZ + 0.36)), { n: 5, size: 0.3, normal: [0, 0, 1], color: PAL.good });
  const chRun = new L.Chevrons(new THREE.LineCurve3(V(PX, YH + 0.42, RZ + 0.6), V(PX, YH + 0.42, OUT.z1)), { n: 8, size: 0.3, normal: [0, 1, 0], color: PAL.good });
  const chFall = new L.Chevrons(L.curve(outer.filter((_, i) => i % 3 === 0).map(([z, y]) => [IX + 0.95, y + 0.1, z])), { n: 4, size: 0.42, normal: [1, 0, 0], color: PAL.good });
  [chIn, chRec, chRise, chRun, chFall].forEach((c) => root.add(c.mesh));

  L.shadows(S0); L.shadows(chute); L.shadows(piping); pumpObj.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  [pool, well, sheet].forEach((m) => { m.castShadow = false; });
  const _o = new THREE.Object3D(), _v = new THREE.Vector3(), _w = new THREE.Vector3();

  /* ======================= MÁQUINAS: lógica ======================= */
  const hash = (n) => L.fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
  const angTo = (dx, dz) => Math.atan2(-dz, dx); // rotation.y que aponta +x local para (dx, dz)
  const lerpAng = (a, b, k) => { let d = ((b - a + PI) % L.TAU + L.TAU) % L.TAU - PI; return a + d * k; };
  const TRUCK_Z = -4.4, SPOT = 0.6;
  function truckState(i, b, ex) {
    // T0 começa carregando e sai; T1 chega pela esquerda, carrega e sai pela direita (rua B → avenida da margem)
    let d, load;
    if (i === 0) { d = 42 * Math.pow(pr(b, 0.13, 0.42), 1.25); load = Math.min(1, 0.4 + ex * 2.4); if (d > 0) load = Math.min(1, 0.4 + 0.13 / 0.35 * 2.4); }
    else { const arr = io(pr(b, 0.15, 0.235)), dep = Math.pow(pr(b, 0.36, 0.66), 1.25); d = -24 * (1 - arr) + 44 * dep; load = b < 0.235 ? 0 : Math.min(1, (ex - 0.67) / 0.33 * 0.85 + 0.15); load = L.clamp01(load); }
    const vis = b > 0.0005 && (i === 0 ? d < 40 : b > 0.15 && d < 42);
    let x = SPOT + d, z = TRUCK_Z, rot = 0;
    if (x > 20.5) { z = TRUCK_Z - (x - 20.5); x = 20.5; rot = PI / 2; }
    const shrink = z < -16 ? L.clamp01(1 - (-16 - z) / 4) : x < -21 ? L.clamp01(1 - (-21 - x) / 3) : 1;
    return { vis: vis && shrink > 0.01, x, z, rot, d, load, s: shrink };
  }
  function excState(b, ex, st, li) {
    // posição da base, rumo das esteiras e "deslocamento" (para as sapatas)
    let x = L.lerp(-1.9, 0.5, io(pr(ex, 0, 0.76))), z = 2.8, head = 0, travel = x, digging = ex > 0 && ex < 0.77;
    const turn = io(pr(ex, 0.77, 0.8)), back = io(pr(ex, 0.8, 0.86));
    head = -PI / 2 * turn; z = L.lerp(2.8, -0.75, back); travel += -(z - 2.8);
    if (ex >= 0.86 && ex < 1) digging = true;
    const park = io(pr(st, 0.0, 0.3)), spin = io(pr(st, 0.3, 0.5)), leave = pr(li, 0.0, 0.6);
    z = L.lerp(z, -5.0, park); travel += -(L.lerp(-0.75, -5.0, park) + 0.75) * (ex >= 1 ? 1 : 0);
    head = lerpAng(head, PI, spin);
    x = L.lerp(x, -21.5, io(leave)); travel += (x - 0.5) * (st > 0.5 ? -1 : 0);
    const shrink = L.clamp01(1 - (-19 - x) / 3);
    return { x, z, head, travel, digging, vis: b > 0.0005 && li < 0.6 && shrink > 0.01, s: x < -19 ? shrink : 1 };
  }
  function digTarget(n, ex) {
    const h = hash(n), h2 = hash(n + 7.3);
    if (ex < 0.8) { const k = Math.min(3, Math.floor(ex / 0.2)), q = L.clamp01((ex - 0.2 * k) / 0.2), zf = L.lerp(11.8, 3.1, q); const z = clamp(zf + 0.4 + h2 * 0.8, 4.8, 10.2), x = clamp(L.lerp(-1.9, 0.5, io(pr(ex, 0, 0.76))) + (h - 0.5) * 6, P.x0 + 0.8, P.x1 - 0.8); return [x, z]; }
    const q = L.clamp01((ex - 0.8) / 0.18), zs = L.lerp(4.8, 0.4, q); return [clamp(0.5 + (h - 0.5) * 5, P.x0 + 0.8, P.x1 - 0.8), clamp(zs + 0.4 + h2 * 0.6, 1.8, 9)];
  }

  /* ======================= UPDATE ======================= */
  // trocar 'transparent' muda o programa (define OPAQUE do three.js): precisa de needsUpdate, senão a opacidade é ignorada
  const setT = (m, on) => { if (m.transparent !== on) { m.transparent = on; m.needsUpdate = true; } };
  const setX = (m, k) => { m.opacity = 1 - 0.75 * k; setT(m, k > 0.01); m.depthWrite = k < 0.01; };
  return {
    update(t, S, cam) {
      const b = S.build.reservoir, ex = pr(b, 0, 0.35), st = pr(b, 0.35, 0.65), li = pr(b, 0.65, 0.85), fi = pr(b, 0.85, 1);
      const xr = S.xray; xrayMats.forEach((m) => setX(m, xr));
      /* ---- cava ---- */
      const slabK = pr(st, 0.0, 0.32), wallK = pr(st, 0.18, 0.72), bf = ss(0.55, 1, wallK);
      pit.update(ex, bf); pit.group.visible = !(fi > 0.5);
      // topo do bloco acompanha o chão do terreno: campo verde no estado natural → terra exposta depois da derrubada
      pit.U.uSurf.value.set('#5fb244').lerp(SURF_EARTH, L.clamp01(S.build.clear * 1.2));
      const moundK = Math.min(ss(0.05, 0.5, ex), 1 - ss(0.1, 0.5, st));
      mound.visible = moundK > 0.01; mound.scale.set(0.5 + 0.6 * moundK, moundK, 0.45 + 0.5 * moundK); mound.position.y = G(-9, 0.2) - 0.05;
      /* ---- estrutura ---- */
      S0.visible = b > 0.35;
      rebar.visible = st > 0.0 && slabK < 0.98; slab.visible = slabK > 0.001;
      slabClip.constant = L.lerp(OUT.x0 - 0.01, OUT.x1 + 0.05, io(slabK));
      walls.forEach((w, i) => {
        const k = ss(0.12 * (i % 2), 0.88 + 0.12 * (i % 2), wallK), fk = Math.min(ss(0, 0.35, wallK + 0.08 * (i % 2)), 1 - ss(0.86, 1, pr(st, 0.7, 0.86) * 1.0 + (wallK > 0.999 ? 0 : -1)));
        w.g.visible = k > 0.002; w.g.scale.y = Math.max(0.002, k);
        w.f.visible = fk > 0.01; w.f.scale.y = Math.max(0.01, Math.min(1, k + 0.18) * fk); w.f.position.y = YE;
      });
      const stK = pr(st, 0.62, 0.92); stair.visible = stK > 0.001; stairClip.constant = -L.lerp(stZ1 + 0.4, stZ0 - 0.1, io(stK)) ;
      stairClip.normal.set(0, 0, 1); stairClip.constant = -(L.lerp(stZ1 + 0.4, stZ0 - 0.1, io(stK)));
      handrail.visible = st > 0.95;
      const lk = pr(st, 0.8, 1); ladder.visible = lk > 0.01; ladder.scale.y = 1; ladder.children.forEach((c, i) => { c.visible = i < 2 ? true : i / ladder.children.length < lk; }); ladder.position.y = 0;
      ruler.visible = lk > 0.01; rulerM.opacity = ss(0, 1, lk);
      const tk = pr(st, 0.55, 0.9); tower.visible = tk > 0.001; towerG.scale.y = Math.max(0.002, io(tk)); towerG.position.y = (1 - io(tk)) * (SUMPF - 0.3);
      /* ---- ligações ---- */
      L1.visible = li > 0;
      const inOpen = io(pr(li, 0, 0.35)), recOpen = io(pr(li, 0.15, 0.45));
      const inLay = pr(li, 0.25, 0.6), recLay = pr(li, 0.4, 0.75);
      inTr.update(inOpen, ss(0, 0.45, fi), pr(fi, 0.35, 0.6), xr); recTr.update(recOpen, ss(0.05, 0.5, fi), pr(fi, 0.4, 0.65), xr);
      recPipe.visible = recLay > 0.001; recPipe.geometry.setDrawRange(0, Math.floor(90 * recLay) * 12 * 6);
      segs.forEach((m, i) => { const k = io(L.clamp01(inLay * NSEG - i)); m.visible = k > 0.01; m.position.y = bedAt(m.position.z) + 1.6 * (1 - k); });
      const gz = GW ? GW.weir.z() : 24.95; boxStub.visible = inLay > 0.98 && gz > GZ0 + 0.03; boxStub.scale.z = Math.max(0.01, (gz - GZ0 + 0.05) / (segLen - 0.04));
      if (GW) { _v.set(Lo.RES_PUMP.toX, recCurve.points[recCurve.points.length - 1].y, GZ0 - 0.05); _w.set(GW.pump.x, GW.pump.y(), GW.pump.z() + 0.05); } else { _v.set(6.5, 0.07, GZ0 - 0.05); _w.set(6.5, 0.07, 25.0); }
      recStub.visible = recLay > 0.98; K.placeRod(recStub, _v, _w); recStub.scale.x = recStub.scale.z = rp;
      const chK = pr(li, 0.3, 0.6); chute.visible = chK > 0.001; chute.scale.y = Math.max(0.002, io(chK)); chute.position.y = FLOOR * (1 - io(chK));
      const pipK = pr(li, 0.35, 0.75); piping.visible = pipK > 0.01; piping.scale.set(1, 1, 1); piping.position.y = -3 * (1 - io(pipK)) * 0; piping.children.forEach((c, i) => { c.visible = i / piping.children.length <= pipK + 0.02; });
      const pumpK = io(pr(li, 0.5, 0.9)), py = L.lerp(4.2, SUMPF, pumpK);
      const vib = S.pump > 0.5 ? 1 : 0;
      pumpObj.visible = li > 0.5; pumpObj.position.set(PX + Math.sin(t * 88) * 0.008 * vib, py + Math.abs(Math.sin(t * 71)) * 0.006 * vib, PZ); pumpObj.rotation.y = 0;
      const bailY = py + 2.13 * PS; chain.visible = pumpObj.visible; K.placeRod(chain, _v.set(PX, bailY, PZ), _w.set(PX, ROOF - 0.24, PZ)); chain.scale.x = chain.scale.z = 0.025;
      /* ---- acabamento ---- */
      F0.visible = fi > 0;
      const pv = pr(fi, 0.2, 0.55); walk.forEach((w) => { w.visible = pv > 0.01; }); paveM.opacity = 1; walk.forEach((w) => { w.scale.y = 1; });
      if (xr < 0.01) { setT(paveM, pv < 0.99); paveM.opacity = pv; paveM.depthWrite = pv > 0.99; }
      const gk = pr(fi, 0.3, 0.65); grass.visible = gk > 0.01; tufts.visible = gk > 0.5; if (xr < 0.01) { setT(grassM, gk < 0.99); grassM.opacity = gk; }
      const rk = pr(fi, 0.3, 0.85);
      posts.forEach(([x, z], i) => { const k = ss(i / posts.length * 0.8, i / posts.length * 0.8 + 0.2, rk), y = G(x, z); _o.position.set(x, y + 0.55 * k, z); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1.1 * k + 0.001, 1); _o.updateMatrix(); postIM.setMatrixAt(i, _o.matrix); });
      bars.forEach(([p, q], i) => [1.08, 0.55].forEach((hh, j) => { const k = ss(0.75, 1, rk); _v.set(p[0], G(p[0], p[1]) + hh, p[1]); _w.set(q[0], G(q[0], q[1]) + hh, q[1]); K.placeRod(_o, _v, _w); _o.scale.x = _o.scale.z = k > 0.01 ? 1 : 0; _o.updateMatrix(); barIM.setMatrixAt(i * 2 + j, _o.matrix); }));
      postIM.instanceMatrix.needsUpdate = true; barIM.instanceMatrix.needsUpdate = true;
      const sk = io(pr(fi, 0.6, 1)); sign.visible = sk > 0.01; sign.scale.set(1, Math.max(0.01, sk), 1);
      /* ---- máquinas ---- */
      const E = excState(b, ex, st, li);
      exc.root.visible = E.vis;
      if (E.vis) {
        const gy = E.z > 1.5 ? pit.level(E.x, E.z, ex, bf) + 0.03 : walkY(E.x, E.z);
        exc.root.position.set(E.x, gy, E.z); exc.root.rotation.y = E.head; exc.root.scale.setScalar(E.s); exc.setTracks(E.travel);
        const Tc = 0.95, u = L.fract(t / Tc), n = Math.floor(t / Tc);
        const tkA = truckState(0, b, ex), tkB = truckState(1, b, ex), tgt = tkA.d < 1 && tkA.vis ? tkA : tkB;
        const upY = gy + 1.05;
        const toPlane = (wx, wy, wz) => { const dx = wx - E.x, dz = wz - E.z; return { r: Math.hypot(dx, dz), h: wy - upY, a: angTo(dx, dz) - E.head }; };
        let slew = 0, pin = [4.2, 0.6], bang = -2.9, load = 0;
        if (E.digging) {
          const d0 = digTarget(n, ex), d1 = digTarget(n + 1, ex);
          const yd0 = pit.level(d0[0], d0[1], ex, bf), yd1 = pit.level(d1[0], d1[1], ex, bf);
          const D0 = toPlane(d0[0], yd0 + 1.1, d0[1]), D1 = toPlane(d1[0], yd1 + 1.1, d1[1]);
          const bedX = tgt.x - 0.9, bedY = G(tgt.x, TRUCK_Z) + 2.6, T = toPlane(bedX, bedY + 1.7, TRUCK_Z);
          const up = Math.max(T.h, D0.h + 2.5);
          const sw1 = io(pr(u, 0.45, 0.62)), sw2 = io(pr(u, 0.75, 1));
          slew = u < 0.75 ? lerpAng(D0.a, T.a, sw1) : lerpAng(T.a, D1.a, sw2);
          if (u < 0.3) { const k = io(u / 0.3); pin = [L.lerp(D0.r + 0.6, D0.r - 0.9, k), D0.h + 0.15 * Math.sin(PI * k)]; bang = L.lerp(-1.9, -3.4, k); load = ss(0.3, 1, k); }
          else if (u < 0.45) { const k = io((u - 0.3) / 0.15); pin = [L.lerp(D0.r - 0.9, D0.r - 1.4, k), L.lerp(D0.h, up, k)]; bang = -3.4; load = 1; }
          else if (u < 0.62) { pin = [L.lerp(D0.r - 1.4, T.r, sw1), L.lerp(up, T.h, sw1)]; bang = -3.4; load = 1; }
          else if (u < 0.75) { const k = io((u - 0.62) / 0.13); pin = [T.r, T.h]; bang = L.lerp(-3.4, -0.5, k); load = 1 - k; }
          else { pin = [L.lerp(T.r, D1.r + 0.6, sw2), L.lerp(T.h, D1.h, ss(0.3, 1, sw2)) + 0.6 * Math.sin(PI * sw2)]; bang = L.lerp(-0.5, -1.9, sw2); }
          // terra caindo na caçamba do caminhão
          const fallK = pr(u, 0.63, 0.86);
          exc.pose({ slew, p: pin, bucket: bang, load }); exc.root.updateMatrixWorld(true);
          exc.bucket.localToWorld(_v.set(0.65, 0.2, 0));
          for (let i = 0; i < 28; i++) { const ph = hash(i + 3), f = L.clamp01(fallK * 1.7 - ph * 0.7); const on = f > 0 && f < 1 && tgt.vis && Math.abs(tgt.x - SPOT) < 2; _o.position.set(_v.x + (hash(i + 9) - 0.5) * 0.9, L.lerp(_v.y, bedY - 0.5, f * f), _v.z + (hash(i + 13) - 0.5) * 0.7); _o.rotation.set(i, i * 2, 0); _o.scale.setScalar(on ? 0.1 + 0.08 * hash(i) : 0); _o.updateMatrix(); dirtFall.setMatrixAt(i, _o.matrix); }
          dirtFall.instanceMatrix.needsUpdate = true; dirtFall.visible = true;
        } else { exc.pose({ slew: 0, p: [4.0, 0.2], bucket: -3.3, load: 0 }); dirtFall.visible = false; }
      } else dirtFall.visible = false;
      trucks.forEach((tk, i) => {
        const T = truckState(i, b, ex); tk.root.visible = T.vis; if (!T.vis) return;
        tk.root.position.set(T.x, walkY(T.x, T.z) - 0.02, T.z); tk.root.rotation.y = T.rot; tk.root.scale.setScalar(T.s); tk.set(T.d, T.load, 0);
      });
      /* ---- água ---- */
      const built = b > 0.99, res = S.res, wy = FLOOR + res * DP, weir = S.weir, pump = S.pump;
      W0.visible = built;
      pool.visible = res > 0.004; pool.position.y = wy; well.visible = res > 0.004; well.position.y = wy;
      levelMark.visible = built && res > 0.01 && ruler.visible; levelMark.position.y = wy + 0.01;
      const cs = ss(0.02, 0.25, weir);
      sheet.visible = cs > 0.01; cascM.opacity = 0.85 * cs;
      foam.mesh.visible = cs > 0.01; foam.update(t, { speed: 0.45, amount: cs, size: 0.05 * (0.6 + 0.4 * cs) });
      const hitY = Math.max(PAD, wy);
      chWater.visible = cs > 0.01; padWater.visible = cs > 0.01 && wy < PAD + 0.02;
      for (let i = 0; i < sprayP.length; i++) {
        const q = sprayP[i], tau = L.fract(t * 1.5 + q.ph) * 0.5, on = cs > 0.05;
        _o.position.set(HIT.x + Math.sin(q.a) * (0.35 + q.v * tau), hitY + q.up * tau - 4.9 * tau * tau, HIT.z + Math.cos(q.a) * (0.25 + q.v * tau) * 0.9); _o.rotation.set(0, 0, 0);
        _o.scale.setScalar(on && _o.position.y > hitY - 0.02 ? (0.025 + 0.04 * q.s) * (1 - 0.6 * tau / 0.5) * cs : 0); _o.updateMatrix(); spray.setMatrixAt(i, _o.matrix);
      }
      spray.instanceMatrix.needsUpdate = true; spray.visible = cs > 0.01;
      boil.visible = cs > 0.02; boil.position.set(HIT.x, hitY + 0.02, HIT.z + 0.1); boil.rotation.z = t * 0.6; boil.material.opacity = 0.95 * cs; boil.scale.setScalar(0.8 + 0.25 * Math.sin(t * 5.1) * 0.3 + 0.3 * cs);
      rings.forEach((m, i) => { const k = L.fract(t * 0.7 + i / 3); m.visible = cs > 0.05; m.position.set(HIT.x, hitY + 0.015, HIT.z); m.scale.setScalar(0.4 + 2.4 * k); m.material.opacity = 0.6 * (1 - k) * cs; });
      for (let i = 0; i < NLF; i++) {
        const q = leafP[i], on = res > 0.015;
        let x = q.x + 0.35 * Math.sin(t * 0.37 + q.ph) + 0.6 * weir * Math.sin(q.ph * 3 + t * 0.2), z = q.z + 0.3 * Math.cos(t * 0.29 + q.ph * 1.3) - 0.3 * weir * L.fract(t * 0.05 + q.ph);
        x = clamp(x, IN.x0 + 0.2, IN.x1 - 0.2); z = clamp(z, IN.z0 + 0.2, IN.z1 - 0.2);
        const inStair = x < IN.x0 + stW + 0.1 && wy < L.lerp(stTop, FLOOR, (z - stZ0) / (stZ1 - stZ0)), inTower = x > TW.x0 - TW.t - 0.1 && z < TW.z1 + TW.t + 0.1, inChute = Math.abs(x - IX) < 1.0 && z > CH.z0 - 1.2 && wy < CH.yA + 0.3;
        _o.position.set(x, wy + 0.014, z); _o.rotation.set(0, q.rot + t * 0.1 * Math.sin(q.ph), 0); _o.scale.setScalar(on && !inStair && !inTower && !inChute ? q.s : 0); _o.updateMatrix(); leaves.setMatrixAt(i, _o.matrix);
      }
      leaves.instanceMatrix.needsUpdate = true;
      const pk = ss(0.02, 0.3, pump) * (res > 0.01 ? 1 : 0);
      for (let i = 0; i < 56; i++) { const ph = i / 56, r = 0.12 + 0.9 * L.fract(ph * 3.7 - t * 0.45), a = ph * L.TAU * 5 + t * (3.2 / (r + 0.25)); _o.position.set(SWX + Math.cos(a) * r, wy + 0.02 - (1 - r) * 0.12, SWZ + Math.sin(a) * r * 0.9); _o.scale.setScalar(pk > 0.01 ? 0.045 * pk * (0.6 + r) : 0); _o.updateMatrix(); swirl.setMatrixAt(i, _o.matrix); }
      swirl.instanceMatrix.needsUpdate = true; swirl.visible = pk > 0.01;
      dimple.visible = pk > 0.01; dimple.position.y = wy - 0.22 * pk + 0.01; dimple.scale.set(pk, pk, pk); dimple.rotation.y = t * 2;
      inFlow.mesh.visible = built && weir > 0.02; inFlow.update(t, { speed: 0.5, amount: ss(0, 0.3, weir) });
      recFlow.mesh.visible = built && pump > 0.02; recFlow.update(t, { speed: 0.12, amount: ss(0, 0.3, pump) });
      chIn.update(t, { speed: 0.35, amount: built ? ss(0.05, 0.4, weir) : 0 });
      chFall.update(t, { speed: 0.5, amount: built ? ss(0.05, 0.4, weir) * 0.9 : 0 });
      const pa = built ? ss(0.05, 0.4, pump) : 0;
      chRec.update(t, { speed: 0.08, amount: pa }); chRise.update(t, { speed: 0.3, amount: pa }); chRun.update(t, { speed: 0.12, amount: pa });
      void cam; void S0;
    }
  };
}
