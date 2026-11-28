# SegueCity — Upgrade gráfico premium V2: relatório

A cidade não foi refeita. O mapa, as ruas, o rio, a ilha, os prédios e as posições são os mesmos da V1.
O V2 é um upgrade em cima do mesmo motor (`src/engine/`) e da mesma estrutura de episódio.

## Versão anterior preservada

- Tag git **`seguecity-v1`** (commit `34f5306`): o código exato da V1. Para voltar:
  `git checkout seguecity-v1 -- seguecity`.
- Vídeos da V1 guardados em `out/v1/` (demo e Ep. 01).
- Imagens "antes" com as mesmas câmeras do "depois" em `out/comparativo/antes/`.

## Entregas desta etapa

| Item pedido | Arquivo |
|---|---|
| Ilha completa em alta resolução (4K vertical 2160×3840) | `out/entrega-v2/01-ilha-noite-4k.png`, `02-ilha-amanhecer-4k.png` |
| Praça central (close) | `out/entrega-v2/03-praca-central.png` |
| Bairro residencial (close) | `out/entrega-v2/04-bairro-residencial.png` |
| Região comercial (close) | `out/entrega-v2/05-regiao-comercial.png` |
| Personagem de exemplo (close) | `out/entrega-v2/06-personagem-exemplo.png` |
| Kit de interiores (casa, hospital, oficina, escola, mercado, prefeitura) | `out/entrega-v2/07-interiores.png` |
| Estados de luz e clima (noite, amanhecer, chuva, neblina) | `out/entrega-v2/08-estados.png` |
| Demonstração cinematográfica de 15 s | `out/seguecity-demo-cidade.mp4` |
| Comparativo antes × depois (5 pares) | `out/comparativo/comparativo-*.png` |

Tudo é regenerado com `npm run entrega:imagens` (~3 min) e `npm run render:demo` (~1 min).
O Ep. 01 completo de 75 s **não** foi renderizado de novo: aguarda a sua aprovação do visual.

### Honestidade das imagens

- A ilha em 4K mostra o estado real do Dia 01: cidade pronta, **0 moradores**, ruas sem carros, casas
  apagadas. Prédios públicos, lojas e postes ficam acesos.
- Os closes com pessoas e carros são **demonstração** e levam a etiqueta
  "DEMONSTRAÇÃO · MORADORES DE EXEMPLO".
- A personagem Ana é fictícia. A ficha diz "EXEMPLO" e "PERSONAGEM FICTÍCIO DE DEMONSTRAÇÃO".
- Na demo de 15 s o trânsito e os pedestres só aparecem no trecho marcado como demonstração (4,95 s a
  11,7 s). Antes e depois desse trecho a cidade está vazia, como no roteiro.

## O que mudou

### 1. Arquitetura
- Texturas de fachada por prédio: reboco, tijolo, pastilha, painel, ripado e pedra. Cunhais (blocos nas
  quinas), cornijas, escorridos de chuva sob as janelas e sujeira perto do chão.
- Janelas variadas: cortina, persiana, planta, meia-luz e TV acesa (azul). Nem todas acendem juntas.
- Lajes com cascalho, manta ou placas, ralo, manchas de umidade e sombra junto à mureta. No telhado:
  caixas-d'água, antenas, parabólicas, placas solares e jardins.
- Ar-condicionado nas fachadas, marquises com número do prédio, floreiras e número em todas as casas.
- Lojas geminadas com vitrines e toldos listrados. A farmácia tem cruz verde.

### 2. Infraestrutura urbana
- **Semáforos com ciclo real** (verde, amarelo, vermelho por eixo, 9 s) em 6 cruzamentos.
- Faixas de pedestre, placas de PARE, hidrantes, bueiros, lixeiras, bancos, bancas, pontos de ônibus com
  abrigo, postes de luz de sódio com poça de luz no chão, canteiros e árvores de vários tipos.

### 3. Veículos e trânsito (`engine/traffic.ts`, novo)
- Circuitos de mão dupla (mão direita) com curvas suaves nas esquinas. Os carros **param no vermelho e
  formam fila**, mantêm distância do carro da frente e aceleram e freiam de forma gradual.
- Ônibus com duas paradas (espera 2,2 s em cada).
- Frota: carros populares, motos, táxi, caminhão, ambulância, viatura, bombeiros e manutenção. Todos com
  faróis, lanternas e sombra.
- Determinístico: a simulação parte sempre de t = 0 e fica em cache por quadro, então o mesmo quadro sai
  igual em qualquer ordem de render.
- Com a cidade sem moradores, o trânsito fica **desligado**. Ele só aparece em trechos marcados como
  demonstração.

### 4. Ilha flutuante
- Geologia em camadas (areia, basalto, matacões), cipós e **cristais que pulsam** no lado de baixo.
- Cachoeira com borrifo e névoa na base. Mar de nuvens em duas profundidades, ilhotas distantes com
  paralaxe, estrelas e lua com halo e reflexo no rio.

### 5. Iluminação
- Luz ambiente quente e fria e postes de sódio com poça de luz. Reflexos animados na água (lua, bancos de
  luz), brilho das vitrines, faróis e lanternas e oclusão ambiente no chão em volta dos prédios.
- Estados reutilizáveis por parâmetro: noite, **amanhecer** (céu, sol, ambiente), **chuva** (gotas,
  ambiente mais escuro) e **neblina** (`weather: { rain, fog }`, `dawn`).
