import { useEffect, useRef, useState } from 'react'

import { getReactionService } from '@/services/reaction.factory'
import { MAX_BATCH_SIZE } from '@/utils/reactions'

import type { ReactionEmoji } from '@/utils/reactions'

const SEND_INTERVAL_MS = 1000

/** Reactions of the guest, as returned by {@link useReactionSender}. */
interface ReactionSender {
  /** Queues a reaction. Returns whether it fits in the next message. */
  readonly react: (emoji: ReactionEmoji) => boolean
  /** Whether the last message could not be sent. */
  readonly hasError: boolean
}

/** Sends reactions to the projector, at most one message per second. */
export function useReactionSender(): ReactionSender {
  const [hasError, setHasError] = useState(false)
  const queueRef = useRef<ReactionEmoji[]>([])
  const timerRef = useRef<number | undefined>(undefined)

  const flush = () => {
    timerRef.current = undefined
    const emojis = queueRef.current
    queueRef.current = []
    if (emojis.length === 0) return
    getReactionService()
      .send(emojis)
      .then(() => setHasError(false))
      .catch(() => setHasError(true))
  }

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      timerRef.current = undefined
      const emojis = queueRef.current
      queueRef.current = []
      if (emojis.length > 0)
        void getReactionService()
          .send(emojis)
          .catch(() => {})
    },
    []
  )

  const react = (emoji: ReactionEmoji) => {
    if (queueRef.current.length >= MAX_BATCH_SIZE) return false
    queueRef.current.push(emoji)
    timerRef.current ??= window.setTimeout(flush, SEND_INTERVAL_MS)
    return true
  }

  return { react, hasError }
}
