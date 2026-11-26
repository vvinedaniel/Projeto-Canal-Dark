// AS TRÊS REDES DA RUA DA CASA, EM CORTE NA FACE DA FRENTE (eixos em z = Lo.ZF, metade de trás visível), Lo.NET:
//  • ÁGUA TRATADA (PVC DEFoFo azul, a mais rasa): água azul com volume + setas a partir do tê do tronco (x = 24),
//    bolsas a cada 6 m, tê do tronco, e o TÊ COM REGISTRO em P.house (derivação do ramal da casa; o ramal é do módulo casa).
//  • ESGOTO (PVC ocre, mais fundo): conteúdo marrom correndo para +x (ETE); poços de visita em corte (câmara com
//    meia-cana, laje, chaminé excêntrica com degraus, tampa "ESGOTO" na calçada).
//  • DRENAGEM (galeria de concreto em aduelas, a mais funda): água de chuva cinza-azulada correndo para +x (rio);
//    poços de visita (nicho + chaminé, tampa "PLUVIAL"), bocas de lobo (caixa sob a calçada, grelha na sarjeta).
import { SEWER_PV_X, DRAIN_PV_X, PV } from './faceholes.js';
export function buildFace(ctx, parts) {
  const { L, THREE, Lo, K, shared } = ctx, { G, TM, Merge, vmat } = K;
  const N = Lo.NET, ZF = Lo.ZF, X0 = Lo.X0, X1 = Lo.X1, DS = THREE.DoubleSide, P = Lo.P;
  const root = new THREE.Group(); root.position.z = 0;
  const XC = P.mainFace[0], XH = P.house[0];
  const sub = (k, a, b) => L.clamp01((k - a) / (b - a));
  /** meio cilindro ao longo de x, só a metade de trás (z ≤ 0) — peças cortadas pelo plano da face */
  const halfX = (r, len) => { const g = new THREE.CylinderGeometry(r, r, len, 18, 1, true, Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); return g; };
  const conc = L.mat('#b9bec2', { roughness: 0.9, side: DS }), concCut = L.mat('#9ea4a9', { roughness: 0.95, side: DS });

  /* ---------- ÁGUA ---------- */
  const SEGW = 124;
  const wMat = L.mat(N.water.color, { roughness: 0.4, side: DS }), wCut = L.mat('#1f5fa6', { roughness: 0.7, side: DS });
  const wp = L.cutPipe([[X0, N.water.y], [X1, N.water.y]], { r: N.water.r, wall: 0.035, seg: SEGW, radial: 16, mat: wMat, cutMat: wCut });
  wp.group.position.z = ZF; root.add(wp.group);
  const wIn = wp.waterIn(0.97, Lo.WATER.treated, 0.9);
  const uC = (XC - X0) / (X1 - X0);
  // bolsas (juntas) a cada 6 m: meio-anel na face
  const jm = new Merge();
  for (let x = X0 + 3; x < X1; x += 6) jm.add(G.torus(N.water.r + 0.035, 0.035, 6, 16, Math.PI), '#2667ad', TM(x, N.water.y, ZF, 0, Math.PI / 2, -Math.PI / 2));
  // tê do tronco (x = 24): bolsa mais larga + boca da derivação na parede de trás
  jm.add(halfX(N.water.r + 0.07, 0.6), '#2667ad', TM(XC, N.water.y, ZF));
  jm.add(G.cyl(0.27, 0.27, 0.45, 16), '#2f7fd6', TM(XC, N.water.y, ZF - 0.45, Math.PI / 2, 0, 0));
  // TÊ COM REGISTRO em P.house: tê (corpo + bolsa), toco da derivação para −z, registro de gaveta com cabeçote, haste de
  // manobra até a caixinha de registro na calçada (tampa "REG"), e luva de espera onde começa o ramal do módulo casa.
  const REG = { z: ZF - 0.85, y: N.water.y };
  jm.add(halfX(N.water.r + 0.06, 0.42), '#2667ad', TM(XH, N.water.y, ZF));
  jm.add(G.cyl(0.13, 0.15, 0.36, 14), '#2f7fd6', TM(XH, REG.y, ZF - N.water.r - 0.12, Math.PI / 2, 0, 0));
  jm.add(G.box(0.32, 0.34, 0.3), '#2a3a4a', TM(XH, REG.y, REG.z)).add(G.cyl(0.11, 0.11, 0.2, 12), '#2a3a4a', TM(XH, REG.y + 0.26, REG.z));
  jm.add(G.box(0.12, 0.12, 0.12), '#c8333a', TM(XH, REG.y + 0.42, REG.z)).add(G.cyl(0.03, 0.03, -REG.y + 0.15 - 0.5, 6), '#9aa5ae', TM(XH, (REG.y + 0.5 + 0.15) / 2 + 0.0, REG.z));
  jm.add(G.cyl(0.15, 0.15, 0.2, 14), '#2f7fd6', TM(XH, REG.y, REG.z - 0.28, Math.PI / 2, 0, 0)).add(G.cyl(0.11, 0.11, 0.25, 14), '#2f7fd6', TM(XH, REG.y, REG.z - 0.5, Math.PI / 2, 0, 0));
  // caixinha de proteção do registro (tubo de PVC até a calçada + tampa quadrada)
  jm.add(G.cyl(0.13, 0.13, 0.95, 12, true), '#cfd3d6', TM(XH, -0.3, REG.z));
  const jMesh = jm.mesh(vmat({ roughness: 0.45, metalness: 0.25, side: DS })); root.add(jMesh);
  const regLid = new THREE.Group(); regLid.add(L.box(0.36, 0.04, 0.36, L.metal('#3b4148', { roughness: 0.6 }), 0, 0, 0, { cast: false }), L.box(0.2, 0.045, 0.06, L.mat('#cfd3d6'), 0, 0.003, 0, { cast: false })); regLid.position.set(XH, 0.165, REG.z); root.add(regLid);
  shared.houseTap = { p: [XH, REG.y, REG.z - 0.62], r: 0.11, dir: [0, 0, -1] };   // luva de espera: o ramal da casa começa aqui
  // setas na face (a partir do tê, para os dois lados)
  const chWL = new L.Chevrons([[XC - 0.5, N.water.y, ZF + 0.02], [X0 + 0.5, N.water.y, ZF + 0.02]], { n: 26, size: 0.17, color: '#ffd23f', normal: [0, 0, 1] });
  const chWR = new L.Chevrons([[XC + 0.5, N.water.y, ZF + 0.02], [X1 - 0.5, N.water.y, ZF + 0.02]], { n: 12, size: 0.17, color: '#ffd23f', normal: [0, 0, 1] });
  root.add(chWL.mesh, chWR.mesh);

  /* ---------- ESGOTO ---------- */
  const sMat = L.mat(N.sewer.color, { roughness: 0.55, side: DS }), sCut = L.mat('#a76a22', { roughness: 0.7, side: DS });
  const pvx = SEWER_PV_X.slice().sort((a, b) => a - b), IN = PV.half - 0.15;
  const sewSegs = []; { let a = X0; pvx.forEach((x) => { sewSegs.push([a, x - IN]); a = x + IN; }); sewSegs.push([a, X1]); }
  const sewWaters = [];
  sewSegs.forEach(([a, b]) => {
    const n = Math.max(8, Math.round((b - a) * 2));
    const sp = L.cutPipe([[a, N.sewer.y], [b, N.sewer.y]], { r: N.sewer.r, wall: 0.04, seg: n, radial: 16, mat: sMat, cutMat: sCut });
    sp.group.position.z = ZF; root.add(sp.group);
    const wi = sp.waterIn(0.46, '#6b4a2c', 0.95); sewWaters.push(wi);
  });
  // poços de visita de esgoto em corte
  const pvM = new Merge(), pvCut = new Merge(), pvIn = PV.half - 0.15, CHZ = ZF - 1.0, CHR = 0.36;
  const chan = [];
  pvx.forEach((x) => {
    const y0 = PV.y0, y1 = PV.y1, zb = ZF - 1.35;
    pvM.add(G.box(2 * PV.half, 0.15, ZF - zb), '#b3b8bc', TM(x, y0 + 0.075, (zb + ZF) / 2));                       // fundo
    pvM.add(G.box(2 * PV.half, y1 - y0, 0.15), '#b9bec2', TM(x, (y0 + y1) / 2, zb + 0.075));                         // parede de trás
    [-1, 1].forEach((s) => pvM.add(G.box(0.15, y1 - y0, ZF - zb), '#b9bec2', TM(x + s * (PV.half - 0.075), (y0 + y1) / 2, (zb + ZF) / 2)));
    pvM.add(G.box(2 * PV.half, 0.2, ZF - zb), '#c4c8cb', TM(x, y1 - 0.1, (zb + ZF) / 2));                           // laje de cobertura
    // faces de corte (mais escuras) no plano da face
    pvCut.add(G.box(2 * PV.half, 0.15, 0.01), '#8f969b', TM(x, y0 + 0.075, ZF - 0.004)).add(G.box(2 * PV.half, 0.2, 0.01), '#8f969b', TM(x, y1 - 0.1, ZF - 0.004));
    [-1, 1].forEach((s) => pvCut.add(G.box(0.15, y1 - y0, 0.01), '#8f969b', TM(x + s * (PV.half - 0.075), (y0 + y1) / 2, ZF - 0.004)));
    // meia-cana (canaleta) no fundo, ligando os dois tubos, e banquetas
    pvM.add(G.box(2 * pvIn, N.sewer.y - N.sewer.r - y0 - 0.15 + 0.12, ZF - zb - 0.15), '#c9cdd0', TM(x, (y0 + 0.15 + N.sewer.y - N.sewer.r + 0.12) / 2, (zb + 0.15 + ZF) / 2));
    // chaminé excêntrica (até a calçada) com degraus
    const top = 0.15, h = top - y1;
    pvM.add(G.cyl(CHR + 0.1, CHR + 0.1, h - 0.06, 18, true), '#b3b8bc', TM(x, y1 + (h - 0.06) / 2, CHZ));
    for (let y = y0 + 0.5; y < top - 0.3; y += 0.35) pvM.add(G.torus(0.15, 0.02, 4, 10, Math.PI), '#d9b25a', TM(x, y, (y > y1 ? CHZ - CHR + 0.05 : zb + 0.17), 0, 0, 0));
  });
  const pvMesh = pvM.mesh(vmat({ roughness: 0.88, side: DS })); root.add(pvMesh);
  root.add(pvCut.mesh(vmat({ roughness: 0.95 }), { cast: false }));
  // meia-cana com esgoto (meio cilindro aberto em cima, com água) dentro de cada câmara
  const sewW = L.water('#6b4a2c', 0.95, { side: DS });
  pvx.forEach((x) => {
    const g = new THREE.CylinderGeometry(N.sewer.r - 0.04, N.sewer.r - 0.04, 2 * pvIn + 0.02, 18, 1, true, Math.PI, Math.PI); g.rotateZ(Math.PI / 2);
    const m = L.mesh(g, L.mat('#a9aeb2', { roughness: 0.8, side: DS }), x, N.sewer.y, ZF - 0.003); root.add(m);
    const w = L.box(2 * pvIn + 0.02, 0.01, N.sewer.r * 1.7, sewW, x, N.sewer.y - N.sewer.r * 0.08, ZF - N.sewer.r * 0.85, { cast: false }); root.add(w); chan.push(w);
    const lid = K.lid('ESGOTO', '#4a3d33'); lid.position.set(x, 0.155 + 0.02, CHZ); root.add(lid);
  });
  const chS = new L.Chevrons([[X0 + 0.5, N.sewer.y, ZF + 0.02], [X1 - 0.5, N.sewer.y, ZF + 0.02]], { n: 40, size: 0.2, color: '#ffb35c', normal: [0, 0, 1] });
  root.add(chS.mesh);

  /* ---------- DRENAGEM: galeria de aduelas de concreto (corte longitudinal) ---------- */
  const D = N.drain, gy0 = D.y - D.h / 2, gy1 = D.y + D.h / 2, T = 0.2;
  const zIn = ZF - D.w / 2;                           // face interna da parede de trás (externa em ZF − 1,1)
  const gm = new Merge(), gc = new Merge();
  gm.add(G.box(X1 - X0, T, ZF - zIn + T), '#b3b8bc', TM(0, gy0 - T / 2, (zIn - T + ZF) / 2));       // laje de fundo
  gm.add(G.box(X1 - X0, T, ZF - zIn + T), '#bfc4c7', TM(0, gy1 + T / 2, (zIn - T + ZF) / 2));       // laje de cobertura
  gm.add(G.box(X1 - X0, D.h, T), '#b9bec2', TM(0, D.y, zIn - T / 2));                                 // parede de trás
  for (let x = X0 + 2; x < X1; x += 2) gm.add(G.box(0.04, D.h + 0.02, 0.02), '#8f969b', TM(x, D.y, zIn + 0.01)).add(G.box(0.04, 0.02, ZF - zIn), '#8f969b', TM(x, gy1 - 0.01, (zIn + ZF) / 2));   // juntas das aduelas
  gc.add(G.box(X1 - X0, T, 0.01), '#8f969b', TM(0, gy0 - T / 2, ZF - 0.004)).add(G.box(X1 - X0, T, 0.01), '#8f969b', TM(0, gy1 + T / 2, ZF - 0.004));
  // PVs da galeria: nicho atrás (sobre a galeria) + chaminé até a calçada + tampa PLUVIAL
  const DZ = ZF - 1.55;
  DRAIN_PV_X.forEach((x) => {
    gm.add(G.box(1.5, 0.9, 0.9), '#b3b8bc', TM(x, gy1 + 0.45 + T, DZ)).add(G.cyl(0.45, 0.45, 0.15 - (gy1 + 0.9 + T), 18, true), '#b3b8bc', TM(x, (0.15 + gy1 + 0.9 + T) / 2, DZ));
    for (let y = gy1 + 1.2; y < -0.2; y += 0.35) gm.add(G.torus(0.15, 0.02, 4, 10, Math.PI), '#d9b25a', TM(x, y, DZ - 0.38));
  });
  const galMesh = gm.mesh(vmat({ roughness: 0.92, side: DS })); root.add(galMesh);
  root.add(gc.mesh(vmat({ roughness: 0.95 }), { cast: false }));
  DRAIN_PV_X.forEach((x) => { const lid = K.lid('PLUVIAL', '#3b4650'); lid.position.set(x, 0.175, DZ); root.add(lid); });
  // água de chuva no fundo (lâmina baixa) + setas
  const dW = L.water('#8fa9b8', 0.85, { side: DS });
  const dWater = L.box(X1 - X0, 0.22, ZF - zIn - 0.01, dW, 0, gy0 + 0.11, (zIn + ZF) / 2, { cast: false }); root.add(dWater);
  const chD = new L.Chevrons([[X0 + 0.5, gy0 + 0.45, ZF + 0.02], [X1 - 0.5, gy0 + 0.45, ZF + 0.02]], { n: 34, size: 0.22, color: '#9fe8ff', normal: [0, 0, 1] });
  root.add(chD.mesh);

  /* ---------- bocas de lobo: caixa sob a calçada (raio-x) + grelha na sarjeta + abertura na guia ---------- */
  const SC = Lo.STREETS.casa, bm = new Merge(), grm = new Merge();
  const inlets = [...[-44, -24, 12, 42].map((x) => ({ x, z0: SC.z0 - 1.35, z1: SC.z0 - 0.05, gz: SC.z0 + 0.2 })), ...[-34, 34].map((x) => ({ x, z0: SC.z1 + 0.05, z1: SC.z1 + 1.35, gz: SC.z1 - 0.2 }))];
  inlets.forEach((b) => {
    const zc = (b.z0 + b.z1) / 2, dz = b.z1 - b.z0, y0 = -1.1;
    bm.add(G.box(1.3, 0.12, dz), '#b3b8bc', TM(b.x, y0 + 0.06, zc));
    [-1, 1].forEach((s) => { bm.add(G.box(0.12, 1.2, dz), '#bfc4c7', TM(b.x + s * 0.59, y0 + 0.6, zc)); bm.add(G.box(1.3, 1.2, 0.12), '#bfc4c7', TM(b.x, y0 + 0.6, zc + s * (dz / 2 - 0.06))); });
    // grelha de ferro fundido sobre a sarjeta e cantoneira da abertura na guia
    for (let k = 0; k < 8; k++) grm.add(G.box(0.035, 0.03, 0.4), '#2f353b', TM(b.x - 0.42 + k * 0.12, 0.05, b.gz));
    grm.add(G.box(1.0, 0.035, 0.05), '#2f353b', TM(b.x, 0.05, b.gz - 0.2)).add(G.box(1.0, 0.035, 0.05), '#2f353b', TM(b.x, 0.05, b.gz + 0.2));
    grm.add(G.box(1.0, 0.09, 0.03), '#141a1f', TM(b.x, 0.085, b.gz < 27 ? SC.z0 - 0.02 : SC.z1 + 0.02));
  });
  const boxMesh = bm.mesh(vmat({ roughness: 0.9, side: DS })); root.add(boxMesh);
  root.add(grm.mesh(vmat({ roughness: 0.5, metalness: 0.5 }), { cast: false }));
  L.shadows(root, false, true);

  /* ---------- update ---------- */
  function update(t, S) {
    const F = shared.cityFronts ? shared.cityFronts(S) : { f1: 1, f2: 1 }, NT = parts.buildNet;
    const D_T = NT ? NT.D_T : 0, D1 = NT ? NT.D1 : 1, d1 = F.f1 * D1;
    // água na rede da face: do tê (x = 24) para os dois lados, depois que a frente passa pelo tronco
    const ext = Math.max(0, d1 - D_T) / (X1 - X0);
    const u0 = Math.max(0, uC - ext), u1 = Math.min(1, uC + ext);
    if (F.f1 >= 1) wIn.range(0, 1); else if (ext > 0) wIn.range(u0, u1); else wIn.range(0, 0);
    const on = ext > 0 ? 1 : 0, kl = L.clamp01((XC - X0) > 0 ? (ext * (X1 - X0)) / (XC - X0 - 0.5) : 1), kr = L.clamp01((ext * (X1 - X0)) / (X1 - XC - 0.5));
    chWL.update(t, { speed: 0.025, head: F.f1 >= 1 ? 1 : kl, amount: on, size: 0.17 });
    chWR.update(t, { speed: 0.05, head: F.f1 >= 1 ? 1 : kr, amount: on, size: 0.17 });
    // esgoto e chuva correm sempre (a cidade já existe)
    chS.update(t, { speed: 0.018, amount: 1, size: 0.2 });
    chD.update(t, { speed: 0.022, amount: 1, size: 0.22 });
    void sub; void sewWaters; void chan;
  }
  return { root, update };
}
