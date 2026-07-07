// src/features/quy-gia-dinh/quy-gia-dinh.js - Family Fund Management Logic

import { 
    state, saveLocalState, showToast, performSync,
    formatDate, escapeHTML, formatVND, generateId
} from '../../core/app.js?v=4.0.71';

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
            // amount can be positive (profit) or negative (loss)
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

// Main Render Function called when switching to 'fund' tab
export function renderFundDashboard() {
    // 1. Calculate balances dynamically
    calculateFundBalances();

    // 2. Render Fund Cards
    renderFundCards();

    // 3. Render Contribution Chart (Chồng vs Vợ)
    renderContributionChart();

    // 4. Populate members list in Contribution Form
    populateMemberSelects();

    // 5. Populate fund selectors in Transfer/Spending/Invest forms
    populateFundSelects();

    // 6. Render Transaction List (Audit Log)
    renderTransactionList();
}

// Render the 3 main cards with actual balances
function renderFundCards() {
    const mainFund = state.familyFunds.find(f => f.type === 'main');
    const spendingFund = state.familyFunds.find(f => f.type === 'spending');
    const investmentFund = state.familyFunds.find(f => f.type === 'investment');

    const mainVal = document.getElementById('mainFundBalance');
    if (mainVal && mainFund) mainVal.innerText = formatVND(mainFund.balance);

    const spendVal = document.getElementById('spendingFundBalance');
    if (spendVal && spendingFund) spendVal.innerText = formatVND(spendingFund.balance);

    const investVal = document.getElementById('investFundBalance');
    if (investVal && investmentFund) investVal.innerText = formatVND(investmentFund.balance);
}

// Populate Member Select dropdowns with default Husband/Wife + familyProfiles
function populateMemberSelects() {
    const contribMemberSelect = document.getElementById('contribMember');
    if (!contribMemberSelect) return;

    // Default members
    let members = [
        { id: 'p-husband', name: 'Chồng' },
        { id: 'p-wife', name: 'Vợ' }
    ];

    // Append custom profiles if exist (excluding p-self to avoid confusion, or map it)
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

// Populate Fund selectors in all actions modals
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
        // Only allow spending or custom funds for spending
        const spendableFunds = funds.filter(f => f.type === 'spending' || f.type === 'custom');
        spendingFundSelect.innerHTML = spendableFunds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
    }
    if (investFundSelect) {
        // Only allow investment funds
        const investableFunds = funds.filter(f => f.type === 'investment');
        investFundSelect.innerHTML = investableFunds.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
    }
}

// Render Doughnut Chart using Chart.js
function renderContributionChart() {
    const ctx = document.getElementById('fundContributionChartCanvas');
    if (!ctx) return;

    // Calculate total contributions per member
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

    // Update Text Legend
    const husbandPercent = total > 0 ? Math.round((husbandTotal / total) * 100) : 50;
    const wifePercent = total > 0 ? Math.round((wifeTotal / total) * 100) : 50;

    const husbandText = document.getElementById('chartHusbandText');
    if (husbandText) husbandText.innerText = `${formatVND(husbandTotal)} (${husbandPercent}%)`;

    const wifeText = document.getElementById('chartWifeText');
    if (wifeText) wifeText.innerText = `${formatVND(wifeTotal)} (${wifePercent}%)`;

    // Chart data
    const dataValues = total > 0 ? [husbandTotal, wifeTotal] : [1, 1]; // Equal placeholder if empty
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
                legend: {
                    display: false // Use custom HTML legend
                },
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

    // Apply Filter
    if (filterVal !== 'all') {
        txs = txs.filter(t => t.fundId === filterVal || t.fromFundId === filterVal || t.toFundId === filterVal);
    }

    // Sort by Date (recent first), then CreatedAt
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
        const memberName = tx.memberId === 'p-husband' ? 'Chồng' : (tx.memberId === 'p-wife' ? 'Vợ' : 'Khác');

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
                    <button class="tx-action-delete" onclick="deleteFundTransaction('${tx.id}')" title="Xóa giao dịch">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
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
        fundId: 'fund-main', // Contribution always goes to main fund
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
    
    // Clear form
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

    // Verify balance
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

    // Clear form
    document.getElementById('transferAmount').value = '';
    document.getElementById('transferNotes').value = '';
    closeModal('fundTransferModal');

    showToast("Đã trích chuyển quỹ thành công!");
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

    // Clear form
    document.getElementById('spendingAmount').value = '';
    document.getElementById('spendingNotes').value = '';
    closeModal('fundSpendingModal');

    showToast("Đã ghi nhận giao dịch chi tiêu!");
    performSync(true);
}

// Handler: Chốt đầu tư (Lãi/Lỗ)
async function handleInvestSubmit(e) {
    e.preventDefault();
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để thêm thông tin", "warning");
        return;
    }

    const fundId = document.getElementById('investFundSelect').value;
    const type = document.getElementById('investTypeSelect').value; // 'profit' / 'loss'
    let amount = parseMoneyInput(document.getElementById('investAmount').value);
    const date = document.getElementById('investDate').value || new Date().toISOString().split('T')[0];
    const notes = document.getElementById('investNotes').value.trim();

    if (amount <= 0) {
        showToast("Vui lòng nhập số tiền chênh lệch hợp lệ!", "warning");
        return;
    }

    // Loss represents negative change in balance
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

    // Clear form
    document.getElementById('investAmount').value = '';
    document.getElementById('investNotes').value = '';
    closeModal('fundInvestModal');

    showToast(type === 'profit' ? "Đã ghi nhận khoản lãi đầu tư!" : "Đã ghi nhận khoản lỗ đầu tư!");
    performSync(true);
}

// Export Delete function globally
window.deleteFundTransaction = async function(id) {
    if (!state.user) {
        showToast("Vui lòng đăng nhập tài khoản để xóa thông tin", "warning");
        return;
    }

    if (!confirm("Bạn có chắc chắn muốn xóa giao dịch này? Số dư các quỹ sẽ tự động tính toán lại.")) return;

    const index = (state.fundTransactions || []).findIndex(t => t.id === id);
    if (index === -1) return;

    // Soft delete to support sync
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
