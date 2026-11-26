// Ruas da cidade (já prontas desde o início): Rua da Casa (ao longo de x, junto à face de corte), rua de trás e a
// avenida da encosta (ao longo de z, desce do pé da torre até a Rua da Casa). Asfalto texturizado que segue o relevo,
// guias, sarjetas, calçadas com juntas (a da frente termina no corte com espessura à mostra), pintura (eixos, bordas,
// faixas de pedestre), postes, placas, lixeiras e árvores de calçada. Raio-x (S.xray): asfalto, calçadas, guias e pintura.
export function buildStreets(ctx) {
  const { L, THREE, Lo, K } = ctx, { sweep, tex, TM, G, Merge, vmat } = K;
  const root = new THREE.Group();
  const SC = Lo.STREETS.casa, SB = Lo.STREETS.back, AV = Lo.STREETS.avenida, ZF = Lo.ZF, CH = 0.15;
  const H = (x, z) => Lo.G(x, z);
  const YA = 0.03, YM = 0.036;
  const AV_Z0 = -17.0;               // a avenida começa abaixo do lote da torre (a torre fica em x 24, z −24, no eixo dela)
  const AVW = 1.5;                   // calçadas da avenida (x 18.5–20 e 28–29.5)

  /* ---------- materiais (raio-x) ---------- */
  const tA = tex.asphalt.clone(); tA.needsUpdate = true;
  const asphaltM = L.mat('#7d828a', { map: tA, roughness: 0.92 });
  const walkM = L.mat('#ffffff', { map: tex.walk, roughness: 0.88 });
  const curbM = L.mat('#c3c7ca', { roughness: 0.82 });
  const gutterM = L.mat('#a9aeb2', { roughness: 0.85 });
  const paintY = L.mat('#f2c230', { roughness: 0.6 }), paintW = L.mat('#eef0f0', { roughness: 0.6 });
  const xrayMats = [asphaltM, walkM, curbM, gutterM, paintY, paintW];
  xrayMats.forEach((m) => { m.side = THREE.DoubleSide; });

  /* ---------- perfis ---------- */
  const curbP = [[0, -0.14], [0, CH - 0.02], [0.03, CH], [0.15, CH], [0.15, -0.14]];
  const gutterP = [[0, -0.04], [0, 0.042], [0.4, 0.034], [0.4, -0.04]];
  const walkP = (u0, u1) => [[u0, CH], [u1, CH], [u1, -0.14], [u0, -0.14]];
  const flatP = (W, v, step = 2) => { const p = []; const n = Math.max(1, Math.ceil(W / step)); for (let i = 0; i <= n; i++) p.push([(W * i) / n, v]); return p; };
  const parts = { asphalt: [], walk: [], curb: [], gutter: [], Y: [], W: [] };
  const add = (k, o) => parts[k].push(K.norm(sweep({ H, ds: 1.0, ...o })));
  /** trechos de [a,b] fora dos intervalos gaps */
  const cutOut = (a, b, gaps) => { let segs = [[a, b]]; gaps.forEach(([p, q]) => { segs = segs.flatMap(([s0, s1]) => (q <= s0 || p >= s1 ? [[s0, s1]] : [[s0, p], [q, s1]].filter(([u, v]) => v - u > 0.05))); }); return segs; };

  /* ---------- asfalto ---------- */
  add('asphalt', { axis: 'x', s0: SC.x0, s1: SC.x1, lat: SC.z0, dir: 1, closed: false, prof: flatP(SC.z1 - SC.z0, YA), uv: 4 });
  add('asphalt', { axis: 'x', s0: SB.x0, s1: SB.x1, lat: SB.z0, dir: 1, closed: false, prof: flatP(SB.z1 - SB.z0, YA), uv: 4 });
  cutOut(AV_Z0, SC.z0, [[SB.z0, SB.z1]]).forEach(([a, b]) => add('asphalt', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x0, dir: 1, closed: false, prof: flatP(AV.x1 - AV.x0, YA), uv: 4 }));
  // cabeceira da avenida: retorno em frente ao portão da torre
  add('asphalt', { axis: 'z', s0: AV_Z0 - 2.5, s1: AV_Z0, ds: 0.5, lat: AV.x0 - 2, dir: 1, closed: false, prof: flatP(AV.x1 - AV.x0 + 4, YA), uv: 4 });

  /* ---------- guias, sarjetas e calçadas ---------- */
  const AVG = [AV.x0, AV.x1];
  // Rua da Casa: calçada de trás (21.5–24) interrompida na avenida; da frente (31–ZF) contínua, termina no corte
  cutOut(SC.x0, SC.x1, [AVG]).forEach(([a, b]) => {
    add('curb', { axis: 'x', s0: a, s1: b, lat: SC.z0, dir: -1, prof: curbP });
    add('gutter', { axis: 'x', s0: a, s1: b, lat: SC.z0, dir: 1, prof: gutterP });
    add('walk', { axis: 'x', s0: a, s1: b, lat: SC.z0, dir: -1, prof: walkP(0.15, SC.z0 - SC.walkBack[0]), uv: 1.5 });
  });
  add('curb', { axis: 'x', s0: SC.x0, s1: SC.x1, lat: SC.z1, dir: 1, prof: curbP, caps: true });
  add('gutter', { axis: 'x', s0: SC.x0, s1: SC.x1, lat: SC.z1, dir: -1, prof: gutterP });
  add('walk', { axis: 'x', s0: SC.x0, s1: SC.x1, lat: SC.z1, dir: 1, prof: walkP(0.15, ZF - SC.z1 - 0.004), uv: 1.5, caps: true });
  // rua de trás: guias dos dois lados, interrompidas na avenida
  cutOut(SB.x0, SB.x1, [AVG]).forEach(([a, b]) => {
    add('curb', { axis: 'x', s0: a, s1: b, lat: SB.z0, dir: -1, prof: curbP });
    add('gutter', { axis: 'x', s0: a, s1: b, lat: SB.z0, dir: 1, prof: gutterP });
    add('walk', { axis: 'x', s0: a, s1: b, lat: SB.z0, dir: -1, prof: walkP(0.15, SB.z0 - SB.walkBack[0]), uv: 1.5 });
    add('curb', { axis: 'x', s0: a, s1: b, lat: SB.z1, dir: 1, prof: curbP });
    add('gutter', { axis: 'x', s0: a, s1: b, lat: SB.z1, dir: -1, prof: gutterP });
    add('walk', { axis: 'x', s0: a, s1: b, lat: SB.z1, dir: 1, prof: walkP(0.15, SB.walkFront[1] - SB.z1), uv: 1.5 });
  });
  // avenida: guias e calçadas de 1,5 m dos dois lados (subindo a encosta)
  [[AV_Z0, SB.walkBack[0]], [SB.walkFront[1], SC.walkBack[0]]].forEach(([a, b]) => {
    add('walk', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x0, dir: -1, prof: walkP(0.15, AVW), uv: 1.5 });
    add('walk', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x1, dir: 1, prof: walkP(0.15, AVW), uv: 1.5 });
  });
  [[AV_Z0, SB.z0], [SB.z1, SC.z0]].forEach(([a, b]) => {
    add('curb', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x0, dir: -1, prof: curbP });
    add('curb', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x1, dir: 1, prof: curbP });
    add('gutter', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x0, dir: 1, prof: gutterP });
    add('gutter', { axis: 'z', s0: a, s1: b, ds: 0.5, lat: AV.x1, dir: -1, prof: gutterP });
  });

  /* ---------- pintura ---------- */
  const band = (k, axis, a, b, l0, l1, ds = 1) => add(k, { axis, s0: a, s1: b, ds, lat: l0, dir: 1, closed: false, prof: [[0, YM], [l1 - l0, YM]] });
  const dashes = (k, axis, a, b, l, w = 0.14, on = 2, off = 2, gaps = []) => { for (let s = a; s < b - 0.3; s += on + off) { const e = Math.min(b, s + on); if (gaps.some(([p, q]) => e > p && s < q)) continue; band(k, axis, s, e, l - w / 2, l + w / 2, 0.5); } };
  const AVX = [AV.x0 - 1, AV.x1 + 1];
  dashes('Y', 'x', SC.x0 + 1, SC.x1 - 1, (SC.z0 + SC.z1) / 2, 0.14, 2, 2, [AVX]);
  dashes('Y', 'x', SB.x0 + 1, SB.x1 - 1, (SB.z0 + SB.z1) / 2, 0.14, 2, 2, [AVX]);
  cutOut(SC.x0 + 0.5, SC.x1 - 0.5, [AVX]).forEach(([a, b]) => band('W', 'x', a, b, SC.z0 + 0.55, SC.z0 + 0.67));
  band('W', 'x', SC.x0 + 0.5, SC.x1 - 0.5, SC.z1 - 0.67, SC.z1 - 0.55);
  cutOut(SB.x0 + 0.5, SB.x1 - 0.5, [AVX]).forEach(([a, b]) => { band('W', 'x', a, b, SB.z0 + 0.55, SB.z0 + 0.67); band('W', 'x', a, b, SB.z1 - 0.67, SB.z1 - 0.55); });
  const xm = (AV.x0 + AV.x1) / 2;
  [[AV_Z0 + 0.5, SB.z0 - 3.5], [SB.z1 + 3.5, SC.z0 - 3.5]].forEach(([a, b]) => { band('Y', 'z', a, b, xm - 0.2, xm - 0.08, 0.5); band('Y', 'z', a, b, xm + 0.08, xm + 0.2, 0.5); band('W', 'z', a, b, AV.x0 + 0.48, AV.x0 + 0.6, 0.5); band('W', 'z', a, b, AV.x1 - 0.6, AV.x1 - 0.48, 0.5); });
  // faixas de pedestre (listras de 0,45 m) nas esquinas da avenida
  const zebraX = (axis, sMid, l0, l1) => { const n = Math.floor((l1 - l0 - 0.6) / 0.9); for (let i = 0; i < n; i++) { const l = l0 + 0.5 + i * 0.9; add('W', { axis, s0: sMid - 1.4, s1: sMid + 1.4, ds: 0.7, H, lat: l, dir: 1, closed: false, prof: [[0, YM], [0.45, YM]] }); } };
  zebraX('z', SC.z0 - 2.0, AV.x0 + 0.3, AV.x1 - 0.3);
  zebraX('z', SB.z1 + 2.0, AV.x0 + 0.3, AV.x1 - 0.3);
  zebraX('z', SB.z0 - 2.0, AV.x0 + 0.3, AV.x1 - 0.3);
  zebraX('x', AV.x0 - 2.0, SC.z0 + 0.4, SC.z1 - 0.4);
  zebraX('x', AV.x1 + 2.0, SB.z0 + 0.4, SB.z1 - 0.4);

  const MATS = { asphalt: asphaltM, walk: walkM, curb: curbM, gutter: gutterM, Y: paintY, W: paintW };
  for (const k in parts) {
    if (!parts[k].length) continue;
    const m = L.mesh(L.BGU.mergeGeometries(parts[k], false), MATS[k], 0, 0, 0, { cast: k === 'curb', receive: true });
    m.renderOrder = k === 'Y' || k === 'W' ? 2 : 1; root.add(m);
  }

  /* ---------- mobiliário: postes, placas, lixeiras ---------- */
  const lampM = new Merge(), lensM = new Merge(), signM = new Merge(), binM = new Merge();
  const lamp = (x, z, ry) => { lampM.add(K.lampGeo, '#9aa3aa', TM(x, H(x, z) + CH, z, 0, ry, 0)); lensM.add(K.lampLensGeo, '#fff1c4', TM(x, H(x, z) + CH, z, 0, ry, 0).multiply(TM(1.98, 7.4, 0))); };
  // nada de postes entre x −9 e 9 na Rua da Casa (a câmera passa ali: casa, hidrômetro, tê)
  [-50, -36, -22, 14.5, 36, 50].forEach((x) => lamp(x, SC.z0 - 0.35, -Math.PI / 2));
  [-56, -42, -28, -14, 16, 31, 45].forEach((x) => lamp(x, SC.z1 + 0.35, Math.PI / 2));
  [-50, -34, -18, -2, 12, 34, 50].forEach((x) => lamp(x, SB.z0 - 0.35, -Math.PI / 2));
  [-42, -26, -10, 6, 40, 54].forEach((x) => lamp(x, SB.z1 + 0.35, Math.PI / 2));
  [-12, -7, 10, 17].forEach((z) => lamp(AV.x0 - 0.35, z, Math.PI));
  [-14, 12].forEach((z) => lamp(AV.x1 + 0.35, z, 0));
  const sign = (kind, x, z, ry) => signM.add(K.signGeo(kind), '#ffffff', TM(x, H(x, z) + CH, z, 0, ry, 0));
  sign('stop', AV.x0 - 0.5, SC.z0 - 0.5, Math.PI / 2); sign('name', AV.x1 + 0.5, SC.z0 - 0.5, 0);
  sign('stop', AV.x0 - 0.5, SB.z0 - 0.5, Math.PI / 2); sign('name', AV.x1 + 0.6, SB.z1 + 0.6, 0);
  [[-31, SC.z1 + 0.3], [-46, SB.z1 + 0.3], [12, SB.z0 - 0.3], [40, SC.z0 - 0.3]].forEach(([x, z]) => binM.add(K.binGeo, '#ffffff', TM(x, H(x, z) + CH, z)));
  const furn = new THREE.Group(); root.add(furn);
  furn.add(L.mesh(lampM.geo(), vmat({ roughness: 0.5, metalness: 0.3 })), L.mesh(lensM.geo(), L.glow('#fff1c4', 1.1), 0, 0, 0, { cast: false }));
  furn.add(L.mesh(signM.geo(), vmat({ roughness: 0.5, metalness: 0.2 })), L.mesh(binM.geo(), vmat({ roughness: 0.55 })));
  L.shadows(furn);
  shared(ctx).lamps = furn;

  /* ---------- árvores de calçada (uma malha) ---------- */
  const trees = new Merge();
  const tree = (x, z, seed, h = 3.2, r = 1.4) => trees.add(K.treeGeo(seed, h, r), '#ffffff', TM(x, H(x, z) + CH, z));
  [-54, -45, -39, -27, -17, 11, 19.5, 33, 43, 57].forEach((x, i) => { if (Math.abs(x - 24) > 5) tree(x, SC.walkBack[0] + 0.9, i + 1, 2.8 + (i % 3) * 0.4, 1.2 + (i % 2) * 0.3); });
  [-57, -38, -22, -6, 9, 32, 46, 58].forEach((x, i) => tree(x, SB.walkFront[1] - 0.9, i + 20, 3.0 + (i % 3) * 0.3, 1.3));
  [-54, -30, -14, 8, 36, 52].forEach((x, i) => tree(x, SB.walkBack[0] + 0.8, i + 40, 3.0, 1.3));
  [-9, 1, 14].forEach((z, i) => { tree(AV.x0 - 0.9, z + 1.6, 60 + i, 3.0, 1.2); tree(AV.x1 + 0.9, z - 1.4, 70 + i, 3.0, 1.2); });
  const treeMesh = L.mesh(trees.geo(), vmat({ roughness: 0.85 })); L.shadows(treeMesh); root.add(treeMesh);

  function update(t, S) {
    K.xray(xrayMats, S.xray);
  }
  return { root, update, H, xrayMats, AV_Z0 };
}
const shared = (ctx) => ctx.shared;
