import React from 'react';
import { clamp, easeInOut, easeOut } from '../../utils/easing';

// Cursor de jogo em pixel art que voa até pontos e "clica". path: pontos (t, x, y, click?) em px de tela.
export interface CursorKey { t: number; x: number; y: number; click?: boolean }
const ARROW = ['x.........', 'xx........', 'xox.......', 'xoox......', 'xooox.....', 'xoooox....', 'xooooox...', 'xoooooox..', 'xooooooox.', 'xooooxxxxx', 'xooxox....', 'xox.xox...', 'xx..xox...', 'x....xox..', '.....xx...'];

export function cursorAt(path: CursorKey[], t: number) {
  if (!path.length || t < path[0].t - 0.4) return null;
  let k = 0;
  while (k < path.length - 1 && path[k + 1].t <= t) k++;
  const a = path[k], b = path[k + 1];
  if (!b || t <= a.t) return { x: a.x, y: a.y, press: a.click ? clamp((t - a.t) / 0.12) * (1 - clamp((t - a.t - 0.12) / 0.15)) : 0, clickAge: a.click ? t - a.t : 99 };
  const u = easeInOut((t - a.t) / (b.t - a.t));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u - Math.sin(Math.PI * u) * 40, press: 0, clickAge: a.click ? t - a.t : 99 };
}

export const Cursor: React.FC<{ x: number; y: number; press?: number; clickAge?: number; a?: number; px?: number }> = ({ x, y, press = 0, clickAge = 99, a = 1, px = 6 }) => {
  if (a <= 0.01) return null;
  const ring = clickAge < 0.5 ? easeOut(clickAge / 0.5) : -1;
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity: a, pointerEvents: 'none' }}>
      {ring >= 0 && (
        <div style={{ position: 'absolute', left: -60 * ring, top: -30 * ring, width: 120 * ring, height: 60 * ring, border: `${px}px solid rgba(255,216,74,${1 - ring})`, borderRadius: '50%' }} />
      )}
      <svg width={10 * px} height={15 * px} viewBox="0 0 10 15" shapeRendering="crispEdges" style={{ position: 'absolute', left: 0, top: 0, transform: `scale(${1 - press * 0.15})`, transformOrigin: '0 0', filter: 'drop-shadow(4px 5px 0 rgba(0,0,0,0.55))' }}>
        {ARROW.flatMap((r, yy) => [...r].map((ch, xx) => (ch === '.' ? null : <rect key={`${xx}-${yy}`} x={xx} y={yy} width={1} height={1} fill={ch === 'x' ? '#0a0b1e' : '#ffffff'} />)))}
      </svg>
    </div>
  );
};
