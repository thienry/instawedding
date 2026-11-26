import { SPARKS } from '@/features/projector/utils/sparks'

import type { Post } from '@/types/domain'

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
          <p className="text-[clamp(0.8rem,1.9vh,1.25rem)] text-gold-400">Novo post ao vivo</p>
          <p className="font-serif italic text-[clamp(1.5rem,4.6vh,3.25rem)] leading-tight">
            {post.authorName}
          </p>
        </div>
      )}
    </div>
  )
}
