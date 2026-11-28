// Céu em espaço de tela (pixel de 4 px na saída): degradê pontilhado, estrelas que piscam, lua e nuvens.
import { bayer, hex, mix, cr, cg, cb, type U32 } from './color';
import { hash2, mulberry32, vnoise } from './rng';

const SW = 270, SH = 480; // resolução do céu (x4 = 1080x1920)

const NIGHT = ['#050817', '#0b1130', '#151d4a', '#2a2462', '#4a2c6c'].map((h) => hex(h));
const DUSK = ['#16224f', '#33356e', '#6b4a86', '#c0667a', '#f0a15e'].map((h) => hex(h));
const DAY = ['#2e62c2', '#3f7bd6', '#5d98e0', '#87b9ea', '#bfe0f2'].map((h) => hex(h));
const DAWN = ['#26305e', '#4a4c8c', '#9a6496', '#ee9478', '#ffd59a'].map((h) => hex(h));

function stops(night: number, dawn = 0): U32[] {
  // night: 0 = dia, 0.5 = entardecer/pôr do sol, 1 = noite; dawn: 0..1 mistura para o amanhecer
  let base: U32[];
  if (night >= 0.5) { const t = (night - 0.5) * 2; base = NIGHT.map((c, k) => mix(DUSK[k], c, t)); }
  else { const t = night * 2; base = DAY.map((c, k) => mix(c, DUSK[k], t)); }
  return dawn > 0 ? base.map((c, k) => mix(c, DAWN[k], dawn)) : base;
}

const skyCache = new Map<number, OffscreenCanvas>();
function skyBase(night: number, dawn = 0): OffscreenCanvas {
  const key = Math.round(night * 40) * 100 + Math.round(dawn * 40);
  const hit = skyCache.get(key);
  if (hit) return hit;
  const st = stops(Math.round(night * 40) / 40, Math.round(dawn * 40) / 40);
  const cv = new OffscreenCanvas(SW, SH);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(SW, SH);
  const d = new Uint32Array(img.data.buffer);
  for (let y = 0; y < SH; y++) {
    const f = Math.pow(y / (SH - 1), 1.1) * (st.length - 1);
    for (let x = 0; x < SW; x++) {
      // pontilhado entre faixas
      let q = f + (vnoise(x * 0.04, y * 0.04, 3) - 0.5) * 0.25;
      let k = Math.floor(q);
      if (q - k > bayer(x, y)) k++;
      d[y * SW + x] = st[Math.max(0, Math.min(st.length - 1, k))];
    }
  }
  ctx.putImageData(img, 0, 0);
  skyCache.set(key, cv);
  return cv;
}

const rnd = mulberry32(42);
const STARS = Array.from({ length: 260 }, () => ({ x: rnd(), y: Math.pow(rnd(), 1.4) * 0.75, b: rnd(), ph: rnd() * 6.28, sp: 0.6 + rnd() * 2.2 }));

let moon: OffscreenCanvas | null = null;
function moonSprite() {
  if (moon) return moon;
  const R = 15, S = R * 2 + 3;
  const cv = new OffscreenCanvas(S, S);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const d = new Uint32Array(img.data.buffer);
  const ramp = ['#9c8fb0', '#c9bfcf', '#e7dfd7', '#fbf4e2', '#fffbef'].map((h) => hex(h));
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x - R - 1, dy = y - R - 1;
      const r = Math.hypot(dx, dy);
      if (r > R) continue;
      // iluminada de cima à esquerda, crateras
      let s = 0.55 + (-dx - dy) / (R * 3) + (vnoise(x * 0.35, y * 0.35, 8) - 0.5) * 0.35;
      const cr1 = Math.hypot(dx + 4, dy - 3), cr2 = Math.hypot(dx - 5, dy + 5), cr3 = Math.hypot(dx - 2, dy - 7);
      if (cr1 < 3.5 || cr2 < 2.5 || cr3 < 2) s -= 0.25;
      if (r > R - 1.2) s -= 0.2;
      let k = Math.floor(s * (ramp.length - 1));
      if (s * (ramp.length - 1) - k > bayer(x, y)) k++;
      d[y * S + x] = ramp[Math.max(0, Math.min(ramp.length - 1, k))];
    }
  ctx.putImageData(img, 0, 0);
  moon = cv;
  return cv;
}

