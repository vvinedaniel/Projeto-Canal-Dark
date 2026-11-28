# Áudio do SegueCity — trilhas e efeitos sintetizados

Todo o áudio do SegueCity (trilha da demo, trilha do ep. 01, efeitos de interface e ambientes em loop)
é **gerado por código**, sem amostras, bancos de sons ou APIs externas. O sintetizador é TypeScript puro
(só módulos nativos do Node) e é **determinístico**: rodar duas vezes gera arquivos idênticos byte a byte
(todo ruído vem de um gerador pseudoaleatório com semente fixa; não há `Math.random`).

Estética: "retrô moderno premium". Timbres de chiptune (pulso com ciclo variável, triângulo em degraus no
baixo, ruído na bateria, sinos FM), mas com acabamento de trilha indie/lo-fi: passa-baixas suave nos pulsos,
desafinação estéreo, delay pingue-pongue, reverb curto (Freeverb), sidechain leve do bumbo no pad e no baixo,
saturação suave no master. Tonalidade Fá maior / Ré menor, acordes com sétima (Fmaj7 – Em7 – Dm7 – Cmaj7,
Bbmaj7, Am7, C, Gm7), andamento entre 104 e 111 BPM.

## Como regenerar

Na raiz do projeto (`seguecity/`):

```bash
npx tsx scripts/audio/synth.ts                 # gera tudo (~37 s num container de 4 vCPU)
npx tsx scripts/audio/synth.ts ep01 coin       # gera só os itens citados (ids da lista abaixo)
npx tsx scripts/audio/analyze.ts               # verificação completa (usa ffprobe e ffmpeg)
npx tsx scripts/audio/analyze.ts --md          # idem + tabelas em Markdown para este documento
SEGUE_STEMS=1 npx tsx scripts/audio/synth.ts demo   # mostra o nível de cada barramento (depuração)
```

Saída: WAV PCM 16 bits, 48 kHz, estéreo, em `public/audio/music/` e `public/audio/sfx/`.
O `synth.ts` já normaliza cada arquivo (ver "Normalização") e imprime LUFS/pico de cada um, os andamentos
de cada seção do ep. 01 e os instantes exatos dos acentos das profissões.

Conferir o determinismo:

```bash
npx tsx scripts/audio/synth.ts >/dev/null && (cd public/audio && find . -name '*.wav' | sort | xargs md5sum) > /tmp/a.md5
npx tsx scripts/audio/synth.ts >/dev/null && (cd public/audio && find . -name '*.wav' | sort | xargs md5sum) > /tmp/b.md5
diff /tmp/a.md5 /tmp/b.md5 && echo idênticos
```

### Organização do código (`scripts/audio/`)

| arquivo | conteúdo |
|---|---|
| `synth.ts` | ponto de entrada: lista de arquivos, normalização, gravação, resumo |
| `dsp.ts` | núcleo: gerador pseudoaleatório (mulberry32), buffers estéreo, osciladores com polyBLEP (pulso, triângulo, seno), filtros (SVF TPT, 1 polo, biquads RBJ), Freeverb, delay pingue-pongue, saturação, *tape stop*, processamento circular para loops |
| `instruments.ts` | instrumentos (pad, pluck/arpejo, lead, sino FM, "keys", baixo, bumbo, caixa, chimbal, shaker, tom, "toc", prato, prato ao contrário, riser, boom) e o mixer (barramentos, envios de reverb/delay, sidechain) |
| `music.ts` | as duas trilhas (demo e ep. 01): grade rítmica por seção, acordes, padrões, arranjo, bolso de voz, master |
| `sfx.ts` | os 14 efeitos e os 2 ambientes em loop |
| `loudness.ts` | medição ITU-R BS.1770-4 (LUFS integrado), pico verdadeiro (sobreamostragem 4×), limitador com antecipação, normalização |
| `wav.ts` | leitura/escrita de WAV 16 bits (cabeçalho fixo, sem metadados) |
| `analyze.ts` | verificação: ffprobe, `ffmpeg -af ebur128=peak=true`, DC, saturação, pontas em zero, emenda dos loops, RMS por segundo, volume sugerido dos efeitos |

### Normalização

