import { Link } from 'react-router-dom'

export function Brand({ className = '' }: { className?: string }) {
  return (
    <span className={`logo ${className}`.trim()}>
      Feed<span className="logo-x">Boss</span>
    </span>
  )
}

export function BrandLink({ className = '' }: { className?: string }) {
  return (
    <Link to="/" className={`logo-link ${className}`.trim()} aria-label="FeedBoss home">
      <Brand />
    </Link>
  )
}
