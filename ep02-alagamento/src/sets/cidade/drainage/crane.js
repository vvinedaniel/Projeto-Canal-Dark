// Caminhão-guindaste (munck) que desce as aduelas da galeria: cabine, chassi de 3 eixos, carroceria com aduelas,
// torre giratória, lança articulada (2 trechos + cilindros hidráulicos), patolas, cabo, moitão e lingas.
// Anda pela faixa da frente da rua A acompanhando a frente de montagem (derivada de S.build.gallery).
export function buildCrane(ctx, K, gal) {
  const { L, THREE, Lo, scene } = ctx, { C, ZF } = K, { PAL } = L;
  const M = K.M, yellow = L.glossy('#f2b51d', { roughness: 0.35 }), dark = M('#1c2228', { roughness: 0.7 }), tire = M('#15191d', { roughness: 0.92 });
  const glassM = M('#2a4a63', { roughness: 0.1, metalness: 0.5 }), white = M('#eef1f3', { roughness: 0.5 }), red = M('#c23a2e', { roughness: 0.5 });
  const truck = L.group(scene), body = L.group(truck);
  // chassi e rodas
  body.add(L.box(7.6, 0.28, 0.9, dark, -0.3, 0.75, 0));
  [[3.1], [-1.7], [-2.95]].forEach(([x]) => [1, -1].forEach((s) => {
    body.add(L.cyl(0.5, 0.5, 0.34, tire, x, 0.5, s * 1.02, 22).rotateX(Math.PI / 2), L.cyl(0.28, 0.28, 0.36, L.metal(PAL.steel), x, 0.5, s * 1.03, 12).rotateX(Math.PI / 2));
  }));
  body.add(L.box(1.1, 0.12, 2.5, dark, 3.1, 1.06, 0), L.box(2.6, 0.12, 2.5, dark, -2.3, 1.06, 0)); // para-lamas
  // cabine (frente +x)
  body.add(L.rbox(1.7, 1.9, 2.36, 0.12, white, 3.35, 1.95, 0));
  body.add(L.box(0.05, 0.8, 2.0, glassM, 4.21, 2.35, 0), L.box(1.0, 0.7, 0.04, glassM, 3.45, 2.35, 1.19), L.box(1.0, 0.7, 0.04, glassM, 3.45, 2.35, -1.19));
  body.add(L.box(0.12, 0.35, 2.3, dark, 4.25, 1.15, 0), L.box(0.08, 0.14, 0.4, L.glow('#fff6d8', 1.2), 4.27, 1.45, 0.85, { cast: false }), L.box(0.08, 0.14, 0.4, L.glow('#fff6d8', 1.2), 4.27, 1.45, -0.85, { cast: false }));
  body.add(L.box(0.3, 0.12, 0.9, L.glow('#ff9a2e', 1.4), 3.4, 2.95, 0, { cast: false })); // giroflex
  body.add(L.box(1.5, 0.08, 2.4, red, 3.3, 1.05, 0));
  // carroceria com duas aduelas deitadas
  body.add(L.box(5.0, 0.18, 2.5, M('#5a646d', { roughness: 0.6 }), -1.7, 1.25, 0));
  [-1, 1].forEach((s) => body.add(L.box(5.0, 0.35, 0.06, M('#5a646d'), -1.7, 1.5, s * 1.22)));
  [-2.9, -0.8].forEach((x) => { const a = L.group(body, x, 1.34, 0); a.add(L.box(1.3, 0.2, 2.0, C.conc, 0, 0.1, 0), L.box(1.3, 1.1, 0.2, C.conc, 0, 0.75, -0.9), L.box(1.3, 0.2, 2.0, C.conc, 0, 1.4, 0)); });
  // torre giratória + patolas
  const T0 = new THREE.Vector3(1.9, 1.35, 0);
  body.add(L.box(0.9, 0.5, 2.5, yellow, T0.x, T0.y + 0.1, 0));
  const legs = [];
  [1, -1].forEach((s) => { const lg = L.group(body, T0.x, 0.9, 0); lg.add(L.box(0.25, 0.22, 1.0, yellow, 0, 0, s * 1.6), L.box(0.16, 0.8, 0.16, yellow, 0, -0.35, s * 2.05), L.box(0.5, 0.06, 0.5, dark, 0, -0.78, s * 2.05)); legs.push(lg); });
  const turret = L.group(scene);
  turret.add(L.cyl(0.42, 0.5, 0.5, yellow, 0, 0.25, 0, 20), L.box(0.7, 1.5, 0.7, yellow, 0, 1.15, 0), L.box(0.55, 0.5, 0.75, M('#333b42'), -0.55, 0.6, 0));
  // lança (2 trechos), cilindros e cabo: atualizados por quadro em coordenadas do mundo
  const boom1 = K.beam([0, 0, 0], [1, 0, 0], 0.42, 0.5, yellow), boom2 = K.beam([0, 0, 0], [1, 0, 0], 0.34, 0.4, yellow), boom3 = K.beam([0, 0, 0], [1, 0, 0], 0.26, 0.3, M('#e8e3d6'));
  const cyl1 = K.beam([0, 0, 0], [1, 0, 0], 0.16, 0.16, L.metal(PAL.steel)), cyl2 = K.beam([0, 0, 0], [1, 0, 0], 0.13, 0.13, L.metal(PAL.steel));
  const cable = K.rod(dark, 6), hook = L.group(scene);
  hook.add(L.box(0.3, 0.42, 0.18, yellow, 0, 0.1, 0), L.torus(0.12, 0.035, L.metal(PAL.steel), 0, -0.2, 0));
  const slings = [0, 1, 2, 3].map(() => K.rod(M('#e0c040'), 5));
  scene.add(boom1, boom2, boom3, cyl1, cyl2, cable, ...slings);
  L.shadows(truck); L.shadows(hook); L.shadows(turret);
  const parts = [truck, turret, boom1, boom2, boom3, cyl1, cyl2, cable, hook, ...slings];
  const V = (x, y, z) => new THREE.Vector3(x, y, z), _m = new THREE.Vector3(), corner = new THREE.Vector3();

  return {
    update(t, S) {
      const g = S.build.gallery, on = g > 0 && g < 0.86;
      parts.forEach((p) => { p.visible = on; });
      if (!on) return;
      const N = gal.N, LEN = gal.LEN;
      const ic = Math.min(N - 1, Math.max(0, (g / 0.78) * N - 0.72));
      let tipX = Lo.GALLERY.x0 + ic * LEN + LEN / 2;
      const arrive = L.ease.out(L.clamp01(g / 0.035)), leave = L.ease.in(K.sub(g, 0.8, 0.86));
      const tx = tipX - 2.0 - 12 * (1 - arrive) + 10 * leave;
      // caminhão na faixa da frente da rua A, inclinado com a rampa
      const sy = Lo.streetY(tx), pitch = Math.atan2(Lo.streetY(tx + 2) - Lo.streetY(tx - 2), 4);
      truck.position.set(tx, sy, 21.25); truck.rotation.set(0, 0, pitch);
      const parked = (1 - K.sub(g, 0, 0.03)) + K.sub(g, 0.79, 0.81);
      legs.forEach((lg) => { lg.scale.set(1, 1, L.lerp(1, 0.55, L.clamp01(parked))); });
      truck.updateMatrixWorld(true);
      const base = V(T0.x, T0.y + 0.35, 0).applyMatrix4(truck.matrixWorld);
      // aduela pendurada (se ainda estiver descendo)
      const j = Math.round(ic), a = gal.ads[j];
      const held = a && a.k > 0 && a.k < 0.6 && arrive > 0.99 && leave < 0.01;
      let hookP;
      if (held) {
        a.g.updateMatrixWorld(true);
        const top = Lo.GALLERY.small.h + Lo.GALLERY.wall, z0 = ZF - Lo.GALLERY.small.w / 2 - Lo.GALLERY.wall + 0.15, z1 = ZF - 0.12;
        const cs = [V(0.35, top, z0), V(a.len - 0.35, top, z0), V(a.len - 0.35, top, z1), V(0.35, top, z1)].map((v) => v.applyMatrix4(a.g.matrixWorld));
        const cen = cs.reduce((s, v) => s.add(v), V(0, 0, 0)).multiplyScalar(0.25);
        hookP = cen.clone().add(V(0, 1.3, 0));
        cs.forEach((c, i) => { K.rodBetween(slings[i], hookP.clone().add(V(0, -0.22, 0)), c, 0.018); slings[i].visible = true; });
        tipX = hookP.x;
      } else {
        slings.forEach((s) => { s.visible = false; });
        hookP = V(tipX, sy + 3.4, ZF + 2.7 - 0.5);
      }
      const tip = V(hookP.x, Math.max(hookP.y + 1.2, sy + 5.6), hookP.z);
      // torre gira para a ponta; lança com cotovelo
      const dx = tip.x - base.x, dz = tip.z - base.z, yaw = Math.atan2(-dz, dx);
      turret.position.copy(base).add(V(0, -0.35, 0)); turret.rotation.set(0, yaw, 0);
      const shoulder = V(0, 1.75, 0).applyMatrix4(turret.matrixWorld.compose(turret.position, turret.quaternion, turret.scale));
      const hd = Math.hypot(tip.x - shoulder.x, tip.z - shoulder.z), dirH = V((tip.x - shoulder.x) / hd, 0, (tip.z - shoulder.z) / hd);
      const elbow = shoulder.clone().addScaledVector(dirH, hd * 0.42).add(V(0, 2.6, 0));
      const mid = elbow.clone().lerp(tip, 0.55);
      K.setBeam(boom1, shoulder, elbow, 0.42, 0.5); K.setBeam(boom2, elbow, mid, 0.34, 0.4); K.setBeam(boom3, mid, tip, 0.26, 0.3);
      _m.copy(shoulder).lerp(elbow, 0.5);
      K.setBeam(cyl1, shoulder.clone().add(V(0, -0.9, 0)).addScaledVector(dirH, 0.3), _m, 0.16, 0.16);
      K.setBeam(cyl2, shoulder.clone().lerp(elbow, 0.8).add(V(0, 0.35, 0)), elbow.clone().lerp(mid, 0.5).add(V(0, 0.3, 0)), 0.13, 0.13);
      K.rodBetween(cable, tip, hookP, 0.022);
      hook.position.copy(hookP); hook.rotation.set(0, yaw, 0);
      corner.copy(tip);
    }
  };
}
