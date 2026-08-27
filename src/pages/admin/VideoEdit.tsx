import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { isHlsUrl, mediaCrossOrigin, parseHlsDuration, pickHlsPlaylist, VIDEO_ACCEPT, isVideoFile } from '../../lib/media'
import { captureScenes, readVideoMeta, uploadHlsPack, uploadMedia } from '../../lib/storage'
import { prepareVideoForUpload } from '../../lib/transcode'
import { slugify, uniqueSlug } from '../../lib/slug'
import type { Video } from '../../types'

const empty = (): Video => ({
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
  categoryId: '',
  tagIds: [],
  modelIds: [],
  status: 'published',
  featured: false,
  trending: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

function captionOf(v: Video) {
  return v.captionBn || v.captionEn || v.titleBn || v.titleEn
}

export function VideoEdit() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()
  const { videos, settings, refresh } = useSite()
  const existing = videos.find((v) => v.id === id)
  const [form, setForm] = useState<Video | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [msg, setMsg] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [hlsFiles, setHlsFiles] = useState<File[]>([])
  const [sceneFiles, setSceneFiles] = useState<File[]>([])
  const [previewSrc, setPreviewSrc] = useState('')
  const previewRef = useRef<HTMLVideoElement>(null)
  const localUrl = useRef('')

  useEffect(() => {
    if (isNew) {
      const row = empty()
      setForm(row)
      setCaption('')
      return
    }
    if (existing) {
      setForm({ ...existing })
      setCaption(captionOf(existing))
    }
  }, [isNew, existing])

  useEffect(() => {
    return () => {
      if (localUrl.current) URL.revokeObjectURL(localUrl.current)
    }
  }, [])

  const slugPreview = useMemo(() => {
    if (!form) return ''
    return uniqueSlug(
      slugify(caption),
      videos.filter((v) => v.id !== form.id).map((v) => v.slug),
    )
  }, [form, videos, caption])

  useEffect(() => {
    const el = previewRef.current
    if (!el || !previewSrc) return
    let cancelled = false
    let started = false
    const run = async () => {
      setMsg('Taking 1:00 poster and mid scenes for home rotate…')
      try {
        const blobs = await captureScenes(el)
        if (cancelled || !blobs.length) return
        const files = blobs.map((b, i) => new File([b], `scene-${i}.jpg`, { type: 'image/jpeg' }))
        const urls = files.map((f) => URL.createObjectURL(f))
        setSceneFiles(files)
        setForm((f) => (f ? { ...f, thumbnailUrl: urls[0], previewUrls: urls } : f))
        setMsg('Poster and scenes ready from the video')
      } catch {
        setMsg('Could not grab frames — video will still upload')
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
      const label = playlist.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
      setForm((f) => (f ? { ...f, duration: duration || f.duration } : f))
      if (!caption.trim()) setCaption(label)
      setMsg(`HLS pack: ${playlist.name} + ${pack.length} files. Poster is automatic for MP4; HLS needs the stream URL after save.`)
      return
    }
    if (files.length > 1) {
      setMsg('For many videos at once, open Bulk upload.')
      return
    }
    const file = files.find((f) => isVideoFile(f)) || files[0]
    if (!file) return
    if (!isVideoFile(file)) {
      setMsg('Pick a video file (mp4, mov, mkv, avi, webm, …)')
      return
    }
    setHlsFiles([])
    setVideoFile(file)
    if (localUrl.current) URL.revokeObjectURL(localUrl.current)
    try {
      const meta = await readVideoMeta(file)
      localUrl.current = meta.objectUrl
      setPreviewSrc(meta.objectUrl)
      const label = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
      setForm((f) => (f ? { ...f, duration: meta.duration } : f))
      if (!caption.trim()) setCaption(label)
    } catch {
      // Still allow upload even if this browser cannot decode the codec for preview/poster.
      setVideoFile(file)
      setPreviewSrc('')
      const label = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
      if (!caption.trim()) setCaption(label)
      setMsg('Browser cannot preview this format — file will still upload. Poster may be empty until re-encode to MP4.')
    }
  }

  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    const text = caption.trim()
    if (!text) {
      setMsg('Add a caption')
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
        setMsg('Uploading HLS pack…')
        const up = await uploadHlsPack({
          files: hlsFiles,
          workerUrl,
          uploadSecret: secret,
          onProgress: setProgress,
        })
        videoUrl = up.url
        if (up.duration) duration = up.duration
      } else if (videoFile) {
        setMsg('Light prepare on device (remux first, heavy encode only if needed)…')
        const prepared = await prepareVideoForUpload(videoFile, (pct, label) => {
          setProgress(Math.min(70, pct))
          setMsg(label)
        })
        if (prepared.kind === 'hls') {
          setMsg('Uploading HLS to Cloudflare…')
          const up = await uploadHlsPack({
            files: prepared.files,
            workerUrl,
            uploadSecret: secret,
            onProgress: (pct) => setProgress(70 + Math.round(pct * 0.28)),
          })
          videoUrl = up.url
          if (up.duration) duration = up.duration
          else if (prepared.duration) duration = prepared.duration
        } else {
          setMsg('Uploading browser-safe MP4 to Cloudflare…')
          const up = await uploadMedia({
            file: prepared.file,
            folder: 'videos',
            workerUrl,
            uploadSecret: secret,
            onProgress: (pct) => setProgress(70 + Math.round(pct * 0.28)),
          })
          videoUrl = up.url
          if (prepared.duration) duration = prepared.duration
        }
      }

      if (sceneFiles.length) {
        previewUrls = await Promise.all(
          sceneFiles.map((file) =>
            uploadMedia({
              file,
              folder: 'thumbs',
              workerUrl,
              uploadSecret: secret,
            }).then((up) => up.url),
          ),
        )
        if (previewUrls[0]) thumbnailUrl = previewUrls[0]
      }

      const payload: Video = {
        ...form,
        titleBn: text,
        titleEn: text,
        captionBn: text,
        captionEn: text,
        slug: form.slug || slugPreview,
        videoUrl,
        thumbnailUrl,
        previewUrls,
        duration,
        categoryId: form.categoryId || '',
        tagIds: form.tagIds || [],
        modelIds: form.modelIds || [],
        status: 'published',
        updatedAt: Date.now(),
        createdAt: isNew ? Date.now() : form.createdAt,
      }
      if (!payload.videoUrl) throw new Error('Select a video file')
      await db.saveVideo(payload)
      await refresh()
      navigate('/admin/videos')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const hlsMode = hlsFiles.length > 0 || isHlsUrl(form.videoUrl)

  return (
    <form onSubmit={(e) => void onSave(e)} className="mx-auto max-w-xl">
      <Seo title={isNew ? 'Upload' : 'Edit video'} />
      <h1 className="text-2xl font-bold">{isNew ? 'Upload' : 'Edit video'}</h1>
      <p className="mt-1 text-sm text-muted">
        Light prepare: remux when possible (device stays cool). Encode only for Xmaster/HEVC files — one fast pass.
      </p>
      {isNew ? (
        <p className="mt-2 text-sm">
          <Link className="text-accent" to="/admin/bulk">
            Bulk upload many videos
          </Link>
        </p>
      ) : null}
      {msg && <p className="mt-3 text-sm text-accent">{msg}</p>}

      <label className="mt-6 block text-sm">Video</label>
      <input
        className="input mt-1"
        type="file"
        multiple
        accept={`${VIDEO_ACCEPT},.m3u8,.ts,.m4s,application/vnd.apple.mpegurl`}
        onChange={(e) => {
          const files = e.target.files
          if (files?.length) void onPickFiles([...files])
        }}
      />

      <label className="mt-4 block text-sm">Caption</label>
      <textarea className="input mt-1 min-h-28" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Video caption" />

      {previewSrc || (form.videoUrl && !hlsMode) ? (
        <video
          ref={previewRef}
          className="mt-4 aspect-video w-full rounded-xl bg-black"
          muted
          playsInline
          crossOrigin={previewSrc.startsWith('blob:') ? undefined : mediaCrossOrigin(form.videoUrl || previewSrc)}
          src={previewSrc || form.videoUrl}
        />
      ) : null}
      {form.thumbnailUrl ? <img src={form.thumbnailUrl} alt="" className="mt-3 h-28 w-48 rounded-lg object-cover" /> : null}

      <button className="btn btn-primary mt-6 w-full" disabled={busy} type="submit">
        {busy ? `Processing ${progress || 0}%` : 'Publish'}
      </button>
    </form>
  )
}
