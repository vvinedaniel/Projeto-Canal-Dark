// Personagens fictícios de DEMONSTRAÇÃO (sempre mostrados com o rótulo EXEMPLO). Não são pessoas reais
// nem seguidores: servem para mostrar como os moradores vão aparecer na cidade.
import { appearanceFor, seedOf, type Appearance } from '../engine/characters';
import { jobs } from './index';

export interface Exemplo { id: string; nome: string; profissao: string; titulo: string; casa: string; aparencia: Appearance }
const mk = (id: string, nome: string, profissao: string, titulo: string, casa: string, opts: Parameters<typeof appearanceFor>[2] = {}): Exemplo => {
  const j = jobs.find((x) => x.id === profissao)!;
  return { id, nome, profissao, titulo, casa, aparencia: appearanceFor(seedOf(`exemplo:${id}`), j.roupa, opts) };
};
export const EXEMPLOS: Exemplo[] = [
  mk('ex-ana', 'Ana', 'medico', 'Médica', 'casa-02', { barba: false, estilo: 'coque' }),
  mk('ex-rafael', 'Rafael', 'mecanico', 'Mecânico', 'casa-03', { estilo: 'curto' }),
  mk('ex-julia', 'Júlia', 'professor', 'Professora', 'casa-10', { barba: false, estilo: 'longo' }),
  mk('ex-bruno', 'Bruno', 'policial', 'Policial', 'casa-18', { estilo: 'careca' }),
];
export const jobName = (id: string) => jobs.find((j) => j.id === id)?.nome ?? id;
