import { useEffect, useRef } from 'react'

import { getAdminAuthService } from '@/services/admin-auth.factory'
import { getGuestAuthService } from '@/services/guest-auth.factory'

export const INACTIVITY_STORAGE_KEY = 'instawedding_last_active_at'

const DEFAULT_TIMEOUT_HOURS = 4
const DEFAULT_TIMEOUT_MS = DEFAULT_TIMEOUT_HOURS * 60 * 60 * 1000
const THROTTLE_WRITE_MS = 30_000
const CHECK_INTERVAL_MS = 30_000

export interface UseInactivityTimeoutOptions {
  /**
   * Timeout in milliseconds of user inactivity before logging out.
   * Defaults to 4 hours (or VITE_INACTIVITY_TIMEOUT_HOURS env var).
   */
  readonly timeoutMs?: number
  /**
   * Whether the inactivity timer is active.
   * Defaults to true.
   */
  readonly enabled?: boolean
  /**
   * Optional callback triggered right after auto-logout occurs.
   */
  readonly onTimeout?: () => void
}

function resolveConfiguredTimeout(): number {
  const envHours = import.meta.env.VITE_INACTIVITY_TIMEOUT_HOURS
  if (typeof envHours === 'string' && envHours.trim().length > 0) {
    const parsed = Number(envHours)
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 60 * 60 * 1000
    }
  }
  return DEFAULT_TIMEOUT_MS
}

export function getLastActivityTimestamp(): number {
  if (typeof localStorage === 'undefined') return Date.now()
  const raw = localStorage.getItem(INACTIVITY_STORAGE_KEY)
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isNaN(parsed) ? 0 : parsed
}

export function setLastActivityTimestamp(timestamp: number = Date.now()): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(INACTIVITY_STORAGE_KEY, String(timestamp))
}

export function clearLastActivityTimestamp(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(INACTIVITY_STORAGE_KEY)
}

/**
 * Tracks user interactions and automatically logs out authenticated guests and admins
 * after a specified period of continuous inactivity.
 */
export function useInactivityTimeout(options: UseInactivityTimeoutOptions = {}): void {
  const {
    timeoutMs = resolveConfiguredTimeout(),
    enabled = true,
    onTimeout,
  } = options

  const lastWriteRef = useRef<number>(0)
  const isLoggingOutRef = useRef<boolean>(false)

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    const guestAuth = getGuestAuthService()
    const adminAuth = getAdminAuthService()

    const hasAuthenticatedUser = (): boolean => {
      const guest = guestAuth.getCurrentGuest()
      const admin = adminAuth.getCurrentUser()
      return Boolean(guest || admin)
    }

    const performInactivityLogout = async (): Promise<void> => {
      if (isLoggingOutRef.current) return
      isLoggingOutRef.current = true

      try {
        clearLastActivityTimestamp()

        const guest = guestAuth.getCurrentGuest()
        const admin = adminAuth.getCurrentUser()

        const logoutPromises: Promise<void>[] = []
        if (guest) {
          logoutPromises.push(guestAuth.logout())
        }
        if (admin) {
          logoutPromises.push(adminAuth.logout())
        }

        await Promise.allSettled(logoutPromises)
        onTimeout?.()
      } finally {
        isLoggingOutRef.current = false
      }
    }

    const checkInactivity = (): void => {
      if (!hasAuthenticatedUser()) return

      const lastActivity = getLastActivityTimestamp()
      // If user is authenticated but no timestamp exists, initialize it
      if (lastActivity <= 0) {
        setLastActivityTimestamp(Date.now())
        return
      }

      const elapsed = Date.now() - lastActivity
      if (elapsed >= timeoutMs) {
        void performInactivityLogout()
      }
    }

    const recordActivity = (force = false): void => {
      if (!hasAuthenticatedUser()) return

      const now = Date.now()
      if (!force && now - lastWriteRef.current < THROTTLE_WRITE_MS) {
        return
      }

      lastWriteRef.current = now
      setLastActivityTimestamp(now)
    }

    // Initial check on mount
    checkInactivity()
    if (hasAuthenticatedUser() && getLastActivityTimestamp() <= 0) {
      recordActivity(true)
    }

    // Listen to user auth changes: when someone logs in, record fresh activity timestamp
    const unsubscribeGuest = guestAuth.onAuthStateChange((user) => {
      if (user) {
        recordActivity(true)
      } else if (!adminAuth.getCurrentUser()) {
        clearLastActivityTimestamp()
      }
    })

    const unsubscribeAdmin = adminAuth.onAuthStateChange((user) => {
      if (user) {
        recordActivity(true)
      } else if (!guestAuth.getCurrentGuest()) {
        clearLastActivityTimestamp()
      }
    })

    // Listen to user activity events
    const handleUserInteraction = (): void => {
      recordActivity()
    }

    const interactionEvents: (keyof WindowEventMap)[] = [
      'click',
      'keydown',
      'scroll',
      'touchstart',
      'mousemove',
    ]

    for (const eventName of interactionEvents) {
      window.addEventListener(eventName, handleUserInteraction, { passive: true })
    }

    // Sync across browser tabs
    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === INACTIVITY_STORAGE_KEY) {
        checkInactivity()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Re-check when window regains visibility or focus (e.g. phone screen unlocked or tab brought back)
    const handleWakeup = (): void => {
      if (document.visibilityState === 'visible') {
        checkInactivity()
        recordActivity()
      }
    }
    document.addEventListener('visibilitychange', handleWakeup)
    window.addEventListener('focus', handleWakeup)

    // Periodic timer to detect idle tab
    const intervalId = window.setInterval(checkInactivity, CHECK_INTERVAL_MS)

    return () => {
      unsubscribeGuest()
      unsubscribeAdmin()

      for (const eventName of interactionEvents) {
        window.removeEventListener(eventName, handleUserInteraction)
      }
      window.removeEventListener('storage', handleStorageChange)
      document.removeEventListener('visibilitychange', handleWakeup)
      window.removeEventListener('focus', handleWakeup)
      window.clearInterval(intervalId)
    }
  }, [enabled, timeoutMs, onTimeout])
}
