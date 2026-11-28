// Prédios principais da cidade, cada um com identidade própria.
import { Model, Cyl, Dome, GableI, GableJ, type Shader, type Hit } from '../model';
import { pick, hex, scale, type U32 } from '../color';
import { hash2, strSeed } from '../rng';
import { E, P } from '../palette';
import { sx, sy } from '../iso';
import { col, lum, row, solid, tileRoof, wallShader, winAt, signPixel, type Grid, type Sign } from './kit';
import { INSET } from './buildings';
import type { Building } from '../../data';
import type { Obj, Light } from '../types';
import type { TextMask } from '../font';

const pool = (i: number, j: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j), r, color, a, kind: 'pool' });
const halo = (i: number, j: number, z: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j, z), r, color, a, kind: 'halo' });
const WHITE = hex('#fbf7ee');

function finish(b: Building, m: Model, fp: [number, number, number, number], lights: Light[], topZ: number, group: Obj['group'] = 'civic'): Obj {
  const sprite = m.render();
  const ci = (fp[0] + fp[2]) / 2, cj = (fp[1] + fp[3]) / 2;
  return { id: b.id, kind: b.tipo, fp, layer: 1, sprite, group, lights, anchor: { x: sx(ci, cj), y: sy(ci, cj, topZ) }, ref: b.id };
}

const lattice = (r = P.metal, k = 0): Shader => (h, px, py, o) => {
  if (h.face === 'T') { o.c = pick(r, lum(h) + k, px, py); return; }
  const c = col(h), rr = row(h);
  const cols = 5;
  const edge = c % cols === 0 || c % cols === cols - 1;
  const brace = (c + rr) % 6 === 0 || (c - rr + 600) % 6 === 0;
  if (edge || brace || rr % 6 === 0) o.c = pick(r, lum(h) + k + 0.1, px, py);
};

