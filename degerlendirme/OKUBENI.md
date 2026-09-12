# degerlendirme/ — bu klasör ne içerir

| Dosya | İçerik |
|---|---|
| `SENTEZ_VE_KARARLAR.md` | İki dış değerlendirmenin sentezi, uygulanan kararlar, uygulanmayanların gerekçesi, doğrulama kaydı |

## Kaynak raporlar neden burada değil

Bu klasörde **iki kaynak rapor bilerek yer almıyor:**

- Antigravity — `DEGERLENDIRME_VE_YENILIK_RAPORU.md`
- Cursor — `2026-09-12-urun-degerlendirmesi.md`

**Sebep:** Her ikisi de örneklerinde gerçek görünen bir esas numarası ve taraf adı
kullanıyor. Bu depo **herkese açıktır**. Söz konusu raporları buraya koymak,
uygulamanın tüm gizlilik tasarımını tek commit'te geçersiz kılardı — üstelik korumaya
çalıştığımız şeyin ta kendisini, meslek sırrını.

`SENTEZ_VE_KARARLAR.md` her iki raporun **bütün teknik içeriğini** taşır; yalnızca
tanımlayıcı bilgiler dışarıda bırakılmıştır.

## Raporları saklamak isterseniz

- Kendi bilgisayarınızda tutun (bu depo dışında), **veya**
- İçlerindeki esas no ve taraf adlarını temizleyip öyle ekleyin, **veya**
- Depoyu özel (private) hale getirin — ancak GitHub'da özel depodan Pages yayını
  ücretli plan gerektirir; ücretsiz hesapta bu ikisi bir arada olmaz.
  Hem gizli adres hem ücretsiz istiyorsanız Cloudflare Pages + Cloudflare Access
  doğru yoldur (`SENTEZ_VE_KARARLAR.md` § 3.2).

Kök dizindeki `.gitignore` bu iki dosya adını da engeller.
