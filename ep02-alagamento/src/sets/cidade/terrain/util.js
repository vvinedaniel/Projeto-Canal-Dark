// Utilitários de modelagem do terreno (adaptados do Ep. 01, rio/util.js e rio/nature.js):
// mescla de geometrias com cor por vértice, formas orgânicas (copas, pedras), fitas (folhas, capim), troncos.
import * as L from '../../../lib.js';
const { THREE, BGU, TAU, clamp01, lerp } = L;

export const TM = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

const _col = new THREE.Color(), _a = new THREE.Color(), _b = new THREE.Color();
/** Junta várias geometrias numa só, com cor por vértice (cor fixa ou fn(x,y,z,out) em coordenadas locais). */
export class Merge {
  constructor() { this.list = []; }
  add(geo, color = '#ffffff', m = null) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
    if (typeof color === 'function') for (let i = 0; i < n; i++) { color(p.getX(i), p.getY(i), p.getZ(i), _col); c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
    else { _col.set(color); for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; } }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    if (m) g.applyMatrix4(m);
    this.list.push(g); return this;
  }
  geo() { return BGU.mergeGeometries(this.list, false); }
}
export const vmat = (o = {}) => L.mat(0xffffff, { vertexColors: true, ...o });
export const grad = (c0, c1, y0, y1) => { const a = new THREE.Color(c0), b = new THREE.Color(c1); return (x, y, z, out) => out.copy(a).lerp(b, clamp01((y - y0) / (y1 - y0))); };

/** bolha orgânica (copa, pedra, arbusto): icosaedro deformado por ruído suave */
export function blob(r = 1, detail = 2, amp = 0.2, seed = 1, sy = 1) {
  let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = BGU.mergeVertices(g, 1e-4);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = 1 + amp * (Math.sin(x * 2.9 + seed * 1.7) * Math.cos(y * 2.3 + seed) + Math.sin(z * 3.3 - seed * 2.1 + y * 1.7) + 0.6 * Math.sin((x + z) * 5.1 + seed * 3)) / 2.2;
    p.setXYZ(i, x * r * f, y * r * f * sy, z * r * f);
  }
  g.computeVertexNormals(); return g;
}
/** tubo de raio variável ao longo de uma curva (tronco, galho, caule) */
export function taperTube(pts, rFn, seg = 14, radial = 8) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, fr = c.computeFrenetFrames(seg, false), rings = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), r = typeof rFn === 'function' ? rFn(u) : rFn, ring = [];
    for (let j = 0; j < radial; j++) { const a = -(j / radial) * TAU; ring.push(p.clone().addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r)); }
    rings.push(ring);
  }
  return L.loft(rings, null, { closed: true }).geometry;
}
/** fita (folha, lâmina de capim): pts da nervura, largura w(u), normal lateral fixa */
export function ribbon(pts, wFn, seg = 8, side = [0, 0, 1], fold = 0) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, s = L.v3(side).clone().normalize(), rings = [], up = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), w = wFn(u) / 2, t = c.getTangentAt(u);
    up.crossVectors(s, t).normalize();
    rings.push(fold ? [p.clone().addScaledVector(s, -w).addScaledVector(up, fold * w), p.clone(), p.clone().addScaledVector(s, w).addScaledVector(up, fold * w)] : [p.clone().addScaledVector(s, -w), p.clone().addScaledVector(s, w)]);
  }
  return L.loft(rings, null).geometry;
}

