import { AlertCircle, Loader2, Mic, MicOff, RefreshCw, Sparkles, Video, X } from 'lucide-react'

import { useVideoRecorder } from '@/hooks/useVideoRecorder'

interface VideoRecorderModalProps {
  readonly isOpen: boolean
  readonly maxDurationSeconds?: number
  readonly onClose: () => void
  readonly onVideoRecorded: (file: File, durationSeconds: number) => void
}

/** Full-screen short video recorder. */
export function VideoRecorderModal({
  isOpen,
  maxDurationSeconds = 5,
  onClose,
  onVideoRecorded,
}: VideoRecorderModalProps) {
  const {
    videoPreviewRef,
    facingMode,
    includeAudio,
    isInitializing,
    isRecording,
    elapsedMs,
    errorMessage,
    stopTracks,
    startRecording,
    stopRecording,
    toggleFacingMode,
    toggleAudio,
  } = useVideoRecorder({ isOpen, maxDurationSeconds, onClose, onVideoRecorded })

  if (!isOpen) return null

  const progressRatio = Math.min(1, elapsedMs / (maxDurationSeconds * 1000))
  const remainingSeconds = Math.max(0, Math.ceil((maxDurationSeconds * 1000 - elapsedMs) / 1000))

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gravador de vídeo curto"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-in fade-in duration-150">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-lg w-full mx-auto pt-1 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span>
            {includeAudio
              ? `Vídeo com som (${maxDurationSeconds}s)`
              : `Vídeo curto (${maxDurationSeconds}s)`}
          </span>
        </div>

        <button
          type="button"
          disabled={isRecording}
          onClick={() => {
            stopTracks()
            onClose()
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white transition-colors"
          aria-label="Fechar gravador">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="relative flex-1 max-w-lg w-full mx-auto my-3 rounded-3xl overflow-hidden bg-slate-950 border border-white/15 flex items-center justify-center shadow-2xl">
        <video
          ref={videoPreviewRef}
          muted
          playsInline
          autoPlay
          className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
        />

        {isInitializing && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 text-white text-xs font-semibold">
            <Loader2 className="w-6 h-6 animate-spin text-gold-400" />
            <span>Iniciando câmera...</span>
          </div>
        )}

        {errorMessage && (
          <div className="absolute inset-x-4 bg-rose-950/90 border border-rose-500/40 rounded-2xl p-4 text-white text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Recording Live Pill */}
        {isRecording && (
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-600/95 text-white text-xs font-extrabold shadow-lg animate-pulse">
              <span className="w-2 h-2 rounded-full bg-white" />
              <span>GRAVANDO • {remainingSeconds}s</span>
            </div>
          </div>
        )}

        {/* Top-Right Progress Bar */}
        {isRecording && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-white/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-400 to-rose-500 transition-all duration-75"
              style={{ width: `${Math.round(progressRatio * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="max-w-lg w-full mx-auto pb-3 space-y-3 z-10">
        <p className="text-center text-xs text-white/75">
          {isRecording
            ? 'Toque no botão central para concluir antes ou aguarde os 5 segundos.'
            : 'Grave um momento de até 5 segundos!'}
        </p>

        <div className="flex items-center justify-around">
          {/* Audio Toggle */}
          <button
            type="button"
            disabled={isRecording || isInitializing}
            onClick={toggleAudio}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs font-semibold transition-all ${
              includeAudio
                ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                : 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/10'
            } disabled:opacity-40`}>
            {includeAudio ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-[11px]">{includeAudio ? 'Com Som' : 'Sem Som'}</span>
          </button>

          {/* Main Shutter Button */}
          <button
            type="button"
            disabled={isInitializing || Boolean(errorMessage)}
            onClick={isRecording ? stopRecording : startRecording}
            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40">
            <span
              className={`transition-all duration-200 flex items-center justify-center ${
                isRecording
                  ? 'w-8 h-8 rounded-lg bg-rose-500'
                  : 'w-15 h-15 rounded-full bg-rose-500 hover:bg-rose-600'
              }`}>
              {!isRecording && <Video className="w-6 h-6 text-white" />}
            </span>
          </button>

          {/* Switch Camera Front/Back */}
          <button
            type="button"
            disabled={isRecording || isInitializing}
            onClick={toggleFacingMode}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 text-xs font-semibold transition-all disabled:opacity-40">
            <RefreshCw className="w-5 h-5" />
            <span className="text-[11px]">Virar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
