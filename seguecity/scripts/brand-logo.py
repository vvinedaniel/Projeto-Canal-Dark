"""Prepara a logo oficial para os vídeos: tira o fundo liso e mantém o brilho neon semitransparente.

Uso: python3 scripts/brand-logo.py <logo.png> [public/brand]
Gera:
  logo-original.png  cópia intacta do arquivo recebido
  logo.png           emblema com fundo transparente (usado nas cartelas de abertura e fecho)
  logo-previa.png    o emblema sobre fundos claro e laranja, para conferir se sobrou borda do fundo

Como funciona: a cor do fundo é a mediana da borda da imagem. O emblema é o que difere bem do fundo, com
os buracos preenchidos (fica opaco); fora dele é transparente. O brilho neon em volta é desenhado no vídeo
(componente Logo), sem o ruído do fundo original.
"""
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

src = Path(sys.argv[1])
out = Path(sys.argv[2] if len(sys.argv) > 2 else 'public/brand')
out.mkdir(parents=True, exist_ok=True)
shutil.copyfile(src, out / 'logo-original.png')

im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32)
h, w, _ = im.shape
edge = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
bg = np.median(edge, axis=0)

# corpo do emblema: tudo que difere bem do fundo (linha neon, céu, nuvens, ponte). O que é escuro dentro
# dele (atrás das letras) fica cercado e entra pelo preenchimento de buracos; o brilho fraco de fora não.
dist = np.max(np.abs(im - bg), axis=2)
body = ndimage.binary_closing(dist > 80, iterations=3)
inside = ndimage.binary_fill_holes(body)
inside = ndimage.binary_opening(inside, iterations=2)  # tira fiapos soltos
lab, n = ndimage.label(inside)
if n > 1:  # fica só a maior peça (o emblema)
    sizes = ndimage.sum(inside, lab, range(1, n + 1))
    inside = lab == (1 + int(np.argmax(sizes)))
frac = inside.mean()
if frac < 0.3:
    sys.exit(f'emblema não fechou (interior = {frac:.0%} da imagem); confira a logo')

# recorte limpo na borda do emblema, com 1 px de suavização. O fundo da imagem não é liso (tem vinheta e
# ruído), então "cor para alfa" fora do emblema virava um halo pontilhado; o brilho neon é posto no vídeo.
a = np.clip(ndimage.gaussian_filter(inside.astype(np.float32), 0.8) * 1.15, 0, 1)
rgba = np.dstack([im, a * 255]).round().astype(np.uint8)

# recorta a sobra transparente (margem de 8 px)
ys, xs = np.where(rgba[..., 3] > 8)
y0, y1, x0, x1 = max(0, ys.min() - 8), min(h, ys.max() + 9), max(0, xs.min() - 8), min(w, xs.max() + 9)
logo = Image.fromarray(rgba[y0:y1, x0:x1], 'RGBA')
logo.save(out / 'logo.png', optimize=True)

prev = Image.new('RGB', (logo.width * 2 + 30, logo.height + 20), (255, 255, 255))
dark = Image.new('RGB', (logo.width + 10, logo.height + 20), (240, 140, 60))  # céu do amanhecer
prev.paste(dark, (logo.width + 20, 0))
prev.paste(logo, (10, 10), logo)
prev.paste(logo, (logo.width + 25, 10), logo)
prev.thumbnail((1600, 1600))
prev.save(out / 'logo-previa.png')
print(f'fundo {bg.round().astype(int).tolist()}, emblema {frac:.0%} da imagem, logo.png {logo.width}x{logo.height}')
