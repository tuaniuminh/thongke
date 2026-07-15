/**
 * Helper utilities for FamiLife Thu Chi Doi Ngoai calculations
 */

export function calculateDashboardStats(receivedGifts = [], sentGifts = []) {
  const activeReceived = receivedGifts.filter(g => !g.deleted_at);
  const activeSent = sentGifts.filter(g => !g.deleted_at);

  const totalReceivedVal = activeReceived.reduce((sum, g) => sum + Number(g.amount || 0), 0);
  const totalSentVal = activeSent.reduce((sum, g) => sum + Number(g.amount || 0), 0);
  const balanceVal = totalReceivedVal - totalSentVal;

  // Gold calculations
  const totalGoldReceivedVal = activeReceived
    .filter(g => g.gift_type === 'gold')
    .reduce((sum, g) => sum + Number(g.gold_amount || 0), 0);
  const totalGoldSentVal = activeSent
    .filter(g => g.gift_type === 'gold')
    .reduce((sum, g) => sum + Number(g.gold_amount || 0), 0);
  const goldBalanceVal = totalGoldReceivedVal - totalGoldSentVal;

  const pendingReturnCount = activeReceived.filter(g => g.status === 'pending').length;

  return {
    totalReceived: totalReceivedVal,
    receivedCount: activeReceived.length,
    totalGoldReceived: totalGoldReceivedVal,
    totalSent: totalSentVal,
    sentCount: activeSent.length,
    totalGoldSent: totalGoldSentVal,
    balance: balanceVal,
    goldBalance: goldBalanceVal,
    pendingReturnCount
  };
}

export function getRelationshipChartData(receivedGifts = [], sentGifts = []) {
  const relationships = ['Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Chính quyền', 'Khác'];
  const activeReceived = receivedGifts.filter(g => !g.deleted_at);
  const activeSent = sentGifts.filter(g => !g.deleted_at);

  const receivedData = relationships.map(rel => 
    activeReceived.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount || 0), 0)
  );

  const sentData = relationships.map(rel => 
    activeSent.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount || 0), 0)
  );

  return {
    labels: relationships,
    received: receivedData,
    sent: sentData
  };
}

export function getEventTypeChartData(sentGifts = []) {
  const eventTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia', 'Khác'];
  const standardTypes = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia'];
  const activeSent = sentGifts.filter(g => !g.deleted_at);

  const data = eventTypes.map(type => {
    if (type === 'Khác') {
      return activeSent
        .filter(g => g.event_type && !standardTypes.includes(g.event_type))
        .reduce((sum, g) => sum + Number(g.amount || 0), 0);
    }
    return activeSent
      .filter(g => g.event_type === type)
      .reduce((sum, g) => sum + Number(g.amount || 0), 0);
  });

  return {
    labels: eventTypes,
    data
  };
}

export function getRecentActivities(receivedGifts = [], sentGifts = [], limit = 5) {
  const activeReceived = receivedGifts.filter(g => !g.deleted_at).map(g => ({
    ...g,
    activityType: 'received'
  }));

  const activeSent = sentGifts.filter(g => !g.deleted_at).map(g => ({
    ...g,
    activityType: 'sent'
  }));

  const combined = [...activeReceived, ...activeSent];

  // Sort by date (recent first)
  combined.sort((a, b) => {
    const dateA = new Date(a.date || a.created_at);
    const dateB = new Date(b.date || b.created_at);
    return dateB - dateA;
  });

  return combined.slice(0, limit);
}

export function formatVND(value) {
  if (value === undefined || value === null) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(value)
    .replace('₫', 'đ');
}

export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}
