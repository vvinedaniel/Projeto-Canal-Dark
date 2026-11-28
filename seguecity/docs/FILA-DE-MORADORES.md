# Fila de entrada de moradores

Os comentários novos entram numa **fila** (`data/pending-residents.json`) e só viram moradores quando um
episódio os incorpora. Funciona só com a persistência JSON local: não há site, banco de dados nem serviço
externo.

## Regras (aplicadas pelo código, em `scripts/lib/cidade.ts`)

1. **Nada inventado.** Todo pedido vem de um comentário real, digitado pelo operador: nome do personagem e
   profissão como foi escrita. Nenhum comando cria pedidos ou moradores sozinho. O único gerador de
   nomes (`residents:seed`) faz personagens de teste, marcados `"ficticio": true`, que nunca contam.
2. **Moradores reais só entram pela fila.** `residents:add` sem `--teste` é recusado e aponta para
   `fila:add`.
3. **Sem duplicados.** O cadastro é barrado quando:
   - o mesmo comentário (`--comentario <id>`) já está na fila;
   - o mesmo nome + profissão já é morador (inclusive fundador) ou já está na fila, sem diferenciar
     maiúsculas e acentos ("teste caio / professor" = "Teste Caio / Professor");
   - o mesmo nome aparece com outra profissão. Pode ser outra pessoa ou a mesma pessoa mudando de ideia;
     só passa com `--homonimo`, quando o operador confirma que é outro comentário.

   Também são barradas data no futuro e entrada com caracteres inválidos.
4. **Episódio em produção não muda.** Um episódio fica **travado** quando já saiu do planejamento
   (pré-produção, produção, produzido) ou quando a lista dele foi encerrada. Episódio travado nunca
   recebe nem perde moradores. Hoje:
   - o **Ep. 01** é o produzido;
   - o **Ep. 02** tem a lista encerrada com os 10 fundadores (`episodes.json → ep02.lista`), e o código
     do Ep. 02 lê o elenco dessa lista;
   - o primeiro episódio livre é o **Ep. 03**.
5. **Capacidade.** Os pedidos são distribuídos pelos próximos episódios livres, em ordem de chegada (data
   do comentário e, no empate, ordem de registro), com dois limites:
   - **narrativa:** no máximo `regras.capacidadePorEpisodio` (10) moradores novos por episódio;
   - **moradia:** só enquanto houver casa pronta e livre (hoje 14). Passou disso, o pedido fica
     `aguardando-moradia`, sem episódio previsto, até a cidade ganhar moradias. Os apartamentos ainda
     não têm unidades definidas e por isso não contam; definir unidades é uma decisão de história.
   - Quando a profissão já não tem vaga (ex.: 2 mecânicos na oficina), aparece um **aviso**. Ele não
     bloqueia, mas lembra que a história precisa abrir vaga ou um novo local.
6. **Profissão que ainda não existe** (ex.: Dentista): o pedido é agendado normalmente, mas não pode ser
   incorporado até a profissão ser criada em `jobs.json`, com prédio, vagas e roupa (como foi feito com
   neurocirurgiã, coveiro, advogada e empresário/empresária). Também dá para adiá-lo com
   `--adiar-sem-profissao`.
7. **Fundadores para sempre.** `city-state.json → fundadores` é uma lista **fechada** com os 10 ids
   (m0001–m0010). O título MORADOR FUNDADOR e o distintivo dourado são exclusivos desses 10.
   - Se alguém apagar o título à mão, ele volta no próximo `sync`.
   - Se alguém der o título a outro morador, ele é retirado.
   - Se um fundador sumir de `residents.json`, os comandos param com erro.
8. **Estado congelado antes de mudar a cidade.** Incorporar no Ep. N exige o snapshot **oficial** do Dia
   N−1 (`data/snapshots/dia-(N−1).json`). Assim o estado mostrado no episódio anterior fica registrado
   antes de chegarem moradores novos. O snapshot oficial do Dia 02 é gravado depois da aprovação do Ep. 02.

## Cada pedido (`pending-residents.json → pendentes[]`)

| Campo | Conteúdo |
|---|---|
| `id` | identificador único `f0001`, `f0002`… (nunca reaproveitado) |
| `nome` | nome do personagem, como comentado |
| `profissao` | profissão exatamente como comentada ("Médica", "Neurocirurgiã"…) |
| `profissaoId` | id em `jobs.json`, reconhecido pelas formas masculina e feminina; `null` se ainda não existe |
| `dataSolicitacao` | data do comentário (AAAA-MM-DD) |
| `status` | `pendente` · `agendado` · `aguardando-moradia` · `incorporado` · `recusado` |
| `episodioPrevisto` | `ep03`, `ep04`…; `null` sem capacidade |
| `fonte` | "comentário no TikTok" |
| `comentarioId` | opcional: id ou link do comentário, para barrar duplicados com certeza |
| `homonimo` | `true` se o operador confirmou que é outra pessoa com o mesmo nome |
| `motivo` / `aviso` | por que está esperando ou foi recusado / alerta de vaga esgotada |
| `moradorId`, `incorporadoEm` | depois de incorporado |

## Comandos

```bash
npm run fila                                              # situação: em espera, capacidade, episódios previstos
npm run fila:add -- --nome "Lia" --profissao "Dentista" --data 2026-11-29 --comentario 7312345
npm run fila:add -- --nome "Mateus" --profissao "Advogado" --homonimo   # outra pessoa chamada Mateus
npm run fila:recusar -- --id f0007 --motivo "pedido retirado pela pessoa"
npm run fila:agendar                                      # recalcula (ex.: depois de mudar a capacidade)
npm run fila:incorporar -- --episodio ep03                # os agendados do ep03 viram moradores; lista do ep03 encerrada
npm run fila:incorporar -- --episodio ep03 --adiar-sem-profissao
npm run city:status                                       # moradores, fundadores, casas, empregos, fila
```

## Fluxo de um episódio novo (ex.: Ep. 03)

1. Durante a semana, registre cada comentário válido com `fila:add`.
2. Aprovado o Ep. 02, congele o Dia 02 com `npm run city:snapshot` (grava o `dia-02.json` oficial).
3. Crie em `jobs.json` as profissões novas que estiverem na fila, ou adie esses pedidos.
4. Rode `npm run fila:incorporar -- --episodio ep03`. Os moradores recebem casa, trabalho e aparência
   persistente, e a lista do Ep. 03 fica encerrada.
5. Avance o dia (`npm run city:dia -- 3`), produza o episódio e grave o `dia-03.json`.

## Testado (numa cópia dos dados, `SEGUECITY_DATA=<pasta>`, sem tocar nos dados reais)

- **Duplicados:** a mesma pessoa e profissão, com outra caixa ou acento, foi barrada. O mesmo comentário
  e um fundador repetido (Mateus / Médico) também. O mesmo nome com outra profissão só passou com
  `--homonimo`.
- **Datas:** data no futuro foi recusada.
- **Capacidade:** com 16 pedidos, 10 foram para o Ep. 03 e 4 para o Ep. 04 (acabaram as 14 casas); 2
  ficaram aguardando moradia.
- **Episódios travados:** incorporar no Ep. 02 foi recusado. Incorporar no Ep. 03 sem o snapshot oficial
  do Dia 02 também.
- **Profissão nova:** "Dentista" bloqueou a incorporação; com `--adiar-sem-profissao` foi para o Ep. 04.
- **Ordem:** os moradores novos foram numerados por data do comentário.
- **Fundadores:** os 10 continuaram intactos. O título apagado à mão voltou, e o título dado a outro
  morador foi retirado.
