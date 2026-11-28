import React, { useLayoutEffect, useRef } from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { portraitCanvas, PORTRAIT_W, PORTRAIT_H } from '../../engine/sprites/portrait';
import { backOut, clamp, easeOut, smooth } from '../../utils/easing';
import type { Appearance } from '../../engine/characters';

// Ficha de morador com retrato em pixel art (close cinematográfico do personagem).
export const CharacterCard: React.FC<{
  a: number; out?: number; t: number; app: Appearance; id: string; nome: string; profissao: string;
  linhas?: string[]; exemplo?: boolean; y?: number; px?: number;
}> = ({ a, out = 0, t, app, id, nome, profissao, linhas = [], exemplo, y = 370, px = 6 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const blink = Math.floor(t * 10) % 37 === 0;
  useLayoutEffect(() => {
    if (!ref.current) return;
    const c = ref.current.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
    c.drawImage(portraitCanvas(app, id, blink), 0, 0);
  });
  if (a <= 0.001 || out >= 0.999) return null;
  const s = backOut(clamp(a));
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, opacity: clamp(a * 2.5) * (1 - smooth(out)), transform: `translateY(${(1 - easeOut(clamp(a))) * -60 - smooth(out) * 60}px) scale(${0.85 + 0.15 * s})`, transformOrigin: 'top center' }}>
      <PixelPanel u={5} edge={exemplo ? C.yellow : C.cyan} bg="rgba(14,16,44,0.94)">
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <div style={{ width: PORTRAIT_W * px, height: PORTRAIT_H * px, background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 6px ${exemplo ? C.yellow : C.cyan}`, position: 'relative', overflow: 'hidden' }}>
            <canvas ref={ref} width={PORTRAIT_W} height={PORTRAIT_H} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {exemplo && <span style={{ alignSelf: 'flex-start', fontFamily: F.hud, fontWeight: 700, fontSize: 22, color: C.ink, background: C.yellow, padding: '4px 10px' }}>EXEMPLO</span>}
            <span style={{ fontFamily: F.pixel, fontSize: 96, color: C.white, lineHeight: 0.85 }}>{nome}</span>
            <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 28, color: exemplo ? C.yellow : C.cyan }}>{profissao.toUpperCase()}</span>
            {linhas.map((l, k) => <span key={k} style={{ fontFamily: F.hud, fontSize: 20, color: C.dim }}>{l}</span>)}
            {exemplo && <span style={{ fontFamily: F.hud, fontSize: 18, color: C.dim, marginTop: 4 }}>personagem fictício de demonstração</span>}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};
