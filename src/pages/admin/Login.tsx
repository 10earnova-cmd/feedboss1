import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { firebaseEnabled } from '../../lib/firebase'
import { Seo } from '../../components/Seo'

export function AdminLogin() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(firebaseEnabled ? '' : 'admin@deshix.com')
  const [password, setPassword] = useState(firebaseEnabled ? '' : 'admin123')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'register') await register(email, password)
      else await login(email, password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-svh place-items-center bg-ink px-4">
      <Seo title="Admin login | FeedBoss" />
      <form onSubmit={(e) => void onSubmit(e)} className="card w-full max-w-md p-6">
        <h1 className="font-display text-2xl font-extrabold">
          Feed<span className="text-accent">Boss</span> Admin
        </h1>
        <p className="mt-1 text-sm text-muted">
          {firebaseEnabled
            ? 'Firebase Auth + Realtime Database. Enable Email/Password, then login with the admin email.'
            : 'Demo mode — Firebase is not connected yet.'}
        </p>
        {!firebaseEnabled && (
          <p className="mt-3 rounded-lg bg-raised px-3 py-2 text-xs text-gold">
            Email: admin@deshix.com · Password: admin123
          </p>
        )}
        <label className="mt-4 block text-sm">Email</label>
        <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mt-3 block text-sm">Password</label>
        <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button className="btn btn-primary mt-5 w-full" disabled={busy} type="submit">
          {busy ? '...' : mode === 'login' ? 'Login' : 'Create admin'}
        </button>
        {firebaseEnabled && (
          <button className="btn btn-ghost mt-2 w-full" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
            {mode === 'login' ? 'Register a new admin' : 'Already have an account'}
          </button>
        )}
        <Link to="/" className="mt-4 block text-center text-sm text-muted">
          ← Back to site
        </Link>
      </form>
    </div>
  )
}
