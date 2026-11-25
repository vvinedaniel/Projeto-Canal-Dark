// ESTADO DO MUNDO — a única fonte de "o que está construído" e "onde está a água" em cada instante.
// state(t, variant) é função pura de t. Todos os módulos leem S e NÃO inventam tempos próprios de obra ou de água.
// variant: null (filme normal) | 'before' (cidade sem melhorias) | 'after' (com melhorias) — usado na tela dividida.
import { FLOOD, RIVER } from './layout.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lin = (a, b, x) => clamp01((x - a) / (b - a));
const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
/** curva por quadros-chave [[t, v], ...] com transição suave entre eles */
export function keys(K, t) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) { const [a, va] = K[i], [b, vb] = K[i + 1]; return va + (vb - va) * ss(a, b, t); }
  return K[K.length - 1][1];
}

/* ---------- relógio da história (construção) ----------
   As obras são funções de st (tempo da história). No gancho a cidade já existe (st = 71: antes das melhorias);
   em "vamos começar antes de a cidade existir" o filme rebobina (st volta de 71 a 9,6) e depois segue igual a t. */
export const ST_BEFORE = 71.0, ST_AFTER = 96.8, REWIND = [5.6, 9.6];
export function storyTime(t) {
  if (t < REWIND[0]) return ST_BEFORE;
  if (t < REWIND[1]) return ST_BEFORE + (REWIND[1] - ST_BEFORE) * io(lin(REWIND[0], REWIND[1], t));
  return t;
}
/** progresso de cada obra (0 = nada, 1 = pronta) em função do tempo da história. Sub-fases dentro de cada obra
    são decididas pelo módulo dono (ex.: piscinão 0–0.35 escavação, 0.35–0.65 estrutura, 0.65–0.85 ligações, 0.85–1 acabamento). */
export function builds(st) {
  return {
    clear: lin(17.4, 18.9, st),           // derrubada da mata do vale (o morro fica)
    houses: lin(17.5, 20.9, st),          // casas (escalonadas pelo módulo, da esquerda p/ direita)
    towers: lin(18.3, 21.9, st),          // prédios + grua
    walks: lin(19.6, 21.0, st),           // calçadas, guias, praça, lotes
    asphalt: lin(20.6, 22.4, st),         // asfalto das ruas (vibroacabadora + rolo)
    sewer: lin(20.6, 22.4, st),           // rede de esgoto e ETE nascem com as ruas
    inlets: lin(34.25, 36.9, st),         // bocas de lobo (uma após a outra)
    gallery: lin(37.12, 40.1, st),        // galeria: aduelas de montante para jusante, depois as ligações
    canal: lin(40.65, 44.2, st),          // canal, bueiro sob a avenida, cabeceira e comporta no rio
    plazaOut: lin(72.4, 73.9, st),        // praça desmontada (bancos, árvores, piso) antes da escavação
    reservoir: lin(73.6, 79.47, st),      // piscinão: escavação → estrutura → ligações → acabamento
    enlarge: lin(87.91, 89.6, st),        // galeria ampliada + bocas de lobo extras
    clean: lin(88.0, 89.0, st),           // limpeza do lixo das grelhas
    gardens: lin(89.6, 91.67, st),        // jardins de chuva
    park: lin(91.96, 94.3, st),           // parque linear na margem + árvores nas calçadas
    permeable: lin(94.0, 96.69, st)       // pavimento permeável (estacionamento + calçada em corte)
  };
}

/* ---------- chuva e água ---------- */
// Intensidades: normal = 0.45, intensa = 1.0. A MESMA tempestade (mesmos parâmetros) é usada no antes × depois.
export const RAIN_NORMAL = 0.45, RAIN_STORM = 1.0;
const RAIN = [[0, 1], [5.6, 1], [6.8, 0], [9.88, 0], [10.5, RAIN_NORMAL], [16.85, RAIN_NORMAL], [17.4, 0], [22.96, 0], [23.6, RAIN_NORMAL], [33.79, RAIN_NORMAL], [34.2, 0],
  [45.25, 0], [45.8, RAIN_NORMAL], [48.73, RAIN_NORMAL], [50.0, RAIN_STORM], [71.2, RAIN_STORM], [72.4, 0], [79.92, 0], [80.6, RAIN_STORM], [83.6, RAIN_STORM], [84.4, 0],
  [97.84, 0], [98.4, RAIN_STORM], [110.5, RAIN_STORM], [112.2, 0.5], [116.6, 0.5]];
