import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Switch, Dimensions } from 'react-native';
import { useApp } from '../core/AppContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function SettingsScreen({ navigation }) {
  const { 
    state, 
    updateState, 
    setupSupabaseConnection, 
    performSync, 
    login, 
    register, 
    logout,
    sendSpouseInvitation,
    declineSpouseInvitation
  } = useApp();

  const { 
    geminiApiKey = '', 
    spouseEmail = '', 
    spouseRole = 'wife',
    masterPassword = '',
    familyProfiles = [],
    supabaseUrl = '',
    supabaseKey = '',
    user = null,
    spouseStatus = ''
  } = state;

  // Local Form state
  const [apiKey, setApiKey] = useState(geminiApiKey);
  const [emailSpouse, setEmailSpouse] = useState(spouseEmail);
  const [roleSpouse, setRoleSpouse] = useState(spouseRole);
  const [passMaster, setPassMaster] = useState(masterPassword);

  // Supabase Configuration Form state
  const [sUrl, setSUrl] = useState(supabaseUrl);
  const [sKey, setSKey] = useState(supabaseKey);

  // Supabase Authentication Form state
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Profile Form state (for family profiles management)
  const [isEditingMember, setIsEditingMember] = useState(false);
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberName, setMemberName] = useState('');
  const [memberHeight, setMemberHeight] = useState('');
  const [memberWeight, setMemberWeight] = useState('');
  const [memberBirthYear, setMemberBirthYear] = useState('');
  const [memberGender, setMemberGender] = useState('male');

  useEffect(() => {
    setApiKey(geminiApiKey);
    setEmailSpouse(spouseEmail);
    setRoleSpouse(spouseRole);
    setPassMaster(masterPassword);
    setSUrl(supabaseUrl);
    setSKey(supabaseKey);
  }, [geminiApiKey, spouseEmail, spouseRole, masterPassword, supabaseUrl, supabaseKey]);

  // Save Local Config Settings
  const handleSaveSettings = async () => {
    try {
      await updateState({
        geminiApiKey: apiKey.trim(),
        masterPassword: passMaster.trim()
      });
      Alert.alert('Thành công', 'Đã lưu cấu hình khóa học.');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể lưu cài đặt.');
    }
  };

  // Connect Supabase Database
  const handleConnectSupabase = async () => {
    if (!sUrl.trim() || !sKey.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ URL và Key của Supabase.');
      return;
    }
    const success = await setupSupabaseConnection(sUrl.trim(), sKey.trim());
    if (success) {
      Alert.alert('Thành công', 'Đã kết nối thành công tới Supabase Database của bạn!');
    } else {
      Alert.alert('Lỗi', 'Không thể kết nối. Vui lòng kiểm tra lại cấu hình.');
    }
  };

  // Handle Authentication (SignIn / SignUp)
  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }
    try {
      if (isRegisterMode) {
        await register(authEmail.trim(), authPassword.trim());
        Alert.alert('Đăng ký thành công', 'Bạn đã tạo tài khoản thành công! Hãy chuyển sang Đăng nhập.');
        setIsRegisterMode(false);
      } else {
        await login(authEmail.trim(), authPassword.trim());
        Alert.alert('Đăng nhập thành công', 'Chào mừng bạn đã đăng nhập và đồng bộ Cloud!');
        setAuthEmail('');
        setAuthPassword('');
      }
    } catch (err) {
      Alert.alert('Thất bại', err.message || 'Lỗi xác thực.');
    }
  };

  // Handle Manual Sync
  const handleSyncNow = async () => {
    setIsSyncing(true);
    const success = await performSync();
    setIsSyncing(false);
    if (success) {
      Alert.alert('Đồng bộ thành công', 'Dữ liệu đã được cập nhật hai chiều với Cloud!');
    } else {
      Alert.alert('Lỗi đồng bộ', 'Không thể đồng bộ. Hãy chắc chắn bạn đã điền đúng Master Password và Supabase.');
    }
  };

  // Send Invitation to Spouse
  const handleSendSpouseInvite = async () => {
    if (!emailSpouse.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email vợ/chồng.');
      return;
    }
    try {
      const success = await sendSpouseInvitation(emailSpouse.trim(), roleSpouse);
      if (success) {
        Alert.alert('Thành công', `Đã gửi lời mời tới ${emailSpouse}. Chờ tài khoản kia đồng ý!`);
      }
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Gửi lời mời thất bại.');
    }
  };

  // Decline invitation or Cancel link
  const handleDeclineSpouse = async () => {
    Alert.alert(
      'Hủy liên kết',
      'Bạn có chắc muốn hủy lời mời hoặc liên kết với Vợ/Chồng này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đồng ý', 
          style: 'destructive',
          onPress: async () => {
            await declineSpouseInvitation();
            Alert.alert('Đã hủy', 'Đã xóa bỏ thông tin liên kết vợ/chồng.');
          }
        }
      ]
    );
  };

  // Profile management helpers
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
      const newMember = {
        ...memberData,
        id: 'p-' + Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString()
      };
      updatedProfiles.push(newMember);
    } else {
      updatedProfiles = updatedProfiles.map(p => p.id === editingMemberId ? { ...p, ...memberData } : p);
    }

    await updateState({ familyProfiles: updatedProfiles });
    setIsEditingMember(false);
    Alert.alert('Thành công', 'Đã lưu thông tin thành viên.');
  };

  const handleDeleteMember = (id) => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa thành viên gia đình này không?',
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
          <MaterialCommunityIcons name="arrow-left" size={20} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu Hình & Cài Đặt</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 1. Supabase Connection Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kết nối Supabase (BYODB)</Text>
        <View style={styles.settingsCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Supabase URL</Text>
            <TextInput 
              style={styles.input}
              placeholder="https://xxxx.supabase.co"
              placeholderTextColor="#64748b"
              value={sUrl}
              onChangeText={setSUrl}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Supabase Anon Key</Text>
            <TextInput 
              style={styles.input}
              placeholder="eyJhbGciOi..."
              placeholderTextColor="#64748b"
              secureTextEntry
              value={sKey}
              onChangeText={setSKey}
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#10b981' }]} onPress={handleConnectSupabase}>
            <Text style={styles.primaryBtnText}>Cập nhật kết nối database</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Authentication & Cloud Sync */}
      {state.supabaseUrl !== '' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đồng bộ Cloud & Backup</Text>
          <View style={styles.settingsCard}>
            {user ? (
              <View style={styles.authInfo}>
                <MaterialCommunityIcons name="cloud-check" size={28} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.authEmail}>{user.email}</Text>
                  <Text style={styles.authStatus}>Đã liên kết đồng bộ đám mây</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                  <Text style={styles.logoutBtnText}>Đăng xuất</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authForm}>
                <Text style={styles.authTitle}>{isRegisterMode ? 'Đăng ký tài khoản mới' : 'Đăng nhập để đồng bộ'}</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authEmail}
                    onChangeText={setAuthEmail}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Mật khẩu</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="Mật khẩu tài khoản..."
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={authPassword}
                    onChangeText={setAuthPassword}
                  />
                </View>
                <TouchableOpacity style={styles.primaryBtn} onPress={handleAuth}>
                  <Text style={styles.primaryBtnText}>{isRegisterMode ? 'Đăng ký' : 'Đăng nhập'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsRegisterMode(!isRegisterMode)} style={{ alignSelf: 'center', marginTop: 10 }}>
                  <Text style={styles.toggleAuthText}>
                    {isRegisterMode ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký ngay'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {user && (
              <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={isSyncing}>
                <MaterialCommunityIcons name="cached" size={20} color="#ffffff" style={isSyncing && { transform: [{ rotate: '45deg' }] }} />
                <Text style={styles.syncBtnText}>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ hai chiều ngay'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* 3. Local Configurations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mã hóa & Cấu hình cục bộ</Text>
        <View style={styles.settingsCard}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gemini AI API Key</Text>
            <TextInput 
              style={styles.input}
              placeholder="AI API Key..."
              placeholderTextColor="#64748b"
              secureTextEntry
              value={apiKey}
              onChangeText={setApiKey}
            />
            <Text style={styles.helpText}>Dùng để phân tích kết quả xét nghiệm huyết áp, thể trạng.</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mật khẩu chủ (Master Password)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Nhập Master Password để mã hóa..."
              placeholderTextColor="#64748b"
              secureTextEntry
              value={passMaster}
              onChangeText={setPassMaster}
            />
            <Text style={styles.helpText}>Mật khẩu dùng để mã hóa an toàn dữ liệu cá nhân của bạn trước khi đưa lên Cloud.</Text>
          </View>

          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#0e5e9b' }]} onPress={handleSaveSettings}>
            <Text style={styles.primaryBtnText}>Lưu cấu hình</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Spouse Link (Quỹ gia đình) */}
      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên kết Quỹ vợ/chồng</Text>
          <View style={styles.settingsCard}>
            {spouseStatus === 'accepted' ? (
              <View style={styles.linkedSpouseBox}>
                <MaterialCommunityIcons name="heart" size={24} color="#f43f5e" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.spouseEmailText}>{spouseEmail}</Text>
                  <Text style={styles.spouseStatusText}>Đã liên kết (Vai trò: {spouseRole === 'wife' ? 'Vợ' : 'Chồng'})</Text>
                </View>
                <TouchableOpacity style={styles.unlinkSpouseBtn} onPress={handleDeclineSpouse}>
                  <Text style={styles.unlinkSpouseBtnText}>Hủy liên kết</Text>
                </TouchableOpacity>
              </View>
            ) : spouseStatus === 'pending_accept' ? (
              <View style={styles.linkedSpouseBox}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#f59e0b" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.spouseEmailText}>{spouseEmail}</Text>
                  <Text style={styles.spouseStatusText}>Đang chờ tài khoản kia chấp nhận...</Text>
                </View>
                <TouchableOpacity style={styles.unlinkSpouseBtn} onPress={handleDeclineSpouse}>
                  <Text style={styles.unlinkSpouseBtnText}>Hủy mời</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.inviteSpouseForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email Vợ / Chồng liên kết</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="spouse@gmail.com"
                    placeholderTextColor="#64748b"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={emailSpouse}
                    onChangeText={setEmailSpouse}
                  />
                </View>

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

                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#b5530b' }]} onPress={handleSendSpouseInvite}>
                  <Text style={styles.primaryBtnText}>Gửi lời mời liên kết Quỹ chung</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 5. Family Profiles */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Thành viên gia đình</Text>
          <TouchableOpacity style={styles.addMemberBtn} onPress={handleOpenAddMember}>
            <Text style={styles.addMemberBtnText}>+ Thêm thành viên</Text>
          </TouchableOpacity>
        </View>

        {isEditingMember && (
          <View style={styles.memberFormCard}>
            <Text style={styles.memberFormTitle}>{editingMemberId ? 'Sửa thành viên' : 'Thêm thành viên mới'}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và Tên</Text>
              <TextInput 
                style={styles.input}
                placeholder="Ví dụ: Bố, Mẹ, Bé Bo..."
                placeholderTextColor="#64748b"
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
                  placeholderTextColor="#64748b"
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
                  placeholderTextColor="#64748b"
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
                  placeholderTextColor="#64748b"
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

        {familyProfiles.length === 0 ? (
          <Text style={styles.emptyText}>Chưa tạo thành viên gia đình nào ngoài bạn.</Text>
        ) : (
          <View style={styles.membersList}>
            {familyProfiles.map((member) => (
              <View key={member.id} style={styles.memberItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberInfo}>
                    {member.gender === 'male' ? 'Nam' : 'Nữ'} {member.birth_year ? `• Năm sinh: ${member.birth_year}` : ''}
                  </Text>
                  <Text style={styles.memberInfo}>
                    Chiều cao: {member.height ? `${member.height}cm` : '--'} • Cân nặng: {member.weight ? `${member.weight}kg` : '--'}
                  </Text>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditMember(member)}>
                    <MaterialCommunityIcons name="pencil" size={16} color="#0ea5e9" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteMember(member.id)}>
                    <MaterialCommunityIcons name="trash-can" size={16} color="#f43f5e" />
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
    backgroundColor: '#090d16',
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
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
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
    color: '#f8fafc',
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: 'rgba(15, 22, 38, 0.7)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '750',
    color: '#94a3b8',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#f8fafc',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  helpText: {
    fontSize: 10,
    color: '#64748b',
    lineHeight: 14,
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeRoleBtn: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  roleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeRoleBtnText: {
    color: '#ffffff',
  },
  primaryBtn: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '750',
    color: '#ffffff',
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: 12,
    height: 46,
    gap: 8,
  },
  syncBtnText: {
    fontSize: 14,
    fontWeight: '750',
    color: '#ffffff',
  },
  authInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 16,
    padding: 14,
  },
  authEmail: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  authStatus: {
    fontSize: 11,
    color: '#10b981',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f43f5e',
  },
  authForm: {
    gap: 12,
  },
  authTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#f8fafc',
    alignSelf: 'center',
    marginBottom: 4,
  },
  toggleAuthText: {
    fontSize: 12,
    color: '#0ea5e9',
    fontWeight: '700',
  },
  linkedSpouseBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
    borderRadius: 16,
    padding: 14,
  },
  spouseEmailText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f8fafc',
  },
  spouseStatusText: {
    fontSize: 11,
    color: '#94a3b8',
  },
  unlinkSpouseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unlinkSpouseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f43f5e',
  },
  inviteSpouseForm: {
    gap: 14,
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
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  membersList: {
    gap: 12,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 22, 38, 0.7)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
  },
  memberInfo: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberFormCard: {
    backgroundColor: 'rgba(15, 22, 38, 0.9)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
    gap: 16,
  },
  memberFormTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    alignSelf: 'center',
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  activeGenderBtn: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  activeGenderBtnText: {
    color: '#ffffff',
  },
  memberFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelMemberBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelMemberBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
  },
  saveMemberBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
  },
  saveMemberBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
