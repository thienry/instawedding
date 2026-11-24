import { Video } from 'lucide-react'

interface VideoSummaryProps {
  readonly durationSeconds: number
}

/** Replaces the photo effects when the media is a video. */
export function VideoSummary({ durationSeconds }: VideoSummaryProps) {
  return (
    <div className="bg-white rounded-3xl p-5 border border-sage-200/80 shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gold-400/20 text-sage-900 flex items-center justify-center shrink-0">
          <Video className="w-5 h-5 text-gold-500" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-sage-900">Vídeo curto pronto para envio</h4>
          <p className="text-xs text-sage-800/70">
            Reprodução automática em loop no feed e no telão da festa
          </p>
        </div>
      </div>
      {durationSeconds > 0 && (
        <span className="px-3 py-1 rounded-full bg-sage-100 text-sage-900 text-xs font-bold shrink-0">
          {durationSeconds.toFixed(1)}s
        </span>
      )}
    </div>
  )
}
