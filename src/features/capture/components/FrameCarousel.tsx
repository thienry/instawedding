import { FrameOverlay } from '@/features/capture/components/FrameOverlay'
import { PHOTO_FRAMES } from '@/utils/photo-filters'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface FrameCarouselProps {
  readonly media: MediaSelection
  readonly previewUrl: string
}

/** Photo frames, previewed on the photo itself. */
export function FrameCarousel({ media, previewUrl }: FrameCarouselProps) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto p-1 scrollbar-none">
      {PHOTO_FRAMES.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={media.frameId === id}
          onClick={() => media.setFrameId(id)}
          className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
            media.frameId === id ? 'ring-2 ring-gold-500 bg-gold-400/15' : 'hover:bg-sage-50'
          }`}>
          <div
            className={`w-18 h-18 overflow-hidden border border-sage-200 ${
              id === 'polaroid' ? 'bg-white p-1 pb-3.5' : 'rounded-xl'
            }`}>
            {/* Drawn at four times the size, so the frame keeps its proportions */}
            <div className="relative w-72 h-72 origin-top-left scale-25">
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              <FrameOverlay frameId={id} />
            </div>
          </div>
          <span className="text-xs font-semibold text-sage-800 max-w-20 truncate">{label}</span>
        </button>
      ))}
    </div>
  )
}
