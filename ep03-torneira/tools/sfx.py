#!/usr/bin/env python3
"""Efeitos sonoros + trilha do ep. 01 ("Para onde vai o cocô depois da descarga?").

Tudo é SINTETIZADO aqui (numpy/scipy), sem amostras externas. Gera audio/sfx.wav:
estéreo, 48 kHz, float32, 102,5 s, já com o ducking calculado a partir da narração.

Uso:  python3 tools/sfx.py [--out audio/sfx.wav] [--stems DIR] [--no-duck]

Níveis: os ganhos da lista de deixas são relativos a uma narração tratada em -16 LUFS
(é o que tools/mix.sh entrega antes da soma). Cada som é normalizado para que o seu
trecho mais forte (janela de 50 ms) fique em -20 dBFS RMS; o ganho da deixa soma a isso.
Ex.: ganho -10 -> trecho mais forte em -30 dBFS RMS (antes do ducking).

Barramentos (bus) e profundidade do ducking sob a voz:
  trilha  -10 dB  (pad escuro)        amb  -6 dB  (ambientes contínuos)
  sfx      -3 dB  (efeitos pontuais)  hero -1.5 dB (descarga e impactos principais)
Determinístico: cada deixa usa o gerador default_rng([SEED, índice da deixa]).
"""
import argparse
import os
import subprocess
import sys
import time

import numpy as np
from scipy import signal
from scipy.interpolate import PchipInterpolator
from scipy.io import wavfile

SR = 48000
DUR = 102.5
N = int(round(DUR * SR))
SEED = 20261125
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NARR = os.path.join(ROOT, 'audio', 'narracao.mp3')

DUCK_DB = {'trilha': 10.0, 'amb': 6.0, 'sfx': 3.0, 'hero': 1.5}
REVERBS = {  # nome: (RT60 s, corte do passa-baixas Hz, pré-atraso s)
    'room': (0.45, 5000, 0.004),   # banheiro azulejado
    'hall': (1.9, 2600, 0.018),    # túnel, galeria, estação
}


def C(t, d, tipo, g, pan=0.0, bus='sfx', fi=0.01, fo=0.05, rev=None, env=None, **p):
    """Uma deixa: início t (s globais), duração d (s), tipo (função de síntese), ganho g (dB).
    pan: -1..1 ou (início, fim) para panorâmica; rev: ('room'|'hall', envio em dB);
    env: [(t_rel, valor), ...] envelope extra; p: parâmetros da função de síntese."""
    return dict(t=t, d=d, tipo=tipo, g=g, pan=pan, bus=bus, fi=fi, fo=fo, rev=rev, env=env, p=p)


# =====================================================================================
# LISTA DE DEIXAS  (tempo global s, duração s, tipo, ganho dB, ...)
# =====================================================================================
TUNEL = dict(f0=140, f1=520, f2=85, bw=1.35, sub=0.55)           # troca com mergulho no escuro
ZOOM = dict(f0=650, f1=2000, f2=850, bw=0.95, sub=0.0)           # troca suave com dissolve

CUES = [
    # ---- trilha ------------------------------------------------------------------------
    C(0.00, 102.5, 'pad', -7, bus='trilha', fi=1.2, fo=0.8),

    # ---- CASA: banheiro (0–28) -----------------------------------------------------------
    C(0.00, 1.60, 'impacto', +1, bus='hero', fi=0.0, fo=0.35, rev=('hall', -12),
      f_hi=88, f_lo=41, decay=0.42, bright=2800, body=0.8),                  # título
    C(0.00, 28.40, 'room_tone', -22, bus='amb', fi=0.4, fo=1.2),
    C(4.95, 0.25, 'clique', -7, pan=0.15, rev=('room', -10)),             # botão
    C(5.05, 0.80, 'baque', -4, rev=('room', -9), f=82, decay=0.17, hollow=205, lpf=550),
    C(6.40, 4.90, 'gorgolejo', -7, rev=('room', -10), fi=0.3, fo=0.8,     # caixa descendo
      env=[(0, 0.5), (0.5, 1.0), (3.6, 0.85), (4.9, 0.3)],
      fmin=150, fmax=620, rate=32, agua=0.45, lp_f=1900),
    C(7.50, 8.20, 'agua_corrente', -6, rev=('room', -11), fi=0.6, fo=1.2,  # borda da bacia
      env=[(0, 0.25), (1.2, 0.45), (4.5, 1.0), (6.2, 0.7), (8.2, 0.2)],
      lo=260, hi=3600, bubbles=85, bfmin=380, bfmax=2100, lp_f=6500),
    C(15.40, 3.60, 'gorgolejo', -5, rev=('room', -10), fi=0.4, fo=0.15,   # sifão enchendo
      env=[(0, 0.3), (3.3, 1.0), (3.6, 0.9)], dens=[(0, 0.35), (3.6, 1.6)],
      fmin=110, fmax=460, rate=34, agua=0.5, lp_f=1800),
    C(18.90, 1.75, 'descarga_puxada', +1, bus='hero', fi=0.12, fo=0.18, rev=('room', -8)),
    C(20.40, 0.80, 'gluglu', -3, rev=('room', -9), fo=0.15),               # ar entrando
    C(21.50, 8.50, 'enchimento_caixa', -13, fi=1.2, fo=2.0, rev=('room', -12)),
    C(24.40, 3.50, 'gases_borbulho', -9, fi=0.3, fo=0.5),
    # ---- CASA: quintal / rua (28–37,75) ------------------------------------------------
    C(28.40, 9.30, 'agua_corrente', -9, bus='amb', fi=0.8, fo=0.5,         # cano enterrado
      lo=80, hi=900, bubbles=34, bfmin=140, bfmax=560, lp_f=430, rumble=0.6, flicker=0.25),
    C(32.60, 0.50, 'plop', -7, rev=('hall', -14)),
    # abertura: as três peças caem na água da bacia (respingos na tela em 0,18 / 0,40 / 0,60 s)
    C(0.17, 0.50, 'plop', -6, rev=('room', -16)),
    C(0.39, 0.50, 'plop', -8, rev=('room', -16)),
    C(0.59, 0.50, 'plop', -9, rev=('room', -16)),
    C(33.20, 4.00, 'carro', -7, fi=0.3, fo=0.4),
    # ---- trocas com mergulho no escuro --------------------------------------------------
    C(37.40, 0.85, 'whoosh', -5, rev=('hall', -12), peak=0.41, **TUNEL),
    C(43.37, 0.85, 'whoosh', -6, rev=('hall', -12), peak=0.41, **TUNEL),
    C(49.85, 0.85, 'whoosh', -5, rev=('hall', -12), peak=0.41, **TUNEL),
    C(86.41, 0.85, 'whoosh', -5, rev=('hall', -12), peak=0.41, **TUNEL),
    # ---- trocas suaves (zoom/dissolve) + mergulho na água nas entradas no micro ----------
    C(64.64, 0.90, 'whoosh', -10, pan=(-0.35, 0.35), peak=0.45, **ZOOM),
    C(67.55, 0.90, 'whoosh', -10, pan=(-0.35, 0.35), peak=0.45, **ZOOM),
    C(72.32, 0.90, 'whoosh', -10, pan=(-0.35, 0.35), peak=0.45, **ZOOM),
    C(70.10, 0.90, 'whoosh', -11, pan=(0.35, -0.35), peak=0.45, **ZOOM),
    C(74.22, 0.90, 'whoosh', -11, pan=(0.35, -0.35), peak=0.45, **ZOOM),
    C(65.00, 0.90, 'mergulho', -13),
    C(67.92, 0.90, 'mergulho', -11),
    C(72.69, 0.90, 'mergulho', -11),
    # ---- REDE (37,75–50,2) ---------------------------------------------------------------
    C(38.20, 1.60, 'subida', -7, rev=('hall', -10), fo=0.12),
    C(37.80, 5.95, 'agua_corrente', -7, bus='amb', fi=0.35, fo=0.5, rev=('hall', -10),
      lo=100, hi=1500, bubbles=52, bfmin=150, bfmax=800, lp_f=1100, rumble=0.8),
    C(43.70, 4.20, 'agua_corrente', -13, bus='amb', fi=0.5, fo=0.4, rev=('hall', -8),
      lo=90, hi=1200, bubbles=30, bfmin=130, bfmax=600, lp_f=900, rumble=0.9),
    C(43.90, 1.80, 'rumor_profundo', -5, fi=0.35, fo=0.5),
    C(47.76, 2.44, 'bombas', -4, rev=('hall', -11), fi=0.0, fo=0.22),
    C(48.00, 1.40, 'jato', -6, rev=('hall', -12), fi=0.15, fo=0.2),
    C(49.30, 0.95, 'queda_dagua', -5, rev=('hall', -10), fi=0.05, fo=0.25, bright=0.4),
    # ---- ETE A (50,2–65,04) -------------------------------------------------------------
    C(50.20, 14.90, 'ambiente_estacao', -13, bus='amb', fi=0.6, fo=0.6),
    C(54.50, 3.20, 'grade', -7, rev=('hall', -12), fi=0.05, fo=0.3),
    C(56.20, 0.80, 'cacamba', -5, pan=0.25, rev=('hall', -12)),
    C(57.20, 0.80, 'cacamba', -6, pan=0.25, rev=('hall', -12)),
    C(58.60, 2.20, 'areia', -9, fi=0.3, fo=0.4),
    C(61.00, 4.05, 'decantador', -8, fi=0.5, fo=0.35, rev=('hall', -14)),
    # ---- ETE B (65,04–86,76) ------------------------------------------------------------
    C(65.10, 2.85, 'bequer', -8, fi=0.05, fo=0.3),
    C(65.60, 1.20, 'vidro', -12, pan=0.2),
    C(67.95, 2.60, 'micro', -9, bus='amb', fi=0.3, fo=0.3, pops=False),
    C(70.50, 2.25, 'aeracao', -4, fi=0.2, fo=0.3, rev=('hall', -14)),
    C(72.72, 1.95, 'micro', -9, bus='amb', fi=0.3, fo=0.3, pops=True),
    C(74.62, 4.40, 'decantador', -11, bus='amb', fi=0.5, fo=0.4, motor=0.25),
    C(77.50, 1.50, 'vertedor', -8, fi=0.4, fo=0.3),
    C(79.40, 0.70, 'baque', -4, rev=('hall', -10), f=68, decay=0.2, hollow=150, lpf=450),
    C(79.40, 1.70, 'lodo', -6, fi=0.05, fo=0.2),
    C(81.10, 2.40, 'biodigestor', -6, fi=0.2, fo=0.4, rev=('hall', -10)),
    C(84.40, 2.35, 'gerador', -5, fi=0.0, fo=0.25, rev=('hall', -14)),
    C(84.50, 2.25, 'chama', -9, pan=-0.2, fi=0.0, fo=0.25),
    C(84.60, 1.10, 'zaps', -9, pan=0.2, rev=('hall', -12),
      zaps=[0.0, 0.24, 0.5, 0.74], clicks=[0.12, 0.37, 0.62, 0.88]),
    # ---- RIO (86,76–102,5) ---------------------------------------------------------------
    C(86.80, 2.40, 'queda_dagua', -6, fi=0.1, fo=0.6, bright=1.0),        # cascata limpa
    C(87.00, 3.65, 'rio', -12, bus='amb', fi=0.8, fo=0.25),
    C(87.30, 3.10, 'passaros', -15, bus='amb', fi=0.05, fo=0.3, rev=('hall', -16)),
    C(89.50, 0.80, 'negacao', -6),
    C(90.45, 0.80, 'mergulho', -9),
    C(90.50, 2.55, 'subaquatico', -11, bus='amb', fi=0.15, fo=0.2),
    C(91.20, 0.70, 'libelula', -8),
    C(92.95, 0.65, 'emersao', -10),
    C(92.90, 2.50, 'rio', -12, bus='amb', fi=0.25, fo=0.6),
    C(93.10, 2.10, 'passaros', -16, bus='amb', fi=0.05, fo=0.3, rev=('hall', -16)),
    C(93.45, 1.90, 'shimmer', -12, fi=0.3, fo=0.5, rev=('hall', -8)),
    # ---- revelação final -------------------------------------------------------------------
    C(95.80, 5.25, 'drone_tensao', -4, fi=1.2, fo=0.06),
    C(97.45, 2.60, 'impacto_escuro', 0, bus='hero', fi=0.0, fo=0.6, rev=('hall', -10)),
    C(97.70, 2.20, 'impacto', -4, bus='hero', fi=0.0, fo=0.5, rev=('hall', -11),
      f_hi=96, f_lo=44, decay=0.7, bright=3600, body=0.6, click=0.9),
    C(101.00, 1.50, 'final', +1, bus='hero', fi=0.0, fo=0.7, rev=('hall', -7)),
]

