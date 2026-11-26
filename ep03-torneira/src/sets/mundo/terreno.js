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

export function create(ctx) {
  const parts = [buildGround(ctx)];
  return { update(t, S, cam) { for (const p of parts) p.update(t, S, cam); } };
}
