// Medição e controle de loudness: ITU-R BS.1770-4 (LUFS integrado), pico verdadeiro
// (sobreamostragem 4x) e limitador com antecipação. Usado para normalizar a trilha.
import { Biquad, SR, Stereo, db, toDb } from './dsp';

/** filtro K de BS.1770 (coeficientes oficiais para 48 kHz) */
function kWeighted(x: Float64Array): Float64Array {
  const s1 = Biquad.raw(1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585);
  const s2 = Biquad.raw(1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621);
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = s2.tick(s1.tick(x[i]));
  return y;
}

/** loudness de cada bloco de 400 ms (passo de 100 ms), em LUFS */
export function blockLoudness(s: Stereo, blockSec = 0.4, hopSec = 0.1): number[] {
  if (SR !== 48000) throw new Error('kWeighted espera 48 kHz');
  const l = kWeighted(s.L);
  const r = kWeighted(s.R);
  const B = Math.round(blockSec * SR);
  const H = Math.round(hopSec * SR);
  const out: number[] = [];
  // somas acumuladas para janelas rápidas
  const cs = new Float64Array(s.n + 1);
  for (let i = 0; i < s.n; i++) cs[i + 1] = cs[i] + l[i] * l[i] + r[i] * r[i];
  for (let st = 0; st + B <= s.n; st += H) {
    const ms = (cs[st + B] - cs[st]) / B;
    out.push(-0.691 + 10 * Math.log10(Math.max(ms, 1e-20)));
  }
  return out;
}

/** LUFS integrado (com portas absoluta -70 e relativa -10 LU) */
export function integratedLufs(s: Stereo): number {
  const bl = blockLoudness(s);
  const abs = bl.filter((v) => v > -70);
  if (abs.length === 0) return -Infinity;
  const meanPow = (arr: number[]) => arr.reduce((a, v) => a + Math.pow(10, (v + 0.691) / 10), 0) / arr.length;
  const ungated = -0.691 + 10 * Math.log10(meanPow(abs));
  const rel = abs.filter((v) => v > ungated - 10);
  return -0.691 + 10 * Math.log10(meanPow(rel));
}

// interpolador 4x (sinc janelado, 24 coeficientes por fase)
const OS = 4;
const HALF = 12;
const PHASES: Float64Array[] = (() => {
  const ph: Float64Array[] = [];
  for (let k = 1; k < OS; k++) {
    const frac = k / OS;
    const c = new Float64Array(2 * HALF);
    let sum = 0;
    for (let j = -HALF + 1; j <= HALF; j++) {
      const x = j - frac; // distância da amostra n+j ao ponto n+frac (com sinal trocado)
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
      const w = 0.42 + 0.5 * Math.cos((Math.PI * x) / HALF) + 0.08 * Math.cos((2 * Math.PI * x) / HALF); // Blackman
      c[j + HALF - 1] = sinc * w;
      sum += sinc * w;
    }
    for (let i = 0; i < c.length; i++) c[i] /= sum;
    ph.push(c);
  }
  return ph;
})();

/** envoltória de pico verdadeiro por amostra: max(|x[n]|, |interpolados entre n e n+1|), L e R juntos */
export function truePeakEnvelope(s: Stereo): Float64Array {
  const env = new Float64Array(s.n);
  for (const x of [s.L, s.R]) {
    for (let n = 0; n < s.n; n++) {
      let p = Math.abs(x[n]);
      for (const c of PHASES) {
        let acc = 0;
        for (let j = -HALF + 1; j <= HALF; j++) {
          const idx = n + j;
          if (idx >= 0 && idx < s.n) acc += x[idx] * c[j + HALF - 1];
        }
        const a = Math.abs(acc);
        if (a > p) p = a;
      }
      if (p > env[n]) env[n] = p;
    }
  }
  return env;
}

