// Service Worker do ControlCard — mantenha VERSAO igual a APP_VERSION do index.html
const VERSAO = '1.8.0';
const CACHE = 'controlcard-' + VERSAO;
const SHELL = ['./', 'index.html', 'manifest.json', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.startsWith('controlcard-')).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // nunca intercepta o envio para o Google Drive
  const url = new URL(req.url);

  // Fontes/ícones do Google: usa cache e atualiza em segundo plano
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CACHE).then(async c => {
      const cached = await c.match(req);
      const rede = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => cached);
      return cached || rede;
    }));
    return;
  }

  // Arquivos do próprio app: rede primeiro (pega atualizações), cache se estiver offline
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
        .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
    );
  }
});
