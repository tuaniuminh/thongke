import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Switch, Dimensions } from 'react-native';
import { useApp } from '../core/AppContext';

const { width } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
  const { state, updateState } = useApp();
  const { 
    geminiApiKey = '', 
    spouseEmail = '', 
    spouseRole = 'wife',
    masterPassword = '',
    familyProfiles = []
  } = state;

  // Local Form state
  const [apiKey, setApiKey] = useState(geminiApiKey);
  const [emailSpouse, setEmailSpouse] = useState(spouseEmail);
  const [roleSpouse, setRoleSpouse] = useState(spouseRole);
  const [passMaster, setPassMaster] = useState(masterPassword);

  // Profile Form state (for adding/editing family members)
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null); // null means adding
  const [memberName, setMemberName] = useState('');
  const [memberHeight, setMemberHeight] = useState('');
  const [memberWeight, setMemberWeight] = useState('');
  const [memberBirthYear, setMemberBirthYear] = useState('');
  const [memberGender, setMemberGender] = useState('male'); // male, female

  const handleSaveSettings = async () => {
    try {
      await updateState({
        geminiApiKey: apiKey.trim(),
        spouseEmail: emailSpouse.trim(),
        spouseRole: roleSpouse,
        masterPassword: passMaster.trim()
      });
      Alert.alert('Thành công', 'Đã lưu cấu hình cài đặt.');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt.');
    }
  };

  const handleOpenAddMember = () => {
    setEditingMemberId(null);
    setMemberName('');
    setMemberHeight('');
    setMemberWeight('');
    setMemberBirthYear('');
    setMemberGender('male');
    setIsEditingMember(true);
  };

  const handleOpenEditMember = (member) => {
    setEditingMemberId(member.id);
    setMemberName(member.name || '');
    setMemberHeight(String(member.height || ''));
    setMemberWeight(String(member.weight || ''));
    setMemberBirthYear(String(member.birth_year || ''));
    setMemberGender(member.gender || 'male');
    setIsEditingMember(true);
  };

  const handleSaveMember = async () => {
    if (!memberName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên thành viên.');
      return;
    }

    const memberData = {
      name: memberName.trim(),
      height: Number(memberHeight) || null,
      weight: Number(memberWeight) || null,
      birth_year: Number(memberBirthYear) || null,
      gender: memberGender,
      updated_at: new Date().toISOString()
    };

    let updatedProfiles = [...familyProfiles];

    if (editingMemberId === null) {
      // Add new member
      const newMember = {
        ...memberData,
        id: 'p-' + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      };
      updatedProfiles.push(newMember);
    } else {
      // Edit existing member
      updatedProfiles = updatedProfiles.map(p => p.id === editingMemberId ? { ...p, ...memberData } : p);
    }

    await updateState({ familyProfiles: updatedProfiles });
    setIsEditingMember(false);
    Alert.alert('Thành công', 'Đã lưu thông tin thành viên.');
  };

  const handleDeleteMember = (id) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa thành viên gia đình này không? (Số liệu sức khỏe sẽ được giữ lại)',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const updated = familyProfiles.filter(p => p.id !== id);
            await updateState({ familyProfiles: updated });
            Alert.alert('Thành công', 'Đã xóa thành viên.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu Hình Cài Đặt</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 1. Account & Connection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tài khoản & Liên kết</Text>
        <View style={styles.settingsCard}>
          
          {/* Gemini API Key */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gemini AI API Key</Text>
            <TextInput 
              style={styles.input}
              placeholder="Nhập API Key để giải mã xét nghiệm..."
              secureTextEntry
              value={apiKey}
              onChangeText={setApiKey}
            />
            <Text style={styles.helpText}>Dùng cho module y tế để AI phân tích kết quả xét nghiệm.</Text>
          </View>

          {/* Master Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu chủ (Master Password)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Mật khẩu mã hóa bảo mật..."
              secureTextEntry
              value={passMaster}
              onChangeText={setPassMaster}
            />
          </View>

          {/* Spouse Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Vợ / Chồng liên kết</Text>
            <TextInput 
              style={styles.input}
              placeholder="spouse@gmail.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailSpouse}
              onChangeText={setEmailSpouse}
            />
          </View>

          {/* Spouse Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vai trò của vợ/chồng trên thiết bị này</Text>
            <View style={styles.roleRow}>
              <TouchableOpacity 
                style={[styles.roleBtn, roleSpouse === 'wife' && styles.activeRoleBtn]}
                onPress={() => setRoleSpouse('wife')}
              >
                <Text style={[styles.roleBtnText, roleSpouse === 'wife' && styles.activeRoleBtnText]}>Vợ</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.roleBtn, roleSpouse === 'husband' && styles.activeRoleBtn]}
                onPress={() => setRoleSpouse('husband')}
              >
                <Text style={[styles.roleBtnText, roleSpouse === 'husband' && styles.activeRoleBtnText]}>Chồng</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSettings}>
            <Text style={styles.saveBtnText}>Lưu cấu hình</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* 2. Family Profiles Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thành viên gia đình</Text>
          <TouchableOpacity style={styles.addMemberBtn} onPress={handleOpenAddMember}>
            <Text style={styles.addMemberBtnText}>+ Thêm thành viên</Text>
          </TouchableOpacity>
        </View>

        {/* Members Management Form (Conditional) */}
        {isEditingMember && (
          <View style={styles.memberFormCard}>
            <Text style={styles.memberFormTitle}>{editingMemberId ? 'Sửa thành viên' : 'Thêm thành viên mới'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và Tên</Text>
              <TextInput 
                style={styles.input}
                placeholder="Ví dụ: Bố, Mẹ, Bé Bo..."
                value={memberName}
                onChangeText={setMemberName}
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Chiều cao (cm)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="170"
                  keyboardType="numeric"
                  value={memberHeight}
                  onChangeText={setMemberHeight}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Cân nặng (kg)</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="65"
                  keyboardType="numeric"
                  value={memberWeight}
                  onChangeText={setMemberWeight}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Năm sinh</Text>
                <TextInput 
                  style={styles.input}
                  placeholder="1995"
                  keyboardType="numeric"
                  value={memberBirthYear}
                  onChangeText={setMemberBirthYear}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Giới tính</Text>
                <View style={styles.roleRow}>
                  <TouchableOpacity 
                    style={[styles.genderBtn, memberGender === 'male' && styles.activeGenderBtn]}
                    onPress={() => setMemberGender('male')}
                  >
                    <Text style={[styles.genderBtnText, memberGender === 'male' && styles.activeGenderBtnText]}>Nam</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, memberGender === 'female' && styles.activeGenderBtn]}
                    onPress={() => setMemberGender('female')}
                  >
                    <Text style={[styles.genderBtnText, memberGender === 'female' && styles.activeGenderBtnText]}>Nữ</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.memberFormActions}>
              <TouchableOpacity style={styles.cancelMemberBtn} onPress={() => setIsEditingMember(false)}>
                <Text style={styles.cancelMemberBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveMemberBtn} onPress={handleSaveMember}>
                <Text style={styles.saveMemberBtnText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Family profiles list */}
        {familyProfiles.length === 0 ? (
          <Text style={styles.emptyText}>Chưa tạo thành viên gia đình nào ngoài bạn.</Text>
        ) : (
          <View style={styles.membersList}>
            {familyProfiles.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberInfo}>
                    {member.gender === 'male' ? 'Nam' : 'Nữ'} • {member.birth_year ? `Năm sinh: ${member.birth_year}` : ''}
                  </Text>
                  <Text style={styles.memberInfo}>
                    Chiều cao: {member.height ? `${member.height}cm` : '--'} • Cân nặng: {member.weight ? `${member.weight}kg` : '--'}
                  </Text>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditMember(member)}>
                    <Text style={styles.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMember(member.id)}>
                    <Text style={styles.deleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
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
  section: {
    marginBottom: 28,
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
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '750',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  helpText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '550',
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  activeRoleBtn: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  activeRoleBtnText: {
    color: '#ffffff',
  },
  saveBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '750',
    color: '#ffffff',
  },
  addMemberBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
  },
  addMemberBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  memberFormCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 16,
    gap: 14,
  },
  memberFormTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0ea5e9',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  genderBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  activeGenderBtn: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  genderBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activeGenderBtnText: {
    color: '#ffffff',
  },
  memberFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 6,
  },
  cancelMemberBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  cancelMemberBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  saveMemberBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#0ea5e9',
  },
  saveMemberBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 14,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  memberInfo: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '550',
  },
  memberActions: {
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
  editBtnText: {
    fontSize: 12,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: 12,
  },
});
