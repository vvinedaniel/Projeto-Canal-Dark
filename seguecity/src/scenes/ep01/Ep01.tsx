// FASE 2 — Episódio 01 (75 s): "DIA 01 — Construí uma cidade inteira, mas ninguém mora nela".
// Tudo é função pura do tempo t e ancorado nas palavras da narração (narration.ts → W('palavra')).
import React, { useMemo } from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { CityCanvas } from '../../components/CityCanvas';
import { Hud } from '../../components/hud/Hud';
import { Logo } from '../../components/hud/Logo';
import { WorldLabel } from '../../components/hud/WorldLabel';
import { Toast } from '../../components/hud/Toast';
import { BigCounter, CommentCard, Stamp, SimTag, GrowthBar, FoundersPanel, GoalsPanel, CtaButton } from '../../components/hud/Panels';
import { Captions, makeBlocks } from '../../components/Captions';
import { FxLayer } from '../../components/fx/FxLayer';
import { fireworks, sparkles, dust, searchlights, marker, glitch } from '../../components/fx/fx';
import { Sfx } from '../../components/Sfx';
import { C, F } from '../../components/theme';
import { useFonts } from '../../hooks/useFonts';
import { cameraAt, toScreen, type Key } from '../../utils/camera';
import { clamp, smooth, win, easeOut, lerp } from '../../utils/easing';
import { asset, hasAsset } from '../../utils/audio';
import { getWorld } from '../../engine/world';
import { dynamics, personObj } from '../../engine/dynamics';
import { sx, sy } from '../../engine/iso';
import { hex } from '../../engine/color';
import { hash2 } from '../../engine/rng';
import type { Look } from '../../engine/sprites/people';
import type { Obj } from '../../engine/types';
import { episodes, jobs, city } from '../../data';
import { WORDS, W, phrase, speaking } from './narration';

export const EP01_SECONDS = 75;
const EP = episodes.find((e) => e.id === 'ep01')!;
const vagas = (id: string) => jobs.find((j) => j.id === id)?.vagas ?? 0;

// ---------------- câmera (alvo em tiles; zoom = px de saída por px de mundo) ----------------
const KEYS: Key[] = [
  // 1 — a cidade pronta
  { t: 0.0, i: 15.6, j: 14.6, z: 10, zoom: 1.32 },
  { t: 2.4, i: 13.6, j: 10.2, z: 14, zoom: 2.05 },
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
  // 5 — profissões
  { t: 35.6, i: 13.0, j: 18.5, z: 14, zoom: 1.85 },
  { t: 36.9, i: 16.0, j: 11.0, z: 26, zoom: 2.4 },
  { t: 37.6, i: 18.0, j: 7.6, z: 32, zoom: 3.1 },
  { t: 39.0, i: 17.6, j: 7.8, z: 32, zoom: 3.15 },
  { t: 39.6, i: 6.6, j: 7.0, z: 16, zoom: 3.15 },
  { t: 41.0, i: 6.9, j: 7.4, z: 16, zoom: 3.2 },
  { t: 41.7, i: 12.4, j: 22.4, z: 6, zoom: 3.2 },
  { t: 43.0, i: 12.8, j: 22.2, z: 6, zoom: 3.25 },
  { t: 43.7, i: 19.3, j: 12.6, z: 12, zoom: 3.2 },
  { t: 45.0, i: 19.1, j: 13.0, z: 12, zoom: 3.25 },
  { t: 45.7, i: 5.6, j: 22.7, z: 10, zoom: 3.2 },
  { t: 46.2, i: 6.0, j: 22.6, z: 10, zoom: 3.0 },
  { t: 46.95, i: 27.6, j: 7.6, z: 50, zoom: 2.5 },
  { t: 48.0, i: 27.0, j: 8.4, z: 50, zoom: 2.35 },
  // 6 — crescimento
  { t: 49.0, i: 14.2, j: 18.8, z: 4, zoom: 1.6 },
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
  { t: 72.4, i: 15.6, j: 15.4, z: 10, zoom: 1.26 },
  { t: 75.0, i: 15.6, j: 15.6, z: 10, zoom: 1.2 },
];
// altura do assunto na tela (fração): legendas ficam em 64–77%
const frameY = (t: number) => (t > 62.6 && t < 68.2 ? lerp(0.45, 0.6, smooth((t - 62.6) / 0.8) * smooth((68.2 - t) / 0.6)) : 0.45);

