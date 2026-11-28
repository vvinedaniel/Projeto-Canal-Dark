// Mede o tempo de render (quadros/s) de um trecho, sem codificar vídeo.
// Uso: npx tsx scripts/bench.ts [Composicao] [inicio-fim] [concorrencia]   → grava uma linha em out/bench.jsonl
import { bundle } from '@remotion/bundler';
import { renderFrames, selectComposition } from '@remotion/renderer';
import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { ROOT, OUT, browserExecutable } from './lib/env';

const [id = 'CityDemo', range = '0-149', conc = '4'] = process.argv.slice(2);
(async () => {
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  const be = browserExecutable();
  const composition = await selectComposition({ serveUrl, id, browserExecutable: be });
  const dir = path.join(OUT, '_bench');
  rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  const [a, b] = range.split('-').map(Number);
  const t0 = Date.now();
  await renderFrames({ composition, serveUrl, outputDir: dir, imageFormat: 'jpeg', jpegQuality: 95, concurrency: Number(conc), frameRange: [a, b], browserExecutable: be, chromiumOptions: { gl: 'swangle' }, inputProps: {}, onStart: () => undefined, onFrameUpdate: () => undefined });
  const s = (Date.now() - t0) / 1000;
  const n = b - a + 1;
  const commit = execSync('git rev-parse --short HEAD').toString().trim();
  const row = { id, range, concurrency: Number(conc), frames: n, seconds: +s.toFixed(1), fps: +(n / s).toFixed(2), commit, date: new Date().toISOString() };
  mkdirSync(OUT, { recursive: true });
  appendFileSync(path.join(OUT, 'bench.jsonl'), JSON.stringify(row) + '\n');
  console.log(row);
  rmSync(dir, { recursive: true, force: true });
})().catch((e) => { console.error(e); process.exit(1); });
