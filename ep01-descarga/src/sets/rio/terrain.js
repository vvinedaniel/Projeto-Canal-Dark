// Terreno da maquete (platô, dique, margem, leito do rio, valão) com faces de corte, e a água do rio animada.
import * as L from '../../lib.js';
import { K } from './util.js';
const { THREE, PAL, sstep, clamp01, lerp } = L;
const { XA, XB, YW, BED, X0, X1, Z0, Z1, YB } = K;

/* ---------- valão (córrego a céu aberto) do lado sem tratamento ---------- */
export const creekXZ = [[6, -12.5], [5.75, -11.2], [4.3, -9.2], [3.6, -7.4], [4.8, -5.6], [4.4, -3.9], [3.0, -2.6], [2.6, -1.2], [2.6, 0.5]];
export const creekBedY = (z) => lerp(-0.5, -1.3, sstep(-2.4, 0.5, z));
export const creekCurve = L.curve(creekXZ.map((p) => [p[0], creekBedY(p[1]) + 0.14, p[1]]), false, 0.5);
const CS = []; for (let i = 0; i <= 90; i++) CS.push(creekCurve.getPointAt(i / 90));
export function creekK(x, z) {
  if (x < 0.8 || z < -12.9 || z > 2) return 0;
  let d = 9; for (const p of CS) { const q = Math.hypot(p.x - x, p.z - z); if (q < d) d = q; }
  return (1 - sstep(0.3, 1.05, d)) * sstep(-12.9, -12.6, z);
}

const n2 = (x, z) => 0.5 * Math.sin(x * 1.7 + z * 0.9) + 0.5 * Math.sin(x * 0.63 - z * 1.31 + 1.7);
export function height(x, z) {
  const sh = 0.35 * Math.sin(x * 0.45 + 0.5) + 0.16 * Math.sin(x * 1.15 + 2), zz = z - sh;
  const levee = 0.26 * sstep(-3.75, -3.0, zz) * (1 - sstep(-2.3, -1.2, zz));
  const bank = sstep(-1.3, 0.35, zz), deep = sstep(0.35, 3.3, zz);
  let h = levee + 0.02 * n2(x * 2.3, z * 2.1) * (1 - bank) + (YW - 0.18) * bank + (BED - YW + 0.18) * deep + 0.07 * n2(x * 1.9 + 3, z * 2.3) * deep;
  const ck = creekK(x, z); if (ck > 0) h -= ck * Math.max(0, h - creekBedY(z));
  const dx = Math.abs(x - XA);
  if (z <= -0.24) { const w = (1 - sstep(1.5, 2.7, dx)) * sstep(-3.85, -3.3, z); h = lerp(h, Math.max(h, 0.32), w); }
  else if (z < 1.8 && dx < 1.28 + Math.max(0, z) * 0.6) h = Math.min(h, -1.34);
  return h;
}

const C = (c) => new THREE.Color(c);
const cGrassA = C(PAL.grass), cGrassB = C(PAL.grassDark), cDry = C('#9db85a'), cDirt = C('#b09a6c'), cMud = C('#66503a'), cSand = C('#d2b77c'), cBed = C('#b59d66'), cBedDeep = C('#7d7a52'), cPad = C('#c9c4b0');
export function groundColor(x, z, h, out) {
  const n = n2(x * 0.9 + 5, z * 0.8), m = n2(x * 3.1, z * 2.7);
  out.copy(cGrassA).lerp(cGrassB, clamp01(0.45 + 0.45 * n + 0.15 * m));
  if (x > 0.5 && z > -12.8 && z < -0.5) out.lerp(cDry, 0.7 * sstep(0.5, 1.2, x) * sstep(-12.8, -12, z)).lerp(cDirt, clamp01(0.35 * m + 0.12 + 0.3 * n) * sstep(0.5, 1.2, x) * sstep(-12.8, -12, z));
  const pad = sstep(-11.6, -11.3, x) * (1 - sstep(-0.95, -0.65, x)) * sstep(-12.5, -12.2, z) * (1 - sstep(-3.95, -3.65, z));
  out.lerp(cPad, pad * 0.95).multiplyScalar(0.95 + 0.05 * m);
  out.lerp(cMud, creekK(x, z) * 0.92);
  out.lerp(cSand, sstep(YW + 0.5, YW + 0.1, h) * 0.9);
  out.lerp(cBed, sstep(YW + 0.05, YW - 0.45, h));
  out.lerp(cBedDeep, sstep(YW - 0.5, BED, h) * 0.6);
  return out;
}

