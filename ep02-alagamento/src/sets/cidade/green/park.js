// PARQUE LINEAR / VÁRZEA (Lo.PARK, S.build.park) e ÁRVORES NOVAS nas calçadas das ruas A e B.
// O parque é uma plataforma gramada (contida por uma mureta do lado da avenida, talude para o rio) com três
// "bacias" de gramado rebaixado que enchem na tempestade (S.parkIn) — o rebaixo é feito subindo o entorno,
// sem cavar o terreno. Caminho de saibro, bancos, mudas de árvores nativas (ipês e copa verde) com tutor.
import { TM, G, Merge, vmat, treeGeo, stakeGeo, grassGeo, blob, instances, layerMat, sub } from './kit.js';

export const PARK_PH = { rise: [0, 0.35], green: [0.15, 0.5], path: [0.28, 0.6], bench: [0.5, 0.7], trees: [0.32, 0.8], street: [0.45, 1.0] };

export function buildPark(ctx, xr) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const { PAL, clamp01, ease, lerp, sstep } = L;
  const root = L.group(scene); root.name = 'green-park';
  const Pk = Lo.PARK, Gf = (x, z) => (shared.groundY ? shared.groundY(x, z) : Lo.G(x, z));
  const ZA = Pk.z0 + 0.25, ZB = 24.3;          // o canal ocupa z > 24,55 na frente (eixo em ZF, meia largura 1,2 + parede)
  const YP = 3.66;                              // cota do platô do parque
  const CELLS = [[-21.2, -10.6], [-7.4, 4.6], [8.2, 21.0]], CX = [23.95, 25.1], FALL = 0.6;
  const edgeX = (x) => (x < Pk.x0 + 0.06 ? 0 : 1) * (1 - sstep(25.55, 26.15, x));
  const edgeZ = (z) => sstep(ZA, ZA + 1.3, z) * (1 - sstep(ZB - 1.3, ZB, z));
  const swale = (x, z) => {
    const fx = 1 - sstep(0, FALL, Math.max(CX[0] - x, x - CX[1], 0));
    let w = 0; CELLS.forEach(([a, b]) => { w = Math.max(w, 1 - sstep(0, FALL, Math.max(a - z, z - b, 0))); });
    return fx * w;
  };
  const surf = (x, z, k = 1) => { const g = Gf(x, z), plat = g + Math.max(0, YP - g) * edgeX(x) * edgeZ(z), fin = lerp(plat, g + 0.03, swale(x, z)); return g + 0.012 + (fin - g - 0.012) * k; };
  const floorY = (z) => Math.min(...[CX[0], (CX[0] + CX[1]) / 2, CX[1]].map((x) => Gf(x, z))) + 0.03;

  /* --- superfície do parque (malha com cor por vértice: mais escuro/úmido no fundo das bacias) --- */
  const nx = 34, nz = 150, pos = new Float32Array((nx + 1) * (nz + 1) * 3), col = [], uv = [], idx = [];
  const xs = Array.from({ length: nx + 1 }, (_, i) => lerp(Pk.x0, Pk.x1, i / nx)), zs = Array.from({ length: nz + 1 }, (_, j) => lerp(ZA, ZB, j / nz));
  const cA = new THREE.Color('#7cc65a'), cB = new THREE.Color('#3f8f3a'), cT = new THREE.Color('#8a6b45'), cc = new THREE.Color();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = xs[i], z = zs[j], s = swale(x, z); cc.copy(cA).lerp(cB, s * 0.8); if (edgeX(x) < 0.5 && x > 25) cc.lerp(cT, 0.25); col.push(cc.r, cc.g, cc.b); uv.push(x * 0.8, z * 0.8); }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const p = j * (nx + 1) + i; idx.push(p, p + nx + 1, p + 1, p + 1, p + nx + 1, p + nx + 2); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const lawnM = layerMat('lawn', { vertexColors: true, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }); lawnM.userData.op0 = 1; xr.add(lawnM);
  const lawn = L.mesh(geo, lawnM, 0, 0, 0, { cast: false }); root.add(lawn);
  let lastK = -1;
  const setSurf = (k) => {
    if (Math.abs(k - lastK) < 1e-6) return; lastK = k;
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const p = (j * (nx + 1) + i) * 3; pos[p] = xs[i]; pos[p + 1] = surf(xs[i], zs[j], k); pos[p + 2] = zs[j]; }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
  };
  setSurf(0);
  // mureta de concreto do lado da avenida (acompanha o platô)
  const wallM = L.mat('#bdb9b0', { roughness: 0.85 }); xr.add(wallM);
  const wall = new THREE.Group(); root.add(wall);
  for (let z = ZA; z < ZB - 0.01; z += 0.8) { const z1 = Math.min(ZB, z + 0.8), zm = (z + z1) / 2, g = Gf(Pk.x0, zm), top = g + Math.max(0, YP - g) * edgeZ(zm) + 0.06; if (top - g < 0.05) continue; wall.add(L.box(0.14, top - g + 0.1, z1 - z + 0.002, wallM, Pk.x0 + 0.07, (top + g - 0.1) / 2, zm)); }
  // caminho de saibro com guias
  const PX = [23.2, 23.8], pathM = layerMat('path', { roughness: 0.9 }); xr.add(pathM);
  const pathSegs = [];
  for (let z = ZA + 1.4; z < ZB - 1.4; z += 1.0) {
    const z1 = Math.min(ZB - 1.4, z + 1.0), m = new Merge();
    m.add(G.box(PX[1] - PX[0], 0.05, z1 - z), '#ffffff', TM((PX[0] + PX[1]) / 2, 0.025, (z + z1) / 2));
    const seg = L.mesh(m.geo(), pathM, 0, 0, 0, { cast: false });
    const ed = new Merge(); [PX[0] - 0.03, PX[1] + 0.03].forEach((x) => ed.add(G.box(0.06, 0.09, z1 - z), '#9d9a92', TM(x, 0.03, (z + z1) / 2)));
    const edm = ed.mesh(vmat({ roughness: 0.85 })); root.add(seg, edm); xr.add(edm.material);
    pathSegs.push({ seg, edm, z: (z + z1) / 2, k: (z - ZA) / (ZB - ZA) });
  }
  // bancos (concreto + ripas de madeira), voltados para as bacias
  const bm = new Merge();
  [-0.65, 0.65].forEach((dz) => bm.add(G.rbox(0.42, 0.42, 0.12, 0.03), '#b4b0a8', TM(0, 0.21, dz)));
  for (let i = 0; i < 4; i++) bm.add(G.rbox(0.1, 0.05, 1.7, 0.015), i % 2 ? '#a8744e' : '#b98458', TM(-0.17 + i * 0.11, 0.44, 0));
  for (let i = 0; i < 2; i++) bm.add(G.rbox(0.04, 0.09, 1.7, 0.015), '#a8744e', TM(-0.27, 0.62 + i * 0.13, 0, 0, 0, 0.2));
  [-0.65, 0.65].forEach((dz) => bm.add(G.box(0.05, 0.4, 0.06), '#3b4148', TM(-0.24, 0.6, dz, 0, 0, 0.2)));
  const benchZ = [-15.8, -9.0, 6.4, 14.6], imBench = instances(bm.geo(), vmat({ roughness: 0.7 }), benchZ.length); root.add(imBench);
  // árvores: geometrias instanciadas (3 tipos) + tutores + coroa de casca na base
  const treeGeos = [treeGeo(0, 3), treeGeo(1, 4), treeGeo(2, 5), treeGeo(0, 8)], treeM = vmat({ roughness: 0.8 });
  const parkTrees = [[24.55, -8.95, 1], [24.55, 6.4, 2], [22.98, -12.4, 0], [22.98, -2.5, 3], [22.98, 10.5, 0], [22.98, 18.6, 1], [25.62, -18.5, 3], [25.62, -13.2, 2], [25.62, 0.2, 0], [25.62, 14.8, 3], [25.62, 20.2, 1], [24.55, -22.1, 0], [24.55, 22.6, 2]]
    .map(([x, z, kind], i) => ({ x, z, kind, park: true, s: 0.78 + ((i * 37) % 10) * 0.025, ry: i * 1.9, k: (i % 7) / 7 }));
  // calçadas das ruas A e B: covas com grelha
  const walkY = (x, z) => (shared.walkY ? shared.walkY(x, z) : (z >= 12.3 && x <= Lo.AVENUE_D.x0 ? Lo.streetY(x) : Lo.G(x, z)) + Lo.STREET_A.curbH); // = módulo cidade
  const streetTrees = [
    ...[-36.3, -12.2, -3.4, 5.6].map((x) => [x, 24.75]), ...[-17.2, -7.6, 2.6, 17.6].map((x) => [x, 13.45]),
    ...[-20.5, -6.5, 2.0, 11.5, 16.5].map((x) => [x, 0.0]), ...[-19.5, -6.5, -1.5, 9.5, 15.5].map((x) => [x, -10.0])
  ].map(([x, z], i) => ({ x, z, kind: [0, 1, 3, 2][i % 4], park: false, s: 0.62 + ((i * 53) % 10) * 0.02, ry: i * 2.3, k: ((i * 5) % 18) / 18 }));
  const allTrees = [...parkTrees, ...streetTrees];
  const imT = treeGeos.map((g, k) => { const im = instances(g, treeM, allTrees.filter((t) => t.kind === k).length); root.add(im); return im; });
  const imStake = instances(stakeGeo(), vmat({ roughness: 0.8 }), allTrees.length); root.add(imStake);
  const imRing = instances(G.cyl(0.5, 0.55, 0.06, 16), L.mat('#6b4428', { roughness: 0.95 }), parkTrees.length, { cast: false }); root.add(imRing);
  // grelha de árvore (ferro fundido) com quadro de concreto e terra por baixo
  const gr = new Merge(), S2 = 0.6;
  gr.add(G.box(1.36, 0.06, 1.36), '#5a4030', TM(0, -0.02, 0));
  [[0, S2 + 0.04, 1.36, 0.08], [0, -S2 - 0.04, 1.36, 0.08], [S2 + 0.04, 0, 0.08, 1.2], [-S2 - 0.04, 0, 0.08, 1.2]].forEach(([x, z, w, d]) => gr.add(G.box(w, 0.07, d), '#b0aca3', TM(x, 0.025, z)));
  for (let i = -4; i <= 4; i++) { const zz = i * 0.135; if (Math.abs(zz) < 0.16) { gr.add(G.box(0.38, 0.025, 0.035), '#353b42', TM(-0.4, 0.035, zz)).add(G.box(0.38, 0.025, 0.035), '#353b42', TM(0.4, 0.035, zz)); } else gr.add(G.box(1.18, 0.025, 0.035), '#353b42', TM(0, 0.035, zz)); }
  gr.add(G.torus(0.2, 0.025, 6, 20), '#353b42', TM(0, 0.035, 0, Math.PI / 2, 0, 0)); [-1, 1].forEach((s) => gr.add(G.box(0.035, 0.025, 1.18), '#353b42', TM(s * 0.59, 0.035, 0)));
  const imGrate = instances(gr.geo(), vmat({ roughness: 0.6, metalness: 0.3 }), streetTrees.length); root.add(imGrate);
  // água nas bacias (lâmina plana, nível coerente: sobe a partir do ponto mais baixo do fundo)
  const waterM = L.water('#5f9fc4', 0.8, { depthWrite: false });
  const pools = CELLS.map(([a, b]) => { const m = L.mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), waterM, 0, 0, 0, { cast: false }); m.renderOrder = 6; root.add(m); return { a, b, m, y0: Math.min(floorY(a + 1), floorY((a + b) / 2), floorY(b - 1)) }; });
  // leito de pedras (canaleta seca) serpenteando no fundo de cada bacia + touceiras de capim nas bordas
  const rdp = L.rng(61), peb = [], tufts = [];
  CELLS.forEach(([a, b], ci) => {
    for (let z = a + 0.4; z < b - 0.4; z += 0.16) { const xm = (CX[0] + CX[1]) / 2 + 0.25 * Math.sin(z * 0.7 + ci), w = 0.28 + 0.08 * Math.sin(z * 1.3);
      for (let k = 0; k < 2; k++) peb.push({ x: xm + (rdp() - 0.5) * 2 * w, z: z + (rdp() - 0.5) * 0.12, s: 0.07 + rdp() * 0.07, r: rdp() * 6, c: rdp() }); }
    for (let z = a - 0.2; z < b + 0.2; z += 0.9) [CX[0] - 0.42, CX[1] + 0.42].forEach((x, j) => tufts.push({ x: x + (rdp() - 0.5) * 0.2, z: z + rdp() * 0.4, s: 0.8 + rdp() * 0.5, r: rdp() * 6, k: rdp() }));
  });
  const imPeb = instances(blob(1, 0, 0.25, 7, 0.55), L.mat('#a39d92', { roughness: 0.85, flatShading: true }), peb.length, { cast: false });
  peb.forEach((q, i) => imPeb.setColorAt(i, new THREE.Color('#a39d92').offsetHSL(0, 0, (q.c - 0.5) * 0.2)));
  const imTuft = instances(grassGeo(9, 0.75, '#3d7f34', '#a8c95e', 13), vmat({ roughness: 0.75 }), tufts.length);
  root.add(imPeb, imTuft);
  const parkArrows = [];
  CELLS.forEach(([a, b], ci) => [0.3, 0.7].forEach((u) => { const z = lerp(a, b, u), x = 24.5, y = floorY(z) + 0.45; const ch = new L.Chevrons(L.curve([[x, y + 1.1, z], [x, y + 0.4, z], [x, y - 0.5, z]]), { n: 3, size: 0.3, color: PAL.good, normal: [0.85, 0, 0.5] }); root.add(ch.mesh); parkArrows.push(ch); }));
  L.shadows(root); lawn.castShadow = false; lawn.receiveShadow = true;
  shared.greenPark = { ph: PARK_PH, surf: (x, z) => surf(x, z, 1), cells: CELLS, cx: CX };

  function update(t, S) {
    const P = S.build.park, pin = S.parkIn || 0;
    const rk = ease.io(sub(P, ...PARK_PH.rise));
    lawn.visible = P > 0; wall.visible = rk > 0.01;
    setSurf(rk);
    const gk = sub(P, ...PARK_PH.green); lawnM.color.setRGB(lerp(0.78, 1, gk), lerp(0.66, 1, gk), lerp(0.5, 1, gk));
    wall.position.y = (1 - rk) * -0.6;
    pathSegs.forEach((p) => { const k = ease.out(sub(P, PARK_PH.path[0] + p.k * 0.25, PARK_PH.path[0] + p.k * 0.25 + 0.08)), y = surf((PX[0] + PX[1]) / 2, p.z, rk) + 0.005; p.seg.visible = p.edm.visible = k > 0.001; p.seg.position.y = p.edm.position.y = y + (1 - k) * 0.5; p.seg.scale.set(1, Math.max(0.01, k), 1); });
    benchZ.forEach((z, i) => { const k = ease.back(sub(P, PARK_PH.bench[0] + i * 0.04, PARK_PH.bench[0] + i * 0.04 + 0.12)), x = 22.93; imBench.set(i, x, surf(x, z, rk) - 0.01 + (1 - Math.min(1, k)) * 0.8, z, 0, k > 0 ? 1 : 0); });
    imBench.done();
    // árvores: muda aparece (desce para a cova), cresce até o porte final
    const cnt = imT.map(() => 0); let ri = 0;
    allTrees.forEach((tr, i) => {
      const ph = tr.park ? PARK_PH.trees : PARK_PH.street, a = ph[0] + tr.k * (ph[1] - ph[0]) * 0.45;
      const plant = ease.out(sub(P, a, a + 0.08)), grow = ease.io(sub(P, a + 0.06, Math.min(1, a + 0.06 + 0.4))), s = tr.s * (0.24 + 0.76 * grow) * (plant > 0 ? 1 : 0);
      const y = tr.park ? surf(tr.x, tr.z, rk) - 0.02 : walkY(tr.x, tr.z) + 0.005, drop = (1 - plant) * 1.2, sway = 0.035 * S.rain * Math.sin(t * 2.3 + i);
      imT[tr.kind].set(cnt[tr.kind]++, tr.x, y + drop, tr.z, tr.ry, s, s, s, sway, sway * 0.7);
      imStake.set(i, tr.x, y + drop, tr.z, tr.ry, plant > 0 ? 1 : 0, plant > 0 ? 0.9 : 0, plant > 0 ? 1 : 0);
      if (tr.park) { imRing.set(ri++, tr.x, y + 0.01, tr.z, 0, plant > 0 ? 1 : 0, plant, plant > 0 ? 1 : 0); }
    });
    streetTrees.forEach((tr, i) => { const a = PARK_PH.street[0] + tr.k * (PARK_PH.street[1] - PARK_PH.street[0]) * 0.45, k = ease.out(sub(P, a - 0.05, a + 0.03)); imGrate.set(i, tr.x, walkY(tr.x, tr.z) + 0.004 + (1 - k) * 0.6, tr.z, 0, k > 0 ? 1 : 0); });
    imT.forEach((im) => im.done()); imStake.done(); imRing.done(); imGrate.done();
    // várzea enchendo
    pools.forEach((pl, i) => {
      const lvl = pl.y0 + 0.01 + 0.3 * pin * (0.94 + 0.06 * Math.sin(t * 1.3 + i)), on = pin > 0.02 && P > 0.99;
      pl.m.visible = on; if (on) { pl.m.position.set((CX[0] + CX[1]) / 2 + 0.1, lvl, (pl.a + pl.b) / 2); pl.m.scale.set(CX[1] - CX[0] + 0.85, 1, pl.b - pl.a + 0.95); }
    });
    const gp = sub(P, PARK_PH.green[0] + 0.1, PARK_PH.green[1] + 0.15);
    peb.forEach((q, i) => { const k = ease.out(sub(gp, (q.z - ZA) / (ZB - ZA) * 0.6, (q.z - ZA) / (ZB - ZA) * 0.6 + 0.4)); imPeb.set(i, q.x, surf(q.x, q.z, rk) + 0.01, q.z, q.r, k * q.s, k * q.s, k * q.s); });
    tufts.forEach((q, i) => { const k = ease.back(sub(P, 0.55 + q.k * 0.3, 0.7 + q.k * 0.3)), s = k * q.s; imTuft.set(i, q.x, surf(q.x, q.z, rk) - 0.02, q.z, q.r, s, s, s, 0.05 * S.rain * Math.sin(t * 3 + i)); });
    imPeb.done(); imTuft.done();
    parkArrows.forEach((ch, i) => ch.update(t + i * 0.37, { speed: 0.4, amount: pin, size: 0.3 }));
  }
  return { update, root };
}
