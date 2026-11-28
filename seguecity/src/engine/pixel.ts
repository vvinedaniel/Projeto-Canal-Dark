import type { U32 } from './color';

// Buffer de pixels com origem no mundo: set(x, y) recebe coordenadas de mundo (px).
export class PB {
  data: Uint32Array;
  constructor(public w: number, public h: number, public ox = 0, public oy = 0) {
    this.data = new Uint32Array(Math.max(1, w * h));
  }
  inside(x: number, y: number) {
    const lx = x - this.ox, ly = y - this.oy;
    return lx >= 0 && ly >= 0 && lx < this.w && ly < this.h;
  }
  set(x: number, y: number, c: U32) {
    const lx = (x | 0) - this.ox, ly = (y | 0) - this.oy;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return;
    this.data[ly * this.w + lx] = c;
  }
  get(x: number, y: number): U32 {
    const lx = (x | 0) - this.ox, ly = (y | 0) - this.oy;
    if (lx < 0 || ly < 0 || lx >= this.w || ly >= this.h) return 0;
    return this.data[ly * this.w + lx];
  }
  rect(x: number, y: number, w: number, h: number, c: U32) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c);
  }
  toCanvas(): OffscreenCanvas {
    const cv = new OffscreenCanvas(this.w, this.h);
    const ctx = cv.getContext('2d')!;
    const img = new ImageData(new Uint8ClampedArray(this.data.buffer, this.data.byteOffset, this.w * this.h * 4), this.w, this.h);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

export function maskOf(src: OffscreenCanvas): OffscreenCanvas {
  const cv = new OffscreenCanvas(src.width, src.height);
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
