// Ep. 03 — a maquete única, do manancial à torneira. Integra os módulos (cada um dono de uma parte do mundo),
// a câmera (um trilho só), a luz, os rótulos e a lente de ampliação ilustrativa.
// Contrato de módulo: export function create(ctx) -> { update(t, S, cam) }   (veja docs/MODULOS.md)
import * as Lo from './mundo/layout.js';
import * as St from './mundo/state.js';
import { CAM, LABELS, LENS } from './mundo/direction.js';

const MODULES = ['terreno', 'captacao', 'eta1', 'eta2', 'cidade', 'casa', 'micro'];

export async function createAsync(L, { PH }) {
  const { THREE } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { fogNear: 260, fogFar: 640, size: 60, shadowMap: 4096, sunDir: [0.5, 1, 0.55], hemi: 1.0, sun: 2.7 });
  // "plantas" (contorno azul translúcido) das estruturas ainda não construídas: um material só, opacidade = S.ghost
  const ghost = { line: new THREE.LineBasicMaterial({ color: '#8fdcff', transparent: true, opacity: 0.6, depthWrite: false }),
    fill: new THREE.MeshBasicMaterial({ color: '#8fdcff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide }) };
  /** contorno de planta para um objeto (arestas das malhas): devolve um Group a adicionar no lugar da estrutura pronta */
  ghost.of = (obj, angle = 30) => { const g = new THREE.Group(); obj.updateMatrixWorld(true); obj.traverse((o) => { if (o.isMesh && o.geometry) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, angle), ghost.line); e.matrixAutoUpdate = false; e.matrix.copy(o.matrixWorld); g.add(e); } }); g.renderOrder = 5; return g; };
  const ctx = { L, THREE, scene, Lo, St, PH, rig, ghost, shared: {}, q: new URLSearchParams(location.search) };
  const mods = [];
  const only = ctx.q.get('mods') ? ctx.q.get('mods').split(',') : null; // ?mods=terreno,eta1 para testar isolado
  for (const id of MODULES) {
    if (only && !only.includes(id)) continue;
    try { const m = await import(`./mundo/${id}.js`); mods.push({ id, ...(await m.create(ctx)) }); }
    catch (e) { console.warn(`[módulo ${id}]`, e.message, (e.stack || '').split('\n')[1]); }
  }
  const rail = L.camRail(CAM, { fov: 34, smooth: 0.55, drift: 0.006, tension: 0.35 });

  function update(t, cam, ui) {
    const S = St.state(t);
    ghost.line.opacity = 0.6 * S.ghost; ghost.fill.opacity = 0.07 * S.ghost; ghost.line.visible = ghost.fill.visible = S.ghost > 0.01;
    let look;
    if (window.__cam) { const c = window.__cam; cam.position.set(...c.p); look = new THREE.Vector3(...c.l); cam.lookAt(look); if (c.fov) { cam.fov = c.fov; cam.updateProjectionMatrix(); } }
    else look = rail(t, cam);
    cam.updateMatrixWorld(true);
    const dist = cam.position.distanceTo(look);
    rig.focus(look.x, look.y, look.z, Math.min(90, Math.max(6, dist * 0.55)));
    for (const m of mods) m.update(t, S, cam);
    // rótulos (no máximo 2 ao mesmo tempo; janelas em direction.js)
    for (const lb of LABELS) { const a = L.pulse(t, lb.a, lb.b, 0.25, 0.25); if (a > 0.001) ui.label(lb.id, lb.text, new THREE.Vector3(...lb.p), a, lb.o || {}); }
    // lente de ampliação ilustrativa
    if (S.micro.a > 0.005) { const ln = LENS[S.micro.mode] || {}; ui.micro(S.micro.a, { ...ln, tag: ln.tag || 'Ampliação ilustrativa' }); }
    ui.dark(0);
    return S;
  }
  const micro = ctx.shared.micro || null;   // { scene, camera } do módulo micro
  return { scene, update, micro, ao: { radius: 0.9, thickness: 2.5, scale: 1, intensity: 0.8 } };
}
