const CACHE_NAME = "beauty-lab-web-shell-2026-09-06-v1.9-collapsed-layers";
const SHELL = ["./","./index.html","./styles.css?v=2026-09-06-v1.9-collapsed-layers","./editor-overrides.css?v=2026-09-06-v1.9-collapsed-layers","./draft-ui.css?v=2026-09-06-v1.9-collapsed-layers","./editor-objects.css?v=2026-09-06-v1.9-collapsed-layers","./vendor/lucide.min.js?v=2026-09-06-v1.9-collapsed-layers","./i18n.js?v=2026-09-06-v1.9-collapsed-layers","./document-io.js?v=2026-09-06-v1.9-collapsed-layers","./select-options.js?v=2026-09-06-v1.9-collapsed-layers","./object-tools.js?v=2026-09-06-v1.9-collapsed-layers","./runtime-edits.js?v=2026-09-06-v1.9-collapsed-layers","./live-compat.js?v=2026-09-06-v1.9-collapsed-layers","./canvas-view.js?v=2026-09-06-v1.9-collapsed-layers","./draft-store.js?v=2026-09-06-v1.9-collapsed-layers","./draft-ui.js?v=2026-09-06-v1.9-collapsed-layers","./editor-objects.js?v=2026-09-06-v1.9-collapsed-layers","./app.js?v=2026-09-06-v1.9-collapsed-layers"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("beauty-lab-web-") && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", copy));
      return response;
    }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
