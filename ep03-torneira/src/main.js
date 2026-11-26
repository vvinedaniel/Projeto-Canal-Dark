// Motor do filme: escolhe o cenário pela linha do tempo, renderiza e desenha legendas/rótulos.
// Parâmetros de URL: ?render (modo captura) &only=casa,rede (carrega só alguns cenários)
//                    &scale=0.5 (prévia rápida) &ao=0 (sem oclusão ambiente) &t=12.3 (quadro inicial)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as L from './lib.js';
import { DUR, SETS, CAPTIONS, PH, CUTS, HOOK, END_AT, SOURCE } from './timeline.js';

const q = new URLSearchParams(location.search);
const RENDER = q.has('render'), SCALE = parseFloat(q.get('scale') || '1'), USE_AO = q.get('ao') !== '0';
const ONLY = q.get('only') ? q.get('only').split(',') : null;
if (RENDER) document.documentElement.classList.add('render');
const $ = (s) => document.querySelector(s);
const stage = $('#stage');

const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(SCALE); renderer.setSize(L.W, L.H, false);
renderer.shadowMap.enabled = !q.has('noshadow'); renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ?noshadow: só diagnóstico
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.localClippingEnabled = true;
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(35, L.W / L.H, 0.05, 600);
const rt = new THREE.WebGLRenderTarget(L.W * SCALE, L.H * SCALE, { type: THREE.HalfFloatType, samples: parseInt(q.get('msaa') || '4') });
const composer = new EffectComposer(renderer, rt);
composer.setPixelRatio(SCALE); composer.setSize(L.W, L.H);
const renderPass = new RenderPass(new THREE.Scene(), camera);
const gtao = new GTAOPass(renderPass.scene, camera, L.W * SCALE, L.H * SCALE);
gtao.enabled = USE_AO;
// oclusão ambiente em meia resolução: 4x mais barata no render por software, visualmente equivalente
const AO_RES = parseFloat(q.get('aores') || '0.5'), gtaoSetSize = gtao.setSize.bind(gtao);
gtao.setSize = (w, h) => gtaoSetSize(Math.round(w * AO_RES), Math.round(h * AO_RES));
composer.addPass(renderPass); composer.addPass(gtao); composer.addPass(new OutputPass());

/* ---------- lente de ampliação (segundo renderizador, canvas circular) ---------- */
const microEl = $('#micro'), microCv = $('#microGl'), microTag = $('#microTag'), microStem = $('#microStem');
const MICRO_PX = Math.round(640 * Math.max(SCALE, 0.5));
const microR = new THREE.WebGLRenderer({ canvas: microCv, antialias: true, preserveDrawingBuffer: true });
microR.setPixelRatio(1); microR.setSize(MICRO_PX, MICRO_PX, false);
microR.toneMapping = THREE.ACESFilmicToneMapping; microR.shadowMap.enabled = true; microR.shadowMap.type = THREE.PCFSoftShadowMap;
microR.localClippingEnabled = true;
function drawMicro(set) {
  const m = ui._micro;
  if (!m || !set.micro) { microEl.style.opacity = 0; microStem.style.opacity = 0; $('#microSvg').style.opacity = 0; return; }
  const k = L.ease.back(L.clamp01(m.a));
  microEl.style.opacity = L.clamp01(m.a * 1.6);
  microEl.style.left = (m.cx - m.r) + 'px'; microEl.style.top = (m.cy - m.r) + 'px';
  microEl.style.width = microEl.style.height = 2 * m.r + 'px';
  microEl.style.transform = `scale(${(0.55 + 0.45 * k).toFixed(3)})`;
  if (microTag.textContent !== m.tag) microTag.textContent = m.tag;
  set.micro.camera.aspect = 1; set.micro.camera.updateProjectionMatrix();
  microR.render(set.micro.scene, set.micro.camera);
  // haste do ponto ampliado até a borda da lente
  if (m.from) {
    _v.copy(m.from).project(camera);
    const x = (_v.x * 0.5 + 0.5) * L.W, y = (-_v.y * 0.5 + 0.5) * L.H, dx = x - m.cx, dy = y - m.cy, d = Math.hypot(dx, dy);
    if (d > m.r + 20 && _v.z < 1) {
      const ex = m.cx + dx / d * m.r, ey = m.cy + dy / d * m.r;
      microStem.setAttribute('x1', ex); microStem.setAttribute('y1', ey); microStem.setAttribute('x2', x); microStem.setAttribute('y2', y);
      microStem.style.opacity = L.clamp01(m.a * 1.6); $('#microDot').setAttribute('cx', x); $('#microDot').setAttribute('cy', y);
    } else microStem.style.opacity = 0;
  } else microStem.style.opacity = 0;
  $('#microSvg').style.opacity = microStem.style.opacity;
}

