// src/features/we-love/we-love.js - WeLove Couple Memory Corner Module
import { 
    state, saveLocalState, showToast, performSync, updateSidebarNavVisibility
} from '../../core/app.js?v=4.3.239';
import * as sync from '../../core/sync.js?v=4.3.239';
import { encrypt, decrypt } from '../../core/crypto.js?v=4.3.239';

// Biến lưu tỉ lệ zoom hiện tại của Lightbox để điều khiển UI toggle
let currentLightboxScale = 1;

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
    cn: "只要有你陪伴，每天都是晴天。",
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
    cn: "你是我生命中最好的礼物。",
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

// UI variables
let sicknessLogs = [];
let reminders = [];
let visitLogs = [];
let selectedFilterYear = 'Tất cả';
let weLoveCurrentSubView = 'memory'; // 'memory' | 'admin' | 'settings'

// Audio Instance getter
function getAudioInstance() {
    if (!weLoveAudio) {
        weLoveAudio = new Audio('./mot-doi.mp3?v=4.3.239');
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
            if (btn.classList.contains('modern-round-btn')) {
                btn.innerHTML = `<i data-lucide="music" style="width: 16px; height: 16px; color: var(--accent-rose);"></i>`;
            } else {
                btn.innerHTML = '🎵';
            }
        } else {
            btn.classList.remove('playing');
            if (btn.classList.contains('modern-round-btn')) {
                btn.innerHTML = `<i data-lucide="music-2" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>`;
            } else {
                btn.innerHTML = '🔇';
            }
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }
}

// Media session settings
function initMediaSession() {
    const aud = getAudioInstance();
    if ('mediaSession' in navigator && aud) {
        const logoPath = './logo_pwa_small.png?v=4.3.239';
        const absoluteLogoUrl = new URL(logoPath, window.location.href).href;
        
        navigator.mediaSession.metadata = new MediaMetadata({
            title: 'Một Đời',
            artist: `${state.weLoveName1 || 'Anh'} ❤️ ${state.weLoveName2 || 'Em'}`,
            album: 'WeLove - Góc Tình Yêu',
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

// Format YYYY-MM-DD to DD/MM/YYYY
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

// Format YYYY-MM-DD to "Ngày DD tháng MM năm YYYY" for preview
function formatDateDisplayWord(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const day = parseInt(parts[2], 10);
        const month = parseInt(parts[1], 10);
        const year = parts[0];
        return `Ngày ${day} tháng ${month} năm ${year}`;
    }
    return dateStr;
}

// Calculate days in love
export function calculateLoveDays() {
    const startDateStr = state.weLoveStartDate;
    if (!startDateStr) {
        loveDaysCount = 0;
        return loveDaysCount;
    }
    
    const parts = startDateStr.split('-');
    if (parts.length !== 3) {
        loveDaysCount = 0;
        return loveDaysCount;
    }
    
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const day = parseInt(parts[2]);
    
    // Khởi tạo ngày bắt đầu ở múi giờ địa phương (00:00:00)
    const startDateLocal = new Date(year, month, day, 0, 0, 0, 0);
    
    // Khởi tạo ngày hiện tại ở múi giờ địa phương và đưa về nửa đêm (00:00:00)
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    
    // Tính khoảng cách ngày chính xác dựa trên mili-giây múi giờ Việt Nam
    const diffMs = todayLocal.getTime() - startDateLocal.getTime();
    loveDaysCount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    
    if (loveDaysCount < 0) loveDaysCount = 0;
    
    return loveDaysCount;
}

// Calculate detailed duration in years, months, and days
export function getDetailedLoveDuration() {
    const startDateStr = state.weLoveStartDate;
    if (!startDateStr) return null;
    
    const parts = startDateStr.split('-');
    if (parts.length !== 3) return null;
    
    const sYear = parseInt(parts[0]);
    const sMonth = parseInt(parts[1]) - 1;
    const sDay = parseInt(parts[2]);
    
    const start = new Date(sYear, sMonth, sDay);
    const today = new Date();
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (end < start) return null;
    
    let years = end.getFullYear() - start.getFullYear();
    let months = end.getMonth() - start.getMonth();
    let days = end.getDate() - start.getDate();
    
    if (days < 0) {
        // Lấy ngày cuối của tháng trước
        const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
    }
    
    if (months < 0) {
        months += 12;
        years--;
    }
    
    return { years, months, days };
}

export function formatDetailedLoveDuration() {
    const duration = getDetailedLoveDuration();
    if (!duration) return '';
    
    const { years, months, days } = duration;
    
    if (years === 0 && months === 0) {
        return ''; // Dưới 1 tháng thì không hiện chi tiết (chỉ cần số ngày là đủ)
    }
    
    const parts = [];
    if (years > 0) parts.push(`${years} năm`);
    if (months > 0) parts.push(`${months} tháng`);
    if (days > 0) parts.push(`${days} ngày`);
    
    return `(${parts.join(' ')})`;
}

// Update the double hearts widget on home page
export function updateHomeLoveWidget() {
    const days = calculateLoveDays();
    const homeLoveDays = document.getElementById('homeLoveDays');
    if (homeLoveDays) {
        homeLoveDays.innerText = state.weLoveStartDate ? days : '?';
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
        const show = state.showLoveWidget !== false;
        widget.style.display = show ? 'flex' : 'none';
        
        const namesEl = widget.querySelector('.love-names');
        if (namesEl) {
            if (state.weLoveName1 && state.weLoveName2) {
                namesEl.innerHTML = `${escapeHTML(state.weLoveName1)} <span class="heart-beat">❤️</span> ${escapeHTML(state.weLoveName2)}`;
            } else {
                namesEl.innerHTML = `WeLove`;
            }
        }
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
        
        setTimeout(() => {
            if (heart.parentNode === page) {
                page.removeChild(heart);
            }
        }, duration * 1000);
    }, 2500);
}

// Screen click burst hearts (using PointerEvents for instant taps)
function handleScreenClickBurst(e) {
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('textarea') || e.target.closest('.welove-modal-content')) return;
    
    const page = document.querySelector('.memory-page');
    if (!page) return;
    
    const heart = document.createElement('span');
    heart.className = 'click-heart';
    heart.innerText = '💖';
    
    // Support multi-touch client coordinates robustly
    let posX = e.clientX;
    let posY = e.clientY;
    if (e.touches && e.touches[0]) {
        posX = e.touches[0].clientX;
        posY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches[0]) {
        posX = e.changedTouches[0].clientX;
        posY = e.changedTouches[0].clientY;
    }
    
    const size = Math.random() * 25 + 15;
    heart.style.left = `${posX}px`;
    heart.style.top = `${posY}px`;
    heart.style.fontSize = `${size}px`;
    
    document.body.appendChild(heart);
    
    setTimeout(() => {
        if (heart.parentNode === document.body) {
            document.body.removeChild(heart);
        }
    }, 1200);

    const aud = getAudioInstance();
    if (state.weLoveAutoplay && aud && aud.paused && !userManuallyPausedAudio && !isAudioPlaying) {
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
        if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi.normalize('NFC');
        
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
        if (viEl) viEl.innerText = LOVE_QUOTES[currentQuoteIdx].vi.normalize('NFC');
        
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
    
    const logoPath = './logo_pwa_small.png?v=4.3.239';
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
    let hasUpdates = false;

    if (!state.weLoveReminders) state.weLoveReminders = [];

    state.weLoveReminders.forEach((r) => {
        if (r.isSent) return;
        const schedTime = new Date(r.scheduledTime);
        if (schedTime <= now) {
            triggerSystemNotification(r.title, r.message);
            r.isSent = true;
            hasUpdates = true;
        }
    });

    if (hasUpdates) {
        state.weLoveRemindersUpdated = new Date().toISOString();
        saveLocalState().then(() => {
            if (sync.isConfigured() && state.user) {
                performSync(true);
            }
        });
        
        reminders = state.weLoveReminders || [];
        if (weLoveCurrentSubView === 'admin') {
            renderRemindersList();
        }
    }
}

// Fetch WeLove data
export async function fetchWeLoveData() {
    // Tự động gán ownerEmail nếu trống
    if (!state.ownerEmail && state.user && state.user.email) {
        state.ownerEmail = state.user.email.toLowerCase().trim();
        state.ownerEmailUpdated = new Date().toISOString();
        await saveLocalState();
    }

    // 1. Process Sickness Logs
    if (!state.weLoveSicknessLogs) {
        state.weLoveSicknessLogs = [];
        state.weLoveSicknessLogsUpdated = new Date().toISOString();
        await saveLocalState();
    }

    sicknessLogs = state.weLoveSicknessLogs || [];
    sicknessLogs.sort((a, b) => new Date(b.date) - new Date(a.date));

    // 2. Process Reminders
    if (!state.weLoveReminders) state.weLoveReminders = [];
    reminders = state.weLoveReminders || [];
    reminders.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));



    updateSyncStatusBadge();
    
    // Tự động lên lịch thông báo native Local Notifications
    if (typeof syncLocalNotifications === 'function') {
        syncLocalNotifications();
    }
}

// Log a visit by the current logged in user (if they are the guest/spouse)
export async function logSpouseVisit() {
    // Đã xóa theo yêu cầu người dùng
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
        } else if (weLoveCurrentSubView === 'admin') {
            renderRemindersList();
            renderVisitLogs();
        }
    }, 60000); // refresh every 1 minute
}

