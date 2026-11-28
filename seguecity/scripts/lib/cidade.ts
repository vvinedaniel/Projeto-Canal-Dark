// Núcleo da administração da cidade (persistência JSON em data/): moradores, fila de entrada, fundadores e
// episódios. Usado por scripts/city.ts e scripts/fila.ts. Regras que valem sempre:
//   - nenhum morador ou comentário é criado sem dados informados pelo operador (nome + profissão do comentário);
//   - os 10 fundadores formam uma lista FECHADA: o título e o distintivo deles são permanentes e exclusivos;
//   - episódio em produção ou com lista encerrada nunca recebe nem perde moradores.
// SEGUECITY_DATA=<pasta> troca a pasta de dados (usado nos testes, para não tocar nos dados reais).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './env';
import { appearanceFor, seedOf } from '../../src/engine/characters';

export const DATA = process.env.SEGUECITY_DATA ? path.resolve(process.env.SEGUECITY_DATA) : path.join(ROOT, 'data');
const D = (f: string) => path.join(DATA, f);
const load = (f: string) => JSON.parse(readFileSync(D(f), 'utf8'));
const save = (f: string, v: unknown) => writeFileSync(D(f), JSON.stringify(v, null, 2) + '\n');
export const today = () => new Date().toISOString().slice(0, 10);

export type StatusPendente = 'pendente' | 'agendado' | 'aguardando-moradia' | 'incorporado' | 'recusado';
export interface Pendente {
  id: string; // f0001, f0002… (único, nunca reaproveitado)
  nome: string; // nome do personagem, como comentado
  profissao: string; // profissão exatamente como comentada (ex.: "Neurocirurgiã")
  profissaoId: string | null; // id em jobs.json, ou null se a profissão ainda não existe no sistema
  dataSolicitacao: string; // AAAA-MM-DD do comentário
  status: StatusPendente;
  episodioPrevisto: string | null; // ex.: "ep03"; null enquanto não houver capacidade
  fonte: string; // "comentário no TikTok"
  comentarioId?: string; // referência opcional do comentário (id/link), para barrar duplicados com certeza
  homonimo?: boolean; // mesmo nome de alguém já cadastrado, confirmado como outra pessoa
  registradoEm: string;
  motivo?: string; // recusa ou espera
  aviso?: string; // informativo (não bloqueia): ex.: vagas da profissão já esgotadas
  moradorId?: string; // quando incorporado
  incorporadoEm?: string;
}
export interface Fila { regras: { capacidadePorEpisodio: number; moradia: string; ordem: string }; proximoId: number; pendentes: Pendente[] }

export function abrir() {
  const db = {
    city: load('city-state.json'), residents: load('residents.json') as any[], jobs: load('jobs.json') as any[],
    buildings: load('buildings.json') as any[], episodes: load('episodes.json') as any[],
    fila: (existsSync(D('pending-residents.json')) ? load('pending-residents.json') : null) as Fila | null,
  };
  return db;
}
export type DB = ReturnType<typeof abrir>;

// ---------------- normalização, profissões e duplicados ----------------
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// "Médico(a)" → médico, médica · "Neurocirurgião(ã)" → neurocirurgião, neurocirurgiã · "Servidor(a) público" → servidor público…
function formas(nome: string): string[] {
  const base = nome.replace(/\((a|ã)\)/g, '').replace(/\s+/g, ' ').trim();
  const fem = nome.replace(/ão\(ã\)/g, 'ã').replace(/o\(a\)/g, 'a').replace(/r\(a\)/g, 'ra').replace(/\(a\)/g, 'a');
  return [...new Set([base, fem, nome])].map(norm);
}
export function profissaoPorTexto(db: DB, texto: string): string | null {
  const t = norm(texto);
  const j = db.jobs.find((x) => x.id === t || formas(x.nome).includes(t));
  return j?.id ?? null;
}
const chave = (nome: string, prof: string) => `${norm(nome)}|${norm(prof)}`;

