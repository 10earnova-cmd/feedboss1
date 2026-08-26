function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  }
}

function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  })
}

function sanitizeName(name) {
  return String(name || 'file')
    .toLowerCase()
    .replace(/[^a-z0-9.\-]+/g, '-')
    .slice(0, 80)
}

async function authorized(request, env) {
  const header = request.headers.get('Authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) return false
  if (env.UPLOAD_SECRET && token === env.UPLOAD_SECRET) return true
  if (!env.FIREBASE_WEB_API_KEY) return false
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${env.FIREBASE_WEB_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      },
    )
    const data = await res.json()
    const email = data.users?.[0]?.email
    if (!email) return false
    const allow = String(env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    if (allow.length && !allow.includes(String(email).toLowerCase())) return false
    return true
  } catch {
    return false
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'deshix-media' }, env)
    }

    if (request.method === 'GET' && url.pathname.startsWith('/file/')) {
      const key = decodeURIComponent(url.pathname.slice('/file/'.length))
      const obj = await env.MEDIA.get(key)
      if (!obj) return json({ error: 'Not found' }, env, 404)
      const headers = new Headers(corsHeaders(env))
      headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream')
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      return new Response(obj.body, { headers })
    }

    if (url.pathname === '/upload' && request.method === 'POST') {
      if (!(await authorized(request, env))) {
        return json({ error: 'Unauthorized' }, env, 401)
      }
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') {
        return json({ error: 'file missing' }, env, 400)
      }
      const folder = sanitizeName(form.get('folder') || 'videos').replace(/\./g, '')
      const given = form.get('filename')
      const name = sanitizeName(typeof given === 'string' ? given : file.name || `${crypto.randomUUID()}.bin`)
      const key = `${folder}/${Date.now()}-${name.split('/').pop()}`
      await env.MEDIA.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'application/octet-stream' },
      })
      const base = (env.PUBLIC_BASE_URL || `${url.origin}/file`).replace(/\/$/, '')
      const publicUrl = env.PUBLIC_BASE_URL ? `${base}/${key}` : `${url.origin}/file/${key}`
      return json({ url: publicUrl, key }, env)
    }

    return json({ error: 'Not found' }, env, 404)
  },
}
