// MÓDULO ETA 1 — fileira 1 da estação de tratamento de água (z −80 … −68), fluxo de +x para −x:
// caixa de chegada → calha Parshall (mistura rápida + coagulante) → floculadores (3 câmaras) → decantador
// → canal de água decantada (até P.filtIn) · linha de lodo → tanque de lodo (adensamento) → centrífuga
// · casa de química (coagulante, cloro, cal, flúor; bombas dosadoras) e TODAS as linhas de dosagem.
// update(t, S, cam) é função pura de (t, S): nada acumulado entre quadros (as "fases" de rotação vêm de tabelas
// pré-calculadas da integral dos sinais de S.run, que também são funções de t).
import { makeKit } from './eta1/kit.js';
import { buildArrival } from './eta1/arrival.js';
import { buildChem } from './eta1/chem.js';
import { buildFloc } from './eta1/floc.js';
import { buildDec } from './eta1/dec.js';

export function create(ctx) {
  const { L, THREE, scene, Lo, St, ghost, shared } = ctx;
  const K = makeKit(L);
  const root = new THREE.Group(); root.name = 'eta1'; scene.add(root);

  /* fase integrada de um sinal r(t) ∈ [0,1] (para girar/andar sem saltos quando a velocidade muda): Φ(t) = ∫₀ᵗ r dτ */
  const DT = 1 / 60, TMAX = 125;
  function phaseTable(fn) {
    const n = Math.ceil(TMAX / DT) + 2, tab = new Float32Array(n);
    let acc = 0, prev = fn(St.state(0));
    for (let i = 1; i < n; i++) { const cur = fn(St.state(i * DT)); acc += (prev + cur) * 0.5 * DT; tab[i] = acc; prev = cur; }
    return (t) => { if (t <= 0) return t * fn(St.state(0)); const f = t / DT, i = Math.floor(f); if (i >= n - 1) return tab[n - 1] + (t - (n - 1) * DT); return L.lerp(tab[i], tab[i + 1], f - i); };
  }
  const _v = new THREE.Vector3();
  const P = {
    paddles: phaseTable((S) => S.run.paddles),
    scraper: phaseTable((S) => S.run.scraper * S.build.dec),
    thick: phaseTable((S) => S.build.sludge >= 1 ? 1 : 0),
    decFill: phaseTable((S) => S.water.dec),
    sludgeOut: phaseTable((S) => Math.min(1, S.run.sludgeOut)),
    /** a câmera está a menos de d metros do ponto p? (setas e detalhes só nos planos próximos) */
    near: (cam, p, d) => !!cam && cam.position.distanceTo(_v.set(p[0], p[1], p[2])) < d
  };
  const env = { L, THREE, Lo, St, K, ghost, root, shared, P };
  const parts = [buildArrival(env)];
  for (const b of [buildChem, buildFloc, buildDec]) { try { parts.push(b(env)); } catch (e) { console.warn('[eta1]', b.name, e.message, (e.stack || '').split('\n')[1]); } }
  L.shadows(root, true, true);
  root.traverse((o) => { if (o.isMesh && (o.material.transparent || o.userData.noCast)) o.castShadow = false; });
  const st = K.stats(root);
  console.warn(`[eta1] ${st.tris} triângulos, ${st.calls} draw calls (máximo, tudo visível)`);
  shared.eta1 = { stats: st };
  let logged = false;
  return {
    update(t, S, cam) { for (const p of parts) p.update(t, S, cam, P); if (!logged) { logged = true; const v = K.stats(root, true); console.warn(`[eta1] t=${t.toFixed(2)} visível: ${v.tris} triângulos, ${v.calls} draw calls`); root.children.forEach((c, i) => { const a = K.stats(c, true); const sub = c.children.map((d) => K.stats(d, true).calls + "/" + K.stats(d, true).tris).join(','); console.warn(`  [${i}] ${a.calls} calls ${a.tris} tris :: ${sub}`); }); } }
  };
}
