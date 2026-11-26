// Kit do módulo casa: mescla com cor por vértice (adaptado do Ep. 02, city/kit.js), sólidos de revolução em corte,
// canos em corte em qualquer plano (sobre L.cutPipe), caminhos com cotovelos arredondados e texturas procedurais.
export function makeKit(L) {
  const { THREE, BGU, TAU } = L;
  const cache = new Map();
  const M = (color, o = {}) => { const k = 'm' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const vmat = (o = {}) => L.mat(0xffffff, { vertexColors: true, ...o });
  const TM = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    rbox: (w, h, d, r = 0.03, s = 2) => new L.RoundedBoxGeometry(w, h, d, s, r),
    cyl: (rt, rb, h, seg = 16, open = false, a0 = 0, al = TAU) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open, a0, al),
    sph: (r, ws = 14, hs = 10) => new THREE.SphereGeometry(r, ws, hs),
    torus: (R, r, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc),
    lathe: (profile, seg = 24, a0 = 0, a1 = TAU) => new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg, a0, a1),
    shape: (pts, holes = []) => { const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); holes.forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))))); return new THREE.ShapeGeometry(s, 6); },
    extrude: (pts, depth, holes = [], bevel = 0, cs = 10) => {
      const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
      holes.forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
      return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: cs });
    }
  };
  const _col = new THREE.Color();
  class Merge {
    constructor() { this.list = []; }
    add(geo, color = '#ffffff', m = null) {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      const p = g.attributes.position, n = p.count, c = new Float32Array(n * 3);
      if (typeof color === 'function') for (let i = 0; i < n; i++) { color(p.getX(i), p.getY(i), p.getZ(i), _col); c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
      else { _col.set(color); for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; } }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      if (m) g.applyMatrix4(m);
      this.list.push(g); return this;
    }
    rod(a, b, r, color, seg = 8) {
      const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return this.add(new THREE.CylinderGeometry(r, r, len, seg), color, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    }
    get empty() { return this.list.length === 0; }
    geo() { return BGU.mergeGeometries(this.list, false); }
    mesh(material, o) { return L.mesh(this.geo(), material ?? vmat(), 0, 0, 0, o); }
  }

  /* ---------- sólidos de revolução em corte ----------
     poly = polígono fechado [[r, y], ...] no semiplano r ≥ 0 (a seção da peça: pode ter furo/canal interno).
     back: metade de trás (z < 0) + as duas faces de corte no plano z = 0 (cor de corte). front: metade da frente. */
  function revolve(poly, seg = 28, half = 'back') {
    const loop = [...poly, poly[0]].map((p) => new THREE.Vector2(Math.max(0, p[0]), p[1]));
    const a0 = half === 'back' ? Math.PI / 2 : half === 'front' ? -Math.PI / 2 : 0, al = half === 'full' ? TAU : Math.PI;
    const g = new THREE.LatheGeometry(loop, seg, a0, al);
    return g;
  }
  /** faces de corte (as duas, em x>0 e x<0) de um polígono de revolução, no plano z = 0 */
  function revolveCaps(poly) {
    const right = G.shape(poly.map(([r, y]) => [r, y]));
    const left = G.shape(poly.map(([r, y]) => [-r, y]).reverse());
    return BGU.mergeGeometries([right.toNonIndexed(), left.toNonIndexed()]);
  }

  /* ---------- caminho com cotovelos arredondados ----------
     pts: vértices de uma poligonal; rad: raio dos cotovelos. Devolve pontos densos (o cutPipe passa por todos). */
  function fillet(pts, rad = 0.08, n = 6) {
    const P = pts.map((p) => L.v3(p).clone()), out = [P[0]];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i - 1], b = P[i], c = P[i + 1], d1 = b.clone().sub(a), d2 = c.clone().sub(b), l1 = d1.length(), l2 = d2.length();
      const r = Math.min(rad, l1 * 0.45, l2 * 0.45); d1.normalize(); d2.normalize();
      if (d1.dot(d2) > 0.999) { out.push(b); continue; }
      const p0 = b.clone().addScaledVector(d1, -r), p1 = b.clone().addScaledVector(d2, r);
      for (let k = 0; k <= n; k++) { const u = k / n, q = p0.clone().multiplyScalar((1 - u) * (1 - u)).addScaledVector(b, 2 * u * (1 - u)).addScaledVector(p1, u * u); out.push(q); }
    }
    out.push(P[P.length - 1]);
    // pontos intermediários nas retas longas (o spline do cutPipe fica reto entre eles)
    const dense = [out[0]];
    for (let i = 1; i < out.length; i++) { const a = out[i - 1], b = out[i], L0 = a.distanceTo(b), k = Math.max(1, Math.floor(L0 / 0.25)); for (let j = 1; j <= k; j++) dense.push(a.clone().lerp(b, j / k)); }
    return dense;
  }

  /* ---------- cano em corte num plano qualquer ----------
     plane: 'z' (corte voltado para +z; pontos com z = const), 'y' (corte para cima; y = const), 'x' (corte para +x; x = const).
     pts: pontos 3D do mundo, todos no plano. Usa L.cutPipe (meio-tubo com parede, face de corte e água). */
  function planePipe(pts3, o = {}) {
    const plane = o.plane ?? 'z', P = fillet(pts3, o.bend ?? 0.07);
    let loc, g = new THREE.Group();
    if (plane === 'z') { loc = P.map((p) => [p.x, p.y]); g.position.z = P[0].z; }
    else if (plane === 'y') { loc = P.map((p) => [p.x, -p.z]); g.position.y = P[0].y; g.rotation.x = -Math.PI / 2; }
    else { loc = P.map((p) => [-p.z, p.y]); g.position.x = P[0].x; g.rotation.y = Math.PI / 2; }
    let len = 0; for (let i = 1; i < P.length; i++) len += P[i].distanceTo(P[i - 1]);
    const cp = L.cutPipe(loc, { r: o.r ?? 0.03, wall: o.wall, mat: o.mat, cutMat: o.cutMat, seg: Math.max(16, Math.min(260, Math.round(len * 40))), radial: o.radial ?? 10, tension: 0.0 });
    g.add(cp.group);
    const w = o.water ? cp.waterIn(1, o.water, o.wOpacity ?? 0.9) : null;
    if (w) { w.group.children.forEach((m) => { m.renderOrder = 2; }); }
    // curva no mundo (para Chevrons/Flow) — mesma parametrização por comprimento
    const world = L.curve(P.map((p) => [p.x, p.y, p.z]), false, 0.0);
    return { group: g, cp, water: w, curve: world, len, plane, outline: cp.outline };
  }

  /* ---------- texturas ---------- */
  function canvasTex(w, h, draw, o = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d'); draw(g, w, h, L.rng(o.seed ?? (w + h)));
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
    return t;
  }
  return { M, vmat, TM, G, Merge, revolve, revolveCaps, fillet, planePipe, canvasTex };
}
