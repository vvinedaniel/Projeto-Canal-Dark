// Mobiliário urbano e natureza: árvores (inclusive ipês e palmeiras), postes, bancos, fonte, ponte,
// semáforos, ponto de ônibus, banca, carrinho de pipoca, mastros. Sprites em cache por variante.
import { Model, Box, Cyl, Dome, Poly, type Shader, type Sprite } from '../model';
import { PB } from '../pixel';
import { pick, hex, scale, mix, type Ramp, type U32 } from '../color';
import { hash2, mulberry32 } from '../rng';
import { E, P } from '../palette';
import { sx, sy } from '../iso';
import { col, lum, row, solid, signPixel, type Sign } from './kit';
import { toSprite } from '../model';
import type { Obj, Light } from '../types';

const pool = (i: number, j: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j), r, color, a, kind: 'pool' });
const halo = (i: number, j: number, z: number, r: number, color: U32, a = 1): Light => ({ x: sx(i, j), y: sy(i, j, z), r, color, a, kind: 'halo' });

let uid = 0;
const mkObj = (kind: string, fp: [number, number, number, number], sprite: Sprite, lights: Light[] = [], group: Obj['group'] = 'street', layer: 0 | 1 = 1): Obj =>
  ({ id: `${kind}-${uid++}`, kind, fp, layer, sprite, group, lights });

// --- árvores ---------------------------------------------------------------------------------
const leaf = (r: Ramp, seed: number, k = 0): Shader => (h, px, py, o) => {
  // textura de folhagem: aglomerados com luz de cima/esquerda
  const n = hash2(px >> 1, py >> 1, seed) - 0.5;
  const n2 = hash2(px, py, seed + 1) - 0.5;
  o.c = pick(r, lum(h) + k + n * 0.28 + n2 * 0.08, px, py);
};

export type TreeKind = 'round' | 'tall' | 'ipeY' | 'ipeP' | 'palm' | 'bush' | 'pine';
export function tree(kind: TreeKind, i: number, j: number, seed: number): Obj {
  const rnd = mulberry32(seed);
  const m = new Model();
  const trunk = (h: number, r = 0.05) => m.add(new Cyl(i, j, r, 0, h, (hh, px, py, o) => { o.c = pick(P.trunk, lum(hh) + (hash2(px, py, 2) - 0.5) * 0.1, px, py); }));
  const s = 0.85 + rnd() * 0.35;
  let topZ = 30;
  if (kind === 'palm') {
    // tronco curvo em gomos + copa de folhas desenhada à mão
    const H = Math.round(40 * s), lean = (rnd() - 0.5) * 0.25;
    for (let k = 0; k < 8; k++) {
      const f = k / 8, ci = i + lean * f * f, cj = j - lean * 0.5 * f * f;
      m.add(new Cyl(ci, cj, 0.055 - f * 0.015, (H * k) / 8, (H * (k + 1)) / 8, (hh, px, py, o) => { o.c = pick(P.trunk, lum(hh) + ((row(hh) % 3) === 0 ? -0.12 : 0.05), px, py); }));
    }
    const spr = m.render({ edge: false });
    const top = { x: sx(i + lean, j - lean * 0.5), y: sy(i + lean, j - lean * 0.5, H) };
    const sprite = paintPalm(spr, top.x, top.y, seed);
    return mkObj('arvore', [i - 0.05, j - 0.05, i + 0.05, j + 0.05], sprite);
  }
  if (kind === 'bush') {
    m.add(new Dome(i, j, 0, 0.22 * s, leaf(P.foliage, seed, 0.05), 0));
    m.add(new Dome(i + 0.12, j + 0.05, 0, 0.16 * s, leaf(P.foliage, seed, 0.1), 0));
    return mkObj('arbusto', [i - 0.2, j - 0.2, i + 0.2, j + 0.2], m.render({ edge: true, edgeDark: 0.8 }));
  }
  if (kind === 'pine') {
    trunk(10);
    for (let k = 0; k < 4; k++) m.add(new Dome(i, j, 10 + k * 7 * s, (0.32 - k * 0.06) * s, leaf(P.foliage, seed, -0.05 - k * 0.02)));
    topZ = 40;
  } else if (kind === 'tall') {
    trunk(18 * s);
    m.add(new Dome(i, j, 26 * s, 0.26 * s, leaf(P.foliage, seed)));
    m.add(new Dome(i, j, 18 * s, 0.32 * s, leaf(P.foliage, seed, -0.05)));
    topZ = 34;
  } else {
    const ramp = kind === 'ipeY' ? P.ipeY : kind === 'ipeP' ? P.ipeP : P.foliage;
    trunk(13 * s, 0.045);
    const blobs = 4 + Math.floor(rnd() * 3);
    m.add(new Dome(i, j, 22 * s, 0.36 * s, leaf(ramp, seed, -0.02)));
    for (let k = 0; k < blobs; k++) {
      const a = rnd() * Math.PI * 2, r = 0.16 * s;
      m.add(new Dome(i + Math.cos(a) * r, j + Math.sin(a) * r, (18 + rnd() * 9) * s, (0.2 + rnd() * 0.1) * s, leaf(ramp, seed + k, 0.02)));
    }
    if (kind !== 'round') {
      // flores caídas no chão
      m.add(new Box(i - 0.45, j - 0.3, 0, i + 0.45, j + 0.4, 0.01, (h, px, py, o) => {
        const d = Math.hypot(h.i - i, (h.j - j) * 1.1);
        if (d < 0.42 && hash2(px, py, seed) > 0.72 + d * 0.5) o.c = pick(ramp, 0.65 + hash2(px, py, 3) * 0.3, px, py);
      }, 'T'));
    }
    topZ = 30 * s;
  }
  void topZ;
  return mkObj('arvore', [i - 0.05, j - 0.05, i + 0.05, j + 0.05], m.render({ edge: true, edgeDark: 0.78 }));
}

