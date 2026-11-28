import React, { useLayoutEffect, useRef } from 'react';
import { getWorld } from '../engine/world';
import { Renderer, type FrameParams } from '../engine/renderer';

let renderer: Renderer | null = null;
export const getRenderer = () => (renderer ??= new Renderer(getWorld()));

// Canvas 1080x1920 que desenha a cidade para os parâmetros do quadro atual (função pura do tempo).
export const CityCanvas: React.FC<{ params: FrameParams }> = ({ params }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    getRenderer().render(ctx, params);
  });
  return <canvas ref={ref} width={1080} height={1920} style={{ position: 'absolute', inset: 0 }} />;
};
