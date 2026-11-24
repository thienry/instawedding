import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Images,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  QrCode,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import type { useFullscreen } from '@/features/projector/hooks/useFullscreen'
import type { Slideshow } from '@/features/projector/hooks/useSlideshow'
import type { ProjectorFilterMode } from '@/features/projector/types'
import type { LucideIcon } from 'lucide-react'

interface FilterOption {
  readonly mode: ProjectorFilterMode
  readonly label: string
  readonly title: string
  readonly Icon: LucideIcon
}

const FILTERS: readonly FilterOption[] = [
  {
    mode: 'all',
    label: 'Todas',
    title: 'Todas as fotos e vídeos em ordem cronológica',
    Icon: Images,
  },
  {
    mode: 'highlights',
    label: 'Destaques',
    title: 'Fotos e vídeos mais curtidos da noite',
    Icon: Sparkles,
  },
  {
    mode: 'challenges',
    label: 'Desafios',
    title: 'Apenas fotos de desafios cumpridos',
    Icon: Trophy,
  },
]

interface ControlButtonProps {
  readonly title: string
  readonly Icon: LucideIcon
  readonly onClick: () => void
}

function ControlButton({ title, Icon, onClick }: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className="projector-control">
      <Icon className="w-4 h-4" />
    </button>
  )
}

interface OperatorControlsProps {
  readonly isVisible: boolean
  readonly postCount: number
  readonly slideshow: Slideshow
  readonly fullscreen: ReturnType<typeof useFullscreen>
  readonly onOpenQr: () => void
}

/** Controls that float over the stage only while the operator is active. */
export function OperatorControls({
  isVisible,
  postCount,
  slideshow,
  fullscreen,
  onOpenQr,
}: OperatorControlsProps) {
  const { slides, filterMode, isPaused } = slideshow

  return (
    <div className={`projector-controls ${isVisible ? '' : 'projector-controls-hidden'}`}>
      <Link
        to="/admin"
        title="Voltar ao Painel Administrativo"
        aria-label="Voltar ao Painel Administrativo"
        className="projector-control">
        <ArrowLeft className="w-4 h-4" />
      </Link>

      {FILTERS.map(({ mode, label, title, Icon }) => (
        <button
          key={mode}
          type="button"
          onClick={() => slideshow.setFilterMode(mode)}
          title={title}
          aria-label={label}
          aria-pressed={filterMode === mode}
          className="projector-control">
          <Icon className="w-4 h-4" />
          <span className="hidden md:inline">
            {label}
            {mode === 'all' && ` (${postCount})`}
          </span>
        </button>
      ))}

      {slides.length > 1 && (
        <>
          <ControlButton
            title="Foto anterior (←)"
            Icon={ChevronLeft}
            onClick={slideshow.showPrevious}
          />
          <ControlButton
            title={isPaused ? 'Retomar apresentação (Espaço)' : 'Pausar apresentação (Espaço)'}
            Icon={isPaused ? Play : Pause}
            onClick={slideshow.togglePause}
          />
          <ControlButton
            title="Próxima foto (→)"
            Icon={ChevronRight}
            onClick={slideshow.showNext}
          />
        </>
      )}

      <ControlButton title="Ampliar QR Code na tela" Icon={QrCode} onClick={onOpenQr} />
      <ControlButton
        title={fullscreen.isFullscreen ? 'Sair da Tela Cheia (F)' : 'Modo Tela Cheia (F)'}
        Icon={fullscreen.isFullscreen ? Minimize2 : Maximize2}
        onClick={fullscreen.toggle}
      />
    </div>
  )
}
