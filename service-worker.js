// service-worker.js
// PENTING: file ini dirancang supaya TIDAK perlu diubah/di-bump setiap kali
// kamu upgrade aplikasi. Strateginya "network-first" untuk index.html & JS,
// jadi begitu kamu ganti isi index.html di GitHub, pengguna otomatis dapat
// versi terbaru saat online, tanpa harus mengedit file ini.
//
// File ini cuma perlu disentuh lagi kalau kamu mengubah STRATEGI cache-nya
// sendiri (jarang), bukan setiap kali konten index.html berubah.

const SHELL_CACHE = "essensiana-shell";
const RUNTIME_CACHE = "essensiana-runtime";

// Aset yang jarang berubah — aman di-precache & cache-first.
const PRECACHE_URLS = [
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = [SHELL_CACHE, RUNTIME_CACHE];
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => !keep.includes(n)).map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Jangan pernah cache panggilan ke Firebase (auth/firestore/storage) —
  // biar selalu live dan tidak ada data basi/konflik.
  if (!isSameOrigin) return;

  const isAppShell =
    req.mode === "navigate" ||
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("firebase-config.js");

  if (isAppShell) {
    // NETWORK-FIRST: selalu coba ambil versi terbaru dulu.
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (err) {
          const cached = await caches.match(req);
          return cached || caches.match("./index.html");
        }
      })()
    );
    return;
  }

  // Aset statis lain (ikon, manifest): cache-first + revalidate di belakang layar.
  event.respondWith(
    (async () => {
      const cached = await caches.match(req);
      const fetchPromise = fetch(req)
        .then((fresh) => {
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, fresh.clone()));
          return fresh;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })()
  );
});
