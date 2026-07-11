// sw.js — FamiLife Service Worker v4.1.31
// Chiến lược: Network-first cho JS/CSS/HTML (luôn nhận code mới)
//             Cache-first cho ảnh (giảm tải mạng)
//             Bỏ qua hoàn toàn API calls bên ngoài (Supabase, Gemini, CDN)

const CACHE_NAME = 'familife-cache-v4.1.31';

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

// Tên miền bên ngoài cần bỏ qua (không cache API calls)
const SKIP_DOMAINS = [
    'supabase.co',
    'supabase.in',
    'generativelanguage.googleapis.com',
    'open-meteo.com',
    'cdn.jsdelivr.net',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
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

    // Bỏ qua API calls bên ngoài (Supabase, Gemini, CDN thư viện, v.v.)
    if (SKIP_DOMAINS.some((domain) => url.hostname.includes(domain))) return;

    // Bỏ qua chrome-extension và other non-http
    if (!url.protocol.startsWith('http')) return;

    const isImage = /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/i.test(url.pathname);

    if (isImage) {
        // ── Cache-first cho ảnh (ít thay đổi, tiết kiệm băng thông) ──
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
        // ── Network-first cho JS/CSS/HTML (luôn lấy bản mới nhất) ──
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
