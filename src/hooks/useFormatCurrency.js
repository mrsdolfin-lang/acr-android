import { useCallback } from 'react';
import { useApp } from '../services/AppContext';

/**
 * Returns a stable, null-safe currency formatter.
 * format(1234.5)           → "₹1,235"
 * format(1234.5, {decimals:2}) → "₹1,234.50"
 * format(null)             → "₹0"   (safe fallback)
 */
export function useFormatCurrency() {
  const { currency } = useApp();

  const format = useCallback(
    (amount, options = {}) => {
      const { showSign = false, decimals = 0 } = options;
      const sym = currency || '₹';
      const num = (amount === null || amount === undefined || isNaN(amount)) ? 0 : Number(amount);

      const formatted = Math.abs(num).toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      if (showSign && num > 0) return `+${sym}${formatted}`;
      if (showSign && num < 0) return `-${sym}${formatted}`;
      return `${sym}${formatted}`;
    },
    [currency]
  );

  return format;
}