function soilTexture() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d'), rd = L.rng(77); cv.width = 1024; cv.height = 2048; g.scale(2, 4);
  const bands = [[0, '#3d2a1c'], [0.035, PAL.soilTop], [0.13, PAL.soilMid], [0.5, PAL.soilDeep], [0.82, '#4a3a30']];
  bands.forEach(([y0, c], b) => {
    g.fillStyle = c; g.beginPath(); g.moveTo(0, 512);
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, y0 * 512 + (b ? Math.sin((x / 512) * L.TAU * (1 + b)) * 7 + Math.sin((x / 512) * L.TAU * 5 + b) * 3 : 0));
    g.lineTo(512, 512); g.closePath(); g.fill();
  });
  for (let i = 0; i < 5200; i++) { g.fillStyle = rd() < 0.5 ? 'rgba(255,235,200,.10)' : 'rgba(30,15,5,.14)'; const s = 0.5 + rd() * 1.6; g.fillRect(rd() * 512, rd() * 512, s, s * 0.5 * (0.6 + rd())); }
  for (let i = 0; i < 150; i++) { const v = 120 + rd() * 70, r = 1.2 + rd() * 3.2; g.fillStyle = `rgba(${v + 12},${v + 4},${v - 8},.6)`; g.beginPath(); g.ellipse(rd() * 512, 30 + rd() * 480, r, r * 0.42 * (0.6 + rd() * 0.5), 0, 0, L.TAU); g.fill(); }
  const grad = g.createLinearGradient(0, 0, 0, 512); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function buildTerrain() {
  const grp = new THREE.Group(), xs = [], zs = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.25) xs.push(x);
  for (let z = Z0; z <= Z1 + 1e-6; z += 0.25) zs.push(z);
  const nx = xs.length, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), idx = [], c = new THREE.Color();
  const H = (ix, iz) => pos[(iz * nx + ix) * 3 + 1];
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const i = (iz * nx + ix) * 3, h = height(xs[ix], zs[iz]);
    pos[i] = xs[ix]; pos[i + 1] = h; pos[i + 2] = zs[iz];
    groundColor(xs[ix], zs[iz], h, c); col[i] = c.r; col[i + 1] = c.g; col[i + 2] = c.b;
  }
  for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) {
    if (Math.abs(zs[iz] + 0.25) < 0.01 && Math.abs(xs[ix] + 0.125 - XA) < 1.3) continue; // degrau escondido dentro do muro de ala (não atravessa o tubo)
    const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1; idx.push(a, d, b, b, d, e);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  grp.add(L.mesh(geo, L.mat(0xffffff, { vertexColors: true, roughness: 0.95 })));
  // faces de corte
  const tex = soilTexture(), wm = L.mat(0xffffff, { map: tex, roughness: 0.95, side: THREE.DoubleSide });
  const wall = (pts) => {
    const p = [], uv = [], ix = []; let s = 0;
    pts.forEach((q, i) => {
      if (i) s += Math.hypot(q[0] - pts[i - 1][0], q[2] - pts[i - 1][2]);
      p.push(q[0], q[1], q[2], q[0], YB, q[2]); uv.push(s / 4, 1, s / 4, 1 - (q[1] - YB) / 6.6);
      if (i) { const a = (i - 1) * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
    return L.mesh(g, wm, 0, 0, 0, { cast: false });
  };
  grp.add(wall(xs.map((x, ix) => [x, H(ix, nz - 1), Z1])), wall(xs.map((x, ix) => [x, H(ix, 0), Z0])));
  grp.add(wall(zs.map((z, iz) => [X0, H(0, iz), z])), wall(zs.map((z, iz) => [X1, H(nx - 1, iz), z])));
  const bottom = L.mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), L.mat('#3a2c24', { roughness: 1, side: THREE.DoubleSide }), 0, YB, (Z0 + Z1) / 2); bottom.rotation.x = Math.PI / 2; grp.add(bottom);
  return grp;
}

/* ---------- água ---------- */
export function wave(x, z, t) {
  let y = 0.034 * Math.sin(1.6 * x - 2.3 * t + 0.7 * z) + 0.026 * Math.sin(2.7 * z + 1.6 * t + 0.9 * x) + 0.018 * Math.sin(4.2 * x + 3.1 * z - 3.4 * t);
  const ra = Math.hypot(x - XA, z - 2.0); y += 0.05 * Math.sin(5 * ra - 8 * t) * Math.exp(-ra * 0.8);
  const rb = Math.hypot(x - XB, z - 0.8); y += 0.04 * Math.sin(5 * rb - 8 * t) * Math.exp(-rb * 0.8) * sstep(97.3, 97.9, t);
  return y;
}
export const T_RAW = 97.45; // instante em que o esgoto bruto chega ao rio
/** fração de esgoto bruto na água (0..1) */
export function plume(x, z, t) {
  if (t < T_RAW) return 0;
  const dx = x - (XB - 0.7), front = XB - 0.5 + 12.5 * L.ease.out(L.prog(t, T_RAW, 100.9));
  const w = (1.15 + 1.0 * Math.max(0, dx)) * (1 + 0.14 * Math.sin(x * 1.3 - t * 1.1 + z * 0.7));
  const lat = Math.exp(-Math.pow(Math.max(0, z - 0.2) / w, 2.2));
  const along = 1 - sstep(front - 2.2, front, x);
  return clamp01(1.5 * along * lat * sstep(-1.1, 0.4, dx) * sstep(T_RAW, T_RAW + 0.6, t));
}

function rippleNormals() { // mapa de normais ladrilhável (soma de senos com frequências inteiras)
  const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const g = cv.getContext('2d'), im = g.createImageData(N, N), W = [[1, 2, 0.9, 0], [3, -1, 0.6, 1.3], [-2, 3, 0.5, 2.1], [5, 2, 0.3, 0.7], [-4, -5, 0.25, 4.2], [7, -3, 0.16, 5.1], [2, 8, 0.14, 3.3]];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let dx = 0, dy = 0; const u = (x / N) * L.TAU, v = (y / N) * L.TAU;
    for (const [a, b, amp, ph] of W) { const c = Math.cos(a * u + b * v + ph) * amp; dx += c * a; dy += c * b; }
    const nx = -dx * 0.11, ny = -dy * 0.11, l = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
    im.data[i] = (nx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}

export function buildWater() {
  const grp = new THREE.Group(), xs = [], zs = [];
  for (let x = X0; x <= X1 + 1e-6; x += 0.3) xs.push(Math.min(X1, x));
  for (let z = -1.5; z <= Z1 + 1e-6; z += 0.3) zs.push(Math.min(Z1, z));
  const nx = xs.length, nz = zs.length;
  const material = (o) => L.mat(0xffffff, { vertexColors: true, transparent: true, depthWrite: false, roughness: 0.3, metalness: 0, envMapIntensity: 0.22, side: THREE.DoubleSide, ...o });
  const mk = (n, idx, m, order) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4)); g.setIndex(idx);
    const me = L.mesh(g, m, 0, 0, 0, { cast: false, receive: false }); me.renderOrder = order; me.frustumCulled = false; grp.add(me); return g;
  };
  const sIdx = []; for (let iz = 0; iz < nz - 1; iz++) for (let ix = 0; ix < nx - 1; ix++) { const a = iz * nx + ix, b = a + 1, d = a + nx, e = d + 1; sIdx.push(a, d, b, b, d, e); }
  const ripple = rippleNormals();
  const surf = mk(nx * nz, sIdx, material({ roughness: 0.16, normalMap: ripple, normalScale: new THREE.Vector2(0.95, 0.95), envMapIntensity: 0.1 }), 12);
  { const uv = new Float32Array(nx * nz * 2); for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) { uv[(iz * nx + ix) * 2] = xs[ix] / 3.2; uv[(iz * nx + ix) * 2 + 1] = zs[iz] / 3.2; } surf.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); }
  const strip = (n) => { const ix = []; for (let i = 0; i < n - 1; i++) { const a = i * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } return ix; };
  const faceM = material({ roughness: 0.6, envMapIntensity: 0.08 });
  const front = mk(nx * 2, strip(nx), faceM, 10), left = mk(nz * 2, strip(nz), faceM, 9), right = mk(nz * 2, strip(nz), faceM, 9);
  const bedF = xs.map((x) => height(x, Z1)), bedL = zs.map((z) => Math.min(YW, height(X0, z))), bedR = zs.map((z) => Math.min(YW, height(X1, z)));
  const cClean = C('#0b74bd'), cShallow = C('#2ba6dd'), cOut = C('#6fd2f4'), cDirty = C('#6b4526'), cFace = C('#1c8fd6'), cFaceLow = C('#0b4f86'), cDirtyLow = C('#3d2614'), c = new THREE.Color(), c2 = new THREE.Color();
  function setV(g, i, x, y, z, col, a) { const p = g.attributes.position.array, q = g.attributes.color.array; p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; q[i * 4] = col.r; q[i * 4 + 1] = col.g; q[i * 4 + 2] = col.b; q[i * 4 + 3] = a; }
  function faceCol(x, z, t, g, i, top, bot) {
    const pl = plume(x, z, t);
    c.copy(cFace).lerp(cDirty, pl); setV(g, i, x, top, z, c, lerp(0.3, 0.93, pl));
    c2.copy(cFaceLow).lerp(cDirtyLow, pl); setV(g, i + 1, x, bot, z, c2, lerp(0.5, 0.97, pl));
  }
  function update(t) {
    ripple.offset.set(-t * 0.11, t * 0.035);
    for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
      const x = xs[ix], z = zs[iz], pl = plume(x, z, t), sh = sstep(2.6, 0.2, z);
      const ro = Math.hypot((x - XA - 0.5) * 0.6, z - 2.2);
      c.copy(cClean).lerp(cShallow, sh * 0.6).lerp(cOut, 0.4 * Math.exp(-ro * ro * 0.5)).lerp(cDirty, pl);
      setV(surf, iz * nx + ix, x, YW + wave(x, z, t), z, c, lerp(lerp(0.92, 0.7, sh), 0.97, pl));
    }
    for (let ix = 0; ix < nx; ix++) faceCol(xs[ix], Z1, t, front, ix * 2, YW + wave(xs[ix], Z1, t), bedF[ix]);
    for (let iz = 0; iz < nz; iz++) { faceCol(X0, zs[iz], t, left, iz * 2, YW + wave(X0, zs[iz], t), bedL[iz]); faceCol(X1, zs[iz], t, right, iz * 2, YW + wave(X1, zs[iz], t), bedR[iz]); }
    [surf, front, left, right].forEach((g) => { g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; });
    surf.computeVertexNormals(); front.computeVertexNormals(); left.computeVertexNormals(); right.computeVertexNormals();
  }
  // "cortinas" de profundidade: tingem de azul o fundo distante e deixam nítido o que nada perto do corte
  [3.35, 1.9].forEach((z, k) => {
    const p = [], cc = [], ix = strip(nx);
    xs.forEach((x) => { const b = Math.min(YW - 0.03, height(x, z)); p.push(x, YW - 0.03, z, x, b, z); cc.push(cFace.r, cFace.g, cFace.b, 0.42, cFaceLow.r, cFaceLow.g, cFaceLow.b, 0.6); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cc, 4)); g.setIndex(ix); g.computeVertexNormals();
    const me = L.mesh(g, L.mat(0xffffff, { vertexColors: true, transparent: true, depthWrite: false, roughness: 1, envMapIntensity: 0, side: THREE.FrontSide }), 0, 0, 0, { cast: false, receive: false }); me.renderOrder = 7 + k; grp.add(me);
  });
  return { group: grp, update };
}
