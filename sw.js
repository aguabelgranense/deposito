// Service Worker: permite abrir la app aunque el celular esté sin señal
// desde el arranque (modo avión, sin wifi, etc). Guarda una copia de los
// archivos principales la primera vez que se abre CON conexión, y los
// sirve desde esa copia guardada cuando no hay señal.

const CACHE_NAME = "stock-bidones-v1";
const ARCHIVOS_A_GUARDAR = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// Al instalar: descarga y guarda una copia de los archivos principales.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_A_GUARDAR))
  );
  self.skipWaiting();
});

// Al activarse: borra copias viejas de versiones anteriores del Service Worker.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// Al pedir un archivo: si es el HTML principal, intenta ir a buscar la
// versión más nueva a internet primero (para no quedarse con una copia
// vieja); si no hay señal, usa la copia guardada. Los demás archivos
// (íconos, manifest) se sirven directo de la copia guardada, más rápido.
self.addEventListener("fetch", (event) => {
  // Los llamados a la API de Apps Script (guardar/consultar datos) NUNCA
  // se cachean: siempre tienen que ir a internet de verdad, o fallar y
  // quedar en la cola offline que ya maneja la app.
  if (event.request.url.includes("script.google.com")) return;

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(event.request).then((r) => r || caches.match("./index.html")))
  );
});
