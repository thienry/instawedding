import { useRef, useState } from 'react'

import type { TouchEvent } from 'react'

const THRESHOLD_PX = 68
const MAX_DISTANCE_PX = 115
/** Height kept while refreshing. */
const REFRESHING_DISTANCE_PX = 56
/** Scroll still treated as the top of the page. */
const TOP_TOLERANCE_PX = 5
/** Share of the finger movement that is followed, for an elastic feel. */
const DAMPING = 0.45
const VIBRATION_MS = 15

/** Pull gesture, as returned by {@link usePullToRefresh}. */
export interface PullToRefresh {
  readonly distance: number
  /** Distance relative to the one that triggers a refresh, from 0 to 1. */
  readonly progress: number
  readonly isPulling: boolean
  /** Handlers to spread on the element that receives the gesture. */
  readonly touchHandlers: {
    readonly onTouchStart: (event: TouchEvent) => void
    readonly onTouchMove: (event: TouchEvent) => void
    readonly onTouchEnd: () => void
    readonly onTouchCancel: () => void
  }
}

/**
 * Refreshes when the page is pulled down from the top.
 *
 * @param isRefreshing - Ignores the gesture while true.
 * @param onRefresh - Called when the pull passes the threshold.
 */
export function usePullToRefresh(
  isRefreshing: boolean,
  onRefresh: () => Promise<void>
): PullToRefresh {
  const [distance, setDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const startYRef = useRef<number | null>(null)

  const handleStart = (event: TouchEvent) => {
    if (window.scrollY > TOP_TOLERANCE_PX || isRefreshing) {
      startYRef.current = null
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    startYRef.current = touch.clientY
    setIsPulling(true)
  }

  const handleMove = (event: TouchEvent) => {
    if (startYRef.current === null || isRefreshing) return
    if (window.scrollY > TOP_TOLERANCE_PX) {
      startYRef.current = null
      setIsPulling(false)
      setDistance(0)
      return
    }

    const touch = event.touches[0]
    if (!touch) return
    const pulled = Math.round((touch.clientY - startYRef.current) * DAMPING)
    setDistance(Math.min(MAX_DISTANCE_PX, Math.max(0, pulled)))
  }

  const refresh = async () => {
    navigator.vibrate?.(VIBRATION_MS)
    setDistance(REFRESHING_DISTANCE_PX)
    await onRefresh()
    setDistance(0)
  }

  const handleEnd = () => {
    if (startYRef.current === null) return
    startYRef.current = null
    setIsPulling(false)

    if (distance >= THRESHOLD_PX && !isRefreshing) void refresh()
    else setDistance(0)
  }

  return {
    distance,
    progress: Math.min(1, distance / THRESHOLD_PX),
    isPulling,
    touchHandlers: {
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
    },
  }
}
