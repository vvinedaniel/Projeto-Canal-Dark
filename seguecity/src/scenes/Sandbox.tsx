import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../components/CityCanvas';
import { stage } from '../series/stage';
import { SimTag } from '../components/hud/Panels';
import { useFonts } from '../hooks/useFonts';

// Composição de teste: câmera fixa por props (i, j, z, zoom) e estados de luz/clima.
export interface SandboxProps { i?: number; j?: number; z?: number; zoom?: number; night?: number; home?: number; traffic?: number; people?: number; dawn?: number; rain?: number; fog?: number; tilt?: number; tag?: string }
export const Sandbox: React.FC<SandboxProps> = ({ i = 16, j = 16, z = 0, zoom = 1, night = 1, home = 1, traffic = 1, people = 1, dawn = 0, rain = 0, fog = 0, tilt = 0, tag }) => {
  useFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const S = stage({ t, shots: [{ t: 0, i, j, z, zoom }], frameY: 0.5, drift: 0, night, people, traffic, levels: { home }, dawn, weather: { rain, fog }, tilt });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <CityCanvas params={S.params} />
      {tag ? <SimTag a={1} text={tag} /> : null}
    </AbsoluteFill>
  );
};

// Revisão de ortografia das placas: um prédio com letreiro por quadro, de dia, de perto (npm run check:signs:img).
export const SIGN_TOUR: [string, number, number, number, number][] = [
  ['prefeitura', 12.5, 8.6, 14, 6], ['escola', 6.5, 7, 10, 6], ['hospital', 18, 8.6, 14, 5], ['mercado', 19.2, 12.6, 8, 6.5],
  ['padaria', 17, 16.8, 8, 7], ['farmacia', 19, 16.8, 8, 7], ['escritorio-1', 7.5, 13.8, 34, 5.5], ['delegacia', 5.5, 23.7, 12, 6.5],
  ['oficina', 8.6, 22.5, 8, 7], ['sorveteria', 11.5, 20.8, 8, 7], ['cafe', 14, 20.8, 8, 7], ['terminal', 11.4, 22.6, 10, 6.5], ['obra', 28, 9.5, 8, 5],
];
export const SignTour: React.FC<{ night?: number }> = ({ night = 0 }) => {
  useFonts();
  const f = useCurrentFrame();
  const [id, i, j, z, zoom] = SIGN_TOUR[Math.min(f, SIGN_TOUR.length - 1)];
  const S = stage({ t: 2, shots: [{ t: 0, i, j, z, zoom }], frameY: 0.5, drift: 0, night, people: 0, traffic: 0, levels: { home: 1 } });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <CityCanvas params={S.params} />
      <SimTag a={1} text={id.toUpperCase()} />
    </AbsoluteFill>
  );
};
