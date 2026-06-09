// app.js - Main Application Logic & UI Control
import { encrypt, decrypt } from './crypto.js';
import * as sync from './sync.js';

// --- Supabase Config via GitHub Build (Secrets Injection) ---
const BUILD_SUPABASE_URL = 'VITE_SUPABASE_URL_PLACEHOLDER';
const BUILD_SUPABASE_ANON_KEY = 'VITE_SUPABASE_ANON_KEY_PLACEHOLDER';

// Default fallback (uses your pc_flex project credentials)
const DEFAULT_SUPABASE_URL = 'https://rwmhivfwjusezxedjtgw.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_sOm6SWd3dIIerce97LHXNw_OVCroPTr';

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
    
    // Fall back to default pc_flex Supabase credentials
    return { url: DEFAULT_SUPABASE_URL, key: DEFAULT_SUPABASE_ANON_KEY, source: 'default' };
}



// --- State Variables ---
let state = {
    masterPassword: '',
    receivedGifts: [],
    sentGifts: [],
    activeTab: 'dashboard',
    theme: 'dark',
    user: null,
    
    // Pagination & Search state
    receivedSearch: '',
    receivedFilterRelation: '',
    receivedFilterStatus: '',
    receivedPage: 1,
    receivedLimit: 10,

    sentSearch: '',
    sentFilterType: '',
    sentFilterRelation: '',
    sentPage: 1,
    sentLimit: 10
};

