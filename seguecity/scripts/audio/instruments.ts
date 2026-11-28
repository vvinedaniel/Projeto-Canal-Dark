// Instrumentos do SegueCity: timbres chiptune (pulso, triângulo, ruído, FM) com acabamento "moderno":
// filtros suaves, desafinação estéreo, envelopes sem estalos. Cada função soma uma nota num barramento.
import {
  OnePole, PulseOsc, Rng, SR, SVF, SinOsc, Stereo, TAU, TriOsc,
  addMono, clamp, edgeFade, mtof, noise, panGains, reverb, pingPong, s2n,
} from './dsp';

export type Cut = number | ((tAbs: number) => number);
const cutAt = (c: Cut, t: number): number => (typeof c === 'number' ? c : c(t));
const arr = (sec: number): Float64Array => new Float64Array(Math.max(1, Math.ceil(sec * SR)));

let seedCounter = 1;
/** semente determinística por nota (depende só da ordem das chamadas, que é fixa) */
const nextSeed = (): number => (seedCounter = (Math.imul(seedCounter, 1664525) + 1013904223) >>> 0);
export function resetSeeds(s = 1): void {
  seedCounter = s >>> 0;
}

/** ADSR analítico: t desde o ataque, gate = duração da nota (s), decaimentos exponenciais */
export function adsr(t: number, gate: number, a: number, d: number, s: number, r: number): number {
  const att = (x: number): number => (x <= 0 ? 0 : x >= a ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * x) / a));
  const lvl = (x: number): number => (x < a ? att(x) : s + (1 - s) * Math.exp(-(x - a) / Math.max(d, 1e-4)));
  if (t < gate) return lvl(t);
  return lvl(gate) * Math.exp(-(t - gate) / Math.max(r, 1e-4));
}

// ------------------------------------------------------------------------------------
// Pad: pulsos com PWM lento, desafinados entre L e R, + triângulo; passa-baixas suave
// ------------------------------------------------------------------------------------
export interface PadOpts {
  gain?: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  cutoff?: Cut;
  q?: number;
  detune?: number; // cents
  width?: number;
  pwm?: number; // profundidade do PWM (0..0.4)
  tri?: number; // mistura do triângulo
}
export function pad(bus: Stereo, t0: number, dur: number, notes: number[], o: PadOpts = {}): void {
  const a = o.attack ?? 0.3;
  const d = o.decay ?? 1.5;
  const sus = o.sustain ?? 0.8;
  const r = o.release ?? 0.45;
  const cut = o.cutoff ?? 1400;
  const q = o.q ?? 0.6;
  const det = o.detune ?? 7;
  const width = o.width ?? 0.65;
  const pwm = o.pwm ?? 0.22;
  const tri = o.tri ?? 0.6;
  const len = dur + r * 6;
  const N = Math.ceil(len * SR);
  const g = (o.gain ?? 1) / Math.sqrt(notes.length) * 0.35;
  const rng = new Rng(nextSeed());
  for (const side of [-1, 1]) {
    const out = new Float64Array(N);
    const f = new SVF(800, q);
    const fr = notes.map((m) => mtof(m));
    const up = Math.pow(2, (det * side) / 1200);
    const dn = Math.pow(2, (-det * 0.5 * side) / 1200);
    const o1 = notes.map(() => new PulseOsc(rng.next()));
    const o2 = notes.map(() => new PulseOsc(rng.next()));
    const o3 = notes.map(() => new TriOsc(rng.next()));
    const ph = rng.next();
    const lfo2 = 0.31 + 0.07 * rng.next();
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      if ((i & 31) === 0) f.set(cutAt(cut, t0 + t), q);
      const drift = 1 + 0.0015 * Math.sin(TAU * (0.19 * t + ph));
      const duty = 0.5 - pwm * (0.5 + 0.5 * Math.sin(TAU * (lfo2 * t + ph + side * 0.25)));
      let v = 0;
      for (let k = 0; k < fr.length; k++) {
        const f0 = fr[k] * drift;
        v += 0.5 * o1[k].next(f0 * up, duty) + 0.5 * o2[k].next(f0 * dn, 1 - duty) + tri * o3[k].next(f0);
      }
      out[i] = f.lp(v * adsr(t, dur, a, d, sus, r));
    }
    edgeFade(out, 0, 200);
    addMono(bus, s2n(t0), out, g, side * width);
  }
}

