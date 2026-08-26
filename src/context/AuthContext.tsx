import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { adminEmail, auth, firebaseEnabled, firestore } from '../lib/firebase'

const DEMO_EMAIL = 'admin@deshix.com'
const DEMO_PASS = 'admin123'
const DEMO_KEY = 'deshix_demo_admin'

type Ctx = {
  user: { uid: string; email: string } | null
  loading: boolean
  firebaseOn: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

async function ensureAdminDoc(user: User) {
  if (!firestore) return
  const email = (user.email || '').toLowerCase()
  const ref = doc(firestore, 'admins', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  if (adminEmail && email !== adminEmail) return
  await setDoc(ref, { email, createdAt: Date.now(), role: 'admin' })
}

async function isAdminUser(user: User) {
  const email = (user.email || '').toLowerCase()
  if (adminEmail && email === adminEmail) return true
  if (!firestore) return false
  const snap = await getDoc(doc(firestore, 'admins', user.uid))
  return snap.exists()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ uid: string; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      if (sessionStorage.getItem(DEMO_KEY) === '1') {
        setUser({ uid: 'demo', email: DEMO_EMAIL })
      }
      setLoading(false)
      return
    }
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null)
        setLoading(false)
        return
      }
      await ensureAdminDoc(fbUser)
      const allowed = await isAdminUser(fbUser)
      if (!allowed) {
        if (auth) await signOut(auth)
        setUser(null)
        setLoading(false)
        return
      }
      setUser({ uid: fbUser.uid, email: fbUser.email || '' })
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const login = async (email: string, password: string) => {
    if (!firebaseEnabled || !auth) {
      if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASS) {
        sessionStorage.setItem(DEMO_KEY, '1')
        setUser({ uid: 'demo', email: DEMO_EMAIL })
        return
      }
      throw new Error('ডেমো লগইন:  admin@deshix.com  /  admin123')
    }
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await ensureAdminDoc(cred.user)
    const allowed = await isAdminUser(cred.user)
    if (!allowed) {
      await signOut(auth)
      throw new Error('এই ইমেইল অ্যাডমিন নয়। Firestore admins কালেকশনে UID যোগ করুন অথবা VITE_ADMIN_EMAIL মিলিয়ে নিন।')
    }
    setUser({ uid: cred.user.uid, email: cred.user.email || '' })
  }

  const register = async (email: string, password: string) => {
    if (!firebaseEnabled || !auth) {
      throw new Error('Firebase চালু করলেই নতুন অ্যাডমিন তৈরি হবে।')
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await ensureAdminDoc(cred.user)
    const allowed = await isAdminUser(cred.user)
    if (!allowed) {
      await signOut(auth)
      throw new Error('রেজিস্টার হয়েছে কিন্তু অ্যাডমিন নয়। VITE_ADMIN_EMAIL এই ইমেইল দিন।')
    }
    setUser({ uid: cred.user.uid, email: cred.user.email || '' })
  }

  const logout = async () => {
    sessionStorage.removeItem(DEMO_KEY)
    if (auth) await signOut(auth)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, firebaseOn: firebaseEnabled, login, register, logout }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth')
  return ctx
}
