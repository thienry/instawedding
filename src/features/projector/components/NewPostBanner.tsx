import type { Post } from '@/types/domain'
import type { CSSProperties } from 'react'

const SPARKS = Array.from(
  { length: 28 },
  (_, index) =>
    ({
      '--angle': `${index * 137.5}deg`,
      '--distance': `${12 + (index % 5) * 5}vh`,
      '--delay': `${250 + (index % 6) * 70}ms`,
    }) as CSSProperties
)

interface NewPostBannerProps {
  readonly post: Post | null
}

/** Celebrates a post that has just arrived, over the stage. */
export function NewPostBanner({ post }: NewPostBannerProps) {
  return (
    <div
      aria-live="polite"
      className="absolute inset-x-0 bottom-[6%] z-20 flex justify-center pointer-events-none">
      {post && (
        <div key={post.id} className="projector-arrival">
          {SPARKS.map((style, index) => (
            <span key={index} aria-hidden="true" style={style} className="projector-spark" />
          ))}
          <p className="text-[clamp(0.8rem,1.9vh,1.25rem)] text-gold-400">Nova foto ao vivo</p>
          <p className="font-serif italic text-[clamp(1.5rem,4.6vh,3.25rem)] leading-tight">
            {post.authorName}
          </p>
        </div>
      )}
    </div>
  )
}
