// Efeitos determinísticos (função do tempo) desenhados na camada de 270x480.
import { mulberry32, hash2 } from '../../engine/rng';
import { clamp, easeOut, smooth } from '../../utils/easing';

type Ctx = CanvasRenderingContext2D;
const px = (c: Ctx, x: number, y: number, col: string, s = 1) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), s, s); };

// --- fogos de artifício sobre a cidade
const FW_COLS = [['#ffd84a', '#fff3a0'], ['#ff5aa8', '#ffc0e0'], ['#5af2ff', '#d0fbff'], ['#6bff8a', '#d8ffe0'], ['#b48aff', '#e8dcff'], ['#ff8a3a', '#ffd9b0']];
export function fireworks(c: Ctx, t: number, t0: number, t1: number, seed = 7) {
  const r = mulberry32(seed);
  const bursts: { at: number; x: number; y: number; col: string[]; n: number; R: number }[] = [];
  let at = t0;
  while (at < t1) { bursts.push({ at, x: 30 + r() * 210, y: 50 + r() * 120, col: FW_COLS[Math.floor(r() * FW_COLS.length)], n: 40 + Math.floor(r() * 24), R: 34 + r() * 30 }); at += 0.22 + r() * 0.32; }
  for (const b of bursts) {
    const dt = t - b.at;
    if (dt < -0.7 || dt > 1.8) continue;
    if (dt < 0) {
      // subida com rastro
      const f = 1 + dt / 0.7;
      const y = 470 - (470 - b.y) * easeOut(f);
      for (let k = 0; k < 6; k++) px(c, b.x + Math.sin((y + k) * 0.3) * 0.6, y + k * 2, k === 0 ? '#fff6d0' : `rgba(255,200,120,${0.6 - k * 0.1})`);
      continue;
    }
    const life = dt / 1.8;
    for (let k = 0; k < b.n; k++) {
      const a = (k / b.n) * Math.PI * 2 + hash2(k, b.at * 10) * 0.3;
      const sp = b.R * (0.75 + hash2(k, 3, b.at * 10) * 0.35);
      const d = sp * easeOut(Math.min(1, dt / 0.9));
      const x = b.x + Math.cos(a) * d, y = b.y + Math.sin(a) * d * 0.9 + dt * dt * 14;
      if (hash2(k, Math.floor(t * 20)) < life * 0.8) continue; // cintilar ao apagar
      px(c, x, y, life < 0.3 ? b.col[1] : b.col[0], life < 0.45 ? 2 : 1);
      if (life < 0.6) { px(c, x - Math.cos(a) * 3, y - Math.sin(a) * 3, b.col[0]); px(c, x - Math.cos(a) * 6, y - Math.sin(a) * 6, b.col[0]); }
    }
    if (dt < 0.15) { c.fillStyle = `rgba(255,255,230,${0.7 - dt * 4})`; c.beginPath(); c.arc(b.x, b.y, 12, 0, 7); c.fill(); }
  }
}

// --- brilho de materialização em volta de um ponto (x, y em px da camada)
export function sparkles(c: Ctx, x: number, y: number, t: number, t0: number, dur = 1.4, col = '#5af2ff') {
  const dt = t - t0;
  if (dt < 0 || dt > dur) return;
  const f = dt / dur;
  for (let k = 0; k < 22; k++) {
    const a = k * 2.4 + dt * 3;
    const rr = 4 + (1 - f) * 14 * hash2(k, 5);
    const yy = y - 6 - (dt * 18 * hash2(k, 9)) % 22;
    const on = hash2(k, Math.floor(t * 15)) > 0.35;
    if (!on) continue;
    const sx = x + Math.cos(a) * rr, sy = yy + Math.sin(a) * rr * 0.4;
    px(c, sx, sy, k % 3 === 0 ? '#ffffff' : col);
    if (k % 5 === 0) { px(c, sx - 1, sy, col); px(c, sx + 1, sy, col); px(c, sx, sy - 1, col); px(c, sx, sy + 1, col); }
  }
  // coluna de luz
  const a = Math.sin(Math.PI * clamp(f * 1.3)) * 0.55;
  c.fillStyle = `rgba(120,240,255,${a})`;
  c.fillRect(Math.round(x) - 3, Math.round(y) - 30, 7, 30);
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.fillRect(Math.round(x) - 1, Math.round(y) - 30, 3, 30);
}

// --- poeira de prédio brotando (em volta da base)
export function dust(c: Ctx, x: number, y: number, w: number, t: number, t0: number, dur = 1.3) {
  const dt = t - t0;
  if (dt < 0 || dt > dur) return;
  const f = dt / dur;
  for (let k = 0; k < 18; k++) {
    const side = k % 2 ? 1 : -1;
    const ox = side * (w * 0.5 + f * 10 * hash2(k, 2)) + (hash2(k, 4) - 0.5) * w;
    const oy = -f * 8 * hash2(k, 7);
    const s = 2 + Math.round((1 - f) * 3 * hash2(k, 8));
    c.fillStyle = `rgba(190,170,150,${0.75 * (1 - f)})`;
    c.fillRect(Math.round(x + ox), Math.round(y + oy), s, s);
  }
}

