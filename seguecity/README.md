# SegueCity

**Você segue. Você mora. Você decide.**

Cidade virtual em pixel art 16-bit (isométrica) onde cada seguidor pode virar morador. Os vídeos são
gerados por código: Remotion + React + TypeScript desenham a cidade quadro a quadro em Canvas 2D.
Não há imagens prontas nem APIs pagas: prédios, árvores, carros, pessoas, água, luzes, trilha e efeitos
sonoros saem de funções determinísticas. O mesmo instante `t` sempre gera o mesmo quadro.

| Entrega | Composição | Arquivo | Duração |
|---|---|---|---|
| Fase 1: demo da cidade | `CityDemo` | `out/seguecity-demo-cidade.mp4` | 15 s |
| Fase 2: Ep. 01, "DIA 01 — Construí uma cidade inteira, mas ninguém mora nela" | `Ep01` | `out/seguecity-ep01.mp4` (+ `-leve.mp4`) | 75 s |

Formato de saída: 1080×1920 (9:16), 30 fps, H.264 High, yuv420p (faixa limitada BT.709), AAC 48 kHz
192 kb/s, moov no início (faststart), loudness −14 LUFS e pico verdadeiro ≤ −1 dBTP.
`npm run validate` confere tudo isso com ffprobe/ffmpeg.

## Como executar

Pré-requisitos: Node 20+ e ffmpeg/ffprobe no PATH. O Remotion baixa o próprio Chrome na primeira vez.
Para usar um Chrome/Chromium já instalado, defina `SEGUECITY_BROWSER=/caminho/do/chrome`.

```bash
cd seguecity
npm install
npm run preview                         # Remotion Studio no navegador (CityDemo, Ep01, Sandbox, Debug)
npm run render:demo                     # Fase 1 → out/seguecity-demo-cidade.mp4
npm run render:ep01                     # Fase 2 → out/seguecity-ep01.mp4
npm run validate -- out/seguecity-ep01.mp4 --dur 75
```

- O render gera a trilha e os efeitos (`npm run audio:build`, ~40 s) se eles ainda não existirem.
- Velocidade neste container (4 vCPU, sem GPU): demo em ~1 min e episódio em ~5 min (~10 quadros/s).
- Para deixar o arquivo mais leve, use `CRF=23 npm run render:ep01`. O padrão é 20 (82 MB no Ep. 01).
- Trecho rápido para revisão: `npx tsx scripts/render.ts ep01 --frames 0-299`.
- Quadros soltos: `npm run stills -- Ep01 0,8.5,28,72 --scale 0.5`, depois `scripts/sheet.sh out/stills 6`
  monta a folha de contato.
- `npm run check:signs` confere se todos os letreiros da cidade cabem nas fachadas. Um letreiro cortado
  pareceria erro de ortografia.
- `npm run check:signs:img` mostra um prédio com letreiro por quadro, de perto, em `out/stills/placas/`.
  Serve para conferir se nada tapa as letras.
- `npm run entrega:imagens` gera as imagens de divulgação em `out/entrega-v2/` e o comparativo
  antes × depois em `out/comparativo/`. São elas: ilha em 4K (composição `Poster4K`), closes, personagem
  de exemplo, interiores (`Interiores`) e estados de luz e clima.
- Relatório do upgrade gráfico V2: `docs/RELATORIO-V2.md`.
- **Fila de entrada de moradores:** `npm run fila`, `fila:add`, `fila:recusar` e `fila:incorporar`.
  - Os comentários reais aguardam em `data/pending-residents.json` até um episódio incorporá-los.
  - A fila barra duplicados, respeita a capacidade, nunca altera episódio em produção e preserva os 10
    fundadores.
  - Detalhes em `docs/FILA-DE-MORADORES.md`.

## Narração do Ep. 01 (oficial)

A voz oficial é `public/audio/ep01/narracao-original.mp3` (Cidade.mp3: 62 s de fala, 16 frases).

