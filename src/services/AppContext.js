// src/services/AppContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, onAuthStateChanged, signOut as fbSignOut } from './firebase';

const AppCtx = createContext(null);
const KEYS = { TX:'acrom_tx4', BUD:'acrom_bud4', GOALS:'acrom_goals4', CUR:'acrom_cur', OVR:'acrom_ovr4' };

async function load(key, fallback) {
  try { const v = await AsyncStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e) { return fallback; }
}
async function save(key, val) {
  try { await AsyncStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

export function AppProvider({ children }) {
  const [loading,   setLoading]   = useState(true);
  const [user,      setUser]      = useState(null);
  const [validTx,   setValidTx]   = useState([]);
  const [budgets,   setBudgets]   = useState({});
  const [goals,     setGoals]     = useState([]);
  const [currency,  setCurrencyS] = useState('₹');
  const [overrides, setOverrides] = useState({});
  const [syncing,   setSyncing]   = useState(false);

  useEffect(() => {
    Promise.all([
      load(KEYS.TX, []), load(KEYS.BUD, {}), load(KEYS.GOALS, []),
      AsyncStorage.getItem(KEYS.CUR), load(KEYS.OVR, {}),
    ]).then(([tx, bud, gl, cur, ovr]) => {
      setValidTx(tx); setBudgets(bud); setGoals(gl);
      setCurrencyS(cur || '₹'); setOverrides(ovr);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    try {
      const unsub = onAuthStateChanged(auth, u => setUser(u));
      return unsub;
    } catch(e) { setLoading(false); }
  }, []);

  const generateId = () => 'tx_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);

  const addTransaction = useCallback(async (txData) => {
    const tx = { ...txData, id: txData.id || generateId(), timestamp: txData.timestamp || new Date().toISOString() };
    const updated = [tx, ...validTx];
    setValidTx(updated);
    await save(KEYS.TX, updated);
    return { success: true, tx };
  }, [validTx]);

  const deleteTransaction = useCallback(async (id) => {
    const updated = validTx.filter(t => t.id !== id);
    setValidTx(updated);
    await save(KEYS.TX, updated);
  }, [validTx]);

  const saveBudget = useCallback(async (cat, amount) => {
    const updated = { ...budgets, [cat]: amount };
    setBudgets(updated); await save(KEYS.BUD, updated);
  }, [budgets]);

  const deleteBudget = useCallback(async (cat) => {
    const updated = { ...budgets }; delete updated[cat];
    setBudgets(updated); await save(KEYS.BUD, updated);
  }, [budgets]);

  const setCurrency = useCallback(async (sym) => {
    setCurrencyS(sym);
    try { await AsyncStorage.setItem(KEYS.CUR, sym); } catch(e) {}
  }, []);

  const saveOverride = useCallback(async (merchant, category) => {
    const updated = { ...overrides, [merchant.toLowerCase()]: category };
    setOverrides(updated); await save(KEYS.OVR, updated);
  }, [overrides]);

  const signOut = useCallback(async () => {
    try { await fbSignOut(auth); } catch(e) {}
    setUser(null);
  }, []);

  const doSync = useCallback(async () => {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 800));
    setSyncing(false);
  }, []);

  return (
    <AppCtx.Provider value={{
      loading, user, validTx, budgets, goals, currency, overrides, syncing,
      addTransaction, deleteTransaction, saveBudget, deleteBudget,
      setCurrency, saveOverride, signOut, doSync,
    }}>
      {children}
    </AppCtx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
}
