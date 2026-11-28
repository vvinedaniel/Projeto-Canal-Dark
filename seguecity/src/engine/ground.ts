// Chão da cidade renderizado pixel a pixel: grama, ruas (faixas, faixas de pedestre), calçadas com meio-fio,
// praça em pedra portuguesa, calçadão de ondas, quadra, canal do rio afundado com muros de pedra,
// laterais de terra da ilha flutuante e a cascata onde o rio cai da borda.
import { N, OX, OY, WORLD_H, WORLD_W, rayA, rayB } from './iso';
import { P } from './palette';
import { pick, hex, mix, scale, bayer, type U32 } from './color';
import { fbm, hash2, vnoise } from './rng';
import { PB } from './pixel';
import { tileAt, isRoad, inChannel, RIVER_I0, RIVER_I1, RIVER_D, type TileType } from './map';

export interface Lot { i0: number; j0: number; i1: number; j1: number; kind: 'concrete' | 'yard' | 'dirt' | 'paver' }
export interface GroundOut {
  canvas: OffscreenCanvas;
  // pixels de água (superfície do canal) e da cascata, para animação por quadro
  water: Int32Array; // x, y, i*256, j*256, brilho*1000 por pixel (ordem de varredura)
  fall: Int32Array; // x, y, topo da queda por pixel
  slabDepth: (d: number, col: number) => number;
  crystals: Int32Array; // x, y de cada cristal luminoso das encostas
}

const FOUNTAIN = { i: 12.5, j: 13.5 };

// sentido da rua: 'i' (corre ao longo de i), 'j', 'x' (cruzamento)
function roadDir(i: number, j: number): 'i' | 'j' | 'x' {
  const ai = isRoad(i - 1, j) || isRoad(i + 1, j);
  const aj = isRoad(i, j - 1) || isRoad(i, j + 1);
  if (ai && aj) return 'x';
  return ai ? 'i' : 'j';
}

export function slabDepthAt(dFront: number, col: number) {
  // dFront: distância (tiles) até o canto da frente; mais fundo no canto da frente (montanha invertida)
  const k = Math.max(0, 1 - dFront / N);
  const base = 26 + 190 * Math.pow(k, 1.6);
  const jag = (vnoise(col * 0.09, 3.1) - 0.5) * 28 + (hash2(col >> 2, 7) - 0.5) * 10;
  return Math.max(18, base + jag * (0.4 + k));
}

export interface AO { i0: number; j0: number; i1: number; j1: number; s: number; r: number }

