# Ep. 03 — a maquete única e seus módulos

O episódio inteiro acontece numa **só maquete** (`src/sets/mundo.js`), do manancial à torneira, dividida em módulos com
dono. Leia antes: `CLAUDE.md` (raiz), `docs/STORYBOARD.md`, `docs/CIENCIA.md`, `src/sets/mundo/layout.js`,
`src/sets/mundo/state.js`, `src/sets/mundo/direction.js` (câmera), `src/lib.js` e `src/main.js`.

| Módulo | Arquivo(s) | É dono de |
|---|---|---|
| terreno | `mundo/terreno.js` (+ `mundo/terreno/*.js`) | relevo `Lo.G` (serra, vale, margem, pátio da captação, talude com muro de arrimo, platô da ETA, encosta, cidade), **represa** (água com ondulação, margens, vegetação aquática), **rio de entrada** e **rio de saída**, **barragem** com vertedouro e água vertendo, mata/árvores/capim, acabamento do platô (brita, gramado, caminhos), **face de corte da frente** (z = ZF) com furos onde aparecem as três redes e o ramal, faces laterais do bloco |
| captação | `mundo/captacao.js` (+ `mundo/captacao/*.js`) | torre de tomada d'água com **grade** e comporta, tubo/galeria até o **poço de sucção**, **casa de bombas** em corte (2 conjuntos motobomba centrífugos, base, acoplamento, **barrilete** com válvulas de retenção e gaveta, talha/monovia), **bomba em corte** (rotor girando, voluta, sucção e recalque), **adutora de água bruta** até `P.rawIn` (sobre berços/apoios, ancoragens nas curvas), obra (ensecadeira, escavadeira, munck) |
| ETA 1 | `mundo/eta1.js` (+ `mundo/eta1/*.js`) | caixa de chegada (recebe `P.rawIn`), **calha Parshall** (estreitamento, ressalto hidráulico), **casa de química** (tanques de coagulante, cloro, cal, flúor, bombas dosadoras, painéis) e **todas as linhas de dosagem** até os 4 pontos `ETA.dosing` (com o bico/difusor), **floculadores** (3 câmaras, cortinas/passagens, agitadores de paletas com motor e redutor), **decantador** (zona de entrada, calhas de coleta no topo, raspador/ponte, poço de lodo, descarga), linha de lodo e **tanque de lodo**, **canal de água decantada** de `P.decOut` até `P.filtIn`, passarelas e guarda-corpos da fileira 1 |
| ETA 2 | `mundo/eta2.js` (+ `mundo/eta2/*.js`) | **filtros** (4 caixas em corte, camadas: fundo falso com crepinas, cascalho, areia, antracito; calhas de lavagem; galeria de tubos e válvulas; **lavagem em contracorrente**), galeria de água filtrada até `P.contactIn`, **tanque de contato** com chicanas, saída até o **reservatório apoiado**, **elevatória** de água tratada (bombas azuis, barrilete) até `P.liftOut`, **laboratório** em corte (bancada, turbidímetro, colorímetro de cloro, pHmetro, frascos, estufa/placas, torneira de amostra, painel de resultados), passarelas e guarda-corpos da fileira 2 |
| cidade | `mundo/cidade.js` (+ `mundo/cidade/*.js`) | **adutora de água tratada** de `P.liftOut` até a torre, **reservatório elevado** (torre, taça, escada, régua de nível, entrada/saída), **rede de distribuição** (desce pela avenida até a Rua da Casa e se ramifica), ruas, calçadas, quadras, casas, prédios, **escola** e **hospital**, carros, árvores de rua; **as três redes da Rua da Casa** em corte na face (água azul rasa, esgoto ocre mais fundo indo para a direita/ETE, galeria de drenagem mais funda indo para o rio), poços de visita e bocas de lobo; ramais das outras edificações; **linha do nível da torre** (tracejada) e **manômetros** na rede; o **tê** da derivação da casa em `P.house` |
| casa | `mundo/casa.js` (+ `mundo/casa/*.js`) | a casa em corte (lote hero): **ramal** desde `P.house` até o muro, **cavalete com registro e hidrômetro em corte** (turbina, engrenagens, relojoaria com rolos em m³, lacre), canos internos (PVC), **caixa-d'água** em corte (tampa, entrada com **torneira de boia** articulada, ladrão, saídas, nível), cozinha mobiliada, **torneira em corte** (volante, haste, vedante/sede ou cartucho, arejador, jato), **copo** enchendo, **mão articulada** (modelo do Ep. 01) |
| micro | `mundo/micro.js` (+ `mundo/micro/*.js`) | o **mundo ampliado da lente** (cena própria, câmera própria): água bruta com partículas (argila, matéria orgânica, bactérias, protozoários), coagulação (cargas), floculação (flocos crescendo), sedimentação, água clara ainda com microrganismos, retenção no filtro, desinfecção gradual ao longo do tempo de contato |

## Contrato

```js
// src/sets/mundo/<id>.js
export function create(ctx) {           // pode ser async
  const { L, THREE, scene, Lo, St, rig, ghost, shared } = ctx;   // L = src/lib.js; Lo = layout.js; St = state.js
  // monte tudo aqui (uma vez); scene.add(grupo)
  return { update(t, S, cam) { /* posiciona/anima a partir de S (estado) e t (fase de animação) */ } };
}
```

