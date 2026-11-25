import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/** Full-screen photo, as returned by {@link useLightbox}. */
interface Lightbox {
  /** Post in the URL, or `null` when closed. */
  readonly postId: string | null
  readonly open: (postId: string) => void
  readonly close: () => void
}

/** Keeps the full-screen photo in the URL, so it can be shared. */
export function useLightbox(): Lightbox {
  const [searchParams, setSearchParams] = useSearchParams()

  const open = (postId: string) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('photoId', postId)
      return next
    })

  const close = useCallback(
    () =>
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('photoId')
          return next
          // Otherwise, going back would open it again
        },
        { replace: true }
      ),
    [setSearchParams]
  )

  return { postId: searchParams.get('photoId'), open, close }
}
