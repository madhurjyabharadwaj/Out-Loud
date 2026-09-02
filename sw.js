/* ============================================================
   Out Loud — service worker
   Scope: project root. Bump CACHE on every deploy.
   ============================================================ */
var CACHE = 'outloud-v1';

var PRECACHE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/apple-touch-icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'fonts/bricolage-grotesque-var-normal-latin-ext.woff2',
  'fonts/bricolage-grotesque-var-normal-latin.woff2',
  'fonts/ibm-plex-mono-400-normal-latin-ext.woff2',
  'fonts/ibm-plex-mono-400-normal-latin.woff2',
  'fonts/ibm-plex-mono-500-normal-latin-ext.woff2',
  'fonts/ibm-plex-mono-500-normal-latin.woff2',
  'fonts/ibm-plex-mono-600-normal-latin-ext.woff2',
  'fonts/ibm-plex-mono-600-normal-latin.woff2',
  'fonts/source-serif-4-400-italic-latin-ext.woff2',
  'fonts/source-serif-4-400-italic-latin.woff2',
  'fonts/source-serif-4-var-normal-latin-ext.woff2',
  'fonts/source-serif-4-var-normal-latin.woff2',
];

/* Cache-first families: immutable, content-addressed assets. */
function isStatic(url){
  return /\/(fonts|icons)\//.test(url.pathname) ||
         /manifest\.webmanifest$/.test(url.pathname);
}

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return c.addAll(PRECACHE);
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(k){
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  /* index.html / navigations: network-first so a redeploy is picked up. */
  if (req.mode === 'navigate' || /(^\/$|\/index\.html$)/.test(url.pathname)) {
    e.respondWith(
      fetch(req).then(function(res){
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put('index.html', copy); });
        }
        return res;
      }).catch(function(){
        return caches.match('index.html').then(function(hit){
          return hit || caches.match('./');
        });
      })
    );
    return;
  }

  /* fonts, icons, manifest: cache-first. */
  if (isStatic(url)) {
    e.respondWith(
      caches.match(req).then(function(hit){
        if (hit) return hit;
        return fetch(req).then(function(res){
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE).then(function(c){ c.put(req, copy); });
          }
          return res;
        });
      })
    );
    return;
  }

  /* everything else same-origin: cache with network fallback. */
  e.respondWith(
    caches.match(req).then(function(hit){
      return hit || fetch(req);
    })
  );
});
