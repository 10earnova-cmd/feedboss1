/** Origins allowed to call /api (upload + video files) from the browser. */
export const DEFAULT_ORIGINS = [
  'https://getvideo.fun',
  'https://www.getvideo.fun',
  'http://getvideo.fun',
  'http://www.getvideo.fun',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
]

export function originAllowed(origin, env) {
  if (!origin) return ''
  const extra = String(env?.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const list = [...DEFAULT_ORIGINS, ...extra]
  if (list.includes(origin)) return origin
  try {
    const host = new URL(origin).hostname.toLowerCase()
    if (host === 'getvideo.fun' || host.endsWith('.getvideo.fun')) return origin
  } catch {
    /* ignore */
  }
  return ''
}

export function corsHeaderRecord(request, env) {
  const origin = originAllowed(request.headers.get('Origin') || '', env)
  const headers = {
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Range',
    'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length, Content-Range, Content-Type, ETag',
    'Access-Control-Max-Age': '86400',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
    headers.Vary = 'Origin'
  }
  return headers
}

export function withCors(response, request, env) {
  const extra = corsHeaderRecord(request, env)
  const headers = new Headers(response.headers)
  for (const [k, v] of Object.entries(extra)) headers.set(k, v)
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function preflight(request, env) {
  return new Response(null, { status: 204, headers: corsHeaderRecord(request, env) })
}
