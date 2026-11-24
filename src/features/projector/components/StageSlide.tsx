import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'
import type { AnimationEvent, CSSProperties } from 'react'

const REVEALS = [
  'projector-reveal-curtain',
  'projector-reveal-iris',
  'projector-reveal-rise',
  'projector-reveal-sweep',
]

/** Varies the reveal between posts, always the same for a given post. */
function pickReveal(postId: string): string | undefined {
  const sum = [...postId].reduce((total, char) => total + char.charCodeAt(0), 0)
  return REVEALS[sum % REVEALS.length]
}

interface StageSlideProps {
  readonly post: Post
  /** Width divided by height of the media. */
  readonly ratio: number
  /** Adds a golden glow. */
  readonly isNew: boolean
  readonly isLeaving: boolean
  /** Called when the leaving animation ends. */
  readonly onLeft: () => void
}

/** Media of a post in its frame, with the reveal and the leaving animation. */
export function StageSlide({
  post,
  ratio,
  isNew,
  isLeaving,
  onLeft,
}: StageSlideProps) {
  const handleAnimationEnd = (event: AnimationEvent) => {
    // Animations of the children bubble up to here
    if (isLeaving && event.target === event.currentTarget) onLeft()
  }

  return (
    <div
      onAnimationEnd={handleAnimationEnd}
      className={`absolute inset-0 grid place-items-center ${
        isLeaving ? 'projector-slide-leave' : ''
      }`}
    >
      <div
        style={{ '--ratio': ratio } as CSSProperties}
        className="projector-frame"
      >
        <div className="projector-frame-shadow" />
        {isNew && <div className="projector-frame-glow" />}
        <div className={`projector-reveal ${pickReveal(post.id)}`}>
          {resolvePostMediaType(post) === 'video' ? (
            <video src={post.mediaUrl} autoPlay muted loop playsInline />
          ) : (
            <img
              src={post.mediaUrl}
              alt={post.caption || `Foto por ${post.authorName}`}
            />
          )}
        </div>
      </div>
    </div>
  )
}
