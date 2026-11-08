/* ============================================================
   Turta — otomatik doğrulama
   Çalıştırmak için:
       npm install playwright
       node test/smoke.mjs
   Gerçek Chromium'da, telefon boyutunda, tr-TR / Europe/Istanbul.
   Değişiklik yaptıktan sonra bunu çalıştırın; hepsi geçmeden yayınlamayın.
   ============================================================ */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8097;
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.webmanifest':'application/manifest+json','.png':'image/png','.json':'application/json'};

const srv = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end('nf'); }
  res.writeHead(200, {'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
                      'Service-Worker-Allowed':'/'});
  res.end(fs.readFileSync(f));
});
await new Promise(r=>srv.listen(PORT, r));
const BASE = `http://localhost:${PORT}/`;

const errors=[], ok=[], fail=[];
const T = (name, cond, extra='') => (cond ? ok : fail).push(name + (extra?` — ${extra}`:''));

// Chromium yolu: Playwright'ın kendi indirdiği, yoksa ortamdaki
let exe;
for (const c of ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
                 '/opt/pw-browsers/chromium/chrome-linux/chrome']) if (fs.existsSync(c)) { exe = c; break; }

const browser = await chromium.launch(exe ? {executablePath:exe, args:['--no-sandbox']} : {args:['--no-sandbox']});
const ctx = await browser.newContext({ viewport:{width:412,height:915}, deviceScaleFactor:2,
  isMobile:true, hasTouch:true, locale:'tr-TR', timezoneId:'Europe/Istanbul', acceptDownloads:true });
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') errors.push('CONSOLE: '+m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));

await page.goto(BASE, { waitUntil:'networkidle' });

/* ─── 1. Açılış ve PWA ─── */
T('Sayfa açıldı', await page.title() === 'Turta — Duruşma Takip', await page.title());
T('Hoş geldin kartı', await page.locator('.welcome').isVisible());
const sw = await page.evaluate(async()=>{ const r=await navigator.serviceWorker.getRegistration();
  if(!r) return 'none'; await navigator.serviceWorker.ready; return r.active?'active':'pending'; });
T('Service worker etkin', sw==='active', sw);
for (const f of ['manifest.webmanifest','icons/icon-192.png','icons/icon-512.png',
                 'icons/icon-maskable-512.png','sw.js']) {
  const r = await page.request.get(BASE+f);
  T('Erişilebilir: '+f, r.ok(), String(r.status()));
}
const mf = await (await page.request.get(BASE+'manifest.webmanifest')).json();
T('Manifest standalone', mf.display==='standalone');
T('Manifest 192+512 ikon içeriyor',
  mf.icons.some(i=>i.sizes==='192x192') && mf.icons.some(i=>i.sizes==='512x512'));
T('Maskable ikon var', mf.icons.some(i=>i.purpose==='maskable'));
T('Sürümler eşleşiyor',
  (await page.evaluate(()=>APP_VERSION)) === fs.readFileSync(path.join(ROOT,'sw.js'),'utf-8')
    .match(/const VERSION = 'v([\d.]+)'/)[1],
  'index.html APP_VERSION ile sw.js VERSION aynı olmalı');

/* ─── 2. Tarih / dil yardımcıları ─── */
const u = await page.evaluate(()=>({
  fold:[fold('İstanbul'),fold('ŞİŞLİ'),fold('Ağır Ceza')],
  relToday:relLabel(todayISO())[0], relTom:relLabel(addDays(todayISO(),1))[0],
  clamp:addMonths('2026-01-31',1),
  norm:[normDate('15.10.2026'),normDate('2026-10-15'),normDate('15/10/26')],
  p1:smartParse('15.10.2026 - 10:30 - Bakırköy 5. Aile Mahkemesi - 2025/123 Esas'),
  p2:smartParse('Duruşma Tarihi: 22/11/2026 Saat: 09:15\nMahkeme: Şanlıurfa 3. Asliye Ticaret Mahkemesi\nEsas No: 2026/456'),
  p3:smartParse('2025/1447 E. 18 Kasım 2026 Perşembe 10:15 Şanlıurfa Asliye Ticaret Mahkemesi'),
  bulk:bulkParse('15.10.2026 10:30 3. Asliye Hukuk Mahkemesi 2025/123 E.\nbaşlık satırı\n22.10.2026 09:00 5. Aile Mahkemesi 2026/45 E.')
}));
T('Türkçe katlama İ→i', u.fold[0]==='istanbul', u.fold[0]);
T('Türkçe katlama Ş→s', u.fold[1]==='sisli', u.fold[1]);
T('BUGÜN doğru (UTC kayması yok)', u.relToday==='BUGÜN', u.relToday);
T('YARIN doğru', u.relTom==='YARIN', u.relTom);
T('Ay ekleme taşmıyor', u.clamp==='2026-02-28', u.clamp);
T('Tarih biçimleri', JSON.stringify(u.norm)==='["2026-10-15","2026-10-15","2026-10-15"]', JSON.stringify(u.norm));
T('Ayrıştırma: tire ayrılmış', u.p1.date==='2026-10-15'&&u.p1.time==='10:30'&&u.p1.file==='2025/123 E.'
  &&/Aile Mahkemesi/.test(u.p1.court||''), JSON.stringify(u.p1));
