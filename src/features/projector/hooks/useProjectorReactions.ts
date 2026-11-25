import { useEffect, useState } from 'react'

import { useFloatingEmojis } from '@/hooks/useFloatingEmojis'
import { getReactionService } from '@/services/reaction.factory'

import type { FloatingEmojis } from '@/hooks/useFloatingEmojis'

const MAX_EMOJIS = 40

/** Reactions on the projector, as returned by {@link useProjectorReactions}. */
export interface ProjectorReactions {
  readonly emojis: FloatingEmojis
  readonly isEnabled: boolean
  /** Turns the reactions on or off, clearing the screen. */
  readonly toggle: () => void
}

/** Receives the reactions of the guests while enabled. */
export function useProjectorReactions(): ProjectorReactions {
  const [isEnabled, setIsEnabled] = useState(true)
  const emojis = useFloatingEmojis(MAX_EMOJIS)
  const { add, clear } = emojis

  useEffect(() => {
    if (!isEnabled) return
    return getReactionService().subscribe((received) => {
      // A hidden tab does not animate, so they would pile up
      if (!document.hidden) add(received)
    })
  }, [isEnabled, add])

  const toggle = () => {
    clear()
    setIsEnabled((prev) => !prev)
  }

  return { emojis, isEnabled, toggle }
}
