// Fundo do mundo: mar de nuvens sob a ilha (camadas atrás e na frente), ilhotas flutuantes ao longe
// com árvores e lanternas, e névoa onde a cascata cai. Coordenadas de mundo com paralaxe.
import { PB } from './pixel';
import { pick, hex, type Ramp, type U32 } from './color';
import { hash2, mulberry32, vnoise, fbm } from './rng';
import { P, E } from './palette';
import { tree, type TreeKind } from './sprites/props';
import { OX, OY, N, WORLD_W, WORLD_H } from './iso';

const CLOUD: Ramp = ['#5d6390', '#787fae', '#959cca', '#b6bce2', '#d6daf4', '#f2f3fc'].map((h) => hex(h));

export interface BgSprite { img: OffscreenCanvas; x: number; y: number; par: number; bob?: number; ph?: number; glow?: OffscreenCanvas | null; lights?: { x: number; y: number; r: number; color: U32 }[] }

function cloudSprite(w: number, h: number, seed: number, flatBottom = true): OffscreenCanvas {
  const pb = new PB(w, h);
  const r = mulberry32(seed);
  // vários lóbulos (cúmulos) sobre uma base achatada
  const lobes = Array.from({ length: 5 + Math.floor(r() * 5) }, () => ({ x: w * (0.12 + r() * 0.76), y: h * (0.35 + r() * 0.3), r: h * (0.22 + r() * 0.3) }));
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let best = -1e9, ny = 0, nx = 0;
      for (const l of lobes) {
        const dx = (x - l.x) / (l.r * 1.6), dy = (y - l.y) / l.r;
        const v = 1 - (dx * dx + dy * dy);
        if (v > best) { best = v; nx = dx; ny = dy; }
      }
      best += (fbm(x * 0.06, y * 0.09, seed) - 0.5) * 0.5;
      if (flatBottom && y > h * 0.78) best -= (y - h * 0.78) / (h * 0.1);
      if (best <= 0) continue;
      // luz da lua de cima/esquerda; base mais escura
      let s = 0.55 - ny * 0.32 - nx * 0.1 + best * 0.15 - (y / h) * 0.25;
      if (best < 0.08) s += 0.18; // borda clara
      pb.data[y * w + x] = pick(CLOUD, s, x, y);
    }
  return pb.toCanvas();
}

function isletSprite(seed: number, size: number): { img: OffscreenCanvas; lights: { x: number; y: number }[]; w: number; h: number } {
  const r = mulberry32(seed);
  const tw = Math.round(size * 32), th = Math.round(size * 16); // losango do topo
  const depth = Math.round(size * 34 + 20);
  const W = tw + 40, H = th + depth + 70;
  const pb = new PB(W, H);
  const cx = W / 2, cy = 60;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const dx = Math.abs(x + 0.5 - cx) / (tw / 2), dy = (y + 0.5 - cy) / (th / 2);
      if (dx + Math.abs(dy) <= 1 + (vnoise(x * 0.2, y * 0.2, seed) - 0.5) * 0.12) {
        const g = fbm(x * 0.15, y * 0.15, seed);
        pb.data[y * W + x] = pick(P.grass, 0.45 + (g - 0.5) * 0.5, x, y);
        continue;
      }
      // laterais em rocha, afinando para baixo
      if (y > cy && y < cy + th / 2 + depth) {
        const below = y - cy;
        const half = (tw / 2) * Math.max(0, 1 - Math.abs(below - 0) / (th / 2 + depth)) * (1 - Math.pow(below / (th / 2 + depth), 1.4) * 0.15);
        const edgeY = cy + (th / 2) * (1 - Math.abs(x + 0.5 - cx) / (tw / 2));
        const jag = (vnoise(x * 0.25, 1, seed) - 0.5) * 10;
        if (Math.abs(x + 0.5 - cx) < half && y >= edgeY - 1 && y < cy + th / 2 + depth * (1 - Math.pow(Math.abs(x + 0.5 - cx) / (tw / 2), 0.8)) + jag) {
          const dd = y - edgeY;
          const left = x < cx;
          let c: U32;
          if (dd < 2) c = pick(P.grass, left ? 0.55 : 0.35, x, y);
          else if (dd < 9) c = pick(P.soil, left ? 0.55 : 0.4, x, y);
          else c = pick(P.rock, (left ? 0.5 : 0.32) + (hash2(x >> 2, y >> 2, seed) - 0.5) * 0.15, x, y);
          pb.data[y * W + x] = c;
        }
      }
    }
  const img = pb.toCanvas();
  const ctx = img.getContext('2d')!;
  // árvores e uma lanterna sobre o topo
  const lights: { x: number; y: number }[] = [];
  const n = 1 + Math.floor(size * 1.5);
  const kinds: TreeKind[] = ['round', 'pine', 'ipeP', 'ipeY', 'tall'];
  for (let k = 0; k < n; k++) {
    const t = tree(kinds[Math.floor(r() * kinds.length)], 4 + (r() - 0.5) * size * 0.5, 4 + (r() - 0.5) * size * 0.5, seed * 7 + k);
    const s = t.sprite;
    const rx = s.ox - OX, ry = s.oy - (8 * 8 + OY); // relativo à base da árvore no tile (4, 4)
    ctx.drawImage(s.img, Math.round(cx + rx + (r() - 0.5) * tw * 0.35), Math.round(cy + ry + (r() - 0.5) * th * 0.3));
  }
  // lanterna
  const lx = Math.round(cx + (r() - 0.5) * tw * 0.4), ly = Math.round(cy - 2);
  ctx.fillStyle = '#2a2232'; ctx.fillRect(lx, ly - 12, 1, 12);
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(lx - 1, ly - 15, 3, 3);
  lights.push({ x: lx, y: ly - 14 });
  return { img, lights, w: W, h: H };
}

