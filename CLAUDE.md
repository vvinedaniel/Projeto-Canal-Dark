# Mundo por Dentro — como produzimos os episódios

Canal "dark" de TikTok que explica como o mundo funciona com animação 3D de verdade (three.js), em 9:16,
1080×1920, 30 fps. O episódio 01 (`ep01-descarga/`, "Para onde vai o cocô depois da descarga?") foi aprovado
pelo cliente como o padrão de referência: mecanismos completos, cenários ricos, continuidade entre etapas,
conclusão visual com o sistema inteiro. Os próximos episódios devem manter ou superar esse padrão.
Para começar um episódio novo, copie a pasta `ep01-descarga/` e troque narração, linha do tempo e cenários.

## O que o cliente exige (não negociável)

- Objetos genuinamente 3D, reconhecíveis e proporcionais. Formas básicas só como ponto de partida: uma bomba
  precisa ter voluta, motor e flanges; uma estação precisa parecer instalação industrial funcional. Nada de 2D
  imitando 3D, nada de apresentação de slides.
- Cortes transversais, visão subterrânea, montagem/desmontagem de estruturas, partículas, setas, indicadores,
  câmera sempre em movimento, iluminação cinematográfica com sombras e oclusão ambiente, materiais distintos.
- Narrativa em ciclos: Curiosidade → Problema → Consequência → Solução → Novo problema → Nova descoberta → Revelação.
- Gancho nos 3 primeiros segundos, começando pela ação e mostrando o assunto desde o primeiro quadro.
- Mudança visual relevante a cada 3–5 s; nova descoberta a cada 10–15 s. Cada cena compreensível sem áudio.
- Nunca informação falsa. Todo número na tela tem fonte, ano-base e denominador conferidos (veja "Dados").
- Não esticar o vídeo para bater duração: a narração manda (o ep01 tem 102,5 s, não 120).
- Sem pedidos genéricos de curtida/seguidor.
- Na revisão: não mexer no que funciona só por mexer.

## Estrutura de um episódio

```
ep01-descarga/
  audio/narracao.mp3       narração (a fonte de todos os tempos)
  audio/sfx.wav, mix.wav   efeitos/trilha sintetizados e mixagem final (tools/sfx.py, tools/mix.sh, audio/MIX.md)
  index.html               palco 1080×1920: canvas WebGL + camadas DOM (legenda, marca, rótulos, lente, dissolve, cartela)
  src/timeline.js          frases (PH), janelas dos cenários (SETS), cortes com dissolve (CUTS), legendas
  src/words.js             tempo de cada palavra (gerado por tools/align.py)
  src/lib.js               biblioteca comum (ver abaixo)
  src/main.js              motor: escolhe o cenário pelo tempo, renderiza, desenha overlays, capas
  src/sets/<id>.js (+ src/sets/<id>/*.js)   um cenário por trecho da narração
  docs/GUIA-DE-CENARIOS.md contrato de um cenário + direção de arte (entregue a quem modela)
  tools/render.cjs         captura quadros com Chromium (stills, frames, bench, --cover)
  tools/sheet.sh           folha de contato de um cenário para revisão
  tools/align.py           alinhamento palavra a palavra (sílabas + vales de energia)
  tools/encode.sh          quadros + mix.wav → MP4 final
../publicacao/ep01/        capas e textos de publicação (TIKTOK.md)
```

## Método (o que deu certo, na ordem)

1. **Medir a narração primeiro.** `ffmpeg silencedetect` (−35 dB, 0,22 s) dá início/fim de cada frase; essas
   pausas viram `PH[n]` em `timeline.js`. Os cortes entre cenários caem nas pausas. Tudo na tela é ancorado em
   `PH[n].a/.b`, nunca em números soltos.
2. **Storyboard por frase** com o batimento visual de cada uma (o que muda na tela, qual rótulo, que seta).
3. **Motor + biblioteca antes dos cenários.** Um cenário é `create(L, {PH, def})` → `{ scene, ao, update(t, camera, ui) }`;
   `update` é **função pura de t** (quadros são renderizados fora de ordem e em processos paralelos).
