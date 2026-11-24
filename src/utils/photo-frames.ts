import type { PhotoFrameId } from '@/utils/photo-filters'

/** What a frame needs to draw itself around the photo. */
interface FrameContext {
  /** Starts with the size of the photo; a frame may enlarge it. */
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  readonly width: number
  readonly height: number
  /** Draws the filtered photo at a position. */
  readonly drawPhoto: (x: number, y: number) => void
  readonly title: string
  readonly subtitle: string
}

function drawPolaroid({
  canvas,
  ctx,
  width,
  height,
  drawPhoto,
  title,
  subtitle,
}: FrameContext): void {
  // Polaroid aspect: white border on all sides + large bottom card
  const marginSide = Math.round(width * 0.05)
  const marginTop = Math.round(width * 0.05)
  const marginBottom = Math.round(width * 0.22)

  canvas.width = width + marginSide * 2
  canvas.height = height + marginTop + marginBottom

  // Background white polaroid body
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Inner subtle drop shadow / border behind photo
  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(marginSide - 1, marginTop - 1, width + 2, height + 2)

  drawPhoto(marginSide, marginTop)

  // Text in bottom margin
  const fontSize = Math.max(16, Math.round(width * 0.042))
  ctx.fillStyle = '#1e293b'
  ctx.font = `italic 600 ${fontSize}px "Playfair Display", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const textCenterY = height + marginTop + marginBottom * 0.42
  ctx.fillText(title, canvas.width / 2, textCenterY)

  const subFontSize = Math.max(11, Math.round(fontSize * 0.48))
  ctx.fillStyle = '#64748b'
  ctx.font = `500 ${subFontSize}px system-ui, -apple-system, sans-serif`
  ctx.fillText(subtitle, canvas.width / 2, textCenterY + fontSize * 0.8)
}

function drawCinema({ ctx, width, height, drawPhoto, title }: FrameContext): void {
  // Widescreen: top and bottom cinema bars
  const barHeight = Math.round(height * 0.1)

  drawPhoto(0, 0)

  // Letterbox bars
  ctx.fillStyle = '#05070a'
  ctx.fillRect(0, 0, width, barHeight)
  ctx.fillRect(0, height - barHeight, width, barHeight)

  // Timestamp & Title in bottom bar
  const barFontSize = Math.max(12, Math.round(width * 0.024))
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = `600 ${barFontSize}px system-ui, -apple-system, sans-serif`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(`● REC  ${title.toUpperCase()}`, Math.round(width * 0.04), height - barHeight / 2)

  ctx.textAlign = 'right'
  ctx.font = `400 ${barFontSize * 0.9}px monospace`
  ctx.fillText(
    new Date().toLocaleDateString('pt-BR'),
    width - Math.round(width * 0.04),
    height - barHeight / 2
  )
}

function drawGoldenBorder({ ctx, width, height, drawPhoto }: FrameContext): void {
  // Elegant golden frame inside or surrounding photo
  const borderThickness = Math.max(6, Math.round(width * 0.02))
  const inset = Math.max(8, Math.round(width * 0.025))

  drawPhoto(0, 0)

  // Create golden gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height)
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
    width - borderThickness,
    height - borderThickness
  )

  // Inner fine border line
  ctx.lineWidth = 1.5
  ctx.strokeRect(
    inset + borderThickness,
    inset + borderThickness,
    width - (inset + borderThickness) * 2,
    height - (inset + borderThickness) * 2
  )
}

function drawMinimalFloral({ ctx, width, height, drawPhoto, title }: FrameContext): void {
  // Modern minimal card with discreet bottom watermark badge
  const badgeHeight = Math.max(28, Math.round(height * 0.075))

  drawPhoto(0, 0)

  // Subtle dark gradient vignette at the bottom for readability
  const vignette = ctx.createLinearGradient(0, height - badgeHeight * 2, 0, height)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.65)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, height - badgeHeight * 2, width, badgeHeight * 2)

  // Monogram / Text badge
  const textFont = Math.max(12, Math.round(width * 0.028))
  ctx.fillStyle = '#ffffff'
  ctx.font = `italic 500 ${textFont}px "Playfair Display", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`💍 ${title} • ${new Date().getFullYear()}`, width / 2, height - badgeHeight / 2)
}

const FRAMES: Record<PhotoFrameId, (context: FrameContext) => void> = {
  none: ({ drawPhoto }) => drawPhoto(0, 0),
  polaroid: drawPolaroid,
  cinema: drawCinema,
  'golden-border': drawGoldenBorder,
  'minimal-floral': drawMinimalFloral,
}

/** Draws the photo with its frame. */
export function drawFrame(frameId: PhotoFrameId, context: FrameContext): void {
  FRAMES[frameId](context)
}
