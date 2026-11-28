// EPISÓDIO 02 — OS PRIMEIROS MORADORES CHEGARAM! (75 s, narração oficial "10_pessoas.mp3", voz do Ep. 01)
// Tudo é função pura de t e ancorado nas palavras da narração (W('palavra'), words.json).
// Dados: elenco FECHADO do Ep. 02 (episodes.json → ep02.lista) e números congelados em episodes.json → ep02.estado.
// Honestidade: só o Mateus é numerado (Nº 1, confirmado); cemitério e advocacia aparecem como PROJETOS (planta),
// nunca como obras prontas; a decisão de construir é da administração da cidade, não um pedido do Roberto.
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Toast } from '../../components/hud/Toast';
import { Minimap } from '../../components/hud/Minimap';
import { Cursor, cursorAt, type CursorKey } from '../../components/hud/Cursor';
import { Stamp, SimTag, CtaButton } from '../../components/hud/Panels';
import { makeBlocks } from '../../components/Captions';
import { FxLayer } from '../../components/fx/FxLayer';
import { sparkles, dust, marker, glitch, selection, tileWipe } from '../../components/fx/fx';
import { C, F } from '../../components/theme';
import { cameraCuts, type Key } from '../../utils/camera';
import { clamp, smooth, win, easeOut, lerp } from '../../utils/easing';
import { stage, autoTilt } from '../../series/stage';
import { EpisodeShell, type Cue } from '../../series/EpisodeShell';
import { InteriorShot } from '../../series/InteriorShot';
import { personObj } from '../../engine/dynamics';
import { lookOf, type Pose } from '../../engine/sprites/people';
import { getWorld } from '../../engine/world';
import { vehiclesAt } from '../../engine/traffic';
import type { Obj } from '../../engine/types';
import { buildings, city, episodes } from '../../data';
import { WORDS, W, speaking } from './narration';
import { FUNDADORES, fundador, andando, estadoDia02, CASAS_OCUPADAS, ABERTOS, PLANEJADOS_DIA02 } from './cidade';
import { FounderCard, FounderPair, GoldCounter, NumStamp, FoundersGrid, ServicesPanel, MissionPanel, FreePanel, NextCard, GOLD, PIO } from './ui';

export const EP02_SECONDS = 75;
const TIME_OFFSET = 40; // relógio do trânsito (o mesmo da simulação determinística)
const EP = episodes.find((e) => e.id === 'ep02')!;
const EST = EP.estado;
const VAGAS = EST.vagas!;
const CASAS = EST.casas!;
const SEGUIDORES = EST.seguidores ?? null; // informado pelo dono do canal; enquanto for null, o contador não aparece
const R = {
  mateus: fundador('Mateus'), davi: fundador('Davi'), gabriel: fundador('Gabriel'), juan: fundador('Juan'), mari: fundador('Mari'),
  roberto: fundador('Roberto'), alicia: fundador('Alicia'), gabrielly: fundador('Gabrielly'), jorge: fundador('Jorge'), muri: fundador('Muri'),
};
const world0 = getWorld();

// ---------------- âncoras da fala ----------------
const A = {
  dez: W('dez'), morar: W('morar'), escolheu: W('escolheu'), coveiro: W('coveiro'), cemiterio: W('cemitério'),
  ontem: W('ontem'), zero: W('zero'), hoje: W('hoje'), casas: W('casas', 11), donos: W('donos'),
  mateus: W('mateus'), medico: W('médico'), chegar: W('chegar'), numero: W('número'),
  davi: W('davi'), policial: W('policial'), gabriel: W('gabriel'), juan: W('juan'), oficina: W('oficina'),
  mari: W('mari'), neuro: W('neurocirurgiã'), alicia: W('alicia'), muri: W('muri'), empresarios: W('empresários'),
  gabrielly: W('gabrielly'), advogada: W('advogada'), jorge: W('jorge'), comerciante: W('comerciante'),
  roberto: W('roberto'), coveiro2: W('coveiro', 36), problema: W('problema'), onde: W('onde'), trabalhar: W('trabalhar'),
  reservar: W('reservar'), terreno: W('terreno'), construir: W('construir'), cemiterio2: W('cemitério', 44),
  outro: W('outro'), escritorio: W('escritório'), advocacia: W('advocacia'), gabrielly2: W('gabrielly', 48),
  carros: W('carros'), cinco: W('cinco'), portas: W('portas'),
  moradores3: W('moradores', 55), distintivo: W('distintivo'), dourado: W('dourado'), fundador: W('fundador'), sempre: W('sempre'),
  agora: W('agora'), missao: W('missão'), encontrar: W('encontrar'), pioneiros: W('pioneiros'),
  catorze: W('catorze'), disponiveis: W('disponíveis'), comente: W('comente'), nome: W('nome', 68), profissao: W('profissão', 69),
  quem: W('quem'), proximo: W('próximo', 70), segue: W('seguecity', 72),
};

