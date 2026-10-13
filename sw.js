// TUOBA Restaurant OS — service worker (network-first, versioned cache)
const CACHE = 'tuoba-os-v5';
const ASSETS = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './js/i18n.js', './js/state.js', './js/api.js', './js/ui.js', './js/tabs.js', './js/modules.js', './js/app.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon.png', './icons/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: users get fixes immediately; the cache is the offline fallback.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        event.waitUntil(caches.open(CACHE).then(c => c.put(req, copy)));
      }
      return res;
    }).catch(() =>
      caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))
    )
  );
});
