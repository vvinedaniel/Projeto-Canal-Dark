// Linha do tempo do episódio, alinhada às pausas da narração (audio/narracao.mp3, 100,99 s).
// PH[n] = frase n do roteiro: { a: início, b: fim, text }.  Use PH[n].a / PH[n].b nos cenários.
export const DUR = 102.5;

const raw = [
  [0.00, 4.39, 'Você já parou pra pensar no que acontece com o seu cocô depois que você dá descarga?'],
  [4.96, 5.99, 'Ao apertar o botão,'],
  [6.22, 8.58, 'uma válvula se abre no fundo da caixa,'],
  [8.85, 11.26, 'e cerca de seis litros de água descem.'],
  [11.72, 14.86, 'A água entra pela borda da bacia, e o nível sobe.'],
  [15.32, 17.89, 'Ela enche a curva escondida dentro do vaso,'],
  [18.12, 18.69, 'o sifão,'],
  [19.03, 21.04, 'e puxa tudo de uma vez pro cano.'],
  [21.50, 21.91, 'No fim,'],
  [22.13, 23.98, 'sobra água parada na curva.'],
  [24.39, 27.89, 'É uma barreira que impede o cheiro do esgoto de voltar pro banheiro.'],
  [28.37, 28.96, 'Do vaso,'],
  [29.23, 33.28, 'tudo desce por um cano inclinado até a caixa de inspeção, no quintal.'],
  [33.74, 34.11, 'De lá,'],
  [34.38, 37.52, 'um ramal leva o esgoto até a rede, debaixo da rua.'],
  [37.97, 43.48, 'Os canos das casas se juntam em tubos cada vez maiores, e o esgoto desce pela gravidade.'],
  [43.92, 45.64, 'Quando o cano fica fundo demais,'],
  [45.92, 47.53, 'uma estação de bombas'],
  [47.76, 49.97, 'empurra tudo pra cima, e a descida recomeça.'],
  [50.45, 51.73, 'Quilômetros depois,'],
  [52.01, 53.84, 'ele chega à estação de tratamento.'],
  [54.22, 57.72, 'Grades seguram o lixo que nunca deveria ter ido pro vaso.'],
  [58.12, 59.49, 'A água anda devagar,'],
  [59.71, 60.78, 'e a areia afunda.'],
  [61.26, 64.82, 'Em tanques enormes, a sujeira mais pesada vai pro fundo.'],
  [65.26, 67.70, 'Mas a parte dissolvida continua na água.'],
  [68.13, 70.34, 'Aí entram bilhões de bactérias:'],
  [70.78, 74.44, 'ar é soprado nos tanques, e elas se alimentam dessa sujeira.'],
  [74.85, 79.29, 'Num último tanque, as bactérias afundam, e a água clara sai por cima.'],
  [79.73, 83.68, 'O lodo do fundo vai pra tanques fechados e produz biogás.'],
  [84.12, 86.53, 'Em algumas estações, ele vira energia.'],
  [87.00, 88.98, 'E a água tratada volta pro rio.'],
  [89.37, 90.45, 'Não é água de beber,'],
  [90.75, 92.93, 'mas está limpa o bastante pra natureza.'],
  [93.37, 95.37, 'Do seu banheiro até o rio.'],
  [95.82, 97.14, 'Só que, no Brasil,'],
  [97.37, 100.99, 'cerca de metade do esgoto ainda não faz esse caminho.']
];
export const PH = [null, ...raw.map(([a, b, text]) => ({ a, b, text }))]; // PH[1]..PH[37]

// Janela de cada cenário (segundos globais). Os cortes caem nas pausas entre frases.
// wscale = frequência espacial da ondulação da água (ciclos por metro), conforme a escala da maquete.
export const SETS = [
  { id: 'casa', t0: 0, t1: 37.75, wscale: 22 },      // PH 1–15: banheiro, vaso em corte, quintal, rua
  { id: 'rede', t0: 37.75, t1: 50.2, wscale: 2.2 },  // PH 16–19: rede coletora e estação elevatória
  { id: 'eteA', t0: 50.2, t1: 65.04, wscale: 0.9 },  // PH 20–25: chegada à ETE, grades, caixa de areia, decantador primário
  { id: 'eteB', t0: 65.04, t1: 86.76, wscale: 0.9 }, // PH 26–31: aeração + bactérias, decantador secundário, biodigestor
  { id: 'rio', t0: 86.76, t1: DUR, wscale: 1.6 }     // PH 32–37: devolução ao rio e revelação final
];

// Trocas de plano feitas com dissolve em zoom (sem escurecer). 'in' = mergulho (o plano que sai cresce
// e se dissolve), 'out' = recuo (o plano que sai encolhe enquanto o novo se afasta até o tamanho normal).
// Trocas de cenário que não estão aqui usam o mergulho curto no escuro (entrada/saída de túnel ou tubo).
export const CUTS = [
  { at: 65.04, mode: 'in', dur: 0.55 },  // decantador primário → canal de chegada da aeração
  { at: 67.95, mode: 'in', dur: 0.6 },   // béquer → microscópio
  { at: 70.5, mode: 'out', dur: 0.5 },   // microscópio → tanque de aeração
  { at: 72.72, mode: 'in', dur: 0.6 },   // tanque de aeração → microscópio
  { at: 74.62, mode: 'out', dur: 0.5 }   // microscópio → decantador secundário
];

// Legendas: blocos curtos. O tempo de cada palavra vem de src/words.js (tools/align.py: sílabas +
// vales de energia do áudio); a palavra acende ~60 ms antes de ser dita, como em legenda profissional.
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
// cada bloco fica na tela até o próximo começar (ou 0,35 s depois de terminar)
CAPTIONS.forEach((c, i) => { const next = CAPTIONS[i + 1]; c.end = Math.min(c.b + 0.35, next ? next.a : c.b + 0.35); if (next && next.a - c.b < 0.5) c.end = next.a; });
