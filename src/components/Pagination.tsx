import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export function Pagination({
  page,
  pages,
  makeHref,
}: {
  page: number
  pages: number
  makeHref: (p: number) => string
}) {
  if (pages <= 1) return null
  const prev = Math.max(1, page - 1)
  const next = Math.min(pages, page + 1)
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <Link className="btn btn-ghost" to={makeHref(prev)}>
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="text-sm text-muted">
        {page} / {pages}
      </span>
      <Link className="btn btn-ghost" to={makeHref(next)}>
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  )
}
