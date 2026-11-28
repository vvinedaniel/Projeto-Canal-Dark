// Ficha visual dos 10 moradores fundadores (para aprovação e para os episódios): retrato em pixel art,
// sprite da cidade, nome, profissão exatamente como foi comentada, casa, trabalho e o distintivo dourado.
// Personagens originais e fictícios na aparência; nome e profissão vêm dos comentários reais (data/residents.json).
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../../components/theme';
import { PixelPanel } from '../../components/hud/PixelPanel';
import { PixelIcon } from '../../components/hud/PixelIcon';
import { Numero } from '../../components/hud/Numero';
import { portraitCanvas, PORTRAIT_W, PORTRAIT_H } from '../../engine/sprites/portrait';
import { personSprite, lookOf } from '../../engine/sprites/people';
import { useFonts } from '../../hooks/useFonts';
import type { Resident } from '../../data';
import { FUNDADORES, casaNumero, nomeTrabalho } from './cidade';
import { buildings } from '../../data';

export const Retrato: React.FC<{ r: Resident; px: number; t: number }> = ({ r, px, t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const blink = Math.floor(t * 10 + r.id.length * 7) % 41 === 0;
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, PORTRAIT_W, PORTRAIT_H);
    c.drawImage(portraitCanvas(r.aparencia!, r.id, blink), 0, 0);
  });
  return <canvas ref={ref} width={PORTRAIT_W} height={PORTRAIT_H} style={{ width: PORTRAIT_W * px, height: PORTRAIT_H * px, imageRendering: 'pixelated', display: 'block' }} />;
};

// sprite da cidade (andando), ampliado por inteiro
export const SpriteCidade: React.FC<{ r: Resident; px: number; t: number }> = ({ r, px, t }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 13, H = 18;
  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, W, H);
    const s = personSprite(lookOf(r.aparencia!), 0, Math.floor(t * 4) % 4, `ficha-${r.id}`, 1, 'walk');
    c.drawImage(s.img, Math.round(W / 2 + s.ox), H - 1 + s.oy);
  });
  return <canvas ref={ref} width={W} height={H} style={{ width: W * px, height: H * px, imageRendering: 'pixelated', display: 'block' }} />;
};

const trabalhoTexto = (r: Resident) => {
  const b = buildings.find((x) => x.id === r.trabalho);
  return b?.status === 'planejado' ? `${b.nome.toUpperCase()} (EM PROJETO)` : nomeTrabalho(r).toUpperCase();
};

const Selo: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: F.hud, fontWeight: 700, fontSize: size, color: '#2a1a00', background: 'linear-gradient(#ffe27a, #f2b330)', padding: '4px 10px', boxShadow: 'inset 0 -3px 0 #c8901a, 3px 3px 0 rgba(0,0,0,0.5)', letterSpacing: 1 }}>
    <PixelIcon name="star" px={Math.max(2, Math.round(size / 8))} shadow={false} /> MORADOR FUNDADOR
  </span>
);

