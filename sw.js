// ===== SERVICE WORKER — Offline Support =====
const CACHE_NAME = 'puzzle-master-v1.0.0';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/style.css',
    '/audio.js',
    '/levels.js',
    '/settings.js',
    '/game.js',
    '/manifest.json'
];

// Image cache
const IMAGE_CACHE = 'puzzle-images-v1';

// Install event — cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event — clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME && name !== IMAGE_CACHE)
                    .map(name => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event — serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Handle image requests with separate cache
    if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(cache => {
                return cache.match(request).then(cachedResponse => {
                    if (cachedResponse) {
                        // Return cached, but also update cache in background
                        fetch(request).then(networkResponse => {
                            if (networkResponse.ok) {
                                cache.put(request, networkResponse);
                            }
                        }).catch(() => {});
                        return cachedResponse;
                    }
                    
                    return fetch(request).then(networkResponse => {
                        if (networkResponse.ok) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => {
                        // Return a fallback placeholder if offline
                        return new Response(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="%23333" width="200" height="200"/><text x="100" y="110" text-anchor="middle" fill="%23666" font-size="14">Offline</text></svg>',
                            { headers: { 'Content-Type': 'image/svg+xml' } }
                        );
                    });
                });
            })
        );
        return;
    }
    
    // Handle navigation requests
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match('/index.html').then(cachedResponse => {
                return cachedResponse || fetch(request);
            })
        );
        return;
    }
    
    // All other requests — cache first, then network
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(request).then(networkResponse => {
                // Don't cache non-success responses
                if (!networkResponse.ok) {
                    return networkResponse;
                }
                
                // Clone and cache
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                });
                
                return networkResponse;
            }).catch(() => {
                // Offline fallback for other requests
                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
    
    if (event.data.action === 'clearCache') {
        caches.delete(CACHE_NAME);
        caches.delete(IMAGE_CACHE);
    }
});