// Estado da cidade no Dia 02 a partir dos dados reais (data/residents.json): casas dos fundadores acesas,
// serviços com funcionário abertos, os 10 fundadores andando perto de casa/trabalho, frota mínima e as duas
// obras planejadas (cemitério e advocacia) como planta holográfica. Nada de pedestres aleatórios: só existem
// os moradores cadastrados.
import type { Obj } from '../../engine/types';
import { personObj } from '../../engine/dynamics';
import { lookOf, type Pose } from '../../engine/sprites/people';
import { buildings, jobs, residents, type Resident } from '../../data';

export const FUNDADORES: Resident[] = residents.filter((r) => r.fundador && !r.ficticio).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
export const fundador = (nome: string) => FUNDADORES.find((r) => r.nome === nome)!;
export const CASAS_OCUPADAS = new Set(FUNDADORES.map((r) => r.casa!));
// serviços abertos = prédios com pelo menos um morador trabalhando e que já existem
export const ABERTOS = new Set(FUNDADORES.map((r) => r.trabalho!).filter((id) => buildings.some((b) => b.id === id && b.status !== 'planejado')));
export const PLANEJADOS_DIA02 = ['cemiterio', 'futuro-3'];
// frota do Dia 02: viatura (há policial) + 3 carros + 1 moto; sem ônibus, táxi ou bombeiros (ninguém nessas profissões)
export const FROTA_DIA02 = ['C0', 'A0', 'Cr0', 'E1', 'Br1'];
const CIVICOS = buildings.filter((b) => !['casa', 'apartamento'].includes(b.tipo) && b.status !== 'planejado').map((b) => b.id);

// trajeto a pé de cada fundador (vai e volta numa calçada perto de casa ou do trabalho)
interface Rota { a: [number, number]; b: [number, number]; v: number; fase: number; pose?: Pose }
export const ROTAS: Record<string, Rota> = {
  Mateus: { a: [16.3, 9.83], b: [19.6, 9.83], v: 0.42, fase: 0.1 },
  Mari: { a: [19.5, 9.83], b: [16.4, 9.83], v: 0.38, fase: 0.55 },
  Davi: { a: [4.3, 23.83], b: [6.7, 23.83], v: 0.4, fase: 0.3 },
  Gabriel: { a: [7.35, 23.83], b: [7.35, 23.83], v: 0, fase: 0, pose: 'work' },
  Juan: { a: [8.55, 23.83], b: [8.55, 23.83], v: 0, fase: 0.5, pose: 'work' },
  Roberto: { a: [29.7, 30.55], b: [29.7, 30.55], v: 0, fase: 0, pose: 'work' },
  Alicia: { a: [8.83, 11.3], b: [8.83, 13.7], v: 0.36, fase: 0.2 },
  Gabrielly: { a: [16.3, 23.83], b: [19.6, 23.83], v: 0.4, fase: 0.7 },
  Jorge: { a: [19.83, 11.3], b: [19.83, 13.6], v: 0.3, fase: 0.4 },
  Muri: { a: [8.83, 13.7], b: [8.83, 11.3], v: 0.34, fase: 0.85 },
};

export function andando(r: Resident, t: number, scaleUp = 1, lit = 0.6): Obj {
  const ro = ROTAS[r.nome];
  const L = Math.hypot(ro.b[0] - ro.a[0], ro.b[1] - ro.a[1]);
  let i = ro.a[0], j = ro.a[1], dir = 0, fr = Math.floor(t * 2.5) % 4, pose: Pose = ro.pose ?? 'idle';
  if (L > 0.01 && ro.v > 0) {
    // vai e volta: posição em [0, 2L)
    const s = (((t * ro.v + ro.fase * 2 * L) % (2 * L)) + 2 * L) % (2 * L);
    const f = s < L ? s / L : 2 - s / L;
    const ida = s < L;
    i = ro.a[0] + (ro.b[0] - ro.a[0]) * f; j = ro.a[1] + (ro.b[1] - ro.a[1]) * f;
    const di = (ro.b[0] - ro.a[0]) * (ida ? 1 : -1), dj = (ro.b[1] - ro.a[1]) * (ida ? 1 : -1);
    dir = Math.abs(di) > Math.abs(dj) ? (di > 0 ? 0 : 2) : dj > 0 ? 1 : 3;
    fr = Math.floor(t * 4.2) % 4; pose = 'walk';
  }
  return personObj(`fund-${r.id}`, lookOf(r.aparencia!), `fund-${r.id}`, i, j, dir, fr, scaleUp, lit, pose);
}

export function estadoDia02(t: number, opts: { fundadores?: boolean; planta?: number; servicos?: number } = {}) {
  const extra: Obj[] = opts.fundadores === false ? [] : FUNDADORES.map((r) => andando(r, t));
  const overrides: Record<string, { lit?: number; ghost?: number; alpha?: number }> = {};
  CASAS_OCUPADAS.forEach((id) => { overrides[id] = { lit: 1 }; });
  const sv = opts.servicos ?? 1;
  CIVICOS.forEach((id) => { overrides[id] = { lit: ABERTOS.has(id) ? 1 : 1 - 0.7 * sv }; });
  const reveal = new Set<string>();
  const planta = opts.planta ?? 1;
  if (planta > 0) PLANEJADOS_DIA02.forEach((id) => { reveal.add(id); overrides[id] = { ghost: planta, alpha: 0.85 }; });
  return { extra, overrides, reveal, vehicles: FROTA_DIA02, homeFrac: 0, people: 0 };
}

export const nomeTrabalho = (r: Resident) => buildings.find((b) => b.id === r.trabalho)?.nome ?? r.trabalho ?? '';
// número pintado na fachada (o mesmo do Ep. 01: casa-01 = Casa 12)
export const casaNumero = (r: Resident) => String(10 + Number((r.casa ?? '').replace(/\D/g, '')) * 2);
export const jobNome = (id: string) => jobs.find((j) => j.id === id)?.nome ?? id;