# =====================================================================================
# utilidades
# =====================================================================================

def sec(x):
    return int(round(x * SR))


def tt(n, sr=SR):
    return np.arange(n) / sr


def _filt(x, kind, f, order=2, sr=SR):
    sos = signal.butter(order, f, btype=kind, fs=sr, output='sos')
    return signal.sosfilt(sos, x, axis=-1)


def lp(x, f, order=2, sr=SR):
    return _filt(x, 'lowpass', min(f, sr * 0.45), order, sr)


def hp(x, f, order=2, sr=SR):
    return _filt(x, 'highpass', f, order, sr)


def bp(x, lo, hi, order=2, sr=SR):
    return _filt(x, 'bandpass', [lo, min(hi, sr * 0.45)], order, sr)


def peak_filter(x, f, q):
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def unit_rms(x):
    r = np.sqrt(np.mean(np.square(x)))
    return x / r if r > 0 else x


def unit_peak(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


def smoothstep(u):
    u = np.clip(u, 0.0, 1.0)
    return u * u * (3 - 2 * u)


def envpts(n, pts):
    pts = sorted(pts)
    return np.interp(tt(n), [p[0] for p in pts], [p[1] for p in pts])


def fades(x, fi, fo):
    n = x.shape[-1]
    g = np.ones(n)
    a, b = min(sec(fi), n), min(sec(fo), n)
    if a > 1:
        g[:a] = np.sin(0.5 * np.pi * np.linspace(0, 1, a)) ** 2
    if b > 1:
        g[n - b:] *= np.cos(0.5 * np.pi * np.linspace(0, 1, b)) ** 2
    return x * g


def colored(n, rng, alpha=1.0):
    """Ruído com espectro 1/f^alpha (0 branco, 1 rosa, 2 marrom), RMS 1."""
    X = np.fft.rfft(rng.standard_normal(n))
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1]
    X *= f ** (-alpha / 2)
    return unit_rms(np.fft.irfft(X, n))


def wobble(n, rng, rate, lo=0.0, hi=1.0):
    """Modulação aleatória suave (pontos aleatórios a `rate` Hz, interpolação monotônica)."""
    dur = n / SR
    k = max(int(dur * rate) + 4, 4)
    xs = np.linspace(-1.0 / rate, dur + 1.0 / rate, k)
    y = PchipInterpolator(xs, rng.random(k))(tt(n))
    return lo + (hi - lo) * np.clip(y, 0, 1)


def shaped_noise(n, rng, gain_fn, nper=2048):
    """Ruído branco esculpido no domínio STFT: gain_fn(t[1,T], f[F,1]) -> ganho (F,T)."""
    hop = nper // 4
    x = rng.standard_normal(n + nper)
    f, ts, Z = signal.stft(x, fs=SR, nperseg=nper, noverlap=nper - hop)
    G = gain_fn(ts[None, :], np.maximum(f[:, None], 1.0))
    _, y = signal.istft(Z * G, fs=SR, nperseg=nper, noverlap=nper - hop)
    y = y[:n]
    return np.pad(y, (0, n - len(y)))


def mono_to_st(x, pan=0.0):
    th = (np.clip(pan, -1, 1) + 1) * np.pi / 4
    return np.vstack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)


def add_at(out, x, i):
    """Soma x (mono ou estéreo) em out a partir da amostra i, recortando nas bordas."""
    n = out.shape[-1]
    if i >= n:
        return
    j0 = max(0, -i)
    i = max(i, 0)
    L = min(x.shape[-1] - j0, n - i)
    if L > 0:
        out[..., i:i + L] += x[..., j0:j0 + L]


def damped(n, freqs, decays, amps, t0=0.0, attack=0.0008):
    """Soma de senoides amortecidas (ressonâncias de objetos: plástico, metal, vidro)."""
    t = tt(n) - t0
    on = t >= 0
    tp = np.where(on, t, 0)
    y = np.zeros(n)
    for f, d, a in zip(freqs, decays, amps):
        y += a * np.exp(-tp / d) * np.sin(2 * np.pi * f * tp)
    return y * on * np.minimum(tp / attack, 1.0)


def saw_add(freq, n, fc, rng, sr=SR, fmax=None):
    """Dente de serra por síntese aditiva (sem aliasing) com passa-baixas suave em fc.
    freq e fc podem ser escalares ou vetores (glissando / filtro variando)."""
    fmax = fmax or sr * 0.4
    freq = np.broadcast_to(np.asarray(freq, float), (n,))
    fc = np.broadcast_to(np.asarray(fc, float), (n,))
    ph = 2 * np.pi * np.cumsum(freq) / sr
    K = int(fmax / max(freq.min(), 20.0))
    y = np.zeros(n)
    for k in range(1, K + 1):
        hk = k * freq
        w = (1.0 / k) / (1.0 + (hk / fc) ** 4) * (hk < fmax)
        if np.max(w) < 1e-4:
            break
        y += w * np.sin(k * ph + rng.uniform(0, 2 * np.pi))
    return y


# ---- bolhas (modelo de van den Doel: senoide amortecida com frequência subindo) -------

