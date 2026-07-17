// src/features/we-love/we-love.js - WeLove Couple Memory Corner Module
import { 
    state, saveLocalState, showToast, performSync
} from '../../core/app.js?v=4.1.94';
import * as sync from '../../core/sync.js?v=4.1.94';

// Selected romantic quotes (bilingual: Chinese - Vietnamese)
const LOVE_QUOTES = [
  {
    cn: "执子之手，与子偕老。",
    vi: "Nắm lấy tay em, cùng đi bên nhau đến đầu bạc răng long."
  },
  {
    cn: "遇上你是我这辈子最大的幸运。",
    vi: "Gặp được em là điều may mắn lớn nhất cuộc đời anh."
  },
  {
    cn: "只要有你陪伴，每天 Premium 都是晴天。",
    vi: "Chỉ cần có em bên cạnh, ngày nào cũng là ngày nắng ấm."
  },
  {
    cn: "因为是你，所以一切都刚刚好。",
    vi: "Bởi vì đó là em, nên mọi thứ đều trở nên vừa vặn hoàn hảo."
  },
  {
    cn: "只愿君心似我心，定不负相思意。",
    vi: "Chỉ mong lòng em giống lòng anh, quyết không phụ tấm chân tình này."
  },
  {
    cn: "两情若是久长时，又岂在朝朝暮暮。",
    vi: "Tình nếu dài lâu muôn thuở vững, tiếc gì giây phút cận kề nhau."
  },
  {
    cn: "你 magneto 是生命中最好的礼物。",
    vi: "Em là món quà tuyệt vời nhất mà cuộc sống đã ban tặng cho anh."
  }
];

const CARE_TEMPLATES = [
  "Em nhớ uống nhiều nước ấm, ăn cháo nóng và uống thuốc đúng giờ nhé. Anh lo lắm đó! ❤️",
  "Đi ngủ thật sớm nghe chưa em yêu, không được thức khuya làm việc nữa đâu đấy. Phạt tự giác đắp chăn ấm nha! 😠❤️",
  "Lần sau ra ngoài nhớ mang theo áo khoác và đi mưa phải mặc áo mưa nghe chưa em iu. Anh thương em nhiều! 🥺❤️",
  "Cố gắng nghỉ ngơi tĩnh dưỡng, đừng làm việc quá sức nha em. Có anh luôn ở bên cạnh chăm sóc em đây! 🥰❤️",
  "Hạn chế uống nước đá lạnh và ăn đồ cay nóng nha em yêu. Uống mật ong ấm bảo vệ cổ họng nhé! 🍯❤️"
];

// Module-level state
let loveDaysCount = 0;
let currentQuoteIdx = 0;
let isTransitioningQuote = false;
let weLoveAudio = null;
let isAudioPlaying = false;
let userManuallyPausedAudio = false;

let floatingHeartsIntervalId = null;
let checkRemindersIntervalId = null;
let remoteRefreshIntervalId = null;

// Sickness logs and reminders loaded data
let sicknessLogs = [];
let reminders = [];
let visitLogs = [];
let selectedFilterYear = 'Tất cả';
let weLoveCurrentSubView = 'memory'; // 'memory' | 'admin'
let dbSyncError = null;
let isLoadingData = false;

// Audio Instance getter
function getAudioInstance() {
    if (!weLoveAudio) {
        weLoveAudio = new Audio('./mot-doi.mp3?v=4.1.94');
        weLoveAudio.loop = true;
        
        weLoveAudio.addEventListener('play', () => {
            isAudioPlaying = true;
            updateAudioPlaybackState();
        });
        
        weLoveAudio.addEventListener('pause', () => {
            isAudioPlaying = false;
            updateAudioPlaybackState();
        });

        weLoveAudio.addEventListener('error', (e) => {
            console.warn("Audio file failed to load:", e);
            isAudioPlaying = false;
            updateAudioPlaybackState();
        });
    }
    return weLoveAudio;
}

function updateAudioPlaybackState() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isAudioPlaying ? 'playing' : 'paused';
    }
    const btn = document.getElementById('weLoveMusicToggle');
    if (btn) {
        if (isAudioPlaying) {
            btn.classList.add('playing');
            btn.innerHTML = '🎵';
        } else {
            btn.classList.remove('playing');
            btn.innerHTML = '🔇';
        }
    }
}

// Media session settings
function initMediaSession() {
    const aud = getAudioInstance();
    if ('mediaSession' in navigator && aud) {
        const logoPath = './logo_pwa_small.png?v=4.1.94';
        const absoluteLogoUrl = new URL(logoPath, window.location.href).href;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Một Đời',
            artist: 'Linh Tuấn ❤️ Ngô Minh',
            album: 'WeLove - Góc Kỷ Niệm',
            artwork: [
                { src: absoluteLogoUrl, sizes: '192x192', type: 'image/png' },
                { src: absoluteLogoUrl, sizes: '256x256', type: 'image/png' },
                { src: absoluteLogoUrl, sizes: '384x384', type: 'image/png' },
                { src: absoluteLogoUrl, sizes: '512x512', type: 'image/png' }
            ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
            aud.play().catch(err => console.error("MediaSession play error:", err));
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            aud.pause();
        });
    }
}

// Database Helpers
async function getSupabaseRSVPs() {
    const supabase = sync.getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('tuanminh_wedding_rsvps')
        .select('*')
        .eq('wedding_id', 'default')
        .order('created_at', { ascending: false });
    if (error) {
        console.error("Failed to query Supabase RSVPs:", error);
        throw error;
    }
    return data || [];
}

async function saveSupabaseRSVP(rsvp) {
    const supabase = sync.getSupabase();
    if (!supabase) return null;
    const payload = {
        wedding_id: 'default',
        guest_name: rsvp.guest_name,
        status: rsvp.status,
        guest_count: parseInt(rsvp.guest_count || 0),
        side: rsvp.side || 'both',
        wish: rsvp.wish || '',
        created_at: rsvp.created_at || new Date().toISOString()
    };
    if (rsvp.id) payload.id = rsvp.id;

    const { data, error } = await supabase
        .from('tuanminh_wedding_rsvps')
        .upsert(payload)
        .select()
        .single();
    if (error) {
        console.error("Failed to save Supabase RSVP:", error);
        throw error;
    }
    return data;
}

async function deleteSupabaseRSVP(id) {
    const supabase = sync.getSupabase();
    if (!supabase) return null;
    const { error } = await supabase
        .from('tuanminh_wedding_rsvps')
        .delete()
        .eq('id', id);
    if (error) {
        console.error("Failed to delete Supabase RSVP:", error);
        throw error;
    }
    return true;
}

function getLocalRSVPs() {
    return JSON.parse(localStorage.getItem('tm_wedding_rsvps') || '[]');
}

function saveLocalRSVP(rsvp) {
    const rsvps = getLocalRSVPs();
    const newRsvp = {
        id: rsvp.id || Math.random().toString(36).substring(2, 10),
        wedding_id: 'default',
        guest_name: rsvp.guest_name,
        status: rsvp.status,
        guest_count: parseInt(rsvp.guest_count || 0),
        side: rsvp.side || 'both',
        wish: rsvp.wish || '',
        created_at: rsvp.created_at || new Date().toISOString()
    };
    const idx = rsvp.id ? rsvps.findIndex(r => r.id === rsvp.id) : -1;
    if (idx >= 0) {
        rsvps[idx] = newRsvp;
    } else {
        rsvps.unshift(newRsvp);
    }
    localStorage.setItem('tm_wedding_rsvps', JSON.stringify(rsvps));
    return newRsvp;
}

