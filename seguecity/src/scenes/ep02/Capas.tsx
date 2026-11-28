// Capas do Ep. 02 para o TikTok (1080x1920). A grade do perfil corta a capa em 3:4 no centro (y 240–1680),
// então título, número e logo ficam nessa faixa. Cidade real no estado do Dia 02 + logo oficial.
//   A — 10 PESSOAS ESCOLHERAM MORAR AQUI (as 10 casas acesas da Vila Nova)
//   B — UM COVEIRO NUMA CIDADE SEM CEMITÉRIO (o Roberto no terreno vazio)
//   C — OS 10 FUNDADORES (retratos com a estrela dourada)
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Logo } from '../../components/hud/Logo';
import { PixelPanel } from '../../components/hud/PixelPanel';
import { PixelIcon } from '../../components/hud/PixelIcon';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { C, F } from '../../components/theme';
import { stage } from '../../series/stage';
import { getWorld } from '../../engine/world';
import { useFonts } from '../../hooks/useFonts';
import { buildings, episodes } from '../../data';
import { FUNDADORES, estadoDia02, fundador } from './cidade';
import { Retrato } from './Fundadores';
import { GOLD } from './ui';

const EP = episodes.find((e) => e.id === 'ep02')!;
const big = (size: number, color = C.white): React.CSSProperties => ({
  fontFamily: F.pixel, fontSize: size, color, lineHeight: 0.86, textAlign: 'center',
  WebkitTextStroke: `${size * 0.1}px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 ${size * 0.08}px 0 ${C.ink}, 0 0 40px rgba(0,0,0,0.6)`,
});
// placas "EM BREVE" dos dois lotes que viram projeto no Ep. 02 (mesma regra do episódio)
const hiddenSigns = () => new Set(getWorld().objects.filter((o) => ['cemiterio', 'futuro-3'].some((id) => {
  const b = buildings.find((x) => x.id === id)!;
  return !o.ref && Math.abs((o.fp[0] + o.fp[2]) / 2 - (b.posicao.i + 1)) < 0.3 && Math.abs((o.fp[1] + o.fp[3]) / 2 - (b.posicao.j + b.tamanho.d - 0.5)) < 0.3;
})).map((o) => o.id));

export const CapaEp02: React.FC<{ v: 'A' | 'B' | 'C' }> = ({ v }) => {
  useFonts();
  const st = estadoDia02(12, { planta: 0 });
  if (v === 'A') {
    const S = stage({ t: 12, shots: [{ t: 0, i: 10.6, j: 27.2, z: 4, zoom: 3.4 }], frameY: 0.56, drift: 0, people: 0, traffic: 1, vehicles: st.vehicles, homeFrac: 0, extra: st.extra, overrides: st.overrides, hidden: hiddenSigns(), tilt: 0.3 });
    return (
      <AbsoluteFill style={{ background: '#05060f' }}>
        <CityCanvas params={S.params} />
        <AbsoluteFill style={{ background: 'linear-gradient(rgba(5,6,20,0.85) 0%, rgba(5,6,20,0.25) 33%, rgba(5,6,20,0) 52%, rgba(5,6,20,0.2) 75%, rgba(5,6,20,0.75) 100%)' }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 280, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={big(168, GOLD)}>{EP.estado.moradores} PESSOAS</div>
          <div style={big(132)}>ESCOLHERAM</div>
          <div style={big(132)}>MORAR AQUI</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 34, color: C.ink, background: GOLD, padding: '8px 22px', letterSpacing: 2 }}>DIA 02 · OS FUNDADORES CHEGARAM</div>
          <Logo size={44} />
        </div>
      </AbsoluteFill>
    );
  }
  if (v === 'B') {
    const rob = fundador('Roberto');
    const S = stage({ t: 12, shots: [{ t: 0, i: 29.4, j: 30.3, z: 10, zoom: 8.0 }], frameY: 0.6, drift: 0, people: 0, traffic: 0, vehicles: [], homeFrac: 0, extra: st.extra, overrides: st.overrides, hidden: hiddenSigns() });
    const o = st.extra.find((x) => x.id === `fund-${rob.id}`)!;
    const p = S.scr((o.fp[0] + o.fp[2]) / 2, (o.fp[1] + o.fp[3]) / 2, 30);
    return (
      <AbsoluteFill style={{ background: '#05060f' }}>
        <CityCanvas params={S.params} />
        <AbsoluteFill style={{ background: 'linear-gradient(rgba(5,6,20,0.88) 0%, rgba(5,6,20,0.3) 34%, rgba(5,6,20,0) 52%, rgba(5,6,20,0.7) 100%)' }} />
        <WorldLabel x={p.x} y={p.y} title="ROBERTO · COVEIRO" sub="MORADOR FUNDADOR" icon="shovel" color={GOLD} a={1} stem={60} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: 270, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={big(150)}>UM <span style={{ color: GOLD }}>COVEIRO</span></div>
          <div style={big(108)}>NUMA CIDADE</div>
          <div style={big(108, C.red)}>SEM CEMITÉRIO</div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 1440, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 32, color: C.ink, background: C.cyan, padding: '8px 22px', letterSpacing: 2 }}>DIA 02 · SEGUECITY</div>
          <Logo size={40} />
        </div>
      </AbsoluteFill>
    );
  }
  // C — os 10 fundadores
  const S = stage({ t: 12, shots: [{ t: 0, i: 15.4, j: 15.4, z: 20, zoom: 1.45 }], frameY: 0.5, drift: 0, people: 0, traffic: 1, vehicles: st.vehicles, homeFrac: 0, extra: st.extra, overrides: st.overrides, hidden: hiddenSigns(), tilt: 0.6 });
  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={S.params} />
      <AbsoluteFill style={{ background: 'rgba(5,6,20,0.55)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 270, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={big(140)}>OS <span style={{ color: GOLD }}>10</span></div>
        <div style={big(140, GOLD)}>FUNDADORES</div>
      </div>
      <div style={{ position: 'absolute', left: 40, right: 40, top: 640 }}>
        <PixelPanel u={5} edge={GOLD} bg="rgba(14,16,44,0.92)">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', rowGap: 16, columnGap: 8 }}>
            {FUNDADORES.map((r) => (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', background: 'linear-gradient(#2a2f6a, #1a1d48)', boxShadow: `inset 0 0 0 4px ${GOLD}`, padding: 5 }}>
                  <Retrato r={r} px={3.4} t={0} />
                  <div style={{ position: 'absolute', right: -10, bottom: -8 }}><PixelIcon name="star" px={5} /></div>
                </div>
                <span style={{ fontFamily: F.pixel, fontSize: 44, color: C.white, lineHeight: 0.9, marginTop: 6 }}>{r.nome}</span>
              </div>
            ))}
          </div>
        </PixelPanel>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 1330, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 32, color: '#2a1a00', background: `linear-gradient(#ffe27a, #f2b330)`, padding: '8px 22px', letterSpacing: 2 }}>DISTINTIVO DOURADO · PARA SEMPRE</div>
        <Logo size={42} />
      </div>
    </AbsoluteFill>
  );
};
