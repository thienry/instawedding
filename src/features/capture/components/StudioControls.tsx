import { Sparkles } from 'lucide-react'
import { useState } from 'react'

import { FilterCarousel } from '@/features/capture/components/FilterCarousel'
import { FrameCarousel } from '@/features/capture/components/FrameCarousel'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface StudioControlsProps {
  readonly media: MediaSelection
  readonly previewUrl: string
}

/** Photo effects: filters and frames. */
export function StudioControls({ media, previewUrl }: StudioControlsProps) {
  const [studioTab, setStudioTab] = useState<'filters' | 'frames'>('filters')

  return (
    <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between border-b border-sage-100 pb-3">
        <div className="flex items-center gap-2 text-sm font-bold text-sage-900">
          <Sparkles className="w-4 h-4 text-gold-500" />
          <span>Efeitos &amp; Molduras</span>
        </div>

        <div className="flex bg-sage-100/90 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStudioTab('filters')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              studioTab === 'filters'
                ? 'bg-white text-sage-900 shadow-xs font-bold'
                : 'text-sage-700 hover:text-sage-900'
            }`}>
            Filtros
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('frames')}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              studioTab === 'frames'
                ? 'bg-white text-sage-900 shadow-xs font-bold'
                : 'text-sage-700 hover:text-sage-900'
            }`}>
            Molduras
          </button>
        </div>
      </div>

      {studioTab === 'filters' ? (
        <FilterCarousel media={media} previewUrl={previewUrl} />
      ) : (
        <FrameCarousel media={media} />
      )}
    </div>
  )
}
