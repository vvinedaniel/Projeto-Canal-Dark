// EPISÓDIO 01 — A FUNDAÇÃO: "Construí uma cidade inteira, mas ninguém mora nela." (75 s, narração oficial)
// Tudo é função pura de t e ancorado nas palavras da narração (W('palavra'), words.json).
// Estrutura: planos (cidade ou interior) com corte em ladrilhos → estado da cidade por quadro (stage) → interface
// → moldura comum (EpisodeShell: legendas, voz, trilha com abaixamento, ambientes, efeitos sonoros).
// Honestidade: a cidade está no estado gravado (0 moradores); personagens são EXEMPLO e o crescimento é SIMULAÇÃO.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Toast } from '../../components/hud/Toast';
import { Minimap } from '../../components/hud/Minimap';
import { Cursor, cursorAt, type CursorKey } from '../../components/hud/Cursor';
import { BigCounter, CommentCard, Stamp, SimTag, GrowthBar, GoalsPanel, CtaButton } from '../../components/hud/Panels';
import { CharacterCard } from '../../components/hud/CharacterCard';
import { makeBlocks } from '../../components/Captions';
import { FxLayer } from '../../components/fx/FxLayer';
import { sparkles, dust, searchlights, marker, glitch, selection, tileWipe } from '../../components/fx/fx';
import { C, F } from '../../components/theme';
import { cameraCuts, type Key } from '../../utils/camera';
import { getWorld } from '../../engine/world';
import { clamp, smooth, win, easeOut, lerp } from '../../utils/easing';
import { stage, autoTilt } from '../../series/stage';
import { EpisodeShell, type Cue } from '../../series/EpisodeShell';
import { InteriorShot, type InteriorLabel } from '../../series/InteriorShot';
import { personObj } from '../../engine/dynamics';
import { lookOf } from '../../engine/sprites/people';
import { appearanceFor, seedOf } from '../../engine/characters';
import { hash2 } from '../../engine/rng';
import type { Obj } from '../../engine/types';
import { buildings, episodes, jobs } from '../../data';
// o Ep. 01 mostra sempre o estado oficial do Dia 01 (snapshot), não o estado vivo da cidade
import DIA01 from '../../../data/snapshots/dia-01.json';
import { EXEMPLOS } from '../../data/exemplos';
import { WORDS, W, speaking } from './narration';
import { JobPicker, SlotCard, StatPanel, type JobCard } from './ui';

export const EP01_SECONDS = 75;
const EP = episodes.find((e) => e.id === 'ep01')!;
const ANA = EXEMPLOS[0];
const city = DIA01.cidade;
const WORKPLACES = [...new Set(DIA01.profissoes.map((j) => j.predio))];

// ---------------- âncoras da fala ----------------
const A = {
  zero: W('zero'), problema: W('problema'), ninguem: W('ninguém'),
  casas: W('casas'), escola: W('escola'), hospital: W('hospital'), comercio: W('comércio'), prefeitura: W('prefeitura'),
  pronto: W('pronto'), esperando: W('esperando'), voce: W('você', 19), seguidor: W('seguidor'), cidadao: W('cidadão'),
  escolher: W('escolher'), nome: W('nome', 27), profissao: W('profissão', 28), acompanhar: W('acompanhar'), vivendo: W('vivendo'),
  medico: W('médico'), policial: W('policial'), empresario: W('empresário'), mecanico: W('mecânico'), professor: W('professor'),
  precisa: W('precisa'), pessoas: W('pessoas'), conforme: W('conforme'), bairros: W('bairros'), construidos: W('construídos'),
  empresas: W('empresas'), acontecimentos: W('acontecimentos'), mudar: W('mudar'), destino: W('destino'),
  cem: W('cem'), liberar: W('liberar'), eleicao: W('eleição'), voces: W('vocês'), governar: W('governar'),
  hoje: W('hoje', 60), comente: W('comente'), nome2: W('nome', 63), primeiro: W('primeiro', 66), morador: W('morador', 66),
};

// ---------------- planos (cortes cobertos por transição em ladrilhos) ----------------
const T = {
  hook: 0, rua: 3.45, vazio: 6.8, tour: 9.3, pref: 12.25, iCasa: 14.65, iHosp: 16.5, voce: 18.85, seguir: 21.2, casa: 24.3,
  ana: 26.8, iAna: 31.15, jobs: 33.5, vagas: 38.45, cresce: 42.45, bairro: 44.95, evento: 47.6, eleicao: 51.3, iGab: 56.9,
  governar: 59.15, hoje: 61.2, comente: 63.55, primeiro: 66.05, fim: 69.0,
};
const CUTS = Object.values(T).filter((x) => x > 0);
const INTERIORS: [number, number][] = [[T.iCasa, T.voce], [T.iAna, T.jobs], [T.iGab, T.governar]];
const inInterior = (t: number) => INTERIORS.some(([a, b]) => t >= a && t < b);

