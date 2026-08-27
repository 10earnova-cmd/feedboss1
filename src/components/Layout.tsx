import { Outlet } from 'react-router-dom'
import { useAge } from '../context/AgeContext'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { AdSlot, PopunderAd } from './AdSlot'
import { Footer } from './Footer'
import { Header } from './Header'
import { tr } from '../i18n'

export function Layout() {
  const { ok, enter } = useAge()
  const { lang } = useLang()
  const { settings, ads } = useSite()

  if (!ok) {
    return (
      <div className="grid min-h-svh place-items-center bg-ink px-4">
        <div className="card w-full max-w-lg p-8 text-center">
          <p className="logo text-4xl">
            {(lang === 'bn' ? settings.siteNameBn : settings.siteNameEn).replace(/x|X|এক্স/i, '')}
            <span className="logo-x">X</span>
          </p>
          <h1 className="mt-4 text-xl font-bold">{tr('ageTitle', lang)}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {lang === 'bn' ? settings.ageGateBn : settings.ageGateEn}
          </p>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-primary flex-1" type="button" onClick={enter}>
              {tr('enter', lang)}
            </button>
            <a className="btn btn-ghost flex-1" href="https://google.com">
              {tr('exit', lang)}
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col">
      <PopunderAd ads={ads} />
      <Header />
      <div className="page py-2">
        <AdSlot slot="header" ads={ads} />
      </div>
      <main className="page flex-1 pb-20 pt-2">
        <Outlet />
      </main>
      <Footer />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-panel/95 p-2 md:hidden">
        <AdSlot slot="mobile_sticky" ads={ads} />
      </div>
    </div>
  )
}
