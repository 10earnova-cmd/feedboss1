import { useEffect, useRef } from 'react'
import { useLang } from '../context/LangContext'
import { tr } from '../i18n'
import type { Ad, AdSlot } from '../types'

function injectHtml(host: HTMLElement, html: string) {
  host.innerHTML = html
  host.querySelectorAll('script').forEach((old) => {
    const s = document.createElement('script')
    for (const attr of old.attributes) s.setAttribute(attr.name, attr.value)
    s.text = old.text
    old.replaceWith(s)
  })
}

export function AdSlot({ slot, ads, className = '' }: { slot: AdSlot; ads: Ad[]; className?: string }) {
  const { lang } = useLang()
  const ref = useRef<HTMLDivElement>(null)
  const ad = ads.find((a) => a.slot === slot && a.enabled)

  useEffect(() => {
    if (!ad || !ref.current) return
    if (ad.type === 'html' && ad.html) injectHtml(ref.current, ad.html)
    if (ad.type === 'script' && ad.scriptCode) injectHtml(ref.current, ad.scriptCode)
  }, [ad])

  if (!ad) return null

  if (ad.type === 'direct_link' && ad.url) {
    return (
      <a
        href={ad.url}
        target="_blank"
        rel="noreferrer sponsored"
        className={`btn btn-primary w-full ${className}`}
      >
        {lang === 'bn' ? ad.labelBn || ad.labelEn : ad.labelEn || ad.labelBn || tr('watchHd', lang)}
      </a>
    )
  }

  return <div ref={ref} className={`overflow-hidden ${className}`} />
}

export function PopunderAd({ ads }: { ads: Ad[] }) {
  const mounted = useRef(false)
  useEffect(() => {
    if (mounted.current) return
    const ad = ads.find((a) => a.slot === 'popunder' && a.enabled)
    if (!ad?.scriptCode) return
    mounted.current = true
    const holder = document.createElement('div')
    holder.style.display = 'none'
    document.body.appendChild(holder)
    injectHtml(holder, ad.scriptCode)
  }, [ads])
  return null
}