// ---------------- planos (cortes cobertos por transição em ladrilhos) ----------------
const T = {
  hook: 0, rob: 3.1, ontem: 7.74, hoje: 10.94, mateus: 14.55, mateusH: 17.5, davi: 19.58, oficina: 22.32, iMari: 26.12,
  empresa: 28.46, gaby: 31.25, iJorge: 33.34, roberto: 35.3, problema: 38.62, cemit: 42.16, advoc: 46.24, carros: 49.3,
  servicos: 51.82, fund: 54.48, cerimonia: 56.62, missao: 60.06, casas: 65.64, comente: 68.38, fim: 71.3,
};
const CUTS = Object.values(T).filter((x) => x > 0);
const INTERIORS: [number, number][] = [[T.iMari, T.empresa], [T.iJorge, T.roberto]];
const inInterior = (t: number) => INTERIORS.some(([a, b]) => t >= a && t < b);
// placas "EM BREVE" dos dois lotes que viram projeto neste episódio (o terreno do cemitério aparece vazio)
const SIGNS_HIDDEN = world0.objects.filter((o) => ['cemiterio', 'futuro-3'].some((id) => {
  const b = buildings.find((x) => x.id === id)!;
  const ci = (o.fp[0] + o.fp[2]) / 2, cj = (o.fp[1] + o.fp[3]) / 2;
  return !o.ref && Math.abs(ci - (b.posicao.i + 1)) < 0.3 && Math.abs(cj - (b.posicao.j + b.tamanho.d - 0.5)) < 0.3;
})).map((o) => o.id);

// alvo em tiles (i, j), altura z (px) e zoom; a câmera nunca para
const SHOTS: Key[][] = [
  [{ t: T.hook, i: 10.6, j: 27.0, z: 2, zoom: 3.5 }, { t: T.rob, i: 11.0, j: 27.2, z: 2, zoom: 3.8 }],
  [{ t: T.rob, i: 29.1, j: 30.2, z: 8, zoom: 7.2 }, { t: T.ontem, i: 29.3, j: 30.4, z: 8, zoom: 8.0 }],
  [{ t: T.ontem, i: 10.0, j: 27.0, z: 2, zoom: 2.75 }, { t: T.hoje, i: 10.4, j: 27.3, z: 2, zoom: 2.95 }],
  [{ t: T.hoje, i: 10.5, j: 27.4, z: 2, zoom: 3.0 }, { t: T.mateus, i: 10.1, j: 27.0, z: 2, zoom: 3.3 }],
  [{ t: T.mateus, i: 4.3, j: 27.4, z: 8, zoom: 5.4 }, { t: T.mateusH, i: 4.8, j: 27.2, z: 8, zoom: 5.9 }],
  [{ t: T.mateusH, i: 17.6, j: 9.9, z: 18, zoom: 3.9 }, { t: T.davi, i: 18.0, j: 9.7, z: 18, zoom: 4.3 }],
  [{ t: T.davi, i: 5.2, j: 23.2, z: 10, zoom: 4.6 }, { t: T.oficina, i: 5.7, j: 23.3, z: 10, zoom: 5.0 }],
  [{ t: T.oficina, i: 7.6, j: 23.4, z: 10, zoom: 5.0 }, { t: T.iMari, i: 8.2, j: 23.6, z: 10, zoom: 5.6 }],
  [{ t: T.empresa, i: 8.4, j: 12.8, z: 14, zoom: 4.2 }, { t: T.gaby, i: 8.6, j: 12.4, z: 14, zoom: 4.6 }],
  [{ t: T.gaby, i: 17.6, j: 23.8, z: 10, zoom: 4.4 }, { t: T.iJorge, i: 18.2, j: 24.0, z: 10, zoom: 4.8 }],
  [{ t: T.roberto, i: 29.6, j: 30.4, z: 10, zoom: 8.6 }, { t: T.problema, i: 29.7, j: 30.5, z: 10, zoom: 9.4 }],
  [{ t: T.problema, i: 25.6, j: 27.6, z: 6, zoom: 2.6 }, { t: T.cemit, i: 26.4, j: 28.2, z: 6, zoom: 3.0 }],
  [{ t: T.cemit, i: 27.6, j: 29.4, z: 8, zoom: 4.2 }, { t: T.advoc, i: 27.9, j: 29.7, z: 10, zoom: 4.7 }],
  [{ t: T.advoc, i: 17.0, j: 22.4, z: 14, zoom: 4.4 }, { t: T.carros, i: 17.3, j: 22.9, z: 14, zoom: 4.9 }],
  [{ t: T.carros, i: 20.4, j: 17.9, z: 4, zoom: 4.8 }, { t: T.servicos, i: 20.4, j: 14.4, z: 4, zoom: 5.0 }],
  [{ t: T.servicos, i: 11.2, j: 14.6, z: 10, zoom: 1.85 }, { t: T.fund, i: 11.4, j: 14.2, z: 10, zoom: 1.98 }],
  [{ t: T.fund, i: 12.6, j: 15.2, z: 12, zoom: 2.6 }, { t: T.cerimonia, i: 12.6, j: 15.6, z: 12, zoom: 2.8 }],
  [{ t: T.cerimonia, i: 12.0, j: 15.4, z: 20, zoom: 4.2 }, { t: T.missao, i: 12.3, j: 15.8, z: 20, zoom: 4.7 }],
  [{ t: T.missao, i: 15.2, j: 16.0, z: -6, zoom: 1.3 }, { t: T.casas, i: 15.6, j: 15.6, z: -10, zoom: 1.42 }],
  [{ t: T.casas, i: 20.8, j: 24.6, z: 2, zoom: 1.6 }, { t: T.comente, i: 21.4, j: 24.4, z: 2, zoom: 1.72 }],
  [{ t: T.comente, i: 9.6, j: 30.4, z: 8, zoom: 4.4 }, { t: T.fim, i: 10.0, j: 30.6, z: 8, zoom: 4.9 }],
  [{ t: T.fim, i: 15.0, j: 18.0, z: 30, zoom: 2.0 }, { t: 73.5, i: 15.4, j: 16.4, z: 20, zoom: 1.45 }, { t: 75, i: 15.6, j: 16.0, z: 16, zoom: 1.36 }],
];
// altura do assunto na tela: painéis no alto empurram o assunto para baixo (legendas ficam em 64–77%)
const FRAME_Y: [number, number][] = [
  [T.hook, 0.52], [T.rob, 0.58], [T.ontem, 0.52], [T.hoje, 0.54], [T.mateus, 0.63], [T.mateusH, 0.6], [T.davi, 0.63], [T.oficina, 0.64],
  [T.empresa, 0.64], [T.gaby, 0.63], [T.roberto, 0.6], [T.problema, 0.56], [T.cemit, 0.58], [T.advoc, 0.6], [T.carros, 0.55],
  [T.servicos, 0.64], [T.fund, 0.74], [T.cerimonia, 0.74], [T.missao, 0.66], [T.casas, 0.64], [T.comente, 0.66], [T.fim, 0.5],
];
const frameY = (t: number) => FRAME_Y.reduce((y, [a, v]) => (t >= a ? v : y), 0.55);

