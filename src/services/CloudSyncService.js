/**
 * CloudSyncService
 *
 * Handles all Firestore read/write operations for a logged-in user.
 *
 * Firestore structure:
 *   users/{uid}/
 *     profile         { currency, updatedAt }
 *     transactions/   { [txId]: TransactionObject }
 *     budgets/        { [budgetId]: BudgetObject }
 *     goals/          { [goalId]: GoalObject }
 *     overrides/      { [overrideId]: OverrideObject }
 *     captureLog/     { [logId]: CaptureLogEntry }   (debug/audit)
 *
 * Sync strategy: "last write wins" with local-first approach.
 * On login → pull cloud → merge with local (local wins conflicts).
 * On data change → push to cloud asynchronously.
 */

import {
  db,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from './firebase';

// ─── Collection Path Helpers ──────────────────────────────────────────────────

const userRef = (uid) => doc(db, 'users', uid);
const txCollection = (uid) => collection(db, 'users', uid, 'transactions');
const budgetsCollection = (uid) => collection(db, 'users', uid, 'budgets');
const goalsCollection = (uid) => collection(db, 'users', uid, 'goals');
const overridesCollection = (uid) => collection(db, 'users', uid, 'overrides');
const captureLogCollection = (uid) => collection(db, 'users', uid, 'captureLog');

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Saves or updates the user's profile meta (currency, etc).
 */
export async function syncUserProfile(uid, profileData) {
  try {
    await setDoc(userRef(uid), { ...profileData, updatedAt: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn('[CloudSync] syncUserProfile error:', e.message);
  }
}

/**
 * Writes a single transaction to Firestore.
 * Used for real-time push after each new transaction.
 */
export async function pushTransaction(uid, transaction) {
  try {
    const ref = doc(txCollection(uid), transaction.id);
    await setDoc(ref, { ...transaction, syncedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[CloudSync] pushTransaction error:', e.message);
  }
}

/**
 * Batch-writes multiple transactions (used on first sync / import).
 * Splits into batches of 400 to stay within Firestore's 500-write limit.
 */
export async function pushTransactionBatch(uid, transactions) {
  if (!transactions || transactions.length === 0) return;

  const BATCH_SIZE = 400;
  for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
    const chunk = transactions.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach((tx) => {
      const ref = doc(txCollection(uid), tx.id);
      batch.set(ref, { ...tx, syncedAt: serverTimestamp() });
    });
    try {
      await batch.commit();
    } catch (e) {
      console.warn('[CloudSync] pushTransactionBatch error:', e.message);
    }
  }
}

/**
 * Deletes a single transaction from Firestore.
 */
export async function deleteCloudTransaction(uid, transactionId) {
  try {
    await deleteDoc(doc(txCollection(uid), transactionId));
  } catch (e) {
    console.warn('[CloudSync] deleteCloudTransaction error:', e.message);
  }
}

/**
 * Overwrites all budgets in Firestore for this user.
 */
export async function pushBudgets(uid, budgets) {
  try {
    const ref = doc(db, 'users', uid, 'settings', 'budgets');
    await setDoc(ref, { data: budgets, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[CloudSync] pushBudgets error:', e.message);
  }
}

/**
 * Overwrites all goals in Firestore.
 */
export async function pushGoals(uid, goals) {
  try {
    const ref = doc(db, 'users', uid, 'settings', 'goals');
    await setDoc(ref, { data: goals, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[CloudSync] pushGoals error:', e.message);
  }
}

/**
 * Overwrites category overrides in Firestore.
 */
export async function pushOverrides(uid, overrides) {
  try {
    const ref = doc(db, 'users', uid, 'settings', 'overrides');
    await setDoc(ref, { data: overrides, updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[CloudSync] pushOverrides error:', e.message);
  }
}

/**
 * Writes a capture log entry for debugging/audit.
 * Does NOT store raw sensitive messages — only metadata.
 */
export async function logCaptureEvent(uid, logEntry) {
  try {
    const ref = doc(captureLogCollection(uid), logEntry.id);
    await setDoc(ref, { ...logEntry, loggedAt: serverTimestamp() });
  } catch (e) {
    // Non-critical — silently ignore log failures
  }
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Pulls all transactions from Firestore for a user.
 * Returns an array of transaction objects.
 */
export async function pullTransactions(uid) {
  try {
    const snapshot = await getDocs(txCollection(uid));
    return snapshot.docs.map((d) => d.data());
  } catch (e) {
    console.warn('[CloudSync] pullTransactions error:', e.message);
    return [];
  }
}

/**
 * Pulls settings (budgets, goals, overrides, currency) from Firestore.
 * Returns an object with { budgets, goals, overrides, currency }.
 */
export async function pullSettings(uid) {
  try {
    const [budgetsSnap, goalsSnap, overridesSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid, 'settings', 'budgets')),
      getDoc(doc(db, 'users', uid, 'settings', 'goals')),
      getDoc(doc(db, 'users', uid, 'settings', 'overrides')),
    ]);

    return {
      budgets: budgetsSnap.exists() ? budgetsSnap.data().data || {} : null,
      goals: goalsSnap.exists() ? goalsSnap.data().data || [] : null,
      overrides: overridesSnap.exists() ? overridesSnap.data().data || {} : null,
    };
  } catch (e) {
    console.warn('[CloudSync] pullSettings error:', e.message);
    return { budgets: null, goals: null, overrides: null };
  }
}

// ─── Full Sync ────────────────────────────────────────────────────────────────

/**
 * Full bidirectional sync:
 *   1. Pull cloud transactions
 *   2. Merge with local (dedup by ID)
 *   3. Push any local-only transactions to cloud
 *
 * Returns the merged transaction array.
 */
export async function fullSync(uid, localTransactions) {
  try {
    const cloudTransactions = await pullTransactions(uid);

    // Build lookup maps for fast merge
    const localById = Object.fromEntries(localTransactions.map((tx) => [tx.id, tx]));
    const cloudById = Object.fromEntries(cloudTransactions.map((tx) => [tx.id, tx]));

    // Merge: cloud has priority for existing IDs (they may have been updated elsewhere)
    const mergedMap = { ...localById, ...cloudById };
    const merged = Object.values(mergedMap).sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Push local-only transactions to cloud
    const localOnlyTx = localTransactions.filter((tx) => !cloudById[tx.id]);
    if (localOnlyTx.length > 0) {
      await pushTransactionBatch(uid, localOnlyTx);
    }

    return merged;
  } catch (e) {
    console.warn('[CloudSync] fullSync error:', e.message);
    return localTransactions; // fallback to local on error
  }
}