// ------------------------------------------------------------------------------------
// Pluck / arpejo: pulso estreito com envelope de filtro
// ------------------------------------------------------------------------------------
export interface PluckOpts {
  gain?: number;
  pan?: number;
  duty?: number;
  decay?: number; // tau da amplitude (s)
  gate?: number; // depois do gate, solta rápido
  cutoff?: number;
  envAmt?: number;
  envDecay?: number;
  q?: number;
  tri?: number; // camada de triângulo (corpo)
}
export function pluck(bus: Stereo, t0: number, midi: number, o: PluckOpts = {}): void {
  const f0 = mtof(midi);
  const tau = o.decay ?? 0.16;
  const gate = o.gate ?? 10;
  const len = Math.min(gate + 0.25, tau * 7) + 0.01;
  const out = arr(len);
  const osc = new PulseOsc(0);
  const tr = new TriOsc(0.25);
  const f = new SVF(1000, o.q ?? 0.8);
  const base = o.cutoff ?? 1400;
  const amt = o.envAmt ?? 2200;
  const ed = o.envDecay ?? 0.05;
  const duty = o.duty ?? 0.25;
  const triMix = o.tri ?? 0.35;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    if ((i & 15) === 0) f.set(base + amt * Math.exp(-t / ed), o.q ?? 0.8);
    let env = (t < 0.002 ? t / 0.002 : 1) * Math.exp(-t / tau);
    if (t > gate) env *= Math.exp(-(t - gate) / 0.03);
    const v = osc.next(f0, duty) * 0.7 + tr.next(f0) * triMix;
    out[i] = f.lp(v) * env;
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.3, o.pan ?? 0);
}

// ------------------------------------------------------------------------------------
// Lead: pulso com vibrato atrasado (para ganchos nas pausas da narração)
// ------------------------------------------------------------------------------------
export interface LeadOpts {
  gain?: number;
  pan?: number;
  duty?: number;
  cutoff?: number;
  vib?: number; // cents
  vibRate?: number;
  attack?: number;
  release?: number;
  glide?: number; // semitons de deslize no ataque (de baixo)
}
export function lead(bus: Stereo, t0: number, dur: number, midi: number, o: LeadOpts = {}): void {
  const f0 = mtof(midi);
  const rel = o.release ?? 0.08;
  const len = dur + rel * 6;
  const out = arr(len);
  const osc = new PulseOsc(0);
  const osc2 = new PulseOsc(0.37);
  const f = new SVF(o.cutoff ?? 2600, 0.7);
  const lp2 = new OnePole(o.cutoff ?? 2600);
  const vib = (o.vib ?? 14) / 1200;
  const vr = o.vibRate ?? 5.4;
  const glide = o.glide ?? 0.3;
  const duty = o.duty ?? 0.3;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const vdepth = vib * clamp((t - 0.12) / 0.15, 0, 1);
    const bend = -glide * Math.exp(-t / 0.018);
    const fr = f0 * Math.pow(2, bend / 12 + vdepth * Math.sin(TAU * vr * t));
    const v = osc.next(fr, duty) * 0.6 + osc2.next(fr * 1.003, 0.5) * 0.25;
    out[i] = lp2.lp(f.lp(v)) * adsr(t, dur, o.attack ?? 0.008, 0.25, 0.7, rel);
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.3, o.pan ?? 0);
}

