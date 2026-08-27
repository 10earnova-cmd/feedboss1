import { db, newId } from './db'
import { POSTER_PCT, SCENE_PCTS, sceneTime, isVideoFile } from './media'
import { slugify, uniqueSlug } from './slug'
import { captureThumb, captureScenes, seekVideo, uploadHlsPack, uploadMedia } from './storage'
import { transcodeToHls } from './transcode'
import type { Video } from '../types'

export function captionFromFilename(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isBulkVideoFile(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.m3u8') || name.endsWith('.m4s')) return false
  return isVideoFile(file)
}

async function waitMeta(video: HTMLVideoElement) {
  if (Number.isFinite(video.duration) && video.duration > 0 && video.readyState >= 1) return
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(), 15000)
    const ok = () => {
      window.clearTimeout(timer)
      resolve()
    }
    video.addEventListener('loadedmetadata', ok, { once: true })
    video.addEventListener('loadeddata', ok, { once: true })
    video.addEventListener(
      'error',
      () => {
        window.clearTimeout(timer)
        reject(new Error('Could not read video'))
      },
      { once: true },
    )
  })
}

async function scenesFromFile(file: File, fullScenes: boolean): Promise<{ duration: number; scenes: File[] }> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  video.style.cssText = 'position:fixed;left:-9999px;width:16px;height:9px;opacity:0;pointer-events:none'
  document.body.appendChild(video)

  try {
    await waitMeta(video)
    const duration = Math.round(video.duration || 0)
    const pts = fullScenes ? SCENE_PCTS : [POSTER_PCT]
    let blobs: Blob[] = []
    try {
      blobs = await captureScenes(video, duration > 0 ? pts : [POSTER_PCT])
    } catch {
      try {
        await seekVideo(video, sceneTime(duration, POSTER_PCT))
        blobs = [await captureThumb(video)]
      } catch {
        blobs = []
      }
    }
    const scenes = blobs.map((b, i) => new File([b], `scene-${i}.jpg`, { type: 'image/jpeg' }))
    return { duration, scenes }
  } finally {
    URL.revokeObjectURL(url)
    video.removeAttribute('src')
    video.load()
    video.remove()
  }
}

async function uploadAllThumbs(scenes: File[], workerUrl: string, uploadSecret: string) {
  if (!scenes.length) return [] as string[]
  const ups = await Promise.all(
    scenes.map((file) =>
      uploadMedia({
        file,
        folder: 'thumbs',
        workerUrl,
        uploadSecret,
      }),
    ),
  )
  return ups.map((u) => u.url)
}

export async function publishVideoFile(opts: {
  file: File
  caption: string
  workerUrl: string
  uploadSecret: string
  slugTaken: string[]
  onProgress?: (pct: number) => void
}): Promise<Video> {
  const text = opts.caption.trim()
  if (!text) throw new Error('Add a caption')
  opts.onProgress?.(2)

  // Poster from source while FFmpeg builds HLS — parallel for speed.
  const scenesTask = scenesFromFile(opts.file, false).catch(() => ({ duration: 0, scenes: [] as File[] }))

  const hls = await transcodeToHls(opts.file, (pct, _label) => {
    opts.onProgress?.(Math.min(70, Math.round(pct * 0.7)))
  })
  opts.onProgress?.(72)

  const [{ duration: metaDur, scenes }, up] = await Promise.all([
    scenesTask,
    uploadHlsPack({
      files: hls.files,
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
      onProgress: (pct) => opts.onProgress?.(72 + Math.round(pct * 0.22)),
    }),
  ])

  const previewUrls = await uploadAllThumbs(scenes, opts.workerUrl, opts.uploadSecret)
  opts.onProgress?.(96)

  const now = Date.now()
  const payload: Video = {
    id: newId('vid'),
    slug: uniqueSlug(slugify(text), opts.slugTaken),
    titleEn: text,
    titleBn: text,
    captionEn: text,
    captionBn: text,
    videoUrl: up.url,
    thumbnailUrl: previewUrls[0] || '',
    previewUrls,
    duration: up.duration || hls.duration || metaDur || 0,
    views: 0,
    likes: 0,
    categoryId: '',
    tagIds: [],
    modelIds: [],
    status: 'published',
    featured: false,
    trending: false,
    createdAt: now,
    updatedAt: now,
  }
  await db.saveVideo(payload)
  opts.onProgress?.(100)
  return payload
}
