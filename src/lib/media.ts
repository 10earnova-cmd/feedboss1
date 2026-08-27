export function videoFrameUrl(src: string, seconds = 2) {
  if (!src) return ''
  const base = src.split('#')[0]
  return `${base}#t=${seconds}`
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
    if (host === 'getvideo.fun' || host.endsWith('.getvideo.fun')) return 'anonymous'
  } catch {
    /* ignore */
  }
  return undefined
}
