// DIREÇÃO — trilho da câmera, rótulos e posição da lente (só o integrador edita este arquivo).
// CAM: quadros-chave { t, p: posição, l: alvo, fov }. LABELS: { id, text, p, a, b, o }. LENS[mode]: { cx, cy, r, from }.
import { ETA as E, INTAKE as I, HOUSE as Hh, TOWER as T, P, ZF, NET } from './layout.js';

export const CAM = [
  // 1 torneira (gancho)
  { t: 0.0, p: [-2.0, 1.55, 18.9], l: [-2.55, 1.05, 17.6], fov: 38 },
  { t: 3.2, p: [-1.4, 1.9, 20.6], l: [-2.2, 1.0, 17.4], fov: 38 },
  // 2 caminho inverso (só a câmera volta; a água continua no sentido certo)
  { t: 4.3, p: [4.5, 2.2, 24.5], l: [3.0, 0.4, 22.0], fov: 40 },
  { t: 5.1, p: [16, 6, 40], l: [18, -1, 30], fov: 42 },
  { t: 6.0, p: [30, 26, 0], l: [24, 20, -26], fov: 42 },
  { t: 6.9, p: [20, 40, -40], l: [6, 14, -80], fov: 42 },
  // 3 manancial
  { t: 7.9, p: [10, 34, -62], l: [0, 2, -122], fov: 40 },
  { t: 10.4, p: [-4, 22, -76], l: [4, 2, -104], fov: 38 },
  // 4–5 captação e bombas
  { t: 12.6, p: [6, 10, -80], l: [4, 5, -96], fov: 38 },
  { t: 14.4, p: [4.5, 7.2, -86], l: [3.0, 5.4, -96], fov: 36 },
  // 6 adutora bruta
  { t: 15.6, p: [18, 22, -74], l: [12, 9, -88], fov: 40 },
  { t: 17.2, p: [34, 26, -58], l: [24, 16, -76], fov: 38 },
  // 7 chegada
  { t: 19.5, p: [26, 23.5, -62], l: [21, 19, -74], fov: 36 },
  // transformação (vista aérea da ETA)
  { t: 22.4, p: [10, 62, -10], l: [2, 14, -64], fov: 38 },
  { t: 25.2, p: [4, 52, -18], l: [2, 14, -64], fov: 38 },
  // 8 coagulação
  { t: 27.4, p: [26, 24, -60], l: [21, 18.5, -74], fov: 34 },
  { t: 33.4, p: [22, 23, -62], l: [18, 18.5, -74], fov: 34 },
  // 9–10 floculação
  { t: 36.0, p: [8, 24, -56], l: [6, 17, -74], fov: 36 },
  { t: 40.6, p: [2, 23, -57], l: [3, 17, -74], fov: 36 },
  // 11–12 decantação e lodo
  { t: 43.0, p: [-14, 24, -55], l: [-15, 16.5, -74], fov: 38 },
  { t: 49.6, p: [-18, 22, -56], l: [-16, 16, -74], fov: 38 },
  // 13 filtração
  { t: 52.0, p: [-14, 22, -32], l: [-16, 16, -52], fov: 36 },
  { t: 58.0, p: [-18, 21, -33], l: [-16, 16, -52], fov: 36 },
  // 14 desinfecção e ajustes
  { t: 61.0, p: [6, 22, -32], l: [4, 15.5, -52], fov: 36 },
  { t: 69.8, p: [10, 21, -33], l: [8, 15.5, -52], fov: 36 },
  // 15 laboratório
  { t: 72.4, p: [38, 18.5, -28], l: [36, 16, -40], fov: 36 },
  // 16–17 bombeamento, reservatórios, gravidade e pressão
  { t: 76.0, p: [36, 30, -26], l: [22, 15, -50], fov: 40 },
  { t: 81.0, p: [56, 26, 30], l: [22, 14, -16], fov: 40 },
  { t: 84.2, p: [50, 20, 46], l: [20, 4, 0], fov: 40 },
  // 18 rede subterrânea
  { t: 87.6, p: [26, 9, 58], l: [14, -1, 26], fov: 40 },
  { t: 91.2, p: [12, 5, 50], l: [6, -0.5, 28], fov: 38 },
  // 19 hidrômetro
  { t: 93.4, p: [4.6, 1.6, 24.6], l: [3.0, 0.8, 21.3], fov: 36 },
  // 20 caixa-d'água
  { t: 97.4, p: [5.5, 6.5, 22], l: [2.4, 3.9, 13.5], fov: 38 },
  // 21–22 torneira e copo
  { t: 101.4, p: [-2.0, 1.55, 18.9], l: [-2.55, 1.05, 17.6], fov: 38 },
  { t: 106.6, p: [-1.8, 1.7, 19.4], l: [-2.5, 1.0, 17.6], fov: 36 },
  // 23 sistema inteiro
  { t: 108.6, p: [2, 8, 34], l: [0, 1.5, 16], fov: 40 },
  { t: 111.0, p: [20, 60, 70], l: [4, 6, -20], fov: 40 },
  { t: 115.0, p: [12, 120, 70], l: [0, 6, -60], fov: 40 }
];

export const LABELS = [];

// lente: centro e raio em px (tela 1080×1920); from = ponto 3D ampliado (haste)
export const LENS = {
  raw: { cx: 540, cy: 560, r: 290, from: [24, 20.4, -74] },
  coag: { cx: 540, cy: 560, r: 290, from: E.dosing.coag },
  floc: { cx: 540, cy: 560, r: 290, from: [6, 17.5, -74] },
  settle: { cx: 540, cy: 560, r: 290, from: [-16, 16.5, -74] },
  clear: { cx: 540, cy: 560, r: 290, from: [-26, 18.6, -70] },
  filter: { cx: 540, cy: 560, r: 290, from: [-16, 16.8, -52] },
  chlorine: { cx: 540, cy: 560, r: 290, from: [4, 15.8, -52] }
};
