// TORNEIRA DE MESA tipo PRESSÃO (registro de globo) em corte + COPO enchendo.
// Corpo de latão cromado; por dentro (cor de latão): canal de entrada (vem do flexível), SEDE (orifício), câmara,
// CASTELO com rosca; HASTE roscada que sobe quando o VOLANTE (cruzeta, botão azul = água fria) gira; na ponta da haste a
// carrapeta com o VEDANTE de borracha, que sai da sede e deixa a água passar; BICA (canal interno) até o AREJADOR (telas).
// No gancho a torneira está inteira (a metade da frente é uma "tampa" que sai em 100,6 s para mostrar o corte).
// O jato aerado cai no COPO (vidro grosso, menisco, ondulação, bolhas e respingos).
import { FZ } from './house.js';

export function buildFaucet(ctx, K, H) {
  const { L, THREE, Lo } = ctx, { G, TM, Merge, vmat, revolve, revolveCaps } = K;
  const root = new THREE.Group();
  const BX = -2.75, DY = Lo.HOUSE.kitchen.counterY;
  const fc = new THREE.Group(); fc.position.set(BX, DY, FZ); root.add(fc);
  const chrome = L.metal('#e9eef2', { roughness: 0.1, metalness: 1.0, side: THREE.DoubleSide });
  const chromeCover = L.metal('#e9eef2', { roughness: 0.1, metalness: 1.0, transparent: true, opacity: 1 });
  const brass = L.metal('#c79a3e', { roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide });
  const brassCut = L.mat('#e8c36c', { roughness: 0.45, metalness: 0.3, side: THREE.DoubleSide });
  /* ---------- corpo ---------- */
  const outer = [[0.016, -0.075], [0.016, 0], [0.042, 0], [0.042, 0.006], [0.03, 0.012], [0.026, 0.012], [0.026, 0.095], [0.022, 0.095], [0.022, 0.135], [0.0, 0.135]];
  const inner = [[0.007, -0.075], [0.007, 0.06], [0.017, 0.06], [0.017, 0.095], [0.009, 0.095], [0.009, 0.135]];
  fc.add(L.mesh(revolve(outer, 36, 'back'), chrome));
  fc.add(L.mesh(revolve(inner, 28, 'back'), brass));
  const SP0 = 0.066, SP1 = 0.084;
  const capR1 = [[0.007, -0.075], [0.016, -0.075], [0.016, 0], [0.042, 0], [0.042, 0.006], [0.03, 0.012], [0.026, 0.012], [0.026, SP0], [0.017, SP0], [0.017, 0.06], [0.007, 0.06]];
  const capR2 = [[0.017, SP1], [0.026, SP1], [0.026, 0.095], [0.022, 0.095], [0.022, 0.135], [0.009, 0.135], [0.009, 0.095], [0.017, 0.095]];
  const capL = [[-0.007, -0.075], [-0.016, -0.075], [-0.016, 0], [-0.042, 0], [-0.042, 0.006], [-0.03, 0.012], [-0.026, 0.012], [-0.026, 0.095], [-0.022, 0.095], [-0.022, 0.135], [-0.009, 0.135], [-0.009, 0.095], [-0.017, 0.095], [-0.017, 0.06], [-0.007, 0.06]];
  fc.add(L.mesh(L.BGU.mergeGeometries([capR1, capR2, capL].map((p) => G.shape(p).toNonIndexed())), brassCut, 0, 0, 0.0004, { cast: false }));
  // rosca interna do castelo (riscos) e anel da sede
  const det = new Merge(); for (let i = 0; i < 6; i++) { det.add(G.box(0.004, 0.0015, 0.001), '#8a6a24', TM(0.011, 0.1 + i * 0.006, 0.0006)); det.add(G.box(0.004, 0.0015, 0.001), '#8a6a24', TM(-0.011, 0.103 + i * 0.006, 0.0006)); }
  det.add(G.box(0.012, 0.003, 0.0012), '#b8843a', TM(0.012, 0.0605, 0.0006)).add(G.box(0.012, 0.003, 0.0012), '#b8843a', TM(-0.012, 0.0605, 0.0006));
  // anel de vedação (gaxeta) no topo do castelo
  det.add(G.box(0.006, 0.006, 0.0012), '#1b1d20', TM(0.0115, 0.131, 0.0007)).add(G.box(0.006, 0.006, 0.0012), '#1b1d20', TM(-0.0115, 0.131, 0.0007));
  fc.add(det.mesh(vmat({ roughness: 0.5 })));
  // porca de fixação e arruela sob o tampo
  fc.add(L.mesh(G.cyl(0.03, 0.03, 0.014, 6), L.metal('#b9c1c8', { roughness: 0.3 }), 0, -0.052, 0));
  /* ---------- bica (cutPipe no plano z = 0 do corpo) ---------- */
  const spPts = [[0.017, 0.075], [0.06, 0.082], [0.11, 0.13], [0.16, 0.24], [0.22, 0.31], [0.29, 0.335], [0.345, 0.31], [0.35, 0.275]];
  const sp = L.cutPipe(spPts, { r: 0.013, wall: 0.004, mat: chrome, cutMat: brassCut, seg: 80, radial: 12, tension: 0.5 });
  // por dentro da bica: latão (troca a casca interna)
  sp.group.children[1].material = brass;
  fc.add(sp.group);
  const spW = sp.waterIn(1, '#bfe6fb', 0.85); spW.group.children.forEach((m) => { m.renderOrder = 2; });
  // arejador (rosqueado na ponta da bica): corpo + telas
  const AE = { x: 0.35, y: 0.27 };
  { const ap = [[0.0145, 0.0], [0.0165, 0.0], [0.0165, -0.022], [0.0145, -0.022]]; const g = revolve(ap, 24, 'back'); g.translate(AE.x, AE.y, 0); fc.add(L.mesh(g, chrome)); const c = revolveCaps(ap); c.translate(AE.x, AE.y, 0.0004); fc.add(L.mesh(c, brassCut, 0, 0, 0, { cast: false }));
    const scr = new Merge(); [-0.006, -0.012, -0.018].forEach((y, i) => { scr.add(G.cyl(0.0143, 0.0143, 0.0015, 20, false, Math.PI / 2, Math.PI), i === 1 ? '#7d868d' : '#aab3ba', TM(AE.x, AE.y + y, 0)); for (let k = -3; k <= 3; k++) scr.add(G.box(0.0006, 0.002, 0.026), '#5d666d', TM(AE.x + k * 0.004, AE.y + y, -0.0)); });
    fc.add(scr.mesh(vmat({ roughness: 0.4, metalness: 0.7 }))); }
  /* ---------- tampa (metade da frente, inteira no gancho) ---------- */
  const cover = new THREE.Group(); fc.add(cover);
  cover.add(L.mesh(revolve(outer, 36, 'front'), chromeCover));
  { const sc = L.cutPipe(spPts, { r: 0.0131, wall: 0.004, mat: chromeCover, cutMat: chromeCover, seg: 80, radial: 12, tension: 0.5 }); sc.group.scale.z = -1; sc.group.children.slice(1).forEach((c) => { c.visible = false; }); cover.add(sc.group);
    const ag = revolve([[0.0165, 0.0], [0.0165, -0.022]], 24, 'front'); ag.translate(AE.x, AE.y, 0); cover.add(L.mesh(ag, chromeCover)); }
  /* ---------- haste, carrapeta, vedante, volante ---------- */
  const stem = new THREE.Group(); fc.add(stem);
  { const sm = new Merge(); sm.add(G.cyl(0.0072, 0.0072, 0.1, 16), '#d7dde2', TM(0, 0.118, 0));
    for (let i = 0; i < 9; i++) sm.add(G.torus(0.0074, 0.0012, 4, 16), '#aeb6bd', TM(0, 0.097 + i * 0.0045, 0, Math.PI / 2, 0, 0.18));
    sm.add(G.cyl(0.015, 0.015, 0.006, 20), '#c79a3e', TM(0, 0.071, 0));          // carrapeta
    sm.add(G.cyl(0.0135, 0.014, 0.0055, 20), '#1b1d20', TM(0, 0.0655, 0));        // vedante (borracha)
    sm.add(G.cyl(0.003, 0.003, 0.006, 8), '#9aa3aa', TM(0, 0.062, 0));
    stem.add(sm.mesh(vmat({ roughness: 0.35, metalness: 0.6 }))); }
  const knob = new THREE.Group(); knob.position.y = 0.168; stem.add(knob);
  { const km = new Merge(); km.add(G.cyl(0.017, 0.02, 0.026, 20), '#eef2f5', TM(0, 0, 0)); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; km.add(G.rbox(0.05, 0.014, 0.016, 0.006), '#eef2f5', TM(Math.cos(a) * 0.033, 0.004, Math.sin(a) * 0.033, 0, -a, 0)); km.add(G.sph(0.011, 12, 8), '#eef2f5', TM(Math.cos(a) * 0.058, 0.006, Math.sin(a) * 0.058)); }
    knob.add(km.mesh(vmat({ roughness: 0.08, metalness: 1.0 })));
    knob.add(L.mesh(G.cyl(0.011, 0.011, 0.004, 20), L.glossy('#2f7fd6'), 0, 0.014, 0)); }
  /* ---------- água no corpo (faces) e partículas ---------- */
  const wMat = L.water('#bfe6fb', 0.8, { side: THREE.DoubleSide, depthWrite: false });
  const wBore = L.mesh(G.shape([[-0.0069, -0.075], [0.0069, -0.075], [0.0069, 0.0598], [-0.0069, 0.0598]]), wMat, 0, 0, 0.0009, { cast: false });
  const wCh = L.mesh(G.shape([[-0.0168, 0.0602], [0.0168, 0.0602], [0.0168, SP0], [0.03, SP0], [0.03, SP1], [0.0168, SP1], [0.0168, 0.094], [-0.0168, 0.094]]), wMat, 0, 0, 0.0009, { cast: false });
  wBore.renderOrder = wCh.renderOrder = 2; fc.add(wBore, wCh);
  const inPath = [[0, -0.07, -0.004], [0, 0.05, -0.004], [0.004, 0.064, -0.006], [0.013, 0.07, -0.006], [0.02, 0.075, -0.004], ...spPts.slice(1).map(([x, y]) => [x, y, -0.004]), [0.35, 0.25, 0]];
  const inFlow = new L.Flow(L.curve(inPath, false, 0.5), { n: 40, size: 0.0026, colors: ['#ffffff', '#e2f6ff'], jitter: [0.0025, 0.0025, 0.002], material: L.flat(0xffffff), seed: 12 });
  fc.add(inFlow.mesh);
  /* ---------- copo ---------- */
  const GL = { x: BX + AE.x, y: H.CU.bot + 0.001, z: FZ }, GH = 0.15, gr = (y) => 0.042 + 0.009 * (y / GH);
  const glass = new THREE.Group(); glass.position.set(GL.x, GL.y, GL.z); root.add(glass);
  const glassM = new THREE.MeshPhysicalMaterial({ color: '#eaf6fb', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05 });
  { const prof = [[0, 0.0], [gr(0) - 0.004, 0], [gr(0), 0.004], [gr(GH), GH], [gr(GH) - 0.003, GH], [gr(0.014) - 0.003, 0.014], [0, 0.014]];
    const gm = L.mesh(G.lathe(prof, 44), glassM, 0, 0, 0, { cast: false }); gm.renderOrder = 8; glass.add(gm);
    // facetas do "copo americano" (parte de baixo) e reflexos verticais
    const fac = new Merge(); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; fac.add(G.box(0.0012, 0.08, 0.004), '#ffffff', TM(Math.cos(a) * (gr(0.05) + 0.0006), 0.05, Math.sin(a) * (gr(0.05) + 0.0006), 0, -a, 0.0)); }
    const facM = L.mat('#ffffff', { transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false }); const fm = fac.mesh(facM); fm.renderOrder = 9; fm.castShadow = false; glass.add(fm);
    const hl = L.mesh(G.box(0.006, 0.11, 0.001), L.flat('#ffffff', { transparent: true, opacity: 0.55, depthWrite: false }), -gr(0.07) * 0.62, 0.075, gr(0.07) * 0.78, { cast: false }); hl.rotation.y = -0.9; hl.renderOrder = 9; glass.add(hl);
    const rim = L.mesh(G.torus(gr(GH) - 0.0015, 0.0016, 6, 44), L.mat('#ffffff', { transparent: true, opacity: 0.45, roughness: 0.05, depthWrite: false }), 0, GH, 0, { cast: false }); rim.rotation.x = Math.PI / 2; rim.renderOrder = 9; glass.add(rim); }
  // água do copo: lateral (lathe) + superfície ondulada (disco) + menisco
  const wGM = L.water('#9fd8f5', 0.7, { side: THREE.DoubleSide, depthWrite: false });
  const NS = 40, sideG = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.04, 0), new THREE.Vector2(0.045, 0.1)], NS);
  const side = L.mesh(sideG, wGM, 0, 0, 0, { cast: false }); side.renderOrder = 7; glass.add(side);
  const NR = 10, topG = new THREE.CircleGeometry(1, NS, 0, Math.PI * 2); { const pos = [], idx = []; for (let r = 0; r <= NR; r++) for (let s = 0; s <= NS; s++) { const a = s / NS * Math.PI * 2, rr = r / NR; pos.push(Math.cos(a) * rr, 0, Math.sin(a) * rr); } for (let r = 0; r < NR; r++) for (let s = 0; s < NS; s++) { const a = r * (NS + 1) + s, b = a + 1, c = a + NS + 1, d = c + 1; idx.push(a, c, b, b, c, d); } topG.setIndex(idx); topG.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); topG.deleteAttribute('uv'); topG.deleteAttribute('normal'); topG.computeVertexNormals(); }
  const top = L.mesh(topG, L.water('#b8e6fb', 0.72, { side: THREE.DoubleSide, depthWrite: false }), 0, 0, 0, { cast: false }); top.renderOrder = 7; glass.add(top);
  const men = L.mesh(G.torus(1, 0.0028, 6, 44), L.mat('#e6f7ff', { transparent: true, opacity: 0.6, roughness: 0.05, depthWrite: false }), 0, 0, 0, { cast: false }); men.rotation.x = Math.PI / 2; men.renderOrder = 8; glass.add(men);
  // bolhas e respingos
  const NB = 34, bub = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.mat('#ffffff', { transparent: true, opacity: 0.75, roughness: 0.1 }), NB); bub.frustumCulled = false; bub.renderOrder = 7; glass.add(bub);
  const NSp = 22, spl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.flat('#e6f7ff'), NSp); spl.frustumCulled = false; glass.add(spl);
  const bd = Array.from({ length: NB }, (_, i) => { const r = L.rng(300 + i); return { a: r() * 6.28, rr: r(), ph: r(), sp: 0.6 + r() * 0.9, s: 0.0015 + r() * 0.0028 }; });
  const sd = Array.from({ length: NSp }, (_, i) => { const r = L.rng(500 + i); return { a: r() * 6.28, v: 0.35 + r() * 0.5, up: 0.5 + r() * 0.8, ph: r(), s: 0.0018 + r() * 0.0025 }; });
  // jato aerado
  const jetG = new THREE.CylinderGeometry(0.0062, 0.0055, 1, 14, 1, true); jetG.translate(0, -0.5, 0);
  const jet = L.mesh(jetG, L.water('#e8f7ff', 0.78, { depthWrite: false }), BX + AE.x, DY + AE.y - 0.022, FZ, { cast: false }); jet.renderOrder = 6; root.add(jet);
  const jetF = new L.Flow(L.curve([[BX + AE.x, DY + AE.y - 0.022, FZ], [BX + AE.x, GL.y, FZ]]), { n: 26, size: 0.0022, colors: ['#ffffff'], jitter: [0.004, 0, 0.004], material: L.flat(0xffffff), seed: 3 }); root.add(jetF.mesh);
  L.shadows(root); [jet, top, side, men, bub, spl, jetF.mesh, inFlow.mesh].forEach((o) => { o.castShadow = false; });
  const _d = new THREE.Object3D();

  /* ---------- estado ---------- */
  const knobAngle = (t, S) => {
    // gancho: a mão termina de abrir (≈ 75°) entre 0 e 1 s; final: abre com S.run.faucet
    if (t < 7.05) return 1.6 + 1.3 * L.ease.out(L.clamp01(t / 1.0));
    return S.run.faucet * 2.9;
  };
  function update(t, S, supply) {
    const open = S.run.faucet, has = supply > 0.5;
    const ang = knobAngle(t, S); stem.rotation.y = -ang; stem.position.y = 0.0145 * open;
    // tampa: sai em 100,6–101,2 e volta em 106,9–107,5
    const cv = L.clamp01((t - 100.45) / 0.6) * (1 - L.clamp01((t - 106.9) / 0.6)), ce = L.ease.io(cv);
    cover.visible = ce < 0.995; cover.position.set(0, 0.05 * ce, 0.14 * ce); chromeCover.opacity = 1 - ce; chromeCover.depthWrite = ce < 0.5;
    const flowing = has ? L.clamp01((open - 0.08) / 0.4) : 0;
    wBore.visible = has; wCh.visible = has && open > 0.05; spW.group.visible = flowing > 0.02;
    inFlow.update(t, { speed: 1.4, amount: flowing * (ce > 0.3 ? 1 : 0) });
    // copo
    const lv = S.glass, yb = 0.014, yw = yb + (GH - yb - 0.004) * lv;
    const hasW = lv > 0.004;
    side.visible = top.visible = men.visible = hasW;
    if (hasW) {
      const pa = sideG.attributes.position, prof = [[0, yb], [gr(yb) - 0.0032, yb], [gr(yw) - 0.0032, yw]];
      for (let i = 0; i <= NS; i++) { const a = i / NS * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); for (let j = 0; j < 3; j++) pa.setXYZ(i * 3 + j, prof[j][0] * s, prof[j][1], prof[j][0] * c); }
      pa.needsUpdate = true; sideG.computeVertexNormals();
      const R0 = gr(yw) - 0.0032, tp = topG.attributes.position, amp = 0.0022 * flowing;
      for (let r = 0; r <= NR; r++) for (let s = 0; s <= NS; s++) { const i = r * (NS + 1) + s, a = s / NS * Math.PI * 2, rr = r / NR, d = rr * R0; const h = amp * Math.sin(d * 340 - t * 28) * Math.exp(-d * 22) + 0.0012 * rr * rr; tp.setXYZ(i, Math.cos(a) * d, yw + h, Math.sin(a) * d); }
      tp.needsUpdate = true; topG.computeVertexNormals();
      men.position.y = yw + 0.0008; men.scale.set(R0, R0, 1);
    }
    // jato
    const jl = DY + AE.y - 0.022 - (GL.y + yw);
    jet.visible = flowing > 0.02; jet.scale.set(0.5 + 0.5 * flowing, Math.max(0.01, jl), 0.5 + 0.5 * flowing);
    jetF.update(t, { speed: 2.4, amount: flowing, head: L.clamp01(jl / (DY + AE.y - 0.022 - GL.y)) });
    for (let i = 0; i < NB; i++) { const b = bd[i], u = (t * b.sp * 0.9 + b.ph) % 1, depth = (yw - yb) * (0.15 + 0.7 * b.rr); _d.position.set(Math.cos(b.a) * b.rr * 0.02 + Math.sin(t * 3 + i) * 0.002, yw - depth * (1 - u), Math.sin(b.a) * b.rr * 0.02); _d.scale.setScalar(hasW && flowing > 0.05 && yw - depth * (1 - u) > yb ? b.s * (0.5 + 0.5 * u) : 0); _d.updateMatrix(); bub.setMatrixAt(i, _d.matrix); }
    bub.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NSp; i++) { const d = sd[i], u = (t * 2.6 + d.ph) % 1; _d.position.set(Math.cos(d.a) * d.v * 0.05 * u, yw + d.up * 0.06 * u - 0.12 * u * u, Math.sin(d.a) * d.v * 0.05 * u); _d.scale.setScalar(flowing > 0.05 && hasW ? d.s * (1 - u) * flowing : 0); _d.updateMatrix(); spl.setMatrixAt(i, _d.matrix); }
    spl.instanceMatrix.needsUpdate = true;
    return { ang };
  }
  // ponto do volante no mundo (a mão segura aqui)
  const knobWorld = new THREE.Vector3(BX, DY + 0.168, FZ);
  return { root, update, knobWorld, stem };
}
