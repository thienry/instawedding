import { useEffect, useState } from 'react'

/** Full screen state, as returned by {@link useFullscreen}. */
interface Fullscreen {
  readonly isFullscreen: boolean
  readonly toggle: () => void
}

/** Tracks and toggles the full screen mode of the page. */
export function useFullscreen(): Fullscreen {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleChange = () =>
      setIsFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', handleChange)
    return () => document.removeEventListener('fullscreenchange', handleChange)
  }, [])

  const toggle = () => {
    const change = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen()
    // The browser may refuse it; the state only follows the event
    change.catch(() => {})
  }

  return { isFullscreen, toggle }
}
