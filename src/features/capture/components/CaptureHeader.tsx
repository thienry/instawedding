import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface CaptureHeaderProps {
  /** Whether the post form is on screen. */
  readonly canPost: boolean
  readonly onReset: () => void
}

/** Title bar with the back action. */
export function CaptureHeader({ canPost, onReset }: CaptureHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between gap-3">
      {canPost ? (
        <>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 min-h-11 px-3.5 rounded-2xl whitespace-nowrap bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Trocar mídia</span>
          </button>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-sage-900 truncate">
            Nova Publicação
          </h2>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 min-h-11 px-3.5 rounded-2xl whitespace-nowrap bg-white border border-sage-200 text-sm font-semibold text-sage-800 hover:text-sage-900 hover:bg-sage-100 transition-colors shadow-2xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao feed</span>
          </button>
          <h2 className="font-serif text-lg sm:text-xl font-bold text-sage-900">Postar</h2>
        </>
      )}
    </div>
  )
}