/* ---------- vegetação (do Ep. 01, com nível de detalhe ajustável) ---------- */
/** árvore de copa redonda. kind 0 = verde, 1 = ipê amarelo; detail = subdivisão das copas (1 = leve, 2 = close) */
export function treeGeo(kind = 0, seed = 1, detail = 1) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#553a28', '#7b573b', 0, 2);
  const yellow = kind === 1, H = yellow ? 1.7 : 2.0;
  m.add(taperTube([[0, -0.15, 0], [0.06, H * 0.35, 0.03], [-0.05, H * 0.7, -0.02], [0.02, H, 0]], (u) => lerp(yellow ? 0.13 : 0.18, 0.08, u) * (1 + 0.5 * Math.pow(1 - u, 6)), 8, 7), bark);
  [[0.55, 0.5, 1], [-0.5, 0.35, -0.6], [0.1, 0.45, -1]].forEach(([bx, by, bz]) => m.add(taperTube([[0, H * 0.72, 0], [bx * 0.5, H * 0.72 + by * 0.6, bz * 0.3], [bx, H + by, bz * 0.6]], (u) => lerp(0.07, 0.03, u), 5, 5), bark));
  const pal = [['#2f7d38', '#7fcf55'], ['#3b8a35', '#93d457'], ['#2a6e3a', '#6dbb4e'], ['#43873a', '#a5d860']][seed % 4];
  const cc = yellow ? grad('#d99a14', '#ffe14d', H, H + 1.6) : grad(pal[0], pal[1], H - 0.2, H + 1.7);
  const blobs = yellow ? [[0, 0.75, 0, 0.8], [0.6, 0.5, 0.2, 0.6], [-0.55, 0.55, -0.2, 0.62], [0.1, 0.5, -0.6, 0.55], [-0.1, 0.45, 0.6, 0.55]]
    : [[0, 0.95, 0, 1.0], [0.75, 0.55, 0.25, 0.72], [-0.7, 0.6, -0.15, 0.75], [0.15, 0.55, -0.75, 0.68], [-0.15, 0.5, 0.75, 0.7], [0.3, 1.35, -0.1, 0.6]];
  blobs.forEach(([x, y, z, r], i) => m.add(blob(r, detail, 0.22, seed * 3 + i, 0.82), cc, TM(x, H + y, z, 0, rd() * 6, 0)));
  return m.geo();
}
/** árvore alta e estreita de mata (copa em camadas), para variar a silhueta da floresta */
export function tallTreeGeo(seed = 1, detail = 1) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#4d3526', '#7a5a40', 0, 3);
  const H = 2.9 + rd() * 0.6;
  m.add(taperTube([[0, -0.15, 0], [0.05, H * 0.5, 0.02], [-0.03, H, 0]], (u) => lerp(0.16, 0.07, u) * (1 + 0.6 * Math.pow(1 - u, 8)), 8, 7), bark);
  const cc = grad('#245f32', '#6cb94c', H - 0.6, H + 1.5);
  [[0, 0.2, 0, 0.95], [0.45, -0.25, 0.2, 0.7], [-0.4, -0.2, -0.25, 0.72], [0.05, 0.85, 0.05, 0.62], [-0.2, -0.45, 0.45, 0.55]].forEach(([x, y, z, r], i) =>
    m.add(blob(r, detail, 0.25, seed * 7 + i, 0.78), cc, TM(x, H + y, z, 0, rd() * 6, 0)));
  return m.geo();
}
export const bushGeo = (seed = 1, c0 = '#2f7d38', c1 = '#8fd45a', detail = 1) => new Merge().add(blob(0.4, detail, 0.25, seed, 0.75), grad(c0, c1, -0.1, 0.35), TM(0, 0.22, 0)).add(blob(0.28, 1, 0.25, seed + 3, 0.8), grad(c0, c1, -0.1, 0.3), TM(0.3, 0.16, 0.12)).geo();
export function tuftGeo(seed = 1, c0 = '#4c9a3a', c1 = '#9bd35c', n = 6) {
  const rd = L.rng(seed), m = new Merge(), col = grad(c0, c1, 0, 0.3);
  for (let i = 0; i < n; i++) { const a = rd() * TAU, h = 0.16 + rd() * 0.2, o = 0.05 + rd() * 0.12; m.add(ribbon([[0, 0, 0], [o * 0.3, h * 0.6, 0], [o, h, 0]], (u) => 0.05 * (1 - u * 0.9), 3), col, TM(0, 0, 0, 0, a, 0)); }
  return m.geo();
}
export function reedGeo(seed = 1) {
  const rd = L.rng(seed), m = new Merge(), stem = grad('#4c8a35', '#86b84a', 0, 1.3), leaf = grad('#3f8a3a', '#9fd05a', 0, 1.2);
  for (let i = 0; i < 7; i++) {
    const x = (rd() - 0.5) * 0.3, z = (rd() - 0.5) * 0.3, h = 0.95 + rd() * 0.5, lx = (rd() - 0.5) * 0.22, lz = (rd() - 0.5) * 0.22;
    m.add(taperTube([[x, 0, z], [x + lx * 0.4, h * 0.5, z + lz * 0.4], [x + lx, h, z + lz]], (u) => lerp(0.016, 0.008, u), 4, 5), stem);
    if (i < 4) m.add(new THREE.LatheGeometry([[0, 0], [0.03, 0.02], [0.034, 0.1], [0.03, 0.2], [0, 0.22]].map((p) => new THREE.Vector2(p[0], p[1])), 8), '#5b3820', TM(x + lx * 0.8, h * 0.8, z + lz * 0.8, lz * 0.4, 0, -lx * 0.4));
  }
  for (let i = 0; i < 7; i++) {
    const a = rd() * TAU, h = 0.8 + rd() * 0.5, out = 0.25 + rd() * 0.3;
    m.add(ribbon([[0, 0, 0], [out * 0.15, h * 0.5, 0], [out * 0.55, h * 0.92, 0], [out, h * 0.98, 0]], (u) => 0.055 * (1 - u * 0.9), 6, [0, 0, 1], 0.3), leaf, TM((rd() - 0.5) * 0.2, 0, (rd() - 0.5) * 0.2, 0, a, 0));
  }
  return m.geo();
}
export const rockGeo = (seed = 1, detail = 1) => blob(1, detail, 0.3, seed, 0.72);
export { _a, _b };
