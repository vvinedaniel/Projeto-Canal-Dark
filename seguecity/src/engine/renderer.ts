// Renderizador de um quadro: chão + água animada + objetos ordenados, mapa de luz, emissão, bloom e
// ampliação "sharp-bilinear" (pixels nítidos com câmera em movimento sub-pixel).
import { WORLD_W, WORLD_H } from './iso';
import { lightSprite } from './lights';
import { depthSort, type Placed } from './sort';
import { drawSky, ambientFor } from './sky';
import { pick } from './color';
import { P } from './palette';
import { hash2 } from './rng';
import type { Obj } from './types';
import type { World } from './world';

export interface Cam { x: number; y: number; zoom: number }
export interface FrameParams {
  t: number;
  cam: Cam;
  night: number; // 0 dia .. 1 noite
  levels: { civic: number; home: number; shop: number; street: number };
  homeFrac?: number; // fração das casas acesas (pela ordem de rank)
  dyn?: Obj[];
  refl?: { x: number; y: number; len: number; color: number }[];
  hidden?: Set<string>;
  overrides?: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number }>;
  bloom?: number;
  vignette?: number;
}

type C2D = OffscreenCanvasRenderingContext2D;
const mk = (w: number, h: number) => {
  const c = new OffscreenCanvas(w, h);
  const x = c.getContext('2d', { willReadFrequently: false }) as C2D;
  x.imageSmoothingEnabled = false;
  return [c, x] as const;
};

export class Renderer {
  W: number; H: number;
  cv: Record<string, OffscreenCanvas> = {};
  cx: Record<string, C2D> = {};
  cap = { w: 0, h: 0 };
  waterBuf: Uint32Array | null = null;
  waterImg: ImageData | null = null;
  constructor(public world: World, W = 1080, H = 1920) { this.W = W; this.H = H; }

  ensure(w: number, h: number) {
    if (w <= this.cap.w && h <= this.cap.h) return;
    const cw = Math.max(w, this.cap.w), ch = Math.max(h, this.cap.h);
    for (const k of ['alb', 'lig', 'lf', 'emi', 'tmp', 'wat']) { const [c, x] = mk(cw, ch); this.cv[k] = c; this.cx[k] = x; }
    const [b, bx] = mk(Math.ceil(cw / 2), Math.ceil(ch / 2)); this.cv.blm = b; this.cx.blm = bx;
    this.waterImg = new ImageData(cw, ch);
    this.waterBuf = new Uint32Array(this.waterImg.data.buffer);
    this.cap = { w: cw, h: ch };
  }

  render(out: CanvasRenderingContext2D, p: FrameParams) {
    const { W, H } = this;
    const z = p.cam.zoom;
    const vw = W / z, vh = H / z;
    const x0 = p.cam.x - vw / 2, y0 = p.cam.y - vh / 2;
    const rx = Math.floor(x0) - 1, ry = Math.floor(y0) - 1;
    const rw = Math.ceil(vw) + 4, rh = Math.ceil(vh) + 4;
    this.ensure(rw, rh);
    const { alb, lig, lf, emi, tmp, wat, blm } = this.cx;

    // 1) albedo: chão
    for (const c of [alb, lig, emi, tmp]) { c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, rw, rh); }
    const g = this.world.ground;
    blit(alb, g.canvas, rx, ry, rw, rh);
    // 2) água e cascata animadas
    this.drawWater(p.t, rx, ry, rw, rh);
    alb.drawImage(this.cv.wat, 0, 0, rw, rh, 0, 0, rw, rh);

