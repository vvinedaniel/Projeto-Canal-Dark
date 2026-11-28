// Kit de shaders para fachadas: paredes com grade de janelas, faixas, letreiros, telhados.
import { light, type Hit, type Shader } from '../model';
import { pick, scale, mix, type Ramp, type U32 } from '../color';
import { hash2 } from '../rng';
import { E, P } from '../palette';
import { maskAt, textMask, type TextMask } from '../font';

export const lum = (h: Hit) => light(h.nx, h.ny, h.nz);
export const col = (h: Hit) => Math.floor(h.u * 16 + 1e-4);
export const row = (h: Hit) => Math.floor(h.v + 1e-4);

export const solid = (r: Ramp, k = 0, noise = 0.05): Shader => (h, px, py, o) => {
  o.c = pick(r, lum(h) + k + (hash2(px, py, 3) - 0.5) * noise, px, py);
};
export const glowSolid = (r: Ramp, e: U32, k = 0): Shader => (h, px, py, o) => {
  o.c = pick(r, lum(h) + k, px, py); o.e = e;
};

export interface Grid { z0: number; floorH: number; floors: number; ww: number; wh: number; cell: number; sill: number; margin: number }

export function winAt(c: number, cols: number, v: number, g: Grid) {
  if (v < g.z0) return null;
  const fv = v - g.z0, fi = Math.floor(fv / g.floorH);
  if (fi < 0 || fi >= g.floors) return null;
  const fy = fv - fi * g.floorH;
  const usable = cols - 2 * g.margin;
  const n = Math.max(1, Math.floor((usable + g.cell - g.ww) / g.cell));
  const total = n * g.cell - (g.cell - g.ww);
  const start = g.margin + Math.floor((usable - total) / 2);
  const cc = c - start;
  if (cc < 0) return null;
  const ci = Math.floor(cc / g.cell);
  if (ci >= n) return null;
  const wx = cc - ci * g.cell;
  return { fi, ci, wx, fy, n, inX: wx < g.ww, inY: fy >= g.sill && fy < g.sill + g.wh, wy: fy - g.sill };
}

const LIT = [E.warm, E.warm, E.warm2, E.warm, E.cool, E.warm2, E.tv];
export function litColor(seed: number, a: number, b: number) {
  return LIT[Math.floor(hash2(a, b, seed + 5) * LIT.length)];
}

// Pixel de janela (vidro, caixilho e luz acesa).
export function windowPixel(o: { c: U32; e: U32 }, h: Hit, px: number, py: number, w: { wx: number; wy: number; fi: number; ci: number }, g: Grid, glass: Ramp, seed: number, litRatio: number, frame: Ramp) {
  const face = h.face === 'R' || h.face === 'GE' ? 1 : 0;
  const lit = hash2(w.fi * 31 + face, w.ci, seed) < litRatio;
  const top = w.wy === g.wh - 1;
  const midMullion = g.ww >= 6 && w.wx === Math.floor(g.ww / 2);
  if (midMullion || (g.wh >= 8 && w.wy === Math.floor(g.wh * 0.62))) { o.c = pick(frame, lum(h) + 0.05, px, py); return; }
  const refl = (w.wx + (g.wh - w.wy)) % 6 === 0 ? 0.18 : 0;
  o.c = pick(glass, lum(h) - 0.08 + refl + (top ? -0.12 : 0), px, py);
  if (lit) {
    const lc = litColor(seed, w.fi * 31 + face, w.ci);
    // cortina / silhueta ocasional
    const curtain = hash2(w.fi, w.ci, seed + 9) > 0.7 && w.wx === 0;
    o.e = top ? scale(lc, 0.6) : curtain ? scale(lc, 0.45) : lc;
    o.c = mix(o.c, lc, 0.35);
  }
}