function paintPalm(base: Sprite, tx: number, ty: number, seed: number): Sprite {
  const pad = 22;
  const pb = new PB(base.w + pad * 2, base.h + pad, base.ox - pad, base.oy - pad);
  // copia o tronco
  const ctx = new OffscreenCanvas(base.w, base.h).getContext('2d')!;
  ctx.drawImage(base.img, 0, 0);
  const src = new Uint32Array(ctx.getImageData(0, 0, base.w, base.h).data.buffer);
  for (let y = 0; y < base.h; y++) for (let x = 0; x < base.w; x++) if (src[y * base.w + x]) pb.set(base.ox + x, base.oy + y, src[y * base.w + x]);
  const rnd = mulberry32(seed);
  const fronds = 9;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + rnd() * 0.4;
    const len = 13 + rnd() * 6;
    const dx = Math.cos(a), dy = Math.sin(a) * 0.55;
    for (let k = 0; k <= len; k++) {
      const t = k / len;
      const x = tx + dx * k, y = ty + dy * k - 4 * t * (1 - t) * 4 + t * t * 7;
      const sh = 0.35 + (dy < 0 ? 0.25 : 0.05) + (1 - t) * 0.2;
      pb.set(Math.round(x), Math.round(y), pick(P.palm, sh, Math.round(x), Math.round(y)));
      // folíolos
      if (k % 2 === 0 && k > 2) for (const sgn of [-1, 1]) {
        const lx = Math.round(x - dy * sgn * 2), ly = Math.round(y + dx * sgn * 1.2 + 1);
        pb.set(lx, ly, pick(P.palm, sh - 0.15, lx, ly));
      }
    }
  }
  // cocos
  for (const [ox, oy] of [[-1, 1], [1, 1], [0, 2]]) pb.set(tx + ox, ty + oy, pick(P.trunk, 0.7, tx, ty));
  return toSprite(pb, null);
}

// --- postes de luz -----------------------------------------------------------------------------
const lampCache = new Map<string, { img: Sprite; dx: number }>();
export function lamp(i: number, j: number, style: 'street' | 'plaza' | 'bridge' = 'street', arm: 'i' | 'j' = 'i'): Obj {
  const m = new Model();
  const H = style === 'plaza' ? 18 : 24;
  const pole = solid(style === 'plaza' ? P.black : P.metal, 0.25, 0.02);
  m.add(new Cyl(i, j, 0.03, 0, H, pole));
  m.add(new Cyl(i, j, 0.05, 0, 2, pole));
  let li = i, lj = j, lz = H;
  if (style === 'plaza') {
    m.add(new Dome(i, j, H + 2, 0.09, (h, px, py, o) => { o.c = hex('#fff2c4'); o.e = E.lamp; }));
    lz = H + 2;
  } else {
    const ai = arm === 'i' ? 0.32 : 0, aj = arm === 'j' ? 0.32 : 0;
    m.box(Math.min(i, i + ai) - 0.02, Math.min(j, j + aj) - 0.02, H - 1, Math.max(i, i + ai) + 0.02, Math.max(j, j + aj) + 0.02, H, pole);
    li = i + ai; lj = j + aj;
    m.box(li - 0.07, lj - 0.07, H - 3, li + 0.07, lj + 0.07, H, (h, px, py, o) => { o.c = pick(P.metal, lum(h) + 0.2, px, py); if (h.face !== 'T' && row(h) === 0) { o.c = hex('#fff6d0'); o.e = E.lamp; } });
    lz = H - 3;
  }
  const lights: Light[] = [pool(li, lj, style === 'plaza' ? 1.25 : 1.55, E.lampWarm, 0.85), halo(li, lj, lz, 0.42, E.lamp, 0.85)];
  void lampCache;
  return mkObj('poste', [i - 0.05, j - 0.05, i + 0.05, j + 0.05], m.render({ edge: false }), lights);
}

