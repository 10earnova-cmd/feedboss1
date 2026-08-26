import { Link } from 'react-router-dom'
import { Seo } from '../components/Seo'
import { VideoCard } from '../components/VideoCard'
import { VideoGrid } from '../components/VideoGrid'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { pick } from '../lib/format'
import { tr } from '../i18n'

export function Home() {
  const { lang } = useLang()
  const { settings, published, categories } = useSite()
  const featured = published.filter((v) => v.featured).slice(0, 10)
  const trending = published.filter((v) => v.trending).slice(0, 8)
  const latest = published.slice(0, 16)
  const name = lang === 'bn' ? settings.siteNameBn : settings.siteNameEn

  return (
    <div>
      <Seo title={`${name} — ${lang === 'bn' ? settings.taglineBn : settings.taglineEn}`} description={lang === 'bn' ? settings.taglineBn : settings.taglineEn} />

      <div className="mb-6 rounded-2xl border border-line bg-[radial-gradient(circle_at_top_left,#ff2d5533,transparent_40%),linear-gradient(180deg,#18181f,#101014)] p-6">
        <p className="text-xs font-bold tracking-widest text-accent uppercase">18+ Bangladesh</p>
        <h1 className="font-display mt-1 text-3xl font-extrabold sm:text-4xl">{name}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{lang === 'bn' ? settings.taglineBn : settings.taglineEn}</p>
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((c) => (
          <Link
            key={c.id}
            to={`/category/${c.slug}`}
            className="shrink-0 rounded-full border border-line bg-raised px-4 py-2 text-sm font-semibold hover:border-accent hover:text-accent"
          >
            {pick(c, lang, 'name')}
          </Link>
        ))}
      </div>

      {featured.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{tr('featured', lang)}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {featured.map((v) => (
              <div key={v.id} className="w-[260px] shrink-0 sm:w-[300px]">
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="mb-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{tr('trending', lang)}</h2>
            <Link to="/trending" className="text-sm text-accent">
              {tr('more', lang)}
            </Link>
          </div>
          <VideoGrid videos={trending} />
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{tr('latest', lang)}</h2>
          <Link to="/latest" className="text-sm text-accent">
            {tr('more', lang)}
          </Link>
        </div>
        {latest.length === 0 ? (
          <p className="text-muted">{tr('noVideos', lang)}</p>
        ) : (
          <VideoGrid videos={latest} />
        )}
      </section>
    </div>
  )
}
