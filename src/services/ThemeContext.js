// src/services/ThemeContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, chartColorsDark, chartColorsLight } from '../utils/theme';

const ThemeCtx = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('acrom_theme').then(v => {
      if (v !== null) setIsDark(v === 'dark');
      else setIsDark(Appearance.getColorScheme() !== 'light');
    });
  }, []);

  const toggle = async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem('acrom_theme', next ? 'dark' : 'light');
  };

  const colors      = isDark ? darkColors : lightColors;
  const chartColors = isDark ? chartColorsDark : chartColorsLight;

  return (
    <ThemeCtx.Provider value={{ isDark, toggle, colors, chartColors }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
