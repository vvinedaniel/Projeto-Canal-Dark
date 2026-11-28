// Ordenação isométrica por dependência (quem está atrás é desenhado antes), só entre objetos que se sobrepõem na tela.
import type { Obj } from './types';

const E = 1e-6;
export function behind(a: Obj, b: Obj): boolean {
  if (a.fp[2] <= b.fp[0] + E) return true;
  if (a.fp[3] <= b.fp[1] + E) return true;
  if (b.fp[2] <= a.fp[0] + E) return false;
  if (b.fp[3] <= a.fp[1] + E) return false;
  return a.fp[0] + a.fp[2] + a.fp[1] + a.fp[3] < b.fp[0] + b.fp[2] + b.fp[1] + b.fp[3];
}

export interface Placed { o: Obj; x0: number; y0: number; x1: number; y1: number }

export function depthSort(list: Placed[]): Placed[] {
  const n = list.length;
  const out: Placed[] = [];
  const state = new Uint8Array(n);
  // pré-ordenação por soma das coordenadas para estabilidade
  const idx = [...Array(n).keys()].sort((a, b) => {
    const A = list[a].o.fp, B = list[b].o.fp;
    return A[0] + A[1] + A[2] + A[3] - (B[0] + B[1] + B[2] + B[3]);
  });
  const visit = (k: number) => {
    if (state[k]) return;
    state[k] = 1;
    const a = list[k];
    for (const m of idx) {
      if (m === k || state[m] === 2) continue;
      const b = list[m];
      if (b.x1 <= a.x0 || b.x0 >= a.x1 || b.y1 <= a.y0 || b.y0 >= a.y1) continue;
      if (state[m] === 0 && behind(b.o, a.o)) visit(m);
    }
    state[k] = 2;
    out.push(a);
  };
  for (const k of idx) visit(k);
  return out;
}