function deleteLocalRSVP(id) {
    const rsvps = getLocalRSVPs();
    const filtered = rsvps.filter(r => r.id !== id);
    localStorage.setItem('tm_wedding_rsvps', JSON.stringify(filtered));
    return true;
}

// User agent parser helper
function parseDeviceFromUA(ua) {
    if (!ua) return 'Không rõ thiết bị';
    let device = 'Máy tính 💻';
    if (/mobile/i.test(ua)) device = 'Điện thoại 📱';
    else if (/tablet/i.test(ua) || /ipad/i.test(ua)) device = 'M.tính bảng 📟';
    
    let browser = 'Trình duyệt';
    if (/chrome/i.test(ua) && !/edge/i.test(ua) && !/opr/i.test(ua)) browser = 'Chrome';
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/edge/i.test(ua)) browser = 'Edge';
    
    let os = 'Hệ điều hành';
    if (/windows/i.test(ua)) os = 'Windows';
    else if (/macintosh|mac os/i.test(ua)) os = 'macOS';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
    
    return `${device} (${browser} - ${os})`;
}

// Calculate days in love (starting Sept 3rd, 2025 GMT+7)
export function calculateLoveDays() {
    // 2025-09-02 17:00:00 UTC = 2025-09-03 00:00:00 GMT+7
    const startMs = new Date('2025-09-02T17:00:00Z').getTime();
    const startDayEpoch = Math.floor((startMs + 7 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
    
    const today = new Date();
    const currentMs = today.getTime();
    const currentDayEpoch = Math.floor((currentMs + 7 * 60 * 60 * 1000) / (1000 * 60 * 60 * 24));
    
    loveDaysCount = currentDayEpoch - startDayEpoch + 1;
    return loveDaysCount;
}

// Update the double hearts widget on home page
export function updateHomeLoveWidget() {
    const days = calculateLoveDays();
    const homeLoveDays = document.getElementById('homeLoveDays');
    if (homeLoveDays) {
        homeLoveDays.innerText = days;
    }
    updateLoveWidgetUI();
}

export function updateLoveWidgetUI() {
    const toggle = document.getElementById('toggleShowLoveWidget');
    if (toggle) {
        toggle.checked = state.showLoveWidget !== false;
    }
    const widget = document.getElementById('homeLoveWidget');
    if (widget) {
        // Default show widget is true if showLoveWidget in state is true/undefined
        const show = state.showLoveWidget !== false;
        widget.style.display = show ? 'flex' : 'none';
    }
}

// Initialize floating hearts loop
function startFloatingHearts() {
    if (floatingHeartsIntervalId) clearInterval(floatingHeartsIntervalId);
    
    floatingHeartsIntervalId = setInterval(() => {
        const page = document.querySelector('.memory-page');
        if (!page) return;
        
        const heart = document.createElement('span');
        heart.className = 'bg-heart';
        heart.innerText = '❤️';
        
        const left = Math.random() * 100;
        const size = Math.random() * 20 + 10;
        const duration = Math.random() * 6 + 6;
        const opacity = Math.random() * 0.5 + 0.25;
        
        heart.style.left = `${left}%`;
        heart.style.fontSize = `${size}px`;
        heart.style.animationDuration = `${duration}s`;
        heart.style.setProperty('--opacity', opacity);
        
        page.appendChild(heart);
        
        // Remove after animation completes
        setTimeout(() => {
            if (heart.parentNode === page) {
                page.removeChild(heart);
            }
        }, duration * 1000);
    }, 2500);
}

// Screen click burst hearts
function handleScreenClickBurst(e) {
    const page = document.querySelector('.memory-page');
    if (!page) return;
    
    const heart = document.createElement('span');
    heart.className = 'click-heart';
    heart.innerText = '💖';
    
    const size = Math.random() * 25 + 15;
    heart.style.left = `${e.clientX}px`;
    heart.style.top = `${e.clientY}px`;
    heart.style.fontSize = `${size}px`;
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        if (heart.parentNode === document.body) {
            document.body.removeChild(heart);
        }
    }, 1200);

    // Autoplay audio on first user click if not paused
    const aud = getAudioInstance();
    if (aud && aud.paused && !userManuallyPausedAudio && !isAudioPlaying) {
        aud.play().catch(err => console.log("Autoplay click blocked:", err));
    }
}

// Slide quote functions
function nextLoveQuote() {
    if (isTransitioningQuote) return;
    const wrapper = document.querySelector('.quote-text-wrapper');
    if (!wrapper) return;
    
    isTransitioningQuote = true;
    wrapper.classList.add('flip-out-next');
    
    setTimeout(() => {
        currentQuoteIdx = (currentQuoteIdx + 1) % LOVE_QUOTES.length;
        const cnEl = wrapper.querySelector('.quote-chinese');
        const viEl = wrapper.querySelector('.quote-vietnamese');
        if (cnEl) cnEl.innerText = LOVE_QUOTES[currentQuoteIdx].cn;
        if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi;
        
        wrapper.classList.remove('flip-out-next');
        wrapper.classList.add('flip-in-next');
        
        setTimeout(() => {
            wrapper.classList.remove('flip-in-next');
            isTransitioningQuote = false;
        }, 250);
    }, 250);
}

function prevLoveQuote() {
    if (isTransitioningQuote) return;
    const wrapper = document.querySelector('.quote-text-wrapper');
    if (!wrapper) return;
    
    isTransitioningQuote = true;
    wrapper.classList.add('flip-out-prev');
    
    setTimeout(() => {
        currentQuoteIdx = (currentQuoteIdx - 1 + LOVE_QUOTES.length) % LOVE_QUOTES.length;
        const cnEl = wrapper.querySelector('.quote-chinese');
        const viEl = wrapper.querySelector('.quote-vietnamese');
        if (cnEl) cnEl.innerText = LOVE_QUOTES[currentQuoteIdx].cn;
        if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi;
        
        wrapper.classList.remove('flip-out-prev');
        wrapper.classList.add('flip-in-prev');
        
        setTimeout(() => {
            wrapper.classList.remove('flip-in-prev');
            isTransitioningQuote = false;
        }, 250);
    }, 250);
}

// Test / Trigger System Notifications
function triggerSystemNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') {
        console.warn("Notification permission not granted");
        return;
    }
    
    const logoPath = './logo_pwa_small.png?v=4.1.94';
    const absoluteLogoUrl = new URL(logoPath, window.location.href).href;
    const options = {
        body: body,
        icon: absoluteLogoUrl,
        badge: absoluteLogoUrl,
        vibrate: [100, 50, 100],
        tag: `scheduled-reminder-${Date.now()}`,
        renotify: true
    };
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, options)
                .catch(err => {
                    console.warn("SW showNotification failed, using fallback:", err);
                    new Notification(title, options);
                });
        });
    } else {
        new Notification(title, options);
    }
}

