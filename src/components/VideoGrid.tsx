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
    if ((i + 1) % 8 === 0 && ads.some((a) => a.slot === 'in_grid' && a.enabled)) {
      items.push({
        key: `ad-${i}`,
        node: (
          <div className="card flex min-h-[180px] items-center justify-center p-3">
            <AdSlot slot="in_grid" ads={ads} className="w-full" />
          </div>
        ),
      })
    }
  })

  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((it) => <div key={it.key}>{it.node}</div>)}</div>
}