export function buildGround(lots: Lot[], ao: AO[] = []): GroundOut {
  const pb = new PB(WORLD_W, WORLD_H, 0, 0);
  const topMask = new Uint8Array(WORLD_W * WORLD_H); // 1 = superfície do chão (recebe sombra de contato)
  const water: number[] = [];
  const fall: number[] = [];
  const lotAt = (i: number, j: number) => {
    for (const l of lots) if (i >= l.i0 && i < l.i1 && j >= l.j0 && j < l.j1) return l;
    return null;
  };

  for (let py = 0; py < WORLD_H; py++) {
    const B = rayB(py);
    for (let px = 0; px < WORLD_W; px++) {
      const A = rayA(px);
      // ponto do topo (z = 0)
      const i = (8 * A + B) / 16, j = i - A;
      let c: U32 = 0;
      if (i >= 0 && j >= 0 && i < N && j < N) {
        if (inChannel(i, j) && !isBridgeDeck(i, j)) {
          // dentro do canal: desce o raio até a água ou o muro oeste / muro do fundo
          let hitWall = false;
          for (let z = -1; z >= -RIVER_D; z--) {
            const ii = (z + 8 * A + B) / 16, jj = ii - A;
            if (ii < RIVER_I0) { c = wallColor(px, py, z, jj, 'W'); hitWall = true; break; }
            if (jj < 0) { c = wallColor(px, py, z, ii, 'N'); hitWall = true; break; }
          }
          if (!hitWall) {
            const ii = (-RIVER_D + 8 * A + B) / 16, jj = ii - A;
            c = waterBase(ii, jj, px, py);
            water.push(px, py, Math.round(ii * 256), Math.round(jj * 256), Math.round(waterS(ii, jj) * 1000));
          }
        } else {
          c = topColor(i, j, px, py, lotAt);
          topMask[py * WORLD_W + px] = 1;
        }
      } else {
        // laterais da ilha: face +j (j = N) e face +i (i = N)
        const iL = A + N, zL = 16 * iL - 8 * A - B;
        const jR = N - A, zR = 16 * N - 8 * A - B;
        if (iL >= 0 && iL < N && zL < 0) {
          const col = px;
          const depth = slabDepthAt(N - iL, col);
          if (zL >= -depth) {
            if (iL >= RIVER_I0 && iL < RIVER_I1) {
              if (zL > -RIVER_D) {
                // boca do canal: o raio entra no canal
                let done = false;
                for (let z = Math.floor(zL); z >= -RIVER_D; z--) {
                  const ii = (z + 8 * A + B) / 16, jj = ii - A;
                  if (ii < RIVER_I0) { c = wallColor(px, py, z, jj, 'W'); done = true; break; }
                }
                if (!done) {
                  const ii = (-RIVER_D + 8 * A + B) / 16, jj = ii - A;
                  c = waterBase(ii, jj, px, py);
                  water.push(px, py, Math.round(ii * 256), Math.round(jj * 256), Math.round(waterS(ii, jj) * 1000));
                }
              } else {
                c = fallBase(px, py);
                fall.push(px, py, Math.round(-zL));
              }
            } else c = slabColor(px, py, -zL, depth, 'L', iL);
          }
        } else if (jR >= 0 && jR < N && zR < 0) {
          const depth = slabDepthAt(N - jR, px);
          if (zR >= -depth) c = slabColor(px, py, -zR, depth, 'R', jR);
        }
      }
      if (c) pb.data[py * WORLD_W + px] = c;
    }
  }
  // sombra de contato (oclusão ambiente) em volta de prédios, árvores e postes, com pontilhado
  for (const a of ao) {
    const x0 = Math.floor((a.i0 - a.j1 - a.r * 2) * 16 + OX) - 2, x1 = Math.ceil((a.i1 - a.j0 + a.r * 2) * 16 + OX) + 2;
    const y0 = Math.floor((a.i0 + a.j0 - a.r * 2) * 8 + OY) - 2, y1 = Math.ceil((a.i1 + a.j1 + a.r * 2) * 8 + OY) + 2;
    for (let py = Math.max(0, y0); py < Math.min(WORLD_H, y1); py++)
      for (let px = Math.max(0, x0); px < Math.min(WORLD_W, x1); px++) {
        const k = py * WORLD_W + px;
        if (!topMask[k]) continue;
        const A = rayA(px), B = rayB(py);
        const i = (8 * A + B) / 16, j = i - A;
        const di = Math.max(a.i0 - i, 0, i - a.i1), dj = Math.max(a.j0 - j, 0, j - a.j1);
        const d = Math.hypot(di, dj);
        if (d >= a.r) continue;
        let f = a.s * Math.pow(1 - d / a.r, 1.6);
        // sombra mais longa para +i (luz vinda do alto à esquerda)
        if (i > a.i1 && j > a.j0 - 0.2 && j < a.j1 + 0.2) f *= 1.25;
        if (f > bayer(px, py) * 0.18 + 0.02) pb.data[k] = scale(pb.data[k], 1 - Math.min(0.55, f));
      }
  }
  return { canvas: pb.toCanvas(), water: Int32Array.from(water), fall: Int32Array.from(fall), slabDepth: slabDepthAt, crystals: Int32Array.from(CRYSTALS) };
}

// tabuleiro das pontes: o canal sob a ponte fica coberto pelo próprio objeto ponte; aqui não muda o chão
const isBridgeDeck = (_i: number, _j: number) => false;

function wallColor(px: number, py: number, z: number, along: number, side: 'W' | 'N'): U32 {
  // muro de pedra em blocos
  const row = Math.floor(-z / 4);
  const off = (row & 1) * 0.25;
  const brick = Math.floor(along * 4 + off);
  let s = side === 'W' ? 0.42 : 0.6;
  if (((-z) & 3) === 0) s -= 0.18; // junta horizontal
  if (Math.abs(((along * 4 + off) % 1)) < 0.08) s -= 0.15; // junta vertical
  s += (hash2(brick, row, 31) - 0.5) * 0.12;
  if (z >= -1) s += 0.25; // borda do cais
  if (z <= -RIVER_D + 2) s -= 0.12; // úmido perto da água
  return pick(P.stone, s, px, py);
}

