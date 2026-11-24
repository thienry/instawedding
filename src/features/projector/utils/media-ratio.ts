import { resolvePostMediaType } from '@/utils/video'

import type { Post } from '@/types/domain'

/** Used when the media cannot be measured. */
const FALLBACK_RATIO = 4 / 3
/** Slower media is shown before it finishes loading. */
const TIMEOUT_MS = 4000

function measureImage(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image.naturalWidth / image.naturalHeight)
    image.onerror = reject
    image.src = url
  })
}

function measureVideo(url: string): Promise<number> {
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
      const ratio = video.videoWidth / video.videoHeight
      release()
      resolve(ratio)
    }
    video.onerror = () => {
      release()
      reject(new Error('Video could not be loaded'))
    }
    video.src = url
  })
}

/**
 * Loads the media of a post and returns its width divided by its height.
 *
 * Never rejects: broken or slow media resolves to a fallback ratio, so it
 * cannot stop the slideshow.
 */
export async function loadMediaRatio(post: Post): Promise<number> {
  let timeoutId: number | undefined
  const timeout = new Promise<number>((resolve) => {
    timeoutId = window.setTimeout(() => resolve(FALLBACK_RATIO), TIMEOUT_MS)
  })
  const measurement =
    resolvePostMediaType(post) === 'video'
      ? measureVideo(post.mediaUrl)
      : measureImage(post.mediaUrl)

  try {
    const ratio = await Promise.race([measurement, timeout])
    return Number.isFinite(ratio) && ratio > 0 ? ratio : FALLBACK_RATIO
  } catch {
    return FALLBACK_RATIO
  } finally {
    window.clearTimeout(timeoutId)
  }
}