// --- banco de praça ---
export function bench(i: number, j: number, along: 'i' | 'j'): Obj {
  const m = new Model();
  const L = 0.36, D = 0.12;
  const [i0, j0, i1, j1] = along === 'i' ? [i - L / 2, j - D / 2, i + L / 2, j + D / 2] : [i - D / 2, j - L / 2, i + D / 2, j + L / 2];
  const wood: Shader = (h, px, py, o) => { o.c = pick(P.wood, lum(h) + 0.15 + ((row(h) & 1) ? -0.08 : 0), px, py); };
  m.box(i0, j0, 3, i1, j1, 4, wood);
  if (along === 'i') m.box(i0, j0, 4, i1, j0 + 0.03, 7, wood); else m.box(i0, j0, 4, i0 + 0.03, j1, 7, wood);
  m.box(i0 + 0.02, j0 + 0.02, 0, i0 + 0.05, j0 + 0.05, 3, solid(P.black, 0.3));
  m.box(i1 - 0.05, j1 - 0.05, 0, i1 - 0.02, j1 - 0.02, 3, solid(P.black, 0.3));
  return mkObj('banco', [i0, j0, i1, j1], m.render());
}

// --- fonte da praça ---
export function fountain(ci: number, cj: number): { obj: Obj; jetBase: { x: number; y: number } } {
  const m = new Model();
  const rim: Shader = (h, px, py, o) => { o.c = pick(P.stone, lum(h) + 0.15 + (h.face === 'T' ? 0.05 : 0) + ((Math.round(h.u * 10) & 1) ? 0.04 : -0.02), px, py); };
  m.add(new Cyl(ci, cj, 1.05, 0, 6, rim));
  m.add(new Cyl(ci, cj, 0.92, 0, 6.5, (h, px, py, o) => {
    if (h.face !== 'T') { o.c = pick(P.stone, 0.4, px, py); return; }
    const d = Math.hypot(h.u, h.v);
    o.c = pick(P.teal, 0.45 + (Math.sin(d * 18) > 0.6 ? 0.18 : 0) + (hash2(px, py) - 0.5) * 0.1, px, py);
    o.e = scale(E.fountain, 0.32 + (Math.sin(d * 18) > 0.6 ? 0.25 : 0));
  }));
  m.add(new Cyl(ci, cj, 0.17, 6, 16, rim));
  m.add(new Cyl(ci, cj, 0.46, 16, 19, rim));
  m.add(new Cyl(ci, cj, 0.4, 16, 19.4, (h, px, py, o) => { if (h.face !== 'T') { o.c = pick(P.stone, 0.5, px, py); return; } o.c = pick(P.teal, 0.6, px, py); o.e = scale(E.fountain, 0.5); }));
  m.add(new Cyl(ci, cj, 0.08, 19, 24, rim));
  const lights: Light[] = [pool(ci, cj, 2.1, hex('#5fd8ff'), 0.7), halo(ci, cj, 12, 1.0, hex('#5fd8ff'), 0.35)];
  const obj = mkObj('fonte', [ci - 1.05, cj - 1.05, ci + 1.05, cj + 1.05], m.render(), lights, 'civic');
  return { obj, jetBase: { x: sx(ci, cj), y: sy(ci, cj, 24) } };
}