// ------------------------------------------------------------------------------------
// Sino FM (2 operadores) e "keys" (FM de razão 1, tipo piano elétrico)
// ------------------------------------------------------------------------------------
export interface BellOpts {
  gain?: number;
  pan?: number;
  ratio?: number;
  index?: number;
  idxDecay?: number;
  decay?: number;
  attack?: number;
  lp?: number;
  detune?: number; // Hz, batimento suave
  len?: number;
}
export function bell(bus: Stereo, t0: number, midi: number, o: BellOpts = {}): void {
  const f = mtof(midi);
  const ratio = o.ratio ?? 3.5;
  const I0 = o.index ?? 1.6;
  const tauI = o.idxDecay ?? 0.18;
  const tau = o.decay ?? 0.9;
  const att = o.attack ?? 0.002;
  const len = o.len ?? Math.min(tau * 6.5, 6);
  const out = arr(len);
  const lp = new OnePole(o.lp ?? 9000);
  const det = o.detune ?? 0.7;
  let pc = 0;
  let pm = 0;
  let pc2 = 0.3;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const I = I0 * Math.exp(-t / tauI);
    const amp = (t < att ? t / att : 1) * Math.exp(-t / tau);
    const v = Math.sin(TAU * pc + I * Math.sin(TAU * pm)) * 0.75 + Math.sin(TAU * pc2) * 0.25;
    out[i] = lp.lp(v) * amp;
    pc += f / SR;
    pm += (f * ratio) / SR;
    pc2 += (f + det) / SR;
    if (pc > 1) pc -= 1;
    if (pm > 1) pm -= 1;
    if (pc2 > 1) pc2 -= 1;
  }
  edgeFade(out, 0, 200);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.3, o.pan ?? 0);
}

export function keys(bus: Stereo, t0: number, midi: number, o: BellOpts = {}): void {
  bell(bus, t0, midi, { ratio: 1, index: 1.1, idxDecay: 0.35, decay: 1.3, attack: 0.006, lp: 3200, detune: 0.9, ...o });
}

// ------------------------------------------------------------------------------------
// Baixo: triângulo em degraus (NES) + senoide de corpo, passa-baixas
// ------------------------------------------------------------------------------------
export interface BassOpts {
  gain?: number;
  pan?: number;
  cutoff?: number;
  sub?: number;
  steps?: number;
  slide?: number; // semitons (deslize no ataque)
  decay?: number;
  sustain?: number;
}
export function bass(bus: Stereo, t0: number, dur: number, midi: number, o: BassOpts = {}): void {
  const f0 = mtof(midi);
  const rel = 0.045;
  const len = dur + rel * 6;
  const out = arr(len);
  const tri = new TriOsc(0);
  const sin = new SinOsc(0.25);
  const l1 = new OnePole(o.cutoff ?? 1100);
  const l2 = new OnePole(o.cutoff ?? 1100);
  const sub = o.sub ?? 0.45;
  const steps = o.steps ?? 16;
  const slide = o.slide ?? 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fr = f0 * Math.pow(2, (-slide * Math.exp(-t / 0.03)) / 12);
    const v = tri.next(fr, steps) * 0.8 + sin.next(fr) * sub;
    out[i] = l2.lp(l1.lp(v)) * adsr(t, dur, 0.004, o.decay ?? 0.25, o.sustain ?? 0.72, rel);
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.5, o.pan ?? 0);
}

// ------------------------------------------------------------------------------------
// Bateria (ruído determinístico + senoides)
// ------------------------------------------------------------------------------------
export interface DrumOpts {
  gain?: number;
  pan?: number;
  decay?: number;
  tone?: number;
  bright?: number;
}
export function kick(bus: Stereo, t0: number, o: DrumOpts & { f0?: number; f1?: number; click?: number } = {}): void {
  const len = 0.55;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const lp = new OnePole(2500);
  const fa = o.f0 ?? 150;
  const fb = o.f1 ?? 47;
  const tau = o.decay ?? 0.22;
  const click = o.click ?? 0.18;
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fr = fb + (fa - fb) * Math.exp(-t / 0.032);
    ph += fr / SR;
    const amp = (t < 0.0015 ? t / 0.0015 : 1) * Math.exp(-t / tau);
    const body = Math.sin(TAU * ph) * amp;
    const c = lp.lp(nz[i]) * Math.exp(-t / 0.004) * click;
    out[i] = Math.tanh(1.6 * (body + c)) / Math.tanh(1.6);
  }
  edgeFade(out, 0, 400);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.8, o.pan ?? 0);
}

