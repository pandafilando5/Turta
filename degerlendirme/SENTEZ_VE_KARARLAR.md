# Turta v9 — Sentez ve Karar Gerekçeleri

**Tarih:** 12 Eylül 2026
**Girdiler:** Antigravity raporu (`DEGERLENDIRME_VE_YENILIK_RAPORU.md`), Cursor raporu
(`2026-09-12-urun-degerlendirmesi.md`), depodaki `index.html` (v8.0), kullanıcının
sözlü şikâyeti.
**Bu belge ne:** İki raporun sentezi, kendi bulgularım, **uygulanan kararlar** ve
**uygulanmayanların gerekçesi**. Öneri listesi değil; yapılan işin muhasebesi.

---

## 0. Tek cümle

Her iki rapor da aynı teşhiste birleşiyor ve haklılar: **sorun arayüz değil, uygulamanın
yanlış evde yaşamasıydı.** `file:///Download/Av_Fuat.html` adresinden açılan bir dosya
Chrome'un kurulum kapısından geçemez — bu bir ayar meselesi değil, protokol meselesidir.
v9 evi değiştirdi (HTTPS + PWA), ertelemeyi durum etiketi olmaktan çıkarıp **olay üreten**
bir işleme dönüştürdü ve geçmişte kalmış kayıtların listeyi çöpe çevirmesini durdurdu.

---

## 1. Üç metnin birleştiği teşhis

| Bulgu | Antigravity | Cursor | Bende |
|---|:--:|:--:|:--:|
| `file://` → PWA kurulumu imkânsız | ✓ | ✓ | ✓ |
| İkonlar üretilmemiş, manifest ölü | — | ✓ | ✓ |
| Erteleme yeni tarih doğurmuyor | ✓ | ✓ | ✓ |
| Durum çarkı (aktif→bitti→karar→ertelendi) anlamsız | — | ✓ | ✓ |
| Kaydırarak sil tehlikeli jest | — | ✓ | ✓ |
| Dosya kartında "sonraki duruşma" yok | ✓ | ✓ | ✓ |
| Bildirim yalnız uygulama açıkken (yanıltıcı) | ✓ | ✓ | ✓ |
| `new Date("2026-07-10")` saat dilimi kayması | — | ✓ | ✓ |
| Geri al = 25 tam anlık görüntü, bellek şişiriyor | — | ✓ | ✓ |
| Taraf/müvekkil alanı yok | ✓ | ✓ | ✓ |

Üç bağımsız incelemenin aynı noktalarda buluşması, bunların **yorum değil olgu**
olduğunu gösteriyor. Hepsi giderildi.

---

## 2. Uygulanan kararlar

### 2.1 Ev değişikliği — asıl mesele

| Yapılan | Neden |
|---|---|
| `manifest.webmanifest` (ayrı dosya, `data:` URI değil) | `data:` URI manifest'i Chrome kurulum ölçütünde saymaz |
| 192 / 512 / maskable PNG ikonlar **üretildi** | İkonsuz PWA kurulmaz — Cursor'ın "`icons/` klasörü boş" tespiti kritikti |
| `sw.js` — *stale-while-revalidate* | Uygulama önbellekten **anında** açılır; yeni sürüm arka planda iner ve "Yenile" şeridi çıkar |
| `.nojekyll`, göreli yollar (`./`) | GitHub Pages alt dizininde (`/Turta/`) sorunsuz çalışması için |
| Manifest kısayolları | İkona basılı tutunca *Bugün* / *Yeni Duruşma* |
| `navigator.storage.persist()` | Tarayıcı yer açarken veriyi silmesin |

**Sonuç:** HTTPS adreste Chrome "Uygulamayı yükle"yi gösterir; Android bunu **WebAPK**'ya
çevirir — uygulama çekmecesinde kendi girdisi, son kullanılanlarda kendi kartı, tarayıcı
arayüzü yok.

### 2.2 Erteleme — koridor jesti

Her iki rapor da bunu merkeze koydu; ikisinin en iyi taraflarını birleştirdim.

