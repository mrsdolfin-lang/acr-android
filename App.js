// App.js — ACROM AutoExpense Tracker v4.0
import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AppProvider, useApp } from './src/services/AppContext';
import { theme } from './src/utils/theme';

import LoginScreen            from './src/screens/LoginScreen';
import HomeScreen             from './src/screens/HomeScreen';
import TransactionsScreen     from './src/screens/TransactionsScreen';
import AnalyticsScreen        from './src/screens/AnalyticsScreen';
import BudgetScreen           from './src/screens/BudgetScreen';
import GoalsScreen            from './src/screens/GoalsScreen';
import SmsScreen              from './src/screens/SmsScreen';
import MoreScreen             from './src/screens/MoreScreen';
import AddTransactionScreen   from './src/screens/AddTransactionScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Home: '◈', Transactions: '⇄', SMS: '📩',
  Analytics: '⌇', Budget: '🎯', Goals: '🏆', More: '⋯'
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 18, opacity: focused ? 1 : 0.4 }}>
            {TAB_ICONS[route.name] || '•'}
          </Text>
        ),
        tabBarLabel: route.name,
        tabBarActiveTintColor:   theme.colors.mint,
        tabBarInactiveTintColor: theme.colors.t3,
        tabBarStyle: {
          backgroundColor: theme.colors.bg2,
          borderTopColor:  theme.colors.border,
          borderTopWidth:  1,
          height:          75,
          paddingBottom:   12,
          paddingTop:      8,
        },
        tabBarLabelStyle: { fontSize: 9, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Home"         component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="SMS"          component={SmsScreen} />
      <Tab.Screen name="Analytics"    component={AnalyticsScreen} />
      <Tab.Screen name="Budget"       component={BudgetScreen} />
      <Tab.Screen name="Goals"        component={GoalsScreen} />
      <Tab.Screen name="More"         component={MoreScreen} />
    </Tab.Navigator>
  );
}

function RootNav() {
  const { loading } = useApp();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"  component={LoginScreen} />
      <Stack.Screen name="Main"   component={MainTabs} />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.bg} />
      <AppProvider>
        <NavigationContainer
          theme={{
            dark: true,
            colors: {
              primary:      theme.colors.mint,
              background:   theme.colors.bg,
              card:         theme.colors.bg2,
              text:         theme.colors.t1,
              border:       theme.colors.border,
              notification: theme.colors.red,
            },
          }}
        >
          <RootNav />
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}
