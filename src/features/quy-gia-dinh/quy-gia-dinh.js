// src/features/quy-gia-dinh/quy-gia-dinh.js - Family Fund Management Logic

import { 
    state, saveLocalState, showToast, performSync,
    formatDate, escapeHTML, formatVND, generateId,
    decryptWithPrivateKey, loadLocalState
} from '../../core/app.js?v=4.0.88';
import { decrypt } from '../../core/crypto.js?v=4.0.88';
import * as sync from '../../core/sync.js?v=4.0.88';

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

    // Link spouse email form
    const spouseEmailForm = document.getElementById('fundSpouseEmailForm');
    if (spouseEmailForm) {
        spouseEmailForm.addEventListener('submit', handleSpouseEmailSubmit);
    }

    const unlinkSpouseBtn = document.getElementById('btnUnlinkSpouse');
    if (unlinkSpouseBtn) {
        unlinkSpouseBtn.addEventListener('click', handleUnlinkSpouse);
    }

    const leaveSpouseBtn = document.getElementById('btnLeaveSpouseFund');
    if (leaveSpouseBtn) {
        leaveSpouseBtn.addEventListener('click', handleLeaveSpouseFund);
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
        state.viewingSharedFund = false;
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

            try {
                const parsed = JSON.parse(row.encrypted_data);
                console.log("[E2EE Debug] Processing remote row from:", parsed.owner_email || row.user_email, "shared with spouse:", parsed.spouse_email);
                
                if (parsed && parsed.is_hybrid) {
                    if (parsed.spouse_email && parsed.spouse_email.toLowerCase().trim() === myEmail) {
                        if (state.familyFundInviteStatus === 'declined') {
                            console.log("[E2EE Debug] Spouse has declined/left this shared fund. Skipping.");
                            continue;
                        }
                        console.log("[E2EE Debug] Match found for spouse_email!");
                        state.spouseRole = parsed.spouse_role || 'wife';
                        state.ownerNickname = parsed.owner_nickname || '';
                        let fundKey = '';
                        if (state.asymmetricPrivateKeyEncrypted) {
                            const decryptedPrivKey = await decrypt(state.asymmetricPrivateKeyEncrypted, state.masterPassword);
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
                        }
                        
                        if (fundKey && parsed.encrypted_fund) {
                            state.spouseFundInvitePending = false;
                            const decryptedFund = await decrypt(parsed.encrypted_fund, fundKey);
                            const fundData = JSON.parse(decryptedFund);
                            state.familyFunds = fundData.familyFunds || [];
                            state.fundTransactions = fundData.fundTransactions || [];
                            state.activeChartFundIds = fundData.activeChartFundIds || ['fund-main'];
                            state.viewingSharedFund = true;
                            state.sharedFundOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                            state.fundSymmetricKey = fundKey;
                            state.sharedFundSourceRow = {
                                user_id: row.user_id,
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
                            // Case B: Husband has shared with us, but hasn't encrypted the key using our new public key yet
                            console.log("[E2EE Debug] Case B: spouse_email matched but no valid fundKey decrypted yet.");
                            state.spouseFundInvitePending = true;
                            state.spouseFundInviteOwnerEmail = parsed.owner_email || 'Chồng/Vợ';
                        }
                    }
                } else {
                    // Fallback to legacy E2EE format
                    const decrypted = await decrypt(row.encrypted_data, state.masterPassword);
                    const legacyParsed = JSON.parse(decrypted);

                    if (legacyParsed.spouseEmail && legacyParsed.spouseEmail.toLowerCase().trim() === myEmail) {
                        if (state.familyFundInviteStatus === 'declined') {
                            console.log("[E2EE Debug] Spouse has declined/left legacy shared fund. Skipping.");
                            continue;
                        }
                        state.familyFunds = legacyParsed.familyFunds || [];
                        state.fundTransactions = legacyParsed.fundTransactions || [];
                        state.viewingSharedFund = true;
                        state.sharedFundOwnerEmail = legacyParsed.ownerEmail || 'Chồng/Vợ';
                        if (typeof window.updateHomeLayoutUI === 'function') {
                            window.updateHomeLayoutUI();
                        }
                        return;
                    }
                }
            } catch (decErr) {
                // Ignore decryption/parsing failures for other users' rows
            }
        }
        
        if (state.viewingSharedFund || state.sharedFundOwnerEmail) {
            state.viewingSharedFund = false;
            state.sharedFundOwnerEmail = '';
            state.familyFunds = [];
            state.fundTransactions = [];
            state.fundSymmetricKey = '';
            state.familyFundInviteStatus = '';
            state.sharedFundSourceRow = null;
            if (state.masterPassword) {
                await loadLocalState(state.masterPassword);
            }
            showToast("Liên kết Quỹ gia đình đã bị hủy bởi đối tác. Quay về quỹ cá nhân.");
        }
        
        state.viewingSharedFund = false;
        if (typeof window.updateHomeLayoutUI === 'function') {
            window.updateHomeLayoutUI();
        }
    } catch (e) {
        console.error("Error checking shared family fund:", e);
        if (state.viewingSharedFund || state.sharedFundOwnerEmail) {
            state.viewingSharedFund = false;
            state.sharedFundOwnerEmail = '';
            state.familyFunds = [];
            state.fundTransactions = [];
            state.fundSymmetricKey = '';
            state.familyFundInviteStatus = '';
            state.sharedFundSourceRow = null;
            if (state.masterPassword) {
                await loadLocalState(state.masterPassword);
            }
        }
        state.viewingSharedFund = false;
        if (typeof window.updateHomeLayoutUI === 'function') {
            window.updateHomeLayoutUI();
        }
    }
}

