// Identidade visual dos moradores: aparência modular, determinística e persistente.
// A aparência (strings, sem DOM) é gravada em data/residents.json pelo scripts/city.ts e reaproveitada em
// todos os episódios: o mesmo morador sempre tem o mesmo rosto, cabelo, corpo e uniforme.

export type HairStyle = 'curto' | 'longo' | 'cacheado' | 'coque' | 'careca' | 'black' | 'franja' | 'rabo';
export interface Appearance {
  pele: string;
  cabelo: { estilo: HairStyle; cor: string };
  corpo: 'magro' | 'medio' | 'forte';
  barba?: boolean;
  oculos?: boolean;
  olhos?: string;
  roupa: { camisa: string; calca: string; sapato: string; extra?: string };
}

export const PELES = ['#f6d3b3', '#eebd94', '#d9a273', '#c08457', '#9c6440', '#7a4a2e', '#5b3420'];
export const CABELOS = ['#1d1416', '#2e1d16', '#4a2d1c', '#6b3f22', '#9a6a3a', '#d8b25a', '#e8d2a0', '#8a8a92', '#b04a2a'];
const ESTILOS: HairStyle[] = ['curto', 'longo', 'cacheado', 'coque', 'careca', 'black', 'franja', 'rabo'];
const OLHOS = ['#2a1c14', '#3a2a1a', '#2a4a6a', '#3a5a2a'];
const CASUAL = ['#e25a4a', '#4a8ae2', '#f2c84a', '#5ab06a', '#f2f2f2', '#9a5ae2', '#f28a3a', '#3ac2c2', '#e26aa2', '#2a3a5a'];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function seedOf(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// uniforme por profissão (mesmas roupas de data/jobs.json)
export interface Uniform { camisa: string; calca: string; extra?: string }
export function appearanceFor(seed: number, uniform?: Uniform, opts: { barba?: boolean; estilo?: HairStyle } = {}): Appearance {
  const r = rng(seed);
  const p = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const estilo = opts.estilo ?? p(ESTILOS);
  return {
    pele: p(PELES),
    cabelo: { estilo, cor: estilo === 'careca' ? '#00000000' : p(CABELOS) },
    corpo: p(['magro', 'medio', 'medio', 'forte'] as const),
    barba: opts.barba ?? r() < 0.25,
    oculos: r() < 0.22,
    olhos: p(OLHOS),
    roupa: { camisa: uniform?.camisa ?? p(CASUAL), calca: uniform?.calca ?? p(['#2a3a6a', '#3a3a44', '#6a5a4a', '#1e2030', '#4a6a8a']), sapato: p(['#1a1a20', '#4a2a1a', '#e8e8f0']), extra: uniform?.extra },
  };
}
