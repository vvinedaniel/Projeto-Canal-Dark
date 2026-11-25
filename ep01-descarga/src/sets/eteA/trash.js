// Lixo reconhecível que fica preso nas grades (tamanhos exagerados ~2,5x para ler no celular).
export function makeTrash(L, K) {
  const { THREE, PAL, TAU } = L, { M } = K;
  const crumple = (detail, amp, seed) => {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, rd = L.rng(seed), f = [rd() * 9, rd() * 9, rd() * 9];
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const k = 1 + amp * (Math.sin(x * 5.1 + f[0]) * Math.sin(y * 6.3 + f[1]) + 0.6 * Math.sin(z * 9.2 + f[2] + x * 3)); p.setXYZ(i, x * k, y * k, z * k); }
    g.computeVertexNormals(); return g;
  };
  const wipeGeos = [crumple(2, 0.2, 1), crumple(2, 0.26, 2), crumple(2, 0.17, 3)];
  const bagGeo = crumple(2, 0.3, 7);
  const wipeMats = [L.mat('#f6f7f3', { roughness: 0.9 }), L.mat('#dfeaf2', { roughness: 0.9 }), L.mat('#f1ecdf', { roughness: 0.9 })];
  const bagMat = L.glossy('#fdfdfd', { roughness: 0.35, transparent: true, opacity: 0.93 }), bagMat2 = L.glossy('#ffd84a', { roughness: 0.35 });
  const duckMat = L.glossy('#ffd21f', { roughness: 0.22 }), beakMat = L.glossy('#ff7a1a', { roughness: 0.3 });
  const pet = L.glossy('#8fdcff', { roughness: 0.08, transparent: true, opacity: 0.72 }), capMat = L.glossy(PAL.red), labelMat = L.mat('#ffffff', { roughness: 0.5 });
  const stickBlue = L.mat('#4aa3ff', { roughness: 0.5 }), stickPink = L.mat('#ff8fb3', { roughness: 0.5 }), cotton = L.mat('#ffffff', { roughness: 1 });
  const flossMat = L.mat('#b8ffe0', { roughness: 0.5, emissive: '#b8ffe0', emissiveIntensity: 0.15 });
  const bottleProfile = [[0, 0], [0.085, 0], [0.1, 0.02], [0.1, 0.2], [0.086, 0.235], [0.1, 0.27], [0.1, 0.33], [0.045, 0.43], [0.04, 0.47]];

  function wipe(i = 0, s = 1) { const m = L.mesh(wipeGeos[i % 3], wipeMats[i % 3]); m.scale.set(0.3 * s, 0.11 * s, 0.24 * s); const g = new THREE.Group(); g.add(m); return g; }
  function drape(i = 0, s = 1) { // lenço pendurado numa barra
    const g = new THREE.Group(), a = L.mesh(wipeGeos[i % 3], wipeMats[i % 3]); a.scale.set(0.08 * s, 0.3 * s, 0.24 * s); g.add(a);
    const b = L.mesh(wipeGeos[(i + 1) % 3], wipeMats[i % 3], 0.02, -0.2 * s, 0.05); b.scale.set(0.07 * s, 0.2 * s, 0.17 * s); g.add(b); return g;
  }
  function swab(i = 0, s = 1) {
    const g = new THREE.Group(), len = 0.5 * s; const st = L.cyl(0.02 * s, 0.02 * s, len, i % 2 ? stickPink : stickBlue, 0, 0, 0, 8); st.rotation.z = Math.PI / 2; g.add(st);
    [-1, 1].forEach((k) => { const c = L.sph(0.05 * s, cotton, (k * len) / 2, 0, 0); c.scale.set(1.5, 1, 1); g.add(c); }); return g;
  }
  function bottle(s = 1) {
    const g = new THREE.Group(), b = L.lathe(bottleProfile, pet, 20); b.material.side = THREE.DoubleSide; g.add(b);
    g.add(L.cyl(0.048, 0.048, 0.05, capMat, 0, 0.49, 0, 14), L.cyl(0.103, 0.103, 0.11, labelMat, 0, 0.11, 0, 20), L.cyl(0.104, 0.104, 0.035, capMat, 0, 0.11, 0, 20));
    g.scale.setScalar(1.5 * s); return g;
  }
  function bag(s = 1, yellow = false) {
    const g = new THREE.Group(), m = L.mesh(bagGeo, yellow ? bagMat2 : bagMat); m.scale.set(0.34 * s, 0.2 * s, 0.3 * s); g.add(m);
    [-1, 1].forEach((k) => { const h = L.mesh(new THREE.TorusGeometry(0.1 * s, 0.014 * s, 6, 16), yellow ? bagMat2 : bagMat, k * 0.14 * s, 0.2 * s, 0); h.rotation.y = 0.4 * k; g.add(h); });
    return g;
  }
  function floss(seed = 1, s = 1) {
    const rd = L.rng(seed), pts = []; for (let i = 0; i < 9; i++) pts.push([(rd() - 0.5) * 0.25 * s, 0.35 * s - i * 0.11 * s, (rd() - 0.5) * 0.5 * s]);
    const m = L.tube(pts, 0.014 * s, flossMat, 40, 5); const g = new THREE.Group(); g.add(m); return g;
  }
  function duck(s = 1) {
    const g = new THREE.Group();
    const body = L.sph(1, duckMat, 0, 0.13, 0); body.scale.set(0.27, 0.19, 0.2); g.add(body);
    const tail = L.mesh(new THREE.ConeGeometry(0.09, 0.2, 12), duckMat, -0.24, 0.24, 0); tail.rotation.z = 0.9; g.add(tail);
    [-1, 1].forEach((k) => { const w = L.sph(1, duckMat, -0.03, 0.17, 0.16 * k); w.scale.set(0.16, 0.1, 0.06); w.rotation.z = -0.25; g.add(w); });
    g.add(L.sph(0.135, duckMat, 0.17, 0.37, 0));
    const beak = L.mesh(new THREE.ConeGeometry(0.06, 0.13, 12), beakMat, 0.32, 0.35, 0); beak.rotation.z = -Math.PI / 2; beak.scale.set(1, 1, 1.5); g.add(beak);
    [-1, 1].forEach((k) => g.add(L.sph(0.022, M.dark, 0.25, 0.42, 0.085 * k)));
    g.scale.setScalar(1.75 * s); return g;
  }
  return { wipe, drape, swab, bottle, bag, floss, duck };
}
