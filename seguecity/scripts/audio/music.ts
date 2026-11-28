// Trilhas do SegueCity: demo (15 s) e ep01 (75 s). Fá maior / Ré menor, acordes lo-fi com sétima.
// Os tempos de cada seção vêm das cenas do vídeo; dentro de cada seção o andamento é ajustado
// (~105–111 BPM) para que toda troca de cena caia exatamente num tempo forte.
import { Biquad, OnePole, Rng, SR, Stereo, clamp, db, filterStereo, nm, s2n, saturate, tapeStop } from './dsp';
import * as I from './instruments';
import EP01_WORDS from '../../src/scenes/ep01/words.json';

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
// EP01 (75 s) — "A Fundação", narração oficial (Cidade.mp3)
// Seções e acentos saem de src/scenes/ep01/words.json (posição de cada frase e palavra na linha do tempo).
// ====================================================================================
const PH = Object.fromEntries(EP01_WORDS.frases.map((f) => [f.id, f])) as Record<string, { a: number; b: number }>;
const WORD = (w: string, after = 0): number => {
  const x = EP01_WORDS.palavras.find((p) => p.a >= after && p.w.toLowerCase().replace(/[^a-zà-ü]/g, '').startsWith(w));
  if (!x) throw new Error(`palavra ${w}`);
  return x.a;
};
// cortes de cena do vídeo (mesmos de src/scenes/ep01/Ep01.tsx → T)
const CUT = { vazio: 6.8, iCasa: 14.65, voce: 18.85, ana: 26.8, jobs: 33.5, cresce: 42.45, evento: 47.6, eleicao: 51.3, hoje: 61.2, fim: 69.0 };
const RESOLVE = 69.55; // acorde final junto da logo
export const EP01_VOICE: [number, number][] = EP01_WORDS.frases.map((f) => [f.a, f.b]);
export const EP01_SECTIONS = [
  { t0: 0, t1: CUT.vazio, name: 'construção (gancho)' },
  { t0: CUT.vazio, t1: CUT.voce, name: 'cidade vazia + tour + interiores' },
  { t0: CUT.voce, t1: CUT.ana, name: 'você entra (seguir → cidadão)' },
  { t0: CUT.ana, t1: CUT.jobs, name: 'seu personagem' },
  { t0: CUT.jobs, t1: CUT.cresce, name: 'profissões' },
  { t0: CUT.cresce, t1: CUT.evento, name: 'crescimento (simulação)' },
  { t0: CUT.evento, t1: CUT.eleicao, name: 'tempestade (acontecimentos)' },
  { t0: CUT.eleicao, t1: CUT.hoje, name: 'eleição / quem vai governar' },
  { t0: CUT.hoje, t1: RESOLVE, name: 'hoje começa → primeiro morador' },
  { t0: RESOLVE, t1: 75, name: 'amanhecer + logo' },
];
export const EP01_INFO: { accents: number[]; tempos: { t0: number; t1: number; bpm: number }[] } = { accents: [], tempos: [] };

