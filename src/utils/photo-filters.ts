export type PhotoFilterId =
  'none' | 'golden' | 'vintage' | 'bw' | 'vivid' | 'dramatic'

export type PhotoFrameId =
  'none' | 'polaroid' | 'golden-border' | 'cinema' | 'minimal-floral'

export interface PhotoFilterOption {
  readonly id: PhotoFilterId
  readonly label: string
  readonly cssFilter: string
  readonly previewColor: string
}

export interface PhotoFrameOption {
  readonly id: PhotoFrameId
  readonly label: string
  readonly iconName?: string
}

export const PHOTO_FILTERS: readonly PhotoFilterOption[] = [
  {
    id: 'none',
    label: 'Normal',
    cssFilter: 'none',
    previewColor: '#e2e8f0',
  },
  {
    id: 'golden',
    label: 'Golden Hour',
    cssFilter: 'sepia(0.28) saturate(1.35) brightness(1.05) contrast(1.05)',
    previewColor: '#fef08a',
  },
  {
    id: 'vintage',
    label: 'Vintage 35mm',
    cssFilter: 'sepia(0.45) contrast(1.15) brightness(0.95) saturate(0.85)',
    previewColor: '#fed7aa',
  },
  {
    id: 'bw',
    label: 'P&B Elegante',
    cssFilter: 'grayscale(1) contrast(1.25) brightness(1.05)',
    previewColor: '#64748b',
  },
  {
    id: 'vivid',
    label: 'Vívido',
    cssFilter: 'saturate(1.45) contrast(1.1) brightness(1.02)',
    previewColor: '#fda4af',
  },
  {
    id: 'dramatic',
    label: 'Cinema Noir',
    cssFilter: 'contrast(1.35) brightness(0.92) saturate(0.7)',
    previewColor: '#334155',
  },
] as const

export const PHOTO_FRAMES: readonly PhotoFrameOption[] = [
  { id: 'none', label: 'Sem Moldura' },
  { id: 'polaroid', label: 'Polaroid Noivos' },
  { id: 'golden-border', label: 'Borda Dourada' },
  { id: 'cinema', label: 'Widescreen' },
  { id: 'minimal-floral', label: 'Elegância Noivos' },
] as const

export function getFilterById(id: PhotoFilterId): PhotoFilterOption {
  return PHOTO_FILTERS.find((f) => f.id === id) || PHOTO_FILTERS[0]
}

export interface RenderPhotoOptions {
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
      reject(
        new Error('Failed to load image for filter processing: ' + String(e))
      )
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
  const {
    filterId,
    frameId,
    weddingTitle = 'Thiago & Priscila',
    weddingSubtitle = 'Nosso Grande Dia • InstaWedding',
    maxDimension = 1440,
  } = options

  const img = await loadImage(sourceUrl)
  const filter = getFilterById(filterId)

  // Compute base scaling
  let srcW = img.naturalWidth || img.width
  let srcH = img.naturalHeight || img.height

  if (srcW > maxDimension || srcH > maxDimension) {
    if (srcW >= srcH) {
      srcH = Math.round((srcH * maxDimension) / srcW)
      srcW = maxDimension
    } else {
      srcW = Math.round((srcW * maxDimension) / srcH)
      srcH = maxDimension
    }
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is not available on this device.')
  }