// Update the db sync status badge
function updateSyncStatusBadge() {
    const badge = document.getElementById('weLoveSyncBadge');
    if (!badge) return;

    if (sync.isConfigured() && state.user) {
        badge.className = 'welove-sync-badge';
        badge.innerHTML = `
            <span class="sync-dot online"></span>
            <span class="sync-text">Mã hóa đồng bộ đám mây (Cloud)</span>
        `;
    } else {
        badge.className = 'welove-sync-badge';
        badge.innerHTML = `
            <span class="sync-dot offline"></span>
            <span class="sync-text" title="Lưu trữ ngoại tuyến trên thiết bị này">Bộ nhớ thiết bị (Local)</span>
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

    const uniqueYears = Array.from(new Set(sicknessLogs.map(log => log.date.split('-')[0])));
    uniqueYears.sort((a, b) => b - a);
    const years = ['Tất cả', ...uniqueYears];

    if (filterPills) {
        filterPills.innerHTML = years.map(yr => `
            <button class="welove-year-pill ${selectedFilterYear === yr ? 'active' : ''}" data-year="${yr}">
                ${yr === 'Tất cả' ? '📅 Tất cả' : `✨ Năm ${yr}`}
            </button>
        `).join('');
        
        filterPills.querySelectorAll('.welove-year-pill').forEach(btn => {
            btn.addEventListener('click', (e) => {
                selectedFilterYear = e.target.getAttribute('data-year');
                renderSicknessHistory();
            });
        });
    }

    const filtered = selectedFilterYear === 'Tất cả' 
        ? sicknessLogs 
        : sicknessLogs.filter(log => log.date.startsWith(selectedFilterYear));

    if (countNum) countNum.innerText = filtered.length;

    if (warningMsg) {
        warningMsg.className = `welove-warning-msg ${filtered.length === 0 ? 'green' : filtered.length <= 3 ? 'yellow' : 'red'}`;
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

    if (filtered.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-style: italic; margin: 2rem 0;">Chưa có ghi nhận đợt ốm nào ${selectedFilterYear === 'Tất cả' ? 'qua các năm' : `trong năm ${selectedFilterYear}`}. Em iu luôn khỏe mạnh và rạng rỡ! 🌸</p>`;
        return;
    }

    container.innerHTML = filtered.map(log => {
        const parts = log.date.split('-');
        const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : log.date;
        return `
            <div class="welove-log-item" style="cursor: pointer; position: relative;">
                <div class="welove-log-icon">${log.icon || '🤧'}</div>
                <div class="welove-log-content" style="width: 100%;">
                    <div class="welove-log-header">
                        <span class="welove-log-type">${escapeHTML(log.symptomType)}</span>
                        <span class="welove-log-date">${dateFormatted}</span>
                    </div>
                    <p class="welove-log-notes">${escapeHTML(log.notes)}</p>
                    
                    <!-- Action row, visible only when expanded by tap/click -->
                    <div class="welove-log-actions" style="margin-top: 10px; display: none; justify-content: flex-end;">
                        <button class="welove-btn welove-btn-danger btn-delete-sickness" data-id="${log.id}" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 8px; font-weight: bold; background: #ef4444; border: none; color: white; display: flex; align-items: center; gap: 4px; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.25);">
                            🗑️ Xóa ghi nhận này
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Toggle expand log actions
    container.querySelectorAll('.welove-log-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Ignore click inside the delete button
            if (e.target.closest('.btn-delete-sickness')) return;
            
            const actionsRow = item.querySelector('.welove-log-actions');
            if (actionsRow) {
                const isHidden = actionsRow.style.display === 'none';
                
                // Hide all other open action rows first for clean UX
                container.querySelectorAll('.welove-log-actions').forEach(row => {
                    row.style.display = 'none';
                });
                
                actionsRow.style.display = isHidden ? 'flex' : 'none';
            }
        });
    });

    container.querySelectorAll('.btn-delete-sickness').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Stop click from triggering parent toggle
            const id = e.currentTarget.getAttribute('data-id');
            const confirmDelete = await window.showConfirm("Anh có chắc chắn muốn xóa đợt ghi nhận ốm này không? ❤️");
            if (confirmDelete) {
                state.weLoveSicknessLogs = state.weLoveSicknessLogs.filter(log => log.id !== id);
                state.weLoveSicknessLogsUpdated = new Date().toISOString();
                await saveLocalState();
                
                if (sync.isConfigured() && state.user) {
                    performSync(true);
                }
                
                sicknessLogs = state.weLoveSicknessLogs;
                renderSicknessHistory();
                showToast("Đã xóa đợt ghi nhận ốm");
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
            <div class="welove-log-item" style="padding: 1rem; min-height: auto; gap: 0.75rem;">
                <div class="welove-log-icon" style="width: 42px; height: 42px; font-size: 1.3rem; padding: 0; display: flex; align-items: center; justify-content: center;">
                    ${rem.isSent ? '✅' : '⏳'}
                </div>
                <div class="welove-log-content" style="display: flex; flex-direction: column; gap: 2px;">
                    <div class="welove-log-header">
                        <span class="welove-log-type">${escapeHTML(rem.title)}</span>
                        <span class="welove-log-date" style="color: ${rem.isSent ? 'var(--accent-emerald)' : 'var(--accent-amber)'}">
                            ${rem.isSent ? 'Đã gửi' : 'Chờ gửi'}
                        </span>
                    </div>
                    <p class="welove-log-notes" style="font-size: 0.85rem;">${escapeHTML(rem.message)}</p>
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; margin-top: 4px;">
                        📅 Hẹn lúc: ${formattedTime}
                    </span>
                </div>
                <button class="welove-delete-btn btn-delete-reminder" data-id="${rem.id}" title="Hủy lịch nhắc này">
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
                state.weLoveReminders = state.weLoveReminders.filter(r => r.id !== id);
                state.weLoveRemindersUpdated = new Date().toISOString();
                await saveLocalState();
                
                if (sync.isConfigured() && state.user) {
                    performSync(true);
                }
                
                reminders = state.weLoveReminders;
                renderRemindersList();
                showToast("Đã hủy lịch nhắc");
            }
        });
    });
}

// Render visits in admin view
function renderVisitLogs() {
    // Đã xóa theo yêu cầu người dùng
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
    if (!['welove', 'welove-admin', 'welove-settings'].includes(state.activeTab)) {
        console.log("[BUG DETECTOR] renderWeLoveDashboard SKIPPED because activeTab is:", state.activeTab);
        return;
    }
    console.log("[BUG DETECTOR] renderWeLoveDashboard STARTING, activeTab:", state.activeTab);
    const tabContainer = document.getElementById('tab-welove');
    if (!tabContainer) return;

    // Tự động kiểm tra kỉ niệm và gửi Telegram (nếu đủ điều kiện)
    checkAndSendWeLoveAnniversaryTelegram();

    const renderingTab = state.activeTab;

    // Map activeTab route directly to sub-view state
    if (state.activeTab === 'welove-admin') {
        weLoveCurrentSubView = 'admin';
    } else if (state.activeTab === 'welove-settings') {
        weLoveCurrentSubView = 'settings';
    } else {
        weLoveCurrentSubView = 'memory';
    }
    window.weLoveCurrentSubView = weLoveCurrentSubView;

    // Force settings subview if start date is not configured yet (first time) - Chỉ dành cho Chủ quỹ (Chồng/Admin)
    if (!state.weLoveStartDate && state.activeTab !== 'welove-settings' && !state.viewingSharedFund) {
        setTimeout(() => {
            if (typeof window.switchTab === 'function') {
                window.switchTab('welove-settings');
            }
        }, 0);
        return;
    }

    calculateLoveDays();

    const isLocal = !sync.isConfigured() || !state.user;
    // isSpouseRole: Vợ (người nhập mã) chỉ được xem WeLove, không chỉnh sửa cấu hình
    const isSpouseRole = state.viewingSharedFund && state.sharedFundSourceRow !== null;
    const canEdit = !isSpouseRole;
    const showSickness = state.weLoveShowSickness !== false;
    const isAdmin = !isSpouseRole; // Admin chính là người chồng (hoặc tài khoản độc lập)

    const wifeName = state.weLoveName2 ? `em iu ${escapeHTML(state.weLoveName2)}` : 'em iu';
    const wifeNameTitle = state.weLoveName2 ? `Em Iu ${escapeHTML(state.weLoveName2)}` : 'Em Iu';
    const husbandName = state.weLoveName1 ? `anh ${escapeHTML(state.weLoveName1)} đẹp trai` : 'anh đẹp trai';

    const sicknessCardHtml = showSickness ? `
                    <div class="welove-card">
                        <div class="welove-title-box">
                            <span style="font-size: 1.8rem;">🩺</span>
                            <h3 class="welove-title">Sổ Tay Sức Khỏe Của ${wifeNameTitle}</h3>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            Thống kê đợt ốm qua các năm của ${wifeName} và lời dặn dỗ yêu thương từ ${husbandName}
                        </p>

                        <!-- Years selector filter pills -->
                        <div class="welove-years-container" id="weLoveYearsFilter" style="margin-top: 1.5rem;">
                            <!-- populated by JS -->
                        </div>

                        <!-- Sickness circle stats & alert -->
                        <div class="welove-summary-box">
                            <div class="welove-heart-circle">
                                <span class="welove-count-lbl">Tổng</span>
                                <span class="welove-count-num" id="weLoveSicknessCount">0</span>
                                <span class="welove-count-lbl">Lần Ốm</span>
                            </div>
                            <div class="welove-warning-msg" id="weLoveHealthWarning">
                                Đang tải...
                            </div>
                        </div>

                        <!-- Timeline Title & Add Btn -->
                        <div class="welove-timeline-title">
                            <span id="weLoveHistoryTitle">📅 Lịch Sử Các Đợt Ốm</span>
                            ${canEdit ? `
                                <button class="btn btn-primary" id="btnWeLoveAddSickness" style="margin-left: auto; font-size: 0.85rem; padding: 4px 12px; border-radius: 10px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border: none; color: #fff; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 4px; box-shadow: 0 4px 10px rgba(225, 29, 72, 0.15);">
                                    <span>Ghi nhận mới 📝</span>
                                </button>
                            ` : ''}
                        </div>

                        <!-- Timeline list -->
                        <div class="welove-timeline" id="weLoveSicknessTimeline">
                            <p style="text-align: center; color: var(--text-secondary); font-style: italic;">Đang tải...</p>
                        </div>
                    </div>
    ` : '';

    const isModern = window.innerWidth > 768;
    tabContainer.innerHTML = `
        <div class="memory-page ${isModern ? 'layout-modern' : ''}" id="weLovePage">

            <!-- Couple Names Header under Navbar -->
            <!-- Tự động nhận diện độ dài tên để áp dụng kích thước chữ phù hợp trên Mobile -->
            ${(() => {
                const name1 = state.weLoveName1 || 'Anh';
                const name2 = state.weLoveName2 || 'Em';
                const wordCount1 = name1.trim().split(/\s+/).length;
                const wordCount2 = name2.trim().split(/\s+/).length;
                const maxWords = Math.max(wordCount1, wordCount2);
                const maxLen = Math.max(name1.length, name2.length);
                let sizeClass = 'name-short';
                if (maxWords >= 4 || maxLen > 15) {
                    sizeClass = 'name-long';
                } else if (maxWords === 3 || maxLen > 10) {
                    sizeClass = 'name-medium';
                }
                return `
                    <div class="couple-names-header">
                        <span class="partner-name name-left ${sizeClass}">${escapeHTML(name1)}</span>
                        <span class="pulsing-heart-red" style="display: inline-block; filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6)); line-height: 1;">❤️</span>
                        <span class="partner-name name-right ${sizeClass}">${escapeHTML(name2)}</span>
                    </div>
                `;
            })()}

            ${weLoveCurrentSubView === 'admin' && canEdit ? `
                <!-- ADMIN SUBVIEW -->
                ${isModern ? `
                <!-- DESKTOP 2-COLUMN LAYOUT -->
                <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 2.5rem; width: 100%; max-width: 1200px; margin: 2rem auto 0 auto; z-index: 5; align-items: stretch; padding: 0 1.5rem; grid-column: span 2 !important;">
                    <!-- Left Column: Scheduler Form -->
                    <div class="welove-card" style="margin-top: 0; width: 100%; text-align: left; display: flex; flex-direction: column; justify-content: space-between; height: 100%;">
                        <div>
                            <div class="welove-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; justify-content: flex-start;">
                                <span style="font-size: 1.8rem;">⏰</span>
                                <h3 class="welove-title">Đặt Lịch Lời Nhắc</h3>
                            </div>
                            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.4;">
                                Lên lịch gửi thông báo nhắc nhở tự động đến thiết bị của nửa kia
                            </p>
                            <form id="weLoveAddReminderForm" style="text-align: left; margin-bottom: 0;">
                                <div class="welove-form-group">
                                    <label class="welove-form-label">⏰ Thời gian gửi thông báo:</label>
                                    <input type="datetime-local" class="welove-input" id="remTimeInput" required>
                                </div>
                                <div class="welove-form-group">
                                    <label class="welove-form-label">✍️ Tiêu đề thông báo:</label>
                                    <input type="text" class="welove-input" id="remTitleInput" placeholder="Ví dụ: Chú ý em iu ơi! 🥤" required>
                                </div>
                                <div class="welove-form-group" style="margin-bottom: 1.5rem;">
                                    <label class="welove-form-label">✍️ Nội dung lời nhắc:</label>
                                    <textarea class="welove-textarea" id="remMessageInput" rows="4" placeholder="Nhập nội dung lời nhắn..." required style="resize: none;"></textarea>
                                </div>
                                <button type="submit" class="welove-btn welove-btn-primary" style="width: 100%; border: none; color: #fff; font-weight: 700; cursor: pointer; border-radius: 12px; padding: 12px 20px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.2); font-family: inherit; font-size: 0.9rem; transition: all 0.3s ease;">
                                    Lên lịch ngay ❤️
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Right Column: Reminders List Board -->
                    <div class="welove-card" style="margin-top: 0; width: 100%; text-align: left; display: flex; flex-direction: column; height: 100%;">
                        <div class="welove-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; justify-content: flex-start;">
                            <span style="font-size: 1.8rem;">📋</span>
                            <h3 class="welove-title">Danh Sách Lời Nhắc Đã Lên Lịch</h3>
                        </div>
                        <div class="welove-timeline" id="weLoveRemindersTimeline" style="max-height: 480px; overflow-y: auto; flex: 1; padding-right: 6px;">
                            <p style="text-align: center; color: var(--text-secondary); font-style: italic;">Đang tải...</p>
                        </div>
                    </div>
                </div>
                ` : `
                <!-- MOBILE STACKED LAYOUT -->
                <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%; align-items: center; max-width: 580px; margin: 0.75rem auto 0 auto; z-index: 5;">
                    <!-- Lên lịch lời nhắc -->
                    <div class="welove-card" style="margin-top: 0; width: 100%;">
                        <div class="welove-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                            <span style="font-size: 1.8rem;">⏰</span>
                            <h3 class="welove-title">Đặt Lịch Lời Nhắc Yêu Thương</h3>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; line-height: 1.4;">
                            Lên lịch gửi thông báo nhắc nhở tự động đến thiết bị của nửa kia
                        </p>

                        <form id="weLoveAddReminderForm" style="text-align: left; margin-bottom: 2rem;">
                            <div class="welove-form-group">
                                <label class="welove-form-label">⏰ Thời gian gửi thông báo:</label>
                                <input type="datetime-local" class="welove-input" id="remTimeInput" required>
                            </div>
                            <div class="welove-form-group">
                                <label class="welove-form-label">✍️ Tiêu đề thông báo:</label>
                                <input type="text" class="welove-input" id="remTitleInput" placeholder="Ví dụ: Chú ý em iu ơi! 🥤" required>
                            </div>
                            <div class="welove-form-group">
                                <label class="welove-form-label">✍️ Nội dung lời nhắc:</label>
                                <textarea class="welove-textarea" id="remMessageInput" rows="3" placeholder="Nhập nội dung lời nhắn..." required></textarea>
                            </div>
                            <button type="submit" class="welove-btn welove-btn-primary" style="width: 100%; margin-top: 0.5rem;">
                                Lên lịch ngay ❤️
                            </button>
                        </form>

                        <h4 style="font-size: 1rem; font-weight: 700; border-left: 4px solid var(--accent-rose); padding-left: 0.5rem; text-align: left; margin-bottom: 1rem;">
                            Danh sách lời nhắc đã lên lịch
                        </h4>
                        <div class="welove-timeline" id="weLoveRemindersTimeline" style="max-height: 300px;">
                            <p style="text-align: center; color: var(--text-secondary); font-style: italic;">Đang tải...</p>
                        </div>
                    </div>
                </div>
                `}
            ` : weLoveCurrentSubView === 'settings' && canEdit ? `
                <!-- CONFIG / SETTINGS SUBVIEW -->
                <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%; align-items: center; max-width: 580px; margin: ${isModern ? '2rem auto 0 auto' : '0.5rem auto 0 auto'}; z-index: 5; padding: 0 15px; grid-column: span 2 !important;">
                    <div class="welove-card" style="margin-top: 0; width: 100%;">
                        <div class="welove-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem;">
                            <span style="font-size: 1.8rem;">⚙️</span>
                            <h3 class="welove-title">Thiết Lập Tình Yêu</h3>
                        </div>
                        
                        <form id="weLoveConfigForm" style="text-align: left; margin-bottom: 2.5rem;">
                            <!-- 1. Điền tên 2 bạn -->
                            <div class="welove-form-group">
                                <label class="welove-form-label">👤 Tên của bạn:</label>
                                <input type="text" class="welove-input" id="weLoveName1Input" placeholder="Nhập tên của bạn" value="${state.weLoveName1 || ''}" required>
                            </div>
                            <div class="welove-form-group">
                                <label class="welove-form-label">👤 Tên nửa kia:</label>
                                <input type="text" class="welove-input" id="weLoveName2Input" placeholder="Nhập tên nửa kia" value="${state.weLoveName2 || ''}" required>
                            </div>

                            <!-- 2. Ngày bắt đầu yêu nhau -->
                            <div class="welove-form-group">
                                <label class="welove-form-label">📅 Ngày tình yêu bắt đầu:</label>
                                <input type="date" class="welove-input" id="weLoveStartDateInput" value="${state.weLoveStartDate || ''}" required>
                            </div>

                            <!-- 2.6. Kiểu hiển thị Album ảnh trên Desktop -->
                            <div class="welove-form-group" style="border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem; padding-bottom: 1rem;">
                                <label class="welove-form-label" style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px; display: block;">🖼️ Bố cục Album ảnh (Desktop):</label>
                                <select class="welove-input" id="weLoveAlbumLayoutDesktopInput" style="height: 38px; padding: 0 10px; width: 100%; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); font-family: inherit; font-size: 0.85rem; font-weight: 600;">
                                    <option value="slider" ${state.weLoveAlbumLayoutDesktop === 'slider' ? 'selected' : ''}>Trượt ngang tiêu chuẩn ↔️</option>
                                    <option value="polaroid" ${state.weLoveAlbumLayoutDesktop === 'polaroid' ? 'selected' : ''}>Bảng ghim ảnh Polaroid 📌</option>
                                    <option value="carousel3d" ${state.weLoveAlbumLayoutDesktop === 'carousel3d' ? 'selected' : ''}>Vòng quay ảnh 3D 🎡</option>
                                    <option value="theater" ${state.weLoveAlbumLayoutDesktop === 'theater' ? 'selected' : ''}>Rạp chiếu phim & Timeline 🎬</option>
                                    <option value="grid" ${state.weLoveAlbumLayoutDesktop === 'grid' ? 'selected' : ''}>Lưới nghệ thuật (Collage) 🧩</option>
                                </select>
                            </div>

                            <!-- 2.5. Tự động phát nhạc nền -->
                            <div class="welove-form-group" style="border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                                <label class="status-switch" style="justify-content: space-between; width: 100%; padding: 4px 0; cursor: pointer;">
                                    <div>
                                        <span style="font-size: 0.9rem; font-weight: 700; margin-bottom: 2px; display: block; color: var(--text-primary);">🎵 Tự động phát nhạc nền</span>
                                        <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal; display: block;">Tự động phát nhạc nền khi click/chạm vào màn hình</span>
                                     </div>
                                     <div style="display: flex; align-items: center;">
                                         <input type="checkbox" id="weLoveAutoplayInput" class="status-checkbox" ${state.weLoveAutoplay === true ? 'checked' : ''}>
                                         <span class="status-slider"></span>
                                     </div>
                                 </label>
                             </div>

                             <!-- 2.7. Theo dõi Sổ tay sức khỏe em yêu -->
                             <div class="welove-form-group" style="border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                                 <label class="status-switch" style="justify-content: space-between; width: 100%; padding: 4px 0; cursor: pointer;">
                                     <div>
                                         <span style="font-size: 0.9rem; font-weight: 700; margin-bottom: 2px; display: block; color: var(--text-primary);">🩺 Theo dõi Sổ tay sức khỏe của ${wifeName}</span>
                                         <span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal; display: block;">Ẩn hoặc hiện biểu đồ, lịch sử đợt ốm trong tab Kỷ niệm</span>
                                     </div>
                                     <div style="display: flex; align-items: center;">
                                         <input type="checkbox" id="weLoveShowSicknessInput" class="status-checkbox" ${state.weLoveShowSickness !== false ? 'checked' : ''}>
                                         <span class="status-slider"></span>
                                     </div>
                                 </label>
                             </div>

                            <button type="submit" class="welove-btn welove-btn-primary" style="width: 100%; border: none; color: #fff; font-weight: 700; cursor: pointer; border-radius: 12px; padding: 12px 20px; background: linear-gradient(135deg, #d97706 0%, #b45309 100%) !important; box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25); font-family: inherit; font-size: 0.9rem; transition: all 0.3s ease;">
                                Lưu Cấu Hình 💾
                            </button>
                        </form>
                    </div>
                </div>
            ` : `
                <!-- STANDARD KỶ NIỆM SUBVIEW -->
                <div class="memory-card">
                    ${isModern ? `
                         <!-- Modern Action Buttons -->
                         <div class="modern-action-buttons" style="position: absolute; top: 20px; right: 20px; display: flex; gap: 8px; z-index: 10;">
                             <button id="weLoveMusicToggle" class="modern-round-btn music-toggle-btn" style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast);" title="Phát nhạc nền lãng mạn">
                                 <i data-lucide="${isAudioPlaying ? 'music' : 'music-2'}" style="width: 16px; height: 16px; color: ${isAudioPlaying ? 'var(--accent-rose)' : 'var(--text-secondary)'}"></i>
                             </button>
                             <button id="weLoveNotificationTest" class="modern-round-btn notification-test-btn" style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all var(--transition-fast);" title="Thử nghiệm thông báo yêu thương">
                                 <i data-lucide="bell" style="width: 16px; height: 16px; color: var(--text-secondary);"></i>
                             </button>
                         </div>
                    ` : `
                         <!-- Music player disk button -->
                         <button class="music-toggle-btn" id="weLoveMusicToggle" title="Phát nhạc nền lãng mạn">🔇</button>
                         <!-- Test notifications bell -->
                         <button class="notification-test-btn" id="weLoveNotificationTest" title="Thử nghiệm thông báo yêu thương">🔔</button>
                    `}

                    <div class="heart-pulsing mobile-only-heart" id="weLovePulsingHeart" title="Nhấn vào màn hình để thả tim!">💝</div>
                    <h2 class="memory-title">
                        <span class="default-title">Tổng quan</span>
                        <span class="desktop-couple-title" style="display: none;">
                            <span class="partner-name-desktop">${escapeHTML(state.weLoveName1 || 'Anh')}</span>
                            <span class="heart-pulsing desktop-only-heart" id="weLovePulsingHeartDesktop" title="Nhấn vào màn hình để thả tim!">💝</span>
                            <span class="partner-name-desktop">${escapeHTML(state.weLoveName2 || 'Em')}</span>
                        </span>
                    </h2>
                    <p class="memory-subtitle">Hành trình gieo bình yên, hái hạnh phúc</p>
                    
                    <div class="days-counter-box">
                        <div class="days-number" id="weLoveDaysCountVal">${state.weLoveStartDate ? loveDaysCount : '?'}</div>
                        <div class="days-label">Ngày bên nhau</div>
                        ${state.weLoveStartDate ? `<div class="detailed-duration">${formatDetailedLoveDuration()}</div>` : ''}
                    </div>

                    <div class="milestone-date" style="${!state.weLoveStartDate ? 'color: var(--accent-rose); font-weight: 700;' : ''}">
                        ${state.weLoveStartDate ? `📅 Cột mốc khởi đầu: ${formatDateDisplay(state.weLoveStartDate)}` : '⚠️ Chưa thiết lập ngày bắt đầu yêu. Vui lòng chọn trong phần Thiết lập!'}
                    </div>

                    ${(function() {
                        if (!state.weLoveStartDate) return '';
                        
                        const start = new Date(state.weLoveStartDate);
                        const end = new Date();
                        const sYear = start.getFullYear();
                        const sMonth = start.getMonth();
                        const sDay = start.getDate();
                        
                        let yearsElapsed = end.getFullYear() - sYear;
                        let monthsElapsed = end.getMonth() - sMonth;
                        let daysElapsed = end.getDate() - sDay;
                        
                        if (daysElapsed < 0) {
                            monthsElapsed--;
                        }
                        if (monthsElapsed < 0) {
                            yearsElapsed--;
                        }
                        
                        const nextMilestoneYears = yearsElapsed + 1;
                        const prevMilestoneDate = new Date(sYear + yearsElapsed, sMonth, sDay);
                        const nextMilestoneDate = new Date(sYear + nextMilestoneYears, sMonth, sDay);
                        
                        const totalDaysInYear = Math.round((nextMilestoneDate.getTime() - prevMilestoneDate.getTime()) / (1000 * 60 * 60 * 24));
                        const daysPassedSincePrev = Math.round((end.getTime() - prevMilestoneDate.getTime()) / (1000 * 60 * 60 * 24));
                        const daysRemaining = Math.max(0, Math.round((nextMilestoneDate.getTime() - end.getTime()) / (1000 * 60 * 60 * 24)));
                        
                        const progressPercent = Math.min(100, Math.max(0, (daysPassedSincePrev / totalDaysInYear) * 100));
                        
                        return `
                            <div class="milestone-progress-container" style="margin-top: 1.25rem; margin-bottom: 0.5rem; text-align: left; background: rgba(255,255,255,0.03); padding: 14px 18px; border-radius: 16px; border: 1px solid var(--border-color); box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); display: flex; flex-direction: column;">
                                <div class="milestone-header" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; width: 100%;">
                                    <span class="milestone-title">🎯 Dấu mốc tiếp theo: <span class="milestone-highlight">${nextMilestoneYears} năm</span></span>
                                    <span class="milestone-remaining" style="color: var(--accent-rose);">Còn ${daysRemaining} ngày</span>
                                </div>
                                <div class="milestone-bar" style="width: 100%; height: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 4px; overflow: hidden; position: relative;">
                                    <div style="width: ${progressPercent}%; height: 100%; background: linear-gradient(90deg, #f43f5e, #ec4899); border-radius: 4px; transition: width 1s ease-out;"></div>
                                </div>
                            </div>
                        `;
                    })()}

                    <!-- Quotes board -->
                    <div class="quote-container" id="weLoveQuoteContainer" style="cursor: grab;" title="Nhập nút hoặc vuốt câu nói để chuyển câu">
                        <button class="quote-nav-btn prev" id="btnWeLovePrevQuote">‹</button>
                        <div class="quote-text-wrapper">
                            <div class="quote-chinese">${LOVE_QUOTES[currentQuoteIdx].cn}</div>
                            <div class="quote-vietnamese">${LOVE_QUOTES[currentQuoteIdx].vi.normalize('NFC')}</div>
                        </div>
                        <button class="quote-nav-btn next" id="btnWeLoveNextQuote">›</button>
                    </div>
                </div>

                <!-- Cột phải (Sổ tay sức khỏe) -->
                <div class="welove-right-column">
                    ${sicknessCardHtml}
                </div>

                <!-- Hàng dưới (Album ảnh tràn rộng) -->
                <div class="welove-card welove-album-card" style="margin-top: 2rem;">
                    <div class="welove-title-box" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 15px; width: 100%;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.8rem;">📸</span>
                            <h3 class="welove-title">Album Ảnh Tình Yêu</h3>
                        </div>
                        ${canEdit ? `
                            <button class="modern-round-btn album-manage-btn" id="btnWeLoveManageAlbum" style="width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-primary); cursor: pointer;" title="Quản lý Album ảnh">
                                <i data-lucide="settings" style="width: 14px; height: 14px;"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div id="weLoveAlbumContainer" style="width: 100%; position: relative;">
                        <!-- populated by JS -->
                    </div>
                </div>
            `}
        </div>

        <!-- ROMANTIC MODAL FORM (Only visible to Admin/Logged in) -->
        <div class="welove-modal-overlay" id="weLoveAddSicknessModal" style="display: none;">
            <div class="welove-modal-content">
                <h4 class="welove-modal-title">
                    <span>🩺 Ghi Nhận Em Iu Bị Ốm</span>
                </h4>
                
                <form id="weLoveAddSicknessForm">
                    <div class="welove-form-group">
                        <label class="welove-form-label">📅 Ngày bị ốm:</label>
                        <input type="date" class="welove-input" id="sickDateInput" required>
                    </div>

                    <div class="welove-form-group">
                        <label class="welove-form-label">🤒 Triệu chứng / Đợt ốm (tự ghi):</label>
                        <input type="text" class="welove-input" id="sickSymptomInput" placeholder="Ví dụ: Cảm sốt đi mưa, Đau họng ho khan, Sốt siêu vi..." required>
                    </div>

                    <div class="welove-form-group">
                        <label class="welove-form-label">✍️ Chọn nhanh mẫu lời dặn dỗ nhanh:</label>
                        <div class="welove-templates-box">
                            ${CARE_TEMPLATES.map(tmpl => `
                                <div class="welove-template-chip btn-select-template" data-text="${escapeHTML(tmpl)}">
                                    ${escapeHTML(tmpl)}
                                </div>
                            `).join('')}
                        </div>

                        <label class="welove-form-label">✍️ Hoặc tự điền lời dặn dò yêu thương:</label>
                        <textarea class="welove-textarea" id="sickNotesInput" rows="3" placeholder="Nhập lời dặn dò của bạn tại đây hoặc bấm chọn mẫu nhanh ở trên..." required></textarea>
                    </div>

                    <div class="welove-btn-group">
                        <button type="button" class="welove-btn welove-btn-secondary" id="btnWeLoveCloseSicknessModal">
                            Hủy bỏ
                        </button>
                        <button type="submit" class="welove-btn welove-btn-primary">
                            Lưu Ghi Nhận ❤️
                        </button>
                    </div>
                </form>
            </div>
        </div>

        <!-- ALBUM MANAGER MODAL -->
        <div class="welove-modal-overlay" id="weLoveAlbumManagerModal" style="display: none; z-index: 1000;">
            <div class="welove-modal-content" style="max-width: 500px; width: 90%; position: relative;">
                <button type="button" class="welove-modal-close-btn" id="btnWeLoveCloseAlbumManager" title="Đóng cửa sổ" style="position: absolute; top: 14px; right: 14px; width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1px solid var(--border-color); color: var(--text-primary); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 1.1rem; line-height: 1; transition: all 0.2s ease;">✕</button>
                <h4 class="welove-modal-title" style="padding-right: 36px;">
                    <span>📸 Quản Lý Album Ảnh Kỷ Niệm</span>
                </h4>
                
                <form id="weLoveAddPhotoForm" style="margin-bottom: 20px; text-align: left;">
                    <div class="welove-form-group">
                        <label class="welove-form-label">🔗 Link ảnh / Google Drive link:</label>
                        <input type="url" class="welove-input" id="weLovePhotoUrlInput" placeholder="https://drive.google.com/file/d/.../view" required style="width: 100%;">
                        <span style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 4px; display: block;">
                            Hỗ trợ link chia sẻ từ Google Drive (để chế độ công khai ai cũng xem được).
                        </span>
                    </div>
                    <div class="welove-form-group">
                        <label class="welove-form-label">✍️ Lời dặn / Chú thích ảnh:</label>
                        <input type="text" class="welove-input" id="weLovePhotoCaptionInput" placeholder="Ví dụ: Đi chơi Đà Lạt 🌸" style="width: 100%;">
                    </div>
                    <button type="submit" class="welove-btn welove-btn-primary" style="width: 100%; font-weight: 700;">
                        Thêm vào Album ➕
                    </button>
                </form>

                <div style="border-top: 1px solid var(--border-color); padding-top: 15px; text-align: left;">
                    <h5 style="margin: 0 0 10px 0; font-size: 0.95rem; color: var(--text-primary); font-weight: 700;">Danh sách hình ảnh</h5>
                    <div id="weLoveAlbumManagerList" style="max-height: 220px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; padding-right: 5px;">
                        <!-- Populate dynamically -->
                    </div>
                </div>
            </div>
        </div>

        <!-- LIGHTBOX PREVIEW MODAL -->
        <div class="welove-modal-overlay" id="weLoveLightboxModal" style="display: none; background: rgba(0, 0, 0, 0.85); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); z-index: 2000; align-items: center; justify-content: center; width: 100vw; height: 100vh; position: fixed; top: 0; left: 0; overflow: hidden; transition: background 0.2s;">
            <div style="position: relative; width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden;">
                <button type="button" id="btnWeLoveCloseLightbox" style="position: absolute; top: max(20px, env(safe-area-inset-top, 20px)); right: 20px; width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 1.3rem; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 2010; backdrop-filter: blur(8px); transition: background 0.2s, opacity 0.25s, transform 0.25s;" title="Đóng">✕</button>
                
                <!-- Zoom Toolbar -->
                <div class="welove-lightbox-tools" style="position: absolute; top: max(20px, env(safe-area-inset-top, 20px)); left: 50%; transform: translateX(-50%); display: flex; gap: 12px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); padding: 4px 14px; border-radius: 20px; backdrop-filter: blur(10px); z-index: 2005; height: 38px; align-items: center; transition: opacity 0.25s, transform 0.25s;">
                    <button type="button" id="btnWeLoveZoomOut" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; opacity: 0.9; user-select: none;" title="Thu nhỏ">➖</button>
                    <span id="weLoveZoomPercent" style="color: #fff; font-size: 0.8rem; font-weight: 600; min-width: 40px; text-align: center; display: flex; align-items: center; justify-content: center; user-select: none;">100%</span>
                    <button type="button" id="btnWeLoveZoomIn" style="background: none; border: none; color: #fff; cursor: pointer; font-size: 0.95rem; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; opacity: 0.9; user-select: none;" title="Phóng to">➕</button>
                    <button type="button" id="btnWeLoveZoomReset" style="background: rgba(255,255,255,0.15); border: none; color: #fff; cursor: pointer; font-size: 0.7rem; padding: 2px 8px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; user-select: none;" title="Đặt lại">1:1</button>
                </div>

                <!-- Navigation buttons (hidden on mobile but visible on desktop via CSS hover) -->
                <button type="button" id="btnWeLoveLightboxPrev" class="welove-lightbox-nav prev" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: pointer; z-index: 2010; backdrop-filter: blur(8px); transition: all 0.2s, opacity 0.25s, transform 0.25s;" title="Ảnh trước">‹</button>
                <button type="button" id="btnWeLoveLightboxNext" class="welove-lightbox-nav next" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; cursor: pointer; z-index: 2010; backdrop-filter: blur(8px); transition: all 0.2s, opacity 0.25s, transform 0.25s;" title="Ảnh sau">›</button>

                <div id="weLoveLightboxSliderContainer" style="width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; display: flex; align-items: center; justify-content: center; background: transparent; position: relative; overflow: hidden;">
                    <style>
                        #weLoveLightboxSlider::-webkit-scrollbar { display: none; }
                    </style>
                    <div id="weLoveLightboxSlider" style="display: flex; width: 100vw; height: 100vh; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: auto; -webkit-overflow-scrolling: touch; user-select: none; -webkit-user-drag: none; position: absolute; left: 0; top: 0; scrollbar-width: none; -ms-overflow-style: none;">
                        <!-- Các slide con sẽ được render động bằng Javascript -->
                    </div>
                </div>

                <!-- Dải ảnh thu nhỏ (Thumbnail Strip) kiểu Telegram -->
                <div id="weLoveLightboxThumbnails" style="position: absolute; bottom: max(95px, env(safe-area-inset-bottom, 95px)); left: 50%; transform: translateX(-50%); display: flex; gap: 8px; max-width: 90%; overflow-x: auto; padding: 6px 12px; z-index: 2005; scrollbar-width: none; -ms-overflow-style: none; scroll-behavior: smooth; border-radius: 14px; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); transition: opacity 0.25s, transform 0.25s; border: 1px solid rgba(255,255,255,0.08);">
                    <!-- Sẽ được render động -->
                </div>

                <p id="weLoveLightboxCaption" style="position: absolute; bottom: max(35px, env(safe-area-inset-bottom, 35px)); left: 50%; transform: translateX(-50%); color: #fff; font-size: 0.95rem; font-weight: 600; text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.8); background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); padding: 8px 18px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); width: auto; max-width: 80%; pointer-events: none; z-index: 2005; margin: 0; transition: opacity 0.25s, transform 0.25s;"></p>
            </div>
        </div>
    `;

    // Initialize media metadata
    initMediaSession();



    // UX Optimization: Gán dữ liệu local có sẵn để render nhanh lập tức (dưới 50ms) tránh màn hình trống
    sicknessLogs = state.weLoveSicknessLogs || [];
    sicknessLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
    reminders = state.weLoveReminders || [];
    reminders.sort((a, b) => new Date(b.scheduledTime) - new Date(a.scheduledTime));

    updateAudioPlaybackState();

    if (weLoveCurrentSubView === 'memory') {
        renderSicknessHistory();
        bindMemoryEvents();
    } else if (weLoveCurrentSubView === 'admin') {
        renderRemindersList();
        renderVisitLogs();
        bindAdminEvents();
    } else if (weLoveCurrentSubView === 'settings') {
        bindSettingsEvents();
    }

    // Tải dữ liệu đám mây và cập nhật UI bất đồng bộ ở background
    (async () => {
        try {
            await fetchWeLoveData();
            // Vẽ lại dữ liệu mới từ đám mây (nếu người dùng vẫn đang ở tab WeLove)
            if (state.activeTab === renderingTab) {
                if (weLoveCurrentSubView === 'memory') {
                    renderSicknessHistory();
                    updateWeLoveAlbum();
                } else if (weLoveCurrentSubView === 'admin') {
                    renderRemindersList();
                    renderVisitLogs();
                }
            }
        } catch (fetchErr) {
            console.error("[WeLove] Background fetch error:", fetchErr);
        }
    })();

    // Sync sidebar & mobile navbar display
    updateSidebarNavVisibility('welove');



    // Set up auto refreshes
    setupAutoRefreshTimers();
    
    // Log visit if logged in as spouse
    logSpouseVisit();
}

// Bind events for standard view
function bindMemoryEvents() {
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
                    `Gửi ngàn lời yêu thương và cái ôm ấm áp đến ${state.weLoveName2 || 'nửa kia'}! Chúc một ngày ngập tràn hạnh phúc! ❤️`
                );
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

    const btnPrev = document.getElementById('btnWeLovePrevQuote');
    const btnNext = document.getElementById('btnWeLoveNextQuote');
    if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); prevLoveQuote(); });
    if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); nextLoveQuote(); });

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

    // Gán click listener cho cả hai trái tim (Mobile và Desktop)
    document.querySelectorAll('.heart-pulsing').forEach(heart => {
        heart.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            showToast(`Gửi ngàn trái tim yêu thương gửi đến ${state.weLoveName2 || 'nửa kia'} xinh đẹp! 💕`);
        });
    });

    const weLovePage = document.getElementById('weLovePage');
    if (weLovePage) {
        weLovePage.addEventListener('pointerdown', handleScreenClickBurst);
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
        const modalContent = modalOverlay.querySelector('.welove-modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => e.stopPropagation());
        }
    }

    const chips = modalOverlay ? modalOverlay.querySelectorAll('.btn-select-template') : [];
    chips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            if (sickNotesInput) {
                sickNotesInput.value = e.target.getAttribute('data-text');
            }
        });
    });

    if (formAddSickness && modalOverlay) {
        formAddSickness.addEventListener('submit', async (e) => {
            e.preventDefault();
            const symptom = sickSymptomInput.value.trim();
            const notes = sickNotesInput.value.trim();
            const date = sickDateInput.value;

            if (!symptom) return;

            let emoji = '🤒';
            const symLower = symptom.toLowerCase();
            if (symLower.includes('cảm') || symLower.includes('lạnh') || symLower.includes('cúm')) emoji = '🤧';
            else if (symLower.includes('sốt') || symLower.includes('nóng') || symLower.includes('nhiệt')) emoji = '🌡️';
            else if (symLower.includes('họng') || symLower.includes('ho')) emoji = '😷';
            else if (symLower.includes('mệt') || symLower.includes('oải') || symLower.includes('kiệt sức') || symLower.includes('yếu') || symLower.includes('đuối') || symLower.includes('xỉu')) emoji = '😴';
            else if (symLower.includes('đau đầu') || symLower.includes('nhức đầu') || symLower.includes('đầu') || symLower.includes('chóng mặt') || symLower.includes('choáng')) emoji = '🧠';
            else if (symLower.includes('bụng') || symLower.includes('dạ dày') || symLower.includes('bao tử') || symLower.includes('tiêu hóa') || symLower.includes('luộm nhuộm')) emoji = '🤢';

            const newLog = {
                id: Math.random().toString(36).substring(2, 10),
                date: date,
                symptomType: symptom,
                notes: notes || 'Giữ gìn sức khỏe nhé em iu!',
                icon: emoji
            };

            if (!state.weLoveSicknessLogs) state.weLoveSicknessLogs = [];
            state.weLoveSicknessLogs.unshift(newLog);
            state.weLoveSicknessLogsUpdated = new Date().toISOString();
            await saveLocalState();
            
            if (sync.isConfigured() && state.user) {
                performSync(true);
            }

            sicknessLogs = state.weLoveSicknessLogs;
            renderSicknessHistory();
            modalOverlay.style.display = 'none';
            showToast("Đã ghi nhận đợt ốm thành công ❤️");
        });
    }

    // Initialize album index
    if (state.weLovePhotoAlbum && state.weLovePhotoAlbum.length > 0) {
        state.activePhotoIndex = state.activePhotoIndex || 0;
        if (state.activePhotoIndex >= state.weLovePhotoAlbum.length) {
            state.activePhotoIndex = 0;
        }
    } else {
        state.activePhotoIndex = 0;
    }
    
    // Render photo album slider content
    updateWeLoveAlbum();

    // Bind Manage Album settings button click
    const btnManageAlbum = document.getElementById('btnWeLoveManageAlbum');
    if (btnManageAlbum) {
        btnManageAlbum.addEventListener('click', (e) => {
            e.stopPropagation();
            openWeLoveAlbumManager();
        });
    }

    // Modal close and submission listeners for photo manager
    const modalAlbum = document.getElementById('weLoveAlbumManagerModal');
    const btnCloseAlbum = document.getElementById('btnWeLoveCloseAlbumManager');
    const formAddPhoto = document.getElementById('weLoveAddPhotoForm');
    
    if (btnCloseAlbum && modalAlbum) {
        btnCloseAlbum.addEventListener('click', () => {
            closeWeLoveAlbumManagerModal();
        });
    }

    if (modalAlbum) {
        modalAlbum.addEventListener('click', (e) => {
            if (e.target === modalAlbum) {
                closeWeLoveAlbumManagerModal();
            }
        });
        modalAlbum.addEventListener('touchmove', (e) => {
            const list = document.getElementById('weLoveAlbumManagerList');
            if (list && list.contains(e.target)) {
                return;
            }
            e.preventDefault();
        }, { passive: false });
    }

    if (formAddPhoto) {
        formAddPhoto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const urlInput = document.getElementById('weLovePhotoUrlInput');
            const captionInput = document.getElementById('weLovePhotoCaptionInput');
            const rawUrl = urlInput.value.trim();
            const caption = captionInput.value.trim();

            if (!rawUrl) return;

            if (!state.weLovePhotoAlbum) state.weLovePhotoAlbum = [];
            state.weLovePhotoAlbum.push({
                id: 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                url: rawUrl,
                caption: caption
            });
            state.weLovePhotoAlbumUpdated = new Date().toISOString();
            await saveLocalState();

            urlInput.value = '';
            captionInput.value = '';
            
            updateWeLoveAlbumManagerList();
            updateWeLoveAlbum();

            if (sync.isConfigured() && state.user) {
                performSync(true);
            }
            showToast("Đã thêm ảnh vào album thành công 📸");
        });
    }

    // Lightbox Modal Close
    const btnCloseLightbox = document.getElementById('btnWeLoveCloseLightbox');
    const lightboxModal = document.getElementById('weLoveLightboxModal');
    if (btnCloseLightbox && lightboxModal) {
        btnCloseLightbox.addEventListener('click', () => {
            closeWeLoveLightbox();
        });
        const imgWrapper = document.getElementById('weLoveLightboxImgWrapper');
        imgWrapper?.addEventListener('click', (e) => {
            if (e.target === imgWrapper) {
                closeWeLoveLightbox();
            }
        });
    }

    // Khởi tạo tính năng Zoom và Rê ảnh (Drag) cho Lightbox
    initWeLoveLightboxZoomAndDrag();
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
                id: Math.random().toString(36).substring(2, 10),
                title: title,
                message: message,
                scheduledTime: scheduledTimeIso,
                isSent: false,
                createdAt: new Date().toISOString()
            };

            if (!state.weLoveReminders) state.weLoveReminders = [];
            state.weLoveReminders.unshift(newReminder);
            state.weLoveRemindersUpdated = new Date().toISOString();
            await saveLocalState();

            // Gửi tin nhắn tức thời qua Telegram Webhook (Giai đoạn 1)
            sendWeLoveReminderTelegram(newReminder);

            // Đồng bộ cục bộ Capacitor Local Notifications (Giai đoạn 1)
            if (typeof syncLocalNotifications === 'function') {
                syncLocalNotifications();
            }

            if (sync.isConfigured() && state.user) {
                performSync(true);
            }

            reminders = state.weLoveReminders;
            renderRemindersList();
            
            remTimeInput.value = '';
            remTitleInput.value = '';
            remMessageInput.value = '';
            
            showToast("Lên lịch nhắc nhở thành công ⏰");
        });
    }


}

