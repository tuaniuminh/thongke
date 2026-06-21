// app.js - Main Application Logic & UI Control
import { encrypt, decrypt } from './crypto.js';
import * as sync from './sync.js';

const APP_VERSION = '4.0.2';

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
    medicalRecords: [],
    medicalRecordsUpdated: '',
    geminiApiKey: '',
    geminiApiKeyUpdated: '',
    lastAiAnalysis: '',
    lastAiAnalysisDate: '',
    lastAiAnalysisUpdated: '',
    familyProfiles: [],
    familyProfilesUpdated: '',
    selectedHealthProfileId: 'p-self',
    familyProfilesEditMode: false,
    lastResetTime: '',
    showImportNotesOption: false,
    showImportNotesOptionUpdated: '',
    customEventTypes: [],
    customEventTypesUpdated: '',
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
let healthTrendChartInstance = null;

// PIN Code state buffers
let wizardPinBuffer = "";
let wizardFirstPin = "";
let unlockPinBuffer = "";

let lastDeletedRecord = null;
let customEventsEditMode = false;


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

// Show Update Notification (Persistent Toast with Action)
function showUpdateNotification(newVersion) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    
    // Check if an update toast is already present
    if (document.getElementById('updateToast')) return;
    
    const toast = document.createElement('div');
    toast.id = 'updateToast';
    toast.className = 'toast warning';
    toast.style.cursor = 'pointer';
    toast.style.pointerEvents = 'auto';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    
    toast.innerHTML = `
        <i data-lucide="refresh-cw" class="spin-anim" style="color: var(--accent-amber); flex-shrink: 0;"></i>
        <div style="display: flex; flex-direction: column; gap: 2px; flex-grow: 1; text-align: left;">
            <span style="font-weight: 600; color: var(--text-primary); font-size: 0.85rem;">Đã có bản cập nhật mới (v${newVersion})</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Bấm vào đây để tải lại ngay.</span>
        </div>
    `;
    
    // Add click handler to reload
    toast.addEventListener('click', () => {
        window.location.reload(true);
    });
    
    container.appendChild(toast);
    lucide.createIcons();
}

// Check for App Version Updates from version.json
async function checkAppVersion(isManual = false) {
    try {
        const response = await fetch(`version.json?t=${Date.now()}`);
        if (!response.ok) {
            if (isManual) showToast("Không thể kết nối máy chủ để kiểm tra cập nhật.", "error");
            return false;
        }
        const data = await response.json();
        if (data && data.version) {
            if (data.version !== APP_VERSION) {
                if (isManual) {
                    showToast("Đang cập nhật lên phiên bản mới nhất...", "success");
                    setTimeout(() => window.location.reload(true), 1000);
                } else {
                    showUpdateNotification(data.version);
                }
                return true;
            } else {
                if (isManual) {
                    showToast(`Ứng dụng đang ở phiên bản mới nhất (v${APP_VERSION}).`);
                }
                return false;
            }
        }
    } catch (e) {
        console.error("Error checking app version:", e);
        if (isManual) showToast("Lỗi kiểm tra phiên bản cập nhật.", "error");
    }
    return false;
}

// Save database state locally (encrypted)
async function saveLocalState() {
    if (!state.masterPassword) return;
    
    const payload = JSON.stringify({
        receivedGifts: state.receivedGifts,
        sentGifts: state.sentGifts,
        medicalRecords: state.medicalRecords || [],
        medicalRecordsUpdated: state.medicalRecordsUpdated || '',
        geminiApiKey: state.geminiApiKey || '',
        geminiApiKeyUpdated: state.geminiApiKeyUpdated || '',
        lastAiAnalysis: state.lastAiAnalysis || '',
        lastAiAnalysisDate: state.lastAiAnalysisDate || '',
        lastAiAnalysisUpdated: state.lastAiAnalysisUpdated || '',
        familyProfiles: state.familyProfiles || [],
        familyProfilesUpdated: state.familyProfilesUpdated || '',
        lastResetTime: state.lastResetTime || '',
        showImportNotesOption: !!state.showImportNotesOption,
        showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || '',
        customEventTypes: state.customEventTypes || [],
        customEventTypesUpdated: state.customEventTypesUpdated || ''
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
        state.medicalRecords = [];
        state.medicalRecordsUpdated = '';
        state.geminiApiKey = '';
        state.geminiApiKeyUpdated = '';
        state.lastAiAnalysis = '';
        state.lastAiAnalysisDate = '';
        state.lastAiAnalysisUpdated = '';
        state.familyProfiles = [{ id: 'p-self', name: 'Bản thân' }];
        state.familyProfilesUpdated = '';
        state.selectedHealthProfileId = 'p-self';
        state.lastResetTime = '';
        state.showImportNotesOption = false;
        state.showImportNotesOptionUpdated = '';
        state.customEventTypes = [];
        state.customEventTypesUpdated = '';
        return true;
    }
    
    try {
        const decrypted = await decrypt(encrypted, password);
        const data = JSON.parse(decrypted);
        state.receivedGifts = data.receivedGifts || [];
        state.sentGifts = data.sentGifts || [];
        state.medicalRecords = data.medicalRecords || [];
        state.medicalRecordsUpdated = data.medicalRecordsUpdated || '';
        state.geminiApiKey = data.geminiApiKey || '';
        state.geminiApiKeyUpdated = data.geminiApiKeyUpdated || '';
        state.lastAiAnalysis = data.lastAiAnalysis || '';
        state.lastAiAnalysisDate = data.lastAiAnalysisDate || '';
        state.lastAiAnalysisUpdated = data.lastAiAnalysisUpdated || '';
        state.familyProfiles = data.familyProfiles && data.familyProfiles.length > 0 ? data.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
        state.familyProfilesUpdated = data.familyProfilesUpdated || '';
        state.selectedHealthProfileId = 'p-self';
        state.lastResetTime = data.lastResetTime || '';
        state.showImportNotesOption = !!data.showImportNotesOption;
        state.showImportNotesOptionUpdated = data.showImportNotesOptionUpdated || '';
        state.customEventTypes = data.customEventTypes || [];
        state.customEventTypesUpdated = data.customEventTypesUpdated || '';
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
        let mergedMedical = [...(state.medicalRecords || [])];
        let localReset = state.lastResetTime || '';
        
        if (remoteRecord && remoteRecord.encrypted_data) {
            try {
                // 2. Decrypt remote data
                const remoteDecrypted = await decrypt(remoteRecord.encrypted_data, state.masterPassword);
                const remoteData = JSON.parse(remoteDecrypted);
                
                const remoteReset = remoteData.lastResetTime || '';
                let remoteReceived = remoteData.receivedGifts || [];
                let remoteSent = remoteData.sentGifts || [];
                let remoteMedical = remoteData.medicalRecords || [];
                
                // Compare reset times
                const localResetTime = localReset ? new Date(localReset).getTime() : 0;
                const remoteResetTime = remoteReset ? new Date(remoteReset).getTime() : 0;
                
                if (remoteResetTime > localResetTime) {
                    // Remote has a newer reset/overwrite. Discard local data.
                    state.receivedGifts = [];
                    state.sentGifts = [];
                    state.medicalRecords = [];
                    state.lastResetTime = remoteReset;
                    localReset = remoteReset;
                    state.showImportNotesOption = !!remoteData.showImportNotesOption;
                    state.showImportNotesOptionUpdated = remoteData.showImportNotesOptionUpdated || '';
                    state.customEventTypes = remoteData.customEventTypes || [];
                    state.customEventTypesUpdated = remoteData.customEventTypesUpdated || '';
                    state.medicalRecordsUpdated = remoteData.medicalRecordsUpdated || '';
                    state.geminiApiKey = remoteData.geminiApiKey || '';
                    state.geminiApiKeyUpdated = remoteData.geminiApiKeyUpdated || '';
                    state.lastAiAnalysis = remoteData.lastAiAnalysis || '';
                    state.lastAiAnalysisDate = remoteData.lastAiAnalysisDate || '';
                    state.lastAiAnalysisUpdated = remoteData.lastAiAnalysisUpdated || '';
                    state.familyProfiles = remoteData.familyProfiles && remoteData.familyProfiles.length > 0 ? remoteData.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
                    state.familyProfilesUpdated = remoteData.familyProfilesUpdated || '';
                    remoteReceived = remoteData.receivedGifts || [];
                    remoteSent = remoteData.sentGifts || [];
                    remoteMedical = remoteData.medicalRecords || [];
                } else if (localResetTime > remoteResetTime) {
                    // Local has a newer reset/overwrite. Discard remote data.
                    remoteReceived = [];
                    remoteSent = [];
                    remoteMedical = [];
                } else {
                    // Merge showImportNotesOption using LWW (Last Write Wins)
                    const localOptTime = state.showImportNotesOptionUpdated ? new Date(state.showImportNotesOptionUpdated).getTime() : 0;
                    const remoteOptTime = remoteData.showImportNotesOptionUpdated ? new Date(remoteData.showImportNotesOptionUpdated).getTime() : 0;
                    
                    if (remoteOptTime > localOptTime) {
                        state.showImportNotesOption = !!remoteData.showImportNotesOption;
                        state.showImportNotesOptionUpdated = remoteData.showImportNotesOptionUpdated || '';
                    }

                    // Merge customEventTypes using LWW (Last Write Wins)
                    const localCustomTime = state.customEventTypesUpdated ? new Date(state.customEventTypesUpdated).getTime() : 0;
                    const remoteCustomTime = remoteData.customEventTypesUpdated ? new Date(remoteData.customEventTypesUpdated).getTime() : 0;
                    
                    if (remoteCustomTime > localCustomTime) {
                        state.customEventTypes = remoteData.customEventTypes || [];
                        state.customEventTypesUpdated = remoteData.customEventTypesUpdated || '';
                    }

                    // Merge geminiApiKey using LWW
                    const localKeyTime = state.geminiApiKeyUpdated ? new Date(state.geminiApiKeyUpdated).getTime() : 0;
                    const remoteKeyTime = remoteData.geminiApiKeyUpdated ? new Date(remoteData.geminiApiKeyUpdated).getTime() : 0;
                    if (remoteKeyTime > localKeyTime) {
                        state.geminiApiKey = remoteData.geminiApiKey || '';
                        state.geminiApiKeyUpdated = remoteData.geminiApiKeyUpdated || '';
                    }

                    // Merge lastAiAnalysis using LWW
                    const localAiTime = state.lastAiAnalysisUpdated ? new Date(state.lastAiAnalysisUpdated).getTime() : 0;
                    const remoteAiTime = remoteData.lastAiAnalysisUpdated ? new Date(remoteData.lastAiAnalysisUpdated).getTime() : 0;
                    if (remoteAiTime > localAiTime) {
                        state.lastAiAnalysis = remoteData.lastAiAnalysis || '';
                        state.lastAiAnalysisDate = remoteData.lastAiAnalysisDate || '';
                        state.lastAiAnalysisUpdated = remoteData.lastAiAnalysisUpdated || '';
                    }

                    // Merge familyProfiles using LWW
                    const localProfilesTime = state.familyProfilesUpdated ? new Date(state.familyProfilesUpdated).getTime() : 0;
                    const remoteProfilesTime = remoteData.familyProfilesUpdated ? new Date(remoteData.familyProfilesUpdated).getTime() : 0;
                    if (remoteProfilesTime > localProfilesTime) {
                        state.familyProfiles = remoteData.familyProfiles && remoteData.familyProfiles.length > 0 ? remoteData.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
                        state.familyProfilesUpdated = remoteData.familyProfilesUpdated || '';
                    }
                }
                
                // 3. Merge lists
                mergedReceived = mergeLists(state.receivedGifts, remoteReceived);
                mergedSent = mergeLists(state.sentGifts, remoteSent);
                mergedMedical = mergeLists(state.medicalRecords || [], remoteMedical);
            } catch (decErr) {
                console.error("Remote decryption failed:", decErr);
                throw new Error("Không thể giải mã dữ liệu trên máy chủ. Có thể do Master Password trên máy chủ khác biệt?");
            }
        }
        
        // 4. Update local state
        state.receivedGifts = mergedReceived;
        state.sentGifts = mergedSent;
        state.medicalRecords = mergedMedical;
        state.lastResetTime = localReset;
        await saveLocalState();
        
        // 5. Encrypt and upload merged state to server
        const payload = JSON.stringify({
            receivedGifts: state.receivedGifts,
            sentGifts: state.sentGifts,
            medicalRecords: state.medicalRecords || [],
            medicalRecordsUpdated: state.medicalRecordsUpdated || '',
            geminiApiKey: state.geminiApiKey || '',
            geminiApiKeyUpdated: state.geminiApiKeyUpdated || '',
            lastAiAnalysis: state.lastAiAnalysis || '',
            lastAiAnalysisDate: state.lastAiAnalysisDate || '',
            lastAiAnalysisUpdated: state.lastAiAnalysisUpdated || '',
            lastResetTime: state.lastResetTime || '',
            showImportNotesOption: !!state.showImportNotesOption,
            showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || '',
            customEventTypes: state.customEventTypes || [],
            customEventTypesUpdated: state.customEventTypesUpdated || '',
            familyProfiles: state.familyProfiles || [],
            familyProfilesUpdated: state.familyProfilesUpdated || ''
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
    renderEventDropdowns();
    renderCustomEventsSettingsList();
    renderDashboard();
    renderReceivedTable();
    renderSentTable();
    renderSettings();
    renderHealthDashboard();
    updateThemeUI();
    updateImportNotesOptionUI();
    handleHashRoute();
    lucide.createIcons();
}

function renderEventDropdowns() {
    const standardEvents = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
    const customEvents = state.customEventTypes || [];
    const allEvents = [...standardEvents, ...customEvents];
    
    const configs = [
        {
            id: 'filterReceivedEvent',
            defaultText: 'Tất cả sự kiện nhận',
            defaultValue: '',
            hasOther: true,
            otherText: 'Khác (Tự nhập)',
            otherValue: 'Khác'
        },
        {
            id: 'filterSentType',
            defaultText: 'Tất cả sự kiện',
            defaultValue: '',
            hasOther: true,
            otherText: 'Khác',
            otherValue: 'Khác'
        },
        {
            id: 'recType',
            defaultText: null,
            hasOther: true,
            otherText: 'Khác',
            otherValue: 'Khác'
        },
        {
            id: 'sentType',
            defaultText: null,
            hasOther: true,
            otherText: 'Khác',
            otherValue: 'Khác'
        },
        {
            id: 'importNotesEventType',
            defaultText: null,
            hasOther: true,
            otherText: 'Khác',
            otherValue: 'Khác'
        }
    ];
    
    configs.forEach(config => {
        const el = document.getElementById(config.id);
        if (!el) return;
        
        const currentValue = el.value;
        let html = '';
        
        if (config.defaultText !== null) {
            html += `<option value="${config.defaultValue}">${config.defaultText}</option>`;
        }
        
        allEvents.forEach(evt => {
            html += `<option value="${evt}">${evt}</option>`;
        });
        
        if (config.hasOther) {
            html += `<option value="${config.otherValue}">${config.otherText}</option>`;
        }
        
        el.innerHTML = html;
        
        // Restore value if it exists in the new options list
        const optionExists = Array.from(el.options).some(opt => opt.value === currentValue);
        if (optionExists) {
            el.value = currentValue;
        } else {
            // Defaults on initialization or if previous selection vanished
            if (config.id === 'recType' || config.id === 'sentType') {
                el.value = 'Khác';
            } else if (config.id === 'importNotesEventType') {
                el.value = 'Đám cưới';
            } else {
                el.value = config.defaultValue || '';
            }
        }
    });
}

function renderCustomEventsSettingsList() {
    const listEl = document.getElementById('customEventsList');
    if (!listEl) return;
    
    const toggleBtn = document.getElementById('toggleEditCustomEventsBtn');
    if (toggleBtn) {
        toggleBtn.innerText = customEventsEditMode ? 'Hoàn tất' : 'Chỉnh sửa';
    }
    
    listEl.innerHTML = '';
    const customTypes = state.customEventTypes || [];
    
    if (customTypes.length === 0) {
        listEl.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic;">Chưa có loại sự kiện tùy chỉnh nào.</span>';
        if (toggleBtn) toggleBtn.style.display = 'none';
        return;
    }
    
    if (toggleBtn) toggleBtn.style.display = 'inline-block';
    
    customTypes.forEach(evt => {
        const badge = document.createElement('span');
        badge.className = 'badge badge-relationship';
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.gap = '6px';
        badge.style.padding = '6px 12px';
        badge.style.fontSize = '0.8rem';
        badge.style.borderRadius = '20px';
        badge.style.background = 'var(--bg-tertiary)';
        badge.style.border = '1px solid var(--border-color)';
        
        const text = document.createElement('span');
        text.textContent = evt;
        badge.appendChild(text);
        
        if (customEventsEditMode) {
            const deleteBtn = document.createElement('button');
            deleteBtn.style.background = 'none';
            deleteBtn.style.border = 'none';
            deleteBtn.style.padding = '0';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.display = 'inline-flex';
            deleteBtn.style.color = 'var(--text-secondary)';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.style.transition = 'color 0.2s';
            deleteBtn.innerHTML = '<i data-lucide="x" style="width: 14px; height: 14px;"></i>';
            
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.color = 'var(--accent-rose)';
            });
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.color = 'var(--text-secondary)';
            });
            
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await deleteCustomEventType(evt);
            });
            
            badge.appendChild(deleteBtn);
        }
        
        listEl.appendChild(badge);
    });
    
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
}

async function addCustomEventType(name) {
    const trimmed = name.trim();
    if (!trimmed) {
        showToast("Tên sự kiện không được để trống!", "warning");
        return;
    }
    
    const formatted = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    const standardEvents = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia', 'Khác'];
    if (standardEvents.some(evt => evt.toLowerCase() === formatted.toLowerCase())) {
        showToast(`"${formatted}" là sự kiện mặc định của hệ thống!`, "warning");
        return;
    }
    
    if (!state.customEventTypes) {
        state.customEventTypes = [];
    }
    
    if (state.customEventTypes.some(evt => evt.toLowerCase() === formatted.toLowerCase())) {
        showToast(`Loại sự kiện "${formatted}" đã tồn tại!`, "warning");
        return;
    }
    
    state.customEventTypes.push(formatted);
    state.customEventTypesUpdated = new Date().toISOString();
    
    await saveLocalState();
    renderEventDropdowns();
    renderCustomEventsSettingsList();
    
    const input = document.getElementById('customEventInput');
    if (input) input.value = '';
    
    showToast(`Đã thêm sự kiện "${formatted}"!`, "success");
    
    if (sync.isConfigured() && await sync.getCurrentUser()) {
        performSync(true);
    }
}

