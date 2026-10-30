// Service worker: app abre offline; conteúdo busca a versão nova quando há rede.
const VERSAO = "aurora-v2";
const SHELL = [
  "./",
  "index.html",
  "css/app.css",
  "js/app.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/apple-touch-icon.png",
  "icons/badge-96.png",
  "content/curriculo.json",
];

// Notificação da manhã, enviada pelo GitHub Actions (scripts/notificar.mjs).
self.addEventListener("push", (e) => {
  let msg = { titulo: "Aurora", corpo: "Sua lição de hoje está pronta.", rota: "#/" };
  try { msg = { ...msg, ...e.data.json() }; } catch { /* payload vazio ou texto */ }
  e.waitUntil(self.registration.showNotification(msg.titulo, {
    body: msg.corpo,
    icon: "icons/icon-192.png",
    badge: "icons/badge-96.png",
    tag: msg.tag || "aurora",
    data: { rota: msg.rota },
  }));
});

// Toque na notificação: abre (ou traz para frente) o app já na lição.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(`./${e.notification.data?.rota || ""}`, self.registration.scope).href;
  e.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const aberta = janelas.find((j) => j.url.startsWith(self.registration.scope));
    if (aberta) {
      try { await aberta.focus(); return await aberta.navigate(url); }
      catch { /* janela não controlada: abre uma nova */ }
    }
    return self.clients.openWindow(url);
  })());
});

self.addEventListener("install", (e) => {
  // Falha no cache não pode impedir a instalação: sem service worker não há notificação.
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== VERSAO).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

// Rede primeiro (para receber lições e correções novas), cache como reserva offline.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        if (resp.ok || resp.type === "opaque") {
          const copia = resp.clone();
          caches.open(VERSAO).then((c) => c.put(e.request, copia)).catch(() => {});
        }
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