// alvo em tiles (i, j), altura z (px) e zoom (px de saída por px de mundo); a câmera nunca para
const SHOTS: Key[][] = [
  [{ t: T.hook, i: 14.0, j: 13.2, z: 0, zoom: 1.95 }, { t: T.rua, i: 15.2, j: 15.0, z: -6, zoom: 1.42 }],
  [{ t: T.rua, i: 7.6, j: 26.9, z: 8, zoom: 3.4 }, { t: T.vazio, i: 11.8, j: 27.1, z: 8, zoom: 3.7 }],
  [{ t: T.vazio, i: 11.8, j: 26.4, z: 4, zoom: 2.25 }, { t: T.tour, i: 11.4, j: 26.6, z: 4, zoom: 2.45 }],
  [{ t: T.tour, i: 12.4, j: 16.8, z: 6, zoom: 1.75 }, { t: T.pref, i: 12.6, j: 13.4, z: 10, zoom: 1.95 }],
  [{ t: T.pref, i: 12.4, j: 9.6, z: 18, zoom: 2.9 }, { t: T.iCasa, i: 12.6, j: 9.0, z: 22, zoom: 3.2 }],
  [{ t: T.voce, i: 13.0, j: 15.0, z: 4, zoom: 4.6 }, { t: T.seguir, i: 13.0, j: 14.9, z: 6, zoom: 5.0 }],
  [{ t: T.seguir, i: 13.0, j: 15.2, z: 6, zoom: 3.8 }, { t: T.casa, i: 13.1, j: 15.3, z: 6, zoom: 4.3 }],
  [{ t: T.casa, i: 7.0, j: 27.6, z: 10, zoom: 4.6 }, { t: T.ana, i: 7.3, j: 27.6, z: 10, zoom: 5.0 }],
  [{ t: T.ana, i: 7.3, j: 27.8, z: 14, zoom: 5.6 }, { t: T.iAna, i: 8.5, j: 27.9, z: 14, zoom: 6.3 }],
  [{ t: T.jobs, i: 13.5, j: 13.0, z: 10, zoom: 2.4 }, { t: T.vagas, i: 15.5, j: 10.5, z: 14, zoom: 2.6 }],
  [{ t: T.vagas, i: 13.0, j: 14.5, z: 10, zoom: 1.6 }, { t: T.cresce, i: 13.2, j: 14.0, z: 10, zoom: 1.75 }],
  [{ t: T.cresce, i: 11.0, j: 23.5, z: 4, zoom: 1.85 }, { t: T.bairro, i: 11.8, j: 23.0, z: 4, zoom: 2.1 }],
  [{ t: T.bairro, i: 17.7, j: 21.0, z: 14, zoom: 3.2 }, { t: T.evento, i: 18.0, j: 20.7, z: 20, zoom: 3.5 }],
  [{ t: T.evento, i: 13.5, j: 16.0, z: 4, zoom: 1.7 }, { t: T.eleicao, i: 13.0, j: 14.6, z: 6, zoom: 2.2 }],
  [{ t: T.eleicao, i: 12.5, j: 9.4, z: 20, zoom: 2.5 }, { t: T.iGab, i: 12.5, j: 9.0, z: 26, zoom: 2.9 }],
  [{ t: T.governar, i: 12.4, j: 9.3, z: 24, zoom: 4.2 }, { t: T.hoje, i: 12.6, j: 9.0, z: 28, zoom: 4.6 }],
  [{ t: T.hoje, i: 14.0, j: 14.0, z: -10, zoom: 2.2 }, { t: T.comente, i: 15.4, j: 15.4, z: -14, zoom: 1.5 }],
  [{ t: T.comente, i: 10.0, j: 26.2, z: 6, zoom: 2.6 }, { t: T.primeiro, i: 11.0, j: 26.6, z: 6, zoom: 2.9 }],
  [{ t: T.primeiro, i: 5.2, j: 27.0, z: 10, zoom: 4.6 }, { t: T.fim, i: 5.4, j: 26.9, z: 12, zoom: 5.2 }],
  [{ t: T.fim, i: 13.0, j: 17.0, z: 40, zoom: 2.2 }, { t: 71.5, i: 15.2, j: 16.2, z: 30, zoom: 1.65 }, { t: 75, i: 16.0, j: 15.6, z: 26, zoom: 1.5 }],
];
// altura do assunto na tela: painéis no alto empurram o assunto para baixo (legendas ficam em 64–77%)
const FRAME_Y: [number, number][] = [[T.hook, 0.5], [T.rua, 0.47], [T.tour, 0.48], [T.ana, 0.62], [T.jobs, 0.66], [T.vagas, 0.56], [T.cresce, 0.5], [T.eleicao, 0.66], [T.governar, 0.52], [T.hoje, 0.5], [T.comente, 0.62], [T.primeiro, 0.56], [T.fim, 0.46]];
const frameY = (t: number) => FRAME_Y.reduce((y, [a, v]) => (t >= a ? v : y), 0.47);

// ---------------- "construí do zero": prédios sobem do chão em onda, desde o 1º quadro ----------------
const world0 = getWorld();
const BUILT = world0.objects
  .filter((o) => o.ref && buildings.some((b) => b.id === o.ref && b.status !== 'planejado'))
  .map((o) => ({ o, d: Math.hypot((o.fp[0] + o.fp[2]) / 2 - 12.5, (o.fp[1] + o.fp[3]) / 2 - 12) }))
  .sort((a, b) => a.d - b.d)
  .map(({ o }, k, arr) => ({ id: o.id, o, t0: -0.35 + (2.55 * k) / (arr.length - 1) + hash2(k, 7) * 0.08 }));
