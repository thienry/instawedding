import type { Post } from '@/types/domain'

const LAST_SEEN_POST_AT_KEY = 'instawedding_last_seen_post_at'

/** Date of the newest post, ignoring broken dates. */
export function getNewestTimestamp(posts: readonly Post[]): string | null {
  let maxMs = -1
  let maxIso: string | null = null

  for (const post of posts) {
    const ms = Date.parse(post.createdAt)
    if (!Number.isNaN(ms) && ms > maxMs) {
      maxMs = ms
      maxIso = post.createdAt
    }
  }

  return maxIso
}

/** Date of the newest post the guest has seen. */
export function getLastSeenTimestamp(): string | null {
  if (typeof localStorage === 'undefined') return null
  return localStorage.getItem(LAST_SEEN_POST_AT_KEY)
}

/** Moves the last seen date forward, never back. */
export function setLastSeenTimestamp(isoTimestamp: string): void {
  if (typeof localStorage === 'undefined') return
  const currentIso = localStorage.getItem(LAST_SEEN_POST_AT_KEY)
  if (currentIso) {
    const currentMs = Date.parse(currentIso)
    const nextMs = Date.parse(isoTimestamp)
    if (!Number.isNaN(currentMs) && !Number.isNaN(nextMs) && nextMs < currentMs) {
      return
    }
  }
  localStorage.setItem(LAST_SEEN_POST_AT_KEY, isoTimestamp)
}