4. **Um cenário por trecho, construído em paralelo.** No ep01 a casa foi feita direto e os outros quatro
   (rede, ETE A, ETE B, rio) por subagentes com o mesmo brief: ler o guia, a lib e a timeline; storyboard com tempos;
   editar só o próprio arquivo; iterar renderizando quadros e olhando as imagens; relatar "tempo → tela", bugs da lib
   e caminhos dos quadros. Funcionou muito bem; o brief detalhado é o que garante a qualidade.
5. **Revisão por folha de contato** (`tools/sheet.sh <id> t0 t1 passo`) e, no fim, 1 quadro por segundo do filme
   inteiro (`ffmpeg ... tile`) para achar espaço vazio, rótulos sobrepostos, cortes escuros.
6. **Render final** direto em 1080×1920 (nunca upscale), em 2 processos paralelos; depois `encode.sh`.

## Biblioteca (`src/lib.js`)

- Materiais: `mat`, `metal`, `glossy`, `glass`, `water` (com ondulação animada e cáusticas via `waterize`,
  sem UV, contínuas entre peças; escala por cenário em `SETS[].wscale`), `glow`, `flat`.
- Geometria: `box`, `rbox` (cantos arredondados), `cyl`, `sph`, `torus`, `lathe` (revolução, inclusive meia peça
  para corte), `extrude`, `loft` (casca entre anéis), `tube`, `curve`.
- `cutPipe(pts, {r})`: meio-tubo em corte com parede, face de corte e `waterIn(level, cor)` animável por trecho.
- `soilWall({...pipes, holes})`: parede de solo em camadas com furos onde aparecem tubos/câmaras.
- `Flow` (partículas ao longo de curva), `Chevrons` (setas que correm), `arrow`, `scatter` (instâncias).
- `studio(scene)`: fundo de estúdio azul-petróleo, sol quente com sombra (chame `rig.focus()` a cada quadro), contraluz fria.
- `camRail(keys)`: trilho de câmera por quadros-chave com deriva contínua (a câmera nunca para).

## Motor (`src/main.js`)

- Pós: GTAO (oclusão ambiente) em **meia resolução** (4× mais barato, igual visualmente), ACES, MSAA 4×.
- `ui.label(id, texto, ponto3D, alpha, {cls, stem, dx, dy})` — rótulos DOM projetados **depois** que o cenário
  posiciona a câmera (projetar antes usa a câmera do quadro anterior: foi um bug real).
- `ui.dark(a)` escurece; `ui.lens(a)` mostra a lente "Ao microscópio".
- Transições: trocas de cenário de túnel/tubo usam mergulho curto no escuro; as listadas em `CUTS` usam
  **dissolve em zoom** (o quadro que sai é congelado numa camada 2D que cresce/encolhe e se dissolve). Use dissolve
  sempre que o corte não for "entrar num tubo" — o cliente reclamou dos escurecimentos em 65 s e 68 s.
- Sem fade de entrada: o primeiro quadro já mostra o assunto e o título.
- Legendas: 1–3 palavras por bloco, palavra atual em amarelo, acendendo ~60 ms antes da fala.
- Capas: `node tools/render.cjs stills --t 0 --cover N` (títulos em `COVERS` no `main.js`).

## Direção de arte

- Maquetes/dioramas recortados flutuando num estúdio escuro; cortes revelam o escondido.
- Cor conta a história: esgoto marrom → `murky` → `haze` → água azul limpa. PVC laranja na casa, concreto cinza
  na rede, amarelo para setas e destaques, verde (`good`) para o que protege/limpa, vermelho (`warn`) para o problema.
- Composição 9:16: marca no topo (0–8%), legendas em y 64–77%, interface do TikTok nos 14% de baixo e 12% à direita.
  Assunto entre y 12–62%. **Enquadre para preencher a largura**: em planos gerais de maquete, câmera mais de cima
  (60–70° de elevação) faz a maquete ocupar a tela; vista 3/4 baixa deixa faixas vazias enormes (problema real no ep01).
