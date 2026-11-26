// ETA 2 — peças comuns: materiais em cache, fusão de malhas, hastes, flanges, tubos com curvas, válvulas,
// guarda-corpos, escadas, texturas em canvas. Tudo determinístico (sem Math.random).
export function makeKit(L) {
  const { THREE, BGU } = L, PI = Math.PI;
  const cache = new Map();
  const M = (color, o = {}) => { const k = 'm' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const G = (color, o = {}) => { const k = 'g' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.glossy(color, o)); return cache.get(k); };
  const MAT = {
    conc: M('#c9cdcf', { roughness: 0.88 }), concOld: M('#bcc1c3', { roughness: 0.9 }), concDark: M('#9aa2a8', { roughness: 0.9 }),
    cut: M('#e9e4da', { roughness: 0.92 }), slab: M('#b9bec1', { roughness: 0.9 }),
    steel: L.metal('#c3ccd4'), galv: M('#a8b2b9', { roughness: 0.42, metalness: 0.62 }), dark: M('#262c33', { roughness: 0.6 }),
    rubber: M('#1c1f23', { roughness: 0.9 }), iron: M('#45515c', { roughness: 0.5, metalness: 0.5 }),
    yellow: G('#f2b31b', { roughness: 0.32 }), rail: M('#f2c230', { roughness: 0.45, metalness: 0.2 }),
    blue: G('#2f6fbf', { roughness: 0.34 }), blueDark: G('#244f86', { roughness: 0.4 }), red: G('#cf3a2b', { roughness: 0.35 }),
    green: G('#2f9d57', { roughness: 0.4 }), white: M('#f2f3f0', { roughness: 0.55 }), whiteG: G('#f6f7f5', { roughness: 0.25 }),
    treated: G('#2f7fd6', { roughness: 0.35 }), raw: G('#8f7c63', { roughness: 0.45 }), grey: G('#8e99a3', { roughness: 0.4 }),
    chem: G('#e8e3d8', { roughness: 0.4 }), grate: M('#7d878f', { roughness: 0.5, metalness: 0.5 }),
    glassW: L.glass('#cfe9f5', 0.28), black: G('#15181c', { roughness: 0.3 }), wood: M('#a8744e', { roughness: 0.7 }),
    brickWall: M('#e8e1d3', { roughness: 0.85 }), floor: M('#d9d6cf', { roughness: 0.6 }), tile: M('#eef0ef', { roughness: 0.35 })
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), up = V(0, 1, 0);

  /** Funde as malhas de um grupo (sem pai) em uma malha por material (instanciadas e malhas com UV/textura ficam). */
  function bake(src) {
    src.updateMatrixWorld(true);
    const by = new Map(), out = new THREE.Group(), keep = [];
    src.traverse((m) => {
      if (m.isInstancedMesh || (m.isMesh && m.material.map) || m.userData.keep) { keep.push(m); return; }
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
  /** cilindro de a até b */
  function rod(a, b, r, m, seg = 12) {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), c = L.cyl(r, r, d.length(), m, 0, 0, 0, seg);
    c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(up, d.clone().normalize());
    return c;
  }
  /** caixa de a=[x,y,z] (canto mínimo) até b (canto máximo) */
  const bx = (a, b, m) => L.box(b[0] - a[0], b[1] - a[1], b[2] - a[2], m, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  const rotTo = (o, dir) => { if (dir === 'x') o.rotation.z = PI / 2; if (dir === 'z') o.rotation.x = PI / 2; return o; };
  /** flange com parafusos (dir = 'x'|'y'|'z') */
  function flange(g, x, y, z, r, dir, m, bolts = 8, boltM = MAT.steel) {
    g.add(rotTo(L.cyl(r * 1.45, r * 1.45, r * 0.34, m, x, y, z, 18), dir));
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * L.TAU, R = r * 1.24, c = Math.cos(a) * R, s = Math.sin(a) * R;
      const b = L.cyl(r * 0.08, r * 0.08, r * 0.5, boltM, 0, 0, 0, 5);
      if (dir === 'y') b.position.set(x + c, y, z + s); if (dir === 'x') b.position.set(x, y + c, z + s); if (dir === 'z') b.position.set(x + c, y + s, z);
      g.add(rotTo(b, dir));
    }
  }
  /** tubulação por polilinha com curvas (joelhos) arredondadas e flanges nas pontas */
  function pipe(g, pts, r, m, o = {}) {
    pts = pts.map(L.v3);
    const bend = o.bend ?? r * 1.6, path = new THREE.CurvePath();
    let cur = pts[0].clone();
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (i < pts.length - 1) {
        const din = p.clone().sub(pts[i - 1]).normalize(), dout = pts[i + 1].clone().sub(p).normalize();
        const k = Math.min(bend, p.distanceTo(pts[i - 1]) * 0.45, p.distanceTo(pts[i + 1]) * 0.45);
        const a = p.clone().addScaledVector(din, -k), b = p.clone().addScaledVector(dout, k);
        path.add(new THREE.LineCurve3(cur, a)); path.add(new THREE.QuadraticBezierCurve3(a, p.clone(), b)); cur = b;
      } else path.add(new THREE.LineCurve3(cur, p.clone()));
    }
    const n = Math.max(8, Math.round(path.getLength() / (o.step ?? 0.25)));
    const t = L.mesh(new THREE.TubeGeometry(path, n, r, o.radial ?? 14, false), m, 0, 0, 0, { cast: o.cast !== false });
    g.add(t);
    if (o.flanges !== false) {
      [[pts[0], pts[1]], [pts[pts.length - 1], pts[pts.length - 2]]].forEach(([p, q], i) => {
        if (o.flanges === 'end' && i === 0) return; if (o.flanges === 'start' && i === 1) return;
        const d = p.clone().sub(q).normalize(), dir = Math.abs(d.x) > 0.9 ? 'x' : Math.abs(d.y) > 0.9 ? 'y' : 'z';
        flange(g, p.x - d.x * r * 0.17, p.y - d.y * r * 0.17, p.z - d.z * r * 0.17, r, dir, m, 8);
      });
    }
    return path;
  }
  /** registro de gaveta com volante (eixo do tubo em +z, haste para +y). Devolve { g, wheel } */
  function gateValve(r, m, wheelM = MAT.red) {
    const g = new THREE.Group();
    g.add(L.rbox(r * 2.3, r * 2.5, r * 1.8, r * 0.3, m, 0, 0, 0));
    flange(g, 0, 0, -r * 1.0, r, 'z', m, 8); flange(g, 0, 0, r * 1.0, r, 'z', m, 8);
    g.add(L.cyl(r * 0.55, r * 0.8, r * 1.6, m, 0, r * 2.0, 0, 12), L.cyl(r * 0.12, r * 0.12, r * 2.2, MAT.steel, 0, r * 3.4, 0, 8));
    const hw = new THREE.Group(); hw.add(L.torus(r * 1.2, r * 0.14, wheelM, 0, 0, 0)); for (let i = 0; i < 3; i++) { const sp = L.cyl(r * 0.08, r * 0.08, r * 2.4, wheelM, 0, 0, 0, 6); sp.rotation.z = (i * PI) / 3; hw.add(sp); }
    hw.rotation.x = PI / 2; hw.position.y = r * 4.3; g.add(hw);
    return { g, wheel: hw };
  }
  /** válvula borboleta com atuador elétrico (eixo do tubo em +z, atuador para +y). Devolve { g, disc } */
  function butterfly(r, m, actM = MAT.blueDark) {
    const g = new THREE.Group();
    g.add(rotTo(L.cyl(r * 1.25, r * 1.25, r * 0.7, m, 0, 0, 0, 20), 'z'));
    flange(g, 0, 0, -r * 0.42, r, 'z', m, 8); flange(g, 0, 0, r * 0.42, r, 'z', m, 8);
    const disc = new THREE.Group(); disc.add(rotTo(L.cyl(r * 0.92, r * 0.92, r * 0.1, MAT.steel, 0, 0, 0, 18), 'z')); g.add(disc);
    g.add(L.cyl(r * 0.18, r * 0.24, r * 1.0, m, 0, r * 1.6, 0, 10)); // pescoço
    g.add(L.rbox(r * 1.5, r * 1.1, r * 1.3, r * 0.15, actM, 0, r * 2.55, 0)); // atuador
    g.add(L.cyl(r * 0.45, r * 0.45, r * 1.0, actM, r * 1.15, r * 2.55, 0, 12).rotateZ(PI / 2)); // motor do atuador
    g.add(L.cyl(r * 0.32, r * 0.32, r * 0.2, MAT.yellow, 0, r * 3.2, 0, 14)); // indicador de posição
    return { g, disc };
  }
  /** válvula de retenção (corpo bojudo) com eixo em +y */
  function checkValve(r, m) {
    const g = new THREE.Group();
    g.add(L.lathe([[r * 0.95, -r * 1.6], [r * 1.25, -r * 1.4], [r * 1.5, -r * 0.5], [r * 1.5, r * 0.5], [r * 1.25, r * 1.4], [r * 0.95, r * 1.6]], m, 18));
    g.add(L.rbox(r * 0.7, r * 1.4, r * 1.5, r * 0.12, m, r * 1.45, 0, 0)); // tampa lateral
    g.add(L.cyl(r * 0.1, r * 0.1, r * 1.0, MAT.steel, r * 1.9, r * 0.3, 0, 6).rotateZ(PI / 2)); // eixo da portinhola
    g.add(L.box(r * 0.12, r * 0.9, r * 0.12, MAT.red, r * 2.35, -r * 0.1, 0)); // alavanca/contrapeso
    flange(g, 0, -r * 1.65, 0, r, 'y', m, 8); flange(g, 0, r * 1.65, 0, r, 'y', m, 8);
    return g;
  }
  /** manômetro (mostrador voltado para +z). Devolve { g, needle } */
  function gauge(s = 0.12) {
    const g = new THREE.Group();
    g.add(L.cyl(s * 0.12, s * 0.12, s * 0.9, MAT.steel, 0, -s * 0.9, 0, 6));
    g.add(L.cyl(s, s, s * 0.45, MAT.steel, 0, 0, 0, 22).rotateX(PI / 2));
    const face = L.cyl(s * 0.88, s * 0.88, 0.01, M('#fbfbf6', { roughness: 0.4 }), 0, 0, s * 0.23, 22); face.rotation.x = PI / 2; g.add(face);
    const arc = new THREE.Mesh(new THREE.RingGeometry(s * 0.62, s * 0.72, 20, 1, -PI * 0.25, PI * 0.5), L.flat('#2fae5a')); arc.position.z = s * 0.24; g.add(arc);
    const needle = new THREE.Group(); needle.add(L.box(s * 0.06, s * 0.7, 0.01, MAT.red, 0, s * 0.33, 0)); needle.position.z = s * 0.25; g.add(needle);
    return { g, needle };
  }
  /** guarda-corpo ao longo de uma polilinha [[x,z],...] na altura y (montantes a cada ~1,2 m) */
  function railing(g, pts, y, o = {}) {
    const h = o.h ?? 1.1, m = o.mat ?? MAT.rail, r = o.r ?? 0.03;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx_, bz] = pts[i + 1], len = Math.hypot(bx_ - ax, bz - az), n = Math.max(1, Math.round(len / 1.3));
      for (let k = 0; k <= n; k++) { if (k === 0 && i > 0) continue; const x = L.lerp(ax, bx_, k / n), z = L.lerp(az, bz, k / n); g.add(rod([x, y, z], [x, y + h, z], r, m, 6)); }
      g.add(rod([ax, y + h, az], [bx_, y + h, bz], r, m, 6), rod([ax, y + h * 0.5, az], [bx_, y + h * 0.5, bz], r * 0.8, m, 6));
      g.add(rod([ax, y + 0.08, az], [bx_, y + 0.08, bz], r * 0.6, m, 4));
    }
  }
  /** escada de degraus (de a=[x,y,z] embaixo até b em cima), largura w, com corrimãos */
  function stairs(g, a, b, w = 0.9, m = MAT.galv) {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), n = Math.max(3, Math.round(d.y / 0.19)), hor = V(d.x, 0, d.z), side = V(-hor.z, 0, hor.x).normalize().multiplyScalar(w / 2);
    for (let i = 1; i <= n; i++) { const p = a.clone().addScaledVector(d, (i - 0.5) / n); const s = L.box(w, 0.04, 0.28, m, p.x, p.y, p.z); s.rotation.y = Math.atan2(hor.x, hor.z); g.add(s); }
    [1, -1].forEach((sg) => { const o = side.clone().multiplyScalar(sg); g.add(rod(a.clone().add(o), b.clone().add(o), 0.035, m, 6)); g.add(rod(a.clone().add(o).add(V(0, 1, 0)), b.clone().add(o).add(V(0, 1, 0)), 0.025, MAT.rail, 6)); g.add(rod(a.clone().add(o), a.clone().add(o).add(V(0, 1, 0)), 0.025, MAT.rail, 6)); g.add(rod(b.clone().add(o), b.clone().add(o).add(V(0, 1, 0)), 0.025, MAT.rail, 6)); });
  }
  /** passarela de grade metálica (caixa fina) de [x0,z0] a [x1,z1] na cota y */
  function walkway(g, x0, z0, x1, z1, y, m = MAT.grate) {
    g.add(L.box(x1 - x0, 0.05, z1 - z0, m, (x0 + x1) / 2, y - 0.025, (z0 + z1) / 2));
    const along = x1 - x0 > z1 - z0;
    if (along) { g.add(L.box(x1 - x0, 0.14, 0.05, MAT.galv, (x0 + x1) / 2, y - 0.08, z0 + 0.03), L.box(x1 - x0, 0.14, 0.05, MAT.galv, (x0 + x1) / 2, y - 0.08, z1 - 0.03)); }
    else { g.add(L.box(0.05, 0.14, z1 - z0, MAT.galv, x0 + 0.03, y - 0.08, (z0 + z1) / 2), L.box(0.05, 0.14, z1 - z0, MAT.galv, x1 - 0.03, y - 0.08, (z0 + z1) / 2)); }
  }
  /** textura de canvas */
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    return tx;
  }
  return { M, G, MAT, V, bake, rod, bx, flange, pipe, gateValve, butterfly, checkValve, gauge, railing, stairs, walkway, canvasTex, rotTo };
}
