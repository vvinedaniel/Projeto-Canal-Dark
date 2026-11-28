// Trilhas do SegueCity: demo (15 s) e ep01 (75 s). Fá maior / Ré menor, acordes lo-fi com sétima.
// Os tempos de cada seção vêm das cenas do vídeo; dentro de cada seção o andamento é ajustado
// (~105–111 BPM) para que toda troca de cena caia exatamente num tempo forte.
import { Biquad, OnePole, Rng, SR, Stereo, clamp, db, filterStereo, nm, s2n, saturate, tapeStop } from './dsp';
import * as I from './instruments';

// ------------------------------------------------------------------------------------
// grade rítmica
// ------------------------------------------------------------------------------------
export class Grid {
  constructor(public t0: number, public spb: number, public swing = 0) {}
  static fit(t0: number, t1: number, beats: number, swing = 0): Grid {
    return new Grid(t0, (t1 - t0) / beats, swing);
  }
  get bpm(): number {
    return 60 / this.spb;
  }
  get s16(): number {
    return this.spb / 4;
  }
  b(beat: number): number {
    return this.t0 + beat * this.spb;
  }
  /** semicolcheia i (a partir de t0), com swing nas ímpares */
  s(i: number): number {
    return this.t0 + (i + (Math.abs(i % 2) === 1 ? this.swing : 0)) * this.s16;
  }
  /** semicolcheia (sem swing) mais próxima de t */
  q(t: number): number {
    return this.t0 + Math.round((t - this.t0) / this.s16) * this.s16;
  }
}

// ------------------------------------------------------------------------------------
// acordes (vozes do pad, baixo, notas para arpejo)
// ------------------------------------------------------------------------------------
interface Chord {
  pad: number[];
  bass: number;
  tones: number[];
}
const C = (pad: string[], bass: string, tones: string[]): Chord => ({ pad: pad.map(nm), bass: nm(bass), tones: tones.map(nm) });
export const CH = {
  Fmaj7: C(['F3', 'A3', 'C4', 'E4'], 'F2', ['F4', 'A4', 'C5', 'E5']),
  Em7: C(['E3', 'G3', 'B3', 'D4'], 'E2', ['E4', 'G4', 'B4', 'D5']),
  Dm7: C(['D3', 'F3', 'A3', 'C4', 'E4'], 'D2', ['D4', 'F4', 'A4', 'C5']),
  Cmaj7: C(['E3', 'G3', 'B3', 'D4'], 'C2', ['E4', 'G4', 'B4', 'D5']),
  Am7: C(['E3', 'G3', 'A3', 'C4'], 'A1', ['E4', 'G4', 'A4', 'C5']),
  Bbmaj7: C(['D3', 'F3', 'A3', 'C4'], 'Bb1', ['F4', 'A4', 'Bb4', 'D5']),
  C: C(['E3', 'G3', 'C4', 'D4'], 'C2', ['E4', 'G4', 'C5', 'D5']),
  Csus4: C(['F3', 'G3', 'C4', 'D4'], 'C2', ['F4', 'G4', 'C5', 'D5']),
  C7sus4: C(['F3', 'G3', 'Bb3', 'D4'], 'C2', ['F4', 'G4', 'Bb4', 'D5']),
  C7: C(['E3', 'G3', 'Bb3', 'D4'], 'C2', ['E4', 'G4', 'Bb4', 'D5']),
  C6: C(['E3', 'G3', 'A3', 'D4'], 'C2', ['E4', 'G4', 'A4', 'D5']),
  Gm7: C(['F3', 'A3', 'Bb3', 'D4'], 'G1', ['F4', 'G4', 'Bb4', 'D5']),
  Fmaj9: C(['C3', 'F3', 'A3', 'E4', 'G4', 'C5'], 'F1', ['F5', 'A5', 'C6', 'E6']),
};

// ------------------------------------------------------------------------------------
// padrões (posições em semicolcheias dentro do compasso)
// ------------------------------------------------------------------------------------
type BassStep = [pos: number, len: number, semis: number];
const BASS_LIGHT: BassStep[] = [[0, 5, 0], [6, 2, 0], [8, 5, 0], [14, 2, 12]];
const BASS_BOUNCE: BassStep[] = [[0, 3, 0], [3, 1, 12], [6, 2, 0], [8, 3, 0], [11, 1, 12], [14, 2, 7]];
const BASS_WALK: BassStep[] = [[0, 3, 0], [3, 1, 12], [6, 2, 0], [8, 2, 0], [10, 2, 7], [12, 3, 0], [15, 1, 12]];
const BASS_DRIVE: BassStep[] = [[0, 2, 0], [2, 2, 12], [4, 2, 0], [6, 2, 0], [8, 2, 0], [10, 2, 12], [12, 2, 0], [14, 2, 7]];
const BASS_LONG: BassStep[] = [[0, 7, 0], [8, 6, 0], [14, 2, 7]];
const COUNTER: [pos: number, tone: number][] = [[2, 2], [5, 1], [7, 3], [10, 2], [13, 0], [15, 1]];
const EIGHTHS = [0, 2, 4, 6, 8, 10, 12, 14];
const SIXTEENTHS = [...Array(16).keys()];

