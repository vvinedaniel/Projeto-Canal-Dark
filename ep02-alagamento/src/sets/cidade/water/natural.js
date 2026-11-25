// ESCOAMENTO NATURAL (antes da cidade): filetes que descem a encosta seguindo o relevo (descida pelo gradiente de
// Gnat) até o córrego da frente ou o rio. Fitas rasas que acompanham o chão + partículas de espuma.
export function makeNatural(ctx, hm) {
  const { L, THREE, scene, Lo } = ctx;
  const root = new THREE.Group(); root.name = 'water.natural'; scene.add(root);
  const g = (x, z) => Lo.Gnat(x, z);
  const rd = L.rng(1717);
  // descida pelo gradiente com um pouco de inércia (curvas suaves)
  function descend(x, z) {
    const pts = [[x, z]]; let vx = 0, vz = 0;
    for (let i = 0; i < 500; i++) {
      const e = 0.3, gx = (g(x + e, z) - g(x - e, z)) / (2 * e), gz = (g(x, z + e) - g(x, z - e)) / (2 * e);
      let dx = -gx, dz = -gz; const m = Math.hypot(dx, dz);
      if (m < 1e-4) { dx = 0.3; dz = 1; } else { dx /= m; dz /= m; }
      vx = vx * 0.6 + dx * 0.4; vz = vz * 0.6 + dz * 0.4; const vm = Math.hypot(vx, vz) || 1;
      x += (vx / vm) * 0.35; z += (vz / vm) * 0.35;
      pts.push([x, z]);
      if (Lo.creekCut(x, z) > 0.12 || x > Lo.RIVER.x0 + 0.4 || z > Lo.ZF - 0.3) break;
    }
    return pts;
  }
  const seeds = [];
  for (let k = 0; k < 16; k++) seeds.push([-30 + rd() * 46, -16 + rd() * 26]);
  seeds.push([-20, 8], [-10, 14], [0, 10], [12, 4], [18, 12], [6, -6], [-26, 12]);
  const mat = L.water('#4f7f9a', 0.85, { roughness: 0.1, side: THREE.DoubleSide });
  const rills = [];
  seeds.forEach(([x, z], k) => {
    const P = descend(x, z);
    if (P.length < 12) return;
    const n = P.length, pos = [], idx = [], uLen = [];
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const [px, pz] = P[i], [qx, qz] = P[Math.min(n - 1, i + 1)], [ox, oz] = P[Math.max(0, i - 1)];
      let tx = qx - ox, tz = qz - oz; const tm = Math.hypot(tx, tz) || 1; tx /= tm; tz /= tm;
      if (i) acc += Math.hypot(px - P[i - 1][0], pz - P[i - 1][1]);
      const w = 0.12 + 0.3 * Math.min(1, i / n * 1.6) + 0.05 * Math.sin(i * 0.7 + k);
      for (const s of [-1, 1]) { const xx = px - tz * w * s, zz = pz + tx * w * s; pos.push(xx, g(xx, zz) + 0.04, zz); uLen.push(acc); }
      if (i < n - 1) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    geo.setAttribute('aL', new THREE.Float32BufferAttribute(uLen.map((v) => v / acc), 1));
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 9; m.receiveShadow = true; m.castShadow = false; root.add(m);
    const pts3 = P.filter((_, i) => i % 2 === 0).map(([px, pz]) => [px, g(px, pz) + 0.07, pz]);
    const f = new L.Flow(pts3, { n: Math.round(acc * 0.5), size: 0.04, color: '#dcebf0', seed: 500 + k, geo: new THREE.SphereGeometry(1, 6, 4), material: L.mat(0xffffff, { roughness: 0.7 }) });
    root.add(f.mesh);
    rills.push({ m, f, len: acc });
  });
  // revela de cima para baixo (a água "chega" ao córrego): recorte por aL
  const RU = { uHead: { value: 0 } };
  { const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh) => {
      prev(sh); Object.assign(sh.uniforms, RU);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aL; varying float vL;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvL = aL;');
      sh.fragmentShader = sh.fragmentShader.replace('uniform float uWStr;', 'uniform float uWStr; uniform float uHead; varying float vL;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nif (vL > uHead) discard; diffuseColor.a *= smoothstep(uHead, uHead - 0.05, vL);');
    };
    mat.customProgramCacheKey = () => 'water-rill-v1';
  }
  mat.depthWrite = false;
  function update(t, S) {
    const a = S.runoffNatural * (S.build.clear < 0.02 ? 1 : 0);
    root.visible = a > 0.01;
    if (!root.visible) return;
    RU.uHead.value = 0.05 + 0.97 * a;
    rills.forEach(({ f, len }) => f.update(t, { speed: 1.1 / len, head: a, amount: 1 }));
  }
  return { update, root };
}
