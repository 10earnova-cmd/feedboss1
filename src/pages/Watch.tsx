import { Heart, Share2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PosterLink } from '../components/PosterLink'
import { Seo } from '../components/Seo'
import { VideoGrid } from '../components/VideoGrid'
import { VideoPlayer } from '../components/VideoPlayer'
import { VideoThumb } from '../components/VideoThumb'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { db } from '../lib/db'
import { formatDate, formatViews, pick } from '../lib/format'
import { usablePoster } from '../lib/media'
import { tr } from '../i18n'

export function Watch() {
  const { slug } = useParams()
  const { lang } = useLang()
  const { published, refresh } = useSite()
  const video = published.find((v) => v.slug === slug)
  const [liked, setLiked] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!video) return
    const key = `deshix_viewed_${video.id}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    void db.bumpViews(video.id).then(() => refresh())
  }, [video, refresh])

  const related = useMemo(() => {
    if (!video) return []
    return published.filter((v) => v.id !== video.id).slice(0, 8)
  }, [published, video])

  if (!video) {
    return <p className="py-20 text-center text-muted">{tr('noVideos', lang)}</p>
  }

  const title = pick(video, lang, 'title')
  const caption = pick(video, lang, 'caption')

  const onLike = async () => {
    if (liked) return
    setLiked(true)
    await db.bumpLikes(video.id)
    await refresh()
  }

  const onShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Seo title={`${title} | FeedBoss`} description={caption} />
      <div>
        <VideoPlayer src={video.videoUrl} poster={usablePoster(video.thumbnailUrl)} title={title} />
        <h1 className="mt-4 text-xl font-bold sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          {formatViews(video.views + 1, lang)} {tr('views', lang)} · {formatDate(video.createdAt, lang)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn btn-ghost" type="button" onClick={() => void onLike()}>
            <Heart className={`h-4 w-4 ${liked ? 'fill-accent text-accent' : ''}`} />
            {tr('like', lang)} · {video.likes + (liked ? 1 : 0)}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => void onShare()}>
            <Share2 className="h-4 w-4" />
            {copied ? tr('copied', lang) : tr('share', lang)}
          </button>
        </div>
        {caption && caption !== title ? (
          <div className="card mt-4 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{caption}</p>
          </div>
        ) : null}
        {related.length > 0 && (
          <section className="mt-8 lg:hidden">
            <h2 className="mb-3 text-lg font-bold">{tr('related', lang)}</h2>
            <VideoGrid videos={related} />
          </section>
        )}
      </div>
      <aside className="space-y-4">
        <div className="card p-3">
          <h2 className="mb-3 text-sm font-bold">{tr('related', lang)}</h2>
          <div className="space-y-3">
            {related.map((v) => (
              <PosterLink key={v.id} video={v} className="watch-side-item">
                <VideoThumb src={v.videoUrl} poster={usablePoster(v.thumbnailUrl)} scenes={v.previewUrls} duration={v.duration} />
                <span className="line-clamp-3 text-sm">{pick(v, lang, 'title')}</span>
              </PosterLink>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
