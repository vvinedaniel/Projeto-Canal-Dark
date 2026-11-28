import React from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';
import { backOut, clamp, smooth } from '../../utils/easing';

// Notificação de jogo que entra deslizando. a: 0..1 (entrada) e some com out (0..1).
export const Toast: React.FC<{ icon: string; text: React.ReactNode; sub?: string; a: number; out?: number; color?: string; style?: React.CSSProperties; big?: boolean }> = ({ icon, text, sub, a, out = 0, color = C.green, style, big }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  const s = backOut(clamp(a));
  const o = smooth(out);
  return (
    <div style={{ transform: `translateX(${(1 - s) * -420 + o * -420}px)`, opacity: clamp(a * 3) * (1 - o), ...style }}>
      <PixelPanel u={4} edge={color} bg={C.panel2}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <PixelIcon name={icon} px={big ? 8 : 6} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
            <span style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: big ? 76 : 60, lineHeight: 0.9, color }}>{text}</span>
            {sub && <span style={{ fontFamily: F.hud, fontSize: 22, color: C.dim, marginTop: 6 }}>{sub}</span>}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};
