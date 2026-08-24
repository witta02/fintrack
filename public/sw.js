const CACHE_NAME = "fintrack-cache-v15";
const ASSETS = ["/", "/index.html", "/favicon.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          return caches.delete(key);
        }),
      );
    }),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith("http")) return;

  // Bypass cache for live financial APIs and external services
  if (
    event.request.url.includes("finance.yahoo.com") ||
    event.request.url.includes("open.er-api.com") ||
    event.request.url.includes("supabase.co") ||
    event.request.url.includes("api.allorigins.win")
  ) {
    return event.respondWith(fetch(event.request));
  }

  // Network-first strategy for app assets
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === "GET") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      }),
  );
});
