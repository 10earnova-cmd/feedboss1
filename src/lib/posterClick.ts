import type { Ad } from '../types'

const keyFor = (videoId: string) => `fb_poster_clicks_${videoId}`

export function posterClickAd(ads: Ad[]) {
  return ads.find((a) => a.slot === 'poster_click' && a.enabled) || null
}

export function peekPosterHref(videoId: string, ads: Ad[], watchHref: string) {
  const ad = posterClickAd(ads)
  if (!ad) return watchHref
  const n = Number(sessionStorage.getItem(keyFor(videoId)) || '0')
  const chosen = (n === 0 ? ad.url : ad.url2 || '').trim()
  return chosen || watchHref
}

export function takePosterHref(videoId: string, ads: Ad[], watchHref: string) {
  const href = peekPosterHref(videoId, ads, watchHref)
  const n = Number(sessionStorage.getItem(keyFor(videoId)) || '0')
  sessionStorage.setItem(keyFor(videoId), String(n + 1))
  return href
}
