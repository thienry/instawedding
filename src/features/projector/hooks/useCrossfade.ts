import { useState } from 'react'

import type { Slide } from '@/features/projector/types'

/** Slide being drawn, as returned by {@link useCrossfade}. */
interface SlideLayer {
  readonly slide: Slide
  readonly isLeaving: boolean
}

/** Layers of a transition, as returned by {@link useCrossfade}. */
interface Crossfade {
  /** Back to front: the slide that is leaving, if any, and the current one. */
  readonly layers: readonly SlideLayer[]
  /** Drops the leaving slide. Call it when its animation ends. */
  readonly removeLeaving: () => void
}

/** Keeps the previous slide around while it animates out. */
export function useCrossfade(slide: Slide): Crossfade {
  const [current, setCurrent] = useState(slide)
  const [leaving, setLeaving] = useState<Slide | null>(null)

  if (slide.post !== current.post || slide.media !== current.media) {
    if (slide.post.id !== current.post.id) setLeaving(current)
    setCurrent(slide)
  }

  return {
    layers: [
      ...(leaving ? [{ slide: leaving, isLeaving: true }] : []),
      { slide: current, isLeaving: false },
    ],
    removeLeaving: () => setLeaving(null),
  }
}
