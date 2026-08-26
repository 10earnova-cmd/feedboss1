import { useState } from 'react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { slugify } from '../../lib/slug'
import { uploadMedia } from '../../lib/storage'
import type { Category } from '../../types'

export function AdminCategories() {
  const { categories, settings, refresh } = useSite()
  const [nameBn, setNameBn] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [msg, setMsg] = useState('')

  const save = async (row: Category) => {
    await db.saveCategory(row)
    await refresh()
  }

  const add = async () => {
    if (!nameBn && !nameEn) return
    await save({
      id: newId('cat'),
      slug: slugify(nameEn || nameBn),
      nameEn: nameEn || nameBn,
      nameBn: nameBn || nameEn,
      descriptionEn: '',
      descriptionBn: '',
      thumbnailUrl: '',
      order: categories.length + 1,
    })
    setNameBn('')
    setNameEn('')
  }

  const uploadThumb = async (row: Category, file: File) => {
    try {
      const workerUrl = settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
      const secret = settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''
      const up = await uploadMedia({ file, folder: 'images', workerUrl, uploadSecret: secret })
      await save({ ...row, thumbnailUrl: up.url })
      setMsg('')
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  return (
    <div>
      <Seo title="Categories | Admin" />
      <h1 className="text-2xl font-bold">Categories</h1>
      {msg && <p className="mt-2 text-sm text-accent">{msg}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Bangla name (public)" value={nameBn} onChange={(e) => setNameBn(e.target.value)} />
        <input className="input max-w-xs" placeholder="English name" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <button className="btn btn-primary" type="button" onClick={() => void add()}>
          Add
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {categories.map((c) => (
          <div key={c.id} className="card grid gap-3 p-4 md:grid-cols-[120px_1fr_auto]">
            <div>
              {c.thumbnailUrl ? <img src={c.thumbnailUrl} alt="" className="h-20 w-full rounded object-cover" /> : <div className="grid h-20 place-items-center rounded bg-raised text-xs text-muted">thumb</div>}
              <input
                className="mt-2 text-xs"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void uploadThumb(c, f)
                }}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" value={c.nameBn} onChange={(e) => void save({ ...c, nameBn: e.target.value })} />
              <input className="input" value={c.nameEn} onChange={(e) => void save({ ...c, nameEn: e.target.value })} />
              <input className="input sm:col-span-2" value={c.slug} onChange={(e) => void save({ ...c, slug: e.target.value })} />
            </div>
            <button
              className="btn btn-danger h-fit"
              type="button"
              onClick={() => {
                if (confirm('Delete?')) void db.deleteCategory(c.id).then(() => refresh())
              }}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
