import { useEffect, useState } from 'react'

import { loadMediaRatio } from '@/features/projector/utils/media-ratio'

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
    void loadMediaRatio(post).then((ratio) => {
      if (isCurrent) setLoaded({ post, ratio })
    })
    return () => {
      isCurrent = false
    }
  }, [post])

  useEffect(() => {
    if (nextPost) void loadMediaRatio(nextPost)
  }, [nextPost])

  if (!post) return { slide: null, isReady: false }

  const isReady = loaded?.post.id === post.id
  if (loaded && !isReady) return { slide: loaded, isReady }
  return { slide: { post, ratio: loaded?.ratio ?? null }, isReady }
}
