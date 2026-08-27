import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

function loadEnv() {
  try {
    const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (!m) continue
      const k = m[1].trim()
      let v = m[2].trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  } catch {
    /* ignore */
  }
}

loadEnv()

const apiKey = process.env.FIREBASE_WEB_API_KEY || process.env.VITE_FIREBASE_API_KEY
const dbUrl = process.env.VITE_FIREBASE_DATABASE_URL
const email = process.env.VITE_ADMIN_EMAIL || 'am@gmail.com'
const password = process.env.ADMIN_PASS || 'admin1'
const videoId = process.env.VIDEO_ID || 'vid_ea3f3fe8'
const scenesDir = process.env.SCENES_DIR || join(process.env.TEMP || '/tmp', 'fbscenes')

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
  const files = readdirSync(scenesDir)
    .filter((f) => /\.jpe?g$/i.test(f))
    .sort()
  if (!files.length) throw new Error(`no jpgs in ${scenesDir}`)

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

  const previewUrls = []
  for (const name of files) {
    const key = `thumbs/${randomUUID()}.jpg`
    const body = readFileSync(join(scenesDir, name))
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'image/jpeg',
        CacheControl: 'public, max-age=86400',
      }),
    )
    previewUrls.push(`/api/file/${key}`)
    console.log('uploaded', name, '->', key)
  }

  const patchRes = await fetch(`${dbUrl}/videos/${videoId}.json?auth=${login.idToken}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thumbnailUrl: previewUrls[0],
      previewUrls,
      updatedAt: Date.now(),
    }),
  })
  const patched = await patchRes.json()
  console.log(JSON.stringify({ ok: true, count: previewUrls.length, previewUrls, patched }, null, 2))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
