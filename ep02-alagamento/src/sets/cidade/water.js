// MÓDULO ÁGUA — chuva (gotas, respingos, anéis, véu), lâmina na rua e alagamento (superfície + face no corte),
// enxurrada nas sarjetas, água dos telhados, escoamento natural na encosta, poças e pingos.
// Tudo é função pura de (t, S): a intensidade vem de S.rain, o nível de S.flood, o escoamento de S.runoff*.
import { buildHM } from './water/hmap.js';
import { makeRain } from './water/rain.js';
import { makeFlood } from './water/flood.js';
import { makeStreet } from './water/street.js';
import { makeNatural } from './water/natural.js';
import { makeProxy } from './water/_proxy.js';

export function create(ctx) {
  const { q } = ctx;
  const mods = q && q.get('mods') ? q.get('mods').split(',') : null;
  const proxy = mods && (!mods.includes('terrain') || !mods.includes('city')) ? makeProxy(ctx, { ground: !mods.includes('terrain'), city: !mods.includes('city') }) : null; // só em teste isolado
  const hm = buildHM(ctx.Lo, ctx.shared);
  ctx.shared.waterHM = hm; // (outros módulos podem ler alturas/máscara se precisarem)
  const parts = [makeFlood(ctx, hm), makeStreet(ctx, hm), makeNatural(ctx, hm), makeRain(ctx, hm)];
  return {
    update(t, S, cam) {
      if (proxy) proxy.update(t, S);
      for (const p of parts) p.update(t, S, cam);
    }
  };
}
