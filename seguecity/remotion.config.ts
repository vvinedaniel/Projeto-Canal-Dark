import { Config } from '@remotion/cli/config';
import { existsSync } from 'node:fs';

// Saída padrão: H.264 + yuv420p + AAC, compatível com TikTok/Reels/Shorts.
Config.setCodec('h264');
Config.setPixelFormat('yuv420p');
Config.setAudioCodec('aac');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCrf(17);

// Navegador: usa SEGUECITY_BROWSER, ou o headless shell já instalado neste container, ou baixa o padrão do Remotion.
const candidates = [
  process.env.SEGUECITY_BROWSER,
  '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell',
].filter(Boolean) as string[];
const browser = candidates.find((p) => existsSync(p));
if (browser) Config.setBrowserExecutable(browser);
