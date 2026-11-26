// Casa de química (prédio em corte pela frente, telhado só na metade de trás): tanques de coagulante (PAC),
// hipoclorito (cloro), cal (com agitador) e ácido fluossilícico (flúor) dentro de um dique de contenção; bombas
// dosadoras de diafragma (motor + redutor + cabeçote com válvulas) com painéis locais; quadro de comando.
// TODAS as linhas de dosagem saem pelas paredes, correm em suportes e terminam com bico/difusor nos 4 pontos
// Lo.ETA.dosing (coagulante na garganta da Parshall; cloro, cal e flúor no tanque de contato da fileira 2).
export function buildChem(env) {
  const { L, THREE, Lo, K, ghost, root } = env, { MAT, ph } = K, C = Lo.ETA.chem, DS = Lo.ETA.dosing;
  const out = new THREE.Group(); root.add(out);
  const PROD = [
    { id: 'coag', x: 32.75, r: 1.15, h: 3.0, tank: '#e6dfcc', line: '#a77bd6', name: ['COAGULANTE', 'PAC · sal de alumínio'] },
    { id: 'chlorine', x: 35.25, r: 0.95, h: 2.7, tank: '#e8df78', line: '#e7cf1d', name: ['CLORO', 'hipoclorito de sódio'] },
    { id: 'lime', x: 37.6, r: 1.0, h: 2.3, tank: '#dde2e5', line: '#f3f3ef', name: ['CAL', 'correção de pH'] },
    { id: 'fluoride', x: 39.7, r: 0.7, h: 2.0, tank: '#cfe6cf', line: '#3fae72', name: ['FLÚOR', 'ác. fluossilícico'] }
  ];
  const TZ = -77.85, PZ = -73.1, PY = 14.75, WT = 0.25, ROOFZ = -75.2;

  /* ---------------------------------------------------------------- prédio */
  const shellG = new THREE.Group(), roofG = new THREE.Group(), tanksG = new THREE.Group(), pumpsG = new THREE.Group();
  {
    const g = new THREE.Group(), W = MAT.wall, H = C.roof - C.floor;
    g.add(L.box(C.x1 - C.x0, 0.25, C.z1 - C.z0, MAT.slab, (C.x0 + C.x1) / 2, 14.02, (C.z0 + C.z1) / 2));
    g.add(L.box(C.x1 - C.x0 - 0.1, 0.02, C.z1 - C.z0 - 0.1, MAT.floorTile, (C.x0 + C.x1) / 2, 14.155, (C.z0 + C.z1) / 2));
    g.add(L.box(C.x1 - C.x0, H, WT, W, (C.x0 + C.x1) / 2, 14 + H / 2, C.z0 + WT / 2));
    [C.x0 + WT / 2, C.x1 - WT / 2].forEach((x) => g.add(L.box(WT, H, C.z1 - C.z0 - WT, W, x, 14 + H / 2, (C.z0 + WT + C.z1) / 2)));
    g.add(K.capZ(C.x0, C.x0 + WT, 14, C.roof, C.z1 + 0.004, MAT.wallCut), K.capZ(C.x1 - WT, C.x1, 14, C.roof, C.z1 + 0.004, MAT.wallCut), K.capZ(C.x0, C.x1, 13.9, 14.15, C.z1 + 0.004));
    // rodapé, porta (leste), janelas altas, exaustor
    g.add(L.box(0.06, 2.3, 1.3, MAT.panelDark, C.x1 + 0.01, 15.3, -73.0), L.box(0.08, 0.06, 0.2, MAT.steel, C.x1 + 0.05, 15.2, -72.5));
    [-78.6, -76.2].forEach((z) => g.add(L.box(0.06, 0.7, 1.4, MAT.glassDark, C.x0 - 0.01, 17.9, z)));
    g.add(L.cyl(0.3, 0.3, 0.12, MAT.gray, C.x1 + 0.03, 18.2, -78.8, 16).rotateZ(Math.PI / 2));
    // dique de contenção (piso em epóxi amarelo + mureta)
    g.add(L.box(C.x1 - C.x0 - 2 * WT, 0.02, -75.9 - (C.z0 + WT), MAT.bund, (C.x0 + C.x1) / 2, 14.175, (C.z0 + WT - 75.9) / 2));
    g.add(L.box(C.x1 - C.x0 - 2 * WT, 0.55, 0.18, MAT.concNew, (C.x0 + C.x1) / 2, 14.43, -75.9));
    // base das bombas
    g.add(L.box(9.0, 0.3, 1.5, MAT.concNew, 36.2, 14.3, PZ));
    // quadro de comando (CCM) na parede leste
    g.add(L.box(0.55, 2.0, 2.2, MAT.panel, C.x1 - WT - 0.3, 15.15, -71.9));
    for (let i = 0; i < 3; i++) { g.add(L.box(0.02, 1.8, 0.02, MAT.gray, C.x1 - WT - 0.58, 15.15, -72.65 + i * 0.73)); g.add(L.box(0.02, 0.06, 0.06, i === 1 ? MAT.ledY : MAT.ledG, C.x1 - WT - 0.585, 15.9, -72.3 + i * 0.73)); }
    shellG.add(K.bake(g));
    const rg = new THREE.Group();
    rg.add(L.box(C.x1 - C.x0, 0.25, ROOFZ - C.z0, MAT.roof, (C.x0 + C.x1) / 2, C.roof - 0.125, (C.z0 + ROOFZ) / 2));
    rg.add(L.box(C.x1 - C.x0, 0.35, 0.15, MAT.roof, (C.x0 + C.x1) / 2, C.roof + 0.17, C.z0 + 0.075));
    rg.add(K.capZ(C.x0, C.x1, C.roof - 0.25, C.roof, ROOFZ + 0.004, MAT.wallCut));
    for (let x = C.x0 + 1.5; x < C.x1; x += 3) rg.add(L.box(0.25, 0.45, C.z1 - C.z0 - 0.3, MAT.concNew, x, C.roof - 0.45, (C.z0 + C.z1) / 2)); // vigas (continuam até o corte)
    for (let x = C.x0 + 2.5; x < C.x1 - 1; x += 3) { const lm = L.box(1.2, 0.06, 0.25, MAT.lampOn, x, C.roof - 0.72, -73.4); lm.castShadow = false; rg.add(lm); rg.add(L.box(1.3, 0.08, 0.3, MAT.gray, x, C.roof - 0.66, -73.4)); }
    roofG.add(K.bake(rg));
    out.add(shellG, roofG);
  }
  /* ---------------------------------------------------------------- tanques */
  const tankIn = [];
  PROD.forEach((p, i) => {
    const g = new THREE.Group(), y0 = 14.35, y1 = y0 + p.h, tm = K.G(p.tank, { roughness: 0.42 });
    g.add(L.cyl(p.r + 0.12, p.r + 0.12, 0.2, MAT.concNew, p.x, 14.25, TZ, 28));
    g.add(L.cyl(p.r, p.r, p.h, tm, p.x, (y0 + y1) / 2, TZ, 36));
    const dome = L.mesh(new THREE.SphereGeometry(p.r, 32, 10, 0, L.TAU, 0, Math.PI / 2), tm, p.x, y1, TZ); dome.scale.y = 0.24; g.add(dome);
    [0.25, 0.5, 0.75].forEach((k) => g.add(L.cyl(p.r + 0.02, p.r + 0.02, 0.05, K.M(p.tank, { roughness: 0.6 }), p.x, y0 + p.h * k, TZ, 36)));  // anéis de reforço
    g.add(L.cyl(0.22, 0.22, 0.14, MAT.gray, p.x - p.r * 0.35, y1 + p.r * 0.2, TZ, 16));                   // boca de visita
    g.add(K.pipe([[p.x + p.r * 0.4, y1 + 0.1, TZ], [p.x + p.r * 0.4, y1 + 0.55, TZ], [p.x + p.r * 0.55, y1 + 0.62, TZ]], 0.04, MAT.gray));   // respiro
    // indicador de nível (tubo transparente com faixa) na frente
    g.add(L.cyl(0.04, 0.04, p.h - 0.3, MAT.glassDark, p.x + p.r * 0.55, (y0 + y1) / 2, TZ + p.r * 0.84, 8));
    const lev = L.box(0.1, (p.h - 0.4) * 0.72, 0.03, K.M(p.line, { emissive: p.line, emissiveIntensity: 0.4 }), p.x + p.r * 0.55, y0 + 0.2 + (p.h - 0.4) * 0.36, TZ + p.r * 0.88); lev.castShadow = false; g.add(lev);
    // saída no fundo com registro
    g.add(K.pipe([[p.x, y0 + 0.3, TZ + p.r - 0.05], [p.x, y0 + 0.3, TZ + p.r + 0.35]], 0.05, MAT.gray));
    // escada no tanque maior
    if (i === 0) K.ladder(g, p.x - p.r, TZ - 0.4, 14.35, y1 + 0.2, [-1, 0]);
    // agitador do tanque de cal
    if (p.id === 'lime') { g.add(L.box(2.2, 0.12, 0.25, MAT.galv, p.x, y1 + 0.28, TZ)); const mo = K.motor(0.36, 0.12, MAT.motor); mo.rotation.z = Math.PI / 2; mo.position.set(p.x, y1 + 0.75, TZ); g.add(mo, K.gearbox(0.3, 0.25, 0.3, MAT.blue).translateX(p.x).translateY(y1 + 0.47).translateZ(TZ)); }
    const sg = K.sign(p.name, Math.min(1.7, p.r * 1.6), 0.5, { stripe: p.line, size: 0.55 });
    sg.position.set(p.x, y0 + p.h * 0.52, TZ + p.r + 0.04); g.add(sg);
    const bk = K.bake(g); tanksG.add(bk); tankIn.push(bk);
  });
  out.add(tanksG);
  /* ---------------------------------------------------------------- bombas dosadoras (diafragma) e painéis */
  const heads = [], leds = [];
  {
    const g = new THREE.Group();
    PROD.forEach((p) => {
      const x = p.x, hx = x + 0.3;
      g.add(L.box(1.0, 0.06, 0.5, MAT.gray, x, 14.48, PZ));
      const mo = K.motor(0.36, 0.12, MAT.motor); mo.position.set(x - 0.32, PY, PZ); g.add(mo);
      const gb = K.gearbox(0.26, 0.3, 0.3, MAT.blue); gb.position.set(x + 0.02, PY, PZ); g.add(gb);
      g.add(L.cyl(0.2, 0.2, 0.08, MAT.gray, hx - 0.1, PY, PZ, 20).rotateZ(Math.PI / 2));
      K.flange(g, hx + 0.03, PY, PZ, 0.13, 'x', MAT.white, 8);
      g.add(L.cyl(0.05, 0.05, 0.16, MAT.white, hx, PY - 0.2, PZ, 10), L.cyl(0.05, 0.05, 0.16, MAT.white, hx, PY + 0.2, PZ, 10)); // válvulas de retenção (sucção/descarga)
      g.add(L.sph(0.1, MAT.gray, hx, PY + 0.48, PZ + 0.2));                                             // amortecedor de pulsação
      g.add(K.pipe([[hx, PY + 0.28, PZ], [hx, PY + 0.48, PZ], [hx, PY + 0.48, PZ + 0.12]], 0.03, MAT.white));
      // sucção: do registro do tanque, por cima da mureta, até a válvula de baixo
      g.add(K.pipe([[x, 14.65, TZ + p.r + 0.35], [x, 14.95, -76.3], [x, 14.95, -75.4], [hx, 14.95, -74.2], [hx, PY - 0.3, -73.6], [hx, PY - 0.3, PZ]], 0.045, MAT.white, { bend: 0.15 }));
      // painel local com sinaleiro
      g.add(L.box(0.05, 1.1, 0.05, MAT.galv, x + 0.45, 14.95, -71.95), L.box(0.36, 0.45, 0.16, MAT.panel, x + 0.45, 15.55, -71.95));
      const sg = K.sign([p.name[0]], 0.34, 0.1, { stripe: p.line, size: 0.8 }); sg.position.set(x + 0.45, 15.83, -71.86); g.add(sg);
      const hd = L.cyl(0.13, 0.13, 0.06, K.M(p.line, { roughness: 0.4 }), hx + 0.13, PY, PZ, 18); hd.rotation.z = Math.PI / 2; heads.push(hd); out.add(hd);
      const led = L.sph(0.035, MAT.dark, x + 0.45, 15.62, -71.86); led.castShadow = false; leds.push(led); out.add(led);
    });
    pumpsG.add(K.bake(g)); out.add(pumpsG);
  }
  const ghostHouse = ghost.of(out); root.add(ghostHouse);

  /* ---------------------------------------------------------------- linhas de dosagem */
  const pumpOut = (p) => [p.x + 0.3, PY + 0.48, PZ + 0.12];
  const xo = { chlorine: [31.55, -72.8, 17.5, -70.9, 30.15, -62.6], lime: [31.75, -72.6, 17.75, -70.65, 30.3, -62.3], fluoride: [31.95, -72.4, 18.0, -70.4, 30.45, -62.0] };
  const PATHS = {};
  { const p = PROD[0], o = pumpOut(p), [cx, cy, cz] = DS.coag;
    PATHS.coag = [o, [o[0], 18.3, o[2]], [o[0], 18.3, -73.1], [31.6, 18.3, -73.1], [31.6, 18.3, -79.3], [cx, 18.3, -79.3], [cx, 18.3, -75.6], [cx, 20.65, -75.6], [cx, 20.65, cz], [cx, cy + 0.06, cz]]; }
  ['chlorine', 'lime', 'fluoride'].forEach((id) => {
    const p = PROD.find((q) => q.id === id), o = pumpOut(p), [xt, zh, yh, zx, xd, zr] = xo[id], [dx, dy, dz] = DS[id], yt = id === 'fluoride' ? 17.5 : 17.35, ty = 14.75;
    PATHS[id] = [o, [o[0], yh, o[2]], [o[0], yh, zh], [xt, yh, zh], [xt, yh, zx], [xd, yh, zx], [xd, ty, zx], [xd, ty, zr], [dx, ty, zr], [dx, ty, -58.3], [dx, yt, -58.3], [dx, yt, dz], [dx, dy + 0.06, dz]];
  });
  const LINES = {};
  const lineR = 0.065;
  Object.entries(PATHS).forEach(([id, pts]) => {
    const p = PROD.find((q) => q.id === id), pm = K.G(p.line, { roughness: 0.35 });
    const g = new THREE.Group(), tube = K.pipe(pts, lineR, pm, { bend: 0.22, step: 0.2, maxSeg: 900, radial: 8 }); tube.castShadow = false; g.add(tube);
    // suportes: postes com braço nos trechos altos, berços nos trechos baixos
    const sg = new THREE.Group();
    for (let i = 0; i < pts.length - 1; i++) {
      const a = L.v3(pts[i]), b = L.v3(pts[i + 1]), len = a.distanceTo(b); if (Math.abs(a.y - b.y) > 0.3 || len < 1.2) continue;
      const inside = a.x > C.x0 && a.x < C.x1 && b.x > C.x0 - 0.1 && a.z < C.z1 && a.z > C.z0;
      if (inside) continue;
      const n = Math.max(1, Math.floor(len / 3.2));
      for (let k = 1; k <= n; k++) {
        const q = a.clone().lerp(b, (k - 0.5) / n);
        if (q.y > 15.5) { sg.add(L.box(0.12, q.y - 14 - 0.08, 0.12, MAT.galv, q.x, (14 + q.y - 0.08) / 2, q.z)); sg.add(L.box(0.5, 0.06, 0.5, MAT.galv, q.x, 14.03, q.z)); sg.add(L.box(Math.abs(a.x - b.x) > 0.1 ? 0.1 : 0.45, 0.06, Math.abs(a.x - b.x) > 0.1 ? 0.45 : 0.1, MAT.galv, q.x, q.y - lineR - 0.03, q.z)); }
        else { sg.add(L.box(Math.abs(a.x - b.x) > 0.1 ? 0.3 : 0.5, q.y - 14 - lineR, Math.abs(a.x - b.x) > 0.1 ? 0.5 : 0.3, MAT.concNew, q.x, (14 + q.y - lineR) / 2, q.z)); }
        // abraçadeira
        const cl = L.torus(lineR + 0.012, 0.012, MAT.steel, q.x, q.y, q.z); if (Math.abs(a.x - b.x) > 0.1) cl.rotation.y = Math.PI / 2; cl.castShadow = false; sg.add(cl);
      }
    }
    // braço sobre o tanque de contato (cloro, cal, flúor): poste atrás + viga em balanço com tirante
    const last = pts[pts.length - 1];
    if (id !== 'coag') { const ya = pts[pts.length - 2][1]; sg.add(L.box(0.14, ya + 0.9 - 14, 0.14, MAT.galv, last[0] + 0.25, (14 + ya + 0.9) / 2, -58.6)); sg.add(K.beam([last[0] + 0.25, ya - lineR - 0.05, -58.6], [last[0] + 0.25, ya - lineR - 0.05, last[2] + 0.3], 0.08, 0.1, MAT.galv)); sg.add(K.rod([last[0] + 0.25, ya + 0.85, -58.6], [last[0] + 0.25, ya - 0.1, last[2] + 0.2], 0.015, MAT.steel, 5)); sg.add(K.beam([last[0], ya - lineR - 0.05, last[2] + 0.12], [last[0] + 0.3, ya - lineR - 0.05, last[2] + 0.12], 0.06, 0.06, MAT.galv)); }
    // bico/difusor no ponto de aplicação
    const ng = new THREE.Group();
    if (id === 'coag') {
      const [cx, cy, cz] = DS.coag, hw = Lo.ETA.parshall.w / 2 - 0.05;
      ng.add(K.rod([cx, cy, cz - hw], [cx, cy, cz + hw], 0.05, pm, 10));
      for (let k = 0; k < 6; k++) ng.add(L.cyl(0.012, 0.03, 0.08, MAT.steel, cx, cy - 0.07, cz - 0.6 + k * 0.24, 6));
      ng.add(L.cyl(0.07, 0.07, 0.06, pm, cx, cy, cz - hw, 10).rotateX(Math.PI / 2), L.cyl(0.07, 0.07, 0.06, pm, cx, cy, cz + hw, 10).rotateX(Math.PI / 2));
    } else {
      ng.add(L.lathe([[lineR, last[1] + 0.06], [lineR * 1.2, last[1] + 0.02], [0.03, last[1] - 0.06], [0.012, last[1] - 0.09]], MAT.steel, 12).translateX(last[0]).translateZ(last[2]));
    }
    // etiquetas (faixa colorida + nome) a cada ~7 m nos trechos externos
    const tagG = new THREE.Group(), path = tube.userData.path, Ln = tube.userData.len;
    for (let s = 6; s < Ln - 3; s += 7.5) {
      const q = path.getPointAt(s / Ln), tg = path.getTangentAt(s / Ln); if (q.x > C.x0 - 0.2 && q.z < C.z1) continue;
      const ring = L.cyl(lineR + 0.02, lineR + 0.02, 0.22, MAT.white, q.x, q.y, q.z, 10); ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg); ring.castShadow = false; tagG.add(ring);
      const s1 = K.sign([p.name[0]], 0.5, 0.14, { stripe: p.line, size: 0.8 }); s1.position.set(q.x, q.y + 0.22, q.z); if (Math.abs(tg.z) > 0.7) s1.rotation.y = -Math.PI / 2 * Math.sign(tg.z) * 0 + Math.PI / 2; tagG.add(s1);
    }
    const sb = K.bake(sg); g.add(sb, ng, tagG);
    const gl = K.ghostLine(pts, ghost.line); root.add(gl);
    // pulsos de produto correndo na linha
    const fl = new L.Flow(path, { n: Math.max(6, Math.round(Ln / 1.4)), size: 0.085, material: L.mat('#ffffff', { emissive: p.line, emissiveIntensity: 1.4, roughness: 0.4 }), color: p.line, seed: 5 + id.length, sizeVar: 0.1 });
    g.add(fl.mesh);
    // gotas no bico (cloro, cal, flúor)
    let drips = null;
    if (id !== 'coag') { drips = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.mat(p.line, { emissive: p.line, emissiveIntensity: 0.6 }), 4); drips.frustumCulled = false; g.add(drips); }
    out.add(g);
    LINES[id] = { g, tube, sb, ng, tagG, gl, fl, drips, last, Ln };
  });
  // placa na parede por onde saem as linhas
  const wallSign = K.sign(['LINHAS DE DOSAGEM', 'coagulante · cloro · cal · flúor'], 2.4, 0.6, { stripe: '#ffd23f' });
  wallSign.position.set(C.x0 - 0.02, 16.4, -71.9); wallSign.rotation.y = -Math.PI / 2; out.add(wallSign);
  const _d = new THREE.Object3D();

  function update(t, S, cam, P) {
    const b = S.build.chem;
    ghostHouse.visible = b < 0.04 && S.ghost > 0.01;
    const ks = ph(b, 0, 0.3), kr = ph(b, 0.22, 0.45), kt = ph(b, 0.3, 0.6), kp = ph(b, 0.5, 0.75), kl = ph(b, 0.7, 1);
    shellG.visible = ks > 0; shellG.scale.y = Math.max(0.001, L.ease.out(ks)); shellG.position.y = 14 * (1 - shellG.scale.y);
    roofG.visible = kr > 0; roofG.position.y = (1 - L.ease.out(kr)) * 3;
    wallSign.visible = ks >= 1;
    tankIn.forEach((m, i) => { const k = ph(kt, i * 0.18, i * 0.18 + 0.46); m.visible = k > 0; m.position.y = (1 - L.ease.out(k)) * 7; });
    pumpsG.visible = kp > 0; pumpsG.position.y = (1 - L.ease.out(kp)) * 1.5;
    const runs = { coag: S.run.coag, chlorine: S.run.chlorine, lime: S.run.finalDose, fluoride: S.run.finalDose };
    const builds = { coag: kl, chlorine: ph(S.build.contact, 0.05, 0.85), lime: ph(S.build.finalDose, 0, 0.8), fluoride: ph(S.build.finalDose, 0.1, 0.9) };
    PROD.forEach((p, i) => {
      const run = runs[p.id] * (builds[p.id] >= 1 ? 1 : 0) * (kp >= 1 ? 1 : 0);
      heads[i].visible = kp > 0; heads[i].position.y = PY + (1 - L.ease.out(kp)) * 1.5;
      heads[i].scale.y = 1 + run * 0.5 * Math.max(0, Math.sin(t * 9 + i * 1.7));
      leds[i].visible = kp > 0; leds[i].position.y = 15.62 + (1 - L.ease.out(kp)) * 1.5;
      leds[i].material = run > 0.5 ? MAT.ledG : (builds[p.id] >= 1 && kp >= 1 ? MAT.ledR : MAT.dark);
      const ln = LINES[p.id], bk = builds[p.id];
      ln.tube.userData.grow(bk); ln.sb.visible = bk > 0.05; ln.tagG.visible = bk >= 1; ln.ng.visible = bk >= 0.98;
      ln.gl.visible = bk < 0.04 && S.ghost > 0.01;
      ln.fl.mesh.visible = run > 0.02; ln.fl.update(t, { speed: 0.9 / ln.Ln * 1.6, amount: run });
      if (ln.drips) {
        ln.drips.visible = run > 0.02;
        if (run > 0.02) { const [x, y, z] = ln.last; for (let k = 0; k < 4; k++) { const u = L.fract(t * 1.8 + k / 4); _d.position.set(x, y - 0.1 - u * 0.32, z); _d.scale.set(0.025, 0.04, 0.025).multiplyScalar(run); _d.updateMatrix(); ln.drips.setMatrixAt(k, _d.matrix); } ln.drips.instanceMatrix.needsUpdate = true; }
      }
    });
  }
  return { update, PATHS };
}
