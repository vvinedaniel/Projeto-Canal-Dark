// Parte 2 do cenário "rede": corte longitudinal do terreno com o tronco descendo e a estação elevatória.
// Plano de corte em z = 0 (tudo fica em z <= 0); o esgoto corre da esquerda (-x) para a direita (+x).
export function buildElev(L, K) {
  const { THREE, PAL } = L, { M, G, bake, house, tree, car, pole, shade } = K;
  const root = new THREE.Group(), PI = Math.PI;
  const X0 = -31, X1 = 31, YB = -11, ZB = -30, WR = 2.8, WT = 0.4, WF = -8.2, PS = 1.3, NY = WF + 0.44 * PS;
  const PX = [-1.05, 1.05], PZ = -0.85, RZ = -2.33; // bombas e tubos de subida
  const trunkAt = (x) => L.lerp(-2.0, -6.0, (x - X0) / (-WR - X0));

  /* ---------------- tubos em corte + parede de solo ---------------- */
  const concPipe = L.mat(PAL.concrete, { side: THREE.DoubleSide, roughness: 0.85 });
  const blueC = '#3f77b0', bluePipe = L.mat(blueC, { side: THREE.DoubleSide, roughness: 0.4, metalness: 0.25 });
  const trunk = L.cutPipe([[X0, -2.0], [-WR, -6.0]], { r: 0.6, wall: 0.1, mat: concPipe, seg: 60, radial: 12 });
  const rec = L.cutPipe([[WR, -2.0], [4.8, -1.98], [7.4, -1.8], [9.85, -1.6]], { r: 0.24, wall: 0.045, mat: bluePipe, seg: 50, radial: 10 });
  const out = L.cutPipe([[11.75, -1.95], [X1, -4.75]], { r: 0.5, wall: 0.09, mat: concPipe, seg: 60, radial: 12 });
  const trunkW = trunk.waterIn(0.42, PAL.sewage, 1), recW = rec.waterIn(1, PAL.sewage, 1), outW = out.waterIn(0.4, PAL.sewage, 1);
  root.add(trunk.group, rec.group, out.group);
  const clampX = (poly, a, b) => poly.map((p) => [Math.min(b, Math.max(a, p[0])), p[1]]);
  const rect = (a, b, c, d) => [[a, c], [b, c], [b, d], [a, d]];
  const wallA = L.soilWall({ x0: X0, x1: 0, y0: YB, y1: 0, z: 0, depth: 0.01, rocks: 0, seed: 4, holes: [clampX(trunk.outline(0.004), X0, -WR - WT - 0.006), rect(-WR - WT, 0, WF - 0.5, 0)] });
  const wallB = L.soilWall({ x0: 0, x1: X1, y0: YB, y1: 0, z: 0, depth: 0.01, rocks: 0, seed: 8, holes: [rect(0, WR + WT, WF - 0.5, 0), clampX(rec.outline(0.004), WR + WT + 0.006, 9.594), rect(9.6, 12, -2.65, 0), clampX(out.outline(0.004), 12.006, X1)] });
  root.add(wallA, wallB);
  { // pedregulhos na face do corte (longe dos tubos, do poço e da caixa)
    const dl = (x, y, ax, ay, bx, by) => { const k = L.clamp01(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)); return Math.hypot(x - ax - k * (bx - ax), y - ay - k * (by - ay)); };
    const free = (x, y, m) => !(Math.abs(x) < WR + WT + m && y > WF - 0.5 - m) && !(x > 9.6 - m && x < 12 + m && y > -2.65 - m) && dl(x, y, X0, -2, -WR, -6) > 0.6 + m && dl(x, y, WR, -2, 9.85, -1.6) > 0.45 + m && dl(x, y, 11.75, -1.95, X1, -4.75) > 0.5 + m;
    root.add(L.scatter(new THREE.IcosahedronGeometry(1, 0), L.mat(PAL.rock, { roughness: 0.9, flatShading: true }), 90, (i, r, d) => {
      let x, y, ok, n = 0; const rs = 0.1 + r() * 0.16;
      do { x = L.lerp(X0 + 0.4, X1 - 0.4, r()); y = L.lerp(YB + 0.3, -0.7, r()); ok = free(x, y, rs * 1.6); } while (!ok && ++n < 40);
      const q = ok ? rs : 0; d.position.set(x, y, -q * 0.2); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(q * 1.3, q * 0.9, q * 0.8);
      return new THREE.Color(PAL.rock).offsetHSL(0, 0, (r() - 0.5) * 0.16);
    }, 17));
  }

  const S = new THREE.Group(); // tudo que é estático vai para a fusão
  const conc = M(PAL.concrete, { roughness: 0.88 }), concD = M(PAL.concreteDark, { roughness: 0.9 }), cutC = M('#6f7880', { roughness: 0.95 });
  const steel = L.metal(PAL.steel, { roughness: 0.38 }), galv = M('#aeb7bd', { roughness: 0.45, metalness: 0.6 }), iron = M('#39424a', { roughness: 0.5, metalness: 0.55 });
  const blue = G(blueC, { roughness: 0.38 }), redM = G('#bf3a2b', { roughness: 0.36 }), black = M('#161a1e', { roughness: 0.7 });

  /* ---------------- bloco de terreno e superfície ---------------- */
  const soilSide = M(PAL.soilMid, { roughness: 1 }), grass = M(PAL.grass, { roughness: 0.95 });
  S.add(L.box(X1 - X0, -YB - 0.3, -ZB - 3.9, soilSide, 0, (YB - 0.3) / 2, (ZB - 3.9) / 2));
  [X0 + 0.01, X1 - 0.01].forEach((x) => S.add(L.box(0.02, -YB, 3.92, soilSide, x, YB / 2, -1.95)));
  const top = (a, b, c, d) => S.add(L.box(b - a, 0.3, d - c, grass, (a + b) / 2, -0.15, (c + d) / 2));
  top(X0, X1, ZB, -3.75); top(X0, -3.7, -3.75, -0.012); top(3.7, 9.6, -3.75, -0.012); top(9.6, 12, -3.75, -1.72); top(12, X1, -3.75, -0.012);
  // pátio da estação, calçada, rua ao fundo
  S.add(L.box(2.0, 0.06, 5.3, conc, -4.7, 0.03, -2.66, { cast: false }), L.box(4.0, 0.06, 5.3, conc, 5.7, 0.03, -2.66, { cast: false }), L.box(7.4, 0.06, 1.6, conc, 0, 0.03, -4.5, { cast: false }));
  S.add(L.box(X1 - X0, 0.12, 1.5, M(PAL.sidewalk, { roughness: 0.9 }), 0, 0.06, -6.05), L.box(X1 - X0, 0.14, 0.2, concD, 0, 0.07, -6.9));
  S.add(L.box(X1 - X0, 0.05, 6.4, M(PAL.asphalt, { roughness: 0.92 }), 0, 0.025, -10.2, { cast: false }), L.box(X1 - X0, 0.14, 0.2, concD, 0, 0.07, -13.5), L.box(X1 - X0, 0.12, 1.4, M(PAL.sidewalk, { roughness: 0.9 }), 0, 0.06, -14.3));
  for (let x = X0 + 1.5; x < X1; x += 3.6) S.add(L.box(1.8, 0.012, 0.16, M(PAL.yellow, { roughness: 0.7 }), x, 0.056, -10.2, { cast: false }));
  // casas, árvores e postes ao fundo
  [{ x: -25, w: 6.4, d: 5, roofType: 'gable', wall: '#f2e2c4', roof: PAL.roof, porch: true }, { x: -13.5, w: 6, d: 5, floors: 2, roofType: 'hip', wall: '#cfe3ee', roof: '#5f6b78' },
    { x: 16.5, w: 6.2, d: 5, roofType: 'gableZ', wall: '#f6d6c2', roof: '#a8472f', shutters: true }, { x: 27, w: 6.4, d: 5, roofType: 'gable', wall: '#dfe8c8', roof: '#8c3b2e', shutters: true }
  ].forEach((h) => { const g = house(h); g.position.set(h.x, 0, -24); S.add(g); });
  [[-30, -21, 3], [-19.5, -23.6, 4], [-7.5, -22.4, 5], [-2, -25.5, 13], [4.5, -22.8, 6], [10.5, -25, 7], [22, -22.6, 8], [-21, -4.2, 9], [-12.5, -3.2, 10], [18.5, -3.6, 11], [27, -4.4, 12], [-1, -18, 14], [7, -17.5, 15]].forEach(([x, z, s]) => { const t = tree({ seed: s, h: 2.6 + (s % 3) * 0.5, r: 1.4 + (s % 4) * 0.25 }); t.position.set(x, 0, z); S.add(t); });
  [-26, -8, 12, 28].forEach((x) => { const p = pole({ h: 8 }); p.rotation.y = PI / 2; p.position.set(x, 0, -14.4); S.add(p); });
  const pk = car('#e9eef2'); pk.position.set(-17, 0.05, -12.4); S.add(pk);

  /* ---------------- poço úmido em corte ---------------- */
  const inner = L.lathe([[0.001, WF], [WR - 0.5, WF], [WR, WF + 0.45], [WR, 0]], M('#a3abb1', { roughness: 0.9, side: THREE.DoubleSide }), 44, PI / 2, PI);
  S.add(inner);
  const capBox = (a, b, c, d) => S.add(L.box(b - a, d - c, 0.02, cutC, (a + b) / 2, (c + d) / 2, -0.011, { cast: false }));
  capBox(-WR - WT, WR + WT, WF - 0.5, WF);
  capBox(-WR - WT, -WR, WF, -6.6); capBox(-WR - WT, -WR, -5.4, 0);
  capBox(WR, WR + WT, WF, -2.24); capBox(WR, WR + WT, -1.76, 0);
  [1, -1].forEach((s) => { const h = L.extrude(s > 0 ? [[WR - 0.5, WF], [WR, WF], [WR, WF + 0.45]] : [[-WR, WF], [-WR + 0.5, WF], [-WR, WF + 0.45]], 0.02, cutC); h.position.z = -0.021; h.castShadow = false; S.add(h); });
  // laje de cobertura + tampas de acesso
  S.add(L.box(7.4, 0.35, 3.7, conc, 0, 0.175, -1.85));
  PX.forEach((x) => {
    S.add(L.box(1.56, 0.07, 1.26, iron, x, 0.385, -1.25), L.box(1.4, 0.05, 1.1, galv, x, 0.425, -1.25));
    for (let i = 0; i < 6; i++) S.add(L.box(1.3, 0.012, 0.03, steel, x, 0.455, -1.7 + i * 0.18, { cast: false }));
    [-0.45, 0.45].forEach((dx) => S.add(L.cyl(0.04, 0.04, 0.2, iron, x + dx, 0.44, -1.82, 8).rotateZ(PI / 2)));
    S.add(L.torus(0.09, 0.018, steel, x, 0.47, -0.82).rotateY(PI / 2));
    S.add(L.box(0.5, 0.07, 0.22, galv, x, -0.035, -1.55), L.box(0.07, 0.07, 0.5, galv, x, -0.035, -0.95)); // suportes dos trilhos e da corrente
  });
  // escada de marinheiro na parede do fundo
  [-0.24, 0.24].forEach((x) => S.add(L.cyl(0.028, 0.028, -WF - 0.5, galv, x, (WF + 0.45 - 0.05) / 2 + 0.2, -WR + 0.14, 8)));
  for (let y = WF + 0.6; y < -0.2; y += 0.32) S.add(L.cyl(0.02, 0.02, 0.48, galv, 0, y, -WR + 0.14, 6).rotateZ(PI / 2));

  /* ---------------- bombas submersíveis ---------------- */
  function pump() {
    const g = new THREE.Group(), ironD = M('#39424a', { roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide });
    g.add(L.cyl(0.4, 0.44, 0.07, iron, 0, 0.035, 0, 24));
    for (let i = 0; i < 4; i++) { const a = PI / 4 + (i * PI) / 2; g.add(L.box(0.09, 0.2, 0.09, iron, Math.cos(a) * 0.32, 0.15, Math.sin(a) * 0.32)); }
    g.add(L.lathe([[0.18, 0.1], [0.26, 0.12], [0.23, 0.24]], ironD, 20)); // boca de sucção
    g.add(L.lathe([[0.02, 0.22], [0.32, 0.22], [0.47, 0.27], [0.53, 0.38], [0.53, 0.5], [0.47, 0.62], [0.32, 0.67], [0.02, 0.67]], ironD, 32)); // voluta
    g.add(L.cyl(0.15, 0.19, 0.5, iron, 0, 0.44, -0.66, 16).rotateX(PI / 2)); // bocal de descarga
    g.add(L.cyl(0.25, 0.25, 0.06, iron, 0, 0.44, -0.9, 16).rotateX(PI / 2));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * L.TAU; g.add(L.cyl(0.022, 0.022, 0.1, steel, Math.cos(a) * 0.205, 0.44 + Math.sin(a) * 0.205, -0.9, 6).rotateX(PI / 2)); }
    g.add(L.cyl(0.3, 0.36, 0.13, iron, 0, 0.735, 0, 24));
    g.add(L.cyl(0.335, 0.335, 0.88, redM, 0, 1.24, 0, 28)); // carcaça do motor
    for (let i = 0; i < 22; i++) { const a = (i / 22) * L.TAU, f = L.box(0.07, 0.74, 0.028, redM, Math.cos(a) * 0.355, 1.24, Math.sin(a) * 0.355); f.rotation.y = -a; g.add(f); } // aletas
    g.add(L.cyl(0.37, 0.37, 0.05, iron, 0, 0.82, 0, 28), L.cyl(0.38, 0.38, 0.06, iron, 0, 1.69, 0, 28));
    g.add(L.lathe([[0.37, 1.72], [0.35, 1.8], [0.26, 1.87], [0.12, 1.9], [0.001, 1.905]], G('#bf3a2b', { roughness: 0.36, side: THREE.DoubleSide }), 24));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * L.TAU + 0.3; g.add(L.cyl(0.028, 0.028, 0.06, steel, Math.cos(a) * 0.3, 1.86, Math.sin(a) * 0.3, 6)); }
    const bail = L.tube([[-0.2, 1.84, 0], [-0.2, 2.02, 0], [0, 2.13, 0], [0.2, 2.02, 0], [0.2, 1.84, 0]], 0.028, steel, 20, 6); g.add(bail);
    g.add(L.cyl(0.05, 0.065, 0.16, iron, 0.02, 1.94, 0.2, 10).rotateX(0.5));
    g.add(L.box(0.2, 0.13, 0.012, steel, 0, 1.36, 0.372));
    g.add(L.box(0.46, 0.1, 0.12, iron, 0, 0.95, -0.76), L.box(0.1, 0.1, 0.5, iron, 0, 0.95, -0.52)); // garra dos trilhos-guia
    return g;
  }
  const pumps = PX.map((x) => { const p = bake(pump()); p.scale.setScalar(PS); p.position.set(x, WF, PZ); root.add(p); return p; });
  PX.forEach((x) => {
    // pedestal com curva de saída (a bomba encaixa aqui ao descer pelos trilhos)
    S.add(L.box(0.56, 0.06, 0.66, iron, x, WF + 0.03, RZ + 0.08), L.box(0.34, NY - 0.2 - WF, 0.4, iron, x, (WF + NY - 0.2) / 2, RZ + 0.06));
    const bend = []; for (let i = 0; i <= 8; i++) { const a = (i / 8) * PI / 2; bend.push([x, NY + 0.3 - 0.3 * Math.cos(a), RZ + 0.3 - 0.3 * Math.sin(a)]); }
    S.add(L.tube(bend, 0.19, blue, 16, 12), L.cyl(0.3, 0.3, 0.07, blue, x, NY, RZ + 0.34, 16).rotateX(PI / 2));
    // tubo de subida com flanges
    S.add(L.cyl(0.17, 0.17, -2.0 - (NY + 0.3), blue, x, (NY + 0.3 - 2.0) / 2, RZ, 16));
    [NY + 0.36, -4.5, -3.0].forEach((y) => { S.add(L.cyl(0.26, 0.26, 0.09, blue, x, y, RZ, 16)); for (let i = 0; i < 8; i++) { const a = (i / 8) * L.TAU; S.add(L.cyl(0.02, 0.02, 0.14, steel, x + Math.cos(a) * 0.215, y, RZ + Math.sin(a) * 0.215, 6)); } });
    // válvula de retenção
    const vc = L.lathe([[0.15, -0.34], [0.22, -0.3], [0.29, -0.12], [0.29, 0.12], [0.22, 0.3], [0.15, 0.34]], G(blueC, { roughness: 0.38, side: THREE.DoubleSide }), 20); vc.position.set(x, -5.2, RZ); S.add(vc);
    S.add(L.cyl(0.2, 0.2, 0.1, blue, x, -5.2, RZ + 0.3, 14).rotateX(PI / 2));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * L.TAU; S.add(L.cyl(0.02, 0.02, 0.05, steel, x + Math.cos(a) * 0.15, -5.2 + Math.sin(a) * 0.15, RZ + 0.36, 6).rotateX(PI / 2)); }
    // registro de gaveta com volante virado para o corte
    S.add(L.rbox(0.44, 0.5, 0.36, 0.06, blue, x, -3.75, RZ), L.cyl(0.24, 0.24, 0.07, blue, x, -4.04, RZ, 16), L.cyl(0.24, 0.24, 0.07, blue, x, -3.46, RZ, 16));
    S.add(L.cyl(0.11, 0.15, 0.34, blue, x, -3.75, RZ + 0.34, 12).rotateX(PI / 2), L.cyl(0.03, 0.03, 0.46, steel, x, -3.75, RZ + 0.62, 8).rotateX(PI / 2));
    const hw = new THREE.Group(); hw.add(L.torus(0.26, 0.032, redM, 0, 0, 0)); for (let i = 0; i < 4; i++) { const sp = L.cyl(0.02, 0.02, 0.5, redM, 0, 0, 0, 6); sp.rotation.z = (i * PI) / 4; hw.add(sp); } hw.add(L.cyl(0.06, 0.06, 0.07, redM, 0, 0, 0, 10).rotateX(PI / 2));
    hw.position.set(x, -3.75, RZ + 0.84); S.add(hw);
    // trilhos-guia
    [-0.15, 0.15].forEach((dx) => S.add(L.cyl(0.03, 0.03, -0.02 - (WF + 1.3), galv, x + dx, (WF + 1.3 - 0.02) / 2, RZ + 0.5, 8)));
    [-6.2, -4.3, -2.6].forEach((y) => S.add(L.box(0.42, 0.045, 0.5, galv, x, y, RZ + 0.27)));
    // cabo elétrico
    S.add(L.tube([[x + 0.02, WF + 1.98 * PS, PZ + 0.24 * PS], [x + 0.25 * Math.sign(-x), WF + 3.4, PZ + 0.5], [x * 0.55, -4.0, PZ + 0.5], [x * 0.42, -1.5, -0.42], [x * 0.4, 0, -0.4]], 0.028, black, 40, 6));
  });
  // barrilete: une as duas subidas e sai pela parede até o plano de corte
  const hdrPts = [[PX[0], -2.75, RZ], [PX[0], -2.2, RZ], [PX[0] + 0.2, -2.0, RZ], [0, -2.0, RZ], [PX[1], -2.0, RZ], [1.62, -2.0, -2.0], [2.1, -2.0, -1.3], [2.42, -2.0, -0.5], [2.76, -2.0, -0.05], [3.25, -2.0, 0]];
  const hdrCurve = L.curve(hdrPts, false, 0.4);
  const hdrMat = new THREE.MeshPhysicalMaterial({ color: blueC, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide, clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] });
  const hdr = L.tube(hdrCurve, 0.19, hdrMat, 90, 12); root.add(hdr);
  S.add(L.cyl(0.17, 0.17, 0.5, blue, PX[1], -2.25, RZ, 16), L.cyl(0.25, 0.25, 0.08, blue, 0.3, -2.0, RZ, 16).rotateZ(PI / 2), L.cyl(0.25, 0.25, 0.08, blue, -0.5, -2.0, RZ, 16).rotateZ(PI / 2));
  [[-0.1, -1.0], [1.2, -1.0]].forEach(([x]) => S.add(L.box(0.06, 1.0, 0.06, galv, x, -1.5, RZ - 0.1), L.box(0.3, 0.06, 0.4, galv, x, -2.22, RZ)));
  // correntes de içamento
  const links = [];
  PX.forEach((x) => { for (let y = WF + 2.16 * PS; y < -0.08; y += 0.088) links.push([x + Math.sin((y - WF) * 0.5) * 0.03, y, PZ - 0.12 * L.sstep(WF + 2.9, -0.3, y)]); });
  root.add(L.scatter(new THREE.TorusGeometry(0.052, 0.014, 5, 8), steel, links.length, (i, r, d) => { d.position.set(...links[i]); d.rotation.y = (i % 2) * PI / 2; }));

  /* ---------------- boias de nível ---------------- */
  const floats = [[-0.36, -7.6, '#ff7a1a'], [0, -6.85, '#ff7a1a'], [0.36, -6.3, PAL.warn]].map(([x, yRest, col]) => {
    const g = new THREE.Group(), body = new THREE.Group();
    const b = L.lathe([[0.001, -0.3], [0.07, -0.27], [0.125, -0.16], [0.13, -0.06], [0.09, 0.03], [0.04, 0.08], [0.03, 0.12]], G(col, { roughness: 0.4, side: THREE.DoubleSide }), 16); body.add(b, L.cyl(0.032, 0.032, 0.06, black, 0, 0.12, 0, 8));
    const cable = L.cyl(0.016, 0.016, 1, black, 0, 0, 0, 6, { cast: false });
    g.add(body, cable); g.position.set(x, 0, -0.22); root.add(g);
    return { body, cable, yRest };
  });
  S.add(L.box(1.2, 0.06, 0.12, galv, 0, -0.06, -0.22));

  /* ---------------- caixa de passagem (onde o recalque termina) ---------------- */
  const bx0 = 9.6, bx1 = 12, bd = 1.7, bwt = 0.25;
  S.add(L.box(bx1 - bx0, 0.25, bd, conc, (bx0 + bx1) / 2, -2.525, -bd / 2), L.box(bx1 - bx0, 2.65, 0.2, conc, (bx0 + bx1) / 2, -1.325, -bd - 0.1));
  const wallPipe = (xa, xb, py, pr) => { S.add(L.box(xb - xa, py - pr + 2.4, bd, conc, (xa + xb) / 2, (-2.4 + py - pr) / 2, -bd / 2), L.box(xb - xa, -0.25 - (py + pr), bd, conc, (xa + xb) / 2, (-0.25 + py + pr) / 2, -bd / 2), L.box(xb - xa, 2 * pr, bd - pr - 0.02, conc, (xa + xb) / 2, py, -(bd + pr + 0.02) / 2)); };
  wallPipe(bx0, bx0 + bwt, -1.6, 0.245); wallPipe(bx1 - bwt, bx1, -1.95, 0.505);
  S.add(L.box(bx1 - bx0, 0.31, bd, conc, (bx0 + bx1) / 2, -0.095, -bd / 2));
  S.add(L.cyl(0.5, 0.5, 0.05, concD, 10.8, 0.08, -0.85, 24), L.cyl(0.42, 0.42, 0.05, iron, 10.8, 0.1, -0.85, 24));
  for (let i = 0; i < 5; i++) S.add(L.box(0.7 - Math.abs(i - 2) * 0.12, 0.012, 0.035, M('#4a545c', { metalness: 0.5, roughness: 0.5 }), 10.8, 0.128, -1.13 + i * 0.14, { cast: false }));

  /* ---------------- quadro elétrico com abrigo ---------------- */
  const KX = 5.7, KZ = -2.4, kio = new THREE.Group(); kio.position.set(KX, 0.06, KZ);
  const cab = M('#d9dcd6', { roughness: 0.45, metalness: 0.15 });
  kio.add(L.box(2.0, 0.22, 1.1, concD, 0, 0.11, 0));
  [-0.85, 0.85].forEach((x) => kio.add(L.box(0.1, 2.5, 0.1, galv, x, 1.47, -0.4), L.box(0.1, 2.25, 0.1, galv, x, 1.35, 0.4)));
  const rf = L.box(2.3, 0.07, 1.5, M('#5c7689', { roughness: 0.5, metalness: 0.4 }), 0, 2.64, 0.02); rf.rotation.x = 0.22; kio.add(rf);
  kio.add(L.rbox(1.25, 1.75, 0.5, 0.04, cab, 0, 1.2, -0.1));
  kio.add(L.box(1.12, 1.6, 0.03, M('#e6e9e3', { roughness: 0.4, metalness: 0.15 }), 0, 1.2, 0.16), L.box(0.02, 1.6, 0.035, M('#9aa09a'), 0, 1.2, 0.165));
  kio.add(L.box(0.04, 0.22, 0.05, iron, 0.08, 1.15, 0.19), L.box(0.04, 0.22, 0.05, iron, -0.08, 1.15, 0.19));
  for (let i = 0; i < 5; i++) kio.add(L.box(0.36, 0.025, 0.03, M('#8d948e'), -0.3, 0.55 + i * 0.06, 0.18), L.box(0.36, 0.025, 0.03, M('#8d948e'), 0.3, 0.55 + i * 0.06, 0.18));
  const tri = L.extrude([[-0.15, -0.12], [0.15, -0.12], [0, 0.15]], 0.015, M(PAL.yellow, { roughness: 0.5 })); tri.position.set(-0.3, 1.2, 0.175); kio.add(tri);
  kio.add(L.box(0.035, 0.12, 0.02, black, -0.3, 1.2, 0.19));
  kio.add(L.box(0.34, 0.2, 0.02, M('#1c2a22', { roughness: 0.3 }), -0.3, 1.72, 0.18)); // visor
  [-0.2, 0.2].forEach((x) => kio.add(L.cyl(0.035, 0.035, 0.9, M('#7d868c'), x, 0.3, -0.42, 8)));
  S.add(kio);
  const lampRed = L.glow('#ff3b30', 1.5), lampGreen = L.glow('#2cff8a', 0.1), beacon = L.glow('#ffb020', 0.1);
  const mkLamp = (m, x) => { const l = L.cyl(0.06, 0.06, 0.05, m, KX + x, 0.06 + 1.72, KZ + 0.19, 14, { cast: false }); l.rotation.x = PI / 2; root.add(l); S.add(L.cyl(0.075, 0.075, 0.03, iron, KX + x, 0.06 + 1.72, KZ + 0.175, 14).rotateX(PI / 2)); };
  mkLamp(lampRed, 0.2); mkLamp(lampGreen, 0.4);
  const bc = L.lathe([[0.001, 0.2], [0.05, 0.19], [0.085, 0.12], [0.09, 0]], beacon, 14); bc.position.set(KX + 0.45, 0.06 + 2.08, KZ - 0.1); bc.material.side = THREE.DoubleSide; bc.castShadow = false; root.add(bc);
  S.add(L.cyl(0.1, 0.1, 0.05, iron, KX + 0.45, 2.11, KZ - 0.1, 12));
  const panelLight = new THREE.PointLight('#42ff9a', 0, 7, 2); panelLight.position.set(KX + 0.3, 1.8, KZ + 1.0); root.add(panelLight);
  const wellLight = new THREE.PointLight('#ffe6c0', 16, 16, 2); wellLight.position.set(0, -5.2, 2.6); root.add(wellLight);

  /* ---------------- ventilação, cerca, luminária ---------------- */
  const pvcW = M('#e8eaec', { roughness: 0.4 });
  const VX = -3.1, VZ = -3.1;
  S.add(L.cyl(0.09, 0.09, 2.5, pvcW, VX, 1.6, VZ, 12), L.tube([[VX, 2.85, VZ], [VX, 3.1, VZ], [VX + 0.15, 3.27, VZ], [VX + 0.35, 3.27, VZ], [VX + 0.5, 3.1, VZ], [VX + 0.5, 2.9, VZ]], 0.09, pvcW, 24, 10), L.cyl(0.12, 0.12, 0.1, pvcW, VX, 0.42, VZ, 12), L.cyl(0.11, 0.11, 0.06, iron, VX + 0.5, 2.88, VZ, 12));
  // cerca de alambrado
  const fcv = document.createElement('canvas'); fcv.width = fcv.height = 64; const fx = fcv.getContext('2d'); fx.strokeStyle = '#dfe6ea'; fx.lineWidth = 5;
  [[0, 0, 64, 64], [64, 0, 0, 64], [-32, 32, 32, 96], [32, -32, 96, 32], [-32, 32, 32, -32], [32, 96, 96, 32]].forEach(([a, b, c, d]) => { fx.beginPath(); fx.moveTo(a, b); fx.lineTo(c, d); fx.stroke(); });
  const fenceTex = new THREE.CanvasTexture(fcv); fenceTex.wrapS = fenceTex.wrapT = THREE.RepeatWrapping; fenceTex.colorSpace = THREE.SRGBColorSpace; fenceTex.anisotropy = 4;
  const FH = 2.0, fence = (xa, za, xb, zb) => {
    const len = Math.hypot(xb - xa, zb - za), ang = Math.atan2(-(zb - za), xb - xa), n = Math.round(len / 2.2);
    const tx = fenceTex.clone(); tx.repeat.set(len / 0.22, FH / 0.22); tx.needsUpdate = true;
    const pm = new THREE.MeshStandardMaterial({ map: tx, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, roughness: 0.5, metalness: 0.4 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(len, FH - 0.1), pm); pl.position.set((xa + xb) / 2, 0.06 + FH / 2, (za + zb) / 2); pl.rotation.y = ang; pl.renderOrder = 5; root.add(pl);
    for (let i = 0; i <= n; i++) { const k = i / n, x = L.lerp(xa, xb, k), z = L.lerp(za, zb, k); S.add(L.cyl(0.04, 0.04, FH + 0.1, galv, x, 0.06 + (FH + 0.1) / 2, z, 8), L.sph(0.055, galv, x, FH + 0.2, z)); }
    const rail = L.cyl(0.028, 0.028, len, galv, (xa + xb) / 2, FH + 0.08, (za + zb) / 2, 6); rail.rotation.z = PI / 2; rail.rotation.y = ang; S.add(rail);
  };
  fence(-5.6, -5.2, 7.6, -5.2); fence(-5.6, -5.2, -5.6, -0.3); fence(7.6, -5.2, 7.6, -0.3);
  // luminária do pátio
  S.add(L.cyl(0.05, 0.07, 4.4, galv, 7.0, 2.26, -4.5, 10), L.tube([[7.0, 4.4, -4.5], [6.95, 4.75, -4.4], [6.6, 4.85, -4.0], [6.2, 4.8, -3.6]], 0.04, galv, 16, 6), L.rbox(0.6, 0.1, 0.3, 0.04, iron, 6.05, 4.78, -3.45), L.box(0.46, 0.02, 0.2, L.glow('#fff1c4', 1.2), 6.05, 4.72, -3.45, { cast: false }));
  root.add(bake(S));

  /* ---------------- água, quedas, partículas, setas ---------------- */
  const wm = L.water(PAL.sewage, 0.66, { depthWrite: false });
  const wVol = L.mesh(new THREE.CylinderGeometry(WR - 0.015, WR - 0.015, 1, 44, 1, false, PI / 2, PI), wm, 0, 0, 0, { cast: false }); wVol.renderOrder = 6;
  const wFront = L.mesh(new THREE.PlaneGeometry(2 * WR - 0.03, 1), wm, 0, 0, -0.004, { cast: false }); wFront.renderOrder = 7;
  root.add(wVol, wFront);
  const sewM = L.mat(PAL.sewage, { roughness: 0.15 });
  const fallIn = L.rbox(0.24, 1, 0.62, 0.1, sewM, -WR + 0.2, 0, -0.33, { cast: false }); root.add(fallIn);
  const fallBox = L.rbox(0.16, 1, 0.34, 0.07, sewM, bx0 + bwt + 0.12, 0, -0.19, { cast: false }); root.add(fallBox);
  const boxWater = L.box(bx1 - bx0 - 2 * bwt - 0.02, 1, bd - 0.02, sewM, (bx0 + bx1) / 2, 0, -bd / 2, { cast: false }); root.add(boxWater);

  const bits = [PAL.poop, '#8a5a2c', '#5a3518', '#a5733d'];
  const off = (c, dz) => c; // (as curvas dos cutPipe ficam em z = 0)
  const fTrunk = new L.Flow(trunk.curve, { n: 46, size: 0.085, colors: bits, offset: [0, -0.2, -0.16], jitter: [0, 0.03, 0.13], seed: 3 });
  const fRec = new L.Flow(rec.curve, { n: 22, size: 0.06, colors: ['#b98a55', '#8a5a2c', '#c9a070'], offset: [0, 0, -0.05], jitter: [0, 0.1, 0.04], seed: 5 });
  const fOut = new L.Flow(out.curve, { n: 34, size: 0.08, colors: bits, offset: [0, -0.16, -0.14], jitter: [0, 0.03, 0.12], seed: 7 });
  const swirl = PX.map((x, i) => { const pts = []; for (let k = 0; k < 10; k++) { const a = (k / 10) * L.TAU; pts.push([x + Math.cos(a) * (0.82 + (k % 2) * 0.1), WF + 0.3 + (k % 3) * 0.14, PZ + Math.sin(a) * 0.8]); } return new L.Flow(L.curve(pts, true), { n: 16, size: 0.05, colors: ['#c9a070', '#e0c090', '#a5733d'], seed: 40 + i }); });
  root.add(fTrunk.mesh, fRec.mesh, fOut.mesh, ...swirl.map((s) => s.mesh));
  const cTrunk = new L.Chevrons(trunk.curve, { n: 9, size: 0.34, offset: [0, 0.08, 0.03] });
  const cRise = PX.map((x) => new L.Chevrons(new THREE.LineCurve3(new THREE.Vector3(x, WF + 1.4, RZ), new THREE.Vector3(x, -2.3, RZ)), { n: 5, size: 0.34, offset: [0.5 * Math.sign(x), 0, 0.3] }));
  const cHdr = new L.Chevrons(L.curve(hdrPts.slice(3), false, 0.4), { n: 4, size: 0.26, offset: [0, 0.42, 0.1] });
  const cRec = new L.Chevrons(rec.curve, { n: 6, size: 0.26, offset: [0, 0.5, 0.04] });
  const cOut = new L.Chevrons(out.curve, { n: 8, size: 0.32, offset: [0, 0.1, 0.03] });
  root.add(cTrunk.mesh, cHdr.mesh, cRec.mesh, cOut.mesh, ...cRise.map((c) => c.mesh));
  // indicador de giro das bombas
  const spinM = L.flat(PAL.good, { transparent: true, toneMapped: false });
  const spins = PX.map((x) => {
    const g = new THREE.Group(), A = 4.5;
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.055, 8, 36, A), spinM));
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.3, 12), spinM); head.position.set(Math.cos(A) * 0.62, Math.sin(A) * 0.62, 0); head.rotation.z = A; g.add(head);
    g.position.set(x, WF + 1.25 * PS, PZ + 0.46 * PS + 0.04); g.renderOrder = 31; g.children.forEach((c) => { c.renderOrder = 31; }); root.add(g); return g;
  });

  /* ---------------- cota de profundidade ---------------- */
  const cotaM = L.flat(PAL.accent, { transparent: true, toneMapped: false }), cota = new THREE.Group();
  const cBar = L.box(0.07, 1, 0.02, cotaM, 0, 0, 0, { cast: false, receive: false }), cTop = L.box(0.7, 0.07, 0.02, cotaM, 0, 0, 0, { cast: false, receive: false }), cBot = L.box(0.7, 0.07, 0.02, cotaM, 0, 0, 0, { cast: false, receive: false });
  const tip = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(0.16, 0.3); s.lineTo(-0.16, 0.3); s.closePath(); return new THREE.Mesh(new THREE.ShapeGeometry(s), cotaM); };
  const tipA = tip(), tipB = tip(); tipA.rotation.z = PI;
  cota.add(cBar, cTop, cBot, tipA, tipB); cota.position.z = 0.08; cota.traverse((o) => { o.renderOrder = 29; }); root.add(cota);

  const levelAt = (t) => L.lerp(-7.6, -6.75, L.sstep(43.6, 47.7, t)) - 0.95 * L.sstep(47.95, 50.2, t);

  function update(t, ui) {
    const on = L.sstep(47.76, 47.98, t), lvl = levelAt(t);
    // nível do poço, boias, queda de entrada
    const h = lvl - WF; wVol.scale.y = h; wVol.position.y = WF + h / 2; wFront.scale.y = h; wFront.position.y = WF + h / 2;
    const fh = -6.5 - lvl + 0.1; fallIn.scale.y = fh; fallIn.position.y = lvl + fh / 2 - 0.08;
    floats.forEach((f) => { const y = Math.max(f.yRest, lvl + 0.04), k = L.sstep(f.yRest - 0.2, f.yRest + 0.12, lvl); f.body.position.y = y; f.body.rotation.z = k * 1.15 + Math.sin(t * 3 + f.yRest) * 0.05 * k; const top = -0.05, len = top - (y + 0.12); f.cable.scale.y = len; f.cable.position.y = y + 0.12 + len / 2; });
    // bombas: vibração + indicador de giro + painel
    pumps.forEach((p, i) => { p.position.x = PX[i] + Math.sin(t * 88 + i * 2) * 0.012 * on; p.position.y = WF + Math.abs(Math.sin(t * 71 + i)) * 0.008 * on; p.rotation.z = Math.sin(t * 64 + i) * 0.006 * on; });
    spins.forEach((s, i) => { s.rotation.z = t * 9 + i * 2; s.scale.setScalar(0.001 + on); });
    spinM.opacity = on;
    lampRed.emissiveIntensity = L.lerp(1.6, 0.05, on); lampGreen.emissiveIntensity = L.lerp(0.05, 3.2, on);
    beacon.emissiveIntensity = 0.1 + on * (1.5 + 1.5 * Math.sin(t * 14)); panelLight.intensity = on * 9;
    swirl.forEach((s) => s.update(t, { speed: 1.6, amount: on }));
    // fluxo
    fTrunk.update(t, { speed: 0.12 }); cTrunk.update(t, { speed: 0.12, amount: L.sstep(43.8, 44.3, t) * (1 - 0.6 * L.sstep(46.5, 47.5, t)) });
    cRise.forEach((c) => c.update(t, { speed: 0.8, amount: on }));
    const hHdr = L.prog(t, 47.95, 48.4), hRec = L.prog(t, 48.3, 48.9), hOut = L.prog(t, 48.95, 49.95);
    cHdr.update(t, { speed: 0.9, amount: on, head: hHdr }); cRec.update(t, { speed: 0.7, amount: on, head: hRec });
    fRec.update(Math.max(0, t - 47.85), { speed: 0.6, amount: 1 });
    const pour = L.sstep(48.8, 49.05, t), bl = L.lerp(-2.32, -2.02, L.sstep(48.85, 49.4, t));
    const ph = (-1.78 - bl) * pour + 0.001; fallBox.scale.y = ph; fallBox.position.y = -1.78 - ph / 2; fallBox.visible = pour > 0.01;
    boxWater.scale.y = bl + 2.4; boxWater.position.y = (-2.4 + bl) / 2;
    outW.range(0, hOut); fOut.update(t, { speed: 0.22, head: hOut, amount: L.sstep(48.95, 49.15, t) }); cOut.update(t, { speed: 0.22, head: hOut, amount: L.sstep(49.0, 49.3, t) });
    // cota: desce junto com o tronco
    const cx = L.lerp(-28, -5.8, L.ease.io(L.prog(t, 43.95, 45.6))), cy = trunkAt(cx), ca = L.pulse(t, 43.8, 46.05, 0.2, 0.3), deep = L.sstep(-4.6, -5.2, cy);
    cota.visible = ca > 0.01; cota.position.x = cx; cotaM.opacity = ca; cotaM.color.set(PAL.accent).lerp(new THREE.Color(PAL.warn), deep);
    cBar.scale.y = -cy; cBar.position.y = cy / 2; cBot.position.y = cy; tipA.position.y = 0; tipB.position.y = cy; tipA.position.z = tipB.position.z = 0.001;
    ui.label('cota', `${Math.round(-cy)} m`, [cx, cy / 2, 0.1], ca, { cls: deep > 0.5 ? 'warn big' : 'accent big', stem: 0, dx: 120, dy: 40 });
    ui.label('ee', 'estação elevatória', [1.2, 3.2, -1.8], L.pulse(t, 46.0, 47.65, 0.25, 0.2), { stem: 60 });
    ui.label('on', 'bombas ligadas', [0, -4.9, -0.85], L.pulse(t, 47.9, 48.75, 0.2, 0.2), { cls: 'good', stem: 0 });
    ui.label('nova', 'nova descida', out.curve.getPointAt(0.13).add(new THREE.Vector3(0, 0.6, 0)), L.pulse(t, 49.35, 50.0, 0.2, 0.2), { cls: 'accent', stem: 40 });
  }
  return { root, update, hdr };
}
