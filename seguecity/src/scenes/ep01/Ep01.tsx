// FASE 2 — Episódio 01 (75 s): "DIA 01 — Construí uma cidade inteira, mas ninguém mora nela".
// Tudo é função pura do tempo t e ancorado nas palavras da narração (narration.ts → W('palavra')).
// Estrutura reaproveitável: direção da cena em `shots` (câmera) + estado da cidade por quadro (stage) +
// interface (HUD/painéis/cursor/efeitos) + moldura comum (EpisodeShell: legendas, trilha, voz, efeitos sonoros).
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Toast } from '../../components/hud/Toast';
import { Minimap } from '../../components/hud/Minimap';
import { Cursor, cursorAt, type CursorKey } from '../../components/hud/Cursor';
import { BigCounter, CommentCard, Stamp, SimTag, GrowthBar, FoundersPanel, GoalsPanel, CtaButton } from '../../components/hud/Panels';
import { makeBlocks } from '../../components/Captions';
import { FxLayer } from '../../components/fx/FxLayer';
import { fireworks, sparkles, dust, searchlights, marker, glitch, selection, tileWipe } from '../../components/fx/fx';
import { C, F } from '../../components/theme';
import { cameraCuts, cutTimes, type Key } from '../../utils/camera';
import { getWorld } from '../../engine/world';
import { clamp, smooth, win, easeOut, lerp } from '../../utils/easing';
import { stage, autoTilt } from '../../series/stage';
import { EpisodeShell, type Cue } from '../../series/EpisodeShell';
import { personObj } from '../../engine/dynamics';
import { hex } from '../../engine/color';
import { hash2 } from '../../engine/rng';
import type { Look } from '../../engine/sprites/people';
import type { Obj } from '../../engine/types';
import { episodes, jobs, city } from '../../data';
import { WORDS, W, speaking } from './narration';

export const EP01_SECONDS = 75;
const EP = episodes.find((e) => e.id === 'ep01')!;
const vagas = (id: string) => jobs.find((j) => j.id === id)?.vagas ?? 0;

// ---------------- âncoras da fala ----------------
const A = {
  escola: W('escola'), hosp: W('hospital'), pref: W('prefeitura'),
  seguir: W('seguir'), morador: W('morador', 19), seguecity: W('seguecity', 20),
  comentar: W('comentar'), proximo: W('próximo'), tudo: W('tudo', 35),
  bairros: W('bairros'), negocios: W('negócios'), historias: W('histórias'),
  fund: W('fundadores'), prefeito: W('prefeito', 63), segue: W('segue', 68), comenta: W('comenta', 68),
};

// ---------------- profissões (cena 5): um plano por prédio, com corte em ladrilhos ----------------
const JOBS5 = [
  { word: 'médicos', job: 'medico', id: 'hospital', title: 'MÉDICOS', sub: `HOSPITAL · ${vagas('medico')} VAGAS`, icon: 'cross', col: C.red, ghosts: [[19.86, 6.2], [19.86, 7.0]], cam: [18.0, 7.8, 32, 3.25], click: [18.0, 6.6, 34] },
  { word: 'professores', job: 'professor', id: 'escola', title: 'PROFESSORES', sub: `ESCOLA · ${vagas('professor')} VAGAS`, icon: 'book', col: C.yellow, ghosts: [[6.0, 7.35], [7.1, 7.35]], cam: [6.7, 7.2, 16, 3.25], click: [6.5, 5.5, 16] },
  { word: 'motoristas', job: 'motorista', id: 'terminal', title: 'MOTORISTAS', sub: `TERMINAL · ${vagas('motorista')} VAGAS`, icon: 'bus', col: C.cyan, ghosts: [[12.4, 21.5], [12.4, 23.1]], cam: [12.5, 22.4, 6, 3.3], click: [11.0, 22.5, 10] },
  { word: 'comerciantes', job: 'comerciante', id: 'mercado', title: 'COMERCIANTES', sub: `MERCADINHO · ${vagas('comerciante')} VAGAS`, icon: 'cart', col: C.green, ghosts: [[19.88, 11.8], [19.88, 13.3]], cam: [19.2, 12.8, 12, 3.3], click: [18.0, 12.5, 12] },
  { word: 'policiais', job: 'policial', id: 'delegacia', title: 'POLICIAIS', sub: `DELEGACIA · ${vagas('policial')} VAGAS`, icon: 'badge', col: '#7eaee0', ghosts: [[4.9, 23.86], [6.3, 23.86]], cam: [5.7, 22.7, 10, 3.3], click: [5.5, 22.4, 14] },
  { word: 'engenheiros', job: 'engenheiro', id: 'obra', title: 'ENGENHEIROS', sub: `OBRA · ${vagas('engenheiro')} VAGAS`, icon: 'helmet', col: '#ffb12b', ghosts: [[27.2, 9.3], [28.4, 9.3]], cam: [27.6, 7.6, 50, 2.6], click: [27.8, 6.6, 24] },
].map((j) => ({ ...j, at: W(j.word, 37) }));
const JOB_IDS = ['hospital', 'escola', 'prefeitura', 'mercado', 'padaria', 'farmacia', 'cafe', 'sorveteria', 'delegacia', 'oficina', 'terminal', 'obra', 'escritorio-1'];
const FUTURE = ['futuro-1', 'futuro-2', 'futuro-3', 'futuro-4'];
const S6_CUT = 48.3;

