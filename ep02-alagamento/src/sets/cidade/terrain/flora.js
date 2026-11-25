// Vegetação do terreno: mata do vale (derrubada com S.build.clear, em sequência da esquerda p/ a direita),
// mata do morro (preservada), mata ciliar da margem oposta, arbustos, capim, taboas e pedras do rio.
import * as L from '../../../lib.js';
import { treeGeo, tallTreeGeo, bushGeo, tuftGeo, reedGeo, rockGeo, vmat } from './util.js';
const { THREE, clamp01, sstep, lerp, TAU } = L;

const _o = new THREE.Object3D(), _q = new THREE.Quaternion(), _ax = new THREE.Vector3(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

export function buildFlora(ctx, gr) {
  const { Lo, scene, shared } = ctx;
  const { X0, X1, Z0, ZF } = Lo;
  const grp = new THREE.Group(); scene.add(grp);
  const rd = L.rng(2024);
  const inRect = (r, x, z, m = 0) => x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m;
  const forest = shared.forestDensity;
  const dly = (x, z) => Math.max(0, 0.5 * clamp01((x - X0) / (26 - X0)) + 0.06 * (0.5 * Math.sin(x * 3.1 * 2.2 + z * 2.7 * 2.0) + 0.5 * Math.sin(x * 0.63 * 3.1 - z * 1.31 * 2.7 + 1.7)));
  const yNat = (x, z) => Lo.Gnat(x, z);
  const free = (x, z, m = 0) => !inRect(Lo.PLAZA, x, z, 0.6 + m) && Lo.creekCut(x, z) <= 0 && Lo.creekCut(x, z - 1.2 - m) <= 0 && x > X0 + 1.2 + m && x < X1 - 1 - m && z > Z0 + 1.2 + m && z < ZF - 1.0 - m;

  /* ---------- árvores ---------- */
  const tGeos = [treeGeo(0, 1), treeGeo(0, 2), treeGeo(0, 3), treeGeo(0, 4), treeGeo(1, 5), tallTreeGeo(6), tallTreeGeo(7)];
  const tmat = vmat({ roughness: 0.85 });
  const trees = []; // {v, x, y, z, s, ry, keep, d, fa}
  const addTree = (x, z, s, keep, v = null) => {
    const r = rd(); v = v ?? (r < 0.05 ? 4 : r < 0.3 ? 5 + Math.floor(rd() * 2) : Math.floor(rd() * 4));
    trees.push({ v, x, y: yNat(x, z) - 0.05, z, s, ry: rd() * TAU, keep, d: dly(x, z), fa: rd() * TAU });
  };
  // vale (derrubada): grade com sorteio pela densidade da mata
  for (let gx = X0 + 1.5; gx < 25.9; gx += 2.7) for (let gz = Z0 + 1.5; gz < ZF - 1.5; gz += 2.7) {
    const x = gx + (rd() - 0.5) * 2.2, z = gz + (rd() - 0.5) * 2.2;
    if (inRect(Lo.HILL_FOREST, x, z, 0.5)) continue;
    const riparian = sstep(21.5, 23.5, x) * (1 - sstep(25.2, 25.9, x));
    const p = Math.max(Math.pow(forest(x, z), 1.4), riparian * 0.85, 0.06);
    if (rd() > p || !free(x, z, 0.4) || z > ZF - 3.2 && rd() < 0.75) continue;
    addTree(x, z, 1.35 + rd() * 0.75, false);
  }
  // morro (preservado): denso
  const HF = Lo.HILL_FOREST;
  for (let gx = HF.x0 + 1.4; gx < HF.x1 - 0.6; gx += 2.3) for (let gz = HF.z0 + 1.4; gz < HF.z1 - 0.4; gz += 2.3) {
    const x = gx + (rd() - 0.5) * 1.6, z = gz + (rd() - 0.5) * 1.6;
    if (!free(x, z)) continue;
    addTree(x, z, 1.55 + rd() * 0.8, true);
  }
  // margem oposta (mata ciliar preservada)
  for (let gz = Z0 + 1.3; gz < ZF - 1.0; gz += 2.2) for (const bx of [40.6, 42.6]) {
    const x = bx + (rd() - 0.5) * 1.0, z = gz + (rd() - 0.5) * 1.4;
    if (rd() < 0.15) continue;
    addTree(x, z, 1.25 + rd() * 0.6, true);
  }
  const valleyIM = []; // malhas da mata do vale: somem inteiras quando a derrubada termina (não custam nada depois)
  const mkIM = (geo, list, cast) => {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, tmat, list.length);
    im.castShadow = cast; im.receiveShadow = true; im.frustumCulled = false; grp.add(im);
    list.forEach((t, i) => { t.im = im; t.i = i; });
    if (!list[0].keep) valleyIM.push(im);
    return im;
  };
  tGeos.forEach((g, v) => [true, false].forEach((kp) => mkIM(g, trees.filter((t) => t.v === v && t.keep === kp), true)));
  const placeTree = (t, k) => {
    // k: 0 = em pé … 1 = caída e sumida. Cai girando em torno da base, depois encolhe e afunda
    const f = L.ease.in(clamp01(k / 0.55)), s = t.s * (1 - sstep(0.55, 1, k));
    _ax.set(Math.cos(t.fa), 0, Math.sin(t.fa)); _q.setFromAxisAngle(_ax, f * 1.42);
    const rq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.ry); _q.multiply(rq);
    _p.set(t.x, t.y - (1 - s / t.s) * 0.4 - f * 0.05, t.z); _s.setScalar(Math.max(1e-4, s));
    _m.compose(_p, _q, _s); t.im.setMatrixAt(t.i, _m);
  };
  trees.forEach((t) => placeTree(t, 0));

  /* ---------- arbustos, capim ---------- */
  const bGeos = [bushGeo(1, '#1f5f2a', '#5fae45'), bushGeo(2, '#2a5a24', '#7aa83e'), bushGeo(3, '#1d5530', '#56a456')];
  const fGeos = [tuftGeo(1), tuftGeo(2, '#4f8f34', '#b6d870'), tuftGeo(3, '#3f8a3a', '#8fcf5a', 8)];
  const small = []; // {kind:'b'|'f', v, x, y, z, s, ry, keep, d, tilt}
  const addSmall = (kind, x, z, s, keep, tilt = 0) => small.push({ kind, v: Math.floor(rd() * 3), x, y: yNat(x, z) - 0.03, z, s, ry: rd() * TAU, keep, d: dly(x, z), tilt });
  for (let i = 0; i < 520; i++) { // arbustos: sub-bosque e bordas da mata
    const x = lerp(X0 + 1, 25.8, rd()), z = lerp(Z0 + 1, ZF - 1.2, rd()), f = forest(x, z);
    if (rd() > 0.25 + f * 0.75 || !free(x, z, -0.6)) continue;
    addSmall('b', x, z, 0.8 + rd() * 0.9, inRect(HF, x, z));
  }
  for (let i = 0; i < 60; i++) { const x = lerp(39.8, 43.6, rd()), z = lerp(Z0 + 1, ZF - 0.8, rd()); addSmall('b', x, z, 1.0 + rd(), true); }
  for (let i = 0; i < 2600; i++) { // capim do campo (mais perto da frente, onde a câmera chega perto)
    const front = rd() < 0.62, x = lerp(X0 + 0.4, front ? 18 : 25.8, rd()), z = front ? lerp(17, ZF - 0.45, Math.sqrt(rd())) : lerp(Z0 + 0.6, ZF - 0.5, rd());
    if (Lo.creekCut(x, z) > 0 || inRect(Lo.PLAZA, x, z, 0.4) || z > ZF - 0.4) continue;
    addSmall('f', x, z, 1.2 + rd() * 1.4, inRect(HF, x, z));
  }
  // franja de capim debruçada sobre a borda do corte
  for (let x = X0 + 0.15; x < 26; x += 0.16 + rd() * 0.12) {
    const z = ZF - 0.04 - rd() * 0.22;
    if (Lo.creekCut(x, z) > 0 || Lo.creekCut(x, ZF) > 0.01) continue;
    addSmall('f', x, z, 1.4 + rd() * 1.2, false, 0.5 + rd() * 0.4);
  }
  for (let i = 0; i < 500; i++) { const x = lerp(39.6, 43.8, rd()), z = lerp(Z0 + 0.4, ZF - 0.3, rd()); addSmall('f', x, z, 1.3 + rd(), true); }
  for (let x = 39.7; x < X1 - 0.1; x += 0.2 + rd() * 0.1) addSmall('f', x, ZF - 0.05 - rd() * 0.2, 1.5 + rd(), true, 0.6);
  for (const kind of ['b', 'f']) (kind === 'b' ? bGeos : fGeos).forEach((g, v) => [true, false].forEach((kp) => mkIM(g, small.filter((s) => s.kind === kind && s.v === v && s.keep === kp), kind === 'b')));
  const placeSmall = (s, k) => {
    const sc = s.s * (1 - sstep(0.0, 0.7, k));
    _o.position.set(s.x, s.y - (1 - sc / s.s) * 0.1, s.z); _o.rotation.set(s.tilt, s.tilt ? 0 : s.ry, 0, 'XYZ'); _o.scale.setScalar(Math.max(1e-4, sc));
    _o.updateMatrix(); s.im.setMatrixAt(s.i, _o.matrix);
  };
  small.forEach((s) => placeSmall(s, 0));

  /* ---------- rio: taboas e pedras nas margens ---------- */
  const reed = reedGeo(3), reeds = [];
  const okBank = (x, z) => z > Z0 + 0.6 && z < ZF - 0.4 && !(x < 30 && z > ZF - 4.2);
  for (let i = 0; i < 90; i++) {
    const near = i % 2 === 0, x = near ? lerp(27.75, 28.3, rd()) : lerp(37.1, 37.75, rd()), z = lerp(Z0 + 0.8, ZF - 0.6, rd());
    if (!okBank(x, z)) continue;
    reeds.push([x, gr.hAt(x, z) - 0.05, z, 1.1 + rd() * 0.8, rd() * TAU]);
  }
  const reedIM = L.scatter(reed, tmat, reeds.length, (i, r, d) => { const q = reeds[i]; d.position.set(q[0], q[1], q[2]); d.rotation.y = q[4]; d.scale.setScalar(q[3]); }, 5);
  grp.add(reedIM);
  const rocks = [];
  for (let i = 0; i < 300; i++) {
    const near = rd() < 0.5, x = near ? lerp(26.6, 29.4, rd()) : lerp(36.0, 38.9, rd()), z = lerp(Z0 + 0.5, ZF - 0.35, rd());
    if (!okBank(x, z)) continue;
    rocks.push([x, z, 0.14 + Math.pow(rd(), 2) * 0.5, rd()]);
  }
  for (let i = 0; i < 60; i++) rocks.push([lerp(29.5, 35.5, rd()), lerp(Z0 + 0.5, ZF - 0.5, rd()), 0.15 + rd() * 0.3, rd()]);
  const rmat = L.mat(0xffffff, { roughness: 0.88, flatShading: true });
  const rockIM = L.scatter(rockGeo(4), rmat, rocks.length, (i, r, d) => {
    const q = rocks[i], s = q[2]; d.position.set(q[0], gr.hAt(q[0], q[1]) - s * 0.25, q[1]); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * (0.9 + r() * 0.5), s * (0.6 + r() * 0.3), s * (0.8 + r() * 0.5));
    return new THREE.Color(['#8d9199', '#a19a8c', '#77736c', '#9b8f7d'][Math.floor(q[3] * 4)]).offsetHSL(0, 0, (r() - 0.5) * 0.1);
  }, 8);
  grp.add(rockIM);

  /* ---------- atualização ---------- */
  let lastK = -1;
  function update(t, S) {
    const c = Math.round(S.build.clear * 600) / 600;
    if (c === lastK) return; lastK = c;
    const touched = new Set();
    const on = c < 0.999;
    valleyIM.forEach((im) => { im.visible = on; });
    if (!on) return;
    for (const tr of trees) if (!tr.keep) { placeTree(tr, clamp01((c - tr.d) / 0.44)); touched.add(tr.im); }
    for (const s of small) if (!s.keep) { placeSmall(s, clamp01((c - s.d) / 0.44)); touched.add(s.im); }
    touched.forEach((im) => { im.instanceMatrix.needsUpdate = true; });
  }
  return { update, trees, small, grp };
}
