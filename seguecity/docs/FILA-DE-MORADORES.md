# Fila de entrada de moradores

Os comentários novos entram numa **fila** (`data/pending-residents.json`) e só viram moradores quando um
episódio os incorpora. Funciona só com a persistência JSON local: não há site, banco de dados nem serviço
externo.

## Regras (aplicadas pelo código, em `scripts/lib/cidade.ts`)

1. **Nada inventado.** Todo pedido vem de um comentário real, digitado pelo operador: nome do personagem e
   profissão como foi escrita. Nenhum comando cria pedidos ou moradores sozinho. O único gerador de
   nomes (`residents:seed`) faz personagens de teste, marcados `"ficticio": true`. Eles nunca contam e não
   ganham número nem categoria.
2. **Moradores reais só entram pela fila.** `residents:add` sem `--teste` é recusado e aponta para
   `fila:add`.
3. **Quem é quem.** A identificação mais forte vem primeiro:
   1. **usuário do TikTok** (`--tiktok`, campo `tiktok_username`, opcional). É gravado sem @ e em
      minúsculas e só aceita letras, números, `.` e `_` (2–24 caracteres).
      - Se o usuário já é morador, o pedido é barrado e o comando sugere `moradores:profissao`.
      - Se o usuário já está na fila, o pedido é barrado e o comando sugere `fila:atualizar`.
   2. **referência do comentário** (`--comentario <id ou link>`). O mesmo comentário nunca entra duas vezes.
   3. **nome**, sem diferenciar maiúsculas e acentos:
      - Mesmo nome com **usuários diferentes** é homônimo legítimo e entra sem pedir nada. Fica marcado
        `homonimo: true`.
      - Mesmo nome + mesma profissão sem usuário dos dois lados é barrado como duplicado. Também vale
        para fundadores, como Mateus / Médico. Só passa com `--homonimo` **e** `--tiktok` ou
        `--comentario`, que provam que é outro comentário.
      - Mesmo nome com outra profissão pode ser outra pessoa ou a mesma pessoa mudando de ideia. Só
        passa com `--homonimo`. Se for a mesma pessoa, use `fila:atualizar`.

   Também são barradas data no futuro e entrada com caracteres inválidos.
4. **Episódio em produção não muda.** Um episódio fica **travado** quando já saiu do planejamento
   (pré-produção, produção, produzido) ou quando a lista dele foi encerrada. Episódio travado nunca
   recebe nem perde moradores, e a capacidade dele não pode ser mudada. Hoje:
   - o **Ep. 01** é o produzido;
   - o **Ep. 02** tem a lista encerrada com os 10 fundadores (`episodes.json → ep02.lista`), e o código
     do Ep. 02 lê o elenco dessa lista;
   - o primeiro episódio livre é o **Ep. 03**.
5. **Capacidade configurável.** Os pedidos são distribuídos pelos próximos episódios livres, em ordem de
   chegada (data do comentário e, no empate, ordem de registro). Há dois limites:
   - **narrativa:** `regras.capacidadePorEpisodio` moradores novos por episódio. O padrão continua **10**.
     - Muda com `npm run fila:config -- --capacidade 12`.
     - Uma exceção para um episódio fica em `regras.capacidadePorEpisodioEspecifica`:
       `fila:config -- --capacidade 5 --episodio ep04`.
     - Aceita de 1 a 100, e a fila é recalculada na hora.
   - **moradia:** só enquanto houver casa pronta e livre (hoje 14). Os apartamentos ainda não têm
     unidades definidas e por isso não contam. Para contarem, defina `unidades` no prédio em
     `buildings.json`; essa é uma decisão de história.
6. **Nenhum pedido se perde.** Sem casa, o pedido fica `aguardando-moradia`. Sem profissão na cidade
   (ex.: Dentista), fica `aguardando-profissao`. Nos dois casos:
   - o pedido continua na fila, na mesma posição;
   - não ocupa vaga de episódio nem casa;
   - não bloqueia a incorporação dos outros;
   - volta a ser agendado sozinho quando surgir a casa ou a profissão em `jobs.json`, com prédio, vagas
     e roupa (como foi feito com neurocirurgiã, coveiro, advogada e empresário/empresária).

   Quando a profissão existe mas já não tem vaga (ex.: 2 mecânicos na oficina), aparece um **aviso**. Ele
   não bloqueia, mas lembra que a história precisa abrir vaga ou um novo local.
7. **Fundadores para sempre.** `city-state.json → fundadores` é uma lista **fechada** com os 10 ids
   (m0001–m0010). O título MORADOR FUNDADOR, o distintivo dourado e a categoria FUNDADOR são exclusivos
   desses 10.
   - Se alguém apagar o título à mão, ele volta no próximo `sync`.
   - Se alguém der o título ou a categoria a outro morador, eles são retirados.
   - Se um fundador sumir de `residents.json`, os comandos param com erro.
