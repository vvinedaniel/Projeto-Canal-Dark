import React from 'react';
import { C } from '../theme';

// Painel estilo jogo: cantos em degrau, borda clara de 4px com sombra interna.
export const PixelPanel: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; edge?: string; bg?: string; u?: number }> = ({ children, style, edge = C.edge, bg = C.panel, u = 5 }) => {
  const step = `polygon(0 ${u * 2}px, ${u}px ${u * 2}px, ${u}px ${u}px, ${u * 2}px ${u}px, ${u * 2}px 0, calc(100% - ${u * 2}px) 0, calc(100% - ${u * 2}px) ${u}px, calc(100% - ${u}px) ${u}px, calc(100% - ${u}px) ${u * 2}px, 100% ${u * 2}px, 100% calc(100% - ${u * 2}px), calc(100% - ${u}px) calc(100% - ${u * 2}px), calc(100% - ${u}px) calc(100% - ${u}px), calc(100% - ${u * 2}px) calc(100% - ${u}px), calc(100% - ${u * 2}px) 100%, ${u * 2}px 100%, ${u * 2}px calc(100% - ${u}px), ${u}px calc(100% - ${u}px), ${u}px calc(100% - ${u * 2}px), 0 calc(100% - ${u * 2}px))`;
  return (
    <div style={{ position: 'relative', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.45))', ...style }}>
      <div style={{ clipPath: step, background: edge, padding: u }}>
        <div style={{ clipPath: step, background: bg, boxShadow: `inset 0 ${u}px 0 rgba(255,255,255,0.12), inset 0 -${u}px 0 rgba(0,0,0,0.35)`, padding: `${u * 2}px ${u * 3}px` }}>
          {children}
        </div>
      </div>
    </div>
  );
};