// --- holofotes varrendo o céu a partir de um ponto
export function searchlights(c: Ctx, x: number, y: number, t: number, a: number) {
  if (a <= 0) return;
  for (const [ph, sp] of [[0, 0.7], [2.2, -0.55]] as const) {
    const ang = -Math.PI / 2 + Math.sin(t * sp + ph) * 0.55;
    const len = 520;
    const w = 0.07;
    const g = c.createLinearGradient(x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    g.addColorStop(0, `rgba(255,245,200,${0.32 * a})`); g.addColorStop(1, 'rgba(255,245,200,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(ang - w) * len, y + Math.sin(ang - w) * len);
    c.lineTo(x + Math.cos(ang + w) * len, y + Math.sin(ang + w) * len);
    c.closePath();
    c.fill();
  }
}

// --- marcadores holográficos (ícone sobre um ponto, com haste e brilho)
const ICON: Record<string, string[]> = {
  person: ['..###..', '..###..', '...#...', '.#####.', '#.###.#', '..###..', '..#.#..', '..#.#..'],
  job: ['..###..', '..#.#..', '#######', '#.....#', '###.###', '#.....#', '#######'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
};
export function marker(c: Ctx, x: number, y: number, t: number, a: number, kind: 'person' | 'job' | 'heart' = 'person', col = '#5af2ff', seed = 0) {
  if (a <= 0.01) return;
  const s = easeOut(clamp(a));
  const bob = Math.round(Math.sin(t * 3 + seed) * 1.2);
  const ic = ICON[kind];
  const h = ic.length, w = ic[0].length;
  const ox = Math.round(x - w / 2), oy = Math.round(y - 12 - h - (1 - s) * 6 + bob);
  c.globalAlpha = clamp(a * 1.5) * (0.82 + 0.18 * Math.sin(t * 6 + seed));
  // haste
  c.fillStyle = col; c.fillRect(Math.round(x), oy + h + 1, 1, Math.max(0, Math.round(y) - (oy + h + 1)));
  // moldura do balão
  c.fillStyle = 'rgba(8,20,40,0.75)'; c.fillRect(ox - 2, oy - 2, w + 4, h + 4);
  c.fillStyle = col; c.fillRect(ox - 2, oy - 2, w + 4, 1); c.fillRect(ox - 2, oy + h + 1, w + 4, 1); c.fillRect(ox - 2, oy - 2, 1, h + 4); c.fillRect(ox + w + 1, oy - 2, 1, h + 4);
  for (let r = 0; r < h; r++) for (let q = 0; q < w; q++) if (ic[r][q] === '#') { c.fillStyle = r === 0 && (Math.floor(t * 8) % 4 === 0) ? '#ffffff' : col; c.fillRect(ox + q, oy + r, 1, 1); }
  c.globalAlpha = 1;
}

// --- falha digital curta (pessoas "desligando")
export function glitch(c: Ctx, t: number, t0: number, dur = 0.25) {
  const dt = t - t0;
  if (dt < 0 || dt > dur) return;
  const f = 1 - dt / dur;
  for (let k = 0; k < 14; k++) {
    const y = Math.floor(hash2(k, Math.floor(t * 30)) * 480);
    const h = 1 + Math.floor(hash2(k, 3, Math.floor(t * 30)) * 4);
    c.fillStyle = k % 3 === 0 ? `rgba(90,242,255,${0.35 * f})` : k % 3 === 1 ? `rgba(255,90,168,${0.3 * f})` : `rgba(255,255,255,${0.18 * f})`;
    c.fillRect(0, y, 270, h);
  }
}
void smooth;

// --- seleção de lote: contorno isométrico pulsante (cantos em px da camada)
export function selection(c: Ctx, corners: { x: number; y: number }[], t: number, a: number, col = '#ffd84a') {
  if (a <= 0.01) return;
  c.globalAlpha = Math.min(1, a) * (0.75 + 0.25 * Math.sin(t * 10));
  c.fillStyle = col;
  for (let k = 0; k < 4; k++) {
    const p = corners[k], q = corners[(k + 1) % 4];
    const n = Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y)));
    for (let s = 0; s <= n; s++) {
      if (((s + Math.floor(t * 12)) % 4) === 3) continue; // tracejado correndo
      c.fillRect(Math.round(p.x + ((q.x - p.x) * s) / n), Math.round(p.y + ((q.y - p.y) * s) / n), 1, 1);
    }
  }
  // cantos em destaque
  for (const p of corners) c.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3);
  c.globalAlpha = 1;
}

// --- transição de jogo: ladrilhos em diagonal cobrem a tela até o corte (tc) e descobrem depois
export function tileWipe(c: Ctx, t: number, tc: number, half = 0.16, col = '#0b0d26', edge = '#7a4ee0') {
  const dt = t - tc;
  if (Math.abs(dt) > half) return;
  const S = 18;
  for (let y = 0; y < 480; y += S)
    for (let x = 0; x < 270; x += S) {
      const d = (x / 270 + y / 480) / 2; // 0..1 na diagonal
      const f = dt < 0 ? clamp((dt + half) / half * 1.6 - d * 0.6) : 1 - clamp(dt / half * 1.6 - d * 0.6);
      if (f <= 0) continue;
      const s = Math.round(S * f);
      const ox = x + (S - s) / 2, oy = y + (S - s) / 2;
      c.fillStyle = col; c.fillRect(Math.round(ox), Math.round(oy), s, s);
      if (s > 3) { c.fillStyle = edge; c.fillRect(Math.round(ox), Math.round(oy), s, 1); c.fillRect(Math.round(ox), Math.round(oy), 1, s); }
    }
}
