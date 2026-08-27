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
    video.removeAttribute('crossorigin')

    if (!isHlsUrl(src)) {
      const onVideoError = () => {
        setErr('Video could not play. Open Admin → re-publish so it becomes browser-safe H.264.')
      }
      video.preload = 'auto'
      video.src = src
      video.addEventListener('error', onVideoError)
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
        video.removeAttribute('src')
        video.load()
      }
    }

    if (Hls.isSupported()) {
      let networkTries = 0
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 60,
        maxMaxBufferLength: 180,
        backBufferLength: 30,
        startFragPrefetch: true,
        testBandwidth: true,
        progressive: true,
        capLevelToPlayerSize: true,
        startLevel: -1,
        xhrSetup: (xhr) => {
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
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkTries < 3) {
          networkTries += 1
          hls.startLoad()
          return
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
          return
        }
        setErr('Stream failed to load. Wait for deploy, hard refresh, then re-publish if still broken.')
        hls.destroy()
      })
      return () => {
        hls.destroy()
      }
    }

    setErr('This browser cannot play HLS. Try Chrome or Safari.')
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