// ---------------- PREFEITURA ----------------
export function prefeitura(b: Building): Obj {
  const seed = strSeed(b.id);
  const i0 = 10.25, j0 = 5.3, i1 = 14.75, j1 = 8.5, H = 40;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: 7, floorH: 16, floors: 2, ww: 4, wh: 10, cell: 9, sill: 3, margin: 5 };
  const ws = wallShader({
    wall: P.cream, trim: P.white, glass: P.glass, frame: P.white, grid, seed, lit: 0.8, colsL, colsR, baseH: 6, texture: 'reboco', roof: { w: i1 - i0, d: j1 - j0, kind: 'laje' },
    extra: (o, h, px, py, c, r) => {
      const cols = h.face === 'L' ? colsL : colsR;
      if (r >= H - 4) { o.c = pick(P.white, lum(h) + (r === H - 4 ? -0.25 : 0.12), px, py); return true; } // cornija
      if (r === 22) { o.c = pick(P.white, lum(h) + 0.05, px, py); return true; } // friso entre andares
      const w = winAt(c, cols, h.v, grid);
      if (w && w.inX && w.inY && w.wy === grid.wh - 1 && (w.wx === 0 || w.wx === grid.ww - 1)) { o.c = pick(P.white, lum(h) + 0.1, px, py); return true; } // arco
      if (w && w.inX && w.wy === grid.wh && w.wx > 0 && w.wx < grid.ww - 1) { o.c = pick(P.white, lum(h) + 0.12, px, py); return true; }
      if (w && !w.inX && (w.wx === grid.cell - 1)) { o.c = pick(P.cream, lum(h) + 0.12, px, py); return true; } // pilastras
      return false;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  // balaustrada
  const bal: Shader = (h, px, py, o) => { if (h.face === 'T') { o.c = pick(P.white, 0.9, px, py); return; } const r = row(h); o.c = r === 0 || r >= 3 || col(h) % 3 === 0 ? pick(P.white, lum(h) + 0.1, px, py) : 0; };
  m.box(i0, j0, H, i1, j0 + 0.08, H + 4, bal); m.box(i0, j0, H, i0 + 0.08, j1, H + 4, bal);
  m.box(i0, j1 - 0.08, H, i1, j1, H + 4, bal); m.box(i1 - 0.08, j0, H, i1, j1, H + 4, bal);
  // pórtico com colunas e frontão
  const pi0 = 11.15, pi1 = 13.85, pj0 = j1, pj1 = 9.12;
  m.box(pi0 - 0.15, pj0, 0, pi1 + 0.15, pj1 + 0.12, 2, solid(P.stone, 0.15));
  m.box(pi0 - 0.3, pj1 + 0.12, 0, pi1 + 0.3, pj1 + 0.26, 1, solid(P.stone, 0.12));
  for (const ci of [11.4, 12.1, 12.9, 13.6]) m.add(new Cyl(ci, pj1 - 0.1, 0.075, 2, 31, (h, px, py, o) => { o.c = pick(P.white, lum(h) + 0.12 + ((Math.round(h.u * 8) & 1) ? 0 : -0.04), px, py); }));
  // arquitrave de 8 px: as letras (5 linhas + degrau da isometria) cabem inteiras; com 5 px saíam cortadas
  const ent: Sign = { text: 'PREFEITURA', face: 'L', vTop: 7.5, fg: hex('#2a2040'), bg: null };
  m.box(pi0, pj0, 30, pi1, pj1, 38, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.white, 0.85, px, py); return; }
    if (signPixel(o, h, px, py, ent, Math.round((pi1 - pi0) * 16))) return;
    o.c = pick(P.white, lum(h) + (row(h) === 0 ? -0.2 : 0.05), px, py);
  });
  m.add(new GableJ(pi0 - 0.05, pj0, pi1 + 0.05, pj1 + 0.04, 38, 8, (h, px, py, o) => {
    if (h.face === 'GE') { const e = row(h) === 0 || hash2(col(h), row(h)) < 0 ? 1 : 0; o.c = pick(P.white, lum(h) + 0.05 - e * 0.15, px, py); return; }
    o.c = pick(P.slate, lum(h) + 0.05, px, py);
  }));
  // porta principal e janelas iluminadas atrás das colunas
  m.box(12.15, j1 - 0.01, 2, 12.85, j1 + 0.01, 18, (h, px, py, o) => { const e = col(h) === 0 || col(h) >= 10 || row(h) >= 15; o.c = e ? pick(P.white, 0.7, px, py) : pick(P.wood, lum(h) - 0.05, px, py); if (!e) o.e = scale(E.warm, 0.5); }, 'L');
  // torre do relógio
  const ti0 = 12.08, ti1 = 12.92, tj0 = 6.45, tj1 = 7.29, tz = H + 34;
  m.box(ti0, tj0, H, ti1, tj1, tz, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.white, 0.9, px, py); return; }
    const c = col(h), r = row(h) + H;
    const cc = (h.face === 'L' ? (ti1 - ti0) : (tj1 - tj0)) * 16;
    const dx = c - cc / 2 + 0.5, dy = r - (tz - 10);
    const d = Math.hypot(dx, dy);
    if (h.face === 'L' && d < 5.3) {
      // relógio marcando 10h10: ponteiros como segmentos a partir do centro
      const seg = (ax: number, ay: number, len: number) => { const t = Math.max(0, Math.min(len, dx * ax + dy * ay)); return Math.hypot(dx - ax * t, dy - ay * t) < 0.75; };
      const hand = seg(-0.82, 0.57, 2.6) || seg(0.82, 0.57, 3.6);
      o.c = d > 4.3 ? pick(P.yellow, lum(h) + 0.1, px, py) : hand ? hex('#2a2238') : hex('#f8f1dc');
      if (!hand && d <= 4.3) o.e = hex('#ffe9b0');
      return;
    }
    if (h.face === 'R' && Math.abs(dx) < 2.2 && dy > -6 && dy < 5) {
      o.c = Math.abs(dx) < 1.2 && dy < 4 ? pick(P.glass, lum(h), px, py) : pick(P.white, lum(h) + 0.1, px, py);
      if (Math.abs(dx) < 1.2 && dy < 4) o.e = scale(E.warm, 0.6);
      return;
    }
    if (r >= tz - 2 || r === H + 3) { o.c = pick(P.white, lum(h) + 0.12, px, py); return; }
    // janelinha alta
    if (r > H + 6 && r < H + 15 && Math.abs(c - cc / 2) < 1.6) { o.c = pick(P.glass, lum(h), px, py); o.e = scale(E.warm, 0.7); return; }
    o.c = pick(P.cream, lum(h) + (c === 0 || c === cc - 1 ? 0.1 : 0) + (hash2(px, py) - 0.5) * 0.05, px, py);
  });
  m.add(new Dome(12.5, 6.87, tz, 0.5, (h, px, py, o) => { o.c = pick(P.teal, lum(h) + 0.1 + (Math.floor(h.v * 8) & 1 ? 0.04 : -0.04), px, py); }, tz));
  m.add(new Cyl(12.5, 6.87, 0.06, tz + 7, tz + 12, solid(P.yellow, 0.2)));
  m.add(new Cyl(12.5, 6.87, 0.02, tz + 12, tz + 30, solid(P.metal, 0.3)));
  // mastros na frente
  for (const fi of [10.85, 14.15]) m.add(new Cyl(fi, 9.05, 0.025, 0, 44, solid(P.metal, 0.35)));
  const lights: Light[] = [
    pool(12.5, 9.5, 1.9, E.warm, 0.95), pool(10.9, 9.2, 1.2, E.warm, 0.7), pool(14.1, 9.2, 1.2, E.warm, 0.7),
    halo(12.5, 8.6, 18, 1.6, hex('#ffcf8a'), 0.28), halo(10.6, 8.6, 20, 1.3, hex('#ffcf8a'), 0.2), halo(14.4, 8.6, 20, 1.3, hex('#ffcf8a'), 0.2),
    halo(12.5, 7.3, tz - 10, 0.6, hex('#fff1c8'), 0.6),
  ];
  return finish(b, m, [i0, j0, i1, pj1 + 0.26], lights, tz + 30);
}