let clouds: OffscreenCanvas[] | null = null;
function cloudSprites() {
  if (clouds) return clouds;
  clouds = [0, 1, 2].map((s) => {
    const W = 90 + s * 20, H = 26;
    const cv = new OffscreenCanvas(W, H);
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(W, H);
    const d = new Uint32Array(img.data.buffer);
    const body = hex('#2a2650'), rim = hex('#5a4f8a'), dark = hex('#1d1a3c');
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const nx = (x / W) * 2 - 1, ny = (y / H) * 2 - 1;
        const v = vnoise(x * 0.07, y * 0.1, 20 + s) * 0.9 + 0.35 - (nx * nx * 0.9 + Math.max(0, ny) * ny * 1.6 + Math.max(0, -ny) * 0.6);
        if (v < 0.25) continue;
        const top = vnoise(x * 0.07, (y - 2) * 0.1, 20 + s) * 0.9 + 0.35 - (nx * nx * 0.9 + Math.max(0, (y - 2) / H * 2 - 1) * 1.6) < 0.25;
        d[y * W + x] = top ? rim : y > H * 0.62 ? dark : body;
      }
    ctx.putImageData(img, 0, 0);
    return cv;
  });
  return clouds;
}

export function drawSky(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, W: number, H: number, night: number, t: number, panX = 0, dawn = 0, panY = 0) {
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(skyBase(night, dawn), 0, 0, W, H);
  const px = W / SW;
  // sol nascendo no horizonte (amanhecer)
  if (dawn > 0.05) {
    const sxp = W * 0.24, syp = H * (0.6 - dawn * 0.12) + panY * 0.0;
    const g = ctx.createRadialGradient(sxp, syp, 0, sxp, syp, px * 110);
    g.addColorStop(0, `rgba(255,236,190,${0.75 * dawn})`); g.addColorStop(0.25, `rgba(255,190,130,${0.35 * dawn})`); g.addColorStop(1, 'rgba(255,170,120,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(255,244,214,${dawn})`;
    for (let y = -6; y <= 6; y++) { const w = Math.round(Math.sqrt(Math.max(0, 36 - y * y))); ctx.fillRect(Math.round(sxp / px - w) * px, Math.round(syp / px + y) * px, w * 2 * px, px); }
  }
  const starA = Math.max(0, (night - 0.55) / 0.45) * (1 - dawn);
  if (starA > 0) {
    for (let k = 0; k < STARS.length; k++) {
      const s = STARS[k];
      const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      const a = starA * (0.3 + 0.7 * s.b) * tw;
      if (a < 0.08) continue;
      const x = Math.floor((((s.x - panX * 0.00003) % 1) + 1) % 1 * SW) * px, y = Math.floor(s.y * SH) * px;
      ctx.fillStyle = `rgba(255,${240 + 15 * s.b},${220 + 35 * s.b},${a.toFixed(3)})`;
      ctx.fillRect(x, y, px, px);
      if (s.b > 0.93) {
        ctx.fillStyle = `rgba(200,220,255,${(a * 0.5).toFixed(3)})`;
        ctx.fillRect(x - px, y, px, px); ctx.fillRect(x + px, y, px, px); ctx.fillRect(x, y - px, px, px); ctx.fillRect(x, y + px, px, px);
      }
    }
    const m = moonSprite();
    ctx.globalAlpha = starA;
    // halo da lua
    const mx = W * 0.8, my = H * 0.135;
    const g = ctx.createRadialGradient(mx, my, 0, mx, my, px * 40);
    g.addColorStop(0, 'rgba(255,240,210,0.35)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g; ctx.fillRect(mx - px * 40, my - px * 40, px * 80, px * 80);
    ctx.drawImage(m, Math.round(mx - (m.width * px) / 2), Math.round(my - (m.height * px) / 2), m.width * px, m.height * px);
    ctx.globalAlpha = 1;
  }
  const cs = cloudSprites();
  const ca = 0.35 + 0.5 * night;
  ctx.globalAlpha = ca;
  for (let k = 0; k < 5; k++) {
    const c = cs[k % 3];
    const speed = 1.5 + k * 0.7;
    const x = ((hash2(k, 3) * SW + t * speed - panX * 0.0002 * SW) % (SW + c.width)) - c.width;
    const y = (0.08 + hash2(k, 4) * 0.3) * SH;
    ctx.drawImage(c, Math.round(x) * px, Math.round(y) * px, c.width * px, c.height * px);
  }
  ctx.globalAlpha = 1;
}

export function ambientFor(night: number, dawn = 0): [number, number, number] {
  const a = ambientBase(night);
  const d: [number, number, number] = [0.8, 0.66, 0.76];
  return dawn > 0 ? (a.map((v, k) => v + (d[k] - v) * dawn) as [number, number, number]) : a;
}
function ambientBase(night: number): [number, number, number] {
  // multiplicador de luz ambiente (0..1) por canal
  const day: [number, number, number] = [1, 1, 1];
  const dusk: [number, number, number] = [0.86, 0.66, 0.72];
  const nightC: [number, number, number] = [0.29, 0.33, 0.57];
  const lerp = (a: number[], b: number[], t: number) => a.map((v, k) => v + (b[k] - v) * t) as [number, number, number];
  return night < 0.5 ? lerp(day, dusk, night * 2) : lerp(dusk, nightC, (night - 0.5) * 2);
}
void cr; void cg; void cb;
