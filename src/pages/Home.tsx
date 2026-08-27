import { Seo } from '../components/Seo'
import { VideoGrid } from '../components/VideoGrid'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { tr } from '../i18n'

export function Home() {
  const { lang } = useLang()
  const { settings, published, loading } = useSite()
  const name = lang === 'bn' ? settings.siteNameBn : settings.siteNameEn

  return (
    <div>
      <Seo title={`${name} — ${lang === 'bn' ? settings.taglineBn : settings.taglineEn}`} description={lang === 'bn' ? settings.taglineBn : settings.taglineEn} />
      {loading && published.length === 0 ? (
        <p className="text-muted">Loading videos…</p>
      ) : published.length === 0 ? (
        <p className="text-muted">{tr('noVideos', lang)}</p>
      ) : (
        <VideoGrid videos={published} />
      )}
    </div>
  )
}
