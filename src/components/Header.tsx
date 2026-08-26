import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { pick } from '../lib/format'
import { tr } from '../i18n'

export function Header() {
  const { lang, setLang } = useLang()
  const { settings, categories } = useSite()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const name = lang === 'bn' ? settings.siteNameBn : settings.siteNameEn

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
    setOpen(false)
  }

  const nav = [
    { to: '/', label: tr('home', lang) },
    { to: '/latest', label: tr('latest', lang) },
    { to: '/trending', label: tr('trending', lang) },
    { to: '/categories', label: tr('categories', lang) },
    { to: '/models', label: tr('models', lang) },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur-md">
      <div className="page flex h-16 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={name} className="h-8 w-auto" />
          ) : (
            <span className="font-display text-2xl font-extrabold tracking-tight">
              {name.replace(/x|X|এক্স/i, '')}
              <span className="text-accent">X</span>
            </span>
          )}
        </Link>

        <form onSubmit={onSearch} className="relative hidden min-w-0 flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tr('search', lang)}
          />
        </form>

        <nav className="hidden items-center gap-4 lg:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) =>
                `text-sm font-semibold ${isActive ? 'text-accent' : 'text-muted hover:text-white'}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="btn btn-ghost px-3 py-2 text-xs"
          type="button"
          onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}
        >
          {lang === 'bn' ? 'EN' : 'বাং'}
        </button>

        <button className="btn btn-ghost px-2 lg:hidden" type="button" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-panel p-4 lg:hidden">
          <form onSubmit={onSearch} className="mb-3">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('search', lang)} />
          </form>
          <div className="grid gap-2">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="rounded-lg px-2 py-2 hover:bg-raised" onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
            <div className="mt-2 text-xs text-muted">{tr('categories', lang)}</div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.slug}`}
                  className="rounded-full border border-line px-3 py-1 text-sm"
                  onClick={() => setOpen(false)}
                >
                  {pick(c, lang, 'name')}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
