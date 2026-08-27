import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { isHlsUrl } from '../lib/media'

export function VideoPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  const el = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    const video = el.current
    if (!video || !src) return
    setErr('')

    const onVideoError = () => {
      setErr('Playback failed. Re-upload from admin — downloader MP4s often need device compress to H.264 HLS.')
    }
    video.addEventListener('error', onVideoError)

    // Do NOT set crossOrigin on the player — R2 redirects + missing CORS block many downloader MP4s.
    video.removeAttribute('crossorigin')

    if (!isHlsUrl(src)) {
      video.preload = 'auto'
      video.src = src
      return () => {
        video.removeEventListener('error', onVideoError)
        video.removeAttribute('src')
        video.load()
      }
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.preload = 'auto'
      video.src = src
      return () => {
        video.removeEventListener('error', onVideoError)
        video.removeAttribute('src')
        video.load()
      }
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 120,
        maxMaxBufferLength: 360,
        backBufferLength: 30,
        maxBufferSize: 150 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 1,
        nudgeMaxRetry: 8,
        startFragPrefetch: true,
        testBandwidth: true,
        progressive: true,
        capLevelToPlayerSize: true,
        startLevel: -1,
        xhrSetup: (xhr) => {
          // Same-origin /api/file playlists + segments (302 to R2).
          xhr.withCredentials = false
        },
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        try {
          hls.startLoad(-1)
        } catch {
          /* ignore */
        }
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
          return
        }
        setErr('Stream error. Re-upload the video from admin (device compress → HLS).')
        hls.destroy()
      })
      return () => {
        video.removeEventListener('error', onVideoError)
        hls.destroy()
      }
    }

    setErr('This browser cannot play HLS. Try Chrome / Safari.')
    return () => video.removeEventListener('error', onVideoError)
  }, [src])

  return (
    <div className="player-wrap">
      <video
        ref={el}
        className="aspect-video w-full bg-black"
        controls
        playsInline
        poster={poster || undefined}
        preload="auto"
        title={title}
      />
      {err ? <p className="mt-2 px-1 text-xs text-accent">{err}</p> : null}
    </div>
  )
}
