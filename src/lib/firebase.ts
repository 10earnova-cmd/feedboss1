import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let firestore: Firestore | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  auth = getAuth(app)
  firestore = getFirestore(app)
}

export { app, auth, firestore }

export const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
