import { ArrowLeft, CheckCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import type { MediaSelection } from '@/features/capture/hooks/useMediaSelection'

interface CaptureHeaderProps {
  readonly media: MediaSelection
  /** Whether the post form is on screen. */
  readonly canPost: boolean
  readonly isSubmitting: boolean
  readonly onReset: () => void
  readonly onPost: () => void
}

/** Title bar with the back and post actions. */
export function CaptureHeader({
  media,
  canPost,
  isSubmitting,
  onReset,
  onPost,
}: CaptureHeaderProps) {
  const navigate = useNavigate()
  const { isVideo, isProcessing } = media

  return (
    <div className="flex items-center justify-between gap-3">
      {canPost ? (
        <>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar mídia</span>
          </button>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-sage-900 truncate">
            Nova Publicação
          </h2>
          <button
            type="button"
            onClick={onPost}
            disabled={isSubmitting || isProcessing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-sage-900 hover:bg-sage-800 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95 shrink-0">
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 text-gold-400" />
            )}
            <span>{isVideo ? 'Postar Vídeo' : 'Postar Foto'}</span>
          </button>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao feed</span>
          </button>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-sage-900">
            Estúdio Fotográfico
          </h2>
        </>
      )}
    </div>
  )
}
