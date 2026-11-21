import type { PostMediaType } from '@/types/domain'

export const MAX_VIDEO_DURATION_SECONDS = 10
export const MAX_VIDEO_DURATION_TOLERANCE_SECONDS = 10.8
export const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v']

export class VideoValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'VideoValidationError'
  }
}

/**
 * Strips codec parameters from a MIME type string (e.g. "video/webm;codecs=vp9" -> "video/webm").
 */
export function normalizeMimeType(mimeType: string): string {
  return (mimeType.split(';')[0] ?? '').trim().toLowerCase()
}

/**
 * Checks whether a File or Blob is a supported video format.
 */
export function isVideoFile(file: File | Blob): boolean {
  const mime = normalizeMimeType(file.type)
  if (mime.startsWith('video/')) {
    return true
  }
  if ('name' in file && typeof file.name === 'string') {
    const lowerName = file.name.toLowerCase()
    return VIDEO_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  }
  return false
}

/**
 * Checks whether a media URL points to a video asset (by extension or data URL prefix).
 */
export function isVideoUrl(url: string): boolean {
  if (!url) return false
  const lower = url.toLowerCase()
  if (lower.startsWith('data:video/')) {
    return true
  }
  const cleanPath = (lower.split('?')[0] ?? '').split('#')[0] ?? ''
  return VIDEO_EXTENSIONS.some((ext) => cleanPath.endsWith(ext))
}

/**
 * Resolves the media type of a post from explicit metadata or URL inspection.
 */
export function resolvePostMediaType(post: {
  readonly mediaUrl: string
  readonly mediaType?: PostMediaType
}): PostMediaType {
  if (post.mediaType === 'video' || post.mediaType === 'image') {
    return post.mediaType
  }
  return isVideoUrl(post.mediaUrl) ? 'video' : 'image'
}

export interface VideoValidationResult {
  readonly valid: boolean
  readonly durationSeconds: number
  readonly errorMessage?: string
}

/**
 * Validates that a video file respects maximum file size (25 MB).
 */
export async function validateVideoFile(
  file: File
): Promise<VideoValidationResult> {
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      durationSeconds: 0,
      errorMessage: `O vídeo tem ${sizeMb}MB e excede o limite máximo permitido de 25MB.`,
    }
  }

  if (typeof document === 'undefined') {
    return { valid: true, durationSeconds: 0 }
  }

  const durationSeconds = await getVideoDuration(file)

  return {
    valid: true,
    durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : 0,
  }
}

/**
 * Reads the duration in seconds of a video Blob/File using an offscreen HTMLVideoElement.
 */
export function getVideoDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(0)
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    const cleanup = () => {
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
    }

    const timeoutId = window.setTimeout(() => {
      cleanup()
      resolve(0)
    }, 4500)

    video.onloadedmetadata = () => {
      // Chrome MediaRecorder WebM blobs sometimes report Infinity duration on initial metadata load
      if (video.duration === Infinity) {
        video.currentTime = 1e101
        video.ontimeupdate = () => {
          video.ontimeupdate = null
          window.clearTimeout(timeoutId)
          const resolvedDuration = Number.isFinite(video.duration)
            ? video.duration
            : 0
          cleanup()
          resolve(resolvedDuration)
        }
        return
      }

      window.clearTimeout(timeoutId)
      const d = Number.isFinite(video.duration) ? video.duration : 0
      cleanup()
      resolve(d)
    }

    video.onerror = () => {
      window.clearTimeout(timeoutId)
      cleanup()
      resolve(0)
    }

    video.src = objectUrl
  })
}

/**
 * Extracts a compact WebP thumbnail/poster Data URL from the first available video frame.
 */
export function extractVideoPoster(
  file: Blob,
  maxWidth: number = 360
): Promise<string> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve('')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    let settled = false
    const finish = (dataUrl: string) => {
      if (settled) return
      settled = true
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(objectUrl)
      resolve(dataUrl)
    }

    const timeoutId = window.setTimeout(() => {
      finish('')
    }, 4000)

    const captureFrame = () => {
      try {
        const rawWidth = video.videoWidth || 360
        const rawHeight = video.videoHeight || 640
        const scale = Math.min(1, maxWidth / rawWidth)
        const width = Math.max(1, Math.round(rawWidth * scale))
        const height = Math.max(1, Math.round(rawHeight * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          window.clearTimeout(timeoutId)
          finish('')
          return
        }

        ctx.drawImage(video, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/webp', 0.65)
        window.clearTimeout(timeoutId)
        finish(dataUrl)
      } catch {
        window.clearTimeout(timeoutId)
        finish('')
      }
    }

    video.onloadeddata = () => {
      if (video.readyState >= 2) {
        video.currentTime = Math.min(0.15, (video.duration || 1) * 0.1)
      }
    }

    video.onseeked = () => {
      captureFrame()
    }

    video.onerror = () => {
      window.clearTimeout(timeoutId)
      finish('')
    }

    video.src = objectUrl
  })
}

/**
 * Normalizes a recorded or selected video File so its MIME type has no codec parameters
 * and its filename extension matches the container format.
 */
export function normalizeVideoFile(file: File): File {
  const cleanMime = normalizeMimeType(file.type) || 'video/mp4'
  const extMap: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  const targetExt = extMap[cleanMime] ?? 'mp4'
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'wedding-video'
  const normalizedName = `${baseName}.${targetExt}`

  if (file.type === cleanMime && file.name === normalizedName) {
    return file
  }

  return new File([file], normalizedName, {
    type: cleanMime,
    lastModified: file.lastModified,
  })
}
