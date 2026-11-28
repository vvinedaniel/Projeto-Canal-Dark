// Núcleo de DSP do sintetizador do SegueCity: tudo em Float64, sem dependências.
// Determinístico: o único "acaso" vem de Rng (mulberry32) com semente fixa.

export const SR = 48000;
export const TAU = Math.PI * 2;

export const s2n = (sec: number): number => Math.round(sec * SR);
export const mtof = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const db = (d: number): number => Math.pow(10, d / 20);
export const toDb = (g: number): number => 20 * Math.log10(Math.max(g, 1e-12));
export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;
export const smooth = (u: number): number => {
  const v = clamp(u, 0, 1);
  return v * v * (3 - 2 * v);
};

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** 'F3', 'Bb2', 'C#5' -> número MIDI (C4 = 60). */
export function nm(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`nota inválida: ${name}`);
  let v = NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}

// ------------------------------------------------------------------------------------
// Gerador pseudoaleatório (mulberry32)
// ------------------------------------------------------------------------------------
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** uniforme em [-1, 1) */
  uni(): number {
    return this.next() * 2 - 1;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)];
  }
  gauss(): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  }
}

/** ruído branco determinístico de n amostras */
export function noise(n: number, seed: number): Float64Array {
  const r = new Rng(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = r.uni();
  return out;
}

// ------------------------------------------------------------------------------------
// Buffers estéreo
// ------------------------------------------------------------------------------------
export class Stereo {
  L: Float64Array;
  R: Float64Array;
  constructor(public n: number) {
    this.L = new Float64Array(n);
    this.R = new Float64Array(n);
  }
  static sec(sec: number): Stereo {
    return new Stereo(Math.round(sec * SR));
  }
  clone(): Stereo {
    const s = new Stereo(this.n);
    s.L.set(this.L);
    s.R.set(this.R);
    return s;
  }
  scale(g: number): this {
    for (let i = 0; i < this.n; i++) {
      this.L[i] *= g;
      this.R[i] *= g;
    }
    return this;
  }
  /** soma src (a partir de offset em amostras) com ganho */
  mix(src: Stereo, gain = 1, offset = 0): this {
    for (let i = 0; i < src.n; i++) {
      const j = i + offset;
      if (j < 0 || j >= this.n) continue;
      this.L[j] += src.L[i] * gain;
      this.R[j] += src.R[i] * gain;
    }
    return this;
  }
  peak(): number {
    let p = 0;
    for (let i = 0; i < this.n; i++) {
      const a = Math.abs(this.L[i]);
      const b = Math.abs(this.R[i]);
      if (a > p) p = a;
      if (b > p) p = b;
    }
    return p;
  }
  rms(): number {
    let s = 0;
    for (let i = 0; i < this.n; i++) s += this.L[i] * this.L[i] + this.R[i] * this.R[i];
    return Math.sqrt(s / (2 * Math.max(1, this.n)));
  }
  /** ganho que varia no tempo: g(t em segundos) */
  envelope(g: (t: number) => number, step = 32): this {
    let gv = g(0);
    for (let i = 0; i < this.n; i++) {
      if (i % step === 0) gv = g(i / SR);
      this.L[i] *= gv;
      this.R[i] *= gv;
    }
    return this;
  }
  slice(start: number, len: number): Stereo {
    const s = new Stereo(len);
    for (let i = 0; i < len; i++) {
      const j = start + i;
      if (j >= 0 && j < this.n) {
        s.L[i] = this.L[j];
        s.R[i] = this.R[j];
      }
    }
    return s;
  }
}

/** pan de potência constante: p em [-1, 1] -> [gL, gR] */
export function panGains(p: number): [number, number] {
  const a = ((clamp(p, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2];
}

/** soma um sinal mono num estéreo, com ganho e pan, a partir da amostra start */
export function addMono(dst: Stereo, start: number, src: Float64Array, gain = 1, pan = 0): void {
  const [gl, gr] = panGains(pan);
  const a = gain * gl;
  const b = gain * gr;
  const n = src.length;
  for (let i = 0; i < n; i++) {
    const j = start + i;
    if (j < 0) continue;
    if (j >= dst.n) break;
    dst.L[j] += src[i] * a;
    dst.R[j] += src[i] * b;
  }
}

/** soma mono numa linha circular (loops): o que passa do fim volta para o início */
export function addMonoWrap(dst: Stereo, start: number, src: Float64Array, gain = 1, pan = 0): void {
  const [gl, gr] = panGains(pan);
  const n = dst.n;
  for (let i = 0; i < src.length; i++) {
    let j = (start + i) % n;
    if (j < 0) j += n;
    dst.L[j] += src[i] * gain * gl;
    dst.R[j] += src[i] * gain * gr;
  }
}

/** rampa de entrada/saída nas pontas para garantir início/fim em zero */
export function edgeFade(x: Float64Array, inSamp = 48, outSamp = 96): Float64Array {
  const n = x.length;
  for (let i = 0; i < Math.min(inSamp, n); i++) x[i] *= i / inSamp;
  for (let i = 0; i < Math.min(outSamp, n); i++) x[n - 1 - i] *= i / outSamp;
  return x;
}

// ------------------------------------------------------------------------------------
// Osciladores (com polyBLEP contra aliasing)
// ------------------------------------------------------------------------------------
export function polyBlep(t: number, dt: number): number {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

export class PulseOsc {
  constructor(public phase = 0) {}
  /** onda de pulso com ciclo de trabalho variável, sem componente DC */
  next(freq: number, duty: number): number {
    const dt = Math.min(freq / SR, 0.49);
    const p = this.phase;
    let v = p < duty ? 1 : -1;
    v += polyBlep(p, dt);
    let p2 = p - duty;
    if (p2 < 0) p2 += 1;
    v -= polyBlep(p2, dt);
    v -= 2 * duty - 1;
    let np = p + dt;
    if (np >= 1) np -= 1;
    this.phase = np;
    return v;
  }
}

export class TriOsc {
  constructor(public phase = 0) {}
  /** triângulo; steps > 0 quantiza em degraus (triângulo do NES tem 16 níveis) */
  next(freq: number, steps = 0): number {
    const p = this.phase;
    let v = 1 - 4 * Math.abs(p - 0.5); // -1..1
    if (steps > 0) {
      const q = Math.min(steps - 1, Math.floor(((v + 1) / 2) * steps));
      v = (q / (steps - 1)) * 2 - 1;
    }
    let np = p + freq / SR;
    if (np >= 1) np -= Math.floor(np);
    this.phase = np;
    return v;
  }
}

export class SinOsc {
  constructor(public phase = 0) {}
  next(freq: number): number {
    const v = Math.sin(TAU * this.phase);
    let np = this.phase + freq / SR;
    if (np >= 1) np -= Math.floor(np);
    this.phase = np;
    return v;
  }
}

// ------------------------------------------------------------------------------------
// Filtros
// ------------------------------------------------------------------------------------
/** filtro de estado variável (topologia TPT / Zavalishin): estável sob modulação */
export class SVF {
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private k = 1;
  low = 0;
  band = 0;
  high = 0;
  constructor(fc = 1000, q = 0.707) {
    this.set(fc, q);
  }
  set(fc: number, q = 0.707): void {
    const f = clamp(fc, 5, SR * 0.45);
    const g = Math.tan((Math.PI * f) / SR);
    this.k = 1 / Math.max(q, 0.05);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }
  tick(v0: number): void {
    const v3 = v0 - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.low = v2;
    this.band = v1;
    this.high = v0 - this.k * v1 - v2;
  }
  lp(x: number): number {
    this.tick(x);
    return this.low;
  }
  bp(x: number): number {
    this.tick(x);
    return this.band;
  }
  hp(x: number): number {
    this.tick(x);
    return this.high;
  }
}

/** passa-baixas de 1 polo (6 dB/oit); hp = x - lp (complementares exatos) */
export class OnePole {
  y = 0;
  private a = 0;
  constructor(fc = 1000) {
    this.set(fc);
  }
  set(fc: number): void {
    this.a = Math.exp((-TAU * clamp(fc, 1, SR * 0.49)) / SR);
  }
  lp(x: number): number {
    this.y = x + this.a * (this.y - x);
    return this.y;
  }
  hp(x: number): number {
    return x - this.lp(x);
  }
}

/** biquad RBJ (forma direta transposta II) */
export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private z1 = 0;
  private z2 = 0;
  static make(type: 'lp' | 'hp' | 'bp' | 'peak' | 'lowshelf' | 'highshelf', fc: number, q = 0.707, gainDb = 0): Biquad {
    const b = new Biquad();
    const A = Math.pow(10, gainDb / 40);
    const w = (TAU * clamp(fc, 5, SR * 0.45)) / SR;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
    switch (type) {
      case 'lp':
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'hp':
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'bp':
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'peak':
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cw + s); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - s);
        a0 = A + 1 + (A - 1) * cw + s; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s);
        a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s;
        break;
      }
    }
    b.b0 = b0 / a0; b.b1 = b1 / a0; b.b2 = b2 / a0; b.a1 = a1 / a0; b.a2 = a2 / a0;
    return b;
  }
  static raw(b0: number, b1: number, b2: number, a1: number, a2: number): Biquad {
    const b = new Biquad();
    b.b0 = b0; b.b1 = b1; b.b2 = b2; b.a1 = a1; b.a2 = a2;
    return b;
  }
  tick(x: number): number {
    const y = this.b0 * x + this.z1;
    this.z1 = this.b1 * x - this.a1 * y + this.z2;
    this.z2 = this.b2 * x - this.a2 * y;
    return y;
  }
}

