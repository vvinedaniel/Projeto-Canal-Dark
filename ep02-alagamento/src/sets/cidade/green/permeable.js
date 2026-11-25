// PAVIMENTO PERMEÁVEL (Lo.PERMEABLE, S.build.permeable):
//  1) estacionamento Lo.PARKING: faixa por faixa (5 faixas ao longo de x, de z0 para z1) — o módulo cidade esconde o
//     asfalto da faixa; aqui entram base de brita (espalhada pela mini-carregadeira), compactação (rolo) e blocos
//     vazados de concreto (concregrama) com grama nos furos; faixas de vagas com blocos brancos maciços.
//  2) trecho de calçada da frente (x −8,5..−5) EM CORTE na face z = ZF: bloco intertravado com juntas abertas,
//     areia de assentamento, brita graduada fina, brita de base; abaixo, o solo natural (terreno).
// Na tempestade com melhorias (S.permIn) a água atravessa as juntas e desce pela brita (gotas + setas verdes).
import { TM, G, Merge, vmat, instances, layerMat, sub } from './kit.js';
import { skidSteer, miniRoller } from './machines.js';

export const NSTRIP = 8; // = faixas do asfalto do módulo cidade (city/plaza.js: NS = 8 faixas ao longo de x)
/** janela da faixa i dentro de S.build.permeable: começa quando o módulo cidade esconde o asfalto da faixa (i/8 + 0,02) */
export const stripWin = (i) => { const a = i / NSTRIP + 0.02; return [a, Math.min(a + 0.2, 0.985)]; };
export const FRONT_WIN = [0.08, 0.62];
const SP = { gravel: [0, 0.35], roll: [0.3, 0.55], blocks: [0.4, 0.9], grass: [0.7, 1.0] };

