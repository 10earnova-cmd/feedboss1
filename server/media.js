export function contentTypeFor(key, fallback = 'application/octet-stream') {
  const lower = String(key || '').toLowerCase()
  if (lower.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl'
  if (lower.endsWith('.ts')) return 'video/MP2T'
  if (lower.endsWith('.m4s')) return 'video/iso.segment'
  if (lower.endsWith('.mp4')) return 'video/mp4'
  if (lower.endsWith('.webm')) return 'video/webm'
  if (lower.endsWith('.vtt')) return 'text/vtt'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  return fallback || 'application/octet-stream'
}

export function cacheControlFor(key) {
  return String(key || '').toLowerCase().endsWith('.m3u8')
    ? 'public, max-age=60, must-revalidate'
    : 'public, max-age=31536000, immutable'
}
