// BOCAS DE LOBO (combinadas: abertura na guia + grelha na sarjeta) com caixa de captação de concreto em corte
// (face em z = ZF), tubo de ligação até o teto da galeria, água caindo na caixa (cortina da guia + filetes da grelha),
// enchimento sob pressão e esguicho/fervura saindo pela grelha. Montagem peça a peça (S.build.inlets; extras com
// S.build.enlarge); ligações com S.build.gallery 0,8–1 (de montante para jusante).
export function buildInlets(ctx, K, gal) {
  const { L, THREE, Lo, scene, shared } = ctx, { C, ZF, slab } = K, DS = THREE.DoubleSide;
  const IN = Lo.INLET, HALF = IN.w / 2, T = 0.12, ZB = 22.68, ZC = 23.5, ZG = 23.105, R = IN.pipeR;
  const root = L.group(scene);
  const regular = Lo.INLETS.slice(), extra = Lo.INLETS_EXTRA.slice();
  // ordem de montagem = a mesma da escavação dos tampões no terreno (índice em Lo.INLETS, uma por vez); dentro da
  // janela de cada boca: primeiro a cava (terreno), depois as peças (fundo → paredes → laje → cantoneira → aro → grelha)
  const win = new Map();
  regular.forEach((x, i, a) => win.set(x, [i / a.length, (i + 1) / a.length]));
  extra.forEach((x, i) => win.set('e' + x, [0.1 + i * 0.2, 0.4 + i * 0.2]));
  const ligRank = regular.slice().sort((a, b) => a - b);

  const ligMat = L.mat('#c3c8cc', { roughness: 0.85, side: DS });
  const halfCylGeo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true, Math.PI / 2, Math.PI); halfCylGeo.translate(0, -0.5, 0);
  const faceGeo = new THREE.PlaneGeometry(2, 1); faceGeo.translate(0, -0.5, 0);
  const coneGeo = new THREE.CylinderGeometry(0.45, 1, 1, 16, 1, true); coneGeo.translate(0, 0.5, 0);
  const domeGeo = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const dropGeo = new THREE.SphereGeometry(1, 6, 4), dropMat = L.mat('#c4e2f2', { roughness: 0.15, transparent: true, opacity: 0.7, depthWrite: false });
  const filGeo = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true); filGeo.translate(0, -0.5, 0);
  // cortina d'água da abertura da guia: lâmina em parábola (z ∝ √queda), unidade de altura 1
  const curtGeo = new THREE.PlaneGeometry(0.94, 1, 1, 10);
  { const p = curtGeo.attributes.position; for (let j = 0; j < p.count; j++) { const v = 0.5 - p.getY(j); p.setXYZ(j, p.getX(j), -v, ZC + 0.02 + 0.2 * Math.sqrt(v)); } curtGeo.computeVertexNormals(); }
  const _o = new THREE.Object3D();

  const list = [];
  const mk = (x, isExtra) => {
    const sy = Lo.streetY(x), yt = sy + Lo.STREET_A.curbH, yF = yt - IN.depth, g = L.group(root, x, 0, 0);
    const P = (obj) => { g.add(obj); return obj; };
    const pieces = [];
    const piece = (obj, a, b, mode = 'front') => { P(obj); a = 0.5 + 0.5 * a; b = 0.5 + 0.5 * b; pieces.push({ obj, a, b, mode, x0: obj.position.x, y0: obj.position.y, z0: obj.position.z }); return obj; };
    // caixa: fundo, paredes, laje sob a calçada, envelope de brita na cava
    piece(slab(-HALF, HALF, yF - T, yF, ZB, ZF), 0.02, 0.16);
    piece(slab(-HALF, HALF, yF, sy - 0.06, ZB, ZB + T), 0.1, 0.25);
    [-1, 1].forEach((s, i) => {
      const xa = s < 0 ? -HALF : HALF - T, xb = xa + T;
      const w = new THREE.Group(); w.add(slab(xa, xb, yF, sy - 0.06, ZB, ZC), slab(xa, xb, yF, yt - 0.12, ZC, ZF));
      piece(w, 0.16 + i * 0.07, 0.32 + i * 0.07);
      piece(slab(s < 0 ? -HALF - 0.15 : HALF, s < 0 ? -HALF : HALF + 0.15, yF - T - 0.03, yt - 0.005, ZB, ZF - 0.002, C.gravel, C.gravel), 0.16 + i * 0.07, 0.32 + i * 0.07);
    });
    piece(slab(-HALF, HALF, yt - 0.12, yt - 0.004, ZC + 0.12, ZF), 0.4, 0.56);
    // cantoneira de aço da abertura da guia + garganta escura
    piece(L.box(IN.w - 0.1, 0.035, 0.14, C.steel, 0, yt - 0.02, ZC + 0.06), 0.52, 0.62, 'drop');
    const throat = piece(L.box(IN.w - 0.16, yt - sy - 0.04, 0.01, C.throat, 0, (sy + yt - 0.035) / 2, ZC - 0.006, { cast: false }), 0.52, 0.62, 'drop');
    // saída no fundo da caixa (meio furo no plano de corte)
    const hole = L.mesh(new THREE.CircleGeometry(R - 0.04, 16, 0, Math.PI).rotateX(-Math.PI / 2), C.throat, 0, yF + 0.003, ZF - 0.001, { cast: false }); piece(hole, 0.1, 0.2, 'none');
    // aro + grelha de ferro fundido
    const frame = new THREE.Group(), FX = 0.52, Z0 = ZB + 0.06, Z1 = ZC - 0.03, top = sy + 0.009;
    frame.add(L.box(2 * FX, 0.05, 0.06, C.iron, 0, top - 0.025, Z0 + 0.03), L.box(2 * FX, 0.05, 0.06, C.iron, 0, top - 0.025, Z1 - 0.03), L.box(0.06, 0.05, Z1 - Z0, C.iron, -FX + 0.03, top - 0.025, (Z0 + Z1) / 2), L.box(0.06, 0.05, Z1 - Z0, C.iron, FX - 0.03, top - 0.025, (Z0 + Z1) / 2));
    piece(frame, 0.62, 0.76, 'drop');
    const grate = new THREE.Group();
    for (let i = 0; i < 9; i++) grate.add(L.box(0.034, 0.045, Z1 - Z0 - 0.14, C.iron, -FX + 0.12 + i * ((2 * FX - 0.24) / 8), top - 0.03, (Z0 + Z1) / 2));
    [0.33, 0.67].forEach((k) => grate.add(L.box(2 * FX - 0.14, 0.04, 0.03, C.iron, 0, top - 0.032, L.lerp(Z0 + 0.07, Z1 - 0.07, k))));
    piece(grate, 0.74, 0.96, 'bounce');
    L.shadows(g);
    // ligação caixa → galeria (meio tubo de concreto em corte, comprimento unitário escalado)
    const lig = L.group(root, x, yF - T, ZF);
    const cp = L.cutPipe([[0, 0], [0, -1]], { r: R, wall: 0.05, mat: ligMat, cutMat: C.concCut, seg: 4, radial: 12, tension: 0 });
    lig.add(cp.group);
    [-1, 1].forEach((s) => lig.add(L.box(0.05, 1, 0.06, C.concOld, s * (R + 0.025), -0.5, -0.03, { cast: false })));
    L.shadows(lig);
    // água: poça/caixa cheia, coluna na ligação, respingo na galeria, cortina da guia, filetes da grelha
    const boxW = L.mesh(new THREE.BoxGeometry(2 * (HALF - T) - 0.006, 1, ZF - ZB - T + 0.002).translate(0, 0.5, 0), C.wDrain, x, yF + 0.002, (ZB + T + ZF + 0.002) / 2, { cast: false }); boxW.renderOrder = 6; root.add(boxW);
    const col = L.group(root, x, 0, ZF + 0.002); col.add(L.mesh(halfCylGeo, C.wDrainFall, 0, 0, 0, { cast: false }), L.mesh(faceGeo, C.wDrainFall, 0, 0, 0, { cast: false })); col.children.forEach((m) => { m.renderOrder = 7; });
    const splash = L.mesh(new THREE.TorusGeometry(1, 0.25, 6, 18).rotateX(Math.PI / 2), C.foam, x, 0, ZF - 0.1, { cast: false }); root.add(splash);
    const curt = L.mesh(curtGeo, C.wDrainFall, x, sy + 0.012, 0, { cast: false }); curt.renderOrder = 7; root.add(curt);
    const fil = new THREE.InstancedMesh(filGeo, C.wDrainFall, 5); fil.frustumCulled = false; fil.renderOrder = 7; root.add(fil);
    const drops = new THREE.InstancedMesh(dropGeo, dropMat, 18); drops.frustumCulled = false; root.add(drops);
    // esguicho / fervura pela grelha
    const sp = L.group(root, x, 0, ZG);
    const jetA = L.mesh(coneGeo, C.aer, 0, 0, 0, { cast: false }), jetB = L.mesh(coneGeo, C.wDrainFall, 0, 0, 0, { cast: false }), dome = L.mesh(domeGeo, C.aer, 0, 0, 0, { cast: false }), ring = L.mesh(new THREE.RingGeometry(0.62, 1, 28).rotateX(-Math.PI / 2), C.foam, 0, 0.01, 0, { cast: false });
    [jetA, jetB, dome, ring].forEach((m) => { m.renderOrder = 8; sp.add(m); });
    const sdrops = new THREE.InstancedMesh(dropGeo, dropMat, 40); sdrops.frustumCulled = false; sp.add(sdrops);
    const it = { x, isExtra, sy, yt, yF, g, pieces, lig, cp, boxW, col, splash, curt, fil, drops, sp, jetA, jetB, dome, ring, sdrops, throat, hook: x === Lo.HOOK_INLET, built: 0, ligK: 0 };
    list.push(it);
    return it;
  };
  regular.forEach((x) => mk(x, false)); extra.forEach((x) => mk(x, true));
  shared.inlets = list.map((it) => ({ x: it.x, y: it.sy + 0.009, z: ZG, extra: it.isExtra }));
  shared.inletBoxK = (x, S) => { const it = list.find((q) => q.x === x); return it ? progress(it, S).box : 0; };
  shared._ligOn = (x, S) => { const it = list.find((q) => q.x === x); return !!it && progress(it, S).lig > 0; };

  function progress(it, S) {
    const B = S.build;
    if (it.isExtra) { const [a, b] = win.get('e' + it.x), i = extra.indexOf(it.x); return { box: K.sub(B.enlarge, a, b), lig: K.sub(B.enlarge, 0.62 + 0.15 * i, 0.82 + 0.15 * i) }; }
    const [a, b] = win.get(it.x), r = ligRank.indexOf(it.x), l0 = 0.8 + 0.14 * (r / (ligRank.length - 1));
    return { box: K.sub(B.inlets, a, b), lig: K.sub(B.gallery, l0, l0 + 0.06) };
  }

  return {
    list,
    update(t, S) {
      const lvl = Math.min(1, Math.max(0, S.gal)), fill = L.clamp01((S.gal - 0.985) / 0.05);
      list.forEach((it, n) => {
        const pr = progress(it, S), p = pr.box;
        it.built = p; it.ligK = pr.lig;
        it.g.visible = p > 0;
        it.pieces.forEach((q) => {
          const e = K.sub(p, q.a, q.b), ee = L.ease.out(e);
          q.obj.visible = e > 0;
          if (q.mode === 'front') { q.obj.position.set(q.x0, q.y0 + 0.5 * (1 - ee), q.z0 + 1.8 * (1 - ee)); }
          else if (q.mode === 'drop') { q.obj.position.y = q.y0 + 1.4 * (1 - ee); }
          else if (q.mode === 'bounce') { q.obj.position.y = q.y0 + 1.6 * (1 - L.ease.bounce(e)); }
        });
        // ligação: cresce para baixo do fundo da caixa até o teto (externo) atual da galeria
        const ligTop = it.yF - T, ligBot = gal.roofIn(it.x), len = Math.max(0.01, ligTop - ligBot);
        it.lig.visible = pr.lig > 0; it.lig.scale.y = len * L.ease.out(pr.lig);
        const working = p >= 1 && pr.lig >= 1;
        // vazão que entra nesta boca: S.inletIn, ou a lâmina parada sobre a grelha escoando (com lixo, menos)
        const puddle = L.clamp01((S.flood - it.sy - 0.005) / 0.12) * (1 - 0.75 * S.trash);
        const spoutK = S.spout * (it.hook ? 1 : 0.6);
        const inflow = working && S.spout < 0.05 ? Math.max(S.inletIn, puddle) : 0;
        // nível na caixa
        const pool = 0.03 + 0.09 * inflow, full = fill * (working ? 1 : 0);
        const lvlBox = L.lerp(pool, it.sy - it.yF - 0.012, full);
        it.boxW.visible = working && (inflow > 0.01 || full > 0.01); it.boxW.scale.y = lvlBox;
        // coluna d'água na ligação (filete encostado na parede → tubo cheio sob pressão) até a lâmina da galeria
        const surf = gal.floorY(it.x) + Math.min(gal.hAt(it.x) - 0.006, lvl * gal.hAt(it.x));
        const colOn = working && (inflow > 0.01 || full > 0.01);
        it.col.visible = colOn;
        if (colOn) {
          const rr = L.lerp(0.03 + 0.07 * inflow, R - 0.05, full), y0 = it.yF + 0.004, y1 = full > 0.5 ? ligBot : surf;
          it.col.position.y = y0; it.col.scale.set(rr, Math.max(0.01, y0 - y1), rr);
        }
        const spl = working ? inflow * (1 - full) : 0;
        it.splash.visible = spl > 0.02 && S.gal > 0.02;
        if (it.splash.visible) { const k = 0.08 + 0.08 * spl + 0.02 * Math.sin(t * 13 + n); it.splash.position.y = surf + 0.01; it.splash.scale.set(k, 1, k); }
        // cortina da guia e filetes da grelha caindo dentro da caixa
        const fall = Math.max(0.05, it.sy - (it.yF + lvlBox)), wet = inflow * (1 - full);
        it.curt.visible = wet > 0.02; it.curt.scale.set(0.35 + 0.65 * wet, fall, 1); 
        it.fil.visible = wet > 0.02;
        if (it.fil.visible) for (let i = 0; i < 5; i++) {
          const r = (0.008 + 0.022 * wet) * (0.7 + 0.3 * Math.sin(t * 9 + i * 2.1));
          _o.position.set(it.x - 0.36 + i * 0.18, it.sy - 0.03, 22.9 + ((i * 37) % 5) * 0.1); _o.rotation.set(0, 0, 0); _o.scale.set(r, fall - 0.03, r); _o.updateMatrix(); it.fil.setMatrixAt(i, _o.matrix);
        }
        it.fil.instanceMatrix.needsUpdate = true;
        it.drops.visible = wet > 0.02;
        if (it.drops.visible) for (let i = 0; i < 18; i++) {
          const ph = L.fract(t * 1.7 + i * 0.37), cur = i % 3 !== 0, s = 0.012 + 0.012 * wet;
          if (cur) { _o.position.set(it.x - 0.44 + ((i * 53) % 18) / 18 * 0.88, it.sy + 0.01 - ph * fall, ZC + 0.04 + 0.3 * Math.sqrt(ph)); }
          else { _o.position.set(it.x - 0.36 + ((i * 7) % 5) * 0.18, it.sy - 0.03 - ph * ph * fall, 22.9 + ((i * 3) % 5) * 0.1); }
          _o.scale.set(s, s * 2.2, s); _o.updateMatrix(); it.drops.setMatrixAt(i, _o.matrix);
        }
        it.drops.instanceMatrix.needsUpdate = true;
        // esguicho: a galeria sob pressão empurra a água de volta pela grelha (fervura se a rua já estiver alagada)
        const sk = working ? spoutK : 0, fd = Math.max(0, S.flood - it.sy);
        it.sp.visible = sk > 0.01;
        if (it.sp.visible) {
          const sub = L.clamp01(fd / 0.45), baseY = Math.max(it.sy + 0.01, Math.min(S.flood, it.sy + 1.5) - 0.01);
          const Hj = sk * (it.hook ? 1.0 : 0.6) * (1 - 0.78 * sub) * (0.92 + 0.08 * Math.sin(t * 11 + n)), wob = 1 + 0.06 * Math.sin(t * 17 + n * 3);
          it.sp.position.y = baseY;
          it.jetA.scale.set(0.2 * sk * wob, Hj, 0.13 * sk * wob); it.jetB.scale.set(0.11 * sk, Hj * 0.75, 0.08 * sk); it.jetA.visible = it.jetB.visible = Hj > 0.03;
          const dm = (0.34 + 0.22 * sub) * sk * (1 + 0.1 * Math.sin(t * 7 + n));
          it.dome.scale.set(dm * 1.7, dm * (0.45 + 0.35 * (1 - sub)), dm * 1.1); it.ring.scale.set(dm * 2.4 + 0.06 * Math.sin(t * 5), 1, dm * 1.7 + 0.06 * Math.sin(t * 5));
          for (let i = 0; i < 40; i++) {
            const ph = L.fract(t * 1.25 + i / 40), a = i * 2.39996, rr = (0.15 + 0.7 * ph) * sk * (it.hook ? 1 : 0.6), up = 4 * ph * (1 - ph) * (Hj + 0.35 * sk);
            const s = (0.012 + 0.014 * sk) * (1 - ph * 0.5);
            _o.position.set(Math.cos(a) * rr * 1.4, up, Math.sin(a) * rr * 0.8); _o.scale.set(s, s * 1.8, s); _o.updateMatrix(); it.sdrops.setMatrixAt(i, _o.matrix);
          }
          it.sdrops.instanceMatrix.needsUpdate = true;
        }
      });
    }
  };
}
