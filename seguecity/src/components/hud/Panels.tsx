// Painéis do episódio: contador gigante, comentário de demonstração, carimbo, metas, fundadores, botões de CTA, selo de simulação.
import React from 'react';
import { C, F } from '../theme';
import { PixelPanel } from './PixelPanel';
import { PixelIcon } from './PixelIcon';
import { backOut, clamp, easeOut, smooth } from '../../utils/easing';

const appear = (a: number) => ({ opacity: clamp(a * 2.5), transform: `scale(${0.7 + 0.3 * backOut(clamp(a))})` });

export const BigCounter: React.FC<{ a: number; value: number; label: string; sub?: string; blink?: boolean; t: number; y?: number }> = ({ a, value, label, sub, blink, t, y = 470 }) => {
  if (a <= 0.001) return null;
  const on = !blink || Math.floor(t * 3) % 2 === 0;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', ...appear(a) }}>
      <PixelPanel u={6} edge={C.red}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '4px 10px' }}>
          <PixelIcon name="house" px={11} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.85 }}>
            <span style={{ fontFamily: F.hud, fontSize: 30, color: C.dim, letterSpacing: 2 }}>{label}</span>
            <span style={{ fontFamily: F.pixel, fontSize: 168, color: on ? C.red : '#7a2a34', textShadow: '0 8px 0 #000' }}>{value}</span>
            {sub && <span style={{ fontFamily: F.hud, fontSize: 24, color: C.white, marginTop: 6 }}>{sub}</span>}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

export const CommentCard: React.FC<{ a: number; out: number; typed: string; t: number; y?: number }> = ({ a, out, typed, t, y = 360 }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  const caret = Math.floor(t * 4) % 2 === 0 ? '▌' : ' ';
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: y, transform: `translateY(${(1 - easeOut(a)) * -80 - smooth(out) * 80}px)`, opacity: clamp(a * 2) * (1 - smooth(out)) }}>
      <PixelPanel u={5} edge={C.cyan} bg="rgba(16,18,46,0.94)">
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ width: 96, height: 96, background: '#2a2f6a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 0 0 5px ${C.cyan}` }}>
            <PixelIcon name="person" px={9} shadow={false} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: F.hud, fontSize: 22, color: C.dim }}>COMENTÁRIO</span>
              <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 22, color: C.ink, background: C.yellow, padding: '3px 10px' }}>EXEMPLO</span>
            </div>
            <span style={{ fontFamily: F.pixel, fontSize: 74, color: C.white, lineHeight: 0.95 }}>{typed}<span style={{ color: C.cyan }}>{caret}</span></span>
            <span style={{ fontFamily: F.hud, fontSize: 18, color: C.dim }}>demonstração · personagem fictício</span>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

export const Stamp: React.FC<{ a: number; text: string; sub?: string; y?: number; color?: string; rot?: number }> = ({ a, text, sub, y = 420, color = C.yellow, rot = -6 }) => {
  if (a <= 0.001) return null;
  const s = a < 1 ? 1.8 - 0.8 * easeOut(clamp(a / 0.6)) : 1;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: clamp(a * 4) }}>
      <div style={{ transform: `rotate(${rot}deg) scale(${s})`, border: `10px solid ${color}`, padding: '10px 34px', background: 'rgba(10,11,30,0.72)', boxShadow: '8px 8px 0 rgba(0,0,0,0.55)', textAlign: 'center' }}>
        <div style={{ fontFamily: F.pixel, fontSize: 112, color, lineHeight: 0.85 }}>{text}</div>
        {sub && <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 30, color: C.white, marginTop: 8, letterSpacing: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

export const SimTag: React.FC<{ a: number; text?: string }> = ({ a, text = 'PRÉVIA · SIMULAÇÃO DO FUTURO' }) => {
  if (a <= 0.001) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 372, display: 'flex', justifyContent: 'center', opacity: clamp(a) }}>
      <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 24, color: C.ink, background: C.cyan, padding: '6px 16px', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)', letterSpacing: 2 }}>{text}</div>
    </div>
  );
};

