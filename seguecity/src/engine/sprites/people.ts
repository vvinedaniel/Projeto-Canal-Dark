// Pessoas em pixel art (5x12 px): frente/costas, espelhadas, 4 quadros de caminhada.
import { PB } from '../pixel';
import { hex, scale, mix, type U32 } from '../color';
import { toSprite, type Sprite } from '../model';

export interface Look { skin: U32; hair: U32; shirt: U32; pants: U32; shoes: U32; hat?: 'capacete' | 'bone' | 'quepe' | 'touca' | null; coat?: U32 | null; long?: boolean }

const SKINS = ['#f2c9a0', '#d9a273', '#b0774c', '#8a5634', '#e8b48a', '#5e3a24'].map((h) => hex(h));
const HAIRS = ['#2a1d18', '#4a2d1c', '#1a1a22', '#8a5a2c', '#d8b25a', '#6a6a72', '#b04a2a'].map((h) => hex(h));
const SHIRTS = ['#e25a4a', '#4a8ae2', '#f2c84a', '#5ab06a', '#f2f2f2', '#9a5ae2', '#f28a3a', '#3ac2c2', '#e26aa2', '#2a3a5a'].map((h) => hex(h));
const PANTS = ['#2a3a6a', '#3a3a44', '#6a5a4a', '#1e2030', '#4a6a8a', '#7a3a3a'].map((h) => hex(h));

export function randomLook(r: () => number): Look {
  const p = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  return { skin: p(SKINS), hair: p(HAIRS), shirt: p(SHIRTS), pants: p(PANTS), shoes: hex('#1a1a20'), long: r() < 0.4, hat: null };
}

const cache = new Map<string, Sprite>();
// dir: 0 = indo +i (frente, olhando à direita), 1 = +j (frente, esquerda), 2 = -i (costas, esquerda), 3 = -j (costas, direita)
export function personSprite(look: Look, dir: number, frame: number, key: string, scaleUp = 1): Sprite {
  const k = `${key}:${dir}:${frame}:${scaleUp}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const W = 7, H = 14;
  const pb = new PB(W, H, -3, -13); // origem nos pés (0,0)
  const back = dir >= 2;
  const mirror = dir === 1 || dir === 2;
  const set = (x: number, y: number, c: U32) => pb.set(mirror ? -x : x, y, c);
  const shade = (c: U32) => scale(c, 0.72);
  // sombra no chão
  for (const x of [-2, -1, 0, 1, 2]) pb.set(x, 0, hex('#000000', 90));
  pb.set(-1, 1 - 1, hex('#000000', 90));
  const f = frame % 4;
  const legA = f === 1 ? -1 : f === 3 ? 1 : 0;
  // pernas
  const top = -12;
  const py = (y: number) => top + y;
  const pants = look.pants, shoes = look.shoes;
  set(-1, py(9), pants); set(1, py(9), pants); set(0, py(9), pants);
  set(-1 + (legA < 0 ? -0 : 0), py(10), pants); set(1, py(10), shade(pants));
  set(-1 + legA, py(11), shoes); set(1 - legA, py(11), shoes);
  if (legA !== 0) { set(-1 + legA, py(10), pants); set(1 - legA, py(10), shade(pants)); }
  // tronco
  const shirt = look.coat ?? look.shirt;
  for (let y = 5; y <= 8; y++) for (let x = -1; x <= 1; x++) set(x, py(y), x === 1 ? shade(shirt) : shirt);
  if (look.coat) { set(0, py(5), look.shirt); set(0, py(6), look.shirt); }
  if (look.coat && look.long) { set(-1, py(9), look.coat); set(1, py(9), shade(look.coat)); }
  // braços balançando
  const arm = f === 1 ? 1 : f === 3 ? -1 : 0;
  set(-2, py(5), shirt); set(-2, py(6), shirt); set(-2, py(7 + (arm > 0 ? 0 : 0)), look.skin);
  set(2, py(5), shade(shirt)); set(2, py(6), shade(shirt)); set(2, py(7), shade(look.skin));
  if (arm !== 0) { set(-2, py(7), shirt); set(-2 + arm * 0, py(8), look.skin); }
  // cabeça
  for (let y = 1; y <= 3; y++) for (let x = -1; x <= 1; x++) set(x, py(y), x === 1 ? shade(look.skin) : look.skin);
  set(0, py(4), shade(look.skin));
  // cabelo
  const hair = look.hair;
  for (let x = -1; x <= 1; x++) set(x, py(0), hair);
  set(-2, py(1), hair); set(2, py(1), hair);
  if (back) { for (let x = -1; x <= 1; x++) { set(x, py(1), hair); set(x, py(2), hair); } if (look.long) { set(-1, py(3), hair); set(0, py(3), hair); set(1, py(3), hair); set(-2, py(2), hair); set(2, py(2), hair); } }
  else {
    set(-1, py(1), hair);
    if (look.long) { set(-2, py(2), hair); set(-2, py(3), hair); set(2, py(2), hair); }
    set(1, py(2), hex('#1a1420')); // olho (olhando para o lado da caminhada)
  }
  // chapéus
  if (look.hat === 'capacete') { for (let x = -2; x <= 2; x++) set(x, py(0), hex('#f2c230')); set(-1, py(-1), hex('#f2c230')); set(0, py(-1), hex('#ffd84a')); set(1, py(-1), hex('#f2c230')); }
  if (look.hat === 'bone') { for (let x = -1; x <= 2; x++) set(x, py(0), hex('#2a5ad2')); set(back ? -2 : 2, py(1), hex('#2a5ad2')); }
  if (look.hat === 'quepe') { for (let x = -2; x <= 2; x++) set(x, py(0), hex('#1e2a4a')); set(0, py(-1), hex('#1e2a4a')); set(0, py(0), hex('#f2c84a')); }
  if (look.hat === 'touca') { for (let x = -1; x <= 1; x++) { set(x, py(0), hex('#5fc2b5')); set(x, py(-1), hex('#5fc2b5')); } }
  void mix;
  let spr = toSprite(pb, null);
  if (scaleUp > 1) spr = upscale(spr, scaleUp);
  cache.set(k, spr);
  return spr;
}

function upscale(s: Sprite, k: number): Sprite {
  const img = new OffscreenCanvas(s.w * k, s.h * k);
  const c = img.getContext('2d')!; c.imageSmoothingEnabled = false; c.drawImage(s.img, 0, 0, s.w * k, s.h * k);
  const mask = new OffscreenCanvas(s.w * k, s.h * k);
  const m = mask.getContext('2d')!; m.imageSmoothingEnabled = false; m.drawImage(s.mask, 0, 0, s.w * k, s.h * k);
  return { ...s, img, mask, w: s.w * k, h: s.h * k, ox: s.ox * k, oy: s.oy * k };
}
