// Kit de modelagem das soluções verdes: mescla com cor por vértice, formas orgânicas (copiadas e adaptadas do
// ep01 rio/util.js e rio/nature.js), texturas das camadas em corte e utilidades de instâncias/raio-x.
import * as L from '../../../lib.js';
const { THREE, BGU, TAU, clamp01, lerp } = L;

export const TM = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: (w, h, d, r = 0.03, s = 2) => new L.RoundedBoxGeometry(w, h, d, s, r),
  cyl: (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sph: (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs),
  cone: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg),
  torus: (R, r, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  shape: (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))), 6),
  extrude: (pts, depth, holes = []) => {
    const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    holes.forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
  }
};

const _col = new THREE.Color();
/** Junta várias geometrias numa só, com cor por vértice (cor fixa ou fn(x,y,z,out)). */
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
  beam(a, b, th, w, color) {
    const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
    return this.add(new THREE.BoxGeometry(len, th, w ?? th), color, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }
  rod(a, b, r, color, seg = 8) {
    const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    return this.add(new THREE.CylinderGeometry(r, r, len, seg), color, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  }
  geo() { return BGU.mergeGeometries(this.list, false); }
  mesh(material) { return L.mesh(this.geo(), material ?? vmat()); }
}
export const vmat = (o = {}) => L.mat(0xffffff, { vertexColors: true, ...o });
export const grad = (c0, c1, y0, y1) => { const a = new THREE.Color(c0), b = new THREE.Color(c1); return (x, y, z, out) => out.copy(a).lerp(b, clamp01((y - y0) / (y1 - y0))); };

/** bolha orgânica (copa, arbusto, pedra) */
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
export function taperTube(pts, rFn, seg = 14, radial = 8) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, fr = c.computeFrenetFrames(seg, false), rings = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), r = typeof rFn === 'function' ? rFn(u) : rFn, ring = [];
    for (let j = 0; j < radial; j++) { const a = -(j / radial) * TAU; ring.push(p.clone().addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r)); }
    rings.push(ring);
  }
  return L.loft(rings, null, { closed: true }).geometry;
}
export function ribbon(pts, wFn, seg = 8, side = [0, 0, 1], fold = 0) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, s = L.v3(side).clone().normalize(), rings = [], up = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), w = wFn(u) / 2, t = c.getTangentAt(u);
    up.crossVectors(s, t).normalize();
    rings.push(fold ? [p.clone().addScaledVector(s, -w).addScaledVector(up, fold * w), p.clone(), p.clone().addScaledVector(s, w).addScaledVector(up, fold * w)] : [p.clone().addScaledVector(s, -w), p.clone().addScaledVector(s, w)]);
  }
  return L.loft(rings, null).geometry;
}

