// CANAL de concreto aberto (x 16–26, meia seção em corte), BUEIRO sob a avenida D (x 18,5–22,5), CABECEIRA de
// saída no talude do rio (x ≈ 26) com alas, soleira, ENROCAMENTO e COMPORTA basculante (flap). Água no canal
// coerente com a vazão da galeria e com o rio; cascata saindo pela comporta; setas galeria → canal → rio.
// Construção: S.build.canal (fundo e paredes → bueiro → cabeceira → pedras → comporta).
export function buildCanal(ctx, K, gal) {
  const { L, THREE, Lo, scene, shared } = ctx, { C, ZF, slab } = K;
  const CA = Lo.CANAL, W = CA.wall, HF = CA.half, c = CA.invert, X0 = CA.x0, X1 = CA.x1, [CU0, CU1] = CA.culvert;
  const ZBK = ZF - HF - W, ground = (x) => Lo.G(x, ZF - HF - W - 0.2), CH = CA.outletH + W + 0.05; // teto do bueiro = topo do furo do terreno // altura livre do bueiro
  const root = L.group(scene);
  const soilM = shared.soilMat || L.mat(L.PAL.soilMid, { roughness: 0.95 });
  const XO = 26.05; // face de jusante da cabeceira
  const extrudeXY = (pts, z0, depth, m) => { const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); return L.mesh(g, m, 0, 0, z0); };
  const cutM = [C.concCut, C.concOld];

  /* ---------- trechos do canal (fundo + parede de trás + juntas de forma) ---------- */
  const segs = [];
  const edges = [X0, 18, 20, 22, 24, XO];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i], b = edges[i + 1], n = 8, g = L.group(root);
    const fl = [], wl = [];
    for (let j = 0; j <= n; j++) { const x = L.lerp(a, b, j / n); fl.push([x, c(x)]); }
    const floor = extrudeXY([...fl.map(([x, y]) => [x, y - W]), ...fl.slice().reverse()], ZBK, ZF - ZBK, cutM); g.add(floor);
    const top = (x) => Math.max(c(x) + CH + W + 0.1, ground(x) + 0.12);
    for (let j = 0; j <= n; j++) { const x = L.lerp(a, b, j / n); wl.push([x, top(x)]); }
    const wall = extrudeXY([[a, c(a) - W], [b, c(b) - W], ...wl.slice().reverse()], ZBK, W, cutM); g.add(wall);
    // juntas de forma na face interna e capeamento
    const jm = C.joint;
    wall.add(L.box(0.03, top(b) - c(b) + W, 0.004, jm, b - 0.01, (top(b) + c(b) - W) / 2, ZBK + W + 0.002, { cast: false }));
    for (let y = c(a) + 1.2; y < top(a) - 0.3; y += 1.2) wall.add(L.box(b - a, 0.025, 0.004, jm, (a + b) / 2, y, ZBK + W + 0.002, { cast: false }));
    const cope = L.group(g); wl.slice(0, -1).forEach(([x, y], j) => { const [x2, y2] = wl[j + 1]; cope.add(K.beam([x, y + 0.04, ZBK + W / 2], [x2, y2 + 0.04, ZBK + W / 2], W + 0.1, 0.08, C.conc)); });
    // guarda-corpo no alto da parede (só nos trechos abertos)
    if (b <= CU0 + 0.01 || a >= CU1 - 0.01) {
      const rail = L.group(g), pm = L.metal('#6d7a84', { roughness: 0.4 });
      for (let x = a + 0.3; x < b; x += 1.0) rail.add(L.box(0.05, 1.0, 0.05, pm, x, top(x) + 0.58, ZBK + W / 2));
      [0.6, 1.05].forEach((h) => wl.slice(0, -1).forEach(([x, y], j) => { const [x2, y2] = wl[j + 1]; rail.add(K.beam([x, y + h, ZBK + W / 2], [x2, y2 + h, ZBK + W / 2], 0.04, 0.04, pm)); }));
    }
    L.shadows(g);
    segs.push({ g, floor, wall, i, a, b });
  }
  // parede de transição no fim da galeria (x = 16): fecha o canal mais largo em volta da boca da galeria
  const tw = L.group(root);
  const twTop = L.mesh(new THREE.BoxGeometry(0.25, 1, ZF - ZBK).translate(0, 0.5, -(ZF - ZBK) / 2), K.faces(C.concOld, C.concCut), X0 - 0.125, 0, ZF); tw.add(twTop);
  const twBack = L.mesh(new THREE.BoxGeometry(0.25, 1, 1).translate(0, 0.5, -0.5), K.faces(C.concOld, C.concCut), X0 - 0.125, 0, 0); tw.add(twBack);
  L.shadows(tw);

  /* ---------- bueiro sob a avenida D ---------- */
  const cul = L.group(root), roofPts = [];
  for (let j = 0; j <= 8; j++) { const x = L.lerp(CU0 - 0.25, CU1 + 0.25, j / 8); roofPts.push([x, c(x) + CH]); }
  const culRoof = extrudeXY([...roofPts, ...roofPts.slice().reverse().map(([x, y]) => [x, y + W])], ZBK, ZF - ZBK, cutM); cul.add(culRoof);
  const parapets = [CU0 - 0.25, CU1].map((x0) => { const p = slab(x0, x0 + 0.25, c(x0) + CH, ground(x0) + 0.45, ZBK, ZF, C.concOld, C.concCut); cul.add(p); return p; });
  L.shadows(cul);

  /* ---------- cabeceira, alas, soleira, comporta ---------- */
  const hw = L.group(root), cO = c(XO), OH = CA.outletH, topHW = ground(25.9) + 0.25;
  hw.add(slab(XO - 0.25, XO, cO + OH, topHW, ZBK, ZF, C.concOld, C.concCut));   // acima da abertura
  hw.add(slab(XO - 0.25, XO, cO - W, cO + OH, ZBK, ZF - HF, C.concOld, C.concCut)); // atrás da abertura
  // alas (abrem para o rio, descendo com o talude)
  const wingTop = (x) => L.lerp(cO + OH + 0.35, cO + 0.1, L.clamp01((x - XO) / 1.6));
  const wpts = []; for (let j = 0; j <= 6; j++) { const x = L.lerp(XO, XO + 1.6, j / 6); wpts.push([x, wingTop(x)]); }
  const wing = extrudeXY([[XO, cO - W - 0.15], [XO + 1.6, cO - W - 0.15], ...wpts.slice().reverse()], ZBK - 0.05, W, cutM); hw.add(wing);
  // soleira/avental de concreto e pedras do enrocamento
  const ditch = (x) => (x <= 26 ? cO - W : L.lerp(cO - W, Lo.base(28.6), L.sstep(26, 28.6, x))) - 0.02; // fundo da vala de saída (terreno)
  const apTop = (x) => L.lerp(cO, ditch(27.3) + 0.18, L.clamp01((x - XO) / (27.3 - XO)));
  const apP = []; for (let j = 0; j <= 8; j++) { const x = L.lerp(XO, 27.3, j / 8); apP.push([x, apTop(x)]); }
  const apron = extrudeXY([...apP.map(([x]) => [x, ditch(x)]), ...apP.slice().reverse()], ZBK + W, ZF - ZBK - W - 0.002, cutM); hw.add(apron);
  // moldura de aço da abertura + dobradiças
  const frameM = L.metal('#5b6670', { roughness: 0.4 });
  hw.add(L.box(0.08, 0.1, HF, frameM, XO + 0.02, cO + OH + 0.03, ZF - HF / 2));
  L.shadows(hw);
  const flap = L.group(root, XO + 0.05, cO + OH + 0.05, 0), plate = L.group(flap);
  plate.add(slab(0, 0.07, -OH - 0.12, 0, ZF - HF - 0.02, ZF, L.metal('#4e5b66', { roughness: 0.45 }), L.mat('#36414a', { roughness: 0.6 })));
  for (let k = 0; k < 3; k++) plate.add(L.box(0.06, 0.08, HF, frameM, 0.09, -0.25 - k * 0.45, ZF - HF / 2 - 0.01));
  plate.add(L.box(0.06, OH, 0.08, frameM, 0.09, -OH / 2 - 0.06, ZF - HF / 2));
  [ZF - 0.15, ZF - HF + 0.15].forEach((z) => { flap.add(L.cyl(0.07, 0.07, 0.16, L.metal(L.PAL.steel), 0, 0, z, 12).rotateX(Math.PI / 2)); plate.add(L.box(0.12, 0.22, 0.06, frameM, 0.06, -0.08, z)); });
  L.shadows(flap);
  // enrocamento no talude, abaixo da saída
  const NR = 110, rockG = new THREE.IcosahedronGeometry(1, 0), rocks = new THREE.InstancedMesh(rockG, C.rock, NR); rocks.castShadow = rocks.receiveShadow = true; rocks.frustumCulled = false; root.add(rocks);
  const rr = L.rng(77), rockD = [];
  for (let i = 0; i < NR; i++) {
    const u = rr(), x = L.lerp(27.0, 29.4, u), y = (x < 28.6 ? ditch(x) : Lo.base(x)) + 0.06 + rr() * 0.06, z = L.lerp(ZF - 2.2, ZF - 0.12, rr());
    const s = 0.14 + rr() * 0.16;
    rockD.push({ x, y, z, s, r: [rr() * 6, rr() * 6, rr() * 6], sx: 0.8 + rr() * 0.5, k: i / NR });
    rocks.setColorAt(i, new THREE.Color(L.PAL.rock).offsetHSL(0, 0, (rr() - 0.5) * 0.2));
  }
  rocks.instanceColor.needsUpdate = true;

  /* ---------- água, cascata, espuma, setas ---------- */
  const NW = 60, xs = [], bot = [], topA = [], zb = [];
  for (let i = 0; i <= NW; i++) xs.push(L.lerp(X0 - 0.02, XO + 0.02, i / NW));
  const wb = K.cutWater(NW, C.wDrain); root.add(wb.mesh);
  const NC = 16, cpos = new Float32Array((NC + 1) * 6 * 3), cg = new THREE.BufferGeometry(), cidx = [];
  for (let j = 0; j < NC; j++) { const a = j * 6, b = (j + 1) * 6; cidx.push(a, a + 1, b, a + 1, b + 1, b, a + 2, b + 2, a + 3, a + 3, b + 2, b + 3, a + 4, b + 4, a + 5, a + 5, b + 4, b + 5); }
  cg.setAttribute('position', new THREE.BufferAttribute(cpos, 3)); cg.setIndex(cidx);
  const casc = L.mesh(cg, C.wDrain, 0, 0, 0, { cast: false }); casc.frustumCulled = false; casc.renderOrder = 7; root.add(casc);
  const foam = L.mesh(new THREE.RingGeometry(0.55, 1, 24).rotateX(-Math.PI / 2), C.foam, 0, 0, 0, { cast: false }); foam.renderOrder = 9; root.add(foam);
  const fdrops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), L.mat('#e4f2f8', { transparent: true, opacity: 0.85 }), 24); fdrops.frustumCulled = false; root.add(fdrops);
  const chev = new L.Chevrons(L.curve([[X0 + 0.1, c(X0 + 0.1) + 0.45, ZF + 0.07], [21, c(21) + 0.45, ZF + 0.07], [XO - 0.1, cO + 0.45, ZF + 0.07], [XO + 0.8, cO + 0.1, ZF + 0.07], [XO + 1.7, -2.0, ZF + 0.07]], false, 0.3), { n: 9, size: 0.17, color: L.PAL.accent });
  const rev = new L.Chevrons(L.curve([[XO - 0.2, cO + 0.45, ZF + 0.07], [X0 + 0.2, c(X0) + 0.45, ZF + 0.07]], false, 0.3), { n: 6, size: 0.17, color: L.PAL.warn });
  root.add(chev.mesh, rev.mesh);
  const _o = new THREE.Object3D();

  /** nível absoluto da água no canal em x */
  function levelAt(x, S) {
    const lvl = Math.min(1, Math.max(0, S.gal)), d = 0.03 + 0.8 * lvl * (1 - 0.25 * (x - X0) / (XO - X0));
    const own = c(x) + d, gl16 = gal.floorY(15.95) + lvl * gal.hAt(15.95);
    const back = L.lerp(own, Math.max(own, gl16), S.flap);
    const riv = S.river - 4 * S.flap;
    return Math.max(own, back, riv);
  }

  return {
    levelAt,
    update(t, S) {
      const b = S.build.canal, ease = L.ease;
      segs.forEach((s) => {
        const bo = Math.min(0.45, ((s.b - 15.9) / 11.8) * 0.45), ef = ease.out(K.sub(b, bo, bo + 0.08)), ew = ease.out(K.sub(b, bo + 0.03, bo + 0.2));
        s.g.visible = ef > 0; s.floor.position.z = ZBK + 1.6 * (1 - ef);
        // concreto subindo na forma: escala vertical com pivô no fundo do canal
        const y0 = c(s.a) - W; s.wall.visible = ew > 0; s.wall.scale.y = Math.max(0.001, ew); s.wall.position.y = y0 * (1 - ew);
        s.g.children.forEach((ch) => { if (ch !== s.floor && ch !== s.wall) ch.visible = ew > 0.98; });
      });
      // parede de transição em x = 16 (acompanha o teto da galeria quando ela é ampliada)
      const et = ease.out(K.sub(b, 0.05, 0.25)), r16 = gal.roofOut(15.9), gtop = ground(X0) + 0.12, wb16 = Lo.GALLERY.wall + gal.wAt(15.9) / 2;
      tw.visible = et > 0;
      twTop.position.y = r16; twTop.scale.y = Math.max(0.001, (gtop - r16) * et);
      const backD = Math.max(0.001, HF + W - wb16), yb = c(X0) - W;
      twBack.visible = backD > 0.01; twBack.position.set(X0 - 0.125, yb, ZF - wb16); twBack.scale.set(1, Math.max(0.001, (r16 - yb) * et), backD);
      // bueiro
      const er = ease.out(K.sub(b, 0.48, 0.6));
      cul.visible = er > 0; culRoof.position.y = 3 * (1 - er);
      parapets.forEach((p) => { p.visible = er > 0.99; });
      // cabeceira, alas e avental
      const eh = ease.out(K.sub(b, 0.55, 0.72));
      hw.visible = eh > 0; hw.scale.y = Math.max(0.001, eh); hw.position.y = (cO - W) * (1 - eh);
      // pedras caindo uma a uma
      for (let i = 0; i < NR; i++) {
        const q = rockD[i], e = K.sub(b, 0.68 + 0.22 * q.k, 0.75 + 0.22 * q.k), dy = 2.5 * (1 - ease.bounce(e));
        _o.position.set(q.x, q.y + dy, q.z); _o.rotation.set(...q.r); const s = e > 0 ? q.s : 0; _o.scale.set(s * q.sx, s * 0.7, s); _o.updateMatrix(); rocks.setMatrixAt(i, _o.matrix);
      }
      rocks.instanceMatrix.needsUpdate = true;
      // água
      const built = b > 0.98 && S.build.gallery > 0.98;
      for (let i = 0; i <= NW; i++) {
        const x = xs[i], inCul = x > CU0 - 0.25 && x < CU1 + 0.25;
        bot[i] = c(x) + 0.004; topA[i] = built ? Math.min(levelAt(x, S), inCul ? c(x) + CH - 0.006 : 99) : bot[i]; zb[i] = ZBK + W + 0.004;
      }
      wb.update(xs, bot, topA, zb);
      const dOut = built ? levelAt(XO, S) - cO : 0;
      // comporta: abre empurrada pela água; fecha quando o rio sobe (S.flap). Montagem: desce girando.
      const ef2 = K.sub(b, 0.88, 1), open = (1 - S.flap) * (0.1 + 0.95 * L.clamp01((dOut - 0.03) / 0.7)) * (S.river < cO + 0.2 ? 1 : 0.15);
      flap.visible = ef2 > 0; flap.rotation.z = ef2 < 1 ? (1 - ease.out(ef2)) * 1.45 : open;
      // cascata saindo pela comporta para o rio
      const ck = built ? (1 - S.flap) * L.clamp01((dOut - 0.03) / 0.15) * L.clamp01((cO - S.river) / 0.25) : 0;
      casc.visible = ck > 0.01; foam.visible = fdrops.visible = casc.visible;
      if (casc.visible) {
        const th = Math.max(0.04, dOut * 0.45), y0 = cO + 0.02, v = 0.9 + 1.6 * Math.min(1, dOut), H = Math.max(0.1, y0 - S.river), tf = Math.sqrt(2 * H / 9.8);
        const xi = XO + 0.1 + v * tf, za = ZF - HF + 0.05, zf = ZF - 0.02;
        for (let j = 0; j <= NC; j++) {
          const tt = (j / NC) * tf, x = XO + 0.1 + v * tt, y = y0 + th * 0.5 - 4.9 * tt * tt, o = j * 18, hh = th * (1 - 0.5 * j / NC);
          cpos.set([x, y + hh / 2, zf, x, y + hh / 2, za, x, y - hh / 2, zf, x, y - hh / 2, za, x, y + hh / 2, zf + 0.001, x, y - hh / 2, zf + 0.001], o);
        }
        cg.attributes.position.needsUpdate = true; cg.computeVertexNormals();
        const fk = 0.22 + 0.3 * ck + 0.03 * Math.sin(t * 9);
        foam.position.set(xi, S.river + 0.03, ZF - HF / 2); foam.scale.set(fk * 0.8, 1, fk);
        for (let i = 0; i < 24; i++) {
          const ph = L.fract(t * 1.6 + i / 24), a = i * 2.4, r = 0.2 + 0.6 * ph, s = 0.025 * (1 - ph * 0.6) * (0.5 + ck);
          _o.position.set(xi + Math.cos(a) * r * 0.6, S.river + 0.02 + 3.2 * ph * (1 - ph) * (0.3 + 0.4 * ck), ZF - HF / 2 + Math.sin(a) * r * 0.5); _o.scale.set(s, s, s); _o.updateMatrix(); fdrops.setMatrixAt(i, _o.matrix);
        }
        fdrops.instanceMatrix.needsUpdate = true;
      }
      // setas: seguem a água para o rio; com a comporta fechada e a galeria cheia, param e voltam (vermelhas)
      const xr = L.clamp01(S.xray / 0.7), flowVis = L.clamp01((S.gal - 0.03) * 5);
      chev.update(t, { speed: 0.05 + 0.2 * S.flow, amount: (b > 0.98 ? 1 : 0) * Math.max(xr, flowVis * 0.95) * (1 - 0.92 * S.flap) });
      rev.update(t, { speed: 0.12, amount: built && S.gal > 0.9 ? L.sstep(0.45, 0.9, S.flap) : 0 });
      shared.canalLevel = (x) => (built ? levelAt(x, S) : c(x));
    }
  };
}
