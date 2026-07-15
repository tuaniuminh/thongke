import { 
    renderDashboard, renderSettings, renderReceivedTable, renderSentTable,
    updateUserBadge, updateSidebarNavVisibility, updateHomeLayoutUI,
    setupModalListeners, handleExportEncrypted, handleExportExcel, handleImportFile 
} from '../features/thu-chi-doi-ngoai/thu-chi.js?v=4.1.51';
import { initHealthBindings, renderHealthDashboard, updateProfileDropdowns } from '../features/ho-so-y-te/ho-so-y-te.js?v=4.1.51';
import { initFundBindings, renderFundDashboard, renderManagementTab } from '../features/quy-gia-dinh/quy-gia-dinh.js?v=4.1.51';
import { checkNewMonthNotification } from '../features/quy-gia-dinh/bao-cao-thang.js?v=4.1.51';
// app.js - Main Application Logic & UI Control
import { encrypt, decrypt, generateAsymmetricKeypair, encryptWithPublicKey, decryptWithPrivateKey } from './crypto.js?v=4.1.51';
import * as sync from './sync.js?v=4.1.51';
import { updateHomeWeather } from '../features/thoi-tiet/thoi-tiet.js?v=4.1.51';

const APP_VERSION = '4.1.51';

// Flag bật/tắt log debug E2EE (false trong production, bật true khi cần debug)
const DEBUG_E2EE = false;

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
    asymmetricPublicKey: '',
    asymmetricPrivateKeyEncrypted: '',
    fundSymmetricKey: '',
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
    showFamilyFundCard: false,
    showFamilyFundCardUpdated: '',
    customEventTypes: [],
    customEventTypesUpdated: '',
    familyFunds: [],
    familyFundsUpdated: '',
    spouseEmail: '',
    ownerEmail: '',
    googleSheetsWebhook: '',
    activeChartFundIds: ['fund-main'],
    viewingSharedFund: false,
    sharedFundOwnerEmail: '',
    spouseFundInvitePending: false,
    spouseFundInviteOwnerEmail: '',
    sharedFundSourceRow: null,
    fundTransactions: [],
    fundTransactionsUpdated: '',
    activeTab: 'dashboard',
    tabHistory: [],
    theme: 'light',
    familyFundInviteStatus: '',
    familyFundInviteStatusUpdated: '',
    spouseRole: 'wife',
    ownerNickname: '',
    spouseStatus: '',
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
    lastFullBackupDate: '',

    // Blood Pressure tracking (Omron HEM-7361T)
    bloodPressureRecords: [],
    bloodPressureRecordsUpdated: '',

    // Body Composition tracking (Accuniq/InBody)
    bodyCompositionRecords: [],
    bodyCompositionRecordsUpdated: ''
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
    if (num > 0 && num < 1000000) {
        num = num * 1000;
    }
    return num;
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
    
    // Dùng DOM API thay vì innerHTML để tránh XSS từ error messages bên ngoài
    const _toastIcon = document.createElement('i');
    _toastIcon.setAttribute('data-lucide', iconName);
    const _toastSpan = document.createElement('span');
    _toastSpan.textContent = message;
    toast.appendChild(_toastIcon);
    toast.appendChild(_toastSpan);
    
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Custom Alert Dialog Modal helper
window.showAlert = function(message, title = "Thông báo") {
    return new Promise((resolve) => {
        const modal = document.getElementById('customDialogModal');
        const titleEl = document.getElementById('customDialogTitle');
        const msgEl = document.getElementById('customDialogMessage');
        const inputContainer = document.getElementById('customDialogInputContainer');
        const btnCancel = document.getElementById('btnCustomDialogCancel');
        const btnConfirm = document.getElementById('btnCustomDialogConfirm');
        const iconContainer = document.getElementById('customDialogIconContainer');
        const icon = document.getElementById('customDialogIcon');

        if (!modal) {
            alert(message);
            resolve();
            return;
        }

        titleEl.innerText = title;
        msgEl.innerText = message;
        inputContainer.style.display = 'none';
        btnCancel.style.display = 'none';
        btnConfirm.innerText = "Đồng ý";
        
        iconContainer.style.background = 'rgba(59, 130, 246, 0.1)';
        iconContainer.style.color = 'var(--accent-blue)';
        icon.setAttribute('data-lucide', 'info');
        if (window.lucide) window.lucide.createIcons();

        modal.style.display = 'flex';

        btnConfirm.onclick = () => {
            modal.style.display = 'none';
            resolve();
        };
    });
};

// Custom Confirm Dialog Modal helper
window.showConfirm = function(message, title = "Xác nhận") {
    return new Promise((resolve) => {
        const modal = document.getElementById('customDialogModal');
        const titleEl = document.getElementById('customDialogTitle');
        const msgEl = document.getElementById('customDialogMessage');
        const inputContainer = document.getElementById('customDialogInputContainer');
        const btnCancel = document.getElementById('btnCustomDialogCancel');
        const btnConfirm = document.getElementById('btnCustomDialogConfirm');
        const iconContainer = document.getElementById('customDialogIconContainer');
        const icon = document.getElementById('customDialogIcon');

        if (!modal) {
            resolve(confirm(message));
            return;
        }

        titleEl.innerText = title;
        msgEl.innerText = message;
        inputContainer.style.display = 'none';
        btnCancel.style.display = 'inline-block';
        btnConfirm.innerText = "Đồng ý";

        iconContainer.style.background = 'rgba(245, 158, 11, 0.15)';
        iconContainer.style.color = 'var(--accent-amber)';
        icon.setAttribute('data-lucide', 'help-circle');
        if (window.lucide) window.lucide.createIcons();

        modal.style.display = 'flex';

        btnConfirm.onclick = () => {
            modal.style.display = 'none';
            resolve(true);
        };

        btnCancel.onclick = () => {
            modal.style.display = 'none';
            resolve(false);
        };
    });
};

