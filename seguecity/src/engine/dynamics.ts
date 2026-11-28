// Tudo que se move, como função pura do tempo t: trânsito em circuitos fechados (mão dupla, mão direita),
// ônibus com paradas, pedestres nas calçadas, jatos da fonte, bandeiras, semáforos, grua e reflexos na água.
import { sx, sy } from './iso';
import { hash2, mulberry32 } from './rng';
import { hex, scale, type U32 } from './color';
import { E, P } from './palette';
import { vehicleSprite, CAR_COLORS, type VKind } from './sprites/vehicles';
import { personSprite, randomLook, type Look } from './sprites/people';
import type { Obj, Light } from './types';
import type { World } from './world';
import type { Sprite } from './model';

type Pt = { i: number; j: number };
const LANE = 0.18;

interface Loop { pts: Pt[]; len: number; cum: number[]; hd: ('+i' | '-i' | '+j' | '-j')[] }
function makeLoop(corners: [number, number][], reverse = false): Loop {
  const c = reverse ? [...corners].reverse() : corners;
  const n = c.length;
  const hd: Loop['hd'] = [];
  for (let k = 0; k < n; k++) {
    const a = c[k], b = c[(k + 1) % n];
    hd.push(b[0] !== a[0] ? (b[0] > a[0] ? '+i' : '-i') : b[1] > a[1] ? '+j' : '-j');
  }
  const laneJ = (k: number) => c[k][1] + 0.5 + (hd[k] === '+i' ? LANE : -LANE);
  const laneI = (k: number) => c[k][0] + 0.5 + (hd[k] === '+j' ? -LANE : LANE);
  const pts: Pt[] = [];
  for (let k = 0; k < n; k++) {
    const prev = (k + n - 1) % n;
    // canto k: junção do segmento anterior com o atual
    const segI = hd[k][1] === 'i' ? k : prev; // segmento ao longo de i dá o j da faixa
    const segJ = hd[k][1] === 'j' ? k : prev;
    pts.push({ i: laneI(segJ), j: laneJ(segI) });
  }
  const cum = [0];
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n];
    cum.push(cum[k] + Math.abs(b.i - a.i) + Math.abs(b.j - a.j));
  }
  return { pts, len: cum[n], cum, hd };
}
function at(L: Loop, s: number) {
  s = ((s % L.len) + L.len) % L.len;
  let k = 0;
  while (k < L.pts.length - 1 && L.cum[k + 1] <= s) k++;
  const a = L.pts[k], b = L.pts[(k + 1) % L.pts.length];
  const f = (s - L.cum[k]) / (L.cum[k + 1] - L.cum[k] || 1);
  return { i: a.i + (b.i - a.i) * f, j: a.j + (b.j - a.j) * f, hd: L.hd[k] };
}

const LOOPS = {
  A: makeLoop([[3, 3], [20, 3], [20, 24], [3, 24]]),
  Ar: makeLoop([[3, 3], [20, 3], [20, 24], [3, 24]], true),
  B: makeLoop([[9, 10], [15, 10], [15, 17], [9, 17]]),
  Br: makeLoop([[9, 10], [15, 10], [15, 17], [9, 17]], true),
  C: makeLoop([[20, 10], [30, 10], [30, 24], [20, 24]]),
  Cr: makeLoop([[20, 10], [30, 10], [30, 24], [20, 24]], true),
  D: makeLoop([[3, 10], [9, 10], [9, 24], [3, 24]]),
  E: makeLoop([[3, 24], [20, 24], [20, 28], [3, 28]], true),
};

interface Car { loop: keyof typeof LOOPS; s0: number; v: number; kind: VKind; color: number; rank: number; stops?: number[] }
const rnd = mulberry32(777);
const CARS: Car[] = [];
const addCars = (loop: keyof typeof LOOPS, n: number, v: number, kinds: VKind[] = []) => {
  const L = LOOPS[loop].len;
  const off = rnd() * L;
  for (let k = 0; k < n; k++) CARS.push({ loop, s0: off + (k * L) / n + rnd() * 2, v, kind: kinds[k] ?? (rnd() < 0.12 ? 'taxi' : 'car'), color: Math.floor(rnd() * CAR_COLORS.length), rank: rnd() });
};
addCars('A', 5, 1.55, ['car', 'car', 'taxi', 'car', 'car']);
addCars('Ar', 3, 1.4, ['truck', 'car', 'car']);
addCars('Br', 2, 1.3);
addCars('C', 3, 1.5, ['police', 'car', 'car']);
addCars('Cr', 2, 1.45);
addCars('D', 2, 1.35);
addCars('E', 2, 1.2);
// ônibus sozinho no circuito B com paradas
const BUS = { loop: 'B' as const, v: 1.0, s0: 3, stops: [4.5, 18.0], dwell: 2.2 };

