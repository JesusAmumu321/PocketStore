const STATIC_CACHE = "pocket-store-v1";
const DATA_CACHE = "pocket-store-data-v1";
const IMAGE_CACHE = "pocket-store-images-v1";
const CURRENT_CACHES = [STATIC_CACHE, DATA_CACHE, IMAGE_CACHE];

const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.json"];
const PRODUCTS_API = "https://dummyjson.com/products";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                cacheName.startsWith("pocket-store-") &&
                !CURRENT_CACHES.includes(cacheName)
            )
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Devuelve la red y conserva la última respuesta válida de la API. */
async function networkFirst(request) {
  const cache = await caches.open(DATA_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

/** Usa la caché primero para el App Shell y las imágenes ya visitadas. */
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.href.startsWith(PRODUCTS_API)) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      cacheFirst(request, STATIC_CACHE).catch(async () => {
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Response.error();
      })
    );
  }
});
