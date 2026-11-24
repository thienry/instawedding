import { useCallback, useEffect, useState } from 'react'

import { getGuestAuthService } from '@/services/guest-auth.factory'
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
  const guestAuthService = getGuestAuthService()
  const [guestUser, setGuestUser] = useState(() =>
    guestAuthService.getCurrentGuest()
  )
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [authPrompt, setAuthPrompt] = useState<AuthPrompt | null>(null)
  const { sessionId } = getGuestSession()

  useEffect(
    () => guestAuthService.onAuthStateChange(setGuestUser),
    [guestAuthService]
  )

  const signIn = async () => {
    setIsSigningIn(true)
    try {
      const result = await guestAuthService.signInWithGoogle('/')
      if (result.user) setGuestUser(result.user)
    } finally {
      setIsSigningIn(false)
    }
  }

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
    signIn,
    authPrompt,
    openAuthPrompt,
    closeAuthPrompt: () => setAuthPrompt(null),
  }
}
