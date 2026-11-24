import { useRef, useState } from 'react'

import { compressPhoto } from '@/utils/compressor'
import { renderFilteredAndFramedPhoto } from '@/utils/photo-renderer'
import { isVideoFile, normalizeVideoFile, validateVideoFile } from '@/utils/video'

import type { PhotoFilterId, PhotoFrameId } from '@/utils/photo-filters'

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024

/** Media being prepared, as returned by {@link useMediaSelection}. */
export interface MediaSelection {
  /** Object URL of the selected media, or `null` when there is none. */
  readonly previewUrl: string | null
  readonly isVideo: boolean
  /** Video length in seconds; 0 for photos. */
  readonly videoDuration: number
  /** True while the media is being validated, compressed or rendered. */
  readonly isProcessing: boolean
  readonly filterId: PhotoFilterId
  readonly setFilterId: (id: PhotoFilterId) => void
  readonly frameId: PhotoFrameId
  readonly setFrameId: (id: PhotoFrameId) => void
  /** Takes a file from the camera or the gallery. */
  readonly selectFile: (file: File) => Promise<void>
  readonly selectRecording: (file: File, durationSeconds: number) => void
  readonly selectCard: (file: File) => void
  /** File to upload with the effects applied, or `null` without media. */
  readonly prepareFile: () => Promise<File | null>
  /** Frees the preview without clearing the selection. */
  readonly releasePreview: () => void
  readonly clear: () => void
}

/**
 * Holds the photo or video to post and its effects.
 *
 * @param onError - Receives the message to show when a file is refused.
 */
export function useMediaSelection(onError: (message: string) => void): MediaSelection {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [compressedFile, setCompressedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isVideo, setIsVideo] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [filterId, setFilterId] = useState<PhotoFilterId>('none')
  const [frameId, setFrameId] = useState<PhotoFrameId>('none')

  // Async results of a selection that was replaced must be dropped
  const selectionRef = useRef(0)

  const startSelection = () => {
    selectionRef.current += 1
    setIsProcessing(false)
    return selectionRef.current
  }

  const releasePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }

  const resetEffects = () => {
    setFilterId('none')
    setFrameId('none')
  }

  const showVideo = (file: File, durationSeconds: number) => {
    const normalized = normalizeVideoFile(file)
    setIsVideo(true)
    setVideoDuration(durationSeconds)
    setSelectedFile(normalized)
    setCompressedFile(normalized)
    setPreviewUrl(URL.createObjectURL(normalized))
  }

  const showPhoto = (file: File) => {
    setIsVideo(false)
    setVideoDuration(0)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const selectFile = async (file: File) => {
    const selection = startSelection()
    const isCurrent = () => selectionRef.current === selection

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
      onError(`O arquivo selecionado tem ${sizeMb}MB e excede o limite máximo permitido de 25MB.`)
      return
    }

    setIsProcessing(true)
    try {
      if (isVideoFile(file)) {
        const validation = await validateVideoFile(file)
        if (!isCurrent()) return
        if (validation.valid) showVideo(file, validation.durationSeconds)
        else onError(validation.errorMessage ?? 'Vídeo inválido.')
        return
      }
      showPhoto(file)
      // Falls back to the original when compression hits an edge case
      const compressed = await compressPhoto(file).catch(() => file)
      if (isCurrent()) setCompressedFile(compressed)
    } finally {
      if (isCurrent()) setIsProcessing(false)
    }
  }

  const selectRecording = (file: File, durationSeconds: number) => {
    startSelection()
    releasePreview()
    showVideo(file, durationSeconds)
  }

  const selectCard = (file: File) => {
    startSelection()
    releasePreview()
    resetEffects()
    showPhoto(file)
    setCompressedFile(file)
  }

  const prepareFile = async () => {
    const hasEffects = filterId !== 'none' || frameId !== 'none'
    if (isVideo || !previewUrl || !hasEffects) {
      return compressedFile ?? selectedFile
    }

    setIsProcessing(true)
    // The compressed file spares the canvas from decoding a 12 MP original
    const sourceUrl = compressedFile ? URL.createObjectURL(compressedFile) : previewUrl
    try {
      return await renderFilteredAndFramedPhoto(
        sourceUrl,
        selectedFile?.name || 'wedding-photo.jpg',
        { filterId, frameId, weddingTitle: 'Thiago & Priscila' }
      )
    } finally {
      if (sourceUrl !== previewUrl) URL.revokeObjectURL(sourceUrl)
      setIsProcessing(false)
    }
  }

  const clear = () => {
    startSelection()
    releasePreview()
    resetEffects()
    setSelectedFile(null)
    setCompressedFile(null)
    setPreviewUrl(null)
    setIsVideo(false)
    setVideoDuration(0)
  }

  return {
    previewUrl,
    isVideo,
    videoDuration,
    isProcessing,
    filterId,
    setFilterId,
    frameId,
    setFrameId,
    selectFile,
    selectRecording,
    selectCard,
    prepareFile,
    releasePreview,
    clear,
  }
}
