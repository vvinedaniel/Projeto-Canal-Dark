// Floculadores: 3 câmaras em série (fluxo −x) com cortinas alternadas (passagem por BAIXO entre 1→2, por CIMA
// entre 2→3), agitadores de eixo vertical com paletas (madeira) acionados por motor + redutor numa ponte sobre cada
// câmara; velocidade DECRESCENTE 1 > 2 > 3. Flocos crescem de câmara em câmara (sem números).
// Corte pela frente: a parede da frente abaixo da água foi removida (fica a faixa acima do nível).
export function buildFloc(env) {
  const { L, THREE, Lo, K, ghost, root } = env, { MAT, ph } = K, F = Lo.ETA.floc, th = F.wall, Zc = -74;
  const out = new THREE.Group(); root.add(out);
  const CH = [{ x0: 9.125, x1: F.x1 - th }, { x0: 3.125, x1: 8.875 }, { x0: F.x0 + th, x1: 2.875 }];
  CH.forEach((c) => { c.cx = (c.x0 + c.x1) / 2; });
  const W = [0.95, 0.58, 0.3];   // rad/s nominal das paletas (decrescente)
  const ZB = F.z0 + th, ZFR = F.z1, Y0 = F.floor, WAL = F.top, WY = 20.33, notch = { z0: -75, z1: -73, y: 18.25 };

  /* ---------------------------------------------------------------- estrutura (paredes) */
  const wallsG = new THREE.Group(), curtG = new THREE.Group(), bridgeG = new THREE.Group(), driveG = new THREE.Group();
  {
    const g = new THREE.Group(), C = MAT.conc, Lx = F.x1 - F.x0, mx = (F.x0 + F.x1) / 2;
    g.add(L.box(Lx, 0.3, F.z1 - F.z0, MAT.slab, mx, 14.15, (F.z0 + F.z1) / 2));
    g.add(L.box(Lx, WAL - 14, th, C, mx, (14 + WAL) / 2, F.z0 + th / 2));
    // parede leste (entrada) com rasgo no topo para o canal da Parshall; parede oeste (saída) idem
    [[F.x1 - th / 2], [F.x0 + th / 2]].forEach(([x]) => {
      g.add(L.box(th, notch.y - 14, F.z1 - ZB, C, x, (14 + notch.y) / 2, (ZB + F.z1) / 2));
      [[ZB, notch.z0], [notch.z1, F.z1]].forEach(([a, b]) => g.add(L.box(th, WAL - notch.y, b - a, C, x, (notch.y + WAL) / 2, (a + b) / 2)));
    });
    g.add(L.box(Lx - 2 * th, WAL - F.water, th, C, mx, (F.water + WAL) / 2, F.z1 - th / 2));      // faixa da frente
    g.add(K.capZ(F.x0, F.x1, 14.0, 14.3, F.z1 + 0.004), K.capZ(F.x0, F.x0 + th, 14, WAL, F.z1 + 0.004), K.capZ(F.x1 - th, F.x1, 14, WAL, F.z1 + 0.004));
    // canal de transferência para o decantador (x −4.5 … −3), sobre pilar
    const tx0 = Lo.ETA.dec.x1, tx1 = F.x0;
    g.add(L.box(tx1 - tx0, 0.3, 2.2, C, (tx0 + tx1) / 2, 18.15, Zc - 0.1));
    g.add(L.box(tx1 - tx0, 19.7 - 18.0, 0.2, C, (tx0 + tx1) / 2, (18 + 19.7) / 2, notch.z0 - 0.1));
    g.add(K.capZ(tx0, tx1, 18.0, 18.3, notch.z1 + 0.004));
    g.add(L.box(0.6, 4.0, 0.6, MAT.concB, (tx0 + tx1) / 2, 16.0, Zc - 0.3));
    // passarela de trás (contínua sobre floculador) com mãos-francesas, guarda-corpo, luminárias
    K.walkway(g, F.x0, F.x1, -80.25, F.z0, WY);
    for (let x = F.x0 + 0.5; x < F.x1; x += 3) { g.add(K.beam([x, 19.2, F.z0], [x, WY - 0.06, -80.2], 0.08, 0.08, MAT.galv)); g.add(K.beam([x, WY - 0.08, F.z0], [x, WY - 0.08, -80.25], 0.1, 0.1, MAT.galv)); }
    K.railing(g, [[F.x0, WY, -80.25], [F.x1, WY, -80.25]]);
    for (let x = F.x0 + 2; x < F.x1; x += 6) K.lamp(g, x, WY, -80.2, 2.2, [0, 0.5]);
    // escada da passarela (sobe de leste para oeste, atrás da fileira)
    K.stair(g, [F.x1 + 7.3, 14.0, -79.65], WY, [-1, 0], 0.9);
    K.railing(g, [[F.x1, WY, -79.2], [F.x1, WY, -78.95]], { toe: false });
    wallsG.add(K.bake(g)); out.add(wallsG);
    // cortinas: x = 9 (passagem por baixo) e x = 3 (passagem por cima)
    const cg = new THREE.Group();
    cg.add(L.box(0.25, WAL - 15.3, F.z1 - ZB, C, 9.0, (15.3 + WAL) / 2, (ZB + F.z1) / 2));
    cg.add(L.box(0.25, 18.6 - Y0, F.z1 - ZB - 0.3, C, 3.0, (Y0 + 18.6) / 2, (ZB + F.z1 - 0.3) / 2));
    cg.add(K.capZ(8.875, 9.125, 15.3, WAL, F.z1 + 0.004), K.capZ(2.875, 3.125, Y0, 18.6, F.z1 - 0.3 + 0.004));
    // mísulas (chanfros) na base das cortinas
    curtG.add(K.bake(cg)); out.add(curtG);
    // pontes sobre as câmaras (vigas I, grade, guarda-corpo)
    const bg = new THREE.Group();
    CH.forEach((c) => {
      [-0.6, 0.6].forEach((dx) => { bg.add(L.box(0.12, 0.3, F.z1 - F.z0 + 0.2, MAT.galv, c.cx + dx, WAL + 0.15, (F.z0 + F.z1) / 2)); bg.add(L.box(0.22, 0.03, F.z1 - F.z0 + 0.2, MAT.galv, c.cx + dx, WAL + 0.015, (F.z0 + F.z1) / 2)); });
      K.walkway(bg, c.cx - 0.66, c.cx + 0.66, F.z0, F.z1, WY, { edges: false });
      [-0.66, 0.66].forEach((dx) => K.railing(bg, [[c.cx + dx, WY, F.z0 + 0.1], [c.cx + dx, WY, F.z1 - 0.05]]));
      bg.add(L.box(1.0, 0.12, 1.0, MAT.galv, c.cx, WY + 0.06, Zc));   // base do acionamento
    });
    bridgeG.add(K.bake(bg)); out.add(bridgeG);
    // acionamentos: redutor + motor vertical (flange) + mancal
    const dg = new THREE.Group();
    CH.forEach((c) => {
      const gb = K.gearbox(0.7, 0.55, 0.62, MAT.blue); gb.position.set(c.cx, WY + 0.42, Zc); dg.add(gb);
      const mo = K.motor(0.62, 0.2, MAT.motor); mo.rotation.z = Math.PI / 2; mo.position.set(c.cx + 0.05, WY + 1.08, Zc); dg.add(mo);
      dg.add(L.cyl(0.22, 0.22, 0.1, MAT.gray, c.cx, WY + 0.74, Zc, 20));
      const plate = L.box(0.24, 0.16, 0.01, MAT.white, c.cx, WY + 0.42, Zc + 0.32); plate.castShadow = false; dg.add(plate);
    });
    driveG.add(K.bake(dg)); out.add(driveG);
  }
  /* ---------------------------------------------------------------- agitadores (giram) */
  const pivots = [], shaftsG = new THREE.Group(); out.add(shaftsG);
  {
    const make = () => {
      const g = new THREE.Group(), y0 = Y0 + 0.55, y1 = WY + 0.15, a0 = 15.45, a1 = 18.55;
      g.add(L.cyl(0.075, 0.075, y1 - y0, MAT.steel, 0, (y0 + y1) / 2, 0, 12));
      g.add(L.cyl(0.16, 0.16, 0.25, MAT.iron, 0, a0, 0, 12), L.cyl(0.16, 0.16, 0.25, MAT.iron, 0, a1, 0, 12), L.cyl(0.13, 0.13, 0.16, MAT.iron, 0, 19.9, 0, 12)); // cubos e luva
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2, cx = Math.cos(a), cz = Math.sin(a);
        [a0, a1].forEach((y) => g.add(K.beam([0, y, 0], [cx * 2.5, y, cz * 2.5], 0.1, 0.06, MAT.galv)));
        [1.25, 2.35].forEach((r) => {
          const bd = L.box(0.07, a1 - a0 + 0.2, 0.42, MAT.wood, cx * r, (a0 + a1) / 2, cz * r); bd.rotation.y = -a; g.add(bd);
        });
        g.add(K.beam([cx * 0.2, a0, cz * 0.2], [cx * 2.4, a1, cz * 2.4], 0.05, 0.05, MAT.galv));   // diagonal
      }
      return K.bake(g);
    };
    CH.forEach((c) => {
      const pv = new THREE.Group(); pv.position.set(c.cx, 0, Zc); pv.add(make()); shaftsG.add(pv); pivots.push(pv);
      // mancal de fundo (fixo)
      const bb = L.cyl(0.22, 0.3, 0.3, MAT.iron, c.cx, Y0 + 0.15, Zc, 14); out.add(bb); pv.userData.foot = bb;
    });
  }
  const ghostG = ghost.of(out); root.add(ghostG);

  /* ---------------------------------------------------------------- água (3 câmaras) e flocos */
  const C1 = new THREE.Color(Lo.WATER.coag), C2 = new THREE.Color(Lo.WATER.floc);
  const waters = CH.map((c, i) => {
    const base = C1.clone().lerp(C2, [0.15, 0.55, 0.95][i]);
    const m = K.waterBox(c.x0, c.x1, ZB, ZFR - 0.012, Y0, F.water - Y0, '#fff', 0.5, { nx: 8, ny: 6, col: (x, v) => base.clone().multiplyScalar(0.82 + 0.18 * v) });
    out.add(m); return m;
  });
  const transW = K.waterBox(Lo.ETA.dec.x1, F.x0, notch.z0, notch.z1 - 0.012, 18.3, Lo.P.flocOut[1] - 18.3, Lo.WATER.floc, 0.8, { nx: 2, ny: 2 });
  out.add(transW);
  // flocos: elipses ao redor do eixo de cada câmara; tamanho cresce de 1 → 3
  const NPer = 230, NFl = NPer * 3, flocs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), L.mat('#e2cf9f', { roughness: 0.8, flatShading: true, emissive: '#5a4a2a', emissiveIntensity: 0.35 }), NFl);
  flocs.frustumCulled = false; out.add(flocs);
  const rd = L.rng(305), FL = [];
  for (let i = 0; i < NFl; i++) { const ch = Math.floor(i / NPer); FL.push({ ch, s: Math.sqrt(0.04 + rd() * 0.96), a: rd() * L.TAU, y: Y0 + 0.35 + rd() * (F.water - Y0 - 0.55), sz: 0.6 + rd() * 0.8, sx: 0.7 + rd() * 0.6, sy: 0.6 + rd() * 0.5, ph: rd() * 6, rot: rd() * 6 }); }
  const SZ = [0.035, 0.075, 0.13];
  // setas do caminho da água (por cima / por baixo das cortinas)
  const path = new L.Chevrons([[14.6, 19.0, -68.95], [12.4, 17.6, -68.95], [10.2, 15.3, -68.95], [9, 14.85, -68.95], [7.6, 15.4, -68.95], [5.4, 17.6, -68.95], [3.6, 19.0, -68.95], [3.0, 19.1, -68.95], [2.3, 18.9, -68.95], [0.4, 17.1, -68.95], [-1.6, 17.5, -68.95], [-2.9, 18.9, -68.95]], { n: 16, size: 0.32, normal: [0, 0, 1], color: '#ffd23f' });
  out.add(path.mesh);
  const _d = new THREE.Object3D();

  function update(t, S, cam, P) {
    const b = S.build.floc, wf = S.water.floc;
    ghostG.visible = b < 0.04 && S.ghost > 0.01;
    const kw = ph(b, 0, 0.32), kc = ph(b, 0.25, 0.5), kb = ph(b, 0.45, 0.68), ka = ph(b, 0.62, 0.88), kd = ph(b, 0.82, 1);
    wallsG.visible = kw > 0; wallsG.scale.y = Math.max(0.001, L.ease.out(kw)); wallsG.position.y = 14 * (1 - wallsG.scale.y);
    curtG.visible = kc > 0; curtG.scale.y = Math.max(0.001, L.ease.out(kc)); curtG.position.y = 14 * (1 - curtG.scale.y);
    bridgeG.visible = kb > 0; bridgeG.position.y = (1 - L.ease.out(kb)) * 3.5;
    shaftsG.visible = ka > 0; shaftsG.position.y = (1 - L.ease.out(ka)) * 6.5;
    pivots.forEach((p) => { p.userData.foot.visible = kc > 0.5; });
    driveG.visible = kd > 0; driveG.position.y = (1 - L.ease.out(kd)) * 2.5;
    // giro (velocidade decrescente)
    const phi = P.paddles(t);
    pivots.forEach((p, i) => { p.rotation.y = -W[i] * phi + i * 0.4; });
    // enchimento 1 → 3
    const lv = [ph(wf, 0, 0.4), ph(wf, 0.3, 0.7), ph(wf, 0.6, 1)];
    waters.forEach((m, i) => m.userData.setLevel(lv[i]));
    transW.userData.setLevel(lv[2] >= 1 ? 1 : 0);
    // flocos (aparecem com a água e crescem com o tempo de agitação)
    const grow = L.clamp01(phi / 2.5), any = wf > 0.02;
    flocs.visible = any;
    if (any) {
      for (let i = 0; i < NFl; i++) {
        const q = FL[i], c = CH[q.ch], lvY = Y0 + (F.water - Y0) * lv[q.ch];
        const a = q.a - W[q.ch] * 0.55 * phi * (1.1 - q.s * 0.4);
        const x = c.cx + Math.cos(a) * q.s * 2.6, z = Zc + Math.sin(a) * q.s * 4.6, y = q.y + 0.12 * Math.sin(t * 0.7 + q.ph);
        const s = (y < lvY - 0.06 ? 1 : 0) * SZ[q.ch] * q.sz * (q.ch === 0 ? 1 : (0.35 + 0.65 * grow));
        _d.position.set(x, y, Math.min(z, ZFR - 0.06)); _d.rotation.set(q.rot + t * 0.3, q.rot * 2, 0); _d.scale.set(s * q.sx, s * q.sy, s);
        _d.updateMatrix(); flocs.setMatrixAt(i, _d.matrix);
      }
      flocs.instanceMatrix.needsUpdate = true;
    }
    path.update(t, { speed: 0.06, amount: wf >= 1 && P.near(cam, [6, 17, -74], 34) ? 0.95 : 0 });
  }
  return { update, CH };
}