/** aplica uma cadeia de biquads a um buffer (em lugar) */
export function filterArr(x: Float64Array, ...fs: Biquad[]): Float64Array {
  for (const f of fs) for (let i = 0; i < x.length; i++) x[i] = f.tick(x[i]);
  return x;
}

export function filterStereo(s: Stereo, make: () => Biquad[]): Stereo {
  filterArr(s.L, ...make());
  filterArr(s.R, ...make());
  return s;
}

// ------------------------------------------------------------------------------------
// Efeitos: reverb (Freeverb), delay pingue-pongue, saturação, tape stop
// ------------------------------------------------------------------------------------
class Comb {
  private buf: Float64Array;
  private i = 0;
  private store = 0;
  constructor(n: number) {
    this.buf = new Float64Array(n);
  }
  tick(x: number, fb: number, damp: number): number {
    const out = this.buf[this.i];
    this.store = out * (1 - damp) + this.store * damp;
    this.buf[this.i] = x + this.store * fb;
    if (++this.i >= this.buf.length) this.i = 0;
    return out;
  }
}
class Allpass {
  private buf: Float64Array;
  private i = 0;
  constructor(n: number) {
    this.buf = new Float64Array(n);
  }
  tick(x: number): number {
    const b = this.buf[this.i];
    this.buf[this.i] = x + b * 0.5;
    if (++this.i >= this.buf.length) this.i = 0;
    return b - x;
  }
}

