// Pôster em alta resolução (2160x3840, 4K vertical) com o mesmo motor: renderer próprio no dobro do tamanho e
// câmera com o dobro do zoom, então o enquadramento é o mesmo do vídeo 1080x1920, com o dobro de pixels de tela.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { getWorld } from '../engine/world';
import { Renderer } from '../engine/renderer';
import { stage } from '../series/stage';
import type { SandboxProps } from './Sandbox';

const renderers = new Map<string, Renderer>();
export const Poster: React.FC<SandboxProps> = ({ i = 16, j = 16, z = 0, zoom = 1, night = 1, home = 1, traffic = 0, people = 0, dawn = 0, rain = 0, fog = 0, tilt = 0 }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const k = width / 1080;
  const ref = useRef<HTMLCanvasElement>(null);
  const S = stage({ t: f / fps, shots: [{ t: 0, i, j, z, zoom: zoom * k }], frameY: 0.5, drift: 0, night, people, traffic, levels: { home }, dawn, weather: { rain, fog }, tilt });
  useLayoutEffect(() => {
    const key = `${width}x${height}`;
    let r = renderers.get(key);
    if (!r) { r = new Renderer(getWorld(), width, height); renderers.set(key, r); }
    r.render(ref.current!.getContext('2d')!, S.params);
  });
  return (
    <AbsoluteFill style={{ background: '#000' }}>
      <canvas ref={ref} width={width} height={height} style={{ position: 'absolute', inset: 0 }} />
    </AbsoluteFill>
  );
};
