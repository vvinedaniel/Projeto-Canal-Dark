// Trânsito coerente: circuitos fechados em mão dupla (mão direita), curvas suaves nas esquinas,
// semáforos com ciclos por eixo (carros param no vermelho e formam fila) e ônibus com paradas.
// Determinístico: a simulação sempre parte de t = 0 em passos de 1/30 s e fica em cache por quadro,
// então o estado em t é o mesmo em qualquer ordem de render.
import type { VKind } from './sprites/vehicles';

type Hd = '+i' | '-i' | '+j' | '-j';
const LANE = 0.18, R = 0.3;
interface Seg { kind: 'line' | 'arc'; a: [number, number]; b: [number, number]; c?: [number, number]; len: number; s0: number; hd0: Hd; hd1: Hd }
export interface Path { segs: Seg[]; len: number }

const DIR: Record<Hd, [number, number]> = { '+i': [1, 0], '-i': [-1, 0], '+j': [0, 1], '-j': [0, -1] };

function makePath(corners: [number, number][], reverse = false): Path {
  const c = reverse ? [...corners].reverse() : corners;
  const n = c.length;
  const hd: Hd[] = [];
  for (let k = 0; k < n; k++) { const a = c[k], b = c[(k + 1) % n]; hd.push(b[0] !== a[0] ? (b[0] > a[0] ? '+i' : '-i') : b[1] > a[1] ? '+j' : '-j'); }
  const laneJ = (k: number) => c[k][1] + 0.5 + (hd[k] === '+i' ? LANE : -LANE);
  const laneI = (k: number) => c[k][0] + 0.5 + (hd[k] === '+j' ? -LANE : LANE);
  const P: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const prev = (k + n - 1) % n;
    const segI = hd[k][1] === 'i' ? k : prev, segJ = hd[k][1] === 'j' ? k : prev;
    P.push([laneI(segJ), laneJ(segI)]);
  }
  const segs: Seg[] = [];
  let s = 0;
  for (let k = 0; k < n; k++) {
    const d = DIR[hd[k]], dn = DIR[hd[(k + 1) % n]];
    const p0 = P[k], p1 = P[(k + 1) % n];
    const a: [number, number] = [p0[0] + d[0] * R, p0[1] + d[1] * R];
    const b: [number, number] = [p1[0] - d[0] * R, p1[1] - d[1] * R];
    const len = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    segs.push({ kind: 'line', a, b, len, s0: s, hd0: hd[k], hd1: hd[k] }); s += len;
    const e: [number, number] = [p1[0] + dn[0] * R, p1[1] + dn[1] * R];
    const cc: [number, number] = [b[0] + dn[0] * R, b[1] + dn[1] * R];
    const al = (Math.PI * R) / 2;
    segs.push({ kind: 'arc', a: b, b: e, c: cc, len: al, s0: s, hd0: hd[k], hd1: hd[(k + 1) % n] }); s += al;
  }
  return { segs, len: s };
}

export function pathAt(p: Path, s: number) {
  s = ((s % p.len) + p.len) % p.len;
  let k = 0;
  while (k < p.segs.length - 1 && p.segs[k + 1].s0 <= s) k++;
  const g = p.segs[k];
  const f = Math.min(1, (s - g.s0) / (g.len || 1));
  if (g.kind === 'line') return { i: g.a[0] + (g.b[0] - g.a[0]) * f, j: g.a[1] + (g.b[1] - g.a[1]) * f, hd: g.hd0 };
  const c = g.c!;
  const a0 = Math.atan2(g.a[1] - c[1], g.a[0] - c[0]), a1 = Math.atan2(g.b[1] - c[1], g.b[0] - c[0]);
  let da = a1 - a0; if (da > Math.PI) da -= 2 * Math.PI; if (da < -Math.PI) da += 2 * Math.PI;
  const ang = a0 + da * f;
  return { i: c[0] + Math.cos(ang) * R, j: c[1] + Math.sin(ang) * R, hd: f < 0.5 ? g.hd0 : g.hd1 };
}

