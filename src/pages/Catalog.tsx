import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Pagination } from '../components/Pagination'
import { Seo } from '../components/Seo'
import { VideoGrid } from '../components/VideoGrid'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { pick } from '../lib/format'
import { usablePoster } from '../lib/media'
import { tr } from '../i18n'
import { VideoThumb } from '../components/VideoThumb'
import type { Video } from '../types'

const PAGE = 36

function pageOf(list: Video[], page: number) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE))
  const p = Math.min(Math.max(1, page), pages)
  return { slice: list.slice((p - 1) * PAGE, p * PAGE), pages, p }
}

export function Latest() {
  const { lang } = useLang()
  const { published } = useSite()
  const [sp] = useSearchParams()
  const { slice, pages, p } = pageOf(published, Number(sp.get('page') || 1))
  return (
    <div>
      <Seo title={`${tr('latest', lang)} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">{tr('latest', lang)}</h1>
      <VideoGrid videos={slice} />
      <Pagination page={p} pages={pages} makeHref={(n) => `/latest?page=${n}`} />
    </div>
  )
}

export function Trending() {
  const { lang } = useLang()
  const { published } = useSite()
  const list = published.filter((v) => v.trending)
  return (
    <div>
      <Seo title={`${tr('trending', lang)} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">{tr('trending', lang)}</h1>
      <VideoGrid videos={list} />
    </div>
  )
}

export function CategoryPage() {
  const { slug } = useParams()
  const { lang } = useLang()
  const { published, categories } = useSite()
  const cat = categories.find((c) => c.slug === slug)
  const list = published.filter((v) => v.categoryId === cat?.id)
  const [sp] = useSearchParams()
  const { slice, pages, p } = pageOf(list, Number(sp.get('page') || 1))
  const title = cat ? pick(cat, lang, 'name') : tr('categories', lang)
  return (
    <div>
      <Seo title={`${title} | DeshiX`} />
      <h1 className="mb-2 text-2xl font-bold">{title}</h1>
      {cat && <p className="mb-4 text-sm text-muted">{lang === 'bn' ? cat.descriptionBn : cat.descriptionEn}</p>}
      <VideoGrid videos={slice} />
      <Pagination page={p} pages={pages} makeHref={(n) => `/category/${slug}?page=${n}`} />
    </div>
  )
}

export function TagPage() {
  const { slug } = useParams()
  const { lang } = useLang()
  const { published, tags } = useSite()
  const tag = tags.find((t) => t.slug === slug)
  const list = published.filter((v) => tag && v.tagIds.includes(tag.id))
  return (
    <div>
      <Seo title={`#${tag ? pick(tag, lang, 'name') : slug} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">#{tag ? pick(tag, lang, 'name') : slug}</h1>
      <VideoGrid videos={list} />
    </div>
  )
}

export function SearchPage() {
  const { lang } = useLang()
  const { published, tags, categories } = useSite()
  const [sp] = useSearchParams()
  const q = (sp.get('q') || '').trim().toLowerCase()
  const list = useMemo(() => {
    if (!q) return []
    return published.filter((v) => {
      const blob = `${v.titleBn} ${v.titleEn} ${v.captionBn} ${v.captionEn}`.toLowerCase()
      const tagHit = tags.some((t) => v.tagIds.includes(t.id) && `${t.nameBn} ${t.nameEn}`.toLowerCase().includes(q))
      const cat = categories.find((c) => c.id === v.categoryId)
      const catHit = cat ? `${cat.nameBn} ${cat.nameEn}`.toLowerCase().includes(q) : false
      return blob.includes(q) || tagHit || catHit
    })
  }, [q, published, tags, categories])

  return (
    <div>
      <Seo title={`${tr('results', lang)} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">
        {tr('results', lang)}: {q}
      </h1>
      {list.length === 0 ? <p className="text-muted">{tr('noVideos', lang)}</p> : <VideoGrid videos={list} />}
    </div>
  )
}

export function CategoriesPage() {
  const { lang } = useLang()
  const { categories, published } = useSite()
  return (
    <div>
      <Seo title={`${tr('categories', lang)} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">{tr('categories', lang)}</h1>
      <div className="video-grid">
        {categories.map((c) => {
          const count = published.filter((v) => v.categoryId === c.id).length
          const sample = published.find((v) => v.categoryId === c.id)
          return (
            <Link key={c.id} to={`/category/${c.slug}`} className="vcard">
              {c.thumbnailUrl ? (
                <div className="thumb">
                  <img src={c.thumbnailUrl} alt="" />
                </div>
              ) : sample ? (
                <VideoThumb src={sample.videoUrl} poster={usablePoster(sample.thumbnailUrl)} preview={false} />
              ) : (
                <div className="thumb">
                  <div className="thumb-empty" />
                </div>
              )}
              <h3 className="vcard-title">{pick(c, lang, 'name')}</h3>
              <p className="vcard-meta">{count} {lang === 'bn' ? 'ভিডিও' : 'videos'}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function ModelsPage() {
  const { lang } = useLang()
  const { performers, published } = useSite()
  return (
    <div>
      <Seo title={`${tr('models', lang)} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">{tr('models', lang)}</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {performers.map((m) => {
          const count = published.filter((v) => v.modelIds.includes(m.id)).length
          return (
            <Link key={m.id} to={`/model/${m.slug}`} className="card p-4 text-center hover:border-accent">
              <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-raised">
                {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
              </div>
              <h2 className="mt-3 font-bold">{m.name}</h2>
              <p className="text-xs text-muted">{count} {lang === 'bn' ? 'ভিডিও' : 'videos'}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function ModelPage() {
  const { slug } = useParams()
  const { lang } = useLang()
  const { performers, published } = useSite()
  const model = performers.find((m) => m.slug === slug)
  const list = published.filter((v) => model && v.modelIds.includes(model.id))
  if (!model) return <p className="text-muted">{tr('noVideos', lang)}</p>
  return (
    <div>
      <Seo title={`${model.name} | DeshiX`} />
      <div className="mb-6 flex items-center gap-4">
        <div className="h-20 w-20 overflow-hidden rounded-full bg-raised">
          {model.avatarUrl ? <img src={model.avatarUrl} alt="" className="h-full w-full object-cover" /> : null}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{model.name}</h1>
          <p className="text-sm text-muted">{lang === 'bn' ? model.bioBn : model.bioEn}</p>
        </div>
      </div>
      <VideoGrid videos={list} />
    </div>
  )
}

export function LegalPage({ kind }: { kind: 'about' | 'terms' | 'privacy' | 'dmca' | '2257' }) {
  const { lang } = useLang()
  const { settings } = useSite()
  const map = {
    about: { t: tr('about', lang), body: lang === 'bn' ? settings.aboutBn : settings.aboutEn },
    terms: { t: tr('terms', lang), body: lang === 'bn' ? settings.termsBn : settings.termsEn },
    privacy: { t: tr('privacy', lang), body: lang === 'bn' ? settings.privacyBn : settings.privacyEn },
    dmca: { t: tr('dmca', lang), body: lang === 'bn' ? settings.dmcaBn : settings.dmcaEn },
    '2257': { t: tr('rec2257', lang), body: lang === 'bn' ? settings.statement2257Bn : settings.statement2257En },
  } as const
  const item = map[kind]
  return (
    <div className="card p-6">
      <Seo title={`${item.t} | DeshiX`} />
      <h1 className="mb-4 text-2xl font-bold">{item.t}</h1>
      <div className="prose-legal">{item.body}</div>
    </div>
  )
}
