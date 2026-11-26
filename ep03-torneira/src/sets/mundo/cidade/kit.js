// Kit do módulo cidade: materiais em cache, mescla com cor por vértice, texturas (asfalto, calçada, piso da praça),
// faixas "varridas" que seguem o chão (guias, calçadas, asfalto) e o Revealer (revela peças em ordem com drawRange).
// Adaptado do Ep. 01 (rede/kit.js, rio/util.js). Copiado do Ep. 02 (cidade/city/kit.js) para o Ep. 03 + tampa de PV (lid).
export function makeKit(L, Lo) {
  const { THREE, BGU, PAL, TAU, clamp01 } = L;
  const cache = new Map();
  const M = (color, o = {}) => { const k = 'm' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const GL = (color, o = {}) => { const k = 'g' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.glossy(color, o)); return cache.get(k); };
  const shade = (color, k) => '#' + new THREE.Color(color).multiplyScalar(k).getHexString();
  const vmat = (o = {}) => L.mat(0xffffff, { vertexColors: true, ...o });

  const TM = (x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const G = {
    box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
    rbox: (w, h, d, r = 0.03, s = 2) => new L.RoundedBoxGeometry(w, h, d, s, r),
    cyl: (rt, rb, h, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
    sph: (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs),
    cone: (r, h, seg = 10) => new THREE.ConeGeometry(r, h, seg),
    torus: (R, r, rs = 8, ts = 28, arc = TAU) => new THREE.TorusGeometry(R, r, rs, ts, arc),
    lathe: (profile, seg = 24, a0 = 0, a1 = TAU) => new THREE.LatheGeometry(profile.map((p) => new THREE.Vector2(p[0], p[1])), seg, a0, a1),
    extrude: (pts, depth, holes = [], bevel = 0) => {
      const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
      holes.forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1])))));
      return new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 10 });
    }
  };

  const _col = new THREE.Color();
  /** junta geometrias numa só, com cor por vértice */
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
    beam(a, b, th, w, color) {
      const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
      return this.add(new THREE.BoxGeometry(len, th, w ?? th), color, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    }
    rod(a, b, r, color, seg = 8) {
      const va = L.v3(a), vb = L.v3(b), d = vb.clone().sub(va), len = d.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
      return this.add(new THREE.CylinderGeometry(r, r, len, seg), color, new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
    }
    /** guarda-corpo: montantes + corrimão + travessa entre a e b */
    rail(a, b, h = 1.0, color = '#c8ced3', r = 0.03, step = 1.2) {
      const va = L.v3(a), vb = L.v3(b), len = va.distanceTo(vb), n = Math.max(1, Math.round(len / step));
      for (let i = 0; i <= n; i++) { const p = va.clone().lerp(vb, i / n); this.rod(p, [p.x, p.y + h, p.z], r, color, 6); }
      this.rod([va.x, va.y + h, va.z], [vb.x, vb.y + h, vb.z], r * 1.2, color, 6);
      this.rod([va.x, va.y + h * 0.5, va.z], [vb.x, vb.y + h * 0.5, vb.z], r * 0.8, color, 6);
      return this;
    }
    get empty() { return this.list.length === 0; }
    geo() { return BGU.mergeGeometries(this.list, false); }
    mesh(material, o) { return L.mesh(this.geo(), material ?? vmat(), 0, 0, 0, o); }
  }

  /* ---------- texturas (canvas, determinísticas) ---------- */
  function canvasTex(size, draw, rep = 1) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d'); draw(g, size, L.rng(size + rep * 7));
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    return t;
  }
  const speck = (g, S, rd, n, a, b, s0, s1) => { for (let i = 0; i < n; i++) { g.fillStyle = rd() < 0.5 ? a : b; const s = s0 + rd() * (s1 - s0); g.fillRect(rd() * S, rd() * S, s, s); } };
  // asfalto: 1 repetição = 4 m
  const texAsphalt = canvasTex(512, (g, S, rd) => { g.fillStyle = '#5b5f66'; g.fillRect(0, 0, S, S); speck(g, S, rd, 9000, 'rgba(255,255,255,.10)', 'rgba(0,0,0,.22)', 1, 2.4); for (let i = 0; i < 18; i++) { g.fillStyle = 'rgba(0,0,0,.06)'; g.beginPath(); g.ellipse(rd() * S, rd() * S, 20 + rd() * 60, 8 + rd() * 30, rd() * 3, 0, TAU); g.fill(); } });
  // calçada de concreto: placas de 1,5 m com juntas (1 repetição = 1,5 m)
  const texWalk = canvasTex(256, (g, S, rd) => { g.fillStyle = '#e4ded3'; g.fillRect(0, 0, S, S); speck(g, S, rd, 2600, 'rgba(255,255,255,.18)', 'rgba(60,50,40,.10)', 1, 2.2); g.fillStyle = 'rgba(70,60,50,.55)'; g.fillRect(0, 0, S, 3); g.fillRect(0, 0, 3, S); });
  // piso da praça: blocos intertravados (1 repetição = 1,2 m)
  const texPaver = canvasTex(256, (g, S, rd) => {
    g.fillStyle = '#8b7d70'; g.fillRect(0, 0, S, S); const n = 6, w = S / n;
    for (let j = 0; j < n * 2; j++) for (let i = 0; i < n; i++) { const off = (j % 2) * w / 2, v = 168 + rd() * 40; g.fillStyle = `rgb(${v + 22},${v + 4},${v - 18})`; g.fillRect(i * w + off + 1.5, j * w / 2 + 1.5, w - 3, w / 2 - 3); g.fillRect(i * w + off - S + 1.5, j * w / 2 + 1.5, w - 3, w / 2 - 3); }
    speck(g, S, rd, 1200, 'rgba(255,255,255,.08)', 'rgba(0,0,0,.08)', 1, 2);
  });
  // brita
  const texGravel = canvasTex(256, (g, S, rd) => { g.fillStyle = '#8f8b84'; g.fillRect(0, 0, S, S); for (let i = 0; i < 2600; i++) { const v = 90 + rd() * 110; g.fillStyle = `rgb(${v},${v - 3},${v - 8})`; g.beginPath(); g.ellipse(rd() * S, rd() * S, 1.5 + rd() * 3, 1 + rd() * 2.4, rd() * 3, 0, TAU); g.fill(); } });
  // terra compactada
  const texDirt = canvasTex(256, (g, S, rd) => { g.fillStyle = '#7d5a3c'; g.fillRect(0, 0, S, S); speck(g, S, rd, 4000, 'rgba(255,220,180,.10)', 'rgba(30,15,5,.16)', 1, 3); });

  /* ---------- faixas varridas ----------
     sweep({ axis:'x'|'z', s0, s1, ds, lat, dir, prof:[[u,v],...], closed, H(x,z), uv, caps })
     Varre um perfil (u = afastamento lateral a partir de `lat`, no sentido `dir`; v = altura sobre H) ao longo de s.
     Devolve geometria não indexada com uv em coordenadas de mundo (uv = metros / escala). */
  function sweep(o) {
    const { axis, s0, s1, lat, dir = 1, prof, H } = o, ds = o.ds ?? 0.5, sc = o.uv ?? 1, closed = o.closed ?? true;
    const n = Math.max(1, Math.ceil((s1 - s0) / ds)), pos = [], uv = [];
    const P = (s, u, v) => { const l = lat + dir * u; const x = axis === 'x' ? s : l, z = axis === 'x' ? l : s; return [x, H(x, z) + v, z]; };
    const E = closed ? prof.length : prof.length - 1;
    for (let i = 0; i < n; i++) {
      const sa = s0 + ((s1 - s0) * i) / n, sb = s0 + ((s1 - s0) * (i + 1)) / n;
      for (let e = 0; e < E; e++) {
        const p = prof[e], q = prof[(e + 1) % prof.length];
        const a = P(sa, p[0], p[1]), b = P(sb, p[0], p[1]), c = P(sb, q[0], q[1]), d = P(sa, q[0], q[1]);
        const flat = Math.abs(q[1] - p[1]) < Math.abs(q[0] - p[0]); // face "deitada": uv lateral pelo mundo
        const ua = flat ? lat + dir * p[0] : p[1] + lat * 0.37, ub = flat ? lat + dir * q[0] : q[1] + lat * 0.37;
        pos.push(...a, ...b, ...c, ...a, ...c, ...d);
        uv.push(sa / sc, ua / sc, sb / sc, ua / sc, sb / sc, ub / sc, sa / sc, ua / sc, sb / sc, ub / sc, sa / sc, ub / sc);
      }
    }
    if (o.caps) [s0, s1].forEach((s) => {
      const tri = THREE.ShapeUtils.triangulateShape(prof.map((p) => new THREE.Vector2(p[0], p[1])), []);
      tri.forEach((t) => { t.forEach((k) => { pos.push(...P(s, prof[k][0], prof[k][1])); uv.push(prof[k][0] / sc, prof[k][1] / sc); }); });
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }

  /** normaliza atributos para mesclar (position, normal, uv[, color]) */
  function norm(geo, color = null) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (color !== null && !g.attributes.color) { const n = g.attributes.position.count, c = new Float32Array(n * 3); _col.set(color); for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
    if (color === null && g.attributes.color) g.deleteAttribute('color');
    return g;
  }
  /** Revealer: peças [{s, geo, color?}] numa malha só, ordenadas por s; set(sHead) mostra as que têm s ≤ sHead.
      range(a, b) mostra só as de s em [a, b). Sem estado: chame a cada quadro. */
  class Revealer {
    constructor(pieces, material, o = {}) {
      pieces = pieces.filter(Boolean).sort((a, b) => a.s - b.s);
      const useColor = pieces.some((p) => p.color !== undefined);
      const geos = pieces.map((p) => norm(p.geo, useColor ? (p.color ?? '#ffffff') : null));
      this.s = pieces.map((p) => p.s); this.cum = [0];
      geos.forEach((g) => this.cum.push(this.cum[this.cum.length - 1] + g.attributes.position.count));
      this.mesh = L.mesh(geos.length ? BGU.mergeGeometries(geos, false) : new THREE.BufferGeometry(), material, 0, 0, 0, { cast: o.cast !== false, receive: true });
      this.mesh.frustumCulled = false;
    }
    idx(s) { let lo = 0, hi = this.s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (this.s[m] <= s) lo = m + 1; else hi = m; } return lo; }
    set(sHead) { const k = this.idx(sHead); this.mesh.geometry.setDrawRange(0, this.cum[k]); this.mesh.visible = k > 0; }
    range(a, b) { const i = this.idx(a - 1e-9), j = this.idx(b - 1e-9); this.mesh.geometry.setDrawRange(this.cum[i], Math.max(0, this.cum[j] - this.cum[i])); this.mesh.visible = j > i; }
  }

  /* ---------- objetos urbanos ---------- */
  const HEAD = L.glow('#fff4d0', 0.9), TAIL = L.glow('#ff3b30', 0.7);
  /** carro detalhado (frente para +x). type: 'sedan' | 'hatch'. Devolve { group, wheels[] } */
  function car(color = PAL.red, type = 'sedan') {
    const g = new THREE.Group(), m = new Merge(), dk = new Merge(), hl = new Merge(), tl = new Merge();
    const hatch = type === 'hatch', Lh = hatch ? 1.9 : 2.2;   // meio comprimento
    const prof = hatch
      ? [[-1.9, 0.3], [1.9, 0.3], [1.96, 0.52], [1.88, 0.78], [1.15, 0.92], [0.55, 1.42], [-1.45, 1.46], [-1.84, 1.05], [-1.94, 0.6]]
      : [[-2.2, 0.3], [2.2, 0.3], [2.26, 0.52], [2.16, 0.8], [1.3, 0.93], [0.72, 1.4], [-0.95, 1.44], [-1.55, 1.0], [-2.18, 0.92], [-2.26, 0.56]];
    m.add(G.extrude(prof, 1.6, [], 0.06), color, TM(0, 0, -0.8));
    const win = hatch ? [[1.08, 0.95], [0.53, 1.36], [-1.4, 1.4], [-1.74, 1.03]] : [[1.22, 0.96], [0.69, 1.35], [-0.9, 1.39], [-1.45, 1.01]];
    dk.add(G.extrude(win, 1.74), '#1d2a36', TM(0, 0, -0.87));                  // vidros laterais (faixa escura)
    m.add(G.box(0.08, 0.46, 1.78), color, TM(hatch ? -0.38 : -0.1, 1.15, 0));  // coluna B
    const ws = hatch ? [0.82, 1.15, 0.9] : [0.96, 1.15, 0.88];
    dk.add(G.box(0.04, 0.62, 1.4), '#253544', TM(ws[0], ws[1], 0, 0, 0, ws[2]));  // para-brisa
    dk.add(G.box(0.04, 0.5, 1.36), '#253544', TM(hatch ? -1.62 : -1.24, 1.22, 0, 0, 0, hatch ? 0.35 : -1.0));
    // para-choques, grade, placas, retrovisores, maçanetas, frisos de porta
    dk.add(G.rbox(0.14, 0.2, 1.66, 0.04), '#2a3138', TM(Lh + 0.06, 0.42, 0)).add(G.rbox(0.14, 0.2, 1.66, 0.04), '#2a3138', TM(-Lh - 0.06, 0.44, 0));
    dk.add(G.box(0.04, 0.12, 0.7), '#14181c', TM(Lh + 0.1, 0.62, 0));
    m.add(G.box(0.02, 0.13, 0.4), '#f2f2f2', TM(Lh + 0.14, 0.42, 0)).add(G.box(0.02, 0.13, 0.4), '#f2f2f2', TM(-Lh - 0.14, 0.5, 0));
    [-1, 1].forEach((s) => {
      dk.add(G.rbox(0.18, 0.12, 0.08, 0.02), '#1e2328', TM(0.62, 1.0, s * 0.86));
      m.add(G.box(0.12, 0.03, 0.02), '#cfd6dc', TM(0.1, 0.84, s * 0.815)).add(G.box(0.12, 0.03, 0.02), '#cfd6dc', TM(-0.9, 0.84, s * 0.815));
      m.add(G.box(0.015, 0.5, 0.01), shade(color, 0.55), TM(-0.15, 0.62, s * 0.812)).add(G.box(0.015, 0.5, 0.01), shade(color, 0.55), TM(1.0, 0.62, s * 0.812));
      dk.add(G.box(2.6, 0.06, 0.02), '#20262c', TM(-0.05, 0.36, s * 0.81));
      hl.add(G.box(0.05, 0.12, 0.34), '#fff4d0', TM(Lh + 0.03, 0.68, s * 0.55)); tl.add(G.box(0.05, 0.12, 0.32), '#ff3b30', TM(-Lh - 0.03, 0.76, s * 0.56));
    });
    const body = m.mesh(vmat({ roughness: 0.22, metalness: 0.25 })), glassM = dk.mesh(vmat({ roughness: 0.1, metalness: 0.5 }));
    g.add(body, glassM, hl.mesh(HEAD, { cast: false }), tl.mesh(TAIL, { cast: false }));
    const wheels = [], wg = new Merge();
    wg.add(G.cyl(0.33, 0.33, 0.24, 20), '#15191d', TM(0, 0, 0, Math.PI / 2)).add(G.cyl(0.22, 0.22, 0.26, 14), '#b9c2ca', TM(0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 5; i++) wg.add(G.box(0.05, 0.3, 0.02), '#7f8a94', TM(0, 0, 0.135, 0, 0, (i / 5) * Math.PI));
    const wgeo = wg.geo(), wmat = vmat({ roughness: 0.6, metalness: 0.2 }), wx = hatch ? 1.25 : 1.42;
    [[wx, 0.82], [wx, -0.82], [-wx, 0.82], [-wx, -0.82]].forEach(([x, z]) => { const w = L.mesh(wgeo, wmat, x, 0.33, z); if (z < 0) w.rotation.y = Math.PI; g.add(w); wheels.push(w); });
    return { group: g, wheels };
  }

  /** poste de iluminação (braço para +x) */
  const lampGeo = (() => {
    const m = new Merge(), h = 7.5, c = '#9aa3aa';
    m.add(G.cyl(0.07, 0.12, h, 10), c, TM(0, h / 2, 0)).add(G.cyl(0.2, 0.22, 0.35, 10), '#80888f', TM(0, 0.17, 0));
    const pts = [[0, h - 0.6, 0], [0.4, h - 0.1, 0], [1.2, h + 0.05, 0], [1.8, h, 0]];
    for (let i = 0; i < 3; i++) m.rod(pts[i], pts[i + 1], 0.045, c, 6);
    m.add(G.rbox(0.75, 0.13, 0.32, 0.05), '#5c666e', TM(1.95, h - 0.02, 0));
    return m.geo();
  })();
  const lampLensGeo = new THREE.BoxGeometry(0.55, 0.03, 0.22);
  /** banco de praça (assento ao longo de x) */
  const benchGeo = (() => {
    const m = new Merge(), wd = '#a8744e';
    [-0.7, 0.7].forEach((x) => m.add(G.box(0.12, 0.42, 0.5), '#5c666e', TM(x, 0.21, 0)).add(G.box(0.08, 0.5, 0.06), '#5c666e', TM(x, 0.65, -0.24)));
    for (let i = 0; i < 4; i++) m.add(G.box(1.7, 0.04, 0.1), wd, TM(0, 0.44, -0.18 + i * 0.12));
    for (let i = 0; i < 2; i++) m.add(G.box(1.7, 0.1, 0.035), wd, TM(0, 0.68 + i * 0.16, -0.26));
    return m.geo();
  })();
  /** lixeira em poste */
  const binGeo = (() => { const m = new Merge(); m.add(G.cyl(0.03, 0.03, 0.9, 6), '#5c666e', TM(0, 0.45, 0)).add(G.cyl(0.2, 0.17, 0.45, 12, true), '#e07b2a', TM(0, 0.85, 0.08)).add(G.cyl(0.17, 0.17, 0.02, 12), '#3a3f45', TM(0, 0.63, 0.08)); return m.geo(); })();
  /** placa: 'stop' (PARE), 'name' (nome de rua), 'park' (E) */
  function signGeo(kind) {
    const m = new Merge(); m.add(G.cyl(0.035, 0.035, 2.4, 6), '#8a939b', TM(0, 1.2, 0));
    if (kind === 'stop') { m.add(G.cyl(0.32, 0.32, 0.03, 8), '#c92a24', TM(0, 2.3, 0.04, Math.PI / 2, Math.PI / 8)).add(G.box(0.4, 0.09, 0.01), '#ffffff', TM(0, 2.3, 0.06)); }
    else if (kind === 'park') { m.add(G.box(0.5, 0.5, 0.03), '#2457a6', TM(0, 2.2, 0.03)).add(G.box(0.08, 0.32, 0.01), '#ffffff', TM(-0.06, 2.2, 0.05)).add(G.box(0.18, 0.06, 0.01), '#ffffff', TM(0.03, 2.33, 0.05)).add(G.box(0.18, 0.06, 0.01), '#ffffff', TM(0.03, 2.2, 0.05)).add(G.box(0.18, 0.06, 0.01), '#ffffff', TM(0.03, 2.07, 0.05)); }
    else { m.add(G.box(0.9, 0.22, 0.03), '#2457a6', TM(0, 2.35, 0)).add(G.box(0.6, 0.05, 0.035), '#ffffff', TM(0, 2.35, 0)); }
    return m.geo();
  }
  /** árvore (copa em bolhas) */
  function treeGeo(seed = 1, h = 3, r = 1.5) {
    const m = new Merge(), rd = L.rng(seed * 31 + 7), greens = ['#4f9d3c', '#5fb347', '#3f8a3a', '#6cc24a', '#47a05a'];
    m.add(G.cyl(0.1, 0.18, h, 8), '#8a6142', TM(0, h / 2, 0));
    const n = 4 + Math.floor(rd() * 3);
    for (let i = 0; i < n; i++) {
      const a = rd() * TAU, k = i === 0 ? 0 : 0.5, s = r * (i === 0 ? 1 : 0.5 + rd() * 0.35);
      const geo = new THREE.IcosahedronGeometry(1, 1);
      m.add(geo, greens[Math.floor(rd() * greens.length)], TM(Math.cos(a) * r * k, h + r * 0.4 + (i === 0 ? 0 : (rd() - 0.3) * r * 0.6), Math.sin(a) * r * k, rd() * 3, rd() * 3, 0, s, s * 0.82, s));
    }
    return m.geo();
  }

  /* ---------- raio-x ---------- */
  function xray(mats, k) {
    const tr = k > 0.01;
    for (const m of mats) { m.opacity = 1 - 0.75 * k; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.depthWrite = !tr; }
  }


  /* ---------- tampa de poço de visita (do Ep. 02, drainage/kit.js) ---------- */
  function lidTex(text, tone) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = tone; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 5;
    for (let r = 120; r > 20; r -= 22) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; for (let i = -256; i < 512; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); }
    g.restore();
    g.fillStyle = tone; g.fillRect(28, 104, 200, 48);
    g.fillStyle = 'rgba(235,240,244,.92)'; g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 130);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const ironM = L.metal('#3b4148', { roughness: 0.6 });
  const lidCache = new Map();
  function lid(text, tone, r = 0.36) {
    const g = new THREE.Group();
    if (!lidCache.has(text)) lidCache.set(text, L.metal('#ffffff', { map: lidTex(text, tone), roughness: 0.55, metalness: 0.55 }));
    const top = lidCache.get(text);
    const c = L.mesh(new THREE.CylinderGeometry(r, r, 0.04, 28), [ironM, top, ironM], 0, -0.02, 0, { cast: false });
    c.rotation.y = -Math.PI / 2;
    g.add(c, L.mesh(new THREE.CylinderGeometry(r + 0.09, r + 0.09, 0.03, 28), ironM, 0, -0.025, 0, { cast: false }));
    return g;
  }

  return { lid, lidTex, M, GL, shade, vmat, TM, G, Merge, sweep, norm, Revealer, canvasTex, tex: { asphalt: texAsphalt, walk: texWalk, paver: texPaver, gravel: texGravel, dirt: texDirt }, car, lampGeo, lampLensGeo, benchGeo, binGeo, signGeo, treeGeo, xray };
}
