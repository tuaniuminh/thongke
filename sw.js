// sw.js — FamiLife Service Worker v4.1.85
// Chiến lược: Network-first cho JS/CSS/HTML nội bộ (luôn nhận code mới)
//             Cache-first cho ảnh và CDN static libraries (Supabase, Chart.js, Lucide...) để tải cực nhanh & offline
//             Bỏ qua hoàn toàn các API calls động bên ngoài (Supabase API, Gemini API, Weather API)

const CACHE_NAME = 'familife-cache-v4.1.85';

// App shell — danh sách tài nguyên cần cache ngay khi install
const SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './version.json',
    './src/assets/css/style.css',
    './src/assets/css/quy-gia-dinh.css',
    './src/assets/css/bao-cao-thang.css',
    './src/assets/images/icon.png',
    './src/assets/images/icon-light.png',
    './src/assets/images/icon-light-pwa.png',
];

// Các API endpoints động bên ngoài cần bỏ qua (phải gọi mạng thật, không cache)
const BYPASS_API_DOMAINS = [
    'supabase.co',
    'supabase.in',
    'generativelanguage.googleapis.com',
    'open-meteo.com',
];

// ─── Install: cache app shell ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Install cache failed:', err))
    );
});

// ─── Activate: xóa cache cũ ──────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            ))
            .then(() => self.clients.claim())
    );
});

// ─── Fetch: Network-first với Cache fallback ──────────────────────────────────
self.addEventListener('fetch', (event) => {
    // Chỉ xử lý GET requests
    if (event.request.method !== 'GET') return;

    let url;
    try {
        url = new URL(event.request.url);
    } catch {
        return;
    }

    // Bỏ qua các API endpoints bên ngoài (Supabase API, Gemini API, Weather API)
    if (BYPASS_API_DOMAINS.some((domain) => url.hostname.includes(domain))) return;

    // Bỏ qua chrome-extension và other non-http
    if (!url.protocol.startsWith('http')) return;

    const isImage = /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/i.test(url.pathname);
    const isCDN = ['cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].some(domain => url.hostname.includes(domain));

    if (isImage || isCDN) {
        // ── Cache-first cho ảnh và thư viện CDN (ít thay đổi, tải cực nhanh, offline-first) ──
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached); // fallback nếu mạng lỗi
            })
        );
    } else {
        // ── Network-first cho JS/CSS/HTML nội bộ (luôn lấy bản mới nhất) ──
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache lại nếu response hợp lệ
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Fallback cache khi offline
                    return caches.match(event.request).then((cached) => {
                        if (cached) return cached;
                        // Nếu không có cache và không có mạng, trả về index.html (SPA fallback)
                        if (url.pathname.endsWith('/') || !url.pathname.includes('.')) {
                            return caches.match('./index.html');
                        }
                    });
                })
        );
    }
});
