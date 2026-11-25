// Estrutura de lançamento (muro de ala), jatos d'água, boca do valão, copo com sinal de proibido, lixo.
import * as L from '../../lib.js';
import { K, G, TM, Merge, vmat, circlePts, blob, Bubbles } from './util.js';
import { height, creekCurve, creekBedY } from './terrain.js';
import { rockGeo } from './nature.js';
const { THREE, TAU, PAL, V, lerp, sstep, clamp01 } = L;
const { XA, XB, YW } = K, HP = Math.PI / 2;

export const PIPE_Y = -0.2, PIPE_R = 0.33, APRON_Y = -0.93;

/* ---------- muro de ala com tubo de saída, laje, blocos dissipadores, guarda-corpo e enrocamento ---------- */
export function makeHeadwall() {
  const g = L.group(null, XA, 0, 0), m = new Merge();
  const conc = (x, y, z, c) => c.set('#b4b8b6').multiplyScalar(0.88 + 0.12 * Math.sin(x * 9 + y * 13) * Math.sin(z * 11 + y * 5)).lerp(new THREE.Color('#7d8a6e'), clamp01((-0.55 - y) * 1.3) * 0.5);
  m.add(G.extrude([[-1.36, -1.45], [1.36, -1.45], [1.36, 0.55], [-1.36, 0.55]], 0.32, 0.012, [circlePts(PIPE_R + 0.085, 28, 0, PIPE_Y)]), conc, TM(0, 0, -0.32));
  m.add(G.rbox(2.9, 0.1, 0.46, 0.02), '#8d959a', TM(0, 0.6, -0.16));
  const a = 0.56, wl = 2.0;
  [1, -1].forEach((s) => {
    const geo = G.extrude([[0, -1.45], [wl, -1.45], [wl, -0.72], [0, 0.55]], 0.24, 0.012); geo.translate(0, 0, -0.12);
    m.add(geo, conc, TM(s * 1.3, 0, -0.04, 0, s > 0 ? a - HP : -(HP + a), 0));
  });
  m.add(G.extrude([[-1.3, -0.05], [1.3, -0.05], [1.3 + Math.sin(a) * wl, Math.cos(a) * wl], [-1.3 - Math.sin(a) * wl, Math.cos(a) * wl]], 0.3, 0), conc, TM(0, APRON_Y, 0, HP, 0, 0));
  for (let i = 0; i < 5; i++) m.add(G.rbox(0.22, 0.2, 0.22, 0.03), PAL.concreteDark, TM(-1.0 + i * 0.5, APRON_Y + 0.1, 1.25 + (i % 2) * 0.22));  // blocos dissipadores
  m.add(G.box(3.9, 0.12, 0.14), PAL.concreteDark, TM(0, APRON_Y + 0.02, Math.cos(a) * wl - 0.07));
  // tubo de concreto com bolsa
  const Lp = 3.9;
  m.add(G.lathe([[PIPE_R, 0], [PIPE_R + 0.13, 0], [PIPE_R + 0.13, 0.16], [PIPE_R + 0.08, 0.2], [PIPE_R + 0.08, Lp], [PIPE_R, Lp], [PIPE_R, 0]], 32), (x, y, z, c) => c.set('#a9aeae').multiplyScalar((0.86 + 0.14 * Math.sin(y * 21)) * (Math.abs((y % 1) - 0.5) < 0.035 ? 0.55 : 1)), TM(0, PIPE_Y, 0.24, -HP, 0, 0));
  for (let i = 0; i < 6; i++) m.add(G.torus(PIPE_R - 0.004, 0.014, 6, 32), '#6f7676', TM(0, PIPE_Y, -0.2 - i * 0.62));   // juntas do tubo
  // guarda-corpo amarelo
  m.rail([-1.3, 0.65, -0.3], [1.3, 0.65, -0.3], 0.55, PAL.yellow, 0.022);
  m.rail([-1.3, 0.65, -0.3], [-1.3, 0.65, -1.3], 0.55, PAL.yellow, 0.022).rail([1.3, 0.65, -0.3], [1.3, 0.65, -1.3], 0.55, PAL.yellow, 0.022);
  // régua de nível
  m.add(G.box(0.12, 1.2, 0.02), '#f7f7f2', TM(-0.95, -0.75, 0.02));
  for (let i = 0; i < 11; i++) m.add(G.box(i % 2 ? 0.05 : 0.08, 0.02, 0.022), i % 5 === 0 ? '#d8433a' : '#1e2730', TM(-0.97, -1.3 + i * 0.11, 0.022));
  g.add(m.mesh(vmat({ roughness: 0.85 })));
  const cap = L.mesh(new THREE.CircleGeometry(PIPE_R, 24), L.flat('#12384f'), 0, PIPE_Y, 0.24 - Lp + 0.02, { cast: false, receive: false }); g.add(cap);
  // enrocamento
  g.add(L.scatter(rockGeo(4), L.mat('#ffffff', { roughness: 0.9, flatShading: true }), 110, (i, r, d) => {
    let x, z, tries = 0;
    do { x = (r() - 0.5) * 6.2; z = -0.1 + r() * 2.7; } while (++tries < 20 && z < 1.62 && Math.abs(x) < 1.3 + Math.max(0, z) * 0.62 + 0.15);
    const s = 0.1 + r() * 0.17, inside = Math.abs(x) < 1.3 + Math.max(0, z) * 0.62 && z < 1.8;
    d.position.set(x, Math.max(height(XA + x, z), inside ? -1.4 : -9) + s * 0.3, z); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * (0.9 + r() * 0.5), s * (0.7 + r() * 0.4), s * (0.9 + r() * 0.4));
    return new THREE.Color(PAL.rock).offsetHSL(0.02 * (r() - 0.5), 0, (r() - 0.5) * 0.2);
  }, 14));
  return g;
}

