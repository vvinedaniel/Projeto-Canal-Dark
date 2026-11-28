// "Nº 1" desenhado à mão: as fontes pixel não têm o "º" (Jersey 10 cai em "o" → "No 1"; Silkscreen mostra um
// asterisco). N + "o" pequeno, sobrescrito e sublinhado, igual em qualquer fonte.
import React from 'react';

export const Numero: React.FC<{ n: number | string; style?: React.CSSProperties }> = ({ n, style }) => (
  <span style={{ whiteSpace: 'nowrap', ...style }}>
    N<span style={{ fontSize: '0.5em', position: 'relative', top: '-0.75em', marginLeft: '0.04em', borderBottom: '0.12em solid currentColor', lineHeight: 1, display: 'inline-block' }}>o</span> {n}
  </span>
);
