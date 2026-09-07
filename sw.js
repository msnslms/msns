const CACHE_NAME = 'msns-v1';
const urlsToCache = [
  './',
  '1.jpg',
  '1000003154.jpg.jpeg',
  '101.jpg',
  '2.jpg',
  '3.jpg',
  '56.jpg',
  '62.jpg',
  'README.md',
  'ab.html',
  'about.css',
  'about.html',
  'admin-p.css',
  'admin-p.js',
  'admin.html',
  'ai.css',
  'alokaya.webp',
  'ap.html',
  'as.webp',
  'c2-2.jpg',
  'c2.jpg',
  'chumbaka.webp',
  'clo.webp',
  'courses-01.jpg',
  'courses-02.jpg',
  'courses-03.jpg',
  'courses-04.jpg',
  'cr.webp',
  'e.html',
  'em-co.webp',
  'file.png',
  'g.png',
  'history.html',
  'ict.html',
  'ict.mp4',
  'ict.png',
  'index.html',
  'input.png',
  'k.webp',
  'login.css',
  'login.html',
  'login.js',
  'login.json',
  'manifest.json',
  'media.html',
  'media.mp4',
  'media.png',
  'min.js',
  'mk.jpeg',
  'msns-ai.html',
  'news.html',
  'non.webp',
  'note.html',
  'ns.webp',
  'num.webp',
  'ol(2025).PDF',
  'ol.html',
  'ol.jpg',
  'ol1.jpg',
  'oo.webp',
  'open.html',
  'os.webp',
  'parinamaya.webp',
  'past.css',
  'pdf.css',
  'pdf.html',
  'pdf.js',
  'police.jpg',
  'pv.webp',
  'qz.css',
  'real.jpg',
  'save_w.jpeg',
  'school bage.png',
  'sh.css',
  'sh.js',
  'shaktiya.webp',
  'stu-quiz.html',
  'style.css',
  't-book.css',
  'teach-quiz.html',
  'teacher-g.html',
  'text.html',
  'tr-h.jpg',
  'tr.jpg',
  'traffic.mp4',
  'traffic.png',
  'trafic.html',
  'type-f.webp',
  'u.html',
  'user.css',
  'v.png',
  'w-balaya.webp',
  'w.png',
  'w1.jpg',
  'w2.jpg',
  'w3.jpg',
  'water.jpg',
  'your-score.html',
  'Past.html',
  'app-icon.png',
  'app-icon-192.png',
  'apk.html',
  'app.css',
  'do.js',
  'u.js',
  'ai.js',
  'sim.css',
];

// Install කරද්දි cache කරනවා
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Fetch කරද්දි cache එකෙන් දෙනවා, නැත්නම් network එකෙන්
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate වුණාම පරණ cache clean කරනවා (Auto Update)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

