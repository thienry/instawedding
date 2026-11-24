import type { Post } from '@/types/domain'

/** Selections of posts the operator can put on the projector. */
export type ProjectorFilterMode = 'all' | 'highlights' | 'challenges'

/** Post on display. */
export interface Slide {
  readonly post: Post
  /** Width divided by height, or `null` until the media is measured. */
  readonly ratio: number | null
}