/* ---------- plantas ---------- */
/** touceira de capim (capim-do-texas / capim-chorão): lâminas finas arqueadas */
export function grassGeo(seed = 1, h = 0.55, c0 = '#3d7f34', c1 = '#b9d66a', n = 11) {
  const rd = L.rng(seed), m = new Merge(), col = grad(c0, c1, 0, h);
  for (let i = 0; i < n; i++) {
    const a = rd() * TAU, hh = h * (0.65 + rd() * 0.45), o = 0.12 + rd() * 0.25;
    m.add(ribbon([[0, 0, 0], [o * 0.25, hh * 0.55, 0], [o * 0.7, hh * 0.95, 0], [o, hh * 0.8, 0]], (u) => 0.045 * (1 - u * 0.85), 5, [0, 0, 1], 0.2), col, TM((rd() - 0.5) * 0.08, 0, (rd() - 0.5) * 0.08, 0, a, 0));
  }
  if (seed % 2) for (let i = 0; i < 4; i++) { const a = rd() * TAU, hh = h * (1.05 + rd() * 0.3), o = 0.08 + rd() * 0.12; // espigas
    m.add(taperTube([[0, 0, 0], [o * 0.4, hh * 0.6, 0], [o, hh, 0]], 0.006, 4, 4), '#9fb45a', TM(0, 0, 0, 0, a, 0));
    m.add(G.sph(1, 5, 4), '#e6d9a2', TM(Math.cos(a) * o, hh, -Math.sin(a) * o, 0, 0, 0, 0.022, 0.07, 0.022)); }
  return m.geo();
}
/** arbusto florido (lantana, hibisco-anão, agapanto): copa + flores */
export function shrubGeo(seed = 1, flower = '#ff6fa8', r = 0.42) {
  const rd = L.rng(seed), m = new Merge(), leaf = grad('#2f6f2f', '#79c24f', -0.1, r * 1.8);
  m.add(blob(r, 1, 0.25, seed, 0.8), leaf, TM(0, r * 0.75, 0));
  m.add(blob(r * 0.7, 1, 0.25, seed + 2, 0.8), leaf, TM(r * 0.6, r * 0.55, r * 0.25));
  m.add(blob(r * 0.65, 1, 0.25, seed + 5, 0.8), leaf, TM(-r * 0.55, r * 0.5, -r * 0.2));
  const fc = new THREE.Color(flower);
  for (let i = 0; i < 16; i++) {
    const a = rd() * TAU, e = 0.15 + rd() * 0.9, R = r * (0.9 + rd() * 0.25);
    const x = Math.cos(a) * Math.cos(e) * R, z = Math.sin(a) * Math.cos(e) * R, y = r * 0.75 + Math.sin(e) * R * 0.85;
    m.add(G.sph(0.07, 6, 4), (px, py, pz, out) => out.copy(fc).offsetHSL(0, 0, (rd() - 0.5) * 0.1), TM(x, y, z, 0, 0, 0, 1, 0.6, 1));
    m.add(G.sph(0.025, 4, 3), '#ffe14d', TM(x * 1.04, y + 0.03, z * 1.04));
  }
  return m.geo();
}
/** árvore nativa: kind 0 = copa verde (pau-brasil/aroeira), 1 = ipê-amarelo, 2 = ipê-rosa */
export function treeGeo(kind = 0, seed = 1) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#553a28', '#7b573b', 0, 2), H = kind ? 1.8 : 2.0;
  m.add(taperTube([[0, 0, 0], [0.06, H * 0.35, 0.03], [-0.05, H * 0.7, -0.02], [0.02, H, 0]], (u) => lerp(0.16, 0.075, u) * (1 + 0.5 * Math.pow(1 - u, 6)), 8, 7), bark);
  [[0.55, 0.5, 1], [-0.5, 0.35, -0.6], [0.1, 0.45, -1]].forEach(([bx, by, bz]) => m.add(taperTube([[0, H * 0.72, 0], [bx * 0.5, H * 0.72 + by * 0.6, bz * 0.3], [bx, H + by, bz * 0.6]], (u) => lerp(0.065, 0.03, u), 5, 5), bark));
  const cc = kind === 1 ? grad('#d99a14', '#ffe14d', H, H + 1.6) : kind === 2 ? grad('#c4457e', '#ff9fcb', H, H + 1.6) : grad(seed % 2 ? '#2f7d38' : '#3b8a35', seed % 2 ? '#7fcf55' : '#93d457', H - 0.2, H + 1.7);
  const blobs = kind ? [[0, 0.75, 0, 0.8], [0.6, 0.5, 0.2, 0.6], [-0.55, 0.55, -0.2, 0.62], [0.1, 0.5, -0.6, 0.55], [-0.1, 0.45, 0.6, 0.55]] : [[0, 0.95, 0, 1.0], [0.75, 0.55, 0.25, 0.72], [-0.7, 0.6, -0.15, 0.75], [0.15, 0.55, -0.75, 0.68], [-0.15, 0.5, 0.75, 0.7]];
  blobs.forEach(([x, y, z, r], i) => m.add(blob(r, 1, 0.22, seed * 3 + i, 0.82), cc, TM(x, H + y, z, 0, rd() * 6, 0)));
  return m.geo();
}
/** muda: tutor de madeira + amarrilho (vai junto com a árvore jovem) */
export function stakeGeo() {
  const m = new Merge();
  m.rod([0.16, 0, 0], [0.16, 1.5, 0], 0.03, '#c9a06a', 6).rod([-0.16, 0, 0], [-0.16, 1.5, 0], 0.03, '#c9a06a', 6);
  m.beam([-0.18, 1.2, 0], [0.18, 1.2, 0], 0.04, 0.05, '#a8744e').beam([-0.18, 0.7, 0], [0.18, 0.7, 0], 0.04, 0.05, '#a8744e');
  return m.geo();
}

/* ---------- instâncias controladas por quadro ---------- */
const _d = new THREE.Object3D();
/** InstancedMesh com lista de "itens" {x,y,z,ry,s,...}; set(i, x,y,z, ry, sx, sy?, sz?) a cada quadro */
export function instances(geo, material, n, o = {}) {
  const im = new THREE.InstancedMesh(geo, material, Math.max(1, n));
  im.castShadow = o.cast !== false; im.receiveShadow = o.receive !== false; im.frustumCulled = false; im.count = n;
  im.set = (i, x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) => {
    _d.position.set(x, y, z); _d.rotation.set(rx, ry, rz); _d.scale.set(sx || 1e-5, sy || 1e-5, sz || 1e-5); _d.updateMatrix(); im.setMatrixAt(i, _d.matrix);
  };
  im.done = () => { im.instanceMatrix.needsUpdate = true; };
  return im;
}

