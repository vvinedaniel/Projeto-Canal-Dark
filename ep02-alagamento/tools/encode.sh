#!/usr/bin/env bash
# Junta os quadros de out/frames com a narração e gera o MP4 final (1080x1920, 30 fps).
set -e
cd "$(dirname "$0")/.."
out=${1:-out/mundo-por-dentro-ep02.mp4}
DUR=116.6
ffmpeg -y -loglevel error -framerate 30 -i out/frames/f%05d.jpg -i audio/mix.wav \
  -filter_complex "[1:a]apad,atrim=0:${DUR},afade=t=out:st=$(awk -v d="$DUR" 'BEGIN{print d-0.5}'):d=0.5[a]" -map 0:v -map "[a]" \
  -c:v libx264 -preset ${PRESET:-slow} -crf 19 -pix_fmt yuv420p -profile:v high -r 30 \
  -c:a aac -b:a 192k -movflags +faststart -t ${DUR} "$out"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$out"
