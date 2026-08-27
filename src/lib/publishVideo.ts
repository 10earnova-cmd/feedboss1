import { db, newId } from './db'
import { sceneTime, SCENE_PCTS } from './media'
import { slugify, uniqueSlug } from './slug'
import { captureThumb, captureScenes, seekVideo, uploadMedia } from './storage'
import type { Video } from '../types'

export function captionFromFilename(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isBulkVideoFile(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith('.mp4') || name.endsWith('.webm') || file.type.includes('mp4') || file.type.includes('webm')
}

async function scenesFromFile(file: File): Promise<{ duration: number; scenes: File[] }> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.crossOrigin = 'anonymous'
  video.src = url
  video.style.cssText = 'position:fixed;left:-9999px;width:16px;height:9px;opacity:0;pointer-events:none'
  document.body.appendChild(video)

  try {
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => resolve(), 12000)
      video.onloadeddata = () => {
        window.clearTimeout(timer)
        resolve()
      }
      video.onerror = () => {
        window.clearTimeout(timer)
        reject(new Error('Could not read video'))
      }
    })
    const duration = Math.round(video.duration || 0)
    let blobs: Blob[] = []
    try {
      blobs = await captureScenes(video, duration > 0 ? SCENE_PCTS : [0.1])
    } catch {
      try {
        await seekVideo(video, sceneTime(duration, 0.1))
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
  opts.onProgress?.(4)

  const { duration, scenes } = await scenesFromFile(opts.file)
  opts.onProgress?.(10)

  const videoUp = await uploadMedia({
    file: opts.file,
    folder: 'videos',
    workerUrl: opts.workerUrl,
    uploadSecret: opts.uploadSecret,
    onProgress: (pct) => opts.onProgress?.(10 + Math.round(pct * 0.7)),
  })

  const previewUrls: string[] = []
  for (let i = 0; i < scenes.length; i += 1) {
    const up = await uploadMedia({
      file: scenes[i],
      folder: 'thumbs',
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
    })
    previewUrls.push(up.url)
    opts.onProgress?.(80 + Math.round(((i + 1) / Math.max(scenes.length, 1)) * 18))
  }

  const now = Date.now()
  const payload: Video = {
    id: newId('vid'),
    slug: uniqueSlug(slugify(text), opts.slugTaken),
    titleEn: text,
    titleBn: text,
    captionEn: text,
    captionBn: text,
    videoUrl: videoUp.url,
    thumbnailUrl: previewUrls[0] || '',
    previewUrls,
    duration,
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
