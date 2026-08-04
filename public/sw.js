/*
 * Atlas service worker — deliberately conservative.
 *
 * Every number this app shows is derived from a live ledger, so caching a page would mean
 * showing a stale balance. Only the immutable build assets and a bare offline shell are cached;
 * navigations always go to the network first.
 *
 * Bump CACHE whenever this file changes.
 */

const CACHE = "ft-v3";

const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // --- Immutable build assets: cache first ---------------------------------
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          // Only ever store a successful response. A transient 404 or 500 cached here would
          // poison the asset until the cache version changes.
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // --- Navigations: network first ------------------------------------------
  if (request.mode === "navigate") {
    event.respondWith(
      // Only a rejected fetch (genuinely offline) falls back to the shell. A 5xx passes
      // through so the app's own error boundary can offer a retry.
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Everything else goes straight to the network, untouched.
});