- No máximo 2 rótulos ao mesmo tempo; rótulos em sequência não se sobrepõem (dê fim a um antes do outro começar).
- Escala: exagere diâmetros e partículas para ler no celular, mas mantenha proporções coerentes.
- Mão humana: esqueleto de falanges com pivôs nas juntas (dobra ao apertar), unha, palma arredondada, punho, manga;
  chega em arco desacelerando. Bonecos de cápsula parecem amadores.
- Para explicar um mecanismo invisível (o fecho hídrico), mostre o agente (gás em bolhas verdes) **parando** numa
  barreira visível (linha luminosa verde na superfície da água) e nomeie os dois lados ("Gás do esgoto" × "Barreira de água").

## Dados

- Confira fonte primária, ano-base e denominador antes de pôr qualquer número na tela, e mostre a fonte no vídeo.
- Ep01: SINISA 2024 (ano de referência 2023), Ministério das Cidades, indicador IES2003 "esgoto tratado referido
  à água consumida" = **49,4%** do esgoto gerado (denominador: água consumida, nos 2.754 municípios participantes,
  81,9% da população). Trata Brasil divulga 51,8% (metodologia própria). O SNIS foi substituído pelo SINISA em 2024.

## Áudio

- Narração entregue pronta; efeitos e trilha são **sintetizados** (`tools/sfx.py`, numpy/scipy) a partir de uma lista
  de deixas com os mesmos tempos da tela; mixagem em `tools/mix.sh` com ducking sob a voz, −14 LUFS integrado,
  true peak ≤ −1 dBTP. Detalhes e níveis medidos em `audio/MIX.md`. Não há bancos de sons acessíveis deste ambiente.
- Alinhamento das legendas sem modelo de fala (servidores de modelos bloqueados): `tools/align.py` distribui palavras
  por sílabas e encaixa as fronteiras nos vales de energia, com mínimo de ~70 ms por sílaba.

## Desempenho e armadilhas (aprendidas no ep01)

- Render é por software (sem GPU): ~2 s/quadro em 1080×1920 com sombras + GTAO. 2 processos em paralelo é o
  ótimo nesta máquina (3 fica mais lento). Filme de 100 s ≈ 1h45 de render. Faça prévias em `--scale 0.25/0.5`.
- **Não use `pgrep -f "<padrão>"` dentro de um script cujo próprio texto contém o padrão**: ele encontra a si
  mesmo e espera para sempre (travou as filas de render). Espere por PID (`kill -0`) ou por contagem de arquivos.
- Ao matar filas, mate os scripts-pai e confira com `ps`; filas "mortas" continuaram rodando e renderizaram em dobro.
- `L.studio`: o domo tem raio 480 e a câmera `far` 600 — com a câmera longe da origem use domo próprio menor
  (`backdrop:false`). (O NaN do degradê no polo já foi corrigido.)
- `soilWall`: pedras só evitam os vértices dos furos (use `rocks:0` com furos grandes); laterais sempre criadas.
- `Flow.update`: variar `speed` com o tempo dá saltos (fase = t·speed); integre a fase ou passe um tempo deslocado.
- `Flow` com `material` próprio: passe `color:'#ffffff'`, senão a cor de instância padrão tinge o material.
- `loft`: anéis anti-horários saem com normais para dentro; use `DoubleSide` ou inverta a ordem.
- Superfícies coplanares: afaste 2–5 mm; transparências com `depthWrite:false` e `renderOrder` coerente.
- `ui.dark` é por cenário; `set.ao` é lido só na troca de cenário.

## Tempo de produção: benchmarks (25/11/2026, container 4 vCPU Xeon 2,3 GHz, sem GPU, SwiftShader)

Medido com `node tools/bench.cjs [opções]` (1 quadro por cenário em t = 12/44/58/77/95 s, média de 3, 1080×1920)
e `tools/bench-cap.cjs` (métodos de captura). Resultados em `out/bench.jsonl`.

