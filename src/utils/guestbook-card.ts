export type GuestbookThemeId = 'emerald' | 'champagne' | 'midnight' | 'pearl'

export interface GuestbookTheme {
  readonly id: GuestbookThemeId
  readonly label: string
  readonly bgGradient: readonly [string, string]
  readonly textColor: string
  readonly accentColor: string
  readonly quoteColor: string
  readonly borderColor: string
}

export const GUESTBOOK_THEMES: readonly GuestbookTheme[] = [
  {
    id: 'emerald',
    label: 'Esmeralda Real',
    bgGradient: ['#0A1C12', '#142E20'],
    textColor: '#FAF8F5',
    accentColor: '#D4AF37',
    quoteColor: 'rgba(212, 175, 55, 0.28)',
    borderColor: 'rgba(212, 175, 55, 0.55)',
  },
  {
    id: 'champagne',
    label: 'Champagne & Rose',
    bgGradient: ['#231715', '#3A2622'],
    textColor: '#FFF6F2',
    accentColor: '#E6C280',
    quoteColor: 'rgba(230, 194, 128, 0.3)',
    borderColor: 'rgba(230, 194, 128, 0.6)',
  },
  {
    id: 'midnight',
    label: 'Azul Imperial',
    bgGradient: ['#090E1E', '#131D3B'],
    textColor: '#F5F7FA',
    accentColor: '#F3D282',
    quoteColor: 'rgba(243, 210, 130, 0.25)',
    borderColor: 'rgba(243, 210, 130, 0.5)',
  },
  {
    id: 'pearl',
    label: 'Marfim & Ouro',
    bgGradient: ['#FAF8F5', '#EFE9DE'],
    textColor: '#1A2E22',
    accentColor: '#9C7A2E',
    quoteColor: 'rgba(156, 122, 46, 0.18)',
    borderColor: 'rgba(156, 122, 46, 0.45)',
  },
] as const

export interface GenerateGuestbookCardOptions {
  readonly authorName: string
  readonly message: string
  readonly themeId?: GuestbookThemeId
  readonly weddingTitle?: string
}

/**
 * Helper to split text into wrapped lines for Canvas rendering
 */
function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const metrics = ctx.measureText(testLine)
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine)
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  if (currentLine) {
    lines.push(currentLine)
  }

  return lines
}

/**
 * Generates an ultra-luxurious 1080x1350 (4:5) guestbook wedding dedication card
 * and returns it as a compressed WebP/JPEG File for direct upload to R2.
 */
export async function generateGuestbookCardFile(
  options: GenerateGuestbookCardOptions
): Promise<File> {
  const { authorName, message, themeId = 'emerald', weddingTitle = 'Thiago & Priscila' } = options

  const theme = GUESTBOOK_THEMES.find((t) => t.id === themeId) ?? GUESTBOOK_THEMES[0]

  const width = 1080
  const height = 1350

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas 2D context is not available.')
  }

  // 1. Background Gradient
  const grad = ctx.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, theme.bgGradient[0])
  grad.addColorStop(1, theme.bgGradient[1])
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  // 2. Subtle Vignette Effect
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.3,
    width / 2,
    height / 2,
    width * 0.8
  )
  vignette.addColorStop(0, 'transparent')
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)

  // 3. Luxury Golden Hairline Frames
  const outerMargin = 40
  const innerMargin = 55

  // Outer border
  ctx.strokeStyle = theme.borderColor
  ctx.lineWidth = 2
  ctx.strokeRect(outerMargin, outerMargin, width - outerMargin * 2, height - outerMargin * 2)

  // Inner border
  ctx.lineWidth = 1
  ctx.strokeRect(innerMargin, innerMargin, width - innerMargin * 2, height - innerMargin * 2)

  // Corner Diamond Accents
  const diamondSize = 10
  const corners = [
    [innerMargin, innerMargin],
    [width - innerMargin, innerMargin],
    [innerMargin, height - innerMargin],
    [width - innerMargin, height - innerMargin],
  ]

  ctx.fillStyle = theme.accentColor
  for (const [cx, cy] of corners) {
    ctx.beginPath()
    ctx.moveTo(cx, cy - diamondSize)
    ctx.lineTo(cx + diamondSize, cy)
    ctx.lineTo(cx, cy + diamondSize)
    ctx.lineTo(cx - diamondSize, cy)
    ctx.closePath()
    ctx.fill()
  }

  // 4. Header: Brand Monogram & Title
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Subtitle Pill
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = theme.accentColor
  ctx.letterSpacing = '5px'
  ctx.fillText('LIVRO DE RECADOS OFICIAL', width / 2, 140)
  ctx.letterSpacing = '0px'

  // Wedding Title (Thiago & Priscila)
  ctx.font = 'italic bold 58px "Playfair Display", serif'
  ctx.fillStyle = theme.textColor
  ctx.fillText(weddingTitle, width / 2, 210)

  // Decorative Golden Line
  ctx.strokeStyle = theme.borderColor
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(width / 2 - 180, 260)
  ctx.lineTo(width / 2 + 180, 260)
  ctx.stroke()

  // Center Ornament
  ctx.font = '24px serif'
  ctx.fillStyle = theme.accentColor
  ctx.fillText('💍', width / 2, 260)

  // 5. Giant Watermark Quotes in Background
  ctx.font = 'italic bold 280px "Playfair Display", serif'
  ctx.fillStyle = theme.quoteColor
  ctx.fillText('“', width / 2 - 280, 520)

  // 6. Message Body Typography (Dynamic sizing based on length)
  const maxContentWidth = width - 240
  const cleanMessage = message.trim()

  let fontSize = 38
  let lineHeight = 58
  if (cleanMessage.length > 220) {
    fontSize = 32
    lineHeight = 48
  } else if (cleanMessage.length < 90) {
    fontSize = 44
    lineHeight = 68
  }

  ctx.font = `italic ${fontSize}px "Playfair Display", serif`
  ctx.fillStyle = theme.textColor

  const wrappedLines = wrapCanvasText(ctx, cleanMessage, maxContentWidth)
  const totalTextHeight = wrappedLines.length * lineHeight
  const startY = height / 2 - totalTextHeight / 2 + 40

  wrappedLines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight)
  })

  // 7. Footer: Dedication Signature & Date
  const footerY = height - 180

  // Divider
  ctx.strokeStyle = theme.borderColor
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width / 2 - 120, footerY - 45)
  ctx.lineTo(width / 2 + 120, footerY - 45)
  ctx.stroke()

  ctx.font = '300 22px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = theme.accentColor
  ctx.fillText('Com todo o carinho e felicitações,', width / 2, footerY)

  ctx.font = 'bold 36px "Playfair Display", serif'
  ctx.fillStyle = theme.textColor
  ctx.fillText(authorName || 'Convidado Especial', width / 2, footerY + 45)

  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  ctx.font = '16px "Plus Jakarta Sans", sans-serif'
  ctx.fillStyle = theme.accentColor
  ctx.fillText(currentDate, width / 2, footerY + 85)

  // 8. Convert to File via Blob
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create Blob from guestbook canvas.'))
          return
        }
        const file = new File(
          [blob],
          `votos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`,
          { type: 'image/webp' }
        )
        resolve(file)
      },
      'image/webp',
      0.92
    )
  })
}
