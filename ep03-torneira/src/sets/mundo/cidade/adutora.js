// ADUTORA DE ÁGUA TRATADA: de P.liftOut (recalque da elevatória, parede da frente) até P.towerIn (pé do tubo de entrada
// da torre). Ferro fundido dúctil pintado de azul (Lo.PIPE.treated), tubos de 3 m com flanges, apoiada em berços de
// concreto pelo platô (aparente), blocos de ancoragem nas curvas e trecho final enterrado na encosta até a torre.
// Obra: S.build.treatedMain (tubo a tubo, da elevatória para a torre). Água: S.water.treated (frente d'água = linha
// luminosa azul sobre o tubo + setas). Planta (ghost) do traçado antes da obra.
export function buildMain(ctx) {
  const { L, THREE, Lo, K, ghost } = ctx, { G, TM, Merge, vmat, Revealer } = K;
  const P = Lo.P, root = new THREE.Group();
  const R = 0.34, YP = Lo.PLATEAU_Y + 0.55;
  const a = P.liftOut, b = P.towerIn;
  // traçado (polilinha) — curvas arredondadas em cada vértice
  const poly = [
    [a[0], a[1], a[2]], [a[0], a[1], a[2] + 1.1], [a[0], YP, a[2] + 1.1],
    [a[0], YP, -33.5], [b[0] + 1.5, Lo.G(b[0] + 1.5, -29.2) - 0.25, -29.2], [b[0], Lo.G(b[0], -27.4) - 0.9, -27.4], [b[0], b[1], b[2] - 0.6], [b[0], b[1], b[2]]
  ].map((p) => new THREE.Vector3(...p));
  const path = new THREE.CurvePath();
  { const FIL = 0.7; let cur = poly[0].clone();
    for (let i = 1; i < poly.length - 1; i++) {
      const p = poly[i], din = p.clone().sub(poly[i - 1]).normalize(), dout = poly[i + 1].clone().sub(p).normalize();
      const r = Math.min(FIL, p.distanceTo(poly[i - 1]) * 0.45, p.distanceTo(poly[i + 1]) * 0.45);
      const p0 = p.clone().addScaledVector(din, -r), p1 = p.clone().addScaledVector(dout, r);
      path.add(new THREE.LineCurve3(cur, p0)); path.add(new THREE.QuadraticBezierCurve3(p0, p.clone(), p1)); cur = p1;
    }
    path.add(new THREE.LineCurve3(cur, poly[poly.length - 1].clone())); }
  const LEN = path.getLength();
  class Sub extends THREE.Curve { constructor(u0, u1, off = null) { super(); this.u0 = u0; this.u1 = u1; this.off = off; } getPoint(t, o = new THREE.Vector3()) { path.getPointAt(this.u0 + (this.u1 - this.u0) * t, o); if (this.off) o.add(this.off); return o; } }
  const T_ = new THREE.Vector3(), P_ = new THREE.Vector3();

  /* ---------- tubos de 3 m + flanges + berços (revelados em ordem a partir da elevatória) ---------- */
  const nT = Math.ceil(LEN / 3), pipePieces = [], fl = [], cradles = [];
  for (let i = 0; i < nT; i++) {
    const u0 = i / nT, u1 = (i + 1) / nT;
    pipePieces.push({ s: u0, geo: new THREE.TubeGeometry(new Sub(u0, u1), 12, R, 16, false), color: Lo.PIPE.treated });
    path.getPointAt(u1, P_); path.getTangentAt(u1, T_);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), T_);
    const m = new THREE.Matrix4().compose(P_, q, new THREE.Vector3(1, 1, 1));
    const fg = new THREE.CylinderGeometry(R + 0.09, R + 0.09, 0.16, 18); fg.applyMatrix4(m);
    fl.push({ s: u0 + 1e-4, geo: fg, color: '#2667ad' });
    // berço de concreto sob o tubo onde ele está aparente sobre o platô
    path.getPointAt((u0 + u1) / 2, P_); path.getTangentAt((u0 + u1) / 2, T_);
    const gy = Lo.G(P_.x, P_.z);
    if (P_.y - R > gy + 0.05 && Math.abs(T_.y) < 0.2) {
      const cm = new Merge(), ang = Math.atan2(-T_.z, T_.x) + Math.PI / 2, h = P_.y - gy;
      cm.add(G.box(1.1, h, 0.6), '#c2c6c9', TM(P_.x, gy + h / 2 - 0.15, P_.z, 0, ang, 0));
      cm.add(G.box(0.12, 0.25, 0.7), '#4a535b', TM(P_.x, P_.y - R * 0.3, P_.z, 0, ang + Math.PI / 2, 0).multiply(TM(0, 0, 0)));
      cradles.push({ s: u0, geo: cm.geo() });
    }
  }
  // blocos de ancoragem nas curvas (concreto envolvendo a curva)
  poly.slice(1, -1).forEach((p, i) => { const u = (i + 1.5) / poly.length; const g = Lo.G(p.x, p.z); if (p.y > g + 0.2 && p.y < Lo.PLATEAU_Y + 2) cradles.push({ s: Math.max(0, u - 0.05), geo: new THREE.BoxGeometry(1.4, 1.0, 1.4).translate(p.x, Math.max(g, p.y - 0.5) + 0.1, p.z) }); });
  const pipeRev = new Revealer(pipePieces, L.mat('#ffffff', { vertexColors: true, roughness: 0.42, metalness: 0.35 }));
  const flRev = new Revealer(fl, L.mat('#ffffff', { vertexColors: true, roughness: 0.4, metalness: 0.4 }));
  const crRev = new Revealer(cradles.map((c) => ({ ...c, color: '#c2c6c9' })), vmat({ roughness: 0.9 }));
  [pipeRev, flRev, crRev].forEach((r) => { L.shadows(r.mesh); root.add(r.mesh); });
  // flange de ligação na porta P.liftOut (luva de encontro com o recalque da elevatória)
  const joint = L.mesh(new THREE.CylinderGeometry(R + 0.13, R + 0.13, 0.22, 20).rotateX(Math.PI / 2), L.mat('#2667ad', { metalness: 0.4, roughness: 0.4 }), a[0], a[1], a[2] + 0.11); root.add(joint);

  /* ---------- água: linha luminosa sobre o tubo + setas ---------- */
  const SEG = 400;
  const glowGeo = new THREE.TubeGeometry(new Sub(0, 1, new THREE.Vector3(0, R + 0.06, 0)), SEG, 0.07, 6, false);
  const glowM = L.glow('#5fc0ff', 2.0);
  const glow = L.mesh(glowGeo, glowM, 0, 0, 0, { cast: false }); root.add(glow);
  const chev = new L.Chevrons(new Sub(0, 1, new THREE.Vector3(0, R + 0.32, 0)), { n: 16, size: 0.32, color: '#ffd23f', normal: [0, 1, 0] }); root.add(chev.mesh);

  /* ---------- planta (ghost) ---------- */
  const gpts = path.getSpacedPoints(160);
  const ghostLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(gpts), ghost.line); root.add(ghostLine);
  const ghostTube = new THREE.Mesh(new THREE.TubeGeometry(new Sub(0, 1), 80, R, 8, false), ghost.fill); root.add(ghostTube);

  function update(t, S) {
    const b = S.build.treatedMain, w = S.water.treated;
    pipeRev.set(b >= 0.999 ? 2 : b * 1.0 - 1e-6);
    flRev.set(b >= 0.999 ? 2 : b - 0.01);
    crRev.set(b >= 0.999 ? 2 : b + 0.04);
    joint.visible = b > 0.001;
    ghostLine.visible = ghostTube.visible = b < 0.999 && S.ghost > 0.01;
    ghostTube.visible = ghostTube.visible && b < 0.02;
    const k = Math.round(L.clamp01(w) * SEG); glow.geometry.setDrawRange(0, k * 6 * 6); glow.visible = k > 0 && b > 0.99;
    chev.update(t, { speed: 0.12, head: w, amount: w > 0.01 && b > 0.99 ? 1 : 0, size: 0.32 });
  }
  return { root, update, path, LEN };
}
