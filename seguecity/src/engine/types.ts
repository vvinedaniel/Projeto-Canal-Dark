import type { U32 } from './color';
import type { Sprite } from './model';

// Luz no mundo (px de mundo): 'pool' = poça elíptica no chão (mapa de luz); 'halo' = brilho emissivo redondo.
export interface Light { x: number; y: number; r: number; color: U32; a: number; kind: 'pool' | 'halo' }

export type Group = 'civic' | 'home' | 'shop' | 'street' | 'none';

// Objeto desenhável e ordenável por profundidade.
export interface Obj {
  id: string;
  kind: string;
  fp: [number, number, number, number]; // i0, j0, i1, j1 (tiles)
  layer: 0 | 1; // 0 = rente ao chão (desenhado antes), 1 = em pé
  sprite: Sprite;
  group: Group;
  lights: Light[];
  anchor?: { x: number; y: number };
  ref?: string;
  rank?: number; // ordem de acendimento (casas)
  hidden?: boolean;
  planned?: boolean; // lote planejado (aparece como planta)
  dx?: number; // deslocamento horizontal do sprite (objetos móveis)
  dy?: number; // deslocamento vertical (prédio subindo / objetos móveis)
}
