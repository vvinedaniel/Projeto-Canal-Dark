// Canal de chegada, béquer de amostra, tanques de aeração em corte e casa de sopradores.
/** galpão industrial aberto na frente (z = 0, voltado para +z); x ∈ [-w/2, w/2], z ∈ [-d, 0] */
export function shed(L, K, w, d, hf, hb, o = {}) {
  const { THREE, PAL } = L, g = new THREE.Group(), m = K.m;
  g.add(K.wbox(w + 1.0, 0.25, d + 1.0, m.concrete, 0, 0.125, -d / 2));
  const wallM = o.wallMat ?? m.wall;
  g.add(L.box(w, hb, 0.25, wallM, 0, hb / 2 + 0.25, -d + 0.125));
  [-1, 1].forEach((s) => {
    const sw = L.extrude([[0, 0], [d, 0], [d, hf], [0, hb]], 0.25, wallM); sw.rotation.y = -Math.PI / 2; sw.position.set(s * w / 2 + (s > 0 ? 0 : 0.25), 0.25, -d); g.add(sw);
    g.add(L.box(0.08, 0.9, d + 0.06, m.brick, s * (w / 2 + 0.03) + (s > 0 ? 0 : 0), 0.7, -d / 2));
    // veneziana de ventilação
    const slats = [K.boxG(0.06, 1.5, 2.4, [0, 0, 0])]; for (let i = 0; i < 9; i++) slats.push(K.boxG(0.14, 0.035, 2.2, [s * 0.05, -0.62 + i * 0.155, 0], [0, 0, s * 0.6]));
    const lv = K.M(slats, m.iron); lv.position.set(s * (w / 2 + 0.03), 2.6, -d * 0.5); g.add(lv);
  });
  g.add(L.box(w + 0.1, 0.9, 0.08, m.brick, 0, 0.7, -d - 0.03));
  const cols = [], nc = o.cols ?? 2;
  for (let i = 0; i < nc; i++) { const x = L.lerp(-w / 2 + 0.12, w / 2 - 0.12, i / (nc - 1)); cols.push(K.boxG(0.2, hf, 0.2, [x, hf / 2 + 0.25, -0.12])); }
  cols.push(K.boxG(w, 0.3, 0.2, [0, hf + 0.1, -0.12]));
  g.add(K.M(cols, L.mat(o.frame ?? PAL.blue, { roughness: 0.5, metalness: 0.3 })));
  const slope = Math.atan2(hf - hb, d), rl = Math.hypot(d, hf - hb) + 1.3;
  const roof = L.box(w + 1.3, 0.1, rl, K.corrugated(o.roof ?? '#c9d3da', w + 1.3, 1), 0, (hf + hb) / 2 + 0.36, -d / 2); roof.rotation.x = slope; g.add(roof);
  const fascia = L.box(w + 1.36, 0.22, 0.08, L.mat(o.trim ?? PAL.roof, { roughness: 0.6 }), 0, hf + 0.3 + Math.sin(slope) * 0.6, 0.6); g.add(fascia);
  [-0.25, 0.25].forEach((k) => { const v = new THREE.Group(); v.add(K.M([K.cylG(0.28, 0.28, 0.35, [0, 0.17, 0], [0, 0, 0], 12), K.cylG(0.42, 0.42, 0.06, [0, 0.4, 0], [0, 0, 0], 12), K.tf(new THREE.SphereGeometry(0.36, 12, 6, 0, L.TAU, 0, Math.PI / 2), [0, 0.42, 0])], m.galv)); v.position.set(k * w, (hf + hb) / 2 + 0.4, -d / 2); g.add(v); });
  // luminárias
  const lamps = []; for (let i = 0; i < 3; i++) lamps.push(K.boxG(1.2, 0.06, 0.18, [L.lerp(-w * 0.3, w * 0.3, i / 2), hb - 0.15, -d * 0.5]));
  const lampM = L.glow('#fff4d6', 1.2); g.add(K.M(lamps, lampM));
  return { group: g, lampM };
}

