// FASE 1 — Demo da cidade (15 s): entardecer vira noite, câmera passeia por praça, rio e prefeitura, termina no plano geral.
import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Sfx } from '../../components/Sfx';
import { C, F } from '../../components/theme';
import { useFonts } from '../../hooks/useFonts';
import { cameraAt, toScreen, type Key } from '../../utils/camera';
import { clamp, smooth, win, easeOut } from '../../utils/easing';
import { asset } from '../../utils/audio';
import { getWorld } from '../../engine/world';
import { dynamics } from '../../engine/dynamics';
import { city, residents } from '../../data';

export const DEMO_SECONDS = 15;

const KEYS: Key[] = [
  { t: 0, i: 15.5, j: 15.5, z: 10, zoom: 1.18 },
  { t: 3.0, i: 13.5, j: 14.5, z: 4, zoom: 2.1 },
  { t: 5.6, i: 12.6, j: 13.8, z: 0, zoom: 4.2 },
  { t: 8.4, i: 21.5, j: 12.0, z: -2, zoom: 3.6 },
  { t: 11.2, i: 13.0, j: 8.6, z: 20, zoom: 3.3 },
  { t: 13.4, i: 15.5, j: 14.0, z: 8, zoom: 1.65 },
  { t: 15.0, i: 15.6, j: 14.6, z: 8, zoom: 1.5 },
];

export const CityDemo: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const world = getWorld();
  const cam = cameraAt(KEYS, t, 0.8);
  const night = interpolate(t, [0, 3.2], [0.56, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const d = dynamics(world, { t: t + 20, traffic: 1, people: 1 });
  const anchor = (id: string) => { const o = world.byId.get(id)!; return toScreen(cam, o.anchor!.x, o.anchor!.y); };
  const fountain = toScreen(cam, world.fountainJet.x, world.fountainJet.y);
  const pref = anchor('prefeitura');
  const hosp = anchor('hospital');
  const music = asset('audio/music/demo.wav');
  const amb = asset('audio/sfx/night-ambience.wav');
  const title = win(t, 0.25, 3.0, 0.5, 0.5);
  const endA = smooth((t - 12.9) / 0.6);
  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={{ t, cam, night, levels: { civic: 1, home: 1, shop: 1, street: 1 }, dyn: d.objs, refl: d.refl, bloom: 0.8 }} />
      {/* rótulos de jogo */}
      <WorldLabel x={fountain.x} y={fountain.y} title="PRAÇA CENTRAL" sub="FONTE · BANCOS · PIPOCA" icon="star" a={win(t, 4.3, 7.0, 0.35, 0.3)} stem={140} />
      <WorldLabel x={pref.x} y={pref.y} title="PREFEITURA" sub="CORAÇÃO DA CIDADE" icon="crown" a={win(t, 9.9, 12.4, 0.35, 0.3)} stem={40} />
      <WorldLabel x={hosp.x} y={hosp.y} title="HOSPITAL" sub="8 VAGAS" icon="cross" a={win(t, 10.6, 12.4, 0.35, 0.3)} stem={30} color={C.red} align="right" />
      {/* título de abertura */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 430, opacity: title, transform: `translateY(${(1 - easeOut(clamp(t / 0.8))) * 40}px)` }}>
        <Logo size={118} />
        <div style={{ marginTop: 26, fontFamily: F.hud, fontSize: 30, color: C.white, letterSpacing: 3, textShadow: '0 4px 0 #000' }}>VOCÊ SEGUE. VOCÊ MORA. VOCÊ DECIDE.</div>
      </AbsoluteFill>
      {/* HUD */}
      <Hud moradores={city.moradores + residents.length * 0} empregos={city.empregos.total - city.empregos.ocupados} dia={city.dia} hora={clock(t)} show={smooth((t - 2.6) / 0.6)} pulseMoradores={win(t, 13.2, 14.3, 0.2, 0.4)} />
      {/* fecho */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 430, opacity: endA }}>
        <div style={{ fontFamily: F.pixel, fontWeight: 400, fontSize: 92, color: C.white, textAlign: 'center', lineHeight: 0.95, textShadow: `0 6px 0 ${C.purpleDark}, 4px 8px 0 #000` }}>
          A CIDADE ESTÁ PRONTA.<br /><span style={{ color: C.yellow }}>FALTA VOCÊ.</span>
        </div>
      </AbsoluteFill>
      {music && <Audio src={music} volume={0.8} />}
      {amb && <Audio src={amb} volume={(fr) => interpolate(fr, [0, 20, 420, 450], [0, 0.5, 0.5, 0], { extrapolateRight: 'clamp' })} />}
      <Sfx at={0.3} name="sparkle" gain={1.4} />
      <Sfx at={2.7} name="ui-move" gain={1.4} />
      <Sfx at={4.3} name="popup" gain={1.4} />
      <Sfx at={6.6} name="ui-move" gain={1.4} />
      <Sfx at={9.9} name="popup" gain={1.4} />
      <Sfx at={10.6} name="ui-blip" gain={1.4} />
      <Sfx at={12.9} name="notify" gain={1.4} />
      <Sfx at={13.2} name="tick" gain={1.4} />
    </AbsoluteFill>
  );
};

function clock(t: number) {
  const m = 21 * 60 + 38 + Math.floor(t / 3);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