// Letreiro em uma face: retorna true se pintou o pixel.
export interface Sign { text: string; face: string; x0?: number; vTop: number; fg: U32; bg?: Ramp | null; glow?: U32 | null; pad?: number; mask?: TextMask }
// Placas que não cabem na face apareceriam cortadas (erro de ortografia na tela): avisamos no console
// (scripts/stills.ts mostra) e a checagem `npm run check:signs` falha.
export const signProblems = new Set<string>();
export function signFits(text: string, cols: number) { return textMask(text).w <= cols; }
export function signPixel(o: { c: U32; e: U32 }, h: Hit, px: number, py: number, s: Sign, cols: number): boolean {
  if (h.face !== s.face) return false;
  const m = (s.mask ??= textMask(s.text));
  const pad = s.pad ?? 2;
  const x0 = s.x0 ?? Math.floor((cols - m.w) / 2);
  if ((x0 < 0 || x0 + m.w > cols) && !signProblems.has(s.text)) {
    signProblems.add(s.text);
    console.warn(`[placa] "${s.text}" não cabe: ${m.w}px de texto em ${cols}px de fachada`);
  }
  const c = col(h) - x0;
  // faces laterais são inclinadas 2:1; para a letra não deformar, cada letra fica em pé e o degrau
  // da isometria é aplicado letra a letra (meia linha por coluna desde o início da letra)
  const slope = h.face === 'L' || (h.face === 'GE' && h.ny > 0.5) ? 0.5 : h.face === 'R' || h.face === 'GE' ? -0.5 : 0;
  const gx = c >= 0 && c < m.w ? m.starts[c] : c;
  const r = Math.floor(s.vTop - (h.v - (c - gx) * slope));
  if (c < -pad || c >= m.w + pad || r < -1 || r >= m.h) return false;
  if (maskAt(m, c, r)) { o.c = s.fg; if (s.glow) o.e = s.glow; return true; }
  if (s.bg) { o.c = pick(s.bg, lum(h) - 0.1, px, py); return true; }
  return false;
}

export interface WallSpec {
  wall: Ramp; trim: Ramp; glass: Ramp; frame?: Ramp;
  grid: Grid; seed: number; lit: number;
  bands?: boolean; // laje marcada em cada andar
  baseH?: number; // rodapé
  colsL: number; colsR: number;
  signs?: Sign[];
  door?: { face: string; c0: number; w: number; h: number; glow?: U32 };
  extra?: (o: { c: U32; e: U32 }, h: Hit, px: number, py: number, c: number, r: number) => boolean;
}

// Shader de parede com janelas em L/R (e empena GE).
export function wallShader(s: WallSpec): Shader {
  const frame = s.frame ?? s.trim;
  return (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(s.trim, lum(h) - 0.05, px, py); return; }
    const cols = h.face === 'L' ? s.colsL : s.colsR;
    const c = col(h), r = row(h);
    if (s.signs) for (const sg of s.signs) if (signPixel(o, h, px, py, sg, cols)) return;
    if (s.extra && s.extra(o, h, px, py, c, r)) return;
    if (s.door && s.door.face === h.face && c >= s.door.c0 && c < s.door.c0 + s.door.w && r < s.door.h) {
      const edge = c === s.door.c0 || c === s.door.c0 + s.door.w - 1 || r === s.door.h - 1;
      o.c = edge ? pick(frame, lum(h), px, py) : pick(P.wood, lum(h) - 0.1, px, py);
      if (!edge && s.door.glow && r > s.door.h - 4) o.e = s.door.glow;
      return;
    }
    let k = lum(h);
    // rodapé, cantos e faixas de laje
    if (s.baseH && r < s.baseH) { o.c = pick(s.trim, k - 0.12, px, py); return; }
    if (c === 0 || c === cols - 1) k += 0.08;
    const w = winAt(c, cols, h.v, s.grid);
    if (w && w.inX && w.inY) { windowPixel(o, h, px, py, w, s.grid, s.glass, s.seed, s.lit, frame); return; }
    if (w && w.inX && w.fy === s.grid.sill - 1) { o.c = pick(s.trim, k + 0.12, px, py); return; } // peitoril
    if (s.bands && w && w.fy === 0) { o.c = pick(s.trim, k - 0.05, px, py); return; }
    k += (hash2(px >> 1, py, 7) - 0.5) * 0.06;
    o.c = pick(s.wall, k, px, py);
  };
}

// Laje com mureta (parapeito) e cascalho.
export function roofShader(r: Ramp, k = 0): Shader {
  return (h, px, py, o) => {
    const s = lum(h) + k + (hash2(px, py, 11) - 0.5) * 0.12;
    o.c = pick(r, s - 0.05, px, py);
  };
}

// Telhado de telha cerâmica (fileiras) para GableI/GableJ.
export function tileRoof(r: Ramp, wallS: Shader): Shader {
  return (h, px, py, o) => {
    if (h.face === 'GE') { wallS(h, px, py, o); return; }
    const k = lum(h);
    const rowk = Math.floor(h.v * 8); // fileiras ao longo da água
    const stripe = ((h.u * 16 + (rowk & 1) * 1.5) % 3) < 0.9 ? -0.08 : 0;
    const edge = h.v < 0.08 ? -0.15 : h.v > 0.94 ? 0.1 : 0;
    o.c = pick(r, k + stripe + edge + (((h.v * 8) % 1) < 0.25 ? -0.1 : 0) + (hash2(px, py, 4) - 0.5) * 0.06, px, py);
  };
}
