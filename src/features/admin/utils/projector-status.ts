import { findBannedTerm } from '@/utils/banned-terms'

import type { Post } from '@/types/domain'

/** Why a post is off the projector, or that it is on it. */
export type ProjectorStatus =
  | { readonly kind: 'shown' }
  | { readonly kind: 'guest' }
  | { readonly kind: 'moderator' }
  | { readonly kind: 'term'; readonly term: string }

/** Whether the projector shows the post, as it decides. Hidden posts are not considered. */
export function getProjectorStatus(post: Post, bannedTerms: readonly string[]): ProjectorStatus {
  if (post.showOnProjector === false) return { kind: 'guest' }
  if (post.hiddenFromProjector) return { kind: 'moderator' }
  const term = findBannedTerm(post, bannedTerms)
  return term === null ? { kind: 'shown' } : { kind: 'term', term }
}
