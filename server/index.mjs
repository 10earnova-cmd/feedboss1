import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { corsHeaderRecord, preflight } from './cors.js'
import { cacheControlFor, contentTypeFor } from './media.js'

const bucket = process.env.R2_BUCKET || 'feedboss'
const endpoint = process.env.R2_ENDPOINT
const accessKeyId = process.env.R2_ACCESS_KEY_ID
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
const firebaseKey = process.env.VITE_FIREBASE_API_KEY || ''
const port = Number(process.env.API_PORT || 8788)

if (!endpoint || !accessKeyId || !secretAccessKey) {
  console.error('Missing R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env')
  process.exit(1)
}

const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
})

const folders = new Set(['videos', 'thumbs', 'images'])

function safeKey(raw) {
  const key = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!key || key.includes('..')) return ''
  if (!/^[a-zA-Z0-9/_.\-]+$/.test(key)) return ''
  const folder = key.split('/')[0]
  if (!folders.has(folder)) return ''
  return key
}

async function verifyFirebase(token) {
  if (!token || !firebaseKey) return false
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  })
  const data = await res.json()
  return Boolean(data.users?.[0]?.localId)
}

const app = new Hono()

app.use('/api/*', async (c, next) => {
  if (c.req.method === 'OPTIONS') return preflight(c.req.raw, process.env)
  await next()
  const extra = corsHeaderRecord(c.req.raw, process.env)
  for (const [k, v] of Object.entries(extra)) c.res.headers.set(k, v)
})

app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'Server error' }, 500)
})

app.get('/api/health', (c) => c.json({ ok: true, bucket }))

app.post('/api/upload', async (c) => {
  const header = c.req.header('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!(await verifyFirebase(token))) {
    return c.json({ error: 'Unauthorized — admin login required' }, 401)
  }

  const form = await c.req.parseBody({ all: true })
  const file = form.file
  if (!file || typeof file === 'string') {
    return c.json({ error: 'file missing' }, 400)
  }

  const requested =
    (typeof form.key === 'string' && form.key) || (typeof form.filename === 'string' && form.filename) || ''
  let key = requested.includes('/') ? safeKey(requested) : ''
  if (!key) {
    const folderRaw = typeof form.folder === 'string' ? form.folder : 'videos'
    const folder = folders.has(folderRaw) ? folderRaw : 'videos'
    const base = (requested || file.name || 'file.bin').split('/').pop() || 'file.bin'
    key = safeKey(`${folder}/${Date.now()}-${base}`) || `${folder}/${Date.now()}.bin`
  }

  const buf = Buffer.from(await file.arrayBuffer())
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buf,
      ContentType: contentTypeFor(key, file.type),
    }),
  )

  return c.json({ url: `/api/file/${key}`, key })
})

app.get('/api/file/*', async (c) => {
  const key = safeKey(c.req.path.replace(/^\/api\/file\//, ''))
  if (!key) return c.json({ error: 'Invalid key' }, 400)

  const range = c.req.header('Range')
  try {
    const obj = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        Range: range || undefined,
      }),
    )
    const headers = new Headers()
    headers.set('Content-Type', contentTypeFor(key, obj.ContentType))
    headers.set('Accept-Ranges', 'bytes')
    headers.set('Cache-Control', cacheControlFor(key))
    if (obj.ContentLength != null) headers.set('Content-Length', String(obj.ContentLength))
    if (obj.ContentRange) headers.set('Content-Range', obj.ContentRange)
    const status = obj.ContentRange ? 206 : 200
    if (!obj.Body) return c.body(null, 404)
    return new Response(obj.Body.transformToWebStream(), { status, headers })
  } catch {
    return c.json({ error: 'Not found' }, 404)
  }
})

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`R2 API http://127.0.0.1:${info.port}  bucket=${bucket}`)
})