// Main Render Function called when switching to 'fund' tab
export async function renderFundDashboard() {
    // 0. Check for shared family fund E2EE
    await checkForSharedFamilyFund();

    // 1. Calculate balances dynamically
    calculateFundBalances();

    // 2. Render Shared Banner
    const banner = document.getElementById('sharedFundBanner');
    const bannerText = document.getElementById('sharedFundBannerText');
    if (banner && bannerText) {
        if (state.viewingSharedFund) {
            banner.style.display = 'flex';
            const displayName = state.ownerNickname ? `${state.ownerNickname} (${state.sharedFundOwnerEmail})` : state.sharedFundOwnerEmail;
            bannerText.innerText = `Đang xem Quỹ gia đình được chia sẻ từ: ${displayName} (Bạn có thể đóng góp & chi tiêu từ quỹ này)`;
        } else {
            banner.style.display = 'none';
        }
    }

    // 3. Render Fund Cards Dynamically (Hiding delete buttons here!)
    renderFundCards();

    // 4. Render Contribution Chart (Chồng vs Vợ)
    renderContributionChart();

    // 5. Render selected Fund's details Inflow/Outflow charts
    renderFundDetailsCharts();

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
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Trích quỹ
                </button>
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
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
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
                <button class="btn-fund-action" onclick="openFundActionModal('invest', '${fund.id}')" style="--accent-color: #f59e0b;">
                    <i data-lucide="trending-up"></i> Chốt lãi/lỗ
                </button>
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
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
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
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
        currentUserRole = state.spouseRole || 'wife';
    } else if (state.spouseEmail) {
        currentUserRole = state.spouseRole === 'husband' ? 'wife' : 'husband';
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
            <div class="fund-chart-container">
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
    
    let txs = (state.fundTransactions || []).filter(t => !t.deleted_at);

    if (filterVal !== 'all') {
        txs = txs.filter(t => t.fundId === filterVal || t.fromFundId === filterVal || t.toFundId === filterVal);
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
            <button class="tx-action-delete" onclick="deleteFundTransaction('${tx.id}')" title="Xóa giao dịch">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
        `;

        return `
            <div class="fund-tx-item">
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
    const date = document.getElementById('contribDate').value || new Date().toISOString().split('T')[0];
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
    const date = document.getElementById('transferDate').value || new Date().toISOString().split('T')[0];
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
        if (!confirm(`Quỹ nguồn không đủ số dư (Hiện có: ${formatVND(fromFund.balance)}). Bạn vẫn muốn chuyển âm?`)) {
            return;
        }
    }

    let memberId = 'p-husband';
    if (state.viewingSharedFund) {
        memberId = state.spouseRole === 'husband' ? 'p-husband' : 'p-wife';
    } else if (state.spouseEmail) {
        memberId = state.spouseRole === 'husband' ? 'p-wife' : 'p-husband';
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
    const date = document.getElementById('spendingDate').value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('spendingNotes').value.trim();

    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền chi tiêu hợp lệ!", "warning");
        return;
    }

    let memberId = 'p-husband';
    if (state.viewingSharedFund) {
        memberId = state.spouseRole === 'husband' ? 'p-husband' : 'p-wife';
    } else if (state.spouseEmail) {
        memberId = state.spouseRole === 'husband' ? 'p-wife' : 'p-husband';
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
    const date = document.getElementById('investDate').value || new Date().toISOString().split('T')[0];
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

    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này? Số dư các quỹ sẽ tự động tính toán lại.")) return;

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
        document.getElementById('contribDate').value = new Date().toISOString().split('T')[0];
        if (targetFundId) {
            const selectEl = document.getElementById('contribFundSelect');
            if (selectEl) selectEl.value = targetFundId;
        }
        document.getElementById('fundContributionModal').classList.add('active');
    } 
    else if (action === 'transfer') {
        document.getElementById('transferDate').value = new Date().toISOString().split('T')[0];
        if (targetFundId) {
            document.getElementById('transferFromFund').value = targetFundId;
        }
        document.getElementById('fundTransferModal').classList.add('active');
    } 
    else if (action === 'spending') {
        document.getElementById('spendingDate').value = new Date().toISOString().split('T')[0];
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
        document.getElementById('investDate').value = new Date().toISOString().split('T')[0];
        if (targetFundId) {
            document.getElementById('investFundSelect').value = targetFundId;
        }
        document.getElementById('fundInvestModal').classList.add('active');
    }
};

