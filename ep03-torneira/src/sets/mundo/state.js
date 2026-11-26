// ESTADO DO MUNDO — a única fonte de "o que está construído", "onde está a água" e "o que está funcionando".
// state(t) é FUNÇÃO PURA de t. Os módulos leem S e NÃO inventam tempos próprios de obra ou de água:
// sub-fases saem de S.build.x (ex.: filtro 0–0.25 caixa, 0.25–1 camadas de baixo para cima).
// Use t só para movimento contínuo (rotores, paletas, ondulação, partículas, setas).

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lin = (a, b, x) => clamp01((x - a) / (b - a));
const io = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const pulse = (t, a, b, fi = 0.3, fo = 0.3) => ss(a, a + fi, t) * (1 - ss(b - fo, b, t));
/** curva por quadros-chave [[t, v], ...] com transição suave */
export function keys(K, t) {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 0; i < K.length - 1; i++) if (t <= K[i + 1][0]) { const [a, va] = K[i], [b, vb] = K[i + 1]; return va + (vb - va) * ss(a, b, t); }
  return K[K.length - 1][1];
}

/* ---------- relógio da história ----------
   0 – 7,05 s: o PRESENTE (sistema inteiro pronto e funcionando: torneira aberta, câmera volta pelo caminho).
   7,05 – 7,9 s: REBOBINA (st volta de PRESENT a 7,9): as obras se desfazem em ordem inversa e ficam só as "plantas"
   (contornos azuis translúcidos) de tudo que ainda vai ser construído; a represa, o rio e a cidade continuam.
   7,9 s em diante: st = t — cada estrutura é construída quando a narração chega nela.                             */
export const PRESENT = 200, REWIND = [7.05, 7.9];
export function storyTime(t) {
  if (t < REWIND[0]) return PRESENT;
  if (t < REWIND[1]) return PRESENT + (REWIND[1] - PRESENT) * io(lin(REWIND[0], REWIND[1], t));
  return t;
}

/** progresso das obras (0 = nada, 1 = pronta) em função do tempo da história */
export function builds(st) {
  return {
    intake: lin(9.8, 12.4, st),      // captação: 0–.25 ensecadeira/escavação · .25–.55 poço + torre · .55–.75 grade e comporta · .75–1 casa de bombas
    pumps: lin(12.2, 13.3, st),      // conjuntos motobomba descidos pela talha e acoplados (barrilete, válvulas)
    rawMain: lin(14.6, 17.0, st),    // adutora de água bruta, tubo a tubo, da captação até a ETA
    arrival: lin(16.4, 17.8, st),    // caixa de chegada + calha Parshall
    chem: lin(25.4, 27.4, st),       // casa de química + tanque/bomba de coagulante + linha até a Parshall
    floc: lin(33.0, 35.4, st),       // floculadores: paredes → passagens → agitadores de paletas descidos e motores
    dec: lin(40.0, 42.4, st),        // decantador: paredes → calhas de coleta → raspador (ponte) → poço de lodo
    sludge: lin(45.0, 46.6, st),     // linha de descarga de lodo + tanque de lodo
    filters: lin(49.8, 53.6, st),    // filtros: .0–.25 caixas e fundo falso/crepinas · .25–1 cascalho → areia → antracito (camada a camada)
    contact: lin(58.0, 60.0, st),    // tanque de contato com chicanas + dosador de cloro
    finalDose: lin(64.8, 66.4, st),  // dosadores de cal (pH) e flúor na saída
    lab: lin(70.2, 71.6, st),        // laboratório (bancada, instrumentos)
    reservoir: lin(74.4, 76.0, st),  // reservatório apoiado da ETA
    lift: lin(74.8, 76.4, st),       // elevatória de água tratada (bombas azuis)
    treatedMain: lin(75.8, 78.0, st),// adutora de água tratada até a torre
    tower: lin(77.0, 80.2, st),      // reservatório elevado: fundação → coluna/pernas → taça → escada, para-raios
    meter: lin(91.8, 93.2, st),      // hidrômetro instalado no cavalete (registro, tubetes, lacre)
    tank: lin(95.0, 96.6, st)        // caixa-d'água colocada no forro e ligada (boia, saídas)
  };
}

/** água: enchimento/avanço (0..1) de cada trecho, em função do tempo da história */
export function waters(st) {
  return {
    pumpRun: ss(13.3, 13.9, st),          // bombas da captação girando
    raw: lin(14.9, 17.2, st),             // frente d'água avançando na adutora bruta (0 na captação → 1 na ETA)
    arrival: lin(17.2, 18.0, st),         // caixa de chegada + Parshall com água
    floc: lin(35.2, 36.4, st),            // floculadores enchendo (câmara 1 → 3)
    dec: lin(42.2, 43.4, st),             // decantador enchendo
    filters: lin(53.4, 54.4, st),         // água sobre os filtros
    contact: lin(60.0, 61.0, st),
    reservoir: lin(76.0, 77.2, st),
    treated: lin(77.6, 79.4, st),         // frente d'água na adutora tratada até a torre
    tower: lin(79.6, 83.6, st),           // nível subindo na taça da torre
    net: lin(84.8, 88.4, st),             // frente d'água na rede da cidade (a partir da torre, até as pontas)
    ramal: lin(92.9, 93.9, st),           // ramal → hidrômetro
    direct: lin(96.0, 96.8, st),          // ramo direto até a cozinha
    up: lin(96.4, 97.0, st),              // subida até a boia
    tank: lin(96.9, 99.5, st),            // nível da caixa-d'água
    float: ss(99.2, 100.0, st)            // boia fecha a entrada (0 aberta → 1 fechada)
  };
}

