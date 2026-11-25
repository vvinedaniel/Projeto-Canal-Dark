// Máquinas pequenas da obra do pavimento permeável: mini-carregadeira (skid steer) e rolo compactador tandem.
// Ambas apontam para +x, origem no chão entre as rodas.
import { TM, G, Merge, vmat } from './kit.js';

export function skidSteer(L) {
  const { THREE } = L, Y = '#f2b705', K = '#22272c', D = '#3a4148';
  const g = new THREE.Group(), m = vmat({ roughness: 0.45, metalness: 0.15 });
  const b = new Merge();
  b.add(G.rbox(1.75, 0.55, 1.12, 0.06), Y, TM(-0.05, 0.62, 0));                    // chassi
  b.add(G.box(1.8, 0.12, 1.16), K, TM(-0.05, 0.36, 0));                             // saia inferior
  [0.56, -0.56].forEach((z) => b.add(G.rbox(0.95, 0.85, 0.14, 0.04), Y, TM(-0.45, 1.25, z)));   // torres dos braços
  b.add(G.rbox(0.55, 0.65, 1.0, 0.05), Y, TM(-0.72, 1.1, 0));                       // motor traseiro
  for (let i = 0; i < 5; i++) b.add(G.box(0.02, 0.36, 0.7), K, TM(-1.0, 0.95 + i * 0.0, -0.32 + i * 0.16, 0, Math.PI / 2, 0, 1, 1, 0.08)); // grelha
  b.add(G.box(0.03, 0.42, 0.78), D, TM(-1.0, 1.05, 0));
  // cabine (estrutura ROPS + vidros)
  const post = (x, z) => b.rod([x, 0.9, z], [x, 1.95, z], 0.035, K, 6);
  post(0.45, 0.42); post(0.45, -0.42); post(-0.3, 0.42); post(-0.3, -0.42);
  b.add(G.rbox(0.92, 0.07, 0.98, 0.03), K, TM(0.08, 1.98, 0));
  for (let i = 0; i < 4; i++) b.add(G.box(0.02, 0.85, 0.02), K, TM(0.46, 1.45, -0.3 + i * 0.2));    // grade frontal
  b.add(G.box(0.5, 0.36, 0.06), '#1b2026', TM(0.12, 1.28, 0)); b.add(G.box(0.36, 0.08, 0.5), '#2c3238', TM(0.05, 1.05, 0)); // banco
  b.add(G.box(0.1, 0.08, 0.16), '#fff6d8', TM(0.48, 1.9, 0.35)).add(G.box(0.1, 0.08, 0.16), '#fff6d8', TM(0.48, 1.9, -0.35));
  // rodas
  [[0.5, 0.68], [0.5, -0.68], [-0.55, 0.68], [-0.55, -0.68]].forEach(([x, z]) => {
    b.add(G.cyl(0.32, 0.32, 0.26, 18), '#15191d', TM(x, 0.32, z, Math.PI / 2, 0, 0));
    b.add(G.cyl(0.17, 0.17, 0.28, 10), '#c9ced3', TM(x, 0.32, z, Math.PI / 2, 0, 0));
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; b.add(G.box(0.07, 0.05, 0.27), '#0e1013', TM(x + Math.cos(a) * 0.31, 0.32 + Math.sin(a) * 0.31, z, 0, 0, a)); }
  });
  const body = b.mesh(m); g.add(body);
  // braços + caçamba (giram no pivô traseiro)
  const arm = L.group(g, -0.62, 1.62, 0), a = new Merge();
  [0.66, -0.66].forEach((z) => { a.beam([0, 0, z], [0.85, -0.35, z], 0.14, 0.1, Y).beam([0.85, -0.35, z], [1.32, -1.05, z], 0.14, 0.1, Y); a.rod([1.32, -1.05, z - 0.08], [1.32, -1.05, z + 0.08], 0.07, K, 8); });
  a.beam([0.9, -0.4, -0.66], [0.9, -0.4, 0.66], 0.1, 0.1, Y);
  a.rod([0.15, -0.5, 0.52], [1.0, -0.82, 0.52], 0.045, '#c9ced3', 6).rod([0.15, -0.5, -0.52], [1.0, -0.82, -0.52], 0.045, '#c9ced3', 6); // cilindros
  arm.add(a.mesh(m));
  const bucket = L.group(arm, 1.32, -1.05, 0), bk = new Merge();
  const side = [[0, 0.1], [0.12, -0.32], [0.62, -0.36], [0.52, -0.06], [0.18, 0.42]];
  [0.74, -0.74].forEach((z) => bk.add(G.extrude(side, 0.04), Y, TM(0, 0, z - 0.02)));
  bk.add(G.box(0.05, 0.6, 1.48), Y, TM(0.12, 0.04, 0, 0, 0, 0.35)).add(G.box(0.55, 0.05, 1.48), Y, TM(0.38, -0.35, 0, 0, 0, -0.08)).add(G.box(0.1, 0.03, 1.5), '#9aa2a9', TM(0.66, -0.36, 0));
  bucket.add(bk.mesh(m));
  const load = L.mesh(new THREE.SphereGeometry(1, 10, 6), L.mat('#8b8f93', { roughness: 0.95, flatShading: true }), 0.32, -0.12, 0);
  load.scale.set(0.28, 0.16, 0.66); bucket.add(load);
  L.shadows(g);
  /** lift 0..1 (braço), tilt (caçamba, rad), loaded 0..1 */
  const pose = (lift, tilt, loaded) => { arm.rotation.z = -0.05 + lift * 0.85; bucket.rotation.z = -arm.rotation.z + tilt; load.visible = loaded > 0.05; load.scale.set(0.28 * loaded, 0.16 * loaded, 0.66 * loaded); };
  pose(0, 0, 1);
  return { group: g, pose };
}