    // 3) objetos (estáticos + dinâmicos) visíveis
    const lampOn = smooth((p.night - 0.45) / 0.35);
    // reflexos das luzes na água (desenhados primeiro na emissão; objetos na frente os apagam)
    if (p.refl && lampOn > 0) {
      emi.globalCompositeOperation = 'source-over';
      for (const r of p.refl) {
        const X = Math.round(r.x - rx), Y = Math.round(r.y - ry);
        for (let k = 0; k < r.len; k++) {
          const a = (1 - k / r.len) * lampOn * p.levels.street;
          if (((k * 7 + Math.floor(p.t * 9 + r.x)) % 5) < 2) continue;
          const w = k < 3 ? 1 : (k % 3 === 0 ? 3 : 2);
          emi.fillStyle = `rgba(${r.color & 255},${(r.color >>> 8) & 255},${(r.color >>> 16) & 255},${(a * 0.8).toFixed(3)})`;
          emi.fillRect(X - (w >> 1) + (((k * 13) >> 2) % 2 ? 1 : 0), Y + k, w, 1);
        }
      }
    }
    const placed0: Placed[] = [], placed1: Placed[] = [];
    const addObj = (o: Obj) => {
      if (o.hidden || p.hidden?.has(o.id)) return;
      const s = o.sprite;
      const ov = p.overrides?.[o.id];
      const dx = o.dx ?? 0, dy = (o.dy ?? 0) + (ov?.dy ?? 0);
      const X0 = s.ox + dx, Y0 = s.oy + dy;
      if (X0 > rx + rw || Y0 > ry + rh || X0 + s.w < rx || Y0 + s.h < ry) return;
      (o.layer === 0 ? placed0 : placed1).push({ o, x0: X0, y0: Y0, x1: X0 + s.w, y1: Y0 + s.h });
    };
    for (const o of this.world.objects) addObj(o);
    if (p.dyn) for (const o of p.dyn) addObj(o);
    placed0.sort((a, b) => a.o.fp[0] + a.o.fp[1] - b.o.fp[0] - b.o.fp[1]);
    const order = [...placed0, ...depthSort(placed1)];

    for (const pl of order) {
      const o = pl.o, s = o.sprite;
      const X = Math.round(pl.x0 - rx), Y = Math.round(pl.y0 - ry);
      const ov = p.overrides?.[o.id];
      const alpha = ov?.alpha ?? 1;
      const clip = o.dy || ov?.dy ? this.clipFor(o, rx, ry) : null;
      if (clip) for (const c of [alb, lig, emi]) { c.save(); c.beginPath(); clip(c); c.clip(); }
      alb.globalAlpha = alpha;
      alb.drawImage(s.img, X, Y);
      alb.globalAlpha = 1;
      if (ov?.ghost) { alb.globalAlpha = ov.ghost; alb.globalCompositeOperation = 'source-atop'; alb.fillStyle = '#56d8ff'; alb.fillRect(X, Y, s.w, s.h); alb.globalAlpha = 1; alb.globalCompositeOperation = 'source-over'; }
      if (alpha > 0.5) {
        lig.globalCompositeOperation = 'destination-out'; lig.drawImage(s.mask, X, Y);
        emi.globalCompositeOperation = 'destination-out'; emi.drawImage(s.mask, X, Y);
      }
      let lv = this.level(o, p) * (ov?.glow ?? 1);
      if (s.glow && lv > 0.01 && alpha > 0.5) {
        emi.globalCompositeOperation = 'lighter'; emi.globalAlpha = Math.min(1, lv * (0.25 + 0.75 * lampOn));
        emi.drawImage(s.glow, X, Y); emi.globalAlpha = 1;
      }
      if (clip) for (const c of [alb, lig, emi]) c.restore();
      if (o.lights.length && lampOn > 0 && alpha > 0.5) {
        lv = Math.min(1, lv) * lampOn;
        if (lv > 0.01) for (const L of o.lights) {
          const spr = lightSprite(L.kind, L.r, L.color);
          const c = L.kind === 'pool' ? lig : emi;
          c.globalCompositeOperation = 'lighter';
          c.globalAlpha = Math.min(1, L.a * lv);
          c.drawImage(spr, Math.round(L.x + (o.dx ?? 0) - rx - (spr.width - 1) / 2), Math.round(L.y + (o.dy ?? 0) - ry - (spr.height - 1) / 2));
          c.globalAlpha = 1;
        }
      }
    }
    for (const c of [alb, lig, emi]) c.globalCompositeOperation = 'source-over';

