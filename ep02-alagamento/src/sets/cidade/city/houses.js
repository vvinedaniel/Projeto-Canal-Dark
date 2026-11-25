// Casas do Ep. 02 com construção animada: gabarito e material no canteiro → armadura e concretagem do radier →
// alvenaria subindo fiada por fiada → laje → reboco/pintura + esquadrias → oitões e madeiramento → telhas encaixando
// fileira por fileira → cumeeira, beiral, calhas e condutores (que descem e despejam na sarjeta).
// A casa h4 (ponto baixo) tem corte na parede da frente, porta aberta, piso e móveis à mostra.
// Escalonamento: casa i (ordenada da esquerda para a direita) sobe na janela [a_i, a_i + DH] de S.build.houses.
export function buildHouses(ctx, K) {
  const { L, THREE, Lo, shared, H } = ctx, { G, TM, Merge, vmat } = K;
  const root = new THREE.Group();
  const CH = 0.25, NC = 11, FH = 2.9, WT = 0.16, PITCH = 0.36, OV = 0.5, OVS = 0.35, DH = 0.42;
  const A = Lo.STREET_A, B = Lo.STREET_B;
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _c = new THREE.Color(), _e = new THREE.Euler();
  const UP = new THREE.Vector3(0, 1, 0);

  /* ---------- dados das casas ---------- */
  const houses = Lo.HOUSES.map((h) => ({ ...h })).sort((a, b) => a.x - b.x || a.z0 - b.z0);
  houses.forEach((h) => {
    const overlap = Lo.HOUSES.some((o) => o.id !== h.id && Math.abs(o.x - h.x) < (o.w + h.w) / 2 && o.z0 < h.z1 && o.z1 > h.z0);
    const inset = overlap ? 0.85 : 0;
    h.sf = h.face === 'A' ? 1 : -1;
    h.bz0 = h.face === 'A' ? h.z0 + inset : h.z0; h.bz1 = h.face === 'A' ? h.z1 : h.z1 - inset;
    h.d = h.bz1 - h.bz0; h.zc = (h.bz0 + h.bz1) / 2; h.ry = h.sf > 0 ? 0 : Math.PI;
    let gmax = -1e9, gmin = 1e9;
    for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const g = Lo.G(h.x - h.w / 2 - 0.2 + (h.w + 0.4) * i / 6, h.bz0 - 0.2 + (h.d + 0.4) * j / 6); gmax = Math.max(gmax, g); gmin = Math.min(gmin, g); }
    const gFront = Lo.G(h.x, h.sf > 0 ? h.bz1 + 0.3 : h.bz0 - 0.3);
    // soleira = chão em frente à porta + 0,3 (casas em terreno inclinado ficam "encaixadas" na encosta)
    h.floor = gFront + (h.sf < 0 ? B.curbH : 0) + Lo.FLOOD.door; h.gmin = gmin; h.gFront = gFront;
    h.M = new THREE.Matrix4().compose(new THREE.Vector3(h.x, h.floor, h.zc), new THREE.Quaternion().setFromAxisAngle(UP, h.ry), new THREE.Vector3(1, 1, 1));
    h.top = h.floors * FH; h.rh = (h.d / 2) * PITCH;
  });
  const n = houses.length;
  houses.forEach((h, i) => { h.a = (i / (n - 1)) * (1 - DH); });
  const W2L = (h, x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(h.M); // local → mundo
  const groupAt = (h) => { const g = new THREE.Group(); g.position.set(h.x, h.floor, h.zc); g.rotation.y = h.ry; root.add(g); return g; };

  /* ---------- aberturas (portas e janelas) em coordenadas locais (frente = +z) ---------- */
  houses.forEach((h) => {
    const w = h.w, d = h.d, op = [];
    h.dx = -w / 2 + 1.25;
    for (let f = 0; f < h.floors; f++) {
      if (f === 0) { op.push({ wall: 'F', f, c: h.dx, w: 1.0, c0: 0, c1: 9, type: 'door' }); if (!h.cutaway) op.push({ wall: 'F', f, c: w / 2 - 1.65, w: 1.5, c0: 4, c1: 9, type: 'W1' }); }
      else { op.push({ wall: 'F', f, c: -w / 4, w: 1.3, c0: 4, c1: 9, type: 'W1' }, { wall: 'F', f, c: w / 4, w: 1.3, c0: 4, c1: 9, type: 'W1' }); }
      op.push({ wall: 'B', f, c: -w / 4, w: 1.2, c0: 4, c1: 9, type: 'W1' }, { wall: 'B', f, c: w / 4, w: 0.6, c0: 6, c1: 9, type: 'W2' });
      op.push({ wall: 'L', f, c: 0, w: 1.2, c0: 4, c1: 9, type: 'W1' }, { wall: 'R', f, c: d / 5, w: 0.6, c0: 6, c1: 9, type: 'W2' });
    }
    h.ops = op;
    if (h.cutaway) h.cut = { a: h.dx + 0.85, b: w / 2 - 0.3 }; // trecho da parede da frente removido (corte)
  });

  /* ---------- alvenaria: um InstancedMesh para todas as fiadas ---------- */
  const blocks = []; // {h, k (ordem), p, q, s, col0, col1, cut}
  houses.forEach((h) => {
    const w = h.w, d = h.d, list = [];
    // paredes em ordem de perímetro: frente, direita, fundo, esquerda (eixo local, posição, rotação)
    const walls = [
      { id: 'F', a: -w / 2, b: w / 2, at: (u) => [u, d / 2 - WT / 2], rot: 0 },
      { id: 'R', a: d / 2 - WT, b: -d / 2 + WT, at: (u) => [w / 2 - WT / 2, u], rot: Math.PI / 2 },
      { id: 'B', a: w / 2, b: -w / 2, at: (u) => [u, -d / 2 + WT / 2], rot: 0 },
      { id: 'L', a: -d / 2 + WT, b: d / 2 - WT, at: (u) => [-w / 2 + WT / 2, u], rot: Math.PI / 2 }
    ];
    for (let f = 0; f < h.floors; f++) for (let c = 0; c < NC; c++) {
      walls.forEach((wl) => {
        const lo = Math.min(wl.a, wl.b), hi = Math.max(wl.a, wl.b);
        let segs = [[lo, hi]];
        const holes = h.ops.filter((o) => o.wall === wl.id && o.f === f && c >= o.c0 && c < o.c1).map((o) => [o.c - o.w / 2, o.c + o.w / 2]);
        if (h.cut && wl.id === 'F' && f === 0) { const st = (c % 2) * 0.22, st2 = ((c + 1) % 2) * 0.2; holes.push([h.cut.a + st, h.cut.b - st2]); }
        holes.forEach(([p, q]) => { segs = segs.flatMap(([s0, s1]) => (q <= s0 || p >= s1 ? [[s0, s1]] : [[s0, p], [q, s1]].filter(([u, v]) => v - u > 0.04))); });
        if (wl.a > wl.b) segs.reverse();
        segs.forEach(([s0, s1]) => {
          const um = (s0 + s1) / 2, [lx, lz] = wl.at(um), y = f * FH + c * CH + CH / 2;
          list.push({ lp: [lx, y, lz], rot: wl.rot, len: s1 - s0, f, c });
          // faces do corte (h4): tampas de cor de corte nas pontas dentro do corte
          if (h.cut && wl.id === 'F' && f === 0) [s0, s1].forEach((e) => { if (e > h.cut.a - 0.01 && e < h.cut.b + 0.25) list.push({ lp: [e, y, lz], rot: 0, len: 0.02, f, c, cut: true }); });
        });
      });
    }
    const rd = L.rng(h.x * 13 + 7), fcount = [];
    list.forEach((b) => { b.fi = fcount[b.f] = (fcount[b.f] || 0); fcount[b.f]++; });
    list.forEach((b, i) => {
      const p = W2L(h, ...b.lp), q = new THREE.Quaternion().setFromAxisAngle(UP, h.ry + b.rot);
      const v = (rd() - 0.5) * 0.08;
      blocks.push({ h, k: i, idx: b.fi / fcount[b.f], p, q, len: b.len, f: b.f, c: b.c, cut: b.cut,
        col0: b.cut ? new THREE.Color('#b9a48a') : new THREE.Color('#c4643c').offsetHSL(0, 0, v), col1: b.cut ? new THREE.Color('#d6c3a5') : new THREE.Color(h.wall).offsetHSL(0, 0, v * 0.15) });
    });
    h.blocks = [blocks.length - list.length, blocks.length];
  });
  const blockMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), L.mat('#ffffff', { roughness: 0.86 }), blocks.length);
  blockMesh.castShadow = blockMesh.receiveShadow = true; blockMesh.frustumCulled = false; root.add(blockMesh);
  blocks.forEach((b, i) => blockMesh.setColorAt(i, b.col0));

  /* ---------- esquadrias: janelas e portas instanciadas ---------- */
  const winGeo = (ww, wh, kind) => {
    const m = new Merge(), fr = '#f4f2ec', gl = '#2c4a63', D = WT + 0.06;
    if (kind === 'door') {
      m.add(G.box(ww + 0.12, 0.08, D), fr, TM(0, wh + 0.04, 0)).add(G.box(0.08, wh, D), fr, TM(-ww / 2 - 0.02, wh / 2, 0)).add(G.box(0.08, wh, D), fr, TM(ww / 2 + 0.02, wh / 2, 0));
      m.add(G.box(ww - 0.04, wh - 0.02, 0.05), '#7a4b2a', TM(0, wh / 2, WT / 2 - 0.02));
      for (let i = 0; i < 3; i++) m.add(G.box(ww - 0.2, 0.025, 0.02), '#5e3820', TM(0, 0.4 + i * 0.6, WT / 2 + 0.01));
      m.add(G.box(0.3, 0.45, 0.02), gl, TM(0, wh - 0.45, WT / 2 + 0.012)).add(G.sph(0.04, 8, 6), '#d9b25a', TM(ww / 2 - 0.14, 1.05, WT / 2 + 0.03));
      m.add(G.box(ww + 0.3, 0.05, 0.35), '#bfc3c6', TM(0, 0.02, WT / 2 + 0.12)); // soleira
    } else {
      m.add(G.box(ww + 0.12, wh + 0.12, D * 0.6), fr, TM(0, wh / 2, 0, 0, 0, 0, 1, 1, 1));
      m.add(G.box(ww - 0.04, wh - 0.04, D * 0.6 + 0.02), gl, TM(0, wh / 2, 0));
      m.add(G.box(0.05, wh - 0.04, D * 0.6 + 0.05), fr, TM(0, wh / 2, 0)).add(G.box(ww - 0.04, 0.05, D * 0.6 + 0.05), fr, TM(0, wh * 0.62, 0));
      m.add(G.box(ww + 0.3, 0.06, D + 0.12), '#e9e6df', TM(0, -0.04, 0.05)); // peitoril
      if (kind === 'W1') [-1, 1].forEach((s) => m.add(G.box(0.36, wh + 0.06, 0.04), '#5b7d93', TM(s * (ww / 2 + 0.24), wh / 2, D / 2)).add(G.box(0.3, 0.03, 0.05), '#46677c', TM(s * (ww / 2 + 0.24), wh * 0.3, D / 2 + 0.01)).add(G.box(0.3, 0.03, 0.05), '#46677c', TM(s * (ww / 2 + 0.24), wh * 0.7, D / 2 + 0.01)));
    }
    // a janela fica centrada na espessura da parede: desloca para fora (z local) meia parede
    const g = m.geo(); g.translate(0, 0, 0); return g;
  };
  const OPEN = { door: [], W1: [], W2: [] }, SIZE = { door: [1.0, 2.2], W1: [1.4, 1.2], W2: [0.6, 0.7] };
  houses.forEach((h) => h.ops.forEach((o, oi) => {
    if (h.cutaway && o.type === 'door') return; // a porta da h4 é aberta (malha própria)
    const w = h.w, d = h.d, y = o.f * FH + o.c0 * CH;
    const sz = SIZE[o.type], ww = o.type === 'door' ? 1.0 : o.w - 0.1;
    let lx, lz, rot;
    if (o.wall === 'F') { lx = o.c; lz = d / 2 - WT / 2; rot = 0; } else if (o.wall === 'B') { lx = o.c; lz = -d / 2 + WT / 2; rot = Math.PI; }
    else if (o.wall === 'R') { lx = w / 2 - WT / 2; lz = o.c; rot = Math.PI / 2; } else { lx = -w / 2 + WT / 2; lz = o.c; rot = -Math.PI / 2; }
    OPEN[o.type].push({ h, p: W2L(h, lx, y, lz), q: new THREE.Quaternion().setFromAxisAngle(UP, h.ry + rot), sx: ww / (o.type === 'door' ? 1.0 : sz[0]), i: oi });
  }));
  const openMesh = {};
  const openMat = vmat({ roughness: 0.32, metalness: 0.15 });
  for (const k in OPEN) {
    const geo = winGeo(k === 'door' ? 0.94 : SIZE[k][0], k === 'door' ? 2.2 : SIZE[k][1], k);
    const im = new THREE.InstancedMesh(geo, openMat, OPEN[k].length); im.castShadow = im.receiveShadow = true; im.frustumCulled = false; root.add(im); openMesh[k] = im;
  }

  /* ---------- telhas: tiras de capa-canal (1 m × 0,42 m) instanciadas ---------- */
  const tileGeo = (() => {
    const nx = 24, nz = 3, pos = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -0.5 + i / nx, z = -0.21 + (0.42 * j) / nz, y = 0.045 * (0.5 + 0.5 * Math.cos(2 * Math.PI * x * 4)) + 0.035 * (j / nz); pos.push(x, y, z); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const tiles = [], ridges = [];
  houses.forEach((h) => {
    const Wr = h.w + 2 * OVS, run = h.d / 2 + OV, slope = Math.hypot(run, run * PITCH), ang = Math.atan(PITCH), eaveY = h.top + 0.06;
    const nRows = Math.ceil((slope - 0.1) / 0.38), nCols = Math.ceil(Wr / 1.0), cw = Wr / nCols, rd = L.rng(h.x * 7 + 3), base = new THREE.Color(h.roof);
    const list = [];
    [1, -1].forEach((side) => {
      for (let r = 0; r < nRows; r++) for (let c = 0; c < nCols; c++) {
        const sAlong = 0.21 + r * 0.38, hz = run - sAlong * Math.cos(ang), hy = eaveY + (h.d / 2) * PITCH - hz * PITCH; // distância horizontal ao eixo
        const lx = -Wr / 2 + cw * (c + 0.5), lz = side * hz;
        const lq = new THREE.Quaternion().setFromEuler(_e.set(0, side > 0 ? 0 : Math.PI, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang));
        const wq = new THREE.Quaternion().setFromAxisAngle(UP, h.ry).multiply(lq);
        const nrm = new THREE.Vector3(0, 1, 0).applyQuaternion(wq);
        list.push({ h, p: W2L(h, lx, hy + 0.04, lz), q: wq, sx: cw * 1.01, nrm, order: r * nCols + c, col: base.clone().offsetHSL(0, (rd() - 0.5) * 0.05, (rd() - 0.5) * 0.07) });
      }
    });
    list.forEach((t) => { t.n = nRows * nCols; tiles.push(t); });
    h.tiles = [tiles.length - list.length, tiles.length];
    // cumeeira
    const ry = eaveY + (h.d / 2) * PITCH + 0.1, nr = Math.ceil(Wr / 0.4);
    for (let i = 0; i < nr; i++) ridges.push({ h, p: W2L(h, -Wr / 2 + (Wr / nr) * (i + 0.5), ry, 0), q: new THREE.Quaternion().setFromAxisAngle(UP, h.ry), sx: Wr / nr, i, n: nr, col: base.clone().multiplyScalar(0.85) });
    h.ridgeY = ry + 0.12; h.eaveY = eaveY - OV * PITCH; h.Wr = Wr; h.run = run;
  });
  const tileMesh = new THREE.InstancedMesh(tileGeo, L.mat('#ffffff', { roughness: 0.72, side: THREE.DoubleSide }), tiles.length);
  tileMesh.castShadow = tileMesh.receiveShadow = true; tileMesh.frustumCulled = false; root.add(tileMesh);
  tiles.forEach((t, i) => tileMesh.setColorAt(i, t.col));
  const ridgeGeo = new THREE.CylinderGeometry(0.13, 0.15, 1, 10, 1, true, 0, Math.PI).rotateZ(Math.PI / 2);
  const ridgeMesh = new THREE.InstancedMesh(ridgeGeo, L.mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), ridges.length);
  ridgeMesh.castShadow = true; ridgeMesh.frustumCulled = false; root.add(ridgeMesh);
  ridges.forEach((r, i) => ridgeMesh.setColorAt(i, r.col));

  /* ---------- peças por casa ---------- */
  const woodM = vmat({ roughness: 0.85 }), concM = L.mat('#b9bec2', { roughness: 0.9 }), plinthM = L.mat('#8f979e', { roughness: 0.9 }), rebarM = L.mat('#8a4b2a', { roughness: 0.6, metalness: 0.4 });
  const trimM = vmat({ roughness: 0.6 }), pvcM = vmat({ roughness: 0.45 });
  const downspouts = [], roofs = [];
  houses.forEach((h) => {
    const w = h.w, d = h.d, P = {};
    // gabarito do canteiro (estacas + tábuas a 0,6 m do chão)
    { const m = new Merge(), e = 0.8, pts = [[-w / 2 - e, -d / 2 - e], [w / 2 + e, -d / 2 - e], [w / 2 + e, d / 2 + e], [-w / 2 - e, d / 2 + e]];
      const gy = (lx, lz) => { const p = W2L(h, lx, 0, lz); return Lo.G(p.x, p.z) - h.floor; };
      for (let i = 0; i < 4; i++) { const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % 4], len = Math.hypot(bx - ax, bz - az), ns = Math.max(2, Math.round(len / 1.6));
        for (let j = 0; j < ns; j++) { const u = j / ns, x = ax + (bx - ax) * u, z = az + (bz - az) * u, g0 = gy(x, z); m.add(G.box(0.08, 1.0, 0.08), '#b98a5a', TM(x, g0 + 0.4, z)); }
        const gm = gy((ax + bx) / 2, (az + bz) / 2), ang = Math.atan2(-(bz - az), bx - ax);
        m.add(G.box(len + 0.1, 0.12, 0.03), '#c99a66', TM((ax + bx) / 2, gm + 0.62, (az + bz) / 2, 0, ang, 0)); }
      // linhas de náilon marcando as paredes
      [[-w / 2, -d / 2 - e, -w / 2, d / 2 + e], [w / 2, -d / 2 - e, w / 2, d / 2 + e], [-w / 2 - e, d / 2, w / 2 + e, d / 2], [-w / 2 - e, -d / 2, w / 2 + e, -d / 2]].forEach(([ax, az, bx, bz]) => m.rod([ax, gy(ax, az) + 0.68, az], [bx, gy(bx, bz) + 0.68, bz], 0.012, '#f6f2e0', 4));
      P.gab = m.mesh(woodM); }
    // material da obra: palete de blocos, monte de areia, betoneira
    { const m = new Merge(), gx = w / 2 + 0.2, gz = d / 2 + 0.5, p0 = W2L(h, gx, 0, gz), g0 = Lo.G(p0.x, p0.z) - h.floor;
      m.add(G.box(1.1, 0.12, 1.1), '#b98a5a', TM(gx, g0 + 0.06, gz));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) m.add(G.box(1.05, 0.19, 0.5), i % 2 ? '#b85a34' : '#c4643c', TM(gx, g0 + 0.22 + i * 0.2, gz - 0.26 + j * 0.52));
      const sx = -w / 2 + 0.6, p1 = W2L(h, sx, 0, gz + 0.2), g1 = Lo.G(p1.x, p1.z) - h.floor;
      m.add(G.cone(0.75, 0.6, 14), '#d8b77a', TM(sx, g1 + 0.3, gz + 0.2));
      // betoneira
      const bx = 0.4, p2 = W2L(h, bx, 0, gz + 0.3), g2 = Lo.G(p2.x, p2.z) - h.floor;
      m.add(G.box(0.9, 0.08, 0.5), '#2f7fd6', TM(bx, g2 + 0.5, gz + 0.3)).add(G.lathe([[0, -0.35], [0.28, -0.3], [0.38, 0], [0.3, 0.3], [0.15, 0.42]], 16), '#e0592a', TM(bx, g2 + 0.95, gz + 0.3, 0, 0, 0.6));
      [-0.3, 0.3].forEach((z) => m.add(G.cyl(0.16, 0.16, 0.08, 12), '#1b1f23', TM(bx - 0.35, g2 + 0.16, gz + 0.3 + z, Math.PI / 2)));
      m.add(G.box(0.06, 0.55, 0.06), '#2f7fd6', TM(bx + 0.4, g2 + 0.27, gz + 0.3));
      P.pile = m.mesh(vmat({ roughness: 0.8 })); }
    // armadura do radier (malha de vergalhões)
    { const m = new Merge(); for (let x = -w / 2; x <= w / 2 + 0.01; x += 0.5) m.add(G.box(0.025, 0.025, d + 0.2), '#8a4b2a', TM(x, -0.1, 0)); for (let z = -d / 2; z <= d / 2 + 0.01; z += 0.5) m.add(G.box(w + 0.2, 0.025, 0.025), '#8a4b2a', TM(0, -0.08, z)); P.rebar = L.mesh(m.geo(), rebarM); }
    // radier + embasamento (do ponto mais baixo do lote até o piso) + degraus da porta
    { const hb = h.floor - h.gmin + 0.25, g = new THREE.BoxGeometry(w + 0.3, hb, d + 0.3); g.translate(0, hb / 2, 0);
      const r = new THREE.Group(), slab = L.mesh(g, plinthM, 0, -hb, 0); r.add(slab);
      const top = L.mesh(new THREE.BoxGeometry(w + 0.32, 0.12, d + 0.32), concM, 0, -0.06, 0); r.add(top);
      const st = new Merge(), gs = h.gFront + (h.sf < 0 ? Lo.STREET_B.curbH : 0) - h.floor, nst = Math.max(1, Math.ceil(-gs / 0.18));
      for (let i = 0; i < nst; i++) { const top = gs * (i + 1) / (nst + 1), hh = top - gs + 0.1; st.add(G.box(1.4, hh, 0.3), '#c4c8cb', TM(h.dx, top - hh / 2, d / 2 + 0.3 + i * 0.3)); }
      if (!st.empty) r.add(st.mesh(vmat({ roughness: 0.85 })));
      P.radier = r; P.radierH = hb; }
    // lajes (uma por pavimento)
    P.slabs = []; for (let f = 0; f < h.floors; f++) { const s = new THREE.Group(); s.add(L.mesh(new THREE.BoxGeometry(w + 0.12, 0.15, d + 0.12), concM, 0, 0, 0)); s.add(L.mesh(new THREE.BoxGeometry(w + 0.16, 0.13, d + 0.16), L.mat(f === h.floors - 1 ? '#f4f1ea' : h.wall, { roughness: 0.8 }), 0, 0.005, 0, { cast: false })); s.userData.y = f * FH + NC * CH + 0.075; P.slabs.push(s); }
    // oitões (paredes triangulares nas laterais) + madeiramento do telhado
    { const m = new Merge(), y0 = h.top, rh = h.rh;
      [-1, 1].forEach((s) => m.add(G.extrude([[-d / 2, 0], [d / 2, 0], [0, rh]], WT), h.wall, TM(s * (w / 2 - WT / 2) - WT / 2, y0, 0, 0, Math.PI / 2, 0)));
      P.gable = m.mesh(vmat({ roughness: 0.86 }));
      const t = new Merge(), ang = Math.atan(PITCH), run = h.run, sl = Math.hypot(run, run * PITCH);
      t.add(G.box(h.Wr, 0.16, 0.08), '#9a6a40', TM(0, y0 + rh + 0.02, 0));
      for (let x = -h.Wr / 2 + 0.15; x <= h.Wr / 2; x += 0.6) [1, -1].forEach((s) => t.add(G.box(0.06, 0.12, sl), '#a8744e', TM(x, y0 + rh - (run / 2) * PITCH + 0.0, s * run / 2, s * ang, 0, 0)));
      for (let k = 1; k <= 4; k++) [1, -1].forEach((s) => { const hz = (run * k) / 4.6; t.add(G.box(h.Wr, 0.06, 0.06), '#b88458', TM(0, y0 + rh - hz * PITCH + 0.09, s * hz)); });
      P.truss = t.mesh(woodM); }
    // beiral: testeiras e forro + calhas e condutores
    { const m = new Merge(), ang = Math.atan(PITCH), yE = h.eaveY, Wr = h.Wr, run = h.run;
      [1, -1].forEach((s) => { m.add(G.box(Wr + 0.04, 0.2, 0.04), '#f4f1ea', TM(0, yE + 0.02, s * (run + 0.02))); m.add(G.box(Wr, 0.03, OV - 0.05), '#ece8de', TM(0, h.top - 0.02, s * (d / 2 + OV / 2))); });
      [-1, 1].forEach((s) => [1, -1].forEach((zs) => m.add(G.box(0.04, 0.2, Math.hypot(run, run * PITCH)), '#f4f1ea', TM(s * (Wr / 2 + 0.02), yE + (run / 2) * PITCH + 0.03, zs * run / 2, zs * ang, 0, 0))));
      P.trim = m.mesh(trimM);
      const p = new Merge(), gc = '#dfe3e6', gy = yE - 0.06;
      [1, -1].forEach((s) => { p.add(G.box(Wr, 0.12, 0.14), gc, TM(0, gy, s * (run + 0.09))); p.add(G.box(0.02, 0.14, 0.16), gc, TM(-Wr / 2, gy, s * (run + 0.09))).add(G.box(0.02, 0.14, 0.16), gc, TM(Wr / 2, gy, s * (run + 0.09))); });
      // condutor da frente (canto direito) e do fundo (canto esquerdo) — descem pela parede
      const dsFront = [w / 2 - 0.2, d / 2 + 0.06], dsBack = [-w / 2 + 0.2, -d / 2 - 0.06];
      [[dsFront, 1], [dsBack, -1]].forEach(([[lx, lz], s]) => {
        p.rod([lx, gy - 0.06, s * (run + 0.09)], [lx, gy - 0.3, lz], 0.05, gc, 8).rod([lx, gy - 0.3, lz], [lx, -0.25, lz], 0.05, gc, 8);
        for (let yy = 0.6; yy < gy - 0.4; yy += 1.4) p.add(G.box(0.14, 0.03, 0.08), '#b9bec2', TM(lx, yy, lz - s * 0.03));
      });
      // pé do condutor do fundo: corre ao longo da lateral esquerda até a frente
      const lxs = -w / 2 - 0.12, yb = (lz) => { const q = W2L(h, lxs, 0, lz); return Lo.G(q.x, q.z) - h.floor + 0.06; };
      p.rod([dsBack[0], -0.25, dsBack[1]], [lxs, yb(-d / 2 - 0.06), -d / 2 - 0.06], 0.05, gc, 8);
      p.rod([lxs, yb(-d / 2 - 0.06), -d / 2 - 0.06], [lxs, yb(d / 2 + 0.3), d / 2 + 0.3], 0.05, gc, 8);
      P.pvc = p.mesh(pvcM);
      // saídas na sarjeta (mundo): da frente da casa até a guia, por baixo da calçada
      const curbZ = h.sf > 0 ? A.z0 + 0.06 : B.z1 - 0.06, out = new Merge();
      [[dsFront[0], dsFront[1] + 0.06], [lxs, d / 2 + 0.3]].forEach(([lx, lz]) => {
        const a = W2L(h, lx, 0, lz), gA = Lo.G(a.x, a.z) + 0.06, yo = H(a.x, curbZ) + 0.075;
        if (h.floor - 0.25 - gA > 0.05) out.rod([a.x, h.floor - 0.25, a.z], [a.x, gA, a.z], 0.05, gc, 8);
        out.rod([a.x, gA, a.z], [a.x, yo, curbZ], 0.05, gc, 8);
        out.add(G.cyl(0.065, 0.065, 0.06, 10), '#c9cdd0', TM(a.x, yo, curbZ, Math.PI / 2));
        downspouts.push({ x: a.x, y: yo, z: curbZ + 0.03 * h.sf, house: h.id, dir: h.sf });
      });
      P.outlet = out.mesh(pvcM);
      root.add(P.outlet); L.shadows(P.outlet);
      // telhado para a água (inclui beirais)
      const c0 = W2L(h, -Wr / 2, 0, -run), c1 = W2L(h, Wr / 2, 0, run);
      const mg = 0.08; roofs.push({ x0: Math.min(c0.x, c1.x) - mg, x1: Math.max(c0.x, c1.x) + mg, z0: Math.min(c0.z, c1.z) - mg, z1: Math.max(c0.z, c1.z) + mg, y: h.ridgeY, yEave: yE, house: h.id, ridgeZ: h.zc, gutterY: gy + h.floor });
    }
    // lote: muro baixo com portão e caminho (casas da rua A, que têm recuo de frente)
    if (h.sf > 0) { const m = new Merge(), zw = A.walkBack[0] - 0.12, xa = h.x - h.w / 2 - 0.4, xb = h.x + h.w / 2 + 0.4, xd = h.x + h.dx;
      [[xa, xd - 0.7], [xd + 0.7, xb]].forEach(([a, b]) => { const n = Math.max(1, Math.round((b - a) / 1.0)); for (let i = 0; i < n; i++) { const u0 = a + (b - a) * i / n, u1 = a + (b - a) * (i + 1) / n, g = Lo.G((u0 + u1) / 2, zw); m.add(G.box(u1 - u0 + 0.01, 0.9, 0.14), '#ece6da', TM((u0 + u1) / 2, g + 0.45, zw)).add(G.box(u1 - u0 + 0.03, 0.06, 0.2), '#b9b2a4', TM((u0 + u1) / 2, g + 0.92, zw)); } });
      [xd - 0.7, xd + 0.7].forEach((x) => m.add(G.box(0.22, 1.1, 0.22), '#ece6da', TM(x, Lo.G(x, zw) + 0.55, zw)));
      for (let i = 0; i < 7; i++) m.add(G.box(0.03, 0.9, 0.03), '#2d343a', TM(xd - 0.5 + i * 0.167, Lo.G(xd, zw) + 0.5, zw)); // portão de grade
      m.add(G.box(1.25, 0.04, 0.03), '#2d343a', TM(xd, Lo.G(xd, zw) + 0.95, zw)).add(G.box(1.25, 0.04, 0.03), '#2d343a', TM(xd, Lo.G(xd, zw) + 0.1, zw));
      const zf = h.bz1 + 0.5; m.add(G.box(1.1, 0.05, zw - zf), '#c9c2b4', TM(xd, Lo.G(xd, (zf + zw) / 2) + 0.03, (zf + zw) / 2));
      P.lot = m.mesh(vmat({ roughness: 0.85 })); root.add(P.lot); L.shadows(P.lot); }
    // árvore no quintal de algumas casas
    if (['h1', 'h3', 'h7', 'h10', 'h5'].includes(h.id)) { const lx = (h.id === 'h5' ? -1 : 1) * (w / 2 - 1.0), lz = -d / 2 - 0.9, q = W2L(h, lx, 0, lz); const tr = L.mesh(K.treeGeo(h.x * 3 + 1, 2.4, 1.2), vmat({ roughness: 0.9, flatShading: true }), q.x, Lo.G(q.x, q.z), q.z); root.add(tr); P.tree = tr; }
    // h4: interior (piso, móveis, parede interna) e porta aberta
    if (h.cutaway) {
      const m = new Merge(), fz = d / 2 - WT;
      m.add(G.box(w - 2 * WT, 0.03, d - 2 * WT), '#e8dcc6', TM(0, 0.015, 0));
      for (let x = -w / 2 + 0.6; x < w / 2; x += 0.6) m.add(G.box(0.012, 0.032, d - 2 * WT), '#cbbfa8', TM(x, 0.016, 0));
      m.add(G.box(w - 2 * WT, 2.75, 0.1), '#efe6d6', TM(0, 1.375, -0.4)); // parede interna (sala | quartos)
      m.add(G.box(2.4, 0.012, 1.7), '#7d3b4a', TM(1.0, 0.035, 1.0));   // tapete
      // sofá
      const sx = 1.0, sz = -0.0; m.add(G.rbox(2.0, 0.45, 0.85, 0.08), '#3c6fa8', TM(sx, 0.25, sz)).add(G.rbox(2.0, 0.5, 0.22, 0.08), '#3c6fa8', TM(sx, 0.7, sz - 0.33)).add(G.rbox(0.22, 0.6, 0.85, 0.08), '#33608f', TM(sx - 1.0, 0.42, sz)).add(G.rbox(0.22, 0.6, 0.85, 0.08), '#33608f', TM(sx + 1.0, 0.42, sz));
      [-0.45, 0.45].forEach((x) => m.add(G.rbox(0.8, 0.14, 0.6, 0.05), '#4a80bb', TM(sx + x, 0.52, sz + 0.05)));
      m.add(G.rbox(0.9, 0.06, 0.5, 0.02), '#8a5a36', TM(sx, 0.42, 1.0)); [[-0.38, -0.2], [0.38, -0.2], [-0.38, 0.2], [0.38, 0.2]].forEach(([x, z]) => m.add(G.box(0.04, 0.4, 0.04), '#6b4428', TM(sx + x, 0.2, 1.0 + z)));
      // estante com TV junto à parede direita
      m.add(G.box(0.45, 0.5, 1.6), '#6b4428', TM(w / 2 - WT - 0.25, 0.25, 0.9)).add(G.box(0.06, 0.75, 1.25), '#14181c', TM(w / 2 - WT - 0.3, 0.95, 0.9));
      // mesa de jantar com cadeiras (lado da porta)
      const tx = -0.9, tz = 0.9; m.add(G.box(1.2, 0.05, 0.8), '#a8744e', TM(tx, 0.76, tz)); [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(([x, z]) => m.add(G.box(0.05, 0.74, 0.05), '#7a4f30', TM(tx + x, 0.37, tz + z)));
      [[-0.3, -0.62], [0.3, -0.62], [-0.3, 0.62], [0.3, 0.62]].forEach(([x, z]) => { const s = Math.sign(z); m.add(G.box(0.42, 0.04, 0.4), '#c9934f', TM(tx + x, 0.46, tz + z)).add(G.box(0.42, 0.45, 0.04), '#c9934f', TM(tx + x, 0.7, tz + z + s * 0.19)); [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(([a, b]) => m.add(G.box(0.03, 0.45, 0.03), '#7a4f30', TM(tx + x + a, 0.22, tz + z + b))); });
      // geladeira e vaso de planta
      m.add(G.rbox(0.7, 1.75, 0.65, 0.05), '#eef1f3', TM(-w / 2 + WT + 0.4, 0.88, -0.05)).add(G.box(0.03, 0.5, 0.03), '#9aa3aa', TM(-w / 2 + WT + 0.76, 1.1, 0.2));
      m.add(G.cyl(0.18, 0.14, 0.35, 12), '#c96a3c', TM(w / 2 - WT - 0.35, 0.18, -0.05)).add(new THREE.IcosahedronGeometry(0.35, 1), '#3f8a3a', TM(w / 2 - WT - 0.35, 0.62, -0.05));
      // luminária pendente e quadro
      m.add(G.cyl(0.01, 0.01, 0.8, 4), '#333', TM(sx, 2.35, 0.9)).add(G.cyl(0.08, 0.25, 0.2, 14), '#f2c230', TM(sx, 1.9, 0.9));
      m.add(G.box(0.9, 0.6, 0.03), '#3a7ab0', TM(sx, 1.6, -0.33));
      P.inside = m.mesh(vmat({ roughness: 0.7 }));
      // porta aberta (folha girada ~80° para dentro)
      const dg = new THREE.Group(), leaf = new Merge();
      leaf.add(G.box(0.92, 2.18, 0.05), '#7a4b2a', TM(0.46, 1.09, 0)).add(G.sph(0.04, 8, 6), '#d9b25a', TM(0.82, 1.05, 0.04));
      for (let i = 0; i < 3; i++) leaf.add(G.box(0.72, 0.025, 0.02), '#5e3820', TM(0.46, 0.4 + i * 0.6, 0.03));
      const lm = leaf.mesh(vmat({ roughness: 0.5 })); dg.add(lm); dg.position.set(h.dx - 0.47, 0, fz - 0.02); dg.rotation.y = -1.35;
      const fr = new Merge(); fr.add(G.box(1.12, 0.08, WT + 0.06), '#f4f2ec', TM(h.dx, 2.24, d / 2 - WT / 2)).add(G.box(0.08, 2.2, WT + 0.06), '#f4f2ec', TM(h.dx - 0.52, 1.1, d / 2 - WT / 2)).add(G.box(0.08, 2.2, WT + 0.06), '#f4f2ec', TM(h.dx + 0.52, 1.1, d / 2 - WT / 2)).add(G.box(1.3, 0.05, 0.4), '#bfc3c6', TM(h.dx, 0.02, d / 2 + 0.05));
      const frm = fr.mesh(vmat({ roughness: 0.5 }));
      P.door = new THREE.Group(); P.door.add(dg, frm);
    }
    // monta no grupo local da casa
    const g = groupAt(h); h.g = g; h.P = P;
    ['gab', 'pile', 'rebar', 'radier', 'gable', 'truss', 'trim', 'pvc', 'inside', 'door'].forEach((k) => { if (P[k]) g.add(P[k]); });
    P.slabs.forEach((s) => g.add(s));
    L.shadows(g);
  });
  shared.downspouts = downspouts; shared.roofs = (shared.roofs || []).concat(roofs);

  /* ---------- atualização ---------- */
  const lastK = new Map();
  const setScale = (o, k, y0 = 0) => { o.visible = k > 0.002; const s = Math.max(1e-3, k); o.scale.y = s; o.position.y = y0 * (1 - s); };
  const pop = (k) => L.ease.back(L.clamp01(k));
  function updHouse(h, k) {
    const P = h.P, kk = (a, b) => L.prog(k, a, b);
    // canteiro
    const gk = kk(0, 0.06) * (1 - kk(0.3, 0.36)); P.gab.visible = gk > 0.002; P.gab.position.y = -1.3 * (1 - L.ease.out(gk));
    const pk = kk(0.02, 0.08) * (1 - kk(0.86, 0.92)); P.pile.visible = pk > 0.002; P.pile.position.y = -1.4 * (1 - L.ease.out(pk));
    P.rebar.visible = k > 0.06 && k < 0.2;
    const rk = kk(0.1, 0.2); P.radier.visible = rk > 0.002; P.radier.children[0].scale.y = Math.max(1e-3, rk); P.radier.children[1].visible = rk > 0.96; if (P.radier.children[2]) P.radier.children[2].visible = rk > 0.96;
    // alvenaria e lajes: [0.2, 0.62] dividido por pavimento (80 % fiadas, 20 % laje)
    const per = 0.42 / h.floors, plaster = kk(0.6, 0.68);
    const [i0, i1] = h.blocks;
    const fk = [];
    for (let f = 0; f < h.floors; f++) { const a = 0.2 + f * per; fk[f] = kk(a, a + per * 0.8); const s = h.P.slabs[f], sk = kk(a + per * 0.8, a + per); s.visible = sk > 0.002; s.position.y = s.userData.y + 1.6 * (1 - L.ease.out(sk)); }
    for (let i = i0; i < i1; i++) {
      const b = blocks[i], vis = fk[b.f] > b.idx + 1e-6, yk = vis ? 1 : 1e-4, gap = L.lerp(0.9, 1.0, plaster);
      if (!vis) _s.set(1e-4, 1e-4, 1e-4); else if (b.cut) _s.set(0.025, CH, WT + 0.03); else _s.set(b.len + 0.002, CH * gap, WT + plaster * 0.02);
      _m.compose(b.p, b.q, _s); blockMesh.setMatrixAt(i, _m);
      blockMesh.setColorAt(i, _c.copy(b.col0).lerp(b.col1, plaster));
    }
    // esquadrias
    for (const kd in OPEN) OPEN[kd].forEach((o, j) => { if (o.h !== h) return; const s = pop(kk(0.62 + (o.i % 6) * 0.015, 0.7 + (o.i % 6) * 0.015)); _s.set(o.sx * s, s, s); _m.compose(o.p, o.q, _s); openMesh[kd].setMatrixAt(j, _m); });
    // oitões, madeiramento, telhas, cumeeira, beiral, calhas
    setScale(P.gable, kk(0.62, 0.68), h.top);
    setScale(P.truss, pop(kk(0.64, 0.72)), h.top);
    const tl = kk(0.68, 0.92), [t0, t1] = h.tiles;
    for (let i = t0; i < t1; i++) {
      const tt = tiles[i], u = L.clamp01(tl * 1.25 - (tt.order / tt.n)), e = L.ease.out(L.clamp01(u * 4));
      _p.copy(tt.p).addScaledVector(tt.nrm, 0.6 * (1 - e)); _s.set(tt.sx, 1, 1).multiplyScalar(u > 0 ? 1 : 1e-4);
      _m.compose(_p, tt.q, _s); tileMesh.setMatrixAt(i, _m);
    }
    ridges.forEach((r, i) => { if (r.h !== h) return; const s = pop(L.clamp01(kk(0.88, 0.95) * 1.5 - r.i / r.n * 0.5)); _s.set(r.sx * (s > 0 ? 1 : 1e-4), s, s); _m.compose(r.p, r.q, _s); ridgeMesh.setMatrixAt(i, _m); });
    setScale(P.trim, kk(0.86, 0.92), h.top);
    const ck = kk(0.92, 0.98); P.pvc.visible = ck > 0.3; h.ck = ck;
    if (P.inside) { setScale(P.inside, pop(kk(0.68, 0.78))); P.door.visible = k > 0.66; }
    if (P.tree) { const tk2 = pop(kk(0.85, 1)); P.tree.visible = tk2 > 0.01; P.tree.scale.setScalar(Math.max(1e-3, tk2)); }
  }
  function update(t, S) {
    const hb = S.build.houses, kw = S.build.walks;
    let changed = false;
    for (const h of houses) {
      const k = L.prog(hb, h.a, h.a + DH);
      if (lastK.get(h.id) === k) continue;
      lastK.set(h.id, k); changed = true; updHouse(h, k);
    }
    if (changed) { blockMesh.instanceMatrix.needsUpdate = true; blockMesh.instanceColor.needsUpdate = true; tileMesh.instanceMatrix.needsUpdate = true; ridgeMesh.instanceMatrix.needsUpdate = true; for (const kd in openMesh) openMesh[kd].instanceMatrix.needsUpdate = true; }
    // muros e caminhos dos lotes vêm com as calçadas
    houses.forEach((h) => { h.P.outlet.visible = h.ck > 0.5 && kw > 0.75; if (h.P.lot) { const k = L.prog(kw, 0.4, 0.9); h.P.lot.visible = k > 0.002; h.P.lot.position.y = -1.2 * (1 - L.ease.out(k)); } });
  }
  return { root, update, houses };
}