interface ArpSpec {
  pat: number[]; // índices em chord.tones (>= 4 sobe oitava)
  step: 1 | 2; // 1 = semicolcheias, 2 = colcheias
  gain?: number;
  oct?: number;
  cutoff?: number;
  pan?: number;
}
interface BarSpec {
  chord: Chord;
  chord2?: Chord; // a partir de split
  split?: number;
  beats?: number;
  pad?: I.PadOpts | false;
  padHi?: number; // camada uma oitava acima (ganho)
  bass?: BassStep[] | false;
  bassGain?: number;
  kick?: number[];
  kickGain?: number;
  snare?: number[];
  snareGain?: number;
  ghost?: number[];
  hats?: number[];
  hatGain?: number;
  open?: number[];
  shaker?: number[];
  arp?: ArpSpec;
  counter?: { gain?: number; pan?: number; oct?: number; cutoff?: number };
}

const BUSES: Record<string, I.BusSpec> = {
  pad: { gain: 0.32, rev: 0.3, duck: 0.6 },
  bass: { gain: 2.2, duck: 0.4 },
  kick: { gain: 0.63, rev: 0.03 },
  snare: { gain: 1.6, rev: 0.25 },
  hat: { gain: 1.1, rev: 0.06 },
  perc: { gain: 0.7, rev: 0.2 },
  arp: { gain: 1.3, rev: 0.22, dly: 0.35, duck: 0.3 },
  pluck: { gain: 1.1, rev: 0.18, dly: 0.25, duck: 0.25 },
  bell: { gain: 1.1, rev: 0.4, dly: 0.3 },
  keys: { gain: 1.2, rev: 0.6, dly: 0.4 },
  lead: { gain: 1.4, rev: 0.25, dly: 0.3 },
  fx: { gain: 0.8, rev: 0.25 },
  sub: { gain: 0.9 },
};

const MIX: I.MixOpts = { room: 0.74, damp: 0.5, revLp: 5200, revHp: 230, revGain: 0.9, delay: 0.415, delayFb: 0.36, delayLp: 3000, dlyToRev: 0.35, duckDepth: 3.5, duckTau: 0.13 };

/** um compasso de groove completo */
function playBar(mx: I.Mixer, g: Grid, bar16: number, sp: BarSpec, rng: Rng): void {
  const beats = sp.beats ?? 4;
  const n16 = beats * 4;
  const split = sp.chord2 ? sp.split ?? 8 : n16;
  const chordAt = (p: number): Chord => (p < split ? sp.chord : sp.chord2!);
  const hum = (v: number): number => v * (1 + 0.1 * rng.uni());
  // pad
  if (sp.pad !== false) {
    const po = { attack: 0.08, cutoff: 1500, ...(sp.pad ?? {}) };
    const segs: [number, number, Chord][] = sp.chord2 ? [[0, split, sp.chord], [split, n16, sp.chord2]] : [[0, n16, sp.chord]];
    for (const [a, b, ch] of segs) {
      const t = g.s(bar16 + a);
      const dur = (b - a) * g.s16 + 0.02;
      I.pad(mx.bus('pad'), t, dur, ch.pad, po);
      if (sp.padHi) I.pad(mx.bus('pad'), t, dur, ch.pad.slice(-2).map((m) => m + 12), { ...po, gain: sp.padHi, width: 0.9 });
    }
  }
  // baixo
  if (sp.bass) {
    for (const [p, l, s] of sp.bass) {
      if (p >= n16) continue;
      const len = Math.min(l, n16 - p);
      I.bass(mx.bus('bass'), g.s(bar16 + p), len * g.s16 * 0.9, chordAt(p).bass + s, { gain: hum(sp.bassGain ?? 0.9), slide: s === 12 ? 0.6 : 0 });
    }
  }
  // bateria
  for (const p of sp.kick ?? []) {
    if (p >= n16) continue;
    const t = g.s(bar16 + p);
    I.kick(mx.bus('kick'), t, { gain: hum(sp.kickGain ?? 0.9) * (p % 4 === 0 ? 1 : 0.8) });
    mx.kickTimes.push(t);
  }
  for (const p of sp.snare ?? []) if (p < n16) I.snare(mx.bus('snare'), g.s(bar16 + p), { gain: hum(sp.snareGain ?? 0.8) });
  for (const p of sp.ghost ?? []) if (p < n16) I.snare(mx.bus('snare'), g.s(bar16 + p), { gain: hum(0.18), decay: 0.06 });
  for (const p of sp.hats ?? []) {
    if (p >= n16) continue;
    const acc = p % 4 === 2 ? 0.85 : p % 4 === 0 ? 0.6 : 0.42;
    I.hat(mx.bus('hat'), g.s(bar16 + p), { gain: hum(acc * (sp.hatGain ?? 1)), pan: 0.15 });
  }
  for (const p of sp.open ?? []) if (p < n16) I.hat(mx.bus('hat'), g.s(bar16 + p), { gain: hum(0.45 * (sp.hatGain ?? 1)), decay: 0.16, hp: 6500, pan: -0.15 });
  for (const p of sp.shaker ?? []) if (p < n16) I.shaker(mx.bus('perc'), g.s(bar16 + p), { gain: hum(0.5), pan: -0.35 });
  // arpejo
  if (sp.arp) {
    const a = sp.arp;
    let k = 0;
    for (let p = 0; p < n16; p += a.step, k++) {
      const ch = chordAt(p);
      const idx = a.pat[k % a.pat.length];
      const m = ch.tones[idx % 4] + 12 * Math.floor(idx / 4) + 12 * (a.oct ?? 0);
      I.pluck(mx.bus('arp'), g.s(bar16 + p), m, {
        gain: hum(a.gain ?? 0.6) * (p % 4 === 0 ? 1 : 0.8),
        pan: a.pan ?? (k % 2 ? 0.35 : -0.35),
        cutoff: a.cutoff ?? 1250,
        envAmt: 1500,
        decay: a.step === 1 ? 0.1 : 0.15,
        duty: 0.125,
      });
    }
  }
  // contracanto "plucky"
  if (sp.counter) {
    const c = sp.counter;
    for (const [p, ti] of COUNTER) {
      if (p >= n16) continue;
      const m = chordAt(p).tones[ti] + 12 * (c.oct ?? 0);
      I.pluck(mx.bus('pluck'), g.s(bar16 + p), m, { gain: hum(c.gain ?? 0.7), pan: c.pan ?? 0.35, cutoff: c.cutoff ?? 1150, envAmt: 2300, envDecay: 0.04, decay: 0.13, duty: 0.25, gate: g.s16 * 1.4 });
    }
  }
}

