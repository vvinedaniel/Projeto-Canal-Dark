# Ep. 02 — Por que as cidades alagam mesmo tendo bueiros? · Storyboard (para aprovação)

Narração recebida: `audio/narracao.mp3`, **114,9 s** (dentro da faixa 105–120 s; o vídeo terá ~116,5 s com a
cartela final). 1080×1920, 30 fps, estilo "Maquete Viva 3D".

Texto da narração: `docs/roteiro.txt`, alinhado aos 36 blocos de fala medidos no áudio (pausas ≥ 0,22 s).
Os tempos abaixo são os reais de cada frase.

## Ideia central: uma única maquete que evolui

Em vez de cenários separados, o episódio inteiro acontece **numa só maquete** (um bloco de terreno de ~60 × 40 m
em escala, recortado em corte nas bordas para mostrar o subsolo), com um **rio na borda mais baixa**. A câmera
passeia por ela, entra em corte e volta, mas o lugar é sempre o mesmo: o mesmo morro, a mesma curva do rio, a
mesma praça, as mesmas 3 ruas. Isso garante que a cidade fique reconhecível do começo ao fim e que nenhum cano
fique sem destino: toda tubulação desenhada termina no rio ou num reservatório visível.

- **Estado = função do tempo:** a maquete tem "camadas" (vegetação, prédios, asfalto, bocas de lobo, galerias,
  reservatório, soluções verdes) que entram e saem com `sstep(t)`; a água (chuva, lâmina na rua, nível do rio,
  enchimento das galerias e do reservatório) também é função de `t`, então qualquer quadro pode ser
  re-renderizado sozinho (`tools/patch.cjs`).
- **Água com volume contínuo:** um único "orçamento" de água por etapa decide o que infiltra (setas para baixo
  no solo em corte), o que escoa (lâmina na superfície), o que entra nas bocas de lobo e o que sai no rio. Os
  níveis sobem e descem suavemente e nunca "teleportam".
- **Duas redes com cores e formas diferentes (exigência):**
  - **Drenagem pluvial** — boca de lobo na guia → tubo de ligação → **galeria de concreto retangular/circular grande**,
    água **azul-acinzentada** com folhas, desaguando **no rio** por uma saída com comporta.
  - **Esgoto sanitário** — o mesmo PVC laranja e concreto cinza do ep01, tubos **menores**, conteúdo **marrom**,
    indo para a **estação de tratamento** (silhueta reaproveitada do ep01 ao fundo), nunca para a galeria.
  - Rótulos nomeiam as duas na primeira aparição ("Drenagem: água da chuva → rio" × "Esgoto: casas → tratamento").
- **Medidor de chuva fixo na tela** (pluviômetro 3D no canto da maquete + barra "intensidade da chuva"):
  na comparação antes × depois a barra fica **no mesmo ponto**, e a chuva usa os mesmos parâmetros (densidade,
  velocidade, duração), para provar que a intensidade é igual.

## Storyboard (tempo provisório → frase do áudio → o que aparece)

Gancho nos 3 primeiros segundos: começa **com a ação** (rua alagada, boca de lobo afogada) e com o título
"POR QUE A CIDADE ALAGA SE TEM BUEIRO?" no 1º quadro (padrão do ep01, sem fade de entrada).