def bubble(f0, xi=0.1, dmul=1.0, maxdur=1.0):
    d = (0.043 * f0 + 0.0014 * f0 ** 1.5) * dmul
    L = max(int(min(5.0 / d, maxdur) * SR), 32)
    t = np.arange(L) / SR
    f = f0 * (1.0 + xi * d * t)
    a = np.exp(-d * t)
    att = int(0.0015 * SR)
    a[:att] *= np.sin(0.5 * np.pi * np.linspace(0, 1, att)) ** 2
    return a * np.sin(2 * np.pi * np.cumsum(f) / SR)


def place_bubbles(out, times, freqs, amps, pans, xis, dmul=1.0):
    for t0, f, a, p, xi in zip(times, freqs, amps, pans, xis):
        add_at(out, mono_to_st(a * bubble(f, xi, dmul), p), int(t0 * SR))


def bubble_field(n, rng, rate, fmin, fmax, width=0.7, amp=0.3, xi=(0.05, 0.2), dmul=1.0,
                 dens=None, size_exp=0.35, amp_sigma=0.5):
    """Processo de Poisson de bolhas (estéreo). dens = [(t, mult)] modula a densidade."""
    dur = n / SR
    dmax = max(v for _, v in dens) if dens else 1.0
    cnt = rng.poisson(rate * dur * dmax)
    times = rng.uniform(0, dur, cnt)
    if dens:
        keep = rng.random(cnt) < np.interp(times, [a for a, _ in dens], [b for _, b in dens]) / dmax
        times = times[keep]
    m = len(times)
    freqs = np.exp(rng.uniform(np.log(fmin), np.log(fmax), m))
    amps = amp * np.exp(rng.normal(0, amp_sigma, m)) * (fmin / freqs) ** size_exp
    out = np.zeros((2, n))
    place_bubbles(out, times, freqs, amps, rng.uniform(-width, width, m), rng.uniform(*xi, m), dmul)
    return out


# =====================================================================================
# funções de síntese (n amostras, rng) -> mono (n,) ou estéreo (2, n)
# =====================================================================================

def impacto(n, rng, f_hi=80, f_lo=40, decay=0.6, bright=3000, body=0.7, click=0.6, sat=1.6, sweep=0.09):
    """Impacto grave: sub com queda de altura + corpo de ruído grave + transiente."""
    t = tt(n)
    f = f_lo + (f_hi - f_lo) * np.exp(-t / sweep)
    a = np.exp(-t / decay) * np.minimum(t / 0.003, 1)
    sub = np.tanh(sat * np.sin(2 * np.pi * np.cumsum(f) / SR)) / np.tanh(sat) * a
    nz = rng.standard_normal(n)
    corpo = unit_peak(lp(nz, 320) * np.exp(-t / 0.11))
    trans = unit_peak(lp(hp(nz, 200), bright) * np.exp(-t / 0.012))
    return sub + body * 0.5 * corpo + click * 0.45 * trans


def impacto_escuro(n, rng):
    """Esgoto bruto chegando ao rio: baque escuro e lamacento com rumor."""
    t = tt(n)
    x = impacto(n, rng, f_hi=62, f_lo=31, decay=1.2, bright=650, body=1.0, click=0.35, sweep=0.14)
    lama = unit_peak(lp(rng.standard_normal(n), 900) * np.exp(-t / 0.45) * np.minimum(t / 0.02, 1))
    g = gorgolejo(n, rng, fmin=70, fmax=260, rate=30, agua=0.2, lp_f=900).mean(0)
    rum = unit_peak(lp(colored(n, rng, 2), 110)) * np.exp(-t / 1.1)
    return x + 0.35 * lama + 0.6 * unit_peak(g) * np.exp(-t / 0.8) + 0.4 * rum


def acorde(n, rng, freqs=(73.42, 110.0, 146.83, 174.61, 220.0, 329.63), fc0=1300, fc1=330, tau=1.6):
    """Acorde escuro (dentes de serra aditivos com filtro que fecha)."""
    t = tt(n)
    fc = fc1 + (fc0 - fc1) * np.exp(-t / 0.45)
    env = np.minimum(t / 0.03, 1) * np.exp(-t / tau)
    out = np.zeros((2, n))
    for i, f in enumerate(freqs):
        for ch, det in ((0, 0.997), (1, 1.003)):
            out[ch] += saw_add(f * det, n, fc, rng, fmax=4000) / (1 + 0.15 * i)
    return out * env


def final(n, rng):
    """Cartela final: impacto de resolução + acorde de ré menor (add9) com cauda."""
    imp = mono_to_st(impacto(n, rng, f_hi=78, f_lo=36.7, decay=1.0, bright=2200, body=0.7, click=0.5))
    return imp + 0.55 * unit_peak(acorde(n, rng))


def clique(n, rng):
    """Botão de descarga: clique plástico (descida) + clique menor (fim de curso)."""
    t = tt(n)
    x = damped(n, [1850, 3100, 4600], [0.004, 0.003, 0.002], [1, 0.55, 0.25])
    x += 0.5 * damped(n, [1250, 2300], [0.005, 0.003], [1, 0.5], t0=0.032)
    x += 0.35 * unit_peak(bp(rng.standard_normal(n), 900, 5000)) * np.exp(-t / 0.0015)
    x += 0.3 * damped(n, [210], [0.02], [1])   # corpo da tampa
    return lp(x, 7000)


def baque(n, rng, f=90, decay=0.16, hollow=230, lpf=600, knock=0.4):
    """Baque surdo (válvula, bomba): senoide grave + ressonância oca + ruído abafado."""
    t = tt(n)
    ff = f * (1 + 0.3 * np.exp(-t / 0.02))
    low = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t / decay) * np.minimum(t / 0.002, 1)
    hol = damped(n, [hollow, hollow * 1.93], [decay * 0.6, decay * 0.3], [0.5, 0.2])
    nz = unit_peak(lp(rng.standard_normal(n), lpf) * np.exp(-t / 0.03))
    return low + hol + knock * nz


