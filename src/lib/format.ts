export function formatDuration(total: number) {
  if (!total || total < 0) return '0:00'
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = Math.floor(total % 60)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export function formatViews(n: number, lang: 'bn' | 'en' = 'bn') {
  const locale = lang === 'bn' ? 'bn-BD' : 'en'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}${lang === 'bn' ? ' মি' : 'M'}`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}${lang === 'bn' ? ' হা' : 'K'}`
  return new Intl.NumberFormat(locale).format(n)
}

export function formatDate(ts: number, lang: 'bn' | 'en' = 'bn') {
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(ts)
}

export function pick<T extends { titleEn?: string; titleBn?: string; nameEn?: string; nameBn?: string; captionEn?: string; captionBn?: string }>(
  item: T,
  lang: 'bn' | 'en',
  field: 'title' | 'name' | 'caption',
) {
  if (field === 'title') return lang === 'bn' ? item.titleBn || item.titleEn || '' : item.titleEn || item.titleBn || ''
  if (field === 'name') return lang === 'bn' ? item.nameBn || item.nameEn || '' : item.nameEn || item.nameBn || ''
  return lang === 'bn' ? item.captionBn || item.captionEn || '' : item.captionEn || item.captionBn || ''
}
