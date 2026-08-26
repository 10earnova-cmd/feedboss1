import { Link } from 'react-router-dom'
import { Clapperboard, Eye, Film, Upload } from 'lucide-react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { formatViews } from '../../lib/format'

export function AdminDashboard() {
  const { videos, published, categories } = useSite()
  const views = videos.reduce((s, v) => s + v.views, 0)
  const stats = [
    { label: 'Total videos', value: videos.length, icon: Film },
    { label: 'Published', value: published.length, icon: Clapperboard },
    { label: 'Total views', value: formatViews(views, 'en'), icon: Eye },
    { label: 'Categories', value: categories.length, icon: Upload },
  ]

  return (
    <div>
      <Seo title="Dashboard | Admin" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link to="/admin/videos/new" className="btn btn-primary">
          New video
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-4">
            <s.icon className="h-5 w-5 text-accent" />
            <p className="mt-3 text-2xl font-extrabold">{s.value}</p>
            <p className="text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-10 mb-3 font-bold">Recent videos</h2>
      <div className="overflow-x-auto card">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Status</th>
              <th className="p-3">Views</th>
            </tr>
          </thead>
          <tbody>
            {videos.slice(0, 8).map((v) => (
              <tr key={v.id} className="border-t border-line">
                <td className="p-3">
                  <Link className="hover:text-accent" to={`/admin/videos/${v.id}`}>
                    {v.titleBn || v.titleEn}
                  </Link>
                </td>
                <td className="p-3">{v.status}</td>
                <td className="p-3">{v.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
