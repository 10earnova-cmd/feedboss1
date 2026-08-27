import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { VideoGrid } from '../components/VideoGrid'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { tr } from '../i18n'

export function Home() {
  const { lang } = useLang()
  const { settings, published } = useSite()
  const trending = published.filter((v) => v.trending).slice(0, 12)
  const rest = published.filter((v) => !trending.some((t) => t.id === v.id)).slice(0, 36)
  const name = lang === 'bn' ? settings.siteNameBn : settings.siteNameEn

  return (
    <div>
      <Seo title={`${name} — ${lang === 'bn' ? settings.taglineBn : settings.taglineEn}`} description={lang === 'bn' ? settings.taglineBn : settings.taglineEn} />

      {trending.length > 0 && (
        <section className="mb-6">
          <div className="section-head">
            <h2>{tr('trending', lang)}</h2>
            <Link to="/trending">{tr('more', lang)}</Link>
          </div>
          <VideoGrid videos={trending} />
        </section>
      )}

      <section>
        <div className="section-head">
          <h2>{tr('featured', lang)}</h2>
          <Link to="/latest">{tr('more', lang)}</Link>
        </div>
        {published.length === 0 ? (
          <p className="text-muted">{tr('noVideos', lang)}</p>
        ) : (
          <VideoGrid videos={rest.length ? rest : published.slice(0, 36)} />
        )}
      </section>
    </div>
  )
}
