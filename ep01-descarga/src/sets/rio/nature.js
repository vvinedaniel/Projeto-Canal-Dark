// Vida do rio: peixes articulados, garça, libélulas, plantas aquáticas, juncos (taboa), árvores, pedras.
import * as L from '../../lib.js';
import { K, G, TM, Merge, vmat, blob, taperTube, ribbon } from './util.js';
const { THREE, TAU, V, clamp01, lerp } = L;

const _a = new THREE.Color(), _b = new THREE.Color();
export const grad = (c0, c1, y0, y1) => { const a = new THREE.Color(c0), b = new THREE.Color(c1); return (x, y, z, out) => out.copy(a).lerp(b, clamp01((y - y0) / (y1 - y0))); };

/* ---------- peixe: corpo em 2 segmentos + nadadeira caudal, com ondulação ---------- */
const FST = [[0, 0.006], [0.03, 0.045], [0.09, 0.1], [0.2, 0.155], [0.34, 0.185], [0.48, 0.18], [0.62, 0.15], [0.74, 0.11], [0.86, 0.07], [0.95, 0.048], [1, 0.042]];
const fh = (u) => { for (let i = 0; i < FST.length - 1; i++) if (u <= FST[i + 1][0]) { const k = (u - FST[i][0]) / (FST[i + 1][0] - FST[i][0]); return lerp(FST[i][1], FST[i + 1][1], k * k * (3 - 2 * k)); } return 0.042; };
const fx = (u) => 0.5 - u * 0.9, UJ = 0.6, XJ = fx(UJ), XP = fx(1);
function fishKit(sp) {
  const ring = (u) => { const h = fh(u), w = h * 0.5, x = fx(u), r = []; for (let j = 0; j < 12; j++) { const a = -(j / 12) * TAU; r.push(V(x, Math.cos(a) * h - 0.012 * Math.sin(Math.PI * u), Math.sin(a) * w)); } return r; };
  const bodyCol = (x, y, z, c) => {
    const k = clamp01(y / 0.19 * 0.5 + 0.5);
    c.set(sp.belly).lerp(_a.set(sp.side), clamp01(k * 2.2)).lerp(_b.set(sp.back), clamp01((k - 0.62) * 3.2));
    if (sp.bars && Math.sin(x * 34) > 0.45 && k > 0.35) c.lerp(_b.set(sp.bars), 0.6);
  };
  const body = (us) => L.loft(us.map(ring), null, { closed: true }).geometry;
  const front = new Merge().add(body([0, 0.03, 0.09, 0.2, 0.34, 0.48, 0.6]), bodyCol);
  front.add(G.shape([[0.13, 0.165], [0.04, 0.31], [-0.07, 0.3], [-0.2, 0.2], [-0.22, 0.12], [-0.05, 0.13]]), sp.fin);                    // dorsal
  [1, -1].forEach((s) => {
    front.add(G.shape([[0, 0], [-0.15, 0.04], [-0.17, -0.05], [-0.06, -0.07]]), sp.fin, TM(0.2, -0.07, s * 0.085, s * 0.9, s * -0.35, 0));   // peitorais
    front.add(G.shape([[0, 0], [-0.1, -0.02], [-0.11, -0.1], [-0.03, -0.07]]), sp.fin, TM(0.0, -0.165, s * 0.03, s * 0.5, 0, 0));           // pélvicas
    front.add(G.sph(0.024, 10, 8), '#f7f2df', TM(0.37, 0.035, s * 0.052)).add(G.sph(0.014, 8, 6), '#101418', TM(0.378, 0.035, s * 0.066));
    front.add(G.shape([[0, 0.07], [-0.02, 0], [0, -0.08]]), sp.back, TM(0.27, 0, s * 0.071, 0, s * 0.25, 0));                                 // opérculo
  });
  const rear = new Merge().add(body([0.6, 0.68, 0.76, 0.86, 0.95, 1]), bodyCol, TM(-XJ, 0, 0));
  rear.add(G.shape([[-0.1, -0.11], [-0.15, -0.24], [-0.25, -0.2], [-0.3, -0.07]]), sp.fin, TM(-XJ, 0, 0));                                   // anal
  rear.add(G.shape([[-0.19, 0.09], [-0.23, 0.15], [-0.29, 0.12], [-0.31, 0.055]]), sp.fin, TM(-XJ, 0, 0));                                   // adiposa
  const tail = new Merge().add(G.shape([[0.04, 0.04], [-0.09, 0.13], [-0.25, 0.25], [-0.2, 0.07], [-0.16, 0], [-0.2, -0.07], [-0.25, -0.25], [-0.09, -0.13], [0.04, -0.04]]), sp.tail);
  return { front: front.geo(), rear: rear.geo(), tail: tail.geo() };
}
const SPECIES = [
  { back: '#5a6b52', side: '#d9dcc8', belly: '#f6f3e6', fin: '#f1c232', tail: '#e24a2e' },                 // lambari
  { back: '#b9791a', side: '#f3c33d', belly: '#fbe9a8', fin: '#f08a24', tail: '#f08a24' },                 // dourado
  { back: '#4f6f3a', side: '#c9c95a', belly: '#f1eecb', fin: '#e8892b', tail: '#3f5a36', bars: '#27331f' }  // tucunaré
];
export function makeFish(list) {
  const grp = new THREE.Group(), m = vmat({ roughness: 0.35, metalness: 0.25 }), kits = SPECIES.map(fishKit);
  const fish = list.map((f, i) => {
    const k = kits[f.sp ?? i % 3], g = L.group(grp);
    const front = L.mesh(k.front, m), rp = L.group(g, XJ, 0, 0), rear = L.mesh(k.rear, m), tp = L.group(rp, XP - XJ, 0, 0), tail = L.mesh(k.tail, m);
    g.add(front); rp.add(rear); tp.add(tail);
    return { ...f, g, front, rp, tp };
  });
  function update(t, gone) {
    fish.forEach((f) => {
      const th = f.ph + t * f.w, s = Math.sin(th), c = Math.cos(th), k = gone ? gone(f, t) : 1;
      f.g.position.set(f.cx + f.ax * c - (1 - k) * 2.5, f.cy + 0.07 * Math.sin(th * 2 + f.ph * 3), f.cz + f.az * s);
      const vx = -f.ax * s * Math.sign(f.w) - (1 - k) * (k > 0 ? 8 : 0), vz = f.az * c * Math.sign(f.w);
      f.g.rotation.set(0, Math.atan2(-vz, vx), 0); f.g.rotateZ(0.06 * Math.cos(th * 2 + f.ph * 3));
      f.g.scale.setScalar(f.size * k); f.g.visible = k > 0.01;
      const sw = Math.sin(t * f.beat + f.ph * 7);
      f.front.rotation.y = -0.1 * sw; f.rp.rotation.y = 0.3 * sw; f.tp.rotation.y = 0.5 * Math.sin(t * f.beat + f.ph * 7 - 0.9);
    });
  }
  return { group: grp, update, fish };
}

