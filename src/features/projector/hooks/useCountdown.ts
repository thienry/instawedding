import { useEffect, useState } from 'react'

import { getSecondsLeft } from '@/utils/moments'

/** Often enough that each second shows on time. */
const TICK_MS = 200

/** Whole seconds left until `target`, kept up to date. */
export function useSecondsLeft(target: number): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(intervalId)
  }, [target])

  return getSecondsLeft(target, now)
}

/** Whether `time` has come, updating once when it does. `false` while `null`. */
export function useHasReached(time: number | null): boolean {
  const [reached, setReached] = useState<number | null>(null)

  useEffect(() => {
    if (time === null) return
    const timeoutId = window.setTimeout(() => setReached(time), Math.max(0, time - Date.now()))
    return () => window.clearTimeout(timeoutId)
  }, [time])

  return time !== null && reached === time
}
