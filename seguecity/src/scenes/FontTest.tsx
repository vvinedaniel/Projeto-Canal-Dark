import React from 'react';
import { AbsoluteFill } from 'remotion';
import { useFonts } from '../hooks/useFonts';

const S = 'SEGUECITY CIDADE · Ninguém mora na SegueCity · PROFISSÃO · ação';
export const FontTest: React.FC = () => {
  useFonts();
  const row = (family: string, weight: number, size: number) => (
    <div style={{ fontFamily: family, fontWeight: weight, fontSize: size, color: 'white', WebkitTextStroke: '8px #000', paintOrder: 'stroke fill', marginBottom: 24 }}>{family} {weight}: {S}</div>
  );
  return (
    <AbsoluteFill style={{ background: '#335', padding: 30 }}>
      {row('Pixelify', 400, 64)}
      {row('Jersey', 400, 84)}
      {row('Tiny5', 400, 60)}
      {row('Silkscreen', 700, 52)}
    </AbsoluteFill>
  );
};
