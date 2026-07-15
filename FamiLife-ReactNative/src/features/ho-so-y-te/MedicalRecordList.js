import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { getProfileName } from './utils';

const { width } = Dimensions.get('window');

export default function MedicalRecordList({ navigation }) {
  const { state, updateState } = useApp();
  const { medicalRecords = [], familyProfiles = [], selectedHealthProfileId = 'p-self' } = state;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter active records for selected member
  const activeRecords = medicalRecords.filter(r => !r.deleted_at);
  const memberRecords = selectedHealthProfileId === 'all'
    ? activeRecords
    : activeRecords.filter(r => r.profile_id === selectedHealthProfileId);

  // Search filter
  const filteredRecords = memberRecords.filter(r => {
    const matchesSearch = (r.diagnose || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.hospital || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.notes || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.prescription || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  // Sort descending by date
  const sortedRecords = [...filteredRecords].sort((a, b) => new Date(b.date) - new Date(a.date));

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
      'Bạn có chắc chắn muốn xóa hồ sơ khám bệnh này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xóa', 
          style: 'destructive',
          onPress: async () => {
            const updated = medicalRecords.map(r => {
              if (r.id === id) {
                return { ...r, deleted_at: new Date().toISOString() };
              }
              return r;
            });
            await updateState({ medicalRecords: updated });
            Alert.alert('Thành công', 'Đã xóa hồ sơ y khoa.');
          }
        }
      ]
    );
  };

  const renderItem = ({ item }) => {
    const dateFormatted = new Date(item.date).toLocaleDateString('vi-VN');
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.cardTitle}>{item.diagnose || 'Khám sức khỏe'}</Text>
            <Text style={styles.cardSub}>🏥 {item.hospital || 'Tự khám / Nơi khác'}</Text>
          </View>
          <View style={styles.rightHeader}>
            <Text style={styles.memberTag}>{getProfileName(item.profile_id, familyProfiles)}</Text>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRecord(item.id)}>
              <Text style={styles.deleteText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.dateText}>📅 Ngày khám: {dateFormatted}</Text>
          
          {item.prescription ? (
            <View style={styles.prescriptionBox}>
              <Text style={styles.prescriptionTitle}>💊 Đơn thuốc kê toa:</Text>
              <Text style={styles.prescriptionContent}>{item.prescription}</Text>
            </View>
          ) : null}

          {item.notes ? (
            <Text style={styles.cardNotes}>Ghi chú: {item.notes}</Text>
          ) : null}
          
          {item.image_url ? (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>📸 Đã lưu 1 ảnh kết quả y bạ</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.editBtn}
            onPress={() => navigation.navigate('MedicalRecordForm', { mode: 'edit', recordId: item.id })}
          >
            <Text style={styles.editBtnText}>✏️ Chỉnh sửa</Text>
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Hồ sơ Khám bệnh</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('MedicalRecordForm', { mode: 'create', profileId: selectedHealthProfileId })}
        >
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Section */}
      <View style={styles.filterSection}>
        <TextInput 
          style={styles.searchBar}
          placeholder="Tìm tên bệnh, bệnh viện, đơn thuốc..."
          value={search}
          onChangeText={(text) => { setSearch(text); setPage(1); }}
        />
      </View>

      {/* List of medical records */}
      <FlatList
        data={paginatedRecords}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Chưa có hồ sơ khám bệnh nào khớp bộ lọc tìm kiếm.</Text>
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
  filterSection: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBar: {
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  cardSub: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '550',
  },
  rightHeader: {
    alignItems: 'flex-end',
    gap: 6,
  },
  memberTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
    backgroundColor: '#ccfbf1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    fontSize: 12,
  },
  cardBody: {
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  prescriptionBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  prescriptionTitle: {
    fontSize: 12,
    fontWeight: '750',
    color: '#0f172a',
    marginBottom: 4,
  },
  prescriptionContent: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  cardNotes: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  imagePlaceholder: {
    backgroundColor: '#f0fdf4',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  imagePlaceholderText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '700',
  },
  cardActions: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 10,
    marginTop: 10,
    alignItems: 'flex-end',
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
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
