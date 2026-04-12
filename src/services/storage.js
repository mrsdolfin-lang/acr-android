// src/services/storage.js
// ════════════════════════════════════════
//  ACROM — Dual Storage Service
//  AsyncStorage (local) + Firestore (cloud)
// ════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveAllToCloud, cloudLoad } from './firebase';

const KEYS = {
  TX:         'acrom_tx',
  OVR:        'acrom_ovr',
  BUDGETS:    'acrom_bud',
  GOALS:      'acrom_goals',
  CURRENCY:   'acrom_cur',
  SMS_SCANNED:'acrom_sms_scanned',
  LAST_SYNC:  'acrom_last_sync',
};

// ── LOCAL READ ────────────────────────────────
export async function loadLocal() {
  try {
    const [tx, ovr, bud, goals, cur] = await AsyncStorage.multiGet([
      KEYS.TX, KEYS.OVR, KEYS.BUDGETS, KEYS.GOALS, KEYS.CURRENCY
    ]);
    return {
      transactions: tx[1]    ? JSON.parse(tx[1])    : [],
      overrides:    ovr[1]   ? JSON.parse(ovr[1])   : {},
      budgets:      bud[1]   ? JSON.parse(bud[1])   : {},
      goals:        goals[1] ? JSON.parse(goals[1]) : [],
      currency:     cur[1]   || '$',
    };
  } catch (e) {
    console.warn('[Storage] loadLocal error:', e.message);
    return { transactions: [], overrides: {}, budgets: {}, goals: [], currency: '$' };
  }
}

// ── LOCAL WRITE ───────────────────────────────
export async function saveLocal(state) {
  try {
    await AsyncStorage.multiSet([
      [KEYS.TX,      JSON.stringify(state.transactions)],
      [KEYS.OVR,     JSON.stringify(state.overrides)],
      [KEYS.BUDGETS, JSON.stringify(state.budgets)],
      [KEYS.GOALS,   JSON.stringify(state.goals)],
      [KEYS.CURRENCY,state.currency],
    ]);
  } catch (e) {
    console.warn('[Storage] saveLocal error:', e.message);
  }
}

// ── SAVE ALL (local + cloud if user logged in) ──
export async function saveAll(state, uid = null) {
  await saveLocal(state);
  if (uid) {
    await saveAllToCloud(uid, state);
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
  }
}

// ── LOAD FROM CLOUD (merge with local) ────────
export async function syncFromCloud(uid) {
  if (!uid) return null;
  try {
    const cloudData = await cloudLoad(uid);
    if (!cloudData) return null;

    // Merge: cloud wins for settings, local+cloud merge for transactions
    const local = await loadLocal();
    const cloudTxIds = new Set((cloudData.transactions || []).map(t => t.id));
    const localOnlyTx = local.transactions.filter(t => !cloudTxIds.has(t.id));

    const merged = {
      transactions: [...(cloudData.transactions || []), ...localOnlyTx]
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
      overrides:  cloudData.overrides  || local.overrides,
      budgets:    cloudData.budgets    || local.budgets,
      goals:      cloudData.goals      || local.goals,
      currency:   cloudData.currency   || local.currency,
    };

    await saveLocal(merged);
    await AsyncStorage.setItem(KEYS.LAST_SYNC, new Date().toISOString());
    console.log('[Storage] Synced from cloud ✓');
    return merged;
  } catch (e) {
    console.warn('[Storage] syncFromCloud error:', e.message);
    return null;
  }
}

// ── MARK SMS AS SCANNED ────────────────────────
export async function markSmsScanned() {
  await AsyncStorage.setItem(KEYS.SMS_SCANNED, 'true');
}

export async function isSmsAlreadyScanned() {
  const v = await AsyncStorage.getItem(KEYS.SMS_SCANNED);
  return v === 'true';
}

// ── GET LAST SYNC TIME ─────────────────────────
export async function getLastSync() {
  return await AsyncStorage.getItem(KEYS.LAST_SYNC);
}

// ── CLEAR ALL DATA ─────────────────────────────
export async function clearAllData() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}
