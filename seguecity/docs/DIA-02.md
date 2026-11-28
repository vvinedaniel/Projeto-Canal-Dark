# Depois do Ep. 01: cadastrar os primeiros moradores e produzir o Dia 02

O Dia 01 está registrado em `data/snapshots/dia-01.json` (0 moradores, 24 casas, 48 vagas). Esse arquivo
não muda mais. Ele é a prova do estado mostrado no Ep. 01.

Os 10 fundadores do Dia 02 já estão cadastrados e confirmados (lista do Ep. 02 encerrada). Os comentários
novos vão para a **fila de entrada** e entram a partir do Ep. 03: veja `docs/FILA-DE-MORADORES.md`.

## 1. Cadastrar os moradores (a partir dos comentários reais)

1. **Colete os comentários à mão** no TikTok: nome + profissão. Use só o que a pessoa escreveu e de forma
   pública. Prefira o primeiro nome ou o apelido; não use sobrenome nem @ sem a pessoa pedir.
2. **Profissão:** mapeie para um id de `data/jobs.json`. Hoje existem: `medico`, `enfermeiro`, `professor`,
   `diretor`, `prefeito`, `servidor`, `jardineiro`, `comerciante`, `padeiro`, `farmaceutico`, `barista`,
   `sorveteiro`, `policial`, `mecanico`, `motorista`, `engenheiro`, `pedreiro`, `analista`.
   - O `prefeito` só existe depois da eleição (meta de 100). Não cadastre ninguém como prefeito antes disso.
   - Profissões que ainda não existem (ex.: empresário, dentista) precisam de uma entrada nova em
     `jobs.json`: prédio, vagas e roupa. Ou combine com a pessoa uma das existentes.
3. **Registre na fila de entrada** (`docs/FILA-DE-MORADORES.md`). Moradores reais não entram mais direto:

   ```bash
   cd seguecity
   npm run fila:add -- --nome "Lia" --profissao "Dentista" --data 2026-11-29 --tiktok <usuário> --comentario <id do comentário>
   npm run fila                 # mostra o episódio previsto de cada pedido e a capacidade
   ```

   - A fila barra duplicados pelo usuário do TikTok, pelo comentário e pelo nome, e aceita homônimos com
     usuários diferentes.
   - Respeita a capacidade: 10 por episódio (configurável com `fila:config`) e as casas livres.
   - Pedido sem casa ou com profissão que ainda não existe fica na fila, aguardando, sem se perder.
   - O usuário do TikTok nunca aparece no vídeo.
   - Episódios em produção nunca são alterados.
   - Os 10 fundadores do Dia 02 já estão confirmados e a lista do Ep. 02 está encerrada.
   - Ao incorporar (`npm run fila:incorporar -- --episodio ep03`), cada morador recebe casa, trabalho e uma
     **aparência persistente** (rosto, cabelo, corpo e uniforme, gravados em `residents.json`).
   - **Nunca** misture teste com cadastro real.
     - Personagens de teste (`npm run residents:seed`) ficam com `"ficticio": true`.
     - Antes de produzir o episódio, rode `npm run residents:clear-test`.
4. **Moradores de exemplo** (Ana, Rafael, Júlia, Bruno, em `src/data/exemplos.ts`):
   - não são moradores e não entram na contagem;
   - se aparecerem de novo, continuam com o rótulo EXEMPLO.

## 2. Fechar o Dia 02

```bash
npm run city:dia -- 2          # avança o dia da cidade
npm run city:snapshot          # grava data/snapshots/dia-02.json (estado oficial exibido no Ep. 02)
```

Acrescente o episódio em `data/episodes.json`:

- `"episodio": 2`, `"id": "ep02"`, título e resumo;
- o bloco `"estado"` com os números do snapshot (`moradores`, `empregos`).

O vídeo lê o estado desse bloco, nunca números escritos à mão.

## 3. Produzir o Ep. 02

O Ep. 01 é o modelo completo. Veja também `docs/NOVO-EPISODIO.md`.

1. **Pasta:** copie `src/scenes/ep01/` para `src/scenes/ep02/`. Registre a composição em `src/Root.tsx` e
   o alvo em `scripts/render.ts` (`TARGETS`).
2. **Narração:**
   - Salve a voz em `public/audio/ep02/narracao-original.mp3`.
   - Meça as frases com
     `ffmpeg -i <voz> -af silencedetect=n=-35dB:d=0.3 -f null -`. Cada pausa separa uma frase.
   - Grave os tempos e os textos em `src/scenes/ep02/narration-v2.json`, no mesmo formato do Ep. 01.
   - Em `scripts/ep01-narracao.py`, troque os caminhos para ep02 e ajuste `EXTRA` (o respiro antes de
     cada frase). Rode o script. Ele monta `narracao.wav` com a duração exata e gera `words.json`, com o
     tempo de cada palavra para as legendas.
   - **Não acelere a voz.** Se ela não couber na duração, encurte o roteiro ou aumente a duração.
3. **Direção (`Ep02.tsx`):**
   - planos em `T`/`SHOTS`, um corte a cada 2–4 s;
   - eventos ancorados em `W('palavra')`;
   - interiores com `InteriorShot` (`casa`, `hospital`, `oficina`, `escola`, `mercado`, `prefeitura`);
   - moradores reais em cena com `personObj(id, lookOf(r.aparencia), ...)` e a ficha com `CharacterCard`,
     sem o rótulo EXEMPLO, porque são moradores de verdade.
4. **Trilha:**
   - em `scripts/audio/music.ts`, copie `renderEp01` para `renderEp02` e aponte para o `words.json` do Ep. 02;
   - registre em `scripts/audio/synth.ts` e rode `npm run audio:build`.
5. **Revisão antes do render:**
   - `npm run check:signs` e `npm run check:signs:img` (ortografia dos letreiros);
   - `npm run stills -- Ep02 <tempos> --scale 0.25` (folha do storyboard).
6. **Render e entrega:**

   ```bash
   npx tsx scripts/render.ts ep02 --concurrency 4          # ~3–4 min neste container
   npx tsx scripts/validate.ts out/seguecity-ep02.mp4 --dur <s>
   npx tsx scripts/srt.ts src/scenes/ep02/words.json out/seguecity-ep02.srt
   ffmpeg -i out/seguecity-ep02.mp4 -vf "fps=1,scale=216:-1,tile=15x5" -frames:v 1 out/folha-ep02.jpg
   ```

7. **Capas:** copie `src/scenes/ep01/Capas.tsx`. Elas usam a cidade real e a logo oficial, com o texto na
   faixa central 3:4 (y 240–1680), que a grade do perfil mostra.

## 4. Ideias para o Dia 02 (a partir do estado real)

- **Abrir com o contador real** ("MORADORES: N") e a chegada do Morador Nº 1: a casa acende, a ficha com
  retrato aparece e ele vai até o trabalho. Use um interior do prédio da profissão.
- **Fundadores:** os 10 primeiros entram no painel "FUNDADORES" (`FoundersPanel`) e na placa do
  Monumento da Fundação.
- **Metas:** a barra de "Fundadores da cidade (0/10)" avança com o número real. A eleição só aparece como
  meta até chegar a 100.
- **Sem números inventados:** se poucos comentarem, o episódio mostra exatamente isso. O suspense é real.
