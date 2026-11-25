// JARDINS DE CHUVA (Lo.GARDENS, S.build.gardens): canteiros rebaixados nas calçadas da rua A.
// Os da frente (front: true) aparecem em CORTE na face z = ZF: manta geotêxtil, brita com dreno perfurado,
// areia, solo/composto, casca de pinus, plantas; guia rebaixada com entrada de água; barreiras (check dams)
// que dividem o canteiro em células no declive. Na tempestade com melhorias (S.gardenIn) a água empoça raso
// e desce pelas camadas (setas verdes + gotas) até o solo natural.
import { TM, G, Merge, vmat, grassGeo, shrubGeo, instances, layerMat, sub } from './kit.js';

export { PH as GARDEN_PH };
export const GARDEN_WIN = { g2: [0, 0.55], g1: [0.18, 0.85], g3: [0.38, 0.95], g4: [0.45, 1.0] }; // fatias de S.build.gardens
// sub-fases dentro da janela de cada jardim (0..1)
const PH = { saw: [0, 0.05], lift: [0.03, 0.16], liner: [0.1, 0.16], walls: [0.1, 0.22], gravel: [0.15, 0.34], pipe: [0.19, 0.27], sand: [0.32, 0.44], soil: [0.42, 0.6], dams: [0.5, 0.62], mulch: [0.58, 0.68], cut: [0.62, 0.74], plants: [0.66, 1.0] };
// profundidades abaixo do topo da calçada (m). Frente: canteiro 0,22 abaixo; fundo do furo 0,9 (MODULOS.md)
const DF = { bed: 0.12, mulch: 0.18, soil: 0.47, sand: 0.57, gravel: 0.9 }; // canteiro 3 cm acima do chão urbano (G)
const DB = { bed: 0.12, mulch: 0.2, soil: 0.42 };
const WALL = 0.12, DAM = 0.08;

