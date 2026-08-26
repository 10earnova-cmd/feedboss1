import { useState } from 'react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { slugify } from '../../lib/slug'
import { uploadMedia } from '../../lib/storage'
import type { Performer } from '../../types'

export function AdminModels() {
  const { performers, settings, refresh } = useSite()
  const [name, setName] = useState('')

  const add = async () => {
    if (!name.trim()) return
    await db.savePerformer({
      id: newId('m'),
      slug: slugify(name),
      name: name.trim(),
      bioEn: '',
      bioBn: '',
      avatarUrl: '',
    })
    setName('')
    await refresh()
  }

  const save = async (row: Performer) => {
    await db.savePerformer(row)
    await refresh()
  }

  const avatar = async (row: Performer, file: File) => {
    const workerUrl = settings.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
    const secret = settings.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''
    const up = await uploadMedia({ file, folder: 'images', workerUrl, uploadSecret: secret })
    await save({ ...row, avatarUrl: up.url })
  }

  return (
    <div>
      <Seo title="Models | Admin" />
      <h1 className="text-2xl font-bold">মডেল</h1>
      <div className="mt-4 flex gap-2">
        <input className="input max-w-xs" placeholder="নাম" value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn btn-primary" type="button" onClick={() => void add()}>
          যোগ
        </button>
      </div>
      <div className="mt-6 space-y-3">
        {performers.map((m) => (
          <div key={m.id} className="card grid gap-3 p-4 md:grid-cols-[80px_1fr_auto]">
            <div>
              {m.avatarUrl ? <img src={m.avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : <div className="h-16 w-16 rounded-full bg-raised" />}
              <input
                className="mt-2 text-xs"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void avatar(m, f)
                }}
              />
            </div>
            <div className="grid gap-2">
              <input className="input" value={m.name} onChange={(e) => void save({ ...m, name: e.target.value })} />
              <textarea className="input" placeholder="বায়ো বাংলা" value={m.bioBn} onChange={(e) => void save({ ...m, bioBn: e.target.value })} />
              <textarea className="input" placeholder="Bio English" value={m.bioEn} onChange={(e) => void save({ ...m, bioEn: e.target.value })} />
            </div>
            <button
              className="btn btn-danger h-fit"
              type="button"
              onClick={() => {
                if (confirm('ডিলিট?')) void db.deletePerformer(m.id).then(() => refresh())
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
