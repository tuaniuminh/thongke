import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useApp } from '../../core/AppContext';

export default function MedicalRecordForm({ route, navigation }) {
  const { state, updateState } = useApp();
  const { mode = 'create', recordId, profileId } = route.params || {};

  const { familyProfiles = [] } = state;
  const allProfiles = familyProfiles.length > 0 ? familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];

  // Form Fields State
  const [selectedProfileId, setSelectedProfileId] = useState(profileId || 'p-self');
  const [diagnose, setDiagnose] = useState('');
  const [hospital, setHospital] = useState('');
  const [prescription, setPrescription] = useState('');
  const [dateStr, setDateStr] = useState(''); // Format: YYYY-MM-DD
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    // Set default date as today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setDateStr(`${yyyy}-${mm}-${dd}`);

    if (mode === 'edit' && recordId) {
      const record = (state.medicalRecords || []).find(r => r.id === recordId);
      if (record) {
        setSelectedProfileId(record.profile_id || 'p-self');
        setDiagnose(record.diagnose || '');
        setHospital(record.hospital || '');
        setPrescription(record.prescription || '');
        if (record.date) {
          setDateStr(record.date.split('T')[0]);
        }
        setNotes(record.notes || '');
        setImageUrl(record.image_url || '');
      }
    }
  }, [mode, recordId]);

  const handleUploadImageMock = () => {
    Alert.alert(
      'Chọn nguồn ảnh (Demo)',
      'Bạn muốn chọn ảnh chẩn đoán bệnh / đơn thuốc từ đâu?',
      [
        { text: 'Chụp ảnh camera', onPress: () => setImageUrl('mock-camera-image.jpg') },
        { text: 'Chọn từ thư viện', onPress: () => setImageUrl('mock-library-image.jpg') },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const handleSave = async () => {
    if (!diagnose.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập chẩn đoán / tên bệnh.');
      return;
    }

    const recordData = {
      profile_id: selectedProfileId,
      diagnose: diagnose.trim(),
      hospital: hospital.trim(),
      prescription: prescription.trim(),
      date: new Date(dateStr).toISOString(),
      notes: notes.trim(),
      image_url: imageUrl,
      updated_at: new Date().toISOString()
    };

    try {
      let updatedRecords = [...(state.medicalRecords || [])];
      if (mode === 'create') {
        const newRecord = {
          ...recordData,
          id: 'mr-' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString()
        };
        updatedRecords.push(newRecord);
      } else {
        updatedRecords = updatedRecords.map(r => r.id === recordId ? { ...r, ...recordData } : r);
      }

      await updateState({ medicalRecords: updatedRecords });
      Alert.alert('Thành công', 'Đã lưu hồ sơ y khoa!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to save medical record:', err);
      Alert.alert('Lỗi', 'Không thể lưu bản ghi.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghi chép Hồ sơ</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Profile Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Thành viên khám</Text>
          <View style={styles.pickerRow}>
            {allProfiles.map((p) => (
              <TouchableOpacity 
                key={p.id}
                style={[styles.pickerChip, selectedProfileId === p.id && styles.activePickerChip]}
                onPress={() => setSelectedProfileId(p.id)}
              >
                <Text style={[styles.pickerChipText, selectedProfileId === p.id && styles.activePickerChipText]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Diagnose/Disease input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Chẩn đoán bệnh / Tên bệnh</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ví dụ: Viêm họng cấp, Khám sức khỏe định kỳ..."
            value={diagnose}
            onChangeText={setDiagnose}
          />
        </View>

        {/* Hospital input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nơi khám / Bệnh viện</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ví dụ: Bệnh viện Bạch Mai, Phòng khám đa khoa..."
            value={hospital}
            onChangeText={setHospital}
          />
        </View>

        {/* Prescription input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Đơn thuốc kê toa (nếu có)</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Ví dụ: Paracetamol 500mg x 10 viên (uống sáng/tối)..."
            multiline
            numberOfLines={4}
            value={prescription}
            onChangeText={setPrescription}
          />
        </View>

        {/* Upload Image box */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ảnh kết quả khám / Đơn thuốc</Text>
          {imageUrl ? (
            <View style={styles.uploadedBox}>
              <Text style={styles.uploadedText}>✓ {imageUrl}</Text>
              <TouchableOpacity onPress={() => setImageUrl('')}>
                <Text style={styles.clearText}>Xóa ảnh</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadImageMock}>
              <Text style={styles.uploadBtnText}>📸 Chụp hoặc Chọn ảnh y bạ</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Date input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày khám bệnh (năm-tháng-ngày)</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateStr}
            onChangeText={setDateStr}
          />
        </View>

        {/* Notes input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú thêm</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Các triệu chứng lâm sàng đi kèm..."
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  form: {
    padding: 20,
    gap: 20,
  },
  formGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '750',
    color: '#475569',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  textArea: {
    height: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activePickerChip: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  pickerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activePickerChipText: {
    color: '#ffffff',
  },
  uploadBtn: {
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
  },
  uploadBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0284c7',
  },
  uploadedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    height: 48,
  },
  uploadedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
    marginRight: 10,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
});