    // 4) luz: ambiente + poças; albedo × luz (preservando alfa)
    const amb = ambientFor(p.night);
    lf.globalCompositeOperation = 'source-over';
    lf.fillStyle = `rgb(${amb.map((v) => Math.round(v * 255)).join(',')})`;
    lf.fillRect(0, 0, rw, rh);
    lf.globalCompositeOperation = 'lighter';
    lf.drawImage(this.cv.lig, 0, 0, rw, rh, 0, 0, rw, rh);
    lf.globalCompositeOperation = 'source-over';
    tmp.drawImage(this.cv.alb, 0, 0, rw, rh, 0, 0, rw, rh);
    alb.globalCompositeOperation = 'multiply';
    alb.drawImage(this.cv.lf, 0, 0, rw, rh, 0, 0, rw, rh);
    alb.globalCompositeOperation = 'destination-in';
    alb.drawImage(this.cv.tmp, 0, 0, rw, rh, 0, 0, rw, rh);
    // 5) emissão + bloom
    alb.globalCompositeOperation = 'lighter';
    alb.drawImage(this.cv.emi, 0, 0, rw, rh, 0, 0, rw, rh);
    const bl = p.bloom ?? 0.75;
    if (bl > 0) {
      const bw = Math.ceil(rw / 2), bh = Math.ceil(rh / 2);
      blm.globalCompositeOperation = 'source-over';
      blm.clearRect(0, 0, bw, bh);
      blm.imageSmoothingEnabled = true;
      blm.filter = 'blur(3px)';
      blm.drawImage(this.cv.emi, 0, 0, rw, rh, 0, 0, bw, bh);
      blm.filter = 'none';
      alb.imageSmoothingEnabled = true;
      alb.globalAlpha = bl;
      alb.drawImage(this.cv.blm, 0, 0, bw, bh, 0, 0, rw, rh);
      alb.globalAlpha = 1;
      alb.imageSmoothingEnabled = false;
    }
    alb.globalCompositeOperation = 'source-over';

