#!/usr/bin/env python3
"""Efeitos sonoros + trilha do ep. 02 ("Por que as cidades alagam mesmo tendo bueiros?").

Reaproveita a biblioteca de síntese do ep. 01 (tools/sfx.py: filtros, bolhas, água corrente, bombas,
queda d'água, impactos, pad, ducking sob a voz) e acrescenta os sons novos deste episódio:
chuva (fraca/forte), trovão, enxurrada, motor diesel de obra (com hidráulico e ré), escavação/despejo de terra,
vibração de rolo/placa, batidas de obra, plástico/lixo, rebobinar e gotejar.
Tudo sintetizado (numpy/scipy), determinístico. Gera audio/sfx.wav (estéreo, 48 kHz, float32, DUR s).

Uso:  python3 tools/sfx_ep02.py [-q]      (tools/mix.sh chama este arquivo)
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as S  # noqa: E402
from sfx import (C, SR, bp, lp, hp, unit_rms, unit_peak, colored, wobble, tt, damped, bubble_field,  # noqa: E402
                 mono_to_st, smoothstep, envpts, sec, peak_filter)

DUR = 116.6
S.DUR = DUR
S.N = int(round(DUR * SR))
S.SEED = 20261126


# =====================================================================================
# sons novos
# =====================================================================================

def _ticks(n, rng, rate, lo, hi, amp=1.0, dec=(0.002, 0.008)):
    """Gotas: impulsos curtos filtrados em posições aleatórias (estéreo)."""
    out = np.zeros((2, n))
    k = rng.poisson(rate * n / SR)
    idx = rng.integers(0, max(1, n - 800), k)
    for ch in (0, 1):
        x = np.zeros(n)
        x[idx] = rng.uniform(0.2, 1.0, k) * rng.choice([-1, 1], k)
        sel = rng.random(k) < (0.5 + 0.3 * (ch - 0.5))  # um pouco de espalhamento estéreo
        x[idx[~sel]] *= 0.4
        d = rng.uniform(*dec)
        ir = np.exp(-np.arange(int(SR * d * 6)) / (SR * d))
        out[ch] = bp(np.convolve(x, ir)[:n], lo, hi)
    return unit_rms(out) * amp


def chuva(n, rng, forte=0.0):
    """Chuva: chiado largo com respiração lenta + milhares de gotas finas + batida grave nos telhados."""
    out = np.zeros((2, n))
    for ch in (0, 1):
        nz = colored(n, rng, 0.35)
        out[ch] = unit_rms(bp(nz, 700 + 300 * forte, 9000)) * (0.75 + 0.25 * wobble(n, rng, 0.25))
    out = 0.55 * out + 0.45 * _ticks(n, rng, 900 + 2600 * forte, 1500, 8000, dec=(0.0008, 0.002))
    out += (0.25 + 0.35 * forte) * _ticks(n, rng, 160 + 500 * forte, 250, 1800, dec=(0.003, 0.012))
    if forte > 0:
        for ch in (0, 1):
            out[ch] += forte * 0.5 * unit_rms(lp(colored(n, rng, 1.8), 260)) * wobble(n, rng, 0.15, 0.6, 1.0)
    return hp(out, 90)


def trovao(n, rng, dist=0.5):
    """Trovão: estalo (ruído brilhante curto) seguido de ribombo grave que rola e se apaga."""
    t = tt(n)
    out = np.zeros((2, n))
    crack_t = 0.02 + 0.25 * dist
    for ch in (0, 1):
        nz = rng.standard_normal(n)
        crack = unit_rms(bp(nz, 900, 6000)) * np.exp(-np.clip(t - crack_t, 0, None) / (0.08 + 0.1 * dist)) * (t > crack_t)
        rum = np.zeros(n)
        for k in range(5):  # várias "rolagens"
            t0 = crack_t + 0.08 + k * rng.uniform(0.25, 0.6)
            rum += rng.uniform(0.5, 1.0) * np.exp(-np.clip(t - t0, 0, None) / rng.uniform(0.6, 1.4)) * smoothstep((t - t0) / 0.15)
        rumble = unit_rms(lp(colored(n, rng, 2.0), 140 + 120 * (1 - dist))) * rum
        out[ch] = (1 - dist) * 0.9 * crack + rumble
    return lp(out, 7000 - 4000 * dist)


def enxurrada(n, rng, forca=1.0):
    """Enxurrada na rua: água rasa e rápida (largo e borbulhante) + turbulência grave + respingos."""
    out = S.agua_corrente(n, rng, lo=180, hi=5000, bubbles=int(90 + 140 * forca), bfmin=300, bfmax=2600, flicker=0.45, lp_f=8000)
    for ch in (0, 1):
        out[ch] += 0.35 * forca * unit_rms(lp(colored(n, rng, 1.5), 380)) * wobble(n, rng, 1.2, 0.6, 1.0)
    out += 0.25 * _ticks(n, rng, 120 * forca, 600, 4000, dec=(0.002, 0.006))
    return out


def diesel(n, rng, rpm=900, cil=6, hid=0.0, re=0.0, accel=None):
    """Motor diesel de máquina de obra: trem de explosões (ronco), turbo/hidráulico opcional, bipe de ré."""
    t = tt(n)
    f = rpm / 60 * cil / 2
    if accel:  # [(t_rel, mult)] acelerações
        f = f * envpts(n, accel)
    f = f * (1 + 0.015 * wobble(n, rng, 2.0, -1, 1))
    ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, (n,))) / SR
    pulses = np.maximum(0, np.sin(ph)) ** 6
    body = lp(pulses + 0.4 * np.sin(ph / 2), 520)
    clatter = unit_rms(bp(rng.standard_normal(n), 900, 3200)) * (0.5 + 0.5 * pulses)
    mono = unit_rms(body) + 0.18 * clatter
    if hid > 0:  # bomba hidráulica gemendo
        fh = 410 * (1 + 0.25 * wobble(n, rng, 0.35))
        mono += hid * 0.35 * unit_rms(np.sin(2 * np.pi * np.cumsum(fh) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(fh) / SR))
    out = np.vstack([mono, mono * 0.92]) + 0.12 * np.vstack([unit_rms(lp(colored(n, rng, 2), 120)) for _ in range(2)])
    if re > 0:  # bipe de ré (1 kHz, 0,5 s liga/desliga)
        beep = np.sin(2 * np.pi * 1050 * t) * (np.mod(t, 1.0) < 0.5)
        out += re * 0.25 * mono_to_st(beep, 0.2)
    return lp(out, 4200)


def escavacao(n, rng, golpes=(0.2,), despejos=()):
    """Escavadeira: caçamba raspando o solo (ruído grosso + pedras) e despejos de terra (chiado + baques)."""
    t = tt(n)
    out = np.zeros((2, n))
    for g in golpes:
        e = np.exp(-np.clip(t - g, 0, None) / 0.5) * smoothstep((t - g) / 0.08)
        for ch in (0, 1):
            out[ch] += e * (unit_rms(bp(colored(n, rng, 1.2), 150, 2200)) + 0.5 * _ticks(n, rng, 60, 400, 3000)[ch])
    for d in despejos:
        e = smoothstep((t - d) / 0.05) * np.exp(-np.clip(t - d, 0, None) / 0.9)
        for ch in (0, 1):
            out[ch] += 0.9 * e * unit_rms(lp(colored(n, rng, 1.0), 1800))
        out += 0.7 * mono_to_st(S.baque(n, rng, f=70, decay=0.25, hollow=160, lpf=500) * (t >= d), 0)
    return lp(out, 5000)


def vibro(n, rng, f=38.0):
    """Rolo compactador / placa vibratória: zumbido grave pulsante + motor."""
    t = tt(n)
    v = np.sin(2 * np.pi * f * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 3.1 * t)) + 0.4 * np.sin(4 * np.pi * f * t)
    out = mono_to_st(unit_rms(lp(v, 300)), 0) + 0.6 * diesel(n, rng, rpm=1500, cil=4)
    return out


def obra(n, rng, batidas=8, f0=520):
    """Batidas de obra: marteladas e encaixes metálicos/concreto espaçados."""
    out = np.zeros((2, n))
    for k in range(batidas):
        t0 = (k + rng.uniform(0.1, 0.7)) * n / SR / batidas
        i = sec(t0)
        m = n - i
        if m <= 100:
            continue
        hit = S.clank(m, rng, f0=f0 * rng.uniform(0.8, 1.25), amp=1.0) if rng.random() < 0.6 else S.baque(m, rng, f=110, decay=0.06, hollow=380, lpf=1400)
        hit = np.asarray(hit)
        hit = hit if hit.ndim == 1 else hit.mean(0)
        out[:, i:] += mono_to_st(hit, rng.uniform(-0.5, 0.5))
    return out


def plastico(n, rng):
    """Lixo arrastado: plástico amassando, garrafa PET batendo, lata."""
    out = 0.8 * _ticks(n, rng, 260, 2000, 9000, dec=(0.0006, 0.0015))
    for ch in (0, 1):
        out[ch] *= wobble(n, rng, 3.0, 0.2, 1.0)
    t = tt(n)
    for t0 in rng.uniform(0.1, n / SR - 0.3, 3):
        out += 0.5 * mono_to_st(damped(n, [880, 1650, 2470], [0.04, 0.03, 0.02], [1, 0.6, 0.4], t0=t0), rng.uniform(-0.4, 0.4))
    return out


def rebobinar(n, rng):
    """Rebobinar o tempo: whoosh descendente + chiado de fita acelerando ao contrário."""
    w = S.whoosh(n, rng, f0=4000, f1=900, f2=140, peak=0.25, bw=1.1, sub=0.3)
    t = tt(n)
    fs = 300 + 2200 * (1 - t / (n / SR))
    war = np.sin(2 * np.pi * np.cumsum(fs) / SR) * 0.15 * (1 - smoothstep(t / (n / SR)))
    return w + mono_to_st(war, 0)


def gotejar(n, rng, rate=6):
    """Gotas pingando (depois da chuva / infiltrando)."""
    out = np.zeros((2, n))
    k = rng.poisson(rate * n / SR)
    for t0 in rng.uniform(0, max(0.01, n / SR - 0.2), k):
        out += 0.6 * mono_to_st(damped(n, [rng.uniform(900, 2200)], [0.025], [1], t0=t0), rng.uniform(-0.6, 0.6))
    return out


for fn in (S.acorde, S.motor_eletrico, chuva, trovao, enxurrada, diesel, escavacao, vibro, obra, plastico, rebobinar, gotejar):
    S.SYNTHS[fn.__name__] = fn

ZOOM = dict(f0=650, f1=2000, f2=850, bw=0.95, sub=0.0)

# =====================================================================================
# LISTA DE DEIXAS  (tempo global s, duração s, tipo, ganho dB, ...) — mesmos tempos da tela (hydro.js)
# =====================================================================================
S.CUES = [
    # ---- trilha ------------------------------------------------------------------------
    C(0.00, DUR, 'pad', -8, bus='trilha', fi=1.0, fo=1.2),

    # ---- GANCHO (0–5,6): tempestade, enxurrada, grelha afogada ---------------------------
    C(0.00, 1.60, 'impacto', +1, bus='hero', fi=0.0, fo=0.35, rev=('hall', -12), f_hi=86, f_lo=40, decay=0.42, bright=2600, body=0.8),
    C(0.00, 6.40, 'chuva', -6, bus='amb', fi=0.02, fo=0.9, forte=1.0),
    C(0.00, 6.20, 'enxurrada', -8, bus='amb', fi=0.02, fo=0.8, forca=1.0),
    C(0.10, 5.50, 'gorgolejo', -11, fi=0.05, fo=0.6, fmin=90, fmax=380, rate=40, agua=0.6, lp_f=1500),
    C(0.30, 4.50, 'trovao', -2, bus='hero', fi=0.0, fo=1.0, dist=0.25),
    C(3.60, 3.20, 'trovao', -7, fi=0.0, fo=1.0, dist=0.7),
    # ---- REBOBINAR (5,6–9,6) --------------------------------------------------------------
    C(5.55, 4.10, 'rebobinar', -4, fi=0.1, fo=0.5, rev=('hall', -14)),
    # ---- TERRENO NATURAL (9,9–17) ------------------------------------------------------------
    C(9.40, 2.20, 'passaros', -17, bus='amb', fi=0.3, fo=0.8),
    C(9.85, 7.40, 'chuva', -12, bus='amb', fi=0.6, fo=0.6, forte=0.0),
    C(12.10, 4.80, 'gotejar', -15, fi=0.3, fo=0.4, rate=7),
    C(14.20, 3.20, 'agua_corrente', -13, bus='amb', fi=0.5, fo=0.6, lo=200, hi=3000, bubbles=40, bfmin=400, bfmax=1600, lp_f=5000),
    C(14.50, 3.00, 'rio', -16, bus='amb', fi=0.6, fo=0.6),
    # ---- CONSTRUÇÃO (17,4–22,4) --------------------------------------------------------------
    C(17.40, 1.60, 'escavacao', -12, golpes=(0.1, 0.7), despejos=(1.2,)),
    C(17.40, 5.10, 'diesel', -11, bus='amb', fi=0.4, fo=0.5, rpm=850, hid=0.5, accel=[(0, 1.0), (1.5, 1.25), (3.0, 1.0), (5.1, 1.2)]),
    C(18.30, 3.80, 'obra', -12, fi=0.05, fo=0.4, batidas=9, f0=560),
    C(18.40, 3.40, 'motor_eletrico', -16, fi=0.3, fo=0.4, f_rot=24.0, spin=0.3),
    C(20.60, 1.90, 'vibro', -11, fi=0.25, fo=0.3, f=36.0),
    C(21.00, 1.40, 'diesel', -14, fi=0.2, fo=0.3, rpm=700, re=1.0),
    # ---- IMPERMEABILIZAÇÃO + ENXURRADA (23–33,8) ----------------------------------------------
    C(22.95, 11.30, 'chuva', -11, bus='amb', fi=0.6, fo=0.6, forte=0.15),
    C(23.40, 4.00, 'gotejar', -16, fi=0.2, fo=0.5, rate=9),
    C(27.90, 6.20, 'enxurrada', -11, bus='amb', fi=1.2, fo=0.5, forca=0.6, env=[(0, 0.4), (3.0, 0.8), (6.2, 1.0)]),
    C(28.40, 5.30, 'jato', -18, fi=0.6, fo=0.4),
    # ---- BOCAS DE LOBO (34,3–36,9) -----------------------------------------------------------
    C(34.20, 2.90, 'obra', -10, fi=0.02, fo=0.3, batidas=5, f0=420),
    C(34.30, 2.60, 'diesel', -17, bus='amb', fi=0.3, fo=0.3, rpm=780),
    # ---- GALERIAS (37,1–40,1) ----------------------------------------------------------------
    C(37.00, 3.30, 'diesel', -12, bus='amb', fi=0.3, fo=0.4, rpm=900, hid=0.8),
    C(37.20, 3.10, 'obra', -9, fi=0.02, fo=0.3, batidas=6, f0=300),
    # ---- CANAL E RIO (40,6–44,8) ------------------------------------------------------------
    C(40.60, 2.40, 'obra', -12, fi=0.02, fo=0.3, batidas=4, f0=360),
    C(42.30, 0.60, 'clique', -10, rev=('hall', -14)),
    C(42.40, 3.00, 'agua_corrente', -12, bus='amb', fi=0.5, fo=0.6, rev=('hall', -10), lo=100, hi=1500, bubbles=40, bfmin=150, bfmax=800, lp_f=1100, rumble=0.7),
    C(43.20, 1.80, 'queda_dagua', -12, fi=0.3, fo=0.5, bright=0.6),
    # ---- CHUVA NORMAL → INTENSA → SOBRECARGA (45–54) -----------------------------------------
    C(45.20, 3.80, 'chuva', -11, bus='amb', fi=0.5, fo=0.3, forte=0.1),
    C(45.60, 3.20, 'agua_corrente', -13, bus='amb', fi=0.6, fo=0.4, rev=('hall', -10), lo=100, hi=1300, bubbles=30, bfmin=140, bfmax=700, lp_f=900, rumble=0.6),
    C(48.60, 23.40, 'chuva', -7, bus='amb', fi=1.0, fo=1.0, forte=1.0),
    C(49.00, 4.00, 'trovao', -2, bus='hero', fi=0.0, fo=1.2, dist=0.3),
    C(49.20, 22.00, 'enxurrada', -10, bus='amb', fi=2.0, fo=1.0, forca=1.0, env=[(0, 0.4), (4.0, 0.8), (22.0, 1.0)]),
    C(51.00, 3.20, 'rumor_profundo', -8, fi=0.6, fo=0.4),
    C(52.60, 18.60, 'gorgolejo', -12, fi=0.6, fo=0.8, fmin=90, fmax=380, rate=38, agua=0.6, lp_f=1500),
    # ---- LIXO (54,6–58,8) --------------------------------------------------------------------
    C(54.60, 3.40, 'plastico', -10, fi=0.2, fo=0.5),
    # ---- RIO CHEIO (59,3–65,4) ---------------------------------------------------------------
    C(59.30, 6.60, 'rio', -9, bus='amb', fi=0.8, fo=0.6),
    C(59.40, 3.60, 'trovao', -6, fi=0.0, fo=1.0, dist=0.6),
    C(61.40, 0.70, 'baque', -6, rev=('hall', -12), f=95, decay=0.12, hollow=320, lpf=900),
    C(62.30, 3.20, 'rumor_profundo', -9, fi=0.5, fo=0.5),
    # ---- ALAGAMENTO (66–71,2) ---------------------------------------------------------------
    C(65.90, 5.40, 'drone_tensao', -6, fi=0.8, fo=0.4),
    C(66.80, 3.60, 'trovao', -5, fi=0.0, fo=1.0, dist=0.45),
    # ---- PARA DE CHOVER, ÁGUA BAIXA (71,7–73,6) ------------------------------------------------
    C(71.80, 2.40, 'gotejar', -14, fi=0.2, fo=0.5, rate=8),
    # ---- PISCINÃO: obra (73,6–79,5) ------------------------------------------------------------
    C(73.50, 2.50, 'diesel', -9, bus='amb', fi=0.3, fo=0.4, rpm=900, hid=1.0, accel=[(0, 1.0), (0.8, 1.3), (1.6, 1.0), (2.5, 1.25)]),
    C(73.60, 2.30, 'escavacao', -8, golpes=(0.15, 0.95), despejos=(0.6, 1.5)),
    C(75.30, 1.50, 'diesel', -14, fi=0.2, fo=0.3, rpm=700, re=1.0),
    C(75.80, 1.90, 'obra', -10, fi=0.02, fo=0.3, batidas=7, f0=480),
    C(77.60, 1.00, 'obra', -12, fi=0.02, fo=0.2, batidas=3, f0=700),
    C(78.60, 1.10, 'shimmer', -12, fi=0.3, fo=0.4),
    C(77.70, 1.60, 'impacto', -9, fi=0.0, fo=0.5, rev=('hall', -12), f_hi=90, f_lo=50, decay=0.4, bright=3000, body=0.4, click=0.4),
    # ---- PISCINÃO: funcionando (79,9–87,4) ------------------------------------------------------
    C(79.90, 4.60, 'chuva', -10, bus='amb', fi=0.6, fo=0.6, forte=1.0),
    C(80.90, 3.50, 'queda_dagua', -6, fi=0.4, fo=0.6, rev=('hall', -14), bright=0.4),
    C(81.20, 3.20, 'enchimento_caixa', -14, fi=0.6, fo=0.4),
    C(84.30, 3.20, 'bombas', -7, fi=0.0, fo=0.4),
    C(84.60, 2.90, 'agua_corrente', -13, bus='amb', fi=0.4, fo=0.4, rev=('hall', -12), lo=100, hi=1200, bubbles=24, bfmin=140, bfmax=600, lp_f=900, rumble=0.5),
    # ---- AMPLIAÇÃO + JARDINS (87,9–91,7) ---------------------------------------------------------
    C(87.90, 1.80, 'obra', -11, fi=0.02, fo=0.3, batidas=5, f0=320),
    C(87.90, 1.80, 'diesel', -15, bus='amb', fi=0.2, fo=0.3, rpm=850, hid=0.6),
    C(88.00, 1.10, 'plastico', -16, fi=0.1, fo=0.3),
    C(89.60, 2.10, 'escavacao', -14, golpes=(0.1, 0.8), despejos=(1.4,)),
    C(90.60, 1.20, 'shimmer', -15, fi=0.2, fo=0.4),
    # ---- ÁREA VERDE + PAVIMENTO PERMEÁVEL (92–96,7) ----------------------------------------------
    C(92.00, 2.40, 'passaros', -14, bus='amb', fi=0.3, fo=0.5),
    C(92.20, 1.50, 'shimmer', -15, fi=0.3, fo=0.4),
    C(94.00, 2.70, 'vibro', -13, fi=0.25, fo=0.4, f=48.0),
    C(94.30, 2.30, 'obra', -16, fi=0.02, fo=0.3, batidas=8, f0=900),
    # ---- NOVA TEMPESTADE COM MELHORIAS (97,2–110,5) ------------------------------------------------
    C(97.20, 4.20, 'trovao', -2, bus='hero', fi=0.0, fo=1.2, dist=0.3),
    C(97.80, 14.50, 'chuva', -8, bus='amb', fi=0.6, fo=1.5, forte=1.0),
    C(98.60, 12.00, 'enxurrada', -15, bus='amb', fi=1.0, fo=1.0, forca=0.5),
    C(99.80, 2.00, 'gotejar', -13, fi=0.2, fo=0.4, rate=14),
    C(100.80, 4.00, 'queda_dagua', -10, fi=0.5, fo=0.6, rev=('hall', -14), bright=0.4),
    C(101.70, 3.00, 'agua_corrente', -13, bus='amb', fi=0.5, fo=0.5, rev=('hall', -12), lo=100, hi=1300, bubbles=28, bfmin=140, bfmax=700, lp_f=1000, rumble=0.6),
    C(103.70, 0.90, 'whoosh', -8, pan=(-0.35, 0.35), peak=0.45, **ZOOM),
    C(104.80, 1.60, 'shimmer', -10, fi=0.2, fo=0.5),
    # ---- SISTEMA COMPLETO (106,9–116,6) --------------------------------------------------------------
    C(106.90, 8.00, 'rio', -14, bus='amb', fi=0.8, fo=1.0),
    C(110.40, 1.40, 'whoosh', -11, pan=(0.35, -0.35), peak=0.45, **ZOOM),
    C(111.80, 3.20, 'acorde', -8, fi=0.4, fo=0.8),
    C(115.00, 1.50, 'final', +1, bus='hero', fi=0.0, fo=0.7, rev=('hall', -7)),
]

if __name__ == '__main__':
    S.main()