| Configuração (1 processo) | s/quadro | vs. base | Qualidade |
|---|---|---|---|
| Base (MSAA 4, GTAO ½ res, sombra 4096) | 3,20 | — | final |
| GTAO ¼ res | 2,95 | −8% | AO mais borrado |
| Sombra 2048 | 2,95 | −8% | bordas de sombra mais moles |
| MSAA 2 | 3,03 | −5% | serrilhado leve |
| Sem sombras (teto teórico) | 2,47 | −23% | inaceitável |
| Sem GTAO | 2,39 | −25% | perde profundidade |
| Sem MSAA | 2,18 | −32% | serrilhado visível |

- **A captura não é o gargalo**: screenshot JPEG de um quadro já desenhado custa 0,05 s; CDP `optimizeForSpeed`
  ganha ~3%. Quase todo o tempo é o WebGL emulado na CPU (rasterização + sombras + GTAO + MSAA).
- Paralelismo: 1 processo ≈ 19 quadros/min; 2 processos ≈ 33/min (ótimo); 3 é mais lento. Encode x264 `slow`
  do filme todo ≈ 2,2 min (`PRESET=medium tools/encode.sh` ≈ 1 min, tamanho quase igual).
- Episódio inteiro (3075 quadros) nesta máquina: **~93 min**. Mesmo somando todos os cortes sem perda visível
  (~15%), fica em ~80 min. **Meta de < 30 min por episódio completo só com GPU** (local ou na nuvem, esta
  só com autorização do dono do canal): numa GPU dedicada o render cai para dezenas de ms/quadro e o limite
  vira a captura (~0,05–0,1 s) → ~5 min de render + ~1–2 min de encode (ou segundos com NVENC).
- **Correções pontuais sem re-renderizar o filme** (`tools/patch.cjs`, medido): trecho de 5 s = 150 quadros
  → 3,7 min de render + 2,2 min de encode = **~6 min**, contra ~95 min do filme todo. Quadro re-renderizado
  vs. original: PSNR 53,5 dB (idêntico a olho; as costuras não aparecem). O render é determinístico porque
  `update(t)` é função pura de `t` — mantenha essa regra em todo cenário novo.
  - `node tools/patch.cjs mark` depois de um render completo grava o manifesto (hash por cenário).
  - `node tools/patch.cjs status` / `auto` acham e re-renderizam só os cenários cujos arquivos mudaram
    (com 0,6 s de margem nas trocas). Mudou `main.js`/`lib.js`/`timeline.js`? Ele avisa: use `range`.
  - `node tools/patch.cjs range 26 31` re-renderiza um trecho em segundos.
- Já reaproveitado: geometrias/materiais são criados uma vez por cenário (no `create`), cenários fora do
  ar não são desenhados, o snapshot do dissolve é cacheado por corte, sombras só de um sol por cenário.

## Revisão final do ep01 (o que o cliente pediu e como foi resolvido)

1. Escurecimentos em 65 s/68 s → dissolve em zoom (`CUTS`) nos cortes macro↔micro e na troca ETE A → ETE B.
2. Mão da descarga → mão articulada com falanges, unha, punho e manga; chega em arco e o indicador dobra ao apertar.
3. Primeiros 3 s → o cocô já cai na água no 1º quadro (respingos e ondas), câmera recua revelando vaso e cano, setas
   descem pelo cano escondido; título já visível no 1º quadro.
4. Líquidos → ondulação e cáusticas animadas em todas as águas, contínuas entre peças.
5. Fecho hídrico → gás sobe pelo cano e para na linha luminosa da superfície da água; rótulos dos dois lados.
6. Tanques ↔ microscópio → dissolve em zoom + lente circular "Ao microscópio".
7. Espaço vazio → vista aérea da ETE e recapitulação do rio reenquadradas para preencher a tela.
8. Dado nacional → confirmado no relatório oficial e mostrado na tela com fonte e ano-base.
9. Sincronização → legendas alinhadas pela energia do áudio; rótulos de bitola em sequência sem sobreposição.
10. Efeitos e mixagem → criados do zero (o vídeo anterior só tinha narração) e medidos.

## Ep. 02 — "Por que as cidades alagam mesmo tendo bueiros?" (o que aprendemos)

