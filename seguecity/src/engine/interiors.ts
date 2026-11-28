// Interiores em corte (diorama isométrico) reutilizáveis nos próximos episódios:
// casa, hospital, oficina, escola, mercado e prefeitura. Mesma técnica e paleta da cidade (sólidos isométricos).
import { Model, Cyl, Dome, type Shader, type Sprite } from './model';
import { pick, hex, scale, type Ramp, type U32 } from './color';
import { hash2 } from './rng';
import { E, P } from './palette';
import { col, lum, row, solid, signPixel, type Sign } from './sprites/kit';

export type InteriorKind = 'casa' | 'hospital' | 'oficina' | 'escola' | 'mercado' | 'prefeitura';
export const INTERIOR_NAMES: Record<InteriorKind, string> = { casa: 'CASA', hospital: 'HOSPITAL', oficina: 'OFICINA', escola: 'ESCOLA', mercado: 'MERCADO', prefeitura: 'PREFEITURA' };

const W = 4, D = 4, WH = 30; // sala de 4x4 tiles, paredes de 30 px
const O = 4; // origem da sala no espaço de tiles (longe das bordas do sprite)

const floorShader = (kind: InteriorKind): Shader => (h, px, py, o) => {
  if (h.face !== 'T') { o.c = pick(P.concrete, lum(h) - 0.2, px, py); return; }
  const u = h.u, v = h.v;
  let c: U32;
  switch (kind) {
    case 'casa': case 'escola': { const plank = Math.floor(v * 6); c = pick(P.wood, 0.55 + ((plank & 1) ? 0.06 : -0.04) + (((u * 2 + plank * 0.37) % 1) < 0.03 ? -0.2 : 0) + (hash2(px, py) - 0.5) * 0.06, px, py); break; }
    case 'hospital': c = ((Math.floor(u * 3) + Math.floor(v * 3)) & 1) ? pick(P.white, 0.85, px, py) : pick(P.mint, 0.75, px, py); break;
    case 'mercado': c = ((Math.floor(u * 4) + Math.floor(v * 4)) & 1) ? pick(P.white, 0.8, px, py) : pick(P.concrete, 0.6, px, py); break;
    case 'oficina': c = pick(P.concrete, 0.5 + (hash2(Math.floor(u * 8), Math.floor(v * 8)) - 0.5) * 0.08 - (Math.hypot(u - 1.6, v - 2.4) < 0.4 ? 0.2 : 0), px, py); break;
    default: c = pick(P.stone, 0.75 + (((u + v) * 3) % 1 < 0.04 ? -0.15 : 0), px, py); // prefeitura: mármore
  }
  // tapete
  if ((kind === 'casa' && u > 1.2 && u < 3 && v > 1.6 && v < 3.1) || (kind === 'prefeitura' && u > 1 && u < 3 && v > 0.8 && v < 3.6)) c = pick(kind === 'casa' ? P.lilac : P.red, 0.45 + (((u * 8) | 0) % 4 === 0 ? 0.1 : 0), px, py);
  o.c = c;
};

const WALL: Record<InteriorKind, Ramp> = { casa: P.cream, hospital: P.white, oficina: P.slate, escola: P.yellow, mercado: P.green, prefeitura: P.cream };

function wallShader(kind: InteriorKind, signs: Sign[] = []): Shader {
  return (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.white, 0.75, px, py); return; }
    const cols = Math.round(W * 16);
    for (const s of signs) if (signPixel(o, h, px, py, s, cols)) return;
    const c = col(h), r = row(h);
    // janela com a noite lá fora
    const wx = c % 22, inWin = r > 11 && r < 24 && wx > 6 && wx < 17;
    if (inWin) { o.c = (wx === 11 || r === 17) ? pick(P.white, 0.8, px, py) : pick(P.glass, 0.25 + (hash2(c, r) > 0.97 ? 0.6 : 0), px, py); return; }
    if (r < 3) { o.c = pick(P.wood, lum(h) - 0.1, px, py); return; } // rodapé
    let k = lum(h) + 0.1;
    if (kind === 'oficina' && c % 4 === 0) k -= 0.08; // chapa ondulada
    if (kind === 'hospital' && r > 8 && r < 10) { o.c = pick(P.teal, 0.6, px, py); return; } // faixa
    o.c = pick(WALL[kind], k + (hash2(px >> 1, py, 4) - 0.5) * 0.04, px, py);
  };
}

