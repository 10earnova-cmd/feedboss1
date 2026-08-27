export function contentTypeFor(key, fallback = 'application/octet-stream') {
  const lower = String(key || '').toLowerCase()
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (lower.endsWith('.ts') || lower.endsWith('.mts') || lower.endsWith('.m2ts')) return 'video/MP2T'
  if (lower.endsWith('.m4s')) return 'video/iso.segment'
  if (lower.endsWith('.mp4') || lower.endsWith('.m4v')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.mov')) return 'video/quicktime'
  if (lower.endsWith('.mkv')) return 'video/x-matroska'
  if (lower.endsWith('.avi')) return 'video/x-msvideo'
  if (lower.endsWith('.wmv')) return 'video/x-ms-wmv'
  if (lower.endsWith('.flv') || lower.endsWith('.f4v')) return 'video/x-flv'
  if (lower.endsWith('.mpeg') || lower.endsWith('.mpg') || lower.endsWith('.mpe') || lower.endsWith('.m2v')) return 'video/mpeg'
  if (lower.endsWith('.3gp')) return 'video/3gpp'
  if (lower.endsWith('.3g2')) return 'video/3gpp2'
  if (lower.endsWith('.ogv') || lower.endsWith('.ogg')) return 'video/ogg'
  if (lower.endsWith('.vob')) return 'video/dvd'
  if (lower.endsWith('.asf')) return 'video/x-ms-asf'
  if (lower.endsWith('.vtt')) return 'text/vtt'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return fallback || 'application/octet-stream'
}

export function cacheControlFor(key) {
  const lower = String(key || '').toLowerCase()
  if (lower.endsWith('.m3u8')) return 'public, max-age=60, must-revalidate'
  // Posters / thumbs: browser keeps 1 day — back navigation uses disk cache, no re-download.
  if (
    lower.startsWith('thumbs/') ||
    lower.startsWith('images/') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.png') ||
    lower.endsWith('.webp') ||
    lower.endsWith('.gif')
  ) {
    return 'public, max-age=86400, stale-while-revalidate=86400'
  }
  return 'public, max-age=3600'
}

export function isImageKey(key) {
  const lower = String(key || '').toLowerCase()
  return (
    lower.startsWith('thumbs/') ||
    lower.startsWith('images/') ||
    /\.(jpe?g|png|webp|gif)$/i.test(lower)
  )
}

export function uploadCacheControl(key) {
  return isImageKey(key) ? 'public, max-age=86400' : undefined
}