def agua_corrente(n, rng, lo=200, hi=3000, bubbles=80, bfmin=350, bfmax=2200, flicker=0.35,
                  noise=0.6, lp_f=None, rumble=0.0, width=0.8):
    """Água corrente: faixa de ruído turbulento + campo de bolhas (estéreo)."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        nz = unit_rms(bp(rng.standard_normal(n), lo, hi))
        out[ch] = 0.25 * noise * nz * (1 - flicker * wobble(n, rng, 14)) * wobble(n, rng, 0.7, 0.75, 1.0)
    out += bubble_field(n, rng, bubbles, bfmin, bfmax, width=width)
    if rumble:
        out += rumble * 0.15 * unit_rms(lp(colored(n, rng, 2), 120))
    if lp_f:
        out = lp(out, lp_f)
    return out


def gorgolejo(n, rng, fmin=120, fmax=500, rate=25, xi=0.2, dmul=1.0, agua=0.3, lp_f=2000,
              dens=None, width=0.4):
    """Gorgolejo: bolhas grandes em rajadas (cachos) + ruído de água abafado que acompanha."""
    dur = n / SR
    dmax = max(v for _, v in dens) if dens else 1.0
    cnt = rng.poisson(rate / 4.5 * dur * dmax)
    cs = rng.uniform(0, dur, cnt)
    if dens:
        cs = cs[rng.random(cnt) < np.interp(cs, [a for a, _ in dens], [b for _, b in dens]) / dmax]
    out = np.zeros((2, n))
    burst = np.zeros(n)
    for c in cs:
        k = rng.integers(3, 8)
        f = np.exp(rng.uniform(np.log(fmin), np.log(fmax)))
        tcur, pan = c, rng.uniform(-width, width)
        for _ in range(k):
            a = 0.35 * np.exp(rng.normal(0, 0.35)) * (fmin / f) ** 0.3
            add_at(out, mono_to_st(a * bubble(f, xi * rng.uniform(0.6, 1.6), dmul), pan), int(tcur * SR))
            i = int(tcur * SR)
            if i < n:
                burst[i] += a
            tcur += rng.uniform(0.022, 0.07)
            f *= rng.uniform(0.85, 1.2)
            f = np.clip(f, fmin * 0.8, fmax * 1.2)
    if agua:
        envb = signal.fftconvolve(burst, np.hanning(int(0.12 * SR)), mode='same')
        envb = envb / (np.max(envb) + 1e-9)
        for ch in (0, 1):
            out[ch] += agua * 0.3 * unit_rms(bp(rng.standard_normal(n), 150, 1400)) * (0.25 + envb)
    return lp(out, lp_f)


def descarga_puxada(n, rng):
    """A 'puxada' do sifão: ronco de sucção com ressonância descendo, golfadas e gorgolejo."""
    t = tt(n)
    dur = n / SR
    env = smoothstep(t / 0.35) * (1 - 0.75 * smoothstep((t - (dur - 0.4)) / 0.3))

    def g(ts, f):
        fc = 230 + 320 * np.exp(-ts / 1.1)
        base = (f / (f + 60)) / (1 + (f / 1400) ** 2)
        res = 2.3 * np.exp(-0.5 * (np.log2(f / fc) / 0.38) ** 2)
        return base + res
    roar = np.vstack([unit_rms(shaped_noise(n, rng, g)) for _ in range(2)])
    fam = 10 + 5 * wobble(n, rng, 3)
    am = 1 - 0.4 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(fam) / SR))
    gorg = gorgolejo(n, rng, fmin=80, fmax=340, rate=70, xi=0.25, agua=0.4, lp_f=2200, width=0.6)
    sub = unit_rms(lp(colored(n, rng, 2), 90))
    x = 0.32 * roar * am + 0.9 * gorg + 0.12 * sub
    return lp(x, 5000) * env


def gluglu(n, rng, rate=8.0, fmin=150, fmax=260):
    """Gluglu do ar entrando no sifão: golfadas graves periódicas."""
    out = np.zeros((2, n))
    t0, k = 0.02, 0
    while t0 < n / SR - 0.05:
        a = 0.8 * (1 - 0.6 * t0 / (n / SR)) * rng.uniform(0.7, 1.1)
        f = rng.uniform(fmin, fmax)
        b = bubble(f, xi=rng.uniform(0.35, 0.6), dmul=0.7)
        L = int(0.06 * SR)
        blip = lp(rng.standard_normal(L), 700) * np.hanning(L) * 0.15
        add_at(out, mono_to_st(a * b, rng.uniform(-0.2, 0.2)), int(t0 * SR))
        add_at(out, mono_to_st(a * blip, 0), int(t0 * SR))
        t0 += 1.0 / rate * rng.uniform(0.8, 1.25)
        k += 1
    return lp(out, 1600)


def enchimento_caixa(n, rng):
    """Caixa reenchendo: fio d'água fino + chiado da boia + ressonância da caixa subindo."""
    t = tt(n)
    out = bubble_field(n, rng, 70, 900, 2500, width=0.3, amp=0.12, xi=(0.05, 0.15))
    for ch in (0, 1):
        hiss = unit_rms(bp(rng.standard_normal(n), 1500, 4200)) * 0.03
        cav = np.zeros(n)
        nz = rng.standard_normal(n)
        for i0 in range(0, n, SR // 2):  # ressonância subindo aos poucos (blocos de 0,5 s com crossfade)
            L = min(SR, n - i0)
            f = 380 + 240 * (i0 / n)
            seg = peak_filter(nz[i0:i0 + L], f, 9) * np.hanning(L)
            cav[i0:i0 + L] += seg
        out[ch] += hiss + 0.05 * unit_rms(cav)
    return lp(out, 6000)


def gases_borbulho(n, rng):
    """Gases do esgoto batendo na barreira d'água: borbulho grave abafado e toques surdos."""
    dur = n / SR
    out = bubble_field(n, rng, 6, 70, 200, width=0.3, amp=0.5, xi=(0.2, 0.4), dmul=0.8)
    tc = 0.15
    while tc < dur - 0.2:
        a = rng.uniform(0.35, 0.6)
        L = int(0.3 * SR)
        add_at(out, mono_to_st(a * baque(L, rng, f=rng.uniform(58, 85), decay=0.07, hollow=140,
                                         lpf=250, knock=0.2), rng.uniform(-0.2, 0.2)), int(tc * SR))
        tc += rng.uniform(0.38, 0.62)
    out += 0.06 * unit_rms(lp(colored(n, rng, 2), 150))
    return lp(out, 650)


def plop(n, rng):
    """Pequeno 'plop' na caixa de inspeção."""
    t = tt(n)
    out = np.zeros(n)
    add_at(out, bubble(290, xi=0.5, dmul=0.8), 0)
    add_at(out, 0.4 * bubble(520, xi=0.4), int(0.045 * SR))
    out += 0.3 * unit_peak(lp(rng.standard_normal(n), 1800)) * np.exp(-t / 0.05)
    return lp(out, 1500)


def carro(n, rng, v=7.0, d0=4.5, f_motor=31.0):
    """Carro passando devagar na rua de cima: pneu + motor, Doppler leve, da esquerda p/ direita."""
    t = tt(n)
    tc = n / SR / 2
    x = v * (t - tc)
    dist = np.sqrt(d0 ** 2 + x ** 2)
    amp = (d0 / dist) ** 1.4
    pan = 0.85 * x / dist
    vr = -v * x / dist
    pneu = unit_rms(bp(rng.standard_normal(n), 170, 1500)) + 0.6 * unit_rms(lp(colored(n, rng, 2), 300))
    pneu *= wobble(n, rng, 6, 0.8, 1.0)
    fm = f_motor * (1 + vr / 343.0) * (1 + 0.02 * wobble(n, rng, 0.8))
    ph = 2 * np.pi * np.cumsum(fm) / SR
    motor = sum((1 / k ** 0.8) * np.sin(k * ph + rng.uniform(0, 6.3)) for k in range(1, 9))
    mono = lp(0.6 * unit_rms(pneu) + 0.35 * unit_rms(lp(motor, 400)), 2200) * amp
    th = (pan + 1) * np.pi / 4
    return np.vstack([mono * np.cos(th), mono * np.sin(th)]) * np.sqrt(2)


def whoosh(n, rng, f0=300, f1=1200, f2=200, peak=0.45, bw=1.2, sub=0.0, curve=2.0):
    """Whoosh: banda de ruído cujo centro varre f0 -> f1 (no pico) -> f2, com envelope em sino."""
    dur = n / SR
    tp = peak * dur

    def g(ts, f):
        fc = np.where(ts < tp, f0 * (f1 / f0) ** np.clip(ts / tp, 0, 1),
                      f1 * (f2 / f1) ** np.clip((ts - tp) / (dur - tp), 0, 1))
        band = np.exp(-0.5 * (np.log2(f / fc) / bw) ** 2)
        amp = np.where(ts < tp, np.clip(ts / tp, 0, 1) ** curve, np.exp(-3.5 * np.clip((ts - tp) / (dur - tp), 0, 1)))
        return band * amp / (1 + (f / 6000) ** 2)
    out = np.vstack([unit_peak(shaped_noise(n, rng, g, nper=1024)) for _ in range(2)])
    out = 0.7 * out + 0.3 * out[::-1]  # estéreo parcialmente correlacionado
    if sub:
        t = tt(n)
        fs = 45 + 45 * np.exp(-np.clip(t - tp + 0.1, 0, None) / 0.15)
        s = np.sin(2 * np.pi * np.cumsum(fs) / SR) * np.exp(-0.5 * ((t - tp) / 0.11) ** 2)
        out += sub * s
    return out


def mergulho(n, rng):
    """Mergulho leve na água: respingo que se fecha rápido em grave + bolhas."""
    t = tt(n)

    def g(ts, f):
        fc = 2600 * np.exp(-ts / 0.08) + 300
        amp = np.minimum(ts / 0.012, 1) * np.exp(-ts / 0.16)
        return amp * (f / (f + 150)) / (1 + (f / fc) ** 4)
    spl = unit_peak(shaped_noise(n, rng, g, nper=512))
    out = mono_to_st(0.8 * spl)
    out += bubble_field(n, rng, 70, 250, 1100, width=0.6, amp=0.4,
                        dens=[(0, 1.0), (0.2, 0.4), (0.5, 0.1), (n / SR, 0.0)])
    out += 0.3 * mono_to_st(np.sin(2 * np.pi * 75 * t) * np.exp(-t / 0.08) * np.minimum(t / 0.005, 1))
    return out


def emersao(n, rng):
    """Saindo de debaixo d'água: abafado que abre + gotas."""
    t = tt(n)

    def g(ts, f):
        fc = 400 + 3200 * smoothstep(ts / 0.25)
        amp = smoothstep(ts / 0.2) * np.exp(-np.clip(ts - 0.2, 0, None) / 0.1)
        return amp * (f / (f + 200)) / (1 + (f / fc) ** 4)
    out = mono_to_st(0.8 * unit_peak(shaped_noise(n, rng, g, nper=512)))
    for tg, f in ((0.3, 1150), (0.42, 900), (0.55, 1350)):
        add_at(out, mono_to_st(0.25 * bubble(f, 0.35), rng.uniform(-0.4, 0.4)), int(tg * SR))
    return lp(out, 6500)


def subida(n, rng):
    """O bairro se levanta: riser mecânico/ar (varredura subindo + tom hidráulico)."""
    t = tt(n)
    dur = n / SR

    def g(ts, f):
        fc = 180 * (1500 / 180) ** np.clip(ts / dur, 0, 1)
        return np.exp(-0.5 * (np.log2(f / fc) / 1.0) ** 2) * np.clip(ts / dur, 0, 1) ** 1.5
    ar = np.vstack([unit_peak(shaped_noise(n, rng, g)) for _ in range(2)])
    f = 45 * (75 / 45) ** (t / dur)
    tom = unit_peak(saw_add(f, n, 300, rng, fmax=900)) * (t / dur) ** 1.2
    whine = 0.08 * np.sin(2 * np.pi * np.cumsum(280 * (480 / 280) ** (t / dur)) / SR) * (t / dur)
    return 0.8 * ar + mono_to_st(0.45 * tom + whine)


def rumor_profundo(n, rng):
    """Rumor grave de profundidade (o cano ficando fundo)."""
    t = tt(n)
    dur = n / SR
    sw = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.7
    f = 42 - 6 * t / dur
    ph = 2 * np.pi * np.cumsum(f) / SR
    tom = np.sin(ph) + 0.4 * np.sin(1.5 * ph) + 0.25 * np.sin(2 * ph)
    out = np.vstack([unit_rms(lp(colored(n, rng, 2), 110)) for _ in range(2)]) * 0.5
    return np.tanh(1.3 * (out + 0.7 * tom)) * sw


def motor_eletrico(n, rng, f_rot=29.6, spin=0.6, delay=0.0, slots=28):
    """Motor elétrico partindo: zumbido de 120 Hz ao energizar + harmônicos de rotação subindo."""
    t = tt(n) - delay
    on = (t > 0).astype(float)
    u = np.clip(t / spin, 0, 1)
    fr = f_rot * (1 - (1 - u) ** 2)
    ph = 2 * np.pi * np.cumsum(fr) / SR
    rot = sum((1.0 / k) * np.sin(k * ph + rng.uniform(0, 6.3)) for k in range(1, 7))
    whine = 0.05 * np.sin(slots * ph) * (fr / f_rot)
    tp = np.where(t > 0, t, 0)
    hum = (0.5 * np.sin(2 * np.pi * 120 * tp) + 0.15 * np.sin(2 * np.pi * 240 * tp)
           + 0.05 * np.sin(2 * np.pi * 360 * tp)) * np.minimum(tp / 0.02, 1)
    fan = 0.25 * unit_rms(bp(rng.standard_normal(n), 400, 2500)) * (fr / f_rot) ** 2
    return (0.35 * rot * (fr / f_rot) + hum + whine + fan) * on


def bombas(n, rng):
    """Relé + partida de duas bombas elétricas + zumbido de motor contínuo."""
    t = tt(n)
    rele = damped(n, [2900, 4300, 1300], [0.003, 0.002, 0.006], [0.6, 0.3, 0.5])
    rele += 0.6 * baque(n, rng, f=150, decay=0.04, hollow=420, lpf=900, knock=0.3)
    rele += 0.4 * damped(n, [2500, 3700], [0.002, 0.002], [1, 0.4], t0=0.011)
    m1 = motor_eletrico(n, rng, 29.6, 0.6, 0.05)
    m2 = motor_eletrico(n, rng, 29.85, 0.6, 0.20)
    flow = unit_rms(lp(rng.standard_normal(n), 600)) * 0.25 * smoothstep((t - 0.4) / 0.6)
    out = np.vstack([0.9 * m1 + 0.5 * m2, 0.5 * m1 + 0.9 * m2]) * 0.55 + flow
    out += mono_to_st(0.9 * unit_peak(rele), 0.1)
    return lp(out, 3500)


def jato(n, rng):
    """Jato de recalque: água sob pressão subindo pelo tubo."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        nz = rng.standard_normal(n)
        x = unit_rms(bp(nz, 300, 2500)) * (1 - 0.3 * wobble(n, rng, 20))
        x += 0.15 * unit_rms(bp(nz, 2000, 5000))
        x += 0.6 * unit_rms(peak_filter(nz, 180, 6)) + 0.4 * unit_rms(peak_filter(nz, 410, 8))
        out[ch] = x
    return lp(out, 5000)


def queda_dagua(n, rng, bright=0.5):
    """Queda d'água / cascata: ruído largo + bolhas densas + ronco grave."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        out[ch] = 0.35 * unit_rms(bp(colored(n, rng, 0.6), 120, 3000 + 5000 * bright))
        out[ch] += 0.25 * unit_rms(lp(colored(n, rng, 2), 200))
    out += bubble_field(n, rng, 300, 220, 900 + 900 * bright, width=0.8, amp=0.25)
    return lp(out, 4500 + 3000 * bright)


def vento(n, rng):
    """Vento leve externo (estéreo descorrelacionado, rajadas lentas)."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        base = colored(n, rng, 1.6)
        rajada = wobble(n, rng, 0.25, 0.3, 1.0)
        mix = wobble(n, rng, 0.2)
        out[ch] = (unit_rms(lp(base, 300)) * (1 - mix) + 0.6 * unit_rms(bp(base, 400, 1100)) * mix) * rajada
    return hp(out, 60)


def maquinas_distantes(n, rng):
    """Zumbido distante de máquinas (harmônicos de 60 Hz) + rumor grave."""
    t = tt(n)
    out = np.zeros((2, n))
    for ch, det in ((0, 1.0), (1, 1.0035)):
        h = sum(a * np.sin(2 * np.pi * f * det * t + rng.uniform(0, 6.3))
                for f, a in ((60, 0.3), (120, 1.0), (180, 0.4), (240, 0.25), (300, 0.1)))
        out[ch] = lp(h, 500) * wobble(n, rng, 0.3, 0.7, 1.0) + 0.6 * unit_rms(lp(colored(n, rng, 2), 200))
    return out


def ambiente_estacao(n, rng):
    """Ambiente externo da estação: vento + máquinas ao longe."""
    return 0.7 * vento(n, rng) + 0.3 * unit_rms(maquinas_distantes(n, rng))


def clank(n, rng, f0=380, amp=1.0):
    """Batida metálica (parciais inarmônicas) com um baque grave por baixo."""
    r = rng.uniform(0.97, 1.03)
    x = damped(n, [f0 * r, f0 * 2.32 * r, f0 * 4.25 * r, f0 * 6.63 * r],
               [0.11, 0.07, 0.04, 0.025], [1, 0.6, 0.35, 0.2])
    t = tt(n)
    nz = rng.standard_normal(n)
    x += 0.5 * unit_peak(lp(nz, 220)) * np.exp(-t / 0.04)
    x += 0.35 * unit_peak(bp(nz, 900, 4000)) * np.exp(-t / 0.006)  # estalo do elo da corrente
    return amp * x


def grade(n, rng, period=0.7):
    """Grade mecanizada: corrente e engrenagens, clanks rítmicos a cada ~0,7 s."""
    dur = n / SR
    out = np.zeros((2, n))
    tc = 0.05
    while tc < dur - 0.1:
        L = int(0.5 * SR)
        add_at(out, mono_to_st(clank(L, rng, rng.uniform(330, 420), rng.uniform(0.75, 1.0)), rng.uniform(-0.3, 0.3)),
               int(tc * SR))
        tc += period + rng.uniform(-0.03, 0.03)
    # chocalhar da corrente entre as batidas
    t = tt(n)
    cyc = 0.35 + 0.65 * (0.5 + 0.5 * np.cos(2 * np.pi * t / period))
    cnt = rng.poisson(55 * dur)
    for t0 in rng.uniform(0, dur, cnt):
        L = int(0.015 * SR)
        ping = damped(L, [rng.uniform(1500, 3800)], [0.003], [1]) * 0.12
        add_at(out, mono_to_st(ping * cyc[min(int(t0 * SR), n - 1)], rng.uniform(-0.5, 0.5)), int(t0 * SR))
    eng = 0.08 * np.sin(2 * np.pi * 220 * t) * (0.6 + 0.4 * np.sin(2 * np.pi * t * 4.3))
    eng += 0.25 * unit_rms(lp(colored(n, rng, 2), 90))
    return lp(out + mono_to_st(eng), 5500)


def cacamba(n, rng):
    """Lixo caindo na caçamba metálica: baque + ressonância da caçamba + detritos."""
    t = tt(n)
    x = baque(n, rng, f=70, decay=0.22, hollow=160, lpf=500, knock=0.6)
    x += damped(n, [150, 395, 720], [0.35, 0.2, 0.1], [0.4, 0.25, 0.12])
    for t0 in np.sort(rng.uniform(0.04, 0.35, 5)):
        L = int(0.1 * SR)
        add_at(x, 0.25 * baque(L, rng, f=rng.uniform(200, 380), decay=0.025, hollow=700, lpf=1500, knock=0.6),
               int(t0 * SR))
    x += 0.2 * unit_peak(bp(rng.standard_normal(n), 800, 3000)) * np.exp(-t / 0.12)
    return lp(x, 5000)


def areia(n, rng):
    """Água lenta + chiado fino de areia assentando (grãos)."""
    out = agua_corrente(n, rng, lo=150, hi=1500, bubbles=14, bfmin=200, bfmax=700, flicker=0.2, lp_f=2000)
    imp = np.zeros(n)
    idx = rng.integers(0, n, int(380 * n / SR))
    imp[idx] = rng.random(len(idx))
    graos = signal.fftconvolve(imp, np.hanning(int(0.004 * SR)), mode='same')
    for ch in (0, 1):
        ch_n = unit_rms(bp(rng.standard_normal(n), 2500, 6500)) * graos
        out[ch] += 0.05 * unit_rms(ch_n)
    return out


def decantador(n, rng, motor=1.0):
    """Decantador: água marulhando + motor lento da ponte girando."""
    t = tt(n)
    out = np.zeros((2, n))
    for ch in (0, 1):
        lap = (0.5 + 0.5 * np.sin(2 * np.pi * 0.55 * t + rng.uniform(0, 6.3) + 2 * wobble(n, rng, 0.4))) ** 1.5
        out[ch] = 0.3 * unit_rms(lp(rng.standard_normal(n), 520)) * (0.3 + lap)
    out += bubble_field(n, rng, 9, 200, 700, width=0.8, amp=0.2)
    if motor:
        h = sum(a * np.sin(2 * np.pi * f * t) for f, a in ((50, 0.5), (100, 1.0), (150, 0.3), (200, 0.15)))
        roda = unit_rms(lp(colored(n, rng, 2), 150)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.4 * t))
        tic = np.zeros(n)
        for t0 in np.arange(0.3, n / SR, 0.8):
            add_at(tic, damped(int(0.05 * SR), [390, 760], [0.015, 0.008], [1, 0.4]), int(t0 * SR))
        out += motor * mono_to_st(0.12 * h + 0.3 * roda + 0.15 * tic, -0.2)
    return out


def bequer(n, rng):
    """Béquer: água sendo coletada (derramar) e gotas no fim."""
    t = tt(n)
    out = np.zeros((2, n))
    for k, (fa, fb) in enumerate(((650, 1700), (800, 2100), (950, 2500))):  # sobe conforme enche
        seg = bubble_field(int(0.45 * SR), rng, 230, fa, fb, width=0.25, amp=0.22, xi=(0.05, 0.15))
        add_at(out, seg, int(k * 0.45 * SR))
    stream = unit_rms(bp(rng.standard_normal(n), 900, 4500)) * 0.05 * fades(np.ones(n) * (t < 1.35), 0.05, 0.0)
    out += stream
    for tg, f in ((1.6, 1180), (2.0, 1040), (2.45, 1260)):
        add_at(out, mono_to_st(0.45 * bubble(f, 0.35), rng.uniform(-0.2, 0.2)), int(tg * SR))
    return lp(out, 6500)


def vidro(n, rng):
    """Tilintar de vidro (curto, sem agudos estridentes)."""
    x = damped(n, [1780, 2690, 4410, 5920], [0.5, 0.35, 0.2, 0.12], [1, 0.5, 0.3, 0.12])
    x += 0.35 * damped(n, [1780, 2690, 4410], [0.4, 0.3, 0.15], [1, 0.5, 0.25], t0=0.075)
    return lp(x, 6500)


def subaquatico(n, rng, bolhas=5):
    """Ambiente subaquático abafado: ruído grave lento + pressão + bolhas graves."""
    t = tt(n)
    out = np.zeros((2, n))
    for ch in (0, 1):
        out[ch] = unit_rms(lp(colored(n, rng, 2), 280)) * wobble(n, rng, 0.6, 0.6, 1.0)
    out += 0.25 * mono_to_st(np.sin(2 * np.pi * 55 * t) * wobble(n, rng, 0.5, 0.5, 1.0))
    out += bubble_field(n, rng, bolhas, 150, 500, width=0.7, amp=0.4)
    return lp(out, 700)


def micro(n, rng, pops=False):
    """Mundo microscópico: subaquático + estalos orgânicos; pops=True: 'pops' úmidos (bactérias)."""
    out = 0.6 * subaquatico(n, rng, bolhas=6)
    dur = n / SR
    for t0 in rng.uniform(0, dur, rng.poisson(9 * dur)):
        L = int(0.03 * SR)
        s = damped(L, [rng.uniform(700, 1600)], [0.004], [1]) * rng.uniform(0.05, 0.15)
        add_at(out, mono_to_st(s, rng.uniform(-0.7, 0.7)), int(t0 * SR))
    if pops:
        for t0 in rng.uniform(0.1, dur - 0.1, rng.poisson(6 * dur)):
            b = bubble(rng.uniform(300, 850), xi=0.6, dmul=2.0) * rng.uniform(0.25, 0.45)
            add_at(out, mono_to_st(b, rng.uniform(-0.6, 0.6)), int(t0 * SR))
    return lp(out, 2600)


def aeracao(n, rng):
    """Aeração: sopradores (ronco largo, tom de pás) + borbulhamento intenso."""
    t = tt(n)
    out = np.zeros((2, n))
    for ch in (0, 1):
        rugido = unit_rms(lp(colored(n, rng, 1.0), 900))
        pas = sum((1 / k) * np.sin(2 * np.pi * 145 * k * (1 + 0.002 * ch) * t + rng.uniform(0, 6.3)) for k in range(1, 5))
        out[ch] = 0.35 * rugido + 0.12 * pas * wobble(n, rng, 2, 0.7, 1.0) + 0.3 * unit_rms(lp(colored(n, rng, 2), 80))
        out[ch] += 0.2 * unit_rms(bp(rng.standard_normal(n), 300, 2500)) * wobble(n, rng, 25, 0.4, 1.0)
    out += bubble_field(n, rng, 520, 150, 1000, width=0.9, amp=0.22)
    return lp(out, 5000)


def vertedor(n, rng):
    """Água vertendo pelo vertedor: cachoeirinha fina."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        out[ch] = 0.12 * unit_rms(bp(rng.standard_normal(n), 600, 5000))
    out += bubble_field(n, rng, 200, 600, 2400, width=0.6, amp=0.14)
    return lp(out, 6500)


def lodo(n, rng):
    """Lodo sendo bombeado: gorgolejo grosso pulsado pela bomba."""
    t = tt(n)
    g = gorgolejo(n, rng, fmin=60, fmax=220, rate=34, xi=0.3, dmul=1.6, agua=0.55, lp_f=1200, width=0.5)
    pulso = 0.6 + 0.4 * np.clip(np.sin(2 * np.pi * 1.7 * t), 0, 1)
    tum = np.zeros(n)
    for t0 in np.arange(0.05, n / SR, 1 / 1.7):
        add_at(tum, 0.4 * baque(int(0.2 * SR), rng, f=58, decay=0.06, hollow=120, lpf=250, knock=0.2), int(t0 * SR))
    return g * pulso + mono_to_st(tum)


def biodigestor(n, rng):
    """Biodigestor: gorgolejo grave + trens de bolhas de gás subindo, dentro de tanque fechado."""
    dur = n / SR
    out = gorgolejo(n, rng, fmin=60, fmax=180, rate=10, xi=0.3, agua=0.3, lp_f=1200, width=0.5)
    for c in rng.uniform(0, dur - 0.5, rng.poisson(2.6 * dur)):
        k = rng.integers(4, 8)
        f = rng.uniform(140, 200)
        p = rng.uniform(-0.5, 0.5)
        for j in range(k):
            add_at(out, mono_to_st(0.25 * bubble(f, 0.2), p), int((c + j * 0.065) * SR))
            f *= 1.17
    nz = rng.standard_normal(n)
    out += 0.08 * mono_to_st(unit_rms(peak_filter(nz, 110, 10)))
    return lp(out, 1200)


def gerador(n, rng, rpm=1800, cil=6):
    """Motor-gerador a combustão: partida, pega e ronco grave contínuo."""
    t = tt(n)
    dur = n / SR
    out = np.zeros(n)
    # motor de arranque: compressões a ~5 Hz e chiado do arranque
    for t0 in np.arange(0.0, 0.45, 0.2):
        add_at(out, 0.5 * baque(int(0.15 * SR), rng, f=75, decay=0.05, hollow=160, lpf=500, knock=0.4), int(t0 * SR))
    arr = 0.08 * np.sin(2 * np.pi * np.cumsum(300 + 50 * smoothstep(t / 0.4)) / SR) * (t < 0.5)
    # combustões: frequência de ignição sobe com overshoot e assenta
    f_ign_ok = rpm / 60 * cil / 2
    tc = 0.45
    k = 0
    pattern = rng.uniform(0.8, 1.15, cil)
    while tc < dur:
        u = (tc - 0.45) / 0.6
        fi = 25 + (f_ign_ok * 1.08 - 25) * smoothstep(u) - f_ign_ok * 0.08 * smoothstep((tc - 1.0) / 0.5)
        L = int(0.03 * SR)
        g = damped(L, [rng.uniform(100, 120), 260], [0.006, 0.003], [1, 0.3])
        g += 0.4 * lp(rng.standard_normal(L), 1000) * np.exp(-tt(L) / 0.003)
        add_at(out, pattern[k % cil] * g * (0.8 if tc < 0.7 else 1.0), int(tc * SR))
        tc += (1 / fi) * rng.uniform(0.97, 1.03)
        k += 1
    rons = unit_rms(lp(colored(n, rng, 2), 120)) * 0.15 * (t > 0.45)
    mec = 0.06 * unit_rms(bp(rng.standard_normal(n), 1000, 3000)) * (t > 0.45)
    x = lp(np.tanh(1.5 * (unit_peak(out) + rons)) + arr + mec, 2500)
    return mono_to_st(x, -0.1)


def chama(n, rng):
    """Chama do queimador acendendo (whoosh de gás) e queimando."""
    t = tt(n)

    def g(ts, f):
        fc = 300 + 1500 * smoothstep(ts / 0.12)
        ign = np.exp(-0.5 * (np.log2(f / fc) / 1.0) ** 2) * np.minimum(ts / 0.03, 1) * np.exp(-ts / 0.25)
        return 1.2 * ign + 0.35 * smoothstep(ts / 0.2) / (1 + (f / 700) ** 2)
    out = np.vstack([unit_peak(shaped_noise(n, rng, g, nper=1024)) for _ in range(2)])
    out *= wobble(n, rng, 8, 0.55, 1.0)
    for t0 in rng.uniform(0.2, n / SR, rng.poisson(6 * n / SR)):
        L = int(0.01 * SR)
        c = damped(L, [rng.uniform(1000, 2800)], [0.002], [1]) * rng.uniform(0.05, 0.15)
        add_at(out, mono_to_st(c, rng.uniform(-0.5, 0.5)), int(t0 * SR))
    return lp(out, 5000)


def zaps(n, rng, zaps=(0.0,), clicks=()):
    """Pulsos elétricos (zaps curtos) e cliques de luzes acendendo."""
    out = np.zeros(n)
    for z in zaps:
        L = int(rng.uniform(0.07, 0.11) * SR)
        tz = tt(L)
        buzz = np.sign(np.sin(2 * np.pi * 120 * tz)) * 0.5 + unit_rms(bp(rng.standard_normal(L), 900, 3500)) * 0.4
        env = np.minimum(tz / 0.002, 1) * np.exp(-tz / 0.035)
        add_at(out, lp(buzz * env, 3800), int(z * SR))
    for c in clicks:
        L = int(0.12 * SR)
        add_at(out, 0.6 * baque(L, rng, f=180, decay=0.02, hollow=900, lpf=1200, knock=0.5)
               + 0.3 * damped(L, [1250], [0.004], [1]), int(c * SR))
        tl = tt(n) - c - 0.01  # luz: zumbido baixinho de reator
        out += 0.03 * np.sin(2 * np.pi * 120 * np.clip(tl, 0, None)) * smoothstep(tl / 0.1) * (tl > 0)
    return out


def rio(n, rng):
    """Ambiente de rio: água correndo calma + marulho."""
    t = tt(n)
    out = agua_corrente(n, rng, lo=150, hi=2500, bubbles=34, bfmin=300, bfmax=1300, flicker=0.3, lp_f=5000)
    lap = 0.5 + 0.5 * np.sin(2 * np.pi * 0.45 * t)
    for ch in (0, 1):
        out[ch] += 0.08 * unit_rms(lp(rng.standard_normal(n), 450)) * lap
    return out


def passaros(n, rng, rate=0.9):
    """Pássaros simples e discretos (sílabas com FM, sem estridência)."""
    dur = n / SR
    out = np.zeros((2, n))
    tc = rng.uniform(0.1, 0.5)
    while tc < dur - 0.4:
        p = rng.uniform(-0.7, 0.7)
        a = rng.uniform(0.4, 1.0)
        fc = rng.uniform(2400, 3600)
        tipo = rng.integers(0, 3)
        ts = tc
        for _ in range(rng.integers(2, 5)):
            L = int(rng.uniform(0.05, 0.11) * SR)
            u = np.linspace(0, 1, L)
            if tipo == 0:
                f = fc * (1.25 - 0.35 * u)
            elif tipo == 1:
                f = fc * (0.85 + 0.3 * u)
            else:
                f = fc * (1 + 0.06 * np.sin(2 * np.pi * 28 * u * L / SR))
            s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.hanning(L)
            s += 0.12 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.hanning(L)
            add_at(out, mono_to_st(a * s, p), int(ts * SR))
            ts += L / SR + rng.uniform(0.03, 0.08)
        tc = ts + rng.exponential(1 / rate)
    return lp(out, 5000)


def negacao(n, rng):
    """'Negação' suave: baque abafado + tom grave curto descendo."""
    t = tt(n)
    x = 0.8 * baque(n, rng, f=72, decay=0.12, hollow=180, lpf=300, knock=0.3)
    f = 110 - 12 * smoothstep((t - 0.05) / 0.3)
    tom = lp(saw_add(f, n, 500, rng, fmax=1500), 700)
    env = np.minimum(np.clip(t - 0.02, 0, None) / 0.015, 1) * np.exp(-np.clip(t - 0.02, 0, None) / 0.22)
    return x + 0.6 * unit_peak(tom) * env


def libelula(n, rng):
    """Zumbido rápido de libélula passando (asas a ~35 Hz), meio abafado."""
    t = tt(n)
    dur = n / SR
    bell = np.exp(-0.5 * ((t - dur / 2) / (dur / 5)) ** 2)
    fw = 35 * (1 + 0.06 * np.tanh((dur / 2 - t) * 6))
    ph = 2 * np.pi * np.cumsum(fw) / SR
    asas = sum((1 / k ** 0.7) * np.sin(k * ph) for k in range(1, 16))
    am = 0.5 + 0.5 * np.sin(ph)
    x = lp(0.6 * asas + 0.5 * unit_rms(bp(rng.standard_normal(n), 200, 1200)) * am, 1600) * bell
    pan = np.clip((t - dur / 2) / (dur / 2), -1, 1) * 0.8
    th = (pan + 1) * np.pi / 4
    return np.vstack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)


