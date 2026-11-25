#!/usr/bin/env bash
# Folha de contato para revisão rápida: tools/sheet.sh <id-do-cenário> <t0> <t1> <passo> [colunas]
# Ex.: tools/sheet.sh casa 0 37.5 2.5  ->  out/sheet-casa.jpg
set -e
cd "$(dirname "$0")/.."
id=$1; t0=$2; t1=$3; step=$4; cols=${5:-6}
times=$(python3 -c "import sys;a,b,s=map(float,sys.argv[1:]);print(','.join(f'{a+i*s:.2f}' for i in range(int((b-a)/s)+1)))" "$t0" "$t1" "$step")
n=$(echo "$times" | tr ',' '\n' | wc -l); rows=$(( (n + cols - 1) / cols ))
rm -rf "out/sheet-$id"; node tools/render.cjs stills --t "$times" --only "$id" --scale 0.25 --out "out/sheet-$id" | grep -E "pageerror|error|ok em" || true
ffmpeg -y -loglevel error -pattern_type glob -i "out/sheet-$id/*.jpg" -vf "tile=${cols}x${rows}" -q:v 3 "out/sheet-$id.jpg"
echo "out/sheet-$id.jpg ($n quadros: $times)"
