// Núcleo da administração da cidade (persistência JSON em data/): moradores, fila de entrada, fundadores,
// categorias, indicadores de moradia e episódios. Usado por scripts/city.ts e scripts/fila.ts. Regras que valem sempre:
//   - nenhum morador ou comentário é criado sem dados informados pelo operador (nome + profissão do comentário);
//   - os 10 fundadores formam uma lista FECHADA: o título e o distintivo deles são permanentes e exclusivos;
//   - categorias permanentes por número de morador: 1–10 FUNDADOR, 11–100 PIONEIRO, 101+ CIDADÃO;
//   - episódio em produção ou com lista encerrada nunca recebe nem perde moradores, e o que ele mostra não muda;
//   - nenhum pedido é apagado: sem casa ou sem profissão, ele espera na fila;
//   - nada é construído automaticamente: a cidade só avisa quando a moradia chega ao limite de alerta.
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

export type StatusPendente = 'pendente' | 'agendado' | 'aguardando-moradia' | 'aguardando-profissao' | 'incorporado' | 'recusado';
export const EM_ESPERA: StatusPendente[] = ['pendente', 'agendado', 'aguardando-moradia', 'aguardando-profissao'];
export interface Mudanca { data: string; campo: string; de: string | null; para: string; fonte: string }
export interface Pendente {
  id: string; // f0001, f0002… (único, nunca reaproveitado)
  nome: string; // nome do personagem, como comentado
  profissao: string; // profissão exatamente como comentada (ex.: "Neurocirurgiã")
  profissaoId: string | null; // id em jobs.json, ou null se a profissão ainda não existe no sistema
  dataSolicitacao: string; // AAAA-MM-DD do comentário
  status: StatusPendente;
  episodioPrevisto: string | null; // ex.: "ep03"; null enquanto não houver capacidade
  fonte: string; // "comentário no TikTok"
  tiktok_username?: string; // usuário do TikTok (sem @, minúsculo): identifica a pessoa; nunca aparece no vídeo
  comentarioId?: string; // referência opcional do comentário (id/link), para barrar duplicados com certeza
  homonimo?: boolean; // mesmo nome de alguém já cadastrado, sabidamente outra pessoa
  registradoEm: string;
  motivo?: string; // recusa ou espera
  aviso?: string; // informativo (não bloqueia): ex.: vagas da profissão já esgotadas
  historico?: Mudanca[]; // trocas de profissão antes de virar morador
  moradorId?: string; // quando incorporado
  incorporadoEm?: string;
}
export interface Regras {
  capacidadePorEpisodio: number; // limite padrão de moradores novos por episódio (configurável; começou em 10)
  capacidadePorEpisodioEspecifica?: Record<string, number>; // exceções por episódio, ex.: { "ep04": 15 }
  alertaExpansao: number; // fração de ocupação que dispara o alerta de expansão (0,8 = 80%)
  moradia: string; ordem: string;
}
export interface Fila { regras: Regras; proximoId: number; pendentes: Pendente[] }

export function abrir() {
  const db = {
    city: load('city-state.json'), residents: load('residents.json') as any[], jobs: load('jobs.json') as any[],
    buildings: load('buildings.json') as any[], episodes: load('episodes.json') as any[],
    fila: (existsSync(D('pending-residents.json')) ? load('pending-residents.json') : null) as Fila | null,
  };
  if (db.fila) db.fila.regras.alertaExpansao ??= 0.8;
  return db;
}
export type DB = ReturnType<typeof abrir>;

// ---------------- normalização, profissões e identidade ----------------
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
// usuário do TikTok: sem @, minúsculo; letras, números, "_" e "." (2–24)
export function normUsuario(u?: string | null): string | undefined {
  if (u === undefined || u === null || u === '') return undefined;
  const v = u.trim().replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{2,24}$/.test(v)) throw new Error(`usuário do TikTok inválido: ${u} (use letras, números, "_" ou ".", até 24)`);
  return v;
}
type Ident = { tiktok_username?: string; comentarioId?: string };
// mesma pessoa? 'sim' (mesmo usuário ou mesmo comentário), 'nao' (usuários diferentes), 'desconhecido' (falta identificação)
function mesmaPessoa(a: Ident, b: Ident): 'sim' | 'nao' | 'desconhecido' {
  if (a.tiktok_username && b.tiktok_username) return a.tiktok_username === b.tiktok_username ? 'sim' : 'nao';
  if (a.comentarioId && b.comentarioId && a.comentarioId === b.comentarioId) return 'sim';
  return 'desconhecido';
}