- **Músicas:** −16 LUFS integrado; pico verdadeiro limitado em −2,0 dBTP pelo limitador interno
  (meta: ≤ −1,5 dBTP, medido pelo ffmpeg). No ep. 01 o limitador atua no máx. 2,1 dB, por 0,11 s no total
  (só em picos de bateria/acorde final); na demo não atua.
- **Efeitos curtos:** pico de amostra em −3 dBFS (média/DC removida com janela de Hann; começam e terminam em zero).
- **Ambientes em loop:** −30 LUFS integrado.

## Arquivos e uso

### Música

| arquivo | id | duração | uso |
|---|---|---|---|
| `public/audio/music/demo.wav` | `demo` | 15,0 s | Vitrine da cidade. 0–3 s anoitecer (pad abrindo + sininhos "luzes acendendo" cada vez mais frequentes, subida); 3,0 s o groove entra (bumbo, caixa, chimbal, baixo em triângulo) e vai ganhando camadas a cada compasso (arpejo, contracanto, shaker, gancho melódico); 12,6–13,8 s meio compasso de subida (rufo + prato ao contrário); **13,8 s** acorde de resolução (Fmaj9 + prato + sinos); cauda até silêncio absoluto em 15,0 s. 100 BPM (compasso = 2,4 s). |
| `public/audio/music/ep01.wav` | `ep01` | 75,0 s | Trilha do ep. 01, travada nos tempos das cenas (mapa abaixo). |

### Efeitos (HUD pixel-art)

| arquivo | id | duração | descrição / uso |
|---|---|---|---|
| `sfx/ui-blip.wav` | `ui-blip` | 80 ms | blip de quadrada suave (A5 com leve queda de tom): toque/seleção na interface |
| `sfx/ui-move.wav` | `ui-move` | 450 ms | "whoosh" de ruído filtrado com varredura e pan L→R: movimento de câmera, painel deslizando |
| `sfx/popup.wav` | `popup` | 250 ms | "pop" alegre de duas notas subindo (F5 → C6): pop-ups do HUD |
| `sfx/notify.wav` | `notify` | 600 ms | sino FM duplo (A5, E6) com eco curto: notificação |
| `sfx/unlock.wav` | `unlock` | 900 ms | arpejo F5–A5–C6–F6 + nota final com vibrato e brilhos: "conquista desbloqueada" |
| `sfx/coin.wav` | `coin` | 350 ms | moeda clássica (B5 → E6) amaciada (mais triângulo, passa-baixas 3 kHz) |
| `sfx/sparkle.wav` | `sparkle` | 1,2 s | cintilar mágico (≈46 grãos de sino agudos + glissando suave + ar): personagem se materializando |
| `sfx/tick.wav` | `tick` | 40 ms | tique mínimo de contador |
| `sfx/empty.wav` | `empty` | 1,5 s | baque grave e oco com um pouco de reverb: "Moradores: 0" |
| `sfx/typing.wav` | `typing` | 50 ms | um clique de teclado macio (para disparar repetidamente) |
| `sfx/build.wav` | `build` | 500 ms | baque + "pop" + estalidos de peças assentando: prédio aparecendo |
| `sfx/levelup.wav` | `levelup` | 1,8 s | fanfarra curta (C5–F5–A5–C6 e acorde de F com "metais" chiptune, sinos, prato leve): cartela final |
| `sfx/firework.wav` | `firework` | 2,0 s | assobio de subida, estouro abafado (0,8 s) e crepitar: fogos suaves |
| `sfx/stamp.wav` | `stamp` | 300 ms | batida de carimbo/selo de borracha |
| `sfx/night-ambience.wav` | `night-ambience` | 20,0 s (loop) | grilos, trânsito distante bem grave, zumbido leve e duas rajadas fracas de vento; quase imperceptível |
| `sfx/water.wav` | `water` | 10,0 s (loop) | fonte/riacho: gotas e bolhas + corrente em ruído filtrado |

Os dois loops são **sem emenda**: os eventos (grilos, gotas) são colocados numa linha circular e todos os
filtros/reverbs rodam em regime periódico (o sinal é processado 3 voltas e fica a última), e toda modulação
lenta tem número inteiro de ciclos por volta. No Remotion basta tocar com `loop`.