- **Uma maquete só para o episódio inteiro** (`ep02-alagamento/src/sets/cidade.js`): o cliente exige continuidade
  (mesma cidade, mesmo relevo, mesmo rio). Em vez de cenários separados, um cenário com MÓDULOS (terreno, cidade,
  drenagem, piscinão, soluções verdes, água), cada um com dono, montados por `createAsync`. Contrato e lista de
  módulos em `ep02-alagamento/docs/MODULOS.md`; modelos reutilizáveis em `docs/MODELOS.md`.
- **Layout com cotas conferidas** (`cidade/layout.js`): antes de modelar, checar por script as folgas (caixa da boca de
  lobo × teto da galeria, cobertura, soleira das casas × níveis de alagamento). Isso evitou colisões entre módulos.
- **Estado do mundo único** (`cidade/hydro.js`): `state(t, variant)` diz o que está construído (`build.*` 0..1) e onde
  está a água (`flood`, `river`, `gal`, `res`...). Módulos não inventam tempos. Ganhos: água contínua e coerente,
  obras que rebobinam sozinhas (relógio da história `st`), e variantes `before/after` para a tela dividida.
- **Corte da frente com furos e tampões**: o terreno desenha a face com uma máscara de furos (furos sobrepostos se unem)
  e tampões que "escavam" quando a obra começa. Estruturas com eixo em z = face (meia seção visível).
- **Subagentes em paralelo (6)** funcionaram de novo; o brief comum + docs/MODULOS.md + o integrador repassando pedidos
  entre agentes (SendMessage) resolveram as interfaces (ex.: `shared.inletBoxK`, `shared.gallery`, `greenHoleK`).
- **Validação obrigatória antes do render** (`tools/validate.sh`): 4 quadros por etapa com todos os módulos; achou 10
  problemas que só aparecem no conjunto (tela dividida desligada, obra fora de quadro, assunto atrás das legendas,
  telhado tapando a casa alagada, obra terminando depois da fala). Relatório em `docs/RELATORIO-QUALIDADE.md`.
- **Enquadramento**: o assunto no corte (galeria) precisa ficar acima da faixa das legendas (y 64–77%): mire a câmera
  mais baixo que o objeto. Obras longas: a câmera acompanha a frente da obra.
- **Armadilha three.js**: mudar `material.transparent` exige `material.needsUpdate = true` (senão o raio-x fica opaco).
- **Custo**: ~5 s/quadro (1 processo) e 2 processos não aceleram (SwiftShader já usa todos os núcleos). Episódio de
  117 s ≈ 4–5 h aqui. Correções pontuais continuam com `tools/patch.cjs`. GPU (computador do dono) segue sendo o
  caminho para < 30 min.
- **Áudio**: `tools/sfx_ep02.py` reaproveita a biblioteca de síntese do ep01 (`sfx.py`) e acrescenta chuva, trovão,
  enxurrada, diesel/hidráulico, escavação, rolo, obra, plástico, rebobinar. Cuidado: parâmetros de síntese não podem
  se chamar `rev`/`pan`/`bus`/`env`/`fi`/`fo` (colidem com a deixa `C(...)`).

## Ep. 03 — "Como a água chega até sua torneira?" (o que aprendemos)

- **Maquete única do manancial à torneira** (`ep03-torneira/src/sets/mundo/`), 7 módulos com dono (terreno, captação,
  eta1, eta2, cidade, casa, micro), mesmo contrato do Ep. 02 (`docs/MODULOS.md`). Conexões entre módulos pelas **portas**
  `Lo.P.*` do layout; quem é dono de cada trecho de tubo está na tabela. `shared` repassa furos (`terrainHoles`,
  `cityFaceHoles`), luvas de espera (`houseTap`) e o chão desenhado (`groundY`).
- **Relógio da história com "presente" e rebobinar**: 0–7 s tudo pronto e funcionando (gancho + caminho inverso), 7,05–7,9 s
  rebobina e depois cada obra nasce quando a narração chega nela. O que ainda não existe aparece como **planta**
  (contorno azul, `ghost.of(obj)`), em destaque na vista aérea.