// Bind events for settings view
function bindSettingsEvents() {
    const formConfig = document.getElementById('weLoveConfigForm');
    const name1Input = document.getElementById('weLoveName1Input');
    const name2Input = document.getElementById('weLoveName2Input');
    const startDateInput = document.getElementById('weLoveStartDateInput');
    const showSicknessInput = document.getElementById('weLoveShowSicknessInput');
    const autoplayInput = document.getElementById('weLoveAutoplayInput');
    const albumLayoutInput = document.getElementById('weLoveAlbumLayoutDesktopInput');
    const btnUnlink = document.getElementById('btnWeLoveUnlinkPartner');



    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name1 = name1Input.value.trim();
            const name2 = name2Input.value.trim();
            const startDate = startDateInput.value;
            const showSickness = showSicknessInput.checked;
            const weLoveAutoplay = autoplayInput ? autoplayInput.checked : false;
            const weLoveAlbumLayoutDesktop = albumLayoutInput ? albumLayoutInput.value : 'slider';

            state.weLoveName1 = name1;
            state.weLoveName1Updated = new Date().toISOString();

            state.weLoveName2 = name2;
            state.weLoveName2Updated = new Date().toISOString();

            state.weLoveStartDate = startDate;
            state.weLoveStartDateUpdated = new Date().toISOString();
            
            state.weLoveShowSickness = showSickness;
            state.weLoveShowSicknessUpdated = new Date().toISOString();

            state.weLoveAutoplay = weLoveAutoplay;
            state.weLoveAutoplayUpdated = new Date().toISOString();

            state.weLoveAlbumLayoutDesktop = weLoveAlbumLayoutDesktop;
            state.weLoveAlbumLayoutDesktopUpdated = new Date().toISOString();



            await saveLocalState();
            
            // Đồng bộ Local Notifications kỷ niệm và gửi telegram (nếu đến hạn)
            syncWeLoveAnniversaryNotifications();
            checkAndSendWeLoveAnniversaryTelegram();
            
            if (sync.isConfigured() && state.user) {
                performSync(true);
            }

            showToast("Đã thiết lập góc tình yêu thành công! ❤️");
            
            if (typeof window.switchTab === 'function') {
                window.switchTab('welove');
            }
        });
    }
}

