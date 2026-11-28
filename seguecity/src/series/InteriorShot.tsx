// Plano de interior (reutilizável na série): a sala em corte de engine/interiors.ts em tela cheia, ampliada
// em "sharp-bilinear" (escala inteira com vizinho mais próximo + o resto bilinear), com empurrão lento de
// câmera, luz da sala, morador opcional (aparência persistente) e rótulos presos a pontos da sala.
import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill } from 'remotion';
import { interiorSprite, type InteriorKind } from '../engine/interiors';
import { personSprite, lookOf, type Pose } from '../engine/sprites/people';
import { sx, sy } from '../engine/iso';
import type { Appearance } from '../engine/characters';
import { WorldLabel } from '../components/hud/WorldLabel';
import { clamp, lerp, smooth } from '../utils/easing';

export interface InteriorPerson { app: Appearance; key: string; i: number; j: number; dir: number; pose: Pose; to?: { i: number; j: number; t0: number; t1: number } }
export interface InteriorLabel { i: number; j: number; z: number; title: string; sub?: string; icon?: string; color?: string; a: number }

const rooms = new Map<InteriorKind, ReturnType<typeof interiorSprite>>();
const room = (k: InteriorKind) => { let r = rooms.get(k); if (!r) { r = interiorSprite(k); rooms.set(k, r); } return r; };

export const InteriorShot: React.FC<{
  kind: InteriorKind; t: number; t0: number; t1: number; person?: InteriorPerson | null; labels?: InteriorLabel[];
  zoom?: [number, number]; cy?: number; lightsOn?: number;
}> = ({ kind, t, t0, t1, person, labels = [], zoom = [5.3, 5.9], cy = 960, lightsOn = 1 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const u = clamp((t - t0) / Math.max(0.01, t1 - t0));
  const S = lerp(zoom[0], zoom[1], smooth(u));
  const dx = lerp(-16, 16, u);
  const { sprite } = room(kind);
  // centro da sala (tiles 4..8) em px do sprite
  const rcx = sx(6, 6) - sprite.ox, rcy = sy(6, 6, 8) - sprite.oy;
  const toScreen = (i: number, j: number, z: number) => ({ x: 540 + dx + (sx(i, j) - sprite.ox - rcx) * S, y: cy + (sy(i, j, z) - sprite.oy - rcy) * S });

  useLayoutEffect(() => {
    const c = ref.current!.getContext('2d')!;
    const { sprite: sp, lights } = room(kind);
    // fundo: azul-noite com grade de pixels e vinheta
    const g = c.createLinearGradient(0, 0, 0, 1920);
    g.addColorStop(0, '#171543'); g.addColorStop(0.6, '#0e0f2c'); g.addColorStop(1, '#07081a');
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    c.fillStyle = 'rgba(122,78,224,0.07)';
    for (let x = ((dx * 0.4) % 48 + 48) % 48; x < 1080; x += 48) c.fillRect(Math.round(x), 0, 2, 1920);
    for (let y = 0; y < 1920; y += 48) c.fillRect(0, y, 1080, 2);
    // sala + morador numa tela do tamanho do sprite
    const off = new OffscreenCanvas(sp.w, sp.h + 2);
    const o = off.getContext('2d')!;
    o.imageSmoothingEnabled = false;
    o.drawImage(sp.img, 0, 0);
    if (person) {
      let pi = person.i, pj = person.j, walking = false;
      if (person.to) { const f = clamp((t - person.to.t0) / (person.to.t1 - person.to.t0)); pi = lerp(person.i, person.to.i, f); pj = lerp(person.j, person.to.j, f); walking = f > 0 && f < 1; }
      const pose: Pose = walking ? 'walk' : person.pose;
      const fr = Math.floor(t * (walking ? 6 : 2.5)) % 4;
      const ps = personSprite(lookOf(person.app), person.dir, fr, person.key, 1, pose);
      o.drawImage(ps.img, Math.round(sx(pi, pj) - sp.ox + ps.ox), Math.round(sy(pi, pj, 0) - sp.oy + ps.oy));
    }
    // luz da sala (aditiva) e emissivos (TV, monitores, freezer)
    o.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      const lx = sx(L.i, L.j) - sp.ox, ly = sy(L.i, L.j, 0) - sp.oy;
      const col = `rgba(${L.color & 255},${(L.color >> 8) & 255},${(L.color >> 16) & 255},`;
      const rg = o.createRadialGradient(lx, ly, 0, lx, ly, L.r * 22);
      rg.addColorStop(0, col + (0.17 * lightsOn).toFixed(3) + ')'); rg.addColorStop(1, col + '0)');
      o.fillStyle = rg; o.fillRect(0, 0, off.width, off.height);
    }
    if (sp.glow) o.drawImage(sp.glow, 0, 0);
    o.globalCompositeOperation = 'source-over';
    // ampliação: inteiro (vizinho) + fração (bilinear)
    const k = Math.max(1, Math.floor(S));
    const big = new OffscreenCanvas(off.width * k, off.height * k);
    const b = big.getContext('2d')!;
    b.imageSmoothingEnabled = false;
    b.drawImage(off, 0, 0, big.width, big.height);
    const w = off.width * S, h = off.height * S;
    const x0 = 540 + dx - rcx * S, y0 = cy - rcy * S;
    // sombra da maquete no "chão" do estúdio
    const sh = c.createRadialGradient(540 + dx, y0 + h * 0.93, 10, 540 + dx, y0 + h * 0.93, w * 0.55);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sh; c.fillRect(0, y0 + h * 0.6, 1080, h * 0.7);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    c.drawImage(big, x0, y0, w, h);
    // vinheta
    const v = c.createRadialGradient(540, 900, 380, 540, 900, 1150);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
    c.fillStyle = v; c.fillRect(0, 0, 1080, 1920);
  });

  return (
    <AbsoluteFill>
      <canvas ref={ref} width={1080} height={1920} style={{ position: 'absolute', inset: 0 }} />
      {labels.map((L, k) => { const p = toScreen(L.i, L.j, L.z); return <WorldLabel key={k} x={p.x} y={p.y} title={L.title} sub={L.sub} icon={L.icon} a={L.a} stem={46} color={L.color} />; })}
    </AbsoluteFill>
  );
};