1. `python3 scripts/ep01-narracao.py`
   - Recorta cada frase no meio das pausas medidas (`src/scenes/ep01/narration-v2.json`) e a recoloca na
     linha do tempo de 75 s, com respiros extras nas viradas (`EXTRA`). A voz não é acelerada nem cortada.
   - Grava `public/audio/ep01/narracao.wav` (75,000 s).
   - Grava `src/scenes/ep01/words.json`, com o início e o fim de cada palavra (sílabas + vales de energia).
2. `npm run audio:build`: a trilha (`scripts/audio/music.ts → renderEp01`) lê as mesmas seções e acentos
   do `words.json`.
3. `npm run render:ep01`, depois `npm run srt` (legendas .srt com os mesmos tempos da tela).

Todos os eventos visuais e sonoros são ancorados em palavras da fala (`W('cidadão')`), nunca em números
soltos. Storyboard: `docs/STORYBOARD-EP01.md`. Próximo dia: `docs/DIA-02.md`.

## Cidade e moradores (persistência local em `data/`)

| Arquivo | Conteúdo |
|---|---|
| `city-state.json` | nome, slogan, dia, moradores, empregos (total/ocupados), casas, status de evolução, metas |
| `residents.json` | moradores: id, nome, profissão, bairro, casa, data de entrada (`ficticio: true` = teste) |
| `buildings.json` | 46 prédios: id, nome, tipo, posição (tile i, j), tamanho, status (`pronto`, `planejado`, `em_obra`) |
| `jobs.json` | 18 profissões e 48 vagas: prédio, vagas, ocupadas, roupa do personagem |
| `episodes.json` | episódio, título, duração, data, resumo, estado da cidade no episódio |
| `mapa.json` | mapa 32×32 em texto (ruas, rio, praça, quadra, calçadão, terrenos) |

```bash
npm run city:status                                  # resumo
npm run city:moradores -- 12                         # muda só o contador da HUD
npm run fila:add -- --nome "Lia" --profissao "Dentista" --data 2026-11-29   # comentário real → fila de entrada
npm run fila:incorporar -- --episodio ep03            # os agendados do episódio viram moradores
npm run residents:add -- --nome "Teste" --profissao medico --teste   # só personagem de TESTE
npm run residents:seed -- 5                          # 5 personagens fictícios de teste
npm run residents:clear-test                         # remove os de teste
```

`add` e `seed` escolhem uma casa livre e recalculam moradores, empregos ocupados, casas ocupadas e metas.
Os moradores cadastrados aparecem na demo passeando pela praça, com plaquinha de nome.
O Ep. 01 usa o estado gravado em `episodes.json` (0 moradores), então cadastrar moradores de teste não
altera o episódio.

## Estrutura

