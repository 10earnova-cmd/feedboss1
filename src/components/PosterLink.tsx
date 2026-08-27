import { type MouseEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSite } from '../context/SiteContext'
import { peekPosterHref, takePosterHref } from '../lib/posterClick'
import type { Video } from '../types'

export function PosterLink({
  video,
  className,
  children,
}: {
  video: Video
  className?: string
  children: ReactNode
}) {
  const { ads } = useSite()
  const watch = `/watch/${video.slug}`
  const href = peekPosterHref(video.id, ads, watch)
  const external = /^https?:\/\//i.test(href)

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const dest = takePosterHref(video.id, ads, watch)
    if (/^https?:\/\//i.test(dest)) {
      e.preventDefault()
      window.location.assign(dest)
    }
  }

  if (external) {
    return (
      <a href={href} className={className} rel="sponsored noreferrer" onClick={onClick}>
        {children}
      </a>
    )
  }

  return (
    <Link to={watch} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}
