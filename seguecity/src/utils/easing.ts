export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (x: number) => { const t = clamp(x); return t * t * (3 - 2 * t); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x: number) => Math.pow(clamp(x), 3);
export const easeInOut = (x: number) => { const t = clamp(x); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = (x: number, s = 1.7) => { const t = clamp(x) - 1; return 1 + (s + 1) * t * t * t + s * t * t; };
// janela: 0 antes de a, sobe até 1 em a+inn, fica, desce até 0 em b
export const win = (t: number, a: number, b: number, inn = 0.25, out = 0.25) => Math.min(smooth((t - a) / inn), smooth((b - t) / out));
export const pulse = (t: number, f = 2) => 0.5 + 0.5 * Math.sin(t * Math.PI * 2 * f);
