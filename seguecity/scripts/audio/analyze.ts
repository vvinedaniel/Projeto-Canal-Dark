// Verificação do áudio gerado (não precisa ouvir): ffprobe (duração/taxa/canais), ffmpeg ebur128
// (LUFS integrado e pico verdadeiro), DC, saturação, continuidade dos loops e energia por segundo.
//   npx tsx scripts/audio/analyze.ts            relatório completo
//   npx tsx scripts/audio/analyze.ts --md       também imprime a tabela em Markdown (para docs/AUDIO.md)
import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { Stereo, toDb } from './dsp';
import { blockLoudness } from './loudness';
import { readWav16 } from './wav';

const ROOT = resolve(dirname(resolve(process.argv[1])), '..', '..');
const DIR = join(ROOT, 'public', 'audio');
const LOOPS = new Set(['night-ambience.wav', 'water.wav']);

function ffprobe(path: string): { dur: number; sr: number; ch: number; codec: string } {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=sample_rate,channels,codec_name:format=duration', '-of', 'json', path]).toString();
  const j = JSON.parse(out);
  const st = j.streams[0];
  return { dur: parseFloat(j.format.duration), sr: parseInt(st.sample_rate, 10), ch: st.channels, codec: st.codec_name };
}

function ebur128(path: string): { I: number; TP: number; LRA: number } {
  // ffmpeg escreve o resumo no stderr
  let txt = '';
  try {
    execFileSync('ffmpeg', ['-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    txt = String((e as { stderr?: Buffer }).stderr ?? '');
  }
  if (!txt) {
    txt = execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${path}" -af ebur128=peak=true -f null - 2>&1`]).toString();
  }
  const sum = txt.slice(txt.lastIndexOf('Summary:'));
  const num = (re: RegExp): number => {
    const m = re.exec(sum);
    return m ? parseFloat(m[1]) : NaN;
  };
  return { I: num(/I:\s+(-?[\d.]+|-inf) LUFS/), TP: num(/Peak:\s+(-?[\d.]+|-inf) dBFS/), LRA: num(/LRA:\s+(-?[\d.]+) LU/) };
}

function stats(s: Stereo): { dcL: number; dcR: number; clip: number; peak: number; first: number; last: number } {
  let dl = 0;
  let dr = 0;
  let clip = 0;
  for (let i = 0; i < s.n; i++) {
    dl += s.L[i];
    dr += s.R[i];
    if (Math.abs(s.L[i]) >= 32767 / 32768 || Math.abs(s.R[i]) >= 32767 / 32768) clip++;
  }
  const first = Math.max(Math.abs(s.L[0]), Math.abs(s.R[0]));
  const last = Math.max(Math.abs(s.L[s.n - 1]), Math.abs(s.R[s.n - 1]));
  return { dcL: dl / s.n, dcR: dr / s.n, clip, peak: s.peak(), first, last };
}

/** emenda do loop: salto (1ª diferença) e "estalo" (2ª diferença) na volta fim->início,
 *  comparados à distribuição das mesmas medidas no resto do arquivo */
function loopSeam(s: Stereo): { jump: number; p99: number; p999: number; ratio: number; d2: number; d2p999: number } {
  const n = s.n;
  const at = (x: Float64Array, i: number): number => x[((i % n) + n) % n];
  const d: number[] = [];
  const dd: number[] = [];
  for (let i = 1; i < n - 1; i++) {
    d.push(Math.max(Math.abs(s.L[i] - s.L[i - 1]), Math.abs(s.R[i] - s.R[i - 1])));
    dd.push(Math.max(Math.abs(s.L[i + 1] - 2 * s.L[i] + s.L[i - 1]), Math.abs(s.R[i + 1] - 2 * s.R[i] + s.R[i - 1])));
  }
  d.sort((a, b) => a - b);
  dd.sort((a, b) => a - b);
  const jump = Math.max(Math.abs(s.L[0] - s.L[n - 1]), Math.abs(s.R[0] - s.R[n - 1]));
  let d2 = 0;
  for (const i of [n - 1, 0]) {
    for (const x of [s.L, s.R]) d2 = Math.max(d2, Math.abs(at(x, i + 1) - 2 * at(x, i) + at(x, i - 1)));
  }
  const p99 = d[Math.floor(d.length * 0.99)];
  const p999 = d[Math.floor(d.length * 0.999)];
  return { jump, p99, p999, ratio: jump / Math.max(p99, 1e-9), d2, d2p999: dd[Math.floor(dd.length * 0.999)] };
}

/** maior loudness em janelas de 100 ms (filtro K), para comparar efeitos curtos entre si */
function maxShortLoudness(s: Stereo): number {
  const pad = new Stereo(s.n + 4800);
  pad.L.set(s.L);
  pad.R.set(s.R);
  const bl = blockLoudness(pad, 0.1, 0.01);
  return Math.max(...bl);
}

/** RMS (dBFS) em janelas */
function rmsWindows(s: Stereo, win: number, sr: number): number[] {
  const n = Math.round(win * sr);
  const out: number[] = [];
  for (let st = 0; st + n <= s.n; st += n) {
    let acc = 0;
    for (let i = st; i < st + n; i++) acc += s.L[i] * s.L[i] + s.R[i] * s.R[i];
    out.push(toDb(Math.sqrt(acc / (2 * n))));
  }
  return out;
}

function list(dir: string): string[] {
  const out: string[] = [];
  for (const sub of ['music', 'sfx']) {
    for (const f of readdirSync(join(dir, sub)).sort()) if (f.endsWith('.wav')) out.push(join(dir, sub, f));
  }
  return out;
}

function main(): void {
  const md = process.argv.includes('--md');
  const rows: string[] = [];
  const sfxRows: string[] = [];
  let ok = true;
  for (const path of list(DIR)) {
    const name = path.split('/').pop()!;
    const p = ffprobe(path);
    const e = ebur128(path);
    const { s } = readWav16(path);
    const st = stats(s);
    const isMusic = path.includes('/music/');
    const isLoop = LOOPS.has(name);
    const notes: string[] = [];
    if (p.sr !== 48000 || p.ch !== 2 || p.codec !== 'pcm_s16le') notes.push('FORMATO!');
    if (st.clip > 0) notes.push(`${st.clip} amostras saturadas`);
    if (Math.abs(st.dcL) > 1e-3 || Math.abs(st.dcR) > 1e-3) notes.push(`DC ${st.dcL.toExponential(1)}/${st.dcR.toExponential(1)}`);
    if (isMusic && (Math.abs(e.I + 16) > 0.5 || e.TP > -1.5)) notes.push('fora da meta (-16 LUFS, TP <= -1,5)');
    if (isLoop && Math.abs(e.I + 30) > 0.5) notes.push('fora da meta (-30 LUFS)');
    if (!isMusic && !isLoop && Math.abs(toDb(st.peak) + 3) > 0.1) notes.push('pico fora de -3 dBFS');
    if (!isLoop && (st.first > 1e-3 || st.last > 1e-3)) notes.push(`ponta não-zero (${st.first.toFixed(4)} / ${st.last.toFixed(4)})`);
    let seam = '';
    if (isLoop) {
      const ls = loopSeam(s);
      seam = `emenda: salto ${ls.jump.toExponential(2)} (p99 ${ls.p99.toExponential(2)}), 2ª dif ${ls.d2.toExponential(2)} (p99,9 ${ls.d2p999.toExponential(2)})`;
      if (ls.jump > ls.p999 || ls.d2 > ls.d2p999) notes.push('EMENDA COM SALTO');
    }
    if (notes.length) ok = false;
    let sugg = '';
    if (!isMusic && !isLoop) {
      const m = maxShortLoudness(s);
      // volume sugerido para o efeito ficar ~8 LU abaixo de uma narração em -16 LUFS (pico de 100 ms em -24)
      const vol = Math.min(1, Math.pow(10, (-24 - m) / 20));
      sugg = `  máx100ms ${m.toFixed(1)} LUFS -> volume sugerido ${vol.toFixed(2)}`;
      sfxRows.push(`| \`${name}\` | ${m.toFixed(1)} | ${vol.toFixed(2)} |`);
    }
    const line = `${relative(ROOT, path).padEnd(36)} ${p.dur.toFixed(3).padStart(7)} s  ${p.sr} Hz ${p.ch} ch  I ${String(e.I).padStart(6)} LUFS  TP ${String(e.TP).padStart(6)} dBTP  pico ${toDb(st.peak).toFixed(2)} dBFS  LRA ${e.LRA}  DC ${Math.max(Math.abs(st.dcL), Math.abs(st.dcR)).toExponential(1)}  ${seam}${sugg} ${notes.length ? '<< ' + notes.join('; ') : 'ok'}`;
    console.log(line);
    rows.push(`| \`${relative(ROOT, path)}\` | ${p.dur.toFixed(3)} s | ${p.sr} Hz / ${p.ch} | ${Number.isFinite(e.I) ? e.I.toFixed(1) : 'n/d'} | ${e.TP.toFixed(1)} | ${toDb(st.peak).toFixed(1)} |`);
    if (name === 'ep01.wav' || name === 'demo.wav') {
      const r = rmsWindows(s, 1, 48000);
      console.log(`  RMS por segundo (dBFS), ${name}:`);
      for (let k = 0; k < r.length; k += 10) console.log(`   ${String(k).padStart(3)}–${String(Math.min(k + 10, r.length)).padStart(3)} s: ${r.slice(k, k + 10).map((v) => v.toFixed(1).padStart(6)).join(' ')}`);
      if (name === 'ep01.wav') {
        const r10 = rmsWindows(s, 0.1, 48000);
        const at = (t: number) => r10[Math.floor(t * 10)];
        console.log(`  ep01 checagens: média 1–7 s ${avg(r.slice(1, 7)).toFixed(1)} | 9–14 s ${avg(r.slice(9, 14)).toFixed(1)} | 16–23 s ${avg(r.slice(16, 23)).toFixed(1)} | 59–67 s ${avg(r.slice(59, 67)).toFixed(1)} dBFS`);
        console.log(`  ep01 em 100 ms: 71,8 ${at(71.8).toFixed(1)} | 72,0 ${at(72.0).toFixed(1)} | 72,1 ${at(72.1).toFixed(1)} | 74,0 ${at(74.0).toFixed(1)} | 74,9 ${at(74.9).toFixed(1)} dBFS`);
        console.log(`  ep01 tape stop: 7,8 ${at(7.8).toFixed(1)} | 8,1 ${at(8.1).toFixed(1)} | 8,3 ${at(8.3).toFixed(1)} | 8,5 ${at(8.5).toFixed(1)} | 9,0 ${at(9.0).toFixed(1)} dBFS`);
      }
    }
  }
  if (md) {
    console.log('\n| arquivo | duração | taxa / canais | LUFS integrado | pico verdadeiro (dBTP) | pico de amostra (dBFS) |');
    console.log('|---|---|---|---|---|---|');
    for (const r of rows) console.log(r);
    console.log('\n| efeito | loudness máx. em 100 ms (LUFS) | volume sugerido |');
    console.log('|---|---|---|');
    for (const r of sfxRows) console.log(r);
  }
  console.log(ok ? '\nTUDO OK' : '\nHÁ PROBLEMAS (veja << acima)');
  if (!ok) process.exitCode = 1;
}

const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);

main();
