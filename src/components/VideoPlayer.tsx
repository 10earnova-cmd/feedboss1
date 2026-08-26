import { useEffect, useRef } from 'react'

export function VideoPlayer({ src, poster, title }: { src: string; poster: string; title: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.load()
  }, [src])

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-black">
      <video
        ref={ref}
        className="aspect-video w-full bg-black"
        controls
        playsInline
        poster={poster}
        preload="metadata"
        title={title}
      >
        <source src={src} />
      </video>
    </div>
  )
}
