import type { Post } from '@/types/domain'

/** Selections of posts the operator can put on the projector. */
export type ProjectorFilterMode = 'all' | 'highlights' | 'challenges'

/** What must be known about a photo or video to show it. */
export interface SlideMedia {
  /** Width divided by height. */
  readonly ratio: number
  /** Time on display. */
  readonly durationMs: number
}

/** Post on display. */
export interface Slide {
  readonly post: Post
  /** `null` until the media is loaded. */
  readonly media: SlideMedia | null
}
