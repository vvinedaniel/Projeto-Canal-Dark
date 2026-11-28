#!/usr/bin/env bash
# Folha de contato dos PNGs de uma pasta: scripts/sheet.sh out/stills/demo [colunas] [saida.jpg]
set -euo pipefail
DIR=${1:?pasta}; COLS=${2:-5}; OUT=${3:-$DIR/_sheet.jpg}
N=$(ls "$DIR"/*.png | wc -l); ROWS=$(( (N + COLS - 1) / COLS ))
ffmpeg -loglevel error -y -pattern_type glob -i "$DIR/*.png" -vf "scale=360:-1,tile=${COLS}x${ROWS}:padding=6:color=0x202020" -frames:v 1 -q:v 3 "$OUT"
echo "$OUT"
