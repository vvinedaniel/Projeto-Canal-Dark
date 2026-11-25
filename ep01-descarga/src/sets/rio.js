// Cenário "rio" (86,76 → 102,5 s): devolução da água tratada ao rio, "não é água de beber", vida no rio,
// recapitulação do caminho inteiro em miniatura e a revelação final: cerca de metade do esgoto não é tratado.
// Maquete: rio corre em +x na frente (corte em z = 6); bairro A (x < 0) passa pela ETE; bairro B (x > 0) despeja num valão.
import { K, G, TM, Merge, vmat, Bubbles } from './rio/util.js';
import { buildTerrain, buildWater, height, wave, plume, T_RAW, creekK, creekXZ, creekBedY } from './rio/terrain.js';
import { makeFish, makeHeron, makeDragonfly, waterPlantGeo, reedGeo, tuftGeo, lilyGeo, treeGeo, bushGeo, rockGeo } from './rio/nature.js';
import { makeHouse, makeStreet, makeCar, makeETE } from './rio/town.js';
import { makeHeadwall, makeCleanStream, makeRawCreek, makeGlass, makeTrash, PIPE_Y } from './rio/props.js';

export function create(L, { PH, def }) {
  const { THREE, PAL, TAU, sstep, prog, pulse, lerp, clamp01, ease } = L;
  const { XA, XB, YW, BED, Z1 } = K;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 12, sunDir: [0.55, 0.95, 0.7], fogNear: 150, fogFar: 460, hemi: 0.85, sun: 2.6 });
  // contorno de um defeito do fundo de estúdio da lib: o degradê gera NaN (preto) perto do nadir, visível em câmera alta
  scene.traverse((o) => { if (o.isMesh && o.renderOrder === -10 && o.geometry.attributes.color) { const c = o.geometry.attributes.color, lo = new THREE.Color(PAL.bg); for (let i = 0; i < c.count; i++) if (!(c.getX(i) >= 0)) c.setXYZ(i, lo.r, lo.g, lo.b); c.needsUpdate = true; } });
  const pipeLight = new THREE.PointLight('#bfe9ff', 0.5, 5, 1.6); pipeLight.position.set(XA, PIPE_Y + 0.1, -1.5); scene.add(pipeLight);

  /* ================= terreno e água ================= */
  scene.add(buildTerrain());
  const river = buildWater(); scene.add(river.group);
  const headwall = makeHeadwall(); scene.add(headwall);
  const clean = makeCleanStream(); scene.add(clean.group);
  const raw = makeRawCreek(); scene.add(raw.group);
  const trash = makeTrash(18); scene.add(trash.group);

  /* ================= bairros ================= */
  const WALLS = ['#f2e2c4', '#bfe3ea', '#f6c9a8', '#d7ecc0', '#f7e08e'], ROOFS = [PAL.roof, '#a8482f', '#d87a55', '#8f979c', '#b5553c'], DOORS = ['#7a4b2a', '#2f6f8f', '#7a4b2a', '#3f7f52', '#8f3f2f'];
  const COL_A = '#35c8ff', COL_B = PAL.warn;
  const dropGeo = G.lathe([[0, 0], [0.13, 0.06], [0.19, 0.2], [0.15, 0.34], [0.06, 0.48], [0, 0.58]], 14);
  function town(sign) {
    const g = L.group(scene), sx = sign * 6, houses = [], col = sign < 0 ? COL_A : COL_B;
    const markM = L.glow(col, 1.6, { transparent: true }), lineM = L.glow(col, 1.9);
    const street = makeStreet(-21.9, -12.7); street.position.x = sx; const streetPivot = L.group(g, 0, 0, -21.9); street.position.z = 21.9; streetPivot.add(street);
    const spots = [[9.15, -20.5, 0], [9.15, -17.2, 0], [9.15, -13.9, 0], [2.85, -20.5, 1], [2.85, -17.2, 1]];
    const frames = new Merge(), branches = new Merge();
    spots.forEach(([ax, z, inner], i) => {
      const x = sign * ax, faceP = (sign < 0) !== !!inner, h = makeHouse({ wall: WALLS[(i * 2 + (sign > 0 ? 0 : 0)) % 5], roof: ROOFS[i % 5], door: DOORS[i % 5], bathroom: sign < 0 && i === 1 });
      const hg = L.group(g, x, height(x, z) + 0.0, z); h.rotation.y = faceP ? 0 : Math.PI; hg.add(h);
      const [lx0, lx1, lz] = h.userData.lot, fm = new Merge(), y = 0.05, w = 0.09;
      fm.add(G.box(lx1 - lx0 + 0.3, 0.05, w), col, TM((lx0 + lx1) / 2, y, lz + 0.14)).add(G.box(lx1 - lx0 + 0.3, 0.05, w), col, TM((lx0 + lx1) / 2, y, -lz - 0.14)).add(G.box(w, 0.05, lz * 2 + 0.3), col, TM(lx0 - 0.14, y, 0)).add(G.box(w, 0.05, lz * 2 + 0.3), col, TM(lx1 + 0.14, y, 0));
      const frame = L.mesh(fm.geo(), markM, 0, 0, 0, { cast: false, receive: false }); frame.rotation.y = h.rotation.y; hg.add(frame);
      const drop = L.mesh(dropGeo, markM, 0, 3.3, 0, { cast: false, receive: false }); hg.add(drop);
      const dir = faceP ? 1 : -1, door = [x + dir * 1.7, 0.14, z + dir * 0.5];
      branches.rod(door, [sx, 0.14, z + dir * 0.5 + 0.7], 0.045, col, 6);
      houses.push({ hg, frame, drop, x, z, i });
    });
    const br = L.mesh(branches.geo(), markM, 0, 0, 0, { cast: false, receive: false }); g.add(br);
    // pracinha no lote vago + carro
    const car = makeCar(sign < 0 ? '#d8433a' : '#2f7fd6'); car.position.set(sx + sign * 0.55, 0.06, -15.2); car.rotation.y = Math.PI / 2; streetPivot.add(car); car.position.z += 21.9;
    return { g, houses, markM, lineM, streetPivot, br, sign };
  }
  const A = town(-1), B = town(1);
  const ete = makeETE(-11.3, -0.9, -12.2, -3.9); scene.add(ete.group);

  /* ================= caminhos luminosos ================= */
  const pathA = L.curve([[-7.5, 0.3, -16.7], [-6.5, 0.16, -16.3], [-6, 0.16, -15.3], [-6, 0.16, -13.2], [-6, 0.95, -11.5], [-8.7, 1.15, -9.5], [-4.3, 1.15, -7.9], [-8.5, 1.15, -5.9], [-6.2, 0.5, -3.9], [-3.7, 0.5, -2.8], [XA, 0.75, -1.3], [XA, 0.1, 0.5], [XA + 0.1, -0.8, 2.0], [XA + 0.9, -0.92, 3.4]], false, 0.5);
  const pathBs = L.curve([[7.5, 0.3, -16.7], [6.5, 0.16, -16.3], [6, 0.16, -15.3], [6, 0.16, -13.6], [6, 0.16, -12.85]], false, 0.5);
  const pathB = L.curve([[7.5, 0.3, -16.7], [6.5, 0.16, -16.3], [6, 0.16, -15.3], [6, 0.16, -13.2], ...creekXZ.map(([x, z]) => [x, creekBedY(z) + 0.75, z]), [XB + 0.9, -0.85, 2.2]], false, 0.5);
  const SEG = 320, RAD = 8;
  const lineA = L.tube(pathA, 0.12, A.lineM, SEG, RAD), lineB = L.tube(pathBs, 0.12, B.lineM, 60, RAD);
  [lineA, lineB].forEach((m) => { m.castShadow = false; m.receiveShadow = false; m.frustumCulled = false; scene.add(m); });
  const chevA = new L.Chevrons(pathA, { n: 17, size: 0.42, color: PAL.accent, normal: [0, 1, 0], offset: [0, 0.3, 0] });
  const chevB = new L.Chevrons(pathB, { n: 15, size: 0.42, color: '#ff8a7f', normal: [0, 1, 0], offset: [0, 0.3, 0] });
  scene.add(chevA.mesh, chevB.mesh);

  /* ================= vegetação ================= */
  const vm = vmat({ roughness: 0.85 });
  const TREES = [[-11.2, -2.6, 0, 1.0], [-10.3, -1.9, 2, 0.95], [-0.45, -2.7, 0, 0.9], [-2.85, -13.9, 1, 1.0], [-11.3, -21.6, 0, 1.0], [-0.8, -18.4, 2, 1.0], [-0.9, -21.6, 0, 0.9], [-11.5, -12.9, 1, 0.8],
    [1.3, -6.5, 0, 1.0], [7.6, -3.4, 0, 1.05], [10.4, -7.6, 1, 1.0], [9.0, -10.6, 0, 0.9], [11.0, -2.3, 2, 1.0], [6.6, -8.3, 2, 0.9], [1.6, -10.8, 1, 0.85], [10.7, -4.9, 0, 0.8],
    [2.85, -13.9, 1, 1.0], [11.3, -21.6, 0, 1.0], [0.9, -21.6, 0, 0.9], [0.8, -18.4, 2, 1.0], [11.5, -12.9, 1, 0.8]];
  [0, 1, 2].forEach((kind) => {
    const list = TREES.filter((q) => q[2] === kind);
    scene.add(L.scatter(treeGeo(kind, 3 + kind), vm, list.length, (i, r, d) => { const [x, z, , s] = list[i]; d.position.set(x, height(x, z) - 0.03, z); d.rotation.y = r() * TAU; d.scale.setScalar(s * (0.95 + r() * 0.15)); }, 7 + kind));
  });
  const onTown = (x, z) => (Math.abs(Math.abs(x) - 6) < 5.2 && z > -21.9 && z < -12.4) || (x > -11.6 && x < -0.6 && z > -12.5 && z < -3.6);
  const freeSpot = (r, zmin = -22.2, zmax = -0.9) => { let x, z, n = 0; do { x = (r() - 0.5) * 23.4; z = lerp(zmin, zmax, r()); } while (++n < 40 && (onTown(x, z) || height(x, z) < 0.0 - 0.45 || creekK(x, z) > 0 || (Math.abs(x - XA) < 1.7 && z > -6))); return [x, z]; };
  scene.add(L.scatter(tuftGeo(2), vm, 520, (i, r, d) => { const [x, z] = freeSpot(r); d.position.set(x, height(x, z) - 0.01, z); d.rotation.y = r() * TAU; d.scale.setScalar(0.8 + r() * 0.9); }, 12));
  scene.add(L.scatter(tuftGeo(5, '#8a9a3a', '#d6d36a'), vm, 160, (i, r, d) => { let x, z, n = 0; do { x = 0.8 + r() * 10.8; z = -12.2 + r() * 11; } while (++n < 20 && creekK(x, z) > 0); d.position.set(x, height(x, z) - 0.01, z); d.rotation.y = r() * TAU; d.scale.setScalar(0.9 + r() * 0.9); }, 15));
  scene.add(L.scatter(bushGeo(2), vm, 24, (i, r, d) => { let x, z, n = 0; do { [x, z] = i < 12 ? [0.9 + r() * 10.6, -12 + r() * 10] : freeSpot(r, -4, -1.6); } while (++n < 30 && (creekK(x, z) > 0 || creekK(x - 0.7, z) > 0 || creekK(x + 0.7, z) > 0)); d.position.set(x, height(x, z) - 0.03, z); d.rotation.y = r() * TAU; d.scale.setScalar(0.7 + r() * 0.8); return new THREE.Color(1, 1, 1).offsetHSL(0, 0, -r() * 0.12); }, 18));
  // flores
  scene.add(L.scatter(new THREE.SphereGeometry(0.045, 6, 5), L.mat('#ffffff', { roughness: 0.6 }), 90, (i, r, d) => { const [x, z] = freeSpot(r, -5, -1.2); d.position.set(x, height(x, z) + 0.12 + r() * 0.1, z); return ['#ffd23f', '#ffffff', '#ff8fb8', '#f6a04d'][i % 4]; }, 33));
  // pedras na margem e no leito
  scene.add(L.scatter(rockGeo(9), L.mat('#ffffff', { roughness: 0.92, flatShading: true }), 120, (i, r, d) => {
    let x, z, n = 0; do { x = (r() - 0.5) * 23.6; z = i < 80 ? -0.7 + r() * 1.8 : 1.5 + r() * 4.3; } while (++n < 20 && (Math.abs(x - XA) < 3.6 || Math.abs(x - XB) < 0.9));
    const s = (i < 80 ? 0.07 : 0.08) + r() * (i % 9 === 0 ? 0.24 : 0.12); d.position.set(x, height(x, z) + s * 0.25, z); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * (1 + r() * 0.5), s * (0.6 + r() * 0.4), s * (0.9 + r() * 0.5));
    return new THREE.Color('#a7a79c').offsetHSL(0.03 * (r() - 0.5), 0, (r() - 0.5) * 0.2);
  }, 41));
  // juncos (taboas) na linha d'água, com balanço
  const shoreZ = (x) => { for (let z = -2; z < 2.5; z += 0.05) if (height(x, z) < YW + 0.1) return z; return 0; };
  const reedSpots = []; { const r = L.rng(61); for (let x = -11.6; x < 11.7; x += 0.42 + r() * 0.3) { if ((x > XA - 3.1 && x < XA + 3.1) || Math.abs(x - XB) < 1.1) continue; const z = shoreZ(x) + (r() - 0.35) * 0.5; reedSpots.push({ x, z, y: height(x, z) - 0.03, ry: r() * TAU, s: 0.8 + r() * 0.55, ph: r() * 6 }); } }
  const reeds = [reedGeo(1), reedGeo(2)].map((geo, k) => { const list = reedSpots.filter((_, i) => i % 2 === k), im = new THREE.InstancedMesh(geo, vm, list.length); im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; scene.add(im); return { im, list }; });
  const _o = new THREE.Object3D();
  // plantas aquáticas no leito (perto do corte) e vitórias-régias
  const plants = []; { const r = L.rng(71), geos = [waterPlantGeo(1, 7, 1.0), waterPlantGeo(2, 9, 0.75), waterPlantGeo(3, 6, 1.2)];
    for (let i = 0; i < 34; i++) { const x = i < 12 ? -7.6 + r() * 5.6 : (r() - 0.5) * 23, z = 3.6 + r() * 2.15, m = L.mesh(geos[i % 3], vm, x, height(x, z) - 0.02, z); m.rotation.y = r() * TAU; m.scale.setScalar(0.75 + r() * 0.5); scene.add(m); plants.push({ m, ph: r() * 6, x }); } }
  const pads = [[-6.3, 4.7, 1], [-5.5, 5.35, 0], [-7.3, 3.7, 0], [-3.2, 5.2, 1], [-6.9, 5.5, 0], [-9.4, 4.4, 1], [-8.7, 5.2, 0], [-10.6, 3.1, 0], [-0.6, 4.6, 0], [-1.4, 5.4, 1], [4.6, 4.9, 0], [7.4, 4.1, 1], [9.2, 5.3, 0], [-4.4, 4.3, 0]].map(([x, z, f], i) => {
    const m = L.mesh(lilyGeo(f), vm, x, YW, z, { cast: false }); m.scale.setScalar(0.3 + (i % 3) * 0.07); m.rotation.y = i * 1.9; scene.add(m); return { m, x, z };
  });

  // ciscos claros levados pela correnteza (mostram o sentido do rio)
  const flecks = new Bubbles(110, { seed: 91, size: 0.018, rate: 0.045, material: L.mat('#eaf8ff', { roughness: 0.5, emissive: '#bfe6f7', emissiveIntensity: 0.2 }), place: (q, u, d, t) => {
    const x = lerp(-12, 12, u), z = 0.9 + q.b * 4.9; d.position.set(x, YW + wave(x, z, t) + 0.012, z); d.scale.set(3.2, 0.2, 0.7); d.scale.multiplyScalar(1 - plume(x, z, t));
  } });
  scene.add(flecks.mesh);

  /* ================= bichos ================= */
  const fr = L.rng(81), fishList = [];
  const addFish = (cx, cz, cy, o = {}) => fishList.push({ cx, cz, cy, ax: 0.8 + fr() * 1.1, az: 0.25 + fr() * 0.35, w: (0.4 + fr() * 0.35) * (fr() < 0.5 ? -1 : 1), ph: fr() * TAU, size: 0.56 + fr() * 0.24, beat: 8 + fr() * 4, sp: Math.floor(fr() * 3), ...o });
  [[-5.4, 4.9, -1.7], [-4.3, 5.3, -2.0], [-3.9, 4.5, -1.45], [-5.9, 4.2, -2.05], [-4.9, 5.55, -1.5, { size: 0.36 }], [-5.0, 5.5, -1.62, { size: 0.33 }], [-7.9, 4.8, -1.8], [-9.6, 5.1, -1.6], [-1.4, 4.9, -1.9], [-10.6, 4.3, -2.0], [-2.6, 5.4, -1.6]].forEach((q) => addFish(...q));
  [[2.4, 5.0, -1.8], [4.3, 5.3, -1.6], [5.9, 4.7, -2.0], [7.5, 5.2, -1.7], [9.2, 4.9, -1.9], [10.4, 5.4, -1.6], [3.4, 4.4, -2.0]].forEach((q) => addFish(...q));
  const fish = makeFish(fishList); scene.add(fish.group);
  const fishGone = (f, t) => { if (f.cx < 0.5) return 1; const tv = T_RAW + 0.3 + (f.cx - XB) * 0.26; return 1 - sstep(tv, tv + 0.8, t); };
  const heron = makeHeron(); { const x = -6.2, z = shoreZ(-6.2) + 0.95; heron.group.position.set(x, height(x, z) - 0.02, z); heron.group.rotation.y = -0.5; heron.group.scale.setScalar(1.25); } scene.add(heron.group);
  const dflies = [['#27b5ff', -5.2, 2.6, 0], ['#ff5a4e', -3.9, 3.6, 2.1], ['#3df0c2', -6.4, 4.4, 4.2]].map(([c, x, z, ph]) => { const d = makeDragonfly(c); d.group.scale.setScalar(1.5); scene.add(d.group); return { d, x, z, ph }; });

  /* ================= copo ================= */
  const glassK = makeGlass(); scene.add(glassK.group);

  /* ================= câmera ================= */
  // um trilho por plano; a passagem entre planos é uma mistura suave (evita o "estilingue" do spline entre escalas muito diferentes)
  const R = (keys, o = {}) => L.camRail(keys, { tension: 0.5, smooth: 0.75, drift: 0.008, ...o });
  const shots = [
    { a: 0, rail: R([
      { t: 86.76, p: [XA, -0.2, -2.2], l: [XA, -0.3, -7], fov: 60 },
      { t: 87.25, p: [XA, -0.1, 0.1], l: [XA, -0.32, -4], fov: 56 },
      { t: 87.8, p: [XA + 0.3, 0.2, 2.5], l: [XA, -0.5, -0.4], fov: 46 },
      { t: 88.5, p: [XA + 1.2, 0.9, 6.0], l: [XA - 0.1, -0.6, 0.3], fov: 38 },
      { t: 89.3, p: [XA + 2.4, 2.2, 11], l: [XA - 0.3, -0.9, 1.2], fov: 35 },
      { t: 91.0, p: [XA + 2.9, 2.5, 13.6], l: [XA - 0.6, -1.0, 1.6] }]) },
    { a: 90.5, b: 91.4, rail: R([{ t: 90.5, p: [-5.9, -0.45, 12.2], l: [-5.4, -1.8, 3] }, { t: 93.6, p: [-4.3, -0.3, 12.9], l: [-4.6, -1.75, 3] }], { smooth: 0 }) },
    { a: 92.95, b: 94.3, rail: R([{ t: 93.0, p: [-1.5, 63, 22], l: [-1.2, 0, -4] }, { t: 95.6, p: [-1.0, 64, 22.5], l: [-0.8, 0, -4] }, { t: 96.9, p: [0.5, 66, 23.5], l: [0.4, 0, -4] }, { t: 99.6, p: [0.6, 63, 22.5], l: [0.4, 0, -4] }]) },
    { a: 98.9, b: 100.5, rail: R([{ t: 98.9, p: [0.8, 13, 32], l: [0.4, -1.3, 4.5] }, { t: 102.5, p: [1.1, 10.2, 27.5], l: [0.5, -1.3, 4.2] }], { smooth: 0.3 }) }
  ];
  const cp = new THREE.Vector3(), cl = new THREE.Vector3(), lookOut = new THREE.Vector3();
  function rail(t, cam) {
    let i = 0; while (i < shots.length - 1 && t >= shots[i + 1].a) i++;
    const s = shots[i], k = i ? ease.io(prog(t, s.a, s.b)) : 1;
    lookOut.copy(s.rail(t, cam));
    if (k < 1) {
      cp.copy(cam.position); cl.copy(lookOut); const f1 = cam.fov;
      lookOut.copy(shots[i - 1].rail(t, cam)).lerp(cl, k); cam.position.lerp(cp, k); cam.fov = lerp(cam.fov, f1, k);
      cam.up.set(0, 1, 0); cam.lookAt(lookOut); cam.updateProjectionMatrix();
    }
    return lookOut;
  }
  const fwd = new THREE.Vector3(), upv = new THREE.Vector3(), tmp = new THREE.Vector3(), rgt = new THREE.Vector3();

  function update(t, cam, ui) {
    const look = rail(t, cam), dist = cam.position.distanceTo(look);
    cam.updateMatrixWorld(); // os rótulos são projetados dentro do update: a matriz inversa precisa estar em dia
    rig.focus(look.x, look.y, look.z, Math.min(30, Math.max(4.5, dist * 0.43)));
    pipeLight.intensity = 0.5 * (1 - sstep(87.4, 88.2, t));

    /* água e fluxo */
    river.update(t); clean.update(t); ete.update(t); flecks.update(t);
    const creekHead = prog(t, 96.85, T_RAW);
    raw.update(t, creekHead);
    trash.update(t, wave, 1);
    pads.forEach((p) => { p.m.position.y = YW + wave(p.x, p.z, t) + 0.012; });
    plants.forEach((p) => { p.m.rotation.z = 0.14 * Math.sin(t * 1.25 + p.ph + p.x * 0.6); p.m.rotation.x = 0.06 * Math.sin(t * 0.9 + p.ph * 2); });
    reeds.forEach(({ im, list }) => { list.forEach((q, i) => { _o.position.set(q.x, q.y, q.z); _o.rotation.set(0.05 * Math.sin(t * 1.4 + q.ph), q.ry, 0.06 * Math.sin(t * 1.1 + q.ph * 1.7 + q.x * 0.4)); _o.scale.setScalar(q.s); _o.updateMatrix(); im.setMatrixAt(i, _o.matrix); }); im.instanceMatrix.needsUpdate = true; });

    /* bichos */
    fish.update(t, fishGone); heron.update(t);
    dflies.forEach(({ d, x, z, ph }, i) => {
      const a = t * (0.9 + i * 0.23) + ph, px = x + 0.9 * Math.sin(a) + 0.3 * Math.sin(a * 2.7), pz = z + 0.6 * Math.cos(a * 0.8) + 0.2 * Math.sin(a * 3.1), py = YW + 0.55 + 0.22 * Math.sin(a * 1.9 + i);
      const e = 0.05, a2 = a + e, qx = x + 0.9 * Math.sin(a2) + 0.3 * Math.sin(a2 * 2.7), qz = z + 0.6 * Math.cos(a2 * 0.8) + 0.2 * Math.sin(a2 * 3.1);
      d.group.position.set(px, py, pz); d.group.rotation.y = Math.atan2(-(qz - pz), qx - px); d.update(t, ph);
    });

    /* copo com sinal de proibido (preso à câmera) */
    const gk = pulse(t, 89.2, 90.62, 0.3, 0.22), gIn = ease.back(prog(t, 89.2, 89.6)), gOut = ease.in(prog(t, 90.38, 90.64));
    glassK.group.visible = gk > 0.001;
    if (glassK.group.visible) {
      cam.getWorldDirection(fwd); upv.set(0, 1, 0).applyQuaternion(cam.quaternion);
      const f = Math.tan((cam.fov * Math.PI) / 360) / Math.tan((35 * Math.PI) / 360), d = 1.7;
      glassK.group.position.copy(cam.position).addScaledVector(fwd, d).addScaledVector(upv, f * (-0.05 - 0.95 * (1 - gIn) - 1.0 * gOut));
      glassK.group.quaternion.copy(cam.quaternion); glassK.group.scale.setScalar(f * 1.0);
      glassK.cup.rotation.set(0.1, t * 0.9, 0.06 * Math.sin(t * 3));
      const sk = ease.back(prog(t, 89.5, 89.85)); glassK.sign.scale.setScalar(Math.max(0.001, sk) * (1 + 0.05 * Math.sin(t * 9) * sstep(89.85, 90, t)));
      glassK.sign.rotation.z = (1 - sk) * -1.2;
    }

    /* recapitulação: linha e setas da casa ao rio */
    const headA = ease.io(prog(t, 93.45, 95.15));
    lineA.visible = headA > 0.003; lineA.geometry.setDrawRange(0, Math.floor(headA * SEG) * RAD * 6);
    chevA.update(t, { speed: 0.085, head: headA, amount: sstep(93.5, 94.1, t) });

    /* revelação: bairro B, sem tratamento */
    B.streetPivot.scale.set(1, 1, Math.max(0.001, ease.out(prog(t, 95.65, 96.2)))); B.streetPivot.visible = t > 95.65;
    B.houses.forEach((h) => { const k = ease.back(prog(t, 95.8 + h.i * 0.1, 96.25 + h.i * 0.1)); h.hg.scale.setScalar(Math.max(0.001, k)); h.hg.visible = k > 0.002; });
    const mk = sstep(96.1, 96.6, t);
    [A, B].forEach((T) => {
      T.markM.opacity = mk; T.markM.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 5);
      T.br.visible = mk > 0.01;
      T.houses.forEach((h) => { h.frame.visible = h.drop.visible = mk > 0.01; h.drop.position.y = 3.35 + 0.14 * Math.sin(t * 2.4 + h.i); h.drop.rotation.y = t * 1.5; h.drop.scale.setScalar(2.4 * ease.back(prog(t, 96.1 + h.i * 0.05, 96.5 + h.i * 0.05))); });
    });
    const headB = ease.io(prog(t, 96.4, 96.9));
    lineB.visible = headB > 0.01; lineB.geometry.setDrawRange(0, Math.floor(headB * 60) * RAD * 6);
    chevB.update(t, { speed: 0.09, head: clamp01(0.27 * headB + 0.73 * creekHead * 1.15), amount: sstep(96.5, 97.0, t) });

    /* rótulos */
    ui.label('rio-a', 'Água tratada', [XA, 0.75, -0.2], pulse(t, 87.95, 89.2, 0.25, 0.2), { cls: 'good', stem: 40 });
    if (glassK.group.visible) { tmp.copy(glassK.group.position).addScaledVector(upv, 0.37 * glassK.group.scale.x); ui.label('rio-b', 'Não é potável', tmp, pulse(t, 89.6, 90.5, 0.2, 0.15), { cls: 'warn', stem: 0 }); }
    ui.label('rio-c', 'Limpa pra natureza', [-4.95, YW + 0.1, Z1], pulse(t, 91.25, 93.05, 0.25, 0.2), { cls: 'good', stem: 60 });
    ui.label('rio-d', 'Seu banheiro', [-9.15, 2.6, -17.2], pulse(t, 93.75, 95.55, 0.25, 0.2), { cls: 'accent', stem: 40 });
    ui.label('rio-e', 'Rio', [-8.5, YW + 0.2, 3.2], pulse(t, 94.7, 95.55, 0.25, 0.2), { stem: 40 });
    ui.label('rio-f', 'Tratado', [-6, 1.6, -8], pulse(t, 96.3, 97.75, 0.25, 0.25), { cls: 'good', stem: 40 });
    ui.label('rio-g', 'Sem tratamento', [5.2, 0.6, -7.5], pulse(t, 96.6, 99.3, 0.25, 0.3), { cls: 'warn', stem: 40 });
    // manchete fixa no alto da tela (ponto 3D calculado a partir da câmera)
    cam.getWorldDirection(fwd); upv.set(0, 1, 0).applyQuaternion(cam.quaternion); rgt.crossVectors(fwd, upv);
    const th = Math.tan((cam.fov * Math.PI) / 360) * 10;
    tmp.copy(cam.position).addScaledVector(fwd, 10).addScaledVector(upv, th * 0.705).addScaledVector(rgt, th * (9 / 16) * -0.04);
    ui.label('rio-h', 'Cerca de metade', tmp, pulse(t, 97.7, 101.0, 0.3, 0.3), { cls: 'warn big', stem: 0 });
    ui.label('rio-i', 'Esgoto bruto', [XB + 0.2, -0.2, 0.2], pulse(t, 99.9, 101.0, 0.3, 0.3), { cls: 'warn', stem: 36 });
  }
  return { scene, ao: { radius: 0.5 }, update };
}
