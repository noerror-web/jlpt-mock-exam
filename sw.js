/**
 * JLPT Exam Lab — service worker (v6)
 * Navigation: network-first, cached shell as offline fallback.
 * Static assets: cache-first with background refresh.
 * Works from a GitHub Pages subpath (/jlpt-mock-exam/).
 */

const VERSION = "v6.6.3";
const CACHE_NAME = "jlpt-exam-lab-" + VERSION;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/styles.css",
  "./js/core.js",
  "./js/app.js",
  "./js/data/bank-n5.js",
  "./js/data/bank-n5-large.js",
  "./js/data/bank-n5-past.js",
  "./js/data/bank-n5-2021-12.js",
  "./js/data/bank-n5-web.js",
  "./js/data/bank-n4.js",
  "./js/data/furigana.js",
  "./js/data/kanji-readings.js",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch(() => { /* a missing optional asset must not block install */ })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit || network;
    })
  );
});
