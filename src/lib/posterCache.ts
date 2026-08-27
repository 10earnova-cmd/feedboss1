/** In-memory warm set so SPA back/forward does not flash empty while HTTP cache serves the bytes. */
const warm = new Set<string>()
const DAY_MS = 86400_000
const stampKey = 'fb_poster_cache_v1'

type StampMap = Record<string, number>

function readStamps(): StampMap {
  try {
    const raw = sessionStorage.getItem(stampKey)
    if (!raw) return {}
    const data = JSON.parse(raw) as StampMap
    const now = Date.now()
    const next: StampMap = {}
    for (const [url, t] of Object.entries(data)) {
      if (now - t < DAY_MS) {
        next[url] = t
        warm.add(url)
      }
    }
    return next
  } catch {
    return {}
  }
}

let stamps = typeof sessionStorage !== 'undefined' ? readStamps() : {}

function writeStamps() {
  try {
    sessionStorage.setItem(stampKey, JSON.stringify(stamps))
  } catch {
    /* quota / private mode */
  }
}

export function isPosterWarm(url?: string) {
  if (!url) return false
  if (warm.has(url)) return true
  const t = stamps[url]
  return Boolean(t && Date.now() - t < DAY_MS)
}

export function markPosterLoaded(url?: string) {
  if (!url || url.startsWith('blob:')) return
  warm.add(url)
  stamps[url] = Date.now()
  writeStamps()
}

/** Prefetch into browser HTTP cache (1-day Cache-Control on /api/file/thumbs). */
export function prefetchPoster(url?: string) {
  const src = (url || '').trim()
  if (!src || src.startsWith('blob:') || isPosterWarm(src)) return
  const img = new Image()
  img.decoding = 'async'
  img.onload = () => markPosterLoaded(src)
  img.onerror = () => undefined
  img.src = src
}

export function prefetchPosters(urls: Array<string | undefined | null>) {
  for (const u of urls) prefetchPoster(u || undefined)
}