- Kartı **sola kaydır** → Ertele paneli (Cursor: "kaydırarak sil ölmeli" + Antigravity'nin
  bottom-sheet tasarımı)
- Süre cipleri: 1/2/3 hafta, 1 ay, 45 gün, 2/3/4 ay, **⚖️ Adli tatil sonrası**
  (Antigravity'nin önerisi)
- Tarih hafta sonu / resmî tatile denk gelirse **kendiliğinden ilk iş gününe alınır ve
  bunu söyler**
- Gerekçe cipleri: *Bilirkişi raporu beklenecek*, *Müzekkere cevabı*, *Tanık dinlenecek*,
  *Beyan için süre*, *Mazeret*, *Islah*, *Keşif*, *Tekemmül etmedi*
  (Antigravity'nin listesi, ikisi eklendi)
- Kayıt sonucu: eski duruşma `postponed` olarak **tarihte kalır**, yeni tarih için
  `prevId` ile bağlı **yeni kayıt** açılır

**Ölçülen süre:** cip → cip → kaydet = **3 dokunuş**.

### 2.3 "İşaret bekliyor" — Cursor'ın en güçlü tespiti

> *"85 kaydın hepsi `active`. Temmuz satırının Eylül'de hâlâ aktif oluşu listenin çöp
> üretmesidir, avukatın ihmali değil."*

Bunu tamamen gözden kaçırmıştım. Uygulandı: tarihi geçmiş ama hâlâ `active` kayıtlar
ajandanın **en üstünde** ayrı bir kutuda toplanıyor; her satırda üç büyük düğme —
**Oldu / Ertelendi / Karar**. Cursor'ın istediği "üç jest" tam olarak burada.

### 2.4 Kararlılık — kod düzeyi

| Sorun | Çözüm |
|---|---|
| `new Date('2026-09-12')` UTC olarak ayrışıyor → **bugünkü duruşma "YARIN" görünüyordu** | Tüm tarihler yerel `parseD()` ile; testle doğrulandı |
| `innerHTML`'e ham kullanıcı metni (XSS + kırık render) | Her yerde `esc()`; satır içi `onclick` yerine olay delegasyonu |
| Geri al = 25 tam JSON kopyası (megabaytlar, kota patlaması) | **Ters işlem** tabanlı geri alma — kayıt başına birkaç yüz bayt |
| `Date.now()` kimlik çakışması | `uid()` — zaman damgası + rastgelelik |
| `localStorage.setItem` sessizce patlıyor | `try/catch` + kullanıcıya görünür uyarı şeridi |
| Tek bellek yok | localStorage **+ IndexedDB aynası** + son 14 günün günlük anlık görüntüsü; localStorage boşsa açılışta kendiliğinden kurtarır |
| Türkçe arama `I/ı` kırılması | `fold()` — "istanbul" → İstanbul, "sisli" → Şişli |
| Çakışma yalnız zaman bazlı | **Aynı binada 60 dk, farklı binada 90 dk**; farklı binada 🚨 *bina değişikliği* uyarısı (Antigravity'nin Şanlıurfa Ana/Ek bina mesafesi gözlemi) |

### 2.5 Telefonda veri girişi — PowerShell'den kurtuluş

Antigravity SheetJS önerdi. **Farklı bir yol seçtim:** *Toplu Ekle (yapıştır)*.

- Excel/UYAP/WhatsApp'tan kopyalanan satırlar yapıştırılır
- Her satır ayrı ayrı çözümlenir, önizlenir, mevcut kayıtlarla karşılaştırılır
- İşaretlenenler eklenir

**Neden SheetJS değil:** ~400 KB'lık bir kütüphane, "bağımlılık yok, çevrimdışı çalışır"
ilkesini bozardı ve ilk açılış ağa bağımlı hale gelirdi. Yapıştırma yöntemi hem `.xlsx`
hem serbest metin hem de kâtipten gelen mesajı karşılıyor — daha genel ve sıfır maliyetli.
*Çıkarımım:* Excel dosyasının kendisini okumak gerekirse SheetJS ikinci aşamada eklenebilir;
bugünkü ihtiyacı yapıştırma karşılıyor.

Ayrıca **Akıllı Giriş**: yeni duruşma formunun en üstüne yapıştırılan serbest metinden
tarih, saat, mahkeme ve esas no çıkarılır (Türkçe ay adları ve `2025/123 E.` biçimi dahil).

### 2.6 Takvim

- **Birincil yol:** duruşma → *📆 Takvime* → Google Takvim "etkinlik ekle" ekranı dolu
  gelir, tek dokunuşla kaydedilir. Cursor'ın "toplu `.ics` değil, tek olay" ilkesi.
- **İkincil:** toplu `.ics` (ilk kurulum için). Her kaydın **sabit `UID`**'i var —
  yeniden içe aktarınca kopya değil güncelleme olur. Ancak **silinen duruşma takvimden
  düşmez**; bu ayarlarda açıkça yazıyor.

### 2.7 Gizlilik — Cursor'ın uyarısı üzerine eklenenler

- Ayarlar → **Açılış Kilidi (PIN)**; 2 dakikadan uzun arka plandan dönüşte tekrar sorar
- `.gitignore`: yedek/arşiv/Excel dosyaları depoya giremez
- Ayarlarda net dil: "veri yalnızca bu cihazda; kod internetten gelir, veri gelmez"

### 2.8 Diğer benimsenen öneriler

- Müvekkil/taraf alanı (`client`) — aramada da geçerli (Cursor: *"avukat esas no değil isim arar"*)
- Dosya kartının kapalı satırında **sonraki duruşma tarihi + saati + müvekkil**
- Dosya detayında **celse kronolojisi** (zaman tüneli)
- **📋 Esas No Kopyala** — UYAP'a yapıştırmak için
- **📂 Dosya klasörü bağlantısı** — dosya başına bir kez Drive/OneDrive linki, sonra tek dokunuş
- **Dokunsal geri bildirim** (`navigator.vibrate`) — Antigravity'nin "yerel uygulama hissi" notu
- **14 günlük yoğunluk şeridi** — Cursor'ın "avukat ayı değil haftayı görmek ister" itirazı
- Tüm `alert()`/`confirm()` çağrıları alt panellerle değiştirildi
- Türkçe alan adlarıyla içe aktarma (`mahkeme`, `dosyaNo`, `tarih`, `saat`, `taraf`, `bina`, `durum`)

---

## 3. Katılmadığım öneriler — gerekçeleriyle

Bu bölüm önemli: her iki rapor da bazı noktalarda ya fazla ileri gitti ya da teknik
olarak yanlış bir varsayıma dayandı.

### 3.1 "Asıl doğru ev APK'dır" — katılmıyorum

Antigravity APK'nın *"telefon yeniden başlasa bile duruşmadan 1 saat önce zil
çaldırabileceğini"* yazıyor. **Bu, WebView sarmalayıcı için doğru değil.** Capacitor
veya WebView kabuğu size otomatik olarak `AlarmManager` alarmı vermez; onun için
**yerel Android kodu yazmak** gerekir. Yalnızca HTML'i sarmalarsanız bildirim
kısıtları PWA ile aynı kalır.

Karşılaştırma, maliyetler dahil:

| | Kurulu PWA (WebAPK) | WebView APK |
|---|---|---|
| Ana ekranda ikon, tarayıcısız açılış | ✅ | ✅ |
| Uygulama çekmecesinde girdi | ✅ | ✅ |
| Çevrimdışı | ✅ | ✅ |
| Arka planda güvenilir alarm | ❌ | ❌ *(yerel kod yazılmadıkça)* |
| Ana ekran widget'ı | ❌ | ❌ *(yerel kod yazılmadıkça)* |
| Güncelleme | Otomatik | **Her seferinde elle APK kurulumu** |
| Kurulum zahmeti | Bir menü dokunuşu | Android SDK, imzalama, "bilinmeyen kaynak" |

**Kararım:** Bugün PWA. Alarm ihtiyacı zaten **telefon takvimiyle** doğru çözülüyor —
APK olsa da olmasa da en güvenilir yol budur. APK ancak *gerçek widget* veya *gerçek
arka plan alarmı* vazgeçilmez olursa, ve o zaman da **yerel kod yazılarak** anlamlıdır.
Sarmalayıcı APK, güncelleme yükünü kalıcı hale getirip karşılığında bugün hiçbir şey
vermez.

### 3.2 "Public GitHub Pages yasak seçenek sayılmalı" — kısmen katılıyorum

Cursor'ın uyarısı yerinde ama hedefi kaydırıyor. Ayrım şu:

- **Sızdıran şey**, eski boru hattının müvekkil verisini `index.html` içine `fullData`
  olarak **gömmesiydi**. O dosya yayına konsaydı gerçekten meslek sırrı ihlali olurdu.
- v9'da veri **hiçbir zaman koda girmiyor**; `EMBEDDED_DATA` boş kalıyor ve cihazda duruyor.

**Doğruladım:** depo geçmişinin tamamını taradım — bugüne kadar **hiçbir müvekkil verisi
commit edilmemiş** (`git log --all -p` üzerinde arama; sıfır eşleşme). Depoda yalnızca
`const fullData = [];` var, içi boş.

Dolayısıyla boş kabuğun herkese açık barındırılması bir ifşa değildir. Yine de:

1. `.gitignore` ile yedek/arşiv/Excel dosyaları kilitlendi
2. "Veri gömülü HTML" artık depo dosyasını değil, **ayrı bir indirme** üretiyor
3. Adresin kendisi de gizli olsun isterseniz: **Cloudflare Pages + Cloudflare Access**
   (ücretsiz katman) — aynı dosyalar, giriş arkasında, kod değişikliği gerekmez

*Not:* GitHub'da özel depodan Pages yayınlamak ücretli plan gerektirir; ücretsiz hesapta
"özel depo + Pages" seçeneği yoktur. Gizli adres isteniyorsa Cloudflare yolu doğru olandır.

### 3.3 "index.html / app.js / data.json diye bölünmeli" — katılmıyorum

Eleştirinin **asıl hedefi doğruydu**: 167 KB'lık şişkinlik *veriden* geliyordu ve kod ile
veri iç içeydi. **Bu giderildi** — veri artık kodda değil.

Geriye kalan "kodu üç dosyaya bölelim" önerisini uygulamadım:

- Kullanıcı geliştirici değil. Tek dosya, GitHub web arayüzünden düzenlenebilir.
- Derleme adımı yok, `npm` yok, dağıtım hattı yok — bu bir **özellik**, eksiklik değil.
- Service Worker ön belleklemesi ve ilk boyama tek dosyada daha basit.

*Çıkarımım:* Dosya bölmenin bu projede somut faydası yok; kalıcı bir bakım yükü var.
Bölünme, ekip büyürse veya test altyapısı kurulursa anlamlı hale gelir.

### 3.4 "İstatistik sekmesi, beş tema, `+` düğmesi ölmeli" — katılmıyorum

Cursor'ın asıl derdi haklı: **sabah ekranı kalabalık olmamalı.** Bu giderildi — açılış
ekranında yıl oku, ay ızgarası, lejant, altı filtre ve tema seçici yok.

Ama sekme arkasındaki özellikler sabah ekranını kirletmiyor:

- **Özet** artık çalışıyor: çakışmalar, bina değişikliği uyarıları, yoğun günler,
  haftalık özet paylaşımı. Bunlar bir avukat için gerçek bilgi.
- **Temalar** sıfır maliyetli ve kullanıcının kendi tercihi. Bir ürün kararını
  kullanıcının elinden almak için sebep yok.
- **`+` düğmesi**: kullanıcı ikinci şikâyet maddesinde açıkça *"yeni duruşmalar eklemek"*
  istedi. Kaldırmak talebe aykırı olurdu. Erteleme zaten tek kaydırma uzaklıkta.

### 3.5 "Canlı WebCal aboneliği" — bu mimaride mümkün değil

Her iki rapor da istiyor. Dürüst cevap: **canlı `.ics` beslemesi bir sunucu ister** ve
o sunucuya duruşma verisini **yüklemeyi** gerektirir — yani tam da kaçındığımız şeyi.
Statik barındırma + cihazda veri ile bu ikisi aynı anda olamaz.

Doğru ikame, Cursor'ın kendi belirlediği ilke: **toplu dosya değil, tek olay yazımı.**
Uygulandı.

### 3.6 "Ana ekran widget'ı" — PWA'da mümkün değil

Cursor bunu yol haritasında 7. sıraya koyup *"İndirilenler yolunun gerçek ölümü budur"*
diyor. Widget **yerel Android kodu gerektirir**; PWA sağlayamaz. En yakın karşılık,
uygulanan **manifest kısayollarıdır** (ikona basılı tut → *Bugün* / *Yeni Duruşma*).

### 3.7 Telegram botu — kapsam dışı

Antigravity'nin C seçeneği yaratıcı ama bir sunucu, bir bot altyapısı ve müvekkil
verisinin Telegram sunucularından geçmesi demek. Gizlilik gerekçesiyle önermiyorum.

---

## 4. Raporlardaki maddi hatalar

Doğruluk için kayda geçiriyorum:

1. **Cursor:** *"Çakışma yalnız çapraz bina; aynı salonda 09:00+09:10 uyarı vermez."*
   Yanlış. v8 kodu şehir dışı olmayan, aynı gün 60 dakikadan yakın **her** aktif çifti
   uyarıyordu — bina ayrımı yapmıyordu. Eksik olan tersiydi: *bina değişikliğini fazladan
   ciddiye almak*. v9'da bu eklendi.

2. **Cursor**, "XSS kaçışı"nı mevcut sistemin **güçlü yanları** arasında sayıyor.
   Depodaki v8.0'da kaçış **yok** — `h.court`, `h.note` doğrudan `innerHTML`'e giriyor.
   (Açıklaması 5. bölümde.)

3. **Antigravity**, WebView APK'nın arka plan alarmı ve yerel takvim erişimini
   kendiliğinden getireceğini ima ediyor. Getirmez; yerel kod gerekir. (3.1)

4. **Antigravity**, UYAP Mobil için bir "derin bağlantı" (deep link) tetiklemesinden
   söz ediyor. **Belgelenmiş bir UYAP Mobil deep-link şeması bilmiyorum** ve
   doğrulayamadığım bir şemayı koda koymadım. Bunun yerine **Esas No Kopyala** düğmesi
   eklendi — UYAP'ta arama kutusuna yapıştırmak için. Böyle bir şema varsa ve
   doğrularsanız eklemek beş dakikalık iştir.

---

## 5. Kritik bulgu: depo, yerel projenizden geri

Cursor raporu `index.html (v8.2)`, `Telefon/Av_Fuat.html`, `telefona-hazirla.bat`,
`scripts/import-hearings.ps1`, `data/hearings.generated.json` dosyalarını incelemiş.
**Bunların hiçbiri GitHub deposunda yok.** Depoda tek commit var (23.03.2026) ve
içinde yalnızca `README.md` + `index.html` (v8.0) bulunuyor.

**Sonuç:** Yerel projeniz GitHub'dakinden ileride. Cursor'ın "zaten düzelmiş" dediği
bazı şeyler (Türkçe arama, tarih cipi) v8.2'de var, depodaki v8.0'da yok. v9 bunları
zaten yeniden yazdı, kayıp yok.

**Sizin için önemli olan:** 85 duruşmalık gerçek veriniz `data/hearings.generated.json`
dosyasında duruyor. Bu dosya doğrudan içe aktarılabilir — Türkçe alan adları için
eşleme yazdım ve test ettim. README'deki *3. Adım*'ı izleyin.

---

## 6. Yapılmayanlar — dürüst liste

| İstenen | Durum | Neden |
|---|---|---|
| Canlı WebCal senkronu | ❌ | Sunucu + veri yükleme gerektirir (3.5) |
| Ana ekran widget'ı | ❌ | PWA sağlayamaz (3.6) |
| Arka planda güvenilir alarm | ❌ | Telefon takvimine devredildi; alternatifi yerel kod |
| `.xlsx` dosyasını doğrudan okuma | ❌ | Yapıştırma ile ikame edildi (2.5) |
| Tutanak fotoğrafından OCR | ❌ | Cihaz üstü OCR ağır; metin yapıştırma aynı işi görüyor |
| UYAP Mobil derin bağlantısı | ❌ | Doğrulanmış şema yok (4.4) |
| Yol tarifi / haritada aç | ❌ | Veride adres alanı yok |
| Sesli giriş | ❌ | Adliye gürültüsünde güvenilmez — Cursor'a katılıyorum |
| Çok cihazlı senkron | ❌ | Sunucu gerektirir; veri modeli bunu ileride ucuzlatacak şekilde kuruldu |

---

## 7. Doğrulama — ne test edildi

Kod "yazıldı" değil, **çalıştırıldı**. Gerçek Chromium'da, telefon boyutunda
(412×915, dokunmatik, `tr-TR`, `Europe/Istanbul`), otomatik test dizisiyle:

**51 doğrulama geçti, 0 kaldı, 0 konsol hatası.**

Kapsanan başlıklar: service worker'ın etkinleşmesi · manifest ve ikonların
sunulabilirliği · Türkçe arama katlaması · **BUGÜN/YARIN etiketlerinin doğruluğu**
(v8'deki UTC kayması) · ay eklemede taşma (31 Oca + 1 ay = 28 Şub) · üç ayrı biçimde
metin ayrıştırma · toplu yapıştırmanın başlık satırını atlaması · **HTML kaçışı /
XSS** · çakışma tespiti ve bina ayrımı · erteleme akışının uçtan uca doğru kayıt
üretmesi · geri almanın ertelemeyi tersine çevirmesi · sayfa yenilendiğinde verinin
kalması · takvim/dosya/özet/ayarlar render'ı · ICS'in geçerliliği (CRLF, sabit UID,
saat dilimi) · Türkçe alan adlarıyla içe aktarma · telefon genişliğinde yatay taşma
olmaması.

Test sırasında **iki gerçek hata** bulundu ve düzeltildi: (a) tek satırda Türkçe ay
adıyla yazılmış tarih, mahkeme adının içinde kalıyordu; (b) uyarı kutularında flex
düzeni metni parçalıyordu.

**Test edilmeyen:** gerçek Android cihazda kurulum akışı, gerçek Google Takvim
aktarımı, gerçek paylaşım menüsü. Bunlar tarayıcı/işletim sistemi arayüzleri olduğu
için ancak sizin telefonunuzda doğrulanabilir.

---

## 8. Bir hukuki not

Adli tatil aralığı uygulamada **20 Temmuz – 31 Ağustos** varsayılanıyla geliyor ve
**Ayarlar'dan değiştirilebilir** yapıldı. Bu tarihleri bu oturumda mevzuat metninden
teyit etmedim (web araması yapılmadı). Değişmişse ayarlardan güncelleyebilirsiniz.

Uygulamadaki uyarı bir **hatırlatmadır**, hukuki nitelendirme değildir: adli tatilde
hangi işlerin görüleceği ayrı bir değerlendirme konusudur ve uygulama bu konuda bir
sonuç üretmez. Arayüz metni bunu açıkça söylüyor.

---

## 9. Sıradaki adım

Tek bir iş var, beş dakika sürer: **GitHub Pages'i açmak** (README, 1. Adım).
Ondan sonra telefonda tek dokunuşla kurulum ve verilerin aktarımı.

Ölçüt basit — Cursor'ın "başarı neye benzer" tarifi:

> Bir sabah, adliyede, netsiz: ana ekranda ikon · dokun · bugünün saat sırası ·
> duruşma çıkışı "Ertelendi → 15 Ekim 10:30" · eski gün dosyada duruyor ·
> İndirilenler'e hiç girilmemiş · Chrome seçilmemiş · form açılmamış.

Bu resmin **son üç satırı hariç tamamı** v9'da çalışıyor; son üç satır zaten yeni evin
doğal sonucu. Geriye kalan tek şey evin kapısını açmak.
