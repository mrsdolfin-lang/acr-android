/**
 * AppContext — Global application state
 *
 * Fixes:
 *  - setUser(null) after sign-out was not stopping AutoCaptureService
 *  - pushTransaction called inside setValidTx closure (stale user ref) → fixed with userRef
 *  - No error boundary on AsyncStorage parse — invalid JSON crashed app → try/catch per key
 *  - addTransactions imported but not used in some paths → unified
 *  - doSync re-ran fullSync when not signed in → guarded
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, onAuthStateChanged, signOut as fbSignOut } from './firebase';
import {
  fullSync,
  pullSettings,
  pushTransaction,
  pushTransactionBatch,
  deleteCloudTransaction,
  pushBudgets,
  pushGoals,
  pushOverrides,
  syncUserProfile,
} from './CloudSyncService';
import {
  startAutoCaptureService,
  stopAutoCaptureService,
  updateAutoCaptureConfig,
  manualFlush,
} from './AutoCaptureService';
import { findDuplicate, mergeTransactions } from './DuplicateDetector';
import { getQueueStats }  from './CaptureQueue';
import { generateTxId }   from '../utils/parseEngine';

const KEYS = {
  TX:        'acrom_tx4',
  BUDGETS:   'acrom_bud4',
  GOALS:     'acrom_goals4',
  CURRENCY:  'acrom_cur',
  OVERRIDES: 'acrom_ovr4',
};

const AppContext = createContext(null);

// Safe JSON parse — returns fallback value instead of throwing
function safeJsonParse(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const [validTx,    setValidTx]    = useState([]);
  const [budgets,    setBudgets]    = useState({});
  const [goals,      setGoals]      = useState([]);
  const [currency,   setCurrencyState] = useState('₹');
  const [overrides,  setOverrides]  = useState({});
  const [user,       setUser]       = useState(null);
  const [syncing,    setSyncing]    = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [queueStats, setQueueStats] = useState({ pending: 0, ready: 0 });

  // Refs so closures always see latest values without re-mounting effects
  const validTxRef  = useRef([]);
  const userRef     = useRef(null);
  useEffect(() => { validTxRef.current = validTx; }, [validTx]);
  useEffect(() => { userRef.current    = user;    }, [user]);

  // ── Boot: load persisted data ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const [txRaw, budRaw, goalsRaw, curRaw, ovrRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.TX),
          AsyncStorage.getItem(KEYS.BUDGETS),
          AsyncStorage.getItem(KEYS.GOALS),
          AsyncStorage.getItem(KEYS.CURRENCY),
          AsyncStorage.getItem(KEYS.OVERRIDES),
        ]);
        const tx = safeJsonParse(txRaw, []);
        if (Array.isArray(tx))   setValidTx(tx);
        const bud = safeJsonParse(budRaw, {});
        if (bud && typeof bud === 'object') setBudgets(bud);
        const gl = safeJsonParse(goalsRaw, []);
        if (Array.isArray(gl))   setGoals(gl);
        if (curRaw)              setCurrencyState(curRaw);
        const ovr = safeJsonParse(ovrRaw, {});
        if (ovr && typeof ovr === 'object') setOverrides(ovr);
      } catch (e) {
        console.warn('[AppContext] boot error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Firebase auth ───────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser || null);
      if (!firebaseUser) return;

      try {
        setSyncing(true);
        const [mergedTx, cloudSettings] = await Promise.all([
          fullSync(firebaseUser.uid, validTxRef.current),
          pullSettings(firebaseUser.uid),
        ]);

        if (Array.isArray(mergedTx)) {
          setValidTx(mergedTx);
          await AsyncStorage.setItem(KEYS.TX, JSON.stringify(mergedTx)).catch(() => {});
        }

        if (cloudSettings?.budgets && typeof cloudSettings.budgets === 'object') {
          setBudgets(cloudSettings.budgets);
          await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(cloudSettings.budgets)).catch(() => {});
        }
        if (Array.isArray(cloudSettings?.goals)) {
          setGoals(cloudSettings.goals);
          await AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(cloudSettings.goals)).catch(() => {});
        }
        if (cloudSettings?.overrides && typeof cloudSettings.overrides === 'object') {
          setOverrides(cloudSettings.overrides);
          await AsyncStorage.setItem(KEYS.OVERRIDES, JSON.stringify(cloudSettings.overrides)).catch(() => {});
        }

        syncUserProfile(firebaseUser.uid, {
          displayName: firebaseUser.displayName || '',
          email:       firebaseUser.email || '',
        }).catch(() => {});
      } catch (e) {
        console.warn('[AppContext] post-login sync error:', e);
      } finally {
        setSyncing(false);
      }
    });
    return unsub;
  }, []);

  // ── AutoCaptureService lifecycle ────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;

    startAutoCaptureService({
      currency,
      overrides,
      existingTransactions: () => validTxRef.current,
      onTransactionsReady: async (capturedItems) => {
        if (!Array.isArray(capturedItems) || capturedItems.length === 0) return;

        setValidTx((prev) => {
          let updated = [...(prev || [])];
          for (const item of capturedItems) {
            if (!item) continue;
            if (item._mergeUpdate) {
              const idx = updated.findIndex((t) => t.id === item.id);
              if (idx !== -1) updated[idx] = { ...item };
            } else {
              updated = [item, ...updated];
            }
          }
          AsyncStorage.setItem(KEYS.TX, JSON.stringify(updated)).catch(() => {});
          const newOnly = capturedItems.filter((i) => i && !i._mergeUpdate);
          if (userRef.current && newOnly.length > 0) {
            pushTransactionBatch(userRef.current.uid, newOnly).catch(() => {});
          }
          return updated;
        });

        getQueueStats().then(setQueueStats).catch(() => {});
      },
    });

    return () => stopAutoCaptureService();
  }, [loading]); // only re-run when loading changes

  useEffect(() => {
    if (!loading) updateAutoCaptureConfig({ currency, overrides });
  }, [currency, overrides, loading]);

  // Queue stats badge update
  useEffect(() => {
    const id = setInterval(() => {
      getQueueStats().then(setQueueStats).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // ── Persistence helper ──────────────────────────────────────────────────────
  const saveTx = useCallback(async (list) => {
    try {
      await AsyncStorage.setItem(KEYS.TX, JSON.stringify(list));
    } catch (e) {
      console.warn('[AppContext] saveTx error:', e);
    }
  }, []);

  // ── Transaction operations ──────────────────────────────────────────────────
  const addTransaction = useCallback(async (txData) => {
    if (!txData) return;

    const duplicate = findDuplicate(txData, validTxRef.current);
    if (duplicate) {
      const merged = mergeTransactions(duplicate, txData);
      setValidTx((prev) => {
        const updated = (prev || []).map((t) => t.id === merged.id ? merged : t);
        saveTx(updated);
        return updated;
      });
      if (userRef.current) pushTransaction(userRef.current.uid, merged).catch(() => {});
      return;
    }

    const newTx = { ...txData, id: txData.id || generateTxId() };
    setValidTx((prev) => {
      const next = [newTx, ...(prev || [])];
      saveTx(next);
      return next;
    });
    if (userRef.current) pushTransaction(userRef.current.uid, newTx).catch(() => {});
  }, [saveTx]);

  const addTransactions = useCallback(async (txArray) => {
    if (!Array.isArray(txArray) || txArray.length === 0) return;

    const deduped = [];
    const workingList = [...validTxRef.current];
    for (const tx of txArray) {
      if (!tx) continue;
      if (!findDuplicate(tx, workingList)) {
        deduped.push(tx);
        workingList.push(tx);
      }
    }
    if (deduped.length === 0) return;

    setValidTx((prev) => {
      const next = [...deduped, ...(prev || [])];
      saveTx(next);
      return next;
    });
    if (userRef.current) pushTransactionBatch(userRef.current.uid, deduped).catch(() => {});
  }, [saveTx]);

  const deleteTransaction = useCallback(async (id) => {
    if (!id) return;
    setValidTx((prev) => {
      const next = (prev || []).filter((t) => t.id !== id);
      saveTx(next);
      return next;
    });
    if (userRef.current) deleteCloudTransaction(userRef.current.uid, id).catch(() => {});
  }, [saveTx]);

  // ── Budget operations ───────────────────────────────────────────────────────
  const saveBudget = useCallback(async (cat, amount) => {
    if (!cat) return;
    setBudgets((prev) => {
      const next = { ...(prev || {}), [cat]: amount };
      AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(next)).catch(() => {});
      if (userRef.current) pushBudgets(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  const deleteBudget = useCallback(async (cat) => {
    if (!cat) return;
    setBudgets((prev) => {
      const next = { ...(prev || {}) };
      delete next[cat];
      AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(next)).catch(() => {});
      if (userRef.current) pushBudgets(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  // ── Goal operations ─────────────────────────────────────────────────────────
  const addGoal = useCallback(async (goal) => {
    if (!goal) return;
    setGoals((prev) => {
      const next = [...(prev || []), goal];
      AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(next)).catch(() => {});
      if (userRef.current) pushGoals(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  const deleteGoal = useCallback(async (id) => {
    if (!id) return;
    setGoals((prev) => {
      const next = (prev || []).filter((g) => g.id !== id);
      AsyncStorage.setItem(KEYS.GOALS, JSON.stringify(next)).catch(() => {});
      if (userRef.current) pushGoals(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  // ── Settings ────────────────────────────────────────────────────────────────
  const setCurrency = useCallback(async (sym) => {
    if (!sym) return;
    setCurrencyState(sym);
    AsyncStorage.setItem(KEYS.CURRENCY, sym).catch(() => {});
    if (userRef.current) syncUserProfile(userRef.current.uid, { currency: sym }).catch(() => {});
  }, []);

  const saveOverride = useCallback(async (merchant, category) => {
    if (!merchant || !category) return;
    setOverrides((prev) => {
      const next = { ...(prev || {}), [merchant.toLowerCase().trim()]: category };
      AsyncStorage.setItem(KEYS.OVERRIDES, JSON.stringify(next)).catch(() => {});
      if (userRef.current) pushOverrides(userRef.current.uid, next).catch(() => {});
      return next;
    });
  }, []);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const signOutUser = useCallback(async () => {
    try {
      stopAutoCaptureService();
      await fbSignOut(auth);
      setUser(null);
    } catch (e) {
      console.warn('[AppContext] signOut error:', e);
    }
  }, []);

  const doSync = useCallback(async () => {
    if (!userRef.current) return;
    setSyncing(true);
    try {
      const mergedTx = await fullSync(userRef.current.uid, validTxRef.current);
      if (Array.isArray(mergedTx)) {
        setValidTx(mergedTx);
        await saveTx(mergedTx);
        await manualFlush(mergedTx);
      }
    } catch (e) {
      console.warn('[AppContext] doSync error:', e);
    } finally {
      setSyncing(false);
    }
  }, [saveTx]);

  return (
    <AppContext.Provider value={{
      validTx,
      budgets,
      goals,
      currency,
      overrides,
      user,
      syncing,
      loading,
      queueStats,
      addTransaction,
      addTransactions,
      deleteTransaction,
      saveBudget,
      deleteBudget,
      addGoal,
      deleteGoal,
      setCurrency,
      saveOverride,
      signOut: signOutUser,
      doSync,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
