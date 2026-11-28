// Prévia do Dia 02 para aprovação (não é o episódio): a cidade com os 10 fundadores, de 6 câmeras.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { SimTag } from '../../components/hud/Panels';
import { C } from '../../components/theme';
import { stage, autoTilt } from '../../series/stage';
import { useFonts } from '../../hooks/useFonts';
import { city } from '../../data';
import { estadoDia02, fundador, casaNumero } from './cidade';

const SHOTS = [
  { nome: 'ilha', i: 15.5, j: 15.5, z: -10, zoom: 1.25 },
  { nome: 'vila-nova', i: 9.5, j: 26.2, z: 6, zoom: 3.0 },
  { nome: 'cemiterio', i: 27.6, j: 28.6, z: 10, zoom: 4.2 },
  { nome: 'advocacia', i: 17.4, j: 22.4, z: 18, zoom: 4.0 },
  { nome: 'hospital', i: 17.8, j: 9.2, z: 26, zoom: 3.4 },
  { nome: 'oficina', i: 6.6, j: 23.2, z: 12, zoom: 4.0 },
  { nome: 'cemiterio-perto', i: 28.0, j: 29.6, z: 12, zoom: 8.0 },
  { nome: 'advocacia-perto', i: 17.2, j: 22.6, z: 22, zoom: 7.0 },
];

export const Dia02Preview: React.FC<{ shot: number; construido?: boolean; dia?: boolean }> = ({ shot, construido, dia }) => {
  useFonts();
  const t = 10 + useCurrentFrame() / 30;
  const sh = SHOTS[shot] ?? SHOTS[0];
  const st = estadoDia02(t);
  // aprovação do desenho: mostra as duas obras já prontas (no episódio elas aparecem como planta)
  if (construido) ['cemiterio', 'futuro-3'].forEach((id) => { st.overrides[id] = { lit: 1 }; });
  const S = stage({ t, night: dia ? 0 : 1, shots: [{ t: 0, ...sh }], frameY: 0.52, drift: 0, people: st.people, traffic: 1, vehicles: st.vehicles, homeFrac: st.homeFrac, extra: st.extra, overrides: st.overrides, reveal: st.reveal, tilt: autoTilt(sh.zoom) * 0.8 });
  const L = (id: string) => S.anchor(id);
  const rob = fundador('Roberto'), gab = fundador('Gabrielly'), mat = fundador('Mateus');
  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={S.params} />
      {sh.nome === 'cemiterio' && <WorldLabel x={L('cemiterio').x} y={L('cemiterio').y} title="CEMITÉRIO · EM PROJETO" sub={`PEDIDO DO ${rob.nome.toUpperCase()} (${rob.titulo?.toUpperCase()})`} icon="building" color={C.cyan} a={1} stem={40} />}
      {sh.nome === 'advocacia' && <WorldLabel x={L('futuro-3').x} y={L('futuro-3').y} title="ADVOCACIA · EM PROJETO" sub={`PARA A ${gab.nome.toUpperCase()} (${gab.titulo?.toUpperCase()})`} icon="building" color={C.cyan} a={1} stem={40} />}
      {sh.nome === 'vila-nova' && <WorldLabel x={L(mat.casa!).x} y={L(mat.casa!).y} title={`CASA ${casaNumero(mat)} · ${mat.nome.toUpperCase()}`} sub="MORADOR Nº 1" icon="house" color={C.yellow} a={1} stem={46} />}
      <Hud moradores={city.moradores} empregos={city.empregos.total - city.empregos.ocupados} dia={city.dia} hora="20:15" seguidores={city.seguidores?.valor ?? null} />
      <SimTag a={1} text={`${construido ? 'COMO VAI FICAR' : 'PRÉVIA DO DIA 02'} · ${sh.nome.toUpperCase()}`} y={1520} />
    </AbsoluteFill>
  );
};
