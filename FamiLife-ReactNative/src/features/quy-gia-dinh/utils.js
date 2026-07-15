/**
 * Helper utilities for FamiLife Family Fund calculations
 */

export function ensureDefaultFunds(familyFunds = []) {
  if (!familyFunds || familyFunds.length === 0) {
    return [
      { id: 'fund-main', name: 'Quỹ chính', type: 'main', balance: 0 },
      { id: 'fund-spending', name: 'Quỹ chi tiêu', type: 'spending', balance: 0, hasContribution: false },
      { id: 'fund-investment', name: 'Quỹ đầu tư', type: 'investment', balance: 0, hasContribution: true }
    ];
  }
  
  // Ensure the default properties are present
  return familyFunds.map(fund => {
    let uFund = { ...fund };
    if (uFund.id === 'fund-main') {
      uFund.name = 'Quỹ chính';
    }
    if (uFund.id === 'fund-spending') {
      uFund.name = 'Quỹ chi tiêu';
      if (uFund.hasContribution === undefined) uFund.hasContribution = false;
    }
    if (uFund.id === 'fund-investment') {
      uFund.name = 'Quỹ đầu tư';
      if (uFund.hasContribution === undefined) uFund.hasContribution = true;
    }
    return uFund;
  });
}

export function calculateFundBalances(familyFunds = [], fundTransactions = []) {
  const funds = ensureDefaultFunds(familyFunds);
  
  // Reset balances
  funds.forEach(f => {
    f.balance = 0;
  });

  const activeTx = (fundTransactions || []).filter(t => !t.deleted_at);

  activeTx.forEach(tx => {
    const amount = Number(tx.amount || 0);

    if (tx.type === 'contribution' || tx.type === 'external_income') {
      const fund = funds.find(f => f.id === tx.fundId);
      if (fund) fund.balance += amount;
    } 
    else if (tx.type === 'spending') {
      const fund = funds.find(f => f.id === tx.fundId);
      if (fund) fund.balance -= amount;
    } 
    else if (tx.type === 'investment_change') {
      const fund = funds.find(f => f.id === tx.fundId);
      if (fund) fund.balance += amount; // can be positive or negative
    } 
    else if (tx.type === 'transfer') {
      const fromFund = funds.find(f => f.id === tx.fromFundId);
      const toFund = funds.find(f => f.id === tx.toFundId);
      if (fromFund) fromFund.balance -= amount;
      if (toFund) toFund.balance += amount;
    }
  });

  return funds;
}

export function getContributionStats(transactions = []) {
  const activeTx = (transactions || []).filter(t => !t.deleted_at && t.type === 'contribution');
  
  let husbandTotal = 0;
  let wifeTotal = 0;

  activeTx.forEach(tx => {
    const amt = Number(tx.amount || 0);
    // Determine by nickname / member role
    if (tx.member === 'husband' || (tx.memberRole && tx.memberRole === 'husband')) {
      husbandTotal += amt;
    } else if (tx.member === 'wife' || (tx.memberRole && tx.memberRole === 'wife')) {
      wifeTotal += amt;
    } else {
      // Default fallback
      wifeTotal += amt;
    }
  });

  return { husbandTotal, wifeTotal };
}
