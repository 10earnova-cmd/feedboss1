import { Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'
import {
  isHlsUrl,
  mediaCrossOrigin,
  posterTime,
  SCENE_ROTATE_MS,
  sceneCaptureTimes,
  usablePoster,
  videoFrameUrl,
} from '../lib/media'
import { isPosterWarm, markPosterLoaded, prefetchPoster } from '../lib/posterCache'

let liveSeekers = 0
const MAX_SEEKERS = 3

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
  const [broken, setBroken] = useState<Record<string, true>>({})

  const photos = useMemo(() => uniqueFrames(poster, scenes).filter((u) => !broken[u]), [poster, scenes, broken])

  const at1min = posterTime(duration)
  const canSeek = Boolean(src && !isHlsUrl(src))
  const usePhotos = photos.length > 0
  const cyclePhotos = Boolean(preview && inView && photos.length > 1)
  const needVideoPoster = Boolean(inView && canSeek && !usePhotos)
  const photo = photos[frame] || photos[0] || ''
  const warm = isPosterWarm(photo)

  useEffect(() => {
    setBroken({})
    setFrame(0)
  }, [poster, src])

  useEffect(() => {
    const el = box.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin: '120px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!inView || !photos.length) return
    prefetchPoster(photos[0])
    const id = window.setTimeout(() => {
      for (let i = 1; i < photos.length; i += 1) prefetchPoster(photos[i])
    }, 150)
    return () => window.clearTimeout(id)
  }, [inView, photos])

  // Every 2s change to another scene from the video.
  useEffect(() => {
    if (!cyclePhotos) {
      setFrame(0)
      return
    }
    const id = window.setInterval(() => setFrame((n) => (n + 1) % photos.length), SCENE_ROTATE_MS)
    return () => window.clearInterval(id)
  }, [cyclePhotos, photos.length])

  useEffect(() => {
    const v = vid.current
    if (!v || !canSeek) return
    if (!needVideoPoster && !(preview && hover && inView)) return
    if (liveSeekers >= MAX_SEEKERS && !hover) return
    liveSeekers += 1
    let gone = false
    let i = 0
    const times = sceneCaptureTimes(duration || 600)

    const seek = (t: number) => {
      if (gone || !v) return
      try {
        v.currentTime = t
      } catch {
        /* ignore */
      }
    }

    seek(at1min)
    const id =
      preview && !usePhotos
        ? window.setInterval(() => {
            seek(times[i % times.length] || at1min)
            i += 1
          }, SCENE_ROTATE_MS)
        : 0

    return () => {
      gone = true
      if (id) window.clearInterval(id)
      liveSeekers = Math.max(0, liveSeekers - 1)
    }
  }, [canSeek, needVideoPoster, hover, inView, preview, usePhotos, duration, at1min])

  const playVideo = Boolean(hover && preview && inView && src && !isHlsUrl(src))
  const showVideo = playVideo || needVideoPoster

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
      v.currentTime = at1min
    } catch {
      /* ignore */
    }
  }

  return (
    <div ref={box} className="thumb" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {photos.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          loading={i === 0 || warm ? 'eager' : 'lazy'}
          decoding="async"
          className={`thumb-scene${i === frame ? ' on' : ''}`}
          onLoad={() => markPosterLoaded(url)}
          onError={() => setBroken((b) => ({ ...b, [url]: true }))}
        />
      ))}
      {!photos.length ? <div className="thumb-empty" /> : null}
      {showVideo ? (
        <video
          ref={vid}
          src={videoFrameUrl(src, at1min)}
          crossOrigin={mediaCrossOrigin(src)}
          muted
          loop
          playsInline
          preload="metadata"
          autoPlay={playVideo}
        />
      ) : null}
      <span className="thumb-play" aria-hidden>
        <Play className="thumb-play-icon" fill="currentColor" />
      </span>
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
