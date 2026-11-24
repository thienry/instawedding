import { useRef } from 'react'

import { useVisibleInterval } from '@/hooks/useVisibleInterval'
import { getPostRepository } from '@/services/repositories.factory'

import type { Post } from '@/types/domain'

/**
 * Notices the posts hidden or deleted elsewhere. Realtime cannot tell: guests
 * lose access to a hidden post, so its update never reaches them.
 *
 * @param posts - Posts on screen.
 * @param onRemoved - Receives the ids that are no longer visible.
 */
export function useRemovedPosts(
  posts: readonly Post[],
  intervalMs: number,
  onRemoved: (ids: ReadonlySet<string>) => void
): void {
  const isCheckingRef = useRef(false)

  useVisibleInterval(() => {
    if (isCheckingRef.current || posts.length === 0) return
    isCheckingRef.current = true
    // Posts that arrive during the request are not in `posts`, so they stay
    getPostRepository()
      .getVisiblePostIds()
      .then((visibleIds) => {
        const removed = posts.map(({ id }) => id).filter((id) => !visibleIds.has(id))
        if (removed.length > 0) onRemoved(new Set(removed))
      })
      .catch(() => {
        // Tries again at the next interval
      })
      .finally(() => {
        isCheckingRef.current = false
      })
  }, intervalMs)
}
