import { auth } from './firebase'

export type UploadProgress = (pct: number) => void

function extOf(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName
  if (file.type.includes('mp4')) return 'mp4'
  if (file.type.includes('webm')) return 'webm'
  if (file.type.includes('png')) return 'png'
  if (file.type.includes('webp')) return 'webp'
  if (file.type.includes('jpeg') || file.type.includes('jpg')) return 'jpg'
  return 'bin'
}

export function mediaApiUrl(workerUrl?: string) {
  const raw = (workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api').trim()
  return raw.replace(/\/$/, '') || '/api'
}

export async function uploadMedia(opts: {
  file: File
  folder: 'videos' | 'thumbs' | 'images'
  workerUrl: string
  uploadSecret: string
  onProgress?: UploadProgress
}): Promise<{ url: string; key: string }> {
  const workerUrl = mediaApiUrl(opts.workerUrl)

  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : opts.uploadSecret
  const bearer = token || opts.uploadSecret
  if (!bearer) {
    throw new Error('Upload secret বা Firebase login লাগবে।')
  }

  const keyHint = `${opts.folder}/${crypto.randomUUID()}.${extOf(opts.file)}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${workerUrl}/upload`)
    xhr.responseType = 'json'
    xhr.setRequestHeader('Authorization', `Bearer ${bearer}`)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }
    xhr.onload = () => {
      const body = xhr.response as { url?: string; key?: string; error?: string } | null
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) {
        resolve({ url: body.url, key: body.key || keyHint })
        return
      }
      reject(new Error(body?.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error — worker URL / CORS চেক করুন'))
    const form = new FormData()
    form.append('file', opts.file)
    form.append('folder', opts.folder)
    form.append('filename', keyHint)
    xhr.send(form)
  })
}

export function captureThumb(videoEl: HTMLVideoElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = videoEl.videoWidth || 1280
    canvas.height = videoEl.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas not supported'))
      return
    }
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height)
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Thumb capture failed'))
        else resolve(blob)
      },
      'image/jpeg',
      0.82,
    )
  })
}

export function readVideoMeta(file: File): Promise<{ duration: number; objectUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.src = url
    video.onloadedmetadata = () => {
      resolve({ duration: Math.round(video.duration || 0), objectUrl: url })
    }
    video.onerror = () => reject(new Error('ভিডিও মেটাডেটা পড়া যায়নি'))
  })
}