/** bolso para a voz: atenua ~depthDb a faixa 1–4 kHz dentro das janelas de fala (rampa suave) */
export function voicePocket(s: Stereo, windows: [number, number][], depthDb = 3, ramp = 0.18): Stereo {
  const g = db(-depthDb);
  const w = (t: number): number => {
    let v = 0;
    for (const [a, b] of windows) {
      const x = clamp(Math.min((t - (a - ramp)) / ramp, (b + ramp - t) / ramp), 0, 1);
      if (x > v) v = x;
    }
    return v * v * (3 - 2 * v);
  };
  for (const ch of [s.L, s.R]) {
    const lo = new OnePole(1000);
    const hi = new OnePole(4200);
    let gv = 1;
    for (let i = 0; i < s.n; i++) {
      if ((i & 63) === 0) gv = 1 - (1 - g) * w(i / SR);
      const x = ch[i];
      const low = lo.lp(x);
      const rest = x - low;
      const high = rest - hi.lp(rest);
      const mid = rest - high;
      ch[i] = low + mid * gv + high;
    }
  }
  return s;
}

/** acabamento comum: passa-altas 24 Hz (sem DC), leve brilho, saturação suave */
function master(s: Stereo, drive = 1.0): Stereo {
  filterStereo(s, () => [Biquad.make('hp', 24, 0.707), Biquad.make('hp', 24, 0.707), Biquad.make('highshelf', 9000, 0.7, -1.5)]);
  const p = s.peak();
  if (p > 0) s.scale(0.9 / p);
  return saturate(s, drive);
}

/** fade-out em cosseno de a até b (silêncio absoluto depois de b) */
function fadeOut(s: Stereo, a: number, b: number): Stereo {
  return s.envelope((t) => (t <= a ? 1 : t >= b ? 0 : 0.5 + 0.5 * Math.cos((Math.PI * (t - a)) / (b - a))), 1);
}

// ====================================================================================
// EP01 (75 s)
// ====================================================================================
export const EP01_SECTIONS = [
  { t0: 0.0, t1: 8.0, name: 'wonder (maravilha)', beats: 0, voice: [0.3, 7.6] },
  { t0: 8.0, t1: 15.0, name: 'empty city (cidade vazia)', beats: 0, voice: [8.4, 9.8] },
  { t0: 15.0, t1: 24.0, name: 'the idea (a ideia)', beats: 16, voice: [15.2, 23.6] },
  { t0: 24.0, t1: 35.0, name: 'your character (seu personagem)', beats: 20, voice: [24.2, 34.2] },
  { t0: 35.0, t1: 48.0, name: 'jobs tour (profissões)', beats: 24, voice: [35.2, 47.0] },
  { t0: 48.0, t1: 58.0, name: 'growth (crescimento)', beats: 18, voice: [48.2, 57.6] },
  { t0: 58.0, t1: 68.0, name: 'future/mayor (futuro/prefeito)', beats: 18, voice: [58.2, 67.6] },
  { t0: 68.0, t1: 75.0, name: 'finale/CTA', beats: 7, voice: [68.1, 74.6] },
] as const;
export const EP01_VOICE: [number, number][] = EP01_SECTIONS.map((s) => [s.voice[0], s.voice[1]]);
// uma batida por profissão falada (mesmos tempos de src/scenes/ep01/narration.ts)
export const EP01_ACCENT_TARGETS = [37.1, 38.9, 40.7, 42.5, 44.3, 46.1];
export const EP01_INFO: { accents: number[]; tempos: { t0: number; t1: number; bpm: number }[] } = { accents: [], tempos: [] };

