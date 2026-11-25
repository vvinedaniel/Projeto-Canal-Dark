// Utilitários de modelagem do cenário "rio": mescla de geometrias com cor por vértice, formas orgânicas, bolhas.
import * as L from '../../lib.js';
const { THREE, BGU } = L;

// constantes de layout (metros)
export const K = { XA: -2.6, XB: 2.6, YW: -1.0, BED: -2.5, X0: -12, X1: 12, Z0: -22.5, Z1: 6, YB: -6.2 };

export const TM = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

export const G = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  rbox: (w, h, d, r = 0.03) => new L.RoundedBoxGeometry(w, h, d, 2, r),
  cyl: (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sph: (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs),
  cone: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg),
  torus: (R, r, rs = 8, ts = 28, arc = L.TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc),
  lathe: (profile, seg = 24, a0 = 0, a1 = L.TAU) => new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg, a0, a1),
  shape: (pts) => new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))), 6),
  extrude: (pts, depth, bevel = 0, holes = []) => {
    const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    holes.forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
    return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 10 });
  }
};
export const circlePts = (r, n = 24, cx = 0, cy = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * L.TAU) * r, cy + Math.sin((i / n) * L.TAU) * r]);

/** Junta várias geometrias numa malha só, com cor por vértice (cor fixa ou fn(x,y,z,outColor) em coordenadas locais). */
const _col = new THREE.Color();
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
  /** caixa orientada entre dois pontos */
  beam(a, b, th, w, color) {
    const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
    const m = new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(len, th, w ?? th), color, m);
  }
  /** cano redondo entre dois pontos */
  rod(a, b, r, color, seg = 8) {
    const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    const m = new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.CylinderGeometry(r, r, len, seg), color, m);
  }
  /** guarda-corpo: montantes + 2 travessas entre a e b (pontos no nível do piso) */
  rail(a, b, h = 0.3, color = '#f6c12c', r = 0.014) {
    const va = L.v3(a), vb = L.v3(b), len = va.distanceTo(vb), n = Math.max(1, Math.round(len / 0.45));
    for (let i = 0; i <= n; i++) { const p = va.clone().lerp(vb, i / n); this.rod(p, [p.x, p.y + h, p.z], r, color, 6); }
    this.rod([va.x, va.y + h, va.z], [vb.x, vb.y + h, vb.z], r, color, 6);
    this.rod([va.x, va.y + h * 0.5, va.z], [vb.x, vb.y + h * 0.5, vb.z], r * 0.8, color, 6);
    return this;
  }
  geo() { return BGU.mergeGeometries(this.list, false); }
  mesh(material) { return L.mesh(this.geo(), material ?? vmat()); }
}
export const vmat = (o = {}) => L.mat(0xffffff, { vertexColors: true, side: THREE.DoubleSide, ...o });

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

/** tubo de raio variável ao longo de uma curva (pescoço, tronco, caule) */
export function taperTube(pts, rFn, seg = 14, radial = 8) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, fr = c.computeFrenetFrames(seg, false), rings = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), r = typeof rFn === 'function' ? rFn(u) : rFn, ring = [];
    for (let j = 0; j < radial; j++) { const a = -(j / radial) * L.TAU; ring.push(p.clone().addScaledVector(fr.normals[i], Math.cos(a) * r).addScaledVector(fr.binormals[i], Math.sin(a) * r)); }
    rings.push(ring);
  }
  return L.loft(rings, null, { closed: true }).geometry;
}

/** fita (folha, lâmina de planta): pts da nervura, largura w(u), normal lateral fixa */
export function ribbon(pts, wFn, seg = 8, side = [0, 0, 1], fold = 0) {
  const c = Array.isArray(pts) ? L.curve(pts) : pts, s = L.v3(side).clone().normalize(), rings = [], up = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = c.getPointAt(u), w = wFn(u) / 2, t = c.getTangentAt(u);
    up.crossVectors(s, t).normalize();
    rings.push(fold ? [p.clone().addScaledVector(s, -w).addScaledVector(up, fold * w), p.clone(), p.clone().addScaledVector(s, w).addScaledVector(up, fold * w)] : [p.clone().addScaledVector(s, -w), p.clone().addScaledVector(s, w)]);
  }
  return L.loft(rings, null).geometry;
}

/** partículas que nascem, sobem/derivam e somem em ciclo (espuma, bolhas, respingos). Função pura de t. */
const _d = new THREE.Object3D();
export class Bubbles {
  constructor(n, o = {}) {
    const rd = L.rng(o.seed ?? 21); this.n = n; this.o = o;
    this.mesh = new THREE.InstancedMesh(o.geo ?? new THREE.SphereGeometry(1, 6, 4), o.material ?? L.mat(o.color ?? '#ffffff', { roughness: 0.4 }), n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.p = [];
    for (let i = 0; i < n; i++) this.p.push({ a: rd(), b: rd(), c: rd(), ph: rd(), rate: (o.rate ?? 1) * (0.7 + rd() * 0.6), s: (o.size ?? 0.04) * (0.5 + rd()) });
  }
  /** place(q, u, dummy): posiciona a partícula q (a,b,c aleatórios 0..1) na fase u (0..1) */
  update(t, amount = 1) {
    const place = this.o.place;
    for (let i = 0; i < this.n; i++) {
      const q = this.p[i], u = L.fract(q.ph + t * q.rate);
      _d.rotation.set(0, 0, 0); _d.scale.setScalar(1);
      place(q, u, _d, t);
      _d.scale.multiplyScalar(amount > 0 ? q.s * Math.sin(Math.PI * Math.min(1, u * 1.15)) * amount : 0);
      _d.updateMatrix(); this.mesh.setMatrixAt(i, _d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
