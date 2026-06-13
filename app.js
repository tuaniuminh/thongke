// app.js - Main Application Logic & UI Control
import { encrypt, decrypt } from './crypto.js';
import * as sync from './sync.js';

// --- Supabase Config via GitHub Build (Secrets Injection) ---
const BUILD_SUPABASE_URL = 'VITE_SUPABASE_URL_PLACEHOLDER';
const BUILD_SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY_PLACEHOLDER';

// Helper to check and retrieve Supabase connection credentials
function getSupabaseConfig() {
    if (localStorage.getItem('supabase_disabled') === 'true') {
        return { url: null, key: null, source: 'none' };
    }
    
    const localUrl = localStorage.getItem('supabase_url');
    const localKey = localStorage.getItem('supabase_key');
    
    // If user manually configured settings locally, prioritize them
    if (localUrl && localKey) {
        return { url: localUrl, key: localKey, source: 'local' };
    }
    
    // Otherwise, check if build placeholders were replaced during deployment
    const buildUrlVal = BUILD_SUPABASE_URL;
    const buildKeyVal = BUILD_SUPABASE_ANON_KEY;
    
    if (buildUrlVal && !buildUrlVal.includes('PLACEHOLDER') && 
        buildKeyVal && !buildKeyVal.includes('PLACEHOLDER')) {
        return { url: buildUrlVal, key: buildKeyVal, source: 'build' };
    }
    
    return { url: null, key: null, source: 'none' };
}




// --- State Variables ---
let state = {
    masterPassword: '',
    receivedGifts: [],
    sentGifts: [],
    lastResetTime: '',
    showImportNotesOption: false,
    showImportNotesOptionUpdated: '',
    activeTab: 'dashboard',
    theme: 'dark',
    mobileViewMode: 'cards',
    user: null,
    
    // Pagination & Search state
    receivedSearch: '',
    receivedFilterRelation: '',
    receivedFilterStatus: '',
    receivedFilterEvent: '',
    receivedPage: 1,
    receivedLimit: 10,
    receivedEditMode: false,

    sentSearch: '',
    sentFilterType: '',
    sentFilterRelation: '',
    sentPage: 1,
    sentLimit: 10,
    sentEditMode: false
};

// Chart.js instances
let relationshipChart = null;
let eventTypeChart = null;

// PIN Code state buffers
let wizardPinBuffer = "";
let wizardFirstPin = "";
let unlockPinBuffer = "";


// --- Helper Functions ---

// Generate UUID for records
function generateId() {
    return window.crypto.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
}

// Format currency
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Parse amount input (handling thousand separators and shorthand x1000)
function parseAmountInput(valStr) {
    if (!valStr) return 0;
    const clean = valStr.replace(/\D/g, '');
    let num = Number(clean) || 0;
    return num * 1000; // Always multiply by 1000
}

// Compare records by date (descending) and updated_at (descending)
function compareRecordsByRecent(a, b) {
    const updateA = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const updateB = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    
    const validUpdateA = isNaN(updateA) ? 0 : updateA;
    const validUpdateB = isNaN(updateB) ? 0 : updateB;
    
    if (validUpdateB !== validUpdateA) {
        return validUpdateB - validUpdateA;
    }
    
    // Fallback to date comparison if updated_at is identical
    const timeA = a.date ? new Date(a.date).getTime() : 0;
    const timeB = b.date ? new Date(b.date).getTime() : 0;
    
    const validA = isNaN(timeA) ? 0 : timeA;
    const validB = isNaN(timeB) ? 0 : timeB;
    
    return validB - validA;
}

// Show Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconName = 'check-circle';
    if (type === 'error') iconName = 'alert-triangle';
    if (type === 'warning') iconName = 'alert-circle';
    
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Save database state locally (encrypted)
async function saveLocalState() {
    if (!state.masterPassword) return;
    
    const payload = JSON.stringify({
        receivedGifts: state.receivedGifts,
        sentGifts: state.sentGifts,
        lastResetTime: state.lastResetTime || '',
        showImportNotesOption: !!state.showImportNotesOption,
        showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || ''
    });
    
    try {
        const encrypted = await encrypt(payload, state.masterPassword);
        localStorage.setItem('gift_ledger_db', encrypted);
    } catch (e) {
        console.error("Local save failed:", e);
        showToast("Lưu dữ liệu cục bộ thất bại!", "error");
    }
}

// Load database state locally (encrypted)
async function loadLocalState(password) {
    const encrypted = localStorage.getItem('gift_ledger_db');
    if (!encrypted) {
        state.receivedGifts = [];
        state.sentGifts = [];
        state.lastResetTime = '';
        state.showImportNotesOption = false;
        state.showImportNotesOptionUpdated = '';
        return true;
    }
    
    try {
        const decrypted = await decrypt(encrypted, password);
        const data = JSON.parse(decrypted);
        state.receivedGifts = data.receivedGifts || [];
        state.sentGifts = data.sentGifts || [];
        state.lastResetTime = data.lastResetTime || '';
        state.showImportNotesOption = !!data.showImportNotesOption;
        state.showImportNotesOptionUpdated = data.showImportNotesOptionUpdated || '';
        return true;
    } catch (e) {
        console.error("Local decrypt failed:", e);
        return false;
    }
}

// --- Sync & Merge Logic ---

// Merge two lists using ID and updated_at, respecting deletions
function mergeLists(localList, remoteList) {
    const mergedMap = new Map();
    
    // Add all local items
    localList.forEach(item => mergedMap.set(item.id, item));
    
    // Add or merge remote items
    remoteList.forEach(remoteItem => {
        const localItem = mergedMap.get(remoteItem.id);
        if (!localItem) {
            mergedMap.set(remoteItem.id, remoteItem);
        } else {
            const localTime = new Date(localItem.updated_at || 0).getTime();
            const remoteTime = new Date(remoteItem.updated_at || 0).getTime();
            if (remoteTime > localTime) {
                mergedMap.set(remoteItem.id, remoteItem);
            }
        }
    });
    
    return Array.from(mergedMap.values());
}

// Auto-sync function
async function performSync(silent = false) {
    if (!sync.isConfigured()) {
        if (!silent) showToast("Supabase chưa được cấu hình!", "warning");
        return;
    }
    
    const user = await sync.getCurrentUser();
    if (!user) {
        if (!silent) showToast("Vui lòng đăng nhập tài khoản Sync!", "warning");
        return;
    }
    
    try {
        if (!silent) showToast("Đang đồng bộ...", "warning");
        
        // 1. Fetch remote data
        const remoteRecord = await sync.getSyncData();
        
        let mergedReceived = [...state.receivedGifts];
        let mergedSent = [...state.sentGifts];
        let localReset = state.lastResetTime || '';
        
        if (remoteRecord && remoteRecord.encrypted_data) {
            try {
                // 2. Decrypt remote data
                const remoteDecrypted = await decrypt(remoteRecord.encrypted_data, state.masterPassword);
                const remoteData = JSON.parse(remoteDecrypted);
                
                const remoteReset = remoteData.lastResetTime || '';
                let remoteReceived = remoteData.receivedGifts || [];
                let remoteSent = remoteData.sentGifts || [];
                
                // Compare reset times
                const localResetTime = localReset ? new Date(localReset).getTime() : 0;
                const remoteResetTime = remoteReset ? new Date(remoteReset).getTime() : 0;
                
                if (remoteResetTime > localResetTime) {
                    // Remote has a newer reset/overwrite. Discard local data.
                    state.receivedGifts = [];
                    state.sentGifts = [];
                    state.lastResetTime = remoteReset;
                    localReset = remoteReset;
                    state.showImportNotesOption = !!remoteData.showImportNotesOption;
                    state.showImportNotesOptionUpdated = remoteData.showImportNotesOptionUpdated || '';
                } else if (localResetTime > remoteResetTime) {
                    // Local has a newer reset/overwrite. Discard remote data.
                    remoteReceived = [];
                    remoteSent = [];
                } else {
                    // Merge showImportNotesOption using LWW (Last Write Wins)
                    const localOptTime = state.showImportNotesOptionUpdated ? new Date(state.showImportNotesOptionUpdated).getTime() : 0;
                    const remoteOptTime = remoteData.showImportNotesOptionUpdated ? new Date(remoteData.showImportNotesOptionUpdated).getTime() : 0;
                    
                    if (remoteOptTime > localOptTime) {
                        state.showImportNotesOption = !!remoteData.showImportNotesOption;
                        state.showImportNotesOptionUpdated = remoteData.showImportNotesOptionUpdated || '';
                    }
                }
                
                // 3. Merge
                mergedReceived = mergeLists(state.receivedGifts, remoteReceived);
                mergedSent = mergeLists(state.sentGifts, remoteSent);
            } catch (decErr) {
                console.error("Remote decryption failed:", decErr);
                throw new Error("Không thể giải mã dữ liệu trên máy chủ. Có thể do Master Password trên máy chủ khác biệt?");
            }
        }
        
        // 4. Update local state
        state.receivedGifts = mergedReceived;
        state.sentGifts = mergedSent;
        state.lastResetTime = localReset;
        await saveLocalState();
        
        // 5. Encrypt and upload merged state to server
        const payload = JSON.stringify({
            receivedGifts: state.receivedGifts,
            sentGifts: state.sentGifts,
            lastResetTime: state.lastResetTime || '',
            showImportNotesOption: !!state.showImportNotesOption,
            showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || ''
        });
        const encrypted = await encrypt(payload, state.masterPassword);
        await sync.saveSyncData(encrypted);
        
        // 6. Refresh UI
        localStorage.setItem('last_sync_time', new Date().toISOString());
        renderAll();
        updateSyncIndicator('synced');
        showToast("Đồng bộ dữ liệu thành công!");

    } catch (e) {
        console.error("Sync error:", e);
        updateSyncIndicator('error');
        showToast(e.message || "Lỗi khi đồng bộ dữ liệu!", "error");
    }
}

// Update settings view showing connection and credentials
function updateSyncIndicator(status) {
    const dot = document.getElementById('syncStatusDot');
    const text = document.getElementById('syncStatusText');
    if (dot && text) {
        if (status === 'synced') {
            dot.className = 'status-dot green';
            text.innerText = 'Đã đồng bộ hóa với Supabase Cloud';
        } else if (status === 'error') {
            dot.className = 'status-dot red';
            text.innerText = 'Lỗi đồng bộ hóa (Nhấp để thử lại)';
        } else if (status === 'unsynced') {
            dot.className = 'status-dot yellow';
            text.innerText = 'Dữ liệu cục bộ chưa được đồng bộ';
        } else {
            dot.className = 'status-dot red';
            text.innerText = 'Không có kết nối Supabase / Chưa đăng nhập';
        }
    }
    
    // Also update the dashboard banner
    renderDashboardSyncBanner();
}


// --- Render Layout and Components ---

function renderAll() {
    renderDashboard();
    renderReceivedTable();
    renderSentTable();
    renderSettings();
    updateThemeUI();
    updateImportNotesOptionUI();
    handleHashRoute();
    lucide.createIcons();
}

function updateImportNotesOptionUI() {
    const btn = document.getElementById('chooseImportNotesBtn');
    const toggle = document.getElementById('toggleImportNotesOption');
    if (btn) {
        btn.style.display = state.showImportNotesOption ? 'flex' : 'none';
    }
    if (toggle) {
        toggle.checked = !!state.showImportNotesOption;
    }
}

// Theme handling
function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('gift_ledger_theme', state.theme);
    updateThemeUI();
}

function updateThemeUI() {
    const body = document.body;
    const icon = document.getElementById('themeIcon');
    const text = document.getElementById('themeText');
    
    if (state.theme === 'light') {
        body.classList.add('light-mode');
        if (icon) icon.setAttribute('data-lucide', 'moon');
        if (text) text.innerText = 'Giao diện tối';
    } else {
        body.classList.remove('light-mode');
        if (icon) icon.setAttribute('data-lucide', 'sun');
        if (text) text.innerText = 'Giao diện sáng';
    }
    lucide.createIcons();
}

// Mobile View Mode handling
function toggleMobileView() {
    state.mobileViewMode = state.mobileViewMode === 'table' ? 'cards' : 'table';
    localStorage.setItem('gift_ledger_mobile_view', state.mobileViewMode);
    updateMobileViewUI();
}

function updateMobileViewUI() {
    if (state.mobileViewMode === 'table') {
        document.body.classList.add('mobile-view-table');
    } else {
        document.body.classList.remove('mobile-view-table');
    }
    
    // Update settings checkbox
    const checkbox = document.getElementById('toggleMobileTableView');
    if (checkbox) {
        checkbox.checked = (state.mobileViewMode === 'table');
    }
    
    // Update layout buttons
    const buttons = document.querySelectorAll('.btnToggleMobileView');
    buttons.forEach(btn => {
        if (state.mobileViewMode === 'table') {
            btn.innerHTML = `<i data-lucide="layout-grid"></i><span>Xem dạng thẻ</span>`;
        } else {
            btn.innerHTML = `<i data-lucide="table"></i><span>Xem dạng bảng</span>`;
        }
    });
    
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

const tabHashMapping = {
    'tongquan': 'dashboard',
    'dashboard': 'dashboard',
    'tientoinhan': 'received',
    'mungcuoitoi': 'received',
    'received': 'received',
    'tientoimung': 'sent',
    'toimungcuoi': 'sent',
    'sent': 'sent',
    'caidat': 'settings',
    'settings': 'settings'
};

const tabIdToHash = {
    'dashboard': 'tongquan',
    'received': 'tientoinhan',
    'sent': 'tientoimung',
    'settings': 'caidat'
};

function handleHashRoute() {
    const appLayout = document.getElementById('appLayout');
    if (!appLayout || appLayout.style.display === 'none') return;
    
    const hash = window.location.hash.replace('#', '').replace('/', '').trim();
    if (hash && tabHashMapping[hash]) {
        const tabId = tabHashMapping[hash];
        if (state.activeTab !== tabId) {
            switchTab(tabId, false);
        }
    } else {
        const defaultHash = tabIdToHash[state.activeTab || 'dashboard'];
        if (window.location.hash !== '#' + defaultHash) {
            window.location.hash = defaultHash;
        }
    }
}

// Switch main navigation tabs
function switchTab(tabId, updateHash = true) {
    state.activeTab = tabId;
    
    // Update active class on nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('data-tab') === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Show/Hide Panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        if (panel.id === `tab-${tabId}`) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });
    
    // Header text update
    const title = document.getElementById('currentTabTitle');
    const subtitle = document.getElementById('currentTabSubtitle');
    
    if (tabId === 'dashboard') {
        title.innerText = 'Tổng quan';
        subtitle.innerText = 'Thống kê hoạt động hiếu hỷ của bạn';
        renderDashboard(); // Re-render charts to fit size if changed
    } else if (tabId === 'received') {
        title.innerText = 'Tiền tôi nhận';
        subtitle.innerText = 'Quản lý danh sách tiền nhận hiếu hỷ, sự kiện và trạng thái trả lễ';
        renderReceivedTable();
    } else if (tabId === 'sent') {
        title.innerText = 'Tiền tôi mừng';
        subtitle.innerText = 'Quản lý danh sách tiền đi mừng hiếu hỷ, thăm ốm... của tôi';
        renderSentTable();
    } else if (tabId === 'settings') {
        title.innerText = 'Cài đặt';
        subtitle.innerText = 'Cấu hình bảo mật, đồng bộ dữ liệu và sao lưu';
        renderSettings();
    }
    
    if (updateHash) {
        const hash = tabIdToHash[tabId] || tabId;
        window.location.hash = hash;
    }
    
    // Close mobile menu if open
    document.getElementById('sidebar').classList.remove('mobile-open');
    lucide.createIcons();
}

// --- Dashboard Views & Chart Render ---

function renderDashboard() {
    // 1. Calculations
    const activeReceived = state.receivedGifts.filter(g => !g.deleted_at);
    const activeSent = state.sentGifts.filter(g => !g.deleted_at);
    
    const totalReceivedVal = activeReceived.reduce((sum, g) => sum + Number(g.amount || 0), 0);
    const totalSentVal = activeSent.reduce((sum, g) => sum + Number(g.amount || 0), 0);
    const balanceVal = totalReceivedVal - totalSentVal;
    
    // Gold calculations
    const totalGoldReceivedVal = activeReceived.filter(g => g.gift_type === 'gold').reduce((sum, g) => sum + Number(g.gold_amount || 0), 0);
    const totalGoldSentVal = activeSent.filter(g => g.gift_type === 'gold').reduce((sum, g) => sum + Number(g.gold_amount || 0), 0);
    const goldBalanceVal = totalGoldReceivedVal - totalGoldSentVal;
    
    const pendingReturnCount = activeReceived.filter(g => g.status === 'pending').length;
    
    // 2. Set Text values
    document.getElementById('statReceived').innerText = formatVND(totalReceivedVal);
    document.getElementById('statReceivedCount').innerText = `${activeReceived.length} người${totalGoldReceivedVal > 0 ? ` • ${totalGoldReceivedVal} chỉ` : ''}`;
    
    document.getElementById('statSent').innerText = formatVND(totalSentVal);
    document.getElementById('statSentCount').innerText = `${activeSent.length} sự kiện${totalGoldSentVal > 0 ? ` • ${totalGoldSentVal} chỉ` : ''}`;
    
    const balanceEl = document.getElementById('statBalance');
    balanceEl.innerText = formatVND(balanceVal);
    if (balanceVal >= 0) {
        balanceEl.style.color = 'var(--accent-emerald)';
    } else {
        balanceEl.style.color = 'var(--accent-rose)';
    }
    
    const balanceSubEl = balanceEl.nextElementSibling;
    if (balanceSubEl) {
        balanceSubEl.innerText = `Tiền tôi nhận - Tiền tôi mừng${(totalGoldReceivedVal > 0 || totalGoldSentVal > 0) ? ` • Chênh lệch: ${goldBalanceVal >= 0 ? '+' : ''}${goldBalanceVal} chỉ` : ''}`;
    }
    
    document.getElementById('statPendingReturn').innerText = `${pendingReturnCount} người`;
    
    // 3. Render charts
    renderRelationshipChart(activeReceived, activeSent);
    renderEventTypeChart(activeSent);
    renderRecentActivity(activeReceived, activeSent);
    renderDashboardSyncBanner();
}


function renderRelationshipChart(received, sent) {
    const relationships = ['Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Chính quyền', 'Khác'];
    
    const receivedData = relationships.map(rel => 
        received.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount), 0)
    );
    
    const sentData = relationships.map(rel => 
        sent.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount), 0)
    );
    
    const ctx = document.getElementById('relationshipChart').getContext('2d');
    
    if (relationshipChart) {
        relationshipChart.destroy();
    }
    
    // Grid color responsive to theme
    const gridColor = state.theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
    const textColor = state.theme === 'dark' ? '#94a3b8' : '#4b5563';
    
    relationshipChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: relationships,
            datasets: [
                {
                    label: 'Tiền tôi nhận',
                    data: receivedData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Tiền tôi mừng',
                    data: sentData,
                    backgroundColor: 'rgba(14, 165, 233, 0.75)',
                    borderColor: '#0ea5e9',
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: textColor, font: { family: 'Inter' } }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Inter' } }
                },
                y: {
                    grid: { color: gridColor },
                    min: 0,
                    suggestedMax: 1000000,
                    ticks: { 
                        color: textColor,
                        font: { family: 'Inter' },
                        precision: 0,
                        callback: function(value) {
                            if (value === 0) return '0';
                            if (value >= 1000000) {
                                return (value / 1000000) + ' Tr';
                            }
                            if (value >= 1000) {
                                return (value / 1000) + ' K';
                            }
                            return value;
                        }
                    }
                }
            }
        }
    });
}

