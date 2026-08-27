/**
 * Cloudflare Worker: /api/upload + /api/file/* against R2 bucket `feedboss`.
 * Static Vite files are served from dist via wrangler assets (SPA).
 */
import { preflight, withCors } from './cors.js'

const folders = new Set(['videos', 'thumbs', 'images'])

function json(data, status = 200) {
  return Response.json(data, { status })
}

function safeKey(raw) {
  const key = String(raw || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
  if (!key || key.includes('..')) return ''
  if (!/^[a-zA-Z0-9/_.-]+$/.test(key)) return ''
  const folder = key.split('/')[0]
  if (!folders.has(folder)) return ''
  return key
}

async function verifyFirebase(token, env) {
  const firebaseKey = env.FIREBASE_WEB_API_KEY || env.VITE_FIREBASE_API_KEY || ''
  if (!token || !firebaseKey) return false
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken: token }),
  })
  const data = await res.json()
  return Boolean(data.users?.[0]?.localId)
}

function parseRange(header) {
  const m = /^bytes=(\d*)-(\d*)$/i.exec(header || '')
  if (!m) return null
  const start = m[1] === '' ? null : Number(m[1])
  const end = m[2] === '' ? null : Number(m[2])
  if (start == null && end == null) return null
  if (start != null && end != null) return { offset: start, length: end - start + 1, start, end }
  if (start != null) return { offset: start, start, end: null }
  return { suffix: end, start: null, end }
}

async function handleUpload(request, env) {
  const header = request.headers.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!(await verifyFirebase(token, env))) {
    return json({ error: 'Unauthorized — admin login required' }, 401)
  }

  const form = await request.formData()
  const file = form.get('file')
  if (!file || typeof file === 'string') return json({ error: 'file missing' }, 400)

  const folderRaw = String(form.get('folder') || 'videos')
  const folder = folders.has(folderRaw) ? folderRaw : 'videos'
  const given = String(form.get('filename') || file.name || 'file.bin')
  const base = given.split('/').pop() || 'file.bin'
  const key = safeKey(`${folder}/${Date.now()}-${base}`) || `${folder}/${Date.now()}.bin`

  await env.R2.put(key, file.stream(), {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  })
  return json({ url: `/api/file/${key}`, key })
}

async function handleFile(request, env, pathname) {
  const key = safeKey(pathname.replace(/^\/api\/file\//, ''))
  if (!key) return json({ error: 'Invalid key' }, 400)

  const rangeHeader = request.headers.get('Range')
  const parsed = parseRange(rangeHeader)
  const obj = parsed
    ? await env.R2.get(key, {
        range:
          parsed.suffix != null
            ? { suffix: parsed.suffix }
            : parsed.length != null
              ? { offset: parsed.offset, length: parsed.length }
              : { offset: parsed.offset },
      })
    : await env.R2.get(key)

  if (!obj) return json({ error: 'Not found' }, 404)

  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'public, max-age=31536000, immutable')

  if (parsed && obj.size != null) {
    const start = parsed.start ?? Math.max(0, obj.size - (parsed.suffix || 0))
    const end = parsed.end ?? obj.size - 1
    headers.set('Content-Range', `bytes ${start}-${end}/${obj.size}`)
    headers.set('Content-Length', String(end - start + 1))
    return new Response(obj.body, { status: 206, headers })
  }

  return new Response(obj.body, { headers })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return preflight(request, env)
    }

    let res
    if (url.pathname === '/api/health') {
      res = json({ ok: true, bucket: 'feedboss' })
    } else if (url.pathname === '/api/upload' && request.method === 'POST') {
      res = await handleUpload(request, env)
    } else if (url.pathname.startsWith('/api/file/') && (request.method === 'GET' || request.method === 'HEAD')) {
      res = await handleFile(request, env, url.pathname)
      if (request.method === 'HEAD' && res.body) {
        res = new Response(null, { status: res.status, headers: res.headers })
      }
    } else if (url.pathname.startsWith('/api/')) {
      res = json({ error: 'Not found' }, 404)
    } else {
      return env.ASSETS.fetch(request)
    }

    return withCors(res, request, env)
  },
}
