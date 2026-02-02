/**
 * Service Worker for BridgeChat PWA
 *
 * Provides:
 * - Offline app shell caching
 * - Background sync for messages (future)
 * - Push notifications (future)
 */

const CACHE_NAME = "bridge-chat-v1";

// App shell files to cache for offline access
const APP_SHELL_FILES = [
  "/",
  "/chats",
  "/contacts",
  "/settings",
  "/login",
  "/offline.html",
];

// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Caching app shell");
      return cache.addAll(APP_SHELL_FILES);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );

  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip API and auth requests
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/callback") ||
    url.pathname.includes("supabase")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response for caching
        const responseClone = response.clone();

        // Only cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // For navigation requests, return offline page
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }

          return new Response("Offline", { status: 503 });
        });
      })
  );
});

// Handle push notifications (future)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || "default",
    data: data.data,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/chats";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if already open
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && "focus" in client) {
          return client.focus();
        }
      }

      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
