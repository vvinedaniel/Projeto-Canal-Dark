// LAYOUT DA MAQUETE — fonte única de verdade para todos os módulos do Ep. 03 ("Como a água chega até sua torneira?").
// Unidades em METROS. y = altitude. Eixo z: do FUNDO (−, serra e represa) para a FRENTE (+, cidade e casa).
// Eixo x: esquerda (−) → direita (+). A câmera olha quase sempre na direção −z (de frente para a maquete).
//
// Caminho da água (sempre conectado, porta a porta — os pontos P.* abaixo são as conexões entre módulos):
//   represa → tomada d'água (grade) → poço de sucção → bombas (casa de bombas) → ADUTORA DE ÁGUA BRUTA (sobe a encosta)
//   → chegada da ETA → calha Parshall (mistura rápida + coagulante) → floculadores (3 câmaras) → decantador
//   → filtros (4) → tanque de contato (cloro, depois cal e flúor na saída) → reservatório apoiado da ETA
//   → elevatória de água tratada → ADUTORA DE ÁGUA TRATADA → reservatório elevado (torre) → rede de distribuição
//   (desce a encosta pela avenida) → rede da Rua da Casa (na face de corte) → ramal → hidrômetro → casa.
//
// Convenção de corte (igual aos Ep. 01/02): estruturas "em corte" têm o plano de corte voltado para +z; a metade da
// frente foi removida e vemos paredes, água e mecanismos por dentro. A face da frente da maquete (z = ZF) é um corte
// do solo onde aparecem as três redes da Rua da Casa (eixos exatamente em z = ZF, metade de trás dentro da maquete).
// NUNCA mude um número aqui sem avisar o integrador: os módulos dependem deles para se encaixar.

export const X0 = -62, X1 = 62, Z0 = -172, ZF = 34, YB = -8; // bloco da maquete (YB = fundo do corte na frente)

const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
const lerp = (a, b, k) => a + (b - a) * k;

/* ===================================================================================== RELEVO
   Faixas em z (de trás para a frente):
   z < −150         serra (sobe até ~34 nas bordas de trás)
   −152 … −100      vale da REPRESA: espelho d'água em y = LAKE.level, fundo y ≈ −4; barragem do lado direito (x ≈ 36)
   −100 … −88       margem plana (y 4) e pátio da captação; −88 … −81 talude com muro de arrimo até o platô
   −81 … −30        PLATÔ DA ETA, y = 14 (os tanques da ETA são de concreto ACIMA do chão)
   −30 … −6         encosta da cidade (desce de 14 para 0); a torre do reservatório elevado fica na borda do platô
   −6 … ZF (34)     CIDADE plana, y = 0 (ruas, quadras, a casa em corte na frente)                                  */
export const PLATEAU_Y = 14, CITY_Y = 0, SHORE_Y = 4.0;
export const LAKE = { x0: -56, x1: 33, z0: -152, z1: -100, level: 3.2, bed: -4.5, high: 3.2 };
export const DAM = { x: 36, z0: -152, z1: -102, crest: 6.2, width: 4.0, spillZ: -122, spillW: 6 }; // barragem de terra/concreto, eixo ao longo de z
export const RIVER_IN = { pts: [[-58, -168], [-50, -160], [-42, -152]], w: 5 };   // rio que alimenta a represa (vem da serra, à esquerda-fundo)
export const RIVER_OUT = { pts: [[38, -122], [46, -118], [54, -110], [62, -104]], w: 5, bed: -2.0, level: 0.2 }; // rio que segue depois da barragem

function plateauProfile(z) {
  // perfil base em z (sem lago e serra)
  if (z < -88) return SHORE_Y;                                    // margem plana + pátio da captação
  if (z < -81) return lerp(SHORE_Y, PLATEAU_Y, ss(-88, -81, z));   // talude (o terreno desenha um muro de arrimo de pedra)
  if (z < -30) return PLATEAU_Y;
  if (z < -6) return lerp(PLATEAU_Y, CITY_Y, ss(-30, -6, z));
  return CITY_Y;
}
const mountains = (x, z) => (z < -140 ? 30 * ss(-140, -172, z) * (0.75 + 0.25 * Math.cos(x * 0.11) * Math.cos(z * 0.07)) : 0);
const sideHills = (x, z) => 14 * ss(44, 62, Math.abs(x)) * ss(-94, -106, z);
/** profundidade do vale da represa (lago) em (x,z) — > 0 dentro do lago */
function lakeCut(x, z) {
  const u = Math.max(ss(LAKE.x0 + 10, LAKE.x0, x), ss(LAKE.x1 - 8, LAKE.x1 + 1, x));
  const v = Math.max(ss(LAKE.z0 + 10, LAKE.z0 - 2, z), ss(LAKE.z1 - 6, LAKE.z1 + 2, z));
  const w = 1 - Math.max(u, v);
  return w * (3.5 - LAKE.bed);
}
/** ALTURA DO CHÃO em (x, z) — use sempre esta função para apoiar estruturas (o terreno desenha exatamente isto). */
export function G(x, z) {
  let y = plateauProfile(z) + mountains(x, z) + sideHills(x, z);
  if (z > LAKE.z0 - 4 && z < LAKE.z1 + 3 && x > LAKE.x0 - 4 && x < LAKE.x1 + 3) y -= lakeCut(x, z);
  return y;
}

