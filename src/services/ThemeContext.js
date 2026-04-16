// src/services/ThemeContext.js — covers entire app
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from '../utils/theme';

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('acrom_theme').then(v => {
      if (v !== null) setIsDark(v === 'dark');
    });
  }, []);

  const toggle = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('acrom_theme', next ? 'dark' : 'light');
  };

  const colors      = isDark ? darkColors  : lightColors;
  const chartColors = isDark
    ? ['#5effa0','#60a5fa','#ffd166','#c084fc','#ff5c5c','#34d399','#fb923c','#facc15','#38bdf8','#94a3b8']
    : ['#00963f','#1565c0','#e65100','#6a1b9a','#c62828','#00695c','#bf360c','#f9a825','#0277bd','#37474f'];

  return (
    <ThemeCtx.Provider value={{ isDark, toggle, colors, chartColors }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeCtx);
  if (!ctx) {
    // Fallback so screens don't crash if used outside provider
    return { isDark: true, toggle: ()=>{}, colors: darkColors,
      chartColors: ['#5effa0','#60a5fa','#ffd166','#c084fc','#ff5c5c','#34d399'] };
  }
  return ctx;
};
