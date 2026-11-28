// Geradores de prédios a partir de data/buildings.json.
import { Model, Box, Cyl, Dome, GableI, GableJ, Poly, type Shader } from '../model';
import { pick, hex, scale, mix, type Ramp, type U32 } from '../color';
import { hash2, strSeed, mulberry32 } from '../rng';
import { E, P } from '../palette';
import { sx, sy } from '../iso';
import { col, lum, row, roofShader, solid, tileRoof, wallShader, winAt, windowPixel, signPixel, signFits, type Grid, type Sign } from './kit';
import { buildings } from '../../data';
import { isRoad as isRoadTile } from '../map';
import type { Building } from '../../data';
import type { Obj, Light } from '../types';

export const INSET = 0.24;
const RAMPS: Record<string, Ramp> = {
  cream: P.cream, pink: P.pink, mint: P.mint, yellow: P.yellow, lilac: P.lilac, orange: P.orange, teal: P.teal,
  white: P.white, brick: P.brick, blue: P.police, slate: P.slate, green: P.green, red: P.red, stone: P.stone,
};
const rampOf = (name?: string, d: Ramp = P.cream) => (name && RAMPS[name]) || d;

const pool = (i: number, j: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j), r, color, a, kind: 'pool' });
const halo = (i: number, j: number, z: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j, z), r, color, a, kind: 'halo' });

function obj(b: Building, m: Model, fp: [number, number, number, number], group: Obj['group'], lights: Light[], topZ: number, edge = true): Obj {
  const sprite = m.render({ edge });
  const ci = (fp[0] + fp[2]) / 2, cj = (fp[1] + fp[3]) / 2;
  return { id: b.id, kind: b.tipo, fp, layer: 1, sprite, group, lights, anchor: { x: sx(ci, cj), y: sy(ci, cj, topZ) }, ref: b.id, planned: b.status === 'planejado' };
}

// mureta + cascalho + caixa d'água + casa de máquinas
function rooftop(m: Model, i0: number, j0: number, i1: number, j1: number, z: number, seed: number, opts: { tank?: boolean; ac?: number; parapet?: Ramp; machine?: boolean } = {}) {
  const pr = opts.parapet ?? P.concrete;
  const t = 0.07, ph = 3;
  const ps = solid(pr, 0.02, 0.02);
  m.box(i0, j0, z, i1, j0 + t, z + ph, ps);
  m.box(i0, j0, z, i0 + t, j1, z + ph, ps);
  m.box(i0, j1 - t, z, i1, j1, z + ph, ps);
  m.box(i1 - t, j0, z, i1, j1, z + ph, ps);
  const rnd = mulberry32(seed);
  if (opts.machine) {
    const a = i0 + (i1 - i0) * (0.2 + rnd() * 0.3), b2 = j0 + (j1 - j0) * (0.2 + rnd() * 0.3);
    m.box(a, b2, z, a + 0.45, b2 + 0.4, z + 9, solid(P.concrete, 0.0));
  }
  if (opts.tank) {
    const ci = i0 + (i1 - i0) * (0.55 + rnd() * 0.25), cj = j0 + (j1 - j0) * (0.3 + rnd() * 0.3);
    m.box(ci - 0.2, cj - 0.2, z, ci + 0.2, cj + 0.2, z + 2, solid(P.concrete, -0.1));
    m.add(new Cyl(ci, cj, 0.17, z + 2, z + 9, (h, px, py, o) => { o.c = pick(P.blue, lum(h) + (h.face === 'T' ? -0.1 : 0.05) + (Math.abs(h.v - 4) < 0.5 ? 0.15 : 0), px, py); }));
  }
  for (let k = 0; k < (opts.ac ?? 0); k++) {
    const a = i0 + 0.15 + rnd() * (i1 - i0 - 0.5), b2 = j0 + 0.15 + rnd() * (j1 - j0 - 0.45);
    m.box(a, b2, z, a + 0.22, b2 + 0.2, z + 3, (h, px, py, o) => { o.c = pick(P.white, lum(h) - 0.15 + ((col(h) % 2) && h.face !== 'T' ? -0.1 : 0), px, py); });
  }
}

