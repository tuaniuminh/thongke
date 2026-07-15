import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { useApp } from '../../core/AppContext';
import { convertSolar2Lunar } from '../../utils/lunar';

const RELATIONSHIPS = ['Họ hàng', 'Bạn học', 'Đồng nghiệp', 'Hàng xóm', 'Bạn xã hội', 'Khác'];
const EVENT_TYPES = ['Đám cưới', 'Đám hiếu', 'Thăm ốm', 'Tân gia', 'Khác'];

export default function GiftForm({ route, navigation }) {
  const { state, updateState } = useApp();
  const { mode = 'create', type = 'received', giftId } = route.params || {};

  // Form Fields State
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [relationship, setRelationship] = useState('Họ hàng');
  const [eventType, setEventType] = useState('Đám cưới');
  const [customEventName, setCustomEventName] = useState('');
  const [dateStr, setDateStr] = useState(''); // Format: YYYY-MM-DD
  const [lunarText, setLunarText] = useState('');
  const [notes, setNotes] = useState('');
  
  // Gold Gift fields
  const [isGold, setIsGold] = useState(false);
  const [goldAmount, setGoldAmount] = useState('');

  // Load existing gift data if in edit mode
  useEffect(() => {
    // Set default date as today in local timezone
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const defaultDate = `${yyyy}-${mm}-${dd}`;
    setDateStr(defaultDate);
    updateLunarDisplay(dd, mm, yyyy);

    if (mode === 'edit' && giftId) {
      const gifts = type === 'received' ? state.receivedGifts : state.sentGifts;
      const gift = gifts.find(g => g.id === giftId);
      if (gift) {
        setName(gift.name || '');
        setAmountStr(formatNumberWithDots(String(gift.amount || '')));
        setRelationship(gift.relationship || 'Họ hàng');
        
        // Handle Event Type / Custom Event Name
        const isStandardEvent = EVENT_TYPES.includes(gift.event_type);
        if (isStandardEvent) {
          setEventType(gift.event_type);
        } else {
          setEventType('Khác');
          setCustomEventName(gift.event_type || '');
        }

        // Set date
        if (gift.date) {
          const gDate = gift.date.split('T')[0];
          setDateStr(gDate);
          const [y, m, d] = gDate.split('-');
          updateLunarDisplay(d, m, y);
        }

        setNotes(gift.notes || '');
        
        // Gold
        if (gift.gift_type === 'gold') {
          setIsGold(true);
          setGoldAmount(String(gift.gold_amount || ''));
        }
      }
    }
  }, [mode, giftId, type]);

  // Helper to format number string (e.g. 1000000 -> 1.000.000)
  const formatNumberWithDots = (val) => {
    const clean = val.replace(/\D/g, '');
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (val) => {
    setAmountStr(formatNumberWithDots(val));
  };

  const handleDateChange = (val) => {
    // Validate simple YYYY-MM-DD input
    setDateStr(val);
    const parts = val.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      if (d.length === 2 && m.length === 2 && y.length === 4) {
        updateLunarDisplay(d, m, y);
      }
    }
  };

  const updateLunarDisplay = (d, m, y) => {
    const lunar = convertSolar2Lunar(d, m, y);
    if (lunar) {
      setLunarText(`Lịch âm: ngày ${lunar.lDay} tháng ${lunar.lMonth}${lunar.isLeap ? ' (Nhuận)' : ''} năm ${lunar.gzYear} (${lunar.animal})`);
    } else {
      setLunarText('');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ và tên.');
      return;
    }

    const finalAmount = Number(amountStr.replace(/\D/g, '')) || 0;
    if (finalAmount === 0 && (!isGold || Number(goldAmount) === 0)) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền mừng hoặc số lượng vàng.');
      return;
    }

    const finalEvent = eventType === 'Khác' ? customEventName.trim() : eventType;
    if (eventType === 'Khác' && !customEventName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền tên sự kiện khác.');
      return;
    }

    const giftData = {
      name: name.trim(),
      amount: finalAmount,
      relationship,
      event_type: finalEvent,
      date: new Date(dateStr).toISOString(),
      notes: notes.trim(),
      gift_type: isGold ? 'gold' : 'cash',
      gold_amount: isGold ? Number(goldAmount) || 0 : 0,
      updated_at: new Date().toISOString()
    };

    try {
      if (type === 'received') {
        let updatedGifts = [...(state.receivedGifts || [])];
        if (mode === 'create') {
          const newGift = {
            ...giftData,
            id: Math.random().toString(36).substring(2, 15),
            status: 'pending', // Default received status is pending return
            created_at: new Date().toISOString()
          };
          updatedGifts.push(newGift);
        } else {
          updatedGifts = updatedGifts.map(g => g.id === giftId ? { ...g, ...giftData } : g);
        }
        await updateState({ receivedGifts: updatedGifts });
      } else {
        let updatedGifts = [...(state.sentGifts || [])];
        if (mode === 'create') {
          const newGift = {
            ...giftData,
            id: Math.random().toString(36).substring(2, 15),
            created_at: new Date().toISOString()
          };
          updatedGifts.push(newGift);
        } else {
          updatedGifts = updatedGifts.map(g => g.id === giftId ? { ...g, ...giftData } : g);
        }
        await updateState({ sentGifts: updatedGifts });
      }
      Alert.alert('Thành công', mode === 'create' ? 'Đã thêm giao dịch thành công!' : 'Đã cập nhật giao dịch thành công!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to save gift:', err);
      Alert.alert('Lỗi', 'Không thể lưu dữ liệu.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {mode === 'create' ? 'Thêm mới' : 'Chỉnh sửa'} {type === 'received' ? 'tiền nhận' : 'tiền mừng'}
        </Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Name input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Họ và tên người {type === 'received' ? 'mừng' : 'nhận'}</Text>
          <TextInput 
            style={styles.input}
            placeholder="Ví dụ: Nguyễn Văn A..."
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Amount input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Số tiền (đ)</Text>
          <TextInput 
            style={[styles.input, { fontSize: 18, fontWeight: '700', color: '#0f766e' }]}
            placeholder="0"
            keyboardType="numeric"
            value={amountStr}
            onChangeText={handleAmountChange}
          />
        </View>

        {/* Gold toggle & input */}
        <View style={[styles.formGroup, styles.switchGroup]}>
          <Text style={styles.label}>Mừng bằng vàng?</Text>
          <Switch 
            value={isGold}
            onValueChange={setIsGold}
            trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
            thumbColor={isGold ? '#d97706' : '#f4f4f5'}
          />
        </View>

        {isGold && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Số lượng vàng (chỉ)</Text>
            <TextInput 
              style={styles.input}
              placeholder="Nhập số chỉ vàng (ví dụ: 1 hoặc 0.5...)"
              keyboardType="numeric"
              value={goldAmount}
              onChangeText={setGoldAmount}
            />
          </View>
        )}

        {/* Relationship Picker Selection Row */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Mối quan hệ</Text>
          <View style={styles.pickerRow}>
            {RELATIONSHIPS.map((r) => (
              <TouchableOpacity 
                key={r}
                style={[styles.pickerChip, relationship === r && styles.activePickerChip]}
                onPress={() => setRelationship(r)}
              >
                <Text style={[styles.pickerChipText, relationship === r && styles.activePickerChipText]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Event Type Picker Selection Row */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Sự kiện</Text>
          <View style={styles.pickerRow}>
            {EVENT_TYPES.map((ev) => (
              <TouchableOpacity 
                key={ev}
                style={[styles.pickerChip, eventType === ev && styles.activePickerChip]}
                onPress={() => setEventType(ev)}
              >
                <Text style={[styles.pickerChipText, eventType === ev && styles.activePickerChipText]}>{ev}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Custom Event Name (conditional) */}
        {eventType === 'Khác' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tên sự kiện khác</Text>
            <TextInput 
              style={styles.input}
              placeholder="Ví dụ: Thượng thọ, sinh nhật..."
              value={customEventName}
              onChangeText={setCustomEventName}
            />
          </View>
        )}

        {/* Date input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày Dương lịch (năm-tháng-ngày)</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={dateStr}
            onChangeText={handleDateChange}
          />
          {lunarText ? <Text style={styles.lunarText}>{lunarText}</Text> : null}
        </View>

        {/* Notes input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú thêm</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Thông tin đi kèm (nếu có)..."
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
    backgroundColor: '#10b981',
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
    gap: 8,
  },
  switchGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  pickerChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activePickerChipText: {
    color: '#ffffff',
  },
  lunarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginTop: 4,
  },
});