async function deleteCustomEventType(name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa loại sự kiện "${name}" khỏi danh sách?`)) {
        return;
    }
    
    state.customEventTypes = (state.customEventTypes || []).filter(evt => evt !== name);
    state.customEventTypesUpdated = new Date().toISOString();
    
    await saveLocalState();
    renderEventDropdowns();
    renderCustomEventsSettingsList();
    
    showToast(`Đã xóa sự kiện "${name}"!`, "success");
    
    if (sync.isConfigured() && await sync.getCurrentUser()) {
        performSync(true);
    }
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
    const icons = document.querySelectorAll('.theme-icon');
    const texts = document.querySelectorAll('.theme-text');
    const themeMeta = document.getElementById('themeColorMeta');
    
    if (state.theme === 'light') {
        body.classList.add('light-mode');
        icons.forEach(icon => icon.setAttribute('data-lucide', 'moon'));
        texts.forEach(text => text.innerText = 'Giao diện tối');
        if (themeMeta) themeMeta.setAttribute('content', '#f3f4f6');
    } else {
        body.classList.remove('light-mode');
        icons.forEach(icon => icon.setAttribute('data-lucide', 'sun'));
        texts.forEach(text => text.innerText = 'Giao diện sáng');
        if (themeMeta) themeMeta.setAttribute('content', '#090d16');
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
    'trangchu': 'home',
    'home': 'home',
    'tongquan': 'dashboard',
    'dashboard': 'dashboard',
    'tientoinhan': 'received',
    'mungcuoitoi': 'received',
    'received': 'received',
    'tientoimung': 'sent',
    'toimungcuoi': 'sent',
    'sent': 'sent',
    'caidat': 'settings',
    'settings': 'settings',
    'hosoyte': 'health',
    'health': 'health'
};

const tabIdToHash = {
    'home': 'trangchu',
    'dashboard': 'tongquan',
    'received': 'tientoinhan',
    'sent': 'tientoimung',
    'settings': 'caidat',
    'health': 'hosoyte'
};

// Central helper to enter the application layout or home landing view
function enterApp() {
    const wizardOverlay = document.getElementById('setupWizardOverlay');
    if (wizardOverlay) wizardOverlay.style.display = 'none';
    const unlockOverlay = document.getElementById('unlockOverlay');
    if (unlockOverlay) unlockOverlay.style.display = 'none';
    
    const currentHash = window.location.hash.replace('#', '').replace('/', '').trim();
    const appLayout = document.getElementById('appLayout');
    const homeLayout = document.getElementById('homeLayout');
    
    if (currentHash && tabHashMapping[currentHash] && currentHash !== 'trangchu') {
        if (appLayout) appLayout.style.display = 'flex';
        if (homeLayout) homeLayout.style.display = 'none';
        handleHashRoute();
    } else {
        if (appLayout) appLayout.style.display = 'none';
        if (homeLayout) homeLayout.style.display = 'flex';
        if (window.location.hash !== '#trangchu') {
            window.location.hash = 'trangchu';
        } else {
            handleHashRoute(); // Force execution if hash is already trangchu
        }
    }
    
    resetViewportZoom();
    updateHomeLayoutUI();
    renderAll();
}

function handleHashRoute() {
    const appLayout = document.getElementById('appLayout');
    const homeLayout = document.getElementById('homeLayout');
    if (!appLayout || (appLayout.style.display === 'none' && (!homeLayout || homeLayout.style.display === 'none'))) return;
    
    const hash = window.location.hash.replace('#', '').replace('/', '').trim();
    if (hash === 'trangchu') {
        if (appLayout) appLayout.style.display = 'none';
        if (homeLayout) homeLayout.style.display = 'flex';
        state.activeTab = 'home';
        
        // Update active class on nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-tab') === 'home') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        updateSidebarNavVisibility('home');
        return;
    }
    
    if (hash && tabHashMapping[hash]) {
        if (homeLayout) homeLayout.style.display = 'none';
        if (appLayout) appLayout.style.display = 'flex';
        const tabId = tabHashMapping[hash];
        if (state.activeTab !== tabId) {
            switchTab(tabId, false);
        } else {
            updateSidebarNavVisibility(tabId);
        }
    } else {
        const defaultHash = tabIdToHash[state.activeTab || 'home'] || 'trangchu';
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
    
    // Toggle sticky class on sidebar for desktop when in health tab
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (tabId === 'health') {
            sidebar.classList.add('non-sticky-on-desktop');
        } else {
            sidebar.classList.remove('non-sticky-on-desktop');
        }
    }
    
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
    } else if (tabId === 'health') {
        title.innerText = 'Hồ sơ y tế';
        subtitle.innerText = 'Theo dõi chỉ số sức khỏe, kết quả xét nghiệm qua AI Scanner';
        renderHealthDashboard();
    }
    
    if (updateHash) {
        const hash = tabIdToHash[tabId] || tabId;
        window.location.hash = hash;
    }
    
    // Toggle Quick Add button based on active tab
    const quickAddBtn = document.getElementById('quickAddBtn');
    if (quickAddBtn) {
        if (tabId === 'health' || tabId === 'settings') {
            quickAddBtn.style.display = 'none';
        } else {
            quickAddBtn.style.display = '';
        }
    }
    
    updateSidebarNavVisibility(tabId);

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
    const allowedRecTypes = [...standardRecTypes, ...(state.customEventTypes || [])];
    const recEventType = record.event_type || '';
    if (allowedRecTypes.includes(recEventType)) {
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
    
    // Save to undo history before soft-deletion
    lastDeletedRecord = {
        type: 'received',
        id: id,
        originalRecord: { ...state.receivedGifts[index] }
    };
    
    // Soft-delete to support synchronization
    state.receivedGifts[index] = {
        ...state.receivedGifts[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await saveLocalState();
    renderReceivedTable();
    renderDashboard();
    showToast(`Đã xóa ghi chép. <a href="#" onclick="undoDelete(event)" style="color: var(--accent-emerald); font-weight: 600; text-decoration: underline; margin-left: 8px;">Hoàn tác</a>`);
    
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
    const allowedSentTypes = [...standardSentTypes, ...(state.customEventTypes || [])];
    const sentEventType = record.event_type || '';
    if (allowedSentTypes.includes(sentEventType)) {
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
    
    // Save to undo history before soft-deletion
    lastDeletedRecord = {
        type: 'sent',
        id: id,
        originalRecord: { ...state.sentGifts[index] }
    };
    
    // Soft-delete
    state.sentGifts[index] = {
        ...state.sentGifts[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await saveLocalState();
    renderSentTable();
    renderDashboard();
    showToast(`Đã xóa ghi chép. <a href="#" onclick="undoDelete(event)" style="color: var(--accent-emerald); font-weight: 600; text-decoration: underline; margin-left: 8px;">Hoàn tác</a>`);
    
    // Auto-sync
    performSync(true);
};

window.undoDelete = async function(event) {
    if (event) {
        event.preventDefault();
    }
    if (!lastDeletedRecord) return;
    
    const { type, id, originalRecord } = lastDeletedRecord;
    
    if (type === 'received') {
        const index = state.receivedGifts.findIndex(g => g.id === id);
        if (index !== -1) {
            state.receivedGifts[index] = {
                ...originalRecord,
                deleted_at: null,
                updated_at: new Date().toISOString()
            };
            await saveLocalState();
            renderReceivedTable();
            renderDashboard();
            showToast("Đã hoàn tác xóa ghi chép!");
            performSync(true);
        }
    } else if (type === 'sent') {
        const index = state.sentGifts.findIndex(g => g.id === id);
        if (index !== -1) {
            state.sentGifts[index] = {
                ...originalRecord,
                deleted_at: null,
                updated_at: new Date().toISOString()
            };
            await saveLocalState();
            renderSentTable();
            renderDashboard();
            showToast("Đã hoàn tác xóa ghi chép!");
            performSync(true);
        }
    } else if (type === 'medical') {
        const index = state.medicalRecords.findIndex(r => r.id === id);
        if (index !== -1) {
            state.medicalRecords[index] = {
                ...originalRecord,
                deleted_at: null,
                updated_at: new Date().toISOString()
            };
            state.medicalRecordsUpdated = new Date().toISOString();
            await saveLocalState();
            renderHealthDashboard();
            showToast("Đã hoàn tác xóa hồ sơ y tế!");
            performSync(true);
        }
    }
    
    lastDeletedRecord = null;
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
    
    updateHomeLayoutUI();
}

function updateHomeLayoutUI() {
    const cardSettings = document.querySelector('.home-card.card-settings');
    if (cardSettings) {
        if (state.user !== null) {
            cardSettings.style.setProperty('display', 'none', 'important');
        } else {
            cardSettings.style.removeProperty('display');
            // Change title and description
            const titleEl = cardSettings.querySelector('h3');
            if (titleEl) titleEl.innerText = 'Đăng nhập tài khoản';
            const descEl = cardSettings.querySelector('p');
            if (descEl) descEl.innerText = 'Liên kết tài khoản Cloud Supabase để đồng bộ đám mây và bảo vệ dữ liệu';
            
            // Update icon to log-in
            const iconContainer = cardSettings.querySelector('.home-card-icon');
            if (iconContainer) {
                iconContainer.innerHTML = '<i data-lucide="log-in"></i>';
            }
        }
    }
    
    // Cập nhật thời tiết Hà Nội & Lịch âm Việt Nam
    if (typeof updateHomeWeather === 'function') {
        updateHomeWeather();
    }
    if (typeof updateHomeLunar === 'function') {
        updateHomeLunar();
    }
    
    lucide.createIcons();
}

function updateSidebarNavVisibility(tabId) {
    const sidebarLogoText = document.getElementById('sidebarLogoText');
    const sidebarLogoImg = document.getElementById('sidebarLogoImg');
    
    if (sidebarLogoImg) {
        sidebarLogoImg.src = 'icon.png?v=4.0.2';
    }
    
    if (sidebarLogoText) {
        if (tabId === 'health') {
            sidebarLogoText.innerText = 'Hồ Sơ Y Tế';
        } else if (tabId === 'dashboard' || tabId === 'received' || tabId === 'sent' || tabId === 'settings') {
            sidebarLogoText.innerText = 'Thu Chi Đối Ngoại';
        } else {
            sidebarLogoText.innerText = 'FamiLife';
        }
    }

    const navItems = {
        home: document.querySelector('[data-nav="home"]'),
        dashboard: document.querySelector('[data-nav="dashboard"]'),
        received: document.querySelector('[data-nav="received"]'),
        sent: document.querySelector('[data-nav="sent"]'),
        settings: document.querySelector('[data-nav="settings"]'),
        financePortal: document.querySelector('[data-nav="finance-portal"]'),
        health: document.querySelector('[data-nav="health"]')
    };

    if (!navItems.health) return;

    if (tabId === 'health') {
        if (navItems.home) navItems.home.style.display = 'block';
        if (navItems.financePortal) navItems.financePortal.style.display = 'block';
        
        if (navItems.dashboard) navItems.dashboard.style.display = 'none';
        if (navItems.received) navItems.received.style.display = 'none';
        if (navItems.sent) navItems.sent.style.display = 'none';
        if (navItems.settings) navItems.settings.style.display = 'none';
        if (navItems.health) navItems.health.style.display = 'none';
    } else if (tabId === 'dashboard' || tabId === 'received' || tabId === 'sent' || tabId === 'settings') {
        if (navItems.home) navItems.home.style.display = 'block';
        if (navItems.dashboard) navItems.dashboard.style.display = 'block';
        if (navItems.received) navItems.received.style.display = 'block';
        if (navItems.sent) navItems.sent.style.display = 'block';
        if (navItems.settings) navItems.settings.style.display = 'block';
        
        if (navItems.health) navItems.health.style.display = 'none';
        if (navItems.financePortal) navItems.financePortal.style.display = 'none';
    } else {
        if (navItems.home) navItems.home.style.display = 'block';
        if (navItems.dashboard) navItems.dashboard.style.display = 'block';
        if (navItems.received) navItems.received.style.display = 'block';
        if (navItems.sent) navItems.sent.style.display = 'block';
        if (navItems.settings) navItems.settings.style.display = 'block';
        if (navItems.health) navItems.health.style.display = 'block';
        if (navItems.financePortal) navItems.financePortal.style.display = 'none';
    }
    
    // Call mobile navbar update
    updateMobileNavbar(tabId);
}

function updateMobileNavbar(tabId) {
    const mobileNavbar = document.getElementById('mobileNavbar');
    if (!mobileNavbar) return;

    const pageTitleBlock = document.querySelector('.top-header .page-title');
    const mobileHomeBtn = document.getElementById('mobileHomeBtn');

    // Default cleanup
    mobileNavbar.classList.remove('two-line');
    if (pageTitleBlock) {
        pageTitleBlock.classList.remove('mobile-hide-title');
    }
    if (mobileHomeBtn) {
        mobileHomeBtn.style.setProperty('display', 'none', 'important');
    }
    mobileNavbar.style.removeProperty('display');

    if (tabId === 'settings') {
        mobileNavbar.style.setProperty('display', 'none', 'important');
        if (mobileHomeBtn) {
            mobileHomeBtn.style.setProperty('display', 'inline-flex', 'important');
        }
    } else if (tabId === 'health') {
        if (pageTitleBlock) {
            pageTitleBlock.classList.add('mobile-hide-title');
        }
        
        mobileNavbar.innerHTML = `
            <div class="mobile-navbar-left" style="display: flex; align-items: center; gap: 8px;">
                <div class="mobile-navbar-logo">
                    <img src="icon.png?v=4.0.2" alt="Logo" id="mobileLogoImg">
                </div>
                <span class="mobile-navbar-title" id="mobileNavbarTitle">Hồ Sơ Y Tế</span>
            </div>
            <div class="mobile-navbar-right" id="mobileNavbarNav">
                <button class="nav-icon-btn text-below" onclick="window.location.hash = 'trangchu'" title="Trang chủ">
                    <i data-lucide="home"></i>
                    <span class="btn-label">Trang chủ</span>
                </button>
            </div>
        `;
    } else {
        // For finance tabs (dashboard, received, sent)
        mobileNavbar.classList.add('two-line');
        
        mobileNavbar.innerHTML = `
            <div class="mobile-navbar-left" style="width: 100%; justify-content: space-between !important; display: flex; align-items: center;">
                <div onclick="switchTab('dashboard')" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <div class="mobile-navbar-logo">
                        <img src="icon.png?v=4.0.2" alt="Logo" id="mobileLogoImg">
                    </div>
                    <span class="mobile-navbar-title" id="mobileNavbarTitle">Thu Chi Đối Ngoại</span>
                </div>
                <button class="nav-icon-btn text-below" onclick="window.location.hash = 'trangchu'" title="Trang chủ">
                    <i data-lucide="home"></i>
                    <span class="btn-label">Trang chủ</span>
                </button>
            </div>
            <div class="mobile-navbar-right" id="mobileNavbarNav">
                <button class="nav-icon-btn text-only ${tabId === 'dashboard' ? 'active' : ''}" onclick="switchTab('dashboard')" title="Tổng quan">
                    Tổng quan
                </button>
                <button class="nav-icon-btn text-only ${tabId === 'received' ? 'active' : ''}" onclick="switchTab('received')" title="Tiền tôi Nhận">
                    Tiền tôi Nhận
                </button>
                <button class="nav-icon-btn text-only ${tabId === 'sent' ? 'active' : ''}" onclick="switchTab('sent')" title="Tiền tôi Mừng">
                    Tiền tôi Mừng
                </button>
            </div>
        `;
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

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
            const evLower = ev.toLowerCase();
            const foundCustom = (state.customEventTypes || []).find(c => c.toLowerCase() === evLower);
            
            if (foundCustom) {
                currentEventTypeContext = foundCustom;
            } else if (evLower.includes('cưới') || evLower.includes('cuoi')) {
                currentEventTypeContext = 'Đám cưới';
            } else if (evLower.includes('hiếu') || evLower.includes('hieu')) {
                currentEventTypeContext = 'Đám hiếu';
            } else if (evLower.includes('ốm') || evLower.includes('om')) {
                currentEventTypeContext = 'Thăm ốm';
            } else if (evLower.includes('gia')) {
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
    if (!name) {
        showToast("Vui lòng nhập Họ và Tên!", "warning");
        return;
    }
    
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
        if (gold_amount <= 0) {
            showToast("Vui lòng nhập số lượng vàng hợp lệ!", "warning");
            return;
        }
    } else {
        amount = parseAmountInput(document.getElementById('recAmount').value);
        if (amount <= 0) {
            showToast("Vui lòng nhập số tiền hợp lệ!", "warning");
            return;
        }
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
    if (!name) {
        showToast("Vui lòng nhập Họ và Tên!", "warning");
        return;
    }
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
        if (gold_amount <= 0) {
            showToast("Vui lòng nhập số lượng vàng hợp lệ!", "warning");
            return;
        }
    } else {
        amount = parseAmountInput(document.getElementById('sentAmount').value);
        if (amount <= 0) {
            showToast("Vui lòng nhập số tiền hợp lệ!", "warning");
            return;
        }
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
        enterApp();
        showToast("Đã thiết lập Master Password và khởi tạo bộ nhớ!");
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
                enterApp();
                showToast("Giải mã thành công! Chào mừng trở lại.");
                
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
                    enterApp();
                    showToast("Đã thiết lập Mã PIN và khởi tạo sổ!");
                    
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
                enterApp();
                showToast("Mở khóa thành công! Chào mừng trở lại.");
                
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
                
                enterApp();
                showToast("Tự động mở khóa thành công!");
                
                const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
                if (rememberCheckbox) rememberCheckbox.checked = true;
                
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
                        enterApp();
                        showToast("Giải mã thành công! Chào mừng trở lại.");
                        
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
    document.querySelectorAll('.theme-toggle-btn-trigger').forEach(btn => {
        btn.addEventListener('click', toggleTheme);
    });
    
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

    // Bind Custom Event Type additions
    const addCustomEventBtn = document.getElementById('addCustomEventBtn');
    const customEventInput = document.getElementById('customEventInput');
    if (addCustomEventBtn && customEventInput) {
        addCustomEventBtn.addEventListener('click', (e) => {
            e.preventDefault();
            addCustomEventType(customEventInput.value);
        });
        customEventInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCustomEventType(customEventInput.value);
            }
        });
    }

    // Bind Custom Event Type edit toggle
    const toggleEditCustomEventsBtn = document.getElementById('toggleEditCustomEventsBtn');
    if (toggleEditCustomEventsBtn) {
        toggleEditCustomEventsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            customEventsEditMode = !customEventsEditMode;
            renderCustomEventsSettingsList();
        });
    }
    
    // Bind Clear All Data button
    const clearAllDataBtn = document.getElementById('clearAllDataBtn');
    if (clearAllDataBtn) {
        clearAllDataBtn.addEventListener('click', async () => {
            const confirmPin = prompt("CẢNH BÁO: Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu thu chi đối ngoại trên ứng dụng FamiLife của thiết bị này (Dữ liệu hồ sơ y tế vẫn được giữ nguyên)!\n\nHành động này không thể hoàn tác.\nNếu bạn chắc chắn muốn xóa, hãy nhập đúng mã PIN mở khóa hiện tại để xác nhận:");
            if (confirmPin === null) {
                return; // Cancelled
            }
            
            if (confirmPin === state.masterPassword) {
                const doubleConfirm = confirm("XÁC NHẬN CUỐI CÙNG: Bạn có thực sự chắc chắn muốn xóa toàn bộ dữ liệu thu chi đối ngoại?\n(Dữ liệu trên Supabase Cloud cũng sẽ bị xóa sạch sau khi đồng bộ)");
                if (!doubleConfirm) return;
                
                state.receivedGifts = [];
                state.sentGifts = [];
                state.customEventTypes = [];
                state.customEventTypesUpdated = new Date().toISOString();
                
                // Keep medicalRecords, familyProfiles, and geminiApiKey intact
                state.lastResetTime = new Date().toISOString();
                
                await saveLocalState();
                renderAll();
                showToast("Đã xóa sạch toàn bộ dữ liệu thu chi đối ngoại thành công!", "success");
                
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

    // Initialize Health/Medical Bindings
    initHealthBindings();

    // Initialize Lucide Icons
    lucide.createIcons();

    // Bind Manual Check Update buttons
    document.querySelectorAll('.manual-check-update-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const icon = btn.querySelector('i');
            if (icon) icon.classList.add('spin-anim');
            btn.disabled = true;
            
            await checkAppVersion(true);
            
            setTimeout(() => {
                if (icon) icon.classList.remove('spin-anim');
                btn.disabled = false;
            }, 600);
        });
    });

    // Check app version updates on load
    checkAppVersion();

    // Periodically check for updates every 5 minutes
    setInterval(checkAppVersion, 5 * 60 * 1000);

    // Check version when returning to the app
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkAppVersion();
        }
    });
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
        let cleanDate = dateStr;
        if (dateStr.includes('T')) {
            cleanDate = dateStr.split('T')[0];
        }
        const parts = cleanDate.split('-');
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

// ==========================================================================
// HEALTH TAB (HỒ SƠ Y TẾ) LOGIC
// ==========================================================================

// --- Family Profiles Helpers ---
function getProfileName(profileId) {
    const defaultId = profileId || 'p-self';
    const profile = (state.familyProfiles || []).find(p => p.id === defaultId);
    return profile ? profile.name : 'Bản thân';
}

function updateProfileDropdowns() {
    const mainSelect = document.getElementById('healthProfileSelect');
    if (mainSelect) {
        const currentSel = state.selectedHealthProfileId || 'all';
        mainSelect.innerHTML = `
            <option value="all">Tất cả thành viên</option>
            ${(state.familyProfiles || []).map(p => `
                <option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>
            `).join('')}
        `;
        const exists = (state.familyProfiles || []).some(p => p.id === currentSel) || currentSel === 'all';
        mainSelect.value = exists ? currentSel : 'all';
        state.selectedHealthProfileId = mainSelect.value;
    }
}

function openHealthProfilesModal() {
    const modal = document.getElementById('healthProfilesModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const input = document.getElementById('newProfileNameInput');
    if (input) input.value = '';
    state.familyProfilesEditMode = false;
    updateProfilesEditModeButtonUI();
    renderFamilyProfilesList();
}

function updateProfilesEditModeButtonUI() {
    const btn = document.getElementById('toggleProfilesEditModeBtn');
    if (!btn) return;
    const isEditMode = state.familyProfilesEditMode;
    if (isEditMode) {
        btn.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px;"></i><span>Hoàn tất</span>`;
        btn.classList.remove('health-btn-secondary');
        btn.classList.add('health-btn-primary');
    } else {
        btn.innerHTML = `<i data-lucide="edit-3" style="width: 12px; height: 12px;"></i><span>Sửa</span>`;
        btn.classList.remove('health-btn-primary');
        btn.classList.add('health-btn-secondary');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderFamilyProfilesList() {
    const container = document.getElementById('healthProfilesListContainer');
    if (!container) return;

    const profiles = state.familyProfiles || [{ id: 'p-self', name: 'Bản thân' }];
    const isEditMode = state.familyProfilesEditMode;
    
    container.innerHTML = profiles.map(p => {
        const isDefault = p.id === 'p-self';
        return `
            <div class="health-profile-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); margin-bottom: 6px;">
                <span style="font-weight: 500; color: var(--text-primary);">${escapeHTML(p.name)} ${isDefault ? '<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(Mặc định)</span>' : ''}</span>
                ${isEditMode ? `
                    <div style="display: flex; gap: 4px;">
                        <button type="button" class="profile-action-btn export" onclick="exportMemberBackup('${p.id}')" title="Xuất sao lưu hồ sơ (.json)">
                            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button type="button" class="profile-action-btn import" onclick="triggerImportMemberBackup('${p.id}')" title="Nhập sao lưu hồ sơ (.json)">
                            <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
                        </button>
                        ${!isDefault ? `
                            <button type="button" class="profile-action-btn edit" onclick="editFamilyProfile('${p.id}')" title="Sửa tên">
                                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button type="button" class="profile-action-btn delete" onclick="deleteFamilyProfile('${p.id}')" title="Xóa thành viên">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function addFamilyProfile() {
    const input = document.getElementById('newProfileNameInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    const normalized = name.toLowerCase();
    const duplicate = (state.familyProfiles || []).some(p => p.name.toLowerCase() === normalized);
    if (duplicate) {
        showToast("Thành viên này đã tồn tại!", "warning");
        return;
    }

    const newId = 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const newProfile = {
        id: newId,
        name: name
    };

    if (!state.familyProfiles) {
        state.familyProfiles = [{ id: 'p-self', name: 'Bản thân' }];
    }
    state.familyProfiles.push(newProfile);
    state.familyProfilesUpdated = new Date().toISOString();

    await saveLocalState();
    input.value = '';
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã thêm thành viên "${name}" thành công!`, "success");
    
    performSync(true);
}

async function editFamilyProfile(id) {
    if (id === 'p-self') return;

    const profile = (state.familyProfiles || []).find(p => p.id === id);
    if (!profile) return;

    const newName = prompt("Nhập tên mới cho thành viên:", profile.name);
    if (newName === null) return;
    
    const trimmed = newName.trim();
    if (!trimmed) {
        showToast("Tên thành viên không được để trống!", "warning");
        return;
    }

    const normalized = trimmed.toLowerCase();
    const duplicate = (state.familyProfiles || []).some(p => p.id !== id && p.name.toLowerCase() === normalized);
    if (duplicate) {
        showToast("Tên thành viên này đã tồn tại!", "warning");
        return;
    }

    const oldName = profile.name;
    profile.name = trimmed;
    state.familyProfilesUpdated = new Date().toISOString();

    await saveLocalState();
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã đổi tên thành viên từ "${oldName}" thành "${trimmed}"!`, "success");
    
    performSync(true);
}

async function deleteFamilyProfile(id) {
    if (id === 'p-self') {
        showToast("Không thể xóa thành viên mặc định!", "warning");
        return;
    }

    const profile = (state.familyProfiles || []).find(p => p.id === id);
    if (!profile) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${profile.name}"? Tất cả hồ sơ y tế liên kết với thành viên này cũng sẽ bị xóa.`)) {
        return;
    }

    const nowIso = new Date().toISOString();
    let recordsDeletedCount = 0;
    (state.medicalRecords || []).forEach(r => {
        if ((r.profileId || 'p-self') === id) {
            r.deleted_at = nowIso;
            r.updated_at = nowIso;
            recordsDeletedCount++;
        }
    });

    if (recordsDeletedCount > 0) {
        state.medicalRecordsUpdated = nowIso;
    }

    state.familyProfiles = (state.familyProfiles || []).filter(p => p.id !== id);
    state.familyProfilesUpdated = nowIso;

    if (state.selectedHealthProfileId === id) {
        state.selectedHealthProfileId = 'all';
    }

    await saveLocalState();
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã xóa thành viên "${profile.name}" và ${recordsDeletedCount} hồ sơ liên quan.`, "success");
    
    performSync(true);
}

async function exportMemberBackup(profileId) {
    const profile = (state.familyProfiles || []).find(p => p.id === profileId);
    if (!profile) {
        showToast("Không tìm thấy thành viên!", "error");
        return;
    }

    const name = profile.name;
    const records = (state.medicalRecords || []).filter(r => r.profileId === profileId);

    // Ask user if they want to encrypt the backup file
    const password = prompt(`Bạn có muốn đặt mật khẩu bảo mật cho tệp sao lưu của "${name}" không?\n(Để trống nếu muốn xuất tệp dạng văn bản thường không mã hóa)`);
    if (password === null) return; // User cancelled

    const payloadObj = {
        profile: {
            name: profile.name,
            lastAiAnalysis: profile.lastAiAnalysis || '',
            lastAiAnalysisDate: profile.lastAiAnalysisDate || '',
            lastAiAnalysisUpdated: profile.lastAiAnalysisUpdated || ''
        },
        medicalRecords: records.map(r => ({
            title: r.title || 'Hồ sơ sức khỏe',
            type: r.type || 'general',
            date: r.date || '',
            facility: r.facility || '',
            notes: r.notes || '',
            indicators: r.indicators || {},
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString()
        }))
    };

    try {
        let finalPayload;
        let isEncrypted = false;

        if (password.trim().length > 0) {
            finalPayload = await encrypt(payloadObj ? JSON.stringify(payloadObj) : '', password);
            isEncrypted = true;
        } else {
            finalPayload = payloadObj;
        }

        const backupData = {
            app_id: "hieu_hy_member_health_backup",
            profile_name: name,
            is_encrypted: isEncrypted,
            exported_at: new Date().toISOString(),
            payload: finalPayload
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const filename = `sao_luu_suc_khoe_${name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;

        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        showToast(`Đã xuất file sao lưu hồ sơ cho "${name}" thành công!`, "success");
    } catch (e) {
        console.error(e);
        showToast("Lỗi khi xuất sao lưu hồ sơ!", "error");
    }
}

window.currentImportProfileId = null;

function triggerImportMemberBackup(profileId) {
    window.currentImportProfileId = profileId;
    const fileInput = document.getElementById('memberBackupFileInput');
    if (fileInput) {
        fileInput.value = ''; // Reset
        fileInput.click();
    }
}

async function handleMemberBackupImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const targetProfileId = window.currentImportProfileId;
    if (!targetProfileId) {
        showToast("Không xác định được hồ sơ thành viên đích!", "error");
        return;
    }

    const profile = (state.familyProfiles || []).find(p => p.id === targetProfileId);
    if (!profile) {
        showToast("Hồ sơ thành viên đích không tồn tại!", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.app_id !== "hieu_hy_member_health_backup") {
                showToast("Định dạng tệp tin sao lưu thành viên không đúng!", "error");
                return;
            }

            let decryptedPayload;
            if (data.is_encrypted) {
                const password = prompt("Tệp sao lưu này đã được mã hóa. Vui lòng nhập mật khẩu giải mã:");
                if (password === null) return;
                try {
                    const decryptedStr = await decrypt(data.payload, password);
                    decryptedPayload = JSON.parse(decryptedStr);
                } catch (err) {
                    showToast("Mật khẩu giải mã không chính xác hoặc dữ liệu bị hỏng!", "error");
                    return;
                }
            } else {
                decryptedPayload = data.payload;
            }

            if (!decryptedPayload || !decryptedPayload.profile || !Array.isArray(decryptedPayload.medicalRecords)) {
                showToast("Dữ liệu sao lưu không đúng cấu trúc!", "error");
                return;
            }

            const importedRecords = decryptedPayload.medicalRecords;
            const confirmMsg = `Bạn có chắc chắn muốn nhập ${importedRecords.length} kết quả xét nghiệm vào hồ sơ của "${profile.name}"?\n(Dữ liệu sức khỏe cũ của thành viên này vẫn được giữ nguyên)`;
            if (!confirm(confirmMsg)) return;

            // Import medical records
            if (!state.medicalRecords) {
                state.medicalRecords = [];
            }

            const nowIso = new Date().toISOString();
            importedRecords.forEach((r, idx) => {
                const newRecord = {
                    id: 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) + '-' + idx,
                    title: r.title || 'Hồ sơ nhập khẩu',
                    type: r.type || 'general',
                    profileId: targetProfileId,
                    date: r.date || nowIso.slice(0, 10),
                    facility: r.facility || '',
                    notes: r.notes || '',
                    indicators: r.indicators || {},
                    created_at: r.created_at || nowIso,
                    updated_at: nowIso
                };
                state.medicalRecords.push(newRecord);
            });

            state.medicalRecordsUpdated = nowIso;

            // Optionally import AI analysis report
            const importedProfile = decryptedPayload.profile;
            if (importedProfile.lastAiAnalysis) {
                const overwriteAi = confirm(`Tệp sao lưu có chứa báo cáo phân tích sức khỏe bằng AI của "${importedProfile.name}". Bạn có muốn nhập báo cáo này vào hồ sơ của "${profile.name}" không?`);
                if (overwriteAi) {
                    profile.lastAiAnalysis = importedProfile.lastAiAnalysis;
                    profile.lastAiAnalysisDate = importedProfile.lastAiAnalysisDate || nowIso;
                    profile.lastAiAnalysisUpdated = nowIso;
                    state.familyProfilesUpdated = nowIso;
                }
            }

            await saveLocalState();
            renderFamilyProfilesList();
            renderHealthDashboard();
            showToast(`Nhập dữ liệu thành công cho thành viên "${profile.name}"!`, "success");

            performSync(true);
        } catch (err) {
            console.error(err);
            showToast("Lỗi phân tích hoặc nhập tệp sao lưu!", "error");
        }
    };
    reader.readAsText(file);
}