// Custom Prompt Dialog Modal helper
window.showPrompt = function(message, defaultValue = "", title = "Nhập thông tin") {
    return new Promise((resolve) => {
        const modal = document.getElementById('customDialogModal');
        const titleEl = document.getElementById('customDialogTitle');
        const msgEl = document.getElementById('customDialogMessage');
        const inputContainer = document.getElementById('customDialogInputContainer');
        const inputEl = document.getElementById('customDialogInput');
        const btnCancel = document.getElementById('btnCustomDialogCancel');
        const btnConfirm = document.getElementById('btnCustomDialogConfirm');
        const iconContainer = document.getElementById('customDialogIconContainer');
        const icon = document.getElementById('customDialogIcon');

        if (!modal) {
            resolve(prompt(message, defaultValue));
            return;
        }

        titleEl.innerText = title;
        msgEl.innerText = message;
        inputContainer.style.display = 'block';
        inputEl.value = defaultValue;
        btnCancel.style.display = 'inline-block';
        btnConfirm.innerText = "Xác nhận";

        iconContainer.style.background = 'rgba(16, 185, 129, 0.15)';
        iconContainer.style.color = 'var(--accent-emerald)';
        icon.setAttribute('data-lucide', 'edit-3');
        if (window.lucide) window.lucide.createIcons();

        modal.style.display = 'flex';
        inputEl.focus();

        btnConfirm.onclick = () => {
            const val = inputEl.value;
            modal.style.display = 'none';
            resolve(val);
        };

        btnCancel.onclick = () => {
            modal.style.display = 'none';
            resolve(null);
        };
    });
};

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
    if (window.lucide) window.lucide.createIcons();
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
        showFamilyFundCard: !!state.showFamilyFundCard,
        showFamilyFundCardUpdated: state.showFamilyFundCardUpdated || '',
        customEventTypes: state.customEventTypes || [],
        customEventTypesUpdated: state.customEventTypesUpdated || '',
        bloodPressureRecords: state.bloodPressureRecords || [],
        bloodPressureRecordsUpdated: state.bloodPressureRecordsUpdated || '',
        bodyCompositionRecords: state.bodyCompositionRecords || [],
        bodyCompositionRecordsUpdated: state.bodyCompositionRecordsUpdated || '',
        familyFunds: state.familyFunds || [],
        familyFundsUpdated: state.familyFundsUpdated || '',
        fundTransactions: state.fundTransactions || [],
        fundTransactionsUpdated: state.fundTransactionsUpdated || '',
        asymmetricPublicKey: state.asymmetricPublicKey || '',
        asymmetricPrivateKeyEncrypted: state.asymmetricPrivateKeyEncrypted || '',
        fundSymmetricKey: state.fundSymmetricKey || '',
        spouseEmail: state.spouseEmail || '',
        googleSheetsWebhook: state.googleSheetsWebhook || '',
        familyFundInviteStatus: state.familyFundInviteStatus || '',
        familyFundInviteStatusUpdated: state.familyFundInviteStatusUpdated || '',
        spouseRole: state.spouseRole || 'wife',
        ownerNickname: state.ownerNickname || '',
        spouseStatus: state.spouseStatus || '',
        viewingSharedFund: !!state.viewingSharedFund,
        sharedFundOwnerEmail: state.sharedFundOwnerEmail || '',
        lastFullBackupDate: state.lastFullBackupDate || '',
        activeChartFundIds: state.activeChartFundIds || ['fund-main'],
        reportAiInsights: state.reportAiInsights || {}
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
export async function loadLocalState(password) {
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
        state.showFamilyFundCard = false;
        state.showFamilyFundCardUpdated = '';
        state.customEventTypes = [];
        state.customEventTypesUpdated = '';
        state.bloodPressureRecords = [];
        state.bloodPressureRecordsUpdated = '';
        state.bodyCompositionRecords = [];
        state.bodyCompositionRecordsUpdated = '';
        state.familyFunds = [];
        state.familyFundsUpdated = '';
        state.fundTransactions = [];
        state.fundTransactionsUpdated = '';
        state.asymmetricPublicKey = '';
        state.asymmetricPrivateKeyEncrypted = '';
        state.fundSymmetricKey = '';
        state.spouseEmail = '';
        state.googleSheetsWebhook = '';
        state.familyFundInviteStatus = '';
        state.familyFundInviteStatusUpdated = '';
        state.spouseRole = 'wife';
        state.ownerNickname = '';
        state.spouseStatus = '';
        state.viewingSharedFund = false;
        state.sharedFundOwnerEmail = '';
        state.lastFullBackupDate = '';
        state.activeChartFundIds = ['fund-main'];
        state.reportAiInsights = {};
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
        state.showFamilyFundCard = !!data.showFamilyFundCard;
        state.showFamilyFundCardUpdated = data.showFamilyFundCardUpdated || '';
        state.customEventTypes = data.customEventTypes || [];
        state.customEventTypesUpdated = data.customEventTypesUpdated || '';
        state.bloodPressureRecords = data.bloodPressureRecords || [];
        state.bloodPressureRecordsUpdated = data.bloodPressureRecordsUpdated || '';
        state.bodyCompositionRecords = data.bodyCompositionRecords || [];
        state.bodyCompositionRecordsUpdated = data.bodyCompositionRecordsUpdated || '';
        state.familyFunds = data.familyFunds || [];
        state.familyFundsUpdated = data.familyFundsUpdated || '';
        state.fundTransactions = data.fundTransactions || [];
        state.fundTransactionsUpdated = data.fundTransactionsUpdated || '';
        state.asymmetricPublicKey = data.asymmetricPublicKey || '';
        state.asymmetricPrivateKeyEncrypted = data.asymmetricPrivateKeyEncrypted || '';
        state.fundSymmetricKey = data.fundSymmetricKey || '';
        state.spouseEmail = data.spouseEmail || '';
        state.googleSheetsWebhook = data.googleSheetsWebhook || '';
        state.familyFundInviteStatus = data.familyFundInviteStatus || '';
        state.familyFundInviteStatusUpdated = data.familyFundInviteStatusUpdated || '';
        state.spouseRole = data.spouseRole || 'wife';
        state.ownerNickname = data.ownerNickname || '';
        state.spouseStatus = data.spouseStatus || '';
        state.viewingSharedFund = data.viewingSharedFund || false;
        state.sharedFundOwnerEmail = data.sharedFundOwnerEmail || '';
        state.lastFullBackupDate = data.lastFullBackupDate || '';
        state.activeChartFundIds = data.activeChartFundIds || ['fund-main'];
        state.reportAiInsights = data.reportAiInsights || {};
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

// Fetch spouse public key from Supabase
async function fetchSpousePublicKey(email) {
    const supabaseClient = sync.getSupabase();
    if (!supabaseClient || !email) return null;
    try {
        if (DEBUG_E2EE) console.log("[E2EE Debug] fetchSpousePublicKey searching for:", email);
        const { data, error } = await supabaseClient
            .from('gift_sync')
            .select('public_key, user_email, user_id')
            .ilike('user_email', email.trim())
            .maybeSingle();
        if (error) {
            console.error("[E2EE Debug] Supabase error in fetchSpousePublicKey:", error);
            return null;
        }
        if (!data) {
            if (DEBUG_E2EE) console.warn("[E2EE Debug] No public key row found for:", email);
            return null;
        }
        if (DEBUG_E2EE) console.log("[E2EE Debug] Found public key for:", email, "key:", !!data.public_key);
        return data.public_key;
    } catch (e) {
        console.error("Failed to fetch spouse public key:", e);
        return null;
    }
}

// Auto-sync function
async function performSync(silent = false) {
    if (localStorage.getItem('supabase_disabled') === 'true') return;
    if (!state.masterPassword) {
        console.warn("[Sync] Chặn đồng bộ do Master Password chưa được thiết lập.");
        return;
    }

    if (state.viewingSharedFund) {
        if (!state.sharedFundSourceRow || !state.sharedFundSourceRow.user_id) {
            console.error("No shared fund source metadata found.");
            return;
        }
        
        const supabaseClient = sync.getSupabase();
        if (!supabaseClient) {
            console.error("Supabase client is not initialized.");
            return;
        }
        
        try {
            if (!silent) showToast("Đang đồng bộ lên quỹ chung...", "warning");
            
            const { data: remoteRecord, error: fetchErr } = await supabaseClient
                .from('gift_sync')
                .select('encrypted_data')
                .eq('user_id', state.sharedFundSourceRow.user_id)
                .maybeSingle();
                
            if (fetchErr) throw fetchErr;
            
            let latestFamilyFunds = state.familyFunds;
            let latestFundTransactions = state.fundTransactions;
            let fundKey = state.fundSymmetricKey;
            let originalParsed = {};
            
            if (remoteRecord && remoteRecord.encrypted_data) {
                originalParsed = JSON.parse(remoteRecord.encrypted_data);
                if (originalParsed.is_hybrid && originalParsed.encrypted_fund) {
                    const decryptedFund = await decrypt(originalParsed.encrypted_fund, fundKey);
                    const fundData = JSON.parse(decryptedFund);
                    
                    latestFundTransactions = mergeLists(state.fundTransactions, fundData.fundTransactions || []);
                    latestFamilyFunds = fundData.familyFunds || state.familyFunds;
                }
            }
            
            const fundPayload = JSON.stringify({
                familyFunds: latestFamilyFunds,
                familyFundsUpdated: new Date().toISOString(),
                fundTransactions: latestFundTransactions,
                fundTransactionsUpdated: new Date().toISOString(),
                activeChartFundIds: state.activeChartFundIds || ['fund-main']
            });
            const encryptedFund = await encrypt(fundPayload, fundKey);
            
            const hybridPayload = JSON.stringify({
                is_hybrid: true,
                encrypted_personal: originalParsed.encrypted_personal,
                encrypted_fund: encryptedFund,
                fund_shared_keys: originalParsed.fund_shared_keys,
                owner_email: originalParsed.owner_email,
                spouse_email: originalParsed.spouse_email,
                spouse_role: originalParsed.spouse_role || 'wife',
                owner_nickname: originalParsed.owner_nickname || '',
                spouse_status: originalParsed.spouse_status || 'accepted',
                google_sheets_webhook: originalParsed.google_sheets_webhook || '',
                family_funds_updated: new Date().toISOString(),
                fund_transactions_updated: new Date().toISOString()
            });
            
            const { error: uploadErr } = await supabaseClient
                .from('gift_sync')
                .upsert({
                    user_id: state.sharedFundSourceRow.user_id,
                    encrypted_data: hybridPayload,
                    updated_at: new Date().toISOString(),
                    user_email: originalParsed.owner_email,
                    public_key: originalParsed.public_key || null
                });
                
            if (uploadErr) throw uploadErr;
            
            state.familyFunds = latestFamilyFunds;
            state.fundTransactions = latestFundTransactions;
            
            if (!silent) showToast("Đồng bộ quỹ chung thành công!");
            renderAll();
        } catch (e) {
            console.error("Shared fund sync error:", e);
            if (!silent) showToast("Lỗi đồng bộ lên quỹ chung: " + e.message, "danger");
            return;
        }
    }

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
        let mergedBodyComp = [...(state.bodyCompositionRecords || [])];
        let mergedFamilyFunds = [...(state.familyFunds || [])];
        let mergedFundTransactions = [...(state.fundTransactions || [])];
        let localReset = state.lastResetTime || '';
        
        if (remoteRecord && remoteRecord.encrypted_data) {
            try {
                // 2. Decrypt remote data (Hybrid / Standard fallback)
                let remoteData = null;
                let isHybrid = false;
                
                try {
                    const parsedObj = JSON.parse(remoteRecord.encrypted_data);
                    if (parsedObj && parsedObj.is_hybrid) {
                        isHybrid = true;
                        
                        // Decrypt personal data
                        const decryptedPersonal = await decrypt(parsedObj.encrypted_personal, state.masterPassword);
                        remoteData = JSON.parse(decryptedPersonal);
                        
                        // Check if spouse has left
                        if (parsedObj.spouse_status === 'left') {
                            if (DEBUG_E2EE) console.log("[E2EE Debug] Spouse has left the fund. Performing auto-unlink.");
                            parsedObj.spouse_email = '';
                            parsedObj.spouse_role = 'wife';
                            parsedObj.owner_nickname = '';
                            if (remoteData) {
                                remoteData.spouseEmail = '';
                                remoteData.spouseRole = 'wife';
                                remoteData.ownerNickname = '';
                            }
                            state.spouseEmail = '';
                            state.spouseRole = 'wife';
                            state.ownerNickname = '';
                            state.familyFundsUpdated = new Date().toISOString();
                            showToast("Đối tác đã thoát khỏi Quỹ gia đình. Liên kết đã được hủy.", "warning");
                        } else if (parsedObj.spouse_status && remoteData && parsedObj.spouse_status !== remoteData.spouseStatus) {
                            if (DEBUG_E2EE) console.log(`[E2EE Debug] Spouse status changed from remote envelope: ${parsedObj.spouse_status}`);

                            remoteData.spouseStatus = parsedObj.spouse_status;
                            state.spouseStatus = parsedObj.spouse_status;
                            
                            // If accepted, also auto-update showFamilyFundCard to true
                            if (parsedObj.spouse_status === 'accepted' && !state.showFamilyFundCard) {
                                state.showFamilyFundCard = true;
                                state.showFamilyFundCardUpdated = new Date().toISOString();
                                remoteData.showFamilyFundCard = true;
                                remoteData.showFamilyFundCardUpdated = state.showFamilyFundCardUpdated;
                            }
                        }
                        
                        // Get Fund Key directly from decrypted personal data or fallback to private key decryption
                        let fundKey = remoteData.fundSymmetricKey || state.fundSymmetricKey;
                        
                        if (!fundKey && state.asymmetricPrivateKeyEncrypted) {
                            const decryptedPrivKey = await decrypt(state.asymmetricPrivateKeyEncrypted, state.masterPassword);
                            const myEmail = user.email.toLowerCase().trim();
                            const myEncryptedFundKey = parsedObj.fund_shared_keys ? parsedObj.fund_shared_keys[myEmail] : null;
                            if (myEncryptedFundKey) {
                                try {
                                    fundKey = await decryptWithPrivateKey(decryptedPrivKey, myEncryptedFundKey);
                                } catch (decKeyErr) {
                                    console.error("Failed to decrypt Fund Key using Private Key:", decKeyErr);
                                }
                            }
                        }
                        
                        // Decrypt family fund data
                        if (fundKey && parsedObj.encrypted_fund) {
                            try {
                                const decryptedFund = await decrypt(parsedObj.encrypted_fund, fundKey);
                                const fundData = JSON.parse(decryptedFund);
                                remoteData.familyFunds = fundData.familyFunds || [];
                                remoteData.familyFundsUpdated = fundData.familyFundsUpdated || '';
                                remoteData.fundTransactions = fundData.fundTransactions || [];
                                remoteData.fundTransactionsUpdated = fundData.fundTransactionsUpdated || '';
                                remoteData.activeChartFundIds = fundData.activeChartFundIds || ['fund-main'];
                            } catch (decFundErr) {
                                console.error("Failed to decrypt Fund Data using Fund Key:", decFundErr);
                                remoteData.familyFunds = state.familyFunds;
                                remoteData.familyFundsUpdated = state.familyFundsUpdated;
                                remoteData.fundTransactions = state.fundTransactions;
                                remoteData.fundTransactionsUpdated = state.fundTransactionsUpdated;
                            }
                        } else {
                            remoteData.familyFunds = state.familyFunds;
                            remoteData.familyFundsUpdated = state.familyFundsUpdated;
                            remoteData.fundTransactions = state.fundTransactions;
                            remoteData.fundTransactionsUpdated = state.fundTransactionsUpdated;
                        }
                        
                        remoteData.spouseEmail = parsedObj.spouse_email || '';
                        remoteData.googleSheetsWebhook = parsedObj.google_sheets_webhook || '';
                        remoteData.spouseRole = parsedObj.spouse_role || 'wife';
                        remoteData.ownerNickname = parsedObj.owner_nickname || '';
                    }
                } catch (jsonErr) {
                    // Fallback below
                }
                
                if (!isHybrid) {
                    const remoteDecrypted = await decrypt(remoteRecord.encrypted_data, state.masterPassword);
                    remoteData = JSON.parse(remoteDecrypted);
                }
                
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
                    state.showFamilyFundCard = !!remoteData.showFamilyFundCard;
                    state.showFamilyFundCardUpdated = remoteData.showFamilyFundCardUpdated || '';
                    state.fundSymmetricKey = remoteData.fundSymmetricKey || '';
                    state.asymmetricPublicKey = remoteData.asymmetricPublicKey || '';
                    state.asymmetricPrivateKeyEncrypted = remoteData.asymmetricPrivateKeyEncrypted || '';
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
                    state.bodyCompositionRecords = remoteData.bodyCompositionRecords || [];
                    state.bodyCompositionRecordsUpdated = remoteData.bodyCompositionRecordsUpdated || '';
                    state.familyFunds = remoteData.familyFunds || [];
                    state.familyFundsUpdated = remoteData.familyFundsUpdated || '';
                    state.fundTransactions = remoteData.fundTransactions || [];
                    state.fundTransactionsUpdated = remoteData.fundTransactionsUpdated || '';
                    state.familyFundInviteStatus = remoteData.familyFundInviteStatus || '';
                    state.familyFundInviteStatusUpdated = remoteData.familyFundInviteStatusUpdated || '';
                    state.spouseStatus = remoteData.spouseStatus || '';
                    state.lastFullBackupDate = remoteData.lastFullBackupDate || '';
                    state.activeChartFundIds = remoteData.activeChartFundIds || ['fund-main'];
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

                    // Merge showFamilyFundCard using LWW (Last Write Wins)
                    const localFundCardTime = state.showFamilyFundCardUpdated ? new Date(state.showFamilyFundCardUpdated).getTime() : 0;
                    const remoteFundCardTime = remoteData.showFamilyFundCardUpdated ? new Date(remoteData.showFamilyFundCardUpdated).getTime() : 0;
                    
                    if (remoteFundCardTime > localFundCardTime) {
                        state.showFamilyFundCard = !!remoteData.showFamilyFundCard;
                        state.showFamilyFundCardUpdated = remoteData.showFamilyFundCardUpdated || '';
                    }

                    // Recover key fields from remote if they are missing locally but exist remotely
                    if (!state.fundSymmetricKey && remoteData.fundSymmetricKey) {
                        state.fundSymmetricKey = remoteData.fundSymmetricKey;
                    }
                    if (!state.asymmetricPublicKey && remoteData.asymmetricPublicKey) {
                        state.asymmetricPublicKey = remoteData.asymmetricPublicKey;
                        state.asymmetricPrivateKeyEncrypted = remoteData.asymmetricPrivateKeyEncrypted;
                    }

                    // Merge lastFullBackupDate (LWW)
                    if (remoteData.lastFullBackupDate) {
                        if (!state.lastFullBackupDate || new Date(remoteData.lastFullBackupDate) > new Date(state.lastFullBackupDate)) {
                            state.lastFullBackupDate = remoteData.lastFullBackupDate;
                        }
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

                    // Merge familyFundInviteStatus using LWW
                    const localInviteTime = state.familyFundInviteStatusUpdated ? new Date(state.familyFundInviteStatusUpdated).getTime() : 0;
                    const remoteInviteTime = remoteData.familyFundInviteStatusUpdated ? new Date(remoteData.familyFundInviteStatusUpdated).getTime() : 0;
                    if (remoteInviteTime > localInviteTime) {
                        state.familyFundInviteStatus = remoteData.familyFundInviteStatus || '';
                        state.familyFundInviteStatusUpdated = remoteData.familyFundInviteStatusUpdated || '';
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
                    // Merge bodyCompositionRecords using LWW
                    const localBcTime = state.bodyCompositionRecordsUpdated ? new Date(state.bodyCompositionRecordsUpdated).getTime() : 0;
                    const remoteBcTime = remoteData.bodyCompositionRecordsUpdated ? new Date(remoteData.bodyCompositionRecordsUpdated).getTime() : 0;
                    if (remoteBcTime > localBcTime) {
                        state.bodyCompositionRecords = remoteData.bodyCompositionRecords || [];
                        state.bodyCompositionRecordsUpdated = remoteData.bodyCompositionRecordsUpdated || '';
                    }
                    // Merge familyFunds using LWW
                    const localFundsTime = state.familyFundsUpdated ? new Date(state.familyFundsUpdated).getTime() : 0;
                    const remoteFundsTime = remoteData.familyFundsUpdated ? new Date(remoteData.familyFundsUpdated).getTime() : 0;
                    if (remoteFundsTime > localFundsTime) {
                        state.familyFunds = remoteData.familyFunds || [];
                        state.familyFundsUpdated = remoteData.familyFundsUpdated || '';
                        state.spouseEmail = remoteData.spouseEmail || '';
                        state.googleSheetsWebhook = remoteData.googleSheetsWebhook || '';
                        state.spouseRole = remoteData.spouseRole || 'wife';
                        state.ownerNickname = remoteData.ownerNickname || '';
                        state.spouseStatus = remoteData.spouseStatus || '';
                        state.activeChartFundIds = remoteData.activeChartFundIds || ['fund-main'];
                    }
                    // Merge fundTransactions using LWW
                    const localTxTime = state.fundTransactionsUpdated ? new Date(state.fundTransactionsUpdated).getTime() : 0;
                    const remoteTxTime = remoteData.fundTransactionsUpdated ? new Date(remoteData.fundTransactionsUpdated).getTime() : 0;
                    if (remoteTxTime > localTxTime) {
                        state.fundTransactions = remoteData.fundTransactions || [];
                        state.fundTransactionsUpdated = remoteData.fundTransactionsUpdated || '';
                    }
                    // Merge reportAiInsights — local thắng theo từng key (tháng), remote bổ sung các key còn thiếu
                    if (remoteData.reportAiInsights && typeof remoteData.reportAiInsights === 'object') {
                        state.reportAiInsights = Object.assign({}, remoteData.reportAiInsights, state.reportAiInsights || {});
                    }
                }
                
                // 3. Merge lists
                mergedReceived = mergeLists(state.receivedGifts, remoteReceived);
                mergedSent = mergeLists(state.sentGifts, remoteSent);
                mergedMedical = mergeLists(state.medicalRecords || [], remoteMedical);
                mergedBP = state.bloodPressureRecords; // BP already merged via LWW above
                mergedBodyComp = state.bodyCompositionRecords;
                mergedFamilyFunds = state.familyFunds; // Already merged via LWW above
                mergedFundTransactions = state.fundTransactions; // Already merged via LWW above
            } catch (decErr) {
                console.error("Remote decryption failed:", decErr);
                const forceOverwrite = await window.showConfirm(
                    "Không thể giải mã dữ liệu trên máy chủ (có thể do lỗi phiên bản cũ làm lệch mã hóa hoặc mật khẩu khác biệt).\n\n" +
                    "Bạn có muốn GHI ĐÈ dữ liệu từ thiết bị này lên máy chủ để khôi phục trạng thái đồng bộ không?\n" +
                    "- Chọn 'Đồng ý': Dữ liệu cục bộ (đúng) của bạn sẽ ghi đè lên đám mây và cập nhật mật khẩu hiện tại.\n" +
                    "- Chọn 'Hủy': Dừng đồng bộ để bạn tự sao lưu hoặc kiểm tra lại."
                );
                if (forceOverwrite) {
                    mergedReceived = [...state.receivedGifts];
                    mergedSent = [...state.sentGifts];
                    mergedMedical = [...(state.medicalRecords || [])];
                    mergedBP = [...(state.bloodPressureRecords || [])];
                    mergedBodyComp = [...(state.bodyCompositionRecords || [])];
                    mergedFamilyFunds = [...(state.familyFunds || [])];
                    mergedFundTransactions = [...(state.fundTransactions || [])];
                } else {
                    throw new Error("Không thể giải mã dữ liệu trên máy chủ. Có thể do Master Password trên máy chủ khác biệt?");
                }
            }
        }
        
        // 4. Update local state
        state.receivedGifts = mergedReceived;
        state.sentGifts = mergedSent;
        state.medicalRecords = mergedMedical;
        state.bloodPressureRecords = mergedBP;
        state.bodyCompositionRecords = mergedBodyComp;
        state.familyFunds = mergedFamilyFunds;
        state.fundTransactions = mergedFundTransactions;
        state.lastResetTime = localReset;
        await saveLocalState();
        
        // 5. Encrypt and upload merged state to server (Hybrid E2EE payload)
        if (state.masterPassword && !state.asymmetricPublicKey) {
            try {
                const keys = await generateAsymmetricKeypair();
                state.asymmetricPublicKey = keys.publicKey;
                state.asymmetricPrivateKeyEncrypted = await encrypt(keys.privateKey, state.masterPassword);
                await saveLocalState();
            } catch (keysErr) {
                console.error("Failed to generate keys during performSync:", keysErr);
            }
        }

        // 5a. Encrypt personal data with Master Password
        const personalPayload = JSON.stringify({
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
            showFamilyFundCard: !!state.showFamilyFundCard,
            showFamilyFundCardUpdated: state.showFamilyFundCardUpdated || '',
            customEventTypes: state.customEventTypes || [],
            customEventTypesUpdated: state.customEventTypesUpdated || '',
            familyProfiles: state.familyProfiles || [],
            familyProfilesUpdated: state.familyProfilesUpdated || '',
            bloodPressureRecords: state.bloodPressureRecords || [],
            bloodPressureRecordsUpdated: state.bloodPressureRecordsUpdated || '',
            bodyCompositionRecords: state.bodyCompositionRecords || [],
            bodyCompositionRecordsUpdated: state.bodyCompositionRecordsUpdated || '',
            asymmetricPublicKey: state.asymmetricPublicKey || '',
            asymmetricPrivateKeyEncrypted: state.asymmetricPrivateKeyEncrypted || '',
            fundSymmetricKey: state.fundSymmetricKey || '',
            spouseEmail: state.spouseEmail || '',
            googleSheetsWebhook: state.googleSheetsWebhook || '',
            familyFundInviteStatus: state.familyFundInviteStatus || '',
            familyFundInviteStatusUpdated: state.familyFundInviteStatusUpdated || '',
            spouseRole: state.spouseRole || 'wife',
            ownerNickname: state.ownerNickname || '',
            spouseStatus: state.spouseStatus || '',
            viewingSharedFund: !!state.viewingSharedFund,
            sharedFundOwnerEmail: state.sharedFundOwnerEmail || '',
            lastFullBackupDate: state.lastFullBackupDate || '',
            activeChartFundIds: state.activeChartFundIds || ['fund-main'],
            reportAiInsights: state.reportAiInsights || {}
        });
        const encryptedPersonal = await encrypt(personalPayload, state.masterPassword);

        // 5b. Encrypt Family Fund data with Fund Key
        if (!state.fundSymmetricKey) {
            // Dùng crypto.getRandomValues để đảm bảo entropy 256-bit thực sự ngẫu nhiên
            const _fkRaw = window.crypto.getRandomValues(new Uint8Array(32));
            state.fundSymmetricKey = Array.from(_fkRaw).map(b => b.toString(16).padStart(2, '0')).join('');
            await saveLocalState();
        }
        
        const fundPayload = JSON.stringify({
            familyFunds: state.familyFunds || [],
            familyFundsUpdated: state.familyFundsUpdated || '',
            fundTransactions: state.fundTransactions || [],
            fundTransactionsUpdated: state.fundTransactionsUpdated || '',
            activeChartFundIds: state.activeChartFundIds || ['fund-main']
        });
        const encryptedFund = await encrypt(fundPayload, state.fundSymmetricKey);

        // 5c. Encrypt Fund Key for ourselves
        const fundSharedKeys = {};
        if (state.asymmetricPublicKey) {
            try {
                const encryptedSelfKey = await encryptWithPublicKey(state.asymmetricPublicKey, state.fundSymmetricKey);
                fundSharedKeys[user.email.toLowerCase().trim()] = encryptedSelfKey;
            } catch (selfKeyErr) {
                console.error("Failed to encrypt fund key for self:", selfKeyErr);
            }
        }

        // 5d. Encrypt Fund Key for spouse (if configured)
        if (state.spouseEmail) {
            const spousePubKey = await fetchSpousePublicKey(state.spouseEmail);
            if (spousePubKey) {
                try {
                    const encryptedSpouseKey = await encryptWithPublicKey(spousePubKey, state.fundSymmetricKey);
                    fundSharedKeys[state.spouseEmail.toLowerCase().trim()] = encryptedSpouseKey;
                } catch (spouseKeyErr) {
                    console.error("Failed to encrypt fund key for spouse:", spouseKeyErr);
                }
            }
        }

        // 5e. Construct and upload hybrid payload
        const hybridPayload = JSON.stringify({
            is_hybrid: true,
            encrypted_personal: encryptedPersonal,
            encrypted_fund: encryptedFund,
            fund_shared_keys: fundSharedKeys,
            owner_email: user.email,
            spouse_email: state.spouseEmail || '',
            spouse_role: state.spouseRole || 'wife',
            owner_nickname: state.ownerNickname || '',
            spouse_status: state.spouseStatus || '',
            google_sheets_webhook: state.googleSheetsWebhook || '',
            family_funds_updated: state.familyFundsUpdated || '',
            fund_transactions_updated: state.fundTransactionsUpdated || ''
        });

        await sync.saveSyncData(hybridPayload, state.asymmetricPublicKey || null);
        
        // 6. Refresh UI
        localStorage.setItem('last_sync_time', new Date().toISOString());
        renderAll();
        updateSyncIndicator('synced');
        if (!silent) showToast("Đồng bộ dữ liệu thành công!");

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
    renderFundDashboard();
    renderManagementTab();
    checkNewMonthNotification();
    updateThemeUI();
    updateImportNotesOptionUI();
    updateFamilyFundCardUI();
    handleHashRoute();
    if (window.lucide) window.lucide.createIcons();
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
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }
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
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để xóa thông tin", "warning");
        return;
    }
    if (!await window.showConfirm(`Bạn có chắc chắn muốn xóa loại sự kiện "${name}" khỏi danh sách?`)) {
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

function updateFamilyFundCardUI() {
    const toggle = document.getElementById('toggleShowFamilyFundCard');
    if (toggle) {
        toggle.checked = !!state.showFamilyFundCard;
    }
    if (typeof updateHomeLayoutUI === 'function') {
        updateHomeLayoutUI();
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

    // Swap logos based on theme
    const sidebarLogo = document.getElementById('sidebarLogoImg');
    const mobileLogo = document.getElementById('mobileLogoImg');
    const homeLogo = document.querySelector('.home-logo-img');
    
    const logoSrc = state.theme === 'light' 
        ? `src/assets/images/icon-light.png?v=${APP_VERSION}` 
        : `src/assets/images/icon.png?v=${APP_VERSION}`;
        
    if (sidebarLogo) sidebarLogo.src = logoSrc;
    if (mobileLogo) mobileLogo.src = logoSrc;
    if (homeLogo) homeLogo.src = logoSrc;

    if (window.lucide) window.lucide.createIcons();
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
    'health': 'health',
    'quy-gia-dinh': 'fund',
    'fund': 'fund',
    'nhat-ky-quy': 'fund-history',
    'fund-history': 'fund-history',
    'quan-ly-quy': 'fund-management',
    'fund-management': 'fund-management',
    'quan-ly-thu-chi': 'tc-management',
    'tc-management': 'tc-management'
};

const tabIdToHash = {
    'home': 'trangchu',
    'dashboard': 'tongquan',
    'received': 'tientoinhan',
    'sent': 'tientoimung',
    'settings': 'caidat',
    'health': 'hosoyte',
    'fund': 'quy-gia-dinh',
    'fund-history': 'nhat-ky-quy',
    'fund-management': 'quan-ly-quy',
    'tc-management': 'quan-ly-thu-chi'
};

// Central helper to enter the application layout or home landing view
function enterApp() {
    if (state.masterPassword && !state.asymmetricPublicKey) {
        (async () => {
            try {
                const keys = await generateAsymmetricKeypair();
                state.asymmetricPublicKey = keys.publicKey;
                state.asymmetricPrivateKeyEncrypted = await encrypt(keys.privateKey, state.masterPassword);
                await saveLocalState();
                console.log("Generated asymmetric keypair successfully.");
                performSync(true); // Silent sync to publish keys
            } catch (e) {
                console.error("Failed to generate asymmetric keys on enterApp:", e);
            }
        })();
    }

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
        const tabId = tabHashMapping[hash];
        if (homeLayout) homeLayout.style.display = 'none';
        if (appLayout) appLayout.style.display = 'flex';
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
function switchTab(tabId, updateHash = true, pushHistory = true) {
    const currentTab = state.activeTab;
    if (pushHistory && currentTab && currentTab !== tabId) {
        if (!state.tabHistory) state.tabHistory = [];
        state.tabHistory.push(currentTab);
        if (state.tabHistory.length > 10) state.tabHistory.shift();
    }
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
        updateLastBackupDisplay();
    } else if (tabId === 'health') {
        title.innerText = 'Hồ sơ y tế';
        subtitle.innerText = 'Theo dõi chỉ số sức khỏe, kết quả xét nghiệm qua AI Scanner';
        renderHealthDashboard();
    } else if (tabId === 'fund') {
        title.innerText = 'Tổng quan Quỹ';
        subtitle.innerText = 'Theo dõi đóng góp của hai vợ chồng, quản lý các quỹ chi tiêu và đầu tư';
        renderFundDashboard();
    } else if (tabId === 'fund-history') {
        title.innerText = 'Nhật ký Quỹ';
        subtitle.innerText = 'Xem và lọc lịch sử giao dịch, đóng góp và chi tiêu của Quỹ gia đình';
        if (typeof window.renderFundHistoryTab === 'function') {
            window.renderFundHistoryTab();
        }
    } else if (tabId === 'fund-management') {
        title.innerText = 'Quản lý Quỹ';
        subtitle.innerText = 'Cài đặt liên kết Vợ/Chồng, tự động đồng bộ Google Sheets và quản lý các quỹ';
        renderManagementTab();
    } else if (tabId === 'tc-management') {
        title.innerText = 'Quản lý';
        subtitle.innerText = 'Tùy chỉnh chức năng, quản lý sự kiện và xuất nhập dữ liệu';
        renderTcManagement();
    }
    
    if (updateHash) {
        const hash = tabIdToHash[tabId] || tabId;
        window.location.hash = hash;
    }
    
    // Toggle Quick Add button based on active tab
    const quickAddBtn = document.getElementById('quickAddBtn');
    if (quickAddBtn) {
        if (tabId === 'health' || tabId === 'settings' || tabId === 'fund' || tabId === 'fund-history' || tabId === 'fund-management' || tabId === 'tc-management') {
            quickAddBtn.style.display = 'none';
        } else {
            quickAddBtn.style.display = '';
        }
    }
    
    // Toggle Shared Fund Header Card based on active tab and state
    const headerCard = document.getElementById('sharedFundHeaderCard');
    if (headerCard) {
        if (tabId === 'fund' && state.viewingSharedFund) {
            headerCard.style.display = 'flex';
        } else {
            headerCard.style.display = 'none';
        }
    }
    
    updateSidebarNavVisibility(tabId);

    // Close mobile menu if open
    document.getElementById('sidebar').classList.remove('mobile-open');
    if (window.lucide) window.lucide.createIcons();
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
            if (typeof window.checkForSharedFamilyFund === 'function') {
                await window.checkForSharedFamilyFund();
            }
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

    // Kiểm tra khóa tạm thời do nhập sai quá nhiều lần
    const _lockStatus = checkPinLockout();
    if (_lockStatus.locked) {
        const _waitMsg = _lockStatus.remainSec >= 60
            ? `${Math.ceil(_lockStatus.remainSec / 60)} phút`
            : `${_lockStatus.remainSec} giây`;
        showToast(`Ứng dụng bị khóa tạm thời. Vui lòng đợi ${_waitMsg}.`, 'error');
        return;
    }

    const password = document.getElementById('unlockPassword').value;
    
    const unlockBtn = e.target.querySelector('button');
    unlockBtn.innerText = 'Đang mở khóa...';
    unlockBtn.disabled = true;
    
    // Give thread time to update UI before heavy PBKDF2 calculation
    setTimeout(async () => {
        const success = await loadLocalState(password);
        
        if (success) {
            clearPinFailData(); // Xóa bộ đếm lỗi khi mở khóa thành công
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
                    checkLoginStatus();
                }
            }, 350);

        } else {
            const _failCount = recordPinFailure();
            const _lockAfter = checkPinLockout();
            if (_lockAfter.locked) {
                const _wm = _lockAfter.remainSec >= 60
                    ? `${Math.ceil(_lockAfter.remainSec / 60)} phút`
                    : `${_lockAfter.remainSec} giây`;
                showToast(`Sai mật khẩu lần thứ ${_failCount}. Khóa trong ${_wm}.`, 'error');
            } else {
                showToast("Sai Master Password! Không thể giải mã dữ liệu.", "error");
            }
            unlockBtn.innerText = 'Mở khóa ứng dụng';
            unlockBtn.disabled = false;
        }
    }, 100);
}

