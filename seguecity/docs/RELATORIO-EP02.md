# Relatório de qualidade — Ep. 02 "OS PRIMEIROS MORADORES CHEGARAM!"

Data: 28/11/2026. **Versão final aprovada (capa B). Nada foi publicado.** Produção do Dia 02 encerrada.

## Arquivos

| Entrega | Arquivo |
|---|---|
| Vídeo original | `out/seguecity-ep02.mp4` |
| Versão leve (para baixar no app) | `out/seguecity-ep02-leve.mp4` |
| Legendas | `out/seguecity-ep02.srt` (27 blocos, mesmos tempos da tela) |
| Capas | **`out/ep02-capas/capa-B.png` (escolhida: UM COVEIRO NUMA CIDADE SEM CEMITÉRIO)**; alternativas `capa-A.png`, `capa-C.png` |
| Storyboard | `docs/STORYBOARD-EP02.md` |
| Folha de revisão (1 quadro/s) | `out/folha-ep02.jpg` |
| Snapshot oficial do Dia 02 | `data/snapshots/dia-02.json` (gravado em 28/11/2026, imutável; o rascunho foi removido) |
| Pacote | `out/seguecity-ep02-entrega.zip` |

## Especificação técnica (`npx tsx scripts/validate.ts out/seguecity-ep02.mp4 --dur 75`)

| Item | Pedido | Medido |
|---|---|---|
| Resolução | 1080 × 1920 nativo | 1080 × 1920, renderizado direto (sem ampliação) |
| Quadros | 30 fps, 2.250 quadros | 30,000 fps, 2.250 quadros contados |
| Duração | 75 s | 75,000 s |
| Vídeo | H.264 | H.264 High, yuv420p, faixa limitada BT.709 |
| Áudio | AAC | AAC 48 kHz estéreo, 192 kb/s |
| Volume | ≈ −14 LUFS | −14 LUFS integrado, pico verdadeiro −1,3 dBTP |
| Streaming | — | moov no início (faststart) |

## Narração e legendas

- **Voz:** `10_pessoas.mp3`, a mesma voz do Ep. 01 (ElevenLabs), recebida pronta. São 72,6 s de fala.
  - A voz não foi acelerada nem cortada.
  - Ganhou só três respiros: 0,08 s no início e 0,25 s e 0,20 s nas viradas do roteiro.
  - A voz termina em 73,1 s.
- **Transcrição:** feita localmente, com o modelo Whisper small (sherpa-onnx). Não foi usado nenhum serviço
  externo nem crédito pago.
  - Os nomes foram corrigidos pelo cadastro. O reconhecimento bruto ouviu "Alice", "Mury" e "Gabriele".
  - **Pronúncia de "Alicia", conferida em 28/11/2026:** a fala f11, aos 28,5 s, foi transcrita de novo,
    localmente, com o Whisper large-v3-turbo, um modelo bem mais preciso.
    - Ele reconhece **"Alicia e Muri escolheram ser empresários"** e "Mari chegou como neurocirurgiã".
    - Só o modelo pequeno ouvia "Alice".
    - "Gabrielly" sai escrito "Gabriele" nos dois modelos, que é a mesma pronúncia.
    - A voz foi mantida sem mudanças. É uma conferência automática; eu não ouço o áudio.

- **Legendas:**
  - palavra a palavra, com a palavra atual em amarelo;
  - os tempos vêm das frases medidas (silencedetect −35 dB / 0,22 s);
  - as palavras são distribuídas por sílaba e encaixadas nos vales de energia;
  - o mesmo `words.json` alimenta a tela, os efeitos, a trilha e o `.srt`.

## Conteúdo exigido