/* ---------- garça-branca ---------- */
export function makeHeron() {
  const g = new THREE.Group(), white = '#fbfbf5', leg = '#23262a', m = vmat({ roughness: 0.6 });
  const body = new Merge();
  [1, -1].forEach((s) => {
    body.rod([0, 0.66, s * 0.05], [-0.07, 0.36, s * 0.055], 0.014, leg).rod([-0.07, 0.36, s * 0.055], [0.01, 0, s * 0.06], 0.011, leg).add(G.sph(0.02, 8, 6), leg, TM(-0.07, 0.36, s * 0.055));
    [[0.11, 0], [0.08, 0.05], [0.08, -0.05], [-0.06, 0]].forEach((d) => body.rod([0.01, 0.005, s * 0.06], [0.01 + d[0], 0.005, s * 0.06 + d[1]], 0.007, leg, 5));
    body.add(G.sph(1, 14, 10), '#eef0ea', TM(-0.1, 0.78, s * 0.105, 0, 0, 0.3, 0.27, 0.115, 0.035));   // asas recolhidas
  });
  body.add(G.sph(1, 18, 12), white, TM(-0.04, 0.78, 0, 0, 0, 0.36, 0.31, 0.17, 0.14));
  body.add(G.cone(0.09, 0.34, 8), white, TM(-0.36, 0.66, 0, 0, 0, 1.05, 1, 1, 0.45));                 // cauda
  body.add(ribbon([[-0.12, 0.86, 0], [-0.3, 0.74, 0], [-0.46, 0.56, 0]], (u) => 0.16 * (1 - u * 0.8), 5), '#f2f3ee');                // plumas dorsais
  g.add(body.mesh(m));
  const neck = L.group(g, 0.16, 0.86, 0), nk = new Merge();
  nk.add(taperTube([[0, 0, 0], [0.13, 0.12, 0], [0.09, 0.29, 0], [0.02, 0.42, 0], [0.07, 0.52, 0]], (u) => lerp(0.058, 0.027, u), 16, 8), white);
  nk.add(G.sph(1, 12, 8), white, TM(0.1, 0.535, 0, 0, 0, -0.1, 0.075, 0.042, 0.038));
  nk.add(G.cone(0.021, 0.21, 8), '#f4b21e', TM(0.265, 0.522, 0, 0, 0, -Math.PI / 2 - 0.08));
  [1, -1].forEach((s) => nk.add(G.sph(0.009, 6, 5), '#15181b', TM(0.13, 0.548, s * 0.033)));
  neck.add(nk.mesh(m));
  const update = (t) => { neck.rotation.z = 0.05 * Math.sin(t * 1.3) + 0.09 * Math.pow(Math.max(0, Math.sin(t * 0.9 + 1)), 6); neck.rotation.y = 0.25 * Math.sin(t * 0.7 + 0.5); g.rotation.z = 0.012 * Math.sin(t * 1.1); };
  return { group: g, update };
}