interface Walker { loop: Loop; s0: number; v: number; look: Look; key: string; rank: number }
function rectLoop(i0: number, j0: number, i1: number, j1: number, rev: boolean): Loop {
  const c: [number, number][] = [[i0, j0], [i1, j0], [i1, j1], [i0, j1]];
  const pts = (rev ? [...c].reverse() : c).map(([i, j]) => ({ i, j }));
  const cum = [0];
  const hd: Loop['hd'] = [];
  for (let k = 0; k < 4; k++) {
    const a = pts[k], b = pts[(k + 1) % 4];
    cum.push(cum[k] + Math.abs(b.i - a.i) + Math.abs(b.j - a.j));
    hd.push(b.i !== a.i ? (b.i > a.i ? '+i' : '-i') : b.j > a.j ? '+j' : '-j');
  }
  return { pts, len: cum[4], cum, hd };
}
const W_IN = 0.17;
const BLOCKS: [number, number, number, number][] = [
  [4, 4, 9, 10], [10, 4, 15, 10], [16, 4, 20, 10], [4, 11, 9, 17], [10, 11, 15, 17], [16, 11, 20, 17],
  [4, 18, 9, 24], [10, 18, 15, 24], [16, 18, 20, 24], [4, 25, 20, 28],
];
const WALKERS: Walker[] = [];
{
  const r = mulberry32(99);
  let n = 0;
  for (const [i0, j0, i1, j1] of BLOCKS) {
    const per = i1 - i0 > 8 ? 5 : 3;
    for (let k = 0; k < per; k++) {
      const rev = r() < 0.5;
      const L = rectLoop(i0 + W_IN, j0 + W_IN, i1 - W_IN, j1 - W_IN, rev);
      WALKERS.push({ loop: L, s0: r() * L.len, v: 0.32 + r() * 0.16, look: randomLook(r), key: `w${n++}`, rank: r() });
    }
  }
  // calçadão (ida e volta) e calçada leste
  for (let k = 0; k < 6; k++) {
    const L = rectLoop(25.32, 1, 25.42 + (k % 2) * 0.22, 30.5, k % 2 === 0);
    WALKERS.push({ loop: L, s0: r() * L.len, v: 0.35 + r() * 0.2, look: randomLook(r), key: `w${n++}`, rank: r() });
  }
  for (let k = 0; k < 3; k++) {
    const L = rectLoop(29.83 - 0.001, 11.2, 29.83, 28.8, k % 2 === 0);
    WALKERS.push({ loop: L, s0: r() * L.len, v: 0.35 + r() * 0.1, look: randomLook(r), key: `w${n++}`, rank: r() });
  }
  // em volta da fonte
  for (let k = 0; k < 4; k++) {
    const L = rectLoop(11.05, 12.05, 13.95, 14.95, k % 2 === 0);
    WALKERS.push({ loop: L, s0: r() * L.len, v: 0.3 + r() * 0.1, look: randomLook(r), key: `w${n++}`, rank: r() });
  }
}

const dirOf = (hd: string) => (hd === '+i' ? 0 : hd === '+j' ? 1 : hd === '-i' ? 2 : 3);

let oid = 0;
const mkDyn = (id: string, kind: string, fp: [number, number, number, number], sprite: Sprite, dx: number, dy: number, lights: Light[] = [], group: Obj['group'] = 'street'): Obj =>
  ({ id, kind, fp, layer: 1, sprite, group, lights, dx, dy });

export interface DynParams { t: number; traffic: number; people: number; beacons?: boolean }
export interface Reflection { x: number; y: number; len: number; color: U32 }

