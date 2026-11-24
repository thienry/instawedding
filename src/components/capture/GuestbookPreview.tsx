import { useEffect, useRef, useState } from 'react'

import { CARD_HEIGHT, CARD_WIDTH, drawGuestbookCard, loadCardFonts } from '@/utils/guestbook-card'

import type { GuestbookTheme } from '@/utils/guestbook-card'

interface GuestbookPreviewProps {
  readonly theme: GuestbookTheme
  readonly message: string
  readonly authorName: string
  /** Description for screen readers. Omit when decorative. */
  readonly label?: string
  readonly className?: string
}

/** The card, drawn exactly as it will be sent. */
export function GuestbookPreview({
  theme,
  message,
  authorName,
  label,
  className = '',
}: GuestbookPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [areFontsReady, setAreFontsReady] = useState(false)

  useEffect(() => {
    let isMounted = true
    void loadCardFonts().then(() => {
      if (isMounted) setAreFontsReady(true)
    })
    return () => {
      isMounted = false
    }
  }, [])

  // Draws again once the fonts arrive
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) drawGuestbookCard(ctx, { theme, message, authorName })
  }, [theme, message, authorName, areFontsReady])

  return (
    <canvas
      ref={canvasRef}
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={className}
    />
  )
}