// Chart.js instances
let relationshipChart = null;
let eventTypeChart = null;

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
        sentGifts: state.sentGifts
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
        return true;
    }
    
    try {
        const decrypted = await decrypt(encrypted, password);
        const data = JSON.parse(decrypted);
        state.receivedGifts = data.receivedGifts || [];
        state.sentGifts = data.sentGifts || [];
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
        
        if (remoteRecord && remoteRecord.encrypted_data) {
            try {
                // 2. Decrypt remote data
                const remoteDecrypted = await decrypt(remoteRecord.encrypted_data, state.masterPassword);
                const remoteData = JSON.parse(remoteDecrypted);
                
                const remoteReceived = remoteData.receivedGifts || [];
                const remoteSent = remoteData.sentGifts || [];
                
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
        await saveLocalState();
        
        // 5. Encrypt and upload merged state to server
        const payload = JSON.stringify({
            receivedGifts: state.receivedGifts,
            sentGifts: state.sentGifts
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
    lucide.createIcons();
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

// Switch main navigation tabs
function switchTab(tabId) {
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
        title.innerText = 'Người mừng cưới tôi';
        subtitle.innerText = 'Quản lý danh sách khách mừng cưới và trạng thái trả lễ';
        renderReceivedTable();
    } else if (tabId === 'sent') {
        title.innerText = 'Tôi đi mừng';
        subtitle.innerText = 'Quản lý danh sách mừng cưới, đám hiếu, thăm ốm... của tôi';
        renderSentTable();
    } else if (tabId === 'settings') {
        title.innerText = 'Cài đặt';
        subtitle.innerText = 'Cấu hình bảo mật, đồng bộ dữ liệu và sao lưu';
        renderSettings();
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
        balanceSubEl.innerText = `Nhận cưới - Tôi đi mừng${(totalGoldReceivedVal > 0 || totalGoldSentVal > 0) ? ` • Chênh lệch: ${goldBalanceVal >= 0 ? '+' : ''}${goldBalanceVal} chỉ` : ''}`;
    }
    
    document.getElementById('statPendingReturn').innerText = `${pendingReturnCount} người`;
    
    // 3. Render charts
    renderRelationshipChart(activeReceived, activeSent);
    renderEventTypeChart(activeSent);
    renderRecentActivity(activeReceived, activeSent);
    renderDashboardSyncBanner();
}


function renderRelationshipChart(received, sent) {
    const relationships = ['Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Khác'];
    
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
                    label: 'Mừng cưới tôi',
                    data: receivedData,
                    backgroundColor: 'rgba(16, 185, 129, 0.75)',
                    borderColor: '#10b981',
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Tôi đi mừng',
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
    
    const typeCounts = eventTypes.map(type => 
        sent.filter(g => g.event_type === type).length
    );
    
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
            eventBadge = '<span class="badge badge-event-wedding">Mừng đám cưới tôi</span>';
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
            <td data-label="Họ & Tên" style="font-weight: 500;">${escapeHTML(act.name)}</td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${act.relationship}</span></td>
            <td data-label="Số tiền">${amountText}</td>
            <td data-label="Loại sự kiện">${eventBadge}</td>
            <td data-label="Ngày">${formatDate(act.date)}</td>
            <td data-label="Ghi chú" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(act.notes || '')}">
                ${escapeHTML(act.notes || '-')}
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
    
    const isReturned = record.status === 'returned';
    document.getElementById('recStatus').checked = isReturned;
    document.getElementById('recStatusLabel').innerText = isReturned ? 'Đã đi mừng cưới lại họ' : 'Chưa đi mừng cưới lại họ';
    document.getElementById('recNotes').value = record.notes || '';
    
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

function renderReceivedTable() {
    const tbody = document.getElementById('receivedTableBody');
    tbody.innerHTML = '';
    
    // Filter active (not soft-deleted)
    let filtered = state.receivedGifts.filter(g => !g.deleted_at);
    
    // Search filter
    if (state.receivedSearch) {
        const query = state.receivedSearch.toLowerCase();
        filtered = filtered.filter(g => g.name.toLowerCase().includes(query) || (g.notes && g.notes.toLowerCase().includes(query)));
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
                <td colspan="7" class="empty-state">Không có bản ghi nào trùng khớp với bộ lọc.</td>
            </tr>
        `;
        return;
    }
    
    paginated.forEach(g => {
        const row = document.createElement('tr');
        const isChecked = g.status === 'returned' ? 'checked' : '';
        const statusText = g.status === 'returned' ? 'Đã đi lại' : 'Chưa đi lại';
        const statusClass = g.status === 'returned' ? 'badge-status-returned' : 'badge-status-pending';
        
        row.innerHTML = `
            <td data-label="Họ & Tên" style="font-weight: 600;">${escapeHTML(g.name)}</td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${g.relationship}</span></td>
            <td data-label="Số tiền nhận" style="color: var(--accent-emerald); font-weight:600;">
                ${g.gift_type === 'gold' ? `+${g.gold_amount} chỉ (${escapeHTML(g.gold_type || 'Vàng')})` : `+${formatVND(g.amount)}`}
            </td>
            <td data-label="Ngày nhận">${formatDate(g.date)}</td>
            <td data-label="Đã trả lễ?">
                <label class="status-switch">
                    <input type="checkbox" class="status-checkbox" ${isChecked} onchange="toggleReceivedReturnStatus('${g.id}')">
                    <span class="status-slider"></span>
                    <span class="badge ${statusClass}">${statusText}</span>
                </label>
            </td>
            <td data-label="Ghi chú" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(g.notes || '')}">
                ${escapeHTML(g.notes || '-')}
            </td>
            <td data-label="Thao tác">
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
    
    lucide.createIcons();
}

// --- Sent Gifts List Views ---

window.editSentRecord = function(id) {
    const record = state.sentGifts.find(g => g.id === id);
    if (!record) return;
    
    document.getElementById('sentId').value = record.id;
    document.getElementById('sentName').value = record.name;
    document.getElementById('sentType').value = record.event_type;
    document.getElementById('sentRelationship').value = record.relationship;
    document.getElementById('sentDate').value = record.date;
    document.getElementById('sentNotes').value = record.notes || '';
    
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
    
    // Filter active
    let filtered = state.sentGifts.filter(g => !g.deleted_at);
    
    // Search
    if (state.sentSearch) {
        const query = state.sentSearch.toLowerCase();
        filtered = filtered.filter(g => g.name.toLowerCase().includes(query) || (g.notes && g.notes.toLowerCase().includes(query)));
    }
    
    // Event Type
    if (state.sentFilterType) {
        filtered = filtered.filter(g => g.event_type === state.sentFilterType);
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
            <td data-label="Họ & Tên" style="font-weight: 600;">${escapeHTML(g.name)}</td>
            <td data-label="Loại sự kiện"><span class="badge ${evClass}">${g.event_type}</span></td>
            <td data-label="Mối quan hệ"><span class="badge badge-relationship">${g.relationship}</span></td>
            <td data-label="Số tiền chi" style="color: var(--text-primary); font-weight:600;">
                ${g.gift_type === 'gold' ? `-${g.gold_amount} chỉ (${escapeHTML(g.gold_type || 'Vàng')})` : `-${formatVND(g.amount)}`}
            </td>
            <td data-label="Ngày chi">${formatDate(g.date)}</td>
            <td data-label="Ghi chú" style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHTML(g.notes || '')}">
                ${escapeHTML(g.notes || '-')}
            </td>
            <td data-label="Thao tác">
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
        let sourceText = '';
        if (config.source === 'build') sourceText = ' (Tự động từ GitHub)';
        else if (config.source === 'default') sourceText = ' (Dùng chung với pc_flex)';

        
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
                        <div class="form-row">
                            <button type="submit" class="btn btn-primary" id="btnSyncLogin">Đăng nhập</button>
                            <button type="button" class="btn btn-secondary" id="btnSyncRegister">Đăng ký mới</button>
                        </div>
                    </form>
                    <button class="btn btn-outline" id="disconnectSupabaseBtn" style="margin-top:8px;">
                        <i data-lucide="link-2-off"></i>
                        <span>Hủy liên kết Supabase</span>
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
                    <button class="btn btn-outline w-full" id="syncSignOutBtn">
                        <i data-lucide="log-out"></i>
                        <span>Đăng xuất tài khoản Sync</span>
                    </button>
                    <button class="btn btn-outline btn-danger w-full" id="disconnectSupabaseBtn">
                        <i data-lucide="link-2-off"></i>
                        <span>Hủy liên kết Supabase hoàn toàn</span>
                    </button>
                </div>
                
                <div style="margin-top: 20px; border-top:1px solid var(--border-color); padding-top:15px;">
                    <label class="form-label">Hướng dẫn Supabase SQL (Cho lần đầu setup)</label>
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
                </div>
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

async function handleExportEncrypted() {
    if (!state.masterPassword) return;
    
    const payload = JSON.stringify({
        receivedGifts: state.receivedGifts,
        sentGifts: state.sentGifts
    });
    
    try {
        const encrypted = await encrypt(payload, state.masterPassword);
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
            encrypted_payload: encrypted,
            app_id: "hieu_hy_gift_ledger",
            exported_at: new Date().toISOString()
        }));
        
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `hieu_hy_backup_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Đã xuất file Backup đã mã hóa!");
    } catch (e) {
        showToast("Mã hóa để xuất file thất bại!", "error");
    }
}

function handleExportCsv() {
    // Generate CSV for Received
    const activeReceived = state.receivedGifts.filter(g => !g.deleted_at);
    let csvContent = "\uFEFF"; // UTF-8 BOM for Excel display
    csvContent += "CHIỀU NHẬN/CHI,HỌ TÊN,MỐI QUAN HỆ,SỐ TIỀN,LOẠI SỰ KIỆN,NGÀY,TRẠNG THÁI TRẢ LỄ,GHI CHÚ\n";
    
    activeReceived.forEach(g => {
        const statusText = g.status === 'returned' ? 'Đã đi mừng cưới lại họ' : 'Chưa đi lại';
        const amountStr = g.gift_type === 'gold' ? `${g.gold_amount} chỉ vàng (${g.gold_type || 'Vàng'})` : g.amount;
        csvContent += `NHẬN MỪNG CƯỚI,"${escapeCsvField(g.name)}","${escapeCsvField(g.relationship)}","${amountStr}","Mừng cưới tôi",${g.date},"${statusText}","${escapeCsvField(g.notes || '')}"\n`;
    });
    
    // Generate CSV for Sent
    const activeSent = state.sentGifts.filter(g => !g.deleted_at);
    activeSent.forEach(g => {
        const amountStr = g.gift_type === 'gold' ? `${g.gold_amount} chỉ vàng (${g.gold_type || 'Vàng'})` : g.amount;
        csvContent += `TÔI ĐI MỪNG,"${escapeCsvField(g.name)}","${escapeCsvField(g.relationship)}","${amountStr}","${escapeCsvField(g.event_type)}",${g.date},"N/A","${escapeCsvField(g.notes || '')}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_hieu_hy_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Đã xuất danh sách CSV tải về!");
}

function escapeCsvField(str) {
    return str.replace(/"/g, '""');
}

function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.app_id !== "hieu_hy_gift_ledger" || !data.encrypted_payload) {
                showToast("File backup không đúng định dạng!", "error");
                return;
            }
            
            // Attempt to decrypt with current Master Password
            const decrypted = await decrypt(data.encrypted_payload, state.masterPassword);
            const parsed = JSON.parse(decrypted);
            
            if (confirm("Giải mã thành công! Bạn có muốn gộp (Merge) dữ liệu từ file này vào dữ liệu hiện tại không? (Nhấp 'OK' để gộp, nhấp 'Cancel' để ghi đè hoàn toàn)")) {
                // Merge
                state.receivedGifts = mergeLists(state.receivedGifts, parsed.receivedGifts || []);
                state.sentGifts = mergeLists(state.sentGifts, parsed.sentGifts || []);
            } else {
                // Overwrite
                state.receivedGifts = parsed.receivedGifts || [];
                state.sentGifts = parsed.sentGifts || [];
            }
            
            await saveLocalState();
            renderAll();
            showToast("Đã nhập dữ liệu từ backup thành công!");
            
            // Auto-sync after import
            performSync(true);
        } catch (err) {
            console.error(err);
            showToast("Giải mã file thất bại. Mật khẩu chính hiện tại có thể khác với mật khẩu lúc tạo file backup!", "error");
        }
    };
    reader.readAsText(file);
}

