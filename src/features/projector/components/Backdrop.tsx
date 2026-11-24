import { useCrossfade } from '@/features/projector/hooks/useCrossfade'
import { resolvePostMediaType } from '@/utils/video'

import type { Slide } from '@/features/projector/types'

interface BackdropProps {
  readonly slide: Slide
}

/**
 * Bathes the room in the colors of the photo on display. Videos keep the plain
 * ground, to avoid decoding them twice.
 */
export function Backdrop({ slide }: BackdropProps) {
  const { layers, removeLeaving } = useCrossfade(slide)

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      {layers.map(({ slide: { post }, isLeaving }) => (
        <div
          key={post.id}
          onAnimationEnd={isLeaving ? removeLeaving : undefined}
          className={`projector-backdrop ${isLeaving ? 'projector-backdrop-leave' : ''}`}
        >
          {resolvePostMediaType(post) === 'image' && (
            <img src={post.mediaUrl} alt="" />
          )}
        </div>
      ))}
      <div className="projector-vignette absolute inset-0" />
    </div>
  )
}
