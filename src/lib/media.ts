/** Main poster = exact middle of the video (50%). Extra frames for hover rotate. */
export const POSTER_PCT = 0.5
export const SCENE_PCTS = [0.5, 0.25, 0.75]

export function sceneTime(duration?: number, pct = POSTER_PCT) {
  if (!duration || !Number.isFinite(duration) || duration <= 0) return 2
  return Math.min(duration * 0.96, Math.max(0.12, duration * pct))
}

export function videoFrameUrl(src: string, seconds = 2) {
  if (!src) return ''
  const base = src.split('#')[0]
  return `${base}#t=${seconds}`
}

export function isHlsUrl(src?: string) {
  if (!src) return false
  const path = src.split('?')[0].split('#')[0].toLowerCase()
  return path.endsWith('.m3u8') || path.includes('.m3u8')
}

export function isHlsFile(file: File) {
  const name = file.name.toLowerCase()
  return name.endsWith('.m3u8') || name.endsWith('.ts') || name.endsWith('.m4s') || file.type.includes('mpegurl')
}

export function parseHlsDuration(manifest: string) {
  let total = 0
  const re = /#EXTINF:([\d.]+)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(manifest))) total += Number(m[1]) || 0
  return Math.round(total)
}

export function pickHlsPlaylist(files: File[]) {
  const lists = files.filter((f) => f.name.toLowerCase().endsWith('.m3u8'))
  return (
    lists.find((f) => /index|master|playlist/i.test(f.name)) ||
    lists[0] ||
    null
  )
}

export function hlsRelativePath(file: File) {
  const rel = 'webkitRelativePath' in file ? String((file as File & { webkitRelativePath: string }).webkitRelativePath || '') : ''
  const raw = rel.includes('/') ? rel.split('/').slice(1).join('/') : file.name
  return raw.replace(/\\/g, '/')
}

export function sanitizeHlsPath(rel: string) {
  return rel
    .split('/')
    .filter((p) => p && p !== '.' && p !== '..')
    .map((p) => p.replace(/[^a-zA-Z0-9._-]/g, '_'))
    .join('/')
}

function mappedHlsName(path: string, nameMap: Record<string, string>) {
  const normalized = path.replace(/^\.\//, '')
  return nameMap[normalized] || nameMap[normalized.split('/').pop() || ''] || ''
}

export function rewriteHlsPlaylist(text: string, nameMap: Record<string, string>) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return line
      if (trimmed.startsWith('#EXT-X-KEY')) {
        return line.replace(/URI="([^"]+)"/i, (_full, uri: string) => {
          if (/^https?:\/\//i.test(uri)) return `URI="${uri}"`
          const mapped = mappedHlsName(uri, nameMap)
          return `URI="${mapped || uri}"`
        })
      }
      if (trimmed.startsWith('#')) return line
      if (/^https?:\/\//i.test(trimmed)) return line
      const [path, qs] = trimmed.split('?')
      const mapped = mappedHlsName(path, nameMap)
      if (!mapped) return line
      return qs ? `${mapped}?${qs}` : mapped
    })
    .join('\n')
}

/** Skip stock placeholders so the UI always paints a frame from the video file. */
export function usablePoster(url?: string) {
  if (!url) return ''
  if (/picsum\.photos|placeholder|placehold\.co|via\.placeholder/i.test(url)) return ''
  return url
}

/** Enable CORS mode only for our media host so canvas thumbs work without breaking demo URLs. */
export function mediaCrossOrigin(src?: string): 'anonymous' | undefined {
  if (!src) return undefined
  if (src.startsWith('/api/')) return 'anonymous'
  try {
    const u = new URL(src, typeof window === 'undefined' ? 'https://getvideo.fun' : window.location.href)
    if (u.pathname.startsWith('/api/file/')) return 'anonymous'
    const host = u.hostname.toLowerCase()
    if (host === 'getvideo.fun' || host.endsWith('.getvideo.fun') || host.endsWith('.workers.dev')) return 'anonymous'
    if (host.endsWith('firebasestorage.googleapis.com') || host.endsWith('firebaseapp.com')) return 'anonymous'
  } catch {
    /* ignore */
  }
  return undefined
}