// ---------------- gancho: as 10 casas acendem em sequência (uma por fundador) ----------------
const HOUSES = FUNDADORES.map((r) => r.casa!);
const litAt = (k: number) => -0.1 + k * 0.255; // a 1ª casa já está acesa no 1º quadro (contador em 1, subindo)
// "Hoje… as primeiras dez casas ganharam seus donos": acendem de novo, uma a uma, com marcador dourado
const donoAt = (k: number) => A.casas - 0.25 + k * 0.17;

// ---------------- serviços abertos (dados: prédios com funcionário que já existem) ----------------
const SERV_INFO: Record<string, { nome: string; icon: string }> = {
  hospital: { nome: 'HOSPITAL', icon: 'cross' }, delegacia: { nome: 'DELEGACIA', icon: 'badge' }, oficina: { nome: 'OFICINA MECÂNICA', icon: 'wrench' },
  mercado: { nome: 'MERCADINHO', icon: 'cart' }, 'escritorio-1': { nome: 'CENTRO EMPRESARIAL', icon: 'building' },
};
const SERVICOS = [...ABERTOS].map((id, k) => ({ id, ...(SERV_INFO[id] ?? { nome: buildings.find((b) => b.id === id)!.nome.toUpperCase(), icon: 'building' }), at: A.cinco - 0.05 + k * 0.36 }));

// distintivo dourado: uma estrela por fundador, em sequência, quando a fala diz "dourado"
const starAt = (k: number) => A.dourado - 0.15 + k * 0.09;

// ---------------- personagens por plano (posições próprias onde a cena pede) ----------------
function founderObjs(t: number): Obj[] {
  if (t >= T.ontem && t < T.hoje) return []; // Dia 01: ninguém morava
  return FUNDADORES.map((r) => {
    if (r.id === R.mateus.id && t >= T.mateus && t < T.mateusH) { // Mateus chega em casa (Casa 12)
      const f = clamp((t - (T.mateus + 0.1)) / 1.7);
      const pose: Pose = f < 1 ? 'walk' : t > A.chegar + 0.2 ? 'wave' : 'idle';
      const j = f < 1 ? 27.83 : 27.83 - smooth((t - T.mateus - 1.8) / 0.5) * 0.22;
      return personObj(`fund-${r.id}`, lookOf(r.aparencia!), `fund-${r.id}`, 2.7 + 2.3 * easeOut(f), j, f < 1 ? 0 : 1, Math.floor(t * 4.2) % 4, 1, 0.7, pose);
    }
    return andando(r, t);
  });
}

