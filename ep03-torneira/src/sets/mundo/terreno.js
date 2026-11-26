// Módulo TERRENO do Ep. 03: relevo (serra, represa, margem, pátio da captação, talude com muro de arrimo de gabiões,
// platô da ETA, encosta, chão da cidade com raio-x), represa e rios com correnteza, barragem com vertedouro em degraus,
// mata/árvores/capim/taboas, faces de corte do bloco (frente com os rasgos das três redes). Contrato: docs/MODULOS.md.
// Exporta em ctx.shared:
//   groundY(x,z)   altura do chão desenhado (= Lo.G, exceto nos desvios locais descritos em terreno/relief.js)
//   soilMat        material do solo em corte (camadas pela profundidade abaixo do chão; serve em qualquer parede)
//   soilKit        { U, material() } fábrica do material de solo
//   terrainHoles   [] — outro módulo pode empurrar { x0,x1,z0,z1 } ou { cx,cz,r } no seu create(): o chão some ali
//   faceSlots      rasgos da face da frente (id, x0,x1, y0,y1, z)
import { buildGround } from './terreno/ground.js';
import { buildWater } from './terreno/water.js';
import { buildDam } from './terreno/dam.js';
import { buildFlora } from './terreno/flora.js';

export function create(ctx) {
  const gr = buildGround(ctx);
  const parts = [gr, buildWater(ctx), buildDam(ctx), buildFlora(ctx, gr)];
  if ((ctx.q.get('mods') || '').includes('tdebug')) {
    const rep = {}; const cnt = (o) => (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
    ctx.scene.traverse((o) => { if (o.isMesh && o.geometry) { let g = o; while (g.parent && !g.name) g = g.parent; const k = g.name + (o.isInstancedMesh ? ':inst' : ''); rep[k] = rep[k] || [0, 0]; rep[k][0] += cnt(o); rep[k][1]++; } });
    parts[3].meshes.forEach((m) => { rep['  ' + m.key] = [m.n * ((m.im.geometry.index ? m.im.geometry.index.count : m.im.geometry.attributes.position.count) / 3), m.n]; });
    console.warn('[terreno] ' + JSON.stringify(Object.fromEntries(Object.entries(rep).map(([k, v]) => [k, [Math.round(v[0]), v[1]]]))));
  }
  if ((ctx.q.get('mods') || '').includes('tnoflora')) parts[3].grp.visible = false;
  return { update(t, S, cam) { for (const p of parts) p.update(t, S, cam); } };
}
