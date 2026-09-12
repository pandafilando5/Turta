# ⚖️ Turta — Duruşma Takip

Av. Fuat DOBLAN için duruşma, dosya ve takvim takibi.
Telefonda **gerçek uygulama gibi** çalışır: ana ekranda kendi ikonu vardır, tarayıcı
çubuğu görünmez, internetsiz açılır.

**Sürüm:** v9.0 · Bağımlılık yok, derleme adımı yok, sunucu yok.

---

## 🚀 Kurulum — bir kez yapılır, bir daha uğraşılmaz

### 1. Adım: Yayını aç (bilgisayardan, 1 dakika)

GitHub'da bu deponun sayfasında:

1. **Settings** (Ayarlar) sekmesi
2. Sol menüden **Pages**
3. **Source** → `Deploy from a branch`
4. **Branch** → `main`, klasör `/ (root)` → **Save**
5. 1–2 dakika bekleyin. Sayfa şu adreste yayına girer:

```
https://pandafilando5.github.io/Turta/
```

> Bu adresi bir kez kurun; bundan sonra hiç değişmez. İndirilenler klasörüne,
> USB kablosuna, `.bat` dosyasına bir daha ihtiyaç yok.

### 2. Adım: Telefona kur (30 saniye)

1. Telefonda **Chrome** ile yukarıdaki adresi açın.
2. Sağ üstteki **⋮** menüsü → **“Uygulamayı yükle”** (veya “Ana ekrana ekle”).
   Chrome bunu genelde kendiliğinden de teklif eder.
3. Ana ekranda ⚖️ ikonlu **Turta** belirir.

Artık ikona dokunduğunuzda: adres çubuğu yok, sekme yok, geri-ileri yok.
Android bunu ayrı bir uygulama olarak görür (uygulama çekmecesinde ve
son kullanılanlarda kendi kartı olur).

**İkonu basılı tutunca** kısayollar çıkar: *Bugün* ve *Yeni Duruşma*.

> **“Uygulamayı yükle” çıkmıyorsa:** adresin `https://` ile başladığından emin olun.
> `file:///…` veya `http://192.168…` adreslerinde Chrome bu seçeneği **hiçbir zaman**
> göstermez — eski sistemin çıkmazı tam olarak buydu.

### 3. Adım: Verilerinizi taşıyın

Yeni adres, eski dosyadan **ayrı bir depolama alanı** kullanır. Veriler kendiliğinden
gelmez, bir kez aktarmanız gerekir:

| Elinizdeki | Ne yapacaksınız |
|---|---|
| Eski `Av_Fuat.html` telefonda | Onu açın → **Ayarlar → Şimdi Yedekle (JSON)** → dosya iner. Sonra Turta'da **📂 Yedekten veri aktar** ile o dosyayı seçin. |
| `hearings.generated.json` bilgisayarda | Dosyayı telefona atın, Turta'da **Yedekten veri aktar** ile seçin. Türkçe alan adları (`mahkeme`, `dosyaNo`, `tarih`, `saat`, `taraf`) otomatik tanınır. |
| Elde bir liste / Excel satırları | **Ayarlar → 📋 Toplu Ekle** → satırları yapıştırın → önizleyip ekleyin. |

Aktarımdan sonra **Ayarlar → Yedek Al (JSON)** ile bir yedek alın.

---

## 📱 Günlük kullanım

### Açılış
Uygulama **Bugün** ekranıyla açılır — sabah bakılacak tek yer.
Segmentler: `Bugün · 7 Gün · Yaklaşan · Takvim · Tümü`. Hangisinde bıraktıysanız
bir dahakine orada açılır.

### Duruşma ertelemek (koridorda, tek elle)
Kartı **sola kaydırın** → *Ertele* paneli açılır. Ya da karta dokunup **⏸️ Ertele**.

1. Süre cipine dokunun: `1 ay`, `2 ay`, `45 gün`, **`⚖️ Adli tatil sonrası`**…
2. Tarih hafta sonuna veya resmî tatile denk gelirse **kendiliğinden ilk iş gününe** alınır ve size söyler.
3. Gerekçeyi tek dokunuşla seçin: *Bilirkişi raporu beklenecek*, *Tanık dinlenecek*…
4. **ERTELE VE KAYDET**.

Sonuç: eski duruşma **“Ertelendi”** olarak geçmişte kalır, yeni tarih için
**ayrı bir kayıt** açılır ve ikisi birbirine bağlanır. Dosyanın kaç celse sürdüğü
kendiliğinden birikir.

### Diğer jestler
- **Sağa kaydır** → Tamamlandı
- **Karta dokun** → detay + tüm işlemler
- **Takvimde sola/sağa kaydır** → ay değiştir
- Her işlemden sonra **Geri Al** çıkar

### “İşaret bekliyor”
Tarihi geçmiş ama hâlâ *aktif* görünen duruşmalar ajandanın en üstünde ayrı bir
kutuda toplanır; her biri için **Oldu / Ertelendi / Karar** düğmeleri vardır.
Liste böylece çöp biriktirmez.

### Yeni duruşma eklemek
**＋** düğmesi. En üstteki **⚡ Akıllı Giriş** kutusuna UYAP'tan kopyaladığınız metni
yapıştırın — tarih, saat, mahkeme ve esas no kendiliğinden dolar; siz yalnızca
kontrol edip kaydedersiniz.

