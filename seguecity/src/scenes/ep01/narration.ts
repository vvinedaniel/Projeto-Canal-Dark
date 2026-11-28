// Roteiro do Ep. 01 com a narração oficial (public/audio/ep01/narracao-original.mp3, "Cidade.mp3").
// words.json é gerado por `python3 scripts/ep01-narracao.py`: posição de cada frase na linha do tempo de 75 s
// (com respiros nas viradas, sem acelerar a voz) e início/fim de cada palavra (sílabas + vales de energia).
// Todo evento visual e sonoro do episódio é ancorado numa palavra: W('palavra').
import data from './words.json';

export interface Phrase { id: string; text: string; a: number; b: number }
export interface Word { text: string; a: number; b: number; key: boolean; phrase: string }

export const PHRASES: Phrase[] = data.frases;
export const WORDS: Word[] = data.palavras.map((w) => ({ text: w.w, a: w.a, b: w.b, key: w.key, phrase: w.phrase }));

const bare = (w: string) => w.toLowerCase().replace(/[^a-zà-ü]/gi, '');
export const phrase = (id: string) => PHRASES.find((p) => p.id === id)!;
// início da primeira palavra (a partir de `after`) que começa com o texto
export const W = (needle: string, after = 0) => {
  const w = WORDS.find((x) => x.a >= after && bare(x.text).startsWith(bare(needle)));
  if (!w) throw new Error(`palavra não encontrada na narração: ${needle} (depois de ${after}s)`);
  return w.a;
};
export const speaking = (t: number) => PHRASES.some((p) => t >= p.a - 0.05 && t <= p.b + 0.1);