export function buildPermeable(ctx, xr) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const { PAL, clamp01, ease, lerp } = L;
  const root = L.group(scene); root.name = 'green-permeable';
  const Pk = Lo.PARKING, Gf = (x, z) => Lo.G(x, z); // mesma cota do asfalto do módulo cidade
  const M = {
    gravel: layerMat('gravel'), brita: layerMat('brita'), base: layerMat('brita', { color: '#c9c6bd' }), sand: layerMat('sand'),
    block: L.mat('#b8b3a8', { roughness: 0.82 }), white: L.mat('#eceae4', { roughness: 0.8 }), edge: L.mat('#a9a69e', { roughness: 0.85, flatShading: true }),
    grass: L.mat('#62c246', { roughness: 0.9 }), walk: L.mat(PAL.sidewalk, { roughness: 0.9 }), paver: L.mat('#b07a5a', { roughness: 0.8 }), paver2: L.mat('#9c6a4d', { roughness: 0.8 })
  };
  xr.add(...Object.values(M));

  /* ================= estacionamento ================= */
  const BS = 0.7, PITCH = 0.72, BT = 0.09, BASE = 0.045; // bloco 70×70 cm, 10 cm; base de brita 6 cm (espessuras exageradas p/ leitura)
  const SW = (Pk.x1 - Pk.x0) / NSTRIP, sx = (i) => [Pk.x0 + i * SW, Pk.x0 + (i + 1) * SW], stripOf = (x) => Math.min(NSTRIP - 1, Math.max(0, Math.floor((x - Pk.x0) / SW)));
  const XL = 5.1;                                   // a leste de XL fica o canteiro gramado (arbustos e poste do módulo cidade)
  const ncol = Math.floor((XL - Pk.x0 - 0.1) / PITCH), nrow = Math.floor((Pk.z1 - Pk.z0 - 0.2) / PITCH);
  const ox = Pk.x0 + 0.1 + PITCH / 2, oz = (Pk.z0 + Pk.z1) / 2 - ((nrow - 1) * PITCH) / 2;
  // bloco vazado: quadrado com 4 furos
  const h4 = []; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const c = [a * 0.17, b * 0.17], r = 0.1; h4.push([[c[0] - r, c[1] - r], [c[0] + r, c[1] - r], [c[0] + r, c[1] + r], [c[0] - r, c[1] + r]].reverse()); });
  const sq = [[-BS / 2, -BS / 2], [BS / 2, -BS / 2], [BS / 2, BS / 2], [-BS / 2, BS / 2]];
  const gHole = G.extrude(sq, BT, h4).rotateX(-Math.PI / 2), gSolid = G.rbox(BS, BT, BS, 0.015, 1).translate(0, BT / 2, 0);
  const plug = new Merge(); [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => plug.add(G.box(0.19, 1, 0.19), '#ffffff', TM(a * 0.17, 0.5, b * 0.17)));
  // divisórias das vagas em blocos maciços brancos, nas mesmas linhas das vagas pintadas do módulo cidade (z0 + 0,4 + 2,5k, x < 2)
  const whiteRows = new Set([0, 1, 2, 3, 4].map((k) => Math.min(nrow - 1, Math.max(0, Math.round((Pk.z0 + 0.4 + 2.5 * k - oz) / PITCH)))));
  const blocks = [], whites = [];
  for (let r = 0; r < nrow; r++) for (let c = 0; c < ncol; c++) {
    const x = ox + c * PITCH, z = oz + r * PITCH, strip = stripOf(x);
    const isWhite = x < 2.0 && whiteRows.has(r);
    const e = 0.05, dx = (Gf(x + e, z) - Gf(x - e, z)) / (2 * e), dz = (Gf(x, z + e) - Gf(x, z - e)) / (2 * e);
    const it = { x, z, y: Gf(x, z) + BASE, strip, col: c, rx: -Math.atan(dz), rz: Math.atan(dx), k: ((Pk.z1 - z) / (Pk.z1 - Pk.z0)) * 0.9 + ((c * 7) % 3) * 0.03 };
    (isWhite ? whites : blocks).push(it);
  }
  const imB = instances(gHole, M.block, blocks.length), imW = instances(gSolid, M.white, whites.length), imP = instances(plug.geo(), M.grass, blocks.length, { cast: false });
  root.add(imB, imW, imP);
  /** malha colada ao chão no retângulo dado */
  const drape = (x0, x1, z0, z1, dy, mat) => {
    const nx = Math.max(2, Math.ceil((x1 - x0) / 0.4)), nz = Math.max(2, Math.ceil((z1 - z0) / 0.4)), pos = [], idx = [], uv = [];
    for (let a = 0; a <= nz; a++) for (let b = 0; b <= nx; b++) { const x = lerp(x0, x1, b / nx), z = lerp(z0, z1, a / nz); pos.push(x, Gf(x, z) + dy, z); uv.push(x, z); }
    for (let a = 0; a < nz; a++) for (let b = 0; b < nx; b++) { const p = a * (nx + 1) + b; idx.push(p, p + nx + 1, p + 1, p + 1, p + nx + 1, p + nx + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    return L.mesh(geo, mat, 0, 0, 0, { cast: false });
  };
  // por faixa: subleito de terra (aparece quando o asfalto sai) e base de brita espalhada de z1 para z0
  const soilM = layerMat('soil', { color: '#d8b48a' }); xr.add(soilM);
  const lawnM = layerMat('lawn', { color: '#ffffff' }); xr.add(lawnM);
  const strips = [];
  for (let i = 0; i < NSTRIP; i++) {
    const [x0, x1] = sx(i), lawn = i === NSTRIP - 1;
    const pl = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), gm = (lawn ? lawnM : M.base).clone(); gm.clippingPlanes = [pl]; gm.userData.op0 = 1; xr.add(gm);
    const soil = drape(x0 + 0.01, x1 - 0.01, Pk.z0 + 0.08, Pk.z1 - 0.08, 0.012, soilM), mesh = drape(x0 + 0.005, x1 - 0.005, Pk.z0 + 0.1, Pk.z1 - 0.1, lawn ? 0.03 : BASE - 0.004, gm);
    const edge = L.mesh(new THREE.BoxGeometry(1, 1, 1), gm, 0, 0, 0, { cast: false });
    root.add(soil, mesh, edge);
    strips.push({ x0, x1, soil, mesh, pl, edge, lawn });
  }
  { const [x0] = sx(NSTRIP - 1); strips[NSTRIP - 2].lawnPart = drape(XL - 0.05, x0, Pk.z0 + 0.1, Pk.z1 - 0.1, 0.03, lawnM); root.add(strips[NSTRIP - 2].lawnPart); }
  // contenção lateral (meio-fio de concreto em volta do estacionamento)
  const edgeRing = (pts) => { // meio-fio contínuo acompanhando o chão
    const rings = [];
    for (let i = 0; i < pts.length - 1; i++) { const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.3);
      for (let k = i ? 1 : 0; k <= n; k++) { const x = lerp(x0, x1, k / n), z = lerp(z0, z1, k / n), y = Gf(x, z), w = 0.07, ax = z1 - z0 ? 1 : 0, az = 1 - ax;
        rings.push([new THREE.Vector3(x - ax * w, y - 0.12, z - az * w), new THREE.Vector3(x - ax * w, y + BASE + BT + 0.02, z - az * w), new THREE.Vector3(x + ax * w, y + BASE + BT + 0.02, z + az * w), new THREE.Vector3(x + ax * w, y - 0.12, z + az * w)]); } }
    return L.loft(rings, M.edge, { closed: true });
  };
  const e0 = 0.07, edges = new THREE.Group();
  edges.add(edgeRing([[Pk.x0 + e0, Pk.z0 + e0], [Pk.x1 - e0, Pk.z0 + e0]]), edgeRing([[Pk.x0 + e0, Pk.z1 - e0], [Pk.x1 - e0, Pk.z1 - e0]]), edgeRing([[Pk.x0 + e0, Pk.z0 + e0], [Pk.x0 + e0, Pk.z1 - e0]]), edgeRing([[Pk.x1 - e0, Pk.z0 + e0], [Pk.x1 - e0, Pk.z1 - e0]]));
  edges.children.forEach((m) => { m.material.side = THREE.DoubleSide; });
  root.add(edges);
  // máquinas
  const loader = skidSteer(L), roller = miniRoller(L);
  root.add(loader.group, roller.group);
  // água: setas verdes descendo para dentro do pavimento + gotas passando pelos furos
  const lanes = [];
  [[0.2, 0.25], [0.5, 0.25], [0.8, 0.25], [0.2, 0.7], [0.5, 0.7], [0.8, 0.7]].forEach(([u, v], i) => {
    const x = lerp(Pk.x0 + 1, Pk.x1 - 1, u), z = lerp(Pk.z0 + 1, Pk.z1 - 1, v), y = Gf(x, z) + BASE + BT;
    const ch = new L.Chevrons(L.curve([[x, y + 1.6, z], [x, y + 0.8, z], [x, y - 0.25, z]]), { n: 3, size: 0.32, color: PAL.good, normal: [0.55, 0, 0.83] });
    root.add(ch.mesh); lanes.push(ch);
  });
  const nd = 160, rdd = L.rng(77), dropI = instances(new THREE.SphereGeometry(1, 6, 4), L.mat('#9fd6f0', { roughness: 0.2 }), nd, { cast: false });
  const drops = []; for (let i = 0; i < nd; i++) { const b = blocks[Math.floor(rdd() * blocks.length)], hx = (rdd() < 0.5 ? -1 : 1) * 0.17, hz = (rdd() < 0.5 ? -1 : 1) * 0.17; drops.push({ x: b.x + hx, z: b.z + hz, y: b.y, ph: rdd(), rate: 0.7 + rdd() * 0.6 }); }
  root.add(dropI);

  /* ================= calçada da frente em corte ================= */
  const FW = Lo.PERMEABLE.find((p) => p.front), ZF = Lo.ZF, curbH = Lo.STREET_A.curbH;
  const ys = (x) => (shared.walkY ? shared.walkY(x, 24.7) : Lo.streetY(x) + curbH);
  const fw = L.group(root);
  const band = (a, b, dTop, dBot, z0, z1, mat) => {
    const n = Math.max(2, Math.ceil((b - a) / 0.25)), top = [], bot = [];
    for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; top.push([x, ys(x) - dTop]); bot.push([x, ys(x) - dBot]); }
    const geo = G.extrude([...top, ...bot.reverse()], z1 - z0); geo.translate(0, 0, z0); return L.mesh(geo, mat);
  };
  const fillPlane = (a, b, dBot) => { const s = (ys(b) - ys(a)) / (b - a), n = new THREE.Vector3(s, -1, 0).normalize(), pl = new THREE.Plane(); return { pl, set: (h) => pl.setFromNormalAndCoplanarPoint(n, new THREE.Vector3(a, ys(a) - dBot + h, 0)) }; };
  const ea = FW.x0 + 0.1, eb = FW.x1 - 0.1, zA = FW.z0, zB = ZF - 0.002;
  const D = { paver: 0.12, sand: 0.18, fine: 0.33, base: 0.55 };
  const fLayers = [['base', D.fine, D.base, M.gravel, [0.14, 0.32]], ['fine', D.sand, D.fine, M.brita, [0.3, 0.44]], ['sand', D.paver, D.sand, M.sand, [0.42, 0.54]], ['joint', 0.016, D.paver, M.brita, [0.86, 1.0]]].map(([id, dt, db, m, ph]) => {
    const fp = fillPlane(ea, eb, db), cm = m.clone(); cm.clippingPlanes = [fp.pl]; cm.userData.op0 = 1; xr.add(cm);
    const mesh = band(ea, eb, dt, db, zA, id === 'joint' ? zB - 0.012 : zB, cm); fw.add(mesh); return { id, mesh, fp, th: db - dt, ph };
  });
  const fEdges = L.group(fw); fEdges.add(band(FW.x0, ea, 0, D.fine, zA - 0.4, zB, M.edge), band(eb, FW.x1, 0, D.fine, zA - 0.4, zB, M.edge));
  // tampa de calçada antiga (serrada e retirada)
  const oldSlabs = [0, 1, 2].map((i) => { const a = FW.x0 + ((FW.x1 - FW.x0) * i) / 3, b = FW.x0 + ((FW.x1 - FW.x0) * (i + 1)) / 3; const m = band(a, b, -0.003, curbH, FW.z0, ZF, M.walk); const piv = new THREE.Vector3((a + b) / 2, ys((a + b) / 2), (FW.z0 + ZF) / 2); m.geometry.translate(-piv.x, -piv.y, -piv.z); m.position.copy(piv); fw.add(m); return { m, piv, k: i / 3 }; });
  // blocos intertravados 24×12 cm, juntas abertas de 2,5 cm, amarração em espinha simples (fiadas alternadas)
  const PW = 0.24, PD = 0.12, J = 0.025, pav = [];
  for (let r = 0, z = zA + J / 2; z < zB - 0.02; r++, z += PD + J) {
    const d = Math.min(PD, zB + 0.0015 - z);
    for (let x = ea + J / 2 + (r % 2) * ((PW + J) / 2) - (r % 2 ? PW + J : 0); x < eb - 0.02; x += PW + J) {
      const xa = Math.max(ea + J / 2, x), xb = Math.min(eb - J / 2, x + PW);
      if (xb - xa < 0.04) continue;
      pav.push({ x: (xa + xb) / 2, z: z + d / 2, w: xb - xa, d, y: ys((xa + xb) / 2) - D.paver, k: ((xa - ea) / (eb - ea)) * 0.8 + (r % 3) * 0.06, c: (r * 7 + Math.round(x * 13)) % 5 === 0 });
    }
  }
  const pavGeo = G.rbox(1, 1, 1, 0.08, 1).translate(0, 0.5, 0);
  const imPa = instances(pavGeo, M.paver, pav.filter((p) => !p.c).length), imPb = instances(pavGeo, M.paver2, pav.filter((p) => p.c).length);
  fw.add(imPa, imPb);
  // água no corte: gotas descendo pelas juntas e setas verdes até o solo
  const fArrows = [], fDrops = [];
  for (let i = 0; i < 4; i++) {
    const x = lerp(ea + 0.35, eb - 0.35, i / 3), y0 = ys(x) + 0.05;
    const crv = L.curve([[x, y0, ZF + 0.012], [x + 0.03, y0 - 0.45, ZF + 0.012], [x - 0.02, y0 - 0.9, ZF + 0.012], [x, y0 - 1.25, ZF + 0.012]]);
    const ch = new L.Chevrons(crv, { n: 4, size: 0.1, color: PAL.good, normal: [0, 0, 1] }); fw.add(ch.mesh); fArrows.push(ch);
    const dr = new L.Flow(crv, { n: 12, size: 0.026, jitter: [0.3, 0, 0], material: L.mat('#9fd6f0', { roughness: 0.2 }), color: '#ffffff', seed: 90 + i });
    fw.add(dr.mesh); fDrops.push(dr);
  }
  L.shadows(root); dropI.castShadow = false; imP.castShadow = false;
  shared.greenPermeable = { strips: Array.from({ length: NSTRIP }, (_, i) => ({ x0: sx(i)[0], x1: sx(i)[1], z0: Pk.z0, z1: Pk.z1, win: stripWin(i) })), frontWin: FRONT_WIN };

  /* ---------- trajetos das máquinas (função pura de P): andam ao longo de z, de z1 (rua B) para z0, de ré entre faixas ---------- */
  const xc = (i) => (sx(i)[0] + sx(i)[1]) / 2, ZA = Pk.z1 - 1.2, ZB = Pk.z0 + 1.3, HD = Math.PI / 2; // HD: de frente para −z
  function machinePose(P, ph) {
    for (let i = 0; i < NSTRIP; i++) {
      const [a, b] = stripWin(i), w0 = a + (b - a) * ph[0], w1 = a + (b - a) * ph[1];
      if (P < w0) {
        if (i === 0) return { x: xc(0), z: ZA, h: HD, k: 0, move: 0 };
        const [pa, pb] = stripWin(i - 1), e = pa + (pb - pa) * ph[1], u = ease.io(clamp01((P - e) / Math.max(1e-3, w0 - e)));
        return { x: lerp(xc(i - 1), xc(i), ease.io(clamp01(u * 1.4 - 0.2))), z: lerp(ZB, ZA, u), h: HD + 0.25 * Math.sin(Math.PI * u), k: 0, move: 1 };
      }
      if (P <= w1) { const u = (P - w0) / (w1 - w0); return { x: xc(i), z: lerp(ZA, ZB, u), h: HD, k: u, move: 1, strip: i }; }
    }
    const [pa, pb] = stripWin(NSTRIP - 1), e = pa + (pb - pa) * ph[1], u = clamp01((P - e) / Math.max(1e-3, 0.999 - e));
    return { x: lerp(xc(NSTRIP - 1), 3.5, ease.io(u)), z: lerp(ZB, Pk.z1 + 2.6, ease.io(u)), h: HD, k: 0, move: 1, gone: P >= 0.999 };
  }
  const placeMachine = (grp, x, z, h, lift = 0) => {
    const e = 0.4, y = Math.max(Gf(x, z), Gf(x + e, z), Gf(x - e, z)) + lift;
    const dx = (Gf(x + e, z) - Gf(x - e, z)) / (2 * e), dz = (Gf(x, z + e) - Gf(x, z - e)) / (2 * e);
    grp.position.set(x, y, z); grp.rotation.set(0, h, 0); grp.rotateZ(Math.atan(dx * Math.cos(h) - dz * Math.sin(h)) * 0.8); grp.rotateX(Math.atan(dz * Math.cos(h) + dx * Math.sin(h)) * 0.8);
  };

  function update(t, S) {
    const P = S.build.permeable, pin = S.permIn || 0;
    root.visible = true;
    /* --- faixas do estacionamento --- */
    const sw = Array.from({ length: NSTRIP }, (_, i) => sub(P, ...stripWin(i)));
    strips.forEach((st, i) => {
      const w = sw[i], gk = st.lawn ? sub(w, ...SP.grass) : sub(w, ...SP.gravel), zf = lerp(Pk.z1, Pk.z0, gk);
      st.soil.visible = w > 0; st.mesh.visible = gk > 0.001;
      st.pl.set(new THREE.Vector3(0, 0, 1), -(gk >= 1 ? Pk.z0 - 5 : zf)); // mantém z > zf
      const xm = (st.x0 + st.x1) / 2, ye = Gf(xm, zf);
      st.edge.position.set(xm, ye + BASE / 2, zf - 0.02); st.edge.scale.set(st.x1 - st.x0 - 0.01, st.lawn ? 0.03 : BASE, 0.04); st.edge.visible = gk > 0.001 && gk < 0.999;
      if (st.lawnPart) st.lawnPart.visible = sub(sw[NSTRIP - 1], ...SP.grass) > 0.5;
    });
    let ib = 0, ip = 0, iw = 0;
    const put = (it, im, i, isPlug) => {
      const w = sw[it.strip], bk = sub(w, ...SP.blocks), k = ease.out(sub(bk, it.k * 0.75, it.k * 0.75 + 0.25)), drop = (1 - k) * 0.9;
      if (!isPlug) im.set(i, it.x, it.y + drop, it.z, 0, k > 0 ? 1 : 0, k > 0 ? 1 : 0, k > 0 ? 1 : 0, it.rx, it.rz);
      else { const gg = sub(w, ...SP.grass) * (k >= 1 ? 1 : 0); im.set(i, it.x, it.y + 0.005, it.z, 0, gg > 0 ? 1 : 0, (BT + 0.012) * Math.max(0.02, ease.out(gg)), gg > 0 ? 1 : 0, it.rx, it.rz); }
    };
    blocks.forEach((it) => { put(it, imB, ib++, false); put(it, imP, ip++, true); });
    whites.forEach((it) => put(it, imW, iw++, false));
    imB.done(); imP.done(); imW.done();
    edges.visible = P > 0.02; edges.position.y = (1 - ease.out(sub(P, 0.02, 0.1))) * -0.3;
    /* --- máquinas --- */
    const lp = machinePose(P, SP.gravel), rp = machinePose(P, SP.roll);
    loader.group.visible = P > 0 && !lp.gone; roller.group.visible = P > 0.08 && !rp.gone && P < 0.999;
    if (loader.group.visible) {
      placeMachine(loader.group, lp.x, lp.z, lp.h);
      const dump = lp.k > 0 ? 1 : 0; loader.pose(dump ? 0.08 + 0.04 * Math.sin(t * 9) : 0.35, dump ? -0.55 : 0.15, dump ? 1 - lp.k * 0.8 : 1 - 0.2 * (lp.move || 0));
    }
    if (roller.group.visible) { placeMachine(roller.group, rp.x, rp.z, rp.h, BASE * (rp.k > 0 ? 1 : 0)); roller.group.position.y += 0.004 * Math.sin(t * 60); roller.roll((rp.z - ZA) / 0.36); }
    /* --- água atravessando o estacionamento --- */
    lanes.forEach((ch, i) => ch.update(t + i * 0.41, { speed: 0.42, amount: pin, size: 0.32 }));
    for (let i = 0; i < nd; i++) { const q = drops[i], u = L.fract(q.ph + t * q.rate), s = pin > 0.02 ? 0.03 * pin : 0; dropI.set(i, q.x, q.y + BT + 0.12 - u * (BT + 0.17), q.z, 0, s, s * 1.6, s); }
    dropI.done(); dropI.visible = pin > 0.02;

    /* --- calçada da frente em corte --- */
    const f = sub(P, ...FRONT_WIN);
    fw.visible = (S.build.walks ?? 1) > 0.6;
    oldSlabs.forEach((sl) => { const k = ease.in(sub(f, 0.02 + sl.k * 0.05, 0.16)); sl.m.visible = k < 0.98; sl.m.position.set(sl.piv.x, sl.piv.y + k * 1.7, sl.piv.z - k * 1.6); sl.m.rotation.set(k * 0.8, 0, (sl.k - 0.4) * k); sl.m.scale.setScalar(1 - k * 0.9); });
    fLayers.forEach((ly) => { const k = sub(f, ...ly.ph); ly.mesh.visible = k > 0.001; ly.fp.set(k >= 1 ? 50 : ly.th * k + 0.001); });
    const ek = ease.out(sub(f, 0.1, 0.2)); fEdges.visible = ek > 0.001; fEdges.position.y = (1 - ek) * -0.6;
    let ia = 0, ib2 = 0;
    pav.forEach((p) => { const k = ease.out(sub(f, 0.52 + p.k * 0.38, 0.52 + p.k * 0.38 + 0.1)), im = p.c ? imPb : imPa, i = p.c ? ib2++ : ia++; const on = k > 0 ? 1 : 0; im.set(i, p.x, p.y + (1 - k) * 0.22, p.z, 0, on * p.w, on * (D.paver - 0.004), on * p.d); });
    imPa.done(); imPb.done();
    fArrows.forEach((ch, i) => ch.update(t + i * 0.3, { speed: 0.34, amount: pin, size: 0.1 }));
    fDrops.forEach((dr, i) => { dr.update(t + i * 0.47, { speed: 0.3, amount: pin > 0.02 ? 1 : 0, head: 0.95 }); dr.mesh.visible = pin > 0.02; });
  }
  return { update, root };
}
