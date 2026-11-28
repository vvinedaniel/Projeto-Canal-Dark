import { useEffect, useState } from 'react';
import { continueRender, delayRender, staticFile } from 'remotion';

// Carrega as fontes pixel (OFL) da pasta public/fonts antes do primeiro quadro.
const FONTS: [string, string, string][] = [
  ['Pixelify', 'pixelify-sans-latin-700-normal.woff2', '700'],
  ['Pixelify', 'pixelify-sans-latin-500-normal.woff2', '500'],
  ['Silkscreen', 'silkscreen-latin-400-normal.woff2', '400'],
  ['Jersey', 'jersey-10-latin-400-normal.woff2', '400'],
  ['Tiny5', 'tiny5-latin-400-normal.woff2', '400'],
  ['Pixelify', 'pixelify-sans-latin-400-normal.woff2', '400'],
  ['Silkscreen', 'silkscreen-latin-700-normal.woff2', '700'],
];
let loading: Promise<void> | null = null;
export function useFonts() {
  const [handle] = useState(() => delayRender('fontes'));
  useEffect(() => {
    loading ??= Promise.all(
      FONTS.map(async ([family, file, weight]) => {
        const f = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight });
        await f.load();
        (document.fonts as unknown as { add: (f: FontFace) => void }).add(f);
      }),
    ).then(() => undefined);
    loading.then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
  }, [handle]);
}
