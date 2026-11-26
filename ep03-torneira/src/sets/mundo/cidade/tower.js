// RESERVATÓRIO ELEVADO (Lo.TOWER) na borda do platô, acima da cidade.
// Estrutura metálica: 4 sapatas na encosta (cada uma na cota do chão), 4 pernas tubulares inclinadas com anéis e
// contraventamento em X, viga-anel sob a taça; TAÇA cilíndrica de aço EM CORTE (metade da frente removida, plano z = TOWER.z)
// com fundo, parede com espessura, teto cônico, água com volume (superfície + face no corte) e RÉGUA DE NÍVEL no corte;
// tubo de entrada subindo pelo eixo (com curva de descarga dentro da taça), tubo de saída por gravidade até P.towerOut,
// extravasor, balcão com guarda-corpo, escada marinheiro com gaiola, escada do teto, para-raios e luz de balizamento.
// Obra: S.build.tower (fundação → pernas → contraventamento → taça → tubos → acessórios). Água: S.water.tower.
export function buildTower(ctx) {
  const { L, THREE, Lo, K, ghost } = ctx, { G, TM, Merge, vmat } = K;
  const T = Lo.TOWER, P = Lo.P, X = T.x, Z = T.z, R = T.tank.r, Y0 = T.tank.y0, Y1 = T.tank.y1, WT = 0.16, DS = THREE.DoubleSide;
  const root = new THREE.Group();
  const steel = vmat({ roughness: 0.45, metalness: 0.45 });
  const concrete = L.mat('#bfc4c7', { roughness: 0.9 });
  const sub = (k, a, b) => L.clamp01((k - a) / (b - a));
  const STEEL = '#e9eef2', DARK = '#7d8a96', BAND = '#2f7fd6';

  /* ---------- geometria das pernas ---------- */
  const RB = 3.6, RT = 3.0, YT = Y0 - 0.5;            // raio na base e no topo das pernas
  const legs = [0, 1, 2, 3].map((i) => {
    const a = Math.PI / 4 + (i * Math.PI) / 2, ca = Math.cos(a), sa = Math.sin(a);
    const bx = X + RB * ca, bz = Z + RB * sa, by = Lo.G(bx, bz) + 0.55;
    return { a, base: new THREE.Vector3(bx, by, bz), top: new THREE.Vector3(X + RT * ca, YT, Z + RT * sa) };
  });
  const legPt = (l, y) => l.base.clone().lerp(l.top, (y - l.base.y) / (l.top.y - l.base.y));

  /* ---------- fundação: sapatas e blocos (cada um na cota do chão da encosta) ---------- */
  const fnd = new Merge();
  legs.forEach((l) => {
    const g = Lo.G(l.base.x, l.base.z);
    fnd.add(G.box(1.8, 0.7, 1.8), '#b3b8bc', TM(l.base.x, g - 0.2, l.base.z)).add(G.box(1.0, l.base.y - g + 0.1, 1.0), '#c4c8cb', TM(l.base.x, (l.base.y + g) / 2 - 0.05 + 0.1, l.base.z));
    fnd.add(G.box(0.7, 0.04, 0.7), '#6f7a84', TM(l.base.x, l.base.y + 0.02, l.base.z));
    for (const [dx, dz] of [[-0.26, -0.26], [0.26, -0.26], [0.26, 0.26], [-0.26, 0.26]]) fnd.add(G.cyl(0.03, 0.03, 0.12, 6), '#4a535b', TM(l.base.x + dx, l.base.y + 0.08, l.base.z + dz));
  });
  // bloco do pé do tubo de entrada/saída (caixa de registros) no centro
  const gC = Lo.G(X, Z);
  fnd.add(G.box(2.6, 1.0, 3.6), '#bfc4c7', TM(X + 0.25, gC - 0.3, Z + 0.9));
  const foundation = L.mesh(fnd.geo(), vmat({ roughness: 0.9 })); L.shadows(foundation); root.add(foundation);

  /* ---------- pernas (uma malha por perna: crescem a partir da base) ---------- */
  const legMeshes = legs.map((l) => {
    const len = l.base.distanceTo(l.top), geo = new THREE.CylinderGeometry(0.24, 0.26, len, 14); geo.translate(0, len / 2, 0);
    const m = L.mesh(geo, L.mat(STEEL, { roughness: 0.4, metalness: 0.5 }), l.base.x, l.base.y, l.base.z);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), l.top.clone().sub(l.base).normalize()); root.add(m); return m;
  });
  /* ---------- anéis e contraventamento (3 painéis, cada um revelado quando as pernas passam por ele) ---------- */
  const LEV = [15.2, 19.0, 22.6, YT];
  const bracing = [];
  for (let k = 0; k < LEV.length - 1; k++) {
    const m = new Merge(), ya = LEV[k], yb = LEV[k + 1];
    for (let i = 0; i < 4; i++) {
      const la = legs[i], lb = legs[(i + 1) % 4], a0 = legPt(la, ya), b0 = legPt(lb, ya), a1 = legPt(la, yb), b1 = legPt(lb, yb);
      m.rod(a0, b0, 0.1, DARK, 8);                       // anel (viga horizontal)
      m.rod(a0, b1, 0.055, DARK, 6).rod(b0, a1, 0.055, DARK, 6);   // X
      const c = a0.clone().lerp(b1, 0.5); m.add(G.box(0.22, 0.22, 0.05), DARK, TM(c.x, c.y, c.z, 0, -Math.atan2(b0.z - a0.z, b0.x - a0.x), 0));
    }
    const mesh = m.mesh(steel); L.shadows(mesh); root.add(mesh); bracing.push({ mesh, y: yb });
  }
  // viga-anel sob a taça e mãos-francesas
  const ring = new Merge();
  ring.add(G.torus(RT, 0.18, 8, 40), DARK, TM(X, YT, Z, Math.PI / 2, 0, 0));
  legs.forEach((l) => { ring.rod(l.top, [X + (l.top.x - X) * 1.32, Y0 + 0.02, Z + (l.top.z - Z) * 1.32], 0.08, DARK, 6); ring.rod(l.top, [l.top.x, Y0 + 0.02, l.top.z], 0.14, DARK, 8); });
  const ringMesh = ring.mesh(steel); L.shadows(ringMesh); root.add(ringMesh);

  /* ---------- TAÇA em corte ---------- */
  const tank = new THREE.Group(); tank.position.set(X, 0, Z); root.add(tank);
  const shellM = L.mat('#eef2f5', { roughness: 0.5, metalness: 0.35, side: DS }), innerM = L.mat('#c5d0d8', { roughness: 0.7, metalness: 0.2, side: DS });
  const cutM = L.mat('#8e9aa4', { roughness: 0.6, metalness: 0.3, side: DS }), bandM = L.mat(BAND, { roughness: 0.45, metalness: 0.3, side: DS });
  const halfCyl = (r, h, m, y, a0 = Math.PI / 2, seg = 40) => { const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true, a0, Math.PI); return L.mesh(g, m, 0, y + h / 2, 0); };
  const HT = Y1 - Y0;
  const shell = new THREE.Group(); tank.add(shell);
  shell.add(halfCyl(R, HT, shellM, Y0), halfCyl(R - WT, HT, innerM, Y0));
  shell.add(halfCyl(R + 0.012, 0.7, bandM, Y0 + HT * 0.62));               // faixa azul
  [-1, 1].forEach((s) => { const f = L.mesh(new THREE.PlaneGeometry(WT, HT), cutM, s * (R - WT / 2), Y0 + HT / 2, 0.002); shell.add(f); });   // face de corte da parede
  // fundo (laje de aço sobre vigas) em meia-lua com face no corte
  const bottom = new THREE.Group(); tank.add(bottom);
  { const g = new THREE.CylinderGeometry(R, R, 0.3, 40, 1, false, Math.PI / 2, Math.PI); const m = L.mesh(g, [shellM, innerM, innerM], 0, Y0 + 0.15, 0); bottom.add(m);
    bottom.add(L.mesh(new THREE.PlaneGeometry(2 * R, 0.3), cutM, 0, Y0 + 0.15, 0.002)); }
  // teto cônico em meia-casca + lanternim
  const roof = new THREE.Group(); tank.add(roof);
  { const rh = 1.25, g = new THREE.ConeGeometry(R + 0.25, rh, 40, 1, true, Math.PI / 2, Math.PI); roof.add(L.mesh(g, shellM, 0, Y1 + rh / 2, 0));
    roof.add(L.mesh(new THREE.ConeGeometry(R + 0.07, rh * (R + 0.07) / (R + 0.25), 40, 1, true, Math.PI / 2, Math.PI), innerM, 0, Y1 + rh / 2 - 0.08, 0));
    { const o = [[-R - 0.25, 0], [R + 0.25, 0], [0, rh]], k = 0.1, i = [[-R - 0.25 + 0.45, 0.02], [R + 0.25 - 0.45, 0.02], [0, rh - k * 1.6]];
      const rim = L.mesh(G.extrude(o, 0.02, [i]), cutM, 0, Y1, -0.01, { cast: false }); roof.add(rim); }
    const m = new Merge();
    m.add(G.cyl(0.45, 0.5, 0.5, 16), '#d8dee3', TM(0, Y1 + rh + 0.15, -0.02)).add(G.cone(0.6, 0.35, 16), '#9aa5ae', TM(0, Y1 + rh + 0.55, -0.02));
    m.add(G.cyl(0.035, 0.05, 2.6, 6), '#c9ced2', TM(0, Y1 + rh + 1.9, -0.02)).add(G.cone(0.08, 0.35, 6), '#d9b25a', TM(0, Y1 + rh + 3.35, -0.02));   // para-raios
    m.add(G.cyl(0.015, 0.015, Y1 + rh - 11.8, 4), '#b5763e', TM(-R - 0.05, (Y1 + rh + 11.8) / 2 - 0.6, -0.4));                                       // cabo de descida
    roof.add(m.mesh(steel));
    roof.add(L.mesh(new THREE.SphereGeometry(0.13, 10, 8), L.glow('#ff3b30', 2.2), 0.3, Y1 + rh + 0.55, -0.02, { cast: false }));            // luz de balizamento
  }
  L.shadows(tank); tank.traverse((o) => { if (o.isMesh && o.material === cutM) o.castShadow = false; });

  /* ---------- água na taça (volume com face no corte) ---------- */
  const wM = L.water(Lo.WATER.treated, 0.84, { side: DS }); wM.depthWrite = false;
  const water = new THREE.Group(); water.position.set(X, Y0 + 0.3, Z); root.add(water);
  { const ri = R - WT - 0.01, side = new THREE.CylinderGeometry(ri, ri, 1, 40, 1, true, Math.PI / 2, Math.PI); side.translate(0, 0.5, 0);
    const top = new THREE.CircleGeometry(ri, 40, 0, Math.PI); top.rotateX(-Math.PI / 2); top.translate(0, 1, 0);
    const face = new THREE.PlaneGeometry(2 * ri, 1); face.translate(0, 0.5, 0.006);
    [side, top, face].forEach((g) => water.add(L.mesh(g, wM, 0, 0, 0, { cast: false })));
  }
  water.renderOrder = 4;
  // régua de nível no corte (lado direito, de frente para a câmera): faixa branca com marcas a cada 0,5 m
  const ruler = new THREE.Group(); root.add(ruler);
  { const m = new Merge(), rx = X + R - WT - 0.35, y0 = Y0 + 0.3, y1 = Y1 - 0.2;
    m.add(G.box(0.34, y1 - y0, 0.03), '#f6f7f2', TM(rx, (y0 + y1) / 2, Z + 0.02));
    for (let y = y0, i = 0; y <= y1 + 1e-6; y += 0.25, i++) m.add(G.box(i % 2 ? 0.12 : 0.26, 0.03, 0.02), '#1d2630', TM(rx - 0.17 + (i % 2 ? 0.06 : 0.13), y, Z + 0.045));
    m.add(G.box(0.4, 0.04, 0.04), '#c8333a', TM(rx, y1, Z + 0.04));                    // marca do nível máximo
    ruler.add(L.mesh(m.geo(), vmat({ roughness: 0.6 }), 0, 0, 0, { cast: false }));
    const mk = new THREE.Shape(); mk.moveTo(0, 0); mk.lineTo(-0.28, 0.16); mk.lineTo(-0.28, -0.16); mk.closePath();
    ruler.marker = L.mesh(new THREE.ExtrudeGeometry(mk, { depth: 0.05, bevelEnabled: false }), L.glow('#ffd23f', 2.0), rx - 0.2, y0, Z + 0.05, { cast: false });
    ruler.add(ruler.marker); ruler.rx = rx; }

  /* ---------- tubos: entrada (sobe pelo eixo), saída por gravidade, extravasor ---------- */
  const pipeM = L.mat(Lo.PIPE.treated, { roughness: 0.45, metalness: 0.35 });
  const pipes = new THREE.Group(); root.add(pipes);
  const PR = 0.28;
  const inX = P.towerIn[0], inZ = P.towerIn[2], outX = P.towerOut[0], outZ = P.towerOut[2];
  // entrada: de P.towerIn (pé) até dentro da taça, curva para baixo a 0,5 m do teto (descarga livre)
  const inPath = [[inX, P.towerIn[1], inZ], [inX, Y0 - 1, inZ], [inX, Y1 - 0.6, inZ], [inX, Y1 - 0.45, inZ + 0.25], [inX, Y1 - 0.6, inZ + 0.55]];
  const riserLen = Y1 - 0.6 - P.towerIn[1];
  const riser = L.mesh(new THREE.CylinderGeometry(PR, PR, riserLen, 16).translate(0, riserLen / 2, 0), pipeM, inX, P.towerIn[1], inZ); pipes.add(riser);
  const gooseneck = L.tube(L.curve(inPath.slice(2), false, 0.5), PR, pipeM, 16, 12); pipes.add(gooseneck);
  // flanges ao longo do tubo de entrada e da saída
  const fl = new Merge();
  for (let y = P.towerIn[1] + 1.2; y < Y0 - 0.3; y += 3.0) fl.add(G.cyl(PR + 0.09, PR + 0.09, 0.12, 16), '#2a6bb5', TM(inX, y, inZ)).add(G.cyl(PR + 0.09, PR + 0.09, 0.12, 16), '#2a6bb5', TM(outX, y + 1.5, outZ));
  // braçadeiras dos tubos presas aos anéis
  [15.2, 19.0, 22.6].forEach((y) => { fl.rod([inX, y, inZ], legPt(legs[2], y), 0.05, DARK, 6); fl.rod([outX, y, outZ], legPt(legs[0], y), 0.05, DARK, 6); });
  // registro de manobra (gaveta) no pé da saída, com volante
  fl.add(G.box(0.7, 0.75, 0.7), '#2a6bb5', TM(outX, P.towerOut[1] + 1.1, outZ)).add(G.cyl(0.05, 0.05, 0.6, 6), '#9aa5ae', TM(outX, P.towerOut[1] + 1.7, outZ)).add(G.torus(0.28, 0.035, 6, 20), '#c8333a', TM(outX, P.towerOut[1] + 2.0, outZ, Math.PI / 2, 0, 0));
  pipes.add(L.mesh(fl.geo(), vmat({ roughness: 0.5, metalness: 0.3 })));
  // saída: do fundo da taça (crivo junto ao fundo, já na metade removida → visível no corte) até P.towerOut
  const outLen = Y0 + 0.35 - P.towerOut[1];
  const outPipe = L.mesh(new THREE.CylinderGeometry(PR, PR, outLen, 16).translate(0, outLen / 2, 0), pipeM, outX, P.towerOut[1], outZ); pipes.add(outPipe);
  const strainer = L.mesh(new THREE.CylinderGeometry(PR + 0.12, PR + 0.12, 0.25, 16), L.mat('#8fa0ad', { metalness: 0.5, roughness: 0.4 }), outX, Y0 + 0.42, outZ); pipes.add(strainer);
  // extravasor: boca na parede de trás a 0,3 m do topo, desce por fora até o chão (caixa de descarga)
  const ov = L.tube(L.curve([[X - 1.2, Y1 - 0.4, Z - R + 0.3], [X - 1.2, Y1 - 0.4, Z - R - 0.5], [X - 1.4, Y0 - 0.5, Z - R - 0.55], [X - 2.2, 13.5, Z - RB - 0.6], [X - 2.2, Lo.G(X - 2.2, Z - RB - 0.6) + 0.2, Z - RB - 0.6]], false, 0.2), 0.16, L.mat('#8f9aa5', { metalness: 0.4, roughness: 0.4 }), 80, 10);
  pipes.add(ov);
  L.shadows(pipes);
  // jato de entrada (água caindo da curva de descarga até o nível)
  const jetM = L.water('#7cc8f4', 0.7, { side: DS }); jetM.depthWrite = false;
  const jet = L.mesh(new THREE.CylinderGeometry(0.16, 0.22, 1, 14, 1, true).translate(0, -0.5, 0), jetM, inX, Y1 - 0.75, inZ + 0.55, { cast: false }); root.add(jet);
  const splash = L.mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 24), L.mat('#dff3ff', { transparent: true, opacity: 0.7, depthWrite: false }), inX, Y0 + 1, inZ + 0.55, { cast: false }); splash.rotation.x = Math.PI / 2; root.add(splash);
  // linhas luminosas azuis da água tratada: subindo pelo tubo de entrada e descendo pela saída
  const glowM = L.glow('#5fc0ff', 1.9, { transparent: true, opacity: 0.95 });
  const glowIn = L.mesh(new THREE.CylinderGeometry(0.06, 0.06, riserLen, 6).translate(0, riserLen / 2, 0), glowM, inX, P.towerIn[1], inZ + PR + 0.02, { cast: false }); root.add(glowIn);
  const glowOut = L.mesh(new THREE.CylinderGeometry(0.06, 0.06, outLen, 6).translate(0, -outLen / 2, 0), glowM, outX, Y0 + 0.35, outZ + PR + 0.02, { cast: false }); root.add(glowOut);

  /* ---------- acessórios: balcão, guarda-corpo, escada marinheiro com gaiola, escada do teto ---------- */
  const acc = new Merge(), LA = -0.35;                  // ângulo da escada (lado direito, um pouco atrás)
  const angs = []; for (let a = Math.PI * 0.42; a <= Math.PI * 1.58 + 1e-6; a += Math.PI / 24) angs.push(a);  // balcão na metade de trás + laterais (a frente fica livre para o corte)
  const pc = (a, r, y) => [X + Math.sin(a) * r, y, Z + Math.cos(a) * r];
  for (let i = 0; i < angs.length - 1; i++) {
    const a = angs[i], b = angs[i + 1];
    acc.add(G.box(Math.hypot(...pc(a, R + 0.55, 0).map((v, j) => v - pc(b, R + 0.55, 0)[j])) + 0.05, 0.06, 1.0), '#9aa5ae', TM(...pc((a + b) / 2, R + 0.5, Y0 - 0.03), 0, (a + b) / 2, 0));
    acc.rod(pc(a, R + 1.0, Y0), pc(a, R + 1.0, Y0 + 1.1), 0.03, '#f2c230', 6);
    acc.rod(pc(a, R + 1.0, Y0 + 1.1), pc(b, R + 1.0, Y0 + 1.1), 0.035, '#f2c230', 6).rod(pc(a, R + 1.0, Y0 + 0.55), pc(b, R + 1.0, Y0 + 0.55), 0.025, '#f2c230', 6);
  }
  // escada marinheiro: da sapata da perna 0 (lado +x+z… perna da direita-trás) até o balcão, com gaiola
  const lgx = legs[3]; // perna da direita-trás (a = 7π/4 → x+, z−)
  const ladA = lgx.base.clone().add(new THREE.Vector3(0.6, 0, 0.0)), ladTop = new THREE.Vector3(X + Math.sin(Math.PI * 0.42) * (R + 0.6), Y0, Z + Math.cos(Math.PI * 0.42) * (R + 0.6));
  { const bot = new THREE.Vector3(ladTop.x, Lo.G(ladTop.x, ladTop.z) + 0.05, ladTop.z), up = new THREE.Vector3(0, 1, 0), side = new THREE.Vector3(Math.cos(Math.PI * 0.42), 0, -Math.sin(Math.PI * 0.42)).multiplyScalar(0.25);
    void ladA;
    [-1, 1].forEach((s) => acc.rod(bot.clone().addScaledVector(side, s), ladTop.clone().addScaledVector(side, s).add(new THREE.Vector3(0, 1.1, 0)), 0.03, '#9aa5ae', 6));
    for (let y = bot.y + 0.3; y < ladTop.y; y += 0.3) acc.rod([bot.x - side.x, y, bot.z - side.z], [bot.x + side.x, y, bot.z + side.z], 0.018, '#9aa5ae', 4);
    const out = new THREE.Vector3(Math.sin(Math.PI * 0.42), 0, Math.cos(Math.PI * 0.42));
    for (let y = bot.y + 2.4; y < ladTop.y + 1.0; y += 0.9) { const c = new THREE.Vector3(bot.x, y, bot.z).addScaledVector(out, 0.38); acc.add(G.torus(0.38, 0.02, 4, 16, Math.PI * 1.4), '#f2c230', TM(c.x, c.y, c.z, Math.PI / 2, 0, -Math.PI * 0.42 - Math.PI * 0.2 + Math.PI)); }
    for (let k = 0; k < 5; k++) { const a = (k / 4 - 0.5) * 2.2; const o2 = out.clone().multiplyScalar(0.38 + Math.cos(a) * 0.38).addScaledVector(side.clone().normalize(), Math.sin(a) * 0.38); acc.rod([bot.x + o2.x, bot.y + 2.4, bot.z + o2.z], [bot.x + o2.x, ladTop.y + 0.9, bot.z + o2.z], 0.012, '#f2c230', 4); }
    void up;
    // escada da parede da taça até o teto + guarda-corpo do teto
    const a2 = Math.PI * 0.6, b2 = new THREE.Vector3(...pc(a2, R + 0.25, Y0 + 0.1)), t2 = new THREE.Vector3(...pc(a2, R + 0.25, Y1 + 0.1)), sd = new THREE.Vector3(Math.cos(a2), 0, -Math.sin(a2)).multiplyScalar(0.22);
    [-1, 1].forEach((s) => acc.rod(b2.clone().addScaledVector(sd, s), t2.clone().addScaledVector(sd, s).add(new THREE.Vector3(0, 1.0, 0)), 0.025, '#9aa5ae', 6));
    for (let y = b2.y + 0.3; y < t2.y; y += 0.3) acc.rod([b2.x - sd.x, y, b2.z - sd.z], [b2.x + sd.x, y, b2.z + sd.z], 0.016, '#9aa5ae', 4);
    for (let a = Math.PI * 0.5; a < Math.PI * 1.5; a += Math.PI / 12) { acc.rod(pc(a, R - 0.1, Y1 - 0.02 + 0.3 * 0), pc(a, R - 0.1, Y1 + 0.9), 0.022, '#f2c230', 4); acc.rod(pc(a, R - 0.1, Y1 + 0.9), pc(a + Math.PI / 12, R - 0.1, Y1 + 0.9), 0.026, '#f2c230', 4); }
  }
  const accMesh = acc.mesh(vmat({ roughness: 0.5, metalness: 0.35 })); L.shadows(accMesh); root.add(accMesh);

  /* ---------- alambrado do lote da torre com portão ---------- */
  const fen = new Merge(), FX0 = X - 7.0, FX1 = X + 7.0, FZ0 = Z - 6.0, FZ1 = -17.6;
  const fenceLine = (a, b, gate = null) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2.5); for (let i = 0; i <= n; i++) { const x = a[0] + ((b[0] - a[0]) * i) / n, z = a[1] + ((b[1] - a[1]) * i) / n; if (gate && Math.abs(x - gate) < 1.8 && i > 0 && i < n) continue; const g = Lo.G(x, z); fen.rod([x, g - 0.2, z], [x, g + 2.0, z], 0.04, '#8d969e', 6); if (i < n) { const x2 = a[0] + ((b[0] - a[0]) * (i + 1)) / n, z2 = a[1] + ((b[1] - a[1]) * (i + 1)) / n; if (gate && Math.abs((x + x2) / 2 - gate) < 1.8) continue; const g2 = Lo.G(x2, z2); fen.rod([x, g + 2.0, z], [x2, g2 + 2.0, z2], 0.03, '#8d969e', 4); const pts = 6; for (let k = 0; k <= pts; k++) { const u = k / pts; fen.rod([x + (x2 - x) * u, g + (g2 - g) * u + 0.05, z + (z2 - z) * u], [x + (x2 - x) * Math.min(1, u + 0.16), g + (g2 - g) * Math.min(1, u + 0.16) + 1.95, z + (z2 - z) * Math.min(1, u + 0.16)], 0.008, '#a9b3ba', 3); } } } };
  fenceLine([FX0, FZ0], [FX1, FZ0]); fenceLine([FX1, FZ0], [FX1, FZ1]); fenceLine([FX0, FZ0], [FX0, FZ1]); fenceLine([FX0, FZ1], [FX1, FZ1], X);
  // portão (duas folhas) e placa
  [-1, 1].forEach((s) => { const x = X + s * 0.85, g = Lo.G(x, FZ1); fen.add(G.box(1.6, 1.9, 0.04), '#5d6870', TM(x, g + 1.0, FZ1)); });
  const fenceMesh = fen.mesh(vmat({ roughness: 0.6, metalness: 0.4 })); root.add(fenceMesh);

  /* ---------- planta (ghost) da torre: contornos simples ---------- */
  const proxy = new THREE.Group();
  legs.forEach((l) => { const len = l.base.distanceTo(l.top), g = new THREE.CylinderGeometry(0.25, 0.25, len, 6); g.translate(0, len / 2, 0); const m = new THREE.Mesh(g); m.position.copy(l.base); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), l.top.clone().sub(l.base).normalize()); proxy.add(m); });
  { const m = new THREE.Mesh(new THREE.CylinderGeometry(R, R, HT, 12)); m.position.set(X, Y0 + HT / 2, Z); proxy.add(m); const c = new THREE.Mesh(new THREE.ConeGeometry(R + 0.25, 1.25, 12)); c.position.set(X, Y1 + 0.62, Z); proxy.add(c);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(PR, PR, riserLen, 6)); r.position.set(inX, P.towerIn[1] + riserLen / 2, inZ); proxy.add(r); }
  const ghostG = ghost.of(proxy, 40); root.add(ghostG);
  const ghostFill = new THREE.Group(); proxy.children.forEach((m) => { const f = new THREE.Mesh(m.geometry, ghost.fill); f.position.copy(m.position); f.quaternion.copy(m.quaternion); ghostFill.add(f); }); root.add(ghostFill);

  /* ---------- update ---------- */
  const _v = new THREE.Vector3();
  function update(t, S) {
    const b = S.build.tower, wT = S.water.tower, run = S.present ? 1 : 0;
    root.visible = true;
    const showG = b < 0.02 && S.ghost > 0.01;
    ghostG.visible = ghostFill.visible = showG;
    // fundação
    const kf = sub(b, 0, 0.12); foundation.visible = kf > 0; foundation.position.y = -1.2 * (1 - L.ease.out(kf));
    // pernas crescendo
    const kl = sub(b, 0.1, 0.42);
    legMeshes.forEach((m, i) => { const k = L.clamp01(kl * 1.15 - i * 0.05); m.visible = k > 0.001; m.scale.set(1, Math.max(0.001, k), 1); });
    const legY = L.lerp(14.0, YT, kl);
    bracing.forEach((br) => { br.mesh.visible = legY >= br.y - 0.05 && kl > 0; });
    ringMesh.visible = sub(b, 0.42, 0.48) > 0;
    // taça: fundo → parede subindo → teto
    const kb = sub(b, 0.45, 0.52), ks = sub(b, 0.5, 0.68), kr = sub(b, 0.66, 0.74);
    bottom.visible = kb > 0; bottom.position.y = 3 * (1 - L.ease.out(kb));
    shell.visible = ks > 0; shell.scale.y = Math.max(0.001, ks); shell.position.y = Y0 * (1 - ks);
    roof.visible = kr > 0; roof.position.y = 4 * (1 - L.ease.out(kr));
    tank.visible = b > 0.44;
    // tubos e acessórios
    const kp = sub(b, 0.55, 0.8);
    pipes.visible = kp > 0; riser.scale.y = Math.max(0.001, L.clamp01(kp * 1.3)); gooseneck.visible = outPipe.visible = strainer.visible = kp > 0.75; ov.visible = kp > 0.95;
    const ka = sub(b, 0.74, 0.92); accMesh.visible = ka > 0; accMesh.position.y = 2.5 * (1 - L.ease.out(ka));
    fenceMesh.visible = sub(b, 0.86, 1) > 0; fenceMesh.scale.y = Math.max(0.001, L.ease.back(sub(b, 0.86, 1)));
    ruler.visible = sub(b, 0.9, 1) > 0;
    // água
    const level = L.lerp(Y0 + 0.3, T.water, wT);
    water.visible = wT > 0.003 && b > 0.99; water.scale.y = Math.max(0.001, level - (Y0 + 0.3));
    if (ruler.visible) ruler.marker.position.y = level;
    const inflow = S.water.treated >= 0.999 && b > 0.99 ? 1 : 0;
    const filling = inflow && (wT < 0.999 || S.present || t > 83.6);
    jet.visible = !!filling; const top = Y1 - 0.75; jet.scale.y = Math.max(0.01, top - level); jet.scale.x = jet.scale.z = 1 + 0.06 * Math.sin(t * 23);
    splash.visible = jet.visible && wT > 0.01; splash.position.y = level + 0.02; splash.scale.setScalar(1 + 0.25 * Math.sin(t * 9));
    // linhas luminosas: sobe pela entrada quando a frente d'água chega (S.water.treated ~ fim), desce pela saída quando a rede enche
    const gi = sub(S.water.treated, 0.9, 1); glowIn.visible = gi > 0 && b > 0.99; glowIn.scale.y = Math.max(0.001, gi);
    const go = Math.max(run, sub(wT, 0.05, 0.2)); glowOut.visible = go > 0 && b > 0.99; glowOut.scale.y = Math.max(0.001, go);
    void _v;
  }
  return { root, update, legs, level: (S) => L.lerp(Y0 + 0.3, T.water, S.water.tower) };
}
