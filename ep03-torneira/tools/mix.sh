#!/usr/bin/env bash
# Mixagem final: narração tratada + audio/sfx.wav (efeitos + trilha, já com ducking) -> audio/mix.wav
# Estéreo 48 kHz 24 bits, -14 LUFS integrado, true peak <= -1 dBTP.
# Uso: tools/mix.sh            (regenera audio/sfx.wav se tools/sfx.py for mais novo)
set -euo pipefail
cd "$(dirname "$0")/.."

DUR=115.0
VOICE_LUFS=-16      # referência da voz antes da soma (os ganhos da cue list em sfx.py contam com isso)
TARGET=-14          # LUFS integrado final
LIMIT_DB=-1.5       # teto do limitador (sobre sinal 4x sobreamostrado ~ true peak)
OUT=audio/mix.wav
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

if [ ! -f audio/sfx.wav ] || [ tools/sfx_ep03.py -nt audio/sfx.wav ] || [ tools/sfx.py -nt audio/sfx.wav ]; then
  nice -n 10 python3 tools/sfx_ep03.py -q
fi

lufs() {  # LUFS integrado de um arquivo
  ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 | awk '/^ *I:/{v=$2} END{print v}'
}
report() {  # I, LRA e true peak
  ffmpeg -hide_banner -nostats -i "$1" -af ebur128=peak=true -f null - 2>&1 |
    awk '/^ *I:/{i=$2} /^ *LRA:/{l=$2} /^ *Peak:/{p=$2} END{printf "I=%s LUFS  LRA=%s LU  TP=%s dBTP\n", i, l, p}'
}

# 1) Voz: 48 kHz (soxr) -> passa-altas 80 Hz (2 polos) + 60 Hz (corta ronco/plosivas)
#    -> corte leve de "caixa" em 300 Hz -> de-esser suave -> ganho para -20 LUFS (medido)
#    -> compressão leve (2:1, joelho macio, RMS) -> compressor rápido só nos picos (4:1)
#    -> mono em L e R -> ganho medido para VOICE_LUFS (medido já em estéreo).
PRE="aresample=48000:resampler=soxr,highpass=f=80:poles=2,highpass=f=60:poles=2,\
equalizer=f=300:t=q:w=1.2:g=-1.5,deesser=i=0.35:m=0.4:f=0.55"
ffmpeg -y -loglevel error -i audio/narracao.mp3 -af "$PRE" -c:a pcm_f32le "$TMP/voz_eq.wav"
VR=$(lufs "$TMP/voz_eq.wav")
VPRE=$(awk -v b="$VR" 'BEGIN{printf "%.2f", -20-b}')
ffmpeg -y -loglevel error -i "$TMP/voz_eq.wav" -af "volume=${VPRE}dB,\
acompressor=threshold=-24dB:ratio=2:attack=15:release=200:knee=6:makeup=1,\
acompressor=threshold=-11dB:ratio=4:attack=1:release=50:knee=3:detection=peak:makeup=1,\
pan=stereo|c0=c0|c1=c0,apad,atrim=0:${DUR}" -c:a pcm_f32le "$TMP/voz0.wav"
VI=$(lufs "$TMP/voz0.wav")
VG=$(awk -v a="$VOICE_LUFS" -v b="$VI" 'BEGIN{printf "%.2f", a-b}')
ffmpeg -y -loglevel error -i "$TMP/voz0.wav" -af "volume=${VG}dB" -c:a pcm_f32le "$TMP/voz.wav"
[ -n "${KEEP_STEMS:-}" ] && cp "$TMP/voz.wav" "$KEEP_STEMS/voz.wav"

# 2) Soma voz + efeitos/trilha (sem normalização automática do amix)
ffmpeg -y -loglevel error -i "$TMP/voz.wav" -i audio/sfx.wav -filter_complex \
  "[1:a]aresample=48000,atrim=0:${DUR}[s];[0:a][s]amix=inputs=2:normalize=0:duration=longest,atrim=0:${DUR}" \
  -c:a pcm_f32le "$TMP/pre.wav"

# 3) Master: ganho para -14 LUFS -> limitador em 192 kHz (true peak) -> 48 kHz -> fades.
#    Duas passadas: a 2a corrige o pouco de loudness que o limitador tira.
master() {  # $1 = ganho dB, $2 = saída
  ffmpeg -y -loglevel error -i "$TMP/pre.wav" -af \
    "volume=${1}dB,aresample=192000:resampler=soxr,\
alimiter=limit=$(awk -v d="$LIMIT_DB" 'BEGIN{printf "%.4f", 10^(d/20)}'):attack=1:release=80:level=0,\
aresample=48000:resampler=soxr,afade=t=in:st=0:d=0.015,afade=t=out:st=$(awk -v d="$DUR" 'BEGIN{print d-0.55}'):d=0.55,atrim=0:${DUR}" \
    -c:a pcm_s24le "$2"
}
PI=$(lufs "$TMP/pre.wav")
G1=$(awk -v a="$TARGET" -v b="$PI" 'BEGIN{printf "%.2f", a-b}')
master "$G1" "$TMP/m1.wav"
M1=$(lufs "$TMP/m1.wav")
G2=$(awk -v g="$G1" -v a="$TARGET" -v b="$M1" 'BEGIN{printf "%.2f", g+(a-b)}')
master "$G2" "$OUT"

echo "voz: ${VR} LUFS após EQ; pré-ganho ${VPRE} dB; após compressão ${VI} LUFS -> ganho ${VG} dB (-> ${VOICE_LUFS} LUFS)"
echo "pré-master: ${PI} LUFS; ganho de master: ${G2} dB"
echo "voz (stem):  $(report "$TMP/voz.wav")"
echo "sfx+trilha:  $(report audio/sfx.wav)"
echo "mix final:   $(report "$OUT")"
ffmpeg -hide_banner -nostats -i "$OUT" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume" | sed 's/^.*\] /volumedetect: /'
ffprobe -v error -show_entries stream=sample_rate,channels:format=duration -of default=nw=1 "$OUT" | tr '\n' ' '; echo
