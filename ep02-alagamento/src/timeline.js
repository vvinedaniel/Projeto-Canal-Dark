// Linha do tempo do Ep. 02, alinhada às pausas da narração (audio/narracao.mp3, 114,91 s).
// PH[n] = frase n: { a: início, b: fim, text }. Tudo na tela é ancorado em PH[n].a / PH[n].b.
export const DUR = 116.6;          // narração + cartela final
export const END_AT = 115.0;       // cartela final entra aqui
export const SOURCE = null;        // este episódio não cita número na tela

const raw = [
  [0.00, 2.83, 'Se as ruas têm bueiros para escoar a água da chuva,'],
  [3.15, 5.29, 'por que as cidades continuam alagando?'],
  [5.92, 6.72, 'Pra entender isso,'],
  [6.95, 9.28, 'vamos começar antes de a cidade existir.'],
  [9.88, 11.76, 'Quando chove sobre um terreno natural,'],
  [12.12, 14.02, 'parte da água penetra no solo,'],
  [14.27, 16.85, 'enquanto outra parte escorre até os rios.'],
  [17.37, 22.38, 'Mas aí começamos a construir casas, prédios, calçadas e ruas de asfalto.'],
  [22.96, 27.37, 'O problema é que grande parte dessas superfícies não deixa a água passar.'],
  [27.93, 33.79, 'Então, aquela água que antes penetrava no solo começa a se acumular e correr pelas ruas.'],
  [34.25, 36.88, 'Pra resolver isso, instalamos bocas de lobo,'],
  [37.12, 40.10, 'conectadas a grandes tubulações debaixo da cidade.'],
  [40.65, 44.83, 'Essas tubulações transportam a água da chuva até canais e rios.'],
  [45.25, 46.55, 'Mas existe um problema:'],
  [46.95, 48.21, 'elas têm um limite.'],
  [48.73, 50.73, 'Quando chove muito em pouco tempo,'],
  [51.04, 54.13, 'pode chegar mais água do que o sistema consegue transportar.'],
  [54.63, 58.80, 'E se houver lixo bloqueando os bueiros, a situação fica ainda pior.'],
  [59.33, 62.05, 'Além disso, quando o nível do rio sobe demais,'],
  [62.32, 65.44, 'a água das galerias pode encontrar dificuldade pra sair.'],
  [65.95, 66.62, 'O resultado?'],
  [67.02, 71.20, 'Ruas alagadas, carros submersos e água entrando nas casas.'],
  [71.72, 73.08, 'Mas como resolver isso?'],
  [73.60, 77.44, 'Uma das soluções é construir enormes reservatórios de contenção,'],
  [77.74, 79.47, 'conhecidos como piscinões.'],
  [79.92, 84.34, 'Eles armazenam temporariamente a água da chuva e liberam tudo aos poucos,'],
  [84.59, 87.43, 'evitando sobrecarregar as galerias e os rios.'],
  [87.91, 91.67, 'Também podemos ampliar as tubulações, criar jardins de chuva,'],
  [91.96, 96.69, 'preservar áreas verdes e utilizar pavimentos que permitem a passagem da água.'],
  [97.17, 97.60, 'Agora,'],
  [97.84, 99.60, 'quando uma nova tempestade chega,'],
  [99.84, 101.48, 'a cidade consegue absorver,'],
  [101.74, 104.39, 'armazenar e distribuir melhor essa água.'],
  [104.83, 106.49, 'O risco de alagamento diminui.'],
  [106.93, 111.73, 'Porque proteger uma cidade das enchentes não é simplesmente instalar mais bueiros.'],
  [112.17, 114.91, 'É planejar pra onde toda essa água vai.']
];
export const PH = [null, ...raw.map(([a, b, text]) => ({ a, b, text }))]; // PH[1]..PH[36]

// Um único cenário: a mesma maquete do começo ao fim (exigência de continuidade).
export const SETS = [{ id: 'cidade', t0: 0, t1: DUR, wscale: 0.32 }];
export const CUTS = [];

// Gancho (título no 1º quadro)
export const HOOK = ['Por que a cidade', '<em>alaga</em> se', 'tem bueiro?'];

// Legendas: blocos curtos com o tempo de cada palavra (src/words.js, gerado por tools/align.py).
import { WORDS } from './words.js';
export const CAPTIONS = [];
let wi = 0;
for (const ph of raw) {
  const words = ph[2].split(' ');
  const timed = words.map((w) => { const x = WORDS[wi++]; return { w, a: Math.max(ph[0] - 0.06, x.a - 0.06), b: x.b }; });
  let cur = [];
  const flush = () => { if (cur.length) { CAPTIONS.push({ a: cur[0].a, b: cur[cur.length - 1].b, words: cur }); cur = []; } };
  for (const x of timed) {
    const len = cur.reduce((s, y) => s + y.w.length + 1, 0);
    if (cur.length >= 3 || (cur.length && len + x.w.length > 15)) flush();
    cur.push(x);
    if (/[,.:?]$/.test(x.w)) flush();
  }
  flush();
}
CAPTIONS.forEach((c, i) => { const next = CAPTIONS[i + 1]; c.end = Math.min(c.b + 0.35, next ? next.a : c.b + 0.35); if (next && next.a - c.b < 0.5) c.end = next.a; });