T('Ayrıştırma: çok satırlı UYAP', u.p2.date==='2026-11-22'&&u.p2.time==='09:15'
  &&/^2026\/456/.test(u.p2.file||''), JSON.stringify(u.p2));
T('Ayrıştırma: Türkçe ay adı', u.p3.date==='2026-11-18'&&u.p3.time==='10:15', JSON.stringify(u.p3));
T('Ayrıştırma: mahkeme adı tarihten temizlendi',
  /^Şanlıurfa Asliye Ticaret Mahkemesi$/.test((u.p3.court||'').trim()), JSON.stringify(u.p3.court));
T('Toplu ayrıştırma başlığı atlıyor', u.bulk.length===2, JSON.stringify(u.bulk.map(x=>x.date)));

/* ─── 3. Veri ve render ─── */
await page.evaluate(()=>{
  const t=todayISO();
  S.hearings=[
    {id:'a1',date:t,time:'09:30',court:'Şanlıurfa 3. Asliye Hukuk Mahkemesi',file:'2025/11 E.',client:'Demir',type:'ana',status:'active',note:'Bilirkişi raporu'},
    {id:'a2',date:t,time:'10:15',court:'Şanlıurfa 2. İş Mahkemesi',file:'2026/22 E.',client:'Aydın',type:'ek',status:'active'},
    {id:'a3',date:addDays(t,1),time:'11:00',court:'Şanlıurfa 1. Aile Mahkemesi',file:'2026/33 E.',type:'ana',status:'active'},
    {id:'a4',date:addDays(t,-40),time:'09:00',court:'Eski Mahkeme <script>x</script>',file:'2025/44 E.',client:"O'Brien & Co",type:'ana',status:'active'},
    {id:'a5',date:addDays(t,20),time:'14:00',court:'Şanlıurfa Ağır Ceza',file:'2026/55 E.',type:'tev',status:'active'}
  ].map(normalize);
  S.settings.warnSeen=true;
  // Yedek panelinin aşağıdaki bölümleri engellememesi için: bugün yedeklenmiş say.
  // 11. bölüm bunu bilerek sıfırlayıp yedek akışını ayrıca test eder.
  S.settings.lastBackupDate=todayISO(); S.settings.changesSinceBackup=0;
  saveSettings(); persist({undoable:false}); renderAll();
});
await page.waitForTimeout(300);
T('Bugün+yarın 3 satır', await page.locator('#agenda .hrow').count()===3);
T('“İşaret bekliyor” kutusu yok (kaldırıldı)', await page.locator('.stale').count()===0);
T('Sonrası olmayan geçmiş kayıt "Geçti"', await page.evaluate(()=>effStatus(byId('a4')))==='past');
T('XSS kaçışı çalışıyor',
  await page.evaluate(()=>!document.querySelector('#agenda').innerHTML.includes('<script>x</script>')));

/* ─── 4. Çakışma ─── */
const cf = await page.evaluate(()=>({
  same: (c=>c&&{gap:c.gap,cross:c.cross})(conflictFor(todayISO(),'09:45','ana','zz')),
  cross:(c=>c&&{gap:c.gap,cross:c.cross})(conflictFor(todayISO(),'10:00','ek','a2')),
  all: findConflicts().map(x=>({gap:x.gap,cross:x.cross}))
}));
T('Çakışma tespiti', !!cf.same, JSON.stringify(cf.same));
T('Bina değişikliği ayırt ediliyor', cf.cross&&cf.cross.cross===true, JSON.stringify(cf.cross));
T('Çapraz bina çakışması listeleniyor', cf.all.some(x=>x.cross), JSON.stringify(cf.all));

