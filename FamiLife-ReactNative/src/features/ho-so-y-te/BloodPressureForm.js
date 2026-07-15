import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useApp } from '../../core/AppContext';

export default function BloodPressureForm({ route, navigation }) {
  const { state, updateState } = useApp();
  const { mode = 'create', recordId, profileId } = route.params || {};

  const { familyProfiles = [] } = state;
  const allProfiles = familyProfiles.length > 0 ? familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];

  // Form Fields State
  const [selectedProfileId, setSelectedProfileId] = useState(profileId || 'p-self');
  const [sys, setSys] = useState('');
  const [dia, setDia] = useState('');
  const [pulse, setPulse] = useState('');
  const [irregular, setIrregular] = useState(false);
  const [dateStr, setDateStr] = useState(''); // Format: YYYY-MM-DDTHH:mm
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Set default local time string (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    setDateStr(localISOTime);

    if (mode === 'edit' && recordId) {
      const record = (state.bloodPressureRecords || []).find(r => r.id === recordId);
      if (record) {
        setSelectedProfileId(record.profile_id || 'p-self');
        setSys(String(record.sys || ''));
        setDia(String(record.dia || ''));
        setPulse(String(record.pulse || ''));
        setIrregular(!!record.irregular_heartbeat);
        if (record.date) {
          setDateStr(record.date.slice(0, 16));
        }
        setNotes(record.notes || '');
      }
    }
  }, [mode, recordId]);

  const handleSave = async () => {
    const numSys = Number(sys);
    const numDia = Number(dia);
    const numPulse = Number(pulse);

    if (!sys || !dia || !pulse) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ SYS, DIA và Nhịp tim.');
      return;
    }

    if (numSys < 50 || numSys > 250) {
      Alert.alert('Lỗi', 'Chỉ số huyết áp tâm thu (SYS) không hợp lệ (50 - 250).');
      return;
    }

    if (numDia < 30 || numDia > 180) {
      Alert.alert('Lỗi', 'Chỉ số huyết áp tâm trương (DIA) không hợp lệ (30 - 180).');
      return;
    }

    if (numPulse < 30 || numPulse > 220) {
      Alert.alert('Lỗi', 'Nhịp tim không hợp lệ (30 - 220).');
      return;
    }

    const recordData = {
      profile_id: selectedProfileId,
      sys: numSys,
      dia: numDia,
      pulse: numPulse,
      irregular_heartbeat: irregular,
      date: new Date(dateStr).toISOString(),
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      let updatedRecords = [...(state.bloodPressureRecords || [])];
      if (mode === 'create') {
        const newRecord = {
          ...recordData,
          id: 'bp-' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString()
        };
        updatedRecords.push(newRecord);
      } else {
        updatedRecords = updatedRecords.map(r => r.id === recordId ? { ...r, ...recordData } : r);
      }

      await updateState({ bloodPressureRecords: updatedRecords });
      Alert.alert('Thành công', 'Đã ghi lại số đo huyết áp!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to save BP:', err);
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
        <Text style={styles.headerTitle}>Ghi chép Huyết áp</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Profile Selector Row */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Thành viên đo</Text>
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

        {/* SYS & DIA Row */}
        <View style={styles.doubleRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Tâm thu (SYS) - mmHg</Text>
            <TextInput 
              style={[styles.input, { fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#ef4444' }]}
              placeholder="120"
              keyboardType="numeric"
              value={sys}
              onChangeText={setSys}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Tâm trương (DIA) - mmHg</Text>
            <TextInput 
              style={[styles.input, { fontSize: 20, fontWeight: '800', textAlign: 'center', color: '#3b82f6' }]}
              placeholder="80"
              keyboardType="numeric"
              value={dia}
              onChangeText={setDia}
            />
          </View>
        </View>

        {/* Pulse input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Nhịp tim (Pulse) - bpm</Text>
          <TextInput 
            style={[styles.input, { fontSize: 18, fontWeight: '700' }]}
            placeholder="75"
            keyboardType="numeric"
            value={pulse}
            onChangeText={setPulse}
          />
        </View>

        {/* Irregular heartbeat toggle */}
        <View style={[styles.formGroup, styles.switchGroup]}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Nhịp tim không đều?</Text>
            <Text style={styles.subLabel}>Bật nếu máy đo Omron nhấp nháy biểu tượng cảnh báo nhịp tim không đều</Text>
          </View>
          <Switch 
            value={irregular}
            onValueChange={setIrregular}
            trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
            thumbColor={irregular ? '#d97706' : '#f4f4f5'}
          />
        </View>

        {/* Date Time input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày giờ đo (năm-tháng-ngàyTgiờ:phút)</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm"
            value={dateStr}
            onChangeText={setDateStr}
          />
        </View>

        {/* Notes input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú trạng thái cơ thể</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Ví dụ: Đo sau khi chạy bộ, lúc vừa ngủ dậy..."
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
    backgroundColor: '#ef4444',
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
  doubleRow: {
    flexDirection: 'row',
    gap: 16,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  label: {
    fontSize: 13,
    fontWeight: '750',
    color: '#475569',
  },
  subLabel: {
    fontSize: 10,
    color: '#b45309',
    lineHeight: 14,
    fontWeight: '500',
    marginTop: 2,
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
    height: 80,
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
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  pickerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activePickerChipText: {
    color: '#ffffff',
  },
});
