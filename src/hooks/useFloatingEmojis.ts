import { useCallback, useRef, useState } from 'react'

import type { ReactionEmoji } from '@/utils/reactions'

const STAGGER_MS = 140

/** Emoji rising on screen. */
export interface FloatingEmoji {
  readonly id: number
  readonly emoji: ReactionEmoji
  /** Horizontal place, from 0 to 1. */
  readonly x: number
  readonly delayMs: number
}

/** Emojis on screen, as returned by {@link useFloatingEmojis}. */
export interface FloatingEmojis {
  readonly items: readonly FloatingEmoji[]
  readonly add: (emojis: readonly ReactionEmoji[]) => void
  readonly remove: (id: number) => void
  readonly clear: () => void
}

/**
 * Holds the emojis rising on screen.
 *
 * @param limit - Emojis at the same time. The ones over it are dropped.
 */
export function useFloatingEmojis(limit: number): FloatingEmojis {
  const [items, setItems] = useState<readonly FloatingEmoji[]>([])
  const nextIdRef = useRef(0)

  const add = useCallback(
    (emojis: readonly ReactionEmoji[]) => {
      const added = emojis.map((emoji, index) => {
        nextIdRef.current += 1
        return { id: nextIdRef.current, emoji, x: Math.random(), delayMs: index * STAGGER_MS }
      })
      setItems((prev) => [...prev, ...added].slice(0, limit))
    },
    [limit]
  )
  const remove = useCallback(
    (id: number) => setItems((prev) => prev.filter((item) => item.id !== id)),
    []
  )
  const clear = useCallback(() => setItems([]), [])

  return { items, add, remove, clear }
}
