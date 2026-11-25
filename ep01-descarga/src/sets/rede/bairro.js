// Parte 1 do cenário "rede": maquete de um bairro (48 × 64 m) cuja superfície se levanta e revela a rede coletora.
export function buildBairro(L, K) {
  const { THREE, PAL } = L, { M, bake, house, tree, bush, car, pole, openPipe } = K;
  const root = new THREE.Group(), LIFT = 30, BOT = -12.6, SW = 1.7, PI = Math.PI;
  const trunkY = (z) => -4.2 - (z + 32) * 0.0788, ZC = [-14, 12];
  const colJ = (zc) => trunkY(zc) + 1.15, colY = (zc, x) => colJ(zc) + 1.65 * Math.min(1, Math.abs(x) / 23);

  /* =============== TAMPA: superfície do bairro (levanta) =============== */
  const lid = new THREE.Group(); root.add(lid);
  const S = new THREE.Group();
  const asphalt = M(PAL.asphalt, { roughness: 0.92 }), curbM = M(PAL.concreteDark, { roughness: 0.9 }), walkM = M(PAL.sidewalk, { roughness: 0.9 });
  const white = M('#eef0f0', { roughness: 0.7 }), yellow = M(PAL.yellow, { roughness: 0.7 });
  S.add(L.box(48, 0.96, 64, M(PAL.soilTop, { roughness: 0.95 }), 0, -0.5, 0));
  S.add(L.box(48, 0.07, 64, asphalt, 0, 0, 0));
  const rows = [[-32, -17], [-11, 9], [15, 32]], cols = [[-24, -3.5], [3.5, 24]];
  const grassTones = [PAL.grass, '#74c653', '#63b844', '#7acb58', PAL.grass, '#69bf4a'];
  rows.forEach(([z0, z1], ri) => cols.forEach(([x0, x1], ci) => {
    const st = { x0: ci === 1, x1: ci === 0, z0: ri > 0, z1: ri < 2 };
    const slab = (k, h, m) => { const a = x0 + (st.x0 ? k : 0), b = x1 - (st.x1 ? k : 0), c = z0 + (st.z0 ? k : 0), d = z1 - (st.z1 ? k : 0); return L.box(b - a, h, d - c, m, (a + b) / 2, 0.035 + h / 2, (c + d) / 2); };
    S.add(slab(0, 0.13, curbM), slab(0.16, 0.16, walkM), slab(SW, 0.21, M(grassTones[ri * 2 + ci], { roughness: 0.95 })));
  }));
  // sinalização: eixo amarelo, faixas de pedestres, linhas de retenção, tampões de PV
  const mark = (w, d, m, x, z) => S.add(L.box(w, 0.012, d, m, x, 0.042, z, { cast: false }));
  for (let z = -30.5; z < 32; z += 3.6) if (ZC.every((zc) => Math.abs(z - zc) > 6.3)) mark(0.16, 1.8, yellow, 0, z);
  ZC.forEach((zc) => {
    for (let x = -22.5; x < 24; x += 3.6) if (Math.abs(x) > 7.8) mark(1.8, 0.16, yellow, x, zc);
    [-1, 1].forEach((s) => {
      for (let i = 0; i < 7; i++) mark(0.48, 2.3, white, -2.94 + i * 0.98, zc + s * 4.5);
      mark(3.2, 0.3, white, -s * 1.75, zc + s * 6.2);
      for (let i = 0; i < 6; i++) mark(2.3, 0.48, white, s * 5.0, zc - 2.45 + i * 0.98);
      mark(0.3, 2.7, white, s * 6.7, zc + s * 1.5);
    });
  });
  const lidIron = M('#2b3238', { roughness: 0.55, metalness: 0.6 });
  [[0, -14], [0, 12], [0, -27], [0, -1], [0, 25], [-13, -14], [13, -14], [-13, 12], [13, 12]].forEach(([x, z]) => { S.add(L.cyl(0.52, 0.52, 0.03, lidIron, x + 0.9, 0.05, z + 0.6, 20, { cast: false }), L.cyl(0.62, 0.62, 0.02, curbM, x + 0.9, 0.045, z + 0.6, 20, { cast: false })); });
  [[-3.2, -18.5], [3.2, 16.5], [3.2, -9.5], [-3.2, 7.6]].forEach(([x, z]) => S.add(L.box(0.5, 0.03, 0.9, lidIron, x, 0.05, z, { cast: false }))); // bocas de lobo

  // casas
  const HS = [
    { x: -19.3, z: -25.3, rot: 0, w: 6.6, d: 6, roofType: 'gable', wall: '#f2e2c4', roof: PAL.roof, porch: true },
    { x: -9.9, z: -25.6, rot: 0, w: 6.2, d: 6.4, floors: 2, roofType: 'hip', wall: '#cfe3ee', roof: '#5f6b78', door: '#3d5a73' },
    { x: 9.9, z: -25.3, rot: 0, w: 7, d: 5.8, roofType: 'gableZ', wall: '#f6d6c2', roof: '#a8472f', shutters: true, door: '#2f6b52' },
    { x: 19.3, z: -25.6, rot: 0, w: 6.4, d: 6.2, roofType: 'flat', wall: '#f5f0e6', door: '#8a4b2f' },
    { x: -12.8, z: -4.9, rot: PI, w: 6.4, d: 6, roofType: 'gable', wall: '#dfe8c8', roof: '#8c3b2e', annex: 1, dish: true },
    { x: 12.4, z: -4.9, rot: PI, w: 6.6, d: 6, floors: 2, roofType: 'gable', wall: '#fbe7a8', roof: PAL.roof, porch: true, door: '#3d5a73' },
    { x: -17.2, z: 3.0, rot: 0, w: 6.2, d: 5.8, roofType: 'hip', wall: '#f1b9a6', roof: '#7a4a3a', porch: true },
    { x: 16.6, z: 3.0, rot: 0, w: 6.4, d: 6, roofType: 'gable', wall: '#cfe9df', roof: '#b8643c', annex: -1, shutters: true, door: '#8a4b2f' },
    { x: -19.3, z: 24.2, rot: PI, w: 6.6, d: 6, roofType: 'gableZ', wall: '#e6e0d2', roof: '#a8472f', porch: true, door: '#2f6b52' },
    { x: -9.9, z: 24.0, rot: PI, w: 6.4, d: 6.2, roofType: 'flat', wall: '#f0c8a8' },
    { x: 9.9, z: 24.2, rot: PI, w: 6.8, d: 6, roofType: 'gable', wall: '#d9d4ec', roof: '#5f6b78', dish: true, shutters: true, door: '#3d5a73' },
    { x: 19.3, z: 24.0, rot: PI, w: 6.2, d: 6.2, floors: 2, roofType: 'hip', wall: '#f2e2c4', roof: PAL.roof, shutters: true }
  ];
  const laterals = [];
  HS.forEach((h, i) => {
    const hg = house(h); hg.position.set(h.x, 0.24, h.z); hg.rotation.y = h.rot; S.add(hg);
    const dir = h.rot === 0 ? 1 : -1, zf = h.z + dir * h.d / 2, zc = Math.abs(h.z - ZC[0]) < Math.abs(h.z - ZC[1]) ? ZC[0] : ZC[1];
    const edge = zc - dir * (3 + SW), doorX = h.x + dir * (-h.w * 0.18);
    // caminho da porta à calçada + murinho ou cerca-viva
    const pl = Math.abs(edge - zf) - 1.2; S.add(L.box(1.2, 0.05, pl, M('#c9c2b4', { roughness: 0.9 }), doorX, 0.26, (zf + dir * 1.3 + edge) / 2));
    if (i % 3 !== 1) {
      const wm = M(i % 2 ? '#efe9dc' : '#e3d6c0', { roughness: 0.9 }), a = h.x - 4.4, b = h.x + 4.4;
      [[a, doorX - 0.9], [doorX + 0.9, b]].forEach(([p, q]) => { if (q - p > 0.3) S.add(L.box(q - p, 0.8, 0.16, wm, (p + q) / 2, 0.64, edge - dir * 0.2), L.box(q - p + 0.06, 0.07, 0.24, M('#b9b2a4'), (p + q) / 2, 1.07, edge - dir * 0.2)); });
      [doorX - 0.9, doorX + 0.9].forEach((x) => S.add(L.box(0.26, 1.05, 0.26, wm, x, 0.75, edge - dir * 0.2)));
    } else {
      for (let k = 0; k < 5; k++) { const x = h.x - 4 + k * 2; if (Math.abs(x - doorX) < 1.3) continue; const b = bush(i * 7 + k, 0.55); b.position.set(x, 0.24, edge - dir * 0.6); S.add(b); }
    }
    // ramal: da caixa de inspeção no quintal até o coletor da rua
    const sg = -Math.sign(h.x), lx = h.x + sg * 1.5, lz = zf + dir * 1.1, ex = lx + sg * 1.5, ey = colY(zc, ex) + 0.72, ez = zc - dir * 0.18;
    laterals.push({ pts: [[lx, -1.62, lz], [lx + sg * 0.25, L.lerp(-1.62, ey, 0.42), L.lerp(lz, ez, 0.5)], [ex, ey, ez]], box: [lx, lz - dir * 0.55], zc, ex });
  });
  // árvores e arbustos
  [[-22, -30, 1], [-14.6, -29.6, 2], [-5.8, -29.5, 3], [5.8, -30, 4], [14.6, -29.5, 5], [22.3, -30.2, 6], [-14.6, -21, 7], [14.6, -20.8, 8], [5.9, -21.5, 9],
    [-6.3, -5.5, 10], [-7, 4.8, 11], [6.6, 4.2, 12], [21.6, -5.8, 13], [-22, -6.5, 14], [7.2, -1.2, 15], [-22.4, 5.2, 16], [22.4, -1, 26],
    [-14.6, 30, 17], [-5.8, 29.6, 18], [14.6, 30, 19], [22.5, 29.8, 20], [-22.5, 30, 21], [-14.6, 19.6, 22], [14.6, 19.4, 23], [5.8, 29.5, 24], [-5.7, 19.8, 25]
  ].forEach(([x, z, s]) => { const rd = L.rng(s * 13), t = tree({ seed: s, h: 2.4 + rd() * 1.6, r: 1.3 + rd() * 0.8 }); t.position.set(x, 0.24, z); t.rotation.y = rd() * 6; S.add(t); });
  // postes com fiação ao longo da avenida
  const PZ = [-29.5, -20, -7.8, 5.6, 18.4, 29.5], PX = -4.55, PH = 8.5;
  PZ.forEach((z) => { const p = pole({ h: PH }); p.position.set(PX, 0.19, z); S.add(p); });
  const wireM = M('#20262c', { roughness: 0.6 });
  for (let i = 0; i < PZ.length - 1; i++) [-0.85, 0, 0.85].forEach((dx) => {
    const y = PH - 0.05, c = L.curve([[PX + dx, y, PZ[i]], [PX + dx, y - 0.55, (PZ[i] + PZ[i + 1]) / 2], [PX + dx, y, PZ[i + 1]]]);
    S.add(L.mesh(new THREE.TubeGeometry(c, 8, 0.035, 4), wireM, 0, 0, 0, { cast: false }));
  });
  // carros estacionados
  const c1 = car(PAL.blue); c1.position.set(14.2, 0.04, 14.0); S.add(c1);
  const c2 = car('#e9eef2'); c2.position.set(-15.5, 0.04, -16.0); c2.rotation.y = PI; S.add(c2);
  const c3 = car(PAL.yellow); c3.position.set(2.45, 0.04, 22); c3.rotation.y = PI / 2; S.add(c3);
  lid.add(bake(S));
  const carMove = bake(car(PAL.red)); carMove.rotation.y = -PI / 2; lid.add(carMove);

  /* =============== BASE: o subsolo escavado, com a rede apoiada no terreno =============== */
  const base = new THREE.Group(); root.add(base);
  const B = new THREE.Group();
  // traçado da rede (alturas dos eixos)
  const lcurves = laterals.map((l) => L.curve(l.pts, false, 0.35));
  // relevo: o chão acompanha o fundo dos tubos (interpolação por inverso da distância) — tudo desce para a saída
  const smp = [];
  for (let z = -33; z <= 35; z += 1.4) [-1.1, 0, 1.1].forEach((x) => smp.push([x, z, trunkY(z) - 1.42, 5]));
  ZC.forEach((zc) => [-1, 1].forEach((s) => { for (let x = 23.5; x > 3.2; x -= 1.4) smp.push([s * x, zc, colY(zc, x) - 0.8, 1.6]); }));
  laterals.forEach((l, i) => { for (let u = 0; u <= 0.72; u += 0.12) { const q = lcurves[i].getPointAt(u); smp.push([q.x, q.z, q.y - 0.5, 0.7]); } smp.push([l.box[0], l.box[1], -2.2, 0.6]); });
  for (let x = 7; x <= 24; x += 3.4) for (let z = -32; z <= 32; z += 3.2) if (ZC.every((zc) => Math.abs(z - zc) > 5)) [-1, 1].forEach((sg) => smp.push([sg * x, z, -2.35 - (z + 32) * 0.012, 40, 70]));
  const HT = (x, z) => { let a = 0.004 * -2.5, b = 0.004; for (const q of smp) { const d2 = (x - q[0]) * (x - q[0]) + (z - q[1]) * (z - q[1]), w = q[3] / (d2 * Math.sqrt(d2) + (q[4] ?? 0.6)); a += w * q[2]; b += w; } return a / b; };
  const tg = new THREE.PlaneGeometry(48, 64, 72, 96); tg.rotateX(-PI / 2);
  { const pa = tg.attributes.position, cols = [], rd = L.rng(77), cT = new THREE.Color('#8a6a4a'), cM = new THREE.Color(PAL.soilMid), cD = new THREE.Color('#6a4f3b'), c = new THREE.Color();
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), z = pa.getZ(i), y = HT(x, z); pa.setY(i, y);
      const k1 = L.sstep(-3.6, -4.3, y + Math.sin(x * 0.35 + z * 0.2) * 0.3), k2 = L.sstep(-6.6, -7.4, y + Math.sin(x * 0.22 - z * 0.3) * 0.35);
      c.copy(cT).lerp(cM, k1).lerp(cD, k2).offsetHSL(0, 0, (rd() - 0.5) * 0.035); cols.push(c.r, c.g, c.b);
    }
    tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); tg.computeVertexNormals(); }
  const terrain = L.mesh(tg, L.mat(0xffffff, { vertexColors: true, roughness: 1 }), 0, 0, 0, { cast: false }); base.add(terrain);
  // saias do bloco (laterais do subsolo abaixo do relevo)
  const skirtM = M('#5a4333', { roughness: 1, side: THREE.DoubleSide });
  [[-24, -32, 24, -32], [24, -32, 24, 32], [24, 32, -24, 32], [-24, 32, -24, -32]].forEach(([xa, za, xb, zb]) => {
    const a = [], b = []; for (let i = 0; i <= 48; i++) { const x = L.lerp(xa, xb, i / 48), z = L.lerp(za, zb, i / 48); a.push(new THREE.Vector3(x, HT(x, z), z)); b.push(new THREE.Vector3(x, BOT, z)); }
    base.add(L.loft([a, b], skirtM));
  });
  base.add(L.box(48, 0.1, 64, skirtM, 0, BOT - 0.05, 0));
  // paredes de solo em corte: frente, fundo, direita, esquerda (as três primeiras baixam na desmontagem)
  const mkWall = (len, seed) => { const w = L.soilWall({ x0: -len / 2, x1: len / 2, y0: BOT, y1: -1, z: 0, depth: 0.15, rocks: 30, seed, rockSize: 0.32 }); w.children[0].material.side = THREE.DoubleSide; return w; };
  const wF = mkWall(48, 3); wF.position.z = 32.02;
  const wB = mkWall(48, 5); wB.position.z = -32.02;
  const wR = mkWall(64, 7); wR.rotation.y = PI / 2; wR.position.x = 24.02;
  const wL = mkWall(64, 9); wL.rotation.y = -PI / 2; wL.position.x = -24.02;
  base.add(wF, wB, wR, wL);

  const concrete = M('#c3c8cb', { roughness: 0.85, side: THREE.DoubleSide }), gray = M('#7c8894', { roughness: 0.8, side: THREE.DoubleSide }), pvc = M(PAL.pvc, { roughness: 0.45, side: THREE.DoubleSide });
  const sew = M(PAL.sewage, { roughness: 0.15, side: THREE.DoubleSide });
  const cradles = [];
  // tronco (concreto, "1 m ou mais")
  const trunk = openPipe([[0, trunkY(-32), -32], [0, trunkY(34.5), 34.5]], 1.15, concrete, { seg: 20, arc: 1.95, level: 0.4, radial: 14 });
  B.add(trunk.group);
  for (let z = -29; z < 34; z += 5.6) { B.add(openPipe([[0, trunkY(z), z], [0, trunkY(z + 0.7), z + 0.7]], 1.3, concrete, { seg: 1, arc: 1.95, wall: 0.2, water: false, radial: 14 }).group); if (z + 2.8 < 31) cradles.push([0, trunkY(z + 2.8) - 1.15, z + 2.8, 2.5, 0.8]); }
  // coletores (cinza, "40 cm")
  const arms = [];
  ZC.forEach((zc) => [-1, 1].forEach((s) => {
    const a = openPipe([[s * 23, colY(zc, 23), zc], [s * 0.7, colJ(zc), zc]], 0.58, gray, { seg: 16, arc: 2.0, level: 0.36, radial: 12 });
    B.add(a.group); arms.push(a);
    for (let x = 20.5; x > 2; x -= 4.6) { B.add(openPipe([[s * x, colY(zc, x), zc], [s * (x - 0.4), colY(zc, x - 0.4), zc]], 0.67, gray, { seg: 1, arc: 2.0, wall: 0.12, water: false, radial: 12 }).group); if (x - 2.2 > 3) cradles.push([s * (x - 2.2), colY(zc, x - 2.2) - 0.58, zc, 0.7, 1.4]); }
    B.add(L.cyl(0.6, 0.6, 0.14, gray, s * 23.02, colY(zc, 23), zc, 20).rotateZ(PI / 2));
    // apoio de concreto e queda do coletor para dentro do tronco
    B.add(L.rbox(1.1, 2.4, 1.5, 0.08, M('#b3b8bc', { roughness: 0.9 }), s * 2.0, colY(zc, 2.0) - 0.58 - 1.2, zc));
    const top = colJ(zc) - 0.36, bot = trunkY(zc) - 0.4;
    B.add(L.rbox(0.36, top - bot, 0.72, 0.12, sew, s * 0.6, (top + bot) / 2, zc, { cast: false }));
  }));
  // ramais (PVC laranja, "10 cm")
  const lats = laterals.map((l, i) => {
    const p = openPipe(lcurves[i], 0.31, pvc, { seg: 14, arc: 2.05, level: 0.34, radial: 8, wall: 0.05 });
    B.add(p.group);
    B.add(L.rbox(1.1, 0.9, 1.1, 0.07, M(PAL.concrete, { roughness: 0.85 }), l.box[0], -1.62, l.box[1]), L.box(0.86, 0.06, 0.86, M(PAL.concreteDark), l.box[0], -1.15, l.box[1]));
    [0.35, 0.68].forEach((u) => { const q = p.curve.getPointAt(u); cradles.push([q.x, q.y - 0.31, q.z, 0.5, 0.5]); });
    const top = l.pts[2][1] - 0.2, bot = colY(l.zc, l.ex) - 0.3;
    B.add(L.box(0.22, top - bot, 0.3, sew, l.ex, (top + bot) / 2, l.zc, { cast: false }));
    return p;
  });
  // berços de concreto entre o terreno e os tubos
  const crM = M('#b3b8bc', { roughness: 0.9 });
  B.add(L.scatter(new THREE.BoxGeometry(1, 1, 1), crM, cradles.length, (i, r, d) => { const c = cradles[i], y0 = HT(c[0], c[2]) - 0.35; d.position.set(c[0], (y0 + c[1] + 0.12) / 2, c[2]); d.scale.set(c[3], c[1] + 0.12 - y0, c[4]); }));
  B.add(L.scatter(new THREE.IcosahedronGeometry(1, 0), M(PAL.rock, { roughness: 0.9, flatShading: true }), 130, (i, r, d) => {
    const s = 0.18 + r() * 0.34, x = (r() - 0.5) * 46, z = (r() - 0.5) * 62; d.position.set(x, HT(x, z) + s * 0.25, z); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * 1.3, s * 0.8, s);
    return new THREE.Color(PAL.rock).offsetHSL(0, 0, (r() - 0.5) * 0.15);
  }, 21));
  base.add(bake(B));

  // linhas tracejadas ligando cada casa (lá em cima) à sua caixa de inspeção
  const dashM = L.flat(PAL.accent, { transparent: true, toneMapped: false }), DN = 22;
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), dashM, laterals.length * DN); dashes.frustumCulled = false; dashes.renderOrder = 28; base.add(dashes);
  const _o = new THREE.Object3D();

  // partículas de esgoto e setas
  const bits = [PAL.poop, '#7d4f26', '#5a3518', '#8a5a2c'], flows = [], bitGeo = new THREE.CapsuleGeometry(0.62, 0.9, 3, 8);
  const mk = (p, n, size, jit, cn, cs, sp, seed) => {
    const f = new L.Flow(p.curve, { n, size, colors: bits, geo: bitGeo, offset: [0, p.hw + size * 0.45, 0], jitter: jit, seed });
    const ch = new L.Chevrons(p.curve, { n: cn, size: cs, normal: [0, 1, 0], offset: [0, p.r * 0.55 + 0.25, 0] });
    base.add(f.mesh, ch.mesh); flows.push({ f, ch, sp });
  };
  lats.forEach((p, i) => mk(p, 8, 0.11, [0.06, 0.02, 0.06], 2, 0.4, 0.42, 30 + i));
  arms.forEach((p, i) => mk(p, 30, 0.15, [0, 0.03, 0.24], 5, 0.8, 0.2, 60 + i));
  mk(trunk, 110, 0.2, [0.55, 0.04, 0], 9, 1.25, 0.085, 90);

  const anchors = {
    ramal: lats[10].curve.getPointAt(0.45).add(new THREE.Vector3(0, 0.4, 0)),
    coletor: arms[3].curve.getPointAt(0.72).add(new THREE.Vector3(0, 0.7, 0)),
    tronco: new THREE.Vector3(0, trunkY(24) + 1.2, 24)
  };
  const walls = [wF, wR, wL];

  function update(t, ui) {
    const lift = LIFT * L.ease.io(L.prog(t, 38.2, 39.6));
    lid.position.y = lift;
    const s = 1 - 0.93 * L.ease.io(L.prog(t, 38.25, 39.3));
    walls.forEach((w) => { w.scale.y = s; w.position.y = BOT * (1 - s); });
    carMove.position.set(-1.75, 0.04, -26 + (t - 37.75) * 5.5);
    const on = L.sstep(38.5, 39.4, t);
    flows.forEach((o) => { o.f.update(t, { speed: o.sp, amount: on }); o.ch.update(t, { speed: o.sp, amount: on }); });
    const da = L.sstep(38.5, 39.0, t) * (1 - L.sstep(40.3, 41.0, t)); dashM.opacity = da * 0.9; dashes.visible = da > 0.01;
    if (dashes.visible) {
      laterals.forEach((l, i) => { for (let k = 0; k < DN; k++) { const y = -0.6 + ((k + L.fract(t * 0.8)) * 1.4); _o.position.set(l.box[0], y, l.box[1]); _o.scale.setScalar(y < lift - 1.3 ? 1 : 0); _o.updateMatrix(); dashes.setMatrixAt(i * DN + k, _o.matrix); } });
      dashes.instanceMatrix.needsUpdate = true;
    }
    ui.label('r10', '10 cm', anchors.ramal, L.pulse(t, 39.95, 40.95, 0.25, 0.2), { stem: 60 });
    ui.label('r40', '40 cm', anchors.coletor, L.pulse(t, 40.95, 42.0, 0.2, 0.2), { stem: 70 });
    ui.label('r100', '1 m ou mais', anchors.tronco, L.pulse(t, 42.0, 43.45, 0.2, 0.2), { cls: 'accent', stem: 80 });
  }
  return { root, update, trunkY, LIFT };
}