// ---------- prédio genérico (apartamento / escritório) ----------
export function apartment(b: Building, office = false): Obj {
  const seed = strSeed(b.id);
  const rnd = mulberry32(seed);
  const i0 = b.posicao.i + INSET, j0 = b.posicao.j + INSET, i1 = b.posicao.i + b.tamanho.w - INSET, j1 = b.posicao.j + b.tamanho.d - INSET;
  const floors = b.andares ?? 4;
  const gH = 14, fH = 12, H = gH + fH * (floors - 1);
  const wall = office ? P.slate : rampOf(b.cor, P.cream);
  const trim = office ? P.metal : P.concrete;
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = office
    ? { z0: gH, floorH: fH, floors: floors - 1, ww: 6, wh: 9, cell: 7, sill: 1, margin: 2 }
    : { z0: gH, floorH: fH, floors: floors - 1, ww: 4, wh: 6, cell: 8, sill: 3, margin: 3 };
  const m = new Model();
  const lit = office ? 0.55 : 0.62;
  const signs: Sign[] = [];
  const shopH = 11;
  const ws = wallShader({
    wall, trim, glass: P.glass, grid, seed, lit, bands: true, baseH: 2, colsL, colsR, signs,
    extra: (o, h, px, py, c, r) => {
      if (r >= gH || r < 2) return false;
      // térreo: portaria envidraçada e lojinha
      if (h.face === 'L') {
        const dc = Math.floor(colsL / 2);
        if (c >= dc - 3 && c < dc + 3 && r < 11) { o.c = pick(P.glass, lum(h) + (r === 10 ? -0.2 : 0), px, py); if (r < 10) o.e = scale(E.warm, 0.55); return true; }
        if (r === 12) { o.c = pick(trim, lum(h) + 0.1, px, py); return true; }
      }
      if (h.face === 'R' && !office) {
        if (r >= 3 && r < shopH && c % 8 > 1) { o.c = pick(P.glass, lum(h) - 0.05, px, py); if (hash2(c >> 3, 1, seed) > 0.4) o.e = scale(E.warm2, 0.7); return true; }
      }
      return false;
    },
  });
  m.box(i0, j0, 0, i1, j1, H, ws);
  // varandas nas faces visíveis
  if (!office) {
    const gl = (h: any, px: number, py: number, o: any) => {
      if (h.face === 'T') { o.c = pick(P.concrete, lum(h), px, py); return; }
      o.c = (col(h) % 2 === 0) ? pick(P.metal, lum(h) + 0.1, px, py) : pick(P.glass, lum(h) + 0.12, px, py);
    };
    for (let f = 1; f < floors; f++) {
      const z = gH + fH * (f - 1);
      for (let k = 0; k < 9; k++) {
        const w = winAt(Math.floor(3 + k * 16), colsL, z + 4, grid);
        void w;
      }
      // varanda corrida na face +j em andares alternados
      if (f % 2 === 1) {
        m.box(i0 + 0.12, j1, z, i1 - 0.12, j1 + 0.13, z + 1, solid(P.concrete, 0.05));
        m.box(i0 + 0.12, j1 + 0.1, z + 1, i1 - 0.12, j1 + 0.13, z + 5, gl);
      }
    }
  } else {
    // brises verticais na face +i
    for (let k = 1; k < 4; k++) {
      const j = j0 + ((j1 - j0) * k) / 4;
      m.box(i1, j - 0.03, gH, i1 + 0.08, j + 0.03, H, solid(P.metal, 0.12));
    }
  }
  rooftop(m, i0, j0, i1, j1, H, seed, { tank: !office, ac: 2 + Math.floor(rnd() * 3), machine: floors > 4 });
  if (office) m.add(new Cyl(i0 + 0.3, j0 + 0.3, 0.03, H, H + 22, solid(P.metal, 0.1)));
  if (b.letreiro) {
    // letreiro neon da marca no topo, virado para a frente (+j)
    const bi0 = i0 + 0.06, bi1 = i1 - 0.06, bcols = Math.round((bi1 - bi0) * 16);
    const seg: Sign = { text: 'SEGUE', face: 'L', x0: Math.floor((bcols - 35) / 2), vTop: 11, fg: hex('#ffffff'), bg: null, glow: hex('#f2ecff') };
    const cty: Sign = { text: 'CITY', face: 'L', x0: Math.floor((bcols - 35) / 2) + 20, vTop: 11, fg: hex('#ffd84a'), bg: null, glow: hex('#ffd84a') };
    for (const a of [bi0 + 0.3, bi1 - 0.3]) m.box(a - 0.03, j1 - 0.42, H, a + 0.03, j1 - 0.36, H + 6, solid(P.metal, 0.15));
    m.box(bi0, j1 - 0.36, H + 5, bi1, j1 - 0.3, H + 21, (h, px, py, o) => {
      if (h.face === 'T') { o.c = pick(P.metal, 0.5, px, py); return; }
      if (signPixel(o, h, px, py, seg, bcols) || signPixel(o, h, px, py, cty, bcols)) return;
      const r = row(h), c = col(h);
      const edge = r === 0 || r === 15 || c === 0 || c === bcols - 1;
      if (edge) { const on = (c + r) % 3 === 0; o.c = on ? hex('#c89cff') : hex('#4a2a80'); if (on) o.e = hex('#b07cff'); return; }
      o.c = pick(P.purple, 0.25, px, py); o.e = scale(hex('#7a4ee0'), 0.18);
    });
  }
  const lights: Light[] = [pool((i0 + i1) / 2, j1 + 0.15, 1.0, E.warm, 0.5)];
  if (b.letreiro) lights.push(halo((i0 + i1) / 2, j1 - 0.33, H + 13, 1.5, hex('#8a5cff'), 0.45));
  if (office) lights.push(halo(i0 + 0.3, j0 + 0.3, H + 22, 0.25, E.red, 0.9));
  const o = obj(b, m, [i0, j0, i1, j1 + 0.13], office ? 'shop' : 'home', lights, H + (b.letreiro ? 24 : 6));
  return o;
}

