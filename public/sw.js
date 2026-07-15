// Minimal, conservative service worker: installable PWA + offline app shell.
// Hashed build assets are cached cache-first but ONLY when the response is OK, so a
// transient 404/500 can never poison the cache. Navigations are network-first so data
// is never stale, falling back to an offline page only when truly offline.
// Bump CACHE whenever this file changes — `activate` purges every older cache.
const CACHE = "ft-v3";
const ASSETS = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Immutable, content-hashed build assets + icons: cache-first, but only ever store a
  // successful response (never cache an error — that would break every later load).
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // Page navigations: always hit the network for fresh data; fall back to the offline
  // shell only when the network is unreachable (a server 5xx is passed through as-is,
  // where the app's error boundary can show a retry).
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
  }
});
