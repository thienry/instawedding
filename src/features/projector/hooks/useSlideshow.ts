import { useEffect, useEffectEvent, useMemo, useState } from 'react'

import { SLIDE_DURATION_MS } from '@/features/projector/constants'
import { useReadySlide } from '@/features/projector/hooks/useReadySlide'
import { selectSlides } from '@/features/projector/utils/projector-posts'

import type { ProjectorFilterMode, Slide } from '@/features/projector/types'
import type { Post } from '@/types/domain'

/** Place in the slideshow. The index is used once the post is gone. */
interface Position {
  readonly postId: string | null
  readonly index: number
}

const START: Position = { postId: null, index: 0 }

/** Slideshow of the projector, as returned by {@link useSlideshow}. */
export interface Slideshow {
  /** Posts of the current filter, in display order. */
  readonly slides: readonly Post[]
  readonly index: number
  /** Slide on display, or `null` without posts. */
  readonly slide: Slide | null
  readonly filterMode: ProjectorFilterMode
  /** Changes the filter and starts over. */
  readonly setFilterMode: (mode: ProjectorFilterMode) => void
  readonly isPaused: boolean
  readonly togglePause: () => void
  /** Whether the time of the slide on display is running. */
  readonly isRunning: boolean
  /** Time the slide stays on display. */
  readonly durationMs: number
  readonly showPrevious: () => void
  readonly showNext: () => void
  readonly showPost: (post: Post) => void
}

/**
 * Cycles through the posts.
 *
 * Follows the post rather than its index, so posts added by a refresh do not
 * replace the one on display.
 *
 * @param newPost - Interrupts the sequence to be shown at once.
 */
export function useSlideshow(
  posts: readonly Post[],
  newPost: Post | null
): Slideshow {
  const [filterMode, setMode] = useState<ProjectorFilterMode>('all')
  const [position, setPosition] = useState(START)
  const [isPaused, setIsPaused] = useState(false)
  const [lastNewPost, setLastNewPost] = useState(newPost)

  if (newPost !== lastNewPost) {
    setLastNewPost(newPost)
    if (newPost) setPosition({ postId: newPost.id, index: 0 })
  }

  const slides = useMemo(
    () => selectSlides(posts, filterMode),
    [posts, filterMode]
  )
  const foundIndex = slides.findIndex(({ id }) => id === position.postId)
  const index =
    foundIndex >= 0
      ? foundIndex
      : Math.max(0, Math.min(position.index, slides.length - 1))
  const currentPost = slides[index]
  const hasManySlides = slides.length > 1

  const { slide, isReady } = useReadySlide(
    currentPost,
    slides[(index + 1) % slides.length]
  )
  const isRunning = hasManySlides && !isPaused && isReady
  const durationMs = slide?.media?.durationMs ?? SLIDE_DURATION_MS

  const step = (offset: number) => {
    if (slides.length === 0) return
    const nextIndex = (index + offset + slides.length) % slides.length
    setPosition({ postId: slides[nextIndex]?.id ?? null, index: nextIndex })
  }

  const advance = useEffectEvent(() => step(1))
  const currentPostId = currentPost?.id

  useEffect(() => {
    if (!isRunning) return
    const timeoutId = window.setTimeout(advance, durationMs)
    return () => window.clearTimeout(timeoutId)
  }, [isRunning, currentPostId, durationMs])

  return {
    slides,
    index,
    slide,
    filterMode,
    setFilterMode: (mode) => {
      setMode(mode)
      setPosition(START)
    },
    isPaused,
    togglePause: () => setIsPaused((prev) => !prev),
    isRunning,
    durationMs,
    showPrevious: () => step(-1),
    showNext: () => step(1),
    showPost: (post) =>
      setPosition({ postId: post.id, index: slides.indexOf(post) }),
  }
}
