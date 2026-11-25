import { SmilePlus, X } from 'lucide-react'
import { useState } from 'react'

import { FloatingEmojiLayer } from '@/components/common/FloatingEmojiLayer'
import { useReactionSender } from '@/features/feed/hooks/useReactionSender'
import { useFloatingEmojis } from '@/hooks/useFloatingEmojis'
import { REACTIONS } from '@/utils/reactions'

import type { FeedGuest } from '@/features/feed/hooks/useFeedGuest'
import type { ReactionEmoji } from '@/utils/reactions'

const MAX_EMOJIS = 15
const LOGIN_REASON = 'Conecte sua conta Google para reagir no telão da festa.'

interface ReactionBarProps {
  readonly guest: Pick<FeedGuest, 'guestUser' | 'openAuthPrompt'>
}

/** Sends live reactions to the projector. */
export function ReactionBar({ guest: { guestUser, openAuthPrompt } }: ReactionBarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { react, hasError } = useReactionSender()
  const floating = useFloatingEmojis(MAX_EMOJIS)

  const handleOpen = () => {
    if (guestUser) setIsOpen(true)
    else openAuthPrompt(LOGIN_REASON)
  }

  const handleReact = (emoji: ReactionEmoji) => {
    if (react(emoji)) floating.add([emoji])
  }

  const isBarVisible = isOpen && guestUser !== null

  return (
    <div className="fixed inset-x-3 sm:left-auto sm:right-6 bottom-[calc(7rem+env(safe-area-inset-bottom))] lg:bottom-8 z-30 flex flex-col items-end gap-2 pointer-events-none">
      {isBarVisible ? (
        <>
          <FloatingEmojiLayer
            emojis={floating}
            className="floating-emoji-area absolute bottom-full inset-x-4 h-56 text-3xl"
          />
          {hasError && (
            <p
              role="alert"
              className="pointer-events-auto px-3 py-1.5 rounded-full bg-rose-700 text-white text-xs font-semibold shadow-md">
              A reação não chegou ao telão. Verifique a internet.
            </p>
          )}
          <div
            role="group"
            aria-label="Reagir no telão"
            className="pointer-events-auto w-full sm:w-96 flex items-center p-1 rounded-full bg-white border border-sage-200 shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {REACTIONS.map(({ emoji, label }) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleReact(emoji)}
                aria-label={label}
                title={label}
                className="flex-1 min-w-0 h-11 text-2xl rounded-full hover:bg-sage-100 active:scale-125 transition-transform touch-manipulation">
                {emoji}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar reações"
              className="flex-1 min-w-0 h-11 flex items-center justify-center rounded-full text-sage-700 hover:bg-sage-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="pointer-events-auto min-h-11 px-4 inline-flex items-center gap-2 rounded-full bg-white border border-sage-200 text-sm font-semibold text-sage-900 shadow-lg hover:bg-sage-100 transition-colors">
          <SmilePlus className="w-5 h-5 text-gold-600" />
          Reagir no telão
        </button>
      )}
    </div>
  )
}
