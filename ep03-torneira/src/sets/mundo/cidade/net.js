// REDE DE DISTRIBUIÇÃO ENTERRADA (vista com o raio-x S.xray): tronco da torre pela avenida da encosta até a Rua da Casa
// (P.towerOut → P.mainFace), rede da rua de trás, ramais de água (PVC azul) até os cavaletes de casas, escola, hospital e
// prédios; coletor de esgoto da rua de trás e ramais de esgoto (PVC ocre) das edificações até os coletores (nunca na rede
// azul); ligações das bocas de lobo à galeria (concreto). A água aparece como LINHA LUMINOSA AZUL sobre o tubo + setas.
// Enchimento: TRONCO e rede principal da Rua da Casa enchem com o nível da torre (o reservatório alimenta a rede — é a
// água que dá pressão aos manômetros, S.piezo); a REDE SECUNDÁRIA e os ramais enchem com S.water.net (84,8–88,4), a
// partir do pé da avenida, e cada edificação "acende" quando a água chega no seu cavalete.
export function buildNet(ctx, parts) {
  const { L, THREE, Lo, K, shared } = ctx, { Merge, vmat, Revealer } = K;
  const P = Lo.P, N = Lo.NET, ZF = Lo.ZF, SB = Lo.STREETS.back, root = new THREE.Group();
  const XC = P.mainFace[0];                       // tê do tronco com a rede da Rua da Casa (x = 24)
  const ZBW = 3.6, ZBS = 0.8, YBS = -2.5;         // rede de água e coletor de esgoto da rua de trás (sob o asfalto)
  const sub = (k, a, b) => L.clamp01((k - a) / (b - a));
  const G = (x, z) => Lo.G(x, z);

  /* ---------- utilitários: tubo em peças (para revelar por distância) ---------- */
  const polyCurve = (pts) => { const c = new THREE.CurvePath(); for (let i = 0; i < pts.length - 1; i++) c.add(new THREE.LineCurve3(new THREE.Vector3(...pts[i]), new THREE.Vector3(...pts[i + 1]))); return c; };
  const smooth = (pts) => L.curve(pts, false, 0.15);
  class Off extends THREE.Curve { constructor(c, u0, u1, dy) { super(); this.c = c; this.u0 = u0; this.u1 = u1; this.dy = dy; } getPoint(t, o = new THREE.Vector3()) { this.c.getPointAt(this.u0 + (this.u1 - this.u0) * t, o); o.y += this.dy; return o; } }
  /** quebra a curva em peças de ~step m. Devolve { base:[{s,geo}], glow:[{s,geo}], len } com s = s0 + distância */
  function pipe(c, r, s0, o = {}) {
    const len = c.getLength(), n = Math.max(1, Math.ceil(len / (o.step ?? 1.5))), base = [], glow = [];
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      base.push({ s: s0 + u0 * len, geo: new THREE.TubeGeometry(new Off(c, u0, u1, 0), 2, r, o.radial ?? 10, false), color: o.color });
      if (o.glow !== false) glow.push({ s: s0 + u0 * len, geo: new THREE.TubeGeometry(new Off(c, u0, u1, r + 0.035), 2, o.gr ?? 0.055, 5, false) });
    }
    return { base, glow, len, curve: c, s0 };
  }

  const W_BASE = [], W_GLOW1 = [], W_GLOW2 = [], SEW = [], DRN = [], FITT = new Merge(), ends = [];
  /* ---------- 1. TRONCO: P.towerOut → avenida (enterrado a 1,2 m) → passa sob a Rua da Casa → P.mainFace ---------- */
  const trunkPts = [P.towerOut, [P.towerOut[0], P.towerOut[1] - 0.4, P.towerOut[2] + 0.6]];
  for (let z = -21.0; z <= ZF - 0.33 + 1e-6; z += 1.0) { const x = z < -18 ? L.lerp(P.towerOut[0], XC, L.clamp01((z + 21) / 3)) : XC; trunkPts.push([x, G(x, z) - 1.2, z]); }
  trunkPts.push([XC, N.water.y, ZF - 0.33]);
  const trunk = pipe(smooth(trunkPts), 0.26, 0, { color: Lo.PIPE.treated });
  W_BASE.push(...trunk.base); W_GLOW1.push(...trunk.glow);
  const D_T = trunk.len;
  // registros de manobra (caixa com tampa) no tronco
  [-12, 10].forEach((z) => { const y = G(XC, z); FITT.add(K.G.box(0.5, 0.5, 0.7), '#2667ad', K.TM(XC, y - 1.2, z)).add(K.G.cyl(0.04, 0.04, 1.1, 6), '#9aa5ae', K.TM(XC, y - 0.6, z)); });

  /* ---------- 2. Rua da Casa (no corte): a rede principal é desenhada pelo módulo face; aqui só a distância ---------- */
  const faceS = (x) => D_T + Math.abs(x - XC);          // distância do tronco até x na rede da face
  const D1 = D_T + Math.max(XC - Lo.X0, Lo.X1 - XC);

  /* ---------- 3. rede da rua de trás (secundária): tê no tronco em z = ZBW, para os dois lados ---------- */
  const backL = pipe(polyCurve([[XC, -1.2, ZBW], [Lo.X0 + 2, -1.2, ZBW]]), 0.2, 0, { color: Lo.PIPE.treated });
  const backR = pipe(polyCurve([[XC, -1.2, ZBW], [Lo.X1 - 2, -1.2, ZBW]]), 0.2, 0, { color: Lo.PIPE.treated });
  W_BASE.push(...backL.base, ...backR.base); W_GLOW2.push(...backL.glow, ...backR.glow);
  FITT.add(K.G.sph(0.34, 12, 8), '#2667ad', K.TM(XC, -1.2, ZBW));
  // tampões nas pontas (rede termina na borda da maquete)
  [[Lo.X0 + 2, ZBW], [Lo.X1 - 2, ZBW]].forEach(([x, z]) => FITT.add(K.G.cyl(0.24, 0.24, 0.12, 12), '#2667ad', K.TM(x, -1.2, z, 0, 0, Math.PI / 2)));

  /* ---------- 4. ramais de água ---------- */
  const cons = shared.cityConsumers || [];
  const ramal = (c) => {
    const big = !!c.big, r = big ? 0.13 : 0.085;
    let pts, s0;
    if (c.from === 'casa') {
      const x = c.x; s0 = Math.abs(x - XC);
      pts = [[x, N.water.y + 0.1, ZF - 0.3], [x, -0.95, ZF - 0.9], [x, -0.9, 22.3], [x, -0.55, 21.85], [x, 0.55, 21.75]];
      FITT.add(K.G.cyl(N.water.r + 0.05, N.water.r + 0.05, 0.22, 14), '#2667ad', K.TM(x, N.water.y, ZF - 0.02, 0, 0, Math.PI / 2));   // colar de tomada
    } else {
      const x = c.x, zf = c.z; s0 = Math.abs(x - XC);
      pts = [[x, -1.0, ZBW - 0.15], [x, -0.95, SB.z0 - 0.6]];
      for (let z = SB.walkBack[0] - 0.5; z > zf + 0.6; z -= 1.0) pts.push([x, G(x, z) - 0.9, z]);
      pts.push([x, G(x, zf) - 0.5, zf + 0.35], [x, G(x, zf) + 0.4, zf + 0.2]);
      FITT.add(K.G.sph(0.25, 10, 8), '#2667ad', K.TM(x, -1.2, ZBW));
    }
    const p = pipe(smooth(pts), r, s0, { color: '#3b8be0', gr: 0.045, step: 1.2 });
    W_BASE.push(...p.base); W_GLOW2.push(...p.glow);
    const e = new THREE.Vector3(...pts[pts.length - 1]);
    ends.push({ ...c, p: e, s: s0 + p.len });
    // registro de passeio (caixinha com tampa) junto ao muro
    if (c.from === 'casa') FITT.add(K.G.box(0.28, 0.32, 0.28), '#2667ad', K.TM(c.x, -0.5, 22.6)).add(K.G.box(0.3, 0.03, 0.3), '#3a4149', K.TM(c.x, 0.16, 22.6));
  };
  cons.forEach(ramal);
  const D2 = Math.max(1, ...ends.map((e) => e.s), backL.len, backR.len);

  /* ---------- 5. esgoto: ramais (das edificações até o coletor) e coletor da rua de trás ---------- */
  const sewM = L.mat(Lo.PIPE.sewer, { roughness: 0.6 });
  cons.forEach((c, i) => {
    if (c.from === 'casa') {
      const x = c.x + (c.kind === 'casa' ? -2.2 : -3.0);
      SEW.push(L.tube(smooth([[x, 0.25, 21.4], [x, -0.45, 21.9], [x, -0.75, 23.5], [x, N.sewer.y + 0.25, ZF - 1.3], [x, N.sewer.y + 0.05, ZF - 0.38]]), 0.1, sewM, 40, 8));
      SEW.push(L.box(0.5, 0.45, 0.5, L.mat('#a7adb1'), x, 0.0, 21.0 - 0.3));   // caixa de inspeção no lote
    } else {
      const x = c.x + 3.6, zf = c.z, pts = [[x, G(x, zf) + 0.2, zf + 0.25], [x, G(x, zf) - 0.6, zf + 0.6]];
      for (let z = zf + 1.6; z < SB.walkBack[0] - 0.4; z += 1.5) pts.push([x, G(x, z) - 1.0, z]);
      pts.push([x, -1.4, SB.z0 - 0.5], [x, YBS + 0.1, ZBS - 0.3]);
      SEW.push(L.tube(smooth(pts), 0.1, sewM, 60, 8));
    }
    void i;
  });
  const backSew = L.tube(polyCurve([[Lo.X0 + 1, YBS, ZBS], [Lo.X1 - 1, YBS, ZBS]]), 0.3, sewM, 4, 14); SEW.push(backSew);
  const backSewChev = new L.Chevrons(polyCurve([[Lo.X0 + 3, YBS + 0.42, ZBS], [Lo.X1 - 3, YBS + 0.42, ZBS]]), { n: 26, size: 0.36, color: '#ffb35c', normal: [0, 1, 0] });
  root.add(backSewChev.mesh);
  // PVs de esgoto da rua de trás (tampa no asfalto, chaminé até o coletor)
  [-40, -10, 14, 44].forEach((x) => {
    const sh = L.mesh(new THREE.CylinderGeometry(0.42, 0.42, -YBS + 0.02, 16, 1, true).translate(0, (YBS + 0.02) / 2, 0), L.mat('#b9a79a', { roughness: 0.88, side: THREE.DoubleSide }), x, 0.02, ZBS); SEW.push(sh);
    const lid = K.lid('ESGOTO', '#4a3d33'); lid.position.set(x, 0.034, ZBS); root.add(lid);
  });

  /* ---------- 6. bocas de lobo → galeria (Rua da Casa): caixas sob a calçada e ligações de concreto ---------- */
  const conc = L.mat('#b8bdc1', { roughness: 0.88, side: THREE.DoubleSide });
  const INL_BACK = [-44, -24, 12, 42], INL_FRONT = [-34, 34];
  const gal = N.drain, galTop = gal.y + gal.h / 2 + 0.2, galBackZ = ZF - 1.1;
  INL_BACK.forEach((x) => DRN.push(L.tube(smooth([[x, -0.85, 23.2], [x, -1.5, 24.6], [x, -2.0, 27.5], [x, galTop - 0.1, ZF - 1.6], [x, galTop - 0.25, ZF - 0.8]]), 0.2, conc, 40, 12)));
  INL_FRONT.forEach((x) => DRN.push(L.tube(polyCurve([[x, -0.85, 31.8], [x, gal.y + 0.15, 31.8], [x, gal.y + 0.15, galBackZ + 0.05]]), 0.2, conc, 6, 12)));
  const inletSpec = [...INL_BACK.map((x) => ({ x, side: -1 })), ...INL_FRONT.map((x) => ({ x, side: 1 }))];
  shared.cityInlets = inletSpec;

  /* ---------- malhas ---------- */
  const pipeMat = L.mat('#ffffff', { vertexColors: true, roughness: 0.5, metalness: 0.05 });
  const baseRev = new Revealer(W_BASE, pipeMat); baseRev.set(1e9); L.shadows(baseRev.mesh, false, true); root.add(baseRev.mesh);
  const glowMat = L.glow('#5fc0ff', 2.0);
  const g1 = new Revealer(W_GLOW1, glowMat, { cast: false }), g2 = new Revealer(W_GLOW2, glowMat, { cast: false });
  root.add(g1.mesh, g2.mesh);
  if (!FITT.empty) root.add(FITT.mesh(vmat({ roughness: 0.5, metalness: 0.3 })));
  SEW.forEach((m) => { m.castShadow = false; root.add(m); });
  DRN.forEach((m) => { m.castShadow = false; root.add(m); });
  // setas no tronco e na rede de trás
  const chT = new L.Chevrons(new Off(trunk.curve, 0, 1, 0.5), { n: 22, size: 0.36, color: '#ffd23f', normal: [0, 1, 0] });
  const chL = new L.Chevrons(new Off(backL.curve, 0, 1, 0.45), { n: 18, size: 0.34, color: '#ffd23f', normal: [0, 1, 0] });
  const chR = new L.Chevrons(new Off(backR.curve, 0, 1, 0.45), { n: 8, size: 0.34, color: '#ffd23f', normal: [0, 1, 0] });
  root.add(chT.mesh, chL.mesh, chR.mesh);
  // "acendimento" das edificações: anel luminoso que se abre no cavalete quando a água chega
  const popGeo = new THREE.TorusGeometry(0.55, 0.06, 6, 28), popM = L.glow('#7fd4ff', 2.2, { transparent: true, opacity: 0.9, depthWrite: false });
  const dotM = L.glow('#9fe0ff', 2.4, { transparent: true, depthWrite: false });
  const pops = ends.map((e) => { const g = new THREE.Group(); g.position.copy(e.p); g.position.y += 0.35; const ring = new THREE.Mesh(popGeo, popM); ring.rotation.x = Math.PI / 2; const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), dotM); g.add(ring, dot); g.renderOrder = 31; root.add(g); return { g, ring, dot, e }; });

  /** frente d'água: primária (tronco + Rua da Casa) segue o nível da torre; secundária segue S.water.net */
  const fronts = (S) => ({ f1: S.present ? 1 : sub(S.water.tower, 0.06, 0.42), f2: S.present ? 1 : S.water.net });
  shared.cityFronts = fronts; shared.cityFaceS = faceS; shared.cityD1 = D1;

  function update(t, S) {
    const { f1, f2 } = fronts(S);
    const d1 = f1 * D1, d2 = f2 * D2;
    g1.set(f1 >= 1 ? 1e9 : d1); g2.set(f2 >= 1 ? 1e9 : d2 - 1e-6); g2.mesh.visible = g2.mesh.visible && f2 > 0;
    const kT = L.clamp01(d1 / D_T);
    chT.update(t, { speed: 0.05, head: kT, amount: f1 > 0.001 ? 1 : 0, size: 0.36 });
    chL.update(t, { speed: 0.03, head: L.clamp01(d2 / backL.len), amount: f2 > 0.001 ? 1 : 0, size: 0.34 });
    chR.update(t, { speed: 0.06, head: L.clamp01(d2 / backR.len), amount: f2 > 0.001 ? 1 : 0, size: 0.34 });
    backSewChev.update(t, { speed: 0.025, amount: S.xray > 0.05 ? 1 : 0, size: 0.36 });
    const xr = S.xray > 0.05;
    pops.forEach((p) => {
      const k = (d2 - p.e.s) / 6, on = f2 >= 1 ? 1 : L.clamp01(k * 4);
      const burst = L.clamp01(k), vis = on > 0.001 && xr;
      p.g.visible = vis; if (!vis) return;
      const sc = 1 + 1.8 * Math.sin(Math.PI * burst); p.ring.scale.setScalar(sc);
      p.ring.material.opacity = 0.9; p.dot.scale.setScalar(on);
    });
  }
  return { root, update, D_T, D1, D2, faceS, ends, trunk };
}