// ---------------- categorias (permanentes) ----------------
export const CATEGORIAS = { fundador: { de: 1, ate: 10, nome: 'FUNDADOR' }, pioneiro: { de: 11, ate: 100, nome: 'PIONEIRO' }, cidadao: { de: 101, nome: 'CIDADÃO' } } as const;
export const categoriaDoNumero = (n: number) => (n <= CATEGORIAS.fundador.ate ? 'FUNDADOR' : n <= CATEGORIAS.pioneiro.ate ? 'PIONEIRO' : 'CIDADÃO');

// ---------------- indicadores de moradia e alerta de expansão ----------------
export function indicadores(db: DB) {
  const reais = db.residents.filter((r) => !r.ficticio);
  const casas = db.buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto');
  // apartamentos só contam quando tiverem `unidades` definidas em buildings.json (decisão de história)
  const aptos = db.buildings.filter((b) => b.tipo === 'apartamento' && b.status === 'pronto' && Number(b.unidades) > 0);
  const capacidade = casas.length + aptos.reduce((s, b) => s + Number(b.unidades), 0);
  const ocupadas = casas.filter((b) => reais.some((r) => r.casa === b.id)).length + aptos.reduce((s, b) => s + Math.min(Number(b.unidades), reais.filter((r) => r.casa === b.id).length), 0);
  const F = db.fila?.pendentes ?? [];
  const n = (st: StatusPendente) => F.filter((p) => p.status === st).length;
  const emEspera = F.filter((p) => EM_ESPERA.includes(p.status)).length;
  const agendados = n('agendado');
  const pct = (x: number) => (capacidade ? Math.round((1000 * x) / capacidade) / 10 : 0);
  const limite = db.fila?.regras.alertaExpansao ?? 0.8;
  const ocupacao = capacidade ? ocupadas / capacidade : 0;
  const projetada = capacidade ? (ocupadas + agendados) / capacidade : 0;
  return {
    atualizadoEm: today(),
    moradia: { capacidade, ocupadas, livres: capacidade - ocupadas, ocupacaoPct: pct(ocupadas), ocupacaoProjetadaPct: pct(Math.min(capacidade, ocupadas + agendados)), unidadesDeApartamento: capacidade - casas.length },
    empregos: { total: db.city.empregos.total, ocupados: db.city.empregos.ocupados, livres: db.city.empregos.total - db.city.empregos.ocupados },
    fila: { emEspera, agendados, aguardandoMoradia: n('aguardando-moradia'), aguardandoProfissao: n('aguardando-profissao'), incorporados: n('incorporado'), recusados: n('recusado') },
    // pedidos que a cidade não consegue atender agora (sem casa ou sem profissão), mais o que faltaria de casa se toda a fila entrasse
    demandaReprimida: { total: n('aguardando-moradia') + n('aguardando-profissao'), semMoradia: n('aguardando-moradia'), semProfissao: n('aguardando-profissao'), deficitDeMoradia: Math.max(0, emEspera - (capacidade - ocupadas)) },
    alerta: ocupacao >= limite
      ? { tipo: 'expansao-moradia', nivel: 'atingido', mensagem: `ocupação de ${pct(ocupadas)}% (limite ${Math.round(limite * 100)}%): planeje novas moradias — nada é construído automaticamente` }
      : projetada >= limite
        ? { tipo: 'expansao-moradia', nivel: 'previsto', mensagem: `com os pedidos agendados a ocupação chega a ${pct(Math.min(capacidade, ocupadas + agendados))}% (limite ${Math.round(limite * 100)}%): planeje novas moradias` }
        : null,
  };
}
function registrarIndicadores(db: DB) {
  const ind = indicadores(db);
  db.city.indicadores = ind;
  db.city.alertas ??= [];
  if (ind.alerta && !db.city.alertas.some((a: any) => a.tipo === ind.alerta!.tipo && a.nivel === ind.alerta!.nivel && a.resolvido !== true))
    db.city.alertas.push({ ...ind.alerta, desde: today(), resolvido: false });
  if (!ind.alerta) for (const a of db.city.alertas) if (a.tipo === 'expansao-moradia' && !a.resolvido) { a.resolvido = true; a.resolvidoEm = today(); }
}