/* ---------- texturas das camadas (canvas, 1 ladrilho = 1 m) ---------- */
const TEX = {};
export function layerTex(kind) {
  if (TEX[kind]) return TEX[kind];
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), rd = L.rng({ gravel: 3, brita: 5, sand: 7, soil: 11, mulch: 13, liner: 17, lawn: 19, path: 23 }[kind] || 1);
  const bg = { gravel: '#8b8f93', brita: '#a3a59f', sand: '#d9c08a', soil: '#4a3424', mulch: '#7a4a2a', liner: '#3f4a52', lawn: '#5daa3e', path: '#cbb894' }[kind];
  g.fillStyle = bg; g.fillRect(0, 0, N, N);
  const ell = (x, y, rx, ry, a, c) => { g.fillStyle = c; for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, a, 0, TAU); g.fill(); } };
  if (kind === 'gravel' || kind === 'brita') { // pedras arredondadas com luz em cima e sombra embaixo
    const n = kind === 'gravel' ? 260 : 700, s0 = kind === 'gravel' ? 8 : 4.5;
    g.fillStyle = kind === 'gravel' ? '#4a4d51' : '#6d6e69'; g.fillRect(0, 0, N, N);
    for (let i = 0; i < n; i++) { const x = rd() * N, y = rd() * N, r = s0 * (0.6 + rd() * 0.8), a = rd() * 3, v = (kind === 'gravel' ? 92 : 110) + rd() * 60;
      ell(x, y + r * 0.18, r * 1.05, r * 0.8, a, 'rgba(20,20,22,.55)'); ell(x, y, r, r * 0.75, a, `rgb(${v},${v + 2},${v + 4})`); ell(x - r * 0.25, y - r * 0.25, r * 0.45, r * 0.3, a, 'rgba(255,255,255,.16)'); }
  } else if (kind === 'sand') {
    for (let i = 0; i < 2600; i++) { const v = rd(); ell(rd() * N, rd() * N, 0.8 + rd() * 1.2, 0.8 + rd(), 0, v < 0.5 ? 'rgba(255,245,215,.5)' : v < 0.85 ? 'rgba(150,115,60,.45)' : 'rgba(80,70,60,.5)'); }
  } else if (kind === 'soil') {
    for (let i = 0; i < 1600; i++) { const v = rd(); ell(rd() * N, rd() * N, 1 + rd() * 2.5, 0.8 + rd() * 1.5, rd() * 3, v < 0.45 ? 'rgba(110,80,50,.45)' : v < 0.9 ? 'rgba(20,12,6,.5)' : 'rgba(190,160,110,.55)'); }
    g.strokeStyle = 'rgba(200,170,120,.35)'; g.lineWidth = 1; for (let i = 0; i < 26; i++) { g.beginPath(); let x = rd() * N, y = rd() * N; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (rd() - 0.5) * 18; y += rd() * 12; g.lineTo(x, y); } g.stroke(); }
  } else if (kind === 'mulch') { // lascas de casca de pinus
    for (let i = 0; i < 520; i++) { const v = 0.7 + rd() * 0.6; ell(rd() * N, rd() * N, 4 + rd() * 7, 1.5 + rd() * 2, rd() * 3, `rgb(${Math.round(150 * v)},${Math.round(88 * v)},${Math.round(48 * v)})`); }
    for (let i = 0; i < 200; i++) ell(rd() * N, rd() * N, 3 + rd() * 4, 1 + rd(), rd() * 3, 'rgba(40,20,10,.5)');
  } else if (kind === 'liner') { // manta geotêxtil
    g.strokeStyle = 'rgba(255,255,255,.08)'; for (let i = 0; i < 400; i++) { g.beginPath(); const x = rd() * N, y = rd() * N; g.moveTo(x, y); g.lineTo(x + (rd() - 0.5) * 14, y + (rd() - 0.5) * 14); g.stroke(); }
  } else if (kind === 'lawn') {
    for (let i = 0; i < 3000; i++) { const v = rd(); ell(rd() * N, rd() * N, 0.7, 2 + rd() * 2, (rd() - 0.5) * 0.6, v < 0.5 ? 'rgba(150,215,90,.5)' : 'rgba(40,100,35,.5)'); }
  } else if (kind === 'path') { // saibro / pedrisco compactado
    for (let i = 0; i < 1800; i++) { const v = rd(); ell(rd() * N, rd() * N, 1 + rd() * 1.6, 1 + rd(), 0, v < 0.5 ? 'rgba(255,240,210,.45)' : 'rgba(120,95,60,.4)'); }
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 4;
  TEX[kind] = tex; return tex;
}
/** material de camada (textura em metros: UV do ExtrudeGeometry já vem em coordenadas da forma) */
export const layerMat = (kind, o = {}) => L.mat(0xffffff, { map: layerTex(kind), roughness: 0.95, ...o });

/* ---------- raio-x: lista de materiais de piso que ficam translúcidos ---------- */
export function xrayList() {
  const list = [];
  return {
    add(...ms) { ms.forEach((m) => { m.userData.op0 = m.opacity; list.push(m); }); return ms[0]; },
    apply(x) {
      const on = x > 0.01;
      for (const m of list) { m.opacity = m.userData.op0 * (1 - 0.75 * x); m.transparent = on || m.userData.op0 < 1; m.depthWrite = !on; }
    }
  };
}
export const ss = L.sstep;
/** sub-fase: progresso 0..1 de p dentro de [a,b] */
export const sub = (p, a, b) => clamp01((p - a) / (b - a));
