// Fila de entrada de moradores (data/pending-residents.json). Regras em scripts/lib/cidade.ts.
//   npm run fila                                         situação da fila, capacidade e episódios previstos
//   npm run fila:add -- --nome "Lia" --profissao "Dentista" [--tiktok usuario] [--data 2026-11-29] [--comentario <id ou link>] [--homonimo]
//        registra um comentário real (nome do personagem + profissão como escrita). Duplicados são barrados; a pessoa
//        é identificada primeiro pelo usuário do TikTok e pela referência do comentário (homônimos legítimos passam).
//   npm run fila:atualizar -- --id f0003 --profissao "Advogada"     troca a profissão de um pedido (mesmo registro)
//   npm run fila:config -- --capacidade 12 [--episodio ep04] [--alerta 0.8]   limite por episódio e alerta de moradia
//   npm run fila:agendar                                 recalcula o episódio previsto de cada pedido
//   npm run fila:recusar -- --id f0003 --motivo "pedido retirado pela pessoa"
//   npm run fila:incorporar -- --episodio ep03 [--adiar-sem-profissao]
//        os pedidos agendados para o episódio viram moradores e a lista do episódio é encerrada
// Nada aqui cria pedidos sozinho: todo pedido vem de um comentário real informado pelo operador.
import path from 'node:path';
import { ROOT } from './lib/env';
import { DATA, abrir, adicionarPendente, agendar, atualizarPendente, capacidadeDo, configurar, fila, gravar, incorporar, indicadores, primeiroEpisodioLivre, recusar, travado, epId } from './lib/cidade';

const args = process.argv.slice(2);
const opt = (k: string) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const db = abrir();
const F = fila(db);
const cmd = args[0] ?? 'status';

function status() {
  const I = indicadores(db);
  const prox = epId(primeiroEpisodioLivre(db));
  console.log(`Fila de entrada · ${I.fila.emEspera} em espera (${I.fila.agendados} agendados, ${I.fila.aguardandoMoradia} sem moradia, ${I.fila.aguardandoProfissao} sem profissão) · ${I.fila.incorporados} incorporados · ${I.fila.recusados} recusados`);
  const esp = Object.entries(F.regras.capacidadePorEpisodioEspecifica ?? {}).map(([e, v]) => `${e}: ${v}`).join(', ');
  console.log(`Capacidade narrativa: ${F.regras.capacidadePorEpisodio} por episódio${esp ? ` (exceções: ${esp})` : ''} · próximo episódio livre: ${prox} (${capacidadeDo(db, prox)})`);
  console.log(`Moradia: capacidade ${I.moradia.capacidade} · ocupadas ${I.moradia.ocupadas} (${I.moradia.ocupacaoPct}%) · livres ${I.moradia.livres} · ocupação prevista com os agendados ${I.moradia.ocupacaoProjetadaPct}%`);
  console.log(`Empregos: ${I.empregos.ocupados}/${I.empregos.total} ocupados · ${I.empregos.livres} vagas livres · ${I.empregos.disponiveis} disponíveis agora (${I.empregos.emPredioPlanejado} em prédio planejado, ${I.empregos.dependemDaEleicao} dependem da eleição)`);
  console.log(`Demanda reprimida: ${I.demandaReprimida.total} (${I.demandaReprimida.semMoradia} sem moradia, ${I.demandaReprimida.semProfissao} sem profissão) · déficit de moradia se toda a fila entrasse: ${I.demandaReprimida.deficitDeMoradia}`);
  console.log(I.alerta ? `⚠ ALERTA DE EXPANSÃO (${I.alerta.nivel}): ${I.alerta.mensagem}` : `Alerta de expansão: não (dispara em ${Math.round(F.regras.alertaExpansao * 100)}% de ocupação)`);
  const travados = db.episodes.filter((e) => /^ep\d+$/.test(e.id) && travado(db, e.id)).map((e) => `${e.id}${e.lista?.encerrada ? ` (lista encerrada: ${e.lista.moradores.length})` : ` (${e.status})`}`);
  console.log(`Episódios travados (não recebem moradores): ${travados.join(', ') || '—'}`);
  const grupos = new Map<string, typeof F.pendentes>();
  for (const p of F.pendentes) { const k = p.status === 'agendado' ? `agendado ${p.episodioPrevisto}` : p.status; grupos.set(k, [...(grupos.get(k) ?? []), p]); }
  for (const [k, ps] of grupos) {
    console.log(`\n${k.toUpperCase()} (${ps.length})`);
    for (const p of ps) console.log(`  ${p.id} ${p.nome}${p.tiktok_username ? ` @${p.tiktok_username}` : ''} — ${p.profissao}${p.profissaoId ? '' : ' [profissão nova]'} · pedido em ${p.dataSolicitacao}${p.moradorId ? ` · morador ${p.moradorId}` : ''}${p.motivo ? ` · ${p.motivo}` : ''}${p.aviso ? ` · aviso: ${p.aviso}` : ''}`);
  }
  if (!F.pendentes.length) console.log('\n(nenhum pedido registrado ainda)');
}

if (cmd === 'add') {
  const nome = opt('--nome'), prof = opt('--profissao');
  if (!nome || !prof) throw new Error('uso: fila:add -- --nome "Nome do personagem" --profissao "Profissão como comentada" [--tiktok usuario] [--data AAAA-MM-DD] [--comentario <id>] [--homonimo]');
  const p = adicionarPendente(db, { nome, profissao: prof, data: opt('--data'), comentarioId: opt('--comentario'), homonimo: args.includes('--homonimo'), tiktok_username: opt('--tiktok') });
  gravar(db);
  console.log(`registrado ${p.id}: ${p.nome} — ${p.profissao} · ${p.status}${p.episodioPrevisto ? ` para o ${p.episodioPrevisto}` : ''}${p.profissaoId ? '' : ' · PROFISSÃO NOVA (criar em jobs.json antes de incorporar)'}${p.status === 'aguardando-moradia' || p.status === 'aguardando-profissao' ? ` · ${p.motivo}` : ''}${p.aviso ? ` · aviso: ${p.aviso}` : ''}`);
} else if (cmd === 'atualizar') {
  const id = opt('--id'), prof = opt('--profissao');
  if (!id || !prof) throw new Error('uso: fila:atualizar -- --id f0003 --profissao "Nova profissão"');
  const p = atualizarPendente(db, id, prof); gravar(db);
  console.log(`${p.id} ${p.nome}: agora ${p.profissao} · ${p.status}${p.episodioPrevisto ? ` para o ${p.episodioPrevisto}` : ''} (histórico: ${p.historico!.map((h) => `${h.de} → ${h.para}`).join(', ')})`);
} else if (cmd === 'config') {
  const cap = opt('--capacidade'), al = opt('--alerta');
  configurar(db, { capacidade: cap !== undefined ? Number(cap) : undefined, episodio: opt('--episodio'), alerta: al !== undefined ? Number(al) : undefined });
  gravar(db); status();
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
