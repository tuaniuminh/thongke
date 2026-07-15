/**
 * Monthly financial report calculator for FamiLife
 */

import { parseTxDate } from '../thu-chi-doi-ngoai/utils';

export function generateMonthlyReportData(month, year, fundTransactions = []) {
  const activeTx = (fundTransactions || []).filter(t => !t.deleted_at);
  
  // Filter transactions for specific month & year
  const monthTx = activeTx.filter(t => {
    if (!t.date) return false;
    const dateObj = new Date(t.date);
    return (dateObj.getMonth() + 1) === month && dateObj.getFullYear() === year;
  });

  let totalInflow = 0;
  let totalOutflow = 0;
  let husbandContrib = 0;
  let wifeContrib = 0;
  
  // Spending categorization map
  const categorySpending = {};

  monthTx.forEach(tx => {
    const amt = Number(tx.amount || 0);
    
    if (tx.type === 'contribution') {
      totalInflow += amt;
      if (tx.member === 'husband') husbandContrib += amt;
      else wifeContrib += amt;
    } 
    else if (tx.type === 'external_income') {
      totalInflow += amt;
    }
    else if (tx.type === 'spending') {
      totalOutflow += amt;
      const cat = tx.notes || 'Chi tiêu khác';
      // Group by first few words to aggregate categories simply
      const firstWord = cat.split(' ')[0] || 'Khác';
      categorySpending[firstWord] = (categorySpending[firstWord] || 0) + amt;
    }
    else if (tx.type === 'investment_change' && amt < 0) {
      // Loss counted as outflow
      totalOutflow += Math.abs(amt);
    }
    else if (tx.type === 'investment_change' && amt > 0) {
      // Profit counted as inflow
      totalInflow += amt;
    }
  });

  const surplus = totalInflow - totalOutflow;
  const surplusRate = totalInflow > 0 ? (surplus / totalInflow) * 100 : 0;

  // Simple rule-based financial advice
  let advice = '';
  let adviceColor = '#10b981'; // Green

  if (totalInflow === 0 && totalOutflow === 0) {
    advice = 'Không có hoạt động tài chính nào phát sinh trong tháng này.';
    adviceColor = '#64748b';
  } else if (surplus < 0) {
    advice = 'Cảnh báo: Tháng này gia đình chi tiêu vượt thu nhập (thâm hụt tài chính). Vui lòng cắt giảm chi tiêu không thiết yếu ngay lập tức!';
    adviceColor = '#ef4444'; // Red
  } else if (surplusRate < 20) {
    advice = 'Số tiền tích lũy tháng này ở mức thấp (dưới 20% thu nhập). Nên cố gắng nâng tỉ lệ tiết kiệm bằng cách kiểm soát ngân sách chi tiêu hàng ngày.';
    adviceColor = '#f59e0b'; // Amber
  } else {
    advice = 'Chúc mừng: Sức khỏe tài chính tháng này rất tốt! Bạn đã tiết kiệm được trên 20% tổng thu nhập gia đình.';
    adviceColor = '#10b981'; // Green
  }

  return {
    totalInflow,
    totalOutflow,
    surplus,
    husbandContrib,
    wifeContrib,
    categorySpending: Object.entries(categorySpending).map(([name, val]) => ({ name, value: val })),
    advice,
    adviceColor
  };
}