/* ===================================================================================== CAPTAÇÃO (margem da frente da represa)
   Tomada d'água na água (grade + comporta), poço de sucção enterrado na margem, casa de bombas em cima, com 2 conjuntos
   motobomba (1 operando + 1 reserva). Vista em corte pelo plano z = INTAKE.cut (frente da casa de bombas aberta).    */
export const INTAKE = {
  x: 4, zTower: -106.0,             // torre/tomada d'água dentro do lago (grade voltada para −z), ligada ao poço por tubo
  screen: { w: 3.2, h: 4.2, y0: -2.2 },   // grade (barras grossas) — base em y0
  well: { x0: 1.0, x1: 7.0, z0: -99.0, z1: -93.0, floor: -4.0 }, // poço de sucção (concreto, enterrado na margem, aberto pela frente)
  house: { x0: 0.0, x1: 8.0, z0: -99.5, z1: -92.0, floor: 4.6, roof: 9.6 }, // casa de bombas sobre o poço (encaixada na encosta)
  pumps: [{ x: 2.6, run: true }, { x: 5.4, run: false }], // eixo das bombas em z = pumpZ, y = floor + 0.9
  pumpZ: -96.0, cut: -92.0
};

/* ===================================================================================== PORTAS (conexões entre módulos)
   Cada porta é o centro do tubo/canal no ponto de conexão. Quem é dono de cada trecho está em docs/MODULOS.md.    */
export const P = {
  // água bruta
  rawOut: [4.0, 5.6, -92.0],          // saída do barrilete das bombas (parede da frente da casa de bombas)
  rawIn: [27.0, 14.0, -74.0],         // chegada da ETA (adutora entra por baixo na caixa de chegada)
  // dentro da ETA (todas na cota da água de cada unidade)
  parshallOut: [16.5, 19.6, -74.0],
  flocIn: [15.0, 19.4, -74.0],
  flocOut: [-3.0, 19.2, -74.0],
  decIn: [-4.5, 19.1, -74.0],
  decOut: [-27.0, 19.0, -70.0],        // calha de saída do decantador → canal de água decantada (desce para a fileira 2)
  filtIn: [-27.0, 18.9, -56.0],
  filtOut: [-5.0, 14.8, -52.0],        // galeria de água filtrada (embaixo dos filtros)
  contactIn: [-3.0, 14.8, -52.0],
  contactOut: [11.0, 16.2, -52.0],
  resvIn: [13.4, 16.2, -52.0],         // reservatório apoiado da ETA
  liftOut: [28.0, 18.0, -48.0],        // recalque da elevatória de água tratada → adutora de água tratada
  sludge: [-31.0, 14.6, -74.0],        // descarga de lodo do decantador (tubo pelo fundo, de x −8 até aqui) → tanque de lodo
  // tratada
  towerIn: [24.0, 11.8, -25.0],        // base da torre do reservatório elevado (sobe pela coluna)
  towerOut: [24.5, 11.8, -23.0],       // saída por gravidade (desce para a cidade)
  mainTop: [24.0, 10.0, -20.0],        // início da rede (avenida da encosta, enterrada)
  mainFace: [24.0, -1.2, ZF],          // rede chega à Rua da Casa (face de corte)
  house: [3.0, -1.2, ZF]               // derivação do ramal da casa na rede da Rua da Casa
};

/* ===================================================================================== ETA (platô y = 14)
   Duas fileiras de tanques de concreto ACIMA do chão, cada uma em corte pela FRENTE (+z):
   fileira 1 (z −80 … −68), fluxo de +x para −x: chegada → Parshall → floculadores → decantador
   fileira 2 (z −58 … −46), fluxo de −x para +x: filtros → tanque de contato → reservatório apoiado
   Entre as fileiras (z −68 … −58) fica um pátio de 10 m (passarela, tubulações; a câmera passa por ali).
   Prédios: casa de química (dosadores) atrás-direita, elevatória e laboratório na frente-direita.
   A água de cada unidade tem a cota y indicada (nível de operação): ela sempre DESCE de uma unidade para a seguinte.  */