// Global hook for mobile/desktop subview switching mapped to routing tabs
window.switchWeLoveSubView = function(subView) {
    if (state.viewingSharedFund && (subView === 'admin' || subView === 'settings')) {
        showToast("Bạn không có quyền truy cập vào mục này. 🔐", "warning");
        return;
    }
    if (!state.weLoveStartDate && subView !== 'settings') {
        showToast("Vui lòng cấu hình ngày bắt đầu yêu trước nhé! ❤️", "warning");
        if (typeof window.switchTab === 'function') {
            window.switchTab('welove-settings');
        }
        return;
    }
    const tabMap = {
        'memory': 'welove',
        'admin': 'welove-admin',
        'settings': 'welove-settings'
    };
    const targetTab = tabMap[subView];
    if (typeof window.switchTab === 'function') {
        window.switchTab(targetTab);
    }
};

// Global initialization bindings
export function initWeLoveBindings() {
    updateHomeLoveWidget();
}

// ============================================================
// CỔNG GHÉP ĐÔI TẬP TRUNG - Render tại tab Cài đặt chung
// ============================================================


// ============================================================
// WE-LOVE NOTIFICATIONS INTEGRATION (Giai đoạn 1)
// ============================================================

// Gửi tin nhắn tức thời qua Webhook Telegram khi tạo lời nhắc mới
async function sendWeLoveReminderTelegram(reminder) {
    if (state.notifyWeLove === false) return; // Bỏ qua nếu tắt thông báo WeLove
    if (!state.googleSheetsWebhook) {
        console.warn("[WeLove] Webhook URL not configured. Skip sending Telegram notification.");
        return;
    }
    
    // Tên người gửi: Chồng (Admin) hoặc Vợ (Spouse) tùy theo state
    const senderName = state.weLoveName1 || 'Nửa kia';
    const formattedTime = new Date(reminder.scheduledTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    const textMsg = `🔔 *LỜI NHẮC YÊU THƯƠNG MỚI* từ *${senderName}* ❤️\n\n` +
                 `⏰ *Thời gian:* ${formattedTime}\n` +
                 `📝 *Tiêu đề:* ${reminder.title}\n` +
                 `✉️ *Nội dung:* ${reminder.message}\n\n` +
                 `_Gửi tự động từ góc kỷ niệm FamiLife_`;

    try {
        await fetch(state.googleSheetsWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: textMsg, // Telegram
                content: textMsg // Discord
            }),
            mode: 'no-cors'
        });
        console.log("[WeLove] Sent Telegram/Discord Webhook successfully");
    } catch (err) {
        console.error("[WeLove] Failed to send Webhook:", err);
    }
}

