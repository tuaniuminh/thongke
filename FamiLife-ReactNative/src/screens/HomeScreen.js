import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { convertSolar2Lunar } from '../utils/lunar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [lunarDateText, setLunarDateText] = useState('Lịch âm: --/--');
  const [weatherText, setWeatherText] = useState('--°C - Tải...');

  useEffect(() => {
    // 1. Calculate Lunar Date
    const today = new Date();
    const dd = today.getDate();
    const mm = today.getMonth() + 1;
    const yyyy = today.getFullYear();
    const lunar = convertSolar2Lunar(dd, mm, yyyy);
    if (lunar) {
      const monthStr = String(lunar.lMonth).padStart(2, '0');
      const dayStr = String(lunar.lDay).padStart(2, '0');
      setLunarDateText(`Lịch âm: ${dayStr}/${monthStr} (${lunar.gzYear})`);
    }

    // 2. Fetch Hanoi weather data
    const fetchWeather = async () => {
      try {
        const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,weather_code');
        if (response.ok) {
          const data = await response.json();
          if (data && data.current) {
            const temp = Math.round(data.current.temperature_2m);
            const code = data.current.weather_code;
            let desc = 'Nhiều mây';

            if (code === 0) desc = 'Trời quang';
            else if (code >= 1 && code <= 3) desc = 'Mây rải rác';
            else if (code === 45 || code === 48) desc = 'Sương mù';
            else if (code >= 51 && code <= 55) desc = 'Mưa phùn';
            else if (code >= 61 && code <= 65) desc = 'Mưa';
            else if (code >= 80 && code <= 82) desc = 'Mưa rào';
            else if (code >= 95 && code <= 99) desc = 'Dông bão';

            setWeatherText(`${temp}°C - ${desc}`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch Hanoi weather:', err);
        setWeatherText('Ngoại tuyến');
      }
    };

    fetchWeather();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Header Widgets Area */}
        <View style={styles.widgetsRow}>
          <View style={styles.widget}>
            <Text style={styles.widgetLabel}>{lunarDateText}</Text>
          </View>
          <View style={styles.widget}>
            <Text style={styles.widgetLabel}>🌡️ {weatherText}</Text>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <View style={styles.logoBox}>
              <MaterialCommunityIcons name="heart-pulse" size={46} color="#0ea5e9" />
            </View>
          </View>
          <Text style={styles.appTitle}>
            Fami<Text style={{ color: '#0ea5e9' }}>Life</Text>
          </Text>
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
            <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <MaterialCommunityIcons name="hand-coin" size={24} color="#f59e0b" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Thu chi đối ngoại</Text>
              <Text style={styles.cardDesc}>Quản lý tiền đi mừng hiếu hỷ, thăm hỏi, quà cáp và thống kê quan hệ gia đình</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Card 2: Y Tế */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('MedicalDashboard')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
              <MaterialCommunityIcons name="activity" size={24} color="#f43f5e" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Hồ sơ y tế</Text>
              <Text style={styles.cardDesc}>Theo dõi chỉ số sức khỏe, lịch sử y khoa của thành viên và phân tích bằng trợ lý AI</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Card 3: Quỹ Gia Đình */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('FamilyFundDashboard')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(14, 165, 233, 0.1)' }]}>
              <MaterialCommunityIcons name="wallet" size={24} color="#0ea5e9" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Quỹ gia đình</Text>
              <Text style={styles.cardDesc}>Quản lý tiền đóng góp, chi tiêu, đầu tư và số dư của các tài khoản quỹ chung</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Card 4: Cài Đặt */}
          <TouchableOpacity 
            style={styles.card} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Settings')}
          >
            <View style={[styles.cardIconWrapper, { backgroundColor: 'rgba(100, 116, 139, 0.15)' }]}>
              <MaterialCommunityIcons name="database" size={24} color="#94a3b8" />
            </View>
            <View style={styles.cardTextContent}>
              <Text style={styles.cardTitle}>Cấu hình & Cài đặt</Text>
              <Text style={styles.cardDesc}>Đăng ký API Key Gemini, liên kết email vợ chồng và quản lý thành viên gia đình</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#64748b" />
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
    backgroundColor: '#090d16',
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
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  widgetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f8fafc',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#0f1626',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoHeart: {
    fontSize: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
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
    backgroundColor: 'rgba(15, 22, 38, 0.7)',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
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
    color: '#f8fafc',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 18,
  },
  arrowIcon: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
    marginLeft: 8,
  },
  versionText: {
    marginTop: 40,
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
  },
});
