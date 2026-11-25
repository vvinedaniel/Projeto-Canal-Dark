#!/usr/bin/env bash
# Junta os quadros de out/frames com a narração e gera o MP4 final (1080x1920, 30 fps).
set -e
cd "$(dirname "$0")/.."
out=${1:-out/mundo-por-dentro-ep01.mp4}
ffmpeg -y -loglevel error -framerate 30 -i out/frames/f%05d.jpg -i audio/mix.wav \
  -filter_complex "[1:a]apad,atrim=0:102.5,afade=t=out:st=102.0:d=0.5[a]" -map 0:v -map "[a]" \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -profile:v high -r 30 \
  -c:a aac -b:a 192k -movflags +faststart -t 102.5 "$out"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height,r_frame_rate -of default=nw=1 "$out"
