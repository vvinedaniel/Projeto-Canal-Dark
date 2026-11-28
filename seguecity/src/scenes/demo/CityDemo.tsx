// FASE 1 (V2) — Demo cinematográfica da cidade (15 s), coerente com o estado real (0 moradores):
// 1. gancho: a ilha inteira à noite, ruas vazias, "MORADORES 0"            (nível 1 — ilha)
// 2. travelling pela Vila Nova: casas apagadas com marcadores de VAGA       (nível 2 — bairro)
// 3. MODO DEMONSTRAÇÃO (rotulado): praça viva, trânsito parando no sinal    (nível 2 — praça)
// 4. close: o cursor seleciona a moradora de exemplo e abre a ficha         (nível 3 — personagem)
// 5. recuo até a ilha inteira enquanto amanhece; marca e chamada            (nível 1 — ilha)
import React from 'react';
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Minimap } from '../../components/hud/Minimap';
import { Cursor, cursorAt } from '../../components/hud/Cursor';
import { CharacterCard } from '../../components/hud/CharacterCard';
import { BigCounter, SimTag } from '../../components/hud/Panels';
import { FxLayer } from '../../components/fx/FxLayer';
import { marker, selection, tileWipe, sparkles } from '../../components/fx/fx';
import { Sfx } from '../../components/Sfx';
import { C, F } from '../../components/theme';
import { useFonts } from '../../hooks/useFonts';
import { cameraCuts, cutTimes, type Key } from '../../utils/camera';
import { clamp, smooth, win, easeOut } from '../../utils/easing';
import { asset } from '../../utils/audio';
import { stage, autoTilt } from '../../series/stage';
import { personObj, rectWalk } from '../../engine/dynamics';
import { lookOf } from '../../engine/sprites/people';
import { hash2 } from '../../engine/rng';
import { city, jobs, residents } from '../../data';
import { EXEMPLOS, jobName } from '../../data/exemplos';
import type { Obj } from '../../engine/types';

export const DEMO_SECONDS = 15;
const CUT = { rua: 2.75, demo: 4.95, close: 8.65, fim: 11.7 };
const SHOTS: Key[][] = [
  [{ t: 0, i: 16.2, j: 15.2, z: -30, zoom: 1.55 }, { t: CUT.rua, i: 13.6, j: 18.8, z: -6, zoom: 1.95 }],
  [{ t: CUT.rua, i: 6.2, j: 27.3, z: 8, zoom: 3.6 }, { t: CUT.demo, i: 11.8, j: 27.3, z: 8, zoom: 3.75 }],
  [{ t: CUT.demo, i: 11.0, j: 15.6, z: 6, zoom: 4.7 }, { t: 6.8, i: 12.0, j: 14.6, z: 6, zoom: 4.3 }, { t: CUT.close, i: 13.2, j: 13.6, z: 6, zoom: 4.0 }],
  [{ t: CUT.close, i: 6.7, j: 27.7, z: 16, zoom: 6.2 }, { t: CUT.fim, i: 7.9, j: 27.8, z: 16, zoom: 6.8 }],
  [{ t: CUT.fim, i: 9.0, j: 25.0, z: 10, zoom: 2.8 }, { t: 13.4, i: 15.0, j: 16.4, z: 30, zoom: 1.65 }, { t: 15, i: 16.0, j: 15.6, z: 26, zoom: 1.5 }],
];
const CUTS = cutTimes(SHOTS);
const ANA = EXEMPLOS[0];

