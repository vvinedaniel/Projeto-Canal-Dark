# Brief comum dos agentes de modelagem — Ep. 03 "Como a água chega até sua torneira?"

Você é um dos 7 agentes que constroem, em paralelo, os módulos de uma maquete 3D (three.js) para um vídeo vertical
1080×1920 de TikTok (canal educativo "Mundo por Dentro"). O cliente aprovou o storyboard e exige qualidade visual
**superior** aos episódios 01 e 02 (ver `../ep02-alagamento/docs/MODELOS.md` para o nível alcançado).

1. Leia, nesta ordem: `/home/user/projeto-canal-dark/CLAUDE.md`, `docs/STORYBOARD.md`, `docs/CIENCIA.md`,
   `docs/MODULOS.md` (contrato, direção de arte, desempenho, como testar), `src/sets/mundo/layout.js`,
   `src/sets/mundo/state.js`, `src/sets/mundo/direction.js`, `src/lib.js`. Diretório de trabalho:
   `/home/user/projeto-canal-dark/ep03-torneira`.
2. Edite **só os arquivos do seu módulo** (`src/sets/mundo/<id>.js` e `src/sets/mundo/<id>/*`). Não edite layout.js,
   state.js, direction.js, mundo.js, main.js, lib.js nem módulos dos outros. Se precisar de algo deles (uma cota, um
   campo novo no estado, um ajuste de câmera), **escreva no relatório final** (o integrador repassa) — ou, se for
   bloqueante, implemente uma solução local e documente.
3. Antes de modelar, faça um storyboard do seu módulo: para cada etapa do STORYBOARD que te envolve, "tempo → o que o
   seu módulo mostra" (lendo `S.build`, `S.water`, `S.run`, `S.ghost`, `S.xray`, `S.micro`).
4. Modele com riqueza de detalhes reais (peças, conexões, materiais), mecanismos completos e animados, água com volume.
   Ciência: siga `docs/CIENCIA.md` (o que pode e o que NÃO pode ser mostrado). Nenhum número inventado na tela.
5. Teste renderizando MUITO (ver "Como testar" em MODULOS.md) e **olhe as imagens**. Use `--mods` com só o terreno e o
   seu módulo para ficar rápido (escala 0.3). Para movimentos e líquidos, gere também um trecho animado curto
   (quadros seguidos → mp4) e confira quadros desse trecho. A câmera do trilho (direction.js) ainda é provisória:
   para inspecionar, use `tools/plate.cjs --cam`. Ponha suas saídas em `out/<id>/`.
6. A máquina é compartilhada por 7 agentes (CPU, sem GPU): renderize em escala 0.25–0.4, poucos quadros por vez, e não
   rode render de filme inteiro. Nunca use `pgrep -f` num script que contém o próprio padrão.
7. Não use serviços pagos nem baixe modelos/texturas da internet: tudo é modelado em código (procedural).
8. Relatório final (sua resposta), curto e objetivo:
   - "tempo → tela" do seu módulo (o que aparece em cada etapa);
   - lista de peças/modelos novos e reutilizados (para a documentação de modelos);
   - triângulos e draw calls aproximados do módulo (use `renderer.info` via plate, ou estime);
   - pedidos ao integrador (câmera, rótulos, cotas, campos de estado) e problemas conhecidos;
   - caminhos dos quadros de teste mais representativos (3–6 imagens).
