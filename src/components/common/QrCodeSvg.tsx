import { useMemo } from 'react'

interface QrCodeSvgProps {
  readonly value: string
  readonly size?: number
  readonly className?: string
}

/**
 * Pure TypeScript / SVG QR Code Generator (ISO/IEC 18004 - Byte Mode, Error Correction Level L, Versions 1-6).
 * Zero external dependencies. Supports URLs up to 134 bytes.
 */

interface VersionSpec {
  readonly version: number
  readonly size: number
  readonly totalDataCodewords: number
  readonly ecCodewordsPerBlock: number
  readonly numBlocks: number
  readonly alignmentCenters: readonly number[]
}

const VERSION_SPECS: readonly VersionSpec[] = [
  {
    version: 1,
    size: 21,
    totalDataCodewords: 19,
    ecCodewordsPerBlock: 7,
    numBlocks: 1,
    alignmentCenters: [],
  },
  {
    version: 2,
    size: 25,
    totalDataCodewords: 34,
    ecCodewordsPerBlock: 10,
    numBlocks: 1,
    alignmentCenters: [6, 18],
  },
  {
    version: 3,
    size: 29,
    totalDataCodewords: 55,
    ecCodewordsPerBlock: 15,
    numBlocks: 1,
    alignmentCenters: [6, 22],
  },
  {
    version: 4,
    size: 33,
    totalDataCodewords: 80,
    ecCodewordsPerBlock: 20,
    numBlocks: 1,
    alignmentCenters: [6, 26],
  },
  {
    version: 5,
    size: 37,
    totalDataCodewords: 108,
    ecCodewordsPerBlock: 26,
    numBlocks: 1,
    alignmentCenters: [6, 30],
  },
  {
    version: 6,
    size: 41,
    totalDataCodewords: 136,
    ecCodewordsPerBlock: 18,
    numBlocks: 2,
    alignmentCenters: [6, 34],
  },
]

const GF_EXP = new Uint8Array(512)
const GF_LOG = new Uint8Array(256)

;(() => {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) {
      x ^= 0x11d
    }
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function getGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1])
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1)
    const root = GF_EXP[i]
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], root)
    }
    poly = next
  }
  return poly
}

function computeReedSolomon(data: Uint8Array, ecCount: number): Uint8Array {
  const gen = getGeneratorPoly(ecCount)
  const msg = new Uint8Array(data.length + ecCount)
  msg.set(data, 0)

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i]
    if (coef !== 0) {
      for (let j = 1; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef)
      }
    }
  }

  return msg.slice(data.length)
}

function buildQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text)

  // Choose smallest version that fits Byte Mode (4 bits mode + 8 bits len + 8*N bits)
  const spec =
    VERSION_SPECS.find((v) => bytes.length + 2 <= v.totalDataCodewords) ??
    VERSION_SPECS[VERSION_SPECS.length - 1]

  const payload = bytes.slice(0, spec.totalDataCodewords - 2)

  // Build bit stream
  const bits: number[] = []
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1)
    }
  }

  // Mode indicator: Byte mode = 0100
  pushBits(0b0100, 4)
  // Character count indicator (8 bits for versions 1-9)
  pushBits(payload.length, 8)
  for (const b of payload) {
    pushBits(b, 8)
  }

  // Terminator (up to 4 zeros)
  const maxBits = spec.totalDataCodewords * 8
  const terminatorLen = Math.min(4, maxBits - bits.length)
  pushBits(0, terminatorLen)

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0)
  }

  // Pad codewords 0xEC, 0x11
  let padToggle = true
  while (bits.length < maxBits) {
    pushBits(padToggle ? 0xec : 0x11, 8)
    padToggle = !padToggle
  }

  // Convert bits to data codewords
  const dataCodewords = new Uint8Array(spec.totalDataCodewords)
  for (let i = 0; i < spec.totalDataCodewords; i++) {
    let byte = 0
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b]
    }
    dataCodewords[i] = byte
  }

  // Split into blocks and compute EC
  const blockSize = Math.floor(spec.totalDataCodewords / spec.numBlocks)
  const dataBlocks: Uint8Array[] = []
  const ecBlocks: Uint8Array[] = []

  for (let b = 0; b < spec.numBlocks; b++) {
    const block = dataCodewords.slice(b * blockSize, (b + 1) * blockSize)
    dataBlocks.push(block)
    ecBlocks.push(computeReedSolomon(block, spec.ecCodewordsPerBlock))
  }

  // Interleave blocks
  const finalCodewords: number[] = []
  for (let i = 0; i < blockSize; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(dataBlocks[b][i])
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (let b = 0; b < spec.numBlocks; b++) {
      finalCodewords.push(ecBlocks[b][i])
    }
  }

  // Initialize matrix
  const size = spec.size
  const modules: boolean[][] = Array.from({ length: size }, () =>
    Array<boolean>(size).fill(false)
  )
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
          setFunctionModule(
            rCenter + dr,
            cCenter + dc,
            dist === 2 || dist === 0
          )
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
  const totalBits = finalCodewords.length * 8
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
            const byte = finalCodewords[bitIdx >>> 3]
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

export function QrCodeSvg({
  value,
  size = 120,
  className = '',
}: QrCodeSvgProps) {
  const matrix = useMemo(() => buildQrMatrix(value), [value])
  const count = matrix.length
  const quietZone = 2
  const viewBoxSize = count + quietZone * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={`QR Code para ${value}`}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#ffffff" rx={1.5} />
      {matrix.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#142017"
            />
          ) : null
        )
      )}
    </svg>
  )
}
