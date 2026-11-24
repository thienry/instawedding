import {
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  RefreshCw,
  Sparkles,
  Video,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { normalizeVideoFile } from '@/utils/video'

interface VideoRecorderModalProps {
  readonly isOpen: boolean
  readonly maxDurationSeconds?: number
  readonly onClose: () => void
  readonly onVideoRecorded: (file: File, durationSeconds: number) => void
}

const SUPPORTED_RECORDER_MIME_TYPES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
]

function detectBestRecorderMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  for (const candidate of SUPPORTED_RECORDER_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate
    }
  }
  return ''
}

export function VideoRecorderModal({
  isOpen,
  maxDurationSeconds = 5,
  onClose,
  onVideoRecorded,
}: VideoRecorderModalProps) {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cameraRequestRef = useRef(0)
  const timerIntervalRef = useRef<number | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>(
    'environment'
  )
  const [includeAudio, setIncludeAudio] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const stopTracks = useCallback(() => {
    cameraRequestRef.current += 1
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (recorderRef.current) {
      // The clip is only delivered when the recording is completed
      recorderRef.current.onstop = null
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop()
      } catch {
        // Ignore recorder stop errors during teardown
      }
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setIsRecording(false)
    setElapsedMs(0)
  }, [])

  const startCameraStream = useCallback(
    async (mode: 'environment' | 'user', withAudio: boolean) => {
      stopTracks()
      setIsInitializing(true)
      setErrorMessage(null)

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setErrorMessage(
          'Seu navegador não suporta gravação direta. Use a opção de Vídeo da Câmera/Galeria.'
        )
        setIsInitializing(false)
        return
      }

      // stopTracks starts a new request, so a late camera is turned off
      const request = cameraRequestRef.current
      const isCurrent = () => cameraRequestRef.current === request

      const openCamera = async (audio: boolean) => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio,
        })
        if (!isCurrent()) {
          for (const track of stream.getTracks()) track.stop()
          return
        }
        streamRef.current = stream
        if (!audio) setIncludeAudio(false)
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream
          await videoPreviewRef.current.play().catch(() => {})
        }
      }

      try {
        await openCamera(withAudio).catch((error: unknown) => {
          // Falls back to no audio if the microphone permission was denied
          if (!withAudio || !isCurrent()) throw error
          return openCamera(false)
        })
      } catch {
        if (isCurrent()) {
          setErrorMessage(
            'Permissão de câmera negada ou indisponível. Verifique as permissões do navegador.'
          )
        }
      } finally {
        if (isCurrent()) setIsInitializing(false)
      }
    },
    [stopTracks]
  )

  useEffect(() => {
    if (!isOpen) {
      // The state mirrors the camera, an external system released here
      // oxlint-disable-next-line react/set-state-in-effect
      stopTracks()
      return
    }
    void startCameraStream(facingMode, includeAudio)
    return () => {
      stopTracks()
    }
  }, [isOpen, facingMode, includeAudio, startCameraStream, stopTracks])

  const handleStopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const handleStartRecording = () => {
    const stream = streamRef.current
    if (!stream || isRecording) return

    chunksRef.current = []
    setErrorMessage(null)

    const preferredMimeType = detectBestRecorderMimeType()
    let recorder: MediaRecorder
    try {
      recorder = preferredMimeType
        ? new MediaRecorder(stream, {
            mimeType: preferredMimeType,
            videoBitsPerSecond: 2_500_000,
          })
        : new MediaRecorder(stream, {
            videoBitsPerSecond: 2_500_000,
          })
    } catch {
      recorder = new MediaRecorder(stream)
    }

    const startedAt = Date.now()
    const maxDurationMs = maxDurationSeconds * 1000

    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data)
      }
    }

    recorder.onstop = () => {
      const actualMime = recorder.mimeType || preferredMimeType || 'video/mp4'
      const recordedBlob = new Blob(chunksRef.current, { type: actualMime })
      if (recordedBlob.size === 0) {
        setErrorMessage('Não foi possível capturar o clipe. Tente novamente.')
        return
      }

      const durationSeconds = Math.min(
        maxDurationSeconds,
        Math.max(1, Number(((Date.now() - startedAt) / 1000).toFixed(1)))
      )
      const rawFile = new File([recordedBlob], `clipe-${Date.now()}.mp4`, {
        type: actualMime,
        lastModified: Date.now(),
      })
      const cleanFile = normalizeVideoFile(rawFile)
      stopTracks()
      onVideoRecorded(cleanFile, durationSeconds)
      onClose()
    }

    recorderRef.current = recorder
    recorder.start(200)
    setIsRecording(true)
    setElapsedMs(0)

    timerIntervalRef.current = window.setInterval(() => {
      const currentElapsed = Date.now() - startedAt
      if (currentElapsed >= maxDurationMs) {
        setElapsedMs(maxDurationMs)
        handleStopRecording()
      } else {
        setElapsedMs(currentElapsed)
      }
    }, 50)
  }

  const handleToggleFacingMode = () => {
    if (isRecording) return
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const handleToggleAudio = () => {
    if (isRecording) return
    setIncludeAudio((prev) => !prev)
  }

  if (!isOpen) return null

  const progressRatio = Math.min(1, elapsedMs / (maxDurationSeconds * 1000))
  const remainingSeconds = Math.max(
    0,
    Math.ceil((maxDurationSeconds * 1000 - elapsedMs) / 1000)
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Gravador de Boomerang"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 select-none animate-in fade-in duration-150"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-lg w-full mx-auto pt-1 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5 text-gold-400" />
          <span>
            {includeAudio
              ? `Boomerang com Som (${maxDurationSeconds}s)`
              : `Boomerang (${maxDurationSeconds}s)`}
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
          aria-label="Fechar gravador"
        >
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
          className={`w-full h-full object-cover ${
            facingMode === 'user' ? '-scale-x-100' : ''
          }`}
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
            : 'Grave um momento estilo Boomerang de até 5 segundos!'}
        </p>

        <div className="flex items-center justify-around">
          {/* Audio Toggle */}
          <button
            type="button"
            disabled={isRecording || isInitializing}
            onClick={handleToggleAudio}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-2xl text-xs font-semibold transition-all ${
              includeAudio
                ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                : 'bg-white/10 text-white/80 hover:bg-white/15 border border-white/10'
            } disabled:opacity-40`}
          >
            {includeAudio ? (
              <Mic className="w-5 h-5" />
            ) : (
              <MicOff className="w-5 h-5" />
            )}
            <span className="text-[11px]">
              {includeAudio ? 'Com Som' : 'Sem Som'}
            </span>
          </button>

          {/* Main Shutter Button */}
          <button
            type="button"
            disabled={isInitializing || Boolean(errorMessage)}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-95 disabled:opacity-40"
          >
            <span
              className={`transition-all duration-200 flex items-center justify-center ${
                isRecording
                  ? 'w-8 h-8 rounded-lg bg-rose-500'
                  : 'w-15 h-15 rounded-full bg-rose-500 hover:bg-rose-600'
              }`}
            >
              {!isRecording && <Video className="w-6 h-6 text-white" />}
            </span>
          </button>

          {/* Switch Camera Front/Back */}
          <button
            type="button"
            disabled={isRecording || isInitializing}
            onClick={handleToggleFacingMode}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white/80 border border-white/10 text-xs font-semibold transition-all disabled:opacity-40"
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[11px]">Virar</span>
          </button>
        </div>
      </div>
    </div>
  )
}
