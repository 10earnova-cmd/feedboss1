import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { Seo } from '../../components/Seo'
import { VideoThumb } from '../../components/VideoThumb'
import { useSite } from '../../context/SiteContext'
import { usablePoster } from '../../lib/media'
import { db } from '../../lib/db'

export function AdminVideos() {
  const { videos, refresh } = useSite()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const list = useMemo(() => {
    const needle = q.toLowerCase()
    return videos.filter((v) => `${v.titleBn} ${v.titleEn} ${v.captionBn}`.toLowerCase().includes(needle))
  }, [videos, q])

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
        <Link to="/admin" className="btn btn-primary">
          Upload
        </Link>
      </div>
      <input className="input mt-4 max-w-sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Thumb</th>
              <th className="p-3">Caption</th>
              <th className="p-3">Views</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {list.map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="p-3">
                  <div className="h-12 w-20 overflow-hidden rounded">
                    <VideoThumb src={v.videoUrl} poster={usablePoster(v.thumbnailUrl)} scenes={v.previewUrls} preview={false} />
                  </div>
                </td>
                <td className="p-3">
                  <div className="font-semibold">{v.titleBn || v.titleEn}</div>
                </td>
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
