// Decantador retangular de fluxo horizontal (fluxo −x) em corte pela frente: cortina distribuidora na entrada,
// poço de lodo (calha em V) em x = hopperX, ponte raspadora sobre trilhos com raspador de fundo (empurra o lodo para o
// poço, volta com a lâmina erguida), calhas de coleta com vertedores triangulares no topo perto da saída, canal de
// saída → CANAL DE ÁGUA DECANTADA (P.decOut → P.filtIn). Descarga de lodo com registro → tubo (em corte) → tanque de
// lodo (ADENSADOR, mecanismo de grade) → bomba → centrífuga → caçamba. Nunca para o rio.
export function buildDec(env) {
  const { L, THREE, Lo, K, ghost, root } = env, { MAT, ph, ss } = K, D = Lo.ETA.dec, th = 0.3, Zc = -74;
  const out = new THREE.Group(); root.add(out);
  const IX0 = D.x0 + th, IX1 = D.x1 - th, ZB = D.z0 + th, ZF = D.z1, FL = 15.2, HX = D.hopperX, WY = 20.33;
  const EC = { x0: IX0, x1: IX0 + 0.8, wall: 0.15, floor: 18.0, water: Lo.P.decOut[1] };   // canal de coleta junto à parede do fim
  const LAU = { z: [-76.6, -74.0, -71.4], x0: EC.x1 + EC.wall, x1: -17.2, w: 0.46, bot: 18.45, top: 19.2 };
  const CUR = 6.2;   // cortina distribuidora em x = −6.2
  const BR = { xmin: -24.6, xmax: -9.5 };

  /* ---------------------------------------------------------------- tanque (paredes, laje, enchimento do fundo com poço) */
  const wallsG = new THREE.Group(), innerG = new THREE.Group(), railG = new THREE.Group(), detG = new THREE.Group();
  {
    const g = new THREE.Group(), C = MAT.conc, Lx = D.x1 - D.x0, mx = (D.x0 + D.x1) / 2;
    g.add(L.box(Lx, 0.3, D.z1 - D.z0, MAT.slab, mx, 14.15, (D.z0 + D.z1) / 2));
    g.add(L.box(Lx, D.top - 14, th, C, mx, (14 + D.top) / 2, D.z0 + th / 2));
    g.add(L.box(th, D.top - 14, D.z1 - ZB, C, D.x0 + th / 2, (14 + D.top) / 2, (ZB + D.z1) / 2));            // parede do fim (oeste)
    const ny = 18.3; // parede leste com rasgo de entrada (vem do canal de transferência)
    g.add(L.box(th, ny - 14, D.z1 - ZB, C, D.x1 - th / 2, (14 + ny) / 2, (ZB + D.z1) / 2));
    [[ZB, -75], [-73, D.z1]].forEach(([a, b]) => g.add(L.box(th, D.top - ny, b - a, C, D.x1 - th / 2, (ny + D.top) / 2, (a + b) / 2)));
    g.add(L.box(Lx - 2 * th, D.top - D.water, th, C, mx, (D.water + D.top) / 2, D.z1 - th / 2));               // faixa da frente
    g.add(K.capZ(D.x0, D.x1, 14.0, 14.3, D.z1 + 0.004), K.capZ(D.x0, D.x0 + th, 14, D.top, D.z1 + 0.004), K.capZ(D.x1 - th, D.x1, 14, D.top, D.z1 + 0.004));
    // passarela de trás (continua a do floculador) + guarda-corpo + luminárias + escada no fim
    K.walkway(g, D.x0, Lo.ETA.floc.x0, -80.25, D.z0, WY);
    for (let x = D.x0 + 0.5; x < Lo.ETA.floc.x0; x += 3) { g.add(K.beam([x, 19.0, D.z0], [x, WY - 0.06, -80.2], 0.08, 0.08, MAT.galv)); g.add(K.beam([x, WY - 0.08, D.z0], [x, WY - 0.08, -80.25], 0.1, 0.1, MAT.galv)); }
    K.railing(g, [[D.x0, WY, -80.25], [Lo.ETA.floc.x0, WY, -80.25]]);
    K.railing(g, [[D.x0, WY, -80.25], [D.x0, WY, D.z0]]);
    for (let x = D.x0 + 3; x < Lo.ETA.floc.x0; x += 6) K.lamp(g, x, WY, -80.2, 2.2, [0, 0.5]);
    // trilhos da ponte (sobre a parede de trás e a faixa da frente)
    [D.z0 + th / 2, D.z1 - th / 2].forEach((z) => { g.add(L.box(IX1 - IX0, 0.1, 0.09, MAT.steel, (IX0 + IX1) / 2, D.top + 0.05, z)); g.add(L.box(0.25, 0.3, 0.4, MAT.red, IX0 + 0.2, D.top + 0.15, z), L.box(0.25, 0.3, 0.4, MAT.red, IX1 - 0.2, D.top + 0.15, z)); });
    const wet = K.M('#7f8a84', { roughness: 0.75, side: THREE.DoubleSide });
    g.add(L.mesh(new THREE.PlaneGeometry(IX1 - IX0, D.water - FL), wet, (IX0 + IX1) / 2, (FL + D.water) / 2, ZB + 0.006, { cast: false }));
    wallsG.add(K.bake(g));
    // enchimento do fundo com o poço de lodo (calha em V em x = hopperX) — extrudado ao longo de z
    const sh = [[IX0, 14.3], [IX1, 14.3], [IX1, FL], [HX + 1.2, FL], [HX + 0.3, 14.45], [HX - 0.3, 14.45], [HX - 1.2, FL], [IX0, FL + 0.12]];
    const s = new THREE.Shape(sh.map((p) => new THREE.Vector2(p[0], p[1])));
    const fg = new THREE.ExtrudeGeometry(s, { depth: ZF - ZB, bevelEnabled: false });
    const fill = new THREE.Mesh(fg, [MAT.cut, MAT.conc]); fill.position.z = ZB; fill.castShadow = fill.receiveShadow = true;
    wallsG.add(fill);
    out.add(wallsG);
  }
  /* ---------------------------------------------------------------- cortina distribuidora, canal de coleta, calhas */
  const LW = []; // águas das calhas
  {
    const g = new THREE.Group();
    // cortina perfurada (furos em grade)
    const s = new THREE.Shape([[-ZF, FL], [-ZB, FL], [-ZB, 19.55], [-ZF, 19.55]].map((p) => new THREE.Vector2(p[0], p[1])));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { const cz = -ZF + 0.45 + c * ((ZF - ZB - 0.9) / 14), cy = FL + 0.7 + r * 0.66, h = new THREE.Path(); h.absarc(cz, cy, 0.13, 0, L.TAU, true); s.holes.push(h); }
    const cg = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false, curveSegments: 10 });
    const cm = new THREE.Mesh(cg, [MAT.cut, MAT.concNew]); cm.rotation.y = Math.PI / 2; cm.position.x = -CUR - 0.1; cm.castShadow = cm.receiveShadow = true;
    // (rotação +90° em y: x_local → −z, z_local → +x)
    innerG.add(cm);
    // canal de coleta (suspenso) junto à parede do fim
    g.add(L.box(EC.x1 - EC.x0 + EC.wall, 0.2, ZF - ZB, C2(), (EC.x0 + EC.x1 + EC.wall) / 2, EC.floor - 0.1, (ZB + ZF) / 2));
    g.add(L.box(EC.wall, 19.4 - (EC.floor - 0.2), ZF - ZB, C2(), EC.x1 + EC.wall / 2, (19.4 + EC.floor - 0.2) / 2, (ZB + ZF) / 2));
    g.add(K.capZ(EC.x0, EC.x1 + EC.wall, EC.floor - 0.2, EC.floor, ZF + 0.004), K.capZ(EC.x1, EC.x1 + EC.wall, EC.floor, 19.4, ZF + 0.004));
    // calhas de coleta (U de aço inox) com vertedores triangulares nas bordas
    const q = K.QB(), w2 = LAU.w / 2;
    LAU.z.forEach((z) => {
      g.add(L.box(LAU.x1 - LAU.x0, 0.05, LAU.w, MAT.steel, (LAU.x0 + LAU.x1) / 2, LAU.bot, z));
      [-1, 1].forEach((sd) => g.add(L.box(LAU.x1 - LAU.x0, LAU.top - 0.12 - LAU.bot, 0.04, MAT.steel, (LAU.x0 + LAU.x1) / 2, (LAU.bot + LAU.top - 0.12) / 2, z + sd * w2)));
      g.add(L.box(0.04, LAU.top - LAU.bot, LAU.w, MAT.steel, LAU.x1, (LAU.bot + LAU.top) / 2, z));
      for (let x = LAU.x0 + 0.02; x < LAU.x1 - 0.2; x += 0.2) [-1, 1].forEach((sd) => { const zz = z + sd * (w2 + 0.021); q.tri([x, LAU.top - 0.12, zz], [x + 0.2, LAU.top - 0.12, zz], [x, LAU.top, zz]); q.tri([x + 0.2, LAU.top - 0.12, zz], [x + 0.2, LAU.top, zz], [x + 0.1, LAU.top - 0.12 + 0.0, zz]); });
      // mãos-francesas na parede do canal de coleta
      g.add(K.beam([EC.x1 + EC.wall, LAU.bot - 0.6, z], [LAU.x0 + 1.4, LAU.bot - 0.03, z], 0.06, 0.06, MAT.steel));
      const lw = K.waterBox(LAU.x0, LAU.x1 - 0.03, z - w2 + 0.03, z + w2 - 0.03, LAU.bot + 0.03, 18.98 - LAU.bot - 0.03, Lo.WATER.settled, 0.8, { nx: 4, ny: 1 });
      LW.push(lw);
    });
    // dentes: o 2º triângulo forma o "V" — uso só os dentes (triângulos) e deixo a borda baixa reta
    const teeth = q.mesh(MAT.steel); teeth.castShadow = false; g.add(teeth);
    innerG.add(K.bake(g)); LW.forEach((m) => innerG.add(m));
    out.add(innerG);
  }
  function C2() { return MAT.concNew; }
  /* ---------------------------------------------------------------- ponte raspadora (anda em x) */
  const bridge = new THREE.Group(), blade = new THREE.Group(), bridgeTop = new THREE.Group();
  {
    const g = new THREE.Group(), zA = D.z0 + th / 2, zB = D.z1 - th / 2, yR = D.top + 0.1;
    // cabeceiras com rodas
    [zA, zB].forEach((z) => {
      g.add(L.box(1.7, 0.36, 0.42, MAT.yellowB ?? K.G('#e3a11b', { roughness: 0.4 }), 0, yR + 0.38, z));
      [-0.58, 0.58].forEach((dx) => { const w = L.cyl(0.19, 0.19, 0.14, MAT.dark, dx, yR + 0.19, z, 16); w.rotation.x = Math.PI / 2; g.add(w); });
    });
    // vigas principais e travessas
    [-0.45, 0.45].forEach((dx) => g.add(L.box(0.16, 0.48, zB - zA + 0.4, K.G('#e3a11b', { roughness: 0.4 }), dx, yR + 0.76, (zA + zB) / 2)));
    for (let z = zA + 0.6; z < zB; z += 1.6) g.add(L.box(0.9, 0.08, 0.08, MAT.galv, 0, yR + 0.56, z));
    K.walkway(g, -0.6, 0.6, zA - 0.2, zB + 0.2, yR + 1.03, { edges: false });
    [-0.6, 0.6].forEach((dx) => K.railing(g, [[dx, yR + 1.03, zA - 0.2], [dx, yR + 1.03, zB + 0.2]]));
    // acionamento (redutor + motor) e quadro na cabeceira de trás
    const gb = K.gearbox(0.45, 0.4, 0.42, MAT.blue); gb.position.set(0.55, yR + 0.8, zA - 0.05); g.add(gb);
    const mo = K.motor(0.42, 0.14, MAT.motor); mo.position.set(1.05, yR + 0.8, zA - 0.05); g.add(mo);
    g.add(L.box(0.5, 0.7, 0.25, MAT.panel, -0.3, yR + 1.4, zA - 0.4), L.box(0.07, 0.07, 0.02, MAT.ledG, -0.3, yR + 1.55, zA - 0.27));
    bridgeTop.add(K.bake(g)); bridge.add(bridgeTop);
    // raspador (braços + lâmina com borracha) — sobe na volta
    const bg = new THREE.Group(), armZ = [D.z0 + th + 0.45, D.z1 - 0.45];
    armZ.forEach((z) => { bg.add(L.box(0.14, yR + 0.55 - (FL + 0.4), 0.14, MAT.galv, -0.35, (yR + 0.55 + FL + 0.4) / 2, z)); bg.add(K.beam([-0.35, FL + 0.6, z], [0.3, yR + 0.3, z], 0.07, 0.07, MAT.galv)); });
    bg.add(L.box(0.08, 0.42, ZF - ZB - 0.25, K.G('#e3a11b', { roughness: 0.4 }), -0.45, FL + 0.33, (ZB + ZF) / 2));
    bg.add(L.box(0.06, 0.1, ZF - ZB - 0.25, MAT.rubber, -0.45, FL + 0.08, (ZB + ZF) / 2));
    bg.add(L.box(0.5, 0.08, ZF - ZB - 0.25, MAT.galv, -0.3, FL + 0.55, (ZB + ZF) / 2));
    blade.add(K.bake(bg)); bridge.add(blade);
    bridge.position.x = BR.xmin; out.add(bridge);
  }
  /* ---------------------------------------------------------------- saída: câmara + canal de água decantada sobre pilares */
  const canalG = new THREE.Group(), CAN = { x0: Lo.P.filtIn[0] - 0.5, x1: Lo.P.filtIn[0] + 0.5, z0: ZF + 1.1, z1: -57.0, floor: 18.0, wall: 0.15, top: 19.5 };
  {
    const g = new THREE.Group(), C = MAT.concNew, ch = { x0: CAN.x0 - 0.15, x1: EC.x1 + EC.wall, z0: ZF, z1: ZF + 1.1 };
    // câmara de saída (encostada na frente, recebe o canal de coleta)
    g.add(L.box(ch.x1 - ch.x0, 0.2, ch.z1 - ch.z0, C, (ch.x0 + ch.x1) / 2, CAN.floor - 0.1, (ch.z0 + ch.z1) / 2));
    g.add(L.box(0.15, CAN.top - CAN.floor + 0.2, ch.z1 - ch.z0, C, ch.x0 + 0.075, (CAN.top + CAN.floor - 0.2) / 2, (ch.z0 + ch.z1) / 2));
    g.add(L.box(0.15, CAN.top - CAN.floor + 0.2, ch.z1 - ch.z0, C, ch.x1 - 0.075, (CAN.top + CAN.floor - 0.2) / 2, (ch.z0 + ch.z1) / 2));
    g.add(L.box(ch.x1 - CAN.x1 - 0.15, CAN.top - CAN.floor + 0.2, 0.15, C, (CAN.x1 + ch.x1 - 0.15) / 2, (CAN.top + CAN.floor - 0.2) / 2, ch.z1 - 0.075));
    [CAN.x0 - 0.15 + 0.15, ch.x1 - 0.15].forEach((x) => g.add(L.box(0.3, CAN.floor - 0.2 - 14, 0.3, MAT.concB, x, (14 + CAN.floor - 0.2) / 2, ch.z1 - 0.25)));
    // canal
    g.add(L.box(CAN.x1 - CAN.x0 + 0.3, 0.2, CAN.z1 - CAN.z0, C, (CAN.x0 + CAN.x1) / 2, CAN.floor - 0.1, (CAN.z0 + CAN.z1) / 2));
    [CAN.x0 - 0.075, CAN.x1 + 0.075].forEach((x) => g.add(L.box(0.15, CAN.top - CAN.floor + 0.2, CAN.z1 - CAN.z0, C, x, (CAN.top + CAN.floor - 0.2) / 2, (CAN.z0 + CAN.z1) / 2)));
    for (let z = CAN.z0 + 2.0; z < CAN.z1 - 0.5; z += 4.6) { [CAN.x0 - 0.05, CAN.x1 + 0.05].forEach((x) => g.add(L.box(0.32, CAN.floor - 0.2 - 14, 0.32, MAT.concB, x, (14 + CAN.floor - 0.2) / 2, z))); g.add(L.box(CAN.x1 - CAN.x0 + 0.5, 0.3, 0.4, MAT.concB, (CAN.x0 + CAN.x1) / 2, CAN.floor - 0.35, z)); }
    // moldura na ponta (entrega aos filtros em P.filtIn) + guarda-corpo na borda leste
    g.add(L.box(CAN.x1 - CAN.x0 + 0.5, 0.12, 0.1, MAT.galv, (CAN.x0 + CAN.x1) / 2, CAN.top + 0.06, CAN.z1 - 0.05));
    K.railing(g, [[CAN.x1 + 0.15, CAN.top, CAN.z0], [CAN.x1 + 0.15, CAN.top, CAN.z1]], { h: 0.9, toe: false });
    const sgn = K.sign(['ÁGUA DECANTADA', 'segue para os filtros'], 1.9, 0.5, { stripe: '#7fa3a6' });
    sgn.position.set(CAN.x0 - 0.16, CAN.floor + 0.55, (CAN.z0 + CAN.z1) / 2 + 2); sgn.rotation.y = -Math.PI / 2; g.add(sgn);
    canalG.add(K.bake(g)); out.add(canalG);
  }
  /* ---------------------------------------------------------------- descarga de lodo: registro e tubo (em corte) */
  const PZ = ZF + 0.5, PY = 14.62, PR = 0.17, sludgeG = new THREE.Group(), valve = K.gateValve(0.2, MAT.iron, 'x');
  let sPipe, sWater, sFlow, sPipe2, sPipe3;
  {
    valve.group.position.set(HX - 1.5, PY, PZ); out.add(valve.group);
    const g = new THREE.Group();
    g.add(K.pipe([[HX, PY, ZB + 3.8], [HX, PY, PZ], [HX - 1.2, PY, PZ]], PR, MAT.iron, { bend: 0.4 }));
    for (let x = HX - 3; x > -29; x -= 3.2) { g.add(L.box(0.3, PY - PR - 14, 0.5, MAT.concB, x, (14 + PY - PR) / 2, PZ)); g.add(L.box(0.06, 0.05, 0.5, MAT.galv, x, PY + PR + 0.02, PZ)); }
    detG.add(K.bake(g)); out.add(detG);
    // trecho reto em corte (meio tubo, frente removida): lodo correndo por dentro
    const cp = L.cutPipe([[-29.0, PY], [HX - 1.8, PY]], { r: PR, mat: L.mat('#3d4a57', { roughness: 0.5, metalness: 0.5, side: THREE.DoubleSide }), seg: 40, radial: 10 });
    cp.group.position.z = PZ; sludgeG.add(cp.group);
    const wi = cp.waterIn(0.62, Lo.WATER.sludge, 0.98); wi.range(0, 1); sWater = wi;
    sFlow = new L.Flow([[HX - 1.8, PY - 0.05, PZ - 0.03], [-29.0, PY - 0.05, PZ - 0.03]], { n: 46, size: 0.045, color: '#3a2a1a', jitter: [0, 0.03, 0.03], seed: 9 });
    sludgeG.add(sFlow.mesh);
    sPipe = K.pipe([[HX - 1.8, PY, PZ], [HX - 1.5, PY, PZ]], PR, MAT.iron); sludgeG.add(sPipe);
    sPipe2 = K.pipe([[-29.0, PY, PZ], [-29.6, PY, PZ], [-29.6, PY, Zc], [Lo.P.sludge[0], PY, Zc]], PR, MAT.iron, { bend: 0.5 }); sludgeG.add(sPipe2);
    const fg = new THREE.Group(); K.flange(fg, Lo.P.sludge[0] + 0.05, PY, Zc, PR, 'x', MAT.iron); sludgeG.add(K.bake(fg));
    out.add(sludgeG);
  }
  const ghostDec = ghost.of(out); root.add(ghostDec);

  /* ---------------------------------------------------------------- tanque de lodo (adensador) + centrífuga + caçamba */
  const T = Lo.ETA.sludgeTank, tankG = new THREE.Group(), mechPivot = new THREE.Group(), cenG = new THREE.Group(), tkOut = new THREE.Group();
  let tkSludge, tkWater;
  {
    const g = new THREE.Group(), half = (prof, m, seg = 40) => L.lathe(prof, m, seg, Math.PI / 2, Math.PI);
    const tw = 0.25;
    const wl = half([[T.r - tw, T.floor], [T.r, T.floor], [T.r, T.top], [T.r - tw, T.top], [T.r - tw, T.floor]], MAT.conc); wl.position.set(T.x, 0, T.z); g.add(wl);
    const fl = half([[0.001, T.floor + 0.15], [T.r - tw, T.floor + 0.65], [T.r - tw, T.floor], [0.001, T.floor]], MAT.conc); fl.position.set(T.x, 0, T.z); g.add(fl);
    g.add(K.capZ(T.x - T.r, T.x - T.r + tw, T.floor, T.top, T.z + 0.004), K.capZ(T.x + T.r - tw, T.x + T.r, T.floor, T.top, T.z + 0.004));
    { const q = K.QB(); q.quad([T.x - T.r + tw, T.floor, T.z + 0.004], [T.x + T.r - tw, T.floor, T.z + 0.004], [T.x + T.r - tw, T.floor + 0.65, T.z + 0.004], [T.x, T.floor + 0.15, T.z + 0.004]); q.tri([T.x - T.r + tw, T.floor, T.z + 0.004], [T.x, T.floor + 0.15, T.z + 0.004], [T.x - T.r + tw, T.floor + 0.65, T.z + 0.004]); g.add(q.mesh(MAT.cut)); }
    // calha periférica (vertedor do sobrenadante) e poço de alimentação central (meio)
    const lr = half([[T.r - tw - 0.45, T.top - 0.55], [T.r - tw, T.top - 0.55], [T.r - tw, T.top - 0.5], [T.r - tw - 0.4, T.top - 0.5], [T.r - tw - 0.4, T.top - 0.15], [T.r - tw - 0.45, T.top - 0.15]], MAT.steel); lr.position.set(T.x, 0, T.z); g.add(lr);
    const fw = half([[0.7, T.top - 1.9], [0.74, T.top - 1.9], [0.74, T.top + 0.1], [0.7, T.top + 0.1]], MAT.steel); fw.position.set(T.x, 0, T.z); g.add(fw);
    // ponte com acionamento central
    const zb = T.z - 0.75;
    [-0.35, 0.35].forEach((dz) => g.add(L.box(2 * T.r + 0.5, 0.3, 0.12, MAT.galv, T.x, T.top + 0.2, zb + dz)));
    K.walkway(g, T.x - T.r - 0.25, T.x + T.r + 0.25, zb - 0.42, zb + 0.42, T.top + 0.38, { edges: false });
    K.railing(g, [[T.x - T.r - 0.25, T.top + 0.38, zb - 0.42], [T.x + T.r + 0.25, T.top + 0.38, zb - 0.42]]);
    const gb = K.gearbox(0.6, 0.5, 0.6, MAT.blue); gb.position.set(T.x, T.top + 0.7, zb + 0.05); g.add(gb);
    const mo = K.motor(0.5, 0.16, MAT.motor); mo.rotation.z = Math.PI / 2; mo.position.set(T.x, T.top + 1.25, zb + 0.05); g.add(mo);
    K.ladder(g, T.x - T.r, T.z - 1.4, T.floor, T.top + 0.38, [-1, 0]);
    // entrada do lodo (vem de P.sludge) até o poço central; saída do lodo adensado pelo fundo → bomba
    g.add(K.pipe([[T.x + T.r, Lo.P.sludge[1], T.z - 0.3], [T.x + 1.2, Lo.P.sludge[1], T.z - 0.3], [T.x + 1.0, T.top - 1.7, T.z - 0.3], [T.x + 0.6, T.top - 1.4, T.z - 0.3]], 0.15, MAT.iron, { bend: 0.4 }));
    g.add(K.pipe([[T.x, T.floor + 0.25, T.z - 0.6], [T.x - T.r - 0.6, T.floor + 0.3, T.z - 0.6], [T.x - 6.4, T.floor + 0.3, T.z - 0.6]], 0.12, MAT.iron, { bend: 0.3 }));
    const sg = K.sign(['TRATAMENTO DO LODO', 'adensador → centrífuga'], 2.4, 0.62, { stripe: '#5d4a33' });
    sg.position.set(T.x - 1.4, T.top + 0.45, T.z + 0.05); g.add(sg);
    // luva/flange de entrada da água de lavagem dos filtros (dreno do eta2 chega em WASH)
    const WASH = [-31.84, 14.6, -71.84], wd = new THREE.Vector3(T.x - WASH[0], 0, T.z - WASH[2]).normalize();
    g.add(K.rod(WASH, [WASH[0] + wd.x * 0.9, WASH[1], WASH[2] + wd.z * 0.9], 0.16, MAT.iron, 14));
    { const fl = L.cyl(0.24, 0.24, 0.06, MAT.iron, 0, 0, 0, 16); fl.position.set(...WASH); fl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), wd); g.add(fl); }
    g.add(L.box(0.5, 0.6, 0.5, MAT.concB, WASH[0] + wd.x * 0.35, 14.3, WASH[2] + wd.z * 0.35));
    tankG.add(K.bake(g)); out.add(tankG);
    // mecanismo de grade (eixo, braços raspadores, estacas) — gira devagar
    const mg = new THREE.Group();
    mg.add(L.cyl(0.09, 0.09, T.top + 0.5 - (T.floor + 0.3), MAT.steel, 0, (T.top + 0.5 + T.floor + 0.3) / 2, 0, 10));
    [0, Math.PI].forEach((a) => {
      const cx = Math.cos(a), cz = Math.sin(a), arm = (r) => T.floor + 0.25 + (r / (T.r - 0.3)) * 0.47;
      mg.add(K.beam([0, T.floor + 0.3, 0], [cx * (T.r - 0.4), arm(T.r - 0.4), cz * (T.r - 0.4)], 0.1, 0.1, MAT.galv));
      for (let r = 0.5; r < T.r - 0.4; r += 0.32) mg.add(L.cyl(0.025, 0.025, 1.5, MAT.galv, cx * r, arm(r) + 0.8, cz * r, 5));
      mg.add(K.beam([cx * 0.1, T.top - 1.2, cz * 0.1], [cx * (T.r - 0.6), arm(T.r - 0.6) + 1.5, cz * (T.r - 0.6)], 0.05, 0.05, MAT.galv));
    });
    mechPivot.add(K.bake(mg)); mechPivot.position.set(T.x, 0, T.z); out.add(mechPivot);
    // conteúdo: lodo (embaixo) e sobrenadante (em cima), meia-volume com face no corte
    const vol = (y0, y1, mm) => { const g2 = new THREE.Group(); const s = half([[0.001, y1], [T.r - tw - 0.01, y1], [T.r - tw - 0.01, y0]], mm, 36); s.position.set(T.x, 0, T.z); const f = L.mesh(new THREE.PlaneGeometry(2 * (T.r - tw - 0.01), y1 - y0), mm, T.x, (y0 + y1) / 2, T.z - 0.01, { cast: false }); g2.add(s, f); g2.renderOrder = 2; return g2; };
    tkSludge = vol(T.floor + 0.2, T.floor + 1.7, L.water(Lo.WATER.sludge, 0.97, { side: THREE.DoubleSide }));
    tkWater = vol(T.floor + 1.7, T.top - 0.35, L.water(Lo.WATER.settled, 0.55, { side: THREE.DoubleSide }));
    out.add(tkSludge, tkWater);
    // bomba de lodo, centrífuga (decanter) e caçamba com torta de lodo
    const cg = new THREE.Group(), cx = T.x - 10.6, cz = T.z - 0.6;
    cg.add(L.box(6.2, 0.2, 3.6, MAT.slab, cx + 0.6, 14.1, cz + 0.5));
    const pm = K.motor(0.45, 0.15, MAT.motor); pm.position.set(T.x - 6.9, 14.6, cz); cg.add(pm);
    cg.add(L.cyl(0.22, 0.22, 0.3, MAT.blue, T.x - 6.45, 14.45, cz, 16).rotateZ(Math.PI / 2), L.box(1.2, 0.15, 0.6, MAT.gray, T.x - 6.7, 14.28, cz));
    cg.add(K.pipe([[T.x - 6.4, 14.45, cz], [T.x - 7.6, 14.45, cz], [T.x - 7.8, 15.6, cz], [cx + 2.2, 15.75, cz + 0.6]], 0.1, MAT.iron, { bend: 0.3 }));
    // centrífuga: tambor cilíndrico-cônico em berço, motor e proteção de correias
    cg.add(L.box(3.6, 0.9, 1.1, MAT.gray, cx, 14.65, cz + 0.6));
    const drum = L.lathe([[0.001, -1.6], [0.32, -1.6], [0.52, -0.9], [0.55, 1.0], [0.4, 1.3], [0.001, 1.3]], K.G('#c8ced3', { roughness: 0.3, metalness: 0.5 }), 28); drum.rotation.z = Math.PI / 2; drum.position.set(cx, 15.65, cz + 0.6); cg.add(drum);
    cg.add(L.box(0.5, 0.8, 0.9, MAT.blue, cx + 1.65, 15.65, cz + 0.6), L.box(0.4, 1.1, 1.1, MAT.blue, cx - 1.75, 15.5, cz + 0.6));
    const cm = K.motor(0.7, 0.24, MAT.motor); cm.position.set(cx + 0.2, 15.05, cz - 0.25); cg.add(cm);
    cg.add(L.box(0.7, 0.5, 0.25, MAT.dark, cx, 14.95, cz + 1.25));    // calha da torta
    // caçamba (aço) com torta de lodo
    const sk = new THREE.Group(), skx = cx - 0.2, skz = cz + 2.6, red = K.G('#d4682a', { roughness: 0.5 });
    { const q = K.QB(), a = 1.6, b = 1.1, h = 1.0, c = 0.4; // tronco de pirâmide aberto
      const P0 = [[-a, 0, -c - 0.4], [a, 0, -c - 0.4], [a, 0, c + 0.4], [-a, 0, c + 0.4]], P1 = [[-a - 0.3, h, -b + 0.2], [a + 0.3, h, -b + 0.2], [a + 0.3, h, b - 0.2], [-a - 0.3, h, b - 0.2]];
      for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; q.quad(P0[i], P0[j], P1[j], P1[i]); } q.quad(P0[3], P0[2], P0[1], P0[0]);
      const m = q.mesh(K.M('#d4682a', { roughness: 0.5, side: THREE.DoubleSide })); m.position.set(skx, 14.05, skz); sk.add(m); }
    sk.add(L.box(3.8, 0.12, 0.12, red, skx, 15.0, skz - 0.92), L.box(3.8, 0.12, 0.12, red, skx, 15.0, skz + 0.92));
    const cake = L.mesh(new THREE.SphereGeometry(1, 18, 10, 0, L.TAU, 0, Math.PI / 2), L.mat('#4f3d2a', { roughness: 1, flatShading: true }), skx, 14.75, skz, { cast: false }); cake.scale.set(1.5, 0.35, 0.75); sk.add(cake);
    cg.add(sk);
    const sg2 = K.sign(['Centrífuga', 'lodo desaguado'], 1.4, 0.4, { stripe: '#5d4a33' }); sg2.position.set(cx, 16.5, cz + 1.2); cg.add(sg2);
    cenG.add(K.bake(cg)); out.add(cenG);
  }
  const ghostSl = ghost.of(new THREE.Group().add(...[tankG, mechPivot, cenG].map((o) => o.clone()))); root.add(ghostSl);

  /* ---------------------------------------------------------------- água do decantador (gradiente), manta de lodo, flocos */
  const CF = new THREE.Color(Lo.WATER.floc), CS = new THREE.Color(Lo.WATER.settled);
  const decW = K.waterBox(IX0 + 0.01, IX1, ZB, ZF - 0.012, FL - 0.75, D.water - FL + 0.75, '#fff', 0.55, { nx: 40, ny: 8, topA: 0.88, col: (x, v) => {
    const kx = ss(CUR * -1 - 1.0, -19, x), c = CF.clone().lerp(CS, L.clamp01(kx * 0.75 + v * kx * 0.5)); return c.multiplyScalar(0.85 + 0.15 * v);
  } });
  out.add(decW);
  const ecW = K.waterBox(EC.x0, EC.x1, ZB, ZF - 0.012, EC.floor, EC.water - EC.floor, Lo.WATER.settled, 0.75, { nx: 2, ny: 2 });
  const canW = K.waterBox(CAN.x0, CAN.x1, ZF, CAN.z1 - 0.01, CAN.floor, Lo.P.filtIn[1] - CAN.floor, Lo.WATER.settled, 0.78, { nx: 2, ny: 2 });
  const chW = K.waterBox(CAN.x0 - 0.0, EC.x1, ZF, ZF + 0.95, CAN.floor, Lo.P.decOut[1] - CAN.floor, Lo.WATER.settled, 0.78, { nx: 2, ny: 1 });
  out.add(ecW, canW, chW);
  // manta de lodo no fundo (malha dinâmica: o raspador empurra um monte para o poço)
  const NB = 70, bx0 = IX0 + 0.05, bx1 = HX - 1.2, blanket = (() => {
    const n = (NB + 1) * 4, pos = new Float32Array(n * 3), idx = [];
    for (let i = 0; i < NB; i++) { const a = i * 4; idx.push(a, a + 4, a + 1, a + 1, a + 4, a + 5, a + 1, a + 5, a + 2, a + 2, a + 5, a + 6, a + 2, a + 6, a + 3, a + 3, a + 6, a + 7); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = L.mesh(g, L.mat('#4a3826', { roughness: 1, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.frustumCulled = false; out.add(m);
    return { g, m, pos };
  })();
  // lodo no poço (calha em V), face no corte
  const hop = (() => { const s = new THREE.Shape([[HX - 1.15, FL - 0.02], [HX - 0.3, 14.48], [HX + 0.3, 14.48], [HX + 1.15, FL - 0.02]].map((p) => new THREE.Vector2(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(s, { depth: ZF - ZB - 0.02, bevelEnabled: false }); const m = new THREE.Mesh(g, L.mat('#4e3b28', { roughness: 1 })); m.position.z = ZB; out.add(m); return m; })();
  // flocos sedimentando (trajetórias inclinadas)
  const NS = 420, settle = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), L.mat('#dcc898', { roughness: 0.8, flatShading: true, emissive: '#4a3c22', emissiveIntensity: 0.35 }), NS);
  settle.frustumCulled = false; out.add(settle);
  const rd = L.rng(911), SP = [];
  for (let i = 0; i < NS; i++) {
    const y0 = FL + 0.6 + rd() * (D.water - FL - 0.9), v = 0.16 + rd() * 0.34, T = (y0 - (FL + 0.25)) / v;
    const u = Math.min(0.4 + rd() * 0.9, 16 / T);
    SP.push({ x0: -CUR - 0.3 - rd() * 0.5, y0, z: rd() < 0.72 ? ZF - 0.1 - rd() * 2.6 : ZB + 0.3 + rd() * (ZF - ZB - 3), u, v, T, ph: rd(), s: 0.05 + rd() * 0.07, r: rd() * 6 });
  }
  // setas: gravidade (para baixo), calhas (−x), canal de coleta (+z), canal decantado (+z)
  const gravity = [-11.5, -15.5, -19.5].map((x) => { const c = new L.Chevrons([[x, 18.7, ZF + 0.06], [x, 15.9, ZF + 0.06]], { n: 3, size: 0.42, normal: [0, 0, 1], color: '#ffd23f' }); out.add(c.mesh); return c; });
  const lauCh = LAU.z.map((z) => { const c = new L.Chevrons([[LAU.x1 - 0.3, 19.06, z], [LAU.x0 + 0.1, 19.06, z]], { n: 5, size: 0.2, normal: [0, 1, 0], color: '#ffd23f' }); out.add(c.mesh); return c; });
  const canCh = new L.Chevrons([[(EC.x0 + EC.x1) / 2, 19.08, ZB + 0.5], [(EC.x0 + EC.x1) / 2, 19.08, ZF], [Lo.P.filtIn[0], 19.06, ZF + 1.0], [Lo.P.filtIn[0], 19.0, CAN.z1 - 0.2]], { n: 12, size: 0.28, normal: [0, 1, 0], color: '#ffd23f' });
  out.add(canCh.mesh);
  const _d = new THREE.Object3D();
  const bridgeX = (s) => { const Lr = BR.xmax - BR.xmin, u = ((s % (2 * Lr)) + 2 * Lr) % (2 * Lr); if (u < Lr) return { x: BR.xmin + u, fwd: true, k: u / Lr }; return { x: BR.xmax - (u - Lr), fwd: false, k: (u - Lr) / Lr }; };

  function update(t, S, cam, P) {
    const b = S.build.dec, wd = S.water.dec, b2 = S.build.sludge;
    ghostDec.visible = b < 0.04 && S.ghost > 0.01; ghostSl.visible = b2 < 0.04 && S.ghost > 0.01;
    const kw = ph(b, 0, 0.3), ki = ph(b, 0.25, 0.5), kr = ph(b, 0.45, 0.75), kc = ph(b, 0.7, 1);
    wallsG.visible = kw > 0; wallsG.scale.y = Math.max(0.001, L.ease.out(kw)); wallsG.position.y = 14 * (1 - wallsG.scale.y);
    innerG.visible = ki > 0; innerG.position.y = (1 - L.ease.out(ki)) * 4;
    bridge.visible = kr > 0; canalG.visible = kc > 0; canalG.position.y = (1 - L.ease.out(kc)) * 3;
    valve.group.visible = kc > 0.3; detG.visible = kc > 0.3; detG.position.y = (1 - L.ease.out(ph(kc, 0.3, 1))) * 1.5;
    // ponte: anda quando o raspador funciona (fase integrada); lâmina embaixo na ida (→ poço), erguida na volta
    const scr = P.scraper(t), br = bridgeX(scr * 1.05);
    const lift = br.fwd ? 1 - ss(0, 0.05, br.k) * (1 - ss(0.95, 1, br.k)) : 1;
    bridge.position.set(br.x, (1 - L.ease.out(kr)) * 5, 0);
    blade.position.y = lift * 2.6;
    // água
    decW.userData.setLevel(wd); const full = wd >= 1;
    ecW.userData.setLevel(full ? 1 : 0); chW.userData.setLevel(full ? 1 : 0); canW.userData.setLevel(full && kc >= 1 ? 1 : 0);
    LW.forEach((m) => m.userData.setLevel(full ? 1 : 0));
    // manta de lodo: cresce com o tempo de decantação; o raspador a empurra para o poço
    const kB = S.present ? 1 : L.clamp01(P.decFill(t) / 3.0), running = S.run.scraper * b > 0.02, bladeX = br.x - 0.45;
    blanket.m.visible = kB > 0.01 && kw >= 1; hop.visible = kB > 0.01 && kw >= 1;
    if (blanket.m.visible) {
      const { pos } = blanket;
      for (let i = 0; i <= NB; i++) {
        const x = L.lerp(bx0, bx1, i / NB); let h = kB * (0.12 + 0.3 * ss(-23, bx1, x)) * (0.9 + 0.1 * Math.sin(x * 3.1 + 1.7));
        if (running) {
          if (br.fwd) { if (x < bladeX) h *= 0.3; const pile = (0.15 + 0.4 * br.k) * kB * Math.exp(-Math.pow((x - bladeX - 0.35) / 0.35, 2)); if (x > bladeX - 0.05) h += pile; }
          else h *= 0.3 + 0.7 * br.k;
        }
        const y = FL + 0.02 + h;
        const zs = [ZB + 0.02, (ZB + ZF) / 2, ZF - 0.006, ZF - 0.006], ys = [y, y + 0.015 * Math.sin(i * 1.3), y, FL + 0.01];
        for (let j = 0; j < 4; j++) { const k = (i * 4 + j) * 3; pos[k] = x; pos[k + 1] = ys[j]; pos[k + 2] = zs[j]; }
      }
      blanket.g.attributes.position.needsUpdate = true; blanket.g.computeVertexNormals();
      hop.scale.y = 1;
    }
    // flocos descendo (só com o decantador cheio)
    const sOn = wd > 0.5;
    settle.visible = sOn;
    if (sOn) {
      const lvY = (FL - 0.75) + (D.water - FL + 0.75) * wd;
      for (let i = 0; i < NS; i++) {
        const q = SP[i], tau = L.fract(q.ph + t / q.T) * q.T, x = q.x0 - q.u * tau, y = q.y0 - q.v * tau * (0.75 + 0.25 * tau / q.T);
        const fade = Math.min(1, tau * 3, (q.T - tau) * 2.5), s = (y < lvY - 0.08 ? 1 : 0) * q.s * fade * (1 - 0.3 * tau / q.T);
        _d.position.set(x, y, q.z); _d.rotation.set(q.r + t * 0.4, q.r, 0); _d.scale.set(s * 1.2, s * 0.8, s);
        _d.updateMatrix(); settle.setMatrixAt(i, _d.matrix);
      }
      settle.instanceMatrix.needsUpdate = true;
    }
    const nearDec = P.near(cam, [-15, 17, -74], 32);
    gravity.forEach((c) => c.update(t, { speed: 0.35, amount: full && nearDec ? 0.95 : 0 }));
    lauCh.forEach((c) => c.update(t, { speed: 0.25, amount: full && nearDec ? 0.9 : 0 }));
    canCh.update(t, { speed: 0.08, amount: full && kc >= 1 && P.near(cam, [-24, 18, -66], 36) ? 0.9 : 0 });
    // descarga de lodo
    const so = Math.min(1, S.run.sludgeOut), ks = ph(b2, 0, 0.45), kt = ph(b2, 0.25, 0.65), km = ph(b2, 0.55, 0.85), kz = ph(b2, 0.75, 1);
    valve.wheel.rotation.z = -P.sludgeOut(t) * 2.5;
    sludgeG.visible = ks > 0; sPipe.userData.grow(ks); sPipe2.userData.grow(ph(ks, 0.4, 1));
    sWater.group.visible = so > 0.05 && ks >= 1; sFlow.mesh.visible = so > 0.05 && ks >= 1;
    sFlow.update(t, { speed: 0.12, amount: so });
    tankG.visible = kt > 0; tankG.scale.y = Math.max(0.001, L.ease.out(kt)); tankG.position.y = 14 * (1 - tankG.scale.y);
    mechPivot.visible = km > 0; mechPivot.position.y = (1 - L.ease.out(km)) * 5; mechPivot.rotation.y = -0.22 * P.thick(t);
    cenG.visible = kz > 0; cenG.position.y = (1 - L.ease.out(kz)) * 2;
    const tl = b2 >= 1 ? 1 : 0;
    tkSludge.visible = tkWater.visible = tl > 0;   // (níveis fixos — o adensador já opera cheio)
  }
  return { update };
}
