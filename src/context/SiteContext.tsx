import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../lib/db'
import { defaultSettings } from '../lib/seed'
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
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
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
    } catch (err) {
      console.warn('Realtime Database load failed', err)
      setSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const published = useMemo(() => videos.filter((v) => v.status === 'published'), [videos])

  const value = useMemo(
    () => ({ loading, settings, videos, categories, tags, performers, ads, refresh, published }),
    [loading, settings, videos, categories, tags, performers, ads, refresh, published],
  )

  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>
}

export function useSite() {
  const ctx = useContext(SiteContext)
  if (!ctx) throw new Error('useSite')
  return ctx
}
