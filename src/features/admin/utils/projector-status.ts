import { findBannedTerm } from '@/utils/banned-terms'

import type { Post } from '@/types/domain'

/** Why a post is off the projector, or that it is on it. */
export type ProjectorStatus =
  | {
      readonly kind: 'shown'
      /** Banned term that a moderator let through. */
      readonly releasedTerm?: string
    }
  | { readonly kind: 'guest' }
  | { readonly kind: 'moderator' }
  | { readonly kind: 'term'; readonly term: string }

/** Whether the projector shows the post, as it decides. Hidden posts are not considered. */
export function getProjectorStatus(post: Post, bannedTerms: readonly string[]): ProjectorStatus {
  if (post.showOnProjector === false) return { kind: 'guest' }
  if (post.hiddenFromProjector === true) return { kind: 'moderator' }
  const term = findBannedTerm(post, bannedTerms)
  if (term === null) return { kind: 'shown' }
  return post.hiddenFromProjector === false
    ? { kind: 'shown', releasedTerm: term }
    : { kind: 'term', term }
}

/**
 * Choice of the moderators that puts the post on the projector, or takes it
 * off. Clears the choice when the banned terms already decide the same.
 */
export function getProjectorToggle(post: Post, bannedTerms: readonly string[]): boolean | null {
  const status = getProjectorStatus(post, bannedTerms)
  if (status.kind === 'shown') return true
  return findBannedTerm(post, bannedTerms) === null ? null : false
}
