// sw.js — 앱 셸만 캐시한다. 데이터(/api/*)는 절대 캐시하지 않는다 (PRD §9).
const CACHE_VERSION = "shell-v1";
const SHELL_FILES = ["/", "/index.html", "/styles.css", "/app.js", "/data.js", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) return; // 데이터는 항상 네트워크로만

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => caches.match("/index.html"));
    })
  );
});
