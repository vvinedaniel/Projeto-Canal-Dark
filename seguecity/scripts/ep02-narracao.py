"""Monta a narração do Ep. 02 na linha do tempo de 75 s e alinha as palavras das legendas.

Uso: python3 scripts/ep02-narracao.py
Lê   public/audio/ep02/narracao-original.mp3 (10_pessoas.mp3, 72,6 s) e src/scenes/ep02/narration-v2.json
Grava public/audio/ep02/narracao.wav (75,000 s, 48 kHz mono) e src/scenes/ep02/words.json

Mesmo método do Ep. 01 (scripts/ep02-narracao.py), que fica intacto. Nada é acelerado nem cortado dentro
da fala. A voz já ocupa 72,6 s, então os respiros extras são mínimos (só nas duas viradas do roteiro) e a
marca fica sozinha só nos últimos ~2 s (ela entra junto de "SegueCity", na última frase). As palavras são distribuídas pelas sílabas e cada fronteira é encaixada no vale
de energia mais próximo do áudio (mesmo método do Mundo por Dentro, tools/align.py).
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/audio/ep02/narracao-original.mp3'
META = ROOT / 'src/scenes/ep02/narration-v2.json'
SR = 48000
DUR = 75.0
# respiro extra (s) ANTES de cada frase, além da pausa natural da gravação
EXTRA = {'f01': 0.08, 'f16': 0.25, 'f23': 0.2}  # padrão 0: a pausa natural da gravação
KEY = set('''dez pessoas morar coveiro cemitério zero moradores hoje casas donos mateus médico primeiro número
davi policial gabriel juan oficina mecânica mari neurocirurgiã alicia muri empresários gabrielly advogada jorge
comerciante roberto problema trabalhar terreno escritório advocacia carros cinco serviços distintivo dourado
fundador sempre missão pioneiros catorze comente nome profissão próximo cidadão seguecity'''.split())


def load(path, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768


def bare(w):
    return re.sub(r'[^a-zà-ü]', '', w.lower())


def syllables(w):
    return max(1, len(re.findall('[aeiouáéíóúâêôãõàü]+', w.lower())))


def main():
    meta = json.loads(META.read_text(encoding='utf-8'))
    fr = meta['frases']
    x = load(SRC, SR)
    out = np.zeros(int(DUR * SR), np.float32)
    shift, placed = 0.0, []
    for k, p in enumerate(fr):
        shift += EXTRA.get(p['id'], 0.0)
        prev_end = fr[k - 1]['ate'] if k else 0.0
        next_start = fr[k + 1]['de'] if k + 1 < len(fr) else len(x) / SR
        pre = min(0.12, (p['de'] - prev_end) / 2) if k else min(0.12, p['de'])
        post = min(0.3, (next_start - p['ate']) / 2)
        a0, a1 = int((p['de'] - pre) * SR), int((p['ate'] + post) * SR)
        seg = x[a0:a1].copy()
        f = int(0.008 * SR)
        seg[:f] *= np.linspace(0, 1, f)
        seg[-f:] *= np.linspace(1, 0, f)
        d0 = int((p['de'] - pre + shift) * SR)
        out[d0:d0 + len(seg)] += seg
        placed.append({'id': p['id'], 'text': p['texto'], 'a': round(p['de'] + shift, 3), 'b': round(p['ate'] + shift, 3)})
    assert placed[-1]['b'] < DUR - 1.5, 'a voz precisa terminar antes do fecho'
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()
    wav = ROOT / 'public/audio/ep02/narracao.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', str(wav)],
                   input=pcm, check=True)

    # alinhamento palavra a palavra na faixa montada
    hop, win = 0.005, 0.025
    y = out[::3]  # 16 kHz
    h, n = int(16000 * hop), int(16000 * win)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(y, (n // 2, n)), n)[::h]
    env = np.convolve(10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-9), np.ones(5) / 5, 'same')
    words = []
    for p in placed:
        ws = p['text'].split()
        wts = [syllables(w) + (0.9 if re.search(r'[,.:?…]$', w) else 0) for w in ws]
        tot, acc, bounds = sum(wts), 0, [p['a']]
        for w in wts[:-1]:
            acc += w
            bounds.append(p['a'] + (p['b'] - p['a']) * acc / tot)
        bounds.append(p['b'])
        for i in range(1, len(bounds) - 1):
            lo = max(bounds[i - 1] + 0.07 * syllables(ws[i - 1]), bounds[i] - 0.12)
            hi = min(bounds[i + 1] - 0.07 * syllables(ws[i]), bounds[i] + 0.12)
            if hi <= lo:
                continue
            i0, i1 = int(lo / hop), int(hi / hop) + 1
            seg = env[i0:i1]
            if len(seg) == 0:
                continue
            dist = np.abs(np.arange(i0, i1) * hop - bounds[i]) / 0.12
            bounds[i] = (i0 + int(np.argmin(seg + dist * 3.0))) * hop
        for i, w in enumerate(ws):
            words.append({'w': w, 'a': round(bounds[i], 3), 'b': round(bounds[i + 1], 3), 'key': bare(w) in KEY, 'phrase': p['id']})
    (ROOT / 'src/scenes/ep02/words.json').write_text(json.dumps({'fonte': 'scripts/ep02-narracao.py', 'frases': placed, 'palavras': words},
                                                                ensure_ascii=False, indent=1), encoding='utf-8')
    for p in placed:
        print(f"{p['id']} {p['a']:6.2f}–{p['b']:6.2f}  {p['text']}")
    print(f'{len(words)} palavras; voz termina em {placed[-1]["b"]:.2f} s; arquivo {DUR:.3f} s')


if __name__ == '__main__':
    main()
