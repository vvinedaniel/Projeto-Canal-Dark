// Testes da fila de entrada e das regras de moradores (npm run test:fila).
// Cada cenário roda numa CÓPIA dos dados (SEGUECITY_DATA=<pasta temporária>): os dados reais nunca são tocados.
// Os nomes de teste existem só nessas cópias.
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { ROOT } from './lib/env';

const REAL = path.join(ROOT, 'data');
const hashReal = () => createHash('sha256').update(['city-state.json', 'residents.json', 'pending-residents.json', 'episodes.json', 'buildings.json', 'jobs.json', 'snapshots/dia-01.json'].map((f) => readFileSync(path.join(REAL, f), 'utf8')).join('|')).digest('hex');
const hashAntes = hashReal();
const TSX = path.join(ROOT, 'node_modules/.bin/tsx');
let ok = 0, falhas = 0, dir = '';

function copia() {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = mkdtempSync(path.join(os.tmpdir(), 'seguecity-teste-'));
  cpSync(REAL, dir, { recursive: true });
  return dir;
}
const J = (f: string) => JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
const W = (f: string, v: unknown) => writeFileSync(path.join(dir, f), JSON.stringify(v, null, 2));
function cli(script: 'fila' | 'city' | 'snapshot', ...a: string[]): { ok: boolean; out: string } {
  try {
    const out = execFileSync(TSX, [path.join(ROOT, 'scripts', `${script}.ts`), ...a], { env: { ...process.env, SEGUECITY_DATA: dir }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, out };
  } catch (e: any) { return { ok: false, out: String(e.stderr ?? '') + String(e.stdout ?? '') }; }
}
function check(nome: string, cond: boolean, info = '') {
  if (cond) { ok++; console.log(`  ✓ ${nome}`); } else { falhas++; console.log(`  ✗ ${nome}${info ? ` — ${info}` : ''}`); }
}
const add = (...a: string[]) => cli('fila', 'add', ...a);
const oficializaDia = (n: number) => copyFileSync(path.join(dir, 'snapshots/dia-02.rascunho.json'), path.join(dir, `snapshots/dia-${String(n).padStart(2, '0')}.json`));

async function main() {
  // ------------------------------------------------------------------ regras que já existiam
  console.log('\n[1] duplicados, datas e profissões (regras anteriores)');
  copia();
  check('registra pedido', add('--nome', 'Teste Caio', '--profissao', 'Professor', '--data', '2026-11-28', '--comentario', 'c-1').ok);
  check('mesmo nome+profissão com outra caixa/acento é barrado', /DUPLICADO/.test(add('--nome', 'teste caio', '--profissao', 'professor').out));
  check('mesmo comentário é barrado', /comentário c-1/.test(add('--nome', 'Outro', '--profissao', 'Mecânico', '--comentario', 'c-1').out));
  check('fundador repetido (Mateus/Médico) é barrado', /fundador/.test(add('--nome', 'Mateus', '--profissao', 'Médico').out));
  check('mesmo nome com outra profissão pede confirmação', /POSSÍVEL DUPLICADO/.test(add('--nome', 'Mateus', '--profissao', 'Advogado').out));
  check('…e passa com --homonimo', add('--nome', 'Mateus', '--profissao', 'Advogado', '--homonimo').ok);
  check('data no futuro é recusada', /futuro/.test(add('--nome', 'Teste Fut', '--profissao', 'Médica', '--data', '2099-01-01').out));
  check('"Médica" é reconhecida como medico', J('pending-residents.json').pendentes.length === 2 && add('--nome', 'Teste Ana', '--profissao', 'Médica').ok && J('pending-residents.json').pendentes.at(-1).profissaoId === 'medico');
  check('morador real direto (sem fila) é barrado', /fila de entrada/.test(cli('city', 'add', '--nome', 'Alguém', '--profissao', 'medico').out));

  // ------------------------------------------------------------------ 1. identificação por usuário do TikTok
  console.log('\n[2] usuário do TikTok e homônimos legítimos');
  copia();
  check('registra com --tiktok (@ e caixa normalizados)', add('--nome', 'Teste Lia', '--profissao', 'Dentista', '--tiktok', '@Lia_Teste').ok && J('pending-residents.json').pendentes[0].tiktok_username === 'lia_teste');
  check('mesmo usuário de novo é barrado (sugere fila:atualizar)', /fila:atualizar/.test(add('--nome', 'Lia', '--profissao', 'Médica', '--tiktok', 'lia_teste').out));
  check('usuário inválido é recusado', /inválido/.test(add('--nome', 'Teste X', '--profissao', 'Médica', '--tiktok', 'nome com espaço').out));
  check('mesmo nome+profissão com usuários diferentes: homônimo legítimo, sem flag', add('--nome', 'Teste Joao', '--profissao', 'Policial', '--tiktok', 'joao_a').ok && add('--nome', 'Teste João', '--profissao', 'Policial', '--tiktok', 'joao_b').ok && J('pending-residents.json').pendentes.at(-1).homonimo === true);
  check('mesmo nome sem usuário do outro lado continua exigindo confirmação', /DUPLICADO/.test(add('--nome', 'Mateus', '--profissao', 'Médico', '--tiktok', 'mateus_x').out));
  check('…passa com --tiktok + --homonimo', add('--nome', 'Mateus', '--profissao', 'Médico', '--tiktok', 'mateus_x', '--homonimo').ok);
  check('usuário ligado a um fundador barra novo pedido dele', cli('city', 'usuario', '--id', 'm0002', '--tiktok', 'davi_t').ok && /já é morador \(m0002/.test(add('--nome', 'Davi', '--profissao', 'Bombeiro', '--tiktok', 'davi_t').out));

  // ------------------------------------------------------------------ 2. capacidade configurável
  console.log('\n[3] limite por episódio configurável (padrão 10)');
  copia();
  check('padrão continua 10', J('pending-residents.json').regras.capacidadePorEpisodio === 10);
  for (let k = 1; k <= 14; k++) add('--nome', `Teste ${k}`, '--profissao', 'Mecânico', '--data', '2026-11-28');
  let P = J('pending-residents.json').pendentes;
  check('com 10: ep03 recebe 10 e ep04 recebe 4', P.filter((p: any) => p.episodioPrevisto === 'ep03').length === 10 && P.filter((p: any) => p.episodioPrevisto === 'ep04').length === 4);
  check('fila:config --capacidade 12', cli('fila', 'config', '--capacidade', '12').ok && J('pending-residents.json').pendentes.filter((p: any) => p.episodioPrevisto === 'ep03').length === 12);
  check('exceção por episódio (ep03 = 5)', cli('fila', 'config', '--capacidade', '5', '--episodio', 'ep03').ok && J('pending-residents.json').pendentes.filter((p: any) => p.episodioPrevisto === 'ep03').length === 5);
  check('episódio travado não muda capacidade', /em produção ou encerrado/.test(cli('fila', 'config', '--capacidade', '20', '--episodio', 'ep02').out));
  check('ep01/ep02 nunca recebem pedidos', !J('pending-residents.json').pendentes.some((p: any) => ['ep01', 'ep02'].includes(p.episodioPrevisto)));

  // ------------------------------------------------------------------ 6/7. indicadores e alerta de expansão
  console.log('\n[4] indicadores de moradia e alerta de 80%');
  copia();
  const predios0 = J('buildings.json').length;
  let C = J('city-state.json');
  for (let k = 1; k <= 10; k++) add('--nome', `Teste ${k}`, '--profissao', 'Policial', '--data', '2026-11-28');
  C = J('city-state.json');
  check('indicadores gravados (capacidade 24, ocupadas 10, 41,7%)', C.indicadores?.moradia.capacidade === 24 && C.indicadores.moradia.ocupadas === 10 && C.indicadores.moradia.ocupacaoPct === 41.7);
  check('com 10 agendados a ocupação prevista é 83,3% → alerta previsto', C.indicadores.moradia.ocupacaoProjetadaPct === 83.3 && C.indicadores.alerta?.nivel === 'previsto');
  oficializaDia(2);
  check('incorporar ep03', cli('fila', 'incorporar', '--episodio', 'ep03').ok);
  C = J('city-state.json');
  check('ocupação atual 83,3% → alerta ATINGIDO registrado', C.indicadores.moradia.ocupacaoPct === 83.3 && C.indicadores.alerta?.nivel === 'atingido' && C.alertas.some((a: any) => a.nivel === 'atingido' && !a.resolvido));
  check('alerta não constrói nada', J('buildings.json').length === predios0 && J('buildings.json').filter((b: any) => b.tipo === 'casa').length === 24);
  for (let k = 11; k <= 18; k++) add('--nome', `Teste ${k}`, '--profissao', 'Policial', '--data', '2026-11-28');
  C = J('city-state.json'); P = J('pending-residents.json').pendentes;
  check('sem casa: pedidos ficam na fila (aguardando-moradia), nada é apagado', P.length === 18 && P.filter((p: any) => p.status === 'aguardando-moradia').length === 4);
  check('demanda reprimida = 4 sem moradia', C.indicadores.demandaReprimida.semMoradia === 4 && C.indicadores.demandaReprimida.total === 4);
  check('empregos livres = total − ocupados', C.indicadores.empregos.livres === C.empregos.total - C.empregos.ocupados);

  // ------------------------------------------------------------------ 8. profissão inexistente preservada
  console.log('\n[5] pedido sem profissão fica preservado e volta quando a profissão existir');
  copia();
  add('--nome', 'Teste Lia', '--profissao', 'Dentista', '--data', '2026-11-27');
  add('--nome', 'Teste Rui', '--profissao', 'Mecânico', '--data', '2026-11-28');
  P = J('pending-residents.json').pendentes;
  check('Dentista → aguardando-profissao (não ocupa vaga nem casa)', P[0].status === 'aguardando-profissao' && P[0].episodioPrevisto === null && P[1].episodioPrevisto === 'ep03');
  oficializaDia(2);
  const inc = cli('fila', 'incorporar', '--episodio', 'ep03');
  check('incorporação não é bloqueada e o pedido continua na fila', inc.ok && J('pending-residents.json').pendentes[0].status === 'aguardando-profissao');
  const jobs = J('jobs.json'); jobs.push({ id: 'dentista', nome: 'Dentista', predio: 'hospital', vagas: 1, ocupadas: 0, roupa: { camisa: '#f2f4f7', calca: '#4f7fb8', extra: 'jaleco' } }); W('jobs.json', jobs);
  check('criada a profissão, o pedido é agendado no próximo episódio livre (ep04)', cli('fila', 'agendar').ok && J('pending-residents.json').pendentes[0].status === 'agendado' && J('pending-residents.json').pendentes[0].episodioPrevisto === 'ep04');

  // ------------------------------------------------------------------ 9. troca de profissão sem duplicar
  console.log('\n[6] troca de profissão sem registro duplicado');
  copia();
  add('--nome', 'Teste Caio', '--profissao', 'Professor', '--tiktok', 'caio_t');
  check('fila:atualizar mantém o mesmo pedido, com histórico', cli('fila', 'atualizar', '--id', 'f0001', '--profissao', 'Médico').ok && (() => { const p = J('pending-residents.json').pendentes; return p.length === 1 && p[0].profissao === 'Médico' && p[0].historico[0].de === 'Professor'; })());
  check('fundador no elenco do ep02 (sem snapshot oficial) não troca de profissão', /ep02/.test(cli('city', 'profissao', '--id', 'm0001', '--profissao', 'Advogado').out));
  oficializaDia(2);
  cli('fila', 'incorporar', '--episodio', 'ep03');
  let R = J('residents.json');
  const caio = R.find((r: any) => r.tiktok_username === 'caio_t');
  check('morador incorporado leva o histórico do pedido', caio?.historicoProfissoes?.[0]?.de === 'Professor');
  check('morador do ep03 (sem snapshot do Dia 03) espera para trocar', /ep03/.test(cli('city', 'profissao', '--tiktok', 'caio_t', '--profissao', 'Advogado').out));
  oficializaDia(3);
  const n0 = J('residents.json').length;
  check('com o Dia 03 congelado, troca pelo usuário: mesmo id, histórico e novo uniforme', cli('city', 'profissao', '--tiktok', 'caio_t', '--profissao', 'Advogada').ok && (() => { const r = J('residents.json').find((x: any) => x.id === caio.id); return r.titulo === 'Advogada' && r.trabalho === 'futuro-3' && r.historicoProfissoes.length === 2 && r.aparencia.roupa.extra === 'gravata' && r.aparencia.cabelo.estilo === caio.aparencia.cabelo.estilo; })());
  check('nenhum morador novo foi criado na troca', J('residents.json').length === n0);
  check('pedido novo do mesmo usuário é barrado (sugere moradores:profissao)', /moradores:profissao/.test(add('--nome', 'Caio', '--profissao', 'Dentista', '--tiktok', 'caio_t').out));

  // ------------------------------------------------------------------ 3/4/5. fundadores e categorias
  console.log('\n[7] fundadores exclusivos, PIONEIRO (11–100) e CIDADÃO (101+)');
  copia();
  // só nesta cópia: 100 casas de teste para chegar ao morador nº 101
  const B = J('buildings.json');
  for (let k = 1; k <= 100; k++) B.push({ id: `teste-casa-${k}`, nome: `Casa teste ${k}`, tipo: 'casa', posicao: { i: 0, j: 0 }, tamanho: { w: 1, d: 1 }, status: 'pronto', bairro: 'Teste' });
  W('buildings.json', B);
  cli('fila', 'config', '--capacidade', '100');
  const { abrir, adicionarPendente, gravar, categoriaDoNumero } = await import('./lib/cidade');
  process.env.SEGUECITY_DATA = dir;
  check('categoriaDoNumero: 10 FUNDADOR · 11 PIONEIRO · 100 PIONEIRO · 101 CIDADÃO', categoriaDoNumero(10) === 'FUNDADOR' && categoriaDoNumero(11) === 'PIONEIRO' && categoriaDoNumero(100) === 'PIONEIRO' && categoriaDoNumero(101) === 'CIDADÃO');
  void abrir; void adicionarPendente; void gravar;
  for (let k = 1; k <= 95; k++) add('--nome', `Teste ${String(k).padStart(3, '0')}`, '--profissao', 'Policial', '--data', '2026-11-28');
  oficializaDia(2);
  check('incorpora 95 no ep03', cli('fila', 'incorporar', '--episodio', 'ep03').ok);
  R = J('residents.json');
  const porNum = (n: number) => R.find((r: any) => r.numero === n);
  check('nº 11 e nº 100 são PIONEIRO', porNum(11)?.categoria === 'PIONEIRO' && porNum(100)?.categoria === 'PIONEIRO');
  check('nº 101 em diante são CIDADÃO', porNum(101)?.categoria === 'CIDADÃO' && porNum(105)?.categoria === 'CIDADÃO');
  check('os 10 fundadores continuam FUNDADOR, com título e distintivo', R.filter((r: any) => r.fundador && r.categoria === 'FUNDADOR' && r.titulos.includes('MORADOR FUNDADOR') && r.distintivo === 'fundador-ouro').length === 10);
  check('ninguém além deles tem o título', !R.some((r: any) => !J('city-state.json').fundadores.ids.includes(r.id) && (r.titulos ?? []).includes('MORADOR FUNDADOR')));
  // tentativa de adulterar: tira o título de um fundador e dá a outro
  R.find((r: any) => r.id === 'm0003').titulos = []; delete R.find((r: any) => r.id === 'm0003').fundador;
  Object.assign(R.find((r: any) => r.numero === 11), { fundador: true, titulos: ['MORADOR FUNDADOR'], categoria: 'FUNDADOR' });
  W('residents.json', R);
  cli('city', 'seguidores', '5');
  R = J('residents.json');
  check('sync devolve o título ao fundador e retira do outro', R.find((r: any) => r.id === 'm0003').fundador === true && R.find((r: any) => r.numero === 11).categoria === 'PIONEIRO' && !(R.find((r: any) => r.numero === 11).titulos ?? []).includes('MORADOR FUNDADOR'));
  check('personagem de teste não ganha número nem categoria', cli('city', 'add', '--nome', 'Teste Fict', '--profissao', 'medico', '--teste').ok && (() => { const t = J('residents.json').at(-1); return t.ficticio === true && t.numero === undefined && t.categoria === undefined; })());

  // ------------------------------------------------------------------ 10. snapshots e episódios encerrados
  console.log('\n[8] snapshots históricos e episódios encerrados');
  copia();
  const h01 = createHash('sha256').update(readFileSync(path.join(dir, 'snapshots/dia-01.json'))).digest('hex');
  check('snapshot oficial existente não é sobrescrito', /não são sobrescritos/.test(cli('snapshot', '1').out) && createHash('sha256').update(readFileSync(path.join(dir, 'snapshots/dia-01.json'))).digest('hex') === h01);
  check('incorporar no ep02 é recusado', /em produção ou com a lista encerrada/.test(cli('fila', 'incorporar', '--episodio', 'ep02').out));
  add('--nome', 'Teste Bia', '--profissao', 'Policial');
  check('incorporar no ep03 sem o Dia 02 oficial é recusado', /falta o snapshot oficial do Dia 02/.test(cli('fila', 'incorporar', '--episodio', 'ep03').out));
  oficializaDia(2);
  cli('fila', 'incorporar', '--episodio', 'ep03');
  const E = J('episodes.json');
  check('elenco do ep02 continua os 10 fundadores', JSON.stringify(E.find((e: any) => e.id === 'ep02').lista.moradores) === JSON.stringify(J('city-state.json').fundadores.ids));
  check('ep03 encerrado não recebe mais ninguém', add('--nome', 'Teste Cy', '--profissao', 'Policial').ok && J('pending-residents.json').pendentes.at(-1).episodioPrevisto === 'ep04');

  rmSync(dir, { recursive: true, force: true });
  check('dados reais intactos depois de todos os testes', hashReal() === hashAntes);
  console.log(`\n${ok} ok, ${falhas} falha(s)`);
  if (falhas) process.exit(1);
}
main().catch((e) => { console.error(e); process.exit(1); });
void existsSync;
