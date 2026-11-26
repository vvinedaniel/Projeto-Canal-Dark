// MÓDULO ETA 2 — fileira 2 da ETA: filtros (4, em corte), galeria de água filtrada, tanque de contato com chicanas,
// reservatório apoiado, elevatória de água tratada e laboratório. Contrato: docs/MODULOS.md.
import { makeKit } from './eta2/kit.js';
import { makeFilters } from './eta2/filters.js';
import { makeContact } from './eta2/contact.js';
import { makeReservoir } from './eta2/reservoir.js';
import { makeLab } from './eta2/lab.js';

export async function create(ctx) {
  const { L, THREE, scene, Lo, q } = ctx;
  const K = makeKit(L);
  const root = new THREE.Group(); root.name = 'eta2'; scene.add(root);
  const parts = [];
  const add = (p) => { root.add(p.root); parts.push(p); return p; };
  add(makeFilters(ctx, K));
  add(makeContact(ctx, K));
  add(makeReservoir(ctx, K));
  add(makeLab(ctx, K));
  // chão provisório do platô quando o terreno não está carregado (testes com ?mods=eta2)
  const mods = q && q.get('mods');
  if (mods && !mods.split(',').includes('terreno')) {
    const gnd = L.box(110, 2, 70, L.mat('#7f9a6a', { roughness: 0.95 }), 4, Lo.ETA.y - 1, -55); gnd.castShadow = false; scene.add(gnd);
  }
  // estatística para o relatório (triângulos e malhas do módulo)
  let tri = 0, calls = 0; root.traverse((o) => { if (o.isMesh) { calls++; const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tri += n * (o.isInstancedMesh ? o.count : 1); } });
  window.__eta2stats = { tri: Math.round(tri), meshes: calls, parts: parts.map((p) => { let n = 0; const by = {}; p.root.traverse((o) => { if (o.isMesh) { n++; const k = (o.parent && o.parent.name) || o.geometry.type; by[k] = (by[k] || 0) + 1; } }); return { n, by }; }) };
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); }
  };
}