const RISE = 0.5;
const FUTURE: [string, number][] = [['futuro-1', A.bairros + 0.05], ['futuro-4', A.bairros + 0.3], ['futuro-3', A.construidos], ['futuro-2', A.empresas + 0.05]];

// ---------------- profissões faladas (menu) ----------------
const UNI = (id: string) => jobs.find((j) => j.id === id)!.roupa;
const CARDS: JobCard[] = [
  { at: A.medico, nome: 'MÉDICO', app: ANA.aparencia, id: 'pick-medico', color: C.red, icon: 'cross' },
  { at: A.policial, nome: 'POLICIAL', app: EXEMPLOS[3].aparencia, id: 'pick-policial', color: '#7eaee0', icon: 'badge' },
  { at: A.empresario, nome: 'EMPRESÁRIO', app: appearanceFor(seedOf('exemplo:empresario'), { camisa: '#2d3047', calca: '#2d3047', extra: 'gravata' }), id: 'pick-empresario', color: C.green, icon: 'building' },
  { at: A.mecanico, nome: 'MECÂNICO', app: EXEMPLOS[1].aparencia, id: 'pick-mecanico', color: C.cyan, icon: 'wrench' },
  { at: A.professor, nome: 'PROFESSOR', app: appearanceFor(seedOf('exemplo:professor'), UNI('professor'), { estilo: 'curto' }), id: 'pick-professor', color: C.yellow, icon: 'book' },
];

// ---------------- personagem de exemplo (Ana) ----------------
function anaAt(t: number): { i: number; j: number; dir: number; fr: number; pose: 'walk' | 'idle' | 'wave'; ghost: number } | null {
  if (t >= T.voce && t < T.casa) { // holograma "VOCÊ?" na praça que vira cidadã ao clicar em SEGUIR
    const ghost = 1 - smooth((t - (A.seguidor + 0.15)) / 0.6);
    const walk = t > A.seguidor + 0.7;
    return { i: 13.2 + (walk ? (t - A.seguidor - 0.7) * 0.32 : 0), j: 15.45, dir: 0, fr: walk ? Math.floor(t * 4.2) % 4 : 0, pose: walk ? 'walk' : t > A.voce && t < A.voce + 1.3 ? 'wave' : 'idle', ghost };
  }
  if (t >= T.casa && t < T.ana) { // chega em casa (Casa 14, Vila Nova)
    const f = clamp((t - T.casa) / 1.6);
    return f < 1 ? { i: 6.0 + f * 1.0, j: 27.83, dir: 0, fr: Math.floor(t * 4.2) % 4, pose: 'walk', ghost: 0 } : { i: 7.0, j: 27.83 - smooth((t - T.casa - 1.6) / 0.6) * 0.25, dir: 3, fr: Math.floor(t * 4.2) % 4, pose: t > T.casa + 2.2 ? 'idle' : 'walk', ghost: 0 };
  }
  if (t >= T.ana && t < T.iAna) { // passeio pela rua
    const wave = t > A.acompanhar + 0.3 && t < A.acompanhar + 1.4;
    return { i: 7.1 + (t - T.ana) * 0.33, j: 27.83, dir: 0, fr: wave ? 0 : Math.floor(t * 4.2) % 4, pose: wave ? 'wave' : 'walk', ghost: 0 };
  }
  return null;
}

// ---------------- efeitos sonoros (todos ancorados na fala) ----------------
const TYPED = 'Ana — médica';
const CUES: Cue[] = [
  { at: 0.0, name: 'stamp', gain: 1.1 },
  ...[0.2, 0.75, 1.3, 1.85, 2.4].map((at, k) => ({ at, name: 'build', gain: 0.75 + 0.05 * k })),
  { at: 2.95, name: 'levelup', gain: 0.9 },
  { at: T.rua + 0.9, name: 'ui-blip' }, { at: A.problema, name: 'empty', gain: 1.2 },
  { at: A.ninguem, name: 'tick' }, { at: A.ninguem + 0.35, name: 'popup', gain: 0.8 },
  ...[A.casas, A.escola, A.hospital, A.comercio, A.prefeitura].map((at) => ({ at: at + 0.02, name: 'popup' })),
  { at: T.iCasa, name: 'ui-move' }, { at: A.pronto, name: 'stamp' }, { at: T.iHosp, name: 'ui-move' }, { at: A.esperando + 0.9, name: 'tick' },
  { at: A.voce - 0.05, name: 'sparkle', gain: 1.2 },
  { at: T.seguir + 0.3, name: 'popup' }, { at: A.seguidor, name: 'ui-blip', gain: 1.3 }, { at: A.seguidor + 0.15, name: 'sparkle', gain: 1.2 },
  { at: A.cidadao, name: 'coin' }, { at: A.cidadao + 0.2, name: 'unlock' },
  { at: A.escolher - 0.25, name: 'notify' },
  ...Array.from({ length: TYPED.length }, (_, k) => ({ at: A.escolher + 0.15 + (k * 1.5) / TYPED.length, name: 'typing', gain: 0.75, dur: 0.3 })),
  { at: A.acompanhar - 0.05, name: 'popup' }, { at: T.iAna, name: 'ui-move' },
  { at: T.jobs + 0.05, name: 'ui-move' },
  ...CARDS.map((c) => ({ at: c.at, name: 'ui-blip', gain: 1.1 })),
  { at: A.precisa, name: 'coin' }, { at: A.pessoas, name: 'popup' },
  { at: A.conforme, name: 'notify', gain: 0.8 },
  ...FUTURE.map(([, at]) => ({ at, name: 'build' })),
  { at: A.bairros, name: 'popup', gain: 0.8 }, { at: A.empresas + 0.1, name: 'coin' },
  { at: A.acontecimentos, name: 'thunder', gain: 0.9 }, { at: A.mudar, name: 'thunder', gain: 1.1 },
  { at: T.eleicao + 0.3, name: 'ui-move' }, { at: A.cem, name: 'ui-blip', gain: 1.2 }, { at: A.eleicao, name: 'stamp' },
  { at: T.iGab, name: 'ui-move' }, { at: A.voces, name: 'popup' },
  { at: A.hoje, name: 'stamp', gain: 1.1 },
  { at: A.comente, name: 'notify' }, { at: A.nome2, name: 'popup' },
  { at: A.primeiro, name: 'sparkle', gain: 1.2 }, { at: A.morador, name: 'unlock' },
  { at: 69.55, name: 'levelup', gain: 1.0 },
];