// ---------------- fundadores (lista fechada) e contadores ----------------
export function sync(db: DB) {
  const { city, residents, jobs, buildings } = db;
  for (const j of jobs) j.ocupadas = residents.filter((r) => r.profissao === j.id).length;
  for (const b of buildings) if (b.tipo === 'casa') b.moradores = residents.filter((r) => r.casa === b.id).length;
  city.moradores = residents.length;
  city.empregos.total = jobs.reduce((s, j) => s + j.vagas, 0);
  city.empregos.ocupados = jobs.reduce((s, j) => s + Math.min(j.vagas, j.ocupadas), 0);
  city.casas.total = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto').length;
  city.casas.ocupadas = buildings.filter((b) => b.tipo === 'casa' && b.moradores > 0).length;
  residents.filter((r) => !r.ficticio).forEach((r, k) => { r.ordem = k + 1; });
  const F = city.fundadores as { encerrado: boolean; ids: string[]; titulo: string; distintivo: string } | undefined;
  if (F?.encerrado) {
    // lista fechada: só estes ids são fundadores, para sempre (o título é reaplicado se alguém apagar à mão)
    for (const r of residents) {
      const f = F.ids.includes(r.id);
      if (f) { r.fundador = true; r.titulos = [...new Set([...(r.titulos ?? []), F.titulo])]; r.distintivo = F.distintivo; if (r.aparencia) r.aparencia.insignia = 'fundador'; }
      else if (r.fundador || (r.titulos ?? []).includes(F.titulo)) {
        delete r.fundador; r.titulos = (r.titulos ?? []).filter((x: string) => x !== F.titulo); if (r.distintivo === F.distintivo) delete r.distintivo; if (r.aparencia?.insignia === 'fundador') delete r.aparencia.insignia;
      }
    }
    const faltando = F.ids.filter((id) => !residents.some((r) => r.id === id));
    if (faltando.length) throw new Error(`fundador(es) ausente(s) em residents.json: ${faltando.join(', ')} — fundadores nunca podem ser removidos`);
  }
  const reais = residents.filter((r) => !r.ficticio).length;
  const seg = city.seguidores?.valor ?? null;
  for (const m of city.metas) m.concluida = (m.base === 'seguidores' ? (seg ?? 0) : reais) >= m.alvo;
  city.conquistas ??= [];
  if (reais >= 10 && !city.conquistas.some((c: any) => c.id === 'primeiros-10-moradores'))
    city.conquistas.push({ id: 'primeiros-10-moradores', nome: 'Os 10 Moradores Fundadores', dia: city.dia, data: today() });
  city.status = city.moradores === 0 ? 'cidade_pronta_aguardando_moradores' : 'cidade_com_moradores';
  city.atualizadoEm = today();
}

export function gravar(db: DB) {
  save('city-state.json', db.city); save('residents.json', db.residents); save('jobs.json', db.jobs); save('buildings.json', db.buildings);
  save('episodes.json', db.episodes);
  if (db.fila) save('pending-residents.json', db.fila);
}

