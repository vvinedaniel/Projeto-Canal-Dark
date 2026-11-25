// Bomba submersível (voluta, motor com aletas, flanges, alça de içamento) e válvulas do recalque.
// Adaptado de ep01-descarga/src/sets/rede/elevatoria.js (mesma bomba, aprovada pelo cliente).
export function makePump(L, K) {
  const { THREE, PAL } = L, { M, G, MAT, flange } = K, PI = Math.PI;
  const iron = MAT.iron, steel = MAT.steel, redM = G('#cf3a2b', { roughness: 0.36 });
  /** bomba com origem no pé, descarga saindo em −z na altura 0.44 (escala 1 ≈ 2,1 m de altura) */
  function pump() {
    const g = new THREE.Group(), ironD = M('#39424a', { roughness: 0.5, metalness: 0.55, side: THREE.DoubleSide });
    g.add(L.cyl(0.4, 0.44, 0.07, iron, 0, 0.035, 0, 24));
    for (let i = 0; i < 4; i++) { const a = PI / 4 + (i * PI) / 2; g.add(L.box(0.09, 0.2, 0.09, iron, Math.cos(a) * 0.32, 0.15, Math.sin(a) * 0.32)); }
    g.add(L.lathe([[0.18, 0.1], [0.26, 0.12], [0.23, 0.24]], ironD, 20)); // boca de sucção
    g.add(L.lathe([[0.02, 0.22], [0.32, 0.22], [0.47, 0.27], [0.53, 0.38], [0.53, 0.5], [0.47, 0.62], [0.32, 0.67], [0.02, 0.67]], ironD, 32)); // voluta
    g.add(L.cyl(0.15, 0.19, 0.5, iron, 0, 0.44, -0.66, 16).rotateX(PI / 2)); // bocal de descarga
    flange(g, 0, 0.44, -0.9, 0.17, 'z', iron);
    g.add(L.cyl(0.3, 0.36, 0.13, iron, 0, 0.735, 0, 24));
    g.add(L.cyl(0.335, 0.335, 0.88, redM, 0, 1.24, 0, 28)); // carcaça do motor
    for (let i = 0; i < 22; i++) { const a = (i / 22) * L.TAU, f = L.box(0.07, 0.74, 0.028, redM, Math.cos(a) * 0.355, 1.24, Math.sin(a) * 0.355); f.rotation.y = -a; g.add(f); } // aletas
    g.add(L.cyl(0.37, 0.37, 0.05, iron, 0, 0.82, 0, 28), L.cyl(0.38, 0.38, 0.06, iron, 0, 1.69, 0, 28));
    g.add(L.lathe([[0.37, 1.72], [0.35, 1.8], [0.26, 1.87], [0.12, 1.9], [0.001, 1.905]], G('#bf3a2b', { roughness: 0.36, side: THREE.DoubleSide }), 24));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * L.TAU + 0.3; g.add(L.cyl(0.028, 0.028, 0.06, steel, Math.cos(a) * 0.3, 1.86, Math.sin(a) * 0.3, 6)); }
    g.add(L.tube([[-0.2, 1.84, 0], [-0.2, 2.02, 0], [0, 2.13, 0], [0.2, 2.02, 0], [0.2, 1.84, 0]], 0.028, steel, 20, 6));
    g.add(L.cyl(0.05, 0.065, 0.16, iron, 0.02, 1.94, 0.2, 10).rotateX(0.5));
    g.add(L.box(0.2, 0.13, 0.012, steel, 0, 1.36, 0.372));
    g.add(L.box(0.46, 0.1, 0.12, iron, 0, 0.95, -0.76), L.box(0.1, 0.1, 0.5, iron, 0, 0.95, -0.52)); // garra dos trilhos-guia
    return g;
  }
  /** válvula de retenção (corpo bojudo) com eixo em +z, centrada na origem */
  function checkValve(r, m) {
    const g = new THREE.Group();
    const b = L.lathe([[r * 0.95, -r * 1.7], [r * 1.25, -r * 1.5], [r * 1.55, -r * 0.6], [r * 1.55, r * 0.6], [r * 1.25, r * 1.5], [r * 0.95, r * 1.7]], m, 20); b.rotation.x = PI / 2; g.add(b);
    g.add(L.rbox(r * 1.4, r * 0.7, r * 1.6, r * 0.12, m, 0, r * 1.6, 0)); // tampa
    flange(g, 0, 0, -r * 1.75, r, 'z', m, 8); flange(g, 0, 0, r * 1.75, r, 'z', m, 8);
    return g;
  }
  /** registro de gaveta com volante vermelho; eixo do tubo em +z, volante para +y */
  function gateValve(r, m) {
    const g = new THREE.Group(), red = G('#d23a2a', { roughness: 0.35 });
    g.add(L.rbox(r * 2.4, r * 2.6, r * 1.9, r * 0.3, m, 0, 0, 0));
    flange(g, 0, 0, -r * 1.05, r, 'z', m, 8); flange(g, 0, 0, r * 1.05, r, 'z', m, 8);
    g.add(L.cyl(r * 0.55, r * 0.8, r * 1.6, m, 0, r * 2.0, 0, 12), L.cyl(r * 0.14, r * 0.14, r * 2.2, MAT.steel, 0, r * 3.4, 0, 8));
    const hw = new THREE.Group(); hw.add(L.torus(r * 1.25, r * 0.15, red, 0, 0, 0)); for (let i = 0; i < 4; i++) { const sp = L.cyl(r * 0.09, r * 0.09, r * 2.4, red, 0, 0, 0, 6); sp.rotation.z = (i * PI) / 4; hw.add(sp); }
    hw.rotation.x = PI / 2; hw.position.y = r * 4.2; g.add(hw);
    return g;
  }
  return { pump, checkValve, gateValve, PAL };
}