def shimmer(n, rng):
    """Brilho sutil (linha luminosa): parciais suaves com tremolo lento + ar fino varrendo."""
    t = tt(n)
    dur = n / SR
    out = np.zeros((2, n))
    for f, a in ((587.3, 1.0), (880.0, 0.8), (1174.7, 0.6), (1318.5, 0.4), (1760.0, 0.3)):
        for ch, det in ((0, 0.9985), (1, 1.0015)):
            out[ch] += a * np.sin(2 * np.pi * f * det * t + rng.uniform(0, 6.3)) * wobble(n, rng, 3, 0.2, 1.0)

    def g(ts, f):
        fc = 1500 * (3500 / 1500) ** np.clip(ts / dur, 0, 1)
        return np.exp(-0.5 * (np.log2(f / fc) / 0.6) ** 2)
    ar = unit_peak(shaped_noise(n, rng, g))
    pan = np.linspace(-0.6, 0.6, n)
    th = (pan + 1) * np.pi / 4
    out = unit_peak(out) + 0.25 * np.vstack([ar * np.cos(th), ar * np.sin(th)]) * np.sqrt(2)
    return lp(out, 5500)


def drone_tensao(n, rng):
    """Tensão: drone grave que cresce (ré + mi bemol roçando) e pulso lento."""
    t = tt(n)
    dur = n / SR
    u = t / dur
    grow = u ** 1.6
    out = np.zeros((2, n))
    fc = 150 + 450 * u ** 1.5
    for ch, det in ((0, 0.998), (1, 1.002)):
        x = np.sin(2 * np.pi * 36.71 * t) * (0.6 + 0.4 * grow)
        x += 0.6 * unit_peak(saw_add(73.42 * det, n, fc, rng, fmax=1200)) * (0.3 + 0.7 * grow)
        x += 0.35 * unit_peak(saw_add(77.78 * det, n, fc, rng, fmax=1200)) * u ** 2
        out[ch] = x
    out += 0.4 * np.vstack([unit_rms(lp(colored(n, rng, 2), 120)) for _ in range(2)]) * grow
    pulse = 1 - 0.18 * (0.5 + 0.5 * np.sin(2 * np.pi * np.cumsum(1.2 + 1.2 * u) / SR))
    return np.tanh(0.9 * out * pulse) * (0.15 + 0.85 * grow)


