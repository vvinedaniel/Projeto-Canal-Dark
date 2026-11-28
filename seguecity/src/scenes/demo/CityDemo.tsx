// FASE 1 — Demo da cidade (15 s): a câmera desce do céu (ilhotas e lua) até a ilha enquanto o entardecer
// vira noite e as luzes acendem; mergulha na praça (o cursor do jogo seleciona a fonte), desliza pelo rio,
// seleciona a prefeitura e termina no plano geral de maquete.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Minimap } from '../../components/hud/Minimap';
import { Cursor, cursorAt } from '../../components/hud/Cursor';
import { FxLayer } from '../../components/fx/FxLayer';
import { selection } from '../../components/fx/fx';
import { Sfx } from '../../components/Sfx';
import { C, F } from '../../components/theme';
import { useFonts } from '../../hooks/useFonts';
import { cameraAt, type Key } from '../../utils/camera';
import { clamp, smooth, win, easeOut } from '../../utils/easing';
import { asset } from '../../utils/audio';
import { stage, autoTilt } from '../../series/stage';
import { personObj, rectWalk } from '../../engine/dynamics';
import { hex } from '../../engine/color';
import { sx, sy } from '../../engine/iso';
import { city, jobs, residents } from '../../data';

export const DEMO_SECONDS = 15;

const KEYS: Key[] = [
  { t: 0.0, i: 14.6, j: 13.4, z: 470, zoom: 1.12 },
  { t: 2.9, i: 15.0, j: 14.6, z: 14, zoom: 1.32 },
  { t: 5.0, i: 12.7, j: 13.7, z: 2, zoom: 4.2 },
  { t: 6.4, i: 13.4, j: 13.0, z: 4, zoom: 4.0 },
  { t: 7.4, i: 21.2, j: 10.9, z: -4, zoom: 3.5 },
  { t: 9.0, i: 22.9, j: 13.6, z: -4, zoom: 3.4 },
  { t: 10.2, i: 13.4, j: 8.4, z: 26, zoom: 3.2 },
  { t: 12.1, i: 13.9, j: 8.6, z: 26, zoom: 3.0 },
  { t: 13.7, i: 15.4, j: 14.6, z: 10, zoom: 1.36 },
  { t: 15.0, i: 15.6, j: 15.2, z: 10, zoom: 1.24 },
];
const vagasEm = (predio: string) => jobs.filter((j) => j.predio === predio).reduce((s, j) => s + j.vagas, 0);

