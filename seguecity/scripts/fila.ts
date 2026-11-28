// Fila de entrada de moradores (data/pending-residents.json). Regras em scripts/lib/cidade.ts.
//   npm run fila                                         situação da fila, capacidade e episódios previstos
//   npm run fila:add -- --nome "Lia" --profissao "Dentista" [--data 2026-11-29] [--comentario <id ou link>] [--homonimo]
//        registra um comentário real (nome do personagem + profissão como escrita). Duplicados são barrados.
//   npm run fila:agendar                                 recalcula o episódio previsto de cada pedido
//   npm run fila:recusar -- --id f0003 --motivo "pedido retirado pela pessoa"
//   npm run fila:incorporar -- --episodio ep03 [--adiar-sem-profissao]
//        os pedidos agendados para o episódio viram moradores e a lista do episódio é encerrada
// Nada aqui cria pedidos sozinho: todo pedido vem de um comentário real informado pelo operador.
import path from 'node:path';
import { ROOT } from './lib/env';
import { DATA, abrir, adicionarPendente, agendar, casasLivres, fila, gravar, incorporar, primeiroEpisodioLivre, recusar, travado, epId } from './lib/cidade';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const db = abrir();
const F = fila(db);
const cmd = args[0] ?? 'status';

function status() {
  const em = F.pendentes.filter((p) => !['incorporado', 'recusado'].includes(p.status));
  const livres = casasLivres(db).length;
  console.log(`Fila de entrada · ${em.length} em espera · ${F.pendentes.filter((p) => p.status === 'incorporado').length} incorporados · ${F.pendentes.filter((p) => p.status === 'recusado').length} recusados`);
  console.log(`Capacidade: ${F.regras.capacidadePorEpisodio} por episódio (narrativa) · ${livres} casa(s) livre(s) (moradia) · próximo episódio livre: ${epId(primeiroEpisodioLivre(db))}`);
  const travados = db.episodes.filter((e) => /^ep\d+$/.test(e.id) && travado(db, e.id)).map((e) => `${e.id}${e.lista?.encerrada ? ` (lista encerrada: ${e.lista.moradores.length})` : ` (${e.status})`}`);
  console.log(`Episódios travados (não recebem moradores): ${travados.join(', ') || '—'}`);
  const grupos = new Map<string, typeof F.pendentes>();
  for (const p of F.pendentes) { const k = p.status === 'agendado' ? `agendado ${p.episodioPrevisto}` : p.status; grupos.set(k, [...(grupos.get(k) ?? []), p]); }
  for (const [k, ps] of grupos) {
    console.log(`\n${k.toUpperCase()} (${ps.length})`);
    for (const p of ps) console.log(`  ${p.id} ${p.nome} — ${p.profissao}${p.profissaoId ? '' : ' [profissão nova]'} · pedido em ${p.dataSolicitacao}${p.moradorId ? ` · morador ${p.moradorId}` : ''}${p.motivo ? ` · ${p.motivo}` : ''}${p.aviso ? ` · aviso: ${p.aviso}` : ''}`);
  }
  if (!F.pendentes.length) console.log('\n(nenhum pedido registrado ainda)');
}

if (cmd === 'add') {
  const nome = opt('--nome'), prof = opt('--profissao');
  if (!nome || !prof) throw new Error('uso: fila:add -- --nome "Nome do personagem" --profissao "Profissão como comentada" [--data AAAA-MM-DD] [--comentario <id>] [--homonimo]');
  const p = adicionarPendente(db, { nome, profissao: prof, data: opt('--data'), comentarioId: opt('--comentario'), homonimo: args.includes('--homonimo') });
  gravar(db);
  console.log(`registrado ${p.id}: ${p.nome} — ${p.profissao} · ${p.status}${p.episodioPrevisto ? ` para o ${p.episodioPrevisto}` : ''}${p.profissaoId ? '' : ' · PROFISSÃO NOVA (criar em jobs.json antes de incorporar)'}${p.status === 'aguardando-moradia' ? ` · ${p.motivo}` : ''}${p.aviso ? ` · aviso: ${p.aviso}` : ''}`);
} else if (cmd === 'agendar') {
  agendar(db); gravar(db); status();
} else if (cmd === 'recusar') {
  const id = opt('--id'), motivo = opt('--motivo') ?? '';
  if (!id) throw new Error('uso: fila:recusar -- --id f0003 --motivo "..."');
  recusar(db, id, motivo); gravar(db);
  console.log(`${id} recusado: ${motivo}`);
} else if (cmd === 'incorporar') {
  const ep = opt('--episodio');
  if (!ep || !/^ep\d+$/.test(ep)) throw new Error('uso: fila:incorporar -- --episodio ep03 [--adiar-sem-profissao]');
  const r = incorporar(db, ep, { snapshotsDir: path.join(DATA, 'snapshots'), adiarSemProfissao: args.includes('--adiar-sem-profissao') });
  gravar(db);
  console.log(`${ep}: ${r.incorporados.length} morador(es) incorporado(s) (${r.incorporados.join(', ')}); lista do ${ep} encerrada${r.adiados.length ? `; adiados por profissão nova: ${r.adiados.join(', ')}` : ''}`);
} else {
  status();
}
void ROOT;
