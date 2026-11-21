import { useEffect, useRef, useState } from 'react'

/**
 * Acquires and maintains a Screen Wake Lock to prevent the device display
 * from dimming or locking due to inactivity (e.g., while in Projector Mode).
 * Automatically re-acquires the lock when the tab regains visibility or on user interaction.
 */
export function useWakeLock(enabled: boolean = true): boolean {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!enabled) return
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return

    let isDisposed = false

    const requestWakeLock = async (): Promise<void> => {
      if (isDisposed || document.visibilityState !== 'visible') return
      if (sentinelRef.current && !sentinelRef.current.released) return

      try {
        const sentinel = await navigator.wakeLock.request('screen')
        if (isDisposed) {
          await sentinel.release()
          return
        }

        sentinelRef.current = sentinel
        setIsLocked(true)

        sentinel.addEventListener('release', () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null
          }
          if (!isDisposed) {
            setIsLocked(false)
          }
        })
      } catch {
        // Browser may reject wakeLock before user gesture or under low-battery policy;
        // interaction and visibility listeners below will retry automatically.
        if (!isDisposed) {
          setIsLocked(false)
        }
      }
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock()
      }
    }

    const handleUserInteraction = (): void => {
      if (!sentinelRef.current || sentinelRef.current.released) {
        void requestWakeLock()
      }
    }

    void requestWakeLock()

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('click', handleUserInteraction, { passive: true })
    window.addEventListener('keydown', handleUserInteraction, { passive: true })
    window.addEventListener('touchstart', handleUserInteraction, {
      passive: true,
    })

    return () => {
      isDisposed = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('click', handleUserInteraction)
      window.removeEventListener('keydown', handleUserInteraction)
      window.removeEventListener('touchstart', handleUserInteraction)

      const activeSentinel = sentinelRef.current
      sentinelRef.current = null
      setIsLocked(false)

      if (activeSentinel && !activeSentinel.released) {
        void activeSentinel.release().catch(() => {})
      }
    }
  }, [enabled])

  return isLocked
}
