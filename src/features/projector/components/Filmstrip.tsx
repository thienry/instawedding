import { SLIDE_DURATION_MS } from '@/features/projector/constants'
import { getUpcomingPosts } from '@/features/projector/utils/projector-posts'
import { resolvePostMediaType } from '@/utils/video'

import type { Slideshow } from '@/features/projector/hooks/useSlideshow'
import type { CSSProperties } from 'react'

const THUMBNAIL_COUNT = 10

interface FilmstripProps {
  readonly slideshow: Slideshow
}

/** Time left for the slide, its number and the posts that come next. */
export function Filmstrip({ slideshow }: FilmstripProps) {
  const { slides, slide, index, isRunning, showPost } = slideshow
  const upcomingPosts = getUpcomingPosts(slides, index, THUMBNAIL_COUNT)

  return (
    <nav aria-label="A seguir" className="shrink-0">
      <div className="h-px bg-white/15 overflow-hidden">
        {isRunning && (
          <div
            key={slide?.post.id}
            style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
            className="projector-progress h-full bg-gold-400"
          />
        )}
      </div>

      <div className="mt-[1.8vh] flex items-center gap-5 lg:gap-8">
        <p className="shrink-0 font-serif tabular-nums text-lg lg:text-[clamp(1.1rem,2.8vh,2rem)]">
          {index + 1}
          <span className="text-white/50"> / {slides.length}</span>
        </p>
        <ul className="projector-filmstrip">
          {upcomingPosts.map((post, slot) => (
            <li key={post.id} style={{ '--slot': slot } as CSSProperties}>
              <button
                type="button"
                onClick={() => showPost(post)}
                title={`Foto de ${post.authorName}`}
                className="projector-thumbnail"
              >
                {resolvePostMediaType(post) === 'video' ? (
                  <video
                    src={post.mediaUrl}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img src={post.mediaUrl} alt="" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}