const PATHS = {
  A: makePath([[3, 3], [20, 3], [20, 24], [3, 24]]),
  Ar: makePath([[3, 3], [20, 3], [20, 24], [3, 24]], true),
  B: makePath([[9, 10], [15, 10], [15, 17], [9, 17]]),
  Br: makePath([[9, 10], [15, 10], [15, 17], [9, 17]], true),
  C: makePath([[20, 10], [30, 10], [30, 24], [20, 24]]),
  Cr: makePath([[20, 10], [30, 10], [30, 24], [20, 24]], true),
  D: makePath([[3, 10], [9, 10], [9, 24], [3, 24]]),
  E: makePath([[3, 24], [20, 24], [20, 28], [3, 28]], true),
};
type PathId = keyof typeof PATHS;

// ---------- semáforos (cruzamentos com sinal) ----------
export const SIGNALS: [number, number][] = [[9, 10], [15, 10], [9, 17], [15, 17], [20, 10], [20, 24]];
const CYCLE = 9;
// estado do sinal para o eixo ('i' ou 'j') no cruzamento k: 'g' verde, 'y' amarelo, 'r' vermelho
export function signalState(k: number, axis: 'i' | 'j', t: number): 'g' | 'y' | 'r' {
  const c = (((t + k * 1.37) % CYCLE) + CYCLE) % CYCLE;
  if (axis === 'i') return c < 3.8 ? 'g' : c < 4.6 ? 'y' : 'r';
  return c >= 5.0 && c < 8.2 ? 'g' : c >= 8.2 ? 'y' : 'r';
}

// pontos de parada (linha de retenção) de cada circuito, antes de cada cruzamento com sinal
const STOPS: Record<string, { s: number; k: number; axis: 'i' | 'j' }[]> = {};
for (const id of Object.keys(PATHS) as PathId[]) {
  const p = PATHS[id];
  const list: { s: number; k: number; axis: 'i' | 'j' }[] = [];
  for (const g of p.segs) {
    if (g.kind !== 'line') continue;
    const axis = g.hd0[1] as 'i' | 'j';
    const sign = g.hd0[0] === '+' ? 1 : -1;
    SIGNALS.forEach(([ti, tj], k) => {
      const ci = ti + 0.5, cj = tj + 0.5;
      if (axis === 'i' && Math.abs(g.a[1] - cj) < 0.5) {
        const sAt = g.s0 + (ci - g.a[0]) * sign - 0.95;
        if (sAt > g.s0 - 0.01 && sAt < g.s0 + g.len) list.push({ s: sAt, k, axis });
      }
      if (axis === 'j' && Math.abs(g.a[0] - ci) < 0.5) {
        const sAt = g.s0 + (cj - g.a[1]) * sign - 0.95;
        if (sAt > g.s0 - 0.01 && sAt < g.s0 + g.len) list.push({ s: sAt, k, axis });
      }
    });
  }
  STOPS[id] = list.sort((a, b) => a.s - b.s);
}

// ---------- frota ----------
export interface Vehicle { id: string; path: PathId; s0: number; v: number; kind: VKind; color: number; rank: number; busStops?: number[] }
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const r = rng(777);
export const FLEET: Vehicle[] = [];
const add = (path: PathId, kinds: VKind[], v: number) => {
  const L = PATHS[path].len, off = r() * L;
  kinds.forEach((kind, k) => FLEET.push({ id: `${path}${k}`, path, s0: off + (k * L) / kinds.length, v: kind === 'moto' ? v * 1.1 : v, kind, color: Math.floor(r() * 10), rank: r() }));
};
add('A', ['car', 'moto', 'taxi', 'car', 'car'], 1.55);
add('Ar', ['truck', 'car', 'manutencao'], 1.35);
add('Br', ['car', 'moto'], 1.3);
add('C', ['police', 'car', 'car'], 1.5);
add('Cr', ['car', 'bombeiros'], 1.4);
add('D', ['car', 'car'], 1.35);
add('E', ['moto', 'car'], 1.2);
// ônibus no circuito B com duas paradas (ponto da praça e ponto da rua 17)
const busPath = PATHS.B;
const nearestS = (p: Path, i: number, j: number) => { let best = 0, bd = 1e9; for (let s = 0; s < p.len; s += 0.05) { const q = pathAt(p, s); const d = Math.hypot(q.i - i, q.j - j); if (d < bd) { bd = d; best = s; } } return best; };
FLEET.push({ id: 'bus', path: 'B', s0: 3, v: 1.0, kind: 'bus', color: 0, rank: 0, busStops: [nearestS(busPath, 9.7, 12.6), nearestS(busPath, 12.5, 17.32)] });