export const Ep01: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const blocks = useMemo(() => makeBlocks(WORDS), []);
  const interior = inInterior(t);

  // ---------------- estado da cidade (estado gravado: 0 moradores) ----------------
  const simOn = t >= T.cresce && t < T.eleicao; // SIMULAÇÃO do crescimento
  const homeFrac = simOn ? lerp(-0.05, 1.02, smooth((t - (A.conforme + 0.1)) / 2.6)) : 0;
  const life = simOn ? smooth((t - (A.conforme + 0.2)) / 1.6) : 0;
  const lightsUp = smooth((t - 2.55) / 0.5); // a cidade "liga" quando o último prédio assenta
  const extra: Obj[] = [];
  const overrides: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number; lit?: number }> = {};
  const reveal = new Set<string>(), hidden = new Set<string>();
  if (t < 3.3) BUILT.forEach((b) => { const u = clamp((t - b.t0) / RISE); if (u < 1) overrides[b.id] = { dy: (b.o.sprite.h + 4) * (1 - easeOut(u)) }; });
  if (simOn) {
    FUTURE.forEach(([id, t0]) => {
      if (t < t0) return;
      reveal.add(id);
      const o = world0.byId.get(id)!;
      overrides[id] = { dy: (o.sprite.h + 4) * (1 - easeOut(clamp((t - t0) / 0.8))), lit: 1 };
    });
    if (t >= A.bairros - 0.1) world0.objects.forEach((o) => { if (o.kind === 'placa') hidden.add(o.id); });
  }
  // exemplo: Ana (holograma → cidadã) e a casa dela acesa só durante a demonstração
  const ana = anaAt(t);
  if (ana) {
    extra.push(personObj('ana', lookOf(ANA.aparencia), 'ana', ana.i, ana.j, ana.dir, ana.fr, 2, 0.95, ana.pose));
    if (ana.ghost > 0.01) overrides.ana = { ghost: ana.ghost, alpha: lerp(1, 0.75, ana.ghost) };
  }
  if (t >= A.cidadao && t < T.jobs) overrides['casa-02'] = { lit: smooth((t - A.cidadao) / 0.35) };

  const dawn = t < T.hoje ? 0 : t < T.fim ? smooth((t - A.hoje) / 5) * 0.55 : lerp(0.55, 1, smooth((t - T.fim) / 2.8));
  const storm = t >= T.evento && t < T.eleicao ? smooth((t - (A.acontecimentos - 0.1)) / 0.7) : 0;
  const shotZoom = cameraCuts(SHOTS, t).zoom;
  const S = stage({
    t, shots: SHOTS, frameY: frameY(t), people: life, traffic: life, homeFrac, extra, overrides, reveal, hidden,
    tilt: autoTilt(shotZoom) * 0.85, dawn, weather: { rain: storm, fog: storm * 0.35 },
    levels: { civic: t < 3.3 ? lerp(0.15, 1, lightsUp) : 1, shop: t < 3.3 ? lerp(0.1, 1, lightsUp) : 1, street: t < 3.3 ? lightsUp : 1 },
  });
  const { cam, anchor, corners, scr, world } = S;
  const homes = world.objects.filter((o) => o.group === 'home' && !o.planned && o.kind === 'casa');

  // ---------------- cursor do jogador ----------------
  const pCasa = scr(9.0, 25.8, 18), pAna = ana ? scr(ana.i, ana.j, 20) : { x: 540, y: 900 };
  const cursorPath: CursorKey[] =
    t < T.vazio ? [{ t: T.rua + 0.3, x: 980, y: 1250 }, { t: T.rua + 0.9, x: pCasa.x, y: pCasa.y, click: true }, { t: T.vazio, x: pCasa.x + 40, y: pCasa.y + 60 }]
    : t < T.casa ? [{ t: T.seguir + 0.4, x: 900, y: 900 }, { t: A.seguidor, x: 600, y: 520, click: true }, { t: T.casa, x: 700, y: 700 }]
    : [{ t: T.ana + 1.2, x: 980, y: 1300 }, { t: A.acompanhar - 0.1, x: pAna.x + 10, y: pAna.y, click: true }, { t: T.iAna, x: pAna.x + 30, y: pAna.y + 40 }];
  const cur = cursorAt(cursorPath, t);
  const curA = win(t, T.rua + 0.25, T.vazio - 0.1, 0.2, 0.2) + win(t, T.seguir + 0.35, T.casa - 0.15, 0.2, 0.2) + win(t, T.ana + 1.0, T.iAna - 0.1, 0.2, 0.2);

  // ---------------- efeitos sobre a cidade ----------------
  const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
  const drawFx = (c: CanvasRenderingContext2D) => {
    // poeira de cada prédio assentando
    if (t < 3.4) BUILT.forEach((b) => { if (b.o.kind !== 'casa' && t > b.t0 + RISE - 0.05 && t < b.t0 + RISE + 0.9) { const o = b.o; const p = q(scr((o.fp[0] + o.fp[2]) / 2, (o.fp[1] + o.fp[3]) / 2, 0)); dust(c, p.x, p.y, ((o.fp[2] - o.fp[0]) * 12 * cam.zoom) / 4, t, b.t0 + RISE - 0.05, 0.8); } });
    glitch(c, t, A.problema + 0.1, 0.28);
    glitch(c, t, A.ninguem - 0.02, 0.22);
    // casa clicada e todas as casas vazias
    selection(c, corners('casa-03').map(q), t, win(t, T.rua + 0.9, T.vazio - 0.1, 0.12, 0.2), C.red);
    if (t >= T.vazio && t < T.tour) homes.forEach((o, k) => { const a = smooth((t - (A.ninguem + 0.2 + (o.rank ?? hash2(k, 1)) * 0.9)) / 0.25); const p = q(S.P(o.anchor!.x, o.anchor!.y)); marker(c, p.x, p.y - 2, t, a, 'person', '#ff4a5a', k); });
    // tour: contorno do que é falado
    const tour: [string, number, number, string][] = [['casa-05', A.casas, A.escola, C.cyan], ['escola', A.escola, A.hospital + 0.3, C.yellow], ['hospital', A.hospital, A.comercio + 0.3, C.red], ['mercado', A.comercio, T.pref - 0.1, C.green]];
    tour.forEach(([id, a, b, col]) => selection(c, corners(id).map(q), t, win(t, a, b, 0.1, 0.15), col));
    selection(c, corners('prefeitura').map(q), t, win(t, A.prefeitura, T.iCasa - 0.1, 0.12, 0.2), C.yellow);
    // VOCÊ? e o novo cidadão
    if (ana && t < T.casa) { const p = q(scr(ana.i, ana.j, 0)); sparkles(c, p.x, p.y, t, A.voce - 0.05, 1.5); sparkles(c, p.x, p.y, t, A.seguidor + 0.15, 1.4, '#ffd84a'); }
    if (t >= T.casa && t < T.ana) { selection(c, corners('casa-02').map(q), t, win(t, A.cidadao, T.ana - 0.1, 0.12, 0.2), C.yellow); const p = q(anchor('casa-02')); sparkles(c, p.x, p.y + 4, t, A.cidadao, 1.3, '#ffd84a'); }
    if (ana && t >= T.ana && t < T.iAna) { const s = 0.22; selection(c, [scr(ana.i - s, ana.j - s), scr(ana.i + s, ana.j - s), scr(ana.i + s, ana.j + s), scr(ana.i - s, ana.j + s)].map(q), t, win(t, A.acompanhar, T.iAna - 0.1, 0.1, 0.1), C.yellow); }
    // vagas de emprego em todos os locais de trabalho
    if (t >= T.vagas && t < T.cresce) WORKPLACES.forEach((id, k) => { const a = smooth((t - (A.precisa - 0.2 + k * 0.08)) / 0.3); const p = q(anchor(id)); marker(c, p.x, p.y - 2, t, a, 'job', '#ffd84a', k); });
    // obras da simulação
    if (simOn) FUTURE.forEach(([id, t0]) => { const o = world.byId.get(id)!; const p = q(scr((o.fp[0] + o.fp[2]) / 2, (o.fp[1] + o.fp[3]) / 2, 0)); dust(c, p.x, p.y, ((o.fp[2] - o.fp[0]) * 22 * cam.zoom) / 4, t, t0, 1.4); });
    // eleição: holofotes na prefeitura
    if (t > A.eleicao - 0.2 && t < T.hoje) { const p = q(anchor('prefeitura')); searchlights(c, p.x, p.y + 6, t, win(t, A.eleicao - 0.1, T.hoje - 0.05, 0.5, 0.3)); }
    // convite: vagas (casas livres) e a casa do 1º morador
    if (t >= T.comente && t < T.primeiro) homes.forEach((o, k) => { const a = smooth((t - (A.nome2 - 0.2 + (o.rank ?? hash2(k, 1)) * 0.7)) / 0.25); const p = q(S.P(o.anchor!.x, o.anchor!.y)); marker(c, p.x, p.y - 2, t, a, 'person', '#5af2ff', k); });
    if (t >= T.primeiro && t < T.fim) { selection(c, corners('casa-01').map(q), t, win(t, A.primeiro, T.fim - 0.1, 0.12, 0.2), C.yellow); const p = q(anchor('casa-01')); sparkles(c, p.x, p.y + 6, t, A.morador, 1.5, '#ffd84a'); }
  };

  // ---------------- interiores ----------------
  const interiorView = (() => {
    if (t >= T.iCasa && t < T.iHosp) {
      const labels: InteriorLabel[] = [{ i: 6, j: 6, z: 34, title: 'CASA PRONTA', sub: '0 MORADORES', icon: 'house', color: C.cyan, a: win(t, T.iCasa + 0.25, T.iHosp - 0.05, 0.25, 0.15) }];
      return <InteriorShot kind="casa" t={t} t0={T.iCasa} t1={T.iHosp} labels={labels} lightsOn={0.55} />;
    }
    if (t >= T.iHosp && t < T.voce) {
      const labels: InteriorLabel[] = [{ i: 5.1, j: 5.1, z: 14, title: 'LEITOS VAZIOS', sub: 'ESPERANDO HABITANTES', icon: 'cross', color: C.red, a: win(t, A.esperando + 0.1, T.voce - 0.05, 0.25, 0.15) }];
      return <InteriorShot kind="hospital" t={t} t0={T.iHosp} t1={T.voce} labels={labels} zoom={[5.0, 5.6]} />;
    }
    if (t >= T.iAna && t < T.jobs) {
      const labels: InteriorLabel[] = [{ i: 6.5, j: 6.9, z: 24, title: 'ANA EM CASA', sub: 'EXEMPLO · PERSONAGEM FICTÍCIO', icon: 'heart', color: C.yellow, a: win(t, T.iAna + 0.3, T.jobs - 0.05, 0.25, 0.15) }];
      return <InteriorShot kind="casa" t={t} t0={T.iAna} t1={T.jobs} labels={labels} zoom={[5.8, 6.4]}
        person={{ app: ANA.aparencia, key: 'ana-int', i: 7.4, j: 6.8, dir: 1, pose: 'idle', to: { i: 6.5, j: 6.9, t0: T.iAna + 0.2, t1: T.iAna + 1.3 } }} />;
    }
    if (t >= T.iGab && t < T.governar) {
      const labels: InteriorLabel[] = [{ i: 6.0, j: 4.35, z: 18, title: 'PREFEITO(A): ?', sub: 'CARGO VAGO · VOCÊS ESCOLHEM', icon: 'crown', color: C.yellow, a: win(t, A.voces, T.governar - 0.05, 0.25, 0.15) }];
      return <InteriorShot kind="prefeitura" t={t} t0={T.iGab} t1={T.governar} labels={labels} zoom={[5.2, 5.9]} />;
    }
    return null;
  })();

  const typedN = Math.floor(clamp((t - (A.escolher + 0.15)) / 1.5) * TYPED.length);
  const L = (id: string) => anchor(id);
  const endA = smooth((t - 69.5) / 0.6);
  const flash = storm > 0 ? Math.max(win(t, A.mudar, A.mudar + 0.18, 0.02, 0.12), win(t, A.destino + 0.5, A.destino + 0.62, 0.02, 0.1)) : 0;

  return (
    <EpisodeShell
      t={t} blocks={blocks} speaking={speaking} cues={CUES}
      narration={['audio/ep01/narracao.wav']} music="audio/music/ep01.wav"
      musicLevels={{ alone: 0.8, underVoice: 0.32, betweenLines: 0.52 }}
      ambience={[
        { file: 'audio/sfx/night-ambience.wav', points: [[0, 0.3], [3.4, 0.35], [6.8, 0.9], [9.2, 0.9], [9.6, 0.35], [61, 0.35], [75, 0.1]] },
        { file: 'audio/sfx/rain.wav', points: [[T.evento, 0], [A.acontecimentos + 0.2, 0.85], [T.eleicao - 0.2, 0.85], [T.eleicao + 0.1, 0]] },
      ]}
    >
      {!interior && <CityCanvas params={S.params} />}
      {!interior && <FxLayer draw={drawFx} />}
      {interiorView}
      {flash > 0 && <AbsoluteFill style={{ background: '#dfe8ff', opacity: flash * 0.55 }} />}

      {/* rótulos no mundo (no máximo 2 ao mesmo tempo) */}
      {!interior && (
        <>
          <WorldLabel x={L('casa-03').x} y={L('casa-03').y} title="CASA VAZIA" icon="house" color={C.red} a={win(t, T.rua + 1.0, T.vazio - 0.1, 0.2, 0.15)} stem={40} />
          <WorldLabel x={L('casa-05').x} y={L('casa-05').y} title="CASAS" icon="house" color={C.cyan} a={win(t, A.casas, A.escola + 0.15, 0.15, 0.15)} stem={30} />
          <WorldLabel x={L('escola').x} y={L('escola').y} title="ESCOLA" icon="book" a={win(t, A.escola, A.hospital + 0.3, 0.15, 0.15)} stem={36} align="left" />
          <WorldLabel x={L('hospital').x} y={L('hospital').y} title="HOSPITAL" icon="cross" color={C.red} a={win(t, A.hospital, A.comercio + 0.3, 0.15, 0.15)} stem={36} align="right" />
          <WorldLabel x={L('mercado').x} y={L('mercado').y} title="COMÉRCIO" icon="cart" color={C.green} a={win(t, A.comercio, T.pref - 0.1, 0.15, 0.15)} stem={36} align="right" />
          <WorldLabel x={L('prefeitura').x} y={L('prefeitura').y} title="PREFEITURA" icon="crown" a={win(t, A.prefeitura, T.iCasa - 0.1, 0.2, 0.15)} stem={50} />
          {ana && t < T.casa && (() => { const p = scr(ana.i, ana.j, 34); return <WorldLabel x={p.x} y={p.y} title={t < A.seguidor + 0.3 ? 'VOCÊ?' : 'NOVO CIDADÃO'} sub={t < A.seguidor + 0.3 ? 'SEU LUGAR NA CIDADE' : 'EXEMPLO'} icon="person" color={C.cyan} a={win(t, A.voce, T.casa - 0.1, 0.2, 0.15)} stem={26} />; })()}
          <WorldLabel x={L('casa-02').x} y={L('casa-02').y} title="CASA 14 · OCUPADA" sub="EXEMPLO" icon="house" color={C.yellow} a={win(t, A.cidadao + 0.1, T.ana - 0.1, 0.2, 0.15)} stem={36} />
          <WorldLabel x={L('prefeitura').x} y={L('prefeitura').y} title="ELEIÇÃO" sub="LIBERA COM 100 SEGUIDORES" icon="ballot" color={C.yellow} a={win(t, A.eleicao, T.iGab - 0.1, 0.2, 0.15)} stem={40} />
          <WorldLabel x={L('prefeitura').x} y={L('prefeitura').y} title="QUEM VAI GOVERNAR?" icon="crown" color={C.yellow} a={win(t, T.governar + 0.1, T.hoje - 0.1, 0.2, 0.15)} stem={46} />
          <WorldLabel x={L('casa-01').x} y={L('casa-01').y} title="CASA 12 · LIVRE" sub="PODE SER A SUA" icon="house" color={C.yellow} a={win(t, A.morador, T.fim - 0.1, 0.2, 0.15)} stem={70} align="right" />
        </>
      )}

      {/* transições de jogo entre os planos (sobre cidade e interiores, por baixo da HUD) */}
      <FxLayer draw={(c) => CUTS.forEach((tc) => tileWipe(c, t, tc))} />

      {/* HUD fixa (MORADORES 0 desde o 1º quadro) + minimapa nos planos gerais */}
      <Hud moradores={EP.estado.moradores} empregos={EP.estado.empregos} dia={1} hora={clock(t)} show={1 - endA} warnMoradores={t < T.tour || (t > A.primeiro && t < T.fim)} pulseMoradores={win(t, A.problema, A.problema + 1.2, 0.1, 0.3) + win(t, A.ninguem, A.ninguem + 1.6, 0.1, 0.3)} />
      <Minimap cam={cam} t={t} a={(interior ? 0 : 1) * (win(t, T.tour + 0.2, T.pref - 0.1, 0.3, 0.2) + win(t, T.vagas + 0.2, T.cresce - 0.1, 0.3, 0.2))} ping={t < T.pref ? { i: 12.5, j: 7 } : { i: 13, j: 14 }} />
      {cur && <Cursor x={cur.x} y={cur.y} press={cur.press} clickAge={cur.clickAge} a={Math.min(1, curA)} />}

      {/* gancho: o estado registrado da cidade, desde o 1º quadro */}
      <BigCounter a={clamp(0.75 + t * 2) * (1 - smooth((t - (T.rua - 0.25)) / 0.25))} value={EP.estado.moradores} label="MORADORES" sub="DIA 01 · CIDADE NOVA" t={t} y={400} />
      <BigCounter a={win(t, A.ninguem + 0.05, T.tour - 0.1, 0.2, 0.2)} value={EP.estado.moradores} label="MORADORES" sub={`${city.casas.total} CASAS VAZIAS`} blink t={t} y={400} />
      <Toast icon="star" text="ALERTA: CIDADE VAZIA" a={smooth((t - (A.problema + 0.2)) / 0.25)} out={smooth((t - (T.vazio - 0.25)) / 0.25)} color={C.red} style={{ position: 'absolute', left: 50, top: 400 }} />
      <Stamp a={win(t, A.pronto - 0.05, T.iHosp - 0.1, 0.4, 0.2)} text="PRONTO" sub="TUDO ESPERANDO VOCÊ" y={400} color={C.green} rot={-5} />
      <CtaButton a={win(t, T.seguir + 0.3, A.seguidor + 0.45, 0.25, 0.2) * (t > A.seguidor && t < A.seguidor + 0.18 ? 0.88 : 1)} icon="follow" text="SEGUIR" color={C.cyan} t={t} y={440} />
      <Toast icon="person" text="+1 CIDADÃO" sub="EXEMPLO" a={smooth((t - A.cidadao) / 0.3)} out={smooth((t - (T.ana - 0.3)) / 0.3)} color={C.green} style={{ position: 'absolute', left: 50, top: 400 }} />
      <CommentCard a={smooth((t - (A.escolher - 0.3)) / 0.35)} out={smooth((t - (A.acompanhar - 0.25)) / 0.3)} typed={TYPED.slice(0, typedN)} t={t} y={380} />
      <CharacterCard a={smooth((t - A.acompanhar) / 0.35)} out={smooth((t - (T.iAna - 0.3)) / 0.3)} t={t} app={ANA.aparencia} id={ANA.id} nome={ANA.nome} profissao={ANA.titulo} linhas={['BAIRRO: VILA NOVA · CASA 14', 'TRABALHA NO HOSPITAL']} exemplo y={380} px={5} />
      <JobPicker cards={CARDS} t={t} a={smooth((t - (T.jobs + 0.1)) / 0.3)} out={smooth((t - (T.vagas - 0.3)) / 0.3)} y={380} />
      <StatPanel a={smooth((t - (A.pessoas - 0.4)) / 0.35)} out={smooth((t - (T.cresce - 0.3)) / 0.3)} icon="job" value={String(city.empregos.total)} label="VAGAS DE EMPREGO" sub={`EM ${WORKPLACES.length} LOCAIS DE TRABALHO`} color={C.yellow} y={400} />
      <SimTag a={win(t, T.cresce + 0.1, T.eleicao - 0.1, 0.25, 0.15)} text="SIMULAÇÃO · COMO A CIDADE PODE CRESCER" y={380} />
      <GrowthBar a={win(t, A.conforme, T.bairro - 0.1, 0.3, 0.2)} f={(t - A.conforme) / 2.2} t={t} />
      <div style={{ position: 'absolute', left: 50, top: 450, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Toast icon="house" text="NOVO BAIRRO" a={smooth((t - A.construidos) / 0.3)} out={smooth((t - (T.evento - 0.3)) / 0.3)} color={C.green} />
        <Toast icon="cart" text="NOVA EMPRESA" a={smooth((t - (A.empresas + 0.1)) / 0.3)} out={smooth((t - (T.evento - 0.25)) / 0.3)} color={C.yellow} />
        <Toast icon="star" text="EVENTO: TEMPESTADE" a={smooth((t - A.acontecimentos) / 0.3)} out={smooth((t - (T.eleicao - 0.3)) / 0.3)} color="#9ab8ff" />
      </div>
      <GoalsPanel a={smooth((t - (T.eleicao + 0.25)) / 0.5)} out={smooth((t - (A.eleicao - 0.15)) / 0.3)} metas={city.metas} t={t} highlight={t > A.cem - 0.1 ? 3 : -1} />
      <Stamp a={win(t, A.hoje - 0.05, T.comente - 0.1, 0.4, 0.2)} text="DIA 01" sub="COMEÇA A NOSSA HISTÓRIA" y={420} color={C.yellow} rot={-4} />
      <CtaButton a={win(t, A.comente - 0.1, T.primeiro - 0.1, 0.25, 0.2)} icon="comment" text="COMENTE" color={C.yellow} t={t} y={410} />
      <CtaButton a={win(t, A.nome2 - 0.1, T.primeiro - 0.1, 0.25, 0.2)} icon="person" text="NOME + PROFISSÃO" color={C.cyan} t={t} y={580} />
      <SlotCard a={smooth((t - (A.primeiro - 0.15)) / 0.35)} out={smooth((t - (T.fim - 0.3)) / 0.3)} t={t} y={380} />
      <SimTag a={win(t, T.seguir + 0.1, T.jobs - 0.1, 0.25, 0.15)} text="DEMONSTRAÇÃO · PERSONAGEM DE EXEMPLO" y={1520} />

      {/* fecho no amanhecer com a logo oficial */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150, opacity: endA, transform: `translateY(${(1 - easeOut(endA)) * 30}px) scale(${0.92 + 0.08 * easeOut(endA)})` }}>
        <Logo size={98} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 470, opacity: smooth((t - 70.6) / 0.5) }}>
        <div style={{ fontFamily: F.pixel, fontSize: 92, color: C.white, textAlign: 'center', lineHeight: 0.95, WebkitTextStroke: `9px ${C.ink}`, paintOrder: 'stroke fill', textShadow: `0 7px 0 ${C.ink}` }}>
          A CIDADE ESTÁ PRONTA.<br /><span style={{ color: C.yellow }}>FALTA VOCÊ.</span>
        </div>
        <div style={{ marginTop: 26, fontFamily: F.hud, fontWeight: 700, fontSize: 28, color: C.ink, background: C.cyan, padding: '6px 18px', opacity: smooth((t - 72.3) / 0.4), letterSpacing: 2 }}>DIA 02 EM BREVE</div>
      </AbsoluteFill>
    </EpisodeShell>
  );
};

// relógio do Dia 01: da madrugada ao nascer do sol
function clock(t: number) {
  const m = 4 * 60 + 50 + Math.floor(t);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
