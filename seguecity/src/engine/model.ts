// Rasterizador de sólidos isométricos por raio de pixel + z-buffer.
// Cada primitiva sabe dizer, para o raio de um pixel, o ponto visível mais próximo da câmera (maior i).
// Os shaders recebem coordenadas locais da face (u ao longo da face em tiles, v em px) e devolvem cor e emissão.
import { rayA, rayB, sx, sy } from './iso';
import { PB, maskOf } from './pixel';
import { scale, type U32 } from './color';

export interface Hit {
  t: number; i: number; j: number; z: number;
  face: string; u: number; v: number;
  nx: number; ny: number; nz: number;
}
export interface ShadeOut { c: U32; e: U32 }
export type Shader = (h: Hit, px: number, py: number, o: ShadeOut) => void;

export interface Prim {
  bbox(): [number, number, number, number];
  hit(A: number, B: number, h: Hit): boolean;
  shade: Shader;
}

const setHit = (h: Hit, t: number, i: number, j: number, z: number, face: string, u: number, v: number, nx: number, ny: number, nz: number) => {
  h.t = t; h.i = i; h.j = j; h.z = z; h.face = face; h.u = u; h.v = v; h.nx = nx; h.ny = ny; h.nz = nz;
};

// Brilho difuso padrão (luz vinda do alto à esquerda): topo 0.88, face +j 0.66, face +i 0.44.
export const light = (nx: number, ny: number, nz: number) => 0.5 - 0.06 * nx + 0.16 * ny + 0.38 * nz;

export class Box implements Prim {
  constructor(
    public i0: number, public j0: number, public z0: number,
    public i1: number, public j1: number, public z1: number,
    public shade: Shader, public faces = 'TLR',
  ) {}
  bbox(): [number, number, number, number] {
    return [Math.floor(sx(this.i0, this.j1)) - 1, Math.floor(sy(this.i0, this.j0, this.z1)) - 1, Math.ceil(sx(this.i1, this.j0)) + 1, Math.ceil(sy(this.i1, this.j1, this.z0)) + 1];
  }
  hit(A: number, B: number, h: Hit) {
    const { i0, j0, z0, i1, j1, z1, faces } = this;
    let best = -1e9;
    if (faces.includes('T')) {
      const i = (z1 + 8 * A + B) / 16, j = i - A;
      if (i >= i0 && i < i1 && j >= j0 && j < j1) { best = i; setHit(h, i, i, j, z1, 'T', i - i0, j - j0, 0, 0, 1); }
    }
    if (faces.includes('L')) {
      const i = j1 + A, z = 16 * i - 8 * A - B;
      if (i >= i0 && i < i1 && z >= z0 && z < z1 && i > best) { best = i; setHit(h, i, i, j1, z, 'L', i - i0, z - z0, 0, 1, 0); }
    }
    if (faces.includes('R')) {
      const j = i1 - A, z = 16 * i1 - 8 * A - B;
      if (j >= j0 && j < j1 && z >= z0 && z < z1 && i1 > best) { best = i1; setHit(h, i1, i1, j, z, 'R', j1 - j, z - z0, 1, 0, 0); }
    }
    return best > -1e9;
  }
}