// ---------------- personagens ----------------
const LUCAS: Look = { skin: hex('#c98b5e'), hair: hex('#2a1d18'), shirt: hex('#3a5ea8'), pants: hex('#3a5ea8'), shoes: hex('#1a1a20'), hat: 'bone', long: false };
const lookOf = (jobId: string): Look => {
  const j = jobs.find((x) => x.id === jobId)!;
  const hat = ({ capacete: 'capacete', quepe: 'quepe', touca: 'touca', bone: 'bone' } as Record<string, Look['hat']>)[j.roupa.extra ?? ''] ?? null;
  return { skin: hex('#d9a273'), hair: hex('#3a2418'), shirt: hex(j.roupa.camisa), pants: hex(j.roupa.calca), shoes: hex('#1a1a20'), hat, coat: j.roupa.extra === 'jaleco' ? hex('#f2f4f7') : null, long: j.roupa.extra === 'jaleco' };
};
function lucasAt(t: number) {
  const t0 = 28.0;
  if (t < t0) return null;
  if (t < 30.0) return { i: 9.05, j: 27.2, dir: 1, fr: 0 };
  if (t < 31.2) { const f = (t - 30.0) / 1.2; return { i: 9.05, j: 27.2 + f * 0.66, dir: 1, fr: Math.floor(t * 4.2) % 4 }; }
  const f = t - 31.2; return { i: 9.05 + f * 0.42, j: 27.86, dir: 0, fr: Math.floor(t * 4.2) % 4 };
}

// ---------------- profissões (cena 5) ----------------
const JOBS5 = [
  { word: 'médicos', job: 'medico', id: 'hospital', title: 'MÉDICOS', sub: `HOSPITAL · ${vagas('medico')} VAGAS`, icon: 'cross', col: C.red, ghosts: [[19.86, 6.2], [19.86, 7.0]] },
  { word: 'professores', job: 'professor', id: 'escola', title: 'PROFESSORES', sub: `ESCOLA · ${vagas('professor')} VAGAS`, icon: 'book', col: C.yellow, ghosts: [[6.0, 7.35], [7.1, 7.35]] },
  { word: 'motoristas', job: 'motorista', id: 'terminal', title: 'MOTORISTAS', sub: `TERMINAL · ${vagas('motorista')} VAGAS`, icon: 'bus', col: C.cyan, ghosts: [[12.4, 21.5], [12.4, 23.1]] },
  { word: 'comerciantes', job: 'comerciante', id: 'mercado', title: 'COMERCIANTES', sub: `MERCADINHO · ${vagas('comerciante')} VAGAS`, icon: 'cart', col: C.green, ghosts: [[19.88, 11.8], [19.88, 13.3]] },
  { word: 'policiais', job: 'policial', id: 'delegacia', title: 'POLICIAIS', sub: `DELEGACIA · ${vagas('policial')} VAGAS`, icon: 'badge', col: '#7eaee0', ghosts: [[4.9, 23.86], [6.3, 23.86]] },
  { word: 'engenheiros', job: 'engenheiro', id: 'obra', title: 'ENGENHEIROS', sub: `OBRA · ${vagas('engenheiro')} VAGAS`, icon: 'helmet', col: '#ffb12b', ghosts: [[27.2, 9.3], [28.4, 9.3]] },
];
const JOB_IDS = ['hospital', 'escola', 'prefeitura', 'mercado', 'padaria', 'farmacia', 'cafe', 'sorveteria', 'delegacia', 'oficina', 'terminal', 'obra', 'escritorio-1'];
const FUTURE = ['futuro-1', 'futuro-2', 'futuro-3', 'futuro-4'];

