// Ep. 02 — a maquete única. Integra os módulos (cada um dono de uma parte do mundo), a câmera, a luz da
// tempestade, os rótulos, o medidor de chuva e a tela dividida antes × depois.
// Contrato de módulo: export function create(ctx) -> { update(t, S, cam), anchors? }   (veja docs/MODULOS.md)
import * as Lo from './cidade/layout.js';
import * as H from './cidade/hydro.js';

const MODULES = ['terrain', 'city', 'drainage', 'reservoir', 'green', 'water'];

export async function createAsync(L, { PH }) {
  const { THREE } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { fogNear: 160, fogFar: 520, size: 60, shadowMap: 4096, sunDir: [0.55, 1, 0.45], hemi: 1.0, sun: 2.7 });
  const ctx = { L, THREE, scene, Lo, H, PH, rig, shared: {}, q: new URLSearchParams(location.search) };
  const mods = [];
  const only = ctx.q.get('mods') ? ctx.q.get('mods').split(',') : null; // ?mods=terrain,city para testar isolado
  for (const id of MODULES) {
    if (only && !only.includes(id)) continue;
    try { const m = await import(`./cidade/${id}.js`); mods.push({ id, ...m.create(ctx) }); }
    catch (e) { console.warn(`[módulo ${id}]`, e.message, (e.stack || '').split('\n')[1]); }
  }
  const bgDay = new THREE.Color(L.PAL.bg), bgStorm = new THREE.Color('#0a141d');
  const sun0 = rig.sun.intensity, hemi0 = rig.hemi.intensity;

  /* ---------- câmera (um trilho só, do começo ao fim) ---------- */
  const rail = L.camRail(CAM, { fov: 34, smooth: 0.55, drift: 0.008, tension: 0.35 });

  function update(t, cam, ui) {
    const S = H.state(t, ui.variant || null);
    const look = rail(t, cam);
    const dist = cam.position.distanceTo(look);
    rig.focus(look.x, look.y, look.z, Math.min(70, Math.max(8, dist * 0.55)));
    // luz de tempestade: céu mais escuro e sol mais fraco com a chuva intensa (sem perder a leitura)
    const dk = S.dark;
    rig.sun.intensity = sun0 * (1 - 0.42 * dk); rig.hemi.intensity = hemi0 * (1 - 0.25 * dk);
    scene.background.copy(bgDay).lerp(bgStorm, dk * 0.8); if (scene.fog) scene.fog.color.copy(scene.background);
    for (const m of mods) m.update(t, S, cam);
    labels(t, S, ui);
    // medidor de chuva (sempre a mesma escala; no antes × depois mostra a mesma intensidade)
    const mv = Math.max(S.rain, 0), ma = L.sstep(0.02, 0.15, S.rain) * (t < 4.4 ? 0 : 1);
    if (ma > 0.01) ui.meter(mv, H.rainText(mv), ma);
    if (!ui.variant) { const k = L.sstep(SPLIT[0], SPLIT[0] + 0.7, t) * (1 - L.sstep(SPLIT[1] - 0.6, SPLIT[1], t)); if (k > 0.001) ui.split(k, 'Antes', 'Depois', 'Mesma chuva'); }
    return S;
  }

  /* ---------- rótulos (no máximo 2 ao mesmo tempo) ---------- */
  const P = (x, y, z) => new THREE.Vector3(x, y, z);
  const yG = (x) => Lo.GALLERY.invert(Math.min(x, 16));
  function labels(t, S, ui) {
    const w = (a, b, fi = 0.25, fo = 0.25) => L.pulse(t, a, b, fi, fo);
    ui.label('infil', 'Infiltra', P(-14, 2.2, Lo.ZF), w(12.3, 16.8), { cls: 'good' });
    ui.label('escoa', 'Escoa', P(14, 2.6, Lo.ZF - 0.3), w(14.4, 16.9), { cls: 'accent' });
    ui.label('imper', 'A água não passa', P(-16, Lo.streetY(-16) + 0.2, 20), w(23.3, 27.3), { cls: 'warn' });
    ui.label('bl', 'Boca de lobo', P(Lo.HOOK_INLET, Lo.streetY(Lo.HOOK_INLET) + 0.3, 23.6), w(34.6, 37.2), { cls: 'accent' });
    ui.label('gal', 'Galeria de drenagem', P(-6, yG(-6) + 0.7, Lo.ZF), w(37.6, 41.4), { cls: 'accent' });
    ui.label('canal', 'Canal', P(18, Lo.CANAL.invert(18) + 1.2, Lo.ZF), w(40.9, 42.4), { cls: 'accent' });
    ui.label('chuva2rio', 'Chuva → rio', P(-4, yG(-4) + 0.7, Lo.ZF), w(42.4, 44.8), { cls: 'good' });
    ui.label('esg', 'Esgoto → tratamento', P(-4, Lo.SEWER.y(-4), Lo.ZF), w(42.4, 44.8), { cls: 'plain', stem: 0, dy: 70 });
    ui.label('lim', 'Limite', P(-2, yG(-2) + Lo.GALLERY.small.h + 0.05, Lo.ZF), w(47.0, 50.6), { cls: 'warn' });
    ui.label('cap', 'Mais água do que cabe', P(4, yG(4) + Lo.GALLERY.small.h, Lo.ZF), w(51.6, 54.2), { cls: 'warn' });
    ui.label('lixo', 'Lixo na grelha', P(Lo.HOOK_INLET, Lo.streetY(Lo.HOOK_INLET) + 0.3, 23.6), w(55.6, 58.8), { cls: 'warn' });
    ui.label('rio', 'Rio cheio', P(31, S.river + 0.2, Lo.ZF - 2), w(59.8, 63.2), { cls: 'warn' });
    ui.label('flap', 'A água não consegue sair', P(25.6, Lo.CANAL.invert(25.6) + 1.6, Lo.ZF), w(63.0, 65.5), { cls: 'warn' });
    ui.label('casa', 'Água nas casas', P(8.5, Lo.G(8.5, 10) + 1.6, 11.5), w(69.0, 71.3), { cls: 'warn' });
    ui.label('pisc', 'Piscinão', P((Lo.PLAZA.x0 + Lo.PLAZA.x1) / 2, Lo.G(-1, 6) + 0.6, 6), w(77.7, 81.2), { cls: 'good big' });
    ui.label('entra', 'Guarda o excesso', P(Lo.RES_INLET.x, Lo.G(-1, 11) - 1.4, Lo.RES_INLET.zIn), w(81.4, 84.3), { cls: 'good' });
    ui.label('sai', 'Devolve aos poucos', P(Lo.RES_PUMP.x, Lo.G(4, 2.5) + 0.6, Lo.RES_PUMP.z), w(84.6, 87.4), { cls: 'good' });
    ui.label('amp', 'Galeria maior', P(-4, yG(-4) + Lo.GALLERY.big.h + 0.1, Lo.ZF), w(88.1, 89.9), { cls: 'good' });
    ui.label('jard', 'Jardim de chuva', P(-28, Lo.streetY(-28) - 0.1, Lo.ZF), w(90.0, 91.8), { cls: 'good' });
    ui.label('verde', 'Área verde', P(24.3, 2.6, 8), w(92.2, 94.3), { cls: 'good' });
    ui.label('perm', 'Pavimento permeável', P(1.5, Lo.G(1.5, -18) + 0.2, -18), w(94.4, 96.8), { cls: 'good' });
    ui.label('drn', 'Chuva → rio', P(12, yG(12) + 1, Lo.ZF), w(108.8, 111.8), { cls: 'good' });
    ui.label('esg2', 'Esgoto → tratamento', P(13, 3.6, -18), w(108.8, 111.8), { cls: 'accent' });
  }

  return { scene, update, ao: { radius: 1.2, thickness: 3, scale: 1.0, intensity: 0.8 }, exposure: 1.0, splitAt: (t) => (t > SPLIT[0] - 0.05 && t < SPLIT[1] + 0.05 ? 1 : 0), mods };
}

