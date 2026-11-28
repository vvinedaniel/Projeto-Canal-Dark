// Pessoas em pixel art (7x14 px na escala da cidade): frente/costas, espelhadas.
// Poses: 'walk' (4 quadros), 'idle' (2, respiração), 'wave' (2, aceno), 'work' (2, braço com ferramenta).
// A aparência é modular (cabelo, corpo, barba, óculos, uniforme) e vem de engine/characters.ts.
import { PB } from '../pixel';
import { hex, scale, mix, type U32 } from '../color';
import { toSprite, type Sprite } from '../model';
import type { Appearance, HairStyle } from '../characters';

export interface Look {
  skin: U32; hair: U32; shirt: U32; pants: U32; shoes: U32;
  hat?: 'capacete' | 'bone' | 'quepe' | 'touca' | 'chef' | 'chapeu' | null; coat?: U32 | null; long?: boolean;
  hairStyle?: HairStyle; broad?: boolean; beard?: boolean; glasses?: boolean; vest?: U32 | null; apron?: U32 | null; tool?: U32 | null;
  tie?: boolean; // terno com gravata (advocacia, empresários)
  badge?: boolean; // distintivo dourado de morador fundador
}
export type Pose = 'walk' | 'idle' | 'wave' | 'work';

const SKINS = ['#f2c9a0', '#d9a273', '#b0774c', '#8a5634', '#e8b48a', '#5e3a24'].map((h) => hex(h));
const HAIRS = ['#2a1d18', '#4a2d1c', '#1a1a22', '#8a5a2c', '#d8b25a', '#6a6a72', '#b04a2a'].map((h) => hex(h));
const SHIRTS = ['#e25a4a', '#4a8ae2', '#f2c84a', '#5ab06a', '#f2f2f2', '#9a5ae2', '#f28a3a', '#3ac2c2', '#e26aa2', '#2a3a5a'].map((h) => hex(h));
const PANTS = ['#2a3a6a', '#3a3a44', '#6a5a4a', '#1e2030', '#4a6a8a', '#7a3a3a'].map((h) => hex(h));
const STYLES: HairStyle[] = ['curto', 'longo', 'cacheado', 'coque', 'careca', 'black', 'franja', 'rabo'];

export function randomLook(r: () => number): Look {
  const p = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const hairStyle = p(STYLES);
  return { skin: p(SKINS), hair: p(HAIRS), shirt: p(SHIRTS), pants: p(PANTS), shoes: hex('#1a1a20'), long: hairStyle === 'longo', hat: null, hairStyle, broad: r() < 0.3, beard: r() < 0.15, glasses: r() < 0.12 };
}

// aparência persistente (residents.json) → visual do sprite
export function lookOf(a: Appearance): Look {
  const ex = a.roupa.extra ?? '';
  const hat = ({ capacete: 'capacete', quepe: 'quepe', touca: 'touca', bone: 'bone', 'chapeu-chef': 'chef', chapeu: 'chapeu' } as Record<string, Look['hat']>)[ex] ?? null;
  return {
    skin: hex(a.pele), hair: hex(a.cabelo.cor.slice(0, 7)), shirt: hex(a.roupa.camisa), pants: hex(a.roupa.calca), shoes: hex(a.roupa.sapato),
    hat, coat: ex === 'jaleco' ? hex('#f2f4f7') : null, long: a.cabelo.estilo === 'longo', hairStyle: a.cabelo.estilo,
    broad: a.corpo === 'forte', beard: a.barba, glasses: a.oculos,
    vest: ex === 'capacete' ? hex('#ff8a1a') : null, apron: ex === 'avental' ? hex('#f4efe6') : null,
    tool: ex === 'macacao' ? hex('#cfd6e6') : ex === 'livro' ? hex('#c4553f') : null,
    tie: ex === 'gravata', badge: a.insignia === 'fundador',
  };
}