// --- ponte sobre o canal (ao longo de i, no tile j) ---
export function bridge(j: number): Obj[] {
  const out: Obj[] = [];
  const i0 = 20.98, i1 = 25.02;
  // tabuleiro (rente à rua): face +j com arcos sobre a água
  const deck = new Model();
  const arch: Shader = (h, px, py, o) => {
    if (h.face === 'T') { o.c = 0; return; }
    const c = col(h), r = row(h); // r de 0 (fundo -8) a 8
    const span = 16;
    const x = (c % span) - span / 2 + 0.5;
    const archTop = 3.2 * Math.sqrt(Math.max(0, 1 - (x / (span / 2 - 1.5)) ** 2));
    if (h.face === 'L' && r < archTop && Math.abs(x) < span / 2 - 1.5) { o.c = 0; return; }
    o.c = pick(P.stone, lum(h) + (r >= 7 ? 0.15 : 0) + (((c + (r >> 2) * 2) % 8) === 0 || r % 4 === 0 ? -0.1 : 0), px, py);
  };
  deck.box(i0, j + 0.86, -8, i1, j + 1.0, 0.0, arch, 'LR');
  out.push(mkObj('ponte-arcos', [i0, j + 0.86, i1, j + 1.0], deck.render({ edge: false }), [], 'none', 1));
  // tabuleiro de rua por cima do canal (camada do chão)
  const top = new Model();
  top.box(i0, j, -1, i1, j + 1, 0.01, (h, px, py, o) => {
    const v = h.j - j;
    let c = pick(P.asphalt, 0.5 + (hash2(px, py, 1) - 0.5) * 0.1, px, py);
    if (Math.abs(v - 0.46) < 0.03 || Math.abs(v - 0.54) < 0.03) c = hex('#e9b93c');
    if (v < 0.12 || v > 0.88) c = pick(P.walk, 0.6 + (((Math.floor(h.i * 4)) & 1) ? 0.05 : 0), px, py);
    o.c = c;
  }, 'T');
  const deckObj = mkObj('ponte', [i0, j, i1, j + 1], top.render({ edge: false }), [], 'none', 0);
  out.push(deckObj);
  // guarda-corpos (atrás e na frente) com postes
  for (const [a, b] of [[j + 0.0, j + 0.05], [j + 0.95, j + 1.0]]) {
    const rail = new Model();
    rail.box(i0, a, 0, i1, b, 6, (h, px, py, o) => {
      const c = col(h), r = row(h);
      if (h.face === 'T') { o.c = pick(P.stone, 0.85, px, py); return; }
      if (r >= 4 || r === 0 || c % 4 === 0) o.c = pick(P.stone, lum(h) + 0.12, px, py); else o.c = 0;
    });
    out.push(mkObj('guarda-corpo', [i0, a, i1, b], rail.render({ edge: false }), [], 'none', 1));
  }
  for (const li of [21.6, 23.0, 24.4]) {
    out.push(lamp(li, j + 0.04, 'plaza'));
    out.push(lamp(li, j + 0.96, 'plaza'));
  }
  return out;
}

// --- semáforo ---
export function trafficLight(i: number, j: number): { obj: Obj; head: { x: number; y: number } } {
  const m = new Model();
  m.add(new Cyl(i, j, 0.025, 0, 22, solid(P.black, 0.35)));
  m.box(i - 0.05, j - 0.05, 16, i + 0.05, j + 0.05, 25, (h, px, py, o) => { o.c = pick(P.black, lum(h) + 0.2, px, py); });
  return { obj: mkObj('semaforo', [i - 0.05, j - 0.05, i + 0.05, j + 0.05], m.render({ edge: false })), head: { x: sx(i, j + 0.05), y: sy(i, j + 0.05, 24) } };
}

// --- ponto de ônibus ---
export function busStop(i: number, j: number, along: 'i' | 'j'): Obj {
  const m = new Model();
  const L = 0.7, D = 0.18;
  const [i0, j0, i1, j1] = along === 'j' ? [i - D / 2, j - L / 2, i + D / 2, j + L / 2] : [i - L / 2, j - D / 2, i + L / 2, j + D / 2];
  m.box(i0, j0, 13, i1, j1, 15, solid(P.metal, 0.2));
  // painel de anúncio iluminado e vidro
  if (along === 'j') m.box(i0, j0, 1, i0 + 0.03, j1, 12, (h, px, py, o) => { o.c = pick(P.glass, 0.65, px, py); if (col(h) < 6) { o.c = hex('#f0f4ff'); o.e = hex('#cfe4ff'); } });
  else m.box(i0, j0, 1, i1, j0 + 0.03, 12, (h, px, py, o) => { o.c = pick(P.glass, 0.65, px, py); if (col(h) < 6) { o.c = hex('#f0f4ff'); o.e = hex('#cfe4ff'); } });
  m.box(i0 + 0.05, j0 + 0.05, 4, i1 - 0.05, j1 - 0.05, 5, solid(P.wood, 0.1));
  m.add(new Cyl(i1, j1, 0.02, 0, 13, solid(P.metal, 0.3)));
  return mkObj('ponto', [i0, j0, i1, j1], m.render(), [pool(i, j, 0.9, hex('#dce8ff'), 0.6)]);
}