def room_tone(n, rng):
    """Room tone suave de banheiro (ar, ventilação distante)."""
    t = tt(n)
    out = np.vstack([unit_rms(hp(lp(colored(n, rng, 1.0), 1500), 70)) for _ in range(2)])
    out *= wobble(n, rng, 0.2, 0.85, 1.0)
    return out + 0.08 * np.sin(2 * np.pi * 120 * t)


# ---- trilha: pad escuro ----------------------------------------------------------------
# acordes (sub, voz1, voz2, voz3) em Hz, trocando nas viradas de cenário com glissando lento
PAD_CHORDS = [
    (0.00, (36.71, 73.42, 110.00, 174.61)),     # Rém    (casa)
    (37.75, (58.27, 87.31, 116.54, 146.83)),    # Si b   (rede)
    (50.20, (49.00, 98.00, 146.83, 233.08)),    # Sol m  (ETE A)
    (65.04, (43.65, 87.31, 130.81, 220.00)),    # Fá     (ETE B)
    (86.76, (36.71, 73.42, 110.00, 164.81)),    # Ré m(add9) aberto (rio)
    (95.80, (36.71, 73.42, 110.00, 155.56)),    # Ré + Mi b: tensão
    (101.0, (36.71, 73.42, 110.00, 174.61)),    # Ré m resolução
]
PAD_CUTOFF = [(0, 380), (37.75, 420), (50.2, 400), (65.04, 450), (86.76, 480),
              (95.8, 420), (100.9, 170), (101.0, 520), (102.5, 300)]
