// Peças de interface do Ep. 02: fichas dos fundadores (uma ou duas por vez), grade dos 10, contador dourado,
// carimbo "Nº 1", painel de serviços, missão dos pioneiros, casas/vagas livres e o "próximo morador".
// Nome e profissão sempre do cadastro (data/residents.json); a ordem só é mostrada para o Mateus (confirmada).
import React from 'react';
import { C, F } from '../../components/theme';
import { PixelPanel } from '../../components/hud/PixelPanel';
import { PixelIcon } from '../../components/hud/PixelIcon';
import { Numero } from '../../components/hud/Numero';
import { backOut, clamp, easeOut, smooth } from '../../utils/easing';
import type { Resident } from '../../data';
import { Retrato, Selo, SpriteCidade, trabalhoTexto } from './Fundadores';
import { casaNumero } from './cidade';

export const GOLD = '#ffd84a';
export const PIO = '#5af2ff'; // cor da categoria PIONEIRO
const vis = (a: number, out = 0) => a > 0.001 && out < 0.999;
const enter = (a: number, out = 0, dy = -50) => ({
  opacity: clamp(a * 2.5) * (1 - smooth(out)),
  transform: `translateY(${(1 - easeOut(clamp(a))) * dy - smooth(out) * 40}px) scale(${0.85 + 0.15 * backOut(clamp(a))})`,
  transformOrigin: 'top center' as const,
});
const isN1 = (r: Resident) => r.ordem === 1 && !!r.ordemConfirmada;

