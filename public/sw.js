/**
 * ==============================================================================
 * SERVICE WORKER - ALVSHOP WEB PUSH NOTIFICATIONS
 * Ubicación: /public/sw.js
 * ==============================================================================
 */

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejador de eventos Web Push recibidos en segundo plano
self.addEventListener('push', (event) => {
  let data = {
    title: 'ALVSHOP Notificaciones',
    body: 'Tienes una nueva actualización en tu cuenta.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    url: '/',
    tag: 'alv-general',
    data: {}
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag || 'alv-notification',
    renotify: true,
    vibrate: [100, 50, 100, 50, 200], // Patrón de vibración háptica en móvil
    data: {
      url: data.url || '/',
      ...data.data
    },
    actions: [
      { action: 'open', title: 'Ver Ahora ➔' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejador del clic sobre la notificación emergente
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta de ALVSHOP, enfocarla y navegar
      for (const client of windowClients) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
