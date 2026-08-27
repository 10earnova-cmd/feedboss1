import { useEffect, useRef, useState } from 'react'
import { videoFrameUrl } from '../lib/media'
import { formatDuration } from '../lib/format'

export function VideoThumb({
  src,
  poster,
  duration,
  preview = true,
}: {
  src: string
  poster?: string
  duration?: number
  preview?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setReady(true)
      },
      { rootMargin: '160px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const onEnter = () => {
    if (!preview) return
    const v = vid.current
    if (!v) return
    void v.play().catch(() => undefined)
  }

  const onLeave = () => {
    const v = vid.current
    if (!v) return
    v.pause()
    try {
      v.currentTime = 2
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={box} className="thumb" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {ready && src ? (
        <video
          ref={vid}
          src={videoFrameUrl(src, 2)}
          poster={poster || undefined}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            try {
              e.currentTarget.currentTime = 2
            } catch {
              /* ignore */
            }
          }}
        />
      ) : poster ? (
        <img src={poster} alt="" loading="lazy" />
      ) : (
        <div className="thumb-empty" />
      )}
      <span className="hd">HD</span>
      {duration != null && duration > 0 ? <span className="badge">{formatDuration(duration)}</span> : null}
    </div>
  )
}