// ficha grande de um fundador (nome e profissão legíveis no celular)
export const FounderCard: React.FC<{ r: Resident; a: number; out?: number; t: number; y?: number; pop?: number }> = ({ r, a, out = 0, t, y = 370, pop = 0 }) => {
  if (!vis(a, out)) return null;
  const n1 = isN1(r);
  const edge = n1 ? GOLD : '#d8a83a';
  return (
    <div style={{ position: 'absolute', left: 44, right: 44, top: y, ...enter(a, out) }}>
      <PixelPanel u={5} edge={edge} bg="rgba(14,16,44,0.95)">
        <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
          <div style={{ position: 'relative', background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 6px ${edge}`, padding: 8 }}>
            <Retrato r={r} px={5} t={t} />
            {n1 && <div style={{ position: 'absolute', left: -12, top: -20, fontFamily: F.pixel, fontSize: 58, color: C.ink, background: GOLD, padding: '0 12px', boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}><Numero n={1} /></div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: F.pixel, fontSize: 112, color: C.white, lineHeight: 0.82 }}>{r.nome}</span>
              <SpriteCidade r={r} px={5} t={t} />
            </div>
            <span style={{ fontFamily: F.pixel, fontSize: 70, color: GOLD, lineHeight: 0.85, display: 'inline-block', transform: `scale(${1 + 0.18 * Math.sin(Math.PI * clamp(pop))})`, transformOrigin: 'left center' }}>{r.titulo?.toUpperCase()}</span>
            <div><Selo size={20} /></div>
            {n1 && <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 22, color: GOLD }}>PRIMEIRO MORADOR · CONFIRMADO</span>}
            <span style={{ fontFamily: F.hud, fontSize: 21, color: C.dim }}>CASA {casaNumero(r)} · {r.bairro?.toUpperCase()}</span>
            <span style={{ fontFamily: F.hud, fontSize: 21, color: C.dim }}>{trabalhoTexto(r)}</span>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

// duas fichas lado a lado (Gabriel e Juan; Alicia e Muri); a segunda entra quando o nome é falado
export const FounderPair: React.FC<{ rs: [Resident, Resident]; a: [number, number]; out?: number; t: number; y?: number }> = ({ rs, a, out = 0, t, y = 370 }) => {
  if (!vis(a[0], out)) return null;
  return (
    <div style={{ position: 'absolute', left: 26, right: 26, top: y, display: 'flex', gap: 16, opacity: 1 - smooth(out) }}>
      {rs.map((r, k) => (
        <div key={r.id} style={{ flex: 1, ...enter(a[k], 0, -60) }}>
          <PixelPanel u={4} edge="#d8a83a" bg="rgba(14,16,44,0.95)">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
                <div style={{ background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: 'inset 0 0 0 5px #d8a83a', padding: 6 }}>
                  <Retrato r={r} px={4} t={t} />
                </div>
                <SpriteCidade r={r} px={4} t={t} />
              </div>
              <span style={{ fontFamily: F.pixel, fontSize: 92, color: C.white, lineHeight: 0.82, marginTop: 4 }}>{r.nome}</span>
              <span style={{ fontFamily: F.pixel, fontSize: 58, color: GOLD, lineHeight: 0.85 }}>{r.titulo?.toUpperCase()}</span>
              <Selo size={16} />
              <span style={{ fontFamily: F.hud, fontSize: 18, color: C.dim }}>CASA {casaNumero(r)} · {trabalhoTexto(r)}</span>
            </div>
          </PixelPanel>
        </div>
      ))}
    </div>
  );
};

// contador dourado do gancho (0 → 10, rolando junto das casas que acendem)
export const GoldCounter: React.FC<{ a: number; out?: number; value: number; label: string; sub?: string; y?: number; color?: string; icon?: string }> = ({ a, out = 0, value, label, sub, y = 380, color = GOLD, icon = 'person' }) => {
  if (!vis(a, out)) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: clamp(a * 2.5) * (1 - smooth(out)), transform: `scale(${0.75 + 0.25 * backOut(clamp(a))})` }}>
      <PixelPanel u={6} edge={color}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, padding: '2px 12px' }}>
          <PixelIcon name={icon} px={12} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.85 }}>
            <span style={{ fontFamily: F.hud, fontSize: 30, color: C.dim, letterSpacing: 2 }}>{label}</span>
            <span style={{ fontFamily: F.pixel, fontSize: 176, color, textShadow: '0 8px 0 #000' }}>{value}</span>
            {sub && <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 26, color: C.white, marginTop: 6 }}>{sub}</span>}
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};

// carimbo com número ("Nº" desenhado à mão: as fontes pixel não têm "º")
export const NumStamp: React.FC<{ a: number; out?: number; label: string; n: number; sub?: string; y?: number; color?: string; rot?: number }> = ({ a, out = 0, label, n, sub, y = 400, color = GOLD, rot = -5 }) => {
  if (!vis(a, out)) return null;
  const s = a < 1 ? 1.8 - 0.8 * easeOut(clamp(a / 0.6)) : 1;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: clamp(a * 4) * (1 - smooth(out)) }}>
      <div style={{ transform: `rotate(${rot}deg) scale(${s})`, border: `10px solid ${color}`, padding: '10px 34px', background: 'rgba(10,11,30,0.78)', boxShadow: '8px 8px 0 rgba(0,0,0,0.55)', textAlign: 'center' }}>
        <div style={{ fontFamily: F.pixel, fontSize: 104, color, lineHeight: 0.85 }}>{label} <Numero n={n} /></div>
        {sub && <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 28, color: C.white, marginTop: 8, letterSpacing: 2 }}>{sub}</div>}
      </div>
    </div>
  );
};

// os 10 fundadores com nome e profissão; a estrela dourada entra em cada um (star(k): 0..1)
export const FoundersGrid: React.FC<{ rs: Resident[]; a: number; out?: number; t: number; star: (k: number) => number; glow?: number; ribbon?: number; y?: number }> = ({ rs, a, out = 0, t, star, glow = 0, ribbon = 0, y = 360 }) => {
  if (!vis(a, out)) return null;
  return (
    <div style={{ position: 'absolute', left: 22, right: 22, top: y, ...enter(a, out) }}>
      <PixelPanel u={5} edge={GOLD} bg="rgba(14,16,44,0.94)">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          <PixelIcon name="star" px={7} />
          <span style={{ fontFamily: F.pixel, fontSize: 76, color: GOLD, lineHeight: 0.9, textShadow: `0 0 ${24 * glow}px rgba(255,216,74,${0.9 * glow})`, transform: `scale(${1 + 0.06 * glow})`, display: 'inline-block' }}>MORADORES FUNDADORES</span>
          <PixelIcon name="star" px={7} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', rowGap: 14, columnGap: 8 }}>
          {rs.map((r, k) => {
            const s = star(k);
            return (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 4px ${s > 0.5 ? GOLD : '#3b3f86'}`, padding: 5 }}>
                  <Retrato r={r} px={3.4} t={t} />
                  {s > 0.001 && <div style={{ position: 'absolute', right: -10, bottom: -8, transform: `scale(${(s < 1 ? 2.2 - 1.2 * easeOut(s) : 1) * (s > 0 ? 1 : 0)}) rotate(${(1 - s) * 40}deg)`, opacity: clamp(s * 3) }}><PixelIcon name="star" px={5} /></div>}
                  {isN1(r) && <div style={{ position: 'absolute', left: -6, top: -10, fontFamily: F.pixel, fontSize: 30, color: C.ink, background: GOLD, padding: '0 6px' }}><Numero n={1} /></div>}
                </div>
                <span style={{ fontFamily: F.pixel, fontSize: 46, color: C.white, lineHeight: 0.9, marginTop: 6 }}>{r.nome}</span>
                <span style={{ fontFamily: F.pixel, fontSize: r.titulo && r.titulo.length > 11 ? 26 : 30, color: GOLD, lineHeight: 0.9 }}>{r.titulo?.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        {ribbon > 0.001 && (
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', opacity: clamp(ribbon * 3), transform: `scale(${ribbon < 1 ? 1.6 - 0.6 * easeOut(ribbon) : 1})` }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: F.pixel, fontSize: 64, lineHeight: 0.9, color: '#2a1a00', background: 'linear-gradient(#ffe27a, #f2b330)', padding: '4px 22px 8px', boxShadow: 'inset 0 -4px 0 #c8901a, 5px 5px 0 rgba(0,0,0,0.5)' }}>
              <PixelIcon name="star" px={6} shadow={false} /> DISTINTIVO DOURADO · PARA SEMPRE
            </span>
          </div>
        )}
      </PixelPanel>
    </div>
  );
};

// serviços abertos (acende um por um)
export const ServicesPanel: React.FC<{ a: number; out?: number; itens: { nome: string; icon: string; at: number }[]; t: number; y?: number }> = ({ a, out = 0, itens, t, y = 370 }) => {
  if (!vis(a, out)) return null;
  const on = itens.filter((x) => t >= x.at).length;
  return (
    <div style={{ position: 'absolute', left: 70, right: 70, top: y, ...enter(a, out) }}>
      <PixelPanel u={5} edge={C.green} bg="rgba(14,16,44,0.94)">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 18, marginBottom: 10 }}>
          <span style={{ fontFamily: F.pixel, fontSize: 120, color: C.green, lineHeight: 0.8 }}>{on}</span>
          <span style={{ fontFamily: F.pixel, fontSize: 70, color: C.white, lineHeight: 0.8 }}>SERVIÇOS ABERTOS</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {itens.map((x) => {
            const u = clamp((t - x.at) / 0.25);
            return (
              <div key={x.nome} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: 0.3 + 0.7 * u, transform: `translateX(${(1 - easeOut(u)) * 30}px)` }}>
                <PixelIcon name={x.icon} px={5} />
                <span style={{ fontFamily: F.pixel, fontSize: 48, color: C.white, lineHeight: 0.9, flex: 1 }}>{x.nome}</span>
                <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 22, color: C.ink, background: u > 0.5 ? C.green : '#3b3f86', padding: '3px 10px' }}>{u > 0.5 ? 'ABERTO' : '...'}</span>
              </div>
            );
          })}
        </div>
      </PixelPanel>
    </div>
  );
};

