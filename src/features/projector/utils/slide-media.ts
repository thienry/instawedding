import { SLIDE_DURATION_MS } from '@/features/projector/constants'
import { MAX_VIDEO_DURATION_TOLERANCE_SECONDS, resolvePostMediaType } from '@/utils/video'

import type { SlideMedia } from '@/features/projector/types'
import type { Post } from '@/types/domain'

/** Used when the media cannot be measured. */
const FALLBACK_RATIO = 4 / 3
/** Slower media is shown before it finishes loading. */
const TIMEOUT_MS = 4000
const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_TOLERANCE_SECONDS * 1000

/** Lets a video play to the end, within the limits of the slideshow. */
function getVideoDurationMs(seconds: number): number {
  // Recorded videos may report an infinite duration
  if (!Number.isFinite(seconds)) return MAX_VIDEO_DURATION_MS
  return Math.min(MAX_VIDEO_DURATION_MS, Math.max(SLIDE_DURATION_MS, seconds * 1000))
}

function normalizeRatio(width: number, height: number): number {
  return width > 0 && height > 0 ? width / height : FALLBACK_RATIO
}

function loadImage(url: string): Promise<SlideMedia> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () =>
      resolve({
        ratio: normalizeRatio(image.naturalWidth, image.naturalHeight),
        durationMs: SLIDE_DURATION_MS,
      })
    image.onerror = reject
    image.src = url
  })
}

function loadVideo(url: string): Promise<SlideMedia> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const release = () => {
      video.onloadedmetadata = null
      video.onerror = null
      video.removeAttribute('src')
      video.load()
    }
    video.preload = 'metadata'
    video.muted = true
    video.onloadedmetadata = () => {
      const media = {
        ratio: normalizeRatio(video.videoWidth, video.videoHeight),
        durationMs: getVideoDurationMs(video.duration),
      }
      release()
      resolve(media)
    }
    video.onerror = () => {
      release()
      reject(new Error('Video could not be loaded'))
    }
    video.src = url
  })
}

/**
 * Loads the media of a post.
 *
 * Never rejects: broken or slow media resolves to fallback values, so it
 * cannot stop the slideshow.
 */
export async function loadSlideMedia(post: Post): Promise<SlideMedia> {
  const isVideo = resolvePostMediaType(post) === 'video'
  const fallback: SlideMedia = {
    ratio: FALLBACK_RATIO,
    durationMs: isVideo ? MAX_VIDEO_DURATION_MS : SLIDE_DURATION_MS,
  }
  let timeoutId: number | undefined
  const timeout = new Promise<SlideMedia>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(fallback), TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      isVideo ? loadVideo(post.mediaUrl) : loadImage(post.mediaUrl),
      timeout,
    ])
  } catch {
    return fallback
  } finally {
    window.clearTimeout(timeoutId)
  }
}
