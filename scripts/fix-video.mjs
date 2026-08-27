import { readFileSync } from 'node:fs'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY
const dbUrl = process.env.VITE_FIREBASE_DATABASE_URL
const email = process.env.VITE_ADMIN_EMAIL || 'am@gmail.com'
const password = process.env.ADMIN_PASS || 'admin1'
const videoId = process.env.VIDEO_ID || 'vid_ea3f3fe8'
const filePath = process.env.VIDEO_FILE
const thumbUrl = process.env.THUMB_URL || ''

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})

async function main() {
  const loginRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const login = await loginRes.json()
  if (!login.idToken) throw new Error(JSON.stringify(login))

  const key = `videos/${crypto.randomUUID()}.mp4`
  const body = readFileSync(filePath)
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET || 'feedboss',
      Key: key,
      Body: body,
      ContentType: 'video/mp4',
      CacheControl: 'public, max-age=3600',
    }),
  )
  const videoUrl = `/api/file/${key}`
  const patch = {
    videoUrl,
    updatedAt: Date.now(),
  }
  if (thumbUrl) {
    patch.thumbnailUrl = thumbUrl
    patch.previewUrls = [thumbUrl]
  }
  const patchRes = await fetch(`${dbUrl}/videos/${videoId}.json?auth=${login.idToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  console.log(JSON.stringify({ ok: true, videoUrl, key, bytes: body.length, patched: await patchRes.json() }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