// nova missão: as três categorias de morador (FUNDADOR completo, PIONEIRO em aberto, CIDADÃO bloqueado)
export const MissionPanel: React.FC<{ a: number; out?: number; t: number; titleA: number; pioA: number; y?: number }> = ({ a, out = 0, t, titleA, pioA, y = 360 }) => {
  if (!vis(a, out)) return null;
  const glow = 0.6 + 0.4 * Math.sin(t * 6);
  const Row: React.FC<{ icon: string; nome: string; faixa: string; prog: string; color: string; on: number; lock?: boolean; done?: boolean }> = ({ icon, nome, faixa, prog, color, on, lock, done }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 14px', background: on > 0.5 ? 'rgba(90,242,255,0.10)' : 'transparent', boxShadow: on > 0.5 ? `inset 0 0 0 4px rgba(90,242,255,${0.5 + 0.5 * glow})` : 'none', opacity: lock ? 0.55 : 1, transform: `scale(${1 + 0.05 * on})`, transformOrigin: 'left center' }}>
      <PixelIcon name={lock ? 'lock' : icon} px={7} />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, lineHeight: 0.9 }}>
        <span style={{ fontFamily: F.pixel, fontSize: 64, color }}>{nome}</span>
        <span style={{ fontFamily: F.hud, fontSize: 21, color: C.dim, marginTop: 4 }}>{faixa}</span>
      </div>
      <span style={{ fontFamily: F.pixel, fontSize: 56, color: done ? C.green : color }}>{prog}</span>
    </div>
  );
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: y, ...enter(a, out) }}>
      <PixelPanel u={5} edge={PIO} bg="rgba(14,16,44,0.95)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <PixelIcon name="scroll" px={7} />
          <span style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 30, color: C.ink, background: PIO, padding: '4px 12px', letterSpacing: 2 }}>NOVA MISSÃO</span>
        </div>
        <div style={{ fontFamily: F.pixel, fontSize: 96, color: C.white, lineHeight: 0.85, margin: '14px 0 12px', opacity: clamp(titleA * 3), transform: `translateX(${(1 - easeOut(clamp(titleA))) * 40}px)` }}>
          ENCONTRAR OS <span style={{ color: PIO }}>PIONEIROS</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Row icon="star" nome="FUNDADORES" faixa="MORADORES 1 A 10" prog="10/10" color={GOLD} on={0} done />
          <Row icon="flag" nome="PIONEIROS" faixa="MORADORES 11 A 100 · OS PRÓXIMOS 90" prog="0/90" color={PIO} on={pioA} />
          <Row icon="person" nome="CIDADÃOS" faixa="DO MORADOR 101 EM DIANTE" prog="—" color={C.white} on={0} lock />
        </div>
      </PixelPanel>
    </div>
  );
};

