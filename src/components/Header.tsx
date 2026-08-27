import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BrandLink } from './Brand'
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
    <header className="site-header">
      <div className="page header-main">
        <button className="menu-btn" type="button" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {settings.logoUrl ? (
          <Link to="/" className="logo-link">
            <img src={settings.logoUrl} alt="FeedBoss" className="h-8 w-auto" />
          </Link>
        ) : (
          <BrandLink />
        )}

        <nav className="header-nav">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'on' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <form onSubmit={onSearch} className="header-search">
          <Search className="search-ico" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('search', lang)} />
          <button className="search-go" type="submit">
            {tr('searchGo', lang)}
          </button>
        </form>

        <button className="lang-btn" type="button" onClick={() => setLang(lang === 'bn' ? 'en' : 'bn')}>
          {lang === 'bn' ? 'EN' : 'বাং'}
        </button>
      </div>

      <nav className={`header-sub${categories.length ? '' : ' header-sub-empty'}`}>
        <div className="page header-sub-inner">
          {nav.map((n) => (
            <NavLink
              key={`sub-${n.to}`}
              to={n.to}
              end={n.to === '/'}
              className={({ isActive }) => `sub-only-mobile ${isActive ? 'on' : ''}`}
            >
              {n.label}
            </NavLink>
          ))}
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`}>
              {pick(c, lang, 'name')}
            </Link>
          ))}
        </div>
      </nav>

      {open && (
        <div className="mobile-drawer">
          <form onSubmit={onSearch} className="mb-3">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('search', lang)} />
          </form>
          {nav.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)}>
              {n.label}
            </Link>
          ))}
          <p className="drawer-label">{tr('categories', lang)}</p>
          {categories.map((c) => (
            <Link key={c.id} to={`/category/${c.slug}`} onClick={() => setOpen(false)}>
              {pick(c, lang, 'name')}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
