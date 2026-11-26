// Ep. 03 — módulo micro: kit de peças do mundo ampliado (geometrias, materiais, pools instanciados, rótulos).
// Tudo determinístico (L.rng). Nada aqui é criado no update.

/** ruído suave determinístico em 3D (soma de senos com fases fixas): usado para deformar grãos e partículas */
export function smoothNoise(x, y, z, s = 1) {
  return (Math.sin(x * 2.1 * s + 1.3) * Math.cos(y * 1.7 * s + 0.4) + Math.sin(y * 2.9 * s + 2.2) * Math.cos(z * 2.3 * s + 1.1)
    + Math.sin(z * 1.9 * s + 0.7) * Math.cos(x * 2.6 * s + 2.9)) / 3;
}

/** "movimento browniano" determinístico: soma de 3 senos por eixo com frequências/fases próprias de cada partícula */
export function makeBrown(R) {
  const f = [], p = [];
  for (let i = 0; i < 9; i++) { f.push(0.35 + R() * 1.1); p.push(R() * Math.PI * 2); }
  return (t, amp, out) => {
    out.x = amp * (Math.sin(f[0] * t + p[0]) + 0.55 * Math.sin(f[1] * 1.9 * t + p[1]) + 0.3 * Math.sin(f[2] * 3.3 * t + p[2]));
    out.y = amp * (Math.sin(f[3] * t + p[3]) + 0.55 * Math.sin(f[4] * 1.9 * t + p[4]) + 0.3 * Math.sin(f[5] * 3.3 * t + p[5]));
    out.z = amp * 0.6 * (Math.sin(f[6] * t + p[6]) + 0.5 * Math.sin(f[7] * 2.1 * t + p[7]));
    return out;
  };
}

/** Pool de instâncias: begin() → add(...) → end(). Contagem e matrizes refeitas a cada quadro (função pura de t). */
export class Pool {
  constructor(THREE, parent, geo, mat, max, o = {}) {
    this.T = THREE; this.max = max; this.n = 0;
    this.m = new THREE.InstancedMesh(geo, mat, max);
    this.m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.m.frustumCulled = false; this.m.count = 0; this.m.renderOrder = o.order ?? 0;
    if (o.color !== false) { const c = new THREE.Color(o.color || '#ffffff'); for (let i = 0; i < max; i++) this.m.setColorAt(i, c); }
    this.d = new THREE.Object3D(); this.d.rotation.order = 'ZYX';
    parent.add(this.m);
  }
  begin() { this.n = 0; }
  /** p: posição {x,y,z}; r: rotação [rx,ry,rz]; s: escala (número ou [sx,sy,sz]); c: THREE.Color opcional */
  add(p, r, s, c) {
    if (this.n >= this.max) return -1;
    const d = this.d; d.position.set(p.x, p.y, p.z);
    if (r) d.rotation.set(r[0], r[1], r[2]); else d.rotation.set(0, 0, 0);
    if (typeof s === 'number') d.scale.set(s, s, s); else d.scale.set(s[0], s[1], s[2]);
    d.updateMatrix(); this.m.setMatrixAt(this.n, d.matrix);
    if (c && this.m.instanceColor) this.m.setColorAt(this.n, c);
    return this.n++;
  }
  /** variante com quaternion pronto */
  addQ(p, q, s, c) {
    if (this.n >= this.max) return -1;
    const d = this.d; d.position.set(p.x, p.y, p.z); d.quaternion.copy(q);
    if (typeof s === 'number') d.scale.set(s, s, s); else d.scale.set(s[0], s[1], s[2]);
    d.updateMatrix(); this.m.setMatrixAt(this.n, d.matrix);
    if (c && this.m.instanceColor) this.m.setColorAt(this.n, c);
    return this.n++;
  }
  end() {
    this.m.count = this.n; this.m.visible = this.n > 0;
    this.m.instanceMatrix.needsUpdate = true; if (this.m.instanceColor) this.m.instanceColor.needsUpdate = true;
  }
}

