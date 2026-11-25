import { Loader2 } from 'lucide-react'

import { FrameOverlay } from '@/features/capture/components/FrameOverlay'
import { getFilterById } from '@/utils/photo-filters'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface MediaPreviewProps {
  readonly media: MediaSelection
  readonly previewUrl: string
  readonly isSubmitting: boolean
  readonly onReset: () => void
}

/** Selected media as it will be posted. */
export function MediaPreview({ media, previewUrl, isSubmitting, onReset }: MediaPreviewProps) {
  const { isVideo, isProcessing, filterId, frameId } = media

  return (
    <div className="min-w-0 lg:sticky lg:top-8">
      <div
        className={`relative rounded-3xl overflow-hidden transition-all shadow-sm ${
          !isVideo && frameId === 'polaroid'
            ? 'bg-white p-4 pb-8 border border-sage-200'
            : 'border border-sage-200 bg-black/5'
        }`}>
        <div className="relative rounded-2xl overflow-hidden bg-slate-950/95 flex items-center justify-center max-h-[38vh] sm:max-h-[48vh] lg:max-h-[62vh]">
          {isVideo ? (
            <video
              src={previewUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full max-h-[38vh] sm:max-h-[48vh] lg:max-h-[62vh] object-contain"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Prévia da foto"
              className="w-full max-h-[38vh] sm:max-h-[48vh] lg:max-h-[62vh] object-contain transition-all duration-150"
              style={{ filter: getFilterById(filterId).cssFilter }}
            />
          )}

          {!isVideo && <FrameOverlay frameId={frameId} />}

          {/* On small screens the header has this action */}
          <button
            type="button"
            onClick={onReset}
            disabled={isSubmitting}
            className="hidden lg:block absolute top-3 right-3 bg-black/65 hover:bg-black/85 text-white text-xs font-semibold min-h-11 px-4 rounded-full backdrop-blur-xs transition-colors z-10 shadow-sm">
            {isVideo ? 'Trocar Vídeo' : 'Trocar Foto'}
          </button>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-xs text-white text-sm font-semibold space-x-2 z-20">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Processando mídia...</span>
            </div>
          )}
        </div>

        {/* Bottom text for Polaroid Frame */}
        {!isVideo && frameId === 'polaroid' && (
          <div className="pt-4 text-center space-y-0.5 pointer-events-none">
            <p className="font-serif italic font-bold text-base text-slate-800">
              Thiago &amp; Priscila
            </p>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Nosso Grande Dia • InstaWedding
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
