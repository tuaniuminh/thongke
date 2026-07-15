import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useApp } from '../../core/AppContext';
import { ensureDefaultFunds, calculateFundBalances } from './utils';

const TX_TYPES = [
  { value: 'contribution', label: 'Đóng góp' },
  { value: 'spending', label: 'Chi tiêu' },
  { value: 'transfer', label: 'Chuyển quỹ' },
  { value: 'investment_change', label: 'Đầu tư' }
];

export default function FundTransactionForm({ route, navigation }) {
  const { state, updateState } = useApp();
  const { mode = 'create', transactionId } = route.params || {};

  const { familyFunds = [], fundTransactions = [] } = state;
  const funds = ensureDefaultFunds(familyFunds);
  
  // Calculate current balances to check for negative balances on spending
  const currentBalances = calculateFundBalances(familyFunds, fundTransactions);

  // Form Fields State
  const [type, setType] = useState('contribution'); // contribution, spending, transfer, investment_change
  const [amountStr, setAmountStr] = useState('');
  const [fundId, setFundId] = useState(funds[0]?.id || 'fund-main');
  
  // For Transfer
  const [fromFundId, setFromFundId] = useState('fund-main');
  const [toFundId, setToFundId] = useState('fund-spending');
  
  // For contribution member selector
  const [member, setMember] = useState('wife'); // wife or husband
  const [dateStr, setDateStr] = useState(''); // Format: YYYY-MM-DDTHH:mm
  const [notes, setNotes] = useState('');

  useEffect(() => {
    // Set default local time string (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    setDateStr(localISOTime);

    if (mode === 'edit' && transactionId) {
      const tx = fundTransactions.find(t => t.id === transactionId);
      if (tx) {
        setType(tx.type || 'contribution');
        setAmountStr(formatNumberWithDots(String(tx.amount || '')));
        setFundId(tx.fundId || 'fund-main');
        setFromFundId(tx.fromFundId || 'fund-main');
        setToFundId(tx.toFundId || 'fund-spending');
        setMember(tx.member || 'wife');
        if (tx.date) {
          setDateStr(tx.date.slice(0, 16));
        }
        setNotes(tx.notes || '');
      }
    }
  }, [mode, transactionId]);

  const formatNumberWithDots = (val) => {
    const clean = val.replace(/[^\d-]/g, ''); // Allow negative for investment losses
    return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleAmountChange = (val) => {
    setAmountStr(formatNumberWithDots(val));
  };

  const handleSave = async () => {
    const finalAmount = Number(amountStr.replace(/\./g, '')) || 0;
    
    if (finalAmount === 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền giao dịch hợp lệ.');
      return;
    }

    // Balance check for spending / transfer
    if (type === 'spending') {
      const sourceFund = currentBalances.find(f => f.id === fundId);
      if (sourceFund && sourceFund.balance < finalAmount) {
        const proceed = await new Promise(resolve => {
          Alert.alert(
            'Cảnh báo số dư',
            `Quỹ nguồn không đủ số dư (Hiện có: ${sourceFund.balance.toLocaleString('vi-VN')} đ). Bạn vẫn muốn chi âm?`,
            [
              { text: 'Hủy', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Tiếp tục', onPress: () => resolve(true) }
            ]
          );
        });
        if (!proceed) return;
      }
    }

    if (type === 'transfer') {
      const sourceFund = currentBalances.find(f => f.id === fromFundId);
      if (sourceFund && sourceFund.balance < finalAmount) {
        const proceed = await new Promise(resolve => {
          Alert.alert(
            'Cảnh báo số dư',
            `Quỹ nguồn không đủ số dư (Hiện có: ${sourceFund.balance.toLocaleString('vi-VN')} đ). Bạn vẫn muốn chuyển âm?`,
            [
              { text: 'Hủy', onPress: () => resolve(false), style: 'cancel' },
              { text: 'Tiếp tục', onPress: () => resolve(true) }
            ]
          );
        });
        if (!proceed) return;
      }
    }

    const txData = {
      type,
      amount: finalAmount,
      fundId: type === 'transfer' ? null : fundId,
      fromFundId: type === 'transfer' ? fromFundId : null,
      toFundId: type === 'transfer' ? toFundId : null,
      member: type === 'contribution' ? member : 'wife', // fallback default
      date: new Date(dateStr).toISOString(),
      notes: notes.trim(),
      updated_at: new Date().toISOString()
    };

    try {
      let updatedTx = [...fundTransactions];
      if (mode === 'create') {
        const newTx = {
          ...txData,
          id: 'tx-' + Math.random().toString(36).substring(2, 15),
          created_at: new Date().toISOString()
        };
        updatedTx.push(newTx);
      } else {
        updatedTx = updatedTx.map(t => t.id === transactionId ? { ...t, ...txData } : t);
      }

      await updateState({ fundTransactions: updatedTx });
      Alert.alert('Thành công', 'Đã ghi lại giao dịch quỹ!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      console.error('Failed to save fund transaction:', err);
      Alert.alert('Lỗi', 'Không thể lưu giao dịch.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ghi nhận Giao dịch</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Form Fields */}
      <View style={styles.form}>
        
        {/* Type Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Loại giao dịch</Text>
          <View style={styles.pickerRow}>
            {TX_TYPES.map((t) => (
              <TouchableOpacity 
                key={t.value}
                style={[styles.pickerChip, type === t.value && styles.activePickerChip]}
                onPress={() => setType(t.value)}
              >
                <Text style={[styles.pickerChipText, type === t.value && styles.activePickerChipText]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Amount input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Số tiền (đ)</Text>
          <TextInput 
            style={[styles.input, { fontSize: 20, fontWeight: '800', color: '#0f766e' }]}
            placeholder="0"
            keyboardType="numeric"
            value={amountStr}
            onChangeText={handleAmountChange}
          />
          {type === 'investment_change' && (
            <Text style={styles.helpText}>Nhập số âm nếu đầu tư thua lỗ hoặc rút vốn</Text>
          )}
        </View>

        {/* Conditional inputs based on Type */}
        {type !== 'transfer' ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              {type === 'contribution' ? 'Nạp vào quỹ' : type === 'spending' ? 'Chi từ quỹ' : 'Quỹ đầu tư'}
            </Text>
            <View style={styles.pickerRow}>
              {funds.map((f) => {
                // Contribution cannot go to spending fund in old business logic sometimes
                return (
                  <TouchableOpacity 
                    key={f.id}
                    style={[styles.pickerChip2, fundId === f.id && styles.activePickerChip2]}
                    onPress={() => setFundId(f.id)}
                  >
                    <Text style={[styles.pickerChipText2, fundId === f.id && styles.activePickerChipText2]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          /* Transfer fields */
          <View style={{ gap: 16 }}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Chuyển từ quỹ nguồn</Text>
              <View style={styles.pickerRow}>
                {funds.map((f) => (
                  <TouchableOpacity 
                    key={f.id}
                    style={[styles.pickerChip2, fromFundId === f.id && styles.activePickerChip2]}
                    onPress={() => setFromFundId(f.id)}
                  >
                    <Text style={[styles.pickerChipText2, fromFundId === f.id && styles.activePickerChipText2]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Chuyển đến quỹ đích</Text>
              <View style={styles.pickerRow}>
                {funds.map((f) => (
                  <TouchableOpacity 
                    key={f.id}
                    style={[styles.pickerChip2, toFundId === f.id && styles.activePickerChip2]}
                    onPress={() => setToFundId(f.id)}
                  >
                    <Text style={[styles.pickerChipText2, toFundId === f.id && styles.activePickerChipText2]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Member selector for contribution */}
        {type === 'contribution' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Thành viên đóng góp</Text>
            <View style={styles.pickerRow}>
              <TouchableOpacity 
                style={[styles.pickerChip, member === 'husband' && styles.activePickerChip]}
                onPress={() => setMember('husband')}
              >
                <Text style={[styles.pickerChipText, member === 'husband' && styles.activePickerChipText]}>Chồng (Nick)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.pickerChip, member === 'wife' && styles.activePickerChip]}
                onPress={() => setMember('wife')}
              >
                <Text style={[styles.pickerChipText, member === 'wife' && styles.activePickerChipText]}>Vợ</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Date Time input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ngày giờ giao dịch (năm-tháng-ngàyTgiờ:phút)</Text>
          <TextInput 
            style={styles.input}
            placeholder="YYYY-MM-DDTHH:mm"
            value={dateStr}
            onChangeText={setDateStr}
          />
        </View>

        {/* Notes input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ghi chú giao dịch</Text>
          <TextInput 
            style={[styles.input, styles.textArea]}
            placeholder="Nội dung đóng góp, lý do chi tiêu..."
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
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '750',
    color: '#475569',
  },
  helpText: {
    fontSize: 11,
    color: '#b45309',
    fontWeight: '500',
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
    height: 85,
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
  pickerChip2: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  activePickerChip2: {
    backgroundColor: '#0ea5e9',
    borderColor: '#0ea5e9',
  },
  pickerChipText2: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  activePickerChipText2: {
    color: '#ffffff',
  },
});
