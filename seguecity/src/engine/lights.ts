// Sprites de luz pontilhados (poças elípticas no chão e halos redondos), em cache por cor e raio.
import { bayer, cr, cg, cb, type U32 } from './color';

const cache = new Map<string, OffscreenCanvas>();
const LEVELS = 5;

export function lightSprite(kind: 'pool' | 'halo', rTiles: number, color: U32): OffscreenCanvas {
  const rx = Math.max(2, Math.round(kind === 'pool' ? rTiles * 22.6 : rTiles * 16));
  const ry = kind === 'pool' ? Math.max(1, Math.round(rx / 2)) : rx;
  const key = `${kind}:${rx}:${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const w = rx * 2 + 1, h = ry * 2 + 1;
  const cv = new OffscreenCanvas(w, h);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - rx) / rx, dy = (y - ry) / ry;
      const r2 = dx * dx + dy * dy;
      if (r2 >= 1) continue;
      let f = (1 - r2) * (1 - r2);
      if (kind === 'halo') f = Math.pow(1 - Math.sqrt(r2), 1.8);
      // quantiza em níveis com pontilhado ordenado (visual 16-bit)
      const q = f * LEVELS;
      let lv = Math.floor(q);
      if (q - lv > bayer(x, y)) lv++;
      const k = lv / LEVELS;
      if (k <= 0) continue;
      const o = (y * w + x) * 4;
      d[o] = cr(color) * k; d[o + 1] = cg(color) * k; d[o + 2] = cb(color) * k; d[o + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  cache.set(key, cv);
  return cv;
}
