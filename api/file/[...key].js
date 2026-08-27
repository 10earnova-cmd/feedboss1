import { GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { bucket, getS3, safeKey } from '../../server/r2.js'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const raw = Array.isArray(req.query.key) ? req.query.key.join('/') : String(req.query.key || '')
    const key = safeKey(raw)
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
