import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { getProfileName, getBPCategory } from './utils';

const { width } = Dimensions.get('window');

export default function BloodPressureList({ navigation }) {
  const { state, updateState } = useApp();
  const { bloodPressureRecords = [], familyProfiles = [], selectedHealthProfileId = 'p-self' } = state;

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter active (not deleted) records for selected member
  const activeRecords = bloodPressureRecords.filter(r => !r.deleted_at);
  const filteredRecords = selectedHealthProfileId === 'all' 
    ? activeRecords 
    : activeRecords.filter(r => r.profile_id === selectedHealthProfileId);

  // Sort descending by date
  const sortedRecords = [...filteredRecords].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));

  // Pagination
  const totalPages = Math.max(Math.ceil(sortedRecords.length / itemsPerPage), 1);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleDeleteRecord = (id) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa chỉ số đo huyết áp này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            const updated = bloodPressureRecords.map(r => {
              if (r.id === id) {
                return { ...r, deleted_at: new Date().toISOString() };
              }
              return r;
            });
            await updateState({ bloodPressureRecords: updated });
            Alert.alert('Thành công', 'Đã xóa chỉ số đo.');
          }
        }
      ]
    );
  };

  const renderBPItem = ({ item }) => {
    const status = getBPCategory(item.sys, item.dia);
    const dateFormatted = new Date(item.date).toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>
              SYS {item.sys} / DIA {item.dia} <Text style={styles.pulseText}>❤️ {item.pulse}</Text>
            </Text>
            <Text style={styles.cardDate}>{dateFormatted} • {getProfileName(item.profile_id, familyProfiles)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRecord(item.id)}>
            <Text style={styles.deleteIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <View style={[styles.statusBadge, { backgroundColor: status.color + '15' }]}>
            <Text style={[styles.statusText, { color: status.color }]}>● {status.label}</Text>
          </View>
          {item.irregular_heartbeat ? (
            <View style={styles.irregularBadge}>
              <Text style={styles.irregularText}>⚠️ Phát hiện nhịp tim không đều (Omron)</Text>
            </View>
          ) : null}
          {item.notes ? (
            <Text style={styles.cardNotes}>Ghi chú: {item.notes}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nhật ký Huyết áp</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('BloodPressureForm', { mode: 'create', profileId: selectedHealthProfileId })}
        >
          <Text style={styles.addButtonText}>+ Đo</Text>
        </TouchableOpacity>
      </View>

      {/* Vitals Graph (Native view visual bars representing sys/dia trends) */}
      {filteredRecords.length > 1 && (
        <View style={styles.graphCard}>
          <Text style={styles.graphTitle}>Xu hướng huyết áp (Gần nhất)</Text>
          <View style={styles.barsContainer}>
            {[...filteredRecords]
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .slice(-7)
              .map((r, idx) => {
                const sysHeight = `${Math.min((r.sys / 200) * 100, 100)}%`;
                const diaHeight = `${Math.min((r.dia / 200) * 100, 100)}%`;
                const status = getBPCategory(r.sys, r.dia);

                return (
                  <View key={r.id || idx} style={styles.graphCol}>
                    <View style={styles.doubleBar}>
                      <View style={[styles.bar, { height: sysHeight, backgroundColor: status.color, opacity: 0.85 }]} />
                      <View style={[styles.bar, { height: diaHeight, backgroundColor: '#38bdf8' }]} />
                    </View>
                    <Text style={styles.colLabel}>{new Date(r.date).getDate()}/{new Date(r.date).getMonth() + 1}</Text>
                  </View>
                );
              })}
          </View>
          <View style={styles.graphLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.legendText}>SYS (Tâm thu)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#38bdf8' }]} />
              <Text style={styles.legendText}>DIA (Tâm trương)</Text>
            </View>
          </View>
        </View>
      )}

      {/* FlatList of records */}
      <FlatList
        data={paginatedRecords}
        renderItem={renderBPItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có bản ghi đo huyết áp nào của thành viên này.</Text>
          </View>
        }
      />

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <View style={styles.pagination}>
          <TouchableOpacity 
            style={[styles.pageBtn, page === 1 && styles.disabledPageBtn]} 
            onPress={() => handlePageChange(page - 1)}
            disabled={page === 1}
          >
            <Text style={styles.pageBtnText}>Trước</Text>
          </TouchableOpacity>
          
          <Text style={styles.pageIndicator}>Trang {page} / {totalPages}</Text>
          
          <TouchableOpacity 
            style={[styles.pageBtn, page === totalPages && styles.disabledPageBtn]} 
            onPress={() => handlePageChange(page + 1)}
            disabled={page === totalPages}
          >
            <Text style={styles.pageBtnText}>Sau</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
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
    backgroundColor: '#ef4444',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  graphCard: {
    backgroundColor: '#ffffff',
    margin: 12,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  graphTitle: {
    fontSize: 13,
    fontWeight: '750',
    color: '#475569',
    marginBottom: 16,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 100,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  graphCol: {
    alignItems: 'center',
    flex: 1,
  },
  doubleBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    height: 80,
    width: 24,
    justifyContent: 'center',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 6,
  },
  graphLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  pulseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f43f5e',
  },
  cardDate: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconText: {
    fontSize: 14,
  },
  cardBody: {
    gap: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  irregularBadge: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  irregularText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  cardNotes: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
  },
  pageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  disabledPageBtn: {
    opacity: 0.5,
  },
  pageBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  pageIndicator: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
});
