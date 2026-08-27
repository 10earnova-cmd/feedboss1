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