PAD_LEVEL = [(0, 1.0), (95.8, 1.0), (100.9, 0.55), (101.05, 1.0), (102.5, 0.8)]


def pad(n, rng, sr_int=12000):
    """Pad grave e escuro, sem melodia: 3 vozes de dente de serra (3 cópias desafinadas)
    + sub senoidal + 'ar' de ruído grave. Sintetizado a 12 kHz e reamostrado."""
    up = SR // sr_int
    m = n // up + 1
    t = np.arange(m) / sr_int
    glide = 1.6
    fc = np.interp(t, [a for a, _ in PAD_CUTOFF], [b for _, b in PAD_CUTOFF])
    fc = fc * (1 + 0.18 * np.sin(2 * np.pi * 0.047 * t))
    out = np.zeros((2, m))
    for v in range(4):
        xs, ys = [], []
        for i, (tc, ch) in enumerate(PAD_CHORDS):
            if i == 0:
                xs.append(0.0)
            else:
                xs.append(tc - glide / 2)
                ys.append(PAD_CHORDS[i - 1][1][v])
                xs.append(tc + glide / 2 if tc < 100 else tc + 0.05)
            ys.append(ch[v])
        f = np.interp(t, xs, ys)
        if v == 0:
            s = np.sin(2 * np.pi * np.cumsum(f) / sr_int)
            out += 0.55 * s
            continue
        for k, (det, pan) in enumerate(((0.9965, -0.8), (1.0, 0.0), (1.0035, 0.8))):
            fv = f * det * (1 + 0.0015 * np.sin(2 * np.pi * (0.07 + 0.03 * k + 0.02 * v) * t))
            s = saw_add(fv, m, fc, rng, sr=sr_int, fmax=1800) / (1 + 0.25 * v)
            th = (pan + 1) * np.pi / 4
            out[0] += s * np.cos(th) * 0.5
            out[1] += s * np.sin(th) * 0.5
    nz = np.vstack([lp(np.cumsum(rng.standard_normal(m)) * 0.01, 260, sr=sr_int) for _ in range(2)])
    nz = hp(nz, 40, sr=sr_int)
    out += 0.12 * nz / (np.std(nz) + 1e-9) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.031 * t))
    out *= np.interp(t, [a for a, _ in PAD_LEVEL], [b for _, b in PAD_LEVEL])
    y = signal.resample_poly(out, up, 1, axis=1)[:, :n]
    return np.pad(y, ((0, 0), (0, n - y.shape[1])))