// ---------------- ESCOLA ----------------
export function escola(b: Building): Obj {
  const seed = strSeed(b.id);
  const i0 = 4.25, j0 = 4.3, i1 = 8.75, j1 = 6.65, gH = 14, H = 28;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: 3, floorH: 13, floors: 2, ww: 7, wh: 6, cell: 9, sill: 3, margin: 4 };
  const signs: Sign[] = [{ text: 'ESCOLA MUNICIPAL', face: 'L', vTop: H - 2, fg: hex('#1f2f6a'), bg: P.white }];
  const ws = wallShader({
    wall: P.yellow, trim: P.white, glass: P.glass, frame: P.white, grid, seed, lit: 0.55, colsL, colsR, baseH: 3, signs, texture: 'reboco', quoins: true,
    extra: (o, h, px, py, c, r) => {
      if (r === gH || r === gH + 1) { o.c = pick(P.blue, lum(h) + 0.1, px, py); return true; } // faixa azul
      if (r >= H - 8) { o.c = pick(P.white, lum(h) + 0.02, px, py); return true; }
      return false;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  m.add(new GableI(i0 - 0.1, j0 - 0.1, i1 + 0.1, j1 + 0.1, H, 10, tileRoof(P.terracotta, ws), false));
  m.add(new GableI(i0, j0, i1, j1, H, 9, ws, true));
  // marquise de entrada
  m.box(5.9, j1, 12, 7.1, j1 + 0.4, 14, solid(P.white, 0.05));
  for (const ci of [5.98, 7.02]) m.add(new Cyl(ci, j1 + 0.33, 0.04, 0, 12, solid(P.white, 0.1)));
  m.box(6.25, j1 - 0.01, 0, 6.75, j1 + 0.01, 10, (h, px, py, o) => { o.c = pick(P.blue, lum(h) - 0.05, px, py); o.e = scale(E.warm, 0.35); }, 'L');
  // alambrado da quadra (só lados de trás e direita para não tapar a quadra)
  const net: Shader = (h, px, py, o) => { if (h.face === 'T') { o.c = pick(P.metal, 0.6, px, py); return; } const c = col(h), r = row(h); o.c = (c + r) % 3 === 0 || (c - r + 300) % 3 === 0 || r === 0 || r >= 11 ? pick(P.green, lum(h) + 0.1, px, py) : 0; };
  m.box(8.72, 7.05, 0, 8.76, 9.72, 12, net, 'R');
  // tabelas de basquete
  for (const [ci, cj] of [[4.45, 8.5], [8.55, 8.5]]) {
    m.add(new Cyl(ci, cj, 0.03, 0, 18, solid(P.metal, 0.3)));
    m.box(ci - 0.02, cj - 0.22, 17, ci + 0.03, cj + 0.22, 24, (h, px, py, o) => { o.c = pick(P.white, lum(h) + 0.1, px, py); if (h.face !== 'T' && Math.abs(col(h) - 3.5) < 1.5 && row(h) > 1 && row(h) < 4) o.c = hex('#e0503a'); });
  }
  const lights: Light[] = [pool(6.5, 7.2, 1.3, E.warm, 0.7), pool(5.2, 8.3, 1.6, E.cool, 0.6), pool(7.8, 8.3, 1.6, E.cool, 0.6)];
  for (const [ci, cj] of [[4.4, 7.2], [8.6, 7.2], [4.4, 9.6], [8.6, 9.6]]) {
    m.add(new Cyl(ci, cj, 0.025, 0, 34, solid(P.metal, 0.3)));
    m.box(ci - 0.1, cj - 0.06, 33, ci + 0.1, cj + 0.06, 36, (h, px, py, o) => { o.c = pick(P.metal, lum(h), px, py); if (h.face !== 'T') o.e = E.lamp; });
    lights.push(halo(ci, cj, 34, 0.35, E.lamp, 0.7));
  }
  return finish(b, m, [i0, j0, i1, j1 + 0.4], lights, H + 16);
}

// ---------------- HOSPITAL ----------------
export function hospital(b: Building): Obj {
  const seed = strSeed(b.id);
  const i0 = 16.25, j0 = 4.25, i1 = 19.75, j1 = 8.6, gH = 16, fH = 13, H = gH + fH * 4;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: gH, floorH: fH, floors: 4, ww: 7, wh: 7, cell: 8, sill: 3, margin: 3 };
  const RED = hex('#e8343c');
  const signs: Sign[] = [
    { text: 'HOSPITAL', face: 'L', vTop: H - 2, fg: hex('#ffffff'), bg: P.red, glow: hex('#ff5a5a') },
    { text: 'EMERGÊNCIA', face: 'R', vTop: 25, fg: hex('#ffffff'), bg: P.red, glow: hex('#ff4a4a') },
  ];
  const ws = wallShader({
    wall: P.white, trim: P.teal, glass: P.glass, frame: P.white, grid, seed, lit: 0.85, colsL, colsR, baseH: 2, signs, bands: true, texture: 'painel', roof: { w: i1 - i0, d: j1 - j0, kind: 'manta' },
    extra: (o, h, px, py, c, r) => {
      // cruz vermelha na face +i
      if (h.face === 'R') {
        const cx = colsR / 2 - 0.5, cy = H - 18;
        const dx = Math.abs(c - cx), dy = Math.abs(r - cy);
        if ((dx < 2.6 && dy < 7.6) || (dx < 7.6 && dy < 2.6)) { o.c = RED; o.e = hex('#ff3a3a'); return true; }
        if ((dx < 3.6 && dy < 8.6) || (dx < 8.6 && dy < 3.6)) { o.c = pick(P.white, 0.95, px, py); return true; }
      }
      if (r < gH && r > 2 && h.face === 'R' && c > 6 && c < colsR - 6) { o.c = pick(P.glass, lum(h) + 0.05, px, py); o.e = scale(E.cool, 0.6); return true; }
      if (r >= H - 9) { o.c = pick(P.white, lum(h) + 0.05, px, py); return true; }
      return false;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  // heliponto
  m.box(i0 + 0.5, j0 + 0.6, H, i1 - 0.35, j1 - 0.55, H + 2, (h, px, py, o) => {
    if (h.face !== 'T') { o.c = pick(P.concrete, lum(h), px, py); return; }
    const ci = (i0 + 0.5 + i1 - 0.35) / 2, cj = (j0 + 0.6 + j1 - 0.55) / 2;
    const di = h.i - ci, dj = h.j - cj, d = Math.hypot(di, dj);
    const Hm = (Math.abs(di) < 0.42 && Math.abs(dj) < 0.07) || (Math.abs(dj + 0.32) < 0.07 && Math.abs(di) < 0.42) || (Math.abs(dj - 0.32) < 0.07 && Math.abs(di) < 0.42);
    let c = pick(P.concrete, 0.45, px, py);
    if (Math.abs(d - 1.0) < 0.07) c = hex('#f2d24a');
    if (Hm && d < 0.7) c = hex('#f4f4f4');
    o.c = c;
  });
  m.box(i0 + 0.15, j0 + 0.15, H, i0 + 0.75, j0 + 0.75, H + 10, solid(P.white, 0));
  m.add(new Cyl(i0 + 0.4, j0 + 0.4, 0.02, H + 10, H + 26, solid(P.metal, 0.3)));
  for (const [a, bb] of [[i0 + 0.6, j1 - 0.6], [i1 - 0.4, j0 + 0.65], [i1 - 0.4, j1 - 0.6]]) m.box(a - 0.05, bb - 0.05, H, a + 0.05, bb + 0.05, H + 3, (h, px, py, o) => { o.c = pick(P.metal, 0.5, px, py); o.e = hex('#7dff9a'); });
  // marquise da emergência
  m.box(i1, 5.6, 13, i1 + 0.22, 7.6, 15, (h, px, py, o) => { o.c = pick(P.white, lum(h) + 0.05, px, py); if (h.face !== 'T') { o.c = RED; o.e = scale(hex('#ff3a3a'), 0.6); } });
  for (const cj of [5.7, 7.5]) m.add(new Cyl(i1 + 0.17, cj, 0.035, 0, 13, solid(P.white, 0.1)));
  const lights: Light[] = [
    pool(i1 + 0.35, 6.6, 1.6, hex('#dff2ff'), 0.9), pool(18, 9.4, 1.6, E.cool, 0.6),
    halo(i0 + 0.4, j0 + 0.4, H + 26, 0.25, E.red, 0.9),
    halo(i1, (j0 + j1) / 2, H - 18, 0.9, hex('#ff4040'), 0.35),
  ];
  return finish(b, m, [i0, j0, i1 + 0.22, j1], lights, H + 26);
}

// ---------------- MERCADO (vitrine voltada para +i) ----------------
export function mercado(b: Building): Obj {
  const seed = strSeed(b.id);
  const I = b.posicao.i, J = b.posicao.j;
  const i0 = I + 0.25, j0 = J + 0.3, i1 = I + b.tamanho.w - 0.42, j1 = J + b.tamanho.d - 0.25, H = 20;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: 99, floorH: 10, floors: 0, ww: 4, wh: 4, cell: 8, sill: 1, margin: 2 };
  const ws = wallShader({
    wall: P.green, trim: P.white, glass: P.glass, grid, seed, lit: 0, colsL, colsR, baseH: 2, texture: 'pastilha', roof: { w: i1 - i0, d: j1 - j0, kind: 'manta' },
    extra: (o, h, px, py, c, r) => {
      const cols = h.face === 'L' ? colsL : colsR;
      if (r >= H - 4) { o.c = pick(P.white, lum(h) + 0.05, px, py); return true; }
      if (h.face === 'R' && r >= 2 && r < 12 && c > 3 && c < cols - 3) {
        // vitrine com prateleiras coloridas
        const mull = c % 9 === 0;
        if (mull) { o.c = pick(P.metal, lum(h) + 0.1, px, py); return true; }
        const door = Math.abs(c - cols / 2) < 5;
        const shelf = !door && (r === 4 || r === 7);
        const goods = !door && (r === 5 || r === 6 || r === 8 || r === 9) && hash2(c, r, seed) > 0.35;
        o.c = pick(P.glass, lum(h) + 0.1, px, py);
        o.e = shelf ? scale(E.white, 0.6) : goods ? [hex('#ff8a5a'), hex('#ffe066'), hex('#8af07a'), hex('#7ac8ff')][Math.floor(hash2(c, r, 2) * 4)] : hex('#fff4d6');
        if (door && r > 9) o.e = hex('#fff4d6');
        return true;
      }
      if (h.face === 'L' && r > 4 && r < 14) {
        // mural de frutas pintado na lateral
        const t = Math.floor(c / 6) % 4;
        const cx = (c % 6) - 2.5, cy = r - 9;
        if (cx * cx + cy * cy < 5.5) { o.c = [hex('#e2483a'), hex('#f4c440'), hex('#6cc04a'), hex('#f08a2a')][t]; return true; }
      }
      return false;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  // marquise vermelha sobre a calçada
  m.box(i1, j0 + 0.1, 12, i1 + 0.22, j1 - 0.1, 14, (h, px, py, o) => { o.c = pick(P.red, lum(h) + 0.05, px, py); if (h.face === 'R') o.e = scale(hex('#ff6a4a'), 0.35); });
  // letreiro grande no topo
  const sg: Sign = { text: 'MERCADO', face: 'R', vTop: 7, fg: hex('#ffffff'), bg: P.red, glow: hex('#ffd0c8') };
  m.box(i1 - 0.18, j0 + 0.2, H, i1 - 0.08, j1 - 0.2, H + 10, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.red, 0.6, px, py); return; }
    if (signPixel(o, h, px, py, sg, Math.round((j1 - j0 - 0.4) * 16))) return;
    o.c = pick(P.red, lum(h), px, py); o.e = scale(hex('#ff4a3a'), 0.25);
  });
  for (const a of [j0 + 0.5, j1 - 0.5]) m.add(new Cyl(i1 - 0.3, a, 0.025, H, H + 2, solid(P.metal, 0.2)));
  rooftopSimple(m, i0, j0, i1, j1, H);
  // carrinhos de compras e caixotes de fruta na calçada
  for (let k = 0; k < 3; k++) m.box(i1 + 0.06, j0 + 0.35 + k * 0.14, 0, i1 + 0.18, j0 + 0.45 + k * 0.14, 4, (h, px, py, o) => { o.c = h.face === 'T' ? hex(['#e2483a', '#f4c440', '#6cc04a'][k]) : pick(P.wood, lum(h) + 0.1, px, py); });
  const lights: Light[] = [pool(i1 + 0.5, (j0 + j1) / 2, 2.0, hex('#fff1d0'), 0.95), halo(i1, (j0 + j1) / 2, 26, 1.1, hex('#ff5a4a'), 0.3)];
  return finish(b, m, [i0, j0, i1 + 0.22, j1], lights, H + 14, 'shop');
}

function rooftopSimple(m: Model, i0: number, j0: number, i1: number, j1: number, z: number) {
  const ps = solid(P.concrete, 0.05, 0.02);
  m.box(i0, j0, z, i1, j0 + 0.06, z + 2, ps); m.box(i0, j0, z, i0 + 0.06, j1, z + 2, ps);
  m.box(i0, j1 - 0.06, z, i1, j1, z + 2, ps); m.box(i1 - 0.06, j0, z, i1, j1, z + 2, ps);
  for (let k = 0; k < 3; k++) m.box(i0 + 0.5 + k * 1.2, j0 + 0.5, z, i0 + 0.8 + k * 1.2, j0 + 0.75, z + 3, solid(P.white, -0.1));
}

// ---------------- DELEGACIA ----------------
export function delegacia(b: Building): Obj {
  const seed = strSeed(b.id);
  const i0 = 4.25, j0 = 18.3, i1 = 6.75, j1 = 20.6, gH = 14, H = 28;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: 3, floorH: 13, floors: 2, ww: 4, wh: 6, cell: 8, sill: 3, margin: 4 };
  const signs: Sign[] = [{ text: 'DELEGACIA', face: 'L', vTop: H - 2, fg: hex('#ffffff'), bg: P.police, glow: hex('#9cc4ff') }];
  const ws = wallShader({
    wall: P.white, trim: P.police, glass: P.glass, grid, seed, lit: 0.75, colsL, colsR, baseH: 3, signs, bands: false, texture: 'reboco', quoins: true, roof: { w: i1 - i0, d: j1 - j0, kind: 'cascalho' },
    door: { face: 'L', c0: Math.floor(colsL / 2) - 3, w: 6, h: 10, glow: scale(E.cool, 0.6) },
    extra: (o, h, px, py, c, r) => {
      if (r === gH || r === gH + 1) { o.c = pick(P.police, lum(h) + 0.15, px, py); return true; }
      if (r >= H - 9) { o.c = pick(P.police, lum(h) + 0.05, px, py); return true; }
      return false;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  rooftopSimple(m, i0, j0, i1, j1, H);
  // luz azul na entrada
  const cl = (i0 + i1) / 2;
  m.box(cl - 0.07, j1, 11, cl + 0.07, j1 + 0.1, 13.5, (h, px, py, o) => { o.c = hex('#3a6ae8'); o.e = hex('#4f8dff'); });
  m.add(new Cyl(i1 + 0.05, j1 - 0.3, 0.02, 0, 38, solid(P.metal, 0.35))); // mastro na face lateral (sem placa), longe das letras
  const lights: Light[] = [pool(cl, j1 + 0.4, 1.4, hex('#cfe0ff'), 0.85), halo(cl, j1 + 0.05, 12, 0.5, hex('#4f8dff'), 0.8)];
  return finish(b, m, [i0, j0, i1 + 0.08, j1 + 0.1], lights, H + 10);
}

// ---------------- OFICINA ----------------
export function oficina(b: Building): Obj {
  const i0 = 7.25, j0 = 18.3, i1 = 8.75, j1 = 20.7, H = 20;
  const colsR = Math.round((j1 - j0) * 16);
  const sg: Sign = { text: 'OFICINA', face: 'R', vTop: H - 2, fg: hex('#1b1b24'), bg: P.yellow, glow: null };
  const ws: Shader = (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.metal, 0.62 + ((Math.floor(h.u * 8)) & 1 ? 0.06 : 0), px, py); return; }
    const c = col(h), r = row(h);
    if (signPixel(o, h, px, py, sg, colsR)) return;
    // portão de enrolar aberto com interior iluminado
    if (h.face === 'R' && c >= 6 && c < colsR - 6 && r < 13) {
      if (r >= 11) { o.c = pick(P.metal, lum(h) + ((r & 1) ? 0.1 : -0.05), px, py); return; }
      o.c = pick(P.black, 0.6, px, py); o.e = scale(E.warm, 0.32);
      const carRow = r >= 1 && r <= 5 && c > 10 && c < colsR - 10; // silhueta de carro
      if (carRow && !(r === 5 && (c < 13 || c > colsR - 13))) { o.c = hex('#c8352f'); o.e = scale(hex('#ff5a3a'), 0.4); }
      if (r === 0) o.e = 0;
      return;
    }
    // chapa ondulada
    o.c = pick(P.slate, lum(h) + ((c % 3) === 0 ? -0.08 : 0.04) + (r < 2 ? -0.1 : 0), px, py);
  };
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  // pilha de pneus
  for (let k = 0; k < 3; k++) m.add(new Cyl(i1 + 0.12, j0 + 0.3, 0.13, k * 3, k * 3 + 3, (h, px, py, o) => { o.c = pick(P.black, h.face === 'T' ? 0.5 : 0.8, px, py); }));
  const lights: Light[] = [pool(i1 + 0.3, (j0 + j1) / 2, 1.3, E.warm, 0.8)];
  return finish(b, m, [i0, j0, i1 + 0.25, j1], lights, H + 6, 'shop');
}

// ícone em pixels como máscara de letreiro (uma "letra" só: fica em pé na face inclinada)
const BUS_ICON = ['.##########.', '#..#..#..#.#', '#..#..#..#.#', '############', '##.######.##', '.#........#.'];
function iconMask(rows: string[]): TextMask {
  const w = rows[0].length, h = rows.length + 2;
  const bits = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === '#') bits[(y + 1) * w + x] = 1; }));
  return { w, h, bits, base: 1, starts: new Int16Array(w + 1) };
}

