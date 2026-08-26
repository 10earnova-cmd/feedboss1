import { useState } from 'react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import { slugify } from '../../lib/slug'

export function AdminTags() {
  const { tags, refresh } = useSite()
  const [nameBn, setNameBn] = useState('')
  const [nameEn, setNameEn] = useState('')

  const add = async () => {
    if (!nameBn && !nameEn) return
    await db.saveTag({
      id: newId('tag'),
      slug: slugify(nameEn || nameBn),
      nameEn: nameEn || nameBn,
      nameBn: nameBn || nameEn,
    })
    setNameBn('')
    setNameEn('')
    await refresh()
  }

  return (
    <div>
      <Seo title="Tags | Admin" />
      <h1 className="text-2xl font-bold">Tags</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Bangla (public)" value={nameBn} onChange={(e) => setNameBn(e.target.value)} />
        <input className="input max-w-xs" placeholder="English" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
        <button className="btn btn-primary" type="button" onClick={() => void add()}>
          Add
        </button>
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        {tags.map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-full border border-line px-3 py-1">
            <span>#{t.nameEn || t.nameBn}</span>
            <button
              className="text-accent"
              type="button"
              onClick={() => {
                if (confirm('Delete?')) void db.deleteTag(t.id).then(() => refresh())
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
