#!/usr/bin/env python3
"""Alinhamento palavra a palavra da narração (sem modelo de fala).

Para cada frase (tempos medidos em src/timeline.js), distribui as palavras pelo número de sílabas
e depois encaixa cada fronteira no vale de energia mais próximo do áudio (as pausas curtas entre
palavras). Resultado: src/words.js com o início e o fim de cada palavra, usado pelas legendas.

    python3 tools/align.py            # lê audio/narracao.mp3 e src/timeline.js, grava src/words.js
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SR = 16000

def load_audio(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768

def phrases():
    src = (ROOT / 'src/timeline.js').read_text(encoding='utf-8')
    return [(float(a), float(b), t) for a, b, t in re.findall(r"\[(\d+\.\d+), (\d+\.\d+), '([^']*)'\]", src)]

VOWELS = 'aeiouáéíóúâêôãõàü'
def syllables(w):
    w = w.lower()
    return max(1, len(re.findall(f'[{VOWELS}]+', w)))

def envelope(x, hop=0.005, win=0.025):
    h, n = int(SR * hop), int(SR * win)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (n // 2, n)), n)[::h]
    e = 10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-9)
    k = np.ones(5) / 5
    return np.convolve(e, k, 'same'), hop

def align():
    x = load_audio(ROOT / 'audio/narracao.mp3')
    env, hop = envelope(x)
    out = []
    for a, b, text in phrases():
        words = text.split(' ')
        wts = [syllables(w) + (0.9 if re.search(r'[,.:?]$', w) else 0) for w in words]
        total = sum(wts)
        bounds, acc = [a], 0
        for w in wts[:-1]:
            acc += w; bounds.append(a + (b - a) * acc / total)
        bounds.append(b)
        # encaixa cada fronteira interna no vale de energia mais próximo (±120 ms), sem cruzar as vizinhas
        for i in range(1, len(bounds) - 1):
            # cada palavra mantém ao menos ~70 ms por sílaba (palavras de 2+ sílabas não podem ficar "relâmpago")
            lo = max(bounds[i - 1] + 0.07 * syllables(words[i - 1]), bounds[i] - 0.1)
            hi = min(bounds[i + 1] - 0.07 * syllables(words[i]), bounds[i] + 0.1)
            if hi <= lo: continue
            i0, i1 = int(lo / hop), int(hi / hop) + 1
            seg = env[i0:i1]
            if len(seg) == 0: continue
            dist = np.abs(np.arange(i0, i1) * hop - bounds[i]) / 0.1
            j = int(np.argmin(seg + dist * 3.0))  # vale mais fundo, levemente puxado para a estimativa
            bounds[i] = (i0 + j) * hop
        for i, w in enumerate(words):
            out.append({'w': w, 'a': round(bounds[i], 3), 'b': round(bounds[i + 1], 3)})
    return out

if __name__ == '__main__':
    words = align()
    js = '// Gerado por tools/align.py: início/fim de cada palavra da narração (s). Não edite à mão.\n'
    js += 'export const WORDS = ' + json.dumps(words, ensure_ascii=False, indent=0).replace('\n', '') + ';\n'
    (ROOT / 'src/words.js').write_text(js, encoding='utf-8')
    print(f'{len(words)} palavras -> src/words.js')
