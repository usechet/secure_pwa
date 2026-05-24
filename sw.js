// Service Worker de SecureNote PWA
// Actividad 1: habilita la PWA con cache offline
// Solo funciona en HTTPS o localhost (refuerza el uso de SSL/TLS)

"use strict";

const CACHE_NAME = "securenote-v1";

// Recursos propios que se guardan en cache al instalar
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

// Instalacion: guarda los recursos en cache
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Activacion: elimina caches de versiones anteriores
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: estrategia cache-first con red como respaldo
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Solo intercepta GET del mismo origen
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No esta en cache: solicita a la red y guarda la respuesta
      return fetch(event.request).then(response => {
        // Solo cachea respuestas validas del mismo origen
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        return response;
      }).catch(() => {
        // Sin red y sin cache: devuelve la pagina principal como fallback
        return caches.match("./index.html");
      });
    })
  );
});
