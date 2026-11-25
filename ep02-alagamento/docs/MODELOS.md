# Ep. 02 — modelos novos reutilizáveis

Todos em `src/sets/cidade/<módulo>/`. São determinísticos (sem `Math.random`), animados por um progresso 0..1
(obra) e/ou por `t` (movimento contínuo), e funcionam "de trás para frente" (rebobinar). Para reaproveitar num
episódio novo, copie o arquivo e troque as cotas do `layout.js`. O contrato dos módulos está em `docs/MODULOS.md`.

## Máquinas de obra (completas e articuladas)
| Modelo | Arquivo | Peças e animação |
|---|---|---|
| Escavadeira hidráulica | `reservoir/machines.js` | esteiras com sapatas que andam, giro da superestrutura, cabine envidraçada, lança/braço/caçamba (5 dentes) com 4 cilindros que acompanham; ciclo cava → ergue → gira → despeja |
| Caminhão basculante | `reservoir/machines.js` | cabine, chassi, 3 eixos, caçamba basculante com carga de terra; chega, é carregado, sai pela rua |
| Caminhão munck | `drainage/crane.js` | cabine, 3 eixos, patolas, torre, lança articulada com cilindros, moitão e lingas; assenta peças pré-moldadas |
| Grua (guindaste de torre) | `city/machines.js` | mastro treliçado revelado por seções, lança, contralança com contrapesos, cabine, ápice com tirantes, carrinho, cabo, gancho e carga; ciclos de içamento |
| Vibroacabadora de asfalto | `city/machines.js` | esteiras, silo com massa, mesa na largura da rua, fumaça de calor; o asfalto "desenrola" atrás |
| Rolo compactador tandem | `city/machines.js` | dois cilindros, cabine; segue a vibroacabadora sobre o asfalto fresco |
| Mini-carregadeira e mini rolo | `green/machines.js` | espalham e compactam brita no pavimento permeável |
| Bomba centrífuga | `reservoir/pump.js` | voluta, motor aletado, flanges, alça de içamento, válvula de retenção e registro com volante |

## Construções progressivas
| Modelo | Arquivo | Sequência |
|---|---|---|
| Casa térrea/sobrado | `city/houses.js` | gabarito → radier → alvenaria por fiadas (instanciada) → laje → reboco e pintura → esquadrias → telhas fileira a fileira → calhas e condutores; corte opcional da fachada com interior mobiliado |
| Prédio | `city/towers.js` | tapume → fundação → pilares e lajes andar por andar (núcleo um andar à frente) → fachada → cobertura |
| Rua completa | `city/streets.js` | leito → brita → asfalto → pintura; guias com sarjeta, calçadas com juntas, rampas, faixas; vãos para bocas de lobo |
| Boca de lobo | `drainage/inlets.js` | caixa de concreto em corte, garganta na guia, grelha de ferro fundido, ligação até a galeria; água em cortina, esguicho/fervura sob pressão |
| Galeria retangular | `drainage/gallery.js` | aduelas com juntas e mísulas assentadas uma a uma; ampliação (teto sobe, fundo fica); água com nível, setas, linha de capacidade, vertedor lateral |
| Canal + bueiro + saída | `drainage/canal.js` | canal aberto, bueiro sob a avenida, cabeceira com enrocamento e comporta basculante (abre com a vazão, fecha com o rio alto) |
| Rede de esgoto separada | `drainage/sewer.js` | coletor PVC em corte, ramais das casas, poço úmido da elevatória, recalque até a ETE, efluente tratado ao rio |
| Piscinão aberto | `reservoir.js` + `reservoir/pit.js`, `trench.js` | cava em camadas → laje com malha → paredes com formas e escoras → escada, casa de bombas, régua de nível → valas de ligação → acabamento; enche por vertedor/cascata, esvazia por bomba |
| Jardim de chuva | `green/gardens.js` | corte da calçada → paredes → geotêxtil, brita com dreno, areia, solo, casca → plantas; água infiltrando no corte |
| Pavimento permeável | `green/permeable.js` | faixa a faixa: subleito → brita → blocos vazados com grama; em corte com camadas |
| Parque linear/várzea | `green/park.js` | plataforma, bacias rebaixadas que enchem, caminho, bancos, mudas crescendo |
| ETE compacta e elevatória | `city/ete.js` | gradeamento, tanque de aeração com bolhas, decantadores com ponte giratória, prédio, cerca |

## Terreno, água e chuva
| Modelo | Arquivo | O que faz |
|---|---|---|
| Relevo natural → urbano | `terrain/ground.js` | heightfield com córrego que é aterrado/canalizado; cores natural → terra → urbano; raio-x |
| Face de corte com furos e tampões | `terrain/soil.js`, `terrain/holes.js` | máscara 8192×2048 (furos sobrepostos se unem); tampões "escavam" por geometria (varredura em x, de cima, de baixo) |
| Mata e vegetação | `terrain/flora.js` | 244 árvores, arbustos, capim; derrubada em sequência (tomba, encolhe, afunda) |
| Rio com nível | `terrain/river.js` | água com face nos cortes, espuma, detritos; enche a vala da saída na cheia |
| Setas de infiltração/bloqueio | `terrain/arrows.js` | caminhos até o lençol freático; bloqueio com X vermelho sob asfalto e telhados |
| Chuva | `water/rain.js` | estrias em 3 camadas calculadas no shader (função de t), respingos, anéis, véu; intensidade única → mesmo visual |
| Alagamento | `water/flood.js` | lâmina horizontal no nível do estado, com face no corte, espuma de borda, ondas nos carros, detritos |
| Enxurrada e poças | `water/street.js` | sarjetas que engrossam ladeira abaixo, redemoinho nas grelhas, condutores dos telhados, poças |
| Mapa de alturas | `water/hmap.js` | alturas do chão, guias e telhados usadas em JS e nos shaders da água |

## Motor (`src/main.js`) — recursos novos
- `ui.split(k, 'Antes', 'Depois', nota)` + `set.splitAt(t)`: tela dividida que desenha a mesma cena duas vezes no
  mesmo instante (variantes `before`/`after` do estado).
- `ui.meter(v, texto)`: medidor fixo (chuva).
- `createAsync` para cenários que carregam módulos.
- `?mods=` (carregar só alguns módulos), `window.__variant` / `variant` nas placas de teste.
