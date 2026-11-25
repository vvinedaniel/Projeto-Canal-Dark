// Peças reutilizáveis do cenário eteA: materiais, guarda-corpos, árvores, prédios, veículos, pessoas.
export function makeKit(L) {
  const { THREE, PAL, TAU, BGU } = L;
  const up = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _a = new THREE.Vector3(), _d = new THREE.Vector3(), _m = new THREE.Matrix4();
  const v3 = L.v3;

  /* ---------- texturas procedurais ---------- */
  function canvasTex(size, draw, repeat) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; draw(cv.getContext('2d'), size);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.anisotropy = 4;
    if (repeat) tx.repeat.set(repeat, repeat); return tx;
  }
  const grassTex = canvasTex(256, (g, n) => {
    const rd = L.rng(21); g.fillStyle = '#ffffff'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) { const v = 200 + rd() * 55; g.fillStyle = `rgba(${v - 30},${v},${v - 40},.35)`; const r = 3 + rd() * 14; g.beginPath(); g.ellipse(rd() * n, rd() * n, r, r * (0.5 + rd() * 0.6), rd() * 3, 0, TAU); g.fill(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = rd() < 0.5 ? 'rgba(40,80,20,.16)' : 'rgba(255,255,200,.12)'; g.fillRect(rd() * n, rd() * n, 1.5, 1.5 + rd() * 3); }
  }, 1 / 14);
  const cutTex = canvasTex(256, (g, n) => { // concreto em corte: massa clara com brita
    const rd = L.rng(8); g.fillStyle = '#e4e2dc'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 420; i++) { const v = 150 + rd() * 60; g.fillStyle = `rgba(${v},${v - 3},${v - 10},.75)`; const r = 2 + rd() * 5; g.beginPath(); g.ellipse(rd() * n, rd() * n, r, r * (0.55 + rd() * 0.4), rd() * 3, 0, TAU); g.fill(); }
  }, 1 / 1.6);
  const asphaltTex = canvasTex(128, (g, n) => { const rd = L.rng(4); g.fillStyle = '#fff'; g.fillRect(0, 0, n, n); for (let i = 0; i < 1600; i++) { const v = rd() < 0.5 ? 255 : 150; g.fillStyle = `rgba(${v},${v},${v},.18)`; g.fillRect(rd() * n, rd() * n, 2, 2); } }, 1 / 6);

  const jointTex = canvasTex(256, (g, n) => { // concreto com juntas de fôrma (UV em metros)
    const rd = L.rng(17); g.fillStyle = '#f1f1ee'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 60; i++) { g.fillStyle = rd() < 0.5 ? 'rgba(120,125,130,.07)' : 'rgba(255,255,255,.25)'; const r = 10 + rd() * 40; g.beginPath(); g.ellipse(rd() * n, rd() * n, r, r * (0.4 + rd() * 0.5), rd() * 3, 0, TAU); g.fill(); }
    g.strokeStyle = 'rgba(70,80,90,.42)'; g.lineWidth = 4; g.strokeRect(0, 0, n, n);
    g.fillStyle = 'rgba(60,70,80,.3)'; [[0.25, 0.3], [0.75, 0.3], [0.25, 0.7], [0.75, 0.7]].forEach(([x, y]) => { g.beginPath(); g.arc(x * n, y * n, 3.5, 0, TAU); g.fill(); });
  });
  jointTex.repeat.set(1 / 2.4, 1 / 1.2);
  const paveTex = jointTex.clone(); paveTex.repeat.set(1 / 2, 1 / 2); paveTex.needsUpdate = true;

  /* ---------- materiais ---------- */
  const DS = THREE.DoubleSide;
  const M = {
    concrete: L.mat(PAL.concrete, { roughness: 0.92 }),
    concreteJ: L.mat('#d6dadc', { map: jointTex, roughness: 0.92 }),
    sidewalkJ: L.mat('#ddd8cd', { map: paveTex, roughness: 0.92 }),
    concreteDS: L.mat(PAL.concrete, { roughness: 0.92, side: DS }),
    concreteDark: L.mat(PAL.concreteDark, { roughness: 0.92 }),
    cut: L.mat('#ffffff', { map: cutTex, roughness: 0.9, side: DS }),
    grass: L.mat(PAL.grass, { map: grassTex, roughness: 1 }),
    grassDark: L.mat(PAL.grassDark, { roughness: 1 }),
    asphalt: L.mat(PAL.asphalt, { map: asphaltTex, roughness: 0.95 }),
    sidewalk: L.mat(PAL.sidewalk, { roughness: 0.9 }),
    steel: L.metal(PAL.steel, { roughness: 0.42, metalness: 0.7 }),
    steelDS: L.metal(PAL.steel, { roughness: 0.42, metalness: 0.7, side: DS }),
    galv: L.metal('#9aa7b1', { roughness: 0.5, metalness: 0.65 }),
    iron: L.metal(PAL.iron, { roughness: 0.55, metalness: 0.6 }),
    dark: L.mat(PAL.dark, { roughness: 0.6 }),
    rubber: L.mat('#20252b', { roughness: 0.85 }),
    rail: L.mat(PAL.yellow, { roughness: 0.45, metalness: 0.25 }),
    yellow: L.mat(PAL.yellow, { roughness: 0.5, metalness: 0.15 }),
    blue: L.mat(PAL.blue, { roughness: 0.45, metalness: 0.25 }),
    green: L.mat(PAL.green, { roughness: 0.5, metalness: 0.2 }),
    red: L.mat(PAL.red, { roughness: 0.5, metalness: 0.15 }),
    white: L.mat('#f3f5f6', { roughness: 0.6 }),
    wall: L.mat('#eef0ee', { roughness: 0.85 }),
    wallBlue: L.mat('#2c6f9f', { roughness: 0.8 }),
    glass: L.glossy('#27485f', { roughness: 0.08, metalness: 0.4 }),
    grating: L.metal('#77838d', { roughness: 0.6, metalness: 0.55 }),
    trunk: L.mat('#6f5139', { roughness: 0.95 }),
    skin: L.mat('#d9a47c', { roughness: 0.7 }),
    vest: L.mat('#ff7a1a', { roughness: 0.6, emissive: '#ff7a1a', emissiveIntensity: 0.12 }),
    jeans: L.mat('#2b3f63', { roughness: 0.8 })
  };

  /* ---------- barras e guarda-corpos ---------- */
  function segMatrix(a, b, r, out) {
    _d.subVectors(b, a); const len = _d.length(); _q.setFromUnitVectors(up, _d.normalize());
    _a.addVectors(a, b).multiplyScalar(0.5); return out.compose(_a, _q, _s.set(r, len, r));
  }
  /** cilindro entre dois pontos */
  function rod(a, b, r, m, seg = 10) {
    const me = L.cyl(1, 1, 1, m, 0, 0, 0, seg); segMatrix(v3(a), v3(b), r, _m); _m.decompose(me.position, me.quaternion, me.scale); return me;
  }
  /** vários cilindros [[a,b,r],...] numa só InstancedMesh */
  function rods(list, m, seg = 8) {
    const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, seg), m, list.length);
    list.forEach((s, i) => im.setMatrixAt(i, segMatrix(v3(s[0]), v3(s[1]), s[2] ?? 0.03, _m)));
    im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; return im;
  }
  class Rails {
    constructor(o = {}) { this.h = o.h ?? 1.1; this.r = o.r ?? 0.03; this.step = o.step ?? 1.5; this.mat = o.mat ?? M.rail; this.list = []; }
    add(pts, closed = false) {
      pts = pts.map((p) => v3(p).clone()); const n = pts.length, h = this.h, r = this.r, t = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
      for (let i = 0; i < (closed ? n : n - 1); i++) {
        const a = pts[i], b = pts[(i + 1) % n], k = Math.max(1, Math.round(a.distanceTo(b) / this.step));
        for (let j = 0; j < k; j++) { const p = a.clone().lerp(b, j / k); this.list.push([p, t(p, h), r * 1.25]); }
        this.list.push([t(a, h), t(b, h), r * 1.15], [t(a, h * 0.52), t(b, h * 0.52), r * 0.8], [t(a, 0.08), t(b, 0.08), r * 0.8]);
      }
      if (!closed) { const p = pts[n - 1]; this.list.push([p, t(p, h), r * 1.25]); }
      return this;
    }
    /** arco em planta (convenção do torno: x = R sen φ, z = R cos φ) */
    arc(cx, y, cz, R, f0, f1, closed = false) {
      const n = Math.max(3, Math.round((Math.abs(f1 - f0) * R) / this.step)), pts = [];
      for (let i = 0; i <= (closed ? n - 1 : n); i++) { const f = f0 + ((f1 - f0) * i) / n; pts.push([cx + R * Math.sin(f), y, cz + R * Math.cos(f)]); }
      return this.add(pts, closed);
    }
    build(parent) { const im = rods(this.list, this.mat, 6); if (parent) parent.add(im); return im; }
  }

  /** superfície de revolução com arestas vivas: um torno por trecho do perfil, tudo fundido */
  function latheSegs(profile, m, seg = 48, f0 = 0, fl = TAU) {
    const gs = [];
    for (let i = 0; i < profile.length - 1; i++) gs.push(new THREE.LatheGeometry([new THREE.Vector2(profile[i][0], profile[i][1]), new THREE.Vector2(profile[i + 1][0], profile[i + 1][1])], seg, f0, fl));
    return L.mesh(BGU.mergeGeometries(gs), m);
  }
  /** face de corte no plano XY (z dado) */
  function sec(poly, m = M.cut, z = 0.004, holes) {
    const s = new THREE.Shape(poly.map((p) => new THREE.Vector2(p[0], p[1])));
    (holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
    return L.mesh(new THREE.ShapeGeometry(s), m, 0, 0, z, { cast: false });
  }
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  /** caixa por limites */
  const bx = (x0, x1, y0, y1, z0, z1, m, o) => L.box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, o);

  /** caixa com UV em metros (para texturas de juntas) */
  function jbox(x0, x1, y0, y1, z0, z1, m, o) {
    const me = bx(x0, x1, y0, y1, z0, z1, m, o), uv = me.geometry.attributes.uv, w = Math.abs(x1 - x0), h = Math.abs(y1 - y0), d = Math.abs(z1 - z0);
    const sc = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * sc[f][0], uv.getY(k) * sc[f][1]); }
    return me;
  }

  /* ---------- árvores (instanciadas) ---------- */
  function trees(list, seed = 5) { // list: [[x,z,escala]] em coordenadas locais do grupo (y = 0 no chão)
    const g = new THREE.Group(), rd = L.rng(seed), n = list.length;
    const crownGeo = new THREE.IcosahedronGeometry(1, 2), p = crownGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 1 + 0.16 * Math.sin(p.getX(i) * 7.1 + p.getY(i) * 5.3) * Math.cos(p.getZ(i) * 6.2); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); }
    crownGeo.computeVertexNormals();
    const tr = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 7), M.trunk, n);
    const cr = new THREE.InstancedMesh(crownGeo, L.mat('#ffffff', { roughness: 0.95 }), n * 3), o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach(([x, z, s = 1], i) => {
      const h = 2.2 * s * (0.85 + rd() * 0.3);
      o.position.set(x, h / 2, z); o.rotation.set(0, 0, 0); o.scale.set(s * 1.3, h, s * 1.3); o.updateMatrix(); tr.setMatrixAt(i, o.matrix);
      for (let j = 0; j < 3; j++) {
        const r = s * (1.5 - j * 0.28) * (0.9 + rd() * 0.25), a = rd() * TAU, off = j ? 0.75 * s : 0;
        o.position.set(x + Math.cos(a) * off, h + r * 0.55 + j * 0.75 * s, z + Math.sin(a) * off); o.rotation.set(rd() * 3, rd() * 3, rd() * 3); o.scale.set(r, r * 0.88, r); o.updateMatrix();
        cr.setMatrixAt(i * 3 + j, o.matrix); cr.setColorAt(i * 3 + j, c.set(j === 2 ? '#63b548' : PAL.grassDark).offsetHSL((rd() - 0.5) * 0.03, 0, (rd() - 0.5) * 0.08 + j * 0.02));
      }
    });
    [tr, cr].forEach((m) => { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; g.add(m); });
    return g;
  }

  /* ---------- prédio ---------- */
  function building(w, h, d, o = {}) { // origem no centro da base; fachada principal em +z
    const g = new THREE.Group(), floors = o.floors ?? 2, wm = o.wall ?? M.wall;
    g.add(bx(-w / 2, w / 2, 0, 0.35, -d / 2, d / 2, M.concreteDark), bx(-w / 2 + 0.05, w / 2 - 0.05, 0.35, h, -d / 2 + 0.05, d / 2 - 0.05, wm));
    g.add(bx(-w / 2 - 0.25, w / 2 + 0.25, h, h + 0.22, -d / 2 - 0.25, d / 2 + 0.25, M.concrete));
    [[-w / 2 - 0.2, w / 2 + 0.2, d / 2 + 0.05, d / 2 + 0.2], [-w / 2 - 0.2, w / 2 + 0.2, -d / 2 - 0.2, -d / 2 - 0.05], [-w / 2 - 0.2, -w / 2 - 0.05, -d / 2, d / 2], [w / 2 + 0.05, w / 2 + 0.2, -d / 2, d / 2]].forEach((q) => g.add(bx(q[0], q[1], h + 0.22, h + 0.6, q[2], q[3], M.concrete)));
    if (o.band) g.add(bx(-w / 2 - 0.02, w / 2 + 0.02, h - 0.75, h - 0.2, -d / 2 - 0.02, d / 2 + 0.02, o.band));
    const fh = (h - 0.6) / floors, wins = [], frames = [];
    const row = (len, place) => { const n = Math.max(1, Math.floor(len / 2.3)); for (let f = 0; f < floors; f++) for (let i = 0; i < n; i++) { if (o.door && f === 0 && place.front && i === Math.floor(n / 2)) continue; place.fn((-len / 2) + (len / n) * (i + 0.5), 0.55 + f * fh + fh * 0.52, wins, frames); } };
    const ww = 1.5, wh = Math.min(1.3, fh * 0.55);
    row(w, { front: true, fn: (u, y, a, b) => { a.push([u, y, d / 2 + 0.03, ww, wh, 0.06]); b.push([u, y, d / 2 + 0.015, ww + 0.16, wh + 0.16, 0.06]); } });
    row(w, { fn: (u, y, a, b) => { a.push([u, y, -d / 2 - 0.03, ww, wh, 0.06]); b.push([u, y, -d / 2 - 0.015, ww + 0.16, wh + 0.16, 0.06]); } });
    row(d, { fn: (u, y, a, b) => { a.push([-w / 2 - 0.03, y, u, 0.06, wh, ww]); b.push([-w / 2 - 0.015, y, u, 0.06, wh + 0.16, ww + 0.16]); a.push([w / 2 + 0.03, y, u, 0.06, wh, ww]); b.push([w / 2 + 0.015, y, u, 0.06, wh + 0.16, ww + 0.16]); } });
    const inst = (list, m) => L.scatter(new THREE.BoxGeometry(1, 1, 1), m, list.length, (i, r, dd) => { const q = list[i]; dd.position.set(q[0], q[1], q[2]); dd.scale.set(q[3], q[4], q[5]); });
    g.add(inst(frames, M.white), inst(wins, M.glass));
    if (o.door) { g.add(bx(-0.9, 0.9, 0.35, 2.6, d / 2, d / 2 + 0.07, M.glass), bx(-1.5, 1.5, 2.7, 2.85, d / 2, d / 2 + 1.3, o.band ?? M.concreteDark), bx(-1.3, 1.3, 0, 0.35, d / 2, d / 2 + 1.2, M.concrete)); }
    const rd = L.rng(o.seed ?? 2);
    for (let i = 0; i < (o.ac ?? 2); i++) { const x = (rd() - 0.5) * (w - 3), z = (rd() - 0.5) * (d - 3); g.add(L.rbox(1.3, 0.8, 1, 0.06, M.galv, x, h + 0.7, z)); const fan = L.cyl(0.36, 0.36, 0.05, M.dark, x, h + 1.12, z, 16); g.add(fan); }
    return g;
  }

  /* ---------- veículos e pessoas ---------- */
  function truck(color = '#f2f4f5') { // caminhonete apontando para +x, origem no chão, centro
    const g = new THREE.Group(), body = L.glossy(color, { roughness: 0.3 });
    const prof = [[-2.6, 0.5], [2.55, 0.5], [2.62, 0.98], [2.4, 1.08], [1.45, 1.14], [0.95, 1.78], [-0.35, 1.8], [-0.5, 1.14], [-2.6, 1.14]];
    const b = L.extrude(prof, 1.78, body, { bevel: 0.06 }); b.position.z = -0.89; g.add(b);
    g.add(bx(-2.5, -0.62, 0.86, 1.2, -0.78, 0.78, M.dark));
    [-0.96, 0.96].forEach((z) => { g.add(bx(-0.22, 0.88, 1.2, 1.68, z - 0.02, z + 0.02, M.glass)); });
    const ws = L.box(0.78, 0.03, 1.6, M.glass, 1.23, 1.47, 0); ws.rotation.z = Math.atan2(0.64, -0.5); g.add(ws);
    const tyre = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 20); tyre.rotateX(Math.PI / 2);
    const hub = new THREE.CylinderGeometry(0.22, 0.22, 0.32, 12); hub.rotateX(Math.PI / 2);
    [[1.6, 0.86], [1.6, -0.86], [-1.55, 0.86], [-1.55, -0.86]].forEach(([x, z]) => { g.add(L.mesh(tyre, M.rubber, x, 0.42, z), L.mesh(hub, M.steel, x, 0.42, z)); });
    g.add(bx(2.6, 2.72, 0.5, 0.72, -0.92, 0.92, M.dark), bx(-2.72, -2.6, 0.5, 0.72, -0.92, 0.92, M.dark));
    [-0.68, 0.68].forEach((z) => { g.add(L.box(0.06, 0.16, 0.34, L.glow('#fff6d8', 1.2), 2.66, 0.9, z), L.box(0.06, 0.2, 0.2, L.glow(PAL.red, 0.8), -2.66, 0.98, z)); });
    g.add(bx(0.2, 0.6, 1.86, 1.96, -0.5, 0.5, L.glow(PAL.flame, 0.9)));
    return g;
  }
  function car(color = '#3d6fb6') {
    const g = new THREE.Group(), body = L.glossy(color, { roughness: 0.3 });
    const prof = [[-2.1, 0.42], [2.1, 0.42], [2.15, 0.85], [1.2, 0.95], [0.65, 1.42], [-0.9, 1.42], [-1.5, 0.98], [-2.15, 0.9]];
    const b = L.extrude(prof, 1.6, body, { bevel: 0.07 }); b.position.z = -0.8; g.add(b);
    [-0.88, 0.88].forEach((z) => g.add(bx(-0.95, 0.6, 1.0, 1.36, z - 0.02, z + 0.02, M.glass)));
    const tyre = new THREE.CylinderGeometry(0.34, 0.34, 0.26, 18); tyre.rotateX(Math.PI / 2);
    [[1.3, 0.78], [1.3, -0.78], [-1.3, 0.78], [-1.3, -0.78]].forEach(([x, z]) => g.add(L.mesh(tyre, M.rubber, x, 0.34, z)));
    return g;
  }
  function person(o = {}) { // 1,75 m, olhando para +z
    const g = new THREE.Group(), s = o.s ?? 1;
    [-0.11, 0.11].forEach((x) => g.add(L.cyl(0.085, 0.075, 0.85, M.jeans, x, 0.425, 0, 10)));
    g.add(L.rbox(0.44, 0.62, 0.26, 0.1, o.vest ?? M.vest, 0, 1.16, 0));
    g.add(L.box(0.45, 0.05, 0.27, M.white, 0, 1.08, 0), L.box(0.45, 0.05, 0.27, M.white, 0, 1.24, 0));
    [-0.28, 0.28].forEach((x) => g.add(L.cyl(0.06, 0.055, 0.6, o.vest ?? M.vest, x, 1.14, 0, 8)));
    g.add(L.sph(0.13, M.skin, 0, 1.6, 0));
    const helmet = L.mesh(new THREE.SphereGeometry(0.15, 16, 10, 0, TAU, 0, Math.PI / 2), o.helmet ?? M.white, 0, 1.63, 0); g.add(helmet, L.cyl(0.18, 0.18, 0.02, o.helmet ?? M.white, 0, 1.64, 0.04, 14));
    g.scale.setScalar(s); return g;
  }
  function lamp(h = 6.5) {
    const g = new THREE.Group();
    g.add(L.cyl(0.07, 0.11, h, M.galv, 0, h / 2, 0, 8), L.cyl(0.16, 0.18, 0.3, M.concreteDark, 0, 0.15, 0, 8));
    g.add(rod([0, h - 0.1, 0], [0, h + 0.15, 1.3], 0.05, M.galv, 6), L.rbox(0.3, 0.12, 0.7, 0.04, M.galv, 0, h + 0.15, 1.55), L.box(0.22, 0.03, 0.5, L.glow('#fff3c4', 1.4), 0, h + 0.08, 1.55));
    return g;
  }
  /** motor elétrico com aletas + caixa de redução, eixo ao longo de +y, origem na base */
  function motor(r = 0.22, len = 0.7, m = M.blue) {
    const g = new THREE.Group();
    g.add(L.cyl(r, r, len, m, 0, len / 2, 0, 20));
    for (let i = 0; i < 7; i++) g.add(L.cyl(r * 1.13, r * 1.13, len * 0.045, m, 0, len * (0.14 + i * 0.105), 0, 20));
    g.add(L.cyl(r * 0.92, r * 1.02, len * 0.18, M.dark, 0, len * 1.06, 0, 20), L.box(r * 0.9, r * 0.7, r * 0.9, m, r * 1.15, len * 0.5, 0));
    return g;
  }
  return { M, rod, rods, Rails, latheSegs, sec, rect, bx, jbox, trees, building, truck, car, person, lamp, motor, canvasTex };
}
