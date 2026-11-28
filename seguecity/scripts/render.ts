// Renderiza uma composição em MP4 pronto para TikTok/Reels/Shorts:
//   1080x1920, 30 fps, H.264 (High), yuv420p, AAC 48 kHz, moov no início (faststart), loudness -14 LUFS / -1 dBTP.
// Uso: npx tsx scripts/render.ts demo|ep01 [--frames 0-89] [--concurrency 4] [--scale 1]   (CRF=20 por padrão)
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';
import { ROOT, OUT, browserExecutable } from './lib/env';

const args = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const TARGETS: Record<string, { id: string; file: string }> = {
  demo: { id: 'CityDemo', file: 'seguecity-demo-cidade.mp4' },
  ep01: { id: 'Ep01', file: 'seguecity-ep01.mp4' },
};
const target = TARGETS[args[0] ?? 'demo'] ?? { id: args[0], file: `${args[0]}.mp4` };
const frames = opt('--frames');
const concurrency = Number(opt('--concurrency', '4'));
const scale = Number(opt('--scale', '1'));

(async () => {
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(path.join(ROOT, 'public/audio/music/ep01.wav'))) {
    console.log('gerando trilha e efeitos (npm run audio:build)...');
    execFileSync('npx', ['tsx', 'scripts/audio/synth.ts'], { cwd: ROOT, stdio: 'inherit' });
  }
  const t0 = Date.now();
  const serveUrl = await bundle({ entryPoint: path.join(ROOT, 'src/index.ts') });
  const be = browserExecutable();
  const composition = await selectComposition({ serveUrl, id: target.id, browserExecutable: be });
  const raw = path.join(OUT, `_raw-${target.file}`);
  let last = 0;
  await renderMedia({
    composition, serveUrl, outputLocation: raw, browserExecutable: be,
    codec: 'h264', pixelFormat: 'yuv420p', audioCodec: 'aac', audioBitrate: '192k', crf: 12, x264Preset: 'fast',
    imageFormat: 'jpeg', jpegQuality: 95, concurrency, scale, enforceAudioTrack: true,
    frameRange: frames ? (frames.split('-').map(Number) as [number, number]) : null,
    chromiumOptions: { gl: 'swangle' },
    onProgress: ({ progress, renderedFrames, encodedFrames }) => {
      const p = Math.floor(progress * 100);
      if (p >= last + 5) { last = p; console.log(`${p}%  quadros ${renderedFrames}  codificados ${encodedFrames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
    },
  });
  console.log(`render ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  // loudness em 2 passes (-14 LUFS integrado, pico verdadeiro ≤ -1 dBTP) + faststart; o vídeo é copiado sem recodificar
  const final = path.join(OUT, target.file);
  const json = loudJson(raw);
  const af = json && Number.isFinite(Number(json.input_i)) && Number(json.input_i) > -70
    ? `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true,aresample=48000`
    : 'aresample=48000';
  const tmp = final + '.tmp.mp4';
  const dur = ((frames ? Number(frames.split('-')[1]) - Number(frames.split('-')[0]) + 1 : composition.durationInFrames) / composition.fps).toFixed(4);
  // vídeo final: x264 (High, yuv420p em faixa limitada BT.709), áudio AAC 48 kHz normalizado
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-map', '0:v:0', '-map', '0:a:0', '-t', dur,
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF ?? '20', '-tune', 'animation',
    '-profile:v', 'high', '-level', '4.2', '-g', '60', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-af', af, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp], { stdio: 'inherit' });
  renameSync(tmp, final);
  rmSync(raw, { force: true });
  console.log(`pronto: ${final}  (${((Date.now() - t0) / 1000).toFixed(0)}s no total)`);
})().catch((e) => { console.error(e); process.exit(1); });

function loudJson(file: string): Record<string, string> | null {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = String(r.stderr).match(/\{[\s\S]*?\}/g);
  return m ? JSON.parse(m[m.length - 1]) : null;
}
