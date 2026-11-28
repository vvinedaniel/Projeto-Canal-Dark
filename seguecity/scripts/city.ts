// Administração local da cidade (data/*.json). Regras e persistência em scripts/lib/cidade.ts.
//   npx tsx scripts/city.ts status
//   npx tsx scripts/city.ts seguidores 137                     contador real de seguidores do TikTok (separado dos moradores)
//   npx tsx scripts/city.ts dia 2                              avança o dia da cidade
//   npx tsx scripts/city.ts moradores 12                       só o número do HUD (sem cadastro); prefira a fila
//   npx tsx scripts/city.ts add --nome "X" --profissao medico --teste [--cabelo coque|…] [--barba|--sem-barba]
//        personagem de TESTE (fictício). Moradores reais entram só pela fila: npm run fila:add (scripts/fila.ts)
//   npx tsx scripts/city.ts seed 5                             cadastra 5 personagens fictícios de teste
//   npx tsx scripts/city.ts limpar-teste                       remove os personagens de teste
import type { HairStyle } from '../src/engine/characters';
import { abrir, addResident, gravar, sync, today } from './lib/cidade';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const db = abrir();
const { city, residents, jobs } = db;

const cmd = args[0] ?? 'status';
if (cmd === 'moradores') {
  const n = Number(args[1]);
  if (!Number.isFinite(n) || n < 0) throw new Error('uso: city.ts moradores <número>');
  city.moradores = n; city.atualizadoEm = today();
  gravar(db);
  console.log(`contador de moradores = ${n} (só o HUD; moradores reais entram pela fila)`);
} else if (cmd === 'seguidores') {
  const n = Number(args[1]);
  if (!Number.isInteger(n) || n < 0) throw new Error('uso: city.ts seguidores <número real do TikTok>');
  city.seguidores = { ...(city.seguidores ?? { fonte: 'TikTok (número informado pelo dono do canal)' }), valor: n, atualizadoEm: today() };
  sync(db); gravar(db);
  console.log(`seguidores (TikTok) = ${n}; moradores cadastrados = ${city.moradores}`);
} else if (cmd === 'dia') {
  const n = Number(args[1]);
  if (!Number.isInteger(n) || n < 1) throw new Error('uso: city.ts dia <número>');
  city.dia = n; city.atualizadoEm = today();
  gravar(db);
  console.log(`dia da cidade = ${n}`);
} else if (cmd === 'add') {
  const teste = args.includes('--teste');
  if (!teste && db.fila) throw new Error('moradores reais entram pela fila de entrada: npm run fila:add -- --nome "..." --profissao "..." (depois fila:incorporar). Use --teste só para personagens fictícios.');
  const estilo = opt('--cabelo') as HairStyle | undefined;
  const barba = args.includes('--sem-barba') ? false : args.includes('--barba') ? true : undefined;
  const r = addResident(db, { nome: opt('--nome') ?? 'Sem nome', profissao: opt('--profissao') ?? 'mecanico', bairro: opt('--bairro'), teste, titulo: opt('--titulo'), ordemConfirmada: args.includes('--ordem-confirmada'), look: { ...(estilo ? { estilo } : {}), ...(barba !== undefined ? { barba } : {}) } });
  sync(db); gravar(db);
  console.log('cadastrado:', r);
} else if (cmd === 'seed') {
  const N = Number(args[1] ?? 5);
  const nomes = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe', 'Gabi', 'Heitor', 'Iara', 'João', 'Kátia', 'Leo'];
  for (let k = 0; k < N; k++) addResident(db, { nome: `${nomes[k % nomes.length]} (teste)`, profissao: jobs[(k * 7) % jobs.length].id, teste: true, repetido: true });
  sync(db); gravar(db);
  console.log(`${N} personagens fictícios de teste cadastrados (marcados "ficticio": true)`);
} else if (cmd === 'limpar-teste') {
  const before = residents.length;
  for (let k = residents.length - 1; k >= 0; k--) if (residents[k].ficticio) residents.splice(k, 1);
  sync(db); gravar(db);
  console.log(`${before - residents.length} personagens de teste removidos`);
} else {
  console.log(`${city.nome} · dia ${city.dia} · ${city.status}`);
  console.log(`moradores ${city.moradores} · seguidores (TikTok) ${city.seguidores?.valor ?? 'não informado'} · casas ocupadas ${city.casas.ocupadas}/${city.casas.total} · empregos ${city.empregos.ocupados}/${city.empregos.total}`);
  for (const r of residents) console.log(`  ${r.id} ${r.nome} — ${r.titulo ?? r.profissao} · casa ${r.casa} · trabalho ${r.trabalho} · ep ${r.episodio}${r.fundador ? ' · FUNDADOR' : ''}${r.ordemConfirmada ? '' : ' (ordem a confirmar)'}${r.ficticio ? ' [teste]' : ''}`);
  for (const c of city.conquistas ?? []) console.log(`  conquista: ${c.nome} (dia ${c.dia})`);
  if (db.fila) console.log(`  fila de entrada: ${db.fila.pendentes.filter((p) => !['incorporado', 'recusado'].includes(p.status)).length} pedido(s) em espera (npm run fila)`);
}
