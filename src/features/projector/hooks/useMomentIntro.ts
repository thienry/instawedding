import { useEffect, useState } from 'react'

const INTRO_MS = 10_000

/**
 * Whether the moment that has just gone on air is still being opened.
 *
 * @param key - Changes each time a moment goes on air; `null` without one.
 */
export function useMomentIntro(key: string | null): boolean {
  const [openedKey, setOpenedKey] = useState<string | null>(null)

  useEffect(() => {
    if (key === null) return
    const timeoutId = window.setTimeout(() => setOpenedKey(key), INTRO_MS)
    return () => window.clearTimeout(timeoutId)
  }, [key])

  return key !== null && openedKey !== key
}
