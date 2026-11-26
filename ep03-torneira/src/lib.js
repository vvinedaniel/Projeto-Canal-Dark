// Biblioteca compartilhada dos cenários — Mundo por Dentro.
// Tudo aqui é determinístico: nenhuma função usa Math.random() nem relógio.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as BGU from 'three/addons/utils/BufferGeometryUtils.js';
export { THREE, RoundedBoxGeometry, BGU };

export const W = 1080, H = 1920, FPS = 30;
export const TAU = Math.PI * 2;

/* ---------- matemática ---------- */
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const fract = (x) => x - Math.floor(x);
/** smoothstep entre a e b */
export const sstep = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
/** progresso linear 0..1 entre a e b */
export const prog = (t, a, b) => clamp01((t - a) / (b - a));
/** 0→1 a partir de a, 1→0 chegando em b */
export const pulse = (t, a, b, fi = 0.3, fo = 0.3) => sstep(a, a + fi, t) * (1 - sstep(b - fo, b, t));
export const ease = {
  io: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k * k,
  back: (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); },
  bounce: (k) => { const n = 7.5625, d = 2.75; if (k < 1 / d) return n * k * k; if (k < 2 / d) return n * (k -= 1.5 / d) * k + 0.75; if (k < 2.5 / d) return n * (k -= 2.25 / d) * k + 0.9375; return n * (k -= 2.625 / d) * k + 0.984375; }
};
export function rng(seed = 1) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const v3 = (a) => (Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2]) : a);

/* ---------- paleta (direção de arte comum a todos os cenários) ---------- */
export const PAL = {
  bg: '#0f2233', bgHi: '#1f4a66',
  grass: '#6cc24a', grassDark: '#4c9a3a', soilTop: '#6b4a32', soilMid: '#8f6846', soilDeep: '#5d4737', rock: '#8d9199',
  concrete: '#cfd3d6', concreteDark: '#9aa2a9', asphalt: '#3a4049', sidewalk: '#d9d3c7', brick: '#b5553c',
  pvc: '#e07b2a', pipeGray: '#8f9aa5', iron: '#4d5964', steel: '#bcc6cf', rust: '#a8542c',
  ceramic: '#f5f7f9', cut: '#ecdcc6', wall: '#f2e2c4', roof: '#c9543b', wood: '#a8744e', glass: '#a3dcf2',
  sewage: '#7a5230', murky: '#9a8650', haze: '#86a995', clear: '#33b4ea', tap: '#62cbf2',
  sludge: '#4a3423', sand: '#e3c680', poop: '#6b3f1f',
  accent: '#ffd23f', warn: '#ff5a4e', good: '#3df0c2', gas: '#b9f25c', flame: '#ff9a2e',
  yellow: '#f6c12c', red: '#d8433a', blue: '#2f7fd6', green: '#3aa864', white: '#ffffff', dark: '#1e2730'
};

/* ---------- materiais ---------- */
export const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0, ...o });
export const metal = (color, o = {}) => mat(color, { roughness: 0.35, metalness: 0.75, ...o });
export const glossy = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.2, ...o });
export const glass = (color = PAL.glass, opacity = 0.3, o = {}) => mat(color, { transparent: true, opacity, roughness: 0.08, depthWrite: false, ...o });
/** Tempo e escala compartilhados pela ondulação de todas as águas (o motor atualiza a cada quadro). */
export const WATER_U = { uTime: { value: 0 }, uScale: { value: 1 } };
/** Acrescenta ondulação animada (normal perturbada) e cáusticas sutis a um material padrão.
    Funciona sem UVs: o padrão vem da posição no mundo, então é contínuo entre peças de água vizinhas. */
