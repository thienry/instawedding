import type { FloatingEmojis } from '@/hooks/useFloatingEmojis'
import type { CSSProperties } from 'react'

interface FloatingEmojiLayerProps {
  readonly emojis: FloatingEmojis
  /** Place and size of the area, and the size of the emojis. */
  readonly className: string
}

/** Emojis that rise through an area and vanish. */
export function FloatingEmojiLayer({ emojis, className }: FloatingEmojiLayerProps) {
  return (
    <div aria-hidden="true" className={`pointer-events-none ${className}`}>
      {emojis.items.map(({ id, emoji, x, delayMs }) => (
        <span
          key={id}
          data-emoji
          className="floating-emoji"
          style={{ '--x': x, animationDelay: `${delayMs}ms` } as CSSProperties}
          onAnimationEnd={() => emojis.remove(id)}>
          {emoji}
        </span>
      ))}
    </div>
  )
}
