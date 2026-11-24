import { getAdaptiveNetworkProfile } from '@/utils/blur-placeholder'
import { canvasToFile } from '@/utils/canvas-file'
import { applyColorFilter, supportsCanvasFilter } from '@/utils/color-filter'
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
 * and outputs an optimized File ready for upload, without metadata.
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
  const hasEffects = filterId !== 'none' || frameId !== 'none'

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
      if (filter.cssFilter === 'none' || supportsCanvasFilter()) {
        ctx.filter = filter.cssFilter
        ctx.drawImage(img, x, y, width, height)
        ctx.filter = 'none'
        return
      }
      ctx.drawImage(img, x, y, width, height)
      const photo = ctx.getImageData(x, y, width, height)
      applyColorFilter(photo.data, filter.cssFilter)
      ctx.putImageData(photo, x, y)
    },
    title: weddingTitle,
    subtitle: weddingSubtitle,
  })

  const baseName = originalFilename.replace(/\.[^/.]+$/, '')
  const suffix = hasEffects ? '-filtered' : ''
  return canvasToFile(canvas, `${baseName}${suffix}`, networkProfile.quality)
}
