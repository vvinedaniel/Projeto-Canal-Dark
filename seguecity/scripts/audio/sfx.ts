// Efeitos de interface (HUD pixel-art) e ambientes em loop do SegueCity. Tudo sintetizado.
import {
  OnePole, PulseOsc, Rng, SR, SVF, SinOsc, Stereo, TAU, TriOsc,
  addMono, addMonoWrap, circular, edgeFade, mtof, nm, noise, reverb, pingPong, s2n,
} from './dsp';
import * as I from './instruments';

const arr = (sec: number): Float64Array => new Float64Array(Math.max(1, Math.ceil(sec * SR)));

/** soma reverb curto (cauda cortada no comprimento do buffer) */
function addVerb(s: Stereo, wet: number, room = 0.55, lp = 6000, hp = 300): Stereo {
  const w = reverb(s, { room, damp: 0.5, lp, hp, predelay: 0.008 });
  return s.mix(w, wet);
}

/** zera a média (DC) subtraindo uma janela de Hann proporcional: pontas continuam em zero */
export function removeDC(s: Stereo): Stereo {
  for (const ch of [s.L, s.R]) {
    let m = 0;
    let wsum = 0;
    for (let i = 0; i < s.n; i++) {
      m += ch[i];
      wsum += 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (s.n - 1));
    }
    const k = m / wsum;
    for (let i = 0; i < s.n; i++) ch[i] -= k * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (s.n - 1)));
  }
  return s;
}

/** fade-out final em cosseno nos últimos sec segundos (garante término em zero) */
function tail(s: Stereo, sec: number): Stereo {
  const n = s2n(sec);
  for (let i = 0; i < n && i < s.n; i++) {
    const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / n);
    s.L[s.n - 1 - i] *= g;
    s.R[s.n - 1 - i] *= g;
  }
  return s;
}

// ------------------------------------------------------------------------------------
export function uiBlip(): Stereo {
  const s = Stereo.sec(0.08);
  const x = arr(0.08);
  const o = new PulseOsc(0);
  const sn = new SinOsc(0);
  const lp = new SVF(3200, 0.6);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const f = 880 * (1 + 0.12 * Math.exp(-t / 0.008));
    const env = (t < 0.0015 ? t / 0.0015 : 1) * Math.exp(-t / 0.022);
    x[i] = lp.lp(o.next(f, 0.5) * 0.55 + sn.next(f) * 0.6) * env;
  }
  addMono(s, 0, edgeFade(x, 8, 240));
  return s;
}

export function uiMove(): Stereo {
  const dur = 0.45;
  const s = Stereo.sec(dur);
  const nl = noise(s.n, 11);
  const nr = noise(s.n, 12);
  const bl = new SVF(400, 1.3);
  const br = new SVF(400, 1.3);
  for (let i = 0; i < s.n; i++) {
    const u = i / s.n;
    const fc = u < 0.55 ? 350 * Math.pow(2600 / 350, u / 0.55) : 2600 * Math.pow(900 / 2600, (u - 0.55) / 0.45);
    if ((i & 15) === 0) {
      bl.set(fc, 1.3);
      br.set(fc * 1.06, 1.3);
    }
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.6);
    const pan = -0.7 + 1.4 * u;
    const a = ((pan + 1) * Math.PI) / 4;
    const mix = (v1: number, v2: number) => 0.8 * v1 + 0.2 * v2;
    const l = bl.bp(nl[i]);
    const r = br.bp(nr[i]);
    s.L[i] = mix(l, r) * env * Math.cos(a) * 1.4;
    s.R[i] = mix(r, l) * env * Math.sin(a) * 1.4;
  }
  addVerb(s, 0.25, 0.5, 5000, 400);
  return tail(s, 0.06);
}

export function popup(): Stereo {
  const s = Stereo.sec(0.25);
  const notes: [number, number, number][] = [[0, nm('F5'), 0.055], [0.07, nm('C6'), 0.075]];
  for (const [t0, m, tau] of notes) {
    const x = arr(0.25 - t0);
    const o = new PulseOsc(0);
    const tr = new TriOsc(0);
    const lp = new SVF(3800, 0.7);
    const f0 = mtof(m);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const f = f0 * Math.pow(2, (-4 * Math.exp(-t / 0.01)) / 12);
      const env = (t < 0.002 ? t / 0.002 : 1) * Math.exp(-t / tau);
      x[i] = lp.lp(o.next(f, 0.25) * 0.5 + tr.next(f) * 0.6) * env;
    }
    addMono(s, s2n(t0), edgeFade(x, 0, 200), 1, t0 > 0 ? 0.15 : -0.15);
  }
  // "pop" de bolha no ataque
  const p = arr(0.03);
  let ph = 0;
  for (let i = 0; i < p.length; i++) {
    const t = i / SR;
    ph += (500 + 1400 * (t / 0.03)) / SR;
    p[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.006) * 0.5;
  }
  addMono(s, 0, edgeFade(p, 8, 48));
  addVerb(s, 0.18, 0.4);
  return tail(s, 0.05);
}

