// Edificações prontas da cidade: casas térreas (Lo.LOTS.houses + lotes de canto), prédios residenciais na encosta
// (Lo.LOTS.towers), ESCOLA (prédio de 2 pavimentos com placa, quadra poliesportiva com traves e alambrado, mastro) e
// HOSPITAL (4 pavimentos, cruz vermelha, letreiro, marquise na entrada, heliponto no terraço, ambulância).
// O lote da casa em corte (Lo.LOTS.hero) é do módulo casa: fica vazio aqui.
// Geometria estática mesclada por material (cor por vértice): paredes/telhados (1), vidros (1), letreiros (1 por textura).
export function buildBuildings(ctx) {
  const { L, THREE, Lo, K } = ctx, { G, TM, Merge, vmat, canvasTex } = K;
  const root = new THREE.Group();
  const LOT = Lo.LOTS, FRONT = 21.5;                  // alinhamento dos muros (frente dos lotes = calçada da Rua da Casa)
  const body = new Merge(), glass = new Merge(), lights = new Merge();
  const GLASS = '#2e4d66', FRAME = '#f1efe8';
  const gmin = (x0, x1, z0, z1) => { let m = 1e9, M = -1e9; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) { const g = Lo.G(x0 + ((x1 - x0) * i) / 6, z0 + ((z1 - z0) * j) / 6); m = Math.min(m, g); M = Math.max(M, g); } return [m, M]; };

  /* ---------- peças ---------- */
  /** janela com caixilho, vidro, peitoril e folhas — na face de normal `ry` (0 = +z), centro (x, y, z) */
  function windowAt(x, y, z, ry, w = 1.2, h = 1.1, shutters = false) {
    const M = (dx, dy, dz) => TM(x, y, z, 0, ry, 0).multiply(TM(dx, dy, dz));
    body.add(G.box(w + 0.12, 0.08, 0.1), FRAME, M(0, h / 2 + 0.04, 0.03)).add(G.box(w + 0.12, 0.08, 0.1), FRAME, M(0, -h / 2 - 0.04, 0.03));
    body.add(G.box(0.07, h, 0.1), FRAME, M(-w / 2 - 0.02, 0, 0.03)).add(G.box(0.07, h, 0.1), FRAME, M(w / 2 + 0.02, 0, 0.03)).add(G.box(0.05, h, 0.08), FRAME, M(0, 0, 0.03));
    body.add(G.box(w + 0.32, 0.06, 0.22), '#e6e2da', M(0, -h / 2 - 0.1, 0.09));
    glass.add(G.box(w - 0.02, h - 0.02, 0.02), GLASS, M(0, 0, 0.012));
    if (shutters) [-1, 1].forEach((s) => body.add(G.box(w * 0.32, h + 0.04, 0.04), '#5b7d93', M(s * (w / 2 + w * 0.18), 0, 0.05)));
  }
  function doorAt(x, y, z, ry, w = 0.95, h = 2.15, color = '#7a4b2a') {
    const M = (dx, dy, dz) => TM(x, y, z, 0, ry, 0).multiply(TM(dx, dy, dz));
    body.add(G.box(w + 0.16, 0.09, 0.12), FRAME, M(0, h + 0.045, 0.03)).add(G.box(0.08, h, 0.12), FRAME, M(-w / 2 - 0.04, h / 2, 0.03)).add(G.box(0.08, h, 0.12), FRAME, M(w / 2 + 0.04, h / 2, 0.03));
    body.add(G.box(w, h, 0.05), color, M(0, h / 2, 0.02));
    for (let i = 0; i < 3; i++) body.add(G.box(w - 0.2, 0.025, 0.02), '#5e3820', M(0, 0.45 + i * 0.6, 0.05));
    body.add(G.sph(0.04, 8, 6), '#d9b25a', M(w / 2 - 0.14, 1.05, 0.07));
  }
  /** telhado de duas águas (cumeeira ao longo de x) sobre um retângulo; beiral ov; telhas em fiadas */
  function gable(cx, cz, w, d, y, color, pitch = 0.36, ov = 0.45) {
    const run = d / 2 + ov, rise = (d / 2) * pitch, ang = Math.atan(pitch), sl = Math.hypot(run, run * pitch), W = w + 2 * ov * 0.7;
    [1, -1].forEach((s) => {
      const zc = cz + s * run / 2, yc = y + rise - (run / 2) * pitch;
      body.add(G.box(W, 0.08, sl), color, TM(cx, yc, zc, s * ang, 0, 0));
      const n = Math.floor(sl / 0.36);
      for (let i = 1; i < n; i++) { const u = (i / n - 0.5) * sl; body.add(G.box(W, 0.035, 0.05), K.shade(color, 0.82), TM(cx, yc + 0.05, zc, s * ang, 0, 0).multiply(TM(0, 0, u))); }
      body.add(G.box(W, 0.12, 0.08), '#e9e3d6', TM(cx, y - ov * pitch - 0.02, cz + s * (run - 0.02)));   // testeira
    });
    body.add(G.cyl(0.1, 0.1, W, 8), K.shade(color, 0.9), TM(cx, y + rise + 0.06, cz, 0, 0, Math.PI / 2));   // cumeeira
    // oitões
    [-1, 1].forEach((s) => body.add(G.extrude([[-d / 2, 0], [d / 2, 0], [0, rise]], 0.16), '#efe6d2', TM(cx + s * (w / 2) - (s > 0 ? 0.16 : 0), y, cz, 0, Math.PI / 2 * 0 + (Math.PI / 2), 0)));
  }

  /* ---------- casa térrea com muro, portão e jardim ---------- */
  const HOUSE_COL = [['#f1d9a8', '#c9543b'], ['#cfe3e6', '#a9472f'], ['#f4c8b0', '#8f5a3c'], ['#e3e8c8', '#b44a36'], ['#f6efe2', '#c06a3a'], ['#d8d2ec', '#9c4b35']];
  function house(x0, x1, i, o = {}) {
    const [wallC, roofC] = HOUSE_COL[i % HOUSE_COL.length], cx = (x0 + x1) / 2, w = Math.min(9, x1 - x0 - 1.2), z0 = o.z0 ?? 11.0, z1 = o.z1 ?? 18.0, d = z1 - z0, cz = (z0 + z1) / 2;
    const fy = 0.25, wh = 2.9, top = fy + wh;
    body.add(G.box(w + 0.3, fy + 0.1, d + 0.3), '#b9b2a6', TM(cx, (fy - 0.1) / 2, cz));                 // baldrame / piso
    body.add(G.box(w, wh, d), wallC, TM(cx, fy + wh / 2, cz));                                           // alvenaria rebocada
    body.add(G.box(w + 0.04, 0.35, d + 0.04), K.shade(wallC, 0.86), TM(cx, fy + 0.17, cz));             // rodapé
    gable(cx, cz, w, d, top, roofC);
    // frente (+z): porta + janela; laterais e fundos: janelas
    doorAt(cx - w / 2 + 1.1, fy, z1 + 0.005, 0);
    windowAt(cx + (w > 6 ? 1.3 : 0.9), fy + 1.55, z1 + 0.005, 0, w > 6 ? 1.6 : 1.1, 1.1, true);
    windowAt(x0 + (x1 - x0 - w) / 2 - 0.005, fy + 1.6, cz, -Math.PI / 2, 1.0, 1.0);
    windowAt(x0 + (x1 - x0 + w) / 2 + 0.005, fy + 1.6, cz + 1.5, Math.PI / 2, 0.6, 0.6);
    windowAt(cx, fy + 1.6, z0 - 0.005, Math.PI, 1.2, 1.0);
    // varanda: laje fina e dois pilaretes
    body.add(G.box(2.4, 0.12, 1.4), '#ece7dd', TM(cx - w / 2 + 1.3, top - 0.1, z1 + 0.7)).add(G.box(0.14, wh - 0.1, 0.14), '#ece7dd', TM(cx - w / 2 + 0.2, fy + wh / 2 - 0.05, z1 + 1.3)).add(G.box(0.14, wh - 0.1, 0.14), '#ece7dd', TM(cx - w / 2 + 2.4, fy + wh / 2 - 0.05, z1 + 1.3));
    body.add(G.box(2.6, 0.06, 1.6), '#c9b8a4', TM(cx - w / 2 + 1.3, fy + 0.03, z1 + 0.75));
    // muro da frente com portão de pedestre, portão de garagem e nicho do cavalete (hidrômetro)
    const mz = FRONT - 0.1, mh = 1.6, gp = cx - w / 2 + 1.1, gg = cx + w / 2 - 1.7;
    const segs = [[x0 + 0.05, gp - 0.55], [gp + 0.55, gg - 1.4], [gg + 1.4, x1 - 0.05]];
    segs.forEach(([a, b]) => { if (b - a > 0.05) { body.add(G.box(b - a, mh, 0.15), K.shade(wallC, 0.95), TM((a + b) / 2, mh / 2, mz)); body.add(G.box(b - a + 0.04, 0.06, 0.22), '#e8e2d6', TM((a + b) / 2, mh + 0.03, mz)); } });
    for (let k = 0; k < 9; k++) body.add(G.box(0.03, 1.45, 0.03), '#3a4149', TM(gp - 0.45 + k * 0.112, 0.78, mz));
    body.add(G.box(1.0, 0.05, 0.05), '#3a4149', TM(gp, 1.48, mz)).add(G.box(1.0, 0.05, 0.05), '#3a4149', TM(gp, 0.1, mz));
    for (let k = 0; k < 22; k++) body.add(G.box(0.03, 1.45, 0.03), '#3a4149', TM(gg - 1.35 + k * 0.128, 0.78, mz));
    body.add(G.box(2.8, 0.06, 0.06), '#3a4149', TM(gg, 1.48, mz)).add(G.box(2.8, 0.06, 0.06), '#3a4149', TM(gg, 0.1, mz));
    const mx = o.meterX ?? (x1 - 0.9);   // caixa do cavalete (hidrômetro) no muro, com tampa de visor
    body.add(G.box(0.7, 0.55, 0.25), '#d9dde0', TM(mx, 0.78, mz + 0.06)).add(G.box(0.56, 0.4, 0.02), '#5e6a73', TM(mx, 0.78, mz + 0.19));
    // calçamento até a porta e garagem; canteiro com arbustos
    body.add(G.box(1.0, 0.04, FRONT - z1 - 0.2), '#c9c2b4', TM(gp, 0.02, (z1 + FRONT) / 2));
    body.add(G.box(2.6, 0.04, FRONT - z1 - 0.2), '#b7b0a2', TM(gg, 0.02, (z1 + FRONT) / 2));
    const rd = L.rng(i * 17 + 5);
    for (let k = 0; k < 4; k++) { const s = 0.35 + rd() * 0.25; body.add(new THREE.IcosahedronGeometry(1, 1), ['#4f9d3c', '#5fb347', '#3f8a3a'][k % 3], TM(gp + 0.9 + k * 0.55, s * 0.7, FRONT - 0.6 - rd() * 0.6, 0, rd() * 3, 0, s, s * 0.8, s)); }
    return { cx, cz, x0, x1, mx };
  }

  /* ---------- prédio de vários pavimentos (faixas de janela, sacadas, terraço) ---------- */
  function slabBlock(cx, y0, cz, w, d, nf, fh, col, o = {}) {
    for (let f = 0; f < nf; f++) {
      const y = y0 + f * fh;
      body.add(G.box(w + 0.3, 0.22, d + 0.3), '#d4d7d9', TM(cx, y + fh - 0.11, cz));
      const side = (len, M) => {
        body.add(G.box(len, 0.95, 0.2), col, M(0, 0.475, 0)).add(G.box(len, fh - 2.35 - 0.22, 0.2), col, M(0, 2.35 + (fh - 2.35 - 0.22) / 2, 0));
        glass.add(G.box(len - 0.1, 1.4, 0.06), o.glass ?? GLASS, M(0, 1.65, -0.03));
        const nm = Math.max(2, Math.round(len / (o.bay ?? 1.4)));
        for (let i = 0; i <= nm; i++) body.add(G.box(0.07, 1.4, 0.12), o.mull ?? '#d8dde1', M(-len / 2 + 0.05 + ((len - 0.1) * i) / nm, 1.65, 0.02));
        body.add(G.box(len, 0.05, 0.25), '#eef0f2', M(0, 0.95, 0.04));
      };
      side(w, (u, yy, oo) => TM(cx + u, y + yy, cz + d / 2 + oo));
      side(w, (u, yy, oo) => TM(cx + u, y + yy, cz - d / 2 - oo, 0, Math.PI, 0));
      side(d, (u, yy, oo) => TM(cx + w / 2 + oo, y + yy, cz - u, 0, Math.PI / 2, 0));
      side(d, (u, yy, oo) => TM(cx - w / 2 - oo, y + yy, cz + u, 0, -Math.PI / 2, 0));
      [-1, 1].forEach((sx) => [-1, 1].forEach((sz) => body.add(G.box(0.4, fh, 0.4), o.corner ?? K.shade(col, 0.85), TM(cx + sx * (w / 2 + 0.05), y + fh / 2, cz + sz * (d / 2 + 0.05)))));
      if (o.balcony && f > 0) {
        body.add(G.box(w * 0.45, 0.14, 1.0), '#e9ebec', TM(cx - w * 0.2, y + 0.07, cz + d / 2 + 0.6));
        glass.add(G.box(w * 0.45, 1.0, 0.04), '#7fb2cf', TM(cx - w * 0.2, y + 0.6, cz + d / 2 + 1.08));
        body.add(G.box(w * 0.45, 0.05, 0.08), '#c8ced3', TM(cx - w * 0.2, y + 1.12, cz + d / 2 + 1.08));
      }
    }
    const yt = y0 + nf * fh;
    // platibanda e terraço
    [[0, d / 2 + 0.15, w + 0.5, 0.15], [0, -d / 2 - 0.15, w + 0.5, 0.15]].forEach(([x, z, a, b]) => body.add(G.box(a, 0.9, b), col, TM(cx + x, yt + 0.45, cz + z)));
    [[w / 2 + 0.15, 0], [-w / 2 - 0.15, 0]].forEach(([x, z]) => body.add(G.box(0.15, 0.9, d + 0.5), col, TM(cx + x, yt + 0.45, cz + z)));
    body.add(G.box(w + 0.3, 0.06, d + 0.3), '#8f969c', TM(cx, yt + 0.03, cz));
    return yt;
  }
  function roofTanks(cx, yt, cz, w, d) {
    body.add(G.box(2.2, 2.4, 2.4), '#dfe3e6', TM(cx, yt + 1.2, cz - d / 2 + 1.5)).add(G.box(2.4, 0.12, 2.6), '#9aa3aa', TM(cx, yt + 2.45, cz - d / 2 + 1.5));
    [-0.75, 0.75].forEach((x) => body.add(G.cyl(0.6, 0.6, 1.25, 18), '#2c7fc4', TM(cx + x + w / 4, yt + 0.72, cz + d / 4)).add(G.cyl(0.62, 0.62, 0.08, 18), '#24689f', TM(cx + x + w / 4, yt + 1.38, cz + d / 4)));
    body.add(G.cyl(0.04, 0.04, 3.5, 6), '#c8ced3', TM(cx - w / 2 + 0.6, yt + 1.75, cz - d / 2 + 0.6));
  }

  /* ---------- casas ---------- */
  const houses = [];
  LOT.houses.forEach((h, i) => houses.push(house(h.x0, h.x1, i)));
  houses.push(house(54.5, 60.0, 4, { z0: 11.5, z1: 17.5 }));
  houses.push(house(-60.0, -56.2, 5, { z0: 11.5, z1: 17.5 }));
  // lojinha de esquina (x 14–18.5, junto à avenida): térrea com toldo e letreiro
  { const cx = 16.25, w = 3.9, z0 = 13.0, z1 = 20.0, d = z1 - z0, cz = (z0 + z1) / 2;
    body.add(G.box(w, 3.4, d), '#f0e6c8', TM(cx, 1.7, cz)).add(G.box(w + 0.2, 0.5, d + 0.2), '#c94c3a', TM(cx, 3.6, cz));
    glass.add(G.box(w - 0.6, 2.0, 0.05), '#3d6a86', TM(cx, 1.3, z1 + 0.03));
    body.add(G.box(w + 0.3, 0.08, 1.2), '#2f9e6a', TM(cx, 2.65, z1 + 0.55, -0.25, 0, 0));
    body.add(G.box(w, 0.04, FRONT - z1 - 0.2), '#c9c2b4', TM(cx, 0.02, (z1 + FRONT) / 2)); }
  houses.push({ cx: 16.25, x0: 14, x1: 18.5, mx: 15.0 });

  /* ---------- prédios na encosta ---------- */
  const PRED_COL = ['#d9cdb8', '#cfd9e2', '#e3d2c2', '#c8d4c6'];
  const towers = LOT.towers.map((T, i) => {
    const w = 8.0, d = 7.0, fh = 3.0, [lo, hi] = gmin(T.x - w / 2, T.x + w / 2, T.z - d / 2, T.z + d / 2), y0 = hi + 0.15;
    body.add(G.box(w + 0.8, y0 - lo + 0.4, d + 0.8), '#b9bec2', TM(T.x, (y0 + lo - 0.4) / 2, T.z));    // embasamento (arrimo na encosta)
    const yt = slabBlock(T.x, y0, T.z, w, d, T.floors, fh, PRED_COL[i % 4], { balcony: i !== 1 });
    roofTanks(T.x, yt, T.z, w, d);
    // portaria e escada até a calçada de baixo
    const zf = T.z + d / 2 + 0.6, gy = Lo.G(T.x, zf);
    body.add(G.box(3.0, 0.12, 2.0), '#eeeeea', TM(T.x + 1.5, y0 + 2.7, zf + 0.6)).add(G.box(0.12, 2.6, 0.12), '#eeeeea', TM(T.x + 2.9, y0 + 1.3, zf + 1.5)).add(G.box(0.12, 2.6, 0.12), '#eeeeea', TM(T.x + 0.1, y0 + 1.3, zf + 1.5));
    const zEnd = Lo.STREETS.back.walkBack[0], n = Math.ceil((zEnd - zf) / 0.6);
    for (let k = 0; k < n; k++) { const z = zf + (k + 0.5) * ((zEnd - zf) / n), y = Lo.G(T.x + 1.5, z); body.add(G.box(1.6, 0.18, (zEnd - zf) / n + 0.02), '#cfcac0', TM(T.x + 1.5, y + 0.06, z)); }
    void gy;
    return { x: T.x, z: T.z, y0, yt, w, d, front: T.z + d / 2 };
  });

  /* ---------- ESCOLA ---------- */
  const SL = LOT.school;
  {
    const bx0 = SL.x0 + 0.8, bx1 = SL.x0 + 9.8, bz0 = SL.z0 + 0.5, bz1 = SL.z0 + 6.5, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, w = bx1 - bx0, d = bz1 - bz0;
    body.add(G.box(w + 0.6, 0.3, d + 0.6), '#bdb6aa', TM(cx, 0.15, cz));
    const yt = slabBlock(cx, 0.3, cz, w, d, 2, 3.2, '#f2c94c', { mull: '#ffffff', corner: '#ffffff', bay: 1.5 });
    // ala lateral térrea (refeitório) e pátio coberto
    body.add(G.box(5.5, 3.2, 4.2), '#f6f0de', TM(SL.x0 + 3.6, 1.9, bz1 + 2.4)).add(G.box(5.9, 0.25, 4.6), '#e2a93a', TM(SL.x0 + 3.6, 3.6, bz1 + 2.4));
    for (let k = 0; k < 3; k++) windowAt(SL.x0 + 1.9 + k * 1.7, 1.9, bz1 + 4.505, 0, 1.2, 1.1);
    doorAt(cx + 3.2, 0.3, bz1 + 0.21, 0, 1.6, 2.4, '#2f6aa6');
    body.add(G.box(3.6, 0.15, 2.2), '#ffffff', TM(cx + 3.2, 3.0, bz1 + 1.2)).add(G.box(0.15, 2.7, 0.15), '#ffffff', TM(cx + 1.5, 1.65, bz1 + 2.2)).add(G.box(0.15, 2.7, 0.15), '#ffffff', TM(cx + 4.9, 1.65, bz1 + 2.2));
    // quadra poliesportiva com linhas, traves e alambrado
    const qx0 = SL.x0 + 10.6, qx1 = SL.x1 - 0.5, qz0 = SL.z0 + 0.6, qz1 = FRONT - 0.8, qcx = (qx0 + qx1) / 2, qcz = (qz0 + qz1) / 2, qw = qx1 - qx0, qd = qz1 - qz0;
    body.add(G.box(qw, 0.06, qd), '#3f8f6a', TM(qcx, 0.03, qcz)).add(G.box(qw - 1.0, 0.065, qd - 1.0), '#4aa37a', TM(qcx, 0.035, qcz));
    const line = (x, z, a, b) => body.add(G.box(a, 0.07, b), '#ffffff', TM(x, 0.04, z));
    line(qcx, qz0 + 0.5, qw - 1.0, 0.06); line(qcx, qz1 - 0.5, qw - 1.0, 0.06); line(qx0 + 0.5, qcz, 0.06, qd - 1.0); line(qx1 - 0.5, qcz, 0.06, qd - 1.0); line(qcx, qcz, qw - 1.0, 0.06);
    body.add(G.torus(1.2, 0.03, 4, 32), '#ffffff', TM(qcx, 0.07, qcz, Math.PI / 2, 0, 0));
    [qz0 + 0.5, qz1 - 0.5].forEach((z, s) => { const sz = s ? -1 : 1;
      body.add(G.cyl(0.05, 0.05, 2.0, 8), '#f4f4f4', TM(qcx - 1.5, 1.0, z)).add(G.cyl(0.05, 0.05, 2.0, 8), '#f4f4f4', TM(qcx + 1.5, 1.0, z)).add(G.cyl(0.05, 0.05, 3.0, 8), '#f4f4f4', TM(qcx, 2.0, z, 0, 0, Math.PI / 2));
      body.add(G.box(3.0, 2.0, 0.02), '#dfe6ea', TM(qcx, 1.0, z - sz * 0.6));   // rede (painel claro)
      body.add(G.torus(1.6, 0.03, 4, 24, Math.PI), '#e2523a', TM(qcx, 0.07, z + sz * 0.02, -Math.PI / 2 * sz, 0, 0)); });
    const fence = (a, b) => { const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), n = Math.max(1, Math.round(va.distanceTo(vb) / 2.5)); for (let k = 0; k <= n; k++) { const p = va.clone().lerp(vb, k / n); body.rod([p.x, 0, p.z], [p.x, 3.0, p.z], 0.045, '#8d969e', 6); } body.rod([a[0], 3.0, a[2]], [b[0], 3.0, b[2]], 0.04, '#8d969e', 6); body.rod([a[0], 1.5, a[2]], [b[0], 1.5, b[2]], 0.03, '#8d969e', 6); glass.add(G.box(va.distanceTo(vb), 2.9, 0.02), '#9fb0bb', TM((a[0] + b[0]) / 2, 1.5, (a[2] + b[2]) / 2, 0, -Math.atan2(b[2] - a[2], b[0] - a[0]), 0)); };
    fence([qx0, 0, qz0], [qx1, 0, qz0]); fence([qx1, 0, qz0], [qx1, 0, qz1]); fence([qx0, 0, qz0], [qx0, 0, qz1]);
    // muro baixo com gradil e portão; mastro
    body.add(G.box(SL.x1 - SL.x0 - 0.2, 0.6, 0.18), '#f2c94c', TM((SL.x0 + SL.x1) / 2, 0.3, FRONT - 0.1));
    for (let x = SL.x0 + 0.3; x < SL.x1 - 0.2; x += 0.16) if (Math.abs(x - (cx + 3.2)) > 1.4) body.add(G.box(0.025, 1.0, 0.025), '#2f6aa6', TM(x, 1.1, FRONT - 0.1));
    body.add(G.box(SL.x1 - SL.x0 - 0.2, 0.05, 0.05), '#2f6aa6', TM((SL.x0 + SL.x1) / 2, 1.6, FRONT - 0.1));
    body.add(G.cyl(0.05, 0.07, 7.0, 8), '#d9dde0', TM(SL.x0 + 7.6, 3.5, FRONT - 1.0));
    // placa ESCOLA (letreiro na fachada)
    const sign = signMesh('ESCOLA', '#1f5aa6', '#ffffff', 5.6, 1.0); sign.position.set(cx - 0.4, yt - 0.5, bz1 + 0.24); root.add(sign);
    var school = { cx, cz, front: bz1, x0: SL.x0, x1: SL.x1, yt, meterX: SL.x0 + 1.4 };
    body.add(G.box(0.7, 0.55, 0.25), '#d9dde0', TM(school.meterX, 0.9, FRONT + 0.0));
  }

  /* ---------- HOSPITAL ---------- */
  const HL = LOT.hospital;
  {
    const bx0 = HL.x0 + 1.0, bx1 = HL.x1 - 3.0, bz0 = HL.z0 + 0.4, bz1 = HL.z0 + 7.6, cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2, w = bx1 - bx0, d = bz1 - bz0;
    body.add(G.box(w + 0.6, 0.3, d + 0.6), '#c2c6c9', TM(cx, 0.15, cz));
    const yt = slabBlock(cx, 0.3, cz, w, d, 4, 3.3, '#f4f6f7', { glass: '#3a6f93', mull: '#c9d6df', corner: '#dfe6ea', bay: 1.6 });
    // faixa azul-petróleo no térreo e marquise da entrada com pilares
    body.add(G.box(w + 0.42, 0.35, d + 0.42), '#1f7a8c', TM(cx, 3.45, cz));
    const ex = cx + 2.0;
    body.add(G.box(7.0, 0.3, 4.2), '#e9eef1', TM(ex, 3.2, bz1 + 2.2)).add(G.box(7.2, 0.12, 4.4), '#1f7a8c', TM(ex, 3.4, bz1 + 2.2));
    [-3.2, 3.2].forEach((dx) => body.add(G.cyl(0.16, 0.16, 2.9, 12), '#dfe6ea', TM(ex + dx, 1.75, bz1 + 4.0)));
    glass.add(G.box(3.2, 2.4, 0.06), '#4f8fb3', TM(ex, 1.5, bz1 + 0.24));
    body.add(G.box(0.06, 2.4, 0.1), '#c9d6df', TM(ex, 1.5, bz1 + 0.27));
    // ala de emergência (térrea, à direita) com portão de ambulâncias
    body.add(G.box(3.6, 3.6, 6.0), '#eef1f3', TM(HL.x1 - 1.9, 2.1, bz0 + 3.2)).add(G.box(3.8, 0.3, 6.2), '#c8333a', TM(HL.x1 - 1.9, 4.05, bz0 + 3.2));
    body.add(G.box(2.6, 2.6, 0.05), '#9aa5ad', TM(HL.x1 - 1.9, 1.6, bz0 + 6.21));
    // pátio/entrada de veículos
    body.add(G.box(HL.x1 - HL.x0 - 0.4, 0.04, FRONT - bz1 - 0.4), '#a9adb0', TM((HL.x0 + HL.x1) / 2, 0.02, (bz1 + FRONT) / 2 + 0.1));
    // cruz vermelha na fachada (sobre fundo branco) e letreiro
    const crossFace = (x, y, z, s, ry = 0) => { const M = (dz) => TM(x, y, z, 0, ry, 0).multiply(TM(0, 0, dz)); body.add(G.box(2.4 * s, 2.4 * s, 0.1), '#ffffff', M(0)); lights.add(G.box(1.8 * s, 0.6 * s, 0.14), '#e0242c', M(0.03)).add(G.box(0.6 * s, 1.8 * s, 0.14), '#e0242c', M(0.03)); };
    crossFace(bx0 + 2.2, yt - 3.0, bz1 + 0.34, 1.2);
    crossFace(bx1 + 0.34, yt - 3.0, cz, 1.0, Math.PI / 2);
    const sign = signMesh('HOSPITAL', '#ffffff', '#c8333a', 7.0, 1.05); sign.position.set(cx + 2.6, yt - 1.15, bz1 + 0.25); root.add(sign);
    // heliponto no terraço: base, círculo amarelo, H branco, luzes de borda
    const hx = cx - 1.5, hz = cz;
    body.add(G.box(7.0, 0.35, 6.4), '#59636b', TM(hx, yt + 0.4, hz));
    for (let k = 0; k < 4; k++) body.add(G.box(0.3, 0.6, 0.3), '#59636b', TM(hx + (k % 2 ? 3.2 : -3.2), yt + 0.15, hz + (k > 1 ? 2.9 : -2.9)));
    body.add(G.torus(2.3, 0.12, 4, 40), '#f2c230', TM(hx, yt + 0.6, hz, Math.PI / 2, 0, 0));
    body.add(G.box(0.36, 0.03, 2.0), '#ffffff', TM(hx - 0.7, yt + 0.6, hz)).add(G.box(0.36, 0.03, 2.0), '#ffffff', TM(hx + 0.7, yt + 0.6, hz)).add(G.box(1.1, 0.03, 0.34), '#ffffff', TM(hx, yt + 0.6, hz));
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; lights.add(G.sph(0.09, 6, 4), '#7dff9a', TM(hx + Math.cos(a) * 3.0, yt + 0.62, hz + Math.sin(a) * 2.8)); }
    body.add(G.box(1.6, 1.4, 1.6), '#dfe3e6', TM(bx1 - 1.6, yt + 0.7, bz0 + 1.4));
    var hospital = { cx, cz, front: bz1, ex, yt, meterX: HL.x0 + 1.6 };
    body.add(G.box(0.9, 0.7, 0.3), '#d9dde0', TM(hospital.meterX, 0.9, FRONT));
  }

  /* ---------- malhas ---------- */
  const bodyMesh = body.mesh(vmat({ roughness: 0.72 })); L.shadows(bodyMesh); root.add(bodyMesh);
  const glassMesh = glass.mesh(L.mat(0xffffff, { vertexColors: true, roughness: 0.12, metalness: 0.55, envMapIntensity: 1.2 })); glassMesh.castShadow = false; root.add(glassMesh);
  const lightMesh = lights.mesh(L.mat(0xffffff, { vertexColors: true, emissive: '#ff2a2a', emissiveIntensity: 0.35, roughness: 0.4 })); root.add(lightMesh);

  // ambulância estacionada sob a marquise do hospital
  const amb = ambulance(); amb.position.set(hospital.ex + 0.3, 0.02, hospital.front + 2.3); amb.rotation.y = Math.PI; root.add(amb); L.shadows(amb);

  function signMesh(text, bg, fg, w, h) {
    const t = canvasTex(512, (g, S) => { g.fillStyle = bg; g.fillRect(0, 0, S, S); g.fillStyle = fg; g.font = `bold ${Math.round(S * 0.62)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.scale(1, 1); g.fillText(text, S / 2, S / 2 + 6, S * 0.94); g.restore(); });
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    const m = L.mesh(new THREE.BoxGeometry(w, h, 0.08), [L.mat('#dfe3e6'), L.mat('#dfe3e6'), L.mat('#dfe3e6'), L.mat('#dfe3e6'), L.mat('#ffffff', { map: t, roughness: 0.5, emissive: '#ffffff', emissiveMap: t, emissiveIntensity: 0.25 }), L.mat('#dfe3e6')]);
    return m;
  }
  function ambulance() {
    const g = new THREE.Group(), m = new Merge();
    m.add(G.rbox(4.6, 1.9, 1.9, 0.12), '#f7f7f5', TM(-0.3, 1.35, 0)).add(G.rbox(1.4, 1.2, 1.86, 0.15), '#f7f7f5', TM(2.25, 0.95, 0));
    m.add(G.box(4.62, 0.22, 1.92), '#d8282e', TM(-0.3, 1.05, 0)).add(G.box(1.42, 0.2, 1.88), '#d8282e', TM(2.25, 1.05, 0));
    m.add(G.box(0.05, 0.6, 1.5), '#24333f', TM(2.93, 1.25, 0, 0, 0, -0.35)).add(G.box(0.7, 0.5, 0.02), '#24333f', TM(2.2, 1.3, 0.94)).add(G.box(0.7, 0.5, 0.02), '#24333f', TM(2.2, 1.3, -0.94));
    [-1, 1].forEach((s) => { m.add(G.box(0.8, 0.22, 0.02), '#d8282e', TM(-0.6, 1.75, s * 0.96)).add(G.box(0.22, 0.8, 0.02), '#d8282e', TM(-0.6, 1.75, s * 0.96)); });
    m.add(G.box(0.02, 0.8, 0.22), '#d8282e', TM(-2.61, 1.6, 0)).add(G.box(0.02, 0.22, 0.8), '#d8282e', TM(-2.61, 1.6, 0));
    m.add(G.box(0.2, 0.25, 1.8), '#2a3138', TM(2.95, 0.45, 0)).add(G.box(0.2, 0.25, 1.8), '#2a3138', TM(-2.62, 0.45, 0));
    for (const [x, z] of [[1.9, 0.85], [1.9, -0.85], [-1.6, 0.85], [-1.6, -0.85]]) m.add(G.cyl(0.38, 0.38, 0.26, 16), '#15191d', TM(x, 0.38, z, Math.PI / 2, 0, 0));
    g.add(m.mesh(vmat({ roughness: 0.3, metalness: 0.2 })));
    const bar = new Merge(); bar.add(G.box(0.3, 0.14, 0.5), '#ff3030', TM(1.6, 2.38, -0.35)).add(G.box(0.3, 0.14, 0.5), '#3a7bff', TM(1.6, 2.38, 0.35));
    g.add(L.mesh(bar.geo(), L.mat(0xffffff, { vertexColors: true, emissive: '#ff4040', emissiveIntensity: 0.6 }), 0, 0, 0, { cast: false }));
    return g;
  }

  /* ---------- pontos de consumo (para a rede: ramais e acendimento) ---------- */
  const consumers = [
    ...houses.map((h) => ({ kind: 'casa', x: h.mx ?? h.x1 - 0.9, z: FRONT, from: 'casa' })),
    { kind: 'escola', x: school.meterX, z: FRONT, from: 'casa', big: true },
    { kind: 'hospital', x: hospital.meterX, z: FRONT, from: 'casa', big: true },
    ...towers.map((T) => ({ kind: 'predio', x: T.x - 2.5, z: T.front + 0.4, y: Lo.G(T.x - 2.5, T.front + 0.4), from: 'back' }))
  ];
  ctx.shared.cityConsumers = consumers;
  return { root, update() {}, houses, towers, school, hospital, consumers };
}
