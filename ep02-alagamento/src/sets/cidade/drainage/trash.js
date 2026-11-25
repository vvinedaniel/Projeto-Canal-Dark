// LIXO nas grelhas: sacolas plásticas, garrafas PET, latas e folhas descem pela sarjeta da frente da rua A e se
// acumulam sobre as grelhas (sobretudo a do ponto baixo, até cobri-la). Boiam quando a rua está alagada (e são
// empurrados pela fervura). Some com a limpeza (S.build.clean). Quantidade = S.trash.
export function buildTrash(ctx, K, inlets) {
  const { L, THREE, Lo, scene } = ctx;
  const root = L.group(scene), rd = L.rng(2024), ZG = 23.1, ZGUT = 23.22;
  // geometrias
  const bagGeo = (() => { const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, r = L.rng(9); for (let i = 0; i < p.count; i++) { const k = 0.7 + r() * 0.5; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.55, p.getZ(i) * k); } g.computeVertexNormals(); return g; })();
  const petGeo = (() => { const g = new THREE.LatheGeometry([[0, -0.5], [0.15, -0.5], [0.17, -0.45], [0.17, 0.12], [0.1, 0.32], [0.06, 0.4], [0.06, 0.5], [0, 0.5]].map((q) => new THREE.Vector2(q[0], q[1])), 14); g.rotateZ(Math.PI / 2); return g; })();
  const canGeo = (() => { const g = new THREE.CylinderGeometry(0.5, 0.5, 1.3, 14); g.rotateZ(Math.PI / 2); return g; })();
  const leafGeo = (() => { const s = new THREE.Shape(); s.moveTo(-1, 0); s.quadraticCurveTo(0, 0.6, 1, 0); s.quadraticCurveTo(0, -0.6, -1, 0); const g = new THREE.ShapeGeometry(s, 4); g.rotateX(-Math.PI / 2); return g; })();
  const types = [
    { geo: bagGeo, m: L.mat('#ffffff', { roughness: 0.45 }), cols: ['#f4f4f0', '#3d7fd0', '#f2d23a', '#2b2f33', '#e86a9a', '#ffffff'], s: 0.2 },
    { geo: petGeo, m: L.glossy('#ffffff', { roughness: 0.15, transparent: true, opacity: 0.8 }), cols: ['#9fd8b4', '#bfe3f2', '#7ccf9a', '#d9f0f7'], s: 0.34 },
    { geo: canGeo, m: L.metal('#ffffff', { roughness: 0.3, metalness: 0.7 }), cols: ['#d8433a', '#c9d1d7', '#2f7fd6', '#e9b52a'], s: 0.11 },
    { geo: leafGeo, m: L.mat('#ffffff', { roughness: 0.8, side: THREE.DoubleSide }), cols: ['#5f8f3a', '#a8823c', '#7a9a3c', '#c9a04a', '#6b5a2a'], s: 0.12 }
  ];
  const items = [];
  const hook = Lo.HOOK_INLET, targets = Lo.INLETS;
  targets.forEach((gx) => {
    const n = gx === hook ? 46 : 9;
    for (let i = 0; i < n; i++) {
      const ty = i % 7 === 0 ? 2 : i % 5 === 0 ? 1 : i % 2 === 0 ? 0 : 3, T = types[ty];
      // de onde vem: ladeira acima (para x < SAG vem da esquerda; a grelha do ponto baixo recebe dos dois lados)
      const dir = gx === hook ? (rd() < 0.7 ? -1 : 1) : gx < Lo.SAG.x ? -1 : 1;
      const dist = 3 + rd() * 9;
      // pilha: cobre a grelha (camadas), um pouco espalhada
      const layer = Math.floor(i / 12);
      items.push({
        ty, gx, dir, x0: gx + dir * dist, zr: ZGUT + (rd() - 0.5) * 0.35,
        px: gx + (rd() - 0.5) * (gx === hook ? 1.15 : 0.9), pz: ZG + (rd() - 0.5) * 0.62, py: 0.03 + layer * 0.05 + rd() * 0.03,
        s: T.s * (0.75 + rd() * 0.5), d: rd() * 0.62, rot: [rd() * 6, rd() * 6, rd() * 6], spin: (rd() - 0.5) * 6, ph: rd() * 6, ang: rd() * 6.283, col: T.cols[Math.floor(rd() * T.cols.length)]
      });
    }
  });
  const ims = types.map((T, ti) => {
    const list = items.filter((q) => q.ty === ti), im = new THREE.InstancedMesh(T.geo, T.m, list.length);
    list.forEach((q, i) => { q.slot = i; im.setColorAt(i, new THREE.Color(q.col)); });
    im.instanceColor.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false; root.add(im);
    return im;
  });
  const _o = new THREE.Object3D(), sy = Lo.streetY;

  return {
    update(t, S) {
      const tr = S.trash, clean = S.build.clean, built = S.build.inlets;
      ims.forEach((im) => { im.visible = tr > 0.001 && built > 0.99; });
      if (!(tr > 0.001 && built > 0.99)) return;
      for (const q of items) {
        // chegada pela sarjeta (k = 0 longe, 1 na grelha); na limpeza tudo é recolhido (encolhe e sobe)
        const k = clean > 0 ? 1 : L.clamp01((tr - q.d * 0.9) / 0.38), e = L.ease.out(k);
        const gone = L.clamp01((clean - q.d * 0.7) / 0.3);
        let x = L.lerp(q.x0, q.px, e), z = L.lerp(q.zr, q.pz, L.sstep(0.75, 1, k)), y = sy(x) + (k >= 1 ? q.py : 0.03);
        // bóia quando há lâmina d'água sobre a rua; a fervura da grelha empurra para os lados
        const depth = S.flood - sy(x);
        if (depth > 0.04) {
          const push = (q.gx === hook ? 1 : 0.5) * S.spout * L.clamp01(depth / 0.3) * (k >= 1 ? 1 : 0);
          x += Math.cos(q.ang) * push * (0.5 + 0.9 * (q.ph / 6)); z += Math.sin(q.ang) * push * 0.45;
          y = Math.max(y, S.flood + 0.01 + 0.015 * Math.sin(t * 2.3 + q.ph));
        }
        z = Math.min(z, 23.45);
        const rollK = (1 - k) * 8;
        const s = q.s * L.clamp01(k * 6 + (k > 0 ? 0.15 : 0)) * (1 - gone);
        _o.position.set(x, y + q.s * 0.25 + gone * 0.8, z);
        _o.rotation.set(q.rot[0] * (q.ty === 3 ? 0.1 : 1), q.rot[1] + rollK * q.spin * 0.2 + 0.2 * Math.sin(t * 1.3 + q.ph), q.rot[2] * (q.ty === 3 ? 0.1 : 0.3) + rollK);
        _o.scale.setScalar(s); _o.updateMatrix(); ims[q.ty].setMatrixAt(q.slot, _o.matrix);
      }
      ims.forEach((im) => { im.instanceMatrix.needsUpdate = true; });
    }
  };
}
