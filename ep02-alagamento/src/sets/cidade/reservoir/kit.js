// Peças comuns do piscinão: materiais em cache, fusão de malhas, haste entre dois pontos, flanges, textos em canvas,
// geometria de parede com topo seguindo o terreno. Copiado/adaptado do Ep. 01 (rede/kit.js, eteA/kit.js).
export function makeKit(L) {
  const { THREE, BGU, PAL } = L;
  const cache = new Map();
  const M = (color, o = {}) => { const k = color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };
  const G = (color, o = {}) => { const k = 'g' + color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.glossy(color, o)); return cache.get(k); };
  const MAT = {
    conc: M('#c9cdd0', { roughness: 0.86 }), concNew: M('#d8dbdc', { roughness: 0.82 }), concDark: M('#9aa2a9', { roughness: 0.9 }),
    cut: M('#e6e2da', { roughness: 0.9 }), form: M('#c8925a', { roughness: 0.8 }), formDark: M('#8a6440', { roughness: 0.85 }),
    steel: L.metal('#bcc6cf'), galv: M('#a9b3ba', { roughness: 0.45, metalness: 0.6 }), dark: M('#262c33', { roughness: 0.6 }),
    rubber: M('#1c1f23', { roughness: 0.9 }), iron: M('#4d5964', { roughness: 0.5, metalness: 0.55 }),
    yellow: G('#f2b31b', { roughness: 0.32 }), yellowM: M('#e9a90f', { roughness: 0.5 }), rail: M('#f2c230', { roughness: 0.45, metalness: 0.2 }),
    blue: G('#3f77b0', { roughness: 0.38 }), red: G('#cf3a2b', { roughness: 0.35 }), glass: M('#2c4a5e', { roughness: 0.06, metalness: 0.7, transparent: true, opacity: 0.62 }),
    pave: M('#d6cfc1', { roughness: 0.9 }), grass: M('#5cae3f', { roughness: 0.95 }), asphalt: M('#353b43', { roughness: 0.95 }), patch: M('#2b3037', { roughness: 0.9 }),
    white: M('#f4f5f2', { roughness: 0.6 }), green: M('#2f9d57', { roughness: 0.55 }), orange: G('#e26a24', { roughness: 0.35 }), cabRed: G('#d8433a', { roughness: 0.3 })
  };
  const V = (x, y, z) => new THREE.Vector3(x, y, z), up = V(0, 1, 0);

  /** Funde as malhas de um grupo (sem pai) em uma malha por material. */
  function bake(src) {
    src.updateMatrixWorld(true);
    const by = new Map(), out = new THREE.Group(), keep = [];
    src.traverse((m) => {
      if (m.isInstancedMesh) { keep.push(m); return; }
      if (!m.isMesh) return;
      const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      Object.keys(g.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
      if (!g.attributes.normal) g.computeVertexNormals();
      g.applyMatrix4(m.matrixWorld);
      const key = m.material.uuid + (m.castShadow ? 1 : 0) + (m.receiveShadow ? 1 : 0);
      if (!by.has(key)) by.set(key, { m, list: [] });
      by.get(key).list.push(g);
    });
    by.forEach(({ m, list }) => { const mm = new THREE.Mesh(BGU.mergeGeometries(list), m.material); mm.castShadow = m.castShadow; mm.receiveShadow = m.receiveShadow; out.add(mm); });
    keep.forEach((m) => { const mw = m.matrixWorld.clone(); out.add(m); mw.decompose(m.position, m.quaternion, m.scale); });
    return out;
  }
  /** cilindro de a até b */
  function rod(a, b, r, m, seg = 10) {
    a = L.v3(a); b = L.v3(b);
    const d = b.clone().sub(a), c = L.cyl(r, r, d.length(), m, 0, 0, 0, seg);
    c.position.copy(a).addScaledVector(d, 0.5); c.quaternion.setFromUnitVectors(up, d.clone().normalize());
    return c;
  }
  /** posiciona uma malha-cilindro (altura 1, eixo y) entre dois pontos (para atualizar por quadro) */
  function placeRod(m, a, b) {
    const d = _d.copy(b).sub(a), len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(up, d.multiplyScalar(1 / Math.max(1e-6, len))); m.scale.set(1, len, 1);
  }
  const _d = new THREE.Vector3();
  /** flange com parafusos ao redor de um eixo (dir = 'x'|'y'|'z') */
  function flange(g, x, y, z, r, dir, m, bolts = 8, boltM = MAT.steel) {
    const f = L.cyl(r * 1.45, r * 1.45, r * 0.38, m, x, y, z, 18);
    const rot = (o) => { if (dir === 'x') o.rotation.z = Math.PI / 2; if (dir === 'z') o.rotation.x = Math.PI / 2; return o; };
    g.add(rot(f));
    for (let i = 0; i < bolts; i++) {
      const a = (i / bolts) * L.TAU, R = r * 1.22, c = Math.cos(a) * R, s = Math.sin(a) * R;
      const b = L.cyl(r * 0.09, r * 0.09, r * 0.55, boltM, 0, 0, 0, 6);
      if (dir === 'y') b.position.set(x + c, y, z + s); if (dir === 'x') b.position.set(x, y + c, z + s); if (dir === 'z') b.position.set(x + c, y + s, z);
      g.add(rot(b));
    }
  }
  /** textura com texto (placas, régua) */
  function canvasTex(w, h, draw) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    return tx;
  }
  /** Parede reta de a=[x,z] a b=[x,z], espessura th para a esquerda/direita (side = +1 ou −1 em relação à normal),
      fundo yb e topo topFn(x,z) amostrado em n pontos. Faces: interna, externa, topo, pontas. */
  function wallGeo(a, b, th, side, yb, topFn, n = 16) {
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), nx = (-dz / len) * side * th, nz = (dx / len) * side * th;
    const pos = [], quad = (p0, p1, p2, p3) => pos.push(...p0, ...p1, ...p2, ...p0, ...p2, ...p3);
    const P = (i, off, top) => { const u = i / n, x = a[0] + dx * u + nx * off, z = a[1] + dz * u + nz * off; return [x, top ? topFn(x - nx * off, z - nz * off) : yb, z]; };
    for (let i = 0; i < n; i++) {
      quad(P(i, 0, false), P(i + 1, 0, false), P(i + 1, 0, true), P(i, 0, true));
      quad(P(i + 1, 1, false), P(i, 1, false), P(i, 1, true), P(i + 1, 1, true));
      quad(P(i, 0, true), P(i + 1, 0, true), P(i + 1, 1, true), P(i, 1, true));
    }
    quad(P(0, 1, false), P(0, 0, false), P(0, 0, true), P(0, 1, true));
    quad(P(n, 0, false), P(n, 1, false), P(n, 1, true), P(n, 0, true));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    return g;
  }
  /** faixa horizontal ao longo de uma polilinha [[x,z],...] de largura w, altura y(x,z)+dy */
  function ribbon(pts, w, yFn, dy = 0) {
    const pos = [], idx = [];
    pts.forEach((p, i) => {
      const q0 = pts[Math.max(0, i - 1)], q1 = pts[Math.min(pts.length - 1, i + 1)], tx = q1[0] - q0[0], tz = q1[1] - q0[1], l = Math.hypot(tx, tz) || 1;
      const nx = -tz / l * w / 2, nz = tx / l * w / 2;
      pos.push(p[0] + nx, yFn(p[0] + nx, p[1] + nz) + dy, p[1] + nz, p[0] - nx, yFn(p[0] - nx, p[1] - nz) + dy, p[1] - nz);
      if (i) { const k = (i - 1) * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    if (g.attributes.normal.getY(0) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.computeVertexNormals(); }
    return g;
  }
  return { M, G, MAT, V, bake, rod, placeRod, flange, canvasTex, wallGeo, ribbon };
}