export function notify(): Stereo {
  const s = Stereo.sec(0.6);
  I.bell(s, 0.0, nm('A5'), { gain: 2.2, decay: 0.22, index: 1.5, ratio: 3.5, pan: -0.15, len: 0.6 });
  I.bell(s, 0.095, nm('E6'), { gain: 2.4, decay: 0.26, index: 1.4, ratio: 3.5, pan: 0.15, len: 0.5 });
  const echo = pingPong(s, 0.11, 0.25, 4000, 600);
  s.mix(echo, 0.3);
  addVerb(s, 0.2, 0.5);
  return tail(s, 0.12);
}

export function unlock(): Stereo {
  const s = Stereo.sec(0.9);
  const arp = ['F5', 'A5', 'C6', 'F6'];
  arp.forEach((n, i) => {
    const t = i * 0.065;
    I.pluck(s, t, nm(n), { gain: 2.2, duty: 0.25, decay: 0.09, cutoff: 2400, envAmt: 2500, pan: -0.3 + 0.2 * i });
    I.bell(s, t, nm(n) + 12, { gain: 0.8, decay: 0.2, index: 1.2, pan: 0.3 - 0.2 * i, len: 0.5 });
  });
  // nota final com vibrato + brilho
  I.lead(s, 0.26, 0.32, nm('A6'), { gain: 1.4, duty: 0.25, cutoff: 3800, vib: 18, vibRate: 7, release: 0.12, glide: 0.4 });
  I.bell(s, 0.26, nm('C7'), { gain: 1.0, decay: 0.3, index: 1.0, len: 0.6 });
  const r = new Rng(77);
  for (let k = 0; k < 10; k++) I.bell(s, 0.3 + 0.045 * k, nm(r.pick(['C7', 'F7', 'A7', 'D7'])), { gain: 0.35, decay: 0.07, index: 0.8, pan: r.uni() * 0.8, len: 0.4 });
  addVerb(s, 0.25, 0.6);
  return tail(s, 0.12);
}

export function coin(): Stereo {
  const s = Stereo.sec(0.35);
  const segs: [number, number, number, number][] = [[0, 988, 0.06, 0.06], [0.06, 1319, 0.29, 0.1]];
  for (const [t0, f, len, tau] of segs) {
    const x = arr(len);
    const o = new PulseOsc(0);
    const tr = new TriOsc(0);
    const lp = new SVF(3000, 0.6);
    for (let i = 0; i < x.length; i++) {
      const t = i / SR;
      const env = (t < 0.0015 ? t / 0.0015 : 1) * (t0 === 0 ? 1 : Math.exp(-t / tau));
      // quadrada "amaciada": pouca quadrada, mais triângulo, passa-baixas em 3 kHz
      x[i] = lp.lp(o.next(f, 0.5) * 0.3 + tr.next(f) * 0.75) * env;
    }
    addMono(s, s2n(t0), edgeFade(x, 24, t0 === 0 ? 24 : 300));
  }
  addVerb(s, 0.12, 0.4);
  return tail(s, 0.04);
}

export function sparkle(): Stereo {
  const s = Stereo.sec(1.2);
  const r = new Rng(909);
  const pent = ['C7', 'D7', 'F7', 'G7', 'A7', 'C8', 'A6', 'F6'];
  for (let k = 0; k < 46; k++) {
    // densidade sobe e desce: amostra tempos por uma distribuição em sino entre 0 e 0,95 s
    const u = (r.next() + r.next() + r.next()) / 3;
    const t = u * 0.95;
    I.bell(s, t, nm(r.pick(pent)), { gain: 0.25 + 0.35 * r.next(), decay: 0.06 + 0.1 * r.next(), index: 0.9, ratio: 4.0, pan: r.uni() * 0.9, len: 0.4 });
  }
  // brilho subindo (glissando suave)
  const x = arr(1.0);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length;
    ph += (700 * Math.pow(2600 / 700, u)) / SR;
    x[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * u) ** 2 * 0.12;
  }
  addMono(s, 0, x);
  // ar: ruído agudo bem leve
  const nz = noise(s.n, 31);
  const hp = new SVF(7000, 0.7);
  for (let i = 0; i < s.n; i++) {
    const u = i / s.n;
    const v = hp.hp(nz[i]) * Math.sin(Math.PI * Math.min(1, u / 0.85)) ** 2 * 0.06;
    s.L[i] += v;
    s.R[i] -= v * 0.6;
  }
  addVerb(s, 0.35, 0.7, 7000);
  return tail(s, 0.2);
}

