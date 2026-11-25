# Ep. 02 — a maquete única e seus módulos

O episódio inteiro acontece numa **só maquete** (`src/sets/cidade.js`), dividida em módulos com dono:

| Módulo | Arquivo | É dono de |
|---|---|---|
| terreno | `src/sets/cidade/terrain.js` (+ `terrain/*.js`) | superfície do chão (natural → urbano), mata e campo, morro, córrego natural, **rio e sua água**, **faces de corte do solo** (frente com furos + tampões que "escavam"), setas de infiltração/bloqueio no corte, raio-x do chão |
| cidade | `src/sets/cidade/city.js` (+ `city/*.js`) | ruas, guias, calçadas, asfalto (pavimentação animada), casas e prédios (construção animada), praça, avenida da margem e ponte do bueiro, estacionamento, ETE e elevatória de esgoto (prédios), carros, máquinas de obra da cidade (grua, vibroacabadora, rolo, caminhões), calhas e condutores dos telhados |
| drenagem | `src/sets/cidade/drainage.js` (+ `drainage/*.js`) | bocas de lobo (grelha + abertura na guia + caixa em corte + ligação), **galeria** em corte (montagem e ampliação), poços de visita, canal de concreto, bueiro sob a avenida, cabeceira de saída + **comporta**, **rede de esgoto separada** (coletor em corte, ramais das casas, curva para a elevatória, recalque até a ETE, efluente tratado ao rio), água dentro de tudo isso, setas de fluxo, **lixo** que entope as grelhas, água voltando pela grelha |
| piscinão | `src/sets/cidade/reservoir.js` (+ `reservoir/*.js`) | escavação (cava + escavadeira + caminhões basculantes), estrutura de concreto (fundo, paredes, pilares/escadas, régua de nível), ligação com a galeria (tubo lateral + cascata), bomba e tubo de saída com válvula, água (nível, cascata, redemoinho na sucção), guarda-corpo |
| soluções verdes | `src/sets/cidade/green.js` (+ `green/*.js`) | jardins de chuva (canteiros rebaixados; os da frente em corte com camadas), pavimento permeável (estacionamento + trecho de calçada em corte), parque linear/várzea na margem, árvores novas nas calçadas; água entrando neles |
| água | `src/sets/cidade/water.js` (+ `water/*.js`) | **chuva** (gotas, respingos, anéis, névoa), **lâmina na rua e alagamento** (superfície + face d'água no corte), enxurrada nas sarjetas, água descendo dos telhados, escoamento na encosta natural, gotas pingando |

## Contrato

```js
// src/sets/cidade/<id>.js
export function create(ctx) {
  const { L, THREE, scene, Lo, H, shared } = ctx;   // L = src/lib.js; Lo = layout.js; H = hydro.js
  // monte tudo aqui (uma vez); adicione à cena: scene.add(grupo)
  return { update(t, S, cam) { /* posiciona/anima a partir de S (estado) e t (fase de animação) */ } };
}
```

- **S = H.state(t, variant)** é a única fonte de "o que está construído" (`S.build.*`, 0..1) e "onde está a água"
  (`S.flood`, `S.river`, `S.gal`, `S.res`, …). Leia `src/sets/cidade/hydro.js` inteiro. **Não invente tempos próprios** de
  obra ou de água: derive sub-fases de `S.build.x` (ex.: casa i sobe quando `S.build.houses` passa por `i/n`).
  Use `t` só para movimento contínuo (gotas caindo, rodas girando, ondulação, setas correndo).
- `update` é **função pura de (t, S)**: quadros são renderizados fora de ordem e duas vezes no mesmo instante com
  estados diferentes (tela dividida antes × depois: `S.variant` = 'before' | 'after'). Nada de estado acumulado.
- **Rebobinar**: entre t 5,6 e 9,6 `S.st` volta de 71 a 9,6 e as obras se desfazem sozinhas (porque dependem de `S.build`).
  Garanta que cada obra fica bonita também "andando para trás".
- `ctx.shared` é o registro entre módulos (escreva no `create`, leia no `update`):
  - terreno: `shared.groundY(x, z)` (altura do chão urbano), `shared.soilMat` (material do corte), `shared.faceHoles` (polígonos usados)
  - cidade: `shared.downspouts` = [{x,y,z}] saídas dos condutores dos telhados; `shared.roofs` = [{x0,x1,z0,z1,y}];
    `shared.cars` = [{x,z,obj}]; `shared.surfaces(S)` → lista de materiais que ficam translúcidos no raio-x
  - drenagem: `shared.inlets` = [{x, y, z, extra}] (topo da grelha)
- **Raio-x** (`S.xray` 0..1): o chão (terreno, asfalto, calçadas, gramado) fica translúcido para mostrar as duas redes por
  baixo. Cada dono de superfície aplica nas suas: `opacity = 1 − 0.75·xray`, `transparent = xray > 0.01`, `depthWrite = xray < 0.01`.
- Coordenadas, cotas, ruas, lotes, galeria, canal etc. estão em `src/sets/cidade/layout.js`. **Não mude o layout**: se algo
  não encaixa, implemente o melhor possível e escreva no relatório o que precisa mudar.

## Corte da frente (z = Lo.ZF = 26)

A face da frente da maquete é um corte do solo, como no Ep. 01. O **terreno** desenha essa face com furos onde aparecem
as estruturas, e **tampões** de solo (mesma textura, sem furo) que tapam cada furo até a obra correspondente ser feita,
sendo "escavados" (recorte por plano de clipping que avança) quando `S.build.x` cresce. Lista de furos (todas as cotas
vêm do layout; eixo das estruturas em z = ZF, metade de trás dentro da maquete):

| Furo | Polígono (no plano XY) | Revelado por |
|---|---|---|
| galeria | de x = −36 a 16, de `invert(x) − wall` a `invert(x) + big.h + wall` (já no tamanho ampliado) | `build.gallery`, de montante (x −36) para jusante (x 16) |
| anel da ampliação | parte do furo da galeria acima de `invert + small.h + wall` | `build.enlarge` (de baixo p/ cima) — antes disso o tampão fica |
| caixas das bocas de lobo | x ± (w/2 + 0.15), de `streetY + curbH − depth − 0.15` até `streetY + curbH` | `build.inlets` (uma por vez, de cima p/ baixo) |
| ligação caixa → galeria | tubo vertical r = pipeR + 0.05 entre o fundo da caixa e o teto da galeria (pequena) | junto com `build.gallery` |
| bocas extras | iguais, nas posições `INLETS_EXTRA` | `build.enlarge` |
| esgoto | tubo r = 0.35 ao longo de `SEWER.y(x)`, x −36 a 17.3 | `build.sewer` |
| canal | entalhe em U aberto para cima, x 16–26, do fundo `CANAL.invert(x) − wall` até o chão | `build.canal` (o córrego natural ocupa só o raso) |
| jardins da frente | x0..x1 de cada jardim com `front`, 0.9 m abaixo da calçada | `build.gardens` |
| calçada permeável | x −8.5..−5, 0.55 m abaixo da calçada | `build.permeable` |

O contorno de cima da face segue `Gnat(x, ZF)` no início (com o córrego) e `G(x, ZF)` depois que a rua é feita
(o córrego do vale é aterrado; só o trecho x 16–26 vira canal). A calha do rio (x 26–39.5) faz parte do contorno.

## Direção de arte (igual ao Ep. 01, ver CLAUDE.md da raiz)

- Maquete recortada flutuando no estúdio escuro; o corte revela o escondido. Escala real em metros; exagere só espessuras
  e partículas para ler no celular.
- Cores: drenagem = concreto cinza claro com água **azul-acinzentada** (`#5f9fc4`, nunca marrom); esgoto = tubo
  **ocre/laranja PVC** com conteúdo **marrom** (`PAL.sewage`). Lixo colorido (sacolas, PET, latas). Verde `good` para
  soluções. Amarelo para setas. Vermelho `warn` para problema.
- Água sempre com o material `L.water(...)` (ondulação + cáusticas, contínua entre peças). Água tem volume: lâmina com face
  no corte, nível coerente com `S`, nunca aparece "do nada".
- Máquinas reconhecíveis: escavadeira (esteiras, cabine, lança, braço, caçamba articulada), caminhão basculante, grua,
  vibroacabadora/rolo compactador, caminhão-guindaste. Modelos completos, nada de caixa crua.
- Sombras e AO: `L.shadows(obj)`; superfícies grandes recebem sombra.
- Desempenho: use InstancedMesh para repetições (gotas, folhas, tijolos, árvores, pedras); evite milhares de meshes soltos.

## Como testar (faça muito isso)

```bash
# quadros soltos do filme inteiro, só com alguns módulos (rápido, 1/4 da resolução)
node tools/render.cjs stills --t 10,20,40 --scale 0.3 --mods terrain,city --out out/<seu-id>
# câmera livre para inspecionar um detalhe (placa limpa, sem legenda)
node tools/plate.cjs --scale 0.4 --mods terrain,drainage --t 40 --cam '{"p":[0,4,34],"l":[0,2,26],"fov":40}' --out out/<seu-id>/x.jpg
# vários de uma vez: --batch arquivo.json  ([{t, cam?, variant?, out}])
```
Olhe as imagens (Read) e itere. Um módulo só está pronto quando **cada etapa dele foi vista** em imagem e está
completa: começo, desenvolvimento e resultado de cada obra; todas as peças do mecanismo; conexões certas.
