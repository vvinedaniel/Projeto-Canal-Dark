// Roteiro do Ep. 01 — narração em frases com início/fim (s). Enquanto não houver a voz final,
// os tempos abaixo são marcações provisórias dentro da janela de cada cena; o tempo de cada palavra
// é distribuído pelas sílabas. Quando a narração chegar em public/audio/ep01/narracao.(wav|mp3),
// rode `npm run narration:fit` para medir as frases no áudio e gravar narration-timing.json.
import timing from './narration-timing.json';

export interface Phrase { id: string; scene: number; text: string; a: number; b: number }
export interface Word { text: string; a: number; b: number; key: boolean; phrase: string }

const BASE: Phrase[] = [
  { id: 'p01', scene: 1, text: 'Eu construí uma cidade inteira.', a: 0.3, b: 2.4 },
  { id: 'p02', scene: 1, text: 'Ruas, prédios, escola, hospital, prefeitura…', a: 2.6, b: 6.0 },
  { id: 'p03', scene: 1, text: 'mas existe um problema.', a: 6.2, b: 7.6 },
  { id: 'p04', scene: 2, text: 'Ninguém mora nela.', a: 8.4, b: 9.8 },
  { id: 'p05', scene: 3, text: 'A partir de agora, cada pessoa que seguir este perfil', a: 15.2, b: 19.5 },
  { id: 'p06', scene: 3, text: 'pode virar um morador da SegueCity.', a: 19.8, b: 23.4 },
  { id: 'p07', scene: 4, text: 'E se você comentar seu nome e a profissão que quer ter,', a: 24.2, b: 28.9 },
  { id: 'p08', scene: 4, text: 'seu personagem pode aparecer no próximo episódio.', a: 29.3, b: 34.0 },
  { id: 'p09', scene: 5, text: 'A cidade vai precisar de tudo:', a: 35.2, b: 36.9 },
  { id: 'p10', scene: 5, text: 'médicos,', a: 37.1, b: 37.9 },
  { id: 'p11', scene: 5, text: 'professores,', a: 38.9, b: 39.8 },
  { id: 'p12', scene: 5, text: 'motoristas,', a: 40.7, b: 41.6 },
  { id: 'p13', scene: 5, text: 'comerciantes,', a: 42.5, b: 43.5 },
  { id: 'p14', scene: 5, text: 'policiais,', a: 44.3, b: 45.1 },
  { id: 'p15', scene: 5, text: 'engenheiros…', a: 46.1, b: 47.1 },
  { id: 'p16', scene: 6, text: 'Quanto mais moradores chegarem, mais a cidade cresce.', a: 48.2, b: 52.6 },
  { id: 'p17', scene: 6, text: 'Novos bairros, novos negócios e novas histórias vão surgir.', a: 52.9, b: 57.5 },
  { id: 'p18', scene: 7, text: 'Os primeiros moradores podem se tornar fundadores da cidade.', a: 58.2, b: 62.6 },
  { id: 'p19', scene: 7, text: 'E no futuro, vocês vão decidir até quem será o prefeito.', a: 62.9, b: 67.5 },
  { id: 'p20', scene: 8, text: 'Então segue o perfil e comenta seu nome com a profissão que você quer ter.', a: 68.1, b: 71.8 },
  { id: 'p21', scene: 8, text: 'Hoje pode nascer o primeiro morador da SegueCity.', a: 72.0, b: 74.6 },
];

const T = timing as Record<string, { a: number; b: number }>;
export const PHRASES: Phrase[] = BASE.map((p) => (T[p.id] ? { ...p, a: T[p.id].a, b: T[p.id].b } : p));
export const SCENES: [number, number][] = [[0, 8], [8, 15], [15, 24], [24, 35], [35, 48], [48, 58], [58, 68], [68, 75]];

const KEYWORDS = new Set([
  'cidade', 'inteira', 'problema', 'ninguém', 'mora', 'seguir', 'perfil', 'morador', 'moradores', 'seguecity', 'nome', 'profissão',
  'personagem', 'próximo', 'episódio', 'tudo', 'médicos', 'professores', 'motoristas', 'comerciantes', 'policiais', 'engenheiros',
  'cresce', 'bairros', 'negócios', 'histórias', 'fundadores', 'prefeito', 'segue', 'comenta', 'hoje', 'primeiro', 'decidir',
]);

const VOW = /[aeiouáéíóúâêôãõàü]+/gi;
const syl = (w: string) => Math.max(1, (w.match(VOW) ?? []).length);
const bare = (w: string) => w.toLowerCase().replace(/[^a-zà-ü]/gi, '');

export const WORDS: Word[] = PHRASES.flatMap((p) => {
  const ws = p.text.split(/\s+/);
  const weights = ws.map((w) => syl(w) + (/[,.:…]$/.test(w) ? 0.8 : 0));
  const tot = weights.reduce((s, x) => s + x, 0);
  let t = p.a;
  return ws.map((w, k) => {
    const d = ((p.b - p.a) * weights[k]) / tot;
    const word = { text: w, a: t, b: t + d * (/[,.:…]$/.test(w) ? 0.75 : 1), key: KEYWORDS.has(bare(w)), phrase: p.id };
    t += d;
    return word;
  });
});

export const phrase = (id: string) => PHRASES.find((p) => p.id === id)!;
// início da primeira palavra que contém o texto (âncora de eventos visuais na fala)
export const W = (needle: string, after = 0) => (WORDS.find((w) => w.a >= after && bare(w.text).startsWith(bare(needle)))?.a ?? after);
export const speaking = (t: number) => PHRASES.some((p) => t >= p.a - 0.05 && t <= p.b + 0.1);