/* ---------- água: dentro do tubo, jato em arco, lâmina sobre a laje ---------- */
const ZL = 0.24, ZI = 0.98; // lábio do tubo e ponto de impacto na laje
const arcY = (z) => (PIPE_Y - PIPE_R + 0.16) - (PIPE_Y - PIPE_R + 0.16 - APRON_Y - 0.02) * Math.pow((z - ZL) / (ZI - ZL), 2);
export function makeCleanStream() {
  const g = L.group(null, XA, 0, 0), wm = L.water('#2aa9ea', 0.88, { roughness: 0.25, envMapIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false });
  // água parada no fundo do tubo
  const lvl = PIPE_Y - PIPE_R + 0.17, half = Math.sqrt(PIPE_R * PIPE_R - Math.pow(PIPE_R - 0.17, 2));
  const inP = L.mesh(new THREE.PlaneGeometry(half * 2, 3.9), wm, 0, lvl, ZL - 1.95, { cast: false }); inP.rotation.x = -HP; inP.renderOrder = 13; g.add(inP);
  // jato em arco (seção em meia-lua)
  const rings = [];
  for (let i = 0; i <= 14; i++) {
    const z = lerp(ZL - 0.02, ZI, i / 14), y = arcY(Math.max(ZL, z)), w = lerp(half, half * 1.25, i / 14), ring = [];
    for (let j = 0; j <= 8; j++) { const a = (j / 8) * Math.PI; ring.push(V(Math.cos(a) * w, y + Math.sin(a) * 0.035 - 0.17 * (1 - i / 14) * (1 - Math.sin(a)) * 0.0, z)); }
    rings.push(ring);
  }
  const arc = L.loft(rings, wm); arc.castShadow = false; arc.renderOrder = 13; g.add(arc);
  // lâmina que se abre sobre a laje
  const sheetR = []; for (let i = 0; i <= 8; i++) { const z = lerp(ZI - 0.1, 1.95, i / 8), w = lerp(half * 1.2, 1.5, Math.pow(i / 8, 0.8)); sheetR.push([V(-w, APRON_Y + 0.025, z), V(w, APRON_Y + 0.025, z)]); }
  const sheet = L.loft(sheetR, L.water('#3db6ee', 0.78, { roughness: 0.25, envMapIntensity: 0.3, side: THREE.DoubleSide, depthWrite: false })); sheet.castShadow = false; sheet.renderOrder = 11; g.add(sheet);
  const pathPts = []; for (let i = 0; i <= 10; i++) { const z = lerp(-3.6, ZL, i / 10); pathPts.push([0, lvl + 0.012, z]); }
  for (let i = 1; i <= 6; i++) { const z = lerp(ZL, ZI, i / 6); pathPts.push([0, arcY(z) + 0.04, z]); }
  pathPts.push([0, APRON_Y + 0.05, 1.4], [0, APRON_Y + 0.04, 1.95], [0.2, YW + 0.03, 2.5]);
  const sc = L.curve(pathPts, false, 0.2), _p = new THREE.Vector3(), _q = new THREE.Vector3();
  const white = L.mat('#ffffff', { roughness: 0.3, emissive: '#cfefff', emissiveIntensity: 0.35 });
  // riscos de espuma que acompanham a correnteza
  const flow = new Bubbles(170, { seed: 3, size: 0.016, rate: 0.4, material: white, place: (q, u, d) => {
    sc.getPointAt(u, _p); sc.getPointAt(Math.min(1, u + 0.01), _q); const sp = 1 + 2.2 * sstep(0.62, 0.95, u);
    d.position.set(_p.x + (q.a - 0.5) * 2 * half * 0.85 * sp, _p.y + q.c * 0.01, _p.z); d.lookAt(d.position.x + _q.x - _p.x, d.position.y + _q.y - _p.y, d.position.z + _q.z - _p.z); d.scale.set(0.3, 0.15, 3 + q.b * 3);
  } });
  g.add(flow.mesh);
  const foam = new Bubbles(230, { seed: 9, size: 0.016, rate: 1.7, material: white, place: (q, u, d) => { const a = q.a * TAU, r = (0.05 + q.b * 0.42) * (0.3 + u); d.position.set(Math.cos(a) * r * 1.3, APRON_Y + 0.03 + 0.42 * q.c * 4 * u * (1 - u) * (0.3 + q.b), ZI + 0.02 + Math.sin(a) * r * 0.6 + u * 0.35); } });
  const foam2 = new Bubbles(120, { seed: 19, size: 0.012, rate: 0.5, material: white, place: (q, u, d) => { d.position.set((q.a - 0.5) * 2.7 * (0.7 + u) + u * 1.1, YW + 0.035, 1.95 + q.b * 0.3 + u * 1.9); d.scale.set(1.5, 0.22, 1.5); } });
  g.add(foam.mesh, foam2.mesh);
  const update = (t) => { flow.update(t); foam.update(t); foam2.update(t); };
  return { group: g, update };
}