function renderEventTypeChart(sent) {
    const eventTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia', 'Khác'];
    const standardTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
    
    const typeCounts = eventTypes.map(type => {
        if (type === 'Khác') {
            return sent.filter(g => !standardTypes.includes(g.event_type) || g.event_type === 'Khác').length;
        } else {
            return sent.filter(g => g.event_type === type).length;
        }
    });
    
    const ctx = document.getElementById('eventTypeChart').getContext('2d');
    
    if (eventTypeChart) {
        eventTypeChart.destroy();
    }
    
    const textColor = state.theme === 'dark' ? '#94a3b8' : '#4b5563';
    const hasData = typeCounts.some(c => c > 0);
    
    eventTypeChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: eventTypes,
            datasets: [{
                data: hasData ? typeCounts : [1],
                backgroundColor: hasData ? [
                    'rgba(244, 63, 94, 0.75)',
                    'rgba(100, 116, 139, 0.75)',
                    'rgba(245, 158, 11, 0.75)',
                    'rgba(14, 165, 233, 0.75)',
                    'rgba(99, 102, 241, 0.75)'
                ] : ['rgba(148, 163, 184, 0.2)'],
                borderColor: state.theme === 'dark' ? '#0f1626' : '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: textColor, font: { family: 'Inter', size: 11 } }
                },
                tooltip: {
                    enabled: hasData
                }
            },
            cutout: '65%'
        }
    });
}