export const CityDemo: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const demo = t >= CUT.demo && t < CUT.fim; // modo demonstração (cidade com moradores de exemplo)
  const dawn = smooth((t - 12.2) / 2.4);
  const night = 1 - 0.15 * dawn;

  // moradores de exemplo: na praça (plano 3) e a Ana em close (plano 4)
  const extra: Obj[] = [];
  const tags: { i: number; j: number; nome: string; prof: string }[] = [];
  if (demo && t < CUT.close) EXEMPLOS.forEach((e, k) => {
    const w = rectWalk(11.05, 12.05, 13.95, 14.95, k * 2.6 + (t - CUT.demo) * 0.42, k % 2 === 1);
    extra.push(personObj(`ex-${e.id}`, lookOf(e.aparencia), e.id, w.i, w.j, w.dir, Math.floor(t * 4 + k) % 4, 1, 0.5));
    tags.push({ i: w.i, j: w.j, nome: e.nome, prof: e.titulo });
  });
  const anaPos = { i: 6.85 + (t - CUT.close) * 0.42, j: 27.83 };
  const anaStop = t > 9.4;
  if (t >= CUT.close && t < CUT.fim) {
    const ii = anaStop ? 6.85 + (9.4 - CUT.close) * 0.42 + Math.max(0, t - 10.6) * 0.42 : anaPos.i;
    anaPos.i = ii;
    const waving = t > 9.5 && t < 10.6;
    extra.push(personObj('ana', lookOf(ANA.aparencia), ANA.id, anaPos.i, anaPos.j, 0, waving ? Math.floor(t * 6) % 2 : Math.floor(t * 4) % 4, 2, 0.95, waving ? 'wave' : 'walk'));
  }
  // moradores cadastrados de verdade (data/residents.json), se houver, passeiam na praça com plaquinha
  residents.slice(0, 4).forEach((r, k) => {
    if (!r.aparencia || !demo) return;
    const w = rectWalk(10.95, 11.95, 14.05, 15.05, k * 3.1 + t * 0.4, k % 2 === 0);
    extra.push(personObj(`res-${r.id}`, lookOf(r.aparencia), `res-${r.id}`, w.i, w.j, w.dir, Math.floor(t * 4 + k) % 4, 1, 0.5));
    tags.push({ i: w.i, j: w.j, nome: r.nome, prof: jobName(r.profissao) });
  });

  const zoomNow = cameraCuts(SHOTS, t).zoom;
  const S = stage({
    t, shots: SHOTS, frameY: t >= CUT.close && t < CUT.fim ? 0.62 : 0.46, night, dawn,
    people: demo ? 1 : 0, traffic: demo ? 1 : 0, homeFrac: demo ? 1.05 : -0.05, extra, tilt: autoTilt(zoomNow) * 0.5, timeOffset: 40,
  });
  const { cam, scr, corners, world } = S;
  const homes = world.objects.filter((o) => o.group === 'home' && !o.planned);

  // cursor: entra pela direita e seleciona a Ana; a ficha abre no clique
  const anaScr = scr(anaPos.i, anaPos.j, 20);
  const cur = cursorAt([{ t: 8.75, x: 1000, y: 1250 }, { t: 9.25, x: anaScr.x + 10, y: anaScr.y + 30, click: true }, { t: 11.6, x: anaScr.x + 60, y: anaScr.y + 120 }], t);

  const music = asset('audio/music/demo.wav');
  const amb = asset('audio/sfx/night-ambience.wav');
  const water = asset('audio/sfx/water.wav');
  const vagas = city.empregos.total - city.empregos.ocupados;
  const endA = smooth((t - 13.0) / 0.6);

  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={S.params} />
      <FxLayer draw={(c) => {
        const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
        // casas vazias: marcador de VAGA (plano 2)
        if (t > CUT.rua && t < CUT.demo) homes.forEach((o, k) => {
          const a = smooth((t - (CUT.rua + 0.15 + hash2(k, 4) * 0.8)) / 0.3);
          const p = q(S.P(o.anchor!.x, o.anchor!.y));
          marker(c, p.x, p.y - 2, t, a, 'person', '#5af2ff', k);
        });
        // seleção da Ana
        if (t > 9.25 && t < CUT.fim) {
          const p = scr(anaPos.i, anaPos.j, 0);
          selection(c, [scr(anaPos.i - 0.22, anaPos.j - 0.22), scr(anaPos.i + 0.22, anaPos.j - 0.22), scr(anaPos.i + 0.22, anaPos.j + 0.22), scr(anaPos.i - 0.22, anaPos.j + 0.22)].map(q), t, win(t, 9.25, CUT.fim, 0.1, 0.1), C.yellow);
          void p;
        }
        if (t > CUT.demo - 0.05 && t < CUT.demo + 1.3) { const p = q(scr(12.5, 13.5, 0)); sparkles(c, p.x, p.y, t, CUT.demo, 1.2, '#ffd84a'); }
      }} />
      {/* plaquinhas dos moradores de exemplo (sempre com EXEMPLO) */}
      {cam.zoom > 3 && tags.map((g, k) => {
        const p = scr(g.i, g.j, 17);
        return (
          <div key={k} style={{ position: 'absolute', left: p.x, top: p.y, transform: 'translate(-50%, -100%)', fontFamily: F.hud, fontSize: 17, color: C.white, background: 'rgba(12,14,40,0.88)', padding: '3px 8px', boxShadow: `inset 0 0 0 3px ${C.yellow}`, whiteSpace: 'nowrap' }}>
            <span style={{ color: C.yellow }}>EXEMPLO</span> · {g.nome.toUpperCase()} · {g.prof.toUpperCase()}
          </div>
        );
      })}
      {/* marcos da praça */}
      <WorldLabel {...scr(12.5, 16.15, 48)} title="MONUMENTO DA FUNDAÇÃO" icon="star" a={win(t, 5.4, 7.4, 0.3, 0.3)} stem={30} />
      <WorldLabel {...scr(12.5, 11.55, 26)} title="CORETO" sub="EVENTOS DOS MORADORES" icon="heart" a={win(t, 7.0, 8.5, 0.3, 0.25)} stem={26} color={C.cyan} />

      {/* transições de jogo entre os planos */}
      <FxLayer draw={(c) => CUTS.forEach((tc) => tileWipe(c, t, tc))} />

      {/* HUD */}
      <Hud moradores={city.moradores} empregos={vagas} dia={city.dia} hora={clock(t)} show={1 - endA} warnMoradores={!demo} pulseMoradores={win(t, 0, 2.4, 0.01, 0.3) * (0.5 + 0.5 * Math.sin(t * 9))} />
      <Minimap cam={cam} t={t} a={win(t, CUT.rua, CUT.close, 0.3, 0.2)} ping={t < CUT.demo ? { i: 11, j: 26 } : { i: 12.5, j: 13.5 }} />
      {/* gancho: a premissa em 1 quadro */}
      <BigCounter a={clamp(0.7 + t * 2) * (1 - smooth((t - 2.45) / 0.3))} value={0} label="MORADORES" sub="A CIDADE ESTÁ PRONTA · NINGUÉM MORA NELA" blink t={t} y={400} />
      <SimTag a={win(t, CUT.demo + 0.05, CUT.fim - 0.05, 0.25, 0.2)} text="DEMONSTRAÇÃO · MORADORES DE EXEMPLO" />
      <CharacterCard a={smooth((t - 9.3) / 0.35)} out={smooth((t - 11.45) / 0.25)} t={t} app={ANA.aparencia} id={ANA.id} nome={ANA.nome} profissao={ANA.titulo} linhas={['BAIRRO: VILA NOVA · CASA 14', 'TRABALHA NO HOSPITAL', 'CHEGOU NO DIA 01']} exemplo y={380} px={5} />
      {cur && <Cursor x={cur.x} y={cur.y} press={cur.press} clickAge={cur.clickAge} a={win(t, 8.75, 11.6, 0.15, 0.2)} />}
      {/* fecho no amanhecer */}
      {/* logo oficial (o slogan já está no emblema) */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150, opacity: endA, transform: `translateY(${(1 - easeOut(endA)) * 30}px) scale(${0.92 + 0.08 * easeOut(endA)})` }}>
        <Logo size={98} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 470, opacity: endA }}>
        <div style={{ fontFamily: F.pixel, fontSize: 92, color: C.white, textAlign: 'center', lineHeight: 0.95, WebkitTextStroke: `9px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 7px 0 ${C.ink}` }}>
          A CIDADE ESTÁ PRONTA.<br /><span style={{ color: C.yellow }}>FALTA VOCÊ.</span>
        </div>
      </AbsoluteFill>

      {music && <Audio src={music} volume={0.8} />}
      {amb && <Audio src={amb} loop volume={(fr) => interpolate(fr / fps, [0, 0.5, CUT.demo, CUT.demo + 0.5, 14, 15], [0.7, 0.9, 0.9, 0.45, 0.45, 0], { extrapolateRight: 'clamp' })} />}
      {water && <Audio src={water} loop volume={(fr) => 0.7 * win(fr / fps, CUT.demo, CUT.fim, 0.4, 0.4)} />}
      <Sfx at={0.05} name="empty" gain={1.2} />
      <Sfx at={0.15} name="tick" gain={1.2} />
      {CUTS.map((tc) => <Sfx key={tc} at={tc - 0.18} name="ui-move" gain={1.1} />)}
      <Sfx at={CUT.rua + 0.2} name="sparkle" gain={1.1} />
      <Sfx at={CUT.demo + 0.05} name="notify" gain={1.3} />
      <Sfx at={5.4} name="popup" gain={1.2} />
      <Sfx at={7.0} name="popup" gain={1.2} />
      <Sfx at={9.25} name="ui-blip" gain={1.4} />
      <Sfx at={9.3} name="unlock" gain={1.2} />
      <Sfx at={12.3} name="sparkle" gain={1.2} />
      <Sfx at={13.0} name="notify" gain={1.3} />
    </AbsoluteFill>
  );
};

function clock(t: number) {
  const m = 5 * 60 + 12 + Math.floor(t / 2);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
void jobs;