export function waterize(m, strength = 1) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = WATER_U.uTime; sh.uniforms.uWScale = WATER_U.uScale; sh.uniforms.uWStr = { value: strength };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos; uniform float uTime; uniform float uWScale; uniform float uWStr;
vec3 wWave(vec3 p) { // altura e gradiente de três ondas cruzadas
  vec2 q = (p.xz + vec2(p.y * 0.7, -p.y * 0.5)) * uWScale * 6.2831;
  float a = q.x * 1.0 + q.y * 0.35 + uTime * 1.9, b = -q.x * 0.45 + q.y * 1.1 + uTime * 1.4, c = (q.x + q.y) * 2.3 - uTime * 2.6;
  float h = sin(a) * 0.5 + sin(b) * 0.4 + sin(c) * 0.18;
  vec2 g = cos(a) * 0.5 * vec2(1.0, 0.35) + cos(b) * 0.4 * vec2(-0.45, 1.1) + cos(c) * 0.18 * vec2(2.3, 2.3);
  return vec3(g, h);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{ vec3 w = wWave(vWPos); normal = normalize(normal + (viewMatrix * vec4(-w.x * 0.09 * uWStr, 0.0, -w.y * 0.09 * uWStr, 0.0)).xyz); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{ vec3 w = wWave(vWPos * 1.7 + 3.1); float cst = pow(clamp(1.0 - abs(w.z), 0.0, 1.0), 6.0); totalEmissiveRadiance += (diffuseColor.rgb * 0.6 + 0.12) * cst * 0.22 * uWStr; }`);
  };
  m.customProgramCacheKey = () => 'water-v1-' + strength;
  return m;
}
export const water = (color = PAL.clear, opacity = 0.86, o = {}) => waterize(mat(color, { transparent: opacity < 1, opacity, roughness: 0.12, metalness: 0.05, ...o }));
/** material que brilha sozinho (setas, indicadores, chamas) */
export const glow = (color = PAL.accent, intensity = 1.6, o = {}) => mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.5, ...o });
export const flat = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });

/* ---------- malhas básicas ---------- */
export function mesh(geo, material, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  return m;
}
export const box = (w, h, d, m, x, y, z, o) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, o);
export const rbox = (w, h, d, r, m, x, y, z, o) => mesh(new RoundedBoxGeometry(w, h, d, 3, r), m, x, y, z, o);
export const cyl = (rt, rb, h, m, x, y, z, seg = 32, o) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, o);
export const sph = (r, m, x, y, z, o) => mesh(new THREE.SphereGeometry(r, 24, 16), m, x, y, z, o);
export const torus = (R, r, m, x, y, z, o) => mesh(new THREE.TorusGeometry(R, r, 12, 40), m, x, y, z, o);
export function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
export function put(parent, ...objs) { objs.forEach((o) => parent.add(o)); return objs[0]; }
export function shadows(obj, cast = true, receive = true) { obj.traverse((o) => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = receive; } }); return obj; }

/** curva suave passando por pontos [[x,y,z],...] */
export const curve = (pts, closed = false, tension = 0.5) => new THREE.CatmullRomCurve3(pts.map(v3), closed, 'catmullrom', tension);
/** tubo ao longo de uma curva ou lista de pontos */
export function tube(c, r, m, seg = 96, radial = 14, closed = false) {
  if (Array.isArray(c)) c = curve(c);
  return mesh(new THREE.TubeGeometry(c, seg, r, radial, closed), m);
}
/** superfície de revolução: profile = [[raio, y], ...]; phi permite fazer metades (corte) */
export function lathe(profile, m, seg = 48, phiStart = 0, phiLength = TAU) {
  return mesh(new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg, phiStart, phiLength), m);
}
/** forma 2D [[x,y],...] extrudada em z (depth), com chanfro opcional */
export function extrude(pts, depth, m, o = {}) {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  (o.holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: !!o.bevel, bevelSize: o.bevel || 0, bevelThickness: o.bevel || 0, bevelSegments: 2, curveSegments: o.curveSegments || 16 });
  return mesh(g, m);
}
/** casca entre anéis de pontos (cada anel = array de Vector3 com o mesmo tamanho) */
export function loft(rings, m, o = {}) {
  const n = rings[0].length, pos = [], idx = [];
  rings.forEach((r) => r.forEach((p) => pos.push(p.x, p.y, p.z)));
  const cols = o.closed ? n : n - 1;
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < cols; j++) {
    const a = i * n + j, b = i * n + ((j + 1) % n), c = (i + 1) * n + j, d = (i + 1) * n + ((j + 1) % n);
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return mesh(g, m);
}

/* ---------- tubulação em corte ----------
   cutPipe: meio-tubo no plano XY (z = 0 é a face cortada, o corpo fica em z < 0),
   com parede de espessura real, face de corte e água parcial animável.
   pts = [[x,y],...] da esquerda para a direita (o "fundo" do tubo é o lado -normal). */
function frames2D(c, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, p = c.getPointAt(u), t = c.getTangentAt(u);
    out.push({ p, nx: -t.y, ny: t.x });
  }
  return out;
}
function stripGeo(fr, f) { // f(frame) -> [Vector3 a, Vector3 b]; triângulos em ordem ao longo da curva
  const pos = [], idx = [];
  fr.forEach((k) => { const [a, b] = f(k); pos.push(a.x, a.y, a.z, b.x, b.y, b.z); });
  for (let i = 0; i < fr.length - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function cutPipe(pts, o = {}) {
  const r = o.r ?? 0.05, wall = o.wall ?? r * 0.16, ri = r - wall, seg = o.seg ?? 120, rad = o.radial ?? 14;
  const c = curve(pts.map((p) => [p[0], p[1], 0]), false, o.tension ?? 0.25);
  const fr = frames2D(c, seg);
  const shellMat = o.mat ?? mat(PAL.pvc, { side: THREE.DoubleSide });
  const cutMat = o.cutMat ?? mat(new THREE.Color(shellMat.color).multiplyScalar(0.72), { roughness: 0.8 });
  const g = new THREE.Group();
  const half = (R, flip) => {
    const rings = fr.map((k) => { const ring = []; for (let j = 0; j <= rad; j++) { const a = (j / rad) * Math.PI; ring.push(new THREE.Vector3(k.p.x + k.nx * Math.cos(a) * R, k.p.y + k.ny * Math.cos(a) * R, -Math.sin(a) * R)); } return flip ? ring.reverse() : ring; });
    return loft(rings, shellMat);
  };
  g.add(half(r, false), half(ri, true));
  [[ri, r], [-r, -ri]].forEach(([a, b]) => {
    const s = mesh(stripGeo(fr, (k) => [new THREE.Vector3(k.p.x + k.nx * a, k.p.y + k.ny * a, 0), new THREE.Vector3(k.p.x + k.nx * b, k.p.y + k.ny * b, 0)]), cutMat);
    s.material.side = THREE.DoubleSide; g.add(s);
  });
  /** água dentro do tubo: level 0..1 (fração do diâmetro). Retorna { group, range(u0,u1), mat } */
  function waterIn(level = 0.5, color = PAL.sewage, opacity = 0.92) {
    const wm = water(color, opacity, { side: THREE.DoubleSide });
    const h = -ri + 2 * ri * clamp01(level) * 0.999, chord = Math.sqrt(Math.max(0, ri * ri - h * h));
    const face = mesh(stripGeo(fr, (k) => [new THREE.Vector3(k.p.x - k.nx * ri * 0.985, k.p.y - k.ny * ri * 0.985, 0.0015), new THREE.Vector3(k.p.x + k.nx * h, k.p.y + k.ny * h, 0.0015)]), wm, 0, 0, 0, { cast: false });
    const top = mesh(stripGeo(fr, (k) => [new THREE.Vector3(k.p.x + k.nx * h, k.p.y + k.ny * h, 0.0015), new THREE.Vector3(k.p.x + k.nx * h, k.p.y + k.ny * h, -chord)]), wm, 0, 0, 0, { cast: false });
    const wg = new THREE.Group(); wg.add(face, top); g.add(wg);
    const range = (u0, u1) => { const a = Math.floor(clamp01(u0) * seg), b = Math.floor(clamp01(u1) * seg); [face, top].forEach((s) => s.geometry.setDrawRange(a * 6, Math.max(0, b - a) * 6)); wg.visible = b > a; };
    return { group: wg, range, mat: wm };
  }
  /** contorno 2D do tubo (para abrir o furo correspondente em soilWall) */
  const outline = (extra = 0) => [...fr.map((k) => [k.p.x + k.nx * (r + extra), k.p.y + k.ny * (r + extra)]), ...fr.slice().reverse().map((k) => [k.p.x - k.nx * (r + extra), k.p.y - k.ny * (r + extra)])];
  return { group: g, curve: c, r, ri, waterIn, outline };
}

/* ---------- partículas e setas que percorrem curvas ---------- */
const _d = new THREE.Object3D(), _p = new THREE.Vector3(), _t = new THREE.Vector3(), _c = new THREE.Color();
/** Partículas instanciadas ao longo de uma curva.
    o: { n, size, color | colors[], jitter:[x,y,z], offset:[x,y,z], geo, material, seed, sizeVar }
    update(t, { speed, head, tail, amount, size }) — head/tail (0..1) recortam o trecho visível. */
export class Flow {
  constructor(c, o = {}) {
    this.curve = Array.isArray(c) ? curve(c) : c;
    const n = (this.n = o.n ?? 60), rd = rng(o.seed ?? 11);
    this.size = o.size ?? 0.03;
    const geo = o.geo ?? new THREE.SphereGeometry(1, 10, 8);
    const material = o.material ?? mat(0xffffff, { roughness: 0.3 });
    this.mesh = new THREE.InstancedMesh(geo, material, n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = !!o.cast;
    const j = o.jitter ?? [0, 0, 0], off = o.offset ?? [0, 0, 0], cols = o.colors ?? [o.color ?? PAL.clear];
    this.parts = [];
    for (let i = 0; i < n; i++) {
      this.parts.push({ ph: (i + rd() * 0.7) / n, ox: off[0] + (rd() - 0.5) * 2 * j[0], oy: off[1] + (rd() - 0.5) * 2 * j[1], oz: off[2] + (rd() - 0.5) * 2 * j[2], s: 1 + (rd() - 0.5) * 2 * (o.sizeVar ?? 0.35), rot: rd() * TAU });
      this.mesh.setColorAt(i, _c.set(cols[Math.floor(rd() * cols.length)]));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(t, o = {}) {
    const speed = o.speed ?? 0.2, head = o.head ?? 1, tail = o.tail ?? 0, amount = o.amount ?? 1, size = (o.size ?? this.size) * amount;
    for (let i = 0; i < this.n; i++) {
      const q = this.parts[i], u = fract(q.ph + t * speed), on = amount > 0 && u <= head && u >= tail;
      this.curve.getPointAt(u, _p);
      _d.position.set(_p.x + q.ox, _p.y + q.oy, _p.z + q.oz);
      _d.rotation.set(q.rot + t * 2 * (o.spin ?? 0), q.rot * 1.7, 0);
      _d.scale.setScalar(on ? size * q.s * Math.min(1, Math.min(u - tail, head - u) * 30 + 0.2) : 0);
      _d.updateMatrix(); this.mesh.setMatrixAt(i, _d.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
/** Setas (chevrons) que correm ao longo de uma curva, sempre brilhantes.
    o: { n, size, color, normal:[x,y,z] (para onde a face da seta olha), offset:[x,y,z] } */
export class Chevrons {
  constructor(c, o = {}) {
    this.curve = Array.isArray(c) ? curve(c) : c;
    this.n = o.n ?? 8; this.size = o.size ?? 0.1;
    const s = new THREE.Shape(); // chevron apontando para +x
    s.moveTo(-0.6, 0.7); s.lineTo(0.1, 0.7); s.lineTo(0.8, 0); s.lineTo(0.1, -0.7); s.lineTo(-0.6, -0.7); s.lineTo(0.1, 0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: false }); geo.translate(0, 0, -0.09);
    this.mesh = new THREE.InstancedMesh(geo, o.material ?? flat(o.color ?? PAL.accent, { transparent: true, toneMapped: false }), this.n);
    this.mesh.frustumCulled = false; this.mesh.castShadow = false; this.mesh.renderOrder = 30;
    this.normal = v3(o.normal ?? [0, 0, 1]).clone().normalize(); this.offset = v3(o.offset ?? [0, 0, 0]);
    this.mx = new THREE.Matrix4(); this.b = new THREE.Vector3(); this.nn = new THREE.Vector3(); this.sc = new THREE.Vector3();
  }
  update(t, o = {}) {
    const speed = o.speed ?? 0.25, head = o.head ?? 1, tail = o.tail ?? 0, amount = o.amount ?? 1, size = o.size ?? this.size;
    this.mesh.material.opacity = clamp01(amount); this.mesh.visible = amount > 0.01;
    for (let i = 0; i < this.n; i++) {
      const u = fract(i / this.n + t * speed), on = u <= head && u >= tail;
      this.curve.getPointAt(u, _p); this.curve.getTangentAt(u, _t);
      this.b.crossVectors(this.normal, _t).normalize(); this.nn.crossVectors(_t, this.b).normalize();
      const s = on ? size * Math.min(1, Math.min(u - tail, head - u) * 12 + 0.15) : 0;
      this.mx.makeBasis(_t, this.b, this.nn); this.mx.scale(this.sc.set(s, s, s)); this.mx.setPosition(_p.x + this.offset.x, _p.y + this.offset.y, _p.z + this.offset.z);
      this.mesh.setMatrixAt(i, this.mx);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
/** Seta reta sólida apontando para +x, com origem na cauda. */
export function arrow(len = 1, o = {}) {
  const w = o.width ?? len * 0.16, hw = o.headWidth ?? w * 2.4, hl = o.headLen ?? Math.min(len * 0.45, hw * 1.1), s = new THREE.Shape();
  s.moveTo(0, w / 2); s.lineTo(len - hl, w / 2); s.lineTo(len - hl, hw / 2); s.lineTo(len, 0); s.lineTo(len - hl, -hw / 2); s.lineTo(len - hl, -w / 2); s.lineTo(0, -w / 2); s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: o.thick ?? w * 0.5, bevelEnabled: false }); geo.translate(0, 0, -(o.thick ?? w * 0.5) / 2);
  return mesh(geo, o.material ?? flat(o.color ?? PAL.accent, { transparent: true, toneMapped: false }), 0, 0, 0, { cast: false, receive: false });
}

/* ---------- solo em corte ---------- */
/** Bloco de terreno com camadas. o: { x0,x1,z0,z1, layers:[{y0,y1,color}], rocks, seed }
    As faces em x0/x1/z1 ficam expostas como corte geológico. */
export function soil(o) {
  const g = new THREE.Group(), w = o.x1 - o.x0, d = o.z1 - o.z0;
  (o.layers ?? [{ y0: -0.6, y1: 0, color: PAL.soilTop }, { y0: -2.2, y1: -0.6, color: PAL.soilMid }, { y0: -4, y1: -2.2, color: PAL.soilDeep }]).forEach((l) => {
    g.add(box(w, l.y1 - l.y0, d, mat(l.color, { roughness: 0.95 }), (o.x0 + o.x1) / 2, (l.y0 + l.y1) / 2, (o.z0 + o.z1) / 2));
  });
  const n = o.rocks ?? 0;
  if (n) {
    const rd = rng(o.seed ?? 5), bottom = Math.min(...(o.layers ?? [{ y0: -4 }]).map((l) => l.y0));
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat(PAL.rock, { roughness: 0.9, flatShading: true }), n);
    for (let i = 0; i < n; i++) {
      _d.position.set(lerp(o.x0, o.x1, rd()), lerp(bottom + 0.2, -0.25, rd()), o.z1 - rd() * 0.04);
      _d.rotation.set(rd() * 6, rd() * 6, rd() * 6); const s = (o.rockSize ?? 0.12) * (0.5 + rd()); _d.scale.set(s * (0.8 + rd() * 0.6), s * (0.6 + rd() * 0.5), s);
      _d.updateMatrix(); im.setMatrixAt(i, _d.matrix); im.setColorAt(i, _c.set(PAL.rock).offsetHSL(0, 0, (rd() - 0.5) * 0.18));
    }
    im.castShadow = true; im.receiveShadow = true; g.add(im);
  }
  return g;
}
/** Parede de solo em corte (plano XY em z), com textura de camadas/pedregulhos e FUROS por onde se vê o interior
    de tubos (cutPipe) e câmaras. É o jeito certo de mostrar tubulação enterrada: o meio-tubo fica atrás do furo.
    o: { x0, x1, y0 (fundo), y1 (topo), z = 0, depth = 8 (laterais para trás), pipes: [cutPipe...],
         holes: [[[x,y],...]] (polígonos extras: caixas, poços), rocks = 0, seed, tones: [topo, meio, fundo] }
    Os furos precisam ficar dentro do retângulo e NÃO podem se sobrepor entre si. */
export function soilWall(o) {
  const { x0, x1, y0, y1 } = o, z = o.z ?? 0, w = x1 - x0, h = y1 - y0, depth = o.depth ?? 8, rd = rng(o.seed ?? 9);
  const tones = o.tones ?? [PAL.soilTop, PAL.soilMid, PAL.soilDeep];
  const ppm = Math.min(4096 / w, Math.max(1024 / w, 120)), cw = Math.round(w * ppm), chh = Math.max(64, Math.min(4096, Math.round(h * ppm))), cv = document.createElement('canvas'); cv.width = cw; cv.height = chh;
  const g2 = cv.getContext('2d'), py = (m) => (m / h) * chh; // metros de profundidade -> px
  const bands = o.bands ?? [0, Math.min(0.7, h * 0.16), h * 0.55, h];
  for (let b = 0; b < 3; b++) {
    g2.fillStyle = tones[b]; g2.beginPath(); g2.moveTo(0, chh);
    for (let x = 0; x <= cw; x += 8) g2.lineTo(x, py(bands[b]) + (b ? Math.sin((x / ppm) * 1.1 + b * 2) * py(h * 0.018) + Math.sin((x / ppm) * 3.1 + b) * py(h * 0.008) : 0));
    g2.lineTo(cw, chh); g2.closePath(); g2.fill();
  }
  const grad = g2.createLinearGradient(0, 0, 0, chh); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.28)'); g2.fillStyle = grad; g2.fillRect(0, 0, cw, chh);
  for (let i = 0, n = Math.min(16000, Math.round(w * h * 170)); i < n; i++) { g2.fillStyle = rd() < 0.5 ? 'rgba(255,235,200,.10)' : 'rgba(30,15,5,.13)'; const s = (0.006 + rd() * 0.018) * ppm; g2.beginPath(); g2.ellipse(rd() * cw, rd() * chh, s, s * (0.5 + rd() * 0.6), rd() * 3, 0, TAU); g2.fill(); }
  for (let i = 0, n = Math.min(500, Math.round(w * h * 5)); i < n; i++) { { const v = 120 + rd() * 70; g2.fillStyle = `rgba(${v + 12},${v + 4},${v - 8},.5)`; } const s = (0.015 + rd() * 0.04) * ppm; g2.beginPath(); g2.ellipse(rd() * cw, py(Math.min(0.3, h * 0.1)) + rd() * (chh - py(Math.min(0.3, h * 0.1))), s, s * (0.5 + rd() * 0.4), rd() * 3, 0, TAU); g2.fill(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  tex.repeat.set(1 / w, 1 / h); tex.offset.set(-x0 / w, -y0 / h);
  const shape = new THREE.Shape([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map((p) => new THREE.Vector2(p[0], p[1])));
  const e = 0.004, cl = (p) => new THREE.Vector2(Math.min(x1 - e, Math.max(x0 + e, p[0])), Math.min(y1 - e, Math.max(y0 + e, p[1])));
  [...(o.pipes ?? []).map((p) => p.outline(0.002)), ...(o.holes ?? [])].forEach((poly) => shape.holes.push(new THREE.Path(poly.map(cl))));
  const g = new THREE.Group(), fm = mat(0xffffff, { map: tex, roughness: 0.95 });
  g.add(mesh(new THREE.ShapeGeometry(shape, 8), fm, 0, 0, z, { cast: false }));
  const st = tex.clone(); st.repeat.set(1 / depth * 0.35, 1 / h); st.offset.set(0.2, -y0 / h); st.needsUpdate = true;
  const sm = mat(0xffffff, { map: st, roughness: 0.95, side: THREE.DoubleSide });
  [x0, x1].forEach((x) => { const pl = mesh(new THREE.PlaneGeometry(depth, h), sm, x, (y0 + y1) / 2, z - depth / 2, { cast: false }); pl.rotation.y = Math.PI / 2; const uv = pl.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) { uv.setXY(i, uv.getX(i) * depth, y0 + uv.getY(i) * h); } g.add(pl); });
  g.add(mesh(new THREE.PlaneGeometry(w, depth), mat(tones[2], { roughness: 1, side: THREE.DoubleSide }), (x0 + x1) / 2, y0, z - depth / 2, { cast: false }).rotateX(Math.PI / 2));
  const n = o.rocks ?? 0;
  if (n) {
    const pts = []; (o.pipes ?? []).forEach((p) => { for (let i = 0; i <= 60; i++) { const q = p.curve.getPointAt(i / 60); pts.push([q.x, q.y, p.r]); } });
    (o.holes ?? []).forEach((poly) => poly.forEach((q) => pts.push([q[0], q[1], 0.6])));
    const rs = o.rockSize ?? Math.max(0.05, h * 0.03);
    g.add(scatter(new THREE.IcosahedronGeometry(1, 0), mat(PAL.rock, { roughness: 0.9, flatShading: true }), n, (i, r, d) => {
      let x, y, ok, tries = 0;
      do { x = lerp(x0 + rs, x1 - rs, r()); y = lerp(y0 + rs, y1 - Math.min(0.5, h * 0.12), r()); ok = pts.every((q) => Math.hypot(q[0] - x, q[1] - y) > q[2] + rs * 2.2); } while (!ok && ++tries < 30);
      const s = ok ? rs * (0.5 + r()) : 0; d.position.set(x, y, z - s * 0.15); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.5), s * 0.8);
      return new THREE.Color(PAL.rock).offsetHSL(0, 0, (r() - 0.5) * 0.16);
    }, o.seed ?? 9));
  }
  return g;
}

/** Espalha n instâncias de uma geometria. fn(i, rnd, dummy) posiciona o dummy; devolve cor opcional. */
export function scatter(geo, material, n, fn, seed = 3) {
  const im = new THREE.InstancedMesh(geo, material, n), rd = rng(seed);
  for (let i = 0; i < n; i++) {
    _d.position.set(0, 0, 0); _d.rotation.set(0, 0, 0); _d.scale.set(1, 1, 1);
    const col = fn(i, rd, _d); _d.updateMatrix(); im.setMatrixAt(i, _d.matrix);
    if (col) im.setColorAt(i, _c.set(col));
  }
  im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  return im;
}

/* ---------- luz de estúdio ---------- */
/** Fundo escuro de estúdio + sol quente com sombras + contraluz fria.
    Retorna { sun, hemi, rim, focus(x,y,z,size) } — chame focus() a cada quadro para a sombra acompanhar a câmera. */
export function studio(scene, o = {}) {
  const bg = o.bg ?? PAL.bg;
  scene.background = new THREE.Color(bg);
  if (o.fog !== false) scene.fog = new THREE.Fog(bg, o.fogNear ?? 40, o.fogFar ?? 160);
  const hemi = new THREE.HemisphereLight(o.skyLight ?? 0xcfe4ff, o.groundLight ?? 0x3a4a5e, o.hemi ?? 1.0);
  const sun = new THREE.DirectionalLight(o.sunColor ?? 0xffedd6, o.sun ?? 2.8);
  const dir = v3(o.sunDir ?? [0.5, 1, 0.75]).clone().normalize();
  sun.castShadow = true; sun.shadow.mapSize.set(o.shadowMap ?? 4096, o.shadowMap ?? 4096); sun.shadow.bias = -0.0003; sun.shadow.radius = o.softness ?? 3;
  const rim = new THREE.DirectionalLight(o.rimColor ?? 0x7fc4ff, o.rim ?? 0.9);
  rim.position.set(-0.7, 0.6, -0.8);
  scene.add(hemi, sun, sun.target, rim);
  if (o.backdrop !== false) { // fundo de estúdio em degradê (mais claro na linha do horizonte)
    const bgeo = new THREE.SphereGeometry(480, 32, 24), cols = [], lo = new THREE.Color(bg), hi = new THREE.Color(o.bgHi ?? PAL.bgHi), pa = bgeo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = Math.pow(Math.max(0, 1 - Math.abs(pa.getY(i) / 480 - 0.06)), 3.2), cc = lo.clone().lerp(hi, clamp01(k)); cols.push(cc.r, cc.g, cc.b); }
    bgeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const dome = new THREE.Mesh(bgeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  }
  function focus(x, y, z, size = 10) {
    const D = size * 4;
    sun.target.position.set(x, y, z); sun.position.set(x + dir.x * D, y + dir.y * D, z + dir.z * D);
    const c = sun.shadow.camera; c.left = c.bottom = -size; c.right = c.top = size; c.near = 0.1; c.far = D * 2 + size; c.updateProjectionMatrix();
    sun.shadow.normalBias = size * 0.004;
  }
  focus(0, 0, 0, o.size ?? 10);
  return { hemi, sun, rim, focus, dir };
}

/* ---------- câmera ---------- */
/** Trilho de câmera por quadros-chave: keys = [{ t, p:[x,y,z], l:[x,y,z], fov? }, ...] (t em segundos globais).
    Retorna fn(t, camera) -> Vector3 do ponto observado. A câmera nunca fica parada (deriva sutil). */
export function camRail(keys, o = {}) {
  const P = new THREE.CatmullRomCurve3(keys.map((k) => v3(k.p)), false, 'catmullrom', o.tension ?? 0.4);
  const Lk = new THREE.CatmullRomCurve3(keys.map((k) => v3(k.l)), false, 'catmullrom', o.tension ?? 0.4);
  const n = keys.length, look = new THREE.Vector3(), smooth = o.smooth ?? 0.6, drift = o.drift ?? 0.012;
  return (t, cam) => {
    let i = 0; while (i < n - 2 && t >= keys[i + 1].t) i++;
    const f0 = clamp01((t - keys[i].t) / (keys[i + 1].t - keys[i].t)), f = lerp(f0, f0 * f0 * (3 - 2 * f0), smooth), u = (i + f) / (n - 1);
    P.getPoint(u, cam.position); Lk.getPoint(u, look);
    const d = cam.position.distanceTo(look) * drift;
    cam.position.x += Math.sin(t * 0.83) * d; cam.position.y += Math.sin(t * 0.61 + 1.3) * d * 0.7; cam.position.z += Math.cos(t * 0.71) * d;
    const fa = keys[i].fov ?? o.fov ?? 35, fb = keys[i + 1].fov ?? o.fov ?? 35;
    cam.fov = lerp(fa, fb, f); cam.up.set(0, 1, 0); cam.lookAt(look); cam.updateProjectionMatrix();
    return look;
  };
}