function ep01Intro(): Stereo {
  I.resetSeeds(101);
  const rng = new Rng(1101);
  const mx = new I.Mixer(s2n(9.2), BUSES);
  const g = new Grid(0, 60 / 104, 0.08);
  EP01_INFO.tempos.push({ t0: 0, t1: 8, bpm: g.bpm });
  const chords = [CH.Fmaj7, CH.Em7, CH.Dm7, CH.Cmaj7];
  for (let k = 0; k < 4; k++) {
    const ch = chords[k];
    const t = g.b(4 * k);
    I.pad(mx.bus('pad'), t, k < 3 ? 4 * g.spb + 0.02 : 2.0, ch.pad, { attack: k === 0 ? 0.16 : 0.1, cutoff: 1250, gain: 0.95 });
    for (let e = 0; e < 8; e++) {
      const i16 = 16 * k + 2 * e;
      const te = g.s(i16);
      if (te > 8.25) break;
      // pulso leve: baixo staccato em colcheias
      I.bass(mx.bus('bass'), te, g.s16 * 1.1, ch.bass + (e % 4 === 3 ? 12 : 0), { gain: e % 2 ? 0.42 : 0.6, decay: 0.07, sustain: 0.25 });
      // arpejo curioso (registro médio, filtrado: não briga com a voz)
      const pat = [0, 1, 2, 3, 1, 2, 3, 2];
      I.pluck(mx.bus('arp'), te, ch.tones[pat[e]], { gain: 0.34 + 0.1 * rng.next(), pan: e % 2 ? 0.3 : -0.3, cutoff: 1150, envAmt: 1400, decay: 0.15, duty: 0.125 });
      if (e % 2 === 1) I.shaker(mx.bus('perc'), te, { gain: 0.3, pan: -0.3 });
    }
    // brilhos esparsos (luzes da cidade), notas do acorde duas oitavas acima
    for (const b of [1.5, 3]) {
      const tb = g.b(4 * k + b);
      if (tb > 7.4) continue;
      I.bell(mx.bus('bell'), tb, ch.tones[rng.int(4)] + 24, { gain: 0.22, decay: 0.45, index: 1.0, pan: rng.uni() * 0.7 });
    }
  }
  // primeiro quadro: glissando de brilho (antes da voz entrar em 0,3 s)
  ['C6', 'F6', 'A6', 'C7'].forEach((n, i) => I.bell(mx.bus('bell'), 0.004 + i * 0.055, nm(n), { gain: 0.5 - i * 0.06, decay: 0.55, index: 1.2, pan: -0.45 + i * 0.3 }));
  // floreio na pausa 7,6–8,0 (Cmaj7), que o "tape stop" engole
  ([[53, 'C6'], [54, 'E6'], [55, 'G6'], [56, 'B6']] as [number, string][]).forEach(([i, n]) => {
    I.bell(mx.bus('bell'), g.s(i), nm(n), { gain: 0.45, decay: 0.5, pan: -0.3 + (i - 53) * 0.2 });
    I.pluck(mx.bus('arp'), g.s(i), nm(n) - 12, { gain: 0.6, cutoff: 1900, decay: 0.12, duty: 0.25 });
  });
  const mixed = mx.render(MIX);
  return tapeStop(mixed, 8.0, 0.42, 1.7);
}

