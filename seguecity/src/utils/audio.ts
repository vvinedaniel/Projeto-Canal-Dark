import { getStaticFiles, staticFile } from 'remotion';

// Só usa um arquivo de áudio se ele existir em /public (o episódio renderiza mesmo sem narração ou trilha).
let names: Set<string> | null = null;
export function hasAsset(path: string) {
  names ??= new Set(getStaticFiles().map((f) => f.name));
  return names.has(path);
}
export const asset = (path: string) => (hasAsset(path) ? staticFile(path) : null);
