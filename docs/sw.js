var CACHE_NAME = 'bmh-cache-v11';
var APP_SHELL = ['./', './index.html', './style.css', './data.js', './core.js', './views.js', './main.js', './system.js', './system.css', './pages.css', './cost.js', './insights.js', './manifest.webmanifest', './icons/icon.svg'];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE_NAME).then(function (c) { return c.addAll(APP_SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname === 'api.github.com') return;

  // App files: network first so updates arrive immediately, cache as offline fallback.
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(req).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('./index.html'); });
    }));
    return;
  }

  // Fonts and CDN scripts: cache first.
  event.respondWith(caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      var copy = res.clone(); caches.open(CACHE_NAME).then(function (c) { c.put(req, copy); });
      return res;
    });
  }));
});
