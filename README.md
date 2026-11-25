# Mundo por Dentro

Canal de TikTok que explica como o mundo funciona com animação 3D (three.js), em 9:16, 1080×1920, 30 fps.

## Episódios

| # | Título | Pasta |
|---|--------|-------|
| 01 | Para onde vai o cocô depois da descarga? | `ep01-descarga/` |

## Como um episódio é montado

- `audio/narracao.mp3` — a narração; tudo é sincronizado com ela.
- `src/timeline.js` — início e fim de cada frase (medidos pelas pausas do áudio), janelas dos cenários e legendas palavra a palavra.
- `src/lib.js` — biblioteca comum: materiais, solo em corte, tubos em corte, partículas, setas, luz de estúdio, trilho de câmera.
- `src/sets/<id>.js` — um cenário 3D por trecho da narração. O contrato e a direção de arte estão em `docs/GUIA-DE-CENARIOS.md`.
- `src/main.js` — motor: escolhe o cenário pelo tempo, renderiza (sombras, oclusão ambiente, tone mapping) e desenha legendas, marca e rótulos.

## Comandos (dentro da pasta do episódio)

```bash
npm install                                             # three.js e a fonte
node tools/render.cjs stills --t 5,12,20 --scale 0.5    # quadros soltos em out/stills
tools/sheet.sh casa 0 37.5 2.5                          # folha de contato de um cenário
node tools/render.cjs frames --from 0 --to 3075         # todos os quadros em out/frames (demora: render por software)
tools/encode.sh                                         # junta quadros + narração em out/mundo-por-dentro-ep01.mp4
```

Para ver no navegador, sirva a pasta do episódio com qualquer servidor estático e abra `index.html`
(`?only=casa` carrega só um cenário, `?t=12` começa num instante, `?ao=0` desliga a oclusão ambiente).