// casas e vagas livres (números do estado gravado do episódio)
export const FreePanel: React.FC<{ a: number; out?: number; casas: number; vagas: { total: number; ocupadas: number; livres: number; disponiveis?: number; emPredioPlanejado?: number; dependemDaEleicao?: number }; jobA: number; y?: number }> = ({ a, out = 0, casas, vagas, jobA, y = 370 }) => {
  if (!vis(a, out)) return null;
  return (
    <div style={{ position: 'absolute', left: 50, right: 50, top: y, display: 'flex', flexDirection: 'column', gap: 14, ...enter(a, out) }}>
      <PixelPanel u={5} edge={PIO} bg="rgba(14,16,44,0.94)">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <PixelIcon name="house" px={11} />
          <span style={{ fontFamily: F.pixel, fontSize: 150, color: PIO, lineHeight: 0.8, textShadow: '0 8px 0 #000' }}>{casas}</span>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.9 }}>
            <span style={{ fontFamily: F.pixel, fontSize: 72, color: C.white }}>CASAS LIVRES</span>
            <span style={{ fontFamily: F.hud, fontSize: 22, color: C.dim }}>ESPERANDO OS PIONEIROS</span>
          </div>
        </div>
      </PixelPanel>
      <div style={{ opacity: clamp(jobA * 2.5), transform: `translateY(${(1 - easeOut(clamp(jobA))) * -30}px)` }}>
        <PixelPanel u={4} edge={GOLD} bg="rgba(14,16,44,0.94)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <PixelIcon name="job" px={8} />
            <span style={{ fontFamily: F.pixel, fontSize: 96, color: GOLD, lineHeight: 0.8 }}>{vagas.disponiveis ?? vagas.livres}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.95 }}>
              <span style={{ fontFamily: F.pixel, fontSize: 52, color: C.white }}>{vagas.disponiveis !== undefined ? 'VAGAS DE EMPREGO DISPONÍVEIS' : 'VAGAS DE EMPREGO LIVRES'}</span>
              <span style={{ fontFamily: F.hud, fontSize: 20, color: C.dim }}>{vagas.total} NO TOTAL · {vagas.ocupadas} OCUPADAS · {vagas.livres} LIVRES</span>
              {vagas.disponiveis !== undefined && <span style={{ fontFamily: F.hud, fontSize: 18, color: C.dim, marginTop: 2 }}>{vagas.emPredioPlanejado} EM OBRAS PLANEJADAS · {vagas.dependemDaEleicao} DE PREFEITO (ELEIÇÃO)</span>}
            </div>
          </div>
        </PixelPanel>
      </div>
    </div>
  );
};

// o convite: a próxima vaga é de PIONEIRO (sem número: a ordem só existe quando a pessoa chega)
export const NextCard: React.FC<{ a: number; out?: number; t: number; y?: number }> = ({ a, out = 0, t, y = 360 }) => {
  if (!vis(a, out)) return null;
  const glow = 0.6 + 0.4 * Math.sin(t * 5);
  return (
    <div style={{ position: 'absolute', left: 60, right: 60, top: y, ...enter(a, out) }}>
      <PixelPanel u={5} edge={PIO} bg="rgba(14,16,44,0.95)">
        <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <div style={{ width: 176, height: 212, background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 6px ${PIO}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: F.pixel, fontSize: 190, color: PIO, opacity: 0.55 + 0.45 * glow, textShadow: `0 0 ${18 * glow}px ${PIO}` }}>?</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontFamily: F.pixel, fontSize: 66, color: C.white, lineHeight: 0.85 }}>PRÓXIMO MORADOR</span>
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: F.pixel, fontSize: 76, lineHeight: 0.9, color: C.ink, background: `linear-gradient(#bdfbff, ${PIO})`, padding: '2px 16px 6px', boxShadow: 'inset 0 -4px 0 #2bb7c8, 4px 4px 0 rgba(0,0,0,0.5)' }}>
              <PixelIcon name="flag" px={6} shadow={false} /> PIONEIRO
            </span>
            <span style={{ fontFamily: F.hud, fontSize: 22, color: C.dim }}>SEU NOME · SUA PROFISSÃO</span>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
};
