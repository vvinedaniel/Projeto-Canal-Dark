// POÇO DE SUCÇÃO + CASA DE BOMBAS + escavação. O chão do pátio é "aberto" por uma máscara de profundidade (R.mask)
// sobre a cava (x 0…8, z −99,5…−90,5): vemos o poço em corte pela frente (z = −92,5), a vala da frente com paredes de
// solo e, em cima, a casa de bombas com a frente aberta em z = INTAKE.cut. A escavadeira (Ep. 02) abre a cava.
import { makeMachines } from './machines.js';

export function buildHouse(ctx, K, R) {
  const { L, THREE, Lo, ghost, shared } = ctx, { MAT, M, bake, boxC, cylA } = K, I = Lo.INTAKE, HS = I.house;
  const u = (k, a, b) => L.clamp01((k - a) / (b - a)), E = L.ease;
  const g = new THREE.Group(); g.name = 'captacao.house'; R.root.add(g);
  const soilM = shared.soilMat || M('#7b5a3c', { roughness: 0.95 });

  /* ---------- cotas ---------- */
  const PIT = { x0: 0, x1: 8, z0: -99.5, z1: -90.5, bot: -4.4, top: 4.0 };
  const WELL = { x0: I.well.x0, x1: I.well.x1, z0: I.well.z0, cut: -92.5, floor: I.well.floor, wall: 0.5 };
  const LEVEL = 2.4;  // nível de operação no poço (abaixo do nível da represa por causa da perda de carga)
  R.PIT = PIT; R.WELL = WELL; R.LEVEL = LEVEL;

  /* ---------- cava (paredes de solo + "aterro" que desce com a escavação) ---------- */
  const pit = new THREE.Group(); g.add(pit);
  {
    const p = new THREE.Group(), q = (a, b, c, d) => L.mesh(K.quadGeo(a, b, c, d), soilM, 0, 0, 0, { cast: false });
    p.add(q([PIT.x0, PIT.bot, PIT.z1], [PIT.x0, PIT.bot, PIT.z0], [PIT.x0, PIT.top, PIT.z0], [PIT.x0, PIT.top, PIT.z1]));   // lado esquerdo (olha +x)
    p.add(q([PIT.x1, PIT.bot, PIT.z0], [PIT.x1, PIT.bot, PIT.z1], [PIT.x1, PIT.top, PIT.z1], [PIT.x1, PIT.top, PIT.z0]));   // lado direito (olha −x)
    p.add(q([PIT.x0, PIT.bot, PIT.z0], [PIT.x1, PIT.bot, PIT.z0], [PIT.x1, PIT.top, PIT.z0], [PIT.x0, PIT.top, PIT.z0]));   // fundo (olha +z)
    p.add(q([PIT.x1, PIT.bot, PIT.z1], [PIT.x0, PIT.bot, PIT.z1], [PIT.x0, PIT.top, PIT.z1], [PIT.x1, PIT.top, PIT.z1]));   // frente da vala (olha −z)
    // faixas de reaterro entre a cava e as paredes do poço, vistas no corte
    [[PIT.x0, WELL.x0 - WELL.wall], [WELL.x1 + WELL.wall, PIT.x1]].forEach(([a, b]) => p.add(q([a, PIT.bot, WELL.cut], [b, PIT.bot, WELL.cut], [b, PIT.top, WELL.cut], [a, PIT.top, WELL.cut])));
    p.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    pit.add(p);
  }
  const fill = L.mesh(new THREE.PlaneGeometry(PIT.x1 - PIT.x0, PIT.z1 - PIT.z0), M('#7a5a3e', { roughness: 0.97 }), (PIT.x0 + PIT.x1) / 2, PIT.top, (PIT.z0 + PIT.z1) / 2, { cast: false });
  fill.rotation.x = -Math.PI / 2; g.add(fill);
  const pitMask = R.mask(PIT.x0, PIT.x1, PIT.z0, PIT.z1, PIT.top + 0.03);

  /* ---------- poço de sucção (concreto, aberto pela frente) ---------- */
  const wellG = new THREE.Group(); wellG.position.y = PIT.bot; g.add(wellG);
  const wellFloor = bake(L.put(new THREE.Group(), boxC(WELL.x0 - WELL.wall, WELL.x1 + WELL.wall, PIT.bot, WELL.floor, PIT.z0, WELL.cut, MAT.conc)));
  wellFloor.position.y = -PIT.bot; wellG.add(wellFloor);
  const wellWalls = new THREE.Group(); wellG.add(wellWalls);
  {
    const w = new THREE.Group(), rel = (y) => y - PIT.bot, top = rel(HS.floor - 0.3), c = MAT.conc, ww = WELL.wall;
    w.add(boxC(WELL.x0 - ww, WELL.x0, rel(WELL.floor), top, PIT.z0, WELL.cut, c), boxC(WELL.x1, WELL.x1 + ww, rel(WELL.floor), top, PIT.z0, WELL.cut, c));
    // parede de trás com o furo do tubo da torre
    const py = rel(R.PIPE.y), pr = R.PIPE.r + 0.04;
    w.add(boxC(WELL.x0, WELL.x1, rel(WELL.floor), py - pr, PIT.z0, WELL.z0, c), boxC(WELL.x0, WELL.x1, py + pr, top, PIT.z0, WELL.z0, c));
    w.add(boxC(WELL.x0, I.x - pr, py - pr, py + pr, PIT.z0, WELL.z0, c), boxC(I.x + pr, WELL.x1, py - pr, py + pr, PIT.z0, WELL.z0, c));
    // faces de corte (z = cut) em cor de corte
    [[WELL.x0 - ww, WELL.x0], [WELL.x1, WELL.x1 + ww]].forEach(([a, b]) => w.add(boxC(a, b, rel(PIT.bot) + 0.0, top, WELL.cut - 0.01, WELL.cut + 0.006, MAT.cut)));
    w.add(boxC(WELL.x0 - ww, WELL.x1 + ww, 0, rel(WELL.floor), WELL.cut - 0.01, WELL.cut + 0.006, MAT.cut));
    // escada de marinheiro e mísula
    const lx = WELL.x1 - 0.5;
    [WELL.z0 + 0.18].forEach((z) => { [lx - 0.22, lx + 0.22].forEach((x) => w.add(boxC(x - 0.02, x + 0.02, rel(WELL.floor) + 0.3, top, z - 0.02, z + 0.02, MAT.galv))); for (let y = rel(WELL.floor) + 0.5; y < top; y += 0.32) w.add(cylA(0.016, 0.44, MAT.galv, lx, y, z, 'x', 6)); });
    // marca de nível (régua) pintada na parede de trás
    for (let y = rel(WELL.floor) + 0.5; y < top - 0.5; y += 0.5) w.add(boxC(1.3, (Math.round((y - rel(WELL.floor)) / 0.5) % 2 ? 1.5 : 1.7), y - 0.025, y + 0.025, WELL.z0 + 0.002, WELL.z0 + 0.01, M('#e8c234', { roughness: 0.6 })));
    wellWalls.add(bake(w));
  }
  // boca do tubo que vem da torre (dentro do poço), com flange
  const mouth = bake(L.put(new THREE.Group(), cylA(R.PIPE.r * 1.08, 0.35, MAT.rawPipeD, I.x, R.PIPE.y, WELL.z0 + 0.12, 'z', 24)));
  g.add(mouth);
  // água do poço (lista opaca com mistura: aparece antes da máscara e deixa ver a sucção dentro)
  const wm = K.blendWater(Lo.WATER.lake, 0.62); wm.side = THREE.FrontSide;
  const wbox = new THREE.BoxGeometry(WELL.x1 - WELL.x0 - 0.01, 1, WELL.cut - WELL.z0 - 0.02); wbox.translate((WELL.x0 + WELL.x1) / 2, 0.5, (WELL.z0 + WELL.cut) / 2 - 0.005);
  const wellWater = L.mesh(wbox, wm, 0, WELL.floor, 0, { cast: false }); wellWater.renderOrder = 10; wellWater.receiveShadow = false; g.add(wellWater);

  /* ---------- casa de bombas ---------- */
  const house = new THREE.Group(); g.add(house);
  const floorSlab = bake(L.put(new THREE.Group(),
    boxC(HS.x0, HS.x1, HS.floor - 0.3, HS.floor, HS.z0, HS.z1, MAT.conc),
    boxC(HS.x0, HS.x1, HS.floor - 0.3, HS.floor + 0.004, HS.z1 - 0.012, HS.z1 + 0.004, MAT.cut),
    // embasamento (sobe do talude/margem até o piso) e muro de cais atrás
    boxC(HS.x0 - 0.06, HS.x0 + 0.3, 3.4, HS.floor, HS.z0, HS.z1, MAT.concDark), boxC(HS.x1 - 0.3, HS.x1 + 0.06, 3.4, HS.floor, HS.z0, HS.z1, MAT.concDark),
    boxC(HS.x0 - 0.06, HS.x1 + 0.06, -1.0, HS.floor, HS.z0 - 0.06, HS.z0 + 0.3, MAT.concDark)));
  house.add(floorSlab);
  // pilares (sobem primeiro), paredes e cobertura
  const pillars = new THREE.Group(); pillars.position.y = HS.floor; house.add(pillars);
  const H = HS.roof - 0.3 - HS.floor; // altura livre até a laje
  {
    const p = new THREE.Group(), c = MAT.conc;
    [[HS.x0, HS.z0], [HS.x1, HS.z0], [HS.x0, HS.z1], [HS.x1, HS.z1], [HS.x0, (HS.z0 + HS.z1) / 2], [HS.x1, (HS.z0 + HS.z1) / 2]].forEach(([x, z]) => {
      const x0 = x === HS.x0 ? x - 0.08 : x - 0.37, z0 = z === HS.z0 ? z - 0.08 : z === HS.z1 ? z - 0.4 : z - 0.2;
      p.add(boxC(x0, x0 + 0.45, 0, H, z0, z0 + 0.4 + (z === HS.z1 ? 0.0 : 0.08), c));
      if (z === HS.z1) p.add(boxC(x0, x0 + 0.45, 0, H, HS.z1 - 0.012, HS.z1 + 0.004, MAT.cut));
    });
    pillars.add(bake(p));
  }
  const wallsG = new THREE.Group(); wallsG.position.y = HS.floor; house.add(wallsG);
  const DOOR = { z0: -97.7, z1: -94.5, top: 4.05 };   // porta de carga do lado direito (y relativo ao piso)
  const BDOOR = { x0: 3.4, x1: 4.6, top: 2.3 };       // porta da passarela (atrás)
  {
    const w = new THREE.Group(), pm = MAT.plaster, t = 0.3;
    // lateral esquerda com janela
    const WIN = { z0: -97.2, z1: -94.4, y0: 1.7, y1: 3.6 };
    w.add(boxC(HS.x0, HS.x0 + t, 0, WIN.y0, HS.z0, HS.z1, pm), boxC(HS.x0, HS.x0 + t, WIN.y1, H, HS.z0, HS.z1, pm), boxC(HS.x0, HS.x0 + t, WIN.y0, WIN.y1, HS.z0, WIN.z0, pm), boxC(HS.x0, HS.x0 + t, WIN.y0, WIN.y1, WIN.z1, HS.z1, pm));
    w.add(boxC(HS.x0 + 0.12, HS.x0 + 0.16, WIN.y0, WIN.y1, WIN.z0, WIN.z1, MAT.glass));
    for (let z = WIN.z0; z <= WIN.z1 + 1e-6; z += (WIN.z1 - WIN.z0) / 4) w.add(boxC(HS.x0 + 0.1, HS.x0 + 0.18, WIN.y0, WIN.y1, z - 0.03, z + 0.03, MAT.dark));
    w.add(boxC(HS.x0 + 0.1, HS.x0 + 0.18, WIN.y0 - 0.04, WIN.y0 + 0.02, WIN.z0, WIN.z1, MAT.dark), boxC(HS.x0 + 0.1, HS.x0 + 0.18, WIN.y1 - 0.02, WIN.y1 + 0.04, WIN.z0, WIN.z1, MAT.dark));
    // lateral direita com a porta de carga (monovia passa por cima)
    w.add(boxC(HS.x1 - t, HS.x1, 0, H, HS.z0, DOOR.z0, pm), boxC(HS.x1 - t, HS.x1, 0, H, DOOR.z1, HS.z1, pm), boxC(HS.x1 - t, HS.x1, DOOR.top + 0.4, H, DOOR.z0, DOOR.z1, pm));
    w.add(boxC(HS.x1 - t - 0.02, HS.x1 + 0.02, DOOR.top + 0.25, DOOR.top + 0.4, DOOR.z0 - 0.1, DOOR.z1 + 0.1, MAT.conc)); // verga
    // fundo com a porta da passarela e duas janelas altas
    const BW = [{ x0: 1.0, x1: 2.6 }, { x0: 5.4, x1: 7.0 }], by0 = 2.0, by1 = 3.7;
    w.add(boxC(HS.x0 + t, BDOOR.x0, 0, by0, HS.z0, HS.z0 + t, pm), boxC(BDOOR.x1, HS.x1 - t, 0, by0, HS.z0, HS.z0 + t, pm), boxC(BDOOR.x0, BDOOR.x1, BDOOR.top, by0, HS.z0, HS.z0 + t, pm));
    w.add(boxC(HS.x0 + t, HS.x1 - t, by1, H, HS.z0, HS.z0 + t, pm));
    w.add(boxC(HS.x0 + t, BW[0].x0, by0, by1, HS.z0, HS.z0 + t, pm), boxC(BW[0].x1, BW[1].x0, by0, by1, HS.z0, HS.z0 + t, pm), boxC(BW[1].x1, HS.x1 - t, by0, by1, HS.z0, HS.z0 + t, pm));
    BW.forEach((wn) => { w.add(boxC(wn.x0, wn.x1, by0, by1, HS.z0 + 0.12, HS.z0 + 0.16, MAT.glass)); for (let x = wn.x0; x <= wn.x1 + 1e-6; x += (wn.x1 - wn.x0) / 3) w.add(boxC(x - 0.03, x + 0.03, by0, by1, HS.z0 + 0.1, HS.z0 + 0.18, MAT.dark)); });
    w.add(boxC(BDOOR.x0 - 0.06, BDOOR.x0, 0, BDOOR.top, HS.z0, HS.z0 + t + 0.04, MAT.dark), boxC(BDOOR.x1, BDOOR.x1 + 0.06, 0, BDOOR.top, HS.z0, HS.z0 + t + 0.04, MAT.dark));
    // faces de corte das paredes laterais (frente)
    [[HS.x0, HS.x0 + t], [HS.x1 - t, HS.x1]].forEach(([a, b]) => w.add(boxC(a, b, 0, H, HS.z1 - 0.012, HS.z1 + 0.004, MAT.cut)));
    // rodapé interno e painel elétrico (quadro de comando das bombas)
    w.add(boxC(0.45, 1.55, 0.35, 2.35, HS.z0 + t, HS.z0 + t + 0.42, M('#c9ced2', { roughness: 0.5, metalness: 0.3 })));
    w.add(boxC(0.48, 1.0, 0.4, 2.3, HS.z0 + t + 0.42, HS.z0 + t + 0.44, MAT.dark), boxC(1.0, 1.52, 0.4, 2.3, HS.z0 + t + 0.42, HS.z0 + t + 0.44, MAT.dark));
    [[0.62, 2.0, '#3df07a'], [0.82, 2.0, '#ff5a4e'], [1.16, 2.0, '#3df07a'], [1.36, 2.0, '#f6c12c']].forEach(([x, y, col]) => w.add(L.mesh(new THREE.CircleGeometry(0.04, 10), L.glow(col, 1.2), x, y, HS.z0 + t + 0.446)));
    w.add(boxC(0.9, 1.1, 2.35, H, HS.z0 + t + 0.05, HS.z0 + t + 0.25, MAT.galv)); // eletroduto vertical até a eletrocalha
    w.add(boxC(0.6, HS.x1 - 0.6, H - 0.55, H - 0.45, HS.z0 + t + 0.02, HS.z0 + t + 0.42, MAT.galv)); // eletrocalha
    wallsG.add(bake(w));
  }
  const roof = new THREE.Group(); house.add(roof);
  {
    const r = new THREE.Group(), y0 = HS.roof - 0.3;
    r.add(boxC(HS.x0 - 0.35, HS.x1 + 0.35, y0, HS.roof, HS.z0 - 0.35, HS.z1, MAT.conc));
    r.add(boxC(HS.x0 - 0.35, HS.x1 + 0.35, y0, HS.roof + 0.004, HS.z1 - 0.012, HS.z1 + 0.004, MAT.cut));
    r.add(boxC(HS.x0 - 0.35, HS.x1 + 0.35, HS.roof, HS.roof + 0.45, HS.z0 - 0.35, HS.z0 - 0.15, MAT.conc), boxC(HS.x0 - 0.35, HS.x0 - 0.15, HS.roof, HS.roof + 0.45, HS.z0 - 0.35, HS.z1, MAT.conc), boxC(HS.x1 + 0.15, HS.x1 + 0.35, HS.roof, HS.roof + 0.45, HS.z0 - 0.35, HS.z1, MAT.conc)); // platibanda
    r.add(boxC(HS.x0 - 0.35, HS.x1 + 0.35, HS.roof, HS.roof + 0.45, HS.z1 - 0.012, HS.z1 + 0.004, MAT.cut));
    for (let x = 1.6; x < HS.x1; x += 2.4) r.add(boxC(x - 0.15, x + 0.15, y0 - 0.45, y0, HS.z0, HS.z1, MAT.conc)); // vigas
    r.add(boxC(HS.x0, HS.x1, y0 - 0.45, y0, HS.z1 - 0.3, HS.z1, MAT.conc), boxC(HS.x0 - 0.35, HS.x1 + 0.35, HS.roof + 0.03, HS.roof + 0.06, HS.z0 - 0.15, HS.z1, M('#6e777d', { roughness: 0.9 }))); // viga da frente, manta
    // luminárias
    [2.2, 5.8].forEach((x) => { r.add(boxC(x - 0.5, x + 0.5, y0 - 0.12, y0, -97.4, -97.2, MAT.galv)); r.add(L.mesh(new THREE.PlaneGeometry(0.95, 0.15).rotateX(Math.PI / 2), L.glow('#fff4d6', 0.9), x, y0 - 0.125, -97.3, { cast: false })); });
    roof.add(bake(r));
  }

  /* ---------- monovia com talha (desce os conjuntos motobomba) ---------- */
  const MONO = { y: HS.roof - 0.75 - 0.32, z: -96.7, x0: 0.5, x1: 11.2 };
  R.MONO = MONO;
  const mono = new THREE.Group(); g.add(mono);
  {
    const m = new THREE.Group(), y = MONO.y, b = MAT.beam;
    m.add(boxC(MONO.x0, MONO.x1, y, y + 0.03, MONO.z - 0.13, MONO.z + 0.13, b), boxC(MONO.x0, MONO.x1, y + 0.03, y + 0.3, MONO.z - 0.015, MONO.z + 0.015, b), boxC(MONO.x0, MONO.x1, y + 0.3, y + 0.33, MONO.z - 0.13, MONO.z + 0.13, b));
    for (let x = 1.6; x < HS.x1; x += 2.4) m.add(boxC(x - 0.06, x + 0.06, y + 0.33, HS.roof - 0.75, MONO.z - 0.06, MONO.z + 0.06, MAT.galv)); // pendurais nas vigas
    m.add(boxC(10.95, 11.15, 4.0, y + 0.33, MONO.z - 0.1, MONO.z + 0.1, b), boxC(10.6, 11.5, 3.95, 4.05, MONO.z - 0.45, MONO.z + 0.45, MAT.conc)); // pilarete externo
    m.add(K.rod([10.2, y + 0.33, MONO.z], [11.05, y - 0.8, MONO.z], 0.05, b, 6));
    m.add(boxC(MONO.x1 - 0.05, MONO.x1, y - 0.12, y + 0.42, MONO.z - 0.15, MONO.z + 0.15, MAT.red)); // batente
    mono.add(bake(m));
  }
  // talha: carro, bloco, corrente, gancho
  const hoist = new THREE.Group(); mono.add(hoist);
  const chainLen = new THREE.Group(); hoist.add(chainLen);
  {
    const h = new THREE.Group(), y = MONO.y;
    h.add(boxC(-0.3, 0.3, y - 0.12, y, MONO.z - 0.22, MONO.z + 0.22, MAT.yellow));
    [-0.2, 0.2].forEach((x) => [-0.17, 0.17].forEach((z) => h.add(cylA(0.07, 0.04, MAT.dark, x, y + 0.08, MONO.z + z, 'z', 12))));
    h.add(L.rbox(0.42, 0.5, 0.36, 0.05, MAT.yellow, 0, y - 0.4, MONO.z), cylA(0.16, 0.2, MAT.yellow, 0.3, y - 0.4, MONO.z, 'x', 16));
    h.add(L.rbox(0.12, 0.22, 0.1, 0.02, MAT.dark, 0.35, y - 0.9, MONO.z + 0.2)); // botoeira
    hoist.add(bake(h));
    hoist.add(K.rod([0.35, y - 0.65, MONO.z + 0.2], [0.35, y - 0.8, MONO.z + 0.2], 0.008, MAT.dark, 4));
  }
  const chain = cylA(0.025, 1, MAT.chain, 0, 0, MONO.z, 'y', 6); chainLen.add(chain);
  const hook = new THREE.Group(); chainLen.add(hook);
  hook.add(bake(L.put(new THREE.Group(), L.rbox(0.18, 0.22, 0.14, 0.03, MAT.yellow, 0, 0.0, MONO.z), L.torus(0.09, 0.025, MAT.steel, 0, -0.2, MONO.z))));
  R.hoist = { group: hoist, chain, hook, y0: MONO.y - 0.65 };
  /** posiciona a talha: x do carro, y do gancho (mundo) */
  R.setHoist = (x, yHook) => {
    hoist.position.x = x;
    const top = R.hoist.y0, len = Math.max(0.05, top - yHook);
    chain.scale.y = len; chain.position.y = top - len / 2; hook.position.y = yHook + 0.12;
  };

  /* ---------- redemoinho na sucção da bomba 1 e partículas descendo ---------- */
  const vort = (() => {
    const N = 64, M2 = 6, pos = [], col = [], idx = [], c0 = new THREE.Color(Lo.WATER.lake), c1 = new THREE.Color('#dff4ee');
    for (let j = 0; j <= M2; j++) for (let i = 0; i <= N; i++) {
      const a = (i / N) * L.TAU, r = L.lerp(0.26, 1.15, j / M2), dip = -0.22 * Math.pow(1 - j / M2, 2);
      pos.push(Math.cos(a) * r, dip, Math.sin(a) * r);
      const arm = Math.pow(0.5 + 0.5 * Math.cos(3 * a + 6 * (r - 0.26)), 6) * (1 - j / M2 * 0.8);
      const cc = c0.clone().lerp(c1, arm * 0.85); col.push(cc.r, cc.g, cc.b);
    }
    for (let j = 0; j < M2; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = K.blendWater('#ffffff', 0.7); m.vertexColors = true;
    const v = L.mesh(geo, m, 0, 0, 0, { cast: false }); v.renderOrder = 11; return v;
  })();
  g.add(vort);
  const SUCT = R.SUCT = { x: I.pumps[0].x, z: I.pumpZ + 1.1 };   // eixo do tubo de sucção da bomba 1
  vort.position.set(SUCT.x, LEVEL + 0.012, SUCT.z);
  const helix = []; for (let i = 0; i <= 40; i++) { const f = i / 40, a = f * 11, r = L.lerp(1.0, 0.42, Math.pow(f, 0.6)); helix.push([SUCT.x + Math.cos(a) * r, L.lerp(LEVEL - 0.05, -2.7, f), SUCT.z + Math.sin(a) * r]); }
  const swirl = new L.Flow(L.curve(helix), { n: 46, size: 0.045, colors: ['#e6dccb', '#c7b08c', '#f2efe6'], seed: 31 }); g.add(swirl.mesh);
  // setas: boca do tubo → crivo da bomba 1
  const inChev = new L.Chevrons(L.curve([[I.x, R.PIPE.y, WELL.z0 + 0.6], [I.x - 0.3, R.PIPE.y - 0.2, -97.4], [SUCT.x + 0.4, -2.3, -95.6], [SUCT.x, -2.0, SUCT.z + 0.1]]), { n: 4, size: 0.3, normal: [0, 0, 1], material: L.flat(L.PAL.accent, { toneMapped: false }) });
  g.add(inChev.mesh);

  /* ---------- escavadeira (Ep. 02) e monte de terra ---------- */
  const MC = makeMachines(L, K), exc = MC.excavator();
  const EXS = 1.15, EX = { x: 11.4, z: -95.6 };
  exc.root.scale.setScalar(EXS); exc.root.rotation.y = Math.PI; g.add(exc.root);
  const spoil = L.sph(1, M('#7b5838', { roughness: 1, flatShading: true }), EX.x + 0.4, 4.0, EX.z + 5.6); spoil.geometry = new THREE.SphereGeometry(1, 14, 8); g.add(spoil);
  function setExcavator(k, t) {
    const on = k > 0 && k < 0.86; exc.root.visible = on; if (!on) { spoil.visible = k > 0 && k < 0.8; return; }
    const lv = R.fillLevel;
    // ciclos de escavação (0–0,56); depois manobra e sai pelo pátio (+x)
    const kc = u(k, 0.0, 0.56) * 3.0, ph = kc - Math.floor(kc), digging = k < 0.56;
    const base = (4.0 + 1.05 * EXS);
    const depth = Math.max(-5.2, (lv + 0.6 - base) / EXS), out = 5.6;
    let slew = 0, p = [out, 1.4], bucket, load = 0;
    if (digging) {
      if (ph < 0.32) { const f = E.io(ph / 0.32); p = [L.lerp(out + 0.4, out - 1.6, f), L.lerp(1.4, depth, Math.sin(Math.min(1, f * 1.6) * Math.PI / 2))]; bucket = L.lerp(-2.2, -0.9, f); load = f; }
      else if (ph < 0.5) { const f = E.io((ph - 0.32) / 0.18); p = [L.lerp(out - 1.6, out - 0.6, f), L.lerp(depth, 2.6, f)]; bucket = -0.6; load = 1; }
      else if (ph < 0.72) { const f = E.io((ph - 0.5) / 0.22); slew = f * Math.PI / 2; p = [out - 0.6, 2.6]; bucket = -0.6; load = 1; }
      else if (ph < 0.84) { const f = E.io((ph - 0.72) / 0.12); slew = Math.PI / 2; p = [out - 0.6, 2.6 - f * 0.6]; bucket = L.lerp(-0.6, -2.6, f); load = 1 - f; }
      else { const f = E.io((ph - 0.84) / 0.16); slew = (1 - f) * Math.PI / 2; p = [L.lerp(out - 0.6, out + 0.4, f), L.lerp(2.0, 1.4, f)]; bucket = L.lerp(-2.6, -2.2, f); }
    } else { const f = E.io(u(k, 0.56, 0.62)); p = [L.lerp(out, 3.4, f), L.lerp(1.4, 1.8, f)]; bucket = -2.4; }
    exc.pose({ slew, p, bucket, load });
    const drive = E.in(u(k, 0.62, 0.85)) * 16;
    exc.root.position.set(EX.x + drive, 4.0, EX.z); exc.setTracks(drive / EXS);
    spoil.visible = k < 0.8; const dug = u(k, 0.02, 0.56), haul = u(k, 0.62, 0.8);
    spoil.scale.set(0.5 + 2.2 * dug, 0.2 + 1.3 * dug, 0.5 + 1.8 * dug).multiplyScalar(Math.max(0.001, 1 - haul)); spoil.position.y = 3.9;
  }

  /* ---------- planta (contorno) ---------- */
  const plan = new THREE.Group();
  plan.add(boxC(HS.x0, HS.x1, HS.floor - 0.3, HS.roof, HS.z0, HS.z1, MAT.conc), boxC(WELL.x0 - WELL.wall, WELL.x1 + WELL.wall, PIT.bot, HS.floor - 0.3, PIT.z0, WELL.cut, MAT.conc));
  const planG = ghost.of(plan); g.add(planG);

  function update(t, S) {
    const k = S.build.intake, kp = S.build.pumps, run = S.run.pumps;
    // escavação: o "aterro" desce de 4,0 até o fundo da cava
    const ex = E.io(u(k, 0.02, 0.25));
    R.fillLevel = L.lerp(PIT.top, PIT.bot, ex);
    pitMask.visible = k > 0.004; pit.visible = k > 0.004;
    fill.visible = k > 0; fill.position.y = R.fillLevel + 0.005;
    setExcavator(k, t);
    // poço: laje de fundo, paredes subindo
    const kf = E.out(u(k, 0.24, 0.3)), kw = E.io(u(k, 0.28, 0.55));
    wellG.visible = kf > 0; wellFloor.visible = kf > 0; wellFloor.position.y = -PIT.bot + (1 - kf) * 1.2;
    wellWalls.visible = kw > 0; wellWalls.scale.y = Math.max(0.001, kw);
    mouth.visible = k > 0.5;
    // casa de bombas
    const ks = E.out(u(k, 0.55, 0.6)), kpi = E.io(u(k, 0.75, 0.83)), kwa = E.io(u(k, 0.8, 0.9)), kr = E.out(u(k, 0.88, 0.96)), km = E.out(u(k, 0.93, 1));
    house.visible = ks > 0; floorSlab.position.y = (1 - ks) * 1.5;
    pillars.visible = kpi > 0; pillars.scale.y = Math.max(0.001, kpi);
    wallsG.visible = kwa > 0; wallsG.scale.y = Math.max(0.001, kwa);
    roof.visible = kr > 0; roof.position.y = (1 - kr) * 3;
    mono.visible = km > 0; mono.position.y = (1 - km) * 1.5;
    // água no poço: enche depois que a comporta abre (sub-fase das bombas)
    const fillW = S.present ? 1 : E.io(u(kp, 0.15, 0.9));
    const lvl = L.lerp(WELL.floor, LEVEL, fillW);
    wellWater.visible = fillW > 0.003; wellWater.scale.y = Math.max(0.001, lvl - WELL.floor);
    // redemoinho e partículas só com a bomba 1 girando
    vort.visible = run > 0.02; vort.scale.setScalar(0.4 + 0.6 * run); vort.rotation.y = -t * 2.6; vort.position.y = LEVEL + 0.012;
    swirl.update(t, { speed: 0.22, amount: run });
    swirl.mesh.visible = run > 0.02;
    inChev.update(t, { speed: 0.4, amount: run > 0.3 ? 1 : 0 });
    planG.visible = S.ghost > 0.01 && k < 0.5;
  }
  return { update, PIT, WELL, LEVEL };
}
