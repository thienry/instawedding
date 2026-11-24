import type { PhotoFrameId } from '@/utils/photo-filters'

const CURRENT_DATE_STR = new Date().toLocaleDateString('pt-BR')
const CURRENT_YEAR = new Date().getFullYear()

interface FrameOverlayProps {
  readonly frameId: PhotoFrameId
}

/** Approximates the frame that will be rendered into the photo. */
export function FrameOverlay({ frameId }: FrameOverlayProps) {
  return (
    <>
      {frameId === 'cinema' && (
        <>
          <div className="absolute top-0 inset-x-0 h-7 bg-[#05070a] pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-7 bg-[#05070a] flex items-center justify-between px-4 text-[11px] text-white/85 font-mono pointer-events-none">
            <span className="font-semibold text-white">● REC THIAGO &amp; PRISCILA</span>
            <span>{CURRENT_DATE_STR}</span>
          </div>
        </>
      )}

      {frameId === 'golden-border' && (
        <div className="absolute inset-2.5 border-2 border-amber-400 rounded-xl pointer-events-none shadow-[0_0_8px_rgba(251,191,36,0.5)]">
          <div className="absolute inset-1 border border-amber-200/60 rounded-lg" />
        </div>
      )}

      {frameId === 'minimal-floral' && (
        <div className="absolute bottom-0 inset-x-0 h-11 bg-gradient-to-t from-black/75 to-transparent flex items-end justify-center pb-2.5 pointer-events-none">
          <span className="font-serif italic text-white text-xs sm:text-sm drop-shadow-xs">
            💍 Thiago &amp; Priscila • {CURRENT_YEAR}
          </span>
        </div>
      )}
    </>
  )
}
