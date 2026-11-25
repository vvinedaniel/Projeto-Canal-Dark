// ETE compacta (Lo.ETE) e estação elevatória de esgoto (Lo.LIFT), surgindo com S.build.sewer.
// ETE: plataforma, gradeamento (canal com grades inclinadas, rastelo, caçamba), tanque de aeração (bolhas, passarela,
// sopradores), 2 decantadores circulares com ponte raspadora girando, prédio de operação, tubulações flangeadas,
// cerca com portão, postes. Elevatória: casa de comando, laje do poço com tampas, respiro, painel elétrico,
// barrilete de recalque com registros. As tubulações enterradas de esgoto são do módulo drenagem.
export function buildETE(ctx, K) {
  const { L, THREE, Lo } = ctx, { G, TM, Merge, vmat } = K;
  const root = new THREE.Group();
  const E = Lo.ETE, LF = Lo.LIFT;
  const vm = vmat({ roughness: 0.75 }), mm = vmat({ roughness: 0.45, metalness: 0.35 });
  const conc = '#c9cdd0', concD = '#aeb3b7', rail = '#f2c230', pipe = '#7d8a96', blue = '#2f7fd6';
  let gmax = -1e9, gmin = 1e9;
  for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) { const g = Lo.G(E.x0 + ((E.x1 - E.x0) * i) / 8, E.z0 + ((E.z1 - E.z0) * j) / 8); gmax = Math.max(gmax, g); gmin = Math.min(gmin, g); }
  const Y = gmax + 0.12; // cota da plataforma
  const ete = new THREE.Group(); ete.position.y = Y; root.add(ete);
  const stage = []; // { obj, a, b, mode: 'y'|'pop'|'rise' }
  const add = (obj, a, b, mode = 'y') => { ete.add(obj); stage.push({ obj, a, b, mode }); return obj; };
  const X0 = E.x0 + 0.3, X1 = E.x1 - 0.3, Z0 = E.z0 + 0.3, Z1 = E.z1 - 0.3;

  // plataforma
  { const h = Y - gmin + 0.3, g = new THREE.BoxGeometry(X1 - X0, h, Z1 - Z0); g.translate((X0 + X1) / 2, -h / 2, (Z0 + Z1) / 2); add(L.mesh(g, L.mat(concD, { roughness: 0.9 })), 0, 0.18, 'y'); }
  // gradeamento
  { const m = new Merge(), x0 = 15.0, x1 = 17.4, z0 = -15.3, z1 = -13.5, cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2;
    m.add(G.extrude([[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [x, -z]), 1.0, [[[x0 + 0.2, z0 + 0.4], [x1 - 0.2, z0 + 0.4], [x1 - 0.2, z1 - 0.4], [x0 + 0.2, z1 - 0.4]].map(([x, z]) => [x, -z])]), conc, TM(0, 0, 0, -Math.PI / 2, 0, 0));
    for (let i = 0; i < 14; i++) { const z = z0 + 0.45 + i * 0.065; m.rod([15.7, 0.15, z], [16.2, 1.05, z], 0.012, '#4d5964', 4); }
    m.add(G.box(0.7, 0.9, 1.3), blue, TM(16.25, 1.4, czm)).add(G.box(0.08, 1.6, 0.08), '#4d5964', TM(15.9, 1.2, z0 + 0.35)).add(G.box(0.08, 1.6, 0.08), '#4d5964', TM(15.9, 1.2, z1 - 0.35));
    m.add(G.extrude([[-0.6, 0], [0.6, 0], [0.75, 0.7], [-0.75, 0.7]], 1.1), '#e0a020', TM(cxm + 0.2, 0, z1 + 0.1)); // caçamba
    m.rail([x0, 1.0, z0 + 0.1], [x1, 1.0, z0 + 0.1], 0.9, rail, 0.025, 0.7).rail([x0, 1.0, z1 - 0.1], [x1 - 1.0, 1.0, z1 - 0.1], 0.9, rail, 0.025, 0.7);
    const gm = m.mesh(vm); add(gm, 0.15, 0.45);
    const w = L.mesh(new THREE.PlaneGeometry(x1 - x0 - 0.4, z1 - z0 - 0.8), L.water(Lo.SEWER ? '#7a5230' : '#7a5230', 0.95), cxm, 0.7, czm, { cast: false }); w.rotation.x = -Math.PI / 2; add(w, 0.75, 0.9, 'rise'); }
  // tanque de aeração
  const AT = { x0: 12.2, x1: 17.4, z0: -20.6, z1: -16.0 };
  { const m = new Merge(), t = 0.25, { x0, x1, z0, z1 } = AT;
    m.add(G.box(x1 - x0, 1.4, t), conc, TM((x0 + x1) / 2, 0.7, z0 + t / 2)).add(G.box(x1 - x0, 1.4, t), conc, TM((x0 + x1) / 2, 0.7, z1 - t / 2));
    m.add(G.box(t, 1.4, z1 - z0), conc, TM(x0 + t / 2, 0.7, (z0 + z1) / 2)).add(G.box(t, 1.4, z1 - z0), conc, TM(x1 - t / 2, 0.7, (z0 + z1) / 2));
    m.add(G.box(0.2, 1.2, z1 - z0 - 0.4), conc, TM((x0 + x1) / 2, 0.6, (z0 + z1) / 2));                       // divisória
    m.add(G.box(x1 - x0, 0.06, 0.8), '#9aa7b1', TM((x0 + x1) / 2, 1.42, (z0 + z1) / 2)).rail([x0, 1.45, (z0 + z1) / 2 + 0.38], [x1, 1.45, (z0 + z1) / 2 + 0.38], 0.9, rail, 0.025, 0.7).rail([x0, 1.45, (z0 + z1) / 2 - 0.38], [x1, 1.45, (z0 + z1) / 2 - 0.38], 0.9, rail, 0.025, 0.7);
    m.rod([x0 + 0.2, 1.65, z0 + 0.05], [x1 - 0.2, 1.65, z0 + 0.05], 0.07, blue, 10);                       // coletor de ar
    for (let i = 0; i < 6; i++) { const x = x0 + 0.5 + i * ((x1 - x0 - 1) / 5); m.rod([x, 1.65, z0 + 0.05], [x, 1.65, z0 + 0.4], 0.04, blue, 6).rod([x, 1.65, z0 + 0.4], [x, 0.3, z0 + 0.4], 0.04, blue, 6); }
    // casa dos sopradores
    m.add(G.rbox(1.6, 1.5, 1.2, 0.04), '#e9e4d6', TM(x0 + 1.0, 0.75, z0 - 0.9)).add(G.box(1.8, 0.1, 1.4), '#7f8b95', TM(x0 + 1.0, 1.55, z0 - 0.9));
    for (let i = 0; i < 5; i++) m.add(G.box(1.0, 0.03, 0.02), '#56616b', TM(x0 + 1.0, 0.4 + i * 0.16, z0 - 0.29));
    m.rod([x0 + 1.0, 1.0, z0 - 0.3], [x0 + 1.0, 1.65, z0 + 0.05], 0.07, blue, 8);
    add(m.mesh(vm), 0.2, 0.55);
    const w = L.mesh(new THREE.PlaneGeometry(x1 - x0 - 0.5, z1 - z0 - 0.5), L.water('#8d7a52', 0.95), (x0 + x1) / 2, 1.15, (z0 + z1) / 2, { cast: false }); w.rotation.x = -Math.PI / 2; add(w, 0.75, 0.95, 'rise'); }
  // bolhas da aeração
  const NB = 120, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), L.mat('#f4f8f2', { roughness: 0.3, emissive: '#bfe8d8', emissiveIntensity: 0.25 }), NB);
  bub.castShadow = false; bub.frustumCulled = false; ete.add(bub);
  const brd = L.rng(77), bp = Array.from({ length: NB }, () => [brd(), brd(), brd(), 0.6 + brd() * 0.8]);
  // decantadores circulares com ponte raspadora
  const bridges = [];
  [[10.3, -14.9], [10.3, -19.9]].forEach(([x, z], i) => {
    const r = 1.75, m = new Merge();
    m.add(G.lathe([[r, 0], [r, 1.2], [r + 0.18, 1.2], [r + 0.18, 0]], 40), conc, TM(x, 0, z));
    m.add(G.lathe([[r - 0.25, 0.95], [r - 0.25, 1.12], [r - 0.2, 1.12], [r - 0.2, 0.95]], 40), '#bcc6cf', TM(x, 0, z)); // vertedor
    m.add(G.cyl(0.35, 0.35, 1.25, 16, true), '#bcc6cf', TM(x, 0.65, z)).add(G.cyl(0.18, 0.18, 0.4, 10), '#7f8b95', TM(x, 1.45, z));
    add(m.mesh(vm), 0.25, 0.6);
    const w = L.mesh(new THREE.CircleGeometry(r - 0.01, 40), L.water(i === 0 ? '#8fa88a' : '#6fa6b8', 0.94), x, 1.05, z, { cast: false }); w.rotation.x = -Math.PI / 2; add(w, 0.75, 0.95, 'rise');
    const br = new THREE.Group(); br.position.set(x, 0, z);
    const b = new Merge(), L1 = r + 0.15;
    b.add(G.box(L1, 0.08, 0.5), '#9aa7b1', TM(L1 / 2, 1.32, 0)).rail([0, 1.36, 0.22], [L1, 1.36, 0.22], 0.7, rail, 0.02, 0.6).rail([0, 1.36, -0.22], [L1, 1.36, -0.22], 0.7, rail, 0.02, 0.6);
    b.add(G.rbox(0.35, 0.3, 0.4, 0.03), blue, TM(L1 - 0.05, 1.5, 0)).add(G.cyl(0.1, 0.1, 0.3, 10), '#1b1f23', TM(L1 + 0.05, 1.28, 0, Math.PI / 2));
    b.rod([0.2, 1.3, 0], [0.2, 0.9, 0], 0.03, '#7f8b95').rod([r * 0.7, 1.3, 0], [r * 0.7, 0.9, 0], 0.03, '#7f8b95').rod([0.15, 0.9, 0], [r - 0.3, 0.95, 0], 0.03, '#7f8b95');
    br.add(b.mesh(mm)); add(br, 0.5, 0.75, 'pop'); bridges.push({ br, ph: i * 2.1 });
  });
  // prédio de operação
  { const m = new Merge(), x0 = 13.0, x1 = 17.4, z0 = -23.6, z1 = -21.1, cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2, h = 2.9;
    m.add(G.box(x1 - x0, h, z1 - z0), '#efe9dc', TM(cxm, h / 2, czm)).add(G.box(x1 - x0 + 0.1, 0.4, z1 - z0 + 0.1), blue, TM(cxm, 0.2, czm));
    m.add(G.box(x1 - x0 + 0.5, 0.15, z1 - z0 + 0.5), '#8f969c', TM(cxm, h + 0.07, czm));
    [x0 + 0.9, cxm + 0.6, x1 - 0.7].forEach((x, i) => { if (i === 0) { m.add(G.box(1.0, 2.1, 0.06), '#3d6f9f', TM(x, 1.05, z1 + 0.03)); m.add(G.box(1.4, 0.08, 0.6), '#8f969c', TM(x, 2.3, z1 + 0.3)); } else m.add(G.box(1.1, 0.9, 0.06), '#35556e', TM(x, 1.7, z1 + 0.03)).add(G.box(1.2, 0.06, 0.15), '#e9e6df', TM(x, 1.22, z1 + 0.07)); });
    m.add(G.box(0.06, 0.9, 1.2), '#35556e', TM(x1 + 0.03, 1.7, czm)).add(G.box(0.7, 0.5, 0.4), '#dfe3e6', TM(x1 - 0.6, h + 0.4, czm - 0.4));
    m.add(G.box(1.6, 0.4, 0.04), '#2f7fd6', TM(cxm + 0.6, h - 0.35, z1 + 0.04)).add(G.box(1.2, 0.12, 0.05), '#ffffff', TM(cxm + 0.6, h - 0.35, z1 + 0.05));
    add(m.mesh(vm), 0.3, 0.7); }
  // tubulações entre as unidades (flanges nas emendas)
  { const m = new Merge(), seg = (pts, r, c) => { for (let i = 0; i < pts.length - 1; i++) { m.rod(pts[i], pts[i + 1], r, c, 10); m.add(G.sph(r * 1.05, 8, 6), c, TM(...pts[i + 1])); } pts.forEach((p) => m.add(G.cyl(r * 1.5, r * 1.5, 0.06, 12), '#4d5964', TM(p[0], p[1], p[2]))); };
    seg([[17.7, 0.35, -14.4], [17.1, 0.35, -14.4]], 0.12, '#8a5a2c');                        // chegada do recalque
    seg([[16.2, 0.4, -15.3], [16.2, 0.4, -16.0]], 0.12, pipe);
    seg([[12.2, 0.6, -18.3], [11.6, 0.6, -18.3], [11.6, 0.6, -15.6], [11.9, 0.6, -15.0]], 0.1, pipe);
    seg([[11.6, 0.6, -18.3], [11.6, 0.6, -19.6], [11.9, 0.6, -19.9]], 0.1, pipe);
    seg([[8.6, 0.4, -14.9], [8.5, 0.4, -12.9]], 0.09, '#5f9fc4');                            // efluente tratado
    seg([[8.6, 0.4, -19.9], [8.5, 0.4, -22.5], [12.6, 0.4, -23.3]], 0.07, '#4a3423');        // lodo
    add(m.mesh(mm), 0.45, 0.75); }
  // cerca com portão e postes de luz
  { const m = new Merge(), post = (x, z) => m.add(G.box(0.07, 1.8, 0.07), '#56616b', TM(x, 0.9, z));
    const run = (a, b) => { const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.0)); for (let i = 0; i <= n; i++) post(L.lerp(a[0], b[0], i / n), L.lerp(a[1], b[1], i / n)); [1.7, 0.9, 0.12].forEach((y) => m.rod([a[0], y, a[1]], [b[0], y, b[1]], 0.02, '#8b97a1', 4));
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(-(b[1] - a[1]), b[0] - a[0]); m.add(G.box(len, 1.6, 0.01), '#9aa6af', TM((a[0] + b[0]) / 2, 0.9, (a[1] + b[1]) / 2, 0, ang, 0)); };
    run([X0, Z1], [12.3, Z1]); run([14.5, Z1], [X1, Z1]); run([X1, Z1], [X1, Z0]); run([X1, Z0], [X0, Z0]); run([X0, Z0], [X0, Z1]);
    [12.3, 14.5].forEach((x) => m.add(G.box(0.18, 2.0, 0.18), '#56616b', TM(x, 1.0, Z1)));
    m.add(G.box(2.1, 0.05, 0.05), '#56616b', TM(13.4, 1.7, Z1 + 0.3)).add(G.box(2.1, 0.05, 0.05), '#56616b', TM(13.4, 0.2, Z1 + 0.3)); for (let i = 0; i < 10; i++) m.add(G.box(0.03, 1.5, 0.03), '#56616b', TM(12.45 + i * 0.21, 0.95, Z1 + 0.3));
    add(m.mesh(mm), 0.6, 0.95); }
  const fenceMat = ete.children[ete.children.length - 1].material; void fenceMat;
  [[X0 + 0.4, Z1 - 0.4], [X1 - 0.4, Z0 + 0.4]].forEach(([x, z], i) => { const g = new THREE.Group(); g.add(L.mesh(K.lampGeo, vmat({ roughness: 0.5, metalness: 0.3 })), L.mesh(K.lampLensGeo, L.glow('#fff1c4', 1.1), 1.98, 7.4, 0, { cast: false })); g.position.set(x, 0, z); g.rotation.y = i ? Math.PI * 0.75 : -Math.PI / 4; g.scale.setScalar(0.85); add(g, 0.7, 0.95, 'pop'); });
  // acesso do portão até a guia rebaixada da rua B
  { const B = Lo.STREET_B, len = B.walkBack[0] - (E.z1 - 0.3), zc = (B.walkBack[0] + E.z1 - 0.3) / 2;
    const a = L.mesh(new THREE.BoxGeometry(2.4, 0.2, len), L.mat('#8e9399', { roughness: 0.9 }), 13.4, Lo.G(13.4, zc) - Y + 0.0, zc); add(a, 0.2, 0.4, 'y'); }
  L.shadows(ete); bub.castShadow = false;

  /* ---------- estação elevatória ---------- */
  const lift = new THREE.Group(), LY = Math.max(Lo.G(LF.x0, LF.z0), Lo.G(LF.x1, LF.z1), Lo.G(LF.x0, LF.z1), Lo.G(LF.x1, LF.z0)) + 0.1;
  lift.position.set((LF.x0 + LF.x1) / 2, LY, (LF.z0 + LF.z1) / 2); root.add(lift);
  const lstage = [];
  const ladd = (o, a, b, mode = 'y') => { lift.add(o); lstage.push({ obj: o, a, b, mode }); return o; };
  { const w = LF.x1 - LF.x0, d = LF.z1 - LF.z0, g = new THREE.BoxGeometry(w + 0.2, 0.6, d + 0.2); g.translate(0, -0.3 + 0.05, 0); ladd(L.mesh(g, L.mat(concD, { roughness: 0.9 })), 0, 0.2); }
  { const m = new Merge(), d = LF.z1 - LF.z0, zb = d / 2 - 0.85; // casa de comando no fundo (z+), poço na frente (z−)
    m.add(G.box(1.9, 2.3, 1.5), '#e9e1d0', TM(0, 1.15, zb)).add(G.box(2.2, 0.14, 1.8), '#8f969c', TM(0, 2.37, zb)).add(G.box(1.95, 0.3, 1.55), blue, TM(0, 0.15, zb));
    m.add(G.box(0.06, 1.9, 0.85), '#5a6b7a', TM(0.98, 0.95, zb)).add(G.sph(0.04, 6, 4), '#d9b25a', TM(1.02, 1.0, zb - 0.3));
    for (let i = 0; i < 5; i++) m.add(G.box(0.02, 0.04, 0.6), '#7f8b95', TM(-0.98, 1.6 + i * 0.1, zb));
    m.add(G.box(0.5, 0.36, 0.04), '#f2c230', TM(0, 1.9, zb - 0.77)).add(G.box(0.2, 0.2, 0.05), '#1b1f23', TM(0, 1.9, zb - 0.78));
    // laje do poço com tampas de chapa xadrez, respiro em "pescoço de ganso" e guarda-corpo
    const zw = -d / 2 + 1.05;
    m.add(G.box(1.9, 0.2, 1.9), conc, TM(0, 0.1, zw)).add(G.box(0.7, 0.04, 0.7), '#6b737a', TM(-0.42, 0.22, zw)).add(G.box(0.7, 0.04, 0.7), '#6b737a', TM(0.42, 0.22, zw));
    for (let i = 0; i < 5; i++) [-0.42, 0.42].forEach((x) => m.add(G.box(0.6, 0.01, 0.03), '#8a939b', TM(x, 0.245, zw - 0.28 + i * 0.14)));
    m.rod([0.8, 0.2, zw + 0.8], [0.8, 1.4, zw + 0.8], 0.06, '#9aa3aa').add(G.torus(0.15, 0.06, 6, 12, Math.PI), '#9aa3aa', TM(0.95, 1.4, zw + 0.8));
    // painel elétrico
    m.add(G.box(0.7, 1.0, 0.35), '#c8ced3', TM(-0.65, 1.0, zb - 1.0)).add(G.box(0.05, 0.5, 0.05), '#56616b', TM(-0.9, 0.25, zb - 1.0)).add(G.box(0.05, 0.5, 0.05), '#56616b', TM(-0.4, 0.25, zb - 1.0)).add(G.box(0.25, 0.25, 0.02), '#f2c230', TM(-0.65, 1.15, zb - 1.18));
    // barrilete de recalque: sai do poço, dois registros, desce para o recalque enterrado (em −z rumo à ETE)
    const pr = 0.09, pc = '#8a5a2c'; m.rod([-0.42, 0.2, zw - 0.6], [-0.42, 0.75, zw - 0.6], pr, pc).rod([-0.42, 0.75, zw - 0.6], [0.42, 0.75, zw - 0.6], pr, pc).rod([0.42, 0.75, zw - 0.6], [0.42, 0.2, zw - 0.6], pr, pc);
    m.rod([0, 0.75, zw - 0.6], [0, 0.75, -d / 2 - 0.05], pr, pc).rod([0, 0.75, -d / 2 - 0.05], [0, -0.3, -d / 2 - 0.05], pr, pc);
    [-0.2, 0.2].forEach((x) => m.add(G.cyl(0.14, 0.14, 0.2, 10), '#4d5964', TM(x, 0.75, zw - 0.6, 0, 0, Math.PI / 2)).add(G.torus(0.13, 0.025, 6, 14), '#d8433a', TM(x, 1.0, zw - 0.6, Math.PI / 2)).add(G.cyl(0.02, 0.02, 0.2, 6), '#4d5964', TM(x, 0.9, zw - 0.6)));
    // cerca baixa
    m.rail([-1.1, 0, -d / 2], [1.1, 0, -d / 2], 1.2, '#8b97a1', 0.02, 0.8).rail([-1.1, 0, -d / 2], [-1.1, 0, d / 2], 1.2, '#8b97a1', 0.02, 0.8);
    ladd(m.mesh(vm), 0.15, 0.7, 'pop'); }
  L.shadows(lift);

  const _d = new THREE.Object3D();
  function anim(list, k) {
    list.forEach((s) => {
      const u = L.prog(k, s.a, s.b);
      s.obj.visible = u > 0.002;
      if (s.mode === 'y') s.obj.scale.y = Math.max(1e-3, L.ease.out(u));
      else if (s.mode === 'pop') s.obj.scale.setScalar(Math.max(1e-3, L.ease.back(u)));
      else if (s.mode === 'rise') { s.obj.scale.setScalar(Math.max(1e-3, u > 0 ? 1 : 0)); s.obj.position.y = s.obj.userData.y0 ?? (s.obj.userData.y0 = s.obj.position.y); s.obj.position.y = s.obj.userData.y0 - 0.9 * (1 - u); }
    });
  }
  function update(t, S) {
    const k = S.build.sewer;
    root.visible = k > 0.001;
    if (!root.visible) return;
    anim(stage, k); anim(lstage, k);
    const run = L.prog(k, 0.9, 1);
    bridges.forEach((b) => { b.br.rotation.y = b.ph + t * 0.22 * run; });
    bub.visible = run > 0.01;
    if (bub.visible) {
      for (let i = 0; i < NB; i++) { const [a, b, c, sp] = bp[i], u = L.fract(c + t * sp); _d.position.set(L.lerp(AT.x0 + 0.4, AT.x1 - 0.4, a), 0.5 + u * 0.68, L.lerp(AT.z0 + 0.4, AT.z1 - 0.4, b)); _d.scale.setScalar(0.05 * Math.sin(u * Math.PI) * run + 1e-4); _d.updateMatrix(); bub.setMatrixAt(i, _d.matrix); }
      bub.instanceMatrix.needsUpdate = true;
    }
  }
  return { root, update, Y };
}
