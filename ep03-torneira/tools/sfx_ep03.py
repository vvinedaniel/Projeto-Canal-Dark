#!/usr/bin/env python3
"""Efeitos sonoros + trilha do ep. 03 ("Como a água chega até sua torneira?").

Reaproveita a biblioteca de síntese do ep. 01 (tools/sfx.py: filtros, bolhas, água corrente, bombas,
queda d'água, impactos, pad, ducking sob a voz) e acrescenta os sons novos deste episódio:
chuva (fraca/forte), trovão, enxurrada, motor diesel de obra (com hidráulico e ré), escavação/despejo de terra,
vibração de rolo/placa, batidas de obra, plástico/lixo, rebobinar e gotejar.
Tudo sintetizado (numpy/scipy), determinístico. Gera audio/sfx.wav (estéreo, 48 kHz, float32, DUR s).

Uso:  python3 tools/sfx_ep03.py [-q]      (tools/mix.sh chama este arquivo)
"""
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sfx as S  # noqa: E402
from sfx import (C, SR, bp, lp, hp, unit_rms, unit_peak, colored, wobble, tt, damped, bubble_field,  # noqa: E402
                 mono_to_st, smoothstep, envpts, sec, peak_filter)

DUR = 115.0
S.DUR = DUR
S.N = int(round(DUR * SR))
S.SEED = 20261127


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




# ---- sons novos do ep. 03 -----------------------------------------------------------------------
def copo(n, rng, f0=520.0, f1=1350.0):
    """Água caindo num copo: jato + ressonância que SOBE de tom conforme o copo enche (coluna de ar menor)."""
    t = np.arange(n) / SR
    k = t / max(t[-1], 1e-6)
    f = f0 + (f1 - f0) * k ** 1.3
    ph = 2 * np.pi * np.cumsum(f) / SR
    noise = colored(n, rng, -0.5)
    tone = bp(noise, 300, 6000) * (0.55 + 0.45 * np.sin(ph) ** 2)
    bub = bubble_field(n, rng, 55, 900, 2600, width=0.3)
    return mono_to_st(unit_rms(tone) * 0.8, 0.0) + 0.35 * unit_rms(bub)


def rangido(n, rng, f=420.0):
    """Volante/registro girando: rangido metálico curto."""
    t = np.arange(n) / SR
    fm = f * (1 + 0.25 * np.sin(2 * np.pi * 7 * t))
    s = np.sin(2 * np.pi * np.cumsum(fm) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(fm) / SR)
    s *= (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 13 * t))) * np.exp(-1.2 * t)
    return mono_to_st(unit_rms(bp(s, 250, 4000)), 0.1)


def turbina(n, rng, f=34.0):
    """Hidrômetro: turbina e engrenagens girando (zumbido fino + tique da relojoaria)."""
    t = np.arange(n) / SR
    whir = bp(colored(n, rng, 0.0), 1800, 5200) * (0.6 + 0.4 * np.sin(2 * np.pi * f * t) ** 2)
    out = unit_rms(whir) * 0.6 + 0.8 * _ticks(n, rng, 9, 2500, 4500)[0]
    return mono_to_st(out, 0.0)


def boia(n, rng):
    """Torneira de boia: entrada d'água chiando que diminui até fechar."""
    t = np.arange(n) / SR
    k = t / max(t[-1], 1e-6)
    hiss = bp(colored(n, rng, 0.0), 900, 7000) * (1 - smoothstep(np.clip((k - 0.55) / 0.45, 0, 1))) * (1 - 0.4 * k)
    return mono_to_st(unit_rms(hiss), -0.1)


def dosadora(n, rng, rate=2.2):
    """Bomba dosadora de diafragma: pulsos ritmados + gotejar de produto."""
    t = np.arange(n) / SR
    puls = np.zeros(n)
    for t0 in np.arange(0.05, n / SR, 1 / rate):
        i0 = int(t0 * SR)
        L = min(n - i0, int(0.09 * SR))
        if L > 0:
            puls[i0:i0 + L] += np.sin(2 * np.pi * 95 * np.arange(L) / SR) * np.exp(-np.arange(L) / (0.025 * SR))
    hum = np.sin(2 * np.pi * 120 * t) * 0.08
    return mono_to_st(unit_rms(lp(puls, 1800)) + hum, 0.2)


