// CAIXA-D'ÁGUA de 1000 L (polietileno azul, cilíndrica, levemente cônica) sobre tábuas na laje do sótão, em corte no
// plano z = tank.z. Peças (CIENCIA §4f, NBR 5626/14534): TAMPA, ENTRADA com TORNEIRA DE BOIA (corpo em corte: bocal/sede,
// pistão com VEDAÇÃO de borracha, saída para baixo; alavanca com PIVÔ, haste e BALÃO), entrada ACIMA do EXTRAVASOR (ladrão),
// ladrão saindo para fora da casa, saída no fundo para a casa (por gravidade). A água sobe (S.water.tank), a boia sobe com
// ela e empurra o pistão contra a sede: o jato de entrada diminui até parar. No fim (S.floatFinal) a casa consome, o
// nível baixa um pouco, a boia desce, a entrada abre e repõe.
export function buildTank(ctx, K, H) {
  const { L, THREE, Lo, ghost } = ctx, { G, TM, Merge, vmat, revolve, revolveCaps } = K;
  const T = Lo.HOUSE.tank, TX = T.x, TZ = T.z, Y0 = T.y0, BH = 1.0, root = new THREE.Group();
  const rO = (y) => 0.62 + 0.13 * L.clamp01((y - Y0) / BH), WT = 0.026, rI = (y) => rO(y) - WT;
  const YMAX = 4.12, YOV = 4.2, YIN = T.inletY;                 // nível máximo (boia fecha) < ladrão < entrada
  const blue = L.mat('#2c6fb7', { roughness: 0.42, side: THREE.DoubleSide }), blueCut = L.mat('#7fb0e0', { roughness: 0.7, side: THREE.DoubleSide });
  const tank = new THREE.Group(); tank.position.set(TX, 0, TZ); root.add(tank);
  const body = new THREE.Group(); tank.add(body);
  // parede com nervuras (anéis) — polígono da seção da parede
  { const out = [], inn = [], ribs = [0.18, 0.42, 0.66];
    for (let i = 0; i <= 24; i++) { const y = Y0 + 0.03 + (BH - 0.03) * i / 24; let r = rO(y); ribs.forEach((rb) => { const d = Math.abs((y - Y0) / BH - rb); if (d < 0.035) r += 0.018 * (1 - d / 0.035); }); out.push([r, y]); }
    for (let i = 24; i >= 0; i--) { const y = Y0 + 0.03 + (BH - 0.03) * i / 24; inn.push([rI(y), y]); }
    const poly = [[0.0, Y0], [rO(Y0) - 0.02, Y0], [rO(Y0), Y0 + 0.03], ...out, [rO(Y0 + BH) + 0.035, Y0 + BH], [rO(Y0 + BH) + 0.035, Y0 + BH + 0.03], [rI(Y0 + BH) - 0.01, Y0 + BH + 0.03], ...inn.slice(0, -1), [rI(Y0), Y0 + WT], [0.0, Y0 + WT]];
    body.add(L.mesh(revolve(poly, 56, 'back'), blue)); body.add(L.mesh(revolveCaps(poly), blueCut, 0, 0, 0.001, { cast: false })); }
  // tampa (domo com nervuras radiais), também em corte
  const lid = new THREE.Group(); tank.add(lid);
  { const yb = Y0 + BH + 0.03, R0 = rO(Y0 + BH) + 0.05;
    const poly = [[0, yb + 0.17], [0.35, yb + 0.14], [R0 - 0.08, yb + 0.06], [R0, yb + 0.02], [R0, yb - 0.05], [R0 - 0.02, yb - 0.05], [R0 - 0.02, yb], [R0 - 0.1, yb + 0.035], [0.35, yb + 0.115], [0, yb + 0.145]];
    lid.add(L.mesh(revolve(poly, 56, 'back'), blue)); lid.add(L.mesh(revolveCaps(poly), blueCut, 0, 0, 0.001, { cast: false }));
    const rib = new Merge(); for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + (i + 0.5) / 8 * Math.PI; rib.add(G.box(0.03, 0.03, R0 - 0.2), '#2a64a6', TM(Math.sin(a) * (R0 / 2 + 0.05), yb + 0.105 - 0.04 * 0.5, Math.cos(a) * (R0 / 2 + 0.05), 0, a, 0)); }
    lid.add(rib.mesh(vmat({ roughness: 0.45 }))); }
  // tábuas de apoio (estrado) sobre a laje
  const base = new Merge(); for (let i = 0; i < 6; i++) base.add(G.box(1.7, Y0 - H.ATT, 0.26), i % 2 ? '#a8744e' : '#b5835a', TM(TX, (H.ATT + Y0) / 2, TZ - 0.78 + i * 0.31));
  const baseMesh = base.mesh(vmat({ roughness: 0.85 })); root.add(baseMesh);

  /* ---------- adaptadores (flanges) na parede ---------- */
  const flange = new Merge();
  const xw = (y) => TX + rO(y) - 0.012;
  [[xw(YIN), YIN, 1], [TX - rO(Y0 + 0.11) + 0.012, Y0 + 0.11, -1]].forEach(([x, y, s]) => { flange.add(G.cyl(0.06, 0.06, 0.012, 20, false, Math.PI / 2, Math.PI), '#e8e2d2', TM(x - s * 0.03, y, TZ, 0, 0, Math.PI / 2)).add(G.cyl(0.06, 0.06, 0.012, 20, false, Math.PI / 2, Math.PI), '#e8e2d2', TM(x + s * 0.02, y, TZ, 0, 0, Math.PI / 2)).add(G.cyl(0.045, 0.045, 0.07, 6, false, Math.PI / 2, Math.PI), '#d9d2bf', TM(x - s * 0.06, y, TZ, 0, 0, Math.PI / 2)); });
  // ladrão: flange na parede de trás e tubo saindo pela empena até fora da casa (PVC, Ø maior que a entrada)
  const OVZ = TZ - 0.32, ovx = TX + Math.sqrt(Math.pow(rO(YOV), 2) - Math.pow(TZ - OVZ, 2));
  flange.add(G.cyl(0.07, 0.07, 0.014, 20), '#e8e2d2', TM(ovx - 0.01, YOV, OVZ, 0, 0, Math.PI / 2));
  const ovPts = [[ovx - 0.01, YOV, OVZ], [Lo.HOUSE.x1 + 0.25, YOV, OVZ], [Lo.HOUSE.x1 + 0.33, YOV - 0.08, OVZ], [Lo.HOUSE.x1 + 0.33, 3.05, OVZ]];
  const ovTube = L.tube(L.curve(ovPts, false, 0.0), 0.045, L.mat(Lo.PIPE.pvcHouse, { roughness: 0.5 }), 40, 12);
  ovTube.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(K.fillet(ovPts, 0.1), false, 'catmullrom', 0), 60, 0.045, 12, false);
  root.add(ovTube);
  root.add(L.mesh(G.cyl(0.052, 0.052, 0.04, 14), L.mat('#a66a35'), Lo.HOUSE.x1 + 0.33, 3.05, OVZ));
  const flangeMesh = flange.mesh(vmat({ roughness: 0.5 })); root.add(flangeMesh);

  /* ---------- torneira de boia (em corte) ---------- */
  const fv = new THREE.Group(); fv.position.set(xw(YIN) - 0.06, YIN, TZ); root.add(fv);   // origem: fim do adaptador
  const VB = '#e6dfcf', brassC = '#c99a3c';
  const valveMat = L.mat(VB, { roughness: 0.4, side: THREE.DoubleSide }), valveCut = L.mat('#f6f0e0', { roughness: 0.6, side: THREE.DoubleSide });
  const VS = 1.7, vb = new THREE.Group(); vb.scale.setScalar(VS); fv.add(vb);   // corpo da boia exagerado para leitura
  // corpo horizontal (eixo x): metade de trás + faces de corte. Seção: canal de entrada → sede (orifício) → câmara do pistão
  const SEATX = -0.03, LB = 0.16;
  { const prof = [[0.016, 0], [0.034, 0], [0.034, -LB], [0.026, -LB], [0.026, -0.05], [0.0075, SEATX - 0.002], [0.0075, SEATX + 0.006], [0.016, 0.0]];
    // perfil (r, t) com t ao longo de −x; gira para o eixo x
    const g = revolve(prof.map(([r, t]) => [r, t]), 32, 'back'); g.rotateZ(Math.PI / 2); vb.add(L.mesh(g, valveMat));
    const caps = revolveCaps(prof); caps.rotateZ(Math.PI / 2); vb.add(L.mesh(caps, valveCut, 0, 0, 0.001, { cast: false }));
    // bico de saída (para baixo) na câmara do pistão
    const sp = [[0.008, 0], [0.013, 0], [0.013, -0.07], [0.008, -0.07]]; const gs = revolve(sp, 20, 'back'); gs.translate(0, -0.026, 0); vb.add(L.mesh(gs, valveMat, -0.075, 0, 0));
    const cs = revolveCaps(sp); cs.translate(-0.075, -0.026, 0.001); vb.add(L.mesh(cs, valveCut, 0, 0, 0, { cast: false }));
    // porca/rosca de fixação na parede
    vb.add(L.mesh(G.cyl(0.05, 0.05, 0.03, 6, false, Math.PI / 2, Math.PI), L.mat('#d9d2bf'), 0.03, 0, 0).rotateZ(Math.PI / 2));
    // anel da sede (destacado)
    vb.add(L.mesh(G.torus(0.0095, 0.0025, 6, 20, Math.PI), L.mat('#b8843a', { metalness: 0.6, roughness: 0.35 }), SEATX + 0.002, 0, 0).rotateY(Math.PI / 2).rotateZ(0));
  }
  // pistão (êmbolo) com vedação de borracha — desliza em x
  const piston = new THREE.Group(); vb.add(piston);
  { const pm = new Merge(); pm.add(G.cyl(0.021, 0.021, 0.06, 20, false, Math.PI / 2, Math.PI), '#d4cbb5', TM(-0.03, 0, 0, 0, 0, Math.PI / 2)); pm.add(G.cyl(0.016, 0.016, 0.008, 20, false, Math.PI / 2, Math.PI), '#1b1d20', TM(0.004, 0, 0, 0, 0, Math.PI / 2));
    pm.add(G.box(0.03, 0.03, 0.001), '#ece4d0', TM(-0.03, 0, 0)); pm.add(G.box(0.008, 0.032, 0.001), '#2a2d31', TM(0.004, 0, 0.0005));
    piston.add(pm.mesh(vmat({ roughness: 0.5, side: THREE.DoubleSide }))); }
  // alavanca: pivô no fim do corpo; braço curto (empurra o pistão) e haste longa até o balão
  const PIV = new THREE.Vector3((-LB - 0.012) * VS, -0.035 * VS, 0.0), ARM = 0.52, SHORT = 0.05;
  const lever = new THREE.Group(); lever.position.copy(PIV); fv.add(lever);
  { const lm = new Merge(); lm.add(G.box(0.012, SHORT + 0.01, 0.012), brassC, TM(0, SHORT / 2, 0)); lm.add(G.cyl(0.006, 0.006, ARM, 10), '#c9d0d6', TM(-ARM / 2, 0, 0, 0, 0, Math.PI / 2));
    lm.add(G.cyl(0.009, 0.009, 0.03, 12), '#9aa3aa', TM(0, 0, 0, Math.PI / 2)); lm.add(G.box(0.04, 0.02, 0.02), brassC, TM(-0.02, 0, 0));
    lm.add(G.cyl(0.012, 0.012, 0.03, 12), '#d8d0bd', TM(-ARM + 0.01, 0, 0, 0, 0, Math.PI / 2));
    lever.add(lm.mesh(vmat({ roughness: 0.35, metalness: 0.5 })));
    const ball = L.mesh(G.sph(0.1, 28, 18), L.glossy('#f2f0ea', { roughness: 0.3 }), -ARM - 0.085, 0, 0); ball.scale.set(1.15, 0.9, 1.0); lever.add(ball);
    lever.add(L.mesh(G.torus(0.1, 0.006, 6, 30), L.mat('#d9d4c7'), -ARM - 0.085, 0, 0).rotateY(Math.PI / 2)); }
  // garfo (suporte) do pivô
  vb.add(L.mesh(G.box(0.03, 0.05, 0.004), L.mat(VB), -LB - 0.005, -0.02, -0.012));

  /* ---------- água ---------- */
  const SEG = 40, wm = L.water(Lo.WATER.treated, 0.82, { side: THREE.DoubleSide, depthWrite: false });
  const wLathe = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0.6, 1), new THREE.Vector2(0, 1)], SEG, Math.PI / 2, Math.PI);
  const wFront = new THREE.BufferGeometry(); wFront.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3)); wFront.setIndex([0, 1, 2, 0, 2, 3]);
  const wl = L.mesh(wLathe, wm, 0, 0, 0, { cast: false }), wf = L.mesh(wFront, wm, 0, 0, 0.002, { cast: false }); wl.renderOrder = wf.renderOrder = 3; tank.add(wl, wf);
  const setWater = (yw) => {
    const yb = Y0 + WT + 0.002, rb = rI(yb) - 0.003, rt = rI(yw) - 0.003, prof = [[0, yb], [rb, yb], [rt, yw], [0, yw]], pa = wLathe.attributes.position;
    for (let i = 0; i <= SEG; i++) { const ph = Math.PI / 2 + Math.PI * i / SEG, s = Math.sin(ph), c = Math.cos(ph); for (let j = 0; j < 4; j++) pa.setXYZ(i * 4 + j, prof[j][0] * s, prof[j][1], prof[j][0] * c); }
    pa.needsUpdate = true; wLathe.computeVertexNormals(); wLathe.computeBoundingSphere();
    const fp = wFront.attributes.position; fp.setXYZ(0, -rb, yb, 0); fp.setXYZ(1, rb, yb, 0); fp.setXYZ(2, rt, yw, 0); fp.setXYZ(3, -rt, yw, 0); fp.needsUpdate = true; wFront.computeVertexNormals(); wFront.computeBoundingSphere();
  };
  // jato de entrada (da boca de saída da boia até a superfície) + respingos
  const SPX = fv.position.x - 0.075 * VS, SPY = YIN - 0.096 * VS;
  const jetGeo = new THREE.CylinderGeometry(0.008, 0.011, 1, 12, 1, true); jetGeo.translate(0, -0.5, 0);
  const jet = L.mesh(jetGeo, L.water('#d6f1ff', 0.7, { depthWrite: false }), SPX, SPY, TZ - 0.0, { cast: false }); root.add(jet);
  const jetFlow = new L.Flow(L.curve([[SPX, SPY, TZ], [SPX, Y0 + 0.2, TZ]]), { n: 30, size: 0.006, colors: ['#ffffff', '#d9f3ff'], jitter: [0.006, 0, 0.006], material: L.flat(0xffffff) }); root.add(jetFlow.mesh);
  const splashN = 26, splash = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.flat('#e6f7ff'), splashN); splash.frustumCulled = false; root.add(splash);
  const sd = Array.from({ length: splashN }, (_, i) => { const r = L.rng(90 + i); return { a: r() * Math.PI * 2, v: 0.5 + r() * 0.6, up: 0.6 + r() * 0.8, ph: r(), s: 0.004 + r() * 0.006 }; });
  const ring = L.mesh(new THREE.RingGeometry(0.02, 0.03, 32), L.flat('#ffffff', { transparent: true, depthWrite: false }), SPX, 0, TZ, { cast: false }); ring.rotation.x = -Math.PI / 2; root.add(ring);

  L.shadows(root); [jet, ring, wl, wf].forEach((o) => { o.castShadow = false; }); splash.castShadow = false;

  /* ---------- planta ---------- */
  const gsrc = new THREE.Group(); { const b = L.mesh(revolve([[0, Y0], [rO(Y0), Y0], [rO(Y0 + BH), Y0 + BH], [rO(Y0 + BH) + 0.05, Y0 + BH + 0.05], [0.35, Y0 + BH + 0.17], [0, Y0 + BH + 0.2]], 20, 'full'), blue, TX, 0, TZ); gsrc.add(b); }
  const plan = ghost.of(gsrc, 20); root.add(plan);

  const sinC = (YIN + PIV.y - (YMAX + 0.03)) / ARM, sinO = 0.72;
  const _d = new THREE.Object3D();
  function update(t, S) {
    const P = S.present, k = P ? 1 : S.build.tank;
    plan.visible = !P && k < 0.02;
    const show = k > 0.001;
    root.children.forEach((c) => { if (c !== plan) c.visible = show; });
    if (!show) return { k };
    const e = (a, b) => L.ease.io(L.clamp01((k - a) / (b - a)));
    const kb = L.ease.back(L.clamp01(k / 0.12)); baseMesh.scale.set(1, Math.max(1e-3, kb), 1);
    const kt = e(0.08, 0.5); tank.position.y = 2.6 * (1 - kt); tank.rotation.z = 0.08 * Math.sin(kt * 7) * (1 - kt);
    const kv = L.ease.back(L.clamp01((k - 0.45) / 0.2)); fv.visible = kv > 0.01; fv.scale.setScalar(Math.max(1e-3, kv));
    const kl = e(0.6, 0.82); lid.position.y = 1.2 * (1 - kl); lid.visible = kl > 0.001;
    const ko = e(0.75, 1); ovTube.visible = ko > 0.02; ovTube.scale.set(1, 1, 1); flangeMesh.visible = k > 0.5;
    // nível e boia
    const W = S.water, late = t > 100.6;
    let level;
    if (P) level = 1; else level = W.tank;
    let yw = L.lerp(Y0 + WT + 0.002, YMAX, level);
    if (!P && late) yw = YMAX - (1 - S.floatFinal) * 0.11;
    const hasW = P || (late ? true : W.tank > 0.002);
    wl.visible = wf.visible = hasW && kt > 0.99; if (hasW) setWater(Math.max(yw, Y0 + WT + 0.01));
    // ângulo da alavanca: balão apoiado na água (meio submerso) ou pendurado no batente
    const sinP = L.clamp01(Math.min(sinO, Math.max(sinC, (YIN + PIV.y - (yw + 0.03)) / ARM)));
    const phi = Math.asin(sinP);
    lever.rotation.z = phi;
    const gap = (sinP - sinC) / (sinO - sinC);                // 0 = fechada · 1 = toda aberta
    piston.position.x = -0.05 * (sinP - sinC) * 0.9;  // o braço curto afasta o pistão da sede quando a boia desce
    // vazão de entrada: pela boia e pelo estado (water.up chegou; float fecha)
    let inflow = 0;
    if (!P) { if (late) inflow = L.clamp01((1 - S.floatFinal) / 0.3) * L.clamp01(gap * 3); else if (W.up >= 0.999) inflow = Math.min(1 - W.float, L.clamp01(gap * 3)); }
    jet.visible = inflow > 0.01; jet.scale.set(0.4 + 0.6 * inflow, Math.max(0.01, SPY - yw), 0.4 + 0.6 * inflow);
    jetFlow.update(t, { speed: 2.2, amount: inflow, head: L.clamp01((SPY - yw) / (SPY - Y0 - 0.2)) });
    ring.visible = inflow > 0.01; ring.position.y = yw + 0.004; { const rk = (t * 2.2) % 1; ring.scale.setScalar(1 + rk * 3); ring.material.opacity = (1 - rk) * 0.6 * inflow; }
    for (let i = 0; i < splashN; i++) { const d = sd[i], u = (t * 2.4 + d.ph) % 1, on = inflow > 0.05; _d.position.set(SPX + Math.cos(d.a) * d.v * 0.12 * u, yw + d.up * 0.14 * u - 0.5 * u * u * 0.3, TZ - Math.abs(Math.sin(d.a)) * d.v * 0.12 * u); _d.scale.setScalar(on ? d.s * (1 - u) * inflow : 0); _d.updateMatrix(); splash.setMatrixAt(i, _d.matrix); }
    splash.instanceMatrix.needsUpdate = true;
    return { k, inflow, yw };
  }
  return { root, update };
}