// ---------- simulação ----------
const FPS = 30, ACC = 2.4, BRAKE = 4.5, GAP = 0.85;
const cache: Float32Array[] = []; // por quadro: s e v de cada veículo (2 por veículo)
const dwell = new Float32Array(FLEET.length);
let dwellAt: number[] = FLEET.map(() => -1);
function step(prev: Float32Array, t: number): Float32Array {
  const next = new Float32Array(prev.length);
  const dt = 1 / FPS;
  for (let k = 0; k < FLEET.length; k++) {
    const veh = FLEET[k];
    const L = PATHS[veh.path].len;
    let s = prev[k * 2], v = prev[k * 2 + 1];
    let vmax = veh.v;
    // semáforo à frente
    for (const st of STOPS[veh.path]) {
      let d = st.s - (s % L); if (d < -0.05) d += L;
      if (d > 2.2) continue;
      const state = signalState(st.k, st.axis, t);
      if (state === 'g' || (state === 'y' && d < 0.35)) break;
      vmax = Math.min(vmax, Math.sqrt(2 * BRAKE * Math.max(0, d - 0.02)));
      break;
    }
    // carro da frente no mesmo circuito
    let gap = 1e9;
    for (let q = 0; q < FLEET.length; q++) {
      if (q === k || FLEET[q].path !== veh.path) continue;
      let d = (prev[q * 2] % L) - (s % L); if (d <= 0) d += L;
      gap = Math.min(gap, d - GAP);
    }
    vmax = Math.min(vmax, Math.sqrt(2 * BRAKE * Math.max(0, gap)));
    // paradas de ônibus
    if (veh.busStops) {
      if (dwell[k] > 0) { dwell[k] -= dt; vmax = 0; }
      else for (let q = 0; q < veh.busStops.length; q++) {
        let d = veh.busStops[q] - (s % L); if (d < -0.05) d += L;
        if (d < 0.02 && dwellAt[k] !== q) { dwell[k] = 2.2; dwellAt[k] = q; vmax = 0; break; }
        if (d < 1.5 && dwellAt[k] !== q) vmax = Math.min(vmax, Math.sqrt(2 * BRAKE * Math.max(0, d)) + 0.05);
      }
    }
    v = v < vmax ? Math.min(vmax, v + ACC * dt) : Math.max(vmax, v - BRAKE * 1.5 * dt);
    s += v * dt;
    next[k * 2] = s; next[k * 2 + 1] = v;
  }
  return next;
}
function stateAt(frame: number): Float32Array {
  if (!cache.length) {
    const f0 = new Float32Array(FLEET.length * 2);
    FLEET.forEach((veh, k) => { f0[k * 2] = veh.s0; f0[k * 2 + 1] = veh.v; });
    cache.push(f0);
    dwell.fill(0); dwellAt = FLEET.map(() => -1);
  }
  while (cache.length <= frame) cache.push(step(cache[cache.length - 1], (cache.length - 1) / FPS));
  return cache[frame];
}

export interface VehState { veh: Vehicle; i: number; j: number; hd: Hd; v: number }
export function vehiclesAt(t: number): VehState[] {
  const st = stateAt(Math.max(0, Math.round(t * FPS)));
  return FLEET.map((veh, k) => { const q = pathAt(PATHS[veh.path], st[k * 2]); return { veh, i: q.i, j: q.j, hd: q.hd, v: st[k * 2 + 1] }; });
}
