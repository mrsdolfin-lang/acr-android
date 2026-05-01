/**
 * AIInsightsService — Rule-based financial intelligence engine
 * 
 * No external API. Pure JS analytics:
 *  - Financial health score
 *  - Overspending alerts
 *  - Spending pattern analysis
 *  - Anomaly detection
 *  - Saving suggestions
 *  - Bill/subscription detection
 *  - Expense prediction
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, SUBSCRIPTION_PATTERNS } from '../constants';

// ── AI Insights Cache (30 minutes TTL) ────────────────────────────────────
const AI_CACHE_KEY = STORAGE_KEYS.AI_INSIGHTS;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Load cached AI insights. Returns null if cache is missing or expired.
 */
export async function loadCachedInsights() {
  try {
    const raw = await AsyncStorage.getItem(AI_CACHE_KEY);
    if (!raw) return null;
    const { data, savedAt } = JSON.parse(raw);
    if (Date.now() - savedAt > CACHE_TTL_MS) return null; // expired
    return data;
  } catch {
    return null;
  }
}

/**
 * Save AI insights to cache with current timestamp.
 */
export async function saveCachedInsights(data) {
  try {
    await AsyncStorage.setItem(AI_CACHE_KEY, JSON.stringify({
      data,
      savedAt: Date.now(),
    }));
  } catch {}
}

/**
 * Clear AI insights cache (call when transactions change significantly).
 */
export async function clearInsightsCache() {
  try { await AsyncStorage.removeItem(AI_CACHE_KEY); } catch {}
}

// ── Financial Health Score ─────────────────────────────────────────────────

/**
 * Calculates a 0–100 financial health score based on:
 *   - Savings rate (40%)
 *   - Budget adherence (25%)
 *   - Debt ratio (20%)
 *   - Spending consistency (15%)
 */
export function calculateHealthScore(transactions, budgets) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return { score: 0, grade: 'N/A', factors: [] };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTx = transactions.filter((t) => new Date(t.timestamp) >= monthStart);

  const income = monthTx.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = monthTx.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);

  if (income === 0) return { score: 0, grade: 'N/A', factors: [] };

  // Savings rate score (ideal: 20%+ savings = full 40 pts)
  const savingsRate = Math.max(0, (income - expenses) / income);
  const savingsScore = Math.min(40, savingsRate * 200);

  // Budget adherence score
  let budgetScore = 25;
  const budgetKeys = Object.keys(budgets || {});
  if (budgetKeys.length > 0) {
    const catSpend = {};
    monthTx.filter((t) => t.type === 'debit').forEach((t) => {
      catSpend[t.category] = (catSpend[t.category] || 0) + (t.amount || 0);
    });
    let overBudgetCount = 0;
    budgetKeys.forEach((cat) => {
      if ((catSpend[cat] || 0) > budgets[cat]) overBudgetCount++;
    });
    budgetScore = Math.max(0, 25 - (overBudgetCount / budgetKeys.length) * 25);
  }

  // Spending consistency (lower variance = better, up to 15 pts)
  const last3Months = getLast3MonthsSpending(transactions);
  const variance = calculateVariance(last3Months);
  const avgSpend = last3Months.reduce((s, v) => s + v, 0) / (last3Months.length || 1);
  const cvRatio = avgSpend > 0 ? Math.sqrt(variance) / avgSpend : 1;
  const consistencyScore = Math.min(15, Math.max(0, 15 * (1 - cvRatio)));

  // Subscription overhead (deduct up to 20 pts if >30% on subscriptions)
  const subscriptionSpend = monthTx
    .filter((t) => t.type === 'debit' && t.isSubscription)
    .reduce((s, t) => s + (t.amount || 0), 0);
  const subRatio = expenses > 0 ? subscriptionSpend / expenses : 0;
  const debtScore = Math.max(0, 20 - subRatio * 40);

  const total = Math.round(savingsScore + budgetScore + consistencyScore + debtScore);
  const score = Math.min(100, Math.max(0, total));

  const grade =
    score >= 80 ? 'Excellent' :
    score >= 60 ? 'Good' :
    score >= 40 ? 'Fair' : 'Needs Work';

  const factors = [
    { label: 'Savings Rate',   score: Math.round(savingsScore),     max: 40, value: `${Math.round(savingsRate * 100)}%` },
    { label: 'Budget Control', score: Math.round(budgetScore),      max: 25, value: budgetKeys.length > 0 ? 'Active' : 'Not set' },
    { label: 'Consistency',    score: Math.round(consistencyScore), max: 15, value: cvRatio < 0.2 ? 'Stable' : 'Variable' },
    { label: 'Overhead',       score: Math.round(debtScore),        max: 20, value: `${Math.round(subRatio * 100)}% in subs` },
  ];

  return { score, grade, factors, savingsRate: Math.round(savingsRate * 100) };
}