/* ─── 5. Erteleme ─── */
await page.locator('.hrow-in').first().click(); await page.waitForTimeout(250);
T('Detay paneli açıldı', await page.locator('#sheet .acts').isVisible());
await page.locator('#sheet [data-act="postpone"]').first().click(); await page.waitForTimeout(300);
T('Ertele paneli açıldı', await page.locator('#p-q').isVisible());
await page.locator('#p-q .pick').nth(5).click(); await page.waitForTimeout(150);
await page.locator('#p-r .pick').first().click(); await page.waitForTimeout(100);
T('Gerekçe cipi nota yazıyor', (await page.locator('#p-note').inputValue()).length>5);
const nd = await page.locator('#p-date').inputValue();
T('Ertelenen tarih iş günü', await page.evaluate(d=>!isOffDay(d), nd), nd);
await page.locator('#p-save').click(); await page.waitForTimeout(350);
const af = await page.evaluate(()=>({n:S.hearings.length, old:byId('a1').status,
  chain:S.hearings.filter(h=>h.prevId==='a1').length, nr:S.hearings.find(h=>h.prevId==='a1')}));
T('Erteleme yeni kayıt üretti', af.n===6, 'kayıt='+af.n);
T('Eski kayıt ertelendi oldu', af.old==='postponed', af.old);
T('Zincir bağı kuruldu', af.chain===1);
T('Yeni kayıt dosya bilgisini taşıdı', af.nr&&af.nr.file==='2025/11 E.'&&af.nr.status==='active');
await page.evaluate(()=>doUndo()); await page.waitForTimeout(200);
T('Geri al ertelemeyi tersine çevirdi',
  await page.evaluate(()=>S.hearings.length===5 && byId('a1').status==='active'));

/* ─── 6. Kalıcılık ─── */
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(500);
T('Veri yeniden yüklemede korundu', await page.evaluate(()=>S.hearings.length)===5);

/* ─── 7. Sayfalar ─── */
await page.locator('[data-seg="calendar"]').click(); await page.waitForTimeout(250);
T('Takvim ızgarası', await page.locator('#calgrid .cell').count()>=28);
await page.locator('[data-seg="week"]').click(); await page.waitForTimeout(250);
T('14 günlük şerit', await page.locator('.strip .sd').count()===14);
await page.locator('[data-nav="files"]').click(); await page.waitForTimeout(250);
T('Dosyalar doldu', await page.locator('#files .fgroup').count()>=4);
T('Dosyada sonraki duruşma görünüyor', await page.locator('#files .fg-next').count()>=1);
await page.locator('[data-nav="stats"]').click(); await page.waitForTimeout(250);
T('Özet doldu', await page.locator('#stats .scard').count()===6);
await page.locator('[data-nav="settings"]').click(); await page.waitForTimeout(250);
T('Ayarlar doldu', await page.locator('#settings .sect').count()>=8);
T('Ayarlarda veri silinme uyarısı', (await page.locator('#settings').innerText()).includes('Çerezler ve site'));

/* ─── 8. Arama ─── */
await page.locator('[data-nav="agenda"]').click(); await page.waitForTimeout(150);
await page.locator('[data-act="search:toggle"]').click();
await page.locator('#q').fill('sanliurfa is'); await page.waitForTimeout(250);
T('Aksansız Türkçe arama', await page.locator('#agenda .hrow').count()>=1);
await page.locator('[data-act="search:close"]').click(); await page.waitForTimeout(150);

/* ─── 9. Dışa aktarma ─── */
const ics = await page.evaluate(()=>buildICS(S.hearings.slice(0,2)));
T('ICS yapısı', ics.startsWith('BEGIN:VCALENDAR')&&ics.trim().endsWith('END:VCALENDAR'));
T('ICS CRLF', ics.includes('\r\n') && !/[^\r]\n/.test(ics));
T('ICS sabit UID (kopya değil güncelleme)', (ics.match(/UID:/g)||[]).length===2);
T('ICS Istanbul saat dilimi', ics.includes('TZID:Europe/Istanbul'));
const bk = await page.evaluate(()=>JSON.parse(backupPayload()));
T('Yedek biçimi', bk.app==='Turta'&&Array.isArray(bk.hearings)&&bk.count===5);

/* ─── 10. Türkçe alan adlarıyla içe aktarma ─── */
const al = await page.evaluate(()=>normalize({mahkeme:'Şanlıurfa 1. Sulh Hukuk',dosyaNo:'2024/12 E.',
  tarih:'05.03.2027',saat:'14.30',taraf:'Demir',bina:'Ek Bina',durum:'Ertelendi'}));
T('Türkçe alan adları eşleniyor',
  al.date==='2027-03-05'&&al.time==='14:30'&&al.type==='ek'&&al.status==='postponed'&&al.client==='Demir',
  JSON.stringify({d:al.date,t:al.time,ty:al.type,s:al.status}));

/* ─── 11. Yedek koruması ─── */
await page.evaluate(()=>{ S.settings.lastBackupDate=null; S.settings.changesSinceBackup=0;
                          S.settings.backupSnoozeUntil=null; saveSettings(); renderBanners(); });
