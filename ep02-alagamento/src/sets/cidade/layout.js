// LAYOUT DA MAQUETE — fonte única de verdade para todos os módulos do Ep. 02.
// Unidades em METROS. Eixo x: da esquerda (alto, morro) para a direita (rio). Eixo z: do fundo (−) para a FRENTE (+).
// y = altitude. A face da frente da maquete é o plano z = ZF (corte do terreno visto pela câmera): tudo que
// fica "cortado" (galeria, bocas de lobo, esgoto, canal, rio, jardins de chuva) tem o eixo exatamente em z = ZF,
// com a metade de trás dentro da maquete (mesma convenção do cutPipe do Ep. 01: face em z = ZF, corpo em z < ZF).
// NUNCA mude um número aqui sem avisar o integrador: os módulos dependem deles para se encaixar.

export const X0 = -40, X1 = 44, Z0 = -24, ZF = 26, YB = -9; // bloco da maquete; YB = fundo do corte

/* ---------- interpolação monótona (PCHIP) ---------- */
export function pchip(knots) {
  const n = knots.length, xs = knots.map((k) => k[0]), ys = knots.map((k) => k[1]);
  const d = [], m = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (d[i - 1] + d[i])) / ((2 * d[i] + d[i - 1]) / d[i - 1] + (d[i] + 2 * d[i - 1]) / d[i]) / 3 * 3 / 3;
  for (let i = 1; i < n - 1; i++) if (d[i - 1] * d[i] > 0) { const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]), w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]); m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

/* ---------- relevo ---------- */
// Perfil ao longo de x (vale da frente / rua A). Ponto baixo (SAG) em x≈7: é onde a cidade alaga primeiro.
// Em x≈21 há o dique natural da margem; depois a calha do rio (x 27–38) e a margem oposta.
export const base = pchip([[-40, 8.2], [-30, 7.3], [-20, 6.0], [-12, 4.7], [-6, 3.75], [0, 3.0], [7, 2.62], [13, 2.72], [17, 3.0], [21, 3.3], [25, 3.15], [26.2, 2.6], [27.5, 0.2], [29, -4.0], [30, -4.6], [35, -4.6], [36.5, -3.8], [38, 0.6], [39.5, 2.7], [44, 2.9]]);
export const SAG = { x: 7, y: 2.62 };
const hill = (x, z) => 5.5 * Math.exp(-((x + 31) ** 2 / 150 + (z + 15) ** 2 / 90));
const backRise = (x, z) => (z < 12 ? 0.075 * (12 - z) * (1 - ss(0, 12, x)) : 0);
/** chão "urbano" (sem o córrego natural): rua A, lotes, praças */
export const G = (x, z) => base(x) + (x < 25 ? backRise(x, z) + hill(x, z) : 0);
/** altura da superfície da rua A (z 14.5–23.5): só depende de x */
export const streetY = (x) => base(x);

// Córrego natural (antes da cidade): corre pela frente da maquete, eixo em z = ZF (cortado ao meio pela face),
// do ponto baixo até o rio, atravessando o dique por um entalhe. Na cidade ele vira: galeria enterrada (x < 16)
// e CANAL de concreto (x 16–26). Mesma geografia, mesmo destino.
export const CREEK = { x0: 2, x1: 27.5, half: 1.3, bed: pchip([[2, 2.45], [9, 2.3], [16, 2.25], [19, 2.0], [21, 1.75], [24, 0.9], [25.6, 0.2], [27.5, -2.2]]) };
/** profundidade do entalhe do córrego no ponto (x,z) — 0 fora dele */
export function creekCut(x, z) {
  if (x < CREEK.x0 - 1 || x > CREEK.x1 || z < ZF - CREEK.half * 1.6) return 0;
  const g = base(x), bed = CREEK.bed(Math.max(CREEK.x0, x)), u = Math.min(1, Math.abs(z - ZF) / CREEK.half);
  const fade = ss(CREEK.x0 - 1, CREEK.x0 + 1, x);
  return Math.max(0, (g - bed) * (1 - u * u)) * fade;
}
/** chão natural (com o córrego) */
export const Gnat = (x, z) => G(x, z) - creekCut(x, z);

/* ---------- rio ---------- */
export const RIVER = { x0: 26.2, x1: 39.5, bed: -4.6, normal: -2.2, high: 0.7, levee: 3.3 }; // corre ao longo de z

