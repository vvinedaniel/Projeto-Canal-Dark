// "Palco" reutilizável de qualquer vídeo da série: dado o tempo e a direção (planos de câmera, quem está na rua,
// luzes, prédios revelados...), devolve os parâmetros do quadro e utilitários de projeção para HUD e efeitos.
import { getWorld, type World } from '../engine/world';
import { dynamics } from '../engine/dynamics';
import { sx, sy } from '../engine/iso';
import { cameraAt, cameraCuts, toScreen, type Key } from '../utils/camera';
import type { Cam, FrameParams } from '../engine/renderer';
import type { Obj } from '../engine/types';

export interface StageSpec {
  t: number;
  shots: Key[][] | Key[]; // um plano contínuo ou vários com cortes
  frameY?: number; // altura do assunto na tela (0..1); 0,45 deixa espaço para as legendas
  drift?: number;
  night?: number;
  people?: number; // 0..1 pedestres
  traffic?: number; // 0..1 trânsito
  vehicles?: string[]; // frota fixa (ids de engine/traffic FLEET) — substitui a densidade quando informada
  homeFrac?: number; // 0..1 casas acesas (ordem fixa)
  levels?: Partial<FrameParams['levels']>;
  extra?: Obj[]; // personagens/objetos da cena
  overrides?: FrameParams['overrides'];
  reveal?: Set<string>;
  hidden?: Set<string>;
  tilt?: number;
  bloom?: number;
  timeOffset?: number; // desloca o "relógio" da cidade (trânsito/pedestres) sem mexer no roteiro
  dawn?: number; // 0..1 amanhecer
  weather?: { rain?: number; fog?: number };
}

export interface Stage {
  world: World;
  cam: Cam;
  params: FrameParams;
  P: (wx: number, wy: number) => { x: number; y: number };
  scr: (i: number, j: number, z?: number) => { x: number; y: number };
  anchor: (id: string) => { x: number; y: number };
  corners: (id: string, pad?: number) => { x: number; y: number }[]; // pegada do objeto no chão (px de tela)
}

export function stage(s: StageSpec): Stage {
  const world = getWorld();
  const shots = (Array.isArray(s.shots[0]) ? s.shots : [s.shots]) as Key[][];
  const c0 = shots.length > 1 ? cameraCuts(shots, s.t, s.drift ?? 0.9) : cameraAt(shots[0], s.t, s.drift ?? 0.9);
  const cam = { ...c0, y: c0.y + ((0.5 - (s.frameY ?? 0.45)) * 1920) / c0.zoom };
  const d = dynamics(world, { t: s.t + (s.timeOffset ?? 30), traffic: s.traffic ?? 1, people: s.people ?? 1, vehicles: s.vehicles });
  const params: FrameParams = {
    t: s.t, cam, night: s.night ?? 1,
    levels: { civic: 1, home: 1, shop: 1, street: 1, ...s.levels },
    homeFrac: s.homeFrac, dyn: [...d.objs, ...(s.extra ?? [])], refl: d.refl, fireflies: d.flies,
    overrides: s.overrides, reveal: s.reveal, hidden: s.hidden, bloom: s.bloom ?? 0.5, tilt: s.tilt ?? 0, dawn: s.dawn ?? 0, weather: s.weather,
  };
  const P = (wx: number, wy: number) => toScreen(cam, wx, wy);
  const scr = (i: number, j: number, z = 0) => P(sx(i, j), sy(i, j, z));
  const anchor = (id: string) => { const o = world.byId.get(id)!; return P(o.anchor!.x, o.anchor!.y); };
  const corners = (id: string, pad = 0.08) => {
    const o = world.byId.get(id)!;
    const [i0, j0, i1, j1] = o.fp;
    return [[i0 - pad, j0 - pad], [i1 + pad, j0 - pad], [i1 + pad, j1 + pad], [i0 - pad, j1 + pad]].map(([i, j]) => scr(i, j, 0));
  };
  return { world, cam, params, P, scr, anchor, corners };
}

// grau de tilt-shift automático: planos gerais (zoom baixo) ganham o efeito de maquete
export const autoTilt = (zoom: number) => Math.max(0, Math.min(1, (2.2 - zoom) / 0.9));
