// TOMADA D'ÁGUA no lago: ensecadeira de estacas-prancha (obra a seco), torre de concreto com grade de barras (face −z),
// comporta de gaveta com pórtico e atuador no tabuleiro, passarela até a casa de bombas, tubo de ligação torre → poço,
// detritos presos na grade e setas do fluxo. A frente da torre (+z) é cortada acima de y = −0,9 para ver o interior.
// Sub-fases saem de S.build.intake (k) e S.build.pumps (abertura da comporta).
export function buildIntake(ctx, K, R) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, bake, boxC, cylA } = K, I = Lo.INTAKE;
  const u = (k, a, b) => L.clamp01((k - a) / (b - a)), E = L.ease;
  const g = new THREE.Group(); g.name = 'captacao.intake'; R.root.add(g);
  const GY = (x, z) => (ctx.shared.groundY ? ctx.shared.groundY(x, z) : Lo.G(x, z));

  /* ---------- cotas da torre ---------- */
  const T = { x0: 1.8, x1: 6.2, z0: -107.6, z1: -104.4, w: 0.4, base: -4.2, top: 4.6, deck: 4.9, frontCut: -0.9 };
  const SCR = { x0: I.x - I.screen.w / 2, x1: I.x + I.screen.w / 2, y0: I.screen.y0, y1: I.screen.y0 + I.screen.h };
  const GATE = { z: -106.95, x0: 2.25, x1: 5.75, y0: -2.45, y1: 2.25, lift: 4.4 };
  const PIPE = { y: -2.2, r: 0.5, z0: -104.6, z1: -98.75 };
  R.T = T; R.PIPE = PIPE;

  /* ---------- ensecadeira (estacas-prancha em U, cravadas uma a uma) ---------- */
  const CD = { x0: 0.6, x1: 7.4, z0: -109.0, z1: -103.0, top: 4.4, len: 12.4 };
  const pileShape = (() => { const w = 0.3, d = 0.14, t = 0.04; const o = [[-w, 0], [-0.16, d], [0.16, d], [w, 0]], s = new THREE.Shape();
    s.moveTo(o[0][0], o[0][1]); o.slice(1).forEach((p) => s.lineTo(p[0], p[1])); [...o].reverse().forEach((p) => s.lineTo(p[0], p[1] - t)); s.closePath(); return s; })();
  const pileGeo = new THREE.ExtrudeGeometry(pileShape, { depth: CD.len, bevelEnabled: false }); pileGeo.rotateX(-Math.PI / 2); // extrusão ao longo de +y
  const piles = [];
  const side = (ax, az, bx, bz) => { const len = Math.hypot(bx - ax, bz - az), n = Math.round(len / 0.6); for (let i = 0; i < n; i++) { const f = (i + 0.5) / n; piles.push({ x: L.lerp(ax, bx, f), z: L.lerp(az, bz, f), ry: Math.atan2(-(bz - az), bx - ax), flip: piles.length % 2 }); } };
  side(CD.x0, CD.z1, CD.x1, CD.z1); side(CD.x1, CD.z1, CD.x1, CD.z0); side(CD.x1, CD.z0, CD.x0, CD.z0); side(CD.x0, CD.z0, CD.x0, CD.z1);
  const pileIM = new THREE.InstancedMesh(pileGeo, MAT.pile, piles.length); pileIM.castShadow = pileIM.receiveShadow = true; pileIM.frustumCulled = false; g.add(pileIM);
  const _o = new THREE.Object3D();
  function setPiles(k) {
    const N = piles.length;
    piles.forEach((p, i) => {
      const a = 0.005 + (i / N) * 0.085, drive = E.out(u(k, a, a + 0.02)), pull = E.in(u(k, 0.9 + (i / N) * 0.07, 0.92 + (i / N) * 0.07));
      const on = drive > 0 && pull < 1;
      _o.position.set(p.x, CD.top - CD.len + (1 - drive) * 7 + pull * 12, p.z); _o.rotation.set(0, p.ry + (p.flip ? Math.PI : 0), 0);
      _o.scale.setScalar(on ? 1 : 0); _o.updateMatrix(); pileIM.setMatrixAt(i, _o.matrix);
    });
    pileIM.instanceMatrix.needsUpdate = true;
  }
  // chão do leito dentro da ensecadeira (lama) e água interna (bombeada para fora e depois devolvida)
  const IN = { x0: CD.x0 + 0.02, x1: CD.x1 - 0.02, z0: CD.z0 + 0.02, z1: CD.z1 - 0.02 };
  const bedGeo = new THREE.PlaneGeometry(IN.x1 - IN.x0, IN.z1 - IN.z0, 14, 12); bedGeo.rotateX(-Math.PI / 2);
  { const p = bedGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (IN.x0 + IN.x1) / 2, z = p.getZ(i) + (IN.z0 + IN.z1) / 2; p.setXYZ(i, x, Math.min(GY(x, z), 3.0) - 0.05, z); } bedGeo.computeVertexNormals(); }
  const bed = L.mesh(bedGeo, M('#5a4a37', { roughness: 0.92 }), 0, 0, 0, { cast: false }); g.add(bed);
  const puddles = []; [[2.6, -108.2], [6.2, -104.2], [1.6, -105.0]].forEach(([x, z], i) => { const pd = L.mesh(new THREE.CircleGeometry(0.5 + i * 0.15, 16), K.blendWater(Lo.WATER.lake, 0.7), x, GY(x, z) + 0.02, z, { cast: false }); pd.rotation.x = -Math.PI / 2; pd.renderOrder = 10; g.add(pd); puddles.push(pd); });
  const innerW = L.mesh(new THREE.PlaneGeometry(IN.x1 - IN.x0, IN.z1 - IN.z0), K.blendWater(Lo.WATER.lake, 0.82), (IN.x0 + IN.x1) / 2, 0, (IN.z0 + IN.z1) / 2, { cast: false });
  innerW.rotation.x = -Math.PI / 2; innerW.renderOrder = 10; g.add(innerW);
  // máscara: esconde o lago e o leito do terreno dentro da ensecadeira enquanto ela está seca
  const cdMask = R.mask(IN.x0, IN.x1, IN.z0, IN.z1, CD.top - 0.04);

  /* ---------- torre de tomada d'água ---------- */
  const tower = new THREE.Group(); g.add(tower);
  const slab = bake(L.put(new THREE.Group(), boxC(T.x0 - 0.3, T.x1 + 0.3, T.base - 0.6, T.base, T.z0 - 0.3, T.z1 + 0.3, MAT.conc))); tower.add(slab);
  const walls = new THREE.Group(); walls.position.y = T.base; tower.add(walls);
  { // paredes (coordenadas relativas à base)
    const w = new THREE.Group(), y0 = 0, H = T.top - T.base, c = MAT.conc, rel = (y) => y - T.base;
    w.add(boxC(T.x0, T.x0 + T.w, y0, H, T.z0, T.z1, c), boxC(T.x1 - T.w, T.x1, y0, H, T.z0, T.z1, c)); // laterais
    // parede de trás com a abertura da grade
    w.add(boxC(T.x0 + T.w, T.x1 - T.w, y0, rel(SCR.y0), T.z0, T.z0 + T.w, c), boxC(T.x0 + T.w, T.x1 - T.w, rel(SCR.y1), H, T.z0, T.z0 + T.w, c));
    w.add(boxC(T.x0 + T.w, SCR.x0, rel(SCR.y0), rel(SCR.y1), T.z0, T.z0 + T.w, c), boxC(SCR.x1, T.x1 - T.w, rel(SCR.y0), rel(SCR.y1), T.z0, T.z0 + T.w, c));
    // parede da frente (cortada em y = frontCut) com o furo do tubo (feito com 4 peças em volta)
    const fz0 = T.z1 - T.w, pr = PIPE.r + 0.04;
    w.add(boxC(T.x0 + T.w, T.x1 - T.w, y0, rel(PIPE.y - pr), fz0, T.z1, c), boxC(T.x0 + T.w, T.x1 - T.w, rel(PIPE.y + pr), rel(T.frontCut), fz0, T.z1, c));
    w.add(boxC(T.x0 + T.w, I.x - pr, rel(PIPE.y - pr), rel(PIPE.y + pr), fz0, T.z1, c), boxC(I.x + pr, T.x1 - T.w, rel(PIPE.y - pr), rel(PIPE.y + pr), fz0, T.z1, c));
    // face de corte da parede da frente (topo) — cor de corte
    w.add(boxC(T.x0 + T.w, T.x1 - T.w, rel(T.frontCut) - 0.01, rel(T.frontCut) + 0.015, fz0 - 0.005, T.z1 + 0.005, MAT.cut));
    // mísulas/marcas de forma (linhas de concretagem) nas laterais externas
    for (let y = 1.2; y < H; y += 1.2) [T.x0 - 0.012, T.x1 + 0.012].forEach((x) => w.add(boxC(x - 0.01, x + 0.01, y - 0.02, y + 0.02, T.z0, T.z1, MAT.concDark)));
    // guias da comporta (perfis U nas faces internas das laterais)
    [T.x0 + T.w, T.x1 - T.w].forEach((x, s) => { const d = s ? -1 : 1; w.add(boxC(Math.min(x, x + d * 0.12), Math.max(x, x + d * 0.12), rel(GATE.y0) - 0.1, H, GATE.z - 0.14, GATE.z - 0.1, MAT.galv), boxC(Math.min(x, x + d * 0.12), Math.max(x, x + d * 0.12), rel(GATE.y0) - 0.1, H, GATE.z + 0.1, GATE.z + 0.14, MAT.galv)); });
    // escada de marinheiro na parede lateral esquerda (interna)
    const lx = T.x0 + T.w + 0.18;
    [-105.0, -105.5].forEach((z) => w.add(boxC(lx - 0.02, lx + 0.02, rel(-3.6), H + 1.0, z - 0.02, z + 0.02, MAT.galv)));
    for (let y = rel(-3.4); y < H + 0.9; y += 0.32) w.add(cylA(0.016, 0.5, MAT.galv, lx, y, -105.25, 'z', 6));
    walls.add(bake(w));
  }
  // tabuleiro (deck) — duas lajes com a fenda da comporta; a frente do deck é cortada (vemos dentro da torre)
  const deck = new THREE.Group(); tower.add(deck);
  {
    const d = new THREE.Group();
    d.add(boxC(T.x0 - 0.2, T.x1 + 0.2, T.top, T.deck, T.z0 - 0.2, GATE.z - 0.22, MAT.conc), boxC(T.x0 - 0.2, T.x1 + 0.2, T.top, T.deck, GATE.z + 0.22, -105.4, MAT.conc));
    d.add(boxC(T.x0 - 0.2, T.x1 + 0.2, T.top, T.deck + 0.004, -105.41, -105.39, MAT.cut));
    // guarda-corpo do deck
    const rail = MAT.yellowM;
    [[T.x0 - 0.12, T.z0 - 0.12, T.x0 - 0.12, -105.45], [T.x1 + 0.12, T.z0 - 0.12, T.x1 + 0.12, -105.45], [T.x0 - 0.12, T.z0 - 0.12, T.x1 + 0.12, T.z0 - 0.12]].forEach(([ax, az, bx, bz]) => {
      d.add(K.rod([ax, T.deck + 1.05, az], [bx, T.deck + 1.05, bz], 0.03, rail, 6), K.rod([ax, T.deck + 0.55, az], [bx, T.deck + 0.55, bz], 0.022, rail, 6));
      const n = Math.max(2, Math.round(Math.hypot(bx - ax, bz - az) / 1.1)); for (let i = 0; i <= n; i++) { const x = L.lerp(ax, bx, i / n), z = L.lerp(az, bz, i / n); d.add(K.rod([x, T.deck, z], [x, T.deck + 1.05, z], 0.025, rail, 6)); }
    });
    // pórtico e atuador da comporta
    [T.x0 + 0.1, T.x1 - 0.1].forEach((x) => d.add(boxC(x - 0.12, x + 0.12, T.deck, 7.7, GATE.z - 0.12, GATE.z + 0.12, MAT.blue)));
    d.add(boxC(T.x0 - 0.05, T.x1 + 0.05, 7.6, 7.9, GATE.z - 0.16, GATE.z + 0.16, MAT.blue));
    d.add(L.rbox(0.7, 0.55, 0.5, 0.06, M('#d6dbe0', { roughness: 0.5 }), I.x, 8.18, GATE.z), cylA(0.2, 0.42, MAT.blue, I.x + 0.55, 8.18, GATE.z, 'x', 18)); // atuador elétrico + motor
    d.add(L.torus(0.22, 0.03, MAT.red, I.x - 0.5, 8.18, GATE.z + 0.3)); // volante de emergência
    deck.add(bake(d));
  }
  // comporta (painel de aço com nervuras) e hastes de içamento
  const gate = new THREE.Group(); tower.add(gate);
  {
    const p = new THREE.Group(), gm = M('#46617a', { roughness: 0.45, metalness: 0.55 });
    p.add(boxC(GATE.x0, GATE.x1, GATE.y0, GATE.y1, GATE.z - 0.07, GATE.z + 0.07, gm));
    for (let y = GATE.y0 + 0.5; y < GATE.y1; y += 0.85) p.add(boxC(GATE.x0 + 0.05, GATE.x1 - 0.05, y - 0.05, y + 0.05, GATE.z + 0.07, GATE.z + 0.2, gm));
    [GATE.x0 + 0.9, GATE.x1 - 0.9].forEach((x) => p.add(boxC(x - 0.05, x + 0.05, GATE.y0, GATE.y1, GATE.z + 0.07, GATE.z + 0.2, gm)));
    [GATE.x0 + 1.0, GATE.x1 - 1.0].forEach((x) => p.add(cylA(0.05, 6.2, MAT.steel, x, GATE.y1 + 3.1, GATE.z, 'y', 8)));
    gate.add(bake(p));
  }
  // grade de barras (instanciada; montada barra a barra)
  const NB = Math.floor((SCR.x1 - SCR.x0) / 0.15);
  const barIM = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, SCR.y1 - SCR.y0, 0.14), MAT.galv, NB + 3); barIM.castShadow = true; barIM.frustumCulled = false; tower.add(barIM);
  function setBars(k) {
    for (let i = 0; i < NB; i++) { const a = 0.55 + (i / NB) * 0.12, s = E.out(u(k, a, a + 0.02)); _o.position.set(SCR.x0 + 0.075 + i * 0.15, (SCR.y0 + SCR.y1) / 2 + (1 - s) * 2, T.z0 + 0.12); _o.rotation.set(0, 0, 0); _o.scale.set(1, 1, 1).multiplyScalar(s > 0 ? 1 : 0); _o.updateMatrix(); barIM.setMatrixAt(i, _o.matrix); }
    for (let j = 0; j < 3; j++) { const s = u(k, 0.66 + j * 0.01, 0.68 + j * 0.01) > 0 ? 1 : 0; _o.position.set(I.x, SCR.y0 + 0.9 + j * 1.25, T.z0 + 0.04); _o.rotation.set(0, 0, Math.PI / 2); _o.scale.set(1, ((SCR.x1 - SCR.x0) / (SCR.y1 - SCR.y0)) * s, 0.5 * s); _o.updateMatrix(); barIM.setMatrixAt(NB + j, _o.matrix); }
    barIM.instanceMatrix.needsUpdate = true;
  }
  // detritos presos do lado de fora da grade (folhas e galhos)
  const rd = L.rng(404), NL = 46, NT = 9;
  const leafIM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 5), M('#ffffff', { roughness: 0.8 }), NL); leafIM.frustumCulled = false; tower.add(leafIM);
  const twigIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.035, 1, 6), M('#5a3d24', { roughness: 0.9 }), NT); twigIM.frustumCulled = false; tower.add(twigIM);
  const leaves = [], twigs = [];
  for (let i = 0; i < NL; i++) { leaves.push({ x: L.lerp(SCR.x0 + 0.1, SCR.x1 - 0.1, rd()), y: L.lerp(SCR.y0 + 0.2, SCR.y1 - 0.1, Math.pow(rd(), 0.7)), r: rd() * 6, s: 0.08 + rd() * 0.08, a: rd() }); leafIM.setColorAt(i, new THREE.Color().setHSL(0.08 + rd() * 0.18, 0.55, 0.22 + rd() * 0.16)); }
  leafIM.instanceColor.needsUpdate = true;
  for (let i = 0; i < NT; i++) twigs.push({ x: L.lerp(SCR.x0 + 0.4, SCR.x1 - 0.4, rd()), y: L.lerp(SCR.y0 + 0.4, SCR.y1 - 0.4, rd()), a: (rd() - 0.5) * 2.4, l: 0.6 + rd() * 0.9, t: rd() });
  function setDebris(amount) {
    leaves.forEach((q, i) => { const on = amount > q.a; _o.position.set(q.x, q.y, T.z0 - 0.04); _o.rotation.set(q.r, q.r * 1.3, q.r * 0.7); _o.scale.set(q.s * 1.6, q.s, 0.02).multiplyScalar(on ? 1 : 0); _o.updateMatrix(); leafIM.setMatrixAt(i, _o.matrix); });
    twigs.forEach((q, i) => { const on = amount > q.t; _o.position.set(q.x, q.y, T.z0 - 0.06); _o.rotation.set(0, 0, q.a); _o.scale.set(1, q.l, 1).multiplyScalar(on ? 1 : 0); _o.updateMatrix(); twigIM.setMatrixAt(i, _o.matrix); });
    leafIM.instanceMatrix.needsUpdate = twigIM.instanceMatrix.needsUpdate = true;
    leafIM.visible = twigIM.visible = amount > 0.01;
  }
  // tubo de ligação torre → poço (concreto/aço, Ø 1,0 m) com flanges
  const link = new THREE.Group(); g.add(link);
  {
    const p = new THREE.Group();
    p.add(cylA(PIPE.r, PIPE.z1 - PIPE.z0, MAT.rawPipe, I.x, PIPE.y, (PIPE.z0 + PIPE.z1) / 2, 'z', 24));
    [PIPE.z0 + 0.2, -102.0, PIPE.z1 - 0.1].forEach((z) => K.flange(p, I.x, PIPE.y, z, PIPE.r * 0.82, 'z', MAT.rawPipeD, 10));
    p.add(cylA(PIPE.r + 0.25, 0.5, MAT.conc, I.x, PIPE.y, -103.2, 'z', 20)); // colar de vedação na entrada do talude
    link.add(bake(p));
  }
  // passarela torre → casa de bombas (vigas, piso em grade, guarda-corpos)
  const bridge = new THREE.Group(); g.add(bridge);
  {
    const b = new THREE.Group(), zA = T.z1 - 1.0, zB = I.house.z0, yA = T.deck, yB = I.house.floor, xs = [3.35, 4.65];
    xs.forEach((x) => b.add(K.rod([x, yA - 0.2, zA], [x, yB - 0.2, zB], 0.09, MAT.galv, 6)));
    b.add(L.mesh(K.quadGeo([3.3, yA + 0.01, zA], [4.7, yA + 0.01, zA], [4.7, yB + 0.01, zB], [3.3, yB + 0.01, zB]), M('#7d878e', { roughness: 0.6, metalness: 0.4, side: THREE.DoubleSide })));
    xs.forEach((x) => { const dx = x < 4 ? -0.05 : 0.05; b.add(K.rod([x + dx, yA + 1.05, zA], [x + dx, yB + 1.05, zB], 0.03, MAT.yellowM, 6), K.rod([x + dx, yA + 0.55, zA], [x + dx, yB + 0.55, zB], 0.022, MAT.yellowM, 6)); for (let i = 0; i <= 4; i++) { const z = L.lerp(zA, zB, i / 4), y = L.lerp(yA, yB, i / 4); b.add(K.rod([x + dx, y, z], [x + dx, y + 1.05, z], 0.025, MAT.yellowM, 6)); } });
    bridge.add(bake(b));
  }
  // setas do fluxo: represa → grade → torre → tubo (aparecem com a comporta aberta)
  const chev = new L.Chevrons(L.curve([[I.x, 0.4, -112.5], [I.x, 0.0, -109.5], [I.x, -0.4, T.z0 - 0.2], [I.x, -1.4, -106.2], [I.x, PIPE.y, T.z1 - 0.4], [I.x, PIPE.y, -103.6]]), { n: 7, size: 0.32, normal: [0, 0.6, 1], material: L.flat(L.PAL.accent, { toneMapped: false }) });
  g.add(chev.mesh);

  /* ---------- planta (contorno) ---------- */
  const plan = new THREE.Group();
  plan.add(boxC(T.x0, T.x1, T.base, T.deck, T.z0, T.z1, MAT.conc), boxC(3.35, 4.65, 4.6, 5.0, T.z1, I.house.z0, MAT.conc), cylA(PIPE.r, PIPE.z1 - PIPE.z0, MAT.conc, I.x, PIPE.y, (PIPE.z0 + PIPE.z1) / 2, 'z', 8));
  const planG = ghost.of(plan); g.add(planG);

  function update(t, S) {
    const k = S.build.intake, kp = S.build.pumps;
    // ensecadeira
    setPiles(k);
    pileIM.visible = k > 0.004 && k < 0.995;
    const dry = k > 0.08 && k < 0.9;                 // máscara ativa: lago e leito escondidos dentro da ensecadeira
    cdMask.visible = dry; bed.visible = dry;
    const lvl = k < 0.5 ? L.lerp(Lo.LAKE.level, -6, E.io(u(k, 0.08, 0.18))) : L.lerp(-6, Lo.LAKE.level, E.io(u(k, 0.83, 0.9)));
    innerW.visible = dry && lvl > -4.2; innerW.position.y = lvl;
    puddles.forEach((p) => { p.visible = dry && lvl < -3; });
    // torre
    const ks = E.out(u(k, 0.18, 0.24)), kw = E.io(u(k, 0.25, 0.5)), kd = E.out(u(k, 0.5, 0.55));
    tower.visible = ks > 0;
    slab.visible = ks > 0; slab.position.y = (1 - ks) * 1.5;
    walls.visible = kw > 0; walls.scale.y = Math.max(0.001, kw);
    deck.visible = kd > 0; deck.position.y = (1 - kd) * 2.5;
    setBars(k); barIM.visible = k > 0.55;
    // comporta: descida nas guias (obra) e abertura (antes das bombas partirem)
    const kg = E.out(u(k, 0.62, 0.75)), open = E.io(u(kp, 0.05, 0.35));
    gate.visible = kg > 0; gate.position.y = (1 - kg) * 5 + open * GATE.lift;
    // tubo e passarela
    const kl = E.out(u(k, 0.42, 0.5)); link.visible = kl > 0; link.position.y = (1 - kl) * 2;
    const kb = E.out(u(k, 0.66, 0.76)); bridge.visible = kb > 0; bridge.position.y = (1 - kb) * 3;
    // detritos acumulando depois que a água passa a entrar (função do tempo da história)
    const flow = S.present ? 1 : open;
    setDebris(S.present ? 1 : L.clamp01((S.st - 12.5) / 3.5) * (open > 0.5 ? 1 : 0));
    chev.update(t, { speed: 0.32, amount: flow * (k >= 1 ? 1 : 0) });
    planG.visible = S.ghost > 0.01 && k < 0.2;
  }
  return { update, T, PIPE, GATE, CD };
}
