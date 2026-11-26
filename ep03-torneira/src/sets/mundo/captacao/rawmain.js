// ADUTORA DE ÁGUA BRUTA (ferro dúctil, Ø exagerado 0,7 m): de Lo.P.rawOut (parede da frente da casa de bombas) pelo pátio,
// sobe o talude no vão do muro de arrimo, segue pelo platô e mergulha no chão para entrar POR BAIXO na caixa de chegada
// da ETA (Lo.P.rawIn). Montada tubo a tubo (S.build.rawMain), sobre berços de concreto, com blocos de ancoragem nas curvas,
// bolsas (juntas) visíveis, ventosa no ponto alto e uma JANELA EM CORTE no pátio onde se vê a água bruta correndo.
// Frente d'água: S.water.raw (setas marrons por cima do tubo + enchimento na janela).
export function buildMain(ctx, K, R) {
  const { L, THREE, Lo, ghost, shared } = ctx, { MAT, M, bake, boxC, cylA } = K;
  const u = (k, a, b) => L.clamp01((k - a) / (b - a)), E = L.ease;
  const g = new THREE.Group(); g.name = 'captacao.rawMain'; R.root.add(g);
  const GY = (x, z) => (shared.groundY ? shared.groundY(x, z) : Lo.G(x, z));
  const PO = Lo.P.rawOut, PI_ = Lo.P.rawIn, r = 0.35, CL = r + 0.36; // CL = eixo acima do chão (berço de 0,36 m)
  const XC = 19.6, YP = 4.0 + CL;
  const climb = [-88.4, -86.4, -84.4, -82.4].map((z) => [XC, GY(XC, z) + CL, z]);
  const pts = [PO, [PO[0], PO[1], -89.6], [PO[0] + 1.2, YP, -89.6], [XC, YP, -89.6], ...climb, [XC, 14 + CL, -80.4], [PI_[0], 14 + CL, -80.4], [PI_[0], PI_[1] - 1.4, -80.4], [PI_[0], PI_[1] - 1.4, PI_[2]], PI_];
  const rads = pts.map((p, i) => (i === 1 ? 0.7 : i === 2 ? 0.6 : 0.9));
  const path = K.polyPath(pts, rads), LEN = path.getLength();
  R.mainPath = path;
  // arco (m) de cada vértice (para berços/ancoragens) e janela em corte no pátio (x 9…15)
  const N = 1400, arc = []; { const p = new THREE.Vector3(); for (let i = 0; i <= N; i++) { path.getPointAt(i / N, p); arc.push(p.clone()); } }
  const sAt = (pred) => { for (let i = 0; i <= N; i++) if (pred(arc[i])) return (i / N) * LEN; return 0; };
  const W0 = sAt((p) => p.x >= 9 && Math.abs(p.z + 89.6) < 0.01 && p.y < YP + 0.01), W1 = sAt((p) => p.x >= 15 && Math.abs(p.z + 89.6) < 0.01);
  const sClimb0 = sAt((p) => p.z > -89.0 && p.x > XC - 0.01), sTop = sAt((p) => p.y > 14 + CL - 0.01), sDive = sAt((p) => p.x > PI_[0] - 0.01 && p.y < 14 + CL - 0.3), sGround = sAt((p) => p.x > PI_[0] - 0.01 && p.y < 14.2);
  // peças (tubos de ~3 m), com a janela como uma peça exata
  const cuts = [0]; { let s = 0; const add = (to) => { const n = Math.max(1, Math.round((to - s) / 3.0)); for (let i = 1; i <= n; i++) cuts.push(s + ((to - s) * i) / n); s = to; }; add(W0); add(W1); add(LEN); }
  const NP = cuts.length - 1, winIdx = cuts.findIndex((c) => Math.abs(c - W0) < 1e-6);
  // geometria: todas as peças (menos a janela) numa malha só, revelada por drawRange; a peça "caindo" usa a mesma geometria
  const geos = [], ranges = []; let off = 0;
  for (let i = 0; i < NP; i++) {
    const a = cuts[i] / LEN, b = cuts[i + 1] / LEN, len = cuts[i + 1] - cuts[i];
    if (i === winIdx) { ranges.push([off, off]); continue; }
    const ge = new THREE.TubeGeometry(new K.SubCurve(path, a, b), Math.max(2, Math.ceil(len * 5)), r, 18, false);
    ge.deleteAttribute('uv'); geos.push(ge); ranges.push([off, off + ge.index.count]); off += ge.index.count;
  }
  const all = L.BGU.mergeGeometries(geos);
  const done = L.mesh(all, MAT.rawPipe); const cur = L.mesh(all, MAT.rawPipe); g.add(done, cur);
  // bolsas (juntas) nas emendas, berços, ancoragens
  const tmpP = new THREE.Vector3(), tmpT = new THREE.Vector3(), upV = new THREE.Vector3(0, 1, 0), _o = new THREE.Object3D();
  const bellIM = new THREE.InstancedMesh(new THREE.CylinderGeometry(r * 1.2, r * 1.2, 0.3, 22), MAT.rawPipeD, NP + 1); bellIM.castShadow = true; bellIM.frustumCulled = false; g.add(bellIM);
  const bells = cuts.map((s) => { path.getPointAt(s / LEN, tmpP); path.getTangentAt(s / LEN, tmpT); return { p: tmpP.clone(), q: new THREE.Quaternion().setFromUnitVectors(upV, tmpT.clone().normalize()) }; });
  const saddles = []; for (let s = 1.2; s < LEN; s += 2.3) {
    if ((s > W0 - 0.2 && s < W0 + 0.3) || (s > W1 - 0.3 && s < W1 + 0.2)) continue;
    path.getPointAt(s / LEN, tmpP); path.getTangentAt(s / LEN, tmpT);
    const gy = GY(tmpP.x, tmpP.z), bot = tmpP.y - r;
    if (bot - gy < 0.08 || bot - gy > 1.6 || tmpP.z < -90.4 || Math.abs(tmpT.y) > 0.97) continue;
    saddles.push({ s, x: tmpP.x, z: tmpP.z, y0: gy - 0.15, y1: tmpP.y - r * 0.55, yaw: Math.atan2(tmpT.x, tmpT.z) });
  }
  const sadGeo = new THREE.BoxGeometry(1.0, 1, 0.5); sadGeo.translate(0, 0.5, 0);
  const sadIM = new THREE.InstancedMesh(sadGeo, MAT.conc, saddles.length); sadIM.castShadow = sadIM.receiveShadow = true; sadIM.frustumCulled = false; g.add(sadIM);
  // ancoragens nas curvas (blocos de concreto que abraçam o tubo)
  const anchorsAt = [2, 3, 4, 5, 6, 7, 8, 9].map((i) => pts[i]);
  const anchors = anchorsAt.map((p) => { const gy = GY(p[0], p[2]); return { s: sAt((q) => q.distanceTo(new THREE.Vector3(...p)) < 1.0), x: p[0], z: p[2], y0: gy - 0.3, y1: p[1] + r * 0.6 }; });
  const ancIM = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1, 1.5).translate(0, 0.5, 0), MAT.concNew, anchors.length); ancIM.castShadow = ancIM.receiveShadow = true; ancIM.frustumCulled = false; g.add(ancIM);
  // suporte metálico sob a saída (sobre a vala da frente do poço)
  const stand = bake(L.put(new THREE.Group(), boxC(PO[0] - 0.55, PO[0] - 0.45, 4.0, PO[1] - r, -90.0, -89.9, MAT.galv), boxC(PO[0] + 0.45, PO[0] + 0.55, 4.0, PO[1] - r, -90.0, -89.9, MAT.galv), boxC(PO[0] - 0.6, PO[0] + 0.6, PO[1] - r - 0.12, PO[1] - r, -90.05, -89.85, MAT.galv), boxC(PO[0] - 0.7, PO[0] + 0.7, 3.95, 4.05, -90.25, -89.65, MAT.concNew)));
  g.add(stand);
  // ventosa no ponto alto (topo do talude, no platô) e colar de concreto onde o tubo entra no chão
  const VX = XC + 3.2, VY = 14 + CL, sV = sAt((p) => p.x >= VX && p.y > 14.5);
  const vent = bake(L.put(new THREE.Group(), cylA(0.09, 0.35, MAT.iron, VX, VY + r + 0.12, -80.4, 'y', 12), cylA(0.16, 0.06, MAT.iron, VX, VY + r + 0.3, -80.4, 'y', 14),
    L.lathe([[0.001, 0], [0.18, 0.02], [0.2, 0.16], [0.16, 0.3], [0.06, 0.36], [0.001, 0.37]], M('#2f6db0', { roughness: 0.4 }), 18).translateX(VX).translateY(VY + r + 0.33).translateZ(-80.4),
    cylA(0.04, 0.12, MAT.dark, VX, VY + r + 0.75, -80.4, 'y', 8), L.torus(0.12, 0.02, MAT.red, VX, VY + r + 0.15, -80.4 + 0.0).rotateX(Math.PI / 2)));
  g.add(vent);
  const collar = bake(L.put(new THREE.Group(), boxC(PI_[0] - 0.9, PI_[0] + 0.9, 13.85, 14.25, -81.3, -79.5, MAT.concNew)));
  g.add(collar);

  /* ---------- janela em corte (metade de cima do tubo removida: vemos a água bruta correndo, de cima) ---------- */
  const win = new THREE.Group(); g.add(win);
  const WX0 = 9, WX1 = 15, ri = r - 0.045;
  const halfPipe = (R0, flip) => { const pos = [], idx = [], n = 20; for (let i = 0; i <= n; i++) { const a = Math.PI + (i / n) * Math.PI; [WX0, WX1].forEach((x) => pos.push(x, YP + Math.sin(a) * R0, -89.6 + Math.cos(a) * R0)); }
    for (let i = 0; i < n; i++) { const q = i * 2; flip ? idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3) : idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); }
    const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setIndex(idx); ge.computeVertexNormals(); return ge; };
  win.add(L.mesh(halfPipe(r, false), MAT.rawPipe), L.mesh(halfPipe(ri, true), M('#4a4036', { roughness: 0.6, metalness: 0.25 })));
  [-1, 1].forEach((sd) => win.add(boxC(WX0, WX1, YP - 0.004, YP + 0.012, -89.6 + sd * ri - (sd > 0 ? 0 : 0.045), -89.6 + sd * ri + (sd > 0 ? 0.045 : 0), M('#efe6d6', { roughness: 0.7 }))));
  { const f = new THREE.Group(); [WX0, WX1].forEach((x) => K.flange(f, x, YP, -89.6, r * 0.97, 'x', MAT.rawPipeD, 10)); win.add(bake(f)); }
  const WLV = YP - 0.06, chord = Math.sqrt(ri * ri - (WLV - YP) ** 2) * 2;
  const wGeo = new THREE.PlaneGeometry(1, chord).rotateX(-Math.PI / 2).translate(0.5, 0, 0);
  const wSurf = L.mesh(wGeo, L.water(Lo.WATER.raw, 1.0), WX0, WLV, -89.6, { cast: false }); win.add(wSurf);
  const wIn = { range(a, b) { wSurf.scale.x = Math.max(0.001, (WX1 - WX0) * b); }, group: wSurf };
  const winSilt = new L.Flow(L.curve([[WX0 + 0.05, WLV + 0.005, -89.6], [WX1, WLV + 0.005, -89.6]]), { n: 40, size: 0.03, colors: ['#e8d6ae', '#c4a46c', '#f6eedb'], jitter: [0, 0, ri * 0.75], seed: 51 });
  win.add(winSilt.mesh);
  // setas marrons correndo por cima do tubo (frente d'água e fluxo contínuo)
  const chev = new L.Chevrons(new K.SubCurve(path, 0, sGround / LEN), { n: 44, size: 0.3, normal: [0, 1, 0], offset: [0, r + 0.16, 0], material: L.flat('#c08a4a', { toneMapped: false }) });
  chev.mesh.renderOrder = 30; g.add(chev.mesh);
  // planta (contorno do traçado)
  const planG = ghost.of(L.mesh(new THREE.TubeGeometry(path, 160, r, 6, false), MAT.rawPipe), 40); g.add(planG);

  function setInstances(k) {
    const piece = (i) => 0.02 + (i / NP) * 0.92, dur = 0.92 / NP;
    bells.forEach((b, i) => { const on = k >= piece(Math.max(0, i - 1)) + dur * 0.95 || (i === 0 && k > 0.02); _o.position.copy(b.p); _o.quaternion.copy(b.q); _o.scale.setScalar(on ? 1 : 0); _o.updateMatrix(); bellIM.setMatrixAt(i, _o.matrix); });
    const pieceOf = (s) => Math.min(NP - 1, cuts.findIndex((c, i) => s >= c && s <= cuts[i + 1]));
    saddles.forEach((q, i) => { const a = piece(pieceOf(q.s)) - dur * 0.5, f = E.out(u(k, a, a + dur * 0.6)); _o.position.set(q.x, q.y0, q.z); _o.rotation.set(0, q.yaw, 0); _o.quaternion.setFromEuler(_o.rotation); _o.scale.set(f > 0 ? 1 : 0, Math.max(0.001, (q.y1 - q.y0) * f), 1); _o.updateMatrix(); sadIM.setMatrixAt(i, _o.matrix); });
    anchors.forEach((q, i) => { const a = piece(pieceOf(q.s)) + dur, f = E.out(u(k, a, a + dur)); _o.position.set(q.x, q.y0, q.z); _o.rotation.set(0, 0, 0); _o.quaternion.identity(); _o.scale.set(f > 0 ? 1 : 0, Math.max(0.001, (q.y1 - q.y0) * f), f > 0 ? 1 : 0); _o.updateMatrix(); ancIM.setMatrixAt(i, _o.matrix); });
    bellIM.instanceMatrix.needsUpdate = sadIM.instanceMatrix.needsUpdate = ancIM.instanceMatrix.needsUpdate = true;
    // peças prontas + peça descendo
    const kk = (k - 0.02) / 0.92 * NP, nDone = Math.max(0, Math.min(NP, Math.floor(kk))), fr = kk - Math.floor(kk);
    done.geometry.setDrawRange(0, nDone > 0 ? ranges[nDone - 1][1] : 0); done.visible = nDone > 0;
    const moving = nDone < NP && k > 0.02 && nDone !== winIdx;
    cur.visible = moving; if (moving) cur.position.y = (1 - E.out(fr)) * 1.6;
    win.visible = nDone > winIdx || (nDone === winIdx && k > 0.02); win.position.y = nDone === winIdx ? (1 - E.out(fr)) * 1.6 : 0;
    return { nDone, fr, moving };
  }
  // a malha "cur" precisa de drawRange próprio: usa uma segunda geometria que compartilha os atributos
  const curGeo = new THREE.BufferGeometry(); curGeo.setAttribute('position', all.attributes.position); curGeo.setAttribute('normal', all.attributes.normal); curGeo.setIndex(all.index); cur.geometry = curGeo;

  function update(t, S) {
    const k = S.build.rawMain;
    g.visible = true;
    const st = setInstances(k);
    if (st.moving) { const [a, b] = ranges[st.nDone]; curGeo.setDrawRange(a, b - a); }
    bellIM.visible = sadIM.visible = ancIM.visible = k > 0.005;
    stand.visible = k > 0.01; vent.visible = k > 0.02 + 0.92 * (sV / LEN) + 0.03; collar.visible = k > 0.9;
    // água: frente avançando (0 na casa de bombas → 1 na chegada da ETA), depois fluxo contínuo
    const w = S.water.raw, sw = w * LEN;
    chev.update(t, { speed: 0.075 * LEN / sGround, head: Math.min(1, (sw + 0.3) / sGround), amount: w > 0.002 ? 1 : 0 });
    const lw = L.clamp01((sw - W0) / (W1 - W0));
    wIn.range(0, lw); wIn.group.visible = lw > 0.001 && win.visible;
    winSilt.update(t, { speed: 0.22, head: lw, amount: lw > 0.05 ? 1 : 0 }); winSilt.mesh.visible = lw > 0.05;
    planG.visible = S.ghost > 0.01 && k < 0.98;
    void sClimb0; void sDive; void sTop;
  }
  return { update, path, LEN };
}
