# Ep. 02 — Por que as cidades alagam mesmo tendo bueiros? · Storyboard (para aprovação)

Narração recebida: `audio/narracao.mp3`, **114,9 s** (dentro da faixa 105–120 s; o vídeo terá ~116,5 s com a
cartela final). 1080×1920, 30 fps, estilo "Maquete Viva 3D".

> **Pendente:** o texto da narração. Não consigo transcrever o áudio aqui (os servidores de modelos de fala estão
> bloqueados neste ambiente e a transcrição do ElevenLabs gastaria créditos). Os tempos abaixo são os **blocos
> de fala medidos no áudio** (38 frases, pausas ≥ 0,22 s); a distribuição das 20 etapas por esses blocos é
> provisória e será ajustada frase a frase assim que eu tiver o texto. O conteúdo visual de cada etapa não muda.

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

Gancho nos 3 primeiros segundos: começa **com a ação** — rua alagada com a água subindo até a porta de um carro e
uma boca de lobo "afogada", câmera recuando para revelar a cidade inteira na chuva. Título "POR QUE A CIDADE
ALAGA SE TEM BUEIRO?" no 1º quadro (padrão do ep01, sem fade de entrada).

| # | Tempo (prov.) | Etapa | Estado inicial → ação → consequência → resultado (visual) | Ciclo narrativo |
|---|---|---|---|---|
| 0 | 0,0–5,3 | **Gancho** | Rua alagada à noite, chuva forte, boca de lobo engolindo água sem dar conta, nível subindo na roda do carro → câmera recua: a cidade inteira na maquete, rio cheio ao fundo. Volta no tempo (rebobinar rápido: prédios descem para dentro do chão). | Curiosidade |
| 1 | 5,3–9,3 | Terreno natural recebendo chuva | Terreno verde com mata, morro e rio calmo, solo em corte (camadas do ep01) → começa a chover (gotas instanciadas + respingos) → folhas e solo recebem a água → poças não se formam. | Curiosidade |
| 2 | 9,3–16,9 | Infiltração e escoamento | Corte do solo: setas azuis descendo pelas camadas até o lençol freático; só um filete escorre pela encosta até o rio; raízes e serrapilheira seguram. Rótulos "Infiltra" × "Escoa". Nível do rio sobe pouco e devagar. | Curiosidade → Problema |
| 3 | 16,9–22,4 | Construção progressiva da cidade | Chuva para. Montagem acelerada: ruas se desenham, lotes, casas sobem por camadas (fundação → paredes → telhado), árvores somem uma a uma. Mesmo morro, mesmo rio. | Problema |
| 4 | 22,4–27,4 | Impermeabilização | Corte: asfalto, calçada e telhados cobrem o solo; as setas de infiltração ficam bloqueadas (setas batendo e desviando). Contador visual "solo coberto" crescendo. | Problema |
| 5 | 27,4–33,8 | Acúmulo de água nas ruas | Mesma chuva da etapa 1 → a água não entra no chão: lâmina sobe nas sarjetas, corre ladeira abaixo e empoça no ponto baixo da rua. | Consequência |
| 6 | 33,8–37,1 | Instalação das bocas de lobo | Close na guia: grelha + abertura lateral montadas peça a peça; caixa de captação em corte. | Solução |
| 7 | 37,1–44,8 | Galerias subterrâneas | O asfalto "levanta" (desmontagem como no ep01): tubos de ligação descem das bocas de lobo para a galeria; galeria de concreto montada segmento a segmento, com caimento. Ao lado, o esgoto laranja menor, separado, rotulado. | Solução |
| 8 | 44,8–48,7 | Conexão com o rio | Câmera segue a galeria até a margem: saída com comporta (válvula de retenção) e enrocamento; a galeria agora tem destino. | Solução |
| 9 | 48,7–54,1 | Chuva normal | Barra de chuva em "normal". A água da rua entra nas bocas de lobo, enche a galeria até ~1/3, sai no rio. Rua seca, rio sobe um pouco. | Resultado |
| 10 | 54,1–58,8 | Chuva intensa | Barra sobe para "intensa" (mais gotas, gotas maiores, céu mais escuro). Lâmina cresce mais rápido que as bocas de lobo engolem. | Novo problema |
| 11 | 58,8–62,0 | Sobrecarga da drenagem | Galeria em corte enche até o topo (seção cheia, água pressurizada), água volta pelas bocas de lobo (jato saindo da grelha). Rótulo "Capacidade máxima". | Novo problema |
| 12 | 62,0–66,6 | Obstrução por resíduos | Close: sacolas, garrafas e folhas arrastadas pela sarjeta tampam a grelha; a entrada de água cai (setas encolhem). | Consequência |
| 13 | 66,6–73,1 | Rio sobe e não recebe | Corte na saída: nível do rio passa da boca da galeria, a comporta fecha / a água não tem para onde ir; refluxo na galeria. | Consequência |
| 14 | 73,1–79,5 | Alagamento progressivo | Vista aérea da maquete: o ponto baixo alaga primeiro, a mancha d'água se espalha rua a rua, sobe nas calçadas, carros parados. Mesmo enquadramento do gancho, agora explicado. | Revelação parcial |
| 15 | 79,5–84,3 | Reservatórios de contenção | Na praça baixa, um reservatório subterrâneo ("piscinão") é escavado e montado em corte; recebe o excesso da galeria e solta devagar para o rio depois da chuva. | Nova descoberta |
| 16 | 84,3–87,9 | Ampliação da drenagem | Galeria troca de seção (maior), bocas de lobo extras e limpeza das grelhas (resíduos somem). | Solução |
| 17 | 87,9–93,6 | Jardins de chuva, pavimento permeável e áreas verdes | Canteiros rebaixados nas calçadas, estacionamento com pavimento permeável (corte mostrando a água atravessando as camadas de brita), parque linear na margem do rio com várzea que pode encher. | Solução |
| 18 | 93,6–99,6 | Nova simulação de chuva | Mesma chuva intensa da etapa 10 (barra no mesmo ponto). Parte infiltra nos jardins e no pavimento, o piscinão enche, a galeria trabalha cheia mas sem refluxo. | Resultado |
| 19 | 99,6–106,9 | Antes × depois | Tela dividida com a **mesma maquete, mesmo instante, mesma chuva**: à esquerda a cidade sem melhorias (rua alagada), à direita com melhorias (lâmina rasa, ainda com água empoçada em pontos baixos). Texto "Mesma chuva". Nada fica totalmente seco. | Revelação |
| 20 | 106,9–114,9 | Sistema completo | Recuo final: chuva → telhados → jardins/pavimento → bocas de lobo → galerias → piscinão → rio, com setas animadas por todo o caminho, e o esgoto seguindo separado para o tratamento. Fecho: "Menos alagamento, não alagamento zero" (só se a narração disser algo equivalente). Cartela final. | Revelação |

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
- Antes da produção eu confiro cada afirmação da narração contra essas fontes (e outras primárias se ela trouxer
  números) e aponto qualquer frase que precise de ajuste.

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
