// Decantador primário em corte (metade removida pelo plano z = 0), com ponte raspadora giratória.
export function buildClarifier(L, K, scene, pop) {
  const { THREE, PAL, TAU } = L, { M, bx, sec, rect, rod, rods, Rails, latheSegs } = K;
  const CX = 20, GL = -2, RIM = -1.7, WL = -2.25, R = 13, DS = THREE.DoubleSide, PI = Math.PI;
  const g = L.group(scene, CX, 0, 0), half = [PI / 2, PI];
  const floorY = (r) => (r < 0.8 ? -3.2 : r < 1.9 ? -8.3 : r < 3 ? L.lerp(-8.3, -7.3, (r - 1.9) / 1.1) : L.lerp(-7.3, -5.9, (r - 3) / 10));

  /* ---------- solo com o furo do tanque e as tubulações ---------- */
  const pipeMat = L.mat('#aab2b9', { roughness: 0.9, side: DS });
  const feed = L.cutPipe([[-1.996, -2.3], [0.6, -2.7], [3.6, -6.3], [6.6, -9.1], [10, -9.5], [18.98, -9.5]], { r: 0.65, wall: 0.1, mat: pipeMat, seg: 90, radial: 14, tension: 0.4 });
  feed.waterIn(0.985, '#86603a', 1);
  const sludgePipeMat = L.mat('#5f6a73', { roughness: 0.7, side: DS });
  const slp = L.cutPipe([[21.5, -8.73], [21.5, -9.25], [22.1, -9.95], [24.5, -10.3], [29.6, -10.45]], { r: 0.3, wall: 0.06, mat: sludgePipeMat, seg: 60, radial: 10, tension: 0.4 });
  slp.waterIn(0.985, PAL.sludge, 1);
  const tankPoly = [[2, 0.5], [6, GL], [6.6, GL], [6.6, -6.25], [16.9, -7.7], [18, -8.7], [19, -8.7], [19, -10.3], [21, -10.3], [21, -8.7], [22, -8.7], [23.1, -7.7], [33.4, -6.25], [33.4, GL], [34.5, GL], [34.5, 0.5]];
  const S4 = L.soilWall({ x0: -2, x1: 34, y0: -12, y1: 0, z: 0, depth: 54, pipes: [feed, slp], holes: [tankPoly], seed: 7, bands: [0, 0.61, 7.08, 12] });
  const S5 = L.soilWall({ x0: 34, x1: 92, y0: -12, y1: GL, z: 0, depth: 54, seed: 11, bands: [0, 0.05, 5.3, 10] });
  S4.remove(S4.children[2]); // lateral interna que ficaria acima do patamar baixo
  scene.add(feed.group, slp.group, S4, S5);
  { const e = L.group(scene, 29.6, -10.45, 0.004); e.add(L.mesh(new THREE.CircleGeometry(0.34, 24), sludgePipeMat, 0, 0, 0, { cast: false }), L.mesh(new THREE.CircleGeometry(0.25, 24), L.flat('#2a1d13'), 0, 0, 0.002, { cast: false })); }

  /* ---------- concreto ---------- */
  const prof = [[0.8, -8.3], [1.9, -8.3], [3.0, -7.3], [R, -5.9], [R, RIM], [R + 0.4, RIM], [R + 0.4, -6.25], [3.1, -7.7], [2.0, -8.7], [0.8, -8.7]];
  g.add(latheSegs(prof, M.concreteDS, 64, ...half));
  const col = [[0.55, -8.7], [0.8, -8.7], [0.8, -3.9], [1.15, -3.2], [0.9, -3.2], [0.55, -3.8]];
  g.add(latheSegs([...col, col[0]], M.concreteDS, 24, ...half));
  // calha coletora, vertedor e anteparo de escuma
  const launder = [[12.15, WL], [12.15, -3.05], [R, -3.05], [R, -2.9], [12.3, -2.9], [12.3, WL]];
  g.add(latheSegs([...launder, launder[0]], M.concreteDS, 64, ...half));
  g.add(latheSegs([[11.6, -2.8], [11.6, -2.05]], M.steelDS, 64, ...half));
  for (let i = 0; i < 12; i++) { const f = PI / 2 + ((i + 0.5) / 12) * PI; g.add(rod([11.6 * Math.sin(f), -2.12, 11.6 * Math.cos(f)], [12.2 * Math.sin(f), -2.3, 12.2 * Math.cos(f)], 0.03, M.steel, 6)); }
  // caixa de chegada sob o tanque
  g.add(bx(-1, 1, -10.3, -10.05, -1, 0, M.concrete), bx(0.7, 1, -10.05, -8.7, -1, 0, M.concrete), bx(-1, 1, -10.05, -8.7, -1, -0.7, M.concrete));
  // faces de corte (espelhadas)
  const mir = (p) => p.map(([x, y]) => [-x, y]).reverse();
  [prof, col, launder].forEach((p) => g.add(sec(p), sec(mir(p))));
  g.add(sec(rect(-1, -10.3, 1, -10.05)), sec(rect(0.7, -10.05, 1, -8.7)), sec(rect(-1, -8.95, -0.7, -8.7)));
  [-11.6, 11.6].forEach((x) => g.add(sec(rect(x - 0.03, -2.8, x + 0.03, -2.05), M.steel)));
  // juntas e emendas
  g.add(sec(rect(-1.06, -10.12, -0.94, -9.98), M.dark, 0.006), sec(rect(-1.06, -9.02, -0.94, -8.88), M.dark, 0.006));
  const feedFace = L.mat('#86603a', { roughness: 0.3, side: DS });
  g.add(sec(rect(-1.05, -10.05, 0.7, -8.95), feedFace, 0.003), sec(rect(-0.55, -8.96, 0.55, -3.8), feedFace, 0.003), sec([[-0.55, -3.8], [0.55, -3.8], [0.9, -3.2], [-0.9, -3.2]], feedFace, 0.003));
  g.add(sec(rect(1.22, -8.74, 1.78, -8.3), L.mat(PAL.sludge, { roughness: 0.6 }), 0.005));

  /* ---------- água, lodo ---------- */
  const top = L.mesh(new THREE.CircleGeometry(12.15, 72, 0, PI), L.water(PAL.murky, 0.8, { depthWrite: false }), 0, WL, 0, { cast: false }); top.rotation.x = -PI / 2; top.renderOrder = 8; g.add(top);
  const lw = L.mesh(new THREE.RingGeometry(12.3, R, 72, 1, 0, PI), L.water('#a99a66', 0.92), 0, -2.62, 0, { cast: false }); lw.rotation.x = -PI / 2; g.add(lw);
  [-1, 1].forEach((k) => g.add(sec(rect(k * 12.3, -2.9, k * R, -2.62), L.mat('#a99a66', { roughness: 0.3, side: DS }), 0.003)));
  { // face de água com degradê (mais escura no fundo)
    const NXF = 96, NY = 10, pos = [], colr = [], idx = [], cTop = new THREE.Color('#b29c5c'), cBot = new THREE.Color('#6f5631'), c = new THREE.Color();
    for (let i = 0; i <= NXF; i++) { const x = -12.15 + (24.3 * i) / NXF, yb = floorY(Math.abs(x)); for (let j = 0; j <= NY; j++) { const y = L.lerp(WL, yb, j / NY); pos.push(x, y, 0); c.copy(cTop).lerp(cBot, L.clamp01((WL - y) / 5.2)); colr.push(c.r, c.g, c.b); } }
    for (let i = 0; i < NXF; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, b = a + NY + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(colr, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const face = L.mesh(geo, L.mat('#ffffff', { vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false, roughness: 0.25, side: DS }), 0, 0, 0.001, { cast: false }); face.renderOrder = 7; g.add(face);
  }
  // manta de lodo: anéis (r) x ângulo, atualizados a cada quadro; a 1ª "coluna" é a face de corte
  const RS = [0.82, 1.3, 1.9, 2.4, 3, 4.2, 5.6, 7.2, 8.8, 10.4, 11.8, 12.98], NA = 40;
  const slGeo = new THREE.BufferGeometry(), slPos = new Float32Array(RS.length * (NA + 1) * 3), slIdx = [];
  for (let i = 0; i < RS.length - 1; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; slIdx.push(a, b, a + 1, a + 1, b, b + 1); }
  slGeo.setAttribute('position', new THREE.BufferAttribute(slPos, 3)); slGeo.setIndex(slIdx);
  const slMat = L.mat(PAL.sludge, { roughness: 0.85, side: DS });
  const slTop = L.mesh(slGeo, slMat, 0, 0, 0, { cast: false }); slTop.frustumCulled = false; g.add(slTop);
  const NS = 80;
  // duas faixas por lado: lodo opaco + névoa que some para cima
  const fGeo = new THREE.BufferGeometry(), fPos = new Float32Array(2 * (NS + 1) * 3 * 3), fCol = new Float32Array(2 * (NS + 1) * 3 * 4), fIdx = [];
  { const sc = new THREE.Color('#3b2a1b');
    for (let s = 0; s < 2; s++) for (let i = 0; i <= NS; i++) { const b = (s * (NS + 1) + i) * 3; for (let k = 0; k < 3; k++) { const q = (b + k) * 4; fCol[q] = sc.r; fCol[q + 1] = sc.g; fCol[q + 2] = sc.b; fCol[q + 3] = k === 2 ? 0 : 1; } if (i < NS) fIdx.push(b, b + 3, b + 1, b + 1, b + 3, b + 4, b + 1, b + 4, b + 2, b + 2, b + 4, b + 5); } }
  fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3)); fGeo.setAttribute('color', new THREE.BufferAttribute(fCol, 4)); fGeo.setIndex(fIdx);
  { const nr = new Float32Array(fPos.length); for (let i = 2; i < nr.length; i += 3) nr[i] = 1; fGeo.setAttribute('normal', new THREE.BufferAttribute(nr, 3)); }
  // face do lodo sem iluminação, para ficar escura igual dos dois lados do corte
  const slFace = L.mesh(fGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DS }), 0, 0, 0.0025, { cast: false }); slFace.renderOrder = 9; slFace.frustumCulled = false; g.add(slFace);
  const slG = (t) => 0.3 + 0.7 * L.sstep(60.8, 64.6, t);
  const slH = (r, gt) => gt * (0.5 + 1.25 * Math.exp(-Math.pow(r / 4.8, 2)) + 0.1 * Math.sin(r * 1.7) * Math.exp(-r / 9));
  // flocos afundando
  const NP = 260, prd = L.rng(19), flocs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), L.mat('#4d3722', { roughness: 0.9, flatShading: true }), NP), FP = [];
  flocs.frustumCulled = false; flocs.castShadow = false; g.add(flocs);
  for (let i = 0; i < NP; i++) FP.push({ x: (prd() < 0.5 ? -1 : 1) * (1.5 + prd() * 10.3), z: prd() < 0.5 ? 0.03 + prd() * 0.02 : -0.1 - prd() * 2.2, ph: prd(), T: 5 + prd() * 4, s: 0.05 + prd() * 0.07, w: prd() * TAU });
  // setas: sobe pelo centro, espalha, sai pelo vertedor
  const cv = (k) => [[0, -8.6, 0.07], [0, -4.6, 0.07], [k * 0.7, -3.0, 0.07], [k * 1.9, -3.3, 0.07], [k * 2.3, -4.5, 0.07], [k * 3.4, -5.1, 0.07], [k * 7.5, -3.7, 0.07], [k * 11.9, -2.5, 0.07]];
  const chR = new L.Chevrons(cv(1), { n: 9, size: 0.42, normal: [0, 0, 1] }), chL = new L.Chevrons(cv(-1), { n: 9, size: 0.42, normal: [0, 0, 1] });
  const chFeed = new L.Chevrons(feed.curve, { n: 8, size: 0.4, normal: [0, 0, 1], offset: [0, 0, 0.07] });
  g.add(chR.mesh, chL.mesh); scene.add(chFeed.mesh);

  /* ---------- ponte raspadora (gira em torno do centro) ---------- */
  const br = L.group(g, 0, RIM, 0), BY = 0.95; // BY = piso da passarela acima da borda
  [-0.62, 0.62].forEach((z) => { br.add(bx(-0.9, R + 0.9, BY - 0.42, BY, z - 0.06, z + 0.06, M.blue), bx(-0.9, R + 0.9, BY - 0.95, BY - 0.87, z - 0.05, z + 0.05, M.blue)); });
  { const tr = []; for (let i = 0; i < 12; i++) { const x0 = -0.9 + (i * (R + 1.8)) / 12, x1 = x0 + (R + 1.8) / 12; [-0.62, 0.62].forEach((z) => { tr.push([[x0, BY - 0.9, z], [x0, BY - 0.4, z], 0.03], [[x0, BY - (i % 2 ? 0.4 : 0.9), z], [x1, BY - (i % 2 ? 0.9 : 0.4), z], 0.03]); }); tr.push([[x0, BY - 0.9, -0.62], [x0, BY - 0.9, 0.62], 0.03]); } br.add(rods(tr, M.blue, 6)); }
  br.add(bx(-0.9, R + 0.9, BY, BY + 0.05, -0.62, 0.62, M.grating));
  new Rails({ h: 1.05 }).add([[-0.85, BY + 0.05, -0.6], [R + 0.85, BY + 0.05, -0.6]]).add([[-0.85, BY + 0.05, 0.6], [R + 0.85, BY + 0.05, 0.6]]).add([[-0.85, BY + 0.05, -0.6], [-0.85, BY + 0.05, 0.6]]).build(br);
  // carro de tração na borda
  br.add(L.rbox(0.9, 0.8, 1.6, 0.06, M.blue, R + 0.2, 0.42, 0));
  { const wh = L.cyl(0.3, 0.3, 0.2, M.rubber, R + 0.2, 0.3, 0.55, 18); wh.rotation.z = PI / 2; const wh2 = wh.clone(); wh2.position.z = -0.55; br.add(wh, wh2);
    const mo = K.motor(0.2, 0.6, M.green); mo.rotation.x = PI / 2; mo.position.set(R + 0.2, 0.62, 0.75); br.add(mo); }
  // pivô central e gaiola
  br.add(L.cyl(0.95, 0.95, 0.35, M.iron, 0, BY - 0.7, 0, 24), L.cyl(0.5, 0.5, 0.5, M.green, 0, BY + 0.3, 0, 20), L.rbox(0.6, 0.9, 0.5, 0.05, M.galv, -0.4, BY + 0.55, -0.35));
  { const cg = []; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; cg.push([[0.85 * Math.cos(a), BY - 0.8, 0.85 * Math.sin(a)], [1.0 * Math.cos(a), -1.45, 1.0 * Math.sin(a)], 0.05]); } br.add(rods(cg, M.iron, 6)); br.add(L.cyl(1.05, 1.05, 0.12, M.iron, 0, -1.45, 0, 24)); }
  // poço central de alimentação (cilindro defletor), pendurado na ponte
  const wellMat = L.metal('#8e9aa4', { roughness: 0.5, metalness: 0.5, side: DS });
  g.add(latheSegs([[2.6, RIM - 0.2], [2.6, -4.7]], wellMat, 40, ...half));
  [-2.6, 2.6].forEach((x) => g.add(sec(rect(x - 0.035, -4.7, x + 0.035, RIM - 0.2), M.steel)));
  { const hg = []; for (let i = 0; i < 5; i++) { const f = PI / 2 + ((i + 0.5) / 5) * PI; hg.push([[2.6 * Math.sin(f), RIM - 0.25, 2.6 * Math.cos(f)], [0.95 * Math.sin(f), RIM + BY - 0.75, 0.95 * Math.cos(f)], 0.035]); } g.add(rods(hg, M.iron, 6)); }
  // braços raspadores junto ao fundo cônico
  const lf = (x) => floorY(x) - RIM + 0.28;
  { const arm = [[[2.9, lf(2.9), 0], [12.7, lf(12.7), 0], 0.07]]; [3.6, 6.4, 9.3, 12.2].forEach((x) => { arm.push([[x, BY - 0.9, 0.5], [x, lf(x), 0], 0.05], [[x, BY - 0.9, -0.5], [x, lf(x), 0], 0.05]); }); arm.push([[3.6, lf(3.6), 0], [6.4, BY - 0.9, 0], 0.035], [[9.3, lf(9.3), 0], [6.4, BY - 0.9, 0], 0.035], [[9.3, lf(9.3), 0], [12.2, BY - 0.9, 0], 0.035]);
    br.add(rods(arm, M.iron, 8));
    for (let i = 0; i < 7; i++) { const x = 3.4 + i * 1.5, b = L.box(1.7, 0.42, 0.05, M.yellow, x, lf(x) - 0.08, 0); b.rotation.y = 0.75; b.rotation.z = Math.atan2(1.4, 10); br.add(b); }
    const sk = L.box(8.6, 0.3, 0.05, M.yellow, 7.2, WL - RIM, 0.35); sk.rotation.y = 0.12; br.add(sk); }
  const worker = K.person(); worker.position.set(8.2, BY + 0.05, 0.1); worker.rotation.y = 0.4; br.add(worker);
  // guarda-corpo na borda + escada de acesso
  new Rails().arc(0, RIM, 0, R + 0.2, PI / 2 + 0.02, (3 * PI) / 2 - 0.02).build(g);
  // caminhonete e operador no pátio, para dar escala
  const tk = pop(37.6, GL, -5.2); { const tr = K.truck('#f4f6f7'); tr.rotation.y = 0.35; tk.add(tr); const p2 = K.person({ helmet: M.yellow }); p2.position.set(-2.3, 0, 2.6); p2.rotation.y = -0.6; tk.add(p2); }

  const mv = L.group(scene, 9, GL + 0.06, -15.0); { const tr = K.truck('#f6c12c'); mv.add(tr); }
  const _o = new THREE.Object3D();
  function update(t) {
    mv.position.x = Math.max(9, 13 + (t - 61) * 3.2);
    br.rotation.y = 0.12 + 0.105 * Math.max(0, t - 59.5);
    const gt = slG(t);
    for (let i = 0; i < RS.length; i++) { const r = RS[i], y = floorY(r) + slH(r, gt); for (let j = 0; j <= NA; j++) { const f = PI / 2 + (j / NA) * PI, k = (i * (NA + 1) + j) * 3; slPos[k] = r * Math.sin(f); slPos[k + 1] = y; slPos[k + 2] = r * Math.cos(f); } }
    slGeo.attributes.position.needsUpdate = true; slGeo.computeVertexNormals();
    for (let s = 0; s < 2; s++) for (let i = 0; i <= NS; i++) { const r = 0.82 + (12.16 * i) / NS, x = (s ? -1 : 1) * r, yb = floorY(r), h = slH(r, gt), k = (s * (NS + 1) + i) * 9;
      fPos[k] = x; fPos[k + 1] = yb; fPos[k + 2] = 0; fPos[k + 3] = x; fPos[k + 4] = yb + h; fPos[k + 5] = 0; fPos[k + 6] = x; fPos[k + 7] = yb + h + 0.55; fPos[k + 8] = 0; }
    fGeo.attributes.position.needsUpdate = true;
    for (let i = 0; i < NP; i++) { const p = FP[i], r = Math.abs(p.x), k = L.fract(p.ph + t / p.T), yb = floorY(r) + slH(r, gt) * 0.8, y = L.lerp(WL - 0.25, yb, k);
      _o.position.set(p.x + Math.sin(t * 0.7 + p.w) * 0.12, y, p.z); _o.rotation.set(p.w + t * 0.3, p.w * 2, 0); _o.scale.setScalar(p.s * Math.min(1, k * 8) * Math.min(1, (1 - k) * 6)); _o.updateMatrix(); flocs.setMatrixAt(i, _o.matrix); }
    flocs.instanceMatrix.needsUpdate = true;
    chR.update(t, { speed: 0.05 }); chL.update(t, { speed: 0.05 }); chFeed.update(t, { speed: 0.09 });
  }
  return { update, CX, R, RIM, WL, GL };
}
