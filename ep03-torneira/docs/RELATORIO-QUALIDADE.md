# Ep. 03 — relatório de qualidade

## Como foi validado
1. **Cada módulo** (7, feitos em paralelo) foi conferido pelo próprio agente em imagens de cada fase de obra e de
   funcionamento, e com trechos animados curtos dos movimentos.
2. **Integrado**: as 23 etapas renderizadas com todos os módulos, 4 quadros por etapa (início, 1/3, 2/3, fim —
   `tools/validate.sh`, folhas em `out/valid/etapa-NN.jpg`), corrigidas e renderizadas de novo.
3. **Trechos animados** (30 fps) dos mecanismos mais complexos: bomba, floculadores, raspador de lodo, lavagem do filtro,
   tanque de contato, hidrômetro, boia, torneira e copo (`out/anim/*.mp4`).
4. **Filme inteiro a 1 quadro por segundo** para achar espaço vazio, cortes ruins e rótulos sobrepostos.

## Problemas encontrados e corrigidos
| # | Problema | Correção |
|---|---|---|
| 1 | Câmera atravessava paredes, tubos e telhados (casa em 3,4 s, 95–96 s, 100 s, 105–108 s; barrilete em 15 s) | trilho refeito com chaves testadas, recuo da cozinha pela frente em corte |
| 2 | Planos tapados (árvores no talude e na frente da ETA, prédio na frente da torre) | árvores retiradas dos corredores de câmera; câmeras da torre pelo lado da ETA |
| 3 | Tanques da ETA atrás das legendas e lente cobrindo o assunto | alvo da câmera reposicionado: lente no alto, tanque na faixa livre, legendas embaixo |
| 4 | Represa vista só como "água chapada" | plano alto com serra, mata, represa e margem da captação |
| 5 | Ponto da lente visível em todos os quadros | camada SVG da lente escondida quando a lente está desligada |
| 6 | Hidrômetro girando sem água correndo para dentro | ramo da cozinha enche durante a leitura (94,6–95,6 s); turbina gira só com consumo |
| 7 | Reservatório apoiado aparecia com o chão do platô por dentro | furo e vala em corte no terreno |
| 8 | Degrau de 14 m nos morros laterais | relevo suavizado no `layout.js` |
| 9 | Contraste fraco entre água filtrada e tratada no tanque de contato | gradiente mais visível ao longo do zigue-zague |
| 10 | 504 draw calls só no módulo dos filtros | geometria agrupada por material e fase: 213 |

## Ciência (o que a imagem afirma)
- ETA ≠ ETE: sem aeração/biológico; ciclo completo com coagulação, floculação, decantação, filtração, desinfecção, pH e flúor.
- Coagulante neutraliza as cargas negativas (mistura rápida no ressalto da Parshall); floculação lenta e decrescente;
  decantação por gravidade; lodo vai para adensamento e centrífuga, nunca para o rio.
- Filtro de dupla camada: "Antracito (carvão mineral)" sobre areia e cascalho; retém a maior parte, não 100%; os
  cistos de protozoários ficam no filtro (resistem ao cloro).
- Cloro age ao longo do **tempo de contato** (inativação gradual), e o residual protege a rede.
- Água clara ≠ potável: dito na lente e confirmado só pelo laboratório; fonte da norma na tela
  (Portaria GM/MS nº 888/2021). Nenhum valor numérico inventado aparece (manômetros e painel sem números).
- Pressão vem da altura da água na torre; mais abaixo, mais pressão; perda de carga no ponto distante.
- Redes separadas e coloridas: água (azul, rasa), esgoto (ocre), drenagem (concreto).
- Ampliações marcadas "Ampliação ilustrativa"; flocos sem tamanho em mm.

## Áudio
Narração do ElevenLabs em primeiro plano; efeitos sintetizados nos mesmos tempos da tela (torneira, copo enchendo com
tom subindo, obra, bombas, ressalto, dosadoras, paletas, lodo, areia caindo, bolhas da lavagem, laboratório, torre
enchendo, turbina do hidrômetro, boia fechando). Mix −14,0 LUFS, true peak −1,5 dBTP.

## Desempenho do render (medido, `tools/bench3.cjs`, 1080×1920)
- ~5,0–5,5 s/quadro (1 processo). **2 processos não aceleram** (10,2 s cada): o SwiftShader já ocupa os 4 núcleos.
- Cada quadro desenha a maquete 3 vezes: sombra, imagem principal (MSAA 4×) e passe de normais da oclusão ambiente —
  1.000 a 3.300 draw calls e 1,1 a 3,2 milhões de triângulos. Por isso o tempo subiu desde o Ep. 01 (3,2 s/quadro com
  cenários pequenos): a maquete única e contínua, exigida pelo cliente, é 3–5× mais geometria.
- Custo medido de cada etapa (variação de ruído ±0,5 s): oclusão ambiente ≈ 1 s, sombras ≈ 1 s, MSAA ≈ 1,5–2 s.
  Nenhum foi desligado (perda de qualidade). Ganhos sem perda feitos: agrupamento de geometria (eta2 504 → 213 draw
  calls), peças internas escondidas quando longe da câmera, luzes da cozinha só de perto.
- Render com retomada automática (`out/resume.sh`): se o servidor reiniciar, os quadros feitos ficam e ele continua do
  primeiro que falta; correções pontuais com `tools/patch.cjs range a b`.

## Limitações conhecidas
- Valores normativos marcados "conferir" em `docs/CIENCIA.md` não foram lidos no PDF oficial (sites gov.br e
  sanepar.com.br bloqueados neste ambiente); por isso nenhum número de norma aparece na tela.
- A vista aérea da ETA ("transformação") mostra as plantas das unidades de cima; as fileiras aparecem na vertical da tela.
