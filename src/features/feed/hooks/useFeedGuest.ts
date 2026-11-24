import { useCallback, useState } from 'react'

import { useGuestAuth } from '@/hooks/useGuestAuth'
import { getGuestSession } from '@/utils/session'

import type { GuestUser } from '@/types/domain'

/** Login prompt shown to the guest. */
interface AuthPrompt {
  /** Why the login is needed. Omitted when the guest opened it. */
  readonly reason?: string
}

/** Guest using the feed, as returned by {@link useFeedGuest}. */
export interface FeedGuest {
  readonly guestUser: GuestUser | null
  readonly setGuestUser: (user: GuestUser | null) => void
  /** Anonymous session stored in the browser. */
  readonly sessionId: string
  /** Id used for likes: the signed-in user, or else the anonymous session. */
  readonly likerId: string
  readonly isSigningIn: boolean
  readonly signIn: () => Promise<void>
  /** Open login prompt, or `null` when closed. */
  readonly authPrompt: AuthPrompt | null
  readonly openAuthPrompt: (reason?: string) => void
  readonly closeAuthPrompt: () => void
}

/** Tracks the signed-in guest and the login prompt. */
export function useFeedGuest(): FeedGuest {
  const { guestUser, setGuestUser, isSigningIn, signIn } = useGuestAuth()
  const [authPrompt, setAuthPrompt] = useState<AuthPrompt | null>(null)
  const { sessionId } = getGuestSession()

  const openAuthPrompt = useCallback(
    (reason?: string) => setAuthPrompt({ reason }),
    []
  )

  return {
    guestUser,
    setGuestUser,
    sessionId,
    likerId: guestUser?.id ?? sessionId,
    isSigningIn,
    signIn: async () => {
      await signIn('/')
    },
    authPrompt,
    openAuthPrompt,
    closeAuthPrompt: () => setAuthPrompt(null),
  }
}