| # | Tempo (s) | Narração | Etapa | Estado inicial → ação → consequência → resultado (visual) | Ciclo |
|---|---|---|---|---|---|
| 0 | 0,00–5,29 | "Se as ruas têm bueiros… por que as cidades continuam alagando?" | **Gancho** | 1º quadro já em ação: rua alagada, chuva forte, boca de lobo afogada, água subindo na roda do carro. Em "bueiros" a câmera mostra a grelha engolindo água sem dar conta; em "alagando" recua e revela a cidade inteira da maquete na chuva, rio cheio ao fundo. Título na tela. | Curiosidade |
| 1 | 5,92–9,28 | "Pra entender isso, vamos começar antes de a cidade existir." | Volta no tempo | Rebobinar: a água recua, prédios descem para dentro do chão, o asfalto se enrola, a mata volta. Mesmo morro, mesma curva do rio. | Curiosidade |
| 2 | 9,88–11,76 | "Quando chove sobre um terreno natural," | 1. Terreno natural recebendo chuva | Mata, campo e rio calmo; começa a chover (gotas + respingos nas folhas e no rio). Medidor de chuva aparece em "normal". | Curiosidade |
| 3 | 12,12–14,02 | "parte da água penetra no solo," | 2. Infiltração | Corte do solo (camadas do ep01): setas e gotas descendo entre os grãos até o lençol freático; raízes e folhas no chão seguram. Rótulo "Infiltra". | — |
| 4 | 14,27–16,85 | "enquanto outra parte escorre até os rios." | 2. Escoamento | Um filete escorre pela encosta e chega ao rio; rio sobe pouco e devagar. Rótulo "Escoa". Proporção visual: infiltra ≫ escoa. | Problema (semente) |
| 5 | 17,37–22,38 | "Mas aí começamos a construir casas, prédios, calçadas e ruas de asfalto." | 3. Construção progressiva | Chuva para. Cada palavra = um batimento: casas sobem (fundação → paredes → telhado), prédios, calçadas, asfalto desenrolando nas 3 ruas; árvores somem. A cidade da maquete fica pronta. | Problema |
| 6 | 22,96–27,37 | "O problema é que grande parte dessas superfícies não deixa a água passar." | 4. Impermeabilização | Corte de rua/calçada/telhado: gotas batem no asfalto e não entram (setas de infiltração bloqueadas, com X vermelho); o solo embaixo fica seco. | Problema |
| 7 | 27,93–33,79 | "Então, aquela água que antes penetrava no solo começa a se acumular e correr pelas ruas." | 5. Acúmulo nas ruas | Mesma chuva "normal" da etapa 1 (medidor no mesmo ponto): lâmina nas sarjetas, enxurrada ladeira abaixo, poça crescendo no ponto baixo da rua. | Consequência |
| 8 | 34,25–36,88 | "Pra resolver isso, instalamos bocas de lobo," | 6. Bocas de lobo | Close na guia: abertura lateral + grelha montadas peça a peça, caixa de captação em corte; a enxurrada começa a entrar. | Solução |
| 9 | 37,12–40,10 | "conectadas a grandes tubulações debaixo da cidade." | 7. Galerias | O asfalto levanta (desmontagem como no ep01): ligações descem da boca de lobo para a galeria de concreto, montada aduela a aduela com caimento. Ao lado, o esgoto laranja/cinza, menor e separado. Rótulos: "Drenagem (chuva)" × "Esgoto (casas)". | Solução |
| 10 | 40,65–44,83 | "Essas tubulações transportam a água da chuva até canais e rios." | 8. Conexão com canal e rio | Câmera segue a galeria: deságua num canal aberto de concreto (córrego canalizado) que chega ao rio, com saída com comporta. Setas correndo pelo caminho todo. O esgoto segue para a estação de tratamento ao fundo. | Solução |
| 11 | 45,25–48,21 | "Mas existe um problema: elas têm um limite." | 9. Chuva normal | Chuva normal: a rua fica seca, a galeria em corte trabalha até ~1/3. Em "limite" aparece a linha tracejada "capacidade" no topo da seção. | Novo problema |
| 12 | 48,73–50,73 | "Quando chove muito em pouco tempo," | 10. Chuva intensa | Medidor sobe para "intensa": mais gotas, maiores, céu escuro, trovão. | Novo problema |
| 13 | 51,04–54,13 | "pode chegar mais água do que o sistema consegue transportar." | 11. Sobrecarga | A seção da galeria enche até a linha de capacidade e passa; a água volta pela grelha (jato saindo da boca de lobo); a lâmina na rua cresce. | Consequência |
| 14 | 54,63–58,80 | "E se houver lixo bloqueando os bueiros, a situação fica ainda pior." | 12. Obstrução | Sacolas, garrafas, latas e folhas descem pela sarjeta e tampam a grelha; as setas de entrada encolhem; a poça cresce mais rápido. | Consequência |
| 15 | 59,33–65,44 | "Além disso, quando o nível do rio sobe demais, a água das galerias pode encontrar dificuldade pra sair." | 13. Rio cheio | Corte na saída: o rio sobe e passa da boca da galeria; a comporta fecha / a água da galeria não sai e recua (setas parando e voltando). | Consequência |
| 16 | 65,95–71,20 | "O resultado? Ruas alagadas, carros submersos e água entrando nas casas." | 14. Alagamento progressivo | Vista aérea, mesmo enquadramento do gancho: o ponto baixo enche primeiro e a mancha se espalha rua a rua; em "carros" a água cobre um carro; em "casas" passa da soleira de uma casa em corte. | Revelação parcial |
| 17 | 71,72–79,47 | "Mas como resolver isso? Uma das soluções é construir enormes reservatórios de contenção, conhecidos como piscinões." | 15. Piscinão | A água baixa. Sob a praça, o piscinão é escavado e montado em corte (paredes, tubo de entrada vindo da galeria, saída controlada). Rótulo "Piscinão". | Nova descoberta |
| 18 | 79,92–87,43 | "Eles armazenam temporariamente… e liberam tudo aos poucos, evitando sobrecarregar as galerias e os rios." | 15. Piscinão funcionando | Chuva: o excesso desce para o piscinão, que enche; depois da chuva ele esvazia devagar para o canal (seta fina e contínua). Galeria e rio ficam abaixo da linha de capacidade. | Solução |
| 19 | 87,91–91,67 | "Também podemos ampliar as tubulações, criar jardins de chuva," | 16. Ampliação + 17. Jardins de chuva | Galeria troca de seção (maior) e grelhas limpas; canteiros rebaixados nas calçadas, em corte, mostrando as camadas que guardam e infiltram a água. | Solução |
| 20 | 91,96–96,69 | "preservar áreas verdes e utilizar pavimentos que permitem a passagem da água." | 17. Áreas verdes + pavimento permeável | Parque linear na margem do rio (várzea que pode encher), estacionamento com pavimento permeável em corte (água atravessando blocos e brita). | Solução |
| 21 | 97,17–101,48 | "Agora, quando uma nova tempestade chega, a cidade consegue absorver," | 18. Nova simulação | **Mesma chuva intensa da etapa 10** (medidor no mesmo ponto, mesmos parâmetros). Em "absorver": água entrando nos jardins, no pavimento e no parque. | Resultado |
| 22 | 101,74–106,49 | "armazenar e distribuir melhor essa água. O risco de alagamento diminui." | 19. Antes × depois | "armazenar": piscinão enchendo; "distribuir": galeria e canal trabalhando abaixo do limite. Em "risco" a tela se divide: mesma maquete, mesmo instante, mesma chuva — à esquerda sem melhorias (rua alagada), à direita com melhorias (lâmina rasa, ainda com água empoçada nos pontos baixos). Texto "Mesma chuva". | Revelação |
| 23 | 106,93–114,91 | "Porque proteger uma cidade das enchentes não é simplesmente instalar mais bueiros. É planejar pra onde toda essa água vai." | 20. Sistema completo | Recuo final sobre a cidade: setas mostram o caminho completo chuva → telhados → jardins/pavimento → bocas de lobo → galerias → piscinão → canal → rio, e o esgoto separado indo para o tratamento. Em "pra onde toda essa água vai" a câmera termina no rio. Cartela final. | Revelação |

