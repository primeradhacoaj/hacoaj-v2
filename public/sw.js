// Service worker de la app (PWA + notificaciones push).
//
// Qué hace:
//  · Guarda una copia de los íconos y de una página "sin conexión" para que la app instalada no quede en blanco.
//  · NO guarda páginas ni datos de la app: son personales (fuerza, pesos, encuestas) y pueden cambiar de una
//    persona a otra en el mismo dispositivo, así que siempre se piden a la red.
//  · Muestra las notificaciones push y, al tocarlas, abre la app en la pantalla indicada.
//
// Si se cambia algo de lo que guarda, subir el número de VERSION: se borran las copias viejas.

const VERSION = "v1";
const CACHE = `hacoaj-${VERSION}`;
const ARCHIVOS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/escudo.png"];

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARCHIVOS)));
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (evento) => {
  const pedido = evento.request;
  if (pedido.method !== "GET") return;
  const url = new URL(pedido.url);
  if (url.origin !== self.location.origin) return;

  // Abrir una pantalla sin conexión: página de aviso en vez de la pantalla de error del navegador.
  if (pedido.mode === "navigate") {
    evento.respondWith(fetch(pedido).catch(() => caches.match("/offline.html")));
    return;
  }
  // Íconos: de la copia guardada si está.
  if (url.pathname.startsWith("/icons/") || url.pathname === "/escudo.png") {
    evento.respondWith(caches.match(pedido).then((copia) => copia || fetch(pedido)));
  }
  // Todo lo demás pasa directo a la red.
});

// ── Notificaciones push ──────────────────────────────────────────────────────
self.addEventListener("push", (evento) => {
  let datos = { title: "Hacoaj", body: "Tenés una nueva notificación", url: "/" };
  if (evento.data) {
    try {
      datos = { ...datos, ...evento.data.json() };
    } catch {
      datos.body = evento.data.text();
    }
  }

  evento.waitUntil(
    self.registration.showNotification(datos.title, {
      body: datos.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      vibrate: [100, 50, 100],
      data: { url: datos.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.url) || "/", self.location.origin).href;

  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((ventanas) => {
      // Si la app ya está abierta, se la lleva a esa pantalla; si no, se abre.
      for (const ventana of ventanas) {
        if (ventana.url.startsWith(self.location.origin) && "focus" in ventana) {
          return ventana.navigate(destino).then((v) => (v || ventana).focus());
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