// ---------------- moradores ----------------
export function casasLivres(db: DB): any[] {
  return db.buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto' && !db.residents.some((r) => r.casa === b.id));
}
export function addResident(db: DB, o: { nome: string; profissao: string; titulo?: string; bairro?: string; teste?: boolean; ordemConfirmada?: boolean; episodio?: number; look?: Parameters<typeof appearanceFor>[2]; fonte?: string; repetido?: boolean }) {
  const { residents, jobs, buildings, city } = db;
  if (!o.nome.trim()) throw new Error('nome vazio');
  if (!o.repetido && residents.some((r) => !r.ficticio && norm(r.nome) === norm(o.nome))) throw new Error(`já existe um morador chamado ${o.nome}`);
  const job = jobs.find((j) => j.id === o.profissao) ?? jobs.find((j) => j.id === profissaoPorTexto(db, o.profissao));
  if (!job) throw new Error(`profissão desconhecida: ${o.profissao}. Use: ${jobs.map((j) => j.id).join(', ')}`);
  const casas = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto' && (!o.bairro || b.bairro === o.bairro));
  const casa = casas.find((c) => !residents.some((r) => r.casa === c.id));
  if (!casa && !o.teste) throw new Error('não há casa livre: a capacidade habitacional acabou');
  const n = residents.length + 1;
  const id = `m${String(n).padStart(4, '0')}`;
  if (residents.some((r) => r.id === id)) throw new Error(`id ${id} já existe`);
  const aparencia = appearanceFor(seedOf(`${id}:${o.nome}`), job.roupa, o.look ?? {});
  const r = {
    id, nome: o.nome, profissao: job.id, titulo: o.titulo ?? job.nome.replace(/\(a\)|\(ã\)/g, ''), trabalho: job.predio,
    bairro: casa?.bairro ?? o.bairro ?? 'Vila Nova', casa: casa?.id, entrada: today(), episodio: o.episodio ?? city.dia,
    fonte: o.teste ? 'teste' : (o.fonte ?? 'comentário no TikTok'), ordemConfirmada: !!o.ordemConfirmada, ...(o.teste ? { ficticio: true } : {}), aparencia,
  };
  residents.push(r);
  return r;
}

// ---------------- episódios: produção e listas ----------------
const num = (id: string) => Number(id.replace(/\D/g, ''));
export const epId = (n: number) => `ep${String(n).padStart(2, '0')}`;
// episódio travado: já existe e (tem lista encerrada ou já saiu do planejamento: pré-produção, produção, produzido…)
export function travado(db: DB, id: string): boolean {
  const e = db.episodes.find((x) => x.id === id);
  if (!e) return false;
  return !!e.lista?.encerrada || !/^planejado/i.test(e.status ?? '');
}
export function primeiroEpisodioLivre(db: DB): number {
  const nums = db.episodes.filter((e) => /^ep\d+$/.test(e.id)).map((e) => num(e.id));
  let n = Math.max(1, ...nums.filter((k) => travado(db, epId(k)))) + 1;
  while (travado(db, epId(n))) n++;
  return n;
}
export function encerrarLista(db: DB, ep: string, ids: string[]) {
  const e = db.episodes.find((x) => x.id === ep);
  if (!e) throw new Error(`episódio ${ep} não existe em episodes.json`);
  if (e.lista?.encerrada) throw new Error(`a lista do ${ep} já está encerrada (${e.lista.moradores.length} moradores)`);
  for (const id of ids) if (!db.residents.some((r) => r.id === id && !r.ficticio)) throw new Error(`morador ${id} não existe (ou é de teste)`);
  e.lista = { encerrada: true, moradores: ids, encerradaEm: today() };
}

// ---------------- fila de entrada ----------------
export function fila(db: DB): Fila {
  if (!db.fila) throw new Error('data/pending-residents.json não existe');
  return db.fila;
}

