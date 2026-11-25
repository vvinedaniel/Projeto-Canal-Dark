// Peças compartilhadas do cenário "rede": materiais em cache, fusão de malhas, casas, árvores, carros, postes
// e o tubo-calha (tubo com o topo aberto, para enxergar o esgoto correndo por dentro).
export function makeKit(L) {
  const { THREE, BGU, PAL } = L;
  const cache = new Map();
  /** material padrão com cache (mesma cor + opções = mesmo material, para a fusão juntar tudo) */
  const M = (color, o = {}) => { const k = color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const G = (color, o = {}) => { const k = 'g' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.glossy(color, o)); return cache.get(k); };
  const shade = (color, k) => '#' + new THREE.Color(color).multiplyScalar(k).getHexString();

  /** Funde todas as malhas de um grupo (sem pai) em uma malha por material. Instâncias são preservadas. */
  function bake(src) {
    src.updateMatrixWorld(true);
    const by = new Map(), out = new THREE.Group(), keep = [];
    src.traverse((m) => {
      if (m.isInstancedMesh) { keep.push(m); return; }
      if (!m.isMesh) return;
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m.matrixWorld);
      const key = m.material.uuid + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0);
      if (!by.has(key)) by.set(key, { m, list: [] });
      by.get(key).list.push(g);
    });
    by.forEach(({ m, list }) => { const mm = new THREE.Mesh(BGU.mergeGeometries(list), m.material); mm.castShadow = m.castShadow; mm.receiveShadow = m.receiveShadow; out.add(mm); });
    keep.forEach((m) => { const mw = m.matrixWorld.clone(); out.add(m); mw.decompose(m.position, m.quaternion, m.scale); });
    return out;
  }

  /* ---------------- casa ---------------- */
  function gableRoof(w, d, roofM, wallM, ov = 0.45, pitch = 0.5) {
    const g = new THREE.Group(), rh = (d / 2) * Math.tan(pitch), sl = (d / 2 + ov) / Math.cos(pitch), W = w + 2 * ov;
    const tri = L.extrude([[-d / 2, 0], [d / 2, 0], [0, rh]], w - 0.02, wallM); tri.rotation.y = Math.PI / 2; tri.position.set(-(w - 0.02) / 2, 0, 0); g.add(tri);
    [1, -1].forEach((s) => {
      const p = new THREE.Group(); p.position.set(0, rh - ((d / 2 + ov) / 2) * Math.tan(pitch) + 0.1, s * (d / 2 + ov) / 2); p.rotation.x = s * pitch;
      p.add(L.box(W, 0.14, sl, roofM, 0, 0, 0));
      p.add(L.box(W + 0.04, 0.2, 0.12, M('#f4f1ea'), 0, -0.02, s * (sl / 2 - 0.04)));
      const n = Math.floor(W / 0.55);
      for (let i = 0; i <= n; i++) p.add(L.cyl(0.085, 0.085, sl, roofM, -W / 2 + 0.1 + i * ((W - 0.2) / n), 0.07, 0, 6).rotateX(Math.PI / 2));
      g.add(p);
    });
    g.add(L.cyl(0.14, 0.14, W, M(shade(roofM.color.getStyle(), 0.82), { roughness: 0.75 }), 0, rh + 0.2, 0, 8).rotateZ(Math.PI / 2));
    return g;
  }
  function hipRoof(w, d, roofM, ov = 0.5) {
    const g = new THREE.Group(), rh = Math.min(w, d) * 0.3;
    const geo = new THREE.CylinderGeometry(0.12, 1, 1, 4, 1).toNonIndexed(); geo.computeVertexNormals();
    const m = L.mesh(geo, roofM, 0, rh / 2 + 0.06, 0); m.rotation.y = Math.PI / 4;
    const h = new THREE.Group(); h.add(m); h.scale.set((w / 2 + ov) / 0.7071, rh, (d / 2 + ov) / 0.7071); g.add(h);
    g.add(L.box(w + 2 * ov, 0.12, d + 2 * ov, M('#f4f1ea'), 0, 0.02, 0));
    g.add(L.rbox(0.5, 0.22, 0.5, 0.05, M(shade(roofM.color.getStyle(), 0.8)), 0, rh + 0.05, 0));
    return g;
  }
  function tank(r = 0.62) { // caixa d'água azul
    const g = new THREE.Group(), b = G('#2c7fc4', { roughness: 0.35, side: THREE.DoubleSide });
    g.add(L.lathe([[0, 0], [r * 0.86, 0], [r, 0.12], [r, 0.78], [r * 1.06, 0.8], [r * 1.06, 0.88], [r * 0.7, 1.0], [0, 1.04]], b, 24));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * L.TAU; g.add(L.box(0.05, 0.6, 0.05, b, Math.cos(a) * r, 0.44, Math.sin(a) * r)); }
    return g;
  }
  /** Casa com a frente virada para +z. o: { w, d, floors, wall, roof, roofType:'gable'|'gableZ'|'hip'|'flat', door, annex:-1|0|1, porch, dish, tank } */
  function house(o = {}) {
    const g = new THREE.Group(), w = o.w ?? 7, d = o.d ?? 6.2, floors = o.floors ?? 1, h = floors * 2.85 + 0.1, y0 = 0.28;
    const wc = o.wall ?? PAL.wall, wall = M(wc, { roughness: 0.88 }), band = M(shade(wc, 0.78), { roughness: 0.9 }), trim = M('#f4f1ea', { roughness: 0.7 });
    const roofM = M(o.roof ?? PAL.roof, { roughness: 0.78 }), glassM = M('#4f86ad', { roughness: 0.1, metalness: 0.55 }), doorM = M(o.door ?? PAL.wood, { roughness: 0.55 });
    g.add(L.box(w + 0.36, y0, d + 0.36, M(PAL.concreteDark), 0, y0 / 2, 0));
    g.add(L.rbox(w, h, d, 0.05, wall, 0, y0 + h / 2, 0));
    g.add(L.box(w + 0.05, 0.55, d + 0.05, band, 0, y0 + 0.275, 0));
    const place = (obj, u, y, face) => {
      if (face === 'f') { obj.position.set(u, y, d / 2); }
      else if (face === 'b') { obj.position.set(u, y, -d / 2); obj.rotation.y = Math.PI; }
      else if (face === 'r') { obj.position.set(w / 2, y, u); obj.rotation.y = Math.PI / 2; }
      else { obj.position.set(-w / 2, y, u); obj.rotation.y = -Math.PI / 2; }
      g.add(obj);
    };
    const win = (u, y, face, ww = 1.25, wh = 1.15, shutters = false) => {
      const q = new THREE.Group();
      q.add(L.box(ww + 0.2, wh + 0.2, 0.1, trim, 0, 0, 0.02), L.box(ww, wh, 0.06, glassM, 0, 0, 0.065), L.box(0.06, wh, 0.05, trim, 0, 0, 0.09), L.box(ww, 0.06, 0.05, trim, 0, 0.12, 0.09), L.box(ww + 0.36, 0.08, 0.24, trim, 0, -wh / 2 - 0.12, 0.1));
      if (shutters) [-1, 1].forEach((s) => { q.add(L.box(0.42, wh + 0.1, 0.06, doorM, s * (ww / 2 + 0.33), 0, 0.05)); for (let i = 0; i < 4; i++) q.add(L.box(0.34, 0.04, 0.03, M(shade(o.door ?? PAL.wood, 0.7)), s * (ww / 2 + 0.33), -wh / 2 + 0.2 + i * (wh / 4), 0.09)); });
      place(q, u, y, face);
    };
    const yw = y0 + 1.55;
    // frente: porta + janelas
    const dx = o.doorX ?? -w * 0.18, door = new THREE.Group();
    door.add(L.box(1.2, 2.3, 0.1, trim, 0, 0, 0.02), L.rbox(0.96, 2.1, 0.09, 0.02, doorM, 0, -0.06, 0.06), L.box(0.7, 0.5, 0.03, glassM, 0, 0.5, 0.11), L.sph(0.05, L.metal(PAL.steel), 0.32, -0.15, 0.13));
    place(door, dx, y0 + 1.15, 'f');
    g.add(L.box(1.7, 0.14, 0.9, M(PAL.concrete), dx, 0.07 + 0.07, d / 2 + 0.5), L.box(1.4, 0.14, 0.5, M(PAL.concrete), dx, 0.07, d / 2 + 1.1));
    win(dx + w * 0.42, yw, 'f', 1.5, 1.2, o.shutters); if (w > 6.4) win(dx - w * 0.24 < -w / 2 + 1 ? dx + w * 0.72 : dx - w * 0.26, yw, 'f', 0.9, 1.1);
    win(-d * 0.2, yw, 'r'); win(d * 0.22, yw, 'r', 0.8, 0.7); win(d * 0.18, yw, 'l'); win(-d * 0.22, yw, 'l', 1.1, 1.1);
    win(-w * 0.22, yw, 'b', 1.3, 1.1); win(w * 0.24, yw + 0.2, 'b', 0.7, 0.6);
    if (floors > 1) { const y2 = y0 + 2.85 + 1.5; win(-w * 0.24, y2, 'f', 1.3, 1.2, true); win(w * 0.24, y2, 'f', 1.3, 1.2, true); win(0, y2, 'r'); win(0, y2, 'l'); win(0, y2, 'b', 1.4, 1.1); g.add(L.box(w + 0.08, 0.12, d + 0.08, trim, 0, y0 + 2.9, 0)); }
    if (o.porch) { // varanda sobre a porta
      const pw = 2.6, pm = M(shade(o.roof ?? PAL.roof, 0.92), { roughness: 0.78 });
      const s = L.box(pw, 0.12, 1.7, pm, dx, y0 + 2.55, d / 2 + 0.8); s.rotation.x = 0.2; g.add(s);
      [-1, 1].forEach((k) => g.add(L.box(0.13, 2.3, 0.13, trim, dx + k * (pw / 2 - 0.15), y0 + 1.15, d / 2 + 1.45)));
    }
    // telhado
    const top = y0 + h, rt = o.roofType ?? 'gable';
    let roof;
    if (rt === 'gable') roof = gableRoof(w, d, roofM, wall);
    else if (rt === 'gableZ') { roof = gableRoof(d, w, roofM, wall); roof.rotation.y = Math.PI / 2; }
    else if (rt === 'hip') roof = hipRoof(w, d, roofM);
    else { roof = new THREE.Group(); roof.add(L.box(w + 0.3, 0.16, d + 0.3, trim, 0, 0.08, 0), L.box(w + 0.3, 0.5, 0.14, wall, 0, 0.4, d / 2 + 0.08), L.box(w + 0.3, 0.5, 0.14, wall, 0, 0.4, -d / 2 - 0.08), L.box(0.14, 0.5, d + 0.3, wall, w / 2 + 0.08, 0.4, 0), L.box(0.14, 0.5, d + 0.3, wall, -w / 2 - 0.08, 0.4, 0), L.box(w, 0.04, d, M('#b9bcc0'), 0, 0.18, 0)); const tk = tank(); tk.position.set(w * 0.22, 0.5, -d * 0.18); roof.add(L.box(1.5, 0.3, 1.5, M(PAL.concrete), w * 0.22, 0.33, -d * 0.18), tk); const sp = L.box(1.9, 0.06, 1.1, M('#1f3550', { roughness: 0.15, metalness: 0.6 }), -w * 0.2, 0.55, 0.3); sp.rotation.x = 0.35; roof.add(sp, L.box(1.9, 0.5, 0.06, M(PAL.steel), -w * 0.2, 0.38, -0.2)); }
    roof.position.y = top; g.add(roof);
    if (o.dish) { const dg = new THREE.Group(); dg.add(L.cyl(0.03, 0.03, 0.7, M(PAL.steel), 0, 0.35, 0, 6)); const ds = L.lathe([[0, 0], [0.2, 0.03], [0.36, 0.12], [0.42, 0.2]], M('#dfe3e6', { side: THREE.DoubleSide }), 16); ds.position.y = 0.72; ds.rotation.set(0.9, 0, 0.3); dg.add(ds); dg.position.set(w / 2 - 0.3, top - 0.2, -d / 2 + 0.3); g.add(dg); }
    // anexo/garagem com laje e caixa d'água
    if (o.annex) {
      const s = o.annex, aw = 3.1, ah = 2.7, ad = d * 0.82, ax = s * (w / 2 + aw / 2 - 0.02), az = -(d - ad) / 2;
      g.add(L.box(aw + 0.2, y0, ad + 0.2, M(PAL.concreteDark), ax, y0 / 2, az), L.rbox(aw, ah, ad, 0.04, wall, ax, y0 + ah / 2, az), L.box(aw + 0.3, 0.16, ad + 0.3, trim, ax, y0 + ah + 0.08, az));
      const gd = M('#e9e6df', { roughness: 0.5 }); g.add(L.box(2.4, 2.1, 0.08, gd, ax, y0 + 1.05, az + ad / 2 + 0.03));
      for (let i = 0; i < 5; i++) g.add(L.box(2.4, 0.03, 0.03, M('#b5b2aa'), ax, y0 + 0.35 + i * 0.4, az + ad / 2 + 0.08));
      if (o.tank !== false) { const tk = tank(0.58); tk.position.set(ax, y0 + ah + 0.4, az - ad * 0.15); g.add(L.box(1.4, 0.24, 1.4, M(PAL.concrete), ax, y0 + ah + 0.28, az - ad * 0.15), tk); }
    }
    return g;
  }

  /* ---------------- árvore, arbusto ---------------- */
  function tree(o = {}) {
    const g = new THREE.Group(), h = o.h ?? 3.2, r = o.r ?? 1.7, rd = L.rng(o.seed ?? 1);
    const greens = ['#4f9d3c', '#5fb347', '#3f8a3a', '#6cc24a', '#47a05a'];
    g.add(L.cyl(0.13, 0.24, h, M(PAL.wood, { roughness: 0.9 }), 0, h / 2, 0, 8));
    const n = 4 + Math.floor(rd() * 2);
    for (let i = 0; i < n; i++) {
      const a = rd() * L.TAU, k = i === 0 ? 0 : 0.55, s = r * (i === 0 ? 1 : 0.55 + rd() * 0.3);
      const geo = new THREE.IcosahedronGeometry(1, 1), b = L.mesh(geo, M(greens[Math.floor(rd() * greens.length)], { roughness: 0.9, flatShading: true }), Math.cos(a) * r * k, h + r * 0.45 + (i === 0 ? 0 : (rd() - 0.3) * r * 0.6), Math.sin(a) * r * k);
      b.scale.set(s, s * 0.82, s); b.rotation.set(rd() * 3, rd() * 3, 0); g.add(b);
    }
    return g;
  }
  function bush(seed = 1, s = 0.6) {
    const g = new THREE.Group(), rd = L.rng(seed);
    for (let i = 0; i < 3; i++) { const b = L.mesh(new THREE.IcosahedronGeometry(1, 1), M(['#3f8a3a', '#4f9d3c', '#5aa84a'][i], { roughness: 0.9, flatShading: true }), (i - 1) * s * 0.8, s * 0.7, (rd() - 0.5) * 0.3); b.scale.set(s * (0.9 + rd() * 0.3), s * (0.8 + rd() * 0.3), s); g.add(b); }
    return g;
  }

  /* ---------------- carro (aponta para +x) ---------------- */
  function car(color = PAL.red) {
    const g = new THREE.Group(), body = G(color, { roughness: 0.25 }), dark = M('#18222c', { roughness: 0.12, metalness: 0.6 }), tire = M('#15191d', { roughness: 0.92 });
    const b = L.extrude([[-2.0, 0.28], [2.0, 0.28], [2.06, 0.55], [1.96, 0.82], [1.2, 0.92], [0.68, 1.4], [-0.9, 1.44], [-1.74, 0.98], [-2.04, 0.88], [-2.08, 0.5]], 1.54, body, { bevel: 0.08 }); b.position.z = -0.77; g.add(b);
    const wn = L.extrude([[1.1, 0.95], [0.66, 1.33], [-0.86, 1.37], [-1.56, 0.99]], 1.73, dark); wn.position.z = -0.865; g.add(wn);
    g.add(L.box(0.1, 0.44, 1.75, body, -0.1, 1.16, 0));
    const ws = L.box(0.04, 0.6, 1.36, dark, 0.965, 1.17, 0); ws.rotation.z = 0.82; g.add(ws);
    const rs = L.box(0.04, 0.84, 1.36, dark, -1.34, 1.2, 0); rs.rotation.z = -1.07; g.add(rs);
    [[1.3, 0.83], [1.3, -0.83], [-1.3, 0.83], [-1.3, -0.83]].forEach(([x, z]) => { g.add(L.cyl(0.34, 0.34, 0.24, tire, x, 0.34, z, 20).rotateX(Math.PI / 2), L.cyl(0.2, 0.2, 0.26, L.metal(PAL.steel), x, 0.34, z, 12).rotateX(Math.PI / 2)); });
    [0.55, -0.55].forEach((z) => { g.add(L.box(0.06, 0.16, 0.36, L.glow('#fff6d8', 1.2), 2.08, 0.66, z, { cast: false }), L.box(0.06, 0.14, 0.34, L.glow('#ff3b30', 0.9), -2.1, 0.74, z, { cast: false })); });
    g.add(L.box(0.12, 0.16, 1.7, M('#2a323a'), 2.06, 0.38, 0), L.box(0.12, 0.16, 1.7, M('#2a323a'), -2.1, 0.4, 0));
    return g;
  }

  /* ---------------- poste de rua ---------------- */
  function pole(o = {}) {
    const g = new THREE.Group(), h = o.h ?? 8.5, c = M('#b9b4a8', { roughness: 0.9 });
    g.add(L.cyl(0.11, 0.2, h, c, 0, h / 2, 0, 10));
    g.add(L.box(2.0, 0.12, 0.1, M(PAL.wood, { roughness: 0.9 }), 0, h - 0.5, 0));
    [-0.85, 0, 0.85].forEach((x) => g.add(L.cyl(0.05, 0.07, 0.2, M('#6b4a32'), x, h - 0.34, 0, 8)));
    g.add(L.cyl(0.22, 0.22, 0.5, M('#8c9499', { roughness: 0.5, metalness: 0.4 }), 0.28, h - 1.6, 0, 12));
    const arm = new THREE.Mesh(new THREE.TubeGeometry(L.curve([[0, h - 2.2, 0], [0.8, h - 1.7, 0], [1.9, h - 1.55, 0], [2.6, h - 1.6, 0]]), 12, 0.045, 6), L.metal(PAL.steel)); arm.castShadow = true; g.add(arm);
    g.add(L.rbox(0.8, 0.14, 0.34, 0.05, M('#5c666e', { roughness: 0.4, metalness: 0.5 }), 2.75, h - 1.6, 0), L.box(0.6, 0.03, 0.24, L.glow('#fff1c4', 1.3), 2.78, h - 1.69, 0, { cast: false }));
    return g;
  }

  /* ---------------- tubo-calha: tubo com o topo aberto ----------------
     pts: curva ou lista de pontos 3D; arc = meia-abertura da parede (rad, medido a partir do fundo).
     Retorna { group, curve, water } — water é a lâmina de esgoto (level 0..1 do diâmetro interno). */
  function openPipe(pts, r, material, o = {}) {
    const c = pts instanceof THREE.Curve ? pts : (pts.length === 2 ? new THREE.LineCurve3(L.v3(pts[0]), L.v3(pts[1])) : L.curve(pts, false, o.tension ?? 0.35));
    const seg = o.seg ?? 32, A = o.arc ?? 2.1, wall = o.wall ?? r * 0.15, ri = r - wall, na = o.radial ?? 10;
    const up = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3();
    const rings = [], wr = [], lvl = o.level ?? 0.35, hw = -ri + 2 * ri * lvl, half = Math.sqrt(Math.max(0, ri * ri - hw * hw)) * 0.985;
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, P = c.getPointAt(u); c.getTangentAt(u, T); S.crossVectors(T, up).normalize(); U.crossVectors(S, T).normalize();
      const pt = (a, R) => P.clone().addScaledVector(S, Math.sin(a) * R).addScaledVector(U, -Math.cos(a) * R);
      const ring = [pt(-A, r)];
      for (let j = 0; j <= na; j++) ring.push(pt(-A + (2 * A * j) / na, r));
      ring.push(pt(A, r));
      for (let j = 0; j <= na; j++) ring.push(pt(A - (2 * A * j) / na, ri));
      ring.push(pt(-A, ri));
      rings.push(ring);
      wr.push([P.clone().addScaledVector(S, -half).addScaledVector(U, hw), P.clone().addScaledVector(S, half).addScaledVector(U, hw)]);
    }
    const g = new THREE.Group();
    g.add(L.loft(rings, material, { closed: true }));
    let water = null;
    if (o.water !== false) { water = L.loft(wr, o.waterMat ?? M(PAL.sewage, { roughness: 0.15, side: THREE.DoubleSide }), {}); water.castShadow = false; g.add(water); }
    return { group: g, curve: c, water, r, ri, hw };
  }

  return { M, G, shade, bake, house, tree, bush, car, pole, tank, openPipe };
}