// Telhado de duas águas com cumeeira paralela ao eixo i (empena visível na face +i).
export class GableI implements Prim {
  constructor(
    public i0: number, public j0: number, public i1: number, public j1: number,
    public z0: number, public rh: number, public shade: Shader, public endFace = true,
  ) {}
  bbox(): [number, number, number, number] {
    return [Math.floor(sx(this.i0, this.j1)) - 1, Math.floor(sy(this.i0, this.j0, this.z0 + this.rh)) - 2, Math.ceil(sx(this.i1, this.j0)) + 1, Math.ceil(sy(this.i1, this.j1, this.z0)) + 1];
  }
  hit(A: number, B: number, h: Hit) {
    const { i0, j0, i1, j1, z0, rh } = this;
    const hj = (j1 - j0) / 2, jm = j0 + hj, k = rh / hj;
    let best = -1e9;
    let i = (z0 + k * (j1 + A) + 8 * A + B) / (16 + k), j = i - A;
    if (i >= i0 && i < i1 && j >= jm && j < j1) { best = i; const n = Math.hypot(k / 16, 1); setHit(h, i, i, j, 16 * i - 8 * A - B, 'RF', i - i0, (j1 - j) / hj, 0, k / 16 / n, 1 / n); }
    const den = 16 - k;
    if (den > 0.05) {
      i = (z0 + 8 * A + B - k * (A + j0)) / den; j = i - A;
      if (i >= i0 && i < i1 && j >= j0 && j < jm && i > best) { best = i; const n = Math.hypot(k / 16, 1); setHit(h, i, i, j, 16 * i - 8 * A - B, 'RB', i - i0, (j - j0) / hj, 0, -k / 16 / n, 1 / n); }
    }
    if (this.endFace) {
      j = i1 - A; const z = 16 * i1 - 8 * A - B; const rz = z0 + k * (hj - Math.abs(j - jm));
      if (j >= j0 && j < j1 && z >= z0 && z < rz && i1 > best) { best = i1; setHit(h, i1, i1, j, z, 'GE', j1 - j, z - z0, 1, 0, 0); }
    }
    return best > -1e9;
  }
}

// Telhado de duas águas com cumeeira paralela ao eixo j (empena visível na face +j).
export class GableJ implements Prim {
  constructor(
    public i0: number, public j0: number, public i1: number, public j1: number,
    public z0: number, public rh: number, public shade: Shader, public endFace = true,
  ) {}
  bbox(): [number, number, number, number] {
    return [Math.floor(sx(this.i0, this.j1)) - 1, Math.floor(sy(this.i0, this.j0, this.z0 + this.rh)) - 2, Math.ceil(sx(this.i1, this.j0)) + 1, Math.ceil(sy(this.i1, this.j1, this.z0)) + 1];
  }
  hit(A: number, B: number, h: Hit) {
    const { i0, j0, i1, j1, z0, rh } = this;
    const hi = (i1 - i0) / 2, im = i0 + hi, k = rh / hi;
    let best = -1e9;
    let i = (z0 + k * i1 + 8 * A + B) / (16 + k), j = i - A;
    if (i >= im && i < i1 && j >= j0 && j < j1) { best = i; const n = Math.hypot(k / 16, 1); setHit(h, i, i, j, 16 * i - 8 * A - B, 'RF', j1 - j, (i1 - i) / hi, k / 16 / n, 0, 1 / n); }
    const den = 16 - k;
    if (den > 0.05) {
      i = (z0 - k * i0 + 8 * A + B) / den; j = i - A;
      if (i >= i0 && i < im && j >= j0 && j < j1 && i > best) { best = i; const n = Math.hypot(k / 16, 1); setHit(h, i, i, j, 16 * i - 8 * A - B, 'RB', j1 - j, (i - i0) / hi, -k / 16 / n, 0, 1 / n); }
    }
    if (this.endFace) {
      i = j1 + A; const z = 16 * i - 8 * A - B; const rz = z0 + k * (hi - Math.abs(i - im));
      if (i >= i0 && i < i1 && z >= z0 && z < rz && i > best) { best = i; setHit(h, i, i, j1, z, 'GE', i - i0, z - z0, 0, 1, 0); }
    }
    return best > -1e9;
  }
}