/* ---------- libélula ---------- */
export function makeDragonfly(color = '#27b5ff') {
  const g = new THREE.Group(), b = new Merge();
  b.add(G.sph(0.03, 10, 8), '#1c2a30', TM(0.1, 0, 0));
  [1, -1].forEach((s) => b.add(G.sph(0.021, 8, 6), '#3fe0b0', TM(0.112, 0.008, s * 0.022)));
  b.add(G.sph(1, 10, 8), color, TM(0.045, 0, 0, 0, 0, 0, 0.055, 0.034, 0.034));
  b.add(taperTube([[0.01, 0, 0], [-0.15, 0.006, 0], [-0.32, -0.004, 0]], (u) => lerp(0.014, 0.007, u), 10, 6), (x, y, z, c) => c.set(Math.sin(x * 95) > 0.2 ? color : '#12222b'));
  g.add(b.mesh(vmat({ roughness: 0.3, metalness: 0.3 })));
  const wm = L.mat('#eaf8ff', { transparent: true, opacity: 0.5, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false });
  const wgeo = G.shape(Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU; return [0.028 * Math.cos(a) * (1 + 0.3 * Math.sin(a)), 0.135 + 0.135 * Math.sin(a)]; })); wgeo.rotateX(Math.PI / 2);
  const wings = [];
  [[0.065, 1, 0.12], [0.065, -1, 0.12], [0.02, 1, -0.2], [0.02, -1, -0.2]].forEach(([x, s, sweep], i) => {
    const p = L.group(g, x, 0.02, 0); p.rotation.y = s > 0 ? sweep : Math.PI - sweep;
    const w = L.mesh(wgeo, wm, 0, 0, 0, { cast: false }); w.renderOrder = 14; p.add(w); wings.push({ p, s, i });
  });
  const update = (t, ph = 0) => wings.forEach((w) => { w.p.rotation.x = (0.15 + 0.55 * Math.sin(t * 57 + ph + (w.i > 1 ? 1.4 : 0))) * (w.s > 0 ? 1 : -1) * -1; });
  return { group: g, update };
}