function waterS(i: number, j: number) {
  const e = Math.min(i - RIVER_I0, RIVER_I1 - i);
  return 0.3 + Math.min(e, 1.4) * 0.12 + (fbm(i * 0.7, j * 0.35, 5) - 0.5) * 0.12 - (i < RIVER_I0 + 0.35 ? 0.12 : 0);
}
function waterBase(i: number, j: number, px: number, py: number): U32 {
  return pick(P.water, waterS(i, j), px, py);
}

function fallBase(px: number, py: number): U32 {
  return pick(P.water, 0.62 + hash2(px, py >> 3, 9) * 0.25, px, py);
}

// cristais luminosos encontrados na rocha (desenhados pulsando na emissão a cada quadro)
const CRYSTALS: number[] = [];
function slabColor(px: number, py: number, d: number, depth: number, face: 'L' | 'R', along: number): U32 {
  const fl = face === 'L' ? 0.1 : -0.08; // face +j iluminada pela lua
  const wav = (vnoise(along * 1.3, 1.7) - 0.5) * 6 + (vnoise(along * 4.1, 9.2) - 0.5) * 2;
  const dd = d + wav;
  const n = (hash2(px >> 1, py >> 1, 77) - 0.5) * 0.1;
  const bottom = depth - d; // distância até a base
  let c: U32;
  if (d < 3) c = pick(P.grass, 0.62 + fl + n, px, py); // borda de grama
  else if (d < 5 && hash2(px, 5, 3) > 0.45) c = pick(P.grass, 0.4 + fl, px, py); // grama pendurada
  else if (dd < 13) c = pick(P.soil, 0.55 + fl + n + (dd < 7 ? 0.12 : 0), px, py);
  else if (dd < 15.5) c = pick(P.sand, 0.5 + fl + n, px, py); // veio de areia
  else if (dd < 29) c = pick(P.clay, 0.5 + fl + n + Math.sin(dd * 0.9) * 0.06, px, py);
  else if (dd < 36) c = pick(P.dirt, 0.42 + fl + n, px, py);
  else if (dd < 42) {
    // faixa de basalto escuro com fissuras verticais
    c = pick(P.rock, 0.22 + fl + n, px, py);
    if ((px + Math.floor(dd)) % 7 === 0) c = pick(P.black, 0.4, px, py);
  } else {
    // rocha em blocos irregulares
    const cell = vnoise(px * 0.12, py * 0.09, 41);
    const cr = Math.floor(cell * 6);
    c = pick(P.rock, 0.4 + fl + (cr % 3) * 0.08 + n + (hash2(cr, px >> 4, 13) - 0.5) * 0.08, px, py);
    if (Math.abs(cell * 6 - Math.round(cell * 6)) < 0.08) c = pick(P.rock, 0.15 + fl, px, py);
  }
  // pedras arredondadas embutidas na terra (com luz em cima à esquerda)
  if (dd > 8 && dd < 36) {
    const gx = Math.floor(px / 11), gy = Math.floor((py + gx * 5) / 9);
    if (hash2(gx, gy, 61) > 0.72) {
      const cx = gx * 11 + 3 + hash2(gx, gy, 62) * 5, cy = gy * 9 - gx * 5 + 2 + hash2(gx, gy, 63) * 5;
      const rr = 2 + hash2(gx, gy, 64) * 2.2;
      const dx = px - cx, dy = py - cy, q = Math.hypot(dx, dy * 1.2);
      if (q < rr) c = pick(P.rock, 0.45 + fl - (dx + dy) / (rr * 4) + (q > rr - 1 ? -0.15 : 0), px, py);
    }
  }
  // raízes
  if (d > 4 && d < 26 && hash2(px, 11, 5) > 0.93 && hash2(px, Math.floor(d / 3), 6) > 0.3) c = pick(P.trunk, 0.35 + fl, px, py);
  // trepadeiras penduradas da borda (com folhas)
  const vine = hash2(px >> 1, 21, 31);
  if (vine > 0.86) {
    const len = 6 + hash2(px >> 1, 22, 31) * 34;
    const wig = Math.round(Math.sin(d * 0.35 + px) * 0.6);
    if (d > 2 && d < len && ((px + wig) & 1) === 0) c = pick(P.foliage, 0.55 + fl - d / 120 + ((Math.floor(d) % 4 === 0) ? 0.15 : 0), px, py);
    if (d > 2 && d < len && Math.floor(d) % 4 === 0 && hash2(px, Math.floor(d), 33) > 0.4) c = pick(P.foliage, 0.7 + fl, px, py);
  }
  // cristais brilhantes na rocha (detalhe da ilha)
  if (d > 46 && hash2(px >> 1, py >> 1, 99) > 0.993) { c = hex('#8ef0ff'); CRYSTALS.push(px, py); }
  // escurece para baixo e na base
  if (bottom < 5) c = scale(c, 0.6 + bottom * 0.06);
  c = scale(c, 1 - Math.min(0.35, d / 600));
  return c;
}

