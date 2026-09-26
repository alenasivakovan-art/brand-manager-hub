var CACHE_NAME = 'bmh-cache-v1';
var APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './manifest.webmanifest',
  './icons/icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) { return cache.addAll(APP_SHELL); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);

  // Never cache/serve GitHub API calls from here — always go to network.
  if (url.hostname === 'api.github.com') return;

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(function (cached) {
        var fetchPromise = fetch(req).then(function (res) {
          if (res && res.ok) caches.open(CACHE_NAME).then(function (cache) { cache.put(req, res.clone()); });
          return res;
        }).catch(function () { return cached || caches.match('./index.html'); });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Third-party assets (fonts, mermaid CDN): cache-first, best effort.
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        caches.open(CACHE_NAME).then(function (cache) { cache.put(req, res.clone()); });
        return res;
      }).catch(function () { return cached; });
    })
  );
});
