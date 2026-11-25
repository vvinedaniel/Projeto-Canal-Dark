// REDE DE ESGOTO SEPARADA: coletor tronco em corte ABAIXO da galeria (PVC ocre, conteúdo marrom com partículas),
// curva de 90° para o fundo até o poço da elevatória (Lo.LIFT), coletor da rua B, ramais laranja das casas,
// linha de recalque até a ETE e tubo de efluente TRATADO da ETE até o rio (água clara). Surge com S.build.sewer.
export function buildSewer(ctx, K, gal) {
  const { L, THREE, Lo, scene } = ctx, { C, ZF } = K, { PAL } = L;
  const SW = Lo.SEWER, root = L.group(scene);
  const clipFront = new THREE.Plane(new THREE.Vector3(0, 0, -1), ZF); // nada passa à frente do corte
  const tubeM = C.pvcTube.clone(); tubeM.clippingPlanes = [clipFront];
  const recM = L.mat('#c4621e', { roughness: 0.5 }), eflM = C.efl, wellM = L.mat('#b9bec2', { roughness: 0.85 });

  /* ---------- coletor tronco no corte ---------- */
  const XE = 16.9, SEG = 180, RAD = 14, pts = [];
  for (let x = SW.x0; x < XE; x += 1) pts.push([x, SW.y(x)]); pts.push([XE, SW.y(XE)]);
  const trunk = L.cutPipe(pts, { r: SW.r, wall: 0.045, mat: C.pvc, cutMat: C.pvcCut, seg: SEG, radial: RAD, tension: 0.1 });
  trunk.group.position.z = ZF; root.add(trunk.group);
  const sew = trunk.waterIn(0.42, PAL.sewage, 0.95);
  const bed = L.cutPipe(pts, { r: SW.r + 0.05, wall: 0.05, mat: C.sand, cutMat: L.mat('#b89a62', { roughness: 1 }), seg: SEG, radial: 8, tension: 0.1 });
  bed.group.position.z = ZF - 0.001; root.add(bed.group);
  // partículas (sólidos e papel) correndo dentro do esgoto
  const bits = new L.Flow(trunk.curve, { n: 70, size: 0.035, colors: ['#5a3a1f', '#6b4524', '#e8e0cc', '#4a2f19'], jitter: [0.2, 0.05, 0.1], offset: [0, -0.13, -0.1], seed: 5 });
  trunk.group.add(bits.mesh);
  L.shadows(trunk.group);

  /* ---------- tubos 3D (enterrados: aparecem no raio-x) ---------- */
  const tubes = [];
  const addTube = (P, r, m, a, b, o = {}) => {
    const cv = P.isCurve ? P : new THREE.CatmullRomCurve3(P.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', o.tension ?? 0.15);
    const n = o.seg ?? Math.max(16, Math.round(cv.getLength() * 3)), mesh = L.mesh(new THREE.TubeGeometry(cv, n, r, 10), m);
    root.add(mesh); tubes.push({ mesh, a, b, n, cv }); return cv;
  };
  const yT = SW.y(XE), LZ = (Lo.LIFT.z0 + Lo.LIFT.z1) / 2, LX = 17.3;
  // curva de 90° e trecho até a elevatória
  addTube([[XE - 0.3, yT, ZF], [XE, yT, ZF], [LX, yT - 0.01, ZF - 0.35], [LX, yT - 0.05, ZF - 1.2], [LX, -2.15, 18], [LX, -2.35, LZ + 1.05]], SW.r, tubeM, 0.45, 0.62, { tension: 0.05 });
  // poço úmido da elevatória (enterrado, sob o prédio da cidade)
  const gL = Lo.G(LX, LZ), well = L.group(root, LX, 0, LZ);
  well.add(L.mesh(new THREE.CylinderGeometry(1.0, 1.0, gL - 0.4 + 3.2, 24, 1, true), wellM, 0, (gL - 0.4 - 3.2) / 2, 0));
  well.add(L.cyl(1.05, 1.05, 0.2, wellM, 0, gL - 0.5, 0, 24), L.cyl(1.0, 1.0, 0.2, wellM, 0, -3.2, 0, 24));
  well.add(L.mesh(new THREE.CylinderGeometry(0.97, 0.97, 0.02, 24), C.wSew, 0, -2.0, 0, { cast: false }));
  [-0.35, 0.35].forEach((x) => well.add(L.cyl(0.22, 0.25, 0.6, L.mat('#2f6fb0', { roughness: 0.4 }), x, -2.9, 0, 14)));
  L.shadows(well);
  // coletor da rua B (z = 0): perfil sempre descendo para a elevatória
  const yB = (() => { const xs = [], ys = []; let m = 1e9; for (let x = -34; x <= LX + 0.01; x += 0.5) { m = Math.min(m - 0.004, Lo.G(x, 0) - 1.6); xs.push(x); ys.push(m); } return (x) => { const i = Math.min(xs.length - 1, Math.max(0, Math.round((x + 34) / 0.5))); return ys[i]; }; })();
  const cB = []; for (let x = -34; x < LX - 0.6; x += 2) cB.push([x, yB(x), 0]);
  cB.push([LX - 0.4, yB(LX), 0], [LX, yB(LX) - 0.02, 0.4], [LX, yB(LX) - 0.1, LZ - 1.05]);
  addTube(cB, 0.25, tubeM, 0.5, 0.74, { tension: 0.05 });
  // ramais das casas (saem da fundação, frente da casa)
  const ramais = [];
  Lo.HOUSES.forEach((h, i) => {
    const x = h.x + Math.min(1.5, h.w / 2 - 0.6);
    if (h.face === 'A') {
      const y0 = Lo.G(x, h.z1) - 0.45, ys = SW.y(Math.min(x, XE));
      ramais.push([[x, y0, h.z1 - 0.3], [x, y0 - 0.15, h.z1 + 0.8], [x, L.lerp(y0, ys, 0.55), 18.5], [x, ys + 0.18, 23.9], [x, ys + 0.05, ZF - 0.55], [x, ys, ZF - SW.r + 0.04]]);
    } else {
      const y0 = Lo.G(x, h.z0) - 0.45, yb = yB(x);
      ramais.push([[x, y0, h.z0 + 0.3], [x, y0 - 0.1, h.z0 - 0.2], [x, yb + 0.12, 0.45], [x, yb + 0.02, 0.2]]);
    }
  });
  ramais.forEach((P, i) => addTube(P, 0.12, tubeM, 0.62 + 0.025 * i, 0.72 + 0.025 * i, { tension: 0.2 }));
  // recalque elevatória → ETE
  const ETEz = Lo.ETE.z1, gE = Lo.G(17.6, ETEz - 0.6), rx = 17.75;
  addTube([[rx, gL - 0.7, LZ - 0.6], [rx, 2.0, LZ - 1.6], [rx, 2.0, 0], [rx, 2.0, ETEz + 0.8], [rx, gE - 0.2, ETEz - 0.3], [rx, gE + 0.35, ETEz - 0.6]], 0.13, recM, 0.74, 0.9, { tension: 0.1 });
  const chegada = L.group(root, rx, gE, ETEz - 0.7); chegada.add(K.slab(-0.5, 0.5, -0.1, 0.55, -0.5, 0.5, wellM, wellM), L.box(0.9, 0.04, 0.9, C.iron, 0, 0.57, 0)); L.shadows(chegada);
  // efluente tratado ETE → rio
  const ez = -19, gx = (x) => Lo.G(x, ez);
  const eflCurve = addTube([[Lo.ETE.x1 - 0.4, gx(Lo.ETE.x1) - 0.4, ez], [Lo.ETE.x1 + 1, 2.0, ez], [24.5, 1.9, ez], [26.3, 1.2, ez], [27.2, 0.1, ez], [27.65, -0.3, ez]], 0.15, eflM, 0.86, 1.0, { tension: 0.1 });
  const outl = L.group(root, 27.7, -0.3, ez);
  outl.add(K.slab(-0.12, 0.08, -0.45, 0.5, -0.7, 0.7, C.concOld, C.concOld));
  outl.add(L.mesh(new THREE.CircleGeometry(0.12, 14).rotateY(Math.PI / 2), C.throat, 0.085, 0, 0, { cast: false }));
  L.shadows(outl);
  const eflJet = L.mesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1, true).translate(0, -0.5, 0), C.wClear, 27.82, -0.35, ez, { cast: false }); eflJet.renderOrder = 7; root.add(eflJet);
  const eflFoam = L.mesh(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), C.foam, 28.0, 0, ez, { cast: false }); root.add(eflFoam);
  L.shadows(root);
  tubes.forEach((t) => { t.mesh.castShadow = false; });

  /* ---------- setas (raio-x): esgoto → elevatória → ETE; tratado → rio ---------- */
  const orange = '#ff9a2e';
  const chT = new L.Chevrons(L.curve(pts.filter((_, i) => i % 3 === 0).map(([x, y]) => [x, y + 0.02, ZF + 0.06]), false, 0.2), { n: 22, size: 0.14, color: orange });
  const up = [0, 1, 0];
  const lift = (cv, dy) => L.curve(cv.getSpacedPoints(24).map((p) => [p.x, p.y + dy, p.z]), false, 0.2);
  const ch3 = [
    new L.Chevrons(lift(tubes[0].cv, 0.45), { n: 6, size: 0.2, color: orange, normal: up }),
    new L.Chevrons(lift(tubes[1].cv, 0.4), { n: 18, size: 0.2, color: orange, normal: up }),
    new L.Chevrons(lift(tubes[tubes.length - 2].cv, 0.35), { n: 9, size: 0.2, color: orange, normal: up }),
    new L.Chevrons(lift(eflCurve, 0.4), { n: 8, size: 0.2, color: L.PAL.clear, normal: up })
  ];
  root.add(chT.mesh, ...ch3.map((c) => c.mesh));
  const glowCol = new THREE.Color(PAL.pvc);

  return {
    update(t, S) {
      const b = S.build.sewer, xr = L.clamp01(S.xray / 0.7);
      K.revealCut(trunk, K.sub(b, 0, 0.5), SEG, RAD); K.revealCut(bed, K.sub(b, 0, 0.5), SEG, 8);
      const uw = K.sub(b, 0.55, 1); sew.range(0, uw);
      bits.update(t, { speed: 0.008, head: uw, amount: uw > 0.02 ? 1 : 0 });
      tubes.forEach((q) => K.revealTube(q.mesh, K.sub(b, q.a, q.b), q.n, 10));
      const ew = L.ease.out(K.sub(b, 0.5, 0.62)); well.visible = ew > 0; well.scale.set(1, Math.max(0.001, ew), 1); well.position.y = gL * (1 - ew);
      chegada.visible = b >= 0.9; outl.visible = b >= 0.99;
      // efluente tratado caindo no rio (se a boca estiver acima da lâmina)
      const fall = -0.35 - S.river, eon = b >= 1 && fall > 0.05;
      eflJet.visible = eflFoam.visible = eon;
      if (eon) { const r = 0.07 + 0.01 * Math.sin(t * 8); eflJet.scale.set(r, fall, r * 1.4); eflFoam.position.y = S.river + 0.03; const f = 0.22 + 0.04 * Math.sin(t * 6); eflFoam.scale.set(f, 1, f * 1.3); }
      // raio-x: a rede brilha um pouco para ser lida de cima; setas mostram o destino
      [C.pvc, tubeM, recM].forEach((m) => { m.emissive.copy(glowCol).multiplyScalar(0.8 * xr); });
      eflM.emissive.set(PAL.clear).multiplyScalar(0.4 * xr);
      const on = b >= 1 ? xr : 0;
      chT.update(t, { speed: 0.02, amount: on });
      ch3.forEach((c) => c.update(t, { speed: 0.12, amount: on }));
    }
  };
}
