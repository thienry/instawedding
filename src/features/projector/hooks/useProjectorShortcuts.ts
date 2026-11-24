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
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])
}
