import { db, newId } from './db'
import { isVideoFile } from './media'
import { slugify, uniqueSlug } from './slug'
import { uploadMedia } from './storage'
import { prepareVideoForUpload } from './transcode'
import type { Video } from '../types'

export function captionFromFilename(file: File) {
  return file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function isBulkVideoFile(file: File) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.m3u8') || name.endsWith('.m4s')) return false
  return isVideoFile(file)
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

  const prepared = await prepareVideoForUpload(opts.file, (pct) => {
    opts.onProgress?.(Math.min(70, Math.round(pct * 0.7)))
  })
  opts.onProgress?.(72)

  const [videoUp, previewUrls] = await Promise.all([
    uploadMedia({
      file: prepared.file,
      folder: 'videos',
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
      onProgress: (pct) => opts.onProgress?.(72 + Math.round(pct * 0.2)),
    }),
    uploadAllThumbs(prepared.thumbs, opts.workerUrl, opts.uploadSecret),
  ])
  opts.onProgress?.(96)

  // duration from browser meta if possible
  let duration = prepared.duration
  if (!duration) {
    try {
      duration = await new Promise<number>((resolve) => {
        const url = URL.createObjectURL(prepared.file)
        const v = document.createElement('video')
        v.preload = 'metadata'
        v.src = url
        v.onloadedmetadata = () => {
          const d = Math.round(v.duration || 0)
          URL.revokeObjectURL(url)
          resolve(d)
        }
        v.onerror = () => {
          URL.revokeObjectURL(url)
          resolve(0)
        }
      })
    } catch {
      duration = 0
    }
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
