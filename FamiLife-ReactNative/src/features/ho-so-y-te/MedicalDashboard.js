import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useApp } from '../../core/AppContext';
import { getProfileName, getLatestBloodPressure, getLatestBodyComp, getBPCategory } from './utils';

const { width } = Dimensions.get('window');

export default function MedicalDashboard({ navigation }) {
  const { state, updateState } = useApp();
  const { familyProfiles = [], bloodPressureRecords = [], bodyCompositionRecords = [], medicalRecords = [], selectedHealthProfileId = 'p-self' } = state;

  // Ensure default self profile is present in view
  const allProfiles = familyProfiles.length > 0 ? familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];

  // Calculations for current selected member
  const latestBP = getLatestBloodPressure(bloodPressureRecords, selectedHealthProfileId);
  const latestBody = getLatestBodyComp(bodyCompositionRecords, selectedHealthProfileId);
  const activeRecords = (medicalRecords || []).filter(r => !r.deleted_at && (selectedHealthProfileId === 'all' || r.profile_id === selectedHealthProfileId));

  const bpStatus = latestBP ? getBPCategory(latestBP.sys, latestBP.dia) : null;

  const handleProfileSelect = (profileId) => {
    updateState({ selectedHealthProfileId: profileId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Sức Khỏe</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {}}>
          <Text style={styles.addButtonText}>+ Hồ sơ</Text>
        </TouchableOpacity>
      </View>

      {/* Member Profiles Row */}
      <View style={styles.profilesSection}>
        <Text style={styles.sectionLabel}>Thành viên gia đình</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profilesScroll}>
          
          {/* Option: Tất cả */}
          <TouchableOpacity 
            style={[styles.profileAvatarWrapper, selectedHealthProfileId === 'all' && styles.activeAvatarWrapper]}
            onPress={() => handleProfileSelect('all')}
          >
            <View style={[styles.avatarCircle, { backgroundColor: '#e2e8f0' }]}>
              <Text style={styles.avatarText}>👥</Text>
            </View>
            <Text style={[styles.avatarName, selectedHealthProfileId === 'all' && styles.activeAvatarName]}>Tất cả</Text>
          </TouchableOpacity>

          {allProfiles.map((p) => {
            const isSelected = selectedHealthProfileId === p.id;
            const initial = p.name.charAt(0).toUpperCase();
            return (
              <TouchableOpacity 
                key={p.id}
                style={[styles.profileAvatarWrapper, isSelected && styles.activeAvatarWrapper]}
                onPress={() => handleProfileSelect(p.id)}
              >
                <View style={[styles.avatarCircle, { backgroundColor: isSelected ? '#0ea5e9' : '#cbd5e1' }]}>
                  <Text style={[styles.avatarText, isSelected && { color: '#ffffff' }]}>{initial}</Text>
                </View>
                <Text style={[styles.avatarName, isSelected && styles.activeAvatarName]} numberOfLines={1}>
                  {p.name === 'Bản thân' ? 'Bản thân' : p.name.split(' ').pop()}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Add member button */}
          <TouchableOpacity style={styles.profileAvatarWrapper} onPress={() => {}}>
            <View style={[styles.avatarCircle, { backgroundColor: '#f1f5f9', borderStyle: 'dashed', borderWidth: 1, borderColor: '#94a3b8' }]}>
              <Text style={[styles.avatarText, { color: '#64748b' }]}>+</Text>
            </View>
            <Text style={styles.avatarName}>Thêm</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {/* Health Vitals Summary Card */}
      <View style={styles.vitalsSection}>
        
        {/* Blood Pressure Summary Card */}
        <TouchableOpacity style={styles.vitalCard} activeOpacity={0.8} onPress={() => navigation.navigate('BloodPressureList')}>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalTitle}>🩺 Huyết áp & Tim mạch</Text>
            <Text style={styles.vitalArrow}>chevron-right</Text>
          </View>
          {latestBP ? (
            <View style={styles.vitalBody}>
              <View style={styles.bpValuesRow}>
                <View style={styles.bpValBox}>
                  <Text style={styles.bpVal}>{latestBP.sys}</Text>
                  <Text style={styles.bpSub}>Tâm thu (SYS)</Text>
                </View>
                <Text style={styles.bpDivider}>/</Text>
                <View style={styles.bpValBox}>
                  <Text style={styles.bpVal}>{latestBP.dia}</Text>
                  <Text style={styles.bpSub}>Tâm trương (DIA)</Text>
                </View>
                <View style={[styles.bpValBox, { borderLeftWidth: 1, borderColor: '#e2e8f0', paddingLeft: 16 }]}>
                  <Text style={[styles.bpVal, { color: '#64748b' }]}>{latestBP.pulse}</Text>
                  <Text style={styles.bpSub}>Nhịp tim (bpm)</Text>
                </View>
              </View>
              {bpStatus && (
                <View style={[styles.bpStatusBadge, { backgroundColor: bpStatus.color + '15' }]}>
                  <Text style={[styles.bpStatusText, { color: bpStatus.color }]}>● {bpStatus.label}</Text>
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.emptyVitalText}>Chưa có số liệu đo huyết áp. Nhấn để thêm mới.</Text>
          )}
        </TouchableOpacity>

        {/* Body Comp Summary Card */}
        <TouchableOpacity style={styles.vitalCard} activeOpacity={0.8} onPress={() => {}}>
          <View style={styles.vitalHeader}>
            <Text style={styles.vitalTitle}>⚖️ Thể trạng & Cân nặng</Text>
            <Text style={styles.vitalArrow}>chevron-right</Text>
          </View>
          {latestBody ? (
            <View style={styles.vitalBody}>
              <View style={styles.bpValuesRow}>
                <View style={styles.bpValBox}>
                  <Text style={styles.bpVal}>{latestBody.weight} kg</Text>
                  <Text style={styles.bpSub}>Cân nặng</Text>
                </View>
                {latestBody.bmi && (
                  <View style={[styles.bpValBox, { borderLeftWidth: 1, borderColor: '#e2e8f0', paddingLeft: 16 }]}>
                    <Text style={[styles.bpVal, { color: '#0ea5e9' }]}>{latestBody.bmi}</Text>
                    <Text style={styles.bpSub}>Chỉ số BMI</Text>
                  </View>
                )}
                {latestBody.fat_rate && (
                  <View style={[styles.bpValBox, { borderLeftWidth: 1, borderColor: '#e2e8f0', paddingLeft: 16 }]}>
                    <Text style={[styles.bpVal, { color: '#f59e0b' }]}>{latestBody.fat_rate}%</Text>
                    <Text style={styles.bpSub}>Tỷ lệ mỡ</Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={styles.emptyVitalText}>Chưa có chỉ số cơ thể. Nhấn để thêm mới.</Text>
          )}
        </TouchableOpacity>

      </View>

      {/* AI Scanner Feature Highlight Card */}
      <TouchableOpacity style={styles.aiScannerCard} activeOpacity={0.85} onPress={() => {}}>
        <View style={styles.aiTextContainer}>
          <Text style={styles.aiTitle}>🤖 Trợ lý AI Scanner</Text>
          <Text style={styles.aiDesc}>Chụp ảnh kết quả xét nghiệm máu, nước tiểu... Trợ lý AI sẽ tự động đọc chỉ số và phân tích bệnh lý tức thì.</Text>
        </View>
        <View style={styles.aiIconWrapper}>
          <Text style={styles.aiIcon}>⚡</Text>
        </View>
      </TouchableOpacity>

      {/* Medical Records List */}
      <View style={styles.recordsSection}>
        <Text style={styles.sectionTitle}>Hồ sơ khám bệnh ({activeRecords.length})</Text>
        
        {activeRecords.length === 0 ? (
          <Text style={styles.emptyText}>Chưa có bệnh án hay kết quả khám sức khỏe nào.</Text>
        ) : (
          <View style={styles.recordsList}>
            {activeRecords.map((rec, idx) => (
              <TouchableOpacity key={rec.id} style={styles.recordItem} activeOpacity={0.7}>
                <View style={styles.recordHeader}>
                  <Text style={styles.recordName}>{rec.diagnose || 'Khám sức khỏe'}</Text>
                  <Text style={styles.recordMember}>{getProfileName(rec.profile_id, familyProfiles)}</Text>
                </View>
                <Text style={styles.recordHospital}>🏥 {rec.hospital || 'Tự khám / Nơi khác'}</Text>
                <Text style={styles.recordDate}>📅 Ngày khám: {new Date(rec.date).toLocaleDateString('vi-VN')}</Text>
                {rec.notes ? <Text style={styles.recordNotes} numberOfLines={1}>{rec.notes}</Text> : null}
              </TouchableOpacity>
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
  profilesSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '750',
    color: '#475569',
    marginBottom: 10,
  },
  profilesScroll: {
    gap: 14,
    paddingVertical: 4,
  },
  profileAvatarWrapper: {
    alignItems: 'center',
    width: 60,
  },
  activeAvatarWrapper: {
    transform: [{ scale: 1.05 }],
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#475569',
  },
  avatarName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    width: '100%',
  },
  activeAvatarName: {
    color: '#0ea5e9',
    fontWeight: '700',
  },
  vitalsSection: {
    gap: 14,
    marginBottom: 20,
  },
  vitalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#090d16',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  vitalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vitalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  vitalArrow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  vitalBody: {
    width: '100%',
  },
  emptyVitalText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  bpValuesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  bpValBox: {
    justifyContent: 'center',
  },
  bpVal: {
    fontSize: 22,
    fontWeight: '850',
    color: '#0f172a',
    marginBottom: 2,
  },
  bpSub: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  bpDivider: {
    fontSize: 24,
    fontWeight: '300',
    color: '#cbd5e1',
  },
  bpStatusBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bpStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  aiScannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  aiTextContainer: {
    flex: 1,
    marginRight: 16,
  },
  aiTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 4,
  },
  aiDesc: {
    fontSize: 12,
    color: '#14532d',
    lineHeight: 18,
    fontWeight: '500',
  },
  aiIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#bbf7d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiIcon: {
    fontSize: 20,
  },
  recordsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  recordsList: {
    gap: 14,
  },
  recordItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recordName: {
    fontSize: 15,
    fontWeight: '750',
    color: '#0f172a',
    flex: 1,
  },
  recordMember: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0ea5e9',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  recordHospital: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 4,
    fontWeight: '550',
  },
  recordDate: {
    fontSize: 11,
    color: '#64748b',
  },
  recordNotes: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