export function dynamics(world: World, p: DynParams): { objs: Obj[]; refl: Reflection[] } {
  const objs: Obj[] = [];
  const t = p.t;
  // ---- carros
  for (let k = 0; k < CARS.length; k++) {
    const c = CARS[k];
    if (c.rank >= p.traffic) continue;
    const L = LOOPS[c.loop];
    const q = at(L, c.s0 + c.v * t);
    objs.push(vehicleObj(`car${k}`, c.kind, c.color, q.i, q.j, q.hd, t));
  }
  if (p.traffic > 0.05) {
    // ônibus com paradas
    const L = LOOPS[BUS.loop];
    const T = L.len / BUS.v + BUS.stops.length * BUS.dwell;
    let tau = (((t + BUS.s0) % T) + T) % T;
    let s = 0;
    const stops = [...BUS.stops, L.len];
    for (const st of stops) {
      const travel = (st - s) / BUS.v;
      if (tau <= travel) { s += tau * BUS.v; tau = -1; break; }
      tau -= travel; s = st;
      if (st === L.len) break;
      if (tau <= BUS.dwell) { tau = -1; break; }
      tau -= BUS.dwell;
    }
    const q = at(L, s);
    objs.push(vehicleObj('bus', 'bus', 0, q.i, q.j, q.hd, t));
  }
  // ---- estacionados (com giroflex)
  objs.push(vehicleObj('amb', 'ambulance', 2, 18.9, 9.5, '-i', t, true));
  objs.push(vehicleObj('pol', 'police', 2, 5.3, 21.05, '+i', t, true));
  objs.push(vehicleObj('bus2', 'bus', 0, 13.0, 22.0, '+j', t));
  objs.push(vehicleObj('bus3', 'bus', 0, 13.9, 22.4, '-j', t));
  // ---- pedestres
  for (let k = 0; k < WALKERS.length; k++) {
    const w = WALKERS[k];
    if (w.rank >= p.people) continue;
    const q = at(w.loop, w.s0 + w.v * t);
    const fr = Math.floor((t * w.v * 9 + k) % 4);
    objs.push(personObj(`p${k}`, w.look, w.key, q.i, q.j, dirOf(q.hd), fr));
  }
  // ---- fonte
  objs.push(fountainJets(world, t));
  // ---- bandeiras
  world.flags.forEach((f, k) => objs.push(flagObj(k, f, t)));
  // ---- semáforos
  world.signals.forEach((s, k) => objs.push(signalObj(k, s, t)));
  // ---- grua: luz piscando e carga pendurada
  objs.push(...craneObjs(world, t));
  // ---- reflexos dos postes da ponte na água
  const refl: Reflection[] = [];
  for (const bj of [10, 24]) for (const li of [21.6, 23.0, 24.4]) {
    const x = sx(li, bj + 0.96), y = sy(li, bj + 0.96, -8) + 3;
    refl.push({ x, y, len: 12 + Math.round(3 * Math.sin(t * 2 + li)), color: E.lampWarm });
  }
  return { objs, refl };
}

function vehicleObj(id: string, kind: VKind, colorIdx: number, i: number, j: number, hd: string, t: number, parked = false): Obj {
  const axis = hd[1] as 'i' | 'j';
  const front = hd[0] === '+';
  const color = kind === 'police' ? P.white : kind === 'ambulance' ? P.white : kind === 'taxi' ? P.yellow : kind === 'bus' ? P.blue : kind === 'truck' ? P.red : CAR_COLORS[colorIdx];
  const v = vehicleSprite(kind, color, axis, front, `${colorIdx}`);
  const dx = (i - j) * 16, dy = (i + j) * 8;
  const hl = axis === 'i' ? [v.L / 2, v.W / 2] : [v.W / 2, v.L / 2];
  const lights: Light[] = [];
  for (const L of v.lights) {
    const X = sx(i + L.di, j + L.dj), Y = sy(i + L.di, j + L.dj, L.z);
    if (L.kind === 'head' && !parked) lights.push({ x: X, y: Y, r: 0.22, color: E.head, a: 0.9, kind: 'halo' });
    if (L.kind === 'tail') lights.push({ x: X, y: Y, r: 0.16, color: E.tail, a: 0.8, kind: 'halo' });
    if (L.kind === 'beacon') {
      const on = Math.floor(t * 4) % 2;
      lights.push({ x: X, y: Y, r: 0.55, color: on ? E.blue : E.red, a: 1, kind: 'halo' });
      lights.push({ x: sx(i, j), y: sy(i, j), r: 1.1, color: on ? E.blue : E.red, a: 0.45, kind: 'pool' });
    }
  }
  if (!parked && front) {
    const ahead = axis === 'i' ? { i: i + 0.75, j } : { i, j: j + 0.75 };
    lights.push({ x: sx(ahead.i, ahead.j), y: sy(ahead.i, ahead.j), r: 0.65, color: E.head, a: 0.55, kind: 'pool' });
  }
  return mkDyn(id, 'veiculo', [i - hl[0], j - hl[1], i + hl[0], j + hl[1]], v.spr, dx, dy, lights, 'street');
}