await page.waitForTimeout(200);
T('Yedeksiz kırmızı şerit', await page.locator('.banner.bad').isVisible());
T('Şerit metni', (await page.locator('.banner.bad').innerText()).includes('Hiç yedek yok'));
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(1300);
T('Açılışta yedek paneli', (await page.locator('#sheet .sheet-title').innerText()).includes('Yedek Zamanı'));
T('Panelde Drive önde', (await page.locator('#bk-share').innerText()).includes('Drive'));
await page.locator('#bk-later').click(); await page.waitForTimeout(300);
await page.reload({waitUntil:'networkidle'}); await page.waitForTimeout(1300);
T('Yarın hatırlat paneli susturdu', await page.locator('#sheet-host').isHidden());
T('Şerit yine de duruyor', await page.locator('.banner.bad').isVisible());
const dl = page.waitForEvent('download');
await page.locator('.banner.bad button').click(); await page.waitForTimeout(400);
await page.locator('#bk-dl').click();
const d = await dl;
T('Yedek dosyası indi', /^turta_yedek_\d{4}-\d{2}-\d{2}\.json$/.test(d.suggestedFilename()), d.suggestedFilename());
T('İnen yedek geçerli', (j=>j.app==='Turta'&&j.hearings.length===5)(JSON.parse(fs.readFileSync(await d.path(),'utf-8'))));
await page.waitForTimeout(400);
T('Yedek sonrası şerit kalktı', await page.locator('.banner.bad').count()===0);
T('Değişiklik sayacı sıfırlandı', await page.evaluate(()=>S.settings.changesSinceBackup)===0);
await page.evaluate(()=>{ for(let i=0;i<20;i++) pushUndo({label:'t',puts:[],dels:[]}); renderBanners(); });
T('20 değişiklikte tekrar uyarı',
  (dd=>dd&&dd.kind==='changes')(await page.evaluate(()=>backupDue())));

/* ─── 12. Yerleşim ─── */
const ovf = await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
T('Yatay kaydırma yok', ovf<=1, 'fazla px='+ovf);

/* ─── 12b. v9 hatası: onay panelinde "Evet" yok sayılıyordu ─── */
const cfy = await page.evaluate(async()=>{
  const p = confirmSheet({title:'Deneme', body:'?'}); document.querySelector('#cf-ok').click(); return await p; });
const cfn = await page.evaluate(async()=>{
  const p = confirmSheet({title:'Deneme', body:'?'}); document.querySelector('#cf-no').click(); return await p; });
T('Onay paneli: Evet → true, Vazgeç → false', cfy===true && cfn===false, JSON.stringify([cfy,cfn]));
const nBefore = await page.evaluate(()=>S.hearings.length);
await page.locator('#agenda .hrow-in').first().click(); await page.waitForTimeout(250);
await page.locator('#sheet [data-act="del"]').click(); await page.waitForTimeout(250);
await page.locator('#cf-ok').click(); await page.waitForTimeout(250);
T('Arayüzden silme gerçekten siliyor', await page.evaluate(()=>S.hearings.length)===nBefore-1);
await page.evaluate(()=>doUndo()); await page.waitForTimeout(150);

/* ─── 13. v10: geçmiş duruşmalar, dosya kimliği, tarih, içe aktarma ─── */
const v10 = await page.evaluate(()=>{
  const t=todayISO();
  const C='Şanlıurfa 3. Asliye Hukuk Mahkemesi';
  S.hearings=[
    {id:'p1',date:addDays(t,-90),time:'09:00',court:C,file:'2025/123 E.',status:'active'},
    {id:'p2',date:addDays(t,-30),time:'09:00',court:'şanlıurfa 3. asliye hukuk',file:'2025/123 Esas',status:'active'},
    {id:'p3',date:addDays(t,25),time:'10:00',court:C,file:'2025/123 E.',status:'active'},
    // Aynı esas no, BAŞKA mahkeme → ayrı dosya
    {id:'q1',date:addDays(t,-10),time:'11:00',court:'Şanlıurfa 1. İş Mahkemesi',file:'2025/123 E.',status:'active'},
    // Aynı esas no, talimat dosyası → ayrı dosya
    {id:'r1',date:addDays(t,-12),time:'11:00',court:C,file:'2025/123 Tal.',status:'active'}
  ].map(normalize);
  persist({silent:true}); renderAll();
  return {
    p1:effStatus(byId('p1')), p2:effStatus(byId('p2')), p3:effStatus(byId('p3')),
    q1:effStatus(byId('q1')), r1:effStatus(byId('r1')),
    sameKey: fileKey(byId('p1'))===fileKey(byId('p2')),
    diffCourt: fileKey(byId('p1'))!==fileKey(byId('q1')),
    diffTal: fileKey(byId('p1'))!==fileKey(byId('r1')),
    stored: byId('p1').status,
    groups: fileGroups().size
  };
});
T('Sonrası olan geçmiş kayıt → Ertelendi', v10.p1==='postponed' && v10.p2==='postponed', JSON.stringify(v10));
T('Gelecek kayıt aktif kalır', v10.p3==='active');
T('Ertelendi çıkarımı kayda yazılmaz', v10.stored==='active');
T('Yazım farkı aynı dosya (E./Esas, Mahkemesi eki)', v10.sameKey);
T('Aynı esas no farklı mahkeme = ayrı dosya', v10.diffCourt && v10.q1==='past');
T('Talimat dosyası ayrı', v10.diffTal && v10.r1==='past');
T('Dosya grupları doğru', v10.groups===3, 'grup='+v10.groups);
await page.locator('[data-nav="files"]').click(); await page.waitForTimeout(200);
T('Yaklaşanı olmayan dosyalar daraltılmış', await page.locator('#files .fgroup').count()===1
  && await page.locator('#files .idle-toggle').isVisible());
