import { S3Client } from '@aws-sdk/client-s3'

const folders = new Set(['videos', 'thumbs', 'images'])

export const bucket = process.env.R2_BUCKET || 'feedboss'

export function safeKey(raw) {
  const key = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!key || key.includes('..')) return ''
  if (!/^[a-zA-Z0-9/_.\-]+$/.test(key)) return ''
  const folder = key.split('/')[0]
  if (!folders.has(folder)) return ''
  return key
}

export function getS3() {
  const endpoint = process.env.R2_ENDPOINT
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY')
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true,
  })
}

export async function verifyFirebase(token) {
  const firebaseKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY || ''
  if (!token || !firebaseKey) return false
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  })
  const data = await res.json()
  return Boolean(data.users?.[0]?.localId)
}
