/**
 * ThemeContext — Light-mode only.
 *
 * Dark mode has been completely removed per product requirements.
 * The context still exposes `isDark` (always false) and `toggle` (no-op)
 * so all existing component references compile without changes.
 */

import React, { createContext, useContext } from 'react';
import { lightColors, lightChartColors } from '../utils/theme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Light mode is fixed — no toggle, no persistence needed.
  const value = {
    isDark: false,
    toggle: () => {}, // intentional no-op
    colors: lightColors,
    chartColors: lightChartColors,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
