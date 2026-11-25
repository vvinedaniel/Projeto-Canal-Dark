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
