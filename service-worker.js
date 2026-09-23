const CACHE_NAME = "beauty-lab-web-shell-2026-09-23-v1.10-png-keyboard";
const SHELL = ["./","./index.html","./styles.css?v=2026-09-23-v1.10-png-keyboard","./editor-overrides.css?v=2026-09-23-v1.10-png-keyboard","./draft-ui.css?v=2026-09-23-v1.10-png-keyboard","./editor-objects.css?v=2026-09-23-v1.10-png-keyboard","./vendor/lucide.min.js?v=2026-09-23-v1.10-png-keyboard","./i18n.js?v=2026-09-23-v1.10-png-keyboard","./vendor/png-renderer.js?v=2026-09-23-v1.10-png-keyboard","./png-export.js?v=2026-09-23-v1.10-png-keyboard","./document-io.js?v=2026-09-23-v1.10-png-keyboard","./select-options.js?v=2026-09-23-v1.10-png-keyboard","./object-tools.js?v=2026-09-23-v1.10-png-keyboard","./runtime-edits.js?v=2026-09-23-v1.10-png-keyboard","./live-compat.js?v=2026-09-23-v1.10-png-keyboard","./canvas-view.js?v=2026-09-23-v1.10-png-keyboard","./draft-store.js?v=2026-09-23-v1.10-png-keyboard","./draft-ui.js?v=2026-09-23-v1.10-png-keyboard","./editor-objects.js?v=2026-09-23-v1.10-png-keyboard","./app.js?v=2026-09-23-v1.10-png-keyboard"];
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