// ---------------- câmera (alvo em tiles; zoom = px de saída por px de mundo) ----------------
const SHOT_A: Key[] = [
  // 1 — a cidade pronta (sobe do mar de nuvens até a fileira de prédios principais)
  { t: 0.0, i: 15.6, j: 14.6, z: 10, zoom: 1.3 },
  { t: 2.4, i: 13.6, j: 10.2, z: 14, zoom: 2.0 },
  { t: 4.2, i: 12.6, j: 8.2, z: 22, zoom: 2.55 },
  { t: 6.1, i: 12.2, j: 9.0, z: 20, zoom: 2.7 },
  { t: 7.7, i: 11.6, j: 19.5, z: 6, zoom: 2.55 },
  // 2 — ninguém mora nela
  { t: 8.4, i: 11.0, j: 24.6, z: 6, zoom: 3.2 },
  { t: 10.8, i: 9.6, j: 26.2, z: 6, zoom: 3.9 },
  { t: 11.9, i: 11.6, j: 19.0, z: 2, zoom: 3.0 },
  { t: 12.9, i: 12.5, j: 14.3, z: 0, zoom: 3.6 },
  { t: 14.8, i: 12.8, j: 15.2, z: 0, zoom: 3.3 },
  // 3 — a mecânica
  { t: 16.2, i: 12.8, j: 21.4, z: 0, zoom: 1.95 },
  { t: 19.6, i: 12.4, j: 22.4, z: 0, zoom: 2.1 },
  { t: 22.2, i: 11.2, j: 24.6, z: 2, zoom: 2.6 },
  { t: 24.3, i: 9.6, j: 26.3, z: 4, zoom: 4.2 },
  // 4 — seu personagem
  { t: 25.6, i: 9.1, j: 26.9, z: 8, zoom: 5.6 },
  { t: 28.3, i: 9.1, j: 27.25, z: 12, zoom: 6.8 },
  { t: 30.2, i: 9.2, j: 27.45, z: 12, zoom: 7.0 },
  { t: 32.4, i: 9.9, j: 27.8, z: 12, zoom: 5.8 },
  { t: 34.6, i: 10.5, j: 27.8, z: 6, zoom: 4.5 },
  // 5 — abertura das profissões (plano geral)
  { t: 35.6, i: 13.0, j: 18.5, z: 14, zoom: 1.85 },
  { t: 37.2, i: 14.2, j: 15.6, z: 20, zoom: 2.0 },
];
const JOB_SHOTS: Key[][] = JOBS5.map((j, k) => {
  const t0 = j.at - 0.12, t1 = (JOBS5[k + 1]?.at ?? S6_CUT + 0.12) - 0.12;
  const [i, jj, z, zoom] = j.cam;
  return [{ t: t0, i: i - 0.25, j: jj + 0.15, z, zoom: zoom * 0.94 }, { t: t1, i: i + 0.2, j: jj - 0.1, z, zoom: zoom * 1.04 }];
});
const SHOT_B: Key[] = [
  // 6 — crescimento (simulação)
  { t: S6_CUT, i: 14.2, j: 18.8, z: 4, zoom: 1.55 },
  { t: 52.4, i: 14.6, j: 18.6, z: 4, zoom: 1.75 },
  { t: 53.2, i: 17.9, j: 20.9, z: 14, zoom: 2.75 },
  { t: 55.8, i: 17.9, j: 21.0, z: 22, zoom: 2.6 },
  { t: 57.7, i: 15.4, j: 16.6, z: 10, zoom: 1.8 },
  // 7 — fundadores e prefeito
  { t: 58.6, i: 12.6, j: 14.0, z: 0, zoom: 3.0 },
  { t: 61.6, i: 12.6, j: 13.2, z: 0, zoom: 3.15 },
  { t: 63.4, i: 12.5, j: 9.4, z: 20, zoom: 3.1 },
  { t: 67.6, i: 12.5, j: 8.8, z: 30, zoom: 3.3 },
  // 8 — chamada final
  { t: 68.6, i: 13.4, j: 11.6, z: 20, zoom: 2.3 },
  { t: 71.0, i: 15.2, j: 14.8, z: 10, zoom: 1.45 },
  { t: 72.4, i: 15.6, j: 15.4, z: 10, zoom: 1.24 },
  { t: 75.0, i: 15.6, j: 15.6, z: 10, zoom: 1.18 },
];
const SHOTS = [SHOT_A, ...JOB_SHOTS, SHOT_B];
const CUTS = cutTimes(SHOTS);
// altura do assunto na tela (fração): legendas ficam em 64–77%; na cena 7 o painel de metas ocupa o alto
const frameY = (t: number) => (t > 62.6 && t < 68.2 ? lerp(0.45, 0.6, smooth((t - 62.6) / 0.8) * smooth((68.2 - t) / 0.6)) : 0.45);

