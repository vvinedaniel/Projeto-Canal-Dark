"""Monta a narração do Ep. 01 na linha do tempo de 75 s e alinha as palavras das legendas.

Uso: python3 scripts/ep01-narracao.py
Lê   public/audio/ep01/narracao-original.mp3 (a voz oficial, 62 s) e src/scenes/ep01/narration-v2.json
Grava public/audio/ep01/narracao.wav (75,000 s, 48 kHz mono) e src/scenes/ep01/words.json

Nada é acelerado nem cortado dentro da fala: cada frase é recortada no meio das pausas medidas e
recolocada com um respiro extra nas viradas do roteiro (EXTRA). A voz termina em ~68,6 s e o resto fica
para o amanhecer e a logo. As palavras são distribuídas pelas sílabas e cada fronteira é encaixada no vale
de energia mais próximo do áudio (mesmo método do Mundo por Dentro, tools/align.py).
"""
import json
import re
import subprocess
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public/audio/ep01/narracao-original.mp3'
META = ROOT / 'src/scenes/ep01/narration-v2.json'
SR = 48000
DUR = 75.0
# respiro extra (s) ANTES de cada frase, além da pausa natural da gravação
EXTRA = {'f01': 0.15, 'f02': 0.2, 'f03': 0.5, 'f04': 0.9, 'f05': 0.3, 'f06': 0.6, 'f07': 0.4, 'f08': 0.3,
         'f09': 0.3, 'f10': 0.4, 'f11': 0.4, 'f12': 0.6, 'f13': 0.3, 'f14': 0.8, 'f15': 0.3, 'f16': 0.3}
KEY = set('''cidade inteira zero problema ninguém mora casas escola hospital comércio prefeitura pronto habitantes
você entra seguidor cidadão seguecity nome profissão personagem vivendo médico policial empresário mecânico
professor profissões bairros empresas acontecimentos destino cem eleição governar hoje história comente
primeiro morador'''.split())


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
        shift += EXTRA[p['id']]
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
    assert placed[-1]['b'] < DUR - 4, 'a voz precisa terminar antes do fecho'
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes()
    wav = ROOT / 'public/audio/ep01/narracao.wav'
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
    (ROOT / 'src/scenes/ep01/words.json').write_text(json.dumps({'fonte': 'scripts/ep01-narracao.py', 'frases': placed, 'palavras': words},
                                                                ensure_ascii=False, indent=1), encoding='utf-8')
    for p in placed:
        print(f"{p['id']} {p['a']:6.2f}–{p['b']:6.2f}  {p['text']}")
    print(f'{len(words)} palavras; voz termina em {placed[-1]["b"]:.2f} s; arquivo {DUR:.3f} s')


if __name__ == '__main__':
    main()
