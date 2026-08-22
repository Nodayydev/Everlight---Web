/* Everlight service worker – minimal offline support for static assets */
const CACHE_NAME = "everlight-static-v6-header";

// Only cache same-origin static files. API calls stay network-only.
const STATIC_EXT = /\.(?:js|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map)$/i;

self.addEventListener("install", (event) => {
  // Activate immediately – no waiting for old clients.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests from our own origin.
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for HTML / navigation, cache-first for static assets.
  const isStatic = STATIC_EXT.test(url.pathname) || url.pathname === "/";

  if (!isStatic) {
    // API / dynamic → always network (no cache)
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Try cache first for static assets
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const response = await fetch(req);
        // Only cache successful responses
        if (response.ok) {
          cache.put(req, response.clone());
        }
        return response;
      } catch (err) {
        // Offline and nothing in cache
        return cached || new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })
  );
});
