import { useEffect, useRef, useState } from 'react'

const HIDE_DELAY_MS = 4000

/** Visibility of the controls, as returned by {@link useAutoHideControls}. */
interface AutoHideControls {
  readonly isVisible: boolean
  /** Shows the controls and restarts the delay. */
  readonly reveal: () => void
}

/** Hides the operator controls after a period without pointer activity. */
export function useAutoHideControls(): AutoHideControls {
  const [isVisible, setIsVisible] = useState(true)
  const timeoutRef = useRef<number | undefined>(undefined)

  const scheduleHide = () => {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(
      () => setIsVisible(false),
      HIDE_DELAY_MS
    )
  }

  useEffect(() => {
    scheduleHide()
    return () => window.clearTimeout(timeoutRef.current)
  }, [])

  const reveal = () => {
    setIsVisible(true)
    scheduleHide()
  }

  return { isVisible, reveal }
}