export function renderEp01(): Stereo {
  EP01_INFO.accents = [];
  EP01_INFO.tempos = [];
  I.resetSeeds(404);
  const rng = new Rng(4404);
  const mx = new I.Mixer(s2n(75), BUSES);
  const bellB = mx.bus('bell');
  const tempo = (g: Grid, t0: number, t1: number) => EP01_INFO.tempos.push({ t0, t1, bpm: g.bpm });

  // ---------------- 0–6,8: construção (o primeiro quadro já é ação) ----------------
  ['C6', 'F6', 'A6', 'C7'].forEach((n, i) => I.bell(bellB, 0.004 + i * 0.05, nm(n), { gain: 0.5 - i * 0.06, decay: 0.5, index: 1.2, pan: -0.45 + i * 0.3 }));
  I.boom(mx.bus('sub'), 0.0, { f0: 90, f1: 45, decay: 0.5, gain: 0.45 });
  const g1 = Grid.fit(0, CUT.vazio, 12, 0.06);
  tempo(g1, 0, CUT.vazio);
  const s1: Chord[] = [CH.Fmaj7, CH.Em7, CH.Dm7];
  s1.forEach((ch, k) => playBar(mx, g1, 16 * k, {
    chord: ch, chord2: k === 2 ? CH.Cmaj7 : undefined, split: 8,
    pad: { cutoff: 1300 + 250 * k, gain: 0.85 }, bass: BASS_LIGHT, bassGain: 0.7,
    kick: [0, 8], kickGain: 0.75, hats: EIGHTHS, hatGain: 0.55,
    arp: { pat: [0, 1, 2, 3, 1, 2, 3, 2], step: 2, gain: 0.42, cutoff: 1150 + 150 * k },
  }, rng));
  // golpes de "obra" junto dos prédios assentando
  [0.2, 0.75, 1.3, 1.85, 2.4].forEach((t, i) => I.tok(mx.bus('perc'), t, 640 + i * 60, { gain: 0.55, pan: i % 2 ? 0.3 : -0.3 }));
  ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => I.bell(bellB, 2.95 + i * 0.07, nm(n), { gain: 0.38, decay: 0.6, pan: -0.3 + i * 0.2 }));
  // "Ninguém mora nela": a música desliga (tape stop) no corte
  const first = tapeStop(mx.render(MIX), CUT.vazio, 0.4, 1.6);

  const m2 = new I.Mixer(s2n(75), BUSES);
  const pad2 = m2.bus('pad'), fx2 = m2.bus('fx'), bell2 = m2.bus('bell');
  // ---------------- 6,8–18,85: cidade vazia, tour e interiores ----------------
  I.boom(fx2, CUT.vazio, { f0: 150, f1: 34, glide: 0.16, decay: 0.3, gain: 0.3 });
  I.pad(pad2, CUT.vazio + 0.4, CUT.iCasa - CUT.vazio - 0.2, ['D3', 'A3', 'E4'].map(nm), { attack: 1.2, release: 0.6, cutoff: 650, gain: 0.32, width: 0.85, pwm: 0.08, tri: 0.9 });
  // tour: um toque por lugar falado (casas, escola, hospital, comércio, prefeitura)
  const tour = ['casas', 'escola', 'hospital', 'comércio', 'prefeitura'].map((w) => WORD(w.normalize('NFC').toLowerCase().replace(/[^a-zà-ü]/g, '')));
  ['A4', 'D5', 'F5', 'A5', 'D6'].forEach((n, i) => { I.keys(m2.bus('keys'), tour[i], nm(n), { gain: 0.3, pan: i % 2 ? 0.25 : -0.2, decay: 1.2 }); I.bell(bell2, tour[i], nm(n) + 12, { gain: 0.16, decay: 0.4 }); });
  // interiores: pad mais quente e sininhos ("pronto", "esperando")
  I.pad(pad2, CUT.iCasa, CUT.voce - CUT.iCasa + 0.2, CH.Bbmaj7.pad, { attack: 0.6, release: 0.5, cutoff: 900, gain: 0.45, width: 0.9 });
  [[WORD('pronto'), 'F5'], [WORD('pronto') + 0.18, 'A5'], [WORD('esperando'), 'C6'], [WORD('habitantes'), 'D6']].forEach(([t, n]) => I.bell(bell2, t as number, nm(n as string), { gain: 0.3, decay: 0.6, pan: rng.uni() * 0.6 }));
  I.riser(fx2, CUT.voce - 1.0, 1.0, { f0: 350, f1: 7000, gain: 0.45, tone: [nm('A3'), nm('A5')], toneGain: 0.1, curve: 2.2 });

  // ---------------- 18,85–26,8: "é aqui que você entra" (a batida entra) ----------------
  const g3 = Grid.fit(CUT.voce, CUT.ana, 14, 0.1);
  tempo(g3, CUT.voce, CUT.ana);
  I.crash(fx2, CUT.voce, { gain: 0.32, decay: 1.1 });
  I.swell(fx2, CUT.voce, 0.9, { gain: 0.4 });
  const s3: Chord[] = [CH.Fmaj7, CH.Am7, CH.Bbmaj7, CH.Csus4];
  s3.forEach((ch, k) => playBar(m2, g3, 16 * k, {
    chord: ch, chord2: k === 3 ? CH.C : undefined, beats: k === 3 ? 2 : undefined,
    pad: { cutoff: 1450, gain: 0.9 }, bass: BASS_LIGHT, bassGain: 0.85,
    kick: k % 2 ? [0, 8, 10] : [0, 8], kickGain: 0.8, hats: EIGHTHS, hatGain: 0.8,
    arp: k >= 1 ? { pat: [0, 2, 1, 3, 2, 1, 3, 2], step: 2, gain: 0.48, cutoff: 1200 } : undefined,
  }, rng));
  const seg = WORD('seguidor'), cid = WORD('cidadão');
  I.bell(bell2, g3.q(seg), nm('C6'), { gain: 0.4, decay: 0.4 });
  ['F5', 'A5', 'C6', 'F6'].forEach((n, i) => I.bell(bell2, g3.q(cid) + i * g3.s16, nm(n), { gain: 0.34 + 0.03 * i, decay: 0.35, pan: -0.3 + 0.2 * i }));

  // ---------------- 26,8–33,5: seu personagem (groove) ----------------
  const g4 = Grid.fit(CUT.ana, CUT.jobs, 12, 0.12);
  tempo(g4, CUT.ana, CUT.jobs);
  const s4: [Chord, Chord?][] = [[CH.Dm7], [CH.Bbmaj7], [CH.Gm7, CH.C7]];
  s4.forEach(([a, b], k) => playBar(m2, g4, 16 * k, {
    chord: a, chord2: b, pad: { cutoff: 1400, gain: 0.82 }, bass: BASS_BOUNCE,
    kick: [0, 6, 8], kickGain: 0.88, snare: [4, 12], snareGain: 0.7, ghost: k % 2 ? [7, 15] : [15],
    hats: [...EIGHTHS, 3, 11], hatGain: 0.9, counter: { gain: 0.7, pan: 0.35 },
  }, rng));

  // ---------------- 33,5–42,45: profissões (um acento por profissão falada) ----------------
  const g5 = Grid.fit(CUT.jobs, CUT.cresce, 16, 0.12);
  tempo(g5, CUT.jobs, CUT.cresce);
  const s5: [Chord, Chord?][] = [[CH.Fmaj7], [CH.Em7], [CH.Dm7], [CH.Bbmaj7, CH.C7sus4]];
  s5.forEach(([a, b], k) => playBar(m2, g5, 16 * k, {
    chord: a, chord2: b, pad: { cutoff: 1550, gain: 0.9 }, padHi: 0.26, bass: BASS_WALK,
    kick: [0, 6, 8], kickGain: 0.9, snare: [4, 12], snareGain: 0.75, ghost: [15],
    hats: SIXTEENTHS, hatGain: 0.72, shaker: [2, 6, 10, 14],
    arp: { pat: [0, 1, 2, 3, 2, 1, 3, 1], step: 2, gain: 0.4, cutoff: 1150, pan: -0.4 }, counter: { gain: 0.5, pan: 0.4 },
  }, rng));
  const accentNotes = ['C6', 'D6', 'F6', 'G6', 'A6'];
  ['médico', 'policial', 'empresário', 'mecânico', 'professor'].map((w) => WORD(w.replace(/[^a-zà-ü]/g, ''))).forEach((tt, i) => {
    const t = g5.q(tt);
    EP01_INFO.accents.push(t);
    I.tok(m2.bus('perc'), t, 820 + i * 40, { gain: 0.8, pan: i % 2 ? 0.3 : -0.3 });
    I.bell(bell2, t, nm(accentNotes[i]), { gain: 0.4, decay: 0.3, index: 1.3, pan: i % 2 ? -0.35 : 0.35 });
    I.boom(m2.bus('sub'), t, { f0: 95, f1: 60, decay: 0.09, glide: 0.03, gain: 0.35 });
  });
  I.riser(fx2, CUT.cresce - 1.2, 1.2, { f0: 500, f1: 7000, gain: 0.35, curve: 2.4 });

  // ---------------- 42,45–47,6: crescimento (simulação) ----------------
  const g6 = Grid.fit(CUT.cresce, CUT.evento, 9, 0.1);
  tempo(g6, CUT.cresce, CUT.evento);
  I.crash(fx2, CUT.cresce, { gain: 0.4, decay: 1.4 });
  const grow = (t: number): number => 1100 * Math.pow(2.1, clamp((t - CUT.cresce) / 5, 0, 1));
  [CH.Bbmaj7, CH.C6].forEach((ch, k) => playBar(m2, g6, 16 * k, {
    chord: ch, pad: { cutoff: grow, gain: 0.9 }, padHi: 0.3, bass: k ? BASS_DRIVE : BASS_BOUNCE,
    kick: k ? [0, 4, 8, 12] : [0, 6, 8], kickGain: 0.9, snare: [4, 12], snareGain: 0.78,
    hats: SIXTEENTHS, hatGain: 0.8, open: k ? [2, 6, 10, 14] : undefined, shaker: [2, 6, 10, 14],
    arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], step: 1, gain: 0.42, cutoff: 1300 },
  }, rng));
  playBar(m2, g6, 32, { chord: CH.Dm7, beats: 1, pad: { cutoff: 2000, gain: 0.9 }, bass: BASS_LONG, kick: [0], hats: [0, 2], hatGain: 0.7 }, rng);
  FUTURE_BUILD_TIMES().forEach((t, i) => I.bell(bell2, t, nm(['F5', 'A5', 'C6', 'E6'][i % 4]), { gain: 0.3, decay: 0.35 }));

  // ---------------- 47,6–51,3: tempestade (a música escurece e segura) ----------------
  I.pad(pad2, CUT.evento, CUT.eleicao - CUT.evento + 0.3, CH.Dm7.pad, { attack: 0.25, release: 0.5, cutoff: (t) => 1500 - 900 * clamp((t - CUT.evento) / 1.5, 0, 1), gain: 0.75, width: 0.9 });
  I.bass(m2.bus('bass'), CUT.evento, 3.6, nm('D1'), { gain: 0.75, decay: 2.5, sustain: 0.6 });
  [0, 0.92, 1.84, 2.76].forEach((d, i) => I.tom(m2.bus('perc'), CUT.evento + 0.1 + d, 120 - i * 8, { gain: 0.5 + 0.08 * i, pan: i % 2 ? 0.3 : -0.3 }));
  I.boom(m2.bus('sub'), WORD('mudar'), { f0: 70, f1: 38, decay: 0.8, gain: 0.55 });
  I.riser(fx2, CUT.eleicao - 1.4, 1.4, { f0: 400, f1: 6500, gain: 0.35, curve: 2.4 });

  // ---------------- 51,3–61,2: eleição, quem vai governar (hino) ----------------
  const g8 = Grid.fit(CUT.eleicao, CUT.hoje, 18, 0.08);
  tempo(g8, CUT.eleicao, CUT.hoje);
  I.crash(fx2, CUT.eleicao, { gain: 0.45, decay: 1.6 });
  I.boom(m2.bus('sub'), CUT.eleicao, { f0: 80, f1: 43, decay: 0.7, gain: 0.45 });
  const s8: [Chord, Chord?][] = [[CH.Fmaj7], [CH.Am7], [CH.Bbmaj7], [CH.Csus4, CH.C]];
  s8.forEach(([a, b], k) => playBar(m2, g8, 16 * k, {
    chord: a, chord2: b, pad: { cutoff: 1800, gain: 1.0, attack: 0.2, width: 0.85 }, padHi: 0.36, bass: BASS_LONG, bassGain: 1.0,
    kick: [0, 7, 10], kickGain: 0.92, snare: [8], snareGain: 0.9, hats: EIGHTHS, hatGain: 0.82, open: [14], shaker: [2, 6, 10, 14],
    arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], step: 2, gain: 0.34, cutoff: 1250 },
  }, rng));
  playBar(m2, g8, 64, { chord: CH.Gm7, beats: 2, pad: { cutoff: 1800, gain: 0.95 }, padHi: 0.34, bass: [[0, 7, 0]], kick: [0], hats: [0, 2], hatGain: 0.7 }, rng);
  const anthem: [number, string, number][] = [[0, 'A4', 0.5], [8, 'C5', 0.45], [16, 'E5', 0.5], [24, 'D5', 0.42], [32, 'D5', 0.48], [40, 'C5', 0.42], [48, 'G4', 0.46], [56, 'A4', 0.44], [64, 'D5', 0.5]];
  anthem.forEach(([i, n, v], j) => {
    I.bell(bell2, g8.s(i), nm(n), { gain: v, decay: 1.1, index: 1.1, ratio: 3.5, pan: j % 2 ? 0.25 : -0.25 });
    I.bell(bell2, g8.s(i), nm(n) - 12, { gain: v * 0.5, decay: 1.2, index: 0.6, ratio: 2, pan: 0 });
  });
  [210, 190, 165, 150, 128, 112].forEach((f, j) => I.tom(m2.bus('perc'), g8.s(66 + j), f, { gain: 0.5 + 0.06 * j, pan: 0.5 - j * 0.18 }));

  // ---------------- 61,2–69,55: hoje começa → o primeiro morador ----------------
  const g9 = Grid.fit(CUT.hoje, RESOLVE, 15, 0.08);
  tempo(g9, CUT.hoje, RESOLVE);
  I.crash(fx2, CUT.hoje, { gain: 0.5, decay: 1.6 });
  const s9: [Chord, Chord?][] = [[CH.Bbmaj7], [CH.Fmaj7], [CH.Gm7, CH.C7sus4]];
  s9.forEach(([a, b], k) => playBar(m2, g9, 16 * k, {
    chord: a, chord2: b, pad: { cutoff: 1900 + 150 * k, gain: 1.0, width: 0.9 }, padHi: 0.38, bass: k === 2 ? BASS_DRIVE : BASS_BOUNCE, bassGain: 0.95,
    kick: k === 2 ? [0, 4, 8, 12] : [0, 6, 8, 11], kickGain: 0.95, snare: [4, 12], snareGain: 0.85, hats: SIXTEENTHS, hatGain: 0.8,
    open: [2, 6, 10, 14], shaker: [2, 6, 10, 14], arp: { pat: [0, 1, 2, 3, 4, 3, 2, 1], step: 1, gain: 0.4, cutoff: 1400 }, counter: k < 2 ? { gain: 0.55, pan: 0.4 } : undefined,
  }, rng));
  playBar(m2, g9, 48, { chord: CH.C7sus4, chord2: CH.C7, split: 6, beats: 3, pad: { cutoff: 2200, gain: 1.05 }, padHi: 0.4, bass: [[0, 4, 0], [4, 2, 12], [6, 2, 0], [8, 4, 0]], kick: [0, 4, 8], hats: SIXTEENTHS, hatGain: 0.8, arp: { pat: [0, 1, 2, 3, 4, 5, 6, 7], step: 1, gain: 0.46, cutoff: 1600 } }, rng);
  for (let j = 0; j < 10; j++) I.snare(m2.bus('snare'), j < 4 ? g9.s(50 + 2 * j) : g9.s(54 + j), { gain: 0.28 + 0.06 * j, decay: 0.08 });
  I.bell(bell2, WORD('primeiro', 66), nm('C6'), { gain: 0.42, decay: 0.5 });
  I.bell(bell2, WORD('morador', 66), nm('F6'), { gain: 0.46, decay: 0.6 });
  I.riser(fx2, RESOLVE - 1.6, 1.6, { f0: 600, f1: 8000, gain: 0.35, curve: 2.6 });
  I.swell(fx2, RESOLVE, 1.5, { gain: 0.65, curve: 2.4 });

  // ---------------- 69,55: amanhecer + logo — o acorde que resolve (Fmaj9) ----------------
  const hit = RESOLVE;
  I.pad(pad2, hit, 4.2, CH.Fmaj9.pad, { attack: 0.015, decay: 1.6, sustain: 0.7, release: 1.2, cutoff: (t) => 2600 - 1200 * clamp((t - hit) / 4, 0, 1), gain: 1.4, width: 1 });
  I.bass(m2.bus('bass'), hit, 3.5, nm('F1'), { gain: 1.0, decay: 1.4, sustain: 0.6 });
  I.kick(m2.bus('kick'), hit, { gain: 1.1, decay: 0.3 });
  m2.kickTimes.push(hit);
  I.boom(m2.bus('sub'), hit, { f0: 85, f1: 43, decay: 0.9, gain: 0.7 });
  I.crash(fx2, hit, { gain: 0.85, decay: 2.4 });
  ['F5', 'A5', 'C6', 'E6', 'G6'].forEach((n, j) => I.bell(bell2, hit + j * 0.012, nm(n), { gain: 0.42 - 0.04 * j, decay: 1.6, index: 1.4, pan: -0.5 + j * 0.25 }));
  // brilhos do sol nascendo (arpejo lento descendo)
  ['C7', 'A6', 'F6', 'E6', 'C6', 'A5'].forEach((n, j) => I.bell(bell2, hit + 0.8 + j * 0.42, nm(n), { gain: 0.24 - 0.02 * j, decay: 1.0, pan: j % 2 ? 0.4 : -0.4 }));
  I.pad(pad2, hit + 2.6, 2.6, [nm('F4'), nm('A4'), nm('C5'), nm('G5')], { attack: 0.8, release: 1.2, cutoff: 1800, gain: 0.45, width: 1 });

  const main = m2.render(MIX);
  main.mix(first, 1.0);
  voicePocket(main, EP01_VOICE, 3, 0.18);
  master(main, 1.0);
  return fadeOut(main, 73.2, 74.96);
}
// prédios da simulação (mesmos tempos de FUTURE em Ep01.tsx)
function FUTURE_BUILD_TIMES(): number[] {
  const b = WORD('bairros'), c = WORD('construídos'.replace(/[^a-zà-ü]/g, '')), e = WORD('empresas');
  return [b + 0.05, b + 0.3, c, e + 0.05];
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
