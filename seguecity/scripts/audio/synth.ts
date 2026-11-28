// Gera TODO o áudio do SegueCity (trilhas + efeitos) a partir de código, sem amostras externas.
//   npx tsx scripts/audio/synth.ts            gera tudo
//   npx tsx scripts/audio/synth.ts coin demo  gera só os itens citados
// Saída: WAV PCM 16 bits, 48 kHz, estéreo, em public/audio/. Determinístico (byte a byte).
import { dirname, join, relative, resolve } from 'node:path';
import { SR, Stereo, toDb } from './dsp';
import { normalizeLoudness, normalizePeak, truePeakDb } from './loudness';
import { EP01_INFO, renderDemo, renderEp01 } from './music';
import * as F from './sfx';
import { writeWav16 } from './wav';

// raiz do projeto a partir do caminho deste script (funciona em CJS e ESM)
const ROOT = resolve(dirname(resolve(process.argv[1])), '..', '..');
const OUT = join(ROOT, 'public', 'audio');

type Norm = { kind: 'lufs'; target: number; ceiling: number } | { kind: 'peak'; db: number };
interface Item {
  id: string;
  file: string;
  render: () => Stereo;
  norm: Norm;
  exact?: number; // duração exata em s
}

const MUSIC: Norm = { kind: 'lufs', target: -16, ceiling: -2.0 };
const SFX: Norm = { kind: 'peak', db: -3 };
const AMB: Norm = { kind: 'lufs', target: -30, ceiling: -6 };

const ITEMS: Item[] = [
  { id: 'demo', file: 'music/demo.wav', render: renderDemo, norm: MUSIC, exact: 15 },
  { id: 'ep01', file: 'music/ep01.wav', render: renderEp01, norm: MUSIC, exact: 75 },
  { id: 'ui-blip', file: 'sfx/ui-blip.wav', render: F.uiBlip, norm: SFX },
  { id: 'ui-move', file: 'sfx/ui-move.wav', render: F.uiMove, norm: SFX },
  { id: 'popup', file: 'sfx/popup.wav', render: F.popup, norm: SFX },
  { id: 'notify', file: 'sfx/notify.wav', render: F.notify, norm: SFX },
  { id: 'unlock', file: 'sfx/unlock.wav', render: F.unlock, norm: SFX },
  { id: 'coin', file: 'sfx/coin.wav', render: F.coin, norm: SFX },
  { id: 'sparkle', file: 'sfx/sparkle.wav', render: F.sparkle, norm: SFX },
  { id: 'tick', file: 'sfx/tick.wav', render: F.tick, norm: SFX },
  { id: 'empty', file: 'sfx/empty.wav', render: F.empty, norm: SFX },
  { id: 'typing', file: 'sfx/typing.wav', render: F.typing, norm: SFX },
  { id: 'build', file: 'sfx/build.wav', render: F.build, norm: SFX },
  { id: 'levelup', file: 'sfx/levelup.wav', render: F.levelup, norm: SFX },
  { id: 'firework', file: 'sfx/firework.wav', render: F.firework, norm: SFX },
  { id: 'stamp', file: 'sfx/stamp.wav', render: F.stamp, norm: SFX },
  { id: 'night-ambience', file: 'sfx/night-ambience.wav', render: F.nightAmbience, norm: AMB, exact: 20 },
  { id: 'water', file: 'sfx/water.wav', render: F.water, norm: AMB, exact: 10 },
];

function fit(s: Stereo, sec: number): Stereo {
  const n = Math.round(sec * SR);
  return s.n === n ? s : s.slice(0, n);
}

function main(): void {
  const want = new Set(process.argv.slice(2));
  const t0 = Date.now();
  const rows: string[] = [];
  for (const it of ITEMS) {
    if (want.size && !want.has(it.id)) continue;
    const ts = Date.now();
    let s = it.render();
    if (it.exact) s = fit(s, it.exact);
    let info = '';
    if (it.norm.kind === 'lufs') {
      const r = normalizeLoudness(s, it.norm.target, it.norm.ceiling);
      s = r.out;
      info = `${r.lufs.toFixed(2)} LUFS  TP ${r.tp.toFixed(2)} dBTP  limitador máx ${r.maxGr.toFixed(1)} dB (${r.grSec.toFixed(2)} s acima de 1 dB)`;
    } else {
      s = normalizePeak(F.removeDC(s), it.norm.db);
      info = `pico ${toDb(s.peak()).toFixed(2)} dBFS  TP ${truePeakDb(s).toFixed(2)} dBTP`;
    }
    const path = join(OUT, it.file);
    writeWav16(path, s);
    const line = `${relative(ROOT, path).padEnd(36)} ${(s.n / SR).toFixed(3).padStart(7)} s  ${info}  (${((Date.now() - ts) / 1000).toFixed(1)} s)`;
    console.log(line);
    rows.push(line);
  }
  if (!want.size || want.has('ep01')) {
    console.log(`ep01: andamentos ${EP01_INFO.tempos.map((t) => `${t.t0}–${t.t1} s ${t.bpm.toFixed(2)} BPM`).join(', ')}`);
    console.log(`ep01: acentos das profissões em ${EP01_INFO.accents.map((t) => t.toFixed(3)).join(', ')} s`);
  }
  console.log(`total: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main();
