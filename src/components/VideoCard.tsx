import { PosterLink } from './PosterLink'
import { useLang } from '../context/LangContext'
import { formatViews, pick } from '../lib/format'
import { usablePoster } from '../lib/media'
import type { Video } from '../types'
import { VideoThumb } from './VideoThumb'

export function VideoCard({ video }: { video: Video }) {
  const { lang } = useLang()
  const title = pick(video, lang, 'title')

  return (
    <PosterLink video={video} className="vcard">
      <VideoThumb
        src={video.videoUrl}
        poster={usablePoster(video.thumbnailUrl)}
        scenes={video.previewUrls}
        duration={video.duration}
      />
      <h3 className="vcard-title">{title}</h3>
      <p className="vcard-meta">
        {formatViews(video.views, lang)} {lang === 'bn' ? 'ভিউ' : 'views'}
      </p>
    </PosterLink>
  )
}
