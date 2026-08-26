import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { formatDuration, formatViews, pick } from '../lib/format'
import type { Video } from '../types'
import { Link } from 'react-router-dom'
import { Play } from 'lucide-react'

export function VideoCard({ video }: { video: Video }) {
  const { lang } = useLang()
  const { categories } = useSite()
  const cat = categories.find((c) => c.id === video.categoryId)
  const title = pick(video, lang, 'title')

  return (
    <Link to={`/watch/${video.slug}`} className="group block">
      <div className="thumb rounded-xl border border-line">
        {video.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={title} loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center bg-raised text-muted">No thumb</div>
        )}
        <span className="hd">HD</span>
        <span className="badge">{formatDuration(video.duration)}</span>
        <div className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
          <Play className="h-12 w-12 fill-white text-white" />
        </div>
      </div>
      <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-accent">{title}</h3>
      <p className="mt-1 text-xs text-muted">
        {cat ? pick(cat, lang, 'name') : ''} · {formatViews(video.views, lang)} {lang === 'bn' ? 'ভিউ' : 'views'}
      </p>
    </Link>
  )
}