function ep01Main(): Stereo {
  I.resetSeeds(202);
  const rng = new Rng(2202);
  const mx = new I.Mixer(s2n(75), BUSES);
  const pad = mx.bus('pad');
  const fx = mx.bus('fx');
  const bellB = mx.bus('bell');

  // ---------------- 8–15: cidade vazia -------------------------------------------
  // "desligamento": grave caindo junto com o tape stop
  I.boom(fx, 8.0, { f0: 150, f1: 34, glide: 0.16, decay: 0.3, gain: 0.3 });
  I.pad(pad, 8.55, 6.0, ['D3', 'A3', 'E4'].map(nm), { attack: 1.5, release: 0.6, cutoff: 620, gain: 0.32, width: 0.85, pwm: 0.08, tri: 0.9 });
  const motif: [number, string, number][] = [
    [10.1, 'A4', 0.9], [10.8, 'D5', 0.8], [11.5, 'C5', 0.72], [12.05, 'A4', 0.7], [12.9, 'G4', 0.62], [13.5, 'E4', 0.55],
  ];
  motif.forEach(([t, n, v], i) => I.keys(mx.bus('keys'), t, nm(n), { gain: v * 0.33, pan: i % 2 ? 0.25 : -0.2, decay: 1.4 }));
  // sobe para a ideia (14–15)
  I.riser(fx, 14.0, 1.0, { f0: 350, f1: 7000, gain: 0.5, tone: [nm('A3'), nm('A5')], toneGain: 0.12, curve: 2.2 });
  I.swell(fx, 15.0, 1.0, { gain: 0.45 });

  // ---------------- 15–24: a ideia (16 tempos) ------------------------------------
  const g2 = Grid.fit(15, 24, 16, 0.1);
  EP01_INFO.tempos.push({ t0: 15, t1: 24, bpm: g2.bpm });
  I.crash(fx, 15.0, { gain: 0.32, decay: 1.1 });
  const s2: Chord[] = [CH.Fmaj7, CH.Am7, CH.Bbmaj7, CH.Csus4];
  for (let k = 0; k < 4; k++) {
    playBar(mx, g2, 16 * k, {
      chord: s2[k],
      chord2: k === 3 ? CH.C : undefined,
      pad: { cutoff: 1450, gain: 0.9 },
      bass: BASS_LIGHT,
      bassGain: 0.85,
      kick: k % 2 ? [0, 8, 10] : [0, 8],
      kickGain: 0.8,
      hats: EIGHTHS,
      hatGain: 0.8,
      snare: k === 3 ? [] : [],
      arp: k >= 1 ? { pat: [0, 2, 1, 3, 2, 1, 3, 2], step: 2, gain: 0.5, cutoff: 1200 } : undefined,
    }, rng);
  }
  I.snare(mx.bus('snare'), g2.s(62), { gain: 0.3 });
  I.snare(mx.bus('snare'), g2.s(63), { gain: 0.45 });
  // pausa 23,6–24,2: três sininhos subindo até o F6 da cena seguinte
  ([[61, 'A5'], [62, 'C6'], [63, 'D6'], [64, 'F6']] as [number, string][]).forEach(([i, n], j) =>
    I.bell(bellB, g2.s(i), nm(n), { gain: 0.42 + j * 0.04, decay: j === 3 ? 0.5 : 0.35, pan: -0.3 + j * 0.2 }),
  );

  // ---------------- 24–35: seu personagem (20 tempos) ------------------------------
  const g3 = Grid.fit(24, 35, 20, 0.12);
  EP01_INFO.tempos.push({ t0: 24, t1: 35, bpm: g3.bpm });
  const s3: [Chord, Chord?][] = [[CH.Dm7], [CH.Bbmaj7], [CH.Fmaj7], [CH.C], [CH.Gm7, CH.C7]];
  s3.forEach(([a, b], k) =>
    playBar(mx, g3, 16 * k, {
      chord: a,
      chord2: b,
      pad: { cutoff: 1400, gain: 0.82 },
      bass: BASS_BOUNCE,
      kick: [0, 6, 8],
      kickGain: 0.88,
      snare: [4, 12],
      snareGain: 0.7,
      ghost: k % 2 ? [7, 15] : [15],
      hats: [...EIGHTHS, 3, 11],
      hatGain: 0.9,
      counter: { gain: 0.72, pan: 0.35 },
    }, rng),
  );
  // pausa 34,2–35,2: virada de sino no C7 (último tempo)
  ([[76, 'G5'], [77, 'Bb5'], [78, 'C6'], [79, 'E6']] as [number, string][]).forEach(([i, n], j) => {
    I.bell(bellB, g3.s(i), nm(n), { gain: 0.4 + 0.04 * j, decay: 0.32, pan: 0.3 - j * 0.2 });
  });

  // ---------------- 35–48: profissões (24 tempos) -----------------------------------
  const g4 = Grid.fit(35, 48, 24, 0.12);
  EP01_INFO.tempos.push({ t0: 35, t1: 48, bpm: g4.bpm });
  const s4: [Chord, Chord?][] = [[CH.Fmaj7], [CH.Em7], [CH.Dm7], [CH.Cmaj7], [CH.Bbmaj7], [CH.C7sus4, CH.C7]];
  s4.forEach(([a, b], k) =>
    playBar(mx, g4, 16 * k, {
      chord: a,
      chord2: b,
      pad: { cutoff: 1550, gain: 0.9 },
      padHi: 0.28,
      bass: BASS_WALK,
      kick: k === 5 ? [0, 6, 8, 14] : [0, 6, 8],
      kickGain: 0.9,
      snare: [4, 12],
      snareGain: 0.75,
      ghost: [15],
      hats: SIXTEENTHS,
      hatGain: 0.75,
      shaker: [2, 6, 10, 14],
      arp: { pat: [0, 1, 2, 3, 2, 1, 3, 1], step: 2, gain: 0.42, cutoff: 1150, pan: -0.4 },
      counter: { gain: 0.55, pan: 0.4 },
    }, rng),
  );
  // acentos das profissões (~a cada 2 s), na semicolcheia mais próxima
  const accentNotes = ['C6', 'D6', 'F6', 'G6', 'A6', 'C7'];
  EP01_ACCENT_TARGETS.forEach((tt, i) => {
    const t = g4.q(tt);
    EP01_INFO.accents.push(t);
    I.tok(mx.bus('perc'), t, 820 + i * 40, { gain: 0.8, pan: i % 2 ? 0.3 : -0.3 });
    I.bell(bellB, t, nm(accentNotes[i]), { gain: 0.4, decay: 0.3, index: 1.3, pan: i % 2 ? -0.35 : 0.35 });
    I.boom(mx.bus('sub'), t, { f0: 95, f1: 60, decay: 0.09, glide: 0.03, gain: 0.35 });
  });
  // pausa 47,0–48,2: gancho melódico curto, pousando no D6 (terça do Bb) em 48,0
  ([[89, 'C6', 1], [90, 'A5', 1], [91, 'E5', 1], [92, 'G5', 2], [94, 'A5', 1], [95, 'C6', 1], [96, 'D6', 2]] as [number, string, number][]).forEach(([i, n, l]) => {
    I.lead(mx.bus('lead'), g4.s(i), l * g4.s16 * 0.85, nm(n), { gain: 0.55, duty: 0.25, cutoff: 2800, glide: 0.2 });
    I.bell(bellB, g4.s(i), nm(n), { gain: 0.18, decay: 0.25 });
  });

  // ---------------- 48–58: crescimento (18 tempos) ----------------------------------
  const g5 = Grid.fit(48, 58, 18, 0.1);
  EP01_INFO.tempos.push({ t0: 48, t1: 58, bpm: g5.bpm });
  const grow = (t: number): number => 1050 * Math.pow(2300 / 1050, clamp((t - 48) / 10, 0, 1));
  const s5: Chord[] = [CH.Bbmaj7, CH.C6, CH.Dm7, CH.Em7];
  s5.forEach((ch, k) =>
    playBar(mx, g5, 16 * k, {
      chord: ch,
      pad: { cutoff: grow, gain: 0.82 + 0.06 * k },
      padHi: k >= 2 ? 0.3 : 0,
      bass: k < 2 ? BASS_BOUNCE : BASS_DRIVE,
      kick: k < 2 ? [0, 6, 8] : [0, 4, 8, 12],
      kickGain: 0.88,
      snare: k === 3 ? [4, 12, 14] : [4, 12],
      snareGain: 0.72 + 0.04 * k,
      hats: k < 2 ? EIGHTHS : SIXTEENTHS,
      hatGain: 0.8,
      open: k === 3 ? [2, 6, 10, 14] : undefined,
      shaker: k >= 1 ? [2, 6, 10, 14] : undefined,
      arp: { pat: k < 2 ? [0, 1, 2, 3, 2, 1, 2, 3] : [0, 1, 2, 3, 4, 3, 2, 1], step: k < 2 ? 2 : 1, gain: 0.4 + 0.04 * k, cutoff: 1100 + 120 * k, oct: k === 3 ? 1 : 0 },
      counter: k < 2 ? { gain: 0.55, pan: 0.4 } : undefined,
    }, rng),
  );
  // meio compasso 56,89–58,0: C7sus4 + rufo de caixa e subida
  playBar(mx, g5, 64, { chord: CH.C7sus4, beats: 2, pad: { cutoff: grow, gain: 1.0 }, padHi: 0.32, bass: BASS_LONG, kick: [0], hats: SIXTEENTHS, hatGain: 0.7, arp: { pat: [0, 1, 2, 3, 4, 5, 6, 7], step: 1, gain: 0.5, cutoff: 1500 } }, rng);
  for (let j = 0; j < 12; j++) {
    const t = j < 4 ? g5.s(64 + j) : g5.b(17) + ((j - 4) / 8) * g5.spb;
    I.snare(mx.bus('snare'), t, { gain: 0.22 + 0.05 * j, decay: 0.07 });
  }
  I.riser(fx, 56.4, 1.6, { f0: 500, f1: 7500, gain: 0.42, curve: 2.4 });
  I.swell(fx, 58.0, 1.1, { gain: 0.42 });

  // ---------------- 58–68: futuro/prefeito (18 tempos) -------------------------------
  const g6 = Grid.fit(58, 68, 18, 0.08);
  EP01_INFO.tempos.push({ t0: 58, t1: 68, bpm: g6.bpm });
  I.crash(fx, 58.0, { gain: 0.5, decay: 1.8 });
  I.boom(mx.bus('sub'), 58.0, { f0: 80, f1: 43, decay: 0.7, gain: 0.5 });
  const s6: [Chord, Chord?][] = [[CH.Fmaj7], [CH.Am7], [CH.Bbmaj7], [CH.Csus4, CH.C]];
  s6.forEach(([a, b], k) =>
    playBar(mx, g6, 16 * k, {
      chord: a,
      chord2: b,
      pad: { cutoff: 1800, gain: 1.0, attack: 0.2, width: 0.85 },
      padHi: 0.38,
      bass: BASS_LONG,
      bassGain: 1.0,
      kick: [0, 7, 10],
      kickGain: 0.95,
      snare: [8],
      snareGain: 0.95,
      hats: EIGHTHS,
      hatGain: 0.85,
      open: [14],
      shaker: [2, 6, 10, 14],
      arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], step: 2, gain: 0.36, cutoff: 1250, oct: 0 },
    }, rng),
  );
  // sinos "anthem": melodia lenta em mínimas, registro médio (sob a voz)
  const anthem: [number, string, number][] = [
    [0, 'A4', 0.5], [8, 'C5', 0.45], [16, 'E5', 0.5], [24, 'D5', 0.42], [32, 'D5', 0.48], [40, 'C5', 0.42], [48, 'G4', 0.46], [56, 'A4', 0.44], [64, 'D5', 0.5],
  ];
  anthem.forEach(([i, n, v], j) => {
    I.bell(bellB, g6.s(i), nm(n), { gain: v, decay: 1.1, index: 1.1, ratio: 3.5, pan: j % 2 ? 0.25 : -0.25 });
    I.bell(bellB, g6.s(i), nm(n) - 12, { gain: v * 0.5, decay: 1.2, index: 0.6, ratio: 2, pan: 0 });
  });
  // meio compasso 66,89–68,0: Gm7 + virada de tons (67,0–68,0)
  playBar(mx, g6, 64, { chord: CH.Gm7, beats: 2, pad: { cutoff: 1800, gain: 0.95 }, padHi: 0.35, bass: [[0, 7, 0]], kick: [0], hats: [0, 2], hatGain: 0.7 }, rng);
  const toms = [210, 190, 165, 150, 128, 112, 96];
  toms.forEach((f, j) => I.tom(mx.bus('perc'), g6.s(65 + j), f, { gain: 0.55 + 0.06 * j, pan: 0.5 - j * 0.15 }));
  I.snare(mx.bus('snare'), g6.s(70), { gain: 0.6 });
  I.snare(mx.bus('snare'), g6.s(71), { gain: 0.8 });

  // ---------------- 68–72: final (7 tempos) e 72: acorde + prato ------------------------
  const g7 = Grid.fit(68, 72, 7, 0.08);
  EP01_INFO.tempos.push({ t0: 68, t1: 72, bpm: g7.bpm });
  I.crash(fx, 68.0, { gain: 0.5, decay: 1.5 });
  playBar(mx, g7, 0, {
    chord: CH.Bbmaj7,
    pad: { cutoff: 2000, gain: 1.05, width: 0.9 },
    padHi: 0.4,
    bass: BASS_DRIVE,
    bassGain: 1.0,
    kick: [0, 6, 8, 11],
    kickGain: 1.0,
    snare: [4, 12],
    snareGain: 0.9,
    hats: SIXTEENTHS,
    hatGain: 0.85,
    open: [2, 6, 10, 14],
    shaker: [2, 6, 10, 14],
    arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], step: 1, gain: 0.42, cutoff: 1400 },
    counter: { gain: 0.6, pan: 0.4 },
  }, rng);
  playBar(mx, g7, 16, {
    chord: CH.Csus4,
    chord2: CH.C,
    beats: 3,
    pad: { cutoff: 2100, gain: 1.05, width: 0.9 },
    padHi: 0.4,
    bass: [[0, 4, 0], [4, 2, 12], [6, 2, 0], [8, 4, 0]],
    bassGain: 1.0,
    kick: [0, 4, 8],
    kickGain: 1.0,
    hats: SIXTEENTHS,
    hatGain: 0.8,
    arp: { pat: [0, 1, 2, 3, 4, 5, 6, 7], step: 1, gain: 0.48, cutoff: 1600 },
  }, rng);
  for (let j = 0; j < 10; j++) {
    const t = j < 2 ? g7.s(16 + 2 * j) : g7.s(18 + j);
    I.snare(mx.bus('snare'), t, { gain: 0.3 + 0.06 * j, decay: 0.08 });
  }
  I.tom(mx.bus('perc'), g7.s(26), 150, { gain: 0.8, pan: 0.3 });
  I.tom(mx.bus('perc'), g7.s(27), 110, { gain: 0.9, pan: -0.3 });
  I.swell(fx, 72.0, 1.5, { gain: 0.7, curve: 2.4 });
  I.riser(fx, 70.4, 1.6, { f0: 600, f1: 8000, gain: 0.35, curve: 2.6 });
  // 72,0: o acorde que resolve (Fmaj9), prato e grave
  const hit = 72.0;
  I.pad(pad, hit, 1.4, CH.Fmaj9.pad, { attack: 0.015, decay: 1.2, sustain: 0.6, release: 0.9, cutoff: (t) => 2600 - 1400 * clamp((t - hit) / 2.5, 0, 1), gain: 1.5, width: 1 });
  I.pad(pad, hit, 1.4, [nm('F4'), nm('A4'), nm('C5')], { attack: 0.015, release: 0.9, cutoff: 2400, gain: 0.5, width: 1 });
  I.bass(mx.bus('bass'), hit, 1.8, nm('F1'), { gain: 1.0, decay: 0.8, sustain: 0.5 });
  I.bass(mx.bus('bass'), hit, 1.8, nm('F2'), { gain: 0.6, decay: 0.8, sustain: 0.5 });
  I.kick(mx.bus('kick'), hit, { gain: 1.1, decay: 0.3 });
  mx.kickTimes.push(hit);
  I.boom(mx.bus('sub'), hit, { f0: 85, f1: 43, decay: 0.9, gain: 0.75 });
  I.crash(fx, hit, { gain: 0.85, decay: 2.2 });
  ['F5', 'A5', 'C6', 'E6', 'G6'].forEach((n, j) => I.bell(bellB, hit + j * 0.012, nm(n), { gain: 0.42 - 0.04 * j, decay: 1.5, index: 1.4, pan: -0.5 + j * 0.25 }));
  I.bell(bellB, hit + 0.25, nm('C7'), { gain: 0.25, decay: 1.0, pan: 0.4 });
  I.bell(bellB, hit + 0.5, nm('F7'), { gain: 0.18, decay: 0.9, pan: -0.4 });

  return mx.render(MIX);
}

