import React from 'react';

// Ícones em pixel art definidos por grades de caracteres. Cada letra é uma cor da paleta do ícone.
const ICONS: Record<string, { rows: string[]; pal: Record<string, string> }> = {
  person: { rows: ['..aaa..', '..aaa..', '...a...', '.bbbbb.', 'b.bbb.b', '..bbb..', '..c.c..', '..c.c..'], pal: { a: '#ffd9b0', b: '#5af2ff', c: '#8fa0ff' } },
  job: { rows: ['..aaa..', '..a.a..', 'bbbbbbb', 'b.....b', 'bbbcbbb', 'b.....b', 'bbbbbbb'], pal: { a: '#c48a4a', b: '#e8a84a', c: '#ffd84a' } },
  house: { rows: ['...a...', '..aaa..', '.aaaaa.', 'aaaaaaa', '.bbbbb.', '.bcbdb.', '.bcbbb.'], pal: { a: '#ff6a5a', b: '#f2e6cf', c: '#6a4a3a', d: '#5af2ff' } },
  heart: { rows: ['.aa.aa.', 'abaaaaa', 'aaaaaaa', '.aaaaa.', '..aaa..', '...a...'], pal: { a: '#ff4a6a', b: '#ffc0cc' } },
  star: { rows: ['...a...', '...a...', 'aaabaaa', '.aabaa.', '..aaa..', '.aa.aa.', 'a.....a'], pal: { a: '#ffd84a', b: '#fff6b0' } },
  plus: { rows: ['..a..', '..a..', 'aaaaa', '..a..', '..a..'], pal: { a: '#6bff8a' } },
  book: { rows: ['aaa.aaa', 'abaaaba', 'abaaaba', 'abaaaba', 'aaaaaaa', '.ccccc.'], pal: { a: '#5a8af2', b: '#ffffff', c: '#2a3a8a' } },
  scroll: { rows: ['aaaaaa.', 'abbbbba', 'ab.b.ba', 'abbbbba', 'ab.bb.a', 'abbbbba', '.aaaaaa'], pal: { a: '#c4a46a', b: '#f6e6c0' } },
  moon: { rows: ['..aaa..', '.aa....', 'aa.....', 'aa.....', 'aa.....', '.aa....', '..aaa..'], pal: { a: '#ffe9a8' } },
  cross: { rows: ['..aaa..', '..aaa..', 'aaaaaaa', 'aaaaaaa', 'aaaaaaa', '..aaa..', '..aaa..'], pal: { a: '#ff4a5a' } },
  bus: { rows: ['aaaaaaa', 'abbabba', 'abbabba', 'aaaaaaa', 'acaaaca', '.d...d.'], pal: { a: '#3c69c0', b: '#bfe4ff', c: '#ffd84a', d: '#1a1a22' } },
  cart: { rows: ['a......', '.aaaaaa', '.abbbba', '.abbba.', '.aaaaa.', '..c..c.'], pal: { a: '#cfd6e6', b: '#6bff8a', c: '#1a1a22' } },
  badge: { rows: ['.a...a.', 'aabbbaa', '.abcba.', '.abbba.', '..aba..', '...a...'], pal: { a: '#ffd84a', b: '#3c67a8', c: '#ffffff' } },
  wrench: { rows: ['a.a....', 'aaa....', '.aa....', '..aa...', '...aa..', '....aa.', '.....aa'], pal: { a: '#cfd6e6' } },
  helmet: { rows: ['..aaa..', '.aabaa.', 'aaabaaa', 'aaaaaaa', 'ccccccc'], pal: { a: '#ffc230', b: '#fff0a0', c: '#c48a20' } },
  crown: { rows: ['a..a..a', 'aa.a.aa', 'aaaaaaa', 'abaaaba', 'aaaaaaa'], pal: { a: '#ffd84a', b: '#ff4a6a' } },
  ballot: { rows: ['..aaa..', '..aba..', 'ccccccc', 'cdddddc', 'cdddddc', 'ccccccc'], pal: { a: '#ffffff', b: '#5af2ff', c: '#7a4ee0', d: '#3b2475' } },
  comment: { rows: ['aaaaaaa', 'abbbbba', 'ab.b.ba', 'abbbbba', 'aaaaaaa', '.a.....'], pal: { a: '#ffffff', b: '#5af2ff' } },
  follow: { rows: ['..aa....', '..aa..b.', '.aaaa.bbb', 'aaaaa..b.', 'aa..a....'], pal: { a: '#ffffff', b: '#6bff8a' } },
  building: { rows: ['.aaaaa.', '.abab a', '.aaaaa.', '.ababa.', '.aaaaa.', '.ababa.', '.aacaa.'].map((r) => r.replace(' ', 'a')), pal: { a: '#8fa0d8', b: '#ffd84a', c: '#5a3a2a' } },
  pin: { rows: ['.aaa.', 'aabaa', 'aaaaa', '.aaa.', '..a..'], pal: { a: '#ff4a6a', b: '#ffffff' } },
  sparkle: { rows: ['...a...', '...a...', '..aba..', 'aabbbaa', '..aba..', '...a...', '...a...'], pal: { a: '#5af2ff', b: '#ffffff' } },
  lock: { rows: ['.aaa.', 'a...a', 'a...a', 'bbbbb', 'bbcbb', 'bbbbb'], pal: { a: '#cfd6e6', b: '#ffd84a', c: '#7a4a10' } },
  car: { rows: ['..aaaa..', '.abbbba.', 'aaaaaaaa', 'acaaaaca', '.d....d.'], pal: { a: '#ff6a5a', b: '#bfe4ff', c: '#ffd84a', d: '#1a1a22' } },
  shovel: { rows: ['...a', '..a.', '.a..', 'bb..', 'bbb.', '.b..'].map((r) => r.padEnd(4, '.')), pal: { a: '#c48a4a', b: '#cfd6e6' } },
  scales: { rows: ['...a...', 'aaaaaaa', 'b..a..b', 'bb.a.bb', '...a...', '.aaaaa.'], pal: { a: '#ffd84a', b: '#cfd6e6' } },
  search: { rows: ['.aaa...', 'a...a..', 'a...a..', 'a...a..', '.aaab..', '....bb.', '.....bb'], pal: { a: '#cfd6e6', b: '#c48a4a' } },
  flag: { rows: ['abbbb..', 'abbbbb.', 'abbbb..', 'a......', 'a......', 'a......'], pal: { a: '#cfd6e6', b: '#5af2ff' } },
  chef: { rows: ['.aaaaa.', 'aaaaaaa', '.aaaaa.', '.bbbbb.'], pal: { a: '#ffffff', b: '#cfd6e6' } },
};

export const PixelIcon: React.FC<{ name: keyof typeof ICONS | string; px?: number; style?: React.CSSProperties; shadow?: boolean }> = ({ name, px = 6, style, shadow = true }) => {
  const ic = ICONS[name] ?? ICONS.star;
  const w = Math.max(...ic.rows.map((r) => r.length)), h = ic.rows.length;
  const rects: React.ReactNode[] = [];
  ic.rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const c = ic.pal[ch];
    if (c) {
      if (shadow) rects.push(<rect key={`s${x}-${y}`} x={x + 1} y={y + 1} width={1} height={1} fill="rgba(0,0,0,0.55)" />);
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={c} />);
    }
  }));
  // sombras atrás das cores
  const shadows = rects.filter((_, k) => k % 2 === 0 && shadow);
  const colors = shadow ? rects.filter((_, k) => k % 2 === 1) : rects;
  return (
    <svg width={(w + 1) * px} height={(h + 1) * px} viewBox={`0 0 ${w + 1} ${h + 1}`} shapeRendering="crispEdges" style={{ display: 'block', ...style }}>
      {shadows}
      {colors}
    </svg>
  );
};
