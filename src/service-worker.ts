/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const sw = self as unknown as ServiceWorkerGlobalScope;

const STATIC_CACHE = `static-${version}`;
const API_CACHE = `api-${version}`;
const MAX_API_ENTRIES = 50;

const STATIC_ASSETS = new Set([...build, ...files]);

// Install: pre-cache app shell + static files
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([...STATIC_ASSETS]))
      .then(() => sw.skipWaiting())
  );
});

// Activate: clean old caches, claim clients
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => sw.clients.claim())
  );
});

// Fetch: route-based caching strategy
sw.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  // API requests: network-first with cache fallback
  if (
    url.hostname === 'api.open-meteo.com' ||
    url.hostname === 'geocoding-api.open-meteo.com' ||
    url.hostname === 'nominatim.openstreetmap.org' ||
    url.pathname.startsWith('/api/')
  ) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Same-origin requests
  if (url.origin === sw.location.origin) {
    // Navigation (HTML pages): network-first to avoid stale pages after deploy
    if (event.request.mode === 'navigate') {
      event.respondWith(networkFirst(event.request));
      return;
    }
    // Static assets: cache-first
    event.respondWith(cacheFirst(event.request));
    return;
  }
});

async function cacheFirst(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }
}

async function networkFirst(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
      trimCache(API_CACHE, MAX_API_ENTRIES);
    } else if (response.status >= 500) {
      const cached = await caches.match(request);
      if (cached) return cached;
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function trimCache(cacheName: string, maxEntries: number) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    for (let i = 0; i < keys.length - maxEntries; i++) {
      await cache.delete(keys[i]);
    }
  }
}
