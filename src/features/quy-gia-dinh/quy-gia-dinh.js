// src/features/quy-gia-dinh/quy-gia-dinh.js - Family Fund Management Logic

import { 
    state, saveLocalState, showToast, performSync,
    formatDate, escapeHTML, formatVND, generateId,
    decryptWithPrivateKey, loadLocalState, getLocalDateString
} from '../../core/app.js?v=4.3.09';
import { decrypt } from '../../core/crypto.js?v=4.3.09';
import * as sync from '../../core/sync.js?v=4.3.09';

let fundContributionChart = null;
let fundDetailsChartsMap = {};

// Initialize Family Fund module bindings
export function initFundBindings() {
    // Quick actions or forms setup
    const contribForm = document.getElementById('fundContributionForm');
    if (contribForm) {
        contribForm.addEventListener('submit', handleContributionSubmit);
    }

    const transferForm = document.getElementById('fundTransferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransferSubmit);
    }

    const spendingForm = document.getElementById('fundSpendingForm');
    if (spendingForm) {
        spendingForm.addEventListener('submit', handleSpendingSubmit);
    }

    const spendingEventType = document.getElementById('spendingEventType');
    const spendingSyncExternalGroup = document.getElementById('spendingSyncExternalGroup');
    const spendingSyncExternal = document.getElementById('spendingSyncExternal');
    const spendingExternalDetails = document.getElementById('spendingExternalDetails');
    const spendingExternalName = document.getElementById('spendingExternalName');

    if (spendingEventType) {
        spendingEventType.addEventListener('change', (e) => {
            if (e.target.value !== 'none') {
                if (spendingSyncExternalGroup) spendingSyncExternalGroup.style.display = 'flex';
            } else {
                if (spendingSyncExternalGroup) spendingSyncExternalGroup.style.display = 'none';
                if (spendingExternalDetails) spendingExternalDetails.style.display = 'none';
                if (spendingSyncExternal) spendingSyncExternal.checked = false;
                if (spendingExternalName) spendingExternalName.required = false;
            }
        });
    }

    if (spendingSyncExternal) {
        spendingSyncExternal.addEventListener('change', (e) => {
            if (e.target.checked) {
                if (spendingExternalDetails) spendingExternalDetails.style.display = 'flex';
                if (spendingExternalName) spendingExternalName.required = true;
            } else {
                if (spendingExternalDetails) spendingExternalDetails.style.display = 'none';
                if (spendingExternalName) spendingExternalName.required = false;
            }
        });
    }

    const investForm = document.getElementById('fundInvestForm');
    if (investForm) {
        investForm.addEventListener('submit', handleInvestSubmit);
    }

    // Input money formatting
    setupMoneyFormatting(document.getElementById('contribAmount'));
    setupMoneyFormatting(document.getElementById('transferAmount'));
    setupMoneyFormatting(document.getElementById('spendingAmount'));
    setupMoneyFormatting(document.getElementById('investAmount'));

    // Filter transaction list
    const filterSelect = document.getElementById('filterFundSelect');
    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            renderTransactionList();
        });
    }

    const filterMemberSelect = document.getElementById('filterMemberSelect');
    if (filterMemberSelect) {
        filterMemberSelect.addEventListener('change', () => {
            renderTransactionList();
        });
    }

    // Chart select fund monthly change
    const chartSelectFund = document.getElementById('chartSelectFund');
    if (chartSelectFund) {
        chartSelectFund.addEventListener('change', () => {
            renderMonthlyFundChart();
        });
    }
    const chartSelectYear = document.getElementById('chartSelectYear');
    if (chartSelectYear) {
        chartSelectYear.addEventListener('change', () => {
            renderMonthlyFundChart();
        });
    }

    // Add custom fund form
    const addCustomForm = document.getElementById('fundAddCustomForm');
    if (addCustomForm) {
        addCustomForm.addEventListener('submit', handleAddCustomFundSubmit);
    }

    // Export Excel button
    const exportExcelBtn = document.getElementById('btnExportFundExcel');
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', handleExportFundExcel);
    }

    // Diagnostics button
    const diagBtn = document.getElementById('btnRunDiagnostics');
    if (diagBtn) {
        diagBtn.addEventListener('click', runFundDiagnostics);
    }

    // Google Sheets webhook form
    const sheetsForm = document.getElementById('fundGoogleSheetsForm');
    if (sheetsForm) {
        sheetsForm.addEventListener('submit', handleGoogleSheetsSubmit);
    }

    // Fund edit form submit
    const editForm = document.getElementById('fundEditForm');
    if (editForm) {
        editForm.addEventListener('submit', handleFundEditSubmit);
    }

    window.checkForSharedFamilyFund = checkForSharedFamilyFund;
    window.renderFundHistoryTab = renderFundHistoryTab;
    window.renderMonthlyFundChart = renderMonthlyFundChart;
}

// Format input as money
function setupMoneyFormatting(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value) {
            value = parseInt(value, 10);
            e.target.value = new Intl.NumberFormat('vi-VN').format(value);
        } else {
            e.target.value = '';
        }
    });
}

