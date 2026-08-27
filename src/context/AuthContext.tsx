import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth'
import { get, ref, set } from 'firebase/database'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { adminEmail, auth, firebaseEnabled, rtdb } from '../lib/firebase'

const DEMO_EMAIL = 'admin@deshix.com'
const DEMO_PASS = 'admin123'
const DEMO_KEY = 'deshix_demo_admin'

type Ctx = {
  user: { uid: string; email: string } | null
  loading: boolean
  firebaseOn: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<Ctx | null>(null)

async function ensureAdminDoc(user: User) {
  if (!rtdb) return
  const email = (user.email || '').toLowerCase()
  const node = ref(rtdb, `admins/${user.uid}`)
  const snap = await get(node)
  if (snap.exists()) return
  if (adminEmail && email !== adminEmail) return
  await set(node, { email, createdAt: Date.now(), role: 'admin' })
}

async function isAdminUser(user: User) {
  const email = (user.email || '').toLowerCase()
  if (adminEmail && email === adminEmail) return true
  if (!rtdb) return false
  const snap = await get(ref(rtdb, `admins/${user.uid}`))
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
      throw new Error('Demo login:  admin@deshix.com  /  admin123')
    }
    const cred = await signInWithEmailAndPassword(auth, email, password)
    await ensureAdminDoc(cred.user)
    const allowed = await isAdminUser(cred.user)
    if (!allowed) {
      await signOut(auth)
      throw new Error('This email is not an admin. Set VITE_ADMIN_EMAIL to this email.')
    }
    setUser({ uid: cred.user.uid, email: cred.user.email || '' })
  }

  const logout = async () => {
    sessionStorage.removeItem(DEMO_KEY)
    if (auth) await signOut(auth)
    setUser(null)
  }

  const value = useMemo(
    () => ({ user, loading, firebaseOn: firebaseEnabled, login, logout }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth')
  return ctx
}