export interface ReverbOpts {
  room?: number; // 0..1 (tamanho/decaimento)
  damp?: number; // 0..1 (absorção dos agudos)
  width?: number; // 0..1
  predelay?: number; // s
  hp?: number; // Hz, passa-altas na entrada (evita embolar o grave)
  lp?: number; // Hz, passa-baixas na saída (reverb quente)
}

/** Freeverb (Jezar) adaptado a 48 kHz. Devolve só o sinal molhado. */
export function reverb(input: Stereo, o: ReverbOpts = {}): Stereo {
  const room = o.room ?? 0.7;
  const damp = (o.damp ?? 0.5) * 0.4;
  const fb = room * 0.28 + 0.7;
  const width = o.width ?? 1;
  const sc = SR / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const spread = 23;
  const cL = combT.map((t) => new Comb(Math.round(t * sc)));
  const cR = combT.map((t) => new Comb(Math.round((t + spread) * sc)));
  const aL = apT.map((t) => new Allpass(Math.round(t * sc)));
  const aR = apT.map((t) => new Allpass(Math.round((t + spread) * sc)));
  const pre = Math.round((o.predelay ?? 0.012) * SR);
  const hp = new OnePole(o.hp ?? 180);
  const lpL = new OnePole(o.lp ?? 6000);
  const lpR = new OnePole(o.lp ?? 6000);
  const out = new Stereo(input.n);
  const wet1 = width / 2 + 0.5;
  const wet2 = (1 - width) / 2;
  const gIn = 0.015 * 2;
  for (let i = 0; i < input.n; i++) {
    const j = i - pre;
    const xin = j >= 0 ? (input.L[j] + input.R[j]) * 0.5 : 0;
    const x = hp.hp(xin) * gIn;
    let l = 0;
    let r = 0;
    for (let k = 0; k < 8; k++) {
      l += cL[k].tick(x, fb, damp);
      r += cR[k].tick(x, fb, damp);
    }
    for (let k = 0; k < 4; k++) {
      l = aL[k].tick(l);
      r = aR[k].tick(r);
    }
    out.L[i] = lpL.lp(l * wet1 + r * wet2);
    out.R[i] = lpR.lp(r * wet1 + l * wet2);
  }
  return out;
}

