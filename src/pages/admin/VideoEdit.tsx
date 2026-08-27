import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { captureThumb, readVideoMeta, uploadMedia } from '../../lib/storage'
import { mediaCrossOrigin } from '../../lib/media'
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
  const [thumbFile, setThumbFile] = useState<File | null>(null)
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
    let done = false
    const grab = async () => {
      if (done) return
      done = true
      try {
        const blob = await captureThumb(el)
        setThumbFile(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }))
        const url = URL.createObjectURL(blob)
        setForm((f) => (f ? { ...f, thumbnailUrl: url } : f))
      } catch {
        /* canvas may fail on cross-origin URLs */
      }
    }
    const onSeeked = () => {
      void grab()
    }
    const onLoaded = () => {
      try {
        el.currentTime = Math.min(2, (el.duration || 2) * 0.1)
      } catch {
        void grab()
      }
    }
    el.addEventListener('loadeddata', onLoaded)
    el.addEventListener('seeked', onSeeked)
    if (el.readyState >= 2) onLoaded()
    return () => {
      el.removeEventListener('loadeddata', onLoaded)
      el.removeEventListener('seeked', onSeeked)
    }
  }, [previewSrc])

  if (!form) return <p className="text-muted">Video not found.</p>

  const set = <K extends keyof Video>(key: K, value: Video[K]) => setForm({ ...form, [key]: value })

  const onPickVideo = async (file: File) => {
    setVideoFile(file)
    setMsg('')
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
      const workerUrl = settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
      const priv = await db.getPrivateSettings()
      const secret = priv.uploadSecret || settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''

      if (videoFile) {
        const up = await uploadMedia({
          file: videoFile,
          folder: 'videos',
          workerUrl,
          uploadSecret: secret,
          onProgress: setProgress,
        })
        videoUrl = up.url
      }

      if (thumbFile) {
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
          <label className="text-sm">Video file (Cloudflare R2)</label>
          <input
            className="input"
            type="file"
            accept="video/mp4,video/webm,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onPickVideo(f)
            }}
          />
          <label className="text-sm">Or video URL</label>
          <input className="input" value={form.videoUrl} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://cdn.../video.mp4" />
          <video
            ref={previewRef}
            className="mt-2 aspect-video w-full rounded-xl bg-black"
            controls
            crossOrigin={previewSrc.startsWith('blob:') ? undefined : mediaCrossOrigin(form.videoUrl)}
            src={previewSrc || form.videoUrl}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn btn-ghost" type="button" onClick={() => void grabThumb()}>
              Capture thumbnail from video
            </button>
            <p className="text-xs text-muted">Auto-captured from ~2s when you pick a file. Seek then recapture if needed.</p>
          </div>
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
