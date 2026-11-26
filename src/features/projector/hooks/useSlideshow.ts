import { useEffect, useEffectEvent, useMemo, useState } from 'react'

import { SLIDE_DURATION_MS } from '@/features/projector/constants'
import { useReadySlide } from '@/features/projector/hooks/useReadySlide'
import { selectMomentSlides, selectSlides } from '@/features/projector/utils/projector-posts'

import type { ProjectorFilterMode, Slide } from '@/features/projector/types'
import type { Post } from '@/types/domain'

/** Place in the slideshow. The index is used once the post is gone. */
interface Position {
  readonly postId: string | null
  readonly index: number
  /** Place interrupted by a new post. */
  readonly resume?: Position
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
  /** Changes the filter and starts over. Applies once no moment is on air. */
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
 * @param newPost - Interrupts the sequence, which then goes on from where it
 *   was. Ignored while paused or when the filter leaves it out.
 * @param momentId - Moment on air, whose posts replace the filter.
 */
export function useSlideshow(
  posts: readonly Post[],
  newPost: Post | null,
  momentId: number | null = null
): Slideshow {
  const [filterMode, setMode] = useState<ProjectorFilterMode>('all')
  const [position, setPosition] = useState(START)
  const [isPaused, setIsPaused] = useState(false)
  const [lastNewPost, setLastNewPost] = useState(newPost)
  const [lastMomentId, setLastMomentId] = useState(momentId)

  if (momentId !== lastMomentId) {
    setLastMomentId(momentId)
    setPosition(START)
  }

  const slides = useMemo(
    () =>
      momentId === null ? selectSlides(posts, filterMode) : selectMomentSlides(posts, momentId),
    [posts, filterMode, momentId]
  )
  const foundIndex = slides.findIndex(({ id }) => id === position.postId)
  const index =
    foundIndex >= 0 ? foundIndex : Math.max(0, Math.min(position.index, slides.length - 1))

  if (newPost !== lastNewPost) {
    setLastNewPost(newPost)
    const newIndex = slides.findIndex(({ id }) => id === newPost?.id)
    if (newPost && newIndex >= 0 && !isPaused && newPost.id !== position.postId) {
      const interrupted = { postId: foundIndex >= 0 ? position.postId : null, index }
      const resume = position.resume ?? interrupted
      setPosition({ postId: newPost.id, index: newIndex, resume })
    }
  } else if (position.resume && foundIndex < 0) {
    // The new post was removed while on display
    setPosition(position.resume)
  }

  const currentPost = slides[index]
  const hasManySlides = slides.length > 1

  const { slide, isReady } = useReadySlide(currentPost, slides[(index + 1) % slides.length])
  const isRunning = hasManySlides && !isPaused && isReady
  const durationMs = slide?.media?.durationMs ?? SLIDE_DURATION_MS

  const wrap = (target: number) => (target + slides.length) % slides.length

  const getStepIndex = (offset: number) => {
    const { resume } = position
    if (!resume) return wrap(index + offset)

    const resumeIndex = slides.findIndex(({ id }) => id === resume.postId)
    // Once the interrupted post is gone, its place holds the one that followed
    const target =
      resumeIndex < 0
        ? wrap(Math.min(resume.index, slides.length))
        : wrap(resumeIndex + Math.max(0, offset))
    return target === index ? wrap(target + offset) : target
  }

  const step = (offset: number) => {
    if (slides.length === 0) return
    const nextIndex = getStepIndex(offset)
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
    showPost: (post) => setPosition({ postId: post.id, index: slides.indexOf(post) }),
  }
}