/** delay estéreo pingue-pongue com passa-baixas na realimentação. Devolve só o molhado. */
export function pingPong(input: Stereo, time: number, fb = 0.4, lp = 3500, hp = 250): Stereo {
  const d = Math.max(1, Math.round(time * SR));
  const bl = new Float64Array(d);
  const br = new Float64Array(d);
  const fl = new OnePole(lp);
  const fr = new OnePole(lp);
  const hl = new OnePole(hp);
  const out = new Stereo(input.n);
  let idx = 0;
  for (let i = 0; i < input.n; i++) {
    const dl = bl[idx];
    const dr = br[idx];
    const mono = hl.hp((input.L[i] + input.R[i]) * 0.5);
    // L recebe a entrada + o retorno de R; R recebe o retorno de L (pingue-pongue)
    bl[idx] = mono + fl.lp(dr) * fb;
    br[idx] = fr.lp(dl) * fb;
    out.L[i] = dl;
    out.R[i] = dr;
    if (++idx >= d) idx = 0;
  }
  return out;
}

/** saturação suave (tanh normalizada): drive 0 = linear */
export function saturate(s: Stereo, drive: number): Stereo {
  if (drive <= 0) return s;
  const k = Math.tanh(drive);
  for (let i = 0; i < s.n; i++) {
    s.L[i] = Math.tanh(drive * s.L[i]) / k;
    s.R[i] = Math.tanh(drive * s.R[i]) / k;
  }
  return s;
}

/** leitura com interpolação cúbica (Hermite) */
export function readCubic(x: Float64Array, pos: number): number {
  const i = Math.floor(pos);
  const f = pos - i;
  const xm1 = x[i - 1] ?? 0;
  const x0 = x[i] ?? 0;
  const x1 = x[i + 1] ?? 0;
  const x2 = x[i + 2] ?? 0;
  const c1 = 0.5 * (x1 - xm1);
  const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
  const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
  return ((c3 * f + c2) * f + c1) * f + x0;
}

/**
 * "Tape stop": a partir de tStop a velocidade de leitura cai de 1 a 0 em dur segundos
 * (curva (1-u)^curve), com o tom caindo junto. Depois disso, silêncio.
 */
export function tapeStop(s: Stereo, tStop: number, dur: number, curve = 1.6): Stereo {
  const out = new Stereo(s.n);
  const n0 = s2n(tStop);
  const nd = s2n(dur);
  for (let i = 0; i < Math.min(n0, s.n); i++) {
    out.L[i] = s.L[i];
    out.R[i] = s.R[i];
  }
  let pos = n0;
  for (let k = 0; k < nd && n0 + k < s.n; k++) {
    const u = k / nd;
    const rate = Math.pow(1 - u, curve);
    const fade = u < 0.7 ? 1 : Math.cos(((u - 0.7) / 0.3) * (Math.PI / 2)) ** 2;
    out.L[n0 + k] = readCubic(s.L, pos) * fade;
    out.R[n0 + k] = readCubic(s.R, pos) * fade;
    pos += rate;
  }
  return out;
}

/** processa um loop "em círculo": repete o sinal k vezes, processa e fica com a última volta.
 *  Como o estado dos filtros/reverbs entra em regime periódico, o loop fecha sem emenda. */
export function circular(x: Stereo, proc: (s: Stereo) => Stereo, passes = 3): Stereo {
  const n = x.n;
  const big = new Stereo(n * passes);
  for (let p = 0; p < passes; p++) {
    big.L.set(x.L, p * n);
    big.R.set(x.R, p * n);
  }
  const y = proc(big);
  return y.slice((passes - 1) * n, n);
}
