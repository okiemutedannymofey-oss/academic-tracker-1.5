/*
 * Academic Tracker 1.5 offline support.
 * Save the complete app shell before activating so an installed app can open
 * without a network connection after its first successful online visit.
 */
const CACHE_NAME = "academic-tracker-v15-20261119-offline-fix";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js?v=20261117-root",
  "./manifest.json",
  "./icons/icon-1.5-192.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // addAll is deliberate: a missing app file must fail installation instead
    // of silently leaving the user with an incomplete offline app.
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => (key.startsWith("academic-tracker-v2-") || key.startsWith("academic-tracker-v15-")) && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request, { cache: "no-cache" });
      if (response.ok) {
        // A cache write failure should not prevent the online response.
        try {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn("Academic Tracker could not update its offline cache:", error);
        }
      }
      return response;
    } catch (error) {
      const saved = await caches.match(request, { ignoreSearch: true });
      if (saved) return saved;
      if (request.mode === "navigate") {
        return (await caches.match("./index.html")) || Response.error();
      }
      return Response.error();
    }
  })());
});
