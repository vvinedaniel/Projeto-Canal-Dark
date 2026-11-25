# Ep. 02 — relatório de qualidade

Validação visual antes do render final: para cada uma das 20 etapas (+ gancho) foram renderizados quatro quadros
(início, 1/3, 2/3 e fim) com **todos os módulos juntos** (`tools/validate.sh`, folhas em `out/valid/etapa-NN.jpg`),
inspecionados um a um, corrigidos e renderizados de novo. Closes extras com `tools/plate.cjs` onde havia dúvida.

## O que foi conferido em cada etapa
| # | Etapa | Início → ação → consequência → resultado (conferido em imagem) |
|---|---|---|
| 0 | Gancho | rua alagada no ponto baixo, carro com água acima das rodas, grelha afogada fervendo com lixo, galeria sob pressão no corte; câmera recua até a cidade inteira |
| 1 | Rebobinar + natural | a cidade se desmonta em ordem inversa, mata volta, córrego reaparece; chuva normal sobre a mata |
| 2 | Infiltração e escoamento | setas descendo pelas camadas até o lençol freático (solo escurece); córrego cheio levando água ao rio |
| 3 | Construção | árvores tombam em sequência; casas por fiadas e telhas; prédios andar por andar com a grua; calçadas; asfalto atrás da vibroacabadora e rolo; carros chegam |
| 4 | Impermeabilização | setas batendo no asfalto e nos telhados com X vermelho; solo seco por baixo |
| 5 | Acúmulo | mesma chuva normal: poças, enxurrada nas sarjetas, lâmina crescendo no ponto baixo |
| 6 | Bocas de lobo | a do ponto baixo primeiro: cava no corte, caixa, guia aberta, grelha |
| 7 | Galerias | munck assentando aduelas de montante para jusante; ligações descendo das caixas até a galeria |
| 8 | Canal e rio | canal, bueiro sob a avenida, cabeceira, enrocamento e comporta; água de base correndo com setas até o rio; raio-x com drenagem → rio e esgoto → tratamento |
| 9 | Chuva normal / limite | galeria a ~35%, filetes nas caixas, linha de capacidade |
| 10 | Chuva intensa | medidor sobe para "intensa", céu escurece, galeria enchendo |
| 11 | Sobrecarga | galeria cheia e sob pressão; água sobe pela grelha; lâmina na rua cresce |
| 12 | Lixo | sacolas, PET, latas e folhas descem a sarjeta e cobrem a grelha |
| 13 | Rio cheio | corte do rio: nível passa a saída, comporta fecha, setas da galeria param e voltam (vermelhas) |
| 14 | Alagamento | mancha se espalha rua a rua (nível contínuo do estado), carro parcialmente submerso, água acima da soleira da casa em corte (sofá molhado) |
| 15 | Piscinão: obra | praça desmontada; escavadeira cavando em camadas e carregando basculantes; laje, paredes com formas, escada, casa de bombas, régua; valas e ligações; acabamento e placa |
| 16 | Piscinão: funcionando | transbordo da galeria → canal elevado → cascata; nível sobe na régua; depois da chuva a bomba devolve aos poucos (redemoinho, setas no recalque) |
| 17 | Ampliação + jardins | galeria mais alta, bocas extras, lixo removido; jardins com camadas em corte e plantas |
| 18 | Áreas verdes + permeável | parque linear com bacias, mudas crescendo; estacionamento faixa a faixa com máquinas |
| 19 | Nova tempestade | mesma intensidade "intensa": água entrando em jardins, pavimento e parque; piscinão enchendo; galeria abaixo do limite |
| 20 | Antes × depois + sistema | tela dividida (mesma cidade, mesmo instante, mesma chuva, mesma câmera): à esquerda sem melhorias, alagada; à direita com melhorias, lâmina rasa no ponto baixo (risco reduzido, não zero); recuo final com as redes funcionando e o rio |

## Problemas encontrados na validação e corrigidos
1. Tela dividida não aparecia (o cenário só pedia a divisão quando não havia variante) → corrigido; conferido em 1080×1920.
2. Bloco de solo da praça aparecia como retângulo marrom no meio da mata → topo acompanha o chão (grama → terra).
3. Montagem das galerias fora de quadro → câmera acompanha a frente da obra (munck visível).
4. Canal ficava pronto depois da fala "até canais e rios" e sem água → obra encurtada (40,65–42,7 s) e vazão de base no córrego canalizado.
5. Cena do rio cheio confusa (cabeceira tapando a comporta) → câmera recuada mostrando o corte do rio e o nível passando a saída.
6. Galeria em corte por trás das legendas → enquadramentos refeitos (assunto acima da faixa das legendas).
7. Casa alagada vista por cima do telhado → câmera de frente, por cima do carro.
8. Boca de lobo do ponto baixo era construída por último (poça sumia antes) → construída primeiro; carro do gancho deslocado 2 m para não tapar a grelha.
9. Praça sumia em 0,1 s → desmonte visível em 1,5 s antes da escavação.
10. Raio-x opaco sob a rua → transparência máxima maior; confirmado que o chão fica translúcido.

## Ciência (o que a imagem afirma)
- Proporção infiltração ≫ escoamento no terreno natural e inversão com a impermeabilização: EPA 841-F-03-003 (sem números na tela).
- Galerias com capacidade finita (chuva de projeto); sobrecarga devolve água pelas grelhas.
- Remanso: rio acima da saída impede o escoamento; comporta de retenção fecha para o rio não entrar.
- Redes separadas: drenagem (concreto, água de chuva, para o rio) × esgoto (PVC, marrom, para a ETE).
- Piscinão armazena o pico e devolve depois (bombeamento controlado), aliviando galerias e rio.
- Comparação final com a mesma tempestade (mesmos parâmetros de chuva e mesmo relógio da tempestade nos dois lados);
  o lado "depois" ainda tem água no ponto baixo — o vídeo não sugere risco zero, como a narração ("o risco diminui").

## Áudio
Narração do ElevenLabs em primeiro plano (ducking dos efeitos sob a voz). Efeitos sintetizados nos mesmos tempos da
tela: chuva leve, tempestade, trovões, enxurrada, máquinas (diesel, hidráulico, ré), escavação/despejo, rolo, obra,
lixo plástico, cascata do piscinão, bomba, água na galeria e no canal, rio. Mix final −14 LUFS, true peak ≤ −1,5 dBTP.

## Limitações conhecidas (honestas)
- A tela dividida mostra metades espaciais da mesma vista (oeste à esquerda, leste à direita), não a mesma metade da cidade nos dois lados.
- Render por software (sem GPU): ~5 s/quadro em 1080×1920 neste ambiente.
