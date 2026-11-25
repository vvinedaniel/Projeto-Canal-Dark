// MÓDULO DRENAGEM do Ep. 02 — o coração técnico: bocas de lobo, galeria em corte (montagem + ampliação),
// poços de visita, canal, bueiro, cabeceira com comporta, rede de esgoto separada, lixo nas grelhas e toda a água
// dentro dessas estruturas. Tudo é função pura de (t, S). Submódulos em ./drainage/*.js.
import { makeKit } from './drainage/kit.js';
import { buildGallery } from './drainage/gallery.js';
import { buildCrane } from './drainage/crane.js';
import { buildInlets } from './drainage/inlets.js';
import { buildCanal } from './drainage/canal.js';
import { buildSewer } from './drainage/sewer.js';
import { buildTrash } from './drainage/trash.js';
import { buildManholes } from './drainage/manholes.js';

export function create(ctx) {
  const K = makeKit(ctx);
  const gal = buildGallery(ctx, K);
  const inlets = buildInlets(ctx, K, gal);
  const crane = buildCrane(ctx, K, gal);
  const canal = buildCanal(ctx, K, gal);
  const sewer = buildSewer(ctx, K, gal);
  const trash = buildTrash(ctx, K, inlets);
  const holes = buildManholes(ctx, K, gal);
  const parts = [gal, inlets, crane, canal, sewer, trash, holes];
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); }
  };
}
