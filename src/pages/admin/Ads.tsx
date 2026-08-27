import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import type { Ad, AdSlot, AdType } from '../../types'

const SLOTS: { id: AdSlot; label: string; hint: string }[] = [
  {
    id: 'poster_click',
    label: 'Poster clicks (every thumbnail)',
    hint: 'First click on a poster goes to URL 1. Click 2 and every click after that goes to URL 2. Leave a field empty to open the video page instead. Turn off or clear to remove.',
  },
  { id: 'popunder', label: 'Popunder / Script', hint: 'Paste the full Monetag popunder or social bar script' },
  { id: 'header', label: 'Header banner', hint: 'HTML/banner at the top of the site' },
  { id: 'below_player', label: 'Below player', hint: 'Under the player on the watch page' },
  { id: 'sidebar', label: 'Sidebar', hint: 'Right side of the watch page' },
  { id: 'in_grid', label: 'In video grid', hint: 'Once every 8 cards' },
  { id: 'footer', label: 'Footer', hint: 'Bottom of the site' },
  { id: 'mobile_sticky', label: 'Mobile sticky bar', hint: 'Fixed bar on mobile — direct link works well' },
  { id: 'watch_cta', label: 'Watch CTA (Direct link)', hint: 'Monetag direct URL — full video button' },
  { id: 'download_cta', label: 'Download CTA (Direct link)', hint: 'Monetag direct URL — download button' },
]

const STABLE_IDS: Partial<Record<AdSlot, string>> = {
  poster_click: 'ad_poster',
}

export function AdminAds() {
  const { ads, refresh } = useSite()

  const bySlot = (slot: AdSlot) => ads.find((a) => a.slot === slot)

  const upsert = async (slot: AdSlot, patch: Partial<Ad>) => {
    const current = bySlot(slot)
    const row: Ad = current
      ? { ...current, ...patch }
      : {
          id: STABLE_IDS[slot] || newId('ad'),
          slot,
          name: slot,
          type: 'direct_link',
          scriptCode: '',
          html: '',
          url: '',
          url2: '',
          labelEn: '',
          labelBn: '',
          enabled: false,
          ...patch,
        }
    await db.saveAd(row)
    await refresh()
  }

  return (
    <div>
      <Seo title="Monetag Ads | Admin" />
      <h1 className="text-2xl font-bold">Monetag ads</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Poster clicks apply to every thumbnail. Direct-link buttons show on the public site as Full HD / Download.
      </p>
      <div className="mt-6 space-y-4">
        {SLOTS.map((s) => {
          const ad = bySlot(s.id)
          const type = (ad?.type ||
            (s.id === 'poster_click' || s.id.includes('cta') || s.id === 'mobile_sticky'
              ? 'direct_link'
              : s.id === 'popunder'
                ? 'script'
                : 'html')) as AdType
          const poster = s.id === 'poster_click'
          return (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{s.label}</h2>
                  <p className="text-xs text-muted">{s.hint}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {poster ? (
                    <button
                      type="button"
                      className="btn btn-ghost text-sm"
                      onClick={() => void upsert(s.id, { url: '', url2: '', enabled: false, type: 'direct_link' })}
                    >
                      Remove links
                    </button>
                  ) : null}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={Boolean(ad?.enabled)} onChange={(e) => void upsert(s.id, { enabled: e.target.checked, type })} />
                    Enabled
                  </label>
                </div>
              </div>
              {poster ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted">1st click URL</label>
                    <input
                      className="input mt-1"
                      value={ad?.url || ''}
                      placeholder="https://otieu.com/4/FIRST_ZONE"
                      onChange={(e) => void upsert(s.id, { url: e.target.value, type: 'direct_link' })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">2nd and later clicks URL</label>
                    <input
                      className="input mt-1"
                      value={ad?.url2 || ''}
                      placeholder="https://otieu.com/4/NEXT_ZONE or leave empty for video page"
                      onChange={(e) => void upsert(s.id, { url2: e.target.value, type: 'direct_link' })}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted">Type</label>
                    <select className="input mt-1" value={type} onChange={(e) => void upsert(s.id, { type: e.target.value as AdType })}>
                      <option value="direct_link">Direct link (Monetag)</option>
                      <option value="html">HTML / banner</option>
                      <option value="script">Script</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Direct URL</label>
                    <input
                      className="input mt-1"
                      value={ad?.url || ''}
                      placeholder="https://otieu.com/4/1234567"
                      onChange={(e) => void upsert(s.id, { url: e.target.value, type })}
                    />
                  </div>
                  <input
                    className="input"
                    placeholder="Button label (Bangla, public site)"
                    value={ad?.labelBn || ''}
                    onChange={(e) => void upsert(s.id, { labelBn: e.target.value, type })}
                  />
                  <input
                    className="input"
                    placeholder="Button label English"
                    value={ad?.labelEn || ''}
                    onChange={(e) => void upsert(s.id, { labelEn: e.target.value, type })}
                  />
                  <textarea
                    className="input min-h-24 md:col-span-2"
                    placeholder={type === 'script' ? '<script>...</script>' : '<div>banner html</div>'}
                    value={type === 'script' ? ad?.scriptCode || '' : ad?.html || ''}
                    onChange={(e) =>
                      void upsert(s.id, type === 'script' ? { scriptCode: e.target.value, type } : { html: e.target.value, type })
                    }
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