function renderRecentActivity(received, sent) {
    const tbody = document.getElementById('recentActivityTableBody');
    tbody.innerHTML = '';
    
    // Combine lists, add tag, sort by date/updated_at
    const allActivities = [
        ...received.map(g => ({ ...g, flow: 'in' })),
        ...sent.map(g => ({ ...g, flow: 'out' }))
    ];
    
    // Sort descending by date, then by updated_at using helper
    allActivities.sort(compareRecordsByRecent);
    
    const recent = allActivities.slice(0, 5);
    
    if (recent.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">Chưa có ghi chép nào. Bấm "Thêm ghi chép" để bắt đầu!</td>
            </tr>
        `;
        return;
    }
    
    recent.forEach(act => {
        const row = document.createElement('tr');
        
        let flowBadge = '';
        let eventBadge = '';
        let amountText = '';
        
        if (act.flow === 'in') {
            flowBadge = '<span class="badge badge-status-returned"><i data-lucide="arrow-down-left" style="width:12px;height:12px;margin-right:4px;"></i>Thu</span>';
            
            let evClass = 'badge-event-other';
            const eventType = act.event_type || 'Khác';
            if (eventType === 'Đám cưới') evClass = 'badge-event-wedding';
            if (eventType === 'Đám hiếu') evClass = 'badge-event-funeral';
            if (eventType === 'Thăm ốm') evClass = 'badge-event-sick';
            if (eventType === 'Tân gia') evClass = 'badge-event-housewarming';
            
            eventBadge = `<span class="badge ${evClass}">${escapeHTML(eventType)}</span>`;
            amountText = act.gift_type === 'gold'
                ? `<span style="color:var(--accent-emerald); font-weight:600;">+${act.gold_amount} chỉ (${escapeHTML(act.gold_type || 'Vàng')})</span>`
                : `<span style="color:var(--accent-emerald); font-weight:600;">+${formatVND(act.amount)}</span>`;
        } else {
            flowBadge = '<span class="badge badge-status-pending"><i data-lucide="arrow-up-right" style="width:12px;height:12px;margin-right:4px;"></i>Chi</span>';
            amountText = act.gift_type === 'gold'
                ? `<span style="color:var(--text-primary); font-weight:600;">-${act.gold_amount} chỉ (${escapeHTML(act.gold_type || 'Vàng')})</span>`
                : `<span style="color:var(--text-primary); font-weight:600;">-${formatVND(act.amount)}</span>`;
            
            let evClass = 'badge-event-other';
            if (act.event_type === 'Đám cưới') evClass = 'badge-event-wedding';
            if (act.event_type === 'Đám hiếu') evClass = 'badge-event-funeral';
            if (act.event_type === 'Thăm ốm') evClass = 'badge-event-sick';
            if (act.event_type === 'Tân gia') evClass = 'badge-event-housewarming';
            
            eventBadge = `<span class="badge ${evClass}">${act.event_type}</span>`;
        }
        
        row.innerHTML = `
            <td data-label="Chiều">${flowBadge}</td>
            <td data-label="Họ & Tên">
                <div class="name-address-container">
                    <div style="font-weight: 500; white-space: normal; word-break: break-word;">${escapeHTML(act.name)}</div>
                    ${act.address ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 400; margin-top: 2px; white-space: normal;"><i data-lucide="map-pin" style="width:10px;height:10px;display:inline-block;margin-right:2px;vertical-align:middle;"></i>${escapeHTML(act.address)}</div>` : ''}
                </div>
            </td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${act.relationship}</span></td>
            <td data-label="Số tiền">${amountText}</td>
            <td data-label="Loại sự kiện">${eventBadge}</td>
            <td data-label="Ngày">${formatDate(act.date)}</td>
            <td data-label="Ghi chú" class="notes-cell" title="${escapeHTML(act.notes || '')}">
                <span class="notes-content">${escapeHTML(act.notes || '-')}</span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// --- Received Gifts List Views ---

window.toggleReceivedReturnStatus = async function(id) {
    const index = state.receivedGifts.findIndex(g => g.id === id);
    if (index === -1) return;
    
    const current = state.receivedGifts[index];
    state.receivedGifts[index] = {
        ...current,
        status: current.status === 'returned' ? 'pending' : 'returned',
        updated_at: new Date().toISOString()
    };
    
    await saveLocalState();
    renderReceivedTable();
    renderDashboard();
    
    // Auto-sync in background
    performSync(true);
};

// Toggle Received Form Inputs (Money vs Gold)
function toggleRecGiftType(type) {
    const moneyGroup = document.getElementById('recMoneyGroup');
    const goldGroup = document.getElementById('recGoldGroup');
    
    if (type === 'gold') {
        moneyGroup.style.display = 'none';
        goldGroup.style.display = 'flex';
    } else {
        moneyGroup.style.display = 'flex';
        goldGroup.style.display = 'none';
    }
}

// Toggle Sent Form Inputs (Money vs Gold)
function toggleSentGiftType(type) {
    const moneyGroup = document.getElementById('sentMoneyGroup');
    const goldGroup = document.getElementById('sentGoldGroup');
    
    if (type === 'gold') {
        moneyGroup.style.display = 'none';
        goldGroup.style.display = 'flex';
    } else {
        moneyGroup.style.display = 'flex';
        goldGroup.style.display = 'none';
    }
}

window.editReceivedRecord = function(id) {
    const record = state.receivedGifts.find(g => g.id === id);
    if (!record) return;
    
    document.getElementById('receivedId').value = record.id;
    document.getElementById('recName').value = record.name;
    document.getElementById('recRelationship').value = record.relationship;
    document.getElementById('recDate').value = record.date;
    
    const standardRecTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
    const recEventType = record.event_type || '';
    if (standardRecTypes.includes(recEventType)) {
        document.getElementById('recType').value = recEventType;
        document.getElementById('recTypeCustom').value = '';
    } else {
        document.getElementById('recType').value = 'Khác';
        document.getElementById('recTypeCustom').value = recEventType;
    }
    updateRecTypeCustomVisibility();
    
    const isReturned = record.status === 'returned';
    document.getElementById('recStatus').checked = isReturned;
    document.getElementById('recStatusLabel').innerText = isReturned ? 'Đã đi mừng cưới lại họ' : 'Chưa đi mừng cưới lại họ';
    document.getElementById('recNotes').value = record.notes || '';
    if (document.getElementById('recAddress')) {
        document.getElementById('recAddress').value = record.address || '';
    }
    
    const giftType = record.gift_type || 'money';
    const radioEl = document.querySelector(`input[name="recGiftType"][value="${giftType}"]`);
    if (radioEl) radioEl.checked = true;
    toggleRecGiftType(giftType);
    
    if (giftType === 'gold') {
        document.getElementById('recGoldAmount').value = record.gold_amount || '';
        document.getElementById('recGoldType').value = record.gold_type || '';
        document.getElementById('recAmount').value = '';
    } else {
        document.getElementById('recAmount').value = new Intl.NumberFormat('vi-VN').format((record.amount || 0) / 1000);
        document.getElementById('recGoldAmount').value = '';
        document.getElementById('recGoldType').value = '';
    }
    
    document.getElementById('receivedModalTitle').innerText = 'Chỉnh sửa khoản nhận mừng cưới';
    document.getElementById('receivedModal').classList.add('active');
};

window.deleteReceivedRecord = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chép này?")) return;
    
    const index = state.receivedGifts.findIndex(g => g.id === id);
    if (index === -1) return;
    
    // Soft-delete to support synchronization
    state.receivedGifts[index] = {
        ...state.receivedGifts[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await saveLocalState();
    renderReceivedTable();
    renderDashboard();
    showToast("Đã xóa ghi chép");
    
    // Auto-sync
    performSync(true);
};

function updateEditButtonUI(tab) {
    if (tab === 'received') {
        const btn = document.getElementById('btnToggleEditReceived');
        if (!btn) return;
        if (state.receivedEditMode) {
            btn.className = 'btn btn-success';
            btn.innerHTML = `<i data-lucide="check"></i><span>Hoàn tất</span>`;
        } else {
            btn.className = 'btn btn-outline';
            btn.innerHTML = `<i data-lucide="edit-3"></i><span>Chỉnh sửa</span>`;
        }
    } else if (tab === 'sent') {
        const btn = document.getElementById('btnToggleEditSent');
        if (!btn) return;
        if (state.sentEditMode) {
            btn.className = 'btn btn-success';
            btn.innerHTML = `<i data-lucide="check"></i><span>Hoàn tất</span>`;
        } else {
            btn.className = 'btn btn-outline';
            btn.innerHTML = `<i data-lucide="edit-3"></i><span>Chỉnh sửa</span>`;
        }
    }
    lucide.createIcons();
}

function renderReceivedTable() {
    const tbody = document.getElementById('receivedTableBody');
    tbody.innerHTML = '';
    
    const table = document.getElementById('receivedTable');
    if (table) {
        if (state.receivedEditMode) {
            table.classList.add('edit-mode-active');
        } else {
            table.classList.remove('edit-mode-active');
        }
    }
    
    // Filter active (not soft-deleted)
    let filtered = state.receivedGifts.filter(g => !g.deleted_at);
    
    // Search filter
    if (state.receivedSearch) {
        const query = state.receivedSearch.toLowerCase();
        filtered = filtered.filter(g => 
            g.name.toLowerCase().includes(query) || 
            (g.notes && g.notes.toLowerCase().includes(query)) || 
            (g.address && g.address.toLowerCase().includes(query)) ||
            (g.event_type && g.event_type.toLowerCase().includes(query))
        );
    }
    
    // Event filter
    if (state.receivedFilterEvent) {
        if (state.receivedFilterEvent === 'Khác') {
            const standardTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
            filtered = filtered.filter(g => !g.event_type || !standardTypes.includes(g.event_type) || g.event_type === 'Khác');
        } else {
            filtered = filtered.filter(g => g.event_type === state.receivedFilterEvent);
        }
    }
    
    // Relation filter
    if (state.receivedFilterRelation) {
        filtered = filtered.filter(g => g.relationship === state.receivedFilterRelation);
    }
    
    // Status filter
    if (state.receivedFilterStatus) {
        filtered = filtered.filter(g => g.status === state.receivedFilterStatus);
    }
    
    // Sort by date desc, then by updated_at desc (most recent first) using helper
    filtered.sort(compareRecordsByRecent);
    
    // Pagination
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / state.receivedLimit) || 1;
    
    if (state.receivedPage > totalPages) state.receivedPage = totalPages;
    
    const startIndex = (state.receivedPage - 1) * state.receivedLimit;
    const paginated = filtered.slice(startIndex, startIndex + state.receivedLimit);
    
    // Pagination text update
    const displayEnd = Math.min(startIndex + state.receivedLimit, totalRecords);
    document.getElementById('receivedPaginationText').innerText = totalRecords > 0 
        ? `Hiển thị ${startIndex + 1}-${displayEnd} trên tổng số ${totalRecords} bản ghi`
        : `Hiển thị 0-0 trên 0 bản ghi`;
        
    document.getElementById('btnReceivedPrev').disabled = state.receivedPage === 1;
    document.getElementById('btnReceivedNext').disabled = state.receivedPage === totalPages || totalRecords === 0;
    
    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-state">Không có bản ghi nào trùng khớp với bộ lọc.</td>
            </tr>
        `;
        updateEditButtonUI('received');
        return;
    }
    
    paginated.forEach(g => {
        const row = document.createElement('tr');
        const isChecked = g.status === 'returned' ? 'checked' : '';
        const statusText = g.status === 'returned' ? 'Đã đi lại' : 'Chưa đi lại';
        const statusClass = g.status === 'returned' ? 'badge-status-returned' : 'badge-status-pending';
        
        let evClass = 'badge-event-other';
        const eventType = g.event_type || 'Khác';
        if (eventType === 'Đám cưới') evClass = 'badge-event-wedding';
        if (eventType === 'Đám hiếu') evClass = 'badge-event-funeral';
        if (eventType === 'Thăm ốm') evClass = 'badge-event-sick';
        if (eventType === 'Tân gia') evClass = 'badge-event-housewarming';
        
        let statusHtml = '';
        if (state.receivedEditMode) {
            statusHtml = `
                <label class="status-switch">
                    <input type="checkbox" class="status-checkbox" ${isChecked} onchange="toggleReceivedReturnStatus('${g.id}')">
                    <span class="status-slider"></span>
                    <span class="badge ${statusClass}">${statusText}</span>
                </label>
            `;
        } else {
            statusHtml = `<span class="badge ${statusClass}">${statusText}</span>`;
        }
        
        row.innerHTML = `
            <td data-label="Họ & Tên">
                <div class="name-address-container">
                    <div style="font-weight: 600; white-space: normal; word-break: break-word;">${escapeHTML(g.name)}</div>
                    ${g.address ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 400; margin-top: 2px; white-space: normal;"><i data-lucide="map-pin" style="width:10px;height:10px;display:inline-block;margin-right:2px;vertical-align:middle;"></i>${escapeHTML(g.address)}</div>` : ''}
                </div>
            </td>
            <td data-label="Loại sự kiện"><span class="badge ${evClass}">${escapeHTML(eventType)}</span></td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${g.relationship}</span></td>
            <td data-label="Số tiền nhận" style="color: var(--accent-emerald); font-weight:600;">
                ${g.gift_type === 'gold' ? `+${g.gold_amount} chỉ (${escapeHTML(g.gold_type || 'Vàng')})` : `+${formatVND(g.amount)}`}
            </td>
            <td data-label="Ghi chú" class="notes-cell" title="${escapeHTML(g.notes || '')}">
                <span class="notes-content">${escapeHTML(g.notes || '-')}</span>
            </td>
            <td data-label="Ngày nhận">${formatDate(g.date)}</td>
            <td data-label="Đã trả lễ lại họ?">
                ${statusHtml}
            </td>
            <td class="col-actions" data-label="Thao tác">
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline" style="padding: 6px 10px;" onclick="editReceivedRecord('${g.id}')">
                        <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="btn btn-outline-danger" style="padding: 6px 10px;" onclick="deleteReceivedRecord('${g.id}')">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateEditButtonUI('received');
    lucide.createIcons();
}

// --- Sent Gifts List Views ---

window.editSentRecord = function(id) {
    const record = state.sentGifts.find(g => g.id === id);
    if (!record) return;
    
    document.getElementById('sentId').value = record.id;
    document.getElementById('sentName').value = record.name;
    const standardSentTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
    const sentEventType = record.event_type || '';
    if (standardSentTypes.includes(sentEventType)) {
        document.getElementById('sentType').value = sentEventType;
        document.getElementById('sentTypeCustom').value = '';
    } else {
        document.getElementById('sentType').value = 'Khác';
        document.getElementById('sentTypeCustom').value = sentEventType;
    }
    updateSentTypeCustomVisibility();
    document.getElementById('sentRelationship').value = record.relationship;
    document.getElementById('sentDate').value = record.date;
    document.getElementById('sentNotes').value = record.notes || '';
    if (document.getElementById('sentAddress')) {
        document.getElementById('sentAddress').value = record.address || '';
    }
    
    const giftType = record.gift_type || 'money';
    const radioEl = document.querySelector(`input[name="sentGiftType"][value="${giftType}"]`);
    if (radioEl) radioEl.checked = true;
    toggleSentGiftType(giftType);
    
    if (giftType === 'gold') {
        document.getElementById('sentGoldAmount').value = record.gold_amount || '';
        document.getElementById('sentGoldType').value = record.gold_type || '';
        document.getElementById('sentAmount').value = '';
    } else {
        document.getElementById('sentAmount').value = new Intl.NumberFormat('vi-VN').format((record.amount || 0) / 1000);
        document.getElementById('sentGoldAmount').value = '';
        document.getElementById('sentGoldType').value = '';
    }
    
    document.getElementById('sentModalTitle').innerText = 'Chỉnh sửa khoản đi mừng';
    document.getElementById('sentModal').classList.add('active');
};

window.deleteSentRecord = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa ghi chép này?")) return;
    
    const index = state.sentGifts.findIndex(g => g.id === id);
    if (index === -1) return;
    
    // Soft-delete
    state.sentGifts[index] = {
        ...state.sentGifts[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await saveLocalState();
    renderSentTable();
    renderDashboard();
    showToast("Đã xóa ghi chép");
    
    // Auto-sync
    performSync(true);
};

function renderSentTable() {
    const tbody = document.getElementById('sentTableBody');
    tbody.innerHTML = '';
    
    const table = document.getElementById('sentTable');
    if (table) {
        if (state.sentEditMode) {
            table.classList.add('edit-mode-active');
        } else {
            table.classList.remove('edit-mode-active');
        }
    }
    
    // Filter active
    let filtered = state.sentGifts.filter(g => !g.deleted_at);
    
    // Search
    if (state.sentSearch) {
        const query = state.sentSearch.toLowerCase();
        filtered = filtered.filter(g => 
            g.name.toLowerCase().includes(query) || 
            (g.notes && g.notes.toLowerCase().includes(query)) || 
            (g.address && g.address.toLowerCase().includes(query)) ||
            (g.event_type && g.event_type.toLowerCase().includes(query))
        );
    }
    
    // Event Type
    if (state.sentFilterType) {
        if (state.sentFilterType === 'Khác') {
            const standardTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
            filtered = filtered.filter(g => !standardTypes.includes(g.event_type) || g.event_type === 'Khác');
        } else {
            filtered = filtered.filter(g => g.event_type === state.sentFilterType);
        }
    }
    
    // Relation
    if (state.sentFilterRelation) {
        filtered = filtered.filter(g => g.relationship === state.sentFilterRelation);
    }
    
    // Sort by date desc, then by updated_at desc (most recent first) using helper
    filtered.sort(compareRecordsByRecent);
    
    const totalRecords = filtered.length;
    const totalPages = Math.ceil(totalRecords / state.sentLimit) || 1;
    
    if (state.sentPage > totalPages) state.sentPage = totalPages;
    
    const startIndex = (state.sentPage - 1) * state.sentLimit;
    const paginated = filtered.slice(startIndex, startIndex + state.sentLimit);
    
    const displayEnd = Math.min(startIndex + state.sentLimit, totalRecords);
    document.getElementById('sentPaginationText').innerText = totalRecords > 0 
        ? `Hiển thị ${startIndex + 1}-${displayEnd} trên tổng số ${totalRecords} bản ghi`
        : `Hiển thị 0-0 trên 0 bản ghi`;
        
    document.getElementById('btnSentPrev').disabled = state.sentPage === 1;
    document.getElementById('btnSentNext').disabled = state.sentPage === totalPages || totalRecords === 0;
    
    if (paginated.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">Không có bản ghi nào trùng khớp với bộ lọc.</td>
            </tr>
        `;
        updateEditButtonUI('sent');
        return;
    }
    
    paginated.forEach(g => {
        const row = document.createElement('tr');
        
        let evClass = 'badge-event-other';
        if (g.event_type === 'Đám cưới') evClass = 'badge-event-wedding';
        if (g.event_type === 'Đám hiếu') evClass = 'badge-event-funeral';
        if (g.event_type === 'Thăm ốm') evClass = 'badge-event-sick';
        if (g.event_type === 'Tân gia') evClass = 'badge-event-housewarming';
        
        row.innerHTML = `
            <td data-label="Họ & Tên">
                <div class="name-address-container">
                    <div style="font-weight: 600; white-space: normal; word-break: break-word;">${escapeHTML(g.name)}</div>
                    ${g.address ? `<div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 400; margin-top: 2px; white-space: normal;"><i data-lucide="map-pin" style="width:10px;height:10px;display:inline-block;margin-right:2px;vertical-align:middle;"></i>${escapeHTML(g.address)}</div>` : ''}
                </div>
            </td>
            <td data-label="Loại sự kiện"><span class="badge ${evClass}">${g.event_type}</span></td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${g.relationship}</span></td>
            <td data-label="Số tiền chi" style="color: var(--text-primary); font-weight:600;">
                ${g.gift_type === 'gold' ? `-${g.gold_amount} chỉ (${escapeHTML(g.gold_type || 'Vàng')})` : `-${formatVND(g.amount)}`}
            </td>
            <td data-label="Ghi chú" class="notes-cell" title="${escapeHTML(g.notes || '')}">
                <span class="notes-content">${escapeHTML(g.notes || '-')}</span>
            </td>
            <td data-label="Ngày chi">${formatDate(g.date)}</td>
            <td class="col-actions" data-label="Thao tác">
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-outline" style="padding: 6px 10px;" onclick="editSentRecord('${g.id}')">
                        <i data-lucide="edit-2" style="width:14px;height:14px;"></i>
                    </button>
                    <button class="btn btn-outline-danger" style="padding: 6px 10px;" onclick="deleteSentRecord('${g.id}')">
                        <i data-lucide="trash-2" style="width:14px;height:14px;"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    updateEditButtonUI('sent');
    lucide.createIcons();
}

// --- Settings Tab Render & Methods ---

function renderSettings() {
    const syncView = document.getElementById('supabaseConfigView');
    
    // Check if Supabase configured
    const config = getSupabaseConfig();
    const savedUrl = config.url || '';
    const savedKey = config.key || '';
    
    if (!sync.isConfigured() && config.url && config.key) {
        // Auto initialize client on settings render
        sync.initSupabase(config.url, config.key);
    }

    
    if (!sync.isConfigured()) {
        syncView.innerHTML = `
            <p class="settings-info">Để bật đồng bộ đám mây tự động giữa điện thoại và máy tính, hãy điền Credentials từ bảng điều khiển dự án Supabase miễn phí của bạn.</p>
            <form id="supabaseConfigForm">
                <div class="form-group">
                    <label class="form-label" for="syncUrl">Supabase URL</label>
                    <input type="text" class="form-control" id="syncUrl" required placeholder="https://xxxx.supabase.co" value="${savedUrl}">
                </div>
                <div class="form-group">
                    <label class="form-label" for="syncKey">Supabase Anon Key</label>
                    <input type="password" class="form-control" id="syncKey" required placeholder="eyJhbGciOi..." value="${savedKey}">
                </div>
                <button type="submit" class="btn btn-primary w-full">
                    <i data-lucide="save"></i>
                    <span>Lưu Cấu Hình Kết Nối</span>
                </button>
            </form>
        `;
    } else {
        const isUserLoggedIn = state.user !== null;
        const sourceText = config.source === 'build' ? ' (Tự động từ GitHub)' : '';


        
        if (!isUserLoggedIn) {
            syncView.innerHTML = `
                <div class="sync-status-indicator" style="margin-bottom:1.25rem;">
                    <span class="status-dot yellow"></span>
                    <span>Đã kết nối Supabase${sourceText}, cần Đăng nhập/Đăng ký tài khoản</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <form id="syncLoginForm">
                        <div class="form-group">
                            <label class="form-label" for="syncEmail">Email tài khoản</label>
                            <input type="email" class="form-control" id="syncEmail" required placeholder="your-email@example.com">
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="syncPassword">Mật khẩu tài khoản</label>
                            <input type="password" class="form-control" id="syncPassword" required placeholder="Tối thiểu 6 ký tự...">
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <button type="submit" class="btn btn-primary" id="btnSyncLogin" style="width: 100%;">Đăng nhập</button>
                            <button type="button" class="btn btn-secondary" id="btnSyncRegister" style="width: 100%;">Đăng ký mới</button>
                        </div>
                    </form>
                    <button class="btn btn-outline w-full" id="disconnectSupabaseBtn" style="margin-top:8px;">
                        <i data-lucide="link-2-off"></i>
                        <span>Hủy liên kết</span>
                    </button>
                </div>
            `;
            
            // Add listeners dynamically
            document.getElementById('syncLoginForm').addEventListener('submit', handleSyncLogin);
            document.getElementById('btnSyncRegister').addEventListener('click', handleSyncRegister);
            document.getElementById('disconnectSupabaseBtn').addEventListener('click', disconnectSupabase);
        } else {
            // Logged in!
            syncView.innerHTML = `
                <div class="sync-status-indicator">
                    <span id="syncStatusDot" class="status-dot green"></span>
                    <span id="syncStatusText">Sẵn sàng đồng bộ hóa${sourceText}</span>
                </div>
                <div style="margin: 1.25rem 0; font-size:0.85rem; color:var(--text-secondary);">
                    <div>Tài khoản: <b style="color:var(--text-primary);">${state.user.email}</b></div>
                    <div style="margin-top:4px;">Cơ sở dữ liệu đám mây hoạt động.</div>
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn btn-primary w-full" id="manualSyncBtn">
                        <i data-lucide="refresh-cw"></i>
                        <span>Đồng bộ ngay bây giờ</span>
                    </button>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <button class="btn btn-outline w-full" id="syncSignOutBtn" style="font-size: 0.85rem; padding: 10px 6px;">
                            <i data-lucide="log-out" style="width: 14px; height: 14px;"></i>
                            <span>Đăng xuất</span>
                        </button>
                        <button class="btn btn-outline btn-danger w-full" id="disconnectSupabaseBtn" style="font-size: 0.85rem; padding: 10px 6px;">
                            <i data-lucide="link-2-off" style="width: 14px; height: 14px;"></i>
                            <span>Hủy liên kết</span>
                        </button>
                    </div>
                </div>
                
                <details style="margin-top: 20px; border-top:1px solid var(--border-color); padding-top:15px; cursor: pointer;">
                    <summary style="font-weight: 600; font-size: 0.85rem; color: var(--text-primary); margin-bottom: 8px;">
                        Hướng dẫn Supabase SQL (Cho lần lập đầu)
                    </summary>
                    <p class="settings-info" style="font-size:0.75rem;">Copy lệnh sau chạy trong SQL Editor của Supabase để tạo bảng và phân quyền bảo mật RLS:</p>
                    <div class="sql-copy-block">
                        <button class="btn-copy" onclick="copySqlCode()">Copy</button>
                        <pre id="sqlCodeBlock">create table if not exists gift_sync (
  user_id uuid references auth.users not null primary key,
  encrypted_data text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table gift_sync enable row level security;

drop policy if exists "Users can insert their own sync data" on gift_sync;
create policy "Users can insert their own sync data" on gift_sync for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own sync data" on gift_sync;
create policy "Users can update their own sync data" on gift_sync for update using (auth.uid() = user_id);

drop policy if exists "Users can select their own sync data" on gift_sync;
create policy "Users can select their own sync data" on gift_sync for select using (auth.uid() = user_id);</pre>
                    </div>
                </details>
            `;
            
            document.getElementById('manualSyncBtn').addEventListener('click', () => performSync(false));
            document.getElementById('syncSignOutBtn').addEventListener('click', handleSyncSignOut);
            document.getElementById('disconnectSupabaseBtn').addEventListener('click', disconnectSupabase);
        }
    }
    
    // Setup listeners for forms dynamically
    const configForm = document.getElementById('supabaseConfigForm');
    if (configForm) {
        configForm.addEventListener('submit', handleSaveSupabaseConfig);
    }
    
    // Sync UI badge status
    updateUserBadge();
    lucide.createIcons();
}

function updateUserBadge() {
    const badge = document.getElementById('userBadge');
    const emailEl = document.getElementById('userEmail');
    const avatarEl = document.getElementById('userAvatar');
    
    if (state.user) {
        badge.style.display = 'flex';
        emailEl.innerText = state.user.email;
        avatarEl.innerText = state.user.email.charAt(0).toUpperCase();
    } else {
        badge.style.display = 'none';
    }
}

// SQL Copy helper
window.copySqlCode = function() {
    const pre = document.getElementById('sqlCodeBlock');
    navigator.clipboard.writeText(pre.innerText).then(() => {
        showToast("Đã copy SQL script!");
    }).catch(() => {
        showToast("Không thể copy tự động, vui lòng chọn để copy.", "error");
    });
};

// Handle Saving Supabase Configuration Credentials
function handleSaveSupabaseConfig(e) {
    e.preventDefault();
    if (document.activeElement) {
        document.activeElement.blur();
    }
    const url = document.getElementById('syncUrl').value.trim();
    const key = document.getElementById('syncKey').value.trim();
    
    if (!url || !key) {
        showToast("Vui lòng điền đủ URL và Key!", "error");
        return;
    }
    
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    localStorage.removeItem('supabase_disabled');
    
    const client = sync.initSupabase(url, key);
    if (client) {
        showToast("Đã liên kết Supabase thành công!");
        renderSettings();
        checkLoginStatus();
    } else {
        showToast("Không thể khởi tạo Supabase. Vui lòng kiểm tra lại URL!", "error");
    }
}

// Disconnect/Wipe Supabase credentials
function disconnectSupabase() {
    if (!confirm("Bạn có chắc chắn muốn hủy liên kết Supabase? Việc này sẽ dừng đồng bộ hóa, dữ liệu cục bộ của bạn vẫn được giữ nguyên.")) return;
    
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    localStorage.setItem('supabase_disabled', 'true');
    sync.initSupabase(null, null); // Wipe client
    state.user = null;
    updateUserBadge();
    showToast("Đã ngắt kết nối với Supabase Cloud.");
    renderSettings();
}


// Handle login submission
async function handleSyncLogin(e) {
    e.preventDefault();
    if (document.activeElement) {
        document.activeElement.blur();
    }
    const email = document.getElementById('syncEmail').value.trim();
    const password = document.getElementById('syncPassword').value;
    
    const loginBtn = document.getElementById('btnSyncLogin');
    const originalText = loginBtn.innerText;
    loginBtn.innerText = 'Đang đăng nhập...';
    loginBtn.disabled = true;
    
    try {
        const session = await sync.signIn(email, password);
        state.user = session.user;
        showToast("Đăng nhập thành công!");
        renderSettings();
        performSync(false); // Run a sync immediately on login
    } catch (err) {
        console.error("Login failed:", err);
        showToast(err.message || "Đăng nhập thất bại!", "error");
    } finally {
        loginBtn.innerText = originalText;
        loginBtn.disabled = false;
    }
}

// Handle register trigger
async function handleSyncRegister() {
    if (document.activeElement) {
        document.activeElement.blur();
    }
    const email = document.getElementById('syncEmail').value.trim();
    const password = document.getElementById('syncPassword').value;
    
    if (!email || password.length < 6) {
        showToast("Vui lòng điền Email và Mật khẩu tối thiểu 6 ký tự để đăng ký!", "warning");
        return;
    }
    
    const registerBtn = document.getElementById('btnSyncRegister');
    const originalText = registerBtn.innerText;
    registerBtn.innerText = 'Đang đăng ký...';
    registerBtn.disabled = true;
    
    try {
        await sync.signUp(email, password);
        showToast("Đăng ký thành công! Hãy kiểm tra hòm thư của bạn để xác nhận (nếu được kích hoạt), hoặc thử đăng nhập ngay.", "warning");
    } catch (err) {
        console.error("Register failed:", err);
        showToast(err.message || "Đăng ký thất bại!", "error");
    } finally {
        registerBtn.innerText = originalText;
        registerBtn.disabled = false;
    }
}

// Sign out from Supabase Sync
async function handleSyncSignOut() {
    if (document.activeElement) {
        document.activeElement.blur();
    }
    try {
        await sync.signOut();
        state.user = null;
        updateUserBadge();
        showToast("Đã đăng xuất tài khoản đồng bộ.");
        renderSettings();
    } catch (err) {
        console.error("Signout failed:", err);
        showToast("Lỗi khi đăng xuất!", "error");
    }
}

// --- Data Import/Export (Excel/CSV and JSON Encrypted Backup) ---

async function handleExportEncrypted(type = 'all') {
    if (!state.masterPassword) return;
    
    let received = state.receivedGifts;
    let sent = state.sentGifts;
    
    if (type === 'received') {
        sent = [];
    } else if (type === 'sent') {
        received = [];
    }
    
    const payload = JSON.stringify({
        receivedGifts: received,
        sentGifts: sent
    });
    
    try {
        const encrypted = await encrypt(payload, state.masterPassword);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            encrypted_payload: encrypted,
            app_id: "hieu_hy_gift_ledger",
            backup_type: type,
            exported_at: new Date().toISOString()
        }));
        
        let filename = `hieu_hy_backup_tat_ca_${new Date().toISOString().slice(0, 10)}.json`;
        if (type === 'received') {
            filename = `hieu_hy_backup_tien_nhan_${new Date().toISOString().slice(0, 10)}.json`;
        } else if (type === 'sent') {
            filename = `hieu_hy_backup_tien_mung_${new Date().toISOString().slice(0, 10)}.json`;
        }
        
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Đã xuất file Backup đã mã hóa!");
    } catch (e) {
        showToast("Mã hóa để xuất file thất bại!", "error");
    }
}
window.handleExportEncrypted = handleExportEncrypted;

function applyExcelStyles(ws) {
    if (!ws || !ws['!ref']) return;
    const range = XLSX.utils.decode_range(ws['!ref']);
    
    // Header Row Styling
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: range.s.r, c: c });
        const cell = ws[cellRef];
        if (cell) {
            cell.s = {
                font: { bold: true, name: 'Times New Roman', sz: 14, color: { rgb: "333333" } },
                alignment: { horizontal: 'center', vertical: 'center' },
                fill: { fgColor: { rgb: "F2F2F2" } },
                border: {
                    top: { style: 'thin', color: { rgb: "D3D3D3" } },
                    bottom: { style: 'medium', color: { rgb: "000000" } },
                    left: { style: 'thin', color: { rgb: "D3D3D3" } },
                    right: { style: 'thin', color: { rgb: "D3D3D3" } }
                }
            };
        }
    }
    
    // Data Rows Styling
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cellRef = XLSX.utils.encode_cell({ r: r, c: c });
            const cell = ws[cellRef];
            if (cell) {
                // Column 0: STT -> Center
                // Column 1: Họ tên -> Left
                // Column 2: Mối quan hệ -> Center
                // Column 3: Số tiền / Quà tặng -> Center (requested by user: "tự căn chỉnh giữa")
                // Column 4: Ngày nhận / Loại sự kiện -> Center
                // Column 5: Trạng thái / Ngày mừng -> Center
                // Column 6: Ghi chú -> Left
                let align = 'center';
                const headerRef = XLSX.utils.encode_cell({ r: range.s.r, c: c });
                const headerVal = ws[headerRef] ? String(ws[headerRef].v) : '';
                if (headerVal === 'Họ tên' || headerVal === 'Ghi chú' || headerVal === 'Địa chỉ') {
                    align = 'left';
                }
                
                cell.s = {
                    font: { name: 'Times New Roman', sz: 14, color: { rgb: "333333" } },
                    alignment: { horizontal: align, vertical: 'center' },
                    border: {
                        top: { style: 'thin', color: { rgb: "E0E0E0" } },
                        bottom: { style: 'thin', color: { rgb: "E0E0E0" } },
                        left: { style: 'thin', color: { rgb: "E0E0E0" } },
                        right: { style: 'thin', color: { rgb: "E0E0E0" } }
                    }
                };
                
                // Set thousand separator format for numeric values in Column (Số tiền / Quà tặng)
                if (headerVal === 'Số tiền / Quà tặng' && cell.t === 'n') {
                    cell.z = '#,##0';
                }
            }
        }
    }
}