export function truePeakDb(s: Stereo): number {
  const e = truePeakEnvelope(s);
  let p = 0;
  for (let i = 0; i < e.length; i++) if (e[i] > p) p = e[i];
  return toDb(p);
}

export function samplePeakDb(s: Stereo): number {
  return toDb(s.peak());
}

/**
 * Limitador de pico verdadeiro com antecipação: ganho = média móvel (L amostras) de um mínimo
 * móvel adiante (L amostras) do ganho necessário -> nunca passa do teto; liberação exponencial.
 */
export function limitTruePeak(
  s: Stereo,
  ceilingDb: number,
  gain = 1,
  envIn?: Float64Array,
  lookMs = 2,
  releaseMs = 80,
): { out: Stereo; maxGr: number; grSec: number } {
  const ceil = db(ceilingDb) / gain; // trabalha no domínio do sinal antes do ganho
  const env = envIn ?? truePeakEnvelope(s);
  const n = s.n;
  const L = Math.max(1, Math.round((lookMs / 1000) * SR));
  const req = new Float64Array(n);
  for (let i = 0; i < n; i++) req[i] = env[i] > ceil ? ceil / env[i] : 1;
  // mínimo móvel adiante: m[i] = min(req[i..i+L-1]) (deque monotônica)
  const m = new Float64Array(n);
  const dq = new Int32Array(n + L + 1);
  let h = 0;
  let t = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (t > h && req[dq[t - 1]] >= req[i]) t--;
    dq[t++] = i;
    while (dq[h] > i + L - 1) h++;
    m[i] = req[dq[h]];
  }
  // a deque acima foi preenchida de trás para frente; os índices em dq decrescem, então
  // "dq[h] > i+L-1" remove os que saíram da janela. Média móvel para suavizar o ataque:
  const g = new Float64Array(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    acc += m[i];
    if (i >= L) acc -= m[i - L];
    const cnt = Math.min(i + 1, L);
    // nas primeiras amostras completa a janela com 1 (ganho unitário antes do início)
    g[i] = (acc + (L - cnt)) / L;
  }
  const rel = Math.exp(-1 / ((releaseMs / 1000) * SR));
  const out = new Stereo(n);
  let gs = 1;
  let maxGr = 0;
  let grN = 0;
  for (let i = 0; i < n; i++) {
    const target = g[i];
    gs = target < gs ? target : Math.min(target, gs * rel + target * (1 - rel));
    out.L[i] = s.L[i] * gs * gain;
    out.R[i] = s.R[i] * gs * gain;
    const gr = -toDb(gs);
    if (gr > maxGr) maxGr = gr;
    if (gr > 1) grN++;
  }
  return { out, maxGr, grSec: grN / SR };
}

export interface NormResult {
  out: Stereo;
  lufs: number;
  tp: number;
  gainDb: number;
  maxGr: number;
  grSec: number; // tempo total com redução > 1 dB
}

/** normaliza para targetLufs integrado com teto de pico verdadeiro (itera ganho + limitador) */
export function normalizeLoudness(s: Stereo, targetLufs: number, ceilingDb: number): NormResult {
  let gainDb = targetLufs - integratedLufs(s);
  let res = { out: s, maxGr: 0, grSec: 0 };
  let l = -Infinity;
  const env = truePeakEnvelope(s); // escala linearmente com o ganho: calcula uma vez só
  for (let it = 0; it < 8; it++) {
    res = limitTruePeak(s, ceilingDb, db(gainDb), env);
    l = integratedLufs(res.out);
    const err = targetLufs - l;
    if (Math.abs(err) < 0.03) break;
    gainDb += err;
  }
  return { out: res.out, lufs: l, tp: truePeakDb(res.out), gainDb, maxGr: res.maxGr, grSec: res.grSec };
}

/** normaliza o pico de amostra para peakDb */
export function normalizePeak(s: Stereo, peakDb: number): Stereo {
  const p = s.peak();
  return p > 0 ? s.scale(db(peakDb) / p) : s;
}
