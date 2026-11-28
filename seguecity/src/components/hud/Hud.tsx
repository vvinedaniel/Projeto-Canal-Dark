import React from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';
import { Logo } from './Logo';
import { backOut, clamp } from '../../utils/easing';

export interface HudProps {
  moradores: number;
  empregos: number;
  dia?: number;
  hora?: string;
  show?: number; // 0..1 entrada
  pulseMoradores?: number; // 0..1 destaque no contador
  warnMoradores?: boolean;
  label?: string; // rótulo do segundo contador
}

export const Counter: React.FC<{ icon: string; label: string; value: React.ReactNode; color?: string; pulse?: number; warn?: boolean }> = ({ icon, label, value, color = C.white, pulse = 0, warn }) => (
  <PixelPanel u={4} edge={warn ? C.red : C.edge} style={{ transform: `scale(${1 + pulse * 0.12})`, transformOrigin: 'center' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <PixelIcon name={icon} px={5} />
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{ fontFamily: F.hud, fontSize: 18, color: C.dim, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 36, color: warn ? C.red : color, marginTop: 4 }}>{value}</span>
      </div>
    </div>
  </PixelPanel>
);

export const Hud: React.FC<HudProps> = ({ moradores, empregos, dia = 1, hora = '21:40', show = 1, pulseMoradores = 0, warnMoradores, label = 'VAGAS' }) => {
  const s = backOut(show);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 150, height: 200, pointerEvents: 'none', opacity: clamp(show * 2) }}>
      <div style={{ position: 'absolute', left: 36, top: 14, transform: `translateY(${(1 - s) * -60}px)` }}>
        <Logo size={50} />
        <div style={{ marginTop: 12, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 10, fontFamily: F.hud, fontSize: 20, color: C.dim }}>
          <PixelIcon name="moon" px={3} />
          <span>DIA {String(dia).padStart(2, '0')} · {hora}</span>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 36, top: 0, display: 'flex', gap: 14, transform: `translateY(${(1 - s) * -60}px)` }}>
        <Counter icon="person" label="MORADORES" value={moradores} pulse={pulseMoradores} warn={warnMoradores} />
        <Counter icon="job" label={label} value={empregos} color={C.yellow} />
      </div>
    </div>
  );
};
