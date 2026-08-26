import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { AdSlot } from './AdSlot'
import { tr } from '../i18n'

export function Footer() {
  const { lang } = useLang()
  const { settings, ads } = useSite()
  const name = lang === 'bn' ? settings.siteNameBn : settings.siteNameEn

  return (
    <footer className="mt-12 border-t border-line bg-panel">
      <div className="page py-6">
        <AdSlot slot="footer" ads={ads} className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="font-display text-lg font-extrabold">
            {name}
            <span className="ml-2 text-xs font-semibold text-accent">18+</span>
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <Link to="/about">{tr('about', lang)}</Link>
            <Link to="/terms">{tr('terms', lang)}</Link>
            <Link to="/privacy">{tr('privacy', lang)}</Link>
            <Link to="/dmca">{tr('dmca', lang)}</Link>
            <Link to="/2257">{tr('rec2257', lang)}</Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-muted">
          {lang === 'bn'
            ? 'সকল মডেল চিত্রায়ণের সময় ১৮+ ছিলেন। অবৈধ কনটেন্ট নিষিদ্ধ।'
            : 'All models were 18+ at the time of depiction. Illegal content is prohibited.'}
        </p>
      </div>
    </footer>
  )
}
