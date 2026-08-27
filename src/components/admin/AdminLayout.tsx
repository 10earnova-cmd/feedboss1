import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Clapperboard, FolderOpen, LayoutDashboard, Megaphone, Settings, Tags, Upload, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/videos', icon: Clapperboard, label: 'Videos', end: false },
  { to: '/admin/videos/new', icon: Upload, label: 'New video', end: false },
  { to: '/admin/categories', icon: FolderOpen, label: 'Categories', end: false },
  { to: '/admin/tags', icon: Tags, label: 'Tags', end: false },
  { to: '/admin/models', icon: Users, label: 'Models', end: false },
  { to: '/admin/ads', icon: Megaphone, label: 'Ads / Monetag', end: false },
  { to: '/admin/settings', icon: Settings, label: 'Settings', end: false },
]

export function AdminLayout() {
  const { user, loading, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) navigate('/admin/login', { replace: true })
  }, [loading, user, navigate])

  if (loading || !user) {
    return (
      <div className="grid min-h-svh place-items-center bg-ink">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div lang="en" className="min-h-svh bg-ink lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-line bg-panel lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between px-4 py-4">
          <a href="/" className="font-display text-xl font-extrabold">
            Feed<span className="text-accent">Boss</span>
            <span className="ml-2 text-xs text-muted">ADMIN</span>
          </a>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap ${
                  isActive ? 'bg-raised text-accent' : 'text-muted hover:bg-raised hover:text-white'
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden px-4 py-4 lg:block">
          <p className="truncate text-xs text-muted">{user.email}</p>
          <button className="btn btn-ghost mt-2 w-full" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-2 border-b border-line px-4 py-3 lg:hidden">
          <span className="truncate text-xs text-muted">{user.email}</span>
          <button className="btn btn-ghost" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
        <div className="p-4 lg:p-8">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
