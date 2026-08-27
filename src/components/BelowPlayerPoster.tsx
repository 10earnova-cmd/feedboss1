import { useEffect, useMemo, useState } from 'react'
import { useLang } from '../context/LangContext'
import { useSite } from '../context/SiteContext'
import { formatViews, pick } from '../lib/format'
import { usablePoster } from '../lib/media'
import type { Video } from '../types'
import { VideoThumb } from './VideoThumb'

function otherVideos(published: Video[], currentId: string) {
  const rest = published.filter((v) => v.id !== currentId)
  return rest.length ? rest : published
}

export function BelowPlayerPoster({ currentId }: { currentId: string }) {
  const { ads, published } = useSite()
  const { lang } = useLang()
  const ad = ads.find((a) => a.slot === 'below_player' && a.enabled)
  const href = (ad?.url || '').trim()
  const feed = useMemo(() => otherVideos(published, currentId), [published, currentId])
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(feed.length ? Math.floor(Math.random() * feed.length) : 0)
  }, [currentId, feed.length])

  useEffect(() => {
    if (feed.length < 2) return
    const id = window.setInterval(() => {
      setI((n) => {
        let next = Math.floor(Math.random() * feed.length)
        if (next === n) next = (n + 1) % feed.length
        return next
      })
    }, 2200)
    return () => window.clearInterval(id)
  }, [feed.length])

  if (!ad || !href || !/^https?:\/\//i.test(href) || !feed.length) return null

  const video = feed[i % feed.length]
  if (!video) return null
  const title = pick(video, lang, 'title')

  return (
    <a href={href} className="player-feed-ad vcard" rel="sponsored noreferrer">
      <VideoThumb
        key={video.id}
        src={video.videoUrl}
        poster={usablePoster(video.thumbnailUrl)}
        scenes={video.previewUrls}
        duration={video.duration}
      />
      <h3 className="vcard-title">{title}</h3>
      <p className="vcard-meta">
        {formatViews(video.views, lang)} {lang === 'bn' ? 'ভিউ' : 'views'}
      </p>
    </a>
  )
}