- Dosya no seçince mahkeme, konum ve müvekkil de dolar.
- **Kaydet ve yeni ekle**: aynı mahkemeden arka arkaya kayıt girerken mahkeme ve
  tarihi korur.
- Aynı gün yakın saatte başka duruşma varsa uyarır. **Farklı binada** ise
  🚨 *bina değişikliği* uyarısı verir (aynı binada 60 dk, farklı binada 90 dk eşiği).

### Hatırlatma / alarm
Uygulama içi bildirim yalnızca **uygulama açıkken** çalışır — bunu güvenilir bir
alarm olarak kullanmayın.

**Doğru yöntem:** duruşmaya dokunun → **📆 Takvime**. Google Takvim açılır, tek
dokunuşla kaydedersiniz. Telefonunuzun kendi alarmı, kilit ekranı ve akıllı saatiniz
devreye girer. Toplu aktarım için *Ayarlar → Toplu .ics İndir*.

---

## 🔒 Gizlilik

- **Duruşma verisi hiçbir zaman internete gönderilmez.** Telefonunuzun kendi
  deposunda (localStorage + IndexedDB) durur.
- Bu depoda yalnızca **uygulamanın kodu** vardır; müvekkil adı, esas no, mahkeme
  bilgisi **yoktur** ve hiçbir zaman olmamıştır.
- `.gitignore`, yedek/arşiv dosyalarının yanlışlıkla depoya eklenmesini engeller.
  **Bu korumayı kaldırmayın.**
- **Ayarlar → Gizlilik → Açılış Kilidi (PIN)** ile telefonu birine uzattığınızda
  müvekkil adlarının görünmesini engelleyebilirsiniz.
- Adresin de gizli olmasını isterseniz: Cloudflare Pages + Cloudflare Access
  (ücretsiz katman) ile aynı dosyaları giriş arkasına koyabilirsiniz. Kodda
  değişiklik gerekmez.

---

## 💾 Veri güvenliği

Uygulama her kayıtta veriyi **iki yere birden** yazar:

1. `localStorage` — hızlı okuma
2. `IndexedDB` — kalıcı ayna + son 14 günün günlük anlık görüntüleri

localStorage silinirse açılışta kalıcı yedekten kendiliğinden kurtarır.
Yine de **asıl yedek sizin aldığınızdır**: Ayarlar → *Yedek Al (JSON)* veya
*Yedeği Paylaş* (Drive / WhatsApp). Uygulama 14 günde bir hatırlatır.

---

## 🛠️ Teknik

| | |
|---|---|
| Mimari | Tek sayfa, çerçevesiz (vanilla) JS + CSS. Derleme adımı yok. |
| Barındırma | Statik dosya. GitHub Pages / Cloudflare Pages / herhangi bir HTTPS sunucu. |
| Çevrimdışı | Service Worker — *stale-while-revalidate*: önbellekten anında açılır, yeni sürüm arka planda iner ve size “Yenile” der. |
| Depolama | localStorage (birincil) + IndexedDB (ayna & anlık görüntüler) |
| Bağımlılık | **Yok.** Ağdan hiçbir kütüphane çekilmez. |

### Dosyalar
```
index.html              uygulamanın tamamı (arayüz + mantık)
manifest.webmanifest    PWA tanımı, ikonlar, kısayollar
sw.js                   service worker (çevrimdışı önbellek)
icons/                  192/512 px + maskable ikonlar
degerlendirme/          mimari değerlendirme ve karar gerekçeleri
```

### Sık değiştirilecek yerler (`index.html` içinde)
| Ne | Nerede |
|---|---|
| Konum etiketleri (Ana Bina / Ek Bina / …) | `const TYPES` |
| Erteleme gerekçeleri | `const POSTPONE_REASONS` |
| Hızlı erteleme süreleri | `const POSTPONE_STEPS` |
| Sabit resmî tatiller | `const FIXED_HOLIDAYS` |
| Çakışma eşikleri | `GAP_SAME` / `GAP_CROSS` |

Adli tatil aralığı ve kendi tatil günleriniz **uygulama içinden** düzenlenir
(Ayarlar → Çalışılmayan Günler); kod değiştirmeye gerek yoktur.

### Sürüm çıkarken
`index.html` içindeki `APP_VERSION` ile `sw.js` içindeki `VERSION` **birlikte**
yükseltilmelidir; yoksa telefonlar eski önbelleği kullanmaya devam eder.

---

## ❓ Sorun giderme

**“Uygulamayı yükle” çıkmıyor**
Adres `https://` mi? `file://` ve `http://` ile bu menü hiçbir zaman çıkmaz.
Sayfayı bir kez yenileyip tekrar deneyin.

**Değişiklik telefona gelmedi**
Ayarlar → *Güncellemeyi Denetle*. Uygulama önbellekten açıldığı için yeni sürümü
bir sonraki açılışta alır; hazır olduğunda üstte “Yeni sürüm hazır” şeridi çıkar.

**Veriler kayboldu**
Ayarlar → *Kalıcı Yedekten Dön* (son 14 günün anlık görüntüleri).
Oradan da çıkmazsa aldığınız JSON yedeğini geri yükleyin.

**Eski uygulamadaki kayıtlar burada yok**
Beklenen davranış: `file://` ile `https://` ayrı depolama alanlarıdır.
Yukarıdaki **3. Adım**'ı uygulayın.