/* ---------- plantas ---------- */
export function waterPlantGeo(seed = 1, n = 7, h = 1) {
  const rd = L.rng(seed), m = new Merge(), col = grad('#235f3c', '#74cf6a', 0, h * 1.05);
  for (let i = 0; i < n; i++) {
    const hh = h * (0.6 + rd() * 0.5), lean = 0.12 + rd() * 0.3, a = rd() * TAU;
    m.add(ribbon([[0, 0, 0], [lean * 0.15, hh * 0.38, 0], [lean * 0.5, hh * 0.75, 0], [lean, hh, 0]], (u) => 0.1 * (1 - u * 0.85) * (0.4 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 2 + 0.25))), 7, [0, 0, 1], 0.25), col, TM((rd() - 0.5) * 0.14, 0, (rd() - 0.5) * 0.14, 0, a, 0));
  }
  return m.geo();
}
export function reedGeo(seed = 1) {
  const rd = L.rng(seed), m = new Merge(), stem = grad('#4c8a35', '#86b84a', 0, 1.3), leaf = grad('#3f8a3a', '#9fd05a', 0, 1.2);
  for (let i = 0; i < 7; i++) {
    const x = (rd() - 0.5) * 0.3, z = (rd() - 0.5) * 0.3, h = 0.95 + rd() * 0.5, lx = (rd() - 0.5) * 0.22, lz = (rd() - 0.5) * 0.22;
    m.add(taperTube([[x, 0, z], [x + lx * 0.4, h * 0.5, z + lz * 0.4], [x + lx, h, z + lz]], (u) => lerp(0.016, 0.008, u), 4, 5), stem);
    if (i < 4) { // espiga marrom da taboa
      const hy = h * 0.8;
      m.add(G.lathe([[0, 0], [0.03, 0.02], [0.034, 0.1], [0.03, 0.2], [0, 0.22]], 8), '#5b3820', TM(x + lx * 0.8, hy, z + lz * 0.8, lz * 0.4, 0, -lx * 0.4));
    }
  }
  for (let i = 0; i < 7; i++) {
    const a = rd() * TAU, h = 0.8 + rd() * 0.5, out = 0.25 + rd() * 0.3;
    m.add(ribbon([[0, 0, 0], [out * 0.15, h * 0.5, 0], [out * 0.55, h * 0.92, 0], [out, h * 0.98, 0]], (u) => 0.055 * (1 - u * 0.9), 6, [0, 0, 1], 0.3), leaf, TM((rd() - 0.5) * 0.2, 0, (rd() - 0.5) * 0.2, 0, a, 0));
  }
  return m.geo();
}
export function tuftGeo(seed = 1, c0 = '#4c9a3a', c1 = '#9bd35c') {
  const rd = L.rng(seed), m = new Merge(), col = grad(c0, c1, 0, 0.3);
  for (let i = 0; i < 6; i++) { const a = rd() * TAU, h = 0.16 + rd() * 0.2, o = 0.05 + rd() * 0.12; m.add(ribbon([[0, 0, 0], [o * 0.3, h * 0.6, 0], [o, h, 0]], (u) => 0.05 * (1 - u * 0.9), 3), col, TM(0, 0, 0, 0, a, 0)); }
  return m.geo();
}
export function lilyGeo(flower) {
  const m = new Merge(), pad = [[0, 0]]; for (let i = 0; i <= 20; i++) { const a = 0.22 + (i / 20) * (TAU - 0.44); pad.push([Math.cos(a) * (1 + 0.04 * Math.sin(a * 7)), Math.sin(a) * (1 + 0.04 * Math.sin(a * 7))]); }
  m.add(G.extrude(pad, 0.03), (x, y, z, c) => c.set('#3c9a46').lerp(_a.set('#8fd45e'), clamp01(Math.hypot(x, y) * 0.5 + (z > 0.02 ? 0.25 : 0))), TM(0, 0, 0, -Math.PI / 2, 0, 0));
  if (flower) {
    for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) m.add(G.sph(1, 8, 6), r ? '#ffe9f3' : '#ff9cc4', TM(0, 0.07 + r * 0.05, 0, 0, (i / 8) * TAU + r * 0.4, 0.75 + r * 0.4).multiply(TM(0.2 - r * 0.07, 0, 0, 0, 0, 0, 0.17, 0.035, 0.07)));
    m.add(G.sph(0.07, 8, 6), '#ffd23f', TM(0, 0.13, 0));
  }
  return m.geo();
}