window.editFamilyProfile = editFamilyProfile;
window.deleteFamilyProfile = deleteFamilyProfile;
window.exportMemberBackup = exportMemberBackup;
window.triggerImportMemberBackup = triggerImportMemberBackup;
window.handleMemberBackupImportFile = handleMemberBackupImportFile;
window.openHealthAiMemberSelectorModal = openHealthAiMemberSelectorModal;
window.selectMemberForAiAnalysis = selectMemberForAiAnalysis;

let activeMedicalRecordId = null;

function initHealthBindings() {
    // Member selector bindings
    document.getElementById('healthProfileSelect')?.addEventListener('change', (e) => {
        state.selectedHealthProfileId = e.target.value;
        renderHealthDashboard();
    });

    document.getElementById('manageProfilesBtn')?.addEventListener('click', () => {
        openHealthProfilesModal();
    });

    document.getElementById('closeHealthProfilesModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthProfilesModal').style.display = 'none';
    });

    document.getElementById('closeHealthProfilesModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthProfilesModal').style.display = 'none';
    });

    document.getElementById('addProfileForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        addFamilyProfile();
    });

    document.getElementById('toggleProfilesEditModeBtn')?.addEventListener('click', () => {
        state.familyProfilesEditMode = !state.familyProfilesEditMode;
        updateProfilesEditModeButtonUI();
        renderFamilyProfilesList();
    });

    // Toggle Gemini API popover menu
    const popoverBtn = document.getElementById('geminiPopoverBtn');
    const popoverMenu = document.getElementById('geminiPopoverMenu');
    if (popoverBtn && popoverMenu) {
        popoverBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = popoverMenu.style.display === 'block';
            popoverMenu.style.display = isOpen ? 'none' : 'block';
        });
        
        popoverMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.addEventListener('click', () => {
            popoverMenu.style.display = 'none';
        });
    }

    // Save API key button
    document.getElementById('saveGeminiKeyBtn')?.addEventListener('click', async () => {
        const apiKey = document.getElementById('geminiApiKeyInput')?.value.trim() || '';
        state.geminiApiKey = apiKey;
        state.geminiApiKeyUpdated = new Date().toISOString();
        await saveLocalState();
        showToast("Đã lưu khóa API Gemini thành công!", "success");
        updateApiConfigCardState();
        if (popoverMenu) {
            popoverMenu.style.display = 'none';
        }
        performSync(true);
    });

    // Scanner dropzone & file input
    const dropzone = document.getElementById('healthScannerDropzone');
    const fileInput = document.getElementById('healthFileInput');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await handleHealthFile(e.target.files[0]);
            }
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                await handleHealthFile(e.dataTransfer.files[0]);
            }
        });
    }

    // Modal buttons
    document.getElementById('addNewRecordBtn')?.addEventListener('click', () => {
        openHealthEditModal();
    });

    document.getElementById('addIndicatorRowBtn')?.addEventListener('click', () => {
        addIndicatorEditRow();
    });

    document.getElementById('healthEditForm')?.addEventListener('submit', (e) => {
        saveMedicalRecord(e);
    });

    document.getElementById('editHealthRecordBtn')?.addEventListener('click', () => {
        document.getElementById('healthDetailModal').style.display = 'none';
        openHealthEditModal(activeMedicalRecordId);
    });

    document.getElementById('deleteHealthRecordBtn')?.addEventListener('click', () => {
        deleteMedicalRecord(activeMedicalRecordId);
    });

    document.getElementById('closeHealthDetailModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthDetailModal').style.display = 'none';
    });

    document.getElementById('closeHealthEditModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthEditModal').style.display = 'none';
    });

    document.getElementById('cancelHealthEditBtn')?.addEventListener('click', () => {
        document.getElementById('healthEditModal').style.display = 'none';
    });

    // AI Analysis Modal bindings
    document.getElementById('healthAiAnalysisBtn')?.addEventListener('click', () => {
        openHealthAiAnalysisModal();
    });

    document.getElementById('closeHealthAiAnalysisModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthAiAnalysisModal').style.display = 'none';
    });

    document.getElementById('closeHealthAiAnalysisModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthAiAnalysisModal').style.display = 'none';
    });

    document.getElementById('closeHealthAiMemberSelectorModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthAiMemberSelectorModal').style.display = 'none';
    });

    document.getElementById('closeHealthAiMemberSelectorModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthAiMemberSelectorModal').style.display = 'none';
    });

    document.getElementById('refreshHealthAiAnalysisBtn')?.addEventListener('click', () => {
        generateHealthAiAnalysis(true); // Force re-analysis
    });

    const indicatorSelect = document.getElementById('healthChartIndicatorSelect');
    if (indicatorSelect) {
        indicatorSelect.addEventListener('change', (e) => {
            const activeRecords = getFilteredHealthRecords();
            drawTrendChart(e.target.value, activeRecords);
        });

        // Enable quick mouse wheel scroll selection
        indicatorSelect.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            const newIndex = indicatorSelect.selectedIndex + direction;
            if (newIndex >= 0 && newIndex < indicatorSelect.options.length) {
                indicatorSelect.selectedIndex = newIndex;
                indicatorSelect.dispatchEvent(new Event('change'));
            }
        }, { passive: false });
    }

    // Previous and Next buttons click handlers
    document.getElementById('prevIndicatorBtn')?.addEventListener('click', () => {
        const select = document.getElementById('healthChartIndicatorSelect');
        if (select && select.options.length > 0) {
            let newIndex = select.selectedIndex - 1;
            if (newIndex >= 0) { // Do not wrap around
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
        }
    });

    document.getElementById('nextIndicatorBtn')?.addEventListener('click', () => {
        const select = document.getElementById('healthChartIndicatorSelect');
        if (select && select.options.length > 0) {
            let newIndex = select.selectedIndex + 1;
            if (newIndex < select.options.length) { // Do not wrap around
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
        }
    });

    document.getElementById('memberBackupFileInput')?.addEventListener('change', handleMemberBackupImportFile);
}

function updateApiConfigCardState() {
    const dot = document.getElementById('geminiIndicatorDot');
    if (dot) {
        dot.style.backgroundColor = state.geminiApiKey ? '#10b981' : '#ef4444';
    }
}

// Expose health details and removal row functions globally
window.openHealthDetail = openHealthDetail;
window.addIndicatorEditRow = addIndicatorEditRow;
window.handleRemoveIndicatorRow = handleRemoveIndicatorRow;

function renderHealthDashboard() {
    // Update API Key Card Collapsed state
    updateApiConfigCardState();

    // Auto populate Gemini Input if not done
    const geminiInput = document.getElementById('geminiApiKeyInput');
    if (geminiInput && !geminiInput.value && state.geminiApiKey) {
        geminiInput.value = state.geminiApiKey;
    }

    // Keep top select dropdown in sync with state profiles
    updateProfileDropdowns();

    const recordsGrid = document.getElementById('healthRecordsGrid');
    if (!recordsGrid) return;
    
    // Filter by selected family profile
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    let activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at);
        
    if (selectedProfileId !== 'all') {
        activeRecords = activeRecords.filter(r => {
            const rProfileId = r.profileId || 'p-self';
            return rProfileId === selectedProfileId;
        });
    }
        
    activeRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
    if (activeRecords.length === 0) {
        recordsGrid.innerHTML = `
            <div class="health-empty-state">
                <i data-lucide="folder-heart"></i>
                <h5 style="margin-top: 10px; font-weight: 600;">Chưa có hồ sơ y tế nào</h5>
                <p style="margin-top: 6px; font-size: 0.85rem;">Cấu hình Gemini API Key rồi kéo thả ảnh kết quả xét nghiệm để quét tự động, hoặc nhấp vào "Thêm hồ sơ thủ công" để bắt đầu theo dõi sức khỏe.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Hide chart card if empty
        const chartCard = document.getElementById('healthChartCard');
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    recordsGrid.innerHTML = activeRecords.map(r => {
        const typeLabel = getHealthTypeLabel(r.type);
        const dateStr = formatDate(r.date);
        
        // Extract preview indicators (max 3)
        const previewIndicators = (r.indicators || []).slice(0, 3);
        const previewHtml = previewIndicators.length > 0 
            ? `<div class="health-record-indicators-preview">
                ${previewIndicators.map(ind => {
                    const badgeClass = ind.assessment === 'high' ? 'badge-health-high' : (ind.assessment === 'low' ? 'badge-health-low' : 'badge-health-normal');
                    const badgeText = ind.assessment === 'high' ? 'Cao' : (ind.assessment === 'low' ? 'Thấp' : 'Bình thường');
                    return `
                        <div class="health-record-indicator-row">
                            <span class="indicator-preview-name">${escapeHTML(ind.name)}</span>
                            <span class="indicator-preview-val">
                                ${escapeHTML(ind.value)} <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 2px;">${escapeHTML(ind.unit)}</span>
                                <span class="${badgeClass}">${badgeText}</span>
                            </span>
                        </div>
                    `;
                }).join('')}
                ${r.indicators.length > 3 ? `<div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">và ${r.indicators.length - 3} chỉ số khác...</div>` : ''}
               </div>`
            : '';
            
        return `
            <div class="health-record-card" onclick="openHealthDetail('${r.id}')">
                <div class="health-record-card-header">
                    <div class="health-record-title">${escapeHTML(r.title)}</div>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${selectedProfileId === 'all' ? `
                            <span class="badge-relationship" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25);">
                                <i data-lucide="user" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i>
                                ${escapeHTML(getProfileName(r.profileId))}
                            </span>
                        ` : ''}
                        <span class="badge-relationship" style="background: rgba(15, 118, 110, 0.12); color: var(--health-accent); border: 1px solid rgba(15, 118, 110, 0.25);">${escapeHTML(typeLabel)}</span>
                    </div>
                </div>
                <div class="health-record-meta">
                    <span class="health-record-date">
                        <i data-lucide="calendar"></i> ${escapeHTML(dateStr)}
                    </span>
                    ${r.facility ? `
                    <span class="health-record-facility">
                        <i data-lucide="hospital"></i> ${escapeHTML(r.facility)}
                    </span>` : ''}
                </div>
                ${previewHtml}
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Draw trend charts
    renderHealthTrendsChart();
}

function getHealthTypeLabel(type) {
    switch (type) {
        case 'blood_test': return 'Xét nghiệm máu';
        case 'urine_test': return 'Xét nghiệm nước tiểu';
        case 'ultrasound': return 'Siêu âm';
        case 'other':
        default: return 'Khác';
    }
}

function getFilteredHealthRecords() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    let activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at);
        
    if (selectedProfileId !== 'all') {
        activeRecords = activeRecords.filter(r => {
            const rProfileId = r.profileId || 'p-self';
            return rProfileId === selectedProfileId;
        });
    }
    activeRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    return activeRecords;
}

