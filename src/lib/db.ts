import { get, increment, ref, remove, set, update } from 'firebase/database'
import { firebaseEnabled, rtdb } from './firebase'
import { defaultAds, defaultCategories, defaultPerformers, defaultSettings, defaultTags, defaultVideos, applyLegalCopy } from './seed'
import type { Ad, Category, Performer, SiteSettings, Tag, Video } from '../types'

const KEYS = {
  videos: 'deshix_videos',
  categories: 'deshix_categories',
  tags: 'deshix_tags',
  performers: 'deshix_performers',
  ads: 'deshix_ads',
  settings: 'deshix_settings',
} as const

function readLs<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeLs<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function ensureLocalSeed() {
  if (!localStorage.getItem(KEYS.categories)) writeLs(KEYS.categories, defaultCategories)
  if (!localStorage.getItem(KEYS.tags)) writeLs(KEYS.tags, defaultTags)
  if (!localStorage.getItem(KEYS.performers)) writeLs(KEYS.performers, defaultPerformers)
  if (!localStorage.getItem(KEYS.videos)) writeLs(KEYS.videos, defaultVideos())
  if (!localStorage.getItem(KEYS.ads)) writeLs(KEYS.ads, defaultAds())
  if (!localStorage.getItem(KEYS.settings)) writeLs(KEYS.settings, defaultSettings)
}

function clean(value: unknown): unknown {
  if (value === undefined) return null
  if (Array.isArray(value)) return value.map(clean)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue
      out[k] = clean(v)
    }
    return out
  }
  return value
}

function mapRows<T extends { id: string }>(raw: unknown): T[] {
  if (!raw || typeof raw !== 'object') return []
  return Object.entries(raw as Record<string, object>).map(([id, row]) => ({ id, ...row }) as T)
}

async function timedGet(path: string) {
  if (!rtdb) return null
  const work = get(ref(rtdb, path))
  const winner = await Promise.race([
    work.then((snap) => ({ ok: true as const, snap })),
    new Promise<{ ok: false }>((resolve) => {
      setTimeout(() => resolve({ ok: false }), 4000)
    }),
  ])
  if (!winner.ok) return null
  return winner.snap.val()
}

async function listPath<T extends { id: string }>(path: string): Promise<T[]> {
  return mapRows<T>(await timedGet(path))
}

async function putPath(path: string, data: Record<string, unknown>) {
  if (!rtdb) return
  await set(ref(rtdb, path), clean(data))
}

const remote = () => Boolean(firebaseEnabled && rtdb)

