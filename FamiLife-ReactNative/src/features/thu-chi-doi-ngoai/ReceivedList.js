import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { formatVND, formatDate } from './utils';

const { width } = Dimensions.get('window');

const RELATIONSHIPS = ['Tất cả', 'Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Khác'];
const STATUSES = [
  { label: 'Tất cả trạng thái', value: '' },
  { label: 'Chưa trả lễ', value: 'pending' },
  { label: 'Đã trả lễ', value: 'returned' }
];

export default function ReceivedList({ navigation }) {
  const { state, updateState } = useApp();
  const { receivedGifts = [] } = state;

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedRel, setSelectedRel] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Filter logic
  const activeGifts = receivedGifts.filter(g => !g.deleted_at);
  
  const filteredGifts = activeGifts.filter(gift => {
    const matchesSearch = (gift.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          (gift.notes || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesRel = selectedRel === 'Tất cả' || gift.relationship === selectedRel;
    
    const matchesStatus = selectedStatus === '' || gift.status === selectedStatus;
    
    return matchesSearch && matchesRel && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.max(Math.ceil(filteredGifts.length / itemsPerPage), 1);
  const startIndex = (page - 1) * itemsPerPage;
  const paginatedGifts = filteredGifts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const toggleGiftStatus = (giftId, currentStatus) => {
    const nextStatus = currentStatus === 'pending' ? 'returned' : 'pending';
    const updatedGifts = receivedGifts.map(g => {
      if (g.id === giftId) {
        return { ...g, status: nextStatus, updated_at: new Date().toISOString() };
      }
      return g;
    });
    updateState({ receivedGifts: updatedGifts });
  };

  const renderGiftItem = ({ item }) => (
    <View style={styles.giftCard}>
      <View style={styles.giftHeader}>
        <View style={styles.giftNameWrapper}>
          <Text style={styles.giftName}>{item.name}</Text>
          <Text style={styles.giftRel}>{item.relationship}</Text>
        </View>
        <Text style={styles.giftAmount}>{formatVND(item.amount)}</Text>
      </View>

      <View style={styles.giftDetails}>
        <Text style={styles.giftMeta}>Sự kiện: <Text style={styles.metaValue}>{item.event_type}</Text></Text>
        <Text style={styles.giftMeta}>Ngày nhận: <Text style={styles.metaValue}>{formatDate(item.date)}</Text></Text>
        {item.notes ? <Text style={styles.giftNotes}>Ghi chú: {item.notes}</Text> : null}
        {item.gift_type === 'gold' && item.gold_amount > 0 ? (
          <Text style={styles.goldBadge}>🏅 {item.gold_amount} chỉ vàng</Text>
        ) : null}
      </View>

      <View style={styles.giftActions}>
        <TouchableOpacity 
          style={[styles.statusBtn, { backgroundColor: item.status === 'returned' ? '#e0f2fe' : '#fef3c7' }]}
          onPress={() => toggleGiftStatus(item.id, item.status)}
        >
          <Text style={[styles.statusBtnText, { color: item.status === 'returned' ? '#0369a1' : '#b45309' }]}>
            {item.status === 'returned' ? '✓ Đã trả lễ' : '⏳ Chưa trả lễ'}
          </Text>
        </TouchableOpacity>

        {/* Placeholder for Edit/Delete */}
        <View style={styles.rightActions}>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.actionIconText}>✏️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiền tôi nhận</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {}}>
          <Text style={styles.addButtonText}>+ Thêm</Text>
        </TouchableOpacity>
      </View>

      {/* Filters Area */}
      <View style={styles.filterSection}>
        {/* Search bar */}
        <TextInput 
          style={styles.searchBar}
          placeholder="Tìm tên người mừng, ghi chú..."
          value={search}
          onChangeText={(text) => { setSearch(text); setPage(1); }}
        />

        {/* Relationship filter scrollable row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relScroll}>
          {RELATIONSHIPS.map((rel) => (
            <TouchableOpacity 
              key={rel} 
              style={[styles.filterChip, selectedRel === rel && styles.activeChip]}
              onPress={() => { setSelectedRel(rel); setPage(1); }}
            >
              <Text style={[styles.chipText, selectedRel === rel && styles.activeChipText]}>{rel}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status filters row */}
        <View style={styles.statusFilters}>
          {STATUSES.map((st) => (
            <TouchableOpacity 
              key={st.value} 
              style={[styles.statusChip, selectedStatus === st.value && styles.activeStatusChip]}
              onPress={() => { setSelectedStatus(st.value); setPage(1); }}
            >
              <Text style={[styles.statusChipText, selectedStatus === st.value && styles.activeStatusChipText]}>
                {st.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gifts List */}
      <FlatList 
        data={paginatedGifts}
        renderItem={renderGiftItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Không tìm thấy khoản tiền nhận nào khớp bộ lọc.</Text>
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
    backgroundColor: '#10b981',
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
    gap: 10,
  },
  searchBar: {
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  relScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeChip: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  activeChipText: {
    color: '#ffffff',
  },
  statusFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeStatusChip: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeStatusChipText: {
    color: '#ffffff',
  },
  listContent: {
    padding: 12,
    gap: 12,
  },
  giftCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  giftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  giftNameWrapper: {
    flex: 1,
  },
  giftName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  giftRel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  giftAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  giftDetails: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    gap: 4,
    marginBottom: 10,
  },
  giftMeta: {
    fontSize: 13,
    color: '#64748b',
  },
  metaValue: {
    fontWeight: '600',
    color: '#334155',
  },
  giftNotes: {
    fontSize: 13,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 2,
  },
  goldBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
    backgroundColor: '#fffbeb',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  giftActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rightActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconText: {
    fontSize: 14,
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
