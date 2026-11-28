import React from 'react';
import { Audio, Sequence } from 'remotion';
import { asset } from '../utils/audio';

// Volume-base de cada efeito (docs/AUDIO.md): deixa todos ~8 LU abaixo de uma narração em -16 LUFS.
export const SFX_BASE: Record<string, number> = {
  coin: 0.11, notify: 0.16, 'ui-move': 0.18, unlock: 0.2, sparkle: 0.2, levelup: 0.21, popup: 0.23, empty: 0.23,
  'ui-blip': 0.23, stamp: 0.24, firework: 0.24, build: 0.41, tick: 0.47, typing: 0.7,
};

// Efeito sonoro disparado em t (s). Ignorado se o arquivo não existir. gain multiplica o volume-base.
export const Sfx: React.FC<{ at: number; name: string; gain?: number; fps?: number; dur?: number }> = ({ at, name, gain = 1, fps = 30, dur = 3 }) => {
  const src = asset(`audio/sfx/${name}.wav`);
  if (!src) return null;
  return (
    <Sequence from={Math.max(0, Math.round(at * fps))} durationInFrames={Math.round(dur * fps)} layout="none">
      <Audio src={src} volume={Math.min(1, (SFX_BASE[name] ?? 0.3) * gain)} />
    </Sequence>
  );
};