## Medidas (geradas por `analyze.ts --md`)

Duração/taxa/canais pelo `ffprobe`; LUFS e pico verdadeiro pelo `ffmpeg -af ebur128=peak=true`
(o ffmpeg não calcula LUFS integrado de sons com menos de 0,4 s: aparece "n/d").
Todos: PCM 16 bits, 48 000 Hz, 2 canais; nenhuma amostra saturada; DC < 1,2·10⁻⁴.

| arquivo | duração | LUFS integrado | pico verdadeiro (dBTP) | pico de amostra (dBFS) |
|---|---|---|---|---|
| `music/demo.wav` | 15,000 s | −16,0 | −2,4 | −2,6 |
| `music/ep01.wav` | 75,000 s | −16,0 | −2,0 | −2,0 |
| `sfx/ui-blip.wav` | 0,080 s | n/d | −3,0 | −3,0 |
| `sfx/ui-move.wav` | 0,450 s | −12,9 | −3,0 | −3,0 |
| `sfx/popup.wav` | 0,250 s | n/d | −2,9 | −3,0 |
| `sfx/notify.wav` | 0,600 s | −12,2 | −3,0 | −3,0 |
| `sfx/unlock.wav` | 0,900 s | −15,0 | −3,0 | −3,0 |
| `sfx/coin.wav` | 0,350 s | n/d | −3,0 | −3,0 |
| `sfx/sparkle.wav` | 1,200 s | −14,2 | −2,8 | −3,0 |
| `sfx/tick.wav` | 0,040 s | n/d | −2,2 | −3,0 |
| `sfx/empty.wav` | 1,500 s | −20,8 | −3,0 | −3,0 |
| `sfx/typing.wav` | 0,050 s | n/d | −2,7 | −3,0 |
| `sfx/build.wav` | 0,500 s | −21,2 | −2,8 | −3,0 |
| `sfx/levelup.wav` | 1,800 s | −13,3 | −3,0 | −3,0 |
| `sfx/firework.wav` | 2,000 s | −17,1 | −3,0 | −3,0 |
| `sfx/stamp.wav` | 0,300 s | n/d | −3,0 | −3,0 |
| `sfx/night-ambience.wav` | 20,000 s | −30,0 | −14,2 | −14,2 |
| `sfx/water.wav` | 10,000 s | −30,0 | −16,0 | −16,0 |

Emenda dos loops (fim → início), comparada ao resto do arquivo: `night-ambience` salto 3,0·10⁻³
(p99 dos saltos entre amostras vizinhas: 5,1·10⁻²) e 2ª diferença 6,1·10⁻⁴ (p99,9: 4,3·10⁻²);
`water` salto 7,2·10⁻³ (p99: 1,9·10⁻²), 2ª diferença 6,0·10⁻³ (p99,9: 1,6·10⁻²). Ou seja, a emenda é
indistinguível de qualquer outro ponto do arquivo.

### Volume sugerido dos efeitos no Remotion

Normalizar pelo pico deixa sons de crista baixa (tom sustentado, ruído) bem mais altos que cliques. A coluna
abaixo é um **ponto de partida** para o efeito ficar ~8 LU abaixo de uma narração em −16 LUFS (maior
loudness em janelas de 100 ms levado a −24 LUFS); ajuste a ouvido.

| efeito | loudness máx. em 100 ms (LUFS) | `volume` sugerido |
|---|---|---|
| `coin.wav` | −4,9 | 0,11 |
| `notify.wav` | −7,8 | 0,16 |
| `ui-move.wav` | −9,0 | 0,18 |
| `unlock.wav` | −10,0 | 0,20 |
| `sparkle.wav` | −10,2 | 0,20 |
| `levelup.wav` | −10,5 | 0,21 |
| `popup.wav` | −11,2 | 0,23 |
| `empty.wav` | −11,3 | 0,23 |
| `ui-blip.wav` | −11,4 | 0,23 |
| `stamp.wav` | −11,5 | 0,24 |
| `firework.wav` | −11,7 | 0,24 |
| `build.wav` | −16,2 | 0,41 |
| `tick.wav` | −17,4 | 0,47 |
| `typing.wav` | −20,9 | 0,70 |

