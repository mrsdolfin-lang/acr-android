// src/services/AppContext.js
// ════════════════════════════════════════
//  ACROM — Global App State
// ════════════════════════════════════════

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { loadLocal, saveAll, syncFromCloud } from './storage';
import { auth, onAuthStateChanged, signOut as fbSignOut } from './firebase';
import { isDuplicate, generateTxId } from '../utils/parseEngine';

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [overrides,    setOverrides]    = useState({});
  const [budgets,      setBudgets]      = useState({});
  const [goals,        setGoals]        = useState([]);
  const [currency,     setCurrencyState]= useState('$');
  const [loading,      setLoading]      = useState(true);
  const [syncing,      setSyncing]      = useState(false);
  const [lastSync,     setLastSync]     = useState(null);

  // ── Load on mount ──────────────────────────
  useEffect(() => {
    loadLocal().then(data => {
      setTransactions(data.transactions);
      setOverrides(data.overrides);
      setBudgets(data.budgets);
      setGoals(data.goals);
      setCurrencyState(data.currency);
      setLoading(false);
    });
  }, []);

  // ── Auth listener ──────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setSyncing(true);
        const cloudData = await syncFromCloud(u.uid);
        if (cloudData) {
          setTransactions(cloudData.transactions);
          setOverrides(cloudData.overrides);
          setBudgets(cloudData.budgets);
          setGoals(cloudData.goals);
          setCurrencyState(cloudData.currency);
          setLastSync(new Date().toISOString());
        }
        setSyncing(false);
      }
    });
    return unsub;
  }, []);

  // ── App foreground sync ────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && user) doSync();
    });
    return () => sub.remove();
  }, [user]);

  // ── Current state snapshot ─────────────────
  const getState = useCallback(() => ({
    transactions, overrides, budgets, goals, currency
  }), [transactions, overrides, budgets, goals, currency]);

  // ── Save helper ────────────────────────────
  const persist = useCallback(async (newState) => {
    await saveAll(newState, user?.uid);
  }, [user]);

  // ── Add Transaction ────────────────────────
  const addTransaction = useCallback(async (txData) => {
    const tx = {
      ...txData,
      id:        txData.id        || generateTxId(),
      timestamp: txData.timestamp || new Date().toISOString(),
      is_dup:    false,
    };
    if (isDuplicate(tx, transactions)) return { success: false, reason: 'duplicate' };

    const updated = [tx, ...transactions];
    setTransactions(updated);
    const newState = { ...getState(), transactions: updated };
    await persist(newState);
    return { success: true, tx };
  }, [transactions, getState, persist]);

  // ── Delete Transaction ─────────────────────
  const deleteTransaction = useCallback(async (id) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    await persist({ ...getState(), transactions: updated });
  }, [transactions, getState, persist]);

  // ── Override Category ──────────────────────
  const overrideCategory = useCallback(async (txId, newCat) => {
    const updatedTx = transactions.map(t =>
      t.id === txId ? { ...t, category: newCat } : t
    );
    const tx      = transactions.find(t => t.id === txId);
    const newOvr  = { ...overrides };
    if (tx) newOvr[tx.merchant.toLowerCase()] = newCat;

    setTransactions(updatedTx);
    setOverrides(newOvr);
    await persist({ ...getState(), transactions: updatedTx, overrides: newOvr });
  }, [transactions, overrides, getState, persist]);

  // ── Save Budget ────────────────────────────
  const saveBudget = useCallback(async (category, amount) => {
    const updated = { ...budgets, [category]: amount };
    setBudgets(updated);
    await persist({ ...getState(), budgets: updated });
  }, [budgets, getState, persist]);

  // ── Delete Budget ──────────────────────────
  const deleteBudget = useCallback(async (category) => {
    const updated = { ...budgets };
    delete updated[category];
    setBudgets(updated);
    await persist({ ...getState(), budgets: updated });
  }, [budgets, getState, persist]);

  // ── Save Goal ──────────────────────────────
  const saveGoal = useCallback(async (goal) => {
    const updated = goal.id
      ? goals.map(g => g.id === goal.id ? goal : g)
      : [...goals, { ...goal, id: 'g_' + Date.now() }];
    setGoals(updated);
    await persist({ ...getState(), goals: updated });
  }, [goals, getState, persist]);

  // ── Delete Goal ────────────────────────────
  const deleteGoal = useCallback(async (id) => {
    const updated = goals.filter(g => g.id !== id);
    setGoals(updated);
    await persist({ ...getState(), goals: updated });
  }, [goals, getState, persist]);

  // ── Set Currency ───────────────────────────
  const setCurrency = useCallback(async (sym) => {
    setCurrencyState(sym);
    await persist({ ...getState(), currency: sym });
  }, [getState, persist]);

  // ── Cloud Sync ─────────────────────────────
  const doSync = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    const data = await syncFromCloud(user.uid);
    if (data) {
      setTransactions(data.transactions);
      setOverrides(data.overrides);
      setBudgets(data.budgets);
      setGoals(data.goals);
      setCurrencyState(data.currency);
      setLastSync(new Date().toISOString());
    }
    setSyncing(false);
  }, [user, syncing]);

  // ── Sign Out ───────────────────────────────
  const signOut = useCallback(async () => {
    await fbSignOut(auth);
    setUser(null);
  }, []);

  const value = {
    // State
    user, transactions, overrides, budgets, goals, currency,
    loading, syncing, lastSync,
    // Actions
    addTransaction, deleteTransaction, overrideCategory,
    saveBudget, deleteBudget,
    saveGoal, deleteGoal,
    setCurrency, doSync, signOut,
    // Computed
    validTx: transactions.filter(t => !t.is_dup),
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export const useApp = () => useContext(AppCtx);