// Cilindro vertical (centro ci,cj; raio r em tiles).
export class Cyl implements Prim {
  constructor(
    public ci: number, public cj: number, public r: number, public z0: number, public z1: number,
    public shade: Shader, public cap = true,
  ) {}
  bbox(): [number, number, number, number] {
    const x = sx(this.ci, this.cj), e = this.r * 22.7 + 2;
    return [Math.floor(x - e), Math.floor(sy(this.ci, this.cj, this.z1) - this.r * 11.4) - 2, Math.ceil(x + e), Math.ceil(sy(this.ci, this.cj, this.z0) + this.r * 11.4) + 2];
  }
  hit(A: number, B: number, h: Hit) {
    const { ci, cj, r, z0, z1 } = this;
    let best = -1e9;
    if (this.cap) {
      const i = (z1 + 8 * A + B) / 16, j = i - A;
      const di = i - ci, dj = j - cj;
      if (di * di + dj * dj < r * r) { best = i; setHit(h, i, i, j, z1, 'T', di / r, dj / r, 0, 0, 1); }
    }
    const S = ci + A + cj;
    const D = S * S - 2 * (ci * ci + (A + cj) * (A + cj) - r * r);
    if (D >= 0) {
      const i = (S + Math.sqrt(D)) / 2, j = i - A, z = 16 * i - 8 * A - B;
      if (z >= z0 && z < z1 && i > best) {
        best = i;
        const nx = (i - ci) / r, ny = (j - cj) / r;
        setHit(h, i, i, j, z, 'C', Math.atan2(ny, nx), z - z0, nx, ny, 0);
      }
    }
    return best > -1e9;
  }
}

// Esfera/cúpula (z em px; a esfera usa 16 px = 1 tile). zmin corta a parte de baixo.
export class Dome implements Prim {
  constructor(
    public ci: number, public cj: number, public cz: number, public r: number,
    public shade: Shader, public zmin = -1e9,
  ) {}
  bbox(): [number, number, number, number] {
    const x = sx(this.ci, this.cj), y = sy(this.ci, this.cj, this.cz), e = this.r * 22.7 + 2;
    return [Math.floor(x - e), Math.floor(y - this.r * 16 - 2), Math.ceil(x + e), Math.ceil(y + this.r * 16 + 2)];
  }
  hit(A: number, B: number, h: Hit) {
    const { ci, cj, cz, r } = this;
    const K = (8 * A + B + cz) / 16;
    const S = ci + A + cj + K;
    const D = S * S - 3 * (ci * ci + (A + cj) * (A + cj) + K * K - r * r);
    if (D < 0) return false;
    const i = (S + Math.sqrt(D)) / 3, j = i - A, z = 16 * i - 8 * A - B;
    if (z < this.zmin) return false;
    const nx = (i - ci) / r, ny = (j - cj) / r, nz = (z - cz) / 16 / r;
    setHit(h, i, i, j, z, 'S', nx, nz, nx, ny, nz);
    return true;
  }
}

// Polígono plano convexo qualquer (vértices em i, j, z).
export class Poly implements Prim {
  pts: [number, number][];
  n: [number, number, number];
  p0: [number, number, number];
  constructor(public verts: [number, number, number][], public shade: Shader, public face = 'P') {
    this.pts = verts.map(([i, j, z]) => [sx(i, j), sy(i, j, z)]);
    const [a, b, c] = verts;
    const e1 = [b[0] - a[0], b[1] - a[1], (b[2] - a[2]) / 16];
    const e2 = [c[0] - a[0], c[1] - a[1], (c[2] - a[2]) / 16];
    let n: [number, number, number] = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    const L = Math.hypot(...n) || 1;
    n = [n[0] / L, n[1] / L, n[2] / L];
    // normal sempre virada para a câmera (+i, +j, +z)
    if (n[0] + n[1] + n[2] < 0) n = [-n[0], -n[1], -n[2]];
    this.n = n;
    this.p0 = [a[0], a[1], a[2] / 16];
  }
  bbox(): [number, number, number, number] {
    const xs = this.pts.map((p) => p[0]), ys = this.pts.map((p) => p[1]);
    return [Math.floor(Math.min(...xs)) - 1, Math.floor(Math.min(...ys)) - 1, Math.ceil(Math.max(...xs)) + 1, Math.ceil(Math.max(...ys)) + 1];
  }
  hit(A: number, B: number, h: Hit) {
    const px = A * 16 + (this.pts.length ? 0 : 0);
    // centro do pixel em tela (reconstruído a partir de A e B não é necessário: usamos A/B direto no teste do plano)
    const [ni, nj, nz] = this.n;
    const den = ni + nj + nz;
    if (Math.abs(den) < 1e-4) return false;
    const [pi, pj, pz] = this.p0;
    const t = (ni * pi + nj * (A + pj) + nz * ((8 * A + B) / 16 + pz)) / den;
    const i = t, j = t - A, z = 16 * t - 8 * A - B;
    // teste de contenção em tela
    const X = sx(i, j), Y = sy(i, j, z);
    let inside = false;
    const P = this.pts;
    for (let a = 0, b = P.length - 1; a < P.length; b = a++) {
      const [xa, ya] = P[a], [xb, yb] = P[b];
      if ((ya > Y) !== (yb > Y) && X < ((xb - xa) * (Y - ya)) / (yb - ya) + xa) inside = !inside;
    }
    if (!inside) return false;
    void px;
    setHit(h, t, i, j, z, this.face, 0, 0, ni, nj, nz);
    return true;
  }
}

