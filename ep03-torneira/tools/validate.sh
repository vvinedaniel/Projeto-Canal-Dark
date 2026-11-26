#!/usr/bin/env bash
# Validação visual: para cada etapa (docs/etapas.json) renderiza início, 1/3, 2/3 e fim e monta uma folha.
#   tools/validate.sh [escala=0.35] [etapas="0 1 2 ..."]
# Saída: out/valid/etapa-NN.jpg  (4 quadros lado a lado, com o tempo escrito)
set -e
cd "$(dirname "$0")/.."
SC=${1:-0.35}; ONLY=${2:-}
mkdir -p out/valid/raw
TS=$(python3 -c "
import json,sys; E=json.load(open('docs/etapas.json')); only='$ONLY'.split()
ts=[]
for e in E:
  if only and str(e['n']) not in only: continue
  a,b=e['a']+0.15,e['b']-0.15
  ts+= [round(a+(b-a)*k/3,2) for k in range(4)]
print(','.join(map(str,ts)))")
node tools/render.cjs stills --t "$TS" --scale "$SC" --out out/valid/raw | grep -E "pageerror|erro|ok em"
python3 - "$ONLY" <<'PY'
import json,subprocess,sys
E=json.load(open('docs/etapas.json')); only=sys.argv[1].split()
for e in E:
  if only and str(e['n']) not in only: continue
  a,b=e['a']+0.15,e['b']-0.15; ts=[round(a+(b-a)*k/3,2) for k in range(4)]
  ins=[]; flt=[]
  for i,t in enumerate(ts):
    ins+=['-i',f"out/valid/raw/t{t:06.2f}.jpg"]
    flt.append(f"[{i}:v]drawtext=text='{t:.2f}s':fontcolor=yellow:fontsize=22:box=1:boxcolor=black@0.6:x=8:y=8[v{i}]")
  flt.append(''.join(f'[v{i}]' for i in range(4))+'hstack=4')
  subprocess.run(['ffmpeg','-v','error','-y',*ins,'-filter_complex',';'.join(flt),f"out/valid/etapa-{e['n']:02d}.jpg"],check=True)
  print('out/valid/etapa-%02d.jpg  %s' % (e['n'], e['nome']))
PY