function renderHealthTrendsChart() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    
    // If 'all' profiles are selected, do not show a combined trend chart as it is medically invalid
    if (selectedProfileId === 'all') {
        const chartCard = document.getElementById('healthChartCard');
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    const activeRecords = getFilteredHealthRecords();
        
    // Find all indicator keys/names and standard labels
    const indicatorMap = new Map();
    activeRecords.forEach(r => {
        (r.indicators || []).forEach(ind => {
            if (ind.name && ind.name.trim()) {
                const rawName = ind.name.trim();
                const dictKey = getDictionaryKey(rawName);
                if (dictKey === 'bloodgroup') return;
                
                if (dictKey && HEALTH_INDICATORS_DICTIONARY[dictKey]) {
                    indicatorMap.set(dictKey, HEALTH_INDICATORS_DICTIONARY[dictKey].name);
                } else {
                    const normRaw = rawName.toLowerCase();
                    if (normRaw.includes('nhóm máu') || normRaw.includes('nhom mau') || normRaw.includes('blood group') || normRaw.includes('bloodgroup')) {
                        return;
                    }
                    indicatorMap.set("raw:" + rawName, rawName);
                }
            }
        });
    });
    
    const chartCard = document.getElementById('healthChartCard');
    const selectEl = document.getElementById('healthChartIndicatorSelect');
    
    if (indicatorMap.size === 0 || !chartCard || !selectEl) {
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    chartCard.style.display = 'block';
    
    // Save current selected value
    const currentSelected = selectEl.value;
    
    // Populate select
    selectEl.innerHTML = Array.from(indicatorMap.entries()).map(([value, label]) => `
        <option value="${escapeHTML(value)}">${escapeHTML(label)}</option>
    `).join('');
    
    // Restore or default selection
    if (indicatorMap.has(currentSelected)) {
        selectEl.value = currentSelected;
    } else {
        selectEl.value = Array.from(indicatorMap.keys())[0];
    }
    
    drawTrendChart(selectEl.value, activeRecords);
}

function drawTrendChart(indicatorIdentifier, activeRecords) {
    let explanationName = indicatorIdentifier;
    let chartDisplayName = indicatorIdentifier;
    
    if (indicatorIdentifier.startsWith("raw:")) {
        explanationName = indicatorIdentifier.substring(4);
        chartDisplayName = indicatorIdentifier.substring(4);
    } else if (HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier]) {
        explanationName = HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier].name;
        chartDisplayName = HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier].name;
    }

    // Update indicator definition explanation card
    updateIndicatorExplanation(explanationName);
    
    // Update indicators progress bar and buttons disabled state
    updateIndicatorProgress();

    const ctx = document.getElementById('healthTrendChart')?.getContext('2d');
    if (!ctx) return;
    
    if (healthTrendChartInstance) {
        healthTrendChartInstance.destroy();
    }
    
    const points = [];
    activeRecords.forEach(r => {
        const ind = (r.indicators || []).find(i => {
            if (!i.name) return false;
            const rawName = i.name.trim();
            const dictKey = getDictionaryKey(rawName);
            if (indicatorIdentifier.startsWith("raw:")) {
                const targetRawName = indicatorIdentifier.substring(4);
                return !dictKey && rawName.toLowerCase() === targetRawName.toLowerCase();
            } else {
                return dictKey === indicatorIdentifier;
            }
        });
        if (ind) {
            const cleanVal = ind.value.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
            const numVal = parseFloat(cleanVal);
            if (!isNaN(numVal)) {
                points.push({
                    date: r.date,
                    label: formatDate(r.date),
                    value: numVal,
                    unit: ind.unit || '',
                    title: r.title,
                    assessment: ind.assessment || 'normal',
                    refRange: ind.refRange || ''
                });
            }
        }
    });
    
    if (points.length === 0) {
        return;
    }
    
    // Sort points chronologically
    points.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = points.map(p => p.label);
    const data = points.map(p => p.value);
    const unit = points[0]?.unit || '';
    
    const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = state.theme === 'dark' ? '#94a3b8' : '#4b5563';
    
    // Color points based on assessment: red for high, blue for low, green for normal
    const pointColors = points.map(p => {
        if (p.assessment === 'high') return '#ef4444'; // Red
        if (p.assessment === 'low') return '#3b82f6';  // Blue
        return '#10b981'; // Green
    });

    // Parse reference range from the latest record that has one
    const latestWithRange = [...points].reverse().find(p => p.refRange);
    const refRange = latestWithRange?.refRange || '';
    
    let minVal = null;
    let maxVal = null;
    if (refRange) {
        const rangeMatch = refRange.match(/^\s*([0-9.,]+)\s*[-–—]\s*([0-9.,]+)\s*$/);
        if (rangeMatch) {
            minVal = parseFloat(rangeMatch[1].replace(',', '.'));
            maxVal = parseFloat(rangeMatch[2].replace(',', '.'));
        } else {
            const lessMatch = refRange.match(/^\s*<\s*([0-9.,]+)\s*$/);
            if (lessMatch) {
                maxVal = parseFloat(lessMatch[1].replace(',', '.'));
                minVal = 0;
            } else {
                const greaterMatch = refRange.match(/^\s*>\s*([0-9.,]+)\s*$/);
                if (greaterMatch) {
                    minVal = parseFloat(greaterMatch[1].replace(',', '.'));
                }
            }
        }
    }

    // Chart.js plugin to draw reference range shading
    const refRangePlugin = {
        id: 'refRangeBackground',
        beforeDraw: (chart) => {
            const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
            if (y && (minVal !== null || maxVal !== null)) {
                let startY = bottom;
                let endY = top;
                
                if (minVal !== null) {
                    if (minVal >= y.min && minVal <= y.max) {
                        startY = y.getPixelForValue(minVal);
                    } else if (minVal < y.min) {
                        startY = bottom;
                    } else if (minVal > y.max) {
                        startY = top;
                    }
                }
                
                if (maxVal !== null) {
                    if (maxVal >= y.min && maxVal <= y.max) {
                        endY = y.getPixelForValue(maxVal);
                    } else if (maxVal > y.max) {
                        endY = top;
                    } else if (maxVal < y.min) {
                        endY = bottom;
                    }
                }
                
                // Draw shaded background zone
                ctx.save();
                ctx.fillStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.08)';
                ctx.fillRect(left, Math.min(startY, endY), right - left, Math.abs(startY - endY));
                
                // Draw boundaries (dotted lines)
                ctx.strokeStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.35)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                
                if (minVal !== null && minVal >= y.min && minVal <= y.max) {
                    ctx.beginPath();
                    ctx.moveTo(left, startY);
                    ctx.lineTo(right, startY);
                    ctx.stroke();
                }
                if (maxVal !== null && maxVal >= y.min && maxVal <= y.max) {
                    ctx.beginPath();
                    ctx.moveTo(left, endY);
                    ctx.lineTo(right, endY);
                    ctx.stroke();
                }
                
                // Draw boundary labels (text)
                ctx.fillStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.65)' : 'rgba(13, 148, 136, 0.85)';
                ctx.font = '10px "Be Vietnam Pro", sans-serif';
                ctx.textAlign = 'left';
                
                if (minVal !== null && minVal >= y.min && minVal <= y.max) {
                    ctx.fillText(`Ngưỡng dưới: ${minVal} ${unit}`, left + 8, startY - 4);
                }
                if (maxVal !== null && maxVal >= y.min && maxVal <= y.max) {
                    ctx.fillText(`Ngưỡng trên: ${maxVal} ${unit}`, left + 8, endY + 12);
                }
                ctx.restore();
            }
        }
    };
    
    healthTrendChartInstance = new Chart(ctx, {
        type: 'line',
        plugins: [refRangePlugin],
        data: {
            labels: labels,
            datasets: [{
                label: `${chartDisplayName} (${unit})`,
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointBorderColor: state.theme === 'dark' ? '#0f172a' : '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: points.map(p => p.assessment !== 'normal' ? 6 : 4.5),
                pointHoverBackgroundColor: pointColors,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                pointHoverRadius: points.map(p => p.assessment !== 'normal' ? 8 : 6.5),
                tension: 0.15,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            return `${points[idx].title} (${points[idx].date})`;
                        },
                        label: function(context) {
                            const p = points[context.dataIndex];
                            const statusLabel = p.assessment === 'high' ? ' (Cao)' : (p.assessment === 'low' ? ' (Thấp)' : ' (Bình thường)');
                            return ` Trị số: ${context.parsed.y} ${unit}${statusLabel}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

async function handleHealthFile(file) {
    if (!state.geminiApiKey) {
        showToast("Vui lòng cấu hình Gemini API Key trước khi quét!", "warning");
        const popoverMenu = document.getElementById('geminiPopoverMenu');
        if (popoverMenu) {
            popoverMenu.style.display = 'block';
        }
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast("Chỉ hỗ trợ quét file ảnh xét nghiệm (.png, .jpg, .jpeg)!", "error");
        return;
    }
    
    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) statusText.innerText = 'Đang đọc file ảnh xét nghiệm...';
    
    try {
        const base64Data = await fileToBase64(file);
        if (statusText) statusText.innerText = 'Đang phân tích chỉ số xét nghiệm bằng Gemini AI...';
        
        const responseJson = await callGeminiAPI(base64Data, file.type);
        
        if (overlay) overlay.style.display = 'none';
        
        // Open edit modal with results
        openHealthEditModal(null, responseJson);
    } catch (err) {
        console.error("Gemini scanning error:", err);
        if (overlay) overlay.style.display = 'none';
        showToast("Quét ảnh thất bại: " + err.message, "error");
    } finally {
        const fileInput = document.getElementById('healthFileInput');
        if (fileInput) fileInput.value = '';
    }
}

async function callGeminiAPI(base64Data, mimeType) {
    const apiKey = state.geminiApiKey;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    
    const promptText = `Hãy đóng vai trò là một chuyên gia y tế và kỹ thuật viên xét nghiệm. Hãy phân tích hình ảnh kết quả xét nghiệm y khoa được cung cấp và trích xuất thông tin sang định dạng JSON chính xác.

Yêu cầu cấu trúc dữ liệu JSON đầu ra:
{
  "title": "Tên xét nghiệm hoặc tiêu đề hồ sơ (ví dụ: Xét nghiệm máu tổng quát, Siêu âm ổ bụng)",
  "type": "Phân loại xét nghiệm, chỉ chọn một trong các giá trị sau: 'blood_test' (nếu là xét nghiệm máu), 'urine_test' (nếu là xét nghiệm nước tiểu), 'ultrasound' (nếu là siêu âm), 'other' (nếu là loại khác)",
  "facility": "Tên bệnh viện, phòng khám hoặc cơ sở y tế nơi thực hiện xét nghiệm. Nếu không tìm thấy, để trống",
  "date": "Ngày xét nghiệm/khám theo định dạng YYYY-MM-DD. Nếu không tìm thấy, hãy lấy ngày hiện tại: ${new Date().toISOString().split('T')[0]}",
  "indicators": [
    {
      "name": "Tên chỉ số xét nghiệm (ví dụ: Glucose, Cholesterol, SGOT, SGPT, Bạch cầu, Hồng cầu...)",
      "value": "Trị số đo được (ví dụ: 5.4, 120, có thể là số hoặc chuỗi ngắn như Dương tính/Âm tính)",
      "unit": "Đơn vị đo (ví dụ: mmol/L, g/L, UI/L, u/l... nếu không có đơn vị thì để trống)",
      "refRange": "Khoảng tham chiếu hoặc ngưỡng bình thường (ví dụ: 3.9 - 6.1, < 5.2, Âm tính...)",
      "assessment": "Đánh giá trị số so với ngưỡng tham chiếu, chỉ được chọn một trong các giá trị sau: 'high' (nếu cao hơn ngưỡng), 'low' (nếu thấp hơn ngưỡng), 'normal' (nếu nằm trong khoảng bình thường hoặc bình thường)"
    }
  ],
  "notes": "Tóm tắt ngắn gọn nhận xét chung, kết luận của bác sĩ hoặc lời khuyên sức khỏe dựa trên các chỉ số bất thường (nếu có)"
}

Lưu ý quan trọng:
1. Hãy tìm kiếm và trích xuất tất cả các chỉ số xét nghiệm có trong ảnh.
2. Đảm bảo trị số ('value') và đơn vị ('unit') khớp với hình ảnh xét nghiệm.
3. Trong trường 'assessment', hãy đánh giá cẩn thận dựa trên 'refRange'. Nếu trị số cao hơn ngưỡng cho phép thì đánh giá là 'high', thấp hơn là 'low', bình thường là 'normal'.
4. Trả về kết quả hoàn toàn bằng tiếng Việt.
5. Chỉ trả về một đối tượng JSON hợp lệ duy nhất khớp với cấu trúc trên. Không kèm bất kỳ văn bản giải thích hoặc dấu nháy markdown nào ngoài JSON.`;

    const requestBody = {
        contents: [
            {
                parts: [
                    { text: promptText },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            responseMimeType: "application/json"
        }
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
        throw new Error(errMsg);
    }
    
    const resData = await response.json();
    const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textResponse) {
        throw new Error("Không nhận được phản hồi phân tích từ Gemini.");
    }
    
    try {
        return JSON.parse(textResponse.trim());
    } catch (e) {
        console.error("Gemini raw response text parse failure:", textResponse, e);
        throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng JSON.");
    }
}

function openHealthEditModal(recordId = null, initialData = null) {
    const editModal = document.getElementById('healthEditModal');
    const modalTitle = document.getElementById('healthEditModalTitle');
    const form = document.getElementById('healthEditForm');
    
    if (!editModal || !form) return;
    
    // Populate profile select options
    const editProfileSelect = document.getElementById('healthEditProfile');
    if (editProfileSelect) {
        editProfileSelect.innerHTML = (state.familyProfiles || []).map(p => `
            <option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>
        `).join('');
    }
    
    // Clear form fields
    document.getElementById('healthRecordId').value = recordId || '';
    document.getElementById('healthEditTitle').value = '';
    document.getElementById('healthEditType').value = 'blood_test';
    document.getElementById('healthEditDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('healthEditFacility').value = '';
    document.getElementById('healthEditNotes').value = '';
    document.getElementById('healthIndicatorsEditRows').innerHTML = '';
    
    // Pre-select active family member filter if not 'all'
    if (editProfileSelect) {
        const curProfile = state.selectedHealthProfileId || 'all';
        editProfileSelect.value = curProfile !== 'all' ? curProfile : 'p-self';
    }
    
    if (recordId) {
        modalTitle.innerText = "Chỉnh sửa Hồ sơ y tế";
        const record = state.medicalRecords.find(r => r.id === recordId);
        if (record) {
            document.getElementById('healthEditTitle').value = record.title || '';
            document.getElementById('healthEditType').value = record.type || 'blood_test';
            document.getElementById('healthEditDate').value = record.date || new Date().toISOString().split('T')[0];
            document.getElementById('healthEditFacility').value = record.facility || '';
            document.getElementById('healthEditNotes').value = record.notes || '';
            if (editProfileSelect) {
                editProfileSelect.value = record.profileId || 'p-self';
            }
            
            (record.indicators || []).forEach(ind => {
                addIndicatorEditRow(ind.name, ind.value, ind.unit, ind.refRange, ind.assessment);
            });
        }
    } else {
        modalTitle.innerText = initialData ? "Xác nhận kết quả quét bằng AI" : "Thêm Hồ sơ y tế thủ công";
        
        if (initialData) {
            document.getElementById('healthEditTitle').value = initialData.title || '';
            document.getElementById('healthEditType').value = initialData.type || 'blood_test';
            document.getElementById('healthEditDate').value = initialData.date || new Date().toISOString().split('T')[0];
            document.getElementById('healthEditFacility').value = initialData.facility || '';
            document.getElementById('healthEditNotes').value = initialData.notes || '';
            
            (initialData.indicators || []).forEach(ind => {
                addIndicatorEditRow(ind.name, ind.value, ind.unit, ind.refRange, ind.assessment);
            });
        } else {
            // Add one default empty row
            addIndicatorEditRow();
        }
    }
    
    editModal.style.display = 'flex';
}

function addIndicatorEditRow(name = '', value = '', unit = '', refRange = '', assessment = 'normal') {
    const container = document.getElementById('healthIndicatorsEditRows');
    if (!container) return;
    
    const rowId = 'ind-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'health-indicators-edit-row';
    rowDiv.id = rowId;
    
    rowDiv.innerHTML = `
        <input type="text" class="form-control health-input ind-name" required placeholder="Chỉ số (Glucose)" value="${escapeHTML(name)}">
        <input type="text" class="form-control health-input ind-value" required placeholder="Trị số (5.4)" value="${escapeHTML(value)}">
        <input type="text" class="form-control health-input ind-unit" placeholder="Đơn vị (mmol/L)" value="${escapeHTML(unit)}">
        <input type="text" class="form-control health-input ind-refRange" placeholder="Tham chiếu (3.9 - 6.1)" value="${escapeHTML(refRange)}">
        <select class="form-control health-input ind-assessment">
            <option value="normal" ${assessment === 'normal' ? 'selected' : ''}>Bình thường</option>
            <option value="high" ${assessment === 'high' ? 'selected' : ''}>Cao</option>
            <option value="low" ${assessment === 'low' ? 'selected' : ''}>Thấp</option>
        </select>
        <button type="button" class="health-remove-row-btn" onclick="handleRemoveIndicatorRow(this)">
            <i data-lucide="trash-2"></i>
        </button>
    `;
    
    container.appendChild(rowDiv);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleRemoveIndicatorRow(btn) {
    if (!btn) return;
    if (btn.classList.contains('confirm-delete')) {
        if (btn.dataset.timeoutId) {
            clearTimeout(parseInt(btn.dataset.timeoutId, 10));
        }
        btn.closest('.health-indicators-edit-row').remove();
    } else {
        document.querySelectorAll('.health-remove-row-btn.confirm-delete').forEach(otherBtn => {
            otherBtn.classList.remove('confirm-delete');
            if (otherBtn.dataset.timeoutId) {
                clearTimeout(parseInt(otherBtn.dataset.timeoutId, 10));
                delete otherBtn.dataset.timeoutId;
            }
        });
        
        btn.classList.add('confirm-delete');
        const timeoutId = setTimeout(() => {
            btn.classList.remove('confirm-delete');
            delete btn.dataset.timeoutId;
        }, 3000);
        btn.dataset.timeoutId = timeoutId;
    }
}

async function saveMedicalRecord(event) {
    event.preventDefault();
    
    const recordId = document.getElementById('healthRecordId').value;
    const title = document.getElementById('healthEditTitle').value.trim();
    const type = document.getElementById('healthEditType').value;
    const profileId = document.getElementById('healthEditProfile').value;
    const date = document.getElementById('healthEditDate').value;
    const facility = document.getElementById('healthEditFacility').value.trim();
    const notes = document.getElementById('healthEditNotes').value.trim();
    
    const indicatorRows = document.querySelectorAll('#healthIndicatorsEditRows .health-indicators-edit-row');
    const indicators = [];
    
    indicatorRows.forEach(row => {
        const name = row.querySelector('.ind-name').value.trim();
        const value = row.querySelector('.ind-value').value.trim();
        const unit = row.querySelector('.ind-unit').value.trim();
        const refRange = row.querySelector('.ind-refRange').value.trim();
        const assessment = row.querySelector('.ind-assessment').value;
        
        if (name) {
            indicators.push({ name, value, unit, refRange, assessment });
        }
    });
    
    const nowIso = new Date().toISOString();
    
    if (recordId) {
        const index = state.medicalRecords.findIndex(r => r.id === recordId);
        if (index !== -1) {
            state.medicalRecords[index] = {
                ...state.medicalRecords[index],
                title,
                type,
                profileId,
                date,
                facility,
                notes,
                indicators,
                updated_at: nowIso
            };
        }
    } else {
        const newRecord = {
            id: 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title,
            type,
            profileId,
            date,
            facility,
            notes,
            indicators,
            created_at: nowIso,
            updated_at: nowIso
        };
        if (!state.medicalRecords) {
            state.medicalRecords = [];
        }
        state.medicalRecords.push(newRecord);
    }
    
    state.medicalRecordsUpdated = nowIso;
    
    await saveLocalState();
    renderHealthDashboard();
    
    document.getElementById('healthEditModal').style.display = 'none';
    showToast(recordId ? "Cập nhật hồ sơ y tế thành công!" : "Lưu hồ sơ y tế thành công!", "success");
    
    performSync(true);
}

window.deleteMedicalRecord = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ y tế này?")) return;
    
    const index = state.medicalRecords.findIndex(r => r.id === id);
    if (index === -1) return;
    
    lastDeletedRecord = {
        type: 'medical',
        id: id,
        originalRecord: { ...state.medicalRecords[index] }
    };
    
    const now = new Date().toISOString();
    state.medicalRecords[index] = {
        ...state.medicalRecords[index],
        deleted_at: now,
        updated_at: now
    };
    state.medicalRecordsUpdated = now;
    
    await saveLocalState();
    renderHealthDashboard();
    
    document.getElementById('healthDetailModal').style.display = 'none';
    
    showToast(`Đã xóa hồ sơ y tế. <a href="#" onclick="undoDelete(event)" style="color: var(--accent-emerald); font-weight: 600; text-decoration: underline; margin-left: 8px;">Hoàn tác</a>`);
    
    performSync(true);
};

function openHealthDetail(id) {
    activeMedicalRecordId = id;
    const modal = document.getElementById('healthDetailModal');
    if (!modal) return;
    
    const record = state.medicalRecords.find(r => r.id === id);
    if (!record) return;
    
    document.getElementById('healthDetailTitle').innerText = record.title || '-';
    document.getElementById('healthDetailDate').innerText = formatDate(record.date) || '-';
    document.getElementById('healthDetailFacility').innerText = record.facility || '-';
    document.getElementById('healthDetailTypeBadge').innerText = getHealthTypeLabel(record.type);
    
    const profileBadge = document.getElementById('healthDetailProfileBadge');
    if (profileBadge) {
        profileBadge.innerText = getProfileName(record.profileId);
    }
    
    document.getElementById('healthDetailNotes').innerText = record.notes || 'Không có ghi chú.';
    
    const tbody = document.getElementById('healthDetailIndicatorsTableBody');
    if (tbody) {
        if (!record.indicators || record.indicators.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Không có chỉ số xét nghiệm nào.</td></tr>`;
        } else {
            tbody.innerHTML = record.indicators.map(ind => {
                const badgeClass = ind.assessment === 'high' ? 'badge-health-high' : (ind.assessment === 'low' ? 'badge-health-low' : 'badge-health-normal');
                const badgeText = ind.assessment === 'high' ? 'Cao' : (ind.assessment === 'low' ? 'Thấp' : 'Bình thường');
                const unitHtml = ind.unit ? ` <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 2px;">${escapeHTML(ind.unit)}</span>` : '';
                return `
                    <tr>
                        <td><strong>${escapeHTML(ind.name)}</strong></td>
                        <td style="text-align: center; font-weight: 600;">${escapeHTML(ind.value)}${unitHtml}</td>
                        <td>${escapeHTML(ind.refRange || '-')}</td>
                        <td style="text-align: center;"><span class="${badgeClass}">${badgeText}</span></td>
                    </tr>
                `;
            }).join('');
        }
    }
    
    modal.style.display = 'flex';
}

function openHealthAiMemberSelectorModal() {
    const modal = document.getElementById('healthAiMemberSelectorModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const listContainer = document.getElementById('healthAiMemberSelectorList');
    if (!listContainer) return;
    
    const profiles = state.familyProfiles && state.familyProfiles.length > 0 
        ? state.familyProfiles 
        : [{ id: 'p-self', name: 'Bản thân' }];
    
    listContainer.innerHTML = profiles.map(p => {
        const isDefault = p.id === 'p-self';
        return `
            <div class="health-profile-item" style="cursor: pointer; padding: 12px 16px; margin-bottom: 2px;" onclick="selectMemberForAiAnalysis('${p.id}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="user" style="color: var(--health-accent); width: 18px; height: 18px;"></i>
                    <span class="profile-item-name" style="font-weight: 500; color: var(--text-primary);">${escapeHTML(p.name)}</span>
                    ${isDefault ? '<span style="font-size: 0.72rem; color: var(--text-muted); padding: 1px 6px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; border: 1px solid var(--border-color);">Mặc định</span>' : ''}
                </div>
                <i data-lucide="chevron-right" style="color: var(--text-muted); width: 16px; height: 16px;"></i>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectMemberForAiAnalysis(profileId) {
    const modal = document.getElementById('healthAiMemberSelectorModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    state.selectedHealthProfileId = profileId;
    const mainSelect = document.getElementById('healthProfileSelect');
    if (mainSelect) {
        mainSelect.value = profileId;
    }
    renderHealthDashboard();
    
    openHealthAiAnalysisModal();
}

function openHealthAiAnalysisModal() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    if (selectedProfileId === 'all') {
        openHealthAiMemberSelectorModal();
        return;
    }

    const modal = document.getElementById('healthAiAnalysisModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Get the profile object
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    const lastAiAnalysis = profile ? profile.lastAiAnalysis : state.lastAiAnalysis;
    
    // If we have cached analysis, render it. Otherwise, run analysis.
    if (lastAiAnalysis) {
        renderHealthAiReport();
    } else {
        generateHealthAiAnalysis(false);
    }
}

function cleanLatex(text) {
    if (!text) return text;
    let cleaned = text;
    
    // Replace \text{...} with just ...
    cleaned = cleaned.replace(/\\text\s*\{\s*([^}]+)\s*\}/g, '$1');
    
    // Replace \times with x
    cleaned = cleaned.replace(/\\times/g, 'x');
    
    // Replace \mu with µ
    cleaned = cleaned.replace(/\\mu/g, 'µ');
    
    // Remove inline LaTeX math delimiters ($...$)
    cleaned = cleaned.replace(/\$([^\$]+)\$/g, '$1');
    
    return cleaned;
}

function renderHealthAiReport() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    
    const lastAiAnalysis = profile ? profile.lastAiAnalysis : state.lastAiAnalysis;
    const lastAiAnalysisDate = profile ? profile.lastAiAnalysisDate : state.lastAiAnalysisDate;
    
    const dateEl = document.getElementById('healthAiAnalysisDate');
    const reportContentEl = document.getElementById('healthAiReportContent');
    
    if (dateEl && lastAiAnalysisDate) {
        const formattedDate = formatDate(lastAiAnalysisDate);
        const formattedTime = new Date(lastAiAnalysisDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        dateEl.innerText = `${formattedDate} lúc ${formattedTime}`;
    } else if (dateEl) {
        dateEl.innerText = 'Chưa phân tích';
    }
    
    if (reportContentEl && lastAiAnalysis) {
        const cleanedReport = cleanLatex(lastAiAnalysis);
        if (typeof marked !== 'undefined') {
            reportContentEl.innerHTML = marked.parse(cleanedReport);
        } else {
            reportContentEl.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; padding: 0; background: none; border: none; color: inherit;">${escapeHTML(cleanedReport)}</pre>`;
        }
    }
}

async function generateHealthAiAnalysis(forceFresh = false) {
    if (!state.geminiApiKey) {
        showToast("Vui lòng cấu hình Gemini API Key trước!", "warning");
        const popoverMenu = document.getElementById('geminiPopoverMenu');
        if (popoverMenu) {
            popoverMenu.style.display = 'block';
        }
        return;
    }
    
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    if (selectedProfileId === 'all') {
        showToast("Vui lòng chọn một thành viên cụ thể để phân tích sức khỏe!", "warning");
        return;
    }
    
    const activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at && (r.profileId || 'p-self') === selectedProfileId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
    if (activeRecords.length === 0) {
        showToast("Không tìm thấy hồ sơ y tế nào của thành viên này để phân tích!", "warning");
        return;
    }
    
    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) statusText.innerText = 'AI đang tổng hợp và phân tích lịch sử xét nghiệm của thành viên...';
    
    try {
        let historyStr = "";
        activeRecords.forEach((r, idx) => {
            const dateStr = formatDate(r.date);
            const typeLabel = getHealthTypeLabel(r.type);
            historyStr += `--- LẦN KHÁM ${idx + 1} ---\n`;
            historyStr += `Tiêu đề: ${r.title}\n`;
            historyStr += `Ngày: ${dateStr}\n`;
            historyStr += `Cơ sở y tế: ${r.facility || 'Không ghi rõ'}\n`;
            historyStr += `Loại xét nghiệm: ${typeLabel}\n`;
            if (r.notes) {
                historyStr += `Ghi chú/Kết luận của bác sĩ: ${r.notes}\n`;
            }
            historyStr += `Chỉ số kết quả:\n`;
            (r.indicators || []).forEach(ind => {
                const assessmentStr = ind.assessment === 'high' ? 'Cao 🔴' : (ind.assessment === 'low' ? 'Thấp 🟡' : 'Bình thường 🟢');
                historyStr += `- Tên chỉ số: ${ind.name} | Trị số: ${ind.value} ${ind.unit || ''} | Khoảng tham chiếu: ${ind.refRange || 'Không có'} | Đánh giá: ${assessmentStr}\n`;
            });
            historyStr += `\n`;
        });
        
        // Find profile name
        const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
        const memberName = profile ? profile.name : 'Bản thân';
        
        const prompt = `Hãy đóng vai trò là một chuyên gia y tế, bác sĩ tư vấn sức khỏe cao cấp. Dưới đây là toàn bộ lịch sử kết quả xét nghiệm y tế của thành viên "${memberName}" (được sắp xếp theo trình tự thời gian từ cũ nhất đến mới nhất):\n\n${historyStr}\n
Hãy đọc và phân tích toàn bộ lịch sử xét nghiệm trên, sau đó lập một bản báo cáo phân tích sức khỏe tổng quan nâng cao bằng tiếng Việt ở định dạng Markdown (sử dụng tiêu đề h2 và h3 để phân cấp rõ ràng). Báo cáo cần bao gồm các mục chính:

1. **Tổng quan xu hướng phát triển sức khỏe**: Nhận định xem tình trạng sức khỏe tổng thể đang tiến triển tốt lên, ổn định hay có xu hướng xấu đi qua thời gian. Đánh giá sự biến động của các chỉ số xét nghiệm chính (ví dụ: chỉ số đường huyết, men gan, mỡ máu... tăng giảm thế nào qua các lần xét nghiệm).
2. **Cảnh báo các nguy cơ sức khỏe lớn nhất**: Nhấn mạnh các chỉ số liên tục bất thường (Cao/Thấp) và các nguy cơ bệnh lý tiềm ẩn đi kèm cần đặc biệt lưu ý.
3. **Lời khuyên chi tiết từ Chuyên gia**:
   - **Chế độ ăn uống**: Nên bổ sung hoặc kiêng cữ những nhóm thực phẩm nào để cải thiện các chỉ số xấu.
   - **Chế độ sinh hoạt & Vận động**: Các bài tập thể thao, cường độ luyện tập và thói quen sinh hoạt tốt phù hợp với tình trạng sức khỏe hiện tại.
   - **Thăm khám y khoa**: Đưa ra lời khuyên về tần suất xét nghiệm lại hoặc có cần đi khám chuyên khoa sâu nào ngay không.

*Lưu ý quan trọng*: Trả về kết quả trực tiếp bằng định dạng Markdown sạch đẹp, trình bày chuyên nghiệp như một báo cáo y khoa thực thụ. Tuyệt đối KHÔNG sử dụng ký tự $ hoặc các ký hiệu toán học LaTeX (như $...$, $$...$$, \text{...}, \times, \mu) để biểu diễn các số liệu hoặc đơn vị đo lường. Thay vào đó, hãy dùng văn bản thường thuần túy (ví dụ: dùng "x" thay cho "\times", dùng "uL" hoặc "µL" thay cho "\mu L", dùng "15.8 g/dL" thay cho "$15.8 \text{ g/dL}$"). Tất cả các số liệu và đơn vị phải hiển thị dưới dạng văn bản thường đọc được trực tiếp. Ở cuối báo cáo hãy thêm một câu nhắc nhở nhẹ nhàng rằng đây là phân tích từ AI và khuyên người dùng nên tham vấn ý kiến trực tiếp từ bác sĩ chuyên môn.`;

        const apiKey = state.geminiApiKey;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: prompt }
                    ]
                }
            ]
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errJson = await response.json().catch(() => ({}));
            const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
            throw new Error(errMsg);
        }
        
        const resData = await response.json();
        const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error("Không nhận được phản hồi phân tích từ Gemini.");
        }
        
        const nowIso = new Date().toISOString();
        
        if (profile) {
            profile.lastAiAnalysis = textResponse;
            profile.lastAiAnalysisDate = nowIso;
            profile.lastAiAnalysisUpdated = nowIso;
            
            if (selectedProfileId === 'p-self') {
                state.lastAiAnalysis = textResponse;
                state.lastAiAnalysisDate = nowIso;
                state.lastAiAnalysisUpdated = nowIso;
            }
        }
        
        state.familyProfilesUpdated = nowIso;
        
        await saveLocalState();
        
        if (overlay) overlay.style.display = 'none';
        
        renderHealthAiReport();
        showToast("Phân tích sức khỏe bằng AI thành công!", "success");
        
        performSync(true);
        
    } catch (err) {
        console.error("AI Analysis error:", err);
        if (overlay) overlay.style.display = 'none';
        showToast("Phân tích sức khỏe AI thất bại: " + err.message, "error");
    }
}

