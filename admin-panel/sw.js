const CACHE = "mrtinfo-admin-v16";

const ASSETS = [
  "/",
  "/index.html",
  "/dashboard.html",
  "/404.html",
  "/pages/stations.html",
  "/pages/platforms.html",
  "/pages/facilities.html",
  "/pages/artpieces.html",
  "/pages/transfers.html",
  "/pages/apikeys.html",

  "/index.css",
  "/dashboard.css",
  "/404.css",
  "/shared/shared.css",
  "/pages/table.css",

  "/index.js",
  "/dashboard.js",
  "/shared/shared.js",
  "/shared/svgs.js",
  "/pages/stations.js",
  "/pages/platforms.js",
  "/pages/facilities.js",
  "/pages/artpieces.js",
  "/pages/transfers.js",
  "/pages/apikeys.js",

  "/templateicon1.png",
  "/favicon.ico",
  "/manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetched = fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