export function buildGardens(ctx, xr) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const { PAL, clamp01, ease } = L;
  const root = L.group(scene); root.name = 'green-gardens';
  const ZF = Lo.ZF, curbH = Lo.STREET_A.curbH;
  const ys = (x) => (shared.walkY ? shared.walkY(x, 24.7) : Lo.streetY(x) + curbH);      // topo da calçada da rua A
  const ysB = (x) => (shared.walkY ? shared.walkY(x, 13.3) : Lo.streetY(x) + curbH);
  const inletXs = [...Lo.INLETS, ...Lo.INLETS_EXTRA];

  // materiais
  const M = {
    concrete: L.mat('#c9c7c0', { roughness: 0.85 }), walk: L.mat(PAL.sidewalk, { roughness: 0.9 }),
    liner: layerMat('liner'), gravel: layerMat('gravel'), sand: layerMat('sand'), soil: layerMat('soil'), mulch: layerMat('mulch'),
    pipe: L.mat('#ecebe4', { roughness: 0.5, side: THREE.DoubleSide }), hole: L.mat('#1b1d1f', { roughness: 0.9 }),
    saw: L.flat('#3b3a36'), cobble: L.mat('#9a968c', { roughness: 0.8, flatShading: true }),
    water: L.water('#5f9fc4', 0.78, { side: THREE.DoubleSide, depthWrite: false })
  };
  xr.add(M.concrete, M.walk, M.liner, M.gravel, M.sand, M.soil, M.mulch);

  /** faixa entre duas linhas paralelas à calçada, extrudada em z */
  const band = (yf, a, b, dTop, dBot, z0, z1, mat, holes = []) => {
    const n = Math.max(2, Math.ceil((b - a) / 0.25)), top = [], bot = [];
    for (let i = 0; i <= n; i++) { const x = a + ((b - a) * i) / n; top.push([x, yf(x) - dTop]); bot.push([x, yf(x) - dBot]); }
    const geo = G.extrude([...top, ...bot.reverse()], z1 - z0, holes); geo.translate(0, 0, z0);
    return L.mesh(geo, mat);
  };
  /** plano de recorte paralelo à calçada (mantém o que está abaixo de yf − dBot + h) */
  const fillPlane = (yf, a, b, dBot) => {
    const s = (yf(b) - yf(a)) / (b - a), n = new THREE.Vector3(s, -1, 0).normalize(), pl = new THREE.Plane();
    return { pl, set: (h) => pl.setFromNormalAndCoplanarPoint(n, new THREE.Vector3(a, yf(a) - dBot + h, 0)) };
  };
  const clipMat = (m, plane) => { const c = m.clone(); c.clippingPlanes = [plane]; c.userData.op0 = 1; xr.add(c); return c; };

  const plantDefs = [grassGeo(3, 0.62), grassGeo(4, 0.5, '#4a8a3a', '#d6dc7a'), shrubGeo(5, '#ff6fa8', 0.26), shrubGeo(6, '#ffd23f', 0.22), shrubGeo(7, '#b07cff', 0.24)];
  const plantMat = vmat({ roughness: 0.75 });
  const gardens = [];

  Lo.GARDENS.forEach((gd, gi) => {
    const front = !!gd.front, yf = front ? ys : ysB, D = front ? DF : DB, win = GARDEN_WIN[gd.id] || [0, 1];
    const g = L.group(root), zA = gd.z0 + WALL, zB = front ? ZF - 0.002 : gd.z1 - WALL;
    const zE = front ? gd.z0 : gd.z1, dir = front ? 1 : -1, zW = zE + dir * WALL; // borda do lado da rua e sentido rua → canteiro
    const zr = (p, q) => [Math.min(p, q), Math.max(p, q)];
    // trechos (um furo de boca de lobo dentro do canteiro divide o jardim em dois; ver relatório)
    let segs = [[gd.x0, gd.x1]];
    if (front) inletXs.forEach((xi) => { if (xi > gd.x0 + 0.5 && xi < gd.x1 - 0.5) segs = segs.flatMap(([a, b]) => (xi > a && xi < b ? [[a, xi - 0.8], [xi + 0.8, b]] : [[a, b]])); });
    const G0 = { g, front, win, segs: [], slabs: [], plants: [], gd, yf, D };

    /* --- tampa de calçada que é serrada e retirada --- */
    const nsl = Math.max(2, Math.round((gd.x1 - gd.x0) / 1.6));
    const [s0, s1] = front ? [gd.z0, ZF] : [gd.z0, gd.z1];
    for (let i = 0; i < nsl; i++) {
      const a = gd.x0 + ((gd.x1 - gd.x0) * i) / nsl, b = gd.x0 + ((gd.x1 - gd.x0) * (i + 1)) / nsl;
      const m = band(yf, a, b, -0.003, curbH, s0, s1, M.walk); g.add(m);
      const piv = new THREE.Vector3((a + b) / 2, yf((a + b) / 2), (gd.z0 + gd.z1) / 2);
      m.geometry.translate(-piv.x, -piv.y, -piv.z); m.position.copy(piv);
      const cutL = L.box(0.025, 0.02, gd.z1 - gd.z0, M.saw, b, yf(b) + 0.004, (gd.z0 + gd.z1) / 2, { cast: false });
      if (i < nsl - 1) g.add(cutL); else cutL.visible = false;
      G0.slabs.push({ m, piv, cutL, k: i / nsl });
    }

    segs.forEach(([a0, b0]) => {
      const a = a0 + WALL, b = b0 - WALL, S0 = { a, b, a0, b0, layers: [], dams: [], cells: [] };
      // paredes de concreto (frente aberta no corte)
      const wallTop = 0.0, wallBot = front ? D.gravel : D.soil;
      const walls = L.group(g);
      walls.add(band(yf, a0, a, wallTop, wallBot, gd.z0, zB, M.concrete), band(yf, b, b0, wallTop, wallBot, gd.z0, zB, M.concrete));
      // parede do lado da rua (com as aberturas da guia rebaixada)
      const nc = Math.max(1, Math.round((b - a) / 1.9)), cw = (b - a) / nc;
      const cuts = []; for (let c = 0; c < nc; c++) cuts.push(a + c * cw + 0.15); // abertura no início (montante) de cada célula
      let xs = a;
      const [w0, w1] = zr(zE, zW);
      cuts.forEach((xc) => { if (xc > xs + 0.02) walls.add(band(yf, xs, xc, wallTop, wallBot, w0, w1, M.concrete)); xs = xc + 0.55; });
      walls.add(band(yf, xs, b, wallTop, wallBot, w0, w1, M.concrete));
      cuts.forEach((xc) => walls.add(band(yf, xc, xc + 0.55, D.bed - 0.01, wallBot, w0, w1, M.concrete)));
      if (!front) walls.add(band(yf, a0, b0, wallTop, wallBot, gd.z0, zA, M.concrete));
      S0.walls = walls;
      // camadas (cada uma enche de baixo para cima com um plano de recorte)
      const defs = front
        ? [['liner', D.gravel - 0.025, D.gravel + 0.0, M.liner], ['gravel', D.sand, D.gravel, M.gravel], ['sand', D.soil, D.sand, M.sand], ['soil', D.mulch, D.soil, M.soil], ['mulch', D.bed, D.mulch, M.mulch]]
        : [['soil', D.mulch, D.soil, M.soil], ['mulch', D.bed, D.mulch, M.mulch]];
      let pipe = null;
      if (front) { // dreno perfurado na brita, eixo no corte (meio tubo visível)
        const pts = []; for (let i = 0; i <= 12; i++) { const x = a + 0.05 + ((b - a - 0.1) * i) / 12; pts.push([x, yf(x) - 0.79]); }
        pipe = L.cutPipe(pts, { r: 0.08, wall: 0.012, mat: M.pipe, seg: 60, radial: 10 });
        pipe.group.position.z = ZF - 0.003; g.add(pipe.group);
        const holes = new Merge();
        for (let x = a + 0.15; x < b - 0.1; x += 0.16) [0.55, 1.05, 1.55].forEach((an, j) => { const y = yf(x) - 0.79; holes.add(G.sph(0.012, 5, 3), '#1b1d1f', TM(x + j * 0.05, y + Math.cos(an) * 0.066, -Math.sin(an) * 0.066)); });
        const hm = holes.mesh(vmat({ roughness: 0.9 })); hm.castShadow = false; pipe.group.add(hm);
        pipe.water = pipe.waterIn(0.2, '#5f9fc4', 0.85); pipe.water.range(0, 1);
        S0.pipe = pipe;
      }
      defs.forEach(([id, dTop, dBot, m]) => {
        const fp = fillPlane(yf, a, b, dBot), cm = clipMat(m, fp.pl);
        const holes = id === 'gravel' && pipe ? [pipe.outline(0.004).map(([x, y]) => [x, y])] : [];
        const mesh = band(yf, a, b, dTop, dBot, zA, zB, cm, holes); g.add(mesh);
        S0.layers.push({ id, mesh, fp, th: dBot - dTop });
      });
      // células: barreiras (check dams) entre elas, água empoçada por célula
      for (let c = 0; c < nc; c++) {
        const x0 = a + c * cw, x1 = x0 + cw;
        if (c > 0) { const dm = band(yf, x0 - DAM / 2, x0 + DAM / 2, Math.max(0.015, D.bed - 0.105), D.soil, zA, zB, M.concrete); g.add(dm); S0.dams.push(dm); }
        // água: superfície (plano) e cunha na face do corte
        const top = L.mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), M.water, 0, 0, 0, { cast: false }); top.renderOrder = 6;
        const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 1, 0, 1, 1, 0, 1, 0, 0], 3)); tri.computeVertexNormals();
        const wedge = L.mesh(tri, M.water, 0, 0, front ? ZF - 0.0005 : 0, { cast: false }); wedge.renderOrder = 6; wedge.visible = front;
        g.add(top, wedge);
        // entrada pela guia rebaixada: canaleta de concreto + pedras de dissipação + filete de água
        const xc = cuts[c] + 0.275, yS = Lo.streetY(xc), yBed = yf(xc) - D.bed;
        const fl = new Merge();
        const zc = zE - dir * 0.08;
        fl.add(G.box(0.55, 0.05, 0.56), '#b9b6ae', TM(xc, (yS + yBed) / 2 - 0.03, zc, Math.atan2(yS - yBed, 0.56) * dir, 0, 0));
        [-0.3, 0.3].forEach((dx) => fl.add(G.box(0.05, 0.14, 0.56), '#b9b6ae', TM(xc + dx, (yS + yBed) / 2 + 0.03, zc, Math.atan2(yS - yBed, 0.56) * dir, 0, 0)));
        const rdc = L.rng(gi * 31 + c);
        for (let k = 0; k < 7; k++) fl.add(G.sph(1, 6, 4), (x, y, z, o) => o.set('#9a968c').offsetHSL(0, 0, (rdc() - 0.5) * 0.15), TM(xc + (rdc() - 0.5) * 0.5, yBed + 0.03, zW + dir * (0.12 + rdc() * 0.35), rdc() * 3, rdc() * 3, 0, 0.07 + rdc() * 0.04, 0.05, 0.08));
        const flume = fl.mesh(vmat({ roughness: 0.85 })); g.add(flume);
        const inflow = new L.Flow([[xc - 0.25, yS + 0.025, zE - dir * 0.5], [xc, (yS + yBed) / 2 + 0.03, zE - dir * 0.08], [xc + 0.05, yBed + 0.04, zW + dir * 0.25], [xc + 0.25, yBed + 0.03, zW + dir * 0.55]], { n: 22, size: 0.035, color: '#8fcbe8', jitter: [0.12, 0.01, 0.04], material: L.mat('#ffffff', { roughness: 0.2, transparent: true, opacity: 0.85 }), seed: 5 + gi * 7 + c });
        g.add(inflow.mesh);
        S0.cells.push({ x0, x1, top, wedge, flume, inflow, xd: x1 - (c < nc - 1 ? DAM / 2 : 0), xu: x0 + (c ? DAM / 2 : 0) });
      }
      // infiltração no corte: setas verdes e gotas descendo pelas camadas até o solo natural
      if (front) {
        S0.arrows = []; S0.drops = [];
        const na = Math.max(2, Math.round((b - a) / 1.6));
        for (let i = 0; i < na; i++) {
          const x = a + ((b - a) * (i + 0.5)) / na, y0 = yf(x) - D.bed - 0.02;
          const crv = L.curve([[x, y0, ZF + 0.012], [x + 0.02, y0 - 0.5, ZF + 0.012], [x - 0.02, y0 - 1.0, ZF + 0.012], [x, y0 - 1.45, ZF + 0.012]]);
          const ch = new L.Chevrons(crv, { n: 4, size: 0.11, color: PAL.good, normal: [0, 0, 1] }); g.add(ch.mesh);
          const dr = new L.Flow(crv, { n: 14, size: 0.028, jitter: [0.28, 0, 0], material: L.mat('#9fd6f0', { roughness: 0.2 }), color: '#ffffff', seed: 40 + i + gi * 9 });
          g.add(dr.mesh); S0.arrows.push(ch); S0.drops.push(dr);
        }
      }
      G0.segs.push(S0);
    });

    /* --- plantas (capins e arbustos floridos) --- */
    const rd = L.rng(100 + gi);
    const pl = [];
    G0.segs.forEach((S0) => {
      const zz0 = zA + 0.22, zz1 = zB - 0.2, nz = Math.max(1, Math.round((zz1 - zz0) / 0.55));
      for (let x = S0.a + 0.3; x < S0.b - 0.2; x += 0.5 + rd() * 0.15) for (let j = 0; j <= nz; j++) {
        if (S0.cells.some((c) => Math.abs(x - c.x0) < 0.12 && c.x0 > S0.a + 0.01)) continue;
        const z = zz0 + ((zz1 - zz0) * j) / Math.max(1, nz) + (rd() - 0.5) * 0.18;
        const kind = rd() < 0.6 ? (rd() < 0.5 ? 0 : 1) : 2 + Math.floor(rd() * 3);
        pl.push({ x: x + (rd() - 0.5) * 0.18, z, kind, ry: rd() * 6.28, s: 0.8 + rd() * 0.45, k: rd() });
      }
    });
    G0.plants = pl;
    G0.ims = plantDefs.map((geo, k) => { const im = instances(geo, plantMat, pl.filter((p) => p.kind === k).length); g.add(im); return im; });
    gardens.push(G0);
  });
  // registro para outros módulos (terreno/cidade leem no update): janelas e aberturas da guia
  shared.greenGardens = { win: GARDEN_WIN, cavaOpen: [PH.lift[0], PH.liner[1]], rects: Lo.GARDENS.map((g) => ({ ...g })) };
  shared.curbCuts = gardens.flatMap((G0) => G0.segs.flatMap((S0) => S0.cells.map((c) => ({ x0: c.x0 + 0.15 - 0.0, x1: c.x0 + 0.7, z: G0.gd.z0, garden: G0.gd.id }))));

  function update(t, S) {
    const B = S.build.gardens, walks = sub(S.build.walks ?? 1, 0.6, 1), gin = S.gardenIn || 0;
    for (const G0 of gardens) {
      const p = sub(B, G0.win[0], G0.win[1]), on = p > 0;
      G0.g.visible = walks > 0.01;
      // tampa de calçada: serra e retirada
      G0.slabs.forEach((sl) => {
        const k = ease.in(sub(p, PH.lift[0] + sl.k * 0.05, PH.lift[1])), saw = sub(p, PH.saw[0], PH.saw[1]) * (1 - sub(p, PH.lift[0], PH.lift[0] + 0.03));
        sl.m.visible = k < 0.98; sl.m.position.set(sl.piv.x, sl.piv.y + k * 1.7, sl.piv.z - k * 1.6); sl.m.rotation.set(k * 0.9, 0, k * 0.5 * (sl.k - 0.5));
        sl.m.scale.set(1 - k * 0.9, Math.max(1e-3, walks) * (1 - k * 0.9), 1 - k * 0.9);
        sl.cutL.scale.set(1, 1, Math.max(1e-4, saw)); sl.cutL.visible = saw > 0.01 && p < PH.lift[1];
      });
      const liner = sub(p, PH.liner[0], PH.liner[1]), wallK = ease.out(sub(p, PH.walls[0], PH.walls[1]));
      G0.segs.forEach((S0) => {
        S0.walls.visible = wallK > 0.001; S0.walls.scale.y = 1; S0.walls.position.y = (1 - wallK) * -0.95;
        S0.layers.forEach((ly) => {
          const f = ly.id === 'liner' ? liner : ly.id === 'gravel' ? sub(p, ...PH.gravel) : ly.id === 'sand' ? sub(p, ...PH.sand) : ly.id === 'soil' ? sub(p, ...(G0.front ? PH.soil : [0.3, 0.55])) : sub(p, ...PH.mulch);
          ly.mesh.visible = f > 0.001; ly.fp.set(f >= 1 ? 50 : ly.th * f + 0.001);
        });
        if (S0.pipe) { const k = sub(p, ...PH.pipe); S0.pipe.group.visible = k > 0.001; S0.pipe.group.scale.set(1, 1, 1); S0.pipe.group.position.y = (1 - ease.out(k)) * 0.6; S0.pipe.water.group.visible = gin > 0.02; }
        const dk = ease.back(sub(p, ...PH.dams));
        S0.dams.forEach((d) => { d.visible = dk > 0.001; d.position.y = (1 - Math.min(1, dk)) * -0.4; });
        const ck = sub(p, ...PH.cut);
        S0.cells.forEach((c, ci) => {
          c.flume.visible = ck > 0.001; c.flume.position.y = (1 - ease.out(ck)) * -0.3;
          // lâmina rasa na célula (nível sobe até a crista da barreira)
          const bedD = G0.yf(c.xd) - G0.D.bed, bedU = G0.yf(c.xu) - G0.D.bed, lvl = bedD + 0.008 + 0.1 * gin * (0.9 + 0.1 * Math.sin(t * 2.1 + ci));
          const xw = Math.max(c.xu, c.xu + (c.xd - c.xu) * clamp01((bedU - lvl) / Math.max(1e-3, bedU - bedD)));
          const vis = gin > 0.02 && c.xd - xw > 0.05;
          c.top.visible = c.wedge.visible = vis; if (!G0.front) c.wedge.visible = false;
          if (vis) {
            const zA = G0.gd.z0 + WALL, zB = G0.front ? ZF - 0.003 : G0.gd.z1 - WALL;
            c.top.position.set((xw + c.xd) / 2, lvl, (zA + zB) / 2); c.top.scale.set(c.xd - xw, 1, zB - zA);
            c.wedge.position.set(xw, bedD, ZF - 0.0005); c.wedge.scale.set(c.xd - xw, lvl - bedD, 1);
          }
          c.inflow.update(t, { speed: 0.55, amount: gin > 0.02 ? Math.min(1, gin * 1.3) : 0 }); c.inflow.mesh.visible = gin > 0.02;
        });
        if (S0.arrows) {
          S0.arrows.forEach((ch, i) => ch.update(t + i * 0.37, { speed: 0.32, amount: gin, size: 0.11 }));
          S0.drops.forEach((dr, i) => { dr.update(t + i * 0.53, { speed: 0.27, amount: gin > 0.02 ? 1 : 0, head: 0.92 }); dr.mesh.visible = gin > 0.02; });
        }
      });
      // plantas brotando (escalonadas), balançando de leve na chuva
      const counts = G0.ims.map(() => 0);
      G0.plants.forEach((q, i) => {
        const k = sub(p, PH.plants[0] + q.k * 0.2, PH.plants[0] + q.k * 0.2 + 0.14), s = (k > 0 ? Math.min(1.08, ease.back(k)) : 0) * q.s;
        const im = G0.ims[q.kind], y = G0.yf(q.x) - G0.D.bed, sway = 0.06 * S.rain * Math.sin(t * 3.1 + i);
        im.set(counts[q.kind]++, q.x, y, q.z, q.ry, s, s, s, sway, sway * 0.6);
      });
      G0.ims.forEach((im) => im.done());
    }
  }
  return { update, root };
}
