// Moldura comum dos episódios: fontes, legendas, trilha com abaixamento sob a narração, ambiente e efeitos.
import React from 'react';
import { AbsoluteFill, Audio, interpolate, useVideoConfig } from 'remotion';
import { Captions, type Block } from '../components/Captions';
import { Sfx } from '../components/Sfx';
import { asset } from '../utils/audio';
import { lerp } from '../utils/easing';
import { useFonts } from '../hooks/useFonts';

export interface Cue { at: number; name: string; gain?: number; dur?: number }
export interface ShellProps {
  t: number;
  blocks: Block[];
  speaking: (t: number) => boolean;
  narration: string[]; // caminhos possíveis em /public (o primeiro que existir)
  music: string;
  musicLevels?: { alone: number; underVoice: number; betweenLines: number };
  ambience?: { file: string; points: [number, number][] }[]; // [t, volume]
  cues: Cue[];
  captionY?: number;
  children: React.ReactNode;
}

export const EpisodeShell: React.FC<ShellProps> = ({ t, blocks, speaking, narration, music, musicLevels = { alone: 0.78, underVoice: 0.34, betweenLines: 0.5 }, ambience = [], cues, captionY = 1355, children }) => {
  useFonts();
  const { fps } = useVideoConfig();
  const narr = narration.map((p) => asset(p)).find(Boolean) ?? null;
  const mus = asset(music);
  const musicVol = (fr: number) => {
    const tt = fr / fps;
    if (!narr) return musicLevels.alone;
    const sp = [-0.12, 0, 0.12].map((dt) => (speaking(tt + dt) ? 1 : 0) as number).reduce((s, x) => s + x, 0) / 3;
    return lerp(musicLevels.betweenLines, musicLevels.underVoice, sp);
  };
  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      {children}
      <Captions blocks={blocks} t={t} y={captionY} size={112} />
      {narr && <Audio src={narr} volume={1} />}
      {mus && <Audio src={mus} volume={musicVol} />}
      {ambience.map((a) => {
        const src = asset(a.file);
        if (!src) return null;
        const xs = a.points.map((p) => p[0]), ys = a.points.map((p) => p[1]);
        return <Audio key={a.file} src={src} loop volume={(fr) => interpolate(fr / fps, xs, ys, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })} />;
      })}
      {cues.map((c, k) => <Sfx key={k} at={c.at} name={c.name} gain={c.gain} dur={c.dur} />)}
    </AbsoluteFill>
  );
};
