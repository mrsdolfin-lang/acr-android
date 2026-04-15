import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AppProvider, useApp } from './src/services/AppContext';
import { ThemeProvider, useTheme } from './src/services/ThemeContext';

import LoginScreen             from './src/screens/LoginScreen';
import HomeScreen              from './src/screens/HomeScreen';
import TransactionsScreen      from './src/screens/TransactionsScreen';
import AnalyticsScreen         from './src/screens/AnalyticsScreen';
import BudgetScreen            from './src/screens/BudgetScreen';
import GoalsScreen             from './src/screens/GoalsScreen';
import SmsScreen               from './src/screens/SmsScreen';
import MoreScreen              from './src/screens/MoreScreen';
import AddTransactionScreen    from './src/screens/AddTransactionScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';

SplashScreen.preventAutoHideAsync();

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TAB_ICONS = {
  Home:'◈', Transactions:'⇄', SMS:'📩',
  Analytics:'⌇', Budget:'🎯', Goals:'🏆', More:'⋯'
};

function MainTabs() {
  const { colors, isDark } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize:18, opacity:focused?1:0.4 }}>
            {TAB_ICONS[route.name]||'•'}
          </Text>
        ),
        tabBarLabel: route.name,
        tabBarActiveTintColor:   colors.mint,
        tabBarInactiveTintColor: colors.t3,
        tabBarStyle: {
          backgroundColor: colors.bg2,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          height:          75,
          paddingBottom:   12,
          paddingTop:      8,
        },
        tabBarLabelStyle: { fontSize:9, fontWeight:'600' },
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
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <Stack.Navigator screenOptions={{ headerShown:false }}>
        <Stack.Screen name="Login"  component={LoginScreen} />
        <Stack.Screen name="Main"   component={MainTabs} />
        <Stack.Screen name="AddTransaction"    component={AddTransactionScreen}    options={{presentation:'modal'}}/>
        <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{presentation:'modal'}}/>
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <NavigationContainer>
            <RootNav />
          </NavigationContainer>
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
