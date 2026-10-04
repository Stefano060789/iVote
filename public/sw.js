const CACHE_NAME = "ivote-shell-v5";
const APP_SHELL = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys
      .filter((key) => key !== CACHE_NAME)
      .map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (event.request.mode === "navigate") {
    const url = new URL(event.request.url);
    url.searchParams.set("__godwit_shell", CACHE_NAME);

    event.respondWith(
      fetch(new Request(url, event.request))
        .catch(() => caches.match("/"))
    )
    return;
  }

  if (
    event.request.destination !== "script" ||
    new URL(event.request.url).origin !== self.location.origin
  ) return;

  event.respondWith(
    fetch(event.request).then((response) => {
      const contentType = response.headers.get("content-type") || "";
      if (response.ok && /(?:java|ecma)script/i.test(contentType)) return response;

      const retryUrl = new URL(event.request.url);
      retryUrl.searchParams.set("__godwit_asset_retry", `${CACHE_NAME}-${Date.now()}`);
      return fetch(new Request(retryUrl, event.request));
    })
  );
});