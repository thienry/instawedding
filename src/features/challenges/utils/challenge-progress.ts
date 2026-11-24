import type { GuestSession, GuestUser, Post } from '@/types/domain'

/**
 * Finds the challenges the guest has completed.
 *
 * A post belongs to the guest when it has their user or session id, or their
 * name, ignoring case and surrounding spaces.
 */
export function findCompletedChallenges(
  posts: readonly Post[],
  guestUser: GuestUser | null,
  session: Pick<GuestSession, 'sessionId' | 'guestName'>
): ReadonlySet<number> {
  const guestName = (guestUser?.name ?? session.guestName).trim().toLowerCase()
  const completed = new Set<number>()
  for (const post of posts) {
    if (!post.challengeId) continue
    const isMineById =
      Boolean(post.clientSessionId) &&
      (post.clientSessionId === guestUser?.id ||
        post.clientSessionId === session.sessionId)
    const isMineByName =
      Boolean(guestName) && post.authorName.trim().toLowerCase() === guestName
    if (isMineById || isMineByName) completed.add(post.challengeId)
  }
  return completed
}

/** Counts the posts of each challenge, by challenge id. */
export function countPostsByChallenge(
  posts: readonly Post[]
): ReadonlyMap<number, number> {
  const counts = new Map<number, number>()
  for (const { challengeId } of posts) {
    if (challengeId) counts.set(challengeId, (counts.get(challengeId) ?? 0) + 1)
  }
  return counts
}
