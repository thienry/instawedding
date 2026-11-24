import { getAdaptiveNetworkProfile } from '@/utils/blur-placeholder'
import { getFilterById } from '@/utils/photo-filters'
import { drawFrame } from '@/utils/photo-frames'

import type { PhotoFilterId, PhotoFrameId } from '@/utils/photo-filters'

interface RenderPhotoOptions {
  readonly filterId: PhotoFilterId
  readonly frameId: PhotoFrameId
  readonly weddingTitle?: string
  readonly weddingSubtitle?: string
  readonly maxDimension?: number
}

/**
 * Loads an image from a URL or ObjectURL into an HTMLImageElement
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) =>
      reject(new Error('Failed to load image for filter processing: ' + String(e)))
    img.src = src
  })
}

/**
 * Applies selected filter and frame to the image on an offscreen Canvas
 * and outputs an optimized WebP File ready for upload.
 */
export async function renderFilteredAndFramedPhoto(
  sourceUrl: string,
  originalFilename: string,
  options: RenderPhotoOptions
): Promise<File> {
  const networkProfile = getAdaptiveNetworkProfile()
  const {
    filterId,
    frameId,
    weddingTitle = 'Thiago & Priscila',
    weddingSubtitle = 'Nosso Grande Dia • InstaWedding',
    maxDimension = networkProfile.maxWidthOrHeight,
  } = options

  const img = await loadImage(sourceUrl)
  const filter = getFilterById(filterId)

  let width = img.naturalWidth || img.width
  let height = img.naturalHeight || img.height

  if (width > maxDimension || height > maxDimension) {
    if (width >= height) {
      height = Math.round((height * maxDimension) / width)
      width = maxDimension
    } else {
      width = Math.round((width * maxDimension) / height)
      height = maxDimension
    }
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is not available on this device.')
  }

  canvas.width = width
  canvas.height = height
  drawFrame(frameId, {
    canvas,
    ctx,
    width,
    height,
    drawPhoto: (x, y) => {
      ctx.filter = filter.cssFilter
      ctx.drawImage(img, x, y, width, height)
      ctx.filter = 'none'
    },
    title: weddingTitle,
    subtitle: weddingSubtitle,
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob from Canvas.'))
          return
        }
        const cleanName = originalFilename.replace(/\.[^/.]+$/, '') + '-filtered.webp'
        resolve(
          new File([blob], cleanName, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
        )
      },
      'image/webp',
      networkProfile.quality
    )
  })
}
