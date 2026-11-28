// Retrato em pixel art (busto 40x48) para closes de personagem e fichas de morador.
// Desenhado a partir da mesma aparência persistente (engine/characters.ts) usada nos sprites da cidade.
import { PB } from '../pixel';
import { hex, mix, scale, type U32 } from '../color';
import type { Appearance } from '../characters';

const W = 40, H = 48;
const cache = new Map<string, OffscreenCanvas>();

export function portraitCanvas(a: Appearance, key: string, blink = false): OffscreenCanvas {
  const k = `${key}:${blink ? 1 : 0}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const pb = new PB(W, H);
  const skin = hex(a.pele), skinD = scale(skin, 0.8), skinL = mix(skin, hex('#ffffff'), 0.18);
  const hair = hex(a.cabelo.cor.slice(0, 7)), hairL = mix(hair, hex('#ffffff'), 0.2), hairD = scale(hair, 0.7);
  const shirt = hex(a.roupa.camisa), shirtD = scale(shirt, 0.75), shirtL = mix(shirt, hex('#ffffff'), 0.15);
  const ex = a.roupa.extra ?? '';
  const st = a.cabelo.estilo;
  const set = (x: number, y: number, c: U32) => pb.set(x, y, c);
  const ell = (cx: number, cy: number, rx: number, ry: number, fn: (x: number, y: number, dx: number, dy: number) => void) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) fn(x, y, dx, dy);
      }
  };
  // cabelo de trás (longo/black/cacheado)
  if (st === 'longo') for (let y = 12; y < 40; y++) for (let x = 9; x <= 30; x++) if (x < 13 || x > 26 || y < 20) set(x, y, (x + y) % 5 === 0 ? hairD : hair);
  if (st === 'black') ell(20, 15, 15, 13, (x, y, dx) => set(x, y, ((x * 3 + y * 5) % 7 === 0) ? hairL : dx < -0.3 ? hairL : hair));
  if (st === 'cacheado') ell(20, 15, 13, 11, (x, y) => set(x, y, ((x + y) % 3 === 0) ? hairD : (x * y) % 5 === 0 ? hairL : hair));
  // ombros e roupa
  const broad = a.corpo === 'forte' ? 2 : a.corpo === 'magro' ? -2 : 0;
  for (let y = 34; y < H; y++) {
    const half = Math.min(15 + broad, 9 + (y - 34) * 1.4 + broad * 0.5);
    for (let x = Math.round(20 - half); x < Math.round(20 + half); x++) {
      let c = x < 20 ? shirt : shirtD;
      if (x <= 20 - half + 1) c = shirtL;
      set(x, y, c);
    }
  }
  // pescoço
  for (let y = 29; y < 36; y++) for (let x = 17; x < 23; x++) set(x, y, x > 20 ? skinD : skin);
  // gola em V
  for (let y = 34; y < 39; y++) { set(20 - (38 - y) + 2, y, shirtD); set(19 + (38 - y) - 2, y, shirtD); }
  // uniformes e acessórios
  if (ex === 'jaleco') { const coat = hex('#f2f4f7'), coatD = hex('#c8ced8'); for (let y = 35; y < H; y++) for (let x = 7; x < 33; x++) if (x < 16 || x > 23) set(x, y, x < 20 ? coat : coatD); for (let y = 35; y < 44; y++) { set(15, y, coatD); set(24, y, coatD); } for (let x = 13; x < 18; x++) set(x, 41, hex('#3a3a44')); for (const [x, y] of [[13, 40], [17, 40], [12, 39], [18, 39]]) set(x, y, hex('#3a3a44')); }
  if (ex === 'macacao') { for (let y = 36; y < H; y++) { set(14, y, hex('#2a4a8a')); set(25, y, hex('#2a4a8a')); } for (let x = 16; x < 24; x++) for (let y = 42; y < 47; y++) set(x, y, hex('#2e4e90')); set(17, 43, hex('#f2c84a')); }
  if (ex === 'capacete') { const v = hex('#ff8a1a'); for (let y = 36; y < H; y++) for (let x = 8; x < 32; x++) if (x < 16 || x > 23) set(x, y, (y === 42 || y === 43) ? hex('#f2f2a0') : x < 20 ? v : scale(v, 0.8)); }
  if (ex === 'avental') { for (let y = 38; y < H; y++) for (let x = 14; x < 26; x++) set(x, y, hex('#f4efe6')); for (let y = 30; y < 38; y++) { set(14, y, hex('#e8e0d0')); set(25, y, hex('#e8e0d0')); } }
  if (ex === 'quepe' || ex === 'cracha') { set(26, 40, hex('#f2c84a')); set(27, 40, hex('#f2c84a')); set(26, 41, hex('#f2c84a')); set(27, 41, hex('#d8a83a')); }
  if (ex === 'gravata' || ex === 'faixa') { for (let y = 35; y < H; y++) { set(19, y, hex('#c8303a')); set(20, y, hex('#a82830')); } }
  if (ex === 'livro') { for (let y = 40; y < H; y++) for (let x = 27; x < 35; x++) set(x, y, x === 27 ? hex('#f2f2f2') : hex('#c4553f')); }
  // cabeça
  ell(20, 20, 9, 11, (x, y, dx) => set(x, y, dx > 0.45 ? skinD : dx < -0.5 ? skinL : skin));
  // orelhas
  for (const ox of [10, 29]) for (let y = 19; y < 24; y++) set(ox, y, ox > 20 ? skinD : skin);
  // olhos, sobrancelhas, nariz, boca
  const eye = hex(a.olhos ?? '#2a1c14');
  for (const ex2 of [15, 23]) {
    if (blink) { set(ex2, 21, eye); set(ex2 + 1, 21, eye); continue; }
    set(ex2, 20, hex('#ffffff')); set(ex2 + 1, 20, eye); set(ex2, 21, eye); set(ex2 + 1, 21, eye);
    set(ex2 - 1, 18, hairD); set(ex2, 17, hairD); set(ex2 + 1, 17, hairD); set(ex2 + 2, 18, hairD);
  }
  set(20, 23, skinD); set(21, 24, skinD); set(19, 24, skinD);
  for (let x = 18; x < 23; x++) set(x, 27, scale(skin, 0.6));
  set(17, 26, scale(skin, 0.7)); set(23, 26, scale(skin, 0.7));
  set(13, 24, mix(skin, hex('#ff8a8a'), 0.25)); set(26, 24, mix(skin, hex('#ff8a8a'), 0.25));
  if (a.barba) ell(20, 27, 8, 5, (x, y) => { if (y >= 25 && (x + y) % 2 === 0) set(x, y, hairD); });
  if (a.oculos) { for (const ox of [14, 22]) { for (let x = ox; x < ox + 5; x++) { set(x, 19, hex('#2a2a34')); set(x, 22, hex('#2a2a34')); } set(ox, 20, hex('#2a2a34')); set(ox, 21, hex('#2a2a34')); set(ox + 4, 20, hex('#2a2a34')); set(ox + 4, 21, hex('#2a2a34')); } set(19, 20, hex('#2a2a34')); set(20, 20, hex('#2a2a34')); }
  // cabelo da frente por estilo
  if (st !== 'careca') {
    const capY = st === 'black' ? 7 : 9;
    ell(20, 14, 10, st === 'black' ? 8 : 6, (x, y, dx) => { if (y <= 15) set(x, y, dx < -0.3 ? hairL : (x + y) % 6 === 0 ? hairD : hair); });
    if (st === 'franja') for (let x = 12; x < 27; x++) for (let y = 13; y < 16 + ((x * 7) % 3 === 0 ? 1 : 0); y++) set(x, y, hair);
    if (st === 'curto' || st === 'franja' || st === 'rabo') { for (let y = 14; y < 20; y++) { set(10, y, hair); set(11, y, hair); set(29, y, hairD); } }
    if (st === 'coque') ell(20, 5, 4, 3.5, (x, y, dx) => set(x, y, dx < 0 ? hairL : hair));
    if (st === 'rabo') for (let y = 18; y < 32; y++) set(31, y, hairD);
    void capY;
  } else {
    set(15, 11, skinL); set(16, 10, skinL); set(17, 10, skinL);
  }
  // chapéus
  if (ex === 'capacete') { ell(20, 11, 11, 6, (x, y, dx) => { if (y <= 12) set(x, y, dx < -0.3 ? hex('#ffe070') : hex('#f2c230')); }); for (let x = 7; x < 34; x++) set(x, 13, hex('#c49020')); }
  if (ex === 'quepe') { for (let y = 7; y < 13; y++) for (let x = 11; x < 30; x++) set(x, y, hex('#1e2a4a')); for (let x = 9; x < 31; x++) set(x, 13, hex('#121a30')); set(19, 9, hex('#f2c84a')); set(20, 9, hex('#f2c84a')); set(19, 10, hex('#f2c84a')); set(20, 10, hex('#d8a83a')); }
  if (ex === 'bone') { for (let y = 8; y < 13; y++) for (let x = 11; x < 29; x++) set(x, y, hex('#2a5ad2')); for (let x = 20; x < 34; x++) set(x, 13, hex('#1e44a8')); }
  if (ex === 'touca') { for (let y = 7; y < 13; y++) for (let x = 11; x < 29; x++) set(x, y, hex('#5fc2b5')); }
  if (ex === 'chapeu-chef') { ell(20, 6, 9, 6, (x, y) => set(x, y, hex('#ffffff'))); for (let x = 11; x < 29; x++) for (let y = 10; y < 13; y++) set(x, y, hex('#f2f2f2')); }
  if (ex === 'chapeu') { for (let x = 6; x < 34; x++) set(x, 12, hex('#c49a5a')); for (let y = 6; y < 12; y++) for (let x = 12; x < 28; x++) set(x, y, hex('#d8b070')); }
  // contorno escuro de 1 px em volta de tudo
  const src = pb.data.slice();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (src[y * W + x]) continue;
      const n = (xx: number, yy: number) => xx >= 0 && yy >= 0 && xx < W && yy < H && src[yy * W + xx] >>> 24 > 0;
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) pb.data[y * W + x] = hex('#0a0b1e');
    }
  const cv = pb.toCanvas();
  cache.set(k, cv);
  return cv;
}
export const PORTRAIT_W = W, PORTRAIT_H = H;
