// Câmera por quadros-chave em coordenadas da cidade (tiles i, j, altura z em px) com interpolação
// Catmull-Rom (velocidade contínua, sem paradas bruscas) e deriva suave para nunca ficar parada.
import { sx, sy } from '../engine/iso';
import type { Cam } from '../engine/renderer';

export interface Key { t: number; i: number; j: number; z?: number; zoom: number; hold?: boolean }

export function cameraAt(keys: Key[], t: number, drift = 1): Cam {
  const P = keys.map((k) => ({ t: k.t, x: sx(k.i, k.j), y: sy(k.i, k.j, k.z ?? 0), lz: Math.log(k.zoom), hold: k.hold }));
  let x: number, y: number, lz: number;
  if (t <= P[0].t) ({ x, y, lz } = P[0]);
  else if (t >= P[P.length - 1].t) ({ x, y, lz } = P[P.length - 1]);
  else {
    let k = 0;
    while (P[k + 1].t < t) k++;
    const a = P[k], b = P[k + 1];
    const pa = P[k - 1] ?? a, pb = P[k + 2] ?? b;
    const h = b.t - a.t;
    const u = (t - a.t) / h;
    const tan = (p0: typeof a, p1: typeof a, f: 'x' | 'y' | 'lz') => (p0 === p1 ? 0 : (p1[f] - p0[f]) / (p1.t - p0.t));
    const herm = (f: 'x' | 'y' | 'lz') => {
      const m0 = a.hold ? 0 : tan(pa, b, f) * h, m1 = b.hold ? 0 : tan(a, pb, f) * h;
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * a[f] + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * b[f] + (u3 - u2) * m1;
    };
    x = herm('x'); y = herm('y'); lz = herm('lz');
  }
  const zoom = Math.exp(lz);
  // deriva lenta (px de tela convertidos para mundo)
  const dx = (Math.sin(t * 0.37) * 6 + Math.sin(t * 0.91 + 1) * 3) * drift / zoom;
  const dy = (Math.sin(t * 0.29 + 2) * 5 + Math.sin(t * 0.73) * 2) * drift / zoom;
  return { x: x + dx, y: y + dy, zoom };
}

// mundo (px) -> tela (px de saída)
export const toScreen = (cam: Cam, wx: number, wy: number, W = 1080, H = 1920) => ({ x: (wx - cam.x) * cam.zoom + W / 2, y: (wy - cam.y) * cam.zoom + H / 2 });

// Planos com cortes: cada plano é uma lista de quadros-chave; o corte acontece no início do plano seguinte.
export function cameraCuts(shots: Key[][], t: number, drift = 1): Cam {
  let k = 0;
  while (k < shots.length - 1 && t >= shots[k + 1][0].t) k++;
  return cameraAt(shots[k], t, drift);
}
export const cutTimes = (shots: Key[][]) => shots.slice(1).map((s) => s[0].t);