// --- topo ---------------------------------------------------------------------------------
function topColor(i: number, j: number, px: number, py: number, lotAt: (i: number, j: number) => Lot | null): U32 {
  const ti = Math.floor(i), tj = Math.floor(j);
  const u = i - ti, v = j - tj;
  const t = tileAt(ti, tj) as TileType;
  if (t === 'road' || t === 'bridge') return roadColor(ti, tj, u, v, px, py, i, j);
  // calçada nas bordas de quarteirão vizinhas a ruas
  const sw = sidewalk(ti, tj, u, v);
  if (sw > 0) return walkColor(i, j, px, py, sw);
  const lot = lotAt(ti, tj);
  if (lot) return lotColor(lot, i, j, px, py);
  switch (t) {
    case 'plaza': return plazaColor(i, j, px, py);
    case 'promenade': return promenadeColor(i, j, px, py);
    case 'court': return courtColor(i, j, px, py);
    case 'garden': return gardenColor(i, j, px, py);
    case 'parking': return parkingColor(i, j, px, py);
    case 'dirt': return dirtColor(i, j, px, py);
    case 'river': return grassColor(i, j, px, py);
    default: return grassColor(i, j, px, py, t === 'forest');
  }
}

const SW = 0.24; // largura da calçada (fração do tile)
// devolve 0 (sem calçada), 1 (calçada), 2 (meio-fio)
function sidewalk(ti: number, tj: number, u: number, v: number): number {
  const t = tileAt(ti, tj);
  if (t === 'river' || t === 'forest' || t === 'promenade') return 0;
  const n = isRoad(ti, tj - 1), s = isRoad(ti, tj + 1), w = isRoad(ti - 1, tj), e = isRoad(ti + 1, tj);
  const nw = isRoad(ti - 1, tj - 1), ne = isRoad(ti + 1, tj - 1), sw2 = isRoad(ti - 1, tj + 1), se = isRoad(ti + 1, tj + 1);
  const edge = 0.055;
  let d = 9;
  if (n) d = Math.min(d, v);
  if (s) d = Math.min(d, 1 - v);
  if (w) d = Math.min(d, u);
  if (e) d = Math.min(d, 1 - u);
  if (nw && !n && !w) d = Math.min(d, Math.max(u, v));
  if (ne && !n && !e) d = Math.min(d, Math.max(1 - u, v));
  if (sw2 && !s && !w) d = Math.min(d, Math.max(u, 1 - v));
  if (se && !s && !e) d = Math.min(d, Math.max(1 - u, 1 - v));
  if (d < edge) return 2;
  if (d < SW) return 1;
  return 0;
}

function walkColor(i: number, j: number, px: number, py: number, kind: number): U32 {
  if (kind === 2) {
    // boca de lobo a cada ~3 tiles no meio-fio
    const along = Math.abs(((i + j) * 1.5) % 4.5 - 2.2);
    if (along < 0.14) return (px + py) % 2 ? pick(P.black, 0.5, px, py) : pick(P.metal, 0.35, px, py);
    return pick(P.curb, 0.85, px, py);
  }
  const gi = Math.floor(i * 4), gj = Math.floor(j * 4);
  const fi = i * 4 - gi, fj = j * 4 - gj;
  let s = 0.62 + (hash2(gi, gj, 3) - 0.5) * 0.1;
  if (fi < 0.12 || fj < 0.12) s -= 0.13;
  return pick(P.walk, s, px, py);
}

