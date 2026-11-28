// Snapshot oficial do estado da cidade (registro imutável de um dia do jogo).
// Uso: npx tsx scripts/snapshot.ts [dia]   → data/snapshots/dia-NN.json (não sobrescreve um snapshot existente)
// Guarda: estado da cidade, prédios, profissões/vagas, moradores cadastrados, metas, episódio e um hash SHA-256 de
// cada arquivo de data/ — dá para provar depois qual era o estado exibido no episódio daquele dia.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env';

const D = (f: string) => path.join(ROOT, 'data', f);
const raw = (f: string) => readFileSync(D(f), 'utf8');
const load = (f: string) => JSON.parse(raw(f));
const city = load('city-state.json');
const rascunho = process.argv.includes('--rascunho'); // rascunho pode ser regravado; o oficial nunca
const dia = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? city.dia);
const out = path.join(ROOT, 'data/snapshots', `dia-${String(dia).padStart(2, '0')}${rascunho ? '.rascunho' : ''}.json`);
if (existsSync(out) && !rascunho) { console.log(`já existe: ${path.relative(ROOT, out)} (snapshots não são sobrescritos)`); process.exit(0); }

const buildings: any[] = load('buildings.json');
const jobs: any[] = load('jobs.json');
const residents: any[] = load('residents.json');
const episodes: any[] = load('episodes.json');
const files = ['city-state.json', 'buildings.json', 'jobs.json', 'residents.json', 'episodes.json', 'mapa.json'];
const count = (pred: (b: any) => boolean) => buildings.filter(pred).length;
const snap = {
  snapshot: `SegueCity — estado ${rascunho ? 'em RASCUNHO (aguardando aprovação)' : 'oficial'} do Dia ${String(dia).padStart(2, '0')}`,
  dia,
  registradoEm: new Date().toISOString(),
  episodio: episodes.filter((e) => e.episodio === dia).map((e) => ({ id: e.id, titulo: e.titulo, estado: e.estado })),
  cidade: { nome: city.nome, slogan: city.slogan, status: city.status, evolucao: city.evolucao, moradores: city.moradores, seguidores: city.seguidores ?? null, casas: city.casas, empregos: city.empregos, metas: city.metas, conquistas: city.conquistas ?? [] },
  predios: {
    prontos: count((b) => b.status === 'pronto'),
    emObra: count((b) => b.status === 'em_obra'),
    planejados: count((b) => b.status === 'planejado'),
    porTipo: Object.fromEntries([...new Set(buildings.map((b) => b.tipo))].map((t) => [t, count((b) => b.tipo === t)])),
    lista: buildings.map((b) => ({ id: b.id, tipo: b.tipo, nome: b.nome, status: b.status, posicao: b.posicao, moradores: b.moradores ?? 0 })),
  },
  profissoes: jobs.map((j) => ({ id: j.id, nome: j.nome, predio: j.predio, vagas: j.vagas, ocupadas: j.ocupadas ?? 0 })),
  moradores: residents.map((r) => ({ id: r.id, nome: r.nome, profissao: r.profissao, titulo: r.titulo ?? null, bairro: r.bairro, casa: r.casa, trabalho: r.trabalho ?? null, entrada: r.entrada ?? null, ordem: r.ordem ?? null, ordemConfirmada: !!r.ordemConfirmada, fundador: !!r.fundador, titulos: r.titulos ?? [], distintivo: r.distintivo ?? null, fonte: r.fonte ?? null, ficticio: !!r.ficticio })),
  arquivos: Object.fromEntries(files.map((f) => [f, createHash('sha256').update(raw(f)).digest('hex')])),
};
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snap, null, 2) + '\n');
console.log(`snapshot → ${path.relative(ROOT, out)}: ${snap.cidade.moradores} moradores, ${snap.predios.prontos} prédios prontos, ${snap.cidade.empregos.total} vagas, ${snap.moradores.length} cadastrados`);