/* ---------- lado sem tratamento: boca de tubo + valão com esgoto bruto ---------- */
export function makeRawCreek() {
  const g = new THREE.Group(), m = new Merge(), cx = 6, cz = -12.75;
  // ala de concreto tosca e tubo quebrado na cabeceira do valão
  m.add(G.extrude([[-0.8, -0.75], [0.8, -0.75], [0.8, 0.22], [-0.8, 0.22]], 0.2, 0.01, [circlePts(0.3, 20, 0, -0.3)]), (x, y, z, c) => c.set('#a9aba4').multiplyScalar(0.8 + 0.2 * Math.sin(x * 7 + y * 9)).lerp(new THREE.Color('#4a3a28'), clamp01((-0.25 - y) * 2.2) * 0.75), TM(cx, 0, cz - 0.1));
  m.add(G.lathe([[0.25, 0], [0.33, 0], [0.33, 0.7], [0.25, 0.7], [0.25, 0]], 20), '#b9bcb6', TM(cx, -0.3, cz + 0.32, -HP, 0, 0));
  g.add(m.mesh(vmat({ roughness: 0.9 })));
  // fita de esgoto ao longo do valão (revelada pela cabeça `head`)
  const N = 120, pos = [], idx = [], side = new THREE.Vector3();
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = creekCurve.getPointAt(u), tg = creekCurve.getTangentAt(u); side.set(tg.z, 0, -tg.x).normalize();
    const w = 0.36 + 0.07 * Math.sin(u * 23) + 0.25 * sstep(0.9, 1, u);
    pos.push(p.x - side.x * w, p.y, p.z - side.z * w, p.x + side.x * w, p.y, p.z + side.z * w);
    if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const ribbon = L.mesh(geo, L.water('#6b4526', 0.96, { roughness: 0.22, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); ribbon.frustumCulled = false; g.add(ribbon);
  // queda da boca do tubo
  const fall = L.mesh(G.extrude([[-0.2, 0], [0.2, 0], [0.26, -0.3], [-0.26, -0.3]], 0.04), L.water('#6b4526', 0.95, { roughness: 0.2, side: THREE.DoubleSide }), cx, -0.47, cz + 0.36, { cast: false }); fall.rotation.x = -0.5; g.add(fall);
  const flow = new L.Flow(creekCurve, { n: 90, size: 0.045, colors: ['#3d2614', '#8a6238', '#a57b4a', '#4a3423'], jitter: [0.2, 0.01, 0.2], offset: [0, 0.03, 0], seed: 8 });
  g.add(flow.mesh);
  const scum = new Bubbles(60, { seed: 31, size: 0.07, rate: 0.7, material: L.mat('#b9a27a', { roughness: 0.7 }), place: (q, u, d) => { const a = q.a * TAU, r = 0.15 + q.b * 0.7 + u * 0.8; d.position.set(XB + Math.cos(a) * r * 0.8 + u * 0.9, YW + 0.03, 0.9 + Math.abs(Math.sin(a)) * r); d.scale.set(1.5, 0.3, 1.5); } });
  g.add(scum.mesh);
  const update = (t, head) => {
    ribbon.visible = fall.visible = head > 0.005; geo.setDrawRange(0, Math.floor(clamp01(head) * N) * 6);
    flow.update(t, { speed: 0.16, head: clamp01(head), amount: head > 0.01 ? 1 : 0 });
    scum.update(t, sstep(1, 1.08, head));
  };
  return { group: g, update };
}

/* ---------- copo d'água + sinal de proibido ---------- */
export function makeGlass() {
  const g = new THREE.Group(), cup = L.group(g);
  const prof = [[0, 0], [0.062, 0], [0.068, 0.012], [0.086, 0.25], [0.086, 0.26], [0.08, 0.26], [0.0635, 0.03], [0, 0.03]];
  const gm = L.glass('#eaf7ff', 0.13, { side: THREE.DoubleSide, roughness: 0.06, envMapIntensity: 1.6 });
  const gmesh = L.mesh(G.lathe(prof, 36), gm, 0, 0, 0, { cast: false }); gmesh.renderOrder = 22; cup.add(gmesh);
  const w = L.mesh(G.lathe([[0, 0.033], [0.062, 0.033], [0.0765, 0.2], [0, 0.2]], 36), L.water('#1b97e6', 0.93, { roughness: 0.4, depthWrite: false, envMapIntensity: 0.25, side: THREE.DoubleSide, emissive: '#1479c2', emissiveIntensity: 0.45 }), 0, 0, 0, { cast: false }); w.renderOrder = 21; cup.add(w);
  const top = L.mesh(new THREE.CircleGeometry(0.0765, 32), L.water('#6fd0fa', 0.95, { roughness: 0.3, envMapIntensity: 0.4, side: THREE.DoubleSide }), 0, 0.2005, 0, { cast: false }); top.rotation.x = -HP; top.renderOrder = 21; cup.add(top);
  const base = L.mesh(G.lathe([[0, 0.002], [0.06, 0.002], [0.063, 0.03], [0, 0.03]], 36), L.glass('#d9f1ff', 0.4, { roughness: 0.1 }), 0, 0, 0, { cast: false }); base.renderOrder = 20; cup.add(base);
  const rim = L.mesh(G.torus(0.083, 0.0035, 6, 40), L.mat('#ffffff', { roughness: 0.1, emissive: '#ffffff', emissiveIntensity: 0.5 }), 0, 0.26, 0, { cast: false }); rim.rotation.x = HP; cup.add(rim);
  // sinal de proibido (anel + barra) — fica entre o copo e a câmera
  const sign = L.group(g, 0, 0.13, 0.12), red = L.glossy('#e3170f', { emissive: '#c20d08', emissiveIntensity: 0.55, roughness: 0.3 });
  const ring = L.mesh(G.torus(0.185, 0.024, 12, 56), red, 0, 0, 0, { cast: false }), bar = L.mesh(G.rbox(0.37, 0.044, 0.04, 0.015), red, 0, 0, 0, { cast: false });
  bar.rotation.z = -Math.PI / 4; ring.renderOrder = bar.renderOrder = 25; sign.add(ring, bar);
  return { group: g, cup, sign };
}

/* ---------- lixo boiando ---------- */
export function makeTrash(n = 18) {
  const g = new THREE.Group(), rd = L.rng(51), items = [];
  const bottle = (c) => { const m = L.mesh(G.lathe([[0, 0], [0.04, 0], [0.045, 0.02], [0.045, 0.16], [0.03, 0.2], [0.014, 0.23], [0.014, 0.26], [0.018, 0.26], [0.018, 0.28], [0, 0.28]], 12), L.mat(c, { transparent: true, opacity: 0.85, roughness: 0.15 })); m.geometry.translate(0, -0.14, 0); m.geometry.rotateZ(HP); return m; };
  const kinds = [
    () => bottle('#4fbf6a'), () => bottle('#dff4ff'), () => bottle('#3d8fe0'),
    () => { const m = new Merge(); m.add(blob(0.13, 2, 0.45, 7, 0.55), '#f4f4f0').add(G.torus(0.05, 0.012, 5, 10, Math.PI), '#f4f4f0', TM(0.06, 0.07, 0)).add(G.torus(0.05, 0.012, 5, 10, Math.PI), '#f4f4f0', TM(-0.06, 0.07, 0)); return m.mesh(vmat({ roughness: 0.6 })); },   // sacola
    () => { const m = new Merge(); m.add(G.lathe([[0, 0], [0.035, 0], [0.037, 0.01], [0.037, 0.11], [0.03, 0.12], [0, 0.12]], 12), (x, y, z, c) => c.set(y > 0.03 && y < 0.09 ? '#d8433a' : '#c9d1d7'), TM(0, 0, 0, 0, 0, HP)); return m.mesh(vmat({ roughness: 0.3, metalness: 0.6 })); },  // lata
    () => { const m = new Merge(); m.add(G.torus(0.17, 0.065, 8, 24), '#1d2024', TM(0, 0, 0, HP, 0, 0)); for (let i = 0; i < 16; i++) m.add(G.box(0.03, 0.02, 0.12), '#15171a', TM(0, 0, 0, 0, (i / 16) * TAU, 0).multiply(TM(0.225, 0, 0))); return m.mesh(vmat({ roughness: 0.9 })); },  // pneu
    () => { const m = new Merge(); m.add(G.rbox(0.26, 0.05, 0.19, 0.02), '#fbfbf6').add(G.box(0.2, 0.03, 0.13), '#e8e8e0', TM(0, 0.02, 0)); return m.mesh(vmat({ roughness: 0.8 })); },   // isopor
    () => bottle('#f2f2ec')
  ];
  for (let i = 0; i < n; i++) {
    const m = kinds[i % kinds.length](); m.castShadow = true; g.add(m);
    items.push({ m, x: XB - 0.3 + rd() * 1.2, z: 0.7 + rd() * 0.9, dz: 0.3 + rd() * 3.8, drift: 0.6 + rd() * 4.4, t0: 97.5 + rd() * 1.9, ph: rd() * 6, rot: rd() * 6, spin: (rd() - 0.5) * 1.2, s: 1.3 + rd() * 0.6, tire: i % kinds.length === 5 });
  }
  // lixo preso na margem do valão
  const stuck = [[4.5, -9.0], [3.9, -7.0], [4.9, -5.3], [3.3, -2.9], [2.9, -1.0], [5.5, -11.3]].map(([x, z], i) => { const m = kinds[(i * 3 + 1) % kinds.length](); m.position.set(x + 0.45, height(x + 0.45, z) + 0.06, z + 0.2); m.rotation.set(0.2 * i, i * 1.3, 0.15); m.scale.setScalar(1.5); g.add(m); return m; });
  const update = (t, wave, show) => {
    stuck.forEach((m, i) => { const k = L.ease.back(L.prog(t, 96.3 + i * 0.12, 96.7 + i * 0.12)) * show; m.scale.setScalar(1.5 * k); m.visible = k > 0.01; });
    items.forEach((q) => {
      const k = L.prog(t, q.t0, q.t0 + 3.6), a = L.ease.back(L.prog(t, q.t0, q.t0 + 0.35)), e = L.ease.out(k);
      const x = q.x + q.drift * e + 0.1 * (t - q.t0), z = q.z + q.dz * e;
      q.m.visible = a > 0.01; q.m.position.set(x, YW + wave(x, z, t) + (q.tire ? 0.0 : 0.02), z);
      q.m.rotation.set(0.12 * Math.sin(t * 1.7 + q.ph), q.rot + q.spin * (t - q.t0) * 0.4, 0.14 * Math.sin(t * 1.3 + q.ph * 2)); q.m.scale.setScalar(q.s * a);
    });
  };
  return { group: g, update };
}