// ---------- casa ----------
export function house(b: Building): Obj {
  const seed = strSeed(b.id);
  const rnd = mulberry32(seed);
  const L = { i0: b.posicao.i, j0: b.posicao.j, i1: b.posicao.i + b.tamanho.w, j1: b.posicao.j + b.tamanho.d };
  const front = b.frente ?? 'j+';
  const twoStory = (b.andares ?? 1) >= 2;
  const wall = rampOf(b.cor, P.cream);
  const m = new Model();
  // corpo da casa
  const inset = 0.42;
  const bi0 = L.i0 + inset + (front === 'i+' ? 0 : rnd() * 0.15), bj0 = L.j0 + inset + 0.05;
  const bi1 = L.i1 - inset - (front === 'i+' ? 0.25 : 0), bj1 = L.j1 - inset - (front === 'j+' ? 0.22 : 0.05);
  const H = twoStory ? 26 : 14;
  const colsL = Math.round((bi1 - bi0) * 16), colsR = Math.round((bj1 - bj0) * 16);
  const grid: Grid = { z0: 2, floorH: 12, floors: twoStory ? 2 : 1, ww: 4, wh: 6, cell: 9, sill: 3, margin: 3 };
  const doorFace = front === 'i+' ? 'R' : 'L';
  const doorCols = doorFace === 'L' ? colsL : colsR;
  const dc = Math.floor(doorCols * (0.3 + rnd() * 0.3));
  const ws = wallShader({
    wall, trim: P.white, glass: P.glass, frame: P.white, grid, seed, lit: 0.85, baseH: 2, colsL, colsR,
    door: { face: doorFace, c0: dc, w: 4, h: 9, glow: scale(E.warm, 0.6) },
    extra: (o, h, px, py, c, r) => {
      // grades nas janelas
      const cols = h.face === 'L' ? colsL : colsR;
      const w = winAt(c, cols, h.v, grid);
      if (w && w.inX && w.inY && w.wx === 2 && (w.fi === 0)) { o.c = pick(P.metal, lum(h) + 0.1, px, py); return true; }
      if (h.face === doorFace && c >= dc - 1 && c < dc + 5 && r < 10) return false;
      return false;
    },
  });
  m.box(bi0, bj0, 0, bi1, bj1, H, ws);
  // telhado cerâmico com beiral (ou laje com caixa d'água)
  const laje = hash2(seed, 3) < 0.25;
  if (laje) {
    rooftop(m, bi0, bj0, bi1, bj1, H, seed, { tank: true, parapet: wall });
  } else {
    const ov = 0.1;
    const rh = 9;
    const ridgeI = front === 'i+' ? false : (bi1 - bi0) >= (bj1 - bj0);
    const rs = tileRoof(P.terracotta, ws);
    if (ridgeI) m.add(new GableI(bi0 - ov, bj0 - ov, bi1 + ov, bj1 + ov, H, rh, rs, false));
    else m.add(new GableJ(bi0 - ov, bj0 - ov, bi1 + ov, bj1 + ov, H, rh, rs, false));
    // empena (fechamento triangular) na parede
    if (ridgeI) m.add(new GableI(bi0, bj0, bi1, bj1, H, rh - 1, ws, true));
    else m.add(new GableJ(bi0, bj0, bi1, bj1, H, rh - 1, ws, true));
  }
  // muro baixo com portão nas faces visíveis
  const muro = solid(hash2(seed, 8) > 0.5 ? P.white : wall, 0.08, 0.03);
  const gate: Shader = (h, px, py, o) => { if (h.face === 'T') { o.c = pick(P.metal, 0.6, px, py); return; } o.c = col(h) % 2 === 0 ? pick(P.metal, lum(h) + 0.1, px, py) : 0; };
  const mi0 = L.i0 + INSET, mj0 = L.j0 + INSET, mi1 = L.i1 - INSET, mj1 = L.j1 - INSET, mt = 0.06, mh = 5;
  if (front === 'j+') {
    const gi = bi0 + (dc / 16) - 0.1;
    m.box(mi0, mj1 - mt, 0, gi, mj1, mh, muro);
    m.box(gi, mj1 - mt, 0, gi + 0.45, mj1, mh + 1, gate);
    m.box(gi + 0.45, mj1 - mt, 0, mi1, mj1, mh, muro);
    m.box(mi1 - mt, mj0, 0, mi1, mj1, mh, muro);
  } else if (front === 'i+') {
    const gj = bj1 - (dc / 16) - 0.35;
    m.box(mi1 - mt, mj0, 0, mi1, gj, mh, muro);
    m.box(mi1 - mt, gj, 0, mi1, gj + 0.45, mh + 1, gate);
    m.box(mi1 - mt, gj + 0.45, 0, mi1, mj1, mh, muro);
    m.box(mi0, mj1 - mt, 0, mi1, mj1, mh, muro);
  } else {
    // casas de costas: quintal com cerca viva e, às vezes, piscina
    m.box(mi0, mj1 - mt, 0, mi1, mj1, mh - 1, solid(P.foliage, 0.1, 0.25));
    m.box(mi1 - mt, mj0, 0, mi1, mj1, mh - 1, solid(P.foliage, 0.1, 0.25));
    if (hash2(seed, 12) > 0.45) {
      const pi0 = bi0 + 0.1, pj0 = bj1 + 0.12, pi1 = Math.min(mi1 - 0.15, pi0 + 0.9), pj1 = mj1 - 0.15;
      m.box(pi0, pj0, -1, pi1, pj1, 0.01, (h, px, py, o) => {
        const e = Math.min(h.u, h.v, (pi1 - pi0) - h.u, (pj1 - pj0) - h.v);
        o.c = e < 0.06 ? pick(P.white, 0.8, px, py) : pick(P.teal, 0.55 + ((px + py * 2) % 7 === 0 ? 0.25 : 0), px, py);
        if (e >= 0.06) o.e = scale(E.fountain, 0.25);
      }, 'T');
    }
  }
  const lights: Light[] = [pool((bi0 + bi1) / 2, front === 'i+' ? (bj0 + bj1) / 2 : bj1 + 0.25, 0.8, E.warm, 0.45)];
  const o = obj(b, m, [mi0, mj0, mi1, mj1], 'home', lights, H + 10);
  o.rank = hash2(seed, 77);
  return o;
}

