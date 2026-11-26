// MÓDULO ETA 2 — fileira 2 da ETA: filtros (4, em corte), galeria de água filtrada, tanque de contato com chicanas,
// reservatório apoiado, elevatória de água tratada e laboratório. Contrato: docs/MODULOS.md.
import { makeKit } from './eta2/kit.js';
import { makeFilters } from './eta2/filters.js';
import { makeContact } from './eta2/contact.js';

export async function create(ctx) {
  const { L, THREE, scene, Lo, q } = ctx;
  const K = makeKit(L);
  const root = new THREE.Group(); root.name = 'eta2'; scene.add(root);
  const parts = [];
  const add = (p) => { root.add(p.root); parts.push(p); return p; };
  add(makeFilters(ctx, K));
  add(makeContact(ctx, K));
  // chão provisório do platô quando o terreno não está carregado (testes com ?mods=eta2)
  const mods = q && q.get('mods');
  if (mods && !mods.split(',').includes('terreno')) {
    const gnd = L.box(110, 2, 70, L.mat('#7f9a6a', { roughness: 0.95 }), 4, Lo.ETA.y - 1, -55); gnd.castShadow = false; scene.add(gnd);
  }
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); }
  };
}
