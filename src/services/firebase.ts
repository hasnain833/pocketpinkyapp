import { initializeApp, getApps, getApp } from 'firebase/app';
import Constants from 'expo-constants';

// Firebase configuration from Expo Constants or environment variables
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: `${process.env.EXPO_PUBLIC_PROJECT_ID}.firebaseapp.com`,
    projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    storageBucket: `${process.env.EXPO_PUBLIC_PROJECT_ID}.appspot.com`,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const initializeFirebase = () => {
    try {
        if (getApps().length === 0) {
            console.log('[Firebase] Initializing App');
            return initializeApp(firebaseConfig);
        } else {
            return getApp();
        }
    } catch (error) {
        console.error('[Firebase] Initialization error:', error);
        return null;
    }
};

export const app = initializeFirebase();