| Exigência | Como ficou |
|---|---|
| Gancho: 10 moradores e um coveiro numa cidade sem cemitério | No 1º quadro, o contador já sobe e as casas acendem uma a uma (0–2,5 s). Aos 3,1 s, Roberto aparece com a pá no terreno vazio; em "cemitério", falha de imagem, contorno vermelho e "CEMITÉRIO: 0". |
| Cemitério não é pedido do Roberto | A fala e a tela tratam o cemitério como decisão da cidade: "TERRENO RESERVADO · DECISÃO DA ADMINISTRAÇÃO" e "PROJETO DA CIDADE · OBRA FUTURA". Roberto só aparece como quem escolheu ser coveiro. |
| Os 10 fundadores, um a um, legíveis | Cada um tem uma ficha com retrato, nome (112 px), profissão como comentou (70 px), selo MORADOR FUNDADOR, casa e trabalho. Gabriel e Juan, e Alicia e Muri, aparecem em fichas lado a lado, com nome de 92 px. Depois, a grade dos 10 com nome e profissão. |
| Trabalhando, residências, cidade ganhando vida | Mateus chega à Casa 12. Davi patrulha. Gabriel e Juan trabalham na oficina, Mari está na enfermaria e Jorge no mercadinho. Alicia e Muri andam no Centro Empresarial. Aparecem ainda as 10 casas acesas, a viatura circulando e os 5 serviços acendendo. |
| Obras como projetos futuros | Os dois aparecem como planta holográfica, com "EM PROJETO · AINDA NÃO CONSTRUÍDO". As placas "EM BREVE" desses dois lotes foram escondidas para o terreno do cemitério aparecer vazio. As fichas dizem "(EM PROJETO)". |
| Categoria PIONEIRO | Painel "NOVA MISSÃO · ENCONTRAR OS PIONEIROS" com FUNDADORES 1–10 (10/10), **PIONEIROS 11–100 · OS PRÓXIMOS 90 (0/90)**, que acende em "pioneiros", e CIDADÃOS 101+ (bloqueado). |
| "PRÓXIMO MORADOR · PIONEIRO" | Substitui "MORADOR Nº 11 · ?": retrato "?" e selo PIONEIRO, sem número. |
| Marca ~4 s | A logo oficial entra em 71,3 s e fica até 75 s (3,7 s), com o acorde final em "SegueCity". "DIA 03 EM BREVE" só aparece depois que a voz termina. |
| Identidade V2.0 | Mesmo motor, paleta, HUD, fontes, transição em ladrilhos e logo oficial. Não houve recurso novo de motor. |

Ritmo: 23 planos em 75 s, de 1,97 s a 5,6 s cada. Cada palavra-chave da fala tem um estímulo na tela.
No máximo 2 rótulos no mundo ao mesmo tempo.

## Dados mostrados (todos de `data/episodes.json → ep02.estado`, congelados)

- **Moradores:** 10.
- **Seguidores:** **18**, informado pelo dono do canal em 28/11/2026. Fica na HUD, separado dos moradores,
  com a meta **ELEIÇÃO 18/100**. A lembrança do Dia 01 não mostra seguidores, porque esse número não existia
  naquele dia.
- **Próxima meta** (`city-state.evolucao.proximaMeta`): agora é calculada sozinha a cada `sync`. É a primeira
  meta ainda não concluída: **"Novo bairro (10/50 moradores)"**. Antes estava parada em "Primeiro morador".
- **Casas:** 24 no total, 10 ocupadas e 14 livres.
- **Serviços abertos:** 5 (Hospital, Delegacia, Oficina, Mercadinho e Centro Empresarial). São os prédios
  prontos com pelo menos um fundador trabalhando.
- **Vagas de emprego, revisadas depois das atribuições:** 58 no total, 10 ocupadas, **48 livres** e
  **44 disponíveis**.
  - Livres são as vagas não ocupadas.
  - Disponíveis são as livres que um morador novo pode ocupar agora.
  - A diferença são 3 vagas em prédios que ainda são projeto (1 de coveiro e 2 de advogado) e 1 de prefeito,
    que só abre com a eleição.
  - A HUD mostra "VAGAS 44 DISPONÍVEIS". O painel de casas e vagas mostra "44 VAGAS DE EMPREGO DISPONÍVEIS ·
    58 NO TOTAL · 10 OCUPADAS · 48 LIVRES · 3 EM OBRAS PLANEJADAS · 1 DE PREFEITO (ELEIÇÃO)".
  - Nos dados, `city-state.indicadores.empregos` e `episodes.json → ep02.estado.vagas` trazem `livres` e
    `disponiveis`. O `npm run fila` mostra os dois.
  - Mecânico (2/2) e neurocirurgião (1/1) estão lotados.

