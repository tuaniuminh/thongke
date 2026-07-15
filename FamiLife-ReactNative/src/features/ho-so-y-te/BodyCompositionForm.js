import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useApp } from '../../core/AppContext';

export default function BodyCompositionForm({ route, navigation }) {
  const { state, updateState } = useApp();
  const { mode = 'create', recordId, profileId } = route.params || {};

  const { familyProfiles = [] } = state;
  const allProfiles = familyProfiles.length > 0 ? familyProfiles : [{ id: 'p-self', name: 'Bản thân' }];

  // Form Fields State
  const [selectedProfileId, setSelectedProfileId] = useState(profileId || 'p-self');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [fatRate, setFatRate] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [visceralFat, setVisceralFat] = useState('');
  const [waterRate, setWaterRate] = useState('');
  const [dateStr, setDateStr] = useState(''); // Format: YYYY-MM-DDTHH:mm
  const [notes, setNotes] = useState('');

  // Load profile height on select
  useEffect(() => {
    const profile = allProfiles.find(p => p.id === selectedProfileId);
    if (profile && profile.height) {
      setHeight(String(profile.height));
    } else {
      setHeight('');
    }
  }, [selectedProfileId]);

  useEffect(() => {
    // Set default local time string (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    setDateStr(localISOTime);

    if (mode === 'edit' && recordId) {
      const record = (state.bodyCompositionRecords || []).find(r => r.id === recordId);
      if (record) {
        setSelectedProfileId(record.profile_id || 'p-self');
        setWeight(String(record.weight || ''));
        setHeight(String(record.height || ''));
        setFatRate(String(record.fat_rate || ''));
        setMuscleMass(String(record.muscle_mass || ''));
        setVisceralFat(String(record.visceral_fat || ''));
        setWaterRate(String(record.water_rate || ''));
        if (record.date) {
          setDateStr(record.date.slice(0, 16));
        }
        setNotes(record.notes || '');
      }
    }
  }, [mode, recordId]);

  const handleSave = async () => {
    const numWeight = Number(weight);
    const numHeight = Number(height);

    if (!weight || !height) {
      Alert.alert('Lỗi', 'Vui lòng nhập cân nặng và chiều cao.');
      return;
    }

    if (numWeight <= 1 || numWeight > 300) {
      Alert.alert('Lỗi', 'Cân nặng không hợp lệ.');
      return;
    }

    if (numHeight <= 30 || numHeight > 250) {
      Alert.alert('Lỗi', 'Chiều cao không hợp lệ (30 - 250 cm).');
      return;
    }

    // Auto calculate BMI
    const heightInMeters = numHeight / 100;
    const computedBmi = Number((numWeight / (heightInMeters * heightInMeters)).toFixed(1));

    const recordData = {
      profile_id: selectedProfileId,
      weight: numWeight,
      height: numHeight,
      bmi: computedBmi,
      fat_rate: fatRate ? Number(fatRate) : null,
      muscle_mass: muscleMass ? Number(muscleMass) : null,
      visceral_fat: visceralFat ? Number(visceralFat) : null,
      water_rate: waterRate ? Number(waterRate) : null,
      date: new Date(dateStr).toISOString(),
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      // 1. Update Body Composition records
      let updatedRecords = [...(state.bodyCompositionRecords || [])];
      if (mode === 'create') {
        const newRecord = {
          ...recordData,
          id: 'bc-' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString()
        };
        updatedRecords.push(newRecord);
      } else {
        updatedRecords = updatedRecords.map(r => r.id === recordId ? { ...r, ...recordData } : r);
      }

      // 2. Auto update/save member's height/weight in their profile if changed
      let profilesUpdated = false;
      const updatedProfiles = allProfiles.map(p => {
        if (p.id === selectedProfileId) {
          if (p.height !== numHeight || p.weight !== numWeight) {
            profilesUpdated = true;
            return { ...p, height: numHeight, weight: numWeight, updated_at: new Date().toISOString() };
          }
        }
        return p;
      });

      const nextState = { bodyCompositionRecords: updatedRecords };
      if (profilesUpdated) {
        nextState.familyProfiles = updatedProfiles;
      }

      await updateState(nextState);
      Alert.alert('Thành công', 'Đã ghi lại chỉ số cơ thể thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to save body comp:', err);
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
        <Text style={styles.headerTitle}>Ghi chỉ số cơ thể</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Profile selector */}
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

        {/* Height & Weight inputs */}
        <View style={styles.doubleRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Cân nặng (kg)</Text>
            <TextInput 
              style={[styles.input, { fontSize: 18, fontWeight: '750' }]}
              placeholder="65"
              keyboardType="numeric"
              value={weight}
              onChangeText={setWeight}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Chiều cao (cm)</Text>
            <TextInput 
              style={[styles.input, { fontSize: 18, fontWeight: '750' }]}
              placeholder="170"
              keyboardType="numeric"
              value={height}
              onChangeText={setHeight}
            />
          </View>
        </View>

        {/* Other body compositions */}
        <View style={styles.doubleRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Tỷ lệ mỡ (%)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ví dụ: 18.5..."
              keyboardType="numeric"
              value={fatRate}
              onChangeText={setFatRate}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Cơ xương (kg)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ví dụ: 32.4..."
              keyboardType="numeric"
              value={muscleMass}
              onChangeText={setMuscleMass}
            />
          </View>
        </View>

        <View style={styles.doubleRow}>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Mỡ nội tạng</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ví dụ: 6..."
              keyboardType="numeric"
              value={visceralFat}
              onChangeText={setVisceralFat}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Tỷ lệ nước (%)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ví dụ: 55..."
              keyboardType="numeric"
              value={waterRate}
              onChangeText={setWaterRate}
            />
          </View>
        </View>

        {/* Date input */}
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
          <Text style={styles.label}>Ghi chú thêm</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Thông tin máy đo hoặc trạng thái..."
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
  doubleRow: {
    flexDirection: 'row',
    gap: 16,
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
});
