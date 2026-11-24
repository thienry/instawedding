import { canvasToFile } from '@/utils/canvas-file'
import { drawPaper } from '@/utils/guestbook-art'
import { ellipsize, fitText } from '@/utils/guestbook-text'

type GuestbookThemeId = 'ivory' | 'forest' | 'rose' | 'night'

export interface GuestbookTheme {
  readonly id: GuestbookThemeId
  readonly label: string
  /** Gradient of the paper. */
  readonly paper: readonly [string, string]
  readonly ink: string
  readonly accent: string
  readonly leaves: readonly string[]
  /** Outer and inner petals. */
  readonly flowers: readonly [string, string]
}

const IVORY: GuestbookTheme = {
  id: 'ivory',
  label: 'Marfim',
  paper: ['#fdfaf3', '#f5eee0'],
  ink: '#2b3a2f',
  accent: '#9a733a',
  leaves: ['#8ba58c', '#a9bda5', '#6f8d73'],
  flowers: ['#f0d9cc', '#f8ebe1'],
}

export const GUESTBOOK_THEMES: readonly GuestbookTheme[] = [
  IVORY,
  {
    id: 'forest',
    label: 'Verde e ouro',
    paper: ['#24422f', '#182d20'],
    ink: '#fbf6ea',
    accent: '#dcbf85',
    leaves: ['#c9aa6b', '#8f9f6d', '#dcc48f'],
    flowers: ['#dcbf85', '#f0dfb6'],
  },
  {
    id: 'rose',
    label: 'Rosé',
    paper: ['#fffaf8', '#fcefeb'],
    ink: '#573538',
    accent: '#ab6460',
    leaves: ['#b3b897', '#cbbf9f', '#d7a79b'],
    flowers: ['#eab6ac', '#f7d9d0'],
  },
  {
    id: 'night',
    label: 'Noite estrelada',
    paper: ['#131a36', '#2d2b54'],
    ink: '#f7f3ff',
    accent: '#ecd294',
    leaves: [],
    flowers: ['#ecd294', '#ffffff'],
  },
]

export const CARD_WIDTH = 1080
export const CARD_HEIGHT = 1350
export const MESSAGE_MAX_LENGTH = 320

const CENTER = CARD_WIDTH / 2
const SERIF = '"Playfair Display", Georgia, serif'
const SCRIPT = '"Great Vibes", "Snell Roundhand", cursive'
const FONT_TIMEOUT_MS = 3000

/** What is written on the card. */
export interface GuestbookCard {
  readonly theme: GuestbookTheme
  readonly message: string
  readonly authorName: string
}

/**
 * Loads the fonts of the card, which the canvas does not wait for. Gives up
 * after a while, since the card can still be drawn with other fonts.
 */
export async function loadCardFonts(): Promise<void> {
  if (!document.fonts) return
  const fonts = [`italic 40px ${SERIF}`, `500 40px ${SERIF}`, `40px ${SCRIPT}`]
  await Promise.race([
    Promise.allSettled(fonts.map((font) => document.fonts.load(font, 'Ação & você'))),
    new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS)),
  ])
}

function drawHeader(ctx: CanvasRenderingContext2D, theme: GuestbookTheme): void {
  ctx.fillStyle = theme.accent
  ctx.font = `92px ${SCRIPT}`
  ctx.fillText('Thiago & Priscila', CENTER, 238, 620)

  ctx.strokeStyle = theme.accent
  ctx.lineWidth = 2
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(CENTER + side * 26, 318)
    ctx.lineTo(CENTER + side * 150, 318)
    ctx.stroke()
  }
  // Heart between the lines
  ctx.beginPath()
  ctx.moveTo(CENTER, 331)
  ctx.bezierCurveTo(CENTER - 26, 314, CENTER - 12, 298, CENTER, 310)
  ctx.bezierCurveTo(CENTER + 12, 298, CENTER + 26, 314, CENTER, 331)
  ctx.fill()
}

function drawMessage(ctx: CanvasRenderingContext2D, { theme, message }: GuestbookCard): void {
  const leading = 1.36
  const { lines, size } = fitText(ctx, message, {
    maxWidth: 760,
    maxHeight: 610,
    minSize: 34,
    maxSize: 84,
    leading,
    toFont: (fontSize) => `italic ${fontSize}px ${SERIF}`,
  })
  const lineHeight = size * leading
  const top = 680 - ((lines.length - 1) * lineHeight) / 2
  ctx.fillStyle = theme.ink
  lines.forEach((line, index) => ctx.fillText(line, CENTER, top + index * lineHeight))
}

function drawSignature(ctx: CanvasRenderingContext2D, { theme, authorName }: GuestbookCard): void {
  ctx.fillStyle = theme.ink
  ctx.font = `italic 34px ${SERIF}`
  ctx.fillText('com carinho,', CENTER, 1050)

  const name = authorName.trim() || 'Convidado especial'
  ctx.fillStyle = theme.accent
  const { lines, size } = fitText(ctx, name, {
    maxWidth: 600,
    maxHeight: 120,
    minSize: 44,
    maxSize: 82,
    leading: 1.2,
    toFont: (fontSize) => `${fontSize}px ${SCRIPT}`,
  })
  const [first = '', ...others] = lines
  const shown = others.length > 0 ? [first, ellipsize(ctx, others.join(' '), 600)] : [first]
  const top = 1142 - ((shown.length - 1) * size * 1.2) / 2
  shown.forEach((line, index) => ctx.fillText(line, CENTER, top + index * size * 1.2))
}

/** Draws the card on a canvas of 1080 by 1350. */
export function drawGuestbookCard(ctx: CanvasRenderingContext2D, card: GuestbookCard): void {
  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT)
  drawPaper(ctx, CARD_WIDTH, CARD_HEIGHT, card.theme)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  drawHeader(ctx, card.theme)
  drawMessage(ctx, card)
  drawSignature(ctx, card)
}

/** Generates the card as an image ready for upload. */
export async function generateGuestbookCardFile(card: GuestbookCard): Promise<File> {
  await loadCardFonts()
  const canvas = document.createElement('canvas')
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context is not available.')
  drawGuestbookCard(ctx, card)
  return canvasToFile(canvas, `recado-${Date.now()}`, 0.92)
}
