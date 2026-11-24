import { useEffect, useRef, useState } from 'react'

import type { RefObject } from 'react'

const INITIAL_COUNT = 12
const STEP = 10
/** Loads more before the end is visible. */
const ROOT_MARGIN = '800px 0px'

/** Visible slice of a list, as returned by {@link useInfiniteScroll}. */
interface InfiniteScroll<T> {
  readonly visibleItems: readonly T[]
  readonly hasMore: boolean
  /** Attach to an element after the list; render it while `hasMore`. */
  readonly sentinelRef: RefObject<HTMLDivElement | null>
}

/**
 * Reveals a long list as the guest scrolls.
 *
 * @param items - Whole list.
 * @param resetKey - Starts over whenever it changes.
 */
export function useInfiniteScroll<T>(
  items: readonly T[],
  resetKey: string
): InfiniteScroll<T> {
  const [visibleCount, setVisibleCount] = useState(INITIAL_COUNT)
  const [currentKey, setCurrentKey] = useState(resetKey)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const total = items.length
  const hasMore = visibleCount < total

  // Resets while rendering, so the long list is never drawn with the new key
  if (currentKey !== resetKey) {
    setCurrentKey(resetKey)
    setVisibleCount(INITIAL_COUNT)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setVisibleCount((prev) => Math.min(total, prev + STEP))
      },
      { rootMargin: ROOT_MARGIN }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
    // visibleCount: a sentinel that stays on screen must be observed again
  }, [visibleCount, hasMore, total])

  return { visibleItems: items.slice(0, visibleCount), hasMore, sentinelRef }
}
