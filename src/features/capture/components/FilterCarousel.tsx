import { PHOTO_FILTERS } from '@/utils/photo-filters'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface FilterCarouselProps {
  readonly media: MediaSelection
  readonly previewUrl: string
}

/** Photo filters, previewed on the photo itself. */
export function FilterCarousel({ media, previewUrl }: FilterCarouselProps) {
  return (
    <div className="flex items-center gap-2.5 overflow-x-auto p-1 scrollbar-none">
      {PHOTO_FILTERS.map((f) => {
        const isSelected = media.filterId === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => media.setFilterId(f.id)}
            className={`shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
              isSelected ? 'ring-2 ring-sage-900 bg-sage-50' : 'hover:bg-sage-50/60'
            }`}>
            <div className="w-16 h-16 rounded-xl overflow-hidden border border-sage-200 relative shadow-2xs">
              <img
                src={previewUrl}
                alt={f.label}
                className="w-full h-full object-cover"
                style={{ filter: f.cssFilter }}
              />
            </div>
            <span className="text-xs font-semibold text-sage-800 text-center max-w-[80px] truncate">
              {f.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