// Check scheduled reminders in background
function checkScheduledReminders() {
    const now = new Date();
    const dueReminders = reminders.filter(r => {
        if (r.isSent) return false;
        const schedTime = new Date(r.scheduledTime);
        return schedTime <= now;
    });

    if (dueReminders.length === 0) return;

    dueReminders.forEach(async (reminder) => {
        triggerSystemNotification(reminder.title, reminder.message);
        reminder.isSent = true;
        
        try {
            if (sync.isConfigured()) {
                await saveSupabaseRSVP({
                    id: reminder.id,
                    guest_name: reminder.title,
                    status: 'scheduled_reminder',
                    guest_count: 1, // marked sent
                    side: reminder.scheduledTime,
                    wish: reminder.message,
                    created_at: reminder.createdAt
                });
            } else {
                saveLocalRSVP({
                    id: reminder.id,
                    guest_name: reminder.title,
                    status: 'scheduled_reminder',
                    guest_count: 1,
                    side: reminder.scheduledTime,
                    wish: reminder.message,
                    created_at: reminder.createdAt
                });
            }
        } catch (err) {
            console.error("Error updating sent status on database:", err);
        }
    });

    // Re-render reminders timeline if currently viewing admin tab
    if (weLoveCurrentSubView === 'admin') {
        renderRemindersList();
    }
}

// Fetch WeLove data
export async function fetchWeLoveData() {
    if (isLoadingData) return;
    isLoadingData = true;
    dbSyncError = null;

    try {
        let rsvps = [];
        if (sync.isConfigured()) {
            try {
                rsvps = await getSupabaseRSVPs();
            } catch (e) {
                dbSyncError = e.message || 'Lỗi kết nối';
                rsvps = getLocalRSVPs();
            }
        } else {
            rsvps = getLocalRSVPs();
        }

        // 1. Process Sickness Logs
        const sicknessList = rsvps
            .filter(r => r.status === 'sickness_log')
            .map(r => ({
                id: r.id,
                date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                symptomType: r.guest_name,
                notes: r.wish,
                icon: r.side || '🤒'
            }));

        const isInitialized = rsvps.some(r => r.status === 'sickness_log_initialized');
        
        if (sicknessList.length === 0 && !isInitialized) {
            // Seed default sickness logs if database is empty
            const seedLogs = [
                { guest_name: 'Sốt đau đầu nhẹ', status: 'sickness_log', guest_count: 0, side: '🌡️', wish: 'Thời tiết giao mùa nóng lạnh thất thường dẫn đến sốt đau đầu. Anh đã chuẩn bị sẵn nước gừng ấm rồi đó.', created_at: '2026-04-05T00:00:00.000Z' },
                { guest_name: 'Cảm lạnh đi mưa', status: 'sickness_log', guest_count: 0, side: '🤧', wish: 'Đi chơi Valentine dính mưa phùn lạnh mà không chịu mặc thêm áo khoác dày. Phạt bé tự giác giữ ấm nha!', created_at: '2026-02-14T00:00:00.000Z' },
                { guest_name: 'Viêm họng ho khan', status: 'sickness_log', guest_count: 0, side: '😷', wish: 'Nói nhiều và uống nước đá lạnh đợt đầu đông quá nha! Lần sau phải uống trà gừng bảo vệ cổ họng nghe chưa.', created_at: '2025-11-20T00:00:00.000Z' },
                { guest_name: 'Kiệt sức mệt mỏi', status: 'sickness_log', guest_count: 0, side: '😴', wish: 'Áp lực học tập/công việc nhiều dẫn đến kiệt sức. Anh luôn bên cạnh và ôm bé thật chặt nhé! ❤️', created_at: '2025-09-15T00:00:00.000Z' }
            ];

            const initialSeedFlag = {
                guest_name: 'Sổ Tay Sức Khỏe',
                status: 'sickness_log_initialized',
                guest_count: 0,
                side: '🩺',
                wish: 'Hệ thống sổ tay sức khỏe đã được khởi tạo lần đầu thành công.'
            };

            if (sync.isConfigured() && !dbSyncError) {
                await saveSupabaseRSVP(initialSeedFlag);
                for (const item of seedLogs) {
                    await saveSupabaseRSVP(item);
                }
                const refreshed = await getSupabaseRSVPs();
                sicknessLogs = refreshed
                    .filter(r => r.status === 'sickness_log')
                    .map(r => ({
                        id: r.id,
                        date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                        symptomType: r.guest_name,
                        notes: r.wish,
                        icon: r.side || '🤒'
                    }));
            } else {
                saveLocalRSVP(initialSeedFlag);
                seedLogs.forEach(item => saveLocalRSVP(item));
                sicknessLogs = getLocalRSVPs()
                    .filter(r => r.status === 'sickness_log')
                    .map(r => ({
                        id: r.id,
                        date: r.created_at ? r.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
                        symptomType: r.guest_name,
                        notes: r.wish,
                        icon: r.side || '🤒'
                    }));
            }
        } else {
            // Clean up duplicates
            const uniqueMap = new Map();
            const dups = [];
            sicknessList.forEach(log => {
                const key = `${log.symptomType}-${log.notes}-${log.date}`;
                if (uniqueMap.has(key)) {
                    dups.push(log.id);
                } else {
                    uniqueMap.set(key, log);
                }
            });

            sicknessLogs = Array.from(uniqueMap.values());
            
            // Clean duplicates silently
            if (dups.length > 0) {
                dups.forEach(id => {
                    if (sync.isConfigured() && !dbSyncError) {
                        deleteSupabaseRSVP(id).catch(e => {});
                    } else {
                        deleteLocalRSVP(id);
                    }
                });
            }
        }
        sicknessLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 2. Process Reminders
        reminders = rsvps
            .filter(r => r.status === 'scheduled_reminder')
            .map(r => ({
                id: r.id,
                title: r.guest_name,
                message: r.wish,
                scheduledTime: r.side,
                isSent: parseInt(r.guest_count || 0) === 1,
                createdAt: r.created_at
            }));
        reminders.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));

        // 3. Process Visit Logs
        visitLogs = rsvps
            .filter(r => r.status === 'member_visit')
            .map(r => ({
                id: r.id,
                email: r.guest_name,
                timestamp: r.created_at || new Date().toISOString(),
                deviceInfo: parseDeviceFromUA(r.wish)
            }));

    } catch (err) {
        console.error("Error loading WeLove data:", err);
        dbSyncError = err.message || 'Lỗi hệ thống';
    } finally {
        isLoadingData = false;
        updateSyncStatusBadge();
    }
}

// Log a visit by the current logged in user (if they are the guest/spouse)
export async function logSpouseVisit() {
    const user = await sync.getCurrentUser();
    if (!user) return;
    
    // Only log if the logged in user is the spouse (not owner)
    // To identify couple roles: owner email is stored in state.ownerEmail (or state.user.email)
    const isOwner = state.ownerEmail === user.email || (state.user && state.user.email === user.email && !state.spouseEmail);
    if (!isOwner) {
        const visitLogged = sessionStorage.getItem('we_love_visit_logged');
        if (!visitLogged) {
            sessionStorage.setItem('we_love_visit_logged', 'true');
            try {
                if (sync.isConfigured()) {
                    await saveSupabaseRSVP({
                        guest_name: user.email,
                        status: 'member_visit',
                        guest_count: 1,
                        side: 'both',
                        wish: navigator.userAgent || 'Web Browser'
                    });
                } else {
                    saveLocalRSVP({
                        guest_name: user.email,
                        status: 'member_visit',
                        guest_count: 1,
                        side: 'both',
                        wish: navigator.userAgent || 'Web Browser'
                    });
                }
            } catch (err) {
                console.warn("Could not save visit log:", err);
            }
        }
    }
}

