import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Seo } from '../../components/Seo'
import { VideoPlayer } from '../../components/VideoPlayer'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { isHlsUrl, mediaCrossOrigin, parseHlsDuration, pickHlsPlaylist } from '../../lib/media'
import { captureScenes, captureThumb, readVideoMeta, uploadHlsPack, uploadMedia } from '../../lib/storage'
import { slugify, uniqueSlug } from '../../lib/slug'
import type { Video, VideoStatus } from '../../types'

const empty = (categoryId: string): Video => ({
  id: newId('vid'),
  slug: '',
  titleEn: '',
  titleBn: '',
  captionEn: '',
  captionBn: '',
  videoUrl: '',
  thumbnailUrl: '',
  previewUrls: [],
  duration: 0,
  views: 0,
  likes: 0,
  categoryId,
  tagIds: [],
  modelIds: [],
  status: 'published',
  featured: false,
  trending: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

export function VideoEdit() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { videos, categories, tags, performers, settings, refresh } = useSite()
  const existing = videos.find((v) => v.id === id)
  const [form, setForm] = useState<Video | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [hlsFiles, setHlsFiles] = useState<File[]>([])
  const [thumbFile, setThumbFile] = useState<File | null>(null)
  const [sceneFiles, setSceneFiles] = useState<File[]>([])
  const [previewSrc, setPreviewSrc] = useState('')
  const previewRef = useRef<HTMLVideoElement>(null)
  const localUrl = useRef('')

  useEffect(() => {
    if (isNew) {
      setForm(empty(categories[0]?.id || ''))
      return
    }
    if (existing) setForm({ ...existing })
  }, [isNew, existing, categories])

  useEffect(() => {
    return () => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current)
    }
  }, [])

  const slugPreview = useMemo(() => {
    if (!form) return ''
    const base = slugify(form.titleEn || form.titleBn)
    return uniqueSlug(
      base,
      videos.filter((v) => v.id !== form.id).map((v) => v.slug),
    )
  }, [form, videos])

  useEffect(() => {
    const el = previewRef.current
    if (!el || !previewSrc) return
    let cancelled = false
    let started = false
    const run = async () => {
      try {
        const blobs = await captureScenes(el)
        if (cancelled || !blobs.length) return
        const files = blobs.map((b, i) => new File([b], `scene-${i}.jpg`, { type: 'image/jpeg' }))
        const urls = files.map((f) => URL.createObjectURL(f))
        setThumbFile(files[0])
        setSceneFiles(files)
        setForm((f) => (f ? { ...f, thumbnailUrl: urls[0], previewUrls: urls } : f))
      } catch {
        /* canvas may fail on cross-origin URLs */
      }
    }
    const onReady = () => {
      if (started) return
      started = true
      void run()
    }
    el.addEventListener('loadeddata', onReady)
    if (el.readyState >= 2) onReady()
    return () => {
      cancelled = true
      el.removeEventListener('loadeddata', onReady)
    }
  }, [previewSrc])

  if (!form) return <p className="text-muted">Video not found.</p>

  const set = <K extends keyof Video>(key: K, value: Video[K]) => setForm({ ...form, [key]: value })
  const hlsPlaylist = pickHlsPlaylist(hlsFiles)
  const hlsMode = hlsFiles.length > 0 || isHlsUrl(form.videoUrl)

  const onPickFiles = async (files: File[]) => {
    setMsg('')
    const pack = files.filter((f) => /\.(m3u8|ts|m4s|vtt|key)$/i.test(f.name))
    const playlist = pickHlsPlaylist(pack)
    if (playlist) {
      setHlsFiles(pack)
      setVideoFile(null)
      setSceneFiles([])
      if (localUrl.current) URL.revokeObjectURL(localUrl.current)
      localUrl.current = ''
      setPreviewSrc('')
      const duration = parseHlsDuration(await playlist.text())
      setForm((f) => (f ? { ...f, duration: duration || f.duration } : f))
      const segs = pack.filter((f) => /\.(ts|m4s)$/i.test(f.name)).length
      setMsg(
        segs
          ? `HLS pack ready: ${playlist.name} + ${segs} segments (${pack.length} files)`
          : `Playlist ${playlist.name} selected. Also select every .ts / .m4s file, or paste a full HLS URL.`,
      )
      return
    }
    if (files.length > 1) {
      setMsg('No .m3u8 playlist found. Select the playlist with every .ts file, or a single MP4.')
      return
    }
    const file = files.find((f) => /\.(mp4|webm)$/i.test(f.name)) || files[0]
    if (!file) return
    setHlsFiles([])
    setVideoFile(file)
    if (localUrl.current) URL.revokeObjectURL(localUrl.current)
    try {
      const meta = await readVideoMeta(file)
      localUrl.current = meta.objectUrl
      setPreviewSrc(meta.objectUrl)
      setForm((f) => (f ? { ...f, duration: meta.duration } : f))
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not read video')
    }
  }

  const grabThumb = async () => {
    const el = previewRef.current
    if (!el) return
    const blob = await captureThumb(el)
    setThumbFile(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }))
    const url = URL.createObjectURL(blob)
    set('thumbnailUrl', url)
  }

  const grabScenes = async () => {
    const el = previewRef.current
    if (!el) return
    setMsg('Capturing scene photos…')
    try {
      const blobs = await captureScenes(el)
      const files = blobs.map((b, i) => new File([b], `scene-${i}.jpg`, { type: 'image/jpeg' }))
      const urls = files.map((f) => URL.createObjectURL(f))
      setThumbFile(files[0] || null)
      setSceneFiles(files)
      setForm((f) => (f ? { ...f, thumbnailUrl: urls[0] || f.thumbnailUrl, previewUrls: urls } : f))
      setMsg(`Captured ${files.length} scene photos (poster = 10%)`)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not capture scenes')
    }
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.titleBn && !form.titleEn) {
      setMsg('Add a Bangla or English title')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      let videoUrl = form.videoUrl
      let thumbnailUrl = form.thumbnailUrl
      let previewUrls = (form.previewUrls || []).filter((u) => u && !u.startsWith('blob:'))
      let duration = form.duration
      const workerUrl = settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
      const priv = await db.getPrivateSettings()
      const secret = priv.uploadSecret || settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''

      if (hlsFiles.length) {
        const up = await uploadHlsPack({
          files: hlsFiles,
          workerUrl,
          uploadSecret: secret,
          onProgress: setProgress,
        })
        videoUrl = up.url
        if (up.duration) duration = up.duration
      } else if (videoFile) {
        const up = await uploadMedia({
          file: videoFile,
          folder: 'videos',
          workerUrl,
          uploadSecret: secret,
          onProgress: setProgress,
        })
        videoUrl = up.url
      }

      if (sceneFiles.length) {
        previewUrls = []
        for (const file of sceneFiles) {
          const up = await uploadMedia({
            file,
            folder: 'thumbs',
            workerUrl,
            uploadSecret: secret,
          })
          previewUrls.push(up.url)
        }
        if (previewUrls[0] && (!thumbFile || thumbFile === sceneFiles[0])) thumbnailUrl = previewUrls[0]
      }

      if (thumbFile && thumbFile !== sceneFiles[0]) {
        const up = await uploadMedia({
          file: thumbFile,
          folder: 'thumbs',
          workerUrl,
          uploadSecret: secret,
        })
        thumbnailUrl = up.url
      }

      const payload: Video = {
        ...form,
        slug: form.slug || slugPreview,
        videoUrl,
        thumbnailUrl,
        previewUrls,
        duration,
        updatedAt: Date.now(),
        createdAt: isNew ? Date.now() : form.createdAt,
      }
      if (!payload.videoUrl) throw new Error('A video URL or file is required')
      await db.saveVideo(payload)
      await refresh()
      navigate('/admin/videos')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(e) => void onSave(e)} className="max-w-5xl">
      <Seo title={isNew ? 'New video' : 'Edit video'} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{isNew ? 'New video' : 'Edit video'}</h1>
        <button className="btn btn-primary" disabled={busy} type="submit">
          {busy ? `Saving ${progress || ''}${progress ? '%' : ''}` : 'Save'}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm">HLS pack or video file (Cloudflare R2)</label>
          <input
            className="input"
            type="file"
            multiple
            accept=".m3u8,.ts,.m4s,.mp4,.webm,video/mp4,video/webm,application/vnd.apple.mpegurl,application/x-mpegURL"
            onChange={(e) => {
              const files = e.target.files
              if (files?.length) void onPickFiles([...files])
            }}
          />
          <label className="text-sm">Or HLS folder (playlist + segments)</label>
          <input
            className="input"
            type="file"
            multiple
            // Folder picker keeps relative paths so 720p/index.m3u8 still works.
            {...({ webkitdirectory: '' } as Record<string, string>)}
            onChange={(e) => {
              const files = e.target.files
              if (files?.length) void onPickFiles([...files])
            }}
          />
          <p className="text-xs text-muted">
            Best: select <code>index.m3u8</code> together with every <code>.ts</code> file, or pick the whole HLS folder.
            MP4 still works. Worker cannot convert MP4 to HLS — upload a ready m3u8 pack.
          </p>
          {hlsPlaylist ? (
            <p className="text-xs text-muted">
              Playlist <strong>{hlsPlaylist.name}</strong> · {hlsFiles.length} files will upload as one stream pack.
            </p>
          ) : null}
          <label className="text-sm">Or stream URL (.m3u8 or .mp4)</label>
          <input
            className="input"
            value={form.videoUrl}
            onChange={(e) => set('videoUrl', e.target.value)}
            placeholder="https://cdn.../index.m3u8"
          />
          {hlsMode && !previewSrc ? (
            form.videoUrl ? (
              <VideoPlayer src={form.videoUrl} poster={form.thumbnailUrl.startsWith('blob:') ? '' : form.thumbnailUrl} title={form.titleEn || form.titleBn || 'Preview'} />
            ) : (
              <div className="mt-2 flex aspect-video items-center justify-center rounded-xl bg-black text-sm text-muted">
                HLS preview after save, or paste an .m3u8 URL
              </div>
            )
          ) : (
            <video
              ref={previewRef}
              className="mt-2 aspect-video w-full rounded-xl bg-black"
              controls
              crossOrigin={previewSrc.startsWith('blob:') ? undefined : mediaCrossOrigin(form.videoUrl)}
              src={previewSrc || (isHlsUrl(form.videoUrl) ? '' : form.videoUrl)}
            />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => void grabThumb()} disabled={hlsMode && !previewSrc}>
              Capture thumbnail from video
            </button>
            <button className="btn btn-ghost" type="button" onClick={() => void grabScenes()} disabled={hlsMode && !previewSrc}>
              Capture changing scenes
            </button>
            <p className="text-xs text-muted">
              {hlsMode
                ? 'HLS needs a poster image — upload a thumbnail below.'
                : 'Poster is taken at 10% of the video. Extra photos from later scenes keep rotating on the grid.'}
            </p>
          </div>
          {(form.previewUrls || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(form.previewUrls || []).map((url) => (
                <img key={url} src={url} alt="" className="h-16 w-24 rounded object-cover" />
              ))}
            </div>
          ) : null}
          <label className="text-sm">Thumbnail file</label>
          <input
            className="input"
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (!f) return
              setThumbFile(f)
              set('thumbnailUrl', URL.createObjectURL(f))
            }}
          />
          <label className="text-sm">Or thumbnail URL</label>
          <input className="input" value={form.thumbnailUrl.startsWith('blob:') ? '' : form.thumbnailUrl} onChange={(e) => set('thumbnailUrl', e.target.value)} />
          {form.thumbnailUrl && <img src={form.thumbnailUrl} alt="" className="h-36 w-64 rounded-lg object-cover" />}
        </div>

        <div className="space-y-3">
          <label className="text-sm">Title (Bangla, public site)</label>
          <input className="input" value={form.titleBn} onChange={(e) => set('titleBn', e.target.value)} />
          <label className="text-sm">Title (English)</label>
          <input className="input" value={form.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
          <label className="text-sm">Slug</label>
          <input className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder={slugPreview} />
          <label className="text-sm">Caption (Bangla, public site)</label>
          <textarea className="input min-h-24" value={form.captionBn} onChange={(e) => set('captionBn', e.target.value)} />
          <label className="text-sm">Caption (English)</label>
          <textarea className="input min-h-24" value={form.captionEn} onChange={(e) => set('captionEn', e.target.value)} />
          <label className="text-sm">Category</label>
          <select className="input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn} / {c.nameBn}
              </option>
            ))}
          </select>
          <label className="text-sm">Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => {
              const on = form.tagIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-accent bg-accent/20' : 'border-line'}`}
                  onClick={() => set('tagIds', on ? form.tagIds.filter((x) => x !== t.id) : [...form.tagIds, t.id])}
                >
                  {t.nameEn || t.nameBn}
                </button>
              )
            })}
          </div>
          <label className="text-sm">Models</label>
          <div className="flex flex-wrap gap-2">
            {performers.map((m) => {
              const on = form.modelIds.includes(m.id)
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm ${on ? 'border-accent bg-accent/20' : 'border-line'}`}
                  onClick={() => set('modelIds', on ? form.modelIds.filter((x) => x !== m.id) : [...form.modelIds, m.id])}
                >
                  {m.name}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Status</label>
              <select className="input mt-1" value={form.status} onChange={(e) => set('status', e.target.value as VideoStatus)}>
                <option value="published">published</option>
                <option value="draft">draft</option>
                <option value="hidden">hidden</option>
              </select>
            </div>
            <div>
              <label className="text-sm">Duration (sec)</label>
              <input className="input mt-1" type="number" value={form.duration} onChange={(e) => set('duration', Number(e.target.value))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.trending} onChange={(e) => set('trending', e.target.checked)} /> Trending
          </label>
        </div>
      </div>
    </form>
  )
}
