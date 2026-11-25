import type { FeedTab } from '@/features/feed/types'
import type { GuestUser, Post } from '@/types/domain'

/** Identities that a guest may have posted with. */
export interface GuestIdentity {
  readonly guestUser: GuestUser | null
  /** Anonymous session stored in the browser. */
  readonly sessionId: string
}

/** Filters applied to the feed. */
export interface FeedFilter extends GuestIdentity {
  readonly tab: FeedTab
  /** Only shows posts of this challenge, unless it is `null` or `NaN`. */
  readonly challengeId: number | null
}

/** Whether the post was created by the guest, who may then delete it. */
export function isOwnPost(post: Post, { guestUser, sessionId }: GuestIdentity): boolean {
  if (!post.clientSessionId) return false
  return post.clientSessionId === guestUser?.id || post.clientSessionId === sessionId
}

function hasGuestName(post: Post, guestUser: GuestUser | null): boolean {
  const hasAccount = post.clientSessionId && post.clientSessionId !== 'anonymous'
  if (!guestUser || hasAccount) return false
  const normalize = (name: string) => name.trim().toLowerCase()
  return normalize(post.authorName) === normalize(guestUser.name)
}

/** Returns the posts to show, in display order. Does not change the input. */
export function filterFeedPosts(posts: readonly Post[], filter: FeedFilter): readonly Post[] {
  const { tab, challengeId, guestUser } = filter
  const list =
    challengeId === null || Number.isNaN(challengeId)
      ? posts
      : posts.filter((post) => post.challengeId === challengeId)

  switch (tab) {
    case 'challenges':
      return list.filter((post) => Boolean(post.challengeId))
    case 'mine':
      // Older posts without an account only have the name
      return list.filter((post) => isOwnPost(post, filter) || hasGuestName(post, guestUser))
    case 'most-liked':
      return [...list].sort((a, b) => b.likesCount - a.likesCount)
    default:
      return list
  }
}

/** Prepends the posts that are not in the list yet. */
export function mergeNewPosts(posts: readonly Post[], newPosts: readonly Post[]): readonly Post[] {
  const knownIds = new Set(posts.map((post) => post.id))
  return [...newPosts.filter((post) => !knownIds.has(post.id)), ...posts]
}

/** Returns a copy of the set with the id added or removed. */
export function withMembership(
  ids: ReadonlySet<string>,
  id: string,
  isMember: boolean
): ReadonlySet<string> {
  const next = new Set(ids)
  if (isMember) next.add(id)
  else next.delete(id)
  return next
}