// ---------------- personagens ----------------
const LUCAS: Look = { skin: hex('#c98b5e'), hair: hex('#2a1d18'), shirt: hex('#3a5ea8'), pants: hex('#3a5ea8'), shoes: hex('#1a1a20'), hat: 'bone', long: false };
const lookOf = (jobId: string): Look => {
  const j = jobs.find((x) => x.id === jobId)!;
  const hat = ({ capacete: 'capacete', quepe: 'quepe', touca: 'touca', bone: 'bone' } as Record<string, Look['hat']>)[j.roupa.extra ?? ''] ?? null;
  return { skin: hex('#d9a273'), hair: hex('#3a2418'), shirt: hex(j.roupa.camisa), pants: hex(j.roupa.calca), shoes: hex('#1a1a20'), hat, coat: j.roupa.extra === 'jaleco' ? hex('#f2f4f7') : null, long: j.roupa.extra === 'jaleco' };
};
function lucasAt(t: number) {
  if (t < 28.0) return null;
  if (t < 30.0) return { i: 9.05, j: 27.2, dir: 1, fr: 0 };
  if (t < 31.2) { const f = (t - 30.0) / 1.2; return { i: 9.05, j: 27.2 + f * 0.66, dir: 1, fr: Math.floor(t * 4.2) % 4 }; }
  const f = t - 31.2; return { i: 9.05 + f * 0.42, j: 27.86, dir: 0, fr: Math.floor(t * 4.2) % 4 };
}