    // 6) saída: céu em espaço de tela + mundo ampliado
    out.save();
    drawSky(out, W, H, p.night, p.t, p.cam.x);
    const k = Math.max(1, Math.floor(z));
    out.imageSmoothingEnabled = true;
    out.imageSmoothingQuality = 'low';
    if (k > 1) {
      const iw = rw * k, ih = rh * k;
      const inter = this.inter(iw, ih);
      inter.ctx.clearRect(0, 0, iw, ih);
      inter.ctx.imageSmoothingEnabled = false;
      inter.ctx.drawImage(this.cv.alb, 0, 0, rw, rh, 0, 0, iw, ih);
      out.drawImage(inter.cv, (x0 - rx) * k, (y0 - ry) * k, vw * k, vh * k, 0, 0, W, H);
    } else {
      if (z < 1) out.imageSmoothingQuality = 'high';
      out.drawImage(this.cv.alb, x0 - rx, y0 - ry, vw, vh, 0, 0, W, H);
    }
    // vinheta
    const vg = p.vignette ?? 0.35;
    if (vg > 0) {
      const gr = out.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.45, H * 0.78);
      gr.addColorStop(0, 'rgba(5,6,20,0)'); gr.addColorStop(1, `rgba(5,6,20,${vg})`);
      out.fillStyle = gr; out.fillRect(0, 0, W, H);
    }
    out.restore();
  }

  private _inter: { cv: OffscreenCanvas; ctx: C2D } | null = null;
  inter(w: number, h: number) {
    if (!this._inter || this._inter.cv.width < w || this._inter.cv.height < h) {
      const [cv, ctx] = mk(Math.max(w, this._inter?.cv.width ?? 0), Math.max(h, this._inter?.cv.height ?? 0));
      this._inter = { cv, ctx };
    }
    return this._inter;
  }

  level(o: Obj, p: FrameParams) {
    switch (o.group) {
      case 'civic': return p.levels.civic;
      case 'shop': return p.levels.shop;
      case 'street': return p.levels.street;
      case 'home': {
        if (p.homeFrac === undefined) return p.levels.home;
        const r = o.rank ?? 0.5;
        return p.levels.home * smooth((p.homeFrac - r) / 0.04 + 0.5);
      }
      default: return 1;
    }
  }

  // recorte "brotando do chão": tudo acima das arestas da frente da base
  clipFor(o: Obj, rx: number, ry: number) {
    const [i0, j0, i1, j1] = o.fp;
    const X = (i: number, j: number) => (i - j) * 16 + this.world.OX - rx;
    const Y = (i: number, j: number) => (i + j) * 8 + this.world.OY - ry;
    return (c: C2D) => {
      c.moveTo(X(i0, j1) - 2, Y(i0, j1));
      c.lineTo(X(i1, j1), Y(i1, j1) + 1);
      c.lineTo(X(i1, j0) + 2, Y(i1, j0));
      c.lineTo(X(i1, j0) + 2, -9999);
      c.lineTo(X(i0, j1) - 2, -9999);
      c.closePath();
    };
  }

  drawWater(t: number, rx: number, ry: number, rw: number, rh: number) {
    const buf = this.waterBuf!, cw = this.cap.w;
    const w = this.cv.wat, wx = this.cx.wat;
    buf.fill(0, 0, cw * rh);
    const { water, fall, waterRows } = this.world;
    const flow = t * 0.32;
    const y0 = Math.max(0, ry), y1 = Math.min(WORLD_H - 1, ry + rh);
    for (let py = y0; py <= y1; py++) {
      const a = waterRows[py], b = waterRows[py + 1];
      for (let k = a; k < b; k += 5) {
        const px = water[k];
        if (px < rx || px >= rx + rw) continue;
        const i = water[k + 2] / 256, j = water[k + 3] / 256;
        let s = water[k + 4] / 1000;
        const jj = j - flow;
        const w1 = Math.sin(jj * 10 + Math.sin(i * 4.7 + t * 0.9) * 1.4 + i * 1.3);
        if (w1 > 0.84) s += 0.16; else if (w1 < -0.88) s -= 0.07;
        if (hash2(Math.floor(i * 20), Math.floor(jj * 9), 3) > 0.988 && Math.sin(t * 6 + i * 50) > 0) s = 0.92;
        buf[(py - ry) * cw + (px - rx)] = pick(P.water, s, px, py);
      }
    }
    for (let k = 0; k < fall.length; k += 3) {
      const px = fall[k], py = fall[k + 1];
      if (px < rx || px >= rx + rw || py < ry || py >= ry + rh) continue;
      const d = fall[k + 2];
      const st = hash2(px, Math.floor((py - t * 55) / 4), 9);
      let s = 0.5 + st * 0.4;
      if (d < 3) s = 0.95;
      if (hash2(px * 3, Math.floor((py - t * 70) / 2), 4) > 0.93) s = 1;
      buf[(py - ry) * cw + (px - rx)] = pick(P.water, s, px, py);
    }
    wx.putImageData(this.waterImg!, 0, 0, 0, 0, rw, rh);
    void w;
  }
}

function blit(c: C2D, src: OffscreenCanvas, rx: number, ry: number, rw: number, rh: number) {
  const sx0 = Math.max(0, rx), sy0 = Math.max(0, ry);
  const sx1 = Math.min(WORLD_W, rx + rw), sy1 = Math.min(WORLD_H, ry + rh);
  if (sx1 <= sx0 || sy1 <= sy0) return;
  c.drawImage(src, sx0, sy0, sx1 - sx0, sy1 - sy0, sx0 - rx, sy0 - ry, sx1 - sx0, sy1 - sy0);
}

export const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
