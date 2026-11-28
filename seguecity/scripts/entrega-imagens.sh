#!/usr/bin/env bash
# Gera as imagens de apresentação da cidade (ilha 4K, closes, personagem, interiores) em out/entrega-v2/.
# Uso: bash scripts/entrega-imagens.sh   (≈ 2 min; não renderiza vídeo)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=out/entrega-v2; TMP=out/stills/_entrega
mkdir -p "$OUT" "$TMP"
TAG='"tag":"DEMONSTRAÇÃO · MORADORES DE EXEMPLO"'
shot() { # nome composição tempo props
  rm -f "$TMP"/*.png
  timeout 300 npx tsx scripts/stills.ts "$2" "$3" --scale 1 --out "$TMP" --props "$4" 2>&1 | grep -E "placa|rror" || true
  mv "$TMP"/*.png "$OUT/$1.png"; echo "ok $1"
}
# ilha completa em 4K (estado real do Dia 01: cidade pronta, sem moradores, sem trânsito)
shot 01-ilha-noite-4k Poster4K 2 '{"i":15.5,"j":15.5,"z":-40,"zoom":1.0,"night":1,"home":0,"traffic":0,"people":0}'
shot 02-ilha-amanhecer-4k Poster4K 2 '{"i":15.5,"j":15.5,"z":-40,"zoom":1.0,"night":1,"home":0,"traffic":0,"people":0,"dawn":1}'
# closes; com moradores e trânsito de exemplo, por isso com a etiqueta
shot 03-praca-central Sandbox 2 "{\"zoom\":4.5,\"i\":12.5,\"j\":13.6,\"z\":6,$TAG}"
shot 04-bairro-residencial Sandbox 2 "{\"zoom\":4.3,\"i\":13.5,\"j\":25.0,\"z\":-4,$TAG}"
shot 05-regiao-comercial Sandbox 2 "{\"zoom\":4.2,\"i\":17.8,\"j\":14.2,\"z\":10,$TAG}"
# personagem de exemplo (quadro da demo com a ficha "EXEMPLO · Ana")
shot 06-personagem-exemplo CityDemo 10.2 '{}'
# kit de interiores
shot 07-interiores Interiores 0 '{}'
# fecho com a logo oficial (último quadro da demo)
shot 09-fecho-logo-oficial CityDemo 14.9 '{}'
# estados de luz e clima (estado real: sem moradores e sem trânsito)
OUT=out/stills/_estados; mkdir -p "$OUT"
CAM='"zoom":2.6,"i":13.5,"j":16,"z":0,"home":0,"traffic":0,"people":0'
shot noite Sandbox 2 "{$CAM,\"night\":1}"
shot amanhecer Sandbox 2 "{$CAM,\"night\":1,\"dawn\":1}"
shot chuva Sandbox 2 "{$CAM,\"night\":1,\"rain\":1}"
shot neblina Sandbox 2 "{$CAM,\"night\":1,\"fog\":1}"
node scripts/estados.cjs
# comparativo: mesmas câmeras e estado das imagens "antes" (v1, tag seguecity-v1) em out/comparativo/antes/
OUT=out/comparativo/depois; mkdir -p "$OUT"
shot ilha Sandbox 2 "{\"zoom\":1.0,\"i\":15.5,\"j\":15.5,\"z\":0,$TAG}"
shot praca Sandbox 2 "{\"zoom\":4.5,\"i\":12.5,\"j\":13.6,\"z\":6,$TAG}"
shot bairro Sandbox 2 "{\"zoom\":4.0,\"i\":11.5,\"j\":26.6,\"z\":6,$TAG}"
shot comercio Sandbox 2 "{\"zoom\":4.2,\"i\":17.8,\"j\":14.2,\"z\":10,$TAG}"
shot personagem CityDemo 10.2 '{}'
node scripts/comparativo.cjs
ls -la out/entrega-v2 out/comparativo