let cache: { back: BgSprite[]; front: BgSprite[]; islets: BgSprite[]; mist: OffscreenCanvas[] } | null = null;
export function backdrop() {
  if (cache) return cache;
  const r = mulberry32(31);
  const bottom = OY + N * 16 + 120; // base aproximada da ilha
  const back: BgSprite[] = [];
  for (let k = 0; k < 16; k++) {
    const w = 220 + Math.floor(r() * 180), h = 70 + Math.floor(r() * 50);
    back.push({ img: cloudSprite(w, h, 100 + k), x: -700 + (k / 16) * (WORLD_W + 1400) + (r() - 0.5) * 120, y: bottom - 40 + r() * 160 + (k % 2) * 60, par: 0.35 });
  }
  const front: BgSprite[] = [];
  for (let k = 0; k < 9; k++) {
    const w = 160 + Math.floor(r() * 140), h = 46 + Math.floor(r() * 30);
    front.push({ img: cloudSprite(w, h, 300 + k), x: -400 + (k / 9) * (WORLD_W + 800) + (r() - 0.5) * 100, y: bottom + 40 + r() * 140, par: -0.12 });
  }
  const islets: BgSprite[] = [];
  const spots: [number, number, number][] = [[-20, 110, 2.6], [WORLD_W - 330, 20, 3.0], [WORLD_W / 2 - 120, -110, 1.4], [-70, 520, 1.5], [WORLD_W - 120, 640, 1.3]];
  spots.forEach(([x, y, s], k) => {
    const is = isletSprite(500 + k, s);
    islets.push({ img: is.img, x, y, par: 0.22, bob: 3, ph: k * 1.7, lights: is.lights.map((l) => ({ x: x + l.x, y: y + l.y, r: 0.35, color: E.lampWarm })) });
  });
  const mist = [0, 1, 2].map((k) => cloudSprite(70 + k * 14, 28 + k * 4, 700 + k, false));
  cache = { back, front, islets, mist };
  void WORLD_H;
  return cache;
}

// posição na tela-de-mundo com paralaxe (camadas mais "longe" acompanham menos a câmera)
export function bgPos(s: BgSprite, camX: number, camY: number, t: number) {
  const cx = WORLD_W / 2, cy = WORLD_H / 2;
  const drift = s.par > 0 ? Math.sin(t * 0.05 + s.x) * 6 + t * 2.5 * s.par : t * 4;
  return { x: s.x + (camX - cx) * s.par + drift, y: s.y + (camY - cy) * s.par + (s.bob ? Math.sin(t * 0.6 + (s.ph ?? 0)) * s.bob : 0) };
}
