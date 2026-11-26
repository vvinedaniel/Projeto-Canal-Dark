// A casa do lote hero (Ep. 03): térrea, fachada da frente REMOVIDA (corte em z = Hh.z1) para ver a cozinha, o banheiro
// e os canos embutidos; laje de forro com sótão; telhado cerâmico (capa-canal) com RECORTE no canto direito-frente para
// mostrar a caixa-d'água; muro da frente com a mureta do cavalete (nicho do hidrômetro) e portão; acabamento do lote.
// Tudo estático e mesclado por material (cor por vértice). Interior: cozinha com ilha (cuba de inox em corte), armários,
// cooktop, coifa, geladeira, azulejos, janela, luminária pendente, mesa com cadeiras; banheiro com chuveiro, vaso e
// lavatório. A ilha da cozinha é cortada no plano z = KZ (mostra o armário por dentro, a cuba em corte e o ponto de água).
export const KZ = 17.68;   // plano de corte da ilha da cozinha
export const FZ = 17.6;    // plano da torneira (eixo do corpo)

export function buildHouse(ctx, K, opt = {}) {
  const { L, THREE, Lo } = ctx, { G, TM, Merge, vmat, canvasTex } = K;
  const Hh = Lo.HOUSE, root = new THREE.Group();
  const X0 = Hh.x0, X1 = Hh.x1, Z0 = Hh.z0, Z1 = Hh.z1, F = Hh.floor, WT = 0.15, TOP = F + Hh.wallH, SL = 0.12, ATT = TOP + SL; // ATT = piso do sótão
  const CUT = '#d9c6a6', WALL_IN = '#f1ead9', WALL_OUT = '#efe2c4', CONC = '#b8bdc1';
  const m = new Merge(), wood = new Merge(), metal = new Merge();
  const bx = (mm, w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) => mm.add(G.box(w, h, d), c, TM(x, y, z, rx, ry, rz));
  /** parede (caixa) que termina no plano de corte z = Z1 com a face cortada em cor de corte */
  // paredes com aberturas: holes = [[a, b, ya, yb], ...] ao longo do comprimento (z para wallZ, x para wallX)
  const split = (a0, a1, y0, y1, holes, put) => {
    let a = a0; holes.slice().sort((p, q) => p[0] - q[0]).forEach(([ha, hb, ya, yb]) => { if (ha > a) put(a, ha, y0, y1); put(ha, hb, y0, ya); put(ha, hb, yb, y1); a = hb; });
    if (a1 > a) put(a, a1, y0, y1);
  };
  const wallZ = (x0, x1, z0, z1, y0, y1, c = WALL_IN, holes = []) => {
    const cutEnd = z1 >= Z1 - 1e-3;
    const zz1 = cutEnd ? z1 - 0.008 : z1;
    split(z0, zz1, y0, y1, holes, (a, b, ya, yb) => { if (b - a > 1e-3 && yb - ya > 1e-3) bx(m, x1 - x0, yb - ya, b - a, (x0 + x1) / 2, (ya + yb) / 2, (a + b) / 2, c); });
    if (cutEnd) bx(m, x1 - x0, y1 - y0, 0.008, (x0 + x1) / 2, (y0 + y1) / 2, z1 - 0.004, CUT);
  };
  const wallX = (x0, x1, z0, z1, y0, y1, c = WALL_IN, holes = []) => split(x0, x1, y0, y1, holes, (a, b, ya, yb) => { if (b - a > 1e-3 && yb - ya > 1e-3) bx(m, b - a, yb - ya, z1 - z0, (a + b) / 2, (ya + yb) / 2, (z0 + z1) / 2, c); });

  /* ---------- fundação, piso e laje ---------- */
  // radier (concreto) até o piso; face da frente = corte
  bx(m, X1 - X0 + 0.1, F - 0.004, Z1 - Z0 - 0.006, 0, F / 2, (Z0 + Z1) / 2 - 0.003, CONC);
  bx(m, X1 - X0 + 0.1, F, 0.006, 0, F / 2, Z1 - 0.003, '#a9a49a');
  // laje de forro (piso do sótão)
  bx(m, X1 - X0, SL, Z1 - Z0 - 0.008, 0, TOP + SL / 2, (Z0 + Z1) / 2 - 0.004, '#c3c6c8');
  bx(m, X1 - X0, SL, 0.008, 0, TOP + SL / 2, Z1 - 0.004, CUT);
  bx(m, X1 - X0 - 2 * WT, 0.012, Z1 - Z0 - 2 * WT, 0, TOP - 0.006, (Z0 + Z1) / 2 + WT / 2, '#f7f4ee'); // teto pintado
  // paredes externas (laterais e fundo)
  const WIN = { kit: [16.1, 17.7, F + 1.05, F + 2.25], bath: [16.7, 17.5, F + 1.65, F + 2.25], back1: [-3.6, -1.8, F + 1.0, F + 2.2], back2: [1.6, 3.4, F + 1.0, F + 2.2] };
  wallZ(X0, X0 + WT, Z0, Z1, F, TOP, WALL_OUT, [WIN.kit]); wallZ(X1 - WT, X1, Z0, Z1, F, TOP, WALL_OUT, [WIN.bath]);
  wallX(X0, X1, Z0, Z0 + WT, F, TOP, WALL_OUT, [WIN.back1, WIN.back2]);
  // faixa interna pintada nas laterais (cor interna) — leve diferença de tom dentro x fora
  split(Z0 + WT, Z1 - 0.01, F, TOP, [WIN.kit], (a, b, ya, yb) => { if (b - a > 1e-3 && yb - ya > 1e-3) bx(m, 0.004, yb - ya, b - a, X0 + WT + 0.002, (ya + yb) / 2, (a + b) / 2, WALL_IN); });
  // divisórias internas
  const KX1 = -0.55, BX0 = 1.18;            // cozinha x [X0+WT, KX1]; banheiro x [BX0+WT, X1-WT]
  const KZ0 = 15.05, BZ0 = 15.5;            // fundo da cozinha / do banheiro
  // P1: fundo da cozinha (com porta x −1.55…−0.75)
  wallX(X0 + WT, -1.55, KZ0 - WT, KZ0, F, TOP); wallX(-0.75, KX1 + WT, KZ0 - WT, KZ0, F, TOP); wallX(-1.55, -0.75, KZ0 - WT, KZ0, F + 2.1, TOP);
  // P2: entre o quarto de trás e a sala (só no fundo)
  wallX(KX1, KX1 + WT, Z0 + WT, KZ0, F, TOP);
  // P5: fundo da sala (porta x 0.1…0.9)
  wallX(KX1 + WT, 0.1, BZ0 - WT, BZ0, F, TOP); wallX(0.9, BX0, BZ0 - WT, BZ0, F, TOP); wallX(0.1, 0.9, BZ0 - WT, BZ0, F + 2.1, TOP);
  // P3: parede esquerda do banheiro (até o corte) · P4: fundo do banheiro
  wallZ(BX0, BX0 + WT, BZ0 - WT, Z1, F, TOP, '#e8eef1'); wallX(BX0, X1 - WT, BZ0 - WT, BZ0, F, TOP, '#e8eef1');
  // pisos: cerâmica (cozinha/sala), porcelanato do banheiro (malhas com textura)
  const floorTex = canvasTex(512, 512, (g, w, h, rd) => { g.fillStyle = '#d8cdb8'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 214 + Math.floor(rd() * 16); g.fillStyle = `rgb(${v},${v - 9},${v - 24})`; g.fillRect(i * 128 + 3, j * 128 + 3, 122, 122); } for (let i = 0; i < 2500; i++) { g.fillStyle = rd() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(80,60,40,.06)'; g.fillRect(rd() * w, rd() * h, 2, 2); } }, { repeat: [1, 1] });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  const floorM = L.mat(0xffffff, { map: floorTex, roughness: 0.35, metalness: 0.02 });
  const fl = (x0, x1, z0, z1, rep) => { const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / rep, uv.getY(i) * (z1 - z0) / rep); g.translate((x0 + x1) / 2, F + 0.003, (z0 + z1) / 2); return g; };
  const floorMesh = L.mesh(L.BGU.mergeGeometries([fl(X0 + WT, BX0, KZ0, Z1 - 0.01, 1.8), fl(KX1 + WT, BX0, BZ0, KZ0, 1.8)]), floorM, 0, 0, 0, { cast: false });
  root.add(floorMesh);
  const bathTex = canvasTex(256, 256, (g, w, h, rd) => { g.fillStyle = '#9aa7ad'; g.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const v = 200 + Math.floor(rd() * 14); g.fillStyle = `rgb(${v - 6},${v},${v + 4})`; g.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); } });
  bathTex.wrapS = bathTex.wrapT = THREE.RepeatWrapping;
  const bathM = L.mat(0xffffff, { map: bathTex, roughness: 0.3 });
  const bf = fl(BX0 + WT, X1 - WT, BZ0, Z1 - 0.01, 1.2); root.add(L.mesh(bf, bathM, 0, 0, 0, { cast: false }));
  // azulejos (cozinha: parede do fundo; banheiro: paredes até 1,8 m) — malha com textura
  const tileTex = canvasTex(512, 512, (g, w, h, rd) => { g.fillStyle = '#c9d6d8'; g.fillRect(0, 0, w, h); const n = 8, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const v = Math.floor(rd() * 10); g.fillStyle = (i + j) % 7 === 3 ? `rgb(${92 + v},${150 + v},${164 + v})` : `rgb(${236 + v / 2},${241 + v / 2},${240})`; g.fillRect(i * s + 2, j * s + 2, s - 4, s - 4); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(i * s + 6, j * s + 6, s * 0.35, 3); } });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
  const tileM = L.mat(0xffffff, { map: tileTex, roughness: 0.18, metalness: 0.02 });
  const wallTile = (x0, x1, y0, y1, z, rep = 0.8, ry = 0) => { const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0) / rep, uv.getY(i) * (y1 - y0) / rep); g.translate((x0 + x1) / 2, (y0 + y1) / 2, 0); if (ry) g.rotateY(ry); return g; };
  const tg = [];
  { const g = wallTile(X0 + WT, KX1, F + 0.9, F + 2.05, 0); g.translate(0, 0, KZ0 + 0.004); tg.push(g); }
  { const g = wallTile(BX0 + WT, X1 - WT, F, F + 1.9, 0, 0.6); g.translate(0, 0, BZ0 + 0.004); tg.push(g); }
  { const g = wallTile(BZ0, Z1 - 0.01, F, F + 1.9, 0, 0.6, -Math.PI / 2); g.translate(X1 - WT - 0.004, 0, 0); tg.push(g); } // parede direita do banheiro (ângulo: x' = -z… usa rotação)
  { const g = wallTile(-(Z1 - 0.01), -BZ0, F, F + 1.9, 0, 0.6, Math.PI / 2); g.translate(BX0 + WT + 0.004, 0, 0); tg.push(g); }
  const tiles = L.mesh(L.BGU.mergeGeometries(tg), tileM, 0, 0, 0, { cast: false }); root.add(tiles);

  /* ---------- janelas (esquadria de alumínio branco + vidro) ---------- */
  const glassM = L.glass('#9fd3ea', 0.35, { side: THREE.DoubleSide });
  const glassG = [];
  const windowX = (x, z0, z1, y0, y1) => { // em parede lateral (normal x)
    const w = z1 - z0, h = y1 - y0, zc = (z0 + z1) / 2, yc = (y0 + y1) / 2;
    [[0, h / 2 + 0.03, w + 0.12, 0.06], [0, -h / 2 - 0.03, w + 0.12, 0.06]].forEach(([dz, dy, ww, hh]) => bx(m, WT + 0.04, hh, ww, x, yc + dy, zc + dz, '#f6f6f4'));
    [-1, 1].forEach((s) => bx(m, WT + 0.04, h, 0.06, x, yc, zc + s * (w / 2 + 0.03), '#f6f6f4'));
    bx(m, WT * 0.5, h, 0.04, x, yc, zc, '#f6f6f4'); bx(m, WT + 0.2, 0.04, w + 0.25, x + Math.sign(x) * 0.06, y0 - 0.06, zc, '#e5e1d8');
    const g = new THREE.PlaneGeometry(w, h); g.rotateY(Math.PI / 2); g.translate(x, yc, zc); glassG.push(g);
  };
  const windowZ = (z, x0, x1, y0, y1) => {
    const w = x1 - x0, h = y1 - y0, xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
    [[h / 2 + 0.03], [-h / 2 - 0.03]].forEach(([dy]) => bx(m, w + 0.12, 0.06, WT + 0.04, xc, yc + dy, z, '#f6f6f4'));
    [-1, 1].forEach((s) => bx(m, 0.06, h, WT + 0.04, xc + s * (w / 2 + 0.03), yc, z, '#f6f6f4'));
    bx(m, 0.04, h, WT * 0.5, xc, yc, z);
    const g = new THREE.PlaneGeometry(w, h); g.translate(xc, yc, z); glassG.push(g);
  };
  // as janelas abrem furos nas paredes: as paredes são redesenhadas em pedaços ao redor da janela
  // (lateral esquerda da cozinha e fundo do quarto; banheiro com basculante na lateral direita)
  windowX(X0 + WT / 2, ...WIN.kit); windowX(X1 - WT / 2, ...WIN.bath);
  windowZ(Z0 + WT / 2, ...WIN.back1); windowZ(Z0 + WT / 2, ...WIN.back2);
  root.add(L.mesh(L.BGU.mergeGeometries(glassG), glassM, 0, 0, 0, { cast: false }));

  /* ---------- cozinha ---------- */
  const FRONT = '#f4f1ea', CAB = '#2f5d73', CAB2 = '#e9e3d6', GRAN = '#2b2f33', INOX = '#c9d0d6';
  // geladeira
  { const x = X0 + WT + 0.37, z = KZ0 + 0.36; m.add(G.rbox(0.72, 1.82, 0.68, 0.05), '#eef1f3', TM(x, F + 0.92, z)); bx(m, 0.7, 0.012, 0.012, x, F + 1.22, z + 0.345, '#b9c1c7');
    metal.rod([x + 0.3, F + 1.32, z + 0.37], [x + 0.3, F + 1.72, z + 0.37], 0.012, '#c9d0d6').rod([x + 0.3, F + 0.6, z + 0.37], [x + 0.3, F + 1.1, z + 0.37], 0.012, '#c9d0d6'); }
  // bancada do fundo: armários inferiores, tampo de granito, cooktop, armários superiores, coifa
  { const xa = X0 + WT + 0.78, xb = -1.62, d = 0.6, z = KZ0 + d / 2, w = xb - xa, xc = (xa + xb) / 2;
    bx(m, w, 0.1, d - 0.06, xc, F + 0.05, z - 0.03, '#1f2a30');
    bx(m, w, 0.78, d - 0.02, xc, F + 0.49, z - 0.01, CAB2);
    const nd = 4; for (let i = 0; i < nd; i++) { const x = xa + (w * (i + 0.5)) / nd; bx(m, w / nd - 0.012, 0.76, 0.02, x, F + 0.49, z + d / 2, CAB); metal.rod([x - 0.04, F + 0.8, z + d / 2 + 0.03], [x + 0.04, F + 0.8, z + d / 2 + 0.03], 0.008, '#c9d0d6'); }
    bx(m, w + 0.02, 0.04, d + 0.03, xc, F + 0.9, z + 0.005, GRAN);
    // cooktop (vidro preto, 4 bocas)
    const cx = xa + 0.55; bx(m, 0.58, 0.012, 0.48, cx, F + 0.926, z, '#101215');
    [[-0.15, -0.11], [0.15, -0.11], [-0.15, 0.11], [0.15, 0.11]].forEach(([dx, dz]) => m.add(G.torus(0.065, 0.006, 6, 24), '#5b6066', TM(cx + dx, F + 0.934, z + dz, Math.PI / 2)));
    // chaleira
    m.add(G.lathe([[0, 0], [0.08, 0], [0.09, 0.05], [0.08, 0.14], [0.03, 0.17], [0, 0.18]], 18), '#c8433b', TM(cx + 0.15, F + 0.932, z - 0.1));
    // coifa
    m.add(G.cyl(0.08, 0.32, 0.18, 4), '#c9d0d6', TM(cx, F + 1.72, z - 0.02, 0, Math.PI / 4)); bx(m, 0.2, 0.62, 0.2, cx, F + 2.12, KZ0 + 0.1, '#c9d0d6');
    // armários superiores (em volta da coifa)
    const ua = cx + 0.4, uw = xb - ua; bx(m, uw, 0.7, 0.36, (ua + xb) / 2, F + 1.95, KZ0 + 0.18, CAB2);
    const nu = 3; for (let i = 0; i < nu; i++) { const x = ua + (uw * (i + 0.5)) / nu; bx(m, uw / nu - 0.012, 0.68, 0.02, x, F + 1.95, KZ0 + 0.37, '#f2eee5'); metal.rod([x, F + 1.66, KZ0 + 0.395], [x + 0.08, F + 1.66, KZ0 + 0.395], 0.008, '#c9d0d6'); }
    // escorredor com pratos e potes de tempero
    for (let i = 0; i < 5; i++) m.add(G.cyl(0.11, 0.11, 0.012, 20), '#f4f6f7', TM(xb - 0.35 + i * 0.03, F + 1.03, z, 0, 0, Math.PI / 2 - 0.12));
    for (let i = 0; i < 4; i++) m.add(G.cyl(0.03, 0.03, 0.1, 10), ['#d9a441', '#b6462f', '#5e8f3e', '#e0d7c4'][i], TM(xb - 0.9 + i * 0.08, F + 0.97, KZ0 + 0.1)); }
  // ilha da pia (cortada no plano KZ): carcaça, prateleira, tampo de granito em volta da cuba; banquetas do lado de trás
  const IX0 = -3.7, IX1 = -1.5, IZ0 = 17.25, CU = { x0: -2.64, x1: -1.96, z0: 17.36, z1: 17.84, bot: Hh.kitchen.counterY - 0.16 };
  const TOPY = Hh.kitchen.counterY;
  { const zc = (IZ0 + KZ) / 2, d = KZ - IZ0;
    bx(m, IX1 - IX0, 0.1, d - 0.05, (IX0 + IX1) / 2, F + 0.05, zc - 0.02, '#1f2a30');                // rodapé
    bx(m, IX1 - IX0, TOPY - 0.04 - F - 0.1, 0.02, (IX0 + IX1) / 2, (TOPY - 0.04 + F + 0.1) / 2, IZ0 + 0.01, CAB);   // costas (lado de trás é a frente dos armários)
    [IX0 + 0.01, IX1 - 0.01, -2.85, -1.75].forEach((x) => bx(m, 0.02, TOPY - 0.04 - F - 0.1, d, x, (TOPY - 0.04 + F + 0.1) / 2, zc, '#e7e1d4'));
    bx(m, IX1 - IX0, 0.02, d, (IX0 + IX1) / 2, F + 0.11, zc, '#e7e1d4'); bx(m, -2.85 - IX0, 0.02, d, (IX0 - 2.85) / 2, F + 0.5, zc, '#e7e1d4');
    // faces de corte das peças da carcaça (bordas cortadas)
    [IX0 + 0.01, IX1 - 0.01, -2.85, -1.75].forEach((x) => bx(m, 0.022, TOPY - 0.04 - F - 0.1, 0.004, x, (TOPY - 0.04 + F + 0.1) / 2, KZ + 0.001, CUT));
    // potes e panelas guardados (lado esquerdo), lixeira (direito)
    m.add(G.cyl(0.1, 0.1, 0.14, 16), '#8d97a0', TM(-3.45, F + 0.19, 17.45)).add(G.cyl(0.08, 0.08, 0.12, 16), '#b84a3a', TM(-3.15, F + 0.18, 17.45)).add(G.cyl(0.07, 0.07, 0.2, 14), '#e8e2d2', TM(-3.3, F + 0.62, 17.42));
    m.add(G.cyl(0.11, 0.1, 0.32, 16), '#3f4c56', TM(-1.62 + 0.0, F + 0.28, 17.45));
    // tampo: em volta da cuba (U), com face de corte
    const ty = TOPY - 0.02, th = 0.04;
    bx(m, CU.x0 - 0.02 - IX0, th, d + 0.03, (IX0 + CU.x0 - 0.02) / 2, ty, zc - 0.015, GRAN);
    bx(m, IX1 - CU.x1 - 0.02, th, d + 0.03, (IX1 + CU.x1 + 0.02) / 2, ty, zc - 0.015, GRAN);
    bx(m, CU.x1 - CU.x0 + 0.04, th, CU.z0 - 0.02 - (IZ0 - 0.03), (CU.x0 + CU.x1) / 2, ty, (CU.z0 - 0.02 + IZ0 - 0.03) / 2, GRAN);
    bx(m, IX1 - IX0, th, 0.004, (IX0 + IX1) / 2, ty, KZ + 0.002, '#5a5f63');
    // cuba de inox (paredes finas; frente removida pelo corte)
    const cw = 0.008, cd = TOPY - CU.bot, cyc = (TOPY + CU.bot) / 2;
    [CU.x0 - cw / 2, CU.x1 + cw / 2].forEach((x) => bx(metal, cw, cd, KZ - CU.z0 + cw, x, cyc, (KZ + CU.z0 - cw) / 2, INOX));
    bx(metal, CU.x1 - CU.x0 + 2 * cw, cd, cw, (CU.x0 + CU.x1) / 2, cyc, CU.z0 - cw / 2, INOX);
    bx(metal, CU.x1 - CU.x0 + 2 * cw, cw, KZ - CU.z0 + cw, (CU.x0 + CU.x1) / 2, CU.bot - cw / 2, (KZ + CU.z0 - cw) / 2, INOX);
    // borda (aba) da cuba sobre o granito
    bx(metal, CU.x1 - CU.x0 + 0.06, 0.004, 0.03, (CU.x0 + CU.x1) / 2, TOPY + 0.002, CU.z0 - 0.02, '#d7dde2');
    [CU.x0 - 0.02, CU.x1 + 0.02].forEach((x) => bx(metal, 0.03, 0.004, KZ - CU.z0 + 0.03, x, TOPY + 0.002, (KZ + CU.z0 - 0.03) / 2, '#d7dde2'));
    // válvula (ralo) e sifão no armário (em corte, atrás do plano)
    const vx = (CU.x0 + CU.x1) / 2 + 0.12, vz = 17.58;
    metal.add(G.cyl(0.035, 0.035, 0.008, 20), '#aeb6bd', TM(vx, CU.bot + 0.002, vz)).add(G.cyl(0.02, 0.02, 0.1, 14), '#aeb6bd', TM(vx, CU.bot - 0.05, vz));
    m.add(G.cyl(0.024, 0.024, 0.1, 14), '#eceff1', TM(vx, CU.bot - 0.14, vz)).add(G.cyl(0.04, 0.04, 0.12, 16), '#eceff1', TM(vx, CU.bot - 0.25, vz));
    m.rod([vx, CU.bot - 0.25, vz], [vx + 0.3, CU.bot - 0.25, vz], 0.022, '#eceff1').rod([vx + 0.3, CU.bot - 0.25, vz], [vx + 0.3, F + 0.11, vz], 0.022, '#eceff1');
    // banquetas do lado de trás (o lado de quem usa a pia)
    [-3.3, -1.95].forEach((x) => { m.add(G.cyl(0.17, 0.17, 0.05, 20), '#c9934f', TM(x, F + 0.66, IZ0 - 0.32)); for (let a = 0; a < 4; a++) { const ang = a * Math.PI / 2 + 0.5; m.rod([x + Math.cos(ang) * 0.06, F + 0.64, IZ0 - 0.32 + Math.sin(ang) * 0.06], [x + Math.cos(ang) * 0.15, F, IZ0 - 0.32 + Math.sin(ang) * 0.15], 0.012, '#2d343a'); } });
    // fruteira e vaso de planta na ilha
    m.add(G.lathe([[0, 0], [0.1, 0.01], [0.14, 0.06], [0.13, 0.065]], 20), '#e8e1d3', TM(-3.35, TOPY, 17.45));
    [['#e0a232', -3.39, 17.43], ['#c23b2e', -3.31, 17.48], ['#e7c437', -3.35, 17.4], ['#8bbf3f', -3.29, 17.41]].forEach(([c, x, z], i) => m.add(G.sph(0.038, 12, 9), c, TM(x, TOPY + 0.06 + (i % 2) * 0.02, z)));
    m.add(G.cyl(0.06, 0.045, 0.12, 14), '#c96a3c', TM(-1.7, TOPY + 0.06, 17.42)).add(new THREE.IcosahedronGeometry(0.1, 1), '#3f8a3a', TM(-1.7, TOPY + 0.2, 17.42));
  }
  // luminária pendente sobre a ilha (cúpula + lâmpada que brilha)
  const lampY = TOP - 0.7;
  metal.rod([-2.6, TOP, 17.55], [-2.6, lampY + 0.12, 17.55], 0.004, '#2d343a');
  m.add(G.lathe([[0.02, 0.14], [0.06, 0.12], [0.15, 0.02], [0.16, 0], [0.155, -0.005]], 24), '#2c3e46', TM(-2.6, lampY, 17.55));
  const bulb = L.mesh(new THREE.SphereGeometry(0.04, 14, 10), L.glow('#ffe2a8', 2.2), -2.6, lampY + 0.02, 17.55, { cast: false, receive: false }); root.add(bulb);
  // mesa de jantar com 4 cadeiras (na sala, à direita da cozinha)
  { const tx = 0.32, tz = 16.9; m.add(G.rbox(1.2, 0.05, 0.8, 0.02), '#a8744e', TM(tx, F + 0.76, tz)); [[-0.52, -0.32], [0.52, -0.32], [-0.52, 0.32], [0.52, 0.32]].forEach(([x, z]) => m.add(G.box(0.05, 0.74, 0.05), '#7a4f30', TM(tx + x, F + 0.37, tz + z)));
    [[-0.28, -0.6, 1], [0.28, -0.6, 1], [-0.28, 0.6, -1], [0.28, 0.6, -1]].forEach(([x, z, s]) => { m.add(G.box(0.42, 0.04, 0.4), '#c9934f', TM(tx + x, F + 0.46, tz + z)).add(G.box(0.42, 0.45, 0.04), '#c9934f', TM(tx + x, F + 0.7, tz + z - s * 0.19)); [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(([a, b]) => m.add(G.box(0.03, 0.45, 0.03), '#7a4f30', TM(tx + x + a, F + 0.22, tz + z + b))); });
    m.add(G.cyl(0.05, 0.04, 0.16, 12), '#e9f2f5', TM(tx + 0.1, F + 0.86, tz)).add(G.lathe([[0, 0], [0.12, 0.02], [0.16, 0.05]], 20), '#f0ece2', TM(tx - 0.25, F + 0.785, tz + 0.1)); }
  // quadro e tapete na sala
  bx(m, 0.9, 0.6, 0.03, 0.32, F + 1.65, BZ0 + 0.02, '#3a7ab0'); bx(m, 0.95, 0.65, 0.02, 0.32, F + 1.65, BZ0 + 0.005, '#f4f2ec');

  /* ---------- banheiro ---------- */
  { // vaso com caixa acoplada (junto à parede do fundo), lavatório com coluna, box de vidro
    const vx = 3.9, vz = BZ0 + 0.35;
    m.add(G.lathe([[0, 0], [0.16, 0], [0.18, 0.3], [0.2, 0.4], [0.19, 0.42], [0, 0.42]], 20), '#f5f7f9', TM(vx, F, vz + 0.12, 0, 0, 0, 1, 1, 1.25));
    m.add(G.rbox(0.42, 0.36, 0.18, 0.03), '#f5f7f9', TM(vx, F + 0.62, vz - 0.12)).add(G.rbox(0.4, 0.03, 0.42, 0.015), '#eef1f3', TM(vx, F + 0.44, vz + 0.12));
    const lx = 2.15; m.add(G.cyl(0.08, 0.1, 0.72, 16), '#f5f7f9', TM(lx, F + 0.36, BZ0 + 0.25)).add(G.rbox(0.5, 0.14, 0.4, 0.05), '#f5f7f9', TM(lx, F + 0.8, BZ0 + 0.25));
    metal.add(G.cyl(0.012, 0.016, 0.12, 10), '#d2d8dd', TM(lx, F + 0.93, BZ0 + 0.1)).rod([lx, F + 0.98, BZ0 + 0.1], [lx, F + 0.98, BZ0 + 0.2], 0.009, '#d2d8dd');
    bx(m, 0.6, 0.8, 0.02, lx, F + 1.55, BZ0 + 0.012, '#bfe3f0'); // espelho
    // box do chuveiro: soleira e vidro fixo (atrás do plano de corte)
    bx(m, 1.6, 0.04, 0.06, X1 - WT - 0.8, F + 0.02, 17.6, '#d6d9dc');
    const bg = new THREE.PlaneGeometry(1.6, 1.9); bg.translate(X1 - WT - 0.8, F + 0.95, 17.6); root.add(L.mesh(bg, L.glass('#cfeaf4', 0.18, { side: THREE.DoubleSide }), 0, 0, 0, { cast: false }));
    metal.rod([X1 - WT - 1.6, F + 0.04, 17.6], [X1 - WT - 1.6, F + 1.9, 17.6], 0.012, '#c9d0d6');
  }

  /* ---------- telhado: estrutura de madeira + telhas capa-canal, com recorte para a caixa-d'água ---------- */
  const RID = Hh.roofTop, RZ = (Z0 + Z1) / 2, EAV = TOP + SL + 0.26, SLOPE = (RID - EAV) / (Z1 - RZ), OVZ = 0.55, XR0 = -5.4, XR1 = 5.4;
  const CUTX = 0.6, CUTZ = 13.0;            // recorte: x > CUTX e z > CUTZ
  const roofY = (z) => RID - Math.abs(z - RZ) * SLOPE;      // face de cima das telhas
  const inCut = (x, z) => x > CUTX && z > CUTZ;
  // oitões (paredes triangulares) — o da direita é cortado em z = CUTZ
  { const tri = (zs, z0, z1) => { const pts = []; for (let i = 0; i <= 8; i++) { const z = z0 + (z1 - z0) * i / 8; pts.push([z, roofY(z) - 0.16]); } return [[z0, ATT], [z1, ATT], ...pts.reverse()]; };
    const gable = (x, z1, cutEnd) => { const poly = tri(0, Z0, z1).map(([z, y]) => [z, y]); const g = G.extrude(poly.map(([z, y]) => [-z, y]), WT); g.rotateY(Math.PI / 2); g.translate(x - WT / 2, 0, 0); m.add(g, WALL_OUT); if (cutEnd) { const h = roofY(z1) - 0.16 - ATT; bx(m, WT, h, 0.006, x, ATT + h / 2, z1 + 0.003, CUT); } };
    gable(X0 + WT / 2, Z1, false); gable(X1 - WT / 2, CUTZ, true); }
  // madeiramento: terças (ao longo de x), caibros (ao longo da água), ripas
  const woodC = '#9a6a40';
  { const ang = Math.atan(SLOPE);
    [-1, 1].forEach((s) => {
      for (let k = 0; k <= 3; k++) { const z = RZ + s * (k / 3) * (Z1 - RZ + 0.1), y = roofY(z) - 0.2; const xb = (s > 0 || z > CUTZ) ? CUTX : XR1; bx(wood, xb - XR0 + (xb === XR1 ? 0 : 0), 0.12, 0.08, (XR0 + xb) / 2, y, z, woodC); }
      for (let x = XR0 + 0.15; x <= XR1; x += 0.5) {
        const zA = RZ, zB = RZ + s * (Z1 - RZ + OVZ);
        let za = Math.min(zA, zB), zb = Math.max(zA, zB);
        if (x > CUTX) { if (s > 0) continue; zb = Math.min(zb, CUTZ); }
        const zm = (za + zb) / 2, len = (zb - za) / Math.cos(ang);
        bx(wood, 0.05, 0.07, len, x, roofY(zm) - 0.12, zm, '#a8744e', -s * ang);
      }
    });
    // cumeeira de madeira
    bx(wood, CUTX - XR0, 0.16, 0.08, (XR0 + CUTX) / 2, RID - 0.18, RZ, woodC);
  }
  // telhas: tiras de capa-canal (0,6 m × 0,4 m) instanciadas, cor variando
  const tileGeo = (() => {
    const nx = 18, nz = 3, pos = [], idx = [];
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const x = -0.5 + i / nx, z = -0.21 + (0.42 * j) / nz, y = 0.05 * (0.5 + 0.5 * Math.cos(2 * Math.PI * x * 3)) + 0.03 * (j / nz); pos.push(x, y, z); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, dd = c + 1; idx.push(a, c, b, b, c, dd); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  })();
  const TW = 0.6, tilesList = [];
  { const ang = Math.atan(SLOPE), run = Z1 - RZ + OVZ, sl = run / Math.cos(ang), nRows = Math.ceil(sl / 0.38), nCols = Math.round((XR1 - XR0) / TW), rd = L.rng(31), base = new THREE.Color('#c25a3c');
    [1, -1].forEach((s) => {
      for (let r = 0; r < nRows; r++) for (let c = 0; c < nCols; c++) {
        const along = sl - 0.19 - r * 0.38, hz = along * Math.cos(ang), z = RZ + s * hz, x = XR0 + TW * (c + 0.5);
        if (inCut(x, z)) continue;
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, s > 0 ? 0 : Math.PI, 0)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), ang));
        tilesList.push({ p: new THREE.Vector3(x, roofY(z) - 0.05, z), q, col: base.clone().offsetHSL(0, (rd() - 0.5) * 0.06, (rd() - 0.5) * 0.08) });
      }
    });
  }
  const tileMesh = new THREE.InstancedMesh(tileGeo, L.mat('#ffffff', { roughness: 0.7, side: THREE.DoubleSide }), tilesList.length);
  { const mm = new THREE.Matrix4(), sc = new THREE.Vector3(TW * 1.01, 1, 1); tilesList.forEach((t, i) => { mm.compose(t.p, t.q, sc); tileMesh.setMatrixAt(i, mm); tileMesh.setColorAt(i, t.col); }); }
  tileMesh.castShadow = tileMesh.receiveShadow = true; root.add(tileMesh);
  // cumeeira cerâmica (meia-cana) até o recorte
  { const n = Math.round((CUTX - XR0) / 0.4); for (let i = 0; i < n; i++) m.add(G.cyl(0.13, 0.15, 0.4, 10, true, 0, Math.PI), '#a84a32', TM(XR0 + 0.2 + i * 0.4, RID - 0.02, RZ, 0, 0, Math.PI / 2)); }
  // faces do corte do telhado (espessura telha+ripa+caibro) — plano x = CUTX (água da frente e trecho da de trás) e z = CUTZ
  { const th = 0.2, strip = (za, zb) => { const P = []; for (let i = 0; i <= 10; i++) { const z = za + (zb - za) * i / 10; P.push([z, roofY(z) + 0.01]); } for (let i = 10; i >= 0; i--) { const z = za + (zb - za) * i / 10; P.push([z, roofY(z) - th]); } return P; };
    [[CUTZ, RZ], [RZ, Z1 + OVZ]].forEach(([za, zb]) => { const g = G.shape(strip(za, zb).map(([z, y]) => [-z, y])); g.rotateY(Math.PI / 2); g.translate(CUTX + 0.002, 0, 0); m.add(g, '#b8573a'); });
    const yz = roofY(CUTZ); bx(m, XR1 - CUTX, th + 0.01, 0.006, (CUTX + XR1) / 2, yz - th / 2 + 0.005, CUTZ + 0.003, '#b8573a');
    // beiral: testeiras brancas e forro do beiral (fora do recorte)
    [1, -1].forEach((s) => { const z = RZ + s * (Z1 - RZ + OVZ); const xb = s > 0 ? CUTX : XR1; bx(m, xb - XR0, 0.18, 0.03, (XR0 + xb) / 2, roofY(z) - 0.1, z + s * 0.015, '#f4f1ea'); });
  }
  // calha e condutor da frente (lado esquerdo, fora do recorte)
  { const z = Z1 + OVZ + 0.08, y = roofY(Z1 + OVZ) - 0.22; m.add(G.box(CUTX - XR0, 0.1, 0.12), '#e3e6e8', TM((XR0 + CUTX) / 2, y, z)); m.rod([XR0 + 0.3, y, z], [XR0 + 0.3, 0.1, z], 0.045, '#e3e6e8', 10); }

  /* ---------- muro da frente, mureta do cavalete (nicho) e portão ---------- */
  const WZ0 = Hh.wall.z - 0.18, WZ1 = Hh.wall.z, WH = Hh.wall.h, LX0 = Lo.LOTS.hero.x0, LX1 = Lo.LOTS.hero.x1;
  const NICHE = { x0: 2.32, x1: 3.62, y0: 0.32, y1: 1.32, z0: 21.0, z1: WZ1 };   // nicho da caixa do hidrômetro
  const PIL = { x0: 2.2, x1: 3.74, z0: 20.92 };
  const GATE = { x0: -1.3, x1: -0.2 };
  { const MURO = '#e9e1d2', CAP = '#b9b2a4';
    const seg = (a, b) => { bx(m, b - a, WH, WZ1 - WZ0, (a + b) / 2, WH / 2, (WZ0 + WZ1) / 2, MURO); bx(m, b - a + 0.02, 0.05, WZ1 - WZ0 + 0.06, (a + b) / 2, WH + 0.025, (WZ0 + WZ1) / 2, CAP); };
    seg(LX0, GATE.x0); seg(GATE.x1, PIL.x0); seg(PIL.x1, LX1);
    // mureta do cavalete: bloco maciço com o nicho aberto para a calçada
    const pz = (PIL.z0 + WZ1) / 2, pd = WZ1 - PIL.z0, px = (PIL.x0 + PIL.x1) / 2;
    bx(m, PIL.x1 - PIL.x0, NICHE.y0, pd, px, NICHE.y0 / 2, pz, MURO);                                     // base
    bx(m, PIL.x1 - PIL.x0, WH - NICHE.y1, pd, px, (WH + NICHE.y1) / 2, pz, MURO);                          // verga
    bx(m, NICHE.x0 - PIL.x0, NICHE.y1 - NICHE.y0, pd, (PIL.x0 + NICHE.x0) / 2, (NICHE.y0 + NICHE.y1) / 2, pz, MURO);
    bx(m, PIL.x1 - NICHE.x1, NICHE.y1 - NICHE.y0, pd, (PIL.x1 + NICHE.x1) / 2, (NICHE.y0 + NICHE.y1) / 2, pz, MURO);
    bx(m, NICHE.x1 - NICHE.x0, NICHE.y1 - NICHE.y0, NICHE.z0 - PIL.z0, px, (NICHE.y0 + NICHE.y1) / 2, (PIL.z0 + NICHE.z0) / 2, MURO); // fundo
    bx(m, PIL.x1 - PIL.x0 + 0.04, 0.06, pd + 0.06, px, WH + 0.03, pz, CAP);
    // pilares do portão e portão de grade
    [GATE.x0 - 0.1, GATE.x1 + 0.1].forEach((x) => { bx(m, 0.2, WH + 0.15, 0.24, x, (WH + 0.15) / 2, (WZ0 + WZ1) / 2, MURO); bx(m, 0.26, 0.06, 0.3, x, WH + 0.18, (WZ0 + WZ1) / 2, CAP); });
    const gz = (WZ0 + WZ1) / 2; for (let i = 0; i <= 9; i++) metal.rod([GATE.x0 + 0.04 + i * (GATE.x1 - GATE.x0 - 0.08) / 9, 0.06, gz], [GATE.x0 + 0.04 + i * (GATE.x1 - GATE.x0 - 0.08) / 9, WH - 0.08, gz], 0.012, '#2d343a', 6);
    [0.12, WH / 2, WH - 0.1].forEach((y) => bx(metal, GATE.x1 - GATE.x0 - 0.04, 0.04, 0.03, (GATE.x0 + GATE.x1) / 2, y, gz, '#2d343a'));
    // número da casa (placa)
    bx(m, 0.22, 0.14, 0.015, 1.2, 1.25, WZ1 + 0.008, '#2f5d73');
  }
  // lote: caminho de concreto do portão à casa e grama (com raio-x)
  const yardM = vmat({ roughness: 0.9, transparent: false });
  const yard = new Merge();
  { const gx = (GATE.x0 + GATE.x1) / 2; yard.add(G.box(1.1, 0.03, WZ0 - Z1), '#cfc8ba', TM(gx, 0.015, (Z1 + WZ0) / 2));
    yard.add(G.box(GATE.x0 - LX0 - 0.05, 0.02, WZ0 - Z1), '#6aa84f', TM((LX0 + GATE.x0 - 0.05) / 2, 0.01, (Z1 + WZ0) / 2));
    yard.add(G.box(PIL.x0 - GATE.x1 - 0.05, 0.02, WZ0 - Z1), '#6aa84f', TM((GATE.x1 + 0.05 + PIL.x0) / 2, 0.01, (Z1 + WZ0) / 2));
    yard.add(G.box(LX1 - PIL.x1, 0.02, WZ0 - Z1), '#6aa84f', TM((PIL.x1 + LX1) / 2, 0.01, (Z1 + WZ0) / 2));
    yard.add(G.box(PIL.x1 - PIL.x0, 0.02, PIL.z0 - Z1), '#6aa84f', TM((PIL.x0 + PIL.x1) / 2, 0.01, (Z1 + PIL.z0) / 2)); }
  const yardMesh = yard.mesh(yardM); yardMesh.castShadow = false; root.add(yardMesh);
  // arbusto e vaso de flores no jardim
  { const pm = new Merge(); [[-4.2, 20.4], [-3.0, 20.6], [4.6, 20.3]].forEach(([x, z], i) => pm.add(new THREE.IcosahedronGeometry(0.35 + (i % 2) * 0.12, 1), i % 2 ? '#4f9a3c' : '#3f8a35', TM(x, 0.3, z, 0, i, 0, 1, 0.8, 1))); const pmesh = pm.mesh(vmat({ roughness: 0.9, flatShading: true })); root.add(pmesh); }

  const mainMesh = m.mesh(vmat({ roughness: 0.78 })); root.add(mainMesh);
  const woodMesh = wood.mesh(vmat({ roughness: 0.85 })); root.add(woodMesh);
  const metalMesh = metal.mesh(vmat({ roughness: 0.22, metalness: 0.9 })); root.add(metalMesh);
  L.shadows(root);
  floorMesh.castShadow = false; tiles.castShadow = false; yardMesh.castShadow = false;

  // luz da cozinha (pendente): acesa só quando a câmera está perto da casa (ver casa.js)
  const lamp = new THREE.PointLight('#ffd9a0', 1.6, 5.5, 1.6); lamp.position.set(-2.6, lampY - 0.05, 17.6); root.add(lamp);
  const fill = new THREE.PointLight('#cfe6ff', 0.9, 6, 1.5); fill.position.set(-2.2, 2.2, 19.6); root.add(fill);

  return { root, lamp, fill, yardM, NICHE, PIL, CU, IZ0, TOPY, ATT, TOP, SL, roofY, CUTX, CUTZ, WZ0, WZ1, BX0, KX1 };
}