/* ---------- árvores ---------- */
export function treeGeo(kind = 0, seed = 1) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#553a28', '#7b573b', 0, 2);
  if (kind === 2) { // palmeira
    const top = [0.42, 3.0, 0.05];
    m.add(taperTube([[0, 0, 0], [0.1, 1, 0.02], [0.3, 2.1, 0.04], top], (u) => lerp(0.115, 0.07, u) * (1 + 0.07 * Math.sin(u * 60)), 22, 8), grad('#6f5c45', '#a08a68', 0, 3));
    const fc = (x, y, z, c) => c.set('#2f8a3c').lerp(_a.set('#86cc4f'), clamp01(Math.hypot(x, z) / 1.5));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + rd() * 0.3, dr = 0.5 + rd() * 0.9, len = 1.25 + rd() * 0.35;
      m.add(ribbon([[0, 0, 0], [len * 0.33, 0.34, 0], [len * 0.7, 0.3 - dr * 0.25, 0], [len, -dr * 0.75, 0]], (u) => 0.42 * Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)) + 0.02, 8, [0, 0, 1], -0.55), fc, TM(top[0], top[1], top[2], 0, a, 0));
    }
    for (let i = 0; i < 4; i++) m.add(G.sph(0.085, 8, 6), '#6a4f2a', TM(top[0] + Math.cos(i * 1.7) * 0.11, top[1] - 0.1, top[2] + Math.sin(i * 1.7) * 0.11));
    return m.geo();
  }
  const yellow = kind === 1, H = yellow ? 1.7 : 2.0;
  m.add(taperTube([[0, 0, 0], [0.06, H * 0.35, 0.03], [-0.05, H * 0.7, -0.02], [0.02, H, 0]], (u) => lerp(yellow ? 0.13 : 0.18, 0.08, u) * (1 + 0.5 * Math.pow(1 - u, 6)), 10, 8), bark);
  [[0.55, 0.5, 1], [-0.5, 0.35, -0.6], [0.1, 0.45, -1]].forEach(([bx, by, bz], i) => m.add(taperTube([[0, H * 0.72, 0], [bx * 0.5, H * 0.72 + by * 0.6, bz * 0.3], [bx, H + by, bz * 0.6]], (u) => lerp(0.07, 0.03, u), 6, 6), bark));
  const cc = yellow ? grad('#d99a14', '#ffe14d', H, H + 1.6) : grad(seed % 2 ? '#2f7d38' : '#3b8a35', seed % 2 ? '#7fcf55' : '#93d457', H - 0.2, H + 1.7);
  const blobs = yellow ? [[0, 0.75, 0, 0.8], [0.6, 0.5, 0.2, 0.6], [-0.55, 0.55, -0.2, 0.62], [0.1, 0.5, -0.6, 0.55], [-0.1, 0.45, 0.6, 0.55]] : [[0, 0.95, 0, 1.0], [0.75, 0.55, 0.25, 0.72], [-0.7, 0.6, -0.15, 0.75], [0.15, 0.55, -0.75, 0.68], [-0.15, 0.5, 0.75, 0.7], [0.3, 1.35, -0.1, 0.6]];
  blobs.forEach(([x, y, z, r], i) => m.add(blob(r, 2, 0.22, seed * 3 + i, 0.82), cc, TM(x, H + y, z, 0, rd() * 6, 0)));
  return m.geo();
}
export const bushGeo = (seed = 1, c0 = '#2f7d38', c1 = '#8fd45a') => new Merge().add(blob(0.4, 2, 0.25, seed, 0.75), grad(c0, c1, -0.1, 0.35), TM(0, 0.22, 0)).add(blob(0.28, 1, 0.25, seed + 3, 0.8), grad(c0, c1, -0.1, 0.3), TM(0.3, 0.16, 0.12)).geo();
export const rockGeo = (seed = 1) => blob(1, 1, 0.3, seed, 0.72);
