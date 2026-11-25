// Cenário "rede" (37.75 → 50.2 s): a rede coletora sob um bairro e a estação elevatória.
// Parte 1 (até CUT): maquete do bairro; a superfície se levanta e mostra ramais → coletores → tronco.
// Parte 2 (depois de CUT): corte longitudinal do terreno com o tronco cada vez mais fundo e a estação de bombas.
import { makeKit } from './rede/kit.js';
import { buildBairro } from './rede/bairro.js';
import { buildElev } from './rede/elevatoria.js';

export function create(L, { PH, def }) {
  const { THREE } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 50, fogNear: 200, fogFar: 520, hemi: 1.05, sun: 2.9, backdrop: false });
  { // fundo de estúdio próprio (mesma fórmula da lib, com malha mais fina: a câmera olha muito para baixo)
    const g = new THREE.SphereGeometry(390, 72, 60), cols = [], lo = new THREE.Color(L.PAL.bg), hi = new THREE.Color(L.PAL.bgHi), pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = Math.pow(1 - Math.abs(pa.getY(i) / 390 - 0.06), 3.2), c = lo.clone().lerp(hi, L.clamp01(k)); cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const dome = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; dome.frustumCulled = false; scene.add(dome);
  }
  const K = makeKit(L);
  const A = buildBairro(L, K), B = buildElev(L, K);
  scene.add(A.root, B.root);
  const CUT = 43.72;

  const railA = L.camRail([
    { t: 37.75, p: [36, 5, 58], l: [6, 3, 12], fov: 42 },
    { t: 38.5, p: [32, 16, 86], l: [1, 5, 6], fov: 42 },
    { t: 39.6, p: [16, 52, 176], l: [0, -4, 0], fov: 40 },
    { t: 40.5, p: [-6, 44, 94], l: [3.5, -4, 11], fov: 38 },
    { t: 41.5, p: [-15, 30, 72], l: [2, -5, 13], fov: 38 },
    { t: 42.4, p: [-10, 20, 64], l: [0, -6.5, 18], fov: 38 },
    { t: 43.1, p: [1, 5, 56], l: [0, -8.5, 27], fov: 38 },
    { t: 43.75, p: [3, -6, 43], l: [0, -9.6, 31], fov: 38 }
  ], { drift: 0.006 });
  const railB = L.camRail([
    { t: 43.7, p: [-27, 2.5, 40], l: [-25.5, -3.4, 0], fov: 35 },
    { t: 45.7, p: [-9.5, 1.5, 40], l: [-9, -4.6, 0], fov: 35 },
    { t: 46.9, p: [0.6, 1.0, 44], l: [0.5, -4.8, 0], fov: 35 },
    { t: 47.95, p: [0.4, -5.4, 18], l: [0, -7.3, -0.8], fov: 35 },
    { t: 48.6, p: [1.2, -3.0, 20], l: [1.4, -4.3, -0.5], fov: 35 },
    { t: 49.2, p: [8, 0, 22], l: [8.4, -2.6, 0], fov: 35 },
    { t: 49.7, p: [14, 0.2, 17], l: [14.5, -3.2, 0], fov: 36 },
    { t: 50.2, p: [18, -2.2, 5], l: [24, -3.9, 0], fov: 38 }
  ], { drift: 0.008 });

  return {
    scene,
    ao: { radius: 0.7 },
    update(t, camera, ui) {
      const a = t < CUT;
      A.root.visible = a; B.root.visible = !a;
      ui.dark(1 - L.sstep(0.03, 0.27, Math.abs(t - CUT)));
      if (a) {
        rig.dir.set(0.45, 0.64, 1).normalize();
        railA(t, camera);
        scene.fog.near = 200; scene.fog.far = 560;
        rig.focus(0, 10, 0, 56);
        A.update(t, ui);
      } else {
        rig.dir.set(-0.38, 1, 0.72).normalize();
        const look = railB(t, camera);
        scene.fog.near = 38; scene.fog.far = 125;
        rig.focus(look.x, -3, -2, 16);
        B.update(t, ui);
      }
    }
  };
}
