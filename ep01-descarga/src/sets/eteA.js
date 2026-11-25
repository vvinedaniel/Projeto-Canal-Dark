// Cenário eteA (50,2 → 65,04 s): chegada à estação de tratamento, gradeamento, caixa de areia e decantador primário.
// O bloco da estação é cortado pelo plano z = 0: tubo de chegada, canal das grades, caixa de areia e o
// decantador primário aparecem em corte, um depois do outro, e a câmera caminha no sentido do fluxo (+x).
import { makeKit } from './eteA/kit.js';
import { buildHeadworks } from './eteA/headworks.js';
import { buildClarifier } from './eteA/clarifier.js';
import { buildSite } from './eteA/site.js';

export function create(L, { PH, def }) {
  const { THREE } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 60, fogNear: 170, fogFar: 640, sunDir: [-0.42, 1, 0.62], sun: 3.1, hemi: 0.85, backdrop: false });
  { // mesmo fundo em degradê do L.studio, mas com raio menor: a câmera da vista aérea fica longe da origem e a
    // cúpula de 480 m da lib seria cortada pelo plano distante (far = 600) da câmera do motor
    const R = 380, geo = new THREE.SphereGeometry(R, 32, 24), cols = [], lo = new THREE.Color(L.PAL.bg), hi = new THREE.Color(L.PAL.bgHi), pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const k = Math.pow(Math.max(0, 1 - Math.abs(pa.getY(i) / R - 0.06)), 3.2), c = lo.clone().lerp(hi, L.clamp01(k)); cols.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const dome = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10; dome.frustumCulled = false; dome.position.set(10, 0, -20); scene.add(dome);
  }
  const K = makeKit(L);

  // estruturas acima do solo "brotam" durante a revelação, numa onda que acompanha o fluxo (da esquerda para a direita)
  const pops = [];
  const pop = (x, y, z, delay = 0) => { const g = L.group(scene, x, y, z); pops.push({ g, t0: 50.95 + ((x + 52) / 144) * 1.9 + delay }); return g; };

  const site = buildSite(L, K, scene, pop);
  const head = buildHeadworks(L, K, scene, pop);
  const clar = buildClarifier(L, K, scene, pop);

  const rail = L.camRail([
    { t: 50.2, p: [-58, 0.6, 9], l: [-47, -2.0, 0], fov: 38 },
    { t: 51.1, p: [-84, 20, 30], l: [-30, -2, -8], fov: 42 },
    { t: 52.3, p: [-118, 94, 40], l: [2, -12, -22], fov: 41 },
    { t: 53.4, p: [-108, 88, 48], l: [4, -12, -20], fov: 40 },
    { t: 54.5, p: [-48.5, 11, 21], l: [-28.4, -3.1, -1.0], fov: 35 },
    { t: 57.6, p: [-43, 9, 23.5], l: [-27.4, -3.0, -1.0], fov: 34 },
    { t: 58.6, p: [-29, 12, 23], l: [-13.5, -6.2, -1], fov: 38 },
    { t: 60.8, p: [-19.5, 6.2, 15.5], l: [-10.8, -5.6, -0.5], fov: 34 },
    { t: 62.0, p: [-13, 31, 62], l: [18.5, -11, -4], fov: 38 },
    { t: 63.5, p: [-3, 26, 58], l: [20.5, -10.5, -4], fov: 37 },
    { t: 64.3, p: [25, 8, 11], l: [42, -3.5, -2.2], fov: 38 },
    { t: 65.04, p: [41, -0.2, -1.8], l: [60, -3.4, -5.5], fov: 42 }
  ], { tension: 0.35, smooth: 0.55, drift: 0.01 });
  const fk = [[50.2, 16], [51.2, 45], [52.3, 95], [53.5, 95], [54.5, 15], [57.6, 15], [58.6, 17], [60.8, 12], [62, 30], [63.5, 30], [64.3, 30], [65.04, 36]];
  const fsize = (t) => { let i = 0; while (i < fk.length - 2 && t >= fk[i + 1][0]) i++; return L.lerp(fk[i][1], fk[i + 1][1], L.sstep(fk[i][0], fk[i + 1][0], t)); };

  return {
    scene,
    ao: { radius: 0.55 },
    update(t, camera, ui) {
      for (const p of pops) { const k = L.prog(t, p.t0, p.t0 + 0.5); p.g.visible = k > 0; p.g.scale.y = k >= 1 ? 1 : Math.max(0.001, L.ease.back(k)); }
      site.update(t); head.update(t); clar.update(t);
      const look = rail(t, camera);
      rig.focus(look.x, look.y, look.z, fsize(t));
      ui.label('ete', 'Estação de tratamento', [52, 10, -54], L.pulse(t, 51.9, 53.75, 0.3, 0.25), { cls: 'big accent', stem: 0 });
      ui.label('grades', 'Grades', [-28.2, 0.9, -0.2], L.pulse(t, 54.6, 57.7), { cls: 'accent', stem: 70 });
      ui.label('areia', 'Areia', [-12.5, -3.5, 0], L.pulse(t, 58.7, 60.9), { cls: 'accent', stem: 90 });
      ui.label('lodo', 'Lodo', [23.5, -6.9, 0], L.pulse(t, 62.4, 64.2), { cls: 'accent', stem: 80 });
    }
  };
}