export interface Sprite {
  ox: number; oy: number; w: number; h: number;
  img: OffscreenCanvas; mask: OffscreenCanvas; glow: OffscreenCanvas | null;
}

export interface RenderOpts { edge?: boolean; edgeDark?: number; rim?: number }

export class Model {
  prims: Prim[] = [];
  add<T extends Prim>(p: T): T { this.prims.push(p); return p; }
  box(i0: number, j0: number, z0: number, i1: number, j1: number, z1: number, s: Shader, faces = 'TLR') {
    return this.add(new Box(i0, j0, z0, i1, j1, z1, s, faces));
  }
  bounds(): [number, number, number, number] {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of this.prims) {
      const [a, b, c, d] = p.bbox();
      x0 = Math.min(x0, a); y0 = Math.min(y0, b); x1 = Math.max(x1, c); y1 = Math.max(y1, d);
    }
    return [x0, y0, x1, y1];
  }
  rasterize(): { alb: PB; emi: PB; depth: Float32Array; any: boolean } {
    const [x0, y0, x1, y1] = this.bounds();
    const w = x1 - x0, h = y1 - y0;
    const alb = new PB(w, h, x0, y0), emi = new PB(w, h, x0, y0);
    const depth = new Float32Array(w * h).fill(-1e9);
    const hit: Hit = { t: 0, i: 0, j: 0, z: 0, face: '', u: 0, v: 0, nx: 0, ny: 0, nz: 0 };
    const o: ShadeOut = { c: 0, e: 0 };
    let any = false;
    for (const p of this.prims) {
      const [bx0, by0, bx1, by1] = p.bbox();
      for (let py = Math.max(by0, y0); py < Math.min(by1, y1); py++) {
        const B = rayB(py);
        for (let px = Math.max(bx0, x0); px < Math.min(bx1, x1); px++) {
          if (!p.hit(rayA(px), B, hit)) continue;
          const idx = (py - y0) * w + (px - x0);
          if (hit.t <= depth[idx]) continue;
          o.c = 0; o.e = 0;
          p.shade(hit, px, py, o);
          if (o.c >>> 24 === 0) continue;
          depth[idx] = hit.t;
          alb.data[idx] = o.c;
          emi.data[idx] = o.e;
          if (o.e) any = true;
        }
      }
    }
    return { alb, emi, depth, any };
  }
  render(opts: RenderOpts = {}): Sprite {
    const { alb, emi, any } = this.rasterize();
    if (opts.edge !== false) edgePass(alb, opts.edgeDark ?? 0.72, opts.rim ?? 1.1);
    return toSprite(alb, any ? emi : null);
  }
}

// Contorno seletivo: escurece pixels na borda da silhueta (lados e base) e realça a borda de cima.
export function edgePass(pb: PB, dark = 0.72, rim = 1.1) {
  const { w, h, data } = pb;
  const src = data.slice();
  const op = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] >>> 24 > 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = y * w + x;
      if (!(src[k] >>> 24)) continue;
      if (!op(x - 1, y) || !op(x + 1, y) || !op(x, y + 1)) data[k] = scale(src[k], dark);
      else if (!op(x, y - 1)) data[k] = scale(src[k], rim);
    }
}

export function toSprite(alb: PB, emi: PB | null): Sprite {
  const img = alb.toCanvas();
  return { ox: alb.ox, oy: alb.oy, w: alb.w, h: alb.h, img, mask: maskOf(img), glow: emi ? emi.toCanvas() : null };
}