function getLast3MonthsSpending(transactions) {
  const now = new Date();
  return [0, 1, 2].map((offset) => {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    return transactions
      .filter((t) => {
        const d = new Date(t.timestamp);
        return t.type === 'debit' && d >= start && d <= end;
      })
      .reduce((s, t) => s + (t.amount || 0), 0);
  });
}

function calculateVariance(values) {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
}

// ── Overspending Alerts ────────────────────────────────────────────────────

export function detectOverspending(transactions, budgets) {
  const alerts = [];
  if (!Object.keys(budgets || {}).length) return alerts;

  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.timestamp);
    return t.type === 'debit' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const catSpend = {};
  monthTx.forEach((t) => {
    catSpend[t.category] = (catSpend[t.category] || 0) + (t.amount || 0);
  });

  Object.entries(budgets).forEach(([cat, limit]) => {
    const spent = catSpend[cat] || 0;
    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    if (pct >= 100) {
      alerts.push({ type: 'critical', category: cat, pct: Math.round(pct), spent, limit, message: `${cat} budget exceeded by ₹${Math.round(spent - limit).toLocaleString('en-IN')}` });
    } else if (pct >= 80) {
      alerts.push({ type: 'warning', category: cat, pct: Math.round(pct), spent, limit, message: `${cat} is ${Math.round(pct)}% of budget` });
    }
  });

  return alerts.sort((a, b) => b.pct - a.pct);
}

// ── Anomaly Detection ──────────────────────────────────────────────────────

export function detectAnomalies(transactions) {
  const anomalies = [];
  if (!transactions || transactions.length < 5) return anomalies;

  // Group by category, compute average + std dev
  const catGroups = {};
  transactions.forEach((t) => {
    if (t.type !== 'debit') return;
    const cat = t.category || 'Others';
    if (!catGroups[cat]) catGroups[cat] = [];
    catGroups[cat].push(t.amount || 0);
  });

  transactions.forEach((t) => {
    if (t.type !== 'debit') return;
    const cat = t.category || 'Others';
    const amounts = catGroups[cat];
    if (!amounts || amounts.length < 3) return;

    const mean = amounts.reduce((s, v) => s + v, 0) / amounts.length;
    const std  = Math.sqrt(amounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / amounts.length);

    if (std > 0 && (t.amount - mean) > 2.5 * std) {
      anomalies.push({
        txId: t.id,
        merchant: t.merchant,
        amount: t.amount,
        category: cat,
        avgForCategory: Math.round(mean),
        message: `Unusually large ${cat} payment — ${Math.round(t.amount / mean)}x your average`,
      });
    }
  });

  return anomalies.slice(0, 5);
}

// ── Expense Prediction ─────────────────────────────────────────────────────

export function predictNextMonthExpenses(transactions) {
  const now = new Date();

  // Use last 3 months weighted average (recent month weighs more)
  const weights = [0.5, 0.3, 0.2];
  const monthlyTotals = [0, 1, 2].map((offset) => {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end   = new Date(now.getFullYear(), now.getMonth() - offset + 1, 0);
    return transactions
      .filter((t) => {
        const d = new Date(t.timestamp);
        return t.type === 'debit' && d >= start && d <= end;
      })
      .reduce((s, t) => s + (t.amount || 0), 0);
  });

  const predicted = weights.reduce((sum, w, i) => sum + w * monthlyTotals[i], 0);
  const trend = monthlyTotals[0] - monthlyTotals[1]; // positive = increasing

  return {
    predicted: Math.round(predicted),
    trend,
    trendLabel: Math.abs(trend) < 500 ? 'Stable' : trend > 0 ? 'Rising ↑' : 'Declining ↓',
    trendAmount: Math.abs(Math.round(trend)),
  };
}

