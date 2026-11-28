// Renderiza quadros soltos de uma composição (para revisão). Uso:
//   npx tsx scripts/stills.ts <Composicao> <t1,t2,...|a-b:passo> [--scale 0.5] [--out out/stills] [--props '{"x":1}']
// Tempos em segundos. Ex.: npx tsx scripts/stills.ts Ep01 0,4,8.5,12 --scale 0.5
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import { ROOT, browserExecutable } from './lib/env';

const args = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const id = args[0];
const spec = args[1] ?? '0';
const scale = Number(opt('--scale', '0.5'));
const outDir = path.resolve(ROOT, opt('--out', 'out/stills')!);
const inputProps = JSON.parse(opt('--props', '{}')!);

function times(s: string): number[] {
  if (s.includes('-') && s.includes(':')) {
    const [r, st] = s.split(':'); const [a, b] = r.split('-').map(Number); const out: number[] = [];
    for (let t = a; t <= b + 1e-9; t += Number(st)) out.push(+t.toFixed(3));
    return out;
  }
  return s.split(',').map(Number);
}

(async () => {
  mkdirSync(outDir, { recursive: true });
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  const be = browserExecutable();
  const browser = await openBrowser('chrome', { browserExecutable: be, chromiumOptions: { gl: 'swangle' } });
  const composition = await selectComposition({ serveUrl, id, inputProps, puppeteerInstance: browser, browserExecutable: be });
  console.log(`bundle+select ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const t of times(spec)) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(t * composition.fps));
    const output = path.join(outDir, `${id}-${t.toFixed(2).padStart(6, '0')}.png`);
    const t1 = Date.now();
    await renderStill({ composition, serveUrl, output, frame, inputProps, scale, imageFormat: 'png', puppeteerInstance: browser, browserExecutable: be });
    console.log(`${output}  (${((Date.now() - t1) / 1000).toFixed(1)}s)`);
  }
  await browser.close({ silent: true });
})().catch((e) => { console.error(e); process.exit(1); });
