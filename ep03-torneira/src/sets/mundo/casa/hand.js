// Mão articulada (modelo do Ep. 01: falanges com pivôs nas juntas, unha, palma, eminência tenar, punho, manga),
// aqui segurando o VOLANTE da torneira por cima e girando-o. Chega em arco desacelerando, fecha os dedos, gira junto com
// o volante, solta e recua. Pose = função pura de t (e do ângulo do volante).
export function buildHand(ctx) {
  const { L, THREE } = ctx;
  const hand = new THREE.Group(), H = new THREE.Group(); hand.add(H);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#d99c7a', roughness: 0.52, sheen: 0.7, sheenColor: new THREE.Color('#ffb196'), sheenRoughness: 0.45, clearcoat: 0.06, clearcoatRoughness: 0.7 });
  const nailM = L.mat('#f2d4c6', { roughness: 0.22 });
  const bone = (len, r0, r1) => { const g = new THREE.Group(); const c = L.mesh(new THREE.CylinderGeometry(r1, r0, len, 16), skin, 0, -len / 2, 0); c.rotation.x = Math.PI; g.add(c, L.mesh(new THREE.SphereGeometry(r0, 16, 12), skin, 0, 0, 0), L.mesh(new THREE.SphereGeometry(r1, 16, 12), skin, 0, -len, 0)); return g; };
  function digit(parent, base, lens, radii) {
    const piv = []; let p = parent, pos = base;
    for (let k = 0; k < 3; k++) { const pv = new THREE.Group(); pv.position.set(...pos); p.add(pv); pv.add(bone(lens[k], radii[k], radii[k + 1])); piv.push(pv); p = pv; pos = [0, -lens[k], 0]; }
    const nail = L.mesh(new THREE.SphereGeometry(radii[3] * 0.95, 14, 10), nailM, 0, -lens[2] + radii[3] * 1.4, radii[3] * 0.62); nail.scale.set(0.95, 1.5, 0.42); piv[2].add(nail);
    return { piv };
  }
  const fingers = [
    digit(H, [0, 0, 0], [0.043, 0.026, 0.021], [0.0094, 0.0088, 0.0081, 0.0074]),
    digit(H, [0.021, 0.004, -0.001], [0.046, 0.028, 0.022], [0.0096, 0.009, 0.0083, 0.0075]),
    digit(H, [0.040, 0.001, -0.002], [0.042, 0.027, 0.021], [0.0091, 0.0085, 0.0078, 0.007]),
    digit(H, [0.056, -0.007, -0.003], [0.034, 0.021, 0.018], [0.0082, 0.0076, 0.007, 0.0063])];
  const thumbP = new THREE.Group(); thumbP.position.set(-0.006, 0.068, -0.012); thumbP.rotation.set(0.75, 0.05, -0.2); H.add(thumbP);
  const thumb = digit(thumbP, [0, 0, 0], [0.036, 0.03, 0.024], [0.0125, 0.011, 0.0098, 0.0088]);
  const palm = L.mesh(new L.RoundedBoxGeometry(0.08, 0.088, 0.03, 4, 0.012), skin, 0.028, 0.046, -0.007); H.add(palm);
  [[0, 0.0], [0.021, 0.004], [0.04, 0.001], [0.056, -0.007]].forEach(([x, y]) => H.add(L.mesh(new THREE.SphereGeometry(0.0105, 14, 10), skin, x, y + 0.003, 0.004)));
  const thenar = L.mesh(new THREE.SphereGeometry(0.022, 16, 12), skin, 0.002, 0.06, -0.018); thenar.scale.set(0.9, 1.4, 0.8); H.add(thenar);
  const wrist = L.mesh(new THREE.CylinderGeometry(0.029, 0.026, 0.09, 18), skin, 0.03, 0.125, -0.006); wrist.scale.set(1.25, 1, 0.8); H.add(wrist);
  const sleeve = L.mesh(new THREE.CylinderGeometry(0.036, 0.033, 0.36, 22), L.mat('#2f4f7f', { roughness: 0.85 }), 0.03, 0.34, -0.006); sleeve.scale.set(1.15, 1, 0.95); H.add(sleeve);
  const cuff = L.mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.03, 22), L.mat('#26446f', { roughness: 0.85 }), 0.03, 0.17, -0.006); cuff.scale.set(1.15, 1, 0.95); H.add(cuff);
  L.shadows(hand);
  // origem da mão = ponto sob a palma que fica sobre o volante
  H.position.set(-0.028, -0.03, 0.03);
  hand.scale.setScalar(1.12);

  const OPEN = [0.25, 0.3, 0.2], GRIP = [[1.05, 1.15, 0.7], [1.1, 1.2, 0.75], [1.15, 1.2, 0.75], [1.2, 1.25, 0.75]];
  const setFingers = (g) => { fingers.forEach((f, i) => f.piv.forEach((p, k) => { p.rotation.x = L.lerp(OPEN[k], GRIP[i][k], g); })); thumb.piv[0].rotation.set(L.lerp(0.1, 0.5, g), 0, L.lerp(0.0, -0.5, g)); thumb.piv[1].rotation.x = L.lerp(0.1, 0.55, g); thumb.piv[2].rotation.x = L.lerp(0.1, 0.4, g); };
  /**
   * knob: posição do topo do volante; ang: ângulo atual do volante; grip0: ângulo do volante quando a mão o pegou.
   * a = chegada (0..1), g = dedos fechados (0..1), r = recuo (0..1)
   */
  function pose(knob, ang, grip0, a, g, r) {
    hand.visible = a > 0.001 && r < 0.999;
    if (!hand.visible) return;
    const ea = L.ease.out(a), er = L.ease.in(r);
    const yaw = -0.25 + (ang - grip0);
    hand.rotation.set(-Math.PI / 2 + 0.42 + 0.25 * (1 - ea) + 0.2 * er, yaw, 0, 'YXZ');
    hand.position.set(knob.x + 0.02 * (1 - ea), knob.y + 0.03 + 0.22 * (1 - ea) * (1 - ea) + 0.25 * er + 0.01 * (1 - g), knob.z - 0.32 * (1 - ea) - 0.3 * er);
    setFingers(g);
  }
  return { hand, pose };
}