export const db = {
  async listVideos(): Promise<Video[]> {
    if (remote()) {
      return (await listPath<Video>('videos')).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    }
    ensureLocalSeed()
    return readLs<Video[]>(KEYS.videos, []).sort((a, b) => b.createdAt - a.createdAt)
  },

  async saveVideo(video: Video) {
    if (remote()) {
      await putPath(`videos/${video.id}`, video as unknown as Record<string, unknown>)
      return
    }
    ensureLocalSeed()
    const all = readLs<Video[]>(KEYS.videos, [])
    const i = all.findIndex((v) => v.id === video.id)
    if (i >= 0) all[i] = video
    else all.unshift(video)
    writeLs(KEYS.videos, all)
  },

  async deleteVideo(id: string) {
    if (remote() && rtdb) {
      await remove(ref(rtdb, `videos/${id}`))
      return
    }
    writeLs(
      KEYS.videos,
      readLs<Video[]>(KEYS.videos, []).filter((v) => v.id !== id),
    )
  },

  async bumpViews(id: string) {
    try {
      if (remote() && rtdb) {
        await update(ref(rtdb, `videos/${id}`), { views: increment(1) })
        return
      }
      const all = readLs<Video[]>(KEYS.videos, [])
      writeLs(
        KEYS.videos,
        all.map((v) => (v.id === id ? { ...v, views: v.views + 1 } : v)),
      )
    } catch {
      /* public increment may be blocked until rules are published */
    }
  },

  async bumpLikes(id: string) {
    try {
      if (remote() && rtdb) {
        await update(ref(rtdb, `videos/${id}`), { likes: increment(1) })
        return
      }
      const all = readLs<Video[]>(KEYS.videos, [])
      writeLs(
        KEYS.videos,
        all.map((v) => (v.id === id ? { ...v, likes: v.likes + 1 } : v)),
      )
    } catch {
      /* public increment may be blocked until rules are published */
    }
  },

  async listCategories(): Promise<Category[]> {
    if (remote()) return (await listPath<Category>('categories')).sort((a, b) => (a.order || 0) - (b.order || 0))
    ensureLocalSeed()
    return readLs<Category[]>(KEYS.categories, []).sort((a, b) => a.order - b.order)
  },

  async saveCategory(row: Category) {
    if (remote()) {
      await putPath(`categories/${row.id}`, row as unknown as Record<string, unknown>)
      return
    }
    const all = readLs<Category[]>(KEYS.categories, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.categories, all)
  },

  async deleteCategory(id: string) {
    if (remote() && rtdb) {
      await remove(ref(rtdb, `categories/${id}`))
      return
    }
    writeLs(
      KEYS.categories,
      readLs<Category[]>(KEYS.categories, []).filter((x) => x.id !== id),
    )
  },

  async listTags(): Promise<Tag[]> {
    if (remote()) return listPath<Tag>('tags')
    ensureLocalSeed()
    return readLs<Tag[]>(KEYS.tags, [])
  },

  async saveTag(row: Tag) {
    if (remote()) {
      await putPath(`tags/${row.id}`, row as unknown as Record<string, unknown>)
      return
    }
    const all = readLs<Tag[]>(KEYS.tags, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.tags, all)
  },

  async deleteTag(id: string) {
    if (remote() && rtdb) {
      await remove(ref(rtdb, `tags/${id}`))
      return
    }
    writeLs(
      KEYS.tags,
      readLs<Tag[]>(KEYS.tags, []).filter((x) => x.id !== id),
    )
  },

  async listPerformers(): Promise<Performer[]> {
    if (remote()) return listPath<Performer>('performers')
    ensureLocalSeed()
    return readLs<Performer[]>(KEYS.performers, [])
  },

  async savePerformer(row: Performer) {
    if (remote()) {
      await putPath(`performers/${row.id}`, row as unknown as Record<string, unknown>)
      return
    }
    const all = readLs<Performer[]>(KEYS.performers, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.performers, all)
  },

  async deletePerformer(id: string) {
    if (remote() && rtdb) {
      await remove(ref(rtdb, `performers/${id}`))
      return
    }
    writeLs(
      KEYS.performers,
      readLs<Performer[]>(KEYS.performers, []).filter((x) => x.id !== id),
    )
  },

  async listAds(): Promise<Ad[]> {
    if (remote()) return listPath<Ad>('ads')
    ensureLocalSeed()
    return readLs<Ad[]>(KEYS.ads, [])
  },

  async saveAd(row: Ad) {
    if (remote()) {
      await putPath(`ads/${row.id}`, row as unknown as Record<string, unknown>)
      return
    }
    const all = readLs<Ad[]>(KEYS.ads, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.ads, all)
  },

  async deleteAd(id: string) {
    if (remote() && rtdb) {
      await remove(ref(rtdb, `ads/${id}`))
      return
    }
    writeLs(
      KEYS.ads,
      readLs<Ad[]>(KEYS.ads, []).filter((x) => x.id !== id),
    )
  },

  async getSettings(): Promise<SiteSettings> {
    if (remote() && rtdb) {
      const data = ((await timedGet('settings/site')) || {}) as Partial<SiteSettings>
      return applyLegalCopy({ ...defaultSettings, ...data, uploadSecret: '' })
    }
    ensureLocalSeed()
    return applyLegalCopy({ ...defaultSettings, ...readLs<SiteSettings>(KEYS.settings, defaultSettings) })
  },

  async getPrivateSettings(): Promise<{ uploadSecret: string }> {
    if (remote() && rtdb) {
      const data = ((await timedGet('settings/private')) || {}) as { uploadSecret?: string }
      return { uploadSecret: String(data.uploadSecret || '') }
    }
    const s = readLs<SiteSettings>(KEYS.settings, defaultSettings)
    return { uploadSecret: s.uploadSecret || '' }
  },

  async saveSettings(row: SiteSettings) {
    if (remote()) {
      const { uploadSecret, ...publicRow } = row
      await putPath('settings/site', publicRow as unknown as Record<string, unknown>)
      await putPath('settings/private', { uploadSecret: uploadSecret || '' })
      return
    }
    writeLs(KEYS.settings, row)
  },

  async seedDefaults() {
    if (remote()) {
      for (const row of defaultCategories) await this.saveCategory(row)
      for (const row of defaultTags) await this.saveTag(row)
      for (const row of defaultPerformers) await this.savePerformer(row)
      for (const row of defaultVideos()) await this.saveVideo(row)
      for (const row of defaultAds()) await this.saveAd(row)
      await this.saveSettings(defaultSettings)
      return
    }
    writeLs(KEYS.categories, defaultCategories)
    writeLs(KEYS.tags, defaultTags)
    writeLs(KEYS.performers, defaultPerformers)
    writeLs(KEYS.videos, defaultVideos())
    writeLs(KEYS.ads, defaultAds())
    writeLs(KEYS.settings, defaultSettings)
  },
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
}
