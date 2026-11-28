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
import { backdrop, bgPos } from './backdrop';

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
  fireflies?: { x: number; y: number; a: number }[];
  overrides?: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number; lit?: number }>;
  reveal?: Set<string>; // mostra objetos escondidos por padrão (lotes planejados)
  bloom?: number;
  vignette?: number;
  tilt?: number; // 0..1: desfoque de maquete (tilt-shift) no alto e embaixo do quadro
  dawn?: number; // 0..1: amanhecer (céu, sol nascendo e luz ambiente)
  weather?: { rain?: number; fog?: number }; // estados reutilizáveis de clima
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
    // fundo: mar de nuvens e ilhotas flutuantes (paralaxe), atrás da ilha
    const bd = backdrop();
    const lampOn0 = smooth((p.night - 0.45) / 0.35) * (1 - 0.7 * (p.dawn ?? 0));
    for (const s of [...bd.back, ...bd.islets]) {
      const q = bgPos(s, p.cam.x, p.cam.y, p.t);
      const X = Math.round(q.x - rx), Y = Math.round(q.y - ry);
      if (X > rw || Y > rh || X + s.img.width < 0 || Y + s.img.height < 0) continue;
      alb.drawImage(s.img, X, Y);
      if (s.lights && lampOn0 > 0) for (const L of s.lights) {
        const spr = lightSprite('halo', L.r, L.color);
        emi.globalCompositeOperation = 'lighter'; emi.globalAlpha = lampOn0;
        emi.drawImage(spr, Math.round(L.x + (q.x - s.x) - rx - spr.width / 2), Math.round(L.y + (q.y - s.y) - ry - spr.height / 2));
        emi.globalAlpha = 1; emi.globalCompositeOperation = 'source-over';
        emi.fillStyle = '#ffe2a0'; emi.fillRect(Math.round(L.x + (q.x - s.x) - rx) - 1, Math.round(L.y + (q.y - s.y) - ry) - 1, 3, 3);
      }
    }
    blit(alb, g.canvas, rx, ry, rw, rh);
    // 2) água e cascata animadas
    this.drawWater(p.t, rx, ry, rw, rh);
    alb.drawImage(this.cv.wat, 0, 0, rw, rh, 0, 0, rw, rh);
    // brilhos da lua na água (coluna sob a lua, em espaço de tela), na emissão antes dos objetos
    if (p.night > 0.6) this.moonGlints(p, rx, ry, rw, rh, z);

    // 3) objetos (estáticos + dinâmicos) visíveis
    const lampOn = smooth((p.night - 0.45) / 0.35) * (1 - 0.7 * (p.dawn ?? 0));
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
      if ((o.hidden && !p.reveal?.has(o.id)) || p.hidden?.has(o.id)) return;
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
      if (ov?.ghost) {
        // holograma: silhueta tingida de ciano, translúcida e brilhante
        const g = ghostOf(s);
        alb.globalAlpha = alpha * 0.55; alb.drawImage(g, X, Y); alb.globalAlpha = 1;
        emi.globalCompositeOperation = 'lighter'; emi.globalAlpha = Math.min(1, ov.ghost * 0.7); emi.drawImage(g, X, Y); emi.globalAlpha = 1;
        if (clip) for (const c of [alb, lig, emi]) c.restore();
        continue;
      }
      alb.globalAlpha = alpha;
      alb.drawImage(s.img, X, Y);
      alb.globalAlpha = 1;
      if (alpha > 0.5) {
        lig.globalCompositeOperation = 'destination-out'; lig.drawImage(s.mask, X, Y);
        emi.globalCompositeOperation = 'destination-out'; emi.drawImage(s.mask, X, Y);
      }
      let lv = (ov?.lit ?? this.level(o, p)) * (ov?.glow ?? 1);
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
          // luzes já vêm em coordenadas de mundo; só o deslocamento de cena (prédio brotando) as move
          c.drawImage(spr, Math.round(L.x - rx - (spr.width - 1) / 2), Math.round(L.y + (ov?.dy ?? 0) - ry - (spr.height - 1) / 2));
          c.globalAlpha = 1;
        }
      }
    }
    for (const c of [alb, lig, emi]) c.globalCompositeOperation = 'source-over';
    // nuvens na frente da base rochosa da ilha e névoa da cascata
    for (const s of bd.front) {
      const q = bgPos(s, p.cam.x, p.cam.y, p.t);
      const X = Math.round(q.x - rx), Y = Math.round(q.y - ry);
      if (X > rw || Y > rh || X + s.img.width < 0 || Y + s.img.height < 0) continue;
      alb.globalAlpha = 0.92; alb.drawImage(s.img, X, Y); alb.globalAlpha = 1;
      emi.globalCompositeOperation = 'destination-out'; emi.globalAlpha = 0.9; emi.drawImage(s.img, X, Y); emi.globalAlpha = 1; emi.globalCompositeOperation = 'source-over';
    }
    const mf = this.world.fallBottom;
    for (let k = 0; k < 7; k++) {
      const m = bd.mist[k % 3];
      const ph = (p.t * 0.35 + k / 7) % 1;
      const X = Math.round(mf.x + (k - 3) * 9 + Math.sin(p.t * 0.7 + k) * 6 - m.width / 2 - rx);
      const Y = Math.round(mf.y - 18 - ph * 26 - ry);
      alb.globalAlpha = 0.75 * Math.sin(Math.PI * ph); alb.drawImage(m, X, Y); alb.globalAlpha = 1;
    }
    // cristais das encostas da ilha pulsando
    const cr = this.world.ground.crystals;
    for (let k = 0; k < cr.length; k += 2) {
      const X = cr[k] - rx, Y = cr[k + 1] - ry;
      if (X < 0 || Y < 0 || X >= rw || Y >= rh) continue;
      const a = 0.45 + 0.55 * Math.max(0, Math.sin(p.t * 1.3 + cr[k] * 0.7));
      emi.fillStyle = `rgba(120,240,255,${(a * 0.9).toFixed(3)})`; emi.fillRect(X, Y, 1, 1);
      emi.fillStyle = `rgba(90,200,255,${(a * 0.3).toFixed(3)})`; emi.fillRect(X - 1, Y, 3, 1); emi.fillRect(X, Y - 1, 1, 3);
    }
    // respingos no alto e no pé da cascata
    const fb = this.world.fallBottom, ft = this.world.fallTop;
    for (let k = 0; k < 26; k++) {
      const u = (p.t * (0.9 + (k % 5) * 0.12) + k * 0.137) % 1;
      const top = k < 10;
      const bx = (top ? ft.x : fb.x) + (hash2(k, 3) - 0.5) * (top ? 40 : 54);
      const by = (top ? ft.y : fb.y - 6) - u * (top ? 6 : 16) + u * u * (top ? 14 : 22);
      const X = Math.round(bx + (hash2(k, 4) - 0.5) * u * 20 - rx), Y = Math.round(by - ry);
      if (X < 0 || Y < 0 || X >= rw || Y >= rh) continue;
      alb.fillStyle = `rgba(220,240,255,${(0.85 * (1 - u)).toFixed(3)})`; alb.fillRect(X, Y, 1, 1);
    }
    // vaga-lumes (depois dos objetos: são pequenos demais para precisar de oclusão)
    if (p.fireflies && lampOn > 0) for (const f of p.fireflies) {
      const X = Math.round(f.x - rx), Y = Math.round(f.y - ry);
      if (X < 0 || Y < 0 || X >= rw || Y >= rh || f.a <= 0.02) continue;
      emi.fillStyle = `rgba(214,255,120,${(f.a * lampOn).toFixed(3)})`; emi.fillRect(X, Y, 1, 1);
      emi.fillStyle = `rgba(160,255,90,${(f.a * lampOn * 0.35).toFixed(3)})`; emi.fillRect(X - 1, Y, 3, 1); emi.fillRect(X, Y - 1, 1, 3);
    }

    // 4) luz: ambiente + poças; albedo × luz (preservando alfa)
    const amb = ambientFor(p.night, p.dawn ?? 0).map((v) => v * (1 - 0.18 * (p.weather?.rain ?? 0))) as [number, number, number];
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
    drawSky(out, W, H, p.night, p.t, p.cam.x, p.dawn ?? 0, p.cam.y);
    // chuva: céu encoberto (some a lua e as estrelas) antes de desenhar a cidade
    const overcast = p.weather?.rain ?? 0;
    if (overcast > 0.01) { out.fillStyle = `rgba(36,40,64,${Math.min(0.88, overcast * 0.88)})`; out.fillRect(0, 0, W, H); }
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
    // tilt-shift: cópia desfocada (meia resolução) mascarada por degradê no alto e embaixo
    const tilt = p.tilt ?? 0;
    if (tilt > 0.01) {
      const tw = W / 2, th = H / 2;
      const ts = this.ts(tw, th);
      ts.ctx.globalCompositeOperation = 'source-over';
      ts.ctx.clearRect(0, 0, tw, th);
      ts.ctx.filter = `blur(${(2.5 + 3.5 * tilt).toFixed(1)}px)`;
      ts.ctx.drawImage(out.canvas, 0, 0, W, H, 0, 0, tw, th);
      ts.ctx.filter = 'none';
      const gr = ts.ctx.createLinearGradient(0, 0, 0, th);
      gr.addColorStop(0, `rgba(0,0,0,${tilt})`); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); gr.addColorStop(0.64, 'rgba(0,0,0,0)'); gr.addColorStop(1, `rgba(0,0,0,${tilt})`);
      ts.ctx.globalCompositeOperation = 'destination-in';
      ts.ctx.fillStyle = gr; ts.ctx.fillRect(0, 0, tw, th);
      out.imageSmoothingEnabled = true;
      out.drawImage(ts.cv, 0, 0, tw, th, 0, 0, W, H);
    }
    // clima: neblina (véu mais denso embaixo) e chuva (riscos em diagonal na escala dos pixels)
    const fog = p.weather?.fog ?? 0, rain = p.weather?.rain ?? 0;
    if (fog > 0.01) {
      const gr = out.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, `rgba(150,160,205,${0.18 * fog})`); gr.addColorStop(0.55, `rgba(150,160,205,${0.32 * fog})`); gr.addColorStop(1, `rgba(170,178,220,${0.6 * fog})`);
      out.fillStyle = gr; out.fillRect(0, 0, W, H);
    }
    if (rain > 0.01) {
      const n = Math.round(650 * rain), u = 4;
      out.fillStyle = `rgba(200,220,255,${0.62 * rain})`;
      for (let k = 0; k < n; k++) {
        const x0 = hash2(k, 1) * (W + 200), sp = 1400 + hash2(k, 2) * 600;
        const y = ((hash2(k, 3) * H + p.t * sp) % (H + 60)) - 30;
        const x = (x0 - p.t * sp * 0.25) % (W + 200);
        for (let q = 0; q < 6; q++) out.fillRect(Math.round((x - q * 1.2) / u) * u, Math.round((y - q * u * 1.6) / u) * u, u, u);
      }
      // respingos no chão
      out.fillStyle = `rgba(200,220,255,${0.35 * rain})`;
      for (let k = 0; k < n / 3; k++) { if (hash2(k, Math.floor(p.t * 12), 7) > 0.5) continue; out.fillRect(Math.round(hash2(k, 8) * W / u) * u, Math.round((0.35 + hash2(k, 9) * 0.6) * H / u) * u, u, u); }
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

  private _ts: { cv: OffscreenCanvas; ctx: C2D } | null = null;
  ts(w: number, h: number) {
    if (!this._ts) { const [cv, ctx] = mk(w, h); this._ts = { cv, ctx }; }
    return this._ts;
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

  moonGlints(p: FrameParams, rx: number, ry: number, rw: number, rh: number, z: number) {
    const emi = this.cx.emi;
    const mx = p.cam.x + (0.8 - 0.5) * (this.W / z);
    const { water, waterRows } = this.world;
    const a = Math.min(1, (p.night - 0.6) / 0.3);
    const y0 = Math.max(0, ry), y1 = Math.min(WORLD_H - 1, ry + rh);
    for (let py = y0; py <= y1; py++) {
      for (let k = waterRows[py]; k < waterRows[py + 1]; k += 5) {
        const px = water[k];
        const dx = Math.abs(px - mx);
        if (dx > 7 || px < rx || px >= rx + rw) continue;
        const hsh = hash2(px, Math.floor(py / 2) + Math.floor(p.t * 5), 77);
        if (hsh > 0.55 - (7 - dx) * 0.03) continue;
        emi.fillStyle = `rgba(230,236,255,${(a * (0.9 - dx * 0.1)).toFixed(3)})`;
        emi.fillRect(px - rx, py - ry, dx < 2 ? 2 : 1, 1);
      }
    }
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

const ghostCache = new WeakMap<OffscreenCanvas, OffscreenCanvas>();
function ghostOf(s: { img: OffscreenCanvas; w: number; h: number }) {
  const hit = ghostCache.get(s.img);
  if (hit) return hit;
  const c = new OffscreenCanvas(s.w, s.h), x = c.getContext('2d')!;
  x.drawImage(s.img, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(90,230,255,0.82)'; x.fillRect(0, 0, s.w, s.h);
  // linhas de varredura do holograma
  x.fillStyle = 'rgba(10,40,80,0.35)';
  for (let y = 0; y < s.h; y += 2) x.fillRect(0, y, s.w, 1);
  ghostCache.set(s.img, c);
  return c;
}

export const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