function roadColor(ti: number, tj: number, u: number, v: number, px: number, py: number, i: number, j: number): U32 {
  const dir = roadDir(ti, tj);
  let s = 0.5 + (fbm(i * 2.1, j * 2.1, 2) - 0.5) * 0.22 + (hash2(px, py, 1) - 0.5) * 0.08;
  // remendos e manchas
  if (vnoise(i * 0.8, j * 0.8, 12) > 0.78) s -= 0.1;
  let c = pick(P.asphalt, s, px, py);
  const W = hex('#d9d6cf'), Y = hex('#e9b93c');
  const avenue = tj === 10 || tj === 24;
  if (dir === 'i') {
    // faixa central
    const along = i;
    if (avenue) { if (Math.abs(v - 0.46) < 0.03 || Math.abs(v - 0.54) < 0.03) c = Y; }
    else if (Math.abs(v - 0.5) < 0.035 && (along * 2) % 1 < 0.5) c = W;
    // faixa de pedestres perto de cruzamentos
    const nearX = (isRoad(ti - 1, tj) && roadDir(ti - 1, tj) === 'x' && u < 0.36) || (isRoad(ti + 1, tj) && roadDir(ti + 1, tj) === 'x' && u > 0.64);
    if (nearX && v > 0.1 && v < 0.9 && Math.floor(v * 7) % 2 === 1 && (u < 0.5 ? u > 0.08 : u < 0.92)) c = W;
  } else if (dir === 'j') {
    const along = j;
    if (ti === 20 || ti === 30) { if (Math.abs(u - 0.46) < 0.03 || Math.abs(u - 0.54) < 0.03) c = Y; }
    else if (Math.abs(u - 0.5) < 0.035 && (along * 2) % 1 < 0.5) c = W;
    const nearX = (isRoad(ti, tj - 1) && roadDir(ti, tj - 1) === 'x' && v < 0.36) || (isRoad(ti, tj + 1) && roadDir(ti, tj + 1) === 'x' && v > 0.64);
    if (nearX && u > 0.1 && u < 0.9 && Math.floor(u * 7) % 2 === 1 && (v < 0.5 ? v > 0.08 : v < 0.92)) c = W;
  } else {
    // cruzamento: bueiro no centro
    const du = u - 0.5, dv = v - 0.5;
    if (Math.abs(du) < 0.07 && Math.abs(dv) < 0.07) c = pick(P.metal, 0.3 + ((Math.floor(i * 40) & 1) ? 0.1 : 0), px, py);
  }
  // desgaste das faixas
  if (c === W || c === Y) { if (hash2(px, py, 8) > 0.86) c = mix(c, pick(P.asphalt, 0.5, px, py), 0.5); }
  return c;
}

function grassColor(i: number, j: number, px: number, py: number, forest = false): U32 {
  const n = fbm(i * 1.3, j * 1.3, 4);
  let s = 0.42 + (n - 0.5) * 0.5 + (hash2(px >> 1, py, 2) - 0.5) * 0.08;
  if (forest) s -= 0.12;
  let c = pick(P.grass, s, px, py);
  const h = hash2(px, py, 6);
  if (h > 0.996) c = pick(P.grass, 0.9, px, py); // tufos
  else if (!forest && h < 0.0012) c = hex(['#f2e27a', '#f0a3c8', '#ffffff', '#b8a6ff'][Math.floor(hash2(px, py, 7) * 4)]);
  return c;
}

