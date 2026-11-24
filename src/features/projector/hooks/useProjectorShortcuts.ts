import { useEffect, useEffectEvent } from 'react'

/** Actions triggered by the keyboard. */
interface ProjectorShortcuts {
  /** Left arrow. */
  readonly onPrevious: () => void
  /** Right arrow. */
  readonly onNext: () => void
  /** Space. */
  readonly onTogglePause: () => void
  /** F. */
  readonly onToggleFullscreen: () => void
  /** Escape. */
  readonly onCloseQr: () => void
}

/** Lets the operator drive the projector from the keyboard. */
export function useProjectorShortcuts(shortcuts: ProjectorShortcuts): void {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    // Leaves the shortcuts of the browser alone, such as Ctrl+F
    if (event.ctrlKey || event.metaKey || event.altKey) return

    switch (event.key) {
      case 'ArrowLeft':
        return shortcuts.onPrevious()
      case 'ArrowRight':
        return shortcuts.onNext()
      case ' ':
        event.preventDefault()
        return shortcuts.onTogglePause()
      case 'f':
      case 'F':
        return shortcuts.onToggleFullscreen()
      case 'Escape':
        return shortcuts.onCloseQr()
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event)
    // Space clicks the focused button when released
    const preventSpaceClick = (event: KeyboardEvent) => {
      if (event.key === ' ') event.preventDefault()
    }
    window.addEventListener('keydown', listener)
    window.addEventListener('keyup', preventSpaceClick)
    return () => {
      window.removeEventListener('keydown', listener)
      window.removeEventListener('keyup', preventSpaceClick)
    }
  }, [])
}
