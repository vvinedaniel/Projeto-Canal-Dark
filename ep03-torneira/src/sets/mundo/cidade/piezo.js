// GRAVIDADE E PRESSÃO (S.piezo, 80,2–84,6): linha tracejada luminosa horizontal na altura do NÍVEL DA ÁGUA NA TORRE
// (sai da taça, segue sobre a avenida e corre ao longo da Rua da Casa) e 4 MANÔMETROS (mostrador com ponteiro, sem
// números) em pontos da rede a cotas diferentes. O ponteiro mostra a altura de água acima do ponto (nível da torre −
// cota do tubo): quanto mais abaixo da linha, mais pressão. No ponto mais distante há uma pequena perda de carga (o
// ponteiro fica um pouco abaixo do que só a altura daria). Uma régua vertical tracejada liga cada ponto à linha.
// O ponteiro só sobe quando a água chega ao ponto (frente primária da rede) e acompanha o nível da torre subindo.
export function buildPiezo(ctx, parts) {
  const { L, THREE, Lo, K, shared } = ctx, { G, TM, Merge, vmat, canvasTex } = K;
  const root = new THREE.Group();
  const ZF = Lo.ZF, XL = 29.7, ZR = ZF - 0.7, NT = parts.buildNet, TW = parts.buildTower;
  const XC = Lo.P.mainFace[0];
  const lineM = L.glow('#8fe3ff', 2.2, { transparent: true, opacity: 1, depthWrite: false, toneMapped: false });
  const vertM = L.glow('#ffd23f', 1.8, { transparent: true, opacity: 1, depthWrite: false, toneMapped: false });

  /* ---------- linha do nível: polilinha (taça → x = XL → ao longo de z → ao longo de x na Rua da Casa) ---------- */
  const R = Lo.TOWER.tank.r, TX = Lo.TOWER.x, TZ = Lo.TOWER.z;
  const poly = [[TX + R + 0.05, TZ], [XL, TZ], [XL, ZR], [Lo.X0 + 1, ZR]];
  const segs = []; let tot = 0;
  for (let i = 0; i < poly.length - 1; i++) { const [ax, az] = poly[i], [bx, bz] = poly[i + 1], l = Math.hypot(bx - ax, bz - az); segs.push({ ax, az, bx, bz, l, s0: tot }); tot += l; }
  // a perna x+ da linha (Rua da Casa à direita do canto) também
  const extra = { ax: XL, az: ZR, bx: Lo.X1 - 1, bz: ZR, l: Lo.X1 - 1 - XL, s0: segs[2].s0 };
  const DASH = 1.2, GAP = 0.8, nD = Math.ceil((tot + extra.l) / (DASH + GAP)) + 4;
  const dashGeo = new THREE.BoxGeometry(DASH, 0.14, 0.14);
  const dashes = new THREE.InstancedMesh(dashGeo, lineM, nD); dashes.frustumCulled = false; dashes.renderOrder = 32; root.add(dashes);
  const _o = new THREE.Object3D();
  const along = (sg, s, y) => { const k = (s - sg.s0) / sg.l; return [L.lerp(sg.ax, sg.bx, k), y, L.lerp(sg.az, sg.bz, k), Math.atan2(-(sg.bz - sg.az), sg.bx - sg.ax)]; };

  /* ---------- manômetros ---------- */
  // mostrador: textura (fundo branco, arco verde→amarelo, marcas sem números)
  const face = canvasTex(512, (g, S) => {
    g.fillStyle = '#f7f8f4'; g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.fill();
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, cx = S / 2, r = S * 0.4;
    const grd = g.createLinearGradient(0, S, S, 0); grd.addColorStop(0, '#3fb36b'); grd.addColorStop(0.6, '#d8d24a'); grd.addColorStop(1, '#e8963a');
    g.strokeStyle = grd; g.lineWidth = S * 0.06; g.beginPath(); g.arc(cx, cx, r, a0, a1); g.stroke();
    g.strokeStyle = '#1d2630';
    for (let i = 0; i <= 20; i++) { const a = a0 + ((a1 - a0) * i) / 20, l = i % 5 ? 0.06 : 0.12; g.lineWidth = i % 5 ? 4 : 8; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - S * 0.05), cx + Math.sin(a) * (r - S * 0.05)); g.lineTo(cx + Math.cos(a) * (r - S * (0.05 + l)), cx + Math.sin(a) * (r - S * (0.05 + l))); g.stroke(); }
    g.fillStyle = '#1d2630'; g.font = `bold ${S * 0.07}px Arial`; g.textAlign = 'center'; g.fillText('PRESSÃO', cx, cx + S * 0.22);
  });
  face.wrapS = face.wrapT = THREE.ClampToEdgeWrapping;
  const faceM = L.mat('#ffffff', { map: face, roughness: 0.4, emissive: '#ffffff', emissiveMap: face, emissiveIntensity: 0.35 });
  const caseM = L.metal('#c9d0d6', { roughness: 0.25 }), needleM = L.glow('#e0242c', 0.9);
  const RD = 1.05;                                         // raio do mostrador (exagerado para ler no celular)
  const trunkS = (z) => { // distância ao longo do tronco até o ponto mais próximo de z
    if (!NT) return 0; const c = NT.trunk.curve, n = 200, p = new THREE.Vector3(); let best = 1e9, bu = 0;
    for (let i = 0; i <= n; i++) { c.getPointAt(i / n, p); const d = Math.abs(p.z - z); if (d < best) { best = d; bu = i / n; } }
    return bu * NT.D_T;
  };
  const trunkY = (z) => { if (!NT) return Lo.G(XC, z) - 1.2; const c = NT.trunk.curve, p = new THREE.Vector3(); let best = 1e9, y = 0; for (let i = 0; i <= 200; i++) { c.getPointAt(i / 200, p); const d = Math.abs(p.z - z); if (d < best) { best = d; y = p.y; } } return y; };
  const faceS = (x) => (shared.cityFaceS ? shared.cityFaceS(x) : 0);
  const SPEC = [
    { id: 'g1', x: XL, z: -20.6, pipeY: trunkY(-20.6), s: trunkS(-20.6), loss: 0 },
    { id: 'g2', x: XL, z: -11.0, pipeY: trunkY(-11.0), s: trunkS(-11.0), loss: 0 },
    { id: 'g3', x: 27.5, z: ZR, pipeY: Lo.NET.water.y, s: faceS(27.5), loss: 0.3 },
    { id: 'g4', x: -52.0, z: ZR, pipeY: Lo.NET.water.y, s: faceS(-52), loss: 3.2 }      // ponto distante: perda de carga
  ];
  const gauges = SPEC.map((sp) => {
    const gy = Lo.G(sp.x, sp.z) + (sp.z > 20 ? 0.15 : 0), postH = 2.3, g = new THREE.Group(); g.position.set(sp.x, gy, sp.z); root.add(g);
    const m = new Merge();
    m.add(G.cyl(0.06, 0.06, postH, 8), '#b9c2ca', TM(0, postH / 2, 0)).add(G.box(0.5, 0.12, 0.5), '#8d969e', TM(0, 0.06, 0));
    m.add(G.cyl(0.1, 0.1, 0.25, 10), '#b9c2ca', TM(0, postH + 0.05, 0)).add(G.box(0.14, 0.14, 0.14), '#c8333a', TM(0, postH * 0.45, 0.0));   // tomada com registro
    g.add(L.mesh(m.geo(), vmat({ roughness: 0.4, metalness: 0.5 })));
    const head = new THREE.Group(); head.position.y = postH + 0.2 + RD; g.add(head);
    const cs = L.mesh(new THREE.CylinderGeometry(RD + 0.1, RD + 0.1, 0.3, 32).rotateX(Math.PI / 2), caseM, 0, 0, -0.12); head.add(cs);
    head.add(L.mesh(new THREE.TorusGeometry(RD + 0.05, 0.07, 8, 40), caseM, 0, 0, 0.04));
    const fc = L.mesh(new THREE.CircleGeometry(RD, 40), faceM, 0, 0, 0.035, { cast: false }); head.add(fc);
    const ng = new THREE.Group(); ng.position.z = 0.07; head.add(ng);
    const nd = new THREE.Shape(); nd.moveTo(-0.05, -0.18); nd.lineTo(0.05, -0.18); nd.lineTo(0.018, RD * 0.82); nd.lineTo(-0.018, RD * 0.82); nd.closePath();
    ng.add(L.mesh(new THREE.ExtrudeGeometry(nd, { depth: 0.03, bevelEnabled: false }), needleM, 0, 0, 0, { cast: false }));
    head.add(L.mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 16).rotateX(Math.PI / 2), caseM, 0, 0, 0.11, { cast: false }));
    // régua vertical tracejada: do tubo até a linha do nível
    const nv = 40, vd = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 1, 0.1), vertM, nv); vd.frustumCulled = false; vd.renderOrder = 32; root.add(vd);
    // setas nas pontas da régua
    const tip = new THREE.ConeGeometry(0.22, 0.4, 10), tTop = L.mesh(tip, vertM, sp.x + 1.6, 0, sp.z, { cast: false }), tBot = L.mesh(tip, vertM, sp.x + 1.6, 0, sp.z, { cast: false }); tBot.rotation.z = Math.PI; root.add(tTop, tBot);
    L.shadows(g, true, false); fc.castShadow = false;
    return { ...sp, g, head, ng, vd, nv, tTop, tBot, gy, postH };
  });

  const A0 = -Math.PI * 0.75, A1 = Math.PI * 0.75, HMAX = 40;   // ponteiro: 0 → 40 m de coluna d'água
  function update(t, S, cam) {
    const a = S.piezo, vis = a > 0.005;
    root.visible = vis; if (!vis) return;
    const level = TW ? TW.level(S) : Lo.TOWER.water;
    const F = shared.cityFronts ? shared.cityFronts(S) : { f1: 1 }, d1 = F.f1 * (NT ? NT.D1 : 1);
    lineM.opacity = a; vertM.opacity = a;
    // linha tracejada: traços "marchando" a partir da torre
    const sh = (t * 1.6) % (DASH + GAP);
    let i = 0;
    const put = (sg) => { for (let s = sg.s0 - DASH + sh; s < sg.s0 + sg.l && i < nD; s += DASH + GAP) { const s0 = Math.max(sg.s0, s), s1 = Math.min(sg.s0 + sg.l, s + DASH); if (s1 <= s0) continue; const [x, y, z, ry] = along(sg, (s0 + s1) / 2, level); _o.position.set(x, y, z); _o.rotation.set(0, ry, 0); _o.scale.set((s1 - s0) / DASH, 1, 1); _o.updateMatrix(); dashes.setMatrixAt(i++, _o.matrix); } };
    segs.forEach(put); put(extra);
    for (; i < nD; i++) { _o.scale.setScalar(0); _o.updateMatrix(); dashes.setMatrixAt(i, _o.matrix); }
    dashes.instanceMatrix.needsUpdate = true;
    // manômetros
    for (const gq of gauges) {
      gq.g.scale.setScalar(Math.max(0.001, L.ease.back(L.clamp01(a * 1.3))));
      if (cam) gq.head.rotation.y = Math.atan2(cam.position.x - gq.g.position.x, cam.position.z - gq.g.position.z);
      const arrive = L.clamp01((d1 - gq.s) / 4), h = Math.max(0, level - gq.pipeY - gq.loss) * arrive;
      gq.ng.rotation.z = -(A0 + (A1 - A0) * L.clamp01(h / HMAX)) + 0 * Math.sin(t * 7) ;
      gq.ng.rotation.z += 0.015 * Math.sin(t * 11 + gq.x) * arrive;     // leve tremor do ponteiro com a água correndo
      // régua vertical (do tubo até o nível), ao lado do manômetro
      const y0 = gq.pipeY, y1 = level, L1 = y1 - y0, n = gq.nv, step = L1 / n;
      for (let k = 0; k < n; k++) { const on = k % 2 === 0 && arrive > 0.01; _o.position.set(gq.x + 1.6, y0 + step * (k + 0.5), gq.z); _o.rotation.set(0, 0, 0); _o.scale.set(on ? 1 : 0, on ? step * 0.9 : 0, on ? 1 : 0); _o.updateMatrix(); gq.vd.setMatrixAt(k, _o.matrix); }
      gq.vd.instanceMatrix.needsUpdate = true;
      gq.tTop.visible = gq.tBot.visible = arrive > 0.01;
      gq.tTop.position.y = y1 - 0.2; gq.tBot.position.y = y0 + 0.2;
    }
  }
  return { root, update };
}