export function buildAer(L, K) {
  const { THREE, PAL, TAU } = L, m = K.m;
  const g = new THREE.Group();
  const cutM = [m.cut, m.concrete];
  const exZ = (pts, z0, z1) => { const e = L.extrude(pts, z1 - z0, cutM); e.position.z = z0; return e; };
  const ZF = 8, ZB = -12; // face de corte / fundo dos tanques
  /* ---------- concreto ---------- */
  g.add(exZ([[-6.2, -4.6], [6.2, -4.6], [6.2, 0.7], [5.8, 0.7], [5.8, -4.2], [0.4, -4.2], [0.4, 0.7], [-0.4, 0.7], [-0.4, -4.2], [-5.8, -4.2], [-5.8, 0.7], [-6.2, 0.7]], ZB, ZF));
  g.add(K.wbox(12.4, 5.3, 0.4, m.concrete, 0, -1.95, ZB - 0.2));
  g.add(exZ([[-8.95, -1.25], [-7.05, -1.25], [-7.05, 0.5], [-7.3, 0.5], [-7.3, -1.0], [-8.7, -1.0], [-8.7, 0.5], [-8.95, 0.5]], ZB - 0.4, ZF));
  g.add(exZ([[-7.05, -0.3], [-6.2, -0.3], [-6.2, 0.5], [-7.05, 0.5]], ZB - 0.4, ZF));
  g.add(K.wbox(15.15, 0.25, 1.65, m.concrete, -1.375, -1.125, -13.225), K.wbox(15.15, 1.75, 0.25, m.concrete, -1.375, -0.375, -13.925), K.wbox(0.25, 1.75, 1.4, m.concrete, -8.825, -0.375, -13.1), K.wbox(0.25, 1.75, 1.4, m.concrete, 6.075, -0.375, -13.1));
  // comportas de entrada de cada tanque (com volante)
  [-3.1, 3.1].forEach((x) => {
    const gt = new THREE.Group(); gt.position.set(x, 0, -12.42);
    gt.add(K.M([K.boxG(1.3, 1.1, 0.06, [0, -0.2, 0]), K.boxG(0.1, 2.6, 0.1, [-0.7, 0.9, 0]), K.boxG(0.1, 2.6, 0.1, [0.7, 0.9, 0]), K.boxG(1.5, 0.12, 0.14, [0, 2.2, 0]), K.cylG(0.04, 0.04, 2.3, [0, 1.4, 0], [0, 0, 0], 6)], m.iron));
    const wh = [K.tf(new THREE.TorusGeometry(0.3, 0.035, 6, 18), [0, 2.55, 0], [Math.PI / 2, 0, 0])]; for (let i = 0; i < 2; i++) wh.push(K.seg([Math.cos(i * 1.57) * 0.3, 2.55, Math.sin(i * 1.57) * 0.3], [-Math.cos(i * 1.57) * 0.3, 2.55, -Math.sin(i * 1.57) * 0.3], 0.025, 5));
    gt.add(K.M(wh, L.mat(PAL.red, { roughness: 0.4 }))); g.add(gt);
  });

  /* ---------- água ---------- */
  const murkyTop = L.water(PAL.murky, 0.94, { roughness: 0.22 });
  g.add(L.box(1.4, 1.15, ZF - (ZB - 0.4), L.water(PAL.murky, 0.93), -8.0, -0.425, (ZF + ZB - 0.4) / 2 - 0.004, { cast: false }));
  g.add(L.box(14.65, 1.15, 1.4, L.water(PAL.murky, 0.93), -1.375, -0.425, -13.1, { cast: false }));
  const WL = 0.25, layerM = L.water(PAL.murky, 0.3, { depthWrite: false, side: THREE.DoubleSide, roughness: 0.3 });
  const surfs = [];
  [-3.1, 3.1].forEach((cx) => {
    const sg = new THREE.PlaneGeometry(5.4, ZF - ZB, 18, 60).rotateX(-Math.PI / 2);
    const s = L.mesh(sg, murkyTop, cx, WL, (ZF + ZB) / 2, { cast: false }); s.renderOrder = 8; g.add(s); surfs.push(s); s.userData.base = Float32Array.from(sg.attributes.position.array);
    [7.992, 6.8, 5.5, 4.1, 2.4, 0.2, -3, -7].forEach((z, i) => { const p = L.mesh(new THREE.PlaneGeometry(5.4, WL + 4.2), i === 0 ? L.water(PAL.murky, 0.36, { depthWrite: false, roughness: 0.25 }) : layerM, cx, (WL - 4.2) / 2, z, { cast: false, receive: false }); p.renderOrder = 7 - i * 0.1; g.add(p); });
  });

  /* ---------- ar: coletor, descidas, grade de difusores ---------- */
  const HY = 1.5, airPts = [[0, 3.3, -17.3], [0, 3.3, -15.0], [0, HY, -15.0], [0, HY, 7.3]];
  const header = K.pipe(airPts, 0.28, m.air, { fl: 9, bend: 0.7 }); g.add(header.group);
  g.add(K.M([K.cylG(0.42, 0.42, 0.1, [0, HY, 7.35], [Math.PI / 2, 0, 0], 20)], m.air));
  const sad = []; for (let z = -11; z <= 7; z += 3) sad.push(...K.saddleG(0, 0.7, HY, z, 0.3));
  g.add(K.M(sad, m.concrete));
  const drops = [6.6, 1.6, -3.4, -8.4], dropGeo = [], valveG = [];
  const dropCurves = [];
  drops.forEach((z) => [-1, 1].forEach((s) => {
    const pts = [[s * 0.2, HY, z], [s * 0.95, HY, z], [s * 0.95, -3.85, z], [s * 5.55, -3.85, z]];
    const p = K.pipe(pts, 0.11, m.air, { bend: 0.3, fl: [0.11, 0.3] }); g.add(p.group);
    if (z === drops[0]) dropCurves.push(p.curve);
    valveG.push(K.boxG(0.3, 0.16, 0.3, [s * 0.95, 0.95, z]), K.seg([s * 0.95, 0.95, z], [s * 0.95, 0.95, z + 0.5], 0.03, 5));
    dropGeo.push(K.boxG(0.55, 0.06, 0.1, [s * 0.67, -0.6, z]), K.boxG(0.55, 0.06, 0.1, [s * 0.67, -2.6, z]));
  }));
  g.add(K.M(valveG, L.mat(PAL.red, { roughness: 0.4 })), K.M(dropGeo, m.galv));
  const cols = []; for (let i = 0; i < 9; i++) cols.push(1.0 + i * 0.56);
  const lat = []; [-1, 1].forEach((s) => cols.forEach((x) => lat.push(K.seg([s * x, -3.97, ZB + 0.3], [s * x, -3.97, ZF - 0.25], 0.045, 6))));
  for (let z = ZB + 1; z < ZF; z += 2.5) [-1, 1].forEach((s) => lat.push(K.boxG(4.9, 0.08, 0.1, [s * 3.24, -4.1, z])));
  g.add(K.M(lat, L.mat('#5b6f86', { roughness: 0.5, metalness: 0.2 })));
  const discGeo = K.merge([K.cylG(0.17, 0.19, 0.05, [0, 0.07, 0], [0, 0, 0], 14), K.cylG(0.05, 0.05, 0.08, [0, 0.02, 0], [0, 0, 0], 6)]);
  const nz = Math.floor((ZF - ZB - 0.8) / 0.8) + 1;
  g.add(L.scatter(discGeo, L.mat('#27313a', { roughness: 0.55 }), 2 * cols.length * nz, (i, r, d) => { const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), c = k % cols.length, j = Math.floor(k / cols.length); d.position.set(s * cols[c], -3.95, ZF - 0.45 - j * 0.8); }));

  /* ---------- passarelas e guarda-corpos ---------- */
  const wk = [K.boxG(1.2, 0.05, ZF - ZB, [6.8, 0.7, (ZF + ZB) / 2])]; for (let z = ZB + 0.5; z < ZF; z += 2) wk.push(K.boxG(1.2, 0.3, 0.08, [6.8, 0.52, z]));
  g.add(K.M(wk, m.grating));
  const zs = (x, y) => [[x, y, ZB - 0.2], [x, y, ZF - 0.08]];
  g.add(K.railing(zs(7.36, 0.72)), K.railing(zs(6.0, 0.7)), K.railing(zs(-6.0, 0.7)));
  g.add(K.railing([[-8.83, 0.5, -13.93], [6.1, 0.5, -13.93]]));
  const st = K.stair(1.0, 0.7, 1.0); st.position.set(6.8, 0, ZB - 1.4); st.rotation.y = Math.PI / 2; g.add(st);

  /* ---------- bolhas ---------- */
  const NB = 900, bub = [], rb = L.rng(41);
  for (let i = 0; i < NB; i++) bub.push({ x: (i % 2 ? 1 : -1) * (cols[Math.floor(rb() * cols.length)]), z: rb() < 0.45 ? ZF - 0.03 - rb() * 0.5 : ZF - 0.5 - rb() * 4.5, ph: rb(), sp: 0.42 + rb() * 0.3, s: 0.035 + rb() * 0.06, w: rb() * TAU, j: (rb() - 0.5) });
  const bubM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), L.mat('#f2fdff', { roughness: 0.2, emissive: '#bfeaff', emissiveIntensity: 0.55 }), NB);
  bubM.frustumCulled = false; bubM.castShadow = false; bubM.receiveShadow = false; g.add(bubM);
  const NF = 900, foam = [];
  for (let i = 0; i < NF; i++) foam.push({ x: (i % 2 ? 1 : -1) * (0.6 + rb() * 5.0), z: L.lerp(ZB + 0.3, ZF - 0.15, Math.pow(rb(), 0.8)), ph: rb(), sp: 0.7 + rb() * 0.9, s: 0.04 + rb() * 0.085 });
  const foamM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 4, 0, TAU, 0, Math.PI / 2), L.mat('#e6dcbc', { roughness: 0.35 }), NF);
  foamM.frustumCulled = false; foamM.castShadow = false; g.add(foamM);

  /* ---------- casa de sopradores ---------- */
  const HX = 0.5, HZ = -16.2, house = shed(L, K, 10, 6.4, 4.7, 4.0, { cols: 3 });
  house.group.position.set(HX, 0, HZ); g.add(house.group);
  const coll = K.pipe([[-3.4, 3.3, -17.3], [4.3, 3.3, -17.3]], 0.26, m.air, { fl: 4 }); g.add(coll.group);
  const rotors = [];
  [-2.6, 0.5, 3.6].forEach((bx, bi) => {
    const u = new THREE.Group(); u.position.set(bx, 0.25, -19.6);
    u.add(K.M([K.boxG(1.3, 0.16, 3.4, [0, 0.08, 0]), K.boxG(1.0, 0.25, 1.2, [0, 0.28, -1.0]), K.boxG(1.0, 0.25, 0.9, [0, 0.28, 0.75])], m.iron));
    const mt = K.motor(1.5, 0.42, PAL.green); mt.rotation.y = -Math.PI / 2; mt.position.set(0, 0.95, -1.0); u.add(mt);
    u.add(K.M([K.boxG(0.5, 0.5, 0.5, [0, 0.95, 0])], L.mat(PAL.yellow, { roughness: 0.5 })));
    const vo = K.volute(0.62, 0.5, PAL.blue); vo.position.set(0, 1.05, 0.75); u.add(vo);
    // filtro-silenciador de admissão
    u.add(K.M([K.cylG(0.26, 0.26, 0.5, [0, 1.05, 1.4], [Math.PI / 2, 0, 0], 14), K.cylG(0.26, 0.26, 0.9, [0, 1.55, 1.62], [0, 0, 0], 14)], m.air));
    const fil = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; fil.push(K.boxG(0.05, 0.75, 0.12, [Math.cos(a) * 0.5, 2.45, 1.62 + Math.sin(a) * 0.5], [0, -a, 0])); }
    fil.push(K.cylG(0.47, 0.47, 0.75, [0, 2.45, 1.62], [0, 0, 0], 18));
    u.add(K.M(fil, L.mat('#f2ead2', { roughness: 0.8 })), K.M([K.cylG(0.56, 0.56, 0.07, [0, 2.86, 1.62], [0, 0, 0], 18), K.cylG(0.56, 0.56, 0.07, [0, 2.04, 1.62], [0, 0, 0], 18)], m.iron));
    g.add(u);
    const ox = 0.6;
    const rp = K.pipe([[bx + ox, 2.05, -18.85], [bx + ox, 3.3, -18.85], [bx + ox, 3.3, -17.3]], 0.2, m.air, { bend: 0.45, fl: [0.03, 0.45] }); g.add(rp.group);
    rotors.push(bx);
  });
  // quadro elétrico
  g.add(K.M([K.boxG(1.3, 1.9, 0.45, [4.3, 1.2, -21.9])], L.mat('#dfe4e8', { roughness: 0.5, metalness: 0.2 })), K.M([K.boxG(0.5, 0.25, 0.03, [4.05, 1.75, -21.66]), K.boxG(0.08, 0.08, 0.03, [4.6, 1.75, -21.66])], L.glow(PAL.good, 1.4)));

  /* ---------- setas de ar ---------- */
  const chevH = new L.Chevrons(L.curve([[0, 3.3, -17.0], [0, 3.3, -15.2], [0, 2.4, -14.9], [0, HY, -14.4], [0, HY, -6], [0, HY, 6.3]], false, 0.2), { n: 9, size: 0.5, normal: [0, 1, 0.45], offset: [0, 0.6, 0] });
  const chevD = dropCurves.map((c) => new L.Chevrons(c, { n: 7, size: 0.36, normal: [0, 0, 1], offset: [0, 0, 0.3] }));
  g.add(chevH.mesh, ...chevD.map((c) => c.mesh));

  const _d = new THREE.Object3D();
  function update(t, detail = true) {
    surfs.forEach((s, si) => {
      const p = s.geometry.attributes.position, b = s.userData.base;
      for (let i = 0; i < p.count; i++) { const x = b[i * 3], z = b[i * 3 + 2]; p.setY(i, 0.04 * Math.sin(x * 3.1 + t * 5.3 + z * 1.7 + si) + 0.035 * Math.sin(z * 4.3 - t * 6.1 + x * 2.2) + 0.03 * Math.sin(x * 7.3 - z * 5.9 + t * 8.7)); }
      p.needsUpdate = true; s.geometry.computeVertexNormals();
    });
    for (let i = 0; i < NB; i++) {
      const b = bub[i], u = L.fract(b.ph + t * b.sp);
      _d.position.set(b.x + (b.j * 0.38 * u) + Math.sin(t * 6 + b.w) * 0.03, -3.85 + u * 4.08, b.z); _d.scale.setScalar(b.s * (0.6 + 0.6 * u) * Math.min(1, (1 - u) * 14)); _d.updateMatrix(); bubM.setMatrixAt(i, _d.matrix);
    }
    bubM.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < NF; i++) {
      const f = foam[i], u = L.fract(f.ph + t * f.sp);
      _d.position.set(f.x, WL + 0.01, f.z); _d.scale.setScalar(f.s * Math.sqrt(Math.sin(Math.PI * Math.min(1, u * 1.25)))); _d.updateMatrix(); foamM.setMatrixAt(i, _d.matrix);
    }
    foamM.instanceMatrix.needsUpdate = true;
  }
  function arrows(t, amount) { chevH.update(t, { speed: 0.3, amount }); chevD.forEach((c) => c.update(t, { speed: 0.42, amount })); }
  return { group: g, update, arrows, WL, ZF };
}

