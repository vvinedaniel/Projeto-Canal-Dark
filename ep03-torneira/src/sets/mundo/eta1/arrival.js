// Caixa de chegada (recebe a adutora bruta por baixo em P.rawIn) + calha Parshall sobre pilares
// (convergente → garganta → divergente → canal de saída até o floculador), com ressalto hidráulico turbulento.
// Corte pela frente: a parede da frente foi removida; a face da água no corte mostra o perfil da lâmina.
export function buildArrival(env) {
  const { L, THREE, Lo, K, ghost, root } = env, { MAT, ph, ss } = K, A = Lo.ETA.arrival, PS = Lo.ETA.parshall, Z = PS.z;
  const out = new THREE.Group(); root.add(out);

  /* ---------------------------------------------------------------- caixa de chegada */
  const th = 0.3, boxG = new THREE.Group(), weir = { z0: -75.4, z1: -72.6, crest: 20.3 };
  {
    const g = new THREE.Group(), C = MAT.conc;
    g.add(L.box(A.x1 - A.x0, 0.3, A.z1 - A.z0, MAT.slab, (A.x0 + A.x1) / 2, A.floor + 0.15, (A.z0 + A.z1) / 2));        // laje de fundo 14.0–14.3
    g.add(L.box(A.x1 - A.x0, A.top - A.floor, th, C, (A.x0 + A.x1) / 2, (A.floor + A.top) / 2, A.z0 + th / 2));            // fundo
    g.add(L.box(th, A.top - A.floor, A.z1 - A.z0 - th, C, A.x1 - th / 2, (A.floor + A.top) / 2, (A.z0 + th + A.z1) / 2)); // leste
    g.add(L.box(th, weir.crest - A.floor, A.z1 - A.z0 - th, C, A.x0 + th / 2, (A.floor + weir.crest) / 2, (A.z0 + th + A.z1) / 2)); // oeste (vertedor)
    [[A.z0 + th, weir.z0], [weir.z1, A.z1]].forEach(([a, b]) => g.add(L.box(th, A.top - weir.crest, b - a, C, A.x0 + th / 2, (weir.crest + A.top) / 2, (a + b) / 2)));
    g.add(L.box(A.x1 - A.x0 - 2 * th, A.top - A.water, th, C, (A.x0 + A.x1) / 2, (A.water + A.top) / 2, A.z1 - th / 2));     // faixa da frente (acima da água)
    // crista do vertedor arredondada
    const cr = L.cyl(th / 2, th / 2, weir.z1 - weir.z0, MAT.concNew, A.x0 + th / 2, weir.crest, (weir.z0 + weir.z1) / 2, 16); cr.rotation.x = Math.PI / 2; g.add(cr);
    // faces de corte (z = A.z1)
    g.add(K.capZ(A.x0, A.x0 + th, A.floor, A.top, A.z1 + 0.004), K.capZ(A.x1 - th, A.x1, A.floor, A.top, A.z1 + 0.004), K.capZ(A.x0, A.x1, A.floor, A.floor + 0.3, A.z1 + 0.004));
    // tubo de chegada (sobe pelo fundo): flange em P.rawIn, atravessa a laje, boca em sino
    const [px, py, pz] = Lo.P.rawIn, r = 0.4;
    K.flange(g, px, py - 0.05, pz, r, 'y', MAT.ironRaw, 12);
    g.add(L.cyl(r, r, 1.6, MAT.ironRaw, px, py + 0.8, pz, 28));
    K.flange(g, px, py + 1.0, pz, r, 'y', MAT.ironRaw, 12);
    g.add(L.lathe([[r, py + 1.6], [r * 1.25, py + 1.85], [r * 1.7, py + 2.05], [r * 1.78, py + 2.1], [r * 1.6, py + 2.1], [r * 1.15, py + 1.86], [r * 0.9, py + 1.6]], L.mat('#6f5e4b', { roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }), 28));
    // ancoragem do tubo (bloco) e grelha de proteção
    g.add(L.box(1.6, 0.35, 1.6, MAT.concB, px, A.floor + 0.47, pz));
    // plataforma no topo (fundo) + guarda-corpo + escada marinheiro na face leste
    K.walkway(g, A.x0, A.x1, A.z0, A.z0 + 1.1, A.top + 0.06);
    K.railing(g, [[A.x0, A.top + 0.06, A.z0 + 1.1], [A.x1, A.top + 0.06, A.z0 + 1.1]]);
    K.railing(g, [[A.x0, A.top + 0.06, A.z0], [A.x1, A.top + 0.06, A.z0]]);
    K.ladder(g, A.x1, A.z0 + 1.6, A.floor, A.top, [1, 0]);
    K.railing(g, [[A.x1 + 0.05, A.top, A.z0 + 0.2], [A.x1 + 0.05, A.top, A.z0 + 1.1]]);
    K.lamp(g, A.x1 - 0.2, A.top + 0.06, A.z0 + 0.3, 2.4, [-0.5, 0]);
    boxG.add(K.bake(g)); out.add(boxG);
  }
  /* ---------------------------------------------------------------- calha Parshall */
  const XS = [25.0, 21.0, 20.0, 17.0, 15.0], HW = [1.4, PS.w / 2, PS.w / 2, 1.0, 1.0], YF = [PS.floor, PS.floor, 18.0, 18.25, 18.25];
  const seg = (x) => { for (let i = 0; i < XS.length - 1; i++) if (x >= XS[i + 1] - 1e-6) return i; return XS.length - 2; };
  const at = (arr, x) => { const i = seg(x), k = (XS[i] - x) / (XS[i] - XS[i + 1]); return L.lerp(arr[i], arr[i + 1], L.clamp01(k)); };
  const hwAt = (x) => at(HW, x), yfAt = (x) => at(YF, x), TOP = 20.2, WT = 0.2, SL = 0.3;
  const flumeG = new THREE.Group(), pierG = new THREE.Group(), detG = new THREE.Group();
  {
    const qc = K.QB(), qk = K.QB();
    for (let i = 0; i < XS.length - 1; i++) {
      const xa = XS[i], xb = XS[i + 1], ha = HW[i], hb = HW[i + 1], fa = YF[i], fb = YF[i + 1];
      const zbA = Z - ha, zbB = Z - hb, zfA = Z + ha, zfB = Z + hb;
      // laje: topo, fundo, frente (corte), trás
      qc.quad([xa, fa, zfA], [xb, fb, zfB], [xb, fb, zbB - WT], [xa, fa, zbA - WT]);
      qc.quad([xa, fa - SL, zbA - WT], [xb, fb - SL, zbB - WT], [xb, fb - SL, zfB], [xa, fa - SL, zfA]);
      qk.quad([xa, fa - SL, zfA + 0.003], [xb, fb - SL, zfB + 0.003], [xb, fb, zfB + 0.003], [xa, fa, zfA + 0.003]);
      // parede de trás (face interna, externa, topo)
      qc.quad([xa, fa, zbA], [xa, TOP, zbA], [xb, TOP, zbB], [xb, fb, zbB]);
      qc.quad([xa, fa - SL, zbA - WT], [xb, fb - SL, zbB - WT], [xb, TOP, zbB - WT], [xa, TOP, zbA - WT]);
      qc.quad([xa, TOP, zbA - WT], [xb, TOP, zbB - WT], [xb, TOP, zbB], [xa, TOP, zbA]);
      // corte da parede de trás nas pontas (topo da parede visível de frente: face +z da espessura já é a interna)
    }
    // pontas (x = 25 e x = 15)
    [[XS[0], HW[0], YF[0]], [XS[4], HW[4], YF[4]]].forEach(([x, h, f]) => { qk.quad([x, f - SL, Z - h - WT], [x, f - SL, Z + h], [x, f, Z + h], [x, f, Z - h - WT]); qk.quad([x, f, Z - h - WT], [x, f, Z - h], [x, TOP, Z - h], [x, TOP, Z - h - WT]); });
    const g = new THREE.Group(); g.add(qc.mesh(MAT.conc), qk.mesh(MAT.cut));
    // régua de nível (sem números: só traços) no convergente, ponto de medição a 2/3
    const gx = 23.6, gz = Z - hwAt(gx) + 0.02;
    const tx = K.canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#f7f7f2'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = i % 10 === 0 ? '#c8302a' : '#1d242b'; const y = h - (i + 1) * (h / 41); c.fillRect(0, y, i % 5 === 0 ? w * 0.8 : w * 0.45, h / 90); } });
    const gauge = L.mesh(new THREE.PlaneGeometry(0.14, 1.5), L.mat('#ffffff', { map: tx, roughness: 0.5 }), gx, PS.floor + 0.75, gz, { cast: false });
    gauge.rotation.y = Math.atan2(hwAt(gx - 0.5) - hwAt(gx + 0.5), 1) * -1; gauge.userData.keep = true; g.add(gauge);
    // sensor ultrassônico de nível num braço sobre a água
    g.add(K.beam([gx + 0.3, TOP + 0.05, Z - hwAt(gx) - 0.2], [gx + 0.3, TOP + 0.05, Z - 0.1], 0.08, 0.08, MAT.galv));
    g.add(L.box(0.22, 0.26, 0.22, MAT.white, gx + 0.3, TOP - 0.1, Z - 0.1), L.cyl(0.08, 0.08, 0.06, MAT.dark, gx + 0.3, TOP - 0.25, Z - 0.1, 12));
    // cantoneiras de borda (aço) no topo da parede
    g.add(K.beam([XS[0], TOP + 0.02, Z - HW[0] - WT / 2], [XS[1], TOP + 0.02, Z - HW[1] - WT / 2], 0.24, 0.04, MAT.galv));
    flumeG.add(K.bake(g));
    // pilares (pórticos) — 2 colunas + viga de topo, sapatas
    const pg = new THREE.Group();
    [24.2, 21.6, 18.9, 16.1].forEach((x) => {
      const h = hwAt(x), yb = yfAt(x) - SL, zc = [Z - h - 0.05, Z + h - 0.25];
      zc.forEach((z) => { pg.add(L.box(0.38, yb - 0.4 - 14.0, 0.38, MAT.concB, x, (14.0 + yb - 0.4) / 2, z)); pg.add(L.box(0.9, 0.18, 0.9, MAT.concB, x, 14.09, z)); });
      pg.add(L.box(0.42, 0.42, 2 * h + WT + 0.1, MAT.concB, x, yb - 0.21, Z - WT / 2));
      pg.add(L.box(0.3, 0.3, 2 * h - 0.2, MAT.concB, x, 15.6, Z - 0.15));   // travessa intermediária
    });
    pierG.add(K.bake(pg));
    // luminária e placa
    const dg = new THREE.Group();
    K.lamp(dg, 22.6, TOP, Z - hwAt(22.6) - WT, 2.2, [0, 0.6]);
    detG.add(K.bake(dg));
    const sg = K.sign(['CALHA PARSHALL', 'mistura rápida + medição'], 2.0, 0.55, { stripe: '#2f7fd6' });
    sg.position.set(23.2, 16.6, Z + 0.4); out.add(sg); detG.add(sg);
    out.add(flumeG, pierG, detG);
  }
  const ghostG = ghost.of(out); root.add(ghostG);

  /* ---------------------------------------------------------------- água na caixa de chegada */
  const RAW = new THREE.Color(Lo.WATER.raw), COAG = new THREE.Color(Lo.WATER.coag), CHEM = new THREE.Color('#b48ad8');
  const boxW = K.waterBox(A.x0 + th, A.x1 - th, A.z0 + th, A.z1 - 0.012, A.floor + 0.3, A.water - A.floor - 0.3, Lo.WATER.raw, 0.62, { nx: 6, ny: 6 });
  out.add(boxW);
  // borbulhão sobre a boca do tubo (água subindo)
  const boil = L.mesh(new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), L.water(Lo.WATER.raw, 0.75), Lo.P.rawIn[0], A.water, Lo.P.rawIn[2], { cast: false });
  out.add(boil);
  const upCh = new L.Chevrons([[27, 16.4, -71.4], [27, 20.2, -71.4]], { n: 4, size: 0.35, normal: [0, 0, 1], color: '#ffd23f' });
  out.add(upCh.mesh);
  // lâmina vertendo (cortina) da crista para a entrada da Parshall
  const napG = new THREE.Group();
  {
    const prof = []; for (let i = 0; i <= 10; i++) { const u = i / 10; prof.push([A.x0 - 0.05 - 0.55 * Math.pow(u, 0.7), weir.crest + 0.28 - 0.95 * u * u]); }
    const q = K.QB(); for (let i = 0; i < prof.length - 1; i++) { const [xa, ya] = prof[i], [xb, yb] = prof[i + 1]; q.quad([xa, ya, weir.z1], [xb, yb, weir.z1], [xb, yb, weir.z0], [xa, ya, weir.z0]); q.quad([xa + 0.12, ya, weir.z0], [xb + 0.12, yb, weir.z0], [xb + 0.12, yb, weir.z1], [xa + 0.12, ya, weir.z1]); }
    // topo da lâmina sobre a crista
    q.quad([A.x0 + th + 0.05, weir.crest + 0.3, weir.z0], [A.x0 + th + 0.05, weir.crest + 0.3, weir.z1], [A.x0 - 0.05, weir.crest + 0.28, weir.z1], [A.x0 - 0.05, weir.crest + 0.28, weir.z0]);
    const nm = L.mesh(q.geo(), L.water(Lo.WATER.raw, 0.8, { side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); nm.renderOrder = 3; napG.add(nm);
    out.add(napG);
  }
  /* ---------------------------------------------------------------- água na Parshall (malha dinâmica) */
  const NX = 110, NZ = 6, X0 = XS[0], X1 = XS[4];
  const pw = (() => {
    const nTop = (NX + 1) * (NZ + 1), nFront = (NX + 1) * 2, pos = new Float32Array((nTop + nFront) * 3), col = new Float32Array((nTop + nFront) * 3), idx = [];
    for (let i = 0; i < NX; i++) { for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + 1, c = a + NZ + 1, d = c + 1; idx.push(a, c, b, b, c, d); } const f = nTop + i * 2; idx.push(f, f + 2, f + 1, f + 1, f + 2, f + 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
    const m = L.mesh(g, L.water('#ffffff', 0.9, { vertexColors: true, side: THREE.DoubleSide }), 0, 0, 0, { cast: false }); m.renderOrder = 3; m.frustumCulled = false;
    out.add(m); return { g, m, pos, col, nTop };
  })();
  const surf = (x) => {   // perfil da lâmina: nível a montante → queda na garganta (escoamento rápido) → ressalto → nível do floculador
    if (x >= 21.6) return PS.water;
    if (x >= 20.0) return L.lerp(18.5, PS.water, ss(20.0, 21.6, x));
    if (x >= 19.35) return 18.5 + (19.35 - x) * -0.03;
    if (x >= 18.45) return L.lerp(19.48, 18.49, ss(18.45, 19.35, x));
    return L.lerp(Lo.P.flocIn[1], 19.48, (x - X1) / (18.45 - X1));
  };
  const jumpEnv = (x) => ss(19.75, 19.2, x) * ss(17.6, 18.5, x);
  // espuma do ressalto
  const NF = 110, foam = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), L.mat('#f2eee3', { roughness: 0.85 }), NF);
  foam.frustumCulled = false; out.add(foam);
  const fr = L.rng(41), FO = []; for (let i = 0; i < NF; i++) FO.push({ x: 19.45 - fr() * 1.5, u: fr(), s: 0.03 + fr() * 0.06, ph: fr(), w: 0.3 + fr() * 0.5 });
  // coagulante: gotas do difusor + turbilhão (rolo do ressalto)
  const NDp = 36, NSw = 150, chemM = L.mat('#c7a0ee', { emissive: '#9a62d8', emissiveIntensity: 0.6, roughness: 0.4 });
  const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), chemM, NDp), swirl = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), chemM, NSw);
  drops.frustumCulled = swirl.frustumCulled = false; out.add(drops, swirl);
  const sr = L.rng(77), SW = []; for (let i = 0; i < NSw; i++) SW.push({ r: 0.1 + sr() * 0.42, a: sr() * L.TAU, z: sr(), ph: sr(), s: 0.025 + sr() * 0.035 });
  const _d = new THREE.Object3D(), _c = new THREE.Color();

  function update(t, S, cam, P) {
    const b = S.build.arrival, wa = S.water.arrival, coag = S.run.coag * S.build.chem;
    ghostG.visible = b < 0.04 && S.ghost > 0.01;
    // obra: paredes da caixa sobem (concretagem) → pilares → calha assentada (pré-moldada) → acabamentos
    const kb = ph(b, 0, 0.38), kp = ph(b, 0.3, 0.55), kf = ph(b, 0.5, 0.82), kd = ph(b, 0.8, 1.0);
    boxG.visible = kb > 0; boxG.scale.y = Math.max(0.001, L.ease.out(kb)); boxG.position.y = 14.0 * (1 - boxG.scale.y);
    pierG.visible = kp > 0; pierG.scale.y = Math.max(0.001, kp); pierG.position.y = 14.0 * (1 - pierG.scale.y);
    flumeG.visible = kf > 0; flumeG.position.y = (1 - L.ease.out(kf)) * 4.0;
    detG.visible = kd > 0; detG.position.y = (1 - L.ease.out(kd)) * 2.0;
    // água: caixa enche, transborda, corre pela calha
    const kL = ph(wa, 0, 0.55), head = ph(wa, 0.5, 1.0);
    boxW.userData.setLevel(kL); boxW.visible = kL > 0.004 && kb >= 1;
    const bk = (0.18 + 0.05 * Math.sin(t * 5.1)) * kL;
    boil.visible = kL > 0.95; boil.scale.set(0.85 + 0.1 * Math.sin(t * 3.7), bk, 0.85 + 0.1 * Math.cos(t * 4.3));
    upCh.update(t, { speed: 0.5, amount: kL > 0.3 && P.near(cam, [27, 18, -74], 30) ? 1 : 0 });
    napG.visible = head > 0.02; napG.scale.y = 1;
    // malha da lâmina
    const xf = X0 - head * (X0 - X1 + 0.3), on = head > 0.002 && kf >= 1;
    pw.m.visible = on;
    if (on) {
      const { pos, col, nTop } = pw;
      for (let i = 0; i <= NX; i++) {
        const x = L.lerp(X0, X1, i / NX), hw = hwAt(x), yf = yfAt(x), dep = ss(xf - 0.05, xf + 0.9, x);
        const env = jumpEnv(x) * dep;
        // cor: bruta → com coagulante (após a garganta), com rastro lilás do produto na mistura
        _c.copy(RAW).lerp(COAG, coag * ss(20.6, 18.6, x));
        const plume = coag * ss(20.7, 20.3, x) * ss(16.8, 19.3, x) * 0.16;
        _c.lerp(CHEM, plume);
        for (let j = 0; j <= NZ; j++) {
          const z = L.lerp(Z - hw + 0.012, Z + hw - 0.012, j / NZ);
          const turb = env * (0.13 * Math.sin(x * 7.1 + t * 9.3) * Math.sin(z * 5.3 - t * 6.1) + 0.07 * Math.sin(x * 13.7 - t * 11.2 + z * 3.1)) + dep * 0.012 * Math.sin(x * 3 + t * 4 + z * 2);
          const y = yf + Math.max(0.003, (surf(x) - yf) * dep + turb * dep);
          const k = (i * (NZ + 1) + j) * 3; pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
          col[k] = _c.r; col[k + 1] = _c.g; col[k + 2] = _c.b;
        }
        const top = pos[(i * (NZ + 1) + NZ) * 3 + 1];
        const f = (nTop + i * 2) * 3;
        pos[f] = x; pos[f + 1] = yf + 0.003; pos[f + 2] = Z + hw - 0.012; pos[f + 3] = x; pos[f + 4] = top; pos[f + 5] = Z + hw - 0.012;
        const cb = _c.clone().multiplyScalar(0.82);
        col[f] = cb.r; col[f + 1] = cb.g; col[f + 2] = cb.b; col[f + 3] = _c.r; col[f + 4] = _c.g; col[f + 5] = _c.b;
      }
      pw.g.attributes.position.needsUpdate = true; pw.g.attributes.color.needsUpdate = true; pw.g.computeVertexNormals();
    }
    // espuma no ressalto
    const fOn = on && xf < 18.6;
    foam.visible = fOn;
    if (fOn) for (let i = 0; i < NF; i++) {
      const q = FO[i], u = L.fract(q.ph + t * q.w * 0.5), x = q.x - u * 0.9, hw = hwAt(x), z = L.lerp(Z - hw + 0.1, Z + hw - 0.05, q.u);
      const y = surf(x) + jumpEnv(x) * (0.13 * Math.sin(x * 7.1 + t * 9.3) * Math.sin(z * 5.3 - t * 6.1)) + 0.03;
      _d.position.set(x, y, z); _d.rotation.set(t * q.w, q.u * 6, 0); _d.scale.setScalar(q.s * Math.sin(Math.PI * u) * (1 + 0.3 * Math.sin(t * 7 + i)) * jumpEnv(x + 0.2) + 1e-4);
      _d.updateMatrix(); foam.setMatrixAt(i, _d.matrix);
    }
    foam.instanceMatrix.needsUpdate = true;
    // coagulante entrando no ressalto
    const cOn = on && coag > 0.01 && xf < 18.6;
    drops.visible = swirl.visible = cOn;
    if (cOn) {
      const nzz = 6;
      for (let i = 0; i < NDp; i++) {
        const j = i % nzz, k = Math.floor(i / nzz), z = L.lerp(Z - 0.6, Z + 0.6, j / (nzz - 1)), u = L.fract(k / 6 + t * 2.3 + j * 0.13);
        const y0 = Lo.ETA.dosing.coag[1] - 0.06, y1 = surf(20.5) + 0.02;
        _d.position.set(20.5 + u * -0.25, L.lerp(y0, y1, u * u), z); _d.rotation.set(0, 0, 0); _d.scale.set(0.028, 0.05 + u * 0.03, 0.028).multiplyScalar(coag);
        _d.updateMatrix(); drops.setMatrixAt(i, _d.matrix);
      }
      for (let i = 0; i < NSw; i++) {
        const q = SW[i], u = L.fract(q.ph + t * 0.28), cx = 19.15 - u * 2.2, cy = 18.95 + u * 0.12, a = q.a - t * (5.2 - u * 3) , r = q.r * (0.6 + u * 0.9);
        const hw = hwAt(cx), z = L.lerp(Z - hw + 0.15, Z + hw - 0.05, q.z);
        const x = cx + Math.cos(a) * r, y = Math.min(surf(x) - 0.03, Math.max(yfAt(x) + 0.05, cy + Math.sin(a) * r * 0.75));
        _d.position.set(x, y, z); _d.rotation.set(0, 0, 0); _d.scale.setScalar(q.s * coag * (1 - u) * (u < 0.05 ? u * 20 : 1) + 1e-4);
        _d.updateMatrix(); swirl.setMatrixAt(i, _d.matrix);
      }
      drops.instanceMatrix.needsUpdate = true; swirl.instanceMatrix.needsUpdate = true;
    }
  }
  return { update, group: out, hwAt, yfAt, surf, TOP };
}