export const GrowthBar: React.FC<{ a: number; f: number; t: number }> = ({ a, f, t }) => {
  if (a <= 0.001) return null;
  const n = 24;
  const filled = Math.round(clamp(f) * n);
  return (
    <div style={{ position: 'absolute', left: 90, right: 90, top: 440, ...appear(a) }}>
      <PixelPanel u={4} edge={C.green}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <PixelIcon name="building" px={6} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 24, color: C.green, marginBottom: 8 }}>CIDADE CRESCENDO</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: n }, (_, k) => (
                <div key={k} style={{ flex: 1, height: 26, background: k < filled ? (k === filled - 1 && Math.floor(t * 8) % 2 ? '#d8ffe0' : C.green) : 'rgba(255,255,255,0.12)' }} />
              ))}
            </div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

export const FoundersPanel: React.FC<{ a: number; out: number; t: number }> = ({ a, out, t }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 380, opacity: clamp(a * 2) * (1 - smooth(out)), transform: `scale(${0.7 + 0.3 * backOut(clamp(a))})` }}>
      <PixelPanel u={5} edge={C.yellow}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <PixelIcon name="crown" px={8} />
            <span style={{ fontFamily: F.pixel, fontSize: 80, color: C.yellow, lineHeight: 0.9 }}>FUNDADORES</span>
            <PixelIcon name="crown" px={8} />
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            {Array.from({ length: 5 }, (_, k) => {
              const sh = Math.sin(t * 4 + k) > 0.6;
              return (
                <div key={k} style={{ width: 132, height: 150, background: 'rgba(255,216,74,0.08)', boxShadow: `inset 0 0 0 4px ${sh ? '#fff3a0' : C.yellow}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <PixelIcon name="lock" px={7} />
                  <span style={{ fontFamily: F.pixel, fontSize: 40, color: C.dim }}>???</span>
                </div>
              );
            })}
          </div>
          <span style={{ fontFamily: F.hud, fontSize: 22, color: C.white }}>OS PRIMEIROS MORADORES ENTRAM PARA A HISTÓRIA</span>
        </div>
      </PixelPanel>
    </div>
  );
};

export const GoalsPanel: React.FC<{ a: number; out: number; metas: { nome: string; alvo: number }[]; t: number; highlight?: number }> = ({ a, out, metas, t, highlight = -1 }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  const icons = ['person', 'crown', 'house', 'ballot'];
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: 380, opacity: clamp(a * 2) * (1 - smooth(out)), transform: `translateX(${(1 - easeOut(a)) * -200}px)` }}>
      <PixelPanel u={5} edge={C.cyan}>
        <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 26, color: C.cyan, marginBottom: 12, letterSpacing: 2 }}>METAS DA CIDADE</div>
        {metas.map((m, k) => {
          const hi = k === highlight && Math.floor(t * 4) % 2 === 0;
          const shown = clamp((a - k * 0.12) * 3);
          return (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: k ? 12 : 0, opacity: shown }}>
              <PixelIcon name={icons[k] ?? 'star'} px={5} />
              <span style={{ flex: 1, fontFamily: F.pixel, fontSize: 52, color: hi ? C.yellow : C.white, lineHeight: 0.95 }}>{m.nome}</span>
              <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 26, color: C.dim }}>0/{m.alvo}</span>
            </div>
          );
        })}
      </PixelPanel>
    </div>
  );
};

export const CtaButton: React.FC<{ a: number; icon: string; text: string; color: string; t: number; y: number }> = ({ a, icon, text, color, t, y }) => {
  if (a <= 0.001) return null;
  const s = backOut(clamp(a)) * (1 + 0.03 * Math.sin(t * 7));
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: clamp(a * 3) }}>
      <div style={{ transform: `scale(${s})`, display: 'flex', alignItems: 'center', gap: 22, background: color, padding: '18px 36px', boxShadow: `inset 0 -10px 0 rgba(0,0,0,0.25), inset 0 6px 0 rgba(255,255,255,0.35), 8px 10px 0 rgba(0,0,0,0.55)` }}>
        <PixelIcon name={icon} px={9} />
        <span style={{ fontFamily: F.pixel, fontSize: 84, color: C.ink, lineHeight: 0.9 }}>{text}</span>
      </div>
    </div>
  );
};