export function personObj(id: string, look: Look, key: string, i: number, j: number, dir: number, frame: number, scaleUp = 1): Obj {
  const spr = personSprite(look, dir, frame, key, scaleUp);
  return mkDyn(id, 'pessoa', [i - 0.04, j - 0.04, i + 0.04, j + 0.04], spr, Math.round(sx(i, j)), Math.round(sy(i, j)), [], 'none');
}

function fountainJets(world: World, t: number): Obj {
  const W = 46, H = 34;
  const cv = new OffscreenCanvas(W, H), cx = cv.getContext('2d')!;
  const gl = new OffscreenCanvas(W, H), gx = gl.getContext('2d')!;
  const ox = Math.floor(W / 2), oy = 12;
  for (let k = 0; k < 36; k++) {
    const th = (k / 36) * Math.PI * 2;
    for (let q = 0; q < 3; q++) {
      const u = ((t * 0.85 + k * 0.37 + q / 3) % 1);
      const r = 2 + u * 17;
      const x = ox + Math.cos(th) * r, y = oy + Math.sin(th) * r * 0.5 - (u * (1 - u)) * 26 + u * 10;
      const a = 1 - u * 0.6;
      cx.fillStyle = `rgba(200,240,255,${a})`; cx.fillRect(Math.round(x), Math.round(y), 1, 1);
      gx.fillStyle = `rgba(110,230,255,${a * 0.8})`; gx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  }
  // jato central
  for (let y = 0; y < 12; y++) {
    const w = y < 3 ? 1 : 2;
    const fl = hash2(y, Math.floor(t * 12), 3) > 0.25;
    if (!fl) continue;
    cx.fillStyle = 'rgba(220,250,255,0.95)'; cx.fillRect(ox - (w >> 1), oy - 12 + y, w, 1);
    gx.fillStyle = 'rgba(120,235,255,0.9)'; gx.fillRect(ox - (w >> 1), oy - 12 + y, w, 1);
  }
  const mask = new OffscreenCanvas(1, 1);
  const spr: Sprite = { ox: world.fountainJet.x - ox, oy: world.fountainJet.y - oy, w: W, h: H, img: cv, mask, glow: gl };
  return { id: 'jatos', kind: 'jatos', fp: [12.45, 13.45, 12.56, 13.56], layer: 1, sprite: spr, group: 'civic', lights: [] };
}

function flagObj(k: number, f: { x: number; y: number; big: boolean; i: number; j: number }, t: number): Obj {
  const W = f.big ? 18 : 13, H = f.big ? 11 : 8;
  const cv = new OffscreenCanvas(W + 1, H + 4), c = cv.getContext('2d')!;
  for (let x = 0; x < W; x++) {
    const wave = Math.round(Math.sin(x * 0.55 - t * 7 + k) * 1.3 * (x / W));
    const shade = 0.85 + 0.15 * Math.sin(x * 0.55 - t * 7 + k + 1.2);
    for (let y = 0; y < H; y++) {
      let col = [106, 63, 208];
      const cxp = W * 0.34, cyp = H / 2;
      if (Math.abs(x - cxp) + Math.abs(y - cyp) < (f.big ? 3.5 : 2.5)) col = [255, 214, 74];
      if (y >= H - 2) col = [245, 245, 250];
      c.fillStyle = `rgb(${col.map((v) => Math.round(v * shade)).join(',')})`;
      c.fillRect(x + 1, y + 1 + wave, 1, 1);
    }
  }
  const spr: Sprite = { ox: f.x, oy: f.y - 1, w: W + 1, h: H + 4, img: cv, mask: new OffscreenCanvas(1, 1), glow: null };
  const fp: [number, number, number, number] = [f.i - 0.03, f.j - 0.03, f.i + 0.04, f.j + 0.04];
  return { id: `flag${k}`, kind: 'bandeira', fp, layer: 1, sprite: spr, group: 'none', lights: [] };
}

function signalObj(k: number, s: { x: number; y: number; phase: number; i: number; j: number }, t: number): Obj {
  const cyc = ((t + s.phase * 4 + k * 0.7) % 8 + 8) % 8;
  const state = cyc < 4 ? 2 : cyc < 5 ? 1 : 0; // 0 vermelho, 1 amarelo, 2 verde
  const cv = new OffscreenCanvas(3, 8), c = cv.getContext('2d')!;
  const gl = new OffscreenCanvas(3, 8), g = gl.getContext('2d')!;
  const cols = ['#ff3b3b', '#ffb12b', '#5dff7c'];
  for (let q = 0; q < 3; q++) {
    c.fillStyle = q === state ? cols[q] : '#2a2a34'; c.fillRect(1, 1 + q * 2, 1, 1);
    if (q === state) { g.fillStyle = cols[q]; g.fillRect(1, 1 + q * 2, 1, 1); }
  }
  const spr: Sprite = { ox: Math.round(s.x) - 1, oy: Math.round(s.y) - 1, w: 3, h: 8, img: cv, mask: new OffscreenCanvas(1, 1), glow: gl };
  const col = hex(cols[state]);
  return { id: `sig${k}`, kind: 'semaforo-luz', fp: [s.i - 0.05, s.j - 0.05, s.i + 0.06, s.j + 0.06], layer: 1, sprite: spr, group: 'street', lights: [{ x: s.x, y: s.y + 2 + state * 2, r: 0.18, color: col, a: 0.9, kind: 'halo' }] };
}

function craneObjs(world: World, t: number): Obj[] {
  const out: Obj[] = [];
  const on = (t % 1.6) < 0.8;
  const ct = world.craneTop;
  // posição do carrinho ao longo da lança (lança corre ao longo de -i a partir do mastro)
  const mastI = world.craneMast.i, mastJ = world.craneMast.j;
  const ti = mastI - 1.3 - 2.4 * (0.5 + 0.5 * Math.sin(t * 0.35));
  const X = sx(ti, mastJ), Ytop = sy(ti, mastJ, 150), Yload = sy(ti, mastJ, 92 + 8 * Math.sin(t * 0.5));
  const h = Math.max(4, Math.round(Yload - Ytop) + 6);
  const cv = new OffscreenCanvas(10, h), c = cv.getContext('2d')!;
  c.fillStyle = '#20222c'; c.fillRect(4, 0, 1, h - 5);
  c.fillStyle = '#8a8f9c'; c.fillRect(3, 0, 3, 2);
  c.fillStyle = '#b4573a'; c.fillRect(1, h - 5, 8, 4); c.fillStyle = '#7a3a28'; c.fillRect(1, h - 2, 8, 1);
  out.push({ id: 'grua-carga', kind: 'carga', fp: [ti - 0.05, mastJ - 0.05, ti + 0.05, mastJ + 0.05], layer: 1, sprite: { ox: Math.round(X) - 4, oy: Math.round(Ytop), w: 10, h, img: cv, mask: new OffscreenCanvas(1, 1), glow: null }, group: 'none', lights: [] });
  if (on) out.push({ id: 'grua-luz', kind: 'luz', fp: [mastI - 0.01, mastJ - 0.01, mastI + 0.01, mastJ + 0.01], layer: 1, sprite: { ox: 0, oy: 0, w: 1, h: 1, img: new OffscreenCanvas(1, 1), mask: new OffscreenCanvas(1, 1), glow: null }, group: 'civic', lights: [{ x: ct.x, y: ct.y, r: 0.4, color: E.red, a: 1, kind: 'halo' }] });
  return out;
}
void scale; void oid;