| Profissão | Local | Vagas | Ocupadas | Livres |
|---|---|---|---|---|
| Médico(a) | Hospital | 4 | 1 | 3 |
| Enfermeiro(a) | Hospital | 4 | 0 | 4 |
| Neurocirurgião(ã) | Hospital | 1 | 1 | 0 |
| Professor(a) | Escola Municipal | 6 | 0 | 6 |
| Diretor(a) escolar | Escola Municipal | 1 | 0 | 1 |
| Prefeito(a) | Prefeitura (só depois da eleição) | 1 | 0 | 1 |
| Servidor(a) público | Prefeitura | 3 | 0 | 3 |
| Jardineiro(a) | Prefeitura | 1 | 0 | 1 |
| Comerciante | Mercadinho | 3 | 1 | 2 |
| Padeiro(a) | Padaria | 2 | 0 | 2 |
| Farmacêutico(a) | Farmácia | 2 | 0 | 2 |
| Barista | Café | 1 | 0 | 1 |
| Sorveteiro(a) | Sorveteria | 1 | 0 | 1 |
| Policial | Delegacia | 4 | 1 | 3 |
| Mecânico(a) | Oficina Mecânica | 2 | 2 | 0 |
| Motorista | Terminal de Ônibus | 4 | 0 | 4 |
| Engenheiro(a) | Canteiro de Obras | 2 | 0 | 2 |
| Pedreiro(a) | Canteiro de Obras | 4 | 0 | 4 |
| Programador(a) | Centro Empresarial | 3 | 0 | 3 |
| Empresário(a) | Centro Empresarial | 4 | 2 | 2 |
| Coveiro(a) | Cemitério (em projeto) | 2 | 1 | 1 |
| Advogado(a) | Escritório de Advocacia (em projeto) | 3 | 1 | 2 |
| **Total** | | **58** | **10** | **48** |

## Continuidade e honestidade

- **Mateus:** é o Morador Nº 1 (confirmado) e o único numerado na tela.
- **Os outros nove:**
  - aparecem sem número;
  - nos dados, os ids técnicos (m0002–m0010) continuam estáveis;
  - os números 2–10 estão marcados como `numeroProvisorio: true`;
  - no snapshot, esses números ficam como `numero: null` e `numeroProvisorio: N`, para nenhum número
    provisório ser gravado como definitivo.
- **Comentários novos:** continuam na fila para o Ep. 03 em diante. A fila está vazia hoje, e a lista do
  Ep. 02 está encerrada com os 10 fundadores.
- **Aparência:** é fictícia, em pixel art e sem fotos. Nome e profissão vêm dos comentários.
- **Ep. 01:** não foi alterado, e o `dia-01.json` também não (hash conferido).

## Encerramento do Dia 02

- **Snapshot oficial `data/snapshots/dia-02.json`:** gravado depois da conferência dos dados (18 seguidores,
  10 moradores, 14 casas livres, 58/10/48/44 vagas, metas e fila vazia). Não pode ser sobrescrito
  (`city:snapshot` recusa).
- **Numeração:** Mateus é o Nº 1. Os outros nove ficam com `numero: null` e `numeroProvisorio` até a ordem dos
  comentários ser confirmada.
- **`dia-01.json`:** intacto (hash conferido antes e depois).
- **Ep. 02:** marcado como `produzido`. A lista dele continua encerrada com os 10 fundadores.
- **Próximos moradores:** como o snapshot oficial do Dia 02 existe, os comentários novos podem ser
  incorporados pela fila no Ep. 03 (`npm run fila:incorporar -- --episodio ep03`). Eles entram como
  PIONEIROS, a partir do nº 11.

## Revisão visual

- **Folha de 1 quadro/s e quadros soltos em tamanho real.** A revisão corrigiu:
  - gancho que começava em "MORADORES 0": agora a 1ª casa já está acesa no 1º quadro;
  - placas "EM BREVE" sobre o terreno do cemitério e sobre a planta da advocacia;
  - plano de carros aberto demais: agora a câmera acompanha a viatura, com anel dourado;
  - fundadores escondidos atrás de prédios na cena do monumento: virou a grade dos 10 com as estrelas;
  - interiores pequenos: ampliados para 7×.
- **Transições:** os quadros em ladrilhos que aparecem na folha são as transições de 0,3 s entre planos,
  não quadros escuros.
