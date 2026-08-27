import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { cacheControlFor, contentTypeFor, isHlsSegmentKey, isImageKey, isPlaylistKey } from '../server/media.js'
import { bucket, getS3, safeKey } from '../server/r2.js'

function firstQuery(value) {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.filter(Boolean).join('/')
  return String(value)
}

function keyFromReq(req) {
  const q = req.query || {}
  const fromQuery = firstQuery(q.key) || firstQuery(q.path)
  if (fromQuery) return decodeURIComponent(fromQuery)

  const candidates = [req.url, req.headers?.['x-invoke-path'], req.headers?.['x-forwarded-uri']]
  for (const raw of candidates) {
    if (!raw) continue
    const path = decodeURIComponent(String(raw).split('?')[0])
    const marker = '/api/file/'
    const idx = path.indexOf(marker)
    if (idx >= 0) return path.slice(idx + marker.length)
  }
  return ''
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type, ETag')
}

async function proxyObject(req, res, key) {
  const range = req.headers.range || req.headers.Range
  const obj = await getS3().send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      Range: range || undefined,
    }),
  )
  const type = contentTypeFor(key, obj.ContentType)
  const cache = isPlaylistKey(key)
    ? 'public, max-age=60, must-revalidate'
    : isImageKey(key)
      ? cacheControlFor(key)
      : 'public, max-age=3600, immutable'

  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', cache)
  res.setHeader('Accept-Ranges', 'bytes')
  if (obj.ContentLength != null) res.setHeader('Content-Length', String(obj.ContentLength))
  if (obj.ContentRange) res.setHeader('Content-Range', obj.ContentRange)
  if (obj.ETag) res.setHeader('ETag', obj.ETag)

  const status = obj.ContentRange ? 206 : 200
  if (req.method === 'HEAD') {
    res.status(status).end()
    return
  }

  const bytes = Buffer.from(await obj.Body.transformToByteArray())
  res.status(status).send(bytes)
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const key = safeKey(keyFromReq(req))
    if (!key) {
      res.setHeader('Cache-Control', 'no-store')
      res.status(400).json({ error: 'Invalid key' })
      return
    }

    // Proxy posters + HLS playlist/segments on our origin.
    // (302 → R2 breaks hls.js / imgs when bucket CORS is missing, and was caching empty thumbs.)
    if (isImageKey(key) || isPlaylistKey(key) || isHlsSegmentKey(key)) {
      await proxyObject(req, res, key)
      return
    }

    const url = await getSignedUrl(getS3(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: 86400,
    })
    res.setHeader('Cache-Control', 'private, max-age=300')
    res.redirect(302, url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'File error'
    const missing = /NoSuchKey|NotFound|404/i.test(msg) || err?.$metadata?.httpStatusCode === 404
    // Never let CDNs cache missing posters for a day.
    res.setHeader('Cache-Control', 'no-store')
    res.status(missing ? 404 : 500).json({ error: missing ? 'Not found' : msg })
  }
}