const Card: React.FC<{ r: Resident; t: number }> = ({ r, t }) => {
  const n1 = r.ordem === 1 && r.ordemConfirmada;
  return (
    <PixelPanel u={4} edge={n1 ? C.yellow : '#d8a83a'} bg="rgba(14,16,44,0.95)">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', width: 452, height: 262 }}>
        <div style={{ position: 'relative', background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 4px ${n1 ? C.yellow : '#d8a83a'}`, padding: 6 }}>
          <Retrato r={r} px={3.5} t={t} />
          {n1 && <div style={{ position: 'absolute', left: -8, top: -14, fontFamily: F.pixel, fontSize: 40, color: C.ink, background: C.yellow, padding: '0 8px', boxShadow: '3px 3px 0 rgba(0,0,0,0.5)' }}><Numero n={1} /></div>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: F.pixel, fontSize: 66, color: C.white, lineHeight: 0.85 }}>{r.nome}</span>
            <SpriteCidade r={r} px={4} t={t} />
          </div>
          <span style={{ fontFamily: F.pixel, fontSize: 40, color: C.yellow, lineHeight: 0.9 }}>{r.titulo?.toUpperCase()}</span>
          <Selo size={16} />
          <span style={{ fontFamily: F.hud, fontSize: 15, color: C.dim }}>CASA {casaNumero(r)} · {r.bairro?.toUpperCase()}</span>
          <span style={{ fontFamily: F.hud, fontSize: 15, color: C.dim }}>{trabalhoTexto(r)}</span>
        </div>
      </div>
    </PixelPanel>
  );
};

export const FichaFundadores: React.FC = () => {
  useFonts();
  const t = useCurrentFrame() / 30;
  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#171543, #0a0b1e)', padding: '70px 30px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: F.pixel, fontSize: 92, color: C.white, lineHeight: 0.85 }}>MORADORES <span style={{ color: '#ffd84a' }}>FUNDADORES</span></div>
          <div style={{ fontFamily: F.hud, fontSize: 20, color: C.cyan, marginTop: 10, letterSpacing: 2 }}>SEGUECITY · DIA 02 · NOMES E PROFISSÕES DOS COMENTÁRIOS</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 34 }}>
        {FUNDADORES.map((r) => <Card key={r.id} r={r} t={t} />)}
      </div>
      <div style={{ fontFamily: F.hud, fontSize: 16, color: C.dim, marginTop: 22, lineHeight: 1.6 }}>
        APARÊNCIA ORIGINAL E FICTÍCIA EM PIXEL ART (SEM FOTOS) · MATEUS: 1º COMENTÁRIO (CONFIRMADO) · ORDEM DOS DEMAIS A CONFIRMAR
      </div>
    </AbsoluteFill>
  );
};

// ficha individual (1080x1080) de um fundador: props { id: 'm0001' }
export const FichaFundador: React.FC<{ id: string }> = ({ id }) => {
  useFonts();
  const t = useCurrentFrame() / 30;
  const r = FUNDADORES.find((x) => x.id === id) ?? FUNDADORES[0];
  const n1 = r.ordem === 1 && r.ordemConfirmada;
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 40%, #2a2470, #0a0b1e 75%)', alignItems: 'center', justifyContent: 'center' }}>
      <PixelPanel u={7} edge={n1 ? C.yellow : '#d8a83a'} bg="rgba(14,16,44,0.96)">
        <div style={{ display: 'flex', gap: 40, alignItems: 'center', padding: '20px 16px' }}>
          <div style={{ position: 'relative', background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 8px ${n1 ? C.yellow : '#d8a83a'}`, padding: 12 }}>
            <Retrato r={r} px={8} t={t} />
            {n1 && <div style={{ position: 'absolute', left: -14, top: -26, fontFamily: F.pixel, fontSize: 84, color: C.ink, background: C.yellow, padding: '0 16px', boxShadow: '6px 6px 0 rgba(0,0,0,0.5)' }}><Numero n={1} /></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SpriteCidade r={r} px={8} t={t} />
            <span style={{ fontFamily: F.pixel, fontSize: 130, color: C.white, lineHeight: 0.8 }}>{r.nome}</span>
            <span style={{ fontFamily: F.pixel, fontSize: 70, color: C.yellow, lineHeight: 0.85 }}>{r.titulo?.toUpperCase()}</span>
            <Selo size={28} />
            {n1 && <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 24, color: C.yellow }}>PRIMEIRO MORADOR DA SEGUECITY</span>}
            <span style={{ fontFamily: F.hud, fontSize: 24, color: C.dim }}>CASA {casaNumero(r)} · {r.bairro?.toUpperCase()}</span>
            <span style={{ fontFamily: F.hud, fontSize: 24, color: C.dim }}>{trabalhoTexto(r)}</span>
            <span style={{ fontFamily: F.hud, fontSize: 20, color: C.cyan }}>CHEGOU NO DIA 02</span>
          </div>
        </div>
      </PixelPanel>
    </AbsoluteFill>
  );
};
