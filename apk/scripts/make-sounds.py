#!/usr/bin/env python3
"""
Turta — 5 kısa bildirim sesini sentezler (telif derdi yok, hepsi sıfırdan üretilir).

Çıktı:
  sounds/<ad>.wav                                  (web önizleme + PWA)
  apk/android/app/src/main/res/raw/<ad>.wav        (Android bildirim kanalı)

Çalıştırma (depo kökünden):  python3 apk/scripts/make-sounds.py
Gereken: numpy
"""
import os
import wave
import numpy as np

SR = 24000          # 24 kHz yeterli: en yüksek bileşen ~7 kHz
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUTS = [os.path.join(ROOT, 'sounds'),
        os.path.join(ROOT, 'apk', 'android', 'app', 'src', 'main', 'res', 'raw')]


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def env(n, attack=0.004, decay=0.5):
    """Hızlı yükselen, üstel sönen zarf."""
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def place(buf, sig, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    buf[i:j] += sig[: j - i]


def bell(freq, dur=1.3, decay=0.55):
    """Yumuşak zil: hafif uyumsuz kısmi tonlar."""
    t = t_axis(dur)
    parts = [(1.0, 1.0, decay), (2.0, 0.42, decay * 0.55),
             (2.76, 0.22, decay * 0.35), (5.4, 0.07, decay * 0.18)]
    s = np.zeros_like(t)
    for ratio, amp, dk in parts:
        s += amp * np.sin(2 * np.pi * freq * ratio * t) * env(len(t), 0.003, dk)
    return s


def pluck(freq, dur=0.9, decay=0.32):
    """Müzik kutusu dişi: parlak, kısa."""
    t = t_axis(dur)
    s = (np.sin(2 * np.pi * freq * t)
         + 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.12)
         + 0.10 * np.sin(2 * np.pi * freq * 4.2 * t) * np.exp(-t / 0.04))
    return s * env(len(t), 0.002, decay)


def drop(f0, f1, dur=0.16, sweep=0.05, decay=0.06):
    """Su damlası: yukarı kayan sinüs."""
    t = t_axis(dur)
    k = np.clip(t / sweep, 0, 1)
    f = f0 * (f1 / f0) ** k
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env(len(t), 0.002, decay)


def chirp(f0, f1, dur=0.085, vib=38.0):
    """Kuş cıvıltısı: hızlı frekans kayması + titreşim."""
    t = t_axis(dur)
    f = f0 + (f1 - f0) * (t / dur) ** 0.7 + 180 * np.sin(2 * np.pi * vib * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    w = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5      # yumuşak pencere
    return np.sin(ph) * w


def finish(buf, peak_db=-2.0, fade=0.03):
    buf = buf - np.mean(buf)
    n = int(fade * SR)
    buf[-n:] *= np.linspace(1, 0, n)
    buf[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    peak = np.max(np.abs(buf)) or 1.0
    return buf / peak * (10 ** (peak_db / 20))


def s_zil():                      # "ding-dong" — 1.6 sn
    b = np.zeros(int(SR * 1.6))
    place(b, bell(1318.5), 0.00)      # Mi6
    place(b, bell(1046.5, 1.2), 0.34) # Do6
    return b


def s_kristal():                  # yükselen ışıltı — 1.2 sn
    b = np.zeros(int(SR * 1.2))
    for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0]):
        place(b, 0.8 * bell(f, 0.9, 0.32), i * 0.085)
    return b


def s_damla():                    # üç damla — 1.0 sn
    b = np.zeros(int(SR * 1.0))
    place(b, drop(520, 1250), 0.00)
    place(b, drop(640, 1500), 0.20)
    place(b, 0.85 * drop(780, 1850), 0.38)
    return b


def s_civilti():                  # kuş — 1.2 sn
    b = np.zeros(int(SR * 1.2))
    for i in range(3):
        place(b, chirp(2900, 4300), 0.02 + i * 0.12)
    for i in range(5):            # kısa trill
        place(b, 0.7 * chirp(3800, 3300, 0.045, 55.0), 0.48 + i * 0.06)
    place(b, chirp(3000, 4600, 0.12), 0.85)
    return b


def s_kutu():                     # müzik kutusu — 1.8 sn
    b = np.zeros(int(SR * 1.8))
    notes = [(783.99, 0.00), (1046.5, 0.15), (1318.5, 0.30),
             (1568.0, 0.45), (1318.5, 0.62), (2093.0, 0.80)]
    for f, at in notes:
        place(b, pluck(f, 1.0, 0.36), at)
    return b


SOUNDS = {
    'turta_zil': s_zil,
    'turta_kristal': s_kristal,
    'turta_damla': s_damla,
    'turta_civilti': s_civilti,
    'turta_kutu': s_kutu,
}


def write(path, data):
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == '__main__':
    for out in OUTS:
        os.makedirs(out, exist_ok=True)
    for name, fn in SOUNDS.items():
        data = finish(fn())
        for out in OUTS:
            write(os.path.join(out, name + '.wav'), data)
        print(f'{name}.wav  {len(data) / SR:.2f} sn')
