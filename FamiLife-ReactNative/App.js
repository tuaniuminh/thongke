import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import FeatureScreen from './src/screens/FeatureScreen';
import ThuChiDashboard from './src/features/thu-chi-doi-ngoai/ThuChiDashboard';
import { AppProvider } from './src/core/AppContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <NavigationContainer>
          <Stack.Navigator 
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              gestureEnabled: true, // Kích hoạt cử chỉ vuốt native bám tay của iOS!
              animation: 'slide_from_right', // Trượt ngang mượt mà kiểu native
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Feature" component={FeatureScreen} />
            <Stack.Screen name="ThuChiDashboard" component={ThuChiDashboard} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AppProvider>
  );
}