export function renderEp01(): Stereo {
  EP01_INFO.accents = [];
  EP01_INFO.tempos = [];
  const intro = ep01Intro();
  const main = ep01Main();
  main.mix(intro, 1.0);
  voicePocket(main, EP01_VOICE, 3, 0.18);
  master(main, 1.0);
  return fadeOut(main, 73.4, 74.96);
}

// ====================================================================================
// DEMO (15 s): vitrine da cidade
// ====================================================================================
export function renderDemo(): Stereo {
  I.resetSeeds(303);
  const rng = new Rng(3303);
  const mx = new I.Mixer(s2n(15), BUSES);
  const pad = mx.bus('pad');
  const bellB = mx.bus('bell');
  const fx = mx.bus('fx');
  // 0–3: anoitecer -> noite; luzes acendendo (sininhos cada vez mais frequentes)
  I.pad(pad, 0, 3.0, CH.Bbmaj7.pad, { attack: 0.35, cutoff: (t) => 650 + 1100 * clamp(t / 3, 0, 1), gain: 0.95 });
  I.bass(mx.bus('bass'), 0, 2.9, nm('Bb1'), { gain: 0.55, decay: 1.2, sustain: 0.6 });
  const g0 = new Grid(0, 0.6, 0);
  const twinkle = [6, 11, 15, 18, 20, 22, 23, 24, 25, 26, 27, 28, 29];
  const notes = ['F6', 'A6', 'C7', 'D6', 'A6', 'C7', 'F6', 'D7', 'A6', 'C7', 'F7', 'D7', 'A7'];
  twinkle.forEach((i, j) => I.bell(bellB, g0.s(i), nm(notes[j]), { gain: 0.2 + 0.015 * j, decay: 0.55, index: 1.1, pan: rng.uni() * 0.8 }));
  for (let e = 0; e < 10; e++) I.pluck(mx.bus('arp'), g0.s(e * 2), CH.Bbmaj7.tones[[0, 1, 2, 3, 2][e % 5]], { gain: 0.25 + 0.04 * e, cutoff: 900 + 80 * e, decay: 0.16, duty: 0.125, pan: e % 2 ? 0.3 : -0.3 });
  I.riser(fx, 1.9, 1.1, { f0: 500, f1: 6500, gain: 0.35, curve: 2.4 });
  I.swell(fx, 3.0, 1.0, { gain: 0.35 });

  // 3,0: o groove entra; 4 compassos de 2,4 s (100 BPM) + meio compasso
  const g = new Grid(3.0, 0.6, 0.1);
  I.crash(fx, 3.0, { gain: 0.4, decay: 1.2 });
  const chords: Chord[] = [CH.Fmaj7, CH.Em7, CH.Dm7, CH.Cmaj7];
  chords.forEach((ch, k) =>
    playBar(mx, g, 16 * k, {
      chord: ch,
      pad: { cutoff: 1500 + 150 * k, gain: 0.9 },
      padHi: k >= 2 ? 0.3 : 0,
      bass: k < 2 ? BASS_LIGHT : BASS_BOUNCE,
      kick: [0, 6, 8],
      kickGain: 0.9,
      snare: k >= 1 ? [4, 12] : [],
      snareGain: 0.75,
      ghost: k >= 2 ? [15] : [],
      hats: k < 2 ? EIGHTHS : SIXTEENTHS,
      hatGain: 0.8,
      open: k === 3 ? [6, 14] : undefined,
      shaker: k >= 2 ? [2, 6, 10, 14] : undefined,
      arp: k >= 1 ? { pat: [0, 1, 2, 3, 2, 1, 3, 2], step: 2, gain: 0.45, cutoff: 1300 } : undefined,
      counter: k >= 2 ? { gain: 0.55, pan: 0.4 } : undefined,
    }, rng),
  );
  // gancho (compassos 3 e 4)
  const hook: [number, string, number][] = [
    [32, 'A5', 2], [34, 'C6', 2], [36, 'D6', 4], [40, 'C6', 2], [42, 'A5', 2], [44, 'F5', 4],
    [48, 'G5', 2], [50, 'A5', 2], [52, 'C6', 2], [54, 'E6', 6], [60, 'D6', 2], [62, 'C6', 2],
    [64, 'D6', 4], [68, 'E6', 4],
  ];
  hook.forEach(([i, n, l]) => {
    I.lead(mx.bus('lead'), g.s(i), l * g.s16 * 0.88, nm(n), { gain: 0.5, duty: 0.3, cutoff: 2900, vib: 12 });
    I.bell(bellB, g.s(i), nm(n) + 12, { gain: 0.08, decay: 0.3 });
  });
  // meio compasso 12,6–13,8: Bbmaj7 -> C7, rufo + prato ao contrário
  playBar(mx, g, 64, { chord: CH.Bbmaj7, chord2: CH.C7, split: 4, beats: 2, pad: { cutoff: 2000, gain: 1.0 }, padHi: 0.32, bass: [[0, 4, 0], [4, 4, 0]], kick: [0, 4], hats: SIXTEENTHS, hatGain: 0.7, arp: { pat: [0, 1, 2, 3, 4, 5, 6, 7], step: 1, gain: 0.45, cutoff: 1500 } }, rng);
  for (let j = 0; j < 8; j++) I.snare(mx.bus('snare'), g.s(64 + j), { gain: 0.25 + 0.07 * j, decay: 0.07 });
  I.swell(fx, 13.8, 1.2, { gain: 0.55 });
  // 13,8: resolve em Fmaj9; cauda até o silêncio em 15,0
  const hit = 13.8;
  I.pad(pad, hit, 0.6, CH.Fmaj9.pad, { attack: 0.015, decay: 0.8, sustain: 0.6, release: 0.45, cutoff: 2400, gain: 1.4, width: 1 });
  I.bass(mx.bus('bass'), hit, 0.9, nm('F1'), { gain: 1.0, decay: 0.6, sustain: 0.5 });
  I.kick(mx.bus('kick'), hit, { gain: 1.05, decay: 0.28 });
  mx.kickTimes.push(hit);
  I.boom(mx.bus('sub'), hit, { f0: 85, f1: 43, decay: 0.5, gain: 0.6 });
  I.crash(fx, hit, { gain: 0.7, decay: 1.2 });
  ['F5', 'A5', 'C6', 'E6', 'G6'].forEach((n, j) => I.bell(bellB, hit + j * 0.03, nm(n), { gain: 0.42 - 0.04 * j, decay: 0.7, index: 1.3, pan: -0.5 + j * 0.25 }));
  const out = mx.render(MIX);
  master(out, 1.0);
  return fadeOut(out, 14.15, 14.97);
}