export function snare(bus: Stereo, t0: number, o: DrumOpts = {}): void {
  const len = 0.45;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const hp = new SVF(1100, 0.7);
  const lp = new SVF(o.bright ?? 6500, 0.7);
  const tau = o.decay ?? 0.11;
  const tone = o.tone ?? 0.55;
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fr = 172 + 40 * Math.exp(-t / 0.012);
    ph += fr / SR;
    const att = t < 0.001 ? t / 0.001 : 1;
    const body = Math.sin(TAU * ph) * Math.exp(-t / 0.045) * tone;
    const nn = lp.lp(hp.hp(nz[i])) * Math.exp(-t / tau);
    out[i] = (body + nn * 0.9) * att;
  }
  edgeFade(out, 0, 300);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.55, o.pan ?? 0);
}

export function hat(bus: Stereo, t0: number, o: DrumOpts & { hp?: number } = {}): void {
  const tau = o.decay ?? 0.032;
  const len = Math.min(tau * 7, 1.2) + 0.005;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const hp = new SVF(o.hp ?? 7200, 0.75);
  const lp = new OnePole(o.bright ?? 13000);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const att = t < 0.0006 ? t / 0.0006 : 1;
    out[i] = lp.lp(hp.hp(nz[i])) * att * Math.exp(-t / tau);
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.5, o.pan ?? 0);
}

export function shaker(bus: Stereo, t0: number, o: DrumOpts = {}): void {
  const len = 0.16;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const bp = new SVF(5600, 1.1);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = t < 0.014 ? (t / 0.014) ** 2 : Math.exp(-(t - 0.014) / (o.decay ?? 0.035));
    out[i] = bp.bp(nz[i]) * env;
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.6, o.pan ?? 0);
}

export function tom(bus: Stereo, t0: number, freq: number, o: DrumOpts = {}): void {
  const len = 0.5;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const lp = new SVF(1800, 0.7);
  const tau = o.decay ?? 0.2;
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const fr = freq * (1 + 0.55 * Math.exp(-t / 0.04));
    ph += fr / SR;
    const att = t < 0.0015 ? t / 0.0015 : 1;
    out[i] = (Math.sin(TAU * ph) * Math.exp(-t / tau) + lp.lp(nz[i]) * Math.exp(-t / 0.02) * 0.35) * att;
  }
  edgeFade(out, 0, 300);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.6, o.pan ?? 0);
}

/** "toc" de bloco de madeira bem suave (acentos) */
export function tok(bus: Stereo, t0: number, freq = 900, o: DrumOpts = {}): void {
  const len = 0.12;
  const out = arr(len);
  const nz = noise(out.length, nextSeed());
  const bp = new SVF(freq * 1.9, 4);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (freq * (1 + 0.25 * Math.exp(-t / 0.006))) / SR;
    const att = t < 0.0008 ? t / 0.0008 : 1;
    out[i] = (Math.sin(TAU * ph) * Math.exp(-t / (o.decay ?? 0.022)) + bp.bp(nz[i]) * 0.5 * Math.exp(-t / 0.008)) * att;
  }
  edgeFade(out, 0, 96);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.5, o.pan ?? 0);
}

/** prato: ruído descorrelacionado L/R, passa-altas, brilho que escurece com o tempo */
export function crash(bus: Stereo, t0: number, o: DrumOpts & { hp?: number } = {}): void {
  const tau = o.decay ?? 1.6;
  const len = Math.min(tau * 5, 7);
  for (const side of [-1, 1]) {
    const out = arr(len);
    const nz = noise(out.length, nextSeed());
    const hp = new SVF(o.hp ?? 2800, 0.6);
    const lp = new SVF(12000, 0.6);
    const pk = new SVF(5200, 2.2);
    for (let i = 0; i < out.length; i++) {
      const t = i / SR;
      if ((i & 63) === 0) lp.set(5000 + 9000 * Math.exp(-t / 0.5), 0.6);
      const att = t < 0.003 ? t / 0.003 : 1;
      const x = hp.hp(nz[i]);
      out[i] = (lp.lp(x) + pk.bp(x) * 0.6) * att * Math.exp(-t / tau);
    }
    edgeFade(out, 0, 400);
    addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.35, side * 0.7);
  }
}

