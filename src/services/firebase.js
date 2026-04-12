// src/services/firebase.js
// ════════════════════════════════════════
//  ACROM — Firebase Config (Real)
//  Project: acrom-40c8c
// ════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyD9PMlLhfypSKZ8tqEzX4zpNrJOgq01RJw",
  authDomain:        "acrom-40c8c.firebaseapp.com",
  projectId:         "acrom-40c8c",
  storageBucket:     "acrom-40c8c.appspot.com",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:acrom40c8c",
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const gProvider = new GoogleAuthProvider();

// ── Save data to Firestore ──────────────────
export async function cloudSave(uid, key, value) {
  try {
    await setDoc(
      doc(db, 'users', uid, 'data', key),
      { v: JSON.stringify(value), t: serverTimestamp() }
    );
    return true;
  } catch (e) {
    console.warn('[ACROM] cloudSave error:', e.message);
    return false;
  }
}

// ── Load all data from Firestore ────────────
export async function cloudLoad(uid) {
  try {
    const keys   = ['transactions', 'overrides', 'budgets', 'goals', 'currency'];
    const result = {};
    for (const k of keys) {
      const snap = await getDoc(doc(db, 'users', uid, 'data', k));
      if (snap.exists()) result[k] = JSON.parse(snap.data().v);
    }
    return result;
  } catch (e) {
    console.warn('[ACROM] cloudLoad error:', e.message);
    return null;
  }
}

// ── Save all app state ──────────────────────
export async function saveAllToCloud(uid, state) {
  if (!uid) return;
  await Promise.all([
    cloudSave(uid, 'transactions', state.transactions),
    cloudSave(uid, 'overrides',    state.overrides),
    cloudSave(uid, 'budgets',      state.budgets),
    cloudSave(uid, 'goals',        state.goals),
    cloudSave(uid, 'currency',     state.currency),
  ]);
}

export { auth, db, gProvider, signInWithCredential, signOut, onAuthStateChanged };
