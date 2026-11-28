// Dados da cidade (persistência local em /data). Editados à mão ou pelos scripts em /scripts.
import buildingsJson from '../../data/buildings.json';
import jobsJson from '../../data/jobs.json';
import cityJson from '../../data/city-state.json';
import residentsJson from '../../data/residents.json';
import episodesJson from '../../data/episodes.json';
import mapaJson from '../../data/mapa.json';
import pendingJson from '../../data/pending-residents.json';

export type Status = 'pronto' | 'planejado' | 'em_obra';
export interface Building {
  id: string; nome: string; tipo: string;
  posicao: { i: number; j: number }; tamanho: { w: number; d: number };
  status: Status; andares?: number; destaque?: boolean; placa?: string; cor?: string; toldo?: string;
  frente?: 'i+' | 'j+' | 'i-' | 'j-'; bairro?: string; moradores?: number; letreiro?: boolean;
}
export interface Job { id: string; nome: string; predio: string; vagas: number; ocupadas: number; roupa: { camisa: string; calca: string; extra?: string; eleicao?: boolean } }
import type { Appearance } from '../engine/characters';
export interface Resident {
  id: string; nome: string; profissao: string; bairro: string; casa?: string; entrada: string; ficticio?: boolean; episodio?: number; aparencia?: Appearance;
  titulo?: string; // profissão exatamente como a pessoa comentou (ex.: "Neurocirurgiã")
  trabalho?: string; // id do prédio onde trabalha (de jobs.json → predio)
  fundador?: boolean; titulos?: string[]; distintivo?: string; // os 10 primeiros: MORADOR FUNDADOR + distintivo dourado
  ordem?: number; ordemConfirmada?: boolean; fonte?: string; // ordem de chegada (só confirmada quando o TikTok mostra)
  numero?: number; // número permanente do morador (1–10 fundadores)
  categoria?: 'FUNDADOR' | 'PIONEIRO' | 'CIDADÃO'; // 1–10 · 11–100 · 101+
  tiktok_username?: string; // identificação interna (dado pessoal: nunca aparece no vídeo)
  confirmadoParaDia?: number;
  historicoProfissoes?: { data: string; campo: string; de: string | null; para: string; fonte: string }[];
}
export interface CityState {
  nome: string; slogan: string; dia: number; moradores: number;
  empregos: { total: number; ocupados: number }; casas: { total: number; ocupadas: number };
  status: string; evolucao: { nivel: number; nome: string; proximaMeta: string };
  metas: { id: string; nome: string; alvo: number; concluida: boolean; base?: 'moradores' | 'seguidores' }[]; atualizadoEm: string;
  seguidores?: { valor: number | null; fonte: string; atualizadoEm: string | null }; // contador do TikTok, separado dos moradores
  conquistas?: { id: string; nome: string; dia: number; data: string }[];
}
export interface Episode {
  episodio: number; id: string; titulo: string; duracao: number; data: string | null; resumo: string; status: string; estado: { moradores: number; empregos: number; vagas?: { total: number; ocupadas: number; livres: number; disponiveis?: number; emPredioPlanejado?: number; dependemDaEleicao?: number }; seguidoresEm?: string; metaEleicao?: { atual: number; alvo: number }; casas?: { total: number; ocupadas: number; livres: number }; servicosAbertos?: number; seguidores?: number | null };
  lista?: { encerrada: boolean; moradores: string[]; encerradaEm: string }; // elenco fechado do episódio (não muda depois)
}
// fila de entrada (data/pending-residents.json): comentários reais aguardando virar moradores — ver scripts/fila.ts
export interface PendingResident {
  id: string; nome: string; profissao: string; profissaoId: string | null; dataSolicitacao: string;
  status: 'pendente' | 'agendado' | 'aguardando-moradia' | 'aguardando-profissao' | 'incorporado' | 'recusado'; episodioPrevisto: string | null;
  fonte: string; tiktok_username?: string; comentarioId?: string; homonimo?: boolean; registradoEm: string; motivo?: string; aviso?: string; moradorId?: string; incorporadoEm?: string;
  historico?: { data: string; campo: string; de: string | null; para: string; fonte: string }[];
}

export const buildings = buildingsJson as Building[];
export const jobs = jobsJson as Job[];
export const city = cityJson as CityState;
export const residents = residentsJson as Resident[];
export const episodes = episodesJson as Episode[];
export const fila = pendingJson as { regras: { capacidadePorEpisodio: number; capacidadePorEpisodioEspecifica?: Record<string, number>; alertaExpansao?: number; moradia: string; ordem: string }; proximoId: number; pendentes: PendingResident[] };
export const elencoDo = (ep: string) => (episodes.find((e) => e.id === ep)?.lista?.moradores ?? []).map((id) => residents.find((r) => r.id === id)!).filter(Boolean);
export const mapa = mapaJson as { linhas: string[]; legenda: Record<string, string> };

export const buildingById = (id: string) => buildings.find((b) => b.id === id);
export const jobsAt = (predio: string) => jobs.filter((j) => j.predio === predio);
export const totalVagas = jobs.reduce((s, j) => s + j.vagas, 0);