// ---------------- efeitos sonoros (todos ancorados na fala) ----------------
const CUES: Cue[] = [
  { at: 0.0, name: 'stamp', gain: 0.9 },
  ...HOUSES.map((_, k) => ({ at: Math.max(0, litAt(k)), name: 'coin', gain: 0.55 + 0.03 * k })),
  { at: 2.55, name: 'levelup', gain: 0.85 },
  { at: T.rob, name: 'ui-move' }, { at: A.coveiro, name: 'popup' }, { at: A.cemiterio + 0.05, name: 'empty', gain: 1.1 },
  { at: A.ontem, name: 'ui-move', gain: 0.8 }, { at: A.zero, name: 'stamp', gain: 0.9 },
  { at: A.hoje, name: 'sparkle', gain: 1.1 },
  ...HOUSES.map((_, k) => ({ at: donoAt(k), name: 'tick', gain: 0.8 })),
  { at: A.donos + 0.1, name: 'unlock' },
  { at: A.mateus, name: 'popup' }, { at: A.chegar, name: 'sparkle' }, { at: A.numero, name: 'stamp', gain: 1.1 },
  ...[A.davi, A.gabriel, A.juan, A.mari, A.alicia, A.muri, A.gabrielly, A.jorge].map((at) => ({ at: at - 0.03, name: 'ui-blip', gain: 1.1 })),
  ...[T.davi, T.oficina, T.iMari, T.empresa, T.gaby, T.iJorge].map((at) => ({ at, name: 'ui-move', gain: 0.6 })),
  { at: A.roberto, name: 'popup' }, { at: A.coveiro2, name: 'stamp', gain: 1.0 },
  { at: A.problema, name: 'empty', gain: 1.2 }, { at: A.onde + 0.2, name: 'notify' },
  { at: A.reservar + 0.1, name: 'ui-blip' }, { at: A.terreno, name: 'stamp', gain: 0.8 }, { at: A.construir, name: 'build' }, { at: A.cemiterio2, name: 'unlock' },
  { at: A.outro + 0.1, name: 'ui-blip' }, { at: A.escritorio, name: 'build' }, { at: A.advocacia, name: 'unlock' }, { at: A.gabrielly2 + 0.3, name: 'notify', gain: 0.8 },
  { at: A.carros, name: 'popup' },
  ...SERVICOS.map((s) => ({ at: s.at, name: 'coin', gain: 0.8 })),
  { at: T.fund + 0.1, name: 'ui-move' },
  { at: A.distintivo, name: 'sparkle', gain: 1.1 },
  ...FUNDADORES.map((_, k) => ({ at: A.dourado - 0.1 + k * 0.09, name: 'tick', gain: 0.7 })),
  { at: A.fundador, name: 'levelup', gain: 1.0 },
  { at: A.agora, name: 'notify', gain: 1.0 }, { at: A.encontrar, name: 'popup' }, { at: A.pioneiros, name: 'unlock', gain: 1.1 },
  { at: A.catorze, name: 'popup' }, { at: A.disponiveis, name: 'coin' },
  { at: A.comente, name: 'notify' }, { at: A.nome, name: 'popup' }, { at: A.proximo, name: 'sparkle', gain: 1.1 },
  { at: A.segue - 0.05, name: 'levelup', gain: 1.0 },
];

