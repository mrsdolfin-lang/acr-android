/**
 * firebase.js — Single Firebase init + all required exports.
 *
 * Exports everything needed by auth screens and AppContext.
 * Using getApps() guard prevents duplicate-app errors on hot reload.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyD9PMlLhfypSKZ8tqEzX4zpNrJOgq01RJw',
  authDomain:        'acrom-40c8c.firebaseapp.com',
  projectId:         'acrom-40c8c',
  storageBucket:     'acrom-40c8c.firebasestorage.app',
  messagingSenderId: '1065429844661',
  appId:             '1:1065429844661:web:c044cc91dc5f0a770574fc',
  measurementId:     'G-1F3J1YPB8Z',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db   = getFirestore(app);

// Auth exports — used by LoginScreen and AppContext
export {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
};

// Firestore exports — used by CloudSyncService
export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
  limit,
};
