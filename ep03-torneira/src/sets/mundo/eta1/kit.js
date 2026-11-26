// ETA 1 — peças comuns: materiais em cache, fusão de malhas por material, hastes, flanges, válvulas, motores,
// guarda-corpos, passarelas, escadas, luminárias, placas com texto, construtor de faces (quads) e água com volume.
// Adaptado de ep02-alagamento/src/sets/cidade/reservoir/kit.js (bake, rod, flange, canvasTex, gateValve).
export function makeKit(L) {
  const { THREE, BGU } = L, PI = Math.PI, DS = THREE.DoubleSide;
  const cache = new Map();
  const M = (color, o = {}) => { const k = 'm' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const G = (color, o = {}) => { const k = 'g' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.glossy(color, o)); return cache.get(k); };
  const MAT = {
    conc: M('#c7ccd0', { roughness: 0.88, side: DS }), concB: M('#b9bfc4', { roughness: 0.9, side: DS }), concNew: M('#d5d8da', { roughness: 0.85, side: DS }),
    cut: M('#e9e3d6', { roughness: 0.92, side: DS }), slab: M('#aeb5bb', { roughness: 0.92, side: DS }),
    steel: L.metal('#bcc6cf'), galv: M('#a7b1b8', { roughness: 0.42, metalness: 0.6 }), dark: M('#2a3036', { roughness: 0.6 }),
    grate: M('#59626b', { roughness: 0.55, metalness: 0.5 }), iron: M('#3d4a57', { roughness: 0.5, metalness: 0.5 }),
    ironRaw: M('#7d6a55', { roughness: 0.55, metalness: 0.35 }), rubber: M('#1c1f23', { roughness: 0.9 }),
    rail: G('#f2c230', { roughness: 0.4 }), railDark: M('#c9971a', { roughness: 0.5 }), toe: M('#e7b522', { roughness: 0.55 }),
    blue: G('#3f6fa8', { roughness: 0.38 }), motor: G('#4a6f96', { roughness: 0.42 }), gray: M('#7f8992', { roughness: 0.5, metalness: 0.3 }),
    red: G('#cf3a2b', { roughness: 0.35 }), white: M('#f1f2ee', { roughness: 0.55 }), wood: M('#9c6c45', { roughness: 0.75 }),
    panel: M('#d9dcd6', { roughness: 0.5, metalness: 0.2 }), panelDark: M('#3b434b', { roughness: 0.5 }),
    glassDark: M('#2c4a5e', { roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.6 }),
    lampOn: L.glow('#fff1cc', 1.4), ledG: L.glow('#3df07a', 2.2), ledR: L.glow('#ff5a4e', 1.6), ledY: L.glow('#ffd23f', 1.8),
    roof: M('#8e979e', { roughness: 0.8, side: DS }), wall: M('#e6dfd0', { roughness: 0.85, side: DS }), wallCut: M('#f3ede0', { roughness: 0.9, side: DS }),
    floorTile: M('#b9c2c6', { roughness: 0.7, side: DS }), bund: M('#c9a35a', { roughness: 0.6, side: DS })
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), up = V(0, 1, 0);
  const clamp01 = L.clamp01, ph = (k, a, b) => clamp01((k - a) / (b - a)), ss = L.sstep;

  /** Funde as malhas de um grupo em uma malha por material (preserva uv se o material tiver textura). */
  function bake(src) {
    src.updateMatrixWorld(true);
    const by = new Map(), out = new THREE.Group(), keep = [];
    src.traverse((m) => {
      if (m.isInstancedMesh || m.userData.keep) { keep.push(m); return; }
      if (!m.isMesh) return;
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      const hasMap = !!m.material.map;
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal' && !(hasMap && k === 'uv')) g.deleteAttribute(k); });
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m.matrixWorld);
      const key = m.material.uuid + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0);
      if (!by.has(key)) by.set(key, { m, list: [] });
      by.get(key).list.push(g);
    });
    by.forEach(({ m, list }) => { const mm = new THREE.Mesh(BGU.mergeGeometries(list), m.material); mm.castShadow = m.castShadow; mm.receiveShadow = m.receiveShadow; out.add(mm); });
    keep.forEach((m) => { const mw = m.matrixWorld.clone(); if (m.parent) m.parent.remove(m); out.add(m); mw.decompose(m.position, m.quaternion, m.scale); });
    return out;
  }
  const noShadow = (o) => { o.traverse((m) => { if (m.isMesh) m.castShadow = false; }); return o; };
  /** cilindro de a até b */
  function rod(a, b, r, m, seg = 10) {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), c = L.cyl(r, r, d.length(), m, 0, 0, 0, seg);
    c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(up, d.clone().normalize());
    return c;
  }
  /** caixa (seção w×h) de a até b (vigas, perfis) */
  function beam(a, b, w, h, m) {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), len = d.length(), bx = L.box(w, len, h, m, 0, 0, 0);
    bx.position.copy(a).addScaledVector(d, 0.5); bx.quaternion.setFromUnitVectors(up, d.normalize());
    return bx;
  }
  const rot = (o, dir) => { if (dir === 'x') o.rotation.z = PI / 2; if (dir === 'z') o.rotation.x = PI / 2; return o; };
  /** flange com parafusos ao redor de um eixo (dir = 'x'|'y'|'z') */
  function flange(g, x, y, z, r, dir, m, bolts = 8, boltM = MAT.steel) {
    g.add(rot(L.cyl(r * 1.45, r * 1.45, r * 0.32, m, x, y, z, 20), dir));
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * L.TAU, R = r * 1.22, c = Math.cos(a) * R, s = Math.sin(a) * R;
      const b = L.cyl(r * 0.085, r * 0.085, r * 0.5, boltM, 0, 0, 0, 6); b.castShadow = false;
      if (dir === 'y') b.position.set(x + c, y, z + s); if (dir === 'x') b.position.set(x, y + c, z + s); if (dir === 'z') b.position.set(x + c, y + s, z);
      g.add(rot(b, dir));
    }
  }
  /** registro de gaveta com volante; eixo do tubo ao longo de dir ('x'|'z'|'y'), haste para +y (ou +z se dir='y').
      Devolve { group, wheel } (gire wheel.rotation.z para animar). */
  function gateValve(r, m = MAT.iron, dir = 'z', wheelM = MAT.red) {
    const g = new THREE.Group(), body = new THREE.Group();
    body.add(L.rbox(r * 2.3, r * 2.5, r * 1.8, r * 0.3, m, 0, 0, 0));
    flange(body, 0, 0, -r * 1.0, r, 'z', m, 8); flange(body, 0, 0, r * 1.0, r, 'z', m, 8);
    body.add(L.cyl(r * 0.55, r * 0.8, r * 1.6, m, 0, r * 2.0, 0, 12), L.cyl(r * 0.13, r * 0.13, r * 2.2, MAT.steel, 0, r * 3.4, 0, 8));
    const wheel = new THREE.Group(); wheel.add(L.torus(r * 1.25, r * 0.16, wheelM, 0, 0, 0));
    for (let i = 0; i < 3; i++) { const sp = L.cyl(r * 0.09, r * 0.09, r * 2.45, wheelM, 0, 0, 0, 6); sp.rotation.z = (i * PI) / 3; wheel.add(sp); }
    wheel.add(L.cyl(r * 0.25, r * 0.25, r * 0.3, wheelM, 0, 0, 0, 10).rotateX(PI / 2));
    const wp = new THREE.Group(); wp.rotation.x = PI / 2; wp.position.y = r * 4.3; wp.add(wheel); body.add(wp);
    if (dir === 'x') body.rotation.y = PI / 2; if (dir === 'y') body.rotation.x = PI / 2;
    g.add(body); noShadow(wheel);
    return { group: g, wheel };
  }
  /** motor elétrico aletado com eixo em +x (comprimento len, raio r), base com pés; centro no eixo */
  function motor(len = 0.6, r = 0.2, m = MAT.motor) {
    const g = new THREE.Group();
    g.add(rot(L.cyl(r, r, len, m, 0, 0, 0, 24), 'x'));
    const nf = 14;
    for (let i = 0; i < nf; i++) { const a = (i / nf) * L.TAU; const f = L.box(len * 0.86, r * 0.16, r * 0.07, m, 0, Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02); f.rotation.x = a; f.castShadow = false; g.add(f); }
    g.add(rot(L.cyl(r * 1.06, r * 1.06, len * 0.08, MAT.gray, -len * 0.5, 0, 0, 24), 'x'), rot(L.cyl(r * 1.06, r * 1.06, len * 0.08, MAT.gray, len * 0.5, 0, 0, 24), 'x'));
    g.add(rot(L.cyl(r * 0.98, r * 0.85, len * 0.22, MAT.gray, -len * 0.62, 0, 0, 20), 'x'));     // tampa do ventilador
    g.add(L.box(r * 0.8, r * 0.5, r * 0.7, m, len * 0.05, r * 1.1, 0));                          // caixa de ligação
    g.add(L.box(len * 0.8, r * 0.16, r * 1.9, MAT.gray, 0, -r * 1.0, 0));                         // pés
    g.add(rot(L.cyl(r * 0.18, r * 0.18, len * 0.3, MAT.steel, len * 0.62, 0, 0, 10), 'x'));      // ponta de eixo
    return g;
  }
  /** redutor (caixa com nervuras) centrado na origem */
  function gearbox(w = 0.6, h = 0.55, d = 0.55, m = MAT.blue) {
    const g = new THREE.Group();
    g.add(L.rbox(w, h, d, Math.min(w, h, d) * 0.12, m, 0, 0, 0));
    for (let i = -1; i <= 1; i += 2) g.add(L.box(w * 0.08, h * 0.9, d * 1.06, m, i * w * 0.3, 0, 0));
    g.add(L.box(w * 1.15, h * 0.1, d * 1.15, MAT.gray, 0, -h * 0.5, 0));
    g.add(L.cyl(w * 0.06, w * 0.06, h * 0.12, MAT.steel, 0, h * 0.52, 0, 8));                    // respiro
    return g;
  }
  /** guarda-corpo ao longo da polilinha pts [[x,y,z],...] (y = piso): montantes, corrimão, travessa, rodapé */
  function railing(g, pts, o = {}) {
    const h = o.h ?? 1.1, sp = o.spacing ?? 1.6, m = o.m ?? MAT.rail, r = o.r ?? 0.03;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = L.v3(pts[i]), b = L.v3(pts[i + 1]), len = a.distanceTo(b), n = Math.max(1, Math.round(len / sp));
      for (let k = (i === 0 ? 0 : 1); k <= n; k++) { const p = a.clone().lerp(b, k / n); const post = rod(p, p.clone().add(V(0, h, 0)), r, m, 6); post.castShadow = false; g.add(post); }
      [h, h * 0.5].forEach((yy) => { const rr = rod(a.clone().add(V(0, yy, 0)), b.clone().add(V(0, yy, 0)), r * 0.9, m, 6); rr.castShadow = false; g.add(rr); });
      if (o.toe !== false) { const tb = beam(a.clone().add(V(0, 0.06, 0)), b.clone().add(V(0, 0.06, 0)), 0.12, 0.015, MAT.toe); tb.castShadow = false; g.add(tb); }
    }
  }
  /** passarela de grade (piso) entre x0..x1, z0..z1 em y (topo), com perfis laterais */
  function walkway(g, x0, x1, z0, z1, y, o = {}) {
    const w = x1 - x0, d = z1 - z0;
    g.add(L.box(w, 0.05, d, MAT.grate, (x0 + x1) / 2, y - 0.025, (z0 + z1) / 2));
    if (o.edges !== false) {
      if (w > d) { [z0, z1].forEach((z) => g.add(L.box(w, 0.16, 0.06, MAT.galv, (x0 + x1) / 2, y - 0.08, z))); }
      else { [x0, x1].forEach((x) => g.add(L.box(0.06, 0.16, d, MAT.galv, x, y - 0.08, (z0 + z1) / 2))); }
    }
  }
  /** escada (degraus de grade + longarinas + corrimãos) subindo de p0=[x,y,z] até a altura y1 na direção dir=[dx,dz] */
  function stair(g, p0, y1, dir, w = 0.9, o = {}) {
    const [x, y0, z] = p0, rise = y1 - y0, run = rise / Math.tan((o.angle ?? 40) * PI / 180), n = Math.max(2, Math.round(rise / 0.19));
    const dx = dir[0], dz = dir[1], px = -dz, pz = dx; // perpendicular
    const P = (u, s, yy) => V(x + dx * run * u + px * s, y0 + rise * u + yy, z + dz * run * u + pz * s);
    [-w / 2, w / 2].forEach((s) => g.add(beam(P(0, s, -0.1), P(1, s, -0.1), 0.05, 0.22, MAT.galv)));
    for (let i = 1; i <= n; i++) { const u = (i - 0.5) / n, c = P(u, 0, 0); const st = L.box(Math.abs(dx) > 0.5 ? run / n : w, 0.04, Math.abs(dx) > 0.5 ? w : run / n, MAT.grate, c.x, c.y, c.z); st.castShadow = false; g.add(st); }
    if (o.rails !== false) [-w / 2, w / 2].forEach((s) => { g.add(rod(P(0, s, 0.95), P(1, s, 0.95), 0.028, MAT.rail, 6)); for (let k = 0; k <= 3; k++) g.add(rod(P(k / 3, s, 0), P(k / 3, s, 0.95), 0.025, MAT.rail, 6)); });
    return run;
  }
  /** escada marinheiro com gaiola, encostada numa parede (normal da parede = nrm [nx,nz]) de y0 a y1 */
  function ladder(g, x, z, y0, y1, nrm) {
    const [nx, nz] = nrm, px = -nz, pz = nx, off = 0.18;
    [-0.22, 0.22].forEach((s) => g.add(rod([x + nx * off + px * s, y0, z + nz * off + pz * s], [x + nx * off + px * s, y1 + 1.0, z + nz * off + pz * s], 0.025, MAT.galv, 6)));
    for (let y = y0 + 0.3; y < y1 + 0.05; y += 0.3) g.add(rod([x + nx * off - px * 0.22, y, z + nz * off - pz * 0.22], [x + nx * off + px * 0.22, y, z + nz * off + pz * 0.22], 0.018, MAT.galv, 5));
    for (let y = y0 + 2.2; y < y1 + 0.9; y += 0.9) { const c = L.torus(0.36, 0.015, MAT.galv, x + nx * (off + 0.36), y, z + nz * (off + 0.36)); c.rotation.x = PI / 2; c.castShadow = false; g.add(c); }
    for (let k = 0; k < 5; k++) { const a = PI * 0.15 + (k / 4) * PI * 0.7, cx = Math.cos(a) * 0.36, cz = Math.sin(a) * 0.36; g.add(rod([x + nx * (off + 0.36) + px * cx + nx * cz, y0 + 2.2, z + nz * (off + 0.36) + pz * cx + nz * cz], [x + nx * (off + 0.36) + px * cx + nx * cz, y1 + 0.9, z + nz * (off + 0.36) + pz * cx + nz * cz], 0.012, MAT.galv, 4)); }
  }
  /** poste de iluminação com luminária (glow) */
  function lamp(g, x, y, z, h = 2.6, arm = [0.5, 0]) {
    g.add(rod([x, y, z], [x, y + h, z], 0.045, MAT.galv, 8));
    g.add(rod([x, y + h, z], [x + arm[0], y + h + 0.08, z + arm[1]], 0.03, MAT.galv, 6));
    g.add(L.box(0.36, 0.08, 0.2, MAT.gray, x + arm[0], y + h + 0.05, z + arm[1]));
    const b = L.box(0.3, 0.03, 0.15, MAT.lampOn, x + arm[0], y + h, z + arm[1]); b.castShadow = false; g.add(b);
  }
  /** textura com texto (placas) */
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    return tx;
  }
  /** placa com texto (plano voltado para +z); lines = ['linha 1', 'linha 2'] */
  function sign(lines, w, h, o = {}) {
    const px = 256, cw = Math.round(px * w), chh = Math.round(px * h);
    const tx = canvasTex(cw, chh, (c, W, H) => {
      c.fillStyle = o.bg ?? '#f4f4ef'; c.fillRect(0, 0, W, H);
      if (o.stripe) { c.fillStyle = o.stripe; c.fillRect(0, 0, W, H * 0.16); c.fillRect(0, H * 0.84, W, H * 0.16); }
      c.strokeStyle = o.border ?? '#2a3036'; c.lineWidth = H * 0.04; c.strokeRect(c.lineWidth / 2, c.lineWidth / 2, W - c.lineWidth, H - c.lineWidth);
      c.fillStyle = o.fg ?? '#1d242b'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const n = lines.length, fs = Math.min(H * (o.size ?? 0.5) / Math.max(1, n * 0.9), W * 0.9);
      lines.forEach((s, i) => { c.font = `${i === 0 ? 800 : 600} ${i === 0 ? fs : fs * 0.78}px sans-serif`; let f = i === 0 ? fs : fs * 0.78; while (c.measureText(s).width > W * 0.9 && f > 8) { f *= 0.92; c.font = `${i === 0 ? 800 : 600} ${f}px sans-serif`; } c.fillText(s, W / 2, H * (0.5 + (i - (n - 1) / 2) * 0.36 * (n > 1 ? 1.2 : 1))); });
    });
    const m = new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6, side: THREE.DoubleSide, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: o.glow ?? 0.18 });
    const p = L.mesh(new THREE.PlaneGeometry(w, h), m, 0, 0, 0, { cast: false });
    p.userData.keep = true;
    return p;
  }
  /** construtor de faces planas (quads/tri) para peças de seção variável */
  function QB() {
    const pos = [];
    const P = (p) => pos.push(p[0], p[1], p[2]);
    return {
      quad(a, b, c, d) { P(a); P(b); P(c); P(a); P(c); P(d); },
      tri(a, b, c) { P(a); P(b); P(c); },
      get n() { return pos.length; },
      geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return g; },
      mesh(m) { return L.mesh(this.geo(), m); }
    };
  }
  /** retângulo vertical voltado para +z (faces de corte) */
  const capZ = (x0, x1, y0, y1, z, m = MAT.cut) => { const p = L.mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), m, (x0 + x1) / 2, (y0 + y1) / 2, z, { cast: false }); return p; };
  /** tubo ao longo de uma polilinha com cantos arredondados (raio de curva rc); devolve a malha com o comprimento
      percorrido por segmento para crescer com setDrawRange (grow(k)) */
  function pipe(pts, r, m, o = {}) {
    const rc = o.bend ?? r * 2.5, path = new THREE.CurvePath(), P = pts.map(L.v3);
    let cur = P[0].clone();
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1];
      if (!c) { path.add(new THREE.LineCurve3(cur.clone(), b.clone())); break; }
      const d1 = b.clone().sub(a).normalize(), d2 = c.clone().sub(b).normalize();
      const k = Math.min(rc, a.distanceTo(b) * 0.45, b.distanceTo(c) * 0.45);
      const p1 = b.clone().addScaledVector(d1, -k), p2 = b.clone().addScaledVector(d2, k);
      path.add(new THREE.LineCurve3(cur.clone(), p1)); path.add(new THREE.QuadraticBezierCurve3(p1, b.clone(), p2)); cur = p2;
    }
    const len = path.getLength(), seg = Math.max(8, Math.min(o.maxSeg ?? 400, Math.round(len / (o.step ?? 0.25)) + P.length * 6));
    const geo = new THREE.TubeGeometry(path, seg, r, o.radial ?? 8, false);
    const mm = L.mesh(geo, m); mm.castShadow = o.cast ?? r > 0.08;
    const per = (o.radial ?? 8) * 6;
    mm.userData.grow = (k) => { geo.setDrawRange(0, Math.round(seg * clamp01(k)) * per); mm.visible = k > 0.002; };
    mm.userData.path = path; mm.userData.len = len;
    return mm;
  }
  /** água com volume numa caixa: superfície (com subdivisão nx em x) + face vertical no corte (z = zf) + laterais
      opcionais. Geometria relativa ao fundo (y = 0..h): ajuste o nível com setLevel(k). col(x, yRel) → THREE.Color */
  function waterBox(x0, x1, zb, zf, y0, h, color, op = 0.6, o = {}) {
    const nx = o.nx ?? 24, ny = o.ny ?? 6, pos = [], cols = [], idx = [], col = o.col, aTop = o.topA ?? Math.min(0.95, op + 0.3), aFront = o.frontA ?? op;
    let A = 1;
    const add = (x, y, z) => { pos.push(x, y, z); const c = col ? col(x, y / h, z) : new THREE.Color(color); cols.push(c.r, c.g, c.b, A); return pos.length / 3 - 1; };
    const grid = (f, nu, nv) => { const base = pos.length / 3; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) add(...f(i / nu, j / nv)); for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, b, d, a, d, c); } };
    A = aTop; grid((u, v) => [L.lerp(x0, x1, u), h, L.lerp(zf, zb, v)], nx, 2);       // topo
    A = aFront; grid((u, v) => [L.lerp(x0, x1, u), L.lerp(0, h, v), zf], nx, ny);     // frente (corte)
    if (o.sides) { grid((u, v) => [x0, L.lerp(0, h, v), L.lerp(zf, zb, u)], 3, ny); grid((u, v) => [x1, L.lerp(0, h, v), L.lerp(zb, zf, u)], 3, ny); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 4)); g.setIndex(idx); g.computeVertexNormals();
    const wm = o.material ?? L.water('#ffffff', 0.999, { vertexColors: true, side: DS });
    const m = L.mesh(g, wm, 0, y0, 0, { cast: false }); m.renderOrder = o.order ?? 2;
    m.userData.setLevel = (k) => { m.scale.y = Math.max(0.001, k); m.visible = k > 0.004; };
    m.userData.recolor = (f) => { const ca = g.attributes.color, pa = g.attributes.position, c = new THREE.Color(); for (let i = 0; i < pa.count; i++) { f(pa.getX(i), pa.getY(i) / h, pa.getZ(i), c); ca.setXYZ(i, c.r, c.g, c.b); } ca.needsUpdate = true; };
    return m;
  }
  /** linha fina (planta) ao longo de pontos — para "ghost" de tubulações */
  function ghostLine(pts, gmat) { const g = new THREE.BufferGeometry().setFromPoints(pts.map(L.v3)); const l = new THREE.Line(g, gmat); l.renderOrder = 5; return l; }
  /** conta triângulos e draw calls de um objeto */
  function stats(obj) { let tris = 0, calls = 0; obj.traverse((m) => { if (m.isMesh) { const g = m.geometry, n = g.index ? g.index.count : g.attributes.position.count; tris += (n / 3) * (m.isInstancedMesh ? m.count : 1); calls++; } else if (m.isLine || m.isLineSegments) calls++; }); return { tris: Math.round(tris), calls }; }
  return { M, G, MAT, V, PI, ph, ss, clamp01, bake, noShadow, rod, beam, flange, gateValve, motor, gearbox, railing, walkway, stair, ladder, lamp, canvasTex, sign, QB, capZ, pipe, waterBox, ghostLine, stats };
}
