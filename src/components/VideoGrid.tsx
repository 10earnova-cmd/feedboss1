import { useEffect } from 'react'
import { VideoCard } from './VideoCard'
import { prefetchPosters } from '../lib/posterCache'
import type { Video } from '../types'

export function VideoGrid({ videos }: { videos: Video[] }) {
  useEffect(() => {
    // First: main 1-min posters (fast paint). Then mid scenes for rotate.
    const posters: string[] = []
    const extras: string[] = []
    for (const v of videos) {
      if (v.thumbnailUrl) posters.push(v.thumbnailUrl)
      for (const s of v.previewUrls || []) {
        if (s && s !== v.thumbnailUrl) extras.push(s)
      }
    }
    prefetchPosters(posters)
    const id = window.setTimeout(() => prefetchPosters(extras.slice(0, 40)), 400)
    return () => window.clearTimeout(id)
  }, [videos])

  return (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  )
}
