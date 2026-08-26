import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'
import type { VideoStatus } from '../../types'

export function AdminVideos() {
  const { videos, categories, refresh } = useSite()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<VideoStatus | 'all'>('all')
  const [busy, setBusy] = useState<string | null>(null)

  const list = useMemo(() => {
    return videos.filter((v) => {
      const okQ = `${v.titleBn} ${v.titleEn}`.toLowerCase().includes(q.toLowerCase())
      const okS = status === 'all' || v.status === status
      return okQ && okS
    })
  }, [videos, q, status])

  const remove = async (id: string) => {
    if (!confirm('Delete this video?')) return
    setBusy(id)
    await db.deleteVideo(id)
    await refresh()
    setBusy(null)
  }

  return (
    <div>
      <Seo title="Videos | Admin" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Videos</h1>
        <Link to="/admin/videos/new" className="btn btn-primary">
          New upload
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <input className="input max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
        <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value as VideoStatus | 'all')}>
          <option value="all">All status</option>
          <option value="published">published</option>
          <option value="draft">draft</option>
          <option value="hidden">hidden</option>
        </select>
      </div>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Thumb</th>
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">Status</th>
              <th className="p-3">Views</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((v) => {
              const cat = categories.find((c) => c.id === v.categoryId)
              return (
                <tr key={v.id} className="border-t border-line">
                  <td className="p-3">
                    <img src={v.thumbnailUrl} alt="" className="h-12 w-20 rounded object-cover" />
                  </td>
                  <td className="p-3">
                    <div className="font-semibold">{v.titleEn || v.titleBn}</div>
                    <div className="text-xs text-muted">{v.titleBn}</div>
                  </td>
                  <td className="p-3">{cat?.nameEn || cat?.nameBn}</td>
                  <td className="p-3">{v.status}</td>
                  <td className="p-3">{v.views}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Link className="btn btn-ghost" to={`/admin/videos/${v.id}`}>
                        Edit
                      </Link>
                      <button className="btn btn-danger" type="button" disabled={busy === v.id} onClick={() => void remove(v.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
