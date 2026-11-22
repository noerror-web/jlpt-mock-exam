/**
 * JLPT N5/N4 Mock Exam Generator - Service Worker
 * Stale-while-revalidate strategy for app shell and offline persistence.
 * Designed for GitHub Pages subpath hosting (/jlpt-mock-exam/).
 */

const VERSION = "v5.1";
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

// Install: Cache app shell (no silent skipWaiting; waits for user prompt)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Allow client to trigger skipWaiting on demand (update available toast)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Activate: Clean up old caches and claim clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate for app assets; Network-first for dynamic APIs
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET requests and browser extensions
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
    return; // Let browser fetch directly with app's own localStorage caching
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

  // App Shell: Only cache same-origin GET 200 responses
  if (url.origin === self.location.origin) {
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
