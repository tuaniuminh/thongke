import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { generateMonthlyReportData } from './reportUtils';
import { formatVND } from '../thu-chi-doi-ngoai/utils';

const { width } = Dimensions.get('window');
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2024, 2025, 2026, 2027];

export default function MonthlyReportScreen({ navigation }) {
  const { state } = useApp();
  const { fundTransactions = [] } = state;

  // Selected Date state
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Report calculations
  const report = generateMonthlyReportData(selectedMonth, selectedYear, fundTransactions);
  const { totalInflow, totalOutflow, surplus, husbandContrib, wifeContrib, categorySpending, advice, adviceColor } = report;

  const totalContrib = husbandContrib + wifeContrib;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Quỹ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Báo Cáo Tài Chính</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Date selectors rows */}
      <View style={styles.selectorsCard}>
        <Text style={styles.selectorLabel}>Chọn thời gian báo cáo</Text>
        
        {/* Month selector scroll row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthsScroll}>
          {MONTHS.map((m) => (
            <TouchableOpacity 
              key={m}
              style={[styles.dateChip, selectedMonth === m && styles.activeDateChip]}
              onPress={() => setSelectedMonth(m)}
            >
              <Text style={[styles.dateChipText, selectedMonth === m && styles.activeDateChipText]}>Tháng {m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Year selector row */}
        <View style={styles.yearsRow}>
          {YEARS.map((y) => (
            <TouchableOpacity 
              key={y}
              style={[styles.yearChip, selectedYear === y && styles.activeYearChip]}
              onPress={() => setSelectedYear(y)}
            >
              <Text style={[styles.yearChipText, selectedYear === y && styles.activeYearChipText]}>Năm {y}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Financial Summary KPIs */}
      <View style={styles.kpisSection}>
        <View style={styles.kpiRow}>
          
          {/* Inflow Card */}
          <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.kpiLabel}>🟢 Tổng thu nhập</Text>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{formatVND(totalInflow)}</Text>
          </View>

          {/* Outflow Card */}
          <View style={[styles.kpiCard, { borderLeftColor: '#f43f5e' }]}>
            <Text style={styles.kpiLabel}>🔴 Tổng chi tiêu</Text>
            <Text style={[styles.kpiValue, { color: '#f43f5e' }]}>{formatVND(totalOutflow)}</Text>
          </View>

        </View>

        {/* Net Surplus Card */}
        <View style={[styles.surplusCard, { backgroundColor: surplus >= 0 ? '#f0fdf4' : '#fef2f2', borderColor: surplus >= 0 ? '#bbf7d0' : '#fecaca' }]}>
          <Text style={[styles.surplusLabel, { color: surplus >= 0 ? '#166534' : '#991b1b' }]}>
            {surplus >= 0 ? '💰 Thặng dư tích lũy' : '⚠️ Thâm hụt tài chính'}
          </Text>
          <Text style={[styles.surplusVal, { color: surplus >= 0 ? '#15803d' : '#b91c1c' }]}>
            {surplus >= 0 ? '+' : ''}{formatVND(surplus)}
          </Text>
        </View>
      </View>

      {/* System Financial Insights */}
      <View style={[styles.insightCard, { borderColor: adviceColor + '30', borderLeftColor: adviceColor }]}>
        <Text style={[styles.insightTitle, { color: adviceColor }]}>💡 Nhận định từ hệ thống</Text>
        <Text style={styles.insightText}>{advice}</Text>
      </View>

      {/* Month Contribution Share */}
      {totalContrib > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Đóng góp trong tháng</Text>
          <Text style={styles.sectionSub}>Tổng đóng góp tháng {selectedMonth}: {formatVND(totalContrib)}</Text>

          <View style={styles.contribRow}>
            <Text style={styles.contribLabel}>Chồng (Nick): {formatVND(husbandContrib)} ({(husbandContrib / totalContrib * 100).toFixed(0)}%)</Text>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { width: `${(husbandContrib / totalContrib) * 100}%`, backgroundColor: '#0ea5e9' }]} />
            </View>
          </View>

          <View style={styles.contribRow}>
            <Text style={styles.contribLabel}>Vợ: {formatVND(wifeContrib)} ({(wifeContrib / totalContrib * 100).toFixed(0)}%)</Text>
            <View style={styles.barOuter}>
              <View style={[styles.barInner, { width: `${(wifeContrib / totalContrib) * 100}%`, backgroundColor: '#ec4899' }]} />
            </View>
          </View>
        </View>
      )}

      {/* Spending Breakdown */}
      {categorySpending.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phân bổ chi tiêu</Text>
          <Text style={styles.sectionSub}>Nhóm các khoản chi tiêu chính phát sinh trong tháng</Text>

          <View style={styles.breakdownList}>
            {categorySpending.map((cat, idx) => {
              const pct = totalOutflow > 0 ? (cat.value / totalOutflow) * 100 : 0;
              return (
                <View key={idx} style={styles.breakdownItem}>
                  <View style={styles.breakdownHeader}>
                    <Text style={styles.breakdownName}>🛍️ {cat.name}</Text>
                    <Text style={styles.breakdownAmt}>{formatVND(cat.value)} ({pct.toFixed(0)}%)</Text>
                  </View>
                  <View style={styles.barOuter}>
                    <View style={[styles.barInner, { width: `${pct}%`, backgroundColor: '#f43f5e' }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

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
  selectorsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    gap: 12,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '750',
    color: '#64748b',
  },
  monthsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  dateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeDateChip: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  dateChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeDateChipText: {
    color: '#ffffff',
  },
  yearsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 12,
  },
  yearChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeYearChip: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  yearChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  activeYearChipText: {
    color: '#ffffff',
  },
  kpisSection: {
    gap: 12,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  surplusCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  surplusLabel: {
    fontSize: 12,
    fontWeight: '750',
    marginBottom: 4,
  },
  surplusVal: {
    fontSize: 22,
    fontWeight: '850',
  },
  insightCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    marginBottom: 24,
    gap: 6,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  insightText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontWeight: '550',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  sectionSub: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 16,
  },
  contribRow: {
    marginBottom: 12,
    gap: 4,
  },
  contribLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  barOuter: {
    height: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  barInner: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownList: {
    gap: 14,
  },
  breakdownItem: {
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  breakdownAmt: {
    fontSize: 12,
    fontWeight: '750',
    color: '#0f172a',
  },
});
