// Praça do ponto baixo (vira o piscinão) e estacionamento asfaltado (vira pavimento permeável).
// Praça: piso intertravado seguindo o terreno, bordas, canteiros com árvores, chafariz, bancos, postes, lixeiras.
//   Surge com S.build.walks; desmonta quando S.build.reservoir passa de ~0,002 e some em 0,02.
// Estacionamento: asfalto em faixas ao longo de x (somem uma a uma com S.build.permeable), vagas pintadas,
//   batentes, acesso pela rua B, carros estacionados.
export function buildPlaza(ctx, K) {
  const { L, THREE, Lo } = ctx, { G, TM, Merge, vmat, sweep, Revealer, tex } = K;
  const root = new THREE.Group();
  const P = Lo.PLAZA, PK = Lo.PARKING;
  const Hg = (x, z) => Lo.G(x, z);

  /* ===================== PRAÇA ===================== */
  const plazaM = L.mat('#ffffff', { map: tex.paver, roughness: 0.85, side: THREE.DoubleSide });
  const piso = new Revealer(Array.from({ length: Math.round((P.x1 - P.x0) / 0.5) }, (_, i) => {
    const x0 = P.x0 + i * 0.5; return { s: x0, geo: sweep({ axis: 'x', s0: x0, s1: x0 + 0.5, ds: 0.5, H: Hg, lat: P.z0, dir: 1, closed: false, uv: 1.2, prof: Array.from({ length: 20 }, (_, j) => [((P.z1 - P.z0) * j) / 19, 0.05]) }) };
  }), plazaM, { cast: false });
  root.add(piso.mesh);
  const props = new THREE.Group(); root.add(props);
  const items = []; // { obj, x, z, d } para animar a montagem/desmontagem
  const putAt = (obj, x, z, d = 0) => { obj.position.set(x, Hg(x, z) + 0.05, z); props.add(obj); items.push({ obj, d }); return obj; };
  const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2;
  // borda (meio-fio) em volta do piso
  { const m = new Merge(), seg = (ax, az, bx, bz) => { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5); for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = L.lerp(ax, bx, u), z = L.lerp(az, bz, u); m.add(G.box(ax === bx ? 0.15 : Math.abs(bx - ax) / n + 0.01, 0.2, az === bz ? 0.15 : Math.abs(bz - az) / n + 0.01), '#c3c7ca', TM(x, Hg(x, z) + 0.06, z)); } };
    seg(P.x0, P.z0, P.x1, P.z0); seg(P.x1, P.z0, P.x1, P.z1); seg(P.x1, P.z1, P.x0, P.z1); seg(P.x0, P.z1, P.x0, P.z0);
    const b = m.mesh(vmat({ roughness: 0.85 })); b.position.y = 0; props.add(b); items.push({ obj: b, d: 0, flat: true }); }
  // canteiros com grama e árvores nos quatro cantos
  [[P.x0 + 1.8, P.z0 + 1.6], [P.x1 - 1.8, P.z0 + 1.6], [P.x0 + 1.8, P.z1 - 1.6], [P.x1 - 1.8, P.z1 - 1.6]].forEach(([x, z], i) => {
    const g = new THREE.Group(), m = new Merge();
    m.add(G.rbox(2.6, 0.32, 2.2, 0.1), '#c9cdd0', TM(0, 0.16, 0)).add(G.rbox(2.36, 0.06, 1.96, 0.08), '#4f9d3c', TM(0, 0.31, 0));
    for (let k = 0; k < 9; k++) { const a = k * 2.4 + i, r = 0.5 + (k % 3) * 0.25; m.add(new THREE.IcosahedronGeometry(0.18, 0), ['#5fb347', '#3f8a3a', '#e85d8a', '#f2c230'][k % 4], TM(Math.cos(a) * r, 0.38, Math.sin(a) * r * 0.8)); }
    g.add(m.mesh(vmat({ roughness: 0.9, flatShading: true })));
    g.add(L.mesh(K.treeGeo(40 + i * 3, 2.6 + (i % 2) * 0.5, 1.4), vmat({ roughness: 0.9, flatShading: true }), 0, 0.3, 0));
    putAt(g, x, z, 0.1 + i * 0.05);
  });
  // chafariz central
  { const g = new THREE.Group(), m = new Merge();
    m.add(G.lathe([[0, 0], [1.4, 0], [1.4, 0.45], [1.25, 0.45], [1.25, 0.12], [0, 0.12]], 32), '#cfd3d6', TM());
    m.add(G.cyl(0.18, 0.25, 0.9, 12), '#b9bec2', TM(0, 0.55, 0)).add(G.lathe([[0, 0], [0.55, 0.05], [0.6, 0.15], [0.5, 0.18], [0, 0.12]], 20), '#cfd3d6', TM(0, 1.0, 0));
    g.add(m.mesh(vmat({ roughness: 0.7 })));
    const w = L.mesh(new THREE.CircleGeometry(1.25, 32), L.water('#5f9fc4', 0.9), 0, 0.38, 0, { cast: false }); w.rotation.x = -Math.PI / 2; g.add(w);
    putAt(g, cx, cz, 0.2); }
  // bancos virados para o chafariz, postes de praça e lixeiras
  const bm = vmat({ roughness: 0.7 });
  [[cx - 3.2, cz, Math.PI / 2], [cx + 3.2, cz, -Math.PI / 2], [cx, cz - 2.6, 0], [cx, cz + 2.6, Math.PI], [cx - 2.0, cz - 2.3, 0.4], [cx + 2.0, cz + 2.3, Math.PI + 0.4]].forEach(([x, z, r], i) => { const b = L.mesh(K.benchGeo, bm); b.rotation.y = r; putAt(b, x, z, 0.35 + i * 0.04); });
  const lampG = (() => { const m = new Merge(); m.add(G.cyl(0.05, 0.08, 3.6, 8), '#3d464e', TM(0, 1.8, 0)).add(G.cyl(0.12, 0.14, 0.25, 8), '#3d464e', TM(0, 0.12, 0)).add(G.cyl(0.12, 0.06, 0.1, 8), '#3d464e', TM(0, 3.65, 0)); return m.geo(); })();
  const globeM = L.glow('#fff4d6', 0.7);
  [[P.x0 + 4.2, P.z0 + 0.7], [P.x1 - 4.2, P.z1 - 0.7], [P.x0 + 0.6, cz], [P.x1 - 0.6, cz]].forEach(([x, z], i) => { const g = new THREE.Group(); g.add(L.mesh(lampG, bm), L.mesh(new THREE.SphereGeometry(0.22, 14, 10), globeM, 0, 3.9, 0, { cast: false })); putAt(g, x, z, 0.5 + i * 0.05); });
  [[cx - 1.3, cz - 2.7], [cx + 1.3, cz + 2.7]].forEach(([x, z], i) => putAt(L.mesh(K.binGeo, bm), x, z, 0.6 + i * 0.05));
  L.shadows(props);

  /* ===================== ESTACIONAMENTO ===================== */
  const NS = 8, sw = (PK.x1 - PK.x0) / NS;
  const pkM = L.mat('#7d828a', { map: tex.asphalt, roughness: 0.92, side: THREE.DoubleSide });
  const pkW = L.mat('#eef0f0', { roughness: 0.6 }), pkB = L.mat('#2f6fd0', { roughness: 0.6 });
  const strips = [];
  for (let i = 0; i < NS; i++) { const x0 = PK.x0 + i * sw; strips.push({ s: i, geo: sweep({ axis: 'x', s0: x0, s1: x0 + sw, ds: sw / 2, H: Hg, lat: PK.z0, dir: 1, closed: false, uv: 4, prof: Array.from({ length: 12 }, (_, j) => [((PK.z1 - PK.z0) * j) / 11, 0.04]) }) }); }
  // acesso (rampa de asfalto do estacionamento até a guia rebaixada da rua B)
  const AX = [2.0, 5.0], B = Lo.STREET_B;
  const apron = L.mesh(sweep({ axis: 'x', s0: AX[0], s1: AX[1], ds: 0.75, H: Hg, lat: PK.z1, dir: 1, closed: false, uv: 4, prof: Array.from({ length: 6 }, (_, j) => [((B.walkBack[0] - PK.z1) * j) / 5, 0.04]) }), pkM, 0, 0, 0, { cast: false });
  root.add(apron);
  const asph = new Revealer(strips, pkM, { cast: false }); root.add(asph.mesh);
  // vagas: corredor em z (x 2–5), vagas a oeste (carros em x), batentes; vaga PcD em azul
  const lines = [], blue = [], yl = 0.048, VZ = [PK.z0 + 0.4, PK.z0 + 2.9, PK.z0 + 5.4, PK.z0 + 7.9, PK.z0 + 10.4];
  const stripOf = (x) => Math.min(NS - 1, Math.max(0, Math.floor((x - PK.x0) / sw)));
  const line = (x0, x1, z0, z1, arr = lines) => { for (let x = x0; x < x1 - 1e-3; x += sw / 2) { const xa = x, xb = Math.min(x1, x + sw / 2); arr.push({ s: stripOf((xa + xb) / 2), geo: sweep({ axis: 'x', s0: xa, s1: xb, ds: xb - xa, H: Hg, lat: z0, dir: 1, closed: false, prof: [[0, yl], [z1 - z0, yl]] }) }); } };
  VZ.forEach((z) => line(PK.x0 + 0.2, 2.0, z - 0.06, z + 0.06));
  line(1.95, 2.07, VZ[0], VZ[4]);
  line(PK.x0 + 0.4, 1.8, VZ[0] + 0.15, VZ[1] - 0.15, blue);
  for (let z = PK.z0 + 1.0; z < PK.z1 - 0.5; z += 2.0) line(3.4, 3.55, z, z + 1.0); // eixo tracejado do corredor
  const lineMesh = new Revealer(lines, pkW, { cast: false }), blueMesh = new Revealer(blue, pkB, { cast: false });
  root.add(lineMesh.mesh, blueMesh.mesh);
  const pkProps = new THREE.Group(); root.add(pkProps);
  const stops = (() => { const m = new Merge(); VZ.slice(0, 4).forEach((z) => { const x = PK.x0 + 0.5, zz = z + 1.25; m.add(G.rbox(0.18, 0.12, 1.4, 0.04), '#d8d4c8', TM(x, Hg(x, zz) + 0.1, zz)); }); const sm = m.mesh(vmat({ roughness: 0.9 })); root.add(sm); L.shadows(sm); return sm; })();
  { const m = new Merge();
    // faixa de canteiro a leste com arbustos
    for (let z = PK.z0 + 0.8; z < PK.z1 - 1; z += 1.6) m.add(new THREE.IcosahedronGeometry(0.45, 1), '#4f9d3c', TM(6.0, Hg(6.0, z) + 0.35, z, 0, z, 0, 1, 0.8, 1));
    const pm = m.mesh(vmat({ roughness: 0.9, flatShading: true })); pkProps.add(pm); L.shadows(pm); }
  const pkLamp = new THREE.Group(); pkLamp.add(L.mesh(K.lampGeo, vmat({ roughness: 0.5, metalness: 0.3 })), L.mesh(K.lampLensGeo, L.glow('#fff1c4', 1.1), 1.98, 7.4, 0, { cast: false }));
  pkLamp.position.set(5.6, Hg(5.6, -17.8), -17.8); pkLamp.rotation.y = Math.PI; pkProps.add(pkLamp); L.shadows(pkLamp);
  // vagas para os carros (cars.js lê daqui)
  const stalls = [0, 1, 2, 3].map((i) => ({ x: PK.x0 + 2.55, z: VZ[i] + 1.25 }));

  const xrayMats = [plazaM, pkM, pkW, pkB];
  function update(t, S) {
    const kw = S.build.walks, kr = S.build.reservoir;
    // praça
    const gone = kr > 0.02;
    piso.mesh.visible = !gone; if (!gone) piso.set(P.x0 + (P.x1 - P.x0) * L.prog(kw, 0.35, 0.85) - 0.25);
    const out = L.prog(kr, 0.002, 0.018);
    items.forEach((it) => {
      const k = L.prog(kw, 0.6 + it.d * 0.4 - 0.05, 0.75 + it.d * 0.4) * (1 - out), s = it.flat ? k : L.ease.back(k);
      it.obj.visible = k > 0.002 && !gone;
      if (it.flat) it.obj.position.y = -0.4 * (1 - k); else { it.obj.scale.setScalar(Math.max(1e-3, s)); }
    });
    // estacionamento: asfalto revelado em faixas junto com as ruas; some faixa a faixa com o pavimento permeável
    const kp = S.build.permeable, shown = Math.ceil(L.prog(S.build.asphalt, 0.3, 0.75) * NS - 1e-6);
    let hid = 0; for (let i = 0; i < NS; i++) if (kp > i / NS + 0.02) hid = i + 1;
    asph.range(hid, shown);
    const linesOn = S.build.asphalt > 0.8 ? NS : 0;
    lineMesh.range(hid, linesOn); blueMesh.range(hid, linesOn);
    apron.visible = S.build.asphalt > 0.3;
    pkProps.visible = kw > 0.8; pkLamp.visible = kw > 0.8;
    // batentes: sobem junto com o pavimento permeável novo (topo = chão + 0,135)
    stops.visible = kw > 0.8; stops.position.y = kp > 0.02 ? 0.1 : 0;
    K.xray(xrayMats, S.xray);
  }
  return { root, update, xrayMats, stalls };
}
