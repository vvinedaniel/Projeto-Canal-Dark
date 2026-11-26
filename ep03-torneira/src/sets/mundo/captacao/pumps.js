// CONJUNTOS MOTOBOMBA (2: bomba 1 opera, bomba 2 reserva) + BARRILETE. Bomba centrífuga de eixo horizontal (eixo em z):
// base de concreto e chassi de aço, motor elétrico aletado com caixa de ligação e tampa do ventilador, acoplamento com
// proteção, mancal, carcaça em VOLUTA (espiral) com rotor de pás curvadas, sucção axial (redução excêntrica, curva e tubo
// descendo ao poço com CRIVO), recalque com manômetro, VÁLVULA DE RETENÇÃO (alavanca com contrapeso) e REGISTRO DE GAVETA
// com volante; barrilete une os dois recalques e sai pela parede da frente em Lo.P.rawOut.
// Bomba 1 em corte didático: a tampa da carcaça sai e a sucção fica translúcida — vemos o rotor girando, a água entrando
// pelo olho e saindo pela voluta (partículas e setas).
export function buildPumps(ctx, K, R) {
  const { L, THREE, Lo } = ctx, { MAT, M, G, bake, boxC, cylA, flange } = K, I = Lo.INTAKE, HS = I.house;
  const u = (k, a, b) => L.clamp01((k - a) / (b - a)), E = L.ease, PI = Math.PI;
  const g = new THREE.Group(); g.name = 'captacao.pumps'; R.root.add(g);

  /* ---------- geometria da voluta (plano XY local, origem no eixo) ---------- */
  const H = 0.9, F0 = 0.25, RA = 0.38, RB = 0.62, WT = 0.05, YN = 0.45, DZ = 0.36;
  const rS = (f) => RA + (RB - RA) * (f - F0) / L.TAU;
  const TX = RA * Math.cos(F0), TY = RA * Math.sin(F0), EX = RB * Math.cos(F0), EY = RB * Math.sin(F0), XD = (TX + EX) / 2;
  let fm = F0; for (let f = F0; f < PI / 2; f += 0.002) if ((rS(f) + WT) * Math.cos(f) <= TX - WT) { fm = f; break; }
  const spiral = (a, b, off, n = 72) => { const o = []; for (let i = 0; i <= n; i++) { const f = L.lerp(a, b, i / n); o.push([(rS(f) + off) * Math.cos(f), (rS(f) + off) * Math.sin(f)]); } return o; };
  const V2 = (p) => new THREE.Vector2(p[0], p[1]);
  const outerPts = [[TX - WT, YN], ...spiral(fm, F0 + L.TAU, WT), [EX + WT, YN]];
  const wallPts = [[TX - WT, YN], ...spiral(fm, F0 + L.TAU, WT), [EX + WT, YN], [EX, YN], [EX, EY], ...spiral(F0 + L.TAU, F0, 0), [TX, YN]];
  const chanPts = [...spiral(F0, F0 + L.TAU, 0), [EX, YN], [TX, YN]];
  const shapeOf = (pts, holes = []) => { const s = new THREE.Shape(pts.map(V2)); holes.forEach((h) => s.holes.push(new THREE.Path(h.map(V2)))); return s; };
  const extr = (shape, depth, z0) => { const ge = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 24 }); ge.translate(0, H, z0); return ge; };
  const circle = (r, n = 32) => { const o = []; for (let i = 0; i < n; i++) { const a = -(i / n) * L.TAU; o.push([Math.cos(a) * r, Math.sin(a) * r]); } return o; };
  const geoWall = extr(shapeOf(wallPts), DZ, -DZ / 2), geoBack = extr(shapeOf(outerPts), 0.05, -DZ / 2 - 0.05);
  const geoCover = extr(shapeOf(outerPts, [circle(0.17)]), 0.05, DZ / 2), geoChan = new THREE.ShapeGeometry(shapeOf(chanPts), 24); geoChan.translate(0, H, -DZ / 2 + 0.012);
  // pá do rotor (curvada para trás em relação ao giro anti-horário visto de +z)
  const vaneGeo = (() => { const c = [], n = 10; for (let i = 0; i <= n; i++) { const r = L.lerp(0.1, 0.325, i / n), a = -2.1 * (r - 0.1); c.push([Math.cos(a) * r, Math.sin(a) * r]); }
    const off = (p, q, s) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [p[0] - dy / l * s, p[1] + dx / l * s]; };
    const A = c.map((p, i) => off(p, c[Math.min(n, i + 1)] === p ? c[i - 1] : c[Math.min(n, i + 1)], i === n ? -0.013 : 0.013)), B = c.map((p, i) => off(p, c[Math.min(n, i + 1)] === p ? c[i - 1] : c[Math.min(n, i + 1)], i === n ? 0.013 : -0.013));
    const ge = new THREE.ExtrudeGeometry(shapeOf([...A, ...B.reverse()]), { depth: 0.15, bevelEnabled: false }); ge.translate(0, 0, -0.13); return ge; })();

  /* ---------- um conjunto motobomba (origem no piso, sob o centro da voluta; sucção para +z) ---------- */
  const SUC = { z1: 0.5, zr: 0.72, rb: 0.38, r: 0.2, bot: -7.55 + 0.0 }; // tubo de sucção desce até o crivo
  const HOOKY = 2.05; // gancho acima da base durante o içamento
  const YH = 2.85; // recalque horizontal (relativo ao piso), vai até o barrilete
  const ZH = (-93.2) - I.pumpZ; // z local do barrilete
  const dialTex = K.canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#f4f2ea'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, L.TAU); c.fill();
    c.strokeStyle = '#222'; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 8, 0, L.TAU); c.stroke();
    c.strokeStyle = '#2f9d57'; c.lineWidth = 16; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 34, -PI * 0.25 - 0.6, -PI * 0.25 + 0.5); c.stroke();
    c.strokeStyle = '#222'; for (let i = 0; i <= 20; i++) { const a = PI * 1.25 - (i / 20) * PI * 1.5, r0 = w / 2 - 24, r1 = r0 - (i % 5 ? 14 : 28); c.lineWidth = i % 5 ? 3 : 6; c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * r0, h / 2 - Math.sin(a) * r0); c.lineTo(w / 2 + Math.cos(a) * r1, h / 2 - Math.sin(a) * r1); c.stroke(); }
  });

  function pumpSet(idx, cut) {
    const set = new THREE.Group(), stat = new THREE.Group();
    const iron = MAT.iron, cas = MAT.casing, steel = MAT.steel;
    // base: pedestal de concreto, chassi de aço, olhais de içamento
    const ped = boxC(-0.75, 0.75, 0, 0.18, -2.75, 0.62, MAT.concNew);
    stat.add(boxC(-0.58, 0.58, 0.18, 0.3, -2.65, 0.52, MAT.dark), boxC(-0.62, -0.5, 0.18, 0.3, -2.65, 0.52, M('#30363c', { roughness: 0.5, metalness: 0.5 })), boxC(0.5, 0.62, 0.18, 0.3, -2.65, 0.52, M('#30363c', { roughness: 0.5, metalness: 0.5 })));
    [[-0.6, -2.55], [0.6, -2.55], [-0.6, 0.42], [0.6, 0.42]].forEach(([x, z]) => stat.add(L.torus(0.06, 0.018, steel, x, 0.36, z)));
    // pé da voluta e mancal
    stat.add(boxC(-0.32, 0.32, 0.3, 0.36, -0.16, 0.16, cas), boxC(-0.12, 0.12, 0.3, H - 0.55, -0.12, 0.12, cas));
    stat.add(cylA(0.15, 0.17, iron, 0, H, -DZ / 2 - 0.13, 'z', 20), cylA(0.17, 0.42, cas, 0, H, -0.6, 'z', 22), boxC(-0.2, 0.2, 0.3, H - 0.1, -0.75, -0.45, cas));
    // acoplamento (proteção amarela em meia-cana) — cubos giram dentro
    const guard = L.mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.42, 20, 1, true, -PI / 2 - 0.4, PI + 0.8), M('#f2b31b', { roughness: 0.45, side: THREE.DoubleSide }), 0, H, -0.98); guard.rotation.x = PI / 2; stat.add(guard);
    stat.add(boxC(-0.3, -0.26, 0.3, H, -1.18, -0.78, MAT.yellowM), boxC(0.26, 0.3, 0.3, H, -1.18, -0.78, MAT.yellowM));
    // motor aletado (verde), tampas, ventilador, pés, caixa de ligação, olhal, placa
    const mot = MAT.motor, z0m = -1.22, z1m = -2.42;
    stat.add(cylA(0.4, 0.08, mot, 0, H, z0m - 0.02, 'z', 28), cylA(0.42, z0m - z1m - 0.12, mot, 0, H, (z0m + z1m) / 2, 'z', 28), cylA(0.4, 0.08, mot, 0, H, z1m + 0.02, 'z', 28));
    for (let i = 0; i < 26; i++) { const a = (i / 26) * L.TAU; if (Math.abs(a - 1.5 * PI) < 0.45) continue; const f = L.box(0.03, 0.07, z0m - z1m - 0.2, mot, Math.cos(a) * 0.45, H + Math.sin(a) * 0.45, (z0m + z1m) / 2); f.rotation.z = a - PI / 2; stat.add(f); }
    stat.add(cylA(0.4, 0.3, M('#26594a', { roughness: 0.5 }), 0, H, z1m - 0.2, 'z', 28, 0.37), cylA(0.33, 0.012, MAT.dark, 0, H, z1m - 0.355, 'z', 28));
    for (let i = -3; i <= 3; i++) stat.add(boxC(-0.3, 0.3, H + i * 0.08 - 0.012, H + i * 0.08 + 0.012, z1m - 0.37, z1m - 0.35, MAT.galv));
    [[-0.36, -1.45], [0.36, -1.45], [-0.36, -2.2], [0.36, -2.2]].forEach(([x, z]) => stat.add(boxC(x - 0.09, x + 0.09, 0.3, H - 0.3, z - 0.1, z + 0.1, mot)));
    stat.add(L.rbox(0.34, 0.24, 0.38, 0.03, mot, 0, H + 0.53, -1.6), boxC(-0.12, 0.12, H + 0.65, H + 0.67, -1.72, -1.48, MAT.dark));
    stat.add(cylA(0.04, 0.5, MAT.galv, 0.22, H + 0.53, -1.6, 'x', 8), cylA(0.04, H + 0.53 - 0.2, MAT.galv, 0.47, (H + 0.53 + 0.2) / 2, -1.6, 'y', 8)); // eletroduto até o piso
    stat.add(L.torus(0.07, 0.022, steel, 0, H + 0.5, -2.1), boxC(0.43, 0.445, H - 0.1, H + 0.12, -1.95, -1.65, M('#dfe3e6', { roughness: 0.4, metalness: 0.6 })));
    // carcaça (voluta): parede espiral + fundo; bocal de recalque com flange
    stat.add(L.mesh(geoWall, cas), L.mesh(geoBack, cas));
    stat.add(boxC(TX - WT - 0.02, EX + WT + 0.02, H + YN, H + YN + 0.04, -DZ / 2 - 0.02, DZ / 2 + 0.02, cas));
    stat.add(cylA(0.12, 0.27, cas, XD, H + YN + 0.04 + 0.135, 0, 'y', 20)); flange(stat, XD, H + YN + 0.3, 0, 0.12, 'y', cas, 8);
    // manômetro no bocal de recalque
    stat.add(cylA(0.015, 0.2, MAT.steel, XD + 0.2, H + YN + 0.18, 0, 'x', 6), cylA(0.11, 0.06, MAT.steel, XD + 0.32, H + YN + 0.18, 0.04, 'z', 24));
    const dial = L.mesh(new THREE.CircleGeometry(0.1, 28), L.mat('#ffffff', { map: dialTex, roughness: 0.4 }), XD + 0.32, H + YN + 0.18, 0.072, { cast: false }); stat.add(dial);
    // recalque: ampliação concêntrica, válvula de retenção (vertical), curva, registro de gaveta, até o barrilete
    const disc = new THREE.Group(), dstat = new THREE.Group();
    const yA = H + YN + 0.32;
    dstat.add(cylA(0.2, 0.22, iron, XD, yA + 0.11, 0, 'y', 22, 0.13)); flange(dstat, XD, yA + 0.22, 0, 0.2, 'y', iron, 8);
    const cv = new THREE.Group(); { const r = 0.2, b = L.lathe([[r * 0.95, -r * 1.7], [r * 1.25, -r * 1.5], [r * 1.55, -r * 0.6], [r * 1.55, r * 0.6], [r * 1.25, r * 1.5], [r * 0.95, r * 1.7]], iron, 22); cv.add(b); cv.add(L.rbox(r * 0.8, r * 1.4, r * 1.6, r * 0.12, iron, r * 1.5, 0, 0)); flange(cv, 0, -r * 1.75, 0, r, 'y', iron, 8); flange(cv, 0, r * 1.75, 0, r, 'y', iron, 8); cv.add(cylA(0.05, 0.12, steel, r * 1.95, 0, 0, 'x', 10)); }
    const yC = yA + 0.22 + 0.36; cv.position.set(XD, yC, 0); dstat.add(cv);
    const yB = YH - 0.42;
    dstat.add(cylA(0.2, yB - (yC + 0.36), iron, XD, (yB + yC + 0.36) / 2, 0, 'y', 22));
    dstat.add(L.mesh(new THREE.TorusGeometry(0.42, 0.2, 14, 16, PI / 2), iron, XD, yB, 0.42).rotateY(-PI / 2).rotateX(0)); // curva 90° (vertical → +z)
    const gz = 1.35, gvLen = ZH - 0.42;
    dstat.add(cylA(0.2, gz - 0.25 - 0.42, iron, XD, YH, (0.42 + gz - 0.25) / 2, 'z', 22), cylA(0.2, ZH - (gz + 0.25) - 0.25, iron, XD, YH, (gz + 0.25 + ZH - 0.25) / 2, 'z', 22));
    { const gv = new THREE.Group(), r = 0.2, red = G('#d23a2a', { roughness: 0.35 }); gv.add(L.rbox(r * 2.4, r * 2.6, r * 1.9, r * 0.3, iron, 0, 0, 0)); flange(gv, 0, 0, -r * 1.05, r, 'z', iron, 8); flange(gv, 0, 0, r * 1.05, r, 'z', iron, 8);
      gv.add(L.cyl(r * 0.55, r * 0.8, r * 1.6, iron, 0, r * 2.0, 0, 12), L.cyl(r * 0.14, r * 0.14, r * 2.2, steel, 0, r * 3.4, 0, 8));
      const hw = new THREE.Group(); hw.add(L.torus(r * 1.25, r * 0.15, red, 0, 0, 0)); for (let i = 0; i < 4; i++) { const sp = L.cyl(r * 0.09, r * 0.09, r * 2.4, red, 0, 0, 0, 6); sp.rotation.z = (i * PI) / 4; hw.add(sp); } hw.rotation.x = PI / 2; hw.position.y = r * 4.2; gv.add(hw);
      gv.position.set(XD, YH, gz); dstat.add(gv); }
    void gvLen;
    // sucção (fica na tampa/"frente" — translúcida na bomba 1)
    const sucM = cut ? M('#6f8796', { roughness: 0.3, metalness: 0.2, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide }) : iron;
    const front = new THREE.Group();
    front.add(cylA(0.16, SUC.z1 - DZ / 2 - 0.05, sucM, 0, H, (DZ / 2 + 0.05 + SUC.z1) / 2, 'z', 22)); flange(front, 0, H, SUC.z1, 0.16, 'z', sucM, 8);
    front.add(cylA(SUC.r, SUC.zr - SUC.z1, sucM, 0, H, (SUC.z1 + SUC.zr) / 2, 'z', 22, 0.16));
    const elb = L.mesh(new THREE.TorusGeometry(SUC.rb, SUC.r, 14, 18, PI / 2), sucM, 0, H - SUC.rb, SUC.zr); elb.rotation.y = PI / 2; front.add(elb);
    flange(front, 0, H - SUC.rb - 0.03, SUC.zr + SUC.rb, SUC.r, 'y', sucM, 8);
    // tubo vertical (até o piso, translúcido no corte) + trecho no poço (opaco) + crivo
    front.add(cylA(SUC.r, H - SUC.rb - 0.06, sucM, 0, (H - SUC.rb - 0.06) / 2, SUC.zr + SUC.rb, 'y', 22));
    const below = new THREE.Group();
    below.add(cylA(SUC.r, -SUC.bot - 0.75, iron, 0, (SUC.bot + 0.75) / 2, SUC.zr + SUC.rb, 'y', 22));
    below.add(cylA(SUC.r + 0.08, 0.32, MAT.concDark, 0, -0.16, SUC.zr + SUC.rb, 'y', 20)); // luva de passagem na laje
    below.add(L.lathe([[SUC.r, 0.0], [SUC.r + 0.04, -0.12], [0.34, -0.2], [0.36, -0.22]], iron, 24).translateX(0).translateY(SUC.bot + 0.75).translateZ(SUC.zr + SUC.rb));
    const crivo = cylA(0.36, 0.55, M('#ffffff', { map: K.canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#56646e'; c.fillRect(0, 0, w, h); c.fillStyle = '#141a1e'; for (let y = 8; y < h; y += 14) for (let x = (y / 14) % 2 ? 7 : 0; x < w; x += 14) { c.beginPath(); c.arc(x, y, 4.2, 0, L.TAU); c.fill(); } }), roughness: 0.55, metalness: 0.5 }), 0, SUC.bot + 0.255, SUC.zr + SUC.rb, 'y', 28);
    below.add(crivo, cylA(0.37, 0.04, iron, 0, SUC.bot - 0.02, SUC.zr + SUC.rb, 'y', 28), cylA(0.37, 0.04, iron, 0, SUC.bot + 0.53, SUC.zr + SUC.rb, 'y', 28));
    const cover = new THREE.Group();
    const covM = cut ? M('#3c5566', { roughness: 0.42, metalness: 0.45, transparent: true, opacity: 1, depthWrite: true }) : cas;
    cover.add(L.mesh(geoCover, covM));
    for (let i = 0; i < 14; i++) { const a = (i / 14) * L.TAU, rr = rS(((a - F0) % L.TAU + L.TAU) % L.TAU + F0) + 0.01; cover.add(cylA(0.018, 0.08, cut ? covM : steel, Math.cos(a) * rr, H + Math.sin(a) * rr, DZ / 2 + 0.06, 'z', 6)); }
    // rotor, eixo e acoplamento (giram)
    const rot = new THREE.Group(); rot.position.set(0, H, 0);
    const bz = MAT.bronze;
    rot.add(cylA(0.33, 0.03, bz, 0, 0, -0.145, 'z', 40), cylA(0.075, 0.18, bz, 0, 0, -0.06, 'z', 18), L.cyl(0.0, 0.075, 0.1, bz, 0, 0, 0.08, 18).rotateX(PI / 2));
    for (let i = 0; i < 6; i++) { const v = L.mesh(vaneGeo, bz); v.rotation.z = (i / 6) * L.TAU; rot.add(v); }
    rot.add(L.mesh(new THREE.RingGeometry(0.17, 0.33, 40, 1), M('#b07a33', { roughness: 0.3, metalness: 0.7, side: THREE.DoubleSide, transparent: cut, opacity: cut ? 0.35 : 1, depthWrite: !cut }), 0, 0, 0.025)); // disco frontal (translúcido no corte)
    rot.add(cylA(0.055, 2.4, steel, 0, 0, -1.2, 'z', 10), cylA(0.15, 0.1, steel, 0, 0, -0.9, 'z', 16), cylA(0.15, 0.1, steel, 0, 0, -1.06, 'z', 16));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * L.TAU; rot.add(cylA(0.016, 0.24, MAT.dark, Math.cos(a) * 0.11, Math.sin(a) * 0.11, -0.98, 'z', 6)); }
    // água dentro da carcaça (vista no corte)
    const chan = L.mesh(geoChan, K.blendWater(Lo.WATER.raw, 0.9), 0, 0, 0, { cast: false }); chan.renderOrder = 10;
    // alavanca + contrapeso da válvula de retenção
    const lever = new THREE.Group(); lever.position.set(XD + 0.4, yC, 0); disc.add(bake(dstat), lever);
    lever.add(boxC(-0.02, 0.02, -0.02, 0.02, 0, 0.5, MAT.dark), cylA(0.075, 0.12, M('#2b2f33', { roughness: 0.5, metalness: 0.6 }), 0, 0, 0.5, 'x', 16));
    // agulha do manômetro
    const needle = new THREE.Group(); needle.position.set(XD + 0.32, H + YN + 0.18, 0.08);
    needle.add(boxC(-0.006, 0.006, -0.01, 0.075, -0.003, 0.003, MAT.red), cylA(0.012, 0.01, MAT.dark, 0, 0, 0, 'z', 8));
    const staticBaked = bake(stat);
    const slings = bake(L.put(new THREE.Group(), ...[[-0.6, -2.55], [0.6, -2.55], [-0.6, 0.42], [0.6, 0.42]].map(([x, z]) => K.rod([0, HOOKY, R.MONO.z - I.pumpZ], [x, 0.4, z], 0.016, MAT.dark, 4))));
    set.add(slings);
    set.add(staticBaked, rot, needle, chan);
    const coverB = cut ? cover : bake(cover); set.add(coverB);
    const frontB = cut ? front : bake(front); set.add(frontB);
    const belowB = bake(below);
    return { slings, set, ped, rot, lever, needle, cover: coverB, front: frontB, chan, sucM, covM, disc, below: belowB, x: I.pumps[idx].x };
  }

  /* ---------- montagem ---------- */
  const units = I.pumps.map((p, i) => { const s = pumpSet(i, p.run); s.set.position.set(p.x, HS.floor, I.pumpZ); g.add(s.set); s.disc.position.set(p.x, HS.floor, I.pumpZ); s.below.position.set(p.x, HS.floor, I.pumpZ); g.add(s.disc, s.below); s.ped.position.x += p.x; s.ped.position.y += HS.floor; s.ped.position.z += I.pumpZ; g.add(s.ped); return s; });
  // barrilete (coletor) e saída pela parede da frente até P.rawOut
  const PO = Lo.P.rawOut, yHd = HS.floor + YH, zHd = I.pumpZ + ZH, rH = 0.28, rO = 0.35;
  const xs = units.map((s) => s.x + XD);
  const header = new THREE.Group(); g.add(header);
  {
    const h = new THREE.Group(), ir = MAT.iron;
    h.add(cylA(rH, xs[1] - xs[0] + 0.3, ir, (xs[0] + xs[1]) / 2, yHd, zHd, 'x', 24));
    xs.forEach((x) => { h.add(L.sph(rH * 1.02, ir, x, yHd, zHd)); flange(h, x, yHd, zHd - 0.3, 0.2, 'z', ir, 8); h.add(cylA(0.2, 0.25, ir, x, yHd, zHd - 0.2, 'z', 20)); });
    [xs[0] - 0.15, xs[1] + 0.15].forEach((x) => h.add(cylA(rH * 1.2, 0.05, ir, x, yHd, zHd, 'x', 24)));
    // tê de saída → desce → curva → atravessa a parede (luva) → flange em rawOut
    const xo = PO[0], rb = 0.5;
    h.add(cylA(rO, yHd - (PO[1] + rb), ir, xo, (yHd + PO[1] + rb) / 2, zHd, 'y', 24, rO));
    const el = L.mesh(new THREE.TorusGeometry(rb, rO, 14, 18, PI / 2), ir, xo, PO[1] + rb, zHd + rb); el.rotation.y = PI / 2; el.rotation.z = PI; h.add(el);
    h.add(cylA(rO, PO[2] - (zHd + rb), ir, xo, PO[1], (PO[2] + zHd + rb) / 2, 'z', 24));
    flange(h, xo, PO[1], PO[2] - 0.08, rO, 'z', ir, 10);
    // suportes do barrilete no piso
    xs.forEach((x) => h.add(boxC(x - 0.1, x + 0.1, HS.floor, yHd - rH, zHd - 0.1, zHd + 0.1, MAT.galv), boxC(x - 0.3, x + 0.3, HS.floor, HS.floor + 0.05, zHd - 0.3, zHd + 0.3, MAT.galv)));
    h.add(boxC(xo - 0.3, xo + 0.3, HS.floor, PO[1] - rO, PO[2] - 0.75, PO[2] - 0.45, MAT.concNew));
    header.add(bake(h));
  }

  /* ---------- fluxo na bomba 1 (partículas + setas) ---------- */
  const u1 = units[0], X1 = u1.x, Z1 = I.pumpZ, FY = HS.floor;
  const zs = SUC.zr + SUC.rb;
  const spiralFlow = []; { const fe = L.TAU + 0.12, fs = fe - L.TAU * 1.15; for (let i = 0; i <= 28; i++) { const f = i / 28, a = L.lerp(fs, fe, f), r = L.lerp(0.06, 0.52, Math.pow(f, 0.8)); spiralFlow.push([X1 + Math.cos(a) * r, FY + H + Math.sin(a) * r, Z1 + 0.02 - 0.04 * f]); } }
  const flowPts = [[X1, FY + SUC.bot + 0.3, Z1 + zs], [X1, FY - 2, Z1 + zs], [X1, FY + 0.3, Z1 + zs], [X1, FY + H - SUC.rb, Z1 + zs], [X1, FY + H - 0.08, Z1 + SUC.zr + 0.12], [X1, FY + H, Z1 + SUC.zr - 0.1], [X1, FY + H, Z1 + 0.3], [X1 + 0.02, FY + H + 0.03, Z1 + 0.1], ...spiralFlow,
    [X1 + XD, FY + H + YN, Z1], [X1 + XD, FY + H + YN + 0.5, Z1], [X1 + XD, FY + YH - 0.5, Z1], [X1 + XD, FY + YH - 0.1, Z1 + 0.25], [X1 + XD, FY + YH, Z1 + 0.6], [X1 + XD, FY + YH, Z1 + ZH - 0.3]];
  const flowCurve = L.curve(flowPts, false, 0.4);
  const parts = new L.Flow(flowCurve, { n: 130, size: 0.03, colors: ['#e4cfa2', '#c7a46c', '#f3ead6', '#a88352'], jitter: [0.07, 0.07, 0.06], seed: 77 });
  g.add(parts.mesh);
  const volCh = new L.Chevrons(L.curve([...spiralFlow.slice(8).map((p) => [p[0], p[1], Z1 + 0.06]), [X1 + XD, FY + H + YN + 0.1, Z1 + 0.06], [X1 + XD, FY + H + YN + 0.7, Z1 + 0.06]], false, 0.4), { n: 6, size: 0.075, normal: [0, 0, 1], material: L.flat(L.PAL.accent, { toneMapped: false }) });
  const sucCh = new L.Chevrons(L.curve([[X1, FY + 0.05, Z1 + zs + 0.0], [X1, FY + H - SUC.rb, Z1 + zs], [X1, FY + H - 0.08, Z1 + SUC.zr + 0.12], [X1, FY + H, Z1 + SUC.zr - 0.15], [X1, FY + H, Z1 + 0.32]], false, 0.4), { n: 4, size: 0.1, normal: [1, 0, 0.6], material: L.flat(L.PAL.accent, { toneMapped: false }) });
  g.add(volCh.mesh, sucCh.mesh);

  /* ---------- planta (contorno) dos conjuntos ---------- */
  function update(t, S) {
    const kp = S.build.pumps, run = S.run.pumps;
    // sequência: bases e sucções no poço (0–.08); conjunto 1 entra pela porta na talha e desce (0–.42); gancho volta;
    // conjunto 2 é içado do chão lá fora e desce (.55–.85); recalques (válvulas) e barrilete são montados em seguida
    const XIN = 10.4, YL = 0.95, PARK = [9.6, R.MONO.y - 1.0];
    const ped = E.out(u(kp, 0, 0.08));
    units.forEach((s) => { s.ped.visible = s.below.visible = ped > 0; s.ped.scale.y = Math.max(0.001, ped); s.below.position.y = HS.floor + (1 - ped) * 3; });
    const legs = [[0.0, 0.26, 0.42], [0.55, 0.7, 0.85]];
    let hook = null;
    units.forEach((s, i) => {
      const [a, b, d] = legs[i], tr = E.io(u(kp, a, b)), dn = E.io(u(kp, b, d));
      const ground = 4.0 - HS.floor;
      let y = i === 1 && kp < a + 0.06 ? L.lerp(ground, YL, E.io(u(kp, a, a + 0.06))) : YL * (1 - dn);
      if (i === 0 && kp < a) y = YL;
      const x = L.lerp(XIN, s.x, tr);
      s.set.position.x = x; s.set.position.y = HS.floor + y; s.set.visible = kp > 0;
      const carried = kp > a && kp < d + 0.01;
      s.slings.visible = carried || (i === 0 && kp <= a && kp > 0);
      if (s.slings.visible) hook = [x, HS.floor + y + HOOKY];
      const kd = E.out(u(kp, d + 0.02, d + 0.12)); s.disc.visible = kd > 0; s.disc.position.y = HS.floor + (1 - kd) * 0.9;
    });
    if (!hook && kp > 0.42 && kp < 0.55) { const f = E.io(u(kp, 0.42, 0.55)); hook = [L.lerp(units[0].x, XIN, f), L.lerp(HS.floor + HOOKY, PARK[1], Math.min(1, f * 2))]; }
    if (!hook && kp > 0.85 && kp < 1) { const f = E.io(u(kp, 0.86, 0.97)); hook = [L.lerp(units[1].x, PARK[0], f), L.lerp(HS.floor + HOOKY, PARK[1], Math.min(1, f * 2))]; }
    R.setHoist(...(hook || PARK));
    const kh = E.out(u(kp, 0.86, 1)); header.visible = kh > 0; header.position.y = (1 - kh) * 0.8;
    // rotação, alavanca da retenção, manômetro (bomba 1); a 2 fica parada (reserva)
    const ang = R.spin(t, run);
    units.forEach((s, i) => {
      const on = i === 0 ? run : 0;
      s.rot.rotation.z = i === 0 ? ang : 0.3;
      s.lever.rotation.x = -0.65 * E.io(L.clamp01(on * 1.4));
      s.needle.rotation.z = PI * 0.75 - on * PI * 1.0;
    });
    // corte didático da bomba 1: tampa sai e a sucção fica translúcida
    const ct = S.present ? 1 : E.io(u(run, 0.15, 0.85));
    u1.cover.position.z = ct * 0.9; u1.cover.position.y = ct * 0.25; u1.covM.opacity = 1 - ct; u1.cover.visible = ct < 0.995;
    u1.sucM.opacity = 1 - 0.78 * ct;
    u1.chan.visible = ct > 0.01; u1.chan.material.opacity = 0.9 * ct;
    parts.update(t, { speed: 0.075 + 0.0 * run, amount: run * (ct > 0.3 ? 1 : 0) }); parts.mesh.visible = run > 0.02 && ct > 0.3;
    volCh.update(t, { speed: 0.55, amount: ct > 0.5 ? run : 0 });
    sucCh.update(t, { speed: 0.6, amount: ct > 0.5 ? run : 0 });
  }
  return { update };
}