const cache = new Map<string, Sprite>();
// dir: 0 = indo +i (frente, olhando à direita), 1 = +j (frente, esquerda), 2 = -i (costas, esquerda), 3 = -j (costas, direita)
export function personSprite(look: Look, dir: number, frame: number, key: string, scaleUp = 1, pose: Pose = 'walk'): Sprite {
  const k = `${key}:${dir}:${frame}:${scaleUp}:${pose}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const W = 9, H = 16;
  const pb = new PB(W, H, -4, -15); // origem nos pés (0,0)
  const back = dir >= 2;
  const mirror = dir === 1 || dir === 2;
  const set = (x: number, y: number, c: U32) => pb.set(mirror ? -x : x, y, c);
  const shade = (c: U32) => scale(c, 0.72);
  // sombra no chão
  for (const x of [-2, -1, 0, 1, 2]) pb.set(x, 0, hex('#000000', 90));
  const f = frame % 4;
  const walking = pose === 'walk';
  const legA = walking ? (f === 1 ? -1 : f === 3 ? 1 : 0) : 0;
  const breathe = pose === 'idle' && frame % 2 === 1 ? 1 : 0;
  const top = -12 + breathe * 0;
  const py = (y: number) => top + y;
  const pants = look.pants, shoes = look.shoes;
  // pernas
  set(-1, py(9), pants); set(1, py(9), pants); set(0, py(9), pants);
  set(-1, py(10), pants); set(1, py(10), shade(pants));
  set(-1 + legA, py(11), shoes); set(1 - legA, py(11), shoes);
  if (legA !== 0) { set(-1 + legA, py(10), pants); set(1 - legA, py(10), shade(pants)); }
  // tronco (corpo forte = ombros mais largos)
  const shirt = look.coat ?? look.shirt;
  const x0 = look.broad ? -2 : -1;
  for (let y = 5; y <= 8; y++) for (let x = x0; x <= 1; x++) set(x, py(y), x === 1 ? shade(shirt) : shirt);
  if (look.coat) { set(0, py(5), look.shirt); set(0, py(6), look.shirt); }
  if (look.coat && look.long) { set(-1, py(9), look.coat); set(1, py(9), shade(look.coat)); }
  if (look.vest) { set(-1, py(6), look.vest); set(1, py(6), shade(look.vest)); set(-1, py(7), hex('#f2f2a0')); set(1, py(7), hex('#d8d890')); set(-1, py(8), look.vest); }
  if (look.tie && !back) { set(0, py(5), hex('#f2f2f2')); set(0, py(6), hex('#c8303a')); set(0, py(7), hex('#a82830')); }
  if (look.badge && !back) set(x0, py(6), hex('#ffd84a')); // distintivo dourado no peito
  if (look.apron && !back) { set(0, py(6), look.apron); set(0, py(7), look.apron); set(0, py(8), look.apron); set(-1, py(8), look.apron); }
  // braços: caminhada balança; aceno levanta um braço; trabalho alterna o braço com ferramenta
  const armX = x0 - 1;
  const swing = walking ? (f === 1 ? 1 : f === 3 ? -1 : 0) : 0;
  if (pose === 'wave') {
    const up = frame % 2 === 0;
    set(2, py(5), shade(shirt)); set(2, py(6), shade(shirt)); set(2, py(7), shade(look.skin));
    set(armX, py(4), shirt); set(armX - (up ? 1 : 0), py(3), shirt); set(armX - (up ? 1 : 0), py(2), look.skin); set(armX - (up ? 1 : 0), py(1), look.skin);
  } else if (pose === 'work') {
    const up = frame % 2 === 0;
    set(armX, py(5), shirt); set(armX, py(6), shirt); set(armX, py(7), look.skin);
    set(2, py(5), shade(shirt)); set(3, py(up ? 4 : 6), shade(shirt)); set(3, py(up ? 3 : 7), shade(look.skin));
    if (look.tool) { set(4, py(up ? 2 : 7), look.tool); set(4, py(up ? 1 : 8), look.tool); }
  } else {
    set(armX, py(5), shirt); set(armX, py(6), shirt); set(armX, py(7), look.skin);
    set(2, py(5), shade(shirt)); set(2, py(6), shade(shirt)); set(2, py(7), shade(look.skin));
    if (swing !== 0) { set(armX, py(7), shirt); set(armX, py(8), look.skin); }
    if (look.tool && !walking) set(armX, py(8), look.tool);
  }
  // cabeça
  for (let y = 1; y <= 3; y++) for (let x = -1; x <= 1; x++) set(x, py(y), x === 1 ? shade(look.skin) : look.skin);
  set(0, py(4), shade(look.skin));
  // cabelo por estilo
  const hair = look.hair, st = look.hairStyle ?? (look.long ? 'longo' : 'curto');
  if (st !== 'careca') {
    for (let x = -1; x <= 1; x++) set(x, py(0), hair);
    if (st === 'black' || st === 'cacheado') { for (let x = -2; x <= 2; x++) set(x, py(0), hair); set(-1, py(-1), hair); set(0, py(-1), hair); set(1, py(-1), hair); set(-2, py(1), hair); set(2, py(1), hair); if (st === 'black') { set(-2, py(-1), hair); set(2, py(-1), hair); set(0, py(-2), hair); } }
    else { set(-2, py(1), hair); set(2, py(1), hair); }
    if (st === 'coque') { set(0, py(-1), hair); set(back ? 0 : -1, py(-2), hair); }
    if (st === 'rabo') { set(back ? 0 : -2, py(2), hair); set(back ? 0 : -2, py(3), hair); }
    if (back) { for (let x = -1; x <= 1; x++) { set(x, py(1), hair); set(x, py(2), hair); } if (st === 'longo') { for (let x = -1; x <= 1; x++) set(x, py(3), hair); set(-2, py(2), hair); set(2, py(2), hair); } }
    else {
      set(-1, py(1), hair);
      if (st === 'franja') set(0, py(1), hair);
      if (st === 'longo') { set(-2, py(2), hair); set(-2, py(3), hair); set(2, py(2), hair); set(2, py(3), hair); }
    }
  }
  if (!back) {
    set(1, py(2), look.glasses ? hex('#d8e8ff') : hex('#1a1420')); // olho (ou lente)
    if (look.glasses) set(0, py(2), hex('#2a2a34'));
    if (look.beard) { set(0, py(3), mix(look.hair, look.skin, 0.25)); set(1, py(3), mix(look.hair, look.skin, 0.25)); }
  }
  // chapéus
  if (look.hat === 'capacete') { for (let x = -2; x <= 2; x++) set(x, py(0), hex('#f2c230')); set(-1, py(-1), hex('#f2c230')); set(0, py(-1), hex('#ffd84a')); set(1, py(-1), hex('#f2c230')); }
  if (look.hat === 'bone') { for (let x = -1; x <= 2; x++) set(x, py(0), hex('#2a5ad2')); set(back ? -2 : 2, py(1), hex('#2a5ad2')); }
  if (look.hat === 'quepe') { for (let x = -2; x <= 2; x++) set(x, py(0), hex('#1e2a4a')); set(0, py(-1), hex('#1e2a4a')); set(0, py(0), hex('#f2c84a')); }
  if (look.hat === 'touca') { for (let x = -1; x <= 1; x++) { set(x, py(0), hex('#5fc2b5')); set(x, py(-1), hex('#5fc2b5')); } }
  if (look.hat === 'chapeu') { for (let x = -3; x <= 3; x++) set(x, py(0), hex('#b8894a')); for (let x = -1; x <= 1; x++) set(x, py(-1), hex('#d8b070')); }
  if (look.hat === 'chef') { for (let x = -1; x <= 1; x++) { set(x, py(0), hex('#ffffff')); set(x, py(-1), hex('#ffffff')); set(x, py(-2), hex('#f2f2f2')); } }
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
