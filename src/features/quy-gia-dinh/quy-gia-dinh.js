// src/features/quy-gia-dinh/quy-gia-dinh.js - Family Fund Management Logic

import { 
    state, saveLocalState, showToast, performSync,
    formatDate, escapeHTML, formatVND, generateId
} from '../../core/app.js?v=4.0.72';
import { decrypt } from '../../core/crypto.js?v=4.0.72';

let fundContributionChart = null;

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

    // Bind subtab buttons
    const subtabBtns = document.querySelectorAll('.fund-subtab-btn');
    subtabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const subtabId = btn.getAttribute('data-fund-subtab');
            
            // Toggle active class on buttons
            subtabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Toggle tab panels
            document.querySelectorAll('.fund-subtab-content').forEach(p => {
                if (p.id === `fund-subtab-${subtabId}`) {
                    p.style.display = 'block';
                } else {
                    p.style.display = 'none';
                }
            });

            if (subtabId === 'overview') {
                renderFundDashboard();
            } else if (subtabId === 'management') {
                renderManagementTab();
            }
        });
    });

    // Link spouse email form
    const spouseEmailForm = document.getElementById('fundSpouseEmailForm');
    if (spouseEmailForm) {
        spouseEmailForm.addEventListener('submit', handleSpouseEmailSubmit);
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

// Parse input string back to integer
function parseMoneyInput(str) {
    if (!str) return 0;
    return parseInt(str.replace(/\./g, '').replace(/,/g, ''), 10) || 0;
}

// Ensure default funds exist in state
function ensureDefaultFunds() {
    if (!state.familyFunds || state.familyFunds.length === 0) {
        state.familyFunds = [
            { id: 'fund-main', name: 'Quỹ chính (Lương chung)', type: 'main', balance: 0 },
            { id: 'fund-spending', name: 'Quỹ chi tiêu (Sinh hoạt)', type: 'spending', balance: 0 },
            { id: 'fund-investment', name: 'Quỹ đầu tư (Lãi/Lỗ)', type: 'investment', balance: 0 }
        ];
        state.familyFundsUpdated = new Date().toISOString();
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
    if (!state.user || !window.supabase) {
        state.viewingSharedFund = false;
        return;
    }

    try {
        const { data, error } = await window.supabase
            .from('gift_sync')
            .select('user_id, encrypted_data, updated_at');

        if (error || !data) return;

        for (const row of data) {
            if (row.user_id === state.user.id) continue; // Skip own data

            try {
                const decrypted = await decrypt(row.encrypted_data, state.masterPassword);
                const parsed = JSON.parse(decrypted);

                if (parsed.spouseEmail && parsed.spouseEmail.toLowerCase().trim() === state.user.email.toLowerCase().trim()) {
                    // Loaded shared Family Fund
                    state.familyFunds = parsed.familyFunds || [];
                    state.fundTransactions = parsed.fundTransactions || [];
                    state.viewingSharedFund = true;
                    state.sharedFundOwnerEmail = parsed.ownerEmail || 'Chồng/Vợ';
                    return;
                }
            } catch (decErr) {
                // Ignore decryption failures
            }
        }
        
        state.viewingSharedFund = false;
    } catch (e) {
        console.error("Error checking shared family fund:", e);
        state.viewingSharedFund = false;
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
            bannerText.innerText = `Đang xem Quỹ gia đình được chia sẻ từ: ${state.sharedFundOwnerEmail} (Chế độ xem & xuất báo cáo)`;
        } else {
            banner.style.display = 'none';
        }
    }

    // 3. Render Fund Cards Dynamically
    renderFundCards();

    // 4. Render Contribution Chart (Chồng vs Vợ)
    renderContributionChart();

    // 5. Populate members list in Contribution Form
    populateMemberSelects();

    // 6. Populate fund selectors in Transfer/Spending/Invest forms
    populateFundSelects();

    // 7. Render Transaction List (Audit Log)
    renderTransactionList();
}

// Render the cards dynamically including custom funds
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
            buttonsHtml = `
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
            buttonsHtml = `
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
            buttonsHtml = `
                <button class="btn-fund-action" onclick="openFundActionModal('spending', '${fund.id}')" style="--accent-color: #ef4444;">
                    <i data-lucide="arrow-up-right"></i> Chi tiêu
                </button>
                <button class="btn-fund-action" onclick="openFundActionModal('transfer', '${fund.id}')">
                    <i data-lucide="arrow-left-right"></i> Chuyển tiền
                </button>
                <button class="btn-fund-action btn-delete-fund" onclick="deleteCustomFund('${fund.id}')" style="--accent-color: #7f1d1d; max-width: 36px; flex: none;" title="Xóa quỹ">
                    <i data-lucide="trash-2"></i>
                </button>
            `;
        }

        if (state.viewingSharedFund) {
            buttonsHtml = `<div style="font-size:0.75rem; color:var(--text-muted); text-align:center; width:100%; padding: 4px 0;">Chế độ Xem</div>`;
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
}

