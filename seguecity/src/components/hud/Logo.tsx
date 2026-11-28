import React from 'react';
import { C, F } from '../theme';
import { PixelIcon } from './PixelIcon';
import { Img } from 'remotion';
import { asset } from '../../utils/audio';

// Marca oficial da SegueCity.
// - variant "emblema": a logo oficial inteira (public/brand/logo.png, fundo transparente, gerado por
//   scripts/brand-logo.py a partir do arquivo recebido) com brilho neon ciano. Usada em cartelas de abertura e
//   de fecho. `size` vezes 6 dá a largura em px (size 112 → 672 px).
// - variant "marca": só o nome SEGUECITY nas cores da logo oficial (SEGUE branco, CITY dourado). Usada na HUD,
//   onde o emblema inteiro ficaria pequeno demais para ler.
// Sem o arquivo da logo, o emblema cai na marca desenhada por código.
export const Logo: React.FC<{ size?: number; style?: React.CSSProperties; icon?: boolean; variant?: 'emblema' | 'marca' }> = ({ size = 56, style, icon = true, variant = 'emblema' }) => {
  const official = variant === 'emblema' ? asset('brand/logo.png') : null;
  if (official)
    return (
      <Img
        src={official}
        style={{
          width: size * 6, height: 'auto', display: 'block',
          filter: 'drop-shadow(0 0 6px rgba(90,242,255,0.75)) drop-shadow(0 0 22px rgba(90,242,255,0.35)) drop-shadow(0 10px 0 rgba(0,0,0,0.45))',
          ...style,
        }}
      />
    );
  return <Marca size={size} style={style} icon={icon} />;
};

// "SEGUE" branco com sombra azulada e "CITY" dourado (amarelo → laranja), contorno azul-marinho, como na logo.
const Marca: React.FC<{ size: number; style?: React.CSSProperties; icon: boolean }> = ({ size, style, icon }) => {
  const fs = size * 1.32;
  const ink = '#0b1638';
  const word = (text: string, top: string, bottom: string): React.ReactNode => (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {/* contorno e sombra por baixo */}
      <span style={{ position: 'absolute', inset: 0, color: ink, WebkitTextStroke: `${size * 0.16}px ${ink}`, textShadow: `0 ${size * 0.1}px 0 ${ink}` }}>{text}</span>
      <span style={{ position: 'relative', background: `linear-gradient(${top} 0%, ${top} 45%, ${bottom} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{text}</span>
    </span>
  );
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.22, ...style }}>
      {icon && <PixelIcon name="house" px={Math.round(size / 8)} />}
      <div style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: fs, lineHeight: 0.8, letterSpacing: size * 0.03 }}>
        {word('SEGUE', '#ffffff', '#b9c6e4')}
        {word('CITY', C.yellow, '#ff9a1f')}
      </div>
    </div>
  );
};
