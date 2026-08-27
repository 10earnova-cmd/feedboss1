import type { Ad } from '../types'

const keyFor = (videoId: string) => `fb_poster_clicks_${videoId}`

export function posterClickAd(ads: Ad[]) {
  return ads.find((a) => a.slot === 'poster_click' && a.enabled) || null
}

function urlForClick(ad: Ad, n: number) {
  if (n <= 0) return (ad.url || '').trim()
  if (n === 1) return (ad.url2 || '').trim()
  return (ad.url3 || '').trim()
}

export function peekPosterHref(videoId: string, ads: Ad[], watchHref: string) {
  const ad = posterClickAd(ads)
  if (!ad) return watchHref
  const n = Number(sessionStorage.getItem(keyFor(videoId)) || '0')
  return urlForClick(ad, n) || watchHref
}

export function takePosterHref(videoId: string, ads: Ad[], watchHref: string) {
  const href = peekPosterHref(videoId, ads, watchHref)
  const n = Number(sessionStorage.getItem(keyFor(videoId)) || '0')
  sessionStorage.setItem(keyFor(videoId), String(n + 1))
  return href
}