// Tempestade "de teste" (antes × depois): relógio da tempestade tau = t − STORM2 (mesma duração simulada nos dois lados)
export const STORM2 = 97.84;
const stormFlood = (tau, improved) => FLOOD.dry + ((improved ? FLOOD.after : FLOOD.before) - FLOOD.dry) * io(clamp01(tau / 8.5));

export function state(t, variant = null) {
  const st = variant === 'before' ? Math.min(storyTime(t), ST_BEFORE) : variant === 'after' ? Math.max(storyTime(t), ST_AFTER) : storyTime(t);
  const B = builds(st), improved = B.reservoir > 0.99 && B.enlarge > 0.99;
  const rain = keys(RAIN, t);
  const S = { t, st, variant, build: B, rain, dark: ss(0.6, 1, rain), improved };

  // nível da água na rua (cota absoluta). FLOOD.dry fica abaixo do asfalto = rua seca.
  let flood = keys([[0, 3.28], [5.6, 3.35], [7.6, FLOOD.dry], [29.4, FLOOD.dry], [33.79, 2.86], [34.4, 2.86], [35.6, FLOOD.dry],
    [51.04, FLOOD.dry], [54.13, 2.74], [58.8, 2.96], [65.44, 3.13], [71.2, FLOOD.before], [71.9, FLOOD.before], [73.7, FLOOD.dry],
    [80.4, FLOOD.dry], [83.6, 2.56], [85.2, FLOOD.dry]], t);
  if (t >= STORM2 - 0.5) flood = t < 110.5 ? stormFlood(t - STORM2, true) : keys([[110.5, stormFlood(110.5 - STORM2, true)], [114, 2.6], [116.6, 2.58]], t);
  if (variant === 'before' && t >= STORM2 - 0.5) flood = stormFlood(t - STORM2, false);
  S.flood = flood;

  // escoamento superficial (filetes nas sarjetas, telhados, encostas): 0..1
  S.runoffNatural = keys([[14.0, 0], [14.6, 1], [16.85, 1], [17.4, 0]], t);
  S.runoff = keys([[0, 1], [5.6, 1], [6.8, 0], [27.93, 0], [28.6, 1], [33.79, 1], [34.2, 0], [45.25, 0], [45.9, 0.5], [48.73, 0.5], [50, 1], [71.2, 1], [72.4, 0],
    [79.92, 0], [80.6, 0.7], [83.6, 0.7], [84.4, 0], [97.84, 0], [98.6, 0.75], [110.5, 0.75], [112.2, 0.35]], t);
  if (variant === 'before') S.runoff = Math.max(S.runoff, 1 * (t >= STORM2 ? 1 : 0));
  // infiltração natural (setas no solo em corte) e bloqueio pelo asfalto
  S.infil = keys([[12.0, 0], [12.6, 1], [16.85, 1], [17.4, 0]], t);
  S.blocked = keys([[22.96, 0], [23.8, 1], [27.6, 1], [28.4, 0]], t);
  // infiltração pelas soluções verdes (jardins, pavimento permeável, parque) nas tempestades com melhorias
  const greenOn = keys([[97.84, 0], [99.0, 1], [112.2, 1], [114, 0.6]], t) * (variant === 'before' ? 0 : 1);
  S.gardenIn = greenOn * B.gardens; S.permIn = greenOn * B.permeable; S.parkIn = greenOn * B.park;

  // galeria: fração da altura ocupada (1 = cheia; >1 = sob pressão, água sobe pelas grelhas)
  let gal = keys([[0, 1.08], [5.6, 1.08], [7.6, 0], [45.25, 0], [46.6, 0.35], [48.73, 0.38], [51.04, 0.72], [53.0, 1.0], [54.0, 1.08], [71.2, 1.08], [72.4, 0.4], [73.7, 0.04],
    [79.92, 0.04], [81.0, 0.62], [83.6, 0.66], [85.0, 0.3], [87.4, 0.12], [97.84, 0.05], [100.5, 0.6], [104, 0.82], [110.5, 0.8], [114, 0.55]], t);
  if (variant === 'before' && t >= STORM2) gal = Math.min(1.08, 0.05 + 1.03 * io(clamp01((t - STORM2) / 5)));
  S.gal = gal * (B.gallery > 0.98 ? 1 : 0);
  S.capacity = keys([[46.95, 0], [47.6, 1], [58.8, 1], [59.4, 0], [101.74, 0], [102.3, 1], [106.5, 1], [107, 0]], t);
  // grelhas: entrada de água (0..1), retorno pela grelha quando a galeria está sob pressão, lixo
  S.trash = variant === 'after' ? 0 : variant === 'before' ? 1 : keys([[0, 1], [5.6, 1], [7.0, 0], [54.63, 0], [57.6, 1], [88.0, 1], [89.0, 0]], t);
  S.spout = clamp01((S.gal - 1.0) / 0.08) * (B.enlarge > 0.98 ? 0 : 1);
  S.inletIn = B.inlets > 0.99 ? clamp01(S.runoff * (1 - 0.75 * S.trash) * (S.gal >= 1.0 ? 0.25 : 1)) : 0;

  // rio (cota absoluta da lâmina) e comporta da saída (0 aberta … 1 fechada)
  let river = keys([[0, RIVER.high], [5.6, RIVER.high], [8.4, RIVER.normal], [14.5, RIVER.normal], [16.9, -1.95], [20, RIVER.normal], [45.25, RIVER.normal], [48.7, -2.0], [59.33, -1.25], [62.05, RIVER.high],
    [71.2, RIVER.high], [72.4, 0.2], [76, RIVER.normal], [80.4, RIVER.normal], [84.4, -1.7], [87.4, -2.0], [97.84, RIVER.normal], [106.5, -0.9], [110.5, -0.95], [116.6, -1.3]], t);
  if (variant === 'before' && t >= STORM2) river = RIVER.normal + (RIVER.high - RIVER.normal) * io(clamp01((t - STORM2) / 8));
  S.river = river;
  S.flap = B.canal > 0.98 ? ss(-0.4, 0.2, river) : 0;
  // vazão na galeria/canal (para velocidade das setas e cascata na saída): 0..1
  S.flow = B.gallery > 0.98 ? clamp01(S.gal * 1.1) * (1 - 0.85 * S.flap) : 0;
  S.backflow = S.flap > 0.5 && S.gal > 0.9 ? 1 : 0; // água da galeria "empaca" e volta

  // piscinão: nível (0..1 da profundidade), vertedor (transbordo galeria → piscinão), bomba (esvaziamento controlado)
  let res = keys([[80.6, 0], [84.3, 0.72], [87.4, 0.06], [99.6, 0.06], [106.5, 0.62], [110.5, 0.66], [116.6, 0.5]], t);
  S.res = B.reservoir > 0.99 ? (variant === 'before' ? 0 : res) : 0;
  S.weir = B.reservoir > 0.99 && variant !== 'before' ? keys([[80.8, 0], [81.4, 1], [83.8, 1], [84.4, 0], [100.2, 0], [100.9, 1], [110.5, 1], [112.2, 0.3]], t) : 0;
  S.pump = B.reservoir > 0.99 && variant !== 'before' ? keys([[84.3, 0], [84.7, 1], [87.43, 1], [88, 0], [112.2, 0], [112.8, 1]], t) : 0;

  // visão de raio-x do subsolo (o chão fica translúcido para mostrar as duas redes)
  S.xray = keys([[41.6, 0], [42.3, 1], [44.6, 1], [45.2, 0], [108.0, 0], [108.8, 0.95], [111.6, 0.95], [112.3, 0]], t);
  S.rewind = ss(REWIND[0], REWIND[0] + 0.3, t) * (1 - ss(REWIND[1] - 0.3, REWIND[1], t));
  return S;
}

/** texto do medidor de chuva (mesmo para o antes × depois) */
export const rainText = (r) => (r < 0.05 ? 'sem chuva' : r < 0.7 ? 'normal' : 'intensa');