// --- Medical Indicators Dictionary & Explanation Logic ---

const HEALTH_INDICATORS_DICTIONARY = {
    'glucose': {
        name: 'Glucose (Đường huyết lúc đói)',
        def: 'Đường huyết (đường trong máu lúc đói). Đánh giá khả năng chuyển hóa đường của cơ thể và là chỉ số cốt lõi để phát hiện bệnh tiểu đường.',
        high: 'Cảnh báo nguy cơ tiền tiểu đường, tiểu đường thai kỳ, tiểu đường tuýp 2, hoặc rối loạn dung nạp glucose. Cần hạn chế tinh bột, đồ ngọt, tăng vận động.',
        low: 'Gây hạ đường huyết (chóng mặt, run tay chân, vã mồ hôi, tim đập nhanh). Cần bổ sung ngay nước đường, bánh kẹo ngọt hoặc tinh bột hấp thu nhanh.'
    },
    'hba1c': {
        name: 'HbA1c (Đường huyết trung bình 3 tháng)',
        def: 'Tỷ lệ hemoglobin liên kết với đường trong máu. Phản ánh mức kiểm soát đường huyết trung bình trong 2-3 tháng gần nhất.',
        high: 'Kiểm soát đường huyết kém ở bệnh nhân tiểu đường, hoặc chẩn đoán xác định bệnh tiểu đường (khi >= 6.5%). Tăng nguy cơ biến chứng tim mạch, mắt, thận.',
        low: 'Ít gặp, có thể xảy ra ở người bị thiếu máu nặng, tan máu huyết tán, hoặc suy gan thận nặng làm thay đổi đời sống hồng cầu.'
    },
    'insulin': {
        name: 'Insulin',
        def: 'Hormone do tuyến tụy sản sinh, giúp vận chuyển đường từ máu vào trong tế bào để tạo năng lượng.',
        high: 'Cảnh báo tình trạng kháng insulin (tiền đề của tiểu đường tuýp 2), hội chứng buồng trứng đa nang (PCOS), hoặc u tuyến tụy tiết insulin.',
        low: 'Cảnh báo suy kiệt tuyến tụy (gặp ở bệnh tiểu đường tuýp 1 hoặc giai đoạn muộn của tiểu đường tuýp 2).'
    },
    'cholesterol': {
        name: 'Cholesterol toàn phần',
        def: 'Tổng lượng cholesterol trong máu (bao gồm cả mỡ tốt và mỡ xấu). Cần thiết cho hoạt động của màng tế bào và sản sinh hormone.',
        high: 'Tăng nguy cơ xơ vữa động mạch, cao huyết áp, nhồi máu cơ tim, và đột quỵ. Cần hạn chế mỡ động vật, phủ tạng, tăng chất xơ và tập luyện.',
        low: 'Có thể do suy dinh dưỡng, cường giáp, suy gan nặng, hoặc hội chứng kém hấp thu.'
    },
    'triglycerides': {
        name: 'Triglycerides (Chất béo trung tính)',
        def: 'Dạng chất béo phổ biến nhất trong cơ thể, tích tụ từ calo dư thừa. Nguồn năng lượng dự trữ nhưng quá nhiều sẽ gây hại mạch máu.',
        high: 'Tăng xơ vữa động mạch. Đặc biệt khi triglycerides tăng rất cao (> 11.3 mmol/L hoặc > 1000 mg/dL) có nguy cơ gây viêm tụy cấp nguy hiểm tính mạng.',
        low: 'Có thể do suy kiệt, chế độ ăn quá ít chất béo, cường giáp, hoặc hội chứng kém hấp thu.'
    },
    'hdl': {
        name: 'HDL-Cholesterol (Mỡ tốt)',
        def: 'Lipoprotein tỷ trọng cao. Thu gom cholesterol dư thừa từ các mô và mạch máu đưa về gan để xử lý và đào thải ra ngoài.',
        high: 'Tốt cho hệ tim mạch, giúp bảo vệ mạch máu chống lại mảng xơ vữa (thường do tập luyện thể thao tốt, cơ địa lành mạnh).',
        low: 'Làm tăng nguy cơ xơ vữa động mạch và các biến cố tim mạch dù các chỉ số mỡ máu khác bình thường.'
    },
    'ldl': {
        name: 'LDL-Cholesterol (Mỡ xấu)',
        def: 'Lipoprotein tỷ trọng thấp. Vận chuyển cholesterol từ gan đến các tế bào. Dư thừa sẽ bám vào thành mạch tạo xơ vữa gây tắc hẹp lòng mạch.',
        high: 'Nguy cơ cao gây xơ vữa mạch máu, dẫn tới tai biến mạch máu não, nhồi máu cơ tim. Cần điều trị bằng thuốc hạ mỡ máu nếu có chỉ định.',
        low: 'Thường ít gặp lâm sàng, có thể do suy gan, suy dinh dưỡng hoặc cường giáp.'
    },
    'ast': {
        name: 'AST / SGOT (Men gan AST)',
        def: 'Men xúc tác chuyển hóa đạm, có nhiều ở tế bào gan, cơ tim và cơ xương. Tăng lên khi tế bào ở các cơ quan này bị tổn thương hoặc hủy hoại.',
        high: 'Cảnh báo tổn thương tế bào gan do viêm gan cấp/mãn tính, gan nhiễm mỡ, độc chất, bia rượu, hoặc tổn thương cơ tim (nhồi máu cơ tim).',
        low: 'Không có ý nghĩa lâm sàng đáng ngại, thường phản ánh tình trạng bình thường.'
    },
    'alt': {
        name: 'ALT / SGPT (Men gan ALT)',
        def: 'Men gan đặc hiệu nhất cho tế bào gan, hầu như chỉ có ở gan. Là chỉ số nhạy bén nhất để phát hiện hủy hoại tế bào gan.',
        high: 'Biểu hiện rõ rệt của tổn thương nhu mô gan (viêm gan virus, viêm gan do thuốc, nhiễm độc chất, gan nhiễm mỡ nặng, xơ gan tiến triển).',
        low: 'Không có ý nghĩa lâm sàng đáng ngại.'
    },
    'ggt': {
        name: 'GGT (Gamma-Glutamyl Transferase)',
        def: 'Men gan rất nhạy cảm nằm ở màng tế bào ống mật và tế bào gan. Tăng cao nhanh chóng khi có tổn thương gan do cồn hoặc tắc mật.',
        high: 'Thường gặp ở người uống nhiều bia rượu, viêm đường mật, tắc mật, hoặc tổn thương gan do dùng nhiều thuốc tây hại gan.',
        low: 'Không có ý nghĩa lâm sàng đáng ngại.'
    },
    'bilirubin': {
        name: 'Bilirubin (Sắc tố mật)',
        def: 'Sản phẩm của quá trình phân hủy tế bào hồng cầu già. Gan có nhiệm vụ lọc chất này và đào thải qua mật.',
        high: 'Gây vàng da, vàng mắt, nước tiểu sẫm màu. Cảnh báo các bệnh lý về gan mật (tắc mật, viêm gan) hoặc bệnh tan máu (hủy hồng cầu hàng loạt).',
        low: 'Thường ít gặp và không có ý nghĩa bệnh lý đáng ngại.'
    },
    'albumin': {
        name: 'Albumin',
        def: 'Protein chiếm tỷ lệ cao nhất trong máu, do gan sản xuất. Giúp giữ nước không bị rò rỉ ra ngoài mạch máu và vận chuyển thuốc, hormone.',
        high: 'Thường do cơ thể bị mất nước cấp tính (tiêu chảy, nôn mửa nặng).',
        low: 'Cảnh báo chức năng gan suy giảm (xơ gan, suy gan) hoặc thận bị thất thoát đạm (hội chứng thận hư), hoặc suy dinh dưỡng nặng.'
    },
    'total protein': {
        name: 'Protein toàn phần',
        def: 'Tổng lượng protein (Albumin và Globulin) có trong huyết thanh. Phản ánh chức năng gan, thận và tình trạng miễn dịch của cơ thể.',
        high: 'Có thể gặp trong các bệnh lý huyết học (như đau tủy xương), nhiễm trùng mãn tính hoặc cơ thể bị mất nước.',
        low: 'Gặp trong suy dinh dưỡng, xơ gan, suy gan, suy thận, hội chứng thận hư, hoặc kém hấp thu đạm.'
    },
    'ure': {
        name: 'Ure / Urea (Chỉ số Ure máu)',
        def: 'Sản phẩm cuối cùng của quá trình chuyển hóa đạm trong cơ thể, được lọc qua cầu thận và đào thải ra ngoài qua nước tiểu.',
        high: 'Cảnh báo chức năng lọc của thận suy giảm (suy thận), hoặc do chế độ ăn quá nhiều đạm, xuất huyết tiêu hóa, cơ thể mất nước nặng.',
        low: 'Gặp khi chế độ ăn nghèo đạm, suy dinh dưỡng, truyền dịch quá nhiều, hoặc suy gan nặng (do gan giảm tổng hợp ure).'
    },
    'creatinine': {
        name: 'Creatinine (Chức năng lọc của thận)',
        def: 'Chất cặn bã từ quá trình co cơ, đào thải duy nhất qua thận. Là chỉ số chính xác và nhạy nhất để chẩn đoán mức độ suy thận.',
        high: 'Cảnh báo tình trạng suy thận cấp hoặc mãn tính, tắc nghẽn đường tiểu (sỏi, u chèn ép), hoặc chấn thương hủy hoại cơ nặng.',
        low: 'Gặp ở người bị suy kiệt, teo cơ, người già yếu ít vận động, phụ nữ mang thai (do tăng lưu lượng lọc máu ở thận).'
    },
    'egfr': {
        name: 'eGFR (Độ lọc cầu thận ước tính)',
        def: 'Thể tích máu được thận lọc sạch trong một phút. Phản ánh phần trăm năng lực hoạt động còn lại của hai quả thận.',
        high: 'Thường là bình thường (nếu eGFR > 90), phản ánh chức năng thận rất tốt.',
        low: 'Cảnh báo suy thận. eGFR càng thấp thì mức độ suy thận càng nặng (dưới 60 là suy thận độ 3 trở lên, dưới 15 là suy thận giai đoạn cuối).'
    },
    'uric acid': {
        name: 'Axit Uric (Chỉ số Gút / Uric Acid)',
        def: 'Sản phẩm chuyển hóa của nhân purin (có trong thịt đỏ, hải sản, rượu bia). Thận đào thải axit uric ra ngoài, nếu dư thừa sẽ lắng đọng tinh thể.',
        high: 'Gây lắng đọng tinh thể urat tại các khớp dẫn đến những cơn đau Gút cấp tính (sưng nóng đỏ đau dữ dội khớp ngón chân, cổ chân) hoặc gây sỏi thận.',
        low: 'Rất ít gặp, có thể liên quan đến hội chứng Fanconi (tổn thương ống thận) hoặc chế độ ăn quá nghèo dinh dưỡng.'
    },
    'rbc': {
        name: 'RBC (Số lượng hồng cầu)',
        def: 'Tế bào máu phổ biến nhất, chứa huyết sắc tố giúp vận chuyển oxy từ phổi đến nuôi các cơ quan tế bào trong cơ thể.',
        high: 'Gặp ở người bị mất nước, bệnh đa hồng cầu, người sống ở vùng núi cao thiếu oxy, hoặc người bị bệnh tim phổi mãn tính.',
        low: 'Biểu hiện của tình trạng thiếu máu (do mất máu, thiếu sắt, thiếu vitamin B12, tan máu, hoặc tủy xương giảm sản xuất).'
    },
    'wbc': {
        name: 'WBC (Số lượng bạch cầu)',
        def: 'Tế bào máu bảo vệ cơ thể. Đóng vai trò nhận diện, tấn công và tiêu diệt các tác nhân gây bệnh xâm nhập như vi khuẩn, virus.',
        high: 'Cảnh báo cơ thể đang có nhiễm trùng cấp tính (viêm họng, viêm ruột, áp xe...), phản ứng viêm nặng, hoặc bệnh lý ác tính dòng bạch cầu.',
        low: 'Cảnh báo suy giam miễn dịch, nhiễm virus nặng (như sốt xuất huyết, cúm), hoặc tổn thương tủy xương do hóa chất/thuốc.'
    },
    'plt': {
        name: 'PLT (Số lượng tiểu cầu)',
        def: 'Các mảnh tế bào máu cực nhỏ có vai trò kết dính và tạo cục máu đông để cầm vết thương, ngăn chảy máu.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch (nhồi máu não, nhồi máu cơ tim, tắc mạch phổi), hoặc do viêm nhiễm kéo dài.',
        low: 'Tăng nguy cơ chảy máu tự nhiên (chảy máu cam, chảy máu chân răng, xuất huyết dưới da, xuất huyết nội tạng). Nguy hiểm khi PLT < 50.'
    },
    'hemoglobin': {
        name: 'Hemoglobin / Hb (Huyết sắc tố)',
        def: 'Protein chứa sắt nằm trong hồng cầu, trực tiếp làm nhiệm vụ gắn và vận chuyển oxy. Chỉ số chính để định nghĩa thiếu máu.',
        high: 'Gặp khi cô đặc máu (mất nước nặng), bệnh đa hồng cầu hoặc bệnh tim phổi mạn tính gây thiếu oxy trường kỳ.',
        low: 'Chẩn đoán xác định thiếu máu. Gây mệt mỏi, hoa mắt, chóng mặt, da xanh xao, tim đập nhanh khi gắng sức.'
    },
    'hematocrit': {
        name: 'Hematocrit / Hct (Tỷ lệ thể tích hồng cầu)',
        def: 'Tỷ lệ phần trăm thể tích của các tế bào hồng cầu chiếm trên tổng thể tích máu toàn phần.',
        high: 'Chỉ ra tình trạng cô đặc máu (do mất nước nặng như tiêu chảy, sốt cao, bỏng) hoặc bệnh đa hồng cầu.',
        low: 'Biểu hiện của thiếu máu hoặc cơ thể bị thừa dịch (loãng máu).'
    },
    'mcv': {
        name: 'MCV (Thể tích trung bình hồng cầu)',
        def: 'Kích thước trung bình của một tế bào hồng cầu. Giúp bác sĩ phân loại nguyên nhân gây ra thiếu máu.',
        high: 'Hồng cầu to: Thường do thiếu Vitamin B12 hoặc Axit Folic, người nghiện rượu, hoặc bệnh gan.',
        low: 'Hồng cầu nhỏ: Thường do thiếu sắt (rất phổ biến) hoặc bệnh tan máu bẩm sinh di truyền Thalassemia.'
    },
    'mch': {
        name: 'MCH (Lượng huyết sắc tố trung bình hồng cầu)',
        def: 'Khối lượng huyết sắc tố trung bình chứa trong một tế bào hồng cầu.',
        high: 'Hồng cầu ưu sắc (thường đi kèm MCV cao do thiếu B12/Folic).',
        low: 'Hồng cầu nhược sắc (thường gặp trong thiếu máu thiếu sắt hoặc bệnh Thalassemia).'
    },
    'mchc': {
        name: 'MCHC (Nồng độ huyết sắc tố trung bình hồng cầu)',
        def: 'Nồng độ trung bình của huyết sắc tố tính trên một thể tích hồng cầu lắng.',
        high: 'Ít gặp, có thể do hồng cầu bị biến dạng hình cầu di truyền.',
        low: 'Hồng cầu nhược sắc (thiếu máu thiếu sắt, thiếu máu do viêm nhiễm mãn tính).'
    },
    'neutrophil': {
        name: 'Neutrophil (Bạch cầu trung tính)',
        def: 'Thành phần bạch cầu lớn nhất, chuyên thực bào tiêu diệt vi khuẩn ở giai đoạn đầu của phản ứng viêm cấp.',
        high: 'Biểu hiện rõ của tình trạng nhiễm trùng vi khuẩn cấp tính (viêm phổi, viêm ruột thừa, áp xe) hoặc stress, chấn thương lớn.',
        low: 'Tăng nguy cơ nhiễm trùng nghiêm trọng (do suy tủy, nhiễm virus nặng, hoặc tác dụng phụ của thuốc hóa trị/kháng sinh).'
    },
    'lymphocyte': {
        name: 'Lymphocyte (Bạch cầu Lympho)',
        def: 'Tế bào miễn dịch chuyên biệt chịu trách nhiệm sản sinh kháng thể tiêu diệt tế bào nhiễm virus và tế bào ung thư.',
        high: 'Cảnh báo nhiễm trùng do virus (ho gà, sởi, quai bị, sốt xuất huyết) hoặc các bệnh lý bạch cầu lympho mãn tính.',
        low: 'Suy giảm miễn dịch (như nhiễm HIV, điều trị corticoid liều cao kéo dài, hóa trị, xạ trị).'
    },
    'monocyte': {
        name: 'Monocyte (Bạch cầu Monocyte)',
        def: 'Loại bạch cầu có kích thước lớn nhất, thực hiện nhiệm vụ dọn dẹp các mảnh vỡ tế bào và mầm bệnh đã bị tiêu diệt.',
        high: 'Thường tăng trong giai đoạn hồi phục sau nhiễm trùng cấp, hoặc nhiễm trùng mãn tính (như lao, sốt rét, viêm tâm nội mạc).',
        low: 'Rất ít ý nghĩa lâm sàng, có thể gặp trong suy tủy xương.'
    },
    'eosinophil': {
        name: 'Eosinophil (Bạch cầu ưa axit)',
        def: 'Loại bạch cầu chuyên chống lại các phản ứng dị ứng và tiêu diệt ký sinh trùng lớn (như giun, sán).',
        high: 'Dấu hiệu cơ thể đang bị dị ứng (hen phế quản, viêm da dị ứng, dị ứng thuốc) hoặc đang bị nhiễm ký sinh trùng (giun sán).',
        low: 'Không có ý nghĩa lâm sàng đặc hiệu.'
    },
    'basophil': {
        name: 'Basophil (Bạch cầu ưa kiềm)',
        def: 'Loại bạch cầu ít nhất trong máu, chứa histamine và heparin tham gia vào các phản ứng dị ứng tức thì.',
        high: 'Gặp trong các phản ứng dị ứng nghiêm trọng, viêm mãn tính hoặc bệnh lý tăng sinh tủy xương.',
        low: 'Không có ý nghĩa lâm sàng đặc hiệu.'
    },
    'rdw': {
        name: 'RDW (Dải phân bố kích thước hồng cầu)',
        def: 'Độ phân bố kích thước hồng cầu (Red Cell Distribution Width). Đo lường sự đồng đều về thể tích/kích thước giữa các tế bào hồng cầu.',
        high: 'Kích thước các tế bào hồng cầu chênh lệch lớn (to nhỏ không đều), là dấu hiệu rất phổ biến của thiếu máu thiếu sắt, thiếu vitamin B12/Folate, hoặc tan máu Thalassemia.',
        low: 'Kích thước các tế bào hồng cầu rất đồng đều, phản ánh trạng thái bình thường và không có ý nghĩa bệnh lý đáng ngại.'
    },
    'pdw': {
        name: 'PDW (Dải phân bố kích thước tiểu cầu)',
        def: 'Độ phân bố thể tích tiểu cầu (Platelet Distribution Width). Đánh giá mức độ biến động về kích thước của các tiểu cầu trong máu.',
        high: 'Kích thước tiểu cầu không đồng đều, thường liên quan đến các rối loạn sản sinh tiểu cầu ở tủy xương, ung thư máu, hoặc phản ứng viêm/nhiễm trùng cấp.',
        low: 'Kích thước các tiểu cầu đồng đều, thường là biểu hiện bình thường.'
    },
    'mpv': {
        name: 'MPV (Thể tích trung bình tiểu cầu)',
        def: 'Thể tích trung bình của tiểu cầu (Mean Platelet Volume). Đo lường kích thước trung bình của các tiểu cầu lưu thông trong máu.',
        high: 'Kích thước tiểu cầu lớn hơn bình thường, phản ánh tủy xương đang tăng tốc giải phóng tiểu cầu mới (phản ứng sau mất máu, nhiễm trùng, đái tháo đường, tim mạch).',
        low: 'Tiểu cầu có kích thước nhỏ, cảnh báo tủy xương giảm sản xuất tiểu cầu (gặp trong suy tủy xương, thiếu máu bất sản, ung thư máu hoặc sau hóa trị).'
    },
    'p-lcr': {
        name: 'P-LCR (Tỷ lệ tiểu cầu kích thước lớn)',
        def: 'Tỷ lệ phần trăm tiểu cầu có thể tích lớn (>12 fL) trong tổng số tiểu cầu lưu hành.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch, hoặc phản ánh tủy xương đang tăng cường giải phóng các tiểu cầu non lớn ra máu ngoại vi.',
        low: 'Tỷ lệ tiểu cầu lớn thấp, thường đi kèm tình trạng giảm hoạt động tạo máu/tiểu cầu ở tủy xương.'
    },
    'mxd': {
        name: 'MXD / BC đoạn Bazo Mono Axit (Bạch cầu hỗn hợp)',
        def: 'Chỉ số tổng hợp (tỷ lệ % hoặc số lượng tuyệt đối) của nhóm 3 loại bạch cầu ít gặp hơn bao gồm: Bạch cầu ưa axit (Eosinophil), Bạch cầu ưa kiềm (Basophil) và Bạch cầu Monocyte.',
        high: 'Cảnh báo tình trạng nhiễm ký sinh trùng (giun, sán), phản ứng dị ứng nặng, hen suyễn, hoặc nhiễm trùng, viêm nhiễm mãn tính.',
        low: 'Chỉ số thấp thường ít có ý nghĩa lâm sàng đặc hiệu trừ khi đi kèm tình trạng suy giảm toàn bộ các dòng tế bào máu.'
    },
    'kst sot ret': {
        name: 'KST sốt rét (Ký sinh trùng sốt rét)',
        def: 'Xét nghiệm tìm kiếm sự hiện diện của ký sinh trùng sốt rét (Plasmodium) trong máu ngoại vi để chẩn đoán bệnh sốt rét.',
        high: 'Dương tính (+): Cơ thể đang bị nhiễm ký sinh trùng sốt rét, cần nhập viện và điều trị bằng thuốc đặc hiệu khẩn cấp để tránh biến chứng ác tính.',
        low: 'Âm tính (-): Không tìm thấy ký sinh trùng sốt rét trong mẫu máu xét nghiệm tại thời điểm khảo sát.'
    },
    'tsh': {
        name: 'TSH (Hormone kích thích tuyến giáp)',
        def: 'Hormone do tuyến yên (não) tiết ra để điều khiển tuyến giáp sản xuất hormone giáp T3 và T4.',
        high: 'Cảnh báo suy giáp (tuyến giáp hoạt động yếu nên não phải tăng tiết TSH để kích thích). Triệu chứng: sợ lạnh, tăng cân, mệt mỏi, mạch chậm.',
        low: 'Cảnh báo cường giáp (tuyến giáp hoạt động quá mức nên não giảm tiết TSH). Triệu chứng: sợ nóng, sụt cân, tim đập nhanh, run tay.'
    },
    'ft3': {
        name: 'FT3 (T3 tự do)',
        def: 'Hormone tuyến giáp dạng tự do hoạt động sinh học mạnh mẽ nhất, quyết định tốc độ chuyển hóa của cơ thể.',
        high: 'Dấu hiệu của bệnh cường giáp (Basedow, bướu độc tuyến giáp). Gây chuyển hóa nhanh, sụt cân, tim đập nhanh, đánh trống ngực.',
        low: 'Dấu hiệu của bệnh suy giáp. Gây chậm chạp, mệt mỏi, sợ lạnh, táo bón.'
    },
    'ft4': {
        name: 'FT4 (T4 tự do)',
        def: 'Hormone tuyến giáp dạng tự do chiếm tỷ lệ cao nhất trong máu, đóng vai trò dự trữ và chuyển hóa thành FT3 khi tế bào cần.',
        high: 'Cường giáp hoặc viêm tuyến giáp cấp tính.',
        low: 'Suy giáp hoặc suy tuyến yên (không kích thích được tuyến giáp).'
    },
    'crp': {
        name: 'CRP / hs-CRP (Chỉ số viêm CRP)',
        def: 'Protein phản ứng C sản xuất tại gan. Chỉ số vô cùng nhạy bén để phát hiện viêm nhiễm cấp tính ở bất kỳ cơ quan nào.',
        high: 'Cảnh báo có ổ nhiễm trùng nặng, viêm khớp dạng thấp tiến triển, chấn thương mô, hoặc nguy cơ xơ vữa động mạch tim (đối với hs-CRP).',
        low: 'Chỉ số thấp phản ánh cơ thể bình thường, không có ổ viêm nhiễm hoạt động.'
    },
    'ckmb': {
        name: 'CK-MB (Men tim đặc hiệu)',
        def: 'Men creatine kinase nhánh cơ tim. Tăng cao rất nhanh trong máu khi có tổn thương cơ tim cấp.',
        high: 'Chỉ điểm nhồi máu cơ tim cấp tính hoặc viêm cơ tim. Cần cấp cứu y tế ngay lập tức nếu kèm đau thắt ngực.',
        low: 'Chỉ số thấp phản ánh tình trạng cơ tim bình thường.'
    },
    'troponin': {
        name: 'Troponin T / I (Chỉ số tổn thương tim)',
        def: 'Protein cấu trúc của cơ tim. Là tiêu chuẩn vàng nhạy bén và đặc hiệu nhất để chẩn đoán tổn thương cơ tim.',
        high: 'Chẩn đoán xác định nhồi máu cơ tim cấp, viêm cơ tim cấp, hoặc tổn thương tim do suy tim nặng. Cần nhập viện khẩn cấp.',
        low: 'Chỉ số bình thường, cho thấy không có tổn thương tế bào cơ tim.'
    },
    'ph nuoc tieu': {
        name: 'pH nước tiểu',
        def: 'Độ axit/kiềm của nước tiểu. Giúp đánh giá chức năng giữ cân bằng toan kiềm của thận và chẩn đoán sỏi thận.',
        high: 'Nước tiểu kiềm (pH > 7.0): Nhiễm trùng đường tiểu do vi khuẩn phân hủy ure, hoặc chế độ ăn quá nhiều rau củ.',
        low: 'Nước tiểu axit (pH < 5.0): Mất nước, đói, nhiễm toan tiểu đường, hoặc chế độ ăn quá nhiều thịt động vật.'
    },
    'protein nuoc tieu': {
        name: 'Protein nước tiểu (Albumin niệu)',
        def: 'Lượng đạm thất thoát qua nước tiểu. Thận bình thường sẽ giữ lại toàn bộ protein trong máu.',
        high: 'Cảnh báo tổn thương màng lọc cầu thận (suy thận, hội chứng thận hư, viêm cầu thận) hoặc tổn thương thận do tiểu đường, cao huyết áp.',
        low: 'Chỉ số bình thường (âm tính hoặc vết), chứng tỏ màng lọc thận hoạt động tốt.'
    },
    'glucose nuoc tieu': {
        name: 'Glucose nước tiểu (Đường niệu)',
        def: 'Lượng đường thất thoát qua nước tiểu. Thường chỉ xuất hiện khi nồng độ đường trong máu vượt quá 10 mmol/L (180 mg/dL).',
        high: 'Cảnh báo bệnh tiểu đường chưa được kiểm soát tốt, hoặc bệnh lý ống thận làm giảm khả năng tái hấp thu đường.',
        low: 'Chỉ số bình thường (âm tính), phản ánh tốt chuyển hóa đường.'
    },
    'ketone': {
        name: 'Ketone nước tiểu (Thể ceton niệu)',
        def: 'Sản phẩm phụ của quá trình phân hủy chất béo để lấy năng lượng thay thế khi cơ thể thiếu hụt nguồn đường.',
        high: 'Gặp trong nhiễm toan ceton do tiểu đường cấp tính (nguy hiểm), nhịn đói lâu ngày, chế độ ăn kiêng tinh bột quá mức (Keto).',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'hong cau nieu': {
        name: 'Hồng cầu niệu (Tiểu máu)',
        def: 'Sự xuất hiện của hồng cầu trong nước tiểu do tổn thương mạch máu dọc đường tiết niệu.',
        high: 'Cảnh báo sỏi thận, sỏi bàng quang, viêm đường tiết niệu, viêm cầu thận cấp, chấn thương thận hoặc u đường tiết niệu.',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'bach cau nieu': {
        name: 'Bạch cầu niệu (Nhiễm trùng niệu)',
        def: 'Sự xuất hiện của tế bào miễn dịch bạch cầu trong nước tiểu do phản ứng chống lại vi khuẩn.',
        high: 'Cảnh báo nhiễm trùng đường tiết niệu (viêm niệu đạo, viêm bàng quang, viêm bể thận). Cần dùng kháng sinh điều trị theo đơn.',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'psa': {
        name: 'PSA toàn phần (Tầm soát tuyến tiền liệt)',
        def: 'Kháng nguyên đặc hiệu của tuyến tiền liệt (Prostate-Specific Antigen). Là chỉ số tầm soát sớm các bệnh lý về tuyến tiền liệt ở nam giới.',
        high: 'Cảnh báo nguy cơ phì đại lành tính tuyến tiền liệt, viêm tuyến tiền liệt, hoặc ung thư tuyến tiền liệt (đặc biệt khi PSA > 4 ng/mL). Cần khám chuyên khoa nam học.',
        low: 'Chỉ số bình thường (an toàn).'
    },
    'calcium': {
        name: 'Calci toàn phần (Canxi máu)',
        def: 'Đo lường tổng lượng canxi trong máu bao gồm canxi tự do và canxi liên kết với protein. Canxi đóng vai trò quan trọng trong xương, cơ và thần kinh.',
        high: 'Cảnh báo cường tuyến cận giáp, ngộ độc Vitamin D, các bệnh lý ác tính hủy xương hoặc suy thận. Gây mệt mỏi, sỏi thận, táo bón.',
        low: 'Cảnh báo thiếu Vitamin D, suy tuyến cận giáp, suy thận mãn tính hoặc chế độ ăn thiếu hụt canxi. Gây tê bì chân tay, co thắt cơ (tetany).'
    },
    'prolactin': {
        name: 'Prolactin (Nồng độ Prolactin máu)',
        def: 'Hormone do tuyến yên tiết ra, vai trò chính là kích thích sản xuất sữa mẹ sau sinh. Ở người không mang thai, nồng độ cao có thể ảnh hưởng đến sinh sản.',
        high: 'Có thể do u tuyến yên (prolactinoma), suy giáp, stress, hoặc do thuốc hại dạ dày/an thần. Gây vô sinh, rối loạn kinh nguyệt hoặc tiết sữa bất thường ở nữ; giảm ham muốn ở nam.',
        low: 'Rất hiếm gặp, có thể do suy tuyến yên toàn bộ hoặc sau chấn thương/phẫu thuật tuyến yên.'
    },
    'amh': {
        name: 'AMH (Dự trữ buồng trứng)',
        def: 'Hormone phản ánh số lượng nang noãn còn lại ở buồng trứng (dự trữ buồng trứng). Chỉ số quan trọng nhất đánh giá khả năng sinh sản của phụ nữ.',
        high: 'Thường gặp ở phụ nữ có hội chứng buồng trứng đa nang (PCOS) hoặc u hạt tế bào buồng trứng. Quá cao làm tăng nguy cơ hội chứng quá kích buồng trứng khi làm thụ tinh ống nghiệm.',
        low: 'Dự trữ buồng trứng suy giảm, báo hiệu sự suy giảm khả năng sinh sản hoặc mãn kinh sớm. Cần tư vấn bác sĩ chuyên khoa sớm nếu đang muốn sinh con.'
    },
    'ferritin': {
        name: 'Ferritin (Dự trữ sắt)',
        def: 'Một loại protein tế bào lưu trữ sắt và giải phóng nó một cách có kiểm soát. Chỉ số phản ánh chính xác nhất lượng sắt dự trữ trong cơ thể.',
        high: 'Có thể do thừa sắt (bệnh nhiễm sắc tố sắt), viêm nhiễm mãn tính, bệnh gan cấp/mãn tính, cường giáp, hoặc một số bệnh lý ác tính/huyết học.',
        low: 'Chỉ số nhạy nhất báo hiệu thiếu sắt (ngay cả trước khi xảy ra thiếu máu thiếu sắt). Cần bổ sung sắt qua chế độ ăn uống hoặc thuốc theo chỉ định bác sĩ.'
    },
    'iron': {
        name: 'Sắt huyết thanh (Sắt trong máu)',
        def: 'Lượng sắt tự do lưu thông trong huyết thanh, liên kết với transferrin. Cần thiết cho việc sản xuất huyết sắc tố trong hồng cầu.',
        high: 'Có thể do tan máu, ngộ độc sắt do uống quá liều, bệnh thừa sắt di truyền, hoặc truyền máu nhiều lần.',
        low: 'Thiếu hụt sắt do chế độ ăn nghèo nần, kém hấp thu ở ruột, hoặc mất máu mãn tính (ví dụ hành kinh nhiều, trĩ, viêm loét tiêu hóa). Gây mệt mỏi, thiếu máu.'
    },
    'bloodgroup': {
        name: 'Nhóm máu ABO và Rh(D)',
        def: 'Phân loại nhóm máu dựa trên các kháng nguyên trên bề mặt hồng cầu. Cần thiết và bắt buộc phải biết khi truyền máu, phẫu thuật hoặc quản lý thai sản.',
        high: 'Không áp dụng chỉ số cao/thấp cho nhóm máu. Đây là đặc tính sinh học cố định suốt đời.',
        low: 'Không áp dụng chỉ số cao/thấp cho nhóm máu. Đây là đặc tính sinh học cố định suốt đời.'
    },
    'nitrite': {
        name: 'Nitrite nước tiểu',
        def: 'Xét nghiệm gián tiếp tìm vi khuẩn đường niệu. Bình thường không có nitrite trong nước tiểu.',
        high: 'Dương tính (+): Cảnh báo mạnh mẽ tình trạng nhiễm trùng đường tiết niệu (UTI) do vi khuẩn (như E. coli) chuyển hóa nitrate thành nitrite. Cần đi khám để điều trị kháng sinh.',
        low: 'Âm tính (-): Trạng thái bình thường.'
    },
    'ascorbic_acid': {
        name: 'Ascorbic Acid (Vitamin C nước tiểu)',
        def: 'Nồng độ Vitamin C đào thải qua nước tiểu. Giúp đánh giá chế độ ăn uống và cảnh báo khả năng gây nhiễu các chỉ số xét nghiệm nước tiểu khác.',
        high: 'Nồng độ cao phản ánh chế độ ăn giàu Vitamin C hoặc uống thực phẩm bổ sung quá mức. Có thể gây nhiễu/âm tính giả cho một số xét nghiệm nước tiểu khác như glucose hay hồng cầu.',
        low: 'Âm tính hoặc nồng độ thấp là trạng thái bình thường.'
    },
    'pct': {
        name: 'PCT (Thể tích khối tiểu cầu)',
        def: 'Tỷ lệ thể tích mà tiểu cầu chiếm trong máu toàn phần, tương tự như Hct (Hematocrit) đối với hồng cầu.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch, hoặc do tăng tiểu cầu thứ phát, phản ứng viêm/nhiễm trùng mãn tính.',
        low: 'Thường đi kèm giảm số lượng tiểu cầu (PLT), phản ánh tình trạng giảm sinh tiểu cầu ở tủy xương.'
    },
    'neutrophil_percent': {
        name: 'NEUT% (Tỷ lệ bạch cầu trung tính)',
        def: 'Tỷ lệ phần trăm bạch cầu trung tính trên tổng số bạch cầu. Đóng vai trò chủ chốt trong phản ứng miễn dịch chống vi khuẩn xâm nhập.',
        high: 'Nhiễm trùng vi khuẩn cấp tính (viêm phổi, viêm ruột thừa), viêm cấp, stress cơ thể nặng, hoặc chấn thương lớn.',
        low: 'Tăng nguy cơ nhiễm trùng nghiêm trọng do suy giảm chức năng tạo máu của tủy xương, nhiễm virus nặng hoặc suy giảm miễn dịch.'
    },
    'lymphocyte_percent': {
        name: 'LYM% (Tỷ lệ bạch cầu Lympho)',
        def: 'Tỷ lệ phần trăm bạch cầu lympho trên tổng số bạch cầu. Đóng vai trò chính trong miễn dịch chống virus và tế bào bất thường.',
        high: 'Cảnh báo nhiễm trùng do virus (ho gà, sởi, quai bị, sốt xuất huyết), hoặc các bệnh lý ác tính dòng lympho.',
        low: 'Suy giảm miễn dịch (như HIV), điều trị bằng corticoid liều cao kéo dài, hoặc sau hóa trị/xạ trị.'
    },
    'mxd_percent': {
        name: 'MXD% (Tỷ lệ bạch cầu hỗn hợp)',
        def: 'Tỷ lệ phần trăm nhóm 3 loại bạch cầu ít gặp (Bazo + Mono + Axit) trên tổng số bạch cầu.',
        high: 'Cảnh báo nhiễm ký sinh trùng (giun sán), phản ứng dị ứng nặng, hen suyễn, hoặc nhiễm trùng/viêm mãn tính lâu ngày.',
        low: 'Chỉ số thấp ít có ý nghĩa lâm sàng đặc hiệu trừ khi đi kèm suy giảm toàn bộ các dòng tế bào máu khác.'
    }
};

function getDictionaryKey(name) {
    if (!name) return null;
    const norm = name.toLowerCase().trim();
    
    if (norm.includes('glucose') || norm === 'đường huyết' || norm === 'duong huyet' || norm === 'glu') return 'glucose';
    if (norm.includes('hba1c')) return 'hba1c';
    if (norm.includes('insulin')) return 'insulin';
    if (norm.includes('hdl')) return 'hdl';
    if (norm.includes('ldl')) return 'ldl';
    if (norm.includes('cholesterol') || norm === 'mỡ máu' || norm === 'mo mau' || norm === 'cho') return 'cholesterol';
    if (norm.includes('triglycerid') || norm === 'tg') return 'triglycerides';
    if (norm.includes('ast') || norm.includes('sgot')) return 'ast';
    if (norm.includes('alt') || norm.includes('sgpt')) return 'alt';
    if (norm.includes('ggt') || norm.includes('gama gt') || norm.includes('gamma gt')) return 'ggt';
    if (norm.includes('bilirubin')) return 'bilirubin';
    if (norm.includes('albumin')) return 'albumin';
    if (norm === 'protein toàn phần' || norm === 'protein toan phan' || norm === 'total protein') return 'total protein';
    if (/\bure\b/.test(norm) || norm.includes('urê') || norm.includes('urea') || norm.includes('bun')) return 'ure';
    if (norm.includes('creatinin') || norm === 'cre' || norm === 'crea') return 'creatinine';
    if (norm.includes('egfr') || norm.includes('gfr') || norm.includes('mức lọc cầu thận') || norm.includes('muc loc cau than')) return 'egfr';
    if (norm.includes('uric') || norm === 'gút' || norm === 'gout' || norm === 'ua') return 'uric acid';
    if (norm.includes('psa') || norm.includes('tpsa')) return 'psa';
    if (norm.includes('calci') || norm.includes('calcium')) return 'calcium';
    if (norm.includes('rbc') || norm.includes('hồng cầu') || norm.includes('hong cau') || norm === 'hc' || norm === 'so luong hc' || norm === 'số lượng hc') return 'rbc';
    if (norm.includes('wbc') || norm.includes('bạch cầu') || norm.includes('bach cau') || norm === 'bc' || norm === 'so luong bc' || norm === 'số lượng bc') return 'wbc';
    if (norm.includes('plt') || norm.includes('tiểu cầu') || norm.includes('tieu cau') || norm === 'tc' || norm === 'so luong tc' || norm === 'số lượng tc') return 'plt';
    if (norm.includes('hemoglobin') || norm.includes('huyết sắc tố') || norm.includes('huyet sac to') || norm === 'hb') return 'hemoglobin';
    if (norm.includes('hematocrit') || norm.includes('hct')) return 'hematocrit';
    if (norm.includes('mcv')) return 'mcv';
    if (norm.includes('mchc')) return 'mchc';
    if (norm.includes('mch')) return 'mch';
    if (norm.includes('neutrophil') || norm.includes('neut') || norm === 'bc trung tính' || norm === 'bc trung tinh') {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'neutrophil_percent' : 'neutrophil';
    }
    if (norm.includes('lympho') || norm.includes('lym')) {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'lymphocyte_percent' : 'lymphocyte';
    }
    if (norm.includes('monocyte')) return 'monocyte';
    if (norm.includes('eosinophil')) return 'eosinophil';
    if (norm.includes('basophil')) return 'basophil';
    if (norm.includes('tsh')) return 'tsh';
    if (norm.includes('t3') || norm.includes('ft3')) return 'ft3';
    if (norm.includes('t4') || norm.includes('ft4')) return 'ft4';
    if (norm.includes('crp')) return 'crp';
    if (norm.includes('ck-mb') || norm.includes('ckmb')) return 'ckmb';
    if (norm.includes('troponin')) return 'troponin';
    if (norm.includes('ph nước tiểu') || norm.includes('ph nuoc tieu')) return 'ph nuoc tieu';
    if (norm.includes('protein nước tiểu') || norm.includes('protein nuoc tieu') || norm.includes('albumin nước tiểu') || norm.includes('albumin nuoc tieu')) return 'protein nuoc tieu';
    if (norm.includes('glucose nước tiểu') || norm.includes('glucose nuoc tieu') || norm.includes('đường niệu') || norm.includes('duong nieu')) return 'glucose nuoc tieu';
    if (norm.includes('ketone') || norm.includes('ceton')) return 'ketone';
    if (norm.includes('hồng cầu niệu') || norm.includes('hong cau nieu') || norm.includes('erythrocytes')) return 'hong cau nieu';
    if (norm.includes('bạch cầu niệu') || norm.includes('bach cau nieu') || norm.includes('leukocyte')) return 'bach cau nieu';
    if (norm.includes('rdw')) return 'rdw';
    if (norm.includes('pdw')) return 'pdw';
    if (norm.includes('mpv')) return 'mpv';
    if (norm.includes('p-lcr') || norm.includes('plcr')) return 'p-lcr';
    if (norm.includes('mxd')) {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'mxd_percent' : 'mxd';
    }
    if (norm.includes('kst sốt rét') || norm.includes('kst sot ret') || norm.includes('ký sinh trùng sốt rét') || norm.includes('ky sinh trung sot ret')) return 'kst sot ret';
    if (norm.includes('prolactin')) return 'prolactin';
    if (norm.includes('amh') || norm.includes('anti-mullerian') || norm.includes('anti-müllerian')) return 'amh';
    if (norm.includes('ferritin')) return 'ferritin';
    if (norm.includes('sắt huyết thanh') || norm.includes('sat huyet thanh') || norm === 'iron') return 'iron';
    if (norm.includes('nhóm máu') || norm.includes('nhom mau') || norm.includes('blood group') || norm.includes('bloodgroup')) return 'bloodgroup';
    if (norm.includes('nitrite')) return 'nitrite';
    if (norm.includes('ascorbic') || norm.includes('vitamin c') || norm.includes('ascorbate')) return 'ascorbic_acid';
    if (norm.includes('pct') || norm.includes('plateletcrit')) return 'pct';
    
    return null;
}

function updateIndicatorExplanation(indicatorName) {
    const infoBox = document.getElementById('healthIndicatorInfoBox');
    const nameEl = document.getElementById('infoIndicatorName');
    const defEl = document.getElementById('infoIndicatorDef');
    const highEl = document.getElementById('infoIndicatorHigh');
    const lowEl = document.getElementById('infoIndicatorLow');
    const highCont = document.getElementById('infoHighContainer');
    const lowCont = document.getElementById('infoLowContainer');

    if (!infoBox || !nameEl || !defEl || !highEl || !lowEl) return;

    if (!indicatorName) {
        infoBox.style.display = 'none';
        return;
    }

    let dictKey = null;
    if (HEALTH_INDICATORS_DICTIONARY[indicatorName]) {
        dictKey = indicatorName;
    } else {
        dictKey = getDictionaryKey(indicatorName);
    }

    if (!dictKey || !HEALTH_INDICATORS_DICTIONARY[dictKey]) {
        infoBox.style.display = 'none';
        return;
    }

    const info = HEALTH_INDICATORS_DICTIONARY[dictKey];
    nameEl.textContent = info.name;
    defEl.textContent = info.def;

    if (info.high) {
        highCont.style.display = 'block';
        highEl.textContent = info.high;
    } else {
        highCont.style.display = 'none';
    }

    if (info.low) {
        lowCont.style.display = 'block';
        lowEl.textContent = info.low;
    } else {
        lowCont.style.display = 'none';
    }

    infoBox.style.display = 'flex';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateIndicatorProgress() {
    const select = document.getElementById('healthChartIndicatorSelect');
    const progressBar = document.getElementById('indicatorProgressBar');
    const progressText = document.getElementById('indicatorProgressText');
    const prevBtn = document.getElementById('prevIndicatorBtn');
    const nextBtn = document.getElementById('nextIndicatorBtn');

    if (!select) return;

    const total = select.options.length;
    const current = total > 0 ? select.selectedIndex + 1 : 0;

    // Update progress text
    if (progressText) {
        progressText.textContent = `${current}/${total}`;
    }

    // Update progress bar width
    if (progressBar) {
        const pct = total > 0 ? (current / total) * 100 : 0;
        progressBar.style.width = `${pct}%`;
    }

    // Enable/disable navigation buttons based on boundaries
    if (prevBtn) {
        if (select.selectedIndex <= 0) {
            prevBtn.disabled = true;
            prevBtn.style.opacity = '0.35';
            prevBtn.style.cursor = 'not-allowed';
            prevBtn.style.pointerEvents = 'none';
        } else {
            prevBtn.disabled = false;
            prevBtn.style.opacity = '1';
            prevBtn.style.cursor = 'pointer';
            prevBtn.style.pointerEvents = 'auto';
        }
    }

    if (nextBtn) {
        if (select.selectedIndex >= total - 1 || total === 0) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.35';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.pointerEvents = 'none';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
            nextBtn.style.pointerEvents = 'auto';
        }
    }
}

// Prevent double-tap zoom globally on mobile for non-interactive elements (like text, divs, spans)
(function() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            // Check if the tapped element or any of its parents is interactive
            const isInteractive = e.target.closest('button, input, select, textarea, a, [role="button"]');
            if (!isInteractive) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });
})();

