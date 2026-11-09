/* Offline app shell. Market data (Binance, Twelve Data) always goes to the network. */
const VERSION = 'gann-v1.0.0';
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest',
  'js/core/engine.js', 'js/core/scanner.js', 'js/data/providers.js', 'js/data/sample-xau.js', 'js/app.js', 'js/pwa.js',
  'vendor/astronomy-engine-2.1.19.min.js', 'vendor/lightweight-charts-4.2.3.standalone.production.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return; // live data: never cached
  // network first for the app itself so updates arrive immediately; cache as offline fallback
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
