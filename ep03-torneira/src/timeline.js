// Linha do tempo do Ep. 03, alinhada às pausas da narração (audio/narracao.mp3, 113,40 s).
// PH[n] = frase n: { a: início, b: fim, text }. Tudo na tela é ancorado em PH[n].a / PH[n].b.
export const DUR = 115.0;          // narração + respiro no plano final
export const END_AT = 113.6;       // cartela final entra aqui
export const SOURCE = null;        // fontes aparecem dentro do cenário (laboratório)

const raw = [
  [0.00, 3.26, 'Você abre a torneira e a água simplesmente aparece.'],
  [3.71, 7.05, 'Mas já imaginou tudo que precisa acontecer antes disso?'],
  [7.56, 10.79, 'Essa jornada pode começar em um rio ou em uma represa.'],
  [11.18, 17.00, 'Grandes bombas captam a água e transportam tudo por tubulações até uma estação de tratamento.'],
  [17.39, 21.66, 'Mas essa água ainda carrega terra, impurezas e microrganismos.'],
  [22.03, 25.10, 'Então, começa uma verdadeira transformação.'],
  [25.55, 30.86, 'Primeiro, são adicionados produtos que facilitam a união das pequenas partículas de sujeira.'],
  [31.26, 33.72, 'Esse processo é chamado de coagulação.'],
  [34.07, 40.81, 'Depois, a água é movimentada lentamente, fazendo essas partículas se juntarem e formarem flocos maiores.'],
  [41.16, 47.46, 'Na etapa seguinte, esses flocos afundam pela ação da gravidade, enquanto a água mais clara segue adiante.'],
  [47.84, 49.95, 'Mas ela ainda não está pronta para beber.'],
  [50.39, 58.27, 'Agora, a água atravessa filtros com diferentes camadas de materiais, como areia e carvão, que retêm as impurezas restantes.'],
  [58.60, 64.63, 'Depois vem a desinfecção, utilizando cloro para combater microrganismos prejudiciais à saúde.'],
  [65.03, 70.27, 'Também são realizados ajustes químicos e a adição de flúor, que ajuda a prevenir cáries.'],
  [70.62, 74.44, 'A qualidade da água é monitorada por análises laboratoriais.'],
  [74.80, 78.10, 'Depois de tratada, ela segue para grandes reservatórios.'],
  [78.45, 84.31, 'Alguns ficam em pontos elevados, aproveitando a gravidade para ajudar a manter a pressão nas tubulações.'],
  [84.67, 91.36, 'Debaixo das ruas, uma enorme rede distribui essa água para casas, prédios, escolas e hospitais.'],
  [91.73, 100.20, 'Ao chegar na sua casa, ela passa pelo hidrômetro, que registra o consumo, e pode abastecer diretamente as torneiras ou preencher a caixa-d’água.'],
  [100.61, 106.73, 'E quando você finalmente abre a torneira, todo esse sistema permite que a água chegue até você.'],
  [107.12, 113.40, 'Um simples copo de água depende de uma verdadeira obra de engenharia funcionando todos os dias.']
];
export const PH = [null, ...raw.map(([a, b, text]) => ({ a, b, text }))]; // PH[1]..PH[21]

// Um único cenário: a mesma maquete do manancial à torneira (exigência de continuidade).
export const SETS = [{ id: 'mundo', t0: 0, t1: DUR, wscale: 0.32 }];
export const CUTS = [];

// Gancho (título no 1º quadro)
export const HOOK = ['Como a <em>água</em>', 'chega até', 'sua torneira?'];

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
