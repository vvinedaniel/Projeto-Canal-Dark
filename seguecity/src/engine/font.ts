// Fonte bitmap 3x5 (largura variável) para placas dentro da cidade. Acentos em 2 linhas acima, cedilha abaixo.
const G: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'], C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'], E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'], I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'], K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'], N: ['#..#', '##.#', '#.##', '#..#', '#..#'], O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'], Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'], '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'], '4': ['#.#', '#.#', '###', '..#', '..#'], '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'], '7': ['###', '..#', '.#.', '.#.', '.#.'], '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'], ' ': ['..', '..', '..', '..', '..'], '.': ['.', '.', '.', '.', '#'],
  '-': ['...', '...', '###', '...', '...'], '+': ['...', '.#.', '###', '.#.', '...'], ':': ['.', '#', '.', '#', '.'],
  '!': ['#', '#', '#', '.', '#'], '?': ['##.', '..#', '.#.', '...', '.#.'], '/': ['..#', '..#', '.#.', '#..', '#..'],
  '♥': ['#.#.', '####', '####', '.##.', '..#.'].map((r) => r.slice(0, 4)),
};
const ACC: Record<string, [string, string]> = {
  'Á': ['A', 'acute'], 'À': ['A', 'grave'], 'Â': ['A', 'circ'], 'Ã': ['A', 'tilde'], 'É': ['E', 'acute'], 'Ê': ['E', 'circ'],
  'Í': ['I', 'acute'], 'Ó': ['O', 'acute'], 'Ô': ['O', 'circ'], 'Õ': ['O', 'tilde'], 'Ú': ['U', 'acute'], 'Ç': ['C', 'ced'],
};
const MARK: Record<string, string[]> = { acute: ['..#', '.#.'], grave: ['#..', '.#.'], circ: ['.#.', '#.#'], tilde: ['.##', '##.'] };

export interface TextMask { w: number; h: number; bits: Uint8Array; base: number; starts: Int16Array } // starts[col] = 1ª coluna da letra

// Máscara do texto: h = 8 linhas (0-1 acentos, 2-6 letra, 7 cedilha); base = 2.
export function textMask(text: string, spacing = 1): TextMask {
  const chars = [...text.toUpperCase()];
  const glyphs = chars.map((ch) => {
    const acc = ACC[ch];
    const g = G[acc ? acc[0] : ch] ?? G['?'];
    return { g, mark: acc?.[1] };
  });
  const w = glyphs.reduce((s, x) => s + x.g[0].length + spacing, 0) - spacing;
  const h = 8;
  const bits = new Uint8Array(Math.max(1, w * h));
  const starts = new Int16Array(Math.max(1, w + 1));
  let x = 0;
  for (const { g, mark } of glyphs) {
    const gw = g[0].length;
    for (let c = 0; c < gw + spacing && x + c < starts.length; c++) starts[x + c] = x;
    for (let r = 0; r < 5; r++) for (let c = 0; c < gw; c++) if (g[r][c] === '#') bits[(r + 2) * w + x + c] = 1;
    if (mark === 'ced') bits[7 * w + x + 1] = 1;
    else if (mark) {
      const m = MARK[mark];
      const off = Math.floor((gw - 3) / 2);
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) if (m[r][c] === '#') bits[r * w + x + c + off] = 1;
    }
    x += gw + spacing;
  }
  return { w, h, bits, base: 2, starts };
}

export const maskAt = (m: TextMask, x: number, y: number) => (x >= 0 && y >= 0 && x < m.w && y < m.h ? m.bits[y * m.w + x] : 0);