/** prato ao contrário (sobe até tEnd e corta seco: "noise swell" que pousa na batida) */
export function swell(bus: Stereo, tEnd: number, dur: number, o: { gain?: number; hp?: number; curve?: number } = {}): void {
  const curve = o.curve ?? 2.6;
  for (const side of [-1, 1]) {
    const out = arr(dur);
    const nz = noise(out.length, nextSeed());
    const hp = new SVF(o.hp ?? 2400, 0.6);
    const lp = new SVF(4000, 0.6);
    for (let i = 0; i < out.length; i++) {
      const u = i / out.length;
      if ((i & 63) === 0) lp.set(3500 + 10000 * u * u, 0.6);
      out[i] = lp.lp(hp.hp(nz[i])) * Math.pow(u, curve);
    }
    edgeFade(out, 0, 240); // corte em 5 ms exatamente no instante da batida
    addMono(bus, s2n(tEnd - dur), out, (o.gain ?? 1) * 0.35, side * 0.6);
  }
}

/** riser: ruído em passa-banda que sobe de f0 a f1 + tom senoidal opcional que sobe */
export function riser(
  bus: Stereo,
  t0: number,
  dur: number,
  o: { gain?: number; f0?: number; f1?: number; q?: number; tone?: [number, number]; toneGain?: number; curve?: number } = {},
): void {
  const f0 = o.f0 ?? 400;
  const f1 = o.f1 ?? 6000;
  const curve = o.curve ?? 2;
  for (const side of [-1, 1]) {
    const out = arr(dur);
    const nz = noise(out.length, nextSeed());
    const bp = new SVF(f0, o.q ?? 2.2);
    let ph = side > 0 ? 0.25 : 0;
    for (let i = 0; i < out.length; i++) {
      const u = i / out.length;
      if ((i & 31) === 0) bp.set(f0 * Math.pow(f1 / f0, u), o.q ?? 2.2);
      let v = bp.bp(nz[i]) * 1.4;
      if (o.tone) {
        const m = o.tone[0] + (o.tone[1] - o.tone[0]) * u;
        ph += (mtof(m) * (1 + side * 0.002)) / SR;
        v += Math.sin(TAU * ph) * (o.toneGain ?? 0.25);
      }
      out[i] = v * Math.pow(u, curve);
    }
    edgeFade(out, 48, 240);
    addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.4, side * 0.5);
  }
}

/** grave "boom": senoide que cai de f0 a f1 */
export function boom(bus: Stereo, t0: number, o: { gain?: number; f0?: number; f1?: number; decay?: number; glide?: number } = {}): void {
  const tau = o.decay ?? 0.8;
  const len = tau * 6;
  const out = arr(len);
  const fa = o.f0 ?? 70;
  const fb = o.f1 ?? 41;
  const gl = o.glide ?? 0.25;
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (fb + (fa - fb) * Math.exp(-t / gl)) / SR;
    const att = t < 0.004 ? t / 0.004 : 1;
    out[i] = Math.sin(TAU * ph) * Math.exp(-t / tau) * att;
  }
  edgeFade(out, 0, 400);
  addMono(bus, s2n(t0), out, (o.gain ?? 1) * 0.6, 0);
}