export function tick(): Stereo {
  const s = Stereo.sec(0.04);
  const x = arr(0.04);
  const nz = noise(x.length, 41);
  const hp = new SVF(3000, 0.7);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += 2400 / SR;
    x[i] = Math.sin(TAU * ph) * Math.exp(-t / 0.005) * 0.8 + hp.hp(nz[i]) * Math.exp(-t / 0.0015) * 0.5;
  }
  addMono(s, 0, edgeFade(x, 6, 200));
  return s;
}

export function empty(): Stereo {
  const s = Stereo.sec(1.5);
  I.boom(s, 0, { f0: 74, f1: 38, glide: 0.12, decay: 0.42, gain: 2.0 });
  // corpo oco: ressonâncias graves (caixa vazia)
  const x = arr(1.0);
  const nz = noise(x.length, 51);
  const r1 = new SVF(210, 9);
  const r2 = new SVF(320, 10);
  const lp = new OnePole(900);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const e = (t < 0.003 ? t / 0.003 : 1) * Math.exp(-t / 0.05);
    const v = nz[i] * e;
    x[i] = lp.lp(r1.bp(v) * 1.0 + r2.bp(v) * 0.7) * 2.5;
  }
  addMono(s, 0, edgeFade(x, 0, 400));
  // "toc" abafado de impacto
  const c = arr(0.06);
  const nz2 = noise(c.length, 52);
  const l2 = new SVF(600, 0.7);
  for (let i = 0; i < c.length; i++) c[i] = l2.lp(nz2[i]) * Math.exp(-(i / SR) / 0.012) * 0.8;
  addMono(s, 0, edgeFade(c, 4, 100));
  addVerb(s, 0.45, 0.82, 2200, 120);
  return tail(s, 0.35);
}

export function typing(): Stereo {
  const s = Stereo.sec(0.05);
  const x = arr(0.05);
  const nz = noise(x.length, 61);
  const hp = new SVF(2600, 0.8);
  const bp = new SVF(700, 2.5);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += 190 / SR;
    const click = hp.hp(nz[i]) * Math.exp(-t / 0.0018) * 0.7;
    const body = bp.bp(nz[i]) * Math.exp(-t / 0.009) * 1.6;
    const thock = Math.sin(TAU * ph) * Math.exp(-t / 0.007) * 0.35;
    x[i] = click + body + thock;
  }
  addMono(s, 0, edgeFade(x, 4, 300));
  return s;
}

export function build(): Stereo {
  const s = Stereo.sec(0.5);
  I.boom(s, 0, { f0: 130, f1: 55, glide: 0.03, decay: 0.08, gain: 2.0 });
  // pop
  const p = arr(0.07);
  const o = new PulseOsc(0);
  const lp = new SVF(2500, 0.7);
  for (let i = 0; i < p.length; i++) {
    const t = i / SR;
    const f = 520 * Math.pow(2, (7 * Math.min(1, t / 0.03)) / 12);
    p[i] = lp.lp(o.next(f, 0.25)) * Math.exp(-t / 0.025) * 0.5;
  }
  addMono(s, 0, edgeFade(p, 24, 120));
  // estalidos pequenos (peças de madeira/tijolinhos assentando)
  const r = new Rng(71);
  const times = [0.07, 0.11, 0.16, 0.2, 0.26, 0.33];
  times.forEach((t0, k) => {
    const g = arr(0.04);
    const nz = noise(g.length, 700 + k);
    const bp = new SVF(r.range(1800, 4200), 6);
    for (let i = 0; i < g.length; i++) g[i] = bp.bp(nz[i]) * Math.exp(-(i / SR) / r.range(0.004, 0.009)) * 2.2;
    addMono(s, s2n(t0), edgeFade(g, 4, 60), 0.9 - 0.11 * k, r.uni() * 0.7);
  });
  I.tok(s, 0.12, 1100, { gain: 0.6, pan: 0.3 });
  addVerb(s, 0.15, 0.4);
  return tail(s, 0.08);
}

