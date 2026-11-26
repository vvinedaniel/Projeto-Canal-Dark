// Cavalete + HIDRÔMETRO VELOCIMÉTRICO UNIJATO em corte (docs/CIENCIA.md §4e), no nicho da mureta do muro.
// Corpo de latão cortado no plano do eixo (z local = 0): roscas de entrada e saída, filtro (tela) na entrada, bocal que
// lança UM jato tangencial na TURBINA (pás) dentro da câmara; acoplamento magnético pela placa de separação (ímãs),
// trem de ENGRENAGENS na base da relojoaria (vistas pelo corte) e, por cima, o mostrador inteiro: ROLOS NUMÉRICOS (4 pretos
// = m³, 2 vermelhos = frações), dois ponteiros de litros e a estrela indicadora; lente e tampa articulada (aberta).
// Cavalete: subida do ramal, cotovelo, REGISTRO de esfera (alavanca), tubetes com PORCAS e LACRES, saída e descida.
// Caixa de proteção: porta com visor, articulada do lado esquerdo do nicho.
// Os números são genéricos: o hidrômetro novo começa em 0000; o do "presente" mostra uma leitura qualquer.
export function buildMeter(ctx, K, H) {
  const { L, THREE, Lo, St, ghost } = ctx, { G, TM, Merge, vmat, revolve, revolveCaps, planePipe, canvasTex } = K;
  const MP = Lo.HOUSE.meter, root = new THREE.Group();
  const O = new THREE.Vector3(MP.x, MP.y, MP.z);
  const ZC = MP.z;                                         // plano do corte (eixo do hidrômetro e do cavalete)
  const brass = L.metal('#c99a3c', { roughness: 0.3, metalness: 0.85, side: THREE.DoubleSide });
  const brassCut = L.mat('#ecc977', { roughness: 0.45, metalness: 0.35, side: THREE.DoubleSide });
  const plastic = L.glossy('#1f3346', { roughness: 0.35, side: THREE.DoubleSide });
  const plasticCut = L.mat('#3b5266', { roughness: 0.7, side: THREE.DoubleSide });

  /* ---------------- corpo (latão) ---------------- */
  const SC = 1.4;                                          // escala de leitura (o hidrômetro é exagerado ~3× no total)
  const meter = new THREE.Group(); meter.position.copy(O); meter.scale.setScalar(SC); root.add(meter);
  const body = new THREE.Group(); meter.add(body);
  const AX = 0.16, AR = 0.036, BR = 0.022, CH = { r: 0.088, ri: 0.068, y0: -0.078, y1: 0.06, ci0: -0.055, ci1: 0.05, fl: 0.098, top: 0.072 };
  // superfícies (metade de trás)
  body.add(L.mesh(revolve([[0, CH.y0], [CH.r, CH.y0], [CH.r, CH.y1], [CH.fl, CH.y1], [CH.fl, CH.top], [0, CH.top]], 40, 'back'), brass));
  body.add(L.mesh(revolve([[0, CH.ci1], [CH.ri, CH.ci1], [CH.ri, CH.ci0], [0, CH.ci0]], 40, 'back'), brass));
  const thr = (r0, r1, t0, t1, pitch = 0.008) => { const P = []; const n = Math.round(Math.abs(t1 - t0) / pitch); for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n; P.push([i % 2 ? r1 : r0, t]); } return P; };
  [-1, 1].forEach((s) => {
    const prof = [[BR, s * (CH.r - 0.01)], ...thr(AR, AR - 0.004, s * (CH.r - 0.004), s * AX), [BR, s * AX]];
    const g = revolve(s > 0 ? prof : prof.slice().reverse(), 32, 'back'); g.rotateZ(-Math.PI / 2); body.add(L.mesh(g, brass));
  });
  // bocal (cone) na entrada e calha de saída
  { const g = revolve([[BR, -0.098], [0.011, -0.07], [0.011, -0.066], [BR + 0.002, -0.066]], 24, 'back'); g.rotateZ(-Math.PI / 2); body.add(L.mesh(g, brass)); }
  // face de corte (plano z = 0): duas peças (acima e abaixo da cavidade), com o perfil das roscas
  const saw = (x0, x1, y, d, n) => { const P = []; for (let i = 0; i <= n; i++) P.push([x0 + (x1 - x0) * i / n, y + (i % 2 ? -d : 0) * Math.sign(y)]); return P; };
  const nT = 9;
  const topPoly = [[-AX, BR], ...saw(-AX, -CH.r, AR, 0.004, nT), [-CH.r, CH.y1], [-CH.fl, CH.y1], [-CH.fl, CH.top], [CH.fl, CH.top], [CH.fl, CH.y1], [CH.r, CH.y1], ...saw(CH.r, AX, AR, 0.004, nT), [AX, BR - 0.002], [CH.ri, BR - 0.002], [CH.ri, CH.ci1], [-CH.ri, CH.ci1], [-CH.ri, 0.011], [-0.098, BR]];
  const botPoly = [[-AX, -BR], [-0.098, -BR], [-CH.ri, -0.011], [-CH.ri, CH.ci0], [CH.ri, CH.ci0], [CH.ri, -BR + 0.002], [AX, -BR + 0.002], ...saw(AX, CH.r, -AR, 0.004, nT), [CH.r, CH.y0], [-CH.r, CH.y0], ...saw(-CH.r, -AX, -AR, 0.004, nT)];
  const capG = L.BGU.mergeGeometries([G.shape(topPoly).toNonIndexed(), G.shape(botPoly).toNonIndexed()]);
  body.add(L.mesh(capG, brassCut, 0, 0, 0.0004, { cast: false }));
  // seta de sentido do fluxo gravada no corpo (frente do braço de entrada) e pequeno pé de apoio
  { const a = L.arrow(0.06, { width: 0.008, color: '#7a5a1a', thick: 0.002 }); a.material = L.mat('#8a6a24', { roughness: 0.5, metalness: 0.6 }); a.position.set(-0.03, -0.068, 0.002); a.rotation.x = 0; body.add(a); }
  // filtro (tela cônica) na entrada: grade de arame (meia peça)
  const mesh = new Merge();
  { const n = 7; for (let i = 0; i < n; i++) { const a = Math.PI / 2 + Math.PI * i / (n - 1); const p0 = [-AX + 0.004, Math.sin(a) * 0.0 + Math.cos(a) * 0, 0], r0 = BR - 0.002; const y0 = Math.cos(a - Math.PI / 2) * 0, q0 = new THREE.Vector3(-AX + 0.002, r0 * Math.cos(a), -Math.abs(r0 * Math.sin(a))), q1 = new THREE.Vector3(-0.112, 0, -0.0); mesh.rod(q0, q1, 0.0012, '#d7dde2', 4); }
    for (let k = 0; k < 3; k++) { const x = -AX + 0.006 + k * 0.014, r = (BR - 0.002) * (1 - (k * 0.014 + 0.004) / 0.05); mesh.add(G.torus(Math.max(0.003, r), 0.0011, 4, 16, Math.PI), '#d7dde2', TM(x, 0, 0, 0, Math.PI / 2, 0)); } }
  const filterMesh = mesh.mesh(vmat({ roughness: 0.3, metalness: 0.8 })); body.add(filterMesh);

  /* ---------------- turbina (pás) + ímã ---------------- */
  const turb = new THREE.Group(); turb.position.set(0, -0.004, 0); body.add(turb);
  { const tm = new Merge(), NB = 8;
    tm.add(G.cyl(0.011, 0.011, 0.07, 16), '#f3f1ea', TM(0, 0, 0));
    for (let i = 0; i < NB; i++) { const a = (i / NB) * Math.PI * 2; tm.add(G.box(0.046, 0.056, 0.0035), '#f3f1ea', TM(Math.cos(a) * 0.036, -0.004, -Math.sin(a) * 0.036, 0, a, 0)); }
    tm.add(G.cyl(0.062, 0.062, 0.004, 40), '#e7e3d6', TM(0, 0.026, 0));
    tm.add(G.cyl(0.003, 0.003, 0.02, 8), '#9aa3aa', TM(0, -0.044, 0));            // pivô inferior
    tm.add(G.cyl(0.022, 0.022, 0.008, 24, false, 0, Math.PI), '#d8443a', TM(0, 0.034, 0)).add(G.cyl(0.022, 0.022, 0.008, 24, false, Math.PI, Math.PI), '#3a6fd8', TM(0, 0.034, 0));
    const tmesh = tm.mesh(vmat({ roughness: 0.4 })); turb.add(tmesh); }
  // pino-mancal no fundo da câmara
  body.add(L.mesh(G.cyl(0.006, 0.008, 0.014, 12), brass, 0, CH.ci0 + 0.007, 0));

  /* ---------------- relojoaria ---------------- */
  const reg = new THREE.Group(); reg.position.y = 0; meter.add(reg);
  const RY0 = CH.top, RY1 = 0.118, RR = 0.104;
  // carcaça inferior em corte (anel) + face de corte
  { const ring = [[RR - 0.007, RY0], [RR, RY0], [RR + 0.002, RY0 + 0.006], [RR + 0.002, RY1], [RR - 0.007, RY1]];
    reg.add(L.mesh(revolve(ring, 40, 'back'), plastic)); reg.add(L.mesh(revolveCaps(ring), plasticCut, 0, 0, 0.0004, { cast: false }));
    reg.add(L.mesh(revolve([[0, RY0 + 0.001], [RR - 0.007, RY0 + 0.001]], 40, 'back'), L.mat('#b9c1c8', { side: THREE.DoubleSide, roughness: 0.5 }))); // fundo (placa)
    // base do mostrador vista por baixo (metade da frente) — cobre o vão
    const und = new THREE.CircleGeometry(RR - 0.007, 40, 0, Math.PI); und.rotateX(Math.PI / 2); und.translate(0, RY1 - 0.004, 0); reg.add(L.mesh(und, L.mat('#2a3b4c', { side: THREE.DoubleSide }), 0, 0, 0, { cast: false }));
  }
  // parte superior inteira: anel, mostrador, lente, aro
  reg.add(L.mesh(revolve([[RR - 0.007, RY1 - 0.004], [RR + 0.002, RY1 - 0.004], [RR + 0.002, RY1 + 0.012], [RR - 0.004, RY1 + 0.012]], 48, 'full'), plastic));
  reg.add(L.mesh(G.torus(RR - 0.002, 0.0055, 8, 48), plastic, 0, RY1 + 0.012, 0).rotateX(Math.PI / 2));
  // mostrador (com janela dos rolos) — textura procedural
  const DR = RR - 0.007, WIN = { x0: -0.05, x1: 0.042, z0: 0.02, z1: 0.04 };
  const dialTex = canvasTex(512, 512, (g, w, h) => {
    const c = w / 2, s = w / (2 * DR), P = (x, z) => [c + x * s, c + z * s];
    g.fillStyle = '#f4f3ee'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#1d2b3a'; g.lineWidth = 6; g.beginPath(); g.arc(c, c, w / 2 - 8, 0, Math.PI * 2); g.stroke();
    // moldura da janela dos rolos
    const [ax, az] = P(WIN.x0 - 0.004, WIN.z0 - 0.004), [bx2, bz] = P(WIN.x1 + 0.004, WIN.z1 + 0.004); g.fillStyle = '#1d2b3a'; g.fillRect(ax, az, bx2 - ax, bz - az);
    // mostradores de litros (dois) e estrela
    [[-0.048, -0.032], [0.048, -0.032]].forEach(([x, z]) => { const [px, pz] = P(x, z), r = 0.019 * s; g.strokeStyle = '#c23a30'; g.lineWidth = 3; g.beginPath(); g.arc(px, pz, r, 0, Math.PI * 2); g.stroke(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.beginPath(); g.moveTo(px + Math.sin(a) * r * 0.78, pz - Math.cos(a) * r * 0.78); g.lineTo(px + Math.sin(a) * r * 0.98, pz - Math.cos(a) * r * 0.98); g.stroke(); } });
    const [sx, sz] = P(0, -0.058); g.strokeStyle = '#1d2b3a'; g.lineWidth = 2; g.beginPath(); g.arc(sx, sz, 0.012 * s, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#1d2b3a'; g.font = `bold ${Math.round(0.02 * s)}px Montserrat, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const [mx, mz] = P(0, 0.062); g.fillText('m³', mx, mz);
    // marcação do sentido do fluxo
    const [fx, fz] = P(0, -0.03); g.beginPath(); g.moveTo(fx - 0.03 * s, fz); g.lineTo(fx + 0.02 * s, fz); g.lineTo(fx + 0.012 * s, fz - 0.006 * s); g.moveTo(fx + 0.02 * s, fz); g.lineTo(fx + 0.012 * s, fz + 0.006 * s); g.lineWidth = 3; g.stroke();
  });
  dialTex.repeat.set(1 / (2 * DR), 1 / (2 * DR)); dialTex.offset.set(0.5, 0.5);
  { const sh = new THREE.Shape(); sh.absarc(0, 0, DR, 0, Math.PI * 2, false);
    // janela: em coordenadas da forma, y = −z do mundo
    sh.holes.push(new THREE.Path([new THREE.Vector2(WIN.x0, -WIN.z0), new THREE.Vector2(WIN.x1, -WIN.z0), new THREE.Vector2(WIN.x1, -WIN.z1), new THREE.Vector2(WIN.x0, -WIN.z1)]));
    const g = new THREE.ShapeGeometry(sh, 32); const uv = g.attributes.uv, pa = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i), -pa.getY(i) * -1);
    g.rotateX(-Math.PI / 2); g.translate(0, RY1, 0);
    const dm = L.mat(0xffffff, { map: dialTex, roughness: 0.5 }); reg.add(L.mesh(g, dm, 0, 0, 0, { cast: false })); }
  // rolos numéricos: 4 pretos (m³) + 2 vermelhos (frações)
  const digitTex = (bg) => canvasTex(640, 96, (g, w, h) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = '#ffffff'; g.font = 'bold 54px Montserrat, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let d = 0; d < 10; d++) { g.save(); g.translate((d + 0.5) * 64, h / 2); g.rotate(Math.PI / 2); g.fillText(String(d), 0, 2); g.restore(); }
  });
  const texB = digitTex('#15191d'), texR = digitTex('#c22e26');
  const NRO = 6, RW = (WIN.x1 - WIN.x0) / NRO, RRr = 0.0105, RYc = RY1 - RRr + 0.0022, RZc = (WIN.z0 + WIN.z1) / 2;
  const rollers = [];
  for (let i = 0; i < NRO; i++) {
    const red = i >= 4, g = new THREE.CylinderGeometry(RRr, RRr, RW * 0.86, 30, 1, false); g.rotateZ(Math.PI / 2);
    const r = L.mesh(g, L.mat(0xffffff, { map: red ? texR : texB, roughness: 0.45 }), WIN.x0 + RW * (i + 0.5), RYc, RZc, { cast: false });
    reg.add(r); rollers.push(r);
  }
  const rollerAxle = L.mesh(G.cyl(0.002, 0.002, WIN.x1 - WIN.x0 + 0.02, 6), brass, (WIN.x0 + WIN.x1) / 2, RYc, RZc); rollerAxle.rotation.z = Math.PI / 2; reg.add(rollerAxle);
  // ponteiros (litros) e estrela indicadora
  const pointerGeo = (() => { const s = new THREE.Shape(); s.moveTo(-0.0025, -0.004); s.lineTo(0, 0.016); s.lineTo(0.0025, -0.004); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.0012, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return g; })();
  const pointers = [[-0.048, -0.032], [0.048, -0.032]].map(([x, z]) => { const p = L.mesh(pointerGeo, L.mat('#d62f26', { roughness: 0.4 }), x, RY1 + 0.0015, z, { cast: false }); reg.add(p); reg.add(L.mesh(G.cyl(0.003, 0.003, 0.003, 10), L.mat('#2a2a2a'), x, RY1 + 0.002, z)); return p; });
  const star = (() => { const s = new THREE.Shape(); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = i % 2 ? 0.004 : 0.011; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.0012, bevelEnabled: false }); g.rotateX(-Math.PI / 2); return L.mesh(g, L.mat('#1d2b3a'), 0, RY1 + 0.0015, -0.058, { cast: false }); })();
  reg.add(star);
  // lente (vidro) e tampa articulada (aberta, atrás)
  const lens = L.mesh(G.lathe([[DR + 0.002, RY1 + 0.006], [DR - 0.004, RY1 + 0.016], [0.06, RY1 + 0.026], [0, RY1 + 0.029]], 40), L.glass('#e8f6ff', 0.16, { roughness: 0.04, side: THREE.DoubleSide }), 0, 0, 0, { cast: false });
  lens.renderOrder = 6; reg.add(lens);
  const lid = new THREE.Group(); lid.position.set(0, RY1 + 0.014, -RR - 0.006); reg.add(lid);
  { const lm = new Merge(); lm.add(G.cyl(RR + 0.004, RR + 0.004, 0.008, 40), '#24394d', TM(0, 0, RR + 0.006)); for (let i = -2; i <= 2; i++) lm.add(G.box(0.006, 0.004, 0.15), '#2f4a62', TM(i * 0.03, 0.005, RR + 0.006));
    lm.add(G.cyl(0.006, 0.006, 0.05, 10), '#24394d', TM(0, 0, 0, 0, 0, Math.PI / 2)); lid.add(lm.mesh(vmat({ roughness: 0.35 }))); }
  lid.rotation.x = -1.95;   // aberta, encostada para trás
  // engrenagens (eixos perpendiculares ao corte, vistas pela abertura) + rosca sem-fim no eixo do ímã
  const gearGeo = (r, n, hole = 0.6) => { const s = new THREE.Shape(), tooth = (Math.PI * 2) / n; for (let i = 0; i < n; i++) { const a = i * tooth; [[a, r * 0.86], [a + tooth * 0.18, r], [a + tooth * 0.5, r], [a + tooth * 0.68, r * 0.86]].forEach(([b, rr], k) => s[i === 0 && k === 0 ? 'moveTo' : 'lineTo'](Math.cos(b) * rr, Math.sin(b) * rr)); } s.closePath();
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4, c = r * 0.5; const p = new THREE.Path(); p.absarc(Math.cos(a) * c, Math.sin(a) * c, r * 0.2 * hole, 0, Math.PI * 2, true); s.holes.push(p); }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.003, bevelEnabled: false, curveSegments: 6 }); g.translate(0, 0, -0.0015); return g; };
  const GZ = -0.03, gearsDef = [
    { x: 0.022, y: 0.094, r: 0.013, n: 14, ratio: -0.18, c: '#d6b25a' }, { x: 0.047, y: 0.097, r: 0.017, n: 18, ratio: 0.12, c: '#e5e0d2' },
    { x: 0.074, y: 0.095, r: 0.011, n: 12, ratio: -0.19, c: '#d6b25a' }, { x: -0.024, y: 0.095, r: 0.015, n: 16, ratio: 0.16, c: '#e5e0d2' },
    { x: -0.056, y: 0.097, r: 0.017, n: 18, ratio: -0.14, c: '#d6b25a' }, { x: -0.08, y: 0.094, r: 0.01, n: 10, ratio: 0.24, c: '#e5e0d2' }];
  const gears = gearsDef.map((d) => { const gm = L.mesh(gearGeo(d.r, d.n), L.metal(d.c, { roughness: 0.35, metalness: d.c === '#d6b25a' ? 0.8 : 0.1 }), d.x, d.y, GZ, { cast: false }); reg.add(gm); reg.add(L.mesh(G.cyl(0.0018, 0.0018, 0.03, 6), brass, d.x, d.y, GZ - 0.005).rotateX(Math.PI / 2)); gm.userData = d; return gm; });
  // ímã acionado (em cima da placa) + eixo + sem-fim
  const drive = new THREE.Group(); drive.position.set(0, RY0 + 0.001, 0); reg.add(drive);
  { const dm = new Merge(); dm.add(G.cyl(0.02, 0.02, 0.007, 24, false, 0, Math.PI), '#3a6fd8', TM(0, 0.004, 0)).add(G.cyl(0.02, 0.02, 0.007, 24, false, Math.PI, Math.PI), '#d8443a', TM(0, 0.004, 0));
    dm.add(G.cyl(0.0025, 0.0025, 0.04, 8), '#9aa3aa', TM(0, 0.026, 0));
    for (let i = 0; i < 6; i++) dm.add(G.torus(0.0055, 0.0016, 5, 14), '#c99a3c', TM(0, 0.014 + i * 0.0032, 0, Math.PI / 2 + 0.25, 0, 0));
    drive.add(dm.mesh(vmat({ roughness: 0.35, metalness: 0.5 }))); }
  // placa de separação (câmara seca) destacada por uma linha de vedação
  reg.add(L.mesh(G.torus(0.09, 0.0025, 6, 40, Math.PI), L.mat('#111518'), 0, RY0 + 0.0015, 0).rotateX(Math.PI / 2).rotateZ(Math.PI));

  /* ---------------- porcas dos tubetes, tubetes e lacres ---------------- */
  const nuts = [-1, 1].map((s) => { const n = L.mesh(G.cyl(0.047, 0.047, 0.04, 6), L.metal('#c99a3c', { roughness: 0.28 }), s * 0.178, 0, 0); n.rotation.z = Math.PI / 2; meter.add(n); return n; });
  const tubetes = new Merge(); [-1, 1].forEach((s) => tubetes.add(G.cyl(0.031, 0.031, 0.045, 18), '#c99a3c', TM(s * 0.215, 0, 0, 0, 0, Math.PI / 2)));
  meter.add(tubetes.mesh(vmat({ roughness: 0.3, metalness: 0.85 })));
  const seals = [-1, 1].map((s) => {
    const g = new THREE.Group(); g.position.set(s * 0.155, 0.0, 0.0); meter.add(g);
    const wire = L.tube(L.curve([[s * 0.03, 0.04, 0.0], [s * 0.012, 0.05, 0.02], [-s * 0.01, 0.042, 0.03], [-s * 0.004, 0.0, 0.04], [0, -0.04, 0.046]]), 0.0014, L.metal('#9aa3aa', { roughness: 0.4 }), 40, 5);
    const tag = L.mesh(G.rbox(0.026, 0.034, 0.008, 0.004), L.mat('#f2c230', { roughness: 0.4 }), 0, -0.058, 0.046); tag.add(L.mesh(G.cyl(0.006, 0.006, 0.002, 12), L.mat('#c9921a'), 0, 0, 0.005).rotateX(Math.PI / 2));
    g.add(wire, tag); return g;
  });

  /* ---------------- cavalete: canos (corte), cotovelos, registro ---------------- */
  const PVC = L.mat('#2f6fc0', { roughness: 0.45, side: THREE.DoubleSide }), PVCcut = L.mat('#5d93d6', { roughness: 0.6, side: THREE.DoubleSide });
  const NF = H.NICHE.y0, XIN = 2.40, XOUT = 3.50, TE = 0.235 * SC;
  const pin = planePipe([[XIN, NF - 0.02, ZC], [XIN, MP.y, ZC], [MP.x - TE, MP.y, ZC]], { r: 0.03, mat: PVC, cutMat: PVCcut, water: '#3f9be0', plane: 'z', bend: 0.07 });
  const pout = planePipe([[MP.x + TE, MP.y, ZC], [XOUT, MP.y, ZC], [XOUT, NF - 0.02, ZC]], { r: 0.03, mat: PVC, cutMat: PVCcut, water: '#3f9be0', plane: 'z', bend: 0.07 });
  const cav = new THREE.Group(); cav.add(pin.group, pout.group); root.add(cav);
  // registro de esfera (corpo + alavanca)
  const valve = new THREE.Group(); valve.position.set(2.56, MP.y, ZC); cav.add(valve);
  { const vm = new Merge(); vm.add(G.cyl(0.04, 0.04, 0.06, 6), '#c99a3c', TM(0, 0, 0, 0, 0, Math.PI / 2)).add(G.cyl(0.036, 0.036, 0.03, 6), '#c99a3c', TM(-0.05, 0, 0, 0, 0, Math.PI / 2)).add(G.cyl(0.036, 0.036, 0.03, 6), '#c99a3c', TM(0.05, 0, 0, 0, 0, Math.PI / 2));
    vm.add(G.sph(0.042, 18, 12), '#c99a3c', TM(0, 0, 0, 0, 0, 0, 1, 0.9, 0.9)).add(G.cyl(0.012, 0.014, 0.05, 12), '#c99a3c', TM(0, 0.05, 0));
    valve.add(vm.mesh(vmat({ roughness: 0.3, metalness: 0.85 }))); }
  const lever = new THREE.Group(); lever.position.set(0, 0.078, 0); valve.add(lever);
  { const lm = new Merge(); lm.add(G.rbox(0.15, 0.012, 0.03, 0.005), '#d8312a', TM(0.06, 0, 0)).add(G.cyl(0.016, 0.016, 0.014, 12), '#9aa3aa', TM(0, 0, 0)); lever.add(lm.mesh(vmat({ roughness: 0.4 }))); }
  // abraçadeiras/suportes do cavalete no fundo do nicho
  const clamp = new Merge(); [XIN, XOUT].forEach((x) => { clamp.add(G.box(0.08, 0.02, 0.06), '#7d868d', TM(x, 0.55, ZC - 0.06)); clamp.add(G.torus(0.034, 0.006, 6, 18, Math.PI), '#9aa3aa', TM(x, 0.55, ZC - 0.03, Math.PI / 2, 0, 0)); });
  cav.add(clamp.mesh(vmat({ roughness: 0.4, metalness: 0.6 })));

  /* ---------------- caixa de proteção (forro do nicho) e porta com visor ---------------- */
  const N = H.NICHE, box = new THREE.Group(); root.add(box);
  { const bm = new Merge(), c = '#6f7d87', t = 0.012, w = N.x1 - N.x0, h = N.y1 - N.y0, d = N.z1 - N.z0, xc = (N.x0 + N.x1) / 2, yc = (N.y0 + N.y1) / 2, zc = (N.z0 + N.z1) / 2;
    bm.add(G.box(w, t, d), c, TM(xc, N.y0 + t / 2, zc)).add(G.box(w, t, d), c, TM(xc, N.y1 - t / 2, zc)).add(G.box(t, h, d), c, TM(N.x0 + t / 2, yc, zc)).add(G.box(t, h, d), c, TM(N.x1 - t / 2, yc, zc)).add(G.box(w, h, t), '#5d6a73', TM(xc, yc, N.z0 + t / 2));
    // moldura frontal
    bm.add(G.box(w + 0.06, 0.03, 0.02), '#4d5a63', TM(xc, N.y1 + 0.015, N.z1)).add(G.box(w + 0.06, 0.03, 0.02), '#4d5a63', TM(xc, N.y0 - 0.015, N.z1)).add(G.box(0.03, h + 0.06, 0.02), '#4d5a63', TM(N.x0 - 0.015, yc, N.z1)).add(G.box(0.03, h + 0.06, 0.02), '#4d5a63', TM(N.x1 + 0.015, yc, N.z1));
    box.add(bm.mesh(vmat({ roughness: 0.55, metalness: 0.3 }))); }
  const door = new THREE.Group(); door.position.set(N.x0 - 0.02, (N.y0 + N.y1) / 2, N.z1 + 0.012); box.add(door);
  { const dm = new Merge(), w = N.x1 - N.x0 + 0.03, h = N.y1 - N.y0 + 0.03;
    dm.add(G.box(w, h, 0.016), '#3d5566', TM(w / 2, 0, 0));
    dm.add(G.box(w * 0.36, h * 0.18, 0.004), '#9fd3ea', TM(w * 0.55, h * 0.12, 0.01));   // visor de leitura
    dm.add(G.box(w * 0.4, h * 0.22, 0.006), '#2c3e4b', TM(w * 0.55, h * 0.12, 0.006));
    dm.add(G.box(0.05, 0.08, 0.02), '#9aa3aa', TM(w - 0.06, -0.05, 0.015));               // trinco
    for (let i = 0; i < 3; i++) dm.add(G.box(w * 0.8, 0.006, 0.006), '#4b6576', TM(w / 2, -h * 0.25 - i * 0.05, 0.01));
    [h * 0.35, -h * 0.35].forEach((y) => dm.add(G.cyl(0.01, 0.01, 0.06, 8), '#9aa3aa', TM(0, y, 0)));
    door.add(dm.mesh(vmat({ roughness: 0.45, metalness: 0.35 }))); }

  /* ---------------- água dentro do hidrômetro (face da cavidade) e partículas ---------------- */
  const cav0 = [[-AX, BR], [-0.098, BR], [-CH.ri, 0.011], [-CH.ri, CH.ci1], [CH.ri, CH.ci1], [CH.ri, BR - 0.002], [AX, BR - 0.002], [AX, -BR + 0.002], [CH.ri, -BR + 0.002], [CH.ri, CH.ci0], [-CH.ri, CH.ci0], [-CH.ri, -0.011], [-0.098, -BR], [-AX, -BR]];
  const wM = L.water('#3f9be0', 0.42, { side: THREE.DoubleSide, depthWrite: false });
  const wFace = L.mesh(G.shape(cav0), wM, 0, 0, 0.0008, { cast: false }); wFace.renderOrder = 3; body.add(wFace);
  const wBack = L.mesh(revolve([[0, CH.ci1 - 0.001], [CH.ri - 0.001, CH.ci1 - 0.001], [CH.ri - 0.001, CH.ci0 + 0.001], [0, CH.ci0 + 0.001]], 30, 'back'), L.water('#3f9be0', 0.35, { side: THREE.BackSide, depthWrite: false }), 0, 0, 0, { cast: false }); body.add(wBack);
  const jetPath = (() => { const P = [[-0.24, 0.0, -0.006], [-0.13, 0.0, -0.006], [-0.085, 0.0, -0.008], [-0.06, -0.004, -0.016]]; for (let i = 1; i <= 8; i++) { const a = Math.PI + (i / 8) * Math.PI * 0.95; P.push([Math.cos(a) * 0.052, -0.004 + i * 0.002, Math.sin(a) * 0.05 - 0.004]); } P.push([0.062, 0.012, -0.006], [0.12, 0.004, -0.006], [0.24, 0.0, -0.006]); return P; })();
  const flow = new L.Flow(L.curve(jetPath, false, 0.5), { n: 46, size: 0.0042, colors: ['#e9f8ff', '#bfe9fb', '#ffffff'], jitter: [0.004, 0.006, 0.004], material: L.flat(0xffffff), seed: 7 });
  meter.add(flow.mesh);

  L.shadows(root, false, true); door.traverse((o) => { if (o.isMesh) o.castShadow = true; }); flow.mesh.castShadow = false;
  const detail = [...gears, ...rollers, ...pointers, star, drive, filterMesh, flow.mesh, ...seals, turb];
  [wFace, wBack, lens].forEach((o) => { o.castShadow = false; });

  /* ---------------- planta (contorno) antes da instalação ---------------- */
  const gsrc = new THREE.Group();
  { const gm = new THREE.Group(); gm.position.copy(O); gm.scale.setScalar(SC); gsrc.add(gm);
    gm.add(L.mesh(revolve([[0, CH.y0], [CH.r, CH.y0], [CH.r, CH.y1], [CH.fl, CH.y1], [CH.fl, CH.top], [0, CH.top]], 16, 'full'), brass));
    gm.add(L.mesh(G.cyl(RR, RR, RY1 - RY0 + 0.012, 16), brass, 0, (RY0 + RY1) / 2, 0));
    const arm = L.mesh(G.cyl(AR, AR, 2 * AX + 0.1, 12), brass); arm.rotation.z = Math.PI / 2; gm.add(arm);
    const pp = (a, b2) => { const d = new THREE.Vector3(...b2).sub(new THREE.Vector3(...a)); const c = L.mesh(G.cyl(0.03, 0.03, d.length(), 10), brass); c.position.set((a[0] + b2[0]) / 2, (a[1] + b2[1]) / 2, (a[2] + b2[2]) / 2); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); gsrc.add(c); };
    pp([XIN, NF, ZC], [XIN, MP.y, ZC]); pp([XIN, MP.y, ZC], [MP.x - TE, MP.y, ZC]); pp([MP.x + TE, MP.y, ZC], [XOUT, MP.y, ZC]); pp([XOUT, MP.y, ZC], [XOUT, NF, ZC]);
    const dd = L.mesh(G.box(N.x1 - N.x0, N.y1 - N.y0, 0.01), brass, (N.x0 + N.x1) / 2, (N.y0 + N.y1) / 2, N.z1); gsrc.add(dd); }
  const plan = ghost.of(gsrc, 25); root.add(plan);

  /* ---------------- leitura (função pura de t) ---------------- */
  const RATE = 6.0;                    // L/s "genérico" (só para os rolos andarem de forma legível)
  const PRESENT_V = 347612;            // leitura qualquer do "presente" (litros)
  function runIntegral(t) {            // ∫ run.meter dt desde a instalação (passo de 1/30 s)
    if (t < St.REWIND[0]) return t;
    let s = 0; const dt = 1 / 30;
    for (let x = 93.2; x < t; x += dt) s += St.state(Math.min(x + dt / 2, t)).run.meter * Math.min(dt, t - x);
    return s;
  }
  const _q = new THREE.Vector3();
  function update(t, S, cam) {
    const near = cam.position.distanceTo(O) < 4.5; detail.forEach((o) => { o.visible = near; });
    const k = S.build.meter, present = S.present;
    const built = present ? 1 : k;
    plan.visible = !present && k < 0.02;
    const show = built > 0.001;
    root.children.forEach((c) => { if (c !== plan) c.visible = show; });
    if (!show) return;
    const e = (a, b) => L.ease.io(L.clamp01((built - a) / (b - a)));
    // cavalete e registro descem; hidrômetro chega em arco; porcas giram; lacres; alavanca abre; caixa
    const kc = e(0, 0.3); cav.position.y = 0.6 * (1 - kc); cav.visible = kc > 0.001;
    const km = e(0.25, 0.6); meter.visible = km > 0.001; meter.position.set(O.x, O.y + 0.45 * (1 - km) * (1 - km), O.z + 0.7 * (1 - km)); meter.rotation.set(0, 0, 0.5 * (1 - km));
    const kn = e(0.55, 0.72); nuts.forEach((n, i) => { n.rotation.x = (1 - kn) * 8 * (i ? 1 : -1); n.position.x = (i ? 1 : -1) * (0.178 + 0.03 * (1 - kn)); });
    const ks = L.ease.back(L.clamp01((built - 0.66) / 0.12)); seals.forEach((s) => { s.visible = near && ks > 0.01; s.scale.setScalar(Math.max(1e-3, ks)); });
    lever.rotation.y = -Math.PI / 2 * (1 - e(0.8, 0.92));
    const kb = L.ease.back(L.clamp01((built - 0.84) / 0.16)); box.visible = kb > 0.01; box.scale.setScalar(1); door.rotation.y = -1.0 - 0.9 * kb; door.scale.setScalar(Math.max(1e-3, kb)); door.visible = kb > 0.01;
    // água: o ramal enche até o cavalete (fração alta de S.water.ramal)
    const wr = present ? 1 : S.water.ramal;
    const fIn = L.clamp01((wr - 0.82) / 0.08), fMet = L.clamp01((wr - 0.9) / 0.05), fOut = L.clamp01((wr - 0.95) / 0.05);
    pin.water.range(0, fIn); pout.water.range(0, fOut);
    wM.opacity = 0.42 * fMet; wFace.visible = wBack.visible = fMet > 0.01; wBack.material.opacity = 0.35 * fMet;
    // funcionamento
    const run = present ? 1 : S.run.meter, I = runIntegral(t);
    turb.rotation.y = -I * 9.0;
    drive.rotation.y = -I * 9.0;
    gears.forEach((g) => { g.rotation.z = I * 9.0 * g.userData.ratio * 6; });
    const V = present ? PRESENT_V + RATE * t : RATE * Math.max(0, I);
    // rolos: [0..3] pretos (milhares, centenas, dezenas, unidades de m³), [4] centenas de litros, [5] dezenas de litros (contínuo)
    const pos = (p) => { const v = V / Math.pow(10, p), lower = (V / Math.pow(10, p - 1)) % 10; return Math.floor(v) + Math.max(0, lower - 9); };
    const P = [pos(6), pos(5), pos(4), pos(3), pos(2), V / 10];
    rollers.forEach((r, i) => { r.rotation.x = -((P[i] % 10) / 10) * Math.PI * 2 + ROLL0; });
    pointers[0].rotation.y = -((V % 10) / 10) * Math.PI * 2; pointers[1].rotation.y = -((V % 1)) * Math.PI * 2;
    star.rotation.y = -I * 4.0;
    if (near) flow.update(t, { speed: 0.55, amount: run * fMet });
  }
  const ROLL0 = 0;  // ajuste da fase do dígito sob a janela (calibrado no teste)
  // curvas para o raciocínio do fluxo (setas)
  return { root, update, pin, pout, meterGroup: meter, ZC, XIN, XOUT, NF, setRoll0: (v) => {} };
}