// Hash helper to generate 32-bit integer IDs
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return hash;
}

// Lên lịch Capacitor Local Notifications cho tất cả lời nhắc chưa gửi
export async function syncLocalNotifications() {
    if (!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications)) {
        return; // Không chạy trong môi trường Capacitor hoặc thiếu plugin
    }
    
    try {
        const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
        
        // 1. Kiểm tra và xin quyền thông báo
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display !== 'granted') {
                console.warn("[WeLove] Notification permission denied");
                return;
            }
        }
        
        // 2. Hủy các lịch nhắc cũ của app WeLove để tránh trùng lặp
        const pending = await LocalNotifications.getPending();
        if (pending.notifications && pending.notifications.length > 0) {
            await LocalNotifications.cancel({ notifications: pending.notifications });
        }
        
        // 3. Lên lịch cho các lời nhắc chưa gửi ở tương lai
        const now = new Date();
        const listToSchedule = [];
        const remindersList = state.weLoveReminders || [];
        
        remindersList.forEach((r, idx) => {
            if (r.isSent) return;
            const schedTime = new Date(r.scheduledTime);
            if (schedTime > now) {
                const id = Math.abs(hashCode(r.scheduledTime || r.id || idx.toString())) % 2147483647;
                listToSchedule.push({
                    title: r.title,
                    body: r.message,
                    id: id,
                    schedule: { at: schedTime },
                    smallIcon: 'res://drawable/push_icon',
                    sound: 'res://raw/beep.wav'
                });
            }
        });
        
        if (listToSchedule.length > 0) {
            await LocalNotifications.schedule({ notifications: listToSchedule });
            console.log(`[WeLove] Scheduled ${listToSchedule.length} local notifications successfully.`);
        }
    } catch (err) {
        console.error("[WeLove] syncLocalNotifications error:", err);
    }
}

export async function syncWeLoveAnniversaryNotifications() {
    if (!state.weLoveStartDate) return;
    if (!(window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications)) {
        return;
    }
    
    try {
        const LocalNotifications = window.Capacitor.Plugins.LocalNotifications;
        const perm = await LocalNotifications.checkPermissions();
        if (perm.display !== 'granted') {
            const req = await LocalNotifications.requestPermissions();
            if (req.display !== 'granted') return;
        }
        
        await LocalNotifications.cancel({ notifications: [{ id: 30000000 }, { id: 30000001 }] });
        
        const dateParts = state.weLoveStartDate.split('-');
        if (dateParts.length !== 3) return;
        const m = parseInt(dateParts[1], 10);
        const d = parseInt(dateParts[2], 10);
        
        const tempDate = new Date(2026, m - 1, d);
        tempDate.setDate(tempDate.getDate() - 3);
        const mMinus3 = tempDate.getMonth() + 1;
        const dMinus3 = tempDate.getDate();
        
        const listToSchedule = [
            {
                id: 30000000,
                title: `❤️ FamiLife: Kỷ niệm ngày yêu nhau!`,
                body: `Hôm nay là ngày kỷ niệm tình yêu của hai bạn! Chúc hai bạn luôn hạnh phúc và ấm áp bên nhau nhé! 🥰`,
                schedule: {
                    on: { month: m, day: d, hour: 9, minute: 0 },
                    repeats: true
                },
                smallIcon: 'res://drawable/push_icon',
                sound: 'res://raw/beep.wav'
            },
            {
                id: 30000001,
                title: `🔔 FamiLife: Sắp đến ngày kỷ niệm yêu nhau!`,
                body: `Chỉ còn 3 ngày nữa là đến ngày kỷ niệm yêu nhau rồi đó! Hãy chuẩn bị quà và lên kế hoạch hẹn hò thôi nào! 🎁🌹`,
                schedule: {
                    on: { month: mMinus3, day: dMinus3, hour: 9, minute: 0 },
                    repeats: true
                },
                smallIcon: 'res://drawable/push_icon',
                sound: 'res://raw/beep.wav'
            }
        ];
        
        await LocalNotifications.schedule({ notifications: listToSchedule });
        console.log("[WeLove] Scheduled anniversary local notifications successfully.");
    } catch (err) {
        console.error("[WeLove] syncWeLoveAnniversaryNotifications error:", err);
    }
}

export async function checkAndSendWeLoveAnniversaryTelegram() {
    if (state.notifyWeLove === false) return;
    if (!state.googleSheetsWebhook || !state.weLoveStartDate) return;
    
    try {
        const now = new Date();
        const currentYear = now.getFullYear();
        
        if (state.weLoveLastAnniversaryNotifiedYear === currentYear) return;
        
        const dateParts = state.weLoveStartDate.split('-');
        if (dateParts.length !== 3) return;
        const m = parseInt(dateParts[1], 10);
        const d = parseInt(dateParts[2], 10);
        
        const annivDate = new Date(currentYear, m - 1, d);
        const diffTime = annivDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let textMsg = '';
        if (diffDays === 0) {
            const years = currentYear - parseInt(dateParts[0], 10);
            textMsg = `❤️ *CHÚC MỪNG NGÀY KỶ NIỆM YÊU NHAU!* 🎉\n\n` +
                      `⏰ Hôm nay chính là kỷ niệm tròn *${years} năm* ngày bắt đầu tình yêu của hai bạn! 🥰\n` +
                      `💕 Chúc hai bạn luôn ngập tràn niềm vui, hạnh phúc và gắn bó bền chặt hơn mỗi ngày. 🌹\n` +
                      `_Gửi tự động từ góc kỷ niệm FamiLife_`;
        } else if (diffDays > 0 && diffDays <= 3) {
            textMsg = `🔔 *NHẮC NHỞ KỶ NIỆM YÊU NHAU* 🔔\n\n` +
                      `⏰ Chỉ còn *${diffDays} ngày* nữa là đến ngày kỷ niệm yêu nhau của hai bạn rồi đó!\n` +
                      `🎁 Đừng quên chuẩn bị những món quà bất ngờ hoặc lên kế hoạch cho một buổi hẹn hò thật lãng mạn nhé! 😉\n` +
                      `_Gửi tự động từ góc kỷ niệm FamiLife_`;
        }
        
        if (textMsg) {
            await fetch(state.googleSheetsWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textMsg, content: textMsg }),
                mode: 'no-cors'
            });
            
            state.weLoveLastAnniversaryNotifiedYear = currentYear;
            await saveLocalState();
            
            if (sync.isConfigured() && state.user) {
                performSync(true);
            }
            console.log("[WeLove] Sent anniversary Telegram notification successfully.");
        }
    } catch (err) {
        console.error("[WeLove] checkAndSendWeLoveAnniversaryTelegram error:", err);
    }
}

// ============================================================
// HỖ TRỢ ALBUM ẢNH KỶ NIỆM (TƯƠNG THÍCH GOOGLE DRIVE)
// ============================================================

export function getGoogleDriveDirectLink(url) {
    if (!url || typeof url !== 'string') return '';
    url = url.trim();
    
    // Extract Google Drive FILE_ID from various share link formats
    let fileId = null;

    // Pattern 1: drive.google.com/file/d/[ID]/view
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
        fileId = fileDMatch[1];
    }
    
    // Pattern 2: drive.google.com/open?id=[ID] or id=[ID] query param
    if (!fileId) {
        const openIdMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
        if (openIdMatch && openIdMatch[1]) {
            fileId = openIdMatch[1];
        }
    }

    // Pattern 3: drive.google.com/drive/folders or uc?id=
    if (!fileId) {
        const ucIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
        if (ucIdMatch && ucIdMatch[1]) {
            fileId = ucIdMatch[1];
        }
    }

    if (fileId) {
        const directLink = `https://lh3.googleusercontent.com/d/${fileId}=s0`;
        return directLink;
    }
    
    // Validate protocol safety: only allow http://, https://, data:image/, blob: or relative paths
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.startsWith('https://') || lowerUrl.startsWith('http://') || lowerUrl.startsWith('data:image/') || lowerUrl.startsWith('blob:') || lowerUrl.startsWith('./') || lowerUrl.startsWith('src/')) {
        return url;
    }
    
    // Reject dangerous protocols like javascript:, vbscript:, file:
    console.warn('[WeLove] Blocked unsafe URL protocol:', url);
    return '';
}