await page.locator('#files .idle-toggle').click(); await page.waitForTimeout(150);
T('Düğmeyle görünür oluyor', await page.locator('#files .fgroup').count()===3);
await page.locator('#files .fg-head').first().click(); await page.waitForTimeout(250);
T('Dosya paneli zaman tüneli', await page.locator('#sheet .tl-i').count()===3);
await page.evaluate(()=>closeSheet());
await page.locator('[data-nav="agenda"]').click(); await page.waitForTimeout(150);
await page.locator('[data-seg="all"]').click(); await page.waitForTimeout(250);
T('“Tümü” bugüne kaydırıyor', await page.evaluate(()=>window.scrollY>0 || document.documentElement.scrollHeight<=innerHeight+5));

const dt = await page.evaluate(()=>({
  bad: normalize({date:'31.02.2026',court:'X'}).date,
  bad2: normalize({date:'tarih yok',court:'X'}).date,
  n:[normDate('2026-7-5'),normDate('2026.07.05'),normDate('46310'),normDate('5/7/2026 10:30')],
  pb: (r=>({n:r.arr.length,s:r.skipped}))(parseBackupFull(JSON.stringify({hearings:[
        {date:'2026-12-01',court:'A'},{date:'saçma',court:'B'},{tarih:'03.12.2026',mahkeme:'C'}]}))),
  lenient: (parseJSONLenient('{"hearings":[{"date":"2026-12-01"}]}\n]}eski artık"}')||{}).hearings,
  jan: smartParse('5 Ocak saat 10:00 Asliye Hukuk Mahkemesi').date,
  janOk: smartParse('5 Ocak saat 10:00 Asliye Hukuk Mahkemesi').date > addDays(todayISO(),-31)
}));
T('Geçersiz tarih BUGÜN olmuyor', dt.bad==='' && dt.bad2==='', JSON.stringify([dt.bad,dt.bad2]));
T('Tarih biçimleri (tek hane, nokta, Excel)', JSON.stringify(dt.n)==='["2026-07-05","2026-07-05","2026-10-15","2026-07-05"]', JSON.stringify(dt.n));
T('İçe aktarmada tarihsiz kayıt sayılıp atlanıyor', dt.pb.n===2 && dt.pb.s===1, JSON.stringify(dt.pb));
T('Sonu bozuk JSON okunuyor', Array.isArray(dt.lenient) && dt.lenient.length===1);
T('Yılsız "5 Ocak" geçmişe yazılmıyor', dt.janOk, dt.jan);

const mg = await page.evaluate(()=>{
  const L=[{id:'a',updatedAt:100,v:'L'},{id:'b',updatedAt:300,v:'L'},{id:'c',updatedAt:100,v:'L'}];
  const R=[{id:'a',updatedAt:200,v:'R'},{id:'b',updatedAt:200,v:'R'},{id:'d',updatedAt:100,v:'R'},{id:'e',updatedAt:500,v:'R'}];
  const m = mergeSets(L,R,{c:150},{d:150,e:400});
  const o={}; m.hearings.forEach(h=>o[h.id]=h.v); return o;
});
T('Senkron birleştirme: en son değişen kazanır, silinenler dönmez',
  JSON.stringify(mg)==='{"a":"R","b":"L","e":"R"}', JSON.stringify(mg));

