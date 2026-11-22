/**
 * JLPT N5/N4 Mock Exam Generator - Service Worker
 * Network-first strategy for index.html/navigation with offline cache fallback.
 * Stale-while-revalidate for static shell assets.
 * Designed for GitHub Pages subpath hosting (/jlpt-mock-exam/).
 */

const VERSION = "v5.2";
const CACHE_NAME = `jlpt-mock-exam-${VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png"
];

// Install: Cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Allow client to trigger skipWaiting on demand
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate: Clean up old caches and claim clients immediately
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network-First for HTML/navigation; Stale-While-Revalidate for app assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests and non-http(s)
  if (req.method !== "GET" || !url.protocol.startsWith("http")) return;

  // External APIs (kanjiapi, jlpt-vocab, googleapis, telegram, tatoeba, cloudflare workers) -> Bypass SW cache
  if (
    url.hostname.includes("kanjiapi.dev") ||
    url.hostname.includes("jlpt-vocab-api") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("telegram.org") ||
    url.hostname.includes("tatoeba.org") ||
    url.hostname.includes("workers.dev")
  ) {
    return; // Bypass SW cache; app handles its own localStorage caching
  }

  // Google Fonts caching
  if (url.hostname.includes("fonts.googleapis.com") || url.hostname.includes("fonts.gstatic.com")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return cached || new Response("", { status: 408 });
        }
      })
    );
    return;
  }

  // App Shell: Only handle same-origin GET requests
  if (url.origin === self.location.origin) {
    const isNavigationOrHtml =
      req.mode === "navigate" ||
      url.pathname.endsWith("/index.html") ||
      url.pathname.endsWith("/") ||
      url.pathname.endsWith("/jlpt-mock-exam");

    if (isNavigationOrHtml) {
      // Network-First with Offline Cache Fallback for instant updates
      event.respondWith(
        fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const resClone = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
            }
            return res;
          })
          .catch(async () => {
            const cached = await caches.match(req);
            return (
              cached ||
              (await caches.match("./index.html")) ||
              (await caches.match("./")) ||
              new Response("Offline", { status: 503 })
            );
          })
      );
      return;
    }

    // Static Assets (icons, manifest): Stale-While-Revalidate
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(req);
        const networkFetch = fetch(req).then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            cache.put(req, res.clone());
          }
          return res;
        }).catch(() => null);

        return cached || (await networkFetch) || new Response("Offline", { status: 503 });
      })
    );
  }
});