export const Ep01: React.FC = () => {
  useFonts();
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = f / fps;
  const world = getWorld();
  const blocks = useMemo(() => makeBlocks(WORDS), []);
  const homes = useMemo(() => world.objects.filter((o) => o.group === 'home' && !o.planned), [world]);
  const lotSigns = useMemo(() => new Set(world.objects.filter((o) => o.kind === 'placa').map((o) => o.id)), [world]);

  // âncoras da fala
  const aEscola = W('escola'), aHosp = W('hospital'), aPref = W('prefeitura');
  const aSeguir = W('seguir'), aMorador = W('morador', 19), aSegueCity = W('seguecity', 20);
  const aComentar = W('comentar'), aProximo = W('próximo');
  const aTudo = W('tudo', 35);
  const aBairros = W('bairros'), aNegocios = W('negócios'), aHistorias = W('histórias');
  const aFund = W('fundadores'), aPrefeito = W('prefeito', 63);
  const aSegue = W('segue', 68), aComenta = W('comenta', 68);

  // ---------------- estado da cidade ----------------
  const cam0 = cameraAt(KEYS, t, 0.9);
  const cam = { ...cam0, y: cam0.y + ((0.5 - frameY(t)) * 1920) / cam0.zoom };
  const P = (wx: number, wy: number) => toScreen(cam, wx, wy);
  const anchorOf = (id: string) => { const o = world.byId.get(id)!; return P(o.anchor!.x, o.anchor!.y); };
  const scr = (i: number, j: number, z = 0) => P(sx(i, j), sy(i, j, z));

  // luzes das casas: acesas na cena 1, apagam em 8.0 (por ordem), voltam na simulação da cena 6
  let homeFrac = 1;
  if (t >= 7.98 && t < 48.4) homeFrac = 1 - smooth((t - 7.98) / 0.7) * 1.05;
  if (t >= 48.4) homeFrac = lerp(-0.05, 1.05, smooth((t - 48.4) / 4.4));
  // gente e trânsito: somem no "ninguém mora nela", voltam na simulação
  const life = t < 7.98 ? 1 : t < 48.5 ? 0 : smooth((t - 48.5) / 3.5);
  const d = dynamics(world, { t: t + 30, traffic: life, people: life });
  const dyn: Obj[] = [...d.objs];
  const overrides: Record<string, { dy?: number; alpha?: number; ghost?: number; glow?: number; lit?: number }> = {};
  // Lucas (exemplo) e a casa dele acendendo
  const lu = lucasAt(t);
  if (lu && t < 35.2) {
    const o = personObj('lucas', LUCAS, 'lucas', lu.i, lu.j, lu.dir, lu.fr, 2, 0.95);
    dyn.push(o);
    if (t < 28.6) overrides.lucas = { ghost: 1 - smooth((t - 28.0) / 0.6), alpha: 0.4 };
  }
  if (t >= 28.6 && t < 48.4) overrides['casa-03'] = { lit: smooth((t - 28.7) / 0.35) };
  // trabalhadores-holograma em cada profissão
  JOBS5.forEach((jb, k) => {
    const a = W(jb.word, 37);
    if (t < a - 0.15 || t > a + 1.95) return;
    jb.ghosts.forEach(([gi, gj], q) => {
      const id = `ghost-${k}-${q}`;
      dyn.push(personObj(id, lookOf(jb.job), `g-${jb.job}`, gi, gj, q ? 1 : 0, Math.floor(t * 2) % 2 ? 0 : 2, 2));
      overrides[id] = { ghost: 0.8 + 0.2 * Math.sin(t * 9 + q), alpha: 0.9 };
    });
  });
  // prédios novos brotando do chão (simulação)
  const reveal = new Set<string>();
  const hidden = new Set<string>();
  FUTURE.forEach((id, k) => {
    const t0 = 53.1 + k * 0.7;
    if (t < t0) return;
    reveal.add(id);
    const o = world.byId.get(id)!;
    overrides[id] = { dy: (o.sprite.h + 4) * (1 - easeOut(clamp((t - t0) / 0.9))), lit: 1 };
  });
  if (t >= 53.0) lotSigns.forEach((id) => hidden.add(id));

  const night = 1;
  const civic = 1;
  const params = { t, cam, night, levels: { civic, home: 1, shop: 1, street: 1 }, homeFrac, dyn, refl: d.refl, overrides, reveal, hidden, bloom: 0.8 };

  // ---------------- âncoras na tela ----------------
  const pEsc = anchorOf('escola'), pHosp = anchorOf('hospital'), pPref = anchorOf('prefeitura');
  const lucasScr = lu ? scr(lu.i, lu.j, 26) : null;

  // ---------------- áudio ----------------
  const narr = asset('audio/ep01/narracao.wav') ?? asset('audio/ep01/narracao.mp3');
  const music = asset('audio/music/ep01.wav');
  const amb = asset('audio/sfx/night-ambience.wav');
  const water = asset('audio/sfx/water.wav');
  const musicVol = (fr: number) => {
    const tt = fr / fps;
    if (!narr) return 0.78;
    const sp = [-0.12, 0, 0.12].map((dt) => (speaking(tt + dt) ? 1 : 0) as number).reduce((s, x) => s + x, 0) / 3;
    return lerp(0.5, 0.34, sp);
  };
  const ambVol = (fr: number) => { const tt = fr / fps; return interpolate(tt, [0, 1, 8, 8.6, 14.5, 16, 70, 75], [0.25, 0.4, 0.4, 1.0, 1.0, 0.35, 0.35, 0], { extrapolateRight: 'clamp' }); };
  const waterVol = (fr: number) => { const tt = fr / fps; return 0.8 * Math.max(win(tt, 11.8, 15.2, 0.6, 0.6), win(tt, 58.2, 62.8, 0.6, 0.6)); };

  // ---------------- camada de efeitos ----------------
  const drawFx = (c: CanvasRenderingContext2D) => {
    const q = (p: { x: number; y: number }) => ({ x: p.x / 4, y: p.y / 4 });
    // cena 2: falha digital quando as pessoas "somem"
    glitch(c, t, 7.95, 0.3);
    // cena 3–4: vagas em cada casa
    if (t > 15.2 && t < 28.4) {
      homes.forEach((o, k) => {
        const a0 = 15.3 + (o.rank ?? hash2(k, 1)) * 1.3;
        let a = smooth((t - a0) / 0.35);
        if (o.id !== 'casa-03') a *= 1 - smooth((t - 24.1) / 0.5);
        else a *= 1 - smooth((t - 27.9) / 0.3);
        const p = q(P(o.anchor!.x, o.anchor!.y));
        marker(c, p.x, p.y - 2, t, a, 'person', '#5af2ff', k);
      });
    }
    // cena 4: Lucas se materializa
    if (lu && lucasScr) { const p = q(scr(9.05, 27.2, 0)); sparkles(c, p.x, p.y, t, 27.85, 1.5); }
    // cena 5: vagas de emprego nos prédios
    if (t > aTudo - 0.4 && t < 38.0) {
      JOB_IDS.forEach((id, k) => {
        const a = smooth((t - (aTudo - 0.3 + k * 0.07)) / 0.3) * (1 - smooth((t - 37.2) / 0.4));
        const p = q(anchorOf(id));
        marker(c, p.x, p.y - 2, t, a, 'job', '#ffd84a', k);
      });
    }
    // cena 6: poeira dos prédios novos
    FUTURE.forEach((id, k) => {
      const o = world.byId.get(id)!;
      const ci = (o.fp[0] + o.fp[2]) / 2, cj = (o.fp[1] + o.fp[3]) / 2;
      const p = q(scr(ci, cj, 0));
      dust(c, p.x, p.y, (o.fp[2] - o.fp[0]) * 22 * cam.zoom / 4, t, 53.1 + k * 0.7, 1.4);
    });
    // cena 7: holofotes da prefeitura
    if (t > 62.4 && t < 69) { const p = q(pPref); searchlights(c, p.x, p.y + 6, t, win(t, 62.6, 68.6, 0.8, 0.6)); }
  };

  const L1 = win(t, aEscola - 0.05, aHosp + 0.55, 0.25, 0.25);
  const L2 = win(t, aHosp - 0.05, aPref + 0.65, 0.25, 0.25);
  const L3 = win(t, aPref - 0.05, 7.5, 0.25, 0.3);
  const typedFull = 'Lucas — mecânico';
  const typedN = Math.floor(clamp((t - (aComentar + 0.5)) / 1.7) * typedFull.length);

  return (
    <AbsoluteFill style={{ background: '#05060f' }}>
      <CityCanvas params={params} />
      <FxLayer draw={drawFx} />
      {t > 69.6 && <FxLayer blend="screen" draw={(c) => fireworks(c, t, 70.2, 75.2, 11)} />}

      {/* cena 1: rótulos dos prédios no ritmo da fala */}
      <WorldLabel x={pEsc.x} y={pEsc.y} title="ESCOLA" icon="book" a={L1} stem={50} align="left" />
      <WorldLabel x={pHosp.x} y={pHosp.y} title="HOSPITAL" icon="cross" a={L2} stem={40} color={C.red} align="right" />
      <WorldLabel x={pPref.x} y={pPref.y} title="PREFEITURA" icon="crown" a={L3} stem={60} />
      {/* cena 4: nome do personagem de exemplo */}
      {lucasScr && <WorldLabel x={lucasScr.x} y={lucasScr.y} title="LUCAS" sub="MECÂNICO · EXEMPLO" icon="wrench" a={win(t, 28.5, 34.9, 0.3, 0.3)} stem={30} color={C.cyan} />}
      {/* cena 5: profissões */}
      {JOBS5.map((jb) => {
        const a = W(jb.word, 37);
        const p = anchorOf(jb.id);
        return <WorldLabel key={jb.id} x={p.x} y={p.y} title={jb.title} sub={jb.sub} icon={jb.icon} a={win(t, a - 0.1, a + 1.85, 0.2, 0.2)} stem={34} color={jb.col} />;
      })}

      {/* HUD fixa */}
      <Hud moradores={EP.estado.moradores} empregos={EP.estado.empregos} dia={1} hora={clock(t)} show={1} warnMoradores={t > 6.3 && t < 15.5} pulseMoradores={win(t, 6.3, 7.6, 0.15, 0.3) + win(t, 8.0, 9.4, 0.1, 0.4)} />

      {/* cena 1: carimbo DIA 01 desde o primeiro quadro */}
      <Stamp a={clamp(0.62 + t * 1.6) * (1 - smooth((t - 2.3) / 0.35))} text="DIA 01" sub="A CIDADE ESTÁ PRONTA" y={420} />
      {/* cena 2 */}
      <BigCounter a={win(t, 8.25, 14.7, 0.3, 0.3)} value={0} label="MORADORES" sub={t > 10.2 ? `${city.casas.total} CASAS VAZIAS` : undefined} blink={t > 8.3} t={t} y={430} />
      {/* cena 3 */}
      <CtaButton a={win(t, aSeguir - 0.35, aMorador - 0.2, 0.25, 0.25) * (t > aSeguir + 0.15 && t < aSeguir + 0.35 ? 0.88 : 1)} icon="follow" text="SEGUIR" color={C.cyan} t={t} y={420} />
      <div style={{ position: 'absolute', left: 50, top: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Toast icon="person" text="+1 MORADOR" a={smooth((t - aMorador) / 0.3)} out={smooth((t - 23.9) / 0.4)} color={C.green} />
        <Toast icon="job" text="+1 PROFISSÃO" a={smooth((t - aMorador - 0.75) / 0.3)} out={smooth((t - 23.95) / 0.4)} color={C.yellow} />
        <Toast icon="scroll" text="+1 HISTÓRIA" a={smooth((t - aMorador - 1.5) / 0.3)} out={smooth((t - 24.0) / 0.4)} color={C.cyan} />
      </div>
      {/* cena 4 */}
      <CommentCard a={smooth((t - (aComentar - 0.4)) / 0.4)} out={smooth((t - 31.9) / 0.4)} typed={typedFull.slice(0, typedN)} t={t} y={370} />
      <Stamp a={win(t, aProximo - 0.15, 34.9, 0.45, 0.3)} text="PRÓXIMO EPISÓDIO" sub="SEU PERSONAGEM PODE APARECER" y={400} color={C.cyan} rot={-4} />
      {/* cena 6 */}
      <SimTag a={win(t, 48.3, 57.9, 0.3, 0.3)} />
      <GrowthBar a={win(t, 48.5, 52.9, 0.3, 0.3)} f={(t - 48.7) / 3.8} t={t} />
      <div style={{ position: 'absolute', left: 50, top: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Toast icon="house" text="NOVOS BAIRROS" a={smooth((t - aBairros) / 0.3)} out={smooth((t - 57.6) / 0.4)} color={C.green} />
        <Toast icon="cart" text="NOVOS NEGÓCIOS" a={smooth((t - aNegocios) / 0.3)} out={smooth((t - 57.65) / 0.4)} color={C.yellow} />
        <Toast icon="heart" text="NOVAS HISTÓRIAS" a={smooth((t - aHistorias) / 0.3)} out={smooth((t - 57.7) / 0.4)} color="#ff7aa8" />
      </div>
      {/* cena 7 */}
      <FoundersPanel a={smooth((t - 58.5) / 0.45)} out={smooth((t - 62.6) / 0.4)} t={t} />
      <GoalsPanel a={smooth((t - 63.1) / 0.6)} out={smooth((t - 67.9) / 0.35)} metas={city.metas} t={t} highlight={t > aPrefeito - 1.2 ? 3 : -1} />
      {/* cena 8 */}
      <CtaButton a={win(t, aSegue - 0.15, 71.9, 0.3, 0.3)} icon="follow" text="SEGUE O PERFIL" color={C.cyan} t={t} y={420} />
      <CtaButton a={win(t, aComenta - 0.15, 71.9, 0.3, 0.3)} icon="comment" text="NOME + PROFISSÃO" color={C.yellow} t={t} y={600} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-start', paddingTop: 440, opacity: smooth((t - 71.95) / 0.35), transform: `scale(${0.85 + 0.15 * easeOut(clamp((t - 71.95) / 0.5))})` }}>
        <Logo size={124} />
        <div style={{ marginTop: 34, fontFamily: F.hud, fontWeight: 700, fontSize: 31, color: C.white, letterSpacing: 2, textShadow: '0 4px 0 #000', textAlign: 'center', lineHeight: 1.5 }}>
          VOCÊ SEGUE. VOCÊ MORA.<br /><span style={{ color: C.yellow }}>VOCÊ DECIDE.</span>
        </div>
      </AbsoluteFill>

      <Captions blocks={blocks} t={t} y={1355} size={112} />

      {/* ---------- áudio ---------- */}
      {narr && <Audio src={narr} volume={1} />}
      {music && <Audio src={music} volume={musicVol} />}
      {amb && <Audio src={amb} loop volume={ambVol} />}
      {water && <Audio src={water} loop volume={waterVol} />}
      <Sfx at={0.02} name="stamp" gain={1.3} />
      <Sfx at={aEscola} name="popup" />
      <Sfx at={aHosp} name="popup" />
      <Sfx at={aPref} name="popup" />
      <Sfx at={6.35} name="ui-blip" />
      <Sfx at={8.02} name="empty" gain={1.6} />
      <Sfx at={8.3} name="tick" />
      <Sfx at={15.3} name="sparkle" />
      <Sfx at={aSeguir - 0.3} name="popup" />
      <Sfx at={aSeguir + 0.15} name="ui-blip" gain={1.3} />
      <Sfx at={aMorador} name="coin" />
      <Sfx at={aMorador + 0.75} name="popup" />
      <Sfx at={aMorador + 1.5} name="popup" />
      <Sfx at={aSegueCity} name="notify" />
      <Sfx at={aComentar - 0.4} name="notify" />
      {Array.from({ length: typedFull.length }, (_, k) => <Sfx key={k} at={aComentar + 0.5 + (k * 1.7) / typedFull.length} name="typing" gain={0.8} dur={0.3} />)}
      <Sfx at={27.85} name="sparkle" gain={1.3} />
      <Sfx at={28.7} name="unlock" />
      <Sfx at={aProximo - 0.1} name="stamp" gain={1.2} />
      <Sfx at={35.3} name="ui-move" />
      <Sfx at={aTudo - 0.2} name="coin" />
      {JOBS5.map((jb) => <Sfx key={jb.id} at={W(jb.word, 37) - 0.1} name="popup" />)}
      {JOBS5.slice(1).map((jb) => <Sfx key={`m-${jb.id}`} at={W(jb.word, 37) - 0.65} name="ui-move" gain={0.8} />)}
      <Sfx at={48.4} name="ui-move" />
      <Sfx at={48.6} name="notify" gain={0.8} />
      {FUTURE.map((id, k) => <Sfx key={id} at={53.1 + k * 0.7} name="build" />)}
      <Sfx at={aBairros} name="popup" />
      <Sfx at={aNegocios} name="popup" />
      <Sfx at={aHistorias} name="popup" />
      <Sfx at={58.5} name="ui-move" />
      <Sfx at={aFund} name="unlock" gain={1.2} />
      <Sfx at={63.1} name="popup" />
      <Sfx at={aPrefeito - 1.2} name="ui-blip" />
      <Sfx at={aSegue - 0.15} name="coin" />
      <Sfx at={aComenta - 0.15} name="popup" />
      {[70.3, 71.2, 72.3, 73.3, 74.1].map((at) => <Sfx key={at} at={at} name="firework" gain={0.8} />)}
      <Sfx at={72.0} name="levelup" gain={1.2} />
    </AbsoluteFill>
  );
};

function clock(t: number) {
  const m = 21 * 60 + 40 + Math.floor(t / 4);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
void phrase; void hasAsset;
