import { useEffect, useRef, useState } from 'react'
import { videoFrameUrl, mediaCrossOrigin } from '../lib/media'
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
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
      },
      { rootMargin: '80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const playVideo = hover && preview && inView && src

  const onEnter = () => {
    if (!preview) return
    setHover(true)
    const v = vid.current
    if (!v) return
    void v.play().catch(() => undefined)
  }

  const onLeave = () => {
    setHover(false)
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
      {poster ? <img src={poster} alt="" loading="lazy" /> : <div className="thumb-empty" />}
      {playVideo ? (
        <video
          ref={vid}
          src={videoFrameUrl(src, 2)}
          crossOrigin={mediaCrossOrigin(src)}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay
        />
      ) : null}
      <span className="hd">HD</span>
      {duration != null && duration > 0 ? <span className="badge">{formatDuration(duration)}</span> : null}
    </div>
  )
}
