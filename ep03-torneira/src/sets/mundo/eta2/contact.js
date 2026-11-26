// ETA 2 — TANQUE DE CONTATO com chicanas (desinfecção) e ponto de mistura da cal e do flúor na saída.
// As chicanas obrigam a água a percorrer um caminho longo em zigue-zague: é isso que dá ao cloro o TEMPO DE CONTATO.
// A cor da água vai de "filtrada" a "tratada" ao longo do caminho (recurso didático). Os bicos de cloro, cal e flúor
// e as linhas de dosagem são do eta1; aqui ficam a nuvem de mistura e o agitador da saída.
// Obra: S.build.contact (laje → paredes → chicanas uma a uma → passarela). Água: S.water.contact. Cloro: S.run.chlorine.
// Saída: S.build.finalDose (agitador descido) e S.run.finalDose (mistura da cal e do flúor).
export function makeContact(ctx, K) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, bx, bake, pipe, railing, walkway, rod, butterfly, QuadBatch } = K, CB = K.chevB;
  const C = Lo.ETA.contact, W = Lo.WATER, D = Lo.ETA.dosing, P = Lo.P, PI = Math.PI;
  const X0 = C.x0, X1 = C.x1, ZB = C.z0, ZC = C.z1, FL = C.floor, WL = C.water, TOP = C.top, TH = 0.3, BT = 0.2, Y0 = Lo.ETA.y;
  const root = new THREE.Group(), sub = (b, a, c) => L.clamp01((b - a) / (c - a)), _o = new THREE.Object3D(), _c = new THREE.Color();
  const nB = C.baffles, bxs = [...Array(nB)].map((_, i) => X0 + ((X1 - X0) * (i + 1)) / (nB + 1));
  const GAP = 1.7, front = (i) => i % 2 === 0;           // chicana i: passagem na frente (par) ou atrás (ímpar)
  // compartimentos (entre paredes/chicanas)
  const comps = [...Array(nB + 1)].map((_, j) => { const a = j ? bxs[j - 1] + BT / 2 : X0 + TH, b = j < nB ? bxs[j] - BT / 2 : X1 - TH; return { j, a, b, c: (a + b) / 2, w: b - a }; });

  /* ---------- estrutura ---------- */
  const slabG = new THREE.Group(), wallG = new THREE.Group(), cutR = [];
  slabG.add(bx([X0, Y0, ZB], [X1, FL, ZC], MAT.conc)); cutR.push([X0, Y0, X1, FL]);
  wallG.add(bx([X0, FL, ZB], [X0 + TH, TOP, ZC], MAT.conc), bx([X1 - TH, FL, ZB], [X1, TOP, ZC], MAT.conc), bx([X0, FL, ZB], [X1, TOP, ZB + TH], MAT.conc));
  cutR.push([X0, FL, X0 + TH, TOP], [X1 - TH, FL, X1, TOP]);
  const slab = bake(slabG), walls = bake(wallG);
  const cutGeo = L.BGU.mergeGeometries(cutR.map(([a, b, c, d]) => { const g = new THREE.PlaneGeometry(c - a, d - b); g.translate((a + c) / 2, (b + d) / 2, ZC + 0.004); g.deleteAttribute('uv'); return g; }));
  const cutCaps = L.mesh(cutGeo, MAT.cut, 0, 0, 0, { cast: false });
  const slabPiv = L.group(root, 0, Y0, 0), slabIn = L.group(slabPiv, 0, -Y0, 0); slabIn.add(slab);
  const wallPiv = L.group(root, 0, FL, 0), wallIn = L.group(wallPiv, 0, -FL, 0); wallIn.add(walls, cutCaps);
  const baffles = bxs.map((x, i) => {
    const za = front(i) ? ZB + TH : ZB + TH + GAP, zb = front(i) ? ZC - GAP : ZC;
    const piv = L.group(root, 0, FL, 0), m = bx([x - BT / 2, 0, za], [x + BT / 2, TOP - FL - 0.05, zb], MAT.concOld); piv.add(m);
    L.shadows(m); return piv;
  });
  L.shadows(slab); L.shadows(walls);

  /* ---------- água por compartimento (cor filtrada → tratada) ---------- */
  // gradiente próprio, mais contrastado: verde-água claro na entrada → Lo.WATER.treated na saída (cor por vértice)
  const C0 = new THREE.Color('#9ed8c4'), C1 = new THREE.Color(W.treated), ccol = comps.map((c) => C0.clone().lerp(C1, Math.pow(c.j / nB, 0.85)));
  const wQ = new QuadBatch(2 * (nB + 1), L.water('#ffffff', 0.93, { side: THREE.DoubleSide, vertexColors: true }), { colors: true }); root.add(wQ.mesh);
  // água nas passagens (por cima da chicana não: nas folgas) — a superfície contínua já cobre; faces de corte só nos compartimentos

  /* ---------- entrada (difusor), saída (tubo até o reservatório) ---------- */
  const pg = new THREE.Group();
  pg.add(L.cyl(0.34, 0.25, 0.3, MAT.treated, X0 + TH + 0.15, P.contactIn[1], P.contactIn[2], 16).rotateZ(PI / 2)); // boca de entrada
  const CO = P.contactOut, RI = P.resvIn;
  pipe(pg, [[X1 - TH - 0.25, CO[1], CO[2]], RI], 0.24, MAT.treated, { flanges: 'end' });
  pg.add(L.cyl(0.36, 0.36, 0.14, MAT.treated, X1 + 0.08, CO[1], CO[2], 18).rotateZ(PI / 2)); // flange na parede
  // macromedidor na saída (carretel com cabeçote)
  pg.add(L.cyl(0.3, 0.3, 0.6, MAT.blueDark, (X1 + RI[0]) / 2, CO[1], CO[2], 18).rotateZ(PI / 2), L.rbox(0.28, 0.22, 0.28, 0.04, MAT.white, (X1 + RI[0]) / 2, CO[1] + 0.42, CO[2]));
  // passarela de trás com guarda-corpo e escada
  walkway(pg, X0 - 2.0, ZB - 1.2, X1, ZB, TOP + 0.02);
  for (let x = X0 - 1.6; x < X1; x += 2.3) pg.add(rod([x, Y0, ZB - 1.1], [x, TOP, ZB - 1.1], 0.06, MAT.galv, 6));
  railing(pg, [[X0 - 2.0, ZB - 1.15], [X1, ZB - 1.15]], TOP + 0.02);
  railing(pg, [[X1 - 0.12, ZB + 0.05], [X1 - 0.12, ZC]], TOP);
  const pgB = bake(pg); L.shadows(pgB); root.add(pgB);
  // agitador rápido de mistura na saída (desce com S.build.finalDose)
  const mixer = new THREE.Group(), mxX = 9.7, mxZ = -50.2;
  const beam = bx([mxX - 0.12, TOP, ZB], [mxX + 0.12, TOP + 0.3, ZC - 0.6], MAT.galv); L.shadows(beam);
  const head = new THREE.Group(); head.add(L.cyl(0.24, 0.24, 0.55, MAT.blue, 0, 0.62, 0, 18), L.cyl(0.3, 0.3, 0.05, MAT.iron, 0, 0.32, 0, 18), L.rbox(0.42, 0.25, 0.42, 0.04, MAT.iron, 0, 0.18, 0), L.cyl(0.18, 0.18, 0.1, MAT.blue, 0, 0.94, 0, 18));
  for (let i = 0; i < 14; i++) { const a = (i / 14) * L.TAU, f = L.box(0.03, 0.42, 0.04, MAT.blue, Math.cos(a) * 0.25, 0.62, Math.sin(a) * 0.25); f.rotation.y = -a; head.add(f); }
  const shaft = new THREE.Group(); shaft.add(L.cyl(0.035, 0.035, TOP - FL - 0.4, MAT.steel, 0, -(TOP - FL - 0.4) / 2, 0, 8));
  for (let k = 0; k < 3; k++) { const bl = L.box(0.5, 0.03, 0.14, MAT.steel, 0.25, 0, 0); bl.rotation.x = 0.35; const hb = new THREE.Group(); hb.add(bl); hb.rotation.y = (k * L.TAU) / 3; hb.position.y = -(TOP - FL - 0.55); shaft.add(hb); }
  const headB = bake(head), shaftB = bake(shaft); mixer.add(headB, shaftB); mixer.position.set(mxX, TOP + 0.3, mxZ); root.add(mixer);
  const mixBeam = L.group(root); mixBeam.add(beam);

  /* ---------- setas do percurso em zigue-zague (= tempo de contato) ---------- */
  const yS = WL + 0.05, path = [[P.contactIn[0] + 0.6, yS, P.contactIn[2]]];
  comps.forEach((c, j) => {
    if (j === 0) { path.push([c.c, yS, -52.0], [c.c, yS, ZC - GAP / 2]); return; }
    const fromFront = front(j - 1), zA = fromFront ? ZC - GAP / 2 : ZB + TH + GAP / 2, zB = fromFront ? ZB + TH + GAP / 2 : ZC - GAP / 2;
    if (j === nB) { path.push([c.c, yS, zA], [c.c, yS, CO[2]], [X1 - TH - 0.3, yS, CO[2]]); return; }
    path.push([c.c, yS, zA], [c.c, yS, zB]);
  });
  const pc = new THREE.CurvePath(); for (let i = 0; i < path.length - 1; i++) pc.add(new THREE.LineCurve3(L.v3(path[i]), L.v3(path[i + 1])));
  const pts = pc.getSpacedPoints(220);
  const zig = CB.add(L.curve(pts.map((p) => [p.x, p.y, p.z]), false, 0.05), { n: 34, size: 0.28, normal: [0, 1, 0.45], color: L.PAL.accent });
  // linha luminosa fina do percurso (aparece junto com as setas)
  const pathLine = L.mesh(new THREE.TubeGeometry(L.curve(pts.map((p) => [p.x, p.y - 0.02, p.z]), false, 0.05), 400, 0.025, 6), L.flat('#ffe48a', { transparent: true, opacity: 0.5, toneMapped: false }), 0, 0, 0, { cast: false, receive: false });
  root.add(pathLine);

  /* ---------- nuvens de produto: cloro na entrada, cal e flúor na saída ---------- */
  const pr = L.rng(515), sph = new THREE.IcosahedronGeometry(1, 1), cloudM = M('#ffffff', { roughness: 0.9, transparent: true, opacity: 0.9, depthWrite: false, emissive: '#ffffff', emissiveIntensity: 0.25 });
  const CLN = [60, 70, 50], cloudIM = new THREE.InstancedMesh(sph, cloudM, CLN[0] + CLN[1] + CLN[2]); cloudIM.castShadow = false; cloudIM.frustumCulled = false; cloudIM.renderOrder = 6; root.add(cloudIM);
  let cAt = 0;
  function cloud(n, col, at, spread, size) { const d = [], base = cAt; for (let i = 0; i < n; i++) { d.push({ ph: pr(), a: pr() * L.TAU, r: pr(), s: size * (0.6 + pr() * 0.8), dy: pr() }); cloudIM.setColorAt(cAt++, new THREE.Color(col).offsetHSL(0, 0, (pr() - 0.5) * 0.1)); } return { base, d, at, spread }; }
  const clC = cloud(CLN[0], '#e3f59a', D.chlorine, 1.0, 0.07), limeC = cloud(CLN[1], '#ffffff', D.lime, 1.25, 0.12), fluC = cloud(CLN[2], '#c9b6ff', D.fluoride, 1.1, 0.1);
  function updCloud(cl, t, amt, drift) {
    cl.d.forEach((p, i) => {
      const u = L.fract(p.ph + t * 0.35), rr = cl.spread * (0.15 + 0.85 * u) * (0.4 + p.r * 0.6), a = p.a + t * 1.6 * (1 - u * 0.5);
      _o.position.set(cl.at[0] + Math.cos(a) * rr * 0.7 + drift[0] * u, WL + 0.02 - u * 0.12 * p.dy, cl.at[2] + Math.sin(a) * rr * 0.7 + drift[2] * u);
      const sc = amt > 0.01 ? p.s * (1 + u * 1.6) * amt * (1 - u * 0.55) : 0.00001; _o.scale.set(sc, sc * 0.45, sc); _o.updateMatrix(); cloudIM.setMatrixAt(cl.base + i, _o.matrix);
    });
    cloudIM.instanceMatrix.needsUpdate = true;
  }

  /* ---------- planta ---------- */
  const gh = ghost.of(bake((() => { const g = new THREE.Group(); g.add(slab.clone(), walls.clone()); baffles.forEach((b) => g.add(b.children[0].clone().translateY(FL))); return g; })()));
  root.add(gh);

  return {
    root,
    update(t, S) {
      const b = S.build.contact, w = S.water.contact;
      gh.visible = b < 0.015;
      const kS = L.ease.out(sub(b, 0, 0.14)), kW = L.ease.io(sub(b, 0.1, 0.42));
      slabPiv.visible = kS > 0.001; slabPiv.scale.y = Math.max(0.001, kS);
      wallPiv.visible = kW > 0.001; wallPiv.scale.y = Math.max(0.001, kW);
      baffles.forEach((p, i) => { const k = L.ease.out(sub(b, 0.4 + i * 0.065, 0.52 + i * 0.065)); p.visible = k > 0.001; p.scale.y = Math.max(0.001, k); });
      pgB.visible = b > 0.75;
      // água: o caminho enche na ordem dos compartimentos
      comps.forEach((c, j) => {
        const f = L.sstep(j / (nB + 4), j / (nB + 4) + 0.45, w), lv = L.lerp(FL, WL, f);
        if (f > 0.005) { wQ.front(2 * j, c.a, c.b, FL, lv, ZC + 0.006, null, ccol[j]); wQ.top(2 * j + 1, c.a - BT / 2, c.b + BT / 2, ZB + TH, ZC, lv, null, ccol[j]); } else { wQ.hide(2 * j); wQ.hide(2 * j + 1); }
      });
      wQ.done();
      const flowA = L.sstep(0.6, 1, w);
      CB.update(zig, t, { speed: 0.035, amount: flowA }); pathLine.visible = flowA > 0.02; pathLine.material.opacity = 0.45 * flowA;
      updCloud(clC, t, w > 0.3 ? S.run.chlorine : 0, [1.2, 0, 3.2]);
      // saída: agitador desce e gira; cal (branca) e flúor (lilás claro) se misturam e seguem para o reservatório
      const kd = S.build.finalDose, kr = S.run.finalDose * (w > 0.5 ? 1 : 0);
      mixBeam.visible = mixer.visible = kd > 0.001;
      mixer.position.y = TOP + 0.3 + (1 - L.ease.out(L.clamp01(kd / 0.7))) * 2.2;
      shaftB.rotation.y = t * 9 * kr;
      updCloud(limeC, t, kr, [0.7, 0, -0.6]); updCloud(fluC, t, kr, [0.5, 0, -1.2]);
    }
  };
}
