// sw.js â€” FamiLife Service Worker (Tá»± Ä‘á»™ng hÃ³a quáº£n lÃ½ Cache theo URL Version)
// Chiáº¿n lÆ°á»£c: Network-first cho JS/CSS/HTML ná»™i bá»™ (luÃ´n nháº­n code má»›i)
//             Cache-first cho áº£nh vÃ  CDN static libraries (Supabase, Chart.js, Lucide...) Ä‘á»ƒ táº£i cá»±c nhanh & offline
//             Bá» qua hoÃ n toÃ n cÃ¡c API calls Ä‘á»™ng bÃªn ngoÃ i (Supabase API, Gemini API, Weather API)

const SW_VERSION = new URL(location).searchParams.get('v') || 'v4.3.136';
const CACHE_NAME = 'familife-cache-' + (SW_VERSION.startsWith('v') ? SW_VERSION : 'v' + SW_VERSION);

// App shell â€” danh sÃ¡ch tÃ i nguyÃªn cáº§n cache ngay khi install
const SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './version.json',
    './src/assets/css/style.css',
    './src/assets/css/quy-gia-dinh.css',
    './src/assets/css/bao-cao-thang.css',
    './src/assets/css/we-love.css',
    './src/assets/images/icon.png',
    './src/assets/images/icon-light.png',
    './src/assets/images/icon-light-pwa.png',
    './logo_pwa_small.png',
    './mot-doi.mp3'
];

// CÃ¡c API endpoints Ä‘á»™ng bÃªn ngoÃ i cáº§n bá» qua (pháº£i gá»i máº¡ng tháº­t, khÃ´ng cache)
const BYPASS_API_DOMAINS = [
    'supabase.co',
    'supabase.in',
    'generativelanguage.googleapis.com',
    'open-meteo.com',
];

// â”€â”€â”€ Install: cache app shell â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('[SW] Install cache failed:', err))
    );
});

// â”€â”€â”€ Activate: xÃ³a cache cÅ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Fetch: Network-first vá»›i Cache fallback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('fetch', (event) => {
    // Chá»‰ xá»­ lÃ½ GET requests
    if (event.request.method !== 'GET') return;

    let url;
    try {
        url = new URL(event.request.url);
    } catch {
        return;
    }

    // Bá» qua cÃ¡c API endpoints bÃªn ngoÃ i (Supabase API, Gemini API, Weather API)
    if (BYPASS_API_DOMAINS.some((domain) => url.hostname.includes(domain))) return;

    // Bá» qua chrome-extension vÃ  other non-http
    if (!url.protocol.startsWith('http')) return;

    const isImage = /\.(png|jpg|jpeg|svg|ico|webp|gif)(\?.*)?$/i.test(url.pathname);
    const isCDN = ['cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].some(domain => url.hostname.includes(domain));

    if (isImage || isCDN) {
        // â”€â”€ Cache-first cho áº£nh vÃ  thÆ° viá»‡n CDN (Ã­t thay Ä‘á»•i, táº£i cá»±c nhanh, offline-first) â”€â”€
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => cached); // fallback náº¿u máº¡ng lá»—i
            })
        );
    } else {
        // â”€â”€ Network-first cho JS/CSS/HTML ná»™i bá»™ (luÃ´n láº¥y báº£n má»›i nháº¥t) â”€â”€
        let fetchPromise;
        try {
            // Thá»­ bá» qua browser HTTP/disk cache Ä‘á»ƒ láº¥y code thá»±c táº¿ má»›i nháº¥t tá»« server
            fetchPromise = fetch(event.request, { cache: 'no-cache' });
        } catch (e) {
            fetchPromise = fetch(event.request);
        }

        event.respondWith(
            fetchPromise
                .then((response) => {
                    // Cache láº¡i náº¿u response há»£p lá»‡
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
                        // Náº¿u khÃ´ng cÃ³ cache vÃ  khÃ´ng cÃ³ máº¡ng, tráº£ vá» index.html (SPA fallback)
                        if (url.pathname.endsWith('/') || !url.pathname.includes('.')) {
                            return caches.match('./index.html');
                        }
                    });
                })
        );
    }
});

// â”€â”€â”€ Push Notifications: Nháº­n thÃ´ng bÃ¡o yÃªu thÆ°Æ¡ng tá»« Ä‘Ã¡m mÃ¢y â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
self.addEventListener('push', (event) => {
    let payload = { title: 'WeLove', body: 'Lá»i nháº¯n gá»­i tá»« ná»­a kia cá»§a báº¡n! â¤ï¸' };
    
    if (event.data) {
        try {
            // Check if JSON payload
            payload = event.data.json();
        } catch {
            // Text fallback
            payload = { title: 'WeLove', body: event.data.text() };
        }
    }
    
    const options = {
        body: payload.body || payload.message || 'Báº¡n cÃ³ má»™t lá»i nháº¯c nhá»Ÿ yÃªu thÆ°Æ¡ng má»›i! â¤ï¸',
        icon: './logo_pwa_small.png',
        badge: './logo_pwa_small.png',
        vibrate: [100, 50, 100],
        data: payload
    };
    
    event.waitUntil(
        self.registration.showNotification(payload.title || 'WeLove', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    // Focus or open FamiLife app on click
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    // Navigate to WeLove tab directly
                    if ('navigate' in client) {
                        client.navigate('./#gockyniem');
                    }
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./#gockyniem');
            }
        })
    );
});