// Render management tab elements (Linked to tab-fund-management view)
export function renderManagementTab() {
    // 1. Hide/Show Add Custom Fund Block
    const addFundBlock = document.getElementById('mgmtAddCustomFundBlock');
    if (addFundBlock) {
        addFundBlock.style.display = state.viewingSharedFund ? 'none' : 'flex';
    }

    const spouseEmailForm = document.getElementById('fundSpouseEmailForm');
    const spouseLinkSharedView = document.getElementById('spouseLinkSharedView');
    const spouseLinkOwnerName = document.getElementById('spouseLinkOwnerName');

    if (state.viewingSharedFund) {
        if (spouseEmailForm) spouseEmailForm.style.display = 'none';
        if (spouseLinkSharedView) spouseLinkSharedView.style.display = 'flex';
        if (spouseLinkOwnerName) {
            spouseLinkOwnerName.innerText = state.ownerNickname || state.sharedFundOwnerEmail;
        }
    } else {
        if (spouseEmailForm) spouseEmailForm.style.display = 'flex';
        if (spouseLinkSharedView) spouseLinkSharedView.style.display = 'none';

        const emailInput = document.getElementById('spouseEmailInput');
        const roleInput = document.getElementById('spouseRoleInput');
        const nicknameInput = document.getElementById('ownerNicknameInput');
        const unlinkBtn = document.getElementById('btnUnlinkSpouse');
        const saveBtn = document.getElementById('btnSaveSpouseLink');

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
        if (unlinkBtn) {
            unlinkBtn.style.display = state.spouseEmail ? 'inline-block' : 'none';
        }
        if (saveBtn) {
            saveBtn.style.display = state.spouseEmail ? 'none' : 'inline-block';
        }
    }

    // 2. Google Sheets Webhook Url
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

// Spouse Email Save handler
async function handleSpouseEmailSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) {
        showToast("Đang ở chế độ xem tài khoản liên kết, không thể sửa cài đặt này!", "warning");
        return;
    }
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản trước", "warning");
        return;
    }

    const email = document.getElementById('spouseEmailInput').value.trim();
    const role = document.getElementById('spouseRoleInput')?.value || 'wife';
    const nickname = document.getElementById('ownerNicknameInput')?.value.trim() || '';

    state.spouseEmail = email;
    state.spouseRole = role;
    state.ownerNickname = nickname;
    state.familyFundsUpdated = new Date().toISOString();

    await saveLocalState();
    showToast("Đã lưu email liên kết thành công!");
    renderManagementTab();
    performSync(true);
}

// Unlink Spouse (Owner's action)
async function handleUnlinkSpouse() {
    if (state.viewingSharedFund) return;
    if (!confirm("Bạn có chắc chắn muốn xóa liên kết tài khoản Vợ/Chồng này? Dữ liệu Quỹ gia đình sẽ không còn được chia sẻ với họ.")) {
        return;
    }

    state.spouseEmail = '';
    state.spouseRole = 'wife';
    state.ownerNickname = '';
    state.familyFundsUpdated = new Date().toISOString();

    await saveLocalState();
    showToast("Đã xóa liên kết tài khoản Vợ/Chồng!");
    renderManagementTab();
    performSync(true);
}

// Leave Spouse Fund (Spouse's action)
async function handleLeaveSpouseFund() {
    if (!state.viewingSharedFund) return;
    
    const confirmPassword = prompt("Để thoát khỏi nhóm gia đình, vui lòng xác nhận mật khẩu Master:");
    if (confirmPassword === null) return;
    
    if (confirmPassword !== state.masterPassword) {
        showToast("Mật khẩu Master không chính xác. Hủy bỏ thoát nhóm!", "error");
        return;
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
    state.sharedFundSourceRow = null;

    await saveLocalState();
    showToast("Đã thoát khỏi nhóm gia đình thành công!");
    
    if (typeof window.switchTab === 'function') {
        window.switchTab('dashboard');
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

    if (!confirm(`Bạn có chắc chắn muốn xóa quỹ "${fund.name}"?`)) return;

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