// --- Modals Control & Record Submission ---

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

    // Choose import from notes button listener
    document.getElementById('chooseImportNotesBtn').addEventListener('click', () => {
        closeModal('quickAddModal');
        document.getElementById('importNotesForm').reset();
        document.getElementById('importNotesPreviewContainer').style.display = 'none';
        document.getElementById('importNotesModal').classList.add('active');
    });

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
function parseNotesText(text, isReceivedFlow) {
    const lines = text.split('\n');
    const results = [];
    
    const defaultEventType = isReceivedFlow ? 'Mừng cưới tôi' : 'Đám cưới';
    const defaultRelationship = 'Khác';
    const defaultDate = new Date().toISOString().slice(0, 10);
    
    lines.forEach(line => {
        let trimmed = line.trim();
        if (!trimmed) return;
        
        let name = '';
        let amount = 0;
        let gift_type = 'money';
        let gold_amount = 0;
        let gold_type = '';
        
        // 1. Check for gold patterns (e.g. 1 chỉ vàng, 0.5 chỉ, 2 lượng)
        const goldRegex = /(?:[\d.,]+)\s*(?:chỉ vàng|chỉ|chi vang|chi|lượng|cây)\s*$/i;
        const goldMatch = trimmed.match(goldRegex);
        
        if (goldMatch) {
            gift_type = 'gold';
            const rawGoldStr = goldMatch[0].trim().toLowerCase();
            name = trimmed.substring(0, goldMatch.index).trim();
            name = name.replace(/[-:,]+$/, '').trim();
            
            let cleanNumStr = rawGoldStr.replace(/[^\d.,]/g, '').replace(/,/g, '.');
            gold_amount = parseFloat(cleanNumStr) || 0;
            gold_type = rawGoldStr.includes('lượng') || rawGoldStr.includes('cây') ? 'Lượng vàng' : 'Chỉ vàng';
        } else {
            // 2. Check for standard money pattern
            const regex = /(?:[\d.,]+)\s*(?:k|tr|triệu|trieu|đ|d)?\s*$/i;
            const match = trimmed.match(regex);
            
            if (match) {
                gift_type = 'money';
                const rawAmountStr = match[0].trim().toLowerCase();
                name = trimmed.substring(0, match.index).trim();
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
        }
        
        if (name) {
            results.push({
                id: generateId(),
                name,
                gift_type,
                amount,
                gold_amount,
                gold_type,
                relationship: defaultRelationship,
                date: defaultDate,
                notes: 'Nhập nhanh từ Ghi chú',
                status: 'pending',
                event_type: defaultEventType,
                updated_at: new Date().toISOString()
            });
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
    
    tempParsedNotes = parseNotesText(text, isReceived);
    
    const tbody = document.getElementById('importNotesPreviewBody');
    tbody.innerHTML = '';
    
    tempParsedNotes.forEach(item => {
        const row = document.createElement('tr');
        const displayVal = item.gift_type === 'gold' 
            ? `${item.gold_amount} chỉ (${item.gold_type})` 
            : formatVND(item.amount);
            
        row.innerHTML = `
            <td data-label="Họ & Tên" style="font-weight:600;">${escapeHTML(item.name)}</td>
            <td data-label="Số tiền" style="color:${isReceived ? 'var(--accent-emerald)' : 'var(--text-primary)'}; font-weight:600;">
                ${isReceived ? '+' : '-'}${displayVal}
            </td>
            <td data-label="Ghi chú">${escapeHTML(item.notes)}</td>
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
        date,
        status,
        notes,
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
    const event_type = document.getElementById('sentType').value;
    const relationship = document.getElementById('sentRelationship').value;
    const date = document.getElementById('sentDate').value;
    const notes = document.getElementById('sentNotes').value.trim();
    
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
    document.getElementById('setupWizardOverlay').style.display = 'none';
    document.getElementById('appLayout').style.display = 'flex';
    
    showToast("Đã thiết lập Master Password và khởi tạo bộ nhớ!");
    renderAll();
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
            document.getElementById('unlockOverlay').style.display = 'none';
            document.getElementById('appLayout').style.display = 'flex';
            showToast("Giải mã thành công! Chào mừng trở lại.");
            renderAll();
            
            // Connect to Supabase if configured and run sync
            const config = getSupabaseConfig();
            if (config.url && config.key) {
                sync.initSupabase(config.url, config.key);
                checkLoginStatus();
            }

        } else {
            showToast("Sai Master Password! Không thể giải mã dữ liệu.", "error");
            unlockBtn.innerText = 'Mở khóa ứng dụng';
            unlockBtn.disabled = false;
        }
    }, 100);
}

// Change Master Password flow
window.handleChangePassword = async function() {
    const oldPassword = prompt("Nhập Master Password hiện tại:");
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
    
    const newPassword = prompt("Nhập Master Password mới (tối thiểu 6 ký tự):");
    if (!newPassword) return;
    if (newPassword.length < 6) {
        showToast("Mật khẩu mới quá ngắn!", "error");
        return;
    }
    
    const confirmNew = prompt("Xác nhận mật khẩu mới:");
    if (newPassword !== confirmNew) {
        showToast("Xác nhận mật khẩu không trùng khớp!", "error");
        return;
    }
    
    // Encrypt current lists with new password and save
    state.masterPassword = newPassword;
    await saveLocalState();
    
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

// --- DOM Init Bindings ---

document.addEventListener('DOMContentLoaded', () => {
    // Theme initialization
    const savedTheme = localStorage.getItem('gift_ledger_theme');
    if (savedTheme) {
        state.theme = savedTheme;
    }
    updateThemeUI();

    // Check if database already exists in LocalStorage
    const hasDb = localStorage.getItem('gift_ledger_db') !== null;
    
    if (hasDb) {
        document.getElementById('setupWizardOverlay').style.display = 'none';
        document.getElementById('unlockOverlay').style.display = 'flex';
    } else {
        document.getElementById('setupWizardOverlay').style.display = 'flex';
        document.getElementById('unlockOverlay').style.display = 'none';
    }
    
    // Bind main layout components
    document.getElementById('masterPasswordForm').addEventListener('submit', handleWizardSubmit);
    document.getElementById('unlockForm').addEventListener('submit', handleUnlockSubmit);
    
    // Bind change password button
    document.getElementById('changePasswordBtn').addEventListener('click', handleChangePassword);
    
    // Bind navigation tab clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
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
    document.getElementById('exportEncryptedBtn').addEventListener('click', handleExportEncrypted);
    document.getElementById('exportCsvBtn').addEventListener('click', handleExportCsv);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', handleImportFile);
    
    // Bind Table filters and searches
    setupTableSearchAndFilters();
    
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
}

// --- Utilities ---

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
            <div class="sync-banner-content">
                <span class="status-dot yellow"></span>
                <span>Dữ liệu hiện lưu cục bộ. Hãy cấu hình kết nối <b>Supabase</b> để tự động đồng bộ hóa đám mây và bảo vệ dữ liệu.</span>
            </div>
            <button class="btn btn-secondary sync-banner-btn" onclick="switchTab('settings')">
                <i data-lucide="settings"></i>
                <span>Cấu hình ngay</span>
            </button>
        `;
    } else if (!isLoggedIn) {
        let sourceText = '';
        if (config.source === 'build') sourceText = ' (Tự động từ GitHub)';
        else if (config.source === 'default') sourceText = ' (Dùng chung với pc_flex)';
        
        banner.className = 'sync-banner not-logged-in';
        banner.innerHTML = `
            <div class="sync-banner-content">
                <span class="status-dot yellow"></span>
                <span>Đã kết nối Supabase${sourceText}. Bạn chưa đăng nhập tài khoản đồng bộ đám mây.</span>
            </div>
            <button class="btn btn-secondary sync-banner-btn" onclick="switchTab('settings')">
                <i data-lucide="log-in"></i>
                <span>Đăng nhập ngay</span>
            </button>
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
            <div class="sync-banner-content">
                <span class="status-dot green"></span>
                <span>Đã đồng bộ đám mây với tài khoản <b>${state.user.email}</b>. Lần cuối: <span class="sync-time">${displayTime}</span></span>
            </div>
            <button class="btn btn-secondary sync-banner-btn" id="bannerSyncBtn">
                <i data-lucide="refresh-cw"></i>
                <span>Đồng bộ ngay</span>
            </button>
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

