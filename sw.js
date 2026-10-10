/* ControlCard — Service Worker
   Troque o número de VERSAO sempre que alterar ESTE arquivo (sw.js) ou os ícones.
   O index.html se atualiza sozinho (rede primeiro); não precisa mexer na versão por causa dele. */
const VERSAO = 'controlcard-v3.4';
const CACHE_APP = VERSAO + '-app';
const CACHE_EXT = VERSAO + '-ext';

const ARQUIVOS = [
  './', './index.html', './manifest.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
// Sincronização com o Google nunca passa pelo cache
const SEM_CACHE = ['script.google.com', 'script.googleusercontent.com'];
// Fontes dos ícones e leitor de planilha: guardados para funcionar offline
const EXTERNOS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_APP).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => !k.startsWith(VERSAO)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (SEM_CACHE.includes(url.hostname)) return;

  if (url.origin === self.location.origin) {
    // Abrir o app: tenta a rede (pega versão nova); sem internet, abre a cópia guardada
    if (req.mode === 'navigate') {
      e.respondWith(
        fetch(req)
          .then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE_APP).then(c => c.put('./index.html', cp)); } return r; })
          .catch(() => caches.match('./index.html'))
      );
      return;
    }
    // Demais arquivos do app: cache primeiro, atualiza em segundo plano
    e.respondWith(
      caches.match(req).then(guardado => {
        const rede = fetch(req)
          .then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE_APP).then(c => c.put(req, cp)); } return r; })
          .catch(() => guardado);
        return guardado || rede;
      })
    );
    return;
  }

  if (EXTERNOS.includes(url.hostname)) {
    e.respondWith(
      caches.open(CACHE_EXT).then(c =>
        c.match(req).then(guardado => {
          const rede = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => guardado);
          return guardado || rede;
        })
      )
    );
  }
});
