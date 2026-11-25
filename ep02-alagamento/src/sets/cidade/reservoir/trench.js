// Vala aberta para os tubos enterrados (ligação com a galeria e recalque). O chão da rua pertence a outros módulos,
// então a vala é desenhada "por cima" dele: as faces internas (taludes, fundo) usam depthFunc = Always e são
// desenhadas depois do chão (renderOrder), escrevendo a própria profundidade; o tubo e o reaterro vêm em seguida com
// teste de profundidade normal. Os taludes têm 50° para que nenhum raio da câmera (elevação > 50° no plano da seção)
// "entre" pelo talude próximo. Abertura, assentamento e reaterro são funções puras dos parâmetros.
export function makeTrench(L, K, o) {
  const { THREE } = L, { M } = K;
  const gnd = o.ground, wb = o.wb ?? 1.5, slope = 1 / Math.tan((o.slopeDeg ?? 50) * Math.PI / 180);
  // densifica o caminho
  const raw = o.path, pts = [];
  for (let i = 0; i < raw.length - 1; i++) { const [ax, az] = raw[i], [bx, bz] = raw[i + 1], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 0.4)); for (let k = 0; k < n; k++) pts.push([L.lerp(ax, bx, k / n), L.lerp(az, bz, k / n)]); }
  pts.push(raw[raw.length - 1]);
  const S = [0]; for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const len = S[S.length - 1], N = pts.length;
  const yc = (s) => L.lerp(o.y0, o.y1, s / len); // centro do tubo
  const yb = (s) => yc(s) - o.r - 0.12;          // fundo da vala
  const nrm = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz); return [-dz / l, dx / l]; });
  const always = (c) => { const m = L.mat(c, { vertexColors: true, roughness: 0.95 }); m.depthFunc = THREE.AlwaysDepth; return m; };
  /** garante que a face olhe para (ix, iy, iz) (direção interna): inverte os triângulos se preciso */
  const orient = (g, want) => { const n = g.attributes.normal, k = Math.floor(n.count / 2); if (n.getX(k) * want[0] + n.getY(k) * want[1] + n.getZ(k) * want[2] < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); } return g; };
  const faceM = always(0xffffff);
  const CA = new THREE.Color('#2f343b'), CB = new THREE.Color('#9b968a'), CS1 = new THREE.Color('#8c6446'), CS2 = new THREE.Color('#a97d50'), CSand = new THREE.Color('#cdb27a');
  // taludes: 8 linhas por seção (asfalto, base de brita, solo, solo profundo), fundo: 2 linhas
  const ROW = [[0, CA], [0.12, CA], [0.12, CB], [0.42, CB], [0.42, CS1], [0.62, CS1], [0.62, CS2], [1, CS2]];
  function slopeFace(sgn) {
    const pos = [], col = [], idx = [], R = ROW.length;
    for (let i = 0; i < N; i++) {
      const [x, z] = pts[i], [nx, nz] = nrm[i], s = S[i], b = yb(s), g = gnd(x, z), d = g - b;
      ROW.forEach(([f, c], r) => {
        const y = r < 4 ? g - Math.min(f, d) : L.lerp(g - 0.42, b, (f - 0.42) / 0.58), off = wb / 2 + (y - b) * slope;
        pos.push(x + sgn * nx * off, y, z + sgn * nz * off); const dk = 1 - 0.42 * L.clamp01((g - y) / 2.4); col.push(c.r * dk, c.g * dk, c.b * dk);
      });
      if (i) for (let r = 0; r < R - 1; r++) { if (r % 2 === 0 || true) { const a = (i - 1) * R + r, bb = a + 1, c = i * R + r, dd = c + 1; idx.push(a, c, bb, bb, c, dd); } }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    const k = Math.floor(N / 2); orient(g, [-sgn * nrm[k][0], 0.6, -sgn * nrm[k][1]]);
    return { g, per: (R - 1) * 6 };
  }
  function bottomFace() {
    const pos = [], col = [], idx = [];
    for (let i = 0; i < N; i++) { const [x, z] = pts[i], [nx, nz] = nrm[i], b = yb(S[i]); const dk = 1 - 0.42 * L.clamp01((gnd(x, z) - b) / 2.4); pos.push(x + nx * wb / 2, b, z + nz * wb / 2, x - nx * wb / 2, b, z - nz * wb / 2); col.push(CSand.r * dk, CSand.g * dk, CSand.b * dk, CSand.r * 0.92 * dk, CSand.g * 0.92 * dk, CSand.b * 0.92 * dk); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); orient(g, [0, 1, 0]);
    return { g, per: 6 };
  }
  const group = new THREE.Group();
  const faces = [slopeFace(1), slopeFace(-1), bottomFace()].map((f) => { const m = new THREE.Mesh(f.g, faceM); m.renderOrder = 5; m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; group.add(m); return { m, per: f.per }; });
  // reaterro: superfície horizontal dentro da vala na cota do reaterro (desenhada com teste normal, depois do tubo)
  const fillM = L.mat('#7d5c3f', { roughness: 0.97, side: THREE.DoubleSide });
  const fillGeo = new THREE.BufferGeometry(), fillPos = new Float32Array(N * 2 * 3), fidx = [];
  for (let i = 1; i < N; i++) { const a = (i - 1) * 2; fidx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  fillGeo.setAttribute('position', new THREE.BufferAttribute(fillPos, 3)); fillGeo.setIndex(fidx);
  const fill = new THREE.Mesh(fillGeo, fillM); fill.renderOrder = 7; fill.frustumCulled = false; fill.receiveShadow = false; group.add(fill);
  // leiras de terra retirada dos dois lados (cristas contínuas)
  const PROF = [[0, 0], [0.12, 0.3], [0.35, 0.62], [0.65, 0.78], [0.95, 0.62], [1.25, 0.3], [1.5, 0]], NPf = PROF.length;
  const bermM = L.mat('#7d5a3c', { roughness: 1, flatShading: true });
  const berms = [1, -1].map((sg) => {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(N * NPf * 3), idx = [];
    for (let i = 1; i < N; i++) for (let j = 0; j < NPf - 1; j++) { const a = (i - 1) * NPf + j, b2 = a + 1, c = i * NPf + j, d = c + 1; if (sg > 0) idx.push(a, b2, c, b2, d, c); else idx.push(a, c, b2, b2, c, d); }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx);
    const m = new THREE.Mesh(g, bermM); m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; group.add(m);
    return { g, pos, sg, m };
  });
  // remendo do asfalto depois de fechada
  const patch = new THREE.Mesh(K.ribbon(pts, wb + 1.4, (x, z) => gnd(x, z), 0.014), M('#2a2f36', { roughness: 0.92, transparent: true, opacity: 0.75, depthWrite: false }));
  patch.receiveShadow = true; patch.renderOrder = 2; group.add(patch);
  const at = (s) => { let i = 1; while (i < N - 1 && S[i] < s) i++; const k = L.clamp01((s - S[i - 1]) / (S[i] - S[i - 1] || 1)); return { x: L.lerp(pts[i - 1][0], pts[i][0], k), z: L.lerp(pts[i - 1][1], pts[i][1], k), i, nx: nrm[i][0], nz: nrm[i][1] }; };
  const _o = new THREE.Object3D();
  /** open 0..1 (avanço da abertura), fill 0..1 (reaterro), patch 0..1 */
  let last = '';
  function update(open, fillK, patchK = 0, xray = 0) {
    patch.visible = patchK > 0.01; patch.material.opacity = 0.75 * patchK * (1 - 0.75 * xray);
    const key = open.toFixed(4) + '|' + fillK.toFixed(4); if (key === last) return; last = key;
    const nOpen = Math.min(N - 1, Math.floor(open * (N - 1) + 1e-6)), vis = open > 0.001 && fillK < 0.999;
    faces.forEach((f) => { f.m.visible = vis; f.m.geometry.setDrawRange(0, nOpen * f.per); });
    fill.visible = vis && fillK > 0.001;
    if (fill.visible) {
      for (let i = 0; i < N; i++) {
        const [x, z] = pts[i], [nx, nz] = nrm[i], b = yb(S[i]), g = gnd(x, z), y = L.lerp(b, g - 0.02, fillK), off = wb / 2 + (y - b) * slope;
        fillPos.set([x + nx * off, y, z + nz * off, x - nx * off, y, z - nz * off], i * 6);
      }
      fillGeo.attributes.position.needsUpdate = true; fillGeo.computeVertexNormals(); fillGeo.setDrawRange(0, nOpen * 6);
    }
    berms.forEach((B) => {
      for (let i = 0; i < N; i++) {
        const [x, z] = pts[i], [nx, nz] = nrm[i], g = gnd(x, z), d = g - yb(S[i]), e = wb / 2 + d * slope + 0.15;
        const on = L.clamp01((open * len - S[i]) / 1.2) * (1 - L.sstep(0.0, 0.9, fillK)), hs = (0.2 + 0.16 * d) * on, ws = 1.0 + 0.55 * d;
        PROF.forEach(([u, h], j) => { const o = e + u * ws, w = 0.9 + 0.1 * Math.sin(i * 1.7 + j); B.pos.set([x + B.sg * nx * o, g - 0.03 + h * hs * w, z + B.sg * nz * o], (i * NPf + j) * 3); });
      }
      B.g.attributes.position.needsUpdate = true; B.g.computeVertexNormals(); B.m.visible = open > 0.001 && fillK < 0.95;
    });
    patch.visible = patchK > 0.01; patch.material.opacity = 0.75 * patchK * (1 - 0.75 * xray);
  }
  update(0, 0);
  return { group, update, pts, S, len, yc, yb, at };
}
