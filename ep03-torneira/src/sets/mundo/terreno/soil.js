// Solo em corte (faces do bloco, cavidades das redes, paredes de escavação de outros módulos): material procedural
// que calcula a profundidade abaixo do chão (mapa de altura tSH do relevo) e pinta os horizontes de um latossolo
// (serrapilheira/húmus → horizonte A escuro → B vermelho-alaranjado → saprolito mosqueado → rocha alterada → rocha sã),
// com grãos, pedregulhos e raízes. Texturas de detalhe copiadas do Ep. 02 (terrain/soil.js).
import * as L from '../../../lib.js';
const { THREE, TAU, PAL } = L;

/* ---------- texturas de detalhe (ladrilháveis) ---------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
/** desenha f(x,y) e suas cópias nas bordas (para a textura ladrilhar sem emenda) */
function wrapDraw(W, H, x, y, r, f) { for (const dx of [0, -W, W]) for (const dy of [0, -H, H]) { if (x + dx < -r || x + dx > W + r || y + dy < -r || y + dy > H + r) continue; f(x + dx, y + dy); } }
function tex(c, o = {}) {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.colorSpace = o.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace; return t;
}
function grainTex() { // grãos de areia/silte: luminância em torno de 0,5
  const N = 1024, [c, g] = canvas(N, N), rd = L.rng(311);
  g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 3200; i++) { const v = 100 + rd() * 56, r = 10 + rd() * 40; g.fillStyle = `rgba(${v},${v},${v},.18)`; wrapDraw(N, N, rd() * N, rd() * N, r, (x, y) => { g.beginPath(); g.ellipse(x, y, r, r * (0.35 + rd() * 0.4), rd() * 0.6 - 0.3, 0, TAU); g.fill(); }); }
  for (let i = 0; i < 42000; i++) { const lt = rd() < 0.5, s = 0.8 + rd() * 2.6, x = rd() * N, y = rd() * N; g.fillStyle = lt ? `rgba(235,235,235,${0.18 + rd() * 0.3})` : `rgba(20,20,20,${0.16 + rd() * 0.3})`; g.fillRect(x, y, s, s * (0.5 + rd() * 0.6)); }
  return tex(c, { srgb: false });
}
function stonesTex(N, n, rMin, rMax, seed, warm) { // pedregulhos com sombra, volume e contorno
  const [c, g] = canvas(N, N), rd = L.rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) list.push({ x: rd() * N, y: rd() * N, r: rMin + Math.pow(rd(), 2.2) * (rMax - rMin), e: 0.5 + rd() * 0.4, a: rd() * 3.1, v: rd(), w: rd() });
  list.sort((a, b) => a.y - b.y);
  for (const s of list) wrapDraw(N, N, s.x, s.y, s.r * 2, (x, y) => {
    g.save(); g.translate(x, y); g.rotate(s.a * 0.35 - 0.5);
    g.fillStyle = 'rgba(15,8,3,.38)'; g.beginPath(); g.ellipse(s.r * 0.18, s.r * 0.22, s.r * 1.12, s.r * s.e * 1.18, 0, 0, TAU); g.fill();
    const base = warm ? [[150, 128, 104], [178, 160, 136], [122, 116, 108], [196, 184, 160], [140, 102, 70]][Math.floor(s.w * 5)] : [[132, 130, 126], [160, 154, 144], [110, 108, 104], [176, 166, 150], [126, 110, 92]][Math.floor(s.w * 5)];
    const k = 0.8 + s.v * 0.4, col = (m) => `rgb(${Math.round(base[0] * k * m)},${Math.round(base[1] * k * m)},${Math.round(base[2] * k * m)})`;
    const gr = g.createRadialGradient(-s.r * 0.35, -s.r * 0.35 * s.e, s.r * 0.08, 0, 0, s.r * 1.05);
    gr.addColorStop(0, col(1.28)); gr.addColorStop(0.55, col(1.0)); gr.addColorStop(1, col(0.62));
    g.fillStyle = gr; g.beginPath();
    for (let j = 0; j <= 14; j++) { const a = (j / 14) * TAU, rr = s.r * (1 + 0.1 * Math.sin(a * 3 + s.v * 9) + 0.06 * Math.sin(a * 5 + s.w * 7)); const px = Math.cos(a) * rr, py = Math.sin(a) * rr * s.e; j ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(30,20,12,.45)'; g.lineWidth = Math.max(0.6, s.r * 0.07); g.stroke();
    if (s.r > 6) { g.strokeStyle = 'rgba(255,250,240,.25)'; g.lineWidth = Math.max(0.5, s.r * 0.05); g.beginPath(); g.ellipse(-s.r * 0.2, -s.r * 0.25 * s.e, s.r * 0.45, s.r * 0.25 * s.e, 0, 3.6, 5.4); g.stroke(); }
    g.restore();
  });
  return tex(c);
}
function rootsTex() { // raízes e fibras na camada de cima (u = horizontal, v = profundidade: topo em cima)
  const W = 2048, H = 512, [c, g] = canvas(W, H), rd = L.rng(517);
  const root = (x, y, ang, w, len, dark, depth) => {
    g.strokeStyle = dark ? `rgba(48,30,16,${0.55 + rd() * 0.3})` : `rgba(206,176,128,${0.35 + rd() * 0.3})`; g.lineCap = 'round';
    let px = x, py = y;
    for (let i = 0; i < len; i++) {
      ang += (rd() - 0.5) * 0.5; ang = Math.min(Math.PI * 0.92, Math.max(Math.PI * 0.08, ang));
      const nx = px + Math.cos(ang) * 9, ny = py + Math.sin(ang) * 9;
      g.lineWidth = Math.max(0.6, w * (1 - i / len)); wrapDraw(W, 1e9, px, 0, 20, (ox) => { g.beginPath(); g.moveTo(ox, py); g.lineTo(ox + (nx - px), ny); g.stroke(); });
      px = nx; py = ny;
      if (depth < 2 && rd() < 0.07) root(px, py, ang + (rd() < 0.5 ? -0.8 : 0.8), w * 0.55, Math.floor(len * 0.5), dark, depth + 1);
      if (py > H) break;
    }
  };
  for (let i = 0; i < 70; i++) root(rd() * W, 0, Math.PI / 2 + (rd() - 0.5) * 0.6, 2.5 + rd() * 4.5, 18 + Math.floor(rd() * 40), rd() < 0.75, 0);
  for (let i = 0; i < 160; i++) root(rd() * W, rd() * 40, Math.PI / 2 + (rd() - 0.5) * 1.2, 0.9 + rd() * 1.4, 4 + Math.floor(rd() * 10), rd() < 0.6, 2);
  const t = tex(c); t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
let _T = null;
export function soilTextures() { if (!_T) _T = { grain: grainTex(), pebA: stonesTex(2048, 2600, 2.5, 10, 41, true), pebB: stonesTex(2048, 210, 6, 30, 73, false), roots: rootsTex() }; return _T; }
export { tex, canvas, wrapDraw, stonesTex };

const C = (h) => new THREE.Color(h);
/** kit de solo: uniforms compartilhados e fábrica de materiais. dims: { X0, X1, Z0, Z1, nx, nz } do mapa tSH */
export function soilKit(hTex, dims) {
  const T = soilTextures();
  const U = {
    tSH: { value: hTex }, tSGrain: { value: T.grain }, tSPebA: { value: T.pebA }, tSPebB: { value: T.pebB }, tSRoot: { value: T.roots },
    cHum: { value: C('#33251a') }, cTop: { value: C('#5a3e2b') }, cB: { value: C('#9a5a36') }, cB2: { value: C('#b36e3e') },
    cSap: { value: C('#b8925e') }, cSap2: { value: C('#cf9f6a') }, cWeath: { value: C('#8d7a66') }, cRock: { value: C('#6b6862') }
  };
  const defs = `#define SX0 ${dims.X0.toFixed(3)}\n#define SX1 ${dims.X1.toFixed(3)}\n#define SZ0 ${dims.Z0.toFixed(3)}\n#define SZ1 ${dims.Z1.toFixed(3)}\n#define SHN vec2(${dims.nx.toFixed(1)}, ${dims.nz.toFixed(1)})\n`;
  const fragHead = `
uniform sampler2D tSH, tSGrain, tSPebA, tSPebB, tSRoot;
uniform vec3 cHum, cTop, cB, cB2, cSap, cSap2, cWeath, cRock;
varying vec3 vSWP; varying vec3 vSWN;
float soilH(vec2 xz) { vec2 uv = (xz - vec2(SX0, SZ0)) / vec2(SX1 - SX0, SZ1 - SZ0); uv = clamp(uv, 0.0, 1.0) * (SHN - 1.0) / SHN + 0.5 / SHN; return texture2D(tSH, uv).r; }
`;
  const fragMain = `
  float su = abs(vSWN.x) > abs(vSWN.z) ? vSWP.z : vSWP.x;
  float sy = vSWP.y, sg = soilH(vSWP.xz), sd = max(0.0, sg - sy);
  float wv = 0.22 * sin(su * 0.13 + 0.4) + 0.12 * sin(su * 0.47 + 1.3) + 0.05 * sin(su * 1.9 + 0.2);
  float dd = sd + wv;
  // horizontes por profundidade
  float mott = 0.5 + 0.5 * sin(su * 2.3 + sy * 3.1) * sin(su * 0.9 - sy * 1.7 + 1.0);
  vec3 c = cRock; float wB = 1.0, wA = 0.25;
  float kW = 1.0 - smoothstep(10.0, 11.5, dd + 1.2 * sin(su * 0.21)); c = mix(c, cWeath, kW); wB = mix(wB, 0.85, kW); wA = mix(wA, 0.6, kW);
  float kS = 1.0 - smoothstep(5.2, 6.4, dd + 0.6 * sin(su * 0.33 + 2.0)); c = mix(c, mix(cSap, cSap2, mott), kS); wB = mix(wB, 0.35, kS); wA = mix(wA, 0.45, kS);
  float kB = 1.0 - smoothstep(1.7, 2.4, dd); c = mix(c, mix(cB, cB2, smoothstep(0.6, 1.8, dd)), kB); wB = mix(wB, 0.12, kB); wA = mix(wA, 0.25, kB);
  float kT = 1.0 - smoothstep(0.45, 0.7, dd); c = mix(c, cTop, kT); wB *= 1.0 - kT * 0.8; wA = mix(wA, 0.12, kT);
  float kH = 1.0 - smoothstep(0.05, 0.15, sd); c = mix(c, cHum, kH); wB *= 1.0 - kH; wA *= 1.0 - kH;
  // rocha: fraturas inclinadas
  float fr = (1.0 - kW) * (1.0 - smoothstep(0.0, 0.05, abs(fract(su * 0.18 + sy * 0.11 + 0.15 * sin(sy * 0.7)) - 0.5) - 0.45));
  c = mix(c, c * 0.55, fr * 0.7);
  c *= 0.93 + 0.07 * sin(su * 0.7 + sin(sy * 2.1) * 1.5);
  float sgr = texture2D(tSGrain, vec2(su, sy) * 0.25).r;
  c *= 0.76 + 0.48 * sgr;
  if (sd < 1.7) { vec4 rt = texture2D(tSRoot, vec2(su / 6.0, 1.0 - sd / 1.7)); c = mix(c, rt.rgb, rt.a * (1.0 - smoothstep(1.1, 1.7, sd))); }
  vec4 pa = texture2D(tSPebA, vec2(su, sy) * 0.2), pb = texture2D(tSPebB, vec2(su + 3.7, sy + 1.3) / 9.0);
  c = mix(c, pa.rgb * (0.85 + 0.3 * sgr), pa.a * wA);
  c = mix(c, pb.rgb, pb.a * wB);
  diffuseColor.rgb = c * SOIL_TINT;
  float sBump = 0.025 * pa.a * wA + 0.05 * pb.a * wB + 0.006 * sgr;
`;
  const bump = `
  { vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition); float hx = dFdx(sBump), hy = dFdy(sBump);
    vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx); float det = dot(dpx, r1) * faceDirection;
    normal = normalize(abs(det) * normal - sign(det) * (hx * r1 + hy * r2)); }
`;
  function material(o = {}) {
    const m = L.mat(0xffffff, { roughness: 0.93, metalness: 0, side: o.side ?? THREE.DoubleSide });
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSWP; varying vec3 vSWN;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vSWN = normalize(mat3(modelMatrix) * objectNormal);');
      sh.fragmentShader = defs + `#define SOIL_TINT ${(o.tint ?? 1).toFixed(3)}\n` + sh.fragmentShader
        .replace('#include <common>', '#include <common>\n' + fragHead)
        .replace('#include <map_fragment>', fragMain)
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + bump);
    };
    m.customProgramCacheKey = () => 'ep3-soil-v1-' + (o.tint ?? 1);
    return m;
  }
  return { U, material };
}