function handleExportExcel(type = 'all') {
    const wb = XLSX.utils.book_new();
    
    let filename = `danh_sach_tong_hop_${new Date().toISOString().slice(0, 10)}.xlsx`;
    if (type === 'received') {
        filename = `danh_sach_tien_nhan_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === 'sent') {
        filename = `danh_sach_tien_mung_${new Date().toISOString().slice(0, 10)}.xlsx`;
    }
    
    if (type === 'all' || type === 'received') {
        const activeReceived = state.receivedGifts.filter(g => !g.deleted_at);
        const dataReceived = activeReceived.map((g, idx) => {
            const amountStr = g.gift_type === 'gold' ? `${g.gold_amount} chỉ vàng (${g.gold_type || 'Vàng'})` : g.amount;
            return {
                "STT": idx + 1,
                "Họ tên": g.name,
                "Mối quan hệ": g.relationship,
                "Địa chỉ": g.address || '',
                "Số tiền / Quà tặng": g.gift_type === 'gold' ? amountStr : Number(g.amount) || g.amount,
                "Loại sự kiện": g.event_type || 'Khác',
                "Ghi chú": g.notes || '',
                "Ngày nhận": formatDate(g.date),
                "Trạng thái trả lễ": g.status === 'returned' ? 'Đã trả lễ lại họ' : 'Chưa đi lại'
            };
        });
        const wsReceived = XLSX.utils.json_to_sheet(dataReceived);
        
        // Auto column widths
        const colWidths = [
            { wch: 8 },  // STT
            { wch: 26 }, // Họ tên
            { wch: 18 }, // Mối quan hệ
            { wch: 24 }, // Địa chỉ
            { wch: 24 }, // Số tiền / Quà tặng
            { wch: 18 }, // Loại sự kiện
            { wch: 30 }, // Ghi chú
            { wch: 16 }, // Ngày nhận
            { wch: 22 }  // Trạng thái trả lễ
        ];
        wsReceived['!cols'] = colWidths;
        
        // Apply styling
        applyExcelStyles(wsReceived);
        
        XLSX.utils.book_append_sheet(wb, wsReceived, "Tiền tôi nhận");
    }
    
    if (type === 'all' || type === 'sent') {
        const activeSent = state.sentGifts.filter(g => !g.deleted_at);
        const dataSent = activeSent.map((g, idx) => {
            const amountStr = g.gift_type === 'gold' ? `${g.gold_amount} chỉ vàng (${g.gold_type || 'Vàng'})` : g.amount;
            return {
                "STT": idx + 1,
                "Họ tên": g.name,
                "Mối quan hệ": g.relationship,
                "Địa chỉ": g.address || '',
                "Số tiền / Quà tặng": g.gift_type === 'gold' ? amountStr : Number(g.amount) || g.amount,
                "Loại sự kiện": g.event_type || 'Khác',
                "Ghi chú": g.notes || '',
                "Ngày mừng": formatDate(g.date)
            };
        });
        const wsSent = XLSX.utils.json_to_sheet(dataSent);
        
        // Auto column widths
        const colWidths = [
            { wch: 8 },  // STT
            { wch: 26 }, // Họ tên
            { wch: 18 }, // Mối quan hệ
            { wch: 24 }, // Địa chỉ
            { wch: 24 }, // Số tiền / Quà tặng
            { wch: 18 }, // Loại sự kiện
            { wch: 30 }, // Ghi chú
            { wch: 16 }  // Ngày mừng
        ];
        wsSent['!cols'] = colWidths;
        
        // Apply styling
        applyExcelStyles(wsSent);
        
        XLSX.utils.book_append_sheet(wb, wsSent, "Tiền tôi mừng");
    }
    
    try {
        XLSX.writeFile(wb, filename);
        showToast("Đã xuất file Excel (.xlsx) thành công!");
    } catch (err) {
        console.error(err);
        showToast("Xuất file Excel thất bại!", "error");
    }
}
window.handleExportExcel = handleExportExcel;

function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const isExcel = file.name.endsWith('.xlsx');
    const reader = new FileReader();
    
    reader.onload = async function(evt) {
        try {
            if (isExcel) {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let importedReceived = [];
                let importedSent = [];
                
                // Helper to get row value using synonyms and case insensitivity
                function getRowValue(row, possibleKeys) {
                    for (const key of possibleKeys) {
                        if (row[key] !== undefined && row[key] !== null) {
                            return row[key];
                        }
                    }
                    const lowerKeys = possibleKeys.map(k => k.toLowerCase());
                    for (const actualKey in row) {
                        const cleanKey = actualKey.trim().toLowerCase();
                        if (lowerKeys.includes(cleanKey)) {
                            return row[actualKey];
                        }
                    }
                    return undefined;
                }

                // Helper to format Excel/normal dates safely
                function formatExcelDate(dateVal) {
                    if (!dateVal) return new Date().toISOString().slice(0, 10);
                    if (typeof dateVal === 'number' || (!isNaN(dateVal) && !isNaN(parseFloat(dateVal)))) {
                        try {
                            const date = new Date(Math.round((Number(dateVal) - 25569) * 86400 * 1000));
                            if (!isNaN(date.getTime())) {
                                return date.toISOString().slice(0, 10);
                            }
                        } catch (e) {
                            console.error("Lỗi định dạng ngày số Excel:", e);
                        }
                    }
                    const dateStr = String(dateVal).trim();
                    if (dateStr) {
                        const dmyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                        if (dmyMatch) {
                            const day = dmyMatch[1].padStart(2, '0');
                            const month = dmyMatch[2].padStart(2, '0');
                            const year = dmyMatch[3];
                            return `${year}-${month}-${day}`;
                        }
                        const ymdMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
                        if (ymdMatch) {
                            const year = ymdMatch[1];
                            const month = ymdMatch[2].padStart(2, '0');
                            const day = ymdMatch[3].padStart(2, '0');
                            return `${year}-${month}-${day}`;
                        }
                        const parsedDate = new Date(dateStr);
                        if (!isNaN(parsedDate.getTime())) {
                            return parsedDate.toISOString().slice(0, 10);
                        }
                    }
                    return new Date().toISOString().slice(0, 10);
                }

                // Helper to find header row index and headers
                function findHeaderRow(ws) {
                    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    const nameKeywords = ['họ tên', 'họ và tên', 'họ & tên', 'tên', 'tên khách', 'người nhận', 'người gửi', 'người mừng'];
                    const otherKeywords = [
                        'stt', 'số thứ tự',
                        'số tiền', 'quà tặng', 'số tiền / quà tặng', 'tiền',
                        'địa chỉ', 'quê quán', 'địa chỉ / quê quán', 'nơi ở',
                        'ghi chú', 'note', 'ghi chú thêm',
                        'mối quan hệ', 'quan hệ',
                        'sự kiện', 'ngày', 'trạng thái'
                    ];
                    
                    for (let i = 0; i < Math.min(rows.length, 30); i++) {
                        const row = rows[i];
                        if (Array.isArray(row)) {
                            const cellStrings = row.map(h => h !== null && h !== undefined ? String(h).trim().toLowerCase() : '');
                            const hasNameHeader = cellStrings.some(h => nameKeywords.includes(h));
                            if (hasNameHeader) {
                                const hasOtherHeader = cellStrings.some(h => otherKeywords.some(ok => h.includes(ok)));
                                if (hasOtherHeader || cellStrings.filter(Boolean).length >= 2) {
                                    return { index: i, headers: cellStrings };
                                }
                            }
                        }
                    }
                    return null;
                }

                // Detect sheets to parse
                let sheetsToParse = [];
                for (const name of workbook.SheetNames) {
                    const ws = workbook.Sheets[name];
                    const headerInfo = findHeaderRow(ws);
                    if (headerInfo) {
                        const headers = headerInfo.headers;
                        let type = "received"; // Default
                        
                        if (name === "Tiền tôi nhận") {
                            type = "received";
                        } else if (name === "Tiền tôi mừng") {
                            type = "sent";
                        } else {
                            const isReceived = headers.some(h => ['trạng thái trả lễ', 'ngày nhận', 'trạng thái'].includes(h));
                            const isSent = headers.some(h => ['loại sự kiện', 'ngày mừng', 'ngày chi', 'sự kiện'].includes(h));
                            if (isReceived) {
                                type = "received";
                            } else if (isSent) {
                                type = "sent";
                            } else {
                                const lowerName = name.toLowerCase();
                                if (lowerName.includes("chi") || lowerName.includes("mừng") || lowerName.includes("sent")) {
                                    type = "sent";
                                } else {
                                    type = "received";
                                }
                            }
                        }
                        sheetsToParse.push({ sheetName: name, type: type, headerIndex: headerInfo.index });
                    }
                }

                // Process detected sheets
                for (const item of sheetsToParse) {
                    const ws = workbook.Sheets[item.sheetName];
                    const rows = XLSX.utils.sheet_to_json(ws, { range: item.headerIndex });
                    
                    if (item.type === "received") {
                        importedReceived = rows.map(r => {
                            const rowName = getRowValue(r, ['Họ tên', 'Họ và Tên', 'Họ & Tên', 'Tên', 'Họ và tên', 'Họ tên người nhận', 'Họ và tên người nhận', 'Tên khách', 'Khách hàng', 'Người nhận']) || "";
                            if (!rowName) return null;
                            const nameStr = String(rowName).trim();
                            if (!nameStr) return null;
                            
                            let giftType = 'money';
                            let amount = 0;
                            let goldAmount = 0;
                            let goldType = '';
                            
                            const rawAmount = getRowValue(r, ['Số tiền / Quà tặng', 'Số tiền', 'Số tiền mừng', 'Tiền', 'Quà tặng', 'Tiền nhận', 'Tiền mừng', 'Tiền chi', 'Số tiền chi']);
                            if (rawAmount !== undefined && rawAmount !== null) {
                                if (typeof rawAmount === 'number') {
                                    amount = rawAmount;
                                } else {
                                    const rawAmountStr = String(rawAmount).trim();
                                    const lowerAmountStr = rawAmountStr.toLowerCase();
                                    if (lowerAmountStr.includes("chỉ") || lowerAmountStr.includes("chi") || lowerAmountStr.includes("vàng") || lowerAmountStr.includes("vang")) {
                                        giftType = 'gold';
                                        const match = rawAmountStr.match(/([\d\.,]+)\s*(?:chỉ|chi|vàng|vang)\s*(?:\((.*)\))?/i);
                                        if (match) {
                                            const valStr = match[1].replace(',', '.');
                                            goldAmount = Number(valStr) || 0;
                                            goldType = match[2] || 'Vàng';
                                        } else {
                                            const valStr = rawAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                            goldAmount = Number(valStr) || 0;
                                            goldType = 'Vàng';
                                        }
                                    } else if (lowerAmountStr.includes("tr") || lowerAmountStr.includes("triệu") || lowerAmountStr.includes("trieu") || lowerAmountStr.includes("m")) {
                                        const valStr = lowerAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                        amount = (parseFloat(valStr) || 0) * 1000000;
                                    } else if (lowerAmountStr.includes("k") || lowerAmountStr.includes("nghìn") || lowerAmountStr.includes("ngàn") || lowerAmountStr.includes("ng")) {
                                        const valStr = lowerAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                        amount = (parseFloat(valStr) || 0) * 1000;
                                    } else {
                                        amount = Number(rawAmountStr.replace(/[^\d]/g, '')) || 0;
                                    }
                                }
                            }
                            
                            const dateVal = getRowValue(r, ['Ngày nhận', 'Ngày', 'Ngày chi', 'Ngày nhận lễ']);
                            const dateStr = formatExcelDate(dateVal);
                            
                            const rawStatus = getRowValue(r, ['Trạng thái trả lễ', 'Trạng thái', 'Trả lễ', 'Đã trả lễ', 'Đã trả']);
                            const statusVal = (rawStatus && (String(rawStatus).toLowerCase().includes('đã') || String(rawStatus).toLowerCase().includes('returned') || String(rawStatus).toLowerCase().trim() === 'x' || String(rawStatus).toLowerCase().trim() === 'y' || String(rawStatus).toLowerCase().trim() === 'yes')) ? 'returned' : 'unreturned';
                            
                            return {
                                id: generateId(),
                                name: nameStr,
                                relationship: getRowValue(r, ['Mối quan hệ', 'Quan hệ', 'Quan hệ gia đình', 'Quan hệ bạn bè', 'Phân loại']) || 'Khác',
                                gift_type: giftType,
                                amount: amount,
                                gold_amount: goldAmount,
                                gold_type: goldType,
                                event_type: getRowValue(r, ['Loại sự kiện', 'Sự kiện', 'Tên sự kiện', 'Dịp']) || 'Khác',
                                date: dateStr,
                                status: statusVal,
                                notes: getRowValue(r, ['Ghi chú', 'Ghi chú thêm', 'Note', 'Chi tiết']) || '',
                                address: getRowValue(r, ['Địa chỉ', 'Quê quán', 'Địa chỉ / Quê quán', 'Nơi ở', 'Thành phố', 'Tỉnh']) || '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                        }).filter(Boolean);
                    } else if (item.type === "sent") {
                        importedSent = rows.map(r => {
                            const rowName = getRowValue(r, ['Họ tên', 'Họ và Tên', 'Họ & Tên', 'Tên', 'Họ và tên', 'Họ tên người mừng', 'Họ và tên người mừng', 'Tên khách', 'Khách hàng', 'Người mừng', 'Người gửi']) || "";
                            if (!rowName) return null;
                            const nameStr = String(rowName).trim();
                            if (!nameStr) return null;
                            
                            let giftType = 'money';
                            let amount = 0;
                            let goldAmount = 0;
                            let goldType = '';
                            
                            const rawAmount = getRowValue(r, ['Số tiền / Quà tặng', 'Số tiền', 'Số tiền mừng', 'Tiền', 'Quà tặng', 'Tiền mừng', 'Tiền chi', 'Số tiền chi']);
                            if (rawAmount !== undefined && rawAmount !== null) {
                                if (typeof rawAmount === 'number') {
                                    amount = rawAmount;
                                } else {
                                    const rawAmountStr = String(rawAmount).trim();
                                    const lowerAmountStr = rawAmountStr.toLowerCase();
                                    if (lowerAmountStr.includes("chỉ") || lowerAmountStr.includes("chi") || lowerAmountStr.includes("vàng") || lowerAmountStr.includes("vang")) {
                                        giftType = 'gold';
                                        const match = rawAmountStr.match(/([\d\.,]+)\s*(?:chỉ|chi|vàng|vang)\s*(?:\((.*)\))?/i);
                                        if (match) {
                                            const valStr = match[1].replace(',', '.');
                                            goldAmount = Number(valStr) || 0;
                                            goldType = match[2] || 'Vàng';
                                        } else {
                                            const valStr = rawAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                            goldAmount = Number(valStr) || 0;
                                            goldType = 'Vàng';
                                        }
                                    } else if (lowerAmountStr.includes("tr") || lowerAmountStr.includes("triệu") || lowerAmountStr.includes("trieu") || lowerAmountStr.includes("m")) {
                                        const valStr = lowerAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                        amount = (parseFloat(valStr) || 0) * 1000000;
                                    } else if (lowerAmountStr.includes("k") || lowerAmountStr.includes("nghìn") || lowerAmountStr.includes("ngàn") || lowerAmountStr.includes("ng")) {
                                        const valStr = lowerAmountStr.replace(/[^\d\.,]/g, '').replace(',', '.');
                                        amount = (parseFloat(valStr) || 0) * 1000;
                                    } else {
                                        amount = Number(rawAmountStr.replace(/[^\d]/g, '')) || 0;
                                    }
                                }
                            }
                            
                            const dateVal = getRowValue(r, ['Ngày mừng', 'Ngày', 'Ngày chi', 'Ngày đi']);
                            const dateStr = formatExcelDate(dateVal);
                            
                            return {
                                id: generateId(),
                                name: nameStr,
                                relationship: getRowValue(r, ['Mối quan hệ', 'Quan hệ', 'Quan hệ gia đình', 'Quan hệ bạn bè', 'Phân loại']) || 'Khác',
                                gift_type: giftType,
                                amount: amount,
                                gold_amount: goldAmount,
                                gold_type: goldType,
                                event_type: getRowValue(r, ['Loại sự kiện', 'Sự kiện', 'Tên sự kiện', 'Dịp']) || 'Khác',
                                date: dateStr,
                                notes: getRowValue(r, ['Ghi chú', 'Ghi chú thêm', 'Note', 'Chi tiết']) || '',
                                address: getRowValue(r, ['Địa chỉ', 'Quê quán', 'Nơi diễn ra sự kiện', 'Địa chỉ / Nơi diễn ra sự kiện', 'Địa chỉ / Quê quán', 'Nơi ở', 'Thành phố', 'Tỉnh']) || '',
                                created_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            };
                        }).filter(Boolean);
                    }
                }
                
                // Auto-scale amounts if the sheet is written in "thousands of VND" unit
                const nonZeroRec = importedReceived.filter(r => r.gift_type === 'money' && r.amount > 0);
                if (nonZeroRec.length > 0) {
                    const under20kCount = nonZeroRec.filter(r => r.amount < 20000).length;
                    if (under20kCount / nonZeroRec.length > 0.7) {
                        importedReceived.forEach(r => {
                            if (r.gift_type === 'money') {
                                r.amount *= 1000;
                            }
                        });
                    }
                }
                
                const nonZeroSent = importedSent.filter(r => r.gift_type === 'money' && r.amount > 0);
                if (nonZeroSent.length > 0) {
                    const under20kCount = nonZeroSent.filter(r => r.amount < 20000).length;
                    if (under20kCount / nonZeroSent.length > 0.7) {
                        importedSent.forEach(r => {
                            if (r.gift_type === 'money') {
                                r.amount *= 1000;
                            }
                        });
                    }
                }
                
                if (importedReceived.length === 0 && importedSent.length === 0) {
                    showToast("Không tìm thấy dữ liệu hợp lệ trong file Excel!", "error");
                    document.getElementById('importFileInput').value = '';
                    return;
                }
                
                let msg = "Đã giải mã thành công file Excel!";
                if (importedReceived.length > 0) msg += `\n- ${importedReceived.length} dòng Tiền tôi nhận`;
                if (importedSent.length > 0) msg += `\n- ${importedSent.length} dòng Tiền tôi mừng`;
                msg += "\n\nBạn có chắc chắn muốn nhập dữ liệu này vào ứng dụng không?";
                
                if (!confirm(msg)) {
                    document.getElementById('importFileInput').value = '';
                    return;
                }
                
                const merge = confirm("Bạn có muốn GỘP (Merge) dữ liệu từ file Excel vào dữ liệu hiện tại không?\n\n- Chọn 'OK' để GỘP (giữ nguyên dữ liệu cũ, chỉ thêm dữ liệu mới).\n- Chọn 'Cancel' để mở thêm lựa chọn Ghi đè hoặc Hủy bỏ.");
                
                let action = 'merge';
                if (!merge) {
                    const overwrite = confirm("Bạn đã chọn không gộp dữ liệu. Bạn có chắc chắn muốn GHI ĐÈ (thay thế hoàn toàn) dữ liệu hiện tại bằng dữ liệu mới không?\n\n- Chọn 'OK' để GHI ĐÈ (Dữ liệu cũ trên thiết bị sẽ bị XÓA HOÀN TOÀN).\n- Chọn 'Cancel' để HỦY BỎ (Không thực hiện nhập dữ liệu nữa, giữ nguyên dữ liệu hiện tại).");
                    if (overwrite) {
                        action = 'overwrite';
                    } else {
                        document.getElementById('importFileInput').value = '';
                        return;
                    }
                }
                
                if (action === 'merge') {
                    // Helper to merge Excel items avoiding duplicates by comparing key fields
                    const mergeExcelList = (existingList, excelList) => {
                        const merged = [...existingList];
                        excelList.forEach(excelItem => {
                            const isDuplicate = existingList.some(existItem => {
                                const matchName = existItem.name.trim().toLowerCase() === excelItem.name.trim().toLowerCase();
                                const matchAmount = existItem.amount === excelItem.amount;
                                const matchGiftType = existItem.gift_type === excelItem.gift_type;
                                const matchGoldAmount = existItem.gold_amount === excelItem.gold_amount;
                                // Compare only date part YYYY-MM-DD
                                const matchDate = (existItem.date || '').slice(0, 10) === (excelItem.date || '').slice(0, 10);
                                const matchEventType = (existItem.event_type || 'Khác').trim().toLowerCase() === (excelItem.event_type || 'Khác').trim().toLowerCase();
                                return matchName && matchAmount && matchGiftType && matchGoldAmount && matchDate && matchEventType;
                            });
                            if (!isDuplicate) {
                                merged.push(excelItem);
                            }
                        });
                        return merged;
                    };

                    if (importedReceived.length > 0) {
                        state.receivedGifts = mergeExcelList(state.receivedGifts, importedReceived);
                    }
                    if (importedSent.length > 0) {
                        state.sentGifts = mergeExcelList(state.sentGifts, importedSent);
                    }
                } else if (action === 'overwrite') {
                    state.receivedGifts = importedReceived;
                    state.sentGifts = importedSent;
                    state.lastResetTime = new Date().toISOString();
                }
                
                await saveLocalState();
                renderAll();
                showToast("Đã nhập dữ liệu từ Excel thành công!");
                performSync(true);
            } else {
                // Read JSON backup
                const data = JSON.parse(evt.target.result);
                if (data.app_id !== "hieu_hy_gift_ledger" || !data.encrypted_payload) {
                    showToast("File backup không đúng định dạng!", "error");
                    return;
                }
                
                const decrypted = await decrypt(data.encrypted_payload, state.masterPassword);
                const parsed = JSON.parse(decrypted);
                
                const backupType = data.backup_type || 'all';
                
                let msgJson = "Giải mã file backup thành công!";
                if (backupType === 'received') msgJson += ` (Chỉ chứa dữ liệu 'Tiền tôi nhận')`;
                else if (backupType === 'sent') msgJson += ` (Chỉ chứa dữ liệu 'Tiền tôi mừng')`;
                msgJson += "\n\nBạn có chắc chắn muốn nhập dữ liệu này vào ứng dụng không?";
                
                if (!confirm(msgJson)) {
                    document.getElementById('importFileInput').value = '';
                    return;
                }
                
                if (backupType === 'received') {
                    const merge = confirm("Bạn có muốn GỘP (Merge) dữ liệu mới vào dữ liệu hiện tại không?\n\n- Chọn 'OK' để GỘP phần 'Tiền tôi nhận'.\n- Chọn 'Cancel' để mở thêm lựa chọn Ghi đè hoặc Hủy bỏ.");
                    let action = 'merge';
                    if (!merge) {
                        const overwrite = confirm("Bạn đã chọn không gộp dữ liệu. Bạn có muốn GHI ĐÈ phần 'Tiền tôi nhận' bằng dữ liệu mới không (giữ nguyên phần 'Tiền tôi mừng')?\n\n- Chọn 'OK' để GHI ĐÈ (Dữ liệu 'Tiền tôi nhận' cũ sẽ bị XÓA).\n- Chọn 'Cancel' để HỦY BỎ.");
                        if (overwrite) {
                            action = 'overwrite';
                        } else {
                            document.getElementById('importFileInput').value = '';
                            return;
                        }
                    }
                    if (action === 'merge') {
                        state.receivedGifts = mergeLists(state.receivedGifts, parsed.receivedGifts || []);
                    } else {
                        state.receivedGifts = parsed.receivedGifts || [];
                        state.lastResetTime = new Date().toISOString();
                    }
                } else if (backupType === 'sent') {
                    const merge = confirm("Bạn có muốn GỘP (Merge) dữ liệu mới vào dữ liệu hiện tại không?\n\n- Chọn 'OK' để GỘP phần 'Tiền tôi mừng'.\n- Chọn 'Cancel' để mở thêm lựa chọn Ghi đè hoặc Hủy bỏ.");
                    let action = 'merge';
                    if (!merge) {
                        const overwrite = confirm("Bạn đã chọn không gộp dữ liệu. Bạn có muốn GHI ĐÈ phần 'Tiền tôi mừng' bằng dữ liệu mới không (giữ nguyên phần 'Tiền tôi nhận')?\n\n- Chọn 'OK' để GHI ĐÈ (Dữ liệu 'Tiền tôi mừng' cũ sẽ bị XÓA).\n- Chọn 'Cancel' để HỦY BỎ.");
                        if (overwrite) {
                            action = 'overwrite';
                        } else {
                            document.getElementById('importFileInput').value = '';
                            return;
                        }
                    }
                    if (action === 'merge') {
                        state.sentGifts = mergeLists(state.sentGifts, parsed.sentGifts || []);
                    } else {
                        state.sentGifts = parsed.sentGifts || [];
                        state.lastResetTime = new Date().toISOString();
                    }
                } else {
                    const merge = confirm("Bạn có muốn GỘP (Merge) dữ liệu mới vào dữ liệu hiện tại không?\n\n- Chọn 'OK' để GỘP cả hai phần.\n- Chọn 'Cancel' để mở thêm lựa chọn Ghi đè hoặc Hủy bỏ.");
                    let action = 'merge';
                    if (!merge) {
                        const overwrite = confirm("Bạn đã chọn không gộp dữ liệu. Bạn có muốn GHI ĐÈ hoàn toàn tất cả dữ liệu hiện tại bằng dữ liệu mới không?\n\n- Chọn 'OK' để GHI ĐÈ (Toàn bộ dữ liệu cũ sẽ bị XÓA).\n- Chọn 'Cancel' để HỦY BỎ.");
                        if (overwrite) {
                            action = 'overwrite';
                        } else {
                            document.getElementById('importFileInput').value = '';
                            return;
                        }
                    }
                    if (action === 'merge') {
                        state.receivedGifts = mergeLists(state.receivedGifts, parsed.receivedGifts || []);
                        state.sentGifts = mergeLists(state.sentGifts, parsed.sentGifts || []);
                    } else {
                        state.receivedGifts = parsed.receivedGifts || [];
                        state.sentGifts = parsed.sentGifts || [];
                        state.lastResetTime = new Date().toISOString();
                    }
                }
                
                await saveLocalState();
                renderAll();
                showToast("Đã nhập dữ liệu từ backup thành công!");
                performSync(true);
            }
        } catch (err) {
            console.error(err);
            if (isExcel) {
                showToast("Đọc file Excel thất bại!", "error");
            } else {
                showToast("Giải mã file thất bại. Mật khẩu chính hiện tại có thể khác với mật khẩu lúc tạo file backup!", "error");
            }
        }
    };
    
    if (isExcel) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
}

// --- Modals Control & Record Submission ---

function updateRecTypeCustomVisibility() {
    const recType = document.getElementById('recType').value;
    const customGroup = document.getElementById('recTypeCustomGroup');
    const customInput = document.getElementById('recTypeCustom');
    if (recType === 'Khác') {
        customGroup.style.display = 'block';
        customInput.required = true;
    } else {
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

function updateSentTypeCustomVisibility() {
    const sentType = document.getElementById('sentType').value;
    const customGroup = document.getElementById('sentTypeCustomGroup');
    const customInput = document.getElementById('sentTypeCustom');
    if (sentType === 'Khác') {
        customGroup.style.display = 'block';
        customInput.required = true;
    } else {
        customGroup.style.display = 'none';
        customInput.required = false;
        customInput.value = '';
    }
}

window.closeModal = function(modalId) {
    document.getElementById(modalId).classList.remove('active');
};

function setupModalListeners() {
    // Quick add button
    document.getElementById('quickAddBtn').addEventListener('click', () => {
        document.getElementById('quickAddModal').classList.add('active');
    });
    
    document.getElementById('chooseAddReceivedBtn').addEventListener('click', () => {
        closeModal('quickAddModal');
        // Reset received form
        document.getElementById('receivedForm').reset();
        document.getElementById('receivedId').value = '';
        document.getElementById('recDate').value = new Date().toISOString().slice(0, 10);
        document.getElementById('recStatus').checked = false;
        document.getElementById('recStatusLabel').innerText = 'Chưa đi mừng cưới lại họ';
        updateRecTypeCustomVisibility();
        
        // Reset gold fields
        const radioEl = document.querySelector('input[name="recGiftType"][value="money"]');
        if (radioEl) radioEl.checked = true;
        toggleRecGiftType('money');
        
        document.getElementById('receivedModalTitle').innerText = 'Thêm khoản nhận mừng cưới';
        document.getElementById('receivedModal').classList.add('active');
    });
    
    document.getElementById('chooseAddSentBtn').addEventListener('click', () => {
        closeModal('quickAddModal');
        // Reset sent form
        document.getElementById('sentForm').reset();
        document.getElementById('sentId').value = '';
        document.getElementById('sentDate').value = new Date().toISOString().slice(0, 10);
        updateSentTypeCustomVisibility();
        
        // Reset gold fields
        const radioEl = document.querySelector('input[name="sentGiftType"][value="money"]');
        if (radioEl) radioEl.checked = true;
        toggleSentGiftType('money');
        
        document.getElementById('sentModalTitle').innerText = 'Thêm khoản đi mừng';
        document.getElementById('sentModal').classList.add('active');
    });
    
    // Status Switch visual text changer
    const recStatusEl = document.getElementById('recStatus');
    if (recStatusEl) {
        recStatusEl.addEventListener('change', (e) => {
            document.getElementById('recStatusLabel').innerText = e.target.checked 
                ? 'Đã đi mừng cưới lại họ' 
                : 'Chưa đi mừng cưới lại họ';
        });
    }
    
    // Setup input formatting
    setupAmountFormatting(document.getElementById('recAmount'));
    setupAmountFormatting(document.getElementById('sentAmount'));

    // Bind Gift Type Toggles
    document.querySelectorAll('input[name="recGiftType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleRecGiftType(e.target.value);
        });
    });
    
    document.querySelectorAll('input[name="sentGiftType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            toggleSentGiftType(e.target.value);
        });
    });

    const recTypeSelect = document.getElementById('recType');
    if (recTypeSelect) {
        recTypeSelect.addEventListener('change', updateRecTypeCustomVisibility);
    }
    const sentTypeSelect = document.getElementById('sentType');
    if (sentTypeSelect) {
        sentTypeSelect.addEventListener('change', updateSentTypeCustomVisibility);
    }

    // Choose import from notes button listener
    document.getElementById('chooseImportNotesBtn').addEventListener('click', () => {
        closeModal('quickAddModal');
        document.getElementById('importNotesForm').reset();
        const eventTypeGroup = document.getElementById('importNotesEventTypeGroup');
        if (eventTypeGroup) {
            eventTypeGroup.style.display = 'block';
        }
        document.getElementById('importNotesPreviewContainer').style.display = 'none';
        document.getElementById('importNotesModal').classList.add('active');
    });

    // Toggle event type select visibility based on flow selection
    const importNotesFlow = document.getElementById('importNotesFlow');
    if (importNotesFlow) {
        importNotesFlow.addEventListener('change', () => {
            const eventTypeGroup = document.getElementById('importNotesEventTypeGroup');
            if (eventTypeGroup) {
                eventTypeGroup.style.display = 'block';
            }
        });
    }

    document.getElementById('btnPreviewImportNotes').addEventListener('click', handleNotesPreview);

    // Bind iPhone Notes file drag-and-drop / upload
    const notesDragDropZone = document.getElementById('notesDragDropZone');
    const notesFileInput = document.getElementById('notesFileInput');
    
    if (notesDragDropZone && notesFileInput) {
        notesDragDropZone.addEventListener('click', () => {
            notesFileInput.click();
        });
        
        notesDragDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            notesDragDropZone.style.borderColor = 'var(--primary-color)';
            notesDragDropZone.style.background = 'rgba(99, 102, 241, 0.04)';
        });
        
        notesDragDropZone.addEventListener('dragleave', () => {
            notesDragDropZone.style.borderColor = 'var(--border-color)';
            notesDragDropZone.style.background = 'var(--bg-secondary)';
        });
        
        notesDragDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            notesDragDropZone.style.borderColor = 'var(--border-color)';
            notesDragDropZone.style.background = 'var(--bg-secondary)';
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleNotesFileUpload(e.dataTransfer.files[0]);
            }
        });
        
        notesFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleNotesFileUpload(e.target.files[0]);
            }
        });
    }

    // Handle forms submit
    document.getElementById('receivedForm').addEventListener('submit', handleReceivedSubmit);
    document.getElementById('sentForm').addEventListener('submit', handleSentSubmit);
    document.getElementById('importNotesForm').addEventListener('submit', handleNotesImportSubmit);
}

function handleNotesFileUpload(file) {
    const reader = new FileReader();
    reader.onload = function(evt) {
        let content = evt.target.result;
        
        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/html');
            
            let textLines = [];
            const paragraphs = doc.querySelectorAll('p, div, li, tr');
            if (paragraphs.length > 0) {
                paragraphs.forEach(p => {
                    const txt = p.innerText || p.textContent;
                    if (txt && txt.trim()) {
                        textLines.push(txt.trim());
                    }
                });
                content = textLines.join('\n');
            } else {
                content = doc.body.innerText || doc.body.textContent || "";
            }
        }
        
        document.getElementById('importNotesText').value = content;
        showToast(`Đã tải file ghi chú: ${file.name}`);
        
        // Auto trigger preview
        handleNotesPreview();
    };
    reader.readAsText(file, 'UTF-8');
}

// Parse Notes text area dynamically
function parseNotesText(text, isReceivedFlow, selectedRelationship = 'Khác', selectedEventType = 'Đám cưới', defaultNotes = 'Nhập nhanh từ Ghi chú') {
    const lines = text.split('\n');
    const results = [];
    
    let currentRelationshipContext = selectedRelationship;
    let currentEventTypeContext = selectedEventType;
    let currentNotesContext = '';
    
    const defaultDate = new Date().toISOString().slice(0, 10);
    
    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) return;
        
        // Strip leading bullets/lists characters like *, -, +, •, 1., 2. etc.
        trimmed = trimmed.replace(/^[\s*•\-+]+/, '').trim();
        // Also strip numbers with dot at the start (e.g. "1. Nguyễn Văn A 500k" -> "Nguyễn Văn A 500k")
        trimmed = trimmed.replace(/^\d+[\s.)-]+\s*/, '').trim();
        
        if (!trimmed) return;
        
        // Check if the line is a section header or metadata
        // e.g. "Ghi chú: Hỗ trợ tư pháp Sóc Sơn", "Loại sự kiện: đám cưới", "Mối quan hệ: Họ hàng"
        const cleanLine = trimmed;
        
        // 1. Check relationship headers
        const relMatch = cleanLine.match(/^(Họ hàng|Bạn học|Đồng nghiệp|Hàng xóm|Bạn xã hội|Bạn bè|Chính quyền|Chính quyên|Chinh quyen|Khác)\s*:/i);
        if (relMatch) {
            let rel = relMatch[1].trim();
            const relLower = rel.toLowerCase();
            if (relLower === 'bạn bè') {
                currentRelationshipContext = 'Bạn xã hội';
            } else if (relLower === 'chính quyền' || relLower === 'chính quyên' || relLower === 'chinh quyen') {
                currentRelationshipContext = 'Chính quyền';
            } else {
                currentRelationshipContext = rel.charAt(0).toUpperCase() + rel.slice(1);
            }
            return;
        }
        
        // 2. Check notes headers
        const notesMatch = cleanLine.match(/^(Ghi chú|Ghi chu)\s*:\s*(.*)/i);
        if (notesMatch) {
            currentNotesContext = notesMatch[2].trim().replace(/:$/, '').trim();
            return;
        }
        
        // 3. Check event type headers
        const eventMatch = cleanLine.match(/^(Loại sự kiện|Sự kiện|Loai su kien|Su kien)\s*:\s*(.*)/i);
        if (eventMatch) {
            let ev = eventMatch[2].trim().replace(/:$/, '').trim();
            if (ev.toLowerCase().includes('cưới') || ev.toLowerCase().includes('cuoi')) {
                currentEventTypeContext = 'Đám cưới';
            } else if (ev.toLowerCase().includes('hiếu') || ev.toLowerCase().includes('hieu')) {
                currentEventTypeContext = 'Đám hiếu';
            } else if (ev.toLowerCase().includes('ốm') || ev.toLowerCase().includes('om')) {
                currentEventTypeContext = 'Thăm ốm';
            } else if (ev.toLowerCase().includes('gia')) {
                currentEventTypeContext = 'Tân gia';
            } else {
                currentEventTypeContext = 'Khác';
            }
            return;
        }
        
        // Check for gold patterns first to avoid overlap with money patterns
        const goldRegex = /(?:[\d.,]+)\s*(?:chỉ vàng|chỉ|chi vang|chi|lượng|cây)\s*$/i;
        const goldMatch = trimmed.match(goldRegex);
        
        // Check for standard money patterns
        const moneyRegex = /(?:[\d.,]+)\s*(?:k|tr|triệu|trieu|đ|d)?\s*$/i;
        const moneyMatch = trimmed.match(moneyRegex);
        
        // 4. Check if it's a section header ending with colon (and no money/gold pattern)
        if (trimmed.endsWith(':') && !goldMatch && !moneyMatch) {
            currentNotesContext = trimmed.replace(/:$/, '').trim();
            return;
        }
        
        let name = '';
        let amount = 0;
        let gift_type = 'money';
        let gold_amount = 0;
        let gold_type = '';
        
        if (goldMatch) {
            gift_type = 'gold';
            const rawGoldStr = goldMatch[0].trim().toLowerCase();
            name = trimmed.substring(0, goldMatch.index).trim();
            name = name.replace(/[-:,]+$/, '').trim();
            
            let cleanNumStr = rawGoldStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
            gold_amount = parseFloat(cleanNumStr) || 0;
            gold_type = rawGoldStr.includes('lượng') || rawGoldStr.includes('cây') ? 'Lượng vàng' : 'Chỉ vàng';
        } else if (moneyMatch) {
            gift_type = 'money';
            const rawAmountStr = moneyMatch[0].trim().toLowerCase();
            name = trimmed.substring(0, moneyMatch.index).trim();
            name = name.replace(/[-:,]+$/, '').trim();
            
            // Extract numeric value
            let cleanNumStr = rawAmountStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
            let val = parseFloat(cleanNumStr.replace(/\./g, ''));
            
            // Check for floating decimal like 1.5 (if it has less than 3 digits after the dot)
            if (cleanNumStr.includes('.')) {
                const parts = cleanNumStr.split('.');
                if (parts.length === 2 && parts[1].length < 3) {
                    val = parseFloat(cleanNumStr);
                }
            }
            
            if (rawAmountStr.includes('k')) {
                amount = val * 1000;
            } else if (rawAmountStr.includes('tr') || rawAmountStr.includes('triệu') || rawAmountStr.includes('trieu')) {
                amount = val * 1000000;
            } else {
                if (val > 0 && val < 10000) {
                    amount = val * 1000;
                } else {
                    amount = val;
                }
            }
        } else {
            gift_type = 'money';
            name = trimmed;
            amount = 0;
        }
        
        if (name) {
            const newRecord = {
                id: generateId(),
                name,
                gift_type,
                amount,
                gold_amount,
                gold_type,
                relationship: currentRelationshipContext,
                date: defaultDate,
                notes: currentNotesContext || defaultNotes,
                status: 'pending',
                updated_at: new Date().toISOString()
            };
            newRecord.event_type = currentEventTypeContext;
            results.push(newRecord);
        }
    });
    
    return results;
}

// Show preview in table
let tempParsedNotes = [];
function handleNotesPreview() {
    const text = document.getElementById('importNotesText').value.trim();
    if (!text) {
        showToast("Vui lòng nhập nội dung ghi chú!", "warning");
        return;
    }
    
    const flow = document.getElementById('importNotesFlow').value;
    const isReceived = flow === 'received';
    
    const selectedRelationship = document.getElementById('importNotesRelationship').value;
    const selectedEventType = document.getElementById('importNotesEventType').value;
    const defaultNotes = document.getElementById('importNotesDefaultNotes').value.trim() || 'Nhập nhanh từ Ghi chú';
    
    tempParsedNotes = parseNotesText(text, isReceived, selectedRelationship, selectedEventType, defaultNotes);
    
    const tbody = document.getElementById('importNotesPreviewBody');
    tbody.innerHTML = '';
    
    tempParsedNotes.forEach(item => {
        const row = document.createElement('tr');
        const displayVal = item.gift_type === 'gold' 
            ? `${item.gold_amount} chỉ (${item.gold_type})` 
            : formatVND(item.amount);
            
        // Event type badge styling
        let evClass = 'badge-event-other';
        const eventName = item.event_type || 'Khác';
        if (eventName === 'Đám cưới') evClass = 'badge-event-wedding';
        else if (eventName === 'Đám hiếu') evClass = 'badge-event-funeral';
        else if (eventName === 'Thăm ốm') evClass = 'badge-event-sick';
        else if (eventName === 'Tân gia') evClass = 'badge-event-housewarming';
            
        row.innerHTML = `
            <td data-label="Họ & Tên">
                <div class="name-address-container">
                    <div style="font-weight: 600; white-space: normal; word-break: break-word;">${escapeHTML(item.name)}</div>
                </div>
            </td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${escapeHTML(item.relationship)}</span></td>
            <td data-label="Sự kiện"><span class="badge ${evClass}">${escapeHTML(eventName)}</span></td>
            <td data-label="Số tiền" style="color:${isReceived ? 'var(--accent-emerald)' : 'var(--text-primary)'}; font-weight:600;">
                ${isReceived ? '+' : '-'}${displayVal}
            </td>
            <td data-label="Ghi chú" class="notes-cell"><span class="notes-content">${escapeHTML(item.notes || '-')}</span></td>
        `;
        tbody.appendChild(row);
    });
    
    document.getElementById('importNotesCount').innerText = tempParsedNotes.length;
    document.getElementById('importNotesPreviewContainer').style.display = 'block';
    showToast("Phân tích ghi chú hoàn tất! Hãy kiểm tra bảng xem trước.");
}

// Submit and insert all parsed notes
async function handleNotesImportSubmit(e) {
    e.preventDefault();
    if (tempParsedNotes.length === 0) {
        showToast("Không có bản ghi nào để nhập!", "warning");
        return;
    }
    
    const flow = document.getElementById('importNotesFlow').value;
    
    if (flow === 'received') {
        state.receivedGifts.push(...tempParsedNotes);
    } else {
        state.sentGifts.push(...tempParsedNotes);
    }
    
    await saveLocalState();
    closeModal('importNotesModal');
    renderAll();
    showToast(`Đã lưu thành công ${tempParsedNotes.length} ghi chép từ Ghi chú!`);
    
    // Auto sync
    performSync(true);
}

// Setup formatting for amount inputs
function setupAmountFormatting(inputElement) {
    if (!inputElement) return;
    
    inputElement.addEventListener('input', (e) => {
        let cursorPosition = e.target.selectionStart;
        let originalLength = e.target.value.length;
        
        let clean = e.target.value.replace(/\D/g, '');
        if (!clean) {
            e.target.value = '';
            return;
        }
        
        let formatted = new Intl.NumberFormat('vi-VN').format(clean);
        e.target.value = formatted;
        
        // Adjust cursor position
        let newLength = formatted.length;
        cursorPosition = cursorPosition + (newLength - originalLength);
        e.target.setSelectionRange(cursorPosition, cursorPosition);
    });
    
    inputElement.addEventListener('blur', (e) => {
        let clean = e.target.value.replace(/\D/g, '');
        if (!clean) return;
        
        let num = Number(clean);
        e.target.value = new Intl.NumberFormat('vi-VN').format(num);
    });
}

async function handleReceivedSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('receivedId').value;
    const name = document.getElementById('recName').value.trim();
    const relationship = document.getElementById('recRelationship').value;
    const date = document.getElementById('recDate').value;
    const status = document.getElementById('recStatus').checked ? 'returned' : 'pending';
    const notes = document.getElementById('recNotes').value.trim();
    const address = document.getElementById('recAddress') ? document.getElementById('recAddress').value.trim() : '';
    
    const recType = document.getElementById('recType').value;
    const recTypeCustom = document.getElementById('recTypeCustom').value.trim();
    const event_type = recType === 'Khác' ? (recTypeCustom || 'Khác') : recType;
    
    const giftType = document.querySelector('input[name="recGiftType"]:checked').value;
    let amount = 0;
    let gold_amount = 0;
    let gold_type = '';
    
    if (giftType === 'gold') {
        gold_amount = parseFloat(document.getElementById('recGoldAmount').value) || 0;
        gold_type = document.getElementById('recGoldType').value.trim();
    } else {
        amount = parseAmountInput(document.getElementById('recAmount').value);
    }
    
    const record = {
        id: id || generateId(),
        name,
        relationship,
        gift_type: giftType,
        amount,
        gold_amount,
        gold_type,
        event_type,
        date,
        status,
        notes,
        address,
        updated_at: new Date().toISOString()
    };
    
    if (id) {
        // Edit existing
        const index = state.receivedGifts.findIndex(g => g.id === id);
        if (index !== -1) {
            state.receivedGifts[index] = record;
        }
    } else {
        // Add new
        state.receivedGifts.push(record);
    }
    
    await saveLocalState();
    closeModal('receivedModal');
    renderReceivedTable();
    renderDashboard();
    showToast(id ? "Đã cập nhật ghi chép nhận mừng" : "Đã thêm khoản nhận mừng cưới!");
    
    // Auto sync
    performSync(true);
}

async function handleSentSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('sentId').value;
    const name = document.getElementById('sentName').value.trim();
    const sentType = document.getElementById('sentType').value;
    const sentTypeCustom = document.getElementById('sentTypeCustom').value.trim();
    const event_type = sentType === 'Khác' ? (sentTypeCustom || 'Khác') : sentType;
    const relationship = document.getElementById('sentRelationship').value;
    const date = document.getElementById('sentDate').value;
    const notes = document.getElementById('sentNotes').value.trim();
    const address = document.getElementById('sentAddress') ? document.getElementById('sentAddress').value.trim() : '';
    
    const giftType = document.querySelector('input[name="sentGiftType"]:checked').value;
    let amount = 0;
    let gold_amount = 0;
    let gold_type = '';
    
    if (giftType === 'gold') {
        gold_amount = parseFloat(document.getElementById('sentGoldAmount').value) || 0;
        gold_type = document.getElementById('sentGoldType').value.trim();
    } else {
        amount = parseAmountInput(document.getElementById('sentAmount').value);
    }
    
    const record = {
        id: id || generateId(),
        name,
        event_type,
        relationship,
        gift_type: giftType,
        amount,
        gold_amount,
        gold_type,
        date,
        notes,
        address,
        updated_at: new Date().toISOString()
    };
    
    if (id) {
        // Edit
        const index = state.sentGifts.findIndex(g => g.id === id);
        if (index !== -1) {
            state.sentGifts[index] = record;
        }
    } else {
        // Add
        state.sentGifts.push(record);
    }
    
    await saveLocalState();
    closeModal('sentModal');
    renderSentTable();
    renderDashboard();
    showToast(id ? "Đã cập nhật ghi chép đi mừng" : "Đã thêm khoản đi mừng!");
    
    // Auto sync
    performSync(true);
}

// --- App Launch / Initial setups ---

// Check login status of Supabase
async function checkLoginStatus() {
    if (!sync.isConfigured()) return;
    
    try {
        const user = await sync.getCurrentUser();
        state.user = user;
        updateUserBadge();
        renderSettings();
        if (user) {
            // Auto sync in background on load
            performSync(true);
        }
    } catch (e) {
        console.error("Auth status check failed:", e);
    }
}

// Handle Setup wizard submit (Step 1 Master Password creation)
async function handleWizardSubmit(e) {
    e.preventDefault();
    const password = document.getElementById('setupMasterPassword').value;
    const passwordConfirm = document.getElementById('setupMasterPasswordConfirm').value;
    
    if (password.length < 6) {
        showToast("Mật khẩu chính phải tối thiểu 6 ký tự!", "warning");
        return;
    }
    
    if (password !== passwordConfirm) {
        showToast("Xác nhận mật khẩu không khớp!", "warning");
        return;
    }
    
    state.masterPassword = password;
    
    // Save an empty initial DB to establish local encryption
    await saveLocalState();
    
    // Hide overlay
    if (document.activeElement) document.activeElement.blur();
    setTimeout(() => {
        document.getElementById('setupWizardOverlay').style.display = 'none';
        document.getElementById('appLayout').style.display = 'flex';
        resetViewportZoom();
        showToast("Đã thiết lập Master Password và khởi tạo bộ nhớ!");
        renderAll();
    }, 350);
}

// Handle Unlock form submit
async function handleUnlockSubmit(e) {
    e.preventDefault();
    const password = document.getElementById('unlockPassword').value;
    
    const unlockBtn = e.target.querySelector('button');
    unlockBtn.innerText = 'Đang mở khóa...';
    unlockBtn.disabled = true;
    
    // Give thread time to update UI before heavy PBKDF2 calculation
    setTimeout(async () => {
        const success = await loadLocalState(password);
        
        if (success) {
            state.masterPassword = password;
            
            // Ghi nhớ mở khóa
            const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
            if (rememberCheckbox && rememberCheckbox.checked) {
                localStorage.setItem('gift_ledger_remembered_pin', password);
            } else {
                localStorage.removeItem('gift_ledger_remembered_pin');
            }
            
            if (document.activeElement) document.activeElement.blur();
            setTimeout(() => {
                document.getElementById('unlockOverlay').style.display = 'none';
                document.getElementById('appLayout').style.display = 'flex';
                resetViewportZoom();
                showToast("Giải mã thành công! Chào mừng trở lại.");
                renderAll();
                
                // Connect to Supabase if configured and run sync
                const config = getSupabaseConfig();
                if (config.url && config.key) {
                    sync.initSupabase(config.url, config.key);
                    checkLoginStatus();
                }
            }, 350);

        } else {
            showToast("Sai Master Password! Không thể giải mã dữ liệu.", "error");
            unlockBtn.innerText = 'Mở khóa ứng dụng';
            unlockBtn.disabled = false;
        }
    }, 100);
}

// Change Master Password flow
window.handleChangePassword = async function() {
    const oldPassword = prompt("Nhập Master Password (hoặc mã PIN) hiện tại:");
    if (!oldPassword) return;
    
    // Verify old password by decrypting local storage
    const encrypted = localStorage.getItem('gift_ledger_db');
    try {
        if (encrypted) {
            await decrypt(encrypted, oldPassword);
        }
    } catch (err) {
        showToast("Mật khẩu cũ không chính xác!", "error");
        return;
    }
    
    const newPassword = prompt("Nhập mã PIN mới (yêu cầu đúng 6 chữ số):");
    if (!newPassword) return;
    if (!/^\d{6}$/.test(newPassword)) {
        showToast("Mã PIN mới phải đúng 6 chữ số!", "error");
        return;
    }
    
    const confirmNew = prompt("Xác nhận mã PIN mới:");
    if (newPassword !== confirmNew) {
        showToast("Xác nhận mã PIN không trùng khớp!", "error");
        return;
    }
    
    // Encrypt current lists with new password and save

    state.masterPassword = newPassword;
    await saveLocalState();
    
    // Cập nhật mã PIN đã ghi nhớ nếu tính năng này đang hoạt động
    if (localStorage.getItem('gift_ledger_remembered_pin') !== null) {
        localStorage.setItem('gift_ledger_remembered_pin', newPassword);
    }
    
    // If Supabase synced, upload the new encrypted state to Supabase
    if (sync.isConfigured() && state.user) {
        try {
            const payload = JSON.stringify({
                receivedGifts: state.receivedGifts,
                sentGifts: state.sentGifts
            });
            const newEncrypted = await encrypt(payload, newPassword);
            await sync.saveSyncData(newEncrypted);
            showToast("Đã thay đổi Master Password trên trình duyệt & đồng bộ lên máy chủ!");
        } catch (syncErr) {
            console.error(syncErr);
            showToast("Thay đổi mật khẩu cục bộ thành công, nhưng đồng bộ lên máy chủ lỗi. Vui lòng nhấn Đồng bộ lại.", "warning");
        }
    } else {
        showToast("Thay đổi Master Password cục bộ thành công!");
    }
};


// --- T9 PIN Pad Helpers & Logics ---

function bindKeypadButton(btn, callback) {
    let touched = false;
    btn.addEventListener('touchstart', (e) => {
        touched = true;
        e.preventDefault();
        callback();
    }, { passive: false });
    btn.addEventListener('mousedown', (e) => {
        if (touched) {
            touched = false;
            e.preventDefault();
            return;
        }
        e.preventDefault();
        callback();
    });
}

function updatePasscodeDots(dotsContainerId, pinLength) {
    const container = document.getElementById(dotsContainerId);
    if (!container) return;
    const dots = container.querySelectorAll('.dot');
    dots.forEach((dot, index) => {
        if (index < pinLength) {
            dot.classList.add('filled');
        } else {
            dot.classList.remove('filled');
        }
    });
}

function shakeCard(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.add('shake-anim');
    setTimeout(() => {
        card.classList.remove('shake-anim');
    }, 450);
}

async function handleWizardKeypadPress(val) {
    if (wizardPinBuffer.length >= 6) return;
    wizardPinBuffer += val;
    updatePasscodeDots('wizardPasscodeDots', wizardPinBuffer.length);
    
    if (wizardPinBuffer.length === 6) {
        if (!wizardFirstPin) {
            wizardFirstPin = wizardPinBuffer;
            wizardPinBuffer = "";
            setTimeout(() => {
                const title = document.getElementById('wizardTitle');
                const subtext = document.getElementById('wizardSubtext');
                if (title) title.innerText = "Xác nhận Mã PIN";
                if (subtext) subtext.innerText = "Nhập lại 6 chữ số vừa đặt để xác nhận";
                updatePasscodeDots('wizardPasscodeDots', 0);
            }, 300);
        } else {
            if (wizardPinBuffer === wizardFirstPin) {
                state.masterPassword = wizardPinBuffer;
                await saveLocalState();
                
                if (document.activeElement) document.activeElement.blur();
                setTimeout(() => {
                    document.getElementById('setupWizardOverlay').style.display = 'none';
                    document.getElementById('appLayout').style.display = 'flex';
                    resetViewportZoom();
                    showToast("Đã thiết lập Mã PIN và khởi tạo sổ!");
                    renderAll();
                    
                    wizardPinBuffer = "";
                    wizardFirstPin = "";
                }, 350);
            } else {
                shakeCard('setupWizardOverlay');
                showToast("Mã PIN xác nhận không khớp! Vui lòng làm lại.", "error");
                
                wizardPinBuffer = "";
                wizardFirstPin = "";
                
                setTimeout(() => {
                    const title = document.getElementById('wizardTitle');
                    const subtext = document.getElementById('wizardSubtext');
                    if (title) title.innerText = "Thiết lập Mã PIN";
                    if (subtext) subtext.innerText = "Nhập 6 chữ số để đặt làm mã PIN bảo vệ sổ";
                    updatePasscodeDots('wizardPasscodeDots', 0);
                }, 300);
            }
        }
    }
}

async function handleUnlockKeypadPress(val) {
    if (unlockPinBuffer.length >= 6) return;
    unlockPinBuffer += val;
    updatePasscodeDots('unlockPasscodeDots', unlockPinBuffer.length);
    
    if (unlockPinBuffer.length === 6) {
        const pin = unlockPinBuffer;
        
        setTimeout(async () => {
            const success = await loadLocalState(pin);
            if (success) {
                state.masterPassword = pin;
                
                // Ghi nhớ mở khóa
                const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem('gift_ledger_remembered_pin', pin);
                } else {
                    localStorage.removeItem('gift_ledger_remembered_pin');
                }
                
                if (document.activeElement) document.activeElement.blur();
                document.getElementById('unlockOverlay').style.display = 'none';
                document.getElementById('appLayout').style.display = 'flex';
                resetViewportZoom();
                showToast("Mở khóa thành công! Chào mừng trở lại.");
                renderAll();
                
                const config = getSupabaseConfig();
                if (config.url && config.key) {
                    sync.initSupabase(config.url, config.key);
                    checkLoginStatus();
                }
                
                unlockPinBuffer = "";
                updatePasscodeDots('unlockPasscodeDots', 0);
            } else {
                shakeCard('unlockCard');
                showToast("Sai mã PIN! Vui lòng thử lại.", "error");
                
                unlockPinBuffer = "";
                updatePasscodeDots('unlockPasscodeDots', 0);
            }
        }, 350);
    }
}

function handleWizardDelete() {
    if (wizardPinBuffer.length === 0) return;
    wizardPinBuffer = wizardPinBuffer.slice(0, -1);
    updatePasscodeDots('wizardPasscodeDots', wizardPinBuffer.length);
}

function handleWizardClear() {
    wizardPinBuffer = "";
    updatePasscodeDots('wizardPasscodeDots', 0);
}

function handleUnlockDelete() {
    if (unlockPinBuffer.length === 0) return;
    unlockPinBuffer = unlockPinBuffer.slice(0, -1);
    updatePasscodeDots('unlockPasscodeDots', unlockPinBuffer.length);
}

function handleUnlockClear() {
    unlockPinBuffer = "";
    updatePasscodeDots('unlockPasscodeDots', 0);
}

// --- DOM Init Bindings ---


document.addEventListener('DOMContentLoaded', async () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('gift_ledger_theme');
    if (savedTheme) {
        state.theme = savedTheme;
    }
    updateThemeUI();

    // Mobile View Mode initialization
    const savedMobileView = localStorage.getItem('gift_ledger_mobile_view');
    if (savedMobileView) {
        state.mobileViewMode = savedMobileView;
    } else {
        state.mobileViewMode = 'cards';
    }
    updateMobileViewUI();

    // Check if database already exists in LocalStorage
    const hasDb = localStorage.getItem('gift_ledger_db') !== null;
    
    if (hasDb) {
        // Check if auto-unlock pin exists
        const rememberedPin = localStorage.getItem('gift_ledger_remembered_pin');
        let autoUnlocked = false;
        
        if (rememberedPin) {
            const success = await loadLocalState(rememberedPin);
            if (success) {
                state.masterPassword = rememberedPin;
                autoUnlocked = true;
                
                document.getElementById('setupWizardOverlay').style.display = 'none';
                document.getElementById('unlockOverlay').style.display = 'none';
                document.getElementById('appLayout').style.display = 'flex';
                resetViewportZoom();
                showToast("Tự động mở khóa thành công!");
                
                const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
                if (rememberCheckbox) rememberCheckbox.checked = true;
                
                renderAll();
                
                const config = getSupabaseConfig();
                if (config.url && config.key) {
                    sync.initSupabase(config.url, config.key);
                    checkLoginStatus();
                }
            } else {
                localStorage.removeItem('gift_ledger_remembered_pin');
            }
        }
        
        if (!autoUnlocked) {
            document.getElementById('setupWizardOverlay').style.display = 'none';
            document.getElementById('unlockOverlay').style.display = 'flex';
            
            const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
            if (rememberCheckbox) rememberCheckbox.checked = false;
            
            // Auto select mode based on device type (desktop vs mobile)
            const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
            const pinModeView = document.getElementById('unlockPinModeView');
            const keyboardModeView = document.getElementById('unlockKeyboardModeView');
            if (pinModeView && keyboardModeView) {
                if (!isMobile) {
                    // Show keyboard mode by default on desktop
                    pinModeView.style.display = 'none';
                    keyboardModeView.style.display = 'block';
                    setTimeout(() => {
                        const unlockPasswordInput = document.getElementById('unlockPassword');
                        if (unlockPasswordInput) unlockPasswordInput.focus();
                    }, 100);
                } else {
                    // Show PIN mode by default on mobile
                    pinModeView.style.display = 'block';
                    keyboardModeView.style.display = 'none';
                }
            }
        }
    } else {
        document.getElementById('setupWizardOverlay').style.display = 'flex';
        document.getElementById('unlockOverlay').style.display = 'none';
    }
    
    // Bind Wizard Keypad Buttons
    const wizardKeypad = document.getElementById('wizardKeypad');
    if (wizardKeypad) {
        wizardKeypad.querySelectorAll('.keypad-btn[data-val]').forEach(btn => {
            bindKeypadButton(btn, () => {
                handleWizardKeypadPress(btn.getAttribute('data-val'));
            });
        });
        const btnClear = document.getElementById('btnWizardClear');
        if (btnClear) bindKeypadButton(btnClear, handleWizardClear);
        const btnDelete = document.getElementById('btnWizardDelete');
        if (btnDelete) bindKeypadButton(btnDelete, handleWizardDelete);
    }

    // Bind Unlock Keypad Buttons
    const unlockKeypad = document.getElementById('unlockKeypad');
    if (unlockKeypad) {
        unlockKeypad.querySelectorAll('.keypad-btn[data-val]').forEach(btn => {
            bindKeypadButton(btn, () => {
                handleUnlockKeypadPress(btn.getAttribute('data-val'));
            });
        });
        const btnClear = document.getElementById('btnUnlockClear');
        if (btnClear) bindKeypadButton(btnClear, handleUnlockClear);
        const btnDelete = document.getElementById('btnUnlockDelete');
        if (btnDelete) bindKeypadButton(btnDelete, handleUnlockDelete);
    }

    // Toggle between Keyboard mode and PIN mode on Unlock Overlay
    const btnSwitchToKeyboard = document.getElementById('btnUnlockSwitchToKeyboard');
    const btnSwitchToPin = document.getElementById('btnUnlockSwitchToPin');
    const pinModeView = document.getElementById('unlockPinModeView');
    const keyboardModeView = document.getElementById('unlockKeyboardModeView');
    
    if (btnSwitchToKeyboard && btnSwitchToPin && pinModeView && keyboardModeView) {
        btnSwitchToKeyboard.addEventListener('click', () => {
            pinModeView.style.display = 'none';
            keyboardModeView.style.display = 'block';
            unlockPinBuffer = "";
            updatePasscodeDots('unlockPasscodeDots', 0);
            setTimeout(() => {
                const unlockPasswordInput = document.getElementById('unlockPassword');
                if (unlockPasswordInput) unlockPasswordInput.focus();
            }, 100);
        });
        btnSwitchToPin.addEventListener('click', () => {
            if (document.activeElement) document.activeElement.blur();
            pinModeView.style.display = 'block';
            keyboardModeView.style.display = 'none';
            document.getElementById('unlockPassword').value = "";
        });
    }

    // Auto-unlock on keyboard input if it reaches 6 characters and is correct
    const unlockPasswordInput = document.getElementById('unlockPassword');
    if (unlockPasswordInput) {
        unlockPasswordInput.addEventListener('input', async () => {
            const val = unlockPasswordInput.value;
            if (val.length === 6) {
                const success = await loadLocalState(val);
                if (success) {
                    state.masterPassword = val;
                    
                    // Ghi nhớ mở khóa
                    const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
                    if (rememberCheckbox && rememberCheckbox.checked) {
                        localStorage.setItem('gift_ledger_remembered_pin', val);
                    } else {
                        localStorage.removeItem('gift_ledger_remembered_pin');
                    }
                    
                    if (document.activeElement) document.activeElement.blur();
                    setTimeout(() => {
                        document.getElementById('unlockOverlay').style.display = 'none';
                        document.getElementById('appLayout').style.display = 'flex';
                        resetViewportZoom();
                        showToast("Giải mã thành công! Chào mừng trở lại.");
                        renderAll();
                        
                        const config = getSupabaseConfig();
                        if (config.url && config.key) {
                            sync.initSupabase(config.url, config.key);
                            checkLoginStatus();
                        }
                        unlockPasswordInput.value = "";
                    }, 350);
                }
            }
        });
    }

    // Bind main layout components
    const wizardForm = document.getElementById('masterPasswordForm');
    if (wizardForm) {
        wizardForm.addEventListener('submit', handleWizardSubmit);
    }
    document.getElementById('unlockForm').addEventListener('submit', handleUnlockSubmit);

    
    // Bind change password button
    document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
    
    // Bind navigation tab clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            const hash = tabIdToHash[tabId] || tabId;
            window.location.hash = hash;
        });
    });
    
    window.addEventListener('hashchange', handleHashRoute);
    
    // Theme toggle click
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Mobile Navigation Drawer Toggle
    document.getElementById('sidebarToggle').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('mobile-open');
    });
    
    // Close mobile navigation drawer if clicking outside
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !toggle.contains(e.target) && 
            sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
        }
    });
    
    // Setup modal button handlers
    setupModalListeners();
    
    // Bind import/export settings
    document.getElementById('exportEncryptedAllBtn').addEventListener('click', () => handleExportEncrypted('all'));
    document.getElementById('exportEncryptedReceivedBtn').addEventListener('click', () => handleExportEncrypted('received'));
    document.getElementById('exportEncryptedSentBtn').addEventListener('click', () => handleExportEncrypted('sent'));
    document.getElementById('exportExcelAllBtn').addEventListener('click', () => handleExportExcel('all'));
    document.getElementById('exportExcelReceivedBtn').addEventListener('click', () => handleExportExcel('received'));
    document.getElementById('exportExcelSentBtn').addEventListener('click', () => handleExportExcel('sent'));
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    
    // Bind toggle for import notes option
    const toggleImportNotesOption = document.getElementById('toggleImportNotesOption');
    if (toggleImportNotesOption) {
        toggleImportNotesOption.addEventListener('change', async (e) => {
            state.showImportNotesOption = e.target.checked;
            await saveLocalState();
            updateImportNotesOptionUI();
            
            // Sync setting to other devices if configured
            if (sync.isConfigured() && await sync.getCurrentUser()) {
                performSync(true);
            }
        });
    }
    
    // Bind Clear All Data button
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', async () => {
            const confirmPin = prompt("CẢNH BÁO: Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu ghi chép thu chi đối ngoại trên thiết bị này!\n\nHành động này không thể hoàn tác.\nNếu bạn chắc chắn muốn xóa, hãy nhập đúng mã PIN mở khóa hiện tại để xác nhận:");
            if (confirmPin === null) {
                return; // Cancelled
            }
            
            if (confirmPin === state.masterPassword) {
                const doubleConfirm = confirm("XÁC NHẬN CUỐI CÙNG: Bạn có thực sự chắc chắn muốn xóa toàn bộ dữ liệu ghi chép?\n(Dữ liệu trên Supabase Cloud cũng sẽ bị xóa sạch sau khi đồng bộ)");
                if (!doubleConfirm) return;
                
                state.receivedGifts = [];
                state.sentGifts = [];
                state.lastResetTime = new Date().toISOString();
                
                await saveLocalState();
                renderAll();
                showToast("Đã xóa sạch toàn bộ dữ liệu thành công!", "success");
                
                // Sync with Supabase to clear remote database by overwriting it
                if (sync.isConfigured() && await sync.getCurrentUser()) {
                    await performSync(true);
                }
                
                // Redirect to dashboard
                window.location.hash = "#tongquan";
            } else {
                showToast("Mã PIN xác nhận không đúng. Đã hủy bỏ xóa dữ liệu!", "error");
            }
        });
    }
    
    // Bind Table filters and searches
    setupTableSearchAndFilters();
    
    // Bind physical keyboard input for T9 PIN keypad
    document.addEventListener('keydown', (e) => {
        const unlockOverlay = document.getElementById('unlockOverlay');
        const pinModeView = document.getElementById('unlockPinModeView');
        const setupWizardOverlay = document.getElementById('setupWizardOverlay');
        
        // 1. If we are on the Unlock screen in PIN (T9) mode
        if (unlockOverlay && unlockOverlay.style.display !== 'none' && pinModeView && pinModeView.style.display !== 'none') {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleUnlockKeypadPress(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleUnlockDelete();
            } else if (e.key === 'Escape' || e.key === 'Delete') {
                e.preventDefault();
                handleUnlockClear();
            }
        }
        // 2. If we are on the Setup Wizard PIN screen
        else if (setupWizardOverlay && setupWizardOverlay.style.display !== 'none') {
            if (e.key >= '0' && e.key <= '9') {
                e.preventDefault();
                handleWizardKeypadPress(e.key);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleWizardDelete();
            } else if (e.key === 'Escape' || e.key === 'Delete') {
                e.preventDefault();
                handleWizardClear();
            }
        }
    });

    // Initialize Lucide Icons
    lucide.createIcons();
});

// Setup lists filtering, search, and pagination triggers
function setupTableSearchAndFilters() {
    // --- Received table ---
    const searchRec = document.getElementById('searchReceived');
    searchRec.addEventListener('input', (e) => {
        state.receivedSearch = e.target.value;
        state.receivedPage = 1;
        renderReceivedTable();
    });
    
    const filterRecRelation = document.getElementById('filterReceivedRelation');
    filterRecRelation.addEventListener('change', (e) => {
        state.receivedFilterRelation = e.target.value;
        state.receivedPage = 1;
        renderReceivedTable();
    });
    
    const filterRecStatus = document.getElementById('filterReceivedStatus');
    filterRecStatus.addEventListener('change', (e) => {
        state.receivedFilterStatus = e.target.value;
        state.receivedPage = 1;
        renderReceivedTable();
    });
    
    const filterRecEvent = document.getElementById('filterReceivedEvent');
    if (filterRecEvent) {
        filterRecEvent.addEventListener('change', (e) => {
            state.receivedFilterEvent = e.target.value;
            state.receivedPage = 1;
            renderReceivedTable();
        });
    }
    
    document.getElementById('btnReceivedPrev').addEventListener('click', () => {
        if (state.receivedPage > 1) {
            state.receivedPage--;
            renderReceivedTable();
        }
    });
    
    document.getElementById('btnReceivedNext').addEventListener('click', () => {
        state.receivedPage++;
        renderReceivedTable();
    });
    
    // --- Sent table ---
    const searchSnt = document.getElementById('searchSent');
    searchSnt.addEventListener('input', (e) => {
        state.sentSearch = e.target.value;
        state.sentPage = 1;
        renderSentTable();
    });
    
    const filterSntType = document.getElementById('filterSentType');
    filterSntType.addEventListener('change', (e) => {
        state.sentFilterType = e.target.value;
        state.sentPage = 1;
        renderSentTable();
    });
    
    const filterSntRelation = document.getElementById('filterSentRelation');
    filterSntRelation.addEventListener('change', (e) => {
        state.sentFilterRelation = e.target.value;
        state.sentPage = 1;
        renderSentTable();
    });
    
    document.getElementById('btnSentPrev').addEventListener('click', () => {
        if (state.sentPage > 1) {
            state.sentPage--;
            renderSentTable();
        }
    });
    
    document.getElementById('btnSentNext').addEventListener('click', () => {
        state.sentPage++;
        renderSentTable();
    });

    // --- Edit Mode Toggles ---
    const btnToggleEditRec = document.getElementById('btnToggleEditReceived');
    if (btnToggleEditRec) {
        btnToggleEditRec.addEventListener('click', () => {
            state.receivedEditMode = !state.receivedEditMode;
            renderReceivedTable();
        });
    }

    const btnToggleEditSnt = document.getElementById('btnToggleEditSent');
    if (btnToggleEditSnt) {
        btnToggleEditSnt.addEventListener('click', () => {
            state.sentEditMode = !state.sentEditMode;
            renderSentTable();
        });
    }

    // --- Mobile View Mode Toggles ---
    document.querySelectorAll('.btnToggleMobileView').forEach(btn => {
        btn.addEventListener('click', toggleMobileView);
    });

    const toggleMobileTableViewCheck = document.getElementById('toggleMobileTableView');
    if (toggleMobileTableViewCheck) {
        toggleMobileTableViewCheck.addEventListener('change', (e) => {
            state.mobileViewMode = e.target.checked ? 'table' : 'cards';
            localStorage.setItem('gift_ledger_mobile_view', state.mobileViewMode);
            updateMobileViewUI();
        });
    }
}

// --- Utilities ---

function resetViewportZoom() {
    // Force blur on all inputs to dismiss keyboard on mobile
    document.querySelectorAll('input, select, textarea').forEach(el => el.blur());
    window.scrollTo(0, 0);
    const el = document.querySelector('meta[name="viewport"]');
    if (el) {
        el.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no');
        setTimeout(() => {
            el.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }, 100);
    }
}

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

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            // YYYY-MM-DD to DD/MM/YYYY
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN');
    } catch (e) {
        return dateStr;
    }
}

// Expose switchTab globally so dynamically generated onclick handlers can use it
window.switchTab = switchTab;

function renderDashboardSyncBanner() {
    const banner = document.getElementById('dashboardSyncBanner');
    if (!banner) return;
    
    const config = getSupabaseConfig();
    const isConfigured = sync.isConfigured();
    const isLoggedIn = state.user !== null;
    
    banner.style.display = 'flex';
    
    if (!isConfigured) {
        banner.className = 'sync-banner local-only';
        banner.innerHTML = `
            <div class="sync-banner-summary-row" onclick="if(!event.target.closest('.sync-banner-btn')) this.parentElement.classList.toggle('expanded')">
                <div class="sync-banner-status">
                    <span class="status-dot yellow"></span>
                    <span class="sync-banner-text">Dữ liệu hiện lưu cục bộ</span>
                    <i data-lucide="chevron-down" class="sync-chevron-icon"></i>
                </div>
                <button class="btn btn-secondary sync-banner-btn" onclick="switchTab('settings')">
                    <i data-lucide="settings"></i>
                    <span>Cấu hình</span>
                </button>
            </div>
            <div class="sync-banner-details">
                <p class="sync-detail-text">Dữ liệu hiện tại chỉ lưu cục bộ trên trình duyệt của thiết bị này. Hãy cấu hình kết nối Supabase để lưu trữ đám mây, tự động đồng bộ hóa và bảo vệ dữ liệu tránh bị mất mát khi xóa cache.</p>
            </div>
        `;
    } else if (!isLoggedIn) {
        const sourceText = config.source === 'build' ? ' (Tự động từ GitHub)' : '';
        banner.className = 'sync-banner not-logged-in';
        banner.innerHTML = `
            <div class="sync-banner-summary-row" onclick="if(!event.target.closest('.sync-banner-btn')) this.parentElement.classList.toggle('expanded')">
                <div class="sync-banner-status">
                    <span class="status-dot yellow"></span>
                    <span class="sync-banner-text">Chưa đăng nhập đồng bộ</span>
                    <i data-lucide="chevron-down" class="sync-chevron-icon"></i>
                </div>
                <button class="btn btn-secondary sync-banner-btn" onclick="switchTab('settings')">
                    <i data-lucide="log-in"></i>
                    <span>Đăng nhập</span>
                </button>
            </div>
            <div class="sync-banner-details">
                <p class="sync-detail-text">Đã thiết lập kết nối tới cơ sở dữ liệu Supabase${sourceText}. Vui lòng đăng nhập hoặc đăng ký tài khoản để bắt đầu tự động đồng bộ đám mây.</p>
            </div>
        `;
    } else {
        const lastSyncStr = localStorage.getItem('last_sync_time') || 'Chưa đồng bộ';
        let displayTime = lastSyncStr;
        if (lastSyncStr !== 'Chưa đồng bộ') {
            try {
                const date = new Date(lastSyncStr);
                displayTime = date.toLocaleTimeString('vi-VN') + ' ' + date.toLocaleDateString('vi-VN');
            } catch (e) {}
        }
        
        banner.className = 'sync-banner synced';
        banner.innerHTML = `
            <div class="sync-banner-summary-row" onclick="if(!event.target.closest('.sync-banner-btn')) this.parentElement.classList.toggle('expanded')">
                <div class="sync-banner-status">
                    <span class="status-dot green"></span>
                    <span class="sync-banner-text">Đã đồng bộ đám mây</span>
                    <i data-lucide="chevron-down" class="sync-chevron-icon"></i>
                </div>
                <button class="btn btn-secondary sync-banner-btn" id="bannerSyncBtn">
                    <i data-lucide="refresh-cw"></i>
                    <span>Đồng bộ</span>
                </button>
            </div>
            <div class="sync-banner-details">
                <div class="sync-detail-row">
                    <span class="sync-detail-label">Tài khoản:</span>
                    <span class="sync-detail-value">${state.user.email}</span>
                </div>
                <div class="sync-detail-row">
                    <span class="sync-detail-label">Lần cuối:</span>
                    <span class="sync-detail-value">${displayTime}</span>
                </div>
                <div class="sync-detail-row">
                    <span class="sync-detail-label">Bảo mật:</span>
                    <span class="sync-detail-value" style="color: var(--accent-emerald);">Mã hóa đầu cuối (E2EE)</span>
                </div>
            </div>
        `;
        
        const syncBtn = document.getElementById('bannerSyncBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', async (e) => {
                const btn = e.currentTarget;
                const icon = btn.querySelector('i');
                if (icon) icon.classList.add('spin-anim');
                btn.disabled = true;
                await performSync(false);
                btn.disabled = false;
                if (icon) icon.classList.remove('spin-anim');
            });
        }
    }
    
    lucide.createIcons();
}