/* ---------------- texturas de canvas ---------------- */
function canvasTex(THREE, w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
}
/** disco desfocado (bokeh / halo) */
export const softTex = (THREE, inner = 0.0, ring = 0) => canvasTex(THREE, 128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  if (ring) { gr.addColorStop(0, 'rgba(255,255,255,0.25)'); gr.addColorStop(0.72, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.86, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  else { gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(Math.max(0.01, inner), 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); }
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
/** fundo: degradê radial (campo escuro) ou vertical (vista lateral do decantador) */
export const bgTex = (THREE, kind) => canvasTex(THREE, 512, 512, (g, w) => {
  let gr;
  if (kind === 'vertical') { gr = g.createLinearGradient(0, 0, 0, w); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#b9b9b9'); gr.addColorStop(1, '#3a3a3a'); }
  else { gr = g.createRadialGradient(w * 0.42, w * 0.36, 0, w / 2, w / 2, w * 0.62); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#8d8d8d'); gr.addColorStop(1, '#262626'); }
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
  // grão fino, como luz espalhada na água
  const R = mulberry(7); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.05})`; g.fillRect(R() * w, R() * w, 1 + R() * 2, 1 + R() * 2); }
});
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** selo de carga: círculo com sinal (− ou +) */
export const chargeTex = (THREE, sign, fill, ink) => canvasTex(THREE, 128, 128, (g, w) => {
  g.beginPath(); g.arc(w / 2, w / 2, w * 0.43, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
  g.lineWidth = w * 0.06; g.strokeStyle = 'rgba(10,14,20,0.75)'; g.stroke();
  g.fillStyle = ink; const L = w * 0.46, T = w * 0.13; g.fillRect(w / 2 - L / 2, w / 2 - T / 2, L, T);
  if (sign === '+') g.fillRect(w / 2 - T / 2, w / 2 - L / 2, T, L);
});

/* ---------------- geometrias ---------------- */
function jitterGeo(geo, amt, seedScale, flat) {
  const p = geo.attributes.position, v = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < p.count; i++) {
    v.x = p.getX(i); v.y = p.getY(i); v.z = p.getZ(i);
    const n = smoothNoise(v.x * seedScale, v.y * seedScale, v.z * seedScale, 1.7), k = 1 + amt * n;
    p.setXYZ(i, v.x * k, v.y * k, v.z * k);
  }
  if (flat) { const g2 = geo.index ? geo.toNonIndexed() : geo; g2.computeVertexNormals(); return g2; }
  geo.computeVertexNormals(); return geo;
}

export function buildGeos(L) {
  const { THREE, BGU } = L, R = L.rng(311), G = {};
  // placa de argila: polígono irregular extrudado fino, bordas chanfradas (2 variantes)
  const plate = (seed, nv) => {
    const r = L.rng(seed), s = new THREE.Shape();
    for (let i = 0; i < nv; i++) { const a = (i / nv) * Math.PI * 2 + (r() - 0.5) * 0.5, rr = 0.7 + r() * 0.45; const x = Math.cos(a) * rr, y = Math.sin(a) * rr * (0.75 + r() * 0.2); i ? s.lineTo(x, y) : s.moveTo(x, y); }
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.07, bevelSegments: 1, steps: 1 });
    g.translate(0, 0, -0.08); g.computeVertexNormals(); return g;
  };
  G.clayA = plate(5, 7); G.clayB = plate(9, 9);
  // silte / grão anguloso pequeno
  G.silt = jitterGeo(new THREE.IcosahedronGeometry(1, 0), 0.35, 1.3, true);
  // antracito: anguloso, facetas grandes (alongado)
  { const g = jitterGeo(new THREE.IcosahedronGeometry(1, 1), 0.28, 0.9, true); g.scale(1.08, 0.92, 0.95); G.anth = g; }
  // areia: arredondada, irregular suave
  G.sand = jitterGeo(new THREE.SphereGeometry(1, 22, 16), 0.16, 0.8, false);
  // matéria orgânica: fragmento grumoso alongado + fibra torcida
  { const g = jitterGeo(new THREE.IcosahedronGeometry(1, 2), 0.42, 2.2, false); g.scale(1.7, 0.62, 0.55); G.org = g; }
  { const pts = []; for (let i = 0; i <= 8; i++) pts.push(new THREE.Vector3(-1 + i * 0.25, Math.sin(i * 0.9) * 0.22, Math.cos(i * 1.3) * 0.12));
    G.fiber = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.07, 6, false); }
  // bactéria em bastonete (ao longo de x) e com flagelo
  { const g = new THREE.CapsuleGeometry(0.075, 0.26, 6, 14); g.rotateZ(Math.PI / 2); G.rod = g;
    const pts = []; for (let i = 0; i <= 12; i++) pts.push(new THREE.Vector3(-0.2 - i * 0.045, Math.sin(i * 1.1) * 0.035, Math.cos(i * 1.1) * 0.02));
    const fl = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 36, 0.009, 4, false);
    G.rodFlag = BGU.mergeGeometries([g.clone(), fl]); }
  // cocos: par (diplococo) e cadeia (estreptococo)
  { const s = (x) => { const q = new THREE.SphereGeometry(0.078, 14, 10); q.translate(x, 0, 0); return q; };
    G.diplo = BGU.mergeGeometries([s(-0.07), s(0.07)]);
    G.chain = BGU.mergeGeometries([s(-0.21), s(-0.07), s(0.07), s(0.21)]); }
  // cisto/oocisto: casca (esfera; escala por instância) e núcleos internos
  G.shell = new THREE.SphereGeometry(1, 26, 18);
  G.nucleus = new THREE.SphereGeometry(1, 12, 8);
  // íon / molécula: esferas
  G.ball = new THREE.SphereGeometry(1, 14, 10);
  // HOCl (O vermelho, Cl verde, H branco) e OCl⁻ (sem H): cores por vértice
  { const atom = (r, x, y, col) => { const q = new THREE.SphereGeometry(r, 14, 10); q.translate(x, y, 0); const c = new THREE.Color(col), n = q.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } q.setAttribute('color', new THREE.BufferAttribute(a, 3)); return q; };
    G.hocl = BGU.mergeGeometries([atom(0.13, 0.1, 0, '#46d86e'), atom(0.085, -0.07, 0, '#e8584a'), atom(0.05, -0.12, 0.08, '#f2f2f2')]);
    G.ocl = BGU.mergeGeometries([atom(0.13, 0.09, 0, '#46d86e'), atom(0.085, -0.08, 0, '#e8584a')]); }
  // plano (bokeh, selos, halos)
  G.plane = new THREE.PlaneGeometry(1, 1);
  // seta fina (chevron) apontando para +x
  { const s = new THREE.Shape(); s.moveTo(-0.5, 0.32); s.lineTo(0.12, 0.32); s.lineTo(0.12, 0.62); s.lineTo(0.62, 0); s.lineTo(0.12, -0.62); s.lineTo(0.12, -0.32); s.lineTo(-0.5, -0.32); s.closePath(); G.dart = new THREE.ShapeGeometry(s); }
  // tique do relógio de tempo de contato
  G.tick = new THREE.PlaneGeometry(1, 1);
  return G;
}

export function buildMats(L) {
  const { THREE } = L, M = {};
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
  M.clay = std('#ffffff', { roughness: 0.8 });                     // cor por instância (marrons)
  M.silt = std('#ffffff', { roughness: 0.7, flatShading: true });
  M.org = std('#ffffff', { roughness: 0.9, transparent: true, opacity: 0.88 });
  M.bact = std('#ffffff', { roughness: 0.35, emissive: '#2a0a1a', emissiveIntensity: 1 });
  M.shell = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.2, clearcoat: 1, transparent: true, opacity: 0.62, depthWrite: false, emissive: '#6a3c08', emissiveIntensity: 1 });
  M.nucleus = std('#ffffff', { roughness: 0.5 });
  M.anth = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.22, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15, flatShading: true });
  M.sand = std('#ffffff', { roughness: 0.85 });
  M.ion = new THREE.MeshStandardMaterial({ color: '#ffd24a', emissive: '#ffb000', emissiveIntensity: 1.2, roughness: 0.3, metalness: 0.3 });
  M.chlor = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.3, emissive: '#0c3a18', emissiveIntensity: 1 });
  const soft = softTex(THREE, 0.15), ring = softTex(THREE, 0, 1);
  M.bokeh = new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  M.halo = new THREE.MeshBasicMaterial({ map: soft, transparent: true, depthWrite: false, opacity: 0.55, toneMapped: false });
  M.ring = new THREE.MeshBasicMaterial({ map: ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  M.minus = new THREE.MeshBasicMaterial({ map: chargeTex(THREE, '-', '#ff6b5e', '#ffffff'), transparent: true, depthWrite: false, toneMapped: false });
  M.plus = new THREE.MeshBasicMaterial({ map: chargeTex(THREE, '+', '#ffd24a', '#3a2400'), transparent: true, depthWrite: false, toneMapped: false });
  M.dart = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  M.tick = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, depthWrite: false, depthTest: false });
  return M;
}

/* ---------------- rótulos (sprite com CanvasTexture + haste até o alvo) ---------------- */
export function makeLabel(L, parent, text, o = {}) {
  const { THREE } = L, lines = text.split('\n'), fs = 64, pad = 22, lh = fs * 1.12;
  const meas = document.createElement('canvas').getContext('2d'); meas.font = `800 ${fs}px Montserrat, Inter, sans-serif`;
  const tw = Math.max(...lines.map((l) => meas.measureText(l).width));
  const w = Math.ceil(tw + pad * 2 + 16), h = Math.ceil(lh * lines.length + pad * 2);
  const tex = canvasTex(THREE, w, h, (g) => {
    g.font = `800 ${fs}px Montserrat, Inter, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    lines.forEach((l, i) => {
      const y = pad + lh * (i + 0.5);
      g.lineWidth = 16; g.strokeStyle = 'rgba(3,10,16,0.92)'; g.strokeText(l, w / 2, y);
      g.fillStyle = o.color || '#ffffff'; g.fillText(l, w / 2, y);
    });
  });
  const height = (o.size ?? 0.36) * lines.length * 1.12 + (o.size ?? 0.36) * 0.7;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  sp.scale.set(height * w / h, height, 1); sp.renderOrder = 30; parent.add(sp);
  // haste: faixa fina (plano) + anel no alvo
  const stemMat = new THREE.MeshBasicMaterial({ color: '#e6f8ff', transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
  const stem = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stemMat); stem.renderOrder = 29; parent.add(stem);
  const dot = new THREE.Mesh(new THREE.RingGeometry(0.075, 0.115, 24), stemMat); dot.renderOrder = 29; parent.add(dot);
  const lab = { sp, stem, dot, h: height, w: height * w / h,
    /** a: opacidade; at: posição do texto; target: ponto apontado (ou null) */
    set(a, at, target) {
      const vis = a > 0.01; sp.visible = vis; stem.visible = dot.visible = vis && !!target;
      if (!vis) return;
      sp.material.opacity = a; stemMat.opacity = 0.9 * a;
      const pop = 0.85 + 0.15 * L.ease.back(L.clamp01(a)); sp.scale.set(lab.w * pop, lab.h * pop, 1);
      // plano dos rótulos preso à câmera (a LD = 7 dela): o texto fica parado na lente enquanto a câmera deriva
      const c = CAMPOS, PZ = c.z - LD, ax = c.x + at.x, ay = c.y + at.y;
      sp.position.set(ax, ay, PZ);
      if (target) {
        // a haste sai da borda do texto (em cima ou embaixo) até o alvo projetado no plano dos rótulos
        const tz = target.z ?? 0, kz = (PZ - c.z) / (tz - c.z), tx = c.x + (target.x - c.x) * kz, ty = c.y + (target.y - c.y) * kz;
        at = { x: ax, y: ay };
        const sy = ty > at.y ? at.y + lab.h * 0.42 : at.y - lab.h * 0.42, sx = L.lerp(at.x, tx, 0.15);
        const dx = tx - sx, dy = ty - sy, len = Math.hypot(dx, dy) - 0.1;
        if (len < 0.08) { stem.visible = false; } else {
          stem.position.set(sx + dx * (len / 2) / (len + 0.1), sy + dy * (len / 2) / (len + 0.1), PZ);
          stem.rotation.set(0, 0, Math.atan2(dy, dx)); stem.scale.set(len, 0.035, 1);
        }
        dot.position.set(tx, ty, PZ);
      }
    } };
  lab.set(0);
  return lab;
}
/** posição atual da câmera da lente (atualizada pelo micro.js a cada quadro) — para projetar o alvo no plano dos rótulos */
export const CAMPOS = { x: 0, y: 0, z: 9 };
const LD = 7;   // distância câmera → plano dos rótulos (meia altura visível = 7·tan 21° ≈ 2,69)
