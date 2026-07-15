import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { getProfileName } from './utils';

const { width } = Dimensions.get('window');

export default function BodyCompositionList({ navigation }) {
  const { state, updateState } = useApp();
  const { bodyCompositionRecords = [], familyProfiles = [], selectedHealthProfileId = 'p-self' } = state;

  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter active (not deleted) records for selected member
  const activeRecords = bodyCompositionRecords.filter(r => !r.deleted_at);
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
      'Bạn có chắc chắn muốn xóa bản ghi chỉ số cơ thể này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            const updated = bodyCompositionRecords.map(r => {
              if (r.id === id) {
                return { ...r, deleted_at: new Date().toISOString() };
              }
              return r;
            });
            await updateState({ bodyCompositionRecords: updated });
            Alert.alert('Thành công', 'Đã xóa chỉ số cơ thể.');
          }
        }
      ]
    );
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return { label: 'Không xác định', color: '#64748b' };
    if (bmi < 18.5) return { label: 'Gầy', color: '#0ea5e9' };
    if (bmi >= 18.5 && bmi < 24.9) return { label: 'Bình thường', color: '#10b981' };
    if (bmi >= 25 && bmi < 29.9) return { label: 'Tiền béo phì', color: '#f59e0b' };
    return { label: 'Béo phì', color: '#ef4444' };
  };

  const renderItem = ({ item }) => {
    const bmiStatus = getBMICategory(item.bmi);
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
              {item.weight} kg {item.bmi ? `(BMI: ${item.bmi})` : ''}
            </Text>
            <Text style={styles.cardDate}>{dateFormatted} • {getProfileName(item.profile_id, familyProfiles)}</Text>
          </View>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRecord(item.id)}>
            <Text style={styles.deleteIconText}>🗑️</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          {item.bmi && (
            <View style={[styles.statusBadge, { backgroundColor: bmiStatus.color + '15' }]}>
              <Text style={[styles.statusText, { color: bmiStatus.color }]}>● Thể trạng: {bmiStatus.label}</Text>
            </View>
          )}
          
          <View style={styles.gridDetails}>
            {item.fat_rate ? (
              <Text style={styles.detailText}>Tỷ lệ mỡ: <Text style={styles.detailValue}>{item.fat_rate}%</Text></Text>
            ) : null}
            {item.muscle_mass ? (
              <Text style={styles.detailText}>Cơ xương: <Text style={styles.detailValue}>{item.muscle_mass} kg</Text></Text>
            ) : null}
            {item.visceral_fat ? (
              <Text style={styles.detailText}>Mỡ nội tạng: <Text style={styles.detailValue}>{item.visceral_fat}</Text></Text>
            ) : null}
            {item.water_rate ? (
              <Text style={styles.detailText}>Tỷ lệ nước: <Text style={styles.detailValue}>{item.water_rate}%</Text></Text>
            ) : null}
          </View>

          {item.notes ? (
            <Text style={styles.cardNotes}>Ghi chú: {item.notes}</Text>
          ) : null}
        </View>
      </View>
    );
  };

  // Find max weight in 7 records to calculate chart heights
  const chartRecords = [...filteredRecords]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-7);
  const maxWeight = Math.max(...chartRecords.map(r => Number(r.weight || 0)), 100);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉ số Cơ thể</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('BodyCompositionForm', { mode: 'create', profileId: selectedHealthProfileId })}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Weight Trend Chart */}
      {chartRecords.length > 1 && (
        <View style={styles.graphCard}>
          <Text style={styles.graphTitle}>Biến động cân nặng (kg)</Text>
          <View style={styles.barsContainer}>
            {chartRecords.map((r, idx) => {
              const barHeight = `${Math.min((r.weight / maxWeight) * 80, 80)}%`;
              return (
                <View key={r.id || idx} style={styles.graphCol}>
                  <View style={styles.doubleBar}>
                    <View style={[styles.bar, { height: barHeight, backgroundColor: '#0ea5e9' }]} />
                  </View>
                  <Text style={styles.weightLabelText}>{r.weight}</Text>
                  <Text style={styles.colLabel}>{new Date(r.date).getDate()}/{new Date(r.date).getMonth() + 1}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* List of body records */}
      <FlatList
        data={paginatedRecords}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có chỉ số cơ thể nào được ghi nhận cho thành viên này.</Text>
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
    backgroundColor: '#0ea5e9',
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
  },
  graphCol: {
    alignItems: 'center',
    flex: 1,
  },
  doubleBar: {
    height: 70,
    width: 24,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 14,
    borderRadius: 4,
  },
  weightLabelText: {
    fontSize: 10,
    fontWeight: '750',
    color: '#0f172a',
    marginTop: 4,
  },
  colLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
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
    gap: 8,
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
  gridDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
    width: '45%',
  },
  detailValue: {
    fontWeight: '700',
    color: '#334155',
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
