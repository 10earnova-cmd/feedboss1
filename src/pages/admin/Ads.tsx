import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'
import type { Ad } from '../../types'

export function AdminAds() {
  const { ads, refresh } = useSite()
  const current = ads.find((a) => a.slot === 'poster_click')

  const save = async (patch: Partial<Ad>) => {
    const row: Ad = current
      ? { ...current, ...patch }
      : {
          id: 'ad_poster',
          slot: 'poster_click',
          name: 'Poster clicks',
          type: 'direct_link',
          scriptCode: '',
          html: '',
          url: '',
          url2: '',
          url3: '',
          labelEn: '',
          labelBn: '',
          enabled: false,
          ...patch,
        }
    await db.saveAd(row)
    await refresh()
  }

  return (
    <div className="max-w-xl">
      <Seo title="Ad links | Admin" />
      <h1 className="text-2xl font-bold">Direct ad links</h1>
      <p className="mt-2 text-sm text-muted">
        Enable, then paste links. Every poster uses them: 1st click, 2nd click, 3rd click and later. Empty field = open the video.
      </p>
      <div className="card mt-6 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            checked={Boolean(current?.enabled)}
            onChange={(e) => void save({ enabled: e.target.checked, type: 'direct_link' })}
          />
          Enable poster links
        </label>
        {current?.enabled ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-xs text-muted">1st click</label>
              <input
                className="input mt-1"
                value={current?.url || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) => void save({ url: e.target.value, type: 'direct_link' })}
              />
            </div>
            <div>
              <label className="text-xs text-muted">2nd click</label>
              <input
                className="input mt-1"
                value={current?.url2 || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) => void save({ url2: e.target.value, type: 'direct_link' })}
              />
            </div>
            <div>
              <label className="text-xs text-muted">3rd click (and later)</label>
              <input
                className="input mt-1"
                value={current?.url3 || ''}
                placeholder="https://otieu.com/4/..."
                onChange={(e) => void save({ url3: e.target.value, type: 'direct_link' })}
              />
            </div>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => void save({ url: '', url2: '', url3: '', enabled: false })}>
              Remove links
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
