/**
 * Backfill missing thumbnailUrl / previewUrls for all published videos
 * by grabbing ~10 frames from each videoUrl (HLS or MP4) via getvideo.fun.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

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
const site = (process.env.SITE_ORIGIN || 'https://www.getvideo.fun').replace(/\/$/, '')

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

function sceneTimes(duration) {
  const d = duration > 0 ? duration : 600
  const count = Math.max(4, Math.min(12, Math.round(d / 60) || 10))
  const oneMin = d >= 70 ? 60 : Math.max(1, Math.min(10, Math.floor(d * 0.35)))
  const out = [oneMin]
  for (let i = 0; i < count; i += 1) {
    const t = Math.min(d * 0.96, Math.max(0.5, d * (0.06 + (0.88 * i) / Math.max(1, count - 1))))
    if (out.every((x) => Math.abs(x - t) > Math.max(4, d / 40))) out.push(Math.round(t * 10) / 10)
  }
  return out.slice(0, count)
}

function mediaUrl(path) {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `${site}${path.startsWith('/') ? path : `/${path}`}`
}

function grabFrame(src, t, outFile) {
  const r = spawnSync(
    'ffmpeg',
    ['-y', '-ss', String(t), '-i', src, '-frames:v', '1', '-q:v', '4', '-update', '1', outFile],
    { encoding: 'utf8', timeout: 120_000 },
  )
  if (r.status !== 0) {
    // HLS sometimes fails with -ss before -i; retry input-first
    const r2 = spawnSync(
      'ffmpeg',
      ['-y', '-i', src, '-ss', String(t), '-frames:v', '1', '-q:v', '4', '-update', '1', outFile],
      { encoding: 'utf8', timeout: 180_000 },
    )
    if (r2.status !== 0) {
      throw new Error(`ffmpeg fail t=${t}: ${(r2.stderr || r.stderr || '').slice(-400)}`)
    }
  }
}

async function login() {
  const loginRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )
  const login = await loginRes.json()
  if (!login.idToken) throw new Error(`login failed ${JSON.stringify(login)}`)
  return login.idToken
}

async function uploadJpg(bytes) {
  const key = `thumbs/${randomUUID()}.jpg`
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: 'image/jpeg',
      CacheControl: 'public, max-age=86400',
    }),
  )
  return `/api/file/${key}`
}

async function main() {
  const token = await login()
  const data = await (await fetch(`${dbUrl}/videos.json`)).json()
  const vids = Object.values(data || {}).filter((v) => v && v.videoUrl && !(v.thumbnailUrl || '').trim())
  console.log(`backfilling ${vids.length} videos without posters`)

  for (const v of vids) {
    const src = mediaUrl(v.videoUrl)
    const times = sceneTimes(Number(v.duration) || 600)
    const dir = join(tmpdir(), `fb-thumbs-${v.id}`)
    mkdirSync(dir, { recursive: true })
    console.log(`\n== ${v.id} ${times.length} scenes from ${src}`)
    const previewUrls = []
    try {
      for (let i = 0; i < times.length; i += 1) {
        const t = times[i]
        const file = join(dir, `s${i}.jpg`)
        process.stdout.write(`  t=${t}s … `)
        grabFrame(src, t, file)
        const url = await uploadJpg(readFileSync(file))
        previewUrls.push(url)
        console.log('ok', url)
      }
      const patch = {
        thumbnailUrl: previewUrls[0],
        previewUrls,
        updatedAt: Date.now(),
      }
      const patchRes = await fetch(`${dbUrl}/videos/${v.id}.json?auth=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!patchRes.ok) throw new Error(`patch ${patchRes.status}`)
      console.log(`  patched ${v.id} thumbs=${previewUrls.length}`)
    } catch (e) {
      console.error(`  FAIL ${v.id}`, e.message || e)
    } finally {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  }
  console.log('\ndone')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
