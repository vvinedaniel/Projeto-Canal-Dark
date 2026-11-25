// Máquinas de pavimentação: vibroacabadora (esteiras, silo de carga com massa asfáltica, plataforma do operador
// com capota, rosca distribuidora e mesa alisadora com extensões até a largura da rua) e rolo compactador tandem
// (dois cilindros de aço, chassi articulado, capota ROPS, giroflex). Frente para +x, origem no chão.
export function makeMachines(ctx, K) {
  const { L, THREE } = ctx, { G, TM, Merge, vmat } = K;
  const Y = '#f2b51c', YD = '#c98f12', DK = '#2b3036', ST = '#9aa4ad', BLK = '#16191c';
  const paintM = vmat({ roughness: 0.45, metalness: 0.15 });

  function paver(W = 8) {
    const g = new THREE.Group(), m = new Merge();
    // esteiras
    [-1, 1].forEach((s) => {
      m.add(G.rbox(3.0, 0.55, 0.42, 0.18), BLK, TM(1.6, 0.3, s * 1.05));
      for (let i = 0; i < 5; i++) m.add(G.cyl(0.16, 0.16, 0.44, 10), '#3a4047', TM(0.45 + i * 0.58, 0.3, s * 1.05, Math.PI / 2));
      m.add(G.box(2.6, 0.12, 0.5), Y, TM(1.6, 0.62, s * 1.05));
    });
    // chassi e motor
    m.add(G.rbox(3.2, 0.9, 2.3, 0.08), Y, TM(1.5, 1.08, 0));
    m.add(G.rbox(1.4, 0.7, 2.1, 0.08), Y, TM(0.7, 1.85, 0));
    for (let i = 0; i < 6; i++) m.add(G.box(0.04, 0.4, 1.6), DK, TM(0.2 + i * 0.2, 1.88, 0)); // grade do motor
    m.add(G.cyl(0.07, 0.07, 0.9, 8), DK, TM(0.4, 2.55, 0.7));                                // escapamento
    // silo (moega) na frente com abas abertas e massa asfáltica
    m.add(G.box(1.3, 0.25, 2.5), YD, TM(3.6, 0.95, 0));
    [-1, 1].forEach((s) => { const w = new THREE.Shape([[0, 0], [1.4, 0], [1.4, 0.7], [0, 0.45]].map((p) => new THREE.Vector2(p[0], p[1]))); m.add(new THREE.ExtrudeGeometry(w, { depth: 0.08, bevelEnabled: false }), Y, TM(2.95, 0.95, s * 1.3 - (s > 0 ? 0.08 : 0))); m.add(G.box(1.4, 0.08, 0.9), Y, TM(3.65, 1.3, s * 1.3, s * 0.5)); });
    m.add(G.box(0.12, 0.6, 2.5), Y, TM(4.32, 1.25, 0));
    const mix = new THREE.IcosahedronGeometry(1, 1); m.add(mix, '#1b1d20', TM(3.6, 1.15, 0, 0, 0, 0, 0.7, 0.28, 1.15));
    // plataforma do operador, bancos, painel, capota
    m.add(G.box(1.6, 0.08, 2.6), DK, TM(-0.25, 1.55, 0));
    [-0.7, 0.7].forEach((z) => { m.add(G.rbox(0.45, 0.12, 0.45, 0.04), '#30363d', TM(-0.2, 1.85, z)).add(G.rbox(0.1, 0.5, 0.45, 0.04), '#30363d', TM(-0.42, 2.1, z)).add(G.box(0.4, 0.4, 0.5), Y, TM(-0.2, 1.72, z)); });
    m.add(G.rbox(0.35, 0.45, 0.7, 0.04), DK, TM(0.25, 2.0, 0));
    [[-0.95, -1.2], [-0.95, 1.2], [0.35, -1.2], [0.35, 1.2]].forEach(([x, z]) => m.add(G.cyl(0.04, 0.04, 1.75, 6), DK, TM(x, 2.45, z)));
    m.add(G.rbox(1.6, 0.1, 2.7, 0.04), '#e9ecef', TM(-0.3, 3.35, 0));
    m.add(G.cyl(0.08, 0.1, 0.16, 10), '#ff8a1c', TM(-0.3, 3.48, 0));
    // rosca distribuidora e mesa alisadora (largura da rua)
    const ws = Math.max(2.6, W - 0.15);
    m.add(G.cyl(0.18, 0.18, ws, 12), '#5f666d', TM(-0.75, 0.25, 0, Math.PI / 2));
    m.add(G.box(0.08, 0.5, ws), '#4d545b', TM(-0.95, 0.4, 0));
    m.add(G.box(0.75, 0.35, ws), '#c9cdd1', TM(-1.35, 0.2, 0));                 // mesa
    m.add(G.box(0.7, 0.18, ws + 0.04), Y, TM(-1.35, 0.46, 0));
    m.add(G.box(0.1, 0.5, ws), DK, TM(-1.75, 0.6, 0));
    [-1, 1].forEach((s) => { m.add(G.box(1.2, 0.45, 0.06), Y, TM(-1.1, 0.3, s * ws / 2)); m.add(G.box(0.55, 0.06, 0.6), DK, TM(-1.95, 0.78, s * (ws / 2 - 0.3))); }); // comportas laterais e passarelas
    m.add(G.box(0.25, 0.25, ws - 0.4), '#e0592a', TM(-1.82, 0.85, 0));   // faixa de aviso
    g.add(m.mesh(paintM));
    // fumaça quente sobre a massa (meio transparente, sobe e some)
    const smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), L.mat('#e8e4dc', { transparent: true, opacity: 0.28, depthWrite: false, roughness: 1 }), 10);
    smoke.castShadow = false; smoke.frustumCulled = false; g.add(smoke);
    const _d = new THREE.Object3D(), rd = L.rng(W * 10 + 3), ph = Array.from({ length: 10 }, () => [rd(), rd() - 0.5, rd()]);
    L.shadows(g); smoke.castShadow = false;
    function update(t) {
      for (let i = 0; i < 10; i++) { const [a, b, c] = ph[i], u = L.fract(a + t * 0.6); _d.position.set(-1.6 - u * 1.2 + c * 0.5, 0.3 + u * 1.6, b * (ws - 1)); _d.scale.setScalar((0.25 + u * 0.5) * Math.sin(u * Math.PI)); _d.updateMatrix(); smoke.setMatrixAt(i, _d.matrix); }
      smoke.instanceMatrix.needsUpdate = true;
    }
    return { group: g, update };
  }

  function roller() {
    const g = new THREE.Group(), m = new Merge(), R = 0.6, DW = 1.7;
    // chassi articulado
    m.add(G.rbox(1.3, 0.75, 1.75, 0.08), Y, TM(-1.05, 1.05, 0)).add(G.rbox(1.0, 0.55, 1.7, 0.08), Y, TM(1.15, 0.95, 0));
    m.add(G.box(0.6, 0.35, 0.6), DK, TM(0.1, 0.85, 0));
    [-1, 1].forEach((s) => { m.add(G.box(1.5, 0.5, 0.1), Y, TM(-1.25, 0.65, s * 0.95)).add(G.box(1.4, 0.45, 0.1), Y, TM(1.3, 0.6, s * 0.95)); });
    for (let i = 0; i < 5; i++) m.add(G.box(0.04, 0.3, 1.3), DK, TM(-1.55 + i * 0.16, 1.45, 0)); // grade do motor
    // posto do operador + capota ROPS
    m.add(G.rbox(0.7, 0.5, 1.2, 0.05), DK, TM(0.05, 1.55, 0)).add(G.rbox(0.42, 0.12, 0.42, 0.04), '#30363d', TM(-0.05, 1.85, 0)).add(G.rbox(0.1, 0.45, 0.42, 0.04), '#30363d', TM(-0.28, 2.1, 0));
    m.add(G.cyl(0.18, 0.18, 0.04, 14), BLK, TM(0.35, 2.05, 0, 0, 0, 0.6));
    [[-0.45, -0.7], [-0.45, 0.7], [0.55, -0.7], [0.55, 0.7]].forEach(([x, z]) => m.add(G.cyl(0.04, 0.04, 1.6, 6), DK, TM(x, 2.4, z)));
    m.add(G.rbox(1.25, 0.08, 1.6, 0.03), '#e9ecef', TM(0.05, 3.2, 0));
    m.add(G.cyl(0.08, 0.1, 0.15, 10), '#ff8a1c', TM(0.05, 3.32, 0));
    g.add(m.mesh(paintM));
    // cilindros (giram com a distância)
    const drum = new Merge(); drum.add(G.cyl(R, R, DW, 28), '#a9b2ba', TM(0, 0, 0, Math.PI / 2)).add(G.cyl(R * 0.35, R * 0.35, DW + 0.08, 12), '#4d545b', TM(0, 0, 0, Math.PI / 2));
    for (let i = 0; i < 6; i++) drum.add(G.box(0.05, R * 1.6, 0.03), '#6b737a', TM(0, 0, DW / 2 + 0.03, 0, 0, (i / 6) * Math.PI));
    const dg = drum.geo(), dm = vmat({ roughness: 0.35, metalness: 0.6 }), drums = [-1.35, 1.35].map((x) => { const d = L.mesh(dg, dm, x, R, 0); g.add(d); return d; });
    L.shadows(g);
    return { group: g, update: (t, dist) => { drums.forEach((d) => { d.rotation.z = -dist / R; }); } };
  }

  return { paver, roller };
}
