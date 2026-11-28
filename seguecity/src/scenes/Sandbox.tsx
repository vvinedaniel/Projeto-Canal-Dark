import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../components/CityCanvas';
import { sx, sy } from '../engine/iso';
import { dynamics } from '../engine/dynamics';
import { getWorld } from '../engine/world';

// Composição de teste: câmera fixa por props.
export const Sandbox: React.FC<{ i?: number; j?: number; z?: number; zoom?: number; night?: number; home?: number; traffic?: number; people?: number }> = ({ i = 16, j = 16, z = 0, zoom = 1, night = 1, home = 1, traffic = 1, people = 1 }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const d = dynamics(getWorld(), { t, traffic, people });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <CityCanvas params={{ t, cam: { x: sx(i, j), y: sy(i, j, z), zoom }, night, levels: { civic: 1, home, shop: 1, street: 1 }, dyn: d.objs, refl: d.refl }} />
    </AbsoluteFill>
  );
};
