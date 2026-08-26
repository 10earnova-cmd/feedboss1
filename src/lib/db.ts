import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  increment,
} from 'firebase/firestore'
import { firebaseEnabled, firestore } from './firebase'
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

async function colDocs<T extends { id: string }>(name: string): Promise<T[]> {
  if (!firestore) return []
  const snap = await getDocs(collection(firestore, name))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[]
}

async function putDoc(name: string, id: string, data: Record<string, unknown>) {
  if (!firestore) return
  await setDoc(doc(firestore, name, id), data, { merge: true })
}

export const db = {
  async listVideos(): Promise<Video[]> {
    if (firebaseEnabled && firestore) {
      const rows = await colDocs<Video>('videos')
      return rows.sort((a, b) => b.createdAt - a.createdAt)
    }
    ensureLocalSeed()
    return readLs<Video[]>(KEYS.videos, []).sort((a, b) => b.createdAt - a.createdAt)
  },

  async saveVideo(video: Video) {
    if (firebaseEnabled && firestore) {
      const { id, ...rest } = video
      await putDoc('videos', id, rest)
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
    if (firebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, 'videos', id))
      return
    }
    writeLs(
      KEYS.videos,
      readLs<Video[]>(KEYS.videos, []).filter((v) => v.id !== id),
    )
  },

  async bumpViews(id: string) {
    if (firebaseEnabled && firestore) {
      await updateDoc(doc(firestore, 'videos', id), { views: increment(1) })
      return
    }
    const all = readLs<Video[]>(KEYS.videos, [])
    writeLs(
      KEYS.videos,
      all.map((v) => (v.id === id ? { ...v, views: v.views + 1 } : v)),
    )
  },

  async bumpLikes(id: string) {
    if (firebaseEnabled && firestore) {
      await updateDoc(doc(firestore, 'videos', id), { likes: increment(1) })
      return
    }
    const all = readLs<Video[]>(KEYS.videos, [])
    writeLs(
      KEYS.videos,
      all.map((v) => (v.id === id ? { ...v, likes: v.likes + 1 } : v)),
    )
  },

  async listCategories(): Promise<Category[]> {
    if (firebaseEnabled && firestore) {
      const rows = await colDocs<Category>('categories')
      return rows.sort((a, b) => a.order - b.order)
    }
    ensureLocalSeed()
    return readLs<Category[]>(KEYS.categories, []).sort((a, b) => a.order - b.order)
  },

  async saveCategory(row: Category) {
    if (firebaseEnabled && firestore) {
      const { id, ...rest } = row
      await putDoc('categories', id, rest)
      return
    }
    const all = readLs<Category[]>(KEYS.categories, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.categories, all)
  },

  async deleteCategory(id: string) {
    if (firebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, 'categories', id))
      return
    }
    writeLs(
      KEYS.categories,
      readLs<Category[]>(KEYS.categories, []).filter((x) => x.id !== id),
    )
  },

  async listTags(): Promise<Tag[]> {
    if (firebaseEnabled && firestore) return colDocs<Tag>('tags')
    ensureLocalSeed()
    return readLs<Tag[]>(KEYS.tags, [])
  },

  async saveTag(row: Tag) {
    if (firebaseEnabled && firestore) {
      const { id, ...rest } = row
      await putDoc('tags', id, rest)
      return
    }
    const all = readLs<Tag[]>(KEYS.tags, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.tags, all)
  },

  async deleteTag(id: string) {
    if (firebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, 'tags', id))
      return
    }
    writeLs(
      KEYS.tags,
      readLs<Tag[]>(KEYS.tags, []).filter((x) => x.id !== id),
    )
  },

  async listPerformers(): Promise<Performer[]> {
    if (firebaseEnabled && firestore) return colDocs<Performer>('performers')
    ensureLocalSeed()
    return readLs<Performer[]>(KEYS.performers, [])
  },

  async savePerformer(row: Performer) {
    if (firebaseEnabled && firestore) {
      const { id, ...rest } = row
      await putDoc('performers', id, rest)
      return
    }
    const all = readLs<Performer[]>(KEYS.performers, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.performers, all)
  },

  async deletePerformer(id: string) {
    if (firebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, 'performers', id))
      return
    }
    writeLs(
      KEYS.performers,
      readLs<Performer[]>(KEYS.performers, []).filter((x) => x.id !== id),
    )
  },

  async listAds(): Promise<Ad[]> {
    if (firebaseEnabled && firestore) return colDocs<Ad>('ads')
    ensureLocalSeed()
    return readLs<Ad[]>(KEYS.ads, [])
  },

  async saveAd(row: Ad) {
    if (firebaseEnabled && firestore) {
      const { id, ...rest } = row
      await putDoc('ads', id, rest)
      return
    }
    const all = readLs<Ad[]>(KEYS.ads, [])
    const i = all.findIndex((x) => x.id === row.id)
    if (i >= 0) all[i] = row
    else all.push(row)
    writeLs(KEYS.ads, all)
  },

  async deleteAd(id: string) {
    if (firebaseEnabled && firestore) {
      await deleteDoc(doc(firestore, 'ads', id))
      return
    }
    writeLs(
      KEYS.ads,
      readLs<Ad[]>(KEYS.ads, []).filter((x) => x.id !== id),
    )
  },

  async getSettings(): Promise<SiteSettings> {
    if (firebaseEnabled && firestore) {
      const snap = await getDoc(doc(firestore, 'settings', 'site'))
      const data = snap.exists() ? (snap.data() as SiteSettings) : defaultSettings
      return applyLegalCopy({ ...defaultSettings, ...data, uploadSecret: '' })
    }
    ensureLocalSeed()
    return applyLegalCopy({ ...defaultSettings, ...readLs<SiteSettings>(KEYS.settings, defaultSettings) })
  },

  async getPrivateSettings(): Promise<{ uploadSecret: string }> {
    if (firebaseEnabled && firestore) {
      const snap = await getDoc(doc(firestore, 'settings', 'private'))
      if (!snap.exists()) return { uploadSecret: '' }
      return { uploadSecret: String((snap.data() as { uploadSecret?: string }).uploadSecret || '') }
    }
    const s = readLs<SiteSettings>(KEYS.settings, defaultSettings)
    return { uploadSecret: s.uploadSecret || '' }
  },

  async saveSettings(row: SiteSettings) {
    if (firebaseEnabled && firestore) {
      const { uploadSecret, ...publicRow } = row
      await putDoc('settings', 'site', publicRow as unknown as Record<string, unknown>)
      await putDoc('settings', 'private', { uploadSecret })
      return
    }
    writeLs(KEYS.settings, row)
  },

  async seedDefaults() {
    if (firebaseEnabled && firestore) {
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
