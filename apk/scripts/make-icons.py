#!/usr/bin/env python3
"""
Turta — Android ikonlarını mevcut PWA ikonlarından üretir.

  mipmap-*/ic_launcher*.png       başlatıcı ikonu (eski + uyarlanabilir ön plan)
  drawable-*/ic_stat_turta.png    bildirim çubuğu ikonu (beyaz siluet)
  drawable*/splash.png            açılış ekranı (Capacitor logosu yerine)

Çalıştırma (depo kökünden):  python3 apk/scripts/make-icons.py
Gereken: Pillow
"""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
RES = os.path.join(ROOT, 'apk', 'android', 'app', 'src', 'main', 'res')
MASK = Image.open(os.path.join(ROOT, 'icons', 'icon-maskable-512.png')).convert('RGBA')
BG = (101, 67, 33, 255)                     # #654321 — tema rengi

DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def silhouette():
    """Maskelenebilir ikondaki beyaz terazi → saydam zemin üzerinde beyaz."""
    src = MASK.copy()
    px = src.load()
    out = Image.new('RGBA', src.size, (0, 0, 0, 0))
    po = out.load()
    for y in range(src.size[1]):
        for x in range(src.size[0]):
            r, g, b, _ = px[x, y]
            lum = min(r, g, b)
            if lum > 150:
                a = int(min(255, (lum - 150) * 255 / 90))
                po[x, y] = (255, 255, 255, a)
    return out.crop(out.getbbox())


def fit(img, size, scale):
    """img'i size×size tuvalin ortasına, kenarın 'scale' oranında sığdır."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    w, h = img.size
    k = (size * scale) / max(w, h)
    im = img.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    canvas.paste(im, ((size - im.size[0]) // 2, (size - im.size[1]) // 2), im)
    return canvas


def round_mask(img):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).ellipse((0, 0, img.size[0] - 1, img.size[1] - 1), fill=255)
    out = img.copy()
    out.putalpha(m)
    return out


def main():
    sil = silhouette()

    for d, k in DENS.items():
        mip = os.path.join(RES, f'mipmap-{d}')
        os.makedirs(mip, exist_ok=True)
        leg = MASK.resize((round(48 * k), round(48 * k)), Image.LANCZOS)
        leg.save(os.path.join(mip, 'ic_launcher.png'))
        round_mask(leg).save(os.path.join(mip, 'ic_launcher_round.png'))
        # Uyarlanabilir ön plan: 108dp; içerik güvenli alanda (çap %61) kalır
        MASK.resize((round(108 * k), round(108 * k)), Image.LANCZOS) \
            .save(os.path.join(mip, 'ic_launcher_foreground.png'))

        dr = os.path.join(RES, f'drawable-{d}')
        os.makedirs(dr, exist_ok=True)
        n = round(24 * k)
        fit(sil, n, 0.86).save(os.path.join(dr, 'ic_stat_turta.png'))

    # Şablonun vektör ön planı bitmap'i gölgelemesin
    v24 = os.path.join(RES, 'drawable-v24', 'ic_launcher_foreground.xml')
    if os.path.exists(v24):
        os.remove(v24)

    # Açılış ekranı: mevcut splash.png boyutları korunur, içerik değişir
    for dirpath, _, files in os.walk(RES):
        if 'splash.png' not in files:
            continue
        p = os.path.join(dirpath, 'splash.png')
        w, h = Image.open(p).size
        canvas = Image.new('RGBA', (w, h), BG)
        mark = fit(sil, min(w, h), 0.28)
        canvas.paste(mark, ((w - mark.size[0]) // 2, (h - mark.size[1]) // 2), mark)
        canvas.convert('RGB').save(p, optimize=True)

    print('ikonlar hazır →', RES)


if __name__ == '__main__':
    main()
