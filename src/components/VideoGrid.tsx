import type { ReactNode } from 'react'
import { AdSlot } from './AdSlot'
import { VideoCard } from './VideoCard'
import { useSite } from '../context/SiteContext'
import type { Video } from '../types'

export function VideoGrid({ videos }: { videos: Video[] }) {
  const { ads } = useSite()
  const items: Array<{ key: string; node: ReactNode }> = []
  videos.forEach((v, i) => {
    items.push({ key: v.id, node: <VideoCard video={v} /> })
    if ((i + 1) % 10 === 0 && ads.some((a) => a.slot === 'in_grid' && a.enabled)) {
      items.push({
        key: `ad-${i}`,
        node: (
          <div className="card flex min-h-[120px] items-center justify-center p-2">
            <AdSlot slot="in_grid" ads={ads} className="w-full" />
          </div>
        ),
      })
    }
  })

  return (
    <div className="video-grid">
      {items.map((it) => (
        <div key={it.key}>{it.node}</div>
      ))}
    </div>
  )
}