- **Lente de ampliação ilustrativa** (`ui.micro` no motor): segundo WebGLRenderer num canvas circular com haste até o
  ponto ampliado; cena própria do módulo micro. Sempre com a etiqueta "Ampliação ilustrativa". Composição: lente no alto
  (y 175–745 px), assunto entre a lente e as legendas.
- **Validação**: além das 4 imagens por etapa, gerar trechos animados curtos (`render.cjs frames` → mp4 + tira) dos
  mecanismos; e 1 quadro/s do filme todo. As câmeras provisórias dos agentes atravessavam paredes — peça a cada agente
  chaves de câmera testadas para o seu trecho.
- **Desempenho**: ~5 s/quadro; 2 processos não aceleram (SwiftShader já usa os 4 núcleos). O tempo cresce com a
  geometria da maquete única (3 passes de geometria por quadro: sombra, principal, normais do GTAO). Peça aos agentes
  meta de draw calls e `mergeGeometries` por material/fase (eta2: 504 → 213). `tools/bench3.cjs` mede s/quadro e
  draw calls/triângulos por instante (`window.__info`).
- **Servidor reclamado por inatividade**: o container é desligado quando nenhuma tarefa da sessão está ativa. Durante o
  render, mantenha um vigia em segundo plano (loop com `out/resume.sh`, 2 h por vez) e checagens agendadas; `resume.sh`
  descarta JPEG truncado e retoma do primeiro quadro que falta.
- **Entrega**: MP4 original de ~300 MB não baixa no app; enviar também versão leve (~70 MB, 2 passes x264) e ZIP.

## SegueCity (série nova, pasta `seguecity/`): o que aprendemos

- **Stack:** Remotion 4 + React + TS. A cidade é desenhada em Canvas 2D por um motor próprio
  (`src/engine/`), sem imagens prontas. Cada quadro é função pura de `t`. Render a ~10 quadros/s neste
  container (episódio de 75 s ≈ 5 min com `--concurrency 4`; o headless shell em `/opt/pw-browsers` serve).
- **Pixel art isométrica nítida com câmera suave:** o mundo é desenhado em resolução de pixel de mundo,
  ampliado por inteiro com vizinho mais próximo e o resto com bilinear ("sharp-bilinear",
  `renderer.ts`). Os objetos andam presos à grade de pixels; a câmera anda em sub-pixel.
- **Sólidos por raio de pixel + z-buffer** (`model.ts`): caixas, telhados de duas águas, cilindros,
  cúpulas e polígonos. Os shaders recebem coordenadas da face (coluna, altura), e janelas e letreiros
  saem inclinados 2:1 sozinhos. Rampas de cor com pontilhado de Bayer dão o visual 16-bit.
- **Luz noturna correta com oclusão:** albedo × (ambiente + poças) + emissão. As poças e as janelas de
  quem está atrás são apagadas pela máscara (`destination-out`) do objeto da frente, na ordem de
  profundidade.
- **Ordem isométrica:** ordenação topológica por pegada em tiles, só entre objetos que se sobrepõem na
  tela (`sort.ts`). Pegadas pequenas e sem se cruzar: pedestres a 0,17 tile do meio-fio, postes e
  árvores a 0,07.
- **Oclusão na isometria:** o que tem i + j maior tapa o que está atrás. Prédios altos vão para o fundo
  do mapa e os principais ficam com coisas baixas na frente. Na 1ª versão, a torre e a grua tapavam a
  prefeitura e a praça.
- **Fonte:** o "C" maiúsculo da Pixelify Sans vira "O" com contorno ("SEGUEOITY"). Use Jersey 10 para
  legendas, títulos e logo, e Silkscreen para rótulos pequenos.
- **Saída:** o JPEG do Remotion vira `yuvj420p`. `scripts/render.ts` recodifica com x264 em yuv420p de
  faixa limitada, normaliza o áudio para −14 LUFS em 2 passes e grava faststart. `scripts/validate.ts`
  confere tudo. Também gere uma versão `-leve.mp4` (CRF 25, ~33 MB) para baixar no app.
