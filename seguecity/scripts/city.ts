// Administração local da cidade (data/*.json).
//   npx tsx scripts/city.ts status
//   npx tsx scripts/city.ts moradores 12                       define o contador de moradores do HUD
//   npx tsx scripts/city.ts dia 2                              avança o dia da cidade
//   npx tsx scripts/city.ts add --nome "Mari" --profissao neurocirurgiao --titulo "Neurocirurgiã" [--ordem-confirmada] [--bairro "Vila Nova"]
//        [--cabelo coque|longo|curto|cacheado|careca|black|franja|rabo] [--barba|--sem-barba] [--teste]
//   npx tsx scripts/city.ts seguidores 137                     contador real de seguidores do TikTok (separado dos moradores)
//   npx tsx scripts/city.ts seed 5                             cadastra 5 personagens fictícios de teste
//   npx tsx scripts/city.ts limpar-teste                       remove os personagens de teste
// Profissões válidas: ids de data/jobs.json (ex.: medico, professor, mecanico, policial, engenheiro).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/env';
import { appearanceFor, seedOf, type HairStyle } from '../src/engine/characters';

const D = (f: string) => path.join(ROOT, 'data', f);
const load = (f: string) => JSON.parse(readFileSync(D(f), 'utf8'));
const save = (f: string, v: unknown) => writeFileSync(D(f), JSON.stringify(v, null, 2) + '\n');
const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const today = () => new Date().toISOString().slice(0, 10);

const city = load('city-state.json');
const residents: any[] = load('residents.json');
const jobs: any[] = load('jobs.json');
const buildings: any[] = load('buildings.json');

function sync() {
  // contadores derivados dos moradores cadastrados
  for (const j of jobs) j.ocupadas = residents.filter((r) => r.profissao === j.id).length;
  for (const b of buildings) if (b.tipo === 'casa') b.moradores = residents.filter((r) => r.casa === b.id).length;
  city.moradores = residents.length;
  city.empregos.total = jobs.reduce((s, j) => s + j.vagas, 0);
  city.empregos.ocupados = jobs.reduce((s, j) => s + Math.min(j.vagas, j.ocupadas), 0);
  city.casas.total = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto').length;
  city.casas.ocupadas = buildings.filter((b) => b.tipo === 'casa' && b.moradores > 0).length;
  // fundadores: os 10 primeiros moradores reais (por ordem de cadastro), título permanente
  residents.filter((r) => !r.ficticio).forEach((r, k) => {
    r.ordem = k + 1;
    if (k < 10 && !r.fundador) { r.fundador = true; r.titulos = [...new Set([...(r.titulos ?? []), 'MORADOR FUNDADOR'])]; r.distintivo = 'fundador-ouro'; if (r.aparencia) r.aparencia.insignia = 'fundador'; }
  });
  const reais = residents.filter((r) => !r.ficticio).length;
  const seg = city.seguidores?.valor ?? null;
  for (const m of city.metas) m.concluida = (m.base === 'seguidores' ? (seg ?? 0) : reais) >= m.alvo;
  city.conquistas ??= [];
  if (reais >= 10 && !city.conquistas.some((c: any) => c.id === 'primeiros-10-moradores'))
    city.conquistas.push({ id: 'primeiros-10-moradores', nome: 'Os 10 Moradores Fundadores', dia: city.dia, data: today() });
  city.status = city.moradores === 0 ? 'cidade_pronta_aguardando_moradores' : 'cidade_com_moradores';
  city.atualizadoEm = today();
  save('city-state.json', city); save('residents.json', residents); save('jobs.json', jobs); save('buildings.json', buildings);
}

