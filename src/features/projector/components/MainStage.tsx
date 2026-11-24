import { StageSlide } from '@/features/projector/components/StageSlide'
import { useCrossfade } from '@/features/projector/hooks/useCrossfade'

import type { Slide } from '@/features/projector/types'

interface MainStageProps {
  readonly slide: Slide
  /** Post presented as having just arrived. */
  readonly newPostId: string | undefined
}

/** Photo or video on display, as large as it fits and never cropped. */
export function MainStage({ slide, newPostId }: MainStageProps) {
  const { layers, removeLeaving } = useCrossfade(slide)

  return (
    <div className="projector-stage absolute inset-0">
      {layers.map(
        ({ slide: { post, ratio }, isLeaving }) =>
          ratio !== null && (
            <StageSlide
              key={post.id}
              post={post}
              ratio={ratio}
              isNew={post.id === newPostId}
              isLeaving={isLeaving}
              onLeft={removeLeaving}
            />
          )
      )}
    </div>
  )
}
