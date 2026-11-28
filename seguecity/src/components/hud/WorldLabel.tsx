import React from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';
import { backOut, clamp } from '../../utils/easing';

// Etiqueta de jogo presa a um ponto da cidade (x, y em px de tela), com haste.
export const WorldLabel: React.FC<{ x: number; y: number; title: string; sub?: string; icon?: string; a?: number; stem?: number; color?: string; align?: 'center' | 'left' | 'right' }> = ({ x, y, title, sub, icon, a = 1, stem = 70, color = C.yellow, align = 'center' }) => {
  if (a <= 0.001) return null;
  const s = backOut(clamp(a));
  const tx = align === 'center' ? '-50%' : align === 'left' ? '-12%' : '-88%';
  return (
    <div style={{ position: 'absolute', left: x, top: y - stem, transform: `translate(${tx}, -100%) scale(${0.6 + 0.4 * s})`, transformOrigin: 'bottom center', opacity: clamp(a * 2) }}>
      <PixelPanel u={4} edge={color}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, whiteSpace: 'nowrap' }}>
          {icon && <PixelIcon name={icon} px={5} />}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: 50, lineHeight: 0.9, color: C.white }}>{title}</span>
            {sub && <span style={{ fontFamily: F.hud, fontSize: 20, color, marginTop: 4 }}>{sub}</span>}
          </div>
        </div>
      </PixelPanel>
      <div style={{ position: 'absolute', left: align === 'center' ? '50%' : align === 'left' ? '12%' : '88%', bottom: -stem, width: 6, height: stem, marginLeft: -3, background: color, boxShadow: '3px 3px 0 rgba(0,0,0,0.5)', clipPath: `inset(0 0 ${(1 - s) * 100}% 0)` }} />
      <div style={{ position: 'absolute', left: align === 'center' ? '50%' : align === 'left' ? '12%' : '88%', bottom: -stem - 8, width: 14, height: 14, marginLeft: -7, background: color, boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }} />
    </div>
  );
};
