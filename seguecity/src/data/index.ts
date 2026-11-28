// Dados da cidade (persistência local em /data). Editados à mão ou pelos scripts em /scripts.
import buildingsJson from '../../data/buildings.json';
import jobsJson from '../../data/jobs.json';
import cityJson from '../../data/city-state.json';
import residentsJson from '../../data/residents.json';
import episodesJson from '../../data/episodes.json';
import mapaJson from '../../data/mapa.json';

export type Status = 'pronto' | 'planejado' | 'em_obra';
export interface Building {
  id: string; nome: string; tipo: string;
  posicao: { i: number; j: number }; tamanho: { w: number; d: number };
  status: Status; andares?: number; destaque?: boolean; placa?: string; cor?: string; toldo?: string;
  frente?: 'i+' | 'j+' | 'i-' | 'j-'; bairro?: string; moradores?: number; letreiro?: boolean;
}
export interface Job { id: string; nome: string; predio: string; vagas: number; ocupadas: number; roupa: { camisa: string; calca: string; extra?: string; eleicao?: boolean } }
export interface Resident { id: string; nome: string; profissao: string; bairro: string; casa?: string; entrada: string; ficticio?: boolean; episodio?: number }
export interface CityState {
  nome: string; slogan: string; dia: number; moradores: number;
  empregos: { total: number; ocupados: number }; casas: { total: number; ocupadas: number };
  status: string; evolucao: { nivel: number; nome: string; proximaMeta: string };
  metas: { id: string; nome: string; alvo: number; concluida: boolean }[]; atualizadoEm: string;
}
export interface Episode { episodio: number; id: string; titulo: string; duracao: number; data: string; resumo: string; status: string; estado: { moradores: number; empregos: number } }

export const buildings = buildingsJson as Building[];
export const jobs = jobsJson as Job[];
export const city = cityJson as CityState;
export const residents = residentsJson as Resident[];
export const episodes = episodesJson as Episode[];
export const mapa = mapaJson as { linhas: string[]; legenda: Record<string, string> };

export const buildingById = (id: string) => buildings.find((b) => b.id === id);
export const jobsAt = (predio: string) => jobs.filter((j) => j.predio === predio);
export const totalVagas = jobs.reduce((s, j) => s + j.vagas, 0);
