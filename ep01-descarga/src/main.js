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
import { DUR, SETS, CAPTIONS, PH, CUTS } from './timeline.js';

const q = new URLSearchParams(location.search);
const RENDER = q.has('render'), SCALE = parseFloat(q.get('scale') || '1'), USE_AO = q.get('ao') !== '0';
const ONLY = q.get('only') ? q.get('only').split(',') : null;
if (RENDER) document.documentElement.classList.add('render');
const $ = (s) => document.querySelector(s);
const stage = $('#stage');

const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(SCALE); renderer.setSize(L.W, L.H, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

/* ---------- rótulos (DOM projetado a partir de pontos 3D) ---------- */
const labelsEl = $('#labels'), labels = new Map(), _v = new THREE.Vector3();
const ui = {
  _dark: 0, _lens: 0,
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
    try { const mod = await import(`./sets/${def.id}.js`); s = mod.create(L, { PH, def }); }
    catch (e) { console.warn(`[set ${def.id}]`, e.message); }
  }
  s = s || placeholder(def);
  s.scene.environment = envTex; s.scene.environmentIntensity = s.envIntensity ?? 0.55;
  sets.push({ ...def, ...s, wscale: def.wscale });
}

/* ---------- overlay fixo ---------- */
const capEl = $('#cap'), hookEl = $('#hook'), hookBits = [...hookEl.children], endEl = $('#end'), veil = $('#veil'), brand = $('#brand');
let capIdx = -2;
function overlay(t) {
  // gancho
  const hOut = 1 - L.sstep(3.9, 4.3, t);
  hookBits.forEach((el, i) => { const k = i === 0 ? 1 : L.sstep(-0.05 + i * 0.1, 0.2 + i * 0.1, t); /* 1ª linha já no 1º quadro */ el.style.opacity = k * hOut; el.style.transform = `translateY(${(1 - L.ease.back(k)) * 60}px) scale(${0.9 + 0.1 * k})`; });
  hookEl.style.visibility = t < 4.4 ? 'visible' : 'hidden';
  brand.style.opacity = 0.92 * (t < 4.4 ? L.sstep(4.0, 4.4, t) : 1) * (1 - L.sstep(100.6, 101.0, t));
  // legendas palavra a palavra
  let ci = -1; for (let i = 0; i < CAPTIONS.length; i++) if (t >= CAPTIONS[i].a && t < CAPTIONS[i].end) { ci = i; break; }
  if (ci !== capIdx) { capIdx = ci; capEl.innerHTML = ci < 0 ? '' : CAPTIONS[ci].words.map((w) => `<span>${w.w}</span>`).join(''); }
  if (ci >= 0) {
    const c = CAPTIONS[ci], pop = L.ease.back(L.clamp01((t - c.a) / 0.12));
    capEl.style.transform = `scale(${0.82 + 0.18 * pop})`; capEl.style.opacity = L.clamp01((t - c.a) / 0.06);
    [...capEl.children].forEach((el, i) => el.classList.toggle('on', t >= c.words[i].a && (i === c.words.length - 1 || t < c.words[i + 1].a)));
  }
  // cartela final
  const e = L.sstep(101.0, 101.5, t);
  endEl.style.opacity = e; endEl.style.background = `rgba(8,18,27,${0.72 * e})`; endEl.style.transform = `scale(${0.94 + 0.06 * e})`;
  // transição entre cenários: mergulho rápido no escuro
  // (o primeiro quadro já mostra o assunto: não há fade de entrada)
  let dark = L.sstep(DUR - 0.25, DUR, t);
  for (let i = 1; i < SETS.length; i++) if (!CUTS.some((c) => Math.abs(c.at - SETS[i].t0) < 1e-3)) dark = Math.max(dark, 1 - L.sstep(0.02, 0.3, Math.abs(t - SETS[i].t0)));
  veil.style.opacity = Math.max(dark, ui._dark);
  lensEl.style.opacity = ui._lens;
  // fonte do indicador nacional, junto com a revelação final
  const sk = L.pulse(t, 97.9, 101.0, 0.35, 0.3); sourceEl.style.opacity = sk; sourceEl.style.transform = `translateY(${(1 - sk) * 20}px)`;
}

/* ---------- quadro ---------- */
let current = null;
const glEl = $('#gl'), xfEl = $('#xfade'), xfCtx = xfEl.getContext('2d'), lensEl = $('#lens'), sourceEl = $('#source');
const setAt = (t) => sets.find((s) => t >= s.t0 && t < s.t1) || sets[sets.length - 1];
function renderSet(set, t) {
  set.update(t, camera, ui);
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
  ui._dark = 0; ui._lens = 0;
  pending.length = 0;
  renderSet(setAt(t), t);
  pending.forEach(drawLabel);
  labels.forEach((lb) => { if (!lb.used) lb.el.style.opacity = 0; });
  if (cut) {
    const k = L.ease.io(L.clamp01((t - cut.at) / cut.dur));
    xfEl.style.opacity = 1 - k;
    xfEl.style.filter = `blur(${(k * 10).toFixed(1)}px)`;
    if (cut.mode === 'in') { xfEl.style.transform = `scale(${1 + 0.7 * k})`; glEl.style.transform = `scale(${1.18 - 0.18 * k})`; }
    else { xfEl.style.transform = `scale(${1 - 0.3 * k})`; glEl.style.transform = `scale(${1.3 - 0.3 * k})`; }
  } else { xfEl.style.opacity = 0; glEl.style.transform = ''; }
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
  { t: 19.62, html: '<div class="kick">Mundo <b>por</b> Dentro</div><h1>Para onde vai o seu <em>cocô</em>?</h1><div class="tag">Veja por dentro</div>' },
  { t: 39.7, html: '<div class="kick">Mundo <b>por</b> Dentro</div><h1>O caminho <em>escondido</em> da descarga</h1>' },
  { t: 98.9, html: '<div class="kick">Mundo <b>por</b> Dentro</div><h1>Metade do esgoto <em class="warn">não é tratada</em></h1>' }
];
const coverN = parseInt(q.get('cover') || '0');
if (coverN) {
  const c = COVERS[coverN - 1], cov = $('#cover');
  cov.innerHTML = c.html; cov.hidden = false;
  const _frame = frame;
  window.__coverT = c.t;
  document.head.insertAdjacentHTML('beforeend', '<style>#cap,#hook,#brand,#source,#labels{display:none!important}</style>');
}
window.__frame = (t) => { now = t; frame(coverN ? window.__coverT : t); };
window.__ready = true;
frame(now);
if (!RENDER) requestAnimationFrame(tick);
