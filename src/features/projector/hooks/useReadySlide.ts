import { useEffect, useState } from 'react'

import { loadSlideMedia } from '@/features/projector/utils/slide-media'

import type { Slide } from '@/features/projector/types'
import type { Post } from '@/types/domain'

/** Slide on display, as returned by {@link useReadySlide}. */
interface ReadySlide {
  /** `null` when there is nothing to show. */
  readonly slide: Slide | null
  /** Whether `slide` is the requested post, already loaded. */
  readonly isReady: boolean
}

/**
 * Holds the slide on display until the media of the next one is loaded, so a
 * transition never reveals a half-loaded photo.
 *
 * @param post - Post to show.
 * @param nextPost - Post loaded in advance.
 */
export function useReadySlide(
  post: Post | undefined,
  nextPost: Post | undefined
): ReadySlide {
  const [loaded, setLoaded] = useState<Slide | null>(null)

  useEffect(() => {
    if (!post) return
    let isCurrent = true
    void loadSlideMedia(post).then((media) => {
      if (!isCurrent) return
      // A refresh brings the same post again; its media must not change
      setLoaded((prev) => (prev?.post.id === post.id ? prev : { post, media }))
    })
    return () => {
      isCurrent = false
    }
  }, [post])

  useEffect(() => {
    if (nextPost) void loadSlideMedia(nextPost)
  }, [nextPost])

  // A hidden post must not come back while the next one loads
  if (!post && loaded) setLoaded(null)
  if (!post) return { slide: null, isReady: false }

  const isReady = loaded?.post.id === post.id
  if (loaded && !isReady) return { slide: loaded, isReady }
  return { slide: { post, media: loaded?.media ?? null }, isReady }
}
