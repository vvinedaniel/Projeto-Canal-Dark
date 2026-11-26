// ETA 2 — FILTROS RÁPIDOS DE DUPLA CAMADA (4 caixas em corte pela frente, z = ZC).
// Por dentro, de baixo para cima: câmara de água filtrada → fundo falso com crepinas → cascalho graduado (camada suporte)
// → areia → antracito (carvão mineral) → lâmina d'água; calhas de coleta de água de lavagem; canal de entrada com
// comportas; canaleta (gullet) de água de lavagem; galeria de tubos atrás (água de lavagem e descarga) com válvulas.
// Obra: S.build.filters 0–.25 caixas, fundo falso, crepinas, calhas · .25–.95 camadas despejadas de big bags, uma a uma.
// Água: S.water.filters (lâmina, percolação, câmara). Lavagem em contracorrente: S.run.backwash, só no filtro 4.
export function makeFilters(ctx, K) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, G, bx, bake, pipe, butterfly, gateValve, railing, stairs, walkway, rod, canvasTex } = K;
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

  /* ---------------- camadas filtrantes (face de corte + topo, por filtro) ---------------- */
  const layerM = cells.map((c) => LAY.map((l) => {
    const fg = new THREE.PlaneGeometry(1, 1), front = new THREE.Mesh(fg, FRONT[l.id]); front.receiveShadow = true;
    const tg = new THREE.PlaneGeometry(1, 1); tg.rotateX(-PI / 2);
    const uv = tg.attributes.uv, d = ZC - ZI; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * c.w / 1.6, uv.getY(i) * d / 1.6);
    const top = new THREE.Mesh(tg, TOPM[l.id]); top.receiveShadow = true; top.castShadow = false;
    top.scale.set(c.w, 1, d); top.position.set(c.c, 0, (ZC + ZI) / 2);
    root.add(front, top); return { front, top, l };
  }));
  // pedras 3D do cascalho graduado no corte (maiores embaixo)
  const pebN = 80, peb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#8a857c', { roughness: 0.85, flatShading: true }), pebN * F.n);
  const pebD = []; { const rd = L.rng(77); for (let ci = 0; ci < F.n; ci++) for (let i = 0; i < pebN; i++) { const c = cells[ci], h = rd(); pebD.push({ ci, x: L.lerp(c.a + 0.1, c.b - 0.1, rd()), h, s: (0.028 + 0.055 * Math.pow(1 - h, 1.5)) * (0.75 + rd() * 0.4), r: [rd() * 6, rd() * 6, rd() * 6] }); peb.setColorAt(ci * pebN + i, new THREE.Color().setHSL(0.08 + rd() * 0.04, 0.08 + rd() * 0.08, 0.36 + rd() * 0.22)); } }
  peb.castShadow = false; peb.receiveShadow = true; peb.frustumCulled = false; root.add(peb);
  // monte de material sendo espalhado (cone) e big bags com jorro de grãos
  const heapGeo = new THREE.ConeGeometry(1, 1, 28, 1, true).translate(0, 0.5, 0);
  const heaps = cells.map(() => { const m = new THREE.Mesh(heapGeo, TOPM.cascalho); m.castShadow = true; m.receiveShadow = true; root.add(m); return m; });
  const bagM = M('#ece8dc', { roughness: 0.8 }), bandM = LAY.map((l) => M(l.id === 'cascalho' ? '#7d766c' : l.id === 'areia' ? '#cfa864' : '#22262b', { roughness: 0.6 }));
  const bags = cells.map((c) => {
    const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
    body.add(L.rbox(1.0, 1.0, 1.0, 0.12, bagM, 0, 0.5, 0)); const band = L.box(1.02, 0.18, 1.02, bandM[0], 0, 0.62, 0); body.add(band);
    body.add(L.cyl(0.12, 0.16, 0.3, bagM, 0, -0.1, 0, 12));
    [[-0.38, -0.38], [0.38, -0.38], [-0.38, 0.38], [0.38, 0.38]].forEach(([x, z]) => { const lp = L.torus(0.1, 0.025, bagM, x, 1.06, z); lp.rotation.y = Math.atan2(x, z); body.add(lp); g.add(rod([x, 1.1, z], [0, 3.6, 0], 0.012, MAT.steel, 4)); });
    g.add(rod([0, 3.6, 0], [0, 9, 0], 0.02, MAT.steel, 4), L.sph(0.07, MAT.yellow, 0, 3.6, 0));
    g.scale.setScalar(1.35); g.position.set(c.c + 0.3, 20.6, (ZC + ZI) / 2 + 0.4); root.add(g); return { g, body, band };
  });
  const streamN = 46, stream = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), M('#ffffff', { roughness: 0.6, flatShading: true }), streamN * F.n);
  stream.castShadow = false; stream.frustumCulled = false; root.add(stream);
  const STREAM_COL = { cascalho: '#8c867c', areia: '#d6b97e', antracito: '#1c1f22' };
  LAY.forEach(() => {}); for (let i = 0; i < streamN * F.n; i++) stream.setColorAt(i, new THREE.Color('#ffffff'));

  /* ---------------- água ---------------- */
  const wSet = L.water(W.settled, 0.8, { side: THREE.DoubleSide }), wFil = L.water(W.filtered, 0.86, { side: THREE.DoubleSide });
  const wC4 = L.water(W.settled, 0.82, { side: THREE.DoubleSide }), wDirty = L.water('#6f5a3c', 0.9, { side: THREE.DoubleSide });
  const plane = (m, rot) => { const g = new THREE.PlaneGeometry(1, 1); if (rot) g.rotateX(-PI / 2); const ms = new THREE.Mesh(g, m); ms.castShadow = false; ms.receiveShadow = true; root.add(ms); return ms; };
  const cellW = cells.map((c) => { const m = c.i === 3 ? wC4 : wSet; return { front: plane(m), top: plane(m, true), cham: plane(wFil) }; });
  const chanW = plane(wSet, true), chanF = plane(wSet);             // canal de entrada (superfície + face na abertura)
  const flumeW = cells.map((c) => ({ top: plane(c.i === 3 ? wC4 : wSet, true), fall: plane(c.i === 3 ? wC4 : wSet) }));
  const gullW = plane(wDirty, true);                                  // canaleta com água de lavagem (só na lavagem)
  const trW = troughX(cells[3]).map(() => ({ front: plane(wDirty), top: plane(wDirty, true) }));
  const setP = (m, cx, cy, cz, sx, sy, sz = 1) => { m.position.set(cx, cy, cz); m.scale.set(sx, sy, sz); };

  /* ---------------- setas e partículas ---------------- */
  const chevDown = [], chevUp = [];
  cells.forEach((c) => [-0.45, 0.45].forEach((dx) => {
    const x = c.c + dx, p = [[x, 18.55, ZC + 0.05], [x, 14.95, ZC + 0.05]];
    const ch = new L.Chevrons(p, { n: 5, size: 0.19, normal: [0, 0, 1], material: L.flat(L.PAL.accent, { transparent: true, toneMapped: false, depthTest: false }) }); ch.mesh.renderOrder = 40; root.add(ch.mesh); chevDown.push({ ch, c });
    if (c.i === 3) { const cu = new L.Chevrons([[x, 14.75, ZC + 0.06], [x, 18.4, ZC + 0.06]], { n: 6, size: 0.21, normal: [0, 0, 1], material: L.flat('#bfefff', { transparent: true, toneMapped: false, depthTest: false }) }); cu.mesh.renderOrder = 40; root.add(cu.mesh); chevUp.push(cu); }
  }));
  const chevCham = new L.Chevrons([[X0 + 0.5, 14.64, ZC + 0.06], [X1 - 0.35, 14.64, ZC + 0.06]], { n: 14, size: 0.16, normal: [0, 0, 1], material: L.flat('#bfefff', { transparent: true, toneMapped: false, depthTest: false }) });
  chevCham.mesh.renderOrder = 40; root.add(chevCham.mesh);
  const chevTr = troughX(cells[3]).map((x) => { const ch = new L.Chevrons([[x, 18.25, ZC - 0.2], [x, 18.25, zGu1 + 0.1]], { n: 6, size: 0.17, normal: [0, 1, 0.4], material: L.flat('#ffcf6a', { transparent: true, toneMapped: false }) }); root.add(ch.mesh); return ch; });
  // impurezas: caindo pela água e ficando presas (mais no topo do antracito, menos na areia; poucas passam)
  const dirtCols = ['#7a5a36', '#8c6a40', '#5e4529', '#9a7a4a'];
  const fallN = 26, trapN = 150, rdp = L.rng(901);
  const fallD = [], trapD = [];
  const stopY = (r) => (r < 0.58 ? L.lerp(17.18, 16.95, r / 0.58) : r < 0.84 ? L.lerp(16.95, 16.6, (r - 0.58) / 0.26) : r < 0.97 ? L.lerp(16.48, 16.15, (r - 0.84) / 0.13) : 15.2);
  cells.forEach((c) => {
    for (let i = 0; i < fallN; i++) fallD.push({ c, x: L.lerp(c.a + 0.15, c.b - 0.15, rdp()), stop: stopY(rdp()), ph: rdp(), s: 0.03 + rdp() * 0.03, sp: 0.22 + rdp() * 0.12 });
    for (let i = 0; i < trapN; i++) { const r = Math.pow(rdp(), 1.25); trapD.push({ c, x: L.lerp(c.a + 0.08, c.b - 0.08, rdp()), y: r < 0.97 ? stopY(r) : 16.2, s: 0.022 + rdp() * 0.03, k: rdp() }); }
  });
  const dGeo = new THREE.IcosahedronGeometry(1, 0), dMat = M('#ffffff', { roughness: 0.7 });
  const fallI = new THREE.InstancedMesh(dGeo, dMat, fallD.length), trapI = new THREE.InstancedMesh(dGeo, dMat, trapD.length);
  [fallI, trapI].forEach((im, j) => { im.castShadow = false; im.frustumCulled = false; root.add(im); (j ? trapD : fallD).forEach((_, i) => im.setColorAt(i, new THREE.Color(dirtCols[i % 4]))); });
  // lavagem: sujeira e bolhas subindo no filtro 4
  const bwN = 70, bwD = [], bwI = new THREE.InstancedMesh(dGeo, dMat, bwN);
  for (let i = 0; i < bwN; i++) { const c = cells[3]; bwD.push({ x: L.lerp(c.a + 0.15, c.b - 0.15, rdp()), ph: rdp(), s: 0.025 + rdp() * 0.035, bub: rdp() < 0.3 }); bwI.setColorAt(i, new THREE.Color(bwD[i].bub ? '#dff6ff' : dirtCols[i % 4])); }
  bwI.castShadow = false; bwI.frustumCulled = false; root.add(bwI);

  /* ---------------- comportas de entrada, galeria de tubos atrás, passarela ---------------- */
  const gates = cells.map((c) => {
    const [a, b] = flumeX(c), g = new THREE.Group(), x = (a + b) / 2;
    g.add(bx([a - 0.08, 18.7, zCh1 - 0.06], [a, 20.3, zDv1 + 0.06], MAT.galv), bx([b, 18.7, zCh1 - 0.06], [b + 0.08, 20.3, zDv1 + 0.06], MAT.galv), bx([a - 0.08, 20.25, zCh1 - 0.06], [b + 0.08, 20.35, zDv1 + 0.06], MAT.galv));
    const plate = L.box(b - a + 0.04, 0.6, 0.05, MAT.iron, x, 0, (zCh1 + zDv1) / 2); const stem = L.cyl(0.025, 0.025, 1.2, MAT.steel, x, 0.6, (zCh1 + zDv1) / 2, 6);
    const pg = new THREE.Group(); pg.add(plate, stem); g.add(pg);
    const hw = L.torus(0.2, 0.025, MAT.red, x, 20.62, (zCh1 + zDv1) / 2); hw.rotation.x = PI / 2; g.add(hw, L.cyl(0.05, 0.07, 0.25, MAT.iron, x, 20.47, (zCh1 + zDv1) / 2, 8));
    root.add(g); return { g, pg };
  });
  const gal = new THREE.Group();
  // água de lavagem (tubo azul de água tratada) vindo da bomba de lavagem, junto ao reservatório
  const zW = ZB - 0.75, zD = ZB - 1.35, yW = 14.55;
  pipe(gal, [[X0 + 0.3, yW, zW], [14.6, yW, zW]], 0.2, MAT.treated, { flanges: 'start' });
  const bwValves = cells.map((c) => {
    const x = c.c + 1.9;
    pipe(gal, [[x, yW, zW], [x, 14.7, zW + 0.35], [x, 14.7, ZI + 0.05]], 0.14, MAT.treated, { flanges: false });
    const v = butterfly(0.14, MAT.iron); v.g.remove(v.disc); v.g.position.set(x, 14.7, ZB - 0.32); gal.add(v.g);
    return v;
  });
  // bocais de entrada da água de lavagem na câmara (vistos no corte, ao fundo)
  cells.forEach((c) => { gal.add(L.cyl(0.2, 0.14, 0.12, MAT.treated, c.c + 1.9, 14.7, ZI + 0.08, 14).rotateX(PI / 2)); });
  // descarga da canaleta de lavagem → tanque de lodo (eta1) pela esquerda
  pipe(gal, [[X0 + 0.6, yGuF + 0.05, (zDv1 + zGu1) / 2], [X0 + 0.6, yGuF - 0.6, (zDv1 + zGu1) / 2]], 0.22, MAT.grey, { flanges: false });
  const sx = Lo.ETA.sludgeTank, sa = Math.atan2(1, 1), sp = [sx.x + Math.cos(sa) * (sx.r + 0.05), 14.6, sx.z + Math.sin(sa) * (sx.r + 0.05)];
  pipe(gal, [[X0 + 0.6, 15.6, zD + 0.25], [X0 + 0.6, 14.6, zD], [XH - 1.2, 14.6, zD], [XH - 1.2, 14.6, -62.5], [sp[0] + 1.6, 14.6, -62.5], [sp[0], 14.6, sp[2]]], 0.24, MAT.grey, { flanges: 'end' });
  pipe(gal, [[X0 + 0.6, yGuF - 0.6, (zDv1 + zGu1) / 2], [X0 + 0.6, 15.6, zD + 0.25]], 0.22, MAT.grey, { flanges: false });
  const drainV = butterfly(0.24, MAT.iron); drainV.g.remove(drainV.disc); drainV.g.rotation.y = PI / 2; drainV.g.position.set(XH - 0.2, 14.6, zD); gal.add(drainV.g);
  // berços dos tubos
  for (let x = X0 + 1; x < 13; x += 2.4) gal.add(bx([x - 0.15, Y0, zW - 0.25], [x + 0.15, yW - 0.18, zW + 0.25], MAT.concDark));
  for (let x = XH - 1; x < X0 + 0.5; x += 2.4) gal.add(bx([x - 0.15, Y0, zD - 0.25], [x + 0.15, 14.36, zD + 0.25], MAT.concDark));
  // água filtrada: coletor ao fundo da câmara, sai pela direita até o tanque de contato
  const zF = ZI + 0.42, yF = 14.62, CIN = Lo.P.contactIn;
  const filtPath = pipe(gal, [[X0 + 0.4, yF, zF], [X1 + 0.8, yF, zF], [X1 + 0.8, CIN[1], CIN[2]], CIN], 0.25, MAT.treated, { flanges: 'end', bend: 0.45 });
  const outV = butterfly(0.25, MAT.iron); outV.g.remove(outV.disc); outV.g.position.set(X1 + 0.8, 14.72, (zF + CIN[2]) / 2); gal.add(outV.g);
  // passarela de operação atrás, com guarda-corpo e escada
  walkway(gal, XH, ZB - 1.3, X1, ZB, TOP + 0.02);
  for (let x = XH + 0.4; x < X1; x += 2.2) gal.add(rod([x, TOP - 0.05, ZB - 1.2], [x, TOP - 0.6, ZB - 0.02], 0.05, MAT.galv, 6));
  railing(gal, [[X1, ZB - 1.25], [XH + 1.2, ZB - 1.25]], TOP + 0.02);
  stairs(gal, [XH - 4.6, Y0, ZB - 0.65], [XH - 0.05, TOP, ZB - 0.65], 1.0);
  railing(gal, [[XH + 0.15, ZB + 0.1], [XH + 0.15, zGu1 - 0.05]], TOP);
  const galB = bake(gal); L.shadows(galB); root.add(galB);
  const discs = [...cells.map((c) => [c.c + 1.9, 14.7, ZB - 0.32, 0.14, 0]), [XH - 0.2, 14.6, zD, 0.24, PI / 2], [X1 + 0.8, 14.72, (zF + CIN[2]) / 2, 0.25, 0]].map(([x, y, z, r, ry]) => {
    const d = new THREE.Group(), m = L.cyl(r * 0.9, r * 0.9, r * 0.1, MAT.steel, 0, 0, 0, 18); m.rotation.x = PI / 2; d.add(m); d.position.set(x, y, z); d.userData.ry = ry; root.add(d); return d;
  });

  /* ---------------- planta (contorno) ---------------- */
  const gh = ghost.of(bake((() => { const g = new THREE.Group(); g.add(shell.clone(), troughs.clone(), fb.clone()); return g; })()));
  root.add(gh);

  /* ======================================================================================== update */
  const SEQ = [[0.25, 0.48], [0.48, 0.72], [0.72, 0.95]]; // janelas de cada camada dentro de S.build.filters
  return {
    root, cells, chamberY: yF,
    update(t, S) {
      const b = S.build.filters, w = S.water.filters, bwRaw = S.run.backwash, bw = L.sstep(0, 1, bwRaw), st = S.st;
      root.visible = true;
      gh.visible = b < 0.015;
      const kSlab = L.ease.out(sub(b, 0, 0.06)), kWall = L.ease.io(sub(b, 0.03, 0.15)), kFB = L.ease.out(sub(b, 0.13, 0.19)), kCr = sub(b, 0.16, 0.25), kTr = L.ease.out(sub(b, 0.18, 0.24));
      shellPiv.visible = b > 0.001; shellPiv.scale.y = Math.max(0.001, 0.06 * kSlab + 0.94 * kWall);
      fbPiv.visible = kFB > 0.001; fbPiv.scale.y = Math.max(0.001, kFB);
      trPiv.visible = kTr > 0.001; trPiv.position.y = (1 - kTr) * 3.5;
      galB.visible = b > 0.2; discs.forEach((d) => { d.visible = b > 0.2; });
      gates.forEach((g) => { g.g.visible = b > 0.2; });
      // crepinas: assentadas em sequência, da esquerda para a direita
      crep.visible = kCr > 0;
      crPos.forEach((p, i) => { const k = L.ease.back(L.clamp01((kCr - p[4] * 0.75) / 0.25)); _o.position.set(p[0], p[1] + (1 - L.clamp01(k)) * 0.4, p[2]); _o.rotation.set(0, 0, 0); _o.scale.setScalar(Math.max(0.0001, k)); _o.updateMatrix(); crep.setMatrixAt(i, _o.matrix); });
      crep.instanceMatrix.needsUpdate = true;
      // camadas: cada uma despejada nos 4 filtros (levemente defasados) e espalhada
      const fillOf = (li, ci) => { const [a, c] = SEQ[li], u = sub(b, a, c); return L.clamp01((u - ci * 0.07) / 0.72); };
      const exp = bw; // expansão do leito (só filtro 4)
      let activeLayer = -1;
      cells.forEach((c) => {
        let y = yFB;
        LAY.forEach((l, li) => {
          const f = fillOf(li, c.i), th = l.y1 - l.y0, ex = c.i === 3 && li > 0 ? 1 + 0.28 * exp : 1, h = th * L.ease.io(f) * ex, lm = layerM[c.i][li];
          lm.front.visible = lm.top.visible = h > 0.002;
          lm.front.scale.set(c.w, Math.max(0.001, h), 1); lm.front.position.set(c.c, y + h / 2, ZC + 0.002);
          const uv = lm.front.geometry.attributes.uv, ur = c.w / 2.6, vr = Math.min(1, h / th / (ex > 1 ? ex : 1)) || 0.001, off = c.i === 3 && li > 0 ? Math.sin(t * 9 + li) * 0.015 * exp : 0;
          uv.setXY(0, off, vr); uv.setXY(1, ur + off, vr); uv.setXY(2, off, 0); uv.setXY(3, ur + off, 0); uv.needsUpdate = true;
          lm.top.position.y = y + h + 0.001;
          if (f > 0 && f < 1) activeLayer = li;
          y += h;
        });
        c.mediaTop = y;
      });
      // pedras 3D do cascalho
      pebD.forEach((p, i) => { const f = fillOf(0, p.ci), yy = yFB + p.h * (LAY[0].y1 - LAY[0].y0), on = f > 0 && L.ease.io(f) * (LAY[0].y1 - LAY[0].y0) >= (yy - yFB) + p.s * 0.5; _o.position.set(p.x, yy, ZC + 0.004); _o.rotation.set(...p.r); _o.scale.set(on ? p.s : 0.00001, on ? p.s * 0.8 : 0.00001, on ? p.s * 0.6 : 0.00001); _o.updateMatrix(); peb.setMatrixAt(i, _o.matrix); });
      peb.instanceMatrix.needsUpdate = true;
      // montes, big bags e jorro
      cells.forEach((c) => {
        const hp = heaps[c.i], bg = bags[c.i];
        let li = -1, f = 0; for (let k = 0; k < 3; k++) { const fk = fillOf(k, c.i); if (fk > 0 && fk < 1) { li = k; f = fk; } }
        const layerWin = (() => { for (let k = 0; k < 3; k++) if (b >= SEQ[k][0] && b < SEQ[k][1]) return k; return -1; })();
        hp.visible = li >= 0; if (li >= 0) { const hh = 0.42 * Math.pow(Math.sin(PI * f), 0.8), r = 0.5 + 1.7 * f; hp.material = TOPM[LAY[li].id]; hp.scale.set(r, Math.max(0.001, hh), r * 0.85); hp.position.set(c.c + 0.3, c.mediaTop - 0.005, (ZC + ZI) / 2 + 0.4); }
        bg.g.visible = b > 0.25 && b < 0.97;
        if (bg.g.visible) {
          const lw = layerWin >= 0 ? layerWin : 2, u = layerWin >= 0 ? sub(b, ...SEQ[layerWin]) : 1;
          bg.band.material = bandM[lw];
          const lower = L.sstep(0, 0.12, u) * (1 - L.sstep(0.9, 1, u)), empty = L.clamp01((u - 0.1) / 0.8);
          bg.g.position.y = 21.6 - 1.0 * lower; bg.g.rotation.z = Math.sin(t * 1.3 + c.i) * 0.03;
          bg.body.scale.set(1 + 0.05 * empty, 1 - 0.55 * empty, 1 + 0.05 * empty);
        }
        // jorro
        const pouring = li >= 0 && f > 0.01 && f < 0.95;
        const col = li >= 0 ? STREAM_COL[LAY[li].id] : '#ffffff', ytop = bg.g.position.y - 0.25, ybot = c.mediaTop + (hp.visible ? hp.scale.y : 0);
        for (let i = 0; i < streamN; i++) {
          const k = c.i * streamN + i, ph = L.fract(i * 0.6180339 + t * 1.9), on = pouring && bg.g.visible;
          _o.position.set(c.c + 0.3 + Math.sin(i * 7.1) * 0.06 * (0.3 + ph), L.lerp(ytop, ybot, ph * ph), (ZC + ZI) / 2 + 0.4 + Math.cos(i * 3.7) * 0.06 * (0.3 + ph));
          _o.rotation.set(i, i * 2, t * 3); const s = on ? (li === 0 ? 0.05 : 0.03) * (0.7 + 0.5 * L.fract(i * 0.37)) : 0.00001; _o.scale.set(s, s, s); _o.updateMatrix(); stream.setMatrixAt(k, _o.matrix);
          if (on) stream.setColorAt(k, _c.set(col));
        }
      });
      stream.instanceMatrix.needsUpdate = true; stream.instanceColor.needsUpdate = true;
      // água: entra pelo canal, cobre o leito, percola, enche a câmara de água filtrada
      const wk = L.ease.io(w), lvl = L.lerp(LAY[2].y1 + 0.02, WL, wk), wet = L.sstep(0.2, 1, w);
      [FRONT, TOPM].forEach((MM) => LAY.forEach((l) => { const base = l.id === 'antracito' ? 1 : 1; MM[l.id].color.setScalar(base - 0.22 * wet); }));
      const lvl4 = L.lerp(lvl, yLip + 0.07, bw);
      wC4.color.set(W.settled).lerp(_c.set('#7a6440'), L.sstep(0.05, 0.6, bwRaw));
      cells.forEach((c) => {
        const cwm = cellW[c.i], lv = c.i === 3 ? lvl4 : lvl, base = c.mediaTop;
        const vis = w > 0.001 && lv > base + 0.01;
        cwm.front.visible = cwm.top.visible = vis;
        if (vis) { setP(cwm.front, c.c, (base + lv) / 2, ZC + 0.008, c.w, lv - base); setP(cwm.top, c.c, lv, (ZC + ZI) / 2, c.w, 1, ZC - ZI); }
        const ch = L.lerp(FL, yFB0 - 0.01, L.sstep(0.35, 1, w)); cwm.cham.visible = ch > FL + 0.01;
        if (cwm.cham.visible) setP(cwm.cham, c.c, (FL + ch) / 2, ZC + 0.006, c.w, ch - FL);
      });
      const chl = L.lerp(yChF, yChW, L.sstep(0, 0.5, w)); chanW.visible = w > 0.001; setP(chanW, (XH + TH + X1 - TH) / 2, chl, (zCh0 + zCh1) / 2, X1 - TH - XH - TH, 1, zCh1 - zCh0);
      chanF.visible = false;
      cells.forEach((c, i) => { const [a, bb] = flumeX(c), fw = flumeW[i], open = c.i === 3 ? 1 - bw : 1, on = w > 0.05 && open > 0.05; fw.top.visible = fw.fall.visible = on; if (on) { setP(fw.top, (a + bb) / 2, 18.86, (zCh1 + ZI) / 2, bb - a - 0.12, 1, ZI - zCh1); const lv = c.i === 3 ? lvl4 : lvl; setP(fw.fall, (a + bb) / 2, (18.86 + lv) / 2, ZI + 0.05, bb - a - 0.14, Math.max(0.01, 18.86 - lv)); fw.fall.rotation.x = 0; } gates[i].pg.position.y = 18.72 + 0.62 * (1 - open); });
      // lavagem no filtro 4: água marrom nas calhas e na canaleta
      const bwOn = bwRaw > 0.02;
      gullW.visible = bwOn; if (bwOn) setP(gullW, (X0 + X1) / 2, L.lerp(yGuF, 17.5, L.sstep(0, 0.5, bwRaw)), (zDv1 + zGu1) / 2, X1 - X0 - 2 * TH, 1, zGu1 - zDv1);
      troughX(cells[3]).forEach((x, j) => { const tw = trW[j], y1 = L.lerp(yTr0 + 0.08, yLip - 0.04, L.sstep(0.1, 0.5, bwRaw)); tw.front.visible = tw.top.visible = bwOn; if (bwOn) { setP(tw.front, x, (yTr0 + 0.07 + y1) / 2, ZC + 0.01, 0.35, y1 - yTr0 - 0.07); setP(tw.top, x, y1, (ZC + zGu1) / 2, 0.35, 1, ZC - zGu1); } chevTr[j].update(t, { speed: 0.5, amount: L.sstep(0.2, 0.5, bwRaw) }); });
      // válvulas: lavagem do filtro 4 abre; saída da água filtrada fica aberta
      discs.forEach((d, i) => { const open = i < 4 ? (i === 3 ? bw : 0) : i === 4 ? bw : 1; d.rotation.y = d.userData.ry + open * PI / 2; });
      // setas: água descendo pelo leito (filtros 1–3 sempre, 4 fora da lavagem), câmara para a direita
      const flowA = L.sstep(0.25, 0.9, w);
      chevDown.forEach(({ ch, c }) => ch.update(t, { speed: 0.32, amount: flowA * (c.i === 3 ? 1 - L.sstep(0, 0.35, bwRaw) : 1) }));
      chevUp.forEach((ch) => ch.update(t, { speed: 0.55, amount: L.sstep(0.05, 0.4, bwRaw) }));
      chevCham.update(t, { speed: 0.12, amount: L.sstep(0.5, 1, w) });
      // impurezas caindo e presas
      const trapK = S.present ? 1 : w * L.sstep(53.8, 57.4, st);
      fallD.forEach((p, i) => {
        const c = p.c, run = w > 0.6 && !(c.i === 3 && bwRaw > 0.01), u = L.fract(p.ph + t * p.sp), y0 = Math.min(18.7, (c.i === 3 ? lvl4 : lvl) - 0.06), fallU = 0.65;
        const y = u < fallU ? L.lerp(y0, p.stop, u / fallU) : p.stop, s = run ? p.s * (u < fallU ? 1 : 1 - (u - fallU) / (1 - fallU)) : 0.00001;
        _o.position.set(p.x + Math.sin(u * 9 + i) * 0.04, y, ZC + 0.02); _o.rotation.set(i, i, 0); _o.scale.setScalar(Math.max(0.00001, s)); _o.updateMatrix(); fallI.setMatrixAt(i, _o.matrix);
      });
      fallI.instanceMatrix.needsUpdate = true;
      const clean4 = 1 - L.sstep(56.5, 57.8, st) * (st < 150 ? 1 : 1);
      trapD.forEach((p, i) => {
        const kk = p.c.i === 3 ? trapK * clean4 : trapK, on = kk > p.k;
        let y = p.y; if (p.c.i === 3 && p.y > LAY[1].y0) y = yFB + (p.y - yFB) * (1 + 0.28 * exp * L.clamp01((p.y - LAY[1].y0) / 0.8)) + Math.sin(t * 7 + i) * 0.03 * exp;
        _o.position.set(p.x, y, ZC + 0.015); _o.rotation.set(i, 0, i); _o.scale.setScalar(on ? p.s : 0.00001); _o.updateMatrix(); trapI.setMatrixAt(i, _o.matrix);
      });
      trapI.instanceMatrix.needsUpdate = true;
      bwD.forEach((p, i) => {
        const u = L.fract(p.ph + t * (p.bub ? 0.55 : 0.4)), on = bwRaw > 0.05, y = L.lerp(15.15, lvl4 - 0.05, u);
        _o.position.set(p.x + Math.sin(u * 12 + i) * 0.12, y, ZC + 0.02); _o.rotation.set(i, t, 0); _o.scale.setScalar(on ? p.s * L.sstep(0.05, 0.3, bwRaw) : 0.00001); _o.updateMatrix(); bwI.setMatrixAt(i, _o.matrix);
      });
      bwI.instanceMatrix.needsUpdate = true;
    }
  };
}
