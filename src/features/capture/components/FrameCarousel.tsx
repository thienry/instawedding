import { PHOTO_FRAMES } from '@/utils/photo-filters'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface FrameCarouselProps {
  readonly media: MediaSelection
}

/** Photo frames. */
export function FrameCarousel({ media }: FrameCarouselProps) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
      {PHOTO_FRAMES.map((fr) => {
        const isSelected = media.frameId === fr.id
        return (
          <button
            key={fr.id}
            type="button"
            onClick={() => media.setFrameId(fr.id)}
            className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
              isSelected
                ? 'ring-2 ring-gold-500 bg-gold-400/15'
                : 'hover:bg-sage-50/60'
            }`}
          >
            <div className="w-16 h-16 rounded-xl bg-sage-100 flex items-center justify-center border border-sage-200 text-2xl shadow-2xs relative">
              {fr.id === 'none' && '🚫'}
              {fr.id === 'polaroid' && '📷'}
              {fr.id === 'golden-border' && '✨'}
              {fr.id === 'cinema' && '🎬'}
              {fr.id === 'minimal-floral' && '💍'}
              {fr.id === 'minimal-floral' && (
                <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-[9px] font-black uppercase text-white px-1 py-0.2 rounded-full shadow-xs">
                  Oficial
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-sage-800 text-center max-w-[84px] truncate">
              {fr.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
