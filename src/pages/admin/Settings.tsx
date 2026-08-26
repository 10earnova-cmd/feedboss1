import { useEffect, useState } from 'react'
import { Seo } from '../../components/Seo'
import { useSite } from '../../context/SiteContext'
import { db } from '../../lib/db'
import { firebaseEnabled } from '../../lib/firebase'
import { uploadMedia } from '../../lib/storage'
import type { SiteSettings } from '../../types'

export function AdminSettings() {
  const { settings, refresh } = useSite()
  const [form, setForm] = useState<SiteSettings>(settings)

  useEffect(() => {
    void db.getPrivateSettings().then((p) => {
      setForm((f) => ({ ...f, uploadSecret: p.uploadSecret || f.uploadSecret }))
    })
  }, [])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => setForm({ ...form, [key]: value })

  const save = async () => {
    setBusy(true)
    await db.saveSettings(form)
    await refresh()
    setBusy(false)
    setMsg('সেভ হয়েছে')
  }

  const seed = async () => {
    if (!confirm('ডিফল্ট ক্যাটাগরি/ট্যাগ/ডেমো ভিডিও লোড হবে। চালিয়ে যাবেন?')) return
    await db.seedDefaults()
    await refresh()
    setMsg('ডিফল্ট ডেটা লোড হয়েছে')
  }

  const logo = async (file: File) => {
    const workerUrl = form.workerUrl || import.meta.env.VITE_R2_WORKER_URL || '/api'
    const secret = form.uploadSecret || import.meta.env.VITE_R2_UPLOAD_SECRET || ''
    const up = await uploadMedia({ file, folder: 'images', workerUrl, uploadSecret: secret })
    set('logoUrl', up.url)
  }

  return (
    <div className="max-w-4xl">
      <Seo title="Settings | Admin" />
      <h1 className="text-2xl font-bold">সেটিংস</h1>
      <p className="mt-1 text-sm text-muted">
        ডেটা স্টোর: {firebaseEnabled ? 'Firebase Firestore চালু' : 'লোকাল ডেমো (localStorage) — .env এ Firebase চাবি দিন'}
      </p>
      {msg && <p className="mt-2 text-sm text-gold">{msg}</p>}

      <h2 className="mt-8 mb-3 font-bold">সাইট</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="input" value={form.siteNameBn} onChange={(e) => set('siteNameBn', e.target.value)} placeholder="নাম বাংলা" />
        <input className="input" value={form.siteNameEn} onChange={(e) => set('siteNameEn', e.target.value)} placeholder="Name English" />
        <input className="input md:col-span-2" value={form.taglineBn} onChange={(e) => set('taglineBn', e.target.value)} placeholder="ট্যাগলাইন বাংলা" />
        <input className="input md:col-span-2" value={form.taglineEn} onChange={(e) => set('taglineEn', e.target.value)} placeholder="Tagline English" />
        <input className="input" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} placeholder="Email" />
        <input className="input" value={form.telegram} onChange={(e) => set('telegram', e.target.value)} placeholder="Telegram URL" />
        <input className="input md:col-span-2" value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="Logo URL" />
        <input
          className="md:col-span-2 text-sm"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void logo(f)
          }}
        />
      </div>

      <h2 className="mt-8 mb-3 font-bold">Cloudflare R2 স্টোরেজ</h2>
      <p className="mb-2 text-xs text-muted">Bucket `feedboss` .env দিয়ে কানেক্ট। লোকালে Worker URL `/api` রাখুন — Vite proxy R2 তে আপলোড করে।</p>
      <div className="grid gap-3">
        <input className="input" value={form.workerUrl} onChange={(e) => set('workerUrl', e.target.value)} placeholder="/api" />
        <input className="input" value={form.r2PublicBase} onChange={(e) => set('r2PublicBase', e.target.value)} placeholder="https://cdn.yourdomain.com" />
        <input className="input" value={form.uploadSecret} onChange={(e) => set('uploadSecret', e.target.value)} placeholder="UPLOAD_SECRET (worker এর সাথে মিলবে)" />
      </div>

      <h2 className="mt-8 mb-3 font-bold">Monetag</h2>
      <input className="input" value={form.monetagSiteId} onChange={(e) => set('monetagSiteId', e.target.value)} placeholder="Monetag Site / Zone ID (নোট)" />
      <p className="mt-1 text-xs text-muted">আসল স্ক্রিপ্ট ও ডirect লিংক Ads মেনুতে পেস্ট করুন।</p>

      <h2 className="mt-8 mb-3 font-bold">লিগ্যাল টেক্সট</h2>
      <label className="text-xs text-muted">Age gate বাংলা</label>
      <textarea className="input mt-1 min-h-20" value={form.ageGateBn} onChange={(e) => set('ageGateBn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">Age gate English</label>
      <textarea className="input mt-1 min-h-20" value={form.ageGateEn} onChange={(e) => set('ageGateEn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">About BN / EN</label>
      <textarea className="input mt-1 min-h-20" value={form.aboutBn} onChange={(e) => set('aboutBn', e.target.value)} />
      <textarea className="input mt-1 min-h-20" value={form.aboutEn} onChange={(e) => set('aboutEn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">Terms BN / EN</label>
      <textarea className="input mt-1 min-h-20" value={form.termsBn} onChange={(e) => set('termsBn', e.target.value)} />
      <textarea className="input mt-1 min-h-20" value={form.termsEn} onChange={(e) => set('termsEn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">Privacy BN / EN</label>
      <textarea className="input mt-1 min-h-20" value={form.privacyBn} onChange={(e) => set('privacyBn', e.target.value)} />
      <textarea className="input mt-1 min-h-20" value={form.privacyEn} onChange={(e) => set('privacyEn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">DMCA BN / EN</label>
      <textarea className="input mt-1 min-h-20" value={form.dmcaBn} onChange={(e) => set('dmcaBn', e.target.value)} />
      <textarea className="input mt-1 min-h-20" value={form.dmcaEn} onChange={(e) => set('dmcaEn', e.target.value)} />
      <label className="mt-3 block text-xs text-muted">2257 BN / EN</label>
      <textarea className="input mt-1 min-h-20" value={form.statement2257Bn} onChange={(e) => set('statement2257Bn', e.target.value)} />
      <textarea className="input mt-1 min-h-20" value={form.statement2257En} onChange={(e) => set('statement2257En', e.target.value)} />

      <div className="mt-6 flex flex-wrap gap-2">
        <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save()}>
          সেটিংস সেভ
        </button>
        <button className="btn btn-ghost" type="button" onClick={() => void seed()}>
          ডিফল্ট ডেটা লোড
        </button>
      </div>
    </div>
  )
}