function renderWeLoveSlider(container, album) {
    let slidesHtml = '';
    album.forEach((photo, idx) => {
        const directUrl = getGoogleDriveDirectLink(photo.url);
        slidesHtml += `
            <div class="welove-slide" data-idx="${idx}">
                <div class="welove-slide-img-wrapper">
                    <img src="${escapeHTML(directUrl)}" alt="${escapeHTML(photo.caption || 'Kỷ niệm')}" class="welove-slide-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="welove-img-error-placeholder" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); color: var(--accent-rose); padding: 20px; text-align: center; border-radius: 24px;">
                        <span style="font-size: 2.2rem; margin-bottom: 8px;">⚠️</span>
                        <p style="font-size: 0.82rem; margin: 0 0 4px 0; font-weight: 700;">Ảnh chưa bật công khai</p>
                        <p style="font-size: 0.72rem; margin: 0; color: var(--text-secondary); line-height: 1.3;">Hãy chuyển file Google Drive sang chế độ<br><b>"Bất kỳ ai có liên kết đều có thể xem"</b></p>
                    </div>
                    ${photo.caption ? `
                        <div class="welove-slide-caption-wrapper">
                            <p class="welove-slide-caption">${escapeHTML(photo.caption)}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    const controlsHtml = album.length > 1 ? `
        <button class="welove-nav-btn prev" id="btnWeLovePrevPhoto">‹</button>
        <button class="welove-nav-btn next" id="btnWeLoveNextPhoto">›</button>
        
        <div class="welove-slider-dots" style="display: flex; justify-content: center; gap: 6px; margin-top: 16px;">
            ${album.map((_, idx) => `
                <span class="welove-slider-dot ${idx === state.activePhotoIndex ? 'active' : ''}" data-idx="${idx}" style="width: 8px; height: 8px; border-radius: 50%; background: ${idx === state.activePhotoIndex ? 'var(--accent-rose)' : 'rgba(255,255,255,0.2)'}; cursor: pointer; transition: all 0.3s ease;"></span>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="welove-slider-wrapper">
            <div class="welove-slides-container" id="weLoveSlidesContainer">
                ${slidesHtml}
            </div>
            ${controlsHtml}
        </div>
    `;

    const slidesContainer = document.getElementById('weLoveSlidesContainer');
    
    // Initial scroll offset placement
    if (slidesContainer && state.activePhotoIndex > 0) {
        setTimeout(() => {
            const activeSlide = slidesContainer.querySelector(`.welove-slide[data-idx="${state.activePhotoIndex}"]`);
            if (activeSlide) {
                slidesContainer.scrollLeft = activeSlide.offsetLeft;
            }
        }, 50);
    }

    // Bind slider actions
    if (album.length > 1 && slidesContainer) {
        let isScrollingByClick = false;

        slidesContainer.addEventListener('scroll', () => {
            if (isScrollingByClick) return;
            const containerWidth = slidesContainer.clientWidth;
            if (containerWidth <= 0) return;
            
            const scrollLeft = slidesContainer.scrollLeft;
            const newIndex = Math.round(scrollLeft / containerWidth);
            
            if (newIndex >= 0 && newIndex < album.length && newIndex !== state.activePhotoIndex) {
                state.activePhotoIndex = newIndex;
                const dots = container.querySelectorAll('.welove-slider-dot');
                dots.forEach((dot, idx) => {
                    if (idx === newIndex) {
                        dot.classList.add('active');
                        dot.style.background = 'var(--accent-rose)';
                    } else {
                        dot.classList.remove('active');
                        dot.style.background = 'rgba(255,255,255,0.2)';
                    }
                });
            }
        });

        const scrollToSlide = (idx) => {
            isScrollingByClick = true;
            const activeSlide = slidesContainer.querySelector(`.welove-slide[data-idx="${idx}"]`);
            if (activeSlide) {
                slidesContainer.scrollTo({
                    left: activeSlide.offsetLeft,
                    behavior: 'smooth'
                });
            }
            const dots = container.querySelectorAll('.welove-slider-dot');
            dots.forEach((dot, dIdx) => {
                if (dIdx === idx) {
                    dot.classList.add('active');
                    dot.style.background = 'var(--accent-rose)';
                } else {
                    dot.classList.remove('active');
                    dot.style.background = 'rgba(255,255,255,0.2)';
                }
            });
            setTimeout(() => {
                isScrollingByClick = false;
            }, 400);
        };

        document.getElementById('btnWeLovePrevPhoto').addEventListener('click', (e) => {
            e.stopPropagation();
            state.activePhotoIndex = (state.activePhotoIndex - 1 + album.length) % album.length;
            scrollToSlide(state.activePhotoIndex);
        });
        document.getElementById('btnWeLoveNextPhoto').addEventListener('click', (e) => {
            e.stopPropagation();
            state.activePhotoIndex = (state.activePhotoIndex + 1) % album.length;
            scrollToSlide(state.activePhotoIndex);
        });
        
        const dots = container.querySelectorAll('.welove-slider-dot');
        dots.forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-idx'));
                state.activePhotoIndex = idx;
                scrollToSlide(idx);
            });
        });
    }

    // Lightbox click preview
    const slides = container.querySelectorAll('.welove-slide');
    slides.forEach(slide => {
        const imgWrapper = slide.querySelector('.welove-slide-img-wrapper');
        const idx = parseInt(slide.getAttribute('data-idx'));
        if (imgWrapper) {
            imgWrapper.addEventListener('click', (e) => {
                e.stopPropagation();
                const photo = album[idx];
                openWeLoveLightbox(getGoogleDriveDirectLink(photo.url), photo.caption);
            });
        }
    });
}

function renderWeLovePolaroid(container, album) {
    let cardsHtml = '';
    album.forEach((photo, idx) => {
        const directUrl = getGoogleDriveDirectLink(photo.url);
        // Nghiêng ngẫu nhiên từ -5deg đến +5deg
        const rotate = ((idx % 5) * 2.5) - 5;
        cardsHtml += `
            <div class="welove-polaroid-card" style="transform: rotate(${rotate}deg);" data-idx="${idx}">
                <div class="welove-polaroid-pin">📌</div>
                <div class="welove-polaroid-tape"></div>
                <div class="welove-polaroid-img-wrapper">
                    <img src="${escapeHTML(directUrl)}" alt="${escapeHTML(photo.caption || 'Kỷ niệm')}" class="welove-polaroid-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="welove-img-error-placeholder" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); color: var(--accent-rose); padding: 10px; text-align: center;">
                        <span style="font-size: 1.5rem; margin-bottom: 4px;">⚠️</span>
                        <p style="font-size: 0.7rem; margin: 0; font-weight: 700;">Lỗi ảnh</p>
                    </div>
                </div>
                <div class="welove-polaroid-caption">${escapeHTML(photo.caption || 'Kỷ niệm ngọt ngào')}</div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="welove-polaroid-board">
            ${cardsHtml}
        </div>
    `;

    // Bind click to open lightbox
    container.querySelectorAll('.welove-polaroid-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(card.getAttribute('data-idx'));
            const photo = album[idx];
            openWeLoveLightbox(getGoogleDriveDirectLink(photo.url), photo.caption);
        });
    });
}

function renderWeLoveCarousel3D(container, album) {
    let itemsHtml = '';
    album.forEach((photo, idx) => {
        const directUrl = getGoogleDriveDirectLink(photo.url);
        itemsHtml += `
            <div class="welove-carousel-3d-item" data-idx="${idx}">
                <div class="welove-carousel-3d-img-wrapper">
                    <img src="${escapeHTML(directUrl)}" alt="${escapeHTML(photo.caption || 'Kỷ niệm')}" class="welove-carousel-3d-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="welove-img-error-placeholder" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); color: var(--accent-rose); padding: 20px; text-align: center; border-radius: 16px;">
                        <span style="font-size: 2rem; margin-bottom: 6px;">⚠️</span>
                        <p style="font-size: 0.75rem; margin: 0; font-weight: 700;">Lỗi tải ảnh</p>
                    </div>
                </div>
                ${photo.caption ? `<div class="welove-carousel-3d-caption">${escapeHTML(photo.caption)}</div>` : ''}
            </div>
        `;
    });

    const controlsHtml = album.length > 1 ? `
        <button class="welove-carousel-3d-btn prev" id="btnCarousel3DPrev">‹</button>
        <button class="welove-carousel-3d-btn next" id="btnCarousel3DNext">›</button>
        <div class="welove-carousel-3d-dots">
            ${album.map((_, idx) => `
                <span class="welove-carousel-3d-dot ${idx === state.activePhotoIndex ? 'active' : ''}" data-idx="${idx}"></span>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="welove-carousel-3d-wrapper">
            <div class="welove-carousel-3d-container" id="weloveCarousel3DContainer">
                ${itemsHtml}
            </div>
            ${controlsHtml}
        </div>
    `;

    const update3DPositions = () => {
        const carContainer = document.getElementById('weloveCarousel3DContainer');
        if (!carContainer) return;
        const items = carContainer.querySelectorAll('.welove-carousel-3d-item');
        if (items.length === 0) return;

        const activeIdx = state.activePhotoIndex;
        const total = items.length;

        items.forEach(item => {
            const idx = parseInt(item.getAttribute('data-idx'));
            let diff = idx - activeIdx;

            // Xoay vòng tròn
            if (diff < -total / 2) diff += total;
            if (diff > total / 2) diff -= total;

            const absDiff = Math.abs(diff);

            if (diff === 0) {
                item.style.transform = `translateX(-50%) translateZ(0px) scale(1) rotateY(0deg)`;
                item.style.opacity = '1';
                item.style.zIndex = '10';
                item.style.pointerEvents = 'auto';
            } else if (diff > 0) {
                // Phía bên phải
                item.style.transform = `translateX(calc(-50% + ${diff * 140}px)) translateZ(-200px) scale(0.8) rotateY(-40deg)`;
                item.style.opacity = absDiff > 2 ? '0' : '0.6';
                item.style.zIndex = `${10 - absDiff}`;
                item.style.pointerEvents = 'none';
            } else {
                // Phía bên trái
                item.style.transform = `translateX(calc(-50% + ${diff * 140}px)) translateZ(-200px) scale(0.8) rotateY(40deg)`;
                item.style.opacity = absDiff > 2 ? '0' : '0.6';
                item.style.zIndex = `${10 - absDiff}`;
                item.style.pointerEvents = 'none';
            }
        });

        // Cập nhật dots
        const dots = container.querySelectorAll('.welove-carousel-3d-dot');
        dots.forEach((dot, idx) => {
            if (idx === activeIdx) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    };

    update3DPositions();

    // Bind events
    const items = container.querySelectorAll('.welove-carousel-3d-item');
    items.forEach(item => {
        const idx = parseInt(item.getAttribute('data-idx'));
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            if (idx === state.activePhotoIndex) {
                // Nhấp vào ảnh trung tâm -> Mở Lightbox
                const photo = album[idx];
                openWeLoveLightbox(getGoogleDriveDirectLink(photo.url), photo.caption);
            } else {
                state.activePhotoIndex = idx;
                update3DPositions();
            }
        });
    });

    if (album.length > 1) {
        document.getElementById('btnCarousel3DPrev').addEventListener('click', (e) => {
            e.stopPropagation();
            state.activePhotoIndex = (state.activePhotoIndex - 1 + album.length) % album.length;
            update3DPositions();
        });

        document.getElementById('btnCarousel3DNext').addEventListener('click', (e) => {
            e.stopPropagation();
            state.activePhotoIndex = (state.activePhotoIndex + 1) % album.length;
            update3DPositions();
        });

        container.querySelectorAll('.welove-carousel-3d-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(dot.getAttribute('data-idx'));
                state.activePhotoIndex = idx;
                update3DPositions();
            });
        });
    }
}

function renderWeLoveTheater(container, album) {
    const activePhoto = album[state.activePhotoIndex] || album[0];
    const directUrl = getGoogleDriveDirectLink(activePhoto.url);

    let listHtml = '';
    album.forEach((photo, idx) => {
        const thumbUrl = getGoogleDriveDirectLink(photo.url);
        const isActive = idx === state.activePhotoIndex;
        listHtml += `
            <div class="welove-theater-timeline-item ${isActive ? 'active' : ''}" data-idx="${idx}">
                <div class="welove-theater-thumb-box">
                    <img src="${thumbUrl}" alt="Kỷ niệm" class="welove-theater-thumb" onerror="this.src='src/assets/images/placeholder.png';">
                </div>
                <div class="welove-theater-timeline-details">
                    <span class="welove-theater-timeline-number">Khoảnh khắc #${idx + 1}</span>
                    <span class="welove-theater-timeline-desc">${escapeHTML(photo.caption || 'Kỷ niệm ngọt ngào')}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="welove-theater-wrapper">
            <div class="welove-theater-main">
                <div class="welove-theater-polaroid" id="weLoveTheaterMainPolaroid">
                    <div class="welove-theater-img-box">
                        <img src="${escapeHTML(directUrl)}" alt="${escapeHTML(activePhoto.caption || 'Kỷ niệm')}" class="welove-theater-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="welove-img-error-placeholder" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); color: var(--accent-rose); padding: 20px; text-align: center;">
                            <span style="font-size: 2.5rem; margin-bottom: 8px;">⚠️</span>
                            <p style="font-size: 0.9rem; margin: 0; font-weight: 700;">Ảnh chưa bật công khai</p>
                        </div>
                    </div>
                    <div class="welove-theater-caption">${escapeHTML(activePhoto.caption || 'Kỷ niệm ngọt ngào')}</div>
                </div>
            </div>
            <div class="welove-theater-timeline">
                <div class="welove-theater-timeline-track">
                    ${listHtml}
                </div>
            </div>
        </div>
    `;

    // Bind click timeline
    const timelineItems = container.querySelectorAll('.welove-theater-timeline-item');
    timelineItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(item.getAttribute('data-idx'));
            state.activePhotoIndex = idx;
            // Re-render
            renderWeLoveTheater(container, album);
        });
    });

    // Bind click ảnh to để phóng to Lightbox
    const mainPolaroid = document.getElementById('weLoveTheaterMainPolaroid');
    if (mainPolaroid) {
        mainPolaroid.addEventListener('click', (e) => {
            e.stopPropagation();
            const photo = album[state.activePhotoIndex];
            openWeLoveLightbox(getGoogleDriveDirectLink(photo.url), photo.caption);
        });
    }

    // Scroll active item into view inside track
    const activeItem = container.querySelector('.welove-theater-timeline-item.active');
    const track = container.querySelector('.welove-theater-timeline-track');
    if (activeItem && track) {
        setTimeout(() => {
            track.scrollTo({
                top: activeItem.offsetTop - track.offsetTop - 50,
                behavior: 'smooth'
            });
        }, 50);
    }
}

function renderWeLoveGrid(container, album) {
    let cardsHtml = '';
    album.forEach((photo, idx) => {
        const directUrl = getGoogleDriveDirectLink(photo.url);
        // Tạo size class so le
        let sizeClass = 'welove-grid-medium';
        if (idx % 5 === 0) {
            sizeClass = 'welove-grid-large-vertical';
        } else if (idx % 6 === 0) {
            sizeClass = 'welove-grid-large-horizontal';
        }

        cardsHtml += `
            <div class="welove-grid-card ${sizeClass}" data-idx="${idx}">
                <img src="${escapeHTML(directUrl)}" alt="${escapeHTML(photo.caption || 'Kỷ niệm')}" class="welove-grid-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="welove-img-error-placeholder" style="display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; background: rgba(255,255,255,0.02); color: var(--accent-rose); padding: 10px; text-align: center;">
                    <span style="font-size: 1.5rem;">⚠️</span>
                </div>
                <div class="welove-grid-overlay">
                    <span class="welove-grid-caption">${escapeHTML(photo.caption || 'Kỷ niệm')}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="welove-grid-layout">
            ${cardsHtml}
        </div>
    `;

    // Bind events
    container.querySelectorAll('.welove-grid-card').forEach(card => {
        card.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(card.getAttribute('data-idx'));
            state.activePhotoIndex = idx;
            const photo = album[idx];
            openWeLoveLightbox(getGoogleDriveDirectLink(photo.url), photo.caption);
        });
    });
}