Ambientes (−30 LUFS) podem entrar com `volume` 1 sob a narração. Trilhas (−16 LUFS): como cama sob a voz,
comece em `volume` ≈ 0,35–0,45 (−9 a −7 dB) e suba nas pausas se quiser; a trilha do ep. 01 já tem um
"bolso" para a voz (abaixo).

Exemplo (Remotion 4: `Audio`/`Html5Audio` de `remotion`):

```tsx
<Html5Audio src={staticFile('audio/music/ep01.wav')} volume={0.4} />
<Sequence from={Math.round(8.0 * fps)}><Html5Audio src={staticFile('audio/sfx/empty.wav')} volume={0.23} /></Sequence>
<Html5Audio src={staticFile('audio/sfx/night-ambience.wav')} loop />
```

## Mapa de seções do ep. 01 (`music/ep01.wav`)

Os limites de seção são **exatos**: cada seção tem a sua grade rítmica com um número inteiro de tempos entre
o início e o fim da cena, então toda troca de cena cai num tempo forte. O andamento varia só ±2,5 % entre
seções com groove (106,7 → 109,1 → 110,8 → 108 → 108 → 105 BPM), imperceptível sob a voz.
"Voz" é a janela de fala informada; nela a trilha evita melodia na faixa 1–4 kHz e os ganchos melódicos
ficam nas pausas.

| tempo (s) | cena | andamento / grade | acordes | o que acontece | voz (s) |
|---|---|---|---|---|---|
| 0,0–8,0 | maravilha | 104 BPM, sem grade de cena | Fmaj7 · Em7 · Dm7 · Cmaj7 (1 compasso cada) | 1º quadro já com som: glissando de sininhos (0–0,2 s, antes da voz) + pad; arpejo curioso de pulso 12,5 % em registro médio filtrado; "pulso leve" = baixo staccato em colcheias + shaker; brilhos esparsos. Pausa 7,6–8,0: floreio C6-E6-G6-B6 | 0,3–7,6 |
| **8,0** | corte | — | — | **tape stop** em 0,42 s (velocidade e tom caem até parar) + grave "desligando"; em 8,5 s a trilha está a −41 dBFS RMS (quase silêncio) | — |
| 8,0–15,0 | cidade vazia | livre | Ré menor (D-A-E) | pad solitário e escuro entrando devagar (8,55 s); 10,1–13,5 s motivo melancólico de "keys" (A4 D5 C5 A4 G4 E4) com muito reverb; **14,0–15,0 riser** (ruído subindo + tom + prato ao contrário) | 8,4–9,8 |
| **15,0** | a ideia | 16 tempos = 106,67 BPM (compasso 2,25 s) | Fmaj7 · Am7 · Bbmaj7 · Csus4→C | prato suave + groove entra: bumbo (1 e 3), chimbal em colcheias, baixo; arpejo a partir de 17,25 s; virada de caixa no fim. Pausa 23,6–24,2: sininhos A5-C6-D6 → F6 em 24,0 | 15,2–23,6 |
| **24,0** | seu personagem | 20 tempos = 109,09 BPM (2,2 s) | Dm7 · Bbmaj7 · Fmaj7 · C · Gm7→C7 | groove completo e saltitante: caixa no 2 e 4, ghost notes, baixo em oitavas, **contracanto "plucky"** sincopado. Pausa 34,2–35,2: virada de sinos G5-Bb5-C6-E6 | 24,2–34,2 |
| **35,0** | profissões | 24 tempos = 110,77 BPM (2,1667 s) | Fmaj7 · Em7 · Dm7 · Cmaj7 · Bbmaj7 · C7sus4→C7 | groove mais cheio (pad dobrado, chimbal em semicolcheias, shaker, arpejo + contracanto); **acentos** ("toc" + sino + grave curto, sinos subindo C6 D6 F6 G6 A6 C7) — ver instantes abaixo. Pausa 47,0–48,2: gancho C6 A5 E5 G5 A5 C6 → D6 em 48,0 | 35,2–47,0 |
| **48,0** | crescimento | 18 tempos = 108 BPM (4 compassos + ½) | Bbmaj7 · C6 · Dm7 · Em7 · (½) C7sus4 | baixo subindo Bb-C-D-E; filtro do pad abrindo de 1,05 a 2,3 kHz; arpejo passa a semicolcheias e sobe uma oitava; bumbo "four on the floor" a partir de 52,4 s; 56,4–58,0 riser + rufo de caixa acelerando + prato ao contrário | 48,2–57,6 |
| **58,0** | futuro / prefeito | 18 tempos = 108 BPM (4 compassos + ½) | Fmaj7 · Am7 · Bbmaj7 · Csus4→C · (½) Gm7 | prato + grave na entrada; meio-tempo épico (caixa no 3), pad largo dobrado, **sinos em mínimas** (A4 C5 E5 D5 D5 C5 G4 A4 → D5); **virada de tons 67,03–67,87** + caixa | 58,2–67,6 |
| **68,0** | final / CTA | 7 tempos = 105 BPM (1 compasso + ¾) | Bbmaj7 · Csus4→C · **Fmaj9 em 72,0** | prato + groove completo (semicolcheias, chimbal aberto, arpejo, contracanto); 70,29–72,0 compasso de ¾ de subida (bumbo em todo tempo, rufo, tons); **prato ao contrário 70,5→72,0 e riser** | 68,1–74,6 |
| **72,0** | cartela | — | Fmaj9 | **acorde de resolução + prato + grave + sinos F5-A5-C6-E6-G6 (C7, F7 depois)**, exatamente em 72,000 s; soa e decai; fade em cosseno 73,4 → 74,96; silêncio absoluto em 75,0 | (até 74,6) |

