import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { corsHeaderRecord, preflight } from './cors.js'
import { cacheControlFor, contentTypeFor } from './media.js'
import { bucket, getS3, safeKey, verifyFirebase } from './r2.js'

const port = Number(process.env.API_PORT || 8788)
const s3 = getS3()

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

app.post('/api/sign', async (c) => {
  const header = c.req.header('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!(await verifyFirebase(token))) {
    return c.json({ error: 'Unauthorized — admin login required' }, 401)
  }
  const body = await c.req.json().catch(() => ({}))
  const key = safeKey(body.key)
  if (!key) return c.json({ error: 'Invalid key' }, 400)
  const contentType = contentTypeFor(key, body.contentType)
  const putUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 3600 },
  )
  return c.json({ putUrl, url: `/api/file/${key}`, key, contentType })
})

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
    const folder = folderRaw === 'thumbs' || folderRaw === 'images' ? folderRaw : 'videos'
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