```
seguecity/
  data/                       persistência local (JSON, acima)
  public/fonts/               Jersey 10 e Silkscreen (OFL)
  public/audio/music, sfx/    trilha e efeitos sintetizados (gerados; fora do git)
  public/audio/ep01/          lugar da narração (LEIA-ME.md)
  docs/AUDIO.md               trilha e efeitos: mapa das seções, volumes, medições
  scripts/
    render.ts                 render + loudness em 2 passes + x264 yuv420p + faststart
    validate.ts               checagem ffprobe/ffmpeg das especificações
    stills.ts, sheet.sh       quadros soltos e folha de contato para revisão
    ep01-narracao.py          monta a narração na linha do tempo e alinha as palavras (words.json)
    srt.ts / snapshot.ts      legendas .srt; snapshot oficial do estado da cidade (data/snapshots/)
    city.ts                   moradores, contador e personagens de teste
    audio/                    sintetizador chiptune (Node puro): synth.ts, music.ts, sfx.ts…
  src/
    Root.tsx                  composições: CityDemo, Ep01, Sandbox (câmera livre), Debug (só o chão)
    engine/                   motor da cidade (sem React)
      iso.ts                  projeção isométrica 2:1 (tile 32×16, 16 px de altura por tile)
      model.ts                sólidos por raio de pixel + z-buffer: Box, GableI/J, Cyl, Dome, Poly
      ground.ts               chão pixel a pixel, canal do rio, laterais da ilha, cascata
      sprites/                buildings (genéricos e casas), civic (prefeitura, escola, hospital,
                              mercado, delegacia, oficina, terminal, obra com grua), props, vehicles, people
      world.ts                monta a cidade a partir de data/ e espalha postes, árvores, bancos, varal de luzes…
      backdrop.ts             mar de nuvens sob a ilha, ilhotas flutuantes, névoa da cascata
      dynamics.ts             trânsito, ônibus com paradas, pedestres, fonte, bandeiras, semáforos, grua
      renderer.ts             quadro: fundo + chão + água + objetos ordenados, luz, emissão, bloom,
                              ampliação nítida e tilt-shift
      sky.ts, lights.ts, sort.ts, palette.ts, color.ts, rng.ts, font.ts (fonte 3×5 das placas)
    series/                   reaproveitável em todo episódio: stage.ts (estado da cidade + câmera +
                              projeções) e EpisodeShell.tsx (legendas, voz, trilha, ambiente, efeitos)
    components/               CityCanvas, Captions, Sfx, hud/ (Hud, Logo, WorldLabel, Toast, Panels, Cursor,
                              Minimap, PixelIcon, PixelPanel), fx/ (seleção, transição em ladrilhos, fogos,
                              brilho, poeira, holofotes, marcadores)
    scenes/demo/CityDemo.tsx  Fase 1
    scenes/ep01/              Ep01.tsx (cenas), narration.ts + words.json (fala e tempos), ui.tsx, Capas.tsx
    hooks/useFonts.ts, utils/ (câmera por quadros-chave, easing, áudio opcional), data/index.ts
```

## Como editar depois

- **Mudar a cidade:** mova ou acrescente prédios em `data/buildings.json` (posição em tiles; deixe 1 tile
  livre para a calçada até a rua) e ruas em `data/mapa.json`. Tipos genéricos (`casa`, `loja`,
  `apartamento`, `escritorio`) se adaptam ao lote. Os prédios principais acompanham a posição do JSON.
  A câmera olha do canto (31, 31): o que fica com i + j maior fica na frente, então prédios altos devem
  ir para o fundo para não tapar os principais.
- **Novo episódio:** passo a passo em `docs/NOVO-EPISODIO.md`. Em resumo: copie `src/scenes/ep01/`, troque
  o roteiro (`narration.ts`), os planos de câmera e os eventos ancorados nas palavras. Os estados da cidade são
  parâmetros por quadro: casas acesas (`homeFrac`), gente e trânsito (`people`/`traffic`), prédios
  revelados (`reveal`), hologramas (`overrides[id].ghost`) e luz individual (`overrides[id].lit`).
- **Visual:** paleta em `engine/palette.ts`, luz noturna em `engine/sky.ts` (`ambientFor`), fontes e cores
  da interface em `components/theme.ts`.
- **Áudio:** cada `<Sfx at={t} name="..."/>` toca um efeito. `docs/AUDIO.md` explica como mudar trilha e
  efeitos.
- **Câmera livre para testar:** `npm run stills -- Sandbox 1 --props '{"i":12.5,"j":13.5,"zoom":4}'`.

## Notas

- Tudo é função pura do tempo: quadros podem ser renderizados fora de ordem e em paralelo
  (`--concurrency`).
- O comentário "Lucas — mecânico" do Ep. 01 está marcado na tela como **EXEMPLO / personagem fictício**.
  A parte de crescimento é rotulada **PRÉVIA · SIMULAÇÃO DO FUTURO** e não mostra números inventados.
- Licença do Remotion: grátis para pessoas físicas e empresas com até 3 funcionários. Acima disso é
  preciso licença da empresa (remotion.dev/license).