// ── Saving Suggestions ─────────────────────────────────────────────────────

export function generateSavingSuggestions(transactions, budgets) {
  const suggestions = [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthTx = transactions.filter((t) => new Date(t.timestamp) >= monthStart && t.type === 'debit');

  const income = transactions
    .filter((t) => { const d = new Date(t.timestamp); return t.type === 'credit' && d >= monthStart; })
    .reduce((s, t) => s + (t.amount || 0), 0);

  if (income === 0) return suggestions;

  const catSpend = {};
  monthTx.forEach((t) => { catSpend[t.category] = (catSpend[t.category] || 0) + (t.amount || 0); });

  // Subscription check
  const subSpend = monthTx.filter((t) => t.isSubscription).reduce((s, t) => s + (t.amount || 0), 0);
  if (subSpend > income * 0.1) {
    suggestions.push({ type: 'subscriptions', title: 'Review Subscriptions', detail: `Spending ₹${Math.round(subSpend).toLocaleString('en-IN')}/mo on subscriptions (${Math.round(subSpend/income*100)}% of income)`, saving: Math.round(subSpend * 0.3), icon: '📺' });
  }

  // Food vs Groceries
  const foodSpend = (catSpend['Food'] || 0) + (catSpend['Groceries'] || 0);
  if (foodSpend > income * 0.2) {
    suggestions.push({ type: 'food', title: 'Reduce Food Delivery', detail: `Food costs ₹${Math.round(foodSpend).toLocaleString('en-IN')} (${Math.round(foodSpend/income*100)}% of income). Cooking 3x/week saves ~30%.`, saving: Math.round(foodSpend * 0.3), icon: '🍳' });
  }

  // Transport
  if ((catSpend['Transport'] || 0) > income * 0.15) {
    suggestions.push({ type: 'transport', title: 'Optimize Commute', detail: 'High transport spending detected. Consider metro/bus or carpooling.', saving: Math.round((catSpend['Transport'] || 0) * 0.25), icon: '🚌' });
  }

  // No investment detected
  if (!(catSpend['Investment'])) {
    const savingsAmount = Math.round(income * 0.1);
    suggestions.push({ type: 'investment', title: 'Start a SIP', detail: `Invest ₹${savingsAmount.toLocaleString('en-IN')}/mo in index funds for long-term wealth.`, saving: 0, icon: '📈', isGrowth: true });
  }

  return suggestions;
}

// ── Subscription Detector ──────────────────────────────────────────────────

export function detectSubscriptions(transactions) {
  const subs = {};

  transactions.forEach((tx) => {
    if (tx.type !== 'debit') return;
    const merchantKey = (tx.merchant || '').toLowerCase().trim();
    const isKnownSub = SUBSCRIPTION_PATTERNS.some((kw) => merchantKey.includes(kw) || (tx.raw || '').toLowerCase().includes(kw));
    if (!isKnownSub) return;

    if (!subs[merchantKey]) {
      subs[merchantKey] = {
        merchant: tx.merchant,
        category: tx.category,
        amount:   tx.amount,
        transactions: [],
        frequency: 'monthly',
      };
    }
    subs[merchantKey].transactions.push(tx);
  });

  return Object.values(subs).map((sub) => ({
    ...sub,
    totalPaid: sub.transactions.reduce((s, t) => s + (t.amount || 0), 0),
    lastBilled: sub.transactions[0]?.timestamp,
    count: sub.transactions.length,
  })).filter((s) => s.count >= 1)
    .sort((a, b) => b.amount - a.amount);
}

// ── Net Worth Snapshot ─────────────────────────────────────────────────────

export function calculateNetWorthSnapshot(transactions) {
  const totalIncome = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const investmentTotal = transactions.filter((t) => t.type === 'debit' && t.category === 'Investment').reduce((s, t) => s + (t.amount || 0), 0);

  return {
    cashBalance: Math.max(0, totalIncome - totalExpenses),
    totalInvested: investmentTotal,
    totalSaved: Math.max(0, totalIncome - totalExpenses) + investmentTotal * 0.1, // rough estimate
    netWorth: Math.max(0, totalIncome - totalExpenses) + investmentTotal,
  };
}
