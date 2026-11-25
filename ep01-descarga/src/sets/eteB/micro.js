// Mundo microscópico: bactérias (bastonetes com flagelos, cocos em cadeia, vibriões), grumos de matéria orgânica e bolhas.
export function buildMicro(L, K, T) {
  const { THREE, BGU, PAL, TAU } = L;
  const g = new THREE.Group();
  const X = new THREE.Vector3(1, 0, 0), _m = new THREE.Matrix4(), _m2 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _c = new THREE.Color();
  const rd = L.rng(77);
  const R = (a, b) => a + (b - a) * rd();

  /* ---------- fundo: água turva com profundidade ---------- */
  const dgeo = new THREE.SphereGeometry(140, 32, 20), dc = [], dp = dgeo.attributes.position;
  for (let i = 0; i < dp.count; i++) { const k = L.clamp01(dp.getY(i) / 140 * 0.5 + 0.5), v = 0.28 + 0.95 * Math.pow(k, 1.6); dc.push(v, v, v); }
  dgeo.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  const dome = new THREE.Mesh(dgeo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  dome.renderOrder = -10; dome.frustumCulled = false; g.add(dome);
  // feixes de luz vindos de cima
  const shaftTex = K.canvasTex(64, 256, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h); });
  const shaftMat = new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, color: '#fff3c4' });
  const shafts = [];
  [0, 60].forEach((cx) => { for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(R(2.5, 5), 60), shaftMat); s.position.set(cx + R(-12, 12), 8, R(-26, -6)); s.rotation.z = R(-0.35, -0.15); s.userData = { z: s.rotation.z, ph: R(0, 6) }; s.renderOrder = 5; shafts.push(s); g.add(s); } });

  /* ---------- geometria ---------- */
  const rodGeo = new THREE.CapsuleGeometry(0.2, 0.78, 4, 12).rotateZ(Math.PI / 2);
  const shellGeo = new THREE.CapsuleGeometry(0.255, 0.8, 4, 12).rotateZ(Math.PI / 2);
  const vibPts = []; for (let i = 0; i <= 10; i++) { const a = L.lerp(-0.85, 0.85, i / 10); vibPts.push([Math.sin(a) * 0.62, (Math.cos(a) - 1) * 0.62 + 0.1, 0]); }
  const vibCurve = L.curve(vibPts);
  const vibGeo = K.merge([new THREE.TubeGeometry(vibCurve, 14, 0.17, 10, false), K.tf(new THREE.SphereGeometry(0.17, 10, 8), vibPts[0]), K.tf(new THREE.SphereGeometry(0.17, 10, 8), vibPts[10])]);
  const cocGeo = new THREE.SphereGeometry(0.25, 14, 10);
  const flPts = []; for (let i = 0; i <= 26; i++) { const u = i / 26, a = u * TAU * 2.4, rr = 0.13 * Math.min(1, u * 4); flPts.push([-u * 1.9, Math.sin(a) * rr, Math.cos(a) * rr - (i === 0 ? 0 : 0)]); }
  const flGeo = new THREE.TubeGeometry(L.curve(flPts), 22, 0.015, 4, false);
  let blobGeo = new THREE.SphereGeometry(1, 28, 20);
  { const p = blobGeo.attributes.position; for (let i = 0; i < p.count; i++) { _v.fromBufferAttribute(p, i).normalize(); const n = 1 + 0.2 * Math.sin(_v.x * 4.1 + 1.3) * Math.sin(_v.y * 3.7 + 0.4) + 0.14 * Math.sin(_v.z * 6.3 + _v.x * 2.9) + 0.09 * Math.sin(_v.y * 9.1 + _v.z * 7.7 + 2); p.setXYZ(i, _v.x * n, _v.y * n, _v.z * n); } blobGeo.computeVertexNormals(); }

  /* ---------- entidades ---------- */
  const clumps = [], blobs = [], ents = [], fls = [], cocci = [];
  function addClump(x, y, z, r, eat, delay = 0) {
    const ci = clumps.length; clumps.push({ p: L.V(x, y, z), r, eat, delay, ax: L.V(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), sp: R(-0.25, 0.25) });
    const n = r > 1.2 ? 7 : 4;
    for (let i = 0; i < n; i++) { const o = i === 0 ? L.V(0, 0, 0) : L.V(R(-1, 1), R(-1, 1), R(-1, 1)).normalize().multiplyScalar(r * R(0.45, 0.8)); blobs.push({ ci, o, s: L.V(1, 1, 1).multiplyScalar(i === 0 ? r * 0.82 : r * R(0.35, 0.58)).multiply(L.V(R(0.85, 1.15), R(0.8, 1.1), R(0.85, 1.15))), q: new THREE.Quaternion().setFromEuler(new THREE.Euler(R(0, 6), R(0, 6), R(0, 6))), col: _c.set([PAL.sewage, PAL.poop, '#8a5a30', '#5e3d22'][Math.floor(R(0, 4))]).clone() }); }
    return ci;
  }
  const rodCols = ['#35e0b8', '#2fcfc0', '#52e6a6', '#3bd6d0', '#69efc2'], vibCols = ['#ffd23f', '#ffc14a', '#ffe06a', '#f6b12c'], cocCols = ['#b58cf5', '#c79cff', '#a67cf0', '#d1a8ff'];
  function addEnt(type, p, o = {}) {
    const dir = o.dir ?? L.V(R(-1, 1), R(-0.5, 0.5), R(-1, 1)).normalize();
    const e = { type, p, dir, sp: R(0.25, 0.9), ph: R(0, TAU), size: R(0.85, 1.25) * (o.size ?? 1), target: o.target ?? -1, surf: o.surf, q0: new THREE.Quaternion().setFromUnitVectors(X, dir), wob: L.V(R(-1, 1), R(-1, 1), R(-1, 1)).normalize(), idx: 0, m: new THREE.Matrix4() };
    if (type === 2) { // cadeia de cocos
      const n = Math.floor(R(4, 9)), bend = R(-0.35, 0.35), bend2 = R(-0.3, 0.3); let a = 0, b = 0, x = -n * 0.21, y = 0, z = 0;
      for (let i = 0; i < n; i++) { cocci.push({ e, o: L.V(x, y, z), col: cocCols[Math.floor(R(0, 4))] }); a += bend; b += bend2; x += Math.cos(a) * 0.43; y += Math.sin(a) * 0.43; z += Math.sin(b) * 0.2; }
      e.sp *= 0.35;
    } else {
      const half = type === 0 ? 0.58 : 0.52, nf = type === 0 ? (rd() < 0.4 ? 3 : 1) : 1;
      for (let i = 0; i < nf; i++) { const loc = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(0, i ? R(-0.6, 0.6) : 0, i ? R(-0.6, 0.6) : (type === 1 ? -0.5 : 0))); loc.setPosition(-half + (i ? 0.1 : 0), type === 1 ? -0.38 : 0, 0); fls.push({ e, loc, ph: R(0, TAU), sp: R(9, 15), len: R(0.8, 1.25) }); }
    }
    ents.push(e); return e;
  }
  const farFromLine = (p, z0) => !(p.z > z0 && Math.hypot(p.x - 0.3, p.y - 0.3) < 2.3);
  // volume A (plano 2: voo entre as bactérias)
  [[3.4, -2.6, -8, 1.5], [-3.6, 2.6, -13, 1.9], [-3.2, -4.2, -4.5, 0.9], [3.6, 3.8, -16, 1.6], [0.5, -5.5, -11, 1.2], [-5, -1, -20, 2.2], [5, -0.5, -22, 1.8], [2.3, 4.6, -5.5, 0.7], [-1.2, 6.5, -9, 1.0], [-4.6, 6, -18, 1.3]].forEach((c) => addClump(c[0], c[1], c[2], c[3], false));
  const nA = clumps.length;
  for (let i = 0; i < 170; i++) {
    let p; do { p = L.V(R(-7.5, 7.5), R(-11, 11), R(-27, 6)); } while (!farFromLine(p, -4) || clumps.some((c) => c.p.distanceTo(p) < c.r + 0.5));
    const k = rd(); addEnt(k < 0.56 ? 0 : k < 0.8 ? 1 : 2, p);
  }
  for (let ci = 0; ci < nA; ci++) for (let i = 0; i < 3 + clumps[ci].r * 2.5; i++) addEnt(rd() < 0.7 ? 0 : 1, clumps[ci].p.clone(), { target: ci, surf: L.V(R(-1, 1), R(-1, 1), R(-0.2, 1)).normalize() });
  // volume B (plano 3b: as bactérias devoram os grumos), centrado em x = 60
  const hero = addClump(60, 0.2, 0, 2.1, true, 0);
  [[56.6, 3.6, -3.5, 1.1, 0.15], [63.6, -3.4, -2.5, 1.2, 0.25], [63.2, 4.3, -5, 0.9, 0.1], [56.2, -3.9, -4.5, 1.0, 0.3], [59, 6.8, -8, 1.3, 0.2], [61.5, -7, -7, 1.3, 0.05], [66, 1, -10, 1.5, 0.2], [53.5, 0.5, -10, 1.5, 0.1]].forEach((c) => addClump(c[0], c[1], c[2], c[3], true, c[4]));
  for (let ci = hero; ci < clumps.length; ci++) {
    const c = clumps[ci], n = ci === hero ? 26 : Math.round(4 + c.r * 4);
    for (let i = 0; i < n; i++) {
      const surf = L.V(R(-1, 1), R(-1, 1), R(-0.35, 1)).normalize(), from = c.p.clone().addScaledVector(surf, c.r + R(2.5, 7)).add(L.V(R(-2, 2), R(-2, 2), R(-1, 1)));
      addEnt(rd() < 0.62 ? 0 : 1, from, { target: ci, surf, dir: surf.clone().negate() });
    }
  }
  for (let i = 0; i < 70; i++) {
    let p; do { p = L.V(60 + R(-8, 8), R(-11, 11), R(-24, 3)); } while (clumps.some((c) => c.p.distanceTo(p) < c.r + 1.2) || (p.z > -1 && Math.hypot(p.x - 60, p.y) < 3.2));
    const k = rd(); addEnt(k < 0.45 ? 0 : k < 0.7 ? 1 : 2, p);
  }

  /* ---------- malhas instanciadas ---------- */
  const count = (t) => ents.filter((e) => e.type === t).length;
  const inst = (geo, material, n, cast = true) => { const im = new THREE.InstancedMesh(geo, material, n); im.frustumCulled = false; im.castShadow = cast; im.receiveShadow = cast; g.add(im); return im; };
  const rods = inst(rodGeo, L.glossy(0xffffff, { roughness: 0.3, emissive: '#0c5a4c', emissiveIntensity: 0.35 }), count(0));
  const shell = inst(shellGeo, L.mat('#aaffea', { transparent: true, opacity: 0.2, roughness: 0.15, depthWrite: false }), count(0), false);
  shell.instanceMatrix = rods.instanceMatrix; shell.renderOrder = 3;
  const vibs = inst(vibGeo, L.glossy(0xffffff, { roughness: 0.3, emissive: '#6b4a00', emissiveIntensity: 0.3 }), count(1));
  const cocs = inst(cocGeo, L.glossy(0xffffff, { roughness: 0.28, emissive: '#3a1f78', emissiveIntensity: 0.35 }), cocci.length);
  const flag = inst(flGeo, L.mat('#d9fff0', { roughness: 0.5, emissive: '#7fd8c4', emissiveIntensity: 0.3, transparent: true, opacity: 0.75 }), fls.length, false);
  const blobM = inst(blobGeo, L.mat(0xffffff, { roughness: 0.95 }), blobs.length);
  let ir = 0, iv = 0;
  ents.forEach((e) => { if (e.type === 0) { e.idx = ir; rods.setColorAt(ir++, _c.set(rodCols[Math.floor(R(0, 5))])); } else if (e.type === 1) { e.idx = iv; vibs.setColorAt(iv++, _c.set(vibCols[Math.floor(R(0, 4))])); } });
  cocci.forEach((c, i) => cocs.setColorAt(i, _c.set(c.col)));
  blobs.forEach((b, i) => blobM.setColorAt(i, b.col));
  [rods, vibs, cocs, blobM].forEach((im) => { im.instanceColor.needsUpdate = true; });
  // partículas dissolvidas
  const specks = [];
  for (let i = 0; i < 620; i++) { const B = i % 3 === 0; specks.push({ p: L.V((B ? 60 : 0) + R(-8, 8), R(-11, 11), R(-24, 7)), ph: R(0, TAU), s: R(0.03, 0.09), d: R(0, 1) }); }
  const speckM = inst(new THREE.IcosahedronGeometry(1, 0), L.mat(0xffffff, { roughness: 0.9, flatShading: true }), specks.length, false);
  specks.forEach((s, i) => speckM.setColorAt(i, _c.set([PAL.sewage, '#b08a3e', '#6b4a22', '#c9a85a'][i % 4]))); speckM.instanceColor.needsUpdate = true;
  // bolhas de ar
  const bubs = [];
  for (let i = 0; i < 46; i++) bubs.push({ x: (i % 2 ? 60 : 0) + R(-7, 7), z: R(-22, 2), ph: R(0, 1), sp: R(0.05, 0.11), s: R(0.25, 0.9), w: R(0, TAU) });
  const bubM = inst(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshPhysicalMaterial({ color: '#eafcff', transparent: true, opacity: 0.16, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false, emissive: '#bfefff', emissiveIntensity: 0.1 }), bubs.length, false);
  bubM.renderOrder = 4;
  const bubRim = inst(new THREE.SphereGeometry(1.03, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, side: THREE.BackSide, depthWrite: false }), bubs.length, false);
  bubRim.instanceMatrix = bubM.instanceMatrix; bubRim.renderOrder = 4;

  const murky = new THREE.Color(PAL.murky), haze = new THREE.Color(PAL.haze), col = new THREE.Color(), fogCol = new THREE.Color();
  const cState = clumps.map(() => ({ r: 1, p: new THREE.Vector3(), q: new THREE.Quaternion() }));

  function update(t) {
    const clear = L.sstep(T.eat0 + 0.25, T.eat1 - 0.15, t); // água clareando no plano 3b
    col.copy(murky).lerp(haze, clear); dome.material.color.copy(col).multiplyScalar(1.25); fogCol.copy(col).multiplyScalar(0.62);
    shafts.forEach((s) => { s.rotation.z = s.userData.z + Math.sin(t * 0.5 + s.userData.ph) * 0.04; });
    shaftMat.opacity = 0.13 + 0.1 * clear;
    const tt = t - 68;
    clumps.forEach((c, i) => {
      const st = cState[i];
      st.r = c.eat ? 1 - L.sstep(T.eat0 + 0.1 + c.delay, T.eat1 - 0.3 + c.delay * 0.4, t) : 1;
      st.p.copy(c.p); st.p.y += Math.sin(t * 0.6 + i) * 0.12;
      st.q.setFromAxisAngle(c.ax, tt * c.sp);
    });
    blobs.forEach((b, i) => {
      const st = cState[b.ci], k = st.r;
      _p.copy(b.o).multiplyScalar(0.35 + 0.65 * k).applyQuaternion(st.q).add(st.p); _q.copy(st.q).multiply(b.q); _s.copy(b.s).multiplyScalar(k);
      blobM.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    ents.forEach((e) => {
      const wob = Math.sin(t * 1.7 + e.ph);
      _p.copy(e.p).addScaledVector(e.dir, e.sp * tt).addScaledVector(e.wob, wob * 0.18);
      _q2.setFromAxisAngle(e.wob, wob * 0.22); _q.copy(_q2).multiply(e.q0);
      if (e.target >= 0) {
        const c = clumps[e.target], st = cState[e.target];
        const a = c.eat ? L.sstep(T.eat0 - 0.75 + (e.ph / TAU) * 0.55, T.eat0 + 0.25 + (e.ph / TAU) * 0.7, t) : 1;
        // ponto de contato rasteja devagar sobre o grumo e acompanha o encolhimento
        _v.copy(e.surf).applyAxisAngle(e.wob, Math.sin(t * 0.9 + e.ph) * 0.18).applyQuaternion(st.q);
        const rr = c.r * (0.25 + 0.75 * st.r) * 0.92 + 0.5 * e.size + Math.sin(t * 9 + e.ph * 3) * 0.045;
        _s.copy(st.p).addScaledVector(_v, rr);
        _p.lerp(_s, a);
        _q2.setFromUnitVectors(X, _v.negate()); _q.slerp(_q2, a);
      }
      _s.setScalar(e.size); e.m.compose(_p, _q, _s);
      if (e.type === 0) rods.setMatrixAt(e.idx, e.m); else if (e.type === 1) vibs.setMatrixAt(e.idx, e.m);
    });
    cocci.forEach((c, i) => { _m.makeTranslation(c.o.x, c.o.y, c.o.z); _m.premultiply(c.e.m); cocs.setMatrixAt(i, _m); });
    fls.forEach((f, i) => { _m2.makeRotationX(t * f.sp + f.ph); _m2.scale(_s.set(f.len, 1, 1)); _m.multiplyMatrices(f.e.m, f.loc).multiply(_m2); flag.setMatrixAt(i, _m); });
    specks.forEach((s, i) => {
      const k = 1 - L.sstep(T.eat0 + s.d * 1.0, T.eat0 + 0.5 + s.d * 1.2, t) * (s.p.x > 30 ? 1 : 0);
      _p.set(s.p.x + Math.sin(t * 0.7 + s.ph) * 0.3, s.p.y + Math.cos(t * 0.5 + s.ph * 2) * 0.3, s.p.z + Math.sin(t * 0.4 + s.ph * 3) * 0.3);
      _q.setFromAxisAngle(X, t + s.ph); _s.setScalar(s.s * k); speckM.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    bubs.forEach((b, i) => {
      const u = L.fract(b.ph + t * b.sp);
      _p.set(b.x + Math.sin(t * 1.3 + b.w) * 0.25, -13 + u * 26, b.z); _q.identity(); _s.setScalar(b.s * (0.9 + 0.1 * Math.sin(t * 5 + b.w)));
      bubM.setMatrixAt(i, _m.compose(_p, _q, _s));
    });
    [rods, vibs, cocs, flag, blobM, speckM, bubM].forEach((im) => { im.instanceMatrix.needsUpdate = true; });
    return { fogCol, clear };
  }
  return { group: g, update, hero: clumps[hero].p };
}
