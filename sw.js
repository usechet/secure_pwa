/**
 * sw.js – Service Worker de SecureNote PWA
 * ─────────────────────────────────────────────────────────
 * ACTIVIDAD 1: PWA con caché offline
 * El SW solo puede registrarse bajo HTTPS (o localhost),
 * lo que refuerza la exigencia de SSL/TLS (Actividad 1).
 *
 * SEGURIDAD en el SW:
 *  - Solo cachea recursos del mismo origen ('self')
 *  - Valida que las respuestas sean 'basic' (mismo origen)
 *    antes de guardarlas; evita cachear respuestas CORS opacas.
 *  - No cachea respuestas con estado de error.
 */

"use strict";

const CACHE_NAME = "securenote-v1";

// Lista blanca de rutas propias a cachear
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

/* ── Instalación: pre-cachear recursos ─────────────────── */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activa de inmediato sin esperar a que se cierre la pestaña anterior
  self.skipWaiting();
});

/* ── Activación: eliminar cachés obsoletas ─────────────── */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: estrategia Cache-first con red de respaldo ─── */
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Solo interceptamos peticiones GET al mismo origen
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // No está en caché: buscar en red y guardar (solo respuestas válidas)
      return fetch(event.request).then(response => {
        // Solo cachear respuestas del mismo origen y sin errores
        if (
          !response ||
          response.status !== 200 ||
          response.type !== "basic"
        ) {
          return response;
        }

        // Clonar porque response es un stream de un solo uso
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(() => {
        // Si no hay red y no está en caché → fallback offline
        return caches.match("./index.html");
      });
    })
  );
});