export const Ep02: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const blocks = useMemo(() => makeBlocks(WORDS), []);
  const interior = inInterior(t);
  const dia01 = t >= T.ontem && t < T.hoje;

  // ---------------- estado da cidade ----------------
  const plantaCem = t >= A.construir - 0.05 ? 1 : 0, plantaAdv = t >= A.escritorio - 0.05 ? 1 : 0;
  const st = estadoDia02(t, { planta: 0 });
  const overrides: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number; lit?: number }> = { ...st.overrides };
  const reveal = new Set<string>();
  const hidden = new Set<string>(SIGNS_HIDDEN);
  // casas dos fundadores: no gancho acendem em sequência; no "Hoje…" acendem de novo, uma a uma
  if (t < T.rob) HOUSES.forEach((id, k) => { overrides[id] = { lit: smooth((t - litAt(k)) / 0.18) }; });
  if (t >= T.hoje && t < T.mateus) HOUSES.forEach((id, k) => { overrides[id] = { lit: smooth((t - donoAt(k)) / 0.15) }; });
  if (dia01) { HOUSES.forEach((id) => { overrides[id] = { lit: 0 }; }); Object.keys(overrides).forEach((id) => { if (!HOUSES.includes(id)) delete overrides[id]; }); }
  // projetos (planta holográfica subindo do chão); só depois de a fala reservar o terreno
  const plant = (id: string, t0: number, on: number) => {
    if (!on) return;
    reveal.add(id);
    const o = world0.byId.get(id)!;
    const focus = (id === 'cemiterio' ? t < T.advoc : t < T.carros) ? 1 : 0;
    overrides[id] = { ghost: 1, alpha: focus ? 0.85 : 0.5, dy: (o.sprite.h + 4) * (1 - easeOut(clamp((t - t0) / 0.9))) };
  };
  plant('cemiterio', A.construir, plantaCem);
  plant('futuro-3', A.escritorio, plantaAdv);
  // serviços: no plano dos serviços, os abertos acendem na hora em que são contados
  if (t >= T.servicos && t < T.fund) SERVICOS.forEach((s) => { overrides[s.id] = { lit: lerp(0.3, 1, smooth((t - s.at) / 0.2)) }; });

  const shotZoom = cameraCuts(SHOTS, t).zoom;
  const S = stage({
    t, shots: SHOTS, frameY: frameY(t), people: 0, traffic: dia01 ? 0 : 1, vehicles: dia01 ? [] : st.vehicles, homeFrac: 0,
    extra: founderObjs(t), overrides, reveal, hidden, tilt: autoTilt(shotZoom) * 0.85, timeOffset: TIME_OFFSET,
  });
  const { cam, anchor, corners, scr, world } = S;
  const homes = world.objects.filter((o) => o.group === 'home' && !o.planned && o.kind === 'casa');
  const vazias = homes.filter((o) => !CASAS_OCUPADAS.has(o.ref ?? o.id));

  // posição de tela de um fundador (sprite na rua)
  const fScr = (r: typeof R.mateus, z = 0) => {
    const o = founderObjs(t).find((x) => x.id === `fund-${r.id}`);
    return o ? scr((o.fp[0] + o.fp[2]) / 2, (o.fp[1] + o.fp[3]) / 2, z) : { x: 540, y: 960 };
  };

  // ---------------- cursor do jogador ----------------
  const cem = corners('cemiterio'), adv = corners('futuro-3');
  const mid = (cs: { x: number; y: number }[]) => ({ x: cs.reduce((s, p) => s + p.x, 0) / 4, y: cs.reduce((s, p) => s + p.y, 0) / 4 });
  const cursorPath: CursorKey[] =
    t < T.advoc ? [{ t: T.cemit + 0.1, x: 960, y: 1250 }, { t: A.reservar + 0.3, x: mid(cem).x, y: mid(cem).y, click: true }, { t: T.advoc, x: mid(cem).x + 60, y: mid(cem).y + 80 }]
    : [{ t: T.advoc + 0.05, x: 980, y: 1200 }, { t: A.outro + 0.25, x: mid(adv).x, y: mid(adv).y, click: true }, { t: T.carros, x: mid(adv).x + 70, y: mid(adv).y + 70 }];
  const cur = cursorAt(cursorPath, t);
  const curA = win(t, T.cemit + 0.05, T.advoc - 0.1, 0.2, 0.2) + win(t, T.advoc + 0.02, T.carros - 0.1, 0.2, 0.2);

  // ---------------- efeitos sobre a cidade ----------------
  const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
  const ring = (r: typeof R.mateus, a: number, col = GOLD) => {
    const o = founderObjs(t).find((x) => x.id === `fund-${r.id}`);
    if (!o || a <= 0.01) return;
    return { o, a, col };
  };
  const drawFx = (c: CanvasRenderingContext2D) => {
    // gancho e "donos": brilho dourado em cada casa que acende
    if (t < T.rob) HOUSES.forEach((id, k) => { const p = q(anchor(id)); sparkles(c, p.x, p.y + 4, t, litAt(k), 1.0, '#ffd84a'); });
    if (t >= T.hoje && t < T.mateus) HOUSES.forEach((id, k) => { const p = q(anchor(id)); marker(c, p.x, p.y - 2, t, smooth((t - donoAt(k)) / 0.2), 'person', '#ffd84a', k); });
    if (t >= T.ontem && t < T.hoje) homes.forEach((o, k) => { const p = q(S.P(o.anchor!.x, o.anchor!.y)); marker(c, p.x, p.y - 2, t, smooth((t - (A.zero + k * 0.03)) / 0.2), 'person', '#ff4a5a', k); });
    // fundador em destaque: contorno no chão + brilho
    const hi: [typeof R.mateus, number, number][] = [
      [R.roberto, A.coveiro - 0.1, T.ontem - 0.1], [R.mateus, A.mateus, T.mateusH - 0.1], [R.mateus, T.mateusH + 0.2, T.davi - 0.1], [R.davi, A.davi, T.oficina - 0.1],
      [R.gabriel, A.gabriel, T.iMari - 0.1], [R.juan, A.juan, T.iMari - 0.1], [R.alicia, A.alicia, T.gaby - 0.1], [R.muri, A.muri, T.gaby - 0.1],
      [R.gabrielly, A.gabrielly, T.iJorge - 0.1], [R.roberto, A.roberto, T.problema - 0.1], [R.roberto, A.onde, T.cemit - 0.1],
    ];
    hi.forEach(([r, a0, a1]) => {
      const h = ring(r, win(t, a0, a1, 0.12, 0.12));
      if (!h) return;
      const { o } = h; const ci = (o.fp[0] + o.fp[2]) / 2, cj = (o.fp[1] + o.fp[3]) / 2, s = 0.32;
      selection(c, [scr(ci - s, cj - s), scr(ci + s, cj - s), scr(ci + s, cj + s), scr(ci - s, cj + s)].map(q), t, h.a, r.id === R.roberto.id && t >= T.problema ? C.red : GOLD);
      if (t - a0 < 1.3 && t > a0) { const p = q(scr(ci, cj, 0)); sparkles(c, p.x, p.y, t, a0, 1.3, '#ffd84a'); }
    });
    glitch(c, t, A.cemiterio + 0.02, 0.24);
    selection(c, cem.map(q), t, win(t, A.cemiterio, T.ontem - 0.1, 0.1, 0.15), C.red);
    glitch(c, t, A.problema + 0.05, 0.3);
    // terrenos reservados e plantas subindo
    selection(c, cem.map(q), t, win(t, A.reservar + 0.35, T.advoc - 0.1, 0.12, 0.2), plantaCem ? C.cyan : GOLD);
    selection(c, adv.map(q), t, win(t, A.outro + 0.3, T.carros - 0.1, 0.12, 0.2), plantaAdv ? C.cyan : GOLD);
    if (t > A.construir && t < A.construir + 1.6) { const p = q(mid(cem)); dust(c, p.x, p.y, 60 * cam.zoom / 4, t, A.construir, 1.3); }
    if (t > A.escritorio && t < A.escritorio + 1.6) { const p = q(mid(adv)); dust(c, p.x, p.y, 40 * cam.zoom / 4, t, A.escritorio, 1.3); }
    // primeiros carros: anel em cada carro da frota do Dia 02 que está no quadro
    if (t >= T.carros && t < T.servicos) vehiclesAt(t + TIME_OFFSET).filter((v) => st.vehicles.includes(v.veh.id)).forEach((v, k) => {
      const s = 0.42, a = win(t, A.carros - 0.15 + k * 0.12, T.servicos - 0.1, 0.15, 0.15);
      selection(c, [scr(v.i - s, v.j - s), scr(v.i + s, v.j - s), scr(v.i + s, v.j + s), scr(v.i - s, v.j + s)].map(q), t, a, GOLD);
    });
    // serviços abertos: contorno verde em cada um, na hora em que é contado
    if (t >= T.servicos && t < T.fund) SERVICOS.forEach((s, k) => { selection(c, corners(s.id).map(q), t, win(t, s.at, T.fund - 0.1, 0.1, 0.15), C.green); const p = q(anchor(s.id)); sparkles(c, p.x, p.y, t, s.at, 1.0, '#6bff8a'); void k; });
    // casas livres (pioneiros) e a casa do convite
    if (t >= T.casas && t < T.comente) vazias.forEach((o, k) => { const p = q(S.P(o.anchor!.x, o.anchor!.y)); marker(c, p.x, p.y - 2, t, smooth((t - (A.catorze - 0.1 + k * 0.05)) / 0.2), 'person', '#5af2ff', k); });
    if (t >= T.comente && t < T.fim) { const id = 'casa-11'; selection(c, corners(id).map(q), t, win(t, A.comente, T.fim - 0.05, 0.12, 0.15), C.cyan); const p = q(anchor(id)); marker(c, p.x, p.y - 2, t, smooth((t - A.comente) / 0.2), 'person', '#5af2ff', 3); sparkles(c, p.x, p.y + 6, t, A.proximo, 1.4, '#5af2ff'); }
  };

  // ---------------- interiores ----------------
  const interiorView = (() => {
    if (t >= T.iMari && t < T.empresa)
      return <InteriorShot kind="hospital" t={t} t0={T.iMari} t1={T.empresa} zoom={[7.0, 7.6]} cy={1010}
        person={{ app: R.mari.aparencia!, key: 'mari-int', i: 7.7, j: 6.4, dir: 2, pose: 'idle', to: { i: 6.4, j: 6.4, t0: T.iMari + 0.1, t1: T.iMari + 1.1 } }} />;
    if (t >= T.iJorge && t < T.roberto)
      return <InteriorShot kind="mercado" t={t} t0={T.iJorge} t1={T.roberto} zoom={[7.0, 7.6]} cy={1010}
        person={{ app: R.jorge.aparencia!, key: 'jorge-int', i: 7.6, j: 6.9, dir: 2, pose: 'idle', to: { i: 6.6, j: 6.9, t0: T.iJorge + 0.05, t1: T.iJorge + 0.9 } }} />;
    return null;
  })();

  const L = (id: string) => anchor(id);
  const endA = smooth((t - (T.fim + 0.05)) / 0.5);
  const moradoresHud = t < T.rob ? HOUSES.filter((_, k) => t >= litAt(k)).length : dia01 ? 0 : EST.moradores;
  const pR = fScr(R.roberto, 30);
  const hora = (() => { const m = (dia01 ? 4 * 60 + 52 : 19 * 60 + 40) + Math.floor(t); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; })();

  return (
    <EpisodeShell
      t={t} blocks={blocks} speaking={speaking} cues={CUES}
      narration={['audio/ep02/narracao.wav']} music="audio/music/ep02.wav"
      musicLevels={{ alone: 0.8, underVoice: 0.3, betweenLines: 0.48 }}
      ambience={[{ file: 'audio/sfx/night-ambience.wav', points: [[0, 0.3], [T.ontem, 0.3], [T.ontem + 0.2, 0.85], [T.hoje - 0.1, 0.85], [T.hoje + 0.2, 0.3], [T.fim, 0.3], [75, 0.12]] }]}
    >
      {!interior && (dia01
        ? <AbsoluteFill style={{ filter: 'grayscale(0.75) sepia(0.25) brightness(0.8) contrast(1.05)' }}><CityCanvas params={S.params} /></AbsoluteFill>
        : <CityCanvas params={S.params} />)}
      {!interior && <FxLayer draw={drawFx} />}
      {interiorView}
      {dia01 && <AbsoluteFill style={{ boxShadow: 'inset 0 0 260px 60px rgba(0,0,0,0.75)', pointerEvents: 'none' }} />}

      {/* rótulos no mundo (no máximo 2 ao mesmo tempo) */}
      {!interior && (
        <>
          <WorldLabel x={pR.x} y={pR.y} title="ROBERTO · COVEIRO" sub="MORADOR FUNDADOR" icon="shovel" color={GOLD} a={win(t, A.coveiro - 0.05, T.ontem - 0.1, 0.2, 0.15)} stem={50} />
          <WorldLabel x={L(R.mateus.casa!).x} y={L(R.mateus.casa!).y} title="CASA 12" sub="DO MATEUS" icon="house" color={GOLD} a={win(t, A.chegar - 0.2, T.mateusH - 0.1, 0.2, 0.15)} stem={150} align="right" />
          <WorldLabel x={L('oficina').x} y={L('oficina').y} title="OFICINA MECÂNICA" icon="wrench" color={C.cyan} a={win(t, A.oficina, T.iMari - 0.1, 0.2, 0.15)} stem={36} align="left" />
          <WorldLabel x={pR.x} y={pR.y} title="ONDE TRABALHAR?" sub="ROBERTO · COVEIRO" icon="shovel" color={C.red} a={win(t, A.onde, T.cemit - 0.1, 0.2, 0.15)} stem={40} />
          <WorldLabel x={L('cemiterio').x} y={L('cemiterio').y} title={t < A.cemiterio2 ? 'TERRENO RESERVADO' : 'CEMITÉRIO'} sub={t < A.cemiterio2 ? 'DECISÃO DA ADMINISTRAÇÃO' : 'EM PROJETO · AINDA NÃO CONSTRUÍDO'} icon={t < A.cemiterio2 ? 'pin' : 'building'} color={t < A.cemiterio2 ? GOLD : C.cyan} a={win(t, A.terreno, T.advoc - 0.1, 0.2, 0.15)} stem={44} />
          <WorldLabel x={L('futuro-3').x} y={L('futuro-3').y} title="ADVOCACIA" sub="EM PROJETO · AINDA NÃO CONSTRUÍDO" icon="scales" color={C.cyan} a={win(t, A.advocacia - 0.1, T.carros - 0.1, 0.2, 0.15)} stem={40} />
        </>
      )}

      {/* transições de jogo entre os planos (sobre cidade e interiores, por baixo da HUD) */}
      <FxLayer draw={(c) => CUTS.forEach((tc) => tileWipe(c, t, tc))} />

      {/* HUD fixa + minimapa nos planos que procuram lugares */}
      <Hud moradores={moradoresHud} empregos={dia01 ? 48 : VAGAS.livres} dia={dia01 ? 1 : 2} hora={hora} show={1 - endA} warnMoradores={dia01}
        pulseMoradores={t < T.rob ? (t % 0.24 < 0.12 ? 0.6 : 0) * (t < 2.6 ? 1 : 0) : win(t, A.zero, A.zero + 0.8, 0.1, 0.3)} label="VAGAS LIVRES" seguidores={SEGUIDORES ?? undefined} />
      <Minimap cam={cam} t={t} a={(interior ? 0 : 1) * (win(t, T.problema + 0.3, T.cemit - 0.1, 0.3, 0.2) + win(t, A.gabrielly2 - 0.2, T.carros - 0.05, 0.3, 0.2))} ping={t < T.advoc ? { i: 28, j: 30 } : { i: 17, j: 22.5 }} />
      {cur && <Cursor x={cur.x} y={cur.y} press={cur.press} clickAge={cur.clickAge} a={Math.min(1, curA)} />}

      {/* gancho: o contador de moradores sobe com as casas acendendo */}
      <GoldCounter a={clamp(0.8 + t * 2)} out={smooth((t - (T.rob - 0.3)) / 0.3)} value={moradoresHud} label="MORADORES" sub={t > 2.2 ? 'DIA 02 · 10 FUNDADORES' : 'DIA 02'} y={380} />
      <Toast icon="search" text="CEMITÉRIO: 0" sub="A CIDADE NÃO TEM CEMITÉRIO" a={smooth((t - (A.cemiterio + 0.05)) / 0.25)} out={smooth((t - (T.ontem - 0.25)) / 0.25)} color={C.red} style={{ position: 'absolute', left: 50, top: 400 }} />
      <Stamp a={win(t, A.ontem + 0.1, T.hoje - 0.05, 0.3, 0.15)} text="DIA 01" sub="0 MORADORES" y={420} color="#c9ccd8" rot={-4} />
      <Stamp a={win(t, A.hoje, A.casas + 0.1, 0.3, 0.2)} text="DIA 02" sub="HOJE" y={420} color={GOLD} rot={-4} />
      <GoldCounter a={smooth((t - (A.casas + 0.05)) / 0.3)} out={smooth((t - (T.mateus - 0.3)) / 0.3)} value={HOUSES.filter((_, k) => t >= donoAt(k)).length} label="CASAS COM DONO" icon="house" y={380} />

      {/* os 10 fundadores, um a um (nome e profissão do cadastro) */}
      <FounderCard r={R.mateus} a={smooth((t - (A.mateus - 0.15)) / 0.35)} out={smooth((t - (T.mateusH - 0.3)) / 0.3)} t={t} />
      <NumStamp a={win(t, A.numero - 0.1, T.davi - 0.08, 0.4, 0.2)} label="MORADOR" n={1} sub="O PRIMEIRO A CHEGAR" y={400} />
      <FounderCard r={R.davi} a={smooth((t - (A.davi - 0.15)) / 0.35)} out={smooth((t - (T.oficina - 0.3)) / 0.3)} t={t} />
      <FounderPair rs={[R.gabriel, R.juan]} a={[smooth((t - (A.gabriel - 0.15)) / 0.35), smooth((t - (A.juan - 0.12)) / 0.35)]} out={smooth((t - (T.iMari - 0.3)) / 0.3)} t={t} />
      <FounderCard r={R.mari} a={smooth((t - (A.mari - 0.15)) / 0.35)} out={smooth((t - (T.empresa - 0.3)) / 0.3)} t={t} />
      <FounderPair rs={[R.alicia, R.muri]} a={[smooth((t - (A.alicia - 0.15)) / 0.35), smooth((t - (A.muri - 0.12)) / 0.35)]} out={smooth((t - (T.gaby - 0.3)) / 0.3)} t={t} />
      <FounderCard r={R.gabrielly} a={smooth((t - (A.gabrielly - 0.15)) / 0.35)} out={smooth((t - (T.iJorge - 0.3)) / 0.3)} t={t} />
      <FounderCard r={R.jorge} a={smooth((t - (A.jorge - 0.15)) / 0.35)} out={smooth((t - (T.roberto - 0.3)) / 0.3)} t={t} />
      <FounderCard r={R.roberto} a={smooth((t - (A.roberto - 0.1)) / 0.35)} out={smooth((t - (T.problema - 0.3)) / 0.3)} t={t} pop={(t - A.coveiro2) / 0.35} />

      {/* o problema e os dois projetos da cidade (planta, não obra pronta) */}
      <Toast icon="shovel" text="SEM LOCAL DE TRABALHO" sub="COVEIRO PRECISA DE UM CEMITÉRIO" a={smooth((t - (A.problema + 0.1)) / 0.25)} out={smooth((t - (T.cemit - 0.25)) / 0.25)} color={C.red} style={{ position: 'absolute', left: 50, top: 400 }} />
      <SimTag a={win(t, A.construir, T.carros - 0.1, 0.25, 0.15)} text="PROJETO DA CIDADE · OBRA FUTURA" y={380} />
      <Toast icon="building" text="2 PROJETOS NO MAPA" sub="CEMITÉRIO + ADVOCACIA · EM PLANEJAMENTO" a={smooth((t - (A.gabrielly2 - 0.1)) / 0.25)} out={smooth((t - (T.carros - 0.2)) / 0.25)} color={C.cyan} style={{ position: 'absolute', left: 50, top: 450 }} />

      {/* cidade ganhando vida */}
      <Toast icon="car" text="PRIMEIROS CARROS" sub="NAS RUAS DA SEGUECITY" a={smooth((t - (A.carros - 0.1)) / 0.25)} out={smooth((t - (T.servicos - 0.25)) / 0.25)} color={C.yellow} big style={{ position: 'absolute', left: 50, top: 400 }} />
      <ServicesPanel a={smooth((t - (T.servicos + 0.05)) / 0.3)} out={smooth((t - (T.fund - 0.3)) / 0.3)} itens={SERVICOS} t={t} y={370} />

      {/* fundadores para sempre */}
      <FoundersGrid rs={FUNDADORES} a={smooth((t - (T.fund + 0.05)) / 0.35)} out={smooth((t - (T.missao - 0.3)) / 0.3)} t={t} star={(k) => clamp((t - starAt(k)) / 0.3)} glow={win(t, A.fundador - 0.05, T.missao - 0.1, 0.15, 0.2)} ribbon={smooth((t - (A.sempre - 0.15)) / 0.3)} y={360} />

      {/* nova missão: a categoria PIONEIRO */}
      <MissionPanel a={smooth((t - (A.agora - 0.05)) / 0.35)} out={smooth((t - (T.casas - 0.3)) / 0.3)} t={t} titleA={(t - (A.encontrar - 0.1)) / 0.4} pioA={smooth((t - (A.pioneiros - 0.1)) / 0.3)} y={360} />
      <FreePanel a={smooth((t - (A.catorze - 0.2)) / 0.3)} out={smooth((t - (T.comente - 0.3)) / 0.3)} casas={CASAS.livres} vagas={VAGAS} jobA={(t - (A.disponiveis - 0.1)) / 0.35} y={370} />
      <NextCard a={smooth((t - (A.comente - 0.1)) / 0.35)} out={smooth((t - (T.fim - 0.25)) / 0.3)} t={t} y={360} />
      <CtaButton a={win(t, A.comente - 0.05, T.fim - 0.1, 0.25, 0.2)} icon="comment" text="COMENTE" color={C.yellow} t={t} y={700} />
      <CtaButton a={win(t, A.nome - 0.1, T.fim - 0.1, 0.25, 0.2)} icon="person" text="NOME + PROFISSÃO" color={PIO} t={t} y={860} />

      {/* marca (~4 s): a logo entra quando a fala chega em "SegueCity" */}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 170, opacity: endA, transform: `translateY(${(1 - easeOut(endA)) * 30}px) scale(${0.92 + 0.08 * easeOut(endA)})` }}>
        <Logo size={100} />
        <div style={{ marginTop: 22, fontFamily: F.hud, fontWeight: 700, fontSize: 26, color: C.white, letterSpacing: 3, opacity: smooth((t - (T.fim + 0.5)) / 0.4) }}>{city.slogan.toUpperCase()}</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 520, opacity: smooth((t - 73.25) / 0.35) }}>
        <div style={{ fontFamily: F.hud, fontWeight: 700, fontSize: 30, color: C.ink, background: PIO, padding: '8px 20px', letterSpacing: 2 }}>DIA 03 EM BREVE</div>
      </AbsoluteFill>
    </EpisodeShell>
  );
};
void PLANEJADOS_DIA02;
