import { Link } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { formatViews, pick } from '../lib/format'
import { usablePoster } from '../lib/media'
import type { Video } from '../types'
import { VideoThumb } from './VideoThumb'

export function VideoCard({ video }: { video: Video }) {
  const { lang } = useLang()
  const { categories } = useSite()
  const cat = categories.find((c) => c.id === video.categoryId)
  const title = pick(video, lang, 'title')

  return (
    <Link to={`/watch/${video.slug}`} className="vcard">
      <VideoThumb src={video.videoUrl} poster={usablePoster(video.thumbnailUrl)} duration={video.duration} />
      <h3 className="vcard-title">{title}</h3>
      <p className="vcard-meta">
        {formatViews(video.views, lang)} {lang === 'bn' ? 'ভিউ' : 'views'}
        {cat ? ` · ${pick(cat, lang, 'name')}` : ''}
      </p>
    </Link>
  )
}
