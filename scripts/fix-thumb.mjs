import { readFileSync, writeFileSync } from 'node:fs'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY
const dbUrl = process.env.VITE_FIREBASE_DATABASE_URL
const email = process.env.VITE_ADMIN_EMAIL || 'am@gmail.com'
const password = process.env.ADMIN_PASS || 'admin1'

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
})
const bucket = process.env.R2_BUCKET || 'feedboss'

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
  if (!login.idToken) {
    console.error('login failed', login)
    process.exit(1)
  }

  const posterPath = process.env.POSTER_FILE
  const videoId = process.env.VIDEO_ID || 'vid_ea3f3fe8'
  const key = `thumbs/${crypto.randomUUID()}.jpg`
  const body = readFileSync(posterPath)

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=86400',
    }),
  )

  const thumbnailUrl = `/api/file/${key}`
  const patchRes = await fetch(`${dbUrl}/videos/${videoId}.json?auth=${login.idToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thumbnailUrl,
      previewUrls: [thumbnailUrl],
      updatedAt: Date.now(),
    }),
  })
  const patched = await patchRes.json()
  console.log(JSON.stringify({ ok: true, thumbnailUrl, patched }, null, 2))
  writeFileSync('thumb-fix.json', JSON.stringify({ thumbnailUrl, key }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