export function miniRoller(L) {
  const { THREE } = L, Y = '#f2b705', K = '#22272c';
  const g = new THREE.Group(), m = vmat({ roughness: 0.45, metalness: 0.2 });
  const b = new Merge();
  b.add(G.rbox(1.0, 0.5, 0.9, 0.06), Y, TM(-0.55, 0.85, 0));                         // capô do motor
  b.add(G.rbox(0.6, 0.35, 0.86, 0.05), Y, TM(0.5, 0.78, 0));                           // chassi dianteiro
  b.add(G.box(0.3, 0.2, 0.4), K, TM(0, 0.72, 0));                                      // articulação
  [0.72, -0.72].forEach((x) => { b.add(G.box(0.86, 0.08, 1.12), Y, TM(x, 0.72, 0)); [0.55, -0.55].forEach((z) => b.add(G.box(0.7, 0.3, 0.06), Y, TM(x, 0.55, z))); });
  b.add(G.box(0.42, 0.06, 0.5), '#2c3238', TM(-0.4, 1.15, 0)).add(G.box(0.08, 0.36, 0.5), '#2c3238', TM(-0.62, 1.33, 0)); // banco
  b.rod([0.15, 1.0, 0], [0.0, 1.35, 0], 0.025, K, 6).add(G.torus(0.16, 0.02, 6, 16), K, TM(-0.02, 1.37, 0, Math.PI / 2 - 0.4, 0, 0));
  [0.45, -0.45].forEach((z) => b.rod([-0.85, 1.05, z], [-0.85, 2.0, z], 0.035, K, 6)); b.rod([-0.85, 2.0, -0.47], [-0.85, 2.0, 0.47], 0.035, K, 6);
  for (let i = 0; i < 4; i++) b.add(G.box(0.02, 0.3, 0.6), K, TM(-1.06, 0.85, 0, 0, 0, 0, 1, 1, 1));
  b.add(G.cyl(0.03, 0.03, 0.35, 6), K, TM(-0.9, 1.25, 0.32));
  const body = b.mesh(m); g.add(body);
  const drums = [0.72, -0.72].map((x) => { const d = L.cyl(0.36, 0.36, 1.0, L.metal('#b7bec5', { roughness: 0.4 }), x, 0.36, 0, 24); d.rotation.x = Math.PI / 2; g.add(d); return d; });
  L.shadows(g);
  return { group: g, roll: (a) => drums.forEach((d) => { d.rotation.y = a; }) };
}
