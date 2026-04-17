// src/services/firebase.js
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            "AIzaSyD9PMlLhfypSKZ8tqEzX4zpNrJOgq01RJw",
  authDomain:        "acrom-40c8c.firebaseapp.com",
  projectId:         "acrom-40c8c",
  storageBucket:     "acrom-40c8c.appspot.com",
  messagingSenderId: "1043869233",
  appId:             "1:1043869233:android:acrom40c8c",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export { onAuthStateChanged, signOut };
