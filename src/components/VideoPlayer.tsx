import { mediaCrossOrigin } from '../lib/media'

export function VideoPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  return (
    <div className="player-wrap">
      <video
        className="aspect-video w-full bg-black"
        controls
        playsInline
        crossOrigin={mediaCrossOrigin(src)}
        poster={poster || undefined}
        preload="metadata"
        title={title}
        src={src}
        onLoadedMetadata={(e) => {
          if (poster) return
          const el = e.currentTarget
          try {
            el.currentTime = Math.min(1.5, (el.duration || 3) * 0.08)
          } catch {
            /* ignore */
          }
        }}
      />
    </div>
  )
}