- **S = St.state(t)** é a única fonte de "o que está construído" (`S.build.*`), "onde está a água" (`S.water.*`) e
  "o que está funcionando" (`S.run.*`). Leia `state.js` inteiro. **Não invente tempos próprios** de obra ou de água:
  derive sub-fases de `S.build.x` (ex.: filtros 0–0,25 caixas, 0,25–1 camadas). Use `t` só para movimento contínuo.
- `update` é **função pura de (t, S)**: quadros são renderizados fora de ordem, em paralelo. Nada de estado acumulado.
- **Rebobinar** (7,05–7,9 s): no presente (t < 7,05) tudo está pronto e funcionando; o relógio da história volta e as
  obras se desfazem sozinhas (dependem de `S.build`). Depois, cada obra nasce quando a narração chega nela.
- **Plantas**: o que ainda não foi construído aparece como contorno azul translúcido (`ghost.of(objetoPronto)` devolve
  as arestas; use `ghost.fill` para faces). Mostre a planta quando `build ≈ 0`, troque pela obra durante a construção.
- **Raio-x** (`S.xray` 0..1): ruas, calçadas e chão da cidade ficam translúcidos para ver as redes e o ramal. Cada dono
  de superfície aplica nas suas: `opacity = 1 − 0.75·xray`, `transparent = xray > 0.01`, `depthWrite = xray < 0.01`
  (lembre: mudar `transparent` exige `material.needsUpdate = true`).
- `ctx.shared` é o registro entre módulos (escreva no `create`, leia no `update`): `shared.micro = { scene, camera }`
  (módulo micro); `shared.soilMat` (terreno: material do corte do solo); quem precisar de mais, combine com o integrador.
- **Portas**: as conexões entre módulos são os pontos `Lo.P.*`. O tubo de cada trecho é do dono indicado na tabela e
  termina EXATAMENTE na porta (mesmo diâmetro, flange/luva no encontro). Nada desconectado, nada flutuando.
- **Não mude `layout.js`**. Se algo não encaixa, implemente o melhor possível e diga no relatório o que precisa mudar.

## Direção de arte (superar os Ep. 01 e 02)

- Maquete recortada no estúdio escuro; estruturas em **corte pela frente (+z)**: paredes com espessura e face de corte,
  água com **volume** (superfície ondulada + face vertical no corte), mecanismos completos por dentro.
- Água sempre com `L.water(cor, opacidade)` (ondulação + cáusticas contínuas). Cor = estágio do tratamento
  (`Lo.WATER.*`: bruta barrenta → com flocos → decantada → filtrada → tratada azul). A cor é recurso didático:
  **nada na imagem pode sugerir que "água azul/transparente = potável"** (isso é dito pelo laboratório).
- Concreto (cinza claro com leve variação), aço galvanizado, tubos de ferro pintado, PVC; tubos de água bruta e tratada
  com cores diferentes (`Lo.PIPE`). Setas/chevrons amarelos para o fluxo; verde `good` = tratado/protegido; vermelho `warn` = problema.
- Escala real em metros; exagere só espessuras finas, partículas e peças pequenas para ler no celular.
- Equipamentos reconhecíveis e completos (bomba com voluta, motor aletado, base, acoplamento, flanges, válvulas com
  volante; agitador com motor, redutor, eixo e paletas; ponte raspadora com trilho e rodas). Nada de caixa crua.
- **Construção progressiva** com a ordem real (fundação → paredes → equipamentos → ligações → enchimento → partida),
  legível, sem pressa que atrapalhe a compreensão. Máquinas do Ep. 02 (escavadeira, munck, caminhões) podem ser copiadas
  de `../ep02-alagamento/src/sets/cidade/{reservoir,drainage,city}/machines.js`, `drainage/crane.js`.
- Sombras: `L.shadows(obj)`; peças minúsculas sem `castShadow`.

## Desempenho (o render é por software: cada triângulo e cada draw call custam)

- **Junte geometria estática por material** (`L.BGU.mergeGeometries`) — um tanque inteiro de concreto = 1 malha.
- Repetições com `InstancedMesh` (árvores, grades, crepinas, grãos, tijolos, telhas, partículas).
- Não crie geometria/material no `update`. Esconda (`visible = false`) o que está fora de uso (obras não iniciadas,
  peças internas fora de quadro) e o que está longe da câmera e é minúsculo.
- Meta: o módulo inteiro abaixo de ~250 mil triângulos e ~250 draw calls.

## Como testar (faça muito isso)

```bash
cd /home/user/projeto-canal-dark/ep03-torneira
# quadros do filme (câmera do trilho), só com alguns módulos, em 1/4 da resolução
node tools/render.cjs stills --t 18,30,52 --scale 0.3 --mods terreno,eta1 --out out/<id>
# câmera livre para inspecionar um detalhe
node tools/plate.cjs --scale 0.4 --mods terreno,eta1 --t 40 --cam '{"p":[6,24,-56],"l":[6,17,-74],"fov":36}' --out out/<id>/x.jpg
# vários de uma vez: --batch arquivo.json  ([{t, cam?, out}])
# trecho animado curto (para validar movimento): quadros seguidos e um GIF/MP4 pequeno
node tools/render.cjs frames --from 1050 --to 1110 --scale 0.3 --mods terreno,eta1 --out out/<id>/anim && ffmpeg -y -framerate 30 -i out/<id>/anim/f%05d.jpg -vf scale=324:-2 out/<id>/anim.mp4
```
Olhe as imagens (Read) e itere. Um módulo só está pronto quando **cada etapa dele foi vista** em imagem: começo,
desenvolvimento e resultado de cada obra; todas as peças de cada mecanismo; conexões certas; água entrando e saindo.
