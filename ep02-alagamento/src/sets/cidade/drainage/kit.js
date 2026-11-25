// Peças comuns do módulo de drenagem: materiais (com cache), lajes com face de corte, vigas entre dois pontos,
// corpo d'água dinâmico em corte, tampas de poço de visita com texto, revelação progressiva de tubos.
export function makeKit(ctx) {
  const { L, THREE, Lo } = ctx, { PAL } = L, DS = THREE.DoubleSide, ZF = Lo.ZF;
  const cache = new Map();
  const M = (color, o = {}) => { const k = color + JSON.stringify(o); if (!cache.has(k)) cache.set(k, L.mat(color, o)); return cache.get(k); };

  /* ---------- materiais ---------- */
  const C = {
    conc: L.mat('#c9ced2', { roughness: 0.86 }),             // concreto pré-moldado (galeria, caixas)
    concCut: L.mat('#949ca3', { roughness: 0.92 }),          // face cortada do concreto
    concOld: L.mat('#a7adb1', { roughness: 0.92 }),           // concreto moldado no local (canal)
    joint: L.mat('#5d656c', { roughness: 0.9 }),             // juntas entre aduelas
    iron: L.metal('#3a434b', { roughness: 0.5, metalness: 0.65 }), // ferro fundido (grelhas, tampas)
    ironDark: L.mat('#15191d', { roughness: 0.8 }),
    steel: L.metal('#9aa6b0', { roughness: 0.35 }),
    throat: L.mat('#0d1014', { roughness: 1 }),
    gravel: L.mat('#7f7a70', { roughness: 1 }),
    sand: L.mat('#cdb27a', { roughness: 1 }),
    pvc: L.mat(PAL.pvc, { roughness: 0.5, side: DS }),
    pvcCut: L.mat('#a9561c', { roughness: 0.8, side: DS }),
    pvcTube: L.mat(PAL.pvc, { roughness: 0.5 }),
    efl: L.mat('#7fb3c9', { roughness: 0.5 }),
    rock: L.mat(PAL.rock, { roughness: 0.92, flatShading: true }),
    // águas (sempre L.water: ondulação + cáusticas contínuas)
    wDrain: L.water('#5f9fc4', 0.84, { side: DS, depthWrite: false }),
    wDrainFall: L.water('#8fc0dc', 0.62, { side: DS, depthWrite: false }),
    wSew: L.water(PAL.sewage, 0.94, { side: DS }),
    wClear: L.water(PAL.clear, 0.8, { side: DS, depthWrite: false }),
    aer: L.water('#b4daee', 0.72, { side: DS, depthWrite: false }), // água aerada (esguicho/fervura)
    foam: L.mat('#e8f3f8', { roughness: 0.4, transparent: true, opacity: 0.55, depthWrite: false })
  };
  [C.wDrain, C.wDrainFall, C.wClear, C.foam, C.aer].forEach((m) => { m.userData.ro = 6; });

  /** caixa alinhada aos eixos com a face +z (corte) em material próprio */
  const faces = (m, cut) => [m, m, m, m, cut, m];
  function slab(x0, x1, y0, y1, z0, z1, m = C.conc, cut = C.concCut) {
    return L.mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), faces(m, cut), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  }
  /** caixa entre dois pontos (eixo local x ao longo de a→b), seção w × h */
  const _a = new THREE.Vector3(), _b = new THREE.Vector3();
  function beam(a, b, w, h, m, o = {}) {
    const mm = L.mesh(new THREE.BoxGeometry(1, 1, 1), m);
    setBeam(mm, a, b, w, h); if (o.cast === false) mm.castShadow = false;
    return mm;
  }
  function setBeam(mm, a, b, w, h) {
    _a.set(...(a.isVector3 ? a.toArray() : a)); _b.set(...(b.isVector3 ? b.toArray() : b));
    const d = _b.clone().sub(_a), len = d.length();
    mm.position.copy(_a).add(_b).multiplyScalar(0.5);
    mm.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize());
    mm.scale.set(Math.max(1e-4, len), h, w);
  }
  /** cilindro entre dois pontos */
  function rodBetween(mm, a, b, r) {
    _a.set(...(a.isVector3 ? a.toArray() : a)); _b.set(...(b.isVector3 ? b.toArray() : b));
    const d = _b.clone().sub(_a), len = d.length();
    mm.position.copy(_a).add(_b).multiplyScalar(0.5);
    mm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), len > 1e-6 ? d.normalize() : new THREE.Vector3(0, 1, 0));
    mm.scale.set(r, Math.max(1e-4, len), r);
  }
  const rod = (m, seg = 10) => { const mm = L.mesh(new THREE.CylinderGeometry(1, 1, 1, seg), m); return mm; };

  /** Corpo d'água em corte (face na frente em z = zf, lâmina em cima indo até zBack). n colunas ao longo de x.
      update(xs, bot, top, zBack): arrays de n+1 valores. Colunas com top <= bot somem. */
  function cutWater(n, m, zf = ZF + 0.003) {
    const N = n + 1, pos = new Float32Array(N * 4 * 3), nor = new Float32Array(N * 4 * 3), idx = [];
    for (let i = 0; i < N; i++) { nor.set([0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0], i * 12); }
    for (let i = 0; i < n; i++) {
      const a = i * 4, b = (i + 1) * 4;
      idx.push(a, b, a + 1, a + 1, b, b + 1);          // face da frente (0 = fundo, 1 = topo)
      idx.push(a + 2, b + 2, a + 3, a + 3, b + 2, b + 3); // lâmina (2 = frente, 3 = fundo)
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
    const mesh = L.mesh(g, m, 0, 0, 0, { cast: false }); mesh.frustumCulled = false; mesh.renderOrder = m.userData.ro ?? 0;
    function update(xs, bot, top, zBack) {
      let any = false;
      for (let i = 0; i < N; i++) {
        const b = bot[i], t = Math.max(b, top[i]), x = xs[i], o = i * 12;
        if (t > b + 0.004) any = true;
        pos[o] = x; pos[o + 1] = b; pos[o + 2] = zf; pos[o + 3] = x; pos[o + 4] = t; pos[o + 5] = zf;
        pos[o + 6] = x; pos[o + 7] = t; pos[o + 8] = zf; pos[o + 9] = x; pos[o + 10] = t; pos[o + 11] = zBack[i];
      }
      g.attributes.position.needsUpdate = true; mesh.visible = any;
    }
    return { mesh, update };
  }

  /** textura de tampa de ferro fundido com texto (PLUVIAL / ESGOTO) */
  function lidTex(text, tone) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    g.fillStyle = tone; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 5;
    for (let r = 120; r > 20; r -= 22) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.beginPath(); g.arc(128, 128, 118, 0, Math.PI * 2); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 3; for (let i = -256; i < 512; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); }
    g.restore();
    g.fillStyle = tone; g.fillRect(28, 104, 200, 48);
    g.fillStyle = 'rgba(235,240,244,.92)'; g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 130);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  /** tampa redonda de poço de visita (topo em y) */
  function lid(text, tone, r = 0.36) {
    const g = new THREE.Group();
    const top = L.metal('#ffffff', { map: lidTex(text, tone), roughness: 0.55, metalness: 0.55 });
    const c = L.mesh(new THREE.CylinderGeometry(r, r, 0.04, 28), [C.iron, top, C.iron], 0, -0.02, 0, { cast: false });
    c.rotation.y = -Math.PI / 2;
    g.add(c, L.mesh(new THREE.CylinderGeometry(r + 0.09, r + 0.09, 0.03, 28), C.iron, 0, -0.025, 0, { cast: false }));
    return g;
  }

  /** revelação de um cutPipe ao longo do comprimento (u 0..1) */
  function revealCut(cp, u, seg, rad) {
    const k = Math.round(L.clamp01(u) * seg);
    cp.group.children.forEach((ch, i) => { if (!ch.isMesh) return; const per = i < 2 ? rad * 6 : 6; ch.geometry.setDrawRange(0, k * per); });
    cp.group.visible = k > 0;
  }
  /** revelação de um TubeGeometry ao longo do comprimento */
  function revealTube(m, u, tubular, radial) { const k = Math.round(L.clamp01(u) * tubular); m.geometry.setDrawRange(0, k * radial * 6); m.visible = k > 0; }

  const sub = (k, a, b) => L.clamp01((k - a) / (b - a));
  return { C, M, slab, faces, beam, setBeam, rod, rodBetween, cutWater, lid, revealCut, revealTube, sub, DS, ZF };
}
