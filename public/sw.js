const CACHE_NAME = "fintrack-cache-v16";
const ASSETS = [
  "/",
  "/index.html",
  "/favicon.png",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-apple.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.warn("SW install: some assets failed to precache", err);
      });
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // 1. NEVER intercept non-GET requests (POST, PUT, DELETE, OPTIONS, etc.)
  // Let the browser handle API mutations, authentication, and form submits natively.
  if (event.request.method !== "GET") {
    return;
  }

  // 2. Only handle HTTP/HTTPS
  if (!event.request.url.startsWith("http")) {
    return;
  }

  let requestUrl;
  try {
    requestUrl = new URL(event.request.url);
  } catch (e) {
    return;
  }

  // 3. COMPLETELY BYPASS all external API requests (Supabase, Yahoo, Currency Exchange, CDNs, etc.)
  // Do NOT call event.respondWith() so the browser executes native, unrestricted fetch.
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  // 4. Navigation requests: Network-first with fallback to cached index.html (SPA routing)
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match("/index.html") || caches.match("/");
      })
    );
    return;
  }

  // 5. Same-origin static assets: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
