import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'
import { isHlsUrl, mediaCrossOrigin, SCENE_PCTS, sceneTime, usablePoster, videoFrameUrl } from '../lib/media'

let liveSeekers = 0
const MAX_SEEKERS = 4

export function VideoThumb({
  src,
  poster,
  scenes,
  duration,
  preview = true,
}: {
  src: string
  poster?: string
  scenes?: string[] | Record<string, string>
  duration?: number
  preview?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const vid = useRef<HTMLVideoElement>(null)
  const [inView, setInView] = useState(false)
  const [hover, setHover] = useState(false)
  const [frame, setFrame] = useState(0)

  const photos = uniqueFrames(poster, scenes)
  const t10 = sceneTime(duration, 0.1)
  const canSeek = Boolean(preview && src && !isHlsUrl(src))
  const usePhotos = photos.length > 0
  const cyclePhotos = preview && inView && photos.length > 1

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setInView(true)
        else setInView(false)
      },
      { rootMargin: '80px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!cyclePhotos) {
      setFrame(0)
      return
    }
    const id = window.setInterval(() => setFrame((n) => (n + 1) % photos.length), 1300)
    return () => window.clearInterval(id)
  }, [cyclePhotos, photos.length])

  useEffect(() => {
    const v = vid.current
    if (!v || !canSeek || hover) return
    if (!inView || usePhotos) return
    if (liveSeekers >= MAX_SEEKERS) return
    liveSeekers += 1
    let i = 0
    let gone = false
    const tick = () => {
      if (gone || !v) return
      try {
        v.currentTime = sceneTime(duration || v.duration, SCENE_PCTS[i % SCENE_PCTS.length])
      } catch {
        /* ignore */
      }
      i += 1
    }
    tick()
    const id = window.setInterval(tick, 1400)
    return () => {
      gone = true
      window.clearInterval(id)
      liveSeekers = Math.max(0, liveSeekers - 1)
    }
  }, [canSeek, hover, inView, usePhotos, duration])

  const playVideo = Boolean(hover && preview && inView && src && !isHlsUrl(src))

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
      v.currentTime = t10
    } catch {
      /* ignore */
    }
  }

  const photo = photos[frame] || photos[0] || usablePoster(poster)

  return (
    <div ref={box} className="thumb" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {photo ? <img src={photo} alt="" loading="lazy" className="thumb-scene on" /> : <div className="thumb-empty" />}
      {playVideo || (canSeek && inView && !usePhotos) ? (
        <video
          ref={vid}
          src={videoFrameUrl(src, t10)}
          crossOrigin={mediaCrossOrigin(src)}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay={playVideo}
        />
      ) : null}
      <span className="hd">HD</span>
      {duration != null && duration > 0 ? <span className="badge">{formatDuration(duration)}</span> : null}
    </div>
  )
}

function uniqueFrames(poster?: string, scenes?: string[] | Record<string, string>) {
  const list = Array.isArray(scenes) ? scenes : scenes ? Object.values(scenes) : []
  const out: string[] = []
  for (const url of [usablePoster(poster), ...list.map((s) => usablePoster(s))]) {
    if (url && !out.includes(url)) out.push(url)
  }
  return out
}