export function interiorSprite(kind: InteriorKind): { sprite: Sprite; lights: { i: number; j: number; z: number; r: number; color: U32 }[] } {
  const m = new Model();
  const i0 = O, j0 = O, i1 = O + W, j1 = O + D;
  m.box(i0, j0, -3, i1, j1, 0, floorShader(kind));
  const t = 0.12;
  const signs: Sign[] = kind === 'escola' ? [{ text: 'BEM-VINDOS', face: 'L', vTop: 25, fg: hex('#f2f2f2'), bg: P.green, x0: 14 }] : [];
  m.box(i0 - t, j0 - t, -3, i1, j0, WH, wallShader(kind, signs), 'TL'); // parede do fundo (face +j)
  m.box(i0 - t, j0, -3, i0, j1, WH, wallShader(kind), 'TR'); // parede da esquerda (face +i)
  const lights: { i: number; j: number; z: number; r: number; color: U32 }[] = [];
  const box = (a: number, b: number, z0: number, c: number, d: number, z1: number, s: Shader) => m.box(i0 + a, j0 + b, z0, i0 + c, j0 + d, z1, s);
  const S = (r: Ramp, k = 0) => solid(r, k, 0.04);
  switch (kind) {
    case 'casa': {
      box(0.2, 0.3, 0, 1.8, 0.9, 5, S(P.blue, 0.1)); box(0.2, 0.15, 5, 1.8, 0.35, 11, S(P.blue, 0.05)); // sofá
      box(0.35, 0.4, 5, 0.75, 0.8, 7, S(P.yellow, 0.2)); box(1.2, 0.4, 5, 1.6, 0.8, 7, S(P.pink, 0.2)); // almofadas
      box(2.4, 0.15, 0, 3.6, 0.5, 6, S(P.wood, 0.1)); box(2.6, 0.2, 6, 3.4, 0.3, 14, (h, px, py, o) => { o.c = h.face === 'L' ? hex('#5a8aff') : pick(P.black, 0.4, px, py); if (h.face === 'L') o.e = hex('#6a9aff'); }); // TV
      m.add(new Cyl(i0 + 0.4, j0 + 3.4, 0.18, 0, 5, S(P.terracotta, 0.1))); m.add(new Dome(i0 + 0.4, j0 + 3.4, 10, 0.3, S(P.foliage, 0.1))); // planta
      box(2.2, 2.2, 0, 3.4, 3.2, 7, S(P.wood, 0.15)); // mesa
      for (const [a, b] of [[2.0, 2.4], [3.5, 2.6]]) box(a, b, 0, a + 0.3, b + 0.3, 5, S(P.wood, 0)); // cadeiras
      m.add(new Cyl(i0 + 0.2, j0 + 1.6, 0.03, 0, 22, S(P.metal, 0.2))); m.add(new Dome(i0 + 0.2, j0 + 1.6, 22, 0.18, (h, px, py, o) => { o.c = hex('#ffe6b0'); o.e = E.warm; }));
      lights.push({ i: i0 + 0.2, j: j0 + 1.6, z: 22, r: 1.6, color: E.warm });
      break;
    }
    case 'hospital': {
      for (const a of [0.3, 2.2]) {
        box(a, 0.2, 0, a + 1.4, 1.9, 6, S(P.metal, 0.3)); box(a + 0.05, 0.25, 6, a + 1.35, 1.85, 8, S(P.white, 0.25)); box(a + 0.1, 0.3, 8, a + 0.5, 0.9, 9.5, S(P.white, 0.35)); // cama
        box(a + 0.1, 1.0, 8, a + 1.3, 1.8, 9, S(P.mint, 0.2)); // lençol
        box(a + 1.5, 0.2, 0, a + 1.75, 0.45, 18, (h, px, py, o) => { o.c = pick(P.metal, lum(h), px, py); if (h.face === 'L' && row(h) > 12 && row(h) < 17) { o.c = hex('#2a4a3a'); if ((col(h) + Math.floor(row(h))) % 3) o.e = hex('#4aff8a'); } }); // monitor
      }
      box(1.92, 0.15, 0, 2.02, 1.8, 18, (h, px, py, o) => { o.c = (col(h) >> 2) % 2 ? pick(P.teal, lum(h) + 0.2, px, py) : pick(P.mint, lum(h) + 0.2, px, py); }); // cortina entre os leitos
      box(0.3, 2.9, 0, 1.0, 3.5, 7, S(P.metal, 0.25)); box(0.35, 2.95, 7, 0.95, 3.45, 8, S(P.white, 0.3)); // carrinho de curativos
      box(3.2, 3.0, 0, 3.8, 3.8, 14, S(P.white, 0.1)); // armário
      lights.push({ i: i0 + 2, j: j0 + 1, z: 26, r: 2.2, color: E.cool });
      break;
    }
    case 'oficina': {
      box(0.6, 1.0, 0, 3.2, 1.2, 1, S(P.yellow, 0.2)); box(0.6, 2.6, 0, 3.2, 2.8, 1, S(P.yellow, 0.2)); // elevador
      for (const [a, b] of [[0.6, 1.0], [3.0, 1.0], [0.6, 2.6], [3.0, 2.6]]) box(a, b, 0, a + 0.2, b + 0.2, 14, S(P.yellow, 0.1));
      for (const [a, b] of [[0.9, 1.22], [2.5, 1.22], [0.9, 2.46], [2.5, 2.46]]) box(a, b, 7.5, a + 0.45, b + 0.12, 10.5, S(P.black, 0.25)); // rodas
      box(0.7, 1.3, 9, 3.1, 2.5, 13, S(P.red, 0.2)); box(1.2, 1.4, 13, 2.6, 2.4, 17, (h, px, py, o) => { o.c = h.face === 'T' ? pick(P.red, 0.7, px, py) : pick(P.glass, 0.6, px, py); }); // carro no elevador
      box(3.3, 0.2, 0, 3.8, 0.7, 10, (h, px, py, o) => { o.c = pick(P.red, lum(h) + (row(h) % 3 === 0 ? -0.2 : 0.1), px, py); }); // caixa de ferramentas
      for (let k = 0; k < 4; k++) m.add(new Cyl(i0 + 0.4, j0 + 3.4, 0.25, k * 3, k * 3 + 3, S(P.black, 0.3))); // pneus
      box(0.15, 0.15, 0, 2.0, 0.6, 9, S(P.wood, 0.1)); // bancada
      lights.push({ i: i0 + 2, j: j0 + 2, z: 26, r: 2.2, color: E.lampWarm });
      break;
    }
    case 'escola': {
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) { const a = 0.6 + c * 1.1, b = 1.6 + r * 1.0; box(a, b, 0, a + 0.7, b + 0.45, 7, S(P.wood, 0.2)); box(a + 0.15, b + 0.55, 0, a + 0.55, b + 0.85, 5, S(P.blue, 0.1)); }
      box(0.4, 0.4, 0, 1.8, 0.9, 8, S(P.wood, 0.05)); // mesa do professor
      m.add(new Cyl(i0 + 1.4, j0 + 0.6, 0.02, 8, 11, S(P.metal, 0.2))); m.add(new Dome(i0 + 1.4, j0 + 0.6, 13, 0.14, (h, px, py, o) => { o.c = (Math.floor(h.u * 4) + Math.floor(h.v * 4)) & 1 ? hex('#4a8ae2') : hex('#5ab06a'); }));
      box(3.3, 2.0, 0, 3.8, 3.8, 18, (h, px, py, o) => { o.c = row(h) % 6 < 4 ? pick(['#c4553f', '#4a8ae2', '#f2c84a', '#5ab06a'].map((x) => hex(x)), hash2(col(h), Math.floor(row(h) / 6)), px, py) : pick(P.wood, 0.4, px, py); }); // estante
      lights.push({ i: i0 + 2, j: j0 + 2, z: 26, r: 2.2, color: hex('#fff2d0') });
      break;
    }
    case 'mercado': {
      for (const b of [1.2, 2.5]) box(0.4, b, 0, 3.4, b + 0.5, 15, (h, px, py, o) => { const r = row(h); if (h.face === 'T') { o.c = pick(P.white, 0.7, px, py); return; } o.c = r % 5 === 0 ? pick(P.white, 0.7, px, py) : hex(['#e2483a', '#f4c440', '#6cc04a', '#f08a2a', '#4a8ae2'][Math.floor(hash2(col(h) >> 1, Math.floor(r / 5)) * 5)]); }); // gôndolas
      box(0.2, 0.2, 0, 1.6, 0.8, 8, S(P.white, 0.1)); box(0.5, 0.3, 8, 0.9, 0.6, 11, (h, px, py, o) => { o.c = pick(P.black, 0.5, px, py); if (h.face === 'L') o.e = scale(hex('#7dff8a'), 0.6); }); // caixa
      for (let k = 0; k < 3; k++) box(2.2 + k * 0.5, 0.25, 0, 2.6 + k * 0.5, 0.75, 4, (h, px, py, o) => { o.c = h.face === 'T' ? hex(['#e2483a', '#f4c440', '#6cc04a'][k]) : pick(P.wood, lum(h) + 0.1, px, py); }); // caixotes de fruta
      box(3.5, 0.4, 0, 3.9, 2.0, 16, (h, px, py, o) => { o.c = pick(P.glass, lum(h) + 0.2, px, py); if (h.face !== 'T') o.e = scale(E.cool, 0.4); }); // freezer
      lights.push({ i: i0 + 2, j: j0 + 2, z: 26, r: 2.3, color: hex('#f2fff2') });
      break;
    }
    case 'prefeitura': {
      box(1.0, 0.6, 0, 3.0, 1.4, 8, S(P.wood, 0.05)); box(1.2, 0.65, 8, 2.8, 1.35, 8.6, S(P.green, 0.2)); // mesa
      box(1.7, 0.15, 0, 2.3, 0.55, 14, S(P.red, 0.1)); // cadeira
      for (const [a, cor] of [[0.4, '#7a4ee0'], [3.6, '#3a9a5a']] as const) { m.add(new Cyl(i0 + a, j0 + 0.3, 0.025, 0, 26, S(P.yellow, 0.3))); box(a + 0.02, 0.26, 16, a + 0.6, 0.32, 25, (h, px, py, o) => { o.c = hex(cor); }); } // bandeiras
      box(0.6, 2.6, 0, 1.2, 3.6, 5, S(P.wood, 0.1)); box(2.8, 2.6, 0, 3.4, 3.6, 5, S(P.wood, 0.1)); // poltronas
      box(1.5, 0.02, 14, 2.5, 0.06, 24, (h, px, py, o) => { o.c = row(h) === 0 || row(h) === 9 || col(h) === 0 || col(h) === 15 ? hex('#d8a83a') : pick(P.blue, 0.4, px, py); }); // quadro
      lights.push({ i: i0 + 2, j: j0 + 1, z: 26, r: 2.2, color: E.warm });
      break;
    }
  }
  return { sprite: m.render({ edge: true }), lights };
}