// Sync check reminders and UI updates
function setupAutoRefreshTimers() {
    if (checkRemindersIntervalId) clearInterval(checkRemindersIntervalId);
    checkRemindersIntervalId = setInterval(checkScheduledReminders, 15000);

    if (remoteRefreshIntervalId) clearInterval(remoteRefreshIntervalId);
    remoteRefreshIntervalId = setInterval(async () => {
        await fetchWeLoveData();
        if (weLoveCurrentSubView === 'memory') {
            renderSicknessHistory();
        } else {
            renderRemindersList();
            renderVisitLogs();
        }
    }, 90000); // refresh every 1.5 minutes
}

// Update the db sync status badge
function updateSyncStatusBadge() {
    const badge = document.getElementById('weLoveSyncBadge');
    if (!badge) return;

    if (dbSyncError) {
        badge.className = 'health-sync-badge error';
        badge.innerHTML = `
            <span class="sync-dot error"></span>
            <span class="sync-text" title="Lỗi: ${dbSyncError}. Đang dùng bộ nhớ cục bộ.">Lỗi: ${dbSyncError}</span>
        `;
    } else if (sync.isConfigured()) {
        badge.className = 'health-sync-badge';
        badge.innerHTML = `
            <span class="sync-dot online"></span>
            <span class="sync-text">Đồng bộ đám mây (Cloud)</span>
        `;
    } else {
        badge.className = 'health-sync-badge';
        badge.innerHTML = `
            <span class="sync-dot offline"></span>
            <span class="sync-text" title="Đang dùng bộ nhớ trình duyệt">Bộ nhớ thiết bị (Local)</span>
        `;
    }
}