export function adicionarPendente(db: DB, o: { nome: string; profissao: string; data?: string; comentarioId?: string; homonimo?: boolean; fonte?: string }): Pendente {
  const F = fila(db);
  const nome = o.nome.trim().replace(/\s+/g, ' '), prof = o.profissao.trim().replace(/\s+/g, ' ');
  if (!nome) throw new Error('nome do personagem vazio');
  if (!prof) throw new Error('profissão vazia');
  if (/[<>{}]/.test(nome + prof)) throw new Error('nome/profissão com caracteres inválidos');
  const data = o.data ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new Error(`data inválida: ${data} (use AAAA-MM-DD)`);
  if (data > today()) throw new Error(`data no futuro: ${data}`);
  // duplicados: mesmo comentário, ou mesmo nome + profissão (entre moradores reais e pedidos não recusados)
  const ativos = F.pendentes.filter((p) => p.status !== 'recusado');
  if (o.comentarioId) {
    const d = ativos.find((p) => p.comentarioId === o.comentarioId);
    if (d) throw new Error(`DUPLICADO: o comentário ${o.comentarioId} já está na fila como ${d.id} (${d.nome})`);
  }
  const k = chave(nome, prof);
  const dupM = db.residents.find((r) => !r.ficticio && (chave(r.nome, r.titulo ?? r.profissao) === k || (norm(r.nome) === norm(nome) && r.profissao === profissaoPorTexto(db, prof))));
  if (dupM) throw new Error(`DUPLICADO: ${nome} (${prof}) já é morador (${dupM.id}${dupM.fundador ? ', fundador' : ''})`);
  const dupP = ativos.find((p) => chave(p.nome, p.profissao) === k);
  if (dupP) throw new Error(`DUPLICADO: ${nome} (${prof}) já está na fila como ${dupP.id} [${dupP.status}]`);
  // mesmo nome com outra profissão: pode ser outra pessoa (homônimo) ou a mesma pessoa mudando de ideia → o operador decide
  const homonimos = [
    ...db.residents.filter((r) => !r.ficticio && norm(r.nome) === norm(nome)).map((r) => `${r.id} ${r.nome} (${r.titulo ?? r.profissao})`),
    ...ativos.filter((p) => norm(p.nome) === norm(nome)).map((p) => `${p.id} ${p.nome} (${p.profissao})`),
  ];
  if (homonimos.length && !o.homonimo)
    throw new Error(`POSSÍVEL DUPLICADO: já existe "${nome}" → ${homonimos.join('; ')}. Se for outra pessoa (outro comentário), repita com --homonimo`);
  const id = `f${String(F.proximoId).padStart(4, '0')}`;
  F.proximoId++;
  const p: Pendente = {
    id, nome, profissao: prof, profissaoId: profissaoPorTexto(db, prof), dataSolicitacao: data, status: 'pendente', episodioPrevisto: null,
    fonte: o.fonte ?? 'comentário no TikTok', ...(o.comentarioId ? { comentarioId: o.comentarioId } : {}), ...(o.homonimo ? { homonimo: true } : {}), registradoEm: today(),
  };
  F.pendentes.push(p);
  agendar(db);
  return p;
}

// distribui os pedidos em espera pelos próximos episódios livres: ordem de chegada (data do comentário e, no
// empate, ordem de registro), no máximo `capacidadePorEpisodio` por episódio e só enquanto houver casa livre.
export function agendar(db: DB) {
  const F = fila(db);
  const cap = F.regras.capacidadePorEpisodio;
  let livres = casasLivres(db).length;
  let ep = primeiroEpisodioLivre(db);
  let noEp = 0;
  const espera = F.pendentes
    .filter((p) => ['pendente', 'agendado', 'aguardando-moradia'].includes(p.status))
    .sort((a, b) => a.dataSolicitacao.localeCompare(b.dataSolicitacao) || a.id.localeCompare(b.id));
  // vagas por profissão já ocupadas (moradores) — para avisar quando a fila passar do que os prédios comportam
  const usadas = new Map<string, number>();
  for (const r of db.residents) if (!r.ficticio) usadas.set(r.profissao, (usadas.get(r.profissao) ?? 0) + 1);
  for (const p of espera) {
    delete p.aviso;
    if (p.profissaoId) {
      const j = db.jobs.find((x) => x.id === p.profissaoId);
      const u = (usadas.get(p.profissaoId) ?? 0) + 1; usadas.set(p.profissaoId, u);
      if (j && u > j.vagas) p.aviso = `vagas de ${j.nome} esgotadas (${j.vagas} em ${j.predio}): a história precisa abrir vaga ou novo local`;
    }
    if (livres <= 0) { p.status = 'aguardando-moradia'; p.episodioPrevisto = null; p.motivo = 'sem casa livre: precisa de novas moradias'; continue; }
    if (noEp >= cap) { ep++; while (travado(db, epId(ep))) ep++; noEp = 0; }
    p.status = 'agendado'; p.episodioPrevisto = epId(ep); noEp++; livres--;
    p.motivo = p.profissaoId ? undefined : 'profissão ainda não existe no sistema (criar em jobs.json antes de incorporar)';
    if (!p.motivo) delete p.motivo;
  }
}