// ---------------- fundadores (lista fechada), categorias e contadores ----------------
export function sync(db: DB) {
  const { city, residents, jobs, buildings } = db;
  for (const j of jobs) j.ocupadas = residents.filter((r) => r.profissao === j.id).length;
  for (const b of buildings) if (b.tipo === 'casa') b.moradores = residents.filter((r) => r.casa === b.id).length;
  city.moradores = residents.length;
  city.empregos.total = jobs.reduce((s, j) => s + j.vagas, 0);
  city.empregos.ocupados = jobs.reduce((s, j) => s + Math.min(j.vagas, j.ocupadas), 0);
  city.casas.total = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto').length;
  city.casas.ocupadas = buildings.filter((b) => b.tipo === 'casa' && b.moradores > 0).length;
  residents.filter((r) => !r.ficticio).forEach((r, k) => { r.ordem = k + 1; r.numero ??= k + 1; });
  const F = city.fundadores as { encerrado: boolean; ids: string[]; titulo: string; distintivo: string } | undefined;
  if (F?.encerrado) {
    // lista fechada: só estes ids são fundadores, para sempre (o título é reaplicado se alguém apagar à mão)
    for (const r of residents) {
      const f = F.ids.includes(r.id);
      if (f) { r.fundador = true; r.categoria = 'FUNDADOR'; r.titulos = [...new Set([...(r.titulos ?? []), F.titulo])]; r.distintivo = F.distintivo; if (r.aparencia) r.aparencia.insignia = 'fundador'; }
      else if (r.fundador || (r.titulos ?? []).includes(F.titulo)) {
        delete r.fundador; r.titulos = (r.titulos ?? []).filter((x: string) => x !== F.titulo); if (r.distintivo === F.distintivo) delete r.distintivo; if (r.aparencia?.insignia === 'fundador') delete r.aparencia.insignia;
      }
    }
    const faltando = F.ids.filter((id) => !residents.some((r) => r.id === id));
    if (faltando.length) throw new Error(`fundador(es) ausente(s) em residents.json: ${faltando.join(', ')} — fundadores nunca podem ser removidos`);
  }
  // categoria permanente pelo número do morador (11–100 PIONEIRO, 101+ CIDADÃO); quem não é fundador nunca vira FUNDADOR
  for (const r of residents) {
    if (r.ficticio) continue;
    if (F?.encerrado && !F.ids.includes(r.id) && (!r.categoria || r.categoria === 'FUNDADOR')) r.categoria = r.numero <= CATEGORIAS.fundador.ate ? 'PIONEIRO' : categoriaDoNumero(r.numero);
    r.categoria ??= categoriaDoNumero(r.numero);
  }
  const reais = residents.filter((r) => !r.ficticio).length;
  const seg = city.seguidores?.valor ?? null;
  for (const m of city.metas) m.concluida = (m.base === 'seguidores' ? (seg ?? 0) : reais) >= m.alvo;
  city.conquistas ??= [];
  if (reais >= 10 && !city.conquistas.some((c: any) => c.id === 'primeiros-10-moradores'))
    city.conquistas.push({ id: 'primeiros-10-moradores', nome: 'Os 10 Moradores Fundadores', dia: city.dia, data: today() });
  city.status = city.moradores === 0 ? 'cidade_pronta_aguardando_moradores' : 'cidade_com_moradores';
  city.atualizadoEm = today();
  registrarIndicadores(db);
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
export function addResident(db: DB, o: { nome: string; profissao: string; titulo?: string; bairro?: string; teste?: boolean; ordemConfirmada?: boolean; episodio?: number; look?: Parameters<typeof appearanceFor>[2]; fonte?: string; repetido?: boolean; tiktok_username?: string }) {
  const { residents, jobs, buildings, city } = db;
  if (!o.nome.trim()) throw new Error('nome vazio');
  if (!o.repetido && residents.some((r) => !r.ficticio && norm(r.nome) === norm(o.nome))) throw new Error(`já existe um morador chamado ${o.nome}`);
  if (o.tiktok_username && residents.some((r) => r.tiktok_username === o.tiktok_username)) throw new Error(`o usuário @${o.tiktok_username} já é morador`);
  const job = jobs.find((j) => j.id === o.profissao) ?? jobs.find((j) => j.id === profissaoPorTexto(db, o.profissao));
  if (!job) throw new Error(`profissão desconhecida: ${o.profissao}. Use: ${jobs.map((j) => j.id).join(', ')}`);
  const casas = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto' && (!o.bairro || b.bairro === o.bairro));
  const casa = casas.find((c) => !residents.some((r) => r.casa === c.id));
  if (!casa && !o.teste) throw new Error('não há casa livre: a capacidade habitacional acabou');
  const n = residents.length + 1;
  const id = `m${String(n).padStart(4, '0')}`;
  if (residents.some((r) => r.id === id)) throw new Error(`id ${id} já existe`);
  const aparencia = appearanceFor(seedOf(`${id}:${o.nome}`), job.roupa, o.look ?? {});
  const numero = o.teste ? undefined : residents.filter((r) => !r.ficticio).length + 1;
  const r = {
    id, nome: o.nome, profissao: job.id, titulo: o.titulo ?? job.nome.replace(/\(a\)|\(ã\)/g, ''), trabalho: job.predio,
    bairro: casa?.bairro ?? o.bairro ?? 'Vila Nova', casa: casa?.id, entrada: today(), episodio: o.episodio ?? city.dia,
    fonte: o.teste ? 'teste' : (o.fonte ?? 'comentário no TikTok'), ordemConfirmada: !!o.ordemConfirmada, ...(o.teste ? { ficticio: true } : {}),
    ...(numero ? { numero, categoria: categoriaDoNumero(numero) === 'FUNDADOR' && city.fundadores?.encerrado ? 'PIONEIRO' : categoriaDoNumero(numero) } : {}),
    ...(o.tiktok_username ? { tiktok_username: o.tiktok_username } : {}), aparencia,
  };
  residents.push(r);
  return r;
}

// episódio cujo estado ainda pode mudar na tela: está travado (em produção / lista encerrada) e ainda não tem o
// snapshot oficial do seu dia. Moradores desses elencos não podem ter dados alterados até o snapshot existir.
export function episodioAbertoNaTela(db: DB, residentId: string, snapshotsDir: string): string | null {
  for (const e of db.episodes) {
    if (!e.lista?.moradores?.includes(residentId)) continue;
    const dia = Number(String(e.id).replace(/\D/g, ''));
    if (!existsSync(path.join(snapshotsDir, `dia-${String(dia).padStart(2, '0')}.json`))) return e.id;
  }
  return null;
}

// troca de profissão de um morador: o mesmo registro (mesmo id), com histórico; nunca cria outro morador
export function atualizarProfissaoMorador(db: DB, ref: { id?: string; tiktok_username?: string }, profissao: string, opts: { snapshotsDir: string; fonte?: string }) {
  const u = normUsuario(ref.tiktok_username);
  const r = db.residents.find((x) => !x.ficticio && ((ref.id && x.id === ref.id) || (u && x.tiktok_username === u)));
  if (!r) throw new Error(`morador não encontrado (${ref.id ?? '@' + u})`);
  const ep = episodioAbertoNaTela(db, r.id, opts.snapshotsDir);
  if (ep) throw new Error(`${r.nome} (${r.id}) está no elenco do ${ep}, ainda sem snapshot oficial: a troca de profissão espera o episódio ser congelado (npm run city:snapshot)`);
  const job = db.jobs.find((j) => j.id === profissaoPorTexto(db, profissao) || j.id === profissao);
  if (!job) throw new Error(`profissão "${profissao}" ainda não existe em jobs.json: crie a profissão (prédio, vagas, roupa) antes da troca`);
  const de = r.titulo ?? r.profissao;
  if (r.profissao === job.id && norm(de) === norm(profissao)) throw new Error(`${r.nome} já é ${de}`);
  r.historicoProfissoes = [...(r.historicoProfissoes ?? []), { data: today(), campo: 'profissao', de, para: profissao, fonte: opts.fonte ?? 'comentário no TikTok' }];
  r.profissao = job.id; r.titulo = profissao; r.trabalho = job.predio;
  // a aparência continua a mesma pessoa (rosto, cabelo, corpo); só o uniforme acompanha a nova profissão
  if (r.aparencia) r.aparencia.roupa = { ...r.aparencia.roupa, camisa: job.roupa.camisa, calca: job.roupa.calca, extra: job.roupa.extra };
  sync(db);
  return r;
}

export function definirUsuarioMorador(db: DB, id: string, usuario: string) {
  const u = normUsuario(usuario)!;
  const r = db.residents.find((x) => x.id === id && !x.ficticio);
  if (!r) throw new Error(`morador ${id} não encontrado`);
  const outro = db.residents.find((x) => x.tiktok_username === u && x.id !== id) ?? db.fila?.pendentes.find((p) => p.tiktok_username === u && EM_ESPERA.includes(p.status));
  if (outro) throw new Error(`o usuário @${u} já pertence a ${'nome' in outro ? outro.nome : ''} (${outro.id})`);
  if (r.tiktok_username && r.tiktok_username !== u) throw new Error(`${r.nome} já tem o usuário @${r.tiktok_username}; corrija à mão se for erro de digitação`);
  r.tiktok_username = u;
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
export const capacidadeDo = (db: DB, ep: string) => fila(db).regras.capacidadePorEpisodioEspecifica?.[ep] ?? fila(db).regras.capacidadePorEpisodio;

export function configurar(db: DB, o: { capacidade?: number; episodio?: string; alerta?: number }) {
  const R = fila(db).regras;
  if (o.capacidade !== undefined) {
    if (!Number.isInteger(o.capacidade) || o.capacidade < 1 || o.capacidade > 100) throw new Error('capacidade por episódio: inteiro de 1 a 100');
    if (o.episodio) {
      if (!/^ep\d+$/.test(o.episodio)) throw new Error('episódio no formato ep03');
      if (travado(db, o.episodio)) throw new Error(`${o.episodio} já está em produção ou encerrado: a capacidade dele não muda`);
      R.capacidadePorEpisodioEspecifica = { ...(R.capacidadePorEpisodioEspecifica ?? {}), [o.episodio]: o.capacidade };
    } else R.capacidadePorEpisodio = o.capacidade;
  }
  if (o.alerta !== undefined) {
    if (!(o.alerta > 0 && o.alerta <= 1)) throw new Error('alerta de expansão: fração entre 0 e 1 (ex.: 0.8)');
    R.alertaExpansao = o.alerta;
  }
  agendar(db);
}

export function adicionarPendente(db: DB, o: { nome: string; profissao: string; data?: string; comentarioId?: string; homonimo?: boolean; fonte?: string; tiktok_username?: string }): Pendente {
  const F = fila(db);
  const nome = o.nome.trim().replace(/\s+/g, ' '), prof = o.profissao.trim().replace(/\s+/g, ' ');
  if (!nome) throw new Error('nome do personagem vazio');
  if (!prof) throw new Error('profissão vazia');
  if (/[<>{}]/.test(nome + prof)) throw new Error('nome/profissão com caracteres inválidos');
  const data = o.data ?? today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || Number.isNaN(Date.parse(data))) throw new Error(`data inválida: ${data} (use AAAA-MM-DD)`);
  if (data > today()) throw new Error(`data no futuro: ${data}`);
  const user = normUsuario(o.tiktok_username);
  const novo: Ident = { tiktok_username: user, comentarioId: o.comentarioId };
  const ativos = F.pendentes.filter((p) => p.status !== 'recusado' && p.status !== 'incorporado');
  const reais = db.residents.filter((r) => !r.ficticio);
  // 1) identificação forte: usuário do TikTok e referência do comentário
  if (user) {
    const m = reais.find((r) => r.tiktok_username === user);
    if (m) throw new Error(`DUPLICADO: @${user} já é morador (${m.id} ${m.nome}, ${m.titulo ?? m.profissao}). Para mudar a profissão: npm run moradores:profissao -- --id ${m.id} --profissao "..."`);
    const p = ativos.find((x) => x.tiktok_username === user);
    if (p) throw new Error(`DUPLICADO: @${user} já está na fila (${p.id} ${p.nome}, ${p.profissao}). Para mudar a profissão: npm run fila:atualizar -- --id ${p.id} --profissao "..."`);
  }
  if (o.comentarioId) {
    const d = F.pendentes.filter((p) => p.status !== 'recusado').find((p) => p.comentarioId === o.comentarioId);
    if (d) throw new Error(`DUPLICADO: o comentário ${o.comentarioId} já está na fila como ${d.id} (${d.nome})`);
  }
  // 2) mesmo nome: homônimo legítimo quando os usuários são diferentes; sem identificação, regras antigas
  let homonimo = false;
  const mesmos: { id: string; nome: string; prof: string; ident: Ident; fundador?: boolean; morador: boolean }[] = [
    ...reais.filter((r) => norm(r.nome) === norm(nome)).map((r) => ({ id: r.id, nome: r.nome, prof: r.titulo ?? r.profissao, ident: { tiktok_username: r.tiktok_username }, fundador: r.fundador, morador: true })),
    ...ativos.filter((p) => norm(p.nome) === norm(nome)).map((p) => ({ id: p.id, nome: p.nome, prof: p.profissao, ident: { tiktok_username: p.tiktok_username, comentarioId: p.comentarioId }, morador: false })),
  ];
  for (const x of mesmos) {
    const mp = mesmaPessoa(novo, x.ident);
    if (mp === 'nao') { homonimo = true; continue; } // usuários diferentes: outra pessoa, com o mesmo nome
    const mesmaProf = chave(x.nome, x.prof) === chave(nome, prof) || (x.morador && reais.find((r) => r.id === x.id)?.profissao === profissaoPorTexto(db, prof));
    if (mesmaProf && !(o.homonimo && (user || o.comentarioId)))
      throw new Error(`DUPLICADO: ${nome} (${prof}) já ${x.morador ? `é morador (${x.id}${x.fundador ? ', fundador' : ''})` : `está na fila como ${x.id}`}. Se for outra pessoa, registre com --tiktok <usuário> (e --homonimo se o outro não tiver usuário)`);
    if (!mesmaProf && !o.homonimo)
      throw new Error(`POSSÍVEL DUPLICADO: já existe "${nome}" → ${x.id} ${x.nome} (${x.prof}). Se for outra pessoa, informe --tiktok <usuário> ou repita com --homonimo; se for a mesma pessoa trocando de profissão, use ${x.morador ? 'moradores:profissao' : 'fila:atualizar'}`);
    homonimo = true;
  }
  const id = `f${String(F.proximoId).padStart(4, '0')}`;
  F.proximoId++;
  const p: Pendente = {
    id, nome, profissao: prof, profissaoId: profissaoPorTexto(db, prof), dataSolicitacao: data, status: 'pendente', episodioPrevisto: null,
    fonte: o.fonte ?? 'comentário no TikTok', ...(user ? { tiktok_username: user } : {}), ...(o.comentarioId ? { comentarioId: o.comentarioId } : {}), ...(homonimo ? { homonimo: true } : {}), registradoEm: today(),
  };
  F.pendentes.push(p);
  agendar(db);
  return p;
}

// troca de profissão de um pedido ainda na fila: o mesmo pedido (mesmo id e data), com histórico
export function atualizarPendente(db: DB, id: string, profissao: string, fonte = 'comentário no TikTok') {
  const p = fila(db).pendentes.find((x) => x.id === id);
  if (!p) throw new Error(`pedido ${id} não existe`);
  if (!EM_ESPERA.includes(p.status)) throw new Error(`${id} está ${p.status}: ${p.status === 'incorporado' ? `use moradores:profissao no morador ${p.moradorId}` : 'não pode mudar'}`);
  const prof = profissao.trim().replace(/\s+/g, ' ');
  if (!prof) throw new Error('profissão vazia');
  if (norm(prof) === norm(p.profissao)) throw new Error(`${p.nome} já pediu ${p.profissao}`);
  p.historico = [...(p.historico ?? []), { data: today(), campo: 'profissao', de: p.profissao, para: prof, fonte }];
  p.profissao = prof; p.profissaoId = profissaoPorTexto(db, prof);
  agendar(db);
  return p;
}

// distribui os pedidos em espera pelos próximos episódios livres: ordem de chegada (data do comentário e, no
// empate, ordem de registro), no máximo a capacidade de cada episódio e só enquanto houver casa livre.
// Pedido sem profissão no sistema espera como `aguardando-profissao` (não ocupa vaga do episódio nem casa).
export function agendar(db: DB) {
  const F = fila(db);
  let livres = casasLivres(db).length;
  let ep = primeiroEpisodioLivre(db);
  let noEp = 0;
  const espera = F.pendentes
    .filter((p) => EM_ESPERA.includes(p.status))
    .sort((a, b) => a.dataSolicitacao.localeCompare(b.dataSolicitacao) || a.id.localeCompare(b.id));
  // vagas por profissão já ocupadas (moradores) — para avisar quando a fila passar do que os prédios comportam
  const usadas = new Map<string, number>();
  for (const r of db.residents) if (!r.ficticio) usadas.set(r.profissao, (usadas.get(r.profissao) ?? 0) + 1);
  for (const p of espera) {
    delete p.aviso;
    p.profissaoId = profissaoPorTexto(db, p.profissao); // a profissão pode ter sido criada desde o pedido
    if (!p.profissaoId) { p.status = 'aguardando-profissao'; p.episodioPrevisto = null; p.motivo = `a profissão "${p.profissao}" ainda não existe no sistema (criar em jobs.json)`; continue; }
    const j = db.jobs.find((x) => x.id === p.profissaoId);
    const u = (usadas.get(p.profissaoId) ?? 0) + 1; usadas.set(p.profissaoId, u);
    if (j && u > j.vagas) p.aviso = `vagas de ${j.nome} esgotadas (${j.vagas} em ${j.predio}): a história precisa abrir vaga ou novo local`;
    if (livres <= 0) { p.status = 'aguardando-moradia'; p.episodioPrevisto = null; p.motivo = 'sem casa livre: precisa de novas moradias'; continue; }
    if (noEp >= capacidadeDo(db, epId(ep))) { ep++; while (travado(db, epId(ep))) ep++; noEp = 0; }
    p.status = 'agendado'; p.episodioPrevisto = epId(ep); noEp++; livres--;
    delete p.motivo;
  }
  registrarIndicadores(db);
}

export function recusar(db: DB, id: string, motivo: string) {
  const p = fila(db).pendentes.find((x) => x.id === id);
  if (!p) throw new Error(`pedido ${id} não existe`);
  if (p.status === 'incorporado') throw new Error(`${id} já virou morador (${p.moradorId}); não dá para recusar`);
  if (!motivo.trim()) throw new Error('informe o motivo da recusa');
  p.status = 'recusado'; p.episodioPrevisto = null; p.motivo = motivo;
  agendar(db);
}

// incorpora os pedidos agendados para um episódio: viram moradores (casa, trabalho, aparência persistente,
// número e categoria), a lista do episódio é encerrada e o episódio passa a existir em episodes.json. Exige o
// snapshot oficial do dia anterior (o estado mostrado no episódio anterior fica congelado antes de a cidade mudar).
export function incorporar(db: DB, ep: string, opts: { snapshotsDir: string; adiarSemProfissao?: boolean }) {
  const F = fila(db);
  if (travado(db, ep)) throw new Error(`${ep} já está em produção ou com a lista encerrada: não pode receber moradores`);
  const n = num(ep);
  const snap = path.join(opts.snapshotsDir, `dia-${String(n - 1).padStart(2, '0')}.json`);
  if (!existsSync(snap)) throw new Error(`falta o snapshot oficial do Dia ${String(n - 1).padStart(2, '0')} (${path.basename(snap)}): congele o estado do episódio anterior antes (npm run city:snapshot)`);
  agendar(db);
  const lote = F.pendentes.filter((p) => p.status === 'agendado' && p.episodioPrevisto === ep).sort((a, b) => a.dataSolicitacao.localeCompare(b.dataSolicitacao) || a.id.localeCompare(b.id)); // ordem de chegada
  if (!lote.length) throw new Error(`nenhum pedido agendado para ${ep}`);
  const ids: string[] = [];
  for (const p of lote) {
    const r = addResident(db, { nome: p.nome, profissao: p.profissaoId!, titulo: p.profissao, episodio: n, fonte: p.fonte, repetido: !!p.homonimo, tiktok_username: p.tiktok_username });
    (r as any).pedido = p.id; (r as any).dataSolicitacao = p.dataSolicitacao;
    if (p.historico?.length) (r as any).historicoProfissoes = [...p.historico];
    p.status = 'incorporado'; p.moradorId = r.id; p.incorporadoEm = today(); p.episodioPrevisto = ep; delete p.motivo;
    ids.push(r.id);
  }
  if (!db.episodes.some((e) => e.id === ep))
    db.episodes.push({ episodio: n, id: ep, titulo: `EPISÓDIO ${String(n).padStart(2, '0')}`, duracao: 75, data: null, resumo: '', status: 'pré-produção', estado: { moradores: 0, empregos: 0 } });
  encerrarLista(db, ep, ids);
  sync(db);
  const e = db.episodes.find((x) => x.id === ep)!;
  e.estado = { moradores: db.residents.filter((r) => !r.ficticio).length, empregos: db.city.empregos.total - db.city.empregos.ocupados };
  agendar(db); // os demais seguem para os próximos episódios
  return { incorporados: ids, adiados: F.pendentes.filter((p) => p.status === 'aguardando-profissao').map((p) => p.id) };
}
