// DIREÇÃO — trilho da câmera, rótulos e posição da lente (só o integrador edita este arquivo).
// CAM: quadros-chave { t, p: posição, l: alvo, fov }. LABELS: { id, text, p, a, b, o }. LENS[mode]: { cx, cy, r, from }.
// Composição 9:16: marca no topo (0–8%), lente no alto (y ≈ 200–740 px), assunto principal no meio/baixo
// (y ≈ 700–1200 px), legendas em y 1230–1480 px, interface do TikTok nos 14% de baixo.
import { ETA as E, TOWER as T, ZF, NET } from './layout.js';

export const CAM = [
  // 1 torneira (gancho)
  { t: 0.0, p: [-2.25, 1.45, 19.35], l: [-2.52, 0.97, 17.6], fov: 38 },
  { t: 3.2, p: [-2.0, 1.75, 20.3], l: [-2.3, 0.9, 17.6], fov: 38 },
  // 2 caminho inverso (só a câmera volta; a água continua no sentido certo)
  { t: 3.75, p: [0.5, 2.3, 21.0], l: [2.5, 0.6, 19.0], fov: 40 },
  { t: 4.3, p: [3.6, 1.5, 23.2], l: [3.0, 0.8, 21.3], fov: 40 },
  { t: 5.0, p: [10, 4.0, 47], l: [9, -1.8, 34], fov: 44 },
  { t: 5.85, p: [10, 27, -4], l: [24, 21, -24], fov: 44 },
  { t: 6.7, p: [28, 44, -40], l: [8, 17, -74], fov: 44 },
  // rebobinar + 3 manancial
  { t: 7.8, p: [-24, 92, -48], l: [6, 4, -128], fov: 44 },
  { t: 9.6, p: [-18, 80, -54], l: [8, 3, -126], fov: 44 },
  { t: 10.9, p: [16, 26, -80], l: [4, 2, -104], fov: 42 },
  // 4 captação (obra) e 5 bombas
  { t: 12.2, p: [10, 13, -83.5], l: [4.2, 4.6, -97], fov: 40 },
  { t: 13.6, p: [1.6, 7.2, -88.6], l: [2.7, 5.4, -96], fov: 34 },
  { t: 14.8, p: [1.0, 6.9, -89.0], l: [2.7, 5.4, -96], fov: 32 },
  // 6 adutora bruta subindo até a ETA
  { t: 15.6, p: [2, 14, -84], l: [6, 6.5, -92], fov: 44 },
  { t: 16.4, p: [-6, 30, -66], l: [16, 11, -86], fov: 44 },
  { t: 17.6, p: [36, 28, -56], l: [25, 17, -78], fov: 42 },
  // 7 chegada (lente da água bruta no alto)
  { t: 19.6, p: [29, 26, -58], l: [22.5, 17.6, -74], fov: 40 },
  { t: 21.6, p: [28, 27, -57], l: [21.5, 17.6, -74], fov: 40 },
  // "transformação": vista aérea da ETA (fileiras na vertical da tela), plantas em destaque
  { t: 22.9, p: [70, 96, -61], l: [2, 14, -61], fov: 44 },
  { t: 24.9, p: [64, 90, -60], l: [4, 14, -62], fov: 44 },
  // 8 casa de química e coagulação
  { t: 26.6, p: [43, 26, -54], l: [33, 15.5, -75], fov: 44 },
  { t: 28.4, p: [26, 25.5, -60], l: [21, 17.5, -74], fov: 38 },
  { t: 33.4, p: [24.5, 25, -60.5], l: [20, 17.5, -74], fov: 38 },
  // 9–10 floculação
  { t: 35.0, p: [6, 29, -44], l: [6, 13.0, -72], fov: 40 },
  { t: 40.5, p: [5, 28.5, -45], l: [5, 13.0, -72], fov: 40 },
  // 11 decantação
  { t: 42.2, p: [-15, 30, -42], l: [-15.5, 12.5, -72], fov: 42 },
  { t: 46.6, p: [-17, 29.5, -43], l: [-17, 12.5, -72], fov: 42 },
  // 12 lodo → adensamento
  { t: 48.3, p: [-36, 27, -46], l: [-31, 13.5, -73], fov: 44 },
  { t: 49.9, p: [-33, 26, -45], l: [-29, 13.5, -71], fov: 44 },
  // 13 filtração (filtros 3 e 4 em corte; lavagem no 4)
  { t: 51.4, p: [-13, 24, -26], l: [-12, 17.5, -52], fov: 40 },
  { t: 55.6, p: [-10, 23, -27], l: [-9.5, 17.5, -52], fov: 40 },
  { t: 58.0, p: [-8, 22.5, -29], l: [-8.0, 17.3, -52], fov: 38 },
  // 14 desinfecção (zigue-zague visto de cima) e ajustes
  { t: 60.2, p: [4, 33, -30], l: [4, 16.5, -52], fov: 40 },
  { t: 64.4, p: [5, 31, -31], l: [5, 16.5, -52], fov: 40 },
  { t: 66.6, p: [13, 23, -37], l: [10, 17.2, -51], fov: 36 },
  { t: 70.0, p: [14, 22.5, -38], l: [10.5, 17.2, -51], fov: 36 },
  // 15 laboratório
  { t: 70.7, p: [30, 24, -28], l: [34, 15, -42], fov: 44 },
  { t: 71.6, p: [35.6, 17.8, -33.8], l: [35, 15.4, -40.5], fov: 46 },
  { t: 74.2, p: [35.2, 17.6, -34.2], l: [35, 15.3, -40.5], fov: 45 },
  // 16 elevatória e reservatório apoiado
  { t: 75.6, p: [25, 25, -33], l: [24, 14, -52], fov: 44 },
  { t: 77.4, p: [20, 24, -34], l: [20, 13.5, -52], fov: 44 },
  // 17 torre: obra, enchimento, gravidade e pressão
  { t: 78.4, p: [44, 27, -44], l: [24, 19, -24], fov: 44 },
  { t: 80.6, p: [42, 30, -46], l: [24, 22, -24], fov: 44 },
  { t: 82.4, p: [34, 24, 88], l: [16, 12, 0], fov: 44 },
  { t: 84.4, p: [24, 22, 86], l: [10, 9, 6], fov: 44 },
  // 18 rede subterrânea (raio-x), escola e hospital
  { t: 86.4, p: [20, 12, 60], l: [16, -1.5, 30], fov: 44 },
  { t: 88.6, p: [-4, 13, 62], l: [-6, -1, 28], fov: 44 },
  { t: 90.6, p: [10, 18, 64], l: [8, 2, 20], fov: 44 },
  // 19 hidrômetro
  { t: 92.4, p: [4.6, 2.4, 26.0], l: [3.0, 0.86, 21.3], fov: 36 },
  { t: 93.6, p: [3.55, 1.62, 22.6], l: [3.0, 0.86, 21.3], fov: 34 },
  { t: 95.0, p: [3.6, 1.7, 22.8], l: [3.0, 0.86, 21.3], fov: 34 },
  // 20 caixa-d'água e boia
  { t: 95.7, p: [5.0, 6.4, 26], l: [2.6, 3.6, 15], fov: 40 },
  { t: 96.5, p: [4.6, 6.4, 21.5], l: [2.4, 3.9, 13.2], fov: 40 },
  { t: 97.4, p: [3.9, 5.4, 17.6], l: [2.3, 3.95, 13.0], fov: 40 },
  { t: 99.6, p: [3.6, 5.3, 17.0], l: [2.4, 4.0, 13.0], fov: 40 },
  // 21–22 torneira e copo
  { t: 100.1, p: [1.5, 4.6, 25], l: [-1.5, 1.8, 17.6], fov: 40 },
  { t: 100.6, p: [-1.0, 2.6, 21.6], l: [-2.3, 1.1, 17.6], fov: 38 },
  { t: 101.4, p: [-2.55, 1.0, 19.15], l: [-2.53, 0.85, 17.6], fov: 38 },
  { t: 104.0, p: [-2.55, 1.0, 19.15], l: [-2.53, 0.85, 17.6], fov: 38 },
  { t: 106.6, p: [-2.5, 1.08, 19.1], l: [-2.55, 0.86, 17.6], fov: 36 },
  { t: 107.4, p: [-2.0, 2.8, 23.0], l: [-2.3, 1.2, 17.6], fov: 40 },
  // 23 sistema inteiro: recuo contínuo do copo à represa
  { t: 108.5, p: [-0.5, 5.2, 31], l: [-0.5, 2.0, 16], fov: 42 },
  { t: 110.4, p: [16, 32, 76], l: [6, 4, -8], fov: 42 },
  { t: 112.4, p: [28, 96, 66], l: [4, 8, -46], fov: 42 },
  { t: 115.0, p: [24, 150, 52], l: [0, 6, -64], fov: 42 }
];

