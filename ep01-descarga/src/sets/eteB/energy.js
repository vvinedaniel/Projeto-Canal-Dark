// Biogás → casa de geradores + queimador (flare) → rede elétrica, postes e janelas; canal e tubo de saída da água tratada.
import { shed } from './aer.js';
export function buildEnergy(L, K, { CX, CZ, T, dig }) {
  const { THREE, PAL, TAU } = L, m = K.m;
  const g = new THREE.Group();
  const HX = 64.5, HZ = -5.2, FX = 70.4, FZ = -6.6;
  /* ---------- casa de geradores ---------- */
  const house = shed(L, K, 8, 5.8, 4.5, 3.9, { cols: 2, frame: PAL.green, trim: PAL.accent });
  house.group.position.set(HX, 0, HZ); g.add(house.group);
  const gen = new THREE.Group(); gen.position.set(HX, 0.25, HZ - 2.9); g.add(gen);
  const fan = new THREE.Group();
  {
    const green = L.mat(PAL.green, { roughness: 0.45, metalness: 0.25 }), dk = [], gr = [], st = [];
    dk.push(K.boxG(6.0, 0.18, 1.5, [0, 0.09, 0]), K.boxG(6.0, 0.2, 0.14, [0, 0.28, 0.68]), K.boxG(6.0, 0.2, 0.14, [0, 0.28, -0.68]));
    // radiador com ventilador
    dk.push(K.boxG(0.5, 1.9, 1.7, [-2.55, 1.35, 0]));
    const fins = []; for (let i = 0; i < 16; i++) fins.push(K.boxG(0.04, 1.6, 0.04, [-2.82, 1.35, -0.75 + i * 0.1]));
    for (let i = 0; i < 16; i++) fins.push(K.boxG(0.04, 1.6, 0.04, [-2.55, 1.35, 0.87], [0, 0, 0]), K.boxG(0.42, 0.03, 0.03, [-2.55, 0.6 + i * 0.1, 0.87]));
    st.push(...fins);
    gen.add(K.M([K.tf(new THREE.TorusGeometry(0.7, 0.06, 6, 24), [-2.2, 1.4, 0], [0, Math.PI / 2, 0])], L.mat(PAL.yellow, { roughness: 0.5 })));
    const bl = [K.cylG(0.12, 0.12, 0.12, [0, 0, 0], [0, 0, Math.PI / 2], 10)]; for (let i = 0; i < 6; i++) { const a = i * TAU / 6; bl.push(K.boxG(0.03, 0.6, 0.22, [0, Math.cos(a) * 0.36, Math.sin(a) * 0.36], [a, 0.5, 0])); }
    fan.add(K.M(bl, m.steel)); fan.position.set(-2.2, 1.4, 0); gen.add(fan);
    // bloco do motor, cabeçotes, coletor de escape, turbo
    gr.push(K.boxG(2.5, 0.95, 0.95, [-0.75, 1.0, 0]), K.boxG(2.3, 0.35, 0.7, [-0.75, 0.42, 0]));
    for (let i = 0; i < 6; i++) { gr.push(K.boxG(0.3, 0.42, 0.6, [-1.75 + i * 0.4, 1.68, 0])); st.push(K.cylG(0.05, 0.05, 0.3, [-1.75 + i * 0.4, 1.55, 0.42], [Math.PI / 2 - 0.5, 0, 0], 6)); dk.push(K.cylG(0.06, 0.06, 0.12, [-1.75 + i * 0.4, 1.95, 0], [0, 0, 0], 8)); }
    st.push(K.cylG(0.1, 0.1, 2.3, [-0.75, 1.42, 0.56], [0, 0, Math.PI / 2], 10));
    gr.push(K.cylG(0.28, 0.28, 0.7, [-0.9, 1.5, -0.68], [0, 0, Math.PI / 2], 14));
    dk.push(K.cylG(0.62, 0.62, 0.3, [0.65, 1.0, 0], [0, 0, Math.PI / 2], 20));
    gen.add(K.M(gr, green));
    const tb = K.volute(0.22, 0.22, '#8f9aa5'); tb.position.set(0.55, 1.62, 0.56); gen.add(tb);
    // alternador
    const alt = K.motor(2.0, 0.6, '#42546b'); alt.rotation.y = Math.PI; alt.position.set(1.9, 1.0, 0); gen.add(alt);
    gen.add(K.M(dk, m.iron), K.M(st, m.steel));
    // escapamento: sobe pelo telhado, silenciador e chapéu
    const ex = K.pipe([[0.72, 1.9, 0.56], [0.72, 2.6, 0.56], [0.72, 2.9, 0.2], [0.72, 5.1, 0.2]], 0.13, L.metal('#8b8f94', { roughness: 0.55 }), { bend: 0.25, fl: [0.05] }); gen.add(ex.group);
    gen.add(K.M([K.cylG(0.36, 0.36, 1.5, [0.72, 5.7, 0.2], [0, 0, 0], 16), K.cylG(0.13, 0.36, 0.2, [0.72, 6.55, 0.2], [0, 0, 0], 16), K.cylG(0.36, 0.13, 0.2, [0.72, 4.85, 0.2], [0, 0, 0], 16), K.cylG(0.13, 0.13, 0.7, [0.72, 6.95, 0.2], [0, 0, 0], 10), K.cylG(0.02, 0.3, 0.14, [0.72, 7.45, 0.2], [0, 0, 0], 12)], L.metal('#9aa0a6', { roughness: 0.5 })));
    // painel de controle
    gen.add(K.M([K.boxG(0.5, 1.7, 1.0, [3.35, 1.05, -0.2])], L.mat('#dfe4e8', { roughness: 0.5, metalness: 0.2 })));
  }
  const panelM = L.glow(PAL.good, 0.2); gen.add(K.M([K.boxG(0.03, 0.3, 0.5, [3.09, 1.5, -0.2]), K.boxG(0.2, 0.08, 0.03, [3.3, 1.5, 0.31])], panelM));

  /* ---------- queimador (flare) ---------- */
  const flare = new THREE.Group(); flare.position.set(FX, 0, FZ); g.add(flare);
  const flame = new THREE.Group(); flame.position.y = 6.25; flare.add(flame);
  {
    flare.add(K.M([K.boxG(1.3, 0.2, 1.3, [0, 0.1, 0])], m.concrete));
    const st = [K.cylG(0.2, 0.26, 5.6, [0, 3.0, 0], [0, 0, 0], 14), K.cylG(0.34, 0.34, 0.08, [0, 0.25, 0], [0, 0, 0], 14), K.cylG(0.05, 0.05, 5.4, [0.3, 2.9, 0], [0, 0, 0], 6)];
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3 + 0.5; st.push(K.seg([Math.cos(a) * 0.2, 5.5, Math.sin(a) * 0.2], [Math.cos(a) * 0.48, 5.85, Math.sin(a) * 0.48], 0.03, 5)); }
    for (let i = 0; i < 3; i++) { const a = i * TAU / 3; st.push(K.seg([Math.cos(a) * 0.22, 2.4, Math.sin(a) * 0.22], [Math.cos(a) * 1.5, 0.15, Math.sin(a) * 1.5], 0.035, 5)); }
    flare.add(K.M(st, m.galv));
    flare.add(L.mesh(new THREE.CylinderGeometry(0.5, 0.42, 1.0, 20, 1, true), L.metal('#6c757d', { roughness: 0.6, side: THREE.DoubleSide }), 0, 6.1, 0));
    const fp = (h, r) => { const p = []; for (let i = 0; i <= 14; i++) { const k = i / 14; p.push([r * Math.sin(Math.PI * Math.pow(k, 0.65)) * (1 - k * 0.25) + 0.001, k * h]); } return p; };
    [[1.9, 0.42, PAL.flame, 0.85], [1.35, 0.28, '#ffd23f', 0.95], [0.8, 0.15, '#fff6d0', 1]].forEach(([h, r, c, o], i) => { const f = L.lathe(fp(h, r), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, toneMapped: false }), 16); f.castShadow = false; f.renderOrder = 20 + i; f.userData.i = i; flame.add(f); });
  }

  /* ---------- tubos de gás: gasômetro → gerador e queimador ---------- */
  const GP = [[dig.GX + dig.GR - 0.2, 0.9, dig.GZ + 0.6], [dig.GX + dig.GR + 1.4, 0.7, dig.GZ + 2.6], [dig.GX + dig.GR + 1.6, 0.7, CZ - 1.3], [FX, 0.7, CZ - 1.3], [FX, 0.7, FZ + 0.3], [FX, 1.1, FZ + 0.22]];
  const gline = K.pipe(GP, 0.14, m.gasPipe, { bend: 0.5, fl: [0.03, 0.3, 0.55, 0.8] }); g.add(gline.group);
  const br = K.pipe([[HX - 0.9, 0.7, CZ - 1.3], [HX - 0.9, 0.7, HZ - 2.2], [HX - 0.9, 1.75, HZ - 2.25]], 0.11, m.gasPipe, { bend: 0.3, fl: [0.03, 0.6] }); g.add(br.group);
  const sup = []; for (let x = 61; x < FX; x += 2.4) sup.push(...K.saddleG(x, 0, 0.7, CZ - 1.3, 0.15)); g.add(K.M(sup, m.concrete));
  const vv = K.valve(0.14, PAL.red); vv.position.set(67.6, 0.7, CZ - 1.3); g.add(vv);
  const gasCh = new L.Chevrons(L.curve(GP, false, 0.1), { n: 12, size: 0.36, color: PAL.gas, normal: [0, 0.5, 1], offset: [0, 0.42, 0.1] }); g.add(gasCh.mesh);

  /* ---------- transformador, postes, cabos ---------- */
  const TX = 69.9, TZ = -10.6;
  {
    const tr = [K.boxG(1.3, 1.3, 0.9, [TX, 1.05, TZ]), K.boxG(1.7, 0.2, 1.3, [TX, 0.3, TZ])]; for (let i = 0; i < 7; i++) tr.push(K.boxG(0.04, 1.0, 0.25, [TX - 0.54 + i * 0.18, 1.0, TZ + 0.57]));
    g.add(K.M(tr, L.mat('#7d8a96', { roughness: 0.5, metalness: 0.35 })), K.M([K.boxG(2.0, 0.2, 1.6, [TX, 0.1, TZ])], m.concrete));
    const ins = []; [-0.4, 0, 0.4].forEach((dx) => { for (let k = 0; k < 4; k++) ins.push(K.cylG(0.09 - k * 0.012, 0.12 - k * 0.012, 0.09, [TX + dx, 1.76 + k * 0.1, TZ], [0, 0, 0], 10)); });
    g.add(K.M(ins, L.mat('#b5553c', { roughness: 0.4 })));
  }
  const poles = [[62.5, -13.4], [70.5, -13.4], [78.5, -13.4]], PHh = 8.2, lampMs = [];
  const wood = L.mat('#8a6a4c', { roughness: 0.9 }), cabM = L.mat('#20262c', { roughness: 0.6 });
  poles.forEach(([x, z], i) => {
    const p = new THREE.Group(); p.position.set(x, 0, z);
    p.add(K.M([K.seg([0, 0, 0], [0, PHh, 0], 0.16, 10, 0.11), K.boxG(2.2, 0.14, 0.14, [0, PHh - 0.5, 0]), K.seg([-0.7, PHh - 0.5, 0], [0, PHh - 1.2, 0], 0.03, 4), K.seg([0.7, PHh - 0.5, 0], [0, PHh - 1.2, 0], 0.03, 4)], wood));
    const ins = []; [-0.95, 0, 0.95].forEach((dx) => ins.push(K.cylG(0.05, 0.08, 0.2, [dx, PHh - 0.33, 0], [0, 0, 0], 8)));
    p.add(K.M(ins, L.mat('#cfd8de', { roughness: 0.3 })));
    // luminária
    p.add(K.M([K.seg([0, 6.0, 0], [0, 6.5, 1.5], 0.04, 6), K.boxG(0.3, 0.1, 0.7, [0, 6.48, 1.7])], m.galv));
    const lm = L.glow('#ffe9a8', 0); lampMs.push(lm);
    p.add(K.M([K.boxG(0.24, 0.05, 0.56, [0, 6.42, 1.7])], lm, { cast: false }));
    const halo = L.mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }), 0, 6.35, 1.7, { cast: false, receive: false }); halo.renderOrder = 25; p.add(halo); lm.userData.halo = halo.material;
    g.add(p);
  });
  const sag = (a, b, s = 0.5) => { const A = L.v3(a), B = L.v3(b), pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10, p = A.clone().lerp(B, k); p.y -= Math.sin(Math.PI * k) * s; pts.push(p); } return L.curve(pts); };
  const wires = [], top = (i, dx) => [poles[i][0] + dx, PHh - 0.2, poles[i][1]];
  [-0.95, 0, 0.95].forEach((dx) => { wires.push(sag(top(0, dx), top(1, dx)), sag(top(1, dx), top(2, dx)), sag(top(2, dx), [92, PHh - 0.6, -13.4 + dx * 0.3], 0.7)); wires.push(sag([TX + dx * 0.42, 2.15, TZ], top(1, dx), 0.25)); });
  g.add(K.M(wires.map((c) => new THREE.TubeGeometry(c, 10, 0.03, 4, false)), cabM, { cast: false }));
  g.add(K.M([new THREE.TubeGeometry(sag([HX + 3.9, 3.4, HZ - 4.8], [TX - 0.5, 1.5, TZ + 0.3], 0.3), 8, 0.05, 5, false)], cabM, { cast: false }));
  const pc1 = L.curve([[HX + 3.4, 1.6, HZ - 3.2], [HX + 3.9, 3.4, HZ - 4.8], [TX - 0.4, 1.7, TZ + 0.2], [TX, 2.15, TZ], ...sag([TX, 2.15, TZ], top(1, 0), 0.25).getPoints(6).slice(1), ...sag(top(1, 0), top(2, 0)).getPoints(8).slice(1), ...sag(top(2, 0), [92, PHh - 0.6, -13.4], 0.7).getPoints(8).slice(1)], false, 0.2);
  const pc2 = L.curve([top(1, 0), ...sag(top(1, 0), top(0, 0)).getPoints(8).slice(1), [61.5, 6.8, -15.2]], false, 0.2);
  const pm = () => new THREE.MeshBasicMaterial({ color: PAL.accent, toneMapped: false });
  const pulse1 = new L.Flow(pc1, { n: 9, size: 0.2, material: pm(), sizeVar: 0, color: '#ffffff' }), pulse2 = new L.Flow(pc2, { n: 3, size: 0.2, material: pm(), sizeVar: 0, color: '#ffffff' });
  g.add(pulse1.mesh, pulse2.mesh);
  g.add(K.M([new THREE.TubeGeometry(sag(top(0, 0), [61.5, 6.8, -15.2], 0.15), 6, 0.03, 4, false)], cabM, { cast: false }));

  /* ---------- prédio administrativo com janelas que acendem ---------- */
  const BX = 63.5, BZ = -18.2, BW = 10, BD = 5, BH = 6.6, winMs = [];
  {
    const b = new THREE.Group(); b.position.set(BX, 0, BZ); g.add(b);
    b.add(L.box(BW, BH, BD, m.wall, 0, BH / 2, 0), L.box(BW + 0.3, 0.3, BD + 0.3, m.white, 0, BH + 0.15, 0), L.box(BW + 0.06, 0.9, BD + 0.06, m.brick, 0, 0.45, 0));
    b.add(K.M([K.boxG(BW + 0.2, 0.12, 0.3, [0, 3.2, BD / 2 + 0.1]), K.boxG(1.6, 0.1, 0.9, [-3.6, 2.55, BD / 2 + 0.45])], m.white));
    b.add(K.M([K.boxG(1.1, 2.1, 0.08, [-3.6, 1.05, BD / 2 + 0.02])], L.mat('#3d4f63', { roughness: 0.4 })));
    b.add(K.M([K.boxG(1.2, 0.7, 0.9, [2.5, BH + 0.65, 0.5]), K.boxG(1.2, 0.7, 0.9, [0.6, BH + 0.65, 0.5]), K.cylG(0.05, 0.05, 2.2, [-4, BH + 1.4, -1], [0, 0, 0], 6)], m.galv));
    const fr = [];
    for (let fl = 0; fl < 2; fl++) for (let i = 0; i < 5; i++) {
      if (fl === 0 && i === 0) continue;
      const x = -3.6 + i * 1.8, y = 1.95 + fl * 2.95; fr.push(K.boxG(1.3, 1.5, 0.06, [x, y, BD / 2 + 0.01]));
      const wm = L.mat('#31475c', { roughness: 0.2, emissive: '#ffd98a', emissiveIntensity: 0 }); wm.userData.d = (fl ? 0.25 : 0) + ((i * 7) % 5) * 0.09; winMs.push(wm);
      b.add(K.M([K.boxG(0.52, 1.28, 0.05, [x - 0.29, y, BD / 2 + 0.04]), K.boxG(0.52, 1.28, 0.05, [x + 0.29, y, BD / 2 + 0.04])], wm, { cast: false }));
    }
    b.add(K.M(fr, m.white));
  }

  /* ---------- canal de água tratada (superfície) → câmara → tubo de saída ---------- */
  const out = dig.clarOutlet;
  const route = [[out[0] + 0.3, out[1] - 0.6], [31, -21.8], [72.9, -21.8], [72.9, CZ - 1.8]];
  const wat = L.water(PAL.clear, 0.93, { roughness: 0.08, emissive: '#1479b0', emissiveIntensity: 0.18 });
  {
    const conc = [], wg = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i], b = route[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) + 1.4, ang = Math.atan2(-dz, dx), cx = (a[0] + b[0]) / 2, cz = (a[1] + b[1]) / 2;
      const ux = dx / Math.hypot(dx, dz), uz = dz / Math.hypot(dx, dz);
      conc.push(K.boxG(len, 0.12, 1.4, [cx, 0.06, cz], [0, ang, 0]));
      [-1, 1].forEach((s) => conc.push(K.boxG(len + (s * (i === 1 ? -1 : 0)), 0.6, 0.2, [cx - uz * s * 0.6, 0.3, cz + ux * s * 0.6], [0, ang, 0])));
      wg.push(K.boxG(len - 0.4, 0.3, 1.0, [cx, 0.27, cz], [0, ang, 0]));
    }
    g.add(K.M(conc, m.concrete), K.M(wg, wat, { cast: false }));
  }
  const chanCh = new L.Chevrons(L.curve(route.map((p) => [p[0], 0.5, p[1]]), false, 0.02), { n: 26, size: 0.34, color: PAL.white, normal: [0, 1, 0] }); g.add(chanCh.mesh);
  // câmara de queda (em corte) e tubo de saída
  const OC = { x0: 72.0, x1: 73.8, y0: -3.9, d: 1.8 }, PY = -2.95, PR = 0.75;
  {
    const zc = CZ - OC.d / 2;
    g.add(L.box(OC.x1 - OC.x0 + 0.5, 0.25, OC.d, m.concrete, 72.9, OC.y0 - 0.125, zc), L.box(0.25, 3.9, OC.d, m.concrete, OC.x0 - 0.125, -1.95, zc), L.box(0.25, 1.7, OC.d, m.concrete, OC.x1 + 0.125, -0.99, zc), L.box(0.25, 0.3, OC.d, m.concrete, OC.x1 + 0.125, OC.y0 + 0.02, zc), L.box(2.3, 4.0, 0.25, m.concrete, 72.9, -1.9, CZ - OC.d - 0.125));
    g.add(L.box(1.8, 1.12, OC.d - 0.02, wat, 72.9, OC.y0 + 0.56, zc, { cast: false }));
    g.add(K.railing([[OC.x0 - 0.1, 0.02, CZ - 0.1], [OC.x0 - 0.1, 0.02, CZ - 1.9]], { step: 1 }), K.railing([[OC.x1 + 0.1, 0.02, CZ - 0.1], [OC.x1 + 0.1, 0.02, CZ - 1.9]], { step: 1 }));
  }
  const fallTex = K.canvasTex(64, 128, (c, w, h) => { c.clearRect(0, 0, w, h); const rd = L.rng(4); for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,255,255,${0.5 + rd() * 0.5})`; c.fillRect(x, 0, 2, h); } });
  const fallM = new THREE.MeshStandardMaterial({ color: PAL.tap, map: fallTex, transparent: true, opacity: 0.92, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: '#2aa0d8', emissiveIntensity: 0.35 });
  g.add(L.mesh(new THREE.PlaneGeometry(1.0, 3.1), fallM, 72.9, -1.25, CZ - OC.d + 0.06, { cast: false }));
  const op = L.cutPipe([[OC.x1, PY], [78, PY - 0.1], [86, PY - 0.25], [98, PY - 0.45]], { r: PR, mat: L.mat(PAL.concrete, { side: THREE.DoubleSide, roughness: 0.85 }), seg: 80, radial: 18, tension: 0.5 });
  op.group.position.z = CZ + 0.012; g.add(op.group);
  const ow = op.waterIn(0.62, PAL.clear, 0.95);
  const oCh = new L.Chevrons(op.curve, { n: 9, size: 0.5, color: PAL.white, normal: [0, 0, 1], offset: [0, -0.25, CZ + 0.15] }); g.add(oCh.mesh);
  const oFl = new L.Flow(op.curve, { n: 40, size: 0.07, color: '#d8f6ff', jitter: [0.2, 0.22, 0], offset: [0, -0.35, CZ + 0.05], material: L.mat('#e6faff', { emissive: '#9fe4ff', emissiveIntensity: 0.6 }) }); g.add(oFl.mesh);
  const holes = [
    [[OC.x0 - 0.25, OC.y0 - 0.25], [OC.x1 + 0.25, OC.y0 - 0.25], [OC.x1 + 0.25, 0], [OC.x0 - 0.25, 0]],
    K.clipOutline(op.outline(0.002), (p) => p[0] > OC.x1 + 0.252 && p[0] < 79.994, (p) => [p[0] < 77 ? OC.x1 + 0.252 : 79.994, p[1]])
  ];

  function update(t) {
    const pw = L.sstep(T.power, T.power + 0.5, t);
    fan.rotation.x = t * 30; gen.position.y = 0.25 + Math.sin(t * 61) * 0.004;
    flame.children.forEach((f) => { const i = f.userData.i; f.scale.set(1 + 0.1 * Math.sin(t * 19 + i), 1 + 0.16 * Math.sin(t * 23 + i * 2) + 0.1 * Math.sin(t * 37 + 1.3), 1 + 0.1 * Math.cos(t * 17 + i)); f.rotation.z = 0.12 * Math.sin(t * 5 + i * 0.4); });
    gasCh.update(t, { speed: 0.12, amount: L.pulse(t, T.power - 1.4, 86.2, 0.5, 0.4) });
    panelM.emissiveIntensity = 0.2 + 1.6 * pw;
    pulse1.update(t, { speed: 0.55, amount: pw, head: L.prog(t, T.power + 0.2, T.power + 1.5) });
    pulse2.update(t, { speed: 0.9, amount: pw * L.sstep(T.power + 0.7, T.power + 0.9, t) });
    lampMs.forEach((lm, i) => { const k = L.sstep(T.power + 0.75 + i * 0.22, T.power + 0.95 + i * 0.22, t); lm.emissiveIntensity = 3.2 * k; lm.userData.halo.opacity = 0.4 * k; });
    winMs.forEach((wm) => { wm.emissiveIntensity = 2.4 * L.sstep(T.power + 0.7 + wm.userData.d * 1.1, T.power + 0.8 + wm.userData.d * 1.1, t); });
    house.lampM.emissiveIntensity = 0.4 + 1.6 * pw;
    fallM.map.offset.x = Math.floor(t * 12) * 0.37;
    chanCh.update(t, { speed: 0.03, amount: L.pulse(t, 74.3, 86.9, 0.4, 0.1) * 0.9 });
    oCh.update(t, { speed: 0.3, amount: L.sstep(84.6, 85.2, t) }); oFl.update(t, { speed: 0.25 });
  }
  return { group: g, update, holes, PY, PR, labelPos: [HX + 1.2, 5.3, HZ - 0.4] };
}
