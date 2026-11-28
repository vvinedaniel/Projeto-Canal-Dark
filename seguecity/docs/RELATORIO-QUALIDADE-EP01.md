# Relatório de qualidade — Ep. 01 "A Fundação"

**Arquivo:** `seguecity-ep01-final.mp4`, versão oficial da Temporada 1, sobre a V2.0 (tag `seguecity-v2.0`,
commit `cd2bb34`).
- Nenhum upgrade gráfico, mudança de arquitetura ou de identidade visual foi feito nesta produção.
- Foi usado só o que a V2 já tinha, mais peças do episódio: interiores em tela cheia, menu de profissões,
  ficha do Morador Nº 1 e capas.

## 1. Validação técnica (ffprobe/ffmpeg, `scripts/validate.ts`)

| Requisito | Resultado |
|---|---|
| Duração exata de 75 s | **75,000 s** |
| Quadros | **2.250** (`ffprobe -count_frames`) |
| Resolução nativa | **1080 × 1920** (9:16, renderizado direto nesse tamanho, sem ampliação) |
| Taxa de quadros | **30 fps** constantes |
| Vídeo | **H.264** High, **yuv420p**, faixa limitada BT.709 |
| Áudio | **AAC** 48 kHz estéreo 192 kb/s |
| Loudness integrado | **−14 LUFS** (2 passes) |
| Pico verdadeiro | **−1,2 dBTP** (limite −1) |
| Faststart (moov no início) | sim |
| Tamanho | 68,4 MB (7,3 Mb/s); versão leve 29,1 MB, mesma validação |
| Telas pretas (`blackdetect` 0,25 s) | nenhuma |
| Imagem congelada (`freezedetect` 1,5 s) | nenhuma |

## 2. Narração (Cidade.mp3)

- **Cabe sem aceleração.** São 62,04 s de voz e 16 frases, numa linha do tempo de 75 s.
  - As frases foram recortadas no meio das pausas da gravação e ganharam 6,75 s de respiro nas viradas:
    +0,5 s antes de "Ninguém mora nela", +0,9 s depois dela, +0,8 s antes de "Hoje começa nossa história".
  - A voz vai de **0,15 s a 68,57 s**. O resto (6,4 s) é o amanhecer com a logo.
  - Nenhuma palavra foi cortada, esticada ou acelerada.
- **Conferência:** o `silencedetect` da faixa montada mostra as 15 pausas exatamente onde foram planejadas.
- **Legendas sincronizadas:**
  - Cada palavra tem início e fim (`words.json`): distribuição por sílabas, com cada fronteira encaixada
    no vale de energia mais próximo do áudio.
  - Na tela, a palavra acende ~60 ms antes de ser falada. As palavras-chave ficam em amarelo: cidade,
    zero, problema, ninguém, casas, escola, hospital, comércio, prefeitura, você, cidadão, profissões,
    eleição, morador…
  - O `.srt` usa os mesmos tempos.
- **Limite conhecido:** sem modelo de reconhecimento de fala (os servidores de modelos ficam bloqueados
  neste ambiente), a fronteira entre palavras pode errar ~0,1 s numa sílaba longa. As frases e os blocos
  de legenda batem com a voz.

## 3. Áudio (medido no arquivo final)

| Trecho | Loudness |
|---|---|
| Gancho com voz (0,15–2,81 s) | −14,0 LUFS |
| "Ninguém mora nela" (6,84–8,00 s) | −13,7 LUFS |
| Pausa dramática depois dela (8,05–9,35 s), música desligada | −24,0 LUFS |
| Lista de profissões (33,6–37,8 s) | −13,0 LUFS |
| Tempestade com voz (47,7–51,1 s) | −14,1 LUFS |
| Final só com música (69,6–74,5 s) | −15,9 LUFS |

- **Voz em primeiro plano:**
  - a trilha cai para 32% sob a fala e fica em 52% entre frases;
  - além disso, abre um "bolso" de −3 dB em 1–4 kHz durante a voz.
- **Trilha original sintetizada** (`scripts/audio/music.ts → renderEp01`): F maior / Ré menor, 105–109 BPM.
  - As seções seguem os cortes do vídeo.
  - A música desliga (tape stop) em "Ninguém mora nela".
  - A batida entra em "é aqui que você entra".
  - Há um acento musical em cada profissão falada (33,92 / 34,62 / 35,46 / 36,30 / 37,00 s).
  - Na tempestade, a música escurece.
  - Na eleição entra um hino.
  - O acorde final (Fmaj9) cai junto da logo, com sinos do nascer do sol.
- **Efeitos de videogame**, todos sintetizados e ancorados nas palavras: carimbo, obra, subida de nível,
  clique, alerta de vazio, popups, moeda, desbloqueio, notificação, digitação, brilho e trovão.
  - O trovão e a chuva são novos nesta produção.
  - Ambientes: noite e chuva.
- Nenhum banco de sons nem API paga foi usado.

## 4. Revisão visual

**Como foi feita:**
- folha de contato antes do render (35 quadros);
- 1 quadro por segundo do filme inteiro (`folha-1s.jpg`);
- 1 quadro por plano (`storyboard.png`);
- closes em resolução cheia dos pontos críticos.