def borbulha(n, rng, rate=60):
    """Bolhas/expansão do leito na lavagem em contracorrente."""
    return unit_rms(bubble_field(n, rng, rate, 200, 900))


for fn in (S.acorde, S.motor_eletrico, chuva, trovao, enxurrada, diesel, escavacao, vibro, obra, plastico, rebobinar, gotejar,
           copo, rangido, turbina, boia, dosadora, borbulha, S.clank):
    S.SYNTHS[fn.__name__] = fn

ZOOM = dict(f0=650, f1=2000, f2=850, bw=0.95, sub=0.0)

# =====================================================================================
# LISTA DE DEIXAS (tempo s, duração s, tipo, ganho dB, ...) — mesmos tempos da tela (src/sets/mundo/state.js)
# =====================================================================================
S.CUES = [
    C(0.00, DUR, 'pad', -9, bus='trilha', fi=0.6, fo=1.2),
    # ---- 1 gancho: torneira e copo (0–3,3) ---------------------------------------------
    C(0.00, 0.80, 'rangido', -14, fi=0.0, fo=0.2, f=460),
    C(0.05, 6.60, 'copo', -9, fi=0.05, fo=0.6, f0=480, f1=1200),
    C(0.00, 6.90, 'room_tone', -22, bus='amb', fi=0.2, fo=0.5),
    # ---- 2 caminho inverso (3,3–7,05) -------------------------------------------------------
    C(3.50, 1.00, 'whoosh', -10, pan=(0.3, -0.3), peak=0.5, **ZOOM),
    C(4.40, 2.40, 'agua_corrente', -15, bus='amb', fi=0.2, fo=0.4, lo=200, hi=2500, bubbles=20, bfmin=300, bfmax=1200, lp_f=3000),
    C(5.00, 1.10, 'whoosh', -10, pan=(-0.3, 0.3), peak=0.5, **ZOOM),
    C(6.20, 1.00, 'whoosh', -11, pan=(0.2, -0.2), peak=0.5, **ZOOM),
    # ---- rebobinar + manancial (7,05–11) ---------------------------------------------------
    C(6.95, 1.20, 'rebobinar', -7, fi=0.05, fo=0.3, rev=('hall', -14)),
    C(7.70, 8.00, 'rio', -12, bus='amb', fi=0.6, fo=1.0),
    C(7.80, 3.60, 'passaros', -16, bus='amb', fi=0.4, fo=0.8),
    C(8.10, 2.60, 'queda_dagua', -17, fi=0.5, fo=0.6, bright=0.5),
    # ---- 4 captação: obra (9,8–12,4) ----------------------------------------------------------
    C(9.80, 2.60, 'diesel', -12, bus='amb', fi=0.3, fo=0.4, rpm=880, hid=0.8, accel=[(0, 1.0), (1.0, 1.3), (2.6, 1.05)]),
    C(9.90, 1.40, 'escavacao', -12, golpes=(0.1, 0.8), despejos=(1.1,)),
    C(10.60, 1.90, 'obra', -12, fi=0.02, fo=0.3, batidas=7, f0=460),
    C(11.80, 0.80, 'baque', -10, rev=('hall', -14), f=110, decay=0.12, hollow=280, lpf=1000),
    # ---- 5 bombas (12,2–15,2) ---------------------------------------------------------------------
    C(12.30, 1.00, 'clank', -12),
    C(13.20, 4.20, 'bombas', -7, fi=0.3, fo=0.6),
    C(13.40, 3.40, 'agua_corrente', -13, bus='amb', fi=0.4, fo=0.5, rev=('hall', -12), lo=100, hi=1400, bubbles=30, bfmin=140, bfmax=700, lp_f=1000, rumble=0.7),
    # ---- 6 adutora (14,6–17,4) ------------------------------------------------------------------
    C(14.70, 2.40, 'obra', -14, fi=0.02, fo=0.3, batidas=6, f0=380),
    C(15.20, 2.40, 'rumor_profundo', -11, fi=0.4, fo=0.5),
    C(16.30, 0.90, 'whoosh', -12, pan=(-0.3, 0.3), peak=0.5, **ZOOM),
    # ---- 7 chegada à ETA (17,4–21,7) -------------------------------------------------------------
    C(17.30, 0.90, 'baque', -12, f=90, decay=0.2, hollow=300, lpf=900),
    C(17.40, 8.00, 'vertedor', -11, bus='amb', fi=0.4, fo=0.8),
    C(18.00, 3.70, 'micro', -13, fi=0.3, fo=0.4),
    # ---- transformação (22–25,5) ------------------------------------------------------------------
    C(22.00, 3.40, 'shimmer', -11, fi=0.3, fo=0.6),
    C(22.10, 1.10, 'whoosh', -10, pan=(0.3, -0.3), peak=0.5, **ZOOM),
    # ---- 8 coagulação (25,5–33,7) ---------------------------------------------------------------------
    C(25.40, 2.00, 'obra', -14, fi=0.02, fo=0.3, batidas=5, f0=620),
    C(26.90, 7.00, 'dosadora', -14, fi=0.3, fo=0.5, rate=2.4),
    C(26.90, 6.80, 'agua_corrente', -12, bus='amb', fi=0.4, fo=0.6, lo=150, hi=3500, bubbles=50, bfmin=250, bfmax=1500, lp_f=3500),
    C(27.40, 6.20, 'micro', -14, fi=0.3, fo=0.4),
    C(31.20, 1.20, 'shimmer', -13, fi=0.1, fo=0.4),
    # ---- 9–10 floculação (33–40,9) -------------------------------------------------------------------
    C(33.00, 2.20, 'obra', -13, fi=0.02, fo=0.3, batidas=6, f0=420),
    C(34.80, 6.20, 'motor_eletrico', -16, fi=0.5, fo=0.6, f_rot=6.0, spin=0.15),
    C(35.10, 1.40, 'enchimento_caixa', -14, fi=0.2, fo=0.4),
    C(36.40, 4.50, 'gluglu', -18, fi=0.4, fo=0.5),
    # ---- 11–12 decantação e lodo (40–50) ------------------------------------------------------------
    C(40.00, 2.20, 'obra', -13, fi=0.02, fo=0.3, batidas=5, f0=360),
    C(42.20, 1.40, 'enchimento_caixa', -14, fi=0.2, fo=0.4),
    C(42.80, 4.60, 'decantador', -12, fi=0.5, fo=0.6),
    C(45.40, 4.40, 'lodo', -13, fi=0.4, fo=0.6),
    C(45.60, 3.00, 'motor_eletrico', -18, fi=0.3, fo=0.5, f_rot=3.0, spin=0.1),
    C(47.80, 2.20, 'drone_tensao', -12, fi=0.3, fo=0.4),
    # ---- 13 filtração (49,8–58,3) ---------------------------------------------------------------------
    C(49.90, 1.30, 'obra', -14, fi=0.02, fo=0.3, batidas=4, f0=500),
    C(50.80, 1.30, 'areia', -10, fi=0.05, fo=0.3),
    C(51.90, 1.20, 'areia', -10, fi=0.05, fo=0.3),
    C(52.80, 1.10, 'areia', -11, fi=0.05, fo=0.3),
    C(53.50, 4.80, 'agua_corrente', -13, bus='amb', fi=0.6, fo=0.5, lo=120, hi=2000, bubbles=40, bfmin=200, bfmax=900, lp_f=2000),
    C(54.60, 3.70, 'micro', -15, fi=0.3, fo=0.4),
    C(56.20, 2.20, 'borbulha', -11, fi=0.3, fo=0.4, rate=70),
    # ---- 14 desinfecção e ajustes (58–70,3) ------------------------------------------------------------
    C(58.00, 1.80, 'obra', -14, fi=0.02, fo=0.3, batidas=4, f0=540),
    C(59.80, 5.20, 'dosadora', -15, fi=0.3, fo=0.5, rate=1.8),
    C(60.00, 10.0, 'agua_corrente', -14, bus='amb', fi=0.6, fo=0.8, lo=150, hi=2500, bubbles=30, bfmin=250, bfmax=1000, lp_f=2500),
    C(60.40, 4.30, 'micro', -14, fi=0.3, fo=0.4),
    C(64.80, 1.60, 'obra', -15, fi=0.02, fo=0.3, batidas=3, f0=700),
    C(66.20, 3.80, 'dosadora', -16, fi=0.3, fo=0.5, rate=2.0),
    C(68.20, 1.20, 'shimmer', -14, fi=0.2, fo=0.4),
    # ---- 15 laboratório (70,2–74,4) ------------------------------------------------------------------
    C(70.40, 4.00, 'room_tone', -18, bus='amb', fi=0.3, fo=0.4),
    C(70.90, 0.60, 'vidro', -12),
    C(71.60, 1.20, 'bequer', -12),
    C(72.70, 0.60, 'vidro', -13),
    C(73.30, 0.50, 'clique', -12),
    C(73.60, 1.00, 'shimmer', -12, fi=0.1, fo=0.4),
    # ---- 16–17 bombeamento, reservatórios, gravidade e pressão (74,4–84,6) -----------------------------
    C(74.50, 2.20, 'obra', -13, fi=0.02, fo=0.3, batidas=6, f0=440),
    C(76.00, 1.40, 'enchimento_caixa', -13, fi=0.2, fo=0.4),
    C(77.20, 4.00, 'bombas', -9, fi=0.3, fo=0.6),
    C(77.10, 3.00, 'diesel', -16, bus='amb', fi=0.3, fo=0.4, rpm=820, hid=0.7),
    C(78.40, 1.80, 'obra', -14, fi=0.02, fo=0.3, batidas=5, f0=300),
    C(79.60, 4.20, 'enchimento_caixa', -12, fi=0.4, fo=0.6),
    C(80.40, 4.00, 'subida', -14, fi=0.4, fo=0.6),
    # ---- 18 rede subterrânea (84,7–91,4) -------------------------------------------------------------
    C(84.60, 1.00, 'whoosh', -10, pan=(0.3, -0.3), peak=0.5, **ZOOM),
    C(84.80, 6.60, 'agua_corrente', -12, bus='amb', fi=0.4, fo=0.6, rev=('hall', -14), lo=120, hi=1800, bubbles=30, bfmin=200, bfmax=800, lp_f=1500),
    C(85.20, 6.00, 'carro', -20, bus='amb', fi=0.6, fo=0.6),
    C(87.60, 2.00, 'shimmer', -14, fi=0.3, fo=0.4),
    # ---- 19–20 hidrômetro e caixa-d'água (91,7–100,2) --------------------------------------------------
    C(91.80, 1.40, 'obra', -14, fi=0.02, fo=0.3, batidas=4, f0=780),
    C(92.90, 1.00, 'agua_corrente', -15, fi=0.2, fo=0.3, lo=300, hi=3000, bubbles=10, bfmin=500, bfmax=1500, lp_f=3500),
    C(93.40, 6.20, 'turbina', -14, fi=0.3, fo=0.5),
    C(95.00, 1.60, 'baque', -12, f=120, decay=0.2, hollow=360, lpf=1100),
    C(96.40, 3.70, 'boia', -11, fi=0.2, fo=0.2),
    C(96.90, 3.10, 'enchimento_caixa', -12, fi=0.3, fo=0.4),
    C(99.70, 0.50, 'clique', -12),
    # ---- 21–22 torneira e copo (100,6–107) ---------------------------------------------------------------
    C(100.70, 0.90, 'rangido', -12, fi=0.0, fo=0.2, f=440),
    C(101.40, 5.40, 'copo', -8, fi=0.1, fo=0.5, f0=480, f1=1300),
    C(100.60, 6.80, 'room_tone', -22, bus='amb', fi=0.3, fo=0.5),
    C(104.80, 1.40, 'shimmer', -12, fi=0.2, fo=0.5),
    # ---- 23 sistema inteiro (107–115) -------------------------------------------------------------------
    C(107.20, 1.20, 'whoosh', -10, pan=(-0.3, 0.3), peak=0.5, **ZOOM),
    C(108.60, 6.40, 'rio', -15, bus='amb', fi=0.8, fo=1.0),
    C(109.40, 1.40, 'whoosh', -11, pan=(0.3, -0.3), peak=0.45, **ZOOM),
    C(110.60, 3.60, 'acorde', -8, fi=0.4, fo=0.8),
    C(113.40, 1.50, 'final', +1, bus='hero', fi=0.0, fo=0.7, rev=('hall', -7)),
]

if __name__ == '__main__':
    S.main()
