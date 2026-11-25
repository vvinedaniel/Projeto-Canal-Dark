// Cenário eteB — 65.04 → 86.76 s: sujeira dissolvida, bactérias + aeração, decantador secundário, biodigestores e energia.
import { makeKit } from './eteB/kit.js';
import { buildMicro } from './eteB/micro.js';
import { buildAer, buildBeaker } from './eteB/aer.js';
import { buildClar } from './eteB/clar.js';
import { buildDig } from './eteB/dig.js';
import { buildEnergy } from './eteB/energy.js';

export function create(L, { PH, def }) {
  const { THREE, PAL, TAU } = L;
  const K = makeKit(L), m = K.m;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 16, fogNear: 70, fogFar: 260 });
  const backdrop = scene.children.find((o) => o.isMesh && o.renderOrder === -10);
  const bgCol = new THREE.Color(PAL.bg);

  /* ---------- tempos ---------- */
  const T0 = def.t0, T1 = def.t1;
  const C1 = 67.95, C2 = 70.5, C3 = 72.72, C4 = 74.62;        // cortes internos (macro↔micro)
  const T = { eat0: C3, eat1: C4, sludge: 79.4, gas: 81.4, power: 83.9 };
  const MO = L.V(0, 300, 0);                                  // origem do mundo microscópico

  /* ---------- mundo macro ---------- */
  const macro = L.group(scene);
  const CX = 22, CZ = -2, YB = -15;
  const aer = buildAer(L, K); macro.add(aer.group);
  const beaker = buildBeaker(L, K); beaker.group.scale.setScalar(0.72); macro.add(beaker.group);
  const clar = buildClar(L, K, { CX, CZ, T }); macro.add(clar.group);
  const dig = buildDig(L, K, { CX, CZ, T, clarOutlet: clar.outlet }); macro.add(dig.group);
  const en = buildEnergy(L, K, { CX, CZ, T, dig }); macro.add(en.group);

  // --- terreno: placa em L com entalhes para os tanques ---
  {
    const pts = [[-16, -27], [80, -27], [80, CZ], [74.05, CZ], [74.05, CZ - 2.05], [71.75, CZ - 2.05], [71.75, CZ], [45.75, CZ]];
    for (let i = 1; i < 20; i++) { const a = -(i / 20) * Math.PI; pts.push([42 + Math.cos(a) * 3.75, CZ + Math.sin(a) * 3.75]); }
    pts.push([38.25, CZ], [CX + 7.9, CZ]);
    for (let i = 1; i <= 48; i++) { const a = -(i / 48) * Math.PI * 1.5; pts.push([CX + Math.cos(a) * 7.9, CZ + Math.sin(a) * 7.9]); }
    pts.push([CX, 8], [6.2, 8], [6.2, -14.05], [-8.95, -14.05], [-8.95, 8], [-16, 8]);
    const grass = L.extrude(pts.map((p) => [p[0], -p[1]]), 0.14, m.grass); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.14; grass.castShadow = false; macro.add(grass);
    const f1 = L.soilWall({ x0: -16, x1: CX, y0: YB, y1: -0.14, z: 8, depth: 35, seed: 4, holes: [[[-8.95, 0], [-8.95, -1.25], [-7.05, -1.25], [-7.05, -0.3], [-6.2, -0.3], [-6.2, -4.6], [6.2, -4.6], [6.2, 0]]] });
    f1.remove(f1.children[2]); macro.add(f1);
    const fa = L.soilWall({ x0: -8, x1: 2, y0: YB, y1: -0.14, z: 0, depth: 1, seed: 6, holes: [clar.profileOuter.filter((p) => p[1] <= 0.001).map((p) => [2 - p[0], Math.min(0, p[1])])] });
    [3, 2, 1].forEach((i) => fa.remove(fa.children[i]));
    const holesB = [clar.profileOuter.map((p) => [CX + p[0], p[1]]), ...dig.holes, ...en.holes]; fa.rotation.y = Math.PI / 2; fa.position.set(CX, 0, 0); macro.add(fa);
    const fb = L.soilWall({ x0: CX, x1: 80, y0: YB, y1: -0.14, z: CZ, depth: 25, seed: 12, holes: [clar.profileOuter.filter((p) => p[1] <= 0.001).map((p) => [CX + p[0], Math.min(0, p[1])]), ...dig.holes, ...en.holes] });
    // pedras nas faces de corte (fora dos furos)
    const inPoly = (x, y, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
    const rocks = (n, x0, x1, polys, place, seed) => macro.add(L.scatter(new THREE.IcosahedronGeometry(1, 0), L.mat(PAL.rock, { roughness: 0.9, flatShading: true }), n, (i, r, d) => {
      let x, y, ok, k = 0; const s0 = 0.14 + r() * 0.2;
      do { x = L.lerp(x0 + 0.5, x1 - 0.5, r()); y = L.lerp(YB + 0.4, -0.9, Math.pow(r(), 1.3)); ok = ![[0, 0], [0.7, 0], [-0.7, 0], [0, 0.7], [0, -0.7]].some((o) => polys.some((pl) => inPoly(x + o[0], y + o[1], pl))); } while (!ok && ++k < 40);
      const s = ok ? s0 : 0; place(d, x, y, s); d.rotation.set(r() * 6, r() * 6, r() * 6); d.scale.set(s * (0.8 + r() * 0.6), s * (0.6 + r() * 0.5), s * 0.8);
      return new THREE.Color(PAL.rock).offsetHSL(0, 0, (r() - 0.5) * 0.16);
    }, seed));
    rocks(44, -16, CX, [[[-9.2, 0], [-9.2, -1.5], [-6.4, -1.5], [-6.4, -4.9], [6.4, -4.9], [6.4, 0]]], (d, x, y, s) => d.position.set(x, y, 8 - s * 0.15), 31);
    rocks(70, CX, 80, holesB, (d, x, y, s) => d.position.set(x, y, CZ - s * 0.15), 32);
    rocks(7, CZ + 0.5, 8, [clar.profileOuter.map((p) => [CZ + p[0], p[1]])], (d, x, y, s) => d.position.set(CX - s * 0.15, y, x), 33);
    const sideM = fb.children[2].material; fb.remove(fb.children[2]); fb.remove(fb.children[1]); macro.add(fb);
    { // lateral direita da placa, com o entalhe do tubo de saída
      const py = en.PY - 0.14, sp = [[0, YB], [25, YB], [25, -0.14], [0, -0.14], [0, py + en.PR]];
      for (let i = 1; i < 16; i++) { const a = Math.PI / 2 - (i / 16) * Math.PI; sp.push([Math.cos(a) * en.PR, py + Math.sin(a) * en.PR]); }
      sp.push([0, py - en.PR]);
      const sh = new THREE.Shape(sp.map((p) => new THREE.Vector2(p[0], p[1])));
      const side = L.mesh(new THREE.ShapeGeometry(sh), sideM, 80, 0, CZ, { cast: false }); side.rotation.y = Math.PI / 2; macro.add(side);
    }
    // pisos e ruas
    const road = K.wbox(4.6, 0.05, 35, m.asphalt, 11.2, 0.025, -9.5); road.castShadow = false; macro.add(road);
    const dash = []; for (let z = -25; z < 7; z += 3) dash.push(K.boxG(0.14, 0.012, 1.4, [11.2, 0.056, z])); macro.add(K.M(dash, L.mat('#f4f0e2', { roughness: 0.8 }), { cast: false }));
    macro.add(K.M([K.boxG(0.18, 0.14, 35, [8.85, 0.07, -9.5]), K.boxG(0.18, 0.14, 35, [13.55, 0.07, -9.5])], m.concrete));
    macro.add(K.wbox(2.4, 0.04, 22, m.paving, 7.5, 0.02, -3, { cast: false }), K.wbox(2.2, 0.04, 22, m.paving, -10.1, 0.02, -3, { cast: false }), K.wbox(16, 0.04, 2.2, m.paving, -1.4, 0.02, -15.2, { cast: false }));
    const road2 = K.wbox(66, 0.05, 3.6, m.asphalt, 47, 0.025, -24.2); road2.castShadow = false; macro.add(road2);
    // árvores e postes de luz no fundo
    [[-13, -24], [-12, -17], [-13.5, -9], [-13, 0], [-9, -21], [17, -22], [15.8, -13.5], [26, -22], [40, -22], [-12.5, 5]].forEach((p, i) => { const tr = K.tree(3.6 + (i % 3) * 0.9, 20 + i); tr.position.set(p[0], 0, p[1]); macro.add(tr); });
  }
  L.shadows(macro);
  macro.traverse((o) => { if (o.isMesh && (o.material.transparent || o.userData.noShadow)) o.castShadow = false; });

  /* ---------- mundo micro ---------- */
  const micro = buildMicro(L, K, T); micro.group.position.copy(MO); scene.add(micro.group);

  /* ---------- câmeras ---------- */
  const BK = L.V(-8.0, 2.25, 3.4); // posição final do béquer (base)
  const rail1 = L.camRail([
    { t: T0, p: [-8.05, 2.5, 13.2], l: [-8.0, 0.9, 3.4], fov: 42 },
    { t: 65.75, p: [-9.2, 2.9, 7.6], l: [-8.0, 1.9, 3.4], fov: 40 },
    { t: 66.45, p: [-10.0, 3.25, 3.3], l: [-8.0, 2.42, 3.4], fov: 37 },
    { t: 67.45, p: [-9.55, 3.15, 1.95], l: [-8.0, 2.42, 3.4], fov: 35 },
    { t: C1 + 0.1, p: [-8.2, 2.62, 3.2], l: [-7.9, 2.38, 3.5], fov: 35 }
  ], { drift: 0.006 });
  const mo = (p) => [p[0] + MO.x, p[1] + MO.y, p[2] + MO.z];
  const rail2 = L.camRail([
    { t: C1 - 0.1, p: mo([0.2, 0.6, 9.5]), l: mo([0.6, -0.2, -6]), fov: 46 },
    { t: 69.2, p: mo([0.45, 0.4, 4.6]), l: mo([0.3, 0.0, -8]), fov: 44 },
    { t: C2 + 0.1, p: mo([0.1, 0.1, 0.8]), l: mo([-0.6, 0.6, -10]), fov: 42 }
  ], { drift: 0.01 });
  const rail3 = L.camRail([
    { t: C2 - 0.1, p: [0.6, 8.2, 31], l: [0.2, -2.0, 2], fov: 44 },
    { t: 71.6, p: [1.0, 5.6, 27], l: [0.3, -2.2, 4], fov: 44 },
    { t: C3 + 0.1, p: [1.6, 3.9, 24], l: [0.5, -2.1, 6], fov: 43 }
  ], { drift: 0.006 });
  const rail3b = L.camRail([
    { t: C3 - 0.1, p: mo([62.2, 1.8, 16.5]), l: mo([60, -0.9, 0]), fov: 44 },
    { t: C4 + 0.1, p: mo([58.8, 0.4, 11.0]), l: mo([60, -0.8, 0]), fov: 40 }
  ], { drift: 0.01 });
  const rail4 = L.camRail([
    { t: C4 - 0.1, p: [45, 19, 21], l: [23.5, -1.2, -1.0], fov: 42 },
    { t: 76.2, p: [38.5, 9.5, 14.5], l: [25.5, -1.6, -1.2], fov: 40 },
    { t: 77.8, p: [34.4, 3.6, 7.2], l: [28.6, -0.9, -2.4], fov: 38 },
    { t: 78.9, p: [33.4, 2.7, 7.6], l: [28.3, -1.3, -2.3], fov: 38 },
    { t: 80.1, p: [29.5, -2.0, 23], l: [27, -6.8, -2], fov: 40 },
    { t: 81.1, p: [34, -3.0, 23], l: [33.8, -7.4, -2], fov: 40 },
    { t: 82.2, p: [41, 5.5, 38], l: [41.6, 3.0, -2], fov: 40 },
    { t: 83.5, p: [46, 9.5, 37], l: [47.5, 7.0, -3], fov: 40 },
    { t: 84.5, p: [63.5, 6.5, 22], l: [65.2, 1.0, -8], fov: 40 },
    { t: 85.6, p: [68, 5.2, 20], l: [67.6, 0.4, -8], fov: 40 },
    { t: T1 + 0.05, p: [77, -0.8, 11], l: [84.5, -3.6, -2], fov: 40 }
  ], { drift: 0.006 });

  const fogM = new THREE.Color(PAL.bg), _v = new THREE.Vector3(), _f = new THREE.Vector3();
  const cutDark = (t, c, w = 0.2) => 1 - L.sstep(0.02, w, Math.abs(t - c));

  function update(t, camera, ui) {
    const inMicro = (t >= C1 && t < C2) || (t >= C3 && t < C4);
    macro.visible = !inMicro; micro.group.visible = inMicro; backdrop.visible = !inMicro;
    // cortes macro↔micro: dissolve em zoom feito pelo motor (timeline CUTS); a lente marca o mundo microscópico
    if (inMicro) ui.lens(t < C2 ? L.sstep(C1 + 0.15, C1 + 0.6, t) * (1 - L.sstep(C2 - 0.25, C2, t)) : L.sstep(C3 + 0.15, C3 + 0.6, t) * (1 - L.sstep(C4 - 0.25, C4, t)));
    let look;
    if (inMicro) {
      const st = micro.update(t);
      look = (t < C2 ? rail2 : rail3b)(t, camera);
      scene.background.copy(st.fogCol); scene.fog.color.copy(st.fogCol); scene.fog.near = 5; scene.fog.far = 40 + 12 * st.clear;
      rig.focus(look.x, look.y, look.z + (t < C2 ? 2 : 0), 13);
      rig.hemi.intensity = 1.5; rig.sun.intensity = 3.0;
      if (t < C2) {
        camera.getWorldDirection(_f); _v.copy(camera.position).addScaledVector(_f, 10).addScaledVector(camera.up, 2.35);
        ui.label('bact', 'Bilhões de bactérias', _v, L.pulse(t, 68.25, C2 - 0.05, 0.3, 0.2), { cls: 'big', stem: 0 });
      } else {
        camera.getWorldDirection(_f); _v.copy(camera.position).addScaledVector(_f, 10).addScaledVector(camera.up, 2.5);
        ui.label('eat', 'Comem a sujeira', _v, L.pulse(t, C3 + 0.25, C4 - 0.05, 0.3, 0.2), { cls: 'accent', stem: 0 });
      }
      return;
    }
    scene.background.copy(bgCol); scene.fog.color.copy(fogM); scene.fog.near = 70; scene.fog.far = 260;
    rig.hemi.intensity = 1.0; rig.sun.intensity = 2.8;
    const s1 = t < C1, s3 = t >= C2 && t < C3;
    beaker.group.visible = s1;
    aer.update(t); aer.arrows(t, s3 ? L.pulse(t, C2 - 0.2, C3 + 0.2, 0.3, 0.2) : 0);
    clar.update(t); dig.update(t); en.update(t);
    if (s1) {
      const k = L.ease.out(L.prog(t, T0 - 0.15, 66.25));
      beaker.group.position.set(BK.x + Math.sin(t * 1.9) * 0.012, L.lerp(-0.42, BK.y, k) + Math.sin(t * 2.6) * 0.012, BK.z);
      beaker.group.rotation.set(Math.sin(t * 1.7) * 0.025, 3.95, (1 - k) * 0.25 + Math.sin(t * 2.1 + 1) * 0.02);
      beaker.update(t, 1 - L.sstep(66.4, 67.6, t));
      look = rail1(t, camera);
      rig.focus(look.x, look.y, look.z - 3, 12);
      _v.set(0, 0.53 * 0.72, 0).add(beaker.group.position);
      ui.label('diss', 'Sujeira dissolvida', _v, L.pulse(t, 66.2, C1 - 0.2, 0.3, 0.2), { cls: 'warn', stem: 70 });
    } else if (s3) {
      look = rail3(t, camera);
      rig.focus(0, 0, 0, 22);
      ui.label('ar', 'Ar', [0, 2.1, 1.6], L.pulse(t, C2 + 0.25, C3 - 0.05, 0.25, 0.2), { cls: 'accent big', stem: 60 });
    } else {
      look = rail4(t, camera);
      rig.focus(look.x, 0, look.z - 4, t < 79 ? 17 : 22);
      const lb = clar.labelPos, lg = dig.labelPos;
      ui.label('afunda', 'Bactérias afundam', clar.sinkPos, L.pulse(t, 75.2, 77.45, 0.3, 0.25), { stem: 40 });
      ui.label('clara', 'Água clara', lb, L.pulse(t, 77.55, 79.5, 0.3, 0.3), { cls: 'good', stem: 90 });
      ui.label('lodo', 'Lodo', dig.sludgeLabel, L.pulse(t, 79.85, 80.85, 0.3, 0.25), { stem: 50 });
      ui.label('gas', 'Biogás', lg, L.pulse(t, 82.45, 84.0, 0.3, 0.3), { cls: 'accent', stem: 60 });
      ui.label('en', 'Energia', en.labelPos, L.pulse(t, 84.45, 85.65, 0.3, 0.25), { cls: 'accent big', stem: 70 });
    }
  }
  return { scene, ao: { radius: 0.6 }, update };
}
