import type { GuestbookTheme } from '@/utils/guestbook-card'

type Context = CanvasRenderingContext2D

const TAU = Math.PI * 2

/** Same numbers every time, so the preview matches the card. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function drawLeaf(ctx: Context, x: number, y: number, angle: number, length: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(length * 0.3, -length * 0.3, length * 0.8, -length * 0.24, length, 0)
  ctx.bezierCurveTo(length * 0.8, length * 0.24, length * 0.3, length * 0.3, 0, 0)
  ctx.fill()
  ctx.restore()
}

/** Branch that grows from a point, bending gently, with leaves on both sides. */
function drawBranch(
  ctx: Context,
  { x, y, angle, length }: { x: number; y: number; angle: number; length: number },
  colors: readonly string[]
): void {
  const steps = 9
  const bend = 0.6
  let [px, py] = [x, y]

  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  for (let i = 0; i < steps; i++) {
    const direction = angle + bend * (i / steps - 0.5)
    const nx = px + Math.cos(direction) * (length / steps)
    const ny = py + Math.sin(direction) * (length / steps)
    ctx.strokeStyle = colors[0] ?? ''
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(nx, ny)
    ctx.stroke()

    const leaf = length * 0.21 * (1 - i / (steps * 1.7))
    ctx.fillStyle = colors[i % colors.length] ?? ''
    drawLeaf(ctx, nx, ny, direction - 0.85, leaf)
    ctx.fillStyle = colors[(i + 1) % colors.length] ?? ''
    drawLeaf(ctx, nx, ny, direction + 0.85, leaf * 0.9)
    ;[px, py] = [nx, ny]
  }
  ctx.fillStyle = colors[0] ?? ''
  drawLeaf(ctx, px, py, angle + bend / 2, length * 0.13)
}

function drawFlower(ctx: Context, x: number, y: number, radius: number, theme: GuestbookTheme) {
  for (const [scale, color] of [
    [1, theme.flowers[0]],
    [0.68, theme.flowers[1]],
  ] as const) {
    ctx.fillStyle = color
    for (let petal = 0; petal < 6; petal++) {
      const angle = (petal / 6) * TAU + (scale < 1 ? 0.5 : 0)
      const distance = radius * scale * 0.52
      ctx.beginPath()
      ctx.ellipse(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        radius * scale * 0.5,
        radius * scale * 0.36,
        angle,
        0,
        TAU
      )
      ctx.fill()
    }
  }
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  ctx.arc(x, y, radius * 0.17, 0, TAU)
  ctx.fill()
}

function drawCorner(ctx: Context, theme: GuestbookTheme): void {
  const { leaves } = theme
  drawBranch(ctx, { x: 20, y: 170, angle: -0.28, length: 400 }, leaves)
  drawBranch(ctx, { x: 110, y: 40, angle: 1.5, length: 260 }, leaves)
  drawBranch(ctx, { x: 30, y: 60, angle: 0.62, length: 210 }, leaves)
  drawFlower(ctx, 118, 118, 78, theme)
  drawFlower(ctx, 232, 72, 46, theme)
  drawFlower(ctx, 66, 236, 40, theme)
}

function drawWatercolor(ctx: Context, width: number, height: number): void {
  for (const [x, y, radius, color] of [
    [60, 120, 420, '236, 178, 170'],
    [width - 40, height - 120, 460, '240, 190, 176'],
    [width - 120, 160, 260, '246, 214, 196'],
    [160, height - 60, 280, '233, 176, 184'],
  ] as const) {
    const wash = ctx.createRadialGradient(x, y, 0, x, y, radius)
    wash.addColorStop(0, `rgba(${color}, 0.5)`)
    wash.addColorStop(0.65, `rgba(${color}, 0.2)`)
    wash.addColorStop(1, `rgba(${color}, 0)`)
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, width, height)
  }
}

function drawNightSky(ctx: Context, width: number, height: number, theme: GuestbookTheme): void {
  const random = createRandom(12)
  for (let i = 0; i < 150; i++) {
    const x = random() * width
    const y = random() * height
    const size = 0.8 + random() * 2.2
    const isInText = x > 130 && x < width - 130 && y > 320 && y < height - 260
    ctx.globalAlpha = (0.35 + random() * 0.6) * (isInText ? 0.35 : 1)
    ctx.fillStyle = i % 5 === 0 ? theme.accent : '#ffffff'
    ctx.beginPath()
    ctx.arc(x, y, size, 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  const [mx, my, radius] = [width - 128, 122, 60]
  ctx.fillStyle = theme.accent
  ctx.beginPath()
  ctx.arc(mx, my, radius, Math.PI * 0.2, Math.PI * 1.3)
  ctx.arc(mx + 32, my - 26, radius * 0.86, Math.PI * 1.22, Math.PI * 0.28, true)
  ctx.fill()
}

/** Paints the paper and its illustration. */
export function drawPaper(
  ctx: Context,
  width: number,
  height: number,
  theme: GuestbookTheme
): void {
  const paper = ctx.createLinearGradient(0, 0, width * 0.4, height)
  paper.addColorStop(0, theme.paper[0])
  paper.addColorStop(1, theme.paper[1])
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, width, height)

  if (theme.id === 'rose') drawWatercolor(ctx, width, height)
  if (theme.id === 'night') {
    drawNightSky(ctx, width, height, theme)
    return
  }

  drawCorner(ctx, theme)
  // The opposite corner mirrors the first one
  ctx.save()
  ctx.translate(width, height)
  ctx.rotate(Math.PI)
  drawCorner(ctx, theme)
  ctx.restore()
}
