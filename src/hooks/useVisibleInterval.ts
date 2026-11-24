import { useEffect, useEffectEvent } from 'react'

/** Runs something periodically, and on return, while the page is visible. */
export function useVisibleInterval(callback: () => void, intervalMs: number): void {
  const run = useEffectEvent(callback)

  useEffect(() => {
    const runIfVisible = () => {
      if (document.visibilityState === 'visible') run()
    }
    const intervalId = window.setInterval(runIfVisible, intervalMs)
    document.addEventListener('visibilitychange', runIfVisible)
    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', runIfVisible)
    }
  }, [intervalMs])
}
