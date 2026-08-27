import Hls from 'hls.js'
import { isHlsUrl, mediaCrossOrigin, sceneCaptureTimes, usablePoster } from './media'
import { captureScenes, mediaApiUrl, uploadMedia } from './storage'
import { db } from './db'
import type { Video } from '../types'

const repairing = new Set<string>()
let queue: Promise<void> = Promise.resolve()

function needsPosters(v: Pick<Video, 'thumbnailUrl' | 'previewUrls' | 'videoUrl'>) {
  if (!v.videoUrl) return false
  if (usablePoster(v.thumbnailUrl)) return false
  const scenes = Array.isArray(v.previewUrls) ? v.previewUrls.filter((u) => usablePoster(u)) : []
  return scenes.length === 0
}

/** Load MP4 or HLS into a hidden video element (CORS anonymous for canvas capture). */
export async function loadMediaVideo(src: string, timeoutMs = 60_000): Promise<{ video: HTMLVideoElement; destroy: () => void }> {
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = mediaCrossOrigin(src) || 'anonymous'

  let hls: Hls | null = null
  const destroy = () => {
    try {
      hls?.destroy()
    } catch {
      /* ignore */
    }
    hls = null
    video.removeAttribute('src')
    video.load()
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('Video load timeout')), timeoutMs)
    const ok = () => {
      window.clearTimeout(timer)
      resolve()
    }
    const fail = (msg: string) => {
      window.clearTimeout(timer)
      reject(new Error(msg))
    }

    if (isHlsUrl(src) && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        maxBufferLength: 12,
        maxMaxBufferLength: 20,
      })
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => ok())
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) fail(data.details || 'HLS error')
      })
      return
    }

    video.src = src
    video.onloadedmetadata = () => ok()
    video.onerror = () => fail('Video metadata failed')
  })

  return { video, destroy }
}

/** Capture ~1 scene/min as JPEG files from a playable video URL. */
export async function capturePosterFiles(src: string, durationHint?: number): Promise<File[]> {
  const { video, destroy } = await loadMediaVideo(src)
  try {
    const dur =
      durationHint && durationHint > 0
        ? durationHint
        : Number.isFinite(video.duration) && video.duration > 0
          ? Math.round(video.duration)
          : 600
    // Warm first frame so mid seeks are more reliable on HLS.
    try {
      video.currentTime = Math.min(1, Math.max(0.2, dur * 0.01))
      await new Promise((r) => window.setTimeout(r, 200))
    } catch {
      /* ignore */
    }
    const blobs = await captureScenes(video, sceneCaptureTimes(dur))
    return blobs.map((blob, i) => new File([blob], `scene${i}.jpg`, { type: 'image/jpeg' }))
  } finally {
    destroy()
  }
}

export async function uploadPosterFiles(
  files: File[],
  workerUrl: string,
  uploadSecret: string,
): Promise<string[]> {
  if (!files.length) return []
  const api = mediaApiUrl(workerUrl)
  const ups = await Promise.all(
    files.map((file) =>
      uploadMedia({
        file,
        folder: 'thumbs',
        workerUrl: api,
        uploadSecret,
      }),
    ),
  )
  return ups.map((u) => u.url)
}

/** Generate + upload posters for a video URL. Throws if nothing captured. */
export async function generateAndUploadPosters(opts: {
  videoUrl: string
  duration?: number
  workerUrl: string
  uploadSecret: string
}): Promise<{ thumbnailUrl: string; previewUrls: string[] }> {
  const files = await capturePosterFiles(opts.videoUrl, opts.duration)
  if (!files.length) throw new Error('Could not capture posters from video')
  const previewUrls = await uploadPosterFiles(files, opts.workerUrl, opts.uploadSecret)
  if (!previewUrls.length) throw new Error('Poster upload failed')
  return { thumbnailUrl: previewUrls[0], previewUrls }
}

/** Persist posters onto an existing video row (admin / upload flow). */
export async function repairVideoPosters(
  video: Video,
  opts: { workerUrl: string; uploadSecret: string },
): Promise<Video | null> {
  if (!needsPosters(video) || repairing.has(video.id)) return null
  repairing.add(video.id)
  try {
    const posters = await generateAndUploadPosters({
      videoUrl: video.videoUrl,
      duration: video.duration,
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
    })
    const next: Video = {
      ...video,
      thumbnailUrl: posters.thumbnailUrl,
      previewUrls: posters.previewUrls,
      updatedAt: Date.now(),
    }
    await db.saveVideo(next)
    return next
  } finally {
    repairing.delete(video.id)
  }
}

/**
 * Background queue: any published video without posters gets auto thumbs.
 * Safe to call often; skips in-flight / already-poster videos.
 */
export function enqueuePosterRepairs(
  videos: Video[],
  opts: { workerUrl: string; uploadSecret: string; onDone?: () => void },
) {
  const missing = videos.filter((v) => v.status === 'published' && needsPosters(v))
  if (!missing.length || !opts.uploadSecret) return

  for (const video of missing) {
    queue = queue
      .then(async () => {
        try {
          const fixed = await repairVideoPosters(video, opts)
          if (fixed) opts.onDone?.()
        } catch (err) {
          console.warn('[autoPosters]', video.id, err)
        }
      })
      .catch(() => undefined)
  }
}

export { needsPosters }