export const CityDemo: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const night = interpolate(t, [0, 3.2], [0.56, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // moradores cadastrados (data/residents.json) passeiam pela praça com plaquinha de nome
  const extra = residents.slice(0, 6).map((r, k) => {
    const job = jobs.find((j) => j.id === r.profissao);
    const look = { skin: hex(['#f2c9a0', '#d9a273', '#b0774c', '#8a5634'][k % 4]), hair: hex('#2a1d18'), shirt: hex(job?.roupa.camisa ?? '#e25a4a'), pants: hex(job?.roupa.calca ?? '#2a3a6a'), shoes: hex('#1a1a20'), hat: null, long: k % 2 === 1 };
    const w = rectWalk(10.95, 11.95, 14.05, 15.05, k * 2.07 + t * 0.4, k % 2 === 1);
    return { r, job, w, obj: personObj(`res-${r.id}`, look, `res-${r.id}`, w.i, w.j, w.dir, Math.floor(t * 4 + k) % 4, 1, 0.6) };
  });

  const zoomNow = cameraAt(KEYS, t).zoom;
  const S = stage({ t, shots: KEYS, night, people: 1, traffic: 1, extra: extra.map((e) => e.obj), tilt: autoTilt(zoomNow) * 0.9, timeOffset: 20 });
  const { cam, anchor, corners, scr } = S;
  const fountain = scr(12.5, 13.5, 24);
  const pref = anchor('prefeitura'), hosp = anchor('hospital');

  // cursor do jogador: entra pela direita, clica na fonte, depois na prefeitura
  const fClick = scr(12.5, 13.5, 6), pClick = scr(12.5, 8.4, 18);
  const cur = cursorAt([
    { t: 4.4, x: 1000, y: 1150 },
    { t: 5.15, x: fClick.x, y: fClick.y, click: true },
    { t: 6.6, x: fClick.x + 40, y: fClick.y + 30 },
    { t: 9.4, x: 880, y: 1100 },
    { t: 10.05, x: pClick.x, y: pClick.y, click: true },
    { t: 12.4, x: pClick.x + 20, y: pClick.y + 40 },
  ], t);
  const curA = win(t, 4.4, 6.9, 0.3, 0.4) + win(t, 9.3, 12.6, 0.3, 0.4);

  const music = asset('audio/music/demo.wav');
  const amb = asset('audio/sfx/night-ambience.wav');
  const water = asset('audio/sfx/water.wav');
  const title = win(t, 0.25, 3.0, 0.5, 0.5);
  const endA = smooth((t - 13.1) / 0.6);
  const fountainSel = win(t, 5.15, 6.8, 0.15, 0.3);
  const prefSel = win(t, 10.05, 12.5, 0.15, 0.3);
  const fountainFp = [[11.4, 12.4], [13.6, 12.4], [13.6, 14.6], [11.4, 14.6]].map(([i, j]) => scr(i, j, 0));

  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={S.params} />
      <FxLayer draw={(c) => {
        const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
        selection(c, fountainFp.map(q), t, fountainSel, '#5af2ff');
        selection(c, corners('prefeitura').map(q), t, prefSel);
      }} />
      {/* rótulos de jogo */}
      <WorldLabel x={fountain.x} y={fountain.y} title="PRAÇA CENTRAL" sub="FONTE · BANCOS · PIPOCA" icon="star" a={fountainSel} stem={120} color={C.cyan} />
      <WorldLabel x={pref.x} y={pref.y} title="PREFEITURA" sub="CORAÇÃO DA CIDADE" icon="crown" a={prefSel} stem={40} />
      <WorldLabel x={hosp.x} y={hosp.y} title="HOSPITAL" sub={`${vagasEm('hospital')} VAGAS`} icon="cross" a={win(t, 10.7, 12.5, 0.3, 0.3)} stem={30} color={C.red} align="right" />
      {cam.zoom > 2.6 && extra.map((e, k) => {
        const g = scr(e.w.i, e.w.j, 18);
        return (
          <div key={k} style={{ position: 'absolute', left: g.x, top: g.y, transform: 'translate(-50%, -100%)', fontFamily: F.hud, fontSize: 18, color: C.white, background: 'rgba(12,14,40,0.85)', padding: '3px 8px', boxShadow: `inset 0 0 0 3px ${e.r.ficticio ? C.yellow : C.cyan}`, whiteSpace: 'nowrap' }}>
            {e.r.nome.toUpperCase()} · {(e.job?.nome ?? e.r.profissao).toUpperCase()}
          </div>
        );
      })}
      {/* título de abertura */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 470, opacity: title, transform: `translateY(${(1 - easeOut(clamp(t / 0.8))) * 40}px)` }}>
        <Logo size={118} />
        <div style={{ marginTop: 26, fontFamily: F.hud, fontSize: 30, color: C.white, letterSpacing: 3, textShadow: '0 4px 0 #000' }}>VOCÊ SEGUE. VOCÊ MORA. VOCÊ DECIDE.</div>
      </AbsoluteFill>
      {/* HUD */}
      <Hud moradores={city.moradores} empregos={city.empregos.total - city.empregos.ocupados} dia={city.dia} hora={clock(t)} show={smooth((t - 2.6) / 0.6)} pulseMoradores={win(t, 13.4, 14.4, 0.2, 0.4)} />
      <Minimap cam={cam} t={t} a={smooth((t - 3.0) / 0.5) * (1 - smooth((t - 13.0) / 0.5))} ping={t < 7 ? { i: 12.5, j: 13.5 } : t > 9.6 && t < 12.6 ? { i: 12.5, j: 7 } : null} />
      {cur && <Cursor x={cur.x} y={cur.y} press={cur.press} clickAge={cur.clickAge} a={curA} />}
      {/* fecho */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 430, opacity: endA }}>
        <div style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: 92, color: C.white, textAlign: 'center', lineHeight: 0.95, textShadow: `0 6px 0 ${C.purpleDark}, 4px 8px 0 #000` }}>
          A CIDADE ESTÁ PRONTA.<br /><span style={{ color: C.yellow }}>FALTA VOCÊ.</span>
        </div>
      </AbsoluteFill>
      {music && <Audio src={music} volume={0.8} />}
      {amb && <Audio src={amb} loop volume={(fr) => interpolate(fr, [0, 20, 420, 450], [0, 0.55, 0.55, 0], { extrapolateRight: 'clamp' })} />}
      {water && <Audio src={water} loop volume={(fr) => 0.7 * Math.max(win(fr / fps, 4.2, 7.0, 0.5, 0.5), win(fr / fps, 6.8, 9.6, 0.5, 0.5))} />}
      <Sfx at={0.3} name="sparkle" gain={1.4} />
      <Sfx at={2.9} name="ui-move" gain={1.4} />
      <Sfx at={4.4} name="ui-blip" gain={1.2} />
      <Sfx at={5.15} name="popup" gain={1.4} />
      <Sfx at={6.7} name="ui-move" gain={1.2} />
      <Sfx at={9.4} name="ui-blip" gain={1.2} />
      <Sfx at={10.05} name="popup" gain={1.4} />
      <Sfx at={10.7} name="ui-blip" gain={1.2} />
      <Sfx at={13.1} name="notify" gain={1.3} />
      <Sfx at={13.4} name="tick" gain={1.2} />
    </AbsoluteFill>
  );
};

function clock(t: number) {
  const m = 21 * 60 + 38 + Math.floor(t / 3);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
void sx; void sy;