  if (frameId === 'polaroid') {
    // Polaroid aspect: white border on all sides + large bottom card
    const marginSide = Math.round(srcW * 0.05)
    const marginTop = Math.round(srcW * 0.05)
    const marginBottom = Math.round(srcW * 0.22)

    canvas.width = srcW + marginSide * 2
    canvas.height = srcH + marginTop + marginBottom

    // Background white polaroid body
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Inner subtle drop shadow / border behind photo
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(marginSide - 1, marginTop - 1, srcW + 2, srcH + 2)

    // Draw filtered photo
    ctx.filter = filter.cssFilter
    ctx.drawImage(img, marginSide, marginTop, srcW, srcH)
    ctx.filter = 'none'

    // Text in bottom margin
    const fontSize = Math.max(16, Math.round(srcW * 0.042))
    ctx.fillStyle = '#1e293b'
    ctx.font = `italic 600 ${fontSize}px "Playfair Display", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    const textCenterY = srcH + marginTop + marginBottom * 0.42
    ctx.fillText(weddingTitle, canvas.width / 2, textCenterY)

    const subFontSize = Math.max(11, Math.round(fontSize * 0.48))
    ctx.fillStyle = '#64748b'
    ctx.font = `500 ${subFontSize}px system-ui, -apple-system, sans-serif`
    ctx.fillText(
      weddingSubtitle,
      canvas.width / 2,
      textCenterY + fontSize * 0.8
    )
  } else if (frameId === 'cinema') {
    // Widescreen: top and bottom cinema bars
    const barHeight = Math.round(srcH * 0.1)
    canvas.width = srcW
    canvas.height = srcH

    // Draw filtered photo
    ctx.filter = filter.cssFilter
    ctx.drawImage(img, 0, 0, srcW, srcH)
    ctx.filter = 'none'

    // Letterbox bars
    ctx.fillStyle = '#05070a'
    ctx.fillRect(0, 0, srcW, barHeight)
    ctx.fillRect(0, srcH - barHeight, srcW, barHeight)

    // Timestamp & Title in bottom bar
    const barFontSize = Math.max(12, Math.round(srcW * 0.024))
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.font = `600 ${barFontSize}px system-ui, -apple-system, sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `● REC  ${weddingTitle.toUpperCase()}`,
      Math.round(srcW * 0.04),
      srcH - barHeight / 2
    )

    ctx.textAlign = 'right'
    ctx.font = `400 ${barFontSize * 0.9}px monospace`
    ctx.fillText(
      new Date().toLocaleDateString('pt-BR'),
      srcW - Math.round(srcW * 0.04),
      srcH - barHeight / 2
    )
  } else if (frameId === 'golden-border') {
    // Elegant golden frame inside or surrounding photo
    const borderThickness = Math.max(6, Math.round(srcW * 0.02))
    const inset = Math.max(8, Math.round(srcW * 0.025))

    canvas.width = srcW
    canvas.height = srcH

    // Draw filtered photo
    ctx.filter = filter.cssFilter
    ctx.drawImage(img, 0, 0, srcW, srcH)
    ctx.filter = 'none'

    // Create golden gradient
    const gradient = ctx.createLinearGradient(0, 0, srcW, srcH)
    gradient.addColorStop(0, '#bf953f')
    gradient.addColorStop(0.25, '#fcf6ba')
    gradient.addColorStop(0.5, '#b38728')
    gradient.addColorStop(0.75, '#fbf5b7')
    gradient.addColorStop(1, '#aa771c')

    ctx.strokeStyle = gradient
    ctx.lineWidth = borderThickness
    ctx.strokeRect(
      borderThickness / 2,
      borderThickness / 2,
      srcW - borderThickness,
      srcH - borderThickness
    )

    // Inner fine border line
    ctx.lineWidth = 1.5
    ctx.strokeRect(
      inset + borderThickness,
      inset + borderThickness,
      srcW - (inset + borderThickness) * 2,
      srcH - (inset + borderThickness) * 2
    )
  } else if (frameId === 'minimal-floral') {
    // Modern minimal card with discreet bottom watermark badge
    const badgeHeight = Math.max(28, Math.round(srcH * 0.075))
    canvas.width = srcW
    canvas.height = srcH

    ctx.filter = filter.cssFilter
    ctx.drawImage(img, 0, 0, srcW, srcH)
    ctx.filter = 'none'

    // Subtle dark gradient vignette at the bottom for readability
    const vignette = ctx.createLinearGradient(
      0,
      srcH - badgeHeight * 2,
      0,
      srcH
    )
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.65)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, srcH - badgeHeight * 2, srcW, badgeHeight * 2)

    // Monogram / Text badge
    const textFont = Math.max(12, Math.round(srcW * 0.028))
    ctx.fillStyle = '#ffffff'
    ctx.font = `italic 500 ${textFont}px "Playfair Display", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `💍 ${weddingTitle} • ${new Date().getFullYear()}`,
      srcW / 2,
      srcH - badgeHeight / 2
    )
  } else {
    // None: pure filtered image
    canvas.width = srcW
    canvas.height = srcH

    ctx.filter = filter.cssFilter
    ctx.drawImage(img, 0, 0, srcW, srcH)
    ctx.filter = 'none'
  }

  // Export to WebP Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob from Canvas.'))
          return
        }
        const cleanName =
          originalFilename.replace(/\.[^/.]+$/, '') + '-filtered.webp'
        resolve(
          new File([blob], cleanName, {
            type: 'image/webp',
            lastModified: Date.now(),
          })
        )
      },
      'image/webp',
      0.88
    )
  })
}