// ---------------- TERMINAL ----------------
export function terminal(b: Building): Obj {
  const i0 = 10.25, j0 = 21.3, i1 = 11.75, j1 = 23.7, H = 19;
  const colsR = Math.round((j1 - j0) * 16), colsL = Math.round((i1 - i0) * 16);
  const sg: Sign = { text: 'TERMINAL', face: 'R', vTop: H - 2, fg: hex('#ffffff'), bg: P.blue, glow: hex('#9cc8ff') };
  // face estreita (24 px): "ÔNIBUS" ocupava tudo e colava em "TERMINAL" na quina; vai um ícone de ônibus em pé
  const sgL: Sign = { text: '[ônibus]', face: 'L', vTop: H - 2, fg: hex('#ffffff'), bg: P.blue, glow: hex('#9cc8ff'), mask: iconMask(BUS_ICON) };
  const ws: Shader = (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.concrete, 0.6 + ((Math.floor(h.u * 6) & 1) ? 0.05 : 0), px, py); return; }
    if (signPixel(o, h, px, py, sg, colsR) || signPixel(o, h, px, py, sgL, colsL)) return;
    const c = col(h), r = row(h);
    if (h.face === 'R' && r < 12 && ((c > 3 && c < 17) || (c > 21 && c < 35))) {
      if (r >= 10) { o.c = pick(P.metal, 0.5, px, py); return; }
      o.c = pick(P.black, 0.7, px, py); o.e = scale(E.warm, 0.25); return;
    }
    o.c = pick(P.orange, lum(h) + (r < 2 ? -0.12 : 0) + ((c % 8) === 0 ? 0.08 : 0), px, py);
  };
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  const lights: Light[] = [pool(13, 22.5, 2.0, hex('#fff0cc'), 0.8)];
  for (const cj of [21.6, 23.4]) {
    m.add(new Cyl(13.6, cj, 0.025, 0, 30, solid(P.metal, 0.3)));
    m.box(13.5, cj - 0.06, 29, 13.7, cj + 0.06, 31, (h, px, py, o) => { o.c = pick(P.metal, 0.5, px, py); if (h.face !== 'T') o.e = E.lamp; });
    lights.push(halo(13.6, cj, 30, 0.35, E.lamp, 0.8), pool(13.4, cj, 1.4, E.lamp, 0.55));
  }
  return finish(b, m, [i0, j0, i1, j1], lights, H + 6);
}

