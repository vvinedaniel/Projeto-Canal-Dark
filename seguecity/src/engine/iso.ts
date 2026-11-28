// Projeção isométrica 2:1. Tile = 32x16 px. (i, j) em tiles, z em px (16 px de altura = 1 tile).
// Tela: x = (i - j) * 16 + OX ; y = (i + j) * 8 - z + OY.
// Faces visíveis: topo, +j ("esquerda", L) e +i ("direita", R). Câmera olha de +i,+j para -i,-j.
export const N = 32; // tamanho do mapa em tiles (N x N)
export const HT = 16; // px de altura por tile
export const OX = N * 16 + 96;
export const OY = 360;
export const WORLD_W = N * 32 + 192;
export const WORLD_H = OY + N * 16 + 300;

export const sx = (i: number, j: number) => (i - j) * 16 + OX;
export const sy = (i: number, j: number, z = 0) => (i + j) * 8 - z + OY;

// Raio do pixel (px, py): ao longo dele, j = i - A e z = 16 i - 8A - B. A profundidade (perto da câmera) cresce com i.
export const rayA = (px: number) => (px + 0.5 - OX) / 16;
export const rayB = (py: number) => py + 0.5 - OY;

// Ponto do chão (z) sob o centro do pixel.
export function groundAt(px: number, py: number, z = 0) {
  const a = (px + 0.5 - OX) / 16;
  const b = (py + 0.5 + z - OY) / 8;
  return { i: (a + b) / 2, j: (b - a) / 2 };
}