export function recusar(db: DB, id: string, motivo: string) {
  const p = fila(db).pendentes.find((x) => x.id === id);
  if (!p) throw new Error(`pedido ${id} não existe`);
  if (p.status === 'incorporado') throw new Error(`${id} já virou morador (${p.moradorId}); não dá para recusar`);
  if (!motivo.trim()) throw new Error('informe o motivo da recusa');
  p.status = 'recusado'; p.episodioPrevisto = null; p.motivo = motivo;
  agendar(db);
}

// incorpora os pedidos agendados para um episódio: viram moradores (casa, trabalho, aparência persistente),
// a lista do episódio é encerrada e o episódio passa a existir em episodes.json. Exige o snapshot oficial do
// dia anterior (o estado mostrado no episódio anterior fica congelado antes de a cidade mudar).
export function incorporar(db: DB, ep: string, opts: { snapshotsDir: string; adiarSemProfissao?: boolean }) {
  const F = fila(db);
  if (travado(db, ep)) throw new Error(`${ep} já está em produção ou com a lista encerrada: não pode receber moradores`);
  const n = num(ep);
  const snap = path.join(opts.snapshotsDir, `dia-${String(n - 1).padStart(2, '0')}.json`);
  if (!existsSync(snap)) throw new Error(`falta o snapshot oficial do Dia ${String(n - 1).padStart(2, '0')} (${path.basename(snap)}): congele o estado do episódio anterior antes (npm run city:snapshot)`);
  agendar(db);
  const lote = F.pendentes.filter((p) => p.status === 'agendado' && p.episodioPrevisto === ep).sort((a, b) => a.dataSolicitacao.localeCompare(b.dataSolicitacao) || a.id.localeCompare(b.id)); // ordem de chegada
  if (!lote.length) throw new Error(`nenhum pedido agendado para ${ep}`);
  const semProf = lote.filter((p) => !p.profissaoId);
  if (semProf.length && !opts.adiarSemProfissao)
    throw new Error(`profissões que ainda não existem: ${semProf.map((p) => `${p.id} ${p.nome} (${p.profissao})`).join('; ')} — crie em jobs.json ou use --adiar-sem-profissao`);
  const ok = lote.filter((p) => p.profissaoId);
  const ids: string[] = [];
  for (const p of ok) {
    const r = addResident(db, { nome: p.nome, profissao: p.profissaoId!, titulo: p.profissao, episodio: n, fonte: p.fonte, repetido: !!p.homonimo });
    (r as any).pedido = p.id; (r as any).dataSolicitacao = p.dataSolicitacao;
    p.status = 'incorporado'; p.moradorId = r.id; p.incorporadoEm = today(); p.episodioPrevisto = ep; delete p.motivo;
    ids.push(r.id);
  }
  if (!db.episodes.some((e) => e.id === ep))
    db.episodes.push({ episodio: n, id: ep, titulo: `EPISÓDIO ${String(n).padStart(2, '0')}`, duracao: 75, data: null, resumo: '', status: 'pré-produção', estado: { moradores: 0, empregos: 0 } });
  encerrarLista(db, ep, ids);
  sync(db);
  const e = db.episodes.find((x) => x.id === ep)!;
  e.estado = { moradores: db.residents.filter((r) => !r.ficticio).length, empregos: db.city.empregos.total - db.city.empregos.ocupados };
  for (const p of semProf) { p.status = 'pendente'; p.episodioPrevisto = null; }
  agendar(db); // adiados e os demais seguem para os próximos episódios
  return { incorporados: ids, adiados: semProf.map((p) => p.id) };
}