// Render sickness logs history
function renderSicknessHistory() {
    const container = document.getElementById('weLoveSicknessTimeline');
    const countNum = document.getElementById('weLoveSicknessCount');
    const warningMsg = document.getElementById('weLoveHealthWarning');
    const filterPills = document.getElementById('weLoveYearsFilter');

    if (!container) return;

    // Filter by year
    const uniqueYears = Array.from(new Set(sicknessLogs.map(log => log.date.split('-')[0])));
    uniqueYears.sort((a, b) => b - a);
    const years = ['Tất cả', ...uniqueYears];

    // Render filter pills
    if (filterPills) {
        filterPills.innerHTML = years.map(yr => `
            <button class="health-year-pill ${selectedFilterYear === yr ? 'active' : ''}" data-year="${yr}">
                ${yr === 'Tất cả' ? '📅 Tất cả' : `✨ Năm ${yr}`}
            </button>
        `).join('');
        
        filterPills.querySelectorAll('.health-year-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectedFilterYear = e.target.getAttribute('data-year');
                renderSicknessHistory();
            });
        });
    }

    const filtered = selectedFilterYear === 'Tất cả' 
        ? sicknessLogs 
        : sicknessLogs.filter(log => log.date.startsWith(selectedFilterYear));

    // Update count
    if (countNum) countNum.innerText = filtered.length;

    // Update alert
    if (warningMsg) {
        warningMsg.className = `health-warning-msg ${filtered.length === 0 ? 'green' : filtered.length <= 3 ? 'yellow' : 'red'}`;
        if (filtered.length === 0) {
            warningMsg.innerHTML = selectedFilterYear === 'Tất cả' 
                ? "Thật tuyệt vời! Em iu chưa từng bị ốm lần nào. Hãy tiếp tục giữ gìn phong độ và ăn ngủ khoa học nhé! 🥰"
                : `Thật tuyệt vời! Em iu không bị ốm lần nào trong năm ${selectedFilterYear}. Phong độ giữ sức khỏe quá tốt! 🥰`;
        } else if (filtered.length <= 3) {
            warningMsg.innerHTML = `Em iu đã bị ốm <strong>${filtered.length} lần</strong> ${selectedFilterYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedFilterYear}`} rồi đó nha! Hãy ăn uống đầy đủ dinh dưỡng, mặc ấm khi lạnh. Anh xót xa lắm! 🥺`;
        } else {
            warningMsg.innerHTML = `🚨 <strong>Cảnh báo đỏ!</strong> Em iu đã bị ốm <strong>${filtered.length} lần</strong> ${selectedFilterYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedFilterYear}`}! Tần suất này quá nhiều. Em không được chủ quan nữa đâu đấy! Hứa với anh là luôn ngủ sớm nghe chưa! 😠❤️`;
        }
    }

    // Render timeline list
    if (isLoadingData && sicknessLogs.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-style: italic; margin: 2rem 0;">🔄 Đang đồng bộ hóa dữ liệu đám mây...</p>`;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-style: italic; margin: 2rem 0;">Chưa có ghi nhận đợt ốm nào ${selectedFilterYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedFilterYear}`}. Em iu luôn khỏe mạnh và rạng rỡ! 🌸</p>`;
        return;
    }

    container.innerHTML = filtered.map(log => {
        const parts = log.date.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : log.date;
        return `
            <div class="health-log-item">
                <div class="health-log-icon">${log.icon || '🤧'}</div>
                <div class="health-log-content">
                    <div class="health-log-header">
                        <span class="health-log-type">${escapeHTML(log.symptomType)}</span>
                        <span class="health-log-date">${dateFormatted}</span>
                    </div>
                    <p class="health-log-notes">${escapeHTML(log.notes)}</p>
                </div>
                <button class="health-delete-btn btn-delete-sickness" data-id="${log.id}" title="Xóa ghi nhận này">
                    🗑️
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-delete-sickness').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const confirmDelete = await window.showConfirm("Anh có chắc chắn muốn xóa đợt ghi nhận ốm này không? ❤️");
            if (confirmDelete) {
                try {
                    if (sync.isConfigured()) {
                        await deleteSupabaseRSVP(id);
                    } else {
                        deleteLocalRSVP(id);
                    }
                    sicknessLogs = sicknessLogs.filter(log => log.id !== id);
                    renderSicknessHistory();
                    showToast("Đã xóa đợt ghi nhận ốm");
                } catch (err) {
                    showToast("Lỗi khi xóa ghi nhận: " + err.message);
                }
            }
        });
    });
}

// Render reminders in admin view
function renderRemindersList() {
    const container = document.getElementById('weLoveRemindersTimeline');
    if (!container) return;

    if (reminders.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-style: italic; margin: 2rem 0;">Chưa có lịch nhắc nào được lên lịch 📭</p>`;
        return;
    }

    container.innerHTML = reminders.map(rem => {
        const schedDate = new Date(rem.scheduledTime);
        const formattedTime = schedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + schedDate.toLocaleDateString('vi-VN');
        return `
            <div class="health-log-item" style="padding: 1rem; min-height: auto; gap: 0.75rem;">
                <div class="health-log-icon" style="width: 42px; height: 42px; font-size: 1.3rem; padding: 0; display: flex; align-items: center; justify-content: center;">
                    ${rem.isSent ? '✅' : '⏳'}
                </div>
                <div class="health-log-content" style="display: flex; flex-direction: column; gap: 2px;">
                    <div class="health-log-header">
                        <span class="health-log-type">${escapeHTML(rem.title)}</span>
                        <span class="health-log-date" style="color: ${rem.isSent ? 'var(--accent-emerald)' : 'var(--accent-amber)'}">
                            ${rem.isSent ? 'Đã gửi' : 'Chờ gửi'}
                        </span>
                    </div>
                    <p class="health-log-notes" style="font-size: 0.85rem;">${escapeHTML(rem.message)}</p>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-top: 4px;">
                        📅 Hẹn lúc: ${formattedTime}
                    </span>
                </div>
                <button class="health-delete-btn btn-delete-reminder" data-id="${rem.id}" title="Hủy lịch nhắc này">
                    🗑️
                </button>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.btn-delete-reminder').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            const confirmDelete = await window.showConfirm("Anh có chắc chắn muốn hủy lịch nhắc này không? ⏰");
            if (confirmDelete) {
                try {
                    if (sync.isConfigured()) {
                        await deleteSupabaseRSVP(id);
                    } else {
                        deleteLocalRSVP(id);
                    }
                    reminders = reminders.filter(r => r.id !== id);
                    renderRemindersList();
                    showToast("Đã hủy lịch nhắc");
                } catch (err) {
                    showToast("Lỗi khi hủy lịch nhắc: " + err.message);
                }
            }
        });
    });
}

// Render visits in admin view
function renderVisitLogs() {
    const statsContainer = document.getElementById('weLoveVisitStats');
    const logsContainer = document.getElementById('weLoveVisitLogsTimeline');
    if (!logsContainer) return;

    // 1. Group stats
    const stats = {};
    visitLogs.forEach(log => {
        const dateObj = new Date(log.timestamp);
        // local GMT+7 offset adjustment
        const ictMs = dateObj.getTime() + (7 * 60 * 60 * 1000);
        const ictDate = new Date(ictMs);
        
        const year = ictDate.getUTCFullYear();
        const month = String(ictDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(ictDate.getUTCDate()).padStart(2, '0');
        
        const monthKey = `${month}/${year}`;
        const dayKey = `${day}/${month}/${year}`;
        
        if (!stats[monthKey]) {
            stats[monthKey] = { total: 0, days: {} };
        }
        stats[monthKey].total += 1;
        stats[monthKey].days[dayKey] = (stats[monthKey].days[dayKey] || 0) + 1;
    });

    // 2. Render quick counts in stats widgets
    if (statsContainer) {
        const totalVisits = visitLogs.length;
        
        const now = new Date();
        const curMonthKey = String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
        const curDayKey = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
        
        const monthVisits = stats[curMonthKey]?.total || 0;
        const todayVisits = stats[curMonthKey]?.days[curDayKey] || 0;

        statsContainer.innerHTML = `
            <div class="stats-item" style="padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <span style="font-size: 1.8rem; margin-bottom: 4px;">📈</span>
                <span class="stats-val" style="font-size: 1.5rem; font-weight: 800; color: var(--accent-rose);">${totalVisits}</span>
                <span class="stats-label" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Tổng số lần truy cập</span>
            </div>
            <div class="stats-item" style="padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <span style="font-size: 1.8rem; margin-bottom: 4px;">🗓️</span>
                <span class="stats-val" style="font-size: 1.5rem; font-weight: 800; color: var(--accent-rose);">${monthVisits}</span>
                <span class="stats-label" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Lần trong tháng</span>
            </div>
            <div class="stats-item" style="padding: 1rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;">
                <span style="font-size: 1.8rem; margin-bottom: 4px;">☀️</span>
                <span class="stats-val" style="font-size: 1.5rem; font-weight: 800; color: var(--accent-rose);">${todayVisits}</span>
                <span class="stats-label" style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">Lần hôm nay</span>
            </div>
        `;
    }

    // 3. Render visit calendar details
    let detailsHtml = '';
    if (visitLogs.length === 0) {
        detailsHtml = `<p style="color: var(--text-muted); font-size: 0.9rem; font-style: italic; text-align: center; padding: 1rem 0;">Chưa có dữ liệu truy cập 📭</p>`;
    } else {
        detailsHtml = Object.entries(stats).map(([month, mData]) => `
            <div style="padding: 1.25rem; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 18px; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-weight: 800; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                    <span>📅 Tháng ${month}</span>
                    <span style="background: var(--accent-rose); color: white; padding: 2px 10px; border-radius: 50px; font-size: 0.8rem;">${mData.total} lần</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${Object.entries(mData.days)
                        .sort((a,b) => {
                            const parseDate = (s) => {
                                const [d,m,y] = s.split('/').map(Number);
                                return new Date(y, m-1, d);
                            };
                            return parseDate(b[0]) - parseDate(a[0]);
                        })
                        .map(([day, cnt]) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; background: rgba(0,0,0,0.1); border-radius: 8px; font-size: 0.85rem;">
                                <span style="color: var(--text-secondary);">🗓️ Ngày ${day}</span>
                                <span style="font-weight: 700; color: var(--text-primary);">${cnt} lần</span>
                            </div>
                        `).join('')}
                </div>
            </div>
        `).join('');
    }
    const calendarSection = document.getElementById('weLoveVisitCalendarDetails');
    if (calendarSection) calendarSection.innerHTML = detailsHtml;

    // 4. Render timeline of 10 recent visits
    if (visitLogs.length === 0) {
        logsContainer.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem 0;">Chưa có lịch sử truy cập</p>`;
        return;
    }

    logsContainer.innerHTML = visitLogs.slice(0, 10).map((log, index) => {
        const dObj = new Date(log.timestamp);
        const ictMs = dObj.getTime() + (7 * 60 * 60 * 1000);
        const ictDate = new Date(ictMs);
        
        const timeStr = String(ictDate.getUTCHours()).padStart(2, '0') + ':' + 
                        String(ictDate.getUTCMinutes()).padStart(2, '0') + ':' + 
                        String(ictDate.getUTCSeconds()).padStart(2, '0');
        
        const dateStr = String(ictDate.getUTCDate()).padStart(2, '0') + '/' + 
                        String(ictDate.getUTCMonth() + 1).padStart(2, '0') + '/' + 
                        ictDate.getUTCFullYear();

        const isMobile = log.deviceInfo.includes('Điện thoại');
        return `
            <div class="health-log-item" style="padding: 0.8rem 1rem; margin-bottom: 0.5rem; min-height: auto; gap: 0.75rem;">
                <div class="health-log-icon" style="width: 38px; height: 38px; font-size: 1.2rem; padding: 0; display: flex; align-items: center; justify-content: center;">
                    ${isMobile ? '📱' : '💻'}
                </div>
                <div class="health-log-content" style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
                    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                        <span style="font-size: 0.85rem; font-weight: 700;">${dateStr} - ${timeStr}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHTML(log.email)}</span>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-secondary);">${escapeHTML(log.deviceInfo)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// HTML escape helper
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// Render WeLove main dashboard
export async function renderWeLoveDashboard() {
    const tabContainer = document.getElementById('tab-welove');
    if (!tabContainer) return;

    calculateLoveDays();

    // Check if the user can edit WeLove data
    // In FamiLife, both husband and wife are authorized couples and can edit.
    // If not logged in (local mode), anyone can edit as well.
    const isLocal = !sync.isConfigured() || !state.user;
    const canEdit = isLocal || state.user !== null;

    tabContainer.innerHTML = `
        <div class="memory-page" id="weLovePage">
            <!-- Sync badge -->
            <div class="health-sync-badge" id="weLoveSyncBadge">
                <span class="sync-dot offline"></span><span class="sync-text">Đang tải...</span>
            </div>

            <!-- Switch View Button -->
            ${canEdit ? `
                <div style="margin-bottom: 1.5rem; z-index: 10; display: flex; gap: 8px;">
                    <button class="btn ${weLoveCurrentSubView === 'memory' ? 'btn-primary' : 'btn-secondary'}" id="btnWeLoveMemoryView" style="font-size: 0.85rem; padding: 6px 14px; border-radius: 50px;">
                        ❤️ Kỷ niệm
                    </button>
                    <button class="btn ${weLoveCurrentSubView === 'admin' ? 'btn-primary' : 'btn-secondary'}" id="btnWeLoveAdminView" style="font-size: 0.85rem; padding: 6px 14px; border-radius: 50px;">
                        ⏰ Lịch nhắc & Nhật ký
                    </button>
                </div>
            ` : ''}

            ${weLoveCurrentSubView === 'admin' && canEdit ? `
                <!-- ADMIN SUBVIEW -->
                <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%; align-items: center; max-width: 580px; margin: 0 auto; z-index: 5;">
                    
                    <!-- Lên lịch lời nhắc -->
                    <div class="health-card" style="margin-top: 0; width: 100%;">
                        <div class="health-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                            <span style="font-size: 1.8rem;">⏰</span>
                            <h3 class="health-title">Đặt Lịch Lời Nhắc Yêu Thương</h3>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.4;">
                            Lên lịch gửi thông báo nhắc nhở tự động đến thiết bị của em iu Ngô Minh
                        </p>

                        <form id="weLoveAddReminderForm" style="text-align: left; margin-bottom: 2rem;">
                            <div class="health-form-group">
                                <label class="health-form-label">⏰ Thời gian gửi thông báo:</label>
                                <input type="datetime-local" class="health-input" id="remTimeInput" required>
                            </div>
                            <div class="health-form-group">
                                <label class="health-form-label">✍️ Tiêu đề thông báo:</label>
                                <input type="text" class="health-input" id="remTitleInput" placeholder="Ví dụ: Lời nhắc từ anh Tuấn ❤️, Chú ý em iu ơi! 🥤" required>
                            </div>
                            <div class="health-form-group">
                                <label class="health-form-label">✍️ Nội dung lời nhắc:</label>
                                <textarea class="health-textarea" id="remMessageInput" rows="3" placeholder="Nhập nội dung lời nhắn gửi đến em iu..." required></textarea>
                            </div>
                            <button type="submit" class="health-btn health-btn-primary" style="width: 100%; margin-top: 0.5rem;">
                                Lên lịch ngay ❤️
                            </button>
                        </form>

                        <h4 style="font-size: 1rem; font-weight: 700; border-left: 4px solid var(--accent-rose); padding-left: 0.5rem; text-align: left; margin-bottom: 1rem;">
                            Danh sách lời nhắc đã lên lịch
                        </h4>
                        <div class="health-timeline" id="weLoveRemindersTimeline" style="max-height: 300px;">
                            <p style="text-align: center; color: var(--text-secondary); font-style: italic;">Đang tải...</p>
                        </div>
                    </div>

                    <!-- Nhật ký truy cập của em yêu -->
                    <div class="health-card" style="margin-top: 0; width: 100%;">
                        <div class="health-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                            <span style="font-size: 1.8rem;">📊</span>
                            <h3 class="health-title">Nhật Kỳ Truy Cập Của Em Iu</h3>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; font-weight: 600;">
                            Đang theo dõi email: <span style="color: var(--accent-rose);">${state.spouseEmail || 'nửa kia'}</span>
                        </p>

                        <div class="stats-grid" id="weLoveVisitStats" style="margin-bottom: 2rem;">
                            <!-- populated by JS -->
                        </div>

                        <h4 style="font-size: 1rem; font-weight: 700; border-left: 4px solid var(--accent-rose); padding-left: 0.5rem; text-align: left; margin-bottom: 1rem;">
                            Chi tiết lượt truy cập qua các ngày
                        </h4>
                        <div id="weLoveVisitCalendarDetails" style="display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; text-align: left;">
                            <!-- populated by JS -->
                        </div>

                        <h4 style="font-size: 1rem; font-weight: 700; border-left: 4px solid var(--accent-rose); padding-left: 0.5rem; text-align: left; margin-bottom: 1rem;">
                            Lịch sử 10 lần truy cập gần nhất
                        </h4>
                        <div class="health-timeline" id="weLoveVisitLogsTimeline" style="max-height: 280px;">
                            <!-- populated by JS -->
                        </div>
                    </div>

                </div>
            ` : `
                <!-- STANDARD KỶ NIỆM SUBVIEW -->
                <div class="memory-card">
                    <!-- Music player disk button -->
                    <button class="music-toggle-btn" id="weLoveMusicToggle" title="Phát nhạc nền lãng mạn">🔇</button>
                    <!-- Test notifications bell -->
                    <button class="notification-test-btn" id="weLoveNotificationTest" title="Thử nghiệm thông báo yêu thương">🔔</button>

                    <div class="heart-pulsing" id="weLovePulsingHeart" title="Nhấn vào màn hình để thả tim!">💝</div>
                    <h2 class="memory-title">Kỷ Niệm Tình Yêu</h2>
                    <p class="memory-subtitle">Linh Tuấn ❤️ Ngô Minh - Góc nhỏ yêu thương đếm ngày bên nhau</p>
                    
                    <div class="days-counter-box">
                        <div class="days-number" id="weLoveDaysCountVal">${loveDaysCount}</div>
                        <div class="days-label">Ngày bên nhau</div>
                    </div>

                    <div class="milestone-date">
                        📅 Cột mốc khởi đầu: 03/09/2025
                    </div>

                    <!-- Quotes board -->
                    <div class="quote-container" id="weLoveQuoteContainer" style="cursor: grab;" title="Nhấp nút hoặc vuốt câu nói để chuyển câu">
                        <button class="quote-nav-btn prev" id="btnWeLovePrevQuote">‹</button>
                        <div class="quote-text-wrapper">
                            <div class="quote-chinese">${LOVE_QUOTES[currentQuoteIdx].cn}</div>
                            <div class="quote-vietnamese">${LOVE_QUOTES[currentQuoteIdx].vi}</div>
                        </div>
                        <button class="quote-nav-btn next" id="btnWeLoveNextQuote">›</button>
                    </div>
                </div>

                <!-- Sổ tay sức khỏe em iu -->
                <div class="health-card">
                    <div class="health-title-box">
                        <span style="font-size: 1.8rem;">🩺</span>
                        <h3 class="health-title">Sổ Tay Sức Khỏe Của Em Iu</h3>
                    </div>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                        Thống kê đợt ốm qua các năm của em iu Ngô Minh và lời dặn dò yêu thương từ anh Tuấn đẹp trai
                    </p>

                    <!-- Years selector filter pills -->
                    <div class="health-years-container" id="weLoveYearsFilter" style="margin-top: 1.5rem;">
                        <!-- populated by JS -->
                    </div>

                    <!-- Sickness circle stats & alert -->
                    <div class="health-summary-box">
                        <div class="health-heart-circle">
                            <span class="health-count-lbl">Tổng</span>
                            <span class="health-count-num" id="weLoveSicknessCount">0</span>
                            <span class="health-count-lbl">Lần Ốm</span>
                        </div>
                        <div class="health-warning-msg" id="weLoveHealthWarning">
                            Đang tải...
                        </div>
                    </div>

                    <!-- Timeline Title & Add Btn -->
                    <div class="health-timeline-title">
                        <span id="weLoveHistoryTitle">📅 Lịch Sử Các Đợt Ốm</span>
                        ${canEdit ? `
                            <button class="btn btn-primary" id="btnWeLoveAddSickness" style="margin-left: auto; font-size: 0.85rem; padding: 4px 12px; border-radius: 10px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border: none; color: #fff; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.15);">
                                <span>Ghi nhận mới 📝</span>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Timeline list -->
                    <div class="health-timeline" id="weLoveSicknessTimeline">
                        <p style="text-align: center; color: var(--text-secondary); font-style: italic;">Đang tải...</p>
                    </div>
                </div>
            `}
        </div>

        <!-- ROMANTIC MODAL FORM (Only visible to Admin/Logged in) -->
        <div class="health-modal-overlay" id="weLoveAddSicknessModal" style="display: none;">
            <div class="health-modal-content">
                <h4 class="health-modal-title">
                    <span>🩺 Ghi Nhận Em Iu Bị Ốm</span>
                </h4>
                
                <form id="weLoveAddSicknessForm">
                    <div class="health-form-group">
                        <label class="health-form-label">📅 Ngày bị ốm:</label>
                        <input type="date" class="health-input" id="sickDateInput" required>
                    </div>

                    <div class="health-form-group">
                        <label class="health-form-label">🤒 Triệu chứng / Đợt ốm (tự ghi):</label>
                        <input type="text" class="health-input" id="sickSymptomInput" placeholder="Ví dụ: Cảm sốt đi mưa, Đau họng ho khan, Sốt siêu vi..." required>
                    </div>

                    <div class="health-form-group">
                        <label class="health-form-label">✍️ Chọn nhanh mẫu lời dặn dò nhanh:</label>
                        <div class="health-templates-box">
                            ${CARE_TEMPLATES.map(tmpl => `
                                <div class="health-template-chip btn-select-template" data-text="${escapeHTML(tmpl)}">
                                    ${escapeHTML(tmpl)}
                                </div>
                            `).join('')}
                        </div>

                        <label class="health-form-label">✍️ Hoặc tự điền lời dặn dò yêu thương:</label>
                        <textarea class="health-textarea" id="sickNotesInput" rows="3" placeholder="Nhập lời dặn dò của bạn tại đây hoặc bấm chọn mẫu nhanh ở trên..." required></textarea>
                    </div>

                    <div class="health-btn-group">
                        <button type="button" class="health-btn health-btn-secondary" id="btnWeLoveCloseSicknessModal">
                            Hủy bỏ
                        </button>
                        <button type="submit" class="health-btn health-btn-primary">
                            Lưu Ghi Nhận ❤️
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Initialize media metadata
    initMediaSession();

    // Bind sub-view selectors
    const btnMemory = document.getElementById('btnWeLoveMemoryView');
    const btnAdmin = document.getElementById('btnWeLoveAdminView');
    if (btnMemory) {
        btnMemory.addEventListener('click', () => {
            weLoveCurrentSubView = 'memory';
            renderWeLoveDashboard();
        });
    }
    if (btnAdmin) {
        btnAdmin.addEventListener('click', () => {
            weLoveCurrentSubView = 'admin';
            renderWeLoveDashboard();
        });
    }

    // Load data and bind events
    await fetchWeLoveData();
    updateAudioPlaybackState(); // Make sure play button icon matches current playing state

    if (weLoveCurrentSubView === 'memory') {
        renderSicknessHistory();
        bindMemoryEvents();
    } else {
        renderRemindersList();
        renderVisitLogs();
        bindAdminEvents();
    }

    // Set up auto refreshes
    setupAutoRefreshTimers();
    
    // Log visit if logged in as spouse
    logSpouseVisit();
}

// Bind events for standard view
function bindMemoryEvents() {
    // Music player
    const btnToggleMusic = document.getElementById('weLoveMusicToggle');
    if (btnToggleMusic) {
        btnToggleMusic.addEventListener('click', (e) => {
            e.stopPropagation();
            const aud = getAudioInstance();
            if (isAudioPlaying) {
                aud.pause();
                userManuallyPausedAudio = true;
            } else {
                aud.play()
                    .then(() => {
                        userManuallyPausedAudio = false;
                    })
                    .catch(err => console.error("Audio playback error:", err));
            }
        });
    }

    // Notification permission bell
    const btnNotification = document.getElementById('weLoveNotificationTest');
    if (btnNotification) {
        btnNotification.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!('Notification' in window)) {
                alert('Trình duyệt của bạn không hỗ trợ hiển thị thông báo.');
                return;
            }

            const triggerSub = () => {
                triggerSystemNotification(
                    'WeLove - Lời Yêu Thương', 
                    'Gửi ngàn lời yêu thương và cái ôm ấm áp đến em iu Ngô Minh! Chúc em một ngày ngập tràn hạnh phúc! ❤️'
                );
                
                // Attempt to register Push Subscription to Supabase database
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(reg => {
                        if (sync.isConfigured()) {
                            // Register to Supabase via sync module helper (direct push subscribe)
                            try {
                                const email = state.user?.email || 'unknown';
                                sync.getSupabase().db.subscribeToPush(reg, email).catch(err => {});
                            } catch (err) {}
                        }
                    });
                }
            };

            if (Notification.permission === 'granted') {
                triggerSub();
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        triggerSub();
                    }
                });
            } else {
                alert('Quyền thông báo đang bị chặn. Vui lòng bật lại quyền thông báo trong cài đặt trình duyệt để nhận lịch nhắc!');
            }
        });
    }

    // Quotes Navigation Buttons
    const btnPrev = document.getElementById('btnWeLovePrevQuote');
    const btnNext = document.getElementById('btnWeLoveNextQuote');
    if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prevLoveQuote(); });
    if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); nextLoveQuote(); });

    // Quote swipe handling (touch devices)
    const quoteContainer = document.getElementById('weLoveQuoteContainer');
    if (quoteContainer) {
        let touchStartX = null;
        let touchTranslation = 0;
        let isSwiping = false;

        quoteContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            isSwiping = true;
            quoteContainer.style.cursor = 'grabbing';
        }, { passive: true });

        quoteContainer.addEventListener('touchmove', (e) => {
            if (!isSwiping || touchStartX === null) return;
            const curX = e.touches[0].clientX;
            const diffX = curX - touchStartX;
            // elastic cap drag
            touchTranslation = Math.max(-130, Math.min(130, diffX));
            
            const wrapper = quoteContainer.querySelector('.quote-text-wrapper');
            if (wrapper) {
                wrapper.style.transform = `translateX(${touchTranslation}px) rotateY(${touchTranslation / 130 * -35}deg)`;
                wrapper.style.opacity = Math.max(0.3, 1 - Math.abs(touchTranslation) / 160);
                wrapper.style.transition = 'none';
            }
        }, { passive: true });

        quoteContainer.addEventListener('touchend', (e) => {
            if (!isSwiping) return;
            isSwiping = false;
            quoteContainer.style.cursor = 'grab';

            const wrapper = quoteContainer.querySelector('.quote-text-wrapper');
            if (wrapper) {
                wrapper.style.transform = '';
                wrapper.style.opacity = '';
                wrapper.style.transition = 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s ease';
            }

            if (touchTranslation > 65) {
                prevLoveQuote();
            } else if (touchTranslation < -65) {
                nextLoveQuote();
            }

            touchTranslation = 0;
            touchStartX = null;
        });
    }

    // Pulsing heart surprises
    const heartPulse = document.getElementById('weLovePulsingHeart');
    if (heartPulse) {
        heartPulse.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast("Gửi ngàn trái tim yêu thương gửi đến Ngô Minh xinh đẹp! 💕");
        });
    }

    // General screen click bubble hearts spawn
    const weLovePage = document.getElementById('weLovePage');
    if (weLovePage) {
        weLovePage.addEventListener('click', handleScreenClickBurst);
    }

    // Modal Form Trigger
    const btnAddSickness = document.getElementById('btnWeLoveAddSickness');
    const modalOverlay = document.getElementById('weLoveAddSicknessModal');
    const btnCloseModal = document.getElementById('btnWeLoveCloseSicknessModal');
    const formAddSickness = document.getElementById('weLoveAddSicknessForm');
    const sickDateInput = document.getElementById('sickDateInput');
    const sickSymptomInput = document.getElementById('sickSymptomInput');
    const sickNotesInput = document.getElementById('sickNotesInput');

    if (btnAddSickness && modalOverlay) {
        btnAddSickness.addEventListener('click', () => {
            sickDateInput.value = new Date().toISOString().split('T')[0];
            sickSymptomInput.value = '';
            sickNotesInput.value = '';
            modalOverlay.style.display = 'flex';
        });
    }

    if (btnCloseModal && modalOverlay) {
        btnCloseModal.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', () => {
            modalOverlay.style.display = 'none';
        });
        const modalContent = modalOverlay.querySelector('.health-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    // Select templates chips click
    const chips = modalOverlay ? modalOverlay.querySelectorAll('.btn-select-template') : [];
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            if (sickNotesInput) {
                sickNotesInput.value = e.target.getAttribute('data-text');
            }
        });
    });

    // Form submit
    if (formAddSickness && modalOverlay) {
        formAddSickness.addEventListener('submit', async (e) => {
            e.preventDefault();
            const symptom = sickSymptomInput.value.trim();
            const notes = sickNotesInput.value.trim();
            const date = sickDateInput.value;

            if (!symptom) return;

            // Compute cute emoji based on keyword
            let emoji = '🤒';
            const symLower = symptom.toLowerCase();
            if (symLower.includes('cảm') || symLower.includes('lạnh') || symLower.includes('cúm')) emoji = '🤧';
            else if (symLower.includes('sốt') || symLower.includes('nóng') || symLower.includes('nhiệt')) emoji = '🌡️';
            else if (symLower.includes('họng') || symLower.includes('ho')) emoji = '😷';
            else if (symLower.includes('mệt') || symLower.includes('oải') || symLower.includes('kiệt sức') || symLower.includes('yếu') || symLower.includes('đuối') || symLower.includes('xỉu')) emoji = '😴';
            else if (symLower.includes('đau đầu') || symLower.includes('nhức đầu') || symLower.includes('đầu') || symLower.includes('chóng mặt') || symLower.includes('choáng')) emoji = '🧠';
            else if (symLower.includes('bụng') || symLower.includes('dạ dày') || symLower.includes('bao tử') || symLower.includes('tiêu hóa') || symLower.includes('luộm nhuộm')) emoji = '🤢';

            const newRsvp = {
                guest_name: symptom,
                status: 'sickness_log',
                guest_count: 0,
                side: emoji,
                wish: notes || 'Giữ gìn sức khỏe nhé em iu!',
                created_at: new Date(date + 'T12:00:00').toISOString()
            };

            try {
                let saved = null;
                if (sync.isConfigured()) {
                    saved = await saveSupabaseRSVP(newRsvp);
                } else {
                    saved = saveLocalRSVP(newRsvp);
                }

                if (saved) {
                    sicknessLogs.unshift({
                        id: saved.id,
                        date: date,
                        symptomType: saved.guest_name,
                        notes: saved.wish,
                        icon: saved.side
                    });
                    sicknessLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
                    renderSicknessHistory();
                    modalOverlay.style.display = 'none';
                    showToast("Đã ghi nhận đợt ốm thành công ❤️");
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi lưu trữ dữ liệu sức khỏe lên server: " + err.message);
            }
        });
    }
}

// Bind events for admin view
function bindAdminEvents() {
    const formAddReminder = document.getElementById('weLoveAddReminderForm');
    const remTimeInput = document.getElementById('remTimeInput');
    const remTitleInput = document.getElementById('remTitleInput');
    const remMessageInput = document.getElementById('remMessageInput');

    if (formAddReminder) {
        formAddReminder.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = remTitleInput.value.trim();
            const message = remMessageInput.value.trim();
            const timeVal = remTimeInput.value;

            if (!title || !message || !timeVal) return;

            const scheduledTimeIso = new Date(timeVal).toISOString();

            const newReminder = {
                guest_name: title,
                status: 'scheduled_reminder',
                guest_count: 0, // not sent
                side: scheduledTimeIso,
                wish: message,
                created_at: new Date().toISOString()
            };

            try {
                let saved = null;
                if (sync.isConfigured()) {
                    saved = await saveSupabaseRSVP(newReminder);
                } else {
                    saved = saveLocalRSVP(newReminder);
                }

                if (saved) {
                    reminders.unshift({
                        id: saved.id,
                        title: saved.guest_name,
                        message: saved.wish,
                        scheduledTime: saved.side,
                        isSent: false,
                        createdAt: saved.created_at
                    });
                    reminders.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));
                    renderRemindersList();
                    
                    remTimeInput.value = '';
                    remTitleInput.value = '';
                    remMessageInput.value = '';
                    
                    showToast("Lên lịch nhắc nhở thành công ⏰");
                }
            } catch (err) {
                alert("Không thể lưu lịch nhắc: " + err.message);
            }
        });
    }
}

// Global initialization bindings (ran on DOMContentLoaded in app.js)
export function initWeLoveBindings() {
    // Calculate and populate home widgets on load
    updateHomeLoveWidget();

    // Auto register service worker subscription check on load if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
        const timer = setTimeout(() => {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                    if (sync.isConfigured()) {
                        const email = state.user?.email || 'unknown';
                        sync.getSupabase().db?.subscribeToPush(reg, email).catch(e => {});
                    }
                });
            }
        }, 3000);
    }
}
