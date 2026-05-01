import { useMemo } from 'react';
import { TRANSACTION_TYPES } from '../constants';

/**
 * Derives income, spending, net, and category breakdown from a transaction list.
 * All inputs null-guarded to prevent crashes on empty/undefined state.
 */
export function useTransactionStats(transactions) {
  return useMemo(() => {
    const empty = { income: 0, spent: 0, net: 0, saved: 0, categoryBreakdown: [], count: 0 };

    if (!Array.isArray(transactions) || transactions.length === 0) return empty;

    let income = 0;
    let spent  = 0;
    const categoryTotals = {};

    for (const tx of transactions) {
      if (!tx) continue;
      const amount = typeof tx.amount === 'number' && !isNaN(tx.amount) ? tx.amount : 0;

      if (tx.type === TRANSACTION_TYPES.CREDIT) {
        income += amount;
      } else if (tx.type === TRANSACTION_TYPES.DEBIT) {
        spent += amount;
        const cat = tx.category || 'Others';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;
      }
    }

    const net   = income - spent;
    const saved = net > 0 ? net : 0;

    const categoryBreakdown = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({ category, amount }));

    return { income, spent, net, saved, categoryBreakdown, count: transactions.length };
  }, [transactions]);
}