/* ---------- ruas (z cresce para a frente) ---------- */
export const STREET_A = { x0: -38, x1: 18.5, z0: 14.5, z1: 23.5, curbH: 0.15, walkFront: [23.5, 26], walkBack: [12.5, 14.5] }; // rua do vale, junto ao corte
export const STREET_B = { x0: -22, x1: 18.5, z0: -9, z1: -1, curbH: 0.15, walkFront: [-1, 1], walkBack: [-11, -9] };
export const STREET_C = { x0: -14.5, x1: -9.5, z0: -9, z1: 14.5 };   // transversal ligando A e B
export const AVENUE_D = { x0: 18.5, x1: 22.5, z0: Z0, z1: ZF };        // avenida da margem, sobre o dique
export const PARK = { x0: 22.5, x1: 26.2, z0: Z0, z1: ZF };            // faixa verde da margem (várzea do parque linear)

/* ---------- lotes e construções ---------- */
// casas: { x (centro), w (largura em x), d (profundidade em z), z0..z1, floors, faces: 'A'|'B', door: lado da rua }
export const HOUSES = [
  { id: 'h1', x: -33, w: 7, z0: 5.5, z1: 11.5, floors: 1, face: 'A', roof: '#c9543b', wall: '#f2e2c4' },
  { id: 'h2', x: -25.5, w: 6.5, z0: 5.5, z1: 11.5, floors: 2, face: 'A', roof: '#8a4b3a', wall: '#e7eef2' },
  { id: 'h3', x: -18.5, w: 6, z0: 5.5, z1: 11.5, floors: 1, face: 'A', roof: '#c9543b', wall: '#f4d9a8' },
  { id: 'h4', x: 8.5, w: 6, z0: 5.5, z1: 11.5, floors: 1, face: 'A', roof: '#c9543b', wall: '#f2e2c4', cutaway: true }, // no ponto baixo: a água entra nela
  { id: 'h5', x: 13.2, w: 5, z0: 5.5, z1: 11.5, floors: 1, face: 'A', roof: '#a85a3c', wall: '#dfe9d6' },
  { id: 'h6', x: -32, w: 7, z0: 1, z1: 6, floors: 1, face: 'B', roof: '#a85a3c', wall: '#e9e1d0' },
  { id: 'h7', x: -24, w: 7, z0: 1, z1: 6, floors: 2, face: 'B', roof: '#c9543b', wall: '#f4d9a8' },
  { id: 'h8', x: -17.5, w: 5, z0: 1, z1: 6, floors: 1, face: 'B', roof: '#8a4b3a', wall: '#f2e2c4' },
  { id: 'h9', x: 9, w: 6, z0: 1, z1: 5, floors: 1, face: 'B', roof: '#8a4b3a', wall: '#e7eef2' },
  { id: 'h10', x: 14.5, w: 5, z0: 1, z1: 5, floors: 2, face: 'B', roof: '#c9543b', wall: '#f4d9a8' }
];
export const TOWERS = [ // prédios além da rua B
  { id: 't1', x: -17, z: -17.5, w: 6, d: 7, h: 22, color: '#dfe5ea' },
  { id: 't2', x: -11, z: -17, w: 5, d: 6, h: 15, color: '#f0e3cf' },
  { id: 't3', x: -6, z: -18, w: 4.5, d: 7, h: 27, color: '#cfd9e2' }
];
export const PARKING = { x0: -3, x1: 6.5, z0: -23, z1: -12.5 };       // estacionamento (vira pavimento permeável)
export const ETE = { x0: 8, x1: 18, z0: -24, z1: -12.5 };             // estação de tratamento de esgoto (destino do esgoto)
export const LIFT = { x0: 16.3, x1: 18.3, z0: 6.5, z1: 10 };          // estação elevatória de esgoto
export const PLAZA = { x0: -7, x1: 5, z0: 1.5, z1: 11 };              // praça do ponto baixo → vira o PISCINÃO
export const RESERVOIR = { ...PLAZA, floor: -2.0, wall: 0.4 };        // piscinão aberto (bacia de concreto), fundo em y = −2
export const HILL_FOREST = { x0: X0, x1: -21, z0: Z0, z1: -6 };       // mata do morro: NUNCA é derrubada (área verde preservada)
export const CARS = [
  { id: 'c1', x: 10.4, z: 21.9, rot: 0, color: '#d8433a' },          // parado no ponto baixo (gancho, submerso), ao lado da boca de lobo
  { id: 'c2', x: 12.6, z: 16.2, rot: Math.PI, color: '#2f7fd6' },
  { id: 'c3', x: -21, z: 16.2, rot: Math.PI, color: '#f6c12c' },
  { id: 'c4', x: -6, z: -3.2, rot: 0, color: '#e7eef2' }
];