**O que foi verificado:**
- [x] **Gancho:** o 1º quadro já mostra a cidade, o contador MORADORES 0 e prédios subindo. O contador é
  o valor gravado em `episodes.json`, e a HUD também mostra 0.
- [x] **Ritmo:** 24 planos, um corte a cada 3,1 s em média. O mais curto tem 1,75 s.
  - Planos longos têm um estímulo a cada 1–2 s.
  - Nenhuma tela parada nem vazia.
- [x] **Alternância:** visão geral (3 planos), bairros (3), ruas e closes (3), personagens (5),
  interiores (4) e menus de jogo (3).
- [x] **Composição 9:16:**
  - HUD entre 150 e 350 px;
  - painéis entre 380 e 1.000 px;
  - legendas entre 64% e 77% (o assunto foi levantado onde encostava nelas);
  - nada essencial nos 14% de baixo nem nos 12% da direita.
- [x] **Rótulos:** no máximo 2 ao mesmo tempo, sem sobreposição. Ao lado da DELEGACIA, o rótulo foi
  deslocado para não tapar o letreiro.
- [x] **Ortografia:**
  - `npm run check:signs` passou sem avisos;
  - os letreiros revisados de perto na V2 (DELEGACIA, PREFEITURA, FARMÁCIA, TERMINAL, SORVETES) aparecem
    legíveis;
  - textos da interface conferidos: MORADORES, VAGAS DE EMPREGO, ESCOLHA SUA PROFISSÃO, MÉDICO,
    POLICIAL, EMPRESÁRIO, MECÂNICO, PROFESSOR, ELEIÇÃO, PREFEITO(A), CIDADÃO, MORADOR Nº 1,
    "A CIDADE ESTÁ PRONTA. FALTA VOCÊ.".
- [x] **Encerramento:** amanhecer com a logo oficial e brilho neon. A HUD sai para a marca não aparecer
  duas vezes.

**Correções feitas durante a revisão:**
- a poeira dos ~40 prédios subindo juntos virava manchas cinza: ficou menor e só nos prédios grandes;
- o plano da rua mostrava metade da tela no vazio da borda da ilha: foi reenquadrado no meio da fileira;
- no interior da casa, o carimbo PRONTO tapava a sala: a sala desceu;
- o plano do bairro novo estava aberto demais e não mostrava os prédios subindo: ganhou mais zoom;
- os rótulos da casa 12 tapavam o letreiro da DELEGACIA, no vídeo e na capa C;
- a legenda passava por cima da casa 12: o assunto subiu.

## 5. Honestidade (nada falso apresentado como verdadeiro)

- **Estado da cidade:** 0 moradores, 24 casas vazias, 48 vagas em 13 locais e metas 1/10/50/100.
  - Tudo sai de `data/*.json`; nenhum número é escrito à mão.
  - O estado está registrado em `data/snapshots/dia-01.json`, com hash de cada arquivo.
- **Personagem fictícia:**
  - A "Ana" tem o rótulo EXEMPLO em todos os planos.
  - O selo "DEMONSTRAÇÃO · PERSONAGEM DE EXEMPLO" fica visível enquanto ela aparece.
  - O comentário "Ana — médica" está marcado como EXEMPLO.
  - A casa dela volta a ficar apagada depois da demonstração.
- **Menu de profissões:** retratos com a etiqueta EXEMPLOS.
- **Simulação:** o crescimento (casas acesas, trânsito, bairro novo, empresa) e a tempestade levam o selo
  "SIMULAÇÃO · COMO A CIDADE PODE CRESCER".
- **Sem promessa além do roteiro:**
  - a eleição aparece como meta "0/100" e "LIBERA COM 100 SEGUIDORES", igual à fala;
  - a casa 12 aparece como "LIVRE · PODE SER A SUA", sem reserva.

## 6. Capas (3 opções, 1080 × 1920)

As três usam a cidade real da V2 no estado gravado e a logo oficial. Título, número e logo ficam na faixa
central 3:4, que a grade do perfil do TikTok mostra (y 240–1680).

- **A — "CONSTRUÍ UMA CIDADE"**
  - imagem: a ilha inteira à noite;
  - faixa: "MAS NINGUÉM MORA NELA".
- **B — "DIA 01" + "0 MORADORES"**
  - imagem: a Vila Nova vazia;
  - faixa: "24 CASAS VAZIAS · 48 VAGAS".
- **C — "VOCÊ PODE MORAR AQUI"**
  - imagem: a casa 12 livre ao amanhecer, com o holograma na porta;
  - faixa: "VAGA ABERTA · MORADOR Nº 1".

## 7. Produção

- **Render:** 2.250 quadros em ~4 min, mais ~1,5 min de codificação, áudio e validação, neste container
  (4 vCPU, sem GPU).
- **Para refazer do zero:**

  ```bash
  python3 scripts/ep01-narracao.py
  npm run audio:build
  npx tsx scripts/render.ts ep01
  npm run srt
  ```
- **O episódio não foi publicado.** Nenhum site ou aplicativo foi criado.
