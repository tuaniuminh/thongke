// src/features/we-love/we-love.js - WeLove Couple Memory Corner Module
import { 
    state, saveLocalState, showToast, performSync
} from '../../core/app.js?v=4.3.01';
import * as sync from '../../core/sync.js?v=4.3.01';
import { encrypt, decrypt } from '../../core/crypto.js?v=4.3.01';
import { updateSidebarNavVisibility } from '../thu-chi-doi-ngoai/thu-chi.js?v=4.3.01';

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
    cn: "只要有nước陪伴，每天 đều là晴天。",
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
        weLoveAudio = new Audio('./mot-doi.mp3?v=4.3.01');
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
        const logoPath = './logo_pwa_small.png?v=4.3.01';
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
    
    const logoPath = './logo_pwa_small.png?v=4.3.01';
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
    // Tự động đồng bộ từ quỹ chung nếu có kết nối
    if (typeof window.checkForSharedFamilyFund === 'function') {
        await window.checkForSharedFamilyFund();
    }

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

    // 3. Process Visit Logs
    if (!state.weLoveVisitLogs) state.weLoveVisitLogs = [];
    visitLogs = state.weLoveVisitLogs || [];
    visitLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    updateSyncStatusBadge();
}

// Log a visit by the current logged in user (if they are the guest/spouse)
export async function logSpouseVisit() {
    const user = await sync.getCurrentUser();
    if (!user) return;
    
    // Kiểm tra chính xác vai trò dựa trên việc liên kết quỹ chung và dòng dữ liệu nguồn
    // Nếu viewingSharedFund = true và sharedFundSourceRow !== null thì đây là tài khoản Vợ (Guest)
    const isSpouse = state.viewingSharedFund && state.sharedFundSourceRow !== null;
    const isAdmin = !isSpouse;
    if (!isAdmin) {
        const visitLogged = sessionStorage.getItem('we_love_visit_logged');
        const hasNoLogs = !state.weLoveVisitLogs || state.weLoveVisitLogs.length === 0;
        
        if (!visitLogged || hasNoLogs) {
            sessionStorage.setItem('we_love_visit_logged', 'true');
            
            const newVisit = {
                id: Math.random().toString(36).substring(2, 10),
                email: user.email,
                timestamp: new Date().toISOString(),
                deviceInfo: parseDeviceFromUA(navigator.userAgent || 'Web Browser')
            };
            
            if (!state.weLoveVisitLogs) state.weLoveVisitLogs = [];
            state.weLoveVisitLogs.unshift(newVisit);
            state.weLoveVisitLogsUpdated = new Date().toISOString();
            await saveLocalState();
            
            if (sync.isConfigured() && state.user) {
                performSync(true);
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
    const statsContainer = document.getElementById('weLoveVisitStats');
    const logsContainer = document.getElementById('weLoveVisitLogsTimeline');
    if (!logsContainer) return;

    const stats = {};
    visitLogs.forEach(log => {
        const dateObj = new Date(log.timestamp);
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
            <div class="welove-log-item" style="padding: 0.8rem 1rem; margin-bottom: 0.5rem; min-height: auto; gap: 0.75rem;">
                <div class="welove-log-icon" style="width: 38px; height: 38px; font-size: 1.2rem; padding: 0; display: flex; align-items: center; justify-content: center;">
                    ${isMobile ? '📱' : '💻'}
                </div>
                <div class="welove-log-content" style="display: flex; flex-direction: column; gap: 2px; width: 100%;">
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
    const canEdit = !isSpouseRole && (isLocal || state.user !== null);
    const showSickness = state.weLoveShowSickness !== false;
    const isAdmin = !isSpouseRole; // Admin chính là người chồng (hoặc tài khoản độc lập)

    tabContainer.innerHTML = `
        <div class="memory-page" id="weLovePage">

            <!-- Couple Names Header under Navbar -->
            <div class="couple-names-header" style="display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 1.5rem; margin-top: 0.5rem; width: 100%; z-index: 5;">
                <span class="partner-name">${escapeHTML(state.weLoveName1 || 'Anh')}</span>
                <span class="pulsing-heart-red" style="font-size: 2.2rem; display: inline-block; filter: drop-shadow(0 0 6px rgba(239, 68, 68, 0.6)); line-height: 1;">❤️</span>
                <span class="partner-name">${escapeHTML(state.weLoveName2 || 'Em')}</span>
            </div>

            ${weLoveCurrentSubView === 'admin' && canEdit ? `
                <!-- ADMIN SUBVIEW -->
                <div style="display: flex; flex-direction: column; gap: 2rem; width: 100%; align-items: center; max-width: 580px; margin: 0 auto; z-index: 5;">
                    
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
                                <input type="text" class="welove-input" id="remTitleInput" placeholder="Ví dụ: Lời nhắc từ anh Tuấn ❤️, Chú ý em iu ơi! 🥤" required>
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

                    <!-- Nhật ký truy cập của em yêu -->
                    ${isAdmin ? `
                    <div class="welove-card" style="margin-top: 0; width: 100%;">
                        <div class="welove-title-box" style="border-bottom: 1px solid var(--border-color); padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center; width: 100%;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-size: 1.8rem;">📊</span>
                                <h3 class="welove-title" style="margin: 0;">Nhật Ký Truy Cập Của Nửa Kia</h3>
                            </div>
                            <button id="btnWeLoveClearVisitLogs" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.05); color: #ef4444; cursor: pointer; display: flex; align-items: center; gap: 4px;" title="Xóa toàn bộ lịch sử truy cập">
                                🗑️ Xóa lịch sử
                            </button>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 1.5rem; font-weight: 600;">
                            Đang theo dõi email: <span style="color: var(--accent-rose);">${state.spouseEmail || 'chưa liên kết'}</span>
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
                        <div class="welove-timeline" id="weLoveVisitLogsTimeline" style="max-height: 280px;">
                            <!-- populated by JS -->
                        </div>
                    </div>
                    ` : ''}

                </div>
            ` : weLoveCurrentSubView === 'settings' && canEdit ? `
                <!-- CONFIG / SETTINGS SUBVIEW -->
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

                            <!-- 2.5. Tự động phát nhạc nền -->
                            <div class="welove-form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                                <div>
                                    <label class="welove-form-label" style="font-weight: 700; margin-bottom: 2px; display: block;">🎵 Tự động phát nhạc nền</label>
                                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Tự động phát nhạc nền khi click/chạm vào màn hình</span>
                                </div>
                                <label class="switch-toggle" style="margin-left: 10px;">
                                    <input type="checkbox" id="weLoveAutoplayInput" ${state.weLoveAutoplay === true ? 'checked' : ''}>
                                    <span class="slider-round"></span>
                                </label>
                            </div>

                            <!-- 3. Bật tắt theo dõi lượt ốm -->
                            <div class="welove-form-group" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color); margin-bottom: 1.5rem;">
                                <div>
                                    <label class="welove-form-label" style="font-weight: 700; margin-bottom: 2px; display: block;">🩺 Theo dõi Sổ tay sức khỏe em yêu</label>
                                    <span style="font-size: 0.75rem; color: var(--text-secondary);">Ẩn hoặc hiện biểu đồ, lịch sử đợt ốm trong tab Kỷ niệm</span>
                                </div>
                                <label class="switch-toggle" style="margin-left: 10px;">
                                    <input type="checkbox" id="weLoveShowSicknessInput" ${state.weLoveShowSickness !== false ? 'checked' : ''}>
                                    <span class="slider-round"></span>
                                </label>
                            </div>



                            <button type="submit" class="welove-btn welove-btn-primary" style="width: 100%;">
                                Lưu Cấu Hình 💾
                            </button>
                        </form>
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
                    <p class="memory-subtitle">Hành trình gieo bình yên, hái hạnh phúc</p>
                    
                    <div class="days-counter-box">
                        <div class="days-number" id="weLoveDaysCountVal">${state.weLoveStartDate ? loveDaysCount : '?'}</div>
                        <div class="days-label">Ngày bên nhau</div>
                    </div>

                    <div class="milestone-date" style="${!state.weLoveStartDate ? 'color: var(--accent-rose); font-weight: 700;' : ''}">
                        ${state.weLoveStartDate ? `📅 Cột mốc khởi đầu: ${formatDateDisplay(state.weLoveStartDate)}` : '⚠️ Chưa thiết lập ngày bắt đầu yêu. Vui lòng chọn trong phần Thiết lập!'}
                    </div>

                    <!-- Quotes board -->
                    <div class="quote-container" id="weLoveQuoteContainer" style="cursor: grab;" title="Nhập nút hoặc vuốt câu nói để chuyển câu">
                        <button class="quote-nav-btn prev" id="btnWeLovePrevQuote">‹</button>
                        <div class="quote-text-wrapper">
                            <div class="quote-chinese">${LOVE_QUOTES[currentQuoteIdx].cn}</div>
                            <div class="quote-vietnamese">${LOVE_QUOTES[currentQuoteIdx].vi}</div>
                        </div>
                        <button class="quote-nav-btn next" id="btnWeLoveNextQuote">›</button>
                    </div>
                </div>

                <!-- Sổ tay sức khỏe em iu (Conditional show/hide) -->
                ${showSickness ? `
                    <div class="welove-card">
                        <div class="welove-title-box">
                            <span style="font-size: 1.8rem;">🩺</span>
                            <h3 class="welove-title">Sổ Tay Sức Khỏe Của Em Iu</h3>
                        </div>
                        <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0; line-height: 1.4;">
                            Thống kê đợt ốm qua các năm của em iu và lời dặn dỗ yêu thương từ anh đẹp trai
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
                ` : ''}
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
    `;

    // Initialize media metadata
    initMediaSession();



    // Load data and bind events
    await fetchWeLoveData();
    
    // Ngăn chặn race condition nếu người dùng chuyển tab nhanh trước khi API trả về xong
    if (state.activeTab !== renderingTab) {
        console.warn(`[WeLove] Render race condition aborted: ${renderingTab} -> ${state.activeTab}`);
        return;
    }

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

    const heartPulse = document.getElementById('weLovePulsingHeart');
    if (heartPulse) {
        heartPulse.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            showToast(`Gửi ngàn trái tim yêu thương gửi đến ${state.weLoveName2 || 'nửa kia'} xinh đẹp! 💕`);
        });
    }

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

    const btnClearLogs = document.getElementById('btnWeLoveClearVisitLogs');
    if (btnClearLogs) {
        btnClearLogs.addEventListener('click', async () => {
            const ok = confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử truy cập của nửa kia? 🗑️");
            if (!ok) return;

            state.weLoveVisitLogs = [];
            state.weLoveVisitLogsUpdated = new Date().toISOString();
            await saveLocalState();

            if (sync.isConfigured() && state.user) {
                performSync(true);
            }

            visitLogs = [];
            renderVisitLogs();
            showToast("Đã xóa toàn bộ lịch sử truy cập 🧹");
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
    const btnUnlink = document.getElementById('btnWeLoveUnlinkPartner');

    if (startDateInput) {
        // Date placeholder trick: toggle input type dynamically
        const updateDateType = () => {
            if (!startDateInput.value) {
                startDateInput.type = 'text';
                startDateInput.placeholder = 'Ngày/tháng/năm';
            } else {
                startDateInput.type = 'date';
            }
        };
        updateDateType();
        startDateInput.addEventListener('focus', () => {
            startDateInput.type = 'date';
        });
        startDateInput.addEventListener('blur', () => {
            updateDateType();
        });
    }

    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name1 = name1Input.value.trim();
            const name2 = name2Input.value.trim();
            const startDate = startDateInput.value;
            const showSickness = showSicknessInput.checked;
            const weLoveAutoplay = autoplayInput ? autoplayInput.checked : false;

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

            await saveLocalState();
            
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
let _pairingInterval = null;

export function renderFamilyPairingSettings() {
    const container = document.getElementById('familyPairingConfigView');
    if (!container) return;

    if (state.spouseEmail) {
        // ---- ĐÃ KẾT NỐI ----
        const roleLabel = state.viewingSharedFund ? '💕 Vợ (Spouse)' : '👑 Chồng (Admin)';
        const statusLabel = state.spouseStatus === 'accepted' ? '✅ Đã liên kết' : '⏳ Đang chờ đối phương';
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="background: var(--bg-secondary); border-radius: 12px; padding: 14px; border: 1px solid var(--border-color);">
                    <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: var(--text-secondary);">Đang kết nối với:</p>
                    <p style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 700; color: var(--accent-rose); word-break: break-all;">${escapeHTML(state.spouseEmail)}</p>
                    <p style="margin: 0; font-size: 0.75rem; color: var(--text-secondary);">Vai trò của bạn: <strong>${roleLabel}</strong> &nbsp;|&nbsp; ${statusLabel}</p>
                </div>
                <button class="btn btn-outline w-full" id="btnFamilyPairingUnlink" style="border-color: #ef4444; color: #ef4444; font-weight: 700; padding: 10px; border-radius: 10px;">
                    🔗 Hủy kết nối
                </button>
            </div>`;

        document.getElementById('btnFamilyPairingUnlink')?.addEventListener('click', async () => {
            const confirmed = await window.showConfirm("Bạn có chắc chắn muốn hủy liên kết với bạn tình hiện tại không? 🥺");
            if (!confirmed) return;

            const confirmPassword = await window.showPrompt("Để hủy kết nối vợ chồng, vui lòng xác nhận mật khẩu Master (hoặc mã PIN):");
            if (confirmPassword === null) return;
            
            if (confirmPassword !== state.masterPassword) {
                showToast("Mật khẩu Master không chính xác. Hủy bỏ hủy kết nối!", "error");
                return;
            }

            // Bước 1: Báo hiệu đối phương bằng cách đẩy trạng thái 'left' lên Supabase trước
            state.spouseStatus = 'left';
            await saveLocalState();
            if (sync.isConfigured() && state.user) {
                try { await performSync(true); } catch (e) { console.error("[Unlink] notify remote failed:", e); }
            }

            // Bước 2: Dọn sạch local
            state.spouseEmail = '';
            state.spouseStatus = '';
            state.spouseRole = 'wife';
            state.pairingCode = '';
            state.pairingCodeExpired = '';
            state.pairingFundKeyEncrypted = '';
            state.familyFundInviteStatus = '';
            state.viewingSharedFund = false;
            state.sharedFundOwnerEmail = '';
            state.sharedFundSourceRow = null;
            await saveLocalState();

            showToast("Đã hủy kết nối gia đình.");
            renderFamilyPairingSettings();
            if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
        });

    } else {
        // ---- CHƯA KẾT NỐI ----
        const isPairingActive = state.pairingCode && state.pairingCodeExpired && (new Date(state.pairingCodeExpired).getTime() > Date.now());
        const codeDisplay = isPairingActive ? `
            <div id="fpPairingCodeDisplayContainer" style="display: flex; align-items: center; gap: 8px; margin-top: 10px;">
                <span id="fpPairingCodeVal" style="font-size: 1.15rem; font-weight: 800; letter-spacing: 1.5px; color: var(--accent-rose); background: var(--bg-secondary); padding: 5px 14px; border-radius: 8px; border: 1px solid var(--border-color);">${escapeHTML(state.pairingCode)}</span>
                <button class="btn" id="btnFPCopyCode" style="font-size: 0.75rem; padding: 6px 10px; border-radius: 8px; background: var(--bg-secondary); border: 1px solid var(--border-color);" title="Sao chép mã">📋 Copy</button>
            </div>
            <div id="fpPairingCodeTimer" style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 5px; text-align: right;"></div>
        ` : '';

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 12px;">

                <!-- KHỐI 1: TẠO MÃ (Chồng) -->
                <div style="background: rgba(225, 29, 72, 0.04); padding: 14px; border-radius: 12px; border: 1px dashed var(--accent-rose);">
                    <p style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">1. Tạo mã ghép đôi (Dành cho Chồng):</p>
                    <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0 0 10px 0;">Sinh mã 6 số ngẫu nhiên, có hiệu lực 10 phút. Gửi mã này cho vợ để hoàn tất kết nối.</p>
                    <button class="btn btn-primary" id="btnFPGenerateCode" style="font-size: 0.82rem; padding: 9px 18px; background: linear-gradient(135deg, #e11d48, #be123c); border: none; border-radius: 10px; font-weight: 700; color: white;">
                        ${isPairingActive ? '🔄 Tạo mã mới' : '💞 Tạo mã ghép đôi'}
                    </button>
                    ${codeDisplay}
                </div>

                <!-- KHỐI 2: NHẬP MÃ (Vợ) -->
                <div style="background: var(--bg-secondary); padding: 14px; border-radius: 12px; border: 1px solid var(--border-color);">
                    <p style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">2. Nhập mã ghép đôi (Dành cho Vợ):</p>
                    <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0 0 10px 0;">Nhập mã chồng đã gửi để hoàn thành kết nối 2 chiều và mở khóa Quỹ chung & Góc tình yêu.</p>
                    <div style="display: flex; gap: 8px;">
                        <input type="text" id="fpPairingCodeInput" placeholder="Ví dụ: LOVE-123456" style="flex-grow: 1; min-width: 0; padding: 8px 12px; font-size: 0.88rem; text-transform: uppercase; font-weight: 700; text-align: center; letter-spacing: 1px; border-radius: 10px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);">
                        <button class="btn btn-primary" id="btnFPSubmitCode" style="font-size: 0.82rem; padding: 0 16px; background: #059669; border: none; border-radius: 10px; font-weight: 700; color: white; white-space: nowrap;">
                            Kết nối
                        </button>
                    </div>
                </div>

            </div>`;

        // Bắt đầu đồng hồ đếm ngược nếu mã đang hoạt động
        if (isPairingActive) _startFPTimer();

        // Handler: Tạo mã
        document.getElementById('btnFPGenerateCode')?.addEventListener('click', async () => {
            const _sb = window._getSupabaseClient?.();
            if (!_sb) {
                showToast("Bạn cần cấu hình và kết nối Supabase trước!", "warning");
                return;
            }
            const codeNum = Math.floor(100000 + Math.random() * 900000);
            const pairingCode = `LOVE-${codeNum}`;
            try {
                if (!state.fundSymmetricKey) {
                    const raw = window.crypto.getRandomValues(new Uint8Array(32));
                    state.fundSymmetricKey = Array.from(raw).map(b => b.toString(16).padStart(2, '0')).join('');
                    await saveLocalState();
                }
                const encryptedKey = await encrypt(state.fundSymmetricKey, pairingCode);
                state.pairingCode = pairingCode;
                state.pairingCodeExpired = new Date(Date.now() + 10 * 60 * 1000).toISOString();
                state.pairingFundKeyEncrypted = encryptedKey;
                await saveLocalState();
                console.log("[Generate Debug] Before sync: pairingCode =", state.pairingCode);
                showToast("Đang tải mã lên máy chủ...", "info");
                await performSync(true);
                console.log("[Generate Debug] After sync: pairingCode =", state.pairingCode);
                showToast("Đã tạo mã ghép đôi! Gửi cho vợ nhé. ❤️");
                renderFamilyPairingSettings();
            } catch (err) {
                console.error("Failed to generate pairing code:", err.message, err.stack);
                showToast("Không thể tạo mã: " + err.message, "error");
            }
        });

        // Handler: Copy mã
        document.getElementById('btnFPCopyCode')?.addEventListener('click', () => {
            if (!state.pairingCode) return;
            navigator.clipboard.writeText(state.pairingCode)
                .then(() => showToast("Đã sao chép mã!"))
                .catch(() => showToast("Không thể sao chép, copy thủ công nhé."));
        });

        // Handler: Nhập mã và kết nối
        const btnSubmit = document.getElementById('btnFPSubmitCode');
        const inputCode = document.getElementById('fpPairingCodeInput');
        btnSubmit?.addEventListener('click', async () => {
            const _sbClient = window._getSupabaseClient?.();
            if (!_sbClient) {
                showToast("Bạn cần cấu hình và kết nối Supabase trước!", "warning");
                return;
            }
            const code = (inputCode?.value || '').trim().toUpperCase();
            if (!code.startsWith('LOVE-') || code.length < 10) {
                showToast("Mã không đúng định dạng! (Ví dụ: LOVE-123456)", "warning");
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.innerText = "Đang kết nối...";
            try {
                // Giải pháp tối ưu: Tải toàn bộ dòng của gift_sync và lọc khớp mã E2EE trong JS (không phụ thuộc vào format JSON của DB)
                const { data: allRows, error } = await _sbClient
                    .from('gift_sync')
                    .select('user_id, encrypted_data, user_email, public_key');

                if (error) throw new Error("Lỗi kết nối máy chủ: " + error.message);
                
                let matchingRow = null;
                let parsed = null;
                
                if (allRows) {
                    console.log(`[Pairing Debug] Scanned ${allRows.length} rows to find code: ${code}`);
                    for (const row of allRows) {
                        console.log(`[Pairing Debug] Inspecting Row email: ${row.user_email}`);
                        try {
                            let p = null;
                            if (typeof row.encrypted_data === 'object' && row.encrypted_data !== null) {
                                p = row.encrypted_data;
                            } else {
                                p = JSON.parse(row.encrypted_data);
                            }
                            
                            const rowCode = (p?.pairing_code || '').trim().toUpperCase();
                            console.log(`[Pairing Debug] -> Parse Success. Code: ${rowCode}`);
                            if (p && rowCode === code) {
                                matchingRow = row;
                                parsed = p;
                                break;
                            }
                        } catch (e) {
                            console.warn(`[Pairing Debug] -> Failed to parse row data for ${row.user_email}:`, e.message);
                        }
                    }
                }

                if (!matchingRow || !parsed) {
                    throw new Error("Không tìm thấy mã! Hãy kiểm tra lại mã hoặc nhờ chồng tạo mã mới (mã chỉ có hiệu lực trong 10 phút).");
                }

                const data = matchingRow;

                const husbandEmail = (data.user_email || '').toLowerCase().trim();
                const myEmail = (state.user?.email || state.userEmail || '').toLowerCase().trim();
                if (myEmail && husbandEmail === myEmail) throw new Error("Bạn không thể tự ghép đôi với chính mình!");

                // parsed đã được gán và kiểm tra ở trên rồi
                if (!parsed?.pairing_code_expired || !parsed?.pairing_fund_key_encrypted) throw new Error("Mã ghép đôi không hợp lệ!");
                if (new Date(parsed.pairing_code_expired).getTime() < Date.now()) throw new Error("Mã đã hết hạn! Nhờ chồng tạo mã mới nhé.");

                showToast("Đang giải mã E2EE...", "info");
                let decryptedFundKey = '';
                try {
                    decryptedFundKey = await decrypt(parsed.pairing_fund_key_encrypted, code);
                } catch (e) {
                    throw new Error("Giải mã thất bại! Kiểm tra lại mã số.");
                }
                if (!decryptedFundKey) throw new Error("Mã không đúng hoặc khóa rỗng!");

                // Cập nhật state: Vợ (wife) - chỉ xem WeLove, có quyền ghi Quỹ chung
                state.fundSymmetricKey = decryptedFundKey;
                state.spouseEmail = husbandEmail;
                state.spouseStatus = 'accepted';
                state.spouseRole = 'wife';
                state.familyFundInviteStatus = 'accepted';
                state.viewingSharedFund = true;
                state.sharedFundOwnerEmail = husbandEmail;
                state.sharedFundSourceRow = {
                    user_id: data.user_id,
                    encrypted_data: data.encrypted_data,
                    encrypted_personal: parsed.encrypted_personal || '',
                    fund_shared_keys: parsed.fund_shared_keys || {},
                    owner_email: parsed.owner_email || husbandEmail,
                    spouse_email: parsed.spouse_email || '',
                    google_sheets_webhook: parsed.google_sheets_webhook || ''
                };
                await saveLocalState();
                showToast("Kết nối gia đình thành công! ❤️");
                await performSync(true);
                renderFamilyPairingSettings();
                if (typeof window.renderWeLoveDashboard === 'function') window.renderWeLoveDashboard();
                if (typeof window.updateHomeLayoutUI === 'function') window.updateHomeLayoutUI();
            } catch (err) {
                console.error("Pairing failed error message:", err.message);
                console.error("Pairing failed stack trace:", err.stack);
                showToast(err.message || "Kết nối thất bại!", "error");
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerText = "Kết nối";
            }
        });
    }
}

function _startFPTimer() {
    if (_pairingInterval) clearInterval(_pairingInterval);
    const timerEl = document.getElementById('fpPairingCodeTimer');
    const valEl = document.getElementById('fpPairingCodeVal');
    if (!timerEl || !state.pairingCode || !state.pairingCodeExpired) return;
    const update = () => {
        const diff = new Date(state.pairingCodeExpired).getTime() - Date.now();
        if (diff <= 0) {
            clearInterval(_pairingInterval);
            state.pairingCode = '';
            state.pairingCodeExpired = '';
            state.pairingFundKeyEncrypted = '';
            saveLocalState();
            renderFamilyPairingSettings();
            return;
        }
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        if (timerEl) timerEl.innerText = `Mã hết hạn sau: ${m}:${s.toString().padStart(2, '0')}`;
        if (valEl) valEl.innerText = state.pairingCode;
    };
    update();
    _pairingInterval = setInterval(update, 1000);
}

// Expose globally for app.js switchTab to call
window.renderFamilyPairingSettings = renderFamilyPairingSettings;