/* ─── 14. v10: bildirim planı ve sesler (tarayıcı) ─── */
const np = await page.evaluate(()=>{
  const now = new Date(2030,0,10,8,0).getTime();
  S.hearings=[
    {id:'n1',date:'2030-01-10',time:'10:00',court:'A',status:'active'},
    {id:'n2',date:'2030-01-10',time:'08:20',court:'B',status:'active'},     // 30 dk'dan az kaldı
    {id:'n3',date:'2030-01-11',time:'09:00',court:'C',status:'postponed'},
    {id:'n4',date:'2030-06-01',time:'09:00',court:'D',status:'active'}      // ufkun dışında
  ].map(normalize);
  S.settings.notifyLead=30;
  const p = notifPlan(now);
  return {n:p.length, at:p[0]&&p[0].at.getTime(), want:new Date(2030,0,10,9,30).getTime(),
          title:p[0]&&p[0].title, id:p[0]&&p[0].id, id2:notifId(S.hearings[0])};
});
T('Bildirim 30 dk önceye kuruluyor', np.n===1 && np.at===np.want, JSON.stringify(np));
T('Bildirim kimliği kararlı', np.id===np.id2 && np.id>0 && np.id<2147483647);
for (const s of ['turta_zil','turta_kristal','turta_damla','turta_civilti','turta_kutu']) {
  const r = await page.request.get(BASE+'sounds/'+s+'.wav');
  const b = await r.body();
  const dur = b.length>44 ? (b.length-44)/(b.readUInt32LE(28)) : 0;
  T('Ses dosyası 1–2 sn: '+s, r.ok() && dur>=0.9 && dur<=2.0, dur.toFixed(2)+' sn');
}
await page.locator('[data-nav="settings"]').click(); await page.waitForTimeout(200);
T('Ayarlarda APK indirme bağlantısı', (await page.locator('#settings').innerText()).includes('Android Uygulamasını İndir'));
await page.locator('[data-act="notif:sound"]').click(); await page.waitForTimeout(250);
T('Ses seçicide 5 ses', await page.locator('#sheet .snd').count()===5);
await page.locator('#sheet [data-pick="turta_damla"]').click(); await page.waitForTimeout(150);
T('Ses seçimi kaydedildi', await page.evaluate(()=>S.settings.notifySound)==='turta_damla');
await page.evaluate(()=>closeSheet());

/* ─── 15. v10: Android uygulaması (sahte Capacitor köprüsüyle) ─── */
const nctx = await browser.newContext({ viewport:{width:412,height:915}, isMobile:true, hasTouch:true,
  locale:'tr-TR', timezoneId:'Europe/Istanbul' });
await nctx.addInitScript(()=>{
  const calls=[], pending=[], L={};
  window.__calls=calls; window.__pending=pending; window.__L=L; window.__remote='';
  window.Capacitor = {
    isNativePlatform:()=>true, getPlatform:()=>'android',
    addListener:(p,ev,cb)=>{ (L[p+'.'+ev]=L[p+'.'+ev]||[]).push(cb); return {remove(){}}; },
    nativePromise: async (p,m,o)=>{
      o = JSON.parse(JSON.stringify(o||{})); calls.push({k:p+'.'+m, o});
      switch(p+'.'+m){
        case 'LocalNotifications.getPending': return {notifications:pending.map(n=>({id:n.id}))};
        case 'LocalNotifications.cancel': (o.notifications||[]).forEach(c=>{
          const i=pending.findIndex(n=>n.id===c.id); if(i>=0) pending.splice(i,1); }); return {};
        case 'LocalNotifications.schedule': o.notifications.forEach(n=>pending.push(n));
          return {notifications:o.notifications.map(n=>({id:n.id}))};
        case 'LocalNotifications.checkPermissions':
        case 'LocalNotifications.requestPermissions': return {display:'granted'};
        case 'LocalNotifications.checkExactNotificationSetting': return {exact_alarm:'granted'};
        case 'TurtaNative.syncPickOpen':
        case 'TurtaNative.syncPickCreate': return {uri:'content://drive/turta', name:'turta_senkron.json', persisted:true};
        case 'TurtaNative.syncRead': return {uri:o.uri, name:'turta_senkron.json', data:window.__remote};
        case 'TurtaNative.syncWrite': window.__remote=o.data; return {uri:o.uri};
        case 'TurtaNative.batteryStatus': return {ignoring:false};
        default: return {};
      }
    }
  };
});
// APK güncelleme denetimi GitHub'a gitmesin: sahte yanıt
await nctx.route('https://api.github.com/**', r=>r.fulfill({json:{tag_name:'v99.0.0'}}));
const np2 = await nctx.newPage();
np2.on('pageerror', e => errors.push('NATIVE PAGEERROR: '+e.message));
np2.on('console', m => { if (m.type()==='error') errors.push('NATIVE CONSOLE: '+m.text()); });
await np2.goto(BASE, {waitUntil:'networkidle'}); await np2.waitForTimeout(400);
T('APK: yerel mod algılandı', await np2.evaluate(()=>NATIVE===true));
T('APK: service worker kaydedilmedi',
  await np2.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length===0));
