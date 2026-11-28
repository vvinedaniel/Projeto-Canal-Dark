# Como fazer o próximo episódio

O Ep. 01 (`src/scenes/ep01/`) é o modelo. Um episódio tem quatro partes. Só a primeira muda de verdade
a cada vez; o resto é reaproveitado.

1. **Roteiro e voz** (`narration.ts` + `words.json`):
   - `scripts/ep01-narracao.py` monta a voz na linha do tempo, com respiros e sem acelerar;
   - ele também grava o início e o fim de cada palavra;
   - passo a passo para um episódio novo em `docs/DIA-02.md`.
2. **Direção** (`EpXX.tsx`):
   - **Câmera:** planos (`Key[][]`) com alvo em tiles (i, j), altura `z` e `zoom`. Entre os quadros-chave
     de um plano o movimento é contínuo (Catmull-Rom com deriva leve). Do primeiro quadro de um plano
     para o seguinte há um corte, coberto pela transição em ladrilhos (`tileWipe` com `cutTimes`).
   - **Âncoras:** `const A = { x: W('palavra') }`. Todo evento visual e sonoro nasce de uma palavra da fala.
   - **Cidade no quadro:** `stage({ t, shots, people, traffic, homeFrac, extra, overrides, reveal, hidden, tilt })`
     devolve os parâmetros do `CityCanvas` e projeções para a interface: `anchor(id)` (topo do prédio),
     `corners(id)` (lote no chão, para a seleção) e `scr(i, j, z)` (qualquer ponto).
   - **Interface:** `WorldLabel`, `Toast`, painéis (`Panels.tsx`), `Cursor` com `cursorAt`, `Minimap`,
     `Stamp`, `CtaButton`. Efeitos pixel em `FxLayer` (`selection`, `marker`, `sparkles`, `dust`,
     `searchlights`, `fireworks`, `glitch`, `tileWipe`).
3. **Moldura** (`series/EpisodeShell.tsx`): fontes, legendas, narração opcional, trilha que abaixa sob a
   voz, ambientes em loop por pontos `[t, volume]` e a lista de efeitos sonoros (`Cue[]`).
4. **Registro:** acrescente a composição em `src/Root.tsx`, o alvo em `scripts/render.ts` (`TARGETS`) e a
   entrada em `data/episodes.json`, com o estado da cidade naquele episódio.

## Regras que valem para todo episódio

- **Função pura do tempo:** nada de `Math.random` nem de estado entre quadros. O render é paralelo e fora
  de ordem.
- **Composição 9:16:**
  - HUD de 150 a 350 px;
  - painéis de 360 a 900 px;
  - assunto em ~45% da altura (`frameY`);
  - legendas entre 64 e 77%;
  - os 14% de baixo e os 12% da direita ficam livres para a interface do TikTok.
- **Rótulos:** no máximo 2 ao mesmo tempo, e um sai antes do próximo entrar.
- **Planos:** quem aparece por menos de ~1,5 s não é lido. Cortes ficam a pelo menos 1,6 s um do outro.
- **Honestidade:**
  - personagens e comentários de exemplo levam o rótulo EXEMPLO/fictício;
  - projeções levam o rótulo SIMULAÇÃO;
  - números vêm de `data/*.json`, nunca escritos à mão;
  - o episódio usa o estado gravado em `episodes.json`.
- **Placas dentro da cidade:** rode `npm run check:signs` depois de mexer em prédios ou nomes. Ele falha se
  algum letreiro não couber e sair cortado, o que pareceria erro de ortografia.
- **Antes do render final:**
  - `npm run stills -- EpXX <tempos> --scale 0.5` e `scripts/sheet.sh out/stills 9`;
  - depois do render, 1 quadro por segundo do filme inteiro
    (`ffmpeg -i out/x.mp4 -vf "fps=1,scale=216:-1,tile=15x5" -frames:v 1 folha.jpg`).

## Cidade: o que muda entre episódios

- **Moradores:** comentários reais entram pela fila (`npm run fila:add`). Na produção do episódio, use
  `npm run fila:incorporar -- --episodio epNN`: os moradores recebem casa, trabalho e aparência
  persistente, e a lista do episódio é encerrada (`docs/FILA-DE-MORADORES.md`).
  - Elenco do episódio: `elencoDo('epNN')` (`src/data`).
  - Para pôr um morador em cena: `personObj(id, lookOf(r.aparencia), ...)`.
- **Prédios novos:** acrescente o prédio em `buildings.json` com `status: "planejado"`. Para revelá-lo
  brotando do chão, use `reveal` + `overrides[id].dy`. Depois mude para `pronto`.
- **Casas acesas:** `homeFrac` (0..1, pela ordem fixa `rank`). Para acender um prédio só, use
  `overrides[id].lit`.
