// Confere com ffprobe/ffmpeg se o MP4 está no padrão exigido (TikTok/Reels/Shorts).
// Uso: npx tsx scripts/validate.ts out/seguecity-ep01.mp4 [--dur 75]
import { spawnSync } from 'node:child_process';
import { statSync } from 'node:fs';

const file = process.argv[2] ?? 'out/seguecity-demo-cidade.mp4';
const di = process.argv.indexOf('--dur');
const expectDur = di > 0 ? Number(process.argv[di + 1]) : null;

const probe = spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8' });
if (probe.status !== 0) { console.error(probe.stderr); process.exit(1); }
const info = JSON.parse(probe.stdout);
const v = info.streams.find((s: any) => s.codec_type === 'video');
const a = info.streams.find((s: any) => s.codec_type === 'audio');
const [n, d] = String(v?.r_frame_rate ?? '0/1').split('/').map(Number);
const fps = n / d;
const dur = Number(info.format.duration);
const head = spawnSync('sh', ['-c', `head -c 4096 "${file}" | grep -c moov || true`], { encoding: 'utf8' }).stdout.trim();
const loud = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const I = Number((loud.match(/I:\s+(-?[\d.]+) LUFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0]);
const TP = Number((loud.match(/Peak:\s+(-?[\d.]+) dBFS/g) ?? []).pop()?.match(/-?[\d.]+/)?.[0]);

const checks: [string, boolean, string][] = [
  ['resolução 1080x1920 (9:16)', v?.width === 1080 && v?.height === 1920, `${v?.width}x${v?.height}`],
  ['30 fps', Math.abs(fps - 30) < 0.01, `${fps.toFixed(3)}`],
  ['vídeo H.264', v?.codec_name === 'h264', `${v?.codec_name} ${v?.profile ?? ''}`],
  ['yuv420p', v?.pix_fmt === 'yuv420p', v?.pix_fmt],
  ['áudio AAC', a?.codec_name === 'aac', `${a?.codec_name ?? 'sem áudio'} ${a?.sample_rate ?? ''} Hz ${a?.channels ?? ''} canais`],
  ['moov no início (faststart)', head !== '0', head !== '0' ? 'sim' : 'não'],
  ['loudness ≈ -14 LUFS', Number.isFinite(I) && Math.abs(I + 14) <= 1.5, `${I} LUFS`],
  ['pico verdadeiro ≤ -1 dBTP', Number.isFinite(TP) && TP <= -0.9, `${TP} dBTP`],
];
if (expectDur) checks.push([`duração ${expectDur}s`, Math.abs(dur - expectDur) < 0.1, `${dur.toFixed(3)} s`]);
else checks.push(['duração', true, `${dur.toFixed(3)} s`]);
checks.push(['tamanho', true, `${(statSync(file).size / 1e6).toFixed(1)} MB, ${(Number(info.format.bit_rate) / 1e6).toFixed(1)} Mb/s`]);

let ok = true;
for (const [name, pass, val] of checks) { console.log(`${pass ? 'OK  ' : 'FALHA'}  ${name.padEnd(30)} ${val}`); ok &&= pass; }
process.exit(ok ? 0 : 2);
