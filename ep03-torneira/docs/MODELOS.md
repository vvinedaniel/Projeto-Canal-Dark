# Ep. 03 — modelos novos reutilizáveis

Todos em `src/sets/mundo/<módulo>/`. Determinísticos (sem `Math.random`), animados por progresso 0..1 (`S.build.*`,
obra) e/ou por `t` (movimento contínuo), e funcionam "de trás para frente" (rebobinar). Para reaproveitar, copie o
arquivo e troque as cotas do `layout.js`. Contrato dos módulos em `docs/MODULOS.md`.

## Captação (`captacao/`)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Ensecadeira de estacas-prancha | `intake.js` | estacas cravadas uma a uma, esgotamento (máscara de profundidade esconde a água dentro), retirada no fim |
| Torre de tomada d'água | `intake.js` | grade de barras montada barra a barra, comporta em guias, pórtico com atuador, passarela; galhos e folhas presos na grade |
| Poço de sucção em corte | `house.js` | laje, paredes, escada, marcas de nível, redemoinho na sucção |
| Casa de bombas | `house.js` | pilares, paredes, telhado, porta de carga, painel, luminárias, monovia com talha (carrinho, corrente, gancho, lingas) |
| Conjunto motobomba centrífugo | `pumps.js` | voluta espiral, rotor com pás curvadas para trás (gira), motor aletado, acoplamento com proteção, mancal, válvula de retenção com contrapeso, registro com volante, manômetro, crivo; carcaça em corte com partículas entrando pelo olho |
| Barrilete | `pumps.js` | une as duas bombas e sai pela parede |
| Adutora de água bruta | `rawmain.js` | tubos descidos um a um, berços, blocos de ancoragem nas curvas, ventosa, janela de corte com a água avançando |

## ETA — chegada à decantação (`eta1/`)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Caixa de chegada + calha Parshall | `arrival.js` | convergente, garganta, divergente sobre pilares; perfil da lâmina dinâmico com **ressalto hidráulico** e espuma; régua, sensor |
| Casa de química | `chem.js` | tanques de PAC, hipoclorito, cal (com agitador) e ácido fluossilícico; bombas dosadoras de diafragma (cabeçote pulsando), painéis, dique; linhas de dosagem coloridas até os 4 pontos com bico gotejando |
| Floculador de 3 câmaras | `floc.js` | cortinas com passagem por baixo/por cima, agitadores de paletas de eixo vertical com motor e redutor, velocidade decrescente; flocos crescendo de câmara em câmara |
| Decantador retangular | `dec.js` | cortina perfurada, calhas com vertedores triangulares, **ponte raspadora** (rodas, raspador que se ergue no retorno), poço de lodo em V, manta de lodo, canal de água decantada |
| Tratamento do lodo | `dec.js` | linha de descarga em meio tubo, adensador em corte com mecanismo de grade, bomba, centrífuga e caçamba |

## ETA — filtração ao reservatório (`eta2/`)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Filtro rápido de dupla camada | `filters.js` | caixas, fundo falso com ~600 crepinas, **big bags despejando** cascalho → areia → antracito, calhas de lavagem, galeria de tubos e válvulas; partículas retidas; **lavagem em contracorrente** (leito expande, água suja sai pelas calhas) |
| Tanque de contato | `contact.js` | chicanas montadas uma a uma, caminho em zigue-zague com gradiente de cor (= tempo de contato), nuvem de cloro, misturador de cal e flúor na saída |
| Reservatório apoiado em corte | `reservoir.js` | piso, parede curva, pilares, cobertura, aterro, escada interna, respiros |
| Elevatória de água tratada | `reservoir.js` | bombas de sucção frontal com motor aletado e acoplamento girando, válvulas, manômetros, monovia, painel |
| Laboratório | `lab.js` | bancadas, turbidímetro, colorímetro de cloro, pHmetro, tubo com reagente DPD (rosa), placas de cultura, estufa, torneira de amostra, painel com 5 verificações (sem números) |
| Utilitários de lote | `kit.js` | `QuadBatch` (planos animados num só mesh), `MultiChev` (setas de vários caminhos numa InstancedMesh) — reduziram 504 → 213 draw calls |

## Cidade e redes (`cidade/`)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Reservatório elevado (torre) | `tower.js` | sapatas, pernas e contraventamento por painel, viga-anel, taça em corte, tubo de entrada pelo eixo, escada marinheiro com gaiola, para-raios, balizamento, régua de nível |
| Adutora de água tratada | `adutora.js` | ferro dúctil azul com flanges, berços e ancoragens, frente d'água luminosa |
| Linha piezométrica + manômetros | `piezo.js` | linha tracejada no nível da torre, 4 manômetros com ponteiro (mais pressão embaixo, perda de carga no ponto distante) |
| Três redes em corte | `face.js`, `net.js` | água azul (rasa), esgoto PVC ocre com PVs em corte e meia-cana, galeria de drenagem com PVs e bocas de lobo; ramais acendendo nas edificações |
| Escola e hospital | `buildings.js` | escola com quadra e placa; hospital com cruz, marquise, heliponto e ambulância |

## Casa (`casa/`)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Hidrômetro unijato em corte | `meter.js` | corpo de latão, filtro de entrada, bocal, **turbina**, acoplamento magnético, trem de engrenagens, relojoaria com rolos em m³ e ponteiros, lacres; cavalete com registro e caixa de proteção |
| Caixa-d'água 1000 L com boia | `tank.js` | tampa, **torneira de boia** em corte (sede, pistão, vedação, alavanca, boia), ladrão, saída com registro; nível e boia fecham a entrada |
| Torneira de pressão em corte | `faucet.js` | volante, haste roscada, castelo, **vedante** saindo da sede, canal da bica, arejador; metade da frente desliza para abrir o corte |
| Copo enchendo | `faucet.js` | copo facetado, jato, menisco, bolhas, respingos |
| Mão articulada (Ep. 01) | `hand.js` | pega o volante por cima, gira e solta |
| Casa em corte | `house.js` | cozinha, banheiro, muro com nicho do hidrômetro, telhado com canto recortado sobre a caixa |

## Terreno e manancial (`terreno/`)
Relevo com represa, rios com cascatas, barragem de terra com **vertedouro em degraus** e bacia de dissipação, enrocamento,
**muro de arrimo de gabiões**, face de corte em latossolo (horizontes) com furos para as redes, vegetação instanciada por região.

## Lente de ampliação ilustrativa (`micro/` + motor)
Cena própria desenhada por um segundo renderizador num círculo com haste até o ponto ampliado (`ui.micro`).
Modos: água bruta, coagulação (cargas), floculação, sedimentação, água clara com microrganismos, filtro (antracito/areia
retendo cistos), cloro com inativação gradual e relógio de tempo de contato.
