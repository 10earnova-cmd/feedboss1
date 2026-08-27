import { parseHlsDuration, pickHlsPlaylist, rewriteHlsPlaylist, hlsRelativePath, sanitizeHlsPath, SCENE_PCTS, sceneTime } from './media'
import { auth } from './firebase'

export type UploadProgress = (pct: number) => void

function extOf(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase()
  if (fromName && /^[a-z0-9]+$/.test(fromName) && fromName.length <= 5) return fromName
  if (file.type.includes('mp4')) return 'mp4'
  if (file.type.includes('mpegurl') || file.name.toLowerCase().endsWith('.m3u8')) return 'm3u8'
  if (file.type.includes('mp2t') || file.name.toLowerCase().endsWith('.ts')) return 'ts'
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

function publicMediaUrl(workerUrl: string, key: string, returned?: string) {
  if (returned && /^https?:\/\//i.test(returned)) return returned
  const pub = String(import.meta.env.VITE_R2_PUBLIC_BASE || '').replace(/\/$/, '')
  if (pub) return `${pub}/${key}`
  if (returned?.startsWith('/')) {
    if (/^https?:\/\//i.test(workerUrl)) {
      try {
        return `${new URL(workerUrl).origin}${returned}`
      } catch {
        /* use relative */
      }
    }
    return returned
  }
  return `${workerUrl}/file/${key}`
}

function contentTypeOf(file: File, key: string) {
  if (file.type) return file.type
  const lower = key.toLowerCase()
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (lower.endsWith('.ts')) return 'video/MP2T'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  return 'application/octet-stream'
}

function putFile(url: string, file: File, contentType: string, onProgress?: UploadProgress) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`R2 upload failed (${xhr.status})`))
    }
    xhr.onerror = () =>
      reject(new Error('R2 CORS/network error. In Cloudflare → R2 → feedboss → Settings → CORS Policy, paste r2-cors.json'))
    xhr.send(file)
  })
}

export async function uploadMedia(opts: {
  file: File
  folder: 'videos' | 'thumbs' | 'images'
  workerUrl: string
  uploadSecret: string
  key?: string
  onProgress?: UploadProgress
}): Promise<{ url: string; key: string }> {
  const workerUrl = mediaApiUrl(opts.workerUrl)
  const token = auth?.currentUser ? await auth.currentUser.getIdToken() : opts.uploadSecret
  const bearer = token || opts.uploadSecret
  if (!bearer) {
    throw new Error('Upload secret or Firebase login is required.')
  }

  const keyHint = opts.key || `${opts.folder}/${crypto.randomUUID()}.${extOf(opts.file)}`
  const contentType = contentTypeOf(opts.file, keyHint)

  const signRes = await fetch(`${workerUrl}/sign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${bearer}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key: keyHint, contentType }),
  })
  if (signRes.ok) {
    const signed = (await signRes.json()) as { putUrl?: string; url?: string; key?: string; contentType?: string; error?: string }
    if (!signed.putUrl) throw new Error(signed.error || 'Sign URL missing')
    await putFile(signed.putUrl, opts.file, signed.contentType || contentType, opts.onProgress)
    return { url: publicMediaUrl(workerUrl, signed.key || keyHint, signed.url), key: signed.key || keyHint }
  }

  let signError = `Sign failed (${signRes.status})`
  try {
    const err = (await signRes.json()) as { error?: string }
    if (err?.error) signError = err.error
  } catch {
    /* ignore */
  }
  if (signRes.status !== 404 && signRes.status !== 405) {
    throw new Error(signError)
  }

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
      const key = body?.key || keyHint
      if (xhr.status >= 200 && xhr.status < 300 && (body?.url || key)) {
        resolve({ url: publicMediaUrl(workerUrl, key, body?.url), key })
        return
      }
      reject(new Error(body?.error || `Upload failed (${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('Network error — check worker URL / CORS'))
    const form = new FormData()
    form.append('file', opts.file)
    form.append('folder', opts.folder)
    form.append('filename', keyHint)
    form.append('key', keyHint)
    xhr.send(form)
  })
}

