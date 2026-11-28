// Prévia do kit de interiores (engine/interiors.ts): casa, hospital, oficina, escola, mercado e prefeitura.
// Cada sala é um diorama isométrico em corte, com a mesma técnica e paleta da cidade, e um morador de exemplo.
// Uso nos episódios: interiorSprite(kind) devolve o sprite + luzes; desenhe com escala inteira (vizinho mais próximo).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame } from 'remotion';
import { interiorSprite, INTERIOR_NAMES, type InteriorKind } from '../engine/interiors';
import { personSprite, lookOf, type Pose } from '../engine/sprites/people';
import { appearanceFor, seedOf } from '../engine/characters';
import { sx, sy } from '../engine/iso';
import { jobs } from '../data';
import { loadFonts, useFonts } from '../hooks/useFonts';
import { C, F } from '../components/theme';

const ROOMS: { kind: InteriorKind; job: string | null; at: [number, number]; dir: number; pose: Pose; sub: string }[] = [
  { kind: 'casa', job: null, at: [6.4, 6.6], dir: 0, pose: 'idle', sub: 'SALA · COZINHA' },
  { kind: 'hospital', job: 'medico', at: [6.1, 6.9], dir: 1, pose: 'idle', sub: 'ENFERMARIA' },
  { kind: 'oficina', job: 'mecanico', at: [7.2, 7.4], dir: 1, pose: 'work', sub: 'ELEVADOR · FERRAMENTAS' },
  { kind: 'escola', job: 'professor', at: [5.2, 5.4], dir: 0, pose: 'wave', sub: 'SALA DE AULA' },
  { kind: 'mercado', job: 'comerciante', at: [6.3, 7.45], dir: 0, pose: 'idle', sub: 'GÔNDOLAS · CAIXA' },
  { kind: 'prefeitura', job: 'servidor', at: [6.0, 4.9], dir: 1, pose: 'idle', sub: 'GABINETE' },
];

const cache = new Map<InteriorKind, ReturnType<typeof interiorSprite>>();
const get = (k: InteriorKind) => { let s = cache.get(k); if (!s) { s = interiorSprite(k); cache.set(k, s); } return s; };

const PW = 500, PH = 520, S = 3;

function drawRoom(c: CanvasRenderingContext2D, k: number, frame: number) {
  const r = ROOMS[k];
  const { sprite, lights } = get(r.kind);
  const job = r.job ? jobs.find((j) => j.id === r.job) : undefined;
  const look = lookOf(appearanceFor(seedOf(`interior:${r.kind}`), job?.roupa, r.kind === 'escola' || r.kind === 'hospital' ? { barba: false } : {}));
  const person = personSprite(look, r.dir, Math.floor(frame / 8), `int:${r.kind}`, 1, r.pose);
  const off = new OffscreenCanvas(sprite.w, sprite.h + 4);
  const o = off.getContext('2d')!;
  o.imageSmoothingEnabled = false;
  o.drawImage(sprite.img, 0, 0);
  // morador em pé no chão da sala (posição em tiles → pixels do sprite)
  const px = Math.round(sx(r.at[0], r.at[1]) - sprite.ox), py = Math.round(sy(r.at[0], r.at[1], 0) - sprite.oy);
  o.drawImage(person.img, px + person.ox, py + person.oy);
  // luz: poça quente/fria aditiva + emissivos (TV, monitor, freezer, luminária)
  o.globalCompositeOperation = 'lighter';
  for (const L of lights) {
    const lx = sx(L.i, L.j) - sprite.ox, ly = sy(L.i, L.j, 0) - sprite.oy;
    const col = `rgba(${L.color & 255},${(L.color >> 8) & 255},${(L.color >> 16) & 255},`;
    const g = o.createRadialGradient(lx, ly, 0, lx, ly, L.r * 22);
    g.addColorStop(0, col + '0.16)'); g.addColorStop(1, col + '0)');
    o.fillStyle = g;
    o.fillRect(0, 0, off.width, off.height);
  }
  if (sprite.glow) o.drawImage(sprite.glow, 0, 0);
  o.globalCompositeOperation = 'source-over';
  // painel
  const col = k % 2, row = Math.floor(k / 2);
  const x0 = 30 + col * (PW + 20), y0 = 250 + row * (PH + 20);
  c.fillStyle = 'rgba(20,22,60,0.9)';
  c.fillRect(x0, y0, PW, PH);
  c.strokeStyle = C.edgeDark; c.lineWidth = 4; c.strokeRect(x0 + 2, y0 + 2, PW - 4, PH - 4);
  c.imageSmoothingEnabled = false;
  const dw = off.width * S, dh = off.height * S;
  c.drawImage(off, Math.round(x0 + (PW - dw) / 2), Math.round(y0 + 70 + (PH - 150 - dh) / 2), dw, dh);
  c.fillStyle = C.yellow; c.font = `64px ${F.pixel}`; c.textBaseline = 'top';
  c.fillText(INTERIOR_NAMES[r.kind], x0 + 24, y0 + 14);
  c.fillStyle = C.dim; c.font = `22px ${F.hud}`;
  c.fillText(r.sub, x0 + 24, y0 + PH - 44);
}

export const Interiores: React.FC = () => {
  useFonts();
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  // o canvas só é desenhado depois que as fontes pixel carregaram (senão o texto sai em monospace)
  const [handle] = useState(() => delayRender('interiores'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadFonts().then(() => setReady(true), () => setReady(true));
  }, []);
  useLayoutEffect(() => {
    if (!ready) return;
    const c = ref.current!.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, '#141238'); g.addColorStop(1, '#0a0b1e');
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    c.textBaseline = 'top';
    c.fillStyle = C.white; c.font = `92px ${F.pixel}`; c.fillText('INTERIORES', 30, 70);
    c.fillStyle = C.cyan; c.font = `26px ${F.hud}`; c.fillText('KIT REUTILIZÁVEL · SEGUECITY', 34, 176);
    for (let k = 0; k < ROOMS.length; k++) drawRoom(c, k, frame);
    c.fillStyle = C.dim; c.font = `22px ${F.hud}`;
    c.fillText('MORADORES DE EXEMPLO (FICTÍCIOS)', 34, 1880);
    continueRender(handle);
  }, [frame, ready, handle]);
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} />
    </AbsoluteFill>
  );
};
