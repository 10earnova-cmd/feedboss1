import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db, newId } from '../../lib/db'
import type { Ad, AdSlot, AdType } from '../../types'

const SLOTS: { id: AdSlot; label: string; hint: string }[] = [
  { id: 'popunder', label: 'Popunder / Script', hint: 'Monetag popunder বা social bar JS পুরো পেস্ট করুন' },
  { id: 'header', label: 'Header banner', hint: 'সাইটের উপরে HTML/banner' },
  { id: 'below_player', label: 'প্লেয়ারের নিচে', hint: 'Watch পেজে প্লেয়ারের নিচে' },
  { id: 'sidebar', label: 'সাইডবার', hint: 'Watch পেজ ডান পাশে' },
  { id: 'in_grid', label: 'ভিডিও গ্রিড মাঝে', hint: 'প্রতি ৮টা কার্ডে একবার' },
  { id: 'footer', label: 'ফুটার', hint: 'সাইটের নিচে' },
  { id: 'mobile_sticky', label: 'মোবাইল স্টিকি বার', hint: 'মোবাইলে নিচে ফিক্সড — direct link ভালো' },
  { id: 'watch_cta', label: 'Watch CTA (Direct link)', hint: 'Monetag direct URL — ফুল ভিডিও বাটন' },
  { id: 'download_cta', label: 'Download CTA (Direct link)', hint: 'Monetag direct URL — ডাউনলোড বাটন' },
]

export function AdminAds() {
  const { ads, refresh } = useSite()

  const bySlot = (slot: AdSlot) => ads.find((a) => a.slot === slot)

  const upsert = async (slot: AdSlot, patch: Partial<Ad>) => {
    const current = bySlot(slot)
    const row: Ad = current
      ? { ...current, ...patch }
      : {
          id: newId('ad'),
          slot,
          name: slot,
          type: 'direct_link',
          scriptCode: '',
          html: '',
          url: '',
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
      <h1 className="text-2xl font-bold">Monetag অ্যাডস</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted">
        Monetag ড্যাশবোর্ড থেকে Direct Link (otieu.com/4/ZONE) বা Script নিয়ে এখানে পেস্ট করুন। Direct link বাটন ইউজার সাইটে ফুল HD / ডাউনলোড হিসেবে দেখাবে।
      </p>
      <div className="mt-6 space-y-4">
        {SLOTS.map((s) => {
          const ad = bySlot(s.id)
          const type = (ad?.type || (s.id.includes('cta') || s.id === 'mobile_sticky' ? 'direct_link' : s.id === 'popunder' ? 'script' : 'html')) as AdType
          return (
            <div key={s.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{s.label}</h2>
                  <p className="text-xs text-muted">{s.hint}</p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={Boolean(ad?.enabled)} onChange={(e) => void upsert(s.id, { enabled: e.target.checked, type })} />
                  চালু
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs text-muted">টাইপ</label>
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
                  placeholder="বাটন লেবেল বাংলা"
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
            </div>
          )
        })}
      </div>
    </div>
  )
}
