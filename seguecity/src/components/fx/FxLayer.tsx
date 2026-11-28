import React, { useLayoutEffect, useRef } from 'react';

// Camada de efeitos em baixa resolução (270x480, cada pixel = 4 px na saída), para manter o visual pixel art.
export const FX_SCALE = 4;
export const FxLayer: React.FC<{ draw: (ctx: CanvasRenderingContext2D) => void; blend?: 'screen' | 'normal' }> = ({ draw, blend = 'normal' }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    ctx.clearRect(0, 0, 270, 480);
    ctx.imageSmoothingEnabled = false;
    draw(ctx);
  });
  return <canvas ref={ref} width={270} height={480} style={{ position: 'absolute', inset: 0, width: 1080, height: 1920, imageRendering: 'pixelated', mixBlendMode: blend }} />;
};
