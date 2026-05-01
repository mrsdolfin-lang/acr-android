/**
 * ACROM Smart Expense Tracker v5.0 — App Entry
 *
 * Navigation:
 *   Login → Main Tabs
 *   Main Tabs: Home · Transactions · Analytics · AI · Budget · Goals · More
 *   Modals: AddTransaction · TransactionDetail
 */

import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import * as SplashScreen     from 'expo-splash-screen';
import { SafeAreaProvider }  from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator }   from '@react-navigation/bottom-tabs';
import { Text, View }        from 'react-native';

import { ThemeProvider, useTheme } from './src/services/ThemeContext';
import { AppProvider, useApp }     from './src/services/AppContext';

import LoginScreen              from './src/screens/LoginScreen';
import HomeScreen               from './src/screens/HomeScreen';
import TransactionsScreen       from './src/screens/TransactionsScreen';
import SmsScreen                from './src/screens/SmsScreen';
import AnalyticsScreen          from './src/screens/AnalyticsScreen';
import AIInsightsScreen         from './src/screens/AIInsightsScreen';
import BudgetScreen             from './src/screens/BudgetScreen';
import GoalsScreen              from './src/screens/GoalsScreen';
import MoreScreen               from './src/screens/MoreScreen';
import AddTransactionScreen     from './src/screens/AddTransactionScreen';
import TransactionDetailScreen  from './src/screens/TransactionDetailScreen';
import CaptureLogScreen         from './src/screens/CaptureLogScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: focused ? 18 : 16, opacity: focused ? 1 : 0.45 }}>
      {emoji}
    </Text>
  );
}

function MainTabs() {
  const { colors } = useTheme();
  const { queueStats } = useApp();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.mint,
        tabBarInactiveTintColor: colors.t3,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home"         component={HomeScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="◈" focused={focused} /> }} />
      <Tab.Screen name="Transactions" component={TransactionsScreen}
        options={{ tabBarLabel: 'Txns', tabBarIcon: ({ focused }) => <TabIcon emoji="⇄" focused={focused} /> }} />
      <Tab.Screen name="Analytics"    component={AnalyticsScreen}
        options={{ tabBarLabel: 'Stats', tabBarIcon: ({ focused }) => <TabIcon emoji="⌇" focused={focused} /> }} />
      <Tab.Screen name="AI"           component={AIInsightsScreen}
        options={{ tabBarLabel: 'AI', tabBarIcon: ({ focused }) => <TabIcon emoji="🧠" focused={focused} /> }} />
      <Tab.Screen name="Budget"       component={BudgetScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" focused={focused} /> }} />
      <Tab.Screen name="Goals"        component={GoalsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏆" focused={focused} /> }} />
      <Tab.Screen name="More"         component={MoreScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⋯" focused={focused} /> }} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { colors } = useTheme();
  const { loading } = useApp();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync().catch(() => {});
  }, [loading]);

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Main"  component={MainTabs} />
        <Stack.Screen
          name="AddTransaction"
          component={AddTransactionScreen}
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={TransactionDetailScreen}
          options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="CaptureLog"
          component={CaptureLogScreen}
          options={{ presentation: 'card', animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <RootNavigator />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
