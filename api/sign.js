import { PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { contentTypeFor } from '../server/media.js'
import { bucket, getS3, safeKey, verifyFirebase } from '../server/r2.js'

function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string' && req.body) {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return {}
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
    if (!(await verifyFirebase(token))) {
      res.status(401).json({ error: 'Unauthorized — admin login required' })
      return
    }

    const body = readJson(req)
    const key = safeKey(body.key)
    if (!key) {
      res.status(400).json({ error: 'Invalid key' })
      return
    }

    const contentType = contentTypeFor(key, body.contentType)
    const putUrl = await getSignedUrl(
      getS3(),
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: 3600 },
    )
    res.status(200).json({ putUrl, url: `/api/file/${key}`, key, contentType })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Sign failed' })
  }
}
