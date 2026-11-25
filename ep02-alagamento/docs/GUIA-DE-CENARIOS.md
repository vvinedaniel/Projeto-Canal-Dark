# Mundo por Dentro — guia para construir um cenário

Canal de TikTok que explica como o mundo funciona com animação 3D de verdade. Formato 9:16, 1080×1920, 30 fps.
Cada episódio é dividido em **cenários** (`src/sets/<id>.js`); o motor (`src/main.js`) escolhe o cenário pela
linha do tempo (`src/timeline.js`), renderiza e desenha por cima as legendas, a marca e os rótulos.

## Contrato do módulo

```js
// src/sets/<id>.js
export function create(L, { PH, def }) {      // L = src/lib.js (leia o arquivo inteiro antes de começar)
  const { THREE } = L;
  const scene = new THREE.Scene();
  const rig = L.studio(scene, { size: 12 });  // fundo de estúdio escuro, sol com sombra, contraluz
  // ... constrói tudo UMA vez aqui ...
  return {
    scene,
    ao: { radius: 0.5 },                      // raio da oclusão ambiente em metros (≈ 3–5% do tamanho do enquadramento)
    update(t, camera, ui) { /* posiciona câmera e anima tudo para o instante t */ }
  };
}
```

- `t` é o tempo **global** em segundos, dentro de `[def.t0, def.t1]`. `PH[n].a` / `PH[n].b` dão início/fim da frase n da narração.
- `update` tem de ser **função pura de t**: os quadros são renderizados fora de ordem. Nada de `Math.random()`,
  `Date`, nem estado acumulado entre quadros (use `L.rng(seed)` na construção e fórmulas de `t` na animação).
- `ui.label(id, texto, [x,y,z], alpha, { cls, stem, dx, dy })` desenha um rótulo ancorado num ponto 3D
  (`cls`: `accent` amarelo, `warn` vermelho, `good` verde, `big`, `plain`). `ui.dark(a)` escurece a tela para um corte interno.
- O motor já faz um mergulho no escuro de 0,3 s em cada troca de cenário. Comece o cenário com a câmera já em
  movimento (saindo de um tubo, chegando) e termine avançando para onde o fluxo vai embora.
- Chame `rig.focus(x, y, z, size)` a cada quadro com o ponto observado (o `camRail` devolve esse ponto) para a
  sombra acompanhar a câmera; `size` ≈ metade da largura do que está em quadro.

## Direção de arte (igual em todos os cenários)

- **Maquete em estúdio escuro**: blocos de mundo recortados (dioramas) flutuando num fundo azul-petróleo. Cortes
  transversais mostram o que fica escondido: solo em camadas (`L.soilWall`), tubos em corte (`L.cutPipe`), tanques abertos.
- Unidades em **metros**, y para cima. Proporções coerentes; pode exagerar diâmetro de tubo e tamanho de partícula para ler bem no celular.
- **Modelos reconhecíveis e detalhados.** Formas básicas só como ponto de partida: o objeto final precisa de
  silhueta e detalhes próprios (guarda-corpos, escadas, flanges, parafusos, motores, válvulas, janelas, telhas, postes).
  Use cantos arredondados (`L.rbox`), perfis de revolução (`L.lathe`), extrusões (`L.extrude`), cascas (`L.loft`), tubos (`L.tube`).
  Uma estação precisa parecer uma instalação industrial funcional; uma bomba precisa parecer uma bomba.
- **Materiais diferenciados** (`L.mat`, `L.metal`, `L.glossy`, `L.glass`, `L.water`, `L.glow`): concreto fosco, metal pintado, aço, vidro, água.
- **Cor conta a história**: esgoto bruto `PAL.sewage` (marrom) → `PAL.murky` → `PAL.haze` → água limpa `PAL.clear` (azul).
  Ramal de casa em PVC laranja (`PAL.pvc`), rede grande em concreto cinza. Setas e destaques em `PAL.accent` (amarelo).
- **Movimento contínuo**: a câmera nunca para (`L.camRail`). Uma mudança visual relevante a cada 3–5 s. Onde couber:
  estruturas que se montam/desmontam, partículas (`L.Flow`, `L.scatter`), setas que correm (`L.Chevrons`, `L.arrow`).
- Cada cena deve ser compreensível **sem áudio**. Rótulos curtos (até 3 palavras, pt-BR), no máximo 2 ao mesmo tempo.
- **Composição 9:16**: a marca ocupa o topo (0–8%), as legendas ficam na faixa y 64–77% e a interface do TikTok
  cobre os 14% de baixo e a faixa direita de 12%. Deixe o assunto principal entre y 12–62% e x 8–88%
  (a cena pode continuar por baixo das legendas, mas nada essencial ali).
- Nada de informação falsa. Na dúvida, mostre menos números.

## Limites técnicos

- Render por software: mantenha o cenário abaixo de ~300 mil triângulos, use instâncias (`InstancedMesh`, `L.scatter`),
  uma única luz com sombra (a do `L.studio`), sem render targets nem passes próprios.
- Transparências: `depthWrite: false` e `renderOrder` coerente. Evite z-fighting (afaste superfícies coplanares 2–5 mm).
- Edite **somente** o seu `src/sets/<id>.js` (pode criar `src/sets/<id>/*.js` se precisar). Não altere `lib.js`,
  `main.js`, `timeline.js` nem `index.html`; se achar um bug neles, contorne no seu arquivo e relate.

## Como testar

```bash
cd /home/user/grafico/mundo-por-dentro/ep01-descarga
node tools/render.cjs stills --t 52,54.5,57 --only <id> --scale 0.5 --out out/<id>
```

Gera JPEGs (540×960) em `out/<id>/`; abra-os com a ferramenta Read e critique com honestidade: silhueta legível?
objetos flutuando ou atravessados? z-fighting? assunto fora da área útil? parece profissional ou parece um amontoado de
caixas? Itere até ficar bom. A máquina é dividida com outros processos de render: use `--scale 0.5` e até 6 quadros
por execução; no fim confira 2 quadros em `--scale 1`. Erros de JavaScript aparecem como `[pageerror]`.
