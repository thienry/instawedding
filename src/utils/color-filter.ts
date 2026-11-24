/** Rows of a 3x3 matrix applied to red, green and blue. */
type Matrix = readonly (readonly [number, number, number])[]

const LUMA = [0.2126, 0.7152, 0.0722] as const
const SEPIA: Matrix = [
  [0.393, 0.769, 0.189],
  [0.349, 0.686, 0.168],
  [0.272, 0.534, 0.131],
]

const identity = (row: number, column: number) => (row === column ? 1 : 0)

function mix(amount: number, target: (row: number, column: number) => number): Matrix {
  const cell = (row: number, column: number) =>
    identity(row, column) * (1 - amount) + target(row, column) * amount
  return [0, 1, 2].map((row) => [cell(row, 0), cell(row, 1), cell(row, 2)] as const)
}

/** Translates one CSS filter function to a matrix and an offset. */
function toStep(name: string, amount: number): { matrix: Matrix; offset: number } {
  const luma = (_row: number, column: number) => LUMA[column] ?? 0
  switch (name) {
    case 'grayscale':
      return { matrix: mix(amount, luma), offset: 0 }
    case 'saturate':
      return { matrix: mix(1 - amount, luma), offset: 0 }
    case 'sepia':
      return { matrix: mix(amount, (row, column) => SEPIA[row]?.[column] ?? 0), offset: 0 }
    case 'brightness':
      return { matrix: mix(1 - amount, () => 0), offset: 0 }
    case 'contrast':
      return { matrix: mix(1 - amount, () => 0), offset: 127.5 * (1 - amount) }
    default:
      return { matrix: mix(0, () => 0), offset: 0 }
  }
}

/** Applies a CSS filter to pixels, as `ctx.filter` would. */
export function applyColorFilter(pixels: Uint8ClampedArray, cssFilter: string): void {
  const steps = [...cssFilter.matchAll(/([a-z]+)\(([\d.]+)\)/g)].map(([, name = '', amount]) =>
    toStep(name, Number(amount))
  )
  for (let i = 0; i < pixels.length; i += 4) {
    let rgb = [pixels[i] ?? 0, pixels[i + 1] ?? 0, pixels[i + 2] ?? 0]
    for (const { matrix, offset } of steps) {
      const [r = 0, g = 0, b = 0] = rgb
      rgb = matrix.map(([toR, toG, toB]) =>
        Math.min(255, Math.max(0, r * toR + g * toG + b * toB + offset))
      )
    }
    pixels.set(rgb, i)
  }
}

let hasCanvasFilter: boolean | null = null

/** Whether `ctx.filter` works. Safari may ignore it without an error. */
export function supportsCanvasFilter(): boolean {
  if (hasCanvasFilter === null) {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    if (!ctx) return false
    ctx.filter = 'brightness(0)'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 1, 1)
    hasCanvasFilter = ctx.getImageData(0, 0, 1, 1).data[0] === 0
  }
  return hasCanvasFilter
}
