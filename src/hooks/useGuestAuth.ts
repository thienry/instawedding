import { useEffect, useState } from 'react'

import { getGuestAuthService } from '@/services/guest-auth.factory'

import type { GuestAuthResult } from '@/services/contracts/guest-auth.contract'
import type { GuestUser } from '@/types/domain'

/** Guest login, as returned by {@link useGuestAuth}. */
export interface GuestAuth {
  readonly guestUser: GuestUser | null
  readonly setGuestUser: (user: GuestUser | null) => void
  readonly isSigningIn: boolean
  /** Starts the Google login, which returns to `redirectPath`. */
  readonly signIn: (redirectPath: string) => Promise<GuestAuthResult>
  readonly signOut: () => Promise<void>
}

/** Tracks the signed-in guest, including logins made elsewhere. */
export function useGuestAuth(): GuestAuth {
  const guestAuthService = getGuestAuthService()
  const [guestUser, setGuestUser] = useState(() =>
    guestAuthService.getCurrentGuest()
  )
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(
    () => guestAuthService.onAuthStateChange(setGuestUser),
    [guestAuthService]
  )

  const signIn = async (redirectPath: string) => {
    setIsSigningIn(true)
    try {
      const result = await guestAuthService.signInWithGoogle(redirectPath)
      if (result.user) setGuestUser(result.user)
      return result
    } finally {
      setIsSigningIn(false)
    }
  }

  const signOut = async () => {
    await guestAuthService.logout()
    setGuestUser(null)
  }

  return { guestUser, setGuestUser, isSigningIn, signIn, signOut }
}