export function updateWeLoveAlbum() {
    const container = document.getElementById('weLoveAlbumContainer');
    if (!container) return;

    const album = state.weLovePhotoAlbum || [];
    if (album.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2.5rem 1.5rem; background: rgba(255,255,255,0.02); border-radius: 20px; border: 1px dashed var(--border-color);">
                <span style="font-size: 2.5rem; display: block; margin-bottom: 12px; filter: drop-shadow(0 0 10px rgba(244,63,94,0.3));">📸</span>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 1.25rem 0;">Chưa có ảnh nào trong album. Hãy thêm những khoảnh khắc đẹp của hai bạn!</p>
                ${(!state.viewingSharedFund || state.sharedFundSourceRow === null) ? `
                    <button class="btn btn-primary" id="btnWeLoveAddPhotoPlaceholder" style="font-size: 0.85rem; padding: 6px 16px; border-radius: 12px; background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); border: none; color: #fff; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.2);">
                        Thêm ảnh đầu tiên ➕
                    </button>
                ` : '<p style="font-size: 0.8rem; color: var(--accent-rose); margin:0;">Chỉ tài khoản chính mới có quyền quản lý ảnh</p>'}
            </div>
        `;
        
        const btnAddPlaceholder = document.getElementById('btnWeLoveAddPhotoPlaceholder');
        if (btnAddPlaceholder) {
            btnAddPlaceholder.addEventListener('click', () => {
                openWeLoveAlbumManager();
            });
        }
        return;
    }

    // Đảm bảo active index hợp lệ
    if (typeof state.activePhotoIndex !== 'number' || state.activePhotoIndex >= album.length || state.activePhotoIndex < 0) {
        state.activePhotoIndex = 0;
    }

    // Nhận diện môi trường hiển thị
    const isMobile = window.innerWidth <= 768;
    const layout = isMobile ? 'slider' : (state.weLoveAlbumLayoutDesktop || 'slider');

    // Gọi các hàm render tương ứng
    if (layout === 'polaroid') {
        renderWeLovePolaroid(container, album);
    } else if (layout === 'carousel3d') {
        renderWeLoveCarousel3D(container, album);
    } else if (layout === 'theater') {
        renderWeLoveTheater(container, album);
    } else if (layout === 'grid') {
        renderWeLoveGrid(container, album);
    } else {
        renderWeLoveSlider(container, album);
    }
}

let _savedIosScrollY = 0;

export function closeWeLoveAlbumManagerModal() {
    const modalAlbum = document.getElementById('weLoveAlbumManagerModal');
    if (modalAlbum) {
        modalAlbum.style.display = 'none';
    }
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
    if (_savedIosScrollY) {
        window.scrollTo(0, _savedIosScrollY);
    }
}

export function openWeLoveAlbumManager() {
    const modalAlbum = document.getElementById('weLoveAlbumManagerModal');
    if (!modalAlbum) return;
    
    _savedIosScrollY = window.scrollY || window.pageYOffset || 0;
    modalAlbum.style.display = 'flex';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${_savedIosScrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    updateWeLoveAlbumManagerList();
}

export function updateWeLoveAlbumManagerList() {
    const listContainer = document.getElementById('weLoveAlbumManagerList');
    if (!listContainer) return;

    const album = state.weLovePhotoAlbum || [];
    if (album.length === 0) {
        listContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary); font-style: italic; font-size: 0.85rem; margin: 15px 0;">Không có hình ảnh nào trong danh sách.</p>`;
        return;
    }

    const isSpouseRole = state.viewingSharedFund && state.sharedFundSourceRow !== null;
    const canDelete = !isSpouseRole;

    listContainer.innerHTML = album.map((photo) => {
        const directUrl = getGoogleDriveDirectLink(photo.url);
        return `
            <div class="welove-log-card welove-photo-manager-item" style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid var(--border-color);">
                <div style="position: relative; width: 50px; height: 50px; flex-shrink: 0;">
                    <img src="${directUrl}" alt="Thumbnail" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px; background: #000; border: 1px solid var(--border-color);" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div style="display: none; width: 50px; height: 50px; border-radius: 8px; background: rgba(244,63,94,0.1); border: 1px dashed var(--accent-rose); align-items: center; justify-content: center; color: var(--accent-rose); font-size: 0.9rem;" title="Ảnh chưa bật công khai hoặc bị chặn quyền truy cập">⚠️</div>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <p style="margin: 0; font-size: 0.82rem; font-weight: 700; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${photo.caption || 'Kỷ niệm không có tên'}
                    </p>
                    <p style="margin: 2px 0 0 0; font-size: 0.7rem; color: var(--text-secondary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${photo.url}
                    </p>
                </div>
                ${canDelete ? `
                    <button type="button" class="btn-delete-photo" data-id="${photo.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; font-size: 1.1rem; display: flex; align-items: center; justify-content: center;" title="Xóa hình ảnh này">
                        🗑️
                    </button>
                ` : ''}
            </div>
        `;
    }).join('');

    // Bind delete events
    const deleteBtns = listContainer.querySelectorAll('.btn-delete-photo');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = e.target.getAttribute('data-id');
            const confirmed = await window.showConfirm("Bạn có chắc chắn muốn xóa hình ảnh này khỏi album không? 🥺");
            if (!confirmed) return;

            state.weLovePhotoAlbum = state.weLovePhotoAlbum.filter(p => p.id !== id);
            state.weLovePhotoAlbumUpdated = new Date().toISOString();
            
            // Adjust active index if it falls out of bounds
            if (state.activePhotoIndex >= state.weLovePhotoAlbum.length) {
                state.activePhotoIndex = Math.max(0, state.weLovePhotoAlbum.length - 1);
            }

            await saveLocalState();
            updateWeLoveAlbumManagerList();
            updateWeLoveAlbum();

            if (sync.isConfigured() && state.user) {
                performSync(true);
            }
            showToast("Đã xóa ảnh khỏi album 🗑️");
        });
    });
}

const preventDefaultTouchMove = (e) => {
    const lightboxModal = document.getElementById('weLoveLightboxModal');
    if (lightboxModal && lightboxModal.style.display !== 'none') {
        // Chỉ chặn cuộn nếu không phải touch trên slider
        if (!e.target.closest('#weLoveLightboxSlider')) {
            e.preventDefault();
        }
    }
};

export function updateSliderPhotos() {
    const album = state.weLovePhotoAlbum || [];
    if (album.length === 0) return;
    
    const activeIdx = state.activePhotoIndex;
    
    const lightboxCaption = document.getElementById('weLoveLightboxCaption');
    if (lightboxCaption) {
        const activePhoto = album[activeIdx];
        lightboxCaption.textContent = activePhoto && activePhoto.caption ? `"${activePhoto.caption}"` : '';
    }
    
    album.forEach((photo, idx) => {
        const img = document.getElementById(`weLoveLightboxImg_${idx}`);
        if (img) {
            if (Math.abs(idx - activeIdx) <= 1) {
                const targetSrc = getGoogleDriveDirectLink(photo.url);
                if (img.src !== targetSrc && img.getAttribute('src') !== targetSrc) {
                    img.src = targetSrc;
                }
            }
            // Không gỡ src của ảnh ở xa ra để tránh việc phải tải lại ảnh khi vuốt ngược lại
        }

        // Đồng bộ trạng thái active của thumbnail kiểu Telegram tức thời
        const thumb = document.getElementById(`weLoveThumb_${idx}`);
        if (thumb) {
            if (idx === activeIdx) {
                thumb.style.borderColor = '#fff';
                thumb.style.opacity = '1';
                thumb.style.transform = 'scale(1.1)';
            } else {
                thumb.style.borderColor = 'transparent';
                thumb.style.opacity = '0.45';
                thumb.style.transform = 'scale(1)';
            }
        }
    });

    // Trì hoãn nhẹ việc cuộn dải thumbnail và đồng bộ album chính để tránh xung đột cử chỉ vuốt nhanh
    if (window.weLoveLightboxScrollTimeout) {
        clearTimeout(window.weLoveLightboxScrollTimeout);
    }
    window.weLoveLightboxScrollTimeout = setTimeout(() => {
        const activeThumb = document.getElementById(`weLoveThumb_${activeIdx}`);
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
        
        // Đồng bộ thanh trượt trang chính
        if (typeof window.updateWeLoveAlbum === 'function') {
            window.updateWeLoveAlbum();
        }
    }, 120);
}

export function updateLightboxUiVisibility(visible) {
    window.isWeLoveLightboxUiVisible = visible;
    const btnClose = document.getElementById('btnWeLoveCloseLightbox');
    const tools = document.querySelector('.welove-lightbox-tools');
    const btnPrev = document.getElementById('btnWeLoveLightboxPrev');
    const btnNext = document.getElementById('btnWeLoveLightboxNext');
    const caption = document.getElementById('weLoveLightboxCaption');
    const thumbs = document.getElementById('weLoveLightboxThumbnails');

    if (btnClose) {
        btnClose.style.opacity = visible ? '1' : '0';
        btnClose.style.pointerEvents = visible ? 'auto' : 'none';
        btnClose.style.transform = visible ? 'translateY(0)' : 'translateY(-20px)';
    }
    if (tools) {
        tools.style.opacity = visible ? '1' : '0';
        tools.style.pointerEvents = visible ? 'auto' : 'none';
        tools.style.transform = visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(-20px)';
    }
    if (btnPrev) {
        btnPrev.style.opacity = visible ? '1' : '0';
        btnPrev.style.pointerEvents = visible ? 'auto' : 'none';
        btnPrev.style.transform = visible ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(-20px)';
    }
    if (btnNext) {
        btnNext.style.opacity = visible ? '1' : '0';
        btnNext.style.pointerEvents = visible ? 'auto' : 'none';
        btnNext.style.transform = visible ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(20px)';
    }
    if (caption) {
        caption.style.opacity = visible ? '1' : '0';
        caption.style.pointerEvents = visible ? 'auto' : 'none';
        caption.style.transform = visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)';
    }
    if (thumbs) {
        thumbs.style.opacity = visible ? '1' : '0';
        thumbs.style.pointerEvents = visible ? 'auto' : 'none';
        thumbs.style.transform = visible ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(20px)';
    }
}

export function openWeLoveLightbox(url, caption) {
    const lightboxModal = document.getElementById('weLoveLightboxModal');
    if (!lightboxModal) return;

    const album = state.weLovePhotoAlbum || [];
    let selectIndex = album.findIndex(photo => getGoogleDriveDirectLink(photo.url) === url || photo.url === url);
    if (selectIndex === -1) selectIndex = 0;
    
    state.activePhotoIndex = selectIndex;

    const slider = document.getElementById('weLoveLightboxSlider');
    if (slider) {
        slider.innerHTML = album.map((photo, index) => `
            <div class="we-love-lightbox-slide" style="width: 100vw; height: 100vh; flex-shrink: 0; scroll-snap-align: start; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative;">
                <img class="we-love-lightbox-img" id="weLoveLightboxImg_${index}" data-index="${index}" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="Xem ảnh" style="max-width: 100vw; max-height: 100vh; width: auto; height: auto; object-fit: contain; transform-origin: center; will-change: transform; user-select: none; -webkit-user-drag: none; transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); cursor: zoom-in;">
            </div>
        `).join('');
    }

    // Render dải Thumbnail kiểu Telegram
    const thumbsContainer = document.getElementById('weLoveLightboxThumbnails');
    if (thumbsContainer) {
        thumbsContainer.innerHTML = album.map((photo, index) => `
            <img class="welove-lightbox-thumb" id="weLoveThumb_${index}" src="${escapeHTML(getGoogleDriveDirectLink(photo.url))}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 8px; cursor: pointer; transition: all 0.2s; border: 2px solid transparent; opacity: 0.45;" title="${escapeHTML(photo.caption || '')}">
        `).join('');

        // Thêm click event cho các thumbnail
        album.forEach((photo, index) => {
            const thumb = document.getElementById(`weLoveThumb_${index}`);
            if (thumb) {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const slider = document.getElementById('weLoveLightboxSlider');
                    if (slider) {
                        slider.style.scrollBehavior = 'smooth';
                        slider.scrollLeft = index * window.innerWidth;
                        setTimeout(() => {
                            const sliderAgain = document.getElementById('weLoveLightboxSlider');
                            if (sliderAgain) sliderAgain.style.scrollBehavior = 'auto';
                        }, 300);
                    }
                });
            }
        });
    }

    // Reset trạng thái UI hiển thị
    window.isWeLoveLightboxUiVisible = true;
    updateLightboxUiVisibility(true);

    lightboxModal.style.display = 'flex';
    // Đảm bảo background đục ban đầu
    lightboxModal.style.background = 'rgba(0, 0, 0, 0.85)';
    document.body.classList.add('lightbox-open');
    document.documentElement.classList.add('lightbox-open');

    // Khóa cuộn nền triệt để
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Sự kiện tap nhẹ (single-tap) để ẩn/hiện UI
    const sliderContainer = document.getElementById('weLoveLightboxSliderContainer');
    if (sliderContainer) {
        const handleContainerClick = (e) => {
            if (currentLightboxScale && currentLightboxScale > 1) return;
            if (window.isWeLoveLightboxSwipingDown) return;
            
            const visible = !window.isWeLoveLightboxUiVisible;
            updateLightboxUiVisibility(visible);
        };
        // Sử dụng một cờ để tránh gán trùng
        if (!sliderContainer.dataset.hasClickEvent) {
            sliderContainer.addEventListener('click', handleContainerClick);
            sliderContainer.dataset.hasClickEvent = 'true';
        }
    }

    if (slider) {
        slider.style.scrollBehavior = 'auto';
        slider.scrollLeft = selectIndex * window.innerWidth;
    }

    updateSliderPhotos();

    document.addEventListener('touchmove', preventDefaultTouchMove, { passive: false });
}

