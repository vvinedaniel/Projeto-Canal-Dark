// SOLUÇÕES VERDES (etapa 17): jardins de chuva, pavimento permeável, parque linear/várzea e árvores novas;
// água entrando neles na tempestade com melhorias. Contrato em docs/MODULOS.md.
import { xrayList } from './green/kit.js';
import { buildGardens, GARDEN_WIN, GARDEN_PH } from './green/gardens.js';
import { buildPermeable, FRONT_WIN } from './green/permeable.js';
import { buildPark } from './green/park.js';

export function create(ctx) {
  const xr = xrayList();
  const parts = [buildGardens(ctx, xr), buildPermeable(ctx, xr), buildPark(ctx, xr)];
  const sub = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));
  const front = ctx.Lo.GARDENS.filter((g) => g.front);
  /** progresso da escavação dos furos da face que são meus (para os tampões do terreno): ids de terrain/holes.js */
  ctx.shared.greenHoleK = (id, S) => {
    const m = /^garden(\d+)$/.exec(id);
    if (m) { const g = front[+m[1]], [a, b] = GARDEN_WIN[g.id], L = b - a; return sub(S.build.gardens, a + GARDEN_PH.lift[0] * L, a + GARDEN_PH.liner[1] * L); }
    if (id === 'perm0') { const [a, b] = FRONT_WIN, L = b - a; return sub(S.build.permeable, a + 0.03 * L, a + 0.15 * L); }
    return null;
  };
  /** a calçada original (módulo cidade) pode sumir nestes retângulos assim que a obra começa: a partir daí eu desenho a tampa serrada */
  ctx.shared.greenWalkHidden = (id, S) => (id === 'perm0' ? S.build.permeable > FRONT_WIN[0] : S.build.gardens > GARDEN_WIN[id][0]);
  return {
    update(t, S, cam) {
      // na tela dividida, o lado 'before' (cidade sem melhorias) tem todas as obras em 0: nada aparece além da calçada original
      for (const p of parts) p.update(t, S, cam);
      xr.apply(S.xray || 0);
    }
  };
}
