import { useCallback, useEffect, useRef, useState } from 'react'

import { normalizeVideoFile } from '@/utils/video'

import type { RefObject } from 'react'

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

interface VideoRecorderOptions {
  /** Whether the camera should be on. */
  readonly isOpen: boolean
  readonly maxDurationSeconds: number
  readonly onClose: () => void
  readonly onVideoRecorded: (file: File, durationSeconds: number) => void
}

/** Camera and recording, as returned by {@link useVideoRecorder}. */
interface VideoRecorder {
  /** Element that shows the camera. */
  readonly videoPreviewRef: RefObject<HTMLVideoElement | null>
  readonly facingMode: 'environment' | 'user'
  readonly includeAudio: boolean
  readonly isInitializing: boolean
  /** Whether the camera is on. */
  readonly isCameraReady: boolean
  readonly isRecording: boolean
  readonly elapsedMs: number
  readonly errorMessage: string | null
  /** Turns the camera off, discarding an unfinished clip. */
  readonly stopTracks: () => void
  readonly startRecording: () => void
  /** Finishes the clip and delivers it. */
  readonly stopRecording: () => void
  readonly toggleFacingMode: () => void
  readonly toggleAudio: () => void
}

/** Records short clips from the device camera. */
export function useVideoRecorder({
  isOpen,
  maxDurationSeconds,
  onClose,
  onVideoRecorded,
}: VideoRecorderOptions): VideoRecorder {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cameraRequestRef = useRef(0)
  const timerIntervalRef = useRef<number | null>(null)

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [includeAudio, setIncludeAudio] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isCameraReady, setIsCameraReady] = useState(false)
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
    setIsCameraReady(false)
    setIsRecording(false)
    setElapsedMs(0)
  }, [])

  const startCameraStream = useCallback(
    async (mode: 'environment' | 'user', withAudio: boolean) => {
      stopTracks()
      setIsInitializing(true)
      setErrorMessage(null)

      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
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
        setIsCameraReady(true)
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

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop()
    }
    setIsRecording(false)
  }, [])

  const startRecording = () => {
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
        stopRecording()
      } else {
        setElapsedMs(currentElapsed)
      }
    }, 50)
  }

  const toggleFacingMode = () => {
    if (isRecording) return
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  const toggleAudio = () => {
    if (isRecording) return
    setIncludeAudio((prev) => !prev)
  }

  return {
    videoPreviewRef,
    facingMode,
    includeAudio,
    isInitializing,
    isCameraReady,
    isRecording,
    elapsedMs,
    errorMessage,
    stopTracks,
    startRecording,
    stopRecording,
    toggleFacingMode,
    toggleAudio,
  }
}