export function closeWeLoveLightbox() {
    const lightboxModal = document.getElementById('weLoveLightboxModal');
    if (lightboxModal) {
        lightboxModal.style.display = 'none';
        document.body.classList.remove('lightbox-open');
        document.documentElement.classList.remove('lightbox-open');

        // Mở khóa cuộn nền
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';

        document.removeEventListener('touchmove', preventDefaultTouchMove, { passive: false });
    }
}
export function initWeLoveLightboxZoomAndDrag() {
    const slider = document.getElementById('weLoveLightboxSlider');
    const btnZoomIn = document.getElementById('btnWeLoveZoomIn');
    const btnZoomOut = document.getElementById('btnWeLoveZoomOut');
    const btnZoomReset = document.getElementById('btnWeLoveZoomReset');
    const zoomPercent = document.getElementById('weLoveZoomPercent');
    const btnLightboxPrev = document.getElementById('btnWeLoveLightboxPrev');
    const btnLightboxNext = document.getElementById('btnWeLoveLightboxNext');

    if (!slider) return;

    let scale = 1;
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    let maxDragX = 0;
    let maxDragY = 0;

    let initialPinchDistance = 0;
    let startScale = 1;
    let pinchCenterX = 0;
    let pinchCenterY = 0;

    let isTransitioning = false;

    let lastTouchTime = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let velocityX = 0;
    let velocityY = 0;
    let inertiaFrameId = null;

    // Các biến phụ trách kéo vuốt dọc đóng Lightbox
    let touchStartY = 0;
    let touchStartX = 0;
    let touchDeltaY = 0;

    function getActiveImg() {
        return document.getElementById(`weLoveLightboxImg_${state.activePhotoIndex}`);
    }

    function calculateDragBounds() {
        const activeImg = getActiveImg();
        if (!activeImg || scale <= 1) {
            maxDragX = 0;
            maxDragY = 0;
            return;
        }
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const imgWidth = activeImg.offsetWidth * scale;
        const imgHeight = activeImg.offsetHeight * scale;
        maxDragX = Math.max(0, (imgWidth - viewWidth) / 2) / scale;
        maxDragY = Math.max(0, (imgHeight - viewHeight) / 2) / scale;
    }

    function updateTransform(smooth = true) {
        const activeImg = getActiveImg();
        if (!activeImg) return;
        
        activeImg.style.transition = smooth ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
        
        // Cập nhật scale module level
        currentLightboxScale = scale;

        // Nếu scale lớn hơn 1, giới hạn biên kéo rê. Nếu co giãn đàn hồi (elastic) nhỏ hơn 1 hoặc lớn hơn 4, ta giữ nguyên transform kéo tạm thời
        if (scale > 1) {
            currentX = Math.max(-maxDragX, Math.min(maxDragX, currentX));
            currentY = Math.max(-maxDragY, Math.min(maxDragY, currentY));
        } else if (scale === 1) {
            currentX = 0;
            currentY = 0;
        }

        activeImg.style.transform = `translate3d(${currentX}px, ${currentY}px, 0px) scale(${scale})`;
        
        if (scale > 1) {
            activeImg.style.cursor = 'grab';
        } else {
            activeImg.style.cursor = 'zoom-in';
        }

        if (zoomPercent) {
            zoomPercent.textContent = `${Math.round(scale * 100)}%`;
        }

        if (scale > 1) {
            slider.style.overflowX = 'hidden';
        } else {
            slider.style.overflowX = 'auto';
        }
    }

    slider.addEventListener('wheel', (e) => {
        const activeImg = getActiveImg();
        if (!activeImg || isTransitioning) return;
        
        e.preventDefault(); 
        
        const rect = activeImg.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const oldScale = scale;
        const zoomStep = 0.15;
        
        if (e.deltaY < 0) {
            scale = Math.min(4, scale + zoomStep);
        } else {
            scale = Math.max(1, scale - zoomStep);
        }

        calculateDragBounds();

        if (scale > 1) {
            const factor = (scale / oldScale) - 1;
            currentX -= (mouseX - rect.width / 2) * factor / scale;
            currentY -= (mouseY - rect.height / 2) * factor / scale;
        } else {
            currentX = 0;
            currentY = 0;
        }

        updateTransform(false);
    }, { passive: false });

    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTransitioning) return;
            scale = Math.min(4, scale + 0.25);
            calculateDragBounds();
            updateTransform(true);
        });
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTransitioning) return;
            scale = Math.max(1, scale - 0.25);
            calculateDragBounds();
            updateTransform(true);
        });
    }

    if (btnZoomReset) {
        btnZoomReset.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTransitioning) return;
            scale = 1;
            currentX = 0;
            currentY = 0;
            updateTransform(true);
        });
    }

    slider.addEventListener('dblclick', (e) => {
        if (!e.target.classList.contains('we-love-lightbox-img') || isTransitioning) return;
        e.stopPropagation();
        
        const activeImg = getActiveImg();
        if (!activeImg) return;

        if (scale > 1) {
            scale = 1;
            currentX = 0;
            currentY = 0;
        } else {
            scale = 2.5;
            const rect = activeImg.getBoundingClientRect();
            const clickX = e.clientX - rect.left - rect.width / 2;
            const clickY = e.clientY - rect.top - rect.height / 2;
            calculateDragBounds();
            const factor = (scale - 1) / scale;
            currentX = -clickX * factor;
            currentY = -clickY * factor;
        }
        updateTransform(true);
    });

    let lastTap = 0;
    slider.addEventListener('touchstart', (e) => {
        if (!e.target.classList.contains('we-love-lightbox-img') || isTransitioning) return;
        
        if (e.touches.length === 1) {
            const now = Date.now();
            if (now - lastTap < 300) {
                e.preventDefault();
                const activeImg = getActiveImg();
                if (!activeImg) return;

                if (scale > 1) {
                    scale = 1;
                    currentX = 0;
                    currentY = 0;
                } else {
                    scale = 2.5;
                    const touch = e.touches[0];
                    const rect = activeImg.getBoundingClientRect();
                    const clickX = touch.clientX - rect.left - rect.width / 2;
                    const clickY = touch.clientY - rect.top - rect.height / 2;
                    calculateDragBounds();
                    const factor = (scale - 1) / scale;
                    currentX = -clickX * factor;
                    currentY = -clickY * factor;
                }
                updateTransform(true);
            }
            lastTap = now;
        }
    }, { passive: false });

    function dragStart(clientX, clientY) {
        if (scale <= 1 || isTransitioning) return;
        
        if (inertiaFrameId) {
            cancelAnimationFrame(inertiaFrameId);
            inertiaFrameId = null;
        }
        
        isDragging = true;
        calculateDragBounds();
        startX = clientX - currentX * scale;
        startY = clientY - currentY * scale;
        
        lastTouchTime = Date.now();
        lastTouchX = clientX;
        lastTouchY = clientY;
        velocityX = 0;
        velocityY = 0;
        
        const activeImg = getActiveImg();
        if (activeImg) activeImg.style.cursor = 'grabbing';
    }

    function dragMove(clientX, clientY) {
        if (!isDragging) return;
        
        const now = Date.now();
        const dt = now - lastTouchTime;
        if (dt > 0) {
            velocityX = ((clientX - lastTouchX) / scale) / dt;
            velocityY = ((clientY - lastTouchY) / scale) / dt;
        }
        lastTouchTime = now;
        lastTouchX = clientX;
        lastTouchY = clientY;
        
        currentX = (clientX - startX) / scale;
        currentY = (clientY - startY) / scale;
        updateTransform(false);
    }

    function runInertia() {
        if (inertiaFrameId) cancelAnimationFrame(inertiaFrameId);
        
        const friction = 0.94;
        let lastFrameTime = Date.now();
        
        function tick() {
            if (isDragging) return;
            const now = Date.now();
            let dt = now - lastFrameTime;
            if (dt > 100) dt = 16;
            lastFrameTime = now;
            
            currentX += velocityX * dt;
            currentY += velocityY * dt;
            
            velocityX *= friction;
            velocityY *= friction;
            
            calculateDragBounds();
            
            if (currentX < -maxDragX || currentX > maxDragX) {
                velocityX = 0;
                currentX = Math.max(-maxDragX, Math.min(maxDragX, currentX));
            }
            if (currentY < -maxDragY || currentY > maxDragY) {
                velocityY = 0;
                currentY = Math.max(-maxDragY, Math.min(maxDragY, currentY));
            }
            
            updateTransform(false);
            
            const speed = Math.hypot(velocityX, velocityY);
            if (speed > 0.005 && !isDragging) {
                inertiaFrameId = requestAnimationFrame(tick);
            } else {
                updateTransform(true);
            }
        }
        
        inertiaFrameId = requestAnimationFrame(tick);
    }

    function dragEnd() {
        if (!isDragging) return;
        isDragging = false;
        
        const activeImg = getActiveImg();
        if (activeImg) activeImg.style.cursor = 'grab';
        
        const speed = Math.hypot(velocityX, velocityY);
        if (speed > 0.03) {
            runInertia();
        } else {
            updateTransform(true);
        }
    }

    slider.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || !e.target.classList.contains('we-love-lightbox-img')) return;
        e.preventDefault();
        dragStart(e.clientX, e.clientY);
    });

    window.addEventListener('mousemove', (e) => {
        dragMove(e.clientX, e.clientY);
    });

    window.addEventListener('mouseup', () => {
        dragEnd();
    });

    slider.addEventListener('touchstart', (e) => {
        if (!e.target.classList.contains('we-love-lightbox-img') || isTransitioning) return;
        
        if (e.touches.length === 2) {
            isDragging = false;
            window.isWeLoveLightboxSwipingDown = false;
            initialPinchDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            startScale = scale;

            const rect = e.target.getBoundingClientRect();
            const touch0X = e.touches[0].clientX;
            const touch0Y = e.touches[0].clientY;
            const touch1X = e.touches[1].clientX;
            const touch1Y = e.touches[1].clientY;
            const clientCenterX = (touch0X + touch1X) / 2;
            const clientCenterY = (touch0Y + touch1Y) / 2;
            
            const imgCenterX = rect.left + rect.width / 2;
            const imgCenterY = rect.top + rect.height / 2;
            
            pinchCenterX = (clientCenterX - imgCenterX) / scale;
            pinchCenterY = (clientCenterY - imgCenterY) / scale;
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchDeltaY = 0;
            window.isWeLoveLightboxSwipingDown = false;
            
            if (scale > 1) {
                dragStart(touch.clientX, touch.clientY);
            }
        }
    }, { passive: true });

    slider.addEventListener('touchmove', (e) => {
        if (isTransitioning || !e.target.classList.contains('we-love-lightbox-img')) return;

        if (e.touches.length === 2 && initialPinchDistance > 0) {
            e.preventDefault(); 
            
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const ratio = currentDistance / initialPinchDistance;
            const oldScale = scale;
            
            // Lực cản đàn hồi (Elastic Zoom)
            const rawScale = startScale * ratio;
            if (rawScale < 1) {
                scale = 1 - (1 - rawScale) * 0.45;
            } else if (rawScale > 4) {
                scale = 4 + (rawScale - 4) * 0.45;
            } else {
                scale = rawScale;
            }

            calculateDragBounds();

            if (scale > 1) {
                const deltaScale = scale - oldScale;
                currentX -= pinchCenterX * deltaScale;
                currentY -= pinchCenterY * deltaScale;
            } else {
                currentX = 0;
                currentY = 0;
            }

            updateTransform(false);
        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            
            if (scale > 1) {
                if (isDragging) {
                    e.preventDefault();
                    dragMove(touch.clientX, touch.clientY);
                }
            } else if (scale === 1) {
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                
                if (window.isWeLoveLightboxSwipingDown) {
                    e.preventDefault();
                    touchDeltaY = deltaY;
                    
                    const activeImg = getActiveImg();
                    if (activeImg) {
                        activeImg.style.transition = 'none';
                        activeImg.style.transform = `translate3d(0px, ${deltaY}px, 0px) scale(1)`;
                    }
                    
                    const lightboxModal = document.getElementById('weLoveLightboxModal');
                    if (lightboxModal) {
                        const opacity = Math.max(0.1, 0.85 - Math.abs(deltaY) / 600);
                        lightboxModal.style.background = `rgba(0, 0, 0, ${opacity})`;
                        const blurPx = Math.max(0, 15 - Math.abs(deltaY) / 20);
                        lightboxModal.style.backdropFilter = `blur(${blurPx}px)`;
                        lightboxModal.style.webkitBackdropFilter = `blur(${blurPx}px)`;
                    }
                } else {
                    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 8) {
                        window.isWeLoveLightboxSwipingDown = true;
                        slider.style.overflowX = 'hidden';
                    }
                }
            }
        }
    }, { passive: false });

    slider.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            initialPinchDistance = 0;
        }

        // Hồi vị đàn hồi (Bounce zoom)
        if (scale < 1) {
            scale = 1;
            currentX = 0;
            currentY = 0;
            updateTransform(true);
        } else if (scale > 4) {
            scale = 4;
            calculateDragBounds();
            updateTransform(true);
        }

        // Đàn hồi / Đóng khi vuốt dọc
        if (window.isWeLoveLightboxSwipingDown) {
            window.isWeLoveLightboxSwipingDown = false;
            slider.style.overflowX = 'auto';
            
            const activeImg = getActiveImg();
            const lightboxModal = document.getElementById('weLoveLightboxModal');
            
            if (Math.abs(touchDeltaY) > 100) {
                // Trượt bay đi và đóng
                if (activeImg) {
                    activeImg.style.transition = 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    activeImg.style.transform = `translate3d(0px, ${touchDeltaY > 0 ? 1000 : -1000}px, 0px) scale(0.65)`;
                }
                if (lightboxModal) {
                    lightboxModal.style.transition = 'background 0.25s, opacity 0.25s';
                    lightboxModal.style.background = 'rgba(0, 0, 0, 0)';
                    lightboxModal.style.backdropFilter = 'blur(0px)';
                    lightboxModal.style.webkitBackdropFilter = 'blur(0px)';
                }
                setTimeout(() => {
                    closeWeLoveLightbox();
                }, 220);
            } else {
                // Hồi vị đàn hồi về giữa
                if (activeImg) {
                    activeImg.style.transition = 'transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    activeImg.style.transform = 'translate3d(0px, 0px, 0px) scale(1)';
                }
                if (lightboxModal) {
                    lightboxModal.style.transition = 'background 0.22s';
                    lightboxModal.style.background = 'rgba(0, 0, 0, 0.85)';
                    lightboxModal.style.backdropFilter = 'blur(15px)';
                    lightboxModal.style.webkitBackdropFilter = 'blur(15px)';
                }
            }
        }

        if (scale > 1 && !window.isWeLoveLightboxSwipingDown) {
            dragEnd();
        }
    }, { passive: true });

    // Bấm nút Prev/Next trên Lightbox (chỉ hiện trên màn hình có chuột/desktop)

    // Tự động cập nhật active index và dải thumbnail khi cuộn ngang slider (vuốt ngang bằng tay hoặc click)
    slider.addEventListener('scroll', () => {
        if (scale > 1) return; // Không xử lý khi đang zoom ảnh
        
        const scrollLeft = slider.scrollLeft;
        const width = window.innerWidth;
        if (width <= 0) return;
        const newIndex = Math.round(scrollLeft / width);
        
        const album = state.weLovePhotoAlbum || [];
        if (newIndex >= 0 && newIndex < album.length && newIndex !== state.activePhotoIndex) {
            state.activePhotoIndex = newIndex;
            updateSliderPhotos();
        }
    });

    // Bấm nút Prev/Next trên Lightbox (chỉ hiện trên màn hình có chuột/desktop)
    if (btnLightboxPrev) {
        btnLightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTransitioning) return;
            const album = state.weLovePhotoAlbum || [];
            if (album.length <= 1) return;
            
            isTransitioning = true;
            scale = 1;
            currentX = 0;
            currentY = 0;
            updateTransform(true); // Trở về zoom 1x mượt mà trước khi chuyển
            
            const prevIndex = (state.activePhotoIndex - 1 + album.length) % album.length;
            slider.scrollTo({ left: prevIndex * window.innerWidth, behavior: 'smooth' });
            
            setTimeout(() => {
                isTransitioning = false;
            }, 300);
        });
    }

    if (btnLightboxNext) {
        btnLightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            if (isTransitioning) return;
            const album = state.weLovePhotoAlbum || [];
            if (album.length <= 1) return;
            
            isTransitioning = true;
            scale = 1;
            currentX = 0;
            currentY = 0;
            updateTransform(true);
            
            const nextIndex = (state.activePhotoIndex + 1) % album.length;
            slider.scrollTo({ left: nextIndex * window.innerWidth, behavior: 'smooth' });
            
            setTimeout(() => {
                isTransitioning = false;
            }, 300);
        });
    }

    // Phím tắt bàn phím máy tính
    const handleKeyDown = (e) => {
        const lightboxModal = document.getElementById('weLoveLightboxModal');
        if (lightboxModal && lightboxModal.style.display !== 'none') {
            if (e.key === 'ArrowLeft') {
                btnLightboxPrev?.click();
            } else if (e.key === 'ArrowRight') {
                btnLightboxNext?.click();
            } else if (e.key === 'Escape') {
                closeWeLoveLightbox();
            }
        }
    };
    window.removeEventListener('keydown', handleKeyDown); // Tránh leak event listeners trùng lặp
    window.addEventListener('keydown', handleKeyDown);

    window.closeWeLoveLightbox = function() {
        scale = 1;
        currentX = 0;
        currentY = 0;
        updateTransform(false);
        closeWeLoveLightbox();
    };
    
    window.openWeLoveLightbox = function(url, caption) {
        scale = 1;
        currentX = 0;
        currentY = 0;
        updateTransform(false);
        openWeLoveLightbox(url, caption);
    };
}