// Change Master Password flow
window.handleChangePassword = async function() {
    const oldPassword = await window.showPrompt("Nhập Master Password (hoặc mã PIN) hiện tại:");
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
    
    const newPassword = await window.showPrompt("Nhập mã PIN mới (yêu cầu đúng 6 chữ số):");
    if (!newPassword) return;
    if (!/^\d{6}$/.test(newPassword)) {
        showToast("Mã PIN mới phải đúng 6 chữ số!", "error");
        return;
    }
    
    const confirmNew = await window.showPrompt("Xác nhận mã PIN mới:");
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
    
    // Đồng bộ toàn bộ dữ liệu lên Supabase với mật khẩu mới (thay vì chỉ 2 trường)
    if (sync.isConfigured() && state.user) {
        try {
            await performSync(true);
            showToast("Đã thay đổi Master Password và đồng bộ toàn bộ dữ liệu lên máy chủ!");
        } catch (syncErr) {
            console.error(syncErr);
            showToast("Thay đổi mật khẩu cục bộ thành công, nhưng đồng bộ lỗi. Vui lòng nhấn Đồng bộ để thử lại.", "warning");
        }
    } else {
        showToast("Đã thay đổi Master Password cục bộ thành công!");
    }
};


// --- Brute-force PIN Protection Helpers ---
// Bảo vệ chống bruteforce: khóa tạm thời sau nhiều lần nhập sai PIN/mật khẩu

