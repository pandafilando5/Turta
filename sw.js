/* ============================================================
   Turta — Service Worker
   Strateji: uygulama kabuğu için "stale-while-revalidate".
   Amaç: uygulama HER ZAMAN anında açılsın (önbellekten),
   yeni sürüm arka planda inip hazır olduğunda kullanıcıya bildirilsin.
   ============================================================ */

const VERSION = 'v9.0.0';
const CACHE = 'turta-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

// ---- Kurulum: kabuğu önbelleğe al ----
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Tek tek ekle: bir dosya 404 olsa bile kurulum çökmesin.
    await Promise.all(ASSETS.map(async url => {
      try { await cache.add(new Request(url, { cache: 'reload' })); }
      catch (e) { console.warn('[sw] önbelleğe alınamadı:', url, e); }
    }));
    self.skipWaiting();
  })());
});

// ---- Etkinleşme: eski önbellekleri temizle ----
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('turta-') && k !== CACHE)
                          .map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    await self.clients.claim();
  })());
});

// ---- İstekler ----
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // dış kaynaklara karışma

  // Gezinme (sayfa açılışı): önbellekten anında ver, arka planda tazele.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match('./index.html');
      const network = fetch(req).then(res => {
        if (res && res.ok) cache.put('./index.html', res.clone());
        return res;
      }).catch(() => null);

      if (cached) { event.waitUntil(network); return cached; }
      const res = await network;
      return res || new Response(
        '<meta charset="utf-8"><h1>Çevrimdışı</h1><p>Uygulama henüz önbelleğe alınmadı. İnternete bağlanıp bir kez açın.</p>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
      );
    })());
    return;
  }

  // Diğer aynı-kaynak GET istekleri: stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);

    if (cached) { event.waitUntil(network); return cached; }
    const res = await network;
    return res || new Response('', { status: 504, statusText: 'Çevrimdışı' });
  })());
});

// ---- Uygulamadan gelen mesajlar ----
self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'GET_VERSION') {
    event.source && event.source.postMessage({ type: 'VERSION', version: VERSION });
  }
});
