// Cenário "casa" (0 → 37,75 s): banheiro, vaso sanitário em corte, tubulação sob a casa,
// caixa de inspeção no quintal e ramal até a rede sob a rua.
// Convenção: plano de corte em z = 0; x corre da casa (esquerda) para a rua (direita).
export function create(L, { PH }) {
  const { THREE, PAL, V, sstep, pulse, prog, lerp, clamp01 } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 3, sunDir: [0.3, 1, 0.9], hemi: 1.0, sun: 2.6 });
  const DS = THREE.DoubleSide;

  /* ================= materiais ================= */
  const ceramic = L.glossy(PAL.ceramic, { side: DS });
  const cutM = L.mat(PAL.cut, { roughness: 0.9, side: DS });
  const chrome = L.metal('#dfe6ea', { roughness: 0.18 });
  const tapW = '#35b3ee', pipeW = '#8f5f36';
  const wm = (c, o, x = {}) => L.water(c, o, { roughness: 0.32, envMapIntensity: 0.3, ...x });
  const levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0.2);
  const coverMats = [];
  const cm = (m) => { const c = m.clone(); c.transparent = true; coverMats.push(c); return c; };
  const ceramicC = cm(ceramic), chromeC = cm(chrome);
  const faces = (m, cut) => [m, m, m, m, cut, m]; // BoxGeometry: +x -x +y -y +z -z
  const slab = (x0, x1, y0, y1, z0, z1, m = ceramic, cut = cutM) => L.mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), faces(m, cut), (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  function halfCyl(r, h, m, x, y, capM) { // meio cilindro (z <= 0) com a face de corte fechada
    const g = new THREE.Group(); g.position.set(x, y, 0);
    g.add(L.mesh(new THREE.CylinderGeometry(r, r, h, 28, 1, false, Math.PI / 2, Math.PI), m));
    g.add(L.mesh(new THREE.PlaneGeometry(2 * r, h), capM || m, 0, 0, 0.0005));
    [h / 2, -h / 2].forEach((yy) => { const c = L.mesh(new THREE.CircleGeometry(r, 28, 0, Math.PI), m, 0, yy, 0); c.rotation.x = yy > 0 ? -Math.PI / 2 : Math.PI / 2; if (yy < 0) c.rotation.z = Math.PI; g.add(c); });
    return g;
  }

  /* ================= vaso sanitário ================= */
  const toilet = L.group(scene), cover = L.group(scene);
  const AX = -0.10, SX = 1.2;
  const smooth = (pts, n) => new THREE.SplineCurve(pts.map((p) => new THREE.Vector2(p[0], p[1]))).getPoints(n).map((p) => [p.x, p.y]);
  const outerP = smooth([[0.132, 0], [0.128, 0.02], [0.119, 0.07], [0.121, 0.14], [0.138, 0.22], [0.165, 0.3], [0.186, 0.36], [0.19, 0.385], [0.184, 0.4]], 28);
  const innerP = smooth([[0.15, 0.4], [0.148, 0.37], [0.14, 0.33], [0.12, 0.27], [0.09, 0.21], [0.06, 0.165], [0.044, 0.148], [0.033, 0.138], [0.0267, 0.13]], 28);
  const rIn = (y) => { for (let i = 0; i < innerP.length - 1; i++) { const a = innerP[i], b = innerP[i + 1]; if (y <= a[1] && y >= b[1]) return lerp(a[0], b[0], (a[1] - y) / (a[1] - b[1] || 1)); } return y > 0.4 ? 0.15 : 0.0267; };
  const bowlGeo = (phi0) => { const g = new THREE.LatheGeometry([...outerP, ...innerP].map((p) => new THREE.Vector2(p[0], p[1])), 40, phi0, Math.PI); g.scale(SX, 1, 1); g.translate(AX, 0, 0); return g; };
  toilet.add(L.mesh(bowlGeo(Math.PI / 2), ceramic));
  cover.add(L.mesh(bowlGeo(-Math.PI / 2), ceramicC));

  // sifão: linha de centro no plano de corte
  const RI = 0.032;
  const trapPts = [[-0.1, 0.13], [-0.1, 0.085], [-0.072, 0.052], [-0.02, 0.044], [0.04, 0.072], [0.086, 0.138], [0.122, 0.198], [0.162, 0.226], [0.204, 0.2], [0.226, 0.14], [0.23, 0.05], [0.23, -0.2]];
  const trap = L.curve(trapPts.map((p) => [p[0], p[1], 0]), false, 0.5);
  const NT = 110, fr = [];
  for (let i = 0; i <= NT; i++) { const p = trap.getPoint(i / NT), tg = trap.getTangent(i / NT); fr.push({ x: p.x, y: p.y, nx: -tg.y, ny: tg.x }); }
  fr[0].nx = 1; fr[0].ny = 0;
  const Wp = fr.map((k) => [k.x + k.nx * RI, k.y + k.ny * RI]), Wm = fr.map((k) => [k.x - k.nx * RI, k.y - k.ny * RI]);
  let iC = 0; Wm.forEach((p, i) => { if (i > 20 && i < NT - 15 && p[1] > Wm[iC][1]) iC = i; });
  const WEIR = Wm[iC][1];
  let iF = NT; for (let i = iC; i <= NT; i++) if (fr[i].y <= 0) { iF = i; break; }
  // superfície interna do sifão (meia-cana atrás do plano de corte)
  toilet.add(L.loft(fr.map((k) => { const ring = []; for (let j = 0; j <= 12; j++) { const a = (j / 12) * Math.PI; ring.push(V(k.x + k.nx * Math.cos(a) * RI, k.y + k.ny * Math.cos(a) * RI, -Math.sin(a) * RI)); } return ring.reverse(); }), ceramic));
  // faces de corte da louça (região da frente/baixo e região de trás/cima)
  const front = [...outerP.map((p) => [AX - SX * p[0], p[1]]), ...innerP.map((p) => [AX - SX * p[0], p[1]]), ...Wm.slice(1, iF + 1), [Wm[iF][0], 0]];
  const back = [...innerP.slice().reverse().map((p) => [AX + SX * p[0], p[1]]), [0.36, 0.4], [0.36, 0], [Wp[iF][0], 0], ...Wp.slice(1, iF + 1).reverse()];
  const passage = [[0.255, 0.396], [0.295, 0.396], [0.295, 0.352], [0.105, 0.352], [0.105, 0.384], [0.255, 0.384]];
  const shapeMesh = (pts, m, holes, z = 0) => { const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); (holes || []).forEach((h) => s.holes.push(new THREE.Path(h.map((p) => new THREE.Vector2(p[0], p[1]))))); return L.mesh(new THREE.ShapeGeometry(s, 6), m, 0, 0, z, { cast: false }); };
  toilet.add(shapeMesh(front, cutM), shapeMesh(back, cutM, [passage]));
  // corpo traseiro (abriga o sifão) e flange no piso
  toilet.add(L.mesh(new THREE.BoxGeometry(0.34, 0.4, 0.13), [ceramic, ceramic, ceramic, ceramic, hidden, ceramic], 0.19, 0.2, -0.065));
  cover.add(L.rbox(0.34, 0.4, 0.13, 0.012, ceramicC, 0.19, 0.2, 0.065));
  // caixa acoplada
  toilet.add(slab(0.19, 0.258, 0.4, 0.415, -0.19, 0), slab(0.292, 0.36, 0.4, 0.415, -0.19, 0), slab(0.348, 0.36, 0.415, 0.76, -0.19, 0), slab(0.19, 0.202, 0.415, 0.76, -0.19, 0));
  toilet.add(L.box(0.17, 0.36, 0.012, ceramic, 0.275, 0.58, -0.184), slab(0.178, 0.372, 0.76, 0.792, -0.202, 0));
  cover.add(L.rbox(0.17, 0.36, 0.19, 0.012, ceramicC, 0.275, 0.58, 0.095), L.rbox(0.194, 0.032, 0.202, 0.01, ceramicC, 0.275, 0.776, 0.101));
  const tankWaterGeo = new THREE.BoxGeometry(0.146, 1, 0.178); tankWaterGeo.translate(0, 0.5, 0);
  const tankWater = L.mesh(tankWaterGeo, wm(tapW, 0.8), 0.275, 0.415, -0.089, { cast: false }); tankWater.renderOrder = 2; toilet.add(tankWater);
  // válvula de descarga (sobe quando o botão é apertado), tubo extravasor e botão
  const valve = L.group(toilet);
  valve.add(halfCyl(0.034, 0.13, L.glossy(PAL.blue), 0.275, 0.5), halfCyl(0.013, 0.2, L.mat('#e8eef2'), 0.275, 0.62), halfCyl(0.042, 0.016, L.mat(PAL.red, { roughness: 0.5 }), 0.275, 0.428));
  toilet.add(halfCyl(0.05, 0.012, L.mat('#39434d'), 0.275, 0.418));
  const button = halfCyl(0.03, 0.02, chrome, 0.275, 0.8); toilet.add(button);
  const buttonC = L.mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 28, 1, false, -Math.PI / 2, Math.PI), chromeC, 0.275, 0.8, 0); cover.add(buttonC);
  const rod = L.box(0.008, 0.11, 0.008, L.mat('#e8eef2'), 0.275, 0.735, -0.004); toilet.add(rod);
  // torre de enchimento com boia
  toilet.add(L.cyl(0.012, 0.012, 0.27, L.mat('#cfd6db'), 0.228, 0.55, -0.125, 14), L.cyl(0.021, 0.021, 0.035, L.glossy(PAL.blue), 0.228, 0.7, -0.125, 16));
  const floatCup = L.cyl(0.027, 0.027, 0.05, L.mat('#22292f'), 0.228, 0.6, -0.125, 18); toilet.add(floatCup);
  // assento e tampa (meias-peças)
  const seatGeo = (phi0) => { const g = new THREE.LatheGeometry([[0.132, 0.401], [0.138, 0.419], [0.188, 0.419], [0.194, 0.401], [0.132, 0.401]].map((p) => new THREE.Vector2(p[0], p[1])), 40, phi0, Math.PI); g.scale(SX, 1, 1); g.translate(AX, 0, 0); return g; };
  const seatM = L.glossy('#eef2f5', { side: DS });
  toilet.add(L.mesh(seatGeo(Math.PI / 2), seatM)); cover.add(L.mesh(seatGeo(-Math.PI / 2), cm(seatM)));
  const lidGeo = (a0) => { const s = new THREE.Shape(); s.absellipse(0, 0, 0.178, 0.2, a0, a0 + Math.PI, false); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.02, bevelEnabled: false, curveSegments: 28 }); g.rotateY(Math.PI / 2); return g; };
  const lidA = L.mesh(lidGeo(-Math.PI / 2), seatM, 0.148, 0.625, 0), lidB = L.mesh(lidGeo(Math.PI / 2), coverMats[coverMats.length - 1], 0.148, 0.625, 0);
  lidA.rotation.z = lidB.rotation.z = -0.1; toilet.add(lidA); cover.add(lidB);
  toilet.add(L.cyl(0.012, 0.012, 0.2, chrome, 0.15, 0.415, -0.1, 12).rotateX(Math.PI / 2));

  // água da bacia: face no corte (recortada pelo nível) + espelho d'água
  const cavity = [...innerP.map((p) => [AX - SX * p[0], p[1]]), ...innerP.slice().reverse().map((p) => [AX + SX * p[0], p[1]])];
  const bowlWM = wm(tapW, 0.9, { clippingPlanes: [levelPlane], side: DS });
  const bowlFace = shapeMesh(cavity, bowlWM, null, 0.0012); bowlFace.renderOrder = 3; toilet.add(bowlFace);
  const discGeo = (a0) => { const g = new THREE.CircleGeometry(1, 40, a0, Math.PI); g.rotateX(-Math.PI / 2); return g; };
  const surfM = wm(tapW, 0.86);
  const surfA = L.mesh(discGeo(0), surfM, AX, 0.2, 0, { cast: false }), surfB = L.mesh(discGeo(Math.PI), cm(surfM), AX, 0.2, 0, { cast: false });
  surfA.renderOrder = surfB.renderOrder = 3; toilet.add(surfA); cover.add(surfB);
  // água no sifão: trecho do fecho hídrico (recortado pelo nível) e trecho de descida (cabeça/cauda animadas)
  const stripGeo = (i0, i1) => { const pos = [], idx = []; for (let i = i0; i <= i1; i++) pos.push(Wm[i][0], Wm[i][1], 0.0012, Wp[i][0], Wp[i][1], 0.0012); for (let i = 0; i < i1 - i0; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g; };
  const seal = L.mesh(stripGeo(0, iC + 1), bowlWM, 0, 0, 0, { cast: false }); seal.renderOrder = 3; toilet.add(seal);
  const down = L.mesh(stripGeo(iC, NT), wm(tapW, 0.9, { side: DS }), 0, 0, 0, { cast: false }); down.renderOrder = 3; toilet.add(down);
  const passW = shapeMesh([[0.258, 0.412], [0.292, 0.412], [0.292, 0.355], [0.108, 0.355], [0.108, 0.381], [0.258, 0.381]], wm(tapW, 0.9), null, 0.0012); toilet.add(passW);
  // jatos pela borda, fluxo caixa → borda e fluxo no sifão
  const jets = [];
  for (let j = 0; j <= 6; j++) {
    const phi = Math.PI / 2 + (j / 6) * Math.PI, pts = innerP.filter((p) => p[1] <= 0.375 && p[1] >= 0.15).map((p) => [AX + SX * (p[0] - 0.006) * Math.sin(phi), p[1], (p[0] - 0.006) * Math.cos(phi) + (j === 0 || j === 6 ? -0.004 : 0)]);
    const f = new L.Flow(L.curve(pts), { n: 18, size: 0.0052, colors: ['#e9f8ff', '#9fdcf7'], seed: 20 + j, material: L.flat(0xffffff) }); toilet.add(f.mesh); jets.push(f);
  }
  const passFlow = new L.Flow([[0.275, 0.45, -0.005], [0.275, 0.37, -0.005], [0.2, 0.367, -0.005], [0.112, 0.367, -0.005]], { n: 14, size: 0.007, colors: ['#e9f8ff', '#bfe9fb'], material: L.flat(0xffffff) }); toilet.add(passFlow.mesh);
  const trapFlow = new L.Flow(trap, { n: 34, size: 0.008, colors: ['#e9f8ff', '#bfe9fb'], jitter: [0.012, 0.012, 0], offset: [0, 0, -0.012], material: L.flat(0xffffff) }); toilet.add(trapFlow.mesh);
  const trapArrows = new L.Chevrons(trap, { n: 7, size: 0.022, offset: [0, 0, 0.006] }); toilet.add(trapArrows.mesh);
  // indicadores: anel no botão, seta de descida na caixa
  const ring = L.mesh(new THREE.TorusGeometry(0.04, 0.006, 8, 40), L.flat(PAL.accent, { transparent: true, toneMapped: false }), 0.275, 0.815, 0, { cast: false, receive: false }); ring.rotation.x = Math.PI / 2; scene.add(ring);
  /* ---- mão direita que aperta o botão ----
     Esqueleto simples de falanges (cilindro + esferas nas juntas) com pivôs nas articulações, para dobrar.
     Eixos locais: dedos apontam para -y, dorso para +z (para a câmera), palma para -z. */
  const hand = L.group(scene), H = L.group(hand);
  const skin = new THREE.MeshPhysicalMaterial({ color: '#d99c7a', roughness: 0.52, sheen: 0.7, sheenColor: new THREE.Color('#ffb196'), sheenRoughness: 0.45, clearcoat: 0.06, clearcoatRoughness: 0.7 });
  const nailM = L.mat('#f2d4c6', { roughness: 0.22 });
  const bone = (len, r0, r1) => { const g = new THREE.Group(); const c = L.mesh(new THREE.CylinderGeometry(r1, r0, len, 16), skin, 0, -len / 2, 0); c.rotation.x = Math.PI; g.add(c, L.mesh(new THREE.SphereGeometry(r0, 16, 12), skin, 0, 0, 0), L.mesh(new THREE.SphereGeometry(r1, 16, 12), skin, 0, -len, 0)); return g; };
  // dedo = cadeia de 3 falanges; devolve os pivôs [MCP, PIP, DIP] e a ponta
  function digit(base, lens, radii, flex) {
    const piv = []; let parent = H, pos = base;
    for (let k = 0; k < 3; k++) { const pv = L.group(parent, ...pos); pv.rotation.x = flex[k]; pv.add(bone(lens[k], radii[k], radii[k + 1])); piv.push(pv); parent = pv; pos = [0, -lens[k], 0]; }
    const nail = L.mesh(new THREE.SphereGeometry(radii[3] * 0.95, 14, 10), nailM, 0, -lens[2] + radii[3] * 1.4, radii[3] * 0.62); nail.scale.set(0.95, 1.5, 0.42); piv[2].add(nail);
    const tip = L.group(piv[2], 0, -lens[2] - radii[3] * 0.9, 0);
    return { piv, tip };
  }
  const index = digit([0, 0, 0], [0.043, 0.026, 0.021], [0.0094, 0.0088, 0.0081, 0.0074], [0.12, 0.14, 0.1]);
  digit([0.021, 0.004, -0.001], [0.046, 0.028, 0.022], [0.0096, 0.009, 0.0083, 0.0075], [1.35, 1.55, 1.1]);
  digit([0.040, 0.001, -0.002], [0.042, 0.027, 0.021], [0.0091, 0.0085, 0.0078, 0.007], [1.4, 1.6, 1.1]);
  digit([0.056, -0.007, -0.003], [0.034, 0.021, 0.018], [0.0082, 0.0076, 0.007, 0.0063], [1.45, 1.6, 1.05]);
  const thumbP = L.group(H, -0.006, 0.068, -0.012); thumbP.rotation.set(0.75, 0.05, -0.2);
  const th = digit([0, 0, 0], [0.036, 0.03, 0.024], [0.0125, 0.011, 0.0098, 0.0088], [0.12, 0.28, 0.22]); thumbP.add(th.piv[0]);
  th.piv[0].position.set(0, 0, 0);
  // palma (levemente afunilada), juntas dos dedos e eminência tenar
  const palm = L.mesh(new L.RoundedBoxGeometry(0.08, 0.088, 0.03, 4, 0.012), skin, 0.028, 0.046, -0.007); palm.scale.set(1, 1, 1); H.add(palm);
  [[0, 0.0], [0.021, 0.004], [0.04, 0.001], [0.056, -0.007]].forEach(([x, y]) => H.add(L.mesh(new THREE.SphereGeometry(0.0105, 14, 10), skin, x, y + 0.003, 0.004)));
  const thenar = L.mesh(new THREE.SphereGeometry(0.022, 16, 12), skin, 0.002, 0.06, -0.018); thenar.scale.set(0.9, 1.4, 0.8); H.add(thenar);
  // punho, antebraço e manga da camisa
  const wrist = L.mesh(new THREE.CylinderGeometry(0.029, 0.026, 0.09, 18), skin, 0.03, 0.125, -0.006); wrist.scale.set(1.25, 1, 0.8); H.add(wrist);
  const sleeve = L.mesh(new THREE.CylinderGeometry(0.036, 0.033, 0.3, 22), L.mat('#2f4f7f', { roughness: 0.85 }), 0.03, 0.31, -0.006); sleeve.scale.set(1.15, 1, 0.95); H.add(sleeve);
  const cuff = L.mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.03, 22), L.mat('#26446f', { roughness: 0.85 }), 0.03, 0.17, -0.006); cuff.scale.set(1.15, 1, 0.95); H.add(cuff);
  L.shadows(hand);
  // a origem da mão fica na ponta do indicador (pose de repouso)
  hand.updateMatrixWorld(true); const tip0 = new THREE.Vector3(); index.tip.getWorldPosition(tip0); H.position.sub(tip0);
  const tankArrow = L.arrow(0.11, { width: 0.016, color: PAL.accent }); tankArrow.rotation.z = -Math.PI / 2; tankArrow.position.set(0.228, 0.72, 0.012); scene.add(tankArrow);
  // cocô (três peças) — acompanha a descarga e, depois, a viagem pelos canos
  const poopGeo = new THREE.CapsuleGeometry(0.016, 0.042, 6, 14);
  const poops = [0, 1, 2].map((i) => { const m = L.mesh(poopGeo, L.mat(PAL.poop, { roughness: 0.55 })); scene.add(m); return m; });
  // abertura: respingos e ondas de cada peça caindo na água
  const DROP = [-0.12, 0.1, 0.3], DROP_H = 0.32, DROP_T = 0.3;
  const splash = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), L.mat('#bfe9fb', { roughness: 0.1, emissive: '#5fc4f0', emissiveIntensity: 0.25 }), 36); splash.frustumCulled = false; scene.add(splash);
  const spR = L.rng(31), spV = Array.from({ length: 36 }, () => { const a = spR() * L.TAU, s = 0.25 + spR() * 0.45; return [Math.cos(a) * s * 0.45, 0.55 + spR() * 0.7, Math.sin(a) * s * 0.35, 0.0035 + spR() * 0.004]; });
  const ripples = DROP.map(() => { const m = L.mesh(new THREE.TorusGeometry(1, 0.035, 6, 48), L.flat('#e9f8ff', { transparent: true, toneMapped: false }), 0, 0, 0, { cast: false, receive: false }); m.rotation.x = Math.PI / 2; m.renderOrder = 4; scene.add(m); return m; });
  const _dm = new THREE.Object3D();

  // gás do esgoto tentando voltar
  const gasCurve = L.curve([[1.7, -0.9, -0.03], [0.8, -0.82, -0.03], [0.42, -0.77, -0.03], [0.27, -0.66, -0.03], [0.23, -0.45, -0.03], [0.23, 0.03, -0.02], [0.226, 0.16, -0.02], [0.205, 0.214, -0.02], [0.175, 0.205, -0.02]]);
  const gas = new L.Flow(gasCurve, { n: 26, size: 0.02, colors: [PAL.gas, '#8fd94a', '#d7f77a'], jitter: [0.012, 0.012, 0.006], material: L.flat(0xffffff, { transparent: true, opacity: 0.85 }) }); scene.add(gas.mesh);

  // barreira: linha luminosa exatamente na superfície da água parada (do lado do cano), e o gás acumulado acima dela
  const crossX = (P) => { let x = null; for (let i = 6; i <= iC; i++) { const p0 = P[i - 1], p1 = P[i]; if ((p0[1] - WEIR) * (p1[1] - WEIR) <= 0 && p0[1] !== p1[1]) x = lerp(p0[0], p1[0], (WEIR - p0[1]) / (p1[1] - p0[1])); } return x; };
  const bxA = crossX(Wp) ?? Wm[iC][0] - 0.07, bxB = Wm[iC][0];
  const barrier = L.mesh(new THREE.BoxGeometry(bxB - bxA, 0.007, 0.004), L.flat(PAL.good, { transparent: true, toneMapped: false }), (bxA + bxB) / 2, WEIR + 0.002, 0.003, { cast: false, receive: false }); barrier.renderOrder = 6; scene.add(barrier);
  const pocket = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), L.flat(0xffffff, { transparent: true, opacity: 0.85 }), 12); pocket.frustumCulled = false; scene.add(pocket);
  const pkR = L.rng(17), pk = Array.from({ length: 12 }, (_, i) => { pocket.setColorAt(i, new THREE.Color([PAL.gas, '#8fd94a', '#d7f77a'][i % 3])); return [pkR() * L.TAU, 0.6 + pkR(), pkR()]; }); pocket.instanceColor.needsUpdate = true;

  /* ================= banheiro e casa ================= */
  const tileTex = (a, b, n, line = 'rgba(255,255,255,.75)') => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), s = 256 / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i * s, j * s, s, s); } g.strokeStyle = line; g.lineWidth = 3; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const house = L.group(scene);
  const wallM = L.mat('#8ecfc4', { roughness: 0.9 }), brickCut = L.mat('#c9785a', { roughness: 0.95 }), concrete = L.mat(PAL.concrete, { roughness: 0.9 });
  const Z0 = -0.78; // parede do fundo do banheiro
  // laje do piso (com abertura para o tubo de queda), paredes, forro e telhado
  house.add(slab(-5.6, 0.19, -0.2, 0, -3, 0, concrete, L.mat('#aeb4b9')), slab(0.27, 0.52, -0.2, 0, -3, 0, concrete, L.mat('#aeb4b9')), L.box(0.08, 0.2, 2.9, concrete, 0.23, -0.1, -1.55));
  const floorT = tileTex('#d9c7a8', '#c9b592', 2); floorT.repeat.set(2.67 / 0.8, 0.78 / 0.8);
  house.add(L.mesh(new THREE.PlaneGeometry(2.67, 0.78), L.mat(0xffffff, { map: floorT, roughness: 0.35 }), -0.965, 0.002, -0.39, { cast: false }).rotateX(-Math.PI / 2));
  house.add(slab(0.37, 0.52, 0, 2.6, -3, 0, L.mat(PAL.wall), brickCut), slab(-2.42, -2.3, 0, 2.6, -3, 0, wallM, brickCut), slab(-5.72, -5.6, -0.2, 2.6, -3, 0, L.mat(PAL.wall), brickCut));
  house.add(L.box(2.67, 2.6, 0.12, wallM, -0.965, 1.3, Z0 - 0.06), L.box(3.18, 2.6, 0.12, L.mat('#e9d9bf'), -4.01, 1.3, -2.2));
  const wallT = tileTex('#f4f8f9', '#e8f1f3', 2, 'rgba(120,160,170,.55)'); wallT.repeat.set(2.67 / 0.4, 1.2 / 0.4);
  house.add(L.mesh(new THREE.PlaneGeometry(2.67, 1.2), L.mat(0xffffff, { map: wallT, roughness: 0.25 }), -0.965, 0.6, Z0 + 0.003, { cast: false }), L.box(2.67, 0.05, 0.02, L.mat(PAL.yellow), -0.965, 1.225, Z0 + 0.01));
  house.add(slab(-5.72, 0.6, 2.6, 2.74, -3.1, 0, L.mat('#f1ece2'), L.mat('#b9bec2')));
  const roof = L.extrude([[-6.1, 2.74], [0.98, 2.74], [-2.56, 4.25]], 3.5, [L.mat('#5c3a2a'), L.mat(PAL.roof, { roughness: 0.8 })]); roof.position.z = -3.3; house.add(roof);
  for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 9; [[-6.1, -2.56], [0.98, -2.56]].forEach(([xa, xb]) => { const x = lerp(xa, xb, k), y = lerp(2.74, 4.25, k), r = L.box(0.44, 0.03, 3.5, L.mat('#b3452f', { roughness: 0.8 }), x, y + 0.03, -1.55); r.rotation.z = Math.atan2(4.25 - 2.74, xb - xa) + (xb < xa ? Math.PI : 0); house.add(r); }); }
  // quarto ao lado (contexto)
  house.add(L.mesh(new THREE.PlaneGeometry(3.18, 2.2), L.mat(PAL.wood, { roughness: 0.6 }), -4.01, 0.002, -1.1, { cast: false }).rotateX(-Math.PI / 2));
  house.add(L.rbox(1.9, 0.28, 1.4, 0.05, L.mat('#6b4a36'), -4.3, 0.2, -1.4), L.rbox(1.8, 0.2, 1.3, 0.08, L.mat('#f3efe6'), -4.3, 0.42, -1.4), L.rbox(1.15, 0.1, 1.32, 0.05, L.mat(PAL.blue), -4.0, 0.52, -1.4), L.rbox(0.42, 0.13, 0.6, 0.06, L.mat('#ffffff'), -4.95, 0.56, -1.4), L.rbox(0.1, 0.9, 1.5, 0.03, L.mat('#6b4a36'), -5.3, 0.55, -1.4));
  house.add(L.rbox(0.45, 0.5, 0.4, 0.03, L.mat('#8a5d42'), -2.95, 0.25, -1.9), L.cyl(0.02, 0.03, 0.3, chrome, -2.95, 0.65, -1.9), L.mesh(new THREE.CylinderGeometry(0.1, 0.17, 0.2, 20, 1, true), L.glow('#ffd9a0', 0.9, { side: DS }), -2.95, 0.88, -1.9));
  // box do chuveiro
  house.add(L.box(0.02, 1.95, 0.7, L.glass('#bfe8f5', 0.28), -1.3, 0.98, -0.42), L.box(0.03, 2.0, 0.03, chrome, -1.3, 1.0, -0.06), L.box(0.03, 0.03, 0.72, chrome, -1.3, 1.98, -0.42));
  house.add(L.tube([[-1.85, 1.2, Z0 + 0.02], [-1.85, 2.05, Z0 + 0.02], [-1.85, 2.12, Z0 + 0.1], [-1.85, 2.1, Z0 + 0.28]], 0.012, chrome, 30, 8), L.cyl(0.085, 0.07, 0.03, chrome, -1.85, 2.08, Z0 + 0.3, 20), L.cyl(0.03, 0.03, 0.03, chrome, -1.85, 1.15, Z0 + 0.03, 14).rotateX(Math.PI / 2), L.cyl(0.05, 0.05, 0.008, chrome, -1.85, 0.006, -0.4, 16));
  house.add(L.box(1.0, 0.012, 0.7, L.mat('#bfd8d2', { roughness: 0.3 }), -1.8, 0.008, -0.42));
  // pia com gabinete, torneira, espelho e luminária
  house.add(L.rbox(0.62, 0.62, 0.4, 0.02, L.mat('#f7f7f4', { roughness: 0.4 }), -0.82, 0.39, Z0 + 0.21), L.rbox(0.66, 0.04, 0.44, 0.012, L.mat('#3c4852', { roughness: 0.25 }), -0.82, 0.72, Z0 + 0.22), L.box(0.02, 0.5, 0.008, chrome, -0.82, 0.4, Z0 + 0.415), L.box(0.62, 0.08, 0.36, L.mat('#2a3239'), -0.82, 0.05, Z0 + 0.2));
  house.add(L.lathe([[0.001, 0.75], [0.1, 0.752], [0.16, 0.8], [0.175, 0.86], [0.165, 0.865], [0.15, 0.81], [0.09, 0.775], [0.001, 0.772]], ceramic, 32).translateX(-0.82).translateZ(Z0 + 0.23));
  house.add(L.tube([[-0.82, 0.74, Z0 + 0.06], [-0.82, 0.98, Z0 + 0.06], [-0.82, 1.02, Z0 + 0.12], [-0.82, 0.97, Z0 + 0.2]], 0.013, chrome, 24, 8), L.cyl(0.02, 0.02, 0.05, chrome, -0.72, 0.77, Z0 + 0.06, 12));
  house.add(L.rbox(0.56, 0.74, 0.03, 0.012, L.mat('#39434d'), -0.82, 1.52, Z0 + 0.02), L.box(0.5, 0.68, 0.005, L.metal('#dfeaf0', { roughness: 0.04, metalness: 1 }), -0.82, 1.52, Z0 + 0.038), L.rbox(0.42, 0.05, 0.06, 0.02, L.glow('#fff1cf', 2.2), -0.82, 1.98, Z0 + 0.05));
  const lamp = new THREE.PointLight(0xffe2b8, 2.2, 5, 1.6); lamp.position.set(-0.8, 1.9, -0.25); house.add(lamp);
  // papel higiênico, toalha, lixeira, escova e tapete
  house.add(L.box(0.14, 0.012, 0.05, chrome, -0.24, 0.66, Z0 + 0.03), L.cyl(0.052, 0.052, 0.1, L.mat('#ffffff', { roughness: 0.95 }), -0.24, 0.62, Z0 + 0.07, 20).rotateZ(Math.PI / 2), L.box(0.1, 0.13, 0.004, L.mat('#ffffff', { roughness: 0.95 }), -0.24, 0.535, Z0 + 0.12));
  house.add(L.torus(0.07, 0.006, chrome, -1.12, 1.25, Z0 + 0.02), L.rbox(0.13, 0.36, 0.03, 0.012, L.mat(PAL.yellow, { roughness: 0.95 }), -1.12, 1.04, Z0 + 0.03));
  house.add(L.cyl(0.085, 0.07, 0.2, L.metal('#c8d0d6', { roughness: 0.3 }), -0.42, 0.1, Z0 + 0.14, 20), L.cyl(0.088, 0.088, 0.015, L.mat('#39434d'), -0.42, 0.207, Z0 + 0.14, 20));
  house.add(L.cyl(0.045, 0.04, 0.12, L.mat('#f1f1ee'), 0.27, 0.06, Z0 + 0.1, 16), L.cyl(0.008, 0.008, 0.36, L.mat('#f1f1ee'), 0.27, 0.26, Z0 + 0.1, 8));
  house.add(L.rbox(0.62, 0.02, 0.4, 0.008, L.mat(PAL.yellow, { roughness: 1 }), -0.62, 0.012, -0.24));
  L.shadows(house);

  /* ================= subsolo, quintal e rua ================= */
  const pvc = L.mat(PAL.pvc, { side: DS, roughness: 0.5 });
  const pipeA = L.cutPipe([[0.23, -0.2], [0.23, -0.5], [0.27, -0.68], [0.42, -0.78], [0.8, -0.83], [3.515, -1.05]], { r: 0.085, mat: pvc, seg: 140 });
  const pipeB = L.cutPipe([[4.385, -1.1], [6.5, -1.38], [8.4, -1.66], [9.44, -1.84]], { r: 0.085, mat: pvc, seg: 120 });
  const waterA = pipeA.waterIn(0.55, pipeW), waterB = pipeB.waterIn(0.55, pipeW);
  const CX = 9.9, CY = -2.25, CR = 0.46, circle = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * L.TAU; circle.push([CX + Math.cos(a) * CR, CY + Math.sin(a) * CR]); }
  const ground = L.group(scene);
  ground.add(pipeA.group, pipeB.group);
  ground.add(L.soilWall({ x0: -6, x1: 14.6, y0: -3.3, y1: -0.2, depth: 6, pipes: [pipeA, pipeB], holes: [[[3.6, -1.25], [4.3, -1.25], [4.3, -0.21], [3.6, -0.21]], circle], rocks: 46, rockSize: 0.07, seed: 4 }));
  // flange laranja no piso e trecho do tubo de queda dentro da laje
  ground.add(L.box(0.012, 0.2, 0.004, pvc, 0.196, -0.1, 0.002), L.box(0.012, 0.2, 0.004, pvc, 0.264, -0.1, 0.002), L.rbox(0.21, 0.035, 0.012, 0.005, L.mat('#c9661f'), 0.23, -0.2, 0.004));
  const flowA = new L.Flow(pipeA.curve, { n: 44, size: 0.014, colors: ['#c9a273', '#e5c79c', '#6d4526'], jitter: [0, 0.016, 0.03], offset: [0, -0.03, -0.04], material: L.flat(0xffffff) });
  const flowB = new L.Flow(pipeB.curve, { n: 50, size: 0.014, colors: ['#c9a273', '#e5c79c', '#6d4526'], jitter: [0, 0.012, 0.02], offset: [0, -0.02, -0.03], material: L.flat(0xffffff) });
  const arrA = new L.Chevrons(pipeA.curve, { n: 9, size: 0.07, offset: [0, 0.22, 0.02] }), arrB = new L.Chevrons(pipeB.curve, { n: 10, size: 0.085, offset: [0, 0.25, 0.02] });
  const hookArrows = new L.Chevrons(pipeA.curve, { n: 7, size: 0.07, offset: [0, 0, 0.02] }); // abertura: o caminho escondido
  ground.add(flowA.mesh, flowB.mesh, arrA.mesh, arrB.mesh, hookArrows.mesh);
  // caixa de inspeção (paredes na frente do solo, interior visível pelo furo)
  const conc = L.mat('#7f878e', { roughness: 0.95 }), concCut = L.mat('#b9bfc4', { roughness: 0.95 });
  const cslab = (x0, x1, y0, y1, z0 = -0.62) => slab(x0, x1, y0, y1, z0, 0.004, conc, concCut);
  ground.add(cslab(3.52, 3.6, -1.33, -0.2), cslab(4.3, 4.38, -1.33, -0.2), cslab(3.52, 4.38, -1.33, -1.25), L.box(0.7, 1.05, 0.06, conc, 3.95, -0.725, -0.62));
  ground.add(L.box(0.7, 0.13, 0.34, conc, 3.95, -1.185, -0.45), L.box(0.7, 0.06, 0.1, conc, 3.95, -1.1, -0.2));
  const boxWater = L.box(0.7, 0.07, 0.19, L.water(pipeW, 0.93), 3.95, -1.115, -0.1, { cast: false }); ground.add(boxWater);
  const stubA = L.cutPipe([[3.6, -1.056], [3.7, -1.064]], { r: 0.085, mat: pvc, seg: 6 }), stubB = L.cutPipe([[4.2, -1.092], [4.3, -1.098]], { r: 0.085, mat: pvc, seg: 6 }); ground.add(stubA.group, stubB.group);
  const lid = L.group(ground, 3.95, -0.06, -0.62); // tampa articulada na borda de trás
  lid.add(L.rbox(0.86, 0.06, 0.7, 0.012, L.mat('#aab1b7', { roughness: 0.9 }), 0, 0.03, 0.33), L.torus(0.05, 0.008, L.metal(PAL.iron), 0, 0.062, 0.33).rotateX(Math.PI / 2));
  // coletor público (perpendicular ao corte) e junção do ramal
  ground.add(L.mesh(new THREE.RingGeometry(CR, CR + 0.07, 56), L.mat('#aab1b7', { roughness: 0.95 }), CX, CY, 0.004, { cast: false }));
  const colIn = L.mesh(new THREE.CylinderGeometry(CR, CR, 6, 48, 1, true), L.mat('#8d959c', { roughness: 0.95, side: THREE.BackSide }), CX, CY, -3, { cast: false }); colIn.rotation.x = Math.PI / 2; ground.add(colIn);
  for (let i = 1; i < 6; i++) ground.add(L.mesh(new THREE.TorusGeometry(CR - 0.004, 0.012, 6, 48), L.mat('#737b82'), CX, CY, -i));
  const hW = -0.24, chord = Math.sqrt(CR * CR - hW * hW), segPts = [], sa0 = Math.PI - Math.asin(hW / CR), sa1 = L.TAU + Math.asin(hW / CR);
  for (let i = 0; i <= 28; i++) { const a = lerp(sa0, sa1, i / 28); segPts.push([Math.cos(a) * CR * 0.995, Math.sin(a) * CR * 0.995]); }
  const colWM = L.water(pipeW, 0.95, { side: DS });
  ground.add(shapeMesh(segPts.map((p) => [CX + p[0], CY + p[1]]), colWM, null, 0.006), L.mesh(new THREE.PlaneGeometry(chord * 2, 6), colWM, CX, CY + hW, -3, { cast: false }).rotateX(-Math.PI / 2));
  const colFlow = new L.Flow([[CX, CY + hW + 0.012, -0.1], [CX, CY + hW + 0.012, -5.9]], { n: 60, size: 0.016, colors: ['#c9a273', '#e5c79c', '#6d4526'], jitter: [chord * 0.8, 0, 0], material: L.flat(0xffffff) }); ground.add(colFlow.mesh);
  ground.add(L.rbox(0.05, 0.25, 0.02, 0.008, L.mat('#8d959c'), 9.5, -1.855, 0.012).rotateZ(-0.25));
  const fall = new L.Flow([[9.44, -1.87, -0.03], [9.56, -1.95, -0.05], [9.64, -2.2, -0.08], [9.68, -2.47, -0.1]], { n: 12, size: 0.012, colors: ['#c9a273', '#8f5f36'], material: L.flat(0xffffff) }); ground.add(fall.mesh);
  // superfície: gramado, árvore, muro, calçada, rua, poste, tampa de bueiro
  const top = L.group(scene);
  top.add(L.box(4.48, 0.14, 6, L.mat(PAL.grass, { roughness: 1 }), 2.76, -0.13, -3), L.box(5.72, 0.14, 3, L.mat(PAL.grass, { roughness: 1 }), -2.86, -0.13, -4.5), L.box(0.12, 0.14, 6, L.mat(PAL.grassDark), -5.94, -0.13, -3));
  top.add(L.scatter(new THREE.ConeGeometry(0.02, 0.09, 4), L.mat(PAL.grassDark, { roughness: 1 }), 520, (i, r, d) => { let x = lerp(0.6, 4.95, r()), z = lerp(-5.9, -0.05, r()); if (x > 3.45 && x < 4.45 && z > -0.75) x -= 1.1; d.position.set(x, -0.03, z); d.rotation.set((r() - 0.5) * 0.5, r() * 6, (r() - 0.5) * 0.5); d.scale.setScalar(0.7 + r() * 0.9); return r() < 0.5 ? PAL.grassDark : '#7fd456'; }, 8));
  top.add(L.scatter(new THREE.SphereGeometry(0.03, 8, 6), L.mat('#ffffff'), 26, (i, r, d) => { d.position.set(lerp(0.7, 3.2, r()), 0.0, lerp(-3.2, -0.3, r())); return [PAL.yellow, '#ff7eb6', '#ffffff'][i % 3]; }, 12));
  const tree = L.group(top, 2.1, -0.06, -2.5);
  tree.add(L.cyl(0.09, 0.15, 1.5, L.mat('#7a5236', { roughness: 0.9 }), 0, 0.75, 0, 10), L.cyl(0.04, 0.07, 0.7, L.mat('#7a5236'), 0.25, 1.5, 0, 8).rotateZ(-0.7));
  [[0, 2.1, 0, 0.85], [0.6, 1.9, 0.2, 0.6], [-0.55, 1.85, -0.1, 0.62], [0.1, 2.65, -0.15, 0.6], [-0.2, 2.0, 0.5, 0.55]].forEach((f, i) => tree.add(L.mesh(new THREE.IcosahedronGeometry(f[3], 1), L.mat(i % 2 ? '#4fae45' : '#3f9a3c', { flatShading: true, roughness: 0.9 }), f[0], f[1], f[2])));
  [[1.0, -2.9, 0.34], [1.45, -3.1, 0.26], [4.4, -4.6, 0.4]].forEach((b) => top.add(L.mesh(new THREE.IcosahedronGeometry(b[2], 1), L.mat('#4aa843', { flatShading: true }), b[0], b[2] * 0.6 - 0.06, b[1])));
  top.add(slab(5.0, 5.16, -0.2, 1.15, -6, 0, L.mat('#efe6d6', { roughness: 0.95 }), brickCut), L.box(0.22, 0.05, 6, L.mat('#b9623f'), 5.08, 1.175, -3));
  const paveT = tileTex('#d9d3c7', '#cfc8ba', 2, 'rgba(90,90,90,.35)'); paveT.repeat.set(1.44 / 0.6, 6 / 0.6);
  top.add(slab(5.16, 6.6, -0.2, -0.04, -6, 0, L.mat(0xffffff, { map: paveT, roughness: 0.9 }), L.mat('#bdb7ab')), slab(6.6, 6.78, -0.2, -0.03, -6, 0, L.mat('#e4e0d8'), L.mat('#bdb7ab')));
  top.add(slab(6.78, 13.5, -0.2, -0.12, -6, 0, L.mat(PAL.asphalt, { roughness: 0.92 }), L.mat('#2a2f36')), slab(13.5, 13.68, -0.2, -0.03, -6, 0, L.mat('#e4e0d8'), L.mat('#bdb7ab')), slab(13.68, 14.6, -0.2, -0.04, -6, 0, L.mat('#d9d3c7'), L.mat('#bdb7ab')));
  for (let i = 0; i < 5; i++) top.add(L.box(0.1, 0.006, 0.7, L.mat(PAL.yellow, { roughness: 0.7 }), 10.15, -0.117, -0.6 - i * 1.25, { cast: false }));
  top.add(L.cyl(0.32, 0.32, 0.012, L.metal('#4a535c', { roughness: 0.6 }), CX, -0.115, -1.9, 28), L.torus(0.33, 0.02, L.metal('#39424a', { roughness: 0.6 }), CX, -0.118, -1.9).rotateX(Math.PI / 2));
  const post = L.group(top, 6.2, -0.04, -2.8);
  post.add(L.cyl(0.045, 0.07, 3.6, L.metal('#4d5964'), 0, 1.8, 0, 12), L.tube([[0, 3.5, 0], [0.15, 3.75, 0], [0.7, 3.85, 0], [1.1, 3.8, 0]], 0.03, L.metal('#4d5964'), 20, 8), L.rbox(0.36, 0.07, 0.16, 0.03, L.metal('#39424a'), 1.2, 3.77, 0), L.rbox(0.28, 0.02, 0.11, 0.008, L.glow('#fff2c4', 2.5), 1.2, 3.73, 0));
  // carro que vem pela rua
  const car = L.group(top, 8.35, -0.12, -5);
  const paint = L.glossy(PAL.red), dark = L.mat('#161b20', { roughness: 0.5 });
  car.add(L.rbox(1.72, 0.5, 4.0, 0.14, paint, 0, 0.55, 0), L.rbox(1.56, 0.5, 2.1, 0.16, paint, 0, 1.0, -0.2), L.rbox(1.6, 0.36, 1.86, 0.1, L.metal('#20303c', { roughness: 0.1 }), 0, 1.02, -0.2), L.rbox(1.38, 0.34, 2.14, 0.1, L.metal('#20303c', { roughness: 0.1 }), 0, 1.02, -0.2));
  car.add(L.rbox(1.76, 0.14, 0.2, 0.05, dark, 0, 0.36, 1.95), L.rbox(1.76, 0.14, 0.2, 0.05, dark, 0, 0.36, -1.95), L.rbox(0.34, 0.12, 0.06, 0.03, L.glow('#fff6d8', 3), -0.6, 0.64, 2.0), L.rbox(0.34, 0.12, 0.06, 0.03, L.glow('#fff6d8', 3), 0.6, 0.64, 2.0), L.rbox(0.9, 0.16, 0.05, 0.02, dark, 0, 0.5, 2.0));
  const wheels = [[-0.84, 1.25], [0.84, 1.25], [-0.84, -1.3], [0.84, -1.3]].map(([x, z]) => { const w = L.group(car, x, 0.33, z); w.add(L.cyl(0.33, 0.33, 0.24, dark, 0, 0, 0, 24).rotateZ(Math.PI / 2), L.cyl(0.17, 0.17, 0.26, L.metal('#c9d2d9'), 0, 0, 0, 10).rotateZ(Math.PI / 2)); return w; });
  L.shadows(top); L.shadows(ground, false, true);

  /* ================= câmera ================= */
  const rail = L.camRail([
    { t: 0, p: [-0.14, 0.86, 0.36], l: [-0.1, 0.17, -0.02] }, { t: 1.35, p: [-0.5, 1.45, 0.92], l: [-0.06, 0.25, -0.01] }, { t: 2.6, p: [-0.95, 1.62, 1.3], l: [0.0, 0.33, 0] }, { t: 3.9, p: [-1.25, 1.35, 1.45], l: [0.04, 0.4, 0] },
    { t: 5.25, p: [-0.3, 1.3, 1.45], l: [0.22, 0.66, 0] }, { t: 6.8, p: [0.1, 0.5, 2.3], l: [0.04, 0.3, 0] },
    { t: 8.6, p: [0.3, 0.6, 1.35], l: [0.25, 0.44, 0] }, { t: 11.2, p: [0.2, 0.5, 1.4], l: [0.12, 0.3, 0] },
    { t: 14.6, p: [-0.04, 0.38, 1.3], l: [-0.03, 0.17, 0] }, { t: 18.6, p: [0.06, 0.3, 1.2], l: [0.06, 0.07, 0] },
    { t: 21.0, p: [0.12, 0.24, 1.35], l: [0.11, -0.03, 0] }, { t: 23.8, p: [0.0, 0.3, 1.05], l: [0.06, 0.06, 0] }, { t: 26.0, p: [0.26, 0.2, 1.15], l: [0.17, 0.0, 0] },
    { t: 27.8, p: [0.2, 0.1, 1.6], l: [0.2, -0.3, 0] },
    { t: 29.6, p: [1.1, 0.25, 4.1], l: [1.1, -0.9, 0] }, { t: 31.6, p: [3.0, 0.3, 4.2], l: [3.3, -0.95, 0] },
    { t: 33.4, p: [4.3, 0.3, 4.3], l: [4.2, -1.0, 0] }, { t: 35.3, p: [7.0, 0.0, 5.2], l: [7.2, -1.35, 0] },
    { t: 36.75, p: [9.2, -0.6, 6.4], l: [9.5, -1.75, 0] }, { t: 37.4, p: [9.8, -1.6, 3.0], l: [9.9, -2.1, 0] }, { t: 37.75, p: [9.9, -2.13, 0.45], l: [9.9, -2.27, -3] }
  ], { fov: 36, smooth: 0.55, drift: 0.01 });
  const q = new THREE.Quaternion(), up = V(0, 1, 0), tv = V(), pv = V();

  function update(t, cam, ui) {
    const look = rail(t, cam);
    rig.focus(look.x, look.y, look.z, t < 28 ? 2.2 : t < 34 ? 5 : 7.5);
    lamp.intensity = 2.2;

    // --- desmontagem: a metade da frente do vaso sai de cena ---
    const ck = sstep(5.55, 6.45, t), co = 1 - sstep(5.85, 6.45, t);
    cover.visible = co > 0.01; cover.position.set(0, 0, L.ease.io(ck) * 0.5);
    coverMats.forEach((m) => { m.opacity = co * (m === coverMats[coverMats.length - 1] ? 0.82 : 1); m.depthWrite = co > 0.6; });

    // --- botão, válvula e caixa ---
    const press = pulse(t, 4.95, 5.7, 0.12, 0.3);
    button.position.y = buttonC.position.y = 0.8 - press * 0.009; rod.position.y = 0.735 - press * 0.009;
    // a mão chega em arco desacelerando, o indicador pousa no botão, a polpa se dobra ao empurrar, e ela recua
    const app = L.ease.out(sstep(4.2, 4.93, t)), ret = L.ease.in(sstep(5.5, 6.15, t));
    hand.visible = t > 4.15 && t < 6.2;
    hand.position.set(0.275 + 0.11 * (1 - app) + 0.05 * ret, 0.812 - press * 0.009 + 0.26 * (1 - app) * (1 - app) + 0.24 * ret, 0.002 + 0.2 * (1 - app) + 0.22 * ret);
    hand.rotation.set(0.5 + 0.25 * (1 - app) + 0.2 * ret, -0.35, 0.22 - 0.08 * app);
    index.piv[1].rotation.x = 0.14 + 0.3 * press; index.piv[2].rotation.x = 0.1 - 0.22 * press; index.piv[0].rotation.x = 0.12 - 0.1 * press;
    const rk = prog(t, 5.05, 5.75); ring.visible = rk > 0 && rk < 1; ring.scale.setScalar(1 + rk * 2.2); ring.material.opacity = 1 - rk;
    valve.position.y = 0.032 * pulse(t, 6.4, 11.3, 0.4, 0.6);
    const tankL = 0.68 - 0.235 * sstep(6.8, 11.0, t) + 0.235 * sstep(21.5, 30, t);
    tankWater.scale.y = tankL - 0.415; floatCup.position.y = Math.max(0.47, tankL - 0.03);
    const pa = pulse(t, 6.8, 15.3, 0.4, 0.8); passW.visible = pa > 0.02; passW.material.opacity = 0.9 * pa; passW.material.transparent = true;
    passFlow.update(t, { speed: 1.4, amount: pa });
    const ta = pulse(t, 8.9, 11.2, 0.3, 0.3); tankArrow.visible = ta > 0.01; tankArrow.material.opacity = ta; tankArrow.position.y = 0.74 - 0.05 * L.fract(t * 1.2);

    // --- bacia e sifão ---
    const jet = Math.max(pulse(t, 7.5, 15.7, 0.7, 0.9), 0.7 * pulse(t, 21.0, 23.8, 0.4, 0.6));
    jets.forEach((f, i) => f.update(t + i * 0.37, { speed: 1.1, amount: jet }));
    const level = WEIR + 0.078 * sstep(11.2, 15.6, t) - 0.138 * sstep(19.0, 20.4, t) + 0.06 * sstep(21.2, 23.7, t);
    levelPlane.constant = level + 0.0006;
    const lv = Math.max(0.132, level), r = rIn(lv);
    [surfA, surfB].forEach((s) => { s.position.y = lv; s.scale.set(SX * r, 1, r); });
    const head = iC + (NT - iC) * (0.45 * sstep(15.4, 18.8, t) + 0.55 * sstep(18.9, 19.5, t)), tail = iC + (NT - iC) * sstep(20.45, 21.3, t);
    const a = Math.floor(tail) - iC, b = Math.floor(head) - iC;
    down.geometry.setDrawRange(a * 6, Math.max(0, b - a) * 6); down.visible = b > a;
    const rush = pulse(t, 18.9, 21.2, 0.25, 0.5);
    let acc = 0; for (let x = 18.9; x < Math.min(t, 21.2); x += 0.02) acc += pulse(x, 18.9, 21.2, 0.25, 0.5) * 0.02; // fase contínua (sem saltos quando a velocidade muda)
    const tw = t * 0.5 + acc * 1.6, ta2 = t * 0.25 + acc * 0.7;
    trapFlow.update(tw, { speed: 1, amount: Math.max(rush, 0.5 * sstep(15.4, 16.5, t) * (1 - sstep(18.9, 19.2, t))), head: lerp(0.5, 1, sstep(15.4, 19.3, t)) });
    trapArrows.update(ta2, { speed: 1, amount: pulse(t, 15.6, 21.0, 0.4, 0.4), head: lerp(0.62, 1, sstep(17.5, 19.3, t)) });

    // --- abertura: queda, respingos e ondas ---
    for (let i = 0; i < 3; i++) {
      const dt = t - DROP[i] - DROP_T, x = AX - 0.035 + i * 0.045, z = -0.028 - (i % 2) * 0.045;
      for (let j = 0; j < 12; j++) { const v = spV[i * 12 + j], on = dt > 0 && dt < 0.5; _dm.position.set(x + v[0] * dt, lv + v[1] * dt - 4.5 * dt * dt, z + v[2] * dt); _dm.scale.setScalar(on && _dm.position.y > lv - 0.005 ? v[3] * (1 - dt) : 0); _dm.updateMatrix(); splash.setMatrixAt(i * 12 + j, _dm.matrix); }
      const rk = clamp01(dt / 0.9), rp = ripples[i]; rp.visible = dt > 0 && dt < 0.9; rp.position.set(x, lv + 0.001, z); rp.scale.set(0.012 + rk * 0.07, 0.012 + rk * 0.07, 1); rp.material.opacity = 0.85 * (1 - rk);
    }
    splash.instanceMatrix.needsUpdate = true;
    hookArrows.update(t, { speed: 0.55, amount: pulse(t, 0.9, 4.5, 0.4, 0.4) });

    // --- cocô ---
    poops.forEach((m, i) => {
      const d = i * 0.07; let vis = true;
      m.scale.setScalar(t > 25 ? 1.5 : 1);
      const fall = clamp01(1 - (t - DROP[i]) / DROP_T), bob = t > DROP[i] + DROP_T ? -0.014 * Math.exp(-(t - DROP[i] - DROP_T) * 4) * Math.sin((t - DROP[i] - DROP_T) * 14) : 0;
      if (t < 19.2 + d) { m.position.set(AX - 0.035 + i * 0.045, lv - 0.006 + Math.sin(t * 2.2 + i * 2) * 0.003 + DROP_H * fall * fall + bob, -0.028 - (i % 2) * 0.045); m.rotation.set(Math.PI / 2 + i * 0.9, 0.3 * i + Math.sin(t * 0.8 + i) * 0.2, Math.PI / 2 + i * 0.4); }
      else if (t < 20.5 + d) {
        const k = prog(t, 19.2 + d, 20.5 + d), dive = clamp01(k / 0.22);
        if (dive < 1) { m.position.set(lerp(AX - 0.035 + i * 0.045, -0.1, dive), lerp(lv, 0.135, dive), lerp(-0.03, 0.012, dive)); }
        else { const u = (k - 0.22) / 0.78; trap.getPointAt(clamp01(u * u * 0.5 + u * 0.5), pv); trap.getTangentAt(clamp01(u), tv); m.position.set(pv.x, pv.y, 0.012); m.quaternion.setFromUnitVectors(up, tv); }
      } else if (t >= 28.3 && t < 37.6) {
        const tt = t - d * 2;
        if (tt < 32.5) { const u = lerp(0.1, 1, prog(tt, 28.3, 32.5)); pipeA.curve.getPointAt(u, pv); pipeA.curve.getTangentAt(u, tv); m.position.set(pv.x, pv.y - 0.02 + Math.sin(t * 5 + i) * 0.004, 0.02); }
        else if (tt < 33.5) { const k = prog(tt, 32.5, 33.5); m.position.set(lerp(3.52, 4.38, k), -1.085 - k * 0.03 + Math.sin(k * 9) * 0.012, 0.02); tv.set(1, 0, 0); }
        else { const u = prog(tt, 33.5, 37.0); pipeB.curve.getPointAt(u, pv); pipeB.curve.getTangentAt(u, tv); m.position.set(pv.x, pv.y - 0.02 + Math.sin(t * 5 + i) * 0.004, 0.02); vis = u < 0.99; }
        m.quaternion.setFromUnitVectors(up, tv);
      } else vis = false;
      m.visible = vis;
    });

    // --- cheiro barrado pelo fecho hídrico ---
    const bk = pulse(t, 24.7, 28.2, 0.35, 0.35), hit = 0.5 + 0.5 * Math.sin(t * 7.5);
    barrier.visible = bk > 0.01; barrier.material.opacity = bk * (0.65 + 0.35 * hit); barrier.scale.set(1, 1 + 0.8 * hit * bk, 1);
    for (let i = 0; i < 12; i++) { const q = pk[i], a = q[0] + t * 1.7 * q[1]; _dm.position.set(lerp(bxB + 0.006, (bxA + bxB) / 2 + 0.02, 0.5 + 0.5 * Math.cos(a)), WEIR + 0.012 + 0.009 * (0.5 + 0.5 * Math.sin(a * 1.3 + q[2] * 6)) - 0.003 * hit, -0.018); _dm.scale.set(0.009 * bk, 0.006 * bk * (0.85 + 0.3 * hit), 0.009 * bk); _dm.updateMatrix(); pocket.setMatrixAt(i, _dm.matrix); }
    pocket.instanceMatrix.needsUpdate = true;
    gas.update(t, { speed: 0.16, amount: pulse(t, 23.9, 28.6, 0.6, 0.6), size: 0.02 + Math.sin(t * 3) * 0.002 });

    // --- tubulação sob a casa, caixa de inspeção, ramal e coletor ---
    waterA.range(0, prog(t, 19.9, 22.2)); waterB.range(0, prog(t, 22.2, 25));
    flowA.update(t, { speed: 0.2, head: prog(t, 19.9, 22.2), amount: 1 });
    flowB.update(t, { speed: 0.16, head: prog(t, 22.2, 25), amount: 1 });
    boxWater.visible = t > 21.8;
    arrA.update(t, { speed: 0.18, amount: pulse(t, 28.5, 33.2, 0.4, 0.5) });
    arrB.update(t, { speed: 0.16, amount: pulse(t, 33.6, 37.5, 0.4, 0.3) });
    lid.rotation.x = -1.15 * L.ease.io(pulse(t, 30.4, 37.6, 0.9, 0.2));
    colFlow.update(t, { speed: 0.12 }); fall.update(t, { speed: 0.9, amount: t > 25 ? 1 : 0 });
    car.position.z = lerp(-5.2, -2.3, L.ease.out(prog(t, 33.2, 37.2))); wheels.forEach((w) => { w.rotation.x = car.position.z / 0.33; });

    // --- rótulos ---
    ui.label('valv', 'Válvula', [0.275, 0.5 + valve.position.y, 0.01], pulse(t, 6.5, 8.7, 0.25, 0.25), { dx: -150, stem: 40 });
    ui.label('seis', '6 litros', [0.275, 0.66, 0.01], pulse(t, 8.9, 11.3, 0.25, 0.25), { cls: 'accent big', dx: 150, stem: 0, dy: -40 });
    ui.label('borda', 'Borda', [0.1, 0.385, 0.01], pulse(t, 11.9, 14.7, 0.25, 0.25), { stem: 60 });
    ui.label('sifao', 'Sifão', [0.162, 0.262, 0.01], pulse(t, 18.0, 21.0, 0.2, 0.3), { cls: 'accent big', stem: 70 });
    ui.label('fecho', 'Água parada', [-0.01, 0.1, 0.01], pulse(t, 22.2, 25.05, 0.25, 0.3), { cls: 'good', dx: 30, stem: 90 });
    ui.label('cheiro', 'Gás do esgoto', [0.245, -0.02, 0.01], pulse(t, 24.5, 27.9, 0.25, 0.3), { cls: 'warn', dx: -170, stem: 0, dy: 30 });
    ui.label('barreira', 'Barreira de água', [(bxA + bxB) / 2, WEIR, 0.01], pulse(t, 25.2, 27.9, 0.25, 0.3), { cls: 'good', dx: -120, stem: 80 });
    ui.label('incl', 'Cano inclinado', [1.9, -0.83, 0.02], pulse(t, 29.3, 31.3, 0.25, 0.25), { stem: 50 });
    ui.label('caixa', 'Caixa de inspeção', [3.95, -0.5, 0.01], pulse(t, 31.5, 33.6, 0.25, 0.25), { cls: 'accent', stem: 0 });
    ui.label('ramal', 'Ramal', [6.6, -1.2, 0.02], pulse(t, 34.4, 36.3, 0.25, 0.25), { stem: 50 });
    ui.label('rede', 'Rede de esgoto', [CX, CY + 0.46, 0.02], pulse(t, 35.9, 37.4, 0.25, 0.2), { cls: 'accent', stem: 40 });
  }
  return { scene, ao: { radius: 0.18 }, envIntensity: 0.6, update };
}
