import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const GA_ID = 'G-SPJ01KN3YH'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** SPA pageviews for GA4 (index.html loads the base gtag config). */
export function GoogleAnalytics() {
  const location = useLocation()

  useEffect(() => {
    if (typeof window.gtag !== 'function') return
    window.gtag('config', GA_ID, {
      page_path: location.pathname + location.search,
      page_title: document.title,
    })
  }, [location.pathname, location.search])

  return null
}
