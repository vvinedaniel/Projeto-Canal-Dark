// Peças de interface do Ep. 01: menu de profissões (com retratos), painel de número e a vaga do 1º morador.
import React, { useLayoutEffect, useRef } from 'react';
import { C, F } from '../../components/theme';
import { PixelPanel } from '../../components/hud/PixelPanel';
import { PixelIcon } from '../../components/hud/PixelIcon';
import { portraitCanvas, PORTRAIT_W, PORTRAIT_H } from '../../engine/sprites/portrait';
import type { Appearance } from '../../engine/characters';
import { backOut, clamp, easeOut, smooth } from '../../utils/easing';

const Portrait: React.FC<{ app: Appearance; id: string; px: number; t: number }> = ({ app, id, px, t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const blink = Math.floor(t * 10 + id.length * 7) % 41 === 0;
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
    c.drawImage(portraitCanvas(app, id, blink), 0, 0);
  });
  return <canvas ref={ref} width={PORTRAIT_W} height={PORTRAIT_H} style={{ width: PORTRAIT_W * px, height: PORTRAIT_H * px, imageRendering: 'pixelated', display: 'block' }} />;
};

export interface JobCard { at: number; nome: string; app: Appearance; id: string; color: string; icon: string }

// "ESCOLHA SUA PROFISSÃO": cada carta entra quando a profissão é falada; a da vez fica maior e acesa.
export const JobPicker: React.FC<{ cards: JobCard[]; t: number; a: number; out: number; y?: number }> = ({ cards, t, a, out, y = 390 }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  const cur = cards.reduce((k, c, i) => (t >= c.at - 0.05 ? i : k), -1);
  return (
    <div style={{ position: 'absolute', left: 36, right: 36, top: y, opacity: clamp(a * 2.5) * (1 - smooth(out)), transform: `translateY(${(1 - easeOut(clamp(a))) * -50}px)` }}>
      <PixelPanel u={5} edge={C.cyan} bg="rgba(12,14,40,0.9)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <span style={{ fontFamily: F.pixel, fontSize: 66, color: C.white, lineHeight: 0.9 }}>ESCOLHA SUA <span style={{ color: C.yellow }}>PROFISSÃO</span></span>
          <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 20, color: C.ink, background: C.yellow, padding: '4px 10px' }}>EXEMPLOS</span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {cards.map((c, k) => {
            const age = t - c.at;
            const shown = clamp((age + 0.12) / 0.22);
            const on = k === cur;
            const s = shown <= 0 ? 0.6 : 0.6 + 0.4 * backOut(shown, 2.4) + (on ? 0.06 : 0);
            return (
              <div key={c.id} style={{ width: 176, opacity: shown <= 0 ? 0.18 : 1, transform: `scale(${s}) translateY(${on ? -8 : 0}px)`, transformOrigin: '50% 80%' }}>
                <div style={{ background: shown > 0 ? 'linear-gradient(#2a2f6a, #191c46)' : '#141634', boxShadow: `inset 0 0 0 5px ${on ? c.color : shown > 0 ? '#3b3f86' : '#24275a'}`, padding: '10px 0 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {shown > 0 ? <Portrait app={c.app} id={c.id} px={3.5} t={t} /> : <div style={{ width: 140, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.pixel, fontSize: 90, color: '#3b3f86' }}>?</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <PixelIcon name={c.icon} px={3} />
                  </div>
                </div>
                <div style={{ fontFamily: F.pixel, fontSize: 36, color: on ? c.color : C.white, textAlign: 'center', marginTop: 6, lineHeight: 0.9, opacity: shown > 0 ? 1 : 0.3 }}>{c.nome}</div>
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
};

// número grande com ícone (ex.: 48 VAGAS DE EMPREGO), sempre a partir de data/*.json
export const StatPanel: React.FC<{ a: number; out: number; icon: string; value: string; label: string; sub?: string; color: string; y?: number }> = ({ a, out, icon, value, label, sub, color, y = 400 }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: clamp(a * 2.5) * (1 - smooth(out)), transform: `scale(${0.7 + 0.3 * backOut(clamp(a))})` }}>
      <PixelPanel u={6} edge={color}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '4px 12px' }}>
          <PixelIcon name={icon} px={11} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.85 }}>
            <span style={{ fontFamily: F.pixel, fontSize: 150, color, textShadow: '0 8px 0 #000' }}>{value}</span>
            <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 28, color: C.white, letterSpacing: 1 }}>{label}</span>
            {sub && <span style={{ fontFamily: F.hud, fontSize: 22, color: C.dim, marginTop: 6 }}>{sub}</span>}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

// a vaga do 1º morador: retrato vazio com "?" (ninguém ainda — é o convite)
export const SlotCard: React.FC<{ a: number; out?: number; t: number; y?: number }> = ({ a, out = 0, t, y = 390 }) => {
  if (a <= 0.001 || out >= 0.999) return null;
  const glow = 0.6 + 0.4 * Math.sin(t * 5);
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: y, opacity: clamp(a * 2.5) * (1 - smooth(out)), transform: `scale(${0.8 + 0.2 * backOut(clamp(a))})` }}>
      <PixelPanel u={5} edge={C.yellow} bg="rgba(14,16,44,0.94)">
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <div style={{ width: 170, height: 204, background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 6px ${C.yellow}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.pixel, fontSize: 190, color: C.cyan, opacity: 0.55 + 0.45 * glow, textShadow: `0 0 ${18 * glow}px ${C.cyan}` }}>?</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 26, color: C.yellow, letterSpacing: 2 }}>MORADOR Nº 1</span>
            <span style={{ fontFamily: F.pixel, fontSize: 84, color: C.white, lineHeight: 0.85 }}>SEU NOME</span>
            <span style={{ fontFamily: F.pixel, fontSize: 56, color: C.cyan, lineHeight: 0.85 }}>SUA PROFISSÃO</span>
            <span style={{ fontFamily: F.hud, fontSize: 20, color: C.dim }}>VAGA ABERTA · DIA 01</span>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};