/* ---------- drenagem pluvial (galeria no corte da frente) ---------- */
// Galeria de concreto retangular. Eixo em z = ZF (meia galeria visível no corte). invert = cota do fundo interno.
export const GALLERY = {
  x0: -36, x1: 16, wall: 0.25,
  small: { w: 1.6, h: 1.0 },       // como construída (etapa 7)
  big: { w: 2.4, h: 1.6 },         // ampliada (etapa 16): o fundo fica, o teto sobe
  invert: pchip([[-36, 4.3], [-24, 3.0], [-12, 1.6], [-2, 0.2], [8, -0.6], [16, -1.0]])
};
/** cota do teto EXTERNO da galeria (para não colidir com caixas de boca de lobo) */
export const galleryTop = (x, big = true) => GALLERY.invert(x) + (big ? GALLERY.big.h : GALLERY.small.h) + GALLERY.wall;
// Bocas de lobo: na guia da frente da rua A (z = 23.5), caixa sob a calçada da frente (z 23.5–26, cortada na face).
export const INLET = { w: 1.2, depth: 1.0, pipeR: 0.2 }; // caixa: largura em x, profundidade abaixo da calçada
export const INLETS = [8, 14, 0, -10, -20, -30];          // etapa 6 — a obra começa pelo ponto baixo (onde alaga)
export const INLETS_EXTRA = [3.5, 11];                    // etapa 16 (ampliação)
export const HOOK_INLET = 8;                              // a boca de lobo "afogada" do gancho, no ponto baixo
// Canal aberto de concreto: continua a galeria até o rio (onde antes corria o córrego). Bueiro (galeria fechada)
// sob a avenida D (x 18.5–22.5). Saída no talude do rio em x = 26 com comporta basculante (flap).
export const CANAL = { x0: 16, x1: 26, half: 1.2, wall: 0.25, culvert: [18.5, 22.5], invert: pchip([[16, -1.0], [26, -1.5]]), outletH: 1.4 };
// Ligação galeria → piscinão: tubo lateral que sai da parede da galeria em x = -1 (com soleira de vertedor a 60% da
// altura) e corre em −z sob a rua até a parede do piscinão (z = 11), despejando em cascata.
export const RES_INLET = { x: -1, weir: 0.6, r: 0.45, zIn: 11 };
// Saída controlada: bomba no poço do piscinão (canto x 4, z 2.5) recalca para a galeria em x = 6.5.
export const RES_PUMP = { x: 4, z: 2.5, toX: 6.5, r: 0.2 };

/* ---------- esgoto sanitário (rede SEPARADA) ---------- */
// Coletor tronco no corte da frente, ABAIXO da galeria (centro em invert − 0.85, raio 0.3), em PVC/ocre,
// conteúdo marrom. Em x = 17.3 faz curva e vai para o fundo (−z) até a elevatória (LIFT); dali o recalque leva à ETE.
export const SEWER = { x0: -36, x1: 17.3, r: 0.3, y: (x) => GALLERY.invert(Math.min(x, 16)) - 0.85 - Math.max(0, x - 16) * 0.05 };

/* ---------- soluções (etapa 17) ---------- */
export const GARDENS = [ // jardins de chuva: canteiros rebaixados na calçada (o da frente aparece em corte)
  { id: 'g1', x0: -34, x1: -22, z0: 23.9, z1: 26, front: true },
  { id: 'g2', x0: -19, x1: -13.5, z0: 23.9, z1: 26, front: true },
  { id: 'g3', x0: -34, x1: -20, z0: 12.7, z1: 13.9 },
  { id: 'g4', x0: 6, x1: 16, z0: 12.7, z1: 13.9 }
];
export const PERMEABLE = [PARKING, { x0: -8.5, x1: -5, z0: 23.9, z1: 26, front: true }]; // estacionamento + trecho de calçada em corte

/* ---------- níveis de referência para a água ---------- */
export const FLOOD = { dry: 2.45, before: 3.35, after: 2.72, door: 0.3 }; // soleira das casas = chão + 0.3
