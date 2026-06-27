import { 
    renderDashboard, renderSettings, renderReceivedTable, renderSentTable,
    updateUserBadge, updateSidebarNavVisibility, updateHomeLayoutUI,
    setupModalListeners, handleExportEncrypted, handleExportExcel, handleImportFile 
} from '../features/thu-chi-doi-ngoai/thu-chi.js';
import { initHealthBindings, renderHealthDashboard, updateProfileDropdowns } from '../features/ho-so-y-te/ho-so-y-te.js';
// app.js - Main Application Logic & UI Control
import { encrypt, decrypt } from './crypto.js';
import * as sync from './sync.js';
import { updateHomeWeather } from '../features/thoi-tiet/thoi-tiet.js';

const APP_VERSION = '4.0.23';

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
    lastBpAnalysis: '',
    lastBpAnalysisDate: '',
    lastBpAnalysisUpdated: '',
    currentAiAnalysisType: 'full',
    selectedSpeechVoiceName: '',
    selectedSpeechRate: 1.0,
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
    sentEditMode: false,

    // Blood Pressure tracking (Omron HEM-7361T)
    bloodPressureRecords: [],
    bloodPressureRecordsUpdated: ''
};

// Chart.js instances

// PIN Code state buffers
let wizardPinBuffer = "";
let wizardFirstPin = "";
let unlockPinBuffer = "";

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
        lastBpAnalysis: state.lastBpAnalysis || '',
        lastBpAnalysisDate: state.lastBpAnalysisDate || '',
        lastBpAnalysisUpdated: state.lastBpAnalysisUpdated || '',
        selectedSpeechVoiceName: state.selectedSpeechVoiceName || '',
        selectedSpeechRate: state.selectedSpeechRate || 1.0,
        familyProfiles: state.familyProfiles || [],
        familyProfilesUpdated: state.familyProfilesUpdated || '',
        lastResetTime: state.lastResetTime || '',
        showImportNotesOption: !!state.showImportNotesOption,
        showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || '',
        customEventTypes: state.customEventTypes || [],
        customEventTypesUpdated: state.customEventTypesUpdated || '',
        bloodPressureRecords: state.bloodPressureRecords || [],
        bloodPressureRecordsUpdated: state.bloodPressureRecordsUpdated || ''
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
        state.lastBpAnalysis = '';
        state.lastBpAnalysisDate = '';
        state.lastBpAnalysisUpdated = '';
        state.selectedSpeechVoiceName = '';
        state.selectedSpeechRate = 1.0;
        state.familyProfiles = [{ id: 'p-self', name: 'Bản thân' }];
        state.familyProfilesUpdated = '';
        state.selectedHealthProfileId = 'p-self';
        state.lastResetTime = '';
        state.showImportNotesOption = false;
        state.showImportNotesOptionUpdated = '';
        state.customEventTypes = [];
        state.customEventTypesUpdated = '';
        state.bloodPressureRecords = [];
        state.bloodPressureRecordsUpdated = '';
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
        state.lastBpAnalysis = data.lastBpAnalysis || '';
        state.lastBpAnalysisDate = data.lastBpAnalysisDate || '';
        state.lastBpAnalysisUpdated = data.lastBpAnalysisUpdated || '';
        state.selectedSpeechVoiceName = data.selectedSpeechVoiceName || '';
        state.selectedSpeechRate = data.selectedSpeechRate || 1.0;
        state.familyProfiles = data.familyProfiles && data.familyProfiles.length > 0 ? data.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
        state.familyProfilesUpdated = data.familyProfilesUpdated || '';
        state.selectedHealthProfileId = 'p-self';
        state.lastResetTime = data.lastResetTime || '';
        state.showImportNotesOption = !!data.showImportNotesOption;
        state.showImportNotesOptionUpdated = data.showImportNotesOptionUpdated || '';
        state.customEventTypes = data.customEventTypes || [];
        state.customEventTypesUpdated = data.customEventTypesUpdated || '';
        state.bloodPressureRecords = data.bloodPressureRecords || [];
        state.bloodPressureRecordsUpdated = data.bloodPressureRecordsUpdated || '';
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
        let mergedBP = [...(state.bloodPressureRecords || [])];
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
                    state.lastBpAnalysis = remoteData.lastBpAnalysis || '';
                    state.lastBpAnalysisDate = remoteData.lastBpAnalysisDate || '';
                    state.lastBpAnalysisUpdated = remoteData.lastBpAnalysisUpdated || '';
                    state.selectedSpeechVoiceName = remoteData.selectedSpeechVoiceName || '';
                    state.selectedSpeechRate = remoteData.selectedSpeechRate || 1.0;
                    state.familyProfiles = remoteData.familyProfiles && remoteData.familyProfiles.length > 0 ? remoteData.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
                    state.familyProfilesUpdated = remoteData.familyProfilesUpdated || '';
                    remoteReceived = remoteData.receivedGifts || [];
                    remoteSent = remoteData.sentGifts || [];
                    remoteMedical = remoteData.medicalRecords || [];
                    state.bloodPressureRecords = remoteData.bloodPressureRecords || [];
                    state.bloodPressureRecordsUpdated = remoteData.bloodPressureRecordsUpdated || '';
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

                    // Merge lastBpAnalysis using LWW
                    const localBpAnalysisTime = state.lastBpAnalysisUpdated ? new Date(state.lastBpAnalysisUpdated).getTime() : 0;
                    const remoteBpAnalysisTime = remoteData.lastBpAnalysisUpdated ? new Date(remoteData.lastBpAnalysisUpdated).getTime() : 0;
                    if (remoteBpAnalysisTime > localBpAnalysisTime) {
                        state.lastBpAnalysis = remoteData.lastBpAnalysis || '';
                        state.lastBpAnalysisDate = remoteData.lastBpAnalysisDate || '';
                        state.lastBpAnalysisUpdated = remoteData.lastBpAnalysisUpdated || '';
                    }

                    // Sync selectedSpeechVoiceName and selectedSpeechRate
                    if (remoteData.selectedSpeechVoiceName) {
                        state.selectedSpeechVoiceName = remoteData.selectedSpeechVoiceName;
                    }
                    if (remoteData.selectedSpeechRate) {
                        state.selectedSpeechRate = remoteData.selectedSpeechRate;
                    }

                    // Merge familyProfiles using LWW
                    const localProfilesTime = state.familyProfilesUpdated ? new Date(state.familyProfilesUpdated).getTime() : 0;
                    const remoteProfilesTime = remoteData.familyProfilesUpdated ? new Date(remoteData.familyProfilesUpdated).getTime() : 0;
                    if (remoteProfilesTime > localProfilesTime) {
                        state.familyProfiles = remoteData.familyProfiles && remoteData.familyProfiles.length > 0 ? remoteData.familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];
                        state.familyProfilesUpdated = remoteData.familyProfilesUpdated || '';
                    }
                    // Merge bloodPressureRecords using LWW
                    const localBpTime = state.bloodPressureRecordsUpdated ? new Date(state.bloodPressureRecordsUpdated).getTime() : 0;
                    const remoteBpTime = remoteData.bloodPressureRecordsUpdated ? new Date(remoteData.bloodPressureRecordsUpdated).getTime() : 0;
                    if (remoteBpTime > localBpTime) {
                        state.bloodPressureRecords = remoteData.bloodPressureRecords || [];
                        state.bloodPressureRecordsUpdated = remoteData.bloodPressureRecordsUpdated || '';
                    }
                }
                
                // 3. Merge lists
                mergedReceived = mergeLists(state.receivedGifts, remoteReceived);
                mergedSent = mergeLists(state.sentGifts, remoteSent);
                mergedMedical = mergeLists(state.medicalRecords || [], remoteMedical);
                mergedBP = state.bloodPressureRecords; // BP already merged via LWW above
            } catch (decErr) {
                console.error("Remote decryption failed:", decErr);
                throw new Error("Không thể giải mã dữ liệu trên máy chủ. Có thể do Master Password trên máy chủ khác biệt?");
            }
        }
        
        // 4. Update local state
        state.receivedGifts = mergedReceived;
        state.sentGifts = mergedSent;
        state.medicalRecords = mergedMedical;
        state.bloodPressureRecords = mergedBP;
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
            lastBpAnalysis: state.lastBpAnalysis || '',
            lastBpAnalysisDate: state.lastBpAnalysisDate || '',
            lastBpAnalysisUpdated: state.lastBpAnalysisUpdated || '',
            selectedSpeechVoiceName: state.selectedSpeechVoiceName || '',
            selectedSpeechRate: state.selectedSpeechRate || 1.0,
            lastResetTime: state.lastResetTime || '',
            showImportNotesOption: !!state.showImportNotesOption,
            showImportNotesOptionUpdated: state.showImportNotesOptionUpdated || '',
            customEventTypes: state.customEventTypes || [],
            customEventTypesUpdated: state.customEventTypesUpdated || '',
            familyProfiles: state.familyProfiles || [],
            familyProfilesUpdated: state.familyProfilesUpdated || '',
            bloodPressureRecords: state.bloodPressureRecords || [],
            bloodPressureRecordsUpdated: state.bloodPressureRecordsUpdated || ''
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
        // Fix: tell browser this is a light page — prevents Cốc Cốc / Chrome Force Dark Mode from inverting colors
        document.documentElement.style.colorScheme = 'light';
        icons.forEach(icon => icon.setAttribute('data-lucide', 'moon'));
        texts.forEach(text => text.innerText = 'Giao diện tối');
        if (themeMeta) themeMeta.setAttribute('content', '#f3f4f6');
    } else {
        body.classList.remove('light-mode');
        document.documentElement.style.colorScheme = 'dark';
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
    
    // Ghi nhớ mở khóa
    const rememberCheckbox = document.getElementById('rememberWizardCheckbox');
    if (rememberCheckbox && rememberCheckbox.checked) {
        localStorage.setItem('gift_ledger_remembered_pin', password);
    } else {
        localStorage.removeItem('gift_ledger_remembered_pin');
    }
    
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
                
                // Ghi nhớ mở khóa
                const rememberCheckbox = document.getElementById('rememberWizardCheckbox');
                if (rememberCheckbox && rememberCheckbox.checked) {
                    localStorage.setItem('gift_ledger_remembered_pin', wizardPinBuffer);
                } else {
                    localStorage.removeItem('gift_ledger_remembered_pin');
                }
                
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
    // === Auto-inject APP_VERSION into all UI elements — no need to hardcode in HTML ===
    // Version badge on home page (top-right): shows "Ver X.X.X PRO"
    const homeVersionBadgeSpan = document.querySelector('#homeVersionBadge .wizard-version-badge');
    if (homeVersionBadgeSpan) homeVersionBadgeSpan.textContent = `Ver ${APP_VERSION} PRO`;
    // Version badges inside Setup Wizard (PIN & Keyboard): shows "vX.X.X"
    document.querySelectorAll('#setupOverlay .wizard-version-badge').forEach(el => {
        el.textContent = `v${APP_VERSION}`;
    });
    // Sidebar logo icon & home hero logo: cache-bust with APP_VERSION
    const sidebarLogoImgInit = document.getElementById('sidebarLogoImg');
    if (sidebarLogoImgInit) sidebarLogoImgInit.src = `src/assets/images/icon.png?v=${APP_VERSION}`;
    const homeLogoImg = document.querySelector('.home-logo-img');
    if (homeLogoImg) homeLogoImg.src = `src/assets/images/icon.png?v=${APP_VERSION}`;

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
        
        // Auto select mode for setup wizard based on device type (desktop vs mobile)
        const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
        const wizardPinView = document.getElementById('wizardPinModeView');
        const wizardKeyView = document.getElementById('wizardKeyboardModeView');
        if (wizardPinView && wizardKeyView) {
            if (!isMobile) {
                // Show keyboard mode by default on desktop
                wizardPinView.style.display = 'none';
                wizardKeyView.style.display = 'block';
                setTimeout(() => {
                    const passInput = document.getElementById('setupMasterPassword');
                    if (passInput) passInput.focus();
                }, 100);
            } else {
                // Show PIN mode by default on mobile
                wizardPinView.style.display = 'block';
                wizardKeyView.style.display = 'none';
            }
        }
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

    // Toggle between Keyboard mode and PIN mode on Setup Wizard Overlay
    const btnWizardSwitchToKeyboard = document.getElementById('btnWizardSwitchToKeyboard');
    const btnWizardSwitchToPin = document.getElementById('btnWizardSwitchToPin');
    const wizardPinModeView = document.getElementById('wizardPinModeView');
    const wizardKeyboardModeView = document.getElementById('wizardKeyboardModeView');
    
    if (btnWizardSwitchToKeyboard && btnWizardSwitchToPin && wizardPinModeView && wizardKeyboardModeView) {
        btnWizardSwitchToKeyboard.addEventListener('click', () => {
            wizardPinModeView.style.display = 'none';
            wizardKeyboardModeView.style.display = 'block';
            wizardPinBuffer = "";
            wizardFirstPin = "";
            updatePasscodeDots('wizardPasscodeDots', 0);
            
            // Reset title and subtext of Pin mode in case they were on confirmation step
            const title = document.getElementById('wizardTitle');
            const subtext = document.getElementById('wizardSubtext');
            if (title) title.innerText = "Thiết lập Mã PIN";
            if (subtext) subtext.innerText = "Nhập 6 chữ số để đặt làm mã PIN bảo vệ sổ";

            setTimeout(() => {
                const setupMasterPasswordInput = document.getElementById('setupMasterPassword');
                if (setupMasterPasswordInput) setupMasterPasswordInput.focus();
            }, 100);
        });
        btnWizardSwitchToPin.addEventListener('click', () => {
            if (document.activeElement) document.activeElement.blur();
            wizardPinModeView.style.display = 'block';
            wizardKeyboardModeView.style.display = 'none';
            
            // Reset keyboard inputs
            const setupMasterPasswordInput = document.getElementById('setupMasterPassword');
            const setupMasterPasswordConfirmInput = document.getElementById('setupMasterPasswordConfirm');
            if (setupMasterPasswordInput) setupMasterPasswordInput.value = "";
            if (setupMasterPasswordConfirmInput) setupMasterPasswordConfirmInput.value = "";
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

// --- WEATHER & LUNAR WIDGET LOGIC ---



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




export { state, saveLocalState, showToast, performSync, APP_VERSION, formatDate, escapeHTML };

export { 
    formatVND, generateId, parseAmountInput, switchTab, getSupabaseConfig, 
    checkLoginStatus, renderDashboardSyncBanner, updateHomeWeather, 
    updateHomeLunar, compareRecordsByRecent, renderAll 
};