/** béquer de vidro numa haste de coleta; origem na base do béquer */
export function buildBeaker(L, K) {
  const { THREE, PAL, TAU } = L, g = new THREE.Group();
  const R0 = 0.2, H = 0.52;
  // líquido (desenhado antes do vidro)
  const liqCol = '#9c6f08';
  const liqM = L.water(liqCol, 0.9, { side: THREE.DoubleSide, depthWrite: false, emissive: '#7a5200', emissiveIntensity: 0.5, roughness: 0.25 });
  const liq = L.mesh(new THREE.CylinderGeometry(R0 - 0.014, R0 - 0.02, 0.36, 40), liqM, 0, 0.195, 0, { cast: false }); liq.renderOrder = 10; g.add(liq);
  const top = L.mesh(new THREE.CylinderGeometry(R0 - 0.014, R0 - 0.014, 0.004, 40), L.water('#b98a1a', 0.95, { emissive: '#7a5200', emissiveIntensity: 0.45 }), 0, 0.377, 0, { cast: false }); top.renderOrder = 11; g.add(top);
  const rb = L.rng(8), sp = [];
  for (let i = 0; i < 90; i++) sp.push({ a: rb() * TAU, r: 0.02 + rb() * 0.15, y: 0.03 + rb() * 0.33, w: 0.5 + rb() * 1.2, s: 0.005 + rb() * 0.011, ph: rb() * TAU });
  const spM = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), L.mat('#2a1a08', { roughness: 0.8 }), sp.length); spM.frustumCulled = false; spM.castShadow = false; g.add(spM);
  spM.renderOrder = 9;
  // vidro
  const glassM = L.glass('#dff6ff', 0.2, { side: THREE.DoubleSide, metalness: 0.1 });
  const gl = L.lathe([[0, 0.002], [R0 - 0.015, 0.002], [R0, 0.02], [R0, H - 0.02], [R0 + 0.014, H]], glassM, 48); gl.renderOrder = 12; gl.castShadow = false; g.add(gl);
  const rim = L.torus(R0 + 0.012, 0.007, L.glass('#ffffff', 0.7), 0, H, 0); rim.rotation.x = Math.PI / 2; rim.renderOrder = 13; rim.castShadow = false; g.add(rim);
  const base = L.torus(R0 - 0.01, 0.008, L.glass('#ffffff', 0.5), 0, 0.008, 0); base.rotation.x = Math.PI / 2; base.renderOrder = 13; base.castShadow = false; g.add(base);
  // graduação impressa
  const gt = K.canvasTex(256, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = 'bold 34px sans-serif'; c.textBaseline = 'middle';
    for (let i = 0; i <= 16; i++) { const y = h - 50 - i * 24, big = i % 4 === 0; c.fillRect(90, y - 2, big ? 70 : 38, 4); if (big && i) c.fillText(String(i * 50), 170, y); }
    c.fillRect(90, h - 50 - 16 * 24, 4, 16 * 24);
  });
  gt.wrapS = gt.wrapT = THREE.ClampToEdgeWrapping;
  const marks = L.mesh(new THREE.CylinderGeometry(R0 + 0.002, R0 + 0.002, H - 0.04, 24, 1, true, -0.75, 1.5), new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.FrontSide }), 0, H / 2, 0, { cast: false, receive: false }); marks.renderOrder = 14; g.add(marks);
  // haste de coleta com garra
  const holder = new THREE.Group(); g.add(holder);
  const ring = [K.tf(new THREE.TorusGeometry(R0 + 0.014, 0.014, 8, 40), [0, 0.3, 0], [Math.PI / 2, 0, 0]), K.tf(new THREE.TorusGeometry(R0 + 0.014, 0.012, 8, 40), [0, 0.05, 0], [Math.PI / 2, 0, 0]), K.boxG(0.05, 0.32, 0.06, [-R0 - 0.035, 0.175, 0]), K.boxG(0.12, 0.09, 0.09, [-R0 - 0.1, 0.3, 0]), K.cylG(0.02, 0.02, 0.14, [-R0 - 0.1, 0.3, 0], [Math.PI / 2, 0, 0], 8)];
  holder.add(K.M(ring, K.m.steel));
  const rodDir = L.V(-0.55, -0.62, 0.56).normalize(), a = L.V(-R0 - 0.13, 0.3, 0);
  holder.add(K.M([K.seg(a, a.clone().addScaledVector(rodDir, 1.5), 0.022, 10), K.seg(a.clone().addScaledVector(rodDir, 1.42), a.clone().addScaledVector(rodDir, 1.5), 0.036, 10)], K.m.galv));
  holder.add(K.M([K.seg(a.clone().addScaledVector(rodDir, 1.46), a.clone().addScaledVector(rodDir, 4.2), 0.03, 10)], L.mat(PAL.blue, { roughness: 0.4, metalness: 0.3 })));
  // gotas
  const drops = []; for (let i = 0; i < 10; i++) drops.push({ a: rb() * TAU, ph: rb(), sp: 0.9 + rb() * 0.6 });
  const dropM = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), L.water(liqCol, 0.9), drops.length); dropM.frustumCulled = false; dropM.castShadow = false; g.add(dropM);
  const _d = new THREE.Object3D();
  function update(t, drip) {
    sp.forEach((s, i) => { const ang = s.a + t * s.w * 0.7; _d.position.set(Math.cos(ang) * s.r, s.y + Math.sin(t * 1.1 + s.ph) * 0.012, Math.sin(ang) * s.r); _d.scale.setScalar(s.s); _d.updateMatrix(); spM.setMatrixAt(i, _d.matrix); });
    spM.instanceMatrix.needsUpdate = true;
    drops.forEach((d, i) => { const u = L.fract(d.ph + t * d.sp); _d.position.set(Math.cos(d.a) * R0 * 0.8, -u * u * 2.2, Math.sin(d.a) * R0 * 0.8); _d.scale.set(0.013, 0.022, 0.013).multiplyScalar(drip * (1 - u * 0.5)); _d.updateMatrix(); dropM.setMatrixAt(i, _d.matrix); });
    dropM.instanceMatrix.needsUpdate = true;
  }
  return { group: g, update, liq: L.V(0, 0.22, 0) };
}
