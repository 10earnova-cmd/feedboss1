import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Seo } from '../../components/Seo'

export function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
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
        <p className="mt-1 text-sm text-muted">Sign in with the admin account.</p>
        <label className="mt-4 block text-sm">Email</label>
        <input className="input mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        <label className="mt-3 block text-sm">Password</label>
        <input className="input mt-1" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button className="btn btn-primary mt-5 w-full" disabled={busy} type="submit">
          {busy ? '...' : 'Login'}
        </button>
        <Link to="/" className="mt-4 block text-center text-sm text-muted">
          ← Back to site
        </Link>
      </form>
    </div>
  )
}
