const CACHE_NAME = 'vida-de-heroi-v6';
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './assets/vida-de-heroi-icon.png', './js/cidadela-gelida.js', './js/forja-vulcanica.js', './js/picos-tempestade.js',
  './assets/frost/frost-queen.png', './assets/frost/frost-golem.png', './assets/frost/ice-mage.png',
  './assets/frost/crystal-wisp.png', './assets/frost/aurora-wings.png', './assets/frost/glacial-blade.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  })));
});