Mudança visual a cada 3–5 s e nova descoberta a cada 10–15 s (as etapas 6, 7, 11, 12, 15, 17 são as "descobertas").

## Validação científica (o que vai na tela e de onde vem)

- **Impermeabilização × escoamento:** EPA (EUA), *Protecting Water Quality from Urban Runoff* (EPA 841-F-03-003):
  com cobertura natural, ~10% da chuva escoa pela superfície e ~50% infiltra; com 75–100% de superfície
  impermeável, ~55% escoa e ~15% infiltra. Vou usar esses valores só como **proporção visual** (tamanho das
  setas), sem número na tela, a menos que a narração cite.
- **Microdrenagem × macrodrenagem:** bocas de lobo, sarjetas e galerias são dimensionadas para chuvas de período
  de retorno de ~2 a 10 anos (manuais de drenagem urbana, ex.: Prefeitura de São Paulo / DAEE). Chuvas maiores
  que a de projeto superam a capacidade — é o fundamento da etapa 11. Sem números na tela.
- **Sistema separador absoluto:** no Brasil a drenagem pluvial e o esgoto sanitário são redes separadas por
  norma (NBR 9649 para esgoto; drenagem como componente do saneamento na Lei 11.445/2007). Ligações cruzadas
  existem na prática, mas não serão mostradas como correto.
- **Reservatórios de detenção ("piscinões")**, jardins de chuva, pavimentos permeáveis e parques lineares
  reduzem e atrasam o pico de vazão; **não eliminam o risco** (o vídeo mostrará água residual no "depois").
- **Remanso do rio:** quando o nível do rio passa a saída da galeria, a água da galeria não escoa (e comportas
  de retenção fecham para impedir que o rio entre na cidade) — fundamento da etapa 13.
