import { Link } from 'react-router-dom'
import { Brand } from './Brand'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { AdSlot } from './AdSlot'
import { tr } from '../i18n'

export function Footer() {
  const { lang } = useLang()
  const { ads } = useSite()

  return (
    <footer className="mt-8 border-t border-line bg-[#0d0d0d]">
      <div className="page py-6">
        <AdSlot slot="footer" ads={ads} className="mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="logo text-xl">
            <Brand />
            <span className="ml-2 align-middle text-xs font-semibold text-accent">18+</span>
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <Link className="hover:text-accent" to="/about">{tr('about', lang)}</Link>
            <Link className="hover:text-accent" to="/terms">{tr('terms', lang)}</Link>
            <Link className="hover:text-accent" to="/privacy">{tr('privacy', lang)}</Link>
            <Link className="hover:text-accent" to="/dmca">{tr('dmca', lang)}</Link>
            <Link className="hover:text-accent" to="/2257">{tr('rec2257', lang)}</Link>
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
