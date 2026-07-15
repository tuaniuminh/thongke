import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FeatureScreen({ route, navigation }) {
  const { title, desc } = route.params || { title: 'Trang Tính Năng', desc: 'Mô tả tính năng' };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Trang chủ</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 80 }} /> {/* Spacer to align title */}
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descText}>{desc}</Text>

        <View style={styles.alertBox}>
          <Text style={styles.alertEmoji}>✨</Text>
          <Text style={styles.alertText}>
            Bạn đang trải nghiệm giao diện React Native. Hãy đặt ngón tay vào sát mép trái màn hình và kéo sang phải.
          </Text>
        </View>
        
        <Text style={styles.gestureNotice}>
          (Cử chỉ vuốt lùi native của iOS được quản lý trực tiếp bởi hệ thống, chuyển động trượt trang theo tay cực kỳ mượt mà)
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
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
    color: '#334155',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 12,
  },
  descText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  alertEmoji: {
    fontSize: 20,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#166534',
    lineHeight: 18,
  },
  gestureNotice: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
