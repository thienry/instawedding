import { encodeQrCodewords } from '@/utils/qr-codewords'

/**
 * Generates a QR Code (ISO/IEC 18004: byte mode, error correction L, versions
 * 1 to 6). Longer texts are cut at 134 bytes.
 *
 * @returns Rows of modules; true is dark.
 */
export function buildQrMatrix(text: string): boolean[][] {
  const { spec, codewords } = encodeQrCodewords(text)

  // Initialize matrix
  const size = spec.size
  const modules: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
  const isFunction: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  )

  const setFunctionModule = (r: number, c: number, dark: boolean) => {
    if (r < 0 || r >= size || c < 0 || c >= size) return
    modules[r][c] = dark
    isFunction[r][c] = true
  }

  // Finder patterns + separators
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr
        const c = leftC + dc
        if (r < 0 || r >= size || c < 0 || c >= size) continue
        const isBorder = dr === -1 || dr === 7 || dc === -1 || dc === 7
        const isOuter = dr === 0 || dr === 6 || dc === 0 || dc === 6
        const isInner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4
        setFunctionModule(r, c, !isBorder && (isOuter || isInner))
      }
    }
  }

  drawFinder(0, 0)
  drawFinder(0, size - 7)
  drawFinder(size - 7, 0)

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFunctionModule(6, i, i % 2 === 0)
    setFunctionModule(i, 6, i % 2 === 0)
  }

  // Alignment patterns
  const centers = spec.alignmentCenters
  for (const rCenter of centers) {
    for (const cCenter of centers) {
      if (
        (rCenter === 6 && cCenter === 6) ||
        (rCenter === 6 && cCenter === size - 7) ||
        (rCenter === size - 7 && cCenter === 6)
      ) {
        continue
      }
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc))
          setFunctionModule(rCenter + dr, cCenter + dc, dist === 2 || dist === 0)
        }
      }
    }
  }

  // Dark module
  setFunctionModule(size - 8, 8, true)

  // Reserve format information areas
  for (let i = 0; i <= 8; i++) {
    if (!isFunction[8][i]) setFunctionModule(8, i, false)
    if (!isFunction[i][8]) setFunctionModule(i, 8, false)
  }
  for (let i = 0; i < 8; i++) {
    if (!isFunction[8][size - 1 - i]) setFunctionModule(8, size - 1 - i, false)
    if (!isFunction[size - 1 - i][8]) setFunctionModule(size - 1 - i, 8, false)
  }

  // Place data bits in zigzag
  let bitIdx = 0
  const totalBits = codewords.length * 8
  let upward = true

  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      const r = upward ? size - 1 - vert : vert
      for (let j = 0; j < 2; j++) {
        const c = right - j
        if (!isFunction[r][c]) {
          let dark = false
          if (bitIdx < totalBits) {
            const byte = codewords[bitIdx >>> 3]
            dark = ((byte >>> (7 - (bitIdx & 7))) & 1) === 1
            bitIdx++
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark
          }
          modules[r][c] = dark
        }
      }
    }
    upward = !upward
  }

  // Write Format Information for Level L (01) + Mask 0 (000) => 0x77c4
  const formatBits = 0x77c4
  const getFormatBit = (idx: number) => ((formatBits >>> idx) & 1) === 1

  // Around top-left finder
  const tlCoords: ReadonlyArray<readonly [number, number]> = [
    [8, 0],
    [8, 1],
    [8, 2],
    [8, 3],
    [8, 4],
    [8, 5],
    [8, 7],
    [8, 8],
    [7, 8],
    [5, 8],
    [4, 8],
    [3, 8],
    [2, 8],
    [1, 8],
    [0, 8],
  ]
  for (let i = 0; i < 15; i++) {
    const [r, c] = tlCoords[i]
    modules[r][c] = getFormatBit(14 - i)
  }

  // Bottom-left & top-right format bits
  for (let i = 0; i < 7; i++) {
    modules[size - 1 - i][8] = getFormatBit(14 - i)
  }
  for (let i = 7; i < 15; i++) {
    modules[8][size - 15 + i] = getFormatBit(14 - i)
  }

  return modules
}
