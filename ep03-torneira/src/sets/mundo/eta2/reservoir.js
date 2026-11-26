// ETA 2 — RESERVATÓRIO APOIADO (cilíndrico, meio enterrado, em corte pelo plano z = eixo) e ELEVATÓRIA DE ÁGUA
// TRATADA (prédio em corte, 2 conjuntos motobomba azuis — 1 operando + 1 reserva —, barrilete com válvulas de retenção e
// gaveta, manômetros, monovia com talha, quadro elétrico), recalcando até Lo.P.liftOut (daí em diante: módulo cidade).
// Também: bomba de lavagem dos filtros (atrás do reservatório) e o tubo fino de amostra até o laboratório.
// Obra: S.build.reservoir, S.build.lift. Água: S.water.reservoir. Funcionamento: S.run.lift.
export function makeReservoir(ctx, K) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, G, bx, bake, pipe, gateValve, checkValve, gauge, railing, rod, flange, canvasTex } = K, CB = K.chevB;
  const R = Lo.ETA.reservoir, LF = Lo.ETA.lift, P = Lo.P, W = Lo.WATER, PI = Math.PI, Y0 = Lo.ETA.y;
  const root = new THREE.Group(), sub = (b, a, c) => L.clamp01((b - a) / (c - a)), _o = new THREE.Object3D();
  const RO = R.r, RI = R.r - 0.3, CX = R.x, CZ = R.z;
  const HALF = [PI / 2, PI];   // lathe: metade de trás (z ≤ eixo)

  /* ================= RESERVATÓRIO ================= */
  const rsFloor = new THREE.Group(), rsWall = new THREE.Group(), rsRoof = new THREE.Group();
  const halfDisc = (r, y0, y1, m) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 48, 1, false, HALF[0], HALF[1]), m); c.position.set(CX, (y0 + y1) / 2, CZ); c.castShadow = c.receiveShadow = true; return c; };
  const cutRect = (g, x0, y0, x1, y1, z = CZ + 0.004, m = MAT.cut) => { const p = L.mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m, (x0 + x1) / 2, (y0 + y1) / 2, z, { cast: false }); g.add(p); };
  rsFloor.add(halfDisc(RO + 0.25, R.floor - 0.3, R.floor, MAT.conc)); cutRect(rsFloor, CX - RO - 0.25, R.floor - 0.3, CX + RO + 0.25, R.floor);
  const concD = M('#c9cdcf', { roughness: 0.88, side: THREE.DoubleSide }); const wl = L.lathe([[RI, R.floor], [RO, R.floor], [RO, R.top], [RI, R.top], [RI, R.floor]], concD, 64, HALF[0], HALF[1]); wl.position.set(CX, 0, CZ); rsWall.add(wl);
  cutRect(rsWall, CX - RO, R.floor, CX - RI, R.top); cutRect(rsWall, CX + RI, R.floor, CX + RO, R.top);
  // régua de nível pintada na parede interna (faixas)
  for (let y = R.floor + 0.5; y < R.top - 0.2; y += 0.5) { const a = PI * 0.62, s = L.box(0.5, 0.06, 0.02, MAT.yellow, CX + Math.sin(a) * (RI - 0.015), y, CZ + Math.cos(a) * (RI - 0.015)); s.rotation.y = a; rsWall.add(s); }
  // pilares e laje de cobertura
  [[-2.6, -1.5], [2.6, -1.5], [0, -3.4], [-3.2, -3.6], [3.2, -3.6]].forEach(([dx, dz]) => rsRoof.add(L.cyl(0.2, 0.2, R.top - R.floor, MAT.concOld, CX + dx, (R.top + R.floor) / 2, CZ + dz, 14)));
  rsRoof.add(halfDisc(RO + 0.15, R.top, R.top + 0.25, MAT.slab)); cutRect(rsRoof, CX - RO - 0.15, R.top, CX + RO + 0.15, R.top + 0.25);
  // alçapão, escada interna, respiros (pescoço de ganso com tela), guarda-corpo na borda do corte
  rsRoof.add(bx([CX - 3.2, R.top + 0.25, CZ - 2.6], [CX - 2.2, R.top + 0.45, CZ - 1.6], MAT.galv));
  for (let y = R.floor + 0.3; y < R.top; y += 0.3) rsRoof.add(rod([CX - 3.0, y, CZ - 2.0], [CX - 2.4, y, CZ - 2.0], 0.02, MAT.galv, 5));
  rsRoof.add(rod([CX - 3.0, R.floor, CZ - 2.0], [CX - 3.0, R.top + 1.2, CZ - 2.0], 0.03, MAT.galv, 6), rod([CX - 2.4, R.floor, CZ - 2.0], [CX - 2.4, R.top + 1.2, CZ - 2.0], 0.03, MAT.galv, 6));
  [[1.6, -3.2], [-1.0, -4.2]].forEach(([dx, dz]) => { const g = new THREE.Group(); pipe(g, [[CX + dx, R.top + 0.2, CZ + dz], [CX + dx, R.top + 1.0, CZ + dz], [CX + dx + 0.35, R.top + 1.0, CZ + dz], [CX + dx + 0.35, R.top + 0.75, CZ + dz]], 0.12, MAT.white, { flanges: false, bend: 0.15 }); rsRoof.add(g); });
  railing(rsRoof, [[CX - RO + 0.2, CZ - 0.15], [CX + RO - 0.2, CZ - 0.15]], R.top + 0.25, { h: 1.0 });
  // talude de terra em volta (meio enterrado), cortado no plano do eixo
  const soilM = M('#8a6a49', { roughness: 0.95 }), grassM = M('#6aa84a', { roughness: 0.95 });
  const berm = L.lathe([[RO + 3.0, Y0 - 0.02], [RO + 0.05, R.top - 1.5]], grassM, 48, PI * 0.8, PI * 0.7); berm.position.set(CX, 0, CZ); berm.material = grassM; berm.material.side = THREE.DoubleSide;
  const bermCut = L.extrude([[CX - RO - 3.0, Y0 - 0.02], [CX - RO - 0.05, Y0 - 0.02], [CX - RO - 0.05, R.top - 1.5]], 0.01, soilM); bermCut.position.z = CZ;
  rsWall.add(berm, bermCut);
  const rsF = bake(rsFloor), rsW = bake(rsWall), rsR = bake(rsRoof);
  const pivF = L.group(root, 0, R.floor - 0.3, 0), inF = L.group(pivF, 0, -(R.floor - 0.3), 0); inF.add(rsF);
  const pivW = L.group(root, 0, R.floor, 0), inW = L.group(pivW, 0, -R.floor, 0); inW.add(rsW);
  const pivR = L.group(root); pivR.add(rsR);
  [rsF, rsW, rsR].forEach((o) => L.shadows(o));
  // água (meia lua + face no corte)
  const wRes = L.water(W.treated, 0.86, { side: THREE.DoubleSide });
  const wTop = new THREE.Mesh(new THREE.CircleGeometry(RI - 0.01, 48, PI, PI).rotateX(-PI / 2), wRes); wTop.position.set(CX, 0, CZ); wTop.rotation.y = 0;
  // CircleGeometry (θ de π a 2π no plano XY) → após rotateX(−π/2) fica em z ≤ 0 ... confere: y=sin(θ)<0 → z = −y > 0. Corrigimos girando 180° em y.
  wTop.rotation.y = PI;
  const wFace = L.mesh(new THREE.PlaneGeometry(1, 1), wRes, CX, 0, CZ + 0.006, { cast: false });
  root.add(wTop, wFace);
  // entrada (tubo vindo do tanque de contato) com jorro e saída de fundo para a elevatória
  const io = new THREE.Group();
  pipe(io, [P.resvIn, [P.resvIn[0] + 0.9, P.resvIn[1], P.resvIn[2]]], 0.24, MAT.treated, { flanges: false });
  const yS = 14.75, sucX = 25.75;   // cota do eixo da sucção
  pipe(io, [[CX + RI - 0.6, yS, CZ], [sucX, yS, CZ]], 0.26, MAT.treated, { flanges: false });
  io.add(L.cyl(0.42, 0.3, 0.25, MAT.treated, CX + RI - 0.6, yS, CZ, 18).rotateZ(PI / 2)); // boca de saída
  const ioB = bake(io); root.add(ioB);
  const jet = L.mesh(new THREE.PlaneGeometry(0.36, 1), wRes, P.resvIn[0] + 1.05, 0, CZ + 0.01, { cast: false }); root.add(jet);

  /* ================= ELEVATÓRIA DE ÁGUA TRATADA ================= */
  const X0 = LF.x0, X1 = LF.x1, ZB = LF.z0, ZC = LF.z1, FLR = LF.floor, RF = LF.roof, T = 0.25;
  const bSlab = new THREE.Group(), bWall = new THREE.Group(), bRoof = new THREE.Group();
  bSlab.add(bx([X0, FLR - 0.12, ZB], [X1, FLR + 0.05, ZC], MAT.conc)); cutRect(bSlab, X0, FLR - 0.12, X1, FLR + 0.05, ZC + 0.004);
  const wallM = M('#e8e1d3', { roughness: 0.85, side: THREE.DoubleSide });
  bWall.add(bx([X0, FLR, ZB], [X1, RF, ZB + T], wallM));
  // parede esquerda (encostada no reservatório) e direita com janelas e porta
  const holed = (x0, x1, holes) => { const m = L.extrude([[ZB, FLR], [ZC, FLR], [ZC, RF], [ZB, RF]], x1 - x0, wallM, { holes: holes.map(([a, b, c, d]) => [[a, c], [b, c], [b, d], [a, d]]) }); m.rotation.y = -PI / 2; m.position.x = x1; bWall.add(m); };
  holed(X0, X0 + T, [[-54.6, -53.0, 16.4, 17.8]]);
  holed(X1 - T, X1, [[-55.4, -53.6, 16.4, 17.8], [-51.4, -49.4, FLR + 0.05, 17.0]]);
  cutRect(bWall, X0, FLR, X0 + T, RF, ZC + 0.004); cutRect(bWall, X1 - T, FLR, X1, RF, ZC + 0.004);
  bWall.add(bx([X1 - T - 0.02, 16.4, -55.4], [X1 + 0.02, 17.8, -53.6], MAT.glassW));
  // porta de enrolar (meio aberta)
  bWall.add(bx([X1 - 0.08, 16.1, -51.4], [X1 + 0.06, 17.0, -49.4], MAT.galv));
  // laje de cobertura (só a metade de trás, cortada) e platibanda
  bRoof.add(bx([X0 - 0.1, RF, ZB - 0.1], [X1 + 0.1, RF + 0.25, -52.4], MAT.slab), bx([X0 - 0.1, RF + 0.25, ZB - 0.1], [X1 + 0.1, RF + 0.55, ZB + 0.1], MAT.slab));
  cutRect(bRoof, X0 - 0.1, RF, X1 + 0.1, RF + 0.25, -52.4 + 0.004);
  // vigas da cobertura até a frente (estrutura aparente) e monovia com talha
  [X0 + 0.15, X1 - 0.15].forEach((x) => bRoof.add(bx([x - 0.12, RF - 0.35, -52.4], [x + 0.12, RF, ZC], MAT.concOld)));
  bRoof.add(bx([X0 + 0.15, RF - 0.3, ZC - 0.25], [X1 - 0.15, RF, ZC], MAT.concOld));
  const mrX = 29.5; bRoof.add(bx([mrX - 0.06, RF - 0.42, ZB + 0.3], [mrX + 0.06, RF - 0.3, ZC - 0.3], MAT.yellow), bx([mrX - 0.12, RF - 0.46, ZB + 0.3], [mrX + 0.12, RF - 0.42, ZC - 0.3], MAT.yellow));
  const lSlab = bake(bSlab), lWall = bake(bWall), lRoof = bake(bRoof);
  [lSlab, lWall, lRoof].forEach((o) => L.shadows(o));
  const pivLS = L.group(root, 0, FLR - 0.12, 0), inLS = L.group(pivLS, 0, -(FLR - 0.12), 0); inLS.add(lSlab);
  const pivLW = L.group(root, 0, FLR, 0), inLW = L.group(pivLW, 0, -FLR, 0); inLW.add(lWall);
  const pivLR = L.group(root); pivLR.add(lRoof);

  /* --- conjunto motobomba (eixo em x; sucção axial por −x; recalque para cima) --- */
  const PC = 28.0, PY = 14.75, zP = [-54.1, -50.7];
  function pumpSet() {
    const g = new THREE.Group(), blue = MAT.blue, bd = MAT.blueDark, iron = MAT.iron;
    g.add(bx([-0.95, FLR + 0.05 - PY, -0.5], [2.75, 14.38 - PY, 0.5], MAT.concOld));            // base de concreto
    g.add(bx([-0.85, 14.38 - PY, -0.42], [2.65, 14.46 - PY, 0.42], iron));                         // base metálica
    const vol = L.lathe([[0.02, -0.17], [0.4, -0.17], [0.48, -0.1], [0.5, 0.05], [0.44, 0.17], [0.02, 0.17]], blue, 32); vol.rotation.z = PI / 2; g.add(vol); // voluta
    g.add(L.cyl(0.16, 0.24, 0.42, blue, -0.38, 0, 0, 18).rotateZ(PI / 2)); flange(g, -0.62, 0, 0, 0.2, 'x', blue, 8);  // bocal de sucção
    g.add(L.cyl(0.13, 0.17, 0.42, blue, 0, 0.62, 0, 16)); flange(g, 0, 0.82, 0, 0.15, 'y', blue, 8);                     // bocal de recalque
    g.add(L.box(0.5, 0.36, 0.3, blue, 0, -0.4, 0));                                                // pé da voluta
    g.add(L.cyl(0.15, 0.18, 0.55, bd, 0.45, 0, 0, 16).rotateZ(PI / 2), L.box(0.3, 0.32, 0.4, bd, 0.5, -0.28, 0));   // mancal
    const cpl = new THREE.Group(); cpl.add(L.cyl(0.14, 0.14, 0.22, MAT.steel, 0, 0, 0, 16).rotateZ(PI / 2)); for (let i = 0; i < 6; i++) { const a = (i / 6) * L.TAU; cpl.add(L.cyl(0.02, 0.02, 0.26, MAT.dark, 0, Math.cos(a) * 0.1, Math.sin(a) * 0.1, 5).rotateZ(PI / 2)); } cpl.add(L.box(0.24, 0.035, 0.05, MAT.yellow, 0, 0.13, 0));
    cpl.position.x = 0.86; g.add(cpl); g.userData.cpl = cpl;
    const guard = L.lathe([[0.2, -0.16], [0.2, 0.16]], M('#f2b31b', { roughness: 0.4, side: THREE.DoubleSide }), 20, PI / 2 + 0.6, PI - 1.2); guard.rotation.z = PI / 2; guard.position.x = 0.86; g.add(guard); // proteção do acoplamento (aberta à frente)
    g.add(L.cyl(0.36, 0.36, 1.25, blue, 1.62, 0.04, 0, 28).rotateZ(PI / 2));                       // carcaça do motor
    for (let i = 0; i < 20; i++) { const a = (i / 20) * L.TAU; if (Math.sin(a) < -0.6) continue; const f = L.box(1.05, 0.03, 0.06, blue, 1.6, 0.04 + Math.cos(a) * 0.38, Math.sin(a) * 0.38); f.rotation.x = -a; g.add(f); } // aletas
    g.add(L.cyl(0.39, 0.39, 0.06, bd, 1.0, 0.04, 0, 28).rotateZ(PI / 2), L.cyl(0.39, 0.37, 0.3, bd, 2.38, 0.04, 0, 28).rotateZ(PI / 2)); // tampa e defletor do ventilador
    g.add(L.rbox(0.3, 0.2, 0.26, 0.03, bd, 1.6, 0.5, 0));                                           // caixa de ligação
    g.add(L.box(0.95, 0.3, 0.62, bd, 1.62, -0.24, 0));                                              // pés do motor
    return { g, cpl };
  }
  const pumps = zP.map((z) => { const p = pumpSet(); p.g.remove(p.cpl); const g = bake(p.g), cpl = bake((() => { const c = new THREE.Group(); c.add(p.cpl); return c; })()); g.add(cpl); g.position.set(PC, PY, z); cpl.position.x = 0.86; cpl.children.forEach((m) => m.position.x -= 0.86); root.add(g); L.shadows(g); return { g, cpl }; });
  // barrilete: sucção (coletor ao longo de z, registro em cada ramal) e recalque (retenção + gaveta, sobe ao coletor)
  const suc = new THREE.Group(), dis = new THREE.Group(), YH = P.liftOut[1];
  pipe(suc, [[sucX, yS, CZ], [sucX, yS, zP[0] - 0.4]], 0.26, MAT.treated, { flanges: false });
  pipe(suc, [[sucX, yS, CZ], [sucX, yS, zP[1] + 0.6]], 0.26, MAT.treated, { flanges: false });
  suc.add(L.sph(0.27, MAT.treated, sucX, yS, zP[0] - 0.4), L.sph(0.27, MAT.treated, sucX, yS, zP[1] + 0.6));
  const valveWheels = [];
  zP.forEach((z) => {
    pipe(suc, [[sucX, yS, z], [PC - 0.64, PY, z]], 0.2, MAT.treated, { flanges: 'end' });
    const gv = gateValve(0.2, MAT.iron); gv.g.rotation.y = PI / 2; gv.g.position.set(26.55, PY, z); suc.add(gv.g);
    pipe(dis, [[PC, PY + 0.86, z], [PC, YH, z]], 0.15, MAT.treated, { flanges: false });
    const cv = checkValve(0.15, MAT.iron); cv.position.set(PC, 15.75, z); cv.rotation.y = -PI / 2; dis.add(cv);
    const gv2 = gateValve(0.15, MAT.iron); gv2.g.rotation.x = PI / 2; gv2.g.position.set(PC, 16.6, z); dis.add(gv2.g);
    const ga = gauge(0.11); ga.g.position.set(PC, 17.25, z + 0.2); dis.add(ga.g);
  });
  pipe(dis, [[PC, YH, zP[0] - 0.3], P.liftOut], 0.2, MAT.treated, { flanges: 'end' });
  dis.add(L.sph(0.21, MAT.treated, PC, YH, zP[0] - 0.3));
  const hg = gauge(0.13); hg.g.position.set(PC + 0.32, YH + 0.32, -49.4); hg.g.rotation.y = 0; dis.add(hg.g); dis.add(rod([PC + 0.2, YH, -49.4], [PC + 0.32, YH + 0.2, -49.4], 0.02, MAT.steel, 5));
  // suportes do coletor de recalque
  dis.add(rod([PC, YH, -52.4], [PC, RF - 0.05, -52.4], 0.05, MAT.galv, 8)); // tirante na laje
  // quadro elétrico (CCM) com luzes de "operando"
  const panel = new THREE.Group(); panel.add(L.rbox(1.6, 2.0, 0.45, 0.03, M('#c7ccd0', { roughness: 0.5 }), 26.6, FLR + 1.05, ZB + T + 0.24));
  [26.15, 27.05].forEach((x) => { panel.add(L.box(0.7, 1.8, 0.02, M('#b9bfc4', { roughness: 0.5 }), x, FLR + 1.05, ZB + T + 0.47)); panel.add(L.box(0.04, 0.2, 0.03, MAT.dark, x + 0.28, FLR + 1.05, ZB + T + 0.49)); });
  const lampOn = L.glow('#39e07a', 2.2), lampOff = M('#2b4a35', { roughness: 0.5 });
  const lamps = [0, 1].map((i) => { const m = L.cyl(0.05, 0.05, 0.04, i ? lampOff : lampOn, 26.15 + i * 0.9, FLR + 1.6, ZB + T + 0.5, 12); m.rotation.x = PI / 2; m.userData.keep = true; panel.add(m); return m; });
  const sucB = bake(suc), disB = bake(dis), panB = bake(panel); [sucB, disB, panB].forEach((o) => { L.shadows(o); root.add(o); });
  // ponteiros dos manômetros (recriados fora do bake)
  const needles = [...zP.map((z) => [PC, 17.25, z + 0.2 + 0.03 + 0.11 * 0.25]), [PC + 0.32, YH + 0.32, -49.4 + 0.03 + 0.13 * 0.25]].map(([x, y, z], i) => { const s = i < 2 ? 0.11 : 0.13, n = new THREE.Group(); n.add(L.box(s * 0.07, s * 0.72, 0.01, MAT.red, 0, s * 0.33, 0)); n.position.set(x, y, z); root.add(n); return n; });
  // talha na monovia (desce as bombas na obra)
  const hoist = new THREE.Group(); hoist.add(L.rbox(0.36, 0.32, 0.3, 0.04, MAT.yellow, 0, -0.62, 0), L.box(0.3, 0.12, 0.2, MAT.dark, 0, -0.4, 0));
  const chain = L.cyl(0.015, 0.015, 1, MAT.steel, 0, 0, 0, 5); hoist.add(chain); const hook = L.torus(0.07, 0.018, MAT.steel, 0, 0, 0); hoist.add(hook);
  const hoistBody = bake((() => { const g = new THREE.Group(); g.add(hoist.children[0], hoist.children[0]); return g; })()); hoist.add(hoistBody); root.add(hoist);

  /* --- bomba de lavagem dos filtros (atrás do reservatório) → coletor de lavagem (filters.js termina em x 14,6) --- */
  const bwp = new THREE.Group(), bx0 = 15.2, bz = -59.0;
  const zw = Math.sqrt(RO * RO - (bx0 - CX) ** 2);
  pipe(bwp, [[bx0, 14.45, CZ - zw + 0.05], [bx0, 14.45, bz], [bx0 + 0.36, 14.45, bz]], 0.16, MAT.treated, { flanges: 'end', bend: 0.3 });
  const bp = pumpSet(); bp.g.scale.setScalar(0.62); bp.g.position.set(bx0 + 0.75, 14.45, bz); bwp.add(bp.g);
  pipe(bwp, [[bx0 + 0.75, 14.45 + 0.54, bz], [bx0 + 0.75, 15.3, bz], [bx0 + 0.75, 15.3, -57.75], [14.6, 15.3, -57.75], [14.6, 14.55, -57.75]], 0.16, MAT.treated, { flanges: 'start', bend: 0.25 });
  const bwB = bake(bwp); L.shadows(bwB); root.add(bwB);

  /* --- tubo fino de amostra: do coletor de sucção até a torneira do laboratório --- */
  const sm = new THREE.Group(), SA = Lo.ETA.sample, lab = Lo.ETA.lab;
  const samplePts = [[sucX, yS + 0.26, zP[1] + 0.5], [sucX, FLR + 0.12, zP[1] + 0.5], [sucX + 0.4, FLR + 0.12, ZC + 0.6], [lab.x0 - 0.6, FLR + 0.12, -41.6], [lab.x0 + 0.4, FLR + 0.12, -41.6]];
  pipe(sm, samplePts, 0.045, M('#e8f1fa', { roughness: 0.35 }), { flanges: false, bend: 0.3, radial: 8 });
  sm.add(L.cyl(0.08, 0.08, 0.12, MAT.green, sucX, yS + 0.36, zP[1] + 0.5, 10));
  const smB = bake(sm); root.add(smB);

  /* --- setas (fluxo) --- */
  const chev = (pts, n, size = 0.2, col = '#8fe3ff', normal = [0, 0, 1]) => { const id = CB.add(pts, { n, size, normal, color: col }); return { update: (t, o) => CB.update(id, t, o) }; };
  const cIn = chev([[P.contactOut[0] + 0.2, P.resvIn[1] + 0.32, CZ + 0.05], [P.resvIn[0] + 0.8, P.resvIn[1] + 0.32, CZ + 0.05]], 3, 0.18, L.PAL.accent);
  const cSuc = chev([[CX + RI - 0.6, yS + 0.36, CZ + 0.05], [sucX - 0.2, yS + 0.36, CZ + 0.05]], 3, 0.17);
  const cRise = chev([[PC + 0.25, 15.4, zP[0] + 0.2], [PC + 0.25, YH - 0.2, zP[0] + 0.2]], 4, 0.16, '#8fe3ff', [1, 0, 0.25]);
  const cOut = chev([[PC + 0.32, YH, -51.4], [PC + 0.32, YH, ZC + 0.1]], 4, 0.17, '#8fe3ff', [1, 0, 0.25]);

  /* --- plantas --- */
  const ghR = ghost.of(bake((() => { const g = new THREE.Group(); g.add(rsF.clone(), rsW.clone(), rsR.clone()); return g; })()));
  const ghL = ghost.of(bake((() => { const g = new THREE.Group(); g.add(lSlab.clone(), lWall.clone(), lRoof.clone(), pumps[0].g.clone(), pumps[1].g.clone()); return g; })()));
  root.add(ghR, ghL);

  return {
    root,
    update(t, S) {
      const br = S.build.reservoir, bl = S.build.lift, wr = S.water.reservoir, run = S.run.lift;
      ghR.visible = br < 0.015; ghL.visible = bl < 0.015;
      // reservatório: laje → parede sobe → pilares e cobertura → talude, escada, respiros
      const kF = L.ease.out(sub(br, 0, 0.18)), kW = L.ease.io(sub(br, 0.15, 0.6)), kR = L.ease.out(sub(br, 0.58, 0.85));
      pivF.visible = kF > 0.001; pivF.scale.y = Math.max(0.001, kF);
      pivW.visible = kW > 0.001; pivW.scale.y = Math.max(0.001, kW);
      pivR.visible = kR > 0.001; pivR.position.y = (1 - kR) * 3.0;
      ioB.visible = br > 0.55;
      const lv = L.lerp(R.floor + 0.02, R.water, L.ease.io(wr)), wOn = wr > 0.002;
      wTop.visible = wFace.visible = wOn; wTop.position.y = lv; wFace.position.y = (R.floor + lv) / 2; wFace.scale.set(2 * RI - 0.02, lv - R.floor, 1);
      const inflow = (S.present ? 1 : L.sstep(75.8, 76.2, S.st)) * (br > 0.99 ? 1 : 0);
      jet.visible = inflow > 0.01 && lv < P.resvIn[1] - 0.05; jet.scale.y = Math.max(0.01, P.resvIn[1] - lv); jet.position.y = (P.resvIn[1] + lv) / 2;
      cIn.update(t, { speed: 0.5, amount: inflow * (S.water.contact > 0.9 ? 1 : 0) });
      // elevatória: laje → paredes → bombas descidas pela talha → barrilete → cobertura e quadro
      const kS = L.ease.out(sub(bl, 0, 0.12)), kWl = L.ease.io(sub(bl, 0.08, 0.38)), kRf = L.ease.out(sub(bl, 0.82, 1));
      pivLS.visible = kS > 0.001; pivLS.scale.y = Math.max(0.001, kS);
      pivLW.visible = kWl > 0.001; pivLW.scale.y = Math.max(0.001, kWl);
      pivLR.visible = kRf > 0.001; pivLR.position.y = (1 - kRf) * 2.5;
      let hz = zP[1], hy = 2.4;
      pumps.forEach((p, i) => {
        const k = L.ease.io(sub(bl, 0.34 + i * 0.13, 0.5 + i * 0.13)); p.g.visible = k > 0.001; p.g.position.y = PY + (1 - k) * 3.2;
        if (k > 0 && k < 1) { hz = zP[i]; hy = (1 - k) * 3.2; }
      });
      hoist.visible = bl > 0.3; hoist.position.set(mrX, RF - 0.46, bl < 0.7 ? hz : zP[1]);
      const hookY = bl < 0.7 ? PY + 0.62 + hy : 16.9, hlen = Math.max(0.05, (RF - 0.46 - 0.75) - hookY);
      chain.scale.y = Math.max(0.05, hlen); chain.position.y = -0.7 - hlen / 2; hook.position.y = -0.72 - hlen;
      sucB.visible = bl > 0.62; disB.visible = bl > 0.72; panB.visible = bl > 0.85; lamps.forEach((m) => { m.visible = bl > 0.85; });
      needles.forEach((n, i) => { n.visible = bl > 0.72; n.rotation.z = 1.2 - (i === 1 ? 0.25 : 1.7) * run; });
      lamps[0].material = run > 0.5 ? lampOn : lampOff;
      pumps[0].cpl.rotation.x = t * 30 * run;
      bwB.visible = br > 0.55; smB.visible = bl > 0.9;
      const fl = run * (wr > 0.95 ? 1 : 0);
      cSuc.update(t, { speed: 0.6, amount: fl }); cRise.update(t, { speed: 0.7, amount: fl }); cOut.update(t, { speed: 0.7, amount: fl });
    }
  };
}