function getPinFailCount() {
    return parseInt(localStorage.getItem('pin_fail_count') || '0', 10);
}
function recordPinFailure() {
    const count = getPinFailCount() + 1;
    localStorage.setItem('pin_fail_count', String(count));
    // Chính sách khóa: lần 4 → 30s, lần 5 → 5 phút, lần 6+ → 15 phút
    const LOCKOUT_MAP = { 4: 30, 5: 300 };
    const delaySec = LOCKOUT_MAP[count] !== undefined ? LOCKOUT_MAP[count] : (count > 5 ? 900 : 0);
    if (delaySec > 0) {
        localStorage.setItem('pin_lockout_until', String(Date.now() + delaySec * 1000));
    }
    return count;
}
function checkPinLockout() {
    const until = parseInt(localStorage.getItem('pin_lockout_until') || '0', 10);
    if (!until) return { locked: false };
    const remainSec = Math.ceil((until - Date.now()) / 1000);
    if (remainSec <= 0) {
        localStorage.removeItem('pin_lockout_until');
        return { locked: false };
    }
    return { locked: true, remainSec };
}
function clearPinFailData() {
    localStorage.removeItem('pin_fail_count');
    localStorage.removeItem('pin_lockout_until');
}

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
    // Kiểm tra khóa tạm thời do nhập sai quá nhiều lần
    const _lockStatus = checkPinLockout();
    if (_lockStatus.locked) {
        const _waitMsg = _lockStatus.remainSec >= 60
            ? `${Math.ceil(_lockStatus.remainSec / 60)} phút`
            : `${_lockStatus.remainSec} giây`;
        shakeCard('unlockCard');
        showToast(`Ứng dụng bị khóa tạm thời. Vui lòng đợi ${_waitMsg}.`, 'error');
        return;
    }

    if (unlockPinBuffer.length >= 6) return;
    unlockPinBuffer += val;
    updatePasscodeDots('unlockPasscodeDots', unlockPinBuffer.length);
    
    if (unlockPinBuffer.length === 6) {
        const pin = unlockPinBuffer;
        
        setTimeout(async () => {
            const success = await loadLocalState(pin);
            if (success) {
                clearPinFailData(); // Xóa bộ đếm lỗi khi mở khóa thành công
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
                    checkLoginStatus();
                }
                
                unlockPinBuffer = "";
                updatePasscodeDots('unlockPasscodeDots', 0);
            } else {
                shakeCard('unlockCard');
                const _failCount = recordPinFailure();
                const _lockAfter = checkPinLockout();
                if (_lockAfter.locked) {
                    const _wm = _lockAfter.remainSec >= 60
                        ? `${Math.ceil(_lockAfter.remainSec / 60)} phút`
                        : `${_lockAfter.remainSec} giây`;
                    showToast(`Sai mã PIN lần thứ ${_failCount}. Khóa trong ${_wm}.`, 'error');
                } else {
                    showToast("Sai mã PIN! Vui lòng thử lại.", "error");
                }
                
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


async function initializeApp() {
    if (window.__famiLifeInitialized) return;
    window.__famiLifeInitialized = true;

    // Detect iOS/Capacitor environment and add class to body + inject dynamic styles to bypass WKWebView stylesheet cache
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                        (navigator.userAgent.includes('Macintosh') && 'ontouchend' in document) ||
                        (window.Capacitor && window.Capacitor.getPlatform() === 'ios') ||
                        window.location.protocol === 'capacitor:' || 
                        window.location.protocol === 'file:' ||
                        ((window.location.hostname === 'localhost' || window.location.hostname === '') && 
                         ('ontouchstart' in window || navigator.maxTouchPoints > 0));

    if (isIOSDevice) {
        document.body.classList.add('ios-device');
        
        const iosStyle = document.createElement('style');
        iosStyle.textContent = `
            body.ios-device .version-badge-btn {
                top: 64px !important;
            }
            @media (max-width: 576px) {
                body.ios-device .version-badge-btn {
                    top: 56px !important;
                }
            }
            body.ios-device .home-settings-btn {
                top: 109px !important;
            }
            @media (max-width: 576px) {
                body.ios-device .home-settings-btn {
                    top: 94px !important;
                }
                body.ios-device .home-settings-btn.not-logged-in {
                    top: 94px !important;
                }
            }
            body.ios-device .home-widgets-container {
                top: 64px !important;
            }
            @media (max-width: 576px) {
                body.ios-device .home-widgets-container {
                    top: 56px !important;
                }
            }
            @media (max-width: 576px) {
                body.ios-device .home-layout {
                    padding-top: 154px !important;
                }
            }
            body.ios-device .mobile-navbar {
                padding-top: 54px !important;
            }
            .tab-panel {
                animation: fadeIn 0.18s ease-in-out !important;
            }
        `;
        document.head.appendChild(iosStyle);
    }

    // Swipe gestures handled natively by Apple WKWebView (allowsBackForwardNavigationGestures: true)
    // No custom touch events registered to prevent conflicts.

    // Khởi tạo Supabase sớm để khôi phục session auth trong background
    const config = getSupabaseConfig();
    if (config.url && config.key) {
        sync.initSupabase(config.url, config.key);
    }

    // === Auto-inject APP_VERSION into all UI elements — no need to hardcode in HTML ===
    // Version badge on home page (top-right): shows "Ver X.X.X PRO"
    const homeVersionBadgeSpan = document.querySelector('#homeVersionBadge .wizard-version-badge');
    if (homeVersionBadgeSpan) homeVersionBadgeSpan.textContent = `Ver ${APP_VERSION} PRO`;
    // Version badges inside Setup Wizard (PIN & Keyboard): shows "vX.X.X"
    document.querySelectorAll('#setupOverlay .wizard-version-badge').forEach(el => {
        el.textContent = `v${APP_VERSION}`;
    });
    // Sidebar logo icon & home hero logo: cache-bust with APP_VERSION & select dynamic based on theme
    const currentLogoSrcInit = state.theme === 'light' 
        ? `src/assets/images/icon-light.png?v=${APP_VERSION}` 
        : `src/assets/images/icon.png?v=${APP_VERSION}`;
    const sidebarLogoImgInit = document.getElementById('sidebarLogoImg');
    if (sidebarLogoImgInit) sidebarLogoImgInit.src = currentLogoSrcInit;
    const homeLogoImg = document.querySelector('.home-logo-img');
    if (homeLogoImg) homeLogoImg.src = currentLogoSrcInit;

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
                
                const rememberCheckbox = document.getElementById('rememberUnlockCheckbox');
                if (rememberCheckbox) rememberCheckbox.checked = true;
                
                if (config.url && config.key) {
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
                // Kiểm tra lockout trước khi auto-thử
                const _lockStatus = checkPinLockout();
                if (_lockStatus.locked) {
                    const _waitMsg = _lockStatus.remainSec >= 60
                        ? `${Math.ceil(_lockStatus.remainSec / 60)} phút`
                        : `${_lockStatus.remainSec} giây`;
                    showToast(`Ứng dụng bị khóa tạm thời. Vui lòng đợi ${_waitMsg}.`, 'error');
                    unlockPasswordInput.value = "";
                    return;
                }

                const success = await loadLocalState(val);
                if (success) {
                    clearPinFailData(); // Xóa bộ đếm lỗi khi mở khóa thành công
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
                // Lưu ý: Không ghi nhận thất bại ở đây vì password có thể dài hơn 6 ký tự
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
    
    // Full Backup listeners
    const fullBackupBtn = document.getElementById('fullBackupBtn');
    if (fullBackupBtn) fullBackupBtn.addEventListener('click', handleFullBackup);
    const fullRestoreBtn = document.getElementById('fullRestoreBtn');
    if (fullRestoreBtn) fullRestoreBtn.addEventListener('click', () => {
        document.getElementById('fullRestoreFileInput').click();
    });
    const fullRestoreFileInput = document.getElementById('fullRestoreFileInput');
    if (fullRestoreFileInput) fullRestoreFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFullRestore(e.target.files[0]);
        e.target.value = '';
    });
    
    // Bind navigation tab clicks
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const navItem = link.closest('.nav-item');
            if (navItem && navItem.classList.contains('nav-locked')) {
                showToast('Vui lòng đăng nhập tài khoản trước', 'warning');
                return;
            }
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

    const toggleShowFamilyFundCard = document.getElementById('toggleShowFamilyFundCard');
    if (toggleShowFamilyFundCard) {
        toggleShowFamilyFundCard.addEventListener('change', async (e) => {
            state.showFamilyFundCard = e.target.checked;
            state.showFamilyFundCardUpdated = new Date().toISOString();
            await saveLocalState();
            updateFamilyFundCardUI();
            
            // Sync setting to other devices if configured
            if (sync.isConfigured() && await sync.getCurrentUser()) {
                performSync(true);
            }
        });
    }

    const toggleDebugConsole = document.getElementById('toggleDebugConsole');
    if (toggleDebugConsole) {
        toggleDebugConsole.addEventListener('change', (e) => {
            localStorage.setItem('gift_ledger_debug_console_enabled', e.target.checked ? 'true' : 'false');
            if (typeof window.updateDebugBadge === 'function') {
                window.updateDebugBadge();
            }
            showToast(e.target.checked ? "Đã bật bảng gỡ lỗi trên màn hình" : "Đã tắt bảng gỡ lỗi trên màn hình");
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
            const confirmPin = await window.showPrompt("CẢNH BÁO: Hành động này sẽ XÓA SẠCH toàn bộ dữ liệu thu chi đối ngoại trên ứng dụng FamiLife của thiết bị này (Dữ liệu hồ sơ y tế vẫn được giữ nguyên)!\n\nHành động này không thể hoàn tác.\nNếu bạn chắc chắn muốn xóa, hãy nhập đúng mã PIN mở khóa hiện tại để xác nhận:");
            if (confirmPin === null) {
                return; // Cancelled
            }
            
            if (confirmPin === state.masterPassword) {
                const doubleConfirm = await window.showConfirm("XÁC NHẬN CUỐI CÙNG: Bạn có thực sự chắc chắn muốn xóa toàn bộ dữ liệu thu chi đối ngoại?\n(Dữ liệu trên Supabase Cloud cũng sẽ bị xóa sạch sau khi đồng bộ)");
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
        else if (setupWizardOverlay && setupWizardOverlay.style.display !== 'none' && document.getElementById('wizardPinModeView') && document.getElementById('wizardPinModeView').style.display !== 'none') {
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

    // Initialize Fund Bindings
    initFundBindings();

    // Initialize Lucide Icons
    if (window.lucide) window.lucide.createIcons();

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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

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

// Trả về ngày hiện tại theo múi giờ địa phương dạng YYYY-MM-DD
// Dùng thay cho new Date().toISOString().split('T')[0] vốn trả về ngày UTC
// (trước 7h sáng VN sẽ hiển thị sai ngày hôm qua)
function getLocalDateString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
    
    if (window.lucide) window.lucide.createIcons();
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

// iOS Safari background scroll prevention
let touchStartY = 0;
document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchmove', (e) => {
    const activeOverlay = document.querySelector('.modal-overlay.active, .modal-overlay[style*="display: flex"], .modal-overlay[style*="display: block"]');
    if (activeOverlay) {
        // Find the closest ancestor that is actually scrollable vertically
        let scrollable = null;
        let el = e.target;
        while (el && el !== activeOverlay && el !== document.body && el !== document.documentElement) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY || '';
            const isScrollableStyle = overflowY.includes('auto') || overflowY.includes('scroll');
            if (isScrollableStyle && el.scrollHeight > el.clientHeight) {
                scrollable = el;
                break;
            }
            el = el.parentElement;
        }
        
        if (!scrollable) {
            e.preventDefault();
            return;
        }

        const clientHeight = scrollable.clientHeight;
        const scrollHeight = scrollable.scrollHeight;
        const scrollTop = scrollable.scrollTop;
        const touchEndY = e.touches[0].clientY;
        const deltaY = touchEndY - touchStartY;

        // If at top and scrolling down, block scrolling!
        if (scrollTop === 0 && deltaY > 0) {
            e.preventDefault();
            return;
        }

        // If at bottom and scrolling up, block scrolling!
        if (Math.abs(scrollHeight - clientHeight - scrollTop) < 1.5 && deltaY < 0) {
            e.preventDefault();
            return;
        }
    }
}, { passive: false });




// Render TC Management tab (sync checkboxes)
function renderTcManagement() {
    const toggleImportNotes = document.getElementById('toggleImportNotesOption');
    if (toggleImportNotes) {
        toggleImportNotes.checked = !!state.showImportNotesOption;
    }
    const toggleMobileTable = document.getElementById('toggleMobileTableView');
    if (toggleMobileTable) {
        toggleMobileTable.checked = state.mobileViewMode === 'table';
    }
    // Re-render custom events list
    renderCustomEventsSettingsList();
    lucide.createIcons();
}

// Full Backup - Export all data
async function handleFullBackup() {
    if (!state.masterPassword) {
        showToast('Vui lòng đăng nhập trước khi sao lưu.', 'warning');
        return;
    }
    try {
        const backupData = {
            type: 'familife_full_backup',
            version: APP_VERSION,
            date: new Date().toISOString(),
            receivedGifts: state.receivedGifts,
            sentGifts: state.sentGifts,
            medicalRecords: state.medicalRecords,
            bloodPressureRecords: state.bloodPressureRecords || [],
            familyProfiles: state.familyProfiles,
            familyFunds: state.familyFunds,
            fundTransactions: state.fundTransactions,
            customEventTypes: state.customEventTypes,
            geminiApiKey: state.geminiApiKey,
            showImportNotesOption: state.showImportNotesOption,
            showFamilyFundCard: state.showFamilyFundCard,
            mobileViewMode: state.mobileViewMode,
            selectedHealthProfileId: state.selectedHealthProfileId,
            activeChartFundIds: state.activeChartFundIds,
            spouseEmail: state.spouseEmail,
            ownerNickname: state.ownerNickname,
            spouseRole: state.spouseRole,
            spouseStatus: state.spouseStatus,
            googleSheetsWebhook: state.googleSheetsWebhook,
            lastAiAnalysis: state.lastAiAnalysis,
            lastAiAnalysisDate: state.lastAiAnalysisDate,
            lastBpAnalysis: state.lastBpAnalysis,
            lastBpAnalysisDate: state.lastBpAnalysisDate
        };
        const jsonStr = JSON.stringify(backupData);
        const encrypted = await encrypt(jsonStr, state.masterPassword);
        const blob = new Blob([JSON.stringify({ encrypted_full_backup: encrypted })], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `FamiLife_FullBackup_${dateStr}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        state.lastFullBackupDate = new Date().toISOString();
        await saveLocalState();
        updateLastBackupDisplay();
        showToast('Đã sao lưu toàn bộ dữ liệu thành công!', 'success');
    } catch (err) {
        console.error('Full backup failed:', err);
        showToast('Sao lưu thất bại: ' + err.message, 'error');
    }
}

// Full Restore
async function handleFullRestore(file) {
    if (!state.masterPassword) {
        showToast('Vui lòng đăng nhập trước khi phục hồi.', 'warning');
        return;
    }
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.encrypted_full_backup) {
            showToast('File không phải bản sao lưu toàn bộ hợp lệ.', 'error');
            return;
        }
        const decrypted = await decrypt(parsed.encrypted_full_backup, state.masterPassword);
        const data = JSON.parse(decrypted);
        if (data.type !== 'familife_full_backup') {
            showToast('File không đúng định dạng sao lưu FamiLife.', 'error');
            return;
        }
        if (!await window.showConfirm('Phục hồi sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại. Bạn có chắc chắn?', 'Xác nhận Phục hồi')) return;
        
        // Restore data
        if (data.receivedGifts) { state.receivedGifts = data.receivedGifts; state.receivedPage = 1; }
        if (data.sentGifts) { state.sentGifts = data.sentGifts; state.sentPage = 1; }
        if (data.medicalRecords) state.medicalRecords = data.medicalRecords;
        if (data.bloodPressureRecords) state.bloodPressureRecords = data.bloodPressureRecords;
        if (data.familyProfiles) state.familyProfiles = data.familyProfiles;
        if (data.familyFunds) state.familyFunds = data.familyFunds;
        if (data.fundTransactions) state.fundTransactions = data.fundTransactions;
        if (data.customEventTypes) state.customEventTypes = data.customEventTypes;
        if (data.geminiApiKey) state.geminiApiKey = data.geminiApiKey;
        if (data.showImportNotesOption !== undefined) state.showImportNotesOption = data.showImportNotesOption;
        if (data.showFamilyFundCard !== undefined) state.showFamilyFundCard = data.showFamilyFundCard;
        if (data.mobileViewMode) state.mobileViewMode = data.mobileViewMode;
        if (data.selectedHealthProfileId) state.selectedHealthProfileId = data.selectedHealthProfileId;
        if (data.activeChartFundIds) state.activeChartFundIds = data.activeChartFundIds;
        if (data.spouseEmail !== undefined) state.spouseEmail = data.spouseEmail;
        if (data.ownerNickname !== undefined) state.ownerNickname = data.ownerNickname;
        if (data.spouseRole) state.spouseRole = data.spouseRole;
        if (data.spouseStatus !== undefined) state.spouseStatus = data.spouseStatus;
        if (data.googleSheetsWebhook !== undefined) state.googleSheetsWebhook = data.googleSheetsWebhook;
        if (data.lastAiAnalysis !== undefined) state.lastAiAnalysis = data.lastAiAnalysis;
        if (data.lastAiAnalysisDate !== undefined) state.lastAiAnalysisDate = data.lastAiAnalysisDate;
        if (data.lastBpAnalysis !== undefined) state.lastBpAnalysis = data.lastBpAnalysis;
        if (data.lastBpAnalysisDate !== undefined) state.lastBpAnalysisDate = data.lastBpAnalysisDate;
        
        // Update timestamps
        const now = new Date().toISOString();
        state.medicalRecordsUpdated = now;
        state.bloodPressureRecordsUpdated = now;
        state.familyProfilesUpdated = now;
        state.familyFundsUpdated = now;
        state.fundTransactionsUpdated = now;
        state.customEventTypesUpdated = now;
        
        await saveLocalState();
        performSync(true);
        showToast(`Đã phục hồi thành công từ bản sao lưu (v${data.version || '?'})!`, 'success');
        
        // Reload current tab
        switchTab(state.activeTab || 'dashboard');
    } catch (err) {
        console.error('Full restore failed:', err);
        showToast('Phục hồi thất bại. Kiểm tra lại mật khẩu hoặc file backup.', 'error');
    }
}

function updateLastBackupDisplay() {
    const el = document.getElementById('lastBackupText');
    if (el) {
        if (state.lastFullBackupDate) {
            const d = new Date(state.lastFullBackupDate);
            el.textContent = `Lần sao lưu gần nhất: ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            el.textContent = 'Chưa có bản sao lưu nào';
        }
    }
}

window.renderTcManagement = renderTcManagement;

export { state, saveLocalState, showToast, performSync, APP_VERSION, formatDate, escapeHTML, getLocalDateString };

export { 
    formatVND, generateId, parseAmountInput, switchTab, getSupabaseConfig, 
    checkLoginStatus, renderDashboardSyncBanner, updateHomeWeather, 
    updateHomeLunar, compareRecordsByRecent, renderAll,
    generateAsymmetricKeypair, encryptWithPublicKey, decryptWithPrivateKey,
    handleFullBackup, handleFullRestore, updateLastBackupDisplay
};











