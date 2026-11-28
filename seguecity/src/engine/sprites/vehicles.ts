// Veículos em pixel art, gerados como sólidos isométricos numa posição de referência (tile 0,0)
// e desenhados com deslocamento. 4 variantes por modelo: eixo i/j × indo para a câmera (frente) / de costas (traseira).
import { Model, Cyl, type Shader, type Sprite } from '../model';
import { pick, hex, scale, type Ramp, type U32 } from '../color';
import { E, P } from '../palette';
import { col, lum, row, signPixel, type Sign } from './kit';

export type VKind = 'car' | 'taxi' | 'police' | 'ambulance' | 'bus' | 'truck';
export interface VSprite { spr: Sprite; L: number; W: number; lights: { di: number; dj: number; z: number; kind: 'head' | 'tail' | 'beacon' }[] }

const cache = new Map<string, VSprite>();
const RI = 4, RJ = 4; // posição de referência

export function vehicleSprite(kind: VKind, color: Ramp, axis: 'i' | 'j', front: boolean, key: string): VSprite {
  const k = `${kind}:${key}:${axis}:${front ? 'f' : 'r'}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const dims: Record<VKind, [number, number, number, number]> = {
    car: [0.62, 0.3, 5.5, 9], taxi: [0.62, 0.3, 5.5, 9], police: [0.64, 0.3, 5.5, 9],
    ambulance: [0.74, 0.34, 11, 12], bus: [1.5, 0.36, 15, 15], truck: [1.1, 0.36, 7, 14],
  };
  const [L, W, bodyH, topH] = dims[kind];
  const m = new Model();
  const a0 = -L / 2, a1 = L / 2, b0 = -W / 2, b1 = W / 2;
  // converte (ao longo, através) em (i, j)
  const box = (al0: number, al1: number, cr0: number, cr1: number, z0: number, z1: number, s: Shader) =>
    axis === 'i' ? m.box(RI + al0, RJ + cr0, z0, RI + al1, RJ + cr1, z1, s) : m.box(RI + cr0, RJ + al0, z0, RI + cr1, RJ + al1, z1, s);
  const endFace = axis === 'i' ? 'R' : 'L';
  const sideFace = axis === 'i' ? 'L' : 'R';
  const lights: VSprite['lights'] = [];
  const toIJ = (al: number, cr: number) => (axis === 'i' ? { di: al, dj: cr } : { di: cr, dj: al });

  const bodyS: Shader = (h, px, py, o) => {
    const r = row(h), c = col(h);
    const cols = h.face === endFace ? Math.round(W * 16) : Math.round(L * 16);
    let k = lum(h) + 0.12;
    if (h.face === 'T') k += 0.05;
    if (r <= 1) k -= 0.2; // para-choque / sombra
    if (h.face === endFace && r >= 2 && r <= 3) {
      // faróis ou lanternas nos cantos
      if (c <= 1 || c >= cols - 2) { o.c = front ? hex('#fff8d8') : hex('#ff3b46'); o.e = front ? E.head : E.tail; return; }
      if (front && r === 2) { o.c = pick(P.metal, 0.3, px, py); return; } // grade
    }
    if (kind === 'taxi' && h.face === sideFace && r === 3) { o.c = c % 2 ? hex('#1b1b24') : hex('#f2f2f2'); return; }
    if (kind === 'police' && h.face === sideFace && r >= 2 && r <= 3) { o.c = pick(P.police, lum(h) + 0.1, px, py); return; }
    if (kind === 'ambulance' && h.face === sideFace && r >= 4 && r <= 5) { o.c = hex('#e8343c'); return; }
    if (kind === 'ambulance' && h.face === sideFace && r >= 7 && r <= 9 && Math.abs(c - cols * 0.55) < 3 && (Math.abs(c - cols * 0.55) < 1 || r === 8)) { o.c = hex('#e8343c'); return; }
    o.c = pick(color, k, px, py);
  };
  // rodas
  const wheel: Shader = (h, px, py, o) => { o.c = pick(P.black, 0.5 + (h.face === 'T' ? 0.1 : 0), px, py); };
  const wl = L * 0.32;
  for (const al of [-wl, wl]) box(al - 0.07, al + 0.07, b0 - 0.01, b1 + 0.01, 0, 2.5, wheel);
  if (kind === 'bus') {
    box(a0, a1, b0, b1, 1.5, bodyH, (h, px, py, o) => {
      const r = row(h), c = col(h);
      const cols = h.face === endFace ? Math.round(W * 16) : Math.round(L * 16);
      if (h.face === 'T') { o.c = pick(color, 0.78 + ((c % 6) === 0 ? -0.1 : 0), px, py); return; }
      if (r >= 7 && r <= 11 && c > 0 && c < cols - 1 && (h.face === endFace || c % 5 !== 0)) {
        o.c = pick(P.glass, lum(h) + 0.1, px, py); o.e = scale(E.warm, h.face === endFace ? 0.4 : 0.75);
        if (h.face === endFace && front && r === 11) { o.c = hex('#ffb12b'); o.e = E.amber; }
        return;
      }
      if (h.face === endFace && r >= 2 && r <= 3 && (c <= 1 || c >= cols - 2)) { o.c = front ? hex('#fff8d8') : hex('#ff3b46'); o.e = front ? E.head : E.tail; return; }
      if (r === 5) { o.c = hex('#f2f2f2'); return; }
      o.c = pick(color, lum(h) + 0.12 + (r <= 1 ? -0.2 : 0), px, py);
    });
  } else if (kind === 'truck') {
    const cab = 0.32;
    const ca0 = front ? a1 - cab : a0, ca1 = front ? a1 : a0 + cab;
    box(ca0, ca1, b0, b1, 1.5, 10, (h, px, py, o) => {
      const r = row(h);
      if (h.face !== 'T' && r >= 5 && r <= 7) { o.c = pick(P.glass, lum(h) + 0.1, px, py); return; }
      bodyS(h, px, py, o);
    });
    const sg: Sign = { text: 'MERCADO', face: sideFace, vTop: 9, fg: hex('#e2483a'), bg: null };
    box(front ? a0 : a0 + cab + 0.02, front ? a1 - cab - 0.02 : a1, b0 - 0.01, b1 + 0.01, 2, topH, (h, px, py, o) => {
      if (h.face !== 'T' && signPixel(o, h, px, py, sg, Math.round((L - cab) * 16))) return;
      o.c = pick(P.white, lum(h) + 0.1 + (row(h) <= 0 ? -0.2 : 0), px, py);
      if (h.face === endFace && !front && row(h) === 2 && (col(h) <= 1 || col(h) >= Math.round(W * 16) - 2)) { o.c = hex('#ff3b46'); o.e = E.tail; }
    });
  } else {
    box(a0, a1, b0, b1, 1.5, bodyH, bodyS);
    // cabine com vidros
    const c0 = kind === 'ambulance' ? a0 + 0.05 : a0 + 0.12, c1 = kind === 'ambulance' ? a1 - 0.05 : a1 - 0.14;
    if (kind !== 'ambulance') {
      box(c0, c1, b0 + 0.03, b1 - 0.03, bodyH, topH, (h, px, py, o) => {
        if (h.face === 'T') { o.c = pick(color, 0.85, px, py); return; }
        o.c = pick(P.glass, lum(h) + 0.15 + (col(h) % 4 === 0 ? 0.1 : 0), px, py);
      });
    } else {
      box(a0, a1, b0, b1, bodyH, topH, (h, px, py, o) => { o.c = pick(color, lum(h) + 0.12, px, py); });
    }
    if (kind === 'police' || kind === 'ambulance') {
      box(-0.06, 0.06, b0 + 0.06, b1 - 0.06, topH, topH + 1.5, (h, px, py, o) => { o.c = col(h) % 4 < 2 ? hex('#3a6ae8') : hex('#e8343c'); });
      lights.push({ ...toIJ(0, 0), z: topH + 1, kind: 'beacon' });
    }
    if (kind === 'taxi') box(-0.06, 0.06, -0.05, 0.05, topH, topH + 1.5, (h, px, py, o) => { o.c = hex('#ffe07a'); o.e = scale(E.amber, 0.6); });
  }
  const tip = front ? a1 : a1; // a face visível é sempre a +i/+j
  for (const cr of [b0 + 0.04, b1 - 0.04]) lights.push({ ...toIJ(tip, cr), z: 3, kind: front ? 'head' : 'tail' });
  const spr = m.render({ edge: true, edgeDark: 0.65 });
  const v: VSprite = { spr: { ...spr, ox: spr.ox - (RI - RJ) * 16, oy: spr.oy - (RI + RJ) * 8 }, L, W, lights };
  cache.set(k, v);
  return v;
}

export const CAR_COLORS: Ramp[] = [P.red, P.blue, P.white, P.yellow, P.green, P.concrete, P.orange, P.purple, P.teal, P.black];
void Cyl;
