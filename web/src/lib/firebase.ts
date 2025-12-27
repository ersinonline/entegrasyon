/**
 * Firebase Client Configuration
 */

import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCk_zXRUaXKmVlhFX06SXFm0OUKW5f2yyo",
  authDomain: "teknotech-app.firebaseapp.com",
  projectId: "teknotech-app",
  storageBucket: "teknotech-app.firebasestorage.app",
  messagingSenderId: "1048402475376",
  appId: "1:1048402475376:web:c6810699eea9a2619977b5",
  measurementId: "G-91NSV8N24J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Analytics (only in browser)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export default app;