// --- banca de revistas ---
export function newsstand(i: number, j: number): Obj {
  const m = new Model();
  m.box(i - 0.3, j - 0.22, 0, i + 0.3, j + 0.22, 12, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.green, 0.75, px, py); return; }
    const c = col(h), r = row(h);
    if (r > 3 && r < 10 && c > 1 && c % 3 !== 0) { o.c = hex(['#e25a4a', '#f2c84a', '#5ab0f2', '#f2f2f2'][Math.floor(hash2(c, r) * 4)]); o.e = scale(E.warm, 0.25); return; }
    o.c = pick(P.green, lum(h) + 0.05, px, py);
  });
  m.box(i - 0.36, j - 0.28, 12, i + 0.36, j + 0.3, 14, solid(P.green, 0.15));
  return mkObj('banca', [i - 0.36, j - 0.28, i + 0.36, j + 0.3], m.render(), [pool(i, j + 0.3, 0.8, E.warm, 0.6)], 'shop');
}

// --- carrinho de pipoca ---
export function popcorn(i: number, j: number): Obj {
  const m = new Model();
  m.box(i - 0.18, j - 0.1, 3, i + 0.18, j + 0.1, 11, (h, px, py, o) => { o.c = (col(h) >> 1) % 2 === 0 ? pick(P.red, lum(h) + 0.1, px, py) : pick(P.white, lum(h), px, py); });
  m.box(i - 0.14, j - 0.07, 11, i + 0.14, j + 0.07, 16, (h, px, py, o) => { o.c = pick(P.glass, 0.7, px, py); o.e = hex('#ffe9a0'); if (row(h) < 3) { o.c = hex('#fff3cf'); } });
  m.add(new Cyl(i - 0.16, j + 0.08, 0.06, 0, 3, solid(P.black, 0.3)));
  m.add(new Cyl(i + 0.16, j + 0.08, 0.06, 0, 3, solid(P.black, 0.3)));
  m.add(new Cyl(i, j, 0.015, 16, 22, solid(P.metal, 0.3)));
  m.add(new Dome(i, j, 22, 0.24, (h, px, py, o) => { o.c = (Math.floor(Math.atan2(h.ny, h.nx) * 3) & 1) ? pick(P.red, lum(h) + 0.1, px, py) : pick(P.yellow, lum(h) + 0.1, px, py); }, 22));
  return mkObj('pipoca', [i - 0.18, j - 0.1, i + 0.18, j + 0.1], m.render(), [pool(i, j, 0.8, hex('#ffe08a'), 0.75)], 'shop');
}

// --- placa "EM BREVE" em lote planejado ---
export function lotSign(i: number, j: number): Obj {
  const m = new Model();
  m.add(new Cyl(i - 0.36, j, 0.025, 0, 12, solid(P.wood, 0.1)));
  m.add(new Cyl(i + 0.36, j, 0.025, 0, 12, solid(P.wood, 0.1)));
  const l1: Sign = { text: 'EM', face: 'L', vTop: 15.5, fg: hex('#1b1b24'), bg: null };
  const l2: Sign = { text: 'BREVE', face: 'L', vTop: 8.5, fg: hex('#1b1b24'), bg: null };
  m.box(i - 0.48, j - 0.01, 10, i + 0.48, j + 0.03, 27, (h, px, py, o) => {
    if (h.face === 'T') { o.c = pick(P.white, 0.8, px, py); return; }
    if (signPixel(o, h, px, py, l1, 15) || signPixel(o, h, px, py, l2, 15)) return;
    const r = row(h), c = col(h);
    o.c = r === 0 || r === 16 || c === 0 || c === 14 ? pick(P.orange, lum(h), px, py) : pick(P.yellow, lum(h) + 0.18, px, py);
  });
  return mkObj('placa', [i - 0.48, j - 0.02, i + 0.48, j + 0.04], m.render(), [pool(i, j + 0.3, 0.7, E.warm, 0.5)]);
}

// --- mastro (bandeira é dinâmica) ---
export function flagpole(i: number, j: number, H = 40): Obj {
  const m = new Model();
  m.add(new Cyl(i, j, 0.025, 0, H, solid(P.metal, 0.35)));
  m.add(new Dome(i, j, H, 0.04, solid(P.yellow, 0.3)));
  return mkObj('mastro', [i - 0.03, j - 0.03, i + 0.03, j + 0.03], m.render({ edge: false }));
}

void Poly; void mix; void E;