function plazaColor(i: number, j: number, px: number, py: number): U32 {
  const di = i - FOUNTAIN.i, dj = j - FOUNTAIN.j;
  const r = Math.hypot(di, dj);
  // anéis concêntricos em volta da fonte + raios
  let s = 0.7 + (hash2(Math.floor(i * 5), Math.floor(j * 5), 4) - 0.5) * 0.12;
  if (r < 2.4) {
    const ring = Math.floor(r * 3);
    if (ring % 2 === 0) s -= 0.18;
    const ang = Math.atan2(dj, di);
    if (r > 1.2 && Math.abs(((ang / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) < 0.06) s -= 0.22;
  } else {
    // caminhos em X e quadrados de pedra
    const gi = Math.floor(i * 3), gj = Math.floor(j * 3);
    if (((gi + gj) & 1) === 0) s -= 0.08;
    if (Math.abs(di - dj) < 0.18 || Math.abs(di + dj) < 0.18) s += 0.1;
  }
  return pick(P.paver, s, px, py);
}

function promenadeColor(i: number, j: number, px: number, py: number): U32 {
  // calçadão de ondas em pedra portuguesa (faixas pretas e brancas onduladas ao longo do rio)
  const q = (i - 25) * 3.2 - 0.55 * Math.sin((j * 2 * Math.PI) / 1.15);
  const dark = (Math.floor(q) & 1) === 0;
  const s = (dark ? 0.1 : 0.9) + (hash2(px, py, 5) - 0.5) * 0.08;
  return pick(P.walk, s, px, py);
}

function courtColor(i: number, j: number, px: number, py: number): U32 {
  const u = (i - 4) / 5, v = (j - 7) / 3; // quadra 5x3 tiles
  const W = hex('#e9eef0');
  const inner = u > 0.06 && u < 0.94 && v > 0.1 && v < 0.9;
  let c = pick(inner ? P.blue : P.teal, inner ? 0.55 : 0.45, px, py);
  const lineU = Math.abs(u - 0.06) < 0.008 || Math.abs(u - 0.94) < 0.008 || Math.abs(u - 0.5) < 0.008;
  const lineV = Math.abs(v - 0.1) < 0.02 || Math.abs(v - 0.9) < 0.02;
  if ((lineU && v > 0.1 && v < 0.9) || (lineV && u > 0.06 && u < 0.94)) c = W;
  const dc = Math.hypot((u - 0.5) * 5, (v - 0.5) * 3);
  if (Math.abs(dc - 0.55) < 0.035) c = W;
  // áreas do garrafão
  for (const cu of [0.06, 0.94]) {
    const dk = Math.hypot((u - cu) * 5, (v - 0.5) * 3);
    if (Math.abs(dk - 1.0) < 0.04 && v > 0.1 && v < 0.9) c = W;
  }
  return c;
}

function gardenColor(i: number, j: number, px: number, py: number): U32 {
  const v = j - Math.floor(j), u = i - Math.floor(i);
  if (v < 0.18 || v > 0.82) return walkColor(i, j, px, py, 1);
  // canteiro com flores
  const h = hash2(px >> 1, py, 21);
  if (h > 0.8) return hex(['#f25a7a', '#f7d046', '#ffffff', '#c58cff', '#ff9b4a'][Math.floor(hash2(px >> 1, py, 22) * 5)]);
  void u;
  return pick(P.foliage, 0.4 + (hash2(px, py, 23) - 0.5) * 0.4, px, py);
}

function parkingColor(i: number, j: number, px: number, py: number): U32 {
  let c = pick(P.asphalt, 0.55 + (hash2(px, py, 2) - 0.5) * 0.08, px, py);
  const f = (i * 2.5) % 1;
  if (f < 0.05 && (j % 1) > 0.15 && (j % 1) < 0.75) c = hex('#cfcac2');
  return c;
}

function dirtColor(i: number, j: number, px: number, py: number): U32 {
  const n = fbm(i * 1.7, j * 1.7, 9);
  let s = 0.45 + (n - 0.5) * 0.5 + (hash2(px, py, 2) - 0.5) * 0.18;
  // marcas de pneu
  if (Math.abs(((i + j * 0.3) * 3) % 1 - 0.5) < 0.04 && vnoise(i, j, 4) > 0.5) s -= 0.15;
  let c = pick(P.dirt, s, px, py);
  if (hash2(px, py, 3) > 0.985) c = pick(P.rock, 0.6, px, py);
  return c;
}

function lotColor(l: Lot, i: number, j: number, px: number, py: number): U32 {
  switch (l.kind) {
    case 'yard': return grassColor(i, j, px, py);
    case 'dirt': return dirtColor(i, j, px, py);
    case 'paver': return pick(P.paver, 0.55 + (((Math.floor(i * 4) + Math.floor(j * 4)) & 1) ? 0.08 : 0), px, py);
    default: return pick(P.concrete, 0.62 + (hash2(Math.floor(i * 3), Math.floor(j * 3), 5) - 0.5) * 0.06, px, py);
  }
}
export { FOUNTAIN, roadDir };
void OX; void OY;