// Parse input string back to integer (supports shorthand: X < 10000 -> X * 1000)
function parseMoneyInput(str) {
    if (!str) return 0;
    let val = parseInt(str.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
    if (val > 0 && val < 1000000) {
        val = val * 1000;
    }
    return val;
}

// Trigger Google Sheets Webhook Sync
async function triggerGoogleSheetsSync(tx, isDeletion = false) {
    if (!state.googleSheetsWebhook || state.viewingSharedFund) return;

    const fund = state.familyFunds.find(f => f.id === tx.fundId || f.id === tx.fromFundId);
    
    let memberName = 'Khác';
    if (tx.memberId === 'p-husband') {
        memberName = 'Chồng';
    } else if (tx.memberId === 'p-wife') {
        memberName = 'Vợ';
    } else {
        const foundProfile = (state.familyProfiles || []).find(p => p.id === tx.memberId);
        if (foundProfile) memberName = foundProfile.name;
    }

    const payload = {
        ...tx,
        fundName: fund ? fund.name : '',
        memberName: memberName,
        isDeleted: isDeletion
    };

    try {
        fetch(state.googleSheetsWebhook, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(() => {
            console.log("Triggered Google Sheets webhook sync successfully");
        }).catch(err => {
            console.error("Failed to post to Google Sheets webhook:", err);
        });
    } catch (e) {
        console.error("Error in triggerGoogleSheetsSync:", e);
    }
}

// Ensure default funds exist in state
function ensureDefaultFunds() {
    if (!state.familyFunds || state.familyFunds.length === 0) {
        state.familyFunds = [
            { id: 'fund-main', name: 'Quỹ chính', type: 'main', balance: 0 },
            { id: 'fund-spending', name: 'Quỹ chi tiêu', type: 'spending', balance: 0, hasContribution: false },
            { id: 'fund-investment', name: 'Quỹ đầu tư', type: 'investment', balance: 0, hasContribution: true }
        ];
        state.familyFundsUpdated = new Date().toISOString();
    } else {
        let updated = false;
        state.familyFunds.forEach(fund => {
            if (fund.id === 'fund-main' && fund.name !== 'Quỹ chính') {
                fund.name = 'Quỹ chính';
                updated = true;
            }
            if (fund.id === 'fund-spending') {
                if (fund.name !== 'Quỹ chi tiêu') {
                    fund.name = 'Quỹ chi tiêu';
                    updated = true;
                }
                // If hasContribution is undefined, default it to false for spending fund
                if (fund.hasContribution === undefined) {
                    fund.hasContribution = false;
                    updated = true;
                }
            }
            if (fund.id === 'fund-investment') {
                if (fund.name !== 'Quỹ đầu tư') {
                    fund.name = 'Quỹ đầu tư';
                    updated = true;
                }
                // Default hasContribution to true for investment fund
                if (fund.hasContribution === undefined) {
                    fund.hasContribution = true;
                    updated = true;
                }
            }
        });
        if (updated) {
            state.familyFundsUpdated = new Date().toISOString();
        }
    }
}

// Calculate dynamic fund balances from transactions
export function calculateFundBalances() {
    ensureDefaultFunds();
    
    // Reset all balances to 0 first
    state.familyFunds.forEach(fund => {
        fund.balance = 0;
    });

    const activeTx = (state.fundTransactions || []).filter(t => !t.deleted_at);

    activeTx.forEach(tx => {
        const amount = tx.amount || 0;

        if (tx.type === 'contribution' || tx.type === 'external_income') {
            const fund = state.familyFunds.find(f => f.id === tx.fundId);
            if (fund) fund.balance += amount;
        } 
        else if (tx.type === 'spending') {
            const fund = state.familyFunds.find(f => f.id === tx.fundId);
            if (fund) fund.balance -= amount;
        } 
        else if (tx.type === 'investment_change') {
            const fund = state.familyFunds.find(f => f.id === tx.fundId);
            if (fund) fund.balance += amount;
        } 
        else if (tx.type === 'transfer') {
            const fromFund = state.familyFunds.find(f => f.id === tx.fromFundId);
            const toFund = state.familyFunds.find(f => f.id === tx.toFundId);
            if (fromFund) fromFund.balance -= amount;
            if (toFund) toFund.balance += amount;
        }
    });
}

// Check for shared family fund on Supabase (Wife's view)
export async function checkForSharedFamilyFund() {
    const supabaseClient = sync.getSupabase();
    if (!state.user || !supabaseClient) {
        // Do not reset state.viewingSharedFund to false while user session is loading
        return;
    }

    try {
        console.log("[E2EE Debug] Starting checkForSharedFamilyFund for user:", state.user.email);
        const { data, error } = await supabaseClient
            .from('gift_sync')
            .select('user_id, encrypted_data, updated_at, user_email');

        if (error) {
            console.error("[E2EE Debug] Supabase error fetching gift_sync:", error);
            return;
        }
        if (!data) {
            console.warn("[E2EE Debug] No data returned from gift_sync select");
            return;
        }

        console.log("[E2EE Debug] Fetched rows count:", data.length);
        const myEmail = state.user.email.toLowerCase().trim();
        for (const row of data) {
            if (row.user_id === state.user.id) {
                console.log("[E2EE Debug] Skipping own row:", row.user_email || row.user_id);
                continue; // Skip own data
            }

            let rowProcessed = false;

            // CASE C: Kiểm tra xem đây có phải là dòng của spouse (người được mình mời kết nối) để tự động chia sẻ khóa đối xứng
            const rowEmail = (row.user_email || '').toLowerCase().trim();
            if (!state.viewingSharedFund && state.spouseEmail && rowEmail === state.spouseEmail.toLowerCase().trim()) {
                try {
                    const parsed = JSON.parse(row.encrypted_data);
                    if (parsed) {
                        let spousePubKey = parsed.asymmetricPublicKey || '';
                        
                        // Nếu vợ đã cập nhật trạng thái chấp nhận kết nối
                        const remoteSpouseStatus = parsed.spouse_status || '';
                        if (remoteSpouseStatus === 'accepted' && state.spouseStatus !== 'accepted') {
                            state.spouseStatus = 'accepted';
                            state.spouseStatusUpdated = new Date().toISOString();
                            await saveLocalState();
                            console.log("[E2EE Debug] Spouse accepted invitation. Updating spouseStatus to accepted.");
                        }
                        
                        // Kiểm tra xem ta đã mã hóa fundSymmetricKey cho vợ chưa
                        const myHybridRow = data.find(r => r.user_id === state.user.id);
                        let needsSyncForSpouse = false;
                        if (myHybridRow) {
                            try {
                                const myParsed = JSON.parse(myHybridRow.encrypted_data);
                                const spouseEmailKey = state.spouseEmail.toLowerCase().trim();
                                if (myParsed && myParsed.fund_shared_keys) {
                                    const hasKeyForSpouse = !!myParsed.fund_shared_keys[spouseEmailKey];
                                    const spousePubKeyChanged = spousePubKey && spousePubKey !== state.spousePublicKey;
                                    if ((!hasKeyForSpouse || spousePubKeyChanged) && spousePubKey) {
                                        needsSyncForSpouse = true;
                                        state.spousePublicKey = spousePubKey;
                                        await saveLocalState();
                                        console.log("[E2EE Debug] Spouse public key changed or key missing. Triggering performSync.");
                                    }
                                }
                            } catch (e) {}
                        }
                        
                        // Giải mã Quỹ chung từ dòng của Spouse và gộp LWW vào cục bộ
                        if (state.fundSymmetricKey && parsed.encrypted_fund) {
                            try {
                                const decryptedFund = await decrypt(parsed.encrypted_fund, state.fundSymmetricKey);
                                const fundData = JSON.parse(decryptedFund);
                                
                                // Gộp familyFunds
                                const localFundTime = state.familyFundsUpdated ? new Date(state.familyFundsUpdated).getTime() : 0;
                                const remoteFundTime = fundData.familyFundsUpdated ? new Date(fundData.familyFundsUpdated).getTime() : 0;
                                if (remoteFundTime > localFundTime) {
                                    state.familyFunds = fundData.familyFunds || [];
                                    state.familyFundsUpdated = fundData.familyFundsUpdated || '';
                                }

                                // Union Merge fundTransactions (chống mất dữ liệu của cả 2 phía)
                                const remoteTxs = fundData.fundTransactions || [];
                                const localTxs = state.fundTransactions || [];
                                const txMap = new Map();
                                // Nhâp local trước
                                localTxs.forEach(t => txMap.set(t.id, t));
                                // Override bằng remote nếu remote mới hơn (field-level LWW)
                                remoteTxs.forEach(t => {
                                    const existing = txMap.get(t.id);
                                    if (!existing) {
                                        txMap.set(t.id, t);
                                    } else {
                                        const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
                                        const remoteTime = t.updated_at ? new Date(t.updated_at).getTime() : 0;
                                        if (remoteTime >= localTime) txMap.set(t.id, t);
                                    }
                                });
                                const mergedTxs = Array.from(txMap.values());
                                state.fundTransactions = mergedTxs;
                                const newTxTimestamp = remoteTxs.length > 0 ? (fundData.fundTransactionsUpdated || new Date().toISOString()) : (state.fundTransactionsUpdated || '');
                                if (!state.fundTransactionsUpdated || new Date(newTxTimestamp).getTime() > new Date(state.fundTransactionsUpdated).getTime()) {
                                    state.fundTransactionsUpdated = newTxTimestamp;
                                }

                                // Gộp WeLove Start Date
                                const localStartDateTime = state.weLoveStartDateUpdated ? new Date(state.weLoveStartDateUpdated).getTime() : 0;
                                const remoteStartDateTime = fundData.weLoveStartDateUpdated ? new Date(fundData.weLoveStartDateUpdated).getTime() : 0;
                                if (remoteStartDateTime > localStartDateTime) {
                                    state.weLoveStartDate = fundData.weLoveStartDate || '';
                                    state.weLoveStartDateUpdated = fundData.weLoveStartDateUpdated || '';
                                }

                                // Gộp WeLove Name1
                                const localName1Time = state.weLoveName1Updated ? new Date(state.weLoveName1Updated).getTime() : 0;
                                const remoteName1Time = fundData.weLoveName1Updated ? new Date(fundData.weLoveName1Updated).getTime() : 0;
                                if (remoteName1Time > localName1Time) {
                                    state.weLoveName1 = fundData.weLoveName1 || '';
                                    state.weLoveName1Updated = fundData.weLoveName1Updated || '';
                                }

                                // Gộp WeLove Name2
                                const localName2Time = state.weLoveName2Updated ? new Date(state.weLoveName2Updated).getTime() : 0;
                                const remoteName2Time = fundData.weLoveName2Updated ? new Date(fundData.weLoveName2Updated).getTime() : 0;
                                if (remoteName2Time > localName2Time) {
                                    state.weLoveName2 = fundData.weLoveName2 || '';
                                    state.weLoveName2Updated = fundData.weLoveName2Updated || '';
                                }

                                // Gộp WeLove Show Sickness
                                const localShowSick = state.weLoveShowSicknessUpdated ? new Date(state.weLoveShowSicknessUpdated).getTime() : 0;
                                const remoteShowSick = fundData.weLoveShowSicknessUpdated ? new Date(fundData.weLoveShowSicknessUpdated).getTime() : 0;
                                if (remoteShowSick > localShowSick) {
                                    state.weLoveShowSickness = fundData.weLoveShowSickness !== false;
                                    state.weLoveShowSicknessUpdated = fundData.weLoveShowSicknessUpdated || '';
                                }

                                // Gộp WeLove Sickness Logs
                                const localSickLogs = state.weLoveSicknessLogsUpdated ? new Date(state.weLoveSicknessLogsUpdated).getTime() : 0;
                                const remoteSickLogs = fundData.weLoveSicknessLogsUpdated ? new Date(fundData.weLoveSicknessLogsUpdated).getTime() : 0;
                                if (remoteSickLogs > localSickLogs) {
                                    state.weLoveSicknessLogs = fundData.weLoveSicknessLogs || [];
                                    state.weLoveSicknessLogsUpdated = fundData.weLoveSicknessLogsUpdated || '';
                                }

                                // Gộp WeLove Reminders
                                const localRem = state.weLoveRemindersUpdated ? new Date(state.weLoveRemindersUpdated).getTime() : 0;
                                const remoteRem = fundData.weLoveRemindersUpdated ? new Date(fundData.weLoveRemindersUpdated).getTime() : 0;
                                if (remoteRem > localRem) {
                                    state.weLoveReminders = fundData.weLoveReminders || [];
                                    state.weLoveRemindersUpdated = fundData.weLoveRemindersUpdated || '';
                                }

                                // Gộp WeLove Autoplay
                                const localAuto = state.weLoveAutoplayUpdated ? new Date(state.weLoveAutoplayUpdated).getTime() : 0;
                                const remoteAuto = fundData.weLoveAutoplayUpdated ? new Date(fundData.weLoveAutoplayUpdated).getTime() : 0;
                                if (remoteAuto > localAuto) {
                                    state.weLoveAutoplay = fundData.weLoveAutoplay === true;
                                    state.weLoveAutoplayUpdated = fundData.weLoveAutoplayUpdated || '';
                                }

                                // Gộp WeLove Visit Logs
                                const localVisits = state.weLoveVisitLogsUpdated ? new Date(state.weLoveVisitLogsUpdated).getTime() : 0;
                                const remoteVisits = fundData.weLoveVisitLogsUpdated ? new Date(fundData.weLoveVisitLogsUpdated).getTime() : 0;
                                if (remoteVisits > localVisits) {
                                    state.weLoveVisitLogs = fundData.weLoveVisitLogs || [];
                                    state.weLoveVisitLogsUpdated = fundData.weLoveVisitLogsUpdated || '';
                                }

                                await saveLocalState();
                            } catch (decFundErr) {
                                console.error("[E2EE Debug] Admin failed to decrypt Spouse's fund:", decFundErr);
                            }
                        }

                        if (needsSyncForSpouse) {
                            setTimeout(() => {
                                if (typeof performSync === 'function') {
                                    performSync(true);
                                }
                            }, 500);
                        }
                        rowProcessed = true;
                    }
                } catch (e) {
                    console.error("[E2EE Debug] Error checking spouse row:", e);
                }
            }

            // CASE D: Đối với người tạo mã ghép đôi (Admin), tự động nhận diện khi đối tác đã nhập mã và chấp nhận kết nối
            const isPairingActive = state.pairingCode && state.pairingCodeExpired && (new Date(state.pairingCodeExpired).getTime() > Date.now());
            if (!state.spouseEmail && !rowProcessed && isPairingActive) {
                try {
                    const parsed = JSON.parse(row.encrypted_data);
                    if (parsed && parsed.is_hybrid && parsed.spouse_email) {
                        const remoteSpouseEmail = parsed.spouse_email.toLowerCase().trim();
                        const remoteSpouseStatus = parsed.spouse_status || '';
                        
                        if (remoteSpouseEmail === myEmail && remoteSpouseStatus === 'accepted') {
                            const spouseEmailVal = (row.user_email || '').toLowerCase().trim();
                            console.log("[E2EE Debug] Detected partner accepted pairing. Connecting to:", spouseEmailVal);
                            
                            state.spouseEmail = spouseEmailVal;
                            state.spouseStatus = 'accepted';
                            state.spouseRole = 'husband'; // Current user is Husband (Admin)
                            state.familyFundInviteStatus = 'accepted';
                            state.spouseStatusUpdated = new Date().toISOString();
                            
                            await saveLocalState();
                            
                            // Thực hiện đồng bộ ngầm để chia sẻ khóa đối xứng và dữ liệu WeLove chung
                            setTimeout(() => {
                                if (typeof performSync === 'function') {
                                    performSync(true);
                                }
                            }, 500);
                            
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            if (typeof window.renderWeLoveDashboard === 'function') {
                                window.renderWeLoveDashboard();
                            }
                            rowProcessed = true;
                        }
                    }
                } catch (e) {
                    if (!(e instanceof SyntaxError)) {
                        console.error("[E2EE Debug] Error in CASE D pairing detection:", e);
                    }
                }
            }

            if (rowProcessed) {
                continue;
            }

            try {
                const parsed = JSON.parse(row.encrypted_data);
                
                if (parsed && parsed.is_hybrid) {
                    const isSharedOwner = state.sharedFundSourceRow && row.user_id === state.sharedFundSourceRow.user_id;
                    const isSpouseEmailMatched = parsed.spouse_email && parsed.spouse_email.toLowerCase().trim() === myEmail;
                    const isCurrentSpouse = state.spouseEmail && rowEmail === state.spouseEmail.toLowerCase().trim();
                    
                    if (state.viewingSharedFund && isCurrentSpouse && (isSpouseEmailMatched || isSharedOwner)) {
                        const inviteTime = state.familyFundInviteStatusUpdated ? new Date(state.familyFundInviteStatusUpdated).getTime() : 0;
                        const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
                        
                        if (state.familyFundInviteStatus === 'declined') {
                            if (rowTime > inviteTime) {
                                console.log("[E2EE Debug] Found new invitation updated after decline/leave. Resetting status.");
                                state.familyFundInviteStatus = '';
                                state.familyFundInviteStatusUpdated = new Date().toISOString();
                                await saveLocalState();
                            } else {
                                console.log("[E2EE Debug] Spouse has declined/left this shared fund. Skipping.");
                                continue;
                            }
                        }
                        console.log("[E2EE Debug] Match found for spouse_email!");
                        state.spouseRole = 'wife'; // Guest's role is always 'wife' (Partner is Husband/Admin)
                        state.ownerNickname = parsed.owner_nickname || '';
                        let fundKey = '';
                        if (state.asymmetricPrivateKeyEncrypted) {
                            let decryptedPrivKey = await decrypt(state.asymmetricPrivateKeyEncrypted, state.masterPassword);
                            const myEncryptedFundKey = parsed.fund_shared_keys ? parsed.fund_shared_keys[myEmail] : null;
                            console.log("[E2EE Debug] myEncryptedFundKey exists:", !!myEncryptedFundKey);
                            if (myEncryptedFundKey) {
                                try {
                                    fundKey = await decryptWithPrivateKey(decryptedPrivKey, myEncryptedFundKey);
                                    console.log("[E2EE Debug] Decrypted fundKey successfully!");
                                } catch (decKeyErr) {
                                    console.error("[E2EE Debug] Spouse failed to decrypt Fund Key:", decKeyErr);
                                }
                            }
                            decryptedPrivKey = null; // CVE-6: xóa khỏi memory ngay sau dùng
                        }
                        
                        if (fundKey && parsed.encrypted_fund) {
                            state.spouseFundInvitePending = false;
                            if (state.familyFundInviteStatus === 'accepted') {
                                const decryptedFund = await decrypt(parsed.encrypted_fund, fundKey);
                                const fundData = JSON.parse(decryptedFund);
                                state.familyFunds = fundData.familyFunds || [];
                                // Union Merge fundTransactions cho CASE A (Spouse)
                                const remoteTxsA = fundData.fundTransactions || [];
                                const localTxsA = state.fundTransactions || [];
                                const txMapA = new Map();
                                localTxsA.forEach(t => txMapA.set(t.id, t));
                                remoteTxsA.forEach(t => {
                                    const existing = txMapA.get(t.id);
                                    if (!existing) {
                                        txMapA.set(t.id, t);
                                    } else {
                                        const localTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
                                        const remoteTime = t.updated_at ? new Date(t.updated_at).getTime() : 0;
                                        if (remoteTime >= localTime) txMapA.set(t.id, t);
                                    }
                                });
                                state.fundTransactions = Array.from(txMapA.values());
                                if (fundData.fundTransactionsUpdated) {
                                    const remoteT = new Date(fundData.fundTransactionsUpdated).getTime();
                                    const localT = state.fundTransactionsUpdated ? new Date(state.fundTransactionsUpdated).getTime() : 0;
                                    if (remoteT > localT) state.fundTransactionsUpdated = fundData.fundTransactionsUpdated;
                                }

                                // Gộp dữ liệu Góc tình yêu (WeLove) từ Quỹ chung bằng Last Write Wins (LWW)
                                if (fundData.weLoveStartDateUpdated) {
                                    const localTime = state.weLoveStartDateUpdated ? new Date(state.weLoveStartDateUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveStartDateUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveStartDate = fundData.weLoveStartDate || '';
                                        state.weLoveStartDateUpdated = fundData.weLoveStartDateUpdated;
                                    }
                                }
                                if (fundData.weLoveName1Updated) {
                                    const localTime = state.weLoveName1Updated ? new Date(state.weLoveName1Updated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveName1Updated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveName1 = fundData.weLoveName1 || '';
                                        state.weLoveName1Updated = fundData.weLoveName1Updated;
                                    }
                                }
                                if (fundData.weLoveName2Updated) {
                                    const localTime = state.weLoveName2Updated ? new Date(state.weLoveName2Updated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveName2Updated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveName2 = fundData.weLoveName2 || '';
                                        state.weLoveName2Updated = fundData.weLoveName2Updated;
                                    }
                                }
                                if (fundData.weLoveShowSicknessUpdated) {
                                    const localTime = state.weLoveShowSicknessUpdated ? new Date(state.weLoveShowSicknessUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveShowSicknessUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveShowSickness = fundData.weLoveShowSickness !== false;
                                        state.weLoveShowSicknessUpdated = fundData.weLoveShowSicknessUpdated;
                                    }
                                }
                                if (fundData.weLoveSicknessLogsUpdated) {
                                    const localTime = state.weLoveSicknessLogsUpdated ? new Date(state.weLoveSicknessLogsUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveSicknessLogsUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveSicknessLogs = fundData.weLoveSicknessLogs || [];
                                        state.weLoveSicknessLogsUpdated = fundData.weLoveSicknessLogsUpdated;
                                    }
                                }
                                if (fundData.weLoveRemindersUpdated) {
                                    const localTime = state.weLoveRemindersUpdated ? new Date(state.weLoveRemindersUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveRemindersUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveReminders = fundData.weLoveReminders || [];
                                        state.weLoveRemindersUpdated = fundData.weLoveRemindersUpdated;
                                    }
                                }
                                if (fundData.weLoveAutoplayUpdated) {
                                    const localTime = state.weLoveAutoplayUpdated ? new Date(state.weLoveAutoplayUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.weLoveAutoplayUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.weLoveAutoplay = fundData.weLoveAutoplay === true;
                                        state.weLoveAutoplayUpdated = fundData.weLoveAutoplayUpdated;
                                    }
                                }
                                 if (fundData.weLoveVisitLogsUpdated) {
                                     const localTime = state.weLoveVisitLogsUpdated ? new Date(state.weLoveVisitLogsUpdated).getTime() : 0;
                                     const remoteTime = new Date(fundData.weLoveVisitLogsUpdated).getTime();
                                     if (remoteTime > localTime) {
                                         state.weLoveVisitLogs = fundData.weLoveVisitLogs || [];
                                         state.weLoveVisitLogsUpdated = fundData.weLoveVisitLogsUpdated;
                                     }
                                 }
                                if (fundData.ownerEmailUpdated) {
                                    const localTime = state.ownerEmailUpdated ? new Date(state.ownerEmailUpdated).getTime() : 0;
                                    const remoteTime = new Date(fundData.ownerEmailUpdated).getTime();
                                    if (remoteTime > localTime) {
                                        state.ownerEmail = fundData.ownerEmail || '';
                                        state.ownerEmailUpdated = fundData.ownerEmailUpdated;
                                    }
                                }
                                state.viewingSharedFund = true;
                                state.sharedFundOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                                state.fundSymmetricKey = fundKey;
                                state.sharedFundSourceRow = {
                                    user_id: row.user_id,
                                    encrypted_data: row.encrypted_data,
                                    encrypted_personal: parsed.encrypted_personal,
                                    fund_shared_keys: parsed.fund_shared_keys,
                                    owner_email: parsed.owner_email,
                                    spouse_email: parsed.spouse_email,
                                    google_sheets_webhook: parsed.google_sheets_webhook
                                };
                                if (typeof window.updateHomeLayoutUI === 'function') {
                                    window.updateHomeLayoutUI();
                                }
                                return;
                            } else {
                                state.viewingSharedFund = false;
                                state.sharedFundOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                                state.fundSymmetricKey = fundKey;
                                state.sharedFundSourceRow = {
                                    user_id: row.user_id,
                                    encrypted_data: row.encrypted_data,
                                    encrypted_personal: parsed.encrypted_personal,
                                    fund_shared_keys: parsed.fund_shared_keys,
                                    owner_email: parsed.owner_email,
                                    spouse_email: parsed.spouse_email,
                                    google_sheets_webhook: parsed.google_sheets_webhook
                                };
                                if (typeof window.updateHomeLayoutUI === 'function') {
                                    window.updateHomeLayoutUI();
                                }
                                return;
                            }
                        } else {
                            // Case B: Husband has shared with us, but hasn't encrypted the key using our new public key yet
                            console.log("[E2EE Debug] Case B: spouse_email matched but no valid fundKey decrypted yet.");
                            state.spouseFundInvitePending = true;
                            state.spouseFundInviteOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                            state.sharedFundSourceRow = {
                                user_id: row.user_id,
                                encrypted_data: row.encrypted_data,
                                encrypted_personal: parsed.encrypted_personal,
                                fund_shared_keys: parsed.fund_shared_keys,
                                owner_email: parsed.owner_email,
                                spouse_email: parsed.spouse_email,
                                google_sheets_webhook: parsed.google_sheets_webhook
                            };
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                        }
                    }
                } else {
                    // Fallback to legacy E2EE format
                    const decrypted = await decrypt(row.encrypted_data, state.masterPassword);
                    const legacyParsed = JSON.parse(decrypted);

                    if (legacyParsed.spouseEmail && legacyParsed.spouseEmail.toLowerCase().trim() === myEmail) {
                        const inviteTime = state.familyFundInviteStatusUpdated ? new Date(state.familyFundInviteStatusUpdated).getTime() : 0;
                        const rowTime = row.updated_at ? new Date(row.updated_at).getTime() : 0;
                        
                        if (state.familyFundInviteStatus === 'declined') {
                            if (rowTime > inviteTime) {
                                console.log("[E2EE Debug] Found new legacy invitation updated after decline/leave. Resetting status.");
                                state.familyFundInviteStatus = '';
                                state.familyFundInviteStatusUpdated = new Date().toISOString();
                                await saveLocalState();
                            } else {
                                console.log("[E2EE Debug] Spouse has declined/left legacy shared fund. Skipping.");
                                continue;
                            }
                        }
                        if (state.familyFundInviteStatus === 'accepted') {
                            state.familyFunds = legacyParsed.familyFunds || [];
                            state.fundTransactions = legacyParsed.fundTransactions || [];
                            state.viewingSharedFund = true;
                            state.sharedFundOwnerEmail = legacyParsed.ownerEmail || 'Chồng/Vợ';
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            return;
                        } else {
                            state.viewingSharedFund = false;
                            state.sharedFundOwnerEmail = legacyParsed.ownerEmail || 'Chồng/Vợ';
                            if (typeof window.updateHomeLayoutUI === 'function') {
                                window.updateHomeLayoutUI();
                            }
                            return;
                        }
                    }
                }
            } catch (decErr) {
                // Ignore decryption/parsing failures for other users' rows
            }
        }
        
    } catch (e) {
        console.error("Error checking shared family fund:", e);
    }
}

// Main Render Function called when switching to 'fund' tab
export async function renderFundDashboard() {
    // 0. Check for shared family fund E2EE
    await checkForSharedFamilyFund();

    // 1. Calculate balances dynamically
    calculateFundBalances();

    // 2. Render Shared Banner & Header Card
    const banner = document.getElementById('sharedFundBanner');
    if (banner) banner.style.display = 'none'; // Keep old banner hidden

    const headerCard = document.getElementById('sharedFundHeaderCard');
    const headerCardTitleText = document.getElementById('sharedFundHeaderCardTitleText');
    if (headerCard && headerCardTitleText) {
        if (state.viewingSharedFund && state.activeTab === 'fund') {
            headerCard.style.display = 'flex';
            headerCardTitleText.innerText = "Bạn đang tham gia quỹ chung gia đình";
            lucide.createIcons();
        } else {
            headerCard.style.display = 'none';
        }
    }

    // 3. Render Fund Cards Dynamically (Hiding delete buttons here!)
    renderFundCards();

    // 4. Render Charts (Wrapped in a setTimeout to allow DOM reflow for correct width calculations)
    setTimeout(() => {
        renderContributionChart();
        renderFundDetailsCharts();
        renderMonthlyFundChart();
    }, 50);

    // 6. Populate members list in Contribution Form
    populateMemberSelects();

    // 7. Populate fund selectors in Transfer/Spending/Invest forms
    populateFundSelects();

    // 8. Render Transaction List (Audit Log)
    renderTransactionList();
}

// Render the cards dynamically including custom funds (delete buttons hidden)
function renderFundCards() {
    const grid = document.querySelector('.fund-balance-grid');
    if (!grid) return;

    grid.innerHTML = (state.familyFunds || []).map(fund => {
        let themeClass = 'custom-fund';
        let iconName = 'archive';
        let buttonsHtml = '';

        if (fund.type === 'main') {
            themeClass = 'main-fund';
            iconName = 'wallet';
            buttonsHtml = `
                <button class="btn-fund-action" onclick="openFundActionModal('contribution')" style="--accent-color: #10b981;">
                    <i data-lucide="arrow-down-left"></i> Đóng góp
                </button>
                ${!state.viewingSharedFund ? `
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Trích quỹ
                </button>
                ` : ''}
            `;
        } else if (fund.type === 'spending') {
            themeClass = 'spending-fund';
            iconName = 'shopping-bag';
            
            const contributionButton = fund.hasContribution ? `
                <button class="btn-fund-action" onclick="openFundActionModal('contribution', '${fund.id}')" style="--accent-color: #10b981;">
                    <i data-lucide="arrow-down-left"></i> Đóng góp
                </button>
            ` : '';
            
            buttonsHtml = `
                ${contributionButton}
                <button class="btn-fund-action" onclick="openFundActionModal('spending', '${fund.id}')" style="--accent-color: #ef4444;">
                    <i data-lucide="arrow-up-right"></i> Chi tiêu
                </button>
                ${!state.viewingSharedFund ? `
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
                ` : ''}
            `;
        } else if (fund.type === 'investment') {
            themeClass = 'investment-fund';
            iconName = 'trending-up';
            
            const contributionButton = fund.hasContribution ? `
                <button class="btn-fund-action" onclick="openFundActionModal('contribution', '${fund.id}')" style="--accent-color: #10b981;">
                    <i data-lucide="arrow-down-left"></i> Đóng góp
                </button>
            ` : '';
            
            buttonsHtml = `
                ${contributionButton}
                ${!state.viewingSharedFund ? `
                <button class="btn-fund-action" onclick="openFundActionModal('invest', '${fund.id}')" style="--accent-color: #f59e0b;">
                    <i data-lucide="trending-up"></i> Chốt lãi/lỗ
                </button>
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
                ` : ''}
            `;
        } else {
            themeClass = 'custom-fund';
            iconName = 'wallet-cards';
            
            const contributionButton = fund.hasContribution ? `
                <button class="btn-fund-action" onclick="openFundActionModal('contribution', '${fund.id}')" style="--accent-color: #10b981;">
                    <i data-lucide="arrow-down-left"></i> Đóng góp
                </button>
            ` : '';
            
            buttonsHtml = `
                ${contributionButton}
                <button class="btn-fund-action" onclick="openFundActionModal('spending', '${fund.id}')" style="--accent-color: #ef4444;">
                    <i data-lucide="arrow-up-right"></i> Chi tiêu
                </button>
                ${!state.viewingSharedFund ? `
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
                ` : ''}
            `;
        }

        return `
            <div class="fund-card ${themeClass}">
                <div class="fund-card-header">
                    <span class="fund-title">${escapeHTML(fund.name)}</span>
                    <div class="fund-icon-wrapper">
                        <i data-lucide="${iconName}"></i>
                    </div>
                </div>
                <div class="fund-balance">${formatVND(fund.balance)}</div>
                <div class="fund-actions">
                    ${buttonsHtml}
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Populate Member Select dropdowns
function populateMemberSelects() {
    const contribMemberSelect = document.getElementById('contribMember');
    if (!contribMemberSelect) return;

    let members = [
        { id: 'p-husband', name: 'Chồng' },
        { id: 'p-wife', name: 'Vợ' }
    ];

    if (state.familyProfiles && state.familyProfiles.length > 0) {
        state.familyProfiles.forEach(p => {
            if (p.id !== 'p-self' && p.id !== 'p-husband' && p.id !== 'p-wife') {
                members.push({ id: p.id, name: p.name });
            }
        });
    }

    contribMemberSelect.innerHTML = members
        .map(m => `<option value="${m.id}">${escapeHTML(m.name)}</option>`)
        .join('');

    let currentUserRole = 'husband';
    if (state.viewingSharedFund) {
        currentUserRole = 'wife';
    } else if (state.spouseEmail) {
        currentUserRole = 'husband';
    }

    if (currentUserRole === 'wife') {
        contribMemberSelect.value = 'p-wife';
        contribMemberSelect.disabled = true;
    } else {
        contribMemberSelect.value = 'p-husband';
        contribMemberSelect.disabled = false;
    }
}

// Populate Fund selectors
function populateFundSelects() {
    const transferFrom = document.getElementById('transferFromFund');
    const transferTo = document.getElementById('transferToFund');
    const spendingFundSelect = document.getElementById('spendingFundSelect');
    const investFundSelect = document.getElementById('investFundSelect');
    const contribFundSelect = document.getElementById('contribFundSelect');

    const funds = state.familyFunds || [];

    if (contribFundSelect) {
        contribFundSelect.innerHTML = funds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        contribFundSelect.value = 'fund-main';
    }

    if (transferFrom) {
        transferFrom.innerHTML = funds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        transferFrom.value = 'fund-main';
    }
    if (transferTo) {
        transferTo.innerHTML = funds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        transferTo.value = 'fund-spending';
    }
    if (spendingFundSelect) {
        const spendableFunds = funds.filter(f => f.type === 'spending' || f.type === 'custom');
        spendingFundSelect.innerHTML = spendableFunds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
    }
    if (investFundSelect) {
        const investableFunds = funds.filter(f => f.type === 'investment');
        investFundSelect.innerHTML = investableFunds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
    }

    const filterFundSelect = document.getElementById('filterFundSelect');
    if (filterFundSelect) {
        const currentVal = filterFundSelect.value;
        filterFundSelect.innerHTML = `<option value="all">Tất cả các quỹ</option>` + funds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        if (currentVal && Array.from(filterFundSelect.options).some(opt => opt.value === currentVal)) {
            filterFundSelect.value = currentVal;
        } else {
            filterFundSelect.value = 'all';
        }
    }

    const chartSelectFund = document.getElementById('chartSelectFund');
    if (chartSelectFund) {
        const currentVal = chartSelectFund.value;
        chartSelectFund.innerHTML = `<option value="all">Tất cả quỹ</option>` + funds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
        if (currentVal && Array.from(chartSelectFund.options).some(opt => opt.value === currentVal)) {
            chartSelectFund.value = currentVal;
        } else {
            chartSelectFund.value = 'all';
        }
    }

    const chartSelectYear = document.getElementById('chartSelectYear');
    if (chartSelectYear) {
        const currentYear = new Date().getFullYear();
        const yearsSet = new Set([currentYear, 2024, 2025, 2026]);
        
        // Thu thập tất cả các năm từ giao dịch quỹ thực tế
        (state.fundTransactions || []).forEach(t => {
            if (t.date && !t.deleted_at) {
                const y = new Date(t.date).getFullYear();
                if (!isNaN(y)) {
                    yearsSet.add(y);
                }
            }
        });
        
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        let options = '';
        sortedYears.forEach(y => {
            options += `<option value="${y}">Năm ${y}</option>`;
        });
        
        const savedYear = chartSelectYear.value;
        chartSelectYear.innerHTML = options;
        if (savedYear && Array.from(chartSelectYear.options).some(opt => opt.value === savedYear)) {
            chartSelectYear.value = savedYear;
        } else {
            chartSelectYear.value = currentYear.toString();
        }
    }
}

// Render Doughnut Chart using Chart.js (Contributions)
function renderContributionChart() {
    const ctx = document.getElementById('fundContributionChartCanvas');
    if (!ctx) return;

    const activeTx = (state.fundTransactions || []).filter(t => !t.deleted_at);
    let husbandTotal = 0;
    let wifeTotal = 0;
    let othersTotal = 0;

    activeTx.forEach(tx => {
        if (tx.type === 'contribution' || tx.type === 'external_income') {
            const amount = tx.amount || 0;
            if (tx.memberId === 'p-husband') {
                husbandTotal += amount;
            } else if (tx.memberId === 'p-wife') {
                wifeTotal += amount;
            } else {
                othersTotal += amount;
            }
        }
    });

    const total = husbandTotal + wifeTotal + othersTotal;

    const husbandPercent = total > 0 ? Math.round((husbandTotal / total) * 100) : 50;
    const wifePercent = total > 0 ? Math.round((wifeTotal / total) * 100) : 50;

    const husbandText = document.getElementById('chartHusbandText');
    if (husbandText) husbandText.innerText = `${formatVND(husbandTotal)} (${husbandPercent}%)`;

    const wifeText = document.getElementById('chartWifeText');
    if (wifeText) wifeText.innerText = `${formatVND(wifeTotal)} (${wifePercent}%)`;

    const totalTextEl = document.getElementById('fundTotalContributionText');
    if (totalTextEl) {
        totalTextEl.innerText = `Tổng tích lũy đóng góp: ${formatVND(total)}`;
    }

    const dataValues = total > 0 ? [husbandTotal, wifeTotal] : [1, 1];
    const labelValues = total > 0 ? ['Chồng đóng góp', 'Vợ đóng góp'] : ['Chưa có đóng góp', 'Chưa có đóng góp'];
    const colorValues = total > 0 ? ['#0284c7', '#ef4444'] : ['#3b82f6', '#3b82f6'];

    if (fundContributionChart) {
        fundContributionChart.destroy();
    }

    fundContributionChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labelValues,
            datasets: [{
                data: dataValues,
                backgroundColor: colorValues,
                borderColor: '#111827',
                borderWidth: 2,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (total === 0) return ' Chưa có đóng góp';
                            const val = context.raw || 0;
                            return ` ${context.label}: ${formatVND(val)}`;
                        }
                    }
                }
            },
            cutout: '70%'
        }
    });
}

// Render dynamic cashflow Doughnut charts for all active selections
function renderFundDetailsCharts() {
    const container = document.getElementById('fundDynamicChartsContainer');
    if (!container) return;

    // Clear previous charts HTML
    container.innerHTML = '';

    const activeFundIds = state.activeChartFundIds || ['fund-main'];
    
    if (activeFundIds.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border-color); border-radius:12px; background:rgba(0,0,0,0.1);">
                Không có biểu đồ quỹ nào được bật. (Cấu hình bật biểu đồ trong tab Quản lý)
            </div>
        `;
        return;
    }

    // Re-create canvases and render charts
    activeFundIds.forEach(fundId => {
        const fund = (state.familyFunds || []).find(f => f.id === fundId);
        if (!fund) return;

        let totalInflow = 0;
        let totalOutflow = 0;

        const activeTx = (state.fundTransactions || []).filter(t => !t.deleted_at);

        activeTx.forEach(tx => {
            const amount = Math.abs(tx.amount || 0);

            if (tx.fundId === fundId) {
                if (tx.type === 'contribution' || tx.type === 'external_income') {
                    totalInflow += amount;
                } else if (tx.type === 'spending') {
                    totalOutflow += amount;
                } else if (tx.type === 'investment_change') {
                    if (tx.amount >= 0) {
                        totalInflow += amount;
                    } else {
                        totalOutflow += amount;
                    }
                }
            } else if (tx.type === 'transfer') {
                if (tx.toFundId === fundId) {
                    totalInflow += amount;
                } else if (tx.fromFundId === fundId) {
                    totalOutflow += amount;
                }
            }
        });

        const total = totalInflow + totalOutflow;
        const inflowPercent = total > 0 ? Math.round((totalInflow / total) * 100) : 50;
        const outflowPercent = total > 0 ? Math.round((totalOutflow / total) * 100) : 50;

        // Append chart card layout
        const cardDiv = document.createElement('div');
        cardDiv.className = 'fund-chart-card';
        cardDiv.style.margin = '0';
        cardDiv.style.width = '100%';
        cardDiv.innerHTML = `
            <h4 class="health-card-title">Dòng tiền: ${escapeHTML(fund.name)}</h4>
            <p class="health-card-desc">Tỷ lệ nạp vào vs chi ra của quỹ</p>
            <div class="fund-chart-container" style="position: relative; height: 220px; width: 100%;">
                <canvas id="canvas-chart-${fund.id}"></canvas>
            </div>
            <div class="chart-legend-custom" style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
                <div class="legend-item" style="display:flex; justify-content:space-between; font-size:0.82rem;">
                    <span><span class="legend-color" style="background-color: #10b981; display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px;"></span>Tổng thu (nạp vào):</span>
                    <strong>${formatVND(totalInflow)} (${inflowPercent}%)</strong>
                </div>
                <div class="legend-item" style="display:flex; justify-content:space-between; font-size:0.82rem; margin-top:4px;">
                    <span><span class="legend-color" style="background-color: #ef4444; display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:6px;"></span>Tổng chi (rút đi):</span>
                    <strong>${formatVND(totalOutflow)} (${outflowPercent}%)</strong>
                </div>
            </div>
        `;
        container.appendChild(cardDiv);

        // Render Chart.js on the canvas
        const canvasCtx = document.getElementById(`canvas-chart-${fund.id}`);
        if (canvasCtx) {
            // Destroy existing chart instance
            if (fundDetailsChartsMap[fundId]) {
                fundDetailsChartsMap[fundId].destroy();
            }

            const dataValues = total > 0 ? [totalInflow, totalOutflow] : [1, 1];
            const labelValues = total > 0 ? ['Tổng thu', 'Tổng chi'] : ['Chưa có dòng tiền', 'Chưa có dòng tiền'];
            const colorValues = total > 0 ? ['#10b981', '#ef4444'] : ['#3b82f6', '#3b82f6'];

            fundDetailsChartsMap[fundId] = new Chart(canvasCtx, {
                type: 'doughnut',
                data: {
                    labels: labelValues,
                    datasets: [{
                        data: dataValues,
                        backgroundColor: colorValues,
                        borderColor: '#111827',
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    if (total === 0) return ' Chưa có giao dịch';
                                    const val = context.raw || 0;
                                    return ` ${context.label}: ${formatVND(val)}`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });
        }
    });
}

// Render Transaction List (Audit Log)
function renderTransactionList() {
    const listContainer = document.getElementById('fundTransactionList');
    if (!listContainer) return;

    const filterVal = document.getElementById('filterFundSelect')?.value || 'all';
    const filterMember = document.getElementById('filterMemberSelect')?.value || 'all';
    
    let txs = (state.fundTransactions || []).filter(t => !t.deleted_at);

    if (filterVal !== 'all') {
        txs = txs.filter(t => t.fundId === filterVal || t.fromFundId === filterVal || t.toFundId === filterVal);
    }

    if (filterMember !== 'all') {
        if (filterMember === 'husband') {
            txs = txs.filter(t => t.memberId === 'p-husband');
        } else if (filterMember === 'wife') {
            txs = txs.filter(t => t.memberId === 'p-wife');
        }
    }

    txs.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateB !== dateA) return dateB - dateA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    if (txs.length === 0) {
        listContainer.innerHTML = `
            <div class="fund-empty-state">
                <i data-lucide="history"></i>
                <p>Chưa có giao dịch nào được thực hiện trong quỹ này.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    listContainer.innerHTML = txs.map(tx => {
        let badgeClass = 'transfer';
        let badgeIcon = 'arrow-left-right';
        let amountClass = 'neutral';
        let amountPrefix = '';
        let txTitle = '';
        let txMeta = '';

        const fund = state.familyFunds.find(f => f.id === tx.fundId);
        const fromFund = state.familyFunds.find(f => f.id === tx.fromFundId);
        const toFund = state.familyFunds.find(f => f.id === tx.toFundId);
        
        let memberName = 'Khác';
        if (tx.memberId === 'p-husband') {
            memberName = 'Chồng';
        } else if (tx.memberId === 'p-wife') {
            memberName = 'Vợ';
        } else {
            const foundProfile = (state.familyProfiles || []).find(p => p.id === tx.memberId);
            if (foundProfile) {
                memberName = foundProfile.name;
            }
        }

        if (tx.type === 'contribution') {
            badgeClass = 'contribution';
            badgeIcon = 'arrow-down-left';
            amountClass = 'plus';
            amountPrefix = '+';
            txTitle = `${memberName} đóng lương vào Quỹ`;
            txMeta = `<span>Nạp: ${escapeHTML(fund ? fund.name : '')}</span>`;
        } 
        else if (tx.type === 'external_income') {
            badgeClass = 'contribution';
            badgeIcon = 'wallet-cards';
            amountClass = 'plus';
            amountPrefix = '+';
            txTitle = `${memberName} nạp trực tiếp vào Quỹ`;
            txMeta = `<span>Nạp: ${escapeHTML(fund ? fund.name : '')}</span>`;
        }
        else if (tx.type === 'spending') {
            badgeClass = 'spending';
            badgeIcon = 'arrow-up-right';
            amountClass = 'minus';
            amountPrefix = '-';
            txTitle = `${memberName} chi tiêu từ Quỹ`;
            txMeta = `<span>Trừ: ${escapeHTML(fund ? fund.name : '')}</span>`;
        } 
        else if (tx.type === 'investment_change') {
            const isProfit = tx.amount >= 0;
            badgeClass = isProfit ? 'profit' : 'loss';
            badgeIcon = isProfit ? 'trending-up' : 'trending-down';
            amountClass = isProfit ? 'plus' : 'minus';
            amountPrefix = isProfit ? '+' : '';
            txTitle = isProfit ? `Chốt lãi đầu tư` : `Chốt lỗ đầu tư`;
            txMeta = `<span>Quỹ: ${escapeHTML(fund ? fund.name : '')}</span>`;
        } 
        else if (tx.type === 'transfer') {
            badgeClass = 'transfer';
            badgeIcon = 'arrow-left-right';
            amountClass = 'neutral';
            txTitle = `${memberName} trích chuyển Quỹ nội bộ`;
            txMeta = `<span>Từ: ${escapeHTML(fromFund ? fromFund.name : '')} &rarr; Đến: ${escapeHTML(toFund ? toFund.name : '')}</span>`;
        }

        const deleteButton = state.viewingSharedFund ? '' : `
            <button class="tx-action-delete" data-tx-id="${tx.id}" onclick="event.stopPropagation(); deleteFundTransaction('${tx.id}')" title="Xóa giao dịch" style="display: none;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;

        return `
            <div class="fund-tx-item" onclick="toggleFundTxDelete(this)" style="cursor: pointer;">
                <div class="tx-left">
                    <div class="tx-badge ${badgeClass}">
                        <i data-lucide="${badgeIcon}" style="width: 18px; height: 18px;"></i>
                    </div>
                    <div class="tx-details">
                        <div class="tx-title">${escapeHTML(txTitle)}</div>
                        <div class="tx-meta">
                            <span><i data-lucide="calendar" style="width: 12px; height: 12px;"></i>${formatDate(tx.date)}</span>
                            ${txMeta}
                            ${tx.notes ? `<span>&bull; ${escapeHTML(tx.notes)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="tx-right">
                    <span class="tx-amount ${amountClass}">${amountPrefix}${formatVND(tx.amount)}</span>
                    ${deleteButton}
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

// Toggle delete button visibility on fund transaction click
window.toggleFundTxDelete = function(el) {
    // Hide all other delete buttons first
    document.querySelectorAll('.fund-tx-item .tx-action-delete').forEach(btn => {
        btn.style.display = 'none';
    });
    // Toggle the clicked item's delete button
    const deleteBtn = el.querySelector('.tx-action-delete');
    if (deleteBtn) {
        deleteBtn.style.display = deleteBtn.style.display === 'none' ? 'inline-flex' : 'none';
    }
};

// Handler: Add Contribution
async function handleContributionSubmit(e) {
    e.preventDefault();
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }

    const fundId = document.getElementById('contribFundSelect')?.value || 'fund-main';
    const amount = parseMoneyInput(document.getElementById('contribAmount').value);
    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền đóng góp hợp lệ!", "warning");
        return;
    }

    const memberId = document.getElementById('contribMember').value;
    const date = document.getElementById('contribDate').value || getLocalDateString();
    const notes = document.getElementById('contribNotes').value.trim();

    const tx = {
        id: 'fund-tx-' + generateId(),
        fundId: fundId,
        type: 'contribution',
        amount: amount,
        memberId: memberId,
        date: date,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.fundTransactions = state.fundTransactions || [];
    state.fundTransactions.push(tx);
    state.fundTransactionsUpdated = new Date().toISOString();

    await saveLocalState();
    
    // Webhook auto sync
    triggerGoogleSheetsSync(tx);
    
    renderFundDashboard();
    
    document.getElementById('contribAmount').value = '';
    document.getElementById('contribNotes').value = '';
    closeModal('fundContributionModal');

    showToast("Đã ghi nhận khoản đóng góp lương!");
    performSync(true);
}

// Handler: Transfer money internally between funds
async function handleTransferSubmit(e) {
    e.preventDefault();
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để chuyển tiền", "warning");
        return;
    }

    const fromFundId = document.getElementById('transferFromFund').value;
    const toFundId = document.getElementById('transferToFund').value;
    const amount = parseMoneyInput(document.getElementById('transferAmount').value);
    const date = document.getElementById('transferDate').value || getLocalDateString();
    const notes = document.getElementById('transferNotes').value.trim();

    if (fromFundId === toFundId) {
        showToast("Không thể chuyển tiền đến cùng một quỹ!", "warning");
        return;
    }

    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền chuyển hợp lệ!", "warning");
        return;
    }

    calculateFundBalances();
    const fromFund = state.familyFunds.find(f => f.id === fromFundId);
    if (fromFund && fromFund.balance < amount) {
        if (!await window.showConfirm(`Quỹ nguồn không đủ số dư (Hiện có: ${formatVND(fromFund.balance)}). Bạn vẫn muốn chuyển âm?`)) {
            return;
        }
    }

    let memberId = 'p-husband';
    if (state.viewingSharedFund) {
        memberId = 'p-wife';
    } else if (state.spouseEmail) {
        memberId = 'p-husband';
    }

    const tx = {
        id: 'fund-tx-' + generateId(),
        fromFundId: fromFundId,
        toFundId: toFundId,
        type: 'transfer',
        amount: amount,
        memberId: memberId,
        date: date,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.fundTransactions = state.fundTransactions || [];
    state.fundTransactions.push(tx);
    state.fundTransactionsUpdated = new Date().toISOString();

    await saveLocalState();
    
    // Webhook auto sync
    triggerGoogleSheetsSync(tx);
    
    renderFundDashboard();

    document.getElementById('transferAmount').value = '';
    document.getElementById('transferNotes').value = '';
    closeModal('fundTransferModal');

    showToast("Đã trích chuyển quỹ thành công!");
    performSync(true);
    performSync(true);
}

// Handler: Ghi nhận chi tiêu từ quỹ chi tiêu
async function handleSpendingSubmit(e) {
    e.preventDefault();
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }

    const fundId = document.getElementById('spendingFundSelect').value;
    const amount = parseMoneyInput(document.getElementById('spendingAmount').value);
    const date = document.getElementById('spendingDate').value || getLocalDateString();
    const notes = document.getElementById('spendingNotes').value.trim();

    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền chi tiêu hợp lệ!", "warning");
        return;
    }

    let memberId = 'p-husband';
    if (state.viewingSharedFund) {
        memberId = 'p-wife';
    } else if (state.spouseEmail) {
        memberId = 'p-husband';
    }

    const tx = {
        id: 'fund-tx-' + generateId(),
        fundId: fundId,
        type: 'spending',
        amount: amount,
        memberId: memberId,
        date: date,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.fundTransactions = state.fundTransactions || [];
    state.fundTransactions.push(tx);
    state.fundTransactionsUpdated = new Date().toISOString();

    // Check if external sync is checked
    const syncExternal = document.getElementById('spendingSyncExternal')?.checked || false;
    let syncedToExternal = false;
    
    if (syncExternal) {
        const extName = document.getElementById('spendingExternalName')?.value.trim();
        const extRelationship = document.getElementById('spendingExternalRelationship')?.value || 'Khác';
        const extAddress = document.getElementById('spendingExternalAddress')?.value.trim() || '';
        const extEventType = document.getElementById('spendingEventType')?.value || 'none';
        
        if (extName && extEventType !== 'none') {
            const externalRecord = {
                id: 'sent-' + generateId(),
                name: extName,
                event_type: extEventType,
                relationship: extRelationship,
                gift_type: 'money',
                amount: amount,
                gold_amount: 0,
                gold_type: '',
                date: date,
                notes: notes,
                address: extAddress,
                updated_at: new Date().toISOString()
            };
            
            state.sentGifts = state.sentGifts || [];
            state.sentGifts.push(externalRecord);
            syncedToExternal = true;
        }
    }

    await saveLocalState();
    
    // Webhook auto sync
    triggerGoogleSheetsSync(tx);
    
    renderFundDashboard();

    // Reset inputs
    document.getElementById('spendingAmount').value = '';
    document.getElementById('spendingNotes').value = '';
    const extNameInput = document.getElementById('spendingExternalName');
    if (extNameInput) extNameInput.value = '';
    const extAddressInput = document.getElementById('spendingExternalAddress');
    if (extAddressInput) extAddressInput.value = '';
    const extRelationshipInput = document.getElementById('spendingExternalRelationship');
    if (extRelationshipInput) extRelationshipInput.value = 'Khác';
    const spendingSyncExternalCheckbox = document.getElementById('spendingSyncExternal');
    if (spendingSyncExternalCheckbox) spendingSyncExternalCheckbox.checked = false;

    closeModal('fundSpendingModal');
    showToast("Đã ghi nhận giao dịch chi tiêu!");

    if (state.viewingSharedFund) {
        // Sync to Husband's shared fund row
        await performSync(true);
        
        // Sync Wife's own personal data (if she synced to her external transactions)
        if (syncedToExternal) {
            state.viewingSharedFund = false;
            await performSync(true); // Writes to Wife's own sync row
            state.viewingSharedFund = true;
        }
    } else {
        // Sync to own account row
        performSync(true);
    }
}

// Handler: Chốt đầu tư (Lãi/Lỗ)
async function handleInvestSubmit(e) {
    e.preventDefault();
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }

    const fundId = document.getElementById('investFundSelect').value;
    const type = document.getElementById('investTypeSelect').value;
    let amount = parseMoneyInput(document.getElementById('investAmount').value);
    const date = document.getElementById('investDate').value || getLocalDateString();
    const notes = document.getElementById('investNotes').value.trim();

    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền chênh lệch hợp lệ!", "warning");
        return;
    }

    if (type === 'loss') {
        amount = -amount;
    }

    const tx = {
        id: 'fund-tx-' + generateId(),
        fundId: fundId,
        type: 'investment_change',
        amount: amount,
        date: date,
        notes: notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    state.fundTransactions = state.fundTransactions || [];
    state.fundTransactions.push(tx);
    state.fundTransactionsUpdated = new Date().toISOString();

    await saveLocalState();
    
    // Webhook auto sync
    triggerGoogleSheetsSync(tx);
    
    renderFundDashboard();

    document.getElementById('investAmount').value = '';
    document.getElementById('investNotes').value = '';
    closeModal('fundInvestModal');

    showToast(type === 'profit' ? "Đã ghi nhận khoản lãi đầu tư!" : "Đã ghi nhận khoản lỗ đầu tư!");
    performSync(true);
}

// Export Delete function globally
window.deleteFundTransaction = async function(id) {
    if (state.viewingSharedFund) return;
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để xóa thông tin", "warning");
        return;
    }

    if (!await window.showConfirm("Bạn có chắc chắn muốn xóa giao dịch này? Số dư các quỹ sẽ tự động tính toán lại.")) return;

    const index = (state.fundTransactions || []).findIndex(t => t.id === id);
    if (index === -1) return;

    const deletedTx = state.fundTransactions[index];

    state.fundTransactions[index] = {
        ...state.fundTransactions[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    state.fundTransactionsUpdated = new Date().toISOString();

    await saveLocalState();
    
    // Webhook auto sync deletion
    triggerGoogleSheetsSync(deletedTx, true);
    
    renderFundDashboard();

    showToast("Đã xóa giao dịch thành công!");
    performSync(true);
};

// Open Specific fund modals from UI buttons
window.openFundActionModal = function(action, targetFundId = '') {
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản trước", "warning");
        return;
    }

    if (action === 'contribution') {
        document.getElementById('contribDate').value = getLocalDateString();
        if (targetFundId) {
            const selectEl = document.getElementById('contribFundSelect');
            if (selectEl) selectEl.value = targetFundId;
        }
        document.getElementById('fundContributionModal').classList.add('active');
    } 
    else if (action === 'transfer') {
        document.getElementById('transferDate').value = getLocalDateString();
        if (targetFundId) {
            document.getElementById('transferFromFund').value = targetFundId;
        }
        document.getElementById('fundTransferModal').classList.add('active');
    } 
    else if (action === 'spending') {
        document.getElementById('spendingDate').value = getLocalDateString();
        if (targetFundId) {
            document.getElementById('spendingFundSelect').value = targetFundId;
        }
        
        // Reset Event type and external details
        const spendingEventType = document.getElementById('spendingEventType');
        if (spendingEventType) spendingEventType.value = 'none';
        const spendingSyncExternalGroup = document.getElementById('spendingSyncExternalGroup');
        if (spendingSyncExternalGroup) spendingSyncExternalGroup.style.display = 'none';
        const spendingSyncExternal = document.getElementById('spendingSyncExternal');
        if (spendingSyncExternal) spendingSyncExternal.checked = false;
        const spendingExternalDetails = document.getElementById('spendingExternalDetails');
        if (spendingExternalDetails) spendingExternalDetails.style.display = 'none';
        
        document.getElementById('fundSpendingModal').classList.add('active');
    } 
    else if (action === 'invest') {
        document.getElementById('investDate').value = getLocalDateString();
        if (targetFundId) {
            document.getElementById('investFundSelect').value = targetFundId;
        }
        document.getElementById('fundInvestModal').classList.add('active');
    }
};


// Render management tab elements (Linked to tab-fund-management view)
export function renderManagementTab() {
    const isGuest = state.viewingSharedFund;
    const addFundBlock = document.getElementById('mgmtAddCustomFundBlock');
    if (addFundBlock) {
        addFundBlock.style.display = isGuest ? 'none' : 'flex';
    }

    const spouseEmailForm = document.getElementById('fundSpouseEmailForm');
    const spouseLinkSharedView = document.getElementById('spouseLinkSharedView');
    const spouseLinkOwnerName = document.getElementById('spouseLinkOwnerName');

    if (isGuest) {
        if (spouseEmailForm) spouseEmailForm.style.display = 'none';
        if (spouseLinkSharedView) spouseLinkSharedView.style.display = 'flex';
        if (spouseLinkOwnerName) {
            spouseLinkOwnerName.innerText = state.ownerNickname || state.sharedFundOwnerEmail;
        }
        // Ẩn mô tả liên kết cho thành viên đã tham gia
        const spouseDesc = document.getElementById('spouseLinkDescription');
        if (spouseDesc) spouseDesc.style.display = 'none';
    } else {
        if (spouseEmailForm) spouseEmailForm.style.display = 'flex';
        if (spouseLinkSharedView) spouseLinkSharedView.style.display = 'none';
        // Hiển thị lại mô tả và xuất cho chủ quỹ
        const spouseDesc = document.getElementById('spouseLinkDescription');
        if (spouseDesc) spouseDesc.style.display = 'block';

        const emailInput = document.getElementById('spouseEmailInput');
        const roleInput = document.getElementById('spouseRoleInput');
        const nicknameInput = document.getElementById('ownerNicknameInput');
        const unlinkBtn = document.getElementById('btnUnlinkSpouse');
        const reinviteBtn = document.getElementById('btnReinviteSpouse');
        const saveBtn = document.getElementById('btnSaveSpouseLink');
        const statusText = document.getElementById('spouseInviteStatusText');

        if (emailInput) {
            emailInput.value = state.spouseEmail || '';
            emailInput.disabled = !!state.spouseEmail;
        }
        if (roleInput) {
            roleInput.value = state.spouseRole || 'wife';
            roleInput.disabled = !!state.spouseEmail;
        }
        if (nicknameInput) {
            nicknameInput.value = state.ownerNickname || '';
            nicknameInput.disabled = !!state.spouseEmail;
        }
        
        const statusBadge = document.getElementById('spouseInviteStatusBadge');
        if (state.spouseEmail) {
            if (statusBadge) {
                statusBadge.style.display = 'inline-block';
                let statusValText = 'Đang chờ duyệt';
                let badgeStyle = 'background: rgba(245, 158, 11, 0.15); color: #fbbf24;';
                
                if (state.spouseStatus === 'accepted') {
                    statusValText = 'Đã chấp nhận';
                    badgeStyle = 'background: rgba(16, 185, 129, 0.15); color: #34d399;';
                } else if (state.spouseStatus === 'declined') {
                    statusValText = 'Đã từ chối';
                    badgeStyle = 'background: rgba(239, 68, 68, 0.15); color: #f87171;';
                }
                
                statusBadge.innerText = statusValText;
                statusBadge.style.cssText = `font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 12px; ${badgeStyle}`;
            }
        } else {
            if (statusBadge) statusBadge.style.display = 'none';
        }

        if (state.spouseEmail && state.spouseStatus === 'declined') {
            if (statusText) statusText.style.display = 'block';
            if (reinviteBtn) reinviteBtn.style.display = 'inline-block';
            if (unlinkBtn) unlinkBtn.style.display = 'inline-block';
            if (saveBtn) saveBtn.style.display = 'none';
        } else {
            if (statusText) statusText.style.display = 'none';
            if (reinviteBtn) reinviteBtn.style.display = 'none';
            if (unlinkBtn) {
                // Cho phép chủ quỹ luôn luôn thấy nút hủy liên kết nếu đã điền email
                unlinkBtn.style.display = state.spouseEmail ? 'inline-block' : 'none';
            }
            if (saveBtn) {
                saveBtn.style.display = state.spouseEmail ? 'none' : 'inline-block';
            }
        }
    }

    // 2. Google Sheets Webhook Url
    const sheetsBlock = document.getElementById('mgmtGoogleSheetsBlock');
    if (sheetsBlock) {
        sheetsBlock.style.display = state.viewingSharedFund ? 'none' : 'flex';
    }
    const sheetsInput = document.getElementById('googleSheetsWebhookInput');
    if (sheetsInput) {
        sheetsInput.value = state.googleSheetsWebhook || '';
    }

    // 3. Custom funds list with edit button
    const mgmtList = document.getElementById('mgmtCustomFundsList');
    if (!mgmtList) return;

    const funds = state.familyFunds || [];
    if (funds.length === 0) {
        mgmtList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding: 8px 0;">Chưa có quỹ nào.</div>`;
        return;
    }

    mgmtList.innerHTML = funds.map(f => {
        const isActiveChart = (state.activeChartFundIds || ['fund-main']).includes(f.id);
        
        return `
            <div class="mgmt-fund-item" style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; font-size:0.85rem; margin-bottom:6px;">
                <span class="fund-name" style="font-weight: 500;">${escapeHTML(f.name)} (${f.type === 'main' ? 'Quỹ chính' : (f.type === 'spending' ? 'Chi tiêu' : (f.type === 'investment' ? 'Đầu tư' : 'Tùy chỉnh'))})</span>
                <div class="fund-actions" style="display:flex; align-items:center; gap:10px;">
                    ${isActiveChart ? `<span style="font-size: 0.7rem; background: rgba(2, 132, 199, 0.15); color: var(--accent-blue); padding: 2px 6px; border-radius: 4px; font-weight: 600;">Biểu đồ</span>` : ''}
                    <span class="fund-balance" style="font-weight:700; color:var(--accent-emerald);">${formatVND(f.balance)}</span>
                    ${!state.viewingSharedFund ? `
                        <button type="button" class="health-btn health-btn-outline" onclick="openFundEditModal('${f.id}')" style="padding: 4px 10px; font-size: 0.75rem; border-radius: 6px; display: flex; align-items: center; gap: 4px; height: 28px;">
                            <i data-lucide="edit-3" style="width: 12px; height: 12px;"></i> Chỉnh sửa
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // 4. Populate diagnostics local state fields
    const diagRole = document.getElementById('diagRole');
    if (diagRole) {
        diagRole.textContent = state.viewingSharedFund ? 'Thành viên (Vợ/Chồng)' : 'Chủ nhóm (Người tạo)';
    }
    const diagSpouseStatus = document.getElementById('diagSpouseStatus');
    if (diagSpouseStatus) {
        if (state.viewingSharedFund) {
            diagSpouseStatus.textContent = state.familyFundInviteStatus || 'Chưa liên kết';
        } else {
            diagSpouseStatus.textContent = state.spouseStatus || 'Chưa liên kết';
        }
    }
    const diagRsaKey = document.getElementById('diagRsaKey');
    if (diagRsaKey) {
        diagRsaKey.textContent = state.asymmetricPublicKey ? 'Đã tạo (Hợp lệ)' : 'Chưa tạo';
    }
    const diagFundKey = document.getElementById('diagFundKey');
    if (diagFundKey) {
        diagFundKey.textContent = state.fundSymmetricKey ? 'Đã tạo (Hợp lệ)' : 'Chưa tạo';
    }

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

// Open Edit Fund Modal
window.openFundEditModal = function(fundId) {
    if (state.viewingSharedFund) return;
    const fund = state.familyFunds.find(f => f.id === fundId);
    if (!fund) return;
    
    document.getElementById('editFundId').value = fund.id;
    document.getElementById('editFundName').value = fund.name;
    
    const isCustom = fund.type === 'custom';
    const showChartCheckbox = document.getElementById('editFundShowChart');
    const activeIds = state.activeChartFundIds || ['fund-main'];
    showChartCheckbox.checked = activeIds.includes(fund.id);

    const hasContribCheckbox = document.getElementById('editFundHasContribution');
    const hasContribContainer = document.getElementById('editFundHasContributionContainer');
    if (hasContribCheckbox) {
        hasContribCheckbox.checked = !!fund.hasContribution;
    }
    if (hasContribContainer) {
        if (fund.id === 'fund-main') {
            hasContribContainer.style.display = 'none';
        } else {
            hasContribContainer.style.display = 'flex';
        }
    }
    
    // Only custom funds can be renamed
    document.getElementById('editFundName').disabled = !isCustom;
    
    // Only custom funds with 0 balance can be deleted
    const deleteContainer = document.getElementById('editFundDeleteContainer');
    if (isCustom && fund.balance === 0) {
        deleteContainer.style.display = 'block';
        const btnDelete = document.getElementById('btnDeleteFundFromEdit');
        btnDelete.onclick = () => {
            closeModal('fundEditModal');
            deleteCustomFund(fund.id);
        };
    } else {
        deleteContainer.style.display = 'none';
    }
    
    document.getElementById('fundEditModal').classList.add('active');
    lucide.createIcons();
};

// Handle edit fund submission
async function handleFundEditSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) return;
    
    const fundId = document.getElementById('editFundId').value;
    const name = document.getElementById('editFundName').value.trim();
    const showChart = document.getElementById('editFundShowChart').checked;
    const hasContrib = document.getElementById('editFundHasContribution')?.checked || false;
    
    const fund = state.familyFunds.find(f => f.id === fundId);
    if (!fund) return;
    
    if (fund.type === 'custom' && name) {
        // Check duplicates
        const isDup = state.familyFunds.some(f => f.id !== fundId && f.name.toLowerCase() === name.toLowerCase());
        if (isDup) {
            showToast("Tên quỹ này đã tồn tại!", "warning");
            return;
        }
        fund.name = name;
    }

    if (fundId !== 'fund-main') {
        fund.hasContribution = hasContrib;
    }
    
    // Update activeChartFundIds
    let activeIds = state.activeChartFundIds || ['fund-main'];
    if (showChart) {
        if (!activeIds.includes(fundId)) {
            activeIds.push(fundId);
        }
    } else {
        activeIds = activeIds.filter(id => id !== fundId);
    }
    state.activeChartFundIds = activeIds;
    state.familyFundsUpdated = new Date().toISOString();
    
    await saveLocalState();
    closeModal('fundEditModal');
    renderManagementTab();
    showToast("Đã lưu thay đổi quỹ thành công!");
    performSync(true);
}

// Leave Spouse Fund (Spouse's action)
async function handleLeaveSpouseFund() {
    if (!state.viewingSharedFund) return;
    
    const confirmPassword = await window.showPrompt("Để thoát khỏi nhóm gia đình, vui lòng xác nhận mật khẩu Master:");
    if (confirmPassword === null) return;
    
    if (confirmPassword !== state.masterPassword) {
        showToast("Mật khẩu Master không chính xác. Hủy bỏ thoát nhóm!", "error");
        return;
    }

    // Try to update husband's row on Supabase to notify him
    if (state.sharedFundSourceRow && state.sharedFundSourceRow.user_id) {
        try {
            const parsed = JSON.parse(state.sharedFundSourceRow.encrypted_data);
            if (parsed && parsed.is_hybrid) {
                // Giữ nguyên spouse_email và fund_shared_keys để không vi phạm chính sách RLS UPDATE WITH CHECK của Supabase
                parsed.spouse_status = 'left';
                
                const updatedPayload = JSON.stringify(parsed);
                const supabaseClient = sync.getSupabase();
                if (supabaseClient) {
                    await supabaseClient
                        .from('gift_sync')
                        .update({
                            encrypted_data: updatedPayload,
                            updated_at: new Date().toISOString()
                        })
                        .eq('user_id', state.sharedFundSourceRow.user_id);
                }
            }
        } catch (updateErr) {
            console.error("Failed to notify husband of leaving group:", updateErr);
        }
    }

    // Reset all shared states
    state.viewingSharedFund = false;
    state.sharedFundOwnerEmail = '';
    state.spouseEmail = '';
    state.spouseRole = 'wife';
    state.ownerNickname = '';
    state.familyFunds = [];
    state.fundTransactions = [];
    state.fundSymmetricKey = '';
    state.familyFundInviteStatus = 'declined';
    state.familyFundInviteStatusUpdated = new Date().toISOString();
    state.sharedFundSourceRow = null;

    await saveLocalState();
    showToast("Đã thoát khỏi nhóm gia đình thành công!");
    
    if (typeof window.switchTab === 'function') {
        window.switchTab('fund');
    }
    
    performSync(true);
}

// Google Sheets Webhook submit
async function handleGoogleSheetsSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) {
        showToast("Đang ở chế độ xem tài khoản liên kết, không thể sửa cài đặt này!", "warning");
        return;
    }
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản trước", "warning");
        return;
    }

    const webhook = document.getElementById('googleSheetsWebhookInput').value.trim();
    state.googleSheetsWebhook = webhook;
    state.familyFundsUpdated = new Date().toISOString();

    await saveLocalState();
    showToast("Đã lưu Webhook đồng bộ Google Sheets thành công!");
    performSync(true);
}

// Add Custom Fund handler
async function handleAddCustomFundSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) {
        showToast("Đang ở chế độ xem tài khoản liên kết, không thể thêm quỹ!", "warning");
        return;
    }
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản trước", "warning");
        return;
    }

    const nameInput = document.getElementById('newCustomFundName').value.trim();
    if (!nameInput) return;

    // Check duplicates
    const isDup = (state.familyFunds || []).some(f => f.name.toLowerCase() === nameInput.toLowerCase());
    if (isDup) {
        showToast("Tên quỹ này đã tồn tại!", "warning");
        return;
    }

    const newFund = {
        id: 'fund-custom-' + generateId(),
        name: nameInput,
        type: 'custom',
        balance: 0,
        hasContribution: false
    };

    state.familyFunds = state.familyFunds || [];
    state.familyFunds.push(newFund);
    state.familyFundsUpdated = new Date().toISOString();

    await saveLocalState();
    
    // Reset input
    document.getElementById('newCustomFundName').value = '';
    
    renderManagementTab();
    showToast(`Đã thêm quỹ "${nameInput}" thành công!`);
    performSync(true);
}