/* ---------- tela dividida: mesma cidade, mesmo instante, mesma tempestade ---------- */
const SPLIT = [103.9, 110.4];

/* ---------- trilho de câmera (t global) ----------
   Coordenadas da maquete: x −40 (morro) … 44 (rio); z −24 (fundo) … 26 (corte da frente); chão ~3–8 m. */
const CAM = [
  // gancho: rente à rua alagada no ponto baixo, boca de lobo afogada e carro; recua revelando a cidade
  { t: 0.0, p: [11.5, 4.2, 31.5], l: [8.0, 2.9, 22.5], fov: 38 },
  { t: 2.4, p: [14.0, 7.5, 38.0], l: [7.0, 2.6, 19.0], fov: 38 },
  { t: 5.3, p: [40, 52, 82], l: [2, 1, 2], fov: 36 },
  // rebobina e terreno natural na chuva
  { t: 9.3, p: [42, 50, 78], l: [2, 1, 4], fov: 35 },
  { t: 11.8, p: [22, 26, 58], l: [-6, 2, 14], fov: 34 },
  // infiltração no solo em corte, depois o escoamento até o rio
  { t: 13.9, p: [-10, 6, 46], l: [-12, 1.5, 24], fov: 34 },
  { t: 16.6, p: [16, 14, 50], l: [16, 1, 20], fov: 34 },
  // construção da cidade (vista geral alta)
  { t: 19.5, p: [38, 56, 76], l: [-2, 2, 0], fov: 36 },
  { t: 22.4, p: [30, 44, 70], l: [-6, 3, 4], fov: 35 },
  // impermeabilização em corte
  { t: 25.6, p: [-14, 9, 44], l: [-16, 3.5, 22], fov: 34 },
  // enxurrada e poça no ponto baixo
  { t: 30.4, p: [-6, 16, 52], l: [0, 3.5, 18], fov: 35 },
  { t: 33.6, p: [16, 12, 44], l: [8, 2.6, 19], fov: 35 },
  // bocas de lobo
  { t: 36.4, p: [10.5, 5.2, 33.5], l: [8, 1.8, 24.5], fov: 36 },
  // galerias (no corte)
  { t: 39.6, p: [-4, 6, 46], l: [-6, 1.8, 25], fov: 36 },
  // canal e rio; raio-x das duas redes
  { t: 42.0, p: [20, 9, 50], l: [18, 0.5, 24], fov: 36 },
  { t: 44.6, p: [6, 14, 58], l: [2, 1.5, 22], fov: 36 },
  // chuva normal → intensa → sobrecarga (corte da galeria + rua)
  { t: 48.2, p: [0, 7, 44], l: [0, 1.6, 24], fov: 36 },
  { t: 53.6, p: [7, 6.5, 40], l: [5, 1.8, 24], fov: 36 },
  // lixo na grelha
  { t: 57.6, p: [10.2, 4.6, 30.5], l: [8, 2.4, 23.4], fov: 36 },
  // rio sobe, saída afogada
  { t: 61.8, p: [36, 7, 46], l: [28, 0, 24], fov: 36 },
  { t: 65.0, p: [30, 6, 42], l: [24, 0, 25], fov: 36 },
  // alagamento progressivo (mesmo enquadramento do gancho, mais alto), carros e casa
  { t: 68.6, p: [22, 22, 54], l: [6, 2.5, 14], fov: 36 },
  { t: 71.2, p: [15, 9.5, 30], l: [8.5, 3.0, 12], fov: 36 },
  // piscinão: escavação, estrutura, ligações
  { t: 74.6, p: [10, 26, 40], l: [-1, 1, 6], fov: 36 },
  { t: 78.2, p: [-14, 24, 38], l: [-1, 0, 6], fov: 36 },
  // piscinão funcionando: entra o excesso, nível sobe, depois a bomba devolve aos poucos
  { t: 82.2, p: [-4, 22, 36], l: [0, 0, 7], fov: 36 },
  { t: 86.8, p: [10, 20, 34], l: [1, 0, 5], fov: 36 },
  // ampliação da galeria (corte) e jardins de chuva
  { t: 89.4, p: [-14, 8, 46], l: [-14, 3, 24], fov: 36 },
  { t: 91.4, p: [-26, 10, 46], l: [-26, 5, 22], fov: 36 },
  // área verde na margem e pavimento permeável no estacionamento
  { t: 93.6, p: [44, 26, 40], l: [23, 1, 8], fov: 36 },
  { t: 96.4, p: [20, 24, -2], l: [1.5, 3, -18], fov: 36 },
  // nova tempestade com as melhorias; depois antes × depois (mesmo enquadramento dos dois lados)
  { t: 99.6, p: [28, 40, 66], l: [2, 1, 8], fov: 36 },
  { t: 103.6, p: [20, 30, 50], l: [6, 2, 13], fov: 36 },
  { t: 110.4, p: [20.5, 30.5, 50.5], l: [6, 2, 13], fov: 36 },
  // sistema completo, terminando no rio
  { t: 112.4, p: [46, 60, 88], l: [4, 0, 2], fov: 36 },
  { t: 116.6, p: [52, 34, 64], l: [24, 0, 10], fov: 36 }
];

export const create = null; // este cenário é assíncrono (createAsync): o motor chama createAsync quando existir
