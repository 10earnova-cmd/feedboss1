import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import { isHlsUrl, mediaCrossOrigin } from '../lib/media'

export function VideoPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  const el = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = el.current
    if (!video || !src) return

    if (!isHlsUrl(src)) {
      video.preload = 'auto'
      video.src = src
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    // Safari / iOS native HLS — nudge ahead buffering via preload.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.preload = 'auto'
      video.src = src
      return () => {
        video.removeAttribute('src')
        video.load()
      }
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        // Prefetch well ahead of playhead so the next chunks are already local.
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
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Kick fragment loader immediately even before play.
        try {
          hls.startLoad(-1)
        } catch {
          /* ignore */
        }
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
        else hls.destroy()
      })
      return () => {
        hls.destroy()
      }
    }
  }, [src])

  return (
    <div className="player-wrap">
      <video
        ref={el}
        className="aspect-video w-full bg-black"
        controls
        playsInline
        crossOrigin={mediaCrossOrigin(src)}
        poster={poster || undefined}
        preload="auto"
        title={title}
      />
    </div>
  )
}
