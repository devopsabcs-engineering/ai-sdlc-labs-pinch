const CACHE_NAME = "pinch-shell-v1";
const scopeUrl = new URL(self.registration.scope);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const shellResponse = await fetch(scopeUrl);
      const shellHtml = await shellResponse.clone().text();
      const shellAssets = [...shellHtml.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((match) => new URL(match[1], scopeUrl))
        .filter((url) => url.origin === scopeUrl.origin && !url.hash);

      await cache.put(scopeUrl, shellResponse);
      await cache.addAll([
        ...new Set([
          ...shellAssets.map((url) => url.href),
          new URL("manifest.webmanifest", scopeUrl).href,
          new URL("icon.svg", scopeUrl).href,
        ]),
      ]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== "GET" || requestUrl.origin !== scopeUrl.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached =
        event.request.mode === "navigate"
          ? await cache.match(scopeUrl)
          : await cache.match(event.request);
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
