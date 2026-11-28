// Leitura do mapa em tiles (data/mapa.json) e consultas de vizinhança.
import { mapa } from '../data';
import { N } from './iso';

export type TileType = 'grass' | 'forest' | 'road' | 'bridge' | 'river' | 'promenade' | 'plaza' | 'court' | 'garden' | 'parking' | 'dirt';
const CH: Record<string, TileType> = {
  '.': 'grass', f: 'forest', '#': 'road', '=': 'bridge', '~': 'river', c: 'promenade',
  p: 'plaza', q: 'court', j: 'garden', e: 'parking', t: 'dirt',
};

export const tiles: TileType[] = [];
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) tiles.push(CH[mapa.linhas[j]?.[i] ?? '.'] ?? 'grass');

export const tileAt = (i: number, j: number): TileType | null =>
  i < 0 || j < 0 || i >= N || j >= N ? null : tiles[j * N + i];
export const isRoad = (i: number, j: number) => {
  const t = tileAt(i, j);
  return t === 'road' || t === 'bridge';
};
export const isWater = (i: number, j: number) => tileAt(i, j) === 'river' || tileAt(i, j) === 'bridge';

// Canal do rio: faixa reta de i = RIVER_I0 a RIVER_I1, afundada RIVER_D px.
export const RIVER_I0 = 21, RIVER_I1 = 25, RIVER_D = 8;
export const inChannel = (i: number, j: number) => i >= RIVER_I0 && i < RIVER_I1 && j < N;