export const ETA = {
  y: PLATEAU_Y,
  row1: { z0: -80, z1: -68, cut: -68, axis: -74 },
  row2: { z0: -58, z1: -46, cut: -46, axis: -52 },
  arrival: { x0: 25.0, x1: 29.0, z0: -78, z1: -70, floor: 14.0, top: 21.2, water: 20.6 },   // caixa de chegada (recebe a adutora por baixo)
  parshall: { x0: 16.5, x1: 25.0, z: -74, throatX: 20.5, w: 1.6, floor: 18.4, water: 19.6 }, // calha Parshall sobre pilares (estreitamento + ressalto hidráulico)
  floc: { x0: -3.0, x1: 15.0, z0: -79, z1: -69, floor: 14.3, water: 19.4, top: 20.0, chambers: 3, wall: 0.3 }, // 3 câmaras de 6 m, agitadores de paletas (eixo vertical)
  dec: { x0: -27.0, x1: -4.5, z0: -79, z1: -69, floor: 14.3, water: 19.1, top: 19.7, hopperX: -8.0 }, // decantador retangular, fluxo −x; poço de lodo junto à entrada
  sludgeTank: { x: -34, z: -74, r: 3.0, top: 18.0, floor: 14.0 }, // tanque/adensador de lodo à esquerda do decantador
  filters: { x0: -27.0, x1: -5.0, z0: -57, z1: -47, n: 4, floor: 14.3, top: 19.4, water: 18.8,
    layers: [ // de baixo para cima (cotas absolutas do TOPO de cada camada)
      { id: 'fundo', top: 15.1 },        // câmara de água filtrada + fundo falso com crepinas
      { id: 'cascalho', top: 15.7 },     // camada suporte (cascalho graduado)
      { id: 'areia', top: 16.5 },        // areia
      { id: 'antracito', top: 17.2 }     // antracito ("carvão" mineral)
    ] },
  contact: { x0: -3.0, x1: 11.0, z0: -57, z1: -47, floor: 14.2, water: 16.4, top: 16.9, baffles: 5 }, // tanque de contato com chicanas
  reservoir: { x: 19.0, z: -52, r: 5.6, floor: 13.0, top: 16.8, water: 16.0 },      // reservatório apoiado (meio enterrado)
  lift: { x0: 25.0, x1: 31.0, z0: -56, z1: -48, floor: 14.0, roof: 18.6 },          // elevatória de água tratada (2 bombas azuis)
  chem: { x0: 31.0, x1: 41.0, z0: -80, z1: -70, floor: 14.0, roof: 19.0 },          // casa de química (tanques e bombas dosadoras)
  lab: { x0: 31.0, x1: 41.0, z0: -44, z1: -36, floor: 14.0, roof: 18.0 },           // laboratório (em corte pela frente)
  dosing: { // pontos de aplicação (bico/difusor) — as linhas vêm da casa de química
    coag: [20.5, 19.9, -74.0],         // garganta da Parshall (mistura rápida no ressalto)
    chlorine: [-2.4, 16.7, -52.0],     // entrada do tanque de contato
    lime: [10.2, 16.7, -52.0],         // saída do tanque de contato (correção de pH)
    fluoride: [10.6, 16.7, -50.6]      // saída do tanque de contato (flúor)
  },
  sample: [33.0, 15.0, -40.0]         // torneira de amostra no laboratório (vem da saída do reservatório)
};

/* ===================================================================================== CIDADE (y = 0)
   Rua da Casa ao longo de x, junto à face de corte. Avenida da Encosta ao longo de z (x ≈ 24) liga a torre à cidade.
   As três redes da Rua da Casa têm o eixo em z = ZF (meio tubo visível no corte), em profundidades diferentes.    */
