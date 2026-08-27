export type Lang = 'bn' | 'en'

export type VideoStatus = 'draft' | 'published' | 'hidden'

export type Video = {
  id: string
  slug: string
  titleEn: string
  titleBn: string
  captionEn: string
  captionBn: string
  videoUrl: string
  thumbnailUrl: string
  previewUrls?: string[]
  duration: number
  views: number
  likes: number
  categoryId: string
  tagIds: string[]
  modelIds: string[]
  status: VideoStatus
  featured: boolean
  trending: boolean
  createdAt: number
  updatedAt: number
}

export type Category = {
  id: string
  slug: string
  nameEn: string
  nameBn: string
  descriptionEn: string
  descriptionBn: string
  thumbnailUrl: string
  order: number
}

export type Tag = {
  id: string
  slug: string
  nameEn: string
  nameBn: string
}

export type Performer = {
  id: string
  slug: string
  name: string
  bioEn: string
  bioBn: string
  avatarUrl: string
}

export type AdSlot =
  | 'poster_click'
  | 'popunder'
  | 'header'
  | 'below_player'
  | 'sidebar'
  | 'in_grid'
  | 'footer'
  | 'mobile_sticky'
  | 'watch_cta'
  | 'download_cta'

export type AdType = 'script' | 'html' | 'direct_link'

export type Ad = {
  id: string
  slot: AdSlot
  name: string
  type: AdType
  scriptCode: string
  html: string
  url: string
  url2?: string
  url3?: string
  labelEn: string
  labelBn: string
  enabled: boolean
}

export type SiteSettings = {
  siteNameEn: string
  siteNameBn: string
  taglineEn: string
  taglineBn: string
  logoUrl: string
  contactEmail: string
  telegram: string
  ageGateEn: string
  ageGateBn: string
  termsEn: string
  termsBn: string
  privacyEn: string
  privacyBn: string
  dmcaEn: string
  dmcaBn: string
  statement2257En: string
  statement2257Bn: string
  aboutEn: string
  aboutBn: string
  r2PublicBase: string
  workerUrl: string
  uploadSecret: string
  monetagSiteId: string
}

export type AdminUser = {
  uid: string
  email: string
}
