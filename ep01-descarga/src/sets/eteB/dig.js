// Linha de lodo (tubo em corte + bomba), biodigestores em forma de ovo (um em corte) e gasômetro de membrana.
export function buildDig(L, K, { CX, CZ, T, clarOutlet }) {
  const { THREE, PAL, TAU } = L, m = K.m;
  const g = new THREE.Group();
  const EX = 42, YS = 10.0, TOP = 13.6;
  /* ---------- perfil do ovo ---------- */
  const ctrl = [[1.0, -2.6], [2.3, -1.5], [3.6, 0.3], [4.55, 2.4], [5.0, 4.8], [4.75, 7.1], [3.95, 9.2], [2.75, 10.9], [1.7, 12.0], [1.3, 12.6]];
  const EP = new THREE.SplineCurve(ctrl.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(46).map((p) => [p.x, p.y]);
  const eggR = (y) => { if (y <= EP[0][1]) return EP[0][0]; for (let i = 0; i < EP.length - 1; i++) if (y <= EP[i + 1][1]) return L.lerp(EP[i][0], EP[i + 1][0], (y - EP[i][1]) / (EP[i + 1][1] - EP[i][1] || 1)); return 1.3; };
  const TH = 0.35, IP = EP.map((p, i) => { const a = EP[Math.max(0, i - 1)], b = EP[Math.min(EP.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); return [p[0] - (dy / l) * TH, p[1] + (dx / l) * TH]; });
  const innerR = (y) => { for (let i = 0; i < IP.length - 1; i++) if (y <= IP[i + 1][1]) return Math.max(0, L.lerp(IP[i][0], IP[i + 1][0], (y - IP[i][1]) / (IP[i + 1][1] - IP[i][1] || 1))); return 0.95; };
  const cladTex = K.canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(120,135,150,.55)'); gr.addColorStop(0.06, 'rgba(120,135,150,0)'); gr.addColorStop(0.94, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.5)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
  cladTex.repeat.set(28, 1);
  const clad = L.mat('#c3ccd4', { map: cladTex, roughness: 0.5, metalness: 0.25, side: THREE.DoubleSide });
  const ringM = L.mat('#7c8a97', { roughness: 0.5, metalness: 0.4 }), blueM = L.mat(PAL.blue, { roughness: 0.4, metalness: 0.3 });
  const outerProf = [[0, -2.6], ...EP];

  function egg(x, z, cut) {
    const e = new THREE.Group(); e.position.set(x, 0, z);
    const phi0 = cut ? Math.PI / 2 : 0, phiL = cut ? Math.PI : TAU;
    const body = L.lathe(outerProf, clad, cut ? 36 : 56, phi0, phiL); e.add(body);
    const rings = []; for (let y = 1.1; y < 12.4; y += 1.25) rings.push(K.tf(new THREE.TorusGeometry(eggR(y) + 0.02, 0.055, 6, cut ? 28 : 56, phiL), [0, y, 0], [Math.PI / 2, 0, cut ? Math.PI : 0]));
    e.add(K.M(rings, ringM));
    // faixa colorida, gargalo e tampa
    const band = EP.filter((p) => p[1] > 10.6).map((p) => [p[0] + 0.03, p[1]]);
    e.add(L.lathe(band, L.mat(PAL.blue, { roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide }), cut ? 28 : 48, phi0, phiL));
    e.add(L.mesh(K.latheHard([[1.3, 12.6], [1.3, 13.3], [1.55, 13.3], [1.55, TOP], [0, TOP]], cut ? 20 : 36, phi0, phiL, false), L.mat('#cfd6dc', { roughness: 0.45, metalness: 0.4, side: THREE.DoubleSide })));
    // anel de fundação
    e.add(K.latheCut([[3.3, -0.13], [3.3, 0.55], [4.15, 0.45], [4.3, -0.13]], m.concrete, phi0, phiL, cut ? m.cut : null, cut ? 28 : 48));
    const apr = L.mesh(new THREE.RingGeometry(4.3, 5.6, 48, 1, 0, cut ? Math.PI : TAU).rotateX(-Math.PI / 2), m.paving, 0, 0.02, 0, { cast: false }); e.add(apr);
    // plataforma no topo com guarda-corpo e motor do misturador
    const pr = 2.5, a0 = cut ? 0 : 0, aL = cut ? Math.PI : TAU;
    e.add(L.mesh(new THREE.CylinderGeometry(pr, pr, 0.1, 40, 1, false, cut ? Math.PI / 2 : 0, cut ? Math.PI : TAU), m.grating, 0, TOP + 0.05, 0));
    const rp = []; const nr = cut ? 12 : 24; for (let i = 0; i <= nr; i++) { const a = a0 + (i / nr) * aL; rp.push([pr * 0.97 * Math.cos(a), TOP + 0.1, -pr * 0.97 * Math.sin(a)]); }
    e.add(K.railing(rp, { step: 9 }));
    const br = []; for (let i = 0; i < (cut ? 4 : 8); i++) { const a = a0 + ((i + 0.5) / (cut ? 4 : 8)) * aL; br.push(K.seg([pr * 0.9 * Math.cos(a), TOP, -pr * 0.9 * Math.sin(a)], [1.45 * Math.cos(a), 12.7, -1.45 * Math.sin(a)], 0.05, 5)); }
    e.add(K.M(br, ringM));
    const mx = new THREE.Group(); mx.position.set(0, TOP + 0.1, cut ? -0.02 : 0);
    mx.add(K.M([K.cylG(0.45, 0.55, 0.5, [0, 0.25, 0], [0, 0, 0], 18), K.cylG(0.3, 0.3, 0.2, [0, 0.6, 0], [0, 0, 0], 14)], blueM));
    const mt = K.motor(1.0, 0.3, PAL.green); mt.rotation.z = Math.PI / 2; mt.position.y = 1.25; mx.add(mt); e.add(mx);
    // domo de gás
    e.add(K.M([K.tf(new THREE.SphereGeometry(0.42, 16, 8, 0, TAU, 0, Math.PI / 2), [0.95, TOP + 0.1, -0.75]), K.cylG(0.42, 0.42, 0.1, [0.95, TOP + 0.1, -0.75], [0, 0, 0], 16)], m.gasPipe));
    g.add(e); return e;
  }
  const eCut = egg(EX, CZ, true);
  const E2 = [32.5, -15], E3 = [50, -15.5];
  egg(E2[0], E2[1], false); egg(E3[0], E3[1], false);

  /* ---------- escada helicoidal no ovo 3 e passarelas entre os topos ---------- */
  {
    const st = new THREE.Group(); st.position.set(E3[0], 0, E3[1]);
    const n = 62, a0 = 0.35, a1 = a0 + Math.PI * 1.55, steps = [], out = [], inn = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, y = 0.2 + k * (TOP - 0.1), a = L.lerp(a0, a1, k), r = Math.max(eggR(Math.min(y, 12.4)), 1.6) + 0.25;
      const c = Math.cos(a), s = Math.sin(a);
      steps.push(K.boxG(1.0, 0.05, 0.42, [(r + 0.5) * c, y, (r + 0.5) * s], [0, -a, 0]));
      if (i % 2 === 0) { out.push([(r + 1.0) * c, y + 0.03, (r + 1.0) * s]); inn.push([(r + 0.02) * c, y - 0.1, (r + 0.02) * s]); }
      if (i % 6 === 0) steps.push(K.seg([(r + 0.9) * c, y - 0.08, (r + 0.9) * s], [(r - 0.2) * c, y - 0.9, (r - 0.2) * s], 0.04, 5));
    }
    st.add(K.M(steps, m.galv), K.railing(out, { step: 9, h: 1.05 }));
    const str = []; for (let i = 0; i < out.length - 1; i++) { str.push(K.seg(L.V(...out[i]).add(L.V(0, -0.1, 0)), L.V(...out[i + 1]).add(L.V(0, -0.1, 0)), 0.05, 5), K.seg(inn[i], inn[i + 1], 0.05, 5)); }
    st.add(K.M(str, ringM)); g.add(st);
    const bridge = (a, b) => {
      const A = L.V(a[0], TOP + 0.05, a[1]), B = L.V(b[0], TOP + 0.05, b[1]), d = B.clone().sub(A), len = d.length(), u = d.clone().normalize(), nrm = L.V(-u.z, 0, u.x);
      const p0 = A.clone().addScaledVector(u, 2.3), p1 = B.clone().addScaledVector(u, -2.3), bg = new THREE.Group(), gs = [], dk = [];
      const mid = p0.clone().lerp(p1, 0.5), ang = Math.atan2(-u.z, u.x), l2 = p0.distanceTo(p1);
      dk.push(K.boxG(l2, 0.06, 1.0, [mid.x, mid.y, mid.z], [0, ang, 0]));
      [-1, 1].forEach((s) => {
        const q0 = p0.clone().addScaledVector(nrm, s * 0.5), q1 = p1.clone().addScaledVector(nrm, s * 0.5);
        bg.add(K.railing([q0, q1], { step: 1.3 }));
        gs.push(K.seg(q0.clone().add(L.V(0, -0.12, 0)), q1.clone().add(L.V(0, -0.12, 0)), 0.07, 5), K.seg(q0.clone().add(L.V(0, -0.9, 0)), q1.clone().add(L.V(0, -0.9, 0)), 0.05, 5));
        const nd = Math.round(l2 / 1.3); for (let i = 0; i < nd; i++) { const s0 = q0.clone().lerp(q1, i / nd), s1 = q0.clone().lerp(q1, (i + 1) / nd); gs.push(K.seg((i % 2 ? s1 : s0).clone().add(L.V(0, -0.12, 0)), (i % 2 ? s0 : s1).clone().add(L.V(0, -0.9, 0)), 0.03, 4)); }
      });
      bg.add(K.M(dk, m.grating), K.M(gs, ringM)); g.add(bg);
    };
    bridge([EX, CZ - 0.3], E3); bridge([EX, CZ - 0.3], E2);
  }

  /* ---------- interior do ovo em corte ---------- */
  const inside = new THREE.Group(); inside.position.set(EX, 0, CZ); g.add(inside);
  {
    const wallIn = L.lathe([[0, -2.25], ...IP, [0.95, 13.25], [0, 13.25]], L.mat('#56616b', { roughness: 0.9, side: THREE.DoubleSide }), 36, Math.PI / 2, Math.PI); inside.add(wallIn);
    // tampas do corte (casca)
    const right = [[0, -2.6], ...EP, [1.3, 13.3], [1.55, 13.3], [1.55, TOP], [0, TOP], [0, 13.25], [0.95, 13.25], ...IP.slice().reverse(), [0, -2.25]];
    [1, -1].forEach((s) => { const sh = new THREE.Shape(right.map((p) => new THREE.Vector2(p[0] * s, p[1]))); inside.add(L.mesh(new THREE.ShapeGeometry(sh), m.cut, 0, 0, 0.003, { cast: false })); });
    // lodo (face de corte com veios de mistura) e espaço de gás
    const inPts = (ya, yb) => { const a = IP.filter((p) => p[1] > ya && p[1] < yb); return [[innerR(ya), ya], ...a, [innerR(yb), yb]]; };
    const sl = [[0, -2.25], ...inPts(-2.2, YS)], slPoly = [...sl, ...sl.slice().reverse().map((p) => [-p[0], p[1]])];
    const stex = K.canvasTex(512, 640, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6a4a30'); gr.addColorStop(0.5, '#553a26'); gr.addColorStop(1, '#3a281b'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      const rd = L.rng(14); c.lineWidth = 3; c.lineCap = 'round';
      for (let i = 0; i < 110; i++) { c.strokeStyle = rd() < 0.5 ? 'rgba(150,110,70,.22)' : 'rgba(30,18,10,.25)'; const x = rd() * w, y = rd() * h, r = 20 + rd() * 60; c.beginPath(); c.arc(x, y, r, rd() * 6, rd() * 6 + 1.2); c.stroke(); }
      for (let i = 0; i < 1500; i++) { c.fillStyle = rd() < 0.5 ? 'rgba(160,120,80,.2)' : 'rgba(20,12,6,.25)'; c.fillRect(rd() * w, rd() * h, 2 + rd() * 3, 2 + rd() * 3); }
    });
    stex.wrapS = stex.wrapT = THREE.ClampToEdgeWrapping; stex.repeat.set(1 / 10, 1 / 12.6); stex.offset.set(0.5, 2.4 / 12.6);
    inside.add(L.mesh(new THREE.ShapeGeometry(new THREE.Shape(slPoly.map((p) => new THREE.Vector2(p[0], p[1])))), L.mat(0xffffff, { map: stex, roughness: 0.6, side: THREE.DoubleSide }), 0, 0, 0.002, { cast: false }));
    inside.add(L.mesh(new THREE.CircleGeometry(innerR(YS), 32, 0, Math.PI).rotateX(-Math.PI / 2), L.mat('#7a5838', { roughness: 0.5 }), 0, YS, 0, { cast: false }));
    const gs = [...inPts(YS, 12.55), [0.95, 13.25], [0, 13.25]], gPoly = [[0, YS], ...gs, ...gs.slice().reverse().map((p) => [-p[0], p[1]])];
    const gasM = L.mat(PAL.gas, { transparent: true, opacity: 0.3, emissive: PAL.gas, emissiveIntensity: 0.5, depthWrite: false, side: THREE.DoubleSide });
    const gasFace = L.mesh(new THREE.ShapeGeometry(new THREE.Shape(gPoly.map((p) => new THREE.Vector2(p[0], p[1])))), gasM, 0, 0, 0.004, { cast: false }); gasFace.renderOrder = 6; inside.add(gasFace);
    inside.userData.gasM = gasM;
    // tubo de tiragem (misturador) em corte, hélice e eixo
    const steelD = m.steel.clone(); steelD.side = THREE.DoubleSide;
    inside.add(K.M([K.boxG(0.09, 8.2, 0.08, [-0.85, 4.5, 0.04]), K.boxG(0.09, 8.2, 0.08, [0.85, 4.5, 0.04]), K.boxG(0.5, 0.09, 0.08, [-1.05, 0.5, 0.04], [0, 0, 0.6]), K.boxG(0.5, 0.09, 0.08, [1.05, 0.5, 0.04], [0, 0, -0.6]), K.boxG(0.45, 0.09, 0.08, [-1.02, 8.68, 0.04], [0, 0, -0.6]), K.boxG(0.45, 0.09, 0.08, [1.02, 8.68, 0.04], [0, 0, 0.6]),
      K.boxG(innerR(2) - 0.9, 0.08, 0.08, [-(innerR(2) + 0.9) / 2, 2, 0.04]), K.boxG(innerR(2) - 0.9, 0.08, 0.08, [(innerR(2) + 0.9) / 2, 2, 0.04]), K.boxG(innerR(7.4) - 0.9, 0.08, 0.08, [-(innerR(7.4) + 0.9) / 2, 7.4, 0.04]), K.boxG(innerR(7.4) - 0.9, 0.08, 0.08, [(innerR(7.4) + 0.9) / 2, 7.4, 0.04])], steelD));
    inside.add(K.M([K.cylG(0.07, 0.07, 6.6, [0, 10.4, 0.02], [0, 0, 0], 8)], m.steel));
    const prop = new THREE.Group(); prop.position.set(0, 7.2, 0.05);
    const blades = [K.cylG(0.16, 0.16, 0.4, [0, 0, 0], [0, 0, 0], 12)]; for (let i = 0; i < 3; i++) { const a = i * TAU / 3; blades.push(K.tf(new THREE.SphereGeometry(1, 10, 6), [Math.cos(a) * 0.43, 0, Math.sin(a) * 0.43], [0.5, -a, 0], [0.34, 0.03, 0.17])); }
    prop.add(K.M(blades, L.mat(PAL.accent, { roughness: 0.4, metalness: 0.3 }))); inside.add(prop); inside.userData.prop = prop;
  }
  // setas de mistura (descem pelo tubo central, sobem junto às paredes)
  const loop = (s) => L.curve([[s * 0.4, 8.0, 0.1], [s * 0.4, 1.2, 0.1], [s * 1.5, -0.7, 0.1], [s * 3.0, 0.9, 0.1], [s * 3.75, 4.6, 0.1], [s * 3.1, 8.0, 0.1], [s * 1.7, 9.2, 0.1], [s * 0.6, 9.0, 0.1]].map((p) => [p[0] + EX, p[1], p[2] + CZ]), true);
  const mixCh = [1, -1].map((s) => new L.Chevrons(loop(s), { n: 11, size: 0.42, color: '#f3d9a8', normal: [0, 0, 1] }));
  mixCh.forEach((c) => g.add(c.mesh));
  // bolhas de biogás
  const NG = 130, gb = [], rd = L.rng(91);
  for (let i = 0; i < NG; i++) gb.push({ k: (rd() < 0.5 ? -1 : 1) * (0.28 + rd() * 0.68), ph: rd(), sp: 0.12 + rd() * 0.1, s: 0.07 + rd() * 0.13, w: rd() * TAU });
  const gasBub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), L.glow(PAL.gas, 1.1, { roughness: 0.3 }), NG); gasBub.frustumCulled = false; gasBub.castShadow = false; g.add(gasBub);

  /* ---------- linha de lodo: tubo em corte, casa de bombas subterrânea ---------- */
  const zP = CZ + 0.012, pipeMat = m.sludgePipe;
  const p1 = L.cutPipe([[0.2, -5.42], [1.0, -5.5], [2.3, -6.3], [3.7, -7.0], [5.5, -7.1], [9.6, -7.1]].map((p) => [p[0] + CX, p[1]]), { r: 0.34, mat: pipeMat, seg: 90 });
  const p2 = L.cutPipe([[35.2, -7.1], [35.8, -7.1], [36.2, -6.7], [36.3, -5.6], [36.3, 1.7], [36.45, 2.6], [37.0, 3.12], [38.5, 3.2]], { r: 0.34, mat: pipeMat, seg: 110 });
  [p1, p2].forEach((p) => { p.group.position.z = zP; g.add(p.group); });
  const w1 = p1.waterIn(0.93, PAL.sludge, 0.97), w2 = p2.waterIn(0.93, PAL.sludge, 0.97);
  const fl1 = new L.Flow(p1.curve, { n: 26, size: 0.11, colors: ['#8a6038', '#73502f', '#9a7046'], jitter: [0.05, 0.12, 0], offset: [0, 0, zP + 0.03], seed: 3 });
  const fl2 = new L.Flow(p2.curve, { n: 34, size: 0.11, colors: ['#8a6038', '#73502f', '#9a7046'], jitter: [0.1, 0.08, 0], offset: [0, 0, zP + 0.03], seed: 5 });
  const ch1 = new L.Chevrons(p1.curve, { n: 6, size: 0.3, normal: [0, 0, 1], offset: [0, 0, zP + 0.12] }), ch2 = new L.Chevrons(p2.curve, { n: 8, size: 0.3, normal: [0, 0, 1], offset: [0, 0, zP + 0.12] });
  g.add(fl1.mesh, fl2.mesh, ch1.mesh, ch2.mesh);
  // suportes do tubo que sobe junto ao ovo
  g.add(K.M([K.boxG(1.3, 0.1, 0.12, [36.95, 1.2, CZ - 0.1]), K.boxG(0.9, 0.1, 0.12, [36.85, 0.15, CZ - 0.1])], ringM));
  // câmara de bombas
  const CH = { x0: 31.6, x1: 35.2, y0: -8.1, y1: -5.3, d: 3.0 };
  {
    const c = new THREE.Group(), wm = L.mat('#e9edf0', { roughness: 0.8 }), w = CH.x1 - CH.x0, h = CH.y1 - CH.y0, cx = (CH.x0 + CH.x1) / 2, zc = CZ - CH.d / 2;
    c.add(L.box(w + 0.5, 0.25, CH.d, m.concrete, cx, CH.y0 - 0.125, zc), L.box(w - 1.0 + 0.25, 0.25, CH.d, m.concrete, CH.x0 + (w - 1.0) / 2 - 0.125, CH.y1 + 0.125, zc), L.box(0.25, h + 0.5, CH.d, m.concrete, CH.x0 - 0.125, (CH.y0 + CH.y1) / 2, zc), L.box(0.25, h + 0.5 + 5.16, CH.d, m.concrete, CH.x1 + 0.125, (CH.y0 - 0.25 - 0.14) / 2, zc), L.box(0.25, 5.16, CH.d, m.concrete, 34.2 - 0.125, (CH.y1 - 0.14) / 2, zc));
    c.add(L.box(w, h, 0.2, wm, cx, (CH.y0 + CH.y1) / 2, CZ - CH.d + 0.1), L.box(1.0, 5.2, 0.2, wm, 34.7, (CH.y1 - 0.14) / 2, CZ - 1.3));
    c.add(K.M([K.boxG(1.4, 0.07, 0.2, [32.6, CH.y1 - 0.06, CZ - 1.2])], L.glow('#fff4d6', 2.2)));
    const ld = K.ladder(5.1, 0.5); ld.position.set(34.7, CH.y1 - 0.2, CZ - 1.15); c.add(ld);
    // tampa de acesso na superfície
    c.add(K.M([K.boxG(1.5, 0.12, 1.5, [34.7, 0.06, CZ - 0.78])], m.concrete), K.M([K.boxG(1.0, 0.05, 1.0, [34.7, 0.14, CZ - 0.8])], L.mat(PAL.yellow, { roughness: 0.5, metalness: 0.3 })));
    // bomba centrífuga: base, caracol, motor, tubos com válvula
    const px = 33.05, py = -7.0;
    c.add(K.M([K.boxG(1.5, 0.45, 2.1, [px, CH.y0 + 0.225, CZ - 0.95])], m.concrete));
    const vo = K.volute(0.5, 0.42, PAL.red); vo.position.set(px, py, CZ - 0.25); c.add(vo);
    const mt = K.motor(1.3, 0.36, PAL.blue); mt.rotation.y = -Math.PI / 2; mt.position.set(px, py, CZ - 1.3); c.add(mt);
    c.add(K.M([K.boxG(0.6, 0.5, 0.4, [px, py - 0.55, CZ - 0.3]), K.boxG(0.9, 0.45, 0.9, [px, py - 0.6, CZ - 1.3])], m.iron));
    const sIn = K.pipe([[CH.x0, -7.1, CZ], [px - 0.35, -7.1, CZ], [px - 0.05, -7.05, CZ - 0.02]], 0.3, pipeMat, { fl: [0.05, 0.6], bend: 0.2 }); c.add(sIn.group);
    const sOut = K.pipe([[px + 0.47, py + 0.62, CZ - 0.25], [px + 0.47, -5.95, CZ - 0.25], [34.45, -5.95, CZ - 0.1], [34.45, -7.1, CZ], [CH.x1, -7.1, CZ]], 0.26, pipeMat, { fl: [0.03, 0.33, 0.62, 0.97], bend: 0.35 }); c.add(sOut.group);
    const vv = K.valve(0.26, PAL.red); vv.position.set(34.0, -5.95, CZ - 0.14); c.add(vv);
    g.add(c);
    const lamp = new THREE.PointLight('#fff1d0', 14, 7, 1.6); lamp.position.set(32.9, -5.9, CZ - 0.9); g.add(lamp);
  }

  /* ---------- gasômetro de membrana ---------- */
  const GX = 55, GZ = CZ - 7.2, GR = 3.7;
  const gaso = new THREE.Group(); gaso.position.set(GX, 0, GZ); g.add(gaso);
  const dome = new THREE.Group(); dome.position.y = 0.55; gaso.add(dome);
  {
    gaso.add(K.latheCut([[0, 0], [0, 0.4], [GR + 0.6, 0.4], [GR + 0.7, 0]], m.concrete, 0, TAU, null, 48));
    const a0 = -0.42, prof = []; for (let i = 0; i <= 26; i++) { const a = L.lerp(a0, Math.PI / 2, i / 26); prof.push([GR * Math.cos(a), GR * (Math.sin(a) - Math.sin(a0))]); }
    dome.add(L.lathe(prof, L.mat('#dfe5e9', { roughness: 0.45, metalness: 0.05 }), 56));
    const seams = []; for (let i = 0; i < 12; i++) { const ph = (i / 12) * TAU; for (let j = 0; j < prof.length - 1; j += 2) { const a = prof[j], b = prof[Math.min(prof.length - 1, j + 2)]; seams.push(K.seg([a[0] * Math.sin(ph) * 1.004, a[1], a[0] * Math.cos(ph) * 1.004], [b[0] * Math.sin(ph) * 1.004, b[1], b[0] * Math.cos(ph) * 1.004], 0.028, 4)); } }
    dome.add(K.M(seams, L.mat('#aab6c0', { roughness: 0.5 })));
    dome.add(K.M([K.cylG(0.35, 0.4, 0.25, [0, GR * (1 - Math.sin(a0)) + 0.08, 0], [0, 0, 0], 14)], ringM));
    const r0 = GR * Math.cos(a0);
    const clampR = [K.tf(new THREE.TorusGeometry(r0 + 0.05, 0.1, 8, 56), [0, 0.5, 0], [Math.PI / 2, 0, 0])]; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; clampR.push(K.cylG(0.05, 0.05, 0.3, [(r0 + 0.2) * Math.cos(a), 0.5, (r0 + 0.2) * Math.sin(a)], [0, 0, 0], 6)); }
    gaso.add(K.M(clampR, ringM));
    // soprador de sustentação e válvula de segurança
    gaso.add(K.M([K.boxG(0.9, 0.8, 0.7, [GR + 0.1, 0.8, 2.2])], blueM), K.pipe([[GR - 0.2, 0.9, 2.0], [GR - 1.0, 0.9, 1.6], [GR - 1.3, 1.6, 1.3]], 0.14, m.galv, { bend: 0.3 }).group);
    gaso.add(K.M([K.cylG(0.1, 0.1, 1.6, [-GR - 0.3, 1.2, 0.8], [0, 0, 0], 8), K.cylG(0.22, 0.22, 0.35, [-GR - 0.3, 2.1, 0.8], [0, 0, 0], 10)], m.gasPipe));
  }

  /* ---------- tubo de gás: do topo do ovo ao gasômetro ---------- */
  const gdir = L.V(0.96, 0, -0.28).normalize(), gp = [[EX + 0.95, TOP + 0.3, CZ - 0.75], [EX + 0.95, TOP + 0.75, CZ - 0.75], [EX + 2.2, TOP + 0.75, CZ - 1.0]];
  gp[2] = [EX + 2.9, TOP + 0.75, CZ - 1.15];
  for (let y = 12.9; y > 1.2; y -= 0.9) { const r = Math.max(eggR(Math.min(y, 12.5)) + 0.32, y > 10.4 ? 2.95 : 0); gp.push([EX + gdir.x * r, y, CZ + gdir.z * r]); }
  gp.push([EX + 4.3, 0.75, CZ - 1.6], [GX - GR - 1.6, 0.75, GZ + 1.6], [GX - GR + 0.25, 0.9, GZ + 0.4]);
  const gasCurve = L.curve(gp, false, 0.35);
  g.add(L.tube(gasCurve, 0.16, m.gasPipe, 140, 10));
  const gfl = []; [0.02, 0.2, 0.5, 0.74, 0.86, 0.985].forEach((u) => gfl.push(K.flangeG(0.16, gasCurve.getPointAt(u), gasCurve.getTangentAt(u))));
  for (let y = 2.5; y < 12; y += 3) { const r = eggR(y); gfl.push(K.seg([EX + gdir.x * (r + 0.32), y, CZ + gdir.z * (r + 0.32)], [EX + gdir.x * r, y, CZ + gdir.z * r], 0.05, 5)); }
  g.add(K.M(gfl, m.gasPipe));
  const gasCh = new L.Chevrons(gasCurve, { n: 11, size: 0.36, color: PAL.gas, normal: [0.2, 0.2, 1], offset: [0.1, 0, 0.42] });
  g.add(gasCh.mesh);

  /* ---------- furos na parede de solo (plano z = CZ) ---------- */
  const below = outerProf.filter((p) => p[1] < 0); below.push([eggR(0), 0]);
  const eggHole = [...below.map((p) => [EX + p[0], p[1]]), ...below.slice().reverse().map((p) => [EX - p[0], p[1]])];
  const holes = [
    K.clipOutline(p1.outline(0.002), (p) => p[0] > CX + 1.75 && p[0] < CH.x0 - 0.252, (p) => [p[0] < 27 ? CX + 1.75 : CH.x0 - 0.252, p[1]]),
    [[CH.x0 - 0.25, CH.y0 - 0.25], [CH.x1 + 0.25, CH.y0 - 0.25], [CH.x1 + 0.25, 0], [33.95, 0], [33.95, CH.y1 + 0.25], [CH.x0 - 0.25, CH.y1 + 0.25]],
    K.clipOutline(p2.outline(0.002), (p) => p[0] > CH.x1 + 0.252 && p[1] < -0.15, (p) => (p[1] > -1 ? [p[0], -0.146] : [CH.x1 + 0.252, p[1]])),
    eggHole
  ];

  const _d = new THREE.Object3D();
  function update(t) {
    const h1 = L.prog(t, T.sludge, T.sludge + 0.9), h2 = L.prog(t, T.sludge + 1.2, T.sludge + 2.3);
    w1.range(0, h1); w2.range(0, h2);
    fl1.update(t, { speed: 0.5, head: h1, amount: h1 > 0 ? 1 : 0 }); fl2.update(t, { speed: 0.42, head: h2, amount: h2 > 0 ? 1 : 0 });
    const ca = L.pulse(t, T.sludge, 84.5, 0.3, 0.5);
    ch1.update(t, { speed: 0.4, head: h1, amount: ca }); ch2.update(t, { speed: 0.3, head: h2, amount: ca });
    inside.userData.prop.rotation.y = t * 7;
    mixCh.forEach((c) => c.update(t, { speed: 0.09, amount: L.pulse(t, 80.8, 85, 0.5, 0.5) * 0.9 }));
    for (let i = 0; i < NG; i++) {
      const b = gb[i], u = L.fract(b.ph + t * b.sp), y = -1.6 + u * (YS + 1.6 + 0.4), ir = innerR(Math.min(y, 12.4)) - 0.25;
      const x = Math.sign(b.k) * (0.95 + (Math.abs(b.k) - 0.28) / 0.68 * Math.max(0.1, ir - 1.0)) + Math.sin(t * 2.3 + b.w) * 0.07;
      const ok = Math.abs(x) < ir ? 1 : 0;
      _d.position.set(EX + x, y, CZ + 0.05); _d.scale.setScalar(b.s * (0.5 + 0.7 * u) * ok * Math.min(1, u * 10) * Math.min(1, (1 - u) * 12)); _d.updateMatrix(); gasBub.setMatrixAt(i, _d.matrix);
    }
    gasBub.instanceMatrix.needsUpdate = true;
    inside.userData.gasM.opacity = 0.26 + 0.1 * Math.sin(t * 2.2);
    const k = L.sstep(T.gas, 85.0, t);
    dome.scale.set(0.955 + 0.045 * k, 0.6 + 0.4 * k + Math.sin(t * 1.8) * 0.008, 0.955 + 0.045 * k);
    gasCh.update(t, { speed: 0.1, amount: L.pulse(t, T.gas + 0.2, 86, 0.5, 0.5) });
  }
  return { group: g, update, holes, labelPos: [EX + 0.2, 11.6, CZ + 0.1], sludgeLabel: [CX + 6.8, -6.75, CZ + 0.1], clarOutlet, GX, GZ, GR };
}