const y = (n) => n;
export const LABELS = [
  { id: 'rio', text: 'Rio', p: [-46, 9, -156], a: 7.9, b: 9.4, o: { cls: 'accent' } },
  { id: 'represa', text: 'Represa', p: [-12, 5, -126], a: 9.0, b: 10.8, o: { cls: 'accent' } },
  { id: 'grade', text: 'Grade', p: [4, 5.5, -106], a: 11.6, b: 12.9, o: { cls: 'plain' } },
  { id: 'bomba', text: 'Bomba centrífuga (em corte)', p: [2.7, 6.6, -96], a: 13.6, b: 15.2, o: { cls: 'accent' } },
  { id: 'adutora', text: 'Adutora de água bruta', p: [16, 10.5, -86], a: 16.0, b: 17.5, o: { cls: 'accent' } },
  { id: 'quimica', text: 'Casa de química', p: [36, 20.2, -75], a: 25.6, b: 27.5, o: { cls: 'accent' } },
  { id: 'coag', text: 'Coagulação', p: [20.5, 21.4, -74], a: 31.2, b: 33.8, o: { cls: 'big' } },
  { id: 'floc', text: 'Floculação: agitação lenta', p: [6, 20.6, -70], a: 34.2, b: 36.3, o: { cls: 'accent' } },
  { id: 'dec', text: 'Decantador', p: [-16, 20.4, -70], a: 41.3, b: 43.1, o: { cls: 'accent' } },
  { id: 'lodo', text: 'Lodo → tratamento do lodo', p: [-34, 18.8, -74], a: 48.1, b: 50.1, o: { cls: 'plain' } },
  { id: 'antr', text: 'Antracito (carvão mineral)', p: [-11, 16.85, -46.9], a: 50.8, b: 52.8, o: { cls: 'plain', stem: 30 } },
  { id: 'areia', text: 'Areia', p: [-13.5, 16.1, -46.9], a: 52.0, b: 53.9, o: { cls: 'plain', stem: 30 } },
  { id: 'casc', text: 'Cascalho', p: [-11, 15.4, -46.9], a: 53.3, b: 54.6, o: { cls: 'plain', stem: 30 } },
  { id: 'lav', text: 'Lavagem em contracorrente', p: [-7.8, 19.8, -47], a: 56.4, b: 58.3, o: { cls: 'accent' } },
  { id: 'cloro', text: 'Cloro', p: [-2.4, 17.8, -52], a: 59.1, b: 60.5, o: { cls: 'good' } },
  { id: 'cal', text: 'Correção de pH (cal)', p: [10.2, 17.6, -52], a: 65.6, b: 70.1, o: { cls: 'plain', dx: -120 } },
  { id: 'fluor', text: 'Flúor', p: [10.6, 17.6, -50.6], a: 66.6, b: 70.1, o: { cls: 'plain', dx: 90 } },
  { id: 'lab', text: 'Laboratório', p: [36, 18.4, -40], a: 70.8, b: 72.6, o: { cls: 'accent' } },
  { id: 'elev', text: 'Elevatória de água tratada', p: [28, 19.2, -52], a: 75.0, b: 76.9, o: { cls: 'accent' } },
  { id: 'resap', text: 'Reservatório', p: [19, 17.6, -52], a: 76.1, b: 77.9, o: { cls: 'plain' } },
  { id: 'torre', text: 'Reservatório elevado', p: [24, 33.5, -24], a: 78.6, b: 80.9, o: { cls: 'accent' } },
  { id: 'nivel', text: 'Nível da água na torre', p: [6, 32, -24], a: 80.6, b: 82.5, o: { cls: 'good' } },
  { id: 'press', text: 'Mais pressão', p: [27.5, 5, 33.3], a: 81.8, b: 84.5, o: { cls: 'good' } },
  { id: 'perda', text: 'Perda de carga', p: [-52, 5, 33.3], a: 82.7, b: 84.5, o: { cls: 'warn' } },
  { id: 'agua', text: 'Água tratada', p: [-14, NET.water.y + 0.35, ZF], a: 85.6, b: 87.7, o: { cls: 'accent', stem: 36 } },
  { id: 'esgoto', text: 'Esgoto', p: [-20, NET.sewer.y + 0.45, ZF], a: 86.5, b: 88.5, o: { cls: 'plain', stem: 36 } },
  { id: 'dren', text: 'Drenagem (chuva)', p: [-26, NET.drain.y + 0.7, ZF], a: 87.9, b: 89.5, o: { cls: 'plain', stem: 36 } },
  { id: 'escola', text: 'Escola', p: [-25, 8.5, 15], a: 89.5, b: 90.8, o: { cls: 'plain' } },
  { id: 'hosp', text: 'Hospital', p: [42, 16, 15], a: 90.0, b: 91.4, o: { cls: 'plain' } },
  { id: 'hidro', text: 'Hidrômetro', p: [3.0, 1.15, 21.3], a: 93.2, b: 95.4, o: { cls: 'accent' } },
  { id: 'caixa', text: 'Caixa-d’água', p: [2.2, 4.95, 13], a: 96.2, b: 97.9, o: { cls: 'accent' } },
  { id: 'boia', text: 'Boia fecha a entrada', p: [2.0, 4.2, 13.0], a: 98.4, b: 100.3, o: { cls: 'good' } },
  { id: 'veda', text: 'Vedante sai da sede', p: [-2.75, 1.02, 17.6], a: 101.7, b: 103.5, o: { cls: 'plain', dx: 120 } },
  { id: 'etaF', text: 'Estação de tratamento', p: [2, 22, -62], a: 112.0, b: 114.2, o: { cls: 'accent' } },
  { id: 'represaF', text: 'Represa', p: [-12, 6, -126], a: 112.6, b: 114.2, o: { cls: 'accent' } }
];

// lente: centro e raio em px (tela 1080×1920); from = ponto 3D ampliado (haste)
const LN = { cx: 540, cy: 460, r: 285 };
export const LENS = {
  raw: { ...LN, from: [22.5, 19.7, -74] },
  coag: { ...LN, from: E.dosing.coag },
  floc: { ...LN, from: [6, 18.0, -72] },
  settle: { ...LN, from: [-16, 16.5, -72] },
  clear: { ...LN, from: [-26, 18.6, -70] },
  filter: { ...LN, from: [-10, 16.9, -47] },
  chlorine: { ...LN, from: [2, 16.2, -52] }
};
void y; void T;