/* ---------- rótulos (DOM projetado a partir de pontos 3D) ---------- */
const labelsEl = $('#labels'), labels = new Map(), _v = new THREE.Vector3();
const ui = {
  _dark: 0, _lens: 0, _meter: null, _split: null, _micro: null,
  /** lente de ampliação ilustrativa (inset circular): a 0..1; o = { cx, cy, r (px na tela 1080×1920), from: ponto 3D ampliado, tag }
   *  desenha set.micro.scene com set.micro.camera num canvas próprio, com haste até o ponto ampliado */
  micro(a, o = {}) { if (a > 0.005) this._micro = { a, cx: o.cx ?? 540, cy: o.cy ?? 620, r: o.r ?? 300, from: o.from ? L.v3(o.from).clone() : null, tag: o.tag ?? 'Ampliação ilustrativa' }; },
  /** medidor de chuva fixo na tela: v 0..1, texto do nível */
  meter(v, text, a = 1) { this._meter = { v, text, a }; },
  /** tela dividida antes × depois: k 0..1 (abertura), textos dos dois lados */
  split(k, left = 'Antes', right = 'Depois', note = '') { this._split = { k, left, right, note }; },
  /** lente de microscópio (0..1) sobre a tela */
  lens(a) { this._lens = Math.max(this._lens, a); },
  /** escurece a tela (0..1) — para cortes internos de um cenário */
  dark(a) { this._dark = Math.max(this._dark, a); },
  /** Rótulo ancorado num ponto 3D. alpha 0..1. o: { cls:'accent|warn|good|big|plain', stem:px (haste; 0 = sem), dx, dy (px) } */
  label(id, text, pos, alpha = 1, o = {}) { pending.push({ id, text, pos: L.v3(pos).clone(), alpha, o }); }
};
const pending = [];
// a projeção só acontece depois que o cenário posicionou a câmera neste quadro
function drawLabel({ id, text, pos, alpha, o }) {
  let lb = labels.get(id);
  if (!lb) { const el = document.createElement('div'); el.className = 'lb'; const sp = document.createElement('span'); el.appendChild(sp); labelsEl.appendChild(el); lb = { el, txt: sp, text: '', cls: '', stem: null }; labels.set(id, lb); }
  lb.used = true;
  if (alpha <= 0.01) { lb.el.style.opacity = 0; return; }
  if (lb.text !== text) { lb.text = text; lb.txt.textContent = text; }
  const cls = 'lb ' + (o.cls || ''); if (lb.cls !== cls) { lb.cls = cls; lb.el.className = cls; }
  const stem = o.stem ?? 46;
  if (lb.stem !== stem) { lb.stem = stem; const old = lb.el.querySelector('i'); if (old) old.remove(); if (stem > 0) { const i = document.createElement('i'); i.style.setProperty('--stem', stem + 'px'); lb.el.appendChild(i); } }
  _v.copy(pos).project(camera);
  const x = (_v.x * 0.5 + 0.5) * L.W + (o.dx || 0), y = (-_v.y * 0.5 + 0.5) * L.H + (o.dy || 0);
  const k = L.ease.back(L.clamp01(alpha));
  lb.el.style.opacity = _v.z > 1 ? 0 : L.clamp01(alpha * 1.4);
  lb.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, calc(-100% - ${stem}px)) scale(${(0.6 + 0.4 * k).toFixed(3)})`;
}

/* ---------- cenários ---------- */
const sets = [];
function placeholder(def) {
  const scene = new THREE.Scene(); L.studio(scene);
  const m = L.box(1, 1, 1, L.mat(L.PAL.accent)); scene.add(m);
  return { scene, update(t, cam) { m.rotation.y = t; cam.position.set(3, 2.5, 5); cam.lookAt(0, 0, 0); } };
}
for (const def of SETS) {
  let s = null;
  if (!ONLY || ONLY.includes(def.id)) {
    try { const mod = await import(`./sets/${def.id}.js`); s = mod.createAsync ? await mod.createAsync(L, { PH, def }) : mod.create(L, { PH, def }); }
    catch (e) { console.warn(`[set ${def.id}]`, e.message); }
  }
  s = s || placeholder(def);
  s.scene.environment = envTex; s.scene.environmentIntensity = s.envIntensity ?? 0.55;
  sets.push({ ...def, ...s, wscale: def.wscale });
}

/* ---------- overlay fixo ---------- */
const capEl = $('#cap'), hookEl = $('#hook');
hookEl.innerHTML = HOOK.map((h) => `<span>${h}</span>`).join('');
const hookBits = [...hookEl.children], endEl = $('#end'), veil = $('#veil'), brand = $('#brand');
let capIdx = -2;
function overlay(t) {
  // gancho
  const hOut = 1 - L.sstep(3.9, 4.3, t);
  hookBits.forEach((el, i) => { const k = i === 0 ? 1 : L.sstep(-0.05 + i * 0.1, 0.2 + i * 0.1, t); /* 1ª linha já no 1º quadro */ el.style.opacity = k * hOut; el.style.transform = `translateY(${(1 - L.ease.back(k)) * 60}px) scale(${0.9 + 0.1 * k})`; });
  hookEl.style.visibility = t < 4.4 ? 'visible' : 'hidden';
  brand.style.opacity = 0.92 * (t < 4.4 ? L.sstep(4.0, 4.4, t) : 1) * (1 - L.sstep(END_AT - 0.4, END_AT, t));
  // legendas palavra a palavra
  let ci = -1; for (let i = 0; i < CAPTIONS.length; i++) if (t >= CAPTIONS[i].a && t < CAPTIONS[i].end) { ci = i; break; }
  if (ci !== capIdx) { capIdx = ci; capEl.innerHTML = ci < 0 ? '' : CAPTIONS[ci].words.map((w) => `<span>${w.w}</span>`).join(''); }
  if (ci >= 0) {
    const c = CAPTIONS[ci], pop = L.ease.back(L.clamp01((t - c.a) / 0.12));
    capEl.style.transform = `scale(${0.82 + 0.18 * pop})`; capEl.style.opacity = L.clamp01((t - c.a) / 0.06);
    [...capEl.children].forEach((el, i) => el.classList.toggle('on', t >= c.words[i].a && (i === c.words.length - 1 || t < c.words[i + 1].a)));
  }
  // cartela final
  const e = L.sstep(END_AT, END_AT + 0.5, t);
  endEl.style.opacity = e; endEl.style.background = `rgba(8,18,27,${0.72 * e})`; endEl.style.transform = `scale(${0.94 + 0.06 * e})`;
  // transição entre cenários: mergulho rápido no escuro
  // (o primeiro quadro já mostra o assunto: não há fade de entrada)
  let dark = L.sstep(DUR - 0.25, DUR, t);
  for (let i = 1; i < SETS.length; i++) if (!CUTS.some((c) => Math.abs(c.at - SETS[i].t0) < 1e-3)) dark = Math.max(dark, 1 - L.sstep(0.02, 0.3, Math.abs(t - SETS[i].t0)));
  veil.style.opacity = Math.max(dark, ui._dark);
  lensEl.style.opacity = ui._lens;
  // medidor de chuva
  const m = ui._meter; meterEl.style.opacity = m ? m.a : 0;
  if (m) { meterFill.style.transform = `scaleX(${L.clamp01(m.v).toFixed(3)})`; if (meterTxt.textContent !== m.text) meterTxt.textContent = m.text; meterEl.classList.toggle('hi', m.v > 0.75); }
  // fonte do indicador nacional, junto com a revelação final
  const sk = SOURCE ? L.pulse(t, SOURCE.a, SOURCE.b, 0.35, 0.3) : 0; sourceEl.style.opacity = sk; sourceEl.style.transform = `translateY(${(1 - sk) * 20}px)`;
}

/* ---------- quadro ---------- */
let current = null;
const glEl = $('#gl'), xfEl = $('#xfade'), xfCtx = xfEl.getContext('2d'), lensEl = $('#lens'), sourceEl = $('#source');
if (SOURCE && SOURCE.text) sourceEl.innerHTML = SOURCE.text;
const meterEl = $('#meter'), meterFill = $('#meter b'), meterTxt = $('#meter span'), spEl = $('#split'), spCtx = spEl.getContext('2d'), spBar = $('#splitBar');
const setAt = (t) => sets.find((s) => t >= s.t0 && t < s.t1) || sets[sets.length - 1];
function renderSet(set, t) {
  set.update(t, camera, ui);
  if (window.__cam) { const c = window.__cam; camera.position.set(...c.p); camera.lookAt(...c.l); if (c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); } } // capas: câmera livre
  camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  L.WATER_U.uTime.value = t; L.WATER_U.uScale.value = set.wscale ?? 1;
  if (set !== current) {
    current = set; renderPass.scene = set.scene; gtao.scene = set.scene;
    const ao = set.ao || {};
    gtao.updateGtaoMaterial({ radius: ao.radius ?? 0.25, distanceExponent: 1, thickness: ao.thickness ?? 1, scale: ao.scale ?? 1.1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 10, radiusExponent: 1.5, rings: 3, samples: 16 });
    gtao.blendIntensity = ao.intensity ?? 0.85;
    renderer.toneMappingExposure = set.exposure ?? 1.0;
  }
  renderer.info.reset();
  composer.render();
}
let xfFor = null; // corte cujo quadro de saída está guardado na camada #xfade
function frame(t) {
  t = Math.min(DUR - 1e-3, Math.max(0, t));
  const cut = CUTS.find((c) => t >= c.at && t < c.at + c.dur);
  if (cut && xfFor !== cut) { // congela o último quadro do plano que sai
    ui._dark = 0; ui._lens = 0; pending.length = 0;
    renderSet(setAt(cut.at - 1 / 240), cut.at - 1 / 240);
    xfCtx.drawImage(glEl, 0, 0, xfEl.width, xfEl.height); xfFor = cut;
  }
  labels.forEach((lb) => { lb.used = false; });
  ui._dark = 0; ui._lens = 0; ui._meter = null; ui._split = null; ui._micro = null; ui.variant = window.__variant || null; // __variant: placas de teste
  pending.length = 0;
  const set = setAt(t);
  // tela dividida: o cenário pede (ui.split) e é desenhado duas vezes no mesmo instante, com estados diferentes
  const sp = set.splitAt ? set.splitAt(t) : 0;
  if (sp > 0.001) {
    ui.variant = 'before'; renderSet(set, t); pending.length = 0;
    spCtx.clearRect(0, 0, spEl.width, spEl.height); spCtx.drawImage(glEl, 0, 0, spEl.width, spEl.height);
    ui._dark = 0; ui._lens = 0; ui._meter = null; ui._split = null; ui.variant = 'after';
  }
  renderSet(set, t);
  pending.forEach(drawLabel);
  drawMicro(set);
  labels.forEach((lb) => { if (!lb.used) lb.el.style.opacity = 0; });
  if (cut) {
    const k = L.ease.io(L.clamp01((t - cut.at) / cut.dur));
    xfEl.style.opacity = 1 - k;
    xfEl.style.filter = `blur(${(k * 10).toFixed(1)}px)`;
    if (cut.mode === 'in') { xfEl.style.transform = `scale(${1 + 0.7 * k})`; glEl.style.transform = `scale(${1.18 - 0.18 * k})`; }
    else { xfEl.style.transform = `scale(${1 - 0.3 * k})`; glEl.style.transform = `scale(${1.3 - 0.3 * k})`; }
  } else { xfEl.style.opacity = 0; glEl.style.transform = ''; }
  // antes × depois: a metade esquerda mostra o quadro 'before' guardado; a barra central abre com k
  const S = ui._split, k = S ? L.ease.io(L.clamp01(S.k)) : 0;
  spEl.style.opacity = k > 0.001 ? 1 : 0; spEl.style.clipPath = `inset(0 ${(100 - 50 * k).toFixed(2)}% 0 0)`;
  spBar.style.opacity = k > 0.001 ? 1 : 0; spBar.style.left = (540 * k).toFixed(1) + 'px';
  if (S) { spBar.querySelector('.l').textContent = S.left; spBar.querySelector('.r').textContent = S.right; spBar.querySelector('.n').textContent = S.note; spBar.style.setProperty('--tk', L.clamp01((S.k - 0.6) / 0.4)); }
  overlay(t);
}

/* ---------- prévia interativa ---------- */
function fit() { const k = RENDER ? 1 : Math.min(innerWidth / L.W, innerHeight / L.H); stage.style.transform = `scale(${k})`; stage.style.left = RENDER ? '0' : (innerWidth - L.W * k) / 2 + 'px'; }
addEventListener('resize', fit); fit();
let now = parseFloat(q.get('t') || '0'), playing = false, last = 0;
const scrub = $('#scrub'), clock = $('#clock');
scrub.addEventListener('input', () => { now = +scrub.value; frame(now); clock.textContent = now.toFixed(2); });
$('#play').addEventListener('click', () => { playing = !playing; });
function tick(ms) { const dt = Math.min(0.1, (ms - last) / 1000 || 0); last = ms; if (playing) { now = (now + dt) % DUR; frame(now); scrub.value = now; clock.textContent = now.toFixed(2); } requestAnimationFrame(tick); }
// capas para publicação (?cover=1..3): um quadro do filme com o título por cima, sem legenda
const COVERS = [
  { t: 70.6, html: '<h1>Por que a cidade <em>alaga</em>?</h1>' },
  { t: 53.4, html: '<h1>O bueiro tem <em class="warn">limite</em></h1>' },
  { t: 107.5, html: '<h1>Mesma <em>chuva</em></h1>' }
];
const coverN = parseInt(q.get('cover') || '0');
if (coverN) {
  const c = COVERS[coverN - 1], cov = $('#cover');
  cov.innerHTML = c.html; cov.hidden = false;
  const _frame = frame;
  window.__coverT = c.t;
  document.head.insertAdjacentHTML('beforeend', '<style>#cap,#hook,#brand,#source,#labels,#meter,#splitBar .n{display:none!important} #splitBar span{top:560px!important;font-size:64px!important}</style>');
}
// placas limpas para montar capas (?plate): só o 3D, sem legenda/marca/rótulos
if (q.has('plate')) document.head.insertAdjacentHTML('beforeend', '<style>#cap,#hook,#brand,#source,#labels,#lens,#end,#meter{display:none!important}</style>');
window.__frame = (t) => { now = t; frame(coverN ? window.__coverT : t); };
// diagnóstico de desempenho: contagem do último quadro (draw calls, triângulos) e tempo por etapa (?prof)
renderer.info.autoReset = false;
window.__info = () => { const i = renderer.info; return { calls: i.render.calls, triangles: i.render.triangles, lines: i.render.lines, points: i.render.points, geometries: i.memory.geometries, textures: i.memory.textures, programs: i.programs?.length }; };
window.__ready = true;
frame(now);
if (!RENDER) requestAnimationFrame(tick);
