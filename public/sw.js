// Service worker: makes the site installable as an app and keeps recently read stories available offline.
// Bump VERSION to force every reader's cache to refresh.
const VERSION = 'v3';
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
// "/" normally, or e.g. "/demo/pravah/" when the site is hosted in a sub-folder.
const BASE = new URL(self.registration.scope).pathname;
const OFFLINE_URL = `${BASE}offline/`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function store(cacheName, request, response, max) {
  const cache = await caches.open(cacheName);
  await cache.put(request, response);
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Leave the admin panel, other websites (YouTube) and non-GET requests alone.
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith(`${BASE}admin`)) return;

  // Pages: network first so readers always get the latest news; cached copy when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) event.waitUntil(store(PAGES, request, response.clone(), 60));
          return response;
        })
        .catch(async () => (await caches.match(request, { ignoreSearch: true })) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Fingerprinted build files (fonts, images, scripts) never change: serve them from the cache.
  if (url.pathname.startsWith(`${BASE}_astro/`)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) event.waitUntil(store(ASSETS, request, response.clone(), 300));
            return response;
          }),
      ),
    );
  }
});
