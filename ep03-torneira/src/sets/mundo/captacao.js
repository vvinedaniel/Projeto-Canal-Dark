// Módulo CAPTAÇÃO do Ep. 03: torre de tomada d'água (grade + comporta) com ensecadeira, tubo até o poço de sucção,
// casa de bombas em corte com 2 conjuntos motobomba (talha/monovia, barrilete, válvulas), bomba 1 em corte com rotor
// girando, escavadeira da obra e ADUTORA DE ÁGUA BRUTA até Lo.P.rawIn. Contrato: docs/MODULOS.md.
//
// Truque de render: o chão do terreno (e o lago) são "abertos" sobre a cava do poço e dentro da ensecadeira por uma
// MÁSCARA DE PROFUNDIDADE: tudo deste módulo desenha antes (Group.renderOrder = −2 → groupOrder), depois uma tampa
// invisível (colorWrite = false) grava a profundidade na boca da cava (groupOrder −1), e o terreno/lago que vêm depois
// falham no teste de profundidade ali. Águas DENTRO da cava usam mistura por alfa na lista opaca (K.blendWater).
import { makeKit } from './captacao/kit.js';
import { buildIntake } from './captacao/intake.js';
import { buildHouse } from './captacao/house.js';
import { buildPumps } from './captacao/pumps.js';
import { buildMain } from './captacao/rawmain.js';

export async function create(ctx) {
  const { L, THREE, scene, Lo, St, q } = ctx;
  const K = makeKit(L);
  const root = new THREE.Group(); root.name = 'captacao'; scene.add(root);
  const maskG = new THREE.Group(); maskG.name = 'captacao.mask'; maskG.renderOrder = -1; scene.add(maskG);
  const maskMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: true, side: THREE.DoubleSide });
  const R = {
    root,
    /** tampa invisível que "fura" o chão/lago desenhados depois (retângulo em y) */
    mask(x0, x1, z0, z1, y) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), maskMat); m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.visible = false; maskG.add(m); return m; },
    /** ângulo do rotor: integral da rotação (função pura de t) — gira desde a partida (13,3–13,9 s) */
    spin(t, run) {
      const W = 7.5;
      if (t < St.REWIND[1]) return W * t * run;
      const a = 13.3, b = 13.9; if (t <= a) return 0;
      const k = Math.min(1, (t - a) / (b - a)), ramp = (b - a) * (k * k * k - (k * k * k * k) / 2);
      return W * (ramp + Math.max(0, t - b));
    }
  };
  // teste isolado: "cproxy" em ?mods= desenha um chão/lago provisório (o terreno real é outro módulo)
  const mods = (q.get('mods') || '').split(',');
  if (mods.includes('cproxy')) { const { proxy } = await import('./captacao/proxy.js'); scene.add(proxy(ctx, !mods.includes('terreno'))); }

  const parts = [];
  parts.push(buildIntake(ctx, K, R));
  parts.push(buildHouse(ctx, K, R));
  parts.push(buildPumps(ctx, K, R));
  parts.push(buildMain(ctx, K, R));
  // todo o módulo desenha antes da máscara (groupOrder −2 em todos os grupos, inclusive os aninhados)
  root.traverse((o) => { if (o.isGroup) o.renderOrder = -2; });
  ctx.shared.captacao = { rawOut: Lo.P.rawOut, rawIn: Lo.P.rawIn, path: R.mainPath };

  const dbg = mods.includes('cstats');
  const api = {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam); if (dbg) { const s = api.stats(); console.log(`[captacao] t=${t} tri=${Math.round(s.tri)} calls=${s.calls}`); } },
    stats() { let tri = 0, calls = 0; root.traverse((o) => { if (o.isMesh && o.visible && o.geometry) { calls++; const n = o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count; tri += (n / 3) * (o.isInstancedMesh ? o.count : 1); } }); return { tri, calls }; }
  };
  return api;
}