- O pixel continua nítido: bloom baixo, sem ruído e sem desfoque fora do tilt-shift dos planos gerais.

### 6. Praça central
- Chafariz com jatos animados, **Monumento da Fundação** (placa "DIA 01" e estrela dourada), **bandeira
  oficial** no mastro, coreto para eventos dos moradores, **relógio público**, canteiros floridos, bancos,
  varal de luzes e lixeiras.

### 7. Moradores (`engine/characters.ts`, `sprites/people.ts`, `sprites/portrait.ts`)
- Aparência modular e **persistente**: pele, cabelo (8 estilos), corpo, barba, óculos, roupa e uniforme
  da profissão. A aparência fica gravada em `data/residents.json`, então o mesmo morador tem o mesmo
  visual em todos os episódios.
- Poses: andar, parado, acenar e trabalhar. Uniformes: jaleco, macacão, quepe, capacete, avental, touca,
  chapéu de chef, boné.
- Retrato em pixel art para closes e a ficha de morador (`hud/CharacterCard.tsx`).

### 8. Três níveis de zoom
- Ilha (zoom ~1–1,6), bairros (~2,5–4) e close (~6–7), com tilt-shift automático nos planos gerais.
  A demo passa pelos três.

### 9. Interiores (`engine/interiors.ts`, novo)
- Seis salas em corte, reutilizáveis: casa, hospital, oficina, escola, mercado e prefeitura.
  `interiorSprite('hospital')` devolve o sprite e as luzes. A prévia está na composição `Interiores`.

### 10. Ortografia dos letreiros (revisada nesta etapa)
- **DELEGACIA** aparecia como "DELEGACII": um mastro de antena ficava na frente da coluna do meio do
  último "A". O mastro foi para a face lateral.
- **PREFEITURA** (no pórtico) saía embaralhada: a faixa tinha 5 px de altura e cortava as letras. Agora
  tem 8 px. O erro já existia na V1.
- **V** tinha 3 px e parecia "U" ("EM BREUE", "SORUETES"). Agora tem 5 px, como M e W.
- **ÔNIBUS** e **TERMINAL** se juntavam na quina ("ÔNIBUSTERMINAL"). A face estreita ganhou um ícone de
  ônibus e TERMINAL ficou sozinho.
- Árvores e postes não ficam mais na frente de fachadas com letreiro (FARMÁCIA, DELEGACIA, OFICINA e
  outras).
- Nova composição **`Placas`**: um prédio com letreiro por quadro, de dia e de perto, para revisar a
  ortografia em segundos (`npm run check:signs:img` → `out/stills/placas/`).
  `npm run check:signs` continua conferindo se tudo cabe.

## Desempenho

Medido neste container (4 vCPU, sem GPU), com o mesmo método e a V1 numa cópia separada (tag `seguecity-v1`) (`scripts/bench.ts`: 150 quadros
1080×1920, concorrência 4, sem codificar vídeo):

| Trecho | V1 | V2 | Diferença |
|---|---|---|---|
| Ep. 01, quadros 300–449 (mesma cena nas duas versões) | 18,2 quadros/s | 17,4 quadros/s | −4% |
| Demo, quadros 0–149 (o gancho mudou, então não é a mesma cena) | 14,8 quadros/s | 16,4 quadros/s | — |

- Todo o detalhe novo custou **~4%** de velocidade. Um episódio de 75 s (2250 quadros) continua em
  ~2 min de render + ~1 min de codificação e áudio.
- O vídeo final da demo (15 s, 450 quadros) sai em **~70 s** no total: render, codificação, áudio e
  validação.
- O que mantém o custo baixo: sprites de prédios e o chão são desenhados uma vez e reaproveitados. Pessoas
  e veículos usam cache por pose e quadro, e o trânsito tem cache por quadro. O desfoque do tilt-shift
  roda em meia resolução. Só há desenho por pixel a cada quadro onde é preciso (água, luzes).
- Determinismo mantido: todo quadro é função pura de `t`, inclusive o trânsito. Funciona com qualquer
  concorrência e com render fora de ordem.
- Sem dependências novas e sem APIs pagas. As folhas de comparativo e de estados usam o Chromium/Playwright
  que já vem instalado no container (`scripts/comparativo.cjs`, `scripts/estados.cjs`).

## Pendências e próximos passos

1. **Logo oficial**: não veio arquivo de logo, só a narração. O vídeo usa o logo desenhado em pixel art.
   Para trocar, salve o logo em `public/brand/logo.png` (PNG transparente). A HUD e o final usam esse
   arquivo sozinhos, sem mexer no código (ver `public/brand/LEIA-ME.md`).
2. **Ep. 01 com a narração nova** (`Cidade.mp3`, 16 frases): os tempos de cada frase já foram medidos
   (`src/scenes/ep01/narration-v2.json`). Depois da sua aprovação deste visual, o Ep. 01 será refeito
   com o gancho "MORADORES 0" desde o 1º quadro, o final ao amanhecer, exatamente 75 s (2250 quadros),
   validado com ffprobe e entregue em MP4 + ZIP.
3. Na quina do terminal, um poste ainda cobre parte do "T" de TERMINAL num ângulo específico. Nos
   enquadramentos usados não atrapalha a leitura.
