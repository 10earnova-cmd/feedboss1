import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getDatabase, type Database } from 'firebase/database'

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    (projectId ? `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app` : ''),
}

export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.databaseURL)

let app: FirebaseApp | null = null
let auth: Auth | null = null
let rtdb: Database | null = null

if (firebaseEnabled) {
  app = initializeApp(config)
  auth = getAuth(app)
  rtdb = getDatabase(app, config.databaseURL)
}

export { app, auth, rtdb }

const OWNER_EMAILS = ['am@gmail.com']

export const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || OWNER_EMAILS[0]).trim().toLowerCase()

export function isOwnerEmail(email?: string | null) {
  const value = (email || '').trim().toLowerCase()
  if (!value) return false
  if (OWNER_EMAILS.includes(value)) return true
  return Boolean(adminEmail) && value === adminEmail
}