T('APK: karşılama kartında Drive bağlama', (await np2.locator('.welcome').innerText()).includes('Drive'));

// Tarayıcı sürümünden Drive'a gönderilmiş bir yedek → APK'da bağla
await np2.evaluate(()=>{
  const t=todayISO();
  window.__remote = JSON.stringify({app:'Turta', appVersion:'9.1.0', hearings:[
    {id:'w1',date:addDays(t,2),time:'10:00',court:'Şanlıurfa 2. Asliye Ceza',file:'2026/7 E.',status:'active',updatedAt:1000},
    {id:'w2',date:addDays(t,3),time:'09:30',court:'Şanlıurfa 1. Aile',file:'2026/8 E.',status:'active',updatedAt:1000},
    {id:'w3',date:addDays(t,-20),time:'09:30',court:'Şanlıurfa 1. Aile',file:'2026/8 E.',status:'active',updatedAt:1000}
  ]}, null, 2);
});
await np2.locator('.welcome [data-act="sync:open"]').click(); await np2.waitForTimeout(300);
T('APK: bağlama onayı kayıt sayısını gösteriyor', (await np2.locator('#sheet').innerText()).includes('3'));
await np2.locator('#cf-ok').click(); await np2.waitForTimeout(600);
const s1 = await np2.evaluate(()=>({n:S.hearings.length, uri:(S.settings.sync||{}).uri,
  w3:effStatus(byId('w3')), backup:S.settings.lastBackupDate===todayISO()}));
T('APK: Drive yedeğinden veri geldi', s1.n===3 && s1.uri==='content://drive/turta', JSON.stringify(s1));
T('APK: senkron yedek sayılıyor (uyarı şeridi yok)', s1.backup && await np2.locator('.banner.bad').count()===0);
T('APK: geçmiş duruşma ertelenmiş sayılıyor', s1.w3==='postponed');

// Yerelde ekle + sil → Drive dosyasına yazılmalı
await np2.evaluate(()=>{ addHearing({date:addDays(todayISO(),5),time:'11:00',court:'Yeni Mahkeme',file:'2026/99 E.'});
                         removeHearing('w2'); });
await np2.waitForTimeout(3300);
const r1 = await np2.evaluate(()=>{ const j=JSON.parse(window.__remote);
  return {n:j.hearings.length, tomb:!!(j.tombstones||{}).w2, hasNew:j.hearings.some(h=>h.court==='Yeni Mahkeme')}; });
T('APK: değişiklik Drive dosyasına yazıldı', r1.n===3 && r1.hasNew && r1.tomb, JSON.stringify(r1));

// Başka cihaz Drive dosyasını değiştirdi → açılışta/geri dönüşte alınır
await np2.evaluate(()=>{ const j=JSON.parse(window.__remote);
  j.hearings.find(h=>h.id==='w1').time='14:45'; j.hearings.find(h=>h.id==='w1').updatedAt=Date.now()+1000;
  window.__remote=JSON.stringify(j); });
await np2.evaluate(()=>syncNow({quiet:true})); await np2.waitForTimeout(200);
T('APK: diğer cihazdaki değişiklik alındı', await np2.evaluate(()=>byId('w1').time)==='14:45');
T('APK: silinen kayıt geri gelmedi', await np2.evaluate(()=>!byId('w2')));

// Bildirimler
await np2.evaluate(()=>window.__calls.length=0);
await np2.evaluate(()=>toggleNotifications()); await np2.waitForTimeout(400);
const nc = await np2.evaluate(()=>{
  const ch = window.__calls.find(c=>c.k==='LocalNotifications.createChannel');
  const sc = window.__calls.filter(c=>c.k==='LocalNotifications.schedule').pop();
  const n = sc && sc.o.notifications[0];
  const h = n && byId(n.extra.hid);
  return {ch:ch&&ch.o, cnt:sc?sc.o.notifications.length:0, ch2:n&&n.channelId, snd:n&&n.sound,
          exact:n&&n.isExactNotification, idle:n&&n.schedule.allowWhileIdle,
          diff: h ? (hearingStart(h).getTime()-new Date(n.schedule.at).getTime())/60000 : null,
          icon:n&&n.smallIcon, info:S.notifInfo};
});
T('APK: ses kanalı oluşturuldu', nc.ch && nc.ch.id==='durusma_turta_zil' && nc.ch.sound==='turta_zil.wav'
  && nc.ch.importance===4, JSON.stringify(nc.ch));
