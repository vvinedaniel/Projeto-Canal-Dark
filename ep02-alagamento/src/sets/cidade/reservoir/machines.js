// Máquinas da obra do piscinão: escavadeira hidráulica (esteiras com sapatas, giro, cabine com vidro, lança, braço,
// caçamba com dentes e cilindros hidráulicos) e caminhão basculante. Tudo em metros, escala real (~20 t).
export function makeMachines(L, K) {
  const { THREE } = L, { M, MAT, bake, placeRod } = K;
  const PI = Math.PI;

  /* =================== ESCAVADEIRA =================== */
  const L1 = 5.2, L2 = 2.6, A = [0.95, 0.62]; // lança, braço, pivô da lança (no plano da superestrutura)
  function excavator() {
    const root = new THREE.Group();
    const yel = MAT.yellow, dark = MAT.dark, trackM = M('#2a2e33', { roughness: 0.7, metalness: 0.3 });
    /* ---- material rodante ---- */
    const lower = new THREE.Group(); root.add(lower);
    const ls = new THREE.Group();
    [-1.1, 1.1].forEach((z) => {
      ls.add(L.rbox(3.5, 0.42, 0.5, 0.08, M('#3b4148', { roughness: 0.6 }), 0, 0.46, z)); // longarina
      [-1.8, 1.8].forEach((x) => { ls.add(L.cyl(0.36, 0.36, 0.46, trackM, x, 0.42, z, 20).rotateX(PI / 2)); ls.add(L.cyl(0.18, 0.18, 0.5, MAT.iron, x, 0.42, z, 12).rotateX(PI / 2)); });
      for (let i = 0; i < 6; i++) ls.add(L.cyl(0.11, 0.11, 0.44, MAT.iron, -1.25 + i * 0.5, 0.14, z, 10).rotateX(PI / 2));
      [-0.6, 0.6].forEach((x) => ls.add(L.cyl(0.07, 0.07, 0.3, MAT.iron, x, 0.78, z, 8).rotateX(PI / 2)));
    });
    ls.add(L.rbox(1.6, 0.42, 1.8, 0.1, M('#3b4148', { roughness: 0.6 }), 0, 0.62, 0)); // chassi central
    ls.add(L.cyl(0.95, 0.95, 0.18, MAT.iron, 0, 0.92, 0, 28)); // coroa de giro
    lower.add(bake(ls));
    // sapatas (instanciadas, correm pelo laço da esteira)
    const NS = 46, R = 0.42, XC = 1.8, loopLen = 4 * XC + 2 * PI * R;
    const shoeGeo = new THREE.BoxGeometry(0.2, 0.06, 0.62); shoeGeo.translate(0, 0.03, 0);
    const grouser = new THREE.BoxGeometry(0.04, 0.05, 0.62); grouser.translate(0, 0.075, 0);
    const shoes = new THREE.InstancedMesh(mergeShoe(shoeGeo, grouser), M('#30343a', { roughness: 0.55, metalness: 0.45 }), NS * 2);
    shoes.castShadow = true; shoes.receiveShadow = true; shoes.frustumCulled = false; lower.add(shoes);
    const _o = new THREE.Object3D();
    function loopPt(s) { // s em metros ao longo do laço; devolve [x, y, ângulo da normal externa]
      s = ((s % loopLen) + loopLen) % loopLen;
      if (s < 2 * XC) return [-XC + s, 0, -PI / 2];                                     // embaixo, indo para +x
      s -= 2 * XC; if (s < PI * R) { const a = -PI / 2 + s / R; return [XC + Math.cos(a) * R, R + Math.sin(a) * R, a]; }
      s -= PI * R; if (s < 2 * XC) return [XC - s, 2 * R, PI / 2];                         // em cima, indo para −x
      s -= 2 * XC; const a = PI / 2 + s / R; return [-XC + Math.cos(a) * R, R + Math.sin(a) * R, a];
    }
    function setTracks(travel) {
      for (let k = 0; k < 2; k++) for (let i = 0; i < NS; i++) {
        const [x, y, a] = loopPt(i * (loopLen / NS) - travel * (k ? 1 : 1));
        _o.position.set(x, y + 0.02, k ? 1.1 : -1.1);
        _o.rotation.set(0, 0, a - PI / 2); _o.scale.set(1, 1, 1); _o.updateMatrix(); shoes.setMatrixAt(k * NS + i, _o.matrix);
      }
      shoes.instanceMatrix.needsUpdate = true;
    }
    setTracks(0);
    /* ---- superestrutura (gira) ---- */
    const upper = new THREE.Group(); upper.position.y = 1.05; root.add(upper);
    const us = new THREE.Group();
    us.add(L.rbox(3.0, 0.36, 2.55, 0.06, yel, -0.3, 0.18, 0));
    us.add(L.rbox(0.8, 1.05, 2.55, 0.18, yel, -1.55, 0.78, 0)); // contrapeso
    us.add(L.box(0.06, 0.18, 2.4, dark, -1.96, 0.9, 0), L.box(0.06, 0.18, 2.4, dark, -1.96, 0.55, 0));
    us.add(L.rbox(1.55, 0.78, 1.3, 0.1, yel, -0.62, 0.72, 0.6)); // capô do motor
    for (let i = 0; i < 7; i++) us.add(L.box(0.06, 0.02, 0.9, dark, -1.15 + i * 0.16, 1.115, 0.6)); // grade de ventilação
    us.add(L.cyl(0.06, 0.06, 0.55, MAT.iron, -0.35, 1.35, 1.0, 10));
    us.add(L.rbox(0.7, 0.5, 0.55, 0.05, yel, 0.6, 0.6, 0.95)); // caixa de ferramentas
    // cabine: estrutura amarela, vidros escuros e colunas
    us.add(L.rbox(1.2, 0.5, 0.98, 0.05, yel, 0.55, 0.6, -0.78));
    us.add(L.rbox(1.2, 0.08, 1.0, 0.04, yel, 0.55, 2.02, -0.78));
    [[0.0, -1.26], [1.13, -1.26], [0.0, -0.3], [1.13, -0.3]].forEach(([x, z]) => us.add(L.box(0.07, 1.2, 0.07, dark, x, 1.42, z)));
    const gl = MAT.glass;
    us.add(L.box(0.03, 1.12, 0.9, gl, 1.14, 1.42, -0.78), L.box(1.06, 1.12, 0.03, gl, 0.565, 1.42, -1.27), L.box(1.06, 1.12, 0.03, gl, 0.565, 1.42, -0.29));
    us.add(L.box(0.03, 1.12, 0.9, gl, -0.02, 1.42, -0.78));
    us.add(L.rbox(0.5, 0.5, 0.5, 0.08, dark, 0.45, 1.05, -0.78)); // banco do operador (visto pelo vidro)
    us.add(L.box(0.7, 0.04, 0.04, MAT.galv, -0.6, 1.24, 1.22), L.box(0.04, 0.28, 0.04, MAT.galv, -0.9, 1.12, 1.22), L.box(0.04, 0.28, 0.04, MAT.galv, -0.3, 1.12, 1.22));
    us.add(L.box(0.7, 0.55, 0.5, yel, 0.85, 0.45, 0.2)); // pé da lança
    upper.add(bake(us));
    /* ---- lança, braço, caçamba ---- */
    const boom = new THREE.Group(); boom.position.set(A[0], A[1], 0.2); upper.add(boom);
    const bp = L.extrude([[-0.35, 0.28], [2.3, 1.18], [5.4, 0.26], [5.4, -0.22], [2.5, 0.52], [-0.35, -0.3]], 0.56, yel, { bevel: 0.03 });
    bp.position.z = -0.28; boom.add(bp);
    boom.add(L.box(0.3, 0.3, 0.7, yel, 2.2, 1.28, 0)); // apoio do cilindro do braço
    boom.add(L.cyl(0.09, 0.09, 0.72, MAT.steel, 0, 0, 0, 10).rotateX(PI / 2), L.cyl(0.09, 0.09, 0.72, MAT.steel, L1, 0, 0, 10).rotateX(PI / 2));
    // mangueiras sobre a lança
    boom.add(L.tube([[0.2, 0.45, 0.12], [2.3, 1.32, 0.12], [5.0, 0.38, 0.12]], 0.035, MAT.dark, 30, 6), L.tube([[0.2, 0.45, -0.12], [2.3, 1.32, -0.12], [5.0, 0.38, -0.12]], 0.035, MAT.dark, 30, 6));
    const arm = new THREE.Group(); arm.position.set(L1, 0, 0); boom.add(arm);
    const ap = L.extrude([[-0.62, 0.36], [0.2, 0.32], [2.7, 0.13], [2.7, -0.13], [0.2, -0.3], [-0.62, -0.18]], 0.42, yel, { bevel: 0.03 });
    ap.position.z = -0.21; arm.add(ap);
    arm.add(L.box(0.25, 0.2, 0.5, yel, 0.5, 0.38, 0));
    arm.add(L.cyl(0.08, 0.08, 0.6, MAT.steel, L2, 0, 0, 10).rotateX(PI / 2));
    const bucket = new THREE.Group(); bucket.position.set(L2, 0, 0); arm.add(bucket);
    const bk = new THREE.Group(), BW = 1.05;
    const back = [], inner = [];
    for (let i = 0; i <= 16; i++) { const s = i / 16; back.push([1.3 * s, 0.62 * Math.sin(PI * s) * (1 - 0.25 * s) - 0.05 * s]); }
    for (let i = 16; i >= 0; i--) { const s = i / 16; inner.push([1.3 * s - 0.02, 0.62 * Math.sin(PI * s) * (1 - 0.25 * s) - 0.05 * s - 0.06]); }
    const shell = L.extrude([...back, ...inner], BW, M('#e0a414', { roughness: 0.45, side: THREE.DoubleSide })); shell.position.z = -BW / 2; bk.add(shell);
    [-BW / 2 - 0.02, BW / 2 - 0.02].forEach((z) => { const sp = L.extrude([...back, [0, -0.1]], 0.04, yel); sp.position.z = z; bk.add(sp); });
    bk.add(L.box(0.3, 0.05, BW + 0.04, MAT.iron, 1.2, -0.02, 0)); // lâmina de corte
    for (let i = 0; i < 5; i++) { const z = -BW / 2 + 0.11 + i * ((BW - 0.22) / 4), th = L.cyl(0.0, 0.07, 0.26, MAT.iron, 1.42, 0.04, z, 4); th.rotation.z = -PI / 2; bk.add(th); } // dentes
    bk.add(L.box(0.26, 0.24, 0.5, MAT.iron, 0.02, 0.12, 0)); // orelhas do pino
    bucket.add(bake(bk));
    const dirt = L.sph(1, M('#7a5638', { roughness: 1, flatShading: true }), 0.62, 0.16, 0); dirt.scale.set(0.46, 0.22, 0.44); bucket.add(dirt);
    // cilindros hidráulicos: corpo (barril) + haste cromada, atualizados por quadro
    const barGeo = new THREE.CylinderGeometry(1, 1, 1, 12), cyls = [];
    const mk = (rb, rr) => { const b = new THREE.Mesh(barGeo, yel), r = new THREE.Mesh(barGeo, MAT.steel); b.scale.x = b.scale.z = rb; r.userData.r = rr; b.userData.r = rb; b.castShadow = r.castShadow = true; upper.add(b, r); return { b, r }; };
    cyls.push(mk(0.11, 0.06), mk(0.11, 0.06), mk(0.1, 0.055), mk(0.085, 0.05));
    const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _m = new THREE.Vector3();
    function setCyl(c, ax, ay, bx, by, z, frac = 0.58) {
      _a.set(ax, ay, z); _b.set(bx, by, z); const len = _a.distanceTo(_b);
      _m.copy(_a).lerp(_b, frac); placeRod(c.b, _a, _m); placeRod(c.r, _m.clone().lerp(_a, 0.12), _b);
      c.b.scale.x = c.b.scale.z = c.b.userData.r; c.r.scale.x = c.r.scale.z = c.r.userData.r; void len;
    }
    const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
    /** pose: slew (rad), alvo do pino da caçamba [r, h] no plano da superestrutura, ângulo absoluto da caçamba, carga */
    function pose(o) {
      upper.rotation.y = o.slew ?? 0;
      let dx = o.p[0] - A[0], dy = o.p[1] - A[1], d = Math.hypot(dx, dy);
      const dmax = L1 + L2 - 0.15, dmin = 2.9;
      if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; } if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
      const al = Math.acos(Math.min(1, Math.max(-1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
      const t1 = Math.atan2(dy, dx) + al, Bx = A[0] + L1 * Math.cos(t1), By = A[1] + L1 * Math.sin(t1);
      const t2 = Math.atan2(A[1] + dy - By, A[0] + dx - Bx), t3 = o.bucket ?? t2 - 1.2;
      boom.rotation.z = t1; arm.rotation.z = t2 - t1; bucket.rotation.z = t3 - t2;
      dirt.visible = (o.load ?? 0) > 0.02; dirt.scale.set(0.46, 0.22 * (o.load ?? 0) + 0.01, 0.44);
      // cilindros (no plano da superestrutura; z = lateral)
      const D = rot(2.0, 0.3, t1), E = rot(2.25, 1.42, t1), F = rot(-0.58, 0.36, t2 - t1), Fw = [Bx + 0, By + 0], Gp = rot(0.5, 0.46, t2), Hb = rot(-0.1, 0.32, t3);
      const Fx = Bx + rot(-0.58, 0.36, t2)[0], Fy = By + rot(-0.58, 0.36, t2)[1]; void F; void Fw;
      const Cx = Bx + L2 * Math.cos(t2), Cy = By + L2 * Math.sin(t2);
      setCyl(cyls[0], 0.62, 0.3, A[0] + D[0], A[1] + D[1], 0.2 + 0.4);
      setCyl(cyls[1], 0.62, 0.3, A[0] + D[0], A[1] + D[1], 0.2 - 0.4);
      setCyl(cyls[2], A[0] + E[0], A[1] + E[1], Fx, Fy, 0.2);
      setCyl(cyls[3], Bx + Gp[0], By + Gp[1], Cx + Hb[0], Cy + Hb[1], 0.2);
      return { tip: [Cx, Cy] };
    }
    pose({ p: [5, 0] });
    return { root, lower, upper, pose, setTracks, bucket, A };
  }
  function mergeShoe(a, b) { return L.BGU.mergeGeometries([a.toNonIndexed(), b.toNonIndexed()]); }

  /* =================== CAMINHÃO BASCULANTE =================== */
  function dumpTruck(o = {}) {
    const root = new THREE.Group(), cabM = o.cab ?? MAT.cabRed, bodyM = o.body ?? MAT.orange;
    const s = new THREE.Group();
    s.add(L.box(7.4, 0.28, 0.95, MAT.dark, -0.2, 0.92, 0)); // longarinas
    // cabine
    s.add(L.rbox(1.75, 1.75, 2.45, 0.14, cabM, 3.42, 2.05, 0));
    s.add(L.rbox(1.05, 0.7, 2.45, 0.1, cabM, 4.0, 1.35, 0)); // frente / capô curto
    s.add(L.box(0.04, 0.8, 2.15, MAT.glass, 4.31, 2.35, 0)); // para-brisa
    [-1.235, 1.235].forEach((z) => s.add(L.box(0.95, 0.7, 0.03, MAT.glass, 3.45, 2.4, z)));
    s.add(L.box(0.06, 0.45, 1.9, MAT.dark, 4.54, 1.3, 0)); // grade
    s.add(L.box(0.25, 0.3, 2.5, MAT.dark, 4.6, 0.78, 0)); // para-choque
    [-0.95, 0.95].forEach((z) => s.add(L.box(0.05, 0.16, 0.34, L.glow('#fff6d8', 1.0), 4.56, 1.05, z)));
    s.add(L.rbox(1.2, 0.18, 2.3, 0.06, cabM, 3.3, 3.0, 0)); // teto
    s.add(L.cyl(0.08, 0.08, 1.6, MAT.galv, 2.45, 2.3, 1.0, 10)); // escapamento
    s.add(L.rbox(0.9, 0.5, 0.5, 0.1, MAT.galv, 2.1, 0.95, -1.1)); // tanque
    // rodas
    const tyre = new THREE.CylinderGeometry(0.53, 0.53, 0.38, 22); tyre.rotateX(PI / 2);
    const hub = new THREE.CylinderGeometry(0.26, 0.26, 0.4, 12); hub.rotateX(PI / 2);
    const wheels = [];
    [[3.35, 1.0], [3.35, -1.0], [-1.35, 1.02], [-1.35, -1.02], [-2.75, 1.02], [-2.75, -1.02]].forEach(([x, z]) => {
      const w = new THREE.Group(); w.position.set(x, 0.53, z);
      w.add(L.mesh(tyre, MAT.rubber, 0, 0, 0), L.mesh(hub, M('#c9cfd4', { roughness: 0.4, metalness: 0.5 }), 0, 0, Math.sign(z) * 0.01));
      if (x < 0) w.add(L.mesh(tyre, MAT.rubber, 0, 0, -Math.sign(z) * 0.4));
      root.add(w); wheels.push(w);
    });
    [3.35, -2.05].forEach((x) => s.add(L.box(x > 0 ? 1.3 : 2.6, 0.08, 2.5, MAT.dark, x, 1.18, 0)));
    root.add(bake(s));
    // caçamba basculante (articulada na traseira)
    const bed = new THREE.Group(); bed.position.set(-3.9, 1.22, 0); root.add(bed);
    const b = new THREE.Group(), BL = 6.0, BH = 1.3, BWd = 2.45;
    b.add(L.box(BL, 0.12, BWd, bodyM, BL / 2, 0.06, 0));
    [-BWd / 2, BWd / 2].forEach((z) => { b.add(L.box(BL, BH, 0.08, bodyM, BL / 2, BH / 2 + 0.06, z)); for (let i = 0; i < 6; i++) b.add(L.box(0.08, BH, 0.06, bodyM, 0.4 + i * 1.04, BH / 2 + 0.06, z + Math.sign(z) * 0.06)); b.add(L.box(BL, 0.1, 0.14, bodyM, BL / 2, BH + 0.06, z)); });
    b.add(L.box(0.1, BH + 0.4, BWd, bodyM, BL, (BH + 0.4) / 2 + 0.06, 0)); // frente
    b.add(L.box(0.8, 0.08, BWd, bodyM, BL + 0.4, BH + 0.48, 0)); // protetor da cabine
    b.add(L.box(0.08, BH, BWd, bodyM, 0.02, BH / 2 + 0.06, 0)); // tampa traseira
    bed.add(bake(b));
    const load = L.sph(1, M('#7a5638', { roughness: 1, flatShading: true }), BL / 2, 0.3, 0); load.scale.set(2.7, 0.9, 1.08); bed.add(load);
    const RW = 0.53;
    return {
      root,
      /** dist = distância percorrida (gira as rodas), load 0..1 (monte de terra), tilt (rad) */
      set(dist, ld, tilt = 0) { wheels.forEach((w) => { w.rotation.z = -dist / RW; }); load.visible = ld > 0.02; load.scale.set(2.7, 0.15 + 0.95 * ld, 1.08); load.position.y = 0.12 + 0.55 * ld; bed.rotation.z = tilt; }
    };
  }
  return { excavator, dumpTruck };
}