export function levelup(): Stereo {
  const s = Stereo.sec(1.8);
  const run: [number, string][] = [[0, 'C5'], [0.09, 'F5'], [0.18, 'A5']];
  run.forEach(([t, n]) => {
    I.lead(s, t, 0.08, nm(n), { gain: 1.3, duty: 0.25, cutoff: 3200, vib: 0, glide: 0.2 });
    I.pluck(s, t, nm(n) - 12, { gain: 1.0, decay: 0.1 });
  });
  I.lead(s, 0.27, 0.28, nm('C6'), { gain: 1.4, duty: 0.3, cutoff: 3200, vib: 12, glide: 0.2 });
  // acorde final de "metais" chiptune (pulso + PWM) com sino
  const chord = ['F4', 'A4', 'C5', 'F5'];
  chord.forEach((n, i) => {
    I.lead(s, 0.6, 0.75, nm(n), { gain: 0.9, duty: 0.35, cutoff: 2600, vib: 10, vibRate: 5.5, attack: 0.012, release: 0.25, glide: 0.15, pan: -0.3 + 0.2 * i });
  });
  I.bass(s, 0.6, 0.8, nm('F2'), { gain: 1.3, decay: 0.5, sustain: 0.5 });
  ['F6', 'A6', 'C7'].forEach((n, i) => I.bell(s, 0.6 + i * 0.02, nm(n), { gain: 0.8, decay: 0.55, index: 1.3, pan: -0.4 + 0.4 * i, len: 1.2 }));
  I.crash(s, 0.6, { gain: 0.5, decay: 0.7, hp: 4000 });
  const r = new Rng(81);
  for (let k = 0; k < 14; k++) I.bell(s, 0.65 + 0.06 * k, nm(r.pick(['C7', 'F7', 'A7', 'G7'])), { gain: 0.3, decay: 0.08, index: 0.8, pan: r.uni() * 0.9, len: 0.4 });
  addVerb(s, 0.3, 0.7);
  return tail(s, 0.3);
}

export function firework(): Stereo {
  const s = Stereo.sec(2.0);
  // assobio de subida
  const w = arr(0.8);
  const nz = noise(w.length, 91);
  const bp = new SVF(1000, 3);
  let ph = 0;
  for (let i = 0; i < w.length; i++) {
    const t = i / SR;
    const u = t / 0.8;
    const f = 900 * Math.pow(2600 / 900, u) * (1 + 0.006 * Math.sin(TAU * 17 * t));
    ph += f / SR;
    if ((i & 15) === 0) bp.set(f, 3);
    const env = Math.min(1, u / 0.15) * (u > 0.92 ? (1 - u) / 0.08 : 1) * (0.5 + 0.5 * u);
    w[i] = (Math.sin(TAU * ph) * 0.35 + bp.bp(nz[i]) * 0.5) * env;
  }
  addMono(s, 0, edgeFade(w, 24, 120), 0.7, -0.2);
  // estouro abafado
  const tb = 0.8;
  const b = arr(0.9);
  const nb = noise(b.length, 92);
  const lp = new SVF(900, 0.7);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const att = t < 0.004 ? t / 0.004 : 1;
    b[i] = lp.lp(nb[i]) * Math.exp(-t / 0.18) * att * 1.6;
  }
  addMono(s, s2n(tb), edgeFade(b, 0, 300), 0.9);
  I.boom(s, tb, { f0: 90, f1: 45, glide: 0.05, decay: 0.25, gain: 1.4 });
  // crepitar
  const r = new Rng(93);
  for (let k = 0; k < 70; k++) {
    const t = tb + 0.05 + Math.pow(r.next(), 1.7) * 1.05;
    const g = arr(0.012);
    const ng = noise(g.length, 900 + k);
    const hp = new SVF(r.range(2500, 6000), 1.5);
    for (let i = 0; i < g.length; i++) g[i] = hp.hp(ng[i]) * Math.exp(-(i / SR) / r.range(0.0015, 0.0035));
    addMono(s, s2n(t), edgeFade(g, 2, 40), (0.25 + 0.35 * r.next()) * Math.exp(-(t - tb) / 0.7), r.uni() * 0.9);
  }
  addVerb(s, 0.4, 0.8, 4500, 150);
  return tail(s, 0.3);
}

