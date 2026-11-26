// Vegetação do terreno (instanciada, por região — cada região é uma malha, então o motor descarta as que estão fora de
// quadro): mata densa da serra e dos morros (touceiras de copas), árvores avulsas (margens, platô, encosta, cidade),
// ipês floridos, arbustos, capim, taboas na beira da represa, pedras nas margens. Tudo balança de leve (vento) no shader.
import * as L from '../../../lib.js';
import * as R from './relief.js';
import { Merge, vmat, grad, blob, taperTube, bushGeo, tuftGeo, ribbon, TM } from './util.js';
const { THREE, clamp01, lerp, sstep, TAU } = L;

const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;

/** touceira de mata: 3–4 copas de alturas diferentes (lê como mata fechada de longe, custa pouco) */
function clumpGeo(seed) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#4a3324', '#6d4f37', 0, 4);
  const pals = [['#1f5a2c', '#4f9a3e'], ['#245f2a', '#5aa645'], ['#2b6630', '#6cb04a'], ['#1d5230', '#47913f']];
  const n = 4;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + rd(), d = i === 0 ? 0 : 1.9 + rd() * 0.9, x = Math.cos(a) * d, z = Math.sin(a) * d, H = 2.4 + rd() * 2.2, r = 2.0 + rd() * 0.9;
    m.add(taperTube([[x, -0.3, z], [x + 0.1, H * 0.6, z], [x, H, z]], (u) => lerp(0.3, 0.15, u), 2, 5), bark);
    const p = pals[(seed + i) % 4], cc = grad(p[0], p[1], H - r * 0.5, H + r * 1.4);
    m.add(blob(r, 1, 0.24, seed * 5 + i, 0.85), cc, TM(x, H + r * 0.55, z, 0, rd() * 6, 0));
  }
  return m.geo();
}
/** ipê florido (amarelo ou rosa) — o treeGeo do Ep. 02 com outra paleta */
function ipeGeo(seed, c0, c1) { return recolor(treeLite(seed, [c0, c1]), 1.7, c0, c1); }
function reedLite(seed = 1) { // taboa leve
  const rd = L.rng(seed), m = new Merge(), stem = grad('#4c8a35', '#86b84a', 0, 1.3), leaf = grad('#3f8a3a', '#9fd05a', 0, 1.2);
  for (let i = 0; i < 5; i++) {
    const x = (rd() - 0.5) * 0.3, z = (rd() - 0.5) * 0.3, h = 0.95 + rd() * 0.5, lx = (rd() - 0.5) * 0.22, lz = (rd() - 0.5) * 0.22;
    m.add(taperTube([[x, 0, z], [x + lx * 0.4, h * 0.5, z + lz * 0.4], [x + lx, h, z + lz]], (u) => lerp(0.018, 0.009, u), 3, 4), stem);
    if (i < 3) m.add(new THREE.CylinderGeometry(0.034, 0.03, 0.2, 6), '#5b3820', TM(x + lx * 0.8, h * 0.82, z + lz * 0.8, lz * 0.4, 0, -lx * 0.4));
  }
  for (let i = 0; i < 6; i++) { const a = rd() * TAU, h = 0.8 + rd() * 0.5, out = 0.25 + rd() * 0.3; m.add(ribbon([[0, 0, 0], [out * 0.15, h * 0.5, 0], [out * 0.55, h * 0.92, 0], [out, h * 0.98, 0]], (u) => 0.06 * (1 - u * 0.9), 4, [0, 0, 1], 0.3), leaf, TM((rd() - 0.5) * 0.2, 0, (rd() - 0.5) * 0.2, 0, a, 0)); }
  return m.geo();
}
const rockG = (seed) => blob(1, 0, 0.3, seed, 0.7);
/** árvore leve: tronco, 2 galhos, 4 copas (≈ 430 triângulos) */
function treeLite(seed, pal, tall = false) {
  const rd = L.rng(seed), m = new Merge(), bark = grad('#553a28', '#7b573b', 0, 2), H = tall ? 2.9 + rd() * 0.5 : 2.0;
  m.add(taperTube([[0, -0.15, 0], [0.06, H * 0.4, 0.03], [-0.04, H * 0.75, -0.02], [0.02, H, 0]], (u) => lerp(tall ? 0.16 : 0.18, 0.08, u) * (1 + 0.5 * Math.pow(1 - u, 6)), 5, 6), bark);
  [[0.55, 0.45, 0.8], [-0.5, 0.35, -0.6]].forEach(([bx, by, bz]) => m.add(taperTube([[0, H * 0.72, 0], [bx * 0.5, H * 0.72 + by * 0.6, bz * 0.3], [bx, H + by, bz * 0.6]], (u) => lerp(0.07, 0.03, u), 3, 4), bark));
  const cc = grad(pal[0], pal[1], H - 0.3, H + 1.7);
  const bl = tall ? [[0, 0.25, 0, 0.92], [0.42, -0.2, 0.2, 0.68], [-0.4, -0.15, -0.25, 0.7], [0.05, 0.85, 0.05, 0.6]] : [[0, 0.95, 0, 1.0], [0.75, 0.55, 0.25, 0.74], [-0.7, 0.6, -0.15, 0.76], [0.1, 0.6, -0.7, 0.7]];
  bl.forEach(([x, y, z, r], i) => m.add(blob(r, 1, 0.23, seed * 3 + i, tall ? 0.78 : 0.82), cc, TM(x, H + y, z, 0, rd() * 6, 0)));
  return m.geo();
}
function recolor(g, y0, c0, c1) { const col = g.attributes.color, pos = g.attributes.position, a = new THREE.Color(c0), b = new THREE.Color(c1), t = new THREE.Color(); for (let i = 0; i < col.count; i++) { if (pos.getY(i) < y0) continue; t.copy(a).lerp(b, clamp01((pos.getY(i) - y0) / 1.6)); col.setXYZ(i, t.r, t.g, t.b); } return g; }

