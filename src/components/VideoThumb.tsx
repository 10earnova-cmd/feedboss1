import { useEffect, useRef, useState } from 'react'
import { formatDuration } from '../lib/format'
import { isHlsUrl, mediaCrossOrigin, POSTER_PCT, SCENE_PCTS, sceneTime, usablePoster, videoFrameUrl } from '../lib/media'

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
  const [posterBroken, setPosterBroken] = useState(false)

  const photos = posterBroken ? [] : uniqueFrames(poster, scenes)
  const mid = sceneTime(duration, POSTER_PCT)
  const canSeek = Boolean(src && !isHlsUrl(src))
  const usePhotos = photos.length > 0
  const cyclePhotos = preview && inView && photos.length > 1
  // If R2 thumb 404s / missing, paint a real mid-frame from the video.
  const needVideoPoster = Boolean(inView && canSeek && !usePhotos)

  useEffect(() => {
    setPosterBroken(false)
    setFrame(0)
  }, [poster, src])

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
    if (!v || !canSeek) return
    if (!needVideoPoster && !(preview && hover && inView)) return
    if (liveSeekers >= MAX_SEEKERS && !hover) return
    liveSeekers += 1
    let gone = false
    let i = 0

    const seekMid = () => {
      if (gone || !v) return
      try {
        v.currentTime = mid
      } catch {
        /* ignore */
      }
    }

    const tick = () => {
      if (gone || !v || !preview) return
      try {
        v.currentTime = sceneTime(duration || v.duration, SCENE_PCTS[i % SCENE_PCTS.length])
      } catch {
        /* ignore */
      }
      i += 1
    }

    seekMid()
    const id = preview && !usePhotos ? window.setInterval(tick, 1400) : 0
    return () => {
      gone = true
      if (id) window.clearInterval(id)
      liveSeekers = Math.max(0, liveSeekers - 1)
    }
  }, [canSeek, needVideoPoster, hover, inView, preview, usePhotos, duration, mid])

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
      v.currentTime = mid
    } catch {
      /* ignore */
    }
  }

  const photo = photos[frame] || photos[0] || usablePoster(poster)

  return (
    <div ref={box} className="thumb" onMouseEnter={onEnter} onMouseLeave={onLeave}>
      {photo && !posterBroken ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          className="thumb-scene on"
          onError={() => setPosterBroken(true)}
        />
      ) : (
        <div className="thumb-empty" />
      )}
      {showVideo ? (
        <video
          ref={vid}
          src={videoFrameUrl(src, mid)}
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