T('APK: aktif yaklaşan duruşmalara bildirim kuruldu', nc.cnt===2, 'adet='+nc.cnt);
T('APK: 30 dk önce, kesin zamanlı, uykuda da', nc.diff===30 && nc.exact===true && nc.idle===true, JSON.stringify(nc));
T('APK: bildirim kanalı + ses + beyaz ikon', nc.ch2==='durusma_turta_zil' && nc.snd==='turta_zil.wav' && nc.icon==='ic_stat_turta');
await np2.evaluate(()=>{ window.__calls.length=0; openSoundPicker(); });
await np2.locator('#sheet [data-pick="turta_kutu"]').click(); await np2.waitForTimeout(1700);
const ns = await np2.evaluate(()=>({
  sc:window.__calls.filter(c=>c.k==='LocalNotifications.schedule').pop(),
  del:window.__calls.filter(c=>c.k==='LocalNotifications.deleteChannel').map(c=>c.o.id),
  pend:window.__pending.length }));
T('APK: ses değişince bildirimler yeni kanalla yeniden kuruldu',
  ns.sc && ns.sc.o.notifications.every(n=>n.channelId==='durusma_turta_kutu') && ns.pend===2, JSON.stringify(ns.pend));
T('APK: eski ses kanalları temizlendi', ns.del.includes('durusma_turta_zil'));
await np2.evaluate(()=>closeSheet());
await np2.evaluate(()=>{ window.__calls.length=0; S.settings.notifyLead=60; saveSettings(); syncNotifications(); });
await np2.waitForTimeout(300);
const n60 = await np2.evaluate(()=>{ const n=window.__pending[0]; const h=byId(n.extra.hid);
  return (hearingStart(h).getTime()-new Date(n.schedule.at).getTime())/60000; });
T('APK: süre 60 dk yapılınca yeniden kuruldu', n60===60, String(n60));

// Yerel indirme, ayarlar, geri tuşu, bildirime dokunma
await np2.evaluate(()=>{ window.__calls.length=0; backupJSON(); }); await np2.waitForTimeout(200);
const dlc = await np2.evaluate(()=>window.__calls.find(c=>c.k==='TurtaNative.saveToDownloads'));
T('APK: yedek İndirilenler/Turta’ya yerel kayıtla', !!dlc && /^turta_yedek_.*\.json$/.test(dlc.o.name));
await np2.locator('[data-nav="settings"]').click(); await np2.waitForTimeout(300);
const stx = await np2.locator('#settings').innerText();
T('APK: ayarlarda bildirim + Drive bölümleri', stx.includes('Duruşma Bildirimi') && stx.includes('Bağlı'));
T('APK: pil kısıtlaması önerisi', stx.includes('Pil Kısıtlamasını Kaldır'));
await np2.evaluate(()=>{ openSoundPicker(); window.__L['App.backButton'][0](); });
T('APK: geri tuşu paneli kapatıyor', await np2.locator('#sheet-host').isHidden());
await np2.evaluate(()=>window.__L['App.backButton'][0]()); await np2.waitForTimeout(100);
T('APK: geri tuşu ana sayfaya dönüyor', await np2.evaluate(()=>S.page)==='agenda');
await np2.evaluate(()=>window.__L['LocalNotifications.localNotificationActionPerformed'][0](
  {actionId:'tap', notification:{id:1, extra:{hid:'w1'}}}));
await np2.waitForTimeout(500);
T('APK: bildirime dokununca duruşma açılıyor', (await np2.locator('#sheet .sheet-title').innerText()).length>0
  && (await np2.locator('#sheet').innerText()).includes('2026/7'));
const ovf2 = await np2.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
T('APK: yatay kaydırma yok', ovf2<=1, 'fazla px='+ovf2);
T('APK: yeni sürüm şeridi', (await np2.locator('#banners').innerText()).includes('v99.0.0'));
await nctx.close();

console.log('\n────── GEÇTİ ('+ok.length+') ──────');
ok.forEach(x=>console.log('  ✅ '+x));
if (fail.length){ console.log('\n────── KALDI ('+fail.length+') ──────'); fail.forEach(x=>console.log('  ❌ '+x)); }
if (errors.length){ console.log('\n────── KONSOL HATALARI ──────'); [...new Set(errors)].forEach(x=>console.log('  ⚠️  '+x)); }
console.log('\nSONUÇ: '+ok.length+' geçti, '+fail.length+' kaldı, '+new Set(errors).size+' konsol hatası');

await browser.close(); srv.close();
process.exit(fail.length || errors.length ? 1 : 0);
