import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../lib/db'
import type { Ad, Category, Performer, SiteSettings, Tag, Video } from '../types'

type Ctx = {
  loading: boolean
  settings: SiteSettings
  videos: Video[]
  categories: Category[]
  tags: Tag[]
  performers: Performer[]
  ads: Ad[]
  refresh: () => Promise<void>
  published: Video[]
}

const SiteContext = createContext<Ctx | null>(null)

export function SiteProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [performers, setPerformers] = useState<Performer[]>([])
  const [ads, setAds] = useState<Ad[]>([])

  const refresh = useCallback(async () => {
    try {
      const [s, v, c, t, p, a] = await Promise.all([
        db.getSettings(),
        db.listVideos(),
        db.listCategories(),
        db.listTags(),
        db.listPerformers(),
        db.listAds(),
      ])
      setSettings(s)
      setVideos(v)
      setCategories(c)
      setTags(t)
      setPerformers(p)
      setAds(a)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Firebase/Firestore load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const published = useMemo(() => videos.filter((v) => v.status === 'published'), [videos])

  const value = useMemo(() => {
    if (!settings) return null
    return { loading, settings, videos, categories, tags, performers, ads, refresh, published }
  }, [loading, settings, videos, categories, tags, performers, ads, refresh, published])

  if (!value) {
    return (
      <div className="grid min-h-svh place-items-center bg-ink px-4 text-white">
        {error ? (
          <div className="card max-w-lg p-6">
            <h1 className="text-xl font-bold">Firebase কানেক্ট হয়নি</h1>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted">
              <li>Firebase Console → Firestore Database তৈরি করুন (start in test/production mode)</li>
              <li>Authentication → Email/Password চালু করুন</li>
              <li>Firestore Rules এ প্রজেক্টের firestore.rules পেস্ট করে Publish করুন</li>
            </ol>
          </div>
        ) : (
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>
    )
  }

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite')
  return ctx
}
