# Storyboard — Ep. 02 "OS PRIMEIROS MORADORES CHEGARAM!" (75 s, versão de produção)

Narração oficial: `public/audio/ep02/narracao-original.mp3` (10_pessoas.mp3, a mesma voz ElevenLabs do Ep. 01,
72,6 s). A voz foi recolocada na linha do tempo de 75 s **sem acelerar** (`scripts/ep02-narracao.py`), com dois
respiros curtos nas viradas ("Mas temos um problema" e "Agora começa uma nova missão"). A voz termina em 73,1 s.

A transcrição foi feita localmente (Whisper small via sherpa-onnx, sem serviço externo nem crédito pago). Os
nomes foram corrigidos pelo cadastro: Mari, Alicia, Muri e Gabrielly; o reconhecimento bruto está no campo `asr`
de `src/scenes/ep02/narration-v2.json`. Todo evento visual e sonoro é ancorado numa palavra (`W('palavra')`).

| # | Tempo | Fala | Plano | O que muda na tela |
|---|---|---|---|---|
| 1 | 0,00–3,10 | Dez pessoas decidiram morar na minha cidade. | Vila Nova à noite | **1º quadro:** contador MORADORES dourado subindo de 0 a 10, uma casa acendendo por vez (brilho e moeda). |
| 2 | 3,10–7,74 | E uma delas escolheu ser coveiro numa cidade que nem tem cemitério. | Terreno vazio do canto sudeste | Roberto com a pá no gramado vazio, rótulo "ROBERTO · COVEIRO". Em "cemitério": falha de imagem, contorno vermelho no terreno, alerta "CEMITÉRIO: 0". A música para. |
| 3 | 7,74–10,94 | Ontem, a SegueCity tinha zero moradores. | Vila Nova no Dia 01 | Lembrança em cinza: casas apagadas, ruas vazias, carimbo "DIA 01 · 0 MORADORES", marcadores vermelhos, contador da HUD em 0. |
| 4 | 10,94–14,55 | Hoje… As primeiras dez casas ganharam seus donos. | Vila Nova no Dia 02 | Transição em ladrilhos, carimbo "DIA 02 · HOJE". As 10 casas acendem uma a uma, com marcador dourado; contador "CASAS COM DONO". |
| 5 | 14,55–17,50 | Mateus, médico, foi o primeiro a chegar. | Casa 12 | Mateus chega andando e acena na porta. Ficha "Nº 1 · MÉDICO · PRIMEIRO MORADOR · CONFIRMADO", rótulo "CASA 12 · DO MATEUS". |
| 6 | 17,50–19,58 | Nosso morador número um. | Hospital | Carimbo "MORADOR Nº 1 · O PRIMEIRO A CHEGAR"; Mateus no caminho do hospital, com contorno dourado. |
| 7 | 19,58–22,32 | Davi assumiu a profissão de policial. | Delegacia | Ficha do Davi (POLICIAL, Casa 14, Delegacia); Davi patrulhando a calçada. |
| 8 | 22,32–26,12 | Gabriel e Juan ficaram responsáveis pela oficina mecânica. | Oficina | Duas fichas lado a lado, cada uma entrando quando o nome é falado; os dois trabalhando; rótulo "OFICINA MECÂNICA". |
| 9 | 26,12–28,46 | Mari chegou como neurocirurgiã. | Interior do hospital | Mari entra na enfermaria; ficha NEUROCIRURGIÃ. |
| 10 | 28,46–31,25 | Alicia e Muri escolheram ser empresários. | Centro Empresarial | Duas fichas (EMPRESÁRIA / EMPRESÁRIO); os dois andando na calçada do escritório. |
| 11 | 31,25–33,34 | Gabrielly será nossa advogada. | Lote 3 e Casa 26 | Ficha ADVOGADA; o trabalho aparece como "ESCRITÓRIO DE ADVOCACIA (EM PROJETO)". |
| 12 | 33,34–35,30 | Jorge, nosso comerciante. | Interior do mercadinho | Jorge atrás das prateleiras; ficha COMERCIANTE. |
| 13 | 35,30–38,62 | E Roberto… nosso primeiro coveiro. | Roberto de perto | A música para. Ficha do Roberto e a palavra COVEIRO salta junto da fala. |
| 14 | 38,62–42,16 | Mas temos um problema. Onde o Roberto vai trabalhar? | Canto sudeste (plano aberto) | Falha de imagem, alerta "SEM LOCAL DE TRABALHO · COVEIRO PRECISA DE UM CEMITÉRIO", rótulo vermelho "ONDE TRABALHAR?" sobre o Roberto, minimapa. |
| 15 | 42,16–46,24 | Vamos reservar um terreno para construir o primeiro cemitério da cidade. | Terreno do cemitério | O cursor marca o terreno: "TERRENO RESERVADO · DECISÃO DA ADMINISTRAÇÃO". Em "construir", a planta holográfica sobe: "CEMITÉRIO · EM PROJETO · AINDA NÃO CONSTRUÍDO". Selo "PROJETO DA CIDADE · OBRA FUTURA". |
| 16 | 46,24–49,30 | E outro para o escritório de advocacia da Gabrielly. | Lote 3 | O cursor marca o lote; a planta sobe: "ADVOCACIA · EM PROJETO · AINDA NÃO CONSTRUÍDO"; alerta "2 PROJETOS NO MAPA"; minimapa. |
| 17 | 49,30–51,82 | Os primeiros carros começaram a circular. | Avenida do mercadinho | A câmera acompanha a viatura, com anel dourado; alerta "PRIMEIROS CARROS". |
| 18 | 51,82–54,48 | E cinco serviços abriram suas portas. | Centro da cidade | Painel "SERVIÇOS ABERTOS" conta de 1 a 5 (hospital, delegacia, oficina, mercadinho, Centro Empresarial); cada prédio acende com contorno verde na hora em que é contado. |
| 19 | 54,48–60,06 | Esses dez moradores receberão um distintivo dourado de fundador para sempre. | Praça e monumento | Grade com os 10 retratos, nomes e profissões. Em "dourado", uma estrela entra em cada retrato; em "fundador", o título brilha; em "sempre", a faixa "DISTINTIVO DOURADO · PARA SEMPRE". |
| 20 | 60,06–65,64 | Agora começa uma nova missão: encontrar nossos primeiros moradores pioneiros. | Ilha inteira | Painel "NOVA MISSÃO" → "ENCONTRAR OS PIONEIROS". Três categorias: FUNDADORES 1–10 (10/10), **PIONEIROS 11–100 · os próximos 90 (0/90)**, que acende em "pioneiros", e CIDADÃOS 101+ (bloqueado). |
| 21 | 65,64–68,38 | Ainda temos catorze casas disponíveis. | Vila Nova e Beira-Rio | Marcadores ciano nas 14 casas livres; painel "14 CASAS LIVRES" e "48 VAGAS DE EMPREGO LIVRES · 58 NO TOTAL · 10 OCUPADAS". |
| 22 | 68,38–71,30 | Comente seu nome e sua profissão. | Casa livre (Casa 32) | Ficha **PRÓXIMO MORADOR · PIONEIRO** (sem número); botões COMENTE e NOME + PROFISSÃO; casa livre contornada em ciano. |
| 23 | 71,30–75,00 | Quem será o próximo cidadão da SegueCity? | Ilha à noite, afastando | Marca por ~3,7 s: logo oficial com o slogan; acorde final em "SegueCity"; "DIA 03 EM BREVE" depois que a voz termina. |

## Regras mantidas

- Corte a cada ~2–4 s (23 planos), com mínimo de 1,97 s e transição em ladrilhos.
- No máximo 2 rótulos no mundo ao mesmo tempo.
- Legendas palavra a palavra com destaque amarelo e assunto acima da faixa das legendas.
- Números lidos de `data/episodes.json → ep02.estado`: 10 moradores, 14 casas livres, 58 / 10 / 48 vagas,
  5 serviços.
- Só o Mateus é numerado. A ordem dos outros nove não é mostrada.
- Cemitério e advocacia aparecem só como **projetos** (planta holográfica). A decisão de construir é da
  administração da cidade, não um pedido do Roberto.
- Contador de seguidores: só aparece quando o número real for informado (`ep02.estado.seguidores`). Não
  há número inventado.
