// Módulo CIDADE do Ep. 02: ruas, calçadas, asfalto animado, casas e prédios (construção animada com grua), praça,
// estacionamento, ETE e elevatória, carros, mobiliário urbano. Contrato em docs/MODULOS.md.
// Partes em src/sets/cidade/city/*.js. Tudo é função pura de (t, S).
import { makeKit } from './city/kit.js';
import { buildStreets } from './city/streets.js';
import { buildHouses } from './city/houses.js';
import { buildTowers } from './city/towers.js';
import { buildPlaza } from './city/plaza.js';
import { buildETE } from './city/ete.js';
import { buildCars } from './city/cars.js';

export function create(ctx) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const K = makeKit(L, Lo);
  const root = new THREE.Group(); root.name = 'city'; scene.add(root);
  const parts = [];
  const streets = buildStreets(ctx, K); root.add(streets.root); parts.push(streets);
  const ctx2 = { ...ctx, H: streets.H, streets };
  for (const build of [buildHouses, buildTowers, buildPlaza, buildETE, buildCars]) {
    try { const p = build(ctx2, K); root.add(p.root); parts.push(p); }
    catch (e) { console.warn('[cidade]', build.name, e.message, (e.stack || '').split('\n')[1]); }
  }
  // superfícies que ficam translúcidas no raio-x (cada parte aplica nas suas; o integrador pode consultar)
  const surf = parts.flatMap((p) => p.xrayMats || []);
  shared.surfaces = () => surf;
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); }
  };
}