8. **Categorias pelo número do morador.** Cada morador real recebe um `numero` permanente, pela ordem de
   chegada, e a `categoria` correspondente:

   | Número | Categoria |
   |---|---|
   | 1–10 | **FUNDADOR** (lista fechada acima) |
   | 11–100 | **PIONEIRO** |
   | 101 em diante | **CIDADÃO** |

   O número e a categoria não mudam depois de atribuídos, nem se a profissão mudar.
9. **Troca de profissão sem duplicar.**
   - **Pedido na fila:** `fila:atualizar` muda a profissão no mesmo pedido (mesmo `id`) e grava o
     `historico`.
   - **Morador:** `moradores:profissao` (por `--id` ou `--tiktok`) muda a profissão no mesmo registro:
     mesmo `id`, número, categoria, casa, rosto, cabelo e corpo. Mudam o trabalho e o uniforme, e a troca
     fica em `historicoProfissoes`.
     - A troca fica bloqueada enquanto o morador estiver no elenco de um episódio que ainda não tem o
       snapshot oficial do dia. Assim o episódio em produção não muda.
     - Hoje isso vale para os 10 fundadores, até o `dia-02.json` oficial.
10. **Estado congelado antes de mudar a cidade.** Incorporar no Ep. N exige o snapshot **oficial** do Dia
    N−1 (`data/snapshots/dia-(N−1).json`). Assim o estado mostrado no episódio anterior fica registrado
    antes de chegarem moradores novos.
    - Snapshots oficiais nunca são sobrescritos.
    - O snapshot oficial do Dia 02 é gravado depois da aprovação do Ep. 02.

## Indicadores e alerta de expansão

Todo comando que muda a fila ou os moradores recalcula `city-state.json → indicadores`:

| Indicador | Conteúdo |
|---|---|
| `moradia.capacidade` | casas prontas + unidades de apartamento definidas |
| `moradia.ocupadas` / `livres` / `ocupacaoPct` | ocupação atual |
| `moradia.ocupacaoProjetadaPct` | ocupação se todos os pedidos agendados entrarem |
| `empregos.total` / `ocupados` / `livres` / `disponiveis` | vagas de trabalho. `disponiveis` são as livres que um morador novo pode ocupar agora: não contam as de prédio ainda planejado (`emPredioPlanejado`) nem a de prefeito antes da eleição (`dependemDaEleicao`) |
| `fila.*` | em espera, agendados, aguardando moradia, aguardando profissão, incorporados, recusados |
| `demandaReprimida` | pedidos que a cidade não consegue atender agora (`semMoradia` + `semProfissao`) e o déficit de casas se toda a fila entrasse |

O **alerta de expansão** dispara quando a ocupação chega a `regras.alertaExpansao` (80%):

- `previsto`: os pedidos agendados vão levar a cidade a 80% ou mais;
- `atingido`: a ocupação atual já está em 80% ou mais.

O alerta aparece em `npm run fila` e em `npm run city:status`, e fica registrado em
`city-state.json → alertas`, com a data. Ele é marcado como resolvido quando a ocupação cai.
**O alerta não constrói nada.** Novas moradias são decisão de história, tomada por quem produz o episódio.

No fim do Dia 02: 24 casas, 10 ocupadas (41,7%), 0 pedidos e nenhum alerta. As vagas são 58 no total, 10 ocupadas,
48 livres e 44 disponíveis. A próxima meta (`evolucao.proximaMeta`, calculada pelo `sync`) é "Novo bairro (10/50 moradores)",
e a eleição está em 18/100 seguidores.

## Cada pedido (`pending-residents.json → pendentes[]`)

| Campo | Conteúdo |
|---|---|
| `id` | identificador único `f0001`, `f0002`… (nunca reaproveitado) |
| `nome` | nome do personagem, como comentado |
| `profissao` | profissão exatamente como comentada ("Médica", "Neurocirurgiã"…) |
| `profissaoId` | id em `jobs.json`, reconhecido pelas formas masculina e feminina; `null` se ainda não existe |
| `dataSolicitacao` | data do comentário (AAAA-MM-DD) |
| `status` | `pendente` · `agendado` · `aguardando-moradia` · `aguardando-profissao` · `incorporado` · `recusado` |
| `episodioPrevisto` | `ep03`, `ep04`…; `null` enquanto espera casa ou profissão |
| `fonte` | "comentário no TikTok" |
| `tiktok_username` | opcional: usuário de quem comentou (sem @) |
| `comentarioId` | opcional: id ou link do comentário |
| `homonimo` | `true` quando é outra pessoa com o mesmo nome |
| `historico` | trocas de profissão: data, de, para, fonte |
| `motivo` / `aviso` | por que está esperando ou foi recusado / alerta de vaga esgotada |
| `moradorId`, `incorporadoEm` | depois de incorporado |

