/* sw.js · service worker de MNL
   - Les fichiers du site sont mis en cache : l'application s'ouvre vite et son interface s'affiche même sans réseau.
   - Quand tu es en ligne, la version la plus récente du site est toujours chargée en priorité.
   - Tes DONNÉES (Supabase : comptes, opérations, session) ne sont JAMAIS mises en cache ici :
     ce worker ne touche pas à ces requêtes, elles partent directement vers ta base.
   Pour forcer tous les appareils à repartir de zéro après une grosse modification, change VERSION. */
const VERSION = 'mnl-v3';
const SHELL = VERSION + '-shell';
const FILES = [
  './', 'index.html', 'style.css', 'theme.css', 'config.js', 'ui.js', 'data.js', 'reports.js', 'cards.js',
  'palette.js', 'forms.js', 'views.js', 'main.js', 'pwa.js', 'bg.jpg', 'manifest.webmanifest',
  'icon-192.svg', 'icon-512.svg'
];
/* seuls ces domaines « de bibliothèque » sont mis en cache (bibliothèque Supabase et polices) */
const LIBS = ['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(FILES.map((f) => cache.add(new Request(f, { cache: 'reload' })).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keep = [SHELL];
    for (const k of await caches.keys()) if (k.startsWith('mnl-') && !keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const wait = (ms) => new Promise((r) => setTimeout(() => r(null), ms));

/* fichiers du site : le réseau d'abord (version à jour), le cache si hors ligne ou si le réseau traîne (> 4 s) */
async function siteFile(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req, { ignoreSearch: true });
  const net = fetch(req, { cache: 'no-cache' }).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  const res = cached ? await Promise.race([net, wait(4000)]) : await net;
  if (res) return res;
  if (cached) return cached;
  if (req.mode === 'navigate') { const home = (await cache.match('index.html')) || (await cache.match('./')); if (home) return home; }
  return Response.error();
}

/* bibliothèque et polices : le cache d'abord (fichiers versionnés, qui ne changent pas) */
async function libFile(req) {
  const cache = await caches.open(SHELL);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  } catch (err) { return Response.error(); }
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) e.respondWith(siteFile(req));
  else if (LIBS.includes(url.hostname)) e.respondWith(libFile(req));
  /* tout le reste (Supabase : données, connexion) : on ne s'en mêle pas */
});