// Delete Custom Fund
async function deleteCustomFund(fundId) {
    if (state.viewingSharedFund) return;
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản trước", "warning");
        return;
    }

    const fund = state.familyFunds.find(f => f.id === fundId);
    if (!fund || fund.type !== 'custom') return;

    if (fund.balance !== 0) {
        showToast("Không thể xóa quỹ đang có số dư khác 0!", "warning");
        return;
    }

    if (!await window.showConfirm(`Bạn có chắc chắn muốn xóa quỹ "${fund.name}"?`)) return;

    state.familyFunds = state.familyFunds.filter(f => f.id !== fundId);
    state.familyFundsUpdated = new Date().toISOString();

    // Remove from activeChartFundIds if deleted
    if (state.activeChartFundIds) {
        state.activeChartFundIds = state.activeChartFundIds.filter(id => id !== fundId);
    }

    await saveLocalState();
    
    renderManagementTab();
    showToast("Đã xóa quỹ thành công!");
    performSync(true);
}

// Export to Google Sheet (Excel download)
function handleExportFundExcel() {
    try {
        const wb = XLSX.utils.book_new();

        // Sheet 1: Tổng quan các quỹ
        const fundsData = (state.familyFunds || []).map((f, idx) => ({
            "STT": idx + 1,
            "Tên Quỹ": f.name,
            "Loại Quỹ": f.type === 'main' ? 'Quỹ chính' : (f.type === 'spending' ? 'Chi tiêu' : (f.type === 'investment' ? 'Đầu tư' : 'Tùy chỉnh')),
            "Số Dư Hiện Tại (VND)": f.balance
        }));
        const wsFunds = XLSX.utils.json_to_sheet(fundsData);
        XLSX.utils.book_append_sheet(wb, wsFunds, "Tổng quan các quỹ");

        // Sheet 2: Nhật ký giao dịch
        let txs = (state.fundTransactions || []).filter(t => !t.deleted_at);
        txs.sort((a, b) => new Date(b.date) - new Date(a.date));

        const txsData = txs.map((tx, idx) => {
            let txType = 'Giao dịch khác';
            let fundName = '';
            let amountVal = tx.amount || 0;

            const fund = state.familyFunds.find(f => f.id === tx.fundId);
            const fromFund = state.familyFunds.find(f => f.id === tx.fromFundId);
            const toFund = state.familyFunds.find(f => f.id === tx.toFundId);

            let memberName = 'Khác';
            if (tx.memberId === 'p-husband') {
                memberName = 'Chồng';
            } else if (tx.memberId === 'p-wife') {
                memberName = 'Vợ';
            } else {
                const foundProfile = (state.familyProfiles || []).find(p => p.id === tx.memberId);
                if (foundProfile) memberName = foundProfile.name;
            }

            if (tx.type === 'contribution') {
                txType = 'Đóng góp lương';
                fundName = fund ? fund.name : '';
            } else if (tx.type === 'external_income') {
                txType = 'Nạp tiền trực tiếp';
                fundName = fund ? fund.name : '';
            } else if (tx.type === 'spending') {
                txType = 'Chi tiêu từ quỹ';
                fundName = fund ? fund.name : '';
                amountVal = -amountVal;
            } else if (tx.type === 'investment_change') {
                txType = tx.amount >= 0 ? 'Đầu tư chốt lãi' : 'Đầu tư chốt lỗ';
                fundName = fund ? fund.name : '';
            } else if (tx.type === 'transfer') {
                txType = 'Trích chuyển quỹ';
                fundName = `${fromFund ? fromFund.name : ''} -> ${toFund ? toFund.name : ''}`;
            }

            return {
                "STT": idx + 1,
                "Ngày giao dịch": tx.date,
                "Người thực hiện": memberName,
                "Loại giao dịch": txType,
                "Quỹ liên quan": fundName,
                "Số tiền (VND)": amountVal,
                "Ghi chú": tx.notes || ''
            };
        });
        const wsTxs = XLSX.utils.json_to_sheet(txsData);
        XLSX.utils.book_append_sheet(wb, wsTxs, "Nhật ký giao dịch");

        const filename = `quy_gia_dinh_xuat_excel_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast("Đã xuất file Excel Quỹ gia đình thành công!");
    } catch (e) {
        console.error("Export Excel failed:", e);
        showToast("Lỗi khi xuất file Excel!", "error");
    }
}

// Render Monthly Fund cashflow column chart (Bar Chart)
let monthlyFundChartInstance = null;

export function renderMonthlyFundChart() {
    const canvas = document.getElementById('monthlyFundChartCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing instance if any
    if (monthlyFundChartInstance) {
        monthlyFundChartInstance.destroy();
    }

    const fundId = document.getElementById('chartSelectFund')?.value || 'all';
    const yearSelect = document.getElementById('chartSelectYear');
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();

    // 1. Get 12 months for the selected year
    const months = [];
    for (let i = 1; i <= 12; i++) {
        months.push({
            year: selectedYear,
            month: i,
            label: `T${i}`
        });
    }

    // 2. Filter transactions for the selected fund and year
    let txs = (state.fundTransactions || []).filter(t => !t.deleted_at);
    if (fundId !== 'all') {
        txs = txs.filter(t => t.fundId === fundId || t.fromFundId === fundId || t.toFundId === fundId);
    }
    txs = txs.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getFullYear() === selectedYear;
    });

    // 3. Calculate monthly inflow and outflow
    const inflows = new Array(12).fill(0);
    const outflows = new Array(12).fill(0);

    txs.forEach(tx => {
        const txDate = new Date(tx.date);
        const txMonth = txDate.getMonth() + 1;

        const amount = Math.abs(tx.amount || 0);

        if (tx.type === 'contribution' || tx.type === 'external_income') {
            inflows[txMonth - 1] += amount;
        } 
        else if (tx.type === 'spending') {
            outflows[txMonth - 1] += amount;
        } 
        else if (tx.type === 'investment_change') {
            if (tx.amount >= 0) {
                inflows[txMonth - 1] += amount;
            } else {
                outflows[txMonth - 1] += amount;
            }
        } 
        else if (tx.type === 'transfer') {
            if (fundId !== 'all') {
                if (tx.toFundId === fundId) {
                    inflows[txMonth - 1] += amount;
                } else if (tx.fromFundId === fundId) {
                    outflows[txMonth - 1] += amount;
                }
            }
        }
    });

    // 4. Render chart
    monthlyFundChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                {
                    label: 'Tổng thu',
                    data: inflows,
                    backgroundColor: '#10b981',
                    borderRadius: 4,
                    barThickness: 8
                },
                {
                    label: 'Tổng chi',
                    data: outflows,
                    backgroundColor: '#ef4444',
                    borderRadius: 4,
                    barThickness: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: state.theme === 'dark' ? '#9ca3af' : '#4b5563',
                        font: { size: 10 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatVND(context.raw)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: state.theme === 'dark' ? '#9ca3af' : '#4b5563',
                        font: { size: 10 }
                    },
                    title: {
                        display: true,
                        text: `Năm ${selectedYear} ➔`,
                        color: state.theme === 'dark' ? '#9ca3af' : '#4b5563',
                        font: { size: 10, weight: 'bold' },
                        align: 'end'
                    }
                },
                y: {
                    grid: {
                        color: state.theme === 'dark' ? '#1f2937' : '#e5e7eb'
                    },
                    ticks: {
                        color: state.theme === 'dark' ? '#9ca3af' : '#4b5563',
                        font: { size: 10 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000) + 'M';
                            if (value >= 1000) return (value / 1000) + 'K';
                            return value;
                        }
                    }
                }
            }
        }
    });
}

// Render Fund History (Nhật ký) Tab
export function renderFundHistoryTab() {
    populateFundSelects();
    renderTransactionList();
}

// Run E2EE and Connection Diagnostics
async function runFundDiagnostics() {
    const logsEl = document.getElementById('diagLogs');
    if (!logsEl) return;
    
    logsEl.style.display = 'block';
    logsEl.innerHTML = '';
    
    function log(msg, type = 'info') {
        const span = document.createElement('div');
        span.style.marginBottom = '4px';
        if (type === 'error') {
            span.style.color = '#ef4444';
            span.innerHTML = `❌ ${msg}`;
        } else if (type === 'success') {
            span.style.color = '#4ade80';
            span.innerHTML = `✅ ${msg}`;
        } else if (type === 'warn') {
            span.style.color = '#fbbf24';
            span.innerHTML = `⚠️ ${msg}`;
        } else {
            span.style.color = '#a3e635';
            span.innerHTML = `⚙️ ${msg}`;
        }
        logsEl.appendChild(span);
        logsEl.scrollTop = logsEl.scrollHeight;
    }
    
    log("Khởi động chẩn đoán kết nối bảo mật...");
    
    const supabaseClient = sync.getSupabase();
    if (!supabaseClient) {
        log("Supabase client chưa được khởi tạo! Vui lòng vào Cài đặt để cấu hình.", "error");
        log("CHẨN ĐOÁN: Bạn chưa điền URL/Anon Key kết nối Supabase, hãy vào Cài đặt thiết lập để sử dụng.", "warn");
        return;
    }
    
    const user = state.user;
    if (!user) {
        log("Bạn chưa đăng nhập Supabase! Vui lòng vào Cài đặt và thực hiện đăng nhập.", "error");
        log("CHẨN ĐOÁN: Cần đăng nhập tài khoản đám mây để kiểm tra liên kết.", "warn");
        return;
    }
    
    log(`Đang chạy với tài khoản: ${user.email}`, "info");
    
    try {
        log("Đang tải dữ liệu đồng bộ thô từ đám mây (Supabase)...");
        const { data: myRecord, error: fetchErr } = await supabaseClient
            .from('gift_sync')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();
            
        if (fetchErr) {
            log(`Không thể tải dữ liệu của bạn: ${fetchErr.message}`, "error");
            return;
        }
        
        if (!myRecord) {
            log("Chưa tìm thấy dòng dữ liệu đồng bộ nào của bạn trên máy chủ. Bạn cần nhấn 'Đồng bộ ngay' trong Cài đặt một lần.", "warn");
        } else {
            log("Đã tìm thấy dòng dữ liệu đồng bộ của bạn trên máy chủ.", "success");
            try {
                const parsed = JSON.parse(myRecord.encrypted_data);
                log(`-> Kiểu gói tin trên Cloud: ${parsed.is_hybrid ? 'Hybrid E2EE' : 'Không mã hóa E2EE'}`, "info");
                log(`-> Email đối tác liên kết lưu trên Cloud: ${parsed.spouse_email || 'Chưa thiết lập'}`, "info");
                log(`-> Trạng thái đối tác (vỏ ngoài) trên Cloud: ${parsed.spouse_status || 'Trống'}`, "info");
            } catch (pErr) {
                log("Không thể đọc định dạng dữ liệu vỏ ngoài trên Cloud.", "error");
            }
        }
        
        // Diagnosing husband (owner) scenario
        if (!state.viewingSharedFund) {
            log("Chẩn đoán theo kịch bản: CHỦ NHÓM QUỸ (Chồng/Người mời)", "info");
            
            const partnerEmail = state.spouseEmail;
            if (!partnerEmail) {
                log("Bạn chưa nhập email Vợ/Chồng để gửi lời mời.", "warn");
                log("CHẨN ĐOÁN: Vui lòng nhập email Vợ/Chồng ở khung bên trái và bấm Gửi lời mời.", "warn");
                return;
            }
            
            log(`Đối tác đã mời: ${partnerEmail}. Đang tìm khóa công khai của đối tác...`);
            
            const { data: partnerRecords, error: partnerErr } = await supabaseClient
                .from('gift_sync')
                .select('encrypted_data, public_key')
                .ilike('user_email', partnerEmail.trim());
                
            if (partnerErr) {
                log(`Lỗi khi tìm tài khoản đối tác: ${partnerErr.message}`, "error");
                return;
            }
            
            if (!partnerRecords || partnerRecords.length === 0) {
                log(`Không tìm thấy tài khoản đối tác (${partnerEmail}) trên máy chủ. Đối tác cần đăng nhập và đồng bộ app FamiLife trước.`, "error");
                log(`CHẨN ĐOÁN: Yêu cầu đối tác đăng nhập app bằng email ${partnerEmail} và kết nối Supabase thành công.`, "warn");
                return;
            }
            
            log(`Tìm thấy tài khoản đối tác trên máy chủ.`, "success");
            const partnerRow = partnerRecords[0];
            const partnerPubKey = partnerRow.public_key;
            
            if (!partnerPubKey) {
                log(`Đối tác đã đăng nhập nhưng chưa tạo Cặp khóa bảo mật RSA.`, "error");
                log("CHẨN ĐOÁN: Yêu cầu đối tác mở ứng dụng FamiLife trên máy của họ một lần để tự động kích hoạt tạo khóa bảo mật.", "warn");
                return;
            }
            log(`Đã tìm thấy khóa công khai của đối tác.`, "success");
            
            // Check shared keys
            if (myRecord) {
                try {
                    const parsed = JSON.parse(myRecord.encrypted_data);
                    const sharedKeys = parsed.fund_shared_keys || {};
                    const normPartnerEmail = partnerEmail.toLowerCase().trim();
                    const hasKey = !!sharedKeys[normPartnerEmail];
                    
                    if (hasKey) {
                        log(`Khóa Quỹ chung đã được mã hóa chia sẻ cho đối tác thành công.`, "success");
                        
                        if (parsed.spouse_status === 'accepted') {
                            log("Đối tác đã chấp nhận trên Cloud.", "success");
                            log("CHẨN ĐOÁN: Mọi thiết lập E2EE hoàn toàn bình thường. Nếu UI vẫn chưa cập nhật, hãy nhấn 'Đồng bộ ngay' trong Cài đặt ở máy Chồng để nạp dữ liệu mới nhất.", "success");
                        } else {
                            log(`Trạng thái lời mời hiện tại là: ${parsed.spouse_status || 'pending'} (Chờ duyệt)`, "warn");
                            log("CHẨN ĐOÁN: Đang chờ đối tác bấm nút 'Tham gia' từ banner lời mời ở màn hình chính phía máy đối tác. Hãy chắc chắn đối tác đã mở app và chấp nhận lời mời.", "warn");
                        }
                    } else {
                        log(`Chưa chia sẻ khóa Quỹ cho đối tác.`, "warn");
                        log("CHẨN ĐOÁN: Người chồng cần nhấn 'Đồng bộ ngay' trong Cài đặt để tự động mã hóa khóa Quỹ gửi sang cho đối tác.", "warn");
                    }
                } catch (e) {
                    log("Lỗi phân tích gói tin chia sẻ khóa.", "error");
                }
            } else {
                log("CHẨN ĐOÁN: Hãy đồng bộ dữ liệu ít nhất một lần để khởi tạo Quỹ chung và chia sẻ.", "warn");
            }
        }
        // Diagnosing wife (joined member) scenario
        else {
            log("Chẩn đoán theo kịch bản: THÀNH VIÊN THAM GIA (Vợ/Khách)", "info");
            
            const ownerEmail = state.sharedFundOwnerEmail;
            if (!ownerEmail) {
                log("Không tìm thấy thông tin email chủ quỹ.", "error");
                return;
            }
            
            log(`Chủ quỹ: ${ownerEmail}. Đang kiểm tra dữ liệu của chủ quỹ...`);
            
            const { data: ownerRecords, error: ownerErr } = await supabaseClient
                .from('gift_sync')
                .select('*')
                .ilike('user_email', ownerEmail.trim());
                
            if (ownerErr) {
                log(`Lỗi tải dữ liệu chủ quỹ: ${ownerErr.message}`, "error");
                return;
            }
            
            if (!ownerRecords || ownerRecords.length === 0) {
                log("Không tìm thấy dòng dữ liệu của chủ quỹ trên máy chủ.", "error");
                return;
            }
            
            const ownerRow = ownerRecords[0];
            log("Tải dữ liệu chủ quỹ thành công.", "success");
            
            try {
                const parsed = JSON.parse(ownerRow.encrypted_data);
                const spouseEmailOnCloud = (parsed.spouse_email || '').toLowerCase().trim();
                const myEmail = user.email.toLowerCase().trim();
                
                if (spouseEmailOnCloud !== myEmail) {
                    log(`Chủ quỹ đang liên kết với email khác trên Cloud: ${parsed.spouse_email}`, "error");
                    log(`CHẨN ĐOÁN: Yêu cầu Chồng hủy liên kết và mời lại chính xác địa chỉ email của bạn (${user.email}).`, "warn");
                    return;
                }
                
                log("Email của bạn khớp hoàn toàn với lời mời của Chồng trên máy chủ.", "success");
                
                const sharedKeys = parsed.fund_shared_keys || {};
                const hasMyKey = !!sharedKeys[myEmail];
                
                if (hasMyKey) {
                    log("Chủ quỹ đã chia sẻ khóa giải mã Quỹ cho bạn.", "success");
                    log(`Trạng thái lời mời của bạn ghi nhận bên Chồng: ${parsed.spouse_status}`, "info");
                    
                    if (state.familyFundInviteStatus === 'accepted') {
                        log("Trạng thái lời mời ở máy bạn đã được chấp nhận cục bộ.", "success");
                        log("CHẨN ĐOÁN: Liên kết hoạt động bình thường. Bạn có quyền xem và nhập giao dịch vào Quỹ chung.", "success");
                    } else {
                        log("CHẨN ĐOÁN: Bạn cần bấm nút 'Tham gia' từ Banner lời mời xuất hiện ở trang chủ.", "warn");
                    }
                } else {
                    log("Chủ quỹ chưa tạo khóa chia sẻ dành cho bạn.", "error");
                    log("CHẨN ĐOÁN: Yêu cầu người Chồng mở ứng dụng FamiLife và bấm 'Đồng bộ ngay' trong Cài đặt để tạo khóa chia sẻ cho bạn.", "warn");
                }
            } catch (err) {
                log("Lỗi phân tích dữ liệu của chủ quỹ.", "error");
            }
        }
    } catch (gErr) {
        log(`Quá trình chẩn đoán gặp lỗi ngoại lệ: ${gErr.message}`, "error");
    }
}
















