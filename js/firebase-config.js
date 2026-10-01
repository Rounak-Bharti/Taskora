/**
 * Firebase Configuration & Initialization Module for Taskora
 * 
 * Supports Firebase Web SDK (Compat mode via CDN)
 * Provides authentication and Firestore database instances.
 */

// Default Firebase Configuration (Update with your project credentials or override in Settings)
const defaultFirebaseConfig = {
    apiKey: "AIzaSyDemoTaskoraApiKeyForFirebaseClient123",
    authDomain: "taskora-app.firebaseapp.com",
    projectId: "taskora-app",
    storageBucket: "taskora-app.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
};

// Check if user specified a custom config in local settings
function getFirebaseConfig() {
    try {
        const stored = localStorage.getItem('dailyTaskTracker_firebaseConfig');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Could not read custom Firebase config:', e);
    }
    return defaultFirebaseConfig;
}

const activeFirebaseConfig = getFirebaseConfig();

// Initialize Firebase if CDN script is present
let auth = null;
let db = null;

if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(activeFirebaseConfig);
        } catch (err) {
            console.error('Firebase initialization error:', err);
        }
    }
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Enable offline persistence for Firestore if available
    try {
        db.enablePersistence({ synchronizeTabs: true }).catch(err => {
            if (err.code === 'failed-precondition') {
                console.warn('Firestore persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                console.warn('Firestore persistence unsupported by browser');
            }
        });
    } catch (e) {
        // Ignored if persistence is not supported
    }
} else {
    console.warn('Firebase SDK scripts not loaded. Running in local fallback mode.');
}