// ---------------- CANTEIRO DE OBRAS ----------------
export function obra(b: Building): { site: Obj; crane: Obj } {
  const m = new Model();
  const i0 = 16.6, j0 = 18.6, i1 = 19.0, j1 = 22.0;
  const slabs = [0, 13, 26, 39];
  const concrete = solid(P.concrete, 0.02, 0.08);
  for (let f = 0; f < slabs.length; f++) {
    const z = slabs[f];
    m.box(i0, j0, z, i1, j1, z + 2, concrete);
    if (f === slabs.length - 1) break;
    const cols = [i0, i0 + 0.8, i0 + 1.6, i1 - 0.12];
    const rows = [j0, j0 + 1.1, j0 + 2.2, j1 - 0.12];
    for (const ci of cols) for (const cj of rows) m.box(ci, cj, z + 2, ci + 0.12, cj + 0.12, z + 13, concrete);
    if (f < 2) {
      // alvenaria de tijolos com vãos de janela
      const brick: Shader = (h, px, py, o) => {
        if (h.face === 'T') { o.c = pick(P.brick, 0.6, px, py); return; }
        const c = col(h), r = row(h);
        if (r > 3 && r < 9 && c % 10 > 3 && c % 10 < 8) { o.c = 0; return; }
        const off = ((r >> 1) & 1) * 2;
        o.c = pick(P.brick, lum(h) + (((c + off) % 4 === 0) || (r % 2 === 0) ? -0.12 : 0.02), px, py);
      };
      m.box(i0 + 0.12, j1 - 0.14, z + 2, i1 - 0.12, j1 - 0.04, z + 13, brick, 'TL');
      m.box(i1 - 0.14, j0 + 0.12, z + 2, i1 - 0.04, j1 - 0.12, z + 13, brick, 'TR');
    }
  }
  // vergalhões no topo
  for (const ci of [i0, i0 + 0.8, i0 + 1.6, i1 - 0.12]) for (const cj of [j0, j0 + 1.1, j0 + 2.2, j1 - 0.12]) m.box(ci + 0.04, cj + 0.04, 41, ci + 0.08, cj + 0.08, 47, solid(P.terracotta, -0.1));
  // andaime na face +i
  const pipe = solid(P.metal, 0.25, 0.02);
  for (const cj of [j0 + 0.1, j0 + 1.2, j0 + 2.3, j1 - 0.1]) m.box(i1 + 0.28, cj, 0, i1 + 0.32, cj + 0.04, 42, pipe);
  for (const z of [10, 21, 32]) {
    m.box(i1 + 0.05, j0, z, i1 + 0.32, j1, z + 1, solid(P.wood, 0.1));
    m.box(i1 + 0.28, j0, z + 5, i1 + 0.32, j1, z + 6, pipe);
  }
  // tela de proteção verde no andar de cima (face +j)
  m.box(i0, j1 + 0.04, 28, i1 + 0.32, j1 + 0.06, 40, (h, px, py, o) => { const c = col(h), r = row(h); o.c = (c + r) % 2 === 0 ? pick(P.green, lum(h) - 0.05, px, py) : 0; }, 'L');
  // tapume
  const fence: Shader = (h, px, py, o) => { if (h.face === 'T') { o.c = pick(P.metal, 0.6, px, py); return; } const c = col(h), r = row(h); o.c = pick(P.slate, lum(h) + ((c % 4) === 0 ? -0.1 : 0.05) + (r === 7 ? 0.15 : 0), px, py); };
  m.box(16.25, 23.66, 0, 19.75, 23.72, 8, (h, px, py, o) => {
    if (h.face === 'L' && signPixel(o, h, px, py, { text: 'OBRA', face: 'L', x0: 22, vTop: 6.5, fg: hex('#1b1b24'), bg: P.yellow }, 56)) return;
    fence(h, px, py, o);
  });
  m.box(19.69, 18.3, 0, 19.75, 23.7, 8, fence);
  // contêiner do escritório da obra
  const sg: Sign = { text: 'ENGENHARIA', face: 'L', vTop: 11, fg: hex('#ffffff'), bg: null };
  m.box(16.3, 22.5, 0, 19.1, 23.3, 12, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.blue, 0.7, px, py); return; }
    if (signPixel(o, h, px, py, sg, 45)) return;
    const c = col(h), r = row(h);
    if (h.face === 'L' && ((c > 3 && c < 9) || (c > 36 && c < 42)) && r > 2 && r < 7) { o.c = pick(P.glass, 0.6, px, py); o.e = E.warm; return; }
    o.c = pick(P.blue, lum(h) + ((c % 3) === 0 ? -0.08 : 0.04), px, py);
  });
  // areia e tijolos
  m.add(new Dome(19.3, 22.35, -2, 0.32, (h, px, py, o) => { o.c = pick(P.sand, lum(h) + (hash2(px, py) - 0.5) * 0.15, px, py); }, 0));
  m.box(16.4, 18.3, 0, 16.9, 18.6, 4, (h, px, py, o) => { o.c = pick(P.brick, lum(h) + (((col(h) + (row(h) & 1) * 2) % 4) === 0 ? -0.15 : 0), px, py); });
  const siteLights: Light[] = [pool(17.8, 22.4, 1.6, hex('#e8f0ff'), 0.8), halo(17.6, 23.3, 9, 0.4, E.warm, 0.5)];
  const site = finish(b, m, [16.25, 18.3, 19.75, 23.72], siteLights, 50);

  // grua (objeto separado e alto)
  const cm = new Model();
  const mi = 19.25, mj = 18.75, top = 150;
  cm.box(mi - 0.17, mj - 0.17, 0, mi + 0.17, mj + 0.17, 3, solid(P.concrete, 0));
  cm.box(mi - 0.13, mj - 0.13, 3, mi + 0.13, mj + 0.13, top, lattice(P.yellow, 0.1));
  // lança ao longo de -i e contra-lança ao longo de +i
  cm.box(mi - 4.6, mj - 0.08, top, mi + 0.13, mj + 0.08, top + 6, lattice(P.yellow, 0.05));
  cm.box(mi + 0.13, mj - 0.1, top, mi + 1.5, mj + 0.1, top + 5, lattice(P.yellow, 0));
  cm.box(mi + 1.0, mj - 0.18, top - 6, mi + 1.5, mj + 0.18, top + 1, solid(P.concrete, -0.05));
  cm.box(mi - 0.13, mj - 0.13, top + 6, mi + 0.13, mj + 0.13, top + 22, lattice(P.yellow, 0.1));
  cm.box(mi - 0.3, mj + 0.13, top - 12, mi + 0.1, mj + 0.42, top - 2, (h, px, py, o) => { o.c = pick(P.yellow, lum(h), px, py); if (h.face === 'L' && row(h) > 3) { o.c = pick(P.glass, 0.6, px, py); o.e = scale(E.warm, 0.5); } });
  const craneLights: Light[] = [halo(mi, mj, top + 22, 0.3, E.red, 1), halo(mi - 4.5, mj, top + 6, 0.25, E.red, 0.9)];
  const crane: Obj = { id: 'grua', kind: 'grua', fp: [mi - 0.17, mj - 0.17, mi + 0.17, mj + 0.17], layer: 1, sprite: cm.render({ edge: false }), group: 'civic', lights: craneLights, ref: b.id };
  return { site, crane };
}