- **Sem voz final:** marcações provisórias por frase e palavra (por sílaba) em `narration.ts`;
  `npm run narration:fit` encaixa a voz real depois. Os eventos são ancorados em `W('palavra')`.
- **Honestidade:** comentário de exemplo rotulado EXEMPLO/fictício; crescimento rotulado SIMULAÇÃO, sem
  números inventados. O episódio usa o estado gravado em `episodes.json`, não o estado vivo.
- **Ortografia dos letreiros:** nomes mais largos que a fachada saíam cortados ("ERCADINH"), e o texto
  pintado coluna a coluna numa face 2:1 deforma as letras ("BREVE" virava "EFFUE").
  - As letras ficam em pé, com o degrau aplicado letra a letra (`TextMask.starts`).
  - As lojas são geminadas e o nome vai na face que comporta.
  - Se a frente estiver tapada, o letreiro vai numa placa no telhado.
  - `npm run check:signs` falha se algo não couber.
- **Identidade visual:** mar de nuvens e ilhotas com paralaxe (`backdrop.ts`), neon "SEGUECITY" num
  prédio, varal de luzes na praça e vaga-lumes.
- **Cara de jogo:**
  - tilt-shift automático em planos gerais (`autoTilt`);
  - cursor que clica e contorno de seleção do lote;
  - minimapa;
  - cortes cobertos por transição em ladrilhos (0,3 s) em vez de chicotes de câmera, porque panorâmicas
    rápidas de pixel art "piscam".
- **Ritmo dos planos:** planos de 1 s com transição somem. Mínimo de ~1,6 s por plano numa lista falada.
- **Reuso:** `src/series/stage.ts` + `EpisodeShell.tsx`; o roteiro de um episódio novo está em
  `docs/NOVO-EPISODIO.md`.
- **Upgrade V2 (sem refazer a cidade):** a V1 está na tag `seguecity-v1`. Relatório, entregas e números em
  `seguecity/docs/RELATORIO-V2.md`.
- **Letreiro legível não é só caber:** nada pode ficar na frente dele. Na V2 havia um mastro sobre a
  coluna do meio de um "A" (DELEGACIA virou "DELEGACII"), árvores e postes cobrindo FARMÁCIA e uma faixa
  de 5 px cortando PREFEITURA.
  - A faixa do letreiro precisa de 5 linhas + o degrau da isometria (≥ 8 px).
  - "V" de 3 px parece "U": use 5 px, como M e W.
  - `world.ts` não põe árvore nem poste na frente de fachada com letreiro (`SIGNED`).
  - Revise com `npm run check:signs:img`: a composição `Placas` mostra um prédio por quadro, de dia e de perto.
- **Trânsito coerente** (`engine/traffic.ts`): semáforos com ciclo, fila no vermelho e ônibus com
  paradas. A simulação é determinística (parte de t = 0, com cache por quadro). Com 0 moradores, o
  trânsito fica desligado e só aparece em trecho rotulado como demonstração.
- **Imagens de divulgação:**
  - `Poster4K` (2160×3840) usa outro `Renderer` no dobro do tamanho e o dobro do zoom, com o mesmo
    enquadramento do vídeo.
  - `npm run entrega:imagens` gera ilha 4K, closes, personagem, interiores, estados de clima e o
    comparativo antes × depois. As folhas são montadas com o Playwright pré-instalado.
- **Logo oficial:** a imagem recebida tinha fundo azul-marinho com vinheta e ruído. Recortar por "cor para
  alfa" deixou um halo pontilhado. Funcionou recortar o corpo do emblema (diferença > 80 para a cor do
  fundo, fechamento e preenchimento de buracos), suavizar 1 px a borda e desenhar o brilho neon no vídeo
  (`scripts/brand-logo.py`).
  - O emblema inteiro vai nas cartelas; no canto da HUD vai só o nome, nas mesmas cores.
  - A bandeira da cidade segue a da logo.
- **Desempenho V2:** ~17 quadros/s de render (só render, sem codificar), 4% mais lento que a V1 com todo o
  detalhe novo. A demo de 15 s fica pronta em ~70 s no total.