/** estado completo em t */
export function state(t) {
  const st = storyTime(t);
  const B = builds(st), Wt = waters(st);
  const present = t < REWIND[0];
  const S = { t, st, build: B, water: Wt, present };
  S.rewind = pulse(t, REWIND[0] - 0.1, REWIND[1] + 0.15, 0.15, 0.25);   // efeito de rebobinar (overlay)
  // "plantas" das estruturas ainda não construídas: discretas depois do rebobinar, em destaque na vista aérea da ETA
  S.ghost = t < REWIND[1] ? 0 : keys([[REWIND[1], 0.35], [21.8, 0.35], [22.4, 1], [25.0, 1], [25.8, 0.35]], t);
  // funcionando (movimentos contínuos): só depois de construído e com água
  S.run = {
    pumps: Wt.pumpRun,
    coag: present ? 1 : ss(27.0, 27.6, st),           // bomba dosadora de coagulante
    paddles: Wt.floc,                                  // agitadores (velocidade decrescente: dono decide)
    scraper: present ? 1 : ss(45.4, 46.2, st),        // raspador de lodo andando
    sludgeOut: pulse(t, 46.0, 50.0, 0.4, 0.6) + (present ? 1 : 0), // descarga de lodo aberta (lodo indo ao tanque)
    backwash: pulse(t, 56.2, 58.3, 0.3, 0.4),          // lavagem em contracorrente no filtro 4 (só aqui)
    chlorine: present ? 1 : ss(59.8, 60.4, st),
    finalDose: present ? 1 : ss(66.2, 66.8, st),
    lift: present ? 1 : ss(77.2, 77.8, st),            // bombas de água tratada
    meter: t < REWIND[0] ? 1 : (t > 93.4 && t < 100.2 ? ss(93.4, 93.9, t) * (1 - ss(99.6, 100.2, t)) : 0) + ss(101.2, 101.8, t), // turbina do hidrômetro gira quando há consumo
    faucet: keys([[0, 1], [6.9, 1], [7.0, 0], [100.7, 0], [101.6, 1]], t)  // abertura da torneira (volante girando)
  };
  // copo: no gancho já está enchendo; no fim um copo novo enche de novo
  S.glass = t < REWIND[1] ? keys([[0, 0.18], [6.5, 0.85]], t) : keys([[100.6, 0], [101.7, 0], [106.6, 0.9]], t);
  // nível da caixa-d'água no presente: cheia, boia fechada; no consumo final a boia abre um pouco e volta a fechar
  if (present) { Wt.tank = 1; Wt.float = 1; }
  S.floatFinal = keys([[100.6, 1], [102.6, 0.55], [107.5, 0.55], [110.5, 1]], t);   // usado depois de 100,6 s
  // pressão / gravidade (linha do nível da torre sobre a cidade + manômetros)
  S.piezo = pulse(t, 80.2, 84.6, 0.5, 0.4);
  // raio-x do chão (ruas e calçadas translúcidas) para ver as redes enterradas e o ramal
  S.xray = keys([[0, 0.9], [6.6, 0.9], [7.4, 0], [84.4, 0], [85.4, 0.95], [94.6, 0.95], [95.4, 0], [108.5, 0], [110.5, 0.9]], t);
  // lente de ampliação (o integrador posiciona a lente; o módulo micro desenha o "modo")
  S.micro = microAt(t);
  return S;
}

/* ---------- lente de ampliação ilustrativa ----------
   mode: o que está ampliado; k: progresso 0..1 dentro da janela (para processos que evoluem); a: visibilidade */
export const MICRO = [
  { mode: 'raw', a: 18.0, b: 21.7 },        // água bruta: argila, matéria orgânica, bactérias, protozoários dispersos
  { mode: 'coag', a: 27.4, b: 33.7 },       // cargas negativas se repelem → coagulante neutraliza → partículas começam a grudar
  { mode: 'floc', a: 36.4, b: 40.9 },       // microflocos crescem em flocos maiores (câmara 1 → 3)
  { mode: 'settle', a: 43.2, b: 46.8 },     // flocos descem (gravidade) e acumulam no fundo; água de cima mais clara
  { mode: 'clear', a: 47.8, b: 50.0 },      // água "clara" ainda com microrganismos: clara ≠ potável
  { mode: 'filter', a: 54.6, b: 58.3 },     // grãos de antracito e areia retendo partículas nos poros
  { mode: 'chlorine', a: 60.4, b: 64.7 }    // cloro age ao longo do TEMPO DE CONTATO (inativação gradual, não instantânea)
];
export function microAt(t) {
  for (const m of MICRO) if (t >= m.a - 0.4 && t <= m.b + 0.4) return { mode: m.mode, k: lin(m.a, m.b, t), a: pulse(t, m.a - 0.3, m.b + 0.3, 0.45, 0.4), tau: t - m.a };
  return { mode: null, k: 0, a: 0, tau: 0 };
}
