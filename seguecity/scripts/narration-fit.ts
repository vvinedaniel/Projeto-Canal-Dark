// Encaixa a narração real nas frases do roteiro do Ep. 01.
// 1) Coloque a voz em public/audio/ep01/narracao.wav (ou .mp3), começando em 0 s do episódio.
// 2) npm run narration:fit   → mede as falas (silencedetect -35 dB / 0,22 s), junta trechos até ficar
//    uma fala por frase e grava src/scenes/ep01/narration-timing.json. Legendas, rótulos, efeitos e o
//    "ducking" da trilha passam a seguir esses tempos.  (--reset volta às marcações provisórias)
import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env';

const OUT = path.join(ROOT, 'src/scenes/ep01/narration-timing.json');
if (process.argv.includes('--reset')) { writeFileSync(OUT, '{}\n'); console.log('marcações provisórias restauradas'); process.exit(0); }
const file = ['wav', 'mp3'].map((e) => path.join(ROOT, `public/audio/ep01/narracao.${e}`)).find(existsSync);
if (!file) { console.error('falta public/audio/ep01/narracao.wav (ou .mp3)'); process.exit(1); }

// frases na mesma ordem de narration.ts (ids e janelas das cenas)
const IDS = Array.from({ length: 21 }, (_, k) => `p${String(k + 1).padStart(2, '0')}`);
const SCENE_OF = [1, 1, 1, 2, 3, 3, 4, 4, 5, 5, 5, 5, 5, 5, 5, 6, 6, 7, 7, 8, 8];
const WIN: Record<number, [number, number]> = { 1: [0, 8], 2: [8, 15], 3: [15, 24], 4: [24, 35], 5: [35, 48], 6: [48, 58], 7: [58, 68], 8: [68, 75] };

const dur = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout);
const sd = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=noise=-35dB:d=0.22', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const starts = [...sd.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1]));
const ends = [...sd.matchAll(/silence_end: ([\d.]+)/g)].map((m) => Number(m[1]));
let segs: [number, number][] = [];
let cur = 0;
for (let k = 0; k < starts.length; k++) {
  if (starts[k] > cur + 0.05) segs.push([cur, starts[k]]);
  cur = ends[k] ?? dur;
}
if (cur < dur - 0.05) segs.push([cur, dur]);
segs = segs.filter(([a, b]) => b - a > 0.12);
console.log(`${file}: ${dur.toFixed(2)} s, ${segs.length} trechos de fala`);
if (segs.length < IDS.length) {
  console.error(`Encontrei ${segs.length} trechos para ${IDS.length} frases. Ajuste à mão em ${OUT} ({"p01": {"a": 0.3, "b": 2.4}, ...}).`);
  process.exit(2);
}
// junta os trechos separados pelas menores pausas até sobrar uma fala por frase
while (segs.length > IDS.length) {
  let best = 0, gap = Infinity;
  for (let k = 0; k < segs.length - 1; k++) { const g = segs[k + 1][0] - segs[k][1]; if (g < gap) { gap = g; best = k; } }
  segs.splice(best, 2, [segs[best][0], segs[best + 1][1]]);
}
const out: Record<string, { a: number; b: number }> = {};
IDS.forEach((id, k) => { out[id] = { a: +segs[k][0].toFixed(3), b: +segs[k][1].toFixed(3) }; });
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
IDS.forEach((id, k) => {
  const [w0, w1] = WIN[SCENE_OF[k]];
  const { a, b } = out[id];
  const warn = a < w0 - 0.2 || b > w1 + 0.2 ? `  ← fora da janela da cena ${SCENE_OF[k]} (${w0}–${w1} s)` : '';
  console.log(`${id}  ${a.toFixed(2).padStart(6)} → ${b.toFixed(2).padStart(6)}${warn}`);
});
console.log(`gravado ${path.relative(ROOT, OUT)} — renderize de novo: npm run render:ep01`);
