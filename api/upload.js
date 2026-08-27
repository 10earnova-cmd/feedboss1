export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  res.status(409).json({
    error: 'This admin page is outdated. Hard refresh (Ctrl+Shift+R) then upload again. Videos go to Cloudflare R2 via /api/sign.',
  })
}