// ---------------- efeitos sonoros (todos ancorados na fala) ----------------
const TYPED = 'Lucas — mecânico';
const CUES: Cue[] = [
  { at: 0.02, name: 'stamp', gain: 1.3 },
  { at: A.escola - 0.25, name: 'ui-blip' }, { at: A.escola, name: 'popup' },
  { at: A.hosp - 0.25, name: 'ui-blip' }, { at: A.hosp, name: 'popup' },
  { at: A.pref - 0.25, name: 'ui-blip' }, { at: A.pref, name: 'popup' },
  { at: 6.35, name: 'ui-blip' }, { at: 8.02, name: 'empty', gain: 1.6 }, { at: 8.3, name: 'tick' },
  { at: 15.3, name: 'sparkle' }, { at: A.seguir - 0.3, name: 'popup' }, { at: A.seguir + 0.15, name: 'ui-blip', gain: 1.3 },
  { at: A.morador, name: 'coin' }, { at: A.morador + 0.75, name: 'popup' }, { at: A.morador + 1.5, name: 'popup' }, { at: A.seguecity, name: 'notify' },
  { at: A.comentar - 0.4, name: 'notify' },
  ...Array.from({ length: TYPED.length }, (_, k) => ({ at: A.comentar + 0.5 + (k * 1.7) / TYPED.length, name: 'typing', gain: 0.8, dur: 0.3 })),
  { at: 27.85, name: 'sparkle', gain: 1.3 }, { at: 28.7, name: 'unlock' }, { at: A.proximo - 0.1, name: 'stamp', gain: 1.2 },
  { at: 35.3, name: 'ui-move' }, { at: A.tudo - 0.2, name: 'coin' },
  ...JOBS5.flatMap((j) => [{ at: j.at - 0.3, name: 'ui-move', gain: 0.8 }, { at: j.at + 0.25, name: 'ui-blip' }, { at: j.at + 0.3, name: 'popup' }]),
  { at: S6_CUT - 0.2, name: 'ui-move' }, { at: 48.6, name: 'notify', gain: 0.8 },
  ...FUTURE.map((_, k) => ({ at: 53.1 + k * 0.7, name: 'build' })),
  { at: A.bairros, name: 'popup' }, { at: A.negocios, name: 'popup' }, { at: A.historias, name: 'popup' },
  { at: 58.5, name: 'ui-move' }, { at: A.fund, name: 'unlock', gain: 1.2 }, { at: 63.1, name: 'popup' }, { at: A.prefeito - 1.2, name: 'ui-blip' },
  { at: A.segue - 0.15, name: 'coin' }, { at: A.comenta - 0.15, name: 'popup' },
  ...[70.3, 71.2, 72.3, 73.3, 74.1].map((at) => ({ at, name: 'firework', gain: 0.8 })),
  { at: 72.0, name: 'levelup', gain: 1.2 },
];

