// ETA 2 — FILTROS RÁPIDOS DE DUPLA CAMADA (4 caixas em corte pela frente, z = ZC).
// Por dentro, de baixo para cima: câmara de água filtrada → fundo falso com crepinas → cascalho graduado (camada suporte)
// → areia → antracito (carvão mineral) → lâmina d'água; calhas de coleta de água de lavagem; canal de entrada com
// comportas; canaleta (gullet) de água de lavagem; galeria de tubos atrás (água de lavagem e descarga) com válvulas.
// Obra: S.build.filters 0–.25 caixas, fundo falso, crepinas, calhas · .25–.95 camadas despejadas de big bags, uma a uma.
// Água: S.water.filters (lâmina, percolação, câmara). Lavagem em contracorrente: S.run.backwash, só no filtro 4.
export function makeFilters(ctx, K) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, G, bx, bake, pipe, butterfly, gateValve, railing, stairs, walkway, rod, canvasTex, QuadBatch } = K, CA = K.chevA, CB = K.chevB;
  const F = Lo.ETA.filters, W = Lo.WATER, PI = Math.PI;
  const X0 = F.x0, X1 = F.x1, ZC = F.z1, ZB = F.z0, TH = 0.3, Y0 = Lo.ETA.y, FL = F.floor, TOP = F.top, WL = F.water;
  // faixa de trás (de trás para a frente): parede, canal de entrada, divisória, canaleta de lavagem, parede do filtro
  const zCh0 = ZB + TH, zCh1 = -55.8, zDv1 = -55.55, zGu1 = -54.85, ZI = -54.55;   // ZI = fundo interno do leito
  const yFB0 = 14.98, yFB = F.layers[0].top;                                          // fundo falso (laje com crepinas)
  const LAY = F.layers.slice(1).map((l, i, a) => ({ id: l.id, y0: i ? a[i - 1].top : yFB, y1: l.top }));  // cascalho, areia, antracito
  const yLip = 18.35, yTr0 = 17.8, yGuF = 16.4, yChF = 18.0, yChW = 18.95;
  const cw = (X1 - X0) / F.n;
  const cells = [...Array(F.n)].map((_, i) => { const a = X0 + i * cw + (i ? TH / 2 : TH), b = X0 + (i + 1) * cw - (i < F.n - 1 ? TH / 2 : TH); return { i, a, b, c: (a + b) / 2, w: b - a }; });
  const root = new THREE.Group();
  const sub = (b, a, c) => L.clamp01((b - a) / (c - a));
  const _c = new THREE.Color();

  /* ---------------- texturas de grão (cada camada com cor e textura próprias) ---------------- */
  const PXM = 360; // px por metro na face de corte (grãos exagerados para ler no celular)
  function grainCanvas(kind, wM, hM, top) {
    const w = Math.round(wM * PXM), h = Math.round(hM * PXM), rd = L.rng(kind.length * 31 + (top ? 7 : 1));
    return canvasTex(w, h, (g) => {
      const dot = (x, y, r, col, rot = 0, ax = 1) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, r, r * ax, rot, 0, L.TAU); g.fill(); };
      if (kind === 'gravel') {
        g.fillStyle = '#5b5650'; g.fillRect(0, 0, w, h);
        const n = top ? 900 : 1400;
        for (let i = 0; i < n; i++) {
          const y = rd() * h, depth = top ? 0.4 : 1 - y / h;            // 1 = fundo da camada (pedras maiores)
          const r = (top ? 10 : 6 + 30 * Math.pow(depth, 2.2)) * (0.75 + rd() * 0.4), x = rd() * w, ax = 0.65 + rd() * 0.3, rot = rd() * 3;
          const v = 95 + rd() * 90, tint = rd();
          dot(x + r * 0.15, y + r * 0.2, r * 1.05, 'rgba(25,20,15,.55)', rot, ax);
          dot(x, y, r, `rgb(${v + 18 * tint},${v + 6},${v - 14 * tint})`, rot, ax);
          dot(x - r * 0.3, y - r * 0.3, r * 0.42, 'rgba(255,250,240,.28)', rot, ax);
        }
      } else if (kind === 'sand') {
        g.fillStyle = '#cfb07a'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < w * h * 0.06; i++) { const v = rd(); g.fillStyle = v < 0.33 ? 'rgba(255,240,205,.75)' : v < 0.66 ? 'rgba(160,120,70,.55)' : 'rgba(120,85,45,.45)'; const r = 1.2 + rd() * 2.6; g.fillRect(rd() * w, rd() * h, r, r); }
        for (let i = 0; i < w * h * 0.004; i++) dot(rd() * w, rd() * h, 2 + rd() * 3, rd() < 0.5 ? 'rgba(240,225,190,.8)' : 'rgba(140,100,60,.6)', rd() * 3, 0.7);
      } else { // antracito: grãos angulosos pretos e brilhantes
        g.fillStyle = '#0f1113'; g.fillRect(0, 0, w, h);
        for (let i = 0; i < w * h * 0.0032; i++) {
          const x = rd() * w, y = rd() * h, r = 5 + rd() * 8, k = 5 + Math.floor(rd() * 3), a0 = rd() * 6, v = 22 + rd() * 26;
          g.fillStyle = `rgb(${v},${v + 2},${v + 6})`; g.beginPath();
          for (let j = 0; j < k; j++) { const a = a0 + (j / k) * L.TAU, rr = r * (0.7 + rd() * 0.5); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.strokeStyle = `rgba(190,205,220,${0.25 + rd() * 0.45})`; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.2); g.lineTo(x - r * 0.1, y - r * 0.7); g.stroke();
        }
      }
    });
  }
  const TEX = {}, FRONT = {}, TOPM = {};
  LAY.forEach((l) => {
    const kind = l.id === 'cascalho' ? 'gravel' : l.id === 'areia' ? 'sand' : 'anth';
    const tf = grainCanvas(kind, 2.6, l.y1 - l.y0, false); tf.wrapS = THREE.RepeatWrapping;
    const tt = grainCanvas(kind, 1.6, 1.6, true); tt.wrapS = tt.wrapT = THREE.RepeatWrapping;
    TEX[l.id] = { tf, tt, kind };
    const gl = kind === 'anth' ? { roughness: 0.32, metalness: 0.25 } : { roughness: 0.95 };
    FRONT[l.id] = L.mat('#ffffff', { map: tf, ...gl });
    TOPM[l.id] = L.mat('#ffffff', { map: tt, ...gl });
  });

  /* ---------------- estrutura de concreto (uma malha por material) ---------------- */
  const shellG = new THREE.Group(), cutRects = [];
  const wall = (a, b, m = MAT.conc, cut = true) => { shellG.add(bx(a, b, m)); if (cut && b[2] >= ZC - 1e-3) cutRects.push([a[0], a[1], b[0], b[1]]); };
  // parede com aberturas: extrusão em z de uma forma no plano XY
  function holedWall(xa, xb, za, zb, ya, yb, holes, m = MAT.conc) {
    const msh = L.extrude([[xa, ya], [xb, ya], [xb, yb], [xa, yb]], zb - za, m, { holes: holes.map(([h0, h1, v0, v1]) => [[h0, v0], [h0, v1], [h1, v1], [h1, v0]]) });
    msh.position.z = za; shellG.add(msh);
  }
  wall([X0, Y0, ZB], [X1, FL, ZC]);                                     // laje de fundo
  wall([X0, FL, zGu1], [X0 + TH, TOP, ZC]); wall([X1 - TH, FL, ZB], [X1, TOP, ZC]); // paredes laterais
  cells.slice(1).forEach((c) => wall([c.a - TH, FL, ZI], [c.a, TOP, ZC]));            // divisórias
  // cabeça de entrada (à esquerda, recebe o canal de água decantada que vem do eta1 por trás, em x ≈ −27)
  const XH = X0 - 1.0;
  wall([XH, FL, ZB], [XH + TH, TOP, zGu1], MAT.conc, false);
  wall([XH, FL, zCh0], [X0 + TH, yChF, zGu1], MAT.conc, false);   // maciço sob a cabeça
  wall([X0, FL, zCh0], [X0 + TH, TOP, zGu1], MAT.conc, false);      // parede esquerda atrás (parte de cima vazada abaixo)
  // parede de trás com o vão do canal que chega (x −27,7 … −26,3, acima do fundo do canal)
  holedWall(XH, X1, ZB, zCh0, FL, TOP, [[-27.7, -26.3, yChF, TOP + 0.5]]);
  wall([X0 + TH, FL, zCh0], [X1 - TH, yChF, zCh1], MAT.conc, false);       // maciço sob o canal
  wall([X0 + TH, FL, zDv1], [X1 - TH, yGuF, zGu1], MAT.conc, false);        // maciço sob a canaleta
  const flumeX = (c) => [c.c - 2.25, c.c - 1.65];
  const troughX = (c) => [c.c - 1.25, c.c + 1.25];
  holedWall(X0 + TH, X1 - TH, zCh1, zDv1, FL, TOP, cells.map((c) => [...flumeX(c), 18.7, 19.25]));        // divisória canal | canaleta
  holedWall(X0 + TH, X1 - TH, zGu1, ZI, FL, TOP, [
    ...cells.map((c) => [...flumeX(c), 18.7, 19.25]),
    ...cells.flatMap((c) => troughX(c).map((x) => [x - 0.25, x + 0.25, yTr0 + 0.07, yLip - 0.005]))]);         // fundo do filtro (calhas e entrada)
  // calhas de coleta de água de lavagem (perfil U ao longo de z, da canaleta até o corte)
  const U = [[-0.25, 0], [0.25, 0], [0.25, 0.55], [0.18, 0.55], [0.18, 0.07], [-0.18, 0.07], [-0.18, 0.55], [-0.25, 0.55]];
  const trG = new THREE.Group();
  cells.forEach((c) => troughX(c).forEach((x) => { const m = L.extrude(U, ZC - zGu1 - 0.004, MAT.concOld); m.position.set(x, yTr0, zGu1); trG.add(m); }));
  // calhas de entrada (canal → filtro, passando sobre a canaleta)
  const U2 = [[-0.3, 0], [0.3, 0], [0.3, 0.5], [0.24, 0.5], [0.24, 0.06], [-0.24, 0.06], [-0.24, 0.5], [-0.3, 0.5]];
  cells.forEach((c) => { const [a, b] = flumeX(c), m = L.extrude(U2, ZI - zCh1 + 0.25, MAT.concOld); m.position.set((a + b) / 2, 18.64, zCh1); trG.add(m); });
  const shell = bake(shellG), troughs = bake(trG);
  // faces de corte (tom claro) no plano da frente
  const cutGeo = L.BGU.mergeGeometries(cutRects.map(([a, b, c, d]) => { const g = new THREE.PlaneGeometry(c - a, d - b); g.translate((a + c) / 2, (b + d) / 2, ZC + 0.004); g.deleteAttribute('uv'); return g; }));
  const cutCaps = L.mesh(cutGeo, MAT.cut, 0, 0, 0, { cast: false });
  // pivô para "subir" as paredes a partir da fundação
  const shellPiv = L.group(root, 0, Y0, 0), shellIn = L.group(shellPiv, 0, -Y0, 0); shellIn.add(shell, cutCaps);
  const trPiv = L.group(root, 0, 0, 0); trPiv.add(troughs);
  L.shadows(shell); L.shadows(troughs);

  /* ---------------- fundo falso: vigotas, laje e crepinas ---------------- */
  const fbG = new THREE.Group();
  cells.forEach((c) => {
    fbG.add(bx([c.a, yFB0, ZI], [c.b, yFB, ZC - 0.002], MAT.slab));
    for (let x = c.a + 0.55; x < c.b - 0.3; x += 1.05) fbG.add(bx([x - 0.08, FL, ZI], [x + 0.08, yFB0, ZC - 0.003], MAT.concDark)); // vigotas de apoio
  });
  const fb = bake(fbG); const fbPiv = L.group(root, 0, FL, 0), fbIn = L.group(fbPiv, 0, -FL, 0); fbIn.add(fb); L.shadows(fb);
  // crepina: haste atravessando a laje + cabeça ranhurada
  const crGeo = (() => {
    const parts = [new THREE.CylinderGeometry(0.028, 0.028, 0.2, 8).translate(0, -0.06, 0), new THREE.CylinderGeometry(0.062, 0.07, 0.085, 10).translate(0, 0.045, 0),
      new THREE.CylinderGeometry(0.035, 0.062, 0.03, 10).translate(0, 0.1, 0), new THREE.CylinderGeometry(0.075, 0.075, 0.016, 10).translate(0, 0.006, 0)];
    parts.forEach((p) => { p.deleteAttribute('uv'); });
    return L.BGU.mergeGeometries(parts);
  })();
  const crPos = [];
  cells.forEach((c) => { for (let ix = 0; ix < 10; ix++) for (let iz = 0; iz < 15; iz++) { const z = ZC - 0.03 - iz * ((ZC - ZI - 0.2) / 14); crPos.push([c.a + 0.3 + ix * ((c.w - 0.6) / 9), yFB, z, c.i, (c.i * 10 + ix) / (F.n * 10)]); } });
  const crep = new THREE.InstancedMesh(crGeo, M('#e9ecef', { roughness: 0.45 }), crPos.length); crep.castShadow = false; crep.receiveShadow = true; crep.frustumCulled = false; root.add(crep);
  const _o = new THREE.Object3D();

  /* ---------------- camadas filtrantes: um lote de faces de corte + um de topos por camada (4 filtros) ---------------- */
  const LQ = LAY.map((l) => { const fr = new QuadBatch(F.n, FRONT[l.id]), tp = new QuadBatch(F.n, TOPM[l.id]); root.add(fr.mesh, tp.mesh); return { fr, tp, l }; });
  // pedras 3D do cascalho graduado no corte (maiores embaixo)
  const pebN = 80, peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#8a857c', { roughness: 0.85, flatShading: true }), pebN * F.n);
  const pebD = []; { const rd = L.rng(77); for (let ci = 0; ci < F.n; ci++) for (let i = 0; i < pebN; i++) { const c = cells[ci], h = rd(); pebD.push({ ci, x: L.lerp(c.a + 0.1, c.b - 0.1, rd()), h, s: (0.028 + 0.055 * Math.pow(1 - h, 1.5)) * (0.75 + rd() * 0.4), r: [rd() * 6, rd() * 6, rd() * 6] }); peb.setColorAt(ci * pebN + i, new THREE.Color().setHSL(0.08 + rd() * 0.04, 0.08 + rd() * 0.08, 0.36 + rd() * 0.22)); } }
  peb.castShadow = false; peb.receiveShadow = true; peb.frustumCulled = false; root.add(peb);
  // monte de material sendo espalhado (cone) — um por filtro (troca de material por camada)
  const heapGeo = new THREE.ConeGeometry(1, 1, 28, 1, true).translate(0, 0.5, 0);
  const heaps = cells.map(() => { const m = new THREE.Mesh(heapGeo, TOPM.cascalho); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; });
  // big bags (os 4 descem e esvaziam juntos): corpos num grupo só (escala em y), cabos noutro
  const bagM = M('#ece8dc', { roughness: 0.8 }), bandC = LAY.map((l) => new THREE.Color(l.id === 'cascalho' ? '#7d766c' : l.id === 'areia' ? '#cfa864' : '#22262b')), bandM = L.mat('#7d766c', { roughness: 0.6 });
  const BS = 1.35, bagZ = (ZC + ZI) / 2 + 0.4, bodyG = new THREE.Group(), cabG = new THREE.Group();
  cells.forEach((c) => {
    const x = c.c + 0.3, add = (m) => { m.position.multiplyScalar(BS); m.scale.multiplyScalar(BS); m.position.x += x; m.position.z += bagZ; return m; };
    bodyG.add(add(L.rbox(1.0, 1.0, 1.0, 0.12, bagM, 0, 0.5, 0)), add(L.box(1.02, 0.18, 1.02, bandM, 0, 0.62, 0)), add(L.cyl(0.12, 0.16, 0.3, bagM, 0, -0.1, 0, 12)));
    [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].forEach(([lx, lz]) => { const lp = add(L.torus(0.1, 0.025, bagM, lx, 1.06, lz)); lp.rotation.y = Math.atan2(lx, lz); bodyG.add(lp); cabG.add(rod([x + lx * BS, 1.1 * BS, bagZ + lz * BS], [x, 3.6 * BS, bagZ], 0.016, MAT.steel, 4)); });
    cabG.add(rod([x, 3.6 * BS, bagZ], [x, 9 * BS, bagZ], 0.027, MAT.steel, 4), L.sph(0.095, MAT.yellow, x, 3.6 * BS, bagZ));
  });
  const bagBody = bake(bodyG), bagCab = bake(cabG); L.shadows(bagBody); const bagPiv = L.group(root); bagPiv.add(bagBody, bagCab);
  const streamN = 46, stream = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#ffffff', { roughness: 0.6, flatShading: true }), streamN * F.n);
  stream.castShadow = false; stream.frustumCulled = false; root.add(stream);
  const STREAM_COL = { cascalho: '#8c867c', areia: '#d6b97e', antracito: '#1c1f22' };
  for (let i = 0; i < streamN * F.n; i++) stream.setColorAt(i, new THREE.Color('#ffffff'));

  /* ---------------- água: um lote por material ---------------- */
  const wSet = L.water(W.settled, 0.8, { side: THREE.DoubleSide }), wFil = L.water(W.filtered, 0.86, { side: THREE.DoubleSide });
  const wC4 = L.water(W.settled, 0.82, { side: THREE.DoubleSide }), wDirty = L.water('#6f5a3c', 0.9, { side: THREE.DoubleSide });
  const QS = new QuadBatch(13, wSet), Q4 = new QuadBatch(4, wC4), QF = new QuadBatch(4, wFil), QD = new QuadBatch(5, wDirty);
  [QS, Q4, QF, QD].forEach((q) => root.add(q.mesh));

  /* ---------------- setas e partículas ---------------- */
  const chevDown = [], chevUp = [];
  cells.forEach((c) => [-0.45, 0.45].forEach((dx) => {
    const x = c.c + dx;
    chevDown.push({ id: CA.add([[x, 18.55, ZC + 0.05], [x, 14.95, ZC + 0.05]], { n: 5, size: 0.19, color: L.PAL.accent }), c });
    if (c.i === 3) chevUp.push(CA.add([[x, 14.75, ZC + 0.06], [x, 18.4, ZC + 0.06]], { n: 6, size: 0.21, color: '#bfefff' }));
  }));
  const chevCham = CA.add([[X0 + 0.5, 14.64, ZC + 0.06], [X1 - 0.35, 14.64, ZC + 0.06]], { n: 14, size: 0.16, color: '#bfefff' });
  const chevTr = troughX(cells[3]).map((x) => CB.add([[x, 18.25, ZC - 0.2], [x, 18.25, zGu1 + 0.1]], { n: 6, size: 0.17, normal: [0, 1, 0.4], color: '#ffcf6a' }));
  // impurezas: caindo pela água e ficando presas (mais no topo do antracito, menos na areia; poucas passam) + lavagem (sobem)
  const dirtCols = ['#7a5a36', '#8c6a40', '#5e4529', '#9a7a4a'];
  const fallN = 26, trapN = 150, bwN = 70, rdp = L.rng(901);
  const fallD = [], trapD = [], bwD = [];
  const stopY = (r) => (r < 0.58 ? L.lerp(17.18, 16.95, r / 0.58) : r < 0.84 ? L.lerp(16.95, 16.6, (r - 0.58) / 0.26) : r < 0.97 ? L.lerp(16.48, 16.15, (r - 0.84) / 0.13) : 15.2);
  cells.forEach((c) => {
    for (let i = 0; i < fallN; i++) fallD.push({ c, x: L.lerp(c.a + 0.15, c.b - 0.15, rdp()), stop: stopY(rdp()), ph: rdp(), s: 0.03 + rdp() * 0.03, sp: 0.22 + rdp() * 0.12 });
    for (let i = 0; i < trapN; i++) { const r = Math.pow(rdp(), 1.25); trapD.push({ c, x: L.lerp(c.a + 0.08, c.b - 0.08, rdp()), y: r < 0.97 ? stopY(r) : 16.2, s: 0.022 + rdp() * 0.03, k: rdp() }); }
  });
  for (let i = 0; i < bwN; i++) { const c = cells[3]; bwD.push({ x: L.lerp(c.a + 0.15, c.b - 0.15, rdp()), ph: rdp(), s: 0.025 + rdp() * 0.035, bub: rdp() < 0.3 }); }
  const NF = fallD.length, NT = trapD.length, dots = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#ffffff', { roughness: 0.7 }), NF + NT + bwN);
  for (let i = 0; i < NF + NT + bwN; i++) dots.setColorAt(i, new THREE.Color(i >= NF + NT && bwD[i - NF - NT].bub ? '#dff6ff' : dirtCols[i % 4]));
  dots.castShadow = false; dots.frustumCulled = false; root.add(dots);

  /* ---------------- comportas de entrada (fixas nos filtros 1–3; a do 4 fecha na lavagem), galeria de tubos atrás ---------------- */
  const gal = new THREE.Group(), gate4 = new THREE.Group();
  cells.forEach((c) => {
    const [a, b] = flumeX(c), x = (a + b) / 2, zg = (zCh1 + zDv1) / 2;
    gal.add(bx([a - 0.08, 18.7, zCh1 - 0.06], [a, 20.3, zDv1 + 0.06], MAT.galv), bx([b, 18.7, zCh1 - 0.06], [b + 0.08, 20.3, zDv1 + 0.06], MAT.galv), bx([a - 0.08, 20.25, zCh1 - 0.06], [b + 0.08, 20.35, zDv1 + 0.06], MAT.galv));
    const hw = L.torus(0.2, 0.025, MAT.red, x, 20.62, zg); hw.rotation.x = PI / 2; gal.add(hw, L.cyl(0.05, 0.07, 0.25, MAT.iron, x, 20.47, zg, 8));
    const pl = [L.box(b - a + 0.04, 0.6, 0.05, MAT.iron, x, 18.72, zg), L.cyl(0.025, 0.025, 1.2, MAT.steel, x, 18.72 + 0.6, zg, 6)];
    (c.i === 3 ? gate4 : gal).add(...pl);
  });
  const gate4B = bake(gate4); root.add(gate4B);
  // água de lavagem (tubo azul de água tratada) vindo da bomba de lavagem, junto ao reservatório
  const zW = ZB - 0.75, zD = ZB - 1.35, yW = 14.55;
  const discAt = [];   // válvulas borboleta: discos fixos entram no lote; os que se movem ficam à parte
  const bfly = (r, x, y, z, ry, moving) => { const v = butterfly(r, MAT.iron); v.g.rotation.y = ry; v.g.position.set(x, y, z); if (moving) { v.g.remove(v.disc); discAt.push([x, y, z, r, ry]); } else if (moving === null) v.disc.rotation.y = PI / 2; gal.add(v.g); };
  pipe(gal, [[X0 + 0.3, yW, zW], [14.6, yW, zW]], 0.2, MAT.treated, { flanges: 'start' });
  cells.forEach((c) => {
    const x = c.c + 1.9;
    pipe(gal, [[x, yW, zW], [x, 14.7, zW + 0.35], [x, 14.7, ZI + 0.05]], 0.14, MAT.treated, { flanges: false });
    bfly(0.14, x, 14.7, ZB - 0.32, 0, c.i === 3);
    gal.add(L.cyl(0.2, 0.14, 0.12, MAT.treated, x, 14.7, ZI + 0.08, 14).rotateX(PI / 2)); // bocal na câmara
  });
  // descarga da canaleta de lavagem → tanque de lodo (eta1) pela esquerda
  pipe(gal, [[X0 + 0.6, yGuF + 0.05, (zDv1 + zGu1) / 2], [X0 + 0.6, yGuF - 0.6, (zDv1 + zGu1) / 2]], 0.22, MAT.grey, { flanges: false });
  const sx = Lo.ETA.sludgeTank, sa = Math.atan2(1, 1), sp = [sx.x + Math.cos(sa) * (sx.r + 0.05), 14.6, sx.z + Math.sin(sa) * (sx.r + 0.05)];
  pipe(gal, [[X0 + 0.6, 15.6, zD + 0.25], [X0 + 0.6, 14.6, zD], [XH - 1.2, 14.6, zD], [XH - 1.2, 14.6, -62.5], [sp[0] + 1.6, 14.6, -62.5], [sp[0], 14.6, sp[2]]], 0.24, MAT.grey, { flanges: 'end' });
  pipe(gal, [[X0 + 0.6, yGuF - 0.6, (zDv1 + zGu1) / 2], [X0 + 0.6, 15.6, zD + 0.25]], 0.22, MAT.grey, { flanges: false });
  bfly(0.24, XH - 0.2, 14.6, zD, PI / 2, true);
  for (let x = X0 + 1; x < 13; x += 2.4) gal.add(bx([x - 0.15, Y0, zW - 0.25], [x + 0.15, yW - 0.18, zW + 0.25], MAT.concDark));
  for (let x = XH - 1; x < X0 + 0.5; x += 2.4) gal.add(bx([x - 0.15, Y0, zD - 0.25], [x + 0.15, 14.36, zD + 0.25], MAT.concDark));
  // água filtrada: coletor ao fundo da câmara, sai pela direita até o tanque de contato (válvula sempre aberta)
  const zF = ZI + 0.42, yF = 14.62, CIN = Lo.P.contactIn;
  pipe(gal, [[X0 + 0.4, yF, zF], [X1 + 0.8, yF, zF], [X1 + 0.8, CIN[1], CIN[2]], CIN], 0.25, MAT.treated, { flanges: 'end', bend: 0.45 });
  bfly(0.25, X1 + 0.8, 14.72, (zF + CIN[2]) / 2, 0, null);
  // passarela de operação atrás, com guarda-corpo e escada
  walkway(gal, XH, ZB - 1.3, X1, ZB, TOP + 0.02);
  for (let x = XH + 0.4; x < X1; x += 2.2) gal.add(rod([x, TOP - 0.05, ZB - 1.2], [x, TOP - 0.6, ZB - 0.02], 0.05, MAT.galv, 6));
  railing(gal, [[X1, ZB - 1.25], [XH + 1.2, ZB - 1.25]], TOP + 0.02);
  stairs(gal, [XH - 4.6, Y0, ZB - 0.65], [XH - 0.05, TOP, ZB - 0.65], 1.0);
  railing(gal, [[XH + 0.15, ZB + 0.1], [XH + 0.15, zGu1 - 0.05]], TOP);
  const galB = bake(gal); L.shadows(galB); root.add(galB);
  // discos móveis (lavagem do filtro 4 e descarga), num lote só
  const discG = new THREE.CylinderGeometry(0.9, 0.9, 0.1, 18).rotateX(PI / 2), discs = new THREE.InstancedMesh(discG, MAT.steel, discAt.length); discs.frustumCulled = false; root.add(discs);

  /* ---------------- planta (contorno) ---------------- */
  const gh = ghost.of(bake((() => { const g = new THREE.Group(); g.add(shell.clone(), troughs.clone(), fb.clone()); return g; })()));
  root.add(gh);

  /* ======================================================================================== update */
  const SEQ = [[0.25, 0.48], [0.48, 0.72], [0.72, 0.95]]; // janelas de cada camada dentro de S.build.filters
  const fillOf = (b, li, ci) => { const [a, c] = SEQ[li], u = sub(b, a, c); return L.clamp01((u - ci * 0.07) / 0.72); };
  const UVF = new Float32Array(8), UVT = new Float32Array(8);
  return {
    root, cells, chamberY: yF,
    update(t, S) {
      const b = S.build.filters, w = S.water.filters, bwRaw = S.run.backwash, bw = L.sstep(0, 1, bwRaw), st = S.st;
      gh.visible = b < 0.015;
      const kSlab = L.ease.out(sub(b, 0, 0.06)), kWall = L.ease.io(sub(b, 0.03, 0.15)), kFB = L.ease.out(sub(b, 0.13, 0.19)), kCr = sub(b, 0.16, 0.25), kTr = L.ease.out(sub(b, 0.18, 0.24));
      shellPiv.visible = b > 0.001; shellPiv.scale.y = Math.max(0.001, 0.06 * kSlab + 0.94 * kWall);
      fbPiv.visible = kFB > 0.001; fbPiv.scale.y = Math.max(0.001, kFB);
      trPiv.visible = kTr > 0.001; trPiv.position.y = (1 - kTr) * 3.5;
      galB.visible = gate4B.visible = discs.visible = b > 0.2;
      // crepinas: assentadas em sequência, da esquerda para a direita
      crep.visible = kCr > 0;
      if (crep.visible) { crPos.forEach((p, i) => { const k = L.ease.back(L.clamp01((kCr - p[4] * 0.75) / 0.25)); _o.position.set(p[0], p[1] + (1 - L.clamp01(k)) * 0.4, p[2]); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, k)); _o.updateMatrix(); crep.setMatrixAt(i, _o.matrix); }); crep.instanceMatrix.needsUpdate = true; }
      // camadas: cada uma despejada nos 4 filtros (levemente defasados) e espalhada; no filtro 4 o leito expande na lavagem
      cells.forEach((c) => {
        let y = yFB;
        LAY.forEach((l, li) => {
          const f = fillOf(b, li, c.i), th = l.y1 - l.y0, ex = c.i === 3 && li > 0 ? 1 + 0.28 * bw : 1, h = th * L.ease.io(f) * ex, q = LQ[li];
          if (h > 0.002) {
            const ur = c.w / 2.6, vr = Math.max(0.001, Math.min(1, h / th / ex)), off = c.i === 3 && li > 0 ? Math.sin(t * 9 + li) * 0.015 * bw : 0;
            UVF.set([off, 0, ur + off, 0, ur + off, vr, off, vr]); q.fr.front(c.i, c.a, c.b, y, y + h, ZC + 0.002, UVF);
            UVT.set([0, 0, c.w / 1.6, 0, c.w / 1.6, (ZC - ZI) / 1.6, 0, (ZC - ZI) / 1.6]); q.tp.top(c.i, c.a, c.b, ZI, ZC, y + h + 0.001, UVT);
          } else { q.fr.hide(c.i); q.tp.hide(c.i); }
          y += h;
        });
        c.mediaTop = y;
      });
      LQ.forEach((q) => { q.fr.done(); q.tp.done(); });
      // pedras 3D do cascalho
      pebD.forEach((p, i) => { const f = fillOf(b, 0, p.ci), yy = yFB + p.h * (LAY[0].y1 - LAY[0].y0), on = f > 0 && L.ease.io(f) * (LAY[0].y1 - LAY[0].y0) >= (yy - yFB) + p.s * 0.5; _o.position.set(p.x, yy, ZC + 0.004); _o.rotation.set(...p.r); _o.scale.set(on ? p.s : 0.00001, on ? p.s * 0.8 : 0.00001, on ? p.s * 0.6 : 0.00001); _o.updateMatrix(); peb.setMatrixAt(i, _o.matrix); });
      peb.instanceMatrix.needsUpdate = true;
      // big bags: descem, esvaziam (corpo encolhe) e sobem a cada camada
      const layerWin = (() => { for (let k = 0; k < 3; k++) if (b >= SEQ[k][0] && b < SEQ[k][1]) return k; return -1; })();
      bagPiv.visible = b > 0.25 && b < 0.97;
      let bagY = 20.6;
      if (bagPiv.visible) {
        const lw = layerWin >= 0 ? layerWin : 2, u = layerWin >= 0 ? sub(b, ...SEQ[layerWin]) : 1;
        bandM.color.copy(bandC[lw]);
        const lower = L.sstep(0, 0.12, u) * (1 - L.sstep(0.9, 1, u)), empty = L.clamp01((u - 0.1) / 0.8);
        bagY = 21.6 - 1.0 * lower; bagPiv.position.y = bagY; bagBody.scale.y = 1 - 0.55 * empty;
      }
      cells.forEach((c) => {
        const hp = heaps[c.i];
        let li = -1, f = 0; for (let k = 0; k < 3; k++) { const fk = fillOf(b, k, c.i); if (fk > 0 && fk < 1) { li = k; f = fk; } }
        hp.visible = li >= 0; if (li >= 0) { const hh = 0.42 * Math.pow(Math.sin(PI * f), 0.8), r = 0.5 + 1.7 * f; hp.material = TOPM[LAY[li].id]; hp.scale.set(r, Math.max(0.001, hh), r * 0.85); hp.position.set(c.c + 0.3, c.mediaTop - 0.005, bagZ); }
        const pouring = li >= 0 && f > 0.01 && f < 0.95 && bagPiv.visible, col = li >= 0 ? STREAM_COL[LAY[li].id] : '#ffffff';
        const ytop = bagY - 0.34, ybot = c.mediaTop + (hp.visible ? hp.scale.y : 0);
        for (let i = 0; i < streamN; i++) {
          const k = c.i * streamN + i, ph = L.fract(i * 0.6180339 + t * 1.9);
          _o.position.set(c.c + 0.3 + Math.sin(i * 7.1) * 0.06 * (0.3 + ph), L.lerp(ytop, ybot, ph * ph), bagZ + Math.cos(i * 3.7) * 0.06 * (0.3 + ph));
          _o.rotation.set(i, i * 2, t * 3); const s = pouring ? (li === 0 ? 0.05 : 0.03) * (0.7 + 0.5 * L.fract(i * 0.37)) : 0.00001; _o.scale.set(s, s, s); _o.updateMatrix(); stream.setMatrixAt(k, _o.matrix);
          if (pouring) stream.setColorAt(k, _c.set(col));
        }
      });
      stream.instanceMatrix.needsUpdate = true; stream.instanceColor.needsUpdate = true;
      // água: entra pelo canal, cobre o leito, percola, enche a câmara de água filtrada
      const wk = L.ease.io(w), lvl = L.lerp(LAY[2].y1 + 0.02, WL, wk), wet = L.sstep(0.2, 1, w);
      [FRONT, TOPM].forEach((MM) => LAY.forEach((l) => { MM[l.id].color.setScalar(1 - 0.22 * wet); }));
      const lvl4 = L.lerp(lvl, yLip + 0.07, bw);
      wC4.color.set(W.settled).lerp(_c.set('#7a6440'), L.sstep(0.05, 0.6, bwRaw));
      let qs = 0;
      cells.forEach((c) => {
        const Q = c.i === 3 ? Q4 : QS, iF = c.i === 3 ? 0 : qs++, iT = c.i === 3 ? 1 : qs++, lv = c.i === 3 ? lvl4 : lvl, base = c.mediaTop;
        if (w > 0.001 && lv > base + 0.01) { Q.front(iF, c.a, c.b, base, lv, ZC + 0.008); Q.top(iT, c.a, c.b, ZI, ZC, lv); } else { Q.hide(iF); Q.hide(iT); }
        const ch = L.lerp(FL, yFB0 - 0.01, L.sstep(0.35, 1, w));
        if (ch > FL + 0.01) QF.front(c.i, c.a, c.b, FL, ch, ZC + 0.006); else QF.hide(c.i);
      });
      // canal de entrada e calhas de entrada (com a queda d'água para dentro do filtro)
      const chl = L.lerp(yChF, yChW, L.sstep(0, 0.5, w));
      if (w > 0.001) QS.top(qs, XH + TH, X1 - TH, zCh0, zCh1, chl); else QS.hide(qs); qs++;
      cells.forEach((c) => {
        const [a, bb] = flumeX(c), open = c.i === 3 ? 1 - bw : 1, on = w > 0.05 && open > 0.05, Q = c.i === 3 ? Q4 : QS, iA = c.i === 3 ? 2 : qs++, iB = c.i === 3 ? 3 : qs++, lv = c.i === 3 ? lvl4 : lvl;
        if (on) { Q.top(iA, a + 0.06, bb - 0.06, zCh1, ZI, 18.86); Q.front(iB, a + 0.07, bb - 0.07, lv, 18.86, ZI + 0.05); } else { Q.hide(iA); Q.hide(iB); }
      });
      gate4B.position.y = 0.62 * bw;
      // lavagem no filtro 4: água marrom nas calhas e na canaleta
      const bwOn = bwRaw > 0.02;
      if (bwOn) QD.top(0, X0 + TH, X1 - TH, zDv1, zGu1, L.lerp(yGuF, 17.5, L.sstep(0, 0.5, bwRaw))); else QD.hide(0);
      troughX(cells[3]).forEach((x, j) => {
        const y1 = L.lerp(yTr0 + 0.08, yLip - 0.04, L.sstep(0.1, 0.5, bwRaw));
        if (bwOn) { QD.front(1 + j * 2, x - 0.175, x + 0.175, yTr0 + 0.07, y1, ZC + 0.01); QD.top(2 + j * 2, x - 0.175, x + 0.175, zGu1, ZC, y1); } else { QD.hide(1 + j * 2); QD.hide(2 + j * 2); }
        CB.update(chevTr[j], t, { speed: 0.5, amount: L.sstep(0.2, 0.5, bwRaw) });
      });
      [QS, Q4, QF, QD].forEach((q) => q.done());
      // válvulas móveis: lavagem do filtro 4 e descarga da canaleta abrem na lavagem
      discAt.forEach(([x, y, z, r, ry], i) => { _o.position.set(x, y, z); _o.rotation.set(0, ry + bw * PI / 2, 0); _o.scale.setScalar(r); _o.updateMatrix(); discs.setMatrixAt(i, _o.matrix); });
      discs.instanceMatrix.needsUpdate = true;
      // setas: água descendo pelo leito (filtros 1–3 sempre, 4 fora da lavagem), câmara para a direita, subida na lavagem
      const flowA = L.sstep(0.25, 0.9, w);
      chevDown.forEach(({ id, c }) => CA.update(id, t, { speed: 0.32, amount: flowA * (c.i === 3 ? 1 - L.sstep(0, 0.35, bwRaw) : 1) }));
      chevUp.forEach((id) => CA.update(id, t, { speed: 0.55, amount: L.sstep(0.05, 0.4, bwRaw) }));
      CA.update(chevCham, t, { speed: 0.12, amount: L.sstep(0.5, 1, w) });
      // impurezas caindo, presas e (na lavagem) subindo
      const trapK = S.present ? 1 : w * L.sstep(53.8, 57.4, st), clean4 = 1 - L.sstep(56.5, 57.8, st);
      fallD.forEach((p, i) => {
        const c = p.c, run = w > 0.6 && !(c.i === 3 && bwRaw > 0.01), u = L.fract(p.ph + t * p.sp), y0 = Math.min(18.7, (c.i === 3 ? lvl4 : lvl) - 0.06), fu = 0.65;
        const y = u < fu ? L.lerp(y0, p.stop, u / fu) : p.stop, s = run ? p.s * (u < fu ? 1 : 1 - (u - fu) / (1 - fu)) : 0.00001;
        _o.position.set(p.x + Math.sin(u * 9 + i) * 0.04, y, ZC + 0.02); _o.rotation.set(i, i, 0); _o.scale.setScalar(Math.max(0.00001, s)); _o.updateMatrix(); dots.setMatrixAt(i, _o.matrix);
      });
      trapD.forEach((p, i) => {
        const kk = p.c.i === 3 ? trapK * clean4 : trapK, on = kk > p.k;
        let y = p.y; if (p.c.i === 3 && p.y > LAY[1].y0) y = yFB + (p.y - yFB) * (1 + 0.28 * bw * L.clamp01((p.y - LAY[1].y0) / 0.8)) + Math.sin(t * 7 + i) * 0.03 * bw;
        _o.position.set(p.x, y, ZC + 0.015); _o.rotation.set(i, 0, i); _o.scale.setScalar(on ? p.s : 0.00001); _o.updateMatrix(); dots.setMatrixAt(NF + i, _o.matrix);
      });
      bwD.forEach((p, i) => {
        const u = L.fract(p.ph + t * (p.bub ? 0.55 : 0.4)), on = bwRaw > 0.05, y = L.lerp(15.15, lvl4 - 0.05, u);
        _o.position.set(p.x + Math.sin(u * 12 + i) * 0.12, y, ZC + 0.02); _o.rotation.set(i, t, 0); _o.scale.setScalar(on ? p.s * L.sstep(0.05, 0.3, bwRaw) : 0.00001); _o.updateMatrix(); dots.setMatrixAt(NF + NT + i, _o.matrix);
      });
      dots.instanceMatrix.needsUpdate = true;
    }
  };
}
