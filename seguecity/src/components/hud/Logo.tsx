import React from 'react';
import { C, F } from '../theme';
import { PixelIcon } from './PixelIcon';
import { Img } from 'remotion';
import { asset } from '../../utils/audio';

// Marca: usa a logo oficial (public/brand/logo.png) se existir; senão, a versão desenhada por código.
export const Logo: React.FC<{ size?: number; style?: React.CSSProperties; icon?: boolean }> = ({ size = 56, style, icon = true }) => {
  const official = asset('brand/logo.png');
  if (official) return <Img src={official} style={{ height: size * 1.25, imageRendering: 'pixelated', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,0.5))', ...style }} />;
  return <LogoDesenhada size={size} style={style} icon={icon} />;
};
const LogoDesenhada: React.FC<{ size: number; style?: React.CSSProperties; icon: boolean }> = ({ size, style, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.22, ...style }}>
    {icon && <PixelIcon name="house" px={Math.round(size / 8)} />}
    <div style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: size * 1.32, lineHeight: 0.8, letterSpacing: size * 0.03, color: C.white, textShadow: `0 ${size * 0.08}px 0 ${C.purpleDark}, ${size * 0.05}px ${size * 0.08}px 0 #000` }}>
      SEGUE<span style={{ color: C.yellow }}>CITY</span>
    </div>
  </div>
);