export async function uploadHlsPack(opts: {
  files: File[]
  workerUrl: string
  uploadSecret: string
  onProgress?: UploadProgress
}): Promise<{ url: string; key: string; duration: number }> {
  const playlist = pickHlsPlaylist(opts.files)
  if (!playlist) {
    throw new Error('HLS upload needs an .m3u8 playlist (plus .ts / .m4s segments)')
  }

  const packId = crypto.randomUUID()
  const nameMap: Record<string, string> = {}
  const prepared: { file: File; key: string; original: string; isPlaylist: boolean }[] = []

  for (const file of opts.files) {
    const original = hlsRelativePath(file).replace(/^\.\//, '')
    const rel = sanitizeHlsPath(original)
    if (!rel) continue
    nameMap[original] = rel
    nameMap[file.name] = rel.split('/').pop() || rel
    prepared.push({
      file,
      original,
      key: `videos/${packId}/${rel}`,
      isPlaylist: file.name.toLowerCase().endsWith('.m3u8'),
    })
  }

  if (!prepared.length) throw new Error('No valid HLS files to upload')

  let done = 0
  let playlistUrl = ''
  let playlistKey = ''
  let duration = 0
  const total = prepared.length
  const segments = prepared.filter((item) => !item.isPlaylist)
  const lists = prepared.filter((item) => item.isPlaylist)

  for (const item of segments) {
    const up = await uploadMedia({
      file: item.file,
      folder: 'videos',
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
      key: item.key,
      onProgress: (pct) => opts.onProgress?.(Math.round(((done + pct / 100) / total) * 100)),
    })
    nameMap[item.original] = up.url
    nameMap[item.file.name] = up.url
    nameMap[item.key.split('/').pop() || item.file.name] = up.url
    done += 1
    opts.onProgress?.(Math.round((done / total) * 100))
  }

  for (const item of lists) {
    const text = await item.file.text()
    duration = Math.max(duration, parseHlsDuration(text))
    const rewritten = rewriteHlsPlaylist(text, nameMap)
    const file = new File([rewritten], item.file.name, { type: 'application/vnd.apple.mpegurl' })
    const up = await uploadMedia({
      file,
      folder: 'videos',
      workerUrl: opts.workerUrl,
      uploadSecret: opts.uploadSecret,
      key: item.key,
      onProgress: (pct) => opts.onProgress?.(Math.round(((done + pct / 100) / total) * 100)),
    })
    done += 1
    opts.onProgress?.(Math.round((done / total) * 100))
    if (item.file === playlist) {
      playlistUrl = up.url
      playlistKey = up.key
    }
  }

  if (!playlistUrl) throw new Error('Playlist upload failed')
  return { url: playlistUrl, key: playlistKey, duration }
}

export function captureThumb(videoEl: HTMLVideoElement, maxW = 720): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const vw = videoEl.videoWidth || 1280
    const vh = videoEl.videoHeight || 720
    const scale = Math.min(1, maxW / vw)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(vw * scale))
    canvas.height = Math.max(1, Math.round(vh * scale))
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
      0.78,
    )
  })
}

export function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      video.removeEventListener('seeked', finish)
      resolve()
    }
    if (Math.abs((video.currentTime || 0) - time) < 0.08 && video.readyState >= 2) {
      resolve()
      return
    }
    video.addEventListener('seeked', finish)
    try {
      video.currentTime = time
    } catch {
      finish()
      return
    }
    window.setTimeout(finish, 2000)
  })
}

export async function captureScenes(video: HTMLVideoElement, percents = SCENE_PCTS): Promise<Blob[]> {
  const dur = video.duration
  const pts = Number.isFinite(dur) && dur > 0 ? percents : [0.1]
  const blobs: Blob[] = []
  for (const p of pts) {
    await seekVideo(video, sceneTime(dur, p))
    blobs.push(await captureThumb(video))
  }
  return blobs
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
    video.onerror = () => reject(new Error('Could not read video metadata'))
  })
}
