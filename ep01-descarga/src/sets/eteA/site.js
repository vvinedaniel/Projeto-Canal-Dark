// Terreno, ruas, cerca, prédios e o restante da estação (com menos detalhe): decantador 2, aeração,
// decantadores secundários e biodigestores.
export function buildSite(L, K, scene, pop) {
  const { THREE, PAL, TAU } = L, { M, bx, jbox, rod, rods, Rails, latheSegs } = K, PI = Math.PI, GL = -2, DS = THREE.DoubleSide;
  const gy = (x) => (x < 2 ? 0 : x > 6 ? GL : -(x - 2) / 2);
  const g = L.group(scene);
  const flatShape = (outline, holes, m, y) => {
    const s = new THREE.Shape(outline.map((p) => new THREE.Vector2(p[0], p[1])));
    (holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
    const geo = new THREE.ShapeGeometry(s, 24); geo.rotateX(-PI / 2); return L.mesh(geo, m, 0, y, 0, { cast: false });
  };
  const circ = (cx, cu, r, n = 48) => { const a = []; for (let i = 0; i < n; i++) { const f = (i / n) * TAU; a.push([cx + r * Math.cos(f), cu + r * Math.sin(f)]); } return a; };
  const rc = (x0, x1, u0, u1) => [[x0, u0], [x1, u0], [x1, u1], [x0, u1]];

  /* ---------- gramado em dois patamares ---------- */
  g.add(flatShape([[-52, 0], [-36, 0], [-36, 2.95], [-19.5, 2.95], [-19.5, 4.55], [-2, 4.55], [-2, 0], [2, 0], [2, 54], [-52, 54]], null, M.grass, 0));
  { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([2, 0, 0, 6, GL, 0, 6, GL, -54, 2, 0, -54], 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute([2, 0, 6, 0, 6, 54, 2, 54], 2)); geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); g.add(L.mesh(geo, M.grass, 0, 0, 0, { cast: false })); }
  { const out = [[6, 0]]; for (let i = 0; i <= 40; i++) { const a = PI - (i / 40) * PI; out.push([20 + 13.4 * Math.cos(a), 13.4 * Math.sin(a)]); } out.push([92, 0], [92, 54], [6, 54]);
    g.add(flatShape(out, [rc(33.5, 45.6, 0.9, 2.7), rc(46, 90, 3, 29), circ(20, 34, 13.4), circ(56, 44, 8.35), circ(76, 44, 8.35)], M.grass, GL)); }

  /* ---------- rua interna, portaria, cerca ---------- */
  const asphalt = L.mat(PAL.asphalt, { roughness: 0.95 });
  g.add(bx(-52, 2, 0, 0.06, -18.5, -13.5, asphalt), bx(6, 92, GL, GL + 0.06, -18.5, -13.5, asphalt));
  { const r = L.box(4.5, 0.06, 5, asphalt, 4, -1 + 0.03, -16); r.rotation.z = -Math.atan2(2, 4); g.add(r); }
  [-18.6, -13.4].forEach((z) => { g.add(bx(-52, 2, 0, 0.14, z - 0.12, z + 0.12, M.sidewalk), bx(6, 92, GL, GL + 0.14, z - 0.12, z + 0.12, M.sidewalk)); });
  g.add(L.scatter(new THREE.BoxGeometry(1.6, 0.02, 0.16), M.white, 44, (i, r, d) => { const x = -50 + i * 3.25; d.position.set(x, gy(x) + 0.075, -16); if (x > 2 && x < 6) d.rotation.z = -Math.atan2(2, 4); }));
  // estacionamento + acesso ao prédio
  g.add(bx(-33, -21, 0, 0.05, -25, -18.5, asphalt), bx(-43, -41, 0, 0.08, -22, -18.5, M.sidewalk));
  g.add(L.scatter(new THREE.BoxGeometry(0.12, 0.02, 4), M.white, 5, (i, r, d) => { d.position.set(-32 + i * 2.6, 0.065, -22.6); }));
  const cars = pop(-27, 0, -22.4); [['#c9423a', -3.7], ['#e9edf0', -1.1], ['#3d6fb6', 1.5]].forEach(([c, x]) => { const v = K.car(c); v.rotation.y = PI / 2; v.position.x = x; cars.add(v); });
  const gate = pop(-49.5, 0, -11);
  { const b = K.building(3.2, 3, 3.2, { floors: 1, ac: 0, band: M.wallBlue }); gate.add(b);
    gate.add(L.cyl(0.12, 0.12, 1.1, M.yellow, 1.2, 0.55, -2.4, 10)); const arm = L.box(0.1, 0.1, 5.2, M.white, 1.2, 1.05, -5.0); gate.add(arm);
    for (let i = 0; i < 5; i++) gate.add(L.box(0.11, 0.11, 0.5, M.red, 1.2, 1.05, -3.0 - i)); }
  const fence = pop(-51.5, 0, 0);
  new Rails({ h: 2.1, step: 3, r: 0.035, mat: M.galv }).add([[0, 0, -0.4], [0, 0, -13.2]]).add([[0, 0, -18.8], [0, 0, -53.5], [53.5, 0, -53.5]]).build(fence);
  const fence2 = pop(40, GL, 0);
  new Rails({ h: 2.1, step: 3, r: 0.035, mat: M.galv }).add([[-34, 0, -53.5], [51.5, 0, -53.5], [51.5, 0, -0.4]]).build(fence2);
  // postes
  for (let i = 0; i < 9; i++) { const x = -44 + i * 16.5; if (x > 0 && x < 8) continue; const p = pop(x, gy(x), i % 2 ? -19.2 : -12.8); const lp = K.lamp(6.5); lp.rotation.y = i % 2 ? 0 : PI; p.add(lp); }

  /* ---------- prédio administrativo ---------- */
  const adm = pop(-42, 0, -26.5);
  adm.add(K.building(13, 7.2, 8, { floors: 2, door: true, band: M.wallBlue, ac: 3 }));
  { const sign = L.box(4.2, 0.9, 0.08, M.wallBlue, -3.6, 6.15, 4.08); adm.add(sign); for (let i = 0; i < 3; i++) adm.add(L.box(0.9, 0.16, 0.03, M.white, -4.8 + i * 1.2, 6.15, 4.13)); }

  /* ---------- biodigestores (ao fundo) ---------- */
  const digMat = L.mat('#dfe3e5', { roughness: 0.7 }), domeMat = L.metal('#8fa0ad', { roughness: 0.45, metalness: 0.55 });
  [[-31, -43.5], [-14, -43.5]].forEach(([x, z], k) => {
    const d = pop(x, 0, z);
    d.add(latheSegs([[6.2, 0], [6.2, 0.5], [6, 0.5], [6, 10]], digMat, 48), latheSegs([[6, 10], [6.15, 10], [6.15, 10.35], [5.5, 10.7], [3.4, 11.8], [1.7, 12.3]], domeMat, 48), latheSegs([[1.7, 12.3], [1.7, 13.2], [1.35, 13.6], [0, 13.7]], L.mat(PAL.yellow, { roughness: 0.5 }), 24));
    [2.6, 5.1, 7.6].forEach((y) => { const t = L.torus(6.04, 0.09, M.galv, 0, y, 0); t.rotation.x = PI / 2; d.add(t); });
    { const t = L.torus(6.02, 0.3, L.mat(PAL.green, { roughness: 0.6 }), 0, 9.3, 0); t.rotation.x = PI / 2; t.scale.z = 0.4; d.add(t); }
    new Rails({ step: 1.6 }).arc(0, 10.35, 0, 5.9, 0, TAU, true).build(d);
    const mo = K.motor(0.35, 1.0, M.blue); mo.position.set(2.6, 11.9, 1.5); d.add(mo); d.add(L.cyl(0.5, 0.6, 0.5, M.galv, 2.6, 11.7, 1.5, 12));
    // tubo de biogás descendo pela lateral
    d.add(rods([[[0, 13.3, 0], [0, 14.2, 0], 0.16], [[0, 14.2, 0], [0, 14.2, 6.6], 0.16], [[0, 14.2, 6.6], [0, 0.9, 6.6], 0.16], [[0, 0.9, 6.6], [k ? 13 : 30, 0.9, 6.6], 0.16]], L.mat(PAL.yellow, { roughness: 0.5 }), 10));
    // escada tipo marinheiro com gaiola
    const ld = []; for (let i = 0; i < 20; i++) ld.push([[-0.3, 0.6 + i * 0.5, 6.1], [0.3, 0.6 + i * 0.5, 6.1], 0.025]); ld.push([[-0.3, 0.3, 6.1], [-0.3, 11.4, 6.1], 0.035], [[0.3, 0.3, 6.1], [0.3, 11.4, 6.1], 0.035]);
    const lg = new THREE.Group(); lg.add(rods(ld, M.galv, 5)); for (let i = 0; i < 8; i++) { const hoop = L.mesh(new THREE.TorusGeometry(0.42, 0.02, 5, 14, PI), M.galv, 0, 2.6 + i * 1.1, 6.1); hoop.rotation.x = -PI / 2; lg.add(hoop); } lg.rotation.y = -1.0; d.add(lg);
  });
  { const wk = pop(-22.5, 0, -43.5); wk.add(bx(-2.6, 2.6, 10.3, 10.42, -0.6, 0.6, M.grating)); new Rails().add([[-2.5, 10.42, -0.55], [2.5, 10.42, -0.55]]).add([[-2.5, 10.42, 0.55], [2.5, 10.42, 0.55]]).build(wk); }
  const flare = pop(-1.5, 0, -36.9);
  flare.add(L.cyl(0.6, 0.7, 0.5, M.concreteDark, 0, 0.25, 0, 12), L.cyl(0.2, 0.26, 8, M.galv, 0, 4.4, 0, 12), L.cyl(0.42, 0.3, 1.1, M.iron, 0, 8.9, 0, 12));
  const flame = L.mesh(new THREE.ConeGeometry(0.34, 1.5, 10), L.glow(PAL.flame, 2.2), 0, 10.1, 0, { cast: false }); flare.add(flame);
  flare.add(rods([[[0, 0.9, 0], [-0.5, 0.9, 0], 0.16]], L.mat(PAL.yellow, { roughness: 0.5 }), 8));

  /* ---------- tanque circular genérico (visto de cima) ---------- */
  const tankMat = M.concreteDS;
  function roundTank(grp, R, o) {
    const rim = o.rim, wl = o.wl;
    grp.add(latheSegs([[R, wl - 1.2], [R, rim], [R + 0.4, rim], [R + 0.4, -0.02]], tankMat, 64));
    grp.add(latheSegs([[R - 0.85, wl - 0.5], [R - 0.85, wl + 0.02], [R - 0.7, wl + 0.02], [R - 0.7, wl - 0.5]], tankMat, 64));
    const w = L.mesh(new THREE.CircleGeometry(R - 0.85, 64), L.water(o.color, 0.93, { roughness: 0.14 }), 0, wl, 0, { cast: false }); w.rotation.x = -PI / 2; grp.add(w);
    const lw = L.mesh(new THREE.RingGeometry(R - 0.7, R, 64), L.water(o.launder, 0.95), 0, wl - 0.35, 0, { cast: false }); lw.rotation.x = -PI / 2; grp.add(lw);
    grp.add(latheSegs([[R - 1.4, wl - 0.45], [R - 1.4, wl + 0.2]], M.steelDS, 64));
    grp.add(L.cyl(o.well ?? 2.2, o.well ?? 2.2, 1.0, L.metal('#8e9aa4', { roughness: 0.5, side: DS }), 0, wl + 0.1, 0, 32, { cast: true }));
    new Rails().arc(0, rim, 0, R + 0.2, 0, TAU, true).build(grp);
    const br = L.group(grp, 0, rim, 0), BY = 0.95, len = o.full ? R + 0.9 : 0.9;
    [-0.6, 0.6].forEach((z) => br.add(bx(-len, R + 0.9, BY - 0.42, BY, z - 0.06, z + 0.06, M.blue)));
    br.add(bx(-len, R + 0.9, BY, BY + 0.05, -0.6, 0.6, M.grating));
    new Rails({ h: 1.05 }).add([[-len, BY + 0.05, -0.58], [R + 0.85, BY + 0.05, -0.58]]).add([[-len, BY + 0.05, 0.58], [R + 0.85, BY + 0.05, 0.58]]).build(br);
    br.add(L.rbox(0.9, 0.8, 1.6, 0.06, M.blue, R + 0.2, 0.42, 0), L.cyl(0.95, 0.95, 0.35, M.iron, 0, BY - 0.7, 0, 20), L.cyl(0.5, 0.5, 0.5, M.green, 0, BY + 0.3, 0, 16));
    if (o.full) br.add(L.rbox(0.9, 0.8, 1.6, 0.06, M.blue, -R - 0.2, 0.42, 0));
    const sk = L.box(R - 4, 0.3, 0.05, M.yellow, (R + 1.5) / 2, wl - rim, 0.35); sk.rotation.y = 0.12; br.add(sk);
    return br;
  }
  const stat = (x, y, z) => L.group(scene, x, y, z);
  const c2 = stat(20, GL, -34), br2 = roundTank(c2, 13, { rim: 0.3, wl: -0.25, color: PAL.murky, launder: '#a99a66', well: 2.6 });
  const s1 = stat(56, GL, -44), brS1 = roundTank(s1, 8, { rim: 0.3, wl: -0.85, color: PAL.haze, launder: '#8fc1c0', full: true, well: 1.6 });
  const s2 = stat(76, GL, -44), brS2 = roundTank(s2, 8, { rim: 0.3, wl: -0.85, color: PAL.haze, launder: '#8fc1c0', full: true, well: 1.6 });
  // água clara saindo dos secundários para a borda do bloco
  g.add(bx(84.3, 92, GL - 1.2, GL + 0.25, -45.1, -44.85, M.concrete), bx(84.3, 92, GL - 1.2, GL + 0.25, -43.15, -42.9, M.concrete), bx(84.3, 92, GL - 1.0, GL - 0.9, -44.9, -43.1, L.water(PAL.clear, 0.95)));

  /* ---------- canal de saída do decantador 1 → aeração ---------- */
  const cw = L.mat('#a99a66', { roughness: 0.16 });
  g.add(jbox(33.3, 46, -3.5, -1.75, -0.9, -0.65, M.concreteJ), jbox(33.3, 46, -3.5, -1.75, -2.95, -2.7, M.concreteJ), jbox(33.3, 46, -3.5, -3.3, -2.7, -0.9, M.concreteJ), bx(33.4, 46.2, -2.7, -2.66, -2.7, -0.9, cw, { cast: false }));
  const chOut = new L.Chevrons([[33.6, -2.62, -1.8], [46.5, -2.62, -1.8], [48.5, -2.66, -3.5], [49, -2.68, -7]], { n: 9, size: 0.5, normal: [0, 1, 0] }); g.add(chOut.mesh);

  /* ---------- tanques de aeração ---------- */
  const AX0 = 46, AX1 = 90, AZ0 = -3, AZ1 = -29, ARIM = -1.6, AWL = -2.72;
  const aer = L.group(scene, 68, GL, -16), ay = (y) => y - GL;
  aer.add(jbox(-22.4, 22.4, ay(-3.6), ay(ARIM), 13, 13.4, M.concreteJ), jbox(-22.4, 22.4, ay(-3.6), ay(ARIM), -13.4, -13, M.concreteJ), jbox(-22.4, -22, ay(-3.6), ay(ARIM), -13, 13, M.concreteJ), jbox(22, 22.4, ay(-3.6), ay(ARIM), -13, 13, M.concreteJ));
  aer.add(jbox(-20.4, -20.1, ay(-3.6), ay(ARIM - 0.5), -13, 13, M.concreteJ)); // canal de distribuição
  const aerW = L.mat('#8d8253', { roughness: 0.3 });
  aer.add(bx(-22, 22, ay(AWL) - 0.05, ay(AWL), -13, 13, aerW, { cast: false }));
  const wr = new Rails();
  [-4.33, 4.33].forEach((z) => { aer.add(bx(-20.1, 22, ay(-3.6), ay(ARIM), z - 0.55, z + 0.55, M.concrete), bx(-20.1, 22, ay(ARIM), ay(ARIM) + 0.05, z - 0.5, z + 0.5, M.grating)); wr.add([[-20, ay(ARIM) + 0.05, z - 0.5], [21.9, ay(ARIM) + 0.05, z - 0.5]]).add([[-20, ay(ARIM) + 0.05, z + 0.5], [21.9, ay(ARIM) + 0.05, z + 0.5]]); });
  wr.add([[-22.2, ay(ARIM), 13.2], [22.2, ay(ARIM), 13.2], [22.2, ay(ARIM), -13.2], [-22.2, ay(ARIM), -13.2]], true).build(aer);
  { // rede de ar: coletor azul + ramais com descidas
    const ap = [[[-25, ay(-0.9), -14.2], [21.5, ay(-0.9), -14.2], 0.32]];
    for (let i = 0; i < 10; i++) { const x = -18 + i * 4.3; ap.push([[x, ay(-0.9), -14.2], [x, ay(-0.9), 11.5], 0.13]); [-8.67, 0, 8.67].forEach((z) => ap.push([[x, ay(-0.9), z], [x, ay(AWL) - 0.3, z], 0.09])); ap.push([[x, ay(ARIM), -13.2], [x, ay(-0.9), -13.2], 0.06], [[x, ay(ARIM), 13.2], [x, ay(-0.9), 11.5], 0.06]); }
    ap.push([[-25, ay(-0.9), -14.2], [-25, ay(-0.9), -17], 0.32]);
    aer.add(rods(ap, L.mat(PAL.blue, { roughness: 0.45, metalness: 0.2 }), 10));
  }
  const NB = 620, brd = L.rng(41), BUB = [], bubbles = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 4), L.mat('#f1ead2', { roughness: 0.4, emissive: '#f1ead2', emissiveIntensity: 0.15 }), NB);
  bubbles.frustumCulled = false; bubbles.castShadow = false; aer.add(bubbles);
  for (let i = 0; i < NB; i++) { const col = Math.floor(brd() * 10), lane = Math.floor(brd() * 3); BUB.push({ x: -18 + col * 4.3 + (brd() - 0.5) * 3.2, z: [-8.67, 0, 8.67][lane] + (brd() - 0.5) * 6.4, ph: brd(), s: 0.1 + brd() * 0.16, v: 1.2 + brd() }); }
  const blow = pop(40.5, GL, -30.5);
  blow.add(K.building(7, 5.6, 9, { floors: 1, band: M.wallBlue, ac: 1, seed: 6 }));
  blow.add(rods([[[2.5, 1.1, -2.5 + 16.3 - 16.3], [2.5, 1.1, -2.5], 0.32]], L.mat(PAL.blue, { roughness: 0.45, metalness: 0.2 }), 10));
  for (let i = 0; i < 3; i++) blow.add(L.cyl(0.45, 0.45, 1.2, M.galv, -2 + i * 2, 6.6, 1, 14));

  /* ---------- árvores ---------- */
  const occ = [[-37.5, -0.8, -12, 0], [-52, 92, -19.5, -12.5], [-49, -35, -31, -20], [-38, -7, -50.5, -36.5], [-34, -20, -26, -18], [5, 35, -48.5, 0], [33, 91, -30.5, 0], [36, 45, -36, -24], [46.5, 85.5, -53, -35], [-4, 1, -39, -35], [0.5, 7.5, -54, 0], [84, 92, -46, -42], [-52, -46, -13, -8]];
  const trd = L.rng(123), spots = [];
  const tryAdd = (x, z, s) => { if (occ.some((q) => x > q[0] - 1.6 && x < q[1] + 1.6 && z > q[2] - 1.6 && z < q[3] + 1.6)) return; if (spots.some((p) => Math.hypot(p[0] - x, p[1] - z) < 3.2)) return; spots.push([x, z, s]); };
  for (let x = -49; x < 90; x += 4.4) tryAdd(x + (trd() - 0.5) * 1.5, -51.3 + (trd() - 0.5) * 1.6, 0.9 + trd() * 0.5);
  for (let z = -22; z > -50; z -= 4.6) tryAdd(-49.3 + (trd() - 0.5), z, 0.9 + trd() * 0.5);
  for (let i = 0; i < 260; i++) tryAdd(-50 + trd() * 140, -1.5 - trd() * 50, 0.75 + trd() * 0.6);
  for (let b = 0; b < 8; b++) { const x0 = -52 + b * 18, list = spots.filter((p) => p[0] >= x0 && p[0] < x0 + 18); if (!list.length) continue; const xm = x0 + 9, hi = list.filter((p) => p[0] < 4), lo = list.filter((p) => p[0] >= 4);
    if (hi.length) pop(xm, 0, 0).add(K.trees(hi.map((p) => [p[0] - xm, p[1], p[2]]), 5 + b)); if (lo.length) pop(xm, GL, 0).add(K.trees(lo.map((p) => [p[0] - xm, p[1], p[2]]), 15 + b)); }

  const _o = new THREE.Object3D();
  function update(t) {
    br2.rotation.y = 2.2 + t * 0.05; brS1.rotation.y = t * 0.04; brS2.rotation.y = 1 + t * 0.04;
    flame.scale.set(1 + Math.sin(t * 9) * 0.12, 1 + Math.sin(t * 13 + 1) * 0.18, 1 + Math.cos(t * 11) * 0.12);
    chOut.update(t, { speed: 0.22 });
    for (let i = 0; i < NB; i++) { const p = BUB[i], k = L.fract(p.ph + t * p.v); _o.position.set(p.x, ay(AWL) + 0.01, p.z); _o.scale.set(p.s * (0.4 + k), p.s * 0.35 * (1 - k * k), p.s * (0.4 + k)); _o.updateMatrix(); bubbles.setMatrixAt(i, _o.matrix); }
    bubbles.instanceMatrix.needsUpdate = true;
  }
  return { update, gy };
}