export const Ep01: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const blocks = useMemo(() => makeBlocks(WORDS), []);

  // ---------------- estado da cidade ----------------
  // luzes das casas: acesas na cena 1, apagam em 8.0 (por ordem), voltam na simulação da cena 6
  let homeFrac = 1;
  if (t >= 7.98 && t < 48.4) homeFrac = 1 - smooth((t - 7.98) / 0.7) * 1.05;
  if (t >= 48.4) homeFrac = lerp(-0.05, 1.05, smooth((t - 48.4) / 4.4));
  // gente e trânsito: somem no "ninguém mora nela", voltam na simulação
  const life = t < 7.98 ? 1 : t < 48.5 ? 0 : smooth((t - 48.5) / 3.5);
  const extra: Obj[] = [];
  const overrides: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number; lit?: number }> = {};
  // Lucas (exemplo) e a casa dele acendendo
  const lu = lucasAt(t);
  if (lu && t < 35.2) {
    extra.push(personObj('lucas', LUCAS, 'lucas', lu.i, lu.j, lu.dir, lu.fr, 2, 0.95));
    if (t < 28.6) overrides.lucas = { ghost: 1 - smooth((t - 28.0) / 0.6), alpha: 0.4 };
  }
  if (t >= 28.6 && t < 48.4) overrides['casa-03'] = { lit: smooth((t - 28.7) / 0.35) };
  // trabalhadores-holograma em cada profissão
  JOBS5.forEach((jb, k) => {
    if (t < jb.at - 0.15 || t > jb.at + 1.95) return;
    jb.ghosts.forEach(([gi, gj], q) => {
      const id = `ghost-${k}-${q}`;
      extra.push(personObj(id, lookOf(jb.job), `g-${jb.job}`, gi, gj, q ? 1 : 0, Math.floor(t * 2) % 2 ? 0 : 2, 2));
      overrides[id] = { ghost: 0.8 + 0.2 * Math.sin(t * 9 + q), alpha: 0.9 };
    });
  });
  // prédios novos brotando do chão (simulação)
  const reveal = new Set<string>(), hidden = new Set<string>();
  const world0 = getWorld();
  FUTURE.forEach((id, k) => {
    const t0 = 53.1 + k * 0.7;
    if (t < t0) return;
    reveal.add(id);
    const o = world0.byId.get(id)!;
    overrides[id] = { dy: (o.sprite.h + 4) * (1 - easeOut(clamp((t - t0) / 0.9))), lit: 1 };
  });
  if (t >= 53.0) world0.objects.forEach((o) => { if (o.kind === 'placa') hidden.add(o.id); });

  const shotZoom = cameraCuts(SHOTS, t).zoom;
  const S = stage({ t, shots: SHOTS, frameY: frameY(t), people: life, traffic: life, homeFrac, extra, overrides, reveal, hidden, tilt: autoTilt(shotZoom) * 0.85 });
  const { cam, anchor, corners, scr, world } = S;
  const homes = world.objects.filter((o) => o.group === 'home' && !o.planned);

  // ---------------- cursor do jogador ----------------
  const pE = scr(6.5, 5.5, 16), pH = scr(18.0, 6.6, 34), pP = scr(12.5, 7.4, 22);
  const cursorPath: CursorKey[] = t < 8
    ? [{ t: 2.6, x: 1010, y: 1180 }, { t: A.escola, x: pE.x, y: pE.y, click: true }, { t: A.hosp, x: pH.x, y: pH.y, click: true }, { t: A.pref, x: pP.x, y: pP.y, click: true }, { t: 7.6, x: pP.x + 60, y: pP.y + 120 }]
    : JOBS5.flatMap((j) => { const p = scr(j.click[0], j.click[1], j.click[2]); return [{ t: j.at - 0.12, x: p.x + 150, y: p.y + 170 }, { t: j.at + 0.25, x: p.x, y: p.y, click: true }]; });
  const cur = cursorAt(cursorPath, t);
  const curA = win(t, 2.6, 7.7, 0.3, 0.4) + JOBS5.reduce((s, j, k) => s + win(t, j.at - 0.05, (JOBS5[k + 1]?.at ?? S6_CUT) - 0.2, 0.15, 0.15), 0);

  // ---------------- camada de efeitos ----------------
  const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
  const drawFx = (c: CanvasRenderingContext2D) => {
    glitch(c, t, 7.95, 0.3);
    // cena 1: seleção dos prédios clicados
    selection(c, corners('escola').map(q), t, win(t, A.escola, A.hosp + 0.55, 0.12, 0.25), C.yellow);
    selection(c, corners('hospital').map(q), t, win(t, A.hosp, A.pref + 0.65, 0.12, 0.25), C.red);
    selection(c, corners('prefeitura').map(q), t, win(t, A.pref, 7.5, 0.12, 0.3), C.yellow);
    // cena 3–4: vagas em cada casa
    if (t > 15.2 && t < 28.4) homes.forEach((o, k) => {
      let a = smooth((t - (15.3 + (o.rank ?? hash2(k, 1)) * 1.3)) / 0.35);
      a *= o.id !== 'casa-03' ? 1 - smooth((t - 24.1) / 0.5) : 1 - smooth((t - 27.9) / 0.3);
      const p = q(S.P(o.anchor!.x, o.anchor!.y));
      marker(c, p.x, p.y - 2, t, a, 'person', '#5af2ff', k);
    });
    // cena 4: Lucas se materializa
    if (lu) { const p = q(scr(9.05, 27.2, 0)); sparkles(c, p.x, p.y, t, 27.85, 1.5); }
    // cena 5: vagas de emprego e seleção do prédio de cada profissão
    if (t > A.tudo - 0.4 && t < JOBS5[0].at) JOB_IDS.forEach((id, k) => {
      const a = smooth((t - (A.tudo - 0.3 + k * 0.07)) / 0.3) * (1 - smooth((t - (JOBS5[0].at - 0.35)) / 0.25));
      const p = q(anchor(id));
      marker(c, p.x, p.y - 2, t, a, 'job', '#ffd84a', k);
    });
    JOBS5.forEach((j, k) => selection(c, corners(j.id).map(q), t, win(t, j.at + 0.25, (JOBS5[k + 1]?.at ?? S6_CUT) - 0.2, 0.1, 0.1), j.col));
    // cena 6: poeira dos prédios novos
    FUTURE.forEach((id, k) => {
      const o = world.byId.get(id)!;
      const p = q(scr((o.fp[0] + o.fp[2]) / 2, (o.fp[1] + o.fp[3]) / 2, 0));
      dust(c, p.x, p.y, ((o.fp[2] - o.fp[0]) * 22 * cam.zoom) / 4, t, 53.1 + k * 0.7, 1.4);
    });
    // cena 7: holofotes da prefeitura
    if (t > 62.4 && t < 69) { const p = q(anchor('prefeitura')); searchlights(c, p.x, p.y + 6, t, win(t, 62.6, 68.6, 0.8, 0.6)); }
  };

  const typedN = Math.floor(clamp((t - (A.comentar + 0.5)) / 1.7) * TYPED.length);
  const pEsc = anchor('escola'), pHosp = anchor('hospital'), pPref = anchor('prefeitura');
  const lucasScr = lu ? scr(lu.i, lu.j, 26) : null;
  const jobPing = JOBS5.find((j, k) => t >= j.at - 0.12 && t < (JOBS5[k + 1]?.at ?? S6_CUT) - 0.12);

  return (
    <EpisodeShell
      t={t} blocks={blocks} speaking={speaking} cues={CUES}
      narration={['audio/ep01/narracao.wav', 'audio/ep01/narracao.mp3']} music="audio/music/ep01.wav"
      ambience={[
        { file: 'audio/sfx/night-ambience.wav', points: [[0, 0.25], [1, 0.4], [8, 0.4], [8.6, 1], [14.5, 1], [16, 0.35], [70, 0.35], [75, 0]] },
        { file: 'audio/sfx/water.wav', points: [[11.2, 0], [11.8, 0.8], [15.2, 0.8], [15.8, 0], [57.6, 0], [58.2, 0.8], [62.8, 0.8], [63.4, 0]] },
      ]}
    >
      <CityCanvas params={S.params} />
      <FxLayer draw={drawFx} />
      {t > 69.6 && <FxLayer blend="screen" draw={(c) => fireworks(c, t, 70.2, 75.2, 11)} />}

      {/* cena 1: rótulos dos prédios clicados no ritmo da fala */}
      <WorldLabel x={pEsc.x} y={pEsc.y} title="ESCOLA" icon="book" a={win(t, A.escola - 0.05, A.hosp + 0.55, 0.25, 0.25)} stem={50} align="left" />
      <WorldLabel x={pHosp.x} y={pHosp.y} title="HOSPITAL" icon="cross" a={win(t, A.hosp - 0.05, A.pref + 0.65, 0.25, 0.25)} stem={40} color={C.red} align="right" />
      <WorldLabel x={pPref.x} y={pPref.y} title="PREFEITURA" icon="crown" a={win(t, A.pref - 0.05, 7.5, 0.25, 0.3)} stem={60} />
      {/* cena 4: nome do personagem de exemplo */}
      {lucasScr && <WorldLabel x={lucasScr.x} y={lucasScr.y} title="LUCAS" sub="MECÂNICO · EXEMPLO" icon="wrench" a={win(t, 28.5, 34.9, 0.3, 0.3)} stem={30} color={C.cyan} />}
      {/* cena 5: profissões */}
      {JOBS5.map((jb, k) => {
        const p = anchor(jb.id);
        return <WorldLabel key={jb.id} x={p.x} y={p.y} title={jb.title} sub={jb.sub} icon={jb.icon} a={win(t, jb.at + 0.2, (JOBS5[k + 1]?.at ?? S6_CUT) - 0.2, 0.2, 0.15)} stem={34} color={jb.col} />;
      })}

      {/* transições de jogo entre os planos (sobre a cidade, por baixo da HUD) */}
      <FxLayer draw={(c) => CUTS.forEach((tc) => tileWipe(c, t, tc))} />

      {/* HUD fixa + minimapa nas cenas de passeio */}
      <Hud moradores={EP.estado.moradores} empregos={EP.estado.empregos} dia={1} hora={clock(t)} show={1} warnMoradores={t > 6.3 && t < 15.5} pulseMoradores={win(t, 6.3, 7.6, 0.15, 0.3) + win(t, 8.0, 9.4, 0.1, 0.4)} />
      <Minimap cam={cam} t={t} a={win(t, 2.4, 7.9, 0.4, 0.3) + win(t, JOBS5[0].at - 0.1, S6_CUT - 0.1, 0.3, 0.2)}
        ping={t < 8 ? (t > A.pref ? { i: 12.5, j: 7 } : t > A.hosp ? { i: 18, j: 6.5 } : { i: 6.5, j: 5.5 }) : jobPing ? { i: jobPing.click[0], j: jobPing.click[1] } : null} />
      {cur && <Cursor x={cur.x} y={cur.y} press={cur.press} clickAge={cur.clickAge} a={Math.min(1, curA)} />}

      {/* cena 1: carimbo DIA 01 desde o primeiro quadro */}
      <Stamp a={clamp(0.62 + t * 1.6) * (1 - smooth((t - 2.3) / 0.35))} text="DIA 01" sub="A CIDADE ESTÁ PRONTA" y={420} />
      {/* cena 2 */}
      <BigCounter a={win(t, 8.25, 14.7, 0.3, 0.3)} value={0} label="MORADORES" sub={t > 10.2 ? `${city.casas.total} CASAS VAZIAS` : undefined} blink={t > 8.3} t={t} y={430} />
      {/* cena 3 */}
      <CtaButton a={win(t, A.seguir - 0.35, A.morador - 0.2, 0.25, 0.25) * (t > A.seguir + 0.15 && t < A.seguir + 0.35 ? 0.88 : 1)} icon="follow" text="SEGUIR" color={C.cyan} t={t} y={420} />
      <div style={{ position: 'absolute', left: 50, top: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Toast icon="person" text="+1 MORADOR" a={smooth((t - A.morador) / 0.3)} out={smooth((t - 23.9) / 0.4)} color={C.green} />
        <Toast icon="job" text="+1 PROFISSÃO" a={smooth((t - A.morador - 0.75) / 0.3)} out={smooth((t - 23.95) / 0.4)} color={C.yellow} />
        <Toast icon="scroll" text="+1 HISTÓRIA" a={smooth((t - A.morador - 1.5) / 0.3)} out={smooth((t - 24.0) / 0.4)} color={C.cyan} />
      </div>
      {/* cena 4 */}
      <CommentCard a={smooth((t - (A.comentar - 0.4)) / 0.4)} out={smooth((t - 31.9) / 0.4)} typed={TYPED.slice(0, typedN)} t={t} y={370} />
      <Stamp a={win(t, A.proximo - 0.15, 34.9, 0.45, 0.3)} text="PRÓXIMO EPISÓDIO" sub="SEU PERSONAGEM PODE APARECER" y={400} color={C.cyan} rot={-4} />
      {/* cena 6 */}
      <SimTag a={win(t, 48.3, 57.9, 0.3, 0.3)} />
      <GrowthBar a={win(t, 48.5, 52.9, 0.3, 0.3)} f={(t - 48.7) / 3.8} t={t} />
      <div style={{ position: 'absolute', left: 50, top: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Toast icon="house" text="NOVOS BAIRROS" a={smooth((t - A.bairros) / 0.3)} out={smooth((t - 57.6) / 0.4)} color={C.green} />
        <Toast icon="cart" text="NOVOS NEGÓCIOS" a={smooth((t - A.negocios) / 0.3)} out={smooth((t - 57.65) / 0.4)} color={C.yellow} />
        <Toast icon="heart" text="NOVAS HISTÓRIAS" a={smooth((t - A.historias) / 0.3)} out={smooth((t - 57.7) / 0.4)} color="#ff7aa8" />
      </div>
      {/* cena 7 */}
      <FoundersPanel a={smooth((t - 58.5) / 0.45)} out={smooth((t - 62.6) / 0.4)} t={t} />
      <GoalsPanel a={smooth((t - 63.1) / 0.6)} out={smooth((t - 67.9) / 0.35)} metas={city.metas} t={t} highlight={t > A.prefeito - 1.2 ? 3 : -1} />
      {/* cena 8 */}
      <CtaButton a={win(t, A.segue - 0.15, 71.9, 0.3, 0.3)} icon="follow" text="SEGUE O PERFIL" color={C.cyan} t={t} y={420} />
      <CtaButton a={win(t, A.comenta - 0.15, 71.9, 0.3, 0.3)} icon="comment" text="NOME + PROFISSÃO" color={C.yellow} t={t} y={600} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 440, opacity: smooth((t - 71.95) / 0.35), transform: `scale(${0.85 + 0.15 * easeOut(clamp((t - 71.95) / 0.5))})` }}>
        <Logo size={124} />
        <div style={{ marginTop: 34, fontFamily: F.hud, fontWeight: 700, fontSize: 31, color: C.white, letterSpacing: 2, textShadow: '0 4px 0 #000', textAlign: 'center', lineHeight: 1.5 }}>
          VOCÊ SEGUE. VOCÊ MORA.<br /><span style={{ color: C.yellow }}>VOCÊ DECIDE.</span>
        </div>
      </AbsoluteFill>
    </EpisodeShell>
  );
};

function clock(t: number) {
  const m = 21 * 60 + 40 + Math.floor(t / 4);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