// --- WEATHER & LUNAR WIDGET LOGIC ---

// Fetch thời tiết Hà Nội từ Open-Meteo và hiển thị (luôn cập nhật mới mỗi lần mở app/vào trang chủ)
async function updateHomeWeather() {
    try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code');
        if (response.ok) {
            const data = await response.json();
            if (data && data.current) {
                const weatherData = {
                    temp: Math.round(data.current.temperature_2m),
                    code: data.current.weather_code
                };
                renderWeatherWidget(weatherData);
            }
        }
    } catch (error) {
        console.error('Lỗi khi tải thời tiết Hà Nội:', error);
        renderWeatherWidget(null);
    }
}

function renderWeatherWidget(weatherData) {
    const weatherContainer = document.getElementById('weatherRow');
    if (!weatherContainer) return;
    
    let tempText = '--°C';
    let iconName = 'cloud-sun';
    let descText = 'Thời tiết Hà Nội';
    let shortDesc = 'Ngoại tuyến';
    
    if (weatherData) {
        tempText = `${weatherData.temp}°C`;
        const code = weatherData.code;
        
        if (code === 0) {
            iconName = 'sun';
            descText = 'Hà Nội: Trời quang';
            shortDesc = 'Trời quang';
        } else if (code === 1) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Ít mây';
            shortDesc = 'Ít mây';
        } else if (code === 2) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Mây rải rác';
            shortDesc = 'Mây rải rác';
        } else if (code === 3) {
            iconName = 'cloud-sun';
            descText = 'Hà Nội: Nhiều mây';
            shortDesc = 'Nhiều mây';
        } else if (code === 45 || code === 48) {
            iconName = 'cloud-fog';
            descText = 'Hà Nội: Sương mù';
            shortDesc = 'Sương mù';
        } else if (code >= 51 && code <= 55) {
            iconName = 'cloud-drizzle';
            descText = 'Hà Nội: Mưa phùn';
            shortDesc = 'Mưa phùn';
        } else if (code >= 61 && code <= 65) {
            iconName = 'cloud-rain';
            descText = 'Hà Nội: Mưa';
            shortDesc = 'Mưa';
        } else if (code >= 80 && code <= 82) {
            iconName = 'cloud-rain';
            descText = 'Hà Nội: Mưa rào';
            shortDesc = 'Mưa rào';
        } else if (code >= 95 && code <= 99) {
            iconName = 'cloud-lightning';
            descText = 'Hà Nội: Dông bão';
            shortDesc = 'Dông bão';
        } else {
            iconName = 'cloud';
            descText = 'Hà Nội: Nhiều mây';
            shortDesc = 'Nhiều mây';
        }
    }
    
    weatherContainer.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span class="weather-desktop" title="${descText}">${tempText} tại Hà Nội</span>
        <span class="weather-mobile" title="${descText}" style="display: none;">${tempText} - ${shortDesc}</span>
    `;
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Tính toán và hiển thị âm lịch Việt Nam (định dạng dd/mm/yyyy, không dùng icon)
function updateHomeLunar() {
    const lunarContainer = document.getElementById('lunarRow');
    if (!lunarContainer) return;
    
    const today = new Date();
    const lYear = today.getFullYear();
    const lMonth = today.getMonth() + 1;
    const lDay = today.getDate();
    
    if (typeof window.lunarVietnam === 'undefined' || typeof window.lunarVietnam.convertSolar2Lunar !== 'function') {
        console.error('Không tìm thấy thư viện lunarVietnam.');
        return;
    }
    
    const lunar = window.lunarVietnam.convertSolar2Lunar(lDay, lMonth, lYear);
    if (!lunar) return;
    
    let monthName = lunar.lMonth.toString();
    if (lunar.lMonth === 1) monthName = 'Giêng';
    else if (lunar.lMonth === 11) monthName = 'Một';
    else if (lunar.lMonth === 12) monthName = 'Chạp';
    
    const leapText = lunar.isLeap ? ' (nhuận)' : '';
    
    const animalMap = {
        'Tý': 'Chuột', 'Sửu': 'Trâu', 'Dần': 'Hổ', 'Mão': 'Mèo',
        'Thìn': 'Rồng', 'Tỵ': 'Rắn', 'Ngọ': 'Ngựa', 'Mùi': 'Dê',
        'Thân': 'Khỉ', 'Dậu': 'Gà', 'Tuất': 'Chó', 'Hợi': 'Heo'
    };
    const animalVi = animalMap[lunar.animal] || lunar.animal;
    
    // Format ngày dạng dd/mm/yyyy
    const dayStr = lunar.lDay < 10 ? '0' + lunar.lDay : lunar.lDay;
    const monthStr = lunar.lMonth < 10 ? '0' + lunar.lMonth : lunar.lMonth;
    const lunarDateText = `${dayStr}/${monthStr}/${lunar.lYear}`;
    
    const fullTooltip = `Ngày ${lunar.lDay} tháng ${monthName}${leapText}, năm ${lunar.gzYear} (Ngày ${lunar.gzDay}) - Con giáp: ${animalVi}`;
    
    lunarContainer.innerHTML = `
        <span class="lunar-date-text" title="${fullTooltip}">Lịch âm: ${lunarDateText}</span>
    `;
}

// Gắn các hàm vào global window để tránh tree-shaking
window.updateHomeWeather = updateHomeWeather;
window.updateHomeLunar = updateHomeLunar;