- **Conferência da narração (feita):** todas as frases estão corretas e nenhuma traz número. Pontos de atenção
  resolvidos no visual: (a) "parte penetra, outra escorre" — a outra parte relevante, a evaporação, não é
  citada, então o vídeo não mostra proporções numéricas; (b) "liberam tudo aos poucos" — o piscinão esvazia
  devagar depois da chuva (por gravidade ou bomba), mostrado assim; (c) "o risco diminui" — o "depois" mantém
  água empoçada nos pontos baixos, sem sugerir risco zero; (d) "canais e rios" — a galeria deságua num canal
  aberto que chega ao rio, e o vídeo mostra os dois.

## Modelos reaproveitados do Ep. 01

| Do Ep. 01 | Uso no Ep. 02 |
|---|---|
| Motor (`main.js`): GTAO, ACES, MSAA, legendas palavra a palavra, rótulos, dissolve em zoom, lente, capas, `?plate` | igual, sem mudanças estruturais |
| `lib.js`: `soilWall` (solo em camadas), `cutPipe`, `Flow`, `Chevrons`, `arrow`, `scatter`, `studio`, `camRail`, `water` com ondulação/cáusticas | solo em corte, galerias e tubos em corte, partículas de água, setas de infiltração/escoamento, câmera |
| `rede/bairro.js`: casas, telhados, ruas, calçadas, postes, carros, árvores | a cidade que "cresce" na maquete |
| `rede/kit.js`: tubos de concreto, poços de visita | galerias, poços de visita da drenagem; esgoto separado |
| `rio/terrain.js`, `rio/nature.js`: terreno, mata, margem, rio com água animada | terreno natural (etapas 1–2) e o rio de todas as etapas |
| `rio/town.js`, `rio/props.js` | casas e quadras extras, ETE ao fundo (destino do esgoto) |
| `eteA`: silhueta da estação de tratamento | destino do esgoto, ao fundo, na visão geral |
| Ferramentas: `align.py`, `sfx.py`/`mix.sh`, `render.cjs`, `patch.cjs`, `bench.cjs`, `plate.cjs`/`capa.cjs`, `sheet.sh`, `encode.sh` | todas |

## Modelos novos

| Novo | Detalhe |
|---|---|
| **Chuva** | gotas instanciadas (estrias com motion blur falso), respingos e anéis no chão e na água, intensidade parametrizada e idêntica nas comparações; céu/névoa escurecendo com a intensidade |
| **Água superficial com nível** | lâmina na rua/sarjeta que sobe e se espalha por máscara de altura do terreno (ponto baixo enche primeiro), poças, cascata entrando na grelha, água saindo da grelha no refluxo |
| **Boca de lobo** | guia com abertura lateral + grelha metálica, caixa de captação em corte, tubo de ligação |
| **Galeria pluvial** | aduelas de concreto retangulares (e tubos de grande diâmetro), poço de visita, enchimento por seção (vazia → 1/3 → cheia → pressurizada) |
| **Saída no rio** | cabeceira de concreto, comporta/válvula de retenção (flap) que abre e fecha, enrocamento |
| **Resíduos** | sacolas, garrafas PET, latas e folhas arrastados pela sarjeta (física simples por trilho), acúmulo na grelha |
| **Construção da cidade** | animação de crescimento (fundação → paredes → telhado), asfalto "desenrolando", árvores sendo removidas |
| **Reservatório de contenção** | piscinão subterrâneo em corte com tubo de entrada, tubo de saída controlada e nível animado |
| **Soluções verdes** | jardim de chuva (canteiro rebaixado com camadas), pavimento permeável em corte (blocos vazados/brita), parque linear de várzea |
| **Pluviômetro + barra de intensidade** | objeto 3D na maquete + indicador fixo na tela, mesma posição no antes × depois |
| **Tela dividida antes × depois** | duas câmeras sobre a mesma maquete em estados diferentes, no mesmo `t` de chuva |

## Produção (depois da aprovação)

1. Texto da narração → `timeline.js` (PH por frase) + `align.py` (legendas).
2. Maquete base + chuva + água superficial (o coração do episódio), validados com stills.
3. Camadas da cidade, drenagem, esgoto, soluções; storyboard frase a frase.
4. Prévias em ¼ de resolução, folhas de contato, revisão; efeitos sonoros (chuva, trovão, enxurrada, obra) e mixagem.
5. Render final 1080×1920 (≈ 1h50 aqui, sem GPU) e correções por trecho com `tools/patch.cjs`.
