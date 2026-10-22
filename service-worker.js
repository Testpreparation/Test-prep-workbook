/* Nurse＋ PWA: installability and best-effort offline cache.
 * Only same-origin GET responses are cached. Learning data (Firebase/local app storage) is never
 * cleared here; this manager only removes expendable entries from this service-worker cache.
 */
const CACHE_NAME = 'nurse-plus-pwa-v8';
const APP_ROOT = '/Test-prep-workbook/';
const CACHE_LIMIT_BYTES = 100 * 1024 * 1024; // 100 MiB (approximately 100 MB)
const CORE_ASSETS = [
  APP_ROOT,
  APP_ROOT + 'index.html',
  APP_ROOT + 'manifest.webmanifest'
];

// Keep these available for offline launch and the main application shell.
const PROTECTED_PATHS = new Set([
  ...CORE_ASSETS.map(path => new URL(path, self.location.origin).pathname),
  APP_ROOT + 'assets/js/app-core.js',
  APP_ROOT + 'assets/nurse-plus-analytics-addition.js'
].map(path => new URL(path, self.location.origin).pathname));

let cacheTrimPromise = null;

function isProtectedRequest(request) {
  const url = new URL(request.url);
  return url.origin === self.location.origin && PROTECTED_PATHS.has(url.pathname);
}

async function responseSize(response) {
  const contentLength = response.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength)) return Number(contentLength);
  try {
    return (await response.clone().blob()).size;
  } catch (_) {
    // Unknown-size entries are treated conservatively as zero; they are still eligible for eviction.
    return 0;
  }
}

/**
 * Cache API has no reliable last-access timestamp. Cache key order is used as a best-effort
 * oldest-cached-first order. Essential launch files and the main JS are never evicted.
 */
async function trimCacheIfNeeded() {
  if (cacheTrimPromise) return cacheTrimPromise;
  cacheTrimPromise = (async () => {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    const entries = [];
    let totalBytes = 0;

    for (const request of requests) {
      const response = await cache.match(request);
      if (!response) continue;
      const size = await responseSize(response);
      totalBytes += size;
      entries.push({ request, size, protected: isProtectedRequest(request) });
    }

    if (totalBytes <= CACHE_LIMIT_BYTES) return;

    // Remove non-essential, older cached resources first; never delete offline startup assets.
    for (const entry of entries) {
      if (totalBytes <= CACHE_LIMIT_BYTES) break;
      if (entry.protected) continue;
      const deleted = await cache.delete(entry.request);
      if (deleted) totalBytes -= entry.size;
    }

    if (totalBytes > CACHE_LIMIT_BYTES) {
      console.warn('[Nurse＋ PWA] Cache remains above 100 MB because protected offline assets cannot be removed.');
    }
  })().catch(error => {
    console.info('[Nurse＋ PWA] Cache cleanup skipped:', error && error.name || error);
  }).finally(() => {
    cacheTrimPromise = null;
  });
  return cacheTrimPromise;
}

async function cacheResponse(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
    await trimCacheIfNeeded();
  } catch (error) {
    // Quota errors must not break the successful network response or application startup.
    console.info('[Nurse＋ PWA] Cache write skipped:', error && error.name || error);
  }
}

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
      .then(() => trimCacheIfNeeded())
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
          event.waitUntil(cacheResponse(new Request(APP_ROOT + 'index.html'), response.clone()));
        }
        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request)) || (await cache.match(APP_ROOT + 'index.html')) || Response.error();
      })
    );
    return;
  }

  // Keep these application scripts fresh when online, with cached fallback when offline.
  if (url.pathname.endsWith('/assets/nurse-plus-analytics-addition.js') ||
      url.pathname.endsWith('/assets/js/app-core.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' }).then(response => {
        if (response && response.ok && response.type === 'basic') {
          event.waitUntil(cacheResponse(request, response.clone()));
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
          event.waitUntil(cacheResponse(request, response.clone()));
        }
        return response;
      });
      return cached || network.catch(() => cached || Response.error());
    })
  );
});