**Acentos das profissões:** uma batida por profissão falada, pedida nos mesmos tempos das palavras em
`src/scenes/ep01/narration.ts` (37,1 / 38,9 / 40,7 / 42,5 / 44,3 / 46,1 s; `EP01_ACCENT_TARGETS` em
`scripts/audio/music.ts`). Cada uma cai na semicolcheia mais próxima: **37,167 · 38,927 · 40,688 · 42,448 ·
44,344 · 46,104 s**. Se a narração real mudar esses tempos, atualize `EP01_ACCENT_TARGETS` e rode
`npm run audio:build`.

**Energia medida (RMS por segundo, dBFS)** — confirma as mudanças de seção:
0–8 s ≈ −23; queda no tape stop (8,5 s: −41; 9–10 s: −34); 10–14 s ≈ −30 (motivo solitário);
15–24 s ≈ −18,5; 24–48 s ≈ −17; 48–58 s sobe até ≈ −15,5; 58–68 s ≈ −16,5; 68–72 s ≈ −15 → −14,5; 72–73 s −13,5;
**pico em 72,0–72,1 s (−11 dBFS em janela de 100 ms**, contra −14,4 em 71,8); 74,0 s −29,5; 74,9 s −90.

### Bolso para a voz (ep. 01)

Dentro de cada janela de fala da tabela, a faixa de ~1–4,2 kHz da trilha é atenuada 3 dB (divisão em
3 bandas com filtros de 1 polo complementares; rampas de 0,18 s), e fica intacta nas pausas. Isso abre espaço
para as consoantes da narração sem "bombear" o volume. As janelas estão em `EP01_SECTIONS` (`music.ts`); se a
narração final tiver tempos diferentes, ajuste ali e regenere.

### Mudar tempos de cena

Os tempos ficam no próprio arranjo (`ep01Main` em `music.ts`): cada seção usa `Grid.fit(início, fim, tempos)`.
Para mover uma troca de cena, troque os dois números da seção (e, se a duração mudar muito, o número de
tempos, para manter o andamento perto de 105–110 BPM).

## Limitações conhecidas

- Nada foi ouvido por um humano neste ambiente: o equilíbrio foi conferido por medidas (nível de cada
  barramento, energia por banda e por seção, espectrogramas). Vale uma escuta final nos fones/celular.
- Os timbres são sintéticos por definição (estética chiptune); não há instrumentos acústicos realistas.
- O LUFS integrado de efeitos com menos de 0,4 s não é definido pela norma (aparece "n/d").
