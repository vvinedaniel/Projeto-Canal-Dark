// Cores empacotadas em Uint32 (little-endian: 0xAABBGGRR), rampas de sombreamento e pontilhado ordenado.
export type U32 = number;

export const pack = (r: number, g: number, b: number, a = 255): U32 =>
  (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;

export const hex = (h: string, a = 255): U32 => {
  const n = parseInt(h.replace('#', ''), 16);
  return pack((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
};

export const cr = (c: U32) => c & 255;
export const cg = (c: U32) => (c >>> 8) & 255;
export const cb = (c: U32) => (c >>> 16) & 255;
export const ca = (c: U32) => c >>> 24;

export const mix = (c1: U32, c2: U32, t: number): U32 =>
  pack(
    Math.round(cr(c1) + (cr(c2) - cr(c1)) * t),
    Math.round(cg(c1) + (cg(c2) - cg(c1)) * t),
    Math.round(cb(c1) + (cb(c2) - cb(c1)) * t),
    Math.round(ca(c1) + (ca(c2) - ca(c1)) * t),
  );

export const scale = (c: U32, k: number): U32 =>
  pack(Math.min(255, cr(c) * k), Math.min(255, cg(c) * k), Math.min(255, cb(c) * k), ca(c));

export const css = (c: U32, alpha?: number) =>
  `rgba(${cr(c)},${cg(c)},${cb(c)},${alpha ?? ca(c) / 255})`;

export type Ramp = U32[];
export const ramp = (...hexes: string[]): Ramp => hexes.map((h) => hex(h));

// Matriz de Bayer 4x4 (limiares em [0,1)).
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => B4[((y & 3) << 2) | (x & 3)];

// Escolhe a cor da rampa para um brilho s em [0,1], com pontilhado entre níveis vizinhos.
export function pick(rmp: Ramp, s: number, x: number, y: number, dither = true): U32 {
  const n = rmp.length;
  let f = s * (n - 1);
  if (f <= 0) return rmp[0];
  if (f >= n - 1) return rmp[n - 1];
  const i0 = Math.floor(f);
  const fr = f - i0;
  if (!dither) return rmp[fr < 0.5 ? i0 : i0 + 1];
  return rmp[fr > bayer(x, y) ? i0 + 1 : i0];
}