// Populate Fund selectors
function populateFundSelects() {
    const transferFrom = document.getElementById('transferFromFund');
    const transferTo = document.getElementById('transferToFund');
    const spendingFundSelect = document.getElementById('spendingFundSelect');
    const investFundSelect = document.getElementById('investFundSelect');

    const funds = state.familyFunds || [];

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

// Render Doughnut Chart using Chart.js
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
            txTitle = `Chi tiêu từ Quỹ`;
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
            txTitle = `Trích chuyển Quỹ nội bộ`;
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
    if (state.viewingSharedFund) {
        showToast("Đang xem chế độ chia sẻ, không thể thêm giao dịch!", "warning");
        return;
    }
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }

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
        fundId: 'fund-main',
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
    if (state.viewingSharedFund) {
        showToast("Đang xem chế độ chia sẻ, không thể thực hiện!", "warning");
        return;
    }
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

    const tx = {
        id: 'fund-tx-' + generateId(),
        fromFundId: fromFundId,
        toFundId: toFundId,
        type: 'transfer',
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
    renderFundDashboard();

    document.getElementById('transferAmount').value = '';
    document.getElementById('transferNotes').value = '';
    closeModal('fundTransferModal');

    showToast("Đã trích chuyển quỹ thành công!");
    performSync(true);
}

// Handler: Ghi nhận chi tiêu từ quỹ chi tiêu
async function handleSpendingSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) {
        showToast("Đang xem chế độ chia sẻ, không thể thực hiện!", "warning");
        return;
    }
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

    const tx = {
        id: 'fund-tx-' + generateId(),
        fundId: fundId,
        type: 'spending',
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
    renderFundDashboard();

    document.getElementById('spendingAmount').value = '';
    document.getElementById('spendingNotes').value = '';
    closeModal('fundSpendingModal');

    showToast("Đã ghi nhận giao dịch chi tiêu!");
    performSync(true);
}

// Handler: Chốt đầu tư (Lãi/Lỗ)
async function handleInvestSubmit(e) {
    e.preventDefault();
    if (state.viewingSharedFund) {
        showToast("Đang xem chế độ chia sẻ, không thể thực hiện!", "warning");
        return;
    }
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

    state.fundTransactions[index] = {
        ...state.fundTransactions[index],
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    state.fundTransactionsUpdated = new Date().toISOString();

    await saveLocalState();
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

    if (state.viewingSharedFund) {
        showToast("Bạn đang ở chế độ Chỉ Xem của tài khoản liên kết, không thể thêm giao dịch mới.", "warning");
        return;
    }

    if (action === 'contribution') {
        document.getElementById('contribDate').value = new Date().toISOString().split('T')[0];
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

// Render management tab elements
function renderManagementTab() {
    // 1. Spouse email
    const emailInput = document.getElementById('spouseEmailInput');
    if (emailInput) {
        emailInput.value = state.spouseEmail || '';
    }

    // 2. Custom funds list
    const mgmtList = document.getElementById('mgmtCustomFundsList');
    if (!mgmtList) return;

    const funds = state.familyFunds || [];
    if (funds.length === 0) {
        mgmtList.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted); padding: 8px 0;">Chưa có quỹ nào.</div>`;
        return;
    }

    mgmtList.innerHTML = funds.map(f => {
        const isCustom = f.type === 'custom';
        const canDelete = isCustom && f.balance === 0 && !state.viewingSharedFund;
        
        return `
            <div class="mgmt-fund-item">
                <span class="fund-name">${escapeHTML(f.name)} (${f.type === 'main' ? 'Quỹ chính' : (f.type === 'spending' ? 'Chi tiêu' : (f.type === 'investment' ? 'Đầu tư' : 'Tùy chỉnh'))})</span>
                <div class="fund-actions">
                    <span class="fund-balance" style="font-weight:700; color:var(--accent-emerald);">${formatVND(f.balance)}</span>
                    ${canDelete ? `
                        <button class="btn-delete" onclick="deleteCustomFund('${f.id}')" title="Xóa quỹ">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
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
    state.spouseEmail = email;
    state.familyFundsUpdated = new Date().toISOString();

    await saveLocalState();
    showToast("Đã lưu email liên kết thành công!");
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
        balance: 0
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
window.deleteCustomFund = async function(fundId) {
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

    await saveLocalState();
    
    renderManagementTab();
    showToast("Đã xóa quỹ thành công!");
    performSync(true);
};

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
