import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { calculateFundBalances, getContributionStats } from './utils';
import { formatVND, formatDate } from '../thu-chi-doi-ngoai/utils';

const { width } = Dimensions.get('window');

export default function FamilyFundDashboard({ navigation }) {
  const { state, updateState } = useApp();
  const { familyFunds = [], fundTransactions = [] } = state;

  // State to add a custom fund
  const [newFundName, setNewFundName] = useState('');
  const [isAddingFund, setIsAddingFund] = useState(false);

  // Dynamic calculations
  const calculatedFunds = calculateFundBalances(familyFunds, fundTransactions);
  const totalBalance = calculatedFunds.reduce((sum, f) => sum + f.balance, 0);

  const { husbandTotal, wifeTotal } = getContributionStats(fundTransactions);
  const totalContrib = husbandTotal + wifeTotal;

  // Filter out active transactions and sort descending
  const activeTx = fundTransactions.filter(t => !t.deleted_at);
  const sortedTx = [...activeTx].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  const recentTx = sortedTx.slice(0, 5); // Show top 5 recent transactions

  const handleAddCustomFund = async () => {
    if (!newFundName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên quỹ.');
      return;
    }

    const exists = calculatedFunds.some(f => f.name.toLowerCase() === newFundName.trim().toLowerCase());
    if (exists) {
      Alert.alert('Lỗi', 'Tên quỹ này đã tồn tại.');
      return;
    }

    const newFund = {
      id: 'fund-' + Math.random().toString(36).substring(2, 9),
      name: newFundName.trim(),
      type: 'custom',
      balance: 0,
      hasContribution: true,
      created_at: new Date().toISOString()
    };

    const updatedFunds = [...familyFunds, newFund];
    await updateState({ familyFunds: updatedFunds });
    setNewFundName('');
    setIsAddingFund(false);
    Alert.alert('Thành công', `Đã thêm quỹ "${newFund.name}" mới.`);
  };

  const handleDeleteTransaction = (id) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa giao dịch này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            const updated = fundTransactions.map(t => {
              if (t.id === id) {
                return { ...t, deleted_at: new Date().toISOString() };
              }
              return t;
            });
            await updateState({ fundTransactions: updated });
            Alert.alert('Thành công', 'Đã xóa giao dịch.');
          }
        }
      ]
    );
  };

  const getTxTypeLabel = (type) => {
    switch (type) {
      case 'contribution': return 'Đóng góp';
      case 'spending': return 'Chi tiêu';
      case 'transfer': return 'Chuyển quỹ';
      case 'investment_change': return 'Đầu tư';
      case 'external_income': return 'Thu nhập ngoài';
      default: return 'Giao dịch';
    }
  };

  const getTxTypeColor = (type) => {
    switch (type) {
      case 'contribution':
      case 'external_income':
        return '#10b981'; // Green
      case 'spending':
        return '#f43f5e'; // Red
      case 'transfer':
        return '#64748b'; // Gray
      case 'investment_change':
        return '#f59e0b'; // Amber
      default:
        return '#334155';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quỹ Gia Đình</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('FundTransactionForm', { mode: 'create' })}
        >
          <Text style={styles.addButtonText}>+ Giao dịch</Text>
        </TouchableOpacity>
      </View>

      {/* Total Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceSub}>Tổng số dư quỹ hiện tại</Text>
        <Text style={styles.balanceVal}>{formatVND(totalBalance)}</Text>
      </View>

      {/* Quick report view */}
      <TouchableOpacity 
        style={styles.reportRowBtn} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('MonthlyReportScreen')}
      >
        <Text style={styles.reportRowBtnText}>📊 Xem báo cáo tài chính tháng này</Text>
      </TouchableOpacity>

      {/* Funds Grid */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Các tài khoản quỹ</Text>
          <TouchableOpacity onPress={() => setIsAddingFund(!isAddingFund)}>
            <Text style={styles.addFundLinkText}>{isAddingFund ? 'Đóng' : '+ Thêm Quỹ'}</Text>
          </TouchableOpacity>
        </View>

        {isAddingFund && (
          <View style={styles.addFundBox}>
            <TextInput 
              style={styles.fundInput}
              placeholder="Tên quỹ mới (ví dụ: Quỹ ăn uống, Quỹ du lịch...)"
              value={newFundName}
              onChangeText={setNewFundName}
            />
            <TouchableOpacity style={styles.saveFundBtn} onPress={handleAddCustomFund}>
              <Text style={styles.saveFundBtnText}>Tạo quỹ</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.fundsGrid}>
          {calculatedFunds.map((fund) => (
            <View key={fund.id} style={styles.fundCard}>
              <Text style={styles.fundName}>{fund.name}</Text>
              <Text style={[styles.fundBalance, { color: fund.balance >= 0 ? '#0f766e' : '#ef4444' }]}>
                {formatVND(fund.balance)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Contribution Stats */}
      {totalContrib > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>So sánh đóng góp Vợ / Chồng</Text>
          <Text style={styles.cardSub}>Tổng đóng góp: {formatVND(totalContrib)}</Text>
          
          <View style={styles.contribBars}>
            {/* Chồng bar */}
            <View style={styles.contribRow}>
              <Text style={styles.contribLabel}>Chồng (Nick): {formatVND(husbandTotal)}</Text>
              <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${(husbandTotal / totalContrib) * 100}%`, backgroundColor: '#0ea5e9' }]} />
              </View>
            </View>

            {/* Vợ bar */}
            <View style={styles.contribRow}>
              <Text style={styles.contribLabel}>Vợ: {formatVND(wifeTotal)}</Text>
              <View style={styles.barOuter}>
                <View style={[styles.barInner, { width: `${(wifeTotal / totalContrib) * 100}%`, backgroundColor: '#ec4899' }]} />
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Recent Transactions List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
        {recentTx.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có giao dịch quỹ nào được tạo.</Text>
        ) : (
          <View style={styles.txList}>
            {recentTx.map((tx) => {
              const label = getTxTypeLabel(tx.type);
              const color = getTxTypeColor(tx.type);
              const dateFormatted = new Date(tx.date || tx.created_at).toLocaleDateString('vi-VN');
              const fund = calculatedFunds.find(f => f.id === tx.fundId);
              const fundName = fund ? fund.name : '';

              return (
                <View key={tx.id} style={styles.txItem}>
                  <View style={styles.txHeader}>
                    <View>
                      <Text style={[styles.txType, { color }]}>{label} {fundName ? `(${fundName})` : ''}</Text>
                      <Text style={styles.txDate}>{dateFormatted} • {tx.member === 'husband' ? 'Chồng' : 'Vợ'}</Text>
                    </View>
                    <View style={styles.rightTx}>
                      <Text style={[styles.txAmount, { color }]}>
                        {tx.type === 'spending' ? '-' : '+'}{formatVND(tx.amount)}
                      </Text>
                      <TouchableOpacity style={styles.txDelete} onPress={() => handleDeleteTransaction(tx.id)}>
                        <Text style={styles.deleteIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {tx.notes ? <Text style={styles.txNotes}>{tx.notes}</Text> : null}
                </View>
              );
            })}
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
  addButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#10b981',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  balanceCard: {
    backgroundColor: '#0f766e',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0f766e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  balanceSub: {
    fontSize: 12,
    color: '#ccfbf1',
    fontWeight: '600',
    marginBottom: 6,
  },
  balanceVal: {
    fontSize: 28,
    fontWeight: '850',
    color: '#ffffff',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  addFundLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f766e',
  },
  addFundBox: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  fundInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  saveFundBtn: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  saveFundBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  fundsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  fundCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: (width - 44) / 2, // 2 columns dynamically
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  fundName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
  },
  fundBalance: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 16,
  },
  contribBars: {
    gap: 12,
  },
  contribRow: {
    gap: 6,
  },
  contribLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  barOuter: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    width: '100%',
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  txList: {
    gap: 12,
  },
  txItem: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  txType: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  rightTx: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txDelete: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 11,
  },
  txNotes: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 6,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 6,
  },
  reportRowBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    marginBottom: 20,
  },
  reportRowBtnText: {
    fontSize: 13,
    fontWeight: '750',
    color: '#0f766e',
  },
});
