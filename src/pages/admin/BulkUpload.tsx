import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'
import { captionFromFilename, isBulkVideoFile, publishVideoFile } from '../../lib/publishVideo'
import { VIDEO_ACCEPT } from '../../lib/media'

type Row = {
  id: string
  file: File
  caption: string
  status: 'queued' | 'working' | 'done' | 'error'
  progress: number
  error: string
}

function rowId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}`
}

export function BulkUpload() {
  const { videos, settings, refresh } = useSite()
  const [rows, setRows] = useState<Row[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const taken = useRef<string[]>([])

  const queued = rows.filter((r) => r.status === 'queued' || r.status === 'error').length
  const done = rows.filter((r) => r.status === 'done').length
  const working = rows.filter((r) => r.status === 'working')

  const summary = useMemo(() => {
    if (!rows.length) return ''
    const names = working.map((w) => w.file.name).join(', ')
    return `${done}/${rows.length} published${names ? ` · now ${names}` : ''}`
  }, [rows, done, working])

  const addFiles = (list: File[]) => {
    const videosOnly = list.filter(isBulkVideoFile)
    const skipped = list.length - videosOnly.length
    setRows((prev) => {
      const have = new Set(prev.map((r) => r.id))
      const extra: Row[] = []
      for (const file of videosOnly) {
        const id = rowId(file)
        if (have.has(id)) continue
        have.add(id)
        extra.push({ id, file, caption: captionFromFilename(file), status: 'queued', progress: 0, error: '' })
      }
      return [...prev, ...extra]
    })
    setMsg(skipped ? `${skipped} file(s) skipped — not a video` : '')
  }

  const patch = (id: string, next: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)))
  }

  const start = async () => {
    const pending = rows.filter((r) => r.status === 'queued' || r.status === 'error')
    if (!pending.length) {
      setMsg('Select videos first')
      return
    }
    if (pending.some((r) => !r.caption.trim())) {
      setMsg('Every video needs a caption')
      return
    }
    setBusy(true)
    setMsg('')
    taken.current = [...new Set([...videos.map((v) => v.slug), ...taken.current])]
    const workerUrl = settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
    const priv = await db.getPrivateSettings()
    const secret = priv.uploadSecret || settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''

    // Transcode is serialized inside ffmpeg lock; keep 2 slots so next file can prep thumbs/upload wait.
    const CONCURRENCY = 2
    let ok = 0
    let fail = 0
    let cursor = 0

    const runOne = async (row: (typeof pending)[number]) => {
      patch(row.id, { status: 'working', progress: 1, error: '' })
      try {
        const saved = await publishVideoFile({
          file: row.file,
          caption: row.caption,
          workerUrl,
          uploadSecret: secret,
          slugTaken: taken.current,
          onProgress: (pct) => patch(row.id, { progress: pct, status: 'working' }),
        })
        taken.current.push(saved.slug)
        patch(row.id, { status: 'done', progress: 100 })
        ok += 1
      } catch (err) {
        fail += 1
        patch(row.id, {
          status: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : 'Upload failed',
        })
      }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, pending.length) }, async () => {
      while (cursor < pending.length) {
        const i = cursor
        cursor += 1
        await runOne(pending[i])
      }
    })
    await Promise.all(workers)
    await refresh()
    setBusy(false)
    setMsg(`${ok} published${fail ? `, ${fail} failed` : ''}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Seo title="Bulk upload | Admin" />
      <h1 className="text-2xl font-bold">Bulk upload</h1>
      <p className="mt-1 text-sm text-muted">
        Light prepare on this device (remux first). Heavy compress only when the file needs it, then upload.
      </p>
      <p className="mt-2 text-sm">
        <Link className="text-accent" to="/admin">
          Single upload
        </Link>
      </p>
      {msg ? <p className="mt-3 text-sm text-accent">{msg}</p> : null}
      {summary ? <p className="mt-1 text-xs text-muted">{summary}</p> : null}

      <label
        className="card mt-6 grid min-h-36 cursor-pointer place-items-center p-6 text-center text-sm text-muted"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          addFiles([...e.dataTransfer.files])
        }}
      >
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          multiple
          accept={VIDEO_ACCEPT}
          onChange={(e) => {
            const files = e.target.files
            if (files?.length) addFiles([...files])
            e.target.value = ''
          }}
        />
        Drop any videos here, or click to pick many files
      </label>

      {rows.length > 0 ? (
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted">{row.file.name}</p>
                  <input
                    className="input mt-1"
                    value={row.caption}
                    disabled={busy && row.status !== 'queued'}
                    onChange={(e) => patch(row.id, { caption: e.target.value })}
                    placeholder="Caption"
                  />
                  {row.status === 'working' ? (
                    <div className="bulk-bar mt-2">
                      <span style={{ width: `${row.progress}%` }} />
                    </div>
                  ) : null}
                  {row.status === 'done' ? <p className="mt-1 text-xs text-muted">Published</p> : null}
                  {row.error ? <p className="mt-1 text-xs text-accent">{row.error}</p> : null}
                </div>
                {row.status === 'queued' || row.status === 'error' ? (
                  <button
                    className="btn btn-ghost text-xs"
                    type="button"
                    disabled={busy}
                    onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" disabled={busy || !queued} onClick={() => void start()}>
          {busy ? `Uploading…` : `Publish ${queued} video${queued === 1 ? '' : 's'}`}
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setRows((prev) => prev.filter((r) => r.status !== 'done'))
            setMsg('')
          }}
        >
          Clear published
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          disabled={busy}
          onClick={() => {
            setRows([])
            setMsg('')
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