export function stamp(): Stereo {
  const s = Stereo.sec(0.3);
  I.boom(s, 0, { f0: 150, f1: 70, glide: 0.02, decay: 0.06, gain: 1.8 });
  const x = arr(0.2);
  const nz = noise(x.length, 101);
  const lp = new SVF(1600, 0.7);
  const body = new SVF(320, 3);
  const hp = new SVF(3200, 0.7);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const v = nz[i];
    x[i] = lp.lp(v) * Math.exp(-t / 0.022) * 0.9 + body.bp(v) * Math.exp(-t / 0.05) * 1.4 + hp.hp(v) * Math.exp(-t / 0.006) * 0.25;
  }
  addMono(s, 0, edgeFade(x, 8, 300));
  addVerb(s, 0.12, 0.35);
  return tail(s, 0.06);
}

// ------------------------------------------------------------------------------------
// Loops (sem emenda): eventos colocados em linha circular + filtros em regime periódico
// ------------------------------------------------------------------------------------
export function nightAmbience(): Stereo {
  const dur = 20;
  const N = s2n(dur);
  const dry = new Stereo(N);
  const r = new Rng(2020);
  // grilos: trilhas de 3–4 pulsos (~38/s) em portadora de 4–5,5 kHz
  const crickets = [
    { f: 4400, rate: 0.62, pulses: 3, gain: 0.5, pan: -0.55 },
    { f: 4950, rate: 0.83, pulses: 4, gain: 0.38, pan: 0.5 },
    { f: 5500, rate: 1.1, pulses: 2, gain: 0.22, pan: 0.1 },
    { f: 4100, rate: 0.71, pulses: 3, gain: 0.18, pan: 0.85 },
  ];
  for (const c of crickets) {
    let t = r.range(0, c.rate);
    while (t < dur) {
      const amp = c.gain * (0.65 + 0.35 * r.next());
      // pausas ocasionais
      if (r.next() < 0.12) {
        t += c.rate * r.range(2, 4);
        continue;
      }
      for (let p = 0; p < c.pulses; p++) {
        const len = 0.013;
        const x = arr(len);
        let ph = r.next();
        for (let i = 0; i < x.length; i++) {
          const u = i / x.length;
          ph += (c.f * (1 + 0.01 * u)) / SR;
          x[i] = Math.sin(TAU * ph) * Math.sin(Math.PI * u) ** 2;
        }
        addMonoWrap(dry, s2n(t + p * 0.026), x, amp, c.pan);
      }
      t += c.rate * r.range(0.85, 1.15);
    }
  }
  // zumbido distante da cidade (ruído marrom grave + leve 120 Hz) e vento fraco em rajadas
  const nl = noise(N, 2021);
  const nr = noise(N, 2022);
  const nw = noise(N, 2023);
  const bed = new Stereo(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const lfo = 0.8 + 0.2 * Math.sin((TAU * t) / dur) + 0.1 * Math.sin((TAU * 3 * t) / dur + 1);
    const gust = (k: number, c: number, w: number): number => {
      let d = Math.abs(t - c);
      d = Math.min(d, dur - d);
      return k * Math.exp(-((d / w) ** 2));
    };
    const wind = gust(1, 5.5, 1.6) + gust(0.7, 14.2, 2.2);
    bed.L[i] = nl[i] * lfo;
    bed.R[i] = nr[i] * lfo;
    nw[i] *= wind; // vento: vai para o passa-banda móvel abaixo
  }
  const out = circular(
    (() => {
      const st = new Stereo(N);
      st.L.set(bed.L);
      st.R.set(bed.R);
      return st;
    })(),
    (big) => {
      // marrom = integrador com fuga + passa-baixas
      const res = new Stereo(big.n);
      for (const [src, dst] of [[big.L, res.L], [big.R, res.R]] as const) {
        let y = 0;
        // trânsito distante: grave arredondado entre ~70 e ~350 Hz (audível também em celular)
        const lp = new OnePole(300);
        const lp2 = new OnePole(380);
        const hp = new OnePole(70); // também tira o DC do integrador
        const hp2 = new OnePole(70);
        for (let i = 0; i < big.n; i++) {
          y = 0.995 * y + src[i] * 0.05;
          dst[i] = hp2.hp(hp.hp(lp2.lp(lp.lp(y)))) * 2.2;
        }
      }
      return res;
    },
    3,
  );
  // vento: passa-banda móvel
  const windSt = new Stereo(N);
  windSt.L.set(nw);
  windSt.R.set(nw);
  const wind = circular(
    windSt,
    (big) => {
      const res = new Stereo(big.n);
      const bl = new SVF(450, 0.9);
      const br = new SVF(520, 0.9);
      for (let i = 0; i < big.n; i++) {
        const t = (i % N) / SR;
        if ((i & 63) === 0) {
          const f = 420 + 160 * Math.sin((TAU * 2 * t) / dur);
          bl.set(f, 0.9);
          br.set(f * 1.12, 0.9);
        }
        res.L[i] = bl.bp(big.L[i]);
        res.R[i] = br.bp(big.R[i] * 0.9);
      }
      return res;
    },
    3,
  );
  const hum = new Stereo(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const v = (Math.sin(TAU * 120 * t) * 0.6 + Math.sin(TAU * 240 * t + 0.4) * 0.25) * (0.7 + 0.3 * Math.sin((TAU * 2 * t) / dur));
    hum.L[i] = v * 0.04;
    hum.R[i] = v * 0.04;
  }
  // grilos com um pouco de espaço (reverb circular) e passa-baixas (estão longe)
  const crick = circular(dry, (big) => {
    const res = big.clone();
    const l1 = new OnePole(7000);
    const l2 = new OnePole(7000);
    for (let i = 0; i < res.n; i++) {
      res.L[i] = l1.lp(res.L[i]);
      res.R[i] = l2.lp(res.R[i]);
    }
    return res.mix(reverb(res, { room: 0.6, damp: 0.6, lp: 6000, hp: 1500, predelay: 0.02 }), 0.6);
  }, 3);
  const mix = new Stereo(N);
  mix.mix(out, 0.7).mix(wind, 0.45).mix(hum, 0.5).mix(crick, 2.2);
  return mix;
}

