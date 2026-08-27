import { useEffect } from 'react'
import { VideoCard } from './VideoCard'
import { prefetchPosters } from '../lib/posterCache'
import type { Video } from '../types'

export function VideoGrid({ videos }: { videos: Video[] }) {
  useEffect(() => {
    const urls: string[] = []
    for (const v of videos) {
      if (v.thumbnailUrl) urls.push(v.thumbnailUrl)
      for (const s of v.previewUrls || []) if (s) urls.push(s)
    }
    prefetchPosters(urls)
  }, [videos])

  return (
    <div className="video-grid">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  )
}
