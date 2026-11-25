// GALERIA de drenagem em corte (eixo em z = ZF): aduelas pré-moldadas retangulares de montante (x −36) para
// jusante (x 16), juntas visíveis, mísulas, abertura do vertedor para o piscinão e entrada do recalque da bomba,
// ampliação (teto e parede de trás sobem/recuam, o fundo fica), água azul-acinzentada com folhas, setas e linha
// de capacidade. Construção: S.build.gallery 0–0.84 aduelas (o caminhão-guindaste é do crane.js), 0.8–1 ligações
// (inlets.js). Ampliação: S.build.enlarge, escalonada de montante para jusante.
export function buildGallery(ctx, K) {
  const { L, THREE, Lo, scene, shared } = ctx, { C, ZF } = K;
  const GA = Lo.GALLERY, W = GA.wall, HS = GA.small.h, HB = GA.big.h, WS = GA.small.w, WB = GA.big.w;
  const N = 20, LEN = (GA.x1 - GA.x0) / N, root = L.group(scene);
  const ads = [];
  const ligX = [...Lo.INLETS, ...Lo.INLETS_EXTRA];
  const D0 = WS / 2 + W; // profundidade (z) do fundo/teto na seção pequena

  // geometrias unitárias (frente em z = 0, corpo em z < 0)
  const floorGeo = (len) => { const g = new THREE.BoxGeometry(len, W, D0); g.translate(len / 2, -W / 2, -D0 / 2); return g; };
  const wallGeo = (len, holes) => {
    const s = new THREE.Shape([new THREE.Vector2(0, -W), new THREE.Vector2(len, -W), new THREE.Vector2(len, HS + W), new THREE.Vector2(0, HS + W)]);
    (holes || []).forEach((h) => s.holes.push(h));
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, -W); return g;
  };
  const roofGeo = (len, notches) => {
    const pts = [[0, 0]];
    notches.sort((a, b) => a - b).forEach((u) => { const r = Lo.INLET.pipeR; pts.push([u - r, 0], [u - r, W * 0.999], [u + r, W * 0.999], [u + r, 0]); });
    pts.push([len, 0], [len, W], [0, W]);
    const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.ExtrudeGeometry(s, { depth: D0, bevelEnabled: false }); g.translate(0, 0, -D0); return g;
  };
  // mísula (chanfro interno): canto na origem, catetos para +z e para ±y, ao longo de x de 0 a len
  const haunch = (len, sy, m) => { const s = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.16, 0), new THREE.Vector2(0, 0.16 * sy)]); const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(len, 0, 0); return L.mesh(g, m); };
  const darkCut = [C.concCut, C.conc];

  for (let i = 0; i < N; i++) {
    const xa = GA.x0 + i * LEN, xb = xa + LEN, ya = GA.invert(xa), yb = GA.invert(xb);
    const th = Math.atan2(yb - ya, LEN), len = Math.hypot(LEN, yb - ya), cs = Math.cos(th);
    const g = L.group(root, xa, ya, 0); g.rotation.z = th;
    const lx = (x) => (x - xa) / cs;
    // fundo
    const floor = L.mesh(floorGeo(len), K.faces(C.conc, C.concCut), 0, 0, ZF); g.add(floor);
    floor.add(L.box(0.035, 0.004, D0 - 0.02, C.joint, 0.02, 0.002, -D0 / 2 - 0.01, { cast: false }));
    floor.add(L.box(0.035, W - 0.02, 0.004, C.joint, 0.02, -W / 2, 0.002, { cast: false }));
    const fh = haunch(len, 1, C.conc); g.add(fh);
    // parede de trás (com aberturas na aduela do vertedor e na do recalque)
    const holes = [], plugs = [];
    const hasWeir = Lo.RES_INLET.x >= xa && Lo.RES_INLET.x < xb, hasPump = Lo.RES_PUMP.toX >= xa && Lo.RES_PUMP.toX < xb;
    if (hasWeir) { const u = lx(Lo.RES_INLET.x), y0 = Lo.RES_INLET.weir * HS, y1 = HS - 0.05; holes.push(new THREE.Path([new THREE.Vector2(u - 0.6, y0), new THREE.Vector2(u - 0.6, y1), new THREE.Vector2(u + 0.6, y1), new THREE.Vector2(u + 0.6, y0)])); plugs.push(L.box(1.2, y1 - y0, W, C.conc, u, (y0 + y1) / 2, -W / 2)); }
    if (hasPump) { const u = lx(Lo.RES_PUMP.toX), p = new THREE.Path(); p.absarc(u, 0.55, 0.22, 0, Math.PI * 2, true); holes.push(p); const pl = L.cyl(0.22, 0.22, W, C.conc, u, 0.55, -W / 2, 20); pl.rotation.x = Math.PI / 2; plugs.push(pl); }
    const back = L.mesh(wallGeo(len, holes), darkCut, 0, 0, ZF - WS / 2); g.add(back);
    plugs.forEach((p) => back.add(p));
    if (hasWeir) { // soleira do vertedor (aço) e moldura
      const u = lx(Lo.RES_INLET.x), y0 = Lo.RES_INLET.weir * HS;
      back.add(L.box(1.24, 0.04, W + 0.04, C.steel, u, y0 + 0.02, -W / 2));
    }
    if (hasPump) { const u = lx(Lo.RES_PUMP.toX), fl = L.torus(0.24, 0.035, C.steel, u, 0.55, 0.01); back.add(fl); }
    back.add(L.box(0.03, HS + 2 * W, 0.004, C.joint, 0.015, HS / 2, 0.002, { cast: false }));
    // teto (entalhe onde passa a ligação de cada boca de lobo) + plugues dos entalhes das bocas extras
    const notchU = ligX.filter((x) => x > xa + 0.25 && x < xb - 0.25).map(lx);
    const roof = L.mesh(roofGeo(len, notchU.slice()), darkCut, 0, HS, ZF); g.add(roof);
    roof.add(L.box(0.035, W - 0.02, 0.004, C.joint, 0.02, W / 2, 0.002, { cast: false }));
    const rh = haunch(len, -1, C.conc); g.add(rh);
    const extraPlugs = [];
    Lo.INLETS_EXTRA.forEach((x) => { if (x > xa + 0.25 && x < xb - 0.25) { const p = L.box(Lo.INLET.pipeR * 2, W, D0, K.faces(C.conc, C.concCut), lx(x), W / 2, -D0 / 2); roof.add(p); extraPlugs.push({ x, p }); } });
    // tampa de montante (início da galeria)
    let cap = null;
    if (i === 0) { cap = L.mesh(new THREE.BoxGeometry(W, HS + 2 * W, D0).translate(-W / 2, HS / 2, -D0 / 2), K.faces(C.conc, C.concCut), 0, 0, ZF); g.add(cap); }
    ads.push({ i, xa, xb, ya, yb, th, len, g, floor, back, roof, cap, fh, rh, plugs, extraPlugs, hasWeir, hasPump, base: new THREE.Vector3(xa, ya, 0), k: 0, e: 0 });
  }
  L.shadows(root);

  /* ---------- estado geométrico em função de x (lido pelos outros submódulos no mesmo quadro) ---------- */
  const adAt = (x) => ads[Math.min(N - 1, Math.max(0, Math.floor((x - GA.x0) / LEN)))];
  const floorY = (x) => { const a = adAt(x); return a.ya + (x - a.xa) * Math.tan(a.th); };
  const hAt = (x) => L.lerp(HS, HB, adAt(x).e), wAt = (x) => L.lerp(WS, WB, adAt(x).e);
  const roofIn = (x) => floorY(x) + hAt(x), roofOut = (x) => roofIn(x) + W;

  /* ---------- água ---------- */
  const NW = 208, xs = [], bot = [], top = [], zb = [];
  for (let i = 0; i <= NW; i++) xs.push(L.lerp(GA.x0 + 0.02, GA.x1 - 0.01, i / NW));
  const wb = K.cutWater(NW, C.wDrain); root.add(wb.mesh);
  // folhas boiando
  const leafGeo = new THREE.CircleGeometry(1, 6); leafGeo.scale(1, 0.5, 1);
  const leafCurve = L.curve(xs.filter((_, i) => i % 8 === 0).map((x) => [x, floorY(x), ZF - 0.32]), false, 0.2);
  const leaves = new L.Flow(leafCurve, { n: 70, size: 0.07, colors: ['#5f8f3a', '#7a9a3c', '#a8823c', '#6b5a2a', '#8fae4a'], jitter: [0.2, 0, 0.28], geo: leafGeo, material: L.mat('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), seed: 31 });
  root.add(leaves.mesh);
  // setas para jusante (e setas de refluxo quando a comporta fecha com a galeria cheia)
  const chevPts = xs.filter((_, i) => i % 6 === 0).map((x) => [x, floorY(x) + 0.45, ZF + 0.07]);
  const chev = new L.Chevrons(L.curve(chevPts, false, 0.2), { n: 26, size: 0.17, color: L.PAL.accent }); root.add(chev.mesh);
  const revPts = xs.filter((x, i) => i % 4 === 0 && x > 1).map((x) => [x, floorY(x) + 0.45, ZF + 0.07]).reverse();
  const rev = new L.Chevrons(L.curve(revPts, false, 0.2), { n: 8, size: 0.17, color: L.PAL.warn }); root.add(rev.mesh);
  // linha tracejada de capacidade (topo interno)
  const NDASH = 84, dash = new THREE.InstancedMesh(new THREE.BoxGeometry(0.34, 0.06, 0.02), L.flat(L.PAL.warn, { transparent: true, toneMapped: false, depthWrite: false }), NDASH);
  dash.frustumCulled = false; dash.renderOrder = 31; root.add(dash);
  const _o = new THREE.Object3D();

  /* ---------- ligação para os outros módulos ---------- */
  const api = { ads, N, LEN, floorY, hAt, wAt, roofIn, roofOut, adAt, level: 0 };
  shared.gallery = {
    invert: floorY, h: hAt, w: wAt, roofIn, roofOut, z: ZF,
    weir: { x: Lo.RES_INLET.x, width: 1.2, z: () => ZF - wAt(Lo.RES_INLET.x) / 2 - W, sill: () => floorY(Lo.RES_INLET.x) + Lo.RES_INLET.weir * hAt(Lo.RES_INLET.x), top: () => roofIn(Lo.RES_INLET.x) - 0.05 },
    pump: { x: Lo.RES_PUMP.toX, r: 0.22, z: () => ZF - wAt(Lo.RES_PUMP.toX) / 2 - W, y: () => floorY(Lo.RES_PUMP.toX) + (-W + (0.55 + W) * (hAt(Lo.RES_PUMP.toX) + 2 * W) / (HS + 2 * W)) }
  };

  // queda d'água do vertedor (lâmina saindo pela abertura para o fundo, −z) e jato do recalque da bomba
  const weirSheet = L.mesh(new THREE.PlaneGeometry(1.14, 1, 1, 8), C.wDrainFall, 0, 0, 0, { cast: false });
  { const p = weirSheet.geometry.attributes.position; for (let j = 0; j < p.count; j++) { const v = p.getY(j) + 0.5; p.setXYZ(j, p.getX(j), -0.45 * v * v, -0.55 * v); } weirSheet.geometry.computeVertexNormals(); }
  weirSheet.renderOrder = 7; root.add(weirSheet);
  const jetCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.02, 0.45), new THREE.Vector3(0, -0.5, 0.62));
  const jet = L.mesh(new THREE.TubeGeometry(jetCurve, 16, 1, 10), C.wDrainFall, 0, 0, 0, { cast: false }); jet.renderOrder = 7; root.add(jet);

  api.update = (t, S) => {
    const B = S.build, g = B.gallery, enl = B.enlarge, ease = L.ease;
    // aduelas: cada uma desce na frente do corte (pendurada no guindaste) e depois encaixa para trás
    ads.forEach((a) => {
      a.k = L.clamp01((g / 0.78 - a.i / N) * N / 2.4);
      a.e = L.clamp01((enl - 0.45 * (a.i / (N - 1))) / 0.55);
      const k = a.k; a.g.visible = k > 0;
      if (!a.g.visible) return;
      let dy = 0, dz = 0, sw = 0;
      if (k < 0.6) { const u = k / 0.6; dy = 5.0 * (1 - ease.out(u)); dz = 2.7; sw = Math.sin(t * 3.1 + a.i) * 0.04 * (1 - u); }
      else { const v = (k - 0.6) / 0.4; dz = 2.7 * (1 - ease.io(v)); }
      a.g.position.set(a.base.x, a.base.y + dy, dz); a.g.rotation.set(sw * 0.4, sw, a.th);
      // ampliação: teto sobe, parede de trás recua e cresce, fundo/teto ficam mais profundos
      const h = L.lerp(HS, HB, a.e), w = L.lerp(WS, WB, a.e), d = w / 2 + W, sz = d / D0, sy = (h + 2 * W) / (HS + 2 * W);
      a.floor.scale.z = sz; a.roof.scale.z = sz; a.roof.position.y = h;
      a.back.position.z = ZF - w / 2; a.back.scale.y = sy; a.back.position.y = -W + W * sy; // pivô no fundo externo
      a.fh.position.set(0, 0, ZF - w / 2); a.rh.position.set(0, h, ZF - w / 2);
      if (a.cap) { a.cap.scale.set(1, sy, sz); a.cap.position.y = -W + W * sy; }
      // plugues das aberturas do vertedor / recalque: somem quando o piscinão é ligado (reservoir ≥ 0,7)
      const op = K.sub(B.reservoir, 0.62, 0.72);
      a.plugs.forEach((p) => { p.visible = op < 1; p.position.z = -W / 2 - op * 0.5; });
      a.extraPlugs.forEach(({ x, p }) => { p.visible = !(shared._ligOn && shared._ligOn(x, S)); });
    });
    // água
    const lvl = Math.min(1, Math.max(0, S.gal)), full = S.gal >= 0.999;
    for (let i = 0; i <= NW; i++) {
      const x = xs[i], a = adAt(x), fy = floorY(x), h = L.lerp(HS, HB, a.e);
      bot[i] = fy + 0.004; top[i] = a.k >= 1 ? fy + Math.min(h - 0.006, lvl * h) : fy; zb[i] = ZF - L.lerp(WS, WB, a.e) / 2 + 0.006;
    }
    wb.update(xs, bot, top, zb);
    const hMid = hAt(0); api.level = lvl;
    leaves.mesh.position.y = lvl * hMid + 0.012;
    leaves.update(t, { speed: 0.004 + 0.022 * S.flow, amount: lvl > 0.04 && !full ? 1 : 0, spin: 0 });
    // setas
    const built = g > 0.98 ? 1 : 0, xr = L.clamp01(S.xray / 0.7);
    const flowVis = L.clamp01((S.gal - 0.03) * 5);
    chev.offset.y = flowVis > 0 ? Math.max(0.12, lvl * hMid * 0.55) - 0.45 : 0;
    chev.update(t, { speed: 0.012 + 0.05 * S.flow, amount: built * Math.max(xr, flowVis * 0.95) * (1 - 0.92 * S.flap) });
    const revA = built * (S.gal > 0.9 ? L.sstep(0.45, 0.9, S.flap) : 0);
    rev.offset.y = lvl * hMid * 0.5 - 0.45;
    rev.update(t, { speed: 0.035, amount: revA });
    // capacidade
    const cap = S.capacity * built;
    dash.visible = cap > 0.01; dash.material.opacity = cap;
    if (dash.visible) for (let i = 0; i < NDASH; i++) {
      const x = GA.x0 + 0.35 + i * ((GA.x1 - GA.x0 - 0.7) / (NDASH - 1)), a = adAt(x);
      _o.position.set(x, roofIn(x) - 0.04, ZF + 0.016); _o.rotation.set(0, 0, a.th); _o.updateMatrix(); dash.setMatrixAt(i, _o.matrix);
    }
    dash.instanceMatrix.needsUpdate = true;
    // vertedor lateral → piscinão: a água passa por cima da soleira e cai para dentro da abertura
    const wx = Lo.RES_INLET.x, sill = floorY(wx) + Lo.RES_INLET.weir * hAt(wx), over = Math.max(0, lvl * hAt(wx) - Lo.RES_INLET.weir * hAt(wx));
    const wk = S.weir * L.clamp01(over / 0.03) * (B.reservoir > 0.7 ? 1 : 0);
    weirSheet.visible = wk > 0.01;
    if (weirSheet.visible) { weirSheet.position.set(wx, sill + Math.min(0.12, over) * 0.6 + 0.02, ZF - wAt(wx) / 2 - 0.02); weirSheet.scale.set(1, 0.4 + 0.6 * wk, 1); weirSheet.material.opacity = 0.62; }
    // recalque da bomba devolvendo à galeria
    const pk = S.pump * (B.reservoir > 0.7 ? 1 : 0), px = Lo.RES_PUMP.toX;
    jet.visible = pk > 0.01;
    if (jet.visible) { const py = shared.gallery.pump.y(), r = 0.4 + 0.6 * pk; jet.position.set(px, py, ZF - wAt(px) / 2 - W * 0.2); jet.scale.set(r, Math.max(0.3, (py - (floorY(px) + lvl * hAt(px))) / 0.5), r); }
  };
  // o jato usa raio 1 na geometria: refaz com raio real
  jet.geometry.dispose(); jet.geometry = new THREE.TubeGeometry(jetCurve, 16, 0.1, 10);
  return api;
}