// ---------- loja (térreo comercial + toldo + letreiro) ----------
// Lojas vizinhas no mesmo quarteirão ficam geminadas (parede colada). O letreiro vai na face que comporta o
// nome inteiro: fachada +j se couber; senão a lateral +i; se a frente estiver tapada, numa placa no telhado.
export function shop(b: Building): Obj {
  const seed = strSeed(b.id);
  const I = b.posicao.i, J = b.posicao.j, w = b.tamanho.w, d = b.tamanho.d;
  const neighbor = (di: number) => buildings.some((o) => o.tipo === 'loja' && o.status === b.status && o.posicao.j === J && o.tamanho.d === d && (di < 0 ? o.posicao.i + o.tamanho.w === I : o.posicao.i === I + w));
  const i0 = I + (neighbor(-1) ? 0 : INSET), i1 = I + w - (neighbor(1) ? 0 : INSET), j0 = J + INSET, j1 = J + d - INSET;
  const floors = b.andares ?? 2;
  const gH = 15, fH = 12, H = gH + fH * (floors - 1);
  const wall = rampOf(b.cor, P.cream);
  const aw = rampOf(b.toldo, P.red);
  const colsL = Math.round((i1 - i0) * 16), colsR = Math.round((j1 - j0) * 16);
  const grid: Grid = { z0: gH, floorH: fH, floors: floors - 1, ww: 4, wh: 6, cell: 8, sill: 3, margin: 3 };
  const text = b.placa ?? b.nome.toUpperCase();
  const neon = [E.neonPink, E.neonCyan, E.warm, E.neonGreen][seed % 4];
  const frontOpen = isRoadTile(I, J + d); // a frente dá para a rua?
  const roofBoard = !frontOpen;
  const signs: Sign[] = [];
  const pharmacy = /FARM/.test(text);
  if (!roofBoard) {
    if (signFits(text, colsL)) signs.push({ text, face: 'L', vTop: gH - 1, fg: hex('#fff6e0'), bg: P.black, glow: neon, pad: 2 });
    if (signFits(text, colsR) && (!signFits(text, colsL) || colsR >= 30)) signs.push({ text, face: 'R', vTop: gH - 1, fg: hex('#fff6e0'), bg: P.black, glow: neon, pad: 2 });
  }
  const GREEN = hex('#3ad06a');
  const ws = wallShader({
    wall, trim: P.white, glass: P.glass, grid, seed, lit: 0.7, bands: true, baseH: 1, colsL, colsR, signs,
    extra: (o, h, px, py, c, r) => {
      // cruz verde de farmácia na fachada sem nome
      if (pharmacy && h.face === 'L' && !signs.some((sg) => sg.face === 'L')) {
        const cx = colsL / 2 - 0.5, cy = gH - 4;
        const dx = Math.abs(c - cx), dy = Math.abs(r - cy);
        if ((dx < 1.6 && dy < 4.6) || (dx < 4.6 && dy < 1.6)) { o.c = GREEN; o.e = hex('#5dff8a'); return true; }
        if (dy < 5.6 && dx < 5.6) { o.c = pick(P.black, 0.4, px, py); return true; }
      }
      if (r < 1 || r >= gH - 6) return false;
      const cols = h.face === 'L' ? colsL : colsR;
      if (c < 2 || c >= cols - 2) return false;
      // vitrine iluminada
      const mull = c % 7 === 0;
      o.c = mull ? pick(P.metal, lum(h) + 0.1, px, py) : pick(P.glass, lum(h) + 0.05 + (r > 6 ? 0.1 : 0), px, py);
      if (!mull) o.e = r < 3 ? scale(E.warm, 0.5) : (hash2(c, r, seed) > 0.85 ? hex('#ffe3b0') : E.warm);
      return true;
    },
  });
  const m = new Model();
  m.box(i0, j0, 0, i1, j1, H, ws);
  // toldo listrado (inclinado) na frente +j
  const za = gH - 6;
  m.add(new Poly([[i0, j1, za + 4], [i1, j1, za + 4], [i1, j1 + 0.22, za], [i0, j1 + 0.22, za]], (h, px, py, o) => {
    const u = (h.i - i0) * 16; const stripe = Math.floor(u / 3) % 2 === 0;
    o.c = stripe ? pick(aw, lum(h) + 0.1, px, py) : pick(P.white, lum(h) + 0.05, px, py);
  }));
  m.box(i0, j1 + 0.2, za - 2, i1, j1 + 0.22, za, (h, px, py, o) => {
    const stripe = Math.floor(h.u * 16 / 3) % 2 === 0;
    o.c = scale(stripe ? pick(aw, lum(h) + 0.05, px, py) : pick(P.white, lum(h), px, py), 0.85);
  }, 'L');
  if (roofBoard) {
    // placa no telhado, virada para a frente
    const bi0 = i0 + 0.05, bi1 = i1 - 0.05;
    const bcols = Math.round((bi1 - bi0) * 16);
    const sg: Sign = { text, face: 'L', vTop: 8, fg: hex('#fff6e0'), bg: null, glow: neon };
    m.box(bi0, j1 - 0.12, H, bi1, j1 - 0.06, H + 11, (h, px, py, o) => {
      if (h.face === 'T') { o.c = pick(P.metal, 0.5, px, py); return; }
      if (signPixel(o, h, px, py, sg, bcols)) return;
      const r = row(h), c = col(h);
      o.c = r === 0 || r === 10 || c === 0 || c === bcols - 1 ? pick(aw, lum(h), px, py) : pick(P.black, 0.45, px, py);
    });
    for (const a of [bi0 + 0.15, bi1 - 0.15]) m.add(new Cyl(a, j1 - 0.2, 0.02, H, H + 2, solid(P.metal, 0.2)));
  }
  rooftop(m, i0, j0, i1, j1, H, seed, { tank: !roofBoard, ac: 1 });
  const lights: Light[] = [pool((i0 + i1) / 2, j1 + 0.4, 1.1, E.warm, 0.85)];
  if (roofBoard) lights.push(halo((i0 + i1) / 2, j1 - 0.1, H + 6, 0.9, neon, 0.35));
  const o = obj(b, m, [i0, j0, i1, j1], 'shop', lights, H + (roofBoard ? 14 : 6));
  return o;
}