function addResident(nome: string, profissao: string, bairro?: string, teste = false, titulo?: string, ordemConfirmada = false, look: Parameters<typeof appearanceFor>[2] = {}) {
  if (!nome.trim()) throw new Error('nome vazio');
  if (residents.some((r) => !r.ficticio && r.nome.toLowerCase() === nome.toLowerCase() && !args.includes('--repetido'))) throw new Error(`já existe um morador chamado ${nome} (use --repetido se for outra pessoa)`);
  const job = jobs.find((j) => j.id === profissao || j.nome.toLowerCase().startsWith(profissao.toLowerCase()));
  if (!job) throw new Error(`profissão desconhecida: ${profissao}. Use: ${jobs.map((j) => j.id).join(', ')}`);
  const casas = buildings.filter((b) => b.tipo === 'casa' && b.status === 'pronto' && (!bairro || b.bairro === bairro));
  const casa = casas.find((c) => !residents.some((r) => r.casa === c.id)) ?? casas[0];
  const n = residents.length + 1;
  const id = `m${String(n).padStart(4, '0')}`;
  // aparência persistente: gerada uma vez a partir do id + nome e gravada no cadastro
  const aparencia = appearanceFor(seedOf(`${id}:${nome}`), job.roupa, look);
  const r = {
    id, nome, profissao: job.id, titulo: titulo ?? job.nome.replace(/\(a\)|\(ã\)/g, ''), trabalho: job.predio,
    bairro: casa?.bairro ?? bairro ?? 'Vila Nova', casa: casa?.id, entrada: today(), episodio: city.dia,
    fonte: teste ? 'teste' : 'comentário no TikTok', ordemConfirmada: !!ordemConfirmada, ...(teste ? { ficticio: true } : {}), aparencia,
  };
  residents.push(r);
  return r;
}

const cmd = args[0] ?? 'status';
if (cmd === 'moradores') {
  const n = Number(args[1]);
  if (!Number.isFinite(n) || n < 0) throw new Error('uso: city.ts moradores <número>');
  city.moradores = n; city.atualizadoEm = today();
  save('city-state.json', city);
  console.log(`contador de moradores = ${n} (só o HUD; cadastre moradores com "add" para contar de verdade)`);
} else if (cmd === 'seguidores') {
  const n = Number(args[1]);
  if (!Number.isInteger(n) || n < 0) throw new Error('uso: city.ts seguidores <número real do TikTok>');
  city.seguidores = { ...(city.seguidores ?? { fonte: 'TikTok (número informado pelo dono do canal)' }), valor: n, atualizadoEm: today() };
  sync();
  console.log(`seguidores (TikTok) = ${n}; moradores cadastrados = ${city.moradores}`);
} else if (cmd === 'dia') {
  const n = Number(args[1]);
  if (!Number.isInteger(n) || n < 1) throw new Error('uso: city.ts dia <número>');
  city.dia = n; city.atualizadoEm = today();
  save('city-state.json', city);
  console.log(`dia da cidade = ${n}`);
} else if (cmd === 'add') {
  const estilo = opt('--cabelo') as HairStyle | undefined;
  const barba = args.includes('--sem-barba') ? false : args.includes('--barba') ? true : undefined;
  const r = addResident(opt('--nome') ?? 'Sem nome', opt('--profissao') ?? 'mecanico', opt('--bairro'), args.includes('--teste'), opt('--titulo'), args.includes('--ordem-confirmada'), { ...(estilo ? { estilo } : {}), ...(barba !== undefined ? { barba } : {}) });
  sync();
  console.log('cadastrado:', r);
} else if (cmd === 'seed') {
  const N = Number(args[1] ?? 5);
  const nomes = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João', 'Kátia', 'Leo'];
  for (let k = 0; k < N; k++) {
    const job = jobs[(k * 7) % jobs.length];
    addResident(`${nomes[k % nomes.length]} (teste)`, job.id, undefined, true);
  }
  sync();
  console.log(`${N} personagens fictícios de teste cadastrados (marcados "ficticio": true)`);
} else if (cmd === 'limpar-teste') {
  const before = residents.length;
  for (let k = residents.length - 1; k >= 0; k--) if (residents[k].ficticio) residents.splice(k, 1);
  sync();
  console.log(`${before - residents.length} personagens de teste removidos`);
} else {
  console.log(`${city.nome} · dia ${city.dia} · ${city.status}`);
  console.log(`moradores ${city.moradores} · seguidores (TikTok) ${city.seguidores?.valor ?? 'não informado'} · casas ocupadas ${city.casas.ocupadas}/${city.casas.total} · empregos ${city.empregos.ocupados}/${city.empregos.total}`);
  for (const r of residents) console.log(`  ${r.id} ${r.nome} — ${r.titulo ?? r.profissao} · casa ${r.casa} · trabalho ${r.trabalho}${r.fundador ? ' · FUNDADOR' : ''}${r.ordemConfirmada ? '' : ' (ordem a confirmar)'}${r.ficticio ? ' [teste]' : ''}`);
  for (const c of city.conquistas ?? []) console.log(`  conquista: ${c.nome} (dia ${c.dia})`);
}