SYNTHS = {name: fn for name, fn in globals().items() if callable(fn) and name in {
    'impacto', 'impacto_escuro', 'final', 'clique', 'baque', 'agua_corrente', 'gorgolejo',
    'descarga_puxada', 'gluglu', 'enchimento_caixa', 'gases_borbulho', 'plop', 'carro', 'whoosh',
    'mergulho', 'emersao', 'subida', 'rumor_profundo', 'bombas', 'jato', 'queda_dagua',
    'ambiente_estacao', 'grade', 'cacamba', 'areia', 'decantador', 'bequer', 'vidro', 'micro',
    'aeracao', 'vertedor', 'lodo', 'biodigestor', 'gerador', 'chama', 'zaps', 'rio', 'passaros',
    'negacao', 'subaquatico', 'libelula', 'shimmer', 'drone_tensao', 'room_tone', 'pad'}}


# =====================================================================================
# renderização
# =====================================================================================

def loudest_rms(x, win=0.05):
    st = np.atleast_2d(x)
    p = np.mean(np.square(st), axis=0)
    w = sec(win)
    if len(p) < w:
        return np.sqrt(np.mean(p))
    c = np.cumsum(np.concatenate([[0], p]))
    return np.sqrt(np.max((c[w:] - c[:-w]) / w))


def make_ir(rt60, lpf, pre, rng):
    L = int((rt60 * 1.2 + pre) * SR)
    t = tt(L)
    ir = np.zeros((2, L))
    for ch in (0, 1):
        nz = rng.standard_normal(L) * np.exp(-6.9 * t / rt60)
        nz = lp(nz, lpf) * 0.6 + lp(nz, lpf / 3) * 0.4  # cauda mais escura
        nz[:sec(pre)] = 0
        ir[ch] = nz
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def voice_activity():
    """Envelope 0..1 de atividade da voz, com antecipação de 60 ms, ataque 40 ms, soltura 350 ms."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', NARR, '-ac', '1', '-ar', str(SR),
                          '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.float32).astype(float)
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    v = hp(v, 100)
    hop = SR // 100
    fr = v[:N // hop * hop].reshape(-1, hop)
    db = 20 * np.log10(np.sqrt(np.mean(fr ** 2, axis=1)) + 1e-9)
    a = np.clip((db + 50) / 14, 0, 1)
    a = np.concatenate([a[6:], np.zeros(6)])  # antecipa 60 ms
    out = np.zeros_like(a)
    g, hold = 0.0, 0
    ca, cr = 1 - np.exp(-1 / 4.0), 1 - np.exp(-1 / 35.0)
    for i, x in enumerate(a):
        if x >= g:
            g += (x - g) * ca
            hold = 15
        elif hold > 0:
            hold -= 1
        else:
            g += (x - g) * cr
        out[i] = g
    return np.interp(np.arange(N), np.arange(len(out)) * hop + hop / 2, out)


def render(duck=True, stems=None, verbose=True):
    t_start = time.time()
    buses = {b: np.zeros((2, N)) for b in DUCK_DB}
    sends = {k: np.zeros(N) for k in REVERBS}
    for i, c in enumerate(CUES):
        rng = np.random.default_rng([SEED, i])
        n = min(sec(c['d']), N - sec(c['t']))
        t0 = time.time()
        y = np.asarray(SYNTHS[c['tipo']](n, rng, **c['p']), float)
        if c['env']:
            y = y * envpts(n, c['env'])
        y = fades(y, c['fi'], c['fo'])
        y = y * (0.1 / (loudest_rms(y) + 1e-12)) * 10 ** (c['g'] / 20)
        pan = c['pan']
        p = np.linspace(pan[0], pan[1], n) if isinstance(pan, tuple) else np.full(n, float(pan))
        th = (p + 1) * np.pi / 4
        if y.ndim == 1:
            st = np.vstack([y * np.cos(th), y * np.sin(th)]) * np.sqrt(2)
        else:
            st = np.vstack([y[0] * np.cos(th), y[1] * np.sin(th)]) * np.sqrt(2)
        s = sec(c['t'])
        buses[c['bus']][:, s:s + n] += st
        if c['rev']:
            sends[c['rev'][0]][s:s + n] += st.mean(0) * 10 ** (c['rev'][1] / 20)
        if verbose:
            print(f"  {c['t']:7.2f}s {c['d']:5.2f}s {c['tipo']:<17} {c['bus']:<6} g={c['g']:+4.0f} dB "
                  f"pico={20*np.log10(np.max(np.abs(st))+1e-12):6.1f} dBFS  ({time.time()-t0:.2f}s)")
    rng = np.random.default_rng([SEED, 9999])
    for k, (rt, lpf, pre) in REVERBS.items():
        ir = make_ir(rt, lpf, pre, rng)
        wet = np.vstack([signal.oaconvolve(sends[k], ir[ch])[:N] for ch in (0, 1)])
        buses['sfx'] += wet
    act = voice_activity() if duck else np.zeros(N)
    mix = np.zeros((2, N))
    for b, x in buses.items():
        g = 10 ** (-DUCK_DB[b] * act / 20)
        buses[b] = x * g
        mix += buses[b]
    mix = lp(hp(mix, 28, order=2), 11000, order=2)
    if stems:
        os.makedirs(stems, exist_ok=True)
        for b, x in buses.items():
            wavfile.write(os.path.join(stems, f'{b}.wav'), SR, x.T.astype(np.float32))
    if verbose:
        print(f'  síntese total: {time.time()-t_start:.1f} s; pico do sfx: {20*np.log10(np.max(np.abs(mix))):.1f} dBFS')
    return mix


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--out', default=os.path.join(ROOT, 'audio', 'sfx.wav'))
    ap.add_argument('--stems', default=None, help='grava também os barramentos (trilha/amb/sfx/hero)')
    ap.add_argument('--no-duck', action='store_true')
    ap.add_argument('-q', '--quiet', action='store_true')
    a = ap.parse_args()
    mix = render(duck=not a.no_duck, stems=a.stems, verbose=not a.quiet)
    pk = np.max(np.abs(mix))
    if pk > 0.89:  # nunca clipar o intermediário (-1 dBFS)
        mix *= 0.89 / pk
        print(f'  atenção: sfx reduzido {20*np.log10(0.89/pk):.1f} dB para não clipar', file=sys.stderr)
    wavfile.write(a.out, SR, mix.T.astype(np.float32))
    print(f'  -> {a.out} ({N/SR:.2f} s, estéreo, {SR} Hz, float32)')


if __name__ == '__main__':
    main()
