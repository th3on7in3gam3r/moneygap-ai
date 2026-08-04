/* MoneyGap AI — safe static-only service worker.
 *
 * Caches: shell assets, icons, fonts, Next static JS/CSS bundles.
 * Never caches: /api/*, auth, dashboard HTML, user-specific data.
 */
const CACHE_VERSION = "moneygap-pwa-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/offline.html",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-192.png",
  "/icon-maskable-512.png",
  "/apple-icon.png",
  "/favicon.ico",
  "/favicon-32.png",
  "/MG_Logo.png",
  "/mg-mark.png",
  "/manifest.webmanifest",
];

function isApiOrAuth(url) {
  const path = url.pathname;
  return (
    path.startsWith("/api/") ||
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.includes("clerk") ||
    url.hostname.includes("clerk") ||
    url.hostname.includes("clerk.") ||
    url.hostname.endsWith("accounts.dev")
  );
}

function isStaticAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const path = url.pathname;
  if (path.startsWith("/_next/static/")) return true;
  return /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|gif|webp|svg|ico|webmanifest)$/i.test(
    path,
  );
}

self.addEventListener("install", (event) => {
  // Updates wait for SKIP_WAITING so we never force-refresh mid-task.
  // First install (no prior active worker) may activate immediately.
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await Promise.all(
        PRECACHE_URLS.map((url) => cache.add(url).catch(() => undefined)),
      );
      if (!self.registration.active) {
        await self.skipWaiting();
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never intercept API / auth — always network.
  if (isApiOrAuth(url)) return;

  // Navigations: network-first, offline shell fallback. Do not cache HTML.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match("/offline.html");
          return (
            cached ||
            new Response("Offline", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first with network fill.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(RUNTIME);
            void cache.put(request, response.clone());
          }
          return response;
        } catch {
          return (
            (await caches.match(request)) ||
            new Response("", { status: 504, statusText: "Offline" })
          );
        }
      })(),
    );
  }
});
