import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
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

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const key = safeKey(keyFromReq(req))
    if (!key) {
      res.status(400).json({ error: 'Invalid key' })
      return
    }

    const url = await getSignedUrl(getS3(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 3600 })
    res.setHeader('Cache-Control', 'private, max-age=30')
    res.redirect(302, url)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'File error' })
  }
}
