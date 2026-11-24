import { useEffect, useState } from 'react'

import { getAdminAuthService } from '@/services/admin-auth.factory'

import type { AdminUser } from '@/services/contracts/admin-auth.contract'

/** Current admin session, as returned by {@link useAdminSession}. */
interface AdminSession {
  /** Signed-in admin or moderator, or `null` when signed out. */
  readonly currentUser: AdminUser | null
  /** Whether the user has full access. Hides UI only: the server authorizes. */
  readonly isAdmin: boolean
  /** True until the stored session has been checked. */
  readonly isVerifying: boolean
  /** Ends the session and clears what it left in `sessionStorage`. */
  readonly signOut: () => Promise<void>
}

/**
 * Tracks who is signed in to the admin area.
 *
 * The auth service subscription is the only source of `currentUser`, so logins
 * and logouts made elsewhere are reflected too.
 */
export function useAdminSession(): AdminSession {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)
  const authService = getAdminAuthService()

  useEffect(() => {
    let isMounted = true

    const unsubscribe = authService.onAuthStateChange((user) => {
      if (isMounted) setCurrentUser(user)
    })
    void authService.checkSession().finally(() => {
      if (isMounted) setIsVerifying(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [authService])

  const signOut = async () => {
    await authService.logout()
    sessionStorage.clear()
  }

  return {
    currentUser,
    isAdmin: currentUser?.role === 'admin',
    isVerifying,
    signOut,
  }
}
