import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { calculateDashboardStats, getRecentActivities, formatVND, formatDate } from './utils';

const { width } = Dimensions.get('window');

export default function ThuChiDashboard({ navigation }) {
  const { state } = useApp();
  const { receivedGifts, sentGifts } = state;

  const stats = calculateDashboardStats(receivedGifts, sentGifts);
  const recentActivities = getRecentActivities(receivedGifts, sentGifts, 5);

  // Simple pure JS calculation for relationships visualization
  const relationships = ['Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Khác'];
  const activeReceived = (receivedGifts || []).filter(g => !g.deleted_at);
  const activeSent = (sentGifts || []).filter(g => !g.deleted_at);

  const relStats = relationships.map(rel => {
    const recAmount = activeReceived.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount || 0), 0);
    const sentAmount = activeSent.filter(g => g.relationship === rel).reduce((sum, g) => sum + Number(g.amount || 0), 0);
    return { name: rel, received: recAmount, sent: sentAmount };
  });

  const maxAmount = Math.max(...relStats.map(r => Math.max(r.received, r.sent)), 1000000);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Top Navigation Row */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thu Chi Đối Ngoại</Text>
        <View style={{ width: 80 }} />
      </View>

      {/* Grid Stats Block */}
      <View style={styles.statsGrid}>
        
        {/* Total Received Card */}
        <View style={[styles.statCard, { borderLeftColor: '#10b981', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Tiền tôi nhận</Text>
          <Text style={styles.statValue}>{formatVND(stats.totalReceived)}</Text>
          <Text style={styles.statSub}>{stats.receivedCount} người {stats.totalGoldReceived > 0 ? `• ${stats.totalGoldReceived} chỉ vàng` : ''}</Text>
        </View>

        {/* Total Sent Card */}
        <View style={[styles.statCard, { borderLeftColor: '#0ea5e9', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Tiền tôi mừng</Text>
          <Text style={styles.statValue}>{formatVND(stats.totalSent)}</Text>
          <Text style={styles.statSub}>{stats.sentCount} sự kiện {stats.totalGoldSent > 0 ? `• ${stats.totalGoldSent} chỉ vàng` : ''}</Text>
        </View>

        {/* Balance Card */}
        <View style={[styles.statCard, { borderLeftColor: stats.balance >= 0 ? '#10b981' : '#f43f5e', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Số dư thu - mừng</Text>
          <Text style={[styles.statValue, { color: stats.balance >= 0 ? '#0f766e' : '#be123c' }]}>
            {formatVND(stats.balance)}
          </Text>
          <Text style={styles.statSub}>Chênh lệch thu chi đối ngoại</Text>
        </View>

        {/* Pending Return Card */}
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b', borderLeftWidth: 4 }]}>
          <Text style={styles.statLabel}>Chờ trả lễ</Text>
          <Text style={[styles.statValue, { color: '#b45309' }]}>{stats.pendingReturnCount} người</Text>
          <Text style={styles.statSub}>Số người mừng chưa có dịp trả lễ</Text>
        </View>

      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981' }]} onPress={() => navigation.navigate('ReceivedList')}>
          <Text style={styles.actionBtnText}>💵 Tiền tôi nhận</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0ea5e9' }]} onPress={() => navigation.navigate('SentList')}>
          <Text style={styles.actionBtnText}>✉️ Tiền tôi mừng</Text>
        </TouchableOpacity>
      </View>

      {/* Relationship Chart Section (Native Responsive CSS bars) */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Phân tích theo mối quan hệ</Text>
        <Text style={styles.sectionSub}>So sánh số tiền nhận (Xanh lá) và mừng (Xanh dương)</Text>

        <View style={styles.chartWrapper}>
          {relStats.map((item, idx) => {
            const recWidth = `${Math.max((item.received / maxAmount) * 100, 2)}%`;
            const sentWidth = `${Math.max((item.sent / maxAmount) * 100, 2)}%`;

            return (
              <View key={idx} style={styles.chartRow}>
                <Text style={styles.chartRowLabel}>{item.name}</Text>
                <View style={styles.chartBarWrapper}>
                  {/* Received Bar */}
                  {item.received > 0 && (
                    <View style={styles.barContainer}>
                      <View style={[styles.chartBar, { width: recWidth, backgroundColor: '#10b981' }]} />
                      <Text style={styles.barLabel}>{formatVND(item.received)}</Text>
                    </View>
                  )}
                  {/* Sent Bar */}
                  {item.sent > 0 && (
                    <View style={styles.barContainer}>
                      <View style={[styles.chartBar, { width: sentWidth, backgroundColor: '#0ea5e9' }]} />
                      <Text style={styles.barLabel}>{formatVND(item.sent)}</Text>
                    </View>
                  )}
                  {item.received === 0 && item.sent === 0 && (
                    <Text style={styles.emptyBarText}>Chưa có dữ liệu</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent Activity List */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Hoạt động gần đây</Text>
        
        {recentActivities.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có giao dịch đối ngoại nào được tạo.</Text>
        ) : (
          <View style={styles.activityList}>
            {recentActivities.map((act, idx) => (
              <View key={idx} style={[styles.activityItem, idx === recentActivities.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.activityDot, { backgroundColor: act.activityType === 'received' ? '#10b981' : '#0ea5e9' }]} />
                <View style={styles.activityText}>
                  <Text style={styles.activityName}>{act.name} ({act.relationship})</Text>
                  <Text style={styles.activityMeta}>{act.event_type} • {formatDate(act.date)}</Text>
                </View>
                <Text style={[styles.activityAmount, { color: act.activityType === 'received' ? '#10b981' : '#0ea5e9' }]}>
                  {act.activityType === 'received' ? '+' : '-'}{formatVND(act.amount)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  statsGrid: {
    gap: 12,
    width: '100%',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#090d16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  actionRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    shadowColor: '#090d16',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 20,
  },
  chartWrapper: {
    gap: 16,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartRowLabel: {
    width: 90,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chartBarWrapper: {
    flex: 1,
    gap: 6,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  chartBar: {
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
  emptyBarText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  activityList: {
    marginTop: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  activityText: {
    flex: 1,
  },
  activityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  activityMeta: {
    fontSize: 12,
    color: '#64748b',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
