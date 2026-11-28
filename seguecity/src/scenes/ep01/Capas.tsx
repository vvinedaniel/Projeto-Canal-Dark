// Capas do Ep. 01 para o TikTok (1080x1920). A grade do perfil corta a capa em 3:4 no centro (y 240–1680),
// então título, número e logo ficam nessa faixa. Cidade real da V2 no estado gravado (0 moradores) + logo oficial.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Logo } from '../../components/hud/Logo';
import { PixelPanel } from '../../components/hud/PixelPanel';
import { PixelIcon } from '../../components/hud/PixelIcon';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { C, F } from '../../components/theme';
import { stage } from '../../series/stage';
import { personObj } from '../../engine/dynamics';
import { lookOf } from '../../engine/sprites/people';
import { useFonts } from '../../hooks/useFonts';
import { EXEMPLOS } from '../../data/exemplos';
import { city, episodes } from '../../data';

const EP = episodes.find((e) => e.id === 'ep01')!;
const big = (size: number, color = C.white): React.CSSProperties => ({
  fontFamily: F.pixel, fontSize: size, color, lineHeight: 0.86, textAlign: 'center',
  WebkitTextStroke: `${size * 0.1}px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 ${size * 0.08}px 0 ${C.ink}, 0 0 40px rgba(0,0,0,0.6)`,
});

export const Capa: React.FC<{ v: 'A' | 'B' | 'C' }> = ({ v }) => {
  useFonts();
  if (v === 'A') {
    // A — CONSTRUÍ UMA CIDADE: a ilha inteira à noite, luzes acesas, cidade pronta
    const S = stage({ t: 2, shots: [{ t: 0, i: 15.4, j: 15.4, z: 30, zoom: 1.5 }], frameY: 0.5, drift: 0, people: 0, traffic: 0, homeFrac: 0, tilt: 0.6 });
    return (
      <AbsoluteFill style={{ background: '#05060f' }}>
        <CityCanvas params={S.params} />
        <AbsoluteFill style={{ background: 'linear-gradient(rgba(5,6,20,0.82) 0%, rgba(5,6,20,0.2) 30%, rgba(5,6,20,0) 50%, rgba(5,6,20,0.15) 75%, rgba(5,6,20,0.7) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={big(178)}>CONSTRUÍ</div>
          <div style={big(178)}>UMA <span style={{ color: C.yellow }}>CIDADE</span></div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1345, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 34, color: C.ink, background: C.red, padding: '8px 22px', letterSpacing: 2 }}>MAS NINGUÉM MORA NELA</div>
          <Logo size={44} />
        </div>
      </AbsoluteFill>
    );
  }
  if (v === 'B') {
    // B — DIA 01: 0 MORADORES: o contador real sobre a rua vazia da Vila Nova
    const S = stage({ t: 2, shots: [{ t: 0, i: 9.6, j: 26.6, z: 8, zoom: 3.3 }], frameY: 0.62, drift: 0, people: 0, traffic: 0, homeFrac: 0 });
    return (
      <AbsoluteFill style={{ background: '#05060f' }}>
        <CityCanvas params={S.params} />
        <AbsoluteFill style={{ background: 'linear-gradient(rgba(5,6,20,0.85) 0%, rgba(5,6,20,0.35) 35%, rgba(5,6,20,0) 55%, rgba(5,6,20,0.6) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
          <div style={{ transform: 'rotate(-4deg)', border: `12px solid ${C.yellow}`, padding: '8px 40px', background: 'rgba(10,11,30,0.8)', boxShadow: '10px 10px 0 rgba(0,0,0,0.6)' }}>
            <div style={{ fontFamily: F.pixel, fontSize: 150, color: C.yellow, lineHeight: 0.85 }}>DIA 01</div>
          </div>
          <PixelPanel u={7} edge={C.red}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 34, padding: '0 16px' }}>
              <PixelIcon name="house" px={14} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 0.82 }}>
                <span style={{ fontFamily: F.pixel, fontSize: 300, color: C.red, textShadow: '0 12px 0 #000' }}>{EP.estado.moradores}</span>
                <span style={{ fontFamily: F.pixel, fontSize: 96, color: C.white }}>MORADORES</span>
              </div>
            </div>
          </PixelPanel>
          <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 30, color: C.white, letterSpacing: 2, textShadow: '0 4px 0 #000' }}>{city.casas.total} CASAS VAZIAS · {city.empregos.total} VAGAS</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1450, display: 'flex', justifyContent: 'center' }}><Logo size={42} /></div>
      </AbsoluteFill>
    );
  }
  // C — VOCÊ PODE MORAR AQUI: casa da Vila Nova ao amanhecer com o holograma "VOCÊ?" na porta
  const ex = EXEMPLOS[0];
  const ghost = personObj('capa-voce', lookOf(ex.aparencia), 'capa-voce', 5.95, 27.83, 0, 0, 2, 0.95, 'wave');
  const S = stage({ t: 2, shots: [{ t: 0, i: 5.7, j: 27.2, z: 12, zoom: 5.0 }], frameY: 0.6, drift: 0, people: 0, traffic: 0, homeFrac: 0, dawn: 0.75, extra: [ghost], overrides: { 'capa-voce': { ghost: 1, alpha: 0.85 } } });
  const casa = S.anchor('casa-01');
  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={S.params} />
      <AbsoluteFill style={{ background: 'linear-gradient(rgba(5,6,20,0.8) 0%, rgba(5,6,20,0.25) 32%, rgba(5,6,20,0) 50%, rgba(5,6,20,0.55) 100%)' }} />
      <WorldLabel x={casa.x} y={casa.y} title="CASA 12 · LIVRE" sub="PODE SER A SUA" icon="house" color={C.yellow} a={1} stem={90} align="right" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 290, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={big(170)}>VOCÊ PODE</div>
        <div style={big(170, C.yellow)}>MORAR AQUI</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 32, color: C.ink, background: C.cyan, padding: '8px 22px', letterSpacing: 2 }}>VAGA ABERTA · MORADOR Nº 1</div>
        <Logo size={40} />
      </div>
    </AbsoluteFill>
  );
};
