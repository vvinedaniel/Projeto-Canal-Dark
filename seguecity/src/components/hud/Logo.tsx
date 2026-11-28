import React from 'react';
import { C, F } from '../theme';
import { PixelIcon } from './PixelIcon';

export const Logo: React.FC<{ size?: number; style?: React.CSSProperties; icon?: boolean }> = ({ size = 56, style, icon = true }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.22, ...style }}>
    {icon && <PixelIcon name="house" px={Math.round(size / 8)} />}
    <div style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: size * 1.32, lineHeight: 0.8, letterSpacing: size * 0.03, color: C.white, textShadow: `0 ${size * 0.08}px 0 ${C.purpleDark}, ${size * 0.05}px ${size * 0.08}px 0 #000` }}>
      SEGUE<span style={{ color: C.yellow }}>CITY</span>
    </div>
  </div>
);
