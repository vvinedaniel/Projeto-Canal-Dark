// Módulo CIDADE do Ep. 03 ("Como a água chega até sua torneira?").
// Dono de: adutora de água tratada (P.liftOut → torre), reservatório elevado (Lo.TOWER), rede de distribuição
// (avenida da encosta → rua de trás e Rua da Casa → ramais), ruas/calçadas/quadras, casas, prédios, escola, hospital,
// carros e árvores de rua; as três redes da Rua da Casa em corte na face (água, esgoto, drenagem), poços de visita,
// bocas de lobo, o tê com registro em P.house; linha do nível da torre e manômetros (S.piezo).
// Partes em src/sets/mundo/cidade/*.js. Tudo é função pura de (t, S). Reaproveita o kit do Ep. 02 (cidade/kit.js).
import { makeKit } from './cidade/kit.js';
import { buildStreets } from './cidade/streets.js';
import { buildBuildings } from './cidade/buildings.js';
import { buildCars } from './cidade/cars.js';
import { buildTower } from './cidade/tower.js';
import { buildMain } from './cidade/adutora.js';
import { buildNet } from './cidade/net.js';
import { buildFace } from './cidade/face.js';
import { buildPiezo } from './cidade/piezo.js';
import { FACE_HOLES } from './cidade/faceholes.js';

export async function create(ctx) {
  const { L, THREE, scene, Lo, shared } = ctx;
  const K = makeKit(L, Lo);
  const root = new THREE.Group(); root.name = 'cidade'; scene.add(root);
  shared.cityFaceHoles = FACE_HOLES;      // furos extras na face de corte (câmaras dos PVs e caixas das bocas de lobo)
  // chão provisório só para testes isolados (?dbgGround): o terreno de verdade é do módulo terreno
  if (ctx.q && ctx.q.has('dbgGround')) root.add(debugGround(L, THREE, Lo));
  const parts = [];
  const ctx2 = { ...ctx, K, root };
  for (const build of [buildStreets, buildBuildings, buildCars, buildTower, buildMain, buildNet, buildFace, buildPiezo]) {
    try { const p = build(ctx2, parts); if (p.root) root.add(p.root); parts.push(p); parts[build.name] = p; }
    catch (e) { console.warn('[cidade]', build.name, e.message, (e.stack || '').split('\n')[1]); }
  }
  if (ctx.q && ctx.q.has('cidadeInfo')) {
    let tris = 0, meshes = 0; root.updateMatrixWorld(true);
    root.traverse((o) => { if (o.isMesh) { meshes++; const g = o.geometry, n = g.index ? g.index.count / 3 : g.attributes.position.count / 3; tris += n * (o.isInstancedMesh ? o.count : 1); } });
    window.__cidadeInfo = { tris: Math.round(tris), meshes };
    console.log('[cidade] triângulos', Math.round(tris), 'malhas', meshes);
  }
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); }
  };
}

function debugGround(L, THREE, Lo) {
  const g = new THREE.PlaneGeometry(Lo.X1 - Lo.X0, Lo.ZF - Lo.Z0 + 1, 124, 206); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i) + (Lo.ZF + Lo.Z0) / 2; p.setXYZ(i, x, Lo.G(x, z) - 0.02, z); }
  g.computeVertexNormals();
  const m = L.mesh(g, L.mat('#6f9a4a', { roughness: 1 }), 0, 0, 0); m.receiveShadow = true;
  return m;
}
