import { existsSync } from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..');
export const OUT = path.join(ROOT, 'out');

// Navegador para o Remotion: SEGUECITY_BROWSER, ou o headless shell deste container; senão o Remotion baixa o dele.
export function browserExecutable(): string | null {
  const c = [process.env.SEGUECITY_BROWSER, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'];
  return (c.find((p) => p && existsSync(p)) as string) ?? null;
}
