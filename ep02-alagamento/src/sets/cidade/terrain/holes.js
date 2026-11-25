// Furos da face da frente (z = ZF) e os tampões que os cobrem até a obra correspondente ser feita.
// Cada furo é uma faixa em x com fundo bot(x) e topo top(x) (todas as cotas vêm do layout).
// reveal: 'x' = escavação avança em +x (de montante p/ jusante); 'down' = de cima p/ baixo; 'up' = de baixo p/ cima.
// k(S) = progresso 0..1 da escavação daquele tampão (sub-fase do S.build correspondente).
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const sub = (v, a, b) => clamp01((v - a) / (b - a));

// janelas de obra iguais às do módulo de drenagem (drainage/inlets.js): a do ponto baixo primeiro, depois as vizinhas
function inletWindows(Lo) {
  const win = new Map(), order = [Lo.HOOK_INLET, ...Lo.INLETS.filter((x) => x !== Lo.HOOK_INLET).sort((a, b) => Math.abs(a - Lo.HOOK_INLET) - Math.abs(b - Lo.HOOK_INLET))];
  order.forEach((x, i) => win.set(x, i === 0 ? [0.03, 0.6] : [0.3 + (i - 1) * 0.12, 0.3 + (i - 1) * 0.12 + 0.24]));
  Lo.INLETS_EXTRA.forEach((x, i) => win.set('e' + x, i === 0 ? [0.0, 0.62] : [0.3, 0.92]));
  return win;
}
/** altura livre do bueiro sob a avenida (drainage/canal.js: CH) */
export const CULVERT_H = 2.3;
/** fim da vala de saída do canal (cabeceira em x 26,05 + alas, avental e enrocamento até ~29,25) */
export const OUT0 = 26.05, OUT1 = 29.25;
/** fundo da vala do canal / saída (cota absoluta) */
export function canalFloor(Lo, x) {
  const c = Lo.CANAL.invert, W = Lo.CANAL.wall;
  if (x <= OUT0) return c(Math.max(x, Lo.CANAL.x0)) - W;
  const y0 = c(OUT0) - W, ya = y0 - 0.35;
  const y = x <= OUT0 + 1.5 ? y0 - 0.35 * (x - OUT0) / 1.5 : ya - 0.08 + (-2.95 - ya + 0.08) * Math.min(1, (x - OUT0 - 1.5) / 1.7);
  return Math.min(y, Lo.base(x));
}
export function holeList(Lo, shared = null) {
  const win = inletWindows(Lo), ligRank = Lo.INLETS.slice().sort((a, b) => a - b);
  const { GALLERY: GA, INLET, INLETS, INLETS_EXTRA, SEWER, CANAL, GARDENS, PERMEABLE, STREET_A } = Lo;
  const inv = (x) => GA.invert(Math.min(Math.max(x, GA.x0), GA.x1));
  const walkTop = (x) => Lo.streetY(x) + STREET_A.curbH;              // topo da calçada da frente
  const boxBot = (x) => walkTop(x) - INLET.depth - 0.15;
  const smallTop = (x) => inv(x) + GA.small.h + GA.wall, bigTop = (x) => inv(x) + GA.big.h + GA.wall;
  const bw = INLET.w / 2 + 0.15, pr = INLET.pipeR + 0.05;
  const H = [];
  // galeria (furo já no tamanho ampliado); o tampão da galeria cobre só a seção pequena
  // (galeria: aduela i chega com build.gallery ≈ 0,78·i/N; ampliação de montante p/ jusante, como em drainage/gallery.js)
  H.push({ id: 'gallery', xa: GA.x0, xb: GA.x1, bot: (x) => inv(x) - GA.wall, top: smallTop, reveal: 'x', k: (S) => sub(S.build.gallery, 0, 0.76), order: 2 });
  H.push({ id: 'enlarge', xa: GA.x0, xb: GA.x1, bot: smallTop, top: bigTop, reveal: 'up', k: (S) => sub(S.build.enlarge, 0, 1), kx: (S, x) => sub(sub(S.build.enlarge - 0.45 * (x - GA.x0) / (GA.x1 - GA.x0), 0, 0.55), 0, 0.45), order: 5 });
  // caixas das bocas de lobo (uma por vez, de cima p/ baixo) e ligações caixa → galeria
  INLETS.forEach((x, i) => {
    const [a, b] = win.get(x), l0 = 0.8 + 0.14 * (ligRank.indexOf(x) / (ligRank.length - 1));
    H.push({ id: 'box' + i, xa: x - bw, xb: x + bw, bot: () => boxBot(x), top: () => walkTop(x) + 0.6, reveal: 'down', k: (S) => (shared && shared.inletBoxK ? sub(shared.inletBoxK(x, S), 0, 0.22) : sub(S.build.inlets, a, a + 0.22 * (b - a))), order: 1 });
    H.push({ id: 'link' + i, xa: x - pr, xb: x + pr, bot: () => smallTop(x) - 0.04, top: () => boxBot(x) + 0.04, reveal: 'down', k: (S) => sub(S.build.gallery, l0 - 0.012, l0 + 0.03), order: 3 });
  });
  INLETS_EXTRA.forEach((x, i) => {
    const [a, b] = win.get('e' + x), p = (S) => sub(S.build.enlarge, a, b);
    H.push({ id: 'xbox' + i, xa: x - bw, xb: x + bw, bot: () => boxBot(x), top: () => walkTop(x) + 0.6, reveal: 'down', k: (S) => sub(p(S), 0, 0.15), order: 5 });
    H.push({ id: 'xlink' + i, xa: x - pr, xb: x + pr, bot: () => bigTop(x) - 0.04, top: () => boxBot(x) + 0.04, reveal: 'down', k: (S) => sub(p(S), 0.57, 0.68), order: 6 });
  });
  // esgoto (tubo r = 0,35 ao longo de SEWER.y)
  H.push({ id: 'sewer', xa: SEWER.x0, xb: SEWER.x1, bot: (x) => SEWER.y(x) - 0.35, top: (x) => SEWER.y(x) + 0.35, reveal: 'x', k: (S) => S.build.sewer, order: 0 });
  // canal: entalhe aberto até o chão; sob a avenida (bueiro) o furo vai só até o teto do bueiro
  //  (+ vala de saída x 26–29,25 cortando o talude até o rio, onde ficam cabeceira, alas, avental e enrocamento)
  // (o trecho do bueiro só é aberto quando o módulo de drenagem começa a montar o teto dele: build.canal ≈ 0,36)
  const [CU0, CU1] = CANAL.culvert, span = OUT1 - CANAL.x0;
  H.push({ id: 'canal', xa: CANAL.x0, xb: CU0, bot: (x) => canalFloor(Lo, x), top: () => 12, reveal: 'x', k: (S) => sub(canalK(S), 0, (CU0 - CANAL.x0) / span), order: 4 });
  H.push({ id: 'culvert', xa: CU0, xb: CU1, bot: (x) => canalFloor(Lo, x), top: (x) => CANAL.invert(x) + CULVERT_H + CANAL.wall + 0.03, reveal: 'x', k: (S) => sub(S.build.canal, 0.33, 0.4), order: 4 });
  H.push({ id: 'outlet', xa: CU1, xb: OUT1, bot: (x) => canalFloor(Lo, x), top: () => 12, reveal: 'x', k: (S) => sub(canalK(S), (CU1 - CANAL.x0) / span, 1), order: 4 });
  // jardins de chuva da frente e trecho de calçada permeável
  // jardins da frente e calçada permeável: o progresso vem do módulo verde (shared.greenHoleK) quando existir.
  // Onde uma caixa de boca de lobo cai dentro do jardim, a caixa prevalece: o furo do jardim pula esse trecho.
  const gk = (id, fb) => (S) => (shared && shared.greenHoleK ? shared.greenHoleK(id, S) : fb(S));
  const boxes = [...INLETS, ...INLETS_EXTRA].map((x) => [x - bw, x + bw]);
  const split = (a, b) => { let segs = [[a, b]]; boxes.forEach(([p, q]) => { segs = segs.flatMap(([u, v]) => (q <= u || p >= v ? [[u, v]] : [[u, p], [q, v]].filter(([m, n]) => n - m > 0.05))); }); return segs; };
  GARDENS.filter((g) => g.front).forEach((g, i, arr) => {
    const n = arr.length, k = gk('garden' + i, (S) => sub(S.build.gardens, (i / n) * 0.8, (i / n) * 0.8 + 0.6));
    split(g.x0, g.x1).forEach(([a, b], j) => H.push({ id: 'garden' + i + (j ? '_' + j : ''), xa: a, xb: b, bot: (x) => walkTop(x) - 0.9, top: (x) => walkTop(x) + 0.6, reveal: 'down', k, order: 7 }));
  });
  PERMEABLE.filter((p) => p.front).forEach((p, i) => {
    const k = gk('perm' + i, (S) => sub(S.build.permeable, 0.45, 1));
    split(p.x0, p.x1).forEach(([a, b], j) => H.push({ id: 'perm' + i + (j ? '_' + j : ''), xa: a, xb: b, bot: (x) => walkTop(x) - 0.55, top: (x) => walkTop(x) + 0.6, reveal: 'down', k, order: 8 }));
  });
  return H;
}
/** progresso da abertura do canal (chão e corte) — o mesmo para a superfície e o tampão */
export const canalK = (S) => sub(S.build.canal, 0, 0.32);
/** x até onde o canal já foi aberto (16 → 29,35) — mesma frente do tampão do corte */
export const canalSweep = (S, Lo) => (S.build.canal <= 0 ? -1e9 : Lo.CANAL.x0 - 0.05 + (OUT1 + 0.1 - Lo.CANAL.x0 + 0.05) * canalK(S));

/** polígono (no plano XY) de um furo, amostrado em x */
export function holePoly(h, step = 0.1) {
  const xs = []; for (let x = h.xa; x < h.xb; x += step) xs.push(x); xs.push(h.xb);
  (h.breaks || []).forEach((b) => xs.push(b - 1e-4, b + 1e-4)); xs.sort((a, b) => a - b);
  return [...xs.map((x) => [x, h.top(x)]), ...xs.slice().reverse().map((x) => [x, h.bot(x)])];
}
