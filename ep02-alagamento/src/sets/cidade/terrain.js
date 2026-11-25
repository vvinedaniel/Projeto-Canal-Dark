// Módulo TERRENO do Ep. 02: chão natural → urbano (heightfield), mata e campo, morro, córrego natural,
// rio e sua água, faces de corte do solo (frente com furos + tampões que "escavam"), setas de infiltração e
// bloqueio no corte, raio-x do chão. Contrato: docs/MODULOS.md.
//   exporta em ctx.shared: groundY(x,z), soilMat (material do solo em corte), soilKit (fábrica + uniforms),
//                          faceHoles ([{id, poly}] polígonos dos furos da face da frente), forestDensity(x,z)
import { buildGround } from './terrain/ground.js';
import { buildFlora } from './terrain/flora.js';
import { buildRiver } from './terrain/river.js';
import { buildArrows } from './terrain/arrows.js';

export function create(ctx) {
  const gr = buildGround(ctx);
  const flora = buildFlora(ctx, gr);
  const river = buildRiver(ctx, gr);
  const arrows = buildArrows(ctx, gr);
  if ((ctx.q.get('mods') || '').includes('tdebug')) { let tri = 0, inst = 0; ctx.scene.traverse((o) => { if (o.isMesh && o.geometry) { const n = (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; const c = o.isInstancedMesh ? o.count : 1; tri += n * c; if (o.isInstancedMesh) inst += c; } }); console.warn('[terrain] tris', Math.round(tri), 'instances', inst, 'trees', flora.trees.length, 'small', flora.small.length); }
  const dbg = ctx.q.get('mods') || ''; // flags de teste de custo: tnoflora, tnoground, tnoriver, tnoarrows
  if (dbg.includes('tnoflora')) flora.grp.visible = false;
  if (dbg.includes('tnoground')) gr.grp.visible = false;
  if (dbg.includes('tnoriver')) river.grp.visible = false;
  if (dbg.includes('tnoarrows')) arrows.grp.visible = false;
  if (dbg.includes('tnoshadow')) gr.ground.castShadow = false;
  if (dbg.includes('tnofaces')) gr.grp.children.forEach((c) => { if (c !== gr.ground) c.visible = false; });
  if (dbg.includes('tnosurf')) gr.ground.visible = false;
  return {
    update(t, S, cam) {
      gr.update(t, S);
      flora.update(t, S);
      river.update(t, S);
      arrows.update(t, S);
    }
  };
}