export const TOWER = { x: 24, z: -24, base: 11.8, legs: 14.2, tank: { r: 4.2, y0: 26.0, y1: 32.0 }, water: 31.0 }; // reservatório elevado
export const STREETS = {
  casa: { x0: -60, x1: 60, z0: 24.0, z1: 31.0, walkBack: [21.5, 24.0], walkFront: [31.0, ZF] },  // Rua da Casa (asfalto z 24–31)
  back: { x0: -60, x1: 60, z0: -2.0, z1: 5.0, walkBack: [-4.5, -2.0], walkFront: [5.0, 7.5] },
  avenida: { x0: 20.0, x1: 28.0, z0: -30.0, z1: 24.0 }                                           // desce a encosta
};
export const NET = {     // redes da Rua da Casa — eixo em z = ZF (meio tubo no corte)
  water: { y: -1.2, r: 0.32, color: '#2f7fd6', label: 'Água tratada' },        // PVC/ferro azul, a MAIS RASA
  sewer: { y: -2.7, r: 0.42, color: '#d08a2e', label: 'Esgoto' },               // PVC ocre, mais funda, vai para a ETE (direita)
  drain: { y: -4.6, w: 1.8, h: 1.3, color: '#9aa3a8', label: 'Drenagem (chuva)' } // galeria de concreto, a mais funda, vai para o rio
};
export const LOTS = {    // lotes (x0, x1, z0, z1) na quadra entre a rua de trás e a Rua da Casa
  hero: { x0: -6.0, x1: 6.0, z0: 9.0, z1: 21.5 },        // A CASA (em corte pela frente)
  school: { x0: -34.0, x1: -16.0, z0: 9.0, z1: 21.5 },
  hospital: { x0: 32.0, x1: 54.0, z0: 9.0, z1: 21.5 },
  houses: [{ x0: -14.0, x1: -8.0 }, { x0: 8.0, x1: 14.0 }, { x0: -46.0, x1: -38.0 }, { x0: -56.0, x1: -48.0 }],
  towers: [{ x: -40, z: -14, floors: 9 }, { x: -24, z: -16, floors: 7 }, { x: 40, z: -14, floors: 10 }, { x: 8, z: -14, floors: 6 }]
};

/* ===================================================================================== A CASA (lote hero)
   Térrea, fachada voltada para a Rua da Casa (+z), parede da frente REMOVIDA (corte) para ver a cozinha e os canos.
   Hidrômetro no muro da frente (cavalete), ramal enterrado desde a rede (P.house), caixa-d'água no telhado com boia. */
export const HOUSE = {
  x0: -5.0, x1: 5.0, z0: 10.0, z1: 19.0, floor: 0.25, wallH: 3.0, roofTop: 5.6,
  wall: { z: 21.5, h: 1.6 },                  // muro da frente
  meter: { x: 3.0, y: 0.85, z: 21.3 },        // hidrômetro (eixo ao longo de x) dentro da caixa do cavalete no muro
  tank: { x: 2.2, z: 13.0, y0: 3.45, h: 1.15, r: 0.75, inletY: 4.35 },  // caixa-d'água de 1000 L (cilíndrica, azul) no forro/telhado
  kitchen: { x0: -4.6, x1: -0.6, z0: 15.0, z1: 18.8, sinkX: -2.6, sinkZ: 17.7, counterY: 0.95 }, // pia junto à "frente" para leitura
  faucet: { x: -2.6, y: 1.32, z: 17.55 },     // bico da torneira (água cai na cuba)
  glass: { x: -2.45, y: 0.97, z: 17.75, r: 0.045, h: 0.13 },
  // tubos (polilinhas) — PVC soldável marrom (água fria) dentro das paredes, mostrados no corte
  direct: [[3.0, 0.85, 21.3], [3.0, 0.4, 20.0], [-2.0, 0.4, 19.2], [-2.6, 0.4, 18.6], [-2.6, 0.95, 18.6]],   // alimentação direta da cozinha
  up: [[3.0, 0.85, 21.3], [3.6, 0.6, 19.5], [3.6, 4.35, 19.0], [2.95, 4.35, 13.0]],                           // subida até a boia da caixa
  down: [[2.2, 3.45, 13.0], [1.0, 3.2, 13.0], [1.0, 0.5, 15.5]]                                                // saída da caixa → banheiro/área (por gravidade)
};

/* ===================================================================================== CORES DA ÁGUA (recurso didático, não prova de potabilidade) */
export const WATER = {
  raw: '#8a7350',        // bruta: barrenta (terra em suspensão) — nunca o marrom do esgoto
  coag: '#86765a',
  floc: '#7f8466',       // com flocos
  settled: '#7fa3a6',    // decantada: clara, levemente turva
  filtered: '#6fb2d0',   // filtrada
  treated: '#3f9be0',    // tratada (azul) — é só cor de leitura
  lake: '#4f8f86',       // represa (esverdeada, natural)
  sludge: '#5d4a33'
};
export const PIPE = { raw: '#8f7c63', treated: '#2f7fd6', pvcHouse: '#b5763e', sewer: '#d08a2e', concrete: '#a7adb1', iron: '#3d4a57', chem: '#e8e3d8' };
