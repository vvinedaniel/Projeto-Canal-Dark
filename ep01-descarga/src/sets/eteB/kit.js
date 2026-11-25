// Peças reutilizáveis do cenário eteB (guarda-corpos, tubos flangeados, motores, válvulas, texturas).
export function makeKit(L) {
  const { THREE, BGU, PAL, TAU } = L;
  const UP = new THREE.Vector3(0, 1, 0);

  /* ---------- geometria ---------- */
  const clean = (g) => {
    const n = g.index ? g.toNonIndexed() : g.clone();
    Object.keys(n.attributes).forEach((k) => { if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); });
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (!n.attributes.normal) n.computeVertexNormals();
    n.clearGroups();
    return n;
  };
  const merge = (geos) => BGU.mergeGeometries(geos.map(clean), false);
  /** transforma uma geometria: rotação (euler XYZ) e depois translação */
  const tf = (g, p = [0, 0, 0], r = [0, 0, 0], s = null) => {
    if (s) g.scale(s[0], s[1], s[2]);
    if (r[0] || r[1] || r[2]) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2])));
    g.translate(p[0], p[1], p[2]);
    return g;
  };
  /** cilindro entre dois pontos */
  const seg = (a, b, r, n = 8, r2 = r) => {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), len = d.length() || 1e-6;
    const g = new THREE.CylinderGeometry(r2, r, len, n, 1, false);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, d.normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    return g;
  };
  const boxG = (w, h, d, p, r) => tf(new THREE.BoxGeometry(w, h, d), p, r);
  const cylG = (rt, rb, h, p, r, n = 16) => tf(new THREE.CylinderGeometry(rt, rb, h, n), p, r);
  const M = (geos, m, o) => L.mesh(Array.isArray(geos) ? merge(geos) : geos, m, 0, 0, 0, o);

  /* ---------- texturas ---------- */
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return t;
  }
  const speck = (g, w, h, n, rd, cols, s0 = 1, s1 = 3) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[Math.floor(rd() * cols.length)]; const s = s0 + rd() * (s1 - s0); g.fillRect(rd() * w, rd() * h, s, s * (0.6 + rd() * 0.8)); } };
  // concreto aparente: painéis de fôrma, furos de tirante, manchas de escorrido. 1 repetição = 4 m
  const concreteTex = canvasTex(512, 512, (g, w, h) => {
    const rd = L.rng(21);
    g.fillStyle = '#d2d6d8'; g.fillRect(0, 0, w, h);
    speck(g, w, h, 5000, rd, ['rgba(255,255,255,.07)', 'rgba(60,70,80,.06)'], 1, 4);
    for (let i = 0; i < 26; i++) { const x = rd() * w, len = 60 + rd() * 200, gr = g.createLinearGradient(0, 0, 0, len); gr.addColorStop(0, 'rgba(70,80,86,.16)'); gr.addColorStop(1, 'rgba(70,80,86,0)'); g.fillStyle = gr; g.fillRect(x, 0, 4 + rd() * 14, len); }
    g.strokeStyle = 'rgba(70,80,90,.30)'; g.lineWidth = 2;
    for (let y = 0; y <= h; y += 128) { g.beginPath(); g.moveTo(0, y + 1); g.lineTo(w, y + 1); g.stroke(); }
    for (let x = 0; x <= w; x += 256) { g.beginPath(); g.moveTo(x + 1, 0); g.lineTo(x + 1, h); g.stroke(); }
    g.fillStyle = 'rgba(60,70,80,.38)';
    for (let y = 64; y < h; y += 128) for (let x = 64; x < w; x += 128) { g.beginPath(); g.arc(x, y, 4, 0, TAU); g.fill(); }
  });
  concreteTex.repeat.set(0.25, 0.25);
  // concreto cortado: agregados à mostra
  const cutTex = canvasTex(256, 256, (g, w, h) => {
    const rd = L.rng(33);
    g.fillStyle = '#a7aeb4'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 420; i++) { const v = 120 + rd() * 90; g.fillStyle = `rgba(${v + 8},${v + 6},${v},.75)`; g.beginPath(); g.ellipse(rd() * w, rd() * h, 2 + rd() * 6, 2 + rd() * 4, rd() * 3, 0, TAU); g.fill(); }
    speck(g, w, h, 1500, rd, ['rgba(255,255,255,.10)', 'rgba(30,40,50,.12)'], 1, 2);
  });
  cutTex.repeat.set(0.6, 0.6);
  const grassTex = canvasTex(256, 256, (g, w, h) => {
    const rd = L.rng(5);
    g.fillStyle = PAL.grass; g.fillRect(0, 0, w, h);
    speck(g, w, h, 5000, rd, ['rgba(40,110,40,.22)', 'rgba(190,240,120,.16)', 'rgba(60,140,50,.2)'], 1, 4);
  });
  grassTex.repeat.set(0.2, 0.2);
  // telha metálica ondulada: 1 repetição = 1 m
  const corrTex = canvasTex(64, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) { const k = 0.5 + 0.5 * Math.sin((x / w) * TAU * 4); const v = Math.round(150 + k * 105); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, h); }
  });
  // grade de piso metálico
  const gratingTex = canvasTex(64, 64, (g, w, h) => {
    g.fillStyle = '#78838d'; g.fillRect(0, 0, w, h); g.fillStyle = '#39424b';
    for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) g.fillRect(x + 3, y + 2, 11, 5);
  });
  gratingTex.repeat.set(2, 2);
  const m = {
    concrete: L.mat(0xffffff, { map: concreteTex, roughness: 0.9 }),
    cut: L.mat(0xffffff, { map: cutTex, roughness: 0.95, side: THREE.DoubleSide }),
    grass: L.mat(0xffffff, { map: grassTex, roughness: 1 }),
    grating: L.mat(0xffffff, { map: gratingTex, roughness: 0.55, metalness: 0.5 }),
    steel: L.metal(PAL.steel, { roughness: 0.42, metalness: 0.6 }),
    galv: L.metal('#d5dde3', { roughness: 0.5, metalness: 0.45 }),
    iron: L.metal(PAL.iron, { roughness: 0.5, metalness: 0.5 }),
    dark: L.mat(PAL.dark, { roughness: 0.6 }),
    rail: L.mat(PAL.yellow, { roughness: 0.45, metalness: 0.15 }),
    air: L.mat(PAL.blue, { roughness: 0.4, metalness: 0.2 }),
    gasPipe: L.mat(PAL.yellow, { roughness: 0.4, metalness: 0.2 }),
    sludgePipe: L.mat('#a5683f', { roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide }),
    asphalt: L.mat(PAL.asphalt, { roughness: 0.95 }),
    paving: L.mat(PAL.sidewalk, { roughness: 0.9 }),
    wall: L.mat(PAL.wall, { roughness: 0.85 }),
    brick: L.mat(PAL.brick, { roughness: 0.9 }),
    white: L.mat('#eef1f3', { roughness: 0.6 })
  };
  const corrugated = (color, rx = 1, ry = 1) => { const t = corrTex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return L.mat(color, { map: t, roughness: 0.5, metalness: 0.35 }); };

  /** caixa com UV em metros (para texturas repetidas) */
  function wbox(w, h, d, material, x, y, z, o) {
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0], uv.getY(k) * dims[f][1]); }
    return L.mesh(g, material, x, y, z, o);
  }
  const uvMul = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };

  /* ---------- sólido de revolução em corte ---------- */
  /** profile fechado [[r,y],...]; devolve grupo com a casca (phi parcial) e as duas tampas de corte. */
  /** revolução com arestas vivas. profile fechado no sentido horário [[r,y],...] (sólido à direita do percurso) */
  function latheHard(profile, seg = 64, phi0 = 0, phiLen = TAU, closed = true) {
    const pos = [], nor = [], uv = [], idx = [], n = profile.length, m2 = closed ? n : n - 1;
    let v = 0, base = 0;
    for (let i = 0; i < m2; i++) {
      const a = profile[i], b = profile[(i + 1) % n], dr = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dr, dy) || 1e-6;
      if (a[0] < 1e-6 && b[0] < 1e-6) { v += len; continue; }
      for (let j = 0; j <= seg; j++) {
        const ph = phi0 + (j / seg) * phiLen, s = Math.sin(ph), c = Math.cos(ph), u = (j / seg) * phiLen * Math.max(a[0], b[0], 1);
        pos.push(a[0] * s, a[1], a[0] * c, b[0] * s, b[1], b[0] * c);
        nor.push((-dy / len) * s, dr / len, (-dy / len) * c, (-dy / len) * s, dr / len, (-dy / len) * c);
        uv.push(u, v, u, v + len);
      }
      for (let j = 0; j < seg; j++) { const k = base + j * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      base += (seg + 1) * 2; v += len;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  /** sólido de revolução em corte: casca (phi parcial) + as duas tampas de corte */
  function latheCut(profile, material, phi0, phiLen, capMat, seg = 64) {
    const g = new THREE.Group();
    g.add(L.mesh(latheHard(profile, seg, phi0, phiLen), material));
    if (capMat && phiLen < TAU - 1e-3) {
      [phi0, phi0 + phiLen].forEach((phi) => {
        const sh = new THREE.Shape(profile.map((p) => new THREE.Vector2(p[0], p[1])));
        const c = L.mesh(new THREE.ShapeGeometry(sh), capMat, 0, 0, 0, { cast: false });
        c.rotation.y = phi - Math.PI / 2; g.add(c);
      });
    }
    return g;
  }

  /* ---------- tubulação ---------- */
  function roundedPath(pts, br = 0.5) {
    const P = pts.map(L.v3), path = new THREE.CurvePath();
    let prev = P[0];
    for (let i = 1; i < P.length - 1; i++) {
      const a = P[i].clone().sub(P[i - 1]), b = P[i + 1].clone().sub(P[i]);
      const r = Math.min(br, a.length() * 0.45, b.length() * 0.45);
      const pin = P[i].clone().addScaledVector(a.normalize(), -r), pout = P[i].clone().addScaledVector(b.normalize(), r);
      path.add(new THREE.LineCurve3(prev, pin)); path.add(new THREE.QuadraticBezierCurve3(pin, P[i], pout));
      prev = pout;
    }
    path.add(new THREE.LineCurve3(prev, P[P.length - 1]));
    return path;
  }
  function flangeG(r, pos, dir) {
    const gs = [new THREE.CylinderGeometry(r * 1.5, r * 1.5, r * 0.34, 20)];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; gs.push(cylG(r * 0.11, r * 0.11, r * 0.5, [Math.cos(a) * r * 1.27, 0, Math.sin(a) * r * 1.27], [0, 0, 0], 6)); }
    const g = merge(gs);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, L.v3(dir).clone().normalize()));
    g.translate(pos.x, pos.y, pos.z);
    return g;
  }
  /** tubo com curvas arredondadas e flanges. o: { bend, fl: [u...] | n, flMat, seg } -> { group, curve } */
  function pipe(pts, r, material, o = {}) {
    const c = roundedPath(pts, o.bend ?? r * 2.4), len = c.getLength(), g = new THREE.Group();
    g.add(L.mesh(new THREE.TubeGeometry(c, o.seg ?? Math.max(24, Math.round(len * 3)), r, 14, false), material));
    let us = o.fl;
    if (us === undefined) us = [0.002, 0.998];
    else if (typeof us === 'number') { const n = us; us = []; for (let i = 0; i <= n; i++) us.push(L.lerp(0.002, 0.998, i / n)); }
    if (us.length) g.add(M(us.map((u) => flangeG(r, c.getPointAt(u), c.getTangentAt(u))), o.flMat ?? material));
    return { group: g, curve: c };
  }
  /** apoio de tubo (berço sobre pilarete) */
  const saddleG = (x, y0, y1, z, r) => [boxG(r * 1.1, y1 - y0 - r * 0.6, r * 1.1, [x, (y0 + y1 - r * 0.6) / 2, z]), boxG(r * 2.2, r * 0.5, r * 1.5, [x, y1 - r * 0.75, z])];

  /* ---------- guarda-corpo, escadas ---------- */
  /** guarda-corpo ao longo de uma polilinha no nível do piso. o: { h, step, r, mid, mat, closed } */
  function railing(pts, o = {}) {
    const h = o.h ?? 1.1, r = o.r ?? 0.03, step = o.step ?? 1.4, P = pts.map(L.v3), gs = [], up = L.V(0, h, 0), mid = L.V(0, h * 0.52, 0);
    if (o.closed) P.push(P[0].clone());
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1], n = Math.max(1, Math.round(a.distanceTo(b) / step));
      for (let k = 0; k < n; k++) { const p = a.clone().lerp(b, k / n); gs.push(seg(p, p.clone().add(up), r * 1.1, 6)); }
      gs.push(seg(a.clone().add(up), b.clone().add(up), r * 1.25, 6));
      if (o.mid !== false) gs.push(seg(a.clone().add(mid), b.clone().add(mid), r * 0.9, 6));
      if (o.kick) gs.push(seg(a.clone().add(L.V(0, 0.08, 0)), b.clone().add(L.V(0, 0.08, 0)), r * 0.9, 4));
    }
    if (!o.closed) { const p = P[P.length - 1]; gs.push(seg(p, p.clone().add(up), r * 1.1, 6)); }
    return M(gs, o.mat ?? m.rail);
  }
  function ladder(h, w = 0.5, material = m.galv) {
    const gs = [seg([-w / 2, 0, 0], [-w / 2, h, 0], 0.03, 6), seg([w / 2, 0, 0], [w / 2, h, 0], 0.03, 6)];
    for (let y = 0.3; y < h - 0.1; y += 0.3) gs.push(seg([-w / 2, y, 0], [w / 2, y, 0], 0.02, 5));
    return M(gs, material);
  }
  /** lance de escada subindo em +x: degraus, longarinas e corrimãos */
  function stair(run, rise, width = 0.9, material = m.galv) {
    const n = Math.max(2, Math.round(rise / 0.2)), gs = [], g = new THREE.Group();
    for (let i = 0; i < n; i++) gs.push(boxG(run / n * 1.05, 0.04, width, [(i + 0.5) * run / n, (i + 1) * rise / n, 0]));
    [-1, 1].forEach((s) => gs.push(seg([0, 0, s * width / 2], [run, rise, s * width / 2], 0.05, 4)));
    g.add(M(gs, material));
    [-1, 1].forEach((s) => g.add(railing([[0, 0, s * width / 2], [run, rise, s * width / 2]], { step: 1.0, h: 1.0 })));
    return g;
  }

  /* ---------- máquinas ---------- */
  /** motor elétrico ao longo de +x (eixo saindo em +x), centro na origem */
  function motor(len, r, color = PAL.blue) {
    const g = new THREE.Group(), body = [], dark = [];
    body.push(cylG(r, r, len * 0.62, [0, 0, 0], [0, 0, Math.PI / 2], 20));
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; if (Math.sin(a) > 0.9) continue; body.push(boxG(len * 0.56, r * 0.2, r * 0.07, [0, Math.sin(a) * r * 1.04, Math.cos(a) * r * 1.04], [Math.PI / 2 - a, 0, 0])); }
    body.push(cylG(r * 0.92, r * 0.7, len * 0.1, [len * 0.36, 0, 0], [0, 0, -Math.PI / 2], 20));
    body.push(boxG(len * 0.26, r * 0.5, r * 0.8, [0, r * 1.12, 0]));
    body.push(boxG(len * 0.12, r * 0.25, r * 2.3, [-len * 0.2, -r * 1.05, 0]), boxG(len * 0.12, r * 0.25, r * 2.3, [len * 0.2, -r * 1.05, 0]));
    dark.push(cylG(r * 1.07, r * 1.07, len * 0.2, [-len * 0.4, 0, 0], [0, 0, Math.PI / 2], 20));
    dark.push(cylG(r * 0.16, r * 0.16, len * 0.16, [len * 0.48, 0, 0], [0, 0, Math.PI / 2], 10));
    g.add(M(body, L.mat(color, { roughness: 0.45, metalness: 0.25 })), M(dark, m.iron));
    return g;
  }
  /** carcaça em caracol (soprador/bomba centrífuga): eixo em z, boca de saída tangencial para +y */
  function volute(r, w, color) {
    const pts = [], n = 40;
    for (let i = 0; i <= n; i++) { const a = (i / n) * TAU * 0.96 + Math.PI / 2, rr = r * (0.78 + 0.5 * (i / n)); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
    const rEnd = r * 1.28; pts.push([rEnd * 0.98, r * 1.25], [rEnd * 0.98 - r * 0.62, r * 1.25], [r * 0.08, r * 0.78]);
    const body = L.extrude(pts, w, L.mat(color, { roughness: 0.4, metalness: 0.3 }), { bevel: w * 0.12 });
    body.position.z = -w / 2;
    const g = new THREE.Group(); g.add(body);
    g.add(M([boxG(r * 0.82, r * 0.1, w * 1.5, [rEnd * 0.98 - r * 0.31, r * 1.3, 0]), cylG(r * 0.5, r * 0.5, w * 0.5, [0, 0, w * 0.75], [Math.PI / 2, 0, 0], 20), cylG(r * 0.62, r * 0.62, w * 0.1, [0, 0, w * 1.0], [Math.PI / 2, 0, 0], 20)], m.iron));
    return g;
  }
  /** válvula de gaveta com volante, para tubo de raio r ao longo de +x */
  function valve(r, color = PAL.red) {
    const g = new THREE.Group();
    g.add(M([cylG(r * 1.5, r * 1.5, r * 0.3, [-r * 1.3, 0, 0], [0, 0, Math.PI / 2], 16), cylG(r * 1.5, r * 1.5, r * 0.3, [r * 1.3, 0, 0], [0, 0, Math.PI / 2], 16), cylG(r * 1.15, r * 1.15, r * 2.4, [0, 0, 0], [0, 0, Math.PI / 2], 16), boxG(r * 1.5, r * 2.2, r * 1.6, [0, r * 1.2, 0]), cylG(r * 0.9, r * 0.9, r * 0.25, [0, r * 2.4, 0], [0, 0, 0], 12)], m.iron));
    g.add(M([cylG(r * 0.14, r * 0.14, r * 2.2, [0, r * 3.5, 0], [0, 0, 0], 6)], m.steel));
    const wheel = [tf(new THREE.TorusGeometry(r * 1.5, r * 0.16, 6, 20), [0, r * 4.5, 0], [Math.PI / 2, 0, 0])];
    for (let i = 0; i < 3; i++) wheel.push(seg([Math.cos(i * TAU / 6) * r * 1.5, r * 4.5, Math.sin(i * TAU / 6) * r * 1.5], [-Math.cos(i * TAU / 6) * r * 1.5, r * 4.5, -Math.sin(i * TAU / 6) * r * 1.5], r * 0.1, 5));
    g.add(M(wheel, L.mat(color, { roughness: 0.4 })));
    return g;
  }
  /** árvore estilizada */
  function tree(h = 4, seed = 1) {
    const rd = L.rng(seed), g = new THREE.Group(), leaves = [];
    g.add(M([seg([0, 0, 0], [0, h * 0.55, 0], h * 0.05, 7, h * 0.03)], L.mat(PAL.wood, { roughness: 0.9 })));
    for (let i = 0; i < 6; i++) { const s = h * (0.2 + rd() * 0.12); leaves.push(tf(new THREE.IcosahedronGeometry(s, 1), [(rd() - 0.5) * h * 0.3, h * (0.55 + rd() * 0.32), (rd() - 0.5) * h * 0.3])); }
    g.add(M(leaves, L.mat(PAL.grassDark, { roughness: 0.9, flatShading: true })));
    return g;
  }
  /** recorta o contorno de um cutPipe (para furos em soilWall), encostando as pontas no limite */
  const clipOutline = (outline, keep, snap) => { const out = []; outline.forEach((p, i) => { const c = keep(p), pv = i ? keep(outline[i - 1]) : c; if (c !== pv) out.push(snap(c ? p : outline[i - 1])); if (c) out.push(p); }); return out; };
  return { clipOutline, m, merge, tf, seg, boxG, cylG, M, canvasTex, corrugated, wbox, uvMul, latheHard, latheCut, roundedPath, flangeG, pipe, saddleG, railing, ladder, stair, motor, volute, valve, tree, UP };
}
