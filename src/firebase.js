// Lazy-loaded Firebase configuration
// This dramatically reduces initial bundle size by only loading Firebase when actually needed

let firebaseApp = null;
let firebaseAuth = null;
let firestoreInstance = null;
let googleProviderInstance = null;

// Lazy loading function for Firebase
export const getFirebaseAuth = async () => {
  if (!firebaseAuth) {
    // Dynamically import Firebase modules only when needed
    const { initializeApp } = await import('firebase/app');
    const { getAuth, setPersistence, browserLocalPersistence } = await import('firebase/auth');
    
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };
    
    firebaseApp = initializeApp(firebaseConfig);
    firebaseAuth = getAuth(firebaseApp);
    await setPersistence(firebaseAuth, browserLocalPersistence);
  }
  
  return firebaseAuth;
};

// Lazy loading function for Google Provider
export const getGoogleProvider = async () => {
  if (!googleProviderInstance) {
    const { GoogleAuthProvider } = await import('firebase/auth');
    googleProviderInstance = new GoogleAuthProvider();
  }
  return googleProviderInstance;
};

// Lazy loading function for auth methods
export const getAuthMethods = async () => {
  const authModule = await import('firebase/auth');
  return {
    signInWithEmailAndPassword: authModule.signInWithEmailAndPassword,
    signInWithPopup: authModule.signInWithPopup,
    sendPasswordResetEmail: authModule.sendPasswordResetEmail,
    onAuthStateChanged: authModule.onAuthStateChanged,
    signOut: authModule.signOut
  };
};

// Backward compatibility exports (lazy loaded)
export const auth = {
  get: () => getFirebaseAuth()
};

export const app = firebaseApp;
export const googleProvider = googleProviderInstance;

// Legacy method exports (async wrapped)
export const signInWithEmailAndPassword = async (...args) => {
  const { signInWithEmailAndPassword: method } = await getAuthMethods();
  return method(...args);
};

export const signInWithPopup = async (...args) => {
  const { signInWithPopup: method } = await getAuthMethods();
  return method(...args);
};

export const sendPasswordResetEmail = async (...args) => {
  const { sendPasswordResetEmail: method } = await getAuthMethods();
  return method(...args);
};

// Lazy loading function for Firestore
export const getFirestore = async () => {
  if (!firestoreInstance) {
    // Initialize Firebase app if not already done
    if (!firebaseApp) {
      const { initializeApp } = await import('firebase/app');
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };
      firebaseApp = initializeApp(firebaseConfig);
    }
    
    // Initialize Firestore
    const { getFirestore: getFirestoreSDK } = await import('firebase/firestore');
    firestoreInstance = getFirestoreSDK(firebaseApp);
  }
  
  return firestoreInstance;
}; 