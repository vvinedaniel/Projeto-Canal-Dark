// Snapshot oficial do estado da cidade (registro imutável de um dia do jogo).
// Uso: npx tsx scripts/snapshot.ts [dia]   → data/snapshots/dia-NN.json (não sobrescreve um snapshot existente)
// Guarda: estado da cidade, prédios, profissões/vagas, moradores cadastrados, metas, episódio e um hash SHA-256 de
// cada arquivo de data/ — dá para provar depois qual era o estado exibido no episódio daquele dia.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env';
import { DATA, EM_ESPERA } from './lib/cidade';

const D = (f: string) => path.join(DATA, f);
const raw = (f: string) => readFileSync(D(f), 'utf8');
const load = (f: string) => JSON.parse(raw(f));
const city = load('city-state.json');
const rascunho = process.argv.includes('--rascunho'); // rascunho pode ser regravado; o oficial nunca
const dia = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? city.dia);
const out = path.join(DATA, 'snapshots', `dia-${String(dia).padStart(2, '0')}${rascunho ? '.rascunho' : ''}.json`);
if (existsSync(out) && !rascunho) { console.log(`já existe: ${path.relative(ROOT, out)} (snapshots não são sobrescritos)`); process.exit(0); }

const buildings: any[] = load('buildings.json');
const jobs: any[] = load('jobs.json');
const residents: any[] = load('residents.json');
const episodes: any[] = load('episodes.json');
const files = ['city-state.json', 'buildings.json', 'jobs.json', 'residents.json', 'episodes.json', 'mapa.json', ...(existsSync(D('pending-residents.json')) ? ['pending-residents.json'] : [])];
const count = (pred: (b: any) => boolean) => buildings.filter(pred).length;
const snap = {
  snapshot: `SegueCity — estado ${rascunho ? 'em RASCUNHO (aguardando aprovação)' : 'oficial'} do Dia ${String(dia).padStart(2, '0')}`,
  dia,
  registradoEm: new Date().toISOString(),
  episodio: episodes.filter((e) => e.episodio === dia).map((e) => ({ id: e.id, titulo: e.titulo, estado: e.estado, lista: e.lista ?? null })),
  cidade: { nome: city.nome, slogan: city.slogan, status: city.status, evolucao: city.evolucao, moradores: city.moradores, seguidores: city.seguidores ?? null, casas: city.casas, empregos: city.empregos, metas: city.metas, conquistas: city.conquistas ?? [], indicadores: city.indicadores ?? null, alertas: city.alertas ?? [] },
  predios: {
    prontos: count((b) => b.status === 'pronto'),
    emObra: count((b) => b.status === 'em_obra'),
    planejados: count((b) => b.status === 'planejado'),
    porTipo: Object.fromEntries([...new Set(buildings.map((b) => b.tipo))].map((t) => [t, count((b) => b.tipo === t)])),
    lista: buildings.map((b) => ({ id: b.id, tipo: b.tipo, nome: b.nome, status: b.status, posicao: b.posicao, moradores: b.moradores ?? 0 })),
  },
  profissoes: jobs.map((j) => ({ id: j.id, nome: j.nome, predio: j.predio, vagas: j.vagas, ocupadas: j.ocupadas ?? 0 })),
  // o usuário do TikTok não é copiado para o snapshot (dado pessoal; fica só em residents.json, que o hash cobre)
  // número só é oficial quando a ordem está confirmada; os fundadores 2–10 ficam como provisórios até a confirmação
  numeracao: 'Nº 1 confirmado (Mateus, 1º comentário). Fundadores 2 a 10: número provisório (ordem da mensagem do dono do canal) até a ordem dos comentários ser confirmada; o id técnico (m0002…m0010) é estável.',
  moradores: residents.map((r) => ({ id: r.id, numero: r.fundador && !r.ordemConfirmada ? null : r.numero ?? null, numeroProvisorio: r.fundador && !r.ordemConfirmada ? r.numero ?? null : null, categoria: r.categoria ?? null, nome: r.nome, profissao: r.profissao, titulo: r.titulo ?? null, bairro: r.bairro, casa: r.casa, trabalho: r.trabalho ?? null, entrada: r.entrada ?? null, ordem: r.ordem ?? null, ordemConfirmada: !!r.ordemConfirmada, fundador: !!r.fundador, titulos: r.titulos ?? [], distintivo: r.distintivo ?? null, fonte: r.fonte ?? null, historicoProfissoes: r.historicoProfissoes ?? [], ficticio: !!r.ficticio })),
  fila: existsSync(D('pending-residents.json')) ? (() => { const q = load('pending-residents.json'); const by = (st: string) => q.pendentes.filter((p: any) => p.status === st).length; return { capacidadePorEpisodio: q.regras.capacidadePorEpisodio, capacidadePorEpisodioEspecifica: q.regras.capacidadePorEpisodioEspecifica ?? {}, emEspera: q.pendentes.filter((p: any) => (EM_ESPERA as string[]).includes(p.status)).length, agendados: by('agendado'), aguardandoMoradia: by('aguardando-moradia'), aguardandoProfissao: by('aguardando-profissao'), incorporados: by('incorporado'), recusados: by('recusado') }; })() : null,
  fundadores: city.fundadores ?? null,
  arquivos: Object.fromEntries(files.map((f) => [f, createHash('sha256').update(raw(f)).digest('hex')])),
};
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snap, null, 2) + '\n');
console.log(`snapshot → ${path.relative(ROOT, out)}: ${snap.cidade.moradores} moradores, ${snap.predios.prontos} prédios prontos, ${snap.cidade.empregos.total} vagas, ${snap.moradores.length} cadastrados`);
