// Decantador secundário circular com um quarto recortado: flocos afundando, água clara vertendo pelo vertedor dentado.
export function buildClar(L, K, { CX, CZ, T }) {
  const { THREE, PAL, TAU } = L, m = K.m;
  const g = new THREE.Group(); g.position.set(CX, 0, CZ);
  const P0 = Math.PI / 2, PL = Math.PI * 1.5;              // parte que sobra (convenção do lathe: phi = 0 aponta para +z)
  const WL = 0.55, floorY = (r) => (r < 1.2 ? L.lerp(-5.8, -4.5, L.clamp01((r - 0.8) / 0.4)) : -4.5 + ((r - 1.2) / 6.3) * 0.9);
  /* ---------- concreto ---------- */
  const prof = [[0, -5.8], [0.8, -5.8], [1.2, -4.5], [7.5, -3.6], [7.5, -0.25], [6.55, -0.25], [6.55, 0.5], [6.7, 0.5], [6.7, 0.0], [7.5, 0.0], [7.5, 0.9], [7.9, 0.9], [7.9, -4.05], [1.6, -4.95], [1.2, -6.2], [0, -6.2]];
  const cm = m.concrete.clone(); cm.side = THREE.DoubleSide;
  g.add(K.latheCut(prof, cm, P0, PL, m.cut, 72));
  const apron = L.mesh(new THREE.RingGeometry(7.9, 9.3, 64, 1, 0, PL).rotateX(-Math.PI / 2), m.paving, 0, 0.02, 0, { cast: false }); g.add(apron);

  /* ---------- água: faces de corte com degradê (clara em cima, manta de lodo no fundo) ---------- */
  const wpts = [[0, -5.8], [0.8, -5.8], [1.2, -4.5], [7.5, -3.6], [7.5, -0.25], [6.55, -0.25], [6.55, WL], [0, WL]];
  const blanket = (r) => floorY(Math.max(r, 1.2)) + 1.15 + 0.1 * Math.sin(r * 2.3) + (r < 1.6 ? 0.25 : 0);
  const TW = 600, TH = 508, y0 = -5.8, hh = WL - y0;
  const wtex = K.canvasTex(TW, TH, (c, w, h) => {
    const X = (r) => (r / 7.5) * w, Y = (y) => ((WL - y) / hh) * h, rd = L.rng(3);
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3fc0f2'); gr.addColorStop(Y(-1.2) / h, '#2ea6e0'); gr.addColorStop(Y(-2.6) / h, '#2b8fc4'); gr.addColorStop(1, '#2a7fae'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    for (let k = 9; k >= 0; k--) {
      c.globalAlpha = k === 0 ? 1 : 0.16; c.fillStyle = k === 0 ? '#8d6a42' : '#9a7a52'; c.beginPath(); c.moveTo(0, h);
      for (let r = 0; r <= 7.5; r += 0.1) c.lineTo(X(r), Y(blanket(r) + k * 0.09)); c.lineTo(w, h); c.closePath(); c.fill();
    }
    c.globalAlpha = 1; const g2 = c.createLinearGradient(0, Y(-2.6), 0, h); g2.addColorStop(0, 'rgba(74,52,35,0)'); g2.addColorStop(1, 'rgba(60,40,26,.9)'); c.fillStyle = g2;
    c.beginPath(); c.moveTo(0, h); for (let r = 0; r <= 7.5; r += 0.1) c.lineTo(X(r), Y(blanket(r) - 0.25)); c.lineTo(w, h); c.closePath(); c.fill();
    for (let i = 0; i < 900; i++) { const r = rd() * 7.5, y = blanket(r) - rd() * 1.2; c.fillStyle = rd() < 0.5 ? 'rgba(190,150,100,.35)' : 'rgba(50,32,20,.3)'; c.beginPath(); c.arc(X(r), Y(y), 1 + rd() * 3, 0, TAU); c.fill(); }
  });
  wtex.wrapS = wtex.wrapT = THREE.ClampToEdgeWrapping; wtex.repeat.set(1 / 7.5, 1 / hh); wtex.offset.set(0, -y0 / hh);
  const faceM = new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.25, side: THREE.DoubleSide, emissive: '#1a6f9c', emissiveIntensity: 0.12 });
  const wshape = new THREE.Shape(wpts.map((p) => new THREE.Vector2(p[0], p[1])));
  const fB = L.mesh(new THREE.ShapeGeometry(wshape), faceM, 0, 0, 0.004, { cast: false }); g.add(fB);
  const fA = L.mesh(new THREE.ShapeGeometry(wshape), faceM, 0.004, 0, 0, { cast: false }); fA.rotation.y = -Math.PI / 2; g.add(fA);
  const top = L.mesh(new THREE.RingGeometry(0.0, 6.55, 72, 1, 0, PL).rotateX(-Math.PI / 2), L.water(PAL.clear, 0.86, { roughness: 0.06 }), 0, WL, 0, { cast: false }); top.renderOrder = 6; g.add(top);
  // calha: água clara correndo
  const LW = 0.13, lm = L.water(PAL.tap, 0.95, { roughness: 0.08, side: THREE.DoubleSide, emissive: '#1b86b8', emissiveIntensity: 0.2 });
  g.add(L.mesh(new THREE.RingGeometry(6.7, 7.5, 72, 1, 0, PL).rotateX(-Math.PI / 2), lm, 0, LW, 0, { cast: false }));
  g.add(L.mesh(new THREE.PlaneGeometry(0.8, LW), lm, 7.1, LW / 2, 0.005, { cast: false }));
  const lc = L.mesh(new THREE.PlaneGeometry(0.8, LW), lm, 0.005, LW / 2, 7.1, { cast: false }); lc.rotation.y = Math.PI / 2; g.add(lc);
  // lâmina passando sobre a mureta e caindo na calha
  g.add(L.mesh(new THREE.RingGeometry(6.5, 6.74, 72, 1, 0, PL).rotateX(-Math.PI / 2), lm, 0, 0.53, 0, { cast: false }));
  const fallTex = K.canvasTex(256, 32, (c, w, h) => { c.clearRect(0, 0, w, h); const rd = L.rng(9); for (let x = 0; x < w; x += 2) { c.fillStyle = `rgba(255,255,255,${0.35 + rd() * 0.6})`; c.fillRect(x, 0, 2, h); } });
  fallTex.repeat.set(10, 1);
  const fallM = new THREE.MeshStandardMaterial({ color: PAL.tap, map: fallTex, transparent: true, opacity: 0.9, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false, emissive: '#8fdcff', emissiveIntensity: 0.6 });
  const fall = L.mesh(new THREE.CylinderGeometry(6.74, 6.78, 0.42, 72, 1, true, P0, PL), fallM, 0, 0.33, 0, { cast: false }); g.add(fall);
  g.add(L.mesh(new THREE.RingGeometry(6.74, 6.92, 72, 1, 0, PL).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.75, depthWrite: false }), 0, LW + 0.012, 0, { cast: false, receive: false }));

  /* ---------- vertedor dentado e anteparo de escuma ---------- */
  {
    const N = 150, pos = [], R = 6.5;
    for (let i = 0; i < N; i++) {
      const a0 = P0 + (i / N) * PL, a1 = P0 + ((i + 1) / N) * PL, am = (a0 + a1) / 2, p = (a, y) => [R * Math.sin(a), y, R * Math.cos(a)];
      pos.push(...p(a0, 0.28), ...p(a1, 0.28), ...p(a1, 0.5), ...p(a0, 0.28), ...p(a1, 0.5), ...p(a0, 0.5), ...p(a0, 0.5), ...p(a1, 0.5), ...p(am, 0.68));
    }
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wg.computeVertexNormals();
    const sm = m.steel.clone(); sm.side = THREE.DoubleSide; g.add(L.mesh(wg, sm));
    const bm = L.metal('#aab4bd', { roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide });
    g.add(L.mesh(new THREE.CylinderGeometry(6.0, 6.0, 0.55, 72, 1, true, P0, PL), bm, 0, 0.56, 0));
    const br = []; for (let i = 0; i <= 18; i++) { const a = P0 + (i / 18) * PL; br.push(K.seg([6.0 * Math.sin(a), 0.75, 6.0 * Math.cos(a)], [6.6 * Math.sin(a), 0.6, 6.6 * Math.cos(a)], 0.025, 5)); }
    g.add(K.M(br, m.galv));
  }

  /* ---------- centro: coluna, poço de alimentação, acionamento ---------- */
  g.add(L.cyl(0.42, 0.5, 6.0, m.concrete, 0, -1.6, 0, 20));
  const well = L.mesh(new THREE.CylinderGeometry(1.35, 1.35, 1.7, 40, 1, true), L.metal('#9fb0bd', { roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide }), 0, 0.0, 0); g.add(well);
  const sp = []; for (let i = 0; i < 4; i++) { const a = i * TAU / 4 + 0.6; sp.push(K.seg([0.4 * Math.cos(a), 0.6, 0.4 * Math.sin(a)], [1.35 * Math.cos(a), 0.6, 1.35 * Math.sin(a)], 0.05, 6)); }
  g.add(K.M(sp, m.galv));

  /* ---------- ponte giratória ---------- */
  const bridge = new THREE.Group(); g.add(bridge);
  {
    const Lb = 8.05, y = 1.55, bs = [];
    bs.push(K.boxG(Lb, 0.05, 1.15, [Lb / 2, y, 0]));
    const stl = [];
    [-1, 1].forEach((s) => {
      stl.push(K.boxG(Lb, 0.22, 0.1, [Lb / 2, y - 0.14, s * 0.6]), K.boxG(Lb, 0.12, 0.1, [Lb / 2, y - 0.85, s * 0.6]));
      for (let i = 0; i < 8; i++) { const x0 = i * Lb / 8, x1 = (i + 1) * Lb / 8; stl.push(K.seg([i % 2 ? x1 : x0, y - 0.2, s * 0.6], [i % 2 ? x0 : x1, y - 0.85, s * 0.6], 0.035, 5)); }
      bridge.add(K.railing([[0.2, y, s * 0.58], [Lb, y, s * 0.58]], { step: 1.15, kick: true }));
    });
    // carro de apoio na borda, com roda e motor
    stl.push(K.boxG(0.5, 0.75, 1.5, [7.7, 1.15, 0]), K.boxG(0.9, 0.12, 1.7, [7.7, 1.52, 0]));
    // raspador de fundo e escumadeira
    [2.3, 4.4, 6.6].forEach((r) => stl.push(K.seg([r, y - 0.85, 0], [r, floorY(r) + 0.3, 0], 0.05, 6)));
    stl.push(K.seg([1.3, floorY(1.3) + 0.32, 0], [7.2, floorY(7.2) + 0.32, 0], 0.06, 6));
    for (let r = 1.6; r < 7.3; r += 0.8) stl.push(K.boxG(0.95, 0.3, 0.04, [r, floorY(r) + 0.17, 0.1], [0, 0.7, 0]));
    stl.push(K.boxG(4.6, 0.1, 0.06, [4.1, WL + 0.02, 0.5], [0, 0.12, 0]), K.seg([2.2, y - 0.85, 0.3], [2.2, WL, 0.4], 0.03, 5), K.seg([6.0, y - 0.85, 0.3], [6.0, WL, 0.7], 0.03, 5));
    bridge.add(K.M(bs, m.grating), K.M(stl, L.mat('#5d7ea6', { roughness: 0.45, metalness: 0.35 })));
    bridge.add(K.M([K.cylG(0.3, 0.3, 0.16, [7.7, 1.2, -0.72], [Math.PI / 2, 0, 0], 16), K.cylG(0.3, 0.3, 0.16, [7.7, 1.2, 0.72], [Math.PI / 2, 0, 0], 16)], m.dark));
    const mt = K.motor(0.7, 0.2, PAL.green); mt.position.set(7.7, 1.85, 0); mt.rotation.y = Math.PI / 2; bridge.add(mt);
    // acionamento central
    bridge.add(K.M([K.cylG(1.25, 1.25, 0.08, [0, y - 0.02, 0], [0, 0, 0], 28)], m.grating), K.M([K.cylG(0.55, 0.62, 0.55, [0, y + 0.3, 0], [0, 0, 0], 20), K.cylG(0.3, 0.3, 0.25, [0, y + 0.7, 0], [0, 0, 0], 14)], L.mat(PAL.blue, { roughness: 0.4, metalness: 0.3 })));
    const m2 = K.motor(0.8, 0.22, PAL.green); m2.position.set(-0.75, y + 0.36, 0); bridge.add(m2);
    const ring = []; for (let i = 0; i < 14; i++) { const a = 0.5 + (i / 13) * (TAU - 1.0); ring.push([1.2 * Math.cos(a), y, 1.2 * Math.sin(a)]); }
    bridge.add(K.railing(ring, { step: 9 }));
  }

  /* ---------- flocos afundando (nas duas faces de corte) ---------- */
  const NFl = 300, fl = [], rd = L.rng(57);
  for (let i = 0; i < NFl; i++) fl.push({ face: i % 2, r: 0.5 + rd() * 6.8, ph: rd(), sp: 0.07 + rd() * 0.08, s: 0.035 + rd() * 0.06, w: rd() * TAU });
  const flM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.mat(0xffffff, { roughness: 0.9 }), NFl); flM.frustumCulled = false; flM.castShadow = false; g.add(flM);
  const _c = new THREE.Color(); fl.forEach((f, i) => flM.setColorAt(i, _c.set(['#c4a172', '#a88458', '#8d6a42', '#d4b78a'][i % 4]))); flM.instanceColor.needsUpdate = true;

  /* ---------- setas: água clara corre pela calha ---------- */
  const arc = (a0, a1) => { const pts = []; for (let i = 0; i <= 24; i++) { const a = L.lerp(a0, a1, i / 24); pts.push([7.1 * Math.sin(a), 0.3, 7.1 * Math.cos(a)]); } return L.curve(pts); };
  const outA = P0 + 0.8; // saída da calha (lado de trás, à direita)
  const chev = [new L.Chevrons(arc(TAU - 0.5, outA), { n: 14, size: 0.3, normal: [0, 1, 0], color: PAL.white })];
  chev.forEach((c) => g.add(c.mesh));
  // setas saltando sobre o vertedor (a água clara sai por cima) e setas de flocos descendo
  const hop = [];
  [[P0, 0, 0.06], [P0 + 0.22, 0, 0], [P0 + 0.44, 0, 0], [TAU, 0.06, 0], [TAU - 0.22, 0, 0], [TAU - 0.44, 0, 0]].forEach((q, i) => { const h = new THREE.Group(), ar = L.arrow(0.6, { color: PAL.white, width: 0.15 }); h.add(ar); h.rotation.y = q[0] - Math.PI / 2; h.userData = { a: q[0], ph: i * 0.37, ox: q[1], oz: q[2], ar }; hop.push(h); g.add(h); });
  const sink = [[2.6, 0], [5.0, 0], [0, 2.6], [0, 5.0]].map((p, i) => new L.Chevrons(L.curve([[p[0], -0.7, p[1]], [p[0], -3.0 - 0.0, p[1]]]), { n: 3, size: 0.3, color: '#f3d9a8', normal: p[1] ? [1, 0, 0] : [0, 0, 1], offset: p[1] ? [0.08, 0, 0] : [0, 0, 0.08] }));
  sink.forEach((c) => g.add(c.mesh));
  // caixa de saída
  g.add(K.wbox(1.8, 1.3, 1.8, m.concrete, 8.6 * Math.sin(outA), 0.65, 8.6 * Math.cos(outA)));

  const _d = new THREE.Object3D();
  function update(t) {
    bridge.rotation.y = 3.72 + (t - 77) * 0.045;
    fallTex.offset.x = 0; fallM.map.offset.y = 0; fallM.map.offset.x = Math.floor(t * 12) * 0.37;
    for (let i = 0; i < NFl; i++) {
      const f = fl[i], u = L.fract(f.ph + t * f.sp), yb = blanket(f.r) - 0.1, yt = -0.5;
      const y = L.lerp(yt, yb, 1 - Math.pow(1 - u, 1.6)), r = f.r + Math.sin(t * 0.8 + f.w) * 0.06, s = f.s * (0.3 + 0.9 * u) * Math.min(1, u * 8) * Math.min(1, (1 - u) * 10 + 0.4);
      if (f.face) _d.position.set(0.02, y, r); else _d.position.set(r, y, 0.02);
      _d.scale.set(s, s * 0.8, s); _d.updateMatrix(); flM.setMatrixAt(i, _d.matrix);
    }
    flM.instanceMatrix.needsUpdate = true;
    const a = L.pulse(t, 74.3, 80.2, 0.3, 0.4);
    chev.forEach((c) => c.update(t, { speed: 0.12, amount: a }));
    hop.forEach((h) => { const d = h.userData, u = L.fract(t * 0.8 + d.ph), r = 5.7 + u * 1.25; h.position.set(r * Math.sin(d.a) + d.ox, 0.72 + 0.3 * Math.sin(Math.PI * u), r * Math.cos(d.a) + d.oz); d.ar.rotation.z = Math.cos(Math.PI * u) * 0.75; const k = Math.sin(Math.PI * u) * L.pulse(t, 77.2, 80, 0.4, 0.4); h.scale.setScalar(Math.max(0.001, k)); h.visible = k > 0.02; });
    sink.forEach((c) => c.update(t, { speed: 0.22, amount: L.pulse(t, 74.9, 77.9, 0.3, 0.4) }));
  }
  return { group: g, update, profileOuter: [[0, 0], [0, -6.2], [1.2, -6.2], [1.6, -4.95], [7.9, -4.05], [7.9, 0]], labelPos: [CX + 5.7, 0.5, CZ + 0.05], sinkPos: [CX + 3.8, -1.9, CZ + 0.05], outlet: [CX + 8.6 * Math.sin(outA), CZ + 8.6 * Math.cos(outA)] };
}