export function water(): Stereo {
  const dur = 10;
  const N = s2n(dur);
  const dry = new Stereo(N);
  const r = new Rng(3030);
  // gotas/bolhas: senoide com tom subindo (ressonância de bolha) e decaimento rápido
  const count = 520;
  for (let k = 0; k < count; k++) {
    const t = r.next() * dur;
    const f0 = 500 * Math.pow(5, r.next());
    const tau = 0.006 + 0.03 * r.next();
    const amp = Math.pow(r.next(), 2.2) * 0.9 + 0.05;
    const len = tau * 6;
    const x = arr(len);
    let ph = 0;
    for (let i = 0; i < x.length; i++) {
      const tt = i / SR;
      ph += (f0 * (1 + (tt / tau) * 0.35)) / SR;
      x[i] = Math.sin(TAU * ph) * Math.exp(-tt / tau) * (tt < 0.0008 ? tt / 0.0008 : 1);
    }
    edgeFade(x, 0, 24);
    addMonoWrap(dry, s2n(t), x, amp, r.uni() * 0.8);
  }
  // corrente: ruído em passa-banda com modulação lenta e irregular (periódica no loop)
  const nl = noise(N, 3031);
  const nr = noise(N, 3032);
  const flow = new Stereo(N);
  const phs = [r.next(), r.next(), r.next()];
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const m =
      0.75 +
      0.12 * Math.sin((TAU * 7 * t) / dur + phs[0] * TAU) +
      0.08 * Math.sin((TAU * 23 * t) / dur + phs[1] * TAU) +
      0.05 * Math.sin((TAU * 61 * t) / dur + phs[2] * TAU);
    flow.L[i] = nl[i] * m;
    flow.R[i] = nr[i] * m;
  }
  const flowF = circular(flow, (big) => {
    const res = new Stereo(big.n);
    const b1 = new SVF(1500, 0.8);
    const b2 = new SVF(1700, 0.8);
    const l1 = new SVF(320, 0.7);
    const l2 = new SVF(320, 0.7);
    for (let i = 0; i < big.n; i++) {
      res.L[i] = b1.bp(big.L[i]) * 0.35 + l1.lp(big.L[i]) * 0.5;
      res.R[i] = b2.bp(big.R[i]) * 0.35 + l2.lp(big.R[i]) * 0.5;
    }
    return res;
  }, 3);
  const drops = circular(dry, (big) => {
    const res = big.clone();
    return res.mix(reverb(res, { room: 0.45, damp: 0.5, lp: 7000, hp: 400, predelay: 0.006 }), 0.35);
  }, 3);
  const mix = new Stereo(N);
  mix.mix(flowF, 1).mix(drops, 0.35);
  return mix;
}
