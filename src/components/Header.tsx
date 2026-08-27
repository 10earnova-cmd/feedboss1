import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { BrandLink } from './Brand'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { tr } from '../i18n'

export function Header() {
  const { lang, setLang } = useLang()
  const { settings } = useSite()
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  const onSearch = (e: FormEvent) => {
    e.preventDefault()
    const query = q.trim()
    if (!query) return
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  return (
    <header className="site-header">
      <div className="page header-main">
        {settings.logoUrl ? (
          <Link to="/" className="logo-link">
            <img src={settings.logoUrl} alt="FeedBoss" className="h-8 w-auto" />
          </Link>
        ) : (
          <BrandLink />
        )}

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
    </header>
  )
}