**Privacidade:** o usuário do TikTok serve só para identificar a pessoa nos dados. Ele nunca aparece no
vídeo, nas capas nem nos snapshots. Fica em `pending-residents.json` e `residents.json`.

## Comandos

```bash
npm run fila                                              # situação: fila, capacidade, moradia, demanda, alerta
npm run fila:add -- --nome "Lia" --profissao "Dentista" --data 2026-11-29 --tiktok lia.exemplo --comentario 7312345
npm run fila:add -- --nome "Mateus" --profissao "Advogado" --homonimo   # outra pessoa chamada Mateus
npm run fila:atualizar -- --id f0003 --profissao "Médica" # a pessoa mudou de ideia (mesmo pedido)
npm run fila:config -- --capacidade 12                    # limite padrão por episódio
npm run fila:config -- --capacidade 5 --episodio ep04     # exceção para um episódio
npm run fila:config -- --alerta 0.8                       # limite do alerta de expansão
npm run fila:recusar -- --id f0007 --motivo "pedido retirado pela pessoa"
npm run fila:agendar                                      # recalcula (ex.: depois de criar uma profissão)
npm run fila:incorporar -- --episodio ep03                # os agendados do ep03 viram moradores; lista do ep03 encerrada
npm run moradores:profissao -- --tiktok lia.exemplo --profissao "Médica"   # troca a profissão de um morador
npm run moradores:usuario -- --id m0002 --tiktok usuario  # liga o usuário do TikTok a um morador já existente
npm run city:sync                                         # recalcula contadores, categorias e indicadores
npm run city:status                                       # moradores, categorias, casas, empregos, fila, alerta
npm run test:fila                                         # testes automáticos (numa cópia dos dados)
```

## Fluxo de um episódio novo (ex.: Ep. 03)

1. Durante a semana, registre cada comentário válido com `fila:add`, de preferência com `--tiktok`.
2. O Dia 02 já está congelado: `data/snapshots/dia-02.json` foi gravado em 28/11/2026.
3. Veja `npm run fila`: pedidos aguardando profissão, demanda reprimida e alerta de expansão. Crie em
   `jobs.json` as profissões que a história vai abrir e rode `fila:agendar`.
4. Rode `npm run fila:incorporar -- --episodio ep03`. Os moradores recebem número, categoria (PIONEIRO a
   partir do nº 11), casa, trabalho e aparência persistente, e a lista do Ep. 03 fica encerrada.
5. Avance o dia (`npm run city:dia -- 3`), produza o episódio e grave o `dia-03.json`.

## Testes (`npm run test:fila`: 54 verificações, numa cópia dos dados)

Os testes rodam numa pasta temporária (`SEGUECITY_DATA`) e conferem no fim que os dados reais não mudaram.

- **Regras anteriores:**
  - duplicados por nome, profissão, comentário e fundador;
  - homônimo com `--homonimo`;
  - data no futuro;
  - reconhecimento de "Médica";
  - cadastro direto recusado.
- **Usuário do TikTok:**
  - normalização do usuário;
  - usuário repetido barrado, na fila e entre moradores;
  - homônimos legítimos com usuários diferentes;
  - usuário inválido recusado.
- **Capacidade:**
  - 10 por padrão (10 no Ep. 03 e 4 no Ep. 04);
  - mudança para 12;
  - exceção de 5 no Ep. 03;
  - episódio travado recusado.
- **Indicadores e alerta:**
  - 41,7% → previsto 83,3% (alerta `previsto`) → incorporado 83,3% (alerta `atingido`);
  - nenhum prédio criado;
  - 4 pedidos preservados aguardando moradia;
  - demanda reprimida = 4.
- **Sem profissão:**
  - Dentista aguarda sem ocupar vaga;
  - não bloqueia a incorporação;
  - é agendado para o Ep. 04 quando a profissão é criada.
- **Troca de profissão:**
  - mesmo pedido, com histórico;
  - fundador bloqueado enquanto o Ep. 02 não tem snapshot oficial;
  - morador trocado pelo usuário com o mesmo id, rosto e cabelo, novo uniforme e histórico, sem registro
    novo.
- **Categorias:**
  - nº 11 e nº 100 PIONEIRO, nº 101 em diante CIDADÃO;
  - os 10 fundadores intactos;
  - título e categoria adulterados à mão corrigidos pelo `sync`;
  - personagem de teste sem número.
- **Snapshots:**
  - `dia-01.json` não é sobrescrito;
  - Ep. 02 recusado;
  - Ep. 03 sem o Dia 02 oficial recusado;
  - elenco do Ep. 02 intacto;
  - Ep. 03 encerrado não recebe mais ninguém.
