import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Widgets Area */}
        <View style={styles.widgetsRow}>
          <View style={styles.widget}>
            <Text style={styles.widgetLabel}>Lịch âm: 02/06/2026</Text>
          </View>
          <View style={styles.widget}>
            <Text style={styles.widgetLabel}>33°C - Nhiều mây</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoBox}>
              {/* Fallback box styling for logo */}
              <Text style={styles.logoHeart}>❤️</Text>
            </View>
          </View>
          <Text style={styles.appTitle}>FamiLife</Text>
          <Text style={styles.appSubtitle}>Hệ thống quản lý tài chính & chăm sóc sức khỏe gia đình</Text>
        </View>

        {/* Cards Navigation */}
        <View style={styles.cardsWrapper}>
          
          {/* Card 1: Thu Chi */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ThuChiDashboard')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: '#fef3c7' }]}>
              <Text style={styles.cardIcon}>💰</Text>
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Thu chi đối ngoại</Text>
              <Text style={styles.cardDesc}>Quản lý tiền đi mừng hiếu hỷ, thăm hỏi, quà cáp và thống kê quan hệ gia đình</Text>
            </View>
            <Text style={styles.arrowIcon}>chevron-right</Text>
          </TouchableOpacity>

          {/* Card 2: Y Tế */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MedicalDashboard')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: '#e0f2fe' }]}>
              <Text style={styles.cardIcon}>🏥</Text>
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Hồ sơ y tế</Text>
              <Text style={styles.cardDesc}>Theo dõi chỉ số sức khỏe, lịch sử y khoa của thành viên và phân tích bằng trợ lý AI</Text>
            </View>
            <Text style={styles.arrowIcon}>chevron-right</Text>
          </TouchableOpacity>

          {/* Card 3: Quỹ Gia Đình */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('FamilyFundDashboard')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: '#d1fae5' }]}>
              <Text style={styles.cardIcon}>💸</Text>
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Quỹ gia đình</Text>
              <Text style={styles.cardDesc}>Quản lý tiền đóng góp, chi tiêu, đầu tư và số dư của các tài khoản quỹ chung</Text>
            </View>
            <Text style={styles.arrowIcon}>chevron-right</Text>
          </TouchableOpacity>

        </View>

        {/* Version info footer */}
        <Text style={styles.versionText}>Phiên bản React Native v1.0.0 PRO</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  widgetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  widget: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  widgetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeart: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  cardsWrapper: {
    width: '100%',
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#090d16',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  cardIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 24,
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  arrowIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginLeft: 8,
  },
  versionText: {
    marginTop: 40,
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
  },
});
