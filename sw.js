/**
 * NutriFuture — Service Worker
 * Cache "app shell" để chạy offline (dữ liệu vốn đã lưu local-first trong localStorage).
 * Gọi Gemini AI (Camera AI, Tra cứu, Tư vấn thực đơn) LUÔN cần mạng thật — không cache.
 *
 * Tăng CACHE_VERSION mỗi khi đổi cấu trúc file tĩnh để buộc trình duyệt tải bản mới.
 */
const CACHE_VERSION = 'v3';
const CACHE_NAME = `nutrifuture-cache-${CACHE_VERSION}`;

// Chỉ liệt kê file same-origin ở đây — addAll sẽ lỗi toàn bộ nếu 1 URL cross-origin
// bị chặn CORS. Các asset CDN (Google Fonts, Chart.js, Font Awesome) sẽ được cache
// "cơ hội" (opportunistic) ngay lần fetch đầu tiên trong hàm fetch handler bên dưới.
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './js/app.js',
  './js/storage.js',
  './js/data/foods.js',
  './js/foods.js',
  './js/data/quiz.js',
  './js/gemini.js',
  './js/ui.js',
  './js/notifications.js',
  './js/game-engine.js',
  './js/motion.js',
  './js/config.js',
  './js/pages/home.js',
  './js/pages/camera.js',
  './js/pages/lookup.js',
  './js/pages/profile.js',
  './js/pages/diary.js',
  './js/pages/history.js',
  './js/pages/game.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Cache từng file riêng lẻ + bắt lỗi từng cái — tránh việc 1 file thiếu
      // (vd js/config.js chưa tồn tại khi chạy local) làm hỏng toàn bộ install
      Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] Bỏ qua cache:', url, err.message))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Không can thiệp gì vào lệnh gọi Gemini AI — luôn cần dữ liệu thời gian thực,
  // không bao giờ được phép trả về từ cache.
  if (url.hostname.includes('generativelanguage.googleapis.com')) {
    return;
  }

  // Chỉ xử lý GET — bỏ qua POST/PUT (không áp dụng ở app này nhưng để an toàn)
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((response) => {
          // Chỉ cache response hợp lệ (bao gồm cả response "opaque" từ CDN cross-origin)
          if (response && (response.status === 200 || response.type === 'opaque')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached); // Mất mạng → dùng bản đã cache (nếu có)

      // Stale-while-revalidate: trả cache ngay lập tức nếu có (nhanh + hoạt động offline),
      // đồng thời âm thầm cập nhật cache cho lần tải sau.
      return cached || networkFetch;
    })
  );
});
