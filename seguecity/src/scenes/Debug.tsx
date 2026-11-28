import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { buildGround } from '../engine/ground';
import { WORLD_H, WORLD_W } from '../engine/iso';

let cache: OffscreenCanvas | null = null;
export const Debug: React.FC<{ x?: number; y?: number; zoom?: number }> = ({ x = WORLD_W / 2, y = WORLD_H / 2, zoom = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!cache) cache = buildGround([]).canvas;
    const ctx = ref.current!.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0b0f24';
    ctx.fillRect(0, 0, 1080, 1920);
    const w = 1080 / zoom, h = 1920 / zoom;
    ctx.drawImage(cache, x - w / 2, y - h / 2, w, h, 0, 0, 1080, 1920);
  }, [x, y, zoom]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
