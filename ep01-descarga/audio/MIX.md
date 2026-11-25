# Mixagem — ep. 01 "Para onde vai o cocô depois da descarga?"

Gerar: `tools/mix.sh` (chama `python3 tools/sfx.py` sozinho se `sfx.py` for mais novo que `audio/sfx.wav`; ~20 s no total).
Vídeo: `tools/encode.sh` usa `audio/mix.wav` (AAC 192 kbps).

## Cadeia
**Efeitos + trilha (`tools/sfx.py` → `audio/sfx.wav`, estéreo 48 kHz float32).** Tudo é sintetizado com numpy/scipy, com seed fixa e um gerador por deixa.
Cada som é normalizado (trecho mais forte de 50 ms em −20 dBFS RMS) e recebe o ganho da deixa, fades em cosseno e pan.
Há envios para dois reverbs de convolução sintéticos (`room` 0,45 s e `hall` 1,9 s).
O ducking é feito em Python, com um envelope de atividade da voz tirado da narração (antecipação de 60 ms, ataque de 40 ms, hold de 150 ms, soltura de 350 ms). A profundidade depende do barramento:
trilha −10 dB · amb −6 dB · sfx −3 dB · hero −1,5 dB. Por fim, passa-altas de 28 Hz e passa-baixas de 11 kHz no barramento.

**Voz (`narracao.mp3`):** soxr 48 kHz → passa-altas 80 Hz + 60 Hz → EQ −1,5 dB em 300 Hz → de-esser leve (i=0,35)
→ ganho para −20 LUFS → compressor 2:1 (−24 dB, joelho 6 dB, RMS) → compressor de picos 4:1 (−11 dB, 1 ms)
→ dual mono → −16 LUFS.

**Master:** voz + sfx (amix sem normalizar) → ganho calculado em 2 passadas → limitador em 192 kHz (teto −1,5 dBFS, o que dá um controle de true peak)
→ 48 kHz → fade-in de 15 ms e fade-out de 101,95 a 102,5 s, sob a cauda do acorde final → PCM 24 bits.

## Níveis medidos (ffmpeg ebur128 / volumedetect)
| | Integrado | LRA | True peak |
|---|---|---|---|
| **mix.wav** | **−14,0 LUFS** | 1,9 LU | **−1,5 dBTP** (max_volume −1,5 dB, mean −16,8 dB) |
| voz (antes do master) | −16,0 LUFS | 1,9 LU | +0,4 dBTP (o limitador atua em ~2 % dos quadros de 10 ms, até ~4 dB) |
| sfx + trilha (antes do master) | −29,6 LUFS | 10,8 LU | −5,4 dBTP |

Em loudness momentâneo (400 ms), a voz fica em torno de −15 LUFS. Os efeitos de textura ficam 12–18 dB abaixo dela, e o pad sob a voz 20–25 dB abaixo.
Os picos são a descarga (−19/−20 LUFS, a ~4 dB da voz), o impacto de abertura, o de 97,45 s e a cartela de 101 s (−18 LUFS).

## Deixas (segundos globais; a lista completa, com ganhos, está no topo de `tools/sfx.py`)
- 0–102,5 pad escuro (Rém → Si♭ → Solm → Fá → Rém add9 → tensão com Mi♭ → Rém), com glissandos nas trocas de cenário
- 0 impacto de abertura · 0–28,4 room tone · 4,95 clique · 5,05 baque da válvula
- 6,4–11,3 gorgolejo da caixa · 7,5–15,7 água na borda (pico em 12) · 15,4–19,0 sifão enchendo
- 18,9–20,65 **puxada da descarga** · 20,4–21,2 gluglu · 21,5–30 caixa reenchendo · 24,4–27,9 gases na barreira d'água
- 28,4–37,7 esgoto no cano enterrado · 32,6 plop · 33,2–37,2 carro (E→D)
- whoosh grave de túnel em 37,75 / 43,72 / 50,20 / 86,76 (começa 0,35 s antes)
- whoosh aéreo em 65,04 / 67,95 / 72,72 (com mergulho na água) e 70,50 / 74,62
- 38,2–39,8 subida do bairro · 37,8–47,9 rede de esgoto · 43,9–45,7 rumor de profundidade
- 47,76 relé + 2 bombas (até 50,2) · 48,0–49,4 jato de recalque · 49,3–50,2 queda d'água
- 50,2–65,1 ambiente da estação · 54,5–57,7 grade (clank a cada 0,7 s) · 56,2 / 57,2 caçamba
- 58,6–60,8 areia · 61–65 decantador
- 65,1–67,95 béquer (vidro em 65,6) · 67,95–70,55 micro · 70,5–72,75 aeração · 72,72–74,67 micro com "pops"
- 74,62–79 decantador secundário · 77,5–79 vertedor · 79,4 baque + lodo (até 81,1) · 81,1–83,5 biodigestor
- 84,4 gerador · 84,5 chama · 84,6–85,7 zaps e cliques de luz
- 86,8–89,2 cascata · 87–90,65 e 92,9–95,4 rio + pássaros · 89,5 negação · 90,45 mergulho / 90,5–93,05 subaquático
- 91,2 libélula · 92,95 emersão · 93,45–95,35 shimmer
- 95,8–101,05 drone de tensão · 97,45 impacto escuro · 97,7 impacto do título · 101,0–102,5 impacto + acorde final

Limitação: são sons sintetizados. A água, as bolhas e os impactos convencem; motores, gerador, carro, pássaros e libélula
são mais estilizados, porque não há gravações reais aqui. Os níveis foram ajustados por medição, sem audição.
