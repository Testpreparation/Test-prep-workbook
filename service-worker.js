/* Nurse＋ PWA: installability and best-effort offline cache.
 * Only same-origin GET requests are cached. HTML navigations are network-first so updates remain visible.
 */
const CACHE_NAME = 'nurse-plus-pwa-v5';
const APP_ROOT = '/Test-prep-workbook/';
const CORE_ASSETS = [
  APP_ROOT,
  APP_ROOT + 'index.html',
  APP_ROOT + 'manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' }))))
      .catch(error => console.warn('[Nurse＋ PWA] Core precache incomplete:', error))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('nurse-plus-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(APP_ROOT + 'index.html', copy)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match(APP_ROOT + 'index.html')) || Response.error();
      })
    );
    return;
  }

  // 分析画面の修正を既存PWA利用者にも確実に反映するため、
  // このJSと画面本体のJSはキャッシュを先に返さず、ネットワークから最新版を取得する。
  // オフライン時は保存済みファイルへフォールバックする。
  if (url.pathname.endsWith('/assets/nurse-plus-analytics-addition.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' }).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
    );
    return;
  }

  if (url.pathname.endsWith('/assets/js/app-core.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' }).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(async () => {
        const cached = await caches.match(request);
        return cached || Response.error();
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(response => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      });
      return cached || network.catch(() => cached || Response.error());
    })
  );
});
