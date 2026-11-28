import React, { useLayoutEffect, useRef } from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { getWorld } from '../../engine/world';
import { WORLD_W, WORLD_H, sx, sy } from '../../engine/iso';
import { buildings } from '../../data';
import type { Cam } from '../../engine/renderer';

// Minimapa de jogo: o chão da cidade reduzido, lotes coloridos por tipo, área vista pela câmera e pontos de interesse.
const W = 220, H = 128;
const COLORS: Record<string, string> = { prefeitura: '#ffd84a', hospital: '#ff4a5a', escola: '#5a8af2', mercado: '#6bff8a', delegacia: '#7eaee0', obra: '#ffb12b', terminal: '#5af2ff', casa: '#e8a86a', loja: '#ff7aa8', apartamento: '#b8a6ff', escritorio: '#9aa3ad' };
let base: OffscreenCanvas | null = null;
function mapBase() {
  if (base) return base;
  const w = getWorld();
  const cv = new OffscreenCanvas(W, H), c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
  const k = W / (WORLD_W - 120);
  c.drawImage(w.ground.canvas, 60, w.OY - 10, WORLD_W - 120, 32 * 16 + 20, 0, 0, W, (32 * 16 + 20) * k);
  for (const b of buildings) {
    if (b.status === 'planejado') continue;
    const pts = [[b.posicao.i + 0.2, b.posicao.j + 0.2], [b.posicao.i + b.tamanho.w - 0.2, b.posicao.j + 0.2], [b.posicao.i + b.tamanho.w - 0.2, b.posicao.j + b.tamanho.d - 0.2], [b.posicao.i + 0.2, b.posicao.j + b.tamanho.d - 0.2]];
    c.fillStyle = COLORS[b.tipo] ?? '#cccccc';
    c.beginPath();
    pts.forEach(([i, j], q) => { const x = (sx(i, j) - 60) * k, y = (sy(i, j) - w.OY + 10) * k; if (q) c.lineTo(x, y); else c.moveTo(x, y); });
    c.closePath(); c.fill();
  }
  base = cv;
  void WORLD_H;
  return cv;
}

export const Minimap: React.FC<{ cam: Cam; a?: number; t: number; ping?: { i: number; j: number } | null; style?: React.CSSProperties }> = ({ cam, a = 1, t, ping, style }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const world = getWorld();
  useLayoutEffect(() => {
    if (!ref.current) return;
    const c = ref.current.getContext('2d')!;
    c.clearRect(0, 0, W, H);
    c.drawImage(mapBase(), 0, 0);
    const k = W / (WORLD_W - 120);
    const vx = (cam.x - 540 / cam.zoom - 60) * k, vy = (cam.y - 960 / cam.zoom - world.OY + 10) * k;
    c.strokeStyle = '#ffffff'; c.lineWidth = 2;
    c.strokeRect(Math.round(vx) + 0.5, Math.round(vy) + 0.5, Math.round((1080 / cam.zoom) * k), Math.round((1920 / cam.zoom) * k));
    if (ping) {
      const x = (sx(ping.i, ping.j) - 60) * k, y = (sy(ping.i, ping.j) - world.OY + 10) * k;
      const r = 3 + ((t * 2) % 1) * 9;
      c.strokeStyle = `rgba(255,216,74,${1 - ((t * 2) % 1)})`; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
      c.fillStyle = C.yellow; c.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
    }
  });
  if (a <= 0.01) return null;
  return (
    <div style={{ position: 'absolute', right: 36, top: 262, opacity: a, ...style }}>
      <PixelPanel u={4}>
        <div style={{ fontFamily: F.hud, fontSize: 16, color: C.dim, marginBottom: 6 }}>MAPA</div>
        <canvas ref={ref} width={W} height={H} style={{ display: 'block', imageRendering: 'pixelated' }} />
      </PixelPanel>
    </div>
  );
};