// ------------------------------------------------------------------------------------
// Mixer: barramentos com envio para reverb e delay, e "ducking" (sidechain) pelo bumbo
// ------------------------------------------------------------------------------------
export interface BusSpec {
  gain?: number;
  rev?: number;
  dly?: number;
  duck?: number; // 0..1: profundidade relativa do sidechain
  pan?: number;
}
export interface MixOpts {
  room?: number;
  damp?: number;
  revLp?: number;
  revHp?: number;
  revGain?: number;
  predelay?: number;
  delay?: number;
  delayFb?: number;
  delayLp?: number;
  dlyToRev?: number;
  duckDepth?: number; // dB
  duckTau?: number;
}
export class Mixer {
  private buses = new Map<string, { s: Stereo; spec: BusSpec }>();
  kickTimes: number[] = [];
  constructor(public n: number, private specs: Record<string, BusSpec>) {}
  bus(name: string): Stereo {
    let b = this.buses.get(name);
    if (!b) {
      const spec = this.specs[name];
      if (!spec) throw new Error(`barramento desconhecido: ${name}`);
      b = { s: new Stereo(this.n), spec };
      this.buses.set(name, b);
    }
    return b.s;
  }
  /** curva de ganho do sidechain (1 = sem redução) */
  private duckCurve(depthDb: number, tau: number): Float64Array {
    const g = new Float64Array(this.n).fill(1);
    const depth = 1 - Math.pow(10, -depthDb / 20);
    const ks = [...this.kickTimes].sort((a, b) => a - b);
    for (let k = 0; k < ks.length; k++) {
      const st = s2n(ks[k]);
      const end = Math.min(this.n, k + 1 < ks.length ? s2n(ks[k + 1]) + 1 : this.n, st + Math.round(tau * 8 * SR));
      for (let i = Math.max(0, st); i < end; i++) {
        const t = (i - st) / SR;
        const v = 1 - depth * (1 - Math.exp(-t / 0.006)) * Math.exp(-t / tau);
        if (v < g[i]) g[i] = v;
      }
    }
    return g;
  }
  /** depuração (SEGUE_STEMS=1): RMS de cada barramento (já com ganho) nas janelas de 100 ms com som */
  report(): void {
    const W = Math.round(0.1 * SR);
    const rows: string[] = [];
    for (const [name, { s, spec }] of [...this.buses.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      let acc = 0;
      let cnt = 0;
      let pk = 0;
      for (let st = 0; st + W <= this.n; st += W) {
        let e = 0;
        for (let i = st; i < st + W; i++) e += s.L[i] * s.L[i] + s.R[i] * s.R[i];
        if (e / (2 * W) > 1e-9) {
          acc += e;
          cnt += 2 * W;
        }
      }
      for (let i = 0; i < this.n; i++) pk = Math.max(pk, Math.abs(s.L[i]), Math.abs(s.R[i]));
      const g = spec.gain ?? 1;
      rows.push(`${name.padEnd(6)} rms ${(10 * Math.log10(acc / Math.max(cnt, 1)) + 20 * Math.log10(g)).toFixed(1).padStart(6)}  pico ${(20 * Math.log10(pk * g + 1e-12)).toFixed(1).padStart(6)}`);
    }
    console.log(`  [barramentos, ${(this.n / SR).toFixed(1)} s]\n  ` + rows.join('\n  '));
  }
  render(o: MixOpts = {}): Stereo {
    const out = new Stereo(this.n);
    const revIn = new Stereo(this.n);
    const dlyIn = new Stereo(this.n);
    const duck = this.kickTimes.length ? this.duckCurve(o.duckDepth ?? 3, o.duckTau ?? 0.14) : null;
    for (const [, { s, spec }] of [...this.buses.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      const gain = spec.gain ?? 1;
      const dk = spec.duck ?? 0;
      const [pl, pr] = panGains(spec.pan ?? 0);
      for (let i = 0; i < this.n; i++) {
        let g = gain;
        if (duck && dk > 0) g *= 1 - dk * (1 - duck[i]);
        const l = s.L[i] * g * pl;
        const r = s.R[i] * g * pr;
        out.L[i] += l;
        out.R[i] += r;
        if (spec.rev) {
          revIn.L[i] += l * spec.rev;
          revIn.R[i] += r * spec.rev;
        }
        if (spec.dly) {
          dlyIn.L[i] += l * spec.dly;
          dlyIn.R[i] += r * spec.dly;
        }
      }
    }
    if (process.env.SEGUE_STEMS) this.report();
    const dly = pingPong(dlyIn, o.delay ?? 0.42, o.delayFb ?? 0.38, o.delayLp ?? 3200);
    revIn.mix(dly, o.dlyToRev ?? 0.3);
    const rev = reverb(revIn, { room: o.room ?? 0.72, damp: o.damp ?? 0.55, lp: o.revLp ?? 5500, hp: o.revHp ?? 220, predelay: o.predelay ?? 0.014 });
    out.mix(dly, 1);
    out.mix(rev, o.revGain ?? 1);
    return out;
  }
}
