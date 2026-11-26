// ETA 2 — LABORATÓRIO em corte (pela frente, z = lab.z1): bancada central com pia e TORNEIRA DE AMOSTRA (Lo.ETA.sample,
// ligada por tubo fino à saída do reservatório), turbidímetro, colorímetro de cloro com cubeta, tubo com reagente DPD
// (rosa = há cloro livre), pHmetro com eletrodo no béquer, frascos de coleta, placas de cultura; bancada do fundo com
// frascos de reagentes e armários; estufa com placas; computador; painel de resultados na parede (✓ sem números —
// a fonte da norma é posta pelo integrador). Obra: S.build.lab. Foco da câmera: 70,6–74,4 s.
export function makeLab(ctx, K) {
  const { L, THREE, Lo, ghost } = ctx, { MAT, M, G, bx, bake, pipe, rod, canvasTex } = K;
  const B = Lo.ETA.lab, SA = Lo.ETA.sample, PI = Math.PI;
  const X0 = B.x0, X1 = B.x1, ZB = B.z0, ZC = B.z1, FL = B.floor, RF = B.roof, T = 0.25;
  const root = new THREE.Group(), sub = (b, a, c) => L.clamp01((b - a) / (c - a));
  const cutRect = (g, x0, y0, x1, y1, z = ZC + 0.004) => g.add(L.mesh(new THREE.PlaneGeometry(x1 - x0, y1 - y0), MAT.cut, (x0 + x1) / 2, (y0 + y1) / 2, z, { cast: false }));
  const wallM = M('#efe9dc', { roughness: 0.8, side: THREE.DoubleSide });

  /* ---------- prédio ---------- */
  const gS = new THREE.Group(), gW = new THREE.Group(), gR = new THREE.Group();
  gS.add(bx([X0, FL - 0.12, ZB], [X1, FL + 0.05, ZC], MAT.conc)); cutRect(gS, X0, FL - 0.12, X1, FL + 0.05);
  gS.add(bx([X0 + T, FL + 0.05, ZB + T], [X1 - T, FL + 0.052, ZC], MAT.tile));
  gW.add(bx([X0, FL, ZB], [X1, RF, ZB + T], wallM));
  const side = (xa, xb, holes) => { const m = L.extrude([[ZB, FL], [ZC, FL], [ZC, RF], [ZB, RF]], xb - xa, wallM, { holes: holes.map(([a, b, c, d]) => [[a, c], [b, c], [b, d], [a, d]]) }); m.rotation.y = -PI / 2; m.position.x = xb; gW.add(m); };
  side(X0, X0 + T, [[-42.8, -40.6, 15.4, 17.2], [-39.4, -37.2, 15.4, 17.2]]);
  side(X1 - T, X1, [[-38.8, -37.4, FL + 0.05, 16.3]]);
  [[-42.8, -40.6], [-39.4, -37.2]].forEach(([a, b]) => gW.add(bx([X0 + 0.08, 15.4, a], [X0 + 0.14, 17.2, b], MAT.glassW)));
  cutRect(gW, X0, FL, X0 + T, RF); cutRect(gW, X1 - T, FL, X1, RF);
  gW.add(bx([X1 - 0.05, FL + 0.05, -38.8], [X1 + 0.02, 16.3, -38.1], M('#6c8fb0', { roughness: 0.5 }))); // folha da porta entreaberta
  gR.add(bx([X0 - 0.1, RF, ZB - 0.1], [X1 + 0.1, RF + 0.25, -40.0], MAT.slab), bx([X0 - 0.1, RF + 0.25, ZB - 0.1], [X1 + 0.1, RF + 0.5, ZB + 0.1], MAT.slab));
  cutRect(gR, X0 - 0.1, RF, X1 + 0.1, RF + 0.25, -40.0 + 0.004);
  gR.add(bx([X0 + 0.1, RF - 0.3, ZC - 0.25], [X1 - 0.1, RF, ZC], MAT.concOld)); // viga da frente
  const lightM = L.glow('#fff6e0', 1.4);
  [[33.6, -42.0], [38.2, -42.0]].forEach(([x, z]) => gR.add(L.box(1.6, 0.05, 0.5, lightM, x, RF - 0.03, z)));
  const bS = bake(gS), bW = bake(gW), bR = bake(gR); [bS, bW, bR].forEach((o) => L.shadows(o));
  const pS = L.group(root, 0, FL - 0.12, 0), iS = L.group(pS, 0, -(FL - 0.12), 0); iS.add(bS);
  const pW = L.group(root, 0, FL, 0), iW = L.group(pW, 0, -FL, 0); iW.add(bW);
  const pR = L.group(root); pR.add(bR);

  /* ---------- mobiliário ---------- */
  const fur = new THREE.Group(), cabM = M('#dfe4e8', { roughness: 0.5 }), topM = M('#3a4048', { roughness: 0.35 }), handM = MAT.steel;
  function bench(x0, x1, z0, z1, top) {
    fur.add(bx([x0, FL + 0.05, z0], [x1, top - 0.05, z1], cabM), bx([x0 - 0.03, top - 0.05, z0 - 0.03], [x1 + 0.03, top, z1 + 0.03], topM));
    fur.add(bx([x0, FL + 0.05, z1 - 0.02], [x1, FL + 0.15, z1 + 0.005], MAT.dark)); // rodapé
    for (let x = x0 + 0.05; x < x1 - 0.3; x += 0.6) { fur.add(bx([x, FL + 0.2, z1], [x + 0.52, top - 0.1, z1 + 0.012], M('#eef1f3', { roughness: 0.45 })), bx([x + 0.42, top - 0.3, z1 + 0.01], [x + 0.45, top - 0.16, z1 + 0.04], handM)); }
  }
  const IT = 14.82; // tampo da ilha
  bench(32.0, 37.2, -40.7, -39.3, IT);
  bench(X0 + T + 0.05, 38.4, ZB + T, ZB + T + 0.72, 14.92);
  // armários altos com portas de vidro e frascos
  fur.add(bx([X0 + T + 0.05, 16.3, ZB + T], [34.2, 17.3, ZB + T + 0.36], cabM), bx([X0 + T + 0.08, 16.34, ZB + T + 0.36], [34.17, 17.26, ZB + T + 0.38], MAT.glassW));
  // pia na ilha
  fur.add(bx([32.42, IT - 0.24, -40.55], [33.58, IT - 0.22, -39.45], M('#c9d0d6', { roughness: 0.25, metalness: 0.6 })));
  [[32.42, 32.45, -40.55, -39.45], [33.55, 33.58, -40.55, -39.45]].forEach(([a, b, c, d]) => fur.add(bx([a, IT - 0.24, c], [b, IT + 0.002, d], M('#c9d0d6', { roughness: 0.25, metalness: 0.6 }))));
  fur.add(bx([32.42, IT - 0.24, -40.55], [33.58, IT + 0.002, -40.52], M('#c9d0d6', { roughness: 0.25, metalness: 0.6 })), bx([32.42, IT - 0.24, -39.48], [33.58, IT + 0.002, -39.45], M('#c9d0d6', { roughness: 0.25, metalness: 0.6 })));
  // estufa bacteriológica (com porta de vidro e placas nas prateleiras) e mesa do computador
  fur.add(bx([39.85, FL + 0.05, ZB + T + 0.05], [40.72, 15.75, ZB + T + 0.95], M('#e9ecee', { roughness: 0.4 })));
  fur.add(bx([39.82, 14.35, ZB + T + 0.12], [39.85, 15.55, ZB + T + 0.88], MAT.glassW));
  [14.6, 15.0, 15.35].forEach((y) => { fur.add(bx([39.9, y, ZB + T + 0.12], [40.65, y + 0.02, ZB + T + 0.88], MAT.galv)); for (let k = 0; k < 3; k++) fur.add(L.cyl(0.09, 0.09, 0.03, M('#f3e3a6', { roughness: 0.3 }), 40.1 + (k % 2) * 0.3, y + 0.04, ZB + T + 0.3 + k * 0.22, 14)); });
  fur.add(bx([39.86, 15.6, ZB + T + 0.3], [39.88, 15.7, ZB + T + 0.6], L.glow('#ff8c4a', 1.2)));
  fur.add(bx([39.6, 14.75, -42.2], [40.72, 14.8, -40.4], topM)); [[39.65, -42.15], [39.65, -40.5]].forEach(([x, z]) => fur.add(bx([x, FL + 0.05, z], [x + 0.05, 14.75, z + 0.05], MAT.galv)));
  const screenTex = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#0d2236'; g.fillRect(0, 0, w, h); g.fillStyle = '#3df0c2'; for (let i = 0; i < 5; i++) { g.fillRect(20, 20 + i * 26, 30 + ((i * 53) % 120), 12); } g.strokeStyle = '#8fdcff'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x < 80; x++) g.lineTo(150 + x, 120 - 30 * Math.abs(Math.sin(x * 0.12))); g.stroke(); });
  const mon = new THREE.Group(); mon.add(L.box(0.06, 0.4, 0.62, MAT.black, 0, 0.3, 0), L.box(0.04, 0.18, 0.06, MAT.black, 0.04, 0.05, 0), L.box(0.2, 0.02, 0.2, MAT.black, 0.04, -0.04, 0));
  const scr = L.mesh(new THREE.PlaneGeometry(0.56, 0.35), L.mat('#ffffff', { map: screenTex, emissive: '#ffffff', emissiveMap: screenTex, emissiveIntensity: 0.9 }), -0.035, 0.3, 0, { cast: false }); scr.rotation.y = -PI / 2; mon.add(scr);
  mon.position.set(40.4, 14.84, -41.3); mon.rotation.y = 0.35; fur.add(mon);
  fur.add(bx([39.75, 14.8, -41.6], [40.0, 14.82, -41.0], MAT.dark)); // teclado
  const furB = bake(fur); L.shadows(furB); root.add(furB);

  /* ---------- instrumentos e vidraria ---------- */
  const glassM = L.glass('#e6f6ff', 0.32), waterS = L.water('#cfe9f6', 0.55, { side: THREE.DoubleSide }), pinkM = G('#f05aa0', { roughness: 0.15, transparent: true, opacity: 0.85 });
  const inst = [];   // cada instrumento é um grupo que "aparece" em sequência
  const S_ = 1.35;   // exagero de escala para ler no celular
  const mk = (x, z, build) => { const tmp = new THREE.Group(); build(tmp); const g = bake(tmp); g.position.set(x, IT, z); g.scale.setScalar(S_); root.add(g); inst.push(g); return g; };
  const disp = (g, w, h, x, y, z, txt) => { const tx = canvasTex(128, 64, (c, W, H) => { c.fillStyle = '#10261c'; c.fillRect(0, 0, W, H); c.fillStyle = '#7dffb5'; c.fillRect(10, 22, 70, 6); c.fillRect(10, 36, 46, 6); c.font = 'bold 22px sans-serif'; c.fillText(txt, 84, 40); }); const m = L.mesh(new THREE.PlaneGeometry(w, h), L.mat('#ffffff', { map: tx, emissive: '#ffffff', emissiveMap: tx, emissiveIntensity: 0.8 }), x, y, z, { cast: false }); g.add(m); };
  // turbidímetro (bancada): corpo, poço da cubeta com tampa aberta, tela
  mk(34.45, -39.95, (g) => { g.add(L.rbox(0.3, 0.13, 0.24, 0.02, M('#e8edf0', { roughness: 0.4 }), 0, 0.065, 0), L.rbox(0.3, 0.04, 0.08, 0.01, MAT.blueDark, 0, 0.12, -0.08)); g.add(L.cyl(0.026, 0.026, 0.09, glassM, 0.07, 0.17, 0.03, 12), L.cyl(0.022, 0.022, 0.07, waterS, 0.07, 0.16, 0.03, 12), L.cyl(0.03, 0.03, 0.02, MAT.black, 0.07, 0.225, 0.03, 12)); g.add(L.cyl(0.04, 0.04, 0.012, MAT.dark, 0.07, 0.131, 0.03, 14)); disp(g, 0.13, 0.07, -0.06, 0.1, 0.121, 'NTU'); });
  // colorímetro de cloro (portátil) + cubeta
  mk(35.0, -39.85, (g) => { const b = L.rbox(0.1, 0.045, 0.2, 0.015, M('#2b3a4a', { roughness: 0.4 }), 0, 0.023, 0); g.add(b); disp(g, 0.07, 0.05, 0, 0.047, 0.04, 'Cl'); const tdisp = g.children[g.children.length - 1]; tdisp.rotation.x = -PI / 2; g.add(L.cyl(0.018, 0.018, 0.02, MAT.black, 0, 0.055, -0.06, 10)); g.add(L.cyl(0.016, 0.016, 0.07, glassM, 0.1, 0.035, -0.05, 10), L.cyl(0.014, 0.014, 0.05, pinkM, 0.1, 0.027, -0.05, 10)); });
  // suporte de tubos de ensaio: 4 incolores + 1 rosa (reagente DPD reagiu com o cloro)
  mk(35.5, -39.95, (g) => { g.add(L.box(0.3, 0.012, 0.08, MAT.white, 0, 0.09, 0), L.box(0.3, 0.012, 0.08, MAT.white, 0, 0.006, 0), L.box(0.012, 0.09, 0.08, MAT.white, -0.15, 0.045, 0), L.box(0.012, 0.09, 0.08, MAT.white, 0.15, 0.045, 0)); for (let i = 0; i < 5; i++) { const x = -0.11 + i * 0.055; g.add(L.cyl(0.016, 0.016, 0.16, glassM, x, 0.09, 0, 10)); g.add(L.cyl(0.014, 0.014, 0.09, i === 2 ? pinkM : waterS, x, 0.055, 0, 10)); } });
  // pHmetro de bancada com eletrodo no béquer
  mk(36.15, -39.95, (g) => { g.add(L.rbox(0.22, 0.08, 0.18, 0.02, M('#e9eef2', { roughness: 0.4 }), 0, 0.04, 0.02)); disp(g, 0.12, 0.05, 0, 0.06, 0.112, 'pH'); g.children[g.children.length - 1].rotation.x = -0.6; g.add(rod([0.14, 0, -0.03], [0.14, 0.32, -0.03], 0.008, MAT.steel, 6), rod([0.14, 0.28, -0.03], [0.26, 0.28, -0.03], 0.008, MAT.steel, 6), rod([0.26, 0.29, -0.03], [0.26, 0.07, -0.03], 0.009, M('#c9e6f2', { roughness: 0.2 }), 8)); g.add(L.cyl(0.05, 0.045, 0.1, glassM, 0.26, 0.05, -0.03, 16), L.cyl(0.044, 0.04, 0.07, waterS, 0.26, 0.036, -0.03, 16)); g.add(rod([0.0, 0.08, -0.06], [0.14, 0.3, -0.03], 0.004, MAT.dark, 4)); });
  // placas de cultura (Petri) com meio de cultura
  mk(36.75, -39.9, (g) => { for (let i = 0; i < 3; i++) { g.add(L.cyl(0.06, 0.06, 0.014, glassM, 0, 0.008 + i * 0.016, 0, 18), L.cyl(0.055, 0.055, 0.008, M('#e7c96a', { roughness: 0.3 }), 0, 0.005 + i * 0.016, 0, 18)); } g.add(L.cyl(0.06, 0.06, 0.014, glassM, 0.13, 0.008, 0.02, 18), L.cyl(0.055, 0.055, 0.008, M('#e7c96a', { roughness: 0.3 }), 0.13, 0.005, 0.02, 18)); });
  // frascos de coleta e cubetas na ilha
  mk(33.95, -39.9, (g) => { [[0, 0], [0.1, 0.05]].forEach(([x, z]) => { g.add(L.cyl(0.04, 0.04, 0.13, glassM, x, 0.065, z, 14), L.cyl(0.036, 0.036, 0.1, waterS, x, 0.05, z, 14), L.cyl(0.025, 0.025, 0.02, MAT.blue, x, 0.14, z, 12)); }); for (let i = 0; i < 4; i++) g.add(L.cyl(0.013, 0.013, 0.05, glassM, -0.06 + i * 0.03, 0.025, 0.12, 8)); });
  // frascos de reagentes (âmbar) e pisseta na bancada do fundo
  const back = new THREE.Group();
  for (let i = 0; i < 6; i++) { const x = 31.7 + i * 0.2; back.add(L.cyl(0.055, 0.055, 0.2, G('#8a4b16', { roughness: 0.2, transparent: true, opacity: 0.9 }), x, 15.02, ZB + T + 0.3, 14), L.cyl(0.03, 0.03, 0.05, MAT.black, x, 15.14, ZB + T + 0.3, 10)); }
  back.add(L.cyl(0.05, 0.06, 0.18, MAT.white, 33.1, 15.01, ZB + T + 0.35, 12), rod([33.1, 15.1, ZB + T + 0.35], [33.18, 15.2, ZB + T + 0.42], 0.006, MAT.white, 4));
  for (let i = 0; i < 8; i++) back.add(L.cyl(0.04, 0.04, 0.16, glassM, 31.7 + i * 0.28, 16.42, ZB + T + 0.18, 10)); // vidraria no armário
  back.add(L.rbox(0.45, 0.32, 0.4, 0.03, M('#e5e8ea', { roughness: 0.4 }), 34.0, 15.08, ZB + T + 0.36)); // autoclave de bancada
  const backB = bake(back); root.add(backB);
  // torneira de amostra (pescoço de ganso, cromada) e o tubo fino que vem do reservatório
  const tap = new THREE.Group(), chrome = L.metal('#e3e8ec', { roughness: 0.18 });
  pipe(tap, [[SA[0], IT, -40.45], [SA[0], 15.3, -40.45], [SA[0], 15.3, SA[2]], [SA[0], SA[1] + 0.02, SA[2]]], 0.022, chrome, { flanges: false, bend: 0.12, radial: 10 });
  tap.add(L.cyl(0.04, 0.045, 0.04, chrome, SA[0], IT + 0.02, -40.45, 12), L.cyl(0.026, 0.02, 0.04, chrome, SA[0], SA[1] + 0.01, SA[2], 10));
  tap.add(rod([SA[0], 15.05, -40.45], [SA[0] + 0.12, 15.12, -40.45], 0.012, MAT.blue, 6), L.cyl(0.03, 0.03, 0.05, chrome, SA[0], 15.05, -40.45, 10).rotateZ(PI / 2));
  pipe(tap, [[X0 + 0.4, FL + 0.12, -41.6], [32.6, FL + 0.12, -41.6], [SA[0], FL + 0.12, -40.95], [SA[0], FL + 0.12, -40.8], [SA[0], IT - 0.02, -40.8], [SA[0], IT + 0.01, -40.5]], 0.035, M('#e8f1fa', { roughness: 0.35 }), { flanges: false, bend: 0.12, radial: 8 });
  const tapB = bake(tap); L.shadows(tapB); root.add(tapB);
  // frasco de coleta sob a torneira, enchendo; filete d'água
  const bottle = new THREE.Group(); bottle.add(L.cyl(0.05, 0.05, 0.17, glassM, 0, 0.085, 0, 16), L.cyl(0.03, 0.035, 0.03, glassM, 0, 0.18, 0, 12)); bottle.position.set(SA[0], IT - 0.22, SA[2]); root.add(bottle);
  const bWater = L.cyl(0.045, 0.045, 1, waterS, 0, 0, 0, 16); bottle.add(bWater);
  const streamM = L.water('#d6f0fb', 0.75); const stream = L.cyl(0.009, 0.007, 1, streamM, SA[0], 0, SA[2], 8); stream.castShadow = false; root.add(stream);

  /* ---------- painel de resultados ---------- */
  const ITEMS = ['Turbidez', 'pH', 'Cloro residual', 'Flúor', 'Coliformes'];
  const PW = 3.0, PH = 1.9, px0 = 34.6, py0 = 15.35, pz = ZB + T + 0.06;
  const panTex = canvasTex(1024, 648, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0d2a40'); gr.addColorStop(1, '#0a1e2e'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffd23f'; g.fillRect(0, 0, w, 10);
    g.fillStyle = '#ffffff'; g.font = 'bold 64px Montserrat, sans-serif'; g.fillText('Qualidade da água', 48, 92);
    g.font = 'bold 56px Montserrat, sans-serif';
    ITEMS.forEach((s, i) => { const y = 170 + i * 98; g.strokeStyle = '#8fdcff'; g.lineWidth = 6; g.strokeRect(56, y - 4, 64, 64); g.fillStyle = '#e8f6ff'; g.fillText(s, 152, y + 50); });
  });
  const panelScr = L.mesh(new THREE.PlaneGeometry(PW, PH), L.mat('#ffffff', { map: panTex, emissive: '#ffffff', emissiveMap: panTex, emissiveIntensity: 0.75, roughness: 0.4 }), px0 + PW / 2, py0 + PH / 2, pz + 0.035, { cast: false });
  const panelFr = bx([px0 - 0.06, py0 - 0.06, pz - 0.03], [px0 + PW + 0.06, py0 + PH + 0.06, pz + 0.03], MAT.black);
  root.add(panelFr, panelScr);
  // marcas de verificação (3D, verdes) que aparecem uma a uma
  const ck = new THREE.Shape(); ck.moveTo(-0.5, 0.05); ck.lineTo(-0.2, -0.3); ck.lineTo(0.55, 0.5); ck.lineTo(0.4, 0.62); ck.lineTo(-0.2, 0.0); ck.lineTo(-0.38, 0.18); ck.closePath();
  const ckGeo = new THREE.ExtrudeGeometry(ck, { depth: 0.2, bevelEnabled: false });
  const ckM = L.glow('#3df07a', 1.6, { toneMapped: false });
  const checks = new THREE.InstancedMesh(ckGeo, ckM, ITEMS.length); checks.frustumCulled = false; checks.castShadow = false; root.add(checks);
  const ckPos = ITEMS.map((_, i) => [px0 + ((56 + 32) / 1024) * PW, py0 + PH - ((170 + i * 98 + 28) / 648) * PH, pz + 0.05]), _o = new THREE.Object3D();

  /* ---------- planta ---------- */
  const gh = ghost.of(bake((() => { const g = new THREE.Group(); g.add(bS.clone(), bW.clone(), bR.clone(), furB.clone()); return g; })())); root.add(gh);

  return {
    root,
    update(t, S) {
      const b = S.build.lab, st = S.st;
      gh.visible = b < 0.015;
      const kS = L.ease.out(sub(b, 0, 0.15)), kW = L.ease.io(sub(b, 0.1, 0.4)), kR = L.ease.out(sub(b, 0.36, 0.55)), kF = L.ease.out(sub(b, 0.45, 0.68));
      pS.visible = kS > 0.001; pS.scale.y = Math.max(0.001, kS);
      pW.visible = kW > 0.001; pW.scale.y = Math.max(0.001, kW);
      pR.visible = kR > 0.001; pR.position.y = (1 - kR) * 2.5;
      furB.visible = backB.visible = kF > 0.001; furB.position.y = backB.position.y = (1 - kF) * 1.2;
      tapB.visible = b > 0.62;
      inst.forEach((g, i) => { const k = L.ease.back(sub(b, 0.62 + i * 0.05, 0.72 + i * 0.05)); g.visible = k > 0.001; g.scale.setScalar(S_ * Math.max(0.001, k)); });
      const kp = sub(b, 0.85, 1); panelFr.visible = panelScr.visible = kp > 0.001; panelScr.material.emissiveIntensity = 0.75 * kp; panelScr.material.color.setScalar(0.3 + 0.7 * kp);
      // coleta de amostra: o frasco enche na torneira (70,6–74,4 em foco)
      const full = L.sstep(71.3, 72.6, st), flowing = st > 71.15 && st < 72.75 && b > 0.99;
      bottle.visible = b > 0.75; const hw = 0.02 + 0.13 * full; bWater.scale.y = hw; bWater.position.y = 0.01 + hw / 2;
      stream.visible = flowing; const ytop = SA[1] - 0.01, ybot = IT - 0.22 + 0.01 + hw; stream.scale.y = Math.max(0.01, ytop - ybot); stream.position.y = (ytop + ybot) / 2;
      ckPos.forEach((p, i) => { const k = b > 0.999 ? L.ease.back(L.sstep(72.0 + 0.42 * i, 72.3 + 0.42 * i, st)) : 0; _o.position.set(...p); _o.scale.setScalar(k > 0.001 ? 0.17 * k : 0.00001); _o.updateMatrix(); checks.setMatrixAt(i, _o.matrix); });
      checks.instanceMatrix.needsUpdate = true;
    }
  };
}
