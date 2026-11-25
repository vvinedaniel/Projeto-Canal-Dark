// Chegada do esgoto: tubo em corte, canal de entrada, gradeamento mecanizado e caixa de areia.
import { makeTrash } from './trash.js';
export function buildHeadworks(L, K, scene, pop) {
  const { THREE, PAL, TAU } = L, { M, bx, jbox, sec, rect, rod, rods, Rails } = K;
  const T = makeTrash(L, K), g = L.group(scene), DS = THREE.DoubleSide;
  const sewMat = L.water(PAL.sewage, 1, { roughness: 0.16 }), sewFace = L.mat(PAL.sewage, { roughness: 0.3, side: DS });
  const WL1 = -1.8, WL2 = -2.0; // nível antes / depois da grade

  /* ---------- tubo que chega ---------- */
  const pipeMat = L.mat('#aab2b9', { roughness: 0.9, side: DS });
  const sewer = L.cutPipe([[-52, -2.1], [-36.004, -2.1]], { r: 1.0, wall: 0.14, mat: pipeMat, seg: 30, radial: 18 });
  g.add(sewer.group); sewer.waterIn(0.675, PAL.sewage, 1);
  { // trecho inteiro, fora do bloco, vindo do escuro
    const st = L.cyl(1, 1, 34, L.mat('#aab2b9', { roughness: 0.9 }), -69, -2.1, 0, 36); st.rotation.z = Math.PI / 2; g.add(st);
    for (let x = -54.5; x > -86; x -= 3) { const c = L.cyl(1.09, 1.09, 0.4, M.concreteDark, x, -2.1, 0, 36); c.rotation.z = Math.PI / 2; g.add(c); }
  }
  { // boca do tubo na face lateral do bloco
    const end = L.group(g, -51.97, -2.1, 0); end.rotation.y = Math.PI / 2;
    end.add(L.mesh(new THREE.CircleGeometry(0.87, 40), L.flat('#1a2026'), 0, 0, 0.002, { cast: false }), L.mesh(new THREE.RingGeometry(0.86, 1.0, 40), M.cut, 0, 0, 0.004, { cast: false }));
    const pts = []; for (let i = 0; i <= 24; i++) { const a = Math.PI - 0.36 + ((Math.PI + 0.72) * i) / 24; pts.push([0.86 * Math.cos(a), 0.86 * Math.sin(a)]); }
    end.add(sec(pts, sewFace, 0.003));
  }
  const S1 = L.soilWall({ x0: -52, x1: -36, y0: -12, y1: 0, z: 0, depth: 54, pipes: [sewer], seed: 3 });
  const chanPoly = [[-36, -3.4], [-19.5, -3.4], [-19.5, -4.3], [-2, -4.3], [-2, 0.5], [-36, 0.5]];
  const S23 = L.soilWall({ x0: -36, x1: -2, y0: -12, y1: 0, z: 0, depth: 54, holes: [chanPoly], seed: 5, bands: [0, 0.655, 6.84, 12] });
  g.add(S1, S23);

  /* ---------- concreto do canal ---------- */
  g.add(jbox(-36, -19.5, -3.4, -3.0, -2.95, 0, M.concreteJ), jbox(-36, -19.5, -3.0, 0.25, -2.95, -2.6, M.concreteJ));
  { // parede de montante com o furo do tubo
    const pts = [[2.6, -3], [2.6, 0.25], [0, 0.25], [0, -1.1]];
    for (let i = 1; i <= 16; i++) { const a = Math.PI / 2 - (i / 16) * (Math.PI / 2 + 1.12); pts.push([Math.cos(a), -2.1 + Math.sin(a)]); }
    const w = L.extrude(pts, 0.4, M.concreteJ); w.rotation.y = Math.PI / 2; w.position.set(-36, 0, 0); g.add(w);
  }
  { // caixa de areia: seção transversal (u = distância para trás do plano de corte) extrudada ao longo de x
    const pts = [[0, -4.3], [4.55, -4.3], [4.55, 0.25], [4.2, 0.25], [4.2, -2.7], [1.15, -3.45]];
    for (let i = 1; i <= 10; i++) { const a = -(i / 10) * (Math.PI / 2); pts.push([0.6 + 0.55 * Math.cos(a), -3.45 + 0.55 * Math.sin(a)]); }
    pts.push([0, -4.0]);
    const w = L.extrude(pts, 17.5, M.concreteJ); w.rotation.y = Math.PI / 2; w.position.set(-19.5, 0, 0); g.add(w);
  }
  g.add(jbox(-19.5, -19.1, -3.6, 0.25, -4.2, -2.6, M.concreteJ), jbox(-19.5, -19.1, -4.0, -3.0, -2.6, 0, M.concreteJ));
  g.add(jbox(-2.4, -2, -4.0, 0.25, -4.2, -1.3, M.concreteJ), jbox(-2.4, -2, -4.0, -2.95, -1.3, 0, M.concreteJ), jbox(-2.4, -2, -1.65, 0.25, -1.3, 0, M.concreteJ));
  // faces de corte
  [rect(-36, -1.1, -35.6, 0.25), rect(-36, -3.4, -19.5, -3.0), rect(-19.5, -4.3, -2, -4.0), rect(-19.5, -4.0, -19.1, -3.0), rect(-2.4, -4.0, -2, -2.95), rect(-2.4, -1.65, -2, 0.25)].forEach((p) => g.add(sec(p)));
  // juntas (escondem a emenda entre trechos de solo)
  [rect(-36.07, -3.13, -35.93, -2.94), rect(-36.07, -1.26, -35.93, -1.07), rect(-2.07, -3.0, -1.93, -2.83), rect(-2.07, -1.77, -1.93, -1.6)].forEach((p) => g.add(sec(p, M.dark, 0.006)));
  g.add(sec(rect(-36.03, -2.96, -35.9, WL1), sewFace, 0.003), sec(rect(-36.008, WL1, -35.992, -1.25), pipeMat, 0.003));
  // pátio de concreto
  [[-37.5, -19.5, -12, -2.95], [-19.5, -0.8, -12, -4.55], [-37.5, -36, -2.95, 0], [-2, -0.8, -4.55, 0]].forEach((q) => g.add(jbox(q[0], q[1], 0, 0.25, q[2], q[3], M.sidewalkJ)));

  /* ---------- água ---------- */
  const wUp = L.extrude([[-36.02, -3.0], [-29.2, -3.0], [-28.88, WL1], [-36.02, WL1]], 2.57, sewMat); wUp.position.z = -2.6; wUp.castShadow = false;
  const wDn = L.extrude([[-29.2, -3.0], [-19.5, -3.0], [-19.5, WL2], [-28.93, WL2]], 2.57, sewMat); wDn.position.z = -2.6; wDn.castShadow = false;
  g.add(wUp, wDn);
  const gritCol = '#7d5a36';
  const gritFaceMat = L.water(gritCol, 0.74, { depthWrite: false, side: DS }), gritTopMat = L.water(gritCol, 0.93, { depthWrite: false });
  const gf = sec(rect(-19.5, -4.0, -2.4, WL2), gritFaceMat, -0.01); gf.renderOrder = 6; g.add(gf);
  const gf2 = sec(rect(-2.4, -2.95, -1.97, WL2), gritFaceMat, -0.01); gf2.renderOrder = 6; g.add(gf2);
  const gt = L.mesh(new THREE.PlaneGeometry(17.1, 4.2), gritTopMat, -10.95, WL2, -2.1, { cast: false }); gt.rotation.x = -Math.PI / 2; gt.renderOrder = 5; g.add(gt);

  /* ---------- grade de barras mecanizada ---------- */
  const SB = [-29.2, -3.0], A15 = Math.PI / 12, c15 = Math.cos(A15), s15 = Math.sin(A15);
  const rw = (lx, ly, lz = 0) => new THREE.Vector3(SB[0] + lx * c15 + ly * s15, SB[1] - lx * s15 + ly * c15, lz);
  const rack = L.group(g, SB[0], SB[1], 0); rack.rotation.z = -A15;
  const barMat = L.metal('#7d8a94', { roughness: 0.45, metalness: 0.7 });
  rack.add(L.scatter(new THREE.BoxGeometry(0.075, 4.1, 0.04), barMat, 21, (i, r, d) => { d.position.set(0, 2.05, -0.022 - i * 0.1275); }));
  [1.4, 3.1, 4.05].forEach((y) => rack.add(L.box(0.07, 0.09, 2.6, barMat, 0.075, y, -1.3)));
  rack.add(L.box(0.05, 2.6, 2.56, M.steel, 0, 5.4, -1.3));                       // chapa cega acima das barras
  rack.add(L.box(1.1, 7.3, 0.09, M.blue, 0.1, 3.75, -2.6));                      // lateral do chassi (a outra foi removida pelo corte)
  rack.add(L.box(1.5, 1.9, 0.1, M.blue, 0.2, 6.75, -2.6));
  rack.add(L.box(0.16, 0.16, 2.7, M.blue, -0.5, 7.5, -1.3), L.box(0.16, 0.16, 2.7, M.blue, 0.85, 7.5, -1.3), L.box(1.5, 0.08, 0.16, M.blue, 0.18, 7.5, -0.08));
  // eixo, engrenagens, motor
  const LOOP = { xu: -0.3, xd: 0.5, cx: 0.1, r: 0.4, y0: 0.5, y1: 6.6 }; LOOP.Ls = LOOP.y1 - LOOP.y0; LOOP.arc = Math.PI * LOOP.r; LOOP.P = 2 * LOOP.Ls + 2 * LOOP.arc;
  const loopAt = (s, o) => {
    const { xu, xd, cx, r, y0, y1, Ls, arc, P } = LOOP; s = ((s % P) + P) % P;
    if (s < Ls) { o.x = xu; o.y = y0 + s; o.a = Math.PI / 2; }
    else if (s < Ls + arc) { const a = Math.PI - (s - Ls) / r; o.x = cx + r * Math.cos(a); o.y = y1 + r * Math.sin(a); o.a = a - Math.PI / 2; }
    else if (s < 2 * Ls + arc) { o.x = xd; o.y = y1 - (s - Ls - arc); o.a = -Math.PI / 2; }
    else { const a = -(s - 2 * Ls - arc) / r; o.x = cx + r * Math.cos(a); o.y = y0 + r * Math.sin(a); o.a = a - Math.PI / 2; }
    return o;
  };
  const gearGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.07, 12); gearGeo.rotateX(Math.PI / 2);
  const gearMat = L.metal('#5c6770', { roughness: 0.5, flatShading: true });
  const gears = [];
  [LOOP.y0, LOOP.y1].forEach((y) => { const sh = L.cyl(0.07, 0.07, 2.75, M.steel, LOOP.cx, y, -1.3, 12); sh.rotation.x = Math.PI / 2; rack.add(sh); [-0.1, -2.5].forEach((z) => { const gm = L.mesh(gearGeo, gearMat, LOOP.cx, y, z); rack.add(gm); gears.push(gm); }); });
  { const gb = L.rbox(0.6, 0.6, 0.45, 0.06, M.green, LOOP.cx, LOOP.y1, -2.9); rack.add(gb); const mo = K.motor(0.24, 0.8, M.blue); mo.position.set(LOOP.cx, LOOP.y1 + 0.3, -2.9); rack.add(mo); }
  rack.add(L.box(0.12, 0.3, 0.3, M.iron, LOOP.cx, LOOP.y1, -0.02));
  const NL = 64, links = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.06, 0.035), L.metal('#3d464e', { roughness: 0.5 }), NL * 2);
  links.castShadow = true; links.frustumCulled = false; rack.add(links);
  const rakes = [], NR = 4, rakeMat = L.mat(PAL.yellow, { roughness: 0.45, metalness: 0.3 });
  for (let i = 0; i < NR; i++) {
    const r = L.group(rack); r.add(L.box(0.1, 0.12, 2.5, rakeMat, 0, 0, -1.3));
    const pl = L.box(0.32, 0.04, 2.44, rakeMat, 0.17, 0.02, -1.3); pl.rotation.z = 0.12; r.add(pl);
    r.add(L.scatter(new THREE.BoxGeometry(0.1, 0.1, 0.03), rakeMat, 20, (j, rr, d) => { d.position.set(0.31, 0.07, -0.086 - j * 0.1275); d.rotation.z = 0.5; }));
    const items = [];
    const kinds = [[() => T.wipe(i, 1.1), () => T.bag(1, false), () => T.wipe(i + 1, 1)], [() => T.wipe(i + 2, 1.2), () => T.swab(i, 1.1), () => T.wipe(i, 0.9)]][i % 2];
    kinds.forEach((mk, j) => { const it = mk(); it.userData = { z: -0.5 - j * 0.75 - (i % 2) * 0.2, rot: [j * 1.3 + i, j * 0.7, i * 0.9] }; g.add(it); items.push(it); });
    rakes.push({ g: r, items });
  }
  // calha de descarga
  { const ch = L.box(1.0, 0.05, 2.5, M.steel, 0, 2.83, -1.3); ch.rotation.z = -0.72; const bk = L.box(1.0, 0.45, 0.05, M.steel, 0, 3.0, -2.56); bk.rotation.z = -0.72; const hd = pop(-26.5, 0, 0); hd.add(ch, bk); }
  // lixo preso na grade (coordenadas locais da grade)
  const stuck = L.group(rack);
  [[1.32, -0.35, 0], [1.5, -1.25, 1], [1.38, -2.2, 2], [1.95, -0.8, 1], [2.3, -1.75, 0], [1.75, -1.6, 2]].forEach(([y, z, i]) => { const d = T.drape(i, 1.1); d.position.set(-0.11, y, z); d.rotation.z = 0.1; stuck.add(d); });
  [[1.62, -0.6, 0.5], [2.1, -1.3, -0.4], [1.45, -1.9, 1.2], [2.55, -0.45, 0.2], [1.9, -2.25, -0.8]].forEach(([y, z, a], i) => { const s = T.swab(i, 1.1); s.position.set(-0.1, y, z); s.rotation.set(a, Math.PI / 2, 0); stuck.add(s); });
  [[2.5, -1.0, 3], [2.2, -2.05, 4], [2.75, -1.6, 6]].forEach(([y, z, sd]) => { const f = T.floss(sd, 1.6); f.position.set(-0.07, y, z); stuck.add(f); });
  { const b = T.bag(1.25, false); b.position.set(-0.16, 1.55, -0.95); b.rotation.set(0.3, 0, 1.3); b.scale.z = 1.2; stuck.add(b); }
  const duck = T.duck(1.2); g.add(duck);
  const fb = T.bottle(1.15); g.add(fb);
  // lixo que chega boiando e para na grade
  const drift = [[() => T.wipe(0, 1.2), -0.5, 54.3, -29.75], [() => T.swab(0, 1.2), -1.7, 54.9, -29.55], [() => T.wipe(1, 1.1), -2.2, 55.4, -29.6], [() => T.bag(1.1), -1.35, 55.9, -29.95], [() => T.swab(1, 1.2), -0.3, 56.4, -30.15], [() => T.wipe(2, 1.2), -1.9, 56.9, -30.0], [() => T.bottle(1), -0.8, 57.4, -30.45], [() => T.wipe(0, 1), -1.2, 58.2, -30.5]]
    .map(([mk, z, ta, xs], i) => { const it = mk(); g.add(it); return { it, z, ta, xs, i }; });

  /* ---------- esteira e caçamba ---------- */
  const BX = -25.9, BY = 2.2, BZ0 = -0.15, BZ1 = -8.3;
  const conv = pop(BX, 0, 0);
  conv.add(L.box(1.0, 0.07, BZ0 - BZ1, M.rubber, 0, BY - 0.035, (BZ0 + BZ1) / 2));
  [-0.56, 0.56].forEach((x) => conv.add(L.box(0.08, 0.3, BZ0 - BZ1 + 0.3, M.galv, x, BY - 0.08, (BZ0 + BZ1) / 2)));
  [BZ0, BZ1].forEach((z) => { const r = L.cyl(0.17, 0.17, 1.06, M.steel, 0, BY - 0.17, z, 16); r.rotation.z = Math.PI / 2; conv.add(r); });
  for (let z = -1; z > BZ1; z -= 1.2) { const r = L.cyl(0.06, 0.06, 1.04, M.galv, 0, BY - 0.2, z, 8); r.rotation.z = Math.PI / 2; conv.add(r); }
  conv.add(rods([[[-0.56, 0.25, -3.4], [-0.56, BY - 0.2, -3.4], 0.05], [[0.56, 0.25, -3.4], [0.56, BY - 0.2, -3.4], 0.05], [[-0.56, 0.25, -7.4], [-0.56, BY - 0.2, -7.4], 0.05], [[0.56, 0.25, -7.4], [0.56, BY - 0.2, -7.4], 0.05],
    [[-0.56, 0.3, -3.4], [0.56, BY - 0.3, -3.4], 0.03], [[-0.56, 0.3, -7.4], [0.56, BY - 0.3, -7.4], 0.03], [[-0.56, 0.25, -2.78], [-0.56, BY - 0.2, -2.78], 0.05], [[0.56, 0.25, -2.78], [0.56, BY - 0.2, -2.78], 0.05]], M.galv));
  { const mo = K.motor(0.17, 0.5, M.blue); mo.rotation.z = -Math.PI / 2; mo.position.set(0.62, BY - 0.17, BZ1); conv.add(mo); }
  const NC = 14, cleats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.04, 0.06), L.mat('#39424b', { roughness: 0.8 }), NC); cleats.frustumCulled = false; conv.add(cleats);
  const bin = pop(BX, 0.25, -9.9);
  { const body = L.extrude([[-1.6, 0], [1.6, 0], [1.95, 1.5], [-1.95, 1.5]], 1.9, M.blue); body.rotation.y = Math.PI / 2; body.position.set(-0.95, 0, 0); bin.add(body);
    bin.add(bx(-1.02, 1.02, 1.42, 1.56, -2.0, 2.0, M.blue));
    [-1.2, -0.4, 0.4, 1.2].forEach((z) => bin.add(bx(-0.99, 0.99, 0.1, 1.42, z - 0.05, z + 0.05, L.mat('#2568b3', { roughness: 0.5 }))));
    const rd = L.rng(31);
    bin.add(L.scatter(new THREE.IcosahedronGeometry(1, 1), L.mat('#ffffff', { roughness: 0.9 }), 60, (i, r, d) => { const s = 0.16 + r() * 0.16; d.position.set((r() - 0.5) * 1.5, 1.5 + r() * 0.25 - Math.abs(r() - 0.5) * 0.2, (r() - 0.5) * 3.2); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * 1.4, s * 0.6, s); return ['#f4f5f0', '#e3ecf3', '#f1ecdf', '#ffd84a', '#8fdcff', '#d9d9d9'][Math.floor(rd() * 6)]; }, 12)); }
  // plataforma de operação + painel
  const plat = pop(-24, 0, 0);
  plat.add(bx(-0.6, 0.6, 0.25, 0.32, -2.6, -0.02, M.grating));
  new Rails().add([[-0.55, 0.32, -0.06], [-0.55, 0.32, -2.55]]).add([[0.55, 0.32, -0.06], [0.55, 0.32, -2.55]]).build(plat);
  const panel = pop(-31.6, 0.25, -4.4);
  panel.add(bx(-0.55, 0.55, 0, 0.12, -0.25, 0.25, M.concreteDark), L.rbox(1.0, 1.6, 0.42, 0.04, M.galv, 0, 0.92, 0), L.box(0.5, 0.3, 0.02, L.glow(PAL.good, 0.7), -0.12, 1.35, 0.22));
  [[0.3, 1.42, PAL.red], [0.3, 1.25, PAL.green], [0.3, 1.08, PAL.yellow]].forEach(([x, y, c]) => { const b = L.cyl(0.05, 0.05, 0.04, L.glow(c, 0.8), x, y, 0.22, 12); b.rotation.x = Math.PI / 2; panel.add(b); });
  // guarda-corpos do pátio
  const rl = pop(-19, 0.25, 0);
  new Rails().add([[-17.2, 0, -0.1], [-17.2, 0, -3.15], [-7.6, 0, -3.15]]).add([[-6.2, 0, -3.15], [-0.3, 0, -3.15], [-0.3, 0, -4.75]]).add([[1.1, 0, -4.75], [17.2, 0, -4.75], [17.2, 0, -0.1]]).build(rl);

  /* ---------- caixa de areia: rosca, classificador, areia ---------- */
  const screw = L.group(g, 0, -3.45, -0.6);
  { const x0 = -18.9, x1 = -2.9, pitch = 0.85, n = Math.round(((x1 - x0) / pitch) * 16), pos = [], idx = [];
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, a = ((x - x0) / pitch) * TAU; pos.push(x, 0.09 * Math.cos(a), 0.09 * Math.sin(a), x, 0.43 * Math.cos(a), 0.43 * Math.sin(a)); if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    screw.add(L.mesh(geo, L.metal('#c9d2d9', { roughness: 0.4, metalness: 0.6, side: DS })));
    const sh = L.cyl(0.09, 0.09, x1 - x0 + 0.5, M.steel, (x0 + x1) / 2, 0, 0, 12); sh.rotation.z = Math.PI / 2; screw.add(sh); }
  const cls = pop(-18.7, 0, 0);
  { const A = [0, -3.6, -0.6], B = [0, 3.4, -6.4];
    g.add(rod([-18.7, -3.6, -0.6], [-18.7, 0.3, -3.83], 0.38, M.green, 18));
    cls.add(rod([0, 0.3, -3.83], B, 0.38, M.green, 18), rod([0, 3.05, -6.11], [0, 3.5, -6.48], 0.46, M.green, 18));
    const mo = K.motor(0.26, 0.8, M.blue); mo.position.set(0, 3.5, -6.48); mo.rotation.x = -Math.atan2(5.8, 7.0); cls.add(mo);
    cls.add(rod([0, 3.0, -6.3], [0, 1.9, -7.5], 0.22, M.green, 14));
    cls.add(rods([[[-0.5, 0.25, -5.4], [-0.3, 2.0, -5.4], 0.05], [[0.5, 0.25, -5.4], [0.3, 2.0, -5.4], 0.05], [[-0.5, 0.25, -6.3], [-0.3, 2.9, -6.3], 0.05], [[0.5, 0.25, -6.3], [0.3, 2.9, -6.3], 0.05]], M.green));
    cls.add(bx(-1.0, 1.0, 0.25, 1.35, -9.3, -7.0, M.yellow), bx(-0.9, 0.9, 1.3, 1.37, -9.2, -7.1, L.mat(PAL.sand, { roughness: 1 })));
    const heap = L.sph(1, L.mat(PAL.sand, { roughness: 1 }), 0, 1.3, -7.9); heap.scale.set(0.8, 0.4, 0.9); cls.add(heap); }
  const sandFall = new L.Flow([[-18.7, 1.85, -7.55], [-18.7, 1.4, -7.8]], { n: 14, size: 0.06, color: PAL.sand, jitter: [0.08, 0, 0.08], seed: 4 }); g.add(sandFall.mesh);
  // leito de areia que cresce
  const sandMat = L.mat(PAL.sand, { roughness: 1, side: DS }), NX = 56, US = [0, 0.35, 0.7, 1.1, 1.7, 2.5, 3.3], NR2 = US.length + 1;
  const sandGeo = new THREE.BufferGeometry(), sandPos = new Float32Array((NX + 1) * NR2 * 3), sIdx = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NR2 - 1; j++) { const a = i * NR2 + j, b = a + NR2; sIdx.push(a, b, a + 1, a + 1, b, b + 1); }
  sandGeo.setAttribute('position', new THREE.BufferAttribute(sandPos, 3)); sandGeo.setIndex(sIdx);
  const sandBed = L.mesh(sandGeo, sandMat, 0, 0, 0, { cast: false }); sandBed.frustumCulled = false; g.add(sandBed);
  const bedG = (t) => 0.3 + 0.7 * L.sstep(57.6, 61.4, t);
  const bedH = (x, gt) => 0.95 * gt * (0.1 + 0.9 * Math.exp(-Math.pow((x + 11.5) / 3.4, 2)));
  // grãos afundando
  const NG = 190, grd = L.rng(77), grains = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), L.mat(PAL.sand, { roughness: 0.8, emissive: PAL.sand, emissiveIntensity: 0.25 }), NG), GR = [];
  grains.frustumCulled = false; grains.castShadow = false; g.add(grains);
  for (let i = 0; i < NG; i++) GR.push({ ph: grd(), T: 2.3 + grd() * 1.4, xs: -19.6 + grd() * 1.6, ys: -2.12 - grd() * 0.9, xl: -17.2 + Math.pow(grd(), 0.8) * 12.5, z: grd() < 0.55 ? 0.03 + grd() * 0.02 : -0.08 - grd() * 1.0, s: 0.05 + grd() * 0.035 });
  const _o = new THREE.Object3D();

  /* ---------- setas de fluxo ---------- */
  const chFace = new L.Chevrons([[-51.5, -2.4, 0.07], [-40, -2.4, 0.07], [-36, -2.4, 0.07], [-29.7, -2.42, 0.07], [-28.3, -2.5, 0.07], [-19.7, -2.55, 0.07]], { n: 12, size: 0.4, normal: [0, 0, 1] });
  const chSurf = new L.Chevrons([[-35.3, WL1 + 0.04, -1.3], [-29.6, WL1 + 0.04, -1.3], [-28.4, WL2 + 0.04, -1.3], [-19.8, WL2 + 0.04, -1.3]], { n: 6, size: 0.46, normal: [0, 1, 0] });
  const slow = (x0, x1, y, z) => { const k = 2.3, q = 1 - Math.exp(-k); return { getPointAt(u, o) { return o.set(x0 + ((x1 - x0) * (1 - Math.exp(-k * u))) / q, y, z); }, getTangentAt(u, o) { return o.set(1, 0, 0); } }; };
  const chGrit = new L.Chevrons(slow(-19.5, -2.7, -2.75, 0.07), { n: 10, size: 0.42, normal: [0, 0, 1] });
  const chGritS = new L.Chevrons(slow(-19.5, -2.9, WL2 + 0.04, -2.3), { n: 8, size: 0.5, normal: [0, 1, 0] });
  g.add(chFace.mesh, chSurf.mesh, chGrit.mesh, chGritS.mesh);

  const q = {}, _v = new THREE.Vector3();
  function update(t) {
    // corrente, engrenagens e rastelos
    const sp = 1.5, P = LOOP.P;
    for (let i = 0; i < NL; i++) { loopAt((i / NL) * P + t * sp, q); for (let k = 0; k < 2; k++) { _o.position.set(q.x, q.y, k ? -2.5 : -0.1); _o.rotation.set(0, 0, q.a); _o.scale.setScalar(1); _o.updateMatrix(); links.setMatrixAt(i * 2 + k, _o.matrix); } }
    links.instanceMatrix.needsUpdate = true;
    gears.forEach((gm) => { gm.rotation.z = (-t * sp) / LOOP.r; });
    rakes.forEach((r, i) => {
      const s = (((t * sp + (i * P) / NR) % P) + P) % P; loopAt(s, q); r.g.position.set(q.x, q.y, 0); r.g.rotation.z = q.a - Math.PI / 2;
      r.items.forEach((it, j) => {
        const ud = it.userData, sTop = LOOP.Ls + 0.25; let sc = 1;
        if (s < 0.95) sc = 0;
        else if (s <= sTop) { loopAt(s, q); const w = rw(q.x + 0.18, q.y + 0.13, ud.z); it.position.copy(w); sc = L.clamp01((s - 0.95) * 4); it.rotation.set(ud.rot[0], ud.rot[1], ud.rot[2] - A15); }
        else {
          const tau = (s - sTop) / sp, zb = ud.z, pts = [rw(-0.1, 6.95, zb), rw(0.25, 7.2, zb), new THREE.Vector3(-26.85, 3.15, zb), new THREE.Vector3(-26.15, 2.55, zb), new THREE.Vector3(BX, BY + 0.12, zb), new THREE.Vector3(BX, BY + 0.12, BZ1 - 0.1), new THREE.Vector3(BX, 1.75, BZ1 - 0.9)];
          const du = [0.22, 0.2, 0.26, 0.14, (zb - BZ1) / 2.3, 0.3]; let k = 0, a = tau; while (k < du.length && a > du[k]) { a -= du[k]; k++; }
          if (k >= du.length) sc = 0; else { it.position.lerpVectors(pts[k], pts[k + 1], a / du[k]); if (k === 5) sc = 1 - (a / du[k]) * 0.6; it.rotation.set(ud.rot[0] + tau * (k < 4 ? 5 : 0), ud.rot[1], ud.rot[2]); }
        }
        it.scale.setScalar(Math.max(0.0001, sc)); it.visible = sc > 0.001;
      });
    });
    for (let i = 0; i < NC; i++) { const u = L.fract(i / NC + (t * 2.3) / (BZ0 - BZ1)); _o.position.set(0, BY + 0.02, BZ0 + (BZ1 - BZ0) * u); _o.rotation.set(0, 0, 0); _o.scale.setScalar(1); _o.updateMatrix(); cleats.setMatrixAt(i, _o.matrix); }
    cleats.instanceMatrix.needsUpdate = true;
    // patinho e garrafa boiando contra a grade
    duck.position.set(-29.85 + Math.sin(t * 1.7) * 0.04, WL1 - 0.02 + Math.sin(t * 2.6) * 0.035, -0.6 + Math.sin(t * 1.1) * 0.05); duck.rotation.set(Math.sin(t * 2.1) * 0.09, -2.25 + Math.sin(t * 0.9) * 0.2, Math.sin(t * 2.6 + 1) * 0.08);
    fb.position.set(-29.5, WL1 + 0.03 + Math.sin(t * 2.2 + 2) * 0.02, -2.15); fb.rotation.set(Math.PI / 2, 0, 0.5 + Math.sin(t * 1.3) * 0.1);
    drift.forEach((d) => {
      const x = Math.min(d.xs, d.xs - (d.ta - t) * 1.35), stopped = t > d.ta;
      d.it.position.set(x, WL1 + 0.02 + Math.sin(t * 2.4 + d.i) * 0.025, d.z + (stopped ? 0 : Math.sin(t * 1.3 + d.i * 2) * 0.12));
      d.it.rotation.set(d.i, stopped ? d.i * 1.3 : d.i * 1.3 + (d.ta - t) * 0.8, d.i === 6 ? Math.PI / 2 : 0); d.it.visible = x > -52;
    });
    chFace.update(t, { speed: 0.1 }); chSurf.update(t, { speed: 0.19 });
    chGrit.update(t, { speed: 0.075 }); chGritS.update(t, { speed: 0.075 });
    // areia
    screw.rotation.x = -t * 2.6;
    const gt = bedG(t);
    for (let i = 0; i <= NX; i++) { const x = -18.95 + (16.4 * i) / NX, h = bedH(x, gt) * Math.min(1, Math.min(i, NX - i) / 3 + 0.1), b = i * NR2 * 3;
      sandPos[b] = x; sandPos[b + 1] = -4.0; sandPos[b + 2] = -0.012;
      for (let j = 0; j < US.length; j++) { const k = b + (j + 1) * 3; sandPos[k] = x; sandPos[k + 1] = -4.0 + h * (1 - 0.1 * US[j]) + 0.01; sandPos[k + 2] = -0.012 - US[j]; } }
    sandGeo.attributes.position.needsUpdate = true; sandGeo.computeVertexNormals();
    for (let i = 0; i < NG; i++) { const p = GR[i], k = L.fract(p.ph + t / p.T), yl = -4.0 + bedH(p.xl, gt);
      _o.position.set(p.xs + (p.xl - p.xs) * (1 - (1 - k) * (1 - k)), p.ys + (yl - p.ys) * Math.pow(k, 1.8), p.z); _o.rotation.set(0, 0, 0);
      _o.scale.setScalar(p.s * Math.min(1, k * 9) * Math.min(1, (1 - k) * 12)); _o.updateMatrix(); grains.setMatrixAt(i, _o.matrix); }
    grains.instanceMatrix.needsUpdate = true;
    sandFall.update(t, { speed: 1.6 });
  }
  return { update };
}
