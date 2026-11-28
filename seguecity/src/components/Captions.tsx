// Legendas dinâmicas: blocos curtos (até 2 linhas), palavras surgem quando faladas com um "pop",
// palavras-chave em amarelo, contorno escuro grosso e sombra em degrau.
import React from 'react';
import { C, F } from './theme';
import { backOut, clamp } from '../utils/easing';
import type { Word } from '../scenes/ep01/narration';

export interface Block { words: Word[]; a: number; b: number }

export function makeBlocks(words: Word[], maxChars = 17, maxWords = 4): Block[] {
  const out: Block[] = [];
  let cur: Word[] = [];
  const flush = () => { if (cur.length) out.push({ words: cur, a: cur[0].a - 0.06, b: cur[cur.length - 1].b }); cur = []; };
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    if (cur.length && cur[cur.length - 1].phrase !== w.phrase) flush();
    const len = cur.map((x) => x.text).join(' ').length + w.text.length + 1;
    if (cur.length && (len > maxChars * 2 || cur.length >= maxWords)) flush();
    cur.push(w);
    if (/[.,:…]$/.test(w.text) && cur.join('').length > 0 && cur.length >= 2) flush();
  }
  flush();
  // cada bloco fica até o próximo começar (no máx. 0,5 s após a última palavra)
  for (let k = 0; k < out.length; k++) out[k].b = Math.min(out[k + 1]?.a ?? Infinity, out[k].b + 0.5);
  return out;
}

export const Captions: React.FC<{ blocks: Block[]; t: number; y?: number; size?: number }> = ({ blocks, t, y = 1350, size = 108 }) => {
  const b = blocks.find((x) => t >= x.a && t < x.b);
  if (!b) return null;
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', lineHeight: 0.92, maxWidth: 940 }}>
        {b.words.map((w, k) => {
          const age = t - (w.a - 0.06);
          const on = age >= 0;
          const s = on ? 0.72 + 0.28 * backOut(clamp(age / 0.14), 2.2) : 1;
          return (
            <span key={k} style={{
              display: 'inline-block', transform: `scale(${s})`, transformOrigin: '50% 80%', margin: '0 0.12em',
              fontFamily: F.pixel, fontSize: size, color: on && w.key ? C.yellow : C.white, opacity: on ? 1 : 0.42,
              WebkitTextStroke: `${size * 0.11}px ${C.ink}`, paintOrder: 'stroke fill',
              textShadow: `0 ${size * 0.08}px 0 ${C.ink}`,
            }}>{w.text}</span>
          );
        })}
      </div>
    </div>
  );
};
