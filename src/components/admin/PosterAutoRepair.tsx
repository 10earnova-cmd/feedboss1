import { useEffect, useRef, useState } from 'react'
import { enqueuePosterRepairs, needsPosters } from '../../lib/autoPosters'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'

/** While admin is logged in, silently backfill any video missing posters. */
export function PosterAutoRepair() {
  const { videos, settings, refresh } = useSite()
  const [status, setStatus] = useState('')
  const started = useRef(false)

  useEffect(() => {
    const missing = videos.filter((v) => v.status === 'published' && needsPosters(v))
    if (!missing.length) {
      setStatus('')
      return
    }

    let cancelled = false
    void (async () => {
      const priv = await db.getPrivateSettings()
      const secret =
        priv.uploadSecret || settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''
      if (!secret || cancelled) return
      setStatus(`Auto posters: ${missing.length} video(s)…`)
      started.current = true
      enqueuePosterRepairs(missing, {
        workerUrl: settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api',
        uploadSecret: secret,
        onDone: () => {
          if (!cancelled) void refresh()
        },
      })
      // Clear banner after queue has had time to start; refresh will clear missing count.
      window.setTimeout(() => {
        if (!cancelled) setStatus('')
      }, 8000)
    })()

    return () => {
      cancelled = true
    }
  }, [videos, settings.workerUrl, settings.uploadSecret, refresh])

  if (!status) return null
  return (
    <div className="mb-4 rounded-lg border border-line bg-raised px-3 py-2 text-xs text-muted">{status}</div>
  )
}
