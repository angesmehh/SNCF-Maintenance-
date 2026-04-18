// SNCF Maintenance — Service Worker
// Version du cache : à incrémenter à chaque mise à jour du fichier
const CACHE_NAME = 'sncf-maintenance-v1';

// Fichiers à mettre en cache pour le mode hors-ligne
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installation : mise en cache des fichiers essentiels
self.addEventListener('install', event => {
  console.log('[SW] Installation en cours...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Fichiers mis en cache');
      return cache.addAll(FILES_TO_CACHE);
    }).catch(err => {
      console.warn('[SW] Erreur cache (certains fichiers ignorés) :', err);
    })
  );
  self.skipWaiting();
});

// Activation : nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] Activation...');
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Suppression ancien cache :', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Interception des requêtes : Cache First, puis réseau
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les extensions Chrome
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Servi depuis le cache (hors-ligne OK)
        return cachedResponse;
      }
      // Pas en cache : on va chercher sur le réseau
      return fetch(event.request).then(networkResponse => {
        // On met en cache la nouvelle ressource pour la prochaine fois
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Réseau indisponible et pas en cache : page d'erreur minimale
        return new Response(
          '<html><body style="background:#1A1A2E;color:white;font-family:sans-serif;text-align:center;padding:40px">' +
          '<h2>📡 Hors ligne</h2>' +
          '<p>Reconnecte-toi au réseau pour charger cette ressource.</p>' +
          '<button onclick="location.reload()" style="background:#E2001A;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:16px;cursor:pointer;margin-top:20px">Réessayer</button>' +
          '</body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});