/** vento: copas balançam (deslocamento cresce com a altura local; fase pela posição da instância) */
function sway(m, amp = 0.012, key = 'a') {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = L.WATER_U.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec3 ip = vec3(0.0);
        #ifdef USE_INSTANCING
        ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        #endif
        float h = max(0.0, transformed.y - 0.8), sw = h * h * ${amp.toFixed(4)};
        float ph = uTime * 1.35 + ip.x * 0.31 + ip.z * 0.17;
        transformed.x += sw * (sin(ph) + 0.35 * sin(ph * 2.3 + 1.7));
        transformed.z += sw * 0.6 * sin(uTime * 1.05 + ip.z * 0.27 + ip.x * 0.11 + 1.3); }`);
  };
  m.customProgramCacheKey = () => 'ep3-sway-' + key;
  return m;
}

export function buildFlora(ctx, gr) {
  const { Lo, scene } = ctx;
  const { X0, X1, Z0, ZF } = Lo;
  const grp = new THREE.Group(); grp.name = 'terreno.flora'; scene.add(grp);
  const rd = L.rng(3033), H = R.H, lake = Lo.LAKE.level;
  const dIn = (x, z) => gr.samp(gr.fIn, x, z), dOut = (x, z) => gr.samp(gr.fOut, x, z);
  const slope = (x, z) => Math.hypot(H(x + 0.6, z) - H(x - 0.6, z), H(x, z + 0.6) - H(x, z - 0.6)) / 1.2;
  const E = Lo.ETA;
  const etaRects = [{ x0: E.arrival.x0, x1: E.arrival.x1, z0: E.arrival.z0, z1: E.arrival.z1 }, { x0: E.parshall.x0, x1: E.parshall.x1, z0: -76, z1: -72 }, E.floc, E.dec, E.filters, E.contact, E.lift, E.chem, E.lab, { x0: -30, x1: 44, z0: -68, z1: -58 }];
  const etaCirc = [[E.sludgeTank.x, E.sludgeTank.z, E.sludgeTank.r], [E.reservoir.x, E.reservoir.z, E.reservoir.r]];
  const T = Lo.TOWER, ST = Lo.STREETS;
  const lotsAll = [Lo.LOTS.hero, Lo.LOTS.school, Lo.LOTS.hospital, ...Lo.LOTS.houses.map((h) => ({ x0: h.x0, x1: h.x1, z0: 9, z1: 21.5 }))];
  const streetRects = [{ x0: ST.casa.x0, x1: ST.casa.x1, z0: ST.casa.walkBack[0], z1: ZF }, { x0: ST.back.x0, x1: ST.back.x1, z0: ST.back.walkBack[0], z1: ST.back.walkFront[1] }, ST.avenida];
  const roadP = [{ x0: 20.5, x1: 27.5, z0: -45.5, z1: -30 }, { x0: 27.5, x1: 44, z0: -35, z1: -30.5 }];
  const inDam = (x, z, m = 0) => R.damY(x, z) > R.Hnat(x, z) - 0.3 - m && x > 14 && z < -96 || (R.inSpillBand(z, 1.5 + m) && x > 24 && x < 50);
  /** território livre para plantar (fora de estruturas dos outros módulos) */
  function free(x, z, m = 0) {
    if (x < X0 + 0.8 || x > X1 - 0.8 || z < Z0 + 0.8 || z > ZF - 0.8) return false;
    if (x > -38 && x < 44 && z > -82 && z < -26) return false;                         // corredores das câmeras da ETA: nada alto
    if (inRect(R.ZONES.captacao, x, z, m)) return false;
    if (inDam(x, z, m)) return false;
    if (dIn(x, z) < R.RIN.hw + 1.0 + m || dOut(x, z) < R.ROUT.hw + 1.2 + m) return false;
    if (H(x, z) < lake + 0.35) return false;
    if (z > -88.8 && z < -80.6 && Math.abs(x) < 47) return false;                  // talude (muro de arrimo / adutora)
    if (z > -82 && z < -29) { if (etaRects.some((r) => inRect(r, x, z, 3.5 + m)) || etaCirc.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r + 3.5 + m) || roadP.some((r) => inRect(r, x, z, 1.5 + m))) return false; }
    if (Math.hypot(x - T.x, z - T.z) < 8 + m) return false;
    if (Lo.LOTS.towers.some((b) => Math.hypot(x - b.x, z - b.z) < 9 + m)) return false;
    if (z > -32 && (streetRects.some((r) => inRect(r, x, z, 1.2 + m)) || lotsAll.some((r) => inRect(r, x, z, 0.8 + m)))) return false;
    if (Math.abs(x - Lo.P.mainTop[0]) < 3 && z > -32 && z < ZF) return false;
    return true;
  }
  const leafMat = sway(vmat({ roughness: 0.85 }), 0.010, 'tree'), grassMat = sway(vmat({ roughness: 0.9, side: THREE.DoubleSide }), 0.06, 'grass');
  const regionOf = (x, z) => (z < -100 ? 'serra' : z < -80 ? 'margem' : z < -30 ? 'plato' : 'cidade');
  /** cria uma InstancedMesh por (geometria, região) */
  const lists = new Map();
  const push = (kind, v, x, z, s, extra = {}) => { const key = kind + '|' + v + '|' + regionOf(x, z); if (!lists.has(key)) lists.set(key, []); lists.get(key).push({ x, y: H(x, z), z, s, ry: rd() * TAU, ...extra }); };

  /* ---------- mata da serra e dos morros ---------- */
  const wildK = (x, z) => Math.max(sstep(-134, -144, z), z < -96 ? sstep(42, 50, Math.abs(x)) * sstep(-92, -102, z) : 0);
  for (let gx = X0 + 2; gx < X1 - 1; gx += 5.2) for (let gz = Z0 + 2; gz < -94; gz += 5.2) {
    const x = gx + (rd() - 0.5) * 3.6, z = gz + (rd() - 0.5) * 3.6, w = wildK(x, z);
    if (w < 0.25 || rd() > w || !free(x, z, 0.6) || slope(x, z) > 1.9) continue;
    push('clump', Math.floor(rd() * 3), x, z, 1.0 + rd() * 0.35);
    if (rd() < 0.035) push('ipe', rd() < 0.6 ? 0 : 1, x + 1.5, z + 1.2, 2.4 + rd() * 0.6);
  }
  // mata ciliar e árvores avulsas na borda da mata (margens da represa e dos rios)
  for (let i = 0; i < 900; i++) {
    const x = lerp(X0 + 1, X1 - 1, rd()), z = lerp(Z0 + 1, -92, rd()), h = H(x, z);
    const nearLake = h > lake + 0.5 && h < lake + 6 && x < 30, nearRiver = (dIn(x, z) < R.RIN.hw + 5 && dIn(x, z) > R.RIN.hw + 1.2) || (dOut(x, z) < R.ROUT.hw + 6 && dOut(x, z) > R.ROUT.hw + 1.6);
    if (!(nearLake || nearRiver) || !free(x, z, 0.5) || slope(x, z) > 1.5 || rd() < 0.6) continue;
    const r = rd(); push(r < 0.75 ? 'tree' : 'tall', Math.floor(rd() * (r < 0.75 ? 3 : 2)), x, z, 2.2 + rd() * 0.6);
  }
  /* ---------- margem da frente, platô, encosta, cidade ---------- */
  const spots = [
    { x0: -60, x1: -8, z0: -99, z1: -89.5, n: 14, kinds: ['tree', 'tree', 'tree', 'tall', 'tree', 'tree', 'tall', 'tree', 'ipe'] },
    { x0: 16, x1: 60, z0: -97, z1: -89.5, n: 10, kinds: ['tree', 'tree', 'tall'] },
    { x0: -60, x1: -40, z0: -79, z1: -32, n: 16, kinds: ['tree', 'tree', 'tree', 'tall', 'tree', 'tree', 'tall', 'tree', 'ipe'] },
    { x0: 44.5, x1: 60, z0: -79, z1: -32, n: 14, kinds: ['tree', 'tree', 'tree', 'tall', 'tree', 'tree', 'tall', 'tree', 'ipe'] },
    { x0: -38, x1: 18, z0: -38, z1: -31, n: 9, kinds: ['tree', 'tree', 'tree', 'ipe'] },
    { x0: -60, x1: 60, z0: -29, z1: -7, n: 34, kinds: ['tree', 'tree', 'tree', 'tall', 'tree', 'tree', 'tall', 'tree', 'ipe'] },
    { x0: -60, x1: 60, z0: -5.5, z1: ZF - 1, n: 14, kinds: ['tree', 'tree', 'tree', 'ipe'] }
  ];
  spots.forEach((sp) => { let k = 0; for (let i = 0; i < sp.n * 30 && k < sp.n; i++) { const x = lerp(sp.x0, sp.x1, rd()), z = lerp(sp.z0, sp.z1, rd()); if (!free(x, z, 0.8)) continue; const kind = sp.kinds[Math.floor(rd() * sp.kinds.length)]; push(kind, kind === 'tall' ? Math.floor(rd() * 2) : kind === 'ipe' ? Math.floor(rd() * 2) : Math.floor(rd() * 3), x, z, (kind === 'ipe' ? 2.2 : 2.3) + rd() * 0.6); k++; } });
  // arbustos: bordas da mata, margens, encosta
  for (let i = 0; i < 1000; i++) {
    const x = lerp(X0 + 1, X1 - 1, rd()), z = lerp(Z0 + 1, ZF - 1, rd()), w = wildK(x, z), h = H(x, z);
    const edge = (w > 0.1 && w < 0.85) || (h > lake + 0.4 && h < lake + 3 && z < -96) || (z > -99.5 && z < -89 && rd() < 0.3) || (z > -30 && z < -7 && rd() < 0.35) || (z > -82 && z < -30 && (x < -38 || x > 44) && rd() < 0.5);
    if (!edge || !free(x, z, -0.4)) continue;
    push('bush', Math.floor(rd() * 2), x, z, 1.6 + rd() * 1.4);
  }
  // capim: margem da frente (perto da captação, onde a câmera chega), talude sem muro, beira dos rios, pé da barragem
  let nTuft = 0;
  for (let i = 0; i < 5200 && nTuft < 650; i++) {
    const x = lerp(-50, 62, rd()), z = lerp(-150, -30, rd()), h = H(x, z);
    const front = z > -99.6 && z < -88.8 && x > -30 && x < 40, gap = z > -88.8 && z < -80.8 && x > R.ZONES.wallGap[0] + 0.5 && x < R.ZONES.wallGap[1] - 0.5;
    const bank = (dIn(x, z) < R.RIN.hw + 3 || dOut(x, z) < R.ROUT.hw + 4) || (h > lake + 0.3 && h < lake + 1.2 && z < -96);
    if (!(front || gap || bank)) continue;
    if (gap) { if (!(x > 0 && x < 40)) continue; } else if (!free(x, z, -0.6)) continue;
    if (inRect(R.ZONES.captacao, x, z, 1.5)) continue;
    push('tuft', Math.floor(rd() * 2), x, z, 1.5 + rd() * 1.1); nTuft++;
  }
  // taboas na beira rasa da represa (fora da captação e da barragem)
  for (let i = 0; i < 1600; i++) {
    const x = lerp(-56, 26, rd()), z = lerp(-150, -98, rd()), h = H(x, z);
    if (h < lake - 0.55 || h > lake + 0.25 || inRect(R.ZONES.captacao, x, z, 4) || x > 14 && z > -110 || dIn(x, z) < R.RIN.hw + 2) continue;
    push('reed', 0, x, z, 1.2 + rd() * 0.6, { yy: Math.max(h, lake - 0.45) });
  }
  // pedras nas margens e nos rios
  for (let i = 0; i < 2600; i++) {
    const x = lerp(X0 + 1, X1 - 1, rd()), z = lerp(Z0 + 1, -89, rd()), h = H(x, z);
    const onBank = (dIn(x, z) < R.RIN.hw + 2.2 && dIn(x, z) > R.RIN.hw * 0.6) || (dOut(x, z) < R.ROUT.hw + 2.2 && dOut(x, z) > R.ROUT.hw * 0.7) || (Math.abs(h - lake) < 0.6 && z < -96 && x < 30) || (slope(x, z) > 1.2 && wildK(x, z) > 0.5 && rd() < 0.08);
    if (!onBank || inRect(R.ZONES.captacao, x, z, 1) || inDam(x, z, 0.5)) continue;
    push('rock', Math.floor(rd() * 2), x, z, 0.25 + Math.pow(rd(), 2) * 0.9);
  }

  /* ---------- malhas ---------- */
  const G = {
    clump: [clumpGeo(1), clumpGeo(2), clumpGeo(3)],
    tree: [treeLite(1, ['#2f7d38', '#7fcf55']), treeLite(2, ['#3b8a35', '#93d457']), treeLite(3, ['#2a6e3a', '#6dbb4e'])],
    tall: [treeLite(6, ['#245f32', '#6cb94c'], true), treeLite(7, ['#2a6a34', '#7ec25a'], true)],
    ipe: [ipeGeo(5, '#d99a14', '#ffe14d'), ipeGeo(8, '#c4588f', '#f39ac4')],
    bush: [bushGeo(1, '#1f5f2a', '#5fae45'), bushGeo(2, '#2a5a24', '#7aa83e')],
    tuft: [tuftGeo(1), tuftGeo(2, '#4f8f34', '#b6d870')],
    reed: [reedLite(3)],
    rock: [rockG(4), rockG(7)]
  };
  const rockMat = L.mat(0xffffff, { roughness: 0.88, flatShading: true });
  const rockCols = ['#8d9199', '#a19a8c', '#77736c', '#9b8f7d'];
  const meshes = [];
  for (const [key, list] of lists) {
    const [kind, v] = key.split('|'), geo = G[kind][+v];
    const material = kind === 'rock' ? rockMat : kind === 'tuft' || kind === 'reed' ? grassMat : leafMat;
    const im = new THREE.InstancedMesh(geo, material, list.length);
    const cast = kind !== 'tuft' && kind !== 'rock' && kind !== 'reed';
    im.castShadow = cast; im.receiveShadow = true;
    const o = new THREE.Object3D(), c = new THREE.Color();
    list.forEach((q, i) => {
      const y = q.yy ?? q.y;
      o.position.set(q.x, kind === 'rock' ? y - q.s * 0.3 : y - 0.08, q.z);
      o.rotation.set(kind === 'rock' ? q.ry * 1.7 : 0, q.ry, kind === 'rock' ? q.ry * 0.6 : 0);
      if (kind === 'rock') o.scale.set(q.s * 1.2, q.s * 0.8, q.s); else o.scale.setScalar(q.s);
      o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      if (kind === 'rock') im.setColorAt(i, c.set(rockCols[Math.floor(Math.abs(Math.sin(q.ry * 7.1)) * 4)]).offsetHSL(0, 0, Math.sin(q.ry * 13) * 0.05));
    });
    im.computeBoundingSphere();
    grp.add(im); meshes.push({ key, im, n: list.length });
  }
  return { update() {}, grp, meshes };
}
